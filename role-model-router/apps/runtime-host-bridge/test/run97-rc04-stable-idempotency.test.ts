import { expect, test } from "vitest";

import { buildAutoReplayIdempotencyKey } from "../src/track-b-auto-replay.js";

/**
 * Run 97 Repair Cycle 04 - L3.
 *
 * Live evidence (2026-09-13): the automatic executor keyed its replay job with the
 * *per-attempt ledger reservation* (`auto:<capture>:<reservationId>`), so every retry
 * created a brand-new durable replay job and orphaned the previous one. Live state
 * showed 2-3 jobs for the same capture, each burning provider dispatches against the
 * daily ceiling (guidance/05 requires an idempotency key that makes retry resume the
 * same job; AC-R07-03 forbids amplification paths).
 *
 * The retry identity of a counterfactual is the capture plus the frozen policy and
 * candidate contract - never the budget reservation of a single attempt.
 */

const policySetDigest = "8533977d5f41b176953911d604a040016f415a74eb45f4614d6553355d2ab061";
const deepseekFlashHigh = "deepseek.personal.deepseek-api-key.global.deepseek-flash-high";
const deepseekV4ProHigh = "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high";
const kimi = "moonshot.personal.kimi-code.global.kimi-k3";

test("run97 rc04 retry of the same capture resumes the same counterfactual identity", () => {
  const first = buildAutoReplayIdempotencyKey({
    captureRef: "req-9ac245bb-dfd5-4717-8b2f-451110bc05fd",
    policySetDigest,
    candidateEndpointIds: [deepseekFlashHigh, deepseekV4ProHigh],
  });
  const retry = buildAutoReplayIdempotencyKey({
    captureRef: "req-9ac245bb-dfd5-4717-8b2f-451110bc05fd",
    policySetDigest,
    candidateEndpointIds: [deepseekFlashHigh, deepseekV4ProHigh],
  });
  expect(retry).toBe(first);
  expect(first).toMatch(/^auto:req-9ac245bb-dfd5-4717-8b2f-451110bc05fd:/);
});

test("run97 rc04 candidate order does not fork the counterfactual identity", () => {
  const forward = buildAutoReplayIdempotencyKey({
    captureRef: "req-1",
    policySetDigest,
    candidateEndpointIds: [deepseekFlashHigh, deepseekV4ProHigh, kimi],
  });
  const reversed = buildAutoReplayIdempotencyKey({
    captureRef: "req-1",
    policySetDigest,
    candidateEndpointIds: [kimi, deepseekV4ProHigh, deepseekFlashHigh],
  });
  expect(reversed).toBe(forward);
});

test("run97 rc04 a changed candidate contract is a distinct counterfactual", () => {
  // L1: when a non-dispatchable endpoint leaves the healthy set the candidate
  // contract genuinely changed, so the new attempt is a new job - and the caller
  // reconciles the superseded one to a terminal state.
  const withKimi = buildAutoReplayIdempotencyKey({
    captureRef: "req-1",
    policySetDigest,
    candidateEndpointIds: [deepseekFlashHigh, deepseekV4ProHigh, kimi],
  });
  const withoutKimi = buildAutoReplayIdempotencyKey({
    captureRef: "req-1",
    policySetDigest,
    candidateEndpointIds: [deepseekFlashHigh, deepseekV4ProHigh],
  });
  expect(withoutKimi).not.toBe(withKimi);
});

test("run97 rc04 a different policy set is a distinct counterfactual", () => {
  const a = buildAutoReplayIdempotencyKey({
    captureRef: "req-1",
    policySetDigest,
    candidateEndpointIds: [deepseekFlashHigh],
  });
  const b = buildAutoReplayIdempotencyKey({
    captureRef: "req-1",
    policySetDigest: "a".repeat(64),
    candidateEndpointIds: [deepseekFlashHigh],
  });
  expect(b).not.toBe(a);
});

test("run97 rc04 the identity is bounded and stable for many candidates", () => {
  const many = Array.from({ length: 64 }, (_, index) => `endpoint:${index}`);
  const key = buildAutoReplayIdempotencyKey({
    captureRef: "req-1",
    policySetDigest,
    candidateEndpointIds: many,
  });
  expect(key.length).toBeLessThanOrEqual(512);
  expect(key.split(":").length).toBe(3);
});
