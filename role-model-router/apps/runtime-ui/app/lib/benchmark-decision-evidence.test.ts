import { describe, expect, test } from "vitest";

import { projectBenchmarkDecisionView } from "./benchmark-decision-evidence";

describe("projectBenchmarkDecisionView", () => {
  test("uses the immutable decision snapshot instead of the endpoint's current profile", () => {
    expect(
      projectBenchmarkDecisionView({
        requestId: "req-1",
        routingDecisionId: "decision-1",
        selectedEndpointId: "deepseek.flash-max",
        selectedModelId: "deepseek/deepseek-v4-flash",
        fallbackEndpointIds: [],
        strategyLabel: "quality",
        request: {} as never,
        endpointProfile: {
          endpointId: "deepseek.flash-max",
          latestProfile: {
            judge_score: 0.41,
            sources: { benchmark_samples: 99 },
          },
          recentSamples: [],
        },
        observeRequestPath: "/app/observe/requests/req-1",
        benchmarkEvidence: {
          endpointId: "deepseek.flash-max",
          effectiveQualityScore: 0.93,
          overallScore: 0.91,
          taskScore: 0.96,
          roleScore: null,
          groupScore: null,
          reason: "task",
          source: "routing-capability-benchmark",
          evidenceSource: "run-artifact",
          runId: "run-max-001",
          runCompletedAtMs: 1_700_000_000_000,
          runMode: "full",
          suiteId: "routing-capability-v2",
          judgeEndpointId: "judge.endpoint",
          judgeModelId: "judge/model",
          freshnessWeight: 1,
        },
      }),
    ).toEqual({
      scorePercent: 93,
      overallPercent: 91,
      reason: "task",
      evidenceSource: "run-artifact",
      runId: "run-max-001",
      runMode: "full",
      suiteId: "routing-capability-v2",
      judgeEndpointId: "judge.endpoint",
      measuredAtMs: 1_700_000_000_000,
    });
  });

  test("does not substitute a current endpoint profile when the decision has no snapshot", () => {
    expect(
      projectBenchmarkDecisionView({
        requestId: "req-legacy",
        routingDecisionId: "decision-legacy",
        selectedEndpointId: "deepseek.flash-high",
        selectedModelId: "deepseek/deepseek-v4-flash",
        fallbackEndpointIds: [],
        strategyLabel: "quality",
        request: {} as never,
        endpointProfile: {
          endpointId: "deepseek.flash-high",
          latestProfile: { judge_score: 0.99, sources: { benchmark_samples: 12 } },
          recentSamples: [],
        },
        observeRequestPath: "/app/observe/requests/req-legacy",
      }),
    ).toBeNull();
  });
});
