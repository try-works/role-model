import { describe, expect, test } from "vitest";

import {
  BENCHMARK_SECTION_ORDER,
  STANDALONE_LAST_RUNS_BY_MODE_ENABLED,
  describeHardBlend,
  filterBenchmarkRunnableCandidates,
  resolveSubjectFromSummary,
} from "./benchmark-model-cards";
import type { BenchmarkSummary, RouterCandidate } from "./runtime-api";

const endpointA = "model.a";
const endpointB = "model.b";

function summaryFixture(mode: "full" | "quick"): BenchmarkSummary {
  return {
    runId: `run-${mode}`,
    completedAtMs: 1_700_000_000_000,
    mode,
    suiteId: "routing-capability-v2",
    suiteVersion: "3.2",
    judgeEndpointId: "judge.endpoint",
    judgeModelId: "judge/model",
    artifactRoot: `run-${mode}`,
    subjects: [
      {
        endpointId: endpointA,
        modelId: "model/a",
        overallScore: mode === "full" ? 0.65 : 0.5,
        scoresByBucket: {
          easy: { score: 0.9, cases: 5 },
          medium: { score: 0.7, cases: 4 },
          hard: { score: 0.4, cases: 3 },
        },
        passingCaseIds: [],
        caseCount: mode === "full" ? 55 : 12,
      },
    ],
    caseComparisons: [],
    caseAudits: [],
    manifest: null,
  };
}

describe("benchmark model cards addendum layout", () => {
  test("uses model-scores → run-benchmark → run-history section order", () => {
    expect(BENCHMARK_SECTION_ORDER).toEqual(["model-scores", "run-benchmark", "run-history"]);
  });

  test("does not enable standalone Last runs by mode section", () => {
    expect(STANDALONE_LAST_RUNS_BY_MODE_ENABLED).toBe(false);
  });

  test("resolves per-endpoint subjects from full and quick summaries independently", () => {
    const full = summaryFixture("full");
    const quick = summaryFixture("quick");

    expect(resolveSubjectFromSummary(full, endpointA)?.overallScore).toBe(0.65);
    expect(resolveSubjectFromSummary(quick, endpointA)?.overallScore).toBe(0.5);
    expect(resolveSubjectFromSummary(full, endpointB)).toBeNull();
    expect(resolveSubjectFromSummary(quick, endpointB)).toBeNull();
  });

  test("formats hardBlend copy for routing impact", () => {
    expect(
      describeHardBlend({
        routingBenchmarkQuality: {
          hardBlend: { full: 0.4, quick: 0.8, blended: 0.6 },
        },
      }),
    ).toContain("blended 0.600");
  });

  test("excludes execution-mode-ineligible endpoints from benchmark runnable candidates", () => {
    const candidates = [
      {
        endpointId: "local.lfm",
        executionModeEligible: true,
      },
      {
        endpointId: "remote.kimi",
        executionModeEligible: false,
      },
      {
        endpointId: "legacy.unspecified",
      },
    ] as RouterCandidate[];

    expect(
      filterBenchmarkRunnableCandidates(candidates).map((candidate) => candidate.endpointId),
    ).toEqual(["local.lfm", "legacy.unspecified"]);
  });
});
