import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Message } from "../src/message";
import { emptyReadbacks, parseReadbackFixture } from "../src/readback";
import { view } from "../src/view";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/** S643 (task-133): one scores row per executed subject (same model low/high stay distinct) and the summary run is reconciled with the panel run. */

const subject = (
  endpointId: string,
  displayName: string,
  modelId: string,
  overallScore: number,
) => ({
  displayName,
  endpointId,
  modelId,
  overallScore,
  scoresByBucket: {
    easy: { cases: 1, score: overallScore },
    hard: { cases: 1, score: overallScore },
    medium: { cases: 1, score: overallScore },
  },
  sourceType: "remote",
  taxonomyScores: { byRole: {}, byTask: {}, byCapability: {} },
});
const summaryBody = {
  caseAudits: [
    { endpointId: "deepseek.flash.low", latencyMs: 100 },
    { endpointId: "deepseek.flash.high", latencyMs: 200 },
    { endpointId: "deepseek.v4-pro", latencyMs: 300 },
  ],
  completedAtMs: 1_700_000_000_000,
  judgeEndpointId: "deepseek.judge",
  judgeModelId: "deepseek/judge",
  mode: "quick",
  runId: "run-summary",
  suiteId: "suite-1",
  subjects: [
    subject("deepseek.flash.low", "DeepSeek Flash", "deepseek/flash", 1),
    subject("deepseek.flash.high", "DeepSeek Flash", "deepseek/flash", 0.5),
    subject("deepseek.v4-pro", "DeepSeek V4 Pro", "deepseek/v4-pro", 0.75),
  ],
};
const endpointsBody = [
  {
    endpointId: "deepseek.flash.low",
    modelId: "deepseek/flash",
    reasoningEffort: "low",
    sourceType: "remote",
  },
  {
    endpointId: "deepseek.flash.high",
    modelId: "deepseek/flash",
    reasoningEffort: "high",
    sourceType: "remote",
  },
  {
    endpointId: "deepseek.v4-pro",
    modelId: "deepseek/v4-pro",
    reasoningEffort: "high",
    sourceType: "remote",
  },
];

const renderWith = async (
  modelsView: Record<string, unknown> = {},
  readbackOverrides: Record<string, unknown> = {},
) => {
  const base = shellModel({ route: { _tag: "Benchmark" } });
  const model = {
    ...base,
    modelsView: { ...base.modelsView, ...modelsView },
    readbacks: {
      ...emptyReadbacks(),
      ...base.readbacks,
      benchmarkSummary: parseReadbackFixture("benchmarkSummary", summaryBody),
      modelEndpoints: parseReadbackFixture("modelEndpoints", endpointsBody),
      ...readbackOverrides,
    },
  };
  const rendered = await Effect.runPromise(
    renderToString({ init: () => ({ commands: [], model }), view }, { isHydratable: false }),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const scoresTable = (container: HTMLElement): HTMLTableElement | undefined =>
  [...container.querySelectorAll("table")].find((table) =>
    table.textContent?.includes("Actions"),
  ) as HTMLTableElement | undefined;

describe("S643 benchmark scores identity and run reconciliation", () => {
  it("renders one distinct row per executed subject, including both same-model efforts and v4-pro", async () => {
    const container = await renderWith();
    const table = scoresTable(container);
    expect(table).not.toBeUndefined();
    const rows = [...container.querySelectorAll("[data-benchmark-score-row]")];
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.getAttribute("data-benchmark-score-row")).sort()).toEqual([
      "deepseek.flash.high",
      "deepseek.flash.low",
      "deepseek.v4-pro",
    ]);
    const low = rows.find(
      (row) => row.getAttribute("data-benchmark-score-row") === "deepseek.flash.low",
    );
    const high = rows.find(
      (row) => row.getAttribute("data-benchmark-score-row") === "deepseek.flash.high",
    );
    expect(low?.querySelector("[data-benchmark-score-endpoint]")?.textContent).toBe(
      "deepseek.flash.low",
    );
    expect(high?.querySelector("[data-benchmark-score-endpoint]")?.textContent).toBe(
      "deepseek.flash.high",
    );
    expect(low?.textContent).toContain("(low)");
    expect(high?.textContent).toContain("(high)");
    expect(low?.textContent).not.toBe(high?.textContent);
    expect(rows.some((row) => row.textContent?.includes("DeepSeek V4 Pro"))).toBe(true);
    expect(container.querySelectorAll("[data-benchmark-score-clear]")).toHaveLength(3);
  });

  it("renders the summary runId and completion time and shows both ids on a panel/summary mismatch", async () => {
    const container = await renderWith({
      benchmarkProgress: {
        completedSteps: 60,
        runId: "run-panel",
        runPhase: "complete",
        status: "completed",
        totalSteps: 60,
      },
    });
    const lastRun = container.querySelector("[data-benchmark-last-run]")?.textContent ?? "";
    expect(lastRun).toContain("run-summary");
    expect(container.textContent).toContain("2023-11-14 22:13");
    const mismatch = container.querySelector("[data-benchmark-run-mismatch]")?.textContent ?? "";
    expect(mismatch).toContain("run-panel");
    expect(mismatch).toContain("run-summary");
  });

  it("refreshes the benchmark summary when a run completes", () => {
    const base = shellModel({ route: { _tag: "Benchmark" } });
    const started = shellUpdate(base, Message.BenchmarkRunStarted({ runId: "run-A", token: 1 }));
    const completed = shellUpdate(
      started.model,
      Message.BenchmarkRunPolled({
        progressJson: JSON.stringify({
          completedSteps: 60,
          runId: "run-A",
          status: "completed",
          totalSteps: 60,
        }),
        token: 2,
      }),
    );
    const keys = (completed.commands ?? [])
      .map(
        (command) =>
          (command as unknown as { readonly args?: { readonly key?: string } }).args?.key,
      )
      .filter((key): key is string => key !== undefined);
    expect(keys).toContain("benchmarkSummary");
  });
});
