import { describe, expect, it } from "vitest";

import { isHealthyEndpoint } from "../src/benchmark-runner.js";

describe("benchmark-runner endpoint health classification (R3/R4)", () => {
  it("treats healthy as benchmark-eligible", () => {
    expect(isHealthyEndpoint("healthy")).toBe(true);
  });

  it("treats degraded as not benchmark-eligible", () => {
    expect(isHealthyEndpoint("degraded")).toBe(false);
  });

  it("treats provider-unavailable as not benchmark-eligible", () => {
    expect(isHealthyEndpoint("provider-unavailable")).toBe(false);
  });

  it("treats policy-blocked as not benchmark-eligible", () => {
    expect(isHealthyEndpoint("policy-blocked")).toBe(false);
  });

  it("treats offline as not benchmark-eligible", () => {
    expect(isHealthyEndpoint("offline")).toBe(false);
  });

  it("treats unknown as not benchmark-eligible", () => {
    expect(isHealthyEndpoint("unknown")).toBe(false);
  });
});
