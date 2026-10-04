import { describe, expect, test } from "vitest";

import { resolveExecutionTarget } from "../src/index.js";

const provenance = {
  vendor: "models.dev",
  commit: "test-catalog",
  capturedAt: "2026-05-05T00:00:00Z",
  schemaVersion: "1",
};

const baseEndpointId = "deepseek.personal.global.deepseek-v4-pro";
const expandedEndpointId = baseEndpointId + "-max";
const modelId = "deepseek/deepseek-v4-pro";
const providerAccountId = "deepseek.personal";

const catalog = {
  catalogVersion: "1",
  source: provenance,
  providers: [
    {
      providerId: "deepseek",
      displayName: "DeepSeek",
      npmPackage: "@role-model-router/provider-deepseek",
      providerKind: "provider-openai",
      authFamily: "api-key",
      adapterFamily: "ai-sdk-openai-compatible",
      apiBase: "https://api.deepseek.com/v1",
      docsUrl: null,
      envVars: ["DEEPSEEK_API_KEY"],
      supportedAuthModes: ["api-key-static"],
      controlPlaneRequirements: [],
      localOverrideApplied: false,
      upstreamProvenance: provenance,
    },
  ],
  models: [
    {
      modelId,
      providerId: "deepseek",
      providerKind: "provider-openai",
      authFamily: "api-key",
      displayName: "DeepSeek V4 Pro",
      version: "1",
      capabilities: ["text.chat", "reasoning"],
      modalities: ["text"],
      contextWindow: 262_144,
      maxOutputTokens: 8192,
      pricing: null,
      requestShapeHints: null,
      experimentalModes: [],
      reasoningEffortLevels: ["medium", "max"],
      reasoningOptionKinds: ["effort"],
      extendsProvenance: { baseModelId: null, chain: [] },
      localOverrideApplied: false,
      localNotes: [],
      upstreamProvenance: provenance,
    },
  ],
};

const account = {
  providerAccountId,
  providerId: "deepseek",
  providerKind: "provider-openai",
  orgScope: "personal",
  accountScope: "default",
  credentialRef: { backend: "env", ref: "DEEPSEEK_API_KEY" },
  authMode: "api-key-static",
  regionPolicy: { mode: "prefer", regions: ["global"] },
  baseUrlOverride: null,
  allowedModels: [modelId],
  deniedModels: [],
  entitlementTags: ["chat"],
  budgetPolicyRef: "budget.default",
  quotaPolicyRef: "quota.default",
  status: "active",
  healthStatus: "healthy",
  rotationState: "stable",
};

const registry = {
  endpoints: [
    {
      identity: {
        endpoint_id: expandedEndpointId,
        endpoint_kind: "remote_api",
        provider_kind: "remote_openai_compat",
        serving_source: "remote-service",
        model_id: modelId,
        runtime_version: "1",
        region: "global",
        reasoning_effort: "max",
      },
      declared: {
        endpoint_id: expandedEndpointId,
        capabilities: ["text.chat"],
        modalities: ["text"],
        max_context_tokens: 262_144,
        tool_calling: { supported: false, style: "openai" },
        supports_embeddings: false,
      },
      status: "active",
    },
  ],
  diagnostics: [],
  lifecycleSummary: { active: 1, degraded: 0, offline: 0 },
};

const registrySources = {
  cloud: [
    {
      endpointId: baseEndpointId,
      providerAccountId,
      modelId,
      region: "global",
      endpointKind: "remote-openai-compatible",
      servingSource: "remote-service",
      lifecycleState: "active",
      healthStatus: "healthy",
      reasoningEffort: null,
      requestShapeHints: null,
    },
  ],
  local: [],
};

describe("run106 arm execution mapping (H-1)", () => {
  test("resolves an expanded per-level arm back to its provider-default base source", () => {
    const target = resolveExecutionTarget({
      routeResult: {
        decision: { chosen_endpoint_id: expandedEndpointId },
      } as never,
      catalog: catalog as never,
      accounts: [account] as never,
      registry: registry as never,
      registrySources: registrySources as never,
    });

    expect(target.endpointId).toBe(expandedEndpointId);
    expect(target.modelId).toBe(modelId);
    expect(target.providerAccountId).toBe(providerAccountId);
    expect(target.adapterFamily).toBe("ai-sdk-openai-compatible");
    expect(target.candidate.identity.reasoning_effort).toBe("max");
  });
});
