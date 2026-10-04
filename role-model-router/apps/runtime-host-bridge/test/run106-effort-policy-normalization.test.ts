import { describe, expect, it } from "vitest";
import { normalizeReasoningEffortPolicy } from "../src/index.js";

describe("run106 effort policy normalization", () => {
  it("omitted effort normalizes to router-managed", () => {
    expect(normalizeReasoningEffortPolicy(undefined, undefined)).toEqual({ effort: undefined, policy: "router" });
  });
  it("legacy scalar effort normalizes to preferred", () => {
    expect(normalizeReasoningEffortPolicy("high", undefined)).toEqual({ effort: "high", policy: "preferred" });
  });
  it("explicit strict policy is authoritative", () => {
    expect(normalizeReasoningEffortPolicy("high", "strict")).toEqual({ effort: "high", policy: "strict" });
  });
  it("explicit preferred policy is authoritative", () => {
    expect(normalizeReasoningEffortPolicy("high", "preferred")).toEqual({ effort: "high", policy: "preferred" });
  });
  it("router policy ignores the effort hint", () => {
    expect(normalizeReasoningEffortPolicy("high", "router")).toEqual({ effort: undefined, policy: "router" });
  });
  it("rejects an invalid policy", () => {
    expect(() => normalizeReasoningEffortPolicy("high", "bogus" as never)).toThrow();
  });
});
