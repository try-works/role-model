import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { runAutoReplayTick } from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

/**
 * Run 108 addendum-02 (I2, the promotion floor): the LIVE supervised-replay dispatch must plan a
 * capture's counterfactual arms under the versioned `maxCounterfactualArms` bound.
 *
 * Measured live on :3458 (2026-10-09, read-only probes):
 * - `track-b-replay-ledger.json`: 57 of 59 replay jobs carried exactly ONE candidate dispatch, and
 *   `replay-disposition.sqlite` records `branches: 1` for 57 of 59 `replayed` captures;
 * - `run108-launch-final.log`: `[run115] eligibility candidates=12 eligible=1 ... pass=replay`, i.e.
 *   one provider call per capture;
 * - `[run120] learner derivation consumed comparison:supervised-replay:<hash> (1+/1-)`: every
 *   finalized comparison is a 2-case group.
 *
 * A 2-case job is holdout-only by construction (track-b-runtime.ts:9242-9247 stamps both sides of the
 * primary pair `holdout`, and the :9265 development fallback needs a case the comparison does not
 * decide between), so `developmentComparisons` is 0, `floorMet` is false, and no promotion can fit.
 * The arm count is decided HERE, in the live tick's plan, and the plan must respect the operator's
 * bound instead of collapsing to the single focus endpoint.
 */

/** The 12 endpoint ids the live dev runtime actually serves (GET /api/role-model/endpoints). */
const LIVE_POOL = [
  "deepseek.personal.deepseek-api-key.global.deepseek-flash",
  "deepseek.personal.deepseek-api-key.global.deepseek-flash-low",
  "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
  "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
  "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro",
  "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high",
  "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-max",
  "moonshot.personal.kimi-code.global.kimi-k3",
  "moonshot.personal.kimi-code.global.kimi-k3-low",
  "moonshot.personal.kimi-code.global.kimi-k3-high",
  "moonshot.personal.kimi-code.global.kimi-k3-max",
  "openai.personal.openai-codex-subscription.global.gpt-6-luna",
] as const;

/** The live controller/judge and the live served route of the captures under test. */
const LIVE_JUDGE = "deepseek.personal.deepseek-api-key.global.deepseek-flash";
const LIVE_SOURCE = "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro";
/** A live-observed counterfactual arm and the rung the Run-105 R8 walk selected for a capture. */
const LIVE_FOCUS = "moonshot.personal.kimi-code.global.kimi-k3-max";

function tempLedger() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run108-a02-"));
  return {
    ledger: createReplayLedger({ filePath: path.join(dir, "ledger.json") }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

test("Run108 addendum-02: a live-shaped focus dispatch plans the arms under the policy bound, not the single focus endpoint", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    let planned: readonly string[] = [];
    const result = await runAutoReplayTick({
      captures: [
        {
          captureRef: "req-108-a02-focus",
          sourceEndpointId: LIVE_SOURCE,
          hasRecordedToolResults: true,
        },
      ],
      configuredEndpointIds: LIVE_POOL,
      judgeEndpointId: LIVE_JUDGE,
      // The Run-105 R8 walk names the rung it is admitting, and the tick applies it to that capture.
      focusCandidateEndpointId: LIVE_FOCUS,
      focusCaptureRef: "req-108-a02-focus",
      // The operator's versioned activation policy (raised 3 -> 4 live; it changed nothing because the
      // bound never reached this planning path).
      maxCounterfactualArms: 4,
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async ({ candidates }) => {
        planned = candidates;
        return {
          terminal: true,
          branches: candidates.map((endpointId) => ({ endpointId, outcome: "complete" as const })),
        };
      },
    });

    expect(result.replayed).toBe(1);
    // The outcome the promotion floor needs: >= 3 rollouts -> >= 3 cases -> a train/development case.
    expect(planned.length).toBeGreaterThanOrEqual(3);
    // The R8 contract survives: the rung the walk selected is still the comparison's counterfactual.
    expect(planned[0]).toBe(LIVE_FOCUS);
    // The served route and the judge are never arms of their own comparison.
    expect(planned).not.toContain(LIVE_SOURCE);
    expect(planned).not.toContain(LIVE_JUDGE);
  } finally {
    cleanup();
  }
});

test("Run108 addendum-02: the versioned arm bound is the cap on a live-shaped pool", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    /**
     * The bound as the tick receives it. `bound` is deliberately loose so the two "unusable value" cases the
     * release must survive can be exercised: a bound that is absent and a bound outside the policy's 1..8
     * range. Neither may be read as "plan nothing" - an empty plan produces no counterfactual at all.
     */
    const planFor = async (
      bound: number | null | undefined,
      label: string,
    ): Promise<readonly string[]> => {
      let planned: readonly string[] = [];
      await runAutoReplayTick({
        captures: [
          {
            captureRef: `req-108-a02-bound-${label}`,
            sourceEndpointId: LIVE_SOURCE,
            hasRecordedToolResults: true,
          },
        ],
        configuredEndpointIds: LIVE_POOL,
        judgeEndpointId: LIVE_JUDGE,
        ...(bound === undefined ? {} : { maxCounterfactualArms: bound }),
        ledger,
        policySet: buildReplayPolicySet(),
        executor: async ({ candidates }) => {
          planned = candidates;
          return {
            terminal: true,
            branches: candidates.map((endpointId) => ({
              endpointId,
              outcome: "complete" as const,
            })),
          };
        },
      });
      return planned;
    };

    // The operator's live value: 4 arms, not the release constant DEFAULT_REPLAY_CANDIDATE_CAP (3). This is
    // the assertion that fails on the pre-addendum build - raising the policy 3 -> 4 there changed the plan
    // by nothing, which is the whole reason the promotion floor stayed unreachable.
    expect((await planFor(4, "live-4")).length).toBe(4);
    // A missing bound keeps the pre-existing plan size (3), exactly as it did before this change.
    expect((await planFor(undefined, "absent")).length).toBe(3);
    expect((await planFor(null, "null")).length).toBe(3);
    expect((await planFor(0, "zero")).length).toBe(3);
    // Above the policy ceiling the plan is capped at MAX_COUNTERFACTUAL_ARMS (8) - the same 1..8 clamp the
    // post-observation arm bound already applies (track-b-runtime.ts:11972-11975).
    expect((await planFor(99, "over")).length).toBe(8);
  } finally {
    cleanup();
  }
});
