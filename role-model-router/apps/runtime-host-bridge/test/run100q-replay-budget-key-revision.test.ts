import { expect, test } from "vitest";

import {
  buildAutoReplayIdempotencyKey,
  resolveReplayProviderCallBudget,
} from "../src/track-b-auto-replay.js";

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S12 (live on `:3457`, immediately after the S11
 * deploy):
 *
 *   `replay endpoint HTTP 409: {"error":"extension replay-core failed: replay idempotency key contract
 *    conflict"}`
 *
 * The producer's idempotency key covered the capture, the policy digest and the candidate set - the *identity*
 * of the comparison - but not the job contract the key mints (its budget). Giving the job room for one retry
 * per candidate therefore re-presented the same key with different immutable bytes, which Replay Core refuses
 * by contract. The key now covers the budget revision as well, so a contract change mints a new job instead of
 * colliding with the old one; the previous job retires through the ordinary expiry sweep.
 */

const base = {
  captureRef: "req-1",
  policySetDigest: "sha256:policy",
  candidateEndpointIds: ["endpoint:b", "endpoint:c"],
};

test("run100q a replay contract revision mints a new job instead of colliding with the old one", () => {
  const current = buildAutoReplayIdempotencyKey({
    ...base,
    providerCallBudget: resolveReplayProviderCallBudget(base.candidateEndpointIds.length),
  });
  const sameAgain = buildAutoReplayIdempotencyKey({
    ...base,
    providerCallBudget: resolveReplayProviderCallBudget(base.candidateEndpointIds.length),
  });
  const olderContract = buildAutoReplayIdempotencyKey({
    ...base,
    providerCallBudget: base.candidateEndpointIds.length,
  });
  // A caller that predates the budget field keeps the old behaviour (no budget in the key).
  const legacy = buildAutoReplayIdempotencyKey({ ...base });

  expect(sameAgain).toBe(current);
  expect(olderContract).not.toBe(current);
  expect(legacy).not.toBe(current);
  // The comparison's identity still dominates the key.
  expect(
    buildAutoReplayIdempotencyKey({
      ...base,
      candidateEndpointIds: ["endpoint:b", "endpoint:d"],
      providerCallBudget: resolveReplayProviderCallBudget(base.candidateEndpointIds.length),
    }),
  ).not.toBe(current);
});
