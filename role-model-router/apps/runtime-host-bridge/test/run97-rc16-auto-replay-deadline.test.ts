import { describe, expect, it } from "vitest";

import {
  AUTO_REPLAY_DEADLINE_MAX_MS,
  AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS,
  AUTO_REPLAY_DEADLINE_SIZE_STEP_BYTES,
  AUTO_REPLAY_DEADLINE_SIZE_STEP_MS,
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
    // Run 99 R33 raised the cap so multi-megabyte coding-agent prompts are not expired mid-dispatch,
    // so the cap is reached by a larger candidate count (and by any oversized capture).
    expect(resolveAutoReplayDeadlineMs(16)).toBe(AUTO_REPLAY_DEADLINE_MAX_MS);
    expect(resolveAutoReplayDeadlineMs(64)).toBe(AUTO_REPLAY_DEADLINE_MAX_MS);
    expect(resolveAutoReplayDeadlineMs(6)).toBeLessThanOrEqual(AUTO_REPLAY_DEADLINE_MAX_MS);
    expect(AUTO_REPLAY_DEADLINE_MAX_MS).toBeGreaterThan(3 * AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS);
  });

  it("fails closed without a positive candidate count", () => {
    expect(() => resolveAutoReplayDeadlineMs(0)).toThrow(/positive candidate count/);
    expect(() => resolveAutoReplayDeadlineMs(-1)).toThrow(/positive candidate count/);
    expect(() => resolveAutoReplayDeadlineMs(1.5)).toThrow(/positive candidate count/);
  });

  /**
   * Run 99 R33 live finding (stage v143): real coding-agent requests arrive with multi-megabyte
   * prompts. The oversized-capture fix admitted them, and then the *replay* expired on the flat
   * 120 s-per-candidate deadline — `durable replay job timed_out` — after the provider call alone
   * took 74–164 s for a 2.5 MiB prompt. The deadline now scales with the capture size as well,
   * still inside a documented cap.
   */
  it("scales with the capture size so large prompts are not expired mid-dispatch", () => {
    const small = resolveAutoReplayDeadlineMs(1, { captureBytes: 64 * 1024 });
    const large = resolveAutoReplayDeadlineMs(1, { captureBytes: 3 * 1024 * 1024 });

    expect(small).toBe(AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS);
    expect(large).toBe(
      AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS + 3 * AUTO_REPLAY_DEADLINE_SIZE_STEP_MS,
    );
    expect(large).toBeGreaterThan(small);
    expect(resolveAutoReplayDeadlineMs(1, { captureBytes: Number.MAX_SAFE_INTEGER })).toBe(
      AUTO_REPLAY_DEADLINE_MAX_MS,
    );
    expect(AUTO_REPLAY_DEADLINE_SIZE_STEP_BYTES).toBe(1024 * 1024);
  });
});
