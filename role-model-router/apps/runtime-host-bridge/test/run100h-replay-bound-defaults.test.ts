import { expect, test } from "vitest";

import {
  AUTO_REPLAY_DEADLINE_MAX_MS,
  AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS,
  resolveAutoReplayDeadlineMs,
  resolveAutoReplayDeadlinePerCandidateMs,
} from "../src/track-b-auto-replay.js";
import {
  DEFAULT_TRACK_B_OPERATIONS_TIMEOUT_MS,
  resolveTrackBOperationsTimeoutMs,
} from "../src/track-b-operations.js";

/**
 * Run 100 addendum `00-requirements.runtime-replay-timeout-bounds.addendum-01` (operator instruction:
 * "raise the bounds to 600 s for both. write the addendum").
 *
 * The addendum was applied to the two running stage processes through environment variables, which means
 * the *packaged* runtime still starts with the old tight defaults (30 s private-operations boundary, 120 s
 * per candidate). The operator starts the stage release by hand from the downloaded package, so the
 * decision has to live in the build: these two constants are the defaults the release ships with.
 */

test("run100h the packaged runtime defaults to the operator's 600 s replay bounds", () => {
  expect(DEFAULT_TRACK_B_OPERATIONS_TIMEOUT_MS).toBe(600_000);
  expect(AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS).toBe(600_000);

  // The environment resolvers keep their bands and still fall back to the (now 600 s) defaults.
  expect(resolveTrackBOperationsTimeoutMs({})).toBe(600_000);
  expect(resolveAutoReplayDeadlinePerCandidateMs({})).toBe(600_000);
  expect(
    resolveAutoReplayDeadlinePerCandidateMs({
      ROLE_MODEL_AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS: "300000",
    }),
  ).toBe(300_000);
  expect(
    resolveAutoReplayDeadlinePerCandidateMs({
      ROLE_MODEL_AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS: "not-a-number",
    }),
  ).toBe(600_000);
});

test("run100h the cap leaves headroom so a heavy three-candidate job is not clipped", () => {
  /**
   * The addendum recorded the cap as "the next bound to hit": with the per-candidate bound at 600 s, three
   * candidates already reach the old 1800 s ceiling, so every size step was clipped away. The cap now keeps
   * headroom above three candidates at the new bound, so a 2 MiB three-arm capture gets its size steps.
   */
  expect(AUTO_REPLAY_DEADLINE_MAX_MS).toBeGreaterThanOrEqual(
    3 * AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS,
  );
  const heavyThreeArm = resolveAutoReplayDeadlineMs(3, { captureBytes: 2 * 1024 * 1024 });
  expect(heavyThreeArm).toBe(3 * (600_000 + 2 * 60_000));
  expect(heavyThreeArm).toBeLessThanOrEqual(AUTO_REPLAY_DEADLINE_MAX_MS);
});
