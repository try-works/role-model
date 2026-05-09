import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { NormalizedCatalog, NormalizedCatalogModel } from "@role-model-router/catalog";
import { assembleContextEnvelope } from "@role-model-router/context-envelope";
import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import { buildEndpointRegistry, type RegistrySources } from "@role-model-router/endpoint-registry";
import { routeRuntimeRequest, type RoutingModelSelection } from "@role-model-router/protocol-routing";
import { createAnthropicProviderAdapter } from "@role-model-router/provider-anthropic";
import { createLiteLLMProviderAdapter } from "@role-model-router/provider-litellm";
import {
  createMcpConnectorDefinitions,
  type DeclaredMcpConnectorConfig,
} from "@role-model-router/provider-mcp";
import { type ProviderAccountRecord, validateProviderAccounts } from "@role-model-router/provider-account";
import { createOpenAIProviderAdapter } from "@role-model-router/provider-openai";
import { ProcessSupervisor } from "@role-model-router/process-supervisor";
import { createRetrievalReceipt } from "@role-model-router/retrieval-receipt";
import type { ObservedPerformanceSample } from "@role-model-router/profile-aggregator";
import {
  createRuntimeObservationBundle,
  type RuntimeCapturePolicy,
  type RuntimeObservationBundle,
} from "@role-model-router/runtime-observability";
import {
  createToolRegistry,
  executeToolCalls,
  type ToolConnector,
  type ToolRegistry,
  type ToolRegistryExecution,
} from "@role-model-router/tool-registry";
import {
  initializeSqliteMemory,
  listRuntimeEndpoints,
  listProviderAccounts,
  listRuntimeTelemetryComparisonRows,
  listRuntimeTelemetryRecords,
  persistContinuitySnapshot,
  persistProviderAccounts,
  persistRuntimeObservationBundle,
  persistRetrievalReceipt,
  listRecentRuntimeObservations,
  readConversationContinuity,
  readLatestObservedProfile,
  readObservedPerformanceSamples,
  readProviderDeviceAuthSession,
  readRuntimeMaintenancePolicy,
  readRuntimeControllerAssignment,
  readRuntimeObservationBundle,
  readRuntimeTelemetrySummary,
  upsertProviderDeviceAuthSession,
  upsertProviderAccount as upsertSqliteProviderAccount,
  upsertRuntimeControllerAssignment,
  upsertRuntimeEndpoint as upsertSqliteRuntimeEndpoint,
} from "@role-model-router/sqlite-memory";

import {
  executeLiveRoutedRequest,
  type ProviderRequestCapture,
  type ResolvedExecutionTarget,
  type RuntimeExecutionRequest,
  type RuntimeResponseCaptureMap,
} from "@role-model-router/adapter-execution";
import type { VendorRuntime, VendorRuntimeStatus } from "@role-model-router/vendor-abstraction";
import { createVendorNotConfiguredError } from "@role-model-router/vendor-abstraction";
import { startLlamaSwapVendor } from "@role-model-router/vendor-llama-swap";
import { startLiteLLMVendor } from "@role-model-router/vendor-litellm";

import {
  normalizeUnifiedRuntimeConfigInput,
  parseUnifiedRuntimeConfigText,
  renderUnifiedRuntimeConfigText,
  type UnifiedRuntimeConfig,
  type UnifiedRuntimeExecutionMode,
} from "./unified-runtime-config.js";
import { resolveLlamaSwapCommand } from "./runtime-assets.js";
import {
  deriveLiteLLMProviders,
  extractLiteLLMModelIds,
  loadLiteLLMModelPrices,
  type LiteLLMProviderInfo,
} from "@role-model-router/catalog";

interface OpenAIChatCompletionsTool {
  readonly type: string;
  readonly function?: {
    readonly name: string;
    readonly description?: string;
    readonly parameters: Record<string, unknown>;
  };
}

interface OpenAIChatCompletionsMessage {
  readonly role: string;
  readonly content: string;
}

interface OpenAIChatCompletionsBody {
  readonly model: string;
  readonly messages: readonly OpenAIChatCompletionsMessage[];
  readonly tools?: readonly OpenAIChatCompletionsTool[];
  readonly stream?: boolean;
  readonly max_tokens?: number;
  readonly temperature?: number;
}

interface OpenAIResponsesTool {
  readonly type: string;
  readonly name?: string;
  readonly description?: string;
  readonly parameters?: Record<string, unknown>;
}

type OpenAIResponsesInput = string | readonly OpenAIChatCompletionsMessage[];

interface OpenAIResponsesBody {
  readonly model: string;
  readonly input: OpenAIResponsesInput;
  readonly tools?: readonly OpenAIResponsesTool[];
  readonly stream?: boolean;
  readonly max_output_tokens?: number;
  readonly temperature?: number;
}

export interface BridgeModelRecord {
  readonly id: string;
  readonly object: "model";
  readonly owned_by: "role-model";
  readonly endpoint_ids: readonly string[];
}

export interface BridgeModelListResponse {
  readonly object: "list";
  readonly data: readonly BridgeModelRecord[];
}

export interface BridgeDownstreamOpenAIProviderConfig {
  readonly kind: "openai-compatible";
  readonly providerId: "role-model-runtime";
  readonly displayName: "Role Model Runtime";
  readonly baseUrl: string;
  readonly endpoints: {
    readonly health: string;
    readonly models: string;
    readonly chatCompletions: string;
    readonly responses: string;
  };
  readonly authentication: {
    readonly type: "bearer";
    readonly headerName: "Authorization";
    readonly required: false;
    readonly placeholderToken: "role-model-local";
    readonly note: string;
  };
  readonly models: readonly BridgeModelRecord[];
  readonly setup: {
    readonly recommendedModel: string | null;
    readonly notes: readonly string[];
  };
}

export interface BridgeControllerAssignment {
  readonly scope: "global";
  readonly endpointId: string;
  readonly modelId: string;
  readonly sourceType: "local" | "remote";
  readonly updatedAtMs?: number;
}

export interface BridgeExecutionPlan {
  readonly routingRequest: {
    readonly requestId: string;
    readonly taskType: "text.chat";
    readonly requiredCapabilities: readonly ["text.chat"];
    readonly preferredCapabilities: readonly [];
    readonly requiredModalities: readonly ["text"];
    readonly contextTokens: number;
    readonly needsTools: boolean;
    readonly strategy: "balanced";
    readonly preferLocal: false;
    readonly allowEndpoints: readonly string[];
  };
  readonly executionRequest: {
    readonly messages: readonly OpenAIChatCompletionsMessage[];
    readonly tools?: readonly {
      readonly name: string;
      readonly description?: string;
      readonly inputSchema: Record<string, unknown>;
    }[];
    readonly stream?: boolean;
    readonly maxOutputTokens?: number;
    readonly temperature?: number;
  };
}

export interface BridgeServer {
  readonly port: number;
  close(): Promise<void>;
}

export interface BridgeChatCompletionsExecutionResult {
  readonly model: string;
  readonly endpointId: string;
  readonly adapterFamily: string;
  readonly routingDecisionId?: string;
  readonly vendorId?: string;
  readonly outputText: string;
  readonly finishReason: string;
  readonly toolCalls?: readonly BridgeToolCall[];
  readonly toolExecutions?: readonly ToolRegistryExecution[];
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
  readonly vendorMetadata?: {
    readonly costUsd?: number;
    readonly cacheUsed?: boolean;
  };
}

export interface BridgeResponsesExecutionResult {
  readonly responseId: string;
  readonly model: string;
  readonly endpointId: string;
  readonly adapterFamily: string;
  readonly routingDecisionId?: string;
  readonly vendorId?: string;
  readonly outputText: string;
  readonly finishReason: string;
  readonly toolCalls?: readonly BridgeToolCall[];
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
  readonly vendorMetadata?: {
    readonly costUsd?: number;
    readonly cacheUsed?: boolean;
  };
}

export interface BridgeToolCall {
  readonly id: string;
  readonly type: "function";
  readonly function: {
    readonly name: string;
    readonly arguments: string;
  };
}

type BridgeStreamMetadata = {
  readonly endpointId: string;
  readonly adapterFamily: string;
  readonly routingDecisionId?: string;
};
type BridgeStreamWriter = (
  chunk: Record<string, unknown>,
  metadata?: BridgeStreamMetadata,
) => void | Promise<void>;

export interface BridgeTelemetryQuery {
  readonly windowMs?: number;
  readonly limit?: number;
  readonly endAtMs?: number;
}

export type BridgeTelemetryRequestRecord = ReturnType<typeof listRuntimeTelemetryRecords>[number] & {
  readonly sourceType: "local" | "remote";
  readonly providerId: string | null;
  readonly endpointKind: string | null;
  readonly servingSource: string | null;
  readonly healthStatus: string;
  readonly status: string;
  readonly roleIds: readonly string[];
};

export type BridgeTelemetryEndpointMeta = Omit<
  BridgeTelemetryRequestRecord,
  keyof ReturnType<typeof listRuntimeTelemetryRecords>[number]
>;

export type BridgeTelemetryComparisonRow = ReturnType<typeof listRuntimeTelemetryComparisonRows>[number] & {
  readonly sourceType: "local" | "remote";
  readonly providerId: string | null;
  readonly endpointKind: string | null;
  readonly servingSource: string | null;
  readonly healthStatus: string;
  readonly status: string;
  readonly roleIds: readonly string[];
};

export type BridgeTelemetrySummary = ReturnType<typeof readRuntimeTelemetrySummary> & {
  readonly sourceBreakdown: {
    readonly local: ReturnType<typeof readRuntimeTelemetrySummary>;
    readonly remote: ReturnType<typeof readRuntimeTelemetrySummary>;
  };
};

export interface RuntimeTelemetryStreamEvent {
  readonly eventName: "telemetry.update";
  readonly emittedAtMs: number;
  readonly summary: BridgeTelemetrySummary;
  readonly request: BridgeTelemetryRequestRecord;
}

export interface StartBridgeServerOptions {
  readonly host: string;
  readonly port: number;
  readonly registry: EndpointRegistryResult;
  readonly getRegistry?: () => EndpointRegistryResult;
  readonly executeChatCompletions: (
    body: OpenAIChatCompletionsBody,
    requestId: string,
    streamWriter?: BridgeStreamWriter,
  ) => Promise<BridgeChatCompletionsExecutionResult>;
  readonly executeResponses: (
    body: OpenAIResponsesBody,
    requestId: string,
    streamWriter?: BridgeStreamWriter,
  ) => Promise<BridgeResponsesExecutionResult>;
  readonly readVersionInfo?: () => Promise<unknown>;
  readonly listActivityMetrics?: () => Promise<unknown>;
  readonly readActivityCapture?: (captureId: number) => Promise<unknown>;
  readonly readLogs?: () => Promise<string>;
  readonly readRuntimeSummary?: () => Promise<unknown>;
  readonly readHealthStatus?: () => Promise<unknown>;
  readonly listProviders?: () => Promise<readonly unknown[]>;
  readonly listRoles?: () => Promise<readonly unknown[]>;
  readonly listAccounts?: () => Promise<readonly unknown[]>;
  readonly upsertProviderAccount?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly startProviderDeviceAuthorization?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly pollProviderDeviceAuthorization?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly readRuntimeConfig?: () => Promise<unknown>;
  readonly updateRuntimeConfig?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly activateEndpoint?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly listEndpoints?: () => Promise<readonly unknown[]>;
  readonly readControllerAssignment?: () => Promise<BridgeControllerAssignment | null>;
  readonly updateControllerAssignment?: (body: Record<string, unknown>) => Promise<BridgeControllerAssignment>;
  readonly listRecentRequestObservations?: () => Promise<readonly unknown[]>;
  readonly readTelemetrySummary?: (query?: BridgeTelemetryQuery) => Promise<unknown>;
  readonly listTelemetryComparisonRows?: (query?: BridgeTelemetryQuery) => Promise<readonly unknown[]>;
  readonly listTelemetryRequests?: (query?: BridgeTelemetryQuery) => Promise<readonly unknown[]>;
  readonly subscribeTelemetry?: (listener: (event: RuntimeTelemetryStreamEvent) => void) => () => void;
  readonly readRequestObservation?: (requestId: string) => Promise<unknown>;
  readonly readEndpointProfile?: (endpointId: string) => Promise<unknown>;
}

export interface RuntimeBridgeBackend {
  readonly registry: EndpointRegistryResult;
  executeChatCompletions: (
    body: OpenAIChatCompletionsBody,
    requestId: string,
    streamWriter?: BridgeStreamWriter,
  ) => Promise<BridgeChatCompletionsExecutionResult>;
  executeResponses: (
    body: OpenAIResponsesBody,
    requestId: string,
    streamWriter?: BridgeStreamWriter,
  ) => Promise<BridgeResponsesExecutionResult>;
  readRuntimeSummary(): Promise<{
    lifecycleSummary: EndpointRegistryResult["lifecycleSummary"];
    providerCount: number;
    accountCount: number;
    endpointCount: number;
    executionMode: UnifiedRuntimeExecutionMode;
    unifiedConfig: {
      enabled: boolean;
      path: string | null;
    };
  }>;
  readHealthStatus(): Promise<{
    status: "healthy" | "degraded";
    executionMode: UnifiedRuntimeExecutionMode;
    vendors: Record<string, VendorRuntimeStatus>;
    inactiveVendors: string[];
  }>;
  listProviders(): Promise<
    readonly {
      providerId: string;
      displayName: string;
      providerKind: string;
      authFamily: string;
      adapterFamily: string;
      apiBase: string;
      envVars: readonly string[];
      supportedAuthModes: readonly string[];
      controlPlaneRequirements: readonly string[];
      localOverrideApplied: boolean;
      modelIds: readonly string[];
      variants: readonly ProviderPresetVariant[];
    }[]
  >;
  listRoles(): Promise<
    readonly {
      roleId: string;
      label: string;
      description: string;
      taskTypes: readonly string[];
    }[]
  >;
  listAccounts(): Promise<ReturnType<typeof listProviderAccounts>>;
  upsertProviderAccount(account: Record<string, unknown>): Promise<ProviderAccountRecord>;
  startProviderDeviceAuthorization(body: Record<string, unknown>): Promise<DeviceAuthorizationStartResult>;
  pollProviderDeviceAuthorization(body: Record<string, unknown>): Promise<DeviceAuthorizationPollResult>;
  readRuntimeConfig(): Promise<{
    applied: boolean;
    path: string | null;
    config: UnifiedRuntimeConfig | null;
  }>;
  updateRuntimeConfig(body: Record<string, unknown>): Promise<{
    applied: boolean;
    path: string | null;
    config: UnifiedRuntimeConfig | null;
  }>;
  activateEndpoint(body: Record<string, unknown>): Promise<Record<string, unknown>>;
  readControllerAssignment(): Promise<BridgeControllerAssignment | null>;
  updateControllerAssignment(body: Record<string, unknown>): Promise<BridgeControllerAssignment>;
  listEndpoints(): Promise<
    readonly {
      endpointId: string;
      modelId: string;
      providerId: string | null;
      endpointKind: string;
      servingSource: string;
      sourceType: "local" | "remote";
      healthStatus: string;
      capabilities: readonly string[];
      toolCallingSupported: boolean;
      toolCallingStyle: string;
      status: string;
    }[]
  >;
  listRecentRequestObservations(): Promise<
    readonly ReturnType<typeof listRecentRuntimeObservations>[number][]
  >;
  readTelemetrySummary(query?: BridgeTelemetryQuery): Promise<BridgeTelemetrySummary>;
  listTelemetryComparisonRows(query?: BridgeTelemetryQuery): Promise<readonly BridgeTelemetryComparisonRow[]>;
  listTelemetryRequests(query?: BridgeTelemetryQuery): Promise<readonly BridgeTelemetryRequestRecord[]>;
  subscribeTelemetry(listener: (event: RuntimeTelemetryStreamEvent) => void): () => void;
  readRequestObservation(requestId: string): Promise<(RuntimeObservationBundle & BridgeTelemetryEndpointMeta) | null>;
  readEndpointProfile(endpointId: string): Promise<{
    endpointId: string;
    latestProfile: ReturnType<typeof readLatestObservedProfile>;
      recentSamples: readonly ObservedPerformanceSample[];
    }>;
  shutdown(): Promise<void>;
}

export interface CreateRuntimeBridgeBackendOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly unifiedRuntimeConfigPath?: string;
  readonly networkFetcher?: typeof fetch;
  readonly fixtureRoot?: string;
}

export interface BridgeServerOptions {
  readonly host: string;
  readonly port: number;
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly unifiedRuntimeConfigPath?: string;
}

class BridgeHttpError extends Error {
  readonly statusCode: number;

  readonly body: Record<string, unknown>;

  constructor(statusCode: number, body: Record<string, unknown>) {
    super(typeof body.error === "object" && body.error && "message" in body.error ? String(body.error.message) : "bridge request failed");
    this.statusCode = statusCode;
    this.body = body;
  }
}

