import { describe, expect, it } from "vitest";
import { normalizeReasoningEffortPolicy } from "../src/index.js";

describe("run106 effort policy normalization", () => {
  it("omitted effort normalizes to router-managed with source none", () => {
    expect(normalizeReasoningEffortPolicy(undefined, undefined)).toEqual({
      effort: undefined,
      policy: "router",
      source: "none",
    });
  });
  it("legacy scalar effort normalizes to preferred with source named", () => {
    expect(normalizeReasoningEffortPolicy("high", undefined)).toEqual({
      effort: "high",
      policy: "preferred",
      source: "named",
    });
  });
  it("explicit strict policy is authoritative", () => {
    expect(normalizeReasoningEffortPolicy("high", "strict")).toEqual({
      effort: "high",
      policy: "strict",
      source: "named",
    });
  });
  it("explicit preferred policy is authoritative", () => {
    expect(normalizeReasoningEffortPolicy("high", "preferred")).toEqual({
      effort: "high",
      policy: "preferred",
      source: "named",
    });
  });
  it("router policy preserves the requested effort for provenance", () => {
    expect(normalizeReasoningEffortPolicy("high", "router")).toEqual({
      effort: "high",
      policy: "router",
      source: "named",
    });
  });
  it("maps OpenAI's disabled-reasoning convention (none) to source disabled", () => {
    expect(normalizeReasoningEffortPolicy("none", undefined)).toEqual({
      effort: undefined,
      policy: "router",
      source: "disabled",
    });
  });
  it("maps OpenAI's disabled-reasoning convention (off) to source disabled", () => {
    expect(normalizeReasoningEffortPolicy("off", undefined)).toEqual({
      effort: undefined,
      policy: "router",
      source: "disabled",
    });
  });
  it("rejects an invalid policy", () => {
    expect(() => normalizeReasoningEffortPolicy("high", "bogus" as never)).toThrow();
  });
});
