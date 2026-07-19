import { describe, expect, test } from "vitest";

import {
  buildAccountModelCatalogIds,
  buildActivitySummary,
  buildAliasDriftRows,
  buildAliasReadinessRows,
  buildArchivedArtifactRows,
  buildConfiguredModelCards,
  buildConfiguredModelMetadataRows,
  buildConfiguredProviderRows,
  buildConfiguredRemoteConnectionRows,
  buildCredentialLifecycleAccountRows,
  buildCredentialLifecycleBanner,
  buildCredentialReadinessRows,
  buildDashboardLatestRequestRows,
  buildDownstreamProviderGuide,
  buildEndpointCatalogRows,
  buildInventorySummaryStats,
  buildModelCatalogRows,
  buildProviderCards,
  buildProviderMaintenanceRows,
  buildSessionBootstrapRows,
  buildStructuredLogRows,
  buildTelemetryComparisonCards,
  buildTelemetryRequestRows,
  buildWorkbenchEndpointOptions,
  buildWorkbenchModelOptions,
  countActiveEndpointModels,
  summarizeRuntimeStats,
  summarizeSessionBootstrapStatus,
  summarizeTelemetryStats,
  summarizeWorkbenchResult,
} from "./view-models";

describe("buildProviderCards", () => {
  test("turns provider variants and account state into provider cards for the onboarding page", () => {
    expect(
      buildProviderCards(
        [
          {
            providerId: "moonshot",
            displayName: "Moonshot AI",
            variants: [
              {
                variantId: "moonshot-open-platform",
                label: "Moonshot Open Platform",
                authMode: "api-key-static",
                availability: "ready",
              },
              {
                variantId: "kimi-code",
                label: "Kimi Code",
                authMode: "oauth2-device-code",
                availability: "backend-limited",
              },
            ],
          },
        ],
        [
          {
            providerAccountId: "moonshot.personal.primary",
            providerId: "moonshot",
          },
        ],
      ),
    ).toEqual([
      {
        providerId: "moonshot",
        title: "Moonshot AI",
        accountCount: 1,
        variants: [
          {
            variantId: "moonshot-open-platform",
            label: "Moonshot Open Platform",
            authMode: "api-key-static",
            availability: "ready",
          },
          {
            variantId: "kimi-code",
            label: "Kimi Code",
            authMode: "oauth2-device-code",
            availability: "backend-limited",
          },
        ],
      },
    ]);
  });
});

describe("summarizeRuntimeStats", () => {
  test("creates stable dashboard stat cards from the runtime summary counts", () => {
    expect(
      summarizeRuntimeStats({
        providerCount: 3,
        accountCount: 2,
        endpointCount: 3,
      }),
    ).toEqual([
      { label: "Providers", value: "3" },
      { label: "Accounts", value: "2" },
      { label: "Endpoints", value: "3" },
    ]);
  });
});

describe("session readiness view models", () => {
  test("builds bootstrap rows and inventory stats from runtime summary", () => {
    const summary = {
      sessionBootstrap: {
        status: "ready" as const,
        startedAt: "2026-06-08T10:00:00.000Z",
        finishedAt: "2026-06-08T10:00:01.000Z",
        stages: [
          {
            stageId: "inventory",
            status: "ready" as const,
            startedAt: "2026-06-08T10:00:01.000Z",
            finishedAt: "2026-06-08T10:00:01.100Z",
            message: "inventory ready",
          },
        ],
      },
      inventorySummary: {
        modelIdCount: 2,
        endpointIdCount: 2,
        localEndpointCount: 1,
        remoteEndpointCount: 1,
        emptyAliasIds: [],
      },
      aliasDrift: [
        {
          aliasId: "mixed.local-remote",
          hintModelId: "lfm2.5-1.2b-instruct",
          suggestedModelIds: ["lfm2.5-8b-a1b"],
          message: "hint drift",
        },
      ],
    };

    expect(summarizeSessionBootstrapStatus(summary)).toEqual({
      label: "Ready",
      tone: "success",
    });
    expect(buildSessionBootstrapRows(summary)).toEqual([
      expect.objectContaining({
        stageId: "inventory",
        label: "Inventory",
        status: "ready",
        tone: "success",
      }),
    ]);
    expect(buildInventorySummaryStats(summary)).toEqual(
      expect.arrayContaining([{ label: "Routable endpoints", value: "2" }]),
    );
    expect(buildAliasDriftRows(summary)).toHaveLength(1);
  });
});

describe("buildCredentialReadinessRows", () => {
  test("turns the runtime readiness summary into operator-facing readiness rows", () => {
    expect(
      buildCredentialReadinessRows({
        readinessSummary: {
          pendingDeviceAuthorizationCount: 1,
          credentialsMissingAccountCount: 2,
          connectedWithoutEndpointCount: 1,
          readyAccountCount: 3,
        },
      }),
    ).toEqual([
      {
        key: "pending-device-authorization",
        label: "Pending OAuth",
        value: 1,
        tone: "warning",
      },
      {
        key: "credentials-missing",
        label: "Credentials missing",
        value: 2,
        tone: "warning",
      },
      {
        key: "connected-without-endpoint",
        label: "Connected, no endpoint",
        value: 1,
        tone: "warning",
      },
      {
        key: "ready",
        label: "Execution-ready",
        value: 3,
        tone: "success",
      },
    ]);
  });

  test("prefers canonical credential lifecycle counts when they are present", () => {
    expect(
      buildCredentialReadinessRows({
        credentialLifecycle: {
          counts: {
            executionReady: 3,
            connectedNoEndpoint: 1,
            pendingAuthorization: 1,
            expiredAuth: 2,
            credentialsMissing: 2,
            envUnresolved: 1,
            archivedStale: 4,
          },
        },
      } as never),
    ).toEqual([
      {
        key: "pending-device-authorization",
        label: "Pending OAuth",
        value: 1,
        tone: "warning",
      },
      {
        key: "env-unresolved",
        label: "Env unresolved",
        value: 1,
        tone: "warning",
      },
      {
        key: "credentials-missing",
        label: "Credentials missing",
        value: 2,
        tone: "warning",
      },
      {
        key: "expired-auth",
        label: "Reconnect required",
        value: 2,
        tone: "warning",
      },
      {
        key: "connected-without-endpoint",
        label: "Connected, no endpoint",
        value: 1,
        tone: "warning",
      },
      {
        key: "ready",
        label: "Execution-ready",
        value: 3,
        tone: "success",
      },
    ]);
  });
});

describe("buildCredentialLifecycleBanner", () => {
  test("summarizes authority, blocking rows, and archived stale counts from the canonical lifecycle contract", () => {
    expect(
      buildCredentialLifecycleBanner({
        credentialLifecycle: {
          authority: {
            state: "provisional",
            bootstrapStatus: "running",
          },
          counts: {
            executionReady: 1,
            connectedNoEndpoint: 1,
            pendingAuthorization: 0,
            expiredAuth: 1,
            credentialsMissing: 0,
            envUnresolved: 0,
            archivedStale: 2,
          },
          accounts: [],
          providerRollups: [],
          archivedArtifacts: [
            {
              artifactId: "auth-001",
              providerId: "moonshot",
              providerAccountId: "moonshot.personal.pending",
              artifactType: "device-authorization",
              reasonCode: "expired-pending-authorization",
            },
          ],
        },
      } as never),
    ).toEqual({
      authorityLabel: "Provisional lifecycle snapshot",
      authorityTone: "accent",
      detail: "Bootstrap is still reconciling credentials, activations, and archived stale state.",
      archivedStaleCount: 2,
      blockingRows: [
        {
          key: "expired-auth",
          label: "Reconnect required",
          value: 1,
          tone: "warning",
        },
        {
          key: "connected-without-endpoint",
          label: "Connected, no endpoint",
          value: 1,
          tone: "warning",
        },
      ],
    });
  });
});