function slugify(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function resolveEnvCredentialRef(value: string | null, fallbackName: string): ProviderAccountRecord["credentialRef"] {
  if (!value) {
    return {
      backend: "env",
      ref: fallbackName,
    };
  }
  const envMatch = /^\$\{([A-Z0-9_]+)\}$/.exec(value.trim());
  return {
    backend: "env",
    ref: envMatch?.[1] ?? value,
  };
}

function createVendorError(vendorId: string, message: string): BridgeHttpError {
  const normalized = createVendorNotConfiguredError(vendorId, message);
  return new BridgeHttpError(503, {
    error: {
      message: normalized.rawMessage,
      type: normalized.errorClass,
      code: normalized.errorClass,
    },
  });
}

function createInactiveVendorStatus(vendorId: string): VendorRuntimeStatus {
  return {
    vendorId,
    healthStatus: "inactive",
  };
}

function summarizeHealthStatus(
  vendors: Record<string, VendorRuntimeStatus>,
): {
  status: "healthy" | "degraded";
  inactiveVendors: string[];
} {
  const vendorStatuses = Object.values(vendors);
  const inactiveVendors = vendorStatuses
    .filter((vendor) => vendor.healthStatus === "inactive")
    .map((vendor) => vendor.vendorId);
  const hasUnhealthyVendor = vendorStatuses.some(
    (vendor) => vendor.healthStatus !== "healthy" && vendor.healthStatus !== "inactive",
  );
  return {
    status: hasUnhealthyVendor ? "degraded" : "healthy",
    inactiveVendors,
  };
}

function formatCostUsd(costUsd: number | undefined): string | undefined {
  if (typeof costUsd !== "number" || !Number.isFinite(costUsd)) {
    return undefined;
  }
  return costUsd.toString();
}

function createExecutionHeaders(input: {
  readonly endpointId: string;
  readonly adapterFamily: string;
  readonly routingDecisionId?: string;
  readonly costUsd?: number;
}): Record<string, string> {
  return {
    "x-role-model-endpoint-id": input.endpointId,
    "x-role-model-adapter-family": input.adapterFamily,
    ...(input.routingDecisionId ? { "x-role-model-routing-decision-id": input.routingDecisionId } : {}),
    ...(formatCostUsd(input.costUsd) ? { "x-role-model-cost-usd": formatCostUsd(input.costUsd)! } : {}),
  };
}

function createUnifiedLocalSources(config: UnifiedRuntimeConfig): RegistrySources["local"] {
  return config.llamaSwap.models.map((model) => ({
    endpointId: `llama-swap.local.${slugify(model.modelId)}`,
    providerKind: "ai-sdk-openai-compatible",
    providerId: "llama-swap",
    modelId: model.modelId,
    capabilities: ["text.chat", "tools.function_calling"],
    modalities: ["text"],
    endpointKind: "local-openai-compatible",
    servingSource: "vendor-llama-swap",
    lifecycleState: "active",
    hostClass: "localhost",
    deviceClass: "localhost",
    region: "local",
    orgScope: "runtime-config",
  }));
}

function createUnifiedCloudSources(
  config: UnifiedRuntimeConfig,
): RegistrySources["cloud"] {
  return config.liteLLM.providers.flatMap((provider) =>
    provider.modelMappings.map((mapping) => ({
      endpointId: `${provider.providerId}.litellm.global.${slugify(mapping.modelId)}`,
      providerAccountId: `${provider.providerId}.litellm`,
      modelId: mapping.modelId,
      region: "global",
      endpointKind: "remote-openai-compatible",
      servingSource: "vendor-litellm",
      lifecycleState: "active",
      healthStatus: "healthy",
      requestShapeHints: {
        providerShape: "openai.chat.completions",
        bodyKeys: ["messages", "max_tokens"],
        headerKeys: ["authorization"],
      },
    })),
  );
}

function createUnifiedProviderAccounts(
  catalog: NormalizedCatalog,
  liteLLMProviderList: readonly LiteLLMProviderInfo[],
  config: UnifiedRuntimeConfig,
  liteLLMBaseUrl: string | null,
  runtimeStateRoot: string,
  scopeId: string,
): ProviderAccountRecord[] {
  if (!liteLLMBaseUrl) {
    return [];
  }
  return config.liteLLM.providers.map((providerConfig) => {
    const provider =
      catalog.providers.find((entry) => entry.providerId === providerConfig.providerId) ??
      liteLLMProviderList.find((entry) => entry.providerId === providerConfig.providerId);
    if (!provider) {
      throw new Error(`Unified runtime provider ${providerConfig.providerId} is not present in the catalog or LiteLLM provider list.`);
    }

    // Check for existing OAuth token file (R5)
    const oauthTokenPath = path.join(runtimeStateRoot, scopeId, "credentials", "oauth", provider.providerId, `${provider.providerId}.litellm.json`);
    let hasOauthToken = false;
    try {
      const tokenContent = readFileSync(oauthTokenPath, "utf8");
      const tokenPayload = JSON.parse(tokenContent) as Record<string, unknown>;
      hasOauthToken = typeof tokenPayload.access_token === "string" && tokenPayload.access_token.length > 0;
    } catch {
      // Token file does not exist or is invalid
    }

    const supportsOAuth = provider.supportedAuthModes?.includes("oauth2-device-code") ?? false;
    const authMode = hasOauthToken && supportsOAuth
      ? "oauth2-device-code"
      : (provider.supportedAuthModes?.find((candidate) => candidate === "api-key-static") ??
         provider.supportedAuthModes?.[0] ??
         "api-key-static");

    const credentialRef = hasOauthToken && supportsOAuth
      ? {
          backend: "local-file" as const,
          ref: `oauth/${provider.providerId}/${provider.providerId}.litellm`,
        }
      : resolveEnvCredentialRef(providerConfig.apiKeyRef, `${provider.providerId.toUpperCase()}_API_KEY`);

    return {
      providerAccountId: `${providerConfig.providerId}.litellm`,
      providerId: provider.providerId,
      providerKind: provider.providerKind,
      orgScope: "runtime-config",
      accountScope: "runtime-config",
      credentialRef,
      authMode: authMode as ProviderAccountRecord["authMode"],
      regionPolicy: {
        mode: "prefer",
        regions: ["global"],
      },
      baseUrlOverride: liteLLMBaseUrl,
      allowedModels: providerConfig.modelMappings.map((mapping) => mapping.modelId),
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.runtime-config",
      quotaPolicyRef: "quota.runtime-config",
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    };
  });
}

function deleteRuntimeConfigProviderAccounts(databasePath: string): void {
  const database = new DatabaseSync(databasePath);
  try {
    database.prepare("DELETE FROM provider_accounts WHERE org_scope = ? OR account_scope = ?").run(
      "runtime-config",
      "runtime-config",
    );
  } finally {
    database.close();
  }
}

function clearRuntimeEndpoints(databasePath: string): void {
  const database = new DatabaseSync(databasePath);
  try {
    database.prepare("DELETE FROM runtime_endpoints").run();
  } finally {
    database.close();
  }
}

function readUnifiedLiteLLMProviderModelIds(
  config: UnifiedRuntimeConfig | null,
  providerId: string,
): readonly string[] | null {
  const provider = config?.liteLLM.providers.find((entry) => entry.providerId === providerId);
  if (!provider) {
    return null;
  }
  const modelIds = provider.modelMappings.map((mapping) => mapping.modelId);
  return modelIds.length > 0 ? [...new Set(modelIds)] : null;
}

function readDefaultDisplayNameFromModelId(modelId: string): string {
  const labelSource = modelId.split("/").at(-1) ?? modelId;
  return labelSource
    .split(/[-_]+/g)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function createFallbackModelTemplate(catalog: NormalizedCatalog): NormalizedCatalogModel {
  return {
    modelId: "fallback",
    providerId: "fallback",
    providerKind: "provider-openai",
    authFamily: "api-key",
    displayName: "Fallback Model",
    version: "unversioned",
    capabilities: ["text.chat", "tools.function_calling"],
    modalities: ["text"],
    contextWindow: 32768,
    maxOutputTokens: 4096,
    pricing: null,
    requestShapeHints: null,
    experimentalModes: [],
    extendsProvenance: { baseModelId: null, chain: [] },
    localOverrideApplied: true,
    localNotes: ["Fallback template for models not present in static catalog."],
    upstreamProvenance: catalog.source,
  };
}

function synthesizeUnifiedLiteLLMModel(input: {
  readonly modelId: string;
  readonly providerId: string;
  readonly catalog: NormalizedCatalog;
  readonly additionalProviders?: readonly LiteLLMProviderInfo[];
}): NormalizedCatalogModel | null {
  const provider =
    input.catalog.providers.find((entry) => entry.providerId === input.providerId) ??
    input.additionalProviders?.find((entry) => entry.providerId === input.providerId);
  if (!provider) {
    return null;
  }
  const baseModel =
    input.catalog.models.find((entry) => entry.modelId === input.modelId) ??
    input.catalog.models.find((entry) => entry.providerId === input.providerId) ??
    createFallbackModelTemplate(input.catalog);

  return {
    ...baseModel,
    modelId: input.modelId,
    providerId: input.providerId,
    providerKind: provider.providerKind,
    authFamily: provider.authFamily,
    displayName: readDefaultDisplayNameFromModelId(input.modelId),
    localOverrideApplied: true,
    localNotes: [...baseModel.localNotes, "Synthesized from unified LiteLLM runtime config model mappings."],
    upstreamProvenance: input.catalog.source,
  };
}

function applyUnifiedLiteLLMAdapterFamilyOverrides(
  catalog: NormalizedCatalog,
  config: UnifiedRuntimeConfig | null,
  additionalProviders?: readonly LiteLLMProviderInfo[],
): NormalizedCatalog {
  if (!config?.liteLLM.enabled) {
    return catalog;
  }

  const providerIds = new Set(config.liteLLM.providers.map((provider) => provider.providerId));
  if (providerIds.size === 0) {
    return catalog;
  }

  return {
    ...catalog,
    providers: catalog.providers.map((provider) =>
      providerIds.has(provider.providerId)
        ? { ...provider, adapterFamily: "litellm-proxy" }
        : provider,
    ),
    models: (() => {
      const modelsById = new Map(catalog.models.map((model) => [model.modelId, model]));
      const nextModels = [...catalog.models];
      for (const provider of config.liteLLM.providers) {
        for (const modelId of provider.modelMappings.map((mapping) => mapping.modelId)) {
          if (modelsById.has(modelId)) {
            continue;
          }
          const synthesizedModel = synthesizeUnifiedLiteLLMModel({
            modelId,
            providerId: provider.providerId,
            catalog,
            additionalProviders,
          });
          if (!synthesizedModel) {
            continue;
          }
          modelsById.set(modelId, synthesizedModel);
          nextModels.push(synthesizedModel);
        }
      }
      return nextModels;
    })(),
  };
}

function synthesizeFixtureModelsForCatalog(
  catalog: NormalizedCatalog,
  accounts: readonly ProviderAccountRecord[],
  sources: RegistrySources,
): NormalizedCatalog {
  const fixtureModelIds = new Set<string>();
  for (const source of sources.cloud) {
    fixtureModelIds.add(source.modelId);
  }
  for (const account of accounts) {
    for (const modelId of account.allowedModels) {
      fixtureModelIds.add(modelId);
    }
    for (const modelId of account.deniedModels) {
      fixtureModelIds.add(modelId);
    }
  }

  const existingModelIds = new Set(catalog.models.map((model) => model.modelId));
  const modelsToAdd: NormalizedCatalogModel[] = [];

  for (const modelId of fixtureModelIds) {
    if (existingModelIds.has(modelId)) {
      continue;
    }
    const providerId = modelId.includes("/") ? modelId.split("/")[0] : "unknown";
    const fallbackTemplate = createFallbackModelTemplate(catalog);
    modelsToAdd.push({
      ...fallbackTemplate,
      modelId,
      providerId,
      displayName: readDefaultDisplayNameFromModelId(modelId),
      localOverrideApplied: true,
      localNotes: ["Synthesized from fixture-referenced model ID."],
      upstreamProvenance: catalog.source,
    });
  }

  if (modelsToAdd.length === 0) {
    return catalog;
  }

  return {
    ...catalog,
    models: [...catalog.models, ...modelsToAdd],
  };
}

interface CaptureFixtureMap {
  readonly byEndpointId: Readonly<Record<string, { readonly responseFixture: string }>>;
}

interface ProviderPresetVariantOAuth {
  readonly clientId: string;
  readonly deviceAuthorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly requiredHeaders: readonly string[];
  readonly scope?: string;
}

interface ProviderPresetVariant {
  readonly variantId: string;
  readonly label: string;
  readonly description: string;
  readonly authMode: ProviderAccountRecord["authMode"];
  readonly availability: "ready" | "backend-limited";
  readonly baseUrl: string;
  readonly modelIds: readonly string[];
  readonly oauth?: ProviderPresetVariantOAuth;
}

interface ProviderPresetCatalog {
  readonly providers: Readonly<
    Record<
      string,
      {
        readonly variants: readonly ProviderPresetVariant[];
      }
    >
  >;
}

interface DeviceAuthorizationStartResult {
  readonly authRequestId: string;
  readonly providerAccountId: string;
  readonly status: "pending";
  readonly userCode: string;
  readonly verificationUri: string;
  readonly verificationUriComplete: string;
  readonly intervalSeconds: number;
  readonly expiresAtMs: number;
}

interface DeviceAuthorizationPollResult {
  readonly authRequestId: string;
  readonly providerAccountId: string;
  readonly status: "pending" | "connected" | "expired" | "failed";
  readonly retryAfterSeconds?: number;
  readonly lastError?: string;
}

interface RuntimeRoleSummary {
  readonly roleId: string;
  readonly label: string;
  readonly description: string;
  readonly taskTypes: readonly string[];
}

const defaultRoles = [
  { role_id: "general.chat", task_types_supported: ["text.chat"] },
  { role_id: "coder.patch", task_types_supported: ["code.edit"] },
  { role_id: "coder.review", task_types_supported: ["code.edit", "json.schema_adherence"] },
  { role_id: "tool.agent", task_types_supported: ["tools.function_calling"] },
  { role_id: "embedder", task_types_supported: ["embeddings.text"] },
  { role_id: "classifier", task_types_supported: ["text.classification"] },
  { role_id: "language.detector", task_types_supported: ["text.language_detection"] },
] as const;

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "en");
}

