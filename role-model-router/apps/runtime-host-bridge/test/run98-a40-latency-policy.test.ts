import { expect, test } from "vitest";

import {
  ROUTING_LATENCY_SELECTION_POLICY_SCHEMA_VERSION,
  resolveRoutingLatencySelectionPolicy,
} from "../src/routing-latency-policy.js";

// Run 98 addendum 40 (L5): the measured-latency selection input is configuration, not a code constant,
// and it fails closed — a malformed or out-of-bounds value must never widen what the router may do.
test("a40 L5: the selection input is disabled by default and carries documented defaults", () => {
  const resolved = resolveRoutingLatencySelectionPolicy({});
  expect(resolved.source).toBe("defaults");
  expect(resolved.violations).toEqual([]);
  expect(resolved.policy).toEqual({
    schemaVersion: ROUTING_LATENCY_SELECTION_POLICY_SCHEMA_VERSION,
    enabled: false,
    minStage: "S2",
    windowHours: 24,
    minSamples: 5,
    maxDeltaMs: 2_000,
    tokenBucketUpperBounds: [50_000, 150_000],
    maxCandidates: 4,
  });
});

test("a40 L5: a valid configuration section is honoured", () => {
  const resolved = resolveRoutingLatencySelectionPolicy({
    raw: {
      enabled: true,
      minStage: "S3",
      windowHours: 6,
      minSamples: 12,
      maxDeltaMs: 5_000,
      tokenBucketUpperBounds: [30_000, 120_000, 250_000],
      maxCandidates: 8,
    },
  });
  expect(resolved.source).toBe("config");
  expect(resolved.violations).toEqual([]);
  expect(resolved.policy).toMatchObject({
    enabled: true,
    minStage: "S3",
    windowHours: 6,
    minSamples: 12,
    maxDeltaMs: 5_000,
    tokenBucketUpperBounds: [30_000, 120_000, 250_000],
    maxCandidates: 8,
  });
});

test("a40 L5: out-of-bounds values fail closed with recorded violations", () => {
  const resolved = resolveRoutingLatencySelectionPolicy({
    raw: {
      enabled: true,
      minStage: "S9",
      windowHours: 100_000,
      minSamples: 0,
      maxDeltaMs: -1,
      tokenBucketUpperBounds: [0, -5],
      maxCandidates: 999,
    },
  });
  expect(resolved.source).toBe("defaults");
  expect(resolved.policy.enabled).toBe(false);
  // The order of the recorded violations is not part of the contract; the set is.
  expect([...resolved.violations].sort()).toEqual(
    [
      "maxCandidates",
      "maxDeltaMs",
      "minSamples",
      "minStage",
      "tokenBucketUpperBounds",
      "windowHours",
    ].sort(),
  );
});

test("a40 L5: the environment can only narrow the configuration, never widen it", () => {
  const disabled = resolveRoutingLatencySelectionPolicy({
    raw: { enabled: true, maxDeltaMs: 5_000 },
    environment: { ROLE_MODEL_ROUTING_LATENCY_SELECTION_ENABLED: "off" },
  });
  expect(disabled.policy.enabled).toBe(false);
  expect(disabled.source).toBe("environment");

  const clamped = resolveRoutingLatencySelectionPolicy({
    raw: { enabled: true, maxDeltaMs: 5_000 },
    environment: { ROLE_MODEL_ROUTING_LATENCY_SELECTION_MAX_DELTA_MS: "999999" },
  });
  expect(clamped.policy.maxDeltaMs).toBeLessThanOrEqual(60_000);
  expect(clamped.violations).toContain("maxDeltaMs");
});
