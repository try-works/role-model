import { describe, expect, it } from "vitest";

import { Effect, Option } from "effect";

import { Url } from "@role-model-router/foldkit";

import { defineLearningRankingCommands } from "../src/commands";
import { createInit } from "../src/init";
import { createLearningRankingClient, learningLadderRowKey } from "../src/learning-ranking";
import { READBACK_SPECS } from "../src/readback";
import { Message } from "../src/message";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/** S448 (R13/R31): ladder mutations use the loaded owner scope, fail closed, and scope the confirmation. */

const baseModel = (scopeId?: string) => {
  const model = shellModel();
  const learningPacks: { scopeId?: string; status: "ok" } & typeof model.readbacks.learningPacks = {
    ...model.readbacks.learningPacks,
    status: "ok" as const,
  };
  if (scopeId !== undefined) learningPacks.scopeId = scopeId;
  // SAFETY: the fresh repository model is the decoded shape; this test adds the S448 typed scope field while RED.
  return { ...model, readbacks: { ...model.readbacks, learningPacks } } as typeof model;
};
const toggle = (model: ReturnType<typeof baseModel>, rolledBack = true) =>
  shellUpdate(model, Message.LearningLadderToggleRequested({ rolledBack, roleId: "role.alpha", taskTypeId: "task.code" }));
const commandsOf = (result: ReturnType<typeof shellUpdate>) => result.commands ?? [];
const payloadsOf = (result: ReturnType<typeof shellUpdate>) =>
  // SAFETY: the payload is JSON produced by the production handler and inspected as data.
  commandsOf(result).map((command) => JSON.parse(String(command.args?.payload)) as {
    readonly reason?: string;
    readonly roleId?: string;
    readonly rolledBack?: boolean;
    readonly scopeId?: string;
    readonly taskTypeId?: string;
  });
const exactRollbackPayload = (scopeId: string) => ({
  reason: "operator_ui_ladder_rollback",
  roleId: "role.alpha",
  rolledBack: true,
  scopeId,
  taskTypeId: "task.code",
});

