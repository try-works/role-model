import { describe, expect, test } from "vitest";

import { classifyDifficultyFromSignals } from "../src/index";

/**
 * Run 98 addendum 32 S3 (external audit §6): the difficulty rubric saturated, so the bucket stopped
 * selecting. `contextTokens >= 2000` (+3), `toolCount >= 2` (+3) and `historyTurnCount >= 4` (+2) are
 * all trivially true for any real agent session, so an 8-point "hard" was the default and a 562K-token
 * tool-heavy session landed in the same bucket as a 2K-token one. The observed distribution is wide
 * (`contextTokens` p50 = 130, p95 = 450,732 on the live store), so the context contribution is graded
 * across the observed range instead of saturating at 2,000 tokens.
 */

const signals = (overrides: Partial<Record<string, number | boolean>> = {}) => ({
  contextTokens: 130,
  toolCount: 0,
  historyTurnCount: 1,
  instructionConstraintCount: 0,
  decompositionKeywordCount: 0,
  codeOrSchemaBurden: false,
  ...overrides,
});

describe("run98 A32 S3 difficulty rubric spreads across the observed range", () => {
  test("a one-line chat turn stays easy", () => {
    expect(classifyDifficultyFromSignals({ signals: signals() }).difficulty).toBe("easy");
  });

  test("a modest agent session is no longer forced into 'hard'", () => {
    // 2,000 tokens, two tools, four turns used to score 8 (hard) with no other signal at all.
    expect(
      classifyDifficultyFromSignals({
        signals: signals({ contextTokens: 2_000, toolCount: 2, historyTurnCount: 4 }),
      }).difficulty,
    ).toBe("medium");
  });

  test("a genuinely large agent session is still hard", () => {
    // The external audit's own sample: 562,507 context tokens, tool-heavy.
    expect(
      classifyDifficultyFromSignals({
        signals: signals({
          contextTokens: 562_507,
          toolCount: 4,
          historyTurnCount: 12,
          instructionConstraintCount: 6,
        }),
      }).difficulty,
    ).toBe("hard");
  });

  test("the fixtures span all three buckets instead of collapsing on 'hard'", () => {
    const buckets = [
      signals(),
      signals({ contextTokens: 800 }),
      signals({ contextTokens: 2_000, toolCount: 1, historyTurnCount: 2 }),
      signals({ contextTokens: 12_000, toolCount: 2, historyTurnCount: 6 }),
      signals({ contextTokens: 60_000, toolCount: 5, historyTurnCount: 16 }),
      signals({ contextTokens: 562_507, toolCount: 6, historyTurnCount: 24, codeOrSchemaBurden: true }),
    ].map((value) => classifyDifficultyFromSignals({ signals: value }).difficulty);
    expect(new Set(buckets)).toEqual(new Set(["easy", "medium", "hard"]));
  });

  test("a tool-using schema task is still hard by the code-burden rule", () => {
    expect(
      classifyDifficultyFromSignals({
        signals: signals({ contextTokens: 300, toolCount: 1, codeOrSchemaBurden: true }),
      }).difficulty,
    ).toBe("hard");
  });
});
