import { describe, expect, test } from "vitest";

import { formatEndpointModelLabel, readEndpointModelLeaf } from "./effort-identity";
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

  test("shows the routable model pool rather than non-routable endpoint inventory", () => {
    const routable = endpoint("deepseek-v4-flash:low", "deepseek/deepseek-v4-flash", "low");
    const vendorInventory = {
      ...endpoint("deepseek-v4-flash:litellm", "deepseek/deepseek-v4-flash", null),
      routingEligible: false,
    } as RuntimeEndpoint;

    const rows = buildSidebarModels({
      models: [model("deepseek/deepseek-v4-flash")],
      endpoints: [routable, vendorInventory],
      telemetryRows: [
        {
          endpointId: vendorInventory.endpointId,
          modelId: vendorInventory.modelId,
          sourceType: "remote",
          requestCount: 50,
          successCount: 50,
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

    expect(rows).toEqual([
      expect.objectContaining({ id: "deepseek-v4-flash (Low)", requestCount: 0 }),
    ]);
  });
});

/**
 * Run 101 addendum 49 `A49-R3` (operator-reported): the Learning tables printed the endpoint id
 * (`openai.personal.openai-codex-subscription.global.gpt-5.5`) where the operator asked for the model
 * (`gpt-5.5`). The endpoint namespace is dotted and the model id may itself contain dots, so the leaf is taken
 * after the id's own scope segment rather than at the last dot.
 */
describe("endpoint model leaf", () => {
  test("reads the model the endpoint routes with, keeping model ids that contain dots", () => {
    expect(readEndpointModelLeaf("openai.personal.openai-codex-subscription.global.gpt-5.5")).toBe(
      "gpt-5.5",
    );
    expect(
      readEndpointModelLeaf("openai.personal.openai-codex-subscription.global.gpt-5.6-sol-low"),
    ).toBe("gpt-5.6-sol-low");
    expect(
      readEndpointModelLeaf("deepseek.personal.deepseek-api-key.global.deepseek-v4-flash-max"),
    ).toBe("deepseek-v4-flash-max");
    expect(readEndpointModelLeaf("deepseek.litellm.global.deepseek-deepseek-v4-flash")).toBe(
      "deepseek-deepseek-v4-flash",
    );
    expect(readEndpointModelLeaf("moonshot.personal.primary.global.kimi-k2.5")).toBe("kimi-k2.5");
    // An id that is not a dotted endpoint path keeps its own name…
    expect(readEndpointModelLeaf("cli.local.coder")).toBe("coder");
    expect(readEndpointModelLeaf("gpt-5.5")).toBe("gpt-5.5");
    // …and an empty id stays empty rather than becoming a manufactured label.
    expect(readEndpointModelLeaf("")).toBe("");
  });

  test("labels an endpoint with its leaf model, never with a truncated endpoint path", () => {
    expect(
      formatEndpointModelLabel("openai.personal.openai-codex-subscription.global.gpt-5.6-sol-low"),
    ).toBe("gpt-5.6-sol-low");
    expect(
      formatEndpointModelLabel("deepseek.personal.deepseek-api-key.global.deepseek-v4-flash-max"),
    ).toBe("deepseek-v4-flash-max");
    // A leaf short enough for its lane is never abbreviated.
    expect(formatEndpointModelLabel("moonshot.personal.primary.global.kimi-k2.5")).toBe(
      "kimi-k2.5",
    );
  });

  test("elides a leaf too long for its lane at token boundaries, keeping the effort suffix", () => {
    const compact = formatEndpointModelLabel(
      "deepseek.personal.deepseek-api-key.global.deepseek-v4-flash-max-preview",
      14,
    );
    expect(compact.length).toBeLessThanOrEqual(14);
    expect(compact.startsWith("…")).toBe(true);
    // Whole `-`-tokens only: the text never starts mid-token and the effort token survives.
    expect(compact.includes("…-")).toBe(false);
    expect(compact.endsWith("max-preview")).toBe(true);
    // A single token with nothing to elide at a boundary stays whole rather than being cut.
    expect(formatEndpointModelLabel("verylongmodelnamewithouttoseparate", 8)).toBe(
      "verylongmodelnamewithouttoseparate",
    );
  });
});
