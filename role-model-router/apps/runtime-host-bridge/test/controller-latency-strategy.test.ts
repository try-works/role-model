import { describe, expect, test } from "vitest";

import {
  buildCompactControllerSystemPrompt,
  buildControllerSystemPrompt,
  parseAndSanitizeControllerRoutingGuidance,
} from "../src/controller-routing-contract.js";

/**
 * Run 103 / SP4 - Intelligent mode gains `latency` as a supported controller strategy so a
 * latency posture can no longer be silently replaced (design document section 6.4; requirement R4).
 */
describe("controller latency strategy", () => {
  test("accepts a latency directive", () => {
    const guidance = parseAndSanitizeControllerRoutingGuidance(
      JSON.stringify({ strategy: "latency", preferLocal: true }),
      {},
    );
    expect(guidance?.strategy).toBe("latency");
    expect(guidance?.preferLocal).toBe(true);
  });

  test("still accepts the three existing strategies", () => {
    for (const strategy of ["balanced", "cost", "quality"] as const) {
      const guidance = parseAndSanitizeControllerRoutingGuidance(JSON.stringify({ strategy }), {});
      expect(guidance?.strategy, strategy).toBe(strategy);
    }
  });

  test("the controller prompt lists latency among the allowed strategies", () => {
    expect(buildControllerSystemPrompt({})).toContain('"latency"');
    expect(buildCompactControllerSystemPrompt({})).toContain('"latency"');
  });

  test("an unknown strategy is still refused", () => {
    const guidance = parseAndSanitizeControllerRoutingGuidance(
      JSON.stringify({ strategy: "turbo" }),
      {},
    );
    expect(guidance).toBeNull();
  });
});
