import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { renderToString } from "@role-model-router/foldkit/experimental/server";

import { Message } from "../src/message";
import { mountShell } from "../src/mount";
import { READBACK_SPECS, emptyReadbacks, parseReadbackFixture } from "../src/readback";
import { shellModel, shellUpdate } from "./support/runtime-shell";
import { view } from "../src/view";

/**
 * S638 (task-121): the benchmark progress panel must show the reference phase wording, a percent bar and
 * endpoint/case context while running, the host error on terminal failure, and - when the host reports the run
 * completed but every case failed - the per-case failure signal instead of a green completed state. Run history
 * rows open a detail panel with per-case score/rationale/actualPreview/judgeError.
 */

const runId = "24a89d52-f6cf-425c-a101-9e937736b342";

const failingCase = (index: number) => ({
  actualPreview: index === 0 ? "upstream error: invalid api key (401)" : "upstream error: request rejected",
  caseId: "case-" + String(index),
  difficultyBucket: "hard",
  errorMessage: index === 0 ? "upstream credential error" : undefined,
  gradingMethod: "heuristic",
  judgeError: index === 0 ? "judge unavailable: 401" : null,
  latencyMs: 5,
  rationale: "Benchmark execution failed.",
  score: 0,
});

const runResult = {
  completedAtMs: 1_700_000_000_000,
  endpointGrades: [{
    byDifficulty: { easy: { cases: 0, score: 0 }, hard: { cases: 12, score: 0 }, medium: { cases: 0, score: 0 } },
    caseResults: Array.from({ length: 12 }, (_unused, index) => failingCase(index)),
    endpointId: "ep-a",
    modelId: "model-a",
    overallScore: 0,
    sourceType: "remote",
  }],
  judgeEndpointId: "ep-j",
  mode: "quick",
  runId,
  startedAtMs: 1_699_999_000_000,
  suiteId: "suite-1",
};

const runningProgress = {
  caseCount: 12,
  caseIndex: 4,
  completedSteps: 49,
  currentCaseId: "case-4",
  currentEndpointModelId: "model-a",
  currentPhase: "compare" as const,
  endpointCount: 2,
  endpointIndex: 1,
  runId,
  runPhase: "compare" as const,
  status: "running" as const,
  totalSteps: 60,
  updatedAtMs: 1_700_000_000_000,
};

const completedProgress = {
  completedSteps: 60,
  resultJson: JSON.stringify(runResult),
  runId,
  runPhase: "complete" as const,
  status: "completed" as const,
  totalSteps: 60,
};

