import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { renderToString } from "@role-model-router/foldkit/experimental/server";

import { createModelsClient, defineModelsCommands } from "../src/commands";
import { Message } from "../src/message";
import { READBACK_SPECS, parseReadbackFixture } from "../src/readback";
import type { Model } from "../src/model";
import { benchmarkRoute } from "../src/features/models/routes";
import { shellModel, shellUpdate } from "./support/runtime-shell";

const endpointsBody = [
  { endpointId: "ep-a", modelId: "model-a", sourceType: "remote" },
  { endpointId: "ep-b", modelId: "model-b", sourceType: "local" },
  { endpointId: "ep-c", modelId: "model-c", sourceType: "local" },
];
const suiteBody = {
  cases: [
    { benchmark_eligible: true, case_id: "c1", difficulty_bucket: "easy", quick_benchmark: true },
    { benchmark_eligible: true, case_id: "c2", difficulty_bucket: "hard", quick_benchmark: true },
  ],
  suite_id: "suite-1",
  suite_version: "1.0",
};
const summaryBody = {
  caseAudits: [
    { caseId: "c1", endpointId: "ep-a", latencyMs: 100 },
    { caseId: "c2", endpointId: "ep-a", latencyMs: 120 },
    { caseId: "c3", endpointId: "ep-a", latencyMs: 200 },
  ],
  completedAtMs: 1_700_000_000_000,
  judgeEndpointId: "ep-b",
  judgeModelId: "model-b",
  mode: "quick",
  runId: "run-9",
  subjects: [{
    displayName: "Model A",
    endpointId: "ep-a",
    modelId: "model-a",
    overallScore: 0.66,
    scoresByBucket: { easy: { cases: 1, score: 1 }, hard: { cases: 1, score: 0.5 }, medium: { cases: 0, score: 0 } },
    sourceType: "remote",
    taxonomyScores: { byCapability: { tools: 0.8 }, byRole: { researcher: 0.75 }, byTask: { web_research: 0.5 } },
  }],
  suiteId: "suite-1",
};
const runsBody = [{ caseCount: 2, completedAtMs: 1_700_000_000_000, endpointIds: ["ep-a", "ep-b"], mode: "quick", runId: "run-9", suiteId: "suite-1" }];

const modelFor = (modelsView: Model["modelsView"] = {}): Model => {
  const base = shellModel({ route: { _tag: "Benchmark" }, modelsView: { benchmarkJudge: "ep-b", benchmarkMode: "quick", ...modelsView } });
  return {
    ...base,
    readbacks: {
      ...base.readbacks,
      benchmarkSuite: parseReadbackFixture("benchmarkSuite", suiteBody),
      benchmarkSummary: parseReadbackFixture("benchmarkSummary", summaryBody),
      benchmarkRuns: parseReadbackFixture("benchmarkRuns", runsBody),
      modelEndpoints: parseReadbackFixture("modelEndpoints", endpointsBody),
    },
  };
};

