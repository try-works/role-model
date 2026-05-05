import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { buildEndpointRegistry } from "@role-model-router/endpoint-registry";

import { projectRuntimeRouteInput, routeRuntimeRequest } from "../src/index.js";
import { runRuntimeRoutingValidation } from "../src/cli.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("projectRuntimeRouteInput", () => {
  test("merges registry candidates, observed profiles, and runtime routing signals", () => {
    const projected = projectRuntimeRouteInput({
      request: {
        requestId: "req-runtime-1",
        appId: "app-runtime",
        orgId: "org-runtime",
        requestedRoleId: "developer",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        preferredCapabilities: ["reasoning.multi_step"],
        requiredModalities: ["text"],
        contextTokens: 180,
        needsTools: true,
        strategy: "balanced",
        preferLocal: true,
        budgetLimit: 0.01,
      },
      registry: {
        endpoints: [
          {
            identity: {
              endpoint_id: "cli.local.coder",
              endpoint_kind: "local_engine",
              provider_kind: "cli",
              serving_source: "local-process",
              model_id: "gpt-5.4",
              runtime_version: "run07-registry-v1",
              region: "local",
              host_class: "developer-workstation",
              device_class: "developer-workstation",
              org_scope: "personal",
            },
            declared: {
              endpoint_id: "cli.local.coder",
              capabilities: ["code.edit", "reasoning.multi_step", "tools.function_calling"],
              modalities: ["text"],
              max_context_tokens: 32768,
              tool_calling: {
                supported: true,
                style: "openai",
              },
              supports_embeddings: false,
              platform_constraints: [],
            },
            status: "active",
          },
          {
            identity: {
              endpoint_id: "openai.personal.primary.us-east-1.fast",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "remote-service",
              model_id: "openai/gpt-4.1-mini-fast",
              runtime_version: "run07-registry-v1",
              region: "us-east-1",
              host_class: "server",
              device_class: "server",
              org_scope: "personal",
            },
            declared: {
              endpoint_id: "openai.personal.primary.us-east-1.fast",
              capabilities: ["code.edit", "tools.function_calling"],
              modalities: ["text"],
              max_context_tokens: 32768,
              tool_calling: {
                supported: true,
                style: "openai",
              },
              supports_embeddings: false,
              platform_constraints: [],
            },
            status: "active",
          },
        ],
        diagnostics: [],
        lifecycleSummary: {
          active: 2,
          degraded: 0,
          offline: 0,
        },
      },
      observedProfilesByEndpointId: {
        "cli.local.coder": {
          endpoint_id: "cli.local.coder",
          judge_score: 0.91,
          latency_ms_p50: 60,
          latency_ms_p95: 90,
          tokens_per_sec: 72,
          cold_start_ms: 15,
          failure_rate: 0.01,
          cost_per_1k_tokens_est: 0,
          freshness_score: 0.94,
          confidence_score: 0.92,
        },
        "openai.personal.primary.us-east-1.fast": {
          endpoint_id: "openai.personal.primary.us-east-1.fast",
          judge_score: 0.88,
          latency_ms_p50: 120,
          latency_ms_p95: 160,
          tokens_per_sec: 88,
          cold_start_ms: 25,
          failure_rate: 0.01,
          cost_per_1k_tokens_est: 0.004,
          freshness_score: 0.9,
          confidence_score: 0.91,
        },
      },
      envelope: {
        sessionId: "session-alpha",
        conversationId: "conversation-main",
        selectedTurns: [
          {
            turnId: "turn-003",
            conversationId: "conversation-main",
            role: "user",
            contentRef: "ref://turn-003?tokens=80",
            createdAtMs: 1700000003000,
          },
        ],
        selectedArtifacts: [
          {
            artifactId: "artifact-summary",
            artifactKind: "summary",
            storageRef: "ref://artifact-summary?tokens=70",
            createdAtMs: 1700000001500,
            linkId: "link-2",
            conversationId: "conversation-main",
            sessionId: "session-alpha",
            linkedAtMs: 1700000001500,
          },
        ],
        latestHandoff: {
          handoffId: "handoff-1",
          conversationId: "conversation-main",
          fromEndpointId: "openai.personal.primary.us-east-1.fast",
          toEndpointId: "cli.local.coder",
          createdAtMs: 1700000003500,
        },
        estimatedTokenCount: 150,
        diagnostics: [],
      },
      retrievalReceipt: {
        receiptId: "conversation-main-retrieval-receipt",
        conversationId: "conversation-main",
        summary: {
          selectedTurns: 1,
          selectedArtifacts: 1,
          omittedTurns: 0,
          omittedArtifacts: 0,
          estimatedTokens: 150,
        },
        entries: [
          {
            itemId: "turn-003",
            kind: "turn",
            reason: "recent-turn",
          },
        ],
      },
      roleDefinitions: [],
      taskDefinitions: [],
      roleBindings: [],
      routingModel: {
        endpointId: "cli.local.coder",
        preferredEndpointIds: [
          "openai.personal.primary.us-east-1.fast",
          "cli.local.coder",
        ],
      },
    });

    expect(projected.routeInput.request.requestId).toBe("req-runtime-1");
    expect(projected.routeInput.candidates).toHaveLength(2);
    expect(projected.routeInput.candidates[0]).toMatchObject({
      identity: { endpoint_id: "cli.local.coder" },
      observed: { judge_score: 0.91 },
      routingSignals: {
        continuityAffinity: true,
        cacheAffinity: true,
        routingModelRank: 1,
      },
    });
    expect(projected.routeInput.candidates[1]).toMatchObject({
      identity: { endpoint_id: "openai.personal.primary.us-east-1.fast" },
      observed: { cost_per_1k_tokens_est: 0.004 },
      routingSignals: {
        continuityAffinity: false,
        cacheAffinity: true,
        routingModelRank: 0,
      },
    });
    expect(projected.routingDiagnostics.routingModel).toEqual({
      enabled: true,
      endpointId: "cli.local.coder",
      preferredEndpointIds: [
        "openai.personal.primary.us-east-1.fast",
        "cli.local.coder",
      ],
      ignoredEndpointIds: [],
    });
  });
});