function titleCaseWords(value: string): string {
  return value
    .split(/[._-]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildBuiltinRoleDescription(roleId: string): string {
  switch (roleId) {
    case "general.chat":
      return "General-purpose chat, assistant, and conversational tasks.";
    case "coder.patch":
      return "Code editing and patch generation tasks.";
    case "coder.review":
      return "Code review and schema-adherence tasks.";
    case "tool.agent":
      return "Tool-calling and function-execution tasks.";
    case "embedder":
      return "Embedding generation tasks.";
    case "classifier":
      return "Classification and labeling tasks.";
    case "language.detector":
      return "Language-detection tasks.";
    default:
      return `${titleCaseWords(roleId)} tasks.`;
  }
}

function createBuiltinRoleDefinition(
  roleId: string,
  taskTypes: readonly string[],
): NonNullable<Parameters<typeof routeRuntimeRequest>[0]["roleDefinitions"]>[number] {
  return {
    role_id: roleId,
    name: titleCaseWords(roleId),
    description: buildBuiltinRoleDescription(roleId),
    role_kind: "assistant",
    default_system_instructions: `Operate as ${titleCaseWords(roleId)}.`,
    task_types_supported: [...taskTypes],
    required_capabilities: [],
    preferred_capabilities: [],
    forbidden_capabilities: [],
    tool_policy: {
      mode: "allowed",
    },
    routing_policy_overrides: {},
    output_contracts: [],
    safety_policy_refs: [],
  };
}

function buildRuntimeRoleCatalog(
  roleDefinitions: readonly NonNullable<Parameters<typeof routeRuntimeRequest>[0]["roleDefinitions"]>[number][] = [],
): {
  readonly roleDefinitions: readonly NonNullable<Parameters<typeof routeRuntimeRequest>[0]["roleDefinitions"]>[number][];
  readonly roleSummaries: readonly RuntimeRoleSummary[];
} {
  const summaries = new Map<string, RuntimeRoleSummary>();
  const definitions = new Map<string, NonNullable<Parameters<typeof routeRuntimeRequest>[0]["roleDefinitions"]>[number]>();

  for (const role of roleDefinitions) {
    definitions.set(role.role_id, role);
    summaries.set(role.role_id, {
      roleId: role.role_id,
      label: role.name,
      description: role.description,
      taskTypes: role.task_types_supported,
    });
  }

  for (const role of defaultRoles) {
    if (!definitions.has(role.role_id)) {
      definitions.set(role.role_id, createBuiltinRoleDefinition(role.role_id, role.task_types_supported));
    }
    if (!summaries.has(role.role_id)) {
      summaries.set(role.role_id, {
        roleId: role.role_id,
        label: titleCaseWords(role.role_id),
        description: buildBuiltinRoleDescription(role.role_id),
        taskTypes: [...role.task_types_supported],
      });
    }
  }

  const byRoleId = [...summaries.values()].sort((left, right) => compareText(left.roleId, right.roleId));
  return {
    roleDefinitions: byRoleId.map((role) => definitions.get(role.roleId)!),
    roleSummaries: byRoleId,
  };
}

function buildRuntimeRoleBindings(
  staticBindings: readonly NonNullable<Parameters<typeof routeRuntimeRequest>[0]["roleBindings"]>[number][],
  runtimeEndpoints: readonly {
    endpointId: string;
    providerAccountId: string;
    modelId: string;
  }[],
  accounts: readonly ProviderAccountRecord[],
  registry: EndpointRegistryResult,
  roleDefinitions: readonly NonNullable<Parameters<typeof routeRuntimeRequest>[0]["roleDefinitions"]>[number][],
): readonly NonNullable<Parameters<typeof routeRuntimeRequest>[0]["roleBindings"]>[number][] {
  const roleDefinitionsById = new Map(roleDefinitions.map((role) => [role.role_id, role]));
  const capabilitiesByEndpointId = new Map(
    registry.endpoints.map((endpoint) => [endpoint.identity.endpoint_id, [...endpoint.declared.capabilities]]),
  );
  const dynamicBindings = runtimeEndpoints.flatMap((endpoint) => {
    const account = accounts.find((entry) => entry.providerAccountId === endpoint.providerAccountId);
    if (!account) {
      return [];
    }
    const modelBinding = account.modelRoleBindings?.find((entry) => entry.modelId === endpoint.modelId);
    if (!modelBinding) {
      return [];
    }
    const endpointCapabilities = capabilitiesByEndpointId.get(endpoint.endpointId) ?? [];
    return modelBinding.roleIds.flatMap((roleId) => {
      const roleDefinition = roleDefinitionsById.get(roleId);
      if (!roleDefinition) {
        return [];
      }
      return [
        {
          binding_id: `runtime.${sanitizeSegment(endpoint.endpointId)}.${sanitizeSegment(roleId)}`,
          role_id: roleId,
          endpoint_id: endpoint.endpointId,
          status: "active" as const,
          policy_overrides: {},
          effective_capabilities: endpointCapabilities,
          effective_task_types: [...roleDefinition.task_types_supported],
        },
      ];
    });
  });

  return [...staticBindings, ...dynamicBindings];
}

function getModelRoleIds(account: ProviderAccountRecord, modelId: string): readonly string[] {
  return (
    account.modelRoleBindings?.find((entry) => entry.modelId === modelId)?.roleIds.slice().sort(compareText) ?? []
  );
}

function getEndpointRoleIds(
  endpointId: string,
  runtimeEndpoints: readonly {
    endpointId: string;
    providerAccountId: string;
    modelId: string;
  }[],
  accounts: readonly ProviderAccountRecord[],
): readonly string[] {
  const runtimeEndpoint = runtimeEndpoints.find((entry) => entry.endpointId === endpointId);
  if (!runtimeEndpoint) {
    return [];
  }
  const account = accounts.find((entry) => entry.providerAccountId === runtimeEndpoint.providerAccountId);
  if (!account) {
    return [];
  }
  return getModelRoleIds(account, runtimeEndpoint.modelId);
}

function estimateContextTokens(
  messages: readonly OpenAIChatCompletionsMessage[],
  toolCount: number,
): number {
  const totalChars = messages.reduce((sum, message) => sum + message.content.length, 0);
  return Math.max(1, Math.ceil(totalChars / 4) + messages.length * 2 + toolCount);
}

function toToolDefinition(tool: OpenAIChatCompletionsTool): {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: Record<string, unknown>;
} {
  if (tool.type !== "function" || !tool.function) {
    throw new Error("Only OpenAI function tools are supported by the runtime host bridge.");
  }

  return {
    name: tool.function.name,
    description: tool.function.description,
    inputSchema: tool.function.parameters,
  };
}

function toResponsesToolDefinition(tool: OpenAIResponsesTool): {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: Record<string, unknown>;
} {
  if (tool.type !== "function" || typeof tool.name !== "string" || !tool.parameters) {
    throw new Error("Only OpenAI function tools are supported by the runtime host bridge.");
  }

  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.parameters,
  };
}

function parseChatCompletionsBody(body: Record<string, unknown>): OpenAIChatCompletionsBody {
  if (typeof body.model !== "string") {
    throw new Error("chat-completions request must include a string model");
  }
  if (!Array.isArray(body.messages)) {
    throw new Error("chat-completions request must include a messages array");
  }

  return body as unknown as OpenAIChatCompletionsBody;
}

function toResponsesInputMessages(input: OpenAIResponsesInput): readonly OpenAIChatCompletionsMessage[] {
  if (typeof input === "string") {
    return [{ role: "user", content: input }];
  }

  return input.map((message) => {
    if (
      typeof message !== "object" ||
      message === null ||
      typeof message.role !== "string" ||
      typeof message.content !== "string"
    ) {
      throw new Error("responses input messages must include string role and content fields");
    }
    return {
      role: message.role,
      content: message.content,
    };
  });
}

function parseResponsesBody(body: Record<string, unknown>): OpenAIResponsesBody {
  if (typeof body.model !== "string") {
    throw new Error("responses request must include a string model");
  }
  if (typeof body.input !== "string" && !Array.isArray(body.input)) {
    throw new Error("responses request must include a string or message-array input");
  }

  return body as unknown as OpenAIResponsesBody;
}

export function createModelListResponse(
  registry: EndpointRegistryResult,
): BridgeModelListResponse {
  const byModelId = new Map<string, string[]>();

  for (const endpoint of registry.endpoints) {
    const current = byModelId.get(endpoint.identity.model_id) ?? [];
    current.push(endpoint.identity.endpoint_id);
    byModelId.set(endpoint.identity.model_id, current);
  }

  const data = [...byModelId.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([modelId, endpointIds]) => ({
      id: modelId,
      object: "model" as const,
      owned_by: "role-model" as const,
      endpoint_ids: [...endpointIds].sort(compareText),
    }));

  return {
    object: "list",
    data,
  };
}

function readForwardedHeaderValue(value: string | string[] | undefined): string | undefined {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (typeof rawValue !== "string") {
    return undefined;
  }
  const firstValue = rawValue
    .split(",")
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0);
  return firstValue && firstValue.length > 0 ? firstValue : undefined;
}

function appendForwardedPort(host: string, port: string | undefined): string {
  if (!port || host.includes(":")) {
    return host;
  }
  return `${host}:${port}`;
}

function resolveExternalBaseUrl(
  request: IncomingMessage,
  options: Pick<StartBridgeServerOptions, "host" | "port">,
): string {
  const forwardedProto = readForwardedHeaderValue(request.headers["x-forwarded-proto"]);
  const forwardedHost = readForwardedHeaderValue(request.headers["x-forwarded-host"]);
  const forwardedPort = readForwardedHeaderValue(request.headers["x-forwarded-port"]);
  const requestHost = readForwardedHeaderValue(request.headers.host);
  const fallbackHost = options.port > 0 ? `${options.host}:${options.port}` : options.host;
  const host = forwardedHost
    ? appendForwardedPort(forwardedHost, forwardedPort)
    : appendForwardedPort(requestHost ?? fallbackHost, forwardedPort);
  return `${forwardedProto ?? "http"}://${host}`;
}

export function createDownstreamOpenAIProviderConfig(
  registry: EndpointRegistryResult,
  baseUrl: string,
): BridgeDownstreamOpenAIProviderConfig {
  const models = createModelListResponse(registry).data;

  return {
    kind: "openai-compatible",
    providerId: "role-model-runtime",
    displayName: "Role Model Runtime",
    baseUrl,
    endpoints: {
      health: `${baseUrl}/healthz`,
      models: `${baseUrl}/v1/models`,
      chatCompletions: `${baseUrl}/v1/chat/completions`,
      responses: `${baseUrl}/v1/responses`,
    },
    authentication: {
      type: "bearer",
      headerName: "Authorization",
      required: false,
      placeholderToken: "role-model-local",
      note:
        "Inbound API-key validation is not enforced yet. If a downstream client requires a token field, use this placeholder bearer token.",
    },
    models,
    setup: {
      recommendedModel: models[0]?.id ?? null,
      notes: [
        "Configure downstream tooling as an OpenAI-compatible provider.",
        "Use GET /v1/models to discover the current model ids.",
        "Use POST /v1/chat/completions or POST /v1/responses for routed inference.",
      ],
    },
  };
}

export function mapChatCompletionsRequest(
  registry: EndpointRegistryResult,
  body: OpenAIChatCompletionsBody,
  requestId: string,
): BridgeExecutionPlan {
  const allowEndpoints = registry.endpoints
    .filter((endpoint) => endpoint.identity.model_id === body.model)
    .map((endpoint) => endpoint.identity.endpoint_id)
    .sort(compareText);

  if (allowEndpoints.length === 0) {
    throw new Error(`No registry endpoints are available for requested model ${body.model}.`);
  }

  const tools = body.tools?.map(toToolDefinition);

  return {
    routingRequest: {
      requestId,
      taskType: "text.chat",
      requiredCapabilities: ["text.chat"],
      preferredCapabilities: [],
      requiredModalities: ["text"],
      contextTokens: estimateContextTokens(body.messages, tools?.length ?? 0),
      needsTools: Boolean(tools?.length),
      strategy: "balanced",
      preferLocal: false,
      allowEndpoints,
    },
    executionRequest: {
      messages: body.messages,
      ...(tools?.length ? { tools } : {}),
      ...(typeof body.stream === "boolean" ? { stream: body.stream } : {}),
      ...(typeof body.max_tokens === "number"
        ? { maxOutputTokens: body.max_tokens }
        : {}),
      ...(typeof body.temperature === "number"
        ? { temperature: body.temperature }
        : {}),
    },
  };
}

export function mapResponsesRequest(
  registry: EndpointRegistryResult,
  body: OpenAIResponsesBody,
  requestId: string,
): BridgeExecutionPlan {
  const allowEndpoints = registry.endpoints
    .filter((endpoint) => endpoint.identity.model_id === body.model)
    .map((endpoint) => endpoint.identity.endpoint_id)
    .sort(compareText);

  if (allowEndpoints.length === 0) {
    throw new Error(`No registry endpoints are available for requested model ${body.model}.`);
  }

  const tools = body.tools?.map(toResponsesToolDefinition);
  const messages = toResponsesInputMessages(body.input);

  return {
    routingRequest: {
      requestId,
      taskType: "text.chat",
      requiredCapabilities: ["text.chat"],
      preferredCapabilities: [],
      requiredModalities: ["text"],
      contextTokens: estimateContextTokens(messages, tools?.length ?? 0),
      needsTools: Boolean(tools?.length),
      strategy: "balanced",
      preferLocal: false,
      allowEndpoints,
    },
    executionRequest: {
      messages,
      ...(tools?.length ? { tools } : {}),
      ...(typeof body.stream === "boolean" ? { stream: body.stream } : {}),
      ...(typeof body.max_output_tokens === "number"
        ? { maxOutputTokens: body.max_output_tokens }
        : {}),
      ...(typeof body.temperature === "number"
        ? { temperature: body.temperature }
        : {}),
    },
  };
}

function writeJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
  headers?: Record<string, string>,
): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json");
  for (const [key, value] of Object.entries(headers ?? {})) {
    response.setHeader(key, value);
  }
  response.end(`${JSON.stringify(body)}\n`);
}

function writeText(
  response: ServerResponse,
  statusCode: number,
  body: string,
  contentType = "text/plain; charset=utf-8",
): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", contentType);
  response.end(body);
}

function writeSseHeaders(response: ServerResponse): void {
  response.statusCode = 200;
  response.setHeader("content-type", "text/event-stream; charset=utf-8");
  response.setHeader("cache-control", "no-cache, no-transform");
  response.setHeader("connection", "keep-alive");
  response.setHeader("x-accel-buffering", "no");
  response.flushHeaders?.();
}

function writeSseEvent(response: ServerResponse, eventName: string, payload: unknown): void {
  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function readOptionalPositiveInteger(
  params: URLSearchParams,
  key: string,
): number | undefined {
  const rawValue = params.get(key);
  if (!rawValue) {
    return undefined;
  }
  const value = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }
  return value;
}

function readTelemetryQuery(url: URL): BridgeTelemetryQuery {
  const windowMs = readOptionalPositiveInteger(url.searchParams, "windowMs");
  const limit = readOptionalPositiveInteger(url.searchParams, "limit");
  const endAtMs = readOptionalPositiveInteger(url.searchParams, "endAtMs");
  return {
    ...(typeof windowMs === "number" ? { windowMs } : {}),
    ...(typeof limit === "number" ? { limit } : {}),
    ...(typeof endAtMs === "number" ? { endAtMs } : {}),
  };
}

async function readJson<TValue>(filePath: string): Promise<TValue> {
  return JSON.parse(await readFile(filePath, "utf8")) as TValue;
}

async function loadResponseCaptures(
  repoRoot: string,
  fixtureMap: CaptureFixtureMap,
): Promise<RuntimeResponseCaptureMap> {
  const byEndpointId: Record<string, { body: unknown }> = {};
  for (const [endpointId, fixture] of Object.entries(fixtureMap.byEndpointId)) {
    byEndpointId[endpointId] = {
      body: await readJson<unknown>(
        path.join(repoRoot, "testdata", "router-runtime", fixture.responseFixture),
      ),
    };
  }

  return { byEndpointId };
}

async function loadMcpConnectorConfigs(repoRoot: string): Promise<DeclaredMcpConnectorConfig[]> {
  return readJson<DeclaredMcpConnectorConfig[]>(
    path.join(repoRoot, "testdata", "router-runtime", "mcp-connectors.json"),
  );
}

function getObjectField(value: unknown, field: string): unknown {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return (value as Record<string, unknown>)[field];
}

function createConnectorTool(
  registry: EndpointRegistryResult,
  connectorId: string,
  tool: {
    readonly name: string;
    readonly description?: string;
    readonly inputSchema: Record<string, unknown>;
  },
): ToolConnector["tools"][number] {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    execute: async ({ arguments: toolArguments }) => {
      switch (tool.name) {
        case "lookupRegistry": {
          const endpointId = getObjectField(toolArguments, "endpointId");
          if (typeof endpointId !== "string") {
            throw new Error(`Connector ${connectorId} received a non-string endpointId.`);
          }
          const endpoint = registry.endpoints.find(
            (entry) => entry.identity.endpoint_id === endpointId,
          );
          return {
            content: {
              endpointId,
              modelId: endpoint?.identity.model_id ?? null,
              status: endpoint ? "active" : "missing",
            },
          };
        }
        default:
          throw new Error(`Connector ${connectorId} does not implement tool ${tool.name}.`);
      }
    },
  };
}

async function createRuntimeToolRegistry(
  repoRoot: string,
  registry: EndpointRegistryResult,
): Promise<ToolRegistry> {
  const definitions = createMcpConnectorDefinitions(await loadMcpConnectorConfigs(repoRoot));
  const connectors: ToolConnector[] = definitions.map((definition) => ({
    connectorId: definition.connectorId,
    connectorKind: definition.connectorKind,
    tools: definition.tools.map((tool) =>
      createConnectorTool(registry, definition.connectorId, tool),
    ),
  }));
  return createToolRegistry({
    connectors,
  });
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function readRequiredString(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label}.${key} must be a non-empty string`);
  }
  return value;
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readStringArray(record: Record<string, unknown>, key: string): string[] | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${key} must be an array of strings`);
  }
  return [...value];
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function createCredentialRef(providerId: string, providerAccountId: string): string {
  return `oauth/${sanitizeSegment(providerId)}/${sanitizeSegment(providerAccountId)}`;
}

function resolveCredentialFilePath(
  runtimeStateRoot: string,
  scopeId: string,
  credentialRef: string,
): string {
  const safeSegments = credentialRef
    .split(/[\\/]+/)
    .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..")
    .map(sanitizeSegment);
  return path.join(runtimeStateRoot, scopeId, "credentials", ...safeSegments) + ".json";
}

function createDeviceHeaders(
  deviceId: string,
  requiredHeaders: readonly string[] = [],
): Record<string, string> {
  const isKimi = requiredHeaders.includes("X-Msh-Platform");
  const headers: Record<string, string> = {
    "User-Agent": isKimi ? "KimiCLI/1.41.0" : "Role-Model-Runtime/1.0",
  };
  if (requiredHeaders.includes("X-Msh-Platform")) {
    headers["X-Msh-Platform"] = "kimi_cli";
  }
  if (requiredHeaders.includes("X-Msh-Version")) {
    headers["X-Msh-Version"] = "1.41.0";
  }
  if (requiredHeaders.includes("X-Msh-Device-Name")) {
    headers["X-Msh-Device-Name"] = os.hostname();
  }
  if (requiredHeaders.includes("X-Msh-Device-Model")) {
    headers["X-Msh-Device-Model"] = `${os.platform()} ${os.release()} ${os.arch()}`.trim();
  }
  if (requiredHeaders.includes("X-Msh-Os-Version")) {
    headers["X-Msh-Os-Version"] = os.release();
  }
  if (requiredHeaders.includes("X-Msh-Device-Id")) {
    headers["X-Msh-Device-Id"] = deviceId;
  }
  return headers;
}

