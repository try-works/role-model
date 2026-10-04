import { describe, expect, test } from "vitest";

import {
  DIFFICULTY_CLASSIFIER_VERSION,
  classifyDifficultyFromSignals,
  computeDifficultyFeatures,
  shouldInvalidateDifficultyClassifierVersion,
  shouldShortcutToHard,
} from "../src/index.js";

/**
 * Run 106 R7 (F4): turn-aware difficulty repair. The pre-SP5 rubric saturated because conversation
 * burden (context tokens + history turns) accumulated linearly, so a trivial follow-up in a long
 * coding session shared the hard bucket with genuinely risky tool/code/schema work. Classification
 * now separates current-turn burden, bounded/diminishing conversation burden, operation risk,
 * required quality, and latency sensitivity; the unconditional toolCount>0 && codeOrSchemaBurden =>
 * hard saturation is replaced by a documented risk rule keyed to the *current turn*; cache
 * invalidation refuses materially stale classification; and receipts expose the decisive features
 * plus the classifier version.
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

describe("run106 R7 turn-aware difficulty repair", () => {
  test("a trivial follow-up in a long coding session classifies below hard", () => {
    // 40-turn, 300K-token session whose newest turn is a trivial follow-up with no tools/code.
    const result = classifyDifficultyFromSignals({
      signals: signals({ contextTokens: 300_000, historyTurnCount: 40 }),
    });
    expect(result.difficulty).not.toBe("hard");
  });

  test("a trivial tool-bearing follow-up (no current-turn code/schema) stays below hard", () => {
    const result = classifyDifficultyFromSignals({
      signals: signals({ contextTokens: 80_000, historyTurnCount: 30, toolCount: 3 }),
    });
    expect(result.difficulty).not.toBe("hard");
  });

  test("a fresh genuinely risky tool/code/schema task stays hard", () => {
    const result = classifyDifficultyFromSignals({
      signals: signals({ contextTokens: 300, toolCount: 1, codeOrSchemaBurden: true }),
    });
    expect(result.difficulty).toBe("hard");
    expect(result.decisiveFeatures).toContain("operationRisk");
  });

  test("a fresh hard task with strong current-turn complexity stays hard", () => {
    const result = classifyDifficultyFromSignals({
      signals: signals({
        contextTokens: 500,
        toolCount: 2,
        historyTurnCount: 1,
        instructionConstraintCount: 6,
        decompositionKeywordCount: 4,
        codeOrSchemaBurden: true,
      }),
    });
    expect(result.difficulty).toBe("hard");
  });

  test("a tool-free ask with high required quality stays hard without tools", () => {
    const result = classifyDifficultyFromSignals({
      signals: signals({
        contextTokens: 1_000,
        toolCount: 0,
        historyTurnCount: 1,
        instructionConstraintCount: 6,
        decompositionKeywordCount: 5,
        codeOrSchemaBurden: true,
      }),
    });
    expect(result.difficulty).toBe("hard");
  });

  test("a tool-free trivial ask stays easy", () => {
    const result = classifyDifficultyFromSignals({ signals: signals() });
    expect(result.difficulty).toBe("easy");
  });

  test("separates the five turn-aware feature dimensions", () => {
    const features = computeDifficultyFeatures(
      signals({
        contextTokens: 50_000,
        toolCount: 5,
        historyTurnCount: 20,
        instructionConstraintCount: 6,
        decompositionKeywordCount: 4,
        codeOrSchemaBurden: true,
      }),
    );
    expect(features).toEqual({
      currentTurnBurden: 4,
      conversationBurden: 2,
      operationRisk: 5,
      requiredQuality: 2,
      latencySensitivity: 0,
    });
  });

  test("receipts expose the classifier version", () => {
    expect(DIFFICULTY_CLASSIFIER_VERSION).toMatch(/run106/);
  });

  test("cache invalidation refuses a stale classifier version", () => {
    expect(
      shouldInvalidateDifficultyClassifierVersion("run98-a32", DIFFICULTY_CLASSIFIER_VERSION),
    ).toBe(true);
    expect(
      shouldInvalidateDifficultyClassifierVersion(
        DIFFICULTY_CLASSIFIER_VERSION,
        DIFFICULTY_CLASSIFIER_VERSION,
      ),
    ).toBe(false);
    expect(shouldInvalidateDifficultyClassifierVersion(undefined, DIFFICULTY_CLASSIFIER_VERSION)).toBe(
      true,
    );
  });

  test("shouldShortcutToHard remains the documented risk-rule predicate", () => {
    expect(
      shouldShortcutToHard({
        toolCount: 2,
        codeOrSchemaBurden: true,
        instructionConstraintCount: 1,
        decompositionKeywordCount: 1,
      }),
    ).toBe(false);
    expect(
      shouldShortcutToHard({
        toolCount: 1,
        codeOrSchemaBurden: true,
        instructionConstraintCount: 0,
        decompositionKeywordCount: 4,
      }),
    ).toBe(true);
  });
});
