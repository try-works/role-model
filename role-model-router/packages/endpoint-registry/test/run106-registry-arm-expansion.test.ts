import { describe, expect, it } from "vitest";

import { buildEndpointRegistry } from "../src/index.js";

const providerAccountId = "openai.effort";
const region = "us-east-1";
const modelId = "openai/gpt-4.1-mini-fast-effort";
const baseEndpointId = "openai.effort.us-east-1";

const provenance = {
  vendor: "models.dev",
  commit: "test-catalog",
  capturedAt: "2026-05-05T00:00:00Z",
  schemaVersion: "1",
};

const executableOpenAIProvider = {
  providerId: "openai",
  displayName: "OpenAI",
  npmPackage: "@role-model-router/provider-openai",
  providerKind: "provider-openai",
  authFamily: "api-key",
  adapterFamily: "ai-sdk-openai-compatible",
  apiBase: "https://api.openai.test",
  docsUrl: null,
  envVars: ["OPENAI_API_KEY"],
  supportedAuthModes: ["api-key-static"],
  controlPlaneRequirements: [],
  localOverrideApplied: false,
  upstreamProvenance: provenance,
};

function buildModel(capabilities: string[]) {
  return {
    modelId,
    providerId: "openai",
    providerKind: "provider-openai",
    authFamily: "api-key",
    displayName: "GPT-4.1 Mini Fast Effort",
    version: "1",
    capabilities,
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
    upstreamProvenance: provenance,
  };
}

function buildCatalog({
  capabilities = ["code.edit", "tools.function_calling"],
  providers = [] as unknown[],
} = {}) {
  return {
    catalogVersion: "1",
    source: provenance,
    providers,
    models: [buildModel(capabilities)],
  };
}

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
};

function buildSources(overrides: Record<string, unknown> = {}) {
  return {
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
        ...overrides,
      },
    ],
    local: [],
  };
}

describe("run106 registry arm assembly", () => {
  it("fixed-effort source yields a single fixed arm carrying its level in identity", () => {
    const result = buildEndpointRegistry({
      catalog: buildCatalog(),
      accounts: [account],
      sources: buildSources({ endpointId: `${baseEndpointId}-high`, reasoningEffort: "high" }),
    });

    expect(result.endpoints).toHaveLength(1);
    expect(result.endpoints[0].identity.endpoint_id).toBe(`${baseEndpointId}-high`);
    expect(result.endpoints[0].identity.reasoning_effort).toBe("high");
    expect(result.endpoints[0].declared.reasoning_effort_levels).toBeUndefined();
  });

  it("provider-default source without reasoning capability keeps a single provider-default arm", () => {
    const result = buildEndpointRegistry({
      catalog: buildCatalog(),
      accounts: [account],
      sources: buildSources(),
    });

    // No "reasoning" capability => no adapter-executable levels => no expansion.
    expect(result.endpoints).toHaveLength(1);
    expect(result.endpoints[0].identity.endpoint_id).toBe(baseEndpointId);
    expect(result.endpoints[0].identity.reasoning_effort).toBeUndefined();
    expect(result.endpoints[0].declared.reasoning_effort_levels).toEqual(["low", "high"]);
  });

  it("provider-default source with an executable adapter expands declared levels into fixed arms plus a provider-default arm", () => {
    const result = buildEndpointRegistry({
      catalog: buildCatalog({
        capabilities: ["code.edit", "tools.function_calling", "reasoning"],
        providers: [executableOpenAIProvider],
      }),
      accounts: [account],
      sources: buildSources(),
    });

    expect(result.endpoints.map((endpoint) => endpoint.identity.endpoint_id)).toEqual([
      baseEndpointId,
      `${baseEndpointId}-low`,
      `${baseEndpointId}-high`,
    ]);
    expect(result.endpoints[0].identity.reasoning_effort).toBeUndefined();
    expect(result.endpoints[0].declared.reasoning_effort_levels).toEqual(["low", "high"]);
    expect(result.endpoints[1].identity.reasoning_effort).toBe("low");
    expect(result.endpoints[1].declared.reasoning_effort_levels).toBeUndefined();
    expect(result.endpoints[2].identity.reasoning_effort).toBe("high");
    expect(result.endpoints[2].declared.reasoning_effort_levels).toBeUndefined();
  });

  it("provider-default source with declared levels but no executable adapter keeps a single provider-default arm", () => {
    // Catalog declares levels, the model can reason, but there is no adapter
    // execution mapping (empty providers) => expansion is gated off.
    const result = buildEndpointRegistry({
      catalog: buildCatalog({
        capabilities: ["code.edit", "tools.function_calling", "reasoning"],
      }),
      accounts: [account],
      sources: buildSources(),
    });

    expect(result.endpoints).toHaveLength(1);
    expect(result.endpoints[0].identity.endpoint_id).toBe(baseEndpointId);
    expect(result.endpoints[0].identity.reasoning_effort).toBeUndefined();
    expect(result.endpoints[0].declared.reasoning_effort_levels).toEqual(["low", "high"]);
  });
});
