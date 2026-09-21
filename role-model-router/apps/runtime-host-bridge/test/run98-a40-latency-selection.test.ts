import { expect, test } from "vitest";

import { selectEndpointByMeasuredLatency } from "../src/routing-latency-selection.js";

// Run 98 addendum 40 (L5): the selection input may only move a decision when it is authorized, has
// enough evidence *for this request's prompt size*, and the improvement clears the configured delta.
// With the input disabled it must be a no-op so default-stage decisions stay byte-identical.
const buckets = (
  entries: ReadonlyArray<[string, number, number, number]>,
): ReadonlyArray<{
  endpointId: string;
  bucketUpperBoundTokens: number;
  sampleCount: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
}> =>
  entries.map(([endpointId, bucketUpperBoundTokens, sampleCount, p95LatencyMs]) => ({
    endpointId,
    bucketUpperBoundTokens,
    sampleCount,
    p50LatencyMs: Math.round(p95LatencyMs / 2),
    p95LatencyMs,
  }));

const baseInput = {
  estimatedInputTokens: 200_000,
  routerChosenEndpointId: "endpoint.router",
  eligibleEndpointIds: ["endpoint.router", "endpoint.fast", "endpoint.slow"],
  tokenBucketUpperBounds: [50_000, 150_000],
  maxDeltaMs: 2_000,
  maxCandidates: 4,
} as const;

test("a40 L5: a disabled input keeps the router's choice and reports why", () => {
  const outcome = selectEndpointByMeasuredLatency({
    ...baseInput,
    enabled: false,
    buckets: buckets([
      ["endpoint.router", 150_000, 20, 30_000],
      ["endpoint.fast", 150_000, 20, 8_000],
    ]),
  });
  expect(outcome).toMatchObject({
    outcome: "disabled",
    chosenEndpointId: "endpoint.router",
    bucketUpperBoundTokens: null,
  });
});

test("a40 L5: only the request's own size bucket is consulted", () => {
  const outcome = selectEndpointByMeasuredLatency({
    ...baseInput,
    enabled: true,
    // The fast endpoint is faster on *small* prompts only; this request is a large one.
    buckets: buckets([
      ["endpoint.router", 50_000, 20, 30_000],
      ["endpoint.fast", 50_000, 20, 1_000],
      ["endpoint.router", 150_000, 20, 12_000],
      ["endpoint.fast", 150_000, 20, 20_000],
    ]),
  });
  expect(outcome).toMatchObject({
    outcome: "kept_router_choice",
    chosenEndpointId: "endpoint.router",
    bucketUpperBoundTokens: 150_000,
  });
  expect(outcome.candidates.map((candidate) => candidate.endpointId)).toEqual([
    "endpoint.router",
    "endpoint.fast",
  ]);
});

test("a40 L5: a clearly faster eligible candidate is selected for this bucket", () => {
  const outcome = selectEndpointByMeasuredLatency({
    ...baseInput,
    enabled: true,
    buckets: buckets([
      ["endpoint.router", 150_000, 20, 30_000],
      ["endpoint.fast", 150_000, 12, 8_000],
      ["endpoint.slow", 150_000, 12, 44_000],
    ]),
  });
  expect(outcome).toMatchObject({
    outcome: "selected_faster_candidate",
    chosenEndpointId: "endpoint.fast",
  });
  expect(outcome.reason).toContain("delta");
});

test("a40 L5: an improvement inside the configured delta keeps the router's choice", () => {
  const outcome = selectEndpointByMeasuredLatency({
    ...baseInput,
    enabled: true,
    maxDeltaMs: 5_000,
    buckets: buckets([
      ["endpoint.router", 150_000, 20, 10_000],
      ["endpoint.fast", 150_000, 20, 8_000],
    ]),
  });
  expect(outcome).toMatchObject({
    outcome: "kept_router_choice",
    chosenEndpointId: "endpoint.router",
  });
});

test("a40 L5: without evidence for the router's own choice the input refuses to move the decision", () => {
  const outcome = selectEndpointByMeasuredLatency({
    ...baseInput,
    enabled: true,
    buckets: buckets([["endpoint.fast", 150_000, 20, 8_000]]),
  });
  expect(outcome).toMatchObject({
    outcome: "insufficient_evidence",
    chosenEndpointId: "endpoint.router",
  });
});

test("a40 L5: candidates are bounded and ineligible endpoints are ignored", () => {
  const outcome = selectEndpointByMeasuredLatency({
    ...baseInput,
    enabled: true,
    maxCandidates: 2,
    buckets: buckets([
      ["endpoint.router", 150_000, 20, 30_000],
      ["endpoint.fast", 150_000, 20, 8_000],
      ["endpoint.slow", 150_000, 20, 12_000],
      ["endpoint.not-eligible", 150_000, 20, 1_000],
    ]),
  });
  expect(outcome.candidates.length).toBeLessThanOrEqual(2);
  expect(outcome.candidates.map((candidate) => candidate.endpointId)).not.toContain(
    "endpoint.not-eligible",
  );
  expect(outcome.chosenEndpointId).toBe("endpoint.fast");
});