async function persistOauthTokenFile(
  runtimeStateRoot: string,
  scopeId: string,
  credentialRef: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const filePath = resolveCredentialFilePath(runtimeStateRoot, scopeId, credentialRef);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

async function readOauthTokenFile(
  runtimeStateRoot: string,
  scopeId: string,
  credentialRef: string,
): Promise<Record<string, unknown> | null> {
  try {
    const filePath = resolveCredentialFilePath(runtimeStateRoot, scopeId, credentialRef);
    return JSON.parse(await readFile(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

interface StoredOauthTokenPayload {
  readonly access_token?: string;
  readonly refresh_token?: string;
  readonly expires_in?: number;
  readonly scope?: string;
  readonly token_type?: string;
  readonly saved_at_ms?: number;
}

function readStoredAccessToken(payload: StoredOauthTokenPayload | null): string {
  return typeof payload?.access_token === "string" ? payload.access_token.trim() : "";
}

function readStoredRefreshToken(payload: StoredOauthTokenPayload | null): string {
  return typeof payload?.refresh_token === "string" ? payload.refresh_token.trim() : "";
}

function tokenNeedsRefresh(payload: StoredOauthTokenPayload | null): boolean {
  if (!payload || typeof payload.saved_at_ms !== "number" || typeof payload.expires_in !== "number") {
    return false;
  }
  return payload.saved_at_ms + payload.expires_in * 1000 <= Date.now() + 60_000;
}

function getOauthVariant(
  providerPresets: ProviderPresetCatalog,
  providerId: string,
): ProviderPresetVariant & { oauth: ProviderPresetVariantOAuth } {
  const variant = providerPresets.providers[providerId]?.variants.find(
    (entry): entry is ProviderPresetVariant & { oauth: ProviderPresetVariantOAuth } =>
      entry.authMode === "oauth2-device-code" && Boolean(entry.oauth),
  );
  if (!variant) {
    throw new Error(`Provider ${providerId} does not expose an OAuth device-code variant.`);
  }
  return variant;
}

async function refreshOauthAccessToken(
  runtimeStateRoot: string,
  scopeId: string,
  target: ResolvedExecutionTarget,
  providerPresets: ProviderPresetCatalog,
  networkFetcher: typeof fetch,
  deviceId: string,
  onRefreshed?: () => void,
): Promise<string> {
  const credentialRef = target.account?.credentialRef;
  if (!credentialRef || (credentialRef.backend !== "local-file" && credentialRef.backend !== "local-encrypted-file")) {
    throw new Error(`Endpoint ${target.endpointId} does not support OAuth token refresh.`);
  }

  const existingPayload = (await readOauthTokenFile(
    runtimeStateRoot,
    scopeId,
    credentialRef.ref,
  )) as StoredOauthTokenPayload | null;
  const refreshToken = readStoredRefreshToken(existingPayload);
  if (refreshToken.length === 0) {
    throw new Error(`Stored OAuth credential ${credentialRef.ref} does not contain a refresh token.`);
  }

  const variant = getOauthVariant(providerPresets, target.providerId);
  const tokenResponse = await networkFetcher(variant.oauth.tokenEndpoint, {
    method: "POST",
    headers: createDeviceHeaders(deviceId, variant.oauth.requiredHeaders),
    body: new URLSearchParams({
      client_id: variant.oauth.clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const rawBody = await tokenResponse.text();
  const parsedBody = parseProviderResponseBody(rawBody);
  if (!tokenResponse.ok || !parsedBody || typeof parsedBody !== "object") {
    throw new Error(summarizeProviderError(tokenResponse.status, parsedBody));
  }

  const refreshedPayload = parsedBody as Record<string, unknown>;
  if (typeof refreshedPayload.access_token !== "string" || refreshedPayload.access_token.trim().length === 0) {
    throw new Error(`Refresh response for ${credentialRef.ref} did not include an access token.`);
  }

  await persistOauthTokenFile(runtimeStateRoot, scopeId, credentialRef.ref, {
    providerId: target.providerId,
    providerAccountId: target.providerAccountId,
    access_token: refreshedPayload.access_token,
    refresh_token:
      typeof refreshedPayload.refresh_token === "string" && refreshedPayload.refresh_token.length > 0
        ? refreshedPayload.refresh_token
        : refreshToken,
    expires_in: refreshedPayload.expires_in,
    scope: refreshedPayload.scope,
    token_type: refreshedPayload.token_type,
    saved_at_ms: Date.now(),
  });

  onRefreshed?.();

  return refreshedPayload.access_token.trim();
}

async function resolveCredentialValue(
  runtimeStateRoot: string,
  scopeId: string,
  target: ResolvedExecutionTarget,
  providerPresets?: ProviderPresetCatalog,
  networkFetcher?: typeof fetch,
  deviceId?: string,
  onRefreshed?: () => void,
): Promise<string> {
  const credentialRef = target.account?.credentialRef;
  if (!credentialRef) {
    throw new Error(`Endpoint ${target.endpointId} does not have a credential reference.`);
  }

  if (credentialRef.backend === "env") {
    const value = process.env[credentialRef.ref];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    throw new Error(`Environment credential ${credentialRef.ref} is not set.`);
  }

  if (credentialRef.backend === "local-file" || credentialRef.backend === "local-encrypted-file") {
    let tokenPayload = (await readOauthTokenFile(
      runtimeStateRoot,
      scopeId,
      credentialRef.ref,
    )) as StoredOauthTokenPayload | null;
    if (
      tokenNeedsRefresh(tokenPayload) &&
      providerPresets &&
      networkFetcher &&
      typeof deviceId === "string"
    ) {
      const refreshedAccessToken = await refreshOauthAccessToken(
        runtimeStateRoot,
        scopeId,
        target,
        providerPresets,
        networkFetcher,
        deviceId,
        onRefreshed,
      );
      return refreshedAccessToken;
    }
    const accessToken = readStoredAccessToken(tokenPayload);
    if (accessToken.length > 0) {
      return accessToken;
    }
    throw new Error(`Stored OAuth credential ${credentialRef.ref} does not contain an access token.`);
  }

  throw new Error(`Credential backend ${credentialRef.backend} is not supported for live execution.`);
}

function applyCredentialToHeaders(
  headers: Record<string, string>,
  credentialValue: string,
): Record<string, string> {
  const resolvedHeaders = { ...headers };
  for (const [key, value] of Object.entries(resolvedHeaders)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "authorization") {
      resolvedHeaders[key] = value.trim().toLowerCase().startsWith("bearer ")
        ? `Bearer ${credentialValue}`
        : credentialValue;
    }
    if (lowerKey === "x-api-key") {
      resolvedHeaders[key] = credentialValue;
    }
  }
  return resolvedHeaders;
}

function parseProviderResponseBody(rawBody: string): unknown {
  if (rawBody.length === 0) {
    return {};
  }
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return rawBody;
  }
}

async function readProviderStreamTranscript(
  response: Response,
  streamWriter: BridgeStreamWriter,
  metadata: BridgeStreamMetadata,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return await response.text();
  }

  const decoder = new TextDecoder();
  let transcript = "";
  let pending = "";

  const flushBlocks = async (flushAll: boolean): Promise<void> => {
    const parts = pending.split(/\r?\n\r?\n/);
    const completeBlocks = flushAll ? parts : parts.slice(0, -1);
    pending = flushAll ? "" : (parts.at(-1) ?? "");

    for (const block of completeBlocks) {
      const dataLines = block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice("data:".length).trim())
        .filter((line) => line.length > 0);
      if (dataLines.length === 0) {
        continue;
      }

      const payloadText = dataLines.join("\n");
      if (payloadText === "[DONE]") {
        continue;
      }

      try {
        await streamWriter(JSON.parse(payloadText) as Record<string, unknown>, metadata);
      } catch {
        continue;
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      const finalChunk = decoder.decode();
      transcript += finalChunk;
      pending += finalChunk;
      await flushBlocks(true);
      break;
    }
    const chunkText = decoder.decode(value, { stream: true });
    transcript += chunkText;
    pending += chunkText;
    await flushBlocks(false);
  }

  return transcript;
}

async function replayProviderStreamTranscript(
  transcript: string,
  streamWriter: BridgeStreamWriter,
  metadata: BridgeStreamMetadata,
): Promise<void> {
  for (const block of transcript.split(/\r?\n\r?\n/)) {
    const dataLines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim())
      .filter((line) => line.length > 0);
    if (dataLines.length === 0) {
      continue;
    }

    const payloadText = dataLines.join("\n");
    if (payloadText === "[DONE]") {
      continue;
    }

    try {
      await streamWriter(JSON.parse(payloadText) as Record<string, unknown>, metadata);
    } catch {
      continue;
    }
  }
}

function summarizeProviderError(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const nestedError = record.error;
    if (nestedError && typeof nestedError === "object") {
      const nestedRecord = nestedError as Record<string, unknown>;
      if (typeof nestedRecord.message === "string" && nestedRecord.message.length > 0) {
        return nestedRecord.message;
      }
      if (typeof nestedRecord.error_description === "string" && nestedRecord.error_description.length > 0) {
        return nestedRecord.error_description;
      }
    }
    if (typeof record.message === "string" && record.message.length > 0) {
      return record.message;
    }
    if (typeof record.error_description === "string" && record.error_description.length > 0) {
      return record.error_description;
    }
  }
  return `Provider request failed with HTTP ${status}.`;
}

function shouldUseLiveProviderExecution(target: ResolvedExecutionTarget): boolean {
  return (
    target.adapterFamily === "ai-sdk-openai-compatible" &&
    (target.account?.credentialRef.backend === "local-file" || target.account?.credentialRef.backend === "local-encrypted-file")
  );
}

function toModelSegment(modelId: string): string {
  const lastSegment = modelId.includes("/") ? modelId.slice(modelId.lastIndexOf("/") + 1) : modelId;
  return sanitizeSegment(lastSegment);
}

function createEndpointId(providerAccountId: string, region: string, modelId: string): string {
  return `${providerAccountId}.${sanitizeSegment(region)}.${toModelSegment(modelId)}`;
}

const DEFAULT_TELEMETRY_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TELEMETRY_LIMIT = 50;

function toSourceType(
  endpointKind: "local_engine" | "remote_api" | "browser_engine" | "dispatch_adapter",
): "local" | "remote" {
  return endpointKind === "remote_api" ? "remote" : "local";
}

function toControllerAssignmentFromEndpoint(endpoint: EndpointRegistryResult["endpoints"][number]): BridgeControllerAssignment {
  return {
    scope: "global",
    endpointId: endpoint.identity.endpoint_id,
    modelId: endpoint.identity.model_id,
    sourceType: toSourceType(endpoint.identity.endpoint_kind),
  };
}

function mergeRegistrySources(
  staticSources: RegistrySources,
  runtimeEndpoints: readonly {
    endpointId: string;
    providerAccountId: string;
    modelId: string;
    region: string;
    endpointKind: string;
    servingSource: string;
    lifecycleState: string;
    healthStatus: string;
  }[],
): RegistrySources {
  return {
    cloud: [
      ...staticSources.cloud,
      ...runtimeEndpoints.map((endpoint) => ({
        endpointId: endpoint.endpointId,
        providerAccountId: endpoint.providerAccountId,
        modelId: endpoint.modelId,
        region: endpoint.region,
        endpointKind: endpoint.endpointKind,
        servingSource: endpoint.servingSource,
        lifecycleState: endpoint.lifecycleState as RegistrySources["cloud"][number]["lifecycleState"],
        healthStatus: endpoint.healthStatus,
        requestShapeHints: {
          providerShape: "openai.chat.completions" as const,
          bodyKeys: ["messages", "max_tokens"] as [string, ...string[]],
          headerKeys: ["authorization"] as [string, ...string[]],
        },
      })),
    ],
    local: [...staticSources.local],
  };
}

function createChatCompletionsResponse(
  result: BridgeChatCompletionsExecutionResult,
): Record<string, unknown> {
  const message = {
    role: "assistant" as const,
    content: result.outputText,
    ...(result.toolCalls?.length ? { tool_calls: result.toolCalls } : {}),
  };

  return {
    id: "chatcmpl-role-model",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: result.model,
    choices: [
      {
        index: 0,
        message,
        finish_reason: result.finishReason,
      },
    ],
    usage: {
      prompt_tokens: result.usage.inputTokens,
      completion_tokens: result.usage.outputTokens,
      total_tokens: result.usage.inputTokens + result.usage.outputTokens,
    },
  };
}

function createResponsesOutput(
  result: BridgeResponsesExecutionResult,
): ReadonlyArray<Record<string, unknown>> {
  const output: Record<string, unknown>[] = [
    {
      type: "message",
      id: `msg_${result.responseId}`,
      role: "assistant",
      content:
        result.outputText.length > 0
          ? [
              {
                type: "output_text",
                text: result.outputText,
              },
            ]
          : [],
    },
  ];

  for (const toolCall of result.toolCalls ?? []) {
    output.push({
      type: "function_call",
      id: toolCall.id,
      call_id: toolCall.id,
      name: toolCall.function.name,
      arguments: toolCall.function.arguments,
    });
  }

  return output;
}

function createResponsesResponse(
  result: BridgeResponsesExecutionResult,
): Record<string, unknown> {
  return {
    id: result.responseId,
    object: "response",
    created_at: Math.floor(Date.now() / 1000),
    status: result.finishReason === "stop" ? "completed" : "incomplete",
    model: result.model,
    output: createResponsesOutput(result),
    usage: {
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      total_tokens: result.usage.inputTokens + result.usage.outputTokens,
    },
  };
}

function serializeToolCallArguments(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value ?? null);
}

function toBridgeToolCall(
  toolCall: {
    readonly name: string;
    readonly arguments: unknown;
    readonly providerToolId?: string;
  },
  index: number,
): BridgeToolCall {
  return {
    id: toolCall.providerToolId ?? `call_${index + 1}`,
    type: "function",
    function: {
      name: toolCall.name,
      arguments: serializeToolCallArguments(toolCall.arguments),
    },
  };
}

function createChatCompletionsStreamChunks(
  result: BridgeChatCompletionsExecutionResult,
): ReadonlyArray<Record<string, unknown>> {
  const created = Math.floor(Date.now() / 1000);
  const baseChunk = {
    id: "chatcmpl-role-model",
    object: "chat.completion.chunk",
    created,
    model: result.model,
  };

  return [
    {
      ...baseChunk,
      choices: [
        {
          index: 0,
          delta: {
            role: "assistant",
            ...(result.outputText.length > 0 ? { content: result.outputText } : {}),
            ...(result.toolCalls?.length ? { tool_calls: result.toolCalls } : {}),
          },
          finish_reason: null,
        },
      ],
    },
    {
      ...baseChunk,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: result.finishReason,
        },
      ],
    },
  ];
}

function createResponsesStreamChunks(
  result: BridgeResponsesExecutionResult,
): ReadonlyArray<Record<string, unknown>> {
  const messageId = `msg_${result.responseId}`;
  const createdAt = Math.floor(Date.now() / 1000);
  const chunks: Record<string, unknown>[] = [
    {
      type: "response.created",
      response: {
        id: result.responseId,
        created_at: createdAt,
        model: result.model,
      },
    },
    {
      type: "response.output_item.added",
      output_index: 0,
      item: {
        type: "message",
        id: messageId,
      },
    },
  ];

  if (result.outputText.length > 0) {
    chunks.push({
      type: "response.output_text.delta",
      item_id: messageId,
      output_index: 0,
      delta: result.outputText,
    });
  }

  for (const [index, toolCall] of (result.toolCalls ?? []).entries()) {
    const outputIndex = index + 1;
    chunks.push({
      type: "response.output_item.added",
      output_index: outputIndex,
      item: {
        type: "function_call",
        id: toolCall.id,
        call_id: toolCall.id,
        name: toolCall.function.name,
        arguments: "",
      },
    });
    chunks.push({
      type: "response.function_call_arguments.delta",
      item_id: toolCall.id,
      output_index: outputIndex,
      delta: toolCall.function.arguments,
    });
    chunks.push({
      type: "response.output_item.done",
      output_index: outputIndex,
      item: {
        type: "function_call",
        id: toolCall.id,
        call_id: toolCall.id,
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
        status: "completed",
      },
    });
  }

  chunks.push({
    type: result.finishReason === "stop" ? "response.completed" : "response.incomplete",
    response: {
      id: result.responseId,
      usage: {
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
      },
      ...(result.finishReason === "stop"
        ? {}
        : {
            incomplete_details: {
              reason: result.finishReason,
            },
          }),
    },
  });

  return chunks;
}

function parseStreamPayloads(rawTranscript: string): readonly Record<string, unknown>[] {
  const payloads: Record<string, unknown>[] = [];
  for (const block of rawTranscript.split(/\r?\n\r?\n/)) {
    const dataLines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim())
      .filter((line) => line.length > 0 && line !== "[DONE]");
    if (dataLines.length === 0) {
      continue;
    }
    try {
      payloads.push(JSON.parse(dataLines.join("\n")) as Record<string, unknown>);
    } catch {
      continue;
    }
  }
  return payloads;
}

function extractResponseId(responseBody: unknown): string | undefined {
  if (
    typeof responseBody === "object" &&
    responseBody !== null &&
    "id" in responseBody &&
    typeof responseBody.id === "string"
  ) {
    return responseBody.id;
  }

  if (typeof responseBody !== "string") {
    return undefined;
  }

  for (const payload of parseStreamPayloads(responseBody)) {
    if (
      payload.type === "response.created" &&
      typeof payload.response === "object" &&
      payload.response !== null &&
      "id" in payload.response &&
      typeof payload.response.id === "string"
    ) {
      return payload.response.id;
    }
  }

  return undefined;
}

function setCorsHeaders(response: ServerResponse): void {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID");
}

