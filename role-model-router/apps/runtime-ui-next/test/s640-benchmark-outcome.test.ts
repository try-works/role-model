import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { emptyReadbacks, parseReadbackFixture } from "../src/readback";
import { Message } from "../src/message";
import { shellModel, shellUpdate } from "./support/runtime-shell";
import { view } from "../src/view";

/** S640 (task-126): host run outcome fields (caseCounts + passed|partial|failed) must drive the history rows and the run-detail headline, with the local derivation kept as fallback. */

const runId = "run-partial";
const caseResults = (passedCount: number, total: number) => Array.from({ length: total }, (_u, index) => ({
  actualPreview: index < passedCount ? "ok" : "upstream failure",
  caseId: "case-" + String(index),
  difficultyBucket: "hard",
  judgeError: index < passedCount ? null : "judge unavailable",
  rationale: index < passedCount ? "correct" : "Benchmark execution failed.",
  score: index < passedCount ? 1 : 0,
}));
const grades = (passedCount: number, total: number) => [{ endpointId: "ep-a", modelId: "model-a", overallScore: passedCount / total, caseResults: caseResults(passedCount, total) }];

const runs = [
  { caseCount: 12, caseCounts: { failed: 4, passed: 8, total: 12 }, completedAtMs: 1_700_000_000_000, endpointIds: ["ep-a"], mode: "quick", outcome: "partial", runId, suiteId: "suite-1" },
  { caseCount: 12, caseCounts: { failed: 12, passed: 0, total: 12 }, completedAtMs: 1_700_000_100_000, endpointIds: ["ep-a"], mode: "quick", outcome: "failed", runId: "run-failed", suiteId: "suite-1" },
  { caseCount: 12, caseCounts: { failed: 0, passed: 12, total: 12 }, completedAtMs: 1_700_000_200_000, endpointIds: ["ep-a"], mode: "quick", outcome: "passed", runId: "run-passed", suiteId: "suite-1" },
];

