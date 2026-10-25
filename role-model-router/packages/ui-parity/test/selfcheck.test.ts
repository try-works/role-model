import { describe, expect, it } from "vitest";
import { runRequestParitySelfcheck } from "../src/selfcheck.js";

describe("request parity selfcheck", () => {
  it("checks identical repeated captures and every required negative control", () => {
    expect(runRequestParitySelfcheck()).toEqual({
      status: "PASSED",
      scope: "request-comparator-only",
      checks: [
        { name: "identical-repeat", passed: true },
        { name: "independent-read-permutation", passed: true },
        { name: "changed-body", passed: true },
        { name: "extra-fetch", passed: true },
        { name: "missing-fetch", passed: true },
        { name: "changed-method", passed: true },
        { name: "write-read-causality", passed: true },
        { name: "changed-status", passed: true },
        { name: "changed-error", passed: true },
        { name: "changed-stream-terminal", passed: true },
      ],
    });
  });
  it("is deterministic and does not mutate or expose fixture request payloads", () => {
    const first = runRequestParitySelfcheck();
    const second = runRequestParitySelfcheck();
    expect(second).toEqual(first);
    expect(JSON.stringify(first)).not.toContain("fixture-body");
    expect(JSON.stringify(first)).not.toContain("Authorization");
  });
});
