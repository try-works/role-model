import { describe, expect, it } from "vitest";
import { resolveEffortPolicy } from "../src/index.js";

describe("run106 effort policy resolution", () => {
  it("router policy selects jointly (router_managed)", () => {
    expect(resolveEffortPolicy({ requestedEffort: "high", policy: "router", availableEfforts: ["high", "max"] }))
      .toEqual({ resolution: "router_managed", effectiveEffort: null });
  });
  it("strict with an exact arm resolves exact_primary", () => {
    expect(resolveEffortPolicy({ requestedEffort: "high", policy: "strict", availableEfforts: ["high", "max"] }))
      .toEqual({ resolution: "exact_primary", effectiveEffort: "high" });
  });
  it("strict with no exact arm rejects", () => {
    expect(resolveEffortPolicy({ requestedEffort: "high", policy: "strict", availableEfforts: ["low", "max"] }))
      .toEqual({ resolution: "strict_rejected", effectiveEffort: null });
  });
  it("preferred with zero exact arms falls back to router-managed", () => {
    expect(resolveEffortPolicy({ requestedEffort: "high", policy: "preferred", availableEfforts: ["low", "max"] }))
      .toEqual({ resolution: "unsupported_fallback", effectiveEffort: null });
  });
  it("no requested effort is router-managed", () => {
    expect(resolveEffortPolicy({ requestedEffort: undefined, policy: "preferred", availableEfforts: ["low"] }))
      .toEqual({ resolution: "router_managed", effectiveEffort: null });
  });
  it("strict with no requested effort is a typed refusal", () => {
    expect(resolveEffortPolicy({ requestedEffort: undefined, policy: "strict", availableEfforts: ["high"] }))
      .toEqual({ resolution: "strict_rejected", effectiveEffort: null });
  });
});