describe("routeRuntimeRequest", () => {
  test("emits canonical runtime eligibility exclusions from registry/provider-account state", () => {
    const registry = buildEndpointRegistry({
      catalog: {
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
      },
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
        local: [
          {
            endpointId: "cli.local.coder",
            providerKind: "provider-cli",
            providerId: "local-cli",
            modelId: "gpt-5.4",
            capabilities: ["code.edit"],
            modalities: ["text"],
            endpointKind: "cli-agent",
            servingSource: "local-process",
            lifecycleState: "active",
            hostClass: "developer-workstation",
            deviceClass: "developer-workstation",
            region: "local",
            orgScope: "personal",
          },
        ],
      },
    });

    const result = routeRuntimeRequest({
      request: {
        requestId: "req-runtime-eligibility-1",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 128,
        needsTools: false,
        strategy: "balanced",
        preferLocal: true,
      },
      registry,
      observedProfilesByEndpointId: {
        "cli.local.coder": {
          endpoint_id: "cli.local.coder",
          judge_score: 0.9,
          latency_ms_p50: 60,
          latency_ms_p95: 80,
          tokens_per_sec: 70,
          cold_start_ms: 10,
          failure_rate: 0.01,
          cost_per_1k_tokens_est: 0,
          freshness_score: 0.95,
          confidence_score: 0.95,
        },
      },
      envelope: {
        sessionId: "session-alpha",
        conversationId: "conversation-main",
        selectedTurns: [],
        selectedArtifacts: [],
        latestHandoff: null,
        estimatedTokenCount: 0,
        diagnostics: [],
      },
      retrievalReceipt: {
        receiptId: "conversation-main-retrieval-receipt",
        conversationId: "conversation-main",
        summary: {
          selectedTurns: 0,
          selectedArtifacts: 0,
          omittedTurns: 0,
          omittedArtifacts: 0,
          estimatedTokens: 0,
        },
        entries: [],
      },
      roleDefinitions: [],
      taskDefinitions: [],
      roleBindings: [],
    });

    expect(result.decision.chosen_endpoint_id).toBe("cli.local.coder");
    expect(
      result.decision.eligibility.find((entry) => entry.endpoint_id === "openai.disabled.us-east-1"),
    ).toEqual(
      expect.objectContaining({
        eligible: false,
        exclusions: expect.arrayContaining([expect.objectContaining({ code: "ACCOUNT_DISABLED" })]),
      }),
    );
    expect(
      result.decision.eligibility.find((entry) => entry.endpoint_id === "openai.auth-missing.us-east-1"),
    ).toEqual(
      expect.objectContaining({
        eligible: false,
        exclusions: expect.arrayContaining([expect.objectContaining({ code: "AUTH_UNAVAILABLE" })]),
      }),
    );
    expect(
      result.decision.eligibility.find(
        (entry) => entry.endpoint_id === "openai.quota-exhausted.us-east-1",
      ),
    ).toEqual(
      expect.objectContaining({
        eligible: false,
        exclusions: expect.arrayContaining([expect.objectContaining({ code: "QUOTA_EXHAUSTED" })]),
      }),
    );
    expect(
      result.decision.eligibility.find((entry) => entry.endpoint_id === "openai.region-denied.eu-west-1"),
    ).toEqual(
      expect.objectContaining({
        eligible: false,
        exclusions: expect.arrayContaining([expect.objectContaining({ code: "REGION_DISALLOWED" })]),
      }),
    );
  });

  test("keeps explicit policy denial ahead of routing-model guidance", () => {
    const result = routeRuntimeRequest({
      request: {
        requestId: "req-runtime-2",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 180,
        needsTools: false,
        strategy: "balanced",
        preferLocal: true,
        denyEndpoints: ["openai.personal.primary.us-east-1.fast"],
      },
      registry: {
        endpoints: [
          {
            identity: {
              endpoint_id: "cli.local.coder",
              endpoint_kind: "local_engine",
              provider_kind: "cli",
              serving_source: "local-process",
              model_id: "gpt-5.4",
              runtime_version: "run07-registry-v1",
              region: "local",
              host_class: "developer-workstation",
              device_class: "developer-workstation",
              org_scope: "personal",
            },
            declared: {
              endpoint_id: "cli.local.coder",
              capabilities: ["code.edit"],
              modalities: ["text"],
              max_context_tokens: 32768,
              tool_calling: {
                supported: false,
                style: "none",
              },
              supports_embeddings: false,
              platform_constraints: [],
            },
            status: "active",
          },
          {
            identity: {
              endpoint_id: "openai.personal.primary.us-east-1.fast",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "remote-service",
              model_id: "openai/gpt-4.1-mini-fast",
              runtime_version: "run07-registry-v1",
              region: "us-east-1",
              host_class: "server",
              device_class: "server",
              org_scope: "personal",
            },
            declared: {
              endpoint_id: "openai.personal.primary.us-east-1.fast",
              capabilities: ["code.edit"],
              modalities: ["text"],
              max_context_tokens: 32768,
              tool_calling: {
                supported: false,
                style: "none",
              },
              supports_embeddings: false,
              platform_constraints: [],
            },
            status: "active",
          },
        ],
        diagnostics: [],
        lifecycleSummary: {
          active: 2,
          degraded: 0,
          offline: 0,
        },
      },
      observedProfilesByEndpointId: {
        "cli.local.coder": {
          endpoint_id: "cli.local.coder",
          judge_score: 0.8,
          latency_ms_p50: 100,
          latency_ms_p95: 130,
          tokens_per_sec: 55,
          cold_start_ms: 20,
          failure_rate: 0.01,
          cost_per_1k_tokens_est: 0,
          freshness_score: 0.9,
          confidence_score: 0.9,
        },
        "openai.personal.primary.us-east-1.fast": {
          endpoint_id: "openai.personal.primary.us-east-1.fast",
          judge_score: 0.95,
          latency_ms_p50: 90,
          latency_ms_p95: 120,
          tokens_per_sec: 80,
          cold_start_ms: 25,
          failure_rate: 0.01,
          cost_per_1k_tokens_est: 0.003,
          freshness_score: 0.9,
          confidence_score: 0.9,
        },
      },
      envelope: {
        sessionId: "session-alpha",
        conversationId: "conversation-main",
        selectedTurns: [],
        selectedArtifacts: [],
        latestHandoff: null,
        estimatedTokenCount: 0,
        diagnostics: [],
      },
      retrievalReceipt: {
        receiptId: "conversation-main-retrieval-receipt",
        conversationId: "conversation-main",
        summary: {
          selectedTurns: 0,
          selectedArtifacts: 0,
          omittedTurns: 0,
          omittedArtifacts: 0,
          estimatedTokens: 0,
        },
        entries: [],
      },
      roleDefinitions: [],
      taskDefinitions: [],
      roleBindings: [],
      routingModel: {
        endpointId: "cli.local.coder",
        preferredEndpointIds: [
          "openai.personal.primary.us-east-1.fast",
          "cli.local.coder",
        ],
      },
    });

    expect(result.decision.chosen_endpoint_id).toBe("cli.local.coder");
    expect(
      result.decision.eligibility.find(
        (entry) => entry.endpoint_id === "openai.personal.primary.us-east-1.fast",
      ),
    ).toEqual(
      expect.objectContaining({
        eligible: false,
        exclusions: expect.arrayContaining([
          expect.objectContaining({
            code: "POLICY_DENY_ENDPOINT",
          }),
        ]),
      }),
    );
    expect(result.routingDiagnostics.routingModel.ignoredEndpointIds).toEqual([
      "openai.personal.primary.us-east-1.fast",
    ]);
  });
});

describe("runRuntimeRoutingValidation", () => {
  test("loads pinned fixtures and emits deterministic routing diagnostics", async () => {
    const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
    const result = await runRuntimeRoutingValidation({
      repoRoot,
      runtimeStateRoot: path.join(repoRoot, "runtime-output", "protocol-routing-test"),
      scopeId: "local-validation",
    });

    expect(result.decision.chosen_endpoint_id).toBe("cli.local.coder");
    expect(result.routingDiagnostics.routingModel.preferredEndpointIds).toEqual([
      "openai.personal.primary.us-east-1.fast",
      "cli.local.coder",
    ]);
    expect(result.retrievalReceipt.receiptId).toBe("conversation-main-retrieval-receipt");
    expect(result.contextEnvelope.latestHandoffId).toBe("handoff-1");
  });
});
