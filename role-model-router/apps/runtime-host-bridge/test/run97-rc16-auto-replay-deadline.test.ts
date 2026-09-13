import { describe, expect, it } from "vitest";

import {
  AUTO_REPLAY_DEADLINE_MAX_MS,
  AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS,
  resolveAutoReplayDeadlineMs,
} from "../src/track-b-auto-replay.js";

/**
 * Run 97 RC16 (W3): the automatic counterfactual dispatches are serialized, so the
 * budget deadline scales with the candidate count. Live stage evidence: a flat 120 s
 * deadline expired jobs whose three provider calls had all completed, discarding paid
 * work before the branch append and evaluation handoff.
 */
describe("run97 rc16 automatic replay deadline", () => {
  it("scales with the candidate count", () => {
    expect(resolveAutoReplayDeadlineMs(1)).toBe(AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS);
    expect(resolveAutoReplayDeadlineMs(2)).toBe(2 * AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS);
    expect(resolveAutoReplayDeadlineMs(3)).toBe(3 * AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS);
  });

  it("stays inside the documented cap", () => {
    expect(resolveAutoReplayDeadlineMs(6)).toBe(AUTO_REPLAY_DEADLINE_MAX_MS);
    expect(resolveAutoReplayDeadlineMs(64)).toBe(AUTO_REPLAY_DEADLINE_MAX_MS);
    expect(AUTO_REPLAY_DEADLINE_MAX_MS).toBeGreaterThan(3 * AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS);
  });

  it("fails closed without a positive candidate count", () => {
    expect(() => resolveAutoReplayDeadlineMs(0)).toThrow(/positive candidate count/);
    expect(() => resolveAutoReplayDeadlineMs(-1)).toThrow(/positive candidate count/);
    expect(() => resolveAutoReplayDeadlineMs(1.5)).toThrow(/positive candidate count/);
  });
});
