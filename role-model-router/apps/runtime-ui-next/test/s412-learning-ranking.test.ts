import { describe, expect, it } from "vitest";

import {
  createLearningRankingClient,
  learningLadderRowKey,
  learningRollbackPayload,
  parseLearningLadderPayload,
} from "../src/learning-ranking";
import { Message } from "../src/message";
import { READBACK_SPECS } from "../src/readback";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/** S412: Learning per-task ladder ranking — typed parse, confirm/pending/error, exact rollback payload. */

const SCOPE = "scope-s412";
const scopedModel = (extra: Parameters<typeof shellModel>[0] = {}) => {
  const model = shellModel(extra);
  return {
    ...model,
    readbacks: {
      ...model.readbacks,
      learningPacks: { ...model.readbacks.learningPacks, scopeId: SCOPE, status: "ok" as const },
    },
  };
};

const ladderBody = {
  ladders: [
    {
      active: true,
      completeness: { admitted: 2, configured: 3 },
      ladderVersion: 4,
      nextEligibleAtMs: null,
      rankedCount: 5,
      roleId: "role.alpha",
      rolledBack: { atMs: 1700000000000, on: false, reason: null },
      rungs: [
        { endpointId: "provider.a", rank: 1, status: "available" },
        { endpointId: "provider.b", rank: 2, status: "unavailable" },
      ],
      state: "complete",
      taskTypeId: "task.code",
      taxonomyVersion: "v1",
      topEndpoints: [
        { endpointId: "provider.a", rank: 1, status: "available" },
        { endpointId: "provider.b", rank: 2, status: "unavailable" },
        { endpointId: "provider.c", rank: 3, status: "available" },
      ],
    },
  ],
};

describe("S412 typed ladder parser", () => {
  it("parses the real ladder payload into typed rows", () => {
    const parsed = parseLearningLadderPayload(ladderBody);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.rows).toHaveLength(1);
    const [entry] = parsed.rows;
    expect(entry?.roleId).toBe("role.alpha");
    expect(entry?.taskTypeId).toBe("task.code");
    expect(entry?.completeness).toEqual({ admitted: 2, configured: 3 });
    expect(entry?.rankedCount).toBe(5);
    expect(entry.topEndpoints.map((point) => point.endpointId)).toEqual(["provider.a", "provider.b", "provider.c"]);
    expect(entry?.rolledBack).toEqual({ atMs: 1700000000000, on: false, reason: null });
    expect(learningLadderRowKey(entry)).toBe("role.alpha\u0000task.code");
  });

  it("rejects unknown or malformed shapes instead of fabricating rows", () => {
    expect(parseLearningLadderPayload({ ladders: "nope" }).ok).toBe(false);
    expect(parseLearningLadderPayload({ ladders: [{ roleId: 1, taskTypeId: "t" }] }).ok).toBe(false);
    expect(parseLearningLadderPayload({ ladders: [{ roleId: "r", taskTypeId: "t", topEndpoints: [{ rank: 1 }] }] }).ok).toBe(false);
    expect(parseLearningLadderPayload({ ladders: [{ roleId: "r", taskTypeId: "t", completeness: { admitted: "two" } }] }).ok).toBe(false);
    expect(parseLearningLadderPayload(null).ok).toBe(false);
  });
});


describe("S412 readback integration", () => {
  it("keeps ladder rows on a valid body and rejects a malformed ladder body", () => {
    const ok = READBACK_SPECS.learning.parse({ knowledge: { available: true }, ladders: ladderBody.ladders }, 1);
    expect(ok.status).toBe("ok");
    expect(ok.rows.some((entry) => entry.id.startsWith("ladder:"))).toBe(true);
    const empty = READBACK_SPECS.learning.parse({ knowledge: { available: true }, ladders: [] }, 1);
    expect(empty.status).toBe("ok");
    expect(empty.rows.some((entry) => entry.id.startsWith("ladder:"))).toBe(false);
    const bad = READBACK_SPECS.learning.parse({ knowledge: { available: true }, ladders: [{ roleId: 1, taskTypeId: "t" }] }, 1);
    expect(bad.status).toBe("error");
  });
});