describe("S448 learning mutation scope authority", () => {
  it("reads the authoritative records scopeId from the learning/records payload", () => {
    const parsed = READBACK_SPECS.learningPacks.parse(
      { schemaVersion: "role-model.knowledge-learning-records.v1", scopeId: "scope-owner-b", records: [] },
      1,
    );
    expect(parsed.scopeId).toBe("scope-owner-b");
  });

  it("uses the loaded scope in the rollback payload instead of standalone-runtime-stage", () => {
    const first = toggle(baseModel("scope-owner-b"));
    expect(commandsOf(first)).toEqual([]);
    const second = toggle(first.model);
    expect(payloadsOf(second)).toEqual([exactRollbackPayload("scope-owner-b")]);
  });

  it("fails closed with an honest error when the loaded scope is missing", () => {
    const first = toggle(baseModel());
    const second = toggle(first.model);
    expect(commandsOf(second)).toEqual([]);
    const phases = second.model.learningRanking?.phases ?? {};
    expect(Object.values(phases).some((phase) => phase.phase === "error" && String(phase.error).toLowerCase().includes("scope"))).toBe(true);
  });

  it("invalidates the old confirmation at the accepted learningPacks readback and reconfirms the new scope", () => {
    const first = toggle(baseModel("scope-owner-a"));
    expect(commandsOf(first)).toEqual([]);
    expect(first.model.learningRanking?.scopeId).toBe("scope-owner-a");
    const loaded = shellUpdate(first.model, Message.ReadbackLoaded({
      key: "learningPacks",
      snapshot: { rows: [], scopeId: "scope-owner-b", status: "ok", token: first.model.readbacks.learningPacks.token },
      token: first.model.readbacks.learningPacks.token,
    }));
    expect(loaded.model.learningRanking?.scopeId).toBe("scope-owner-b");
    expect(Object.values(loaded.model.learningRanking?.phases ?? {}).some((phase) => phase.phase === "confirming")).toBe(false);
    const firstClickB = toggle(loaded.model);
    expect(commandsOf(firstClickB)).toEqual([]);
    expect(firstClickB.model.learningRanking?.phases[learningLadderRowKey({ roleId: "role.alpha", taskTypeId: "task.code" }, "scope-owner-b")]?.phase).toBe("confirming");
    const confirmed = toggle(firstClickB.model);
    expect(payloadsOf(confirmed)).toEqual([exactRollbackPayload("scope-owner-b")]);
    expect(commandsOf(confirmed)).toHaveLength(1);
  });

  it("loading or error readback clears the active scope and fails closed instead of using stale authority", () => {
    const first = toggle(baseModel("scope-owner-a"));
    expect(commandsOf(first)).toEqual([]);
    for (const status of ["loading", "error"] as const) {
      const loaded = shellUpdate(first.model, Message.ReadbackLoaded({
        key: "learningPacks",
        snapshot: { rows: [], status, token: first.model.readbacks.learningPacks.token },
        token: first.model.readbacks.learningPacks.token,
      }));
      expect(loaded.model.learningRanking?.scopeId).toBeUndefined();
      expect(commandsOf(toggle(loaded.model))).toEqual([]);
    }
  });

  it("a pending old-scope result cannot refresh or mutate the new-scope row", () => {
    const keyA = learningLadderRowKey({ roleId: "role.alpha", taskTypeId: "task.code" }, "scope-owner-a");
    const keyB = learningLadderRowKey({ roleId: "role.alpha", taskTypeId: "task.code" }, "scope-owner-b");
    const base = baseModel("scope-owner-b");
    const pending = {
      ...base,
      learningRanking: {
        phases: { [keyA]: { phase: "pending" as const, scopeId: "scope-owner-a", token: 1 }, [keyB]: { phase: "confirming" as const, scopeId: "scope-owner-b" } },
        scopeId: "scope-owner-b",
      },
    };
    const result = shellUpdate(
      pending,
      Message.LearningLadderUpdated({ rolledBack: true, roleId: "role.alpha", scopeId: "scope-owner-a", taskTypeId: "task.code", token: 1 }),
    );
    expect(commandsOf(result)).toEqual([]);
    expect(result.model.learningRanking?.phases[keyA]?.phase).toBe("pending");
    expect(result.model.learningRanking?.phases[keyB]?.phase).toBe("confirming");
  });

  it("RED: loading/failed records cannot fall back to a stale state scope on the second click", () => {
    const first = toggle(baseModel("scope-owner-a"));
    expect(commandsOf(first)).toEqual([]);
    const loading = {
      ...first.model,
      readbacks: {
        ...first.model.readbacks,
        learningPacks: { ...first.model.readbacks.learningPacks, scopeId: "scope-owner-a", status: "loading" as const },
      },
    };
    expect(commandsOf(toggle(loading))).toEqual([]);
    const failed = shellUpdate(first.model, Message.ReadbackFailed({
      key: "learningPacks",
      message: "records read failed",
      token: first.model.readbacks.learningPacks.token,
    }));
    expect(failed.model.learningRanking?.scopeId).toBeUndefined();
    expect(Object.values(failed.model.learningRanking?.phases ?? {}).some((phase) => phase.phase === "confirming")).toBe(false);
    expect(commandsOf(toggle(failed.model))).toEqual([]);
  });

  it("production command.effect carries the captured scope identity and exact payload to the reducer", async () => {
    const calls: Array<{ readonly body: string; readonly url: string }> = [];
    // SAFETY: this stub is a real fetch implementation for the production Learning client; it records exact bodies.
    const fetchImpl = (async (url: string, init?: { readonly body?: string }) => {
      calls.push({ body: String(init?.body ?? ""), url: String(url) });
      return new Response("{}", { headers: { "content-type": "application/json" }, status: 200 });
    }) as typeof fetch;
    const commands = defineLearningRankingCommands(createLearningRankingClient({ fetchImpl }));
    const first = toggle(baseModel("scope-owner-b"));
    const second = toggle(first.model);
    const command = commandsOf(second)[0]!;
    // SAFETY: the test built this production command and reads its typed args through the known definition.
    const args = command.args as { readonly payload: string; readonly roleId: string; readonly scopeId: string; readonly taskTypeId: string; readonly token: number };
    const message = await Effect.runPromise(commands.rollbackLadder(args).effect);
    expect(message._tag).toBe("LearningLadderUpdated");
    expect(message).toMatchObject({ roleId: "role.alpha", scopeId: "scope-owner-b", taskTypeId: "task.code" });
    // SAFETY: the command payload is JSON produced by the production handler and is inspected as data.
    const body = JSON.parse(calls[0]?.body ?? "{}") as { readonly scopeId?: string };
    expect(calls.map((call) => call.url)).toEqual(["/api/role-model/operator/learning/rollback-pack"]);
    expect(body.scopeId).toBe("scope-owner-b");
    const settled = shellUpdate(second.model, message);
    expect(Object.values(settled.model.learningRanking?.phases ?? {}).some((phase) => phase.phase === "idle")).toBe(true);
    expect((settled.commands ?? []).map((next) => next.name)).toEqual(["ReadReadback"]);
  });

  it("RED: A->B->A never reuses an old pending token (late result cannot settle the new scope row)", () => {
    const key = learningLadderRowKey({ roleId: "role.alpha", taskTypeId: "task.code" }, "scope-owner-a");
    const firstA = toggle(baseModel("scope-owner-a"));
    const pendingA = toggle(firstA.model);
    const oldToken = Number(commandsOf(pendingA)[0]?.args?.token);
    expect(oldToken).toBeGreaterThan(0);
    const toB = shellUpdate(pendingA.model, Message.ReadbackLoaded({
      key: "learningPacks",
      snapshot: { rows: [], scopeId: "scope-owner-b", status: "ok", token: pendingA.model.readbacks.learningPacks.token },
      token: pendingA.model.readbacks.learningPacks.token,
    }));
    expect(Object.keys(toB.model.learningRanking?.phases ?? {}).some((phaseKey) => phaseKey.startsWith("scope-owner-a"))).toBe(false);
    const toA = shellUpdate(toB.model, Message.ReadbackLoaded({
      key: "learningPacks",
      snapshot: { rows: [], scopeId: "scope-owner-a", status: "ok", token: toB.model.readbacks.learningPacks.token },
      token: toB.model.readbacks.learningPacks.token,
    }));
    const confirmA = toggle(toA.model);
    const pendingAgain = toggle(confirmA.model);
    const newToken = Number(commandsOf(pendingAgain)[0]?.args?.token);
    expect(newToken).toBeGreaterThan(oldToken);
    expect(pendingAgain.model.learningRanking?.nextToken).toBe(newToken);
    expect(Object.keys(pendingAgain.model.learningRanking?.phases ?? {}).every((phaseKey) => phaseKey.startsWith("scope-owner-a"))).toBe(true);
    const late = shellUpdate(
      pendingAgain.model,
      Message.LearningLadderUpdated({ rolledBack: true, roleId: "role.alpha", scopeId: "scope-owner-a", taskTypeId: "task.code", token: oldToken }),
    );
    expect(late.model.learningRanking?.phases[key]?.phase).toBe("pending");
  });

  it("direct Learning entry reads the records packs authority, and navigation/telemetry refresh both sources", () => {
    // SAFETY: initRoute only reads command name/args from these typed-command stand-ins.
    const init = createInit(
      (() => ({ args: {}, name: "ReadDiagnostics" })) as never,
      (() => ({ args: {}, name: "ReadObservability" })) as never,
      ((args: { readonly key: string }) => ({ args, name: "ReadReadback" })) as never,
      (() => ({ args: {}, name: "ReadControl" })) as never,
      false,
    );
    const entry = init(Option.getOrThrow(Url.fromString("http://localhost/learning")));
    expect((entry.commands ?? []).map((command) => command.args?.key)).toContain("learningPacks");
    expect(entry.model.readbacks.learningPacks.status).toBe("loading");

    const navigation = shellUpdate(shellModel(), Message.ChangedUrl({ url: Option.getOrThrow(Url.fromString("http://localhost/learning")) }));
    expect((navigation.commands ?? []).map((command) => command.args?.key)).toContain("learningPacks");

    const telemetry = shellUpdate(
      shellModel({ route: { _tag: "Learning" } }),
      Message.RuntimeRevisionReceived({ revision: 1 }),
    );
    expect((telemetry.commands ?? []).map((command) => command.args?.key)).toContain("learningPacks");
  });

  it("actual records readback supplies the scope used by the next two-click mutation", () => {
    const parsed = READBACK_SPECS.learningPacks.parse(
      { schemaVersion: "role-model.knowledge-learning-records.v1", scopeId: "scope-owner-z", records: [] },
      1,
    );
    const model = {
      ...shellModel(),
      readbacks: { ...shellModel().readbacks, learningPacks: parsed },
    };
    const first = toggle(model);
    expect(commandsOf(first)).toEqual([]);
    const second = toggle(first.model);
    expect(payloadsOf(second)).toEqual([exactRollbackPayload("scope-owner-z")]);
  });

  it("refresh loading cannot deadlock: pending clears, late callback is inert, same-scope fresh read allows a new explicit confirm", () => {
    const first = toggle(baseModel("scope-owner-a"));
    const pending = toggle(first.model);
    const oldToken = Number(commandsOf(pending)[0]?.args?.token);
    const loading = shellUpdate(pending.model, Message.ReadbackLoaded({
      key: "learningPacks",
      snapshot: { rows: [], status: "loading", token: pending.model.readbacks.learningPacks.token },
      token: pending.model.readbacks.learningPacks.token,
    }));
    expect(Object.values(loading.model.learningRanking?.phases ?? {}).some((phase) => phase.phase === "pending")).toBe(false);
    const late = shellUpdate(
      loading.model,
      Message.LearningLadderUpdated({ rolledBack: true, roleId: "role.alpha", scopeId: "scope-owner-a", taskTypeId: "task.code", token: oldToken }),
    );
    expect(commandsOf(late)).toEqual([]);
    const freshModel = {
      ...late.model,
      readbacks: {
        ...late.model.readbacks,
        learningPacks: { ...late.model.readbacks.learningPacks, scopeId: "scope-owner-a", status: "ok" as const },
      },
    };
    const confirm = toggle(freshModel);
    expect(commandsOf(confirm)).toEqual([]);
    const submit = toggle(confirm.model);
    expect(commandsOf(submit)).toHaveLength(1);
    expect(payloadsOf(submit)).toEqual([exactRollbackPayload("scope-owner-a")]);
  });

  it("RED6: actual RuntimeRevisionReceived/telemetry refresh clears pending so a fresh same-scope read cannot deadlock", () => {
    const learningModel = { ...baseModel("scope-owner-a"), route: { _tag: "Learning" as const } };
    const first = toggle(learningModel);
    const pending = toggle(first.model);
    const oldToken = Number(commandsOf(pending)[0]?.args?.token);
    expect(oldToken).toBeGreaterThan(0);

    const revision = shellUpdate(pending.model, Message.RuntimeRevisionReceived({ revision: 1 }));
    expect(revision.model.readbacks.learningPacks.status).toBe("loading");
    expect(Object.values(revision.model.learningRanking?.phases ?? {}).some((phase) => phase.phase === "pending")).toBe(false);
    const oldCallback = shellUpdate(
      revision.model,
      Message.LearningLadderUpdated({ rolledBack: true, roleId: "role.alpha", scopeId: "scope-owner-a", taskTypeId: "task.code", token: oldToken }),
    );
    expect(commandsOf(oldCallback)).toEqual([]);
    const fresh = shellUpdate(oldCallback.model, Message.ReadbackLoaded({
      key: "learningPacks",
      snapshot: { rows: [], scopeId: "scope-owner-a", status: "ok", token: oldCallback.model.readbacks.learningPacks.token },
      token: oldCallback.model.readbacks.learningPacks.token,
    }));
    const confirm = toggle(fresh.model);
    expect(commandsOf(confirm)).toEqual([]);
    expect(toggle(confirm.model).commands ?? []).toHaveLength(1);

    const telemetry = shellUpdate(pending.model, Message.RuntimeTelemetryReceived({ emittedAtMs: 1, requestId: "s448-refresh" }));
    expect(telemetry.model.readbacks.learningPacks.status).toBe("loading");
    expect(Object.values(telemetry.model.learningRanking?.phases ?? {}).some((phase) => phase.phase === "pending")).toBe(false);
  });
});
