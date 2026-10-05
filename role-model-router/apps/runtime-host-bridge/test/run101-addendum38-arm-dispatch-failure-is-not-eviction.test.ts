import { expect, test } from "vitest";

import {
  describeUnresolvedArms,
  resolveResumedArmEvidence,
  unresolvedArmsArePermanent,
} from "../src/supervised-replay-handoff-recovery.js";

/**
 * Run 101 addendum 38 - an arm whose *dispatch* failed must not be reported as evicted evidence.
 *
 * Measured live on the packaged stage RC (public `dff56a8d` + private `cd81be60`) on `:3457`, 2026-09-28,
 * replay job `2f223824749c8b9a29cb7c8a4b323dd359d0358ef3e9ab0cc68e4298603e3509`:
 *
 *   dispatches["…gpt-5.6-terra"] = { status: "retryable_failure", code: "router_dispatch_error",
 *                                    reason: "terminated", failureClass: "router_dispatch_error",
 *                                    disposition: "retryable" }
 *   dispatches["…gpt-5.5"]       = { status: "complete", result: { … } }
 *   stderr  [run101] resumed handoff 2f223824749c… could not read 1 arm(s):
 *             openai.…gpt-5.6-terra=capture_missing(replay-req-3721b29c-…-be71c909855f3e09-branch)
 *
 * The arm had no capture because its provider call was **terminated** - a transport failure, explicitly
 * classified `retryable`. Reporting it as `capture_missing` is the same collapse this run keeps removing: a
 * retryable dispatch failure wearing the name of an evicted pointer.
 *
 * The consequence is not cosmetic. `unresolvedArmsArePermanent` treats `capture_missing` as permanent, so a
 * replay whose **every** arm failed to dispatch resolves no arm, takes the permanent branch, and is
 * terminalized as `evaluation_unavailable: handoff evidence is outside the capture retention window` - a
 * transient transport failure killing a replay that had already paid for its branches. That is the same
 * misdiagnosis that cost this run 82 of its first 100 replays.
 */

const CANDIDATES = [
  { endpointId: "endpoint:terra", modelId: "model:terra", reasoningEffort: null },
] as const;

const BRANCH_IDS = new Map([["endpoint:terra", "replay-req-terra-nonce-branch"]]);

const readNothing = async (): Promise<Record<string, unknown> | null> => null;

const TERMINATED = {
  status: "retryable_failure",
  code: "router_dispatch_error",
  reason: "terminated",
  failureClass: "router_dispatch_error",
  disposition: "retryable",
} as const;

test("an arm whose dispatch was terminated is named as a dispatch failure, not as a missing capture", async () => {
  const resolved = await resolveResumedArmEvidence({
    counterfactualPackages: CANDIDATES,
    branchCaptureRequestIds: BRANCH_IDS,
    readCapture: readNothing,
    dispatchOutcomesByEndpoint: { "endpoint:terra": TERMINATED },
  });

  expect(resolved.arms).toHaveLength(0);
  expect(resolved.unreadable).toHaveLength(1);
  expect(resolved.unreadable[0]?.reason).toBe("capture_not_written_dispatch_failed");

  const described = describeUnresolvedArms(resolved.unreadable);
  expect(described).toContain("endpoint:terra=capture_not_written_dispatch_failed");
  expect(described).toContain("terminated");
  expect(described).not.toContain("capture_missing");
});

test("a dispatch failure is retryable, so it can never terminalize a replay as eviction", async () => {
  const resolved = await resolveResumedArmEvidence({
    counterfactualPackages: CANDIDATES,
    branchCaptureRequestIds: BRANCH_IDS,
    readCapture: readNothing,
    dispatchOutcomesByEndpoint: { "endpoint:terra": TERMINATED },
  });

  // Every arm failed this way, which is exactly the case that used to be "permanent".
  expect(unresolvedArmsArePermanent(resolved.unreadable)).toBe(false);
});

test("a genuinely absent capture on a completed dispatch is still permanent eviction", async () => {
  const resolved = await resolveResumedArmEvidence({
    counterfactualPackages: CANDIDATES,
    branchCaptureRequestIds: BRANCH_IDS,
    readCapture: readNothing,
    dispatchOutcomesByEndpoint: {
      "endpoint:terra": { status: "complete", reason: "replay completed" },
    },
  });

  // The arm's own dispatch says the capture was written, so its absence really is an eviction.
  expect(resolved.unreadable[0]?.reason).toBe("capture_missing");
  expect(unresolvedArmsArePermanent(resolved.unreadable)).toBe(true);
});

test("with no dispatch record the previous behaviour is unchanged", async () => {
  const resolved = await resolveResumedArmEvidence({
    counterfactualPackages: CANDIDATES,
    branchCaptureRequestIds: BRANCH_IDS,
    readCapture: readNothing,
  });

  expect(resolved.unreadable[0]?.reason).toBe("capture_missing");
  expect(unresolvedArmsArePermanent(resolved.unreadable)).toBe(true);
});
