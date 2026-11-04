import { Option } from "effect";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { fromString as urlFromString } from "@role-model-router/foldkit/url";

import { createModelsClient, defineModelsCommands } from "../src/commands";
import { Message } from "../src/message";
import { READBACK_SPECS, emptyReadbacks, parseReadbackFixture } from "../src/readback";
import type { Model } from "../src/model";
import { shellModel, shellUpdate } from "./support/runtime-shell";
import { view } from "../src/view";

/**
 * S622 (task-100): /system/benchmark parity with the :3456 React route
 * (apps/runtime-ui/app/routes/control-benchmark.tsx).
 *
 * Rendered assertions: mode options carry suite-derived counts, the judge select carries endpoint ids
 * from the endpoint readback, the Run label carries the selected model + case counts, Clear all data is
 * rendered, and the Benchmark scores / Taxonomy dimensions / Run history tables read the summary and
 * runs readbacks. Contract assertions: the exact POST/DELETE host paths+bodies, the update command args,
 * and the readback queries the route entry plans.
 */

const suiteBody = {
  cases: [
    { benchmark_eligible: true, case_id: "c1", category: "knowledge", difficulty_bucket: "easy", quick_benchmark: true },
    { benchmark_eligible: true, case_id: "c2", category: "knowledge", difficulty_bucket: "medium", quick_benchmark: true },
    { benchmark_eligible: true, case_id: "c3", category: "reasoning", difficulty_bucket: "hard", quick_benchmark: true },
    { benchmark_eligible: true, case_id: "c4", category: "reasoning", difficulty_bucket: "hard", quick_benchmark: false },
    { benchmark_eligible: false, case_id: "c5", category: "safety", difficulty_bucket: "easy", quick_benchmark: true },
  ],
  description: "fixture suite",
  suite_id: "suite-1",
  suite_version: "1.0",
  task_type: "capability",
};
const summaryBody = {
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
    scoresByBucket: { easy: { cases: 2, score: 1 }, hard: { cases: 0, score: 0 }, medium: { cases: 1, score: 0.5 } },
    sourceType: "remote",
    taxonomyScores: { byRole: { researcher: 0.75 }, byTask: { web_research: 0.5 } },
  }],
  suiteId: "suite-1",
};
const runsBody = [{ caseCount: 4, completedAtMs: 1_700_000_000_000, endpointIds: ["ep-a", "ep-b"], mode: "quick", runId: "run-9", suiteId: "suite-1" }];
const endpointsBody = [
  { endpointId: "ep-a", modelId: "model-a", sourceType: "remote" },
  { endpointId: "ep-b", modelId: "model-b", sourceType: "local" },
];

const benchmarkModel = (
  overrides: { readonly benchmarkJudge?: string; readonly benchmarkMode?: string } = {},
  readbackOverrides: Partial<Model["readbacks"]> = {},
) => {
  const base = shellModel({ route: { _tag: "Benchmark" }, modelsView: { benchmarkJudge: "ep-b", benchmarkMode: "quick", ...overrides } });
  return {
    ...base,
    readbacks: {
      ...emptyReadbacks(),
      benchmarkRuns: parseReadbackFixture("benchmarkRuns", runsBody),
      benchmarkSummary: parseReadbackFixture("benchmarkSummary", summaryBody),
      benchmarkSuite: parseReadbackFixture("benchmarkSuite", suiteBody),
      modelEndpoints: parseReadbackFixture("modelEndpoints", endpointsBody),
      ...readbackOverrides,
    },
  };
};

