import { describe, expect, test } from "vitest";

import { buildEndpointRegistry } from "../src/index.js";

const catalog = {
  catalogVersion: "1",
  source: { vendor: "models.dev", commit: "test-catalog", capturedAt: "2026-05-05T00:00:00Z", schemaVersion: "1" },
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
      upstreamProvenance: { vendor: "models.dev", commit: "test-catalog", capturedAt: "2026-05-05T00:00:00Z", schemaVersion: "1" },
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
      requestShapeHints: { providerShape: "openai", bodyKeys: ["messages"], headerKeys: ["authorization"] },
      experimentalModes: [],
      extendsProvenance: { baseModelId: null, chain: [] },
      localOverrideApplied: false,
      localNotes: [],
      upstreamProvenance: { vendor: "models.dev", commit: "test-catalog", capturedAt: "2026-05-05T00:00:00Z", schemaVersion: "1" },
    },
  ],
} as const;

const account = {
  providerAccountId: "openai.personal",
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

const cloudSource = {
  endpointId: "openai.personal.us-east-1",
  providerAccountId: "openai.personal",
  modelId: "openai/gpt-4.1-mini-fast",
  region: "us-east-1",
  endpointKind: "remote-openai-compatible",
  servingSource: "remote-service",
  lifecycleState: "active",
  healthStatus: "healthy",
} as const;

describe("run108 R8 the endpoint registry dedupes by identity.endpoint_id", () => {
  test("a duplicated cloud source yields ONE endpoint and a DUPLICATE_ENDPOINT_SOURCE diagnostic", () => {
    const result = buildEndpointRegistry({
      catalog,
      accounts: [account],
      sources: { cloud: [cloudSource, { ...cloudSource }], local: [] },
    });

    const ids = result.endpoints
      .map((endpoint) => endpoint.identity.endpoint_id)
      .filter((id) => id === "openai.personal.us-east-1");
    expect(ids).toHaveLength(1); // RED today: 2 (the duplicated source expands twice)

    const dup = result.diagnostics.find(
      (diagnostic) => diagnostic.code === "DUPLICATE_ENDPOINT_SOURCE",
    );
    expect(dup).toBeTruthy(); // RED today: undefined (no dedupe diagnostic exists)
    expect(dup?.endpointId).toBe("openai.personal.us-east-1");
  });
});
