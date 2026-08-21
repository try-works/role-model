import { describe, expect, test } from "vitest";

import { formatScore, formatScoreFraction, formatScoreWithCoverage } from "./format-score";

describe("format-score", () => {
  test("shows one decimal place so near-tie scores differ", () => {
    expect(formatScore(0.525)).toBe("52.5%");
    expect(formatScore(0.5275)).toBe("52.8%");
    expect(formatScore(0.525)).not.toBe(formatScore(0.5275));
  });

  test("formats integer percentages without trailing decimal", () => {
    expect(formatScore(0.5)).toBe("50%");
    expect(formatScore(1)).toBe("100%");
  });

  test("formats earned/total fraction", () => {
    expect(formatScoreFraction(0.5275, 12)).toBe("6.33/12 (52.8%)");
    expect(formatScoreFraction(0.525, 12)).toBe("6.3/12 (52.5%)");
  });

  test("uses n/a for absent coverage and reserves zero percent for tested zero-credit evidence", () => {
    expect(formatScoreWithCoverage(0, 0)).toBe("n/a");
    expect(formatScoreWithCoverage(0, 2)).toBe("0%");
    expect(formatScoreWithCoverage(0.4, 2)).toBe("40%");
  });

  test("rejects values outside the normalized 0-to-1 score contract", () => {
    expect(formatScore(-0.01)).toBe("n/a");
    expect(formatScore(1.01)).toBe("n/a");
  });
});
