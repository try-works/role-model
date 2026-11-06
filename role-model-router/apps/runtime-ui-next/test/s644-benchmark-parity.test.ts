import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Message } from "../src/message";
import { emptyReadbacks, parseReadbackFixture } from "../src/readback";
import { view } from "../src/view";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/** S644 (task-133): taxonomy filters are mutually exclusive and render a single-dimension list; run history uses production fields. */

const summary = (subjects: ReadonlyArray<Record<string, unknown>>) => ({
  completedAtMs: 1_700_000_000_000,
  judgeEndpointId: "ep-j",
  judgeModelId: "model-j",
  mode: "quick",
  runId: "run-9",
  suiteId: "suite-1",
  subjects,
});
const subject = (
  endpointId: string,
  displayName: string,
  byRole: Record<string, number>,
  byTask: Record<string, number>,
) => ({
  displayName,
  endpointId,
  modelId: displayName,
  overallScore: 0.8,
  scoresByBucket: {
    easy: { cases: 1, score: 0.8 },
    hard: { cases: 1, score: 0.8 },
    medium: { cases: 1, score: 0.8 },
  },
  sourceType: "remote",
  taxonomyScores: { byRole, byTask, byCapability: {} },
});
const subjects = [
  subject("ep-a", "Model A", { coder: 0.8 }, { code: 0.6 }),
  subject("ep-b", "Model B", { coder: 0.4 }, { code: 0.9 }),
];
const rules = [
  {
    caseCount: 4,
    caseCounts: { failed: 1, passed: 3, total: 4 },
    completedAtMs: 1_700_000_000_000,
    endpointIds: ["ep-a", "ep-b"],
    mode: "quick",
    outcome: "partial",
    runId: "run-9",
    suiteId: "suite-1",
  },
];

const renderWith = async (
  modelsView: Record<string, unknown> = {},
  summaryBody: unknown = summary(subjects),
  runs: unknown = rules,
) => {
  const base = shellModel({ route: { _tag: "Benchmark" } });
  const model = {
    ...base,
    modelsView: { ...base.modelsView, ...modelsView },
    readbacks: {
      ...emptyReadbacks(),
      ...base.readbacks,
      benchmarkSummary: parseReadbackFixture("benchmarkSummary", summaryBody),
      benchmarkRuns: parseReadbackFixture("benchmarkRuns", runs),
      modelEndpoints: parseReadbackFixture("modelEndpoints", [
        { endpointId: "ep-a", modelId: "Model A", reasoningEffort: "low", sourceType: "remote" },
        { endpointId: "ep-b", modelId: "Model B", reasoningEffort: "high", sourceType: "remote" },
      ]),
    },
  };
  const rendered = await Effect.runPromise(
    renderToString({ init: () => ({ commands: [], model }), view }, { isHydratable: false }),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S644 benchmark taxonomy and run history parity", () => {
  it("clears the other dimension filters when one is selected", () => {
    const base = shellModel({ route: { _tag: "Benchmark" } });
    const role = shellUpdate(
      base,
      Message.BenchmarkTaxonomyFilterChanged({ filter: "role", value: "coder" }),
    );
    expect(role.model.modelsView?.benchmarkTaxonomyFilters).toEqual({
      capability: "",
      role: "coder",
      task: "",
    });
    const task = shellUpdate(
      role.model,
      Message.BenchmarkTaxonomyFilterChanged({ filter: "task", value: "code" }),
    );
    expect(task.model.modelsView?.benchmarkTaxonomyFilters).toEqual({
      capability: "",
      role: "",
      task: "code",
    });
  });

  it("renders only the active dimension as an endpoint-keyed list", async () => {
    const container = await renderWith({
      benchmarkTaxonomyFilters: { capability: "", role: "coder", task: "" },
    });
    expect(container.querySelector("[data-benchmark-taxonomy-active]")?.textContent).toBe(
      "Role: coder",
    );
    const rows = [...container.querySelectorAll("[data-benchmark-taxonomy-row]")];
    expect(rows.map((row) => row.getAttribute("data-benchmark-taxonomy-row")).sort()).toEqual([
      "ep-a",
      "ep-b",
    ]);
    expect(rows[0]?.textContent).toContain("Model A");
    expect(rows[0]?.textContent).toContain("ep-a");
    expect(container.querySelectorAll("table [data-benchmark-taxonomy-row]")).toHaveLength(0);
  });

  it("shows the production empty-state wording for no filter, a filter with no scores and no taxonomy data", async () => {
    const noFilter = await renderWith();
    expect(noFilter.querySelector("[data-benchmark-taxonomy-empty='select']")?.textContent).toBe(
      "Select a taxonomy dimension above to see per-model benchmark scores.",
    );
    const noScores = await renderWith({
      benchmarkTaxonomyFilters: { capability: "missing", role: "", task: "" },
    });
    expect(noScores.querySelector("[data-benchmark-taxonomy-empty='no-scores']")?.textContent).toBe(
      "No benchmark data for the selected taxonomy dimension.",
    );
    const noData = await renderWith(
      {},
      summary(
        subjects.map((entry) => ({
          ...entry,
          taxonomyScores: { byCapability: {}, byRole: {}, byTask: {} },
        })),
      ),
    );
    expect(noData.textContent).toContain(
      "No taxonomy dimension data is available yet. Benchmark results with taxonomy-tagged cases will appear here.",
    );
  });

  it("renders the production run-history fields with the outcome display", async () => {
    const container = await renderWith();
    const row = container.querySelector("[data-benchmark-run-row='run-9']");
    expect(row).not.toBeNull();
    const text = row?.textContent ?? "";
    expect(text).toContain("run-9");
    expect(text).toContain("quick • 4 cases • 2 models");
    expect(text).toContain("2023-11-14 22:13 • suite-1");
    expect(text).toContain("Outcome: partial");
    expect(text).toContain("3/4 passed");
  });

  it("uses the production empty-state sentence when no benchmark scores exist", async () => {
    const container = await renderWith({}, summary([]));
    expect(container.textContent).toContain(
      "No benchmark scores are in routing profiles yet. Run the benchmark to grade each configured model and update observed routing profiles.",
    );
  });
});
