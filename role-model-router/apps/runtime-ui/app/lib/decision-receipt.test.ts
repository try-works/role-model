import { describe, expect, test } from "vitest";

import {
  formatDecisionStrategyLabel,
  readAliasPostureReceipt,
  readLatencyReceipt,
  readStrategyReceipt,
} from "./decision-receipt";

describe("run 103 decision receipts", () => {
  test("reads the strategy receipt the decision recorded", () => {
    const receipt = readStrategyReceipt({
      strategyResolution: {
        strategy: "quality",
        source: "difficulty",
        weightsDigest: "sha256:abc",
        discarded: { source: "controller", strategy: "cost" },
      },
    });
    expect(receipt).toEqual({
      strategy: "quality",
      strategyLabel: "Quality",
      source: "difficulty",
      sourceLabel: "difficulty classification",
      weightsDigest: "sha256:abc",
      discarded: { source: "controller", strategy: "cost" },
      discardedLabel: "controller wanted Cost",
    });
    expect(readStrategyReceipt(undefined)).toBeNull();
    expect(readStrategyReceipt({ strategyResolution: { strategy: "nope" } })).toBeNull();
  });

  test("reads the latency-override outcome and its candidates", () => {
    const receipt = readLatencyReceipt({
      latencySelection: {
        outcome: "selected_faster_candidate",
        chosenEndpointId: "endpoint-b",
        bucketUpperBoundTokens: 50000,
        candidates: [
          { endpointId: "endpoint-a", p50LatencyMs: 900, p95LatencyMs: 2000, effectiveLatencyMs: 1175, sampleCount: 12 },
          { endpointId: "endpoint-b", p50LatencyMs: 500, p95LatencyMs: 900, effectiveLatencyMs: 600, sampleCount: 9 },
        ],
        reason: "endpoint-b is 575 ms faster in the 50000-token bucket",
      },
    });
    expect(receipt?.outcome).toBe("selected_faster_candidate");
    expect(receipt?.outcomeLabel).toBe("selected a faster candidate");
    expect(receipt?.acted).toBe(true);
    expect(receipt?.candidateCount).toBe(2);
    expect(receipt?.bucketLabel).toBe("≤ 50000 tokens");
    expect(receipt?.reason).toContain("575 ms faster");
    expect(
      readLatencyReceipt({ latencySelection: { outcome: "disabled", chosenEndpointId: "a", candidates: [], reason: "not authorized" } })?.acted,
    ).toBe(false);
    expect(readLatencyReceipt({})).toBeNull();
  });

  test("reads the alias posture binding the decision inherited", () => {
    const receipt = readAliasPostureReceipt({
      aliasPostureBinding: {
        aliasId: "coder.remote-only",
        name: "coder",
        kind: "role",
        declaredRoleId: "researcher",
        presetRoleId: "coder",
        roleId: "researcher",
        roleSource: "declared",
        requiredCapabilities: ["code.python"],
        preferLocal: false,
        scoringStrategy: "quality",
      },
    });
    expect(receipt?.aliasId).toBe("coder.remote-only");
    expect(receipt?.roleLabel).toBe("researcher (declared) over preset coder");
    expect(receipt?.capabilityLabel).toBe("code.python");
    expect(readAliasPostureReceipt({})).toBeNull();
  });

  test("never renders the raw config string as the applied strategy", () => {
    expect(formatDecisionStrategyLabel("quality")).toBe("Quality");
    expect(formatDecisionStrategyLabel("high-quality")).toBe("Quality");
    expect(formatDecisionStrategyLabel("org.routing.v2")).toBe("unrecognized strategy");
    expect(formatDecisionStrategyLabel(null)).toBe("no strategy label");
  });
});