const renderWith = async (modelsView: Record<string, unknown> = {}, readbackOverrides: Record<string, unknown> = {}) => {
  const base = shellModel({ route: { _tag: "Benchmark" } });
  const model = {
    ...base,
    modelsView: { ...base.modelsView, ...modelsView },
    readbacks: { ...emptyReadbacks(), ...base.readbacks, benchmarkRuns: parseReadbackFixture("benchmarkRuns", runs), ...readbackOverrides },
  };
  const rendered = await Effect.runPromise(renderToString({ init: () => ({ commands: [], model }), view }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S640 benchmark host outcome fields", () => {
  it("renders outcome and passed/total in history rows for partial, failed and passed runs", async () => {
    const container = await renderWith();
    const rows = [...container.querySelectorAll("[data-benchmark-run-row]")];
    expect(rows).toHaveLength(3);
    const byOutcome = (outcome: string) => rows.find((row) => row.getAttribute("data-benchmark-run-outcome") === outcome);
    expect(byOutcome("partial")?.textContent).toContain("Outcome: partial");
    expect(byOutcome("partial")?.querySelector("[data-benchmark-run-outcome-cell]")?.textContent).toContain("8/12 passed");
    expect(byOutcome("failed")?.querySelector("[data-benchmark-run-outcome-cell]")?.textContent).toContain("0/12 passed");
    expect(byOutcome("passed")?.querySelector("[data-benchmark-run-outcome-cell]")?.textContent).toContain("12/12 passed");
  });

  it("uses the host outcome/caseCounts in the run-detail headline with nested result grades", async () => {
    const snapshot = { caseCounts: { failed: 4, passed: 8, total: 12 }, completedSteps: 12, outcome: "partial", result: { endpointGrades: grades(8, 12) }, runId, status: "completed", totalSteps: 12 };
    const container = await renderWith({ benchmarkRunDetail: { json: JSON.stringify(snapshot), runId, status: "loaded", token: 1 } });
    const status = container.querySelector("[data-benchmark-run-detail-status]")?.textContent ?? "";
    expect(status).toContain("outcome partial");
    expect(container.querySelector("[data-benchmark-run-detail-cases]")?.textContent).toBe("8/12 cases passed — 4 failed");
    expect(container.querySelectorAll("[data-benchmark-case-row]")).toHaveLength(12);
  });

  it("headlines passed and failed outcomes from host fields in the detail panel", async () => {
    const passed = await renderWith({ benchmarkRunDetail: { json: JSON.stringify({ caseCounts: { failed: 0, passed: 12, total: 12 }, outcome: "passed", result: { endpointGrades: grades(12, 12) }, runId, status: "completed" }), runId, status: "loaded", token: 1 } });
    expect(passed.querySelector("[data-benchmark-run-detail-status]")?.textContent).toContain("outcome passed");
    expect(passed.querySelector("[data-benchmark-run-detail-cases]")?.textContent).toBe("12/12 cases passed");
    expect(passed.querySelectorAll("[data-benchmark-case-result='pass']")).toHaveLength(12);

    const failed = await renderWith({ benchmarkRunDetail: { json: JSON.stringify({ caseCounts: { failed: 12, passed: 0, total: 12 }, outcome: "failed", result: { endpointGrades: grades(0, 12) }, runId, status: "completed" }), runId, status: "loaded", token: 1 } });
    expect(failed.querySelector("[data-benchmark-run-detail-status]")?.textContent).toContain("outcome failed");
    expect(failed.querySelector("[data-benchmark-run-detail-cases]")?.textContent).toBe("0/12 cases passed — 12 failed");
    expect(failed.querySelectorAll("[data-benchmark-case-result='fail']")).toHaveLength(12);
  });

  it("shows the host outcome and caseCounts in the progress panel without a result payload", async () => {
    const container = await renderWith({
      benchmarkProgress: { caseCounts: { failed: 4, passed: 8, total: 12 }, completedSteps: 12, outcome: "partial", runId, status: "completed", totalSteps: 12 },
    });
    expect(container.querySelector("[data-benchmark-progress-outcome]")?.textContent).toBe("Outcome: partial");
    expect(container.querySelector("[data-benchmark-case-summary]")?.textContent).toBe("8/12 cases executed — 4 failed");
  });

  it("retains host caseCounts/outcome when a polled snapshot arrives", () => {
    const base = shellModel({ route: { _tag: "Benchmark" } });
    const polled = shellUpdate(base, Message.BenchmarkRunPolled({ progressJson: JSON.stringify({ caseCounts: { failed: 4, passed: 8, total: 12 }, outcome: "partial", runId, status: "completed", totalSteps: 12 }), token: 1 }));
    expect(polled.model.modelsView?.benchmarkProgress?.caseCounts).toEqual({ failed: 4, passed: 8, total: 12 });
    expect(polled.model.modelsView?.benchmarkProgress?.outcome).toBe("partial");
  });

  it("renders pending, never passed, when no case has executed", async () => {
    const container = await renderWith({
      benchmarkProgress: { caseCounts: { failed: 0, passed: 0, total: 0 }, completedSteps: 2, outcome: undefined, runId: "run-pending", status: "running", totalSteps: 60 },
    });
    expect(container.querySelector("[data-benchmark-progress-outcome]")).toBeNull();
    const completed = await renderWith({
      benchmarkProgress: { caseCounts: { failed: 0, passed: 0, total: 0 }, completedSteps: 2, runId: "run-pending", status: "completed", totalSteps: 60 },
    });
    expect(completed.querySelector("[data-benchmark-progress-outcome]")?.textContent).toBe("Outcome: pending");
    expect(completed.querySelector("[data-benchmark-progress-outcome]")?.textContent).not.toBe("Outcome: passed");
  });

  it("keeps the local derivation when an old record has no host outcome fields", async () => {
    const legacySnapshot = { result: { endpointGrades: grades(8, 12) }, runId, status: "completed" };
    const container = await renderWith({ benchmarkRunDetail: { json: JSON.stringify(legacySnapshot), runId, status: "loaded", token: 1 } });
    expect(container.querySelector("[data-benchmark-run-detail-cases]")?.textContent).toBe("8/12 cases passed — 4 failed");
  });
});