describe("buildCredentialLifecycleAccountRows", () => {
  test("returns canonical lifecycle account diagnostics for blocking and ready accounts", () => {
    expect(
      buildCredentialLifecycleAccountRows({
        credentialLifecycle: {
          authority: {
            state: "authoritative",
            bootstrapStatus: "ready",
          },
          counts: {
            executionReady: 1,
            connectedNoEndpoint: 0,
            pendingAuthorization: 0,
            expiredAuth: 1,
            credentialsMissing: 0,
            envUnresolved: 1,
            archivedStale: 0,
          },
          accounts: [
            {
              logicalAccountId: "moonshot.personal.primary",
              providerAccountId: "moonshot.personal.primary",
              providerId: "moonshot",
              sourceProvenance: ["manual"],
              authMode: "api-key-static",
              credentialStorageMode: "persisted-local",
              credentialBackendCanonical: "local-file",
              lifecycleState: "execution-ready",
              reasonCode: "active-endpoint-present",
              blocking: false,
              activeEndpointIds: ["moonshot.personal.primary.global.kimi-k2.5"],
              configuredModelIds: ["moonshot/kimi-k2.5"],
              availableActions: [],
            },
            {
              logicalAccountId: "moonshot.personal.oauth",
              providerAccountId: "moonshot.personal.oauth",
              providerId: "moonshot",
              sourceProvenance: ["manual"],
              authMode: "oauth2-device-code",
              credentialStorageMode: "oauth-local",
              credentialBackendCanonical: "local-file",
              lifecycleState: "expired-auth",
              reasonCode: "oauth-refresh-failed",
              blocking: true,
              activeEndpointIds: [],
              configuredModelIds: ["moonshot/kimi-k2.5"],
              availableActions: ["reconnect"],
            },
            {
              logicalAccountId: "openai.personal.env",
              providerAccountId: "openai.personal.env",
              providerId: "openai",
              sourceProvenance: ["manual"],
              authMode: "api-key-static",
              credentialStorageMode: "env-ref",
              credentialBackendCanonical: "env",
              lifecycleState: "env-unresolved",
              reasonCode: "env-var-missing",
              blocking: true,
              activeEndpointIds: [],
              configuredModelIds: ["openai/gpt-4.1-mini-fast"],
              availableActions: ["set-env"],
            },
          ],
          providerRollups: [],
          archivedArtifacts: [],
        },
      } as never),
    ).toEqual([
      {
        key: "moonshot.personal.oauth",
        providerAccountId: "moonshot.personal.oauth",
        providerId: "moonshot",
        lifecycleState: "expired-auth",
        lifecycleLabel: "Reconnect required",
        reasonLabel: "Stored OAuth token failed refresh",
        blocking: true,
        tone: "warning",
        availableActionsLabel: "Reconnect",
        activeEndpointCount: 0,
      },
      {
        key: "openai.personal.env",
        providerAccountId: "openai.personal.env",
        providerId: "openai",
        lifecycleState: "env-unresolved",
        lifecycleLabel: "Env unresolved",
        reasonLabel: "Referenced environment variable is missing",
        blocking: true,
        tone: "warning",
        availableActionsLabel: "Set env",
        activeEndpointCount: 0,
      },
      {
        key: "moonshot.personal.primary",
        providerAccountId: "moonshot.personal.primary",
        providerId: "moonshot",
        lifecycleState: "execution-ready",
        lifecycleLabel: "Execution-ready",
        reasonLabel: "Active endpoint is available",
        blocking: false,
        tone: "success",
        availableActionsLabel: "None",
        activeEndpointCount: 1,
      },
    ]);
  });

  test("treats Codex Subscription as a standard connected account that can activate an endpoint", () => {
    expect(
      buildCredentialLifecycleAccountRows({
        credentialLifecycle: {
          authority: {
            state: "authoritative",
            bootstrapStatus: "ready",
          },
          counts: {
            executionReady: 0,
            connectedNoEndpoint: 1,
            pendingAuthorization: 0,
            expiredAuth: 0,
            credentialsMissing: 0,
            envUnresolved: 0,
            archivedStale: 0,
          },
          accounts: [
            {
              logicalAccountId: "openai.personal.codex-subscription",
              providerAccountId: "openai.personal.codex-subscription",
              providerId: "openai",
              sourceProvenance: ["manual"],
              authMode: "oauth2-device-code",
              credentialStorageMode: "oauth-local",
              credentialBackendCanonical: "local-file",
              lifecycleState: "connected-no-endpoint",
              reasonCode: "active-without-endpoint",
              blocking: true,
              activeEndpointIds: [],
              configuredModelIds: ["chatgpt/gpt-5.3-codex"],
              availableActions: ["activate-endpoint"],
            },
          ],
          providerRollups: [],
          archivedArtifacts: [],
        },
      } as never),
    ).toEqual([
      expect.objectContaining({
        key: "openai.personal.codex-subscription",
        lifecycleLabel: "Connected, no endpoint",
        reasonLabel: "Credential is usable but no endpoint is active",
        availableActionsLabel: "Activate endpoint",
      }),
    ]);
  });
});

describe("buildArchivedArtifactRows", () => {
  test("returns archived stale diagnostics separately from blocking lifecycle rows", () => {
    expect(
      buildArchivedArtifactRows({
        credentialLifecycle: {
          authority: {
            state: "authoritative",
            bootstrapStatus: "ready",
          },
          counts: {
            executionReady: 0,
            connectedNoEndpoint: 0,
            pendingAuthorization: 0,
            expiredAuth: 0,
            credentialsMissing: 0,
            envUnresolved: 0,
            archivedStale: 1,
          },
          accounts: [],
          providerRollups: [],
          archivedArtifacts: [
            {
              artifactId: "auth-001",
              providerId: "moonshot",
              providerAccountId: "moonshot.personal.pending",
              artifactType: "device-authorization",
              reasonCode: "expired-pending-authorization",
            },
          ],
        },
      } as never),
    ).toEqual([
      {
        key: "auth-001",
        providerAccountId: "moonshot.personal.pending",
        providerId: "moonshot",
        label: "Expired pending authorization archived",
        detail: "device-authorization • expired-pending-authorization",
      },
    ]);
  });
});

