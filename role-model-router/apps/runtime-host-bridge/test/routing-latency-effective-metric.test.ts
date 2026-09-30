import { describe, expect, test } from "vitest";

import { selectEndpointByMeasuredLatency } from "../src/routing-latency-selection.js";

/**
 * Run 103 / SP7 - the measured-latency override compares the effective latency
 * `p50 + 0.25 * (p95 - p50)` instead of a raw p95 that spikes randomly on any endpoint
 * (design document section 6.3; requirement R7).
 */
describe("measured-latency selection uses the effective metric", () => {
  const buckets = [
    // A (the router's choice) has a median of 100 ms but an extreme tail.
    {
      endpointId: "endpoint-a",
      bucketUpperBoundTokens: 50_000,
      sampleCount: 40,
      p50LatencyMs: 100,
      p95LatencyMs: 20_000,
    },
    // B has a much better tail but a far worse median.
    {
      endpointId: "endpoint-b",
      bucketUpperBoundTokens: 50_000,
      sampleCount: 40,
      p50LatencyMs: 5_000,
      p95LatencyMs: 6_000,
    },
  ] as const;

  const base = {
    enabled: true,
    estimatedInputTokens: 1_000,
    routerChosenEndpointId: "endpoint-a",
    eligibleEndpointIds: ["endpoint-a", "endpoint-b"] as const,
    buckets,
    tokenBucketUpperBounds: [50_000],
    maxDeltaMs: 2_000,
    maxCandidates: 4,
  } as const;

  test("a p95 spike does not flip the choice when the median is far better", () => {
    const selection = selectEndpointByMeasuredLatency({ ...base, maxDeltaMs: 2_000 });
    expect(selection.outcome).toBe("kept_router_choice");
    expect(selection.chosenEndpointId).toBe("endpoint-a");
  });

  test("a genuine effective-latency improvement moves the choice", () => {
    const selection = selectEndpointByMeasuredLatency({
      ...base,
      buckets: [
        {
          endpointId: "endpoint-a",
          bucketUpperBoundTokens: 50_000,
          sampleCount: 40,
          p50LatencyMs: 5_000,
          p95LatencyMs: 5_500,
        },
        {
          endpointId: "endpoint-b",
          bucketUpperBoundTokens: 50_000,
          sampleCount: 40,
          p50LatencyMs: 1_000,
          p95LatencyMs: 1_200,
        },
      ],
      maxDeltaMs: 2_000,
    });
    expect(selection.outcome).toBe("selected_faster_candidate");
    expect(selection.chosenEndpointId).toBe("endpoint-b");
    expect(selection.reason).toMatch(/effective/i);
  });

  test("the 10 000 ms default threshold is respected", () => {
    const selection = selectEndpointByMeasuredLatency({
      ...base,
      buckets: [
        {
          endpointId: "endpoint-a",
          bucketUpperBoundTokens: 50_000,
          sampleCount: 40,
          p50LatencyMs: 12_000,
          p95LatencyMs: 12_500,
        },
        {
          endpointId: "endpoint-b",
          bucketUpperBoundTokens: 50_000,
          sampleCount: 40,
          p50LatencyMs: 1_000,
          p95LatencyMs: 1_200,
        },
      ],
      maxDeltaMs: 10_000,
    });
    expect(selection.outcome).toBe("selected_faster_candidate");
  });
});
