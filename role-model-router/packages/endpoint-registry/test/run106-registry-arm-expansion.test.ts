import { describe, expect, it } from "vitest";

import { buildEndpointRegistry } from "../src/index.js";
import { expandReasoningEffortArms } from "../src/effort-instance-identity.js";

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

describe("run106 registry arm expansion integration", () => {
  it("materializes one distinct routing arm per declared level plus a provider-default arm", () => {
    const result = buildEndpointRegistry({
      catalog,
      accounts: [account],
      sources,
    });

    const expected = expandReasoningEffortArms({
      providerAccountId,
      region,
      modelId,
      fixedEffort: null,
      declaredLevels: ["low", "high"],
      baseEndpointId,
    });

    // The registry must produce exactly the arms the identity helper declares.
    expect(result.endpoints).toHaveLength(expected.length);
    expect(result.endpoints.map((entry) => entry.identity.endpoint_id).sort()).toEqual(
      expected.map((arm) => arm.endpointId).sort(),
    );
    expect(
      result.endpoints.map((entry) => entry.identity.reasoning_effort ?? null).sort(),
    ).toEqual(expected.map((arm) => arm.effectiveEffort).sort());

    // Every arm carries the model identity.
    for (const entry of result.endpoints) {
      expect(entry.identity.model_id).toBe(modelId);
      expect(entry.identity.region).toBe(region);
    }

    // Exactly one provider-default arm, plus the two declared levels.
    const efforts = result.endpoints.map((entry) => entry.identity.reasoning_effort);
    expect(efforts.filter((effort) => effort === null)).toHaveLength(1);
    expect(efforts.filter((effort) => effort === "low")).toHaveLength(1);
    expect(efforts.filter((effort) => effort === "high")).toHaveLength(1);

    // The provider-default arm still advertises the declared executable levels.
    const defaultArm = result.endpoints.find(
      (entry) => entry.identity.reasoning_effort === null,
    );
    expect(defaultArm?.declared.reasoning_effort_levels).toEqual(["low", "high"]);
    // The provider-default arm preserves the source endpointId verbatim.
    expect(defaultArm?.identity.endpoint_id).toBe(baseEndpointId);

    // Fixed-effort arms carry their level in identity and do not re-advertise levels.
    for (const level of ["low", "high"] as const) {
      const arm = result.endpoints.find(
        (entry) => entry.identity.reasoning_effort === level,
      );
      expect(arm).toBeDefined();
      expect(arm?.declared.reasoning_effort_levels).toBeUndefined();
      expect(arm?.identity.endpoint_id).toContain(`-${level}`);
    }
  });
});
