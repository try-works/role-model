import { renderToString } from "@role-model-router/foldkit/experimental/server";
import type { HtmlBuilder } from "@role-model-router/foldkit/html";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  createSystemExtensionsClient,
  createSystemOperatorClient,
  defineReadDiagnostics,
  defineSystemExtensionsCommands,
  defineSystemOperatorCommands,
} from "../src/commands";
import { systemExtensionsPage } from "../src/features/system/extensions";
import { systemOperatorPage } from "../src/features/system/operator";
import { Message } from "../src/message";
import type { Model } from "../src/model";
import type { ReadbacksState } from "../src/readback";
import { createUpdate } from "../src/update";
import { shellModel } from "./support/runtime-shell";

const ok = (rows: Array<{ id: string; label: string; meta: string; value: string }>) => ({
  rows,
  status: "ok" as const,
  token: 0,
});
const renderOperator = async (readbacks: Partial<ReadbacksState>): Promise<HTMLElement> => {
  const base = shellModel({});
  const model: Model = {
    ...base,
    readbacks: { ...base.readbacks, ...readbacks } as ReadbacksState,
    route: { _tag: "SystemOperator" },
  };
  const rendered = await Effect.runPromise(
    renderToString(
      {
        init: () => ({ commands: [], model }),
        // SAFETY: renderToString infers Message=unknown; the page only emits typed messages.
        view: (_model: Model, h: HtmlBuilder<Message>) => ({
          body: systemOperatorPage(model.readbacks, h as Parameters<typeof systemOperatorPage>[1], {
            operatorLearningMode: "shadow",
            systemOperatorReplayCount: "25",
            systemOperatorTraceRoot: "trace-1",
          }),
          title: "operator",
        }),
      },
      { isHydratable: false },
    ),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};
const renderExtensions = async (readbacks: Partial<ReadbacksState>): Promise<HTMLElement> => {
  const base = shellModel({});
  const model: Model = {
    ...base,
    readbacks: { ...base.readbacks, ...readbacks } as ReadbacksState,
    route: { _tag: "SystemExtensions" },
  };
  const rendered = await Effect.runPromise(
    renderToString(
      {
        init: () => ({ commands: [], model }),
        // SAFETY: renderToString infers Message=unknown; the page only emits typed messages.
        view: (_model: Model, h: HtmlBuilder<Message>) => ({
          body: systemExtensionsPage(
            model.readbacks,
            h as Parameters<typeof systemExtensionsPage>[1],
          ),
          title: "extensions",
        }),
      },
      { isHydratable: false },
    ),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S637 SystemOperator/SystemExtensions real parity", () => {
  it("renders real operator capability, trace, replay, evaluation, profile and advisory values", async () => {
    const page = await renderOperator({
      evaluationJobs: ok([{ id: "eval-1", label: "eval-1", meta: "trials 4", value: "completed" }]),
      learningAdvisory: ok([
        { id: "advisory-1", label: "max_difficulty", meta: "advisory", value: "tier-2" },
      ]),
      learningProfile: ok([
        { id: "profile-1", label: "sample_count", meta: "profile", value: "128" },
      ]),
      operatorStatus: ok([
        { id: "replay", label: "Replay", meta: "bounded", value: "available" },
        { id: "evaluation", label: "Evaluation", meta: "bounded", value: "shadow" },
      ]),
      operatorTraceRoots: ok([
        { id: "trace-1", label: "trace-1", meta: "2 generations", value: "complete" },
      ]),
      replayJobs: ok([{ id: "replay-1", label: "replay-1", meta: "budget 25", value: "running" }]),
    });
    const text = page.textContent ?? "";
    expect(text).toContain("Replay");
    expect(text).toContain("available");
    expect(text).toContain("trace-1");
    expect(text).toContain("complete");
    expect(text).toContain("replay-1");
    expect(text).toContain("running");
    expect(text).toContain("eval-1");
    expect(text).toContain("trials 4");
    expect(text).toContain("sample_count");
    expect(text).toContain("128");
    expect(text).toContain("max_difficulty");
    expect(text).toContain("tier-2");
    expect(page.querySelectorAll("[data-operator-capability-grid] > div")).toHaveLength(2);
  });

  it("renders real contribution, recommendation, automation and extension lifecycle/mode/health values", async () => {
    const page = await renderExtensions({
      contribution: ok([
        {
          id: "access",
          label: "recommendation_access",
          meta: "policy",
          value: "preview_and_apply",
        },
      ]),
      extensions: ok([
        {
          id: "ext-1",
          label: "ext-1",
          meta: JSON.stringify({ health: "ready", lifecycle: "installed", mode: "shadow" }),
          value: "enabled",
        },
      ]),
      recommendations: ok([{ id: "rec-1", label: "rec-1", meta: "signed", value: "pending" }]),
      replayAutomation: ok([
        { id: "state", label: "automation", meta: "track-b", value: "paused" },
      ]),
    });
    const text = page.textContent ?? "";
    expect(text).toContain("recommendation_access");
    expect(text).toContain("preview_and_apply");
    expect(text).toContain("rec-1");
    expect(text).toContain("pending");
    expect(text).toContain("automation");
    expect(text).toContain("paused");
    expect(text).toContain("installed");
    expect(text).toContain("shadow");
    expect(text).toContain("ready");
    expect(page.querySelector("[data-system-recommendation-apply='rec-1']")).not.toBeNull();
    expect(page.querySelector("[data-system-recommendation-dismiss='rec-1']")).not.toBeNull();
    expect(page.querySelector("[data-system-replay-automation-pause]")).not.toBeNull();
    expect(page.querySelector("[data-system-replay-automation-resume]")).not.toBeNull();
    expect(page.querySelector("[data-system-extensions-pause='ext-1']")).not.toBeNull();
  });

  it("dispatches the real recommendation and replay automation commands with exact bodies", async () => {
    const calls: Array<{ body: unknown; method: string; path: string }> = [];
    const commands = defineSystemExtensionsCommands(
      createSystemExtensionsClient(async (input, init) => {
        calls.push({
          body: JSON.parse(String(init?.body)),
          method: String(init?.method),
          path: String(input),
        });
        return new Response("{}", { status: 200 });
      }),
    );
    await Effect.runPromise(commands.applyRecommendation({ id: "rec-1", token: 1 }).effect);
    await Effect.runPromise(commands.dismissRecommendation({ id: "rec-1", token: 2 }).effect);
    await Effect.runPromise(commands.replayControl({ action: "pause", token: 3 }).effect);
    expect(calls).toEqual([
      { body: { id: "rec-1" }, method: "POST", path: "/api/role-model/recommendations/apply" },
      { body: { id: "rec-1" }, method: "POST", path: "/api/role-model/recommendations/dismiss" },
      { body: { action: "pause" }, method: "POST", path: "/api/role-model/track-b/replay/control" },
    ]);
    const update = createUpdate(
      defineReadDiagnostics(async () => ({ body: { records: [], state: "empty" }, status: 200 })),
    );
    const base = shellModel({ route: { _tag: "SystemExtensions" } });
    const model = {
      ...base,
      readbacks: {
        ...base.readbacks,
        recommendations: ok([{ id: "rec-9", label: "rec-9", meta: "", value: "pending" }]),
        replayAutomation: ok([]),
      },
    };
    const applied = update(
      model,
      Message.SystemExtensionsRecommendationApplyRequested({ recommendationId: "rec-9" }),
    );
    const dismissed = update(
      model,
      Message.SystemExtensionsRecommendationDismissRequested({ recommendationId: "rec-9" }),
    );
    const paused = update(
      model,
      Message.SystemReplayAutomationControlRequested({ action: "pause" }),
    );
    expect((applied.commands?.[0] as unknown as { args: { id: string } }).args.id).toBe("rec-9");
    expect((dismissed.commands?.[0] as unknown as { args: { id: string } }).args.id).toBe("rec-9");
    expect((paused.commands?.[0] as unknown as { args: { action: string } }).args.action).toBe(
      "pause",
    );
  });

  it("wires replay cancel and evaluation retry/cancel against the verified host endpoints", async () => {
    const calls: Array<{ auth: string | null; body: string; path: string }> = [];
    const commands = defineSystemOperatorCommands(
      createSystemOperatorClient(async (input, init) => {
        calls.push({
          auth: (init?.headers as Record<string, string> | undefined)?.authorization ?? null,
          body: String(init?.body ?? ""),
          path: String(input),
        });
        return new Response("{}", { status: 200 });
      }),
    );
    await Effect.runPromise(
      commands.cancelReplay({ jobId: "replay 1", token: "tok", tokenId: 1 }).effect,
    );
    await Effect.runPromise(
      commands.retryEvaluation({ jobId: "eval-1", token: "tok", tokenId: 1 }).effect,
    );
    await Effect.runPromise(
      commands.cancelEvaluation({ jobId: "eval-1", token: "tok", tokenId: 1 }).effect,
    );
    expect(calls[0]).toEqual({
      auth: "Bearer tok",
      body: "{}",
      path: "/api/role-model/operator/replay/jobs/replay%201/cancel",
    });
    expect(calls[1]).toEqual({
      auth: "Bearer tok",
      body: "{}",
      path: "/api/role-model/operator/evaluation/jobs/eval-1/retry",
    });
    expect(calls[2]).toEqual({
      auth: "Bearer tok",
      body: "{}",
      path: "/api/role-model/operator/evaluation/jobs/eval-1/cancel",
    });
  });

  it("loads the operator state against the verified host endpoint", async () => {
    const calls: Array<{ auth: string | null; path: string }> = [];
    const commands = defineSystemOperatorCommands(
      createSystemOperatorClient(async (input, init) => {
        calls.push({
          auth:
            init?.headers === undefined
              ? null
              : ((init.headers as Record<string, string>).authorization ?? null),
          path: String(input),
        });
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }),
    );
    await Effect.runPromise(commands.loadState({ token: "tok", tokenId: 1 }).effect);
    expect(calls[0]?.path).toBe("/api/role-model/operator/status");
    expect(calls[0]?.auth).toBe("Bearer tok");
  });
});