function createRequestHandler(options: StartBridgeServerOptions) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    setCorsHeaders(response);

    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }

    if (!request.url) {
      writeJson(response, 400, { error: "missing request URL" });
      return;
    }

    const url = new URL(request.url, `http://${options.host}`);

    if (request.method === "GET" && url.pathname === "/healthz") {
      writeJson(
        response,
        200,
        options.readHealthStatus
          ? await options.readHealthStatus()
          : {
              status: "healthy",
              executionMode: "decision_only",
              vendors: {},
              inactiveVendors: [],
            },
      );
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      writeText(response, 200, "OK");
      return;
    }

    if (request.method === "GET" && url.pathname === "/ui") {
      writeText(
        response,
        200,
        '<!doctype html><html><body><ul><li><a href="/logs">/logs</a></li><li><a href="/api/version">/api/version</a></li><li><a href="/api/metrics">/api/metrics</a></li></ul></body></html>',
        "text/html; charset=utf-8",
      );
      return;
    }

    const registry = options.getRegistry?.() ?? options.registry;

    if (request.method === "GET" && url.pathname === "/v1/models") {
      writeJson(response, 200, createModelListResponse(registry));
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/chat/completions") {
      try {
        const requestId = request.headers["x-request-id"]?.toString() ?? "req-runtime-host-bridge";
        const body = await readJsonBody(request);
        const parsedBody = parseChatCompletionsBody(body);
        if (parsedBody.stream) {
          let wroteStreamChunk = false;
          const pendingChunks: string[] = [];
          const streamWriter: BridgeStreamWriter = async (chunk, metadata) => {
            const serializedChunk = `data: ${JSON.stringify(chunk)}\n\n`;
            if (!wroteStreamChunk) {
              if (!metadata) {
                pendingChunks.push(serializedChunk);
                return;
              }
              response.writeHead(200, {
                "content-type": "text/event-stream; charset=utf-8",
                "cache-control": "no-cache, no-transform",
                connection: "keep-alive",
                ...createExecutionHeaders({
                  endpointId: metadata.endpointId,
                  adapterFamily: metadata.adapterFamily,
                  routingDecisionId: metadata.routingDecisionId,
                }),
              });
              wroteStreamChunk = true;
              for (const pendingChunk of pendingChunks) {
                response.write(pendingChunk);
              }
              pendingChunks.length = 0;
            }
            response.write(serializedChunk);
          };
          const result = await options.executeChatCompletions(parsedBody, requestId, streamWriter);
          if (!wroteStreamChunk) {
            response.writeHead(200, {
              "content-type": "text/event-stream; charset=utf-8",
              "cache-control": "no-cache, no-transform",
              connection: "keep-alive",
              ...createExecutionHeaders({
                endpointId: result.endpointId,
                adapterFamily: result.adapterFamily,
                routingDecisionId: result.routingDecisionId,
                costUsd: result.vendorMetadata?.costUsd,
              }),
            });
            if (pendingChunks.length > 0) {
              for (const pendingChunk of pendingChunks) {
                response.write(pendingChunk);
              }
            } else {
              for (const chunk of createChatCompletionsStreamChunks(result)) {
                response.write(`data: ${JSON.stringify(chunk)}\n\n`);
              }
            }
          }
          response.write("data: [DONE]\n\n");
          response.end();
          return;
        }
        const result = await options.executeChatCompletions(parsedBody, requestId);
        writeJson(response, 200, createChatCompletionsResponse(result), createExecutionHeaders({
          endpointId: result.endpointId,
          adapterFamily: result.adapterFamily,
          routingDecisionId: result.routingDecisionId,
          costUsd: result.vendorMetadata?.costUsd,
        }));
        return;
      } catch (error) {
        if (error instanceof BridgeHttpError) {
          throw error;
        }
        const message = error instanceof Error ? error.message : "chat completions request failed";
        writeJson(response, 400, { error: message });
        return;
      }
    }

    if (request.method === "POST" && url.pathname === "/v1/responses") {
      const requestId = request.headers["x-request-id"]?.toString() ?? "req-runtime-host-bridge";
      const body = await readJsonBody(request);
      const parsedBody = parseResponsesBody(body);
      if (parsedBody.stream) {
        let wroteStreamChunk = false;
        const pendingChunks: string[] = [];
        const streamWriter: BridgeStreamWriter = async (chunk, metadata) => {
          const serializedChunk = `data: ${JSON.stringify(chunk)}\n\n`;
          if (!wroteStreamChunk) {
            if (!metadata) {
              pendingChunks.push(serializedChunk);
              return;
            }
            response.writeHead(200, {
              "content-type": "text/event-stream; charset=utf-8",
              "cache-control": "no-cache, no-transform",
              connection: "keep-alive",
              ...createExecutionHeaders({
                endpointId: metadata.endpointId,
                adapterFamily: metadata.adapterFamily,
                routingDecisionId: metadata.routingDecisionId,
              }),
            });
            wroteStreamChunk = true;
            for (const pendingChunk of pendingChunks) {
              response.write(pendingChunk);
            }
            pendingChunks.length = 0;
          }
          response.write(serializedChunk);
        };
        const result = await options.executeResponses(parsedBody, requestId, streamWriter);
        if (!wroteStreamChunk) {
          response.writeHead(200, {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
            ...createExecutionHeaders({
              endpointId: result.endpointId,
              adapterFamily: result.adapterFamily,
              routingDecisionId: result.routingDecisionId,
              costUsd: result.vendorMetadata?.costUsd,
            }),
          });
          if (pendingChunks.length > 0) {
            for (const pendingChunk of pendingChunks) {
              response.write(pendingChunk);
            }
          } else {
            for (const chunk of createResponsesStreamChunks(result)) {
              response.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
          }
        }
        response.end();
        return;
      }
      const result = await options.executeResponses(parsedBody, requestId);
      writeJson(response, 200, createResponsesResponse(result), createExecutionHeaders({
        endpointId: result.endpointId,
        adapterFamily: result.adapterFamily,
        routingDecisionId: result.routingDecisionId,
        costUsd: result.vendorMetadata?.costUsd,
      }));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/runtime/summary") {
      if (!options.readRuntimeSummary) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readRuntimeSummary());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/runtime/config") {
      if (!options.readRuntimeConfig) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readRuntimeConfig());
      return;
    }

    if (request.method === "PUT" && url.pathname === "/api/role-model/runtime/config") {
      if (!options.updateRuntimeConfig) {
        writeJson(response, 404, { error: "not found" });
        return;
      }

      try {
        writeJson(response, 200, await options.updateRuntimeConfig(await readJsonBody(request)));
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "runtime config update failed",
        });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/telemetry/summary") {
      if (!options.readTelemetrySummary) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readTelemetrySummary(readTelemetryQuery(url)));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/telemetry/rows") {
      if (!options.listTelemetryComparisonRows) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listTelemetryComparisonRows(readTelemetryQuery(url)));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/telemetry/requests") {
      if (!options.listTelemetryRequests) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listTelemetryRequests(readTelemetryQuery(url)));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/telemetry/stream") {
      if (!options.subscribeTelemetry) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeSseHeaders(response);
      response.write(": connected\n\n");
      const unsubscribe = options.subscribeTelemetry((event) => {
        writeSseEvent(response, event.eventName, event);
      });
      const cleanup = () => {
        unsubscribe();
        if (!response.writableEnded) {
          response.end();
        }
      };
      request.once("close", cleanup);
      response.once("close", cleanup);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/version") {
      if (!options.readVersionInfo) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readVersionInfo());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/metrics") {
      if (!options.listActivityMetrics) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listActivityMetrics());
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/captures/")) {
      if (!options.readActivityCapture) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const captureId = Number.parseInt(url.pathname.slice("/api/captures/".length), 10);
      const capture = Number.isFinite(captureId)
        ? await options.readActivityCapture(captureId)
        : null;
      if (!capture) {
        writeJson(response, 404, { error: "capture not found" });
        return;
      }
      writeJson(response, 200, capture);
      return;
    }

    if (request.method === "GET" && url.pathname === "/logs") {
      if (!options.readLogs) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeText(response, 200, await options.readLogs());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/downstream/openai") {
      writeJson(
        response,
        200,
        createDownstreamOpenAIProviderConfig(
          registry,
          resolveExternalBaseUrl(request, {
            host: options.host,
            port: options.port,
          }),
        ),
      );
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/providers") {
      if (!options.listProviders) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listProviders());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/roles") {
      if (!options.listRoles) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listRoles());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/accounts") {
      if (!options.listAccounts) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listAccounts());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/controller") {
      if (!options.readControllerAssignment) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readControllerAssignment());
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/role-model/controller") {
      if (!options.updateControllerAssignment) {
        writeJson(response, 404, { error: "not found" });
        return;
      }

      try {
        writeJson(response, 200, await options.updateControllerAssignment(await readJsonBody(request)));
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "controller assignment update failed",
        });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/role-model/accounts") {
      if (!options.upsertProviderAccount) {
        writeJson(response, 404, { error: "not found" });
        return;
      }

      try {
        writeJson(response, 200, await options.upsertProviderAccount(await readJsonBody(request)));
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "provider account upsert failed",
        });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/role-model/accounts/device/start") {
      if (!options.startProviderDeviceAuthorization) {
        writeJson(response, 404, { error: "not found" });
        return;
      }

      try {
        writeJson(response, 200, await options.startProviderDeviceAuthorization(await readJsonBody(request)));
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "provider device authorization start failed",
        });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/role-model/accounts/device/poll") {
      if (!options.pollProviderDeviceAuthorization) {
        writeJson(response, 404, { error: "not found" });
        return;
      }

      try {
        writeJson(response, 200, await options.pollProviderDeviceAuthorization(await readJsonBody(request)));
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "provider device authorization poll failed",
        });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/endpoints") {
      if (!options.listEndpoints) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listEndpoints());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/role-model/endpoints") {
      if (!options.activateEndpoint) {
        writeJson(response, 404, { error: "not found" });
        return;
      }

      try {
        writeJson(response, 200, await options.activateEndpoint(await readJsonBody(request)));
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "endpoint activation failed",
        });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/requests") {
      if (!options.listRecentRequestObservations) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listRecentRequestObservations());
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/role-model/requests/")) {
      if (!options.readRequestObservation) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const requestId = decodeURIComponent(url.pathname.slice("/api/role-model/requests/".length));
      const observation = await options.readRequestObservation(requestId);
      if (!observation) {
        writeJson(response, 404, { error: "runtime observation not found" });
        return;
      }
      writeJson(response, 200, observation);
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname.startsWith("/api/role-model/endpoints/") &&
      url.pathname.endsWith("/profile")
    ) {
      if (!options.readEndpointProfile) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const endpointId = decodeURIComponent(
        url.pathname.slice(
          "/api/role-model/endpoints/".length,
          url.pathname.length - "/profile".length,
        ),
      );
      writeJson(response, 200, await options.readEndpointProfile(endpointId));
      return;
    }

    writeJson(response, 404, { error: "not found" });
  };
}

function listen(server: Server, host: string, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("bridge server did not expose a TCP port"));
        return;
      }
      resolve(address.port);
    });
  });
}

