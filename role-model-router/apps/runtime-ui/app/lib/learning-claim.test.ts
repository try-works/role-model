import { describe, expect, test } from "vitest";

import { formatLearningClaim } from "./learning-claim";

describe("formatLearningClaim", () => {
  /**
   * Run 101 addendum 50 `A50-R4` (operator-reported): "you shouldn't leak the full endpoint names and evidence file
   * name into the ui, is too long and not legible for users". The snippet is the recorded claim exactly as the
   * Packs page rendered it.
   */
  test("run101 a50: a recorded claim is shortened for display without being rewritten", () => {
    const recorded =
      "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-max outperformed " +
      "openai.personal.openai-codex-subscription.global.gpt-5.6-luna for " +
      "decision-req-4180d3df-48f5-4d8e-8385-2350ed320f72:holdout on run96-semantic-criteria@3+16364bdcbc6f " +
      "by 1.00 (holdout artifact:20b3376d0dd0f6b4be0c4b0a9a2ad8f0c9f6a1b2c3d4e5f60718293a4b5c6d7e)";
    const shown = formatLearningClaim(recorded);
    expect(shown).toBe(
      "deepseek-v4-pro-max outperformed gpt-5.6-luna for decision 4180d3df… on " +
        "run96-semantic-criteria@3 by 1.00 (holdout)",
    );
    // No dotted endpoint path and no raw digest survives, which is the point of the item.
    expect(shown).not.toMatch(/[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+/i);
    expect(shown).not.toMatch(/artifact:/i);
    // The recorded text itself is untouched: the formatter is a display transform, not an edit.
    expect(recorded).toContain("deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-max");
    // A claim that is already short passes through, and an absent claim stays null.
    expect(formatLearningClaim("coder.review improved by 0.06")).toBe(
      "coder.review improved by 0.06",
    );
    expect(formatLearningClaim(null)).toBeNull();

    /**
     * Two claims recorded on the live stage store, verbatim. The store bounds a claim to 256 characters, so both
     * of these end mid-token: `A` is cut inside the holdout group and `B` inside the scorer build hash. The
     * formatter has to make both legible without pretending the recorded text said less than it did.
     */
    const recordedTruncated =
      "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-max outperformed " +
      "openai.personal.openai-codex-subscription.global.gpt-5.6-luna for " +
      "decision-req-4180d3df-48f5-4d8e-8385-2350ed320f72:holdout on run96-semantic-criteria@3+16364bdcbc6f " +
      "by 1.00 (holdou";
    expect(recordedTruncated).toHaveLength(256);
    expect(formatLearningClaim(recordedTruncated)).toBe(
      "deepseek-v4-pro-max outperformed gpt-5.6-luna for decision 4180d3df… on " +
        "run96-semantic-criteria@3 by 1.00",
    );

    const recordedLongDecision =
      "openai.personal.openai-codex-subscription.global.gpt-5.5 outperformed " +
      "openai.personal.openai-codex-subscription.global.gpt-5.6-luna for " +
      "decision-replay-req-1e9d20ff-9619-4f65-9bd7-78beb9d957db-e83d4f6e7778c008:holdout on " +
      "run96-semantic-criteria@3+f0f873dd6";
    expect(recordedLongDecision).toHaveLength(256);
    expect(formatLearningClaim(recordedLongDecision)).toBe(
      "gpt-5.5 outperformed gpt-5.6-luna for decision 1e9d20ff… on run96-semantic-criteria@3",
    );
  });
});