describe("S412 rollback payload and client", () => {
  it("builds the exact payload for both directions", () => {
    expect(learningRollbackPayload({ roleId: "role.alpha", taskTypeId: "task.code" }, true, "scope-1")).toEqual({
      reason: "operator_ui_ladder_rollback",
      roleId: "role.alpha",
      rolledBack: true,
      scopeId: "scope-1",
      taskTypeId: "task.code",
    });
    expect(learningRollbackPayload({ roleId: "role.alpha", taskTypeId: "task.code" }, false, "scope-1")).toEqual({
      reason: "operator_ui_ladder_activate",
      roleId: "role.alpha",
      rolledBack: false,
      scopeId: "scope-1",
      taskTypeId: "task.code",
    });
  });

  it("POSTs the exact body to /operator/learning/rollback-pack", async () => {
    const calls: Array<{ body?: string; url: string }> = [];
    // SAFETY: this stub only records the JSON string bodies the client sends.
    const fetchImpl = (async (url: string, init?: { body?: string }) => {
      calls.push({ body: init?.body, url });
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" }, status: 200 });
    }) as typeof fetch;
    const client = createLearningRankingClient({ fetchImpl });
    await client.rollbackLadder(learningRollbackPayload({ roleId: "role.alpha", taskTypeId: "task.code" }, false, "scope-1"));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("/api/role-model/operator/learning/rollback-pack");
    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({
      reason: "operator_ui_ladder_activate",
      roleId: "role.alpha",
      rolledBack: false,
      scopeId: "scope-1",
      taskTypeId: "task.code",
    });
  });
});

describe("S412 toggle state machine", () => {
  const base = () => scopedModel();

  it("confirms on the second click, then submits once and refuses double submits", () => {
    const first = shellUpdate(base(), Message.LearningLadderToggleRequested({ rolledBack: true, roleId: "role.alpha", taskTypeId: "task.code" }));
    expect(first.commands ?? []).toEqual([]);
    const key = learningLadderRowKey({ roleId: "role.alpha", taskTypeId: "task.code" }, SCOPE);
    expect(first.model.learningRanking?.phases[key]?.phase).toBe("confirming");
    const second = shellUpdate(first.model, Message.LearningLadderToggleRequested({ rolledBack: true, roleId: "role.alpha", taskTypeId: "task.code" }));
    expect((second.commands ?? []).map((command) => command.name)).toEqual(["RollbackLearningLadder"]);
    const payload = JSON.parse(String((second.commands ?? [])[0]?.args?.payload));
    expect(payload).toEqual({
      reason: "operator_ui_ladder_rollback",
      roleId: "role.alpha",
      rolledBack: true,
      scopeId: SCOPE,
      taskTypeId: "task.code",
    });
    const third = shellUpdate(second.model, Message.LearningLadderToggleRequested({ rolledBack: true, roleId: "role.alpha", taskTypeId: "task.code" }));
    expect(third.commands ?? []).toEqual([]);
  });

  it("keeps the row on failure and re-reads the learning readback on success", () => {
    const key = learningLadderRowKey({ roleId: "role.alpha", taskTypeId: "task.code" }, SCOPE);
    const pending = () => scopedModel({ learningRanking: { phases: { [key]: { phase: "pending", scopeId: SCOPE, token: 1 } }, scopeId: SCOPE } });
    const failed = shellUpdate(
      pending(),
      Message.LearningLadderFailed({ message: "conflict", roleId: "role.alpha", scopeId: SCOPE, taskTypeId: "task.code", token: 1 }),
    );
    expect(failed.model.learningRanking?.phases[key]).toMatchObject({ error: "conflict", phase: "error" });
    const done = shellUpdate(
      pending(),
      Message.LearningLadderUpdated({ rolledBack: true, roleId: "role.alpha", scopeId: SCOPE, taskTypeId: "task.code", token: 1 }),
    );
    expect(done.model.learningRanking?.phases[key]?.phase).toBe("idle");
    expect((done.commands ?? []).map((command) => command.name)).toEqual(["ReadReadback"]);
    expect((done.commands ?? [])[0]?.args).toMatchObject({ key: "learning" });
  });
});

describe("S413 per-row token", () => {
  it("resolves two pending rows independently", () => {
    const keyA = learningLadderRowKey({ roleId: "role.a", taskTypeId: "task.a" }, SCOPE);
    const keyB = learningLadderRowKey({ roleId: "role.b", taskTypeId: "task.b" }, SCOPE);
    const first = scopedModel({ learningRanking: { phases: {
      [keyA]: { phase: "pending", scopeId: SCOPE, token: 1 },
      [keyB]: { phase: "pending", scopeId: SCOPE, token: 1 },
    }, scopeId: SCOPE } });
    const a = shellUpdate(first, Message.LearningLadderUpdated({ rolledBack: true, roleId: "role.a", scopeId: SCOPE, taskTypeId: "task.a", token: 1 }));
    expect(a.model.learningRanking?.phases[keyA]?.phase).toBe("idle");
    expect(a.model.learningRanking?.phases[keyB]?.phase).toBe("pending");
    const b = shellUpdate(a.model, Message.LearningLadderUpdated({ rolledBack: false, roleId: "role.b", scopeId: SCOPE, taskTypeId: "task.b", token: 1 }));
    expect(b.model.learningRanking?.phases[keyB]?.phase).toBe("idle");
  });
});