const renderWith = async (modelsView: Record<string, unknown> = {}) => {
  const base = shellModel({ route: { _tag: "Benchmark" } });
  const model = { ...base, modelsView: { ...base.modelsView, ...modelsView }, readbacks: { ...emptyReadbacks(), ...base.readbacks } };
  const rendered = await Effect.runPromise(renderToString({ init: () => ({ commands: [], model }), view }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S638 benchmark progress and per-case results", () => {
  it("renders the reference phase label, percent bar, steps and endpoint/case context while running", async () => {
    const container = await renderWith({ benchmarkProgress: runningProgress });
    expect(container.querySelector("[data-benchmark-progress-phase]")?.textContent).toBe("Phase 3 of 3 · Head-to-head compare");
    expect(container.querySelector("[data-benchmark-progress-percent]")?.textContent).toBe("82%");
    expect(container.querySelector("[data-benchmark-progress-steps]")?.textContent).toBe("49 / 60 steps");
    const detail = container.querySelector("[data-benchmark-progress-detail]")?.textContent ?? "";
    // The reference compare phase lists the case only (describeBenchmarkProgress), not the endpoint.
    expect(detail).toContain("case 5/12 (case-4)");
    expect(detail).toContain("ranking subjects for this case");
    expect(container.querySelector("[data-benchmark-progress-bar]")?.getAttribute("style")).toContain("width: 82%");
  });

  it("surfaces a terminal failure with the host error code and message", async () => {
    const container = await renderWith({
      benchmarkProgress: { errorCode: "benchmark_execution_failed", errorMessage: "upstream provider returned 401", runId, status: "failed", totalSteps: 60 },
    });
    const failed = container.querySelector("[data-benchmark-terminal-status='failed']");
    expect(failed?.textContent).toContain("benchmark_execution_failed");
    expect(failed?.textContent).toContain("upstream provider returned 401");
  });

  it("does not show a green completed state when the host completed a run whose cases all failed", async () => {
    const container = await renderWith({ benchmarkProgress: completedProgress });
    expect(container.querySelector("[data-benchmark-terminal-status='completed']")).not.toBeNull();
    expect(container.querySelector("[data-benchmark-case-summary]")?.textContent).toBe("0/12 cases executed — 12 failed");
    const failure = container.querySelector("[data-benchmark-case-failure]")?.textContent ?? "";
    expect(failure).toContain("case-0: Benchmark execution failed.");
    expect(failure).toContain("upstream error: invalid api key (401)");
    expect(failure).toContain("judge: judge unavailable: 401");
    expect(container.textContent).toContain("model-a — overall 0% · 0/12 cases passed");
  });

  it("lists per-case pass/fail, rationale, actual preview and judge error in the run detail panel", async () => {
    const container = await renderWith({
      benchmarkProgress: completedProgress,
      benchmarkRunDetail: { json: JSON.stringify(runResult), runId, status: "loaded", token: 1 },
    });
    const panel = container.querySelector("[data-benchmark-run-detail-panel]");
    expect(panel).not.toBeNull();
    expect(container.querySelector("[data-benchmark-run-detail-cases]")?.textContent).toBe("0/12 cases passed — 12 failed");
    expect(container.querySelector("[data-benchmark-run-detail-status]")?.textContent).toContain(runId);
    expect(container.querySelectorAll("[data-benchmark-case-row]")).toHaveLength(12);
    expect(container.querySelector("[data-benchmark-case-result='fail']")).not.toBeNull();
    expect(panel?.textContent).toContain("Benchmark execution failed.");
    expect(panel?.textContent).toContain("upstream error: invalid api key (401)");
    expect(panel?.textContent).toContain("judge unavailable: 401");
  });

  it("dispatches the detail request from a history row and loads the exact detail path", async () => {
    const base = shellModel({ route: { _tag: "Benchmark" } });
    const runs = parseReadbackFixture("benchmarkRuns", [{ caseCount: 12, completedAtMs: 1_700_000_000_000, endpointIds: ["ep-a"], mode: "quick", runId, suiteId: "suite-1" }]);
    const model = { ...base, readbacks: { ...emptyReadbacks(), ...base.readbacks, benchmarkRuns: runs } };
    const rendered = await Effect.runPromise(renderToString({ init: () => ({ commands: [], model }), view }, { isHydratable: false }));
    const container = document.createElement("div");
    container.innerHTML = rendered.html;
    const button = container.querySelector("[data-benchmark-run-detail='" + runId + "']") as HTMLButtonElement;
    expect(button).not.toBeNull();
    const requested = shellUpdate(model, Message.BenchmarkRunDetailRequested({ runId }));
    const command = (requested.commands ?? [])[0] as unknown as { readonly args: { readonly runId: string }; readonly name: string };
    expect(command.name).toBe("LoadBenchmarkRunDetail");
    expect(command.args.runId).toBe(runId);
    expect(READBACK_SPECS.benchmarkActiveRun.path).toBe("/api/role-model/benchmark/runs/active");
  });

  it("transitions from running to the failed-case completed state on the mounted route", async () => {
    window.history.replaceState({}, "", "/system/benchmark");
    const container = document.createElement("div");
    container.id = "s638-benchmark";
    document.body.append(container);
    const requested: string[] = [];
    let activeCalls = 0;
    const pending = JSON.stringify({ ...runningProgress, currentPhase: "compare" });
    const handle = mountShell(container, {
      modelsFetchImpl: async (input) => {
        requested.push(String(input));
        return new Response(JSON.stringify({ ...JSON.parse(pending), status: "completed", completedSteps: 60, runPhase: "complete", result: runResult }), { status: 200, headers: { "content-type": "application/json" } });
      },
      readbackFetchImpl: async (input) => {
        const url = String(input);
        if (url.includes("/benchmark/runs/active")) {
          activeCalls += 1;
          // The host clears the active snapshot once the run terminates; returning it forever would re-open the run.
          return new Response(JSON.stringify(activeCalls === 1 ? runningProgress : {}), { status: 200, headers: { "content-type": "application/json" } });
        }
        return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
      },
    });
    try {
      const waitFor = async (read: () => boolean, label: string) => {
        const end = Date.now() + 15000;
        while (Date.now() < end) {
          if (read()) return;
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        throw new Error("Timed out waiting for " + label);
      };
      await waitFor(() => document.querySelector("[data-benchmark-progress-phase]")?.textContent === "Phase 3 of 3 · Head-to-head compare", "running phase panel");
      await waitFor(() => (document.querySelector("[data-benchmark-case-summary]")?.textContent ?? "").includes("0/12 cases executed"), "completed failure summary");
      expect(document.querySelector("[data-benchmark-case-summary]")?.textContent).toBe("0/12 cases executed — 12 failed");
      expect(requested.every((url) => url === "/api/role-model/benchmark/runs/" + runId)).toBe(true);
      expect(requested.length).toBeGreaterThan(0);
    } finally {
      handle.dispose();
      container.remove();
    }
  });
});