const render = async (
  overrides: { readonly benchmarkJudge?: string; readonly benchmarkMode?: string } = {},
  readbackOverrides: Partial<Model["readbacks"]> = {},
): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(renderToString({
    init: () => ({ commands: [], model: benchmarkModel(overrides, readbackOverrides) }),
    view,
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const renderModel = async (model: Model): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(renderToString({
    init: () => ({ commands: [], model }),
    view,
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const urlOf = (href: string) => Option.getOrThrow(urlFromString("http://localhost" + href));

describe("S622 benchmark parity", () => {
  it("renders the mode options with suite-derived counts and the judge select with endpoint ids", async () => {
    const container = await render();
    const mode = container.querySelector("select[aria-label='Benchmark mode']");
    expect([...(mode?.querySelectorAll("option") ?? [])].map((option) => option.getAttribute("value"))).toEqual(["quick", "full"]);
    expect(mode?.textContent).toContain("Quick (3 hard cases)");
    expect(mode?.textContent).toContain("Full (all eligible cases)");
    const judge = container.querySelector("select[aria-label='Judge endpoint']");
    expect([...(judge?.querySelectorAll("option") ?? [])].map((option) => option.getAttribute("value"))).toEqual(["ep-a", "ep-b"]);
    expect(judge?.textContent).toContain("model-a (remote)");
    expect(judge?.textContent).toContain("model-b (local)");
  });

  it("renders the Run label with the selected model, case counts and the clear-all control", async () => {
    const container = await render();
    const run = [...container.querySelectorAll("button")].find((button) => button.textContent?.startsWith("Run "));
    expect(run?.textContent).toBe("Run quick benchmark (2 of 2 selected, 3 cases)");
    expect(run?.hasAttribute("disabled")).toBe(false);
    expect(container.textContent).toContain("2 of 2 selected");
    // Reference gating: fewer than two selected subjects cannot compare head to head. The subject-selection
    // UI is not built yet, so "selected" is all runnable endpoints for now; the running-state condition is
    // still recorded as a difference until active-run state exists.
    const single = await render({}, { modelEndpoints: parseReadbackFixture("modelEndpoints", [endpointsBody[0]]) });
    const disabledRun = [...single.querySelectorAll("button")].find((button) => button.textContent?.startsWith("Run "));
    expect(disabledRun?.hasAttribute("disabled")).toBe(true);
    expect(container.textContent).toContain("Clear all benchmark data");
  });

  it("guards Clear all benchmark data behind an explicit confirmation", async () => {
    const base = benchmarkModel();
    const initial = await render();
    expect(initial.textContent).toContain("Clear all benchmark data");
    expect(initial.textContent).not.toContain("This cannot be undone.");

    const armed = shellUpdate(base, Message.BenchmarkClearRequested());
    expect(armed.commands ?? []).toHaveLength(0);
    expect(armed.model.modelsView?.benchmarkClearPending).toBe(true);
    const pendingModel = { ...armed.model, readbacks: base.readbacks };
    const pending = await renderModel(pendingModel);
    expect(pending.textContent).toContain("This cannot be undone.");
    expect(pending.textContent).toContain("Confirm clear");
    expect(pending.textContent).toContain("Cancel");
    expect([...pending.querySelectorAll("button")].some((button) => button.textContent === "Clear all benchmark data")).toBe(false);

    const confirmed = shellUpdate(pendingModel, Message.BenchmarkClearConfirmed());
    expect(((confirmed.commands ?? [])[0] as unknown as { readonly name: string }).name).toBe("ClearBenchmark");
    expect(confirmed.model.modelsView?.benchmarkClearPending).toBe(false);
    const cancelled = shellUpdate(pendingModel, Message.BenchmarkClearCancelled());
    expect(cancelled.commands ?? []).toHaveLength(0);
    expect(cancelled.model.modelsView?.benchmarkClearPending).toBe(false);
  });

  it("applies the reference runnable-candidate filter to endpoints and the judge select", async () => {
    const endpoints = parseReadbackFixture("modelEndpoints", [
      { benchmarkEligible: true, endpointId: "ep-a", modelId: "model-a", sourceType: "remote" },
      { benchmarkEligible: false, endpointId: "ep-b", modelId: "model-b", sourceType: "remote" },
      { endpointId: "ep-c", executionModeEligible: false, modelId: "model-c", sourceType: "remote" },
      { endpointId: "ep-d", executionModeEligible: true, modelId: "model-d", sourceType: "remote" },
    ]);
    const container = await render({}, { modelEndpoints: endpoints });
    const values = [...container.querySelectorAll("select[aria-label='Judge endpoint'] option")].map((option) => option.getAttribute("value"));
    expect(values).toEqual(["ep-a", "ep-d"]);
    expect(container.textContent).not.toContain("ep-b");
    expect(container.textContent).not.toContain("ep-c");
  });

  it("renders the scores, taxonomy and run-history tables from the readbacks", async () => {
    const container = await render();
    const text = container.textContent ?? "";
    for (const heading of ["Model", "Overall", "Profile", "Easy", "Medium", "Hard", "p50", "p95", "Scope"]) expect(text).toContain(heading);
    expect(text).toContain("Model A");
    expect(text).toContain("66%");
    expect(text).toContain("100% · 2");
    expect(text).toContain("50% · 1");
    expect(text).toContain("0% · 0");
    expect(text).toContain("Last run: 2023-11-14");
    expect(text).toContain("Suite: quick");
    expect(text).toContain("Judge: model-b");
    for (const taxonomy of ["Role", "researcher", "75%", "Task", "web_research", "50%"]) expect(text).toContain(taxonomy);
    for (const history of ["run-9", "quick", "4", "2", "2023-11-14", "suite-1"]) expect(text).toContain(history);
  });

  it("stores the mode/judge and dispatches the exact RunBenchmark/ClearBenchmark contract", async () => {
    const base = benchmarkModel();
    const full = shellUpdate(base, Message.BenchmarkModeChanged({ value: "full" }));
    expect(full.model.modelsView?.benchmarkMode).toBe("full");
    const judge = shellUpdate(full.model, Message.BenchmarkJudgeChanged({ value: "ep-a" }));
    expect(judge.model.modelsView?.benchmarkJudge).toBe("ep-a");
    const run = shellUpdate(judge.model, Message.BenchmarkRunRequested());
    const runCommand = (run.commands ?? [])[0] as unknown as { readonly args: { readonly judgeEndpointId: string; readonly mode: string }; readonly name: string };
    expect(runCommand.name).toBe("RunBenchmark");
    expect(runCommand.args.judgeEndpointId).toBe("ep-a");
    expect(runCommand.args.mode).toBe("full");
    const armed = shellUpdate(base, Message.BenchmarkClearRequested());
    expect(armed.commands ?? []).toHaveLength(0);
    expect(armed.model.modelsView?.benchmarkClearPending).toBe(true);
    const clear = shellUpdate({ ...armed.model, readbacks: base.readbacks }, Message.BenchmarkClearConfirmed());
    expect(((clear.commands ?? [])[0] as unknown as { readonly name: string }).name).toBe("ClearBenchmark");
  });

  it("enables Run with 2 subjects and an external judge, warning only on overlap", async () => {
    const endpoints = parseReadbackFixture("modelEndpoints", [
      { endpointId: "ep-a", modelId: "model-a", sourceType: "remote" },
      { endpointId: "ep-b", modelId: "model-b", sourceType: "remote" },
      { endpointId: "ep-c", modelId: "model-c", sourceType: "remote" },
    ]);
    const externalBase = benchmarkModel({ benchmarkJudge: "ep-c" }, { modelEndpoints: endpoints });
    const external = await renderModel({ ...externalBase, modelsView: { ...externalBase.modelsView, benchmarkSelectedEndpointIds: ["ep-a", "ep-b"] } });
    const externalButton = external.querySelector("[data-benchmark-run]");
    expect(externalButton?.hasAttribute("disabled")).toBe(false);
    expect(external.querySelector("[data-benchmark-judge-overlap]")).toBeNull();
    const overlap = await render({ benchmarkJudge: "ep-a" }, { modelEndpoints: endpoints });
    expect(overlap.querySelector("[data-benchmark-run]")?.hasAttribute("disabled")).toBe(false);
    expect(overlap.querySelector("[data-benchmark-judge-overlap]")?.textContent).toBe("Judge endpoint is also a benchmark subject. Expect slower grading and higher judge failure risk — prefer a dedicated judge when available.");
  });

  it("disables Run for empty judge, fewer than two subjects, and a running benchmark", async () => {
    const endpoints = parseReadbackFixture("modelEndpoints", [
      { endpointId: "ep-a", modelId: "model-a", sourceType: "remote" },
      { endpointId: "ep-b", modelId: "model-b", sourceType: "remote" },
    ]);
    const noJudge = await render({}, { modelEndpoints: parseReadbackFixture("modelEndpoints", []) });
    expect(noJudge.querySelector("[data-benchmark-run]")?.hasAttribute("disabled")).toBe(true);
    const base = benchmarkModel({ benchmarkJudge: "ep-b" }, { modelEndpoints: endpoints });
    const oneSelected = { ...base, modelsView: { ...base.modelsView, benchmarkSelectedEndpointIds: ["ep-a"] } };
    expect((await renderModel(oneSelected)).querySelector("[data-benchmark-run]")?.hasAttribute("disabled")).toBe(true);
    const running = { ...base, modelsView: { ...base.modelsView, benchmarkProgress: { completedSteps: 1, runId: "run-1", status: "running" as const, totalSteps: 4 } } };
    expect((await renderModel(running)).querySelector("[data-benchmark-run]")?.hasAttribute("disabled")).toBe(true);
  });

  it("dispatches the exact external-judge body with 2 subjects", () => {
    const endpoints = parseReadbackFixture("modelEndpoints", [
      { endpointId: "ep-a", modelId: "model-a", sourceType: "remote" },
      { endpointId: "ep-b", modelId: "model-b", sourceType: "remote" },
      { endpointId: "ep-c", modelId: "model-c", sourceType: "remote" },
    ]);
    const base = benchmarkModel({ benchmarkJudge: "ep-c" }, { modelEndpoints: endpoints });
    const next = shellUpdate({ ...base, modelsView: { ...base.modelsView, benchmarkSelectedEndpointIds: ["ep-a", "ep-b"] } }, Message.BenchmarkRunRequested());
    const command = (next.commands ?? [])[0] as unknown as { readonly args: { readonly endpointIdsJson: string; readonly judgeEndpointId: string; readonly mode: string }; readonly name: string };
    expect(command.name).toBe("RunBenchmark");
    expect(JSON.parse(command.args.endpointIdsJson)).toEqual(["ep-a", "ep-b"]);
    expect(command.args.judgeEndpointId).toBe("ep-c");
    expect(command.args.mode).toBe("quick");
  });

  it("sends the exact host contracts for the run and clear commands", async () => {
    const calls: Array<{ readonly body: unknown; readonly method: string; readonly path: string }> = [];
    const commands = defineModelsCommands(createModelsClient({
      fetchImpl: async (input, init) => {
        calls.push({ body: init?.body === undefined ? undefined : JSON.parse(String(init.body)), method: String(init?.method), path: new URL(String(input), "http://localhost").pathname });
        return new Response("{}", { status: 200 });
      },
    }));
    await Effect.runPromise(commands.runBenchmark({ endpointIdsJson: JSON.stringify(["ep-a", "ep-b"]), judgeEndpointId: "ep-a", mode: "full", token: 1 }).effect);
    await Effect.runPromise(commands.clearBenchmark({ token: 1 }).effect);
    expect(calls[0]).toEqual({ body: { endpointIds: ["ep-a", "ep-b"], judgeEndpointId: "ep-a", mode: "full" }, method: "POST", path: "/api/role-model/benchmark/runs" });
    expect(calls[1]).toEqual({ body: {}, method: "DELETE", path: "/api/role-model/benchmark/data" });
  });

  it("plans the suite, summary and runs readback queries on route entry", () => {
    const next = shellUpdate(shellModel(), Message.ChangedUrl({ url: urlOf("/system/benchmark") }));
    const keys = (next.commands ?? []).flatMap((command) => {
      const candidate = command as unknown as { readonly args?: { readonly key?: string }; readonly name?: string };
      return candidate.args?.key === undefined ? [] : [candidate.args.key];
    });
    expect(keys).toContain("benchmarkSuite");
    expect(keys).toContain("benchmarkSummary");
    expect(keys).toContain("benchmarkRuns");
    expect(keys).toContain("benchmarkPreferences");
    expect(keys).toContain("benchmarkActiveRun");
  });

  it("parses the three benchmark readbacks with their host paths", () => {
    expect(READBACK_SPECS.benchmarkSuite.path).toBe("/api/role-model/benchmark/suite");
    expect(READBACK_SPECS.benchmarkSummary.path).toBe("/api/role-model/benchmark/summary");
    expect(READBACK_SPECS.benchmarkRuns.path).toBe("/api/role-model/benchmark/runs");
    const summary = parseReadbackFixture("benchmarkSummary", summaryBody);
    expect(summary.rows).toHaveLength(2);
    expect(JSON.parse(summary.rows[0].meta)).toMatchObject({ judgeModelId: "model-b", mode: "quick", runId: "run-9" });
    expect(parseReadbackFixture("benchmarkRuns", runsBody).rows[0].value).toBe("4");
  });
});