export async function startBridgeServer(
  options: StartBridgeServerOptions,
): Promise<BridgeServer> {
  const server = createServer((request, response) => {
    void createRequestHandler(options)(request, response).catch((error: unknown) => {
      if (error instanceof BridgeHttpError) {
        writeJson(response, error.statusCode, error.body);
        return;
      }
      writeJson(response, 500, {
        error:
          error instanceof Error ? error.message : "runtime host bridge request failed",
      });
    });
  });
  const port = await listen(server, options.host, options.port);

  return {
    port,
    async close(): Promise<void> {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

export async function createRuntimeBridgeBackend(
  options: CreateRuntimeBridgeBackendOptions,
): Promise<RuntimeBridgeBackend> {
  const networkFetcher = options.networkFetcher ?? fetch;
  const fixtureRoot = options.fixtureRoot ?? path.join(options.repoRoot, "testdata", "router-runtime", "fixtures");
  const initialUnifiedRuntimeConfig = options.unifiedRuntimeConfigPath
    ? parseUnifiedRuntimeConfigText(await readFile(options.unifiedRuntimeConfigPath, "utf8"))
    : null;
  const supervisor = options.unifiedRuntimeConfigPath ? new ProcessSupervisor() : null;
  const baseCatalog = await readJson<NormalizedCatalog>(
    path.join(
      options.repoRoot,
      "role-model-router",
      "packages",
      "catalog",
      "data",
      "normalized-catalog.json",
    ),
  );
  const liteLLMModelPrices = await loadLiteLLMModelPrices(options.repoRoot);
  let liteLLMProviders = liteLLMModelPrices ? deriveLiteLLMProviders(liteLLMModelPrices) : [];
  const providerAccountsFixture = await readJson<{ accounts: ProviderAccountRecord[] }>(
    path.join(fixtureRoot, "provider-accounts.json"),
  );
  const registrySourcesFixture = await readJson<RegistrySources>(
    path.join(fixtureRoot, "registry-sources.json"),
  );
  const continuityFixture = await readJson<{
    session: Parameters<typeof persistContinuitySnapshot>[0]["session"];
    conversation: Parameters<typeof persistContinuitySnapshot>[0]["conversation"];
    turns: Parameters<typeof persistContinuitySnapshot>[0]["turns"];
    artifacts: Parameters<typeof persistContinuitySnapshot>[0]["artifacts"];
    artifactLinks: Parameters<typeof persistContinuitySnapshot>[0]["artifactLinks"];
    handoffs: Parameters<typeof persistContinuitySnapshot>[0]["handoffs"];
    selection: {
      maxTurns: number;
      maxArtifacts: number;
      tokenBudget: number;
    };
  }>(path.join(fixtureRoot, "context-envelope.json"));
  const observedProfilesByEndpointId = await readJson<
    Parameters<typeof routeRuntimeRequest>[0]["observedProfilesByEndpointId"]
  >(path.join(fixtureRoot, "routing-observed-profiles.json"));
  const roleTaskFixture = await readJson<{
    roleDefinitions: Parameters<typeof routeRuntimeRequest>[0]["roleDefinitions"];
    taskDefinitions: Parameters<typeof routeRuntimeRequest>[0]["taskDefinitions"];
    roleBindings: Parameters<typeof routeRuntimeRequest>[0]["roleBindings"];
  }>(path.join(fixtureRoot, "adapter-role-task.json"));
  const runtimeRoles = buildRuntimeRoleCatalog(roleTaskFixture.roleDefinitions ?? []);
  const allowedRoleIds = runtimeRoles.roleSummaries.map((role) => role.roleId);
  const routingModel = await readJson<RoutingModelSelection>(
    path.join(fixtureRoot, "routing-model-guidance.json"),
  );
  const captureFixtureMap = await readJson<CaptureFixtureMap>(
    path.join(fixtureRoot, "adapter-captures.json"),
  );
  const observabilityHistory = await readJson<{
    byEndpointId: Record<string, ObservedPerformanceSample[]>;
  }>(path.join(fixtureRoot, "observability-history.json"));
  const observabilityPolicy = await readJson<RuntimeCapturePolicy>(
    path.join(fixtureRoot, "observability-policy.json"),
  );
  const providerPresets = await readJson<ProviderPresetCatalog>(
    path.join(fixtureRoot, "provider-presets.json"),
  );
  const initialization = initializeSqliteMemory({
    runtimeStateRoot: options.runtimeStateRoot,
    scopeId: options.scopeId,
  });
  clearRuntimeEndpoints(initialization.databasePath);
  const deviceId = randomUUID();

  persistContinuitySnapshot({
    databasePath: initialization.databasePath,
    session: continuityFixture.session,
    conversation: continuityFixture.conversation,
    turns: continuityFixture.turns,
    artifacts: continuityFixture.artifacts,
    artifactLinks: continuityFixture.artifactLinks,
    handoffs: continuityFixture.handoffs,
  });

  let currentUnifiedRuntimeConfig = initialUnifiedRuntimeConfig;
  const catalogWithFixtureModels = synthesizeFixtureModelsForCatalog(
    baseCatalog,
    providerAccountsFixture.accounts,
    registrySourcesFixture,
  );
  let currentNormalizedCatalog = applyUnifiedLiteLLMAdapterFamilyOverrides(catalogWithFixtureModels, currentUnifiedRuntimeConfig, liteLLMProviders);
  let currentModelsById = new Map(currentNormalizedCatalog.models.map((model) => [model.modelId, model]));
  let currentRegistrySources: RegistrySources =
    currentUnifiedRuntimeConfig !== null
      ? {
          cloud: createUnifiedCloudSources(currentUnifiedRuntimeConfig),
          local: createUnifiedLocalSources(currentUnifiedRuntimeConfig),
        }
      : registrySourcesFixture;
  let currentAccounts = [...listProviderAccounts({ databasePath: initialization.databasePath })];
  let runtimeEndpoints = [...listRuntimeEndpoints({ databasePath: initialization.databasePath })];
  let currentRegistry!: EndpointRegistryResult;
  let currentLlamaSwapVendor: VendorRuntime | null = null;
  let currentLiteLLMVendor: VendorRuntime | null = null;
  const getCurrentRegistrySources = (): RegistrySources =>
    mergeRegistrySources(currentRegistrySources, runtimeEndpoints);
  const rebuildCurrentState = (): void => {
    currentAccounts = [...listProviderAccounts({ databasePath: initialization.databasePath })];
    runtimeEndpoints = [...listRuntimeEndpoints({ databasePath: initialization.databasePath })];
    currentRegistry = buildEndpointRegistry({
      catalog: currentNormalizedCatalog,
      accounts: currentAccounts,
      sources: getCurrentRegistrySources(),
    });
    if (currentRegistry.diagnostics.length > 0) {
      throw new Error("Endpoint-registry validation failed after runtime state update.");
    }
  };
  const applyUnifiedRuntimeConfigState = async (nextConfig: UnifiedRuntimeConfig | null): Promise<void> => {
    const nextNormalizedCatalog = applyUnifiedLiteLLMAdapterFamilyOverrides(
      synthesizeFixtureModelsForCatalog(baseCatalog, providerAccountsFixture.accounts, registrySourcesFixture),
      nextConfig,
      liteLLMProviders,
    );
    const resolvedLlamaSwapCommand =
      nextConfig?.llamaSwap.enabled && !nextConfig.llamaSwap.process.command
        ? await resolveLlamaSwapCommand({
            repoRoot: options.repoRoot,
            runtimeStateRoot: options.runtimeStateRoot,
          })
        : null;

    await Promise.all([currentLlamaSwapVendor?.shutdown(), currentLiteLLMVendor?.shutdown()]);

    const nextLlamaSwapVendor =
      nextConfig?.llamaSwap.enabled && supervisor
        ? await startLlamaSwapVendor({
            repoRoot: options.repoRoot,
            runtimeStateRoot: options.runtimeStateRoot,
            supervisor,
            config: {
              models: nextConfig.llamaSwap.models,
              command: nextConfig.llamaSwap.process.command ?? resolvedLlamaSwapCommand ?? undefined,
              args: nextConfig.llamaSwap.process.args,
              env: nextConfig.llamaSwap.process.env,
              cwd: nextConfig.llamaSwap.process.cwd ?? undefined,
              startupTimeoutMs: nextConfig.llamaSwap.process.startupTimeoutMs ?? undefined,
            },
          })
        : null;
    const nextLiteLLMVendor =
      nextConfig?.liteLLM.enabled && supervisor
        ? await startLiteLLMVendor({
            runtimeStateRoot: options.runtimeStateRoot,
            supervisor,
            config: {
              providers: nextConfig.liteLLM.providers.map((provider) => ({
                providerId: provider.providerId,
                apiKeyRef: provider.apiKeyRef,
                modelMappings: provider.modelMappings,
              })),
              command: nextConfig.liteLLM.process.command ?? undefined,
              args: nextConfig.liteLLM.process.args,
              env: nextConfig.liteLLM.process.env,
              cwd: nextConfig.liteLLM.process.cwd ?? undefined,
              startupTimeoutMs: nextConfig.liteLLM.process.startupTimeoutMs ?? undefined,
            },
          })
        : null;

    if (nextConfig !== null) {
      const validation = validateProviderAccounts({
        catalog: nextNormalizedCatalog,
        additionalProviders: liteLLMProviders,
        accounts: createUnifiedProviderAccounts(
          nextNormalizedCatalog,
          liteLLMProviders,
          nextConfig,
          nextLiteLLMVendor?.readStatus().baseUrl ?? null,
          options.runtimeStateRoot,
          options.scopeId,
        ),
        allowedRoleIds,
      });
      if (validation.diagnostics.length > 0) {
        await Promise.all([nextLlamaSwapVendor?.shutdown(), nextLiteLLMVendor?.shutdown()]);
        throw new Error("Provider-account validation failed for runtime host bridge.");
      }
      deleteRuntimeConfigProviderAccounts(initialization.databasePath);
      persistProviderAccounts({
        databasePath: initialization.databasePath,
        accounts: validation.accounts,
      });
    }

    currentUnifiedRuntimeConfig = nextConfig;
    currentNormalizedCatalog = nextNormalizedCatalog;
    const liteLLMProviderIds = new Set(nextConfig?.liteLLM.providers.map((p) => p.providerId) ?? []);
    liteLLMProviders = liteLLMProviders.map((provider) =>
      liteLLMProviderIds.has(provider.providerId)
        ? { ...provider, adapterFamily: "litellm-proxy" as const }
        : provider,
    );
    currentModelsById = new Map(currentNormalizedCatalog.models.map((model) => [model.modelId, model]));
    currentRegistrySources =
      nextConfig !== null
        ? {
            cloud: createUnifiedCloudSources(nextConfig),
            local: createUnifiedLocalSources(nextConfig),
          }
        : registrySourcesFixture;
    currentLlamaSwapVendor = nextLlamaSwapVendor;
    currentLiteLLMVendor = nextLiteLLMVendor;
    rebuildCurrentState();
  };

  if (currentUnifiedRuntimeConfig === null) {
    const validation = validateProviderAccounts({
      catalog: currentNormalizedCatalog,
      additionalProviders: liteLLMProviders,
      accounts: providerAccountsFixture.accounts,
      allowedRoleIds,
    });
    if (validation.diagnostics.length > 0) {
      throw new Error("Provider-account validation failed for runtime host bridge.");
    }
    persistProviderAccounts({
      databasePath: initialization.databasePath,
      accounts: validation.accounts,
    });
    rebuildCurrentState();
  } else {
    await applyUnifiedRuntimeConfigState(currentUnifiedRuntimeConfig);
  }

  const continuity = readConversationContinuity({
    databasePath: initialization.databasePath,
    conversationId: continuityFixture.conversation.conversationId,
  });
  const envelope = assembleContextEnvelope({
    continuity,
    maxTurns: continuityFixture.selection.maxTurns,
    maxArtifacts: continuityFixture.selection.maxArtifacts,
    tokenBudget: continuityFixture.selection.tokenBudget,
  });
  const retrievalReceipt = createRetrievalReceipt({
    envelope,
    totalTurns: continuity.turns.length,
    totalArtifacts: continuity.artifacts.length,
  });
  persistRetrievalReceipt({
    databasePath: initialization.databasePath,
    retrievalReceiptId: retrievalReceipt.receiptId,
    conversationId: retrievalReceipt.conversationId,
    receiptSummary: JSON.stringify(retrievalReceipt.summary),
  });

  const captures = await loadResponseCaptures(options.repoRoot, captureFixtureMap);
  const getRegistryEndpoint = (endpointId: string): EndpointRegistryResult["endpoints"][number] | undefined =>
    currentRegistry.endpoints.find((endpoint) => endpoint.identity.endpoint_id === endpointId);
  const telemetryListeners = new Set<(event: RuntimeTelemetryStreamEvent) => void>();
  const normalizeTelemetryQuery = (query?: BridgeTelemetryQuery): BridgeTelemetryQuery => ({
    windowMs: query?.windowMs ?? DEFAULT_TELEMETRY_WINDOW_MS,
    limit: query?.limit ?? DEFAULT_TELEMETRY_LIMIT,
    ...(typeof query?.endAtMs === "number" ? { endAtMs: query.endAtMs } : {}),
  });
  const summarizeTelemetryRequestRecords = (
    records: readonly BridgeTelemetryRequestRecord[],
  ): ReturnType<typeof readRuntimeTelemetrySummary> => {
    const latencies = records
      .map((record) => record.latencyMs)
      .filter((value): value is number => typeof value === "number")
      .sort((left, right) => left - right);
    const totalLatency = latencies.reduce((sum, value) => sum + value, 0);
    const p95Index = latencies.length > 0 ? Math.max(0, Math.ceil(latencies.length * 0.95) - 1) : -1;
    return {
      requestCount: records.length,
      successCount: records.filter((record) => record.errorClass === null).length,
      failureCount: records.filter((record) => record.errorClass !== null).length,
      totalInputTokens: records.reduce((sum, record) => sum + record.inputTokens, 0),
      totalOutputTokens: records.reduce((sum, record) => sum + record.outputTokens, 0),
      totalTokens: records.reduce((sum, record) => sum + record.totalTokens, 0),
      cachedRequestCount: records.filter((record) => record.promptCacheUsed).length,
      totalActualCostUsd: Number(
        records.reduce((sum, record) => sum + (record.actualCostUsd ?? 0), 0).toFixed(6),
      ),
      totalEstimatedCostUsd: Number(
        records.reduce((sum, record) => sum + (record.estimatedCostUsd ?? 0), 0).toFixed(6),
      ),
      averageLatencyMs: latencies.length > 0 ? Math.round(totalLatency / latencies.length) : null,
      p95LatencyMs: p95Index >= 0 ? (latencies[p95Index] ?? null) : null,
      lastSeenAtMs: records[0]?.createdAtMs ?? null,
    };
  };
  const getTelemetryEndpointMeta = (
    endpointId: string,
  ): BridgeTelemetryEndpointMeta => {
    const registryEndpoint = getRegistryEndpoint(endpointId);
    const runtimeEndpoint = runtimeEndpoints.find((entry) => entry.endpointId === endpointId);
    const runtimeAccount = runtimeEndpoint
      ? currentAccounts.find((entry) => entry.providerAccountId === runtimeEndpoint.providerAccountId)
      : undefined;
    return {
      sourceType: registryEndpoint ? toSourceType(registryEndpoint.identity.endpoint_kind) : "local",
      providerId:
        (registryEndpoint ? currentModelsById.get(registryEndpoint.identity.model_id)?.providerId : undefined) ??
        runtimeAccount?.providerId ??
        null,
      endpointKind: registryEndpoint?.identity.endpoint_kind ?? runtimeEndpoint?.endpointKind ?? null,
      servingSource: registryEndpoint?.identity.serving_source ?? runtimeEndpoint?.servingSource ?? null,
      healthStatus:
        runtimeEndpoint?.healthStatus ??
        (registryEndpoint?.deniedByPolicy ? "policy-blocked" : registryEndpoint ? "healthy" : "unknown"),
      status: registryEndpoint?.status ?? runtimeEndpoint?.lifecycleState ?? "unknown",
      roleIds: getEndpointRoleIds(endpointId, runtimeEndpoints, currentAccounts),
    };
  };
  const listTelemetryRequestRecords = (
    query?: BridgeTelemetryQuery,
  ): readonly BridgeTelemetryRequestRecord[] => {
    const normalizedQuery = normalizeTelemetryQuery(query);
    return listRuntimeTelemetryRecords({
      databasePath: initialization.databasePath,
      ...normalizedQuery,
    }).map((record) => ({
      ...record,
      ...getTelemetryEndpointMeta(record.endpointId),
    }));
  };
  const readTelemetrySummaryData = (query?: BridgeTelemetryQuery): BridgeTelemetrySummary => {
    const normalizedQuery = normalizeTelemetryQuery(query);
    const requestRecords = listTelemetryRequestRecords(normalizedQuery);
    return {
      ...readRuntimeTelemetrySummary({
        databasePath: initialization.databasePath,
        ...normalizedQuery,
      }),
      sourceBreakdown: {
        local: summarizeTelemetryRequestRecords(
          requestRecords.filter((record) => record.sourceType === "local"),
        ),
        remote: summarizeTelemetryRequestRecords(
          requestRecords.filter((record) => record.sourceType === "remote"),
        ),
      },
    };
  };
  const listTelemetryComparisonData = (
    query?: BridgeTelemetryQuery,
  ): readonly BridgeTelemetryComparisonRow[] => {
    const normalizedQuery = normalizeTelemetryQuery(query);
    return listRuntimeTelemetryComparisonRows({
      databasePath: initialization.databasePath,
      ...normalizedQuery,
    }).map((row) => ({
      ...row,
      ...getTelemetryEndpointMeta(row.endpointId),
    }));
  };
  const emitTelemetryUpdate = (requestId: string): void => {
    const request = listTelemetryRequestRecords({ limit: 1 }).find((record) => record.requestId === requestId);
    if (!request) {
      return;
    }
    const event: RuntimeTelemetryStreamEvent = {
      eventName: "telemetry.update",
      emittedAtMs: Date.now(),
      summary: readTelemetrySummaryData(),
      request,
    };
    for (const listener of telemetryListeners) {
      listener(event);
    }
  };
  const getDefaultControllerAssignment = (): BridgeControllerAssignment | null => {
    const defaultEndpoint = getRegistryEndpoint(routingModel.endpointId);
    if (defaultEndpoint) {
      return toControllerAssignmentFromEndpoint(defaultEndpoint);
    }
    const fallbackEndpoint = currentRegistry.endpoints[0];
    if (!fallbackEndpoint) {
      return null;
    }
    return toControllerAssignmentFromEndpoint(fallbackEndpoint);
  };
  const readPersistedControllerAssignment = () =>
    readRuntimeControllerAssignment({
      databasePath: initialization.databasePath,
      scope: "global",
    });
  const executeBridgePlan = async (
    plan: BridgeExecutionPlan,
    requestId: string,
    streamRequested: boolean | undefined,
    streamWriter?: BridgeStreamWriter,
  ) => {
    let streamedChunkCount = 0;
    const trackedStreamWriter: BridgeStreamWriter | undefined = streamWriter
      ? async (chunk, metadata) => {
          streamedChunkCount += 1;
          await streamWriter(chunk, metadata);
        }
      : undefined;
    const routed = routeRuntimeRequest({
      request: plan.routingRequest,
      registry: currentRegistry,
      observedProfilesByEndpointId,
      envelope,
      retrievalReceipt,
      roleDefinitions: runtimeRoles.roleDefinitions,
      taskDefinitions: roleTaskFixture.taskDefinitions,
      roleBindings: buildRuntimeRoleBindings(
        roleTaskFixture.roleBindings ?? [],
        runtimeEndpoints,
        currentAccounts,
        currentRegistry,
        runtimeRoles.roleDefinitions,
      ),
      routingModel,
    });
    const routingDecisionId = routed.decision.routing_decision_id;
    const execution = await executeLiveRoutedRequest({
      routeResult: routed,
      catalog: currentNormalizedCatalog,
      additionalProviders: liteLLMProviders,
      accounts: currentAccounts,
      registry: currentRegistry,
      registrySources: getCurrentRegistrySources(),
      executionRequest: plan.executionRequest as RuntimeExecutionRequest,
      adapters: [
        ...(currentUnifiedRuntimeConfig?.liteLLM.enabled
          ? [createLiteLLMProviderAdapter()]
          : []),
        createOpenAIProviderAdapter(),
        createOpenAIProviderAdapter("ai-sdk-openai-compatible"),
        createAnthropicProviderAdapter(),
      ],
      executeProviderRequest: async ({
        target,
        requestCapture,
        fallbackModelIds,
      }: {
        target: ResolvedExecutionTarget;
        requestCapture: ProviderRequestCapture;
        fallbackModelIds?: readonly string[];
      }) => {
        if (currentUnifiedRuntimeConfig) {
          if (target.providerAccountId === null) {
            if (!currentLlamaSwapVendor) {
              throw createVendorError("llama-swap", "Configure llama_swap.models to enable local execution.");
            }
            const result = await currentLlamaSwapVendor.execute({
              providerFamily: requestCapture.providerFamily,
              endpointId: requestCapture.endpointId,
              url: requestCapture.url,
              headers: requestCapture.headers,
              body: requestCapture.body,
            }, trackedStreamWriter && requestCapture.body.stream === true
              ? {
                  streamWriter: async (chunk) => {
                    await trackedStreamWriter(chunk, {
                      endpointId: target.endpointId,
                      adapterFamily: target.adapterFamily,
                      routingDecisionId,
                    });
                  },
                }
              : undefined);
            return {
              providerFamily: target.adapterFamily,
              endpointId: target.endpointId,
              statusCode: result.statusCode,
              body: result.body,
              vendorMetadata: result.metadata,
            };
          }
          if (!currentLiteLLMVendor) {
            throw createVendorError("litellm", "Configure litellm_proxy.providers to enable remote execution.");
          }
          const result = await currentLiteLLMVendor.execute({
            providerFamily: requestCapture.providerFamily,
            endpointId: requestCapture.endpointId,
            url: requestCapture.url,
            headers: requestCapture.headers,
            body: requestCapture.body,
          }, {
            ...(trackedStreamWriter && requestCapture.body.stream === true
              ? {
                  streamWriter: async (chunk) => {
                    await trackedStreamWriter(chunk, {
                      endpointId: target.endpointId,
                      adapterFamily: target.adapterFamily,
                      routingDecisionId,
                    });
                  },
                }
              : {}),
            ...(fallbackModelIds?.length ? { fallbackModelIds } : {}),
          });
          return {
            providerFamily: target.adapterFamily,
            endpointId: target.endpointId,
            statusCode: result.statusCode,
            body: result.body,
            vendorMetadata: result.metadata,
          };
        }

        if (!shouldUseLiveProviderExecution(target)) {
          const capture = captures.byEndpointId[target.endpointId];
          if (!capture) {
            throw new Error(`No response capture is configured for endpoint ${target.endpointId}.`);
          }
          return {
            providerFamily: target.adapterFamily,
            endpointId: target.endpointId,
            statusCode: 200,
            body: capture.body,
          };
        }

        const credentialValue = await resolveCredentialValue(
          options.runtimeStateRoot,
          options.scopeId,
          target,
          providerPresets,
          networkFetcher,
          deviceId,
          rebuildCurrentState,
        );
        const oauthVariant = (() => {
          const preset = providerPresets.providers[target.providerId ?? ""];
          if (!preset || !target.account) return null;
          return preset.variants.find((v) => v.authMode === target.account!.authMode && v.oauth);
        })();
        const performRequest = async (resolvedCredentialValue: string) =>
          networkFetcher(requestCapture.url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(shouldUseLiveProviderExecution(target)
                ? createDeviceHeaders(deviceId, oauthVariant?.oauth?.requiredHeaders)
                : {}),
              ...applyCredentialToHeaders(requestCapture.headers, resolvedCredentialValue),
            },
            body: JSON.stringify(requestCapture.body),
          });
        let response = await performRequest(credentialValue);
        if (
          (response.status === 401 || response.status === 403) &&
          (target.account?.credentialRef.backend === "local-file" || target.account?.credentialRef.backend === "local-encrypted-file")
        ) {
          const refreshedCredentialValue = await refreshOauthAccessToken(
            options.runtimeStateRoot,
            options.scopeId,
            target,
            providerPresets,
            networkFetcher,
            deviceId,
            rebuildCurrentState,
          );
          response = await performRequest(refreshedCredentialValue);
        }
        if (!response.ok) {
          const rawBody = await response.text();
          const parsedBody = parseProviderResponseBody(rawBody);
          throw new Error(summarizeProviderError(response.status, parsedBody));
        }
        if (trackedStreamWriter && requestCapture.body.stream === true) {
          const rawBody = await readProviderStreamTranscript(response, trackedStreamWriter, {
            endpointId: target.endpointId,
            adapterFamily: target.adapterFamily,
            routingDecisionId,
          });
          if (!rawBody.includes("data:")) {
            return {
              providerFamily: target.adapterFamily,
              endpointId: target.endpointId,
              statusCode: response.status,
              body: parseProviderResponseBody(rawBody),
            };
          }
          return {
            providerFamily: target.adapterFamily,
            endpointId: target.endpointId,
            statusCode: response.status,
            body: rawBody,
          };
        }
        const rawBody = await response.text();
        const parsedBody = parseProviderResponseBody(rawBody);
        return {
          providerFamily: target.adapterFamily,
          endpointId: target.endpointId,
          statusCode: response.status,
          body: parsedBody,
        };
      },
    });
    if (
      trackedStreamWriter &&
      streamRequested === true &&
      streamedChunkCount === 0 &&
      typeof execution.responseCapture.body === "string" &&
      execution.responseCapture.body.includes("data:")
    ) {
      await replayProviderStreamTranscript(execution.responseCapture.body, trackedStreamWriter, {
        endpointId: execution.target.endpointId,
        adapterFamily: execution.target.adapterFamily,
        routingDecisionId,
      });
    }
    const toolExecutionResult =
      execution.normalized.toolCalls.length > 0
        ? await executeToolCalls(await createRuntimeToolRegistry(options.repoRoot, currentRegistry), {
            requestId,
            toolCalls: execution.normalized.toolCalls,
          })
        : {
            executions: [],
            diagnostics: [],
          };
    const providerAccount = currentAccounts.find(
      (account) => account.providerAccountId === execution.target.providerAccountId,
    );
    const bundle = createRuntimeObservationBundle({
      decision: routed.decision,
      routingDiagnostics: routed.routingDiagnostics,
      retrievalReceipt: {
        receiptId: retrievalReceipt.receiptId,
        summary: retrievalReceipt.summary,
      },
      contextEnvelope: {
        conversationId: envelope.conversationId,
        latestHandoffId: envelope.latestHandoff?.handoffId ?? null,
        estimatedTokenCount: envelope.estimatedTokenCount,
      },
      execution,
      priorSamples: [
        ...(observabilityHistory.byEndpointId[routed.decision.chosen_endpoint_id] ?? []),
        ...readObservedPerformanceSamples({
          databasePath: initialization.databasePath,
          endpointId: routed.decision.chosen_endpoint_id,
        }),
      ],
      maintenancePolicy: readRuntimeMaintenancePolicy({
        databasePath: initialization.databasePath,
      }),
      capturePolicy: observabilityPolicy,
      tooling: {
        executions: toolExecutionResult.executions,
      },
      ...(providerAccount
        ? {
            accountState: {
              providerAccountId: providerAccount.providerAccountId,
              status: providerAccount.status,
              healthStatus: providerAccount.healthStatus,
              rotationState: providerAccount.rotationState,
            },
          }
        : {}),
    });
    persistRuntimeObservationBundle({
      databasePath: initialization.databasePath,
      observation: bundle,
    });
    emitTelemetryUpdate(bundle.requestId);

    return {
      routingDecisionId,
      execution,
      toolExecutionResult,
    };
  };

  return {
    get registry(): EndpointRegistryResult {
      return currentRegistry;
    },
    async executeChatCompletions(
      body: OpenAIChatCompletionsBody,
      requestId: string,
      streamWriter?: BridgeStreamWriter,
    ): Promise<BridgeChatCompletionsExecutionResult> {
      if (currentUnifiedRuntimeConfig?.executionMode === "decision_only" && currentRegistry.endpoints.length === 0) {
        throw createVendorError("runtime", "Configure llama_swap.models or litellm_proxy.providers to enable execution.");
      }
      const plan = mapChatCompletionsRequest(currentRegistry, body, requestId);
      const { execution, toolExecutionResult, routingDecisionId } = await executeBridgePlan(
        plan,
        requestId,
        body.stream,
        streamWriter,
      );
      const costUsd =
        execution.normalized.vendorMetadata?.costUsd ?? execution.responseCapture.vendorMetadata?.costUsd;
      const cacheUsed =
        execution.normalized.vendorMetadata?.cacheUsed ?? execution.responseCapture.vendorMetadata?.cacheUsed;

      return {
        model: execution.target.modelId,
        endpointId: execution.target.endpointId,
        adapterFamily: execution.target.adapterFamily,
        routingDecisionId,
        ...(execution.responseCapture.vendorMetadata?.vendorId ?? execution.normalized.vendorMetadata?.vendorId
          ? { vendorId: execution.responseCapture.vendorMetadata?.vendorId ?? execution.normalized.vendorMetadata?.vendorId }
          : {}),
        outputText: execution.normalized.outputText,
        finishReason: execution.normalized.finishReason,
        ...(execution.normalized.toolCalls.length
          ? {
              toolCalls: execution.normalized.toolCalls.map((toolCall, index) =>
                toBridgeToolCall(toolCall, index),
              ),
            }
          : {}),
        ...(toolExecutionResult.executions.length
          ? {
              toolExecutions: toolExecutionResult.executions,
            }
          : {}),
        usage: {
          inputTokens: execution.normalized.usage.inputTokens,
          outputTokens: execution.normalized.usage.outputTokens,
        },
        ...(typeof costUsd === "number" || typeof cacheUsed === "boolean"
          ? {
              vendorMetadata: {
                ...(typeof costUsd === "number" ? { costUsd } : {}),
                ...(typeof cacheUsed === "boolean" ? { cacheUsed } : {}),
              },
            }
          : {}),
      };
    },
    async executeResponses(
      body: OpenAIResponsesBody,
      requestId: string,
      streamWriter?: BridgeStreamWriter,
    ): Promise<BridgeResponsesExecutionResult> {
      if (currentUnifiedRuntimeConfig?.executionMode === "decision_only" && currentRegistry.endpoints.length === 0) {
        throw createVendorError("runtime", "Configure llama_swap.models or litellm_proxy.providers to enable execution.");
      }
      const plan = mapResponsesRequest(currentRegistry, body, requestId);
      const { execution, routingDecisionId } = await executeBridgePlan(plan, requestId, body.stream, streamWriter);
      const costUsd =
        execution.normalized.vendorMetadata?.costUsd ?? execution.responseCapture.vendorMetadata?.costUsd;
      const cacheUsed =
        execution.normalized.vendorMetadata?.cacheUsed ?? execution.responseCapture.vendorMetadata?.cacheUsed;

      return {
        responseId: extractResponseId(execution.responseCapture.body) ?? "resp-role-model",
        model: execution.target.modelId,
        endpointId: execution.target.endpointId,
        adapterFamily: execution.target.adapterFamily,
        routingDecisionId,
        ...(execution.responseCapture.vendorMetadata?.vendorId ?? execution.normalized.vendorMetadata?.vendorId
          ? { vendorId: execution.responseCapture.vendorMetadata?.vendorId ?? execution.normalized.vendorMetadata?.vendorId }
          : {}),
        outputText: execution.normalized.outputText,
        finishReason: execution.normalized.finishReason,
        ...(execution.normalized.toolCalls.length
          ? {
              toolCalls: execution.normalized.toolCalls.map((toolCall, index) =>
                toBridgeToolCall(toolCall, index),
              ),
            }
          : {}),
        usage: {
          inputTokens: execution.normalized.usage.inputTokens,
          outputTokens: execution.normalized.usage.outputTokens,
        },
        ...(typeof costUsd === "number" || typeof cacheUsed === "boolean"
          ? {
              vendorMetadata: {
                ...(typeof costUsd === "number" ? { costUsd } : {}),
                ...(typeof cacheUsed === "boolean" ? { cacheUsed } : {}),
              },
            }
          : {}),
      };
    },
    async readRuntimeSummary(): Promise<{
      lifecycleSummary: EndpointRegistryResult["lifecycleSummary"];
      providerCount: number;
      accountCount: number;
      endpointCount: number;
      executionMode: UnifiedRuntimeExecutionMode;
      unifiedConfig: {
        enabled: boolean;
        path: string | null;
      };
    }> {
      return {
        lifecycleSummary: currentRegistry.lifecycleSummary,
        providerCount:
          currentNormalizedCatalog.providers.length +
          liteLLMProviders.filter(
            (provider) =>
              !currentNormalizedCatalog.providers.some((p) => p.providerId === provider.providerId),
          ).length,
        accountCount: currentAccounts.length,
        endpointCount: currentRegistry.endpoints.length,
        executionMode: currentUnifiedRuntimeConfig?.executionMode ?? "decision_only",
        unifiedConfig: {
          enabled: currentUnifiedRuntimeConfig !== null,
          path: options.unifiedRuntimeConfigPath ?? null,
        },
      };
    },
    async readHealthStatus(): Promise<{
      status: "healthy" | "degraded";
      executionMode: UnifiedRuntimeExecutionMode;
      vendors: Record<string, VendorRuntimeStatus>;
      inactiveVendors: string[];
    }> {
      const vendors = {
        "llama-swap": currentLlamaSwapVendor?.readStatus() ?? createInactiveVendorStatus("llama-swap"),
        litellm: currentLiteLLMVendor?.readStatus() ?? createInactiveVendorStatus("litellm"),
      };
      const summarized = summarizeHealthStatus(vendors);
      return {
        status: summarized.status,
        executionMode: currentUnifiedRuntimeConfig?.executionMode ?? "decision_only",
        vendors,
        inactiveVendors: summarized.inactiveVendors,
      };
    },
    async readRuntimeConfig(): Promise<{
      applied: boolean;
      path: string | null;
      config: UnifiedRuntimeConfig | null;
    }> {
      return {
        applied: currentUnifiedRuntimeConfig !== null,
        path: options.unifiedRuntimeConfigPath ?? null,
        config: currentUnifiedRuntimeConfig,
      };
    },
    async updateRuntimeConfig(body: Record<string, unknown>): Promise<{
      applied: boolean;
      path: string | null;
      config: UnifiedRuntimeConfig | null;
    }> {
      if (!options.unifiedRuntimeConfigPath) {
        throw new Error("Unified runtime config editing requires unifiedRuntimeConfigPath.");
      }

      const previousConfig = currentUnifiedRuntimeConfig;
      const previousText = await readFile(options.unifiedRuntimeConfigPath, "utf8");
      const nextConfig = normalizeUnifiedRuntimeConfigInput(body);
      const nextText = renderUnifiedRuntimeConfigText(nextConfig);

      await writeFile(options.unifiedRuntimeConfigPath, nextText, "utf8");

      try {
        await applyUnifiedRuntimeConfigState(nextConfig);
      } catch (error) {
        await writeFile(options.unifiedRuntimeConfigPath, previousText, "utf8");
        if (previousConfig) {
          await applyUnifiedRuntimeConfigState(previousConfig);
        }
        throw error;
      }

      return {
        applied: true,
        path: options.unifiedRuntimeConfigPath,
        config: currentUnifiedRuntimeConfig,
      };
    },
    async listProviders(): Promise<
      readonly {
        providerId: string;
        displayName: string;
        providerKind: string;
        authFamily: string;
        adapterFamily: string;
        apiBase: string;
        envVars: readonly string[];
        supportedAuthModes: readonly string[];
        controlPlaneRequirements: readonly string[];
        localOverrideApplied: boolean;
        modelIds: readonly string[];
        variants: readonly ProviderPresetVariant[];
      }[]
    > {
      function resolveModelIds(providerId: string): readonly string[] {
        const fromConfig = readUnifiedLiteLLMProviderModelIds(currentUnifiedRuntimeConfig, providerId);
        if (fromConfig) {
          return fromConfig;
        }
        const fromCatalog = currentNormalizedCatalog.models
          .filter((model) => model.providerId === providerId)
          .map((model) => model.modelId);
        if (fromCatalog.length > 0) {
          return fromCatalog;
        }
        const fromLiteLLM = liteLLMModelPrices
          ? extractLiteLLMModelIds(liteLLMModelPrices, providerId)
          : [];
        if (fromLiteLLM.length > 0) {
          return fromLiteLLM;
        }
        return (providerPresets.providers[providerId]?.variants?.[0]?.modelIds ?? []);
      }

      const normalizedProviderIds = new Set(currentNormalizedCatalog.providers.map((p) => p.providerId));
      const liteLLMProviderIds = new Set(liteLLMProviders.map((p) => p.providerId));
      const localModelIds = currentUnifiedRuntimeConfig?.llamaSwap.models.map((m) => m.modelId) ?? [];
      const mergedProviders = [
        ...currentNormalizedCatalog.providers.map((provider) => {
          const effectiveModelIds = resolveModelIds(provider.providerId);
          const presetVariants = (providerPresets.providers[provider.providerId]?.variants ?? []).map((variant) => ({
            ...variant,
            modelIds: effectiveModelIds.length > 0 ? effectiveModelIds : variant.modelIds,
          }));
          // Merge OAuth variant from LiteLLM metadata when present
          const liteLLMProvider = liteLLMProviders.find((p) => p.providerId === provider.providerId);
          const liteLLMOAuthVariant: ProviderPresetVariant[] = liteLLMProvider?.oauth
            ? [
                {
                  variantId: `${provider.providerId}-oauth`,
                  label: `${provider.displayName} OAuth`,
                  description: `OAuth device-code authentication for ${provider.displayName}.`,
                  authMode: "oauth2-device-code",
                  availability: "ready" as const,
                  baseUrl: provider.apiBase,
                  modelIds: effectiveModelIds,
                  oauth: {
                    clientId: liteLLMProvider.oauth.clientId,
                    deviceAuthorizationEndpoint: liteLLMProvider.oauth.deviceAuthorizationEndpoint,
                    tokenEndpoint: liteLLMProvider.oauth.tokenEndpoint,
                    requiredHeaders: [...liteLLMProvider.oauth.requiredHeaders],
                    ...(liteLLMProvider.oauth.scope ? { scope: liteLLMProvider.oauth.scope } : {}),
                  },
                },
              ]
            : [];
          return {
            providerId: provider.providerId,
            displayName: provider.displayName,
            providerKind: provider.providerKind,
            authFamily: provider.authFamily,
            adapterFamily: provider.adapterFamily,
            apiBase: provider.apiBase,
            envVars: provider.envVars,
            supportedAuthModes: provider.supportedAuthModes,
            controlPlaneRequirements: provider.controlPlaneRequirements,
            localOverrideApplied: provider.localOverrideApplied,
            modelIds: effectiveModelIds,
            variants: [...presetVariants, ...liteLLMOAuthVariant] as readonly ProviderPresetVariant[],
          };
        }),
        ...liteLLMProviders
          .filter((provider) => !normalizedProviderIds.has(provider.providerId))
          .map((provider) => {
            const effectiveModelIds = resolveModelIds(provider.providerId);
            const presetVariants = (providerPresets.providers[provider.providerId]?.variants ?? []).map((variant) => ({
              ...variant,
              modelIds: effectiveModelIds.length > 0 ? effectiveModelIds : variant.modelIds,
            }));
            // Generate OAuth variant from LiteLLM metadata when OAuth config is present
            const liteLLMOAuthVariants: ProviderPresetVariant[] = provider.oauth
              ? [
                  {
                    variantId: `${provider.providerId}-oauth`,
                    label: `${provider.displayName} OAuth`,
                    description: `OAuth device-code authentication for ${provider.displayName}.`,
                    authMode: "oauth2-device-code",
                    availability: "ready" as const,
                    baseUrl: provider.apiBase,
                    modelIds: effectiveModelIds,
                    oauth: {
                      clientId: provider.oauth.clientId,
                      deviceAuthorizationEndpoint: provider.oauth.deviceAuthorizationEndpoint,
                      tokenEndpoint: provider.oauth.tokenEndpoint,
                      requiredHeaders: [...provider.oauth.requiredHeaders],
                      ...(provider.oauth.scope ? { scope: provider.oauth.scope } : {}),
                    },
                  },
                ]
              : [];
            // Generate API-key variant when supported
            const liteLLMApiKeyVariants: ProviderPresetVariant[] =
              provider.supportedAuthModes.includes("api-key-static") ||
              provider.supportedAuthModes.length === 0
                ? [
                    {
                      variantId: `${provider.providerId}-api-key`,
                      label: `${provider.displayName} API Key`,
                      description: `API-key authentication for ${provider.displayName}.`,
                      authMode: "api-key-static",
                      availability: "ready" as const,
                      baseUrl: provider.apiBase,
                      modelIds: effectiveModelIds,
                    },
                  ]
                : [];
            return {
              providerId: provider.providerId,
              displayName: provider.displayName,
              providerKind: provider.providerKind,
              authFamily: provider.authFamily,
              adapterFamily: provider.adapterFamily,
              apiBase: provider.apiBase,
              envVars: provider.envVars,
              supportedAuthModes: provider.supportedAuthModes,
              controlPlaneRequirements: provider.controlPlaneRequirements,
              localOverrideApplied: provider.localOverrideApplied,
              modelIds: effectiveModelIds,
              variants: [...liteLLMApiKeyVariants, ...liteLLMOAuthVariants, ...presetVariants] as readonly ProviderPresetVariant[],
            };
          }),
        ...(!normalizedProviderIds.has("llama-swap") && !liteLLMProviderIds.has("llama-swap")
          ? [
              {
                providerId: "llama-swap",
                displayName: "Local (llama-swap)",
                providerKind: "provider-openai",
                authFamily: "api-key",
                adapterFamily: "ai-sdk-openai-compatible",
                apiBase: "http://localhost:8080",
                envVars: [] as readonly string[],
                supportedAuthModes: [] as readonly string[],
                controlPlaneRequirements: [] as readonly string[],
                localOverrideApplied: true,
                modelIds: localModelIds,
                variants: [
                  {
                    variantId: "local-default",
                    label: "Local llama-swap",
                    description: "Locally hosted models via llama-swap.",
                    authMode: "api-key-static" as const,
                    availability: "ready" as const,
                    baseUrl: "http://localhost:8080",
                    modelIds: localModelIds,
                  },
                ] as readonly ProviderPresetVariant[],
              },
            ]
          : []),
      ];
      return mergedProviders.sort((left, right) => compareText(left.providerId, right.providerId));
    },
    async listRoles(): Promise<
      readonly {
        roleId: string;
        label: string;
        description: string;
        taskTypes: readonly string[];
      }[]
    > {
      return runtimeRoles.roleSummaries;
    },
    async listAccounts(): Promise<ReturnType<typeof listProviderAccounts>> {
      return listProviderAccounts({
        databasePath: initialization.databasePath,
      });
    },
    async upsertProviderAccount(account: Record<string, unknown>): Promise<ProviderAccountRecord> {
      const validationResult = validateProviderAccounts({
        catalog: currentNormalizedCatalog,
        additionalProviders: liteLLMProviders,
        allowedRoleIds,
        accounts: [account],
      });

      if (validationResult.diagnostics.length > 0 || validationResult.accounts.length !== 1) {
        const message =
          validationResult.diagnostics[0]?.message ?? "Provider account upsert validation failed.";
        throw new Error(message);
      }

      const [validatedAccount] = validationResult.accounts;
      upsertSqliteProviderAccount({
        databasePath: initialization.databasePath,
        account: validatedAccount,
      });
      rebuildCurrentState();

      return validatedAccount;
    },
    async startProviderDeviceAuthorization(body: Record<string, unknown>): Promise<DeviceAuthorizationStartResult> {
      const providerAccountId = readRequiredString(body, "providerAccountId", "deviceAuthorization");
      const providerId = readRequiredString(body, "providerId", "deviceAuthorization");
      const variantId = readRequiredString(body, "variantId", "deviceAuthorization");
      const provider =
        currentNormalizedCatalog.providers.find((entry) => entry.providerId === providerId) ??
        liteLLMProviders.find((entry) => entry.providerId === providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} is not present in the normalized catalog or LiteLLM provider list.`);
      }
      const variant = providerPresets.providers[providerId]?.variants.find((entry) => entry.variantId === variantId);
      if (!variant || variant.authMode !== "oauth2-device-code" || !variant.oauth) {
        throw new Error(`Provider variant ${variantId} does not expose device OAuth.`);
      }

      const effectiveVariantModelIds =
        readUnifiedLiteLLMProviderModelIds(currentUnifiedRuntimeConfig, providerId) ?? variant.modelIds;
      const allowedModels =
        readStringArray(body, "allowedModels") ??
        (effectiveVariantModelIds.length > 0
          ? [...effectiveVariantModelIds]
          : currentNormalizedCatalog.models
              .filter((model) => model.providerId === providerId)
              .map((model) => model.modelId));
      if (allowedModels.length === 0) {
        throw new Error(`Provider ${providerId} does not expose any selectable models.`);
      }

      const credentialRef = createCredentialRef(providerId, providerAccountId);
      const validationResult = validateProviderAccounts({
        catalog: currentNormalizedCatalog,
        additionalProviders: liteLLMProviders,
        allowedRoleIds,
        accounts: [
          {
            providerAccountId,
            providerId,
            providerKind: readOptionalString(body, "providerKind") ?? provider.providerKind,
            orgScope: readOptionalString(body, "orgScope") ?? "personal",
            accountScope: readOptionalString(body, "accountScope") ?? "workspace-default",
            credentialRef: {
              backend: "local-file",
              ref: credentialRef,
            },
            authMode: variant.authMode,
            regionPolicy: {
              mode: "prefer",
              regions: [readOptionalString(body, "region") ?? "global"],
            },
            baseUrlOverride: variant.baseUrl,
            allowedModels,
            modelRoleBindings: (() => {
              const modelRoleBindings = body.modelRoleBindings;
              return Array.isArray(modelRoleBindings) ? modelRoleBindings : [];
            })(),
            deniedModels: readStringArray(body, "deniedModels") ?? [],
            entitlementTags: readStringArray(body, "entitlementTags") ?? ["chat"],
            budgetPolicyRef: readOptionalString(body, "budgetPolicyRef") ?? "budget.default",
            quotaPolicyRef: readOptionalString(body, "quotaPolicyRef") ?? "quota.default",
            status: "disabled",
            healthStatus: "credentials-missing",
            rotationState: "in-progress",
          },
        ],
      });

      if (validationResult.diagnostics.length > 0 || validationResult.accounts.length !== 1) {
        throw new Error(
          validationResult.diagnostics[0]?.message ?? "Provider device-authorization validation failed.",
        );
      }

      const deviceAuthParams = new URLSearchParams({
        client_id: variant.oauth.clientId,
      });
      if (variant.oauth.scope) {
        deviceAuthParams.set("scope", variant.oauth.scope);
      }
      const deviceResponse = await networkFetcher(variant.oauth.deviceAuthorizationEndpoint, {
        method: "POST",
        headers: createDeviceHeaders(deviceId, variant.oauth.requiredHeaders),
        body: deviceAuthParams,
      });
      const devicePayload = (await deviceResponse.json()) as Record<string, unknown>;
      if (!deviceResponse.ok) {
        throw new Error(
          typeof devicePayload.error_description === "string"
            ? devicePayload.error_description
            : "Device authorization failed.",
        );
      }

      const authRequestId = randomUUID();
      upsertSqliteProviderAccount({
        databasePath: initialization.databasePath,
        account: validationResult.accounts[0],
      });
      upsertProviderDeviceAuthSession({
        databasePath: initialization.databasePath,
        session: {
          authRequestId,
          providerAccountId,
          providerId,
          variantId,
          credentialBackend: "local-file",
          credentialRef,
          authMode: variant.authMode,
          verificationUri: String(devicePayload.verification_uri ?? ""),
          verificationUriComplete: String(devicePayload.verification_uri_complete ?? ""),
          userCode: String(devicePayload.user_code ?? ""),
          deviceCode: String(devicePayload.device_code ?? ""),
          intervalSeconds: Number(devicePayload.interval ?? 5),
          status: "pending",
          lastError: null,
          expiresAtMs: Date.now() + Number(devicePayload.expires_in ?? 900) * 1000,
        },
      });
      rebuildCurrentState();

      return {
        authRequestId,
        providerAccountId,
        status: "pending",
        userCode: String(devicePayload.user_code ?? ""),
        verificationUri: String(devicePayload.verification_uri ?? ""),
        verificationUriComplete: String(devicePayload.verification_uri_complete ?? ""),
        intervalSeconds: Number(devicePayload.interval ?? 5),
        expiresAtMs: Date.now() + Number(devicePayload.expires_in ?? 900) * 1000,
      };
    },
    async pollProviderDeviceAuthorization(body: Record<string, unknown>): Promise<DeviceAuthorizationPollResult> {
      const authRequestId = readRequiredString(body, "authRequestId", "deviceAuthorization");
      const session = readProviderDeviceAuthSession({
        databasePath: initialization.databasePath,
        authRequestId,
      });
      if (!session) {
        throw new Error(`Device authorization request ${authRequestId} was not found.`);
      }
      const variant = providerPresets.providers[session.providerId]?.variants.find(
        (entry) => entry.variantId === session.variantId,
      );
      if (!variant?.oauth) {
        throw new Error(`Provider variant ${session.variantId} does not expose device OAuth.`);
      }
      if (Date.now() >= session.expiresAtMs) {
        upsertProviderDeviceAuthSession({
          databasePath: initialization.databasePath,
          session: {
            ...session,
            status: "expired",
            lastError: "Device code expired.",
          },
        });
        return {
          authRequestId,
          providerAccountId: session.providerAccountId,
          status: "expired",
          lastError: "Device code expired.",
        };
      }

      const tokenResponse = await networkFetcher(variant.oauth.tokenEndpoint, {
        method: "POST",
        headers: createDeviceHeaders(deviceId, variant.oauth.requiredHeaders),
        body: new URLSearchParams({
          client_id: variant.oauth.clientId,
          device_code: session.deviceCode,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      });
      const tokenPayload = (await tokenResponse.json()) as Record<string, unknown>;
      if (tokenResponse.ok && typeof tokenPayload.access_token === "string") {
        await persistOauthTokenFile(options.runtimeStateRoot, options.scopeId, session.credentialRef, {
          providerId: session.providerId,
          providerAccountId: session.providerAccountId,
          access_token: tokenPayload.access_token,
          refresh_token: tokenPayload.refresh_token,
          expires_in: tokenPayload.expires_in,
          scope: tokenPayload.scope,
          token_type: tokenPayload.token_type,
          saved_at_ms: Date.now(),
        });
        upsertProviderDeviceAuthSession({
          databasePath: initialization.databasePath,
          session: {
            ...session,
            status: "connected",
            lastError: null,
          },
        });
        const account = currentAccounts.find(
          (entry) => entry.providerAccountId === session.providerAccountId,
        );
        if (account) {
          upsertSqliteProviderAccount({
            databasePath: initialization.databasePath,
            account: {
              ...account,
              status: "active",
              healthStatus: "healthy",
              rotationState: "stable",
            },
          });
          rebuildCurrentState();
        }
        return {
          authRequestId,
          providerAccountId: session.providerAccountId,
          status: "connected",
        };
      }

      const errorCode = typeof tokenPayload.error === "string" ? tokenPayload.error : "authorization_pending";
      const errorDescription =
        typeof tokenPayload.error_description === "string"
          ? tokenPayload.error_description
          : "Waiting for authorization.";
      const mappedStatus =
        errorCode === "expired_token"
          ? "expired"
          : errorCode === "authorization_pending" || errorCode === "slow_down"
            ? "pending"
            : "failed";
      upsertProviderDeviceAuthSession({
        databasePath: initialization.databasePath,
        session: {
          ...session,
          status: mappedStatus,
          lastError: errorDescription,
        },
      });
      return {
        authRequestId,
        providerAccountId: session.providerAccountId,
        status: mappedStatus,
        ...(mappedStatus === "pending"
          ? { retryAfterSeconds: errorCode === "slow_down" ? session.intervalSeconds + 5 : session.intervalSeconds }
          : {}),
        ...(mappedStatus === "pending" ? {} : { lastError: errorDescription }),
      };
    },
    async activateEndpoint(body: Record<string, unknown>): Promise<Record<string, unknown>> {
      const providerAccountId = readRequiredString(body, "providerAccountId", "activateEndpoint");
      const modelId = readRequiredString(body, "modelId", "activateEndpoint");
      const region = readOptionalString(body, "region") ?? "global";
      const account = currentAccounts.find((entry) => entry.providerAccountId === providerAccountId);
      if (!account) {
        throw new Error(`Provider account ${providerAccountId} was not found.`);
      }
      if (account.status !== "active" || account.healthStatus !== "healthy") {
        throw new Error(`Provider account ${providerAccountId} is not ready for endpoint activation.`);
      }
      if (account.allowedModels.length > 0 && !account.allowedModels.includes(modelId)) {
        throw new Error(`Model ${modelId} is not enabled for provider account ${providerAccountId}.`);
      }
      let model = currentModelsById.get(modelId);
      if (!model) {
        const providerId = modelId.includes("/") ? modelId.split("/")[0] : account.providerId;
        const fallbackTemplate = createFallbackModelTemplate(currentNormalizedCatalog);
        model = {
          ...fallbackTemplate,
          modelId,
          providerId,
          displayName: readDefaultDisplayNameFromModelId(modelId),
          localOverrideApplied: true,
          localNotes: ["Synthesized on-demand during endpoint activation."],
          upstreamProvenance: currentNormalizedCatalog.source,
        };
        currentNormalizedCatalog = {
          ...currentNormalizedCatalog,
          models: [...currentNormalizedCatalog.models, model],
        };
        currentModelsById.set(modelId, model);
      }

      const endpointId = readOptionalString(body, "endpointId") ?? createEndpointId(providerAccountId, region, modelId);
      upsertSqliteRuntimeEndpoint({
        databasePath: initialization.databasePath,
        endpoint: {
          endpointId,
          providerAccountId,
          modelId,
          region,
          endpointKind: readOptionalString(body, "endpointKind") ?? "remote-openai-compatible",
          servingSource: readOptionalString(body, "servingSource") ?? "remote-service",
          lifecycleState: "active",
          healthStatus: "healthy",
        },
      });
      rebuildCurrentState();
      return {
        endpointId,
        providerAccountId,
        providerId: account.providerId,
        modelId: model.modelId,
        roleIds: getModelRoleIds(account, model.modelId),
        status: "active",
      };
    },
    async readControllerAssignment(): Promise<BridgeControllerAssignment | null> {
      const persisted = readPersistedControllerAssignment();
      if (persisted) {
        return {
          scope: "global",
          endpointId: persisted.endpointId,
          modelId: persisted.modelId,
          sourceType: persisted.sourceType === "remote" ? "remote" : "local",
          updatedAtMs: persisted.updatedAtMs,
        };
      }
      return getDefaultControllerAssignment();
    },
    async updateControllerAssignment(body: Record<string, unknown>): Promise<BridgeControllerAssignment> {
      const endpointId = readRequiredString(body, "endpointId", "updateControllerAssignment");
      const endpoint = getRegistryEndpoint(endpointId);
      if (!endpoint) {
        throw new Error(`Endpoint ${endpointId} is not present in the runtime registry.`);
      }

      const assignment = {
        ...toControllerAssignmentFromEndpoint(endpoint),
        updatedAtMs: Date.now(),
      } satisfies BridgeControllerAssignment;
      upsertRuntimeControllerAssignment({
        databasePath: initialization.databasePath,
        assignment,
      });
      return assignment;
    },
    async listEndpoints(): Promise<
      readonly {
        endpointId: string;
        modelId: string;
        providerId: string | null;
        roleIds: readonly string[];
        endpointKind: string;
        servingSource: string;
        sourceType: "local" | "remote";
        healthStatus: string;
        capabilities: readonly string[];
        toolCallingSupported: boolean;
        toolCallingStyle: string;
        status: string;
      }[]
    > {
      return currentRegistry.endpoints.map((endpoint) => ({
        endpointId: endpoint.identity.endpoint_id,
        modelId: endpoint.identity.model_id,
        providerId: currentModelsById.get(endpoint.identity.model_id)?.providerId ?? null,
        roleIds: getEndpointRoleIds(endpoint.identity.endpoint_id, runtimeEndpoints, currentAccounts),
        endpointKind: endpoint.identity.endpoint_kind,
        servingSource: endpoint.identity.serving_source,
        sourceType: toSourceType(endpoint.identity.endpoint_kind),
        healthStatus:
          runtimeEndpoints.find((entry) => entry.endpointId === endpoint.identity.endpoint_id)?.healthStatus ??
          (endpoint.deniedByPolicy ? "policy-blocked" : "healthy"),
        capabilities: endpoint.declared.capabilities,
        toolCallingSupported: endpoint.declared.tool_calling.supported,
        toolCallingStyle: endpoint.declared.tool_calling.style,
        status: endpoint.status,
      }));
    },
    async readTelemetrySummary(query?: BridgeTelemetryQuery): Promise<BridgeTelemetrySummary> {
      return readTelemetrySummaryData(query);
    },
    async listTelemetryComparisonRows(
      query?: BridgeTelemetryQuery,
    ): Promise<readonly BridgeTelemetryComparisonRow[]> {
      return listTelemetryComparisonData(query);
    },
    async listTelemetryRequests(
      query?: BridgeTelemetryQuery,
    ): Promise<readonly BridgeTelemetryRequestRecord[]> {
      return listTelemetryRequestRecords(query);
    },
    subscribeTelemetry(listener: (event: RuntimeTelemetryStreamEvent) => void): () => void {
      telemetryListeners.add(listener);
      return () => {
        telemetryListeners.delete(listener);
      };
    },
    async readRequestObservation(
      requestId: string,
    ): Promise<(RuntimeObservationBundle & BridgeTelemetryEndpointMeta) | null> {
      const observation = readRuntimeObservationBundle({
        databasePath: initialization.databasePath,
        requestId,
      }) as RuntimeObservationBundle | null;
      if (!observation) {
        return null;
      }
      return {
        ...observation,
        ...getTelemetryEndpointMeta(observation.endpointId),
      };
    },
    async listRecentRequestObservations(): Promise<
      readonly ReturnType<typeof listRecentRuntimeObservations>[number][]
    > {
      return listRecentRuntimeObservations({
        databasePath: initialization.databasePath,
      });
    },
    async readEndpointProfile(endpointId: string): Promise<{
      endpointId: string;
      latestProfile: ReturnType<typeof readLatestObservedProfile>;
      recentSamples: readonly ObservedPerformanceSample[];
    }> {
      return {
        endpointId,
        latestProfile: readLatestObservedProfile({
          databasePath: initialization.databasePath,
          endpointId,
        }),
        recentSamples: readObservedPerformanceSamples({
          databasePath: initialization.databasePath,
          endpointId,
        }),
      };
    },
    async shutdown(): Promise<void> {
      await Promise.all([currentLlamaSwapVendor?.shutdown(), currentLiteLLMVendor?.shutdown()]);
      await supervisor?.shutdown();
    },
  };
}

export function resolveBridgeServerOptions(input: {
  host?: string;
  port?: string;
  repoRoot?: string;
  runtimeStateRoot?: string;
  scopeId?: string;
  unifiedRuntimeConfigPath?: string;
}): BridgeServerOptions {
  if (!input.repoRoot) {
    throw new Error("repoRoot is required for the runtime host bridge.");
  }
  if (!input.runtimeStateRoot) {
    throw new Error("runtimeStateRoot is required for the runtime host bridge.");
  }

  return {
    host: input.host?.trim() || "127.0.0.1",
    port: input.port ? Number.parseInt(input.port, 10) : 8091,
    repoRoot: input.repoRoot,
    runtimeStateRoot: input.runtimeStateRoot,
    scopeId: input.scopeId?.trim() || "runtime-host-bridge",
    unifiedRuntimeConfigPath: input.unifiedRuntimeConfigPath?.trim() || undefined,
  };
}
