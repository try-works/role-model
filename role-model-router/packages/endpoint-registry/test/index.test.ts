import { describe, expect, test } from "vitest";

import { buildEndpointRegistry } from "../src/index.js";

const normalizedCatalog = {
  catalogVersion: "1",
  source: {
    vendor: "models.dev",
    commit: "test-catalog",
    capturedAt: "2026-05-05T00:00:00Z",
    schemaVersion: "1",
  },
  providers: [
    {
      providerId: "openai",
      displayName: "OpenAI",
      providerKind: "provider-openai",
      authFamily: "api-key",
      adapterFamily: "openai-compatible",
      apiBase: "https://api.openai.test",
      envVars: ["OPENAI_API_KEY"],
      controlPlaneRequirements: [],
      localOverrideApplied: false,
      upstreamProvenance: {
        vendor: "models.dev",
        commit: "test-catalog",
        capturedAt: "2026-05-05T00:00:00Z",
        schemaVersion: "1",
      },
    },
  ],
  models: [
    {
      modelId: "openai/gpt-4.1-mini-fast",
      providerId: "openai",
      providerKind: "provider-openai",
      authFamily: "api-key",
      displayName: "GPT-4.1 Mini Fast",
      version: "1",
      capabilities: ["code.edit"],
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
      extendsProvenance: {
        baseModelId: null,
        chain: [],
      },
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

describe("buildEndpointRegistry", () => {
  test("retains cloud endpoints with runtime eligibility flags instead of filtering them out", () => {
    const result = buildEndpointRegistry({
      catalog: normalizedCatalog,
      accounts: [
        {
          providerAccountId: "openai.disabled",
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
          status: "disabled",
          healthStatus: "healthy",
          rotationState: "stable",
        },
        {
          providerAccountId: "openai.auth-missing",
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
          healthStatus: "credentials-missing",
          rotationState: "stable",
        },
        {
          providerAccountId: "openai.quota-exhausted",
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
          healthStatus: "quota-exhausted",
          rotationState: "stable",
        },
        {
          providerAccountId: "openai.region-denied",
          providerId: "openai",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "default",
          credentialRef: { backend: "env", ref: "OPENAI_API_KEY" },
          authMode: "api-key-static",
          regionPolicy: { mode: "allow", regions: ["us-east-1"] },
          baseUrlOverride: null,
          allowedModels: [],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        },
      ],
      sources: {
        cloud: [
          {
            endpointId: "openai.disabled.us-east-1",
            providerAccountId: "openai.disabled",
            modelId: "openai/gpt-4.1-mini-fast",
            region: "us-east-1",
            endpointKind: "remote-openai-compatible",
            servingSource: "remote-service",
            lifecycleState: "active",
            healthStatus: "healthy",
          },
          {
            endpointId: "openai.auth-missing.us-east-1",
            providerAccountId: "openai.auth-missing",
            modelId: "openai/gpt-4.1-mini-fast",
            region: "us-east-1",
            endpointKind: "remote-openai-compatible",
            servingSource: "remote-service",
            lifecycleState: "active",
            healthStatus: "healthy",
          },
          {
            endpointId: "openai.quota-exhausted.us-east-1",
            providerAccountId: "openai.quota-exhausted",
            modelId: "openai/gpt-4.1-mini-fast",
            region: "us-east-1",
            endpointKind: "remote-openai-compatible",
            servingSource: "remote-service",
            lifecycleState: "active",
            healthStatus: "healthy",
          },
          {
            endpointId: "openai.region-denied.eu-west-1",
            providerAccountId: "openai.region-denied",
            modelId: "openai/gpt-4.1-mini-fast",
            region: "eu-west-1",
            endpointKind: "remote-openai-compatible",
            servingSource: "remote-service",
            lifecycleState: "active",
            healthStatus: "healthy",
          },
        ],
        local: [],
      },
    });

    expect(result.endpoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          identity: expect.objectContaining({ endpoint_id: "openai.disabled.us-east-1" }),
          runtimeEligibility: expect.objectContaining({ accountDisabled: true }),
        }),
        expect.objectContaining({
          identity: expect.objectContaining({ endpoint_id: "openai.auth-missing.us-east-1" }),
          runtimeEligibility: expect.objectContaining({ authUnavailable: true }),
        }),
        expect.objectContaining({
          identity: expect.objectContaining({ endpoint_id: "openai.quota-exhausted.us-east-1" }),
          runtimeEligibility: expect.objectContaining({ quotaExhausted: true }),
        }),
        expect.objectContaining({
          identity: expect.objectContaining({ endpoint_id: "openai.region-denied.eu-west-1" }),
          runtimeEligibility: expect.objectContaining({ regionDisallowed: true }),
        }),
      ]),
    );
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpointId: "openai.region-denied.eu-west-1",
          code: "REGION_NOT_ALLOWED",
        }),
      ]),
    );
  });
});