describe("buildWorkbenchModelOptions", () => {
  test("sorts and deduplicates model options for the workbench composer", () => {
    expect(
      buildWorkbenchModelOptions([
        { id: "moonshot/kimi-k2.5", endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"] },
        {
          id: "openai/gpt-4.1-mini-fast",
          endpoint_ids: ["openai.personal.primary.us-east-1.fast"],
        },
        { id: "moonshot/kimi-k2.5", endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"] },
      ]),
    ).toEqual([
      { label: "Kimi K2.5", value: "moonshot/kimi-k2.5" },
      { label: "GPT 4.1 Mini Fast", value: "openai/gpt-4.1-mini-fast" },
    ]);
  });
});

describe("buildWorkbenchEndpointOptions", () => {
  test("prefers saved OAuth endpoints over shared LiteLLM endpoints for the selected model", () => {
    expect(
      buildWorkbenchEndpointOptions({
        modelId: "moonshot/kimi-k2.5",
        models: [
          {
            id: "moonshot/kimi-k2.5",
            endpoint_ids: [
              "moonshot.litellm.global.kimi-k2.5",
              "moonshot.personal.moonshot-oauth.global.kimi-k2.5",
            ],
          },
        ],
        endpoints: [
          {
            endpointId: "moonshot.litellm.global.kimi-k2.5",
            modelId: "moonshot/kimi-k2.5",
            providerId: "moonshot",
            providerAccountId: "moonshot.litellm",
            status: "active",
            healthStatus: "healthy",
            sourceType: "remote",
          },
          {
            endpointId: "moonshot.personal.moonshot-oauth.global.kimi-k2.5",
            modelId: "moonshot/kimi-k2.5",
            providerId: "moonshot",
            providerAccountId: "moonshot.personal.moonshot-oauth",
            status: "active",
            healthStatus: "healthy",
            sourceType: "remote",
          },
        ],
        accounts: [
          {
            providerAccountId: "moonshot.litellm",
            providerId: "moonshot",
            credentialRef: {
              backend: "env",
              ref: "MOONSHOT_API_KEY",
            },
          },
          {
            providerAccountId: "moonshot.personal.moonshot-oauth",
            providerId: "moonshot",
            credentialRef: {
              backend: "local-file",
              ref: "oauth/moonshot/moonshot.personal.moonshot-oauth",
            },
          },
        ],
      }),
    ).toEqual([
      {
        label: "moonshot.personal.moonshot-oauth.global.kimi-k2.5",
        value: "moonshot.personal.moonshot-oauth.global.kimi-k2.5",
      },
      {
        label: "moonshot.litellm.global.kimi-k2.5",
        value: "moonshot.litellm.global.kimi-k2.5",
      },
    ]);
  });
});

describe("buildConfiguredModelCards", () => {
  test("builds unified local and remote model cards with controller and tooling state", () => {
    expect(
      buildConfiguredModelCards({
        models: [
          {
            id: "moonshot/kimi-k2.5",
            endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"],
            displayName: "Kimi K2.5",
            capabilities: ["text.chat", "tools.function_calling"],
            modalities: ["text"],
            contextWindow: 262144,
            maxOutputTokens: 16384,
            pricing: {
              inputPer1M: 4,
              outputPer1M: 12,
              currency: "USD",
            },
          },
          {
            id: "gpt-5.4",
            endpoint_ids: ["cli.local.coder"],
            displayName: "GPT-5.4",
            capabilities: ["text.chat"],
            modalities: ["text"],
            contextWindow: 200000,
            maxOutputTokens: 64000,
          },
        ],
        endpoints: [
          {
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
            modelId: "moonshot/kimi-k2.5",
            providerId: "moonshot",
            roleIds: ["general.chat"],
            status: "active",
            servingSource: "remote-service",
            toolCallingSupported: true,
          },
          {
            endpointId: "cli.local.coder",
            modelId: "gpt-5.4",
            providerId: null,
            roleIds: ["developer"],
            status: "active",
            servingSource: "local-process",
            toolCallingSupported: true,
          },
        ],
        accounts: [
          {
            providerAccountId: "moonshot.personal.primary",
            providerId: "moonshot",
            modelRoleBindings: [
              {
                modelId: "moonshot/kimi-k2.5",
                roleIds: ["general.chat"],
              },
            ],
          },
        ],
        requests: [
          {
            requestId: "req-001",
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          },
        ],
        controller: {
          scope: "global",
          endpointId: "cli.local.coder",
          modelId: "gpt-5.4",
        },
      }),
    ).toEqual([
      expect.objectContaining({
        modelId: "gpt-5.4",
        displayName: "GPT-5.4",
        sourceSummary: "local",
        endpointCount: 1,
        requestCount: 0,
        status: "healthy",
        roleIds: ["developer"],
        toolCallingSupported: true,
        controllerState: "active",
        capabilities: ["text.chat"],
        modalities: ["text"],
        contextWindow: 200000,
        maxOutputTokens: 64000,
      }),
      expect.objectContaining({
        modelId: "moonshot/kimi-k2.5",
        displayName: "Kimi K2.5",
        sourceSummary: "remote",
        endpointCount: 1,
        requestCount: 1,
        status: "healthy",
        roleIds: ["general.chat"],
        toolCallingSupported: true,
        controllerState: "eligible",
        capabilities: ["text.chat", "tools.function_calling"],
        modalities: ["text"],
        contextWindow: 262144,
        maxOutputTokens: 16384,
        pricing: {
          inputPer1M: 4,
          outputPer1M: 12,
          currency: "USD",
        },
      }),
    ]);
  });

  test("keeps request counts unset when request evidence is still deferred", () => {
    expect(
      buildConfiguredModelCards({
        models: [
          {
            id: "moonshot/kimi-k2.5",
            endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"],
            displayName: "Kimi K2.5",
          },
        ],
        endpoints: [
          {
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
            modelId: "moonshot/kimi-k2.5",
            providerId: "moonshot",
            roleIds: ["general.chat"],
            status: "active",
            servingSource: "remote-service",
          },
        ],
        accounts: [
          {
            providerAccountId: "moonshot.personal.primary",
            providerId: "moonshot",
          },
        ],
        controller: null,
      }),
    ).toEqual([
      expect.objectContaining({
        modelId: "moonshot/kimi-k2.5",
        requestCount: null,
      }),
    ]);
  });

  test("derives model status from endpoint health instead of lifecycle activation state", () => {
    expect(
      buildConfiguredModelCards({
        models: [
          {
            id: "moonshot/kimi-k2.5",
            endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"],
            displayName: "Kimi K2.5",
            capabilities: ["text.chat"],
            modalities: ["text"],
            contextWindow: 262144,
            maxOutputTokens: 16384,
          },
        ],
        endpoints: [
          {
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
            modelId: "moonshot/kimi-k2.5",
            providerId: "moonshot",
            roleIds: ["general.chat"],
            status: "active",
            healthStatus: "offline",
            sourceType: "remote",
            servingSource: "remote-service",
            toolCallingSupported: true,
          },
        ],
        accounts: [],
      }),
    ).toEqual([
      expect.objectContaining({
        modelId: "moonshot/kimi-k2.5",
        status: "offline",
      }),
    ]);
  });
});

describe("buildConfiguredModelMetadataRows", () => {
  test("formats model specifications and pricing for the inspection panel", () => {
    expect(
      buildConfiguredModelMetadataRows({
        modalities: ["text", "image"],
        contextWindow: 1047576,
        maxOutputTokens: 32768,
        pricing: {
          inputPer1M: 0.4,
          outputPer1M: 1.6,
          currency: "USD",
        },
      }),
    ).toEqual([
      { label: "Modalities", value: "text, image" },
      { label: "Context window", value: "1,047,576 tokens" },
      { label: "Max output", value: "32,768 tokens" },
      { label: "Pricing", value: "$0.4 / 1M input • $1.6 / 1M output" },
    ]);
  });
});

describe("buildModelCatalogRows", () => {
  test("turns the runtime model catalog into sorted rows with endpoint ids", () => {
    expect(
      buildModelCatalogRows([
        {
          id: "moonshot/kimi-k2.6",
          endpoint_ids: [
            "moonshot.litellm.global.moonshot-kimi-k2-6",
            "moonshot.litellm.global.moonshot-kimi-k2-6",
          ],
        },
        {
          id: "openai/gpt-4.1-mini-fast",
          endpoint_ids: ["openai.litellm.global.openai-gpt-4-1-mini-fast"],
        },
      ]),
    ).toEqual([
      {
        modelId: "moonshot/kimi-k2.6",
        displayName: "Kimi K2.6",
        endpointCount: 1,
        endpointIds: ["moonshot.litellm.global.moonshot-kimi-k2-6"],
      },
      {
        modelId: "openai/gpt-4.1-mini-fast",
        displayName: "GPT 4.1 Mini Fast",
        endpointCount: 1,
        endpointIds: ["openai.litellm.global.openai-gpt-4-1-mini-fast"],
      },
    ]);
  });
});

describe("buildEndpointCatalogRows", () => {
  test("turns the runtime endpoint registry into stable endpoint catalog rows", () => {
    expect(
      buildEndpointCatalogRows([
        {
          endpointId: "moonshot.litellm.global.moonshot-kimi-k2-6",
          modelId: "moonshot/kimi-k2.6",
          providerId: "moonshot",
          sourceType: "remote",
          servingSource: "vendor-litellm",
          endpointKind: "remote_api",
          status: "active",
          healthStatus: "healthy",
        },
        {
          endpointId: "llama-swap.local.lfm2.5-1.2b-instruct",
          modelId: "lfm2.5-1.2b-instruct",
          providerId: "llama-swap",
          sourceType: "local",
          servingSource: "vendor-llama-swap",
          endpointKind: "local_engine",
          status: "active",
          healthStatus: "healthy",
          localModelSource: "llama-swap",
        },
        {
          endpointId: "local-openai-compatible.personal.local-main.local.lfm2.5-1.2b-instruct",
          modelId: "lfm2.5-1.2b-instruct",
          providerId: "local-openai-compatible",
          sourceType: "local",
          servingSource: "local-peer",
          endpointKind: "local_engine",
          status: "active",
          healthStatus: "healthy",
          localModelSource: "peer-backed",
        },
      ]),
    ).toEqual([
      {
        endpointId: "llama-swap.local.lfm2.5-1.2b-instruct",
        modelId: "lfm2.5-1.2b-instruct",
        providerLabel: "llama-swap",
        sourceLabel: "Local",
        servingSource: "vendor-llama-swap",
        endpointKind: "local_engine",
        status: "active",
        healthStatus: "healthy",
      },
      {
        endpointId: "local-openai-compatible.personal.local-main.local.lfm2.5-1.2b-instruct",
        modelId: "lfm2.5-1.2b-instruct",
        providerLabel: "local-openai-compatible",
        sourceLabel: "Local",
        servingSource: "local-peer",
        endpointKind: "local_engine",
        status: "active",
        healthStatus: "healthy",
      },
      {
        endpointId: "moonshot.litellm.global.moonshot-kimi-k2-6",
        modelId: "moonshot/kimi-k2.6",
        providerLabel: "moonshot",
        sourceLabel: "Remote",
        servingSource: "vendor-litellm",
        endpointKind: "remote_api",
        status: "active",
        healthStatus: "healthy",
      },
    ]);
  });
});

describe("countActiveEndpointModels", () => {
  test("counts distinct active local and remote model ids from registry endpoints", () => {
    expect(
      countActiveEndpointModels([
        {
          endpointId: "local.lfm",
          modelId: "lfm2.5-1.2b-instruct",
          providerId: "local-openai-compatible",
          sourceType: "local",
          status: "active",
          healthStatus: "healthy",
        },
        {
          endpointId: "remote.kimi",
          modelId: "moonshot/kimi-k2.6",
          providerId: "moonshot",
          sourceType: "remote",
          status: "active",
          healthStatus: "healthy",
        },
        {
          endpointId: "remote.kimi.duplicate",
          modelId: "moonshot/kimi-k2.6",
          providerId: "moonshot",
          sourceType: "remote",
          status: "active",
          healthStatus: "degraded",
        },
        {
          endpointId: "local.offline",
          modelId: "offline-model",
          providerId: "local-openai-compatible",
          sourceType: "local",
          status: "offline",
          healthStatus: "offline",
        },
      ]),
    ).toEqual({
      localModelCount: 1,
      remoteModelCount: 1,
      localEndpointCount: 1,
      remoteEndpointCount: 2,
    });
  });
});

describe("buildAliasReadinessRows", () => {
  test("summarizes alias pools across mixed local and remote endpoint candidates", () => {
    expect(
      buildAliasReadinessRows(
        [
          {
            aliasId: "gpt-5.4",
            modelIds: ["gpt-5.4", "moonshot/kimi-k2.5"],
            mode: "hybrid",
          },
          {
            aliasId: "local-only",
            modelIds: ["gpt-5.4"],
            mode: "basic",
          },
        ],
        [
          {
            endpointId: "cli.local.coder",
            modelId: "gpt-5.4",
            providerId: null,
            sourceType: "local",
            healthStatus: "healthy",
            status: "active",
          },
          {
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
            modelId: "moonshot/kimi-k2.5",
            providerId: "moonshot",
            sourceType: "remote",
            healthStatus: "degraded",
            status: "degraded",
          },
        ],
      ),
    ).toEqual([
      {
        aliasId: "gpt-5.4",
        modeLabel: "hybrid",
        modelIds: ["gpt-5.4", "moonshot/kimi-k2.5"],
        endpointCount: 2,
        localEndpointCount: 1,
        remoteEndpointCount: 1,
        activeEndpointCount: 1,
        healthyEndpointCount: 1,
        readinessLabel: "degraded",
        sourceSummary: "1 local / 1 remote",
      },
      {
        aliasId: "local-only",
        modeLabel: "basic",
        modelIds: ["gpt-5.4"],
        endpointCount: 1,
        localEndpointCount: 1,
        remoteEndpointCount: 0,
        activeEndpointCount: 1,
        healthyEndpointCount: 1,
        readinessLabel: "ready",
        sourceSummary: "1 local / 0 remote",
      },
    ]);
  });
});

describe("buildDashboardLatestRequestRows", () => {
  test("prefers live canonical requests over benchmark telemetry rows in the overview rail", () => {
    expect(
      buildDashboardLatestRequestRows([
        {
          requestId: "req-benchmark-003",
          endpointId: "benchmark.endpoint",
          sourceType: "remote",
          createdAtMs: 300,
          requestClass: "benchmark",
        },
        {
          requestId: "req-live-002",
          clientRequestId: "req-client-002",
          endpointId: "openai.personal.primary.us-east-1.fast",
          sourceType: "remote",
          createdAtMs: 200,
          latencyMs: 420,
          totalTokens: 88,
          requestClass: "live_request",
        },
        {
          requestId: "req-live-001",
          endpointId: "llama-swap.local.lfm2.5-1.2b-instruct",
          sourceType: "local",
          createdAtMs: 100,
          latencyMs: 120,
          totalTokens: 32,
          requestClass: "live_request",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        requestId: "req-live-002",
        clientRequestId: "req-client-002",
      }),
      expect.objectContaining({
        requestId: "req-live-001",
      }),
    ]);
  });

  test("groups repeated alias-routed executions by caller interaction in the overview rail", () => {
    expect(
      buildDashboardLatestRequestRows([
        {
          requestId: "req-alias-003",
          clientRequestId: "req-client-007",
          endpointId: "openai.personal.primary.us-east-1.fast",
          sourceType: "remote",
          createdAtMs: 300,
          latencyMs: 480,
          totalTokens: 144,
          requestClass: "live_request",
          statusCode: 200,
        },
        {
          requestId: "req-alias-002",
          clientRequestId: "req-client-007",
          endpointId: "llama-swap.local.lfm2.5-1.2b-instruct",
          sourceType: "local",
          createdAtMs: 250,
          latencyMs: 130,
          totalTokens: 42,
          requestClass: "live_request",
          statusCode: 200,
        },
        {
          requestId: "req-benchmark-001",
          clientRequestId: "bench-001",
          endpointId: "benchmark.endpoint",
          sourceType: "remote",
          createdAtMs: 200,
          requestClass: "benchmark",
        },
        {
          requestId: "req-live-standalone-001",
          endpointId: "moonshot.personal.primary.global.kimi-k2.6",
          sourceType: "remote",
          createdAtMs: 150,
          latencyMs: 910,
          totalTokens: 96,
          requestClass: "live_request",
          statusCode: 500,
          errorClass: "execution_failed",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        requestId: "req-alias-003",
        clientRequestId: "req-client-007",
        primaryLabel: "req-client-007",
        secondaryLabel: "2 routed executions",
        endpointLabel: "2 endpoints",
      }),
      expect.objectContaining({
        requestId: "req-live-standalone-001",
        primaryLabel: "req-live-standalone-001",
        endpointLabel: "moonshot.personal.primary.global.kimi-k2.6",
      }),
    ]);
  });
});

describe("buildStructuredLogRows", () => {
  test("parses raw logs into structured rows with source, severity, and request correlation when available", () => {
    expect(
      buildStructuredLogRows(
        [
          "2026-05-17T12:00:00.000Z INFO proxy req-runtime-ui-routing-001 Forwarded request",
          "2026-05-17T12:00:01.000Z WARN upstream Retry against remote provider",
          "local llama-swap model loaded",
        ].join("\n"),
        "local",
      ),
    ).toEqual([
      {
        key: "2026-05-17T12:00:00.000Z INFO proxy req-runtime-ui-routing-001 Forwarded request-1",
        timestamp: "2026-05-17T12:00:00.000Z",
        sourceClass: "proxy",
        severity: "info",
        requestId: "req-runtime-ui-routing-001",
        message: "Forwarded request",
        rawLine: "2026-05-17T12:00:00.000Z INFO proxy req-runtime-ui-routing-001 Forwarded request",
      },
      {
        key: "2026-05-17T12:00:01.000Z WARN upstream Retry against remote provider-1",
        timestamp: "2026-05-17T12:00:01.000Z",
        sourceClass: "upstream",
        severity: "warn",
        requestId: null,
        message: "Retry against remote provider",
        rawLine: "2026-05-17T12:00:01.000Z WARN upstream Retry against remote provider",
      },
      {
        key: "local llama-swap model loaded-1",
        timestamp: null,
        sourceClass: "local",
        severity: null,
        requestId: null,
        message: "local llama-swap model loaded",
        rawLine: "local llama-swap model loaded",
      },
    ]);
  });

  test("preserves request correlation for packaged runtime log lines without explicit severity tokens", () => {
    expect(
      buildStructuredLogRows(
        "[2026-06-15T07:46:25.679Z] req-runtime-host-bridge endpoint=moonshot.personal.primary.global.kimi-k2.5 model=moonshot/kimi-k2.5 status=200 latency_ms=63",
        "combined",
      ),
    ).toEqual([
      {
        key: "[2026-06-15T07:46:25.679Z] req-runtime-host-bridge endpoint=moonshot.personal.primary.global.kimi-k2.5 model=moonshot/kimi-k2.5 status=200 latency_ms=63-1",
        timestamp: "2026-06-15T07:46:25.679Z",
        sourceClass: "combined",
        severity: null,
        requestId: "req-runtime-host-bridge",
        message:
          "endpoint=moonshot.personal.primary.global.kimi-k2.5 model=moonshot/kimi-k2.5 status=200 latency_ms=63",
        rawLine:
          "[2026-06-15T07:46:25.679Z] req-runtime-host-bridge endpoint=moonshot.personal.primary.global.kimi-k2.5 model=moonshot/kimi-k2.5 status=200 latency_ms=63",
      },
    ]);
  });
});

describe("buildAccountModelCatalogIds", () => {
  test("prefers provider catalog order while constraining to account-allowed models", () => {
    expect(
      buildAccountModelCatalogIds({
        account: {
          providerId: "moonshot",
          allowedModels: ["moonshot/kimi-k2.5", "moonshot/kimi-k2.6"],
        },
        providers: [
          {
            providerId: "moonshot",
            displayName: "Moonshot AI",
            modelIds: ["moonshot/kimi-k2.6", "moonshot/kimi-k2.5"],
          },
        ],
        models: [
          {
            id: "moonshot/kimi-k2.5",
          },
          {
            id: "moonshot/kimi-k2.6",
          },
        ],
      }),
    ).toEqual(["moonshot/kimi-k2.6", "moonshot/kimi-k2.5"]);
  });
});

describe("buildConfiguredProviderRows", () => {
  test("summarizes configured providers and models from saved accounts plus live endpoints", () => {
    expect(
      buildConfiguredProviderRows({
        accounts: [
          {
            providerAccountId: "moonshot.personal.primary",
            providerId: "moonshot",
            authMode: "api-key-static",
            healthStatus: "healthy",
            status: "active",
            allowedModels: ["moonshot/kimi-k2.6", "moonshot/kimi-k2.5"],
          },
          {
            providerAccountId: "moonshot.personal.kimi-code",
            providerId: "moonshot",
            authMode: "oauth2-device-code",
            healthStatus: "healthy",
            status: "active",
            allowedModels: ["moonshot/kimi-k2.6"],
          },
          {
            providerAccountId: "moonshot.personal.pending",
            providerId: "moonshot",
            authMode: "oauth2-device-code",
            healthStatus: "credentials-missing",
            status: "disabled",
            allowedModels: ["moonshot/kimi-k2.5"],
          },
        ],
        endpoints: [
          {
            endpointId: "moonshot.litellm.global.moonshot-kimi-k2-6",
            providerId: "moonshot",
            providerAccountId: "moonshot.personal.primary",
            modelId: "moonshot/kimi-k2.6",
            status: "active",
          },
          {
            endpointId: "moonshot.litellm.global.moonshot-kimi-k2-5",
            providerId: "moonshot",
            providerAccountId: "moonshot.personal.primary",
            modelId: "moonshot/kimi-k2.5",
            status: "degraded",
          },
        ],
        deviceAuthorizations: [
          {
            authRequestId: "auth-001",
            providerAccountId: "moonshot.personal.pending",
            providerId: "moonshot",
            status: "pending",
          },
        ],
      }),
    ).toEqual([
      {
        providerId: "moonshot",
        accountIds: [
          "moonshot.personal.kimi-code",
          "moonshot.personal.pending",
          "moonshot.personal.primary",
        ],
        authModes: ["api-key-static", "oauth2-device-code"],
        configuredModels: ["moonshot/kimi-k2.5", "moonshot/kimi-k2.6"],
        endpointModels: ["moonshot/kimi-k2.5", "moonshot/kimi-k2.6"],
        endpointCount: 2,
        activeEndpointCount: 1,
        healthStatuses: ["credentials-missing", "healthy"],
        pendingDeviceAuthorizationCount: 1,
        envUnresolvedAccountCount: 0,
        expiredAuthAccountCount: 0,
        credentialsMissingAccountCount: 0,
        connectedWithoutEndpointCount: 1,
        readyAccountCount: 1,
      },
    ]);
  });

  test("prefers canonical provider rollups over route-local readiness inference", () => {
    expect(
      buildConfiguredProviderRows({
        accounts: [
          {
            providerAccountId: "moonshot.personal.primary",
            providerId: "moonshot",
            authMode: "api-key-static",
            healthStatus: "healthy",
            status: "active",
            allowedModels: ["moonshot/kimi-k2.6"],
          },
        ],
        endpoints: [],
        deviceAuthorizations: [],
        providerRollups: [
          {
            providerId: "moonshot",
            accountIds: ["moonshot.personal.primary"],
            countsByLifecycle: {
              executionReady: 4,
              connectedNoEndpoint: 3,
              pendingAuthorization: 2,
              expiredAuth: 1,
              credentialsMissing: 5,
              envUnresolved: 6,
              archivedStale: 0,
            },
            readyAccountIds: ["moonshot.personal.primary"],
            attentionAccountIds: ["moonshot.personal.primary"],
            hasArchivedArtifacts: false,
          },
        ],
      } as never),
    ).toEqual([
      expect.objectContaining({
        providerId: "moonshot",
        pendingDeviceAuthorizationCount: 2,
        envUnresolvedAccountCount: 6,
        expiredAuthAccountCount: 1,
        credentialsMissingAccountCount: 5,
        connectedWithoutEndpointCount: 3,
        readyAccountCount: 4,
      }),
    ]);
  });

  test("preserves env-unresolved and reconnect-required provider lifecycle counts from fallback account inference", () => {
    expect(
      buildConfiguredProviderRows({
        accounts: [
          {
            providerAccountId: "openrouter.personal.primary",
            providerId: "openrouter",
            authMode: "api-key-static",
            healthStatus: "env-unresolved",
            status: "disabled",
            allowedModels: ["openrouter/gpt-4.1-mini"],
          },
          {
            providerAccountId: "openrouter.personal.backup",
            providerId: "openrouter",
            authMode: "oauth2-device-code",
            healthStatus: "expired-auth",
            status: "disabled",
            allowedModels: ["openrouter/gpt-4.1-mini"],
          },
        ],
        endpoints: [],
        deviceAuthorizations: [],
      }),
    ).toEqual([
      expect.objectContaining({
        providerId: "openrouter",
        envUnresolvedAccountCount: 1,
        expiredAuthAccountCount: 1,
        credentialsMissingAccountCount: 0,
        connectedWithoutEndpointCount: 0,
        readyAccountCount: 0,
      }),
    ]);
  });
});

describe("buildProviderMaintenanceRows", () => {
  test("formats saved-account lifecycle badges and normalized credential posture from the canonical lifecycle contract", () => {
    expect(
      buildProviderMaintenanceRows({
        accounts: [
          {
            providerAccountId: "moonshot.personal.primary",
            providerId: "moonshot",
            authMode: "api-key-static",
            credentialRef: {
              backend: "local-encrypted-file",
              ref: "api-key/moonshot/moonshot.personal.primary",
            },
            baseUrlOverride: "https://api.moonshot.ai",
            allowedModels: ["moonshot/kimi-k2.6"],
            modelRoleBindings: [
              {
                modelId: "moonshot/kimi-k2.6",
                roleIds: ["chat"],
              },
            ],
          },
        ],
        summary: {
          credentialLifecycle: {
            accounts: [
              {
                logicalAccountId: "moonshot.personal.primary",
                providerAccountId: "moonshot.personal.primary",
                providerId: "moonshot",
                sourceProvenance: ["manual"],
                authMode: "api-key-static",
                credentialStorageMode: "persisted-local",
                credentialBackendCanonical: "local-file",
                lifecycleState: "credentials-missing",
                reasonCode: "credential-material-missing",
                blocking: true,
                activeEndpointIds: [],
                configuredModelIds: ["moonshot/kimi-k2.6"],
                availableActions: ["update-api-key"],
              },
            ],
          },
        } as never,
      }),
    ).toEqual([
      expect.objectContaining({
        providerAccountId: "moonshot.personal.primary",
        providerId: "moonshot",
        authMode: "api-key-static",
        lifecycleLabel: "Credentials missing",
        lifecycleTone: "warning",
        reasonLabel: "Credential material is missing",
        storageLabel: "Persisted local credential",
        storageDetail: "Canonical backend: local-file",
        sourceProvenanceLabel: "manual",
        availableActions: ["update-api-key"],
        availableActionsLabel: "Update API key",
        activeEndpointCount: 0,
        allowedModels: ["moonshot/kimi-k2.6"],
      }),
    ]);
  });
});

describe("buildConfiguredRemoteConnectionRows", () => {
  test("shows only configured remote endpoints and their models, excluding maintenance-only and local accounts", () => {
    expect(
      buildConfiguredRemoteConnectionRows({
        accounts: [
          {
            providerAccountId: "deepseek.capture.account",
            providerId: "deepseek",
            authMode: "api-key-static",
            baseUrlOverride: null,
            allowedModels: ["deepseek/chat-capture-v1"],
          },
          {
            providerAccountId: "local-openai-compatible.personal.123",
            providerId: "local-openai-compatible",
            authMode: "api-key-static",
            baseUrlOverride: "http://127.0.0.1:1234/v1",
            allowedModels: ["local/model-a"],
          },
          {
            providerAccountId: "openai.personal.primary",
            providerId: "openai",
            authMode: "oauth2-device-code",
            baseUrlOverride: null,
            allowedModels: ["chatgpt/gpt-5.4"],
          },
        ],
        endpoints: [
          {
            endpointId: "local-openai-compatible.personal.123.local.model-a",
            providerAccountId: "local-openai-compatible.personal.123",
            providerId: "local-openai-compatible",
            modelId: "local/model-a",
            sourceType: "local",
            status: "active",
            healthStatus: "healthy",
            routingEligible: true,
            benchmarkEligible: true,
          },
          {
            endpointId: "openai.personal.primary.global.gpt-5.4",
            providerAccountId: "openai.personal.primary",
            providerId: "openai",
            modelId: "chatgpt/gpt-5.4",
            sourceType: "remote",
            status: "active",
            healthStatus: "healthy",
            routingEligible: true,
            benchmarkEligible: true,
          },
        ],
        models: [
          {
            id: "chatgpt/gpt-5.4",
            displayName: "GPT-5.4",
            endpoint_ids: ["openai.personal.primary.global.gpt-5.4"],
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        providerAccountId: "openai.personal.primary",
        providerId: "openai",
        endpointCount: 1,
        endpoints: [
          expect.objectContaining({
            endpointId: "openai.personal.primary.global.gpt-5.4",
            modelId: "chatgpt/gpt-5.4",
            displayName: "GPT-5.4",
          }),
        ],
      }),
    ]);
  });
});

describe("summarizeWorkbenchResult", () => {
  test("extracts text, tool calls, tool executions, and usage for the studio inspector", () => {
    expect(
      summarizeWorkbenchResult({
        model: "moonshot/kimi-k2.5",
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        outputText: "Registry lookup complete.",
        toolCalls: [
          {
            id: "call_001",
            type: "function",
            function: {
              name: "lookupRegistry",
              arguments: '{"endpointId":"cli.local.coder"}',
            },
          },
        ],
        toolExecutions: [
          {
            connectorId: "mcp.registry",
            toolName: "lookupRegistry",
            status: "succeeded",
            durationMs: 12,
          },
        ],
        usage: {
          inputTokens: 44,
          outputTokens: 19,
        },
      }),
    ).toEqual(
      expect.objectContaining({
        outputText: "Registry lookup complete.",
        toolCalls: [
          expect.objectContaining({
            name: "lookupRegistry",
          }),
        ],
        toolExecutions: [
          expect.objectContaining({
            connectorId: "mcp.registry",
            status: "succeeded",
          }),
        ],
        usageRows: [
          { label: "Input tokens", value: "44" },
          { label: "Output tokens", value: "19" },
        ],
      }),
    );
  });

  test("falls back to reasoning_content when chat completion content is empty", () => {
    expect(
      summarizeWorkbenchResult({
        choices: [
          {
            message: {
              content: "",
              reasoning_content: "Reasoning-only assistant reply.",
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
        },
      }),
    ).toEqual(
      expect.objectContaining({
        outputText: "Reasoning-only assistant reply.",
      }),
    );
  });
});

describe("buildDownstreamProviderGuide", () => {
  test("creates stable connection rows and examples for downstream OpenAI-compatible clients", () => {
    expect(
      buildDownstreamProviderGuide({
        kind: "openai-compatible",
        providerId: "role-model-runtime",
        displayName: "Role Model Runtime",
        baseUrl: "http://127.0.0.1:8091",
        endpoints: {
          health: "http://127.0.0.1:8091/healthz",
          models: "http://127.0.0.1:8091/v1/models",
          chatCompletions: "http://127.0.0.1:8091/v1/chat/completions",
        },
        authentication: {
          type: "bearer",
          headerName: "Authorization",
          required: false,
          placeholderToken: "role-model-local",
          note: "Inbound API-key validation is not enforced yet. If a downstream client requires a token field, use this placeholder bearer token.",
        },
        models: [
          {
            id: "moonshot/kimi-k2.5",
          },
          {
            id: "openai/gpt-4.1-mini-fast",
          },
        ],
        setup: {
          recommendedModel: "moonshot/kimi-k2.5",
          notes: [
            "Configure downstream tooling as an OpenAI-compatible provider.",
            "Use GET /v1/models to discover the current model ids.",
            "Use POST /v1/chat/completions for routed chat inference.",
          ],
        },
      }),
    ).toEqual({
      connectionRows: [
        { label: "Provider type", value: "OpenAI-compatible" },
        { label: "Base URL (standard)", value: "http://127.0.0.1:8091" },
        { label: "Base URL (/v1 suffix)", value: "http://127.0.0.1:8091/v1" },
        { label: "Models endpoint", value: "http://127.0.0.1:8091/v1/models" },
        { label: "Chat endpoint", value: "http://127.0.0.1:8091/v1/chat/completions" },
        { label: "Auth header", value: "Authorization: Bearer role-model-local" },
      ],
      availableModels: ["moonshot/kimi-k2.5", "openai/gpt-4.1-mini-fast"],
      opencodeSteps: [
        "Choose an OpenAI-compatible provider entry in the downstream client.",
        "Set the base URL to http://127.0.0.1:8091 (most clients) or http://127.0.0.1:8091/v1 (clients that expect /v1 in the base URL).",
        "If the client requires an API key, use role-model-local as the bearer token.",
        "Select a model returned by http://127.0.0.1:8091/v1/models.",
      ],
      examples: {
        modelsCurl: "curl http://127.0.0.1:8091/v1/models",
        chatCurl:
          'curl http://127.0.0.1:8091/v1/chat/completions -H "content-type: application/json" -H "Authorization: Bearer role-model-local" -d \'{"model":"moonshot/kimi-k2.5","messages":[{"role":"user","content":"Reply with ok."}]}\'',
      },
    });
  });
});

describe("buildActivitySummary", () => {
  test("turns raw activity metrics into operator summary cards and ledger rows", () => {
    expect(
      buildActivitySummary([
        {
          id: 7,
          timestamp: "2026-05-07T04:00:00.000Z",
          model: "moonshot/kimi-k2.5",
          req_path: "/v1/chat/completions",
          resp_content_type: "application/json",
          resp_status_code: 200,
          tokens: {
            cache_tokens: 12,
            input_tokens: 44,
            output_tokens: 19,
            prompt_per_second: 88.1,
            tokens_per_second: 45.2,
          },
          duration_ms: 840,
          has_capture: true,
        },
        {
          id: 8,
          timestamp: "2026-05-07T04:01:00.000Z",
          model: "openai/gpt-4.1-mini-fast",
          req_path: "/v1/responses",
          resp_content_type: "application/json",
          resp_status_code: 500,
          tokens: {
            cache_tokens: 0,
            input_tokens: 10,
            output_tokens: 0,
            prompt_per_second: 12.4,
            tokens_per_second: 0,
          },
          duration_ms: 1600,
          has_capture: false,
        },
      ]),
    ).toEqual({
      facts: [
        { label: "Entries", value: "2", detail: "1 with captures" },
        { label: "Errors", value: "1", detail: "Most recent status: 200" },
        { label: "Prompt tokens", value: "54", detail: "19 output tokens recorded" },
        {
          label: "Cached tokens",
          value: "12",
          detail: "Across the current in-memory metrics window",
        },
      ],
      rows: [
        expect.objectContaining({
          id: 7,
          model: "moonshot/kimi-k2.5",
          path: "/v1/chat/completions",
          status: "200",
          durationLabel: "840 ms",
          captureLabel: "Capture available",
        }),
        expect.objectContaining({
          id: 8,
          model: "openai/gpt-4.1-mini-fast",
          path: "/v1/responses",
          status: "500",
          durationLabel: "1600 ms",
          captureLabel: "No capture",
        }),
      ],
    });
  });

  test("preserves newest-first activity order from the metrics API instead of re-sorting by synthetic ids", () => {
    expect(
      buildActivitySummary([
        {
          id: 1,
          timestamp: "2026-05-07T04:01:00.000Z",
          model: "openai/gpt-4.1-mini-fast",
          req_path: "/v1/responses",
          resp_content_type: "application/json",
          resp_status_code: 200,
          tokens: {
            cache_tokens: 0,
            input_tokens: 10,
            output_tokens: 12,
            prompt_per_second: 12.4,
            tokens_per_second: 20,
          },
          duration_ms: 1600,
          has_capture: false,
        },
        {
          id: 99,
          timestamp: "2026-05-07T04:00:00.000Z",
          model: "moonshot/kimi-k2.5",
          req_path: "/v1/chat/completions",
          resp_content_type: "application/json",
          resp_status_code: 200,
          tokens: {
            cache_tokens: 12,
            input_tokens: 44,
            output_tokens: 19,
            prompt_per_second: 88.1,
            tokens_per_second: 45.2,
          },
          duration_ms: 840,
          has_capture: true,
        },
      ]).rows.map((row) => row.id),
    ).toEqual([1, 99]);
  });
});

describe("telemetry view models", () => {
  test("creates stable summary cards from the canonical telemetry summary", () => {
    expect(
      summarizeTelemetryStats({
        requestCount: 3,
        successCount: 2,
        failureCount: 1,
        totalInputTokens: 96,
        totalOutputTokens: 30,
        totalTokens: 126,
        cachedRequestCount: 1,
        totalActualCostUsd: 0.0042,
        totalEstimatedCostUsd: 0.0053,
        totalEffectiveCostUsd: 0.0053,
        averageLatencyMs: 420,
        p95LatencyMs: 880,
        lastSeenAtMs: 1_770_000_000_100,
        sourceBreakdown: {
          local: {
            requestCount: 1,
            successCount: 1,
            failureCount: 0,
            totalInputTokens: 32,
            totalOutputTokens: 14,
            totalTokens: 46,
            cachedRequestCount: 0,
            totalActualCostUsd: 0,
            totalEstimatedCostUsd: 0.0011,
            averageLatencyMs: 280,
            p95LatencyMs: 280,
            lastSeenAtMs: 1_770_000_000_000,
          },
          remote: {
            requestCount: 2,
            successCount: 1,
            failureCount: 1,
            totalInputTokens: 64,
            totalOutputTokens: 16,
            totalTokens: 80,
            cachedRequestCount: 1,
            totalActualCostUsd: 0.0042,
            totalEstimatedCostUsd: 0.0042,
            averageLatencyMs: 490,
            p95LatencyMs: 880,
            lastSeenAtMs: 1_770_000_000_100,
          },
        },
      }),
    ).toEqual([
      {
        label: "Requests",
        value: "3",
        detail: "1 local · 2 remote",
      },
      { label: "Failures", value: "1", detail: "2 successful requests" },
      {
        label: "Latency",
        value: "420 ms avg",
        detail: "880 ms p95 · 420 ms avg",
      },
      {
        label: "Tokens",
        value: "126",
        detail: "1 cached · $0.0053 effective",
      },
    ]);
  });

  test("builds telemetry comparison cards for local and remote endpoint rows", () => {
    expect(
      buildTelemetryComparisonCards([
        {
          endpointId: "llama-swap.local.lfm2.5-1.2b-instruct",
          modelId: "lfm2.5-1.2b-instruct",
          sourceType: "local",
          providerFamily: "llama-swap",
          promptCacheSupported: false,
          status: "active",
          requestCount: 1,
          successCount: 1,
          failureCount: 0,
          totalTokens: 46,
          averageLatencyMs: 280,
          p95LatencyMs: 280,
          totalActualCostUsd: 0,
          totalEstimatedCostUsd: 0.0011,
          cachedRequestCount: 0,
          healthStatus: "healthy",
          roleIds: ["general.chat"],
          providerId: null,
          endpointKind: "local_engine",
          servingSource: "local-process",
          totalInputTokens: 32,
          totalOutputTokens: 14,
          lastSeenAtMs: 1_770_000_000_000,
          providerKind: "local_openai_compat",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        endpointId: "llama-swap.local.lfm2.5-1.2b-instruct",
        sourceLabel: "Local",
        providerLabel: "llama-swap",
        cacheLabel: "Caching unavailable",
        reliabilityLabel: "0 failures / 1 success",
        latencyLabel: "280 ms p95 / 280 ms avg",
        tokenLabel: "46 tokens",
        costLabel: "$0.0011 est.",
        roleSummary: "general.chat",
      }),
    ]);
  });

  test("builds telemetry-backed request ledger rows in newest-first order", () => {
    expect(
      buildTelemetryRequestRows([
        {
          requestId: "req-001",
          endpointId: "llama-swap.local.lfm2.5-1.2b-instruct",
          modelId: "lfm2.5-1.2b-instruct",
          sourceType: "local",
          providerFamily: "llama-swap",
          createdAtMs: 1_770_000_000_000,
          latencyMs: 280,
          totalTokens: 46,
          actualCostUsd: 0,
          estimatedCostUsd: 0.0011,
          errorClass: null,
          statusCode: 200,
          finishReason: "stop",
          promptCacheSupported: false,
          promptCacheRequested: false,
          promptCacheUsed: false,
          streamTextDeltaCount: 2,
          streamTextSupported: true,
          streamToolCallDeltaCount: 0,
          streamToolCallSupported: false,
          streamToolArgumentDeltaCount: 0,
          streamToolArgumentSupported: false,
        },
        {
          requestId: "req-002",
          routingDecisionId: "route-002",
          endpointId: "openai.personal.primary.us-east-1.fast",
          modelId: "openai/gpt-4.1-mini-fast",
          sourceType: "remote",
          providerFamily: "ai-sdk-openai",
          providerId: "openai",
          createdAtMs: 1_770_000_000_100,
          latencyMs: 880,
          totalTokens: 80,
          actualCostUsd: 0.0042,
          estimatedCostUsd: 0.0042,
          errorClass: "upstream_timeout",
          statusCode: 504,
          finishReason: "length",
          promptCacheSupported: true,
          promptCacheRequested: true,
          promptCacheUsed: true,
          streamTextDeltaCount: 4,
          streamTextSupported: true,
          streamToolCallDeltaCount: 1,
          streamToolCallSupported: true,
          streamToolArgumentDeltaCount: 2,
          streamToolArgumentSupported: true,
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        requestId: "req-002",
        routingDecisionLabel: "route-002",
        sourceLabel: "Remote",
        statusLabel: "504 Upstream timeout",
        providerFamilyLabel: "openai",
        finishReasonLabel: "length",
        cacheLabel: "Cache hit",
        streamLabel: "4 text deltas / 1 tool / 2 args",
        latencyLabel: "880 ms",
        tokenLabel: "80 tokens",
        costLabel: "$0.0042 actual",
      }),
      expect.objectContaining({
        requestId: "req-001",
        sourceLabel: "Local",
        statusLabel: "200 ok",
        providerFamilyLabel: "llama-swap",
        finishReasonLabel: "stop",
        cacheLabel: "Caching unavailable",
        streamLabel: "2 text deltas",
        latencyLabel: "280 ms",
        tokenLabel: "46 tokens",
        costLabel: "$0.0011 est.",
      }),
    ]);
  });

  test("prefers descriptive failure summaries over raw error-class slugs for failed request rows", () => {
    expect(
      buildTelemetryRequestRows([
        {
          requestId: "req-003",
          endpointId: "routing.failed.pre-execution",
          modelId: "difficulty.remote-only",
          sourceType: "remote",
          createdAtMs: 1_770_000_000_200,
          latencyMs: 952,
          totalTokens: 0,
          actualCostUsd: 0,
          estimatedCostUsd: 0,
          errorClass: "execution_failed",
          statusCode: 400,
          finishReason: null,
          promptCacheSupported: true,
          promptCacheRequested: false,
          promptCacheUsed: false,
          streamTextDeltaCount: 0,
          streamTextSupported: false,
          streamToolCallDeltaCount: 0,
          streamToolCallSupported: false,
          streamToolArgumentDeltaCount: 0,
          streamToolArgumentSupported: false,
          dimensions: {
            errorContext: {
              message: "No eligible remote endpoint satisfied alias difficulty.remote-only.",
            },
          },
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        requestId: "req-003",
        statusLabel: "400 No eligible remote endpoint satisfied alias difficulty.remote-only.",
      }),
    ]);
  });
});
