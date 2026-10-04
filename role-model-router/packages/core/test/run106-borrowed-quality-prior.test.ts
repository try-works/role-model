import { describe, expect, it } from "vitest";
import { resolveBorrowedQualityPrior } from "../src/router.js";

describe("run106 borrowed quality prior", () => {
  it("borrows a discounted related-effort score", () => {
    const prior = resolveBorrowedQualityPrior({ relatedEffortScore: 0.958, discountFactor: 0.7 });
    expect(prior).not.toBeNull();
    expect(prior?.source).toBe("borrowed");
    expect(prior?.value).toBeCloseTo(0.6706, 4);
  });
  it("clamps the discounted prior to the unit interval", () => {
    expect(resolveBorrowedQualityPrior({ relatedEffortScore: 1.5, discountFactor: 0.9 })?.value).toBe(1);
  });
  it("returns null when no related-effort score is available", () => {
    expect(resolveBorrowedQualityPrior({})).toBeNull();
  });
  it("defaults the discount factor to 0.7", () => {
    expect(resolveBorrowedQualityPrior({ relatedEffortScore: 0.5 })?.value).toBeCloseTo(0.35, 4);
  });
});
