import { expect, test } from "vitest";

import { replayDispatchCaptureToken } from "../src/track-b-auto-replay.js";

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S9 (live on `:3457`):
 *
 *   `replay endpoint HTTP 409: {"error":"route capture idempotency key was reused with different
 *    immutable bytes"}`
 *
 * The host names a counterfactual arm's dispatch capture `replay-<requestId>-<token>` where the token was
 * derived from the replay job and the candidate only. That is stable across a job's *attempts*, so when a
 * job is re-claimed and its arm is dispatched again the provider returns fresh bytes under the same capture
 * id - and the capture boundary refuses it by design (immutable bytes under one idempotency key). The
 * dispatch envelope already carries the per-attempt identity: replay-core rehydrates the same `nonce` for a
 * dispatch that is still in flight and mints a new one for a fresh attempt (the stale-dispatch repair in S1
 * is what makes the second attempt possible at all). Scoping the capture id by that nonce keeps a retry
 * inside one attempt idempotent while a new attempt writes new bytes under a new id.
 */

test("run100n a replay dispatch capture is scoped to the attempt, not just the job", () => {
  const first = replayDispatchCaptureToken({
    replayJobId: "replay-job-1",
    candidateEndpointId: "endpoint:b",
    dispatchNonce: "nonce-attempt-1",
  });
  const retryWithinAttempt = replayDispatchCaptureToken({
    replayJobId: "replay-job-1",
    candidateEndpointId: "endpoint:b",
    dispatchNonce: "nonce-attempt-1",
  });
  const secondAttempt = replayDispatchCaptureToken({
    replayJobId: "replay-job-1",
    candidateEndpointId: "endpoint:b",
    dispatchNonce: "nonce-attempt-2",
  });
  const otherCandidate = replayDispatchCaptureToken({
    replayJobId: "replay-job-1",
    candidateEndpointId: "endpoint:c",
    dispatchNonce: "nonce-attempt-1",
  });

  expect(retryWithinAttempt).toBe(first);
  expect(secondAttempt).not.toBe(first);
  expect(otherCandidate).not.toBe(first);
  expect(first).toMatch(/^[a-f0-9]{16}$/);
  // A dispatch with no nonce still gets a stable, bounded identity.
  expect(
    replayDispatchCaptureToken({
      replayJobId: "replay-job-1",
      candidateEndpointId: "endpoint:b",
      dispatchNonce: null,
    }),
  ).toBe(
    replayDispatchCaptureToken({
      replayJobId: "replay-job-1",
      candidateEndpointId: "endpoint:b",
      dispatchNonce: null,
    }),
  );
});
