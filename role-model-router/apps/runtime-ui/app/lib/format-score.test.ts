import { describe, expect, test } from "vitest";

import { formatScore, formatScoreFraction } from "./format-score";

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
});
