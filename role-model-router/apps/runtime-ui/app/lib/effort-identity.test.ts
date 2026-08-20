import { describe, expect, test } from "vitest";

import type { RuntimeEndpoint, RuntimeModelRecord } from "./runtime-api";
import { buildSidebarModels } from "./sidebar-footer";
import {
  buildConfiguredModelCards,
  formatCompactEndpointDisplayName,
  formatEndpointDisplayName,
  formatEndpointDisplayPath,
} from "./view-models";

function endpoint(
  endpointId: string,
  modelId: string,
  reasoningEffort: string | null,
): RuntimeEndpoint {
  return {
    endpointId,
    modelId,
    providerId: "deepseek",
    providerAccountId: "deepseek.personal",
    sourceType: "remote",
    status: "active",
    healthStatus: "healthy",
    routingEligible: true,
    benchmarkEligible: true,
    reasoningEffort,
  } as RuntimeEndpoint;
}

function model(id: string): RuntimeModelRecord {
  return {
    id,
    owned_by: "deepseek",
    endpoint_ids: ["deepseek-v4-pro:default", "deepseek-v4-pro:medium"],
  };
}

describe("reasoning-effort endpoint identity", () => {
  test("formats effort labels without collapsing null or future provider tokens", () => {
    expect(formatEndpointDisplayName({ base: "DeepSeek V4 Pro", reasoningEffort: "medium" })).toBe(
      "DeepSeek V4 Pro (Medium)",
    );
    expect(formatEndpointDisplayName({ base: "DeepSeek V4 Pro", reasoningEffort: null })).toBe(
      "DeepSeek V4 Pro",
    );
    expect(formatEndpointDisplayName({ base: "DeepSeek V4 Pro", reasoningEffort: "turbo" })).toBe(
      "DeepSeek V4 Pro (Turbo)",
    );
  });

  test("keeps the effort suffix when compact labels are constrained", () => {
    const label = formatCompactEndpointDisplayName({
      base: "deepseek/deepseek-v4-pro",
      reasoningEffort: "medium",
      maxLength: 26,
    });
    expect(label.endsWith(" (Medium)")).toBe(true);
    expect(label.length).toBeLessThanOrEqual(26);
  });

  test("formats an operator path from explicit effort without exposing the encoded identity", () => {
    expect(
      formatEndpointDisplayPath({
        endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-flash~effort-v1~aGlnaA",
        reasoningEffort: "high",
      }),
    ).toBe("deepseek.personal.deepseek-api-key.global.deepseek-v4-flash-high");
    expect(
      formatEndpointDisplayPath({
        endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-flash~effort-v1~bWF4",
        reasoningEffort: "max",
      }),
    ).toBe("deepseek.personal.deepseek-api-key.global.deepseek-v4-flash-max");
    expect(
      formatEndpointDisplayPath({
        endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-flash-max",
        reasoningEffort: "max",
      }),
    ).toBe("deepseek.personal.deepseek-api-key.global.deepseek-v4-flash-max");
  });

  test("keeps provider-default and contradictory canonical ids unchanged", () => {
    expect(
      formatEndpointDisplayPath({
        endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-flash",
        reasoningEffort: null,
      }),
    ).toBe("deepseek.personal.deepseek-api-key.global.deepseek-v4-flash");
    expect(
      formatEndpointDisplayPath({
        endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-flash~effort-v1~bWF4",
        reasoningEffort: "high",
      }),
    ).toBe("deepseek.personal.deepseek-api-key.global.deepseek-v4-flash~effort-v1~bWF4");
  });

  test("builds one configured card per effort endpoint instance", () => {
    const cards = buildConfiguredModelCards({
      models: [model("deepseek/deepseek-v4-pro")],
      endpoints: [
        endpoint("deepseek-v4-pro:default", "deepseek/deepseek-v4-pro", null),
        endpoint("deepseek-v4-pro:medium", "deepseek/deepseek-v4-pro", "medium"),
      ],
      accounts: [],
    });

    expect(cards).toHaveLength(2);
    expect(cards.map((card) => card.endpointId)).toEqual([
      "deepseek-v4-pro:default",
      "deepseek-v4-pro:medium",
    ]);
    expect(new Set(cards.map((card) => card.identityKey)).size).toBe(2);
    expect(cards.map((card) => card.displayName)).toContain("Deepseek V4 Pro (Medium)");
  });

  test("keeps effort siblings separate in the sidebar inventory", () => {
    const defaultEndpoint = endpoint("deepseek-v4-pro:default", "deepseek/deepseek-v4-pro", null);
    const mediumEndpoint = endpoint("deepseek-v4-pro:medium", "deepseek/deepseek-v4-pro", "medium");
    const rows = buildSidebarModels({
      models: [model("deepseek/deepseek-v4-pro")],
      endpoints: [defaultEndpoint, mediumEndpoint],
      telemetryRows: [
        {
          endpointId: defaultEndpoint.endpointId,
          modelId: defaultEndpoint.modelId,
          sourceType: "remote",
          requestCount: 2,
          successCount: 2,
          failureCount: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalTokens: 0,
          cachedRequestCount: 0,
          totalActualCostUsd: 0,
          totalEstimatedCostUsd: 0,
          averageLatencyMs: null,
          p95LatencyMs: null,
          lastSeenAtMs: null,
        },
        {
          endpointId: mediumEndpoint.endpointId,
          modelId: mediumEndpoint.modelId,
          sourceType: "remote",
          requestCount: 5,
          successCount: 5,
          failureCount: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalTokens: 0,
          cachedRequestCount: 0,
          totalActualCostUsd: 0,
          totalEstimatedCostUsd: 0,
          averageLatencyMs: null,
          p95LatencyMs: null,
          lastSeenAtMs: null,
        },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toContain("(Medium)");
    expect(rows[0]?.requestCount).toBe(5);
    expect(rows[1]?.requestCount).toBe(2);
  });
});