const renderRoute = async (modelsView: Model["modelsView"] = {}): Promise<HTMLElement> => {
  const model = modelFor(modelsView);
  const rendered = await Effect.runPromise(renderToString({
    init: () => ({ commands: [], model }),
    // SAFETY: renderToString infers Message=unknown; the route only emits typed messages.
    view: (_model, h) => ({
      body: benchmarkRoute(model.readbacks.benchmarkSuite, model.readbacks.benchmarkSummary, model.readbacks.benchmarkRuns, h as Parameters<typeof benchmarkRoute>[3], model.modelsView, model.readbacks.modelEndpoints, model.readbacks.benchmarkPreferences, model.readbacks.benchmarkActiveRun),
      title: "benchmark",
    }),
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S624 benchmark remaining gaps", () => {
  it("hydrates judge preferences and resumes polling an active run from their readbacks", () => {
    const base = modelFor();
    const preferences = parseReadbackFixture("benchmarkPreferences", { judgeEndpointId: "ep-a" });
    const hydrated = shellUpdate({ ...base, readbacks: { ...base.readbacks, benchmarkPreferences: { ...preferences, token: 0 } } }, Message.ReadbackLoaded({ key: "benchmarkPreferences", snapshot: { ...preferences, token: 0 }, token: 0 }));
    expect(hydrated.model.modelsView?.benchmarkJudge).toBe("ep-a");
    const active = parseReadbackFixture("benchmarkActiveRun", { completedSteps: 1, runId: "run-active", status: "running", totalSteps: 3 });
    const resumed = shellUpdate({ ...base, readbacks: { ...base.readbacks, benchmarkActiveRun: { ...active, token: 0 } } }, Message.ReadbackLoaded({ key: "benchmarkActiveRun", snapshot: { ...active, token: 0 }, token: 0 }));
    expect(resumed.model.modelsView?.benchmarkProgress).toMatchObject({ runId: "run-active", status: "running" });
    expect((resumed.commands ?? []).map((command) => command.name)).toContain("PollBenchmarkRun");
    expect(READBACK_SPECS.benchmarkPreferences.path).toBe("/api/role-model/benchmark/preferences");
    expect(READBACK_SPECS.benchmarkActiveRun.path).toBe("/api/role-model/benchmark/runs/active");
  });

  it("renders subject checkboxes, N of M selected, and >=2-selected Run gating", async () => {
    const all = await renderRoute();
    expect(all.querySelectorAll("input[type='checkbox']")).toHaveLength(3);
    expect(all.textContent).toContain("3 of 3 selected");
    const one = await renderRoute({ benchmarkSelectedEndpointIds: ["ep-a"] });
    expect(one.textContent).toContain("1 of 3 selected");
    const run = [...one.querySelectorAll("button")].find((button) => button.textContent?.startsWith("Run "));
    expect(run?.hasAttribute("disabled")).toBe(true);
    const two = await renderRoute({ benchmarkSelectedEndpointIds: ["ep-a", "ep-b"] });
    expect(two.textContent).toContain("2 of 3 selected");
    expect([...two.querySelectorAll("button")].find((button) => button.textContent?.startsWith("Run "))?.hasAttribute("disabled")).toBe(false);
  });

  it("dispatches the exact selected-subject run body and persists judge preferences", async () => {
    const calls: Array<{ body: unknown; method: string; path: string }> = [];
    const commands = defineModelsCommands(createModelsClient({
      fetchImpl: async (input, init) => {
        calls.push({ body: init?.body === undefined ? undefined : JSON.parse(String(init.body)), method: String(init?.method), path: new URL(String(input), "http://localhost").pathname });
        return new Response(JSON.stringify({ runId: "run-1" }), { headers: { "content-type": "application/json" }, status: 202 });
      },
    }));
    const model = { ...modelFor({ benchmarkSelectedEndpointIds: ["ep-a", "ep-b"], benchmarkJudge: "ep-b" }) };
    const run = shellUpdate(model, Message.BenchmarkRunRequested());
    const runArgs = (run.commands ?? [])[0] as unknown as { args: { endpointIdsJson: string; judgeEndpointId: string; mode: string; token: number }; name: string };
    expect(runArgs.name).toBe("RunBenchmark");
    await Effect.runPromise(commands.runBenchmark({ ...runArgs.args, mode: runArgs.args.mode as "full" | "quick" }).effect);
    expect(calls[0]).toMatchObject({ method: "POST", path: "/api/role-model/benchmark/runs" });
    expect(calls[0]?.body).toEqual({ endpointIds: ["ep-a", "ep-b"], judgeEndpointId: "ep-b", mode: "quick" });

    const judge = shellUpdate(model, Message.BenchmarkJudgeChanged({ value: "ep-a" }));
    const prefArgs = (judge.commands ?? [])[0] as unknown as { args: { judgeEndpointId: string; token: number }; name: string };
    expect(prefArgs.name).toBe("SaveBenchmarkPreferences");
    await Effect.runPromise(commands.savePreferences(prefArgs.args).effect);
    expect(calls[1]).toEqual({ body: { judgeEndpointId: "ep-a" }, method: "PUT", path: "/api/role-model/benchmark/preferences" });
  });

  it("confirms and clears one endpoint with the exact DELETE path", async () => {
    const pending = await renderRoute({ benchmarkClearEndpointId: "ep-a" });
    expect(pending.textContent).toContain("Confirm clear");
    expect(pending.textContent).toContain("Cancel");
    const calls: Array<{ body: unknown; method: string; path: string }> = [];
    const commands = defineModelsCommands(createModelsClient({
      fetchImpl: async (input, init) => {
        calls.push({ body: init?.body === undefined ? undefined : JSON.parse(String(init.body)), method: String(init?.method), path: new URL(String(input), "http://localhost").pathname });
        return new Response("{}", { status: 200 });
      },
    }));
    const base = modelFor();
    const armed = shellUpdate(base, Message.BenchmarkEndpointClearRequested({ endpointId: "ep-a" }));
    expect(armed.commands ?? []).toHaveLength(0);
    expect(armed.model.modelsView?.benchmarkClearEndpointId).toBe("ep-a");
    const confirmed = shellUpdate(armed.model, Message.BenchmarkEndpointClearConfirmed({ endpointId: "ep-a" }));
    const args = (confirmed.commands ?? [])[0] as unknown as { args: { endpointId: string; token: number }; name: string };
    expect(args.name).toBe("ClearBenchmarkEndpointData");
    await Effect.runPromise(commands.clearEndpointData(args.args).effect);
    expect(calls[0]).toEqual({ body: {}, method: "DELETE", path: "/api/role-model/benchmark/endpoints/ep-a/data" });
  });

  it("polls the active run and stops on completion", async () => {
    const calls: Array<{ method: string; path: string }> = [];
    const commands = defineModelsCommands(createModelsClient({
      fetchImpl: async (input, init) => {
        calls.push({ method: String(init?.method), path: new URL(String(input), "http://localhost").pathname });
        return new Response(JSON.stringify({ completedSteps: 2, runId: "run-1", status: "running", totalSteps: 4 }), { headers: { "content-type": "application/json" }, status: 200 });
      },
    }));
    const started = shellUpdate(modelFor(), Message.BenchmarkRunStarted({ runId: "run-1", token: modelFor().readbacks.benchmarkSummary.token + 1 }));
    const pollArgs = (started.commands ?? [])[0] as unknown as { args: { runId: string; token: number }; name: string };
    expect(pollArgs.name).toBe("PollBenchmarkRun");
    await Effect.runPromise(commands.pollBenchmarkRun(pollArgs.args).effect);
    expect(calls[0]).toEqual({ method: "GET", path: "/api/role-model/benchmark/runs/run-1" });
    const running = shellUpdate(started.model, Message.BenchmarkRunPolled({ progressJson: JSON.stringify({ completedSteps: 2, runId: "run-1", status: "running", totalSteps: 4 }), token: pollArgs.args.token }));
    expect(running.model.modelsView?.benchmarkProgress?.status).toBe("running");
    expect(((running.commands ?? [])[0] as unknown as { name: string }).name).toBe("PollBenchmarkRun");
    const done = shellUpdate(started.model, Message.BenchmarkRunPolled({ progressJson: JSON.stringify({ completedSteps: 4, runId: "run-1", status: "completed", totalSteps: 4 }), token: pollArgs.args.token }));
    expect(done.model.modelsView?.benchmarkProgress?.status).toBe("completed");
    expect((done.commands ?? []).map((command) => command.name)).not.toContain("PollBenchmarkRun");
  });

  it("filters the taxonomy table by role/task/capability", async () => {
    const role = await renderRoute({ benchmarkTaxonomyFilters: { role: "researcher" } });
    expect(role.textContent).toContain("Role");
    expect(role.textContent).toContain("researcher");
    expect(role.textContent).toContain("75%");
    const taxonomyTable = [...role.querySelectorAll("table")].find((table) => table.textContent?.includes("DIMENSION"));
    expect(taxonomyTable?.textContent).not.toContain("web_research");
    const capability = await renderRoute({ benchmarkTaxonomyFilters: { capability: "tools" } });
    expect(capability.textContent).toContain("Capability");
    expect(capability.textContent).toContain("tools");
    expect(capability.textContent).toContain("80%");
    const filtered = shellUpdate(modelFor(), Message.BenchmarkTaxonomyFilterChanged({ filter: "task", value: "web_research" }));
    expect(filtered.model.modelsView?.benchmarkTaxonomyFilters).toEqual({ task: "web_research" });
  });

  it("renders real p50/p95 from summary case audits and em dashes when absent", async () => {
    const withLatency = await renderRoute();
    expect(withLatency.textContent).toContain("120 ms");
    expect(withLatency.textContent).toContain("200 ms");
    const noAudits = { ...summaryBody, caseAudits: [] };
    const base = modelFor();
    const model = { ...base, readbacks: { ...base.readbacks, benchmarkSummary: parseReadbackFixture("benchmarkSummary", noAudits) } };
    const rendered = await Effect.runPromise(renderToString({
      init: () => ({ commands: [], model }),
      view: (_model, h) => ({ body: benchmarkRoute(model.readbacks.benchmarkSuite, model.readbacks.benchmarkSummary, model.readbacks.benchmarkRuns, h as Parameters<typeof benchmarkRoute>[3], model.modelsView, model.readbacks.modelEndpoints, model.readbacks.benchmarkPreferences, model.readbacks.benchmarkActiveRun), title: "benchmark" }),
    }, { isHydratable: false }));
    const container = document.createElement("div");
    container.innerHTML = rendered.html;
    const row = [...container.querySelectorAll("tbody tr")].find((candidate) => candidate.textContent?.includes("Model A"));
    expect(row?.textContent).toContain("—");
  });
});
