import { describe, expect, test } from "vitest";

import {
  completeBenchmarkRunProgress,
  createBenchmarkRunProgress,
  failBenchmarkRunProgress,
  readBenchmarkRunProgress,
  updateBenchmarkRunProgress,
} from "../src/benchmark-progress.js";

describe("benchmark-progress", () => {
  test("includes compare steps in total when multi-endpoint judge run", () => {
    const snapshot = createBenchmarkRunProgress({
      runId: "run-compare",
      mode: "quick",
      endpointCount: 2,
      caseCount: 12,
      judgeEndpointId: "judge.endpoint",
      useJudge: true,
      compareCaseCount: 12,
    });
    expect(snapshot.totalSteps).toBe(48 + 12);
    expect(snapshot.runPhase).toBe("execution");
  });

  test("transitions through grading and compare phases", () => {
    createBenchmarkRunProgress({
      runId: "run-phases",
      mode: "quick",
      endpointCount: 2,
      caseCount: 2,
      judgeEndpointId: "judge.endpoint",
      useJudge: true,
      compareCaseCount: 2,
    });
    updateBenchmarkRunProgress("run-phases", { runPhase: "grading", currentPhase: "judge" });
    expect(readBenchmarkRunProgress("run-phases")?.runPhase).toBe("grading");
    updateBenchmarkRunProgress("run-phases", { runPhase: "compare", currentPhase: "compare" });
    expect(readBenchmarkRunProgress("run-phases")?.runPhase).toBe("compare");
    completeBenchmarkRunProgress("run-phases", {
      runId: "run-phases",
      suiteId: "routing-capability-v2",
      mode: "quick",
      judgeEndpointId: "judge.endpoint",
      startedAtMs: 1,
      completedAtMs: 2,
      artifactRoot: "run-phases",
      endpointGrades: [],
    });
    expect(readBenchmarkRunProgress("run-phases")?.runPhase).toBe("complete");
  });

  test("reports membership drift as a distinct safe terminal failure", () => {
    createBenchmarkRunProgress({
      runId: "run-membership-drifted",
      mode: "quick",
      endpointCount: 1,
      caseCount: 1,
      judgeEndpointId: "judge.endpoint",
      useJudge: true,
    });

    failBenchmarkRunProgress("run-membership-drifted", "benchmark_membership_drifted");

    expect(readBenchmarkRunProgress("run-membership-drifted")).toMatchObject({
      status: "failed",
      errorCode: "benchmark_membership_drifted",
      errorMessage:
        "Configured model membership changed during the benchmark. Run it again after model changes are complete.",
    });
  });
});
