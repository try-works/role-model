import { describe, expect, it } from "vitest";

import { buildEndpointRegistry } from "../src/index.js";

const providerAccountId = "openai.effort";
const region = "us-east-1";
const modelId = "openai/gpt-4.1-mini-fast-effort";
const baseEndpointId = "openai.effort.us-east-1";

const catalog = {
  catalogVersion: "1",
  source: {
    vendor: "models.dev",
    commit: "test-catalog",
    capturedAt: "2026-05-05T00:00:00Z",
    schemaVersion: "1",
  },
  providers: [],
  models: [
    {
      modelId,
      providerId: "openai",
      providerKind: "provider-openai",
      authFamily: "api-key",
      displayName: "GPT-4.1 Mini Fast Effort",
      version: "1",
      capabilities: ["code.edit", "tools.function_calling"],
      modalities: ["text"],
      contextWindow: 32768,
      maxOutputTokens: 4096,
      pricing: null,
      requestShapeHints: {
        providerShape: "openai",
        bodyKeys: ["messages"],
        headerKeys: ["authorization"],
      },
      experimentalModes: [],
      reasoningEffortLevels: ["low", "high"],
      reasoningOptionKinds: ["effort"],
      extendsProvenance: { baseModelId: null, chain: [] },
      localOverrideApplied: false,
      localNotes: [],
      upstreamProvenance: {
        vendor: "models.dev",
        commit: "test-catalog",
        capturedAt: "2026-05-05T00:00:00Z",
        schemaVersion: "1",
      },
    },
  ],
} as const;

const account = {
  providerAccountId,
  providerId: "openai",
  providerKind: "provider-openai",
  orgScope: "personal",
  accountScope: "default",
  credentialRef: { backend: "env", ref: "OPENAI_API_KEY" },
  authMode: "api-key-static",
  regionPolicy: { mode: "prefer", regions: ["us-east-1"] },
  baseUrlOverride: null,
  allowedModels: [],
  deniedModels: [],
  entitlementTags: ["chat"],
  budgetPolicyRef: "budget.default",
  quotaPolicyRef: "quota.default",
  status: "active",
  healthStatus: "healthy",
  rotationState: "stable",
} as const;

const sources = {
  cloud: [
    {
      endpointId: baseEndpointId,
      providerAccountId,
      modelId,
      region,
      endpointKind: "remote-openai-compatible",
      servingSource: "remote-service",
      lifecycleState: "active",
      healthStatus: "healthy",
    },
  ],
  local: [],
} as const;

describe("run106 registry arm assembly", () => {
  it("provider-default source yields a single provider-default arm and advertises declared levels", () => {
    const result = buildEndpointRegistry({
      catalog,
      accounts: [account],
      sources,
    });

    // Run 106 R2: a catalog reasoning_effort_levels declaration alone cannot
    // make an arm routable. The provider-default endpoint is one arm; declared
    // levels stay discovery metadata on declared.reasoning_effort_levels.
    expect(result.endpoints).toHaveLength(1);
    expect(result.endpoints[0].identity.endpoint_id).toBe(baseEndpointId);
    expect(result.endpoints[0].identity.model_id).toBe(modelId);
    expect(result.endpoints[0].identity.reasoning_effort).toBeNull();
    expect(result.endpoints[0].declared.reasoning_effort_levels).toEqual(["low", "high"]);
  });

  it("fixed-effort source yields a single fixed arm carrying its level in identity", () => {
    const result = buildEndpointRegistry({
      catalog,
      accounts: [account],
      sources: {
        cloud: [
          {
            endpointId: `${baseEndpointId}-high`,
            providerAccountId,
            modelId,
            region,
            endpointKind: "remote-openai-compatible",
            servingSource: "remote-service",
            lifecycleState: "active",
            healthStatus: "healthy",
            reasoningEffort: "high",
          },
        ],
        local: [],
      },
    });

    expect(result.endpoints).toHaveLength(1);
    expect(result.endpoints[0].identity.endpoint_id).toBe(`${baseEndpointId}-high`);
    expect(result.endpoints[0].identity.reasoning_effort).toBe("high");
    expect(result.endpoints[0].declared.reasoning_effort_levels).toBeUndefined();
  });
});
