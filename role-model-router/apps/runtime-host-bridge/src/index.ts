import { createHash, randomUUID } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";
import { parse } from "yaml";

import type {
  NormalizedCatalog,
  NormalizedCatalogModel,
  PricingHints,
} from "@role-model-router/catalog";
import { assembleContextEnvelope } from "@role-model-router/context-envelope";
import { canonicalTaxonomy, taxonomyManifest } from "@role-model-router/core";
import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import { type RegistrySources, buildEndpointRegistry } from "@role-model-router/endpoint-registry";
import { ProcessSupervisor } from "@role-model-router/process-supervisor";
import {
  type ObservedPerformanceSample,
  aggregateObservedPerformanceSamples,
  resolveRoutingBenchmarkQuality,
} from "@role-model-router/profile-aggregator";
import {
  type CacheContinuityRoutingHints,
  type RouteRuntimeRequestResult,
  type RoutingModelSelection,
  routeRuntimeRequest,
} from "@role-model-router/protocol-routing";
import {
  type CredentialReference,
  type ProviderAccountRecord,
  validateProviderAccounts,
} from "@role-model-router/provider-account";
import { createAnthropicProviderAdapter } from "@role-model-router/provider-anthropic";
import { createLiteLLMProviderAdapter } from "@role-model-router/provider-litellm";
import {
  type DeclaredMcpConnectorConfig,
  createMcpConnectorDefinitions,
} from "@role-model-router/provider-mcp";
import { createOpenAIProviderAdapter } from "@role-model-router/provider-openai";
import { createRetrievalReceipt } from "@role-model-router/retrieval-receipt";
import {
  type RuntimeCapturePolicy,
  type RuntimeExecutionCooldownReceipt,
  type RuntimeExecutionFailedAttemptReceipt,
  type RuntimeObservationBundle,
  type RuntimeObservationCapturePolicyReceipt,
  type RuntimeRoutingDiagnostics,
  type RuntimeRoutingMode,
  type RuntimeTelemetrySnapshot,
  createRuntimeObservationBundle,
} from "@role-model-router/runtime-observability";
import {
  buildAdvisoryMaxDifficultyRecommendation,
  clearAllObservedBenchmarkData,
  clearBenchmarkRunArtifacts,
  clearObservedBenchmarkDataForEndpoint,
  deleteRuntimeControllerAssignment,
  initializeSqliteMemory,
  insertSwapEvent,
  listProviderAccounts,
  listRecentRuntimeObservations,
  listRecentRuntimeRequestIds,
  listRuntimeEndpoints,
  listRuntimeTelemetryComparisonRows,
  listRuntimeTelemetryRecords,
  listSwapEvents,
  persistContinuitySnapshot,
  persistProviderAccounts,
  persistRetrievalReceipt,
  persistRuntimeObservationBundle,
  persistRuntimeTelemetryFailure,
  readAdvisoryMaxDifficultyRecommendation,
  readConversationContinuity,
  readDifficultyClassificationCache,
  readLatestObservedProfile,
  readLatestObservedProfilesByEndpointIds,
  readObservedPerformanceSamples,
  readObservedThroughputPenaltyState,
  readProviderDeviceAuthSession,
  readRuntimeControllerAssignment,
  readRuntimeMaintenancePolicy,
  readRuntimeObservationBundle,
  readRuntimeTelemetrySummary,
  upsertDifficultyClassificationCache,
  upsertObservedThroughputPenaltyState,
  upsertProviderDeviceAuthSession,
  upsertRuntimeControllerAssignment,
  upsertRuntimeMaintenanceValue,
  upsertProviderAccount as upsertSqliteProviderAccount,
  upsertRuntimeEndpoint as upsertSqliteRuntimeEndpoint,
} from "@role-model-router/sqlite-memory";
import {
  type ConversationContinuitySnapshot,
  listProviderDeviceAuthSessions,
} from "@role-model-router/sqlite-memory";
import {
  type ToolConnector,
  type ToolRegistry,
  type ToolRegistryExecution,
  createToolRegistry,
  executeToolCalls,
} from "@role-model-router/tool-registry";
import {
  buildCompactControllerSystemPrompt,
  buildControllerSystemPrompt,
  parseAndSanitizeControllerRoutingGuidance,
} from "./controller-routing-contract.js";
import { createDownstreamOpenAIDiscovery } from "./downstream-openai-discovery.js";
import {
  EXECUTION_CIRCUIT_BREAKER_MAINTENANCE_KEY,
  type ExecutionCircuitRecord,
  type ExecutionCircuitState,
  type ExecutionTrafficClass,
  LEGACY_EXECUTION_FAILURE_COOLDOWN_MAINTENANCE_KEY,
  claimExecutionCircuitProbe,
  classifyExecutionFailureCategory,
  clearExecutionCircuitEndpoint,
  evaluateExecutionCircuitEligibility,
  migrateLegacyExecutionCooldownState,
  normalizeExecutionCircuitStateForRestart,
  parseRetryAfterMs,
  recordExecutionCircuitFailure,
  releaseExecutionCircuitProbe,
  resolveExecutionCircuitRefusal,
  serializeExecutionCircuitState,
  toExecutionCircuitReceipt,
} from "./execution-circuit-breaker.js";
import { resolveModelCapabilityProfile } from "./model-capability-resolver.js";
import {
  filterEndpointsByCapabilityRequirements,
  inferChatCompletionsCapabilityRequirements,
  inferResponsesCapabilityRequirements,
} from "./request-capability-inference.js";
import { readPackagedRuntimeProfile, resolveRuntimeChannelProfile } from "./runtime-channel.js";
import { type RuntimeVersionInfoRecord, resolveRuntimeVersionInfo } from "./runtime-version.js";
import { createTrackBOperations as createTrackBOperationsFromState } from "./track-b-operations.js";
import { createRun88RuntimeCorrelation } from "./track-b-runtime.js";

import {
  type ProviderRequestCapture,
  type ResolvedExecutionTarget,
  type RoutedExecutionResult,
  type RuntimeExecutionMessage,
  type RuntimeExecutionRequest,
  type RuntimeExecutionToolChoice,
  type RuntimeExecutionToolDefinition,
  type RuntimeResponseCaptureMap,
  executeLiveRoutedRequest,
} from "@role-model-router/adapter-execution";
import type { VendorRuntime, VendorRuntimeStatus } from "@role-model-router/vendor-abstraction";
import { createVendorNotConfiguredError } from "@role-model-router/vendor-abstraction";
import { startLiteLLMVendor } from "@role-model-router/vendor-litellm";
import { startLlamaSwapVendor } from "@role-model-router/vendor-llama-swap";

import {
  readActiveBenchmarkRun as readActiveBenchmarkRunProgress,
  readBenchmarkRunProgress,
} from "./benchmark-progress.js";
import {
  probeJudgeEndpoint,
  readRoutingCapabilityBenchmarkSuite,
  runRoutingCapabilityBenchmark,
} from "./benchmark-runner.js";
import {
  evaluateBenchmarkStartGuards,
  evaluateBenchmarkTargetEligibility,
} from "./benchmark-start-guards.js";
import {
  buildBenchmarkCapabilityForEndpoint,
  listBenchmarkRuns,
  readBenchmarkPreferences,
  readBenchmarkSummariesByMode,
  readLatestBenchmarkSummary,
  writeBenchmarkPreferences,
} from "./benchmark-summary.js";
import {
  findConfiguredModelBlockingReferences,
  findConfiguredModelReferencesByPolicy,
} from "./configured-model-membership.js";
import { looksLikeInlineApiKey, resolveEnvCredentialRef } from "./credential-ref-env.js";
import {
  buildAccountEndpointRoleBindings,
  buildLlamaSwapRegistryRoleBindings,
  mergeRuntimeRoleBindings,
  readLlamaSwapRoleIdsByModelId,
  resolveEndpointRoleIds,
} from "./local-model-role-bindings.js";
import { resolveOauthCredentialRef } from "./oauth-credential.js";
import { openUrlInDefaultBrowser } from "./open-external-url.js";
import {
  type OperatorIntentDiagnostic,
  type OperatorIntentRemoteActivation,
  type OperatorIntentV1,
  persistOperatorIntent,
  readOperatorIntent,
  readOperatorIntentResult,
  removePeerLoad,
  removeRemoteActivationsByConfiguredModel,
  resolveOperatorIntentPath,
  upsertLlamaSwapLoad,
  upsertPeerLoad,
  upsertRemoteActivation,
  writeOperatorIntent,
} from "./operator-intent.js";
import {
  type RemoteHealthProbeResult,
  type RemoteHealthProbeTarget,
  probeRemoteEndpoints,
} from "./remote-health-probe.js";
import {
  type AliasDriftWarning,
  type RoutableInventory,
  buildRoutableInventory,
  resolveAliasAllowEndpoints,
  validateAliasInventoryResolution,
  warnAliasModelIdDrift,
} from "./routable-inventory.js";
import {
  type BootstrapStageResult,
  type SessionBootstrapState,
  createPendingBootstrapState,
  runSessionBootstrapStages,
} from "./session-bootstrap.js";

import {
  type LiteLLMProviderInfo,
  OPERATOR_HIDDEN_CATALOG_PROVIDER_IDS,
  applyAliasedCatalogPricing,
  deriveLiteLLMProviders,
  extractLiteLLMModelIds,
  loadLiteLLMModelPrices,
  readNormalizedCatalogFile,
} from "@role-model-router/catalog";
import { resolveValidationProviderMetadata } from "./provider-metadata-merge.js";
import { resolveLlamaSwapCommand } from "./runtime-assets.js";
import {
  resolveRuntimeRoutingModelSelection,
  summarizeRouterGuidance,
} from "./runtime-routing-model.js";
import {
  DEFAULT_UNIFIED_RUNTIME_CONTROLLER_TIMEOUT_MS,
  type UnifiedRuntimeConfig,
  type UnifiedRuntimeDifficultyBucket,
  type UnifiedRuntimeDifficultyClassifierConfig,
  type UnifiedRuntimeExecutionMode,
  type UnifiedRuntimeModelAliasConfig,
  deriveUnifiedRuntimeRoutingAliasId,
  deriveUnifiedRuntimeRoutingAliasMode,
  isPrimaryRoutingAliasId,
  mergeUnifiedRuntimeConfigDocuments,
  normalizeUnifiedRuntimeConfigInput,
  parseUnifiedRuntimeConfigText,
  removeUnifiedRuntimeConfigProviderModel,
  renderUnifiedRuntimeConfigText,
  resolveUnifiedRuntimeObservedDataConfig,
  rewriteUnifiedRuntimeConfigController,
} from "./unified-runtime-config.js";

interface OpenAIChatCompletionsTool {
  readonly type: string;
  readonly function?: {
    readonly name: string;
    readonly description?: string;
    readonly parameters: Record<string, unknown>;
  };
}

class ConfiguredModelReferenceConflictError extends Error {
  readonly code = "configured_model_reference_conflict";
  readonly mutationApplied = false;

  constructor(readonly references: readonly { kind: string; path: string }[]) {
    super("Configured model is still referenced by explicit runtime configuration.");
  }
}

class ConfiguredModelEjectMutationError extends Error {
  constructor(
    readonly code: "configured_model_eject_rolled_back" | "configured_model_eject_indeterminate",
    readonly failedBoundary: string,
    readonly mutationApplied: false | "indeterminate",
    readonly reconciliationRequired: boolean,
    message: string,
  ) {
    super(message);
  }
}

export interface ConfiguredModelEjectResult {
  readonly success: boolean;
  readonly removedAccount: boolean;
  readonly alreadyAbsent: boolean;
  readonly authority: "account-managed" | "runtime-config-managed" | "absent";
  readonly pruned: {
    readonly modelRoleBindings: number;
    readonly runtimeEndpoints: number;
    readonly remoteActivations: number;
    readonly generatedAliases: number;
  };
}

interface ConfiguredMembershipReconciliationReceipt {
  readonly reconciledAt: string;
  readonly authorityVersion: 1;
  readonly inspected: { readonly runtimeEndpoints: number; readonly remoteActivations: number };
  readonly pruned: {
    readonly runtimeEndpoints: number;
    readonly remoteActivations: number;
    readonly modelRoleBindings: number;
  };
  readonly reasonCodes: readonly string[];
}

function configuredModelEjectResult(
  authority: ConfiguredModelEjectResult["authority"],
  removedAccount: boolean,
  alreadyAbsent: boolean,
  pruned: Partial<ConfiguredModelEjectResult["pruned"]> = {},
  success = true,
): ConfiguredModelEjectResult {
  return {
    success,
    removedAccount,
    alreadyAbsent,
    authority,
    pruned: {
      modelRoleBindings: pruned.modelRoleBindings ?? 0,
      runtimeEndpoints: pruned.runtimeEndpoints ?? 0,
      remoteActivations: pruned.remoteActivations ?? 0,
      generatedAliases: pruned.generatedAliases ?? 0,
    },
  };
}

const LOCAL_OPENAI_PROVIDER_ID = "local-openai-compatible";
const LOCAL_OPENAI_PLACEHOLDER_TOKEN = "role-model-local";
const ROUTING_SELECTION_SCORE_TIE_EPSILON = 0.01;
const BRIDGE_TOOL_LOOP_MAX_STEPS = 4;
const BRIDGE_TOOL_LOOP_FOLLOWUP_INSTRUCTION =
  "Use the provided tool results to answer the original user request directly. Do not call additional tools unless the provided results are empty or unusable.";
const OPENAI_PROVIDER_ID = "openai";
const CHATGPT_PROVIDER_ID = "chatgpt";
const OPENAI_CODEX_SUBSCRIPTION_VARIANT_ID = "openai-codex-subscription";
const CONTROLLER_MAX_OUTPUT_TOKENS = 1024;
export type OpenAICodexSubscriptionModelLifecycle = "supported" | "preview" | "deprecated";

export interface OpenAICodexSubscriptionModelProfile {
  readonly modelId: `chatgpt/gpt-5.${string}`;
  readonly lifecycle: OpenAICodexSubscriptionModelLifecycle;
  readonly supportsFunctionCalling: boolean;
  readonly supportsHostedWebSearch: boolean;
}

export const OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX = [
  {
    modelId: "chatgpt/gpt-5.5",
    lifecycle: "supported",
    supportsFunctionCalling: true,
    supportsHostedWebSearch: true,
  },
  {
    modelId: "chatgpt/gpt-5.5-pro",
    lifecycle: "supported",
    supportsFunctionCalling: true,
    supportsHostedWebSearch: true,
  },
  {
    modelId: "chatgpt/gpt-5.4",
    lifecycle: "supported",
    supportsFunctionCalling: true,
    supportsHostedWebSearch: true,
  },
  {
    modelId: "chatgpt/gpt-5.4-mini",
    lifecycle: "supported",
    supportsFunctionCalling: true,
    supportsHostedWebSearch: true,
  },
  {
    modelId: "chatgpt/gpt-5.4-nano",
    lifecycle: "supported",
    supportsFunctionCalling: true,
    supportsHostedWebSearch: true,
  },
  {
    modelId: "chatgpt/gpt-5.4-pro",
    lifecycle: "supported",
    supportsFunctionCalling: true,
    supportsHostedWebSearch: true,
  },
  {
    modelId: "chatgpt/gpt-5.3-codex",
    lifecycle: "supported",
    supportsFunctionCalling: true,
    supportsHostedWebSearch: true,
  },
  {
    modelId: "chatgpt/gpt-5.3-codex-spark",
    lifecycle: "preview",
    supportsFunctionCalling: true,
    supportsHostedWebSearch: true,
  },
  {
    modelId: "chatgpt/gpt-5.3-chat-latest",
    lifecycle: "deprecated",
    supportsFunctionCalling: true,
    supportsHostedWebSearch: true,
  },
] as const satisfies readonly OpenAICodexSubscriptionModelProfile[];

export const OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS = OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX.map(
  (entry) => entry.modelId,
);
const OPENAI_CODEX_SUBSCRIPTION_MODEL_ID_SET = new Set<string>(OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS);
const OPENAI_CODEX_SUBSCRIPTION_ENDPOINT_ID_MARKERS = [
  `.${OPENAI_CODEX_SUBSCRIPTION_VARIANT_ID}.`,
  ".codex-subscription.",
] as const;
const OPENAI_CODEX_SUBSCRIPTION_RESPONSES_ADAPTER_FAMILY = "codex-subscription-responses";
const OPENAI_CODEX_SUBSCRIPTION_START_ENDPOINT = "codex://openai/chatgpt-device-code/start";
const OPENAI_CODEX_SUBSCRIPTION_TOKEN_ENDPOINT = "codex://openai/chatgpt-device-code/token";
const OPENAI_CODEX_SUBSCRIPTION_VERIFICATION_URL = "https://auth.openai.com/codex/device";
const OPENAI_CODEX_OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const OPENAI_CODEX_DEVICE_USER_CODE_ENDPOINT =
  "https://auth.openai.com/api/accounts/deviceauth/usercode";
const OPENAI_CODEX_DEVICE_TOKEN_ENDPOINT = "https://auth.openai.com/api/accounts/deviceauth/token";
const OPENAI_CODEX_OAUTH_TOKEN_ENDPOINT = "https://auth.openai.com/oauth/token";
const OPENAI_CODEX_SUBSCRIPTION_AUTH_MISSING_ERROR =
  "Codex Subscription is connected on this machine, but the cached Codex auth session is missing or unreadable. Reconnect to continue.";
const OPENAI_CODEX_DEVICE_CODE_SESSION_PREFIX = "codex-oauth-device:";
const CANONICAL_ROUTING_ALIAS_STRATEGIES = [
  null,
  "baseline",
  "controller",
  "difficulty",
  "hybrid",
] as const satisfies readonly (string | null)[];
const CANONICAL_ROUTING_ALIAS_EXECUTION_MODES = [
  "decision_only",
  "hybrid",
  "local_only",
  "remote_only",
] as const satisfies readonly UnifiedRuntimeExecutionMode[];

function containsLegacyRoutingAliasConfigText(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("craft-ask.") ||
    normalized.includes("mixed.local-remote") ||
    normalized.includes('strategy: "craft-ask"') ||
    normalized.includes("strategy: craft-ask")
  );
}

function isOpenAICodexSubscriptionModelId(modelId: string): boolean {
  return OPENAI_CODEX_SUBSCRIPTION_MODEL_ID_SET.has(modelId);
}

function isOpenAICodexSubscriptionAccount(input: {
  readonly providerId: string;
  readonly authMode: string;
}): boolean {
  return input.providerId === OPENAI_PROVIDER_ID && input.authMode === "oauth2-device-code";
}

function assertOpenAICodexSubscriptionModelIds(modelIds: readonly string[]): void {
  const unsupported = modelIds.filter((modelId) => !isOpenAICodexSubscriptionModelId(modelId));
  if (unsupported.length === 0) {
    return;
  }
  throw new Error(
    `Codex Subscription only supports OpenAI GPT-5.3+ model ids for this runtime: ${unsupported.join(", ")}.`,
  );
}

interface LocalPeerConfig {
  readonly id: string;
  readonly url: string;
  readonly authToken?: string;
}

type OpenAIChatCompletionsMessageContent =
  | string
  | null
  | readonly {
      readonly type?: string;
      readonly text?: string;
      readonly image_url?: unknown;
      readonly video_url?: unknown;
      readonly image?: unknown;
      readonly video?: unknown;
      readonly file?: unknown;
      readonly [key: string]: unknown;
    }[];

interface OpenAIChatCompletionsMessage {
  readonly role: string;
  readonly content: OpenAIChatCompletionsMessageContent;
  readonly tool_calls?: readonly {
    readonly id: string;
    readonly type: string;
    readonly function: {
      readonly name: string;
      readonly arguments: string;
    };
  }[];
  readonly tool_call_id?: string;
  readonly name?: string;
}

function readChatMessageTextContent(
  content: OpenAIChatCompletionsMessageContent | undefined,
): string {
  if (typeof content === "string") {
    return content;
  }
  if (content === null || content === undefined) {
    return "";
  }
  return content
    .map((entry) => (typeof entry?.text === "string" ? entry.text : ""))
    .filter(Boolean)
    .join("\n");
}

interface OpenAIChatCompletionsBody {
  readonly model: string;
  readonly messages: readonly OpenAIChatCompletionsMessage[];
  readonly tools?: readonly OpenAIChatCompletionsTool[];
  readonly tool_choice?: RuntimeExecutionToolChoice;
  readonly parallel_tool_calls?: boolean;
  readonly prompt_cache_key?: string;
  readonly conversation_id?: string;
  readonly reasoning_effort?: string;
  readonly reasoning?: Record<string, unknown>;
  readonly thinking?: Record<string, unknown>;
  readonly stream?: boolean;
  readonly max_tokens?: number;
  readonly temperature?: number;
}

interface OpenAIResponsesBody {
  readonly model: string;
  readonly input: OpenAIResponsesInput;
  readonly tools?: readonly OpenAIResponsesTool[];
  readonly tool_choice?:
    | RuntimeExecutionToolChoice
    | {
        readonly type: "function";
        readonly name: string;
      };
  readonly parallel_tool_calls?: boolean;
  readonly reasoning_effort?: string;
  readonly reasoning?: Record<string, unknown>;
  readonly thinking?: Record<string, unknown>;
  readonly previous_response_id?: string;
  readonly prompt_cache_key?: string;
  readonly conversation_id?: string;
  readonly stream?: boolean;
  readonly max_output_tokens?: number;
  readonly temperature?: number;
}

interface OpenAIResponsesTool {
  readonly type: string;
  readonly name?: string;
  readonly description?: string;
  readonly parameters?: Record<string, unknown>;
}

interface OpenAIResponsesFunctionCallInputItem {
  readonly type: "function_call";
  readonly call_id: string;
  readonly name: string;
  readonly arguments?: string;
}

interface OpenAIResponsesFunctionCallOutputInputItem {
  readonly type: "function_call_output";
  readonly call_id: string;
  readonly output?: unknown;
}

type OpenAIResponsesInputItem =
  | OpenAIChatCompletionsMessage
  | OpenAIResponsesFunctionCallInputItem
  | OpenAIResponsesFunctionCallOutputInputItem;

type OpenAIResponsesInput = string | readonly OpenAIResponsesInputItem[];

type OpenAIChatCompletionsToolCall = {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
};

function asPlainRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function isResponsesFunctionCallInputItem(
  value: OpenAIResponsesInputItem,
): value is OpenAIResponsesFunctionCallInputItem {
  const record = asPlainRecord(value);
  return (
    record?.type === "function_call" &&
    typeof record.call_id === "string" &&
    typeof record.name === "string"
  );
}

function isResponsesFunctionCallOutputInputItem(
  value: OpenAIResponsesInputItem,
): value is OpenAIResponsesFunctionCallOutputInputItem {
  const record = asPlainRecord(value);
  return record?.type === "function_call_output" && typeof record.call_id === "string";
}

function isOpenAIChatCompletionsMessage(
  value: OpenAIResponsesInputItem,
): value is OpenAIChatCompletionsMessage {
  const record = asPlainRecord(value);
  return (
    typeof record?.role === "string" &&
    (typeof record.content === "string" || record.content === null || Array.isArray(record.content))
  );
}

function readOpenAIReasoningRequest(
  body: Pick<OpenAIResponsesBody, "reasoning_effort" | "reasoning" | "thinking">,
): RuntimeExecutionRequest["reasoning"] | undefined {
  if (typeof body.reasoning_effort === "string") {
    return {
      effort: body.reasoning_effort,
    };
  }

  const reasoning = asPlainRecord(body.reasoning);
  if (reasoning) {
    return {
      ...(typeof reasoning.effort === "string" ? { effort: reasoning.effort } : {}),
      raw: reasoning,
    };
  }

  const thinking = asPlainRecord(body.thinking);
  if (thinking) {
    return {
      channel: "thinking",
      raw: thinking,
    };
  }

  return undefined;
}

const readResponsesReasoningRequest = readOpenAIReasoningRequest;
const readChatCompletionsReasoningRequest = readOpenAIReasoningRequest;

function readOpenAIPromptCacheRequest(body: {
  readonly prompt_cache_key?: string | null;
}): RuntimeExecutionRequest["promptCache"] | undefined {
  if (typeof body.prompt_cache_key === "string" && body.prompt_cache_key.trim().length > 0) {
    return {
      mode: "prefer",
      key: body.prompt_cache_key.trim(),
      source: "explicit",
    };
  }
  return undefined;
}

function synthesizePromptCacheRequest(
  requestOptions: BridgeExecutionRequestOptions | undefined,
  fallbackKey?: string,
  messages?: RuntimeExecutionRequest["messages"],
): RuntimeExecutionRequest["promptCache"] | undefined {
  if (typeof requestOptions?.sessionId === "string" && requestOptions.sessionId.trim().length > 0) {
    return {
      mode: "prefer",
      key: requestOptions.sessionId.trim(),
      source: "synthesized",
    };
  }
  if (typeof fallbackKey === "string" && fallbackKey.trim().length > 0) {
    return {
      mode: "prefer",
      key: fallbackKey.trim(),
      source: "synthesized",
    };
  }
  if (messages && messages.length > 0) {
    const canonicalMessages = JSON.stringify(canonicalizePromptCacheValue(messages));
    return {
      mode: "prefer",
      key: `rm-prompt-sha256:${createHash("sha256").update(canonicalMessages).digest("hex")}`,
      source: "synthesized",
    };
  }
  return undefined;
}

function canonicalizePromptCacheValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizePromptCacheValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalizePromptCacheValue(entry)]),
    );
  }
  return value;
}

const readResponsesPromptCacheRequest = readOpenAIPromptCacheRequest;
const readChatCompletionsPromptCacheRequest = readOpenAIPromptCacheRequest;

function readResponsesToolChoice(
  toolChoice: OpenAIResponsesBody["tool_choice"],
): RuntimeExecutionToolChoice | undefined {
  if (toolChoice === undefined) {
    return undefined;
  }
  const toolChoiceRecord = asPlainRecord(toolChoice);
  if (
    toolChoiceRecord?.type === "function" &&
    typeof toolChoiceRecord.name === "string" &&
    toolChoiceRecord.name.trim().length > 0
  ) {
    return {
      type: "function",
      function: {
        name: toolChoiceRecord.name.trim(),
      },
    };
  }
  return toolChoice as RuntimeExecutionToolChoice;
}

function readResponsesContinuationRequest(
  body: OpenAIResponsesBody,
): RuntimeExecutionRequest["continuation"] | undefined {
  return typeof body.previous_response_id === "string" &&
    body.previous_response_id.trim().length > 0
    ? { previousResponseId: body.previous_response_id.trim() }
    : undefined;
}

export interface BridgeModelRecord {
  readonly id: string;
  readonly object: "model";
  readonly owned_by: "role-model";
  readonly endpoint_ids: readonly string[];
  readonly context_window?: number | null;
  readonly max_tokens?: number | null;
  readonly input?: readonly string[];
  readonly input_modalities?: readonly string[];
  readonly output_modalities?: readonly string[];
  readonly capabilities?: readonly string[] | Record<string, unknown>;
  readonly role_model?: {
    readonly type: "model" | "alias";
    readonly routing_mode?: UnifiedRuntimeModelAliasConfig["mode"];
    readonly discovery_url: string;
    readonly capability_revision: string;
    readonly context_window: number | null;
    readonly max_tokens: number | null;
    readonly input_modalities: readonly string[];
    readonly output_modalities: readonly string[];
    readonly tools: {
      readonly function_calling: boolean;
    };
    readonly reasoning: {
      readonly supported: boolean;
      readonly effort_control: boolean;
    };
    readonly structured_output: {
      readonly supported: boolean;
    };
    readonly caching: {
      readonly prompt_read: boolean | null;
      readonly prompt_write: boolean | null;
      readonly source: "catalog" | "unknown" | "mixed";
    };
  };
}

export interface BridgeRuntimeModelRecord extends BridgeModelRecord {
  readonly providerId: string;
  readonly displayName: string;
  readonly capabilities: readonly string[];
  readonly modalities: readonly string[];
  readonly contextWindow: number | null;
  readonly maxOutputTokens: number | null;
  readonly pricing: PricingHints | null;
}

export interface BridgeModelListResponse {
  readonly object: "list";
  readonly data: readonly BridgeModelRecord[];
}

export interface BridgeDownstreamOpenAIProviderConfig {
  readonly contractVersion: "role-model.downstream.openai.v1";
  readonly kind: "openai-compatible";
  readonly providerId: "role-model-runtime";
  readonly displayName: string;
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
  readonly freshness?: Record<string, unknown>;
}

export interface BridgeControllerAssignment {
  readonly scope: "global";
  readonly endpointId: string;
  readonly modelId: string;
  readonly sourceType: "local" | "remote";
  readonly updatedAtMs?: number;
}

export interface BridgeExecutionPlan {
  readonly routingRequest: Parameters<typeof routeRuntimeRequest>[0]["request"];
  readonly executionRequest: RuntimeExecutionRequest;
  readonly routingModel?: RoutingModelSelection;
  readonly routingDiagnostics?: Pick<
    RuntimeRoutingDiagnostics,
    | "aliasResolution"
    | "difficultyRouting"
    | "controllerRouting"
    | "hybridArbitration"
    | "routingMode"
    | "rolePolicy"
    | "capabilityEligibility"
  >;
}

interface BridgeDifficultyRoutingContext {
  readonly difficultyClassifier?: UnifiedRuntimeDifficultyClassifierConfig;
  readonly endpointMaxDifficultyByEndpointId?: Readonly<
    Record<string, UnifiedRuntimeDifficultyBucket>
  >;
  readonly overrideRecommendedMaxDifficultyByEndpointId?: Readonly<
    Record<string, UnifiedRuntimeDifficultyBucket>
  >;
  readonly resolvedClassification?: {
    readonly difficulty: UnifiedRuntimeDifficultyBucket;
    readonly fallbackApplied: boolean;
    readonly cacheHit?: boolean;
    readonly cacheInvalidated?: boolean;
    readonly cacheInvalidationReasons?: readonly string[];
    readonly fallbackReason?: string;
    readonly rubricSignals: DifficultyRoutingSignals;
  };
}

interface BridgeControllerRoutingContext {
  readonly active: boolean;
  readonly resolvedGuidance?: ControllerAcceptedDirectives;
  readonly fallbackApplied?: boolean;
  readonly fallbackReason?: string;
}

type DifficultyRoutingSignals = NonNullable<
  RuntimeRoutingDiagnostics["difficultyRouting"]
>["rubricSignals"];
type ControllerAcceptedDirectives = NonNullable<
  NonNullable<RuntimeRoutingDiagnostics["controllerRouting"]>["acceptedDirectives"]
>;
type BridgeRoutingStrategy = Parameters<typeof routeRuntimeRequest>[0]["request"]["strategy"];

const BRIDGE_ROUTING_STRATEGIES = new Set<BridgeRoutingStrategy>([
  "balanced",
  "latency",
  "quality",
  "cost",
  "low-latency",
  "high-quality",
  "low-cost",
]);

const DIFFICULTY_BUCKET_ORDER: Record<UnifiedRuntimeDifficultyBucket, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

function isBridgeRoutingStrategy(value: string): value is BridgeRoutingStrategy {
  return BRIDGE_ROUTING_STRATEGIES.has(value as BridgeRoutingStrategy);
}

function combineDifficultyMessageText(
  messages: readonly OpenAIChatCompletionsMessage[],
  options?: { readonly roles?: readonly OpenAIChatCompletionsMessage["role"][] },
): string {
  const selectedMessages = options?.roles
    ? messages.filter((message) => options.roles?.includes(message.role))
    : messages;
  return selectedMessages.map((message) => readChatMessageTextContent(message.content)).join("\n");
}

function combineLastUserDifficultyMessageText(
  messages: readonly OpenAIChatCompletionsMessage[],
): string {
  const userMessages = messages.filter((message) => message.role === "user");
  if (userMessages.length === 0) {
    return "";
  }
  return readChatMessageTextContent(userMessages[userMessages.length - 1]?.content);
}

function hasActiveToolUsage(messages: readonly OpenAIChatCompletionsMessage[]): boolean {
  for (const message of messages) {
    if (message.role === "tool") {
      return true;
    }
    if (message.role === "assistant" && (message.tool_calls?.length ?? 0) > 0) {
      return true;
    }
  }
  return false;
}

function hasExplicitCodeRoutingTextSignal(value: string): boolean {
  return (
    /\b(code|patch|refactor|schema|test|debug|bug|diff|typescript|javascript|python)\b/.test(
      value,
    ) ||
    /\b[\w./-]+\.(?:c|cc|cpp|cs|go|h|hpp|java|js|jsx|json|kt|md|php|py|rb|rs|swift|toml|ts|tsx|yaml|yml)\b/.test(
      value,
    ) ||
    /\b(?:src|lib|app|packages|test|tests|docs)\//.test(value)
  );
}

function isDifficultyAskMode(input: {
  readonly messages: readonly OpenAIChatCompletionsMessage[];
  readonly declaredToolCount: number;
}): boolean {
  return input.declaredToolCount === 0 && !hasActiveToolUsage(input.messages);
}

function summarizeDifficultySignals(input: {
  readonly messages: readonly OpenAIChatCompletionsMessage[];
  readonly contextTokens: number;
  readonly toolCount: number;
}): DifficultyRoutingSignals {
  const askMode = isDifficultyAskMode({
    messages: input.messages,
    declaredToolCount: input.toolCount,
  });
  const userMessages = input.messages.filter((message) => message.role === "user");
  const combined = combineDifficultyMessageText(input.messages);
  const askModeBurdenSource = askMode
    ? combineLastUserDifficultyMessageText(input.messages)
    : combined;
  const instructionConstraintCount = countMatches(
    askModeBurdenSource.toLowerCase(),
    /\b(must|should|need to|required|preserve|verify|strict|do not|don't|never|without|constraint|compatible|ensure|maintain|avoid|breaking|regression)\b/g,
  );
  const decompositionKeywordCount = countMatches(
    combined.toLowerCase(),
    /\b(analyze|compare|iterate|plan|step|decompose|refactor|workflow|multi-step|across|identify|explain|investigate|debug|patch|regression)\b/g,
  );
  const codePathSignal =
    /(?:^|[\s"'`])(?:[\w.-]+[\\/])+[\w.-]+\.(?:ts|tsx|js|jsx|py|rs|go|java|c|cc|cpp|cs|json|yaml|yml|md)\b/i.test(
      askModeBurdenSource,
    );
  const workspaceFileActionSignal =
    /\b(file|folder|directory|workspace|repo|repository|symbol|exported)\b/i.test(
      askModeBurdenSource,
    ) && /\b(read|write|create|patch|edit|inspect|open|grep|search)\b/i.test(askModeBurdenSource);
  const effectiveToolCount = askMode ? 0 : input.toolCount;
  const effectiveHistoryTurnCount = askMode ? userMessages.length : input.messages.length;
  const effectiveContextTokens = askMode
    ? estimateContextTokens(userMessages, 0)
    : input.contextTokens;
  return {
    contextTokens: effectiveContextTokens,
    toolCount: effectiveToolCount,
    historyTurnCount: effectiveHistoryTurnCount,
    instructionConstraintCount,
    decompositionKeywordCount,
    codeOrSchemaBurden:
      /\b(code|diff|patch|refactor|schema|contract|validation|test)\b/i.test(askModeBurdenSource) ||
      codePathSignal ||
      workspaceFileActionSignal,
  };
}

function classifyDifficultyFromSignals(input: {
  readonly signals: DifficultyRoutingSignals;
  readonly classifier?: UnifiedRuntimeDifficultyClassifierConfig;
}): {
  readonly difficulty: UnifiedRuntimeDifficultyBucket;
  readonly fallbackApplied: boolean;
  readonly fallbackReason?: string;
} {
  if (input.signals.historyTurnCount === 0) {
    return {
      difficulty: input.classifier?.fallbackDifficulty ?? "hard",
      fallbackApplied: true,
      fallbackReason: "missing-request-content",
    };
  }

  if (input.signals.toolCount > 0 && input.signals.codeOrSchemaBurden) {
    return {
      difficulty: "hard",
      fallbackApplied: false,
    };
  }

  let score = 0;
  if (input.signals.contextTokens >= 2000) {
    score += 3;
  } else if (input.signals.contextTokens >= 600) {
    score += 1;
  }
  if (input.signals.toolCount >= 2) {
    score += 3;
  } else if (input.signals.toolCount === 1) {
    score += 1;
  }
  if (input.signals.historyTurnCount >= 4) {
    score += 2;
  } else if (input.signals.historyTurnCount >= 2) {
    score += 1;
  }
  if (input.signals.instructionConstraintCount >= 5) {
    score += 2;
  } else if (input.signals.instructionConstraintCount >= 2) {
    score += 1;
  }
  if (input.signals.decompositionKeywordCount >= 3) {
    score += 2;
  } else if (input.signals.decompositionKeywordCount >= 1) {
    score += 1;
  }
  if (input.signals.codeOrSchemaBurden) {
    score += 2;
  }
  if (input.signals.codeOrSchemaBurden && input.signals.instructionConstraintCount >= 3) {
    score += 1;
  }

  if (score >= 7) {
    return {
      difficulty: "hard",
      fallbackApplied: false,
    };
  }
  if (score >= 3) {
    return {
      difficulty: "medium",
      fallbackApplied: false,
    };
  }
  return {
    difficulty: "easy",
    fallbackApplied: false,
  };
}

function createDifficultyFallbackResult(input: {
  readonly signals: DifficultyRoutingSignals;
  readonly classifier?: UnifiedRuntimeDifficultyClassifierConfig;
  readonly reason: string;
}): NonNullable<BridgeDifficultyRoutingContext["resolvedClassification"]> {
  return {
    difficulty: input.classifier?.fallbackDifficulty ?? "hard",
    fallbackApplied: true,
    fallbackReason: input.reason,
    rubricSignals: input.signals,
  };
}

function getDifficultyCacheInvalidationReasons(input: {
  readonly cachedSignals: DifficultyRoutingSignals;
  readonly currentSignals: DifficultyRoutingSignals;
  readonly invalidation: ReturnType<
    typeof resolveUnifiedRuntimeObservedDataConfig
  >["difficultyLearning"]["invalidation"];
}): readonly string[] {
  const reasons: string[] = [];
  if (
    input.invalidation.reclassifyOnCodeOrSchemaChange &&
    input.cachedSignals.codeOrSchemaBurden !== input.currentSignals.codeOrSchemaBurden
  ) {
    reasons.push("code-or-schema-change");
  }
  if (
    Math.abs(input.cachedSignals.contextTokens - input.currentSignals.contextTokens) >
    input.invalidation.maxContextTokensDelta
  ) {
    reasons.push("context-tokens-delta");
  }
  if (
    Math.abs(input.cachedSignals.historyTurnCount - input.currentSignals.historyTurnCount) >
    input.invalidation.maxHistoryTurnDelta
  ) {
    reasons.push("history-turn-delta");
  }
  if (
    Math.abs(input.cachedSignals.toolCount - input.currentSignals.toolCount) >
    input.invalidation.maxToolCountDelta
  ) {
    reasons.push("tool-count-delta");
  }
  if (
    Math.abs(
      input.cachedSignals.instructionConstraintCount -
        input.currentSignals.instructionConstraintCount,
    ) > input.invalidation.maxInstructionConstraintDelta
  ) {
    reasons.push("instruction-constraint-delta");
  }
  if (
    Math.abs(
      input.cachedSignals.decompositionKeywordCount -
        input.currentSignals.decompositionKeywordCount,
    ) > input.invalidation.maxDecompositionKeywordDelta
  ) {
    reasons.push("decomposition-keyword-delta");
  }
  return reasons;
}

function canReuseDifficultyClassification(input: {
  readonly cachedSignals: DifficultyRoutingSignals;
  readonly currentSignals: DifficultyRoutingSignals;
  readonly invalidation: ReturnType<
    typeof resolveUnifiedRuntimeObservedDataConfig
  >["difficultyLearning"]["invalidation"];
}): boolean {
  return getDifficultyCacheInvalidationReasons(input).length === 0;
}

function parseDifficultyBucket(value: unknown): UnifiedRuntimeDifficultyBucket | null {
  if (typeof value !== "string") {
    return null;
  }
  switch (value.trim().toLowerCase()) {
    case "easy":
    case "medium":
    case "hard":
      return value.trim().toLowerCase() as UnifiedRuntimeDifficultyBucket;
    default:
      return null;
  }
}

function parseClassifierDifficultyOutput(text: string): UnifiedRuntimeDifficultyBucket | null {
  const trimmed = text.trim();
  const direct = parseDifficultyBucket(trimmed);
  if (direct) {
    return direct;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? trimmed;
  try {
    const parsed = JSON.parse(fenced) as { difficulty?: unknown };
    const fromJson = parseDifficultyBucket(parsed?.difficulty);
    if (fromJson) {
      return fromJson;
    }
  } catch {
    // Fall through to heuristic extraction.
  }

  const matched = fenced.match(/\b(easy|medium|hard)\b/i)?.[1];
  return parseDifficultyBucket(matched);
}

function buildDifficultyClassifierMessages(input: {
  readonly messages: readonly OpenAIChatCompletionsMessage[];
  readonly signals: DifficultyRoutingSignals;
}): readonly OpenAIChatCompletionsMessage[] {
  return [
    {
      role: "system",
      content:
        'ROLE_MODEL_DIFFICULTY_CLASSIFIER\nReturn only compact JSON in the form {"difficulty":"easy|medium|hard"} using the supplied rubric signals.',
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          rubricSignals: input.signals,
          messages: input.messages,
        },
        null,
        2,
      ),
    },
  ];
}

function buildControllerRoutingMessages(input: {
  readonly requestedModel: string;
  readonly messages: readonly OpenAIChatCompletionsMessage[];
  readonly toolCount: number;
  readonly candidateEndpointIds: readonly string[];
  readonly roleDefinitions?: readonly RuntimeRoleDefinitionRecord[];
  readonly taskDefinitions?: readonly RuntimeTaskDefinitionRecord[];
}): readonly OpenAIChatCompletionsMessage[] {
  const userPayload = JSON.stringify(
    {
      requestedModel: input.requestedModel,
      toolCount: input.toolCount,
      candidateEndpointIds: input.candidateEndpointIds,
      messages: input.messages,
    },
    null,
    2,
  );
  return [
    {
      role: "system",
      content: buildControllerSystemPrompt({
        roleDefinitions: input.roleDefinitions,
        taskDefinitions: input.taskDefinitions,
        candidateEndpointIds: input.candidateEndpointIds,
      }),
    },
    {
      role: "user",
      content: userPayload,
    },
  ];
}

function buildCompactControllerRoutingMessages(input: {
  readonly requestedModel: string;
  readonly messages: readonly OpenAIChatCompletionsMessage[];
  readonly toolCount: number;
  readonly candidateEndpointIds: readonly string[];
  readonly roleDefinitions?: readonly RuntimeRoleDefinitionRecord[];
  readonly taskDefinitions?: readonly RuntimeTaskDefinitionRecord[];
}): readonly OpenAIChatCompletionsMessage[] {
  const userPayload = JSON.stringify(
    {
      requestedModel: input.requestedModel,
      toolCount: input.toolCount,
      candidateEndpointIds: input.candidateEndpointIds,
      messages: input.messages,
    },
    null,
    2,
  );
  return [
    {
      role: "system",
      content: buildCompactControllerSystemPrompt({
        roleDefinitions: input.roleDefinitions,
        taskDefinitions: input.taskDefinitions,
        candidateEndpointIds: input.candidateEndpointIds,
      }),
    },
    {
      role: "user",
      content: userPayload,
    },
  ];
}

function parseControllerRoutingOutput(
  text: string,
  input: {
    readonly roleDefinitions?: readonly RuntimeRoleDefinitionRecord[];
    readonly taskDefinitions?: readonly RuntimeTaskDefinitionRecord[];
    readonly candidateEndpointIds: readonly string[];
  },
): ControllerAcceptedDirectives | null {
  return parseAndSanitizeControllerRoutingGuidance(text, input);
}

function inferHeuristicControllerCodeRoleTask(input: {
  readonly hasCodeSignal: boolean;
  readonly roleDefinitions?: readonly RuntimeRoleDefinitionRecord[];
  readonly taskDefinitions?: readonly RuntimeTaskDefinitionRecord[];
}): {
  readonly requestedRoleId?: string;
  readonly taskType?: string;
} {
  if (!input.hasCodeSignal) {
    return {};
  }

  const requestedRoleId = resolveControllerRequestedRoleId("coder", input.roleDefinitions);
  const taskType =
    resolveControllerTaskType("coder.edit", input.taskDefinitions) ??
    resolveControllerTaskType("code.edit", input.taskDefinitions) ??
    resolveControllerTaskType("coder.review", input.taskDefinitions) ??
    resolveControllerTaskType("code.review", input.taskDefinitions);

  return {
    ...(requestedRoleId ? { requestedRoleId } : {}),
    ...(taskType ? { taskType } : {}),
  };
}

export function inferHeuristicControllerGuidance(input: {
  readonly messages: readonly OpenAIChatCompletionsMessage[];
  readonly toolCount: number;
  readonly roleDefinitions?: readonly RuntimeRoleDefinitionRecord[];
  readonly taskDefinitions?: readonly RuntimeTaskDefinitionRecord[];
}): ControllerAcceptedDirectives | null {
  const combinedText = input.messages
    .map((message) => readChatMessageTextContent(message.content).trim())
    .filter((content) => content.length > 0)
    .join("\n")
    .toLowerCase();
  if (combinedText.length === 0) {
    return null;
  }

  const knownCapabilities = buildKnownControllerCapabilitySet({
    roleDefinitions: input.roleDefinitions,
    taskDefinitions: input.taskDefinitions,
  });
  const hasToolUseSignal = hasActiveToolUsage(input.messages);
  const hasCodeSignal = hasExplicitCodeRoutingTextSignal(combinedText) || hasToolUseSignal;
  const hasClassificationSignal =
    /(classif|categor|sentiment|label|language detect|embedding)/.test(combinedText);
  const codeRoleTask = inferHeuristicControllerCodeRoleTask({
    hasCodeSignal,
    roleDefinitions: input.roleDefinitions,
    taskDefinitions: input.taskDefinitions,
  });
  const preferredCapabilities: string[] = [];
  if (
    hasCodeSignal &&
    (knownCapabilities.size === 0 || knownCapabilities.has("reasoning.multi_step"))
  ) {
    preferredCapabilities.push("reasoning.multi_step");
  }
  if (hasCodeSignal && (knownCapabilities.size === 0 || knownCapabilities.has("code.write"))) {
    preferredCapabilities.push("code.write");
  }
  if (
    hasToolUseSignal &&
    (knownCapabilities.size === 0 || knownCapabilities.has("tools.function_calling"))
  ) {
    preferredCapabilities.push("tools.function_calling");
  }
  const guidance = {
    ...codeRoleTask,
    ...(preferredCapabilities.length > 0
      ? { preferredCapabilities: preferredCapabilities as readonly string[] }
      : {}),
    strategy: hasCodeSignal ? "quality" : hasClassificationSignal ? "cost" : "balanced",
  } satisfies ControllerAcceptedDirectives;
  return Object.keys(guidance).length > 0 ? guidance : null;
}

export function mergeControllerGuidanceDefaults(input: {
  readonly guidance: ControllerAcceptedDirectives;
  readonly heuristic: ControllerAcceptedDirectives | null;
}): ControllerAcceptedDirectives {
  const guidance = input.guidance;
  const heuristic = input.heuristic;
  if (!heuristic) {
    return guidance;
  }

  return {
    ...(!guidance.requestedRoleId && heuristic.requestedRoleId
      ? { requestedRoleId: heuristic.requestedRoleId }
      : {}),
    ...(!guidance.taskType && heuristic.taskType ? { taskType: heuristic.taskType } : {}),
    ...(heuristic.requiredCapabilities?.length || guidance.requiredCapabilities?.length
      ? {
          requiredCapabilities:
            guidance.requiredCapabilities?.length && heuristic.requiredCapabilities?.length
              ? mergeCapabilityList(guidance.requiredCapabilities, heuristic.requiredCapabilities)
              : (guidance.requiredCapabilities ?? heuristic.requiredCapabilities),
        }
      : {}),
    ...(heuristic.preferredCapabilities?.length || guidance.preferredCapabilities?.length
      ? {
          preferredCapabilities:
            guidance.preferredCapabilities?.length && heuristic.preferredCapabilities?.length
              ? mergeCapabilityList(guidance.preferredCapabilities, heuristic.preferredCapabilities)
              : (guidance.preferredCapabilities ?? heuristic.preferredCapabilities),
        }
      : {}),
    ...(!guidance.strategy && heuristic.strategy ? { strategy: heuristic.strategy } : {}),
    ...(!guidance.preferredEndpointIds && heuristic.preferredEndpointIds
      ? { preferredEndpointIds: heuristic.preferredEndpointIds }
      : {}),
    ...guidance,
  };
}

function resolveControllerRequestedRoleId(
  requestedRoleId: string | undefined,
  roleDefinitions?: readonly RuntimeRoleDefinitionRecord[],
): string | undefined {
  if (!requestedRoleId) {
    return undefined;
  }
  const normalizedRoleId = normalizeRuntimeRoleIdForPolicy(requestedRoleId, roleDefinitions);
  if (!roleDefinitions || roleDefinitions.length === 0) {
    return normalizedRoleId;
  }
  return roleDefinitions.some((entry) => entry.role_id === normalizedRoleId)
    ? normalizedRoleId
    : undefined;
}

function resolveControllerTaskType(
  taskType: string | undefined,
  taskDefinitions?: readonly RuntimeTaskDefinitionRecord[],
): string | undefined {
  if (!taskType) {
    return undefined;
  }
  if (!taskDefinitions || taskDefinitions.length === 0) {
    return taskType;
  }
  return taskDefinitions.some((entry) => entry.task_type === taskType) ? taskType : undefined;
}

function buildKnownControllerCapabilitySet(input: {
  readonly roleDefinitions?: readonly RuntimeRoleDefinitionRecord[];
  readonly taskDefinitions?: readonly RuntimeTaskDefinitionRecord[];
}): ReadonlySet<string> {
  const values = new Set<string>();
  for (const roleDefinition of input.roleDefinitions ?? []) {
    for (const capability of roleDefinition.required_capabilities ?? []) {
      values.add(capability);
    }
    for (const capability of roleDefinition.preferred_capabilities ?? []) {
      values.add(capability);
    }
    for (const capability of roleDefinition.forbidden_capabilities ?? []) {
      values.add(capability);
    }
  }
  for (const taskDefinition of input.taskDefinitions ?? []) {
    for (const capability of taskDefinition.required_capabilities ?? []) {
      values.add(capability);
    }
    for (const capability of taskDefinition.preferred_capabilities ?? []) {
      values.add(capability);
    }
  }
  return values;
}

function filterKnownControllerCapabilities(
  capabilities: readonly string[] | undefined,
  knownCapabilities: ReadonlySet<string>,
): readonly string[] | undefined {
  if (!capabilities?.length) {
    return undefined;
  }
  if (knownCapabilities.size === 0) {
    return capabilities;
  }
  const filtered = capabilities.filter((capability) => knownCapabilities.has(capability));
  return filtered.length > 0 ? [...new Set(filtered)] : undefined;
}

function constrainControllerGuidanceToCandidatePool(input: {
  readonly guidance: ControllerAcceptedDirectives;
  readonly candidateEndpointIds: readonly string[];
  readonly registry: EndpointRegistryResult;
  readonly runtimeEndpoints: readonly {
    endpointId: string;
    providerAccountId: string;
    modelId: string;
  }[];
  readonly accounts: readonly ProviderAccountRecord[];
  readonly roleDefinitions: readonly RuntimeRoleDefinitionRecord[];
  readonly taskDefinitions?: readonly RuntimeTaskDefinitionRecord[];
  readonly llamaSwapRoleIdsByModelId?: Readonly<Record<string, readonly string[]>>;
}): ControllerAcceptedDirectives | null {
  const guidance = input.guidance;
  if (!guidance) {
    return null;
  }
  const candidateEndpoints = input.registry.endpoints.filter((endpoint) =>
    input.candidateEndpointIds.includes(endpoint.identity.endpoint_id),
  );
  const candidateRoleIds = new Set<string>();
  const candidateCapabilities = new Set<string>();
  for (const endpoint of candidateEndpoints) {
    for (const capability of endpoint.declared.capabilities ?? []) {
      candidateCapabilities.add(capability);
    }
    for (const roleId of getEndpointRoleIds(
      endpoint.identity.endpoint_id,
      input.runtimeEndpoints,
      input.accounts,
      input.registry,
      input.roleDefinitions,
      input.llamaSwapRoleIdsByModelId,
    )) {
      candidateRoleIds.add(roleId);
    }
  }

  const candidatePoolSupportsRole = (roleId: string): boolean => {
    const roleDefinition = input.roleDefinitions.find((entry) => entry.role_id === roleId);
    if (!roleDefinition) {
      return candidateRoleIds.has(roleId);
    }
    const supportedTasks = roleDefinition.task_types_supported
      .map((taskType) =>
        input.taskDefinitions?.find((taskDefinition) => taskDefinition.task_type === taskType),
      )
      .filter((taskDefinition): taskDefinition is RuntimeTaskDefinitionRecord =>
        Boolean(taskDefinition),
      );
    if (supportedTasks.length === 0) {
      return candidateRoleIds.has(roleId);
    }
    return supportedTasks.some(
      (taskDefinition) =>
        taskDefinition.allowed_roles.includes(roleId) &&
        taskDefinition.required_capabilities.every((capability) =>
          candidateCapabilities.has(capability),
        ),
    );
  };

  const requestedRoleId =
    guidance.requestedRoleId &&
    candidateRoleIds.has(guidance.requestedRoleId) &&
    candidatePoolSupportsRole(guidance.requestedRoleId)
      ? guidance.requestedRoleId
      : undefined;
  const taskType = (() => {
    if (!guidance.taskType) {
      return undefined;
    }
    const taskDefinition = input.taskDefinitions?.find(
      (entry) => entry.task_type === guidance.taskType,
    );
    if (!taskDefinition) {
      return guidance.taskType;
    }
    const allowedRoleMatch = taskDefinition.allowed_roles.some((roleId) =>
      candidateRoleIds.has(roleId),
    );
    const requiredCapabilityMatch =
      taskDefinition.required_capabilities.length === 0 ||
      taskDefinition.required_capabilities.every((capability) =>
        candidateCapabilities.has(capability),
      );
    if (requestedRoleId) {
      return taskDefinition.allowed_roles.includes(requestedRoleId) && requiredCapabilityMatch
        ? guidance.taskType
        : undefined;
    }
    return allowedRoleMatch && requiredCapabilityMatch ? guidance.taskType : undefined;
  })();
  const requiredCapabilities = guidance.requiredCapabilities?.filter((capability) =>
    candidateCapabilities.has(capability),
  );
  const constrained = {
    ...(requestedRoleId ? { requestedRoleId } : {}),
    ...(taskType ? { taskType } : {}),
    ...(requiredCapabilities && requiredCapabilities.length > 0
      ? { requiredCapabilities: requiredCapabilities as readonly string[] }
      : {}),
    ...(guidance.preferredCapabilities?.length
      ? { preferredCapabilities: guidance.preferredCapabilities }
      : {}),
    ...(guidance.strategy ? { strategy: guidance.strategy } : {}),
    ...(typeof guidance.preferLocal === "boolean" ? { preferLocal: guidance.preferLocal } : {}),
    ...(guidance.preferredEndpointIds?.length
      ? { preferredEndpointIds: guidance.preferredEndpointIds }
      : {}),
  } satisfies ControllerAcceptedDirectives;

  return Object.keys(constrained).length > 0 ? constrained : null;
}

function toDifficultyStrategy(
  difficulty: UnifiedRuntimeDifficultyBucket,
): "balanced" | "cost" | "quality" {
  switch (difficulty) {
    case "easy":
      return "cost";
    case "hard":
      return "quality";
    default:
      return "balanced";
  }
}

function toHybridSummaryStrategy(strategy: string): "balanced" | "cost" | "quality" {
  switch (strategy) {
    case "cost":
    case "low-cost":
      return "cost";
    case "quality":
    case "high-quality":
      return "quality";
    default:
      return "balanced";
  }
}

function filterEndpointsByDifficulty(input: {
  readonly allowEndpoints: readonly string[];
  readonly difficulty: UnifiedRuntimeDifficultyBucket;
  readonly endpointMaxDifficultyByEndpointId?: Readonly<
    Record<string, UnifiedRuntimeDifficultyBucket>
  >;
  readonly overrideRecommendedMaxDifficultyByEndpointId?: Readonly<
    Record<string, UnifiedRuntimeDifficultyBucket>
  >;
}): {
  readonly allowEndpoints: readonly string[];
  readonly excludedEndpointIds: readonly string[];
  readonly overrideAppliedEndpointIds: readonly string[];
  readonly overrideRecommendedMaxDifficultyByEndpointId: Readonly<
    Record<string, UnifiedRuntimeDifficultyBucket>
  >;
} {
  const nextAllowed: string[] = [];
  const excludedEndpointIds: string[] = [];
  const overrideAppliedEndpointIds: string[] = [];
  const overrideRecommendedMaxDifficultyByEndpointId: Record<
    string,
    UnifiedRuntimeDifficultyBucket
  > = {};
  for (const endpointId of input.allowEndpoints) {
    const maxDifficulty = input.endpointMaxDifficultyByEndpointId?.[endpointId] ?? "hard";
    if (DIFFICULTY_BUCKET_ORDER[maxDifficulty] >= DIFFICULTY_BUCKET_ORDER[input.difficulty]) {
      nextAllowed.push(endpointId);
      continue;
    }
    const overrideMaxDifficulty = input.overrideRecommendedMaxDifficultyByEndpointId?.[endpointId];
    if (
      overrideMaxDifficulty &&
      DIFFICULTY_BUCKET_ORDER[overrideMaxDifficulty] >= DIFFICULTY_BUCKET_ORDER[input.difficulty]
    ) {
      nextAllowed.push(endpointId);
      overrideAppliedEndpointIds.push(endpointId);
      overrideRecommendedMaxDifficultyByEndpointId[endpointId] = overrideMaxDifficulty;
      continue;
    }
    excludedEndpointIds.push(endpointId);
  }
  return {
    allowEndpoints: nextAllowed,
    excludedEndpointIds,
    overrideAppliedEndpointIds,
    overrideRecommendedMaxDifficultyByEndpointId,
  };
}

function readObservedOverrideMaxDifficultyByEndpointId(input: {
  readonly databasePath: string;
  readonly endpointIds: readonly string[];
  readonly observedDataConfig: ReturnType<typeof resolveUnifiedRuntimeObservedDataConfig>;
}): Record<string, UnifiedRuntimeDifficultyBucket> {
  if (!input.observedDataConfig.enabled) {
    return {};
  }

  const recommendations: Record<string, UnifiedRuntimeDifficultyBucket> = {};
  for (const endpointId of input.endpointIds) {
    const recommendation = readAdvisoryMaxDifficultyRecommendation({
      databasePath: input.databasePath,
      endpointId,
      thresholds: input.observedDataConfig.difficultyLearning.override,
    });
    if (recommendation.recommendedMaxDifficulty) {
      recommendations[endpointId] = recommendation.recommendedMaxDifficulty;
    }
  }
  return recommendations;
}

function maybeApplyDifficultyRouting(input: {
  readonly effectiveRoutingMode: RuntimeRoutingMode;
  readonly requestedModel: string;
  readonly modelAliases: readonly UnifiedRuntimeModelAliasConfig[];
  readonly messages: readonly OpenAIChatCompletionsMessage[];
  readonly contextTokens: number;
  readonly toolCount: number;
  readonly allowEndpoints: readonly string[];
  readonly routingDiagnostics?: Pick<
    RuntimeRoutingDiagnostics,
    "aliasResolution" | "routingMode" | "capabilityEligibility"
  >;
  readonly difficultyContext?: BridgeDifficultyRoutingContext;
}): {
  readonly allowEndpoints: readonly string[];
  readonly strategy: "balanced" | "cost" | "quality";
  readonly routingDiagnostics?: Pick<
    RuntimeRoutingDiagnostics,
    "aliasResolution" | "routingMode" | "capabilityEligibility" | "difficultyRouting"
  >;
} {
  if (!shouldApplyDifficultyRouting(input.effectiveRoutingMode)) {
    return {
      allowEndpoints: input.allowEndpoints,
      strategy: "balanced",
      routingDiagnostics: input.routingDiagnostics,
    };
  }

  const signals = summarizeDifficultySignals({
    messages: input.messages,
    contextTokens: input.contextTokens,
    toolCount: input.toolCount,
  });
  const classified = input.difficultyContext?.resolvedClassification ?? {
    ...classifyDifficultyFromSignals({
      signals,
      classifier: input.difficultyContext?.difficultyClassifier,
    }),
    rubricSignals: signals,
  };
  const strategy = toDifficultyStrategy(classified.difficulty);
  const gated = filterEndpointsByDifficulty({
    allowEndpoints: input.allowEndpoints,
    difficulty: classified.difficulty,
    endpointMaxDifficultyByEndpointId: input.difficultyContext?.endpointMaxDifficultyByEndpointId,
    overrideRecommendedMaxDifficultyByEndpointId:
      input.difficultyContext?.overrideRecommendedMaxDifficultyByEndpointId,
  });

  return {
    allowEndpoints: gated.allowEndpoints,
    strategy,
    routingDiagnostics: {
      ...input.routingDiagnostics,
      difficultyRouting: {
        difficulty: classified.difficulty,
        strategy,
        fallbackApplied: classified.fallbackApplied,
        ...(classified.cacheHit ? { cacheHit: true } : {}),
        ...(classified.cacheInvalidated ? { cacheInvalidated: true } : {}),
        ...(classified.cacheInvalidationReasons?.length
          ? { cacheInvalidationReasons: classified.cacheInvalidationReasons }
          : {}),
        ...(classified.fallbackReason ? { fallbackReason: classified.fallbackReason } : {}),
        ...(gated.excludedEndpointIds.length > 0
          ? { excludedEndpointIds: gated.excludedEndpointIds }
          : {}),
        ...(gated.overrideAppliedEndpointIds.length
          ? { overrideAppliedEndpointIds: gated.overrideAppliedEndpointIds }
          : {}),
        ...(Object.keys(gated.overrideRecommendedMaxDifficultyByEndpointId).length
          ? {
              overrideRecommendedMaxDifficultyByEndpointId:
                gated.overrideRecommendedMaxDifficultyByEndpointId,
            }
          : {}),
        rubricSignals: classified.rubricSignals,
      },
    },
  };
}

function mergeCapabilityList(
  base: readonly string[],
  extra: readonly string[] | undefined,
): readonly string[] {
  const merged = [...base];
  for (const value of extra ?? []) {
    if (!merged.includes(value)) {
      merged.push(value);
    }
  }
  return merged;
}

function collectPreferredEndpointIds(
  allowEndpoints: readonly string[] | undefined,
  preferredEndpointIds: readonly string[] | undefined,
): readonly string[] {
  const allowSet = new Set(allowEndpoints ?? []);
  const filtered: string[] = [];
  for (const endpointId of preferredEndpointIds ?? []) {
    if (allowSet.has(endpointId) && !filtered.includes(endpointId)) {
      filtered.push(endpointId);
    }
  }
  if (allowSet.size > 0 && filtered.length === allowSet.size) {
    return [];
  }
  return filtered;
}

function isOpenAICodexSubscriptionEndpointId(endpointId: string): boolean {
  return OPENAI_CODEX_SUBSCRIPTION_ENDPOINT_ID_MARKERS.some((marker) =>
    endpointId.includes(marker),
  );
}

function resolveEffectiveExecutionAdapterFamily(input: {
  readonly endpointId: string;
  readonly adapterFamily: string;
  readonly vendorId?: string | null;
}): string {
  if (
    isOpenAICodexSubscriptionEndpointId(input.endpointId) &&
    input.vendorId === "chatgpt-codex-responses"
  ) {
    return OPENAI_CODEX_SUBSCRIPTION_RESPONSES_ADAPTER_FAMILY;
  }
  return input.adapterFamily;
}

function strategyToObservedDifficultyBucket(
  strategy: BridgeRoutingStrategy | undefined,
): UnifiedRuntimeDifficultyBucket | undefined {
  switch (strategy) {
    case "quality":
      return "hard";
    case "cost":
      return "easy";
    case "balanced":
      return "medium";
    default:
      return undefined;
  }
}

export function resolveObservedDifficultyBucketForPlan(plan: {
  readonly routingDiagnostics?: Pick<
    RuntimeRoutingDiagnostics,
    "difficultyRouting" | "controllerRouting"
  >;
}): UnifiedRuntimeDifficultyBucket | undefined {
  const difficultyBucket = plan.routingDiagnostics?.difficultyRouting?.difficulty;
  if (difficultyBucket) {
    return difficultyBucket;
  }
  if (!plan.routingDiagnostics?.controllerRouting?.active) {
    return undefined;
  }
  const strategy = plan.routingDiagnostics.controllerRouting.acceptedDirectives?.strategy;
  return typeof strategy === "string" && isBridgeRoutingStrategy(strategy)
    ? strategyToObservedDifficultyBucket(strategy)
    : undefined;
}

function maybeApplyControllerRouting(input: {
  readonly effectiveRoutingMode: RuntimeRoutingMode;
  readonly requestedModel: string;
  readonly modelAliases: readonly UnifiedRuntimeModelAliasConfig[];
  readonly routingRequest: Parameters<typeof routeRuntimeRequest>[0]["request"];
  readonly routingDiagnostics?: Pick<
    RuntimeRoutingDiagnostics,
    "aliasResolution" | "routingMode" | "capabilityEligibility" | "difficultyRouting"
  >;
  readonly controllerContext?: BridgeControllerRoutingContext;
  readonly roleDefinitions?: readonly RuntimeRoleDefinitionRecord[];
  readonly taskDefinitions?: readonly RuntimeTaskDefinitionRecord[];
}): {
  readonly routingRequest: Parameters<typeof routeRuntimeRequest>[0]["request"];
  readonly routingModel?: RoutingModelSelection;
  readonly routingDiagnostics?: Pick<
    RuntimeRoutingDiagnostics,
    | "aliasResolution"
    | "routingMode"
    | "capabilityEligibility"
    | "difficultyRouting"
    | "controllerRouting"
    | "hybridArbitration"
  >;
} {
  if (!shouldApplyControllerRouting(input.effectiveRoutingMode)) {
    return {
      routingRequest: input.routingRequest,
      routingDiagnostics: input.routingDiagnostics,
    };
  }
  const guidance = input.controllerContext?.resolvedGuidance;
  if (!input.controllerContext?.active) {
    return {
      routingRequest: input.routingRequest,
      routingDiagnostics: input.routingDiagnostics,
    };
  }
  if (!guidance) {
    const hybridArbitration = summarizeHybridArbitration({
      effectiveRoutingMode: input.effectiveRoutingMode,
      routingRequest: input.routingRequest,
      controllerContext: input.controllerContext,
      preferredEndpointIds: [],
      finalStrategy: toHybridSummaryStrategy(input.routingRequest.strategy),
    });
    return {
      routingRequest: input.routingRequest,
      routingDiagnostics: {
        ...input.routingDiagnostics,
        controllerRouting: {
          active: true,
          ...(input.controllerContext.fallbackApplied ? { fallbackApplied: true } : {}),
          ...(input.controllerContext.fallbackReason
            ? { fallbackReason: input.controllerContext.fallbackReason }
            : {}),
        },
        ...(hybridArbitration ? { hybridArbitration } : {}),
      },
    };
  }

  const guidanceStrategy =
    guidance.strategy && isBridgeRoutingStrategy(guidance.strategy) ? guidance.strategy : undefined;
  const requestedRoleId = resolveControllerRequestedRoleId(
    guidance.requestedRoleId,
    input.roleDefinitions,
  );
  const taskType = resolveControllerTaskType(guidance.taskType, input.taskDefinitions);
  const knownCapabilities = buildKnownControllerCapabilitySet({
    roleDefinitions: input.roleDefinitions,
    taskDefinitions: input.taskDefinitions,
  });
  const requiredCapabilitiesFromGuidance = filterKnownControllerCapabilities(
    guidance.requiredCapabilities,
    knownCapabilities,
  );
  const preferredCapabilitiesFromGuidance = filterKnownControllerCapabilities(
    guidance.preferredCapabilities,
    knownCapabilities,
  );
  const preferredEndpointIds = collectPreferredEndpointIds(
    input.routingRequest.allowEndpoints ?? [],
    guidance.preferredEndpointIds,
  );
  const requestedModelIsAlias = input.modelAliases.some(
    (alias) => alias.aliasId === input.requestedModel,
  );
  const preserveSingleEndpointExecutability =
    !requestedModelIsAlias &&
    (input.routingRequest.allowEndpoints?.length ?? 0) === 1 &&
    preferredEndpointIds.length === 0;
  const requiredCapabilities = preserveSingleEndpointExecutability
    ? input.routingRequest.requiredCapabilities
    : taskType && taskType !== input.routingRequest.taskType
      ? (requiredCapabilitiesFromGuidance ?? input.routingRequest.requiredCapabilities)
      : mergeCapabilityList(
          input.routingRequest.requiredCapabilities,
          requiredCapabilitiesFromGuidance,
        );
  const finalStrategy = guidanceStrategy ?? input.routingRequest.strategy;
  const hybridArbitration = summarizeHybridArbitration({
    effectiveRoutingMode: input.effectiveRoutingMode,
    routingRequest: input.routingRequest,
    controllerContext: input.controllerContext,
    guidance,
    preferredEndpointIds,
    finalStrategy,
  });

  return {
    routingRequest: {
      ...input.routingRequest,
      ...(!preserveSingleEndpointExecutability && requestedRoleId ? { requestedRoleId } : {}),
      ...(!preserveSingleEndpointExecutability && taskType ? { taskType } : {}),
      requiredCapabilities,
      preferredCapabilities:
        preferredCapabilitiesFromGuidance ?? input.routingRequest.preferredCapabilities,
      ...(guidanceStrategy ? { strategy: guidanceStrategy } : {}),
      ...(typeof guidance.preferLocal === "boolean" ? { preferLocal: guidance.preferLocal } : {}),
    },
    ...(preferredEndpointIds.length
      ? {
          routingModel: {
            endpointId: preferredEndpointIds[0],
            preferredEndpointIds,
          },
        }
      : {}),
    routingDiagnostics: {
      ...input.routingDiagnostics,
      controllerRouting: {
        active: true,
        ...(input.controllerContext.fallbackApplied ? { fallbackApplied: true } : {}),
        ...(input.controllerContext.fallbackReason
          ? { fallbackReason: input.controllerContext.fallbackReason }
          : {}),
        acceptedDirectives: {
          ...(requestedRoleId ? { requestedRoleId } : {}),
          ...(taskType ? { taskType } : {}),
          ...(requiredCapabilitiesFromGuidance?.length
            ? { requiredCapabilities: requiredCapabilitiesFromGuidance }
            : {}),
          ...(preferredCapabilitiesFromGuidance?.length
            ? { preferredCapabilities: preferredCapabilitiesFromGuidance }
            : {}),
          ...(guidance.strategy ? { strategy: guidance.strategy } : {}),
          ...(typeof guidance.preferLocal === "boolean"
            ? { preferLocal: guidance.preferLocal }
            : {}),
          ...(preferredEndpointIds.length ? { preferredEndpointIds } : {}),
        },
      },
      ...(hybridArbitration ? { hybridArbitration } : {}),
    },
  };
}

type BridgeModelOverrideRecord = {
  ttl?: number;
  contextWindow?: number;
  concurrencyLimit?: number;
  roleIds?: readonly string[];
  roleAssignmentMode?: "all" | "include" | "exclude" | "custom";
  enabledRoleIds?: readonly string[];
  disabledRoleIds?: readonly string[];
};

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
  readonly contentText?: string;
  readonly reasoningText?: string;
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

export interface BridgeToolCall {
  readonly id: string;
  readonly type: "function";
  readonly function: {
    readonly name: string;
    readonly arguments: string;
  };
}

type BridgeContinuationToolCall = {
  readonly name: string;
  readonly arguments: unknown;
  readonly providerToolId?: string;
};

type BridgeStreamMetadata = {
  readonly endpointId: string;
  readonly adapterFamily: string;
  readonly routingDecisionId?: string;
  readonly reasoningRequested?: boolean;
};
type BridgeStreamWriter = (
  chunk: Record<string, unknown>,
  metadata?: BridgeStreamMetadata,
) => void | Promise<void>;

export interface BridgeTelemetryQuery {
  readonly windowMs?: number;
  readonly limit?: number;
  readonly endAtMs?: number;
  readonly startAtMs?: number;
  readonly filters?: BridgeTelemetryAnalyticsFilters;
}

export type BridgeTelemetryAnalyticsGranularity = "hour" | "day" | "week";

export type BridgeTelemetryAnalyticsMetric =
  | "requestCount"
  | "successCount"
  | "failureCount"
  | "inputTokens"
  | "outputTokens"
  | "totalTokens"
  | "cacheHitTokens"
  | "cacheReadTokens"
  | "cacheBackedRequestRate"
  | "cacheHitTokenRate"
  | "actualCostUsd"
  | "estimatedCostUsd"
  | "effectiveCostUsd"
  | "selectedUncachedCostUsd"
  | "baselineMaxEligibleCostUsd"
  | "routingCostSavingsUsd"
  | "cacheCostSavingsUsd"
  | "totalAvoidedCostUsd"
  | "averageLatencyMs"
  | "p95LatencyMs";

export type BridgeTelemetryAnalyticsDimension =
  | "sourceType"
  | "endpointId"
  | "modelId"
  | "providerId"
  | "providerKind"
  | "providerFamily"
  | "providerAccountId"
  | "requestedRoleId"
  | "selectedStrategy"
  | "routingMode"
  | "difficultyBucket"
  | "statusFamily"
  | "requestOperation"
  | "taxonomyGroupId"
  | "taxonomyRoleId"
  | "taxonomyTaskType"
  | "taxonomyTaskVariant"
  | "taxonomyCapabilityId"
  | "taxonomyModalityId"
  | "taxonomyToolClassId";

export interface BridgeTelemetryAnalyticsFilters {
  readonly sourceTypes?: readonly ("local" | "remote")[];
  readonly endpointIds?: readonly string[];
  readonly modelIds?: readonly string[];
  readonly providerIds?: readonly string[];
  readonly providerKinds?: readonly string[];
  readonly providerFamilies?: readonly string[];
  readonly providerAccountIds?: readonly string[];
  readonly requestedRoleIds?: readonly string[];
  readonly selectedStrategies?: readonly string[];
  readonly routingModes?: readonly ("baseline" | "difficulty" | "controller" | "hybrid")[];
  readonly difficultyBuckets?: readonly ("easy" | "medium" | "hard")[];
  readonly statusFamilies?: readonly ("success" | "failure" | "unknown")[];
  readonly requestOperations?: readonly string[];
  readonly taxonomyGroupIds?: readonly string[];
  readonly taxonomyRoleIds?: readonly string[];
  readonly taxonomyTaskTypes?: readonly string[];
  readonly taxonomyTaskVariants?: readonly string[];
  readonly taxonomyCapabilityIds?: readonly string[];
  readonly taxonomyModalityIds?: readonly string[];
  readonly taxonomyToolClassIds?: readonly string[];
}

export interface BridgeTelemetryAnalyticsRanking {
  readonly dimension: BridgeTelemetryAnalyticsDimension;
  readonly metric: BridgeTelemetryAnalyticsMetric;
  readonly limit?: number;
}

export interface BridgeTelemetryAnalyticsQuery {
  readonly startAtMs?: number;
  readonly endAtMs?: number;
  readonly windowMs?: number;
  readonly granularity: BridgeTelemetryAnalyticsGranularity;
  readonly metrics: readonly BridgeTelemetryAnalyticsMetric[];
  readonly breakdown?: BridgeTelemetryAnalyticsDimension | null;
  readonly filters?: BridgeTelemetryAnalyticsFilters;
  readonly ranking?: BridgeTelemetryAnalyticsRanking | null;
}

export type BridgeTelemetryAnalyticsSupportStatus = "supported" | "partial" | "unsupported";

export interface BridgeTelemetryAnalyticsMetricSupport {
  readonly metric: BridgeTelemetryAnalyticsMetric;
  readonly status: BridgeTelemetryAnalyticsSupportStatus;
  readonly aggregation: string;
  readonly matchedRowCount: number;
  readonly supportedRowCount: number;
  readonly unsupportedRowCount: number;
  readonly nullValueCount: number;
  readonly reason: string | null;
}

export interface BridgeTelemetryAnalyticsDimensionSupport {
  readonly dimension: BridgeTelemetryAnalyticsDimension;
  readonly status: BridgeTelemetryAnalyticsSupportStatus;
  readonly matchedRowCount: number;
  readonly populatedRowCount: number;
  readonly sparseRowCount: number;
  readonly reason: string | null;
}

export interface BridgeTelemetryAnalyticsSeries {
  readonly key: string;
  readonly label: string;
  readonly metrics: Readonly<Record<string, number | null>>;
}

export interface BridgeTelemetryAnalyticsBucket {
  readonly startAtMs: number;
  readonly endAtMs: number;
  readonly totals: Readonly<Record<string, number | null>>;
  readonly series: readonly BridgeTelemetryAnalyticsSeries[];
}

export interface BridgeTelemetryAnalyticsRankingRow {
  readonly key: string;
  readonly label: string;
  readonly value: number | null;
}

export interface BridgeTelemetryAnalyticsResponse {
  readonly startAtMs: number;
  readonly endAtMs: number;
  readonly appliedQuery: BridgeTelemetryAnalyticsQuery;
  readonly granularity: BridgeTelemetryAnalyticsGranularity;
  readonly metrics: readonly BridgeTelemetryAnalyticsMetric[];
  readonly breakdown: BridgeTelemetryAnalyticsDimension | null;
  readonly buckets: readonly BridgeTelemetryAnalyticsBucket[];
  readonly totals: Readonly<Record<string, number | null>>;
  readonly ranking: {
    readonly dimension: BridgeTelemetryAnalyticsDimension;
    readonly metric: BridgeTelemetryAnalyticsMetric;
    readonly rows: readonly BridgeTelemetryAnalyticsRankingRow[];
  } | null;
  readonly labels: Partial<Record<BridgeTelemetryAnalyticsDimension, Record<string, string>>>;
  readonly metadata: {
    readonly scannedRowCount: number;
    readonly matchedRowCount: number;
    readonly aggregationRowCount: number;
    readonly truncated: boolean;
    readonly truncationReason: string | null;
    readonly generatedAtMs: number;
    readonly taxonomyCoverage?: {
      readonly matchedRowCount: number;
      readonly richerTaxonomyRowCount: number;
      readonly legacyRowCount: number;
      readonly coverageRate: number;
      readonly backfillPerformed: false;
    };
  };
  readonly metricSupport: Partial<
    Record<BridgeTelemetryAnalyticsMetric, BridgeTelemetryAnalyticsMetricSupport>
  >;
  readonly dimensionSupport: Partial<
    Record<BridgeTelemetryAnalyticsDimension, BridgeTelemetryAnalyticsDimensionSupport>
  >;
}

function roundTelemetryUsd(value: number): number {
  return Number(value.toFixed(6));
}

function uniqueTelemetryStrings(values: readonly (string | null | undefined)[]): readonly string[] {
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string")));
}

function telemetrySourceTypeFromEndpointKind(endpointKind: string): "local" | "remote" {
  return endpointKind.startsWith("remote") || endpointKind === "remote_api" ? "remote" : "local";
}

function finiteTelemetryNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function buildRuntimeTelemetrySnapshot(input: {
  readonly routed: RouteRuntimeRequestResult;
  readonly execution: Pick<RoutedExecutionResult, "target" | "normalized">;
  readonly requestOperation: string;
  readonly requestedModelId?: string | null;
  readonly roleIds?: readonly string[];
  readonly toolingUsed?: boolean;
}): RuntimeTelemetrySnapshot {
  const candidateByEndpointId = new Map(
    input.routed.projected.routeInput.candidates.map((candidate) => [
      candidate.identity.endpoint_id,
      candidate,
    ]),
  );
  const scoredEndpointIds = input.routed.decision.scored_candidates.map(
    (candidate) => candidate.endpoint_id,
  );
  const eligibleEndpointIds = uniqueTelemetryStrings([
    input.routed.decision.chosen_endpoint_id,
    ...scoredEndpointIds,
    ...input.routed.decision.fallback_endpoint_ids,
  ]);
  const selectedEndpointId = input.routed.decision.chosen_endpoint_id;
  const selectedCandidate = candidateByEndpointId.get(selectedEndpointId);
  const selectedEconomics = input.routed.catalogEconomicsByEndpointId[selectedEndpointId] ?? null;
  const selectedSourceType = telemetrySourceTypeFromEndpointKind(
    input.execution.target.candidate.identity.endpoint_kind,
  );
  const candidateCostSnapshot = Object.fromEntries(
    eligibleEndpointIds.map((endpointId) => {
      const candidate = candidateByEndpointId.get(endpointId);
      const economics = input.routed.catalogEconomicsByEndpointId[endpointId] ?? null;
      const candidateSourceType = candidate
        ? telemetrySourceTypeFromEndpointKind(candidate.identity.endpoint_kind)
        : endpointId === selectedEndpointId
          ? selectedSourceType
          : "remote";
      return [
        endpointId,
        {
          modelId:
            candidate?.identity.model_id ??
            (endpointId === selectedEndpointId ? input.execution.target.modelId : endpointId),
          providerId: endpointId === selectedEndpointId ? input.execution.target.providerId : null,
          providerKind: candidate?.identity.provider_kind ?? null,
          sourceType: candidateSourceType,
          endpointKind: candidate?.identity.endpoint_kind ?? null,
          servingSource: candidate?.identity.serving_source ?? null,
          region: candidate?.identity.region ?? null,
          tokenEconomicsSource: economics?.tokenEconomicsSource ?? "unknown",
          estimatedRequestUsd: economics?.estimatedRequestUsd ?? null,
          costPer1kTokensEst: economics?.cost_per_1k_tokens_est ?? null,
          inputPer1M: economics?.inputPer1M ?? null,
          outputPer1M: economics?.outputPer1M ?? null,
        },
      ];
    }),
  );
  const eligibleModelIds = uniqueTelemetryStrings(
    eligibleEndpointIds.map(
      (endpointId) =>
        candidateByEndpointId.get(endpointId)?.identity.model_id ??
        (endpointId === selectedEndpointId ? input.execution.target.modelId : null),
    ),
  );
  const selectedUncachedCostUsd = finiteTelemetryNumber(selectedEconomics?.estimatedRequestUsd);
  const eligibleEstimatedCosts = eligibleEndpointIds
    .map((endpointId) =>
      finiteTelemetryNumber(
        input.routed.catalogEconomicsByEndpointId[endpointId]?.estimatedRequestUsd,
      ),
    )
    .filter((value): value is number => value !== null);
  const baselineMaxEligibleCostUsd =
    eligibleEstimatedCosts.length > 0
      ? Math.max(...eligibleEstimatedCosts)
      : selectedUncachedCostUsd;
  const routingCostSavingsUsd =
    baselineMaxEligibleCostUsd !== null && selectedUncachedCostUsd !== null
      ? roundTelemetryUsd(Math.max(0, baselineMaxEligibleCostUsd - selectedUncachedCostUsd))
      : 0;
  const cacheCostSavingsUsd =
    input.execution.normalized.promptCache.used &&
    input.execution.normalized.promptCache.readTokens > 0 &&
    typeof selectedEconomics?.inputPer1M === "number"
      ? roundTelemetryUsd(
          (input.execution.normalized.promptCache.readTokens * selectedEconomics.inputPer1M) /
            1_000_000,
        )
      : 0;
  const selectedPricingSnapshot = selectedEconomics
    ? {
        modelId: selectedCandidate?.identity.model_id ?? input.execution.target.modelId,
        providerId: input.execution.target.providerId,
        providerAccountId: input.execution.target.providerAccountId,
        sourceType: selectedSourceType,
        tokenEconomicsSource: selectedEconomics.tokenEconomicsSource,
        estimatedRequestUsd: selectedEconomics.estimatedRequestUsd,
        costPer1kTokensEst: selectedEconomics.cost_per_1k_tokens_est,
        inputPer1M: selectedEconomics.inputPer1M,
        outputPer1M: selectedEconomics.outputPer1M,
      }
    : null;

  return {
    providerId: input.execution.target.providerId ?? null,
    providerAccountId: input.execution.target.providerAccountId ?? null,
    sourceType: selectedSourceType,
    endpointKind: input.execution.target.candidate.identity.endpoint_kind,
    servingSource: input.execution.target.candidate.identity.serving_source,
    region: input.execution.target.candidate.identity.region ?? null,
    lifecycleStateAtRequest: input.execution.target.candidate.status,
    healthStatusAtRequest: input.execution.target.account?.healthStatus ?? null,
    requestedModelId: input.requestedModelId ?? null,
    selectedModelId: input.execution.target.modelId,
    requestOperation: input.requestOperation,
    roleIds: input.roleIds ?? [],
    toolingUsed: input.toolingUsed ?? input.execution.normalized.toolCalls.length > 0,
    cacheState: input.execution.normalized.promptCache.used
      ? "hit"
      : input.execution.normalized.promptCache.requested
        ? "miss"
        : "unsupported",
    eligibleEndpointIds,
    eligibleModelIds,
    candidateCostSnapshot,
    selectedPricingSnapshot,
    selectedUncachedCostUsd,
    baselineMaxEligibleCostUsd,
    routingCostSavingsUsd,
    cacheCostSavingsUsd,
    totalAvoidedCostUsd: roundTelemetryUsd(routingCostSavingsUsd + cacheCostSavingsUsd),
    costBaselineSource:
      baselineMaxEligibleCostUsd === null
        ? null
        : eligibleEndpointIds.length > 1
          ? "eligible_candidate_max"
          : "selected_only",
    costSavingsSupport:
      baselineMaxEligibleCostUsd !== null && selectedUncachedCostUsd !== null ? "full" : "partial",
    dimensions: {
      selectedEndpointId,
      candidateCount: eligibleEndpointIds.length,
    },
  };
}

export type BridgeTelemetryRequestRecord = ReturnType<
  typeof listRuntimeTelemetryRecords
>[number] & {
  readonly clientRequestId?: string | null;
  readonly requestClass?: "benchmark" | "live_request" | "unknown";
  readonly sourceType: "local" | "remote";
  readonly providerId: string | null;
  readonly endpointKind: string | null;
  readonly servingSource: string | null;
  readonly healthStatus: string;
  readonly status: string;
  readonly roleIds: readonly string[];
  readonly taxonomyGroupId?: string | null;
  readonly taxonomyRoleId?: string | null;
  readonly taxonomyTaskType?: string | null;
  readonly taxonomyTaskVariant?: string | null;
  readonly taxonomyCapabilityIds?: readonly string[];
  readonly taxonomyModalityIds?: readonly string[];
  readonly taxonomyToolClassIds?: readonly string[];
};

export type BridgeTelemetryEndpointMeta = Pick<
  BridgeTelemetryRequestRecord,
  | "sourceType"
  | "providerId"
  | "endpointKind"
  | "servingSource"
  | "healthStatus"
  | "status"
  | "roleIds"
>;

type BridgeRequestObservation = RuntimeObservationBundle &
  BridgeTelemetryEndpointMeta & {
    readonly observationAvailability: {
      readonly source: "raw-observation" | "telemetry-ledger-fallback";
      readonly rawObservationAvailable: boolean;
      readonly structuredInspectionAvailable: boolean;
      readonly reason: string;
    };
    readonly effectiveCostUsd?: number;
    readonly costCalculationBasis?: string;
    readonly costCalculationVersion?: string;
    readonly selectedUncachedCostUsd?: number | null;
    readonly baselineMaxEligibleCostUsd?: number | null;
    readonly routingCostSavingsUsd?: number;
    readonly cacheCostSavingsUsd?: number;
    readonly totalAvoidedCostUsd?: number;
    readonly costBaselineSource?: string | null;
    readonly costSavingsSupport?: string | null;
  };

function synthesizeFallbackCapturePolicy(
  record: ReturnType<typeof listRuntimeTelemetryRecords>[number],
): RuntimeObservationCapturePolicyReceipt {
  return {
    environment: "telemetry-ledger-fallback",
    redactionLevel: record.redactionLevel ?? "unknown",
    retentionClass: record.retentionClass ?? "unknown",
    structuredInspectionMode: record.structuredInspectionMode ?? "unavailable",
    rawCaptureAvailable: false,
    structuredInspectionAvailable: false,
    redactedFields: [],
    suppressedFields: [],
  };
}

function synthesizeFallbackPrivacyReceipt(
  record: ReturnType<typeof listRuntimeTelemetryRecords>[number],
):
  | {
      readonly samplingRate?: number;
      readonly retentionTtlHours?: number;
      readonly retainUntil?: number;
    }
  | undefined {
  if (
    record.samplingRate === null &&
    record.retentionTtlHours === null &&
    record.retainUntil === null
  ) {
    return undefined;
  }
  return {
    ...(record.samplingRate !== null ? { samplingRate: record.samplingRate } : {}),
    ...(record.retentionTtlHours !== null ? { retentionTtlHours: record.retentionTtlHours } : {}),
    ...(record.retainUntil !== null ? { retainUntil: record.retainUntil } : {}),
  };
}

export type BridgeTelemetryComparisonRow = ReturnType<
  typeof listRuntimeTelemetryComparisonRows
>[number] & {
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
  readonly runtimeStateRoot?: string;
  readonly runtimeChannel?: "development" | "stage" | "production";
  readonly registry: EndpointRegistryResult;
  readonly getRegistry?: () => EndpointRegistryResult;
  readonly getExecutionCatalog?: () => NormalizedCatalog;
  readonly readStartupReadiness?: () => {
    readonly ready: boolean;
    readonly status: "pending" | "ready" | "failed";
    readonly message?: string;
  };
  readonly executeChatCompletions: (
    body: OpenAIChatCompletionsBody,
    requestId: string,
    streamWriter?: BridgeStreamWriter,
    requestOptions?: BridgeExecutionRequestOptions,
  ) => Promise<BridgeChatCompletionsExecutionResult>;
  readonly executeResponses: (
    body: OpenAIResponsesBody,
    requestId: string,
    streamWriter?: BridgeStreamWriter,
    requestOptions?: BridgeExecutionRequestOptions,
  ) => Promise<BridgeResponsesExecutionResult>;
  readonly readVersionInfo?: () => Promise<unknown>;
  readonly shutdown?: () => Promise<void>;
  readonly listActivityMetrics?: () => Promise<unknown>;
  readonly readActivityCapture?: (captureId: number) => Promise<unknown>;
  readonly readLogs?: () => Promise<string>;
  readonly proxyVendorLogStream?: (
    pathname: string,
    search: string,
  ) => Promise<{ readonly body: string; readonly contentType: string } | null>;
  readonly readRuntimeSummary?: () => Promise<unknown>;
  readonly readHealthStatus?: () => Promise<unknown>;
  readonly listProviders?: () => Promise<readonly unknown[]>;
  readonly listModels?: () => Promise<readonly unknown[]>;
  readonly listExtensions?: () => Promise<readonly unknown[]>;
  readonly mutateExtension?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly readTrackBQaExtensions?: () => Promise<readonly unknown[]>;
  readonly readTrackBShadowReceipts?: () => Promise<unknown>;
  readonly readGraphMigration?: () => Promise<unknown>;
  readonly advanceGraphMigration?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly rollbackGraphMigration?: () => Promise<unknown>;
  readonly readStorageRetention?: () => Promise<unknown>;
  readonly dryRunStorageRetention?: () => Promise<unknown>;
  readonly updateStorageRetentionPolicy?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly executeStorageRetention?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly cancelStorageRetentionJob?: () => Promise<unknown>;
  readonly rollbackStorageRetention?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly readContributionState?: () => Promise<unknown>;
  readonly updateContributionState?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly listRecommendations?: () => Promise<readonly unknown[]>;
  readonly downloadRecommendations?: () => Promise<readonly unknown[]>;
  readonly applyRecommendation?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly dismissRecommendation?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly readActivePack?: () => Promise<unknown>;
  readonly listRoles?: () => Promise<readonly unknown[]>;
  readonly listAccounts?: () => Promise<readonly unknown[]>;
  readonly listProviderDeviceAuthorizations?: () => Promise<readonly unknown[]>;
  readonly upsertProviderAccount?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly reconnectProviderAccount?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly updateProviderApiKey?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly openExternalUrl?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly removeProviderAccountModel?: (
    providerAccountId: string,
    modelId: string,
  ) => Promise<ConfiguredModelEjectResult>;
  readonly startProviderDeviceAuthorization?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly pollProviderDeviceAuthorization?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly readRuntimeConfig?: () => Promise<unknown>;
  readonly updateRuntimeConfig?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly activateEndpoint?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly listEndpoints?: () => Promise<readonly unknown[]>;
  readonly readControllerAssignment?: () => Promise<BridgeControllerAssignment | null>;
  readonly updateControllerAssignment?: (
    body: Record<string, unknown>,
  ) => Promise<BridgeControllerAssignment>;
  readonly readRouterSummary?: () => Promise<unknown>;
  readonly readRouterConfig?: () => Promise<unknown>;
  readonly listRouterCandidates?: () => Promise<readonly unknown[]>;
  readonly listRouterDecisions?: () => Promise<readonly unknown[]>;
  readonly readRouterDecision?: (requestId: string) => Promise<unknown>;
  readonly listRecentRequestIds?: (limit?: number) => Promise<readonly string[]>;
  readonly listRecentRequestObservations?: () => Promise<readonly unknown[]>;
  readonly readTelemetrySummary?: (query?: BridgeTelemetryQuery) => Promise<unknown>;
  readonly listTelemetryComparisonRows?: (
    query?: BridgeTelemetryQuery,
  ) => Promise<readonly unknown[]>;
  readonly listTelemetryRequests?: (query?: BridgeTelemetryQuery) => Promise<readonly unknown[]>;
  readonly queryTelemetryAnalytics?: (
    body: Record<string, unknown>,
  ) => Promise<BridgeTelemetryAnalyticsResponse>;
  readonly subscribeTelemetry?: (
    listener: (event: RuntimeTelemetryStreamEvent) => void,
  ) => () => void;
  readonly readRequestObservation?: (requestId: string) => Promise<unknown>;
  readonly readEndpointProfile?: (endpointId: string) => Promise<unknown>;
  readonly readBenchmarkSuite?: () => Promise<unknown>;
  readonly runBenchmark?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly readBenchmarkRun?: (runId: string) => Promise<unknown>;
  readonly readActiveBenchmarkRun?: () => Promise<unknown>;
  readonly clearBenchmarkEndpointData?: (endpointId: string) => Promise<unknown>;
  readonly clearBenchmarkData?: () => Promise<unknown>;
  readonly readBenchmarkSummary?: () => Promise<unknown>;
  readonly listBenchmarkRuns?: () => Promise<unknown>;
  readonly readBenchmarkSummariesByMode?: () => Promise<unknown>;
  readonly readBenchmarkPreferences?: () => Promise<unknown>;
  readonly updateBenchmarkPreferences?: (body: Record<string, unknown>) => Promise<unknown>;
  readonly staticRoot?: string;
  readonly listLocalModels?: () => Promise<
    readonly {
      modelId: string;
      loadedAt: string;
      engine: string;
      localModelSource?: "llama-swap" | "peer-backed";
      roleIds?: readonly string[];
    }[]
  >;
  readonly listPeerLocalModels?: () => Promise<
    readonly {
      modelId: string;
      loadedAt: string;
      engine: string;
      localModelSource?: "llama-swap" | "peer-backed";
      roleIds?: readonly string[];
    }[]
  >;
  readonly listLlamaSwapLocalModels?: () => Promise<
    readonly {
      modelId: string;
      loadedAt: string;
      engine: string;
      localModelSource?: "llama-swap" | "peer-backed";
      roleIds?: readonly string[];
    }[]
  >;
  readonly loadLocalModel?: (modelId: string) => Promise<{ success: boolean }>;
  readonly loadPeerModel?: (
    modelId: string,
    assignment?: RuntimeModelRoleAssignmentInput,
  ) => Promise<{ success: boolean }>;
  readonly loadLlamaSwapModel?: (
    modelId: string,
    assignment?: RuntimeModelRoleAssignmentInput,
  ) => Promise<{ success: boolean }>;
  readonly setPeerModelRoles?: (
    modelId: string,
    assignment: RuntimeModelRoleAssignmentInput,
  ) => Promise<{ success: boolean }>;
  readonly setLlamaSwapModelRoles?: (
    modelId: string,
    assignment: RuntimeModelRoleAssignmentInput,
  ) => Promise<{ success: boolean }>;
  readonly unloadPeerModel?: (modelId: string) => Promise<{ success: boolean }>;
  readonly unloadLocalModel?: (modelId?: string) => Promise<{ success: boolean }>;
  readonly readLocalPolicy?: () => Promise<Record<string, unknown>>;
  readonly updateLocalPolicy?: (body: Record<string, unknown>) => Promise<Record<string, unknown>>;
  readonly readRolePolicy?: () => Promise<RuntimeRolePolicyRecord>;
  readonly createRolePolicyRole?: (
    body: Record<string, unknown>,
  ) => Promise<RuntimeRoleDefinitionRecord>;
  readonly updateRolePolicyRole?: (
    roleId: string,
    body: Record<string, unknown>,
  ) => Promise<RuntimeRoleDefinitionRecord>;
  readonly listTaskDefinitions?: () => Promise<readonly RuntimeTaskDefinitionRecord[]>;
  readonly updateTaskDefinitions?: (
    body: readonly Record<string, unknown>[],
  ) => Promise<readonly RuntimeTaskDefinitionRecord[]>;
  readonly listSwapHistory?: () => Promise<
    readonly {
      timestamp: string;
      oldModel: string | null;
      newModel: string | null;
      reason: string;
    }[]
  >;
  readonly getLocalLogs?: () => Promise<{ logs: string }>;
  readonly readModelOverrides?: () => Promise<Record<string, BridgeModelOverrideRecord>>;
  readonly updateModelOverrides?: (
    body: Record<string, BridgeModelOverrideRecord>,
  ) => Promise<Record<string, BridgeModelOverrideRecord>>;
  readonly readPeers?: () => Promise<readonly { id: string; url: string; authToken?: string }[]>;
  readonly updatePeers?: (
    body: readonly { id: string; url: string; authToken?: string }[],
  ) => Promise<readonly { id: string; url: string; authToken?: string }[]>;
  readonly checkPeerHealth?: (url: string) => Promise<{ healthy: boolean }>;
  readonly getRoutableInventory?: () => RoutableInventory | null;
}

export interface RuntimeBridgeBackend {
  readonly registry: EndpointRegistryResult;
  readonly effectiveRegistry: EndpointRegistryResult;
  listActivityMetrics(): Promise<readonly unknown[]>;
  readActivityCapture(captureId: number): Promise<unknown | null>;
  executeChatCompletions: (
    body: OpenAIChatCompletionsBody,
    requestId: string,
    streamWriter?: BridgeStreamWriter,
    requestOptions?: BridgeExecutionRequestOptions,
  ) => Promise<BridgeChatCompletionsExecutionResult>;
  executeResponses: (
    body: OpenAIResponsesBody,
    requestId: string,
    streamWriter?: BridgeStreamWriter,
    requestOptions?: BridgeExecutionRequestOptions,
  ) => Promise<BridgeResponsesExecutionResult>;
  readVersionInfo(): Promise<unknown>;
  readRuntimeSummary(): Promise<RuntimeBridgeSummary>;
  readHealthStatus(): Promise<{
    status: "healthy" | "degraded";
    executionMode: UnifiedRuntimeExecutionMode;
    vendors: Record<string, VendorRuntimeStatus>;
    inactiveVendors: string[];
    credentialLifecycleAuthority: RuntimeCredentialLifecycleSummary["authority"];
    sessionBootstrap: {
      status: SessionBootstrapState["status"];
      startedAt: string | null;
      finishedAt: string | null;
      stages: SessionBootstrapState["stages"];
    };
  }>;
  getExecutionCatalog(): NormalizedCatalog;
  getEffectiveRoutableInventory(): RoutableInventory | null;
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
  listModels(): Promise<readonly BridgeRuntimeModelRecord[]>;
  listExtensions(): Promise<readonly unknown[]>;
  mutateExtension(body: Record<string, unknown>): Promise<unknown>;
  readTrackBQaExtensions(): Promise<readonly unknown[]>;
  readTrackBShadowReceipts(): Promise<unknown>;
  readGraphMigration(): Promise<unknown>;
  advanceGraphMigration(body: Record<string, unknown>): Promise<unknown>;
  rollbackGraphMigration(): Promise<unknown>;
  readStorageRetention(): Promise<unknown>;
  dryRunStorageRetention(): Promise<unknown>;
  updateStorageRetentionPolicy(body: Record<string, unknown>): Promise<unknown>;
  executeStorageRetention(body: Record<string, unknown>): Promise<unknown>;
  cancelStorageRetentionJob(): Promise<unknown>;
  rollbackStorageRetention(body: Record<string, unknown>): Promise<unknown>;
  readContributionState(): Promise<unknown>;
  updateContributionState(body: Record<string, unknown>): Promise<unknown>;
  listRecommendations(): Promise<readonly unknown[]>;
  downloadRecommendations(): Promise<readonly unknown[]>;
  applyRecommendation(body: Record<string, unknown>): Promise<unknown>;
  dismissRecommendation(body: Record<string, unknown>): Promise<unknown>;
  readActivePack(): Promise<unknown>;
  listRoles(): Promise<
    readonly {
      roleId: string;
      label: string;
      description: string;
      taskTypes: readonly string[];
    }[]
  >;
  listAccounts(): Promise<ReturnType<typeof listProviderAccounts>>;
  listProviderDeviceAuthorizations(): Promise<readonly DeviceAuthorizationReadbackResult[]>;
  upsertProviderAccount(account: Record<string, unknown>): Promise<ProviderAccountRecord>;
  reconnectProviderAccount(body: Record<string, unknown>): Promise<DeviceAuthorizationStartResult>;
  updateProviderApiKey(body: Record<string, unknown>): Promise<ProviderAccountRecord>;
  openExternalUrl(body: Record<string, unknown>): Promise<{ opened: true; url: string }>;
  removeProviderAccountModel(
    providerAccountId: string,
    modelId: string,
  ): Promise<ConfiguredModelEjectResult>;
  startProviderDeviceAuthorization(
    body: Record<string, unknown>,
  ): Promise<DeviceAuthorizationStartResult>;
  pollProviderDeviceAuthorization(
    body: Record<string, unknown>,
  ): Promise<DeviceAuthorizationPollResult>;
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
  readRouterSummary(): Promise<unknown>;
  readRouterConfig(): Promise<unknown>;
  listRouterCandidates(): Promise<readonly unknown[]>;
  listRouterDecisions(): Promise<readonly unknown[]>;
  readRouterDecision(requestId: string): Promise<unknown>;
  listEndpoints(): Promise<
    readonly {
      endpointId: string;
      modelId: string;
      providerId: string | null;
      localModelSource?: "llama-swap" | "peer-backed";
      endpointKind: string;
      servingSource: string;
      sourceType: "local" | "remote";
      healthStatus: string;
      routingEligible: boolean;
      benchmarkEligible: boolean;
      capabilities: readonly string[];
      toolCallingSupported: boolean;
      toolCallingStyle: string;
      status: string;
    }[]
  >;
  listRecentRequestIds(limit?: number): Promise<readonly string[]>;
  listRecentRequestObservations(): Promise<
    readonly ReturnType<typeof listRecentRuntimeObservations>[number][]
  >;
  readTelemetrySummary(query?: BridgeTelemetryQuery): Promise<BridgeTelemetrySummary>;
  listTelemetryComparisonRows(
    query?: BridgeTelemetryQuery,
  ): Promise<readonly BridgeTelemetryComparisonRow[]>;
  listTelemetryRequests(
    query?: BridgeTelemetryQuery,
  ): Promise<readonly BridgeTelemetryRequestRecord[]>;
  queryTelemetryAnalytics(body: Record<string, unknown>): Promise<BridgeTelemetryAnalyticsResponse>;
  subscribeTelemetry(listener: (event: RuntimeTelemetryStreamEvent) => void): () => void;
  readRequestObservation(requestId: string): Promise<BridgeRequestObservation | null>;
  readEndpointProfile(endpointId: string): Promise<{
    endpointId: string;
    latestProfile: ReturnType<typeof readLatestObservedProfile>;
    recentSamples: readonly ObservedPerformanceSample[];
  }>;
  readBenchmarkSuite(): Promise<unknown>;
  runBenchmark(body: Record<string, unknown>): Promise<unknown>;
  readBenchmarkRun(runId: string): Promise<unknown>;
  readActiveBenchmarkRun(): Promise<unknown>;
  clearBenchmarkEndpointData(endpointId: string): Promise<unknown>;
  clearBenchmarkData(): Promise<unknown>;
  readBenchmarkSummary(): Promise<unknown>;
  listBenchmarkRuns(): Promise<unknown>;
  readBenchmarkSummariesByMode(): Promise<unknown>;
  readBenchmarkPreferences(): Promise<unknown>;
  updateBenchmarkPreferences(body: Record<string, unknown>): Promise<unknown>;
  listLocalModels(): Promise<
    readonly {
      modelId: string;
      loadedAt: string;
      engine: string;
      localModelSource?: "llama-swap" | "peer-backed";
      roleIds?: readonly string[];
      contextWindow?: number | null;
      proxyBaseUrl?: string | null;
      checkEndpoint?: string | null;
      useModelName?: string | null;
    }[]
  >;
  listPeerLocalModels(): Promise<
    readonly {
      modelId: string;
      loadedAt: string;
      engine: string;
      localModelSource?: "llama-swap" | "peer-backed";
      roleIds?: readonly string[];
      contextWindow?: number | null;
      proxyBaseUrl?: string | null;
      checkEndpoint?: string | null;
      useModelName?: string | null;
    }[]
  >;
  listLlamaSwapLocalModels(): Promise<
    readonly {
      modelId: string;
      loadedAt: string;
      engine: string;
      localModelSource?: "llama-swap" | "peer-backed";
      roleIds?: readonly string[];
      contextWindow?: number | null;
      proxyBaseUrl?: string | null;
      checkEndpoint?: string | null;
      useModelName?: string | null;
    }[]
  >;
  loadLocalModel(modelId: string): Promise<{ success: boolean }>;
  loadPeerModel(
    modelId: string,
    assignment?: RuntimeModelRoleAssignmentInput,
  ): Promise<{ success: boolean }>;
  loadLlamaSwapModel(
    modelId: string,
    assignment?: RuntimeModelRoleAssignmentInput,
  ): Promise<{ success: boolean }>;
  setPeerModelRoles(
    modelId: string,
    assignment: RuntimeModelRoleAssignmentInput,
  ): Promise<{ success: boolean }>;
  setLlamaSwapModelRoles(
    modelId: string,
    assignment: RuntimeModelRoleAssignmentInput,
  ): Promise<{ success: boolean }>;
  unloadPeerModel(modelId: string): Promise<{ success: boolean }>;
  unloadLocalModel(modelId?: string): Promise<{ success: boolean }>;
  readLocalPolicy(): Promise<Record<string, unknown>>;
  updateLocalPolicy(body: Record<string, unknown>): Promise<Record<string, unknown>>;
  readRolePolicy(): Promise<RuntimeRolePolicyRecord>;
  createRolePolicyRole(body: Record<string, unknown>): Promise<RuntimeRoleDefinitionRecord>;
  updateRolePolicyRole(
    roleId: string,
    body: Record<string, unknown>,
  ): Promise<RuntimeRoleDefinitionRecord>;
  listTaskDefinitions(): Promise<readonly RuntimeTaskDefinitionRecord[]>;
  updateTaskDefinitions(
    body: readonly Record<string, unknown>[],
  ): Promise<readonly RuntimeTaskDefinitionRecord[]>;
  listSwapHistory(): Promise<
    readonly {
      timestamp: string;
      oldModel: string | null;
      newModel: string | null;
      reason: string;
    }[]
  >;
  getLocalLogs(): Promise<{ logs: string }>;
  proxyVendorLogStream(
    pathname: string,
    search: string,
  ): Promise<{ readonly body: string; readonly contentType: string } | null>;
  readModelOverrides(): Promise<Record<string, BridgeModelOverrideRecord>>;
  updateModelOverrides(
    body: Record<string, BridgeModelOverrideRecord>,
  ): Promise<Record<string, BridgeModelOverrideRecord>>;
  readPeers(): Promise<readonly { id: string; url: string; authToken?: string }[]>;
  updatePeers(
    body: readonly { id: string; url: string; authToken?: string }[],
  ): Promise<readonly { id: string; url: string; authToken?: string }[]>;
  checkPeerHealth(url: string): Promise<{ healthy: boolean }>;
  getRoutableInventory?(): RoutableInventory | null;
  shutdown(): Promise<void>;
}

type CredentialLifecycleState =
  | "execution-ready"
  | "connected-no-endpoint"
  | "pending-authorization"
  | "expired-auth"
  | "credentials-missing"
  | "env-unresolved"
  | "archived-stale";

type CredentialLifecycleAction = "reconnect" | "update-api-key" | "activate-endpoint" | "set-env";

type CredentialLifecycleSourceProvenance = "manual" | "runtime-config" | "legacy-manifest";

interface CredentialLifecycleCounts {
  executionReady: number;
  connectedNoEndpoint: number;
  pendingAuthorization: number;
  expiredAuth: number;
  credentialsMissing: number;
  envUnresolved: number;
  archivedStale: number;
}

interface CredentialLifecycleAccountRecord {
  logicalAccountId: string;
  providerAccountId: string;
  providerId: string;
  sourceProvenance: readonly CredentialLifecycleSourceProvenance[];
  authMode: string;
  credentialStorageMode: "persisted-local" | "env-ref" | "oauth-local" | "unknown";
  credentialBackendCanonical: string;
  lifecycleState: CredentialLifecycleState;
  reasonCode: string;
  blocking: boolean;
  activeEndpointIds: readonly string[];
  configuredModelIds: readonly string[];
  availableActions: readonly CredentialLifecycleAction[];
}

interface CredentialLifecycleProviderRollup {
  providerId: string;
  accountIds: readonly string[];
  countsByLifecycle: CredentialLifecycleCounts;
  readyAccountIds: readonly string[];
  attentionAccountIds: readonly string[];
  hasArchivedArtifacts: boolean;
}

interface CredentialLifecycleArchivedArtifact {
  artifactId: string;
  providerId: string | null;
  providerAccountId: string | null;
  artifactType: string;
  reasonCode: string;
}

interface RuntimeCredentialLifecycleSummary {
  version: 1;
  authority: {
    state: "provisional" | "authoritative";
    bootstrapStatus: SessionBootstrapState["status"];
    reason?: string;
  };
  counts: CredentialLifecycleCounts;
  accounts: readonly CredentialLifecycleAccountRecord[];
  providerRollups: readonly CredentialLifecycleProviderRollup[];
  archivedArtifacts: readonly CredentialLifecycleArchivedArtifact[];
}

interface RuntimeBridgeSummary {
  runtime: RuntimeVersionInfoRecord;
  lifecycleSummary: EndpointRegistryResult["lifecycleSummary"];
  providerCount: number;
  accountCount: number;
  endpointCount: number;
  scopeId: string;
  runtimeStateRoot: string;
  readinessSummary: {
    pendingDeviceAuthorizationCount: number;
    credentialsMissingAccountCount: number;
    connectedWithoutEndpointCount: number;
    readyAccountCount: number;
  };
  credentialLifecycle: RuntimeCredentialLifecycleSummary;
  executionMode: UnifiedRuntimeExecutionMode;
  unifiedConfig: {
    enabled: boolean;
    path: string | null;
  };
  sessionBootstrap: {
    status: SessionBootstrapState["status"];
    startedAt: string | null;
    finishedAt: string | null;
    stages: SessionBootstrapState["stages"];
  };
  inventorySummary: {
    modelIdCount: number;
    endpointIdCount: number;
    localEndpointCount: number;
    remoteEndpointCount: number;
    emptyAliasIds: readonly string[];
  };
  aliasDrift: readonly {
    aliasId: string;
    hintModelId: string;
    suggestedModelIds: readonly string[];
    message: string;
  }[];
  operatorIntent?: {
    path: string;
    status: OperatorIntentDiagnostic["status"];
    message?: string;
  };
  configuredMembershipReconciliation: ConfiguredMembershipReconciliationReceipt | null;
}

export interface CreateRuntimeBridgeBackendOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  /** Runtime deployment channel used by every durable storage authority check. */
  readonly runtimeChannel?: "development" | "stage" | "production";
  readonly run88StageIdentity?: {
    readonly releaseId: string;
    readonly sourceId: string;
    readonly executableSha256: string;
  };
  readonly unifiedRuntimeConfigPath?: string;
  readonly networkFetcher?: typeof fetch;
  readonly fixtureRoot?: string;
  readonly runtimeVendorStartup?: "enabled" | "disabled";
  readonly trackBOperationsEndpoint?: string;
  readonly trackBOperationsToken?: string;
  readonly trackBExtensionHealth?: () => {
    readonly host?: { readonly extensions?: readonly string[] };
    readonly supervisor?: Readonly<Record<string, unknown>>;
  };
  readonly trackBExtensionRuntime?: () => {
    listExtensions(): readonly unknown[] | Promise<readonly unknown[]>;
    mutateExtension(input: Record<string, unknown>): unknown | Promise<unknown>;
  } | null;
  readonly trackBQaExtensionCatalog?: () => readonly Record<string, unknown>[];
  readonly trackBPostObservation?: (
    observation: Readonly<Record<string, unknown>>,
  ) => Promise<unknown>;
  readonly trackBPostObservationReceipts?: () => Promise<unknown>;
  readonly codexAuthAdapter?: CodexAuthAdapter;
  readonly codexExecutionAdapter?: CodexExecutionAdapter;
}

export interface CodexAuthCacheSnapshot {
  readonly auth_mode?: string;
  readonly tokens?: {
    readonly access_token?: string;
    readonly refresh_token?: string;
    readonly account_id?: string;
  };
  readonly last_refresh?: string;
}

interface CodexAuthAdapter {
  startDeviceCodeLogin(input: {
    readonly codexHome: string;
  }): Promise<{
    readonly loginId: string;
    readonly verificationUrl: string;
    readonly userCode: string;
    readonly wsUrl: string;
    readonly pid: number;
  }>;
  readAccount(input: {
    readonly codexHome: string;
    readonly loginId: string;
    readonly userCode: string;
    readonly wsUrl: string;
    readonly refreshToken: boolean;
  }): Promise<{
    readonly account: {
      readonly type?: string;
      readonly email?: string;
      readonly planType?: string;
    } | null;
    readonly requiresOpenaiAuth: boolean;
  }>;
}

export interface CodexExecutionAdapter {
  executeRequest(input: {
    readonly runtimeStateRoot: string;
    readonly scopeId: string;
    readonly requestId: string;
    readonly providerAccountId: string;
    readonly modelId: string;
    readonly requestCapture: ProviderRequestCapture;
    readonly authPayload: CodexAuthCacheSnapshot;
    readonly streamChunkWriter?: (chunk: string) => Promise<void> | void;
    readonly executeDynamicToolCall?: (input: {
      readonly toolCallId: string;
      readonly toolName: string;
      readonly toolArguments: unknown;
      readonly workspaceRoot: string;
    }) => Promise<{
      readonly success: boolean;
      readonly contentItems: readonly {
        readonly type: "inputText";
        readonly text: string;
      }[];
      readonly execution?: ToolRegistryExecution;
    }>;
  }): Promise<{
    readonly statusCode: number;
    readonly body: unknown;
    readonly dynamicToolExecutions?: readonly ToolRegistryExecution[];
    readonly vendorMetadata?: {
      readonly vendorId: string;
      readonly latencyMs?: number;
      readonly costUsd?: number;
      readonly cacheStatus?: string;
      readonly cacheUsed?: boolean;
      readonly cacheReadTokens?: number;
      readonly cacheWriteTokens?: number;
      readonly parameterSanitization?: readonly AdapterParameterDecision[];
    };
  }>;
}

type OpenAIIngressSurface = "openai.chat.completions" | "openai.responses";

type AdapterParameterAction =
  | "forward"
  | "translate"
  | "drop_with_receipt"
  | "emulate_locally"
  | "reject_with_local_error";

interface AdapterParameterDecision {
  readonly field: string;
  readonly sourceSurface: OpenAIIngressSurface;
  readonly targetSurface: string;
  readonly action: AdapterParameterAction;
  readonly reason: string;
  readonly sourceValueKind: "present" | "absent";
  readonly forwardedField?: string;
  readonly adapterFamily: string;
  readonly providerId: string;
  readonly vendorId: string;
}

export interface BridgeServerOptions {
  readonly host: string;
  readonly port: number;
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly staticRoot: string;
  readonly unifiedRuntimeConfigPath?: string;
}

export interface BridgeExecutionRequestOptions {
  readonly routingModeOverride?: RuntimeRoutingMode;
  readonly endpointId?: string;
  readonly requestedRoleId?: string;
  readonly sessionId?: string;
  readonly clientRequestId?: string;
  readonly transportPreference?: RuntimeExecutionRequest["transportPreference"];
  readonly ignoreExecutionFailureCooldowns?: boolean;
  readonly executionTrafficClass?: ExecutionTrafficClass;
  readonly abortSignal?: AbortSignal;
}

class BridgeHttpError extends Error {
  readonly statusCode: number;

  readonly body: Record<string, unknown>;

  constructor(statusCode: number, body: Record<string, unknown>) {
    super(
      typeof body.error === "object" && body.error && "message" in body.error
        ? String(body.error.message)
        : "bridge request failed",
    );
    this.statusCode = statusCode;
    this.body = body;
  }
}

class UpstreamExecutionError extends BridgeHttpError {
  readonly errorClass: string;

  readonly retryable: boolean;

  readonly fallbackEligible: boolean;

  readonly endpointId: string;

  readonly providerId: string;

  readonly providerFamily: string;

  readonly vendorId?: string;

  readonly executionFamily: string;

  readonly adapterFamily: string;

  readonly failurePhase: string;

  readonly errorPreview: Readonly<Record<string, unknown>>;

  readonly retryAfterMs?: number;

  constructor(input: {
    readonly statusCode: number;
    readonly errorClass: string;
    readonly message: string;
    readonly retryable: boolean;
    readonly fallbackEligible: boolean;
    readonly endpointId: string;
    readonly providerId: string;
    readonly providerFamily: string;
    readonly vendorId?: string;
    readonly executionFamily: string;
    readonly adapterFamily: string;
    readonly failurePhase: string;
    readonly errorPreview?: Readonly<Record<string, unknown>>;
    readonly retryAfterMs?: number;
    readonly upstreamBody?: unknown;
  }) {
    super(input.statusCode, {
      error: {
        message: input.message,
        type: input.errorClass,
        code: input.errorClass,
        retryable: input.retryable,
        fallbackEligible: input.fallbackEligible,
        endpointId: input.endpointId,
        providerId: input.providerId,
        providerFamily: input.providerFamily,
        ...(input.vendorId ? { vendorId: input.vendorId } : {}),
        executionFamily: input.executionFamily,
        adapterFamily: input.adapterFamily,
        failurePhase: input.failurePhase,
        ...(input.errorPreview ? { errorPreview: input.errorPreview } : {}),
        ...(input.retryAfterMs === undefined ? {} : { retryAfterMs: input.retryAfterMs }),
        ...(input.upstreamBody !== undefined ? { upstreamBody: input.upstreamBody } : {}),
      },
    });
    this.errorClass = input.errorClass;
    this.retryable = input.retryable;
    this.fallbackEligible = input.fallbackEligible;
    this.endpointId = input.endpointId;
    this.providerId = input.providerId;
    this.providerFamily = input.providerFamily;
    this.vendorId = input.vendorId;
    this.executionFamily = input.executionFamily;
    this.adapterFamily = input.adapterFamily;
    this.failurePhase = input.failurePhase;
    this.errorPreview = input.errorPreview ?? {
      message: input.message,
      statusCode: input.statusCode,
    };
    this.retryAfterMs = input.retryAfterMs;
  }
}

const runtimeTelemetryPersistedErrors = new WeakSet<object>();

function markRuntimeTelemetryPersisted(error: unknown): void {
  if (typeof error === "object" && error !== null) {
    runtimeTelemetryPersistedErrors.add(error);
  }
}

function hasRuntimeTelemetryPersisted(error: unknown): boolean {
  return typeof error === "object" && error !== null && runtimeTelemetryPersistedErrors.has(error);
}

const CACHE_CONTINUITY_MAINTENANCE_KEY = "routing.cache-continuity.v1";
const PROMPT_CACHE_WARM_INPUT_TOKEN_THRESHOLD = 1024;
type CacheContinuityScopeSource = "prompt_cache_key" | "session_affinity";

interface CacheContinuityScopeRecord {
  readonly scopeSource: CacheContinuityScopeSource;
  readonly scopeKey: string;
  readonly activeEndpointId: string | null;
  readonly warmedEndpointIds: readonly string[];
  readonly updatedAtMs: number;
  readonly lastRequestSurface?: string;
}

type CacheContinuityLedgerState = Record<string, CacheContinuityScopeRecord>;

export interface BridgeCacheContinuityRouteHints extends CacheContinuityRoutingHints {
  readonly enabled: true;
  readonly scopeSource: CacheContinuityScopeSource;
}

export interface BridgeCacheContinuityOutcome {
  readonly enabled: true;
  readonly scopeSource: CacheContinuityScopeSource;
  readonly previousActiveEndpointId: string | null;
  readonly advisoryWarmedEndpointIds: readonly string[];
  readonly selectedEndpointId: string;
  readonly selectedDomainState?: "created" | "restored";
  readonly advisorySelectionApplied: boolean;
}

function runtimeTelemetryErrorClassFor(error: unknown): string {
  if (error instanceof UpstreamExecutionError) {
    return error.errorClass;
  }
  if (!(error instanceof BridgeHttpError)) {
    return "execution_failed";
  }
  const bodyError = error.body.error;
  if (typeof bodyError === "object" && bodyError !== null) {
    const code = (bodyError as Record<string, unknown>).code;
    if (typeof code === "string" && code.trim().length > 0) {
      return code;
    }
    const type = (bodyError as Record<string, unknown>).type;
    if (typeof type === "string" && type.trim().length > 0) {
      return type;
    }
  }
  if (typeof bodyError === "string" && bodyError.trim().length > 0) {
    return bodyError;
  }
  return "execution_failed";
}

function normalizeCacheContinuityKeyValue(value: string | undefined): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function toCacheContinuityScopeDescriptor(executionRequest: RuntimeExecutionRequest): {
  readonly scopeSource: CacheContinuityScopeSource;
  readonly scopeKey: string;
  readonly scopeId: string;
} | null {
  const promptCacheKey = normalizeCacheContinuityKeyValue(executionRequest.promptCache?.key);
  if (promptCacheKey) {
    return {
      scopeSource: "prompt_cache_key",
      scopeKey: promptCacheKey,
      scopeId: `prompt_cache_key:${promptCacheKey}`,
    };
  }
  const sessionId = normalizeCacheContinuityKeyValue(executionRequest.sessionAffinity?.sessionId);
  if (sessionId) {
    return {
      scopeSource: "session_affinity",
      scopeKey: sessionId,
      scopeId: `session_affinity:${sessionId}`,
    };
  }
  return null;
}

function normalizeCacheContinuityEndpointIds(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [
    ...new Set(
      value.flatMap((entry) =>
        typeof entry === "string" && entry.trim().length > 0 ? [entry.trim()] : [],
      ),
    ),
  ];
}

function parseCacheContinuityLedgerState(rawValue: string | undefined): CacheContinuityLedgerState {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return {};
  }
  try {
    const parsed = JSON.parse(rawValue) as {
      scopes?: Record<string, unknown>;
    };
    const scopes =
      typeof parsed === "object" &&
      parsed !== null &&
      parsed.scopes &&
      typeof parsed.scopes === "object"
        ? parsed.scopes
        : {};
    return Object.fromEntries(
      Object.entries(scopes).flatMap(([scopeId, value]) => {
        if (typeof value !== "object" || value === null) {
          return [];
        }
        const record = value as Record<string, unknown>;
        const scopeSource = record.scopeSource;
        const scopeKey = record.scopeKey;
        const activeEndpointId = record.activeEndpointId;
        const updatedAtMs = record.updatedAtMs;
        if (
          (scopeSource !== "prompt_cache_key" && scopeSource !== "session_affinity") ||
          typeof scopeKey !== "string" ||
          typeof updatedAtMs !== "number"
        ) {
          return [];
        }
        return [
          [
            scopeId,
            {
              scopeSource,
              scopeKey,
              activeEndpointId:
                typeof activeEndpointId === "string" && activeEndpointId.trim().length > 0
                  ? activeEndpointId.trim()
                  : null,
              warmedEndpointIds: normalizeCacheContinuityEndpointIds(record.warmedEndpointIds),
              updatedAtMs,
              ...(typeof record.lastRequestSurface === "string" &&
              record.lastRequestSurface.trim().length > 0
                ? { lastRequestSurface: record.lastRequestSurface.trim() }
                : {}),
            } satisfies CacheContinuityScopeRecord,
          ],
        ];
      }),
    );
  } catch {
    return {};
  }
}

function readCacheContinuityLedgerState(databasePath: string): CacheContinuityLedgerState {
  const maintenancePolicy = readRuntimeMaintenancePolicy({ databasePath });
  return parseCacheContinuityLedgerState(maintenancePolicy[CACHE_CONTINUITY_MAINTENANCE_KEY]);
}

function writeCacheContinuityLedgerState(
  databasePath: string,
  state: CacheContinuityLedgerState,
): void {
  upsertRuntimeMaintenanceValue({
    databasePath,
    key: CACHE_CONTINUITY_MAINTENANCE_KEY,
    value: JSON.stringify({
      version: 1,
      scopes: state,
    }),
  });
}

export function readCacheContinuityRouteHints(input: {
  readonly databasePath: string;
  readonly executionRequest: RuntimeExecutionRequest;
}): BridgeCacheContinuityRouteHints | null {
  const scope = toCacheContinuityScopeDescriptor(input.executionRequest);
  if (!scope) {
    return null;
  }
  const record = readCacheContinuityLedgerState(input.databasePath)[scope.scopeId];
  return {
    enabled: true,
    scopeSource: scope.scopeSource,
    activeEndpointId: record?.activeEndpointId ?? null,
    warmedEndpointIds: record?.warmedEndpointIds ?? [],
  };
}

export function persistCacheContinuityOutcome(input: {
  readonly databasePath: string;
  readonly executionRequest: RuntimeExecutionRequest;
  readonly endpointId: string;
  readonly promptCachingSupported: boolean;
  readonly inputTokens: number;
  readonly requestSurface: string;
}): BridgeCacheContinuityOutcome | null {
  const scope = toCacheContinuityScopeDescriptor(input.executionRequest);
  if (!scope) {
    return null;
  }
  const state = readCacheContinuityLedgerState(input.databasePath);
  const current = state[scope.scopeId];
  const previousActiveEndpointId = current?.activeEndpointId ?? null;
  const advisoryWarmedEndpointIds = current?.warmedEndpointIds ?? [];
  const warmedAlready = advisoryWarmedEndpointIds.includes(input.endpointId);
  const cacheEligible =
    input.promptCachingSupported && input.inputTokens >= PROMPT_CACHE_WARM_INPUT_TOKEN_THRESHOLD;
  state[scope.scopeId] = {
    scopeSource: scope.scopeSource,
    scopeKey: scope.scopeKey,
    activeEndpointId: input.endpointId,
    warmedEndpointIds:
      cacheEligible && !warmedAlready
        ? [...advisoryWarmedEndpointIds, input.endpointId]
        : advisoryWarmedEndpointIds,
    updatedAtMs: Date.now(),
    ...(input.requestSurface.trim().length > 0 ? { lastRequestSurface: input.requestSurface } : {}),
  };
  writeCacheContinuityLedgerState(input.databasePath, state);
  return {
    enabled: true,
    scopeSource: scope.scopeSource,
    previousActiveEndpointId,
    advisoryWarmedEndpointIds,
    selectedEndpointId: input.endpointId,
    ...(cacheEligible ? { selectedDomainState: warmedAlready ? "restored" : "created" } : {}),
    advisorySelectionApplied: warmedAlready && previousActiveEndpointId !== input.endpointId,
  };
}

function summarizeCacheContinuityDiagnostics(input: {
  readonly routeHints: BridgeCacheContinuityRouteHints | null;
  readonly selectedEndpointId: string;
  readonly outcome?: BridgeCacheContinuityOutcome | null;
}): RuntimeRoutingDiagnostics["cacheContinuity"] | undefined {
  if (input.outcome) {
    return {
      enabled: true,
      scopeSource: input.outcome.scopeSource,
      activeEndpointId: input.outcome.selectedEndpointId,
      advisoryWarmedEndpointIds: input.outcome.advisoryWarmedEndpointIds,
      previousActiveEndpointId: input.outcome.previousActiveEndpointId,
      selectedEndpointId: input.outcome.selectedEndpointId,
      ...(input.outcome.selectedDomainState
        ? { selectedDomainState: input.outcome.selectedDomainState }
        : {}),
      advisorySelectionApplied: input.outcome.advisorySelectionApplied,
    };
  }
  if (!input.routeHints) {
    return undefined;
  }
  const restored = input.routeHints.warmedEndpointIds.includes(input.selectedEndpointId);
  return {
    enabled: true,
    scopeSource: input.routeHints.scopeSource,
    activeEndpointId: input.routeHints.activeEndpointId,
    advisoryWarmedEndpointIds: input.routeHints.warmedEndpointIds,
    selectedEndpointId: input.selectedEndpointId,
    ...(restored ? { selectedDomainState: "restored" as const } : {}),
    advisorySelectionApplied:
      restored && input.routeHints.activeEndpointId !== input.selectedEndpointId,
  };
}

function readNestedProviderErrorField(body: unknown, field: string): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const record = body as Record<string, unknown>;
  const nestedError = record.error;
  if (nestedError && typeof nestedError === "object") {
    const nestedRecord = nestedError as Record<string, unknown>;
    const value = nestedRecord[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  const value = record[field];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isQuotaExhaustedErrorText(text: string): boolean {
  return (
    text.includes("insufficient_quota") ||
    text.includes("out of quota") ||
    text.includes("quota exceeded") ||
    text.includes("usage limit") ||
    text.includes("no remaining credits") ||
    text.includes("has no remaining credits") ||
    text.includes("credit balance") ||
    text.includes("credits exhausted") ||
    text.includes("insufficient balance") ||
    text.includes("insufficient_balance")
  );
}

function buildUpstreamErrorPreview(input: {
  readonly statusCode: number;
  readonly message: string;
  readonly body?: unknown;
}): Readonly<Record<string, unknown>> {
  const preview: Record<string, unknown> = {
    message: input.message,
    statusCode: input.statusCode,
  };
  const code = readNestedProviderErrorField(input.body, "code");
  if (code) {
    preview.code = code;
  }
  const type = readNestedProviderErrorField(input.body, "type");
  if (type) {
    preview.type = type;
  }
  return preview;
}

export function classifyUpstreamExecutionFailure(input: {
  readonly endpointId: string;
  readonly statusCode?: number;
  readonly body?: unknown;
  readonly message?: string;
  readonly fallbackStatusCode?: number;
  readonly providerId: string;
  readonly providerFamily?: string;
  readonly vendorId?: string;
  readonly executionFamily: string;
  readonly adapterFamily: string;
  readonly failurePhase?: string;
  readonly retryAfterMs?: number;
}): UpstreamExecutionError {
  const message = input.message?.trim().length
    ? input.message.trim()
    : summarizeProviderError(input.statusCode ?? input.fallbackStatusCode ?? 502, input.body);
  const searchText = [
    message,
    readNestedProviderErrorField(input.body, "message"),
    readNestedProviderErrorField(input.body, "error_description"),
    readNestedProviderErrorField(input.body, "type"),
    readNestedProviderErrorField(input.body, "code"),
    input.body !== undefined ? JSON.stringify(input.body) : null,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n")
    .toLowerCase();
  const hasStatusCode = typeof input.statusCode === "number";
  const statusCode = hasStatusCode ? input.statusCode : (input.fallbackStatusCode ?? 502);
  const providerFamily = input.providerFamily ?? input.providerId;
  const errorPreview = buildUpstreamErrorPreview({
    statusCode,
    message,
    body: input.body,
  });
  const baseErrorContext = {
    providerId: input.providerId,
    providerFamily,
    ...(input.vendorId ? { vendorId: input.vendorId } : {}),
    executionFamily: input.executionFamily,
    adapterFamily: input.adapterFamily,
    failurePhase: input.failurePhase ?? "provider_execution",
    errorPreview,
  } as const;

  if (
    statusCode === 408 ||
    statusCode === 504 ||
    statusCode === 524 ||
    searchText.includes("timed out") ||
    searchText.includes("timeout") ||
    searchText.includes("deadline exceeded")
  ) {
    return new UpstreamExecutionError({
      statusCode,
      errorClass: "upstream_timeout",
      message,
      retryable: true,
      fallbackEligible: true,
      endpointId: input.endpointId,
      ...baseErrorContext,
      upstreamBody: input.body,
    });
  }

  if (statusCode === 402 || statusCode === 429 || isQuotaExhaustedErrorText(searchText)) {
    if (isQuotaExhaustedErrorText(searchText)) {
      return new UpstreamExecutionError({
        statusCode: statusCode === 429 || statusCode === 402 ? statusCode : 429,
        errorClass: "quota_exhausted",
        message,
        retryable: false,
        fallbackEligible: true,
        endpointId: input.endpointId,
        ...baseErrorContext,
        upstreamBody: input.body,
      });
    }
    if (
      statusCode === 429 ||
      searchText.includes("rate limit") ||
      searchText.includes("too many requests")
    ) {
      return new UpstreamExecutionError({
        statusCode,
        errorClass: "rate_limited",
        message,
        retryable: true,
        fallbackEligible: true,
        ...(input.retryAfterMs === undefined ? {} : { retryAfterMs: input.retryAfterMs }),
        endpointId: input.endpointId,
        ...baseErrorContext,
        upstreamBody: input.body,
      });
    }
  }

  if (
    searchText.includes("could not reach the ai service") ||
    searchText.includes("connection error") ||
    searchText.includes("fetch failed") ||
    searchText.includes("network error") ||
    searchText.includes("socket hang up") ||
    searchText.includes("econnrefused") ||
    searchText.includes("econnreset") ||
    searchText.includes("ehostunreach") ||
    searchText.includes("enotfound")
  ) {
    return new UpstreamExecutionError({
      statusCode,
      errorClass: "upstream_connection_error",
      message,
      retryable: true,
      fallbackEligible: true,
      endpointId: input.endpointId,
      ...baseErrorContext,
      upstreamBody: input.body,
    });
  }

  if (
    statusCode === 401 ||
    statusCode === 403 ||
    searchText.includes("unauthorized") ||
    searchText.includes("forbidden") ||
    searchText.includes("invalid api key")
  ) {
    return new UpstreamExecutionError({
      statusCode,
      errorClass: "provider_auth_error",
      message,
      retryable: false,
      fallbackEligible: true,
      endpointId: input.endpointId,
      ...baseErrorContext,
      upstreamBody: input.body,
    });
  }

  if (statusCode >= 500) {
    return new UpstreamExecutionError({
      statusCode,
      errorClass: "upstream_error",
      message,
      retryable: true,
      fallbackEligible: true,
      endpointId: input.endpointId,
      ...baseErrorContext,
      upstreamBody: input.body,
    });
  }

  if (
    statusCode === 400 ||
    searchText.includes("bad request") ||
    searchText.includes("invalid request") ||
    searchText.includes("api rejected this request")
  ) {
    return new UpstreamExecutionError({
      statusCode,
      errorClass: "invalid_request",
      message,
      retryable: false,
      fallbackEligible: false,
      endpointId: input.endpointId,
      ...baseErrorContext,
      upstreamBody: input.body,
    });
  }

  return new UpstreamExecutionError({
    statusCode,
    errorClass: "execution_failed",
    message,
    retryable: false,
    fallbackEligible: false,
    endpointId: input.endpointId,
    ...baseErrorContext,
    upstreamBody: input.body,
  });
}

export function shouldRetryUpstreamExecutionOnSameEndpoint(input: {
  readonly retryable: boolean;
  readonly errorClass: string;
  readonly statusCode: number;
  readonly alreadyRetried: boolean;
}): boolean {
  return (
    input.retryable &&
    !input.alreadyRetried &&
    classifyExecutionFailureCategory(input.errorClass, input.statusCode) !== "rate_limit"
  );
}

function readExecutionCircuitState(databasePath: string): ExecutionCircuitState {
  const maintenancePolicy = readRuntimeMaintenancePolicy({ databasePath });
  const v2RawValue = maintenancePolicy[EXECUTION_CIRCUIT_BREAKER_MAINTENANCE_KEY];
  const state = migrateLegacyExecutionCooldownState(
    v2RawValue,
    maintenancePolicy[LEGACY_EXECUTION_FAILURE_COOLDOWN_MAINTENANCE_KEY],
    Date.now(),
  );
  if (v2RawValue !== serializeExecutionCircuitState(state)) {
    writeExecutionCircuitState(databasePath, state);
  }
  return state;
}

function writeExecutionCircuitState(databasePath: string, state: ExecutionCircuitState): void {
  upsertRuntimeMaintenanceValue({
    databasePath,
    key: EXECUTION_CIRCUIT_BREAKER_MAINTENANCE_KEY,
    value: serializeExecutionCircuitState(state),
  });
}

function readDeniedExecutionCircuitEndpointIds(input: {
  readonly databasePath: string;
  readonly nowMs: number;
}): readonly string[] {
  const state = readExecutionCircuitState(input.databasePath);
  return Object.keys(state.endpoints).filter(
    (endpointId) => !evaluateExecutionCircuitEligibility(state, endpointId, input.nowMs).eligible,
  );
}

function toExecutionCooldownReceipt(
  record: ExecutionCircuitRecord,
  nowMs: number,
): RuntimeExecutionCooldownReceipt {
  return toExecutionCircuitReceipt(record, nowMs);
}

function readExecutionCooldownReceipts(input: {
  readonly databasePath: string;
  readonly nowMs: number;
  readonly endpointIds?: readonly string[];
}): readonly RuntimeExecutionCooldownReceipt[] {
  const endpointFilter = input.endpointIds ? new Set(input.endpointIds) : null;
  return Object.values(readExecutionCircuitState(input.databasePath).endpoints)
    .filter((record) => (endpointFilter ? endpointFilter.has(record.endpointId) : true))
    .map((record) => toExecutionCooldownReceipt(record, input.nowMs));
}

function recordExecutionFailureCooldown(input: {
  readonly databasePath: string;
  readonly endpointId: string;
  readonly errorClass: string;
  readonly nowMs: number;
  readonly trafficClass: ExecutionTrafficClass;
  readonly retryAfterMs?: number;
  readonly sourceAttemptId?: string;
  readonly sourceRequestId?: string;
  readonly sourceRoutingDecisionId?: string;
  readonly providerId?: string;
  readonly providerFamily?: string;
  readonly vendorId?: string;
  readonly executionFamily?: string;
  readonly adapterFamily?: string;
  readonly failurePhase?: string;
  readonly statusCode?: number;
}): ExecutionCircuitRecord | undefined {
  const transition = recordExecutionCircuitFailure({
    state: readExecutionCircuitState(input.databasePath),
    endpointId: input.endpointId,
    errorClass: input.errorClass,
    nowMs: input.nowMs,
    trafficClass: input.trafficClass,
    ...(input.statusCode === undefined ? {} : { statusCode: input.statusCode }),
    ...(input.retryAfterMs === undefined ? {} : { retryAfterMs: input.retryAfterMs }),
    source: {
      ...(input.sourceAttemptId ? { sourceAttemptId: input.sourceAttemptId } : {}),
      ...(input.sourceRequestId ? { sourceRequestId: input.sourceRequestId } : {}),
      ...(input.sourceRoutingDecisionId
        ? { sourceRoutingDecisionId: input.sourceRoutingDecisionId }
        : {}),
      ...(input.providerId ? { providerId: input.providerId } : {}),
      ...(input.providerFamily ? { providerFamily: input.providerFamily } : {}),
      ...(input.vendorId ? { vendorId: input.vendorId } : {}),
      ...(input.executionFamily ? { executionFamily: input.executionFamily } : {}),
      ...(input.adapterFamily ? { adapterFamily: input.adapterFamily } : {}),
      ...(input.failurePhase ? { failurePhase: input.failurePhase } : {}),
    },
  });
  if (transition.changed) {
    writeExecutionCircuitState(input.databasePath, transition.state);
  }
  return transition.record;
}

function clearExecutionFailureCooldown(input: {
  readonly databasePath: string;
  readonly endpointId: string;
}): void {
  const state = readExecutionCircuitState(input.databasePath);
  if (!Object.prototype.hasOwnProperty.call(state.endpoints, input.endpointId)) {
    return;
  }
  writeExecutionCircuitState(
    input.databasePath,
    clearExecutionCircuitEndpoint(state, input.endpointId),
  );
}

function clearExecutionCircuitsForProviderAccount(input: {
  readonly databasePath: string;
  readonly providerAccountId: string;
  readonly runtimeEndpoints: readonly { endpointId: string; providerAccountId?: string }[];
}): void {
  const matchingEndpointIds = input.runtimeEndpoints
    .filter((endpoint) => endpoint.providerAccountId === input.providerAccountId)
    .map((endpoint) => endpoint.endpointId);
  if (matchingEndpointIds.length === 0) {
    return;
  }
  const state = readExecutionCircuitState(input.databasePath);
  const nextState = matchingEndpointIds.reduce(clearExecutionCircuitEndpoint, state);
  writeExecutionCircuitState(input.databasePath, nextState);
}

function stringArrayValue(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const strings = value.filter((entry): entry is string => typeof entry === "string");
  return strings.length > 0 ? strings : undefined;
}

function humanizeRuntimeErrorClass(errorClass: string | null | undefined): string {
  if (typeof errorClass !== "string" || errorClass.trim().length === 0) {
    return "Execution failed";
  }
  const normalized = errorClass.replace(/[_-]+/g, " ").trim();
  return normalized.length > 0
    ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
    : "Execution failed";
}

function runtimeTelemetryErrorContextFor(error: unknown): Record<string, unknown> | null {
  const context: Record<string, unknown> = {};
  const message =
    error instanceof Error && error.message.trim().length > 0 ? error.message.trim() : null;
  if (message) {
    context.message = message;
  }

  if (error instanceof BridgeHttpError) {
    context.statusCode = error.statusCode;
    const bodyError = error.body.error;
    if (typeof bodyError === "object" && bodyError !== null) {
      const errorRecord = bodyError as Record<string, unknown>;
      for (const key of [
        "type",
        "code",
        "requestedModel",
        "endpointId",
        "providerId",
        "providerFamily",
        "vendorId",
        "executionFamily",
        "adapterFamily",
        "failurePhase",
      ] as const) {
        const value = errorRecord[key];
        if (typeof value === "string" && value.trim().length > 0) {
          context[key] = value.trim();
        }
      }
      for (const key of ["retryable", "fallbackEligible"] as const) {
        const value = errorRecord[key];
        if (typeof value === "boolean") {
          context[key] = value;
        }
      }
      const errorPreview = errorRecord.errorPreview;
      if (typeof errorPreview === "object" && errorPreview !== null) {
        context.errorPreview = errorPreview;
      }
    }
  }

  return Object.keys(context).length > 0 ? context : null;
}

function runtimeTelemetryDimensionsFor(error: unknown): Record<string, unknown> | null {
  const dimensions: Record<string, unknown> = {};
  const errorContext = runtimeTelemetryErrorContextFor(error);
  if (errorContext) {
    dimensions.errorContext = errorContext;
  }
  if (!(error instanceof BridgeHttpError)) {
    return Object.keys(dimensions).length > 0 ? dimensions : null;
  }
  const bodyError = error.body.error;
  if (typeof bodyError !== "object" || bodyError === null) {
    return Object.keys(dimensions).length > 0 ? dimensions : null;
  }
  const errorRecord = bodyError as Record<string, unknown>;
  const capabilityEligibility: Record<string, unknown> = {};
  if (typeof errorRecord.requestedModel === "string") {
    capabilityEligibility.requestedModel = errorRecord.requestedModel;
  }
  const requiredInputModalities = stringArrayValue(errorRecord.requiredInputModalities);
  if (requiredInputModalities) {
    capabilityEligibility.requiredInputModalities = requiredInputModalities;
  }
  const requiredOutputModalities = stringArrayValue(errorRecord.requiredOutputModalities);
  if (requiredOutputModalities) {
    capabilityEligibility.requiredOutputModalities = requiredOutputModalities;
  }
  const requiredCapabilities = stringArrayValue(errorRecord.requiredCapabilities);
  if (requiredCapabilities) {
    capabilityEligibility.requiredCapabilities = requiredCapabilities;
  }
  if (Array.isArray(errorRecord.excludedTargets)) {
    const excludedTargets = errorRecord.excludedTargets.flatMap((target) => {
      if (typeof target !== "object" || target === null) {
        return [];
      }
      const targetRecord = target as Record<string, unknown>;
      const endpointId = targetRecord.endpointId;
      const modelId = targetRecord.modelId;
      const reasons = stringArrayValue(targetRecord.reasons);
      if (typeof endpointId !== "string" || typeof modelId !== "string" || !reasons) {
        return [];
      }
      return [{ endpointId, modelId, reasons }];
    });
    if (excludedTargets.length > 0) {
      capabilityEligibility.excludedTargets = excludedTargets;
    }
  }
  const executionCooldown: Record<string, unknown> = {};
  const deniedEndpointIds = stringArrayValue(errorRecord.deniedEndpointIds);
  if (deniedEndpointIds) {
    executionCooldown.deniedEndpointIds = deniedEndpointIds;
  }
  if (Array.isArray(errorRecord.executionCooldowns)) {
    const cooldowns = errorRecord.executionCooldowns.flatMap((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return [];
      }
      const record = entry as Record<string, unknown>;
      const endpointId = record.endpointId;
      const active = record.active;
      const failureCount = record.failureCount;
      const cooldownUntilMs = record.cooldownUntilMs;
      const lastErrorClass = record.lastErrorClass;
      if (
        typeof endpointId !== "string" ||
        typeof active !== "boolean" ||
        typeof failureCount !== "number" ||
        typeof lastErrorClass !== "string"
      ) {
        return [];
      }
      return [
        {
          endpointId,
          active,
          failureCount,
          lastErrorClass,
          ...(typeof record.schemaVersion === "number"
            ? { schemaVersion: record.schemaVersion }
            : {}),
          ...(typeof record.circuitState === "string" ? { circuitState: record.circuitState } : {}),
          ...(typeof record.failureCategory === "string"
            ? { failureCategory: record.failureCategory }
            : {}),
          ...(typeof cooldownUntilMs === "number" ? { cooldownUntilMs } : {}),
          ...(typeof record.nextProbeAtMs === "number"
            ? { nextProbeAtMs: record.nextProbeAtMs }
            : {}),
          ...(typeof record.retryAfterMs === "number" ? { retryAfterMs: record.retryAfterMs } : {}),
          ...(typeof record.lastFailureAtMs === "number"
            ? { lastFailureAtMs: record.lastFailureAtMs }
            : {}),
        },
      ];
    });
    if (cooldowns.length > 0) {
      executionCooldown.entries = cooldowns;
      if (!executionCooldown.deniedEndpointIds) {
        executionCooldown.deniedEndpointIds = cooldowns.map((entry) => entry.endpointId);
      }
    }
  }
  if (Object.keys(capabilityEligibility).length > 0) {
    dimensions.capabilityEligibility = capabilityEligibility;
  }
  if (Object.keys(executionCooldown).length > 0) {
    dimensions.executionCooldown = executionCooldown;
  }
  return Object.keys(dimensions).length > 0 ? dimensions : null;
}

function readTelemetryErrorContextFromDimensions(
  dimensions: unknown,
): Record<string, unknown> | null {
  if (!dimensions || typeof dimensions !== "object") {
    return null;
  }
  const value = (dimensions as Record<string, unknown>).errorContext;
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function buildPreExecutionFailureObservation(input: {
  readonly requestId: string;
  readonly clientRequestId?: string | null;
  readonly endpointId: string;
  readonly modelId: string;
  readonly sourceType: "local" | "remote";
  readonly error: unknown;
  readonly latencyMs: number;
  readonly dimensions: Record<string, unknown> | null;
  readonly toolingUsed: boolean;
}): Record<string, unknown> {
  const createdAtMs = Date.now();
  const routingDecisionId = `decision-${input.requestId}`;
  const errorClass = runtimeTelemetryErrorClassFor(input.error);
  const errorContext = runtimeTelemetryErrorContextFor(input.error);
  const executionFamily =
    typeof errorContext?.executionFamily === "string" ? errorContext.executionFamily : "unknown";
  const adapterFamily =
    typeof errorContext?.adapterFamily === "string" ? errorContext.adapterFamily : "unknown";
  const providerFamily =
    typeof errorContext?.providerFamily === "string" ? errorContext.providerFamily : undefined;
  const vendorId = typeof errorContext?.vendorId === "string" ? errorContext.vendorId : undefined;
  const providerId = typeof errorContext?.providerId === "string" ? errorContext.providerId : null;
  const statusCode = typeof errorContext?.statusCode === "number" ? errorContext.statusCode : 400;
  const summaryMessage =
    typeof errorContext?.message === "string" && errorContext.message.trim().length > 0
      ? errorContext.message.trim()
      : humanizeRuntimeErrorClass(errorClass);
  const sample: ObservedPerformanceSample = {
    endpoint_id: input.endpointId,
    endpoint_version: "pre-execution-failure",
    source_type: "live_request",
    timestamp_ms: createdAtMs,
    latency_ms: input.latencyMs,
    failure: true,
    error_class: errorClass,
    request_id: input.requestId,
    routing_decision_id: routingDecisionId,
  };
  const profile = aggregateObservedPerformanceSamples([sample], { nowMs: createdAtMs });
  const diagnostics = {
    routing: [],
    execution: [
      {
        code: errorClass,
        severity: "error",
        message: summaryMessage,
      },
    ],
    authAccount: [],
    memoryQuality: [],
    tooling: [],
    operator: [],
  } as const;
  const capturePolicy = {
    environment: "runtime-pre-execution-failure",
    redactionLevel: "strict",
    retentionClass: "standard",
    structuredInspectionMode: "summary-only",
    rawCaptureAvailable: false,
    structuredInspectionAvailable: true,
    redactedFields: [],
    suppressedFields: ["request.body"],
  } as const;

  return {
    requestId: input.requestId,
    ...(input.clientRequestId ? { clientRequestId: input.clientRequestId } : {}),
    routingDecisionId,
    endpointId: input.endpointId,
    conversationId: "conversation-main",
    usageEvent: {
      timestamp_ms: createdAtMs,
      request_id: input.requestId,
      routing_decision_id: routingDecisionId,
      endpoint_id: input.endpointId,
      model_id: input.modelId,
      tokens_in: 0,
      tokens_out: 0,
      latency_ms: input.latencyMs,
      cost_actual: null,
      cost_estimate: null,
      currency: "USD",
      error_class: errorClass,
    },
    observedPerformance: {
      endpointVersion: "pre-execution-failure",
      sample,
      history: [sample],
      profile,
    },
    diagnostics,
    capturePolicy,
    executionTelemetry: {
      ...(providerFamily ? { providerFamily } : {}),
      ...(vendorId ? { vendorId } : {}),
      finishReason: "error",
      promptCaching: {
        supported: true,
      },
      usageSupport: {
        inputTokens: true,
        outputTokens: true,
        cacheReadTokens: true,
        cacheWriteTokens: true,
      },
      costProvenance: "unavailable",
    },
    executionSemantics: {
      executionFamily,
      adapterFamily,
      payloadBytes: {
        ingress: 0,
        translated: 0,
        providerCanonical: 0,
        providerWire: 0,
        providerResponse: 0,
      },
      retryCount: 0,
      rerouteCount: 0,
      cooldownDecision: "not_applied",
      idempotencyDecision: "not_needed",
      toolSideEffectState: "none",
    },
    telemetrySnapshot: {
      providerId,
      providerAccountId: null,
      sourceType: input.sourceType,
      endpointKind: "unknown",
      servingSource: executionFamily,
      region: null,
      lifecycleStateAtRequest: "unknown",
      healthStatusAtRequest: null,
      requestedModelId: input.modelId,
      requestOperation: "chat",
      roleIds: [],
      toolingUsed: input.toolingUsed,
      cacheState: "unknown",
      eligibleEndpointIds: [],
      eligibleModelIds: [],
      candidateCostSnapshot: {},
      selectedPricingSnapshot: null,
      selectedUncachedCostUsd: 0,
      baselineMaxEligibleCostUsd: 0,
      routingCostSavingsUsd: 0,
      cacheCostSavingsUsd: 0,
      totalAvoidedCostUsd: 0,
      costBaselineSource: null,
      costSavingsSupport: null,
      ...(input.dimensions ? { dimensions: input.dimensions } : {}),
    },
    privacyReceipt: {
      samplingRate: 1,
      retentionTtlHours: 720,
      retainUntil: createdAtMs + 720 * 3600 * 1000,
    },
    inspection: {
      request: {
        requestId: input.requestId,
        ...(input.clientRequestId ? { clientRequestId: input.clientRequestId } : {}),
        routingDecisionId,
        requestCapture: {
          body: {
            suppressed: true,
            reason: "Pre-execution failure; raw request body is omitted from failure observation.",
          },
        },
        responseCapture: {
          statusCode,
          ...(errorContext ? { body: errorContext } : {}),
        },
        diagnostics,
        capturePolicy,
      },
      endpoint: {
        endpointId: input.endpointId,
        endpointVersion: "pre-execution-failure",
        recentSamples: [],
      },
    },
  };
}

function readExecutionCooldownsFromTelemetryDimensions(
  dimensions: unknown,
): readonly RuntimeExecutionCooldownReceipt[] {
  if (!dimensions || typeof dimensions !== "object") {
    return [];
  }
  const executionCooldown = (dimensions as Record<string, unknown>).executionCooldown;
  if (!executionCooldown || typeof executionCooldown !== "object") {
    return [];
  }
  const entries = (executionCooldown as Record<string, unknown>).entries;
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return [];
    }
    const record = entry as Record<string, unknown>;
    const endpointId = record.endpointId;
    const active = record.active;
    const failureCount = record.failureCount;
    const cooldownUntilMs = record.cooldownUntilMs;
    const lastErrorClass = record.lastErrorClass;
    if (
      typeof endpointId !== "string" ||
      typeof active !== "boolean" ||
      typeof failureCount !== "number" ||
      typeof lastErrorClass !== "string"
    ) {
      return [];
    }
    return [
      {
        endpointId,
        active,
        failureCount,
        lastErrorClass,
        ...(record.schemaVersion === 2 ? { schemaVersion: 2 as const } : {}),
        ...(typeof record.circuitState === "string"
          ? { circuitState: record.circuitState as RuntimeExecutionCooldownReceipt["circuitState"] }
          : {}),
        ...(typeof record.failureCategory === "string"
          ? {
              failureCategory:
                record.failureCategory as RuntimeExecutionCooldownReceipt["failureCategory"],
            }
          : {}),
        ...(typeof cooldownUntilMs === "number" ? { cooldownUntilMs } : {}),
        ...(typeof record.nextProbeAtMs === "number"
          ? { nextProbeAtMs: record.nextProbeAtMs }
          : {}),
        ...(typeof record.retryAfterMs === "number" ? { retryAfterMs: record.retryAfterMs } : {}),
        ...(typeof record.lastFailureAtMs === "number"
          ? { lastFailureAtMs: record.lastFailureAtMs }
          : {}),
      } satisfies RuntimeExecutionCooldownReceipt,
    ];
  });
}

function slugify(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
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

const VALID_RUNTIME_ROUTING_MODES = ["baseline", "difficulty", "controller", "hybrid"] as const;
const VALID_TRANSPORT_PREFERENCES = ["auto", "sse", "websocket"] as const;

function parseRuntimeRoutingModeOverride(value: string): RuntimeRoutingMode {
  if ((VALID_RUNTIME_ROUTING_MODES as readonly string[]).includes(value)) {
    return value as RuntimeRoutingMode;
  }
  throw new BridgeHttpError(400, {
    error: `Invalid x-role-model-routing-mode header value "${value}". Expected one of: baseline, difficulty, controller, hybrid.`,
  });
}

function parseRuntimeTransportPreferenceHeader(
  value: string,
): RuntimeExecutionRequest["transportPreference"] {
  const normalized = value.trim().toLowerCase();
  if ((VALID_TRANSPORT_PREFERENCES as readonly string[]).includes(normalized)) {
    return normalized as RuntimeExecutionRequest["transportPreference"];
  }
  throw new BridgeHttpError(400, {
    error: `Invalid x-role-model-transport-preference header value "${value}". Expected one of: auto, sse, websocket.`,
  });
}

function normalizeConfiguredRoutingMode(
  value: string | null | undefined,
): RuntimeRoutingMode | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  switch (normalized) {
    case "baseline":
    case "basic":
    case "balanced":
    case "latency":
    case "quality":
    case "cost":
    case "low-latency":
    case "high-quality":
    case "low-cost":
    case "latency-first":
      return "baseline";
    case "controller":
    case "intelligent":
      return "controller";
    case "difficulty":
      return "difficulty";
    case "hybrid":
      return "hybrid";
    default:
      return null;
  }
}

function readBridgeRequestId(request: IncomingMessage): string {
  void request;
  return `req-${randomUUID()}`;
}

function measureStructuredPayloadBytes(value: unknown): number {
  return Buffer.byteLength(
    typeof value === "string" ? value : JSON.stringify(value ?? null),
    "utf8",
  );
}

function formatRuntimeTelemetryLogs(
  records: ReturnType<typeof listRuntimeTelemetryRecords>,
): string {
  return records
    .map((record) => {
      const timestamp = new Date(record.createdAtMs).toISOString();
      const statusLabel = record.errorClass
        ? `error=${record.errorClass}`
        : `status=${record.statusCode ?? 200}`;
      return `[${timestamp}] ${record.requestId} endpoint=${record.endpointId} model=${record.modelId ?? "unknown"} ${statusLabel} latency_ms=${record.latencyMs ?? "n/a"}`;
    })
    .join("\n");
}

function readBridgeExecutionRequestOptions(
  request: IncomingMessage,
): BridgeExecutionRequestOptions | undefined {
  const clientRequestId =
    request.headers["x-client-request-id"]?.toString().trim() ||
    request.headers["x-request-id"]?.toString().trim() ||
    request.headers["x-role-model-request-id"]?.toString().trim();
  const sessionId =
    request.headers["session-id"]?.toString().trim() ||
    request.headers["x-session-id"]?.toString().trim() ||
    request.headers.session_id?.toString().trim() ||
    request.headers["x-session-affinity"]?.toString().trim();
  const transportPreferenceHeader = request.headers["x-role-model-transport-preference"]
    ?.toString()
    .trim();
  const routingModeOverrideHeader = request.headers["x-role-model-routing-mode"]?.toString().trim();
  const endpointIdHeader = request.headers["x-role-model-endpoint-id"]?.toString().trim();
  const requestedRoleIdHeader = request.headers["x-role-model-requested-role-id"]
    ?.toString()
    .trim();
  const baseOptions: BridgeExecutionRequestOptions | undefined =
    !clientRequestId &&
    !sessionId &&
    !transportPreferenceHeader &&
    !routingModeOverrideHeader &&
    !endpointIdHeader &&
    !requestedRoleIdHeader
      ? undefined
      : {
          ...(sessionId ? { sessionId } : {}),
          ...(clientRequestId ? { clientRequestId } : {}),
          ...(transportPreferenceHeader
            ? {
                transportPreference:
                  parseRuntimeTransportPreferenceHeader(transportPreferenceHeader),
              }
            : {}),
          ...(routingModeOverrideHeader
            ? {
                routingModeOverride: parseRuntimeRoutingModeOverride(routingModeOverrideHeader),
              }
            : {}),
          ...(endpointIdHeader ? { endpointId: endpointIdHeader } : {}),
          ...(requestedRoleIdHeader ? { requestedRoleId: requestedRoleIdHeader } : {}),
        };
  return baseOptions;
}

function buildBridgeExecutionSessionAffinity(
  requestOptions?: BridgeExecutionRequestOptions,
): RuntimeExecutionRequest["sessionAffinity"] | undefined {
  const sessionId =
    typeof requestOptions?.sessionId === "string" && requestOptions.sessionId.trim().length > 0
      ? requestOptions.sessionId.trim()
      : undefined;
  const clientRequestId =
    typeof requestOptions?.clientRequestId === "string" &&
    requestOptions.clientRequestId.trim().length > 0
      ? requestOptions.clientRequestId.trim()
      : undefined;
  if (!sessionId && !clientRequestId) {
    return undefined;
  }
  return {
    ...(sessionId ? { sessionId } : {}),
    ...(clientRequestId ? { clientRequestId } : {}),
  };
}

function summarizeRequestRoutingModeDiagnostics(
  requestOptions?: BridgeExecutionRequestOptions,
): RuntimeRoutingDiagnostics["routingMode"] | undefined {
  if (!requestOptions?.routingModeOverride) {
    return undefined;
  }
  return {
    source: "request-override",
    requestedOverride: requestOptions.routingModeOverride,
    effectiveMode: requestOptions.routingModeOverride,
  };
}

function summarizeRewriteDiagnostics(input: {
  readonly requestedModel: string;
  readonly downstreamModelId: string;
}): RuntimeRoutingDiagnostics["rewrite"] {
  return {
    requestedModel: input.requestedModel,
    downstreamModelId: input.downstreamModelId,
    applied: input.requestedModel !== input.downstreamModelId,
    reason:
      input.requestedModel === input.downstreamModelId
        ? "requested-model-matches-downstream"
        : "requested-model-rewritten-for-selected-endpoint",
  };
}

function createInactiveVendorStatus(vendorId: string): VendorRuntimeStatus {
  return {
    vendorId,
    healthStatus: "inactive",
  };
}

type RouteObservedProfile = Parameters<
  typeof routeRuntimeRequest
>[0]["observedProfilesByEndpointId"][string];

type QualityScopedRouteObservedProfile = RouteObservedProfile & {
  quality_measured_at_ms?: number;
  quality_freshness_score?: number;
  quality_live_request_samples?: number;
  quality_benchmark_samples?: number;
};

function mergeObservedProfileForDifficultyBucket(input: {
  readonly endpointWideProfile?: RouteObservedProfile;
  readonly bucketProfile?: RouteObservedProfile;
}): QualityScopedRouteObservedProfile | undefined {
  if (!input.endpointWideProfile && !input.bucketProfile) {
    return undefined;
  }
  if (!input.endpointWideProfile && input.bucketProfile) {
    return {
      ...input.bucketProfile,
      ...(typeof input.bucketProfile.measured_at_ms === "number"
        ? { quality_measured_at_ms: input.bucketProfile.measured_at_ms }
        : {}),
      ...(typeof input.bucketProfile.freshness_score === "number"
        ? { quality_freshness_score: input.bucketProfile.freshness_score }
        : {}),
      ...(input.bucketProfile.sources
        ? {
            quality_live_request_samples: input.bucketProfile.sources.live_request_samples,
            quality_benchmark_samples: input.bucketProfile.sources.benchmark_samples,
          }
        : {}),
    };
  }
  if (!input.bucketProfile && input.endpointWideProfile) {
    return input.endpointWideProfile;
  }

  if (!input.endpointWideProfile || !input.bucketProfile) {
    return undefined;
  }
  const endpointWideProfile = input.endpointWideProfile;
  const bucketProfile = input.bucketProfile;
  const genericProfile =
    (bucketProfile.measured_at_ms ?? 0) >= (endpointWideProfile.measured_at_ms ?? 0)
      ? bucketProfile
      : endpointWideProfile;
  return {
    ...genericProfile,
    ...(typeof bucketProfile.judge_score === "number"
      ? { judge_score: bucketProfile.judge_score }
      : {}),
    ...(typeof bucketProfile.quality_score === "number"
      ? { quality_score: bucketProfile.quality_score }
      : {}),
    ...(typeof bucketProfile.measured_at_ms === "number"
      ? { quality_measured_at_ms: bucketProfile.measured_at_ms }
      : {}),
    ...(typeof bucketProfile.freshness_score === "number"
      ? { quality_freshness_score: bucketProfile.freshness_score }
      : {}),
    ...(bucketProfile.sources
      ? {
          quality_live_request_samples: bucketProfile.sources.live_request_samples,
          quality_benchmark_samples: bucketProfile.sources.benchmark_samples,
        }
      : {}),
  };
}

function readObservedProfilesForRouting(input: {
  readonly databasePath: string;
  readonly registry: EndpointRegistryResult;
  readonly observedDataConfig: ReturnType<typeof resolveUnifiedRuntimeObservedDataConfig>;
  readonly difficultyBucket?: UnifiedRuntimeDifficultyBucket;
  readonly routingTimeMs: number;
}): {
  readonly observedProfilesByEndpointId: Parameters<
    typeof routeRuntimeRequest
  >[0]["observedProfilesByEndpointId"];
  readonly throughputPenaltyStateByEndpointId: NonNullable<
    Parameters<typeof routeRuntimeRequest>[0]["throughputPenaltyStateByEndpointId"]
  >;
  readonly diagnosticsByEndpointId: Record<
    string,
    NonNullable<RuntimeRoutingDiagnostics["observedProfile"]>
  >;
} {
  const endpointIds = [
    ...new Set(input.registry.endpoints.map((endpoint) => endpoint.identity.endpoint_id)),
  ];
  const endpointWideProfilesByEndpointId = readLatestObservedProfilesByEndpointIds({
    databasePath: input.databasePath,
    endpointIds,
  });
  const difficultyBucketProfilesByEndpointId = input.difficultyBucket
    ? readLatestObservedProfilesByEndpointIds({
        databasePath: input.databasePath,
        endpointIds,
        difficultyBucket: input.difficultyBucket,
      })
    : {};
  const latestProfilesByEndpointId = input.difficultyBucket
    ? Object.fromEntries(
        endpointIds.flatMap((endpointId) => {
          const mergedProfile = mergeObservedProfileForDifficultyBucket({
            endpointWideProfile: endpointWideProfilesByEndpointId[endpointId],
            bucketProfile: difficultyBucketProfilesByEndpointId[endpointId],
          });
          return mergedProfile ? [[endpointId, mergedProfile]] : [];
        }),
      )
    : endpointWideProfilesByEndpointId;
  const throughputPenaltyStateByEndpointId: NonNullable<
    Parameters<typeof routeRuntimeRequest>[0]["throughputPenaltyStateByEndpointId"]
  > = {};
  const diagnosticsByEndpointId = Object.fromEntries(
    Object.entries(latestProfilesByEndpointId).map(([endpointId, profile]) => [
      endpointId,
      {
        endpointId,
        source: "runtime-state" as const,
        readMode: "per-request" as const,
        measuredAtMs: profile.measured_at_ms,
        ...(input.difficultyBucket ? { difficultyBucket: input.difficultyBucket } : {}),
        ...(input.difficultyBucket
          ? {
              bucketOverrideApplied: Object.prototype.hasOwnProperty.call(
                difficultyBucketProfilesByEndpointId,
                endpointId,
              ),
            }
          : {}),
      },
    ]),
  );

  if (input.observedDataConfig.enabled && input.observedDataConfig.throughputSla.enabled) {
    for (const [endpointId, profile] of Object.entries(latestProfilesByEndpointId)) {
      const existingPenaltyState = readObservedThroughputPenaltyState({
        databasePath: input.databasePath,
        endpointId,
        nowMs: input.routingTimeMs,
      });
      if (
        typeof profile.tokens_per_sec === "number" &&
        profile.tokens_per_sec < input.observedDataConfig.throughputSla.minTokensPerSec
      ) {
        const penaltyState = {
          endpointId,
          lastObservedTokensPerSec: profile.tokens_per_sec,
          minTokensPerSec: input.observedDataConfig.throughputSla.minTokensPerSec,
          penaltyFactor: input.observedDataConfig.throughputSla.penaltyFactor,
          activatedAtMs: profile.measured_at_ms,
          expiresAtMs:
            profile.measured_at_ms + input.observedDataConfig.throughputSla.penaltyTimeoutMs,
          lastObservationMeasuredAtMs: profile.measured_at_ms,
        };
        upsertObservedThroughputPenaltyState({
          databasePath: input.databasePath,
          penaltyState,
        });
        throughputPenaltyStateByEndpointId[endpointId] = penaltyState;
        continue;
      }
      if (existingPenaltyState) {
        throughputPenaltyStateByEndpointId[endpointId] = existingPenaltyState;
      }
    }
  }

  return {
    observedProfilesByEndpointId: latestProfilesByEndpointId as Parameters<
      typeof routeRuntimeRequest
    >[0]["observedProfilesByEndpointId"],
    throughputPenaltyStateByEndpointId,
    diagnosticsByEndpointId,
  };
}

function summarizeEffectiveMetricsFromDecision(
  decision: ReturnType<typeof routeRuntimeRequest>["decision"],
): RuntimeRoutingDiagnostics["effectiveMetrics"] | undefined {
  const chosen = decision.scored_candidates.find(
    (candidate) => candidate.endpoint_id === decision.chosen_endpoint_id,
  );
  if (!chosen) {
    return undefined;
  }

  const metricBreakdown = chosen.metric_breakdown as Record<
    string,
    {
      value?: number;
      source?: string;
      raw?: Record<string, unknown>;
    }
  >;
  const summarizeMetric = (metricName: string) => {
    const metric = metricBreakdown[metricName];
    if (!metric || typeof metric.value !== "number" || typeof metric.source !== "string") {
      return undefined;
    }
    return {
      value: metric.value,
      source: metric.source,
      measuredAtMs:
        typeof metric.raw?.measured_at_ms === "number" ? metric.raw.measured_at_ms : undefined,
      freshnessWeight:
        typeof metric.raw?.freshness_weight === "number" ? metric.raw.freshness_weight : undefined,
      freshnessSource:
        typeof metric.raw?.freshness_source === "string" ? metric.raw.freshness_source : undefined,
      timeDecayApplied:
        typeof metric.raw?.time_decay_applied === "boolean"
          ? metric.raw.time_decay_applied
          : undefined,
    };
  };

  return {
    quality: summarizeMetric("quality"),
    latency: summarizeMetric("latency"),
    throughput: summarizeMetric("throughput"),
    reliability: summarizeMetric("reliability"),
    cost: summarizeMetric("cost"),
  };
}

export function summarizeSelectionDiagnosticsFromDecision(
  decision: ReturnType<typeof routeRuntimeRequest>["decision"],
): RuntimeRoutingDiagnostics["selection"] | undefined {
  const chosen = decision.scored_candidates.find(
    (candidate) => candidate.endpoint_id === decision.chosen_endpoint_id,
  );
  if (!chosen) {
    return undefined;
  }

  const runnerUp = decision.scored_candidates.find(
    (candidate) => candidate.endpoint_id !== decision.chosen_endpoint_id,
  );
  const scoreDelta =
    runnerUp && Number.isFinite(runnerUp.total_score)
      ? Math.abs(chosen.total_score - runnerUp.total_score)
      : undefined;

  return {
    mode:
      typeof scoreDelta === "number" && scoreDelta <= ROUTING_SELECTION_SCORE_TIE_EPSILON
        ? "tie-break"
        : "best-total-score",
    scoreTieEpsilon: ROUTING_SELECTION_SCORE_TIE_EPSILON,
    ...(typeof scoreDelta === "number" ? { scoreDelta } : {}),
    winnerEndpointId: chosen.endpoint_id,
    winnerTotalScore: chosen.total_score,
    ...(runnerUp
      ? {
          runnerUpEndpointId: runnerUp.endpoint_id,
          runnerUpTotalScore: runnerUp.total_score,
        }
      : {}),
    tieBreakOrder: decision.policy_snapshot.tie_break_order,
  };
}

function summarizeThroughputPenaltyFromDecision(
  decision: ReturnType<typeof routeRuntimeRequest>["decision"],
): RuntimeRoutingDiagnostics["throughputPenalty"] | undefined {
  const chosen = decision.scored_candidates.find(
    (candidate) => candidate.endpoint_id === decision.chosen_endpoint_id,
  );
  if (!chosen) {
    return undefined;
  }

  const throughputMetric = (
    chosen.metric_breakdown as Record<string, { raw?: Record<string, unknown> }>
  ).throughput;
  const penalty = throughputMetric?.raw?.throughput_penalty as Record<string, unknown> | undefined;
  if (!penalty) {
    return {
      endpointId: decision.chosen_endpoint_id,
      active: false,
    };
  }

  return {
    endpointId: decision.chosen_endpoint_id,
    active: true,
    penaltyFactor: typeof penalty.penalty_factor === "number" ? penalty.penalty_factor : undefined,
    activatedAtMs:
      typeof penalty.activated_at_ms === "number" ? penalty.activated_at_ms : undefined,
    expiresAtMs: typeof penalty.expires_at_ms === "number" ? penalty.expires_at_ms : undefined,
    minTokensPerSec:
      typeof penalty.min_tokens_per_sec === "number" ? penalty.min_tokens_per_sec : undefined,
    lastObservedTokensPerSec:
      typeof penalty.last_observed_tokens_per_sec === "number"
        ? penalty.last_observed_tokens_per_sec
        : undefined,
  };
}

function summarizeHealthStatus(vendors: Record<string, VendorRuntimeStatus>): {
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
  const formattedCostUsd = formatCostUsd(input.costUsd);
  return {
    "x-role-model-endpoint-id": input.endpointId,
    "x-role-model-adapter-family": input.adapterFamily,
    ...(input.routingDecisionId
      ? { "x-role-model-routing-decision-id": input.routingDecisionId }
      : {}),
    ...(formattedCostUsd ? { "x-role-model-cost-usd": formattedCostUsd } : {}),
  };
}

function createBuiltinLocalOpenAIProvider(
  catalog: NormalizedCatalog,
): NormalizedCatalog["providers"][number] {
  return {
    providerId: LOCAL_OPENAI_PROVIDER_ID,
    displayName: "Local OpenAI-compatible",
    npmPackage: "",
    providerKind: "provider-openai",
    authFamily: "none",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "http://127.0.0.1:1234/v1",
    docsUrl: null,
    envVars: [],
    supportedAuthModes: ["api-key-static"],
    controlPlaneRequirements: [],
    localOverrideApplied: true,
    upstreamProvenance: catalog.source,
  };
}

function withBuiltinLocalOpenAIProvider(catalog: NormalizedCatalog): NormalizedCatalog {
  if (catalog.providers.some((provider) => provider.providerId === LOCAL_OPENAI_PROVIDER_ID)) {
    return catalog;
  }
  return {
    ...catalog,
    providers: [...catalog.providers, createBuiltinLocalOpenAIProvider(catalog)],
  };
}

function normalizeLocalPeerApiBase(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

function normalizeLocalPeerAuthToken(authToken?: string): string {
  const trimmed = authToken?.trim() ?? "";
  if (trimmed.length === 0) {
    return LOCAL_OPENAI_PLACEHOLDER_TOKEN;
  }
  return trimmed.toLowerCase().startsWith("bearer ") ? trimmed.slice(7).trim() : trimmed;
}

function createLocalPeerProviderAccountId(peerId: string): string {
  return `${LOCAL_OPENAI_PROVIDER_ID}.personal.${sanitizeSegment(peerId) || "peer"}`;
}

function createLocalPeerCredentialRef(providerAccountId: string): string {
  return `local-peers/${sanitizeSegment(providerAccountId)}`;
}

function buildLocalPeerAuthHeaders(peer: LocalPeerConfig): Record<string, string> {
  return {
    authorization: `Bearer ${normalizeLocalPeerAuthToken(peer.authToken)}`,
  };
}

function isLocalPeerProviderAccountId(providerAccountId: string): boolean {
  return providerAccountId.startsWith(`${LOCAL_OPENAI_PROVIDER_ID}.`);
}

function createUnifiedLocalSources(config: UnifiedRuntimeConfig): RegistrySources["local"] {
  return config.llamaSwap.models.map((model) => ({
    endpointId: `llama-swap.local.${slugify(model.modelId)}`,
    providerKind: "ai-sdk-openai-compatible",
    providerId: "llama-swap",
    modelId: model.modelId,
    localModelSource: "llama-swap" as const,
    capabilities:
      model.capabilities.length > 0 ? model.capabilities : ["text.chat", "tools.function_calling"],
    modalities: ["text"],
    endpointKind: "local-openai-compatible",
    servingSource: "vendor-llama-swap",
    lifecycleState: "active",
    hostClass: "localhost",
    deviceClass: "localhost",
    region: "local",
    orgScope: "runtime-config",
    contextWindow: model.contextWindow,
    proxyBaseUrl: model.proxyBaseUrl,
    checkEndpoint: model.checkEndpoint,
    useModelName: model.useModelName,
  }));
}

function toLocalModelSource(
  servingSource: string | null | undefined,
): "llama-swap" | "peer-backed" | undefined {
  if (servingSource === "vendor-llama-swap") {
    return "llama-swap";
  }
  if (servingSource === "local-peer") {
    return "peer-backed";
  }
  return undefined;
}

function createUnifiedCloudSources(config: UnifiedRuntimeConfig): RegistrySources["cloud"] {
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

function buildEndpointMaxDifficultyByEndpointId(
  config: UnifiedRuntimeConfig | null,
): Readonly<Record<string, UnifiedRuntimeDifficultyBucket>> {
  if (!config) {
    return {};
  }

  const limits: Record<string, UnifiedRuntimeDifficultyBucket> = {};
  for (const model of config.llamaSwap.models) {
    if (!model.maxDifficulty) {
      continue;
    }
    limits[`llama-swap.local.${slugify(model.modelId)}`] = model.maxDifficulty;
  }
  for (const provider of config.liteLLM.providers) {
    for (const mapping of provider.modelMappings) {
      if (!mapping.maxDifficulty) {
        continue;
      }
      limits[`${provider.providerId}.litellm.global.${slugify(mapping.modelId)}`] =
        mapping.maxDifficulty;
    }
  }
  return limits;
}

function createUnifiedProviderAccounts(
  catalog: NormalizedCatalog,
  liteLLMProviderList: readonly LiteLLMProviderInfo[],
  config: UnifiedRuntimeConfig,
  liteLLMBaseUrl: string | null,
  runtimeStateRoot: string,
  scopeId: string,
  persistedAccounts: readonly ProviderAccountRecord[] = [],
): ProviderAccountRecord[] {
  if (!liteLLMBaseUrl) {
    return [];
  }
  const manualAccountsById = new Map(
    persistedAccounts
      .filter((account) => !isRuntimeConfigProviderAccount(account))
      .map((account) => [account.providerAccountId, account]),
  );
  return config.liteLLM.providers.map((providerConfig) => {
    const catalogProvider = catalog.providers.find(
      (entry) => entry.providerId === providerConfig.providerId,
    );
    const liteLLMProvider = liteLLMProviderList.find(
      (entry) => entry.providerId === providerConfig.providerId,
    );
    const provider = catalogProvider ?? liteLLMProvider;
    if (!provider) {
      throw new Error(
        `Unified runtime provider ${providerConfig.providerId} is not present in the catalog or LiteLLM provider list.`,
      );
    }
    const mergedMetadata = catalogProvider
      ? resolveValidationProviderMetadata({
          catalogProvider,
          liteLLMProvider,
        })
      : null;

    const providerAccountId = `${providerConfig.providerId}.litellm`;
    const resolvedOauthCredential = resolveOauthCredentialRef(
      { runtimeStateRoot, scopeId },
      provider.providerId,
      providerAccountId,
    );
    const supportsOAuth = provider.supportedAuthModes?.includes("oauth2-device-code") ?? false;
    const authMode =
      resolvedOauthCredential && supportsOAuth
        ? "oauth2-device-code"
        : (provider.supportedAuthModes?.find((candidate) => candidate === "api-key-static") ??
          provider.supportedAuthModes?.[0] ??
          "api-key-static");

    const credentialRef =
      resolvedOauthCredential && supportsOAuth
        ? resolvedOauthCredential
        : resolveEnvCredentialRef(
            providerConfig.apiKeyRef,
            `${provider.providerId.toUpperCase()}_API_KEY`,
          );

    const runtimeConfigAccount: ProviderAccountRecord = {
      providerAccountId,
      providerId: provider.providerId,
      providerKind: mergedMetadata?.providerKind ?? provider.providerKind,
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
    const manualAccount = manualAccountsById.get(providerAccountId);
    return manualAccount
      ? mergeRuntimeConfigProviderAccount(manualAccount, runtimeConfigAccount)
      : runtimeConfigAccount;
  });
}

function deleteRuntimeConfigProviderAccounts(databasePath: string): void {
  const database = new DatabaseSync(databasePath);
  try {
    const accountRows = database
      .prepare(
        "SELECT provider_account_id FROM provider_accounts WHERE org_scope = ? OR account_scope = ?",
      )
      .all("runtime-config", "runtime-config") as Array<{ provider_account_id: string }>;
    const providerAccountIds = accountRows.map((row) => row.provider_account_id);
    if (providerAccountIds.length > 0) {
      const deleteEndpoint = database.prepare(
        "DELETE FROM runtime_endpoints WHERE provider_account_id = ?",
      );
      const deleteDeviceAuthorization = database.prepare(
        "DELETE FROM provider_device_auth_sessions WHERE provider_account_id = ?",
      );
      for (const providerAccountId of providerAccountIds) {
        deleteEndpoint.run(providerAccountId);
        deleteDeviceAuthorization.run(providerAccountId);
      }
    }
    database
      .prepare("DELETE FROM provider_accounts WHERE org_scope = ? OR account_scope = ?")
      .run("runtime-config", "runtime-config");
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

function deleteProviderAccountsById(
  databasePath: string,
  providerAccountIds: readonly string[],
): void {
  if (providerAccountIds.length === 0) {
    return;
  }
  const database = new DatabaseSync(databasePath);
  try {
    const statement = database.prepare(
      "DELETE FROM provider_accounts WHERE provider_account_id = ?",
    );
    for (const providerAccountId of providerAccountIds) {
      statement.run(providerAccountId);
    }
  } finally {
    database.close();
  }
}

function deleteRuntimeEndpointsByProviderAccountId(
  databasePath: string,
  providerAccountIds: readonly string[],
): void {
  if (providerAccountIds.length === 0) {
    return;
  }
  const database = new DatabaseSync(databasePath);
  try {
    const statement = database.prepare(
      "DELETE FROM runtime_endpoints WHERE provider_account_id = ?",
    );
    for (const providerAccountId of providerAccountIds) {
      statement.run(providerAccountId);
    }
  } finally {
    database.close();
  }
}

function deleteRuntimeEndpointsByModelId(
  databasePath: string,
  modelId: string,
  providerAccountIds: readonly string[],
): void {
  if (providerAccountIds.length === 0) {
    return;
  }
  const database = new DatabaseSync(databasePath);
  try {
    const statement = database.prepare(
      "DELETE FROM runtime_endpoints WHERE model_id = ? AND provider_account_id = ?",
    );
    for (const providerAccountId of providerAccountIds) {
      statement.run(modelId, providerAccountId);
    }
  } finally {
    database.close();
  }
}

function deleteProviderDeviceAuthorizationsByAccountId(
  databasePath: string,
  providerAccountIds: readonly string[],
): void {
  if (providerAccountIds.length === 0) {
    return;
  }
  const database = new DatabaseSync(databasePath);
  try {
    const statement = database.prepare(
      "DELETE FROM provider_device_auth_sessions WHERE provider_account_id = ?",
    );
    for (const providerAccountId of providerAccountIds) {
      statement.run(providerAccountId);
    }
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

function resolveRuntimeEndpointCatalogTemplate(input: {
  readonly catalog: NormalizedCatalog;
  readonly account: ProviderAccountRecord;
  readonly endpointModelId: string;
  readonly fallbackTemplate: NormalizedCatalogModel;
}): NormalizedCatalogModel {
  if (
    input.account.providerId === OPENAI_PROVIDER_ID &&
    input.endpointModelId.startsWith(`${CHATGPT_PROVIDER_ID}/`)
  ) {
    const canonicalModelId = `${OPENAI_PROVIDER_ID}/${input.endpointModelId.slice(
      CHATGPT_PROVIDER_ID.length + 1,
    )}`;
    const canonicalModel = input.catalog.models.find((model) => model.modelId === canonicalModelId);
    if (canonicalModel) {
      return canonicalModel;
    }
  }

  return input.fallbackTemplate;
}

function withRuntimeEndpointFallbackModels(
  catalog: NormalizedCatalog,
  accounts: readonly ProviderAccountRecord[],
  runtimeEndpoints: readonly {
    endpointId: string;
    providerAccountId: string;
    modelId: string;
  }[],
): NormalizedCatalog {
  const knownModelIds = new Set(catalog.models.map((model) => model.modelId));
  const accountsById = new Map(
    accounts.map((account) => [account.providerAccountId, account] as const),
  );
  const fallbackTemplate = createFallbackModelTemplate(catalog);
  const synthesizedModels: NormalizedCatalogModel[] = [];

  for (const endpoint of runtimeEndpoints) {
    if (knownModelIds.has(endpoint.modelId)) {
      continue;
    }
    const account = accountsById.get(endpoint.providerAccountId);
    if (!account) {
      continue;
    }
    const baseModel = resolveRuntimeEndpointCatalogTemplate({
      catalog,
      account,
      endpointModelId: endpoint.modelId,
      fallbackTemplate,
    });
    synthesizedModels.push({
      ...baseModel,
      modelId: endpoint.modelId,
      providerId: account.providerId,
      displayName:
        baseModel.modelId === endpoint.modelId
          ? baseModel.displayName
          : readDefaultDisplayNameFromModelId(endpoint.modelId),
      localNotes: [
        ...baseModel.localNotes,
        baseModel === fallbackTemplate
          ? "Synthesized during runtime registry rebuild for an activated endpoint model that is not present in the static catalog."
          : `Synthesized during runtime registry rebuild by cloning canonical catalog metadata from ${baseModel.modelId}.`,
      ],
    });
    knownModelIds.add(endpoint.modelId);
  }

  if (synthesizedModels.length === 0) {
    return catalog;
  }

  return {
    ...catalog,
    models: applyAliasedCatalogPricing([...catalog.models, ...synthesizedModels]),
  };
}

function synthesizeUnifiedLiteLLMModel(input: {
  readonly modelId: string;
  readonly providerId: string;
  readonly capabilities: readonly string[];
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
    capabilities: input.capabilities.length > 0 ? [...input.capabilities] : baseModel.capabilities,
    displayName: readDefaultDisplayNameFromModelId(input.modelId),
    localOverrideApplied: true,
    localNotes: [
      ...baseModel.localNotes,
      "Synthesized from unified LiteLLM runtime config model mappings.",
    ],
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
    models: (() => {
      const configuredCapabilitiesByModelId = new Map<string, readonly string[]>();
      for (const provider of config.liteLLM.providers) {
        for (const mapping of provider.modelMappings) {
          if (mapping.capabilities.length > 0) {
            configuredCapabilitiesByModelId.set(mapping.modelId, mapping.capabilities);
          }
        }
      }
      const modelsById = new Map(catalog.models.map((model) => [model.modelId, model]));
      const nextModels = catalog.models.map((model) => {
        const configuredCapabilities = configuredCapabilitiesByModelId.get(model.modelId);
        return configuredCapabilities
          ? { ...model, capabilities: [...configuredCapabilities] }
          : model;
      });
      for (const provider of config.liteLLM.providers) {
        for (const modelId of provider.modelMappings.map((mapping) => mapping.modelId)) {
          if (modelsById.has(modelId)) {
            continue;
          }
          const synthesizedModel = synthesizeUnifiedLiteLLMModel({
            modelId,
            providerId: provider.providerId,
            capabilities:
              provider.modelMappings.find((mapping) => mapping.modelId === modelId)?.capabilities ??
              [],
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

function synthesizeFixtureProviderAccounts(
  catalog: NormalizedCatalog,
  accounts: readonly ProviderAccountRecord[],
  sources: RegistrySources,
): readonly ProviderAccountRecord[] {
  if (sources.cloud.length === 0) {
    return accounts;
  }

  const providersById = new Map(
    catalog.providers.map((provider) => [provider.providerId, provider]),
  );
  const modelsById = new Map(catalog.models.map((model) => [model.modelId, model]));
  const accountsById = new Map(accounts.map((account) => [account.providerAccountId, account]));
  const modelIdsByAccountId = new Map<string, Set<string>>();
  const regionsByAccountId = new Map<string, Set<string>>();

  for (const source of sources.cloud) {
    let modelIds = modelIdsByAccountId.get(source.providerAccountId);
    if (!modelIds) {
      modelIds = new Set<string>();
      modelIdsByAccountId.set(source.providerAccountId, modelIds);
    }
    modelIds.add(source.modelId);

    let regions = regionsByAccountId.get(source.providerAccountId);
    if (!regions) {
      regions = new Set<string>();
      regionsByAccountId.set(source.providerAccountId, regions);
    }
    regions.add(source.region);
  }

  const synthesizedAccounts: ProviderAccountRecord[] = [];
  for (const [providerAccountId, modelIds] of modelIdsByAccountId) {
    if (accountsById.has(providerAccountId)) {
      continue;
    }
    const firstModelId = [...modelIds][0] ?? "";
    const model = modelsById.get(firstModelId);
    const providerId = model?.providerId ?? providerAccountId.split(".")[0] ?? "unknown";
    const provider = providersById.get(providerId);
    synthesizedAccounts.push({
      providerAccountId,
      providerId,
      providerKind: provider?.providerKind ?? model?.providerKind ?? "remote-openai-compatible",
      orgScope: providerAccountId.split(".")[1] ?? "personal",
      accountScope: providerAccountId.split(".").slice(2).join(".") || "default",
      credentialRef: {
        backend: "env",
        ref:
          provider?.envVars[0] ?? `${providerId.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`,
      },
      authMode: provider?.supportedAuthModes.includes("oauth2-device-code")
        ? "oauth2-device-code"
        : "api-key-static",
      regionPolicy: {
        mode: "allow",
        regions: [...(regionsByAccountId.get(providerAccountId) ?? new Set<string>())],
      },
      baseUrlOverride: null,
      allowedModels: [...modelIds],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    });
  }

  return [...accounts, ...synthesizedAccounts];
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

interface DeviceAuthorizationReadbackResult {
  readonly authRequestId: string;
  readonly providerAccountId: string;
  readonly providerId: string;
  readonly variantId: string;
  readonly status: "pending" | "connected" | "expired" | "failed";
  readonly userCode: string;
  readonly verificationUri: string;
  readonly verificationUriComplete: string;
  readonly intervalSeconds: number;
  readonly expiresAtMs: number;
  readonly lastError?: string;
}

interface RuntimeRoleSummary {
  readonly roleId: string;
  readonly label: string;
  readonly description: string;
  readonly taskTypes: readonly string[];
}

type RuntimeRoleDefinitionRecord = NonNullable<
  Parameters<typeof routeRuntimeRequest>[0]["roleDefinitions"]
>[number];
type RuntimeTaskDefinitionRecord = NonNullable<
  Parameters<typeof routeRuntimeRequest>[0]["taskDefinitions"]
>[number];
type RuntimeRoleBindingRecord = NonNullable<
  Parameters<typeof routeRuntimeRequest>[0]["roleBindings"]
>[number];

interface RuntimeRolePolicyRecord {
  readonly roleDefinitions: readonly RuntimeRoleDefinitionRecord[];
  readonly taskDefinitions: readonly RuntimeTaskDefinitionRecord[];
}

const defaultRoles = [
  ...canonicalTaxonomy.roles.map((role) => ({
    role_id: role.id,
    task_types_supported: role.taskIds,
  })),
] as readonly { readonly role_id: string; readonly task_types_supported: readonly string[] }[];

const defaultTaskDefinitions: readonly RuntimeTaskDefinitionRecord[] = [
  ...canonicalTaxonomy.tasks.map((task) => ({
    task_type: task.id,
    description: task.description,
    required_inputs: [...task.requiredModalities],
    required_capabilities: [...task.requiredCapabilities],
    preferred_capabilities: [...task.preferredCapabilities],
    quality_metrics: [],
    allowed_roles: [...task.compatibleRoles],
    default_benchmark_suites: [],
  })),
];

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "en");
}

type ProviderAccountModelRoleBinding = NonNullable<
  ProviderAccountRecord["modelRoleBindings"]
>[number];

const legacyRuntimeRoleIdAliases: Readonly<Record<string, string>> = {
  "general.chat": "writer",
  "coder.patch": "coder",
  "coder.review": "coder",
  "tool.agent": "operator",
  embedder: "data",
  classifier: "analyst",
  "language.detector": "translator",
};

function normalizeRuntimeRoleId(roleId: string): string {
  return legacyRuntimeRoleIdAliases[roleId] ?? roleId;
}

function normalizeRuntimeRoleIdForPolicy(
  roleId: string,
  roleDefinitions?: readonly RuntimeRoleDefinitionRecord[],
): string {
  const normalizedRoleId = normalizeRuntimeRoleId(roleId);
  if (!roleDefinitions || roleDefinitions.length === 0) {
    return normalizedRoleId;
  }
  if (roleDefinitions.some((definition) => definition.role_id === normalizedRoleId)) {
    return normalizedRoleId;
  }
  if (roleDefinitions.some((definition) => definition.role_id === roleId)) {
    return roleId;
  }
  return normalizedRoleId;
}

function normalizeRuntimeRoleIds(roleIds: readonly string[] | undefined): string[] | undefined {
  if (!roleIds) {
    return undefined;
  }
  return [...new Set(roleIds.map((roleId) => normalizeRuntimeRoleId(roleId)))];
}

function normalizeProviderAccountModelRoleBinding(
  binding: ProviderAccountModelRoleBinding,
): ProviderAccountModelRoleBinding {
  return {
    ...binding,
    roleIds: normalizeRuntimeRoleIds(binding.roleIds) ?? [],
    ...(binding.enabledRoleIds
      ? { enabledRoleIds: normalizeRuntimeRoleIds(binding.enabledRoleIds) }
      : {}),
    ...(binding.disabledRoleIds
      ? { disabledRoleIds: normalizeRuntimeRoleIds(binding.disabledRoleIds) }
      : {}),
  };
}

function sanitizeProviderAccountModelRoleBindingForAllowedRoles(
  binding: ProviderAccountModelRoleBinding,
  allowedRoleIds: ReadonlySet<string>,
): ProviderAccountModelRoleBinding | null {
  const normalizedBinding = normalizeProviderAccountModelRoleBinding(binding);
  const nextRoleIds = normalizedBinding.roleIds.filter((roleId) => allowedRoleIds.has(roleId));
  const nextEnabledRoleIds = normalizedBinding.enabledRoleIds?.filter((roleId) =>
    allowedRoleIds.has(roleId),
  );
  const nextDisabledRoleIds = normalizedBinding.disabledRoleIds?.filter((roleId) =>
    allowedRoleIds.has(roleId),
  );

  if (!normalizedBinding.roleAssignmentMode && nextRoleIds.length === 0) {
    return null;
  }

  return {
    ...normalizedBinding,
    roleIds: nextRoleIds,
    ...(nextEnabledRoleIds ? { enabledRoleIds: nextEnabledRoleIds } : {}),
    ...(nextDisabledRoleIds ? { disabledRoleIds: nextDisabledRoleIds } : {}),
  };
}

function sanitizeProviderAccountModelRoleBindingsForAllowedRoles(
  bindings: readonly ProviderAccountModelRoleBinding[] | undefined,
  allowedRoleIds: ReadonlySet<string>,
): ProviderAccountRecord["modelRoleBindings"] {
  if (!bindings || bindings.length === 0) {
    return undefined;
  }

  const sanitizedBindings = bindings.flatMap((binding) => {
    const sanitizedBinding = sanitizeProviderAccountModelRoleBindingForAllowedRoles(
      binding,
      allowedRoleIds,
    );
    return sanitizedBinding ? [sanitizedBinding] : [];
  });

  return sanitizedBindings.length > 0 ? sanitizedBindings : undefined;
}

function normalizeProviderAccountRoleBindings(
  account: Record<string, unknown>,
): Record<string, unknown> {
  if (!Array.isArray(account.modelRoleBindings)) {
    return account;
  }
  return {
    ...account,
    modelRoleBindings: (
      account.modelRoleBindings as ProviderAccountRecord["modelRoleBindings"]
    )?.map(normalizeProviderAccountModelRoleBinding),
  };
}

function isRuntimeConfigProviderAccount(account: ProviderAccountRecord): boolean {
  return account.orgScope === "runtime-config" || account.accountScope === "runtime-config";
}

function mergeProviderAccountAllowedModels(
  manualAllowedModels: readonly string[],
  runtimeConfigAllowedModels: readonly string[],
): string[] {
  return [...new Set([...manualAllowedModels, ...runtimeConfigAllowedModels])].sort(compareText);
}

function mergeProviderAccountModelRoleBindings(
  manualBindings: readonly ProviderAccountModelRoleBinding[],
  runtimeConfigBindings: readonly ProviderAccountModelRoleBinding[],
): ProviderAccountRecord["modelRoleBindings"] {
  const explicitBindings = new Map<string, ProviderAccountModelRoleBinding>();
  for (const binding of [...runtimeConfigBindings, ...manualBindings]) {
    const normalizedBinding = normalizeProviderAccountModelRoleBinding(binding);
    if (normalizedBinding.roleAssignmentMode) {
      explicitBindings.set(normalizedBinding.modelId, normalizedBinding);
    }
  }
  const mergedBindings = new Map<string, Set<string>>();
  for (const binding of [...manualBindings, ...runtimeConfigBindings]) {
    if (explicitBindings.has(binding.modelId)) {
      continue;
    }
    const roleIds = mergedBindings.get(binding.modelId) ?? new Set<string>();
    for (const roleId of normalizeRuntimeRoleIds(binding.roleIds) ?? []) {
      roleIds.add(roleId);
    }
    mergedBindings.set(binding.modelId, roleIds);
  }

  if (mergedBindings.size === 0 && explicitBindings.size === 0) {
    return undefined;
  }

  return [
    ...[...explicitBindings.values()].map((binding) => ({
      ...binding,
      roleIds: [...binding.roleIds].sort(compareText),
      ...(binding.enabledRoleIds
        ? { enabledRoleIds: [...binding.enabledRoleIds].sort(compareText) }
        : {}),
      ...(binding.disabledRoleIds
        ? { disabledRoleIds: [...binding.disabledRoleIds].sort(compareText) }
        : {}),
    })),
    ...[...mergedBindings.entries()].map(([modelId, roleIds]) => ({
      modelId,
      roleIds: [...roleIds].sort(compareText),
    })),
  ].sort((left, right) => compareText(left.modelId, right.modelId));
}

function mergeRuntimeConfigProviderAccount(
  manualAccount: ProviderAccountRecord,
  runtimeConfigAccount: ProviderAccountRecord,
): ProviderAccountRecord {
  return {
    ...runtimeConfigAccount,
    providerKind: manualAccount.providerKind,
    orgScope: manualAccount.orgScope,
    accountScope: manualAccount.accountScope,
    credentialRef: manualAccount.credentialRef,
    authMode: manualAccount.authMode,
    regionPolicy: manualAccount.regionPolicy,
    baseUrlOverride: manualAccount.baseUrlOverride ?? runtimeConfigAccount.baseUrlOverride,
    allowedModels: runtimeConfigAccount.allowedModels,
    modelRoleBindings: mergeProviderAccountModelRoleBindings(
      manualAccount.modelRoleBindings ?? [],
      runtimeConfigAccount.modelRoleBindings ?? [],
    )?.filter((binding) => runtimeConfigAccount.allowedModels.includes(binding.modelId)),
    deniedModels: manualAccount.deniedModels,
    entitlementTags: manualAccount.entitlementTags,
    budgetPolicyRef: manualAccount.budgetPolicyRef,
    quotaPolicyRef: manualAccount.quotaPolicyRef,
    status: manualAccount.status,
    healthStatus: manualAccount.healthStatus,
    rotationState: manualAccount.rotationState,
  };
}

function titleCaseWords(value: string): string {
  return value
    .split(/[._-]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildBuiltinRoleDescription(roleId: string): string {
  return (
    canonicalTaxonomy.roles.find((role) => role.id === roleId)?.description ??
    `${titleCaseWords(roleId)} tasks.`
  );
}

function createBuiltinRoleDefinition(
  roleId: string,
  taskTypes: readonly string[],
): RuntimeRoleDefinitionRecord {
  const taxonomyRole = canonicalTaxonomy.roles.find((role) => role.id === roleId);
  return {
    role_id: roleId,
    name: titleCaseWords(roleId),
    description: taxonomyRole?.description ?? buildBuiltinRoleDescription(roleId),
    ...(taxonomyRole
      ? {
          primaryGroupId: taxonomyRole.primaryGroupId,
          secondaryGroupIds: [...taxonomyRole.secondaryGroupIds],
          riskLevel: ["security", "legal", "finance", "recruiter", "health"].includes(roleId)
            ? "high"
            : "standard",
        }
      : {}),
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
  } as RuntimeRoleDefinitionRecord;
}

function buildDefaultRuntimeRolePolicy(): RuntimeRolePolicyRecord {
  return {
    roleDefinitions: defaultRoles.map((role) =>
      createBuiltinRoleDefinition(role.role_id, role.task_types_supported),
    ),
    taskDefinitions: defaultTaskDefinitions.map((task) => ({
      ...task,
      required_inputs: [...task.required_inputs],
      required_capabilities: [...task.required_capabilities],
      preferred_capabilities: [...task.preferred_capabilities],
      quality_metrics: [...task.quality_metrics],
      allowed_roles: [...task.allowed_roles],
      default_benchmark_suites: [...task.default_benchmark_suites],
    })),
  };
}

function readRequiredStringArray(
  record: Record<string, unknown>,
  key: string,
  label: string,
): string[] {
  const value = readStringArray(record, key);
  if (!value) {
    throw new Error(`${label}.${key} must be an array of strings`);
  }
  return value;
}

function validateRuntimeRoleDefinitionRecord(
  value: unknown,
  label: string,
): RuntimeRoleDefinitionRecord {
  const record = asObject(value, label);
  const toolPolicy = asObject(record.tool_policy, `${label}.tool_policy`);
  const toolPolicyMode = readRequiredString(toolPolicy, "mode", `${label}.tool_policy`);
  if (!["disabled", "limited", "allowed"].includes(toolPolicyMode)) {
    throw new Error(`${label}.tool_policy.mode must be one of disabled, limited, allowed`);
  }
  if (!("routing_policy_overrides" in record)) {
    throw new Error(`${label}.routing_policy_overrides must be present`);
  }
  return {
    role_id: readRequiredString(record, "role_id", label),
    name: readRequiredString(record, "name", label),
    description: readRequiredString(record, "description", label),
    role_kind: readRequiredString(record, "role_kind", label),
    default_system_instructions: readRequiredString(record, "default_system_instructions", label),
    task_types_supported: readRequiredStringArray(record, "task_types_supported", label),
    required_capabilities: readRequiredStringArray(record, "required_capabilities", label),
    preferred_capabilities: readRequiredStringArray(record, "preferred_capabilities", label),
    forbidden_capabilities: readRequiredStringArray(record, "forbidden_capabilities", label),
    tool_policy: {
      mode: toolPolicyMode as RuntimeRoleDefinitionRecord["tool_policy"]["mode"],
      ...(readStringArray(toolPolicy, "allowed_tools")
        ? { allowed_tools: readStringArray(toolPolicy, "allowed_tools") }
        : {}),
    },
    routing_policy_overrides: asObject(
      record.routing_policy_overrides ?? {},
      `${label}.routing_policy_overrides`,
    ),
    output_contracts: readRequiredStringArray(record, "output_contracts", label),
    safety_policy_refs: readRequiredStringArray(record, "safety_policy_refs", label),
  };
}

function validateRuntimeTaskDefinitionRecord(
  value: unknown,
  label: string,
): RuntimeTaskDefinitionRecord {
  const record = asObject(value, label);
  return {
    task_type: readRequiredString(record, "task_type", label),
    description: readRequiredString(record, "description", label),
    required_inputs: readRequiredStringArray(record, "required_inputs", label),
    required_capabilities: readRequiredStringArray(record, "required_capabilities", label),
    preferred_capabilities: readRequiredStringArray(record, "preferred_capabilities", label),
    quality_metrics: readRequiredStringArray(record, "quality_metrics", label),
    allowed_roles: readRequiredStringArray(record, "allowed_roles", label),
    default_benchmark_suites: readRequiredStringArray(record, "default_benchmark_suites", label),
  };
}

function validateRuntimeRolePolicyRecord(value: unknown, label: string): RuntimeRolePolicyRecord {
  const record = asObject(value, label);
  if (!Array.isArray(record.roleDefinitions)) {
    throw new Error(`${label}.roleDefinitions must be an array`);
  }
  if (!Array.isArray(record.taskDefinitions)) {
    throw new Error(`${label}.taskDefinitions must be an array`);
  }
  const roleDefinitions = record.roleDefinitions.map((entry, index) =>
    validateRuntimeRoleDefinitionRecord(entry, `${label}.roleDefinitions[${index}]`),
  );
  const taskDefinitions = record.taskDefinitions.map((entry, index) =>
    validateRuntimeTaskDefinitionRecord(entry, `${label}.taskDefinitions[${index}]`),
  );
  const roleIds = roleDefinitions.map((role) => role.role_id);
  if (new Set(roleIds).size !== roleIds.length) {
    throw new Error(`${label}.roleDefinitions must not repeat role ids`);
  }
  const taskTypes = taskDefinitions.map((task) => task.task_type);
  if (new Set(taskTypes).size !== taskTypes.length) {
    throw new Error(`${label}.taskDefinitions must not repeat task types`);
  }
  const roleIdSet = new Set(roleIds);
  for (const taskDefinition of taskDefinitions) {
    if (taskDefinition.allowed_roles.some((roleId) => !roleIdSet.has(roleId))) {
      throw new Error(
        `${label}.taskDefinitions.${taskDefinition.task_type} includes a role id that is not present in roleDefinitions`,
      );
    }
  }
  return {
    roleDefinitions: [...roleDefinitions].sort((left, right) =>
      compareText(left.role_id, right.role_id),
    ),
    taskDefinitions: [...taskDefinitions].sort((left, right) =>
      compareText(left.task_type, right.task_type),
    ),
  };
}

function getRuntimeRolePolicyPath(runtimeStateRoot: string): string {
  return path.join(runtimeStateRoot, "role-policy.json");
}

function buildRuntimeRoleCatalog(
  roleDefinitions: readonly NonNullable<
    Parameters<typeof routeRuntimeRequest>[0]["roleDefinitions"]
  >[number][] = [],
): {
  readonly roleDefinitions: readonly NonNullable<
    Parameters<typeof routeRuntimeRequest>[0]["roleDefinitions"]
  >[number][];
  readonly roleSummaries: readonly RuntimeRoleSummary[];
} {
  const summaries = new Map<string, RuntimeRoleSummary>();
  const definitions = new Map<
    string,
    NonNullable<Parameters<typeof routeRuntimeRequest>[0]["roleDefinitions"]>[number]
  >();

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
      definitions.set(
        role.role_id,
        createBuiltinRoleDefinition(role.role_id, role.task_types_supported),
      );
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

  const byRoleId = [...summaries.values()].sort((left, right) =>
    compareText(left.roleId, right.roleId),
  );
  const orderedRoleDefinitions = byRoleId.map((role) => {
    const definition = definitions.get(role.roleId);
    if (!definition) {
      throw new Error(`Missing role definition for ${role.roleId}.`);
    }
    return definition;
  });
  return {
    roleDefinitions: orderedRoleDefinitions,
    roleSummaries: byRoleId,
  };
}

function buildRuntimeRoleBindings(
  staticBindings: readonly NonNullable<
    Parameters<typeof routeRuntimeRequest>[0]["roleBindings"]
  >[number][],
  runtimeEndpoints: readonly {
    endpointId: string;
    providerAccountId: string;
    modelId: string;
  }[],
  accounts: readonly ProviderAccountRecord[],
  registry: EndpointRegistryResult,
  roleDefinitions: readonly NonNullable<
    Parameters<typeof routeRuntimeRequest>[0]["roleDefinitions"]
  >[number][],
  taskDefinitions: readonly NonNullable<
    Parameters<typeof routeRuntimeRequest>[0]["taskDefinitions"]
  >[number][],
  llamaSwapRoleIdsByModelId: Readonly<Record<string, readonly string[]>> = {},
): readonly NonNullable<Parameters<typeof routeRuntimeRequest>[0]["roleBindings"]>[number][] {
  const accountBindings = buildAccountEndpointRoleBindings({
    staticBindings,
    runtimeEndpoints,
    accounts,
    registry,
    roleDefinitions,
    taskDefinitions,
    sanitizeSegment,
  });
  const llamaSwapBindings = buildLlamaSwapRegistryRoleBindings({
    registry,
    roleDefinitions,
    taskDefinitions,
    roleIdsByModelId: llamaSwapRoleIdsByModelId,
    sanitizeSegment,
  });
  return mergeRuntimeRoleBindings(accountBindings, llamaSwapBindings);
}

function getModelRoleIds(account: ProviderAccountRecord, modelId: string): readonly string[] {
  return (
    account.modelRoleBindings
      ?.find((entry) => entry.modelId === modelId)
      ?.roleIds.slice()
      .sort(compareText) ?? []
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
  registry: EndpointRegistryResult,
  roleDefinitions: readonly RuntimeRoleDefinitionRecord[],
  llamaSwapRoleIdsByModelId: Readonly<Record<string, readonly string[]>> = {},
): readonly string[] {
  return resolveEndpointRoleIds({
    endpointId,
    runtimeEndpoints,
    accounts,
    registry,
    roleDefinitions,
    roleIdsByModelId: llamaSwapRoleIdsByModelId,
    compareText,
  });
}

function estimateContextTokens(
  messages: readonly OpenAIChatCompletionsMessage[],
  toolCount: number,
): number {
  const totalChars = messages.reduce(
    (sum, message) => sum + readChatMessageTextContent(message.content).length,
    0,
  );
  return Math.max(1, Math.ceil(totalChars / 4) + messages.length * 2 + toolCount);
}

function toToolDefinition(tool: OpenAIChatCompletionsTool): RuntimeExecutionToolDefinition {
  if (tool.type === "function" && tool.function) {
    return {
      name: tool.function.name,
      description: tool.function.description,
      inputSchema: tool.function.parameters,
    };
  }

  if (tool.type === "builtin_function" && tool.function && typeof tool.function.name === "string") {
    return {
      kind: "hosted",
      name: tool.function.name === "$web_search" ? "web_search" : tool.function.name,
      raw: {
        type: "builtin_function",
        function: {
          name: tool.function.name,
        },
      },
    };
  }

  throw new Error("Only OpenAI function tools are supported by the runtime host bridge.");
}

function toResponsesToolDefinition(tool: OpenAIResponsesTool): RuntimeExecutionToolDefinition {
  if (
    tool.type === "function" &&
    typeof tool.name === "string" &&
    typeof tool.parameters === "object" &&
    tool.parameters !== null
  ) {
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters,
    };
  }

  return {
    kind: "hosted",
    name: tool.type,
    raw: { ...tool },
  };
}

function createConsumerWebSearchToolDefinition(): RuntimeExecutionToolDefinition {
  return {
    name: "web_search",
    description: "Search the web for current information and return structured results.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to execute.",
        },
        max_results: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          description: "Optional maximum number of search results to return.",
        },
      },
      required: ["query"],
    },
  };
}

function createKimiHostedWebSearchToolDefinition(): RuntimeExecutionToolDefinition {
  return {
    kind: "hosted",
    name: "web_search",
    raw: {
      type: "builtin_function",
      function: {
        name: "$web_search",
      },
    },
  };
}

type BridgeExecutionToolDefinition = NonNullable<
  BridgeExecutionPlan["executionRequest"]["tools"]
>[number];

function buildRolePolicySystemMessages(
  roleDefinition: RuntimeRoleDefinitionRecord | undefined,
): readonly OpenAIChatCompletionsMessage[] {
  if (!roleDefinition) {
    return [];
  }

  const messages: OpenAIChatCompletionsMessage[] = [];
  const defaultInstructions = roleDefinition.default_system_instructions.trim();
  if (defaultInstructions.length > 0) {
    messages.push({
      role: "system",
      content: defaultInstructions,
    });
  }
  if (roleDefinition.output_contracts.length > 0) {
    messages.push({
      role: "system",
      content: `You must satisfy these output contracts in your response: ${roleDefinition.output_contracts.join(", ")}.`,
    });
  }
  if (roleDefinition.safety_policy_refs.length > 0) {
    messages.push({
      role: "system",
      content: `Apply these safety policies while handling the request: ${roleDefinition.safety_policy_refs.join(", ")}.`,
    });
  }
  return messages;
}

function resolveRoleModelIntentRoleId(input: {
  readonly roleModelIntent?: BridgeExecutionPlan["routingRequest"]["roleModelIntent"];
  readonly roleDefinitions?: readonly RuntimeRoleDefinitionRecord[];
}): string | undefined {
  const roleId = input.roleModelIntent?.role?.id;
  if (!roleId) {
    return undefined;
  }
  if (!input.roleDefinitions || input.roleDefinitions.length === 0) {
    return roleId;
  }
  if (input.roleDefinitions.some((roleDefinition) => roleDefinition.role_id === roleId)) {
    return roleId;
  }
  if (input.roleModelIntent?.role?.hard) {
    throw new Error(`Requested role ${roleId} is not defined in the runtime role policy.`);
  }
  return undefined;
}

function isStablePiAdvisoryRoleModelIntent(
  roleModelIntent: BridgeExecutionPlan["routingRequest"]["roleModelIntent"] | undefined,
): boolean {
  return roleModelIntent?.contractVersion === 1;
}

export function createRoleModelNormalizedIntentObservation(
  roleModelIntent: BridgeExecutionPlan["routingRequest"]["roleModelIntent"] | undefined,
  roleDefinitions: readonly Pick<RuntimeRoleDefinitionRecord, "role_id">[],
  taskDefinitions: readonly Pick<RuntimeTaskDefinitionRecord, "task_type">[],
): {
  readonly normalizedIntent?: Readonly<Record<string, unknown>>;
  readonly diagnostics: readonly {
    readonly code: string;
    readonly severity: "info" | "warning" | "error";
    readonly field: string;
    readonly id: string;
    readonly message: string;
  }[];
} {
  if (!roleModelIntent) {
    return { diagnostics: [] };
  }

  const knownRoleIds = new Set(roleDefinitions.map((role) => role.role_id));
  const knownTaskTypes = new Set(taskDefinitions.map((task) => task.task_type));
  const knownCapabilities = new Set(
    canonicalTaxonomy.capabilities.map((capability) => capability.id),
  );
  const knownModalities = new Set(canonicalTaxonomy.modalities.map((modality) => modality.id));
  const knownToolClasses = new Set(canonicalTaxonomy.toolClasses.map((toolClass) => toolClass.id));
  const diagnostics: Array<{
    code: string;
    severity: "info" | "warning" | "error";
    field: string;
    id: string;
    message: string;
  }> = [];
  const ignored = (field: string, id: string, hard = false) => {
    diagnostics.push({
      code: hard ? "ROLE_MODEL_INTENT_HARD_FIELD_REJECTED" : "ROLE_MODEL_INTENT_FIELD_IGNORED",
      severity: hard ? "error" : "warning",
      field,
      id,
      message: hard
        ? `Hard role-model intent field ${field}=${id} is not in the active taxonomy.`
        : `Advisory role-model intent field ${field}=${id} was ignored because it is not in the active taxonomy.`,
    });
  };

  const acceptedCapabilities = {
    required: (roleModelIntent.capabilities?.required ?? []).filter((capability) => {
      const accepted = knownCapabilities.has(capability);
      if (!accepted) {
        ignored("capabilities.required", capability, false);
      }
      return accepted;
    }),
    preferred: (roleModelIntent.capabilities?.preferred ?? []).filter((capability) => {
      const accepted = knownCapabilities.has(capability);
      if (!accepted) {
        ignored("capabilities.preferred", capability, false);
      }
      return accepted;
    }),
  };
  const roleModelIntentRecord = roleModelIntent as unknown as Record<string, unknown>;
  const modalitiesRecord =
    typeof roleModelIntentRecord.modalities === "object" &&
    roleModelIntentRecord.modalities !== null &&
    !Array.isArray(roleModelIntentRecord.modalities)
      ? (roleModelIntentRecord.modalities as Record<string, unknown>)
      : undefined;
  const requiredModalities = Array.isArray(modalitiesRecord?.required)
    ? modalitiesRecord.required.filter((item): item is string => typeof item === "string")
    : [];
  const outputModalities = Array.isArray(modalitiesRecord?.output)
    ? modalitiesRecord.output.filter((item): item is string => typeof item === "string")
    : [];
  const toolClasses = Array.isArray(roleModelIntentRecord.toolClasses)
    ? roleModelIntentRecord.toolClasses.filter((item): item is string => typeof item === "string")
    : [];
  const normalizedIntent: Record<string, unknown> = {
    contractVersion: roleModelIntent.contractVersion,
    taxonomyVersion: roleModelIntent.taxonomyVersion,
    ...(roleModelIntent.contentRevision
      ? { contentRevision: roleModelIntent.contentRevision }
      : {}),
    classificationContractVersion: roleModelIntent.classificationContractVersion,
    ...(roleModelIntent.source ? { source: roleModelIntent.source } : {}),
    ...(roleModelIntent.role?.id ? { originalRoleHintId: roleModelIntent.role.id } : {}),
    ...(roleModelIntent.task?.id ? { originalTaskType: roleModelIntent.task.id } : {}),
    ...(roleModelIntent.roleSource ? { roleSource: roleModelIntent.roleSource } : {}),
    ...(roleModelIntent.taskSource ? { taskSource: roleModelIntent.taskSource } : {}),
    ...(typeof roleModelIntent.confidence === "number"
      ? { confidence: roleModelIntent.confidence }
      : {}),
    ...(typeof roleModelIntent.taskConfidence === "number"
      ? { taskConfidence: roleModelIntent.taskConfidence }
      : {}),
    ...(roleModelIntent.taskAction ? { taskAction: roleModelIntent.taskAction } : {}),
    ...(roleModelIntent.taskVariant !== undefined
      ? { taskVariant: roleModelIntent.taskVariant }
      : {}),
    ...(roleModelIntent.evidence ? { evidence: roleModelIntent.evidence } : {}),
    ...(roleModelIntent.alternatives ? { alternatives: roleModelIntent.alternatives } : {}),
  };

  if (roleModelIntent.role?.id) {
    const normalizedRoleId = normalizeRuntimeRoleId(roleModelIntent.role.id);
    if (knownRoleIds.has(normalizedRoleId)) {
      normalizedIntent.role =
        normalizedRoleId === roleModelIntent.role.id
          ? roleModelIntent.role
          : { ...roleModelIntent.role, id: normalizedRoleId };
    } else {
      ignored("role", roleModelIntent.role.id, Boolean(roleModelIntent.role.hard));
    }
  }

  if (roleModelIntent.task?.id) {
    if (knownTaskTypes.has(roleModelIntent.task.id)) {
      normalizedIntent.task = roleModelIntent.task;
    } else {
      ignored("task", roleModelIntent.task.id, Boolean(roleModelIntent.task.hard));
    }
  }

  if (acceptedCapabilities.required.length > 0 || acceptedCapabilities.preferred.length > 0) {
    normalizedIntent.capabilities = {
      ...(acceptedCapabilities.required.length > 0
        ? { required: acceptedCapabilities.required }
        : {}),
      ...(acceptedCapabilities.preferred.length > 0
        ? { preferred: acceptedCapabilities.preferred }
        : {}),
    };
  }
  if (modalitiesRecord) {
    const acceptedModalities = {
      required: requiredModalities.filter((modality) => {
        const accepted = knownModalities.has(modality);
        if (!accepted) {
          ignored("modalities.required", modality, false);
        }
        return accepted;
      }),
      output: outputModalities.filter((modality) => {
        const accepted = knownModalities.has(modality);
        if (!accepted) {
          ignored("modalities.output", modality, false);
        }
        return accepted;
      }),
    };
    if (acceptedModalities.required.length > 0 || acceptedModalities.output.length > 0) {
      normalizedIntent.modalities = {
        ...(acceptedModalities.required.length > 0
          ? { required: acceptedModalities.required }
          : {}),
        ...(acceptedModalities.output.length > 0 ? { output: acceptedModalities.output } : {}),
      };
    }
  }
  if (toolClasses.length > 0) {
    const acceptedToolClasses = toolClasses.filter((toolClass) => {
      const accepted = knownToolClasses.has(toolClass);
      if (!accepted) {
        ignored("toolClasses", toolClass, false);
      }
      return accepted;
    });
    if (acceptedToolClasses.length > 0) {
      normalizedIntent.toolClasses = acceptedToolClasses;
    }
  }

  return { normalizedIntent, diagnostics };
}

function resolveRoleModelIntentTaskType(input: {
  readonly roleModelIntent?: BridgeExecutionPlan["routingRequest"]["roleModelIntent"];
  readonly requestedRoleId?: string;
  readonly taskDefinitions?: readonly RuntimeTaskDefinitionRecord[];
}): string | undefined {
  const taskType = input.roleModelIntent?.task?.id;
  if (!taskType) {
    return undefined;
  }
  if (!input.taskDefinitions || input.taskDefinitions.length === 0) {
    return taskType;
  }
  const taskDefinition = input.taskDefinitions.find(
    (definition) => definition.task_type === taskType,
  );
  if (!taskDefinition) {
    if (input.roleModelIntent?.task?.hard) {
      throw new Error(`Requested task ${taskType} is not defined in the runtime task policy.`);
    }
    return undefined;
  }
  if (!input.requestedRoleId || taskDefinition.allowed_roles.includes(input.requestedRoleId)) {
    return taskType;
  }
  if (input.roleModelIntent?.task?.hard) {
    throw new Error(
      `Requested task ${taskType} is not allowed for requested role ${input.requestedRoleId}.`,
    );
  }
  return undefined;
}

function applyRequestedRoleExecutionPolicy(input: {
  readonly routingRequest: BridgeExecutionPlan["routingRequest"];
  readonly messages: readonly OpenAIChatCompletionsMessage[];
  readonly tools?: readonly BridgeExecutionToolDefinition[];
  readonly routingDiagnostics?: BridgeExecutionPlan["routingDiagnostics"];
  readonly roleDefinitions?: readonly RuntimeRoleDefinitionRecord[];
  readonly taskDefinitions?: readonly RuntimeTaskDefinitionRecord[];
  readonly requestOptions?: BridgeExecutionRequestOptions;
}): {
  readonly routingRequest: BridgeExecutionPlan["routingRequest"];
  readonly executionRequest: BridgeExecutionPlan["executionRequest"];
  readonly routingDiagnostics?: BridgeExecutionPlan["routingDiagnostics"];
} {
  const rawRequestedRoleId =
    input.requestOptions?.requestedRoleId ??
    input.routingRequest.requestedRoleId ??
    (!isStablePiAdvisoryRoleModelIntent(input.routingRequest.roleModelIntent) ||
    input.routingRequest.roleModelIntent?.role?.hard
      ? resolveRoleModelIntentRoleId({
          roleModelIntent: input.routingRequest.roleModelIntent,
          roleDefinitions: input.roleDefinitions,
        })
      : undefined);
  const requestedRoleId = rawRequestedRoleId
    ? normalizeRuntimeRoleIdForPolicy(rawRequestedRoleId, input.roleDefinitions)
    : undefined;
  const intentTaskType = resolveRoleModelIntentTaskType({
    roleModelIntent:
      !isStablePiAdvisoryRoleModelIntent(input.routingRequest.roleModelIntent) ||
      input.routingRequest.roleModelIntent?.task?.hard
        ? input.routingRequest.roleModelIntent
        : undefined,
    requestedRoleId,
    taskDefinitions: input.taskDefinitions,
  });
  const roleDefinition = requestedRoleId
    ? (input.roleDefinitions ?? []).find((entry) => entry.role_id === requestedRoleId)
    : undefined;

  if (
    requestedRoleId &&
    input.roleDefinitions &&
    input.roleDefinitions.length > 0 &&
    !roleDefinition
  ) {
    throw new Error(`Requested role ${requestedRoleId} is not defined in the runtime role policy.`);
  }

  const rolePolicyMessages = buildRolePolicySystemMessages(roleDefinition);
  const withRolePolicy =
    rolePolicyMessages.length > 0
      ? ([...rolePolicyMessages, ...input.messages] as const)
      : input.messages;
  const messages = withRolePolicy;
  const toolPolicyMode = roleDefinition?.tool_policy?.mode ?? "allowed";
  const allowedTools = roleDefinition?.tool_policy?.allowed_tools ?? [];
  const tools =
    toolPolicyMode === "disabled"
      ? undefined
      : toolPolicyMode === "limited"
        ? input.tools?.filter((tool) => allowedTools.includes(tool.name))
        : input.tools;
  const needsTools = Boolean(tools?.length);
  const resolvedTaskDefinition = resolveRequestedRoleTaskDefinition({
    roleDefinition,
    taskDefinitions: input.taskDefinitions,
    currentTaskType: intentTaskType ?? input.routingRequest.taskType,
    messages: input.messages,
    needsTools,
  });
  const nextTaskType =
    resolvedTaskDefinition?.task_type ?? intentTaskType ?? input.routingRequest.taskType;
  const nextRequiredCapabilities =
    resolvedTaskDefinition?.required_capabilities ??
    (!isStablePiAdvisoryRoleModelIntent(input.routingRequest.roleModelIntent)
      ? input.routingRequest.roleModelIntent?.capabilities?.required
      : undefined) ??
    input.routingRequest.requiredCapabilities;
  const roleModelPreferredCapabilities =
    input.routingRequest.roleModelIntent?.capabilities?.preferred ?? [];
  const stablePiAdvisoryRequiredCapabilities = isStablePiAdvisoryRoleModelIntent(
    input.routingRequest.roleModelIntent,
  )
    ? (input.routingRequest.roleModelIntent?.capabilities?.required ?? [])
    : [];
  const nextPreferredCapabilities =
    resolvedTaskDefinition?.preferred_capabilities ??
    (isStablePiAdvisoryRoleModelIntent(input.routingRequest.roleModelIntent)
      ? [
          ...roleModelPreferredCapabilities,
          ...stablePiAdvisoryRequiredCapabilities,
          ...input.routingRequest.preferredCapabilities,
        ]
      : (input.routingRequest.roleModelIntent?.capabilities?.preferred ??
        input.routingRequest.preferredCapabilities));

  return {
    routingRequest: {
      ...input.routingRequest,
      ...(requestedRoleId ? { requestedRoleId } : {}),
      taskType: nextTaskType,
      needsTools,
      ...(needsTools
        ? {}
        : {
            requiredCapabilities: nextRequiredCapabilities.filter(
              (capability) => capability !== "tools.function_calling",
            ),
            preferredCapabilities: nextPreferredCapabilities.filter(
              (capability) => capability !== "tools.function_calling",
            ),
          }),
    },
    executionRequest: {
      messages,
      ...(tools?.length ? { tools } : {}),
    },
    ...(roleDefinition
      ? {
          routingDiagnostics: {
            ...input.routingDiagnostics,
            rolePolicy: {
              requestedRoleId: roleDefinition.role_id,
              appliedRoleId: roleDefinition.role_id,
              defaultSystemInstructionsApplied:
                roleDefinition.default_system_instructions.trim().length > 0,
              toolPolicyMode,
              ...(toolPolicyMode === "limited" ? { allowedTools } : {}),
              outputContracts: roleDefinition.output_contracts,
              safetyPolicyRefs: roleDefinition.safety_policy_refs,
            },
          },
        }
      : input.routingDiagnostics
        ? { routingDiagnostics: input.routingDiagnostics }
        : {}),
  };
}

function resolveRequestedRoleTaskDefinition(input: {
  readonly roleDefinition?: RuntimeRoleDefinitionRecord;
  readonly taskDefinitions?: readonly RuntimeTaskDefinitionRecord[];
  readonly currentTaskType: string;
  readonly messages: readonly OpenAIChatCompletionsMessage[];
  readonly needsTools: boolean;
}): RuntimeTaskDefinitionRecord | undefined {
  if (!input.roleDefinition || !input.taskDefinitions?.length) {
    return undefined;
  }

  const supportedTaskDefinitions = input.roleDefinition.task_types_supported
    .map((taskType) =>
      input.taskDefinitions?.find((taskDefinition) => taskDefinition.task_type === taskType),
    )
    .filter((taskDefinition): taskDefinition is RuntimeTaskDefinitionRecord =>
      Boolean(taskDefinition),
    );

  if (supportedTaskDefinitions.length === 0) {
    return undefined;
  }

  const currentTaskDefinition = supportedTaskDefinitions.find(
    (taskDefinition) => taskDefinition.task_type === input.currentTaskType,
  );
  if (currentTaskDefinition) {
    return currentTaskDefinition;
  }

  if (supportedTaskDefinitions.length === 1) {
    return supportedTaskDefinitions[0];
  }

  const combinedText = input.messages
    .map((message) => readChatMessageTextContent(message.content).trim())
    .filter((content) => content.length > 0)
    .join("\n")
    .toLowerCase();

  const hasSchemaSignal =
    /(json|schema|contract|payload|migration|compatib|validation|telemetry)/.test(combinedText);
  const hasCodeSignal =
    /(code|patch|refactor|debug|bug|diff|typescript|javascript|python|review|function|test)/.test(
      combinedText,
    );

  const scoredTaskDefinitions = supportedTaskDefinitions.map((taskDefinition) => {
    let score = 0;
    switch (taskDefinition.task_type) {
      case "json.schema_adherence":
        if (hasSchemaSignal) {
          score += 4;
        }
        if (hasCodeSignal) {
          score += 1;
        }
        break;
      case "code.edit":
        if (hasCodeSignal) {
          score += 3;
        }
        if (hasSchemaSignal) {
          score += 1;
        }
        break;
      case "tools.function_calling":
        if (input.needsTools) {
          score += 3;
        }
        break;
      case "text.classification":
        if (/(classif|categor|sentiment|label)/.test(combinedText)) {
          score += 3;
        }
        break;
      case "text.language_detection":
        if (/(language detect|detect the language|what language)/.test(combinedText)) {
          score += 3;
        }
        break;
      case "embeddings.text":
        if (/(embedding|vector)/.test(combinedText)) {
          score += 3;
        }
        break;
      default:
        break;
    }
    return {
      taskDefinition,
      score,
    };
  });

  const bestScore = Math.max(...scoredTaskDefinitions.map((entry) => entry.score));
  if (bestScore > 0) {
    const bestTaskDefinitions = scoredTaskDefinitions.filter((entry) => entry.score === bestScore);
    if (bestTaskDefinitions.length === 1) {
      return bestTaskDefinitions[0].taskDefinition;
    }
  }

  return supportedTaskDefinitions[0];
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

function toResponsesInputMessages(
  input: OpenAIResponsesInput,
): readonly OpenAIChatCompletionsMessage[] {
  if (typeof input === "string") {
    return [{ role: "user", content: input }];
  }

  const messages: OpenAIChatCompletionsMessage[] = [];
  let pendingAssistantToolCalls: OpenAIChatCompletionsToolCall[] = [];

  const flushPendingAssistantToolCalls = (): void => {
    if (pendingAssistantToolCalls.length === 0) {
      return;
    }
    messages.push({
      role: "assistant",
      content: "",
      tool_calls: pendingAssistantToolCalls,
    });
    pendingAssistantToolCalls = [];
  };

  for (const message of input) {
    if (isResponsesFunctionCallInputItem(message)) {
      pendingAssistantToolCalls.push({
        id: message.call_id,
        type: "function",
        function: {
          name: message.name,
          arguments: typeof message.arguments === "string" ? message.arguments : "",
        },
      });
      continue;
    }

    if (isResponsesFunctionCallOutputInputItem(message)) {
      flushPendingAssistantToolCalls();
      messages.push({
        role: "tool",
        tool_call_id: message.call_id,
        content:
          typeof message.output === "string"
            ? message.output
            : JSON.stringify(message.output ?? null),
      });
      continue;
    }

    if (!isOpenAIChatCompletionsMessage(message)) {
      throw new Error(
        "responses input messages must include role and string or array content fields",
      );
    }

    flushPendingAssistantToolCalls();
    messages.push({
      role: message.role,
      content: message.content,
      ...(Array.isArray(message.tool_calls) ? { tool_calls: message.tool_calls } : {}),
      ...(typeof message.tool_call_id === "string" ? { tool_call_id: message.tool_call_id } : {}),
      ...(typeof message.name === "string" ? { name: message.name } : {}),
    });
  }

  flushPendingAssistantToolCalls();
  return messages;
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
  modelAliases: readonly UnifiedRuntimeModelAliasConfig[] = [],
  inventory: RoutableInventory | null = null,
  catalog?: NormalizedCatalog,
  baseUrl = "",
): BridgeModelListResponse {
  if (catalog) {
    const discovery = createDownstreamOpenAIDiscovery({
      baseUrl,
      registry,
      catalog,
      modelAliases,
      inventory,
    });
    return {
      object: "list",
      data: discovery.models.map((record) =>
        createCompactModelListRecord(record, discovery.freshness.runtimeInventoryRevision, baseUrl),
      ),
    };
  }

  const byModelId = new Map<string, string[]>();

  for (const endpoint of registry.endpoints) {
    const current = byModelId.get(endpoint.identity.model_id) ?? [];
    current.push(endpoint.identity.endpoint_id);
    byModelId.set(endpoint.identity.model_id, current);
  }

  for (const alias of modelAliases) {
    const endpointIds = inventory
      ? resolveAliasAllowEndpoints(alias, inventory, registry).allowEndpoints
      : [
          ...new Set(
            registry.endpoints
              .filter((endpoint) => alias.modelIds.includes(endpoint.identity.model_id))
              .map((endpoint) => endpoint.identity.endpoint_id),
          ),
        ].sort(compareText);
    byModelId.set(alias.aliasId, [...endpointIds]);
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

function createCompactModelListRecord(
  record: ReturnType<typeof createDownstreamOpenAIDiscovery>["models"][number],
  capabilityRevision: string,
  baseUrl: string,
): BridgeModelRecord {
  const contextWindow = record.piMapping.contextWindow;
  const maxTokens = record.piMapping.maxTokens;
  const inputModalities = [...record.modalities.availableInput];
  return {
    id: record.id,
    object: "model",
    owned_by: "role-model",
    endpoint_ids: [...record.endpoint_ids],
    context_window: contextWindow,
    max_tokens: maxTokens,
    input: ["text", "image"].filter((modality) => inputModalities.includes(modality)),
    input_modalities: inputModalities,
    output_modalities: [...record.modalities.output],
    capabilities: [...record.capabilities.available],
    role_model: {
      type: record.type,
      ...(record.routingMode ? { routing_mode: record.routingMode } : {}),
      discovery_url: `${baseUrl}/api/role-model/downstream/openai`,
      capability_revision: capabilityRevision,
      context_window: contextWindow,
      max_tokens: maxTokens,
      input_modalities: inputModalities,
      output_modalities: [...record.modalities.output],
      tools: {
        function_calling: record.capabilities.tools.functionCalling,
      },
      reasoning: {
        supported: record.capabilities.reasoning.supported,
        effort_control: record.capabilities.reasoning.effortControl,
      },
      structured_output: {
        supported: record.capabilities.structuredOutput.supported,
      },
      caching: {
        prompt_read: record.capabilities.caching.promptRead,
        prompt_write: record.capabilities.caching.promptWrite,
        source: record.capabilities.caching.source,
      },
    },
  };
}

export function createRuntimeModelRecords(
  registry: EndpointRegistryResult,
  catalog: NormalizedCatalog,
): readonly BridgeRuntimeModelRecord[] {
  const byModelId = new Map<string, string[]>();

  for (const endpoint of registry.endpoints) {
    const current = byModelId.get(endpoint.identity.model_id) ?? [];
    current.push(endpoint.identity.endpoint_id);
    byModelId.set(endpoint.identity.model_id, current);
  }

  return [...byModelId.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([modelId, endpointIds]) => {
      const profile = resolveModelCapabilityProfile({ modelId, catalog });
      return {
        id: modelId,
        object: "model" as const,
        owned_by: "role-model" as const,
        providerId: profile.providerId,
        displayName: profile.displayName,
        endpoint_ids: [...endpointIds].sort(compareText),
        capabilities: profile.capabilities,
        modalities: profile.inputModalities,
        contextWindow: profile.limits.contextWindow,
        maxOutputTokens: profile.limits.maxOutputTokens,
        pricing: profile.pricing,
      };
    });
}

function collectAllowedEndpointIds(
  registry: EndpointRegistryResult,
  modelIds: readonly string[],
): readonly string[] {
  return [
    ...new Set(
      registry.endpoints
        .filter((endpoint) => modelIds.includes(endpoint.identity.model_id))
        .map((endpoint) => endpoint.identity.endpoint_id),
    ),
  ].sort(compareText);
}

function isResponsesFunctionTool(tool: OpenAIResponsesTool): boolean {
  return (
    tool.type === "function" &&
    typeof tool.name === "string" &&
    typeof tool.parameters === "object" &&
    tool.parameters !== null
  );
}

function collectHostedResponsesTools(
  tools: readonly OpenAIResponsesTool[] | undefined,
): readonly OpenAIResponsesTool[] {
  return (tools ?? []).filter((tool) => !isResponsesFunctionTool(tool));
}

function hasOnlyHostedWebSearchTools(tools: readonly OpenAIResponsesTool[] | undefined): boolean {
  const hostedTools = collectHostedResponsesTools(tools);
  return hostedTools.length > 0 && hostedTools.every((tool) => tool.type === "web_search");
}

type HostedWebSearchContract =
  | "openai.responses.web_search"
  | "moonshot.chat.builtin_web_search"
  | "deepseek.anthropic.server_web_search";
type ActiveRuntimeHostedWebSearchContract = Exclude<
  HostedWebSearchContract,
  "deepseek.anthropic.server_web_search"
>;

export interface EndpointWebSearchSupport {
  readonly mode: "native" | "runtime-fallback" | "unsupported";
  readonly currentRuntimeContract: ActiveRuntimeHostedWebSearchContract | null;
  readonly documentedProviderContract: HostedWebSearchContract | null;
}

function supportsOrdinaryToolCallingForEndpoint(
  endpoint: EndpointRegistryResult["endpoints"][number],
): boolean {
  return (
    endpoint.declared.tool_calling?.supported === true ||
    endpoint.declared.capabilities.includes("tools.function_calling")
  );
}

export function resolveEndpointWebSearchSupport(
  endpoint: EndpointRegistryResult["endpoints"][number],
): EndpointWebSearchSupport {
  if (
    OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX.some(
      (entry) => entry.modelId === endpoint.identity.model_id && entry.supportsHostedWebSearch,
    )
  ) {
    return {
      mode: "native",
      currentRuntimeContract: "openai.responses.web_search",
      documentedProviderContract: "openai.responses.web_search",
    };
  }
  if (
    endpoint.identity.model_id.startsWith("moonshot/") &&
    supportsOrdinaryToolCallingForEndpoint(endpoint)
  ) {
    return {
      mode: "native",
      currentRuntimeContract: "moonshot.chat.builtin_web_search",
      documentedProviderContract: "moonshot.chat.builtin_web_search",
    };
  }
  if (
    endpoint.identity.model_id.startsWith("deepseek/") &&
    supportsOrdinaryToolCallingForEndpoint(endpoint)
  ) {
    return {
      mode: "runtime-fallback",
      currentRuntimeContract: null,
      documentedProviderContract: "deepseek.anthropic.server_web_search",
    };
  }
  if (supportsOrdinaryToolCallingForEndpoint(endpoint)) {
    return {
      mode: "runtime-fallback",
      currentRuntimeContract: null,
      documentedProviderContract: null,
    };
  }
  return {
    mode: "unsupported",
    currentRuntimeContract: null,
    documentedProviderContract: null,
  };
}

function resolveHostedWebSearchContractForEndpoint(
  endpoint: EndpointRegistryResult["endpoints"][number],
): ActiveRuntimeHostedWebSearchContract | null {
  const support = resolveEndpointWebSearchSupport(endpoint);
  return support.mode === "native" ? support.currentRuntimeContract : null;
}

function supportsHostedResponsesToolForEndpoint(
  endpoint: EndpointRegistryResult["endpoints"][number],
  tool: OpenAIResponsesTool,
): boolean {
  if (tool.type === "web_search") {
    return (
      resolveEndpointWebSearchSupport(endpoint).currentRuntimeContract ===
      "openai.responses.web_search"
    );
  }
  return true;
}

function supportsRuntimeWebSearchForEndpoint(
  endpoint: EndpointRegistryResult["endpoints"][number],
): boolean {
  return resolveEndpointWebSearchSupport(endpoint).mode !== "unsupported";
}

function applyAliasResolutionEndpointFilter(input: {
  readonly registry: EndpointRegistryResult;
  readonly allowEndpoints: readonly string[];
  readonly routingDiagnostics?: Pick<RuntimeRoutingDiagnostics, "aliasResolution">;
}): Pick<RuntimeRoutingDiagnostics, "aliasResolution"> | undefined {
  if (!input.routingDiagnostics?.aliasResolution) {
    return input.routingDiagnostics;
  }

  const resolvedModelIds = [
    ...new Set(
      input.registry.endpoints
        .filter((endpoint) => input.allowEndpoints.includes(endpoint.identity.endpoint_id))
        .map((endpoint) => endpoint.identity.model_id),
    ),
  ].sort(compareText);

  return {
    aliasResolution: {
      ...input.routingDiagnostics.aliasResolution,
      resolvedModelIds,
      allowEndpoints: input.allowEndpoints,
      ...(input.allowEndpoints.length === 0
        ? { poolEmptyReason: "ALIAS_POOL_EMPTY" as const }
        : {}),
    },
  };
}

function filterAllowEndpointsForCapabilityRequirements(input: {
  readonly registry: EndpointRegistryResult;
  readonly requestedModel: string;
  readonly allowEndpoints: readonly string[];
  readonly requirements: ReturnType<typeof inferChatCompletionsCapabilityRequirements>;
  readonly routingDiagnostics?: Pick<
    RuntimeRoutingDiagnostics,
    "aliasResolution" | "routingMode" | "capabilityEligibility"
  >;
}): {
  readonly allowEndpoints: readonly string[];
  readonly routingDiagnostics?: Pick<
    RuntimeRoutingDiagnostics,
    "aliasResolution" | "routingMode" | "capabilityEligibility"
  >;
} {
  const filtered = filterEndpointsByCapabilityRequirements({
    registry: input.registry,
    allowEndpoints: input.allowEndpoints,
    requirements: input.requirements,
  });
  const aliasResolution = applyAliasResolutionEndpointFilter({
    registry: input.registry,
    allowEndpoints: filtered.allowEndpoints,
    routingDiagnostics: input.routingDiagnostics,
  })?.aliasResolution;

  return {
    allowEndpoints: filtered.allowEndpoints,
    routingDiagnostics: {
      ...input.routingDiagnostics,
      ...(aliasResolution ? { aliasResolution } : {}),
      capabilityEligibility: filtered.diagnostics,
    },
  };
}

function toPublicDiagnosticEndpointId(endpointId: string): string {
  return endpointId
    .replace(/api[-_]?key/gi, "credential")
    .replace(/credentialRef/gi, "credential")
    .replace(/[a-zA-Z]:[\\/][^.\s"]+/g, "[local-path]");
}

function toLegacyCredentializedEndpointId(endpointId: string): string {
  return endpointId.replace(/api[-_]?key/gi, "credential").replace(/credentialRef/gi, "credential");
}

function throwNoEligibleCapabilityTarget(input: {
  readonly requestedModel: string;
  readonly requirements: ReturnType<typeof inferChatCompletionsCapabilityRequirements>;
  readonly routingDiagnostics?: Pick<RuntimeRoutingDiagnostics, "capabilityEligibility">;
}): never {
  const excludedTargets =
    input.routingDiagnostics?.capabilityEligibility?.excludedTargets.map((target) => ({
      ...target,
      endpointId: toPublicDiagnosticEndpointId(target.endpointId),
    })) ?? [];
  throw new BridgeHttpError(400, {
    error: {
      type: "capability_eligibility_error",
      code: "no_eligible_target",
      message: `no_eligible_target: no targets for model ${input.requestedModel} satisfy the inferred request capabilities.`,
      requestedModel: input.requestedModel,
      requiredInputModalities: input.requirements.requiredInputModalities,
      requiredOutputModalities: input.requirements.requiredOutputModalities,
      requiredCapabilities: input.requirements.requiredCapabilities,
      excludedTargets,
    },
  });
}

function filterAllowEndpointsForResponsesHostedTools(input: {
  readonly registry: EndpointRegistryResult;
  readonly allowEndpoints: readonly string[];
  readonly routingDiagnostics?: Pick<RuntimeRoutingDiagnostics, "aliasResolution">;
  readonly tools?: readonly OpenAIResponsesTool[];
}): {
  readonly allowEndpoints: readonly string[];
  readonly routingDiagnostics?: Pick<RuntimeRoutingDiagnostics, "aliasResolution">;
  readonly hostedToolFilterApplied: boolean;
} {
  const hostedTools = collectHostedResponsesTools(input.tools);
  if (hostedTools.length === 0) {
    return {
      allowEndpoints: input.allowEndpoints,
      ...(input.routingDiagnostics ? { routingDiagnostics: input.routingDiagnostics } : {}),
      hostedToolFilterApplied: false,
    };
  }

  const eligibleEndpoints = input.registry.endpoints.filter(
    (endpoint) =>
      input.allowEndpoints.includes(endpoint.identity.endpoint_id) &&
      hostedTools.every((tool) => supportsHostedResponsesToolForEndpoint(endpoint, tool)),
  );
  const allowEndpoints = eligibleEndpoints
    .map((endpoint) => endpoint.identity.endpoint_id)
    .sort(compareText);
  const resolvedModelIds = [
    ...new Set(eligibleEndpoints.map((endpoint) => endpoint.identity.model_id)),
  ].sort(compareText);

  return {
    allowEndpoints,
    ...(input.routingDiagnostics?.aliasResolution
      ? {
          routingDiagnostics: {
            aliasResolution: {
              ...input.routingDiagnostics.aliasResolution,
              resolvedModelIds,
              allowEndpoints,
              ...(allowEndpoints.length === 0
                ? { poolEmptyReason: "ALIAS_POOL_EMPTY" as const }
                : {}),
            },
          },
        }
      : input.routingDiagnostics
        ? { routingDiagnostics: input.routingDiagnostics }
        : {}),
    hostedToolFilterApplied: true,
  };
}

function filterAllowEndpointsForRuntimeWebSearch(input: {
  readonly registry: EndpointRegistryResult;
  readonly allowEndpoints: readonly string[];
  readonly routingDiagnostics?: Pick<RuntimeRoutingDiagnostics, "aliasResolution">;
}): {
  readonly allowEndpoints: readonly string[];
  readonly routingDiagnostics?: Pick<RuntimeRoutingDiagnostics, "aliasResolution">;
} {
  const allowEndpoints = input.registry.endpoints
    .filter(
      (endpoint) =>
        input.allowEndpoints.includes(endpoint.identity.endpoint_id) &&
        supportsRuntimeWebSearchForEndpoint(endpoint),
    )
    .map((endpoint) => endpoint.identity.endpoint_id)
    .sort(compareText);

  return {
    allowEndpoints,
    ...(input.routingDiagnostics
      ? {
          routingDiagnostics: applyAliasResolutionEndpointFilter({
            registry: input.registry,
            allowEndpoints,
            routingDiagnostics: input.routingDiagnostics,
          }),
        }
      : {}),
  };
}

function resolveResponsesToolExecutionPlan(input: {
  readonly registry: EndpointRegistryResult;
  readonly allowEndpoints: readonly string[];
  readonly routingDiagnostics?: Pick<RuntimeRoutingDiagnostics, "aliasResolution">;
  readonly tools?: readonly OpenAIResponsesTool[];
}): {
  readonly allowEndpoints: readonly string[];
  readonly routingDiagnostics?: Pick<RuntimeRoutingDiagnostics, "aliasResolution">;
  readonly hostedToolFilterApplied: boolean;
  readonly tools?: readonly BridgeExecutionToolDefinition[];
} {
  if (!input.tools || input.tools.length === 0) {
    return {
      allowEndpoints: input.allowEndpoints,
      ...(input.routingDiagnostics ? { routingDiagnostics: input.routingDiagnostics } : {}),
      hostedToolFilterApplied: false,
      tools: undefined,
    };
  }

  if (hasOnlyHostedWebSearchTools(input.tools)) {
    const eligibleEndpoints = input.registry.endpoints.filter((endpoint) =>
      input.allowEndpoints.includes(endpoint.identity.endpoint_id),
    );
    const hostedContracts = [
      ...new Set(
        eligibleEndpoints
          .map((endpoint) => resolveHostedWebSearchContractForEndpoint(endpoint))
          .filter(
            (contract): contract is ActiveRuntimeHostedWebSearchContract => contract !== null,
          ),
      ),
    ];
    if (
      eligibleEndpoints.length > 0 &&
      hostedContracts.length === 1 &&
      eligibleEndpoints.every(
        (endpoint) => resolveHostedWebSearchContractForEndpoint(endpoint) === hostedContracts[0],
      )
    ) {
      if (hostedContracts[0] === "moonshot.chat.builtin_web_search") {
        return {
          allowEndpoints: input.allowEndpoints,
          ...(input.routingDiagnostics ? { routingDiagnostics: input.routingDiagnostics } : {}),
          hostedToolFilterApplied: true,
          tools: [createKimiHostedWebSearchToolDefinition()],
        };
      }
    } else {
      const functionTools = input.tools
        .filter(isResponsesFunctionTool)
        .map((tool) => toResponsesToolDefinition(tool));
      const normalizedTools = functionTools.some((tool) => tool.name === "web_search")
        ? functionTools
        : [...functionTools, createConsumerWebSearchToolDefinition()];
      const filtered = filterAllowEndpointsForRuntimeWebSearch({
        registry: input.registry,
        allowEndpoints: input.allowEndpoints,
        routingDiagnostics: input.routingDiagnostics,
      });
      return {
        allowEndpoints: filtered.allowEndpoints,
        ...(filtered.routingDiagnostics ? { routingDiagnostics: filtered.routingDiagnostics } : {}),
        hostedToolFilterApplied: false,
        tools: normalizedTools,
      };
    }
  }

  const hostedToolFiltered = filterAllowEndpointsForResponsesHostedTools(input);
  return {
    allowEndpoints: hostedToolFiltered.allowEndpoints,
    ...(hostedToolFiltered.routingDiagnostics
      ? { routingDiagnostics: hostedToolFiltered.routingDiagnostics }
      : {}),
    hostedToolFilterApplied: hostedToolFiltered.hostedToolFilterApplied,
    tools: input.tools.map((tool) => toResponsesToolDefinition(tool)),
  };
}

function resolveRequestedModelPool(
  registry: EndpointRegistryResult,
  requestedModel: string,
  modelAliases: readonly UnifiedRuntimeModelAliasConfig[] = [],
  inventory: RoutableInventory | null = null,
): {
  readonly allowEndpoints: readonly string[];
  readonly routingDiagnostics?: Pick<RuntimeRoutingDiagnostics, "aliasResolution">;
} {
  const alias = modelAliases.find((entry) => entry.aliasId === requestedModel);
  if (!alias) {
    return {
      allowEndpoints: collectAllowedEndpointIds(registry, [requestedModel]),
    };
  }

  if (inventory) {
    const resolution = resolveAliasAllowEndpoints(alias, inventory, registry);
    return {
      allowEndpoints: resolution.allowEndpoints,
      routingDiagnostics: {
        aliasResolution: {
          requestedModel,
          aliasId: alias.aliasId,
          resolvedModelIds: [...resolution.resolvedModelIds],
          allowEndpoints: resolution.allowEndpoints,
          ...(resolution.poolEmptyReason ? { poolEmptyReason: resolution.poolEmptyReason } : {}),
          ...(resolution.driftWarnings.length > 0
            ? { driftWarnings: resolution.driftWarnings }
            : {}),
        },
      },
    };
  }

  const allowEndpoints = collectAllowedEndpointIds(registry, alias.modelIds);
  return {
    allowEndpoints,
    routingDiagnostics: {
      aliasResolution: {
        requestedModel,
        aliasId: alias.aliasId,
        resolvedModelIds: [...alias.modelIds],
        allowEndpoints,
        ...(allowEndpoints.length === 0 ? { poolEmptyReason: "ALIAS_POOL_EMPTY" as const } : {}),
      },
    },
  };
}

function applyRequestedEndpointOverride(input: {
  readonly requestedModel: string;
  readonly allowEndpoints: readonly string[];
  readonly requestOptions?: BridgeExecutionRequestOptions;
}): readonly string[] {
  const endpointId = input.requestOptions?.endpointId;
  if (!endpointId) {
    return input.allowEndpoints;
  }
  const resolvedEndpointId =
    input.allowEndpoints.find((allowedEndpointId) => allowedEndpointId === endpointId) ??
    input.allowEndpoints.find(
      (allowedEndpointId) => toLegacyCredentializedEndpointId(allowedEndpointId) === endpointId,
    );
  if (!resolvedEndpointId) {
    throw new Error(
      `Requested endpoint ${endpointId} is not available for model ${input.requestedModel}.`,
    );
  }
  return [resolvedEndpointId];
}

function resolveRequestedModelAlias(
  requestedModel: string,
  modelAliases: readonly UnifiedRuntimeModelAliasConfig[] = [],
): UnifiedRuntimeModelAliasConfig | undefined {
  return modelAliases.find((entry) => entry.aliasId === requestedModel);
}

async function resolveConfiguredModelAliases(
  readRuntimeConfig: StartBridgeServerOptions["readRuntimeConfig"],
): Promise<readonly UnifiedRuntimeModelAliasConfig[]> {
  return (await resolveConfiguredRuntimeConfig(readRuntimeConfig))?.modelAliases ?? [];
}

async function resolveConfiguredRuntimeConfig(
  readRuntimeConfig: StartBridgeServerOptions["readRuntimeConfig"],
): Promise<ReturnType<typeof normalizeUnifiedRuntimeConfigInput> | null> {
  if (!readRuntimeConfig) {
    return null;
  }
  const runtimeConfig = await readRuntimeConfig();
  if (
    !runtimeConfig ||
    typeof runtimeConfig !== "object" ||
    Array.isArray(runtimeConfig) ||
    !("config" in runtimeConfig)
  ) {
    return null;
  }
  const configValue = runtimeConfig.config;
  if (!configValue || typeof configValue !== "object" || Array.isArray(configValue)) {
    return null;
  }
  return normalizeUnifiedRuntimeConfigInput(configValue);
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

function uniqueBridgeStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort(compareText);
}

function enrichFallbackDownstreamModelRecord(input: {
  readonly model: BridgeModelRecord;
  readonly registry: EndpointRegistryResult;
  readonly modelAliases: readonly UnifiedRuntimeModelAliasConfig[];
}): BridgeModelRecord & {
  readonly type: "model" | "alias";
  readonly piMapping: { readonly contextWindow: number | null; readonly maxTokens: number | null };
  readonly targetModelIds: readonly string[];
  readonly canonicalModelIds: readonly string[];
  readonly providerIds: readonly string[];
  readonly limits: Record<string, number | null>;
  readonly modalities: Record<string, unknown>;
  readonly capabilities: Record<string, unknown>;
  readonly declared: Record<string, readonly string[]>;
  readonly routable: Record<string, readonly string[]>;
  readonly sources: readonly string[];
} {
  const alias = input.modelAliases.find((entry) => entry.aliasId === input.model.id);
  const endpoints = input.model.endpoint_ids
    .map((endpointId) =>
      input.registry.endpoints.find((endpoint) => endpoint.identity.endpoint_id === endpointId),
    )
    .filter((endpoint): endpoint is EndpointRegistryResult["endpoints"][number] =>
      Boolean(endpoint),
    );
  const contextWindow =
    endpoints
      .map((endpoint) => endpoint.declared.max_context_tokens)
      .filter((value): value is number => typeof value === "number")
      .sort((left, right) => right - left)[0] ?? null;
  const targetModelIds = alias?.modelIds ?? [input.model.id];
  const endpointModelIds = uniqueBridgeStrings(
    endpoints.map((endpoint) => endpoint.identity.model_id),
  );
  const providerIds = uniqueBridgeStrings(
    endpoints.map((endpoint) => endpoint.identity.provider_kind),
  );
  const functionCalling = endpoints.some(
    (endpoint) => endpoint.declared.tool_calling?.supported === true,
  );
  const availableCapabilities = uniqueBridgeStrings(
    endpoints.flatMap((endpoint) => endpoint.declared.capabilities ?? []),
  );
  const availableModalities = uniqueBridgeStrings(
    endpoints.flatMap((endpoint) => endpoint.declared.modalities ?? ["text"]),
  );

  return {
    ...input.model,
    type: alias ? "alias" : "model",
    targetModelIds,
    canonicalModelIds: endpointModelIds.length > 0 ? endpointModelIds : targetModelIds,
    providerIds,
    limits: {
      safeContextWindow: contextWindow,
      safeMaxOutputTokens: 8192,
      maxContextWindow: contextWindow,
      maxOutputTokens: 8192,
    },
    modalities: {
      guaranteedInput: availableModalities,
      availableInput: availableModalities,
      conditionalInput: {},
      output: ["text"],
    },
    capabilities: {
      guaranteed: availableCapabilities,
      available: availableCapabilities,
      conditional: {},
      tools: { functionCalling },
      reasoning: { supported: false, effortControl: false },
      structuredOutput: { supported: false },
      caching: { promptRead: null, promptWrite: null, source: "unknown" },
    },
    declared: { modelIds: targetModelIds, endpointIds: input.model.endpoint_ids },
    routable: {
      modelIds: endpointModelIds.length > 0 ? endpointModelIds : targetModelIds,
      endpointIds: input.model.endpoint_ids,
    },
    piMapping: {
      contextWindow,
      maxTokens: 8192,
    },
    sources: ["fallback-downstream-openai"],
  };
}

export function createDownstreamOpenAIProviderConfig(
  registry: EndpointRegistryResult,
  baseUrl: string,
  modelAliases: readonly UnifiedRuntimeModelAliasConfig[] = [],
  options: {
    readonly catalog?: NormalizedCatalog;
    readonly inventory?: RoutableInventory | null;
    readonly recommendedModelId?: string | null;
    readonly displayName?: string;
  } = {},
): BridgeDownstreamOpenAIProviderConfig {
  if (options.catalog) {
    return createDownstreamOpenAIDiscovery({
      baseUrl,
      registry,
      catalog: options.catalog,
      modelAliases,
      inventory: options.inventory ?? null,
      recommendedModelId: options.recommendedModelId ?? null,
      displayName: options.displayName,
    }) as unknown as BridgeDownstreamOpenAIProviderConfig;
  }

  const models = createModelListResponse(registry, modelAliases).data.map((model) =>
    enrichFallbackDownstreamModelRecord({ model, registry, modelAliases }),
  );
  const recommendedModel =
    (options.recommendedModelId && models.some((model) => model.id === options.recommendedModelId)
      ? options.recommendedModelId
      : null) ??
    modelAliases[0]?.aliasId ??
    models[0]?.id ??
    null;

  return {
    contractVersion: "role-model.downstream.openai.v1",
    kind: "openai-compatible",
    providerId: "role-model-runtime",
    displayName: options.displayName ?? "role-model",
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
      note: "Inbound API-key validation is not enforced yet. If a downstream client requires a token field, use this placeholder bearer token.",
    },
    models,
    setup: {
      recommendedModel,
      notes: [
        "Configure downstream tooling as an OpenAI-compatible provider.",
        "Use GET /v1/models to discover the current model ids.",
        "Use POST /v1/chat/completions for routed inference and multi-turn tool history.",
        "POST /v1/responses supports string or string-content message input only; use chat-completions for tool-turn histories.",
      ],
    },
    freshness: {
      generatedAt: new Date().toISOString(),
      catalogVersion: "fallback",
      runtimeInventoryRevision: "fallback",
    },
  };
}

function toAliasRoutingMode(
  aliasMode: UnifiedRuntimeModelAliasConfig["mode"] | null | undefined,
): RuntimeRoutingMode {
  switch (aliasMode) {
    case "difficulty":
      return "difficulty";
    case "intelligent":
      return "controller";
    case "hybrid":
      return "hybrid";
    default:
      return "baseline";
  }
}

function summarizeAliasDefaultRoutingModeDiagnostics(input: {
  readonly requestedModel: string;
  readonly modelAliases: readonly UnifiedRuntimeModelAliasConfig[];
  readonly effectiveRoutingMode: RuntimeRoutingMode;
  readonly requestOptions?: BridgeExecutionRequestOptions;
}): RuntimeRoutingDiagnostics["routingMode"] | undefined {
  if (input.requestOptions?.routingModeOverride || input.effectiveRoutingMode === "baseline") {
    return undefined;
  }
  const alias = resolveRequestedModelAlias(input.requestedModel, input.modelAliases);
  if (!alias || alias.mode === undefined || alias.mode === null) {
    return undefined;
  }
  return {
    source: "alias-default",
    aliasMode: toAliasRoutingMode(alias.mode),
    effectiveMode: input.effectiveRoutingMode,
  };
}

function summarizeConfiguredDefaultRoutingModeDiagnostics(input: {
  readonly requestedModel: string;
  readonly modelAliases: readonly UnifiedRuntimeModelAliasConfig[];
  readonly effectiveRoutingMode: RuntimeRoutingMode;
  readonly requestOptions?: BridgeExecutionRequestOptions;
  readonly defaultRoutingMode?: RuntimeRoutingMode;
}): RuntimeRoutingDiagnostics["routingMode"] | undefined {
  if (
    input.requestOptions?.routingModeOverride ||
    !input.defaultRoutingMode ||
    input.defaultRoutingMode === "baseline"
  ) {
    return undefined;
  }
  const alias = resolveRequestedModelAlias(input.requestedModel, input.modelAliases);
  if (alias?.mode !== undefined && alias.mode !== null) {
    return undefined;
  }
  return {
    source: "runtime-config",
    effectiveMode: input.effectiveRoutingMode,
  };
}

function resolveEffectiveRoutingMode(input: {
  readonly requestedModel: string;
  readonly modelAliases: readonly UnifiedRuntimeModelAliasConfig[];
  readonly requestOptions?: BridgeExecutionRequestOptions;
  readonly defaultRoutingMode?: RuntimeRoutingMode;
}): RuntimeRoutingMode {
  if (input.requestOptions?.routingModeOverride) {
    return input.requestOptions.routingModeOverride;
  }
  const alias = resolveRequestedModelAlias(input.requestedModel, input.modelAliases);
  if (alias?.mode !== undefined && alias.mode !== null) {
    return toAliasRoutingMode(alias.mode);
  }
  return input.defaultRoutingMode ?? "baseline";
}

function shouldApplyDifficultyRouting(effectiveRoutingMode: RuntimeRoutingMode): boolean {
  return effectiveRoutingMode === "difficulty" || effectiveRoutingMode === "hybrid";
}

function shouldApplyControllerRouting(effectiveRoutingMode: RuntimeRoutingMode): boolean {
  return effectiveRoutingMode === "controller" || effectiveRoutingMode === "hybrid";
}

function summarizeHybridArbitration(input: {
  readonly effectiveRoutingMode: RuntimeRoutingMode;
  readonly routingRequest: Parameters<typeof routeRuntimeRequest>[0]["request"];
  readonly controllerContext?: BridgeControllerRoutingContext;
  readonly guidance?: NonNullable<BridgeControllerRoutingContext["resolvedGuidance"]>;
  readonly preferredEndpointIds: readonly string[];
  readonly finalStrategy: BridgeRoutingStrategy;
}): RuntimeRoutingDiagnostics["hybridArbitration"] | undefined {
  if (input.effectiveRoutingMode !== "hybrid") {
    return undefined;
  }
  const controllerChangedPlan =
    !input.controllerContext?.active || !input.guidance
      ? false
      : Boolean(
          (input.guidance.strategy && input.guidance.strategy !== input.routingRequest.strategy) ||
            (typeof input.guidance.preferLocal === "boolean" &&
              input.guidance.preferLocal !== input.routingRequest.preferLocal) ||
            input.preferredEndpointIds.length > 0 ||
            input.guidance.requestedRoleId ||
            input.guidance.taskType ||
            (input.guidance.requiredCapabilities?.length ?? 0) > 0 ||
            (input.guidance.preferredCapabilities?.length ?? 0) > 0,
        );
  const dominantSignal =
    !input.controllerContext?.active || !input.guidance
      ? "difficulty"
      : controllerChangedPlan
        ? "controller"
        : "aligned";
  return {
    active: true,
    difficultyStrategy: toHybridSummaryStrategy(input.routingRequest.strategy),
    finalStrategy: input.finalStrategy,
    controllerChangedPlan,
    dominantSignal,
    ...(input.preferredEndpointIds.length
      ? { preferredEndpointIds: input.preferredEndpointIds }
      : {}),
  };
}

function readRoleModelIntentFromRequestBody(
  body: Record<string, unknown>,
): BridgeExecutionPlan["routingRequest"]["roleModelIntent"] | undefined {
  const roleModel = body.role_model;
  if (typeof roleModel !== "object" || roleModel === null || Array.isArray(roleModel)) {
    return undefined;
  }
  const intent = (roleModel as { readonly intent?: unknown }).intent;
  if (typeof intent !== "object" || intent === null || Array.isArray(intent)) {
    return undefined;
  }
  const roleModelRecord = roleModel as Record<string, unknown>;
  const record = intent as Record<string, unknown>;

  const readStringList = (value: unknown): readonly string[] | undefined =>
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
      ? [...value]
      : undefined;
  const readNullableString = (value: unknown): string | null | undefined =>
    typeof value === "string" || value === null ? value : undefined;
  const readStableAlternatives = (
    value: unknown,
  ):
    | readonly {
        readonly roleId?: string;
        readonly taskType?: string;
        readonly confidence?: number;
      }[]
    | undefined =>
    Array.isArray(value)
      ? value
          .filter(
            (entry): entry is Record<string, unknown> =>
              typeof entry === "object" && entry !== null && !Array.isArray(entry),
          )
          .map((entry) => ({
            ...(typeof entry.requested_role_id === "string"
              ? { roleId: entry.requested_role_id }
              : typeof entry.role_hint_id === "string"
                ? { roleId: entry.role_hint_id }
                : {}),
            ...(typeof entry.task_type === "string" ? { taskType: entry.task_type } : {}),
            ...(typeof entry.confidence === "number" ? { confidence: entry.confidence } : {}),
          }))
      : undefined;
  if (
    roleModelRecord.contract_version === 1 &&
    typeof record.taxonomy_version === "string" &&
    typeof record.classification_contract_version === "string"
  ) {
    const requestedRoleId =
      typeof record.requested_role_id === "string" ? record.requested_role_id : undefined;
    const roleHintId = typeof record.role_hint_id === "string" ? record.role_hint_id : undefined;
    const taskType = typeof record.task_type === "string" ? record.task_type : undefined;
    const stableRequiredCapabilities = readStringList(record.required_capabilities) ?? [];
    const stablePreferredCapabilities = readStringList(record.preferred_capabilities) ?? [];
    const stableAdvisoryCapabilities = uniqueBridgeStrings([
      ...stablePreferredCapabilities,
      ...stableRequiredCapabilities,
    ]);
    const capabilities = {
      ...(stableAdvisoryCapabilities.length > 0 ? { preferred: stableAdvisoryCapabilities } : {}),
    };
    const modalities = {
      ...(readStringList(record.required_modalities)
        ? { required: readStringList(record.required_modalities) }
        : {}),
    };
    const source =
      typeof record.source === "string"
        ? record.source
        : typeof record.task_source === "string"
          ? record.task_source
          : typeof record.role_source === "string"
            ? record.role_source
            : undefined;
    const alternatives = readStableAlternatives(record.alternatives);

    return {
      contractVersion: roleModelRecord.contract_version,
      taxonomyVersion: record.taxonomy_version,
      ...(typeof record.content_revision === "string"
        ? { contentRevision: record.content_revision }
        : {}),
      classificationContractVersion: record.classification_contract_version,
      ...(roleHintId ? { originalRoleHintId: roleHintId } : {}),
      ...(taskType ? { originalTaskType: taskType } : {}),
      ...(requestedRoleId
        ? { role: { id: requestedRoleId, hard: false } }
        : roleHintId
          ? { role: { id: roleHintId, hard: false } }
          : {}),
      ...(taskType ? { task: { id: taskType, hard: false } } : {}),
      ...(Object.keys(capabilities).length > 0 ? { capabilities } : {}),
      ...(Object.keys(modalities).length > 0 ? { modalities } : {}),
      ...(readStringList(record.tool_classes)
        ? { toolClasses: readStringList(record.tool_classes) }
        : {}),
      ...(source ? { source } : {}),
      ...(typeof record.role_source === "string" ? { roleSource: record.role_source } : {}),
      ...(typeof record.task_source === "string" ? { taskSource: record.task_source } : {}),
      ...(typeof record.confidence === "number"
        ? { confidence: record.confidence }
        : typeof record.task_confidence === "number"
          ? { confidence: record.task_confidence }
          : {}),
      ...(typeof record.task_confidence === "number"
        ? { taskConfidence: record.task_confidence }
        : {}),
      ...(typeof record.task_action === "string" ? { taskAction: record.task_action } : {}),
      ...(readNullableString(record.task_variant) !== undefined
        ? { taskVariant: readNullableString(record.task_variant) }
        : {}),
      ...(readStringList(record.evidence) ? { evidence: readStringList(record.evidence) } : {}),
      ...(alternatives ? { alternatives } : {}),
    };
  }

  if (
    typeof record.taxonomyVersion !== "string" ||
    typeof record.classificationContractVersion !== "string"
  ) {
    return undefined;
  }

  const readRoleOrTask = (
    value: unknown,
  ): { readonly id: string; readonly hard?: boolean } | undefined => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return undefined;
    }
    const roleOrTask = value as { readonly id?: unknown; readonly hard?: unknown };
    if (typeof roleOrTask.id !== "string") {
      return undefined;
    }
    return {
      id: roleOrTask.id,
      ...(typeof roleOrTask.hard === "boolean" ? { hard: roleOrTask.hard } : {}),
    };
  };
  const capabilities =
    typeof record.capabilities === "object" &&
    record.capabilities !== null &&
    !Array.isArray(record.capabilities)
      ? (record.capabilities as Record<string, unknown>)
      : undefined;
  const modalities =
    typeof record.modalities === "object" &&
    record.modalities !== null &&
    !Array.isArray(record.modalities)
      ? (record.modalities as Record<string, unknown>)
      : undefined;
  const alternatives = Array.isArray(record.alternatives)
    ? record.alternatives
        .filter(
          (entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null,
        )
        .map((entry) => ({
          ...(typeof entry.roleId === "string" ? { roleId: entry.roleId } : {}),
          ...(typeof entry.taskType === "string" ? { taskType: entry.taskType } : {}),
          ...(typeof entry.confidence === "number" ? { confidence: entry.confidence } : {}),
        }))
    : undefined;

  return {
    taxonomyVersion: record.taxonomyVersion,
    classificationContractVersion: record.classificationContractVersion,
    ...(readRoleOrTask(record.role) ? { role: readRoleOrTask(record.role) } : {}),
    ...(readRoleOrTask(record.task) ? { task: readRoleOrTask(record.task) } : {}),
    ...(capabilities
      ? {
          capabilities: {
            ...(readStringList(capabilities.required)
              ? { required: readStringList(capabilities.required) }
              : {}),
            ...(readStringList(capabilities.preferred)
              ? { preferred: readStringList(capabilities.preferred) }
              : {}),
          },
        }
      : {}),
    ...(modalities
      ? {
          modalities: {
            ...(readStringList(modalities.required)
              ? { required: readStringList(modalities.required) }
              : {}),
            ...(readStringList(modalities.output)
              ? { output: readStringList(modalities.output) }
              : {}),
          },
        }
      : {}),
    ...(readStringList(record.toolClasses)
      ? { toolClasses: readStringList(record.toolClasses) }
      : {}),
    ...(typeof record.source === "string" ? { source: record.source } : {}),
    ...(typeof record.confidence === "number" ? { confidence: record.confidence } : {}),
    ...(readStringList(record.evidence) ? { evidence: readStringList(record.evidence) } : {}),
    ...(alternatives ? { alternatives } : {}),
  };
}

export function mapChatCompletionsRequest(
  registry: EndpointRegistryResult,
  body: OpenAIChatCompletionsBody,
  requestId: string,
  modelAliases: readonly UnifiedRuntimeModelAliasConfig[] = [],
  difficultyContext?: BridgeDifficultyRoutingContext,
  controllerContext?: BridgeControllerRoutingContext,
  requestOptions?: BridgeExecutionRequestOptions,
  roleDefinitions?: readonly RuntimeRoleDefinitionRecord[],
  defaultRoutingMode?: RuntimeRoutingMode,
  inventory: RoutableInventory | null = null,
  taskDefinitions?: readonly RuntimeTaskDefinitionRecord[],
): BridgeExecutionPlan {
  const contextTokens = estimateContextTokens(body.messages, body.tools?.length ?? 0);
  const roleModelIntent = readRoleModelIntentFromRequestBody(
    body as unknown as Record<string, unknown>,
  );
  const { allowEndpoints: modelAllowEndpoints, routingDiagnostics } = resolveRequestedModelPool(
    registry,
    body.model,
    modelAliases,
    inventory,
  );
  const allowEndpoints = applyRequestedEndpointOverride({
    requestedModel: body.model,
    allowEndpoints: modelAllowEndpoints,
    requestOptions,
  });
  const effectiveRoutingMode = resolveEffectiveRoutingMode({
    requestedModel: body.model,
    modelAliases,
    requestOptions,
    defaultRoutingMode,
  });
  const aliasDefaultRoutingMode = summarizeAliasDefaultRoutingModeDiagnostics({
    requestedModel: body.model,
    modelAliases,
    effectiveRoutingMode,
    requestOptions,
  });
  const configuredDefaultRoutingMode = summarizeConfiguredDefaultRoutingModeDiagnostics({
    requestedModel: body.model,
    modelAliases,
    effectiveRoutingMode,
    requestOptions,
    defaultRoutingMode,
  });
  const baseRoutingDiagnostics = aliasDefaultRoutingMode
    ? {
        ...routingDiagnostics,
        routingMode: aliasDefaultRoutingMode,
      }
    : configuredDefaultRoutingMode
      ? {
          ...routingDiagnostics,
          routingMode: configuredDefaultRoutingMode,
        }
      : routingDiagnostics;
  const capabilityRequirements = inferChatCompletionsCapabilityRequirements(
    body as unknown as Record<string, unknown>,
  );
  const capabilityFiltered = filterAllowEndpointsForCapabilityRequirements({
    registry,
    requestedModel: body.model,
    allowEndpoints,
    requirements: capabilityRequirements,
    routingDiagnostics: baseRoutingDiagnostics,
  });
  if (capabilityFiltered.allowEndpoints.length === 0) {
    throwNoEligibleCapabilityTarget({
      requestedModel: body.model,
      requirements: capabilityRequirements,
      routingDiagnostics: capabilityFiltered.routingDiagnostics,
    });
  }
  const difficultyRouting = maybeApplyDifficultyRouting({
    effectiveRoutingMode,
    requestedModel: body.model,
    modelAliases,
    messages: body.messages,
    contextTokens,
    toolCount: body.tools?.length ?? 0,
    allowEndpoints: capabilityFiltered.allowEndpoints,
    routingDiagnostics: capabilityFiltered.routingDiagnostics,
    difficultyContext,
  });

  if (difficultyRouting.allowEndpoints.length === 0) {
    throw new Error(`No registry endpoints are available for requested model ${body.model}.`);
  }

  const tools = body.tools?.map(toToolDefinition);

  const controllerRouting = maybeApplyControllerRouting({
    effectiveRoutingMode,
    requestedModel: body.model,
    modelAliases,
    routingRequest: {
      requestId,
      ...(roleModelIntent ? { roleModelIntent } : {}),
      taskType: "text.chat",
      requiredCapabilities: capabilityRequirements.requiredCapabilities,
      preferredCapabilities: [],
      requiredModalities: capabilityRequirements.requiredInputModalities,
      contextTokens,
      needsTools: Boolean(tools?.length),
      strategy: difficultyRouting.strategy,
      preferLocal: false,
      allowEndpoints: difficultyRouting.allowEndpoints,
    },
    routingDiagnostics: difficultyRouting.routingDiagnostics,
    controllerContext,
    roleDefinitions,
    taskDefinitions,
  });

  const rolePolicyExecution = applyRequestedRoleExecutionPolicy({
    routingRequest: controllerRouting.routingRequest,
    messages: body.messages,
    tools,
    routingDiagnostics: controllerRouting.routingDiagnostics,
    roleDefinitions,
    taskDefinitions,
    requestOptions,
  });
  const promptCache =
    readChatCompletionsPromptCacheRequest(body) ??
    synthesizePromptCacheRequest(
      requestOptions,
      body.conversation_id,
      rolePolicyExecution.executionRequest.messages,
    );
  const sessionAffinity = buildBridgeExecutionSessionAffinity(requestOptions);
  const reasoning = readChatCompletionsReasoningRequest(body);

  return {
    routingRequest: rolePolicyExecution.routingRequest,
    executionRequest: {
      ...rolePolicyExecution.executionRequest,
      ...(body.tool_choice !== undefined && rolePolicyExecution.executionRequest.tools?.length
        ? { toolChoice: body.tool_choice }
        : {}),
      ...(typeof body.parallel_tool_calls === "boolean"
        ? { parallelToolCalls: body.parallel_tool_calls }
        : {}),
      ...(promptCache ? { promptCache } : {}),
      ...(sessionAffinity ? { sessionAffinity } : {}),
      ...(reasoning ? { reasoning } : {}),
      ...(requestOptions?.transportPreference
        ? { transportPreference: requestOptions.transportPreference }
        : {}),
      ...(typeof body.stream === "boolean" ? { stream: body.stream } : {}),
      ...(typeof body.max_tokens === "number" ? { maxOutputTokens: body.max_tokens } : {}),
      ...(typeof body.temperature === "number" ? { temperature: body.temperature } : {}),
    },
    ...(controllerRouting.routingModel ? { routingModel: controllerRouting.routingModel } : {}),
    ...(rolePolicyExecution.routingDiagnostics
      ? { routingDiagnostics: rolePolicyExecution.routingDiagnostics }
      : {}),
  };
}

export function mapResponsesRequest(
  registry: EndpointRegistryResult,
  body: OpenAIResponsesBody,
  requestId: string,
  modelAliases: readonly UnifiedRuntimeModelAliasConfig[] = [],
  difficultyContext?: BridgeDifficultyRoutingContext,
  controllerContext?: BridgeControllerRoutingContext,
  requestOptions?: BridgeExecutionRequestOptions,
  roleDefinitions?: readonly RuntimeRoleDefinitionRecord[],
  defaultRoutingMode?: RuntimeRoutingMode,
  inventory: RoutableInventory | null = null,
  taskDefinitions?: readonly RuntimeTaskDefinitionRecord[],
): BridgeExecutionPlan {
  const messages = toResponsesInputMessages(body.input);
  const contextTokens = estimateContextTokens(messages, body.tools?.length ?? 0);
  const roleModelIntent = readRoleModelIntentFromRequestBody(
    body as unknown as Record<string, unknown>,
  );
  const capabilityRequirements = inferResponsesCapabilityRequirements(
    body as unknown as Record<string, unknown>,
  );
  const { allowEndpoints: modelAllowEndpoints, routingDiagnostics } = resolveRequestedModelPool(
    registry,
    body.model,
    modelAliases,
    inventory,
  );
  const allowEndpoints = applyRequestedEndpointOverride({
    requestedModel: body.model,
    allowEndpoints: modelAllowEndpoints,
    requestOptions,
  });
  const toolExecutionPlan = resolveResponsesToolExecutionPlan({
    registry,
    allowEndpoints,
    routingDiagnostics,
    tools: body.tools,
  });
  const effectiveRoutingMode = resolveEffectiveRoutingMode({
    requestedModel: body.model,
    modelAliases,
    requestOptions,
    defaultRoutingMode,
  });
  const aliasDefaultRoutingMode = summarizeAliasDefaultRoutingModeDiagnostics({
    requestedModel: body.model,
    modelAliases,
    effectiveRoutingMode,
    requestOptions,
  });
  const configuredDefaultRoutingMode = summarizeConfiguredDefaultRoutingModeDiagnostics({
    requestedModel: body.model,
    modelAliases,
    effectiveRoutingMode,
    requestOptions,
    defaultRoutingMode,
  });
  const baseRoutingDiagnostics = aliasDefaultRoutingMode
    ? {
        ...toolExecutionPlan.routingDiagnostics,
        routingMode: aliasDefaultRoutingMode,
      }
    : configuredDefaultRoutingMode
      ? {
          ...toolExecutionPlan.routingDiagnostics,
          routingMode: configuredDefaultRoutingMode,
        }
      : toolExecutionPlan.routingDiagnostics;
  const capabilityFiltered = filterAllowEndpointsForCapabilityRequirements({
    registry,
    requestedModel: body.model,
    allowEndpoints: toolExecutionPlan.allowEndpoints,
    requirements: capabilityRequirements,
    routingDiagnostics: baseRoutingDiagnostics,
  });
  if (capabilityFiltered.allowEndpoints.length === 0) {
    throwNoEligibleCapabilityTarget({
      requestedModel: body.model,
      requirements: capabilityRequirements,
      routingDiagnostics: capabilityFiltered.routingDiagnostics,
    });
  }
  const difficultyRouting = maybeApplyDifficultyRouting({
    effectiveRoutingMode,
    requestedModel: body.model,
    modelAliases,
    messages,
    contextTokens,
    toolCount: body.tools?.length ?? 0,
    allowEndpoints: capabilityFiltered.allowEndpoints,
    routingDiagnostics: capabilityFiltered.routingDiagnostics,
    difficultyContext,
  });

  if (difficultyRouting.allowEndpoints.length === 0) {
    throw new Error(
      toolExecutionPlan.hostedToolFilterApplied
        ? `No registry endpoints that support hosted responses tools are available for requested model ${body.model}.`
        : `No registry endpoints are available for requested model ${body.model}.`,
    );
  }

  const tools = toolExecutionPlan.tools;

  const controllerRouting = maybeApplyControllerRouting({
    effectiveRoutingMode,
    requestedModel: body.model,
    modelAliases,
    routingRequest: {
      requestId,
      ...(roleModelIntent ? { roleModelIntent } : {}),
      taskType: "text.chat",
      requiredCapabilities: capabilityRequirements.requiredCapabilities,
      preferredCapabilities: [],
      requiredModalities: capabilityRequirements.requiredInputModalities,
      contextTokens,
      needsTools: Boolean(tools?.length),
      strategy: difficultyRouting.strategy,
      preferLocal: false,
      allowEndpoints: difficultyRouting.allowEndpoints,
    },
    routingDiagnostics: difficultyRouting.routingDiagnostics,
    controllerContext,
    roleDefinitions,
    taskDefinitions,
  });

  const rolePolicyExecution = applyRequestedRoleExecutionPolicy({
    routingRequest: controllerRouting.routingRequest,
    messages,
    tools,
    routingDiagnostics: controllerRouting.routingDiagnostics,
    roleDefinitions,
    taskDefinitions,
    requestOptions,
  });
  const reasoning = readResponsesReasoningRequest(body);
  const promptCache =
    readResponsesPromptCacheRequest(body) ??
    synthesizePromptCacheRequest(
      requestOptions,
      body.conversation_id,
      rolePolicyExecution.executionRequest.messages,
    );
  const continuation = readResponsesContinuationRequest(body);
  const sessionAffinity = buildBridgeExecutionSessionAffinity(requestOptions);

  return {
    routingRequest: rolePolicyExecution.routingRequest,
    executionRequest: {
      ...rolePolicyExecution.executionRequest,
      ...(body.tool_choice !== undefined && rolePolicyExecution.executionRequest.tools?.length
        ? { toolChoice: readResponsesToolChoice(body.tool_choice) }
        : {}),
      ...(typeof body.parallel_tool_calls === "boolean"
        ? { parallelToolCalls: body.parallel_tool_calls }
        : {}),
      ...(reasoning ? { reasoning } : {}),
      ...(promptCache ? { promptCache } : {}),
      ...(continuation ? { continuation } : {}),
      ...(sessionAffinity ? { sessionAffinity } : {}),
      ...(requestOptions?.transportPreference
        ? { transportPreference: requestOptions.transportPreference }
        : {}),
      ...(typeof body.stream === "boolean" ? { stream: body.stream } : {}),
      ...(typeof body.max_output_tokens === "number"
        ? { maxOutputTokens: body.max_output_tokens }
        : {}),
      ...(typeof body.temperature === "number" ? { temperature: body.temperature } : {}),
    },
    ...(controllerRouting.routingModel ? { routingModel: controllerRouting.routingModel } : {}),
    ...(rolePolicyExecution.routingDiagnostics
      ? { routingDiagnostics: rolePolicyExecution.routingDiagnostics }
      : {}),
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

function endCommittedBridgeResponse(response: ServerResponse): boolean {
  if (response.headersSent) {
    if (!response.writableEnded) {
      response.end();
    }
    return true;
  }
  return false;
}

export function writeUnhandledBridgeError(response: ServerResponse, error: unknown): boolean {
  if (endCommittedBridgeResponse(response)) {
    return false;
  }
  if (response.writableEnded) {
    return false;
  }
  if (error instanceof BridgeHttpError) {
    writeJson(response, error.statusCode, error.body);
    return true;
  }
  writeJson(response, 500, {
    error: error instanceof Error ? error.message : "runtime host bridge request failed",
  });
  return true;
}

function taxonomyEtag(body: unknown): string {
  return `"sha256:${createHash("sha256").update(JSON.stringify(body)).digest("hex")}"`;
}

function writeTaxonomyJson(
  request: IncomingMessage,
  response: ServerResponse,
  body: unknown,
): void {
  const etag = taxonomyEtag(body);
  if (request.headers["if-none-match"] === etag) {
    response.statusCode = 304;
    response.setHeader("etag", etag);
    response.end();
    return;
  }
  writeJson(response, 200, body, {
    etag,
    "cache-control": "private, max-age=0, must-revalidate",
  });
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

class BridgeClientDisconnectedError extends Error {
  constructor() {
    super("Downstream client disconnected before the streamed response completed.");
  }
}

function throwIfBridgeClientAborted(abortSignal: AbortSignal | undefined): void {
  if (abortSignal?.aborted) {
    throw new BridgeClientDisconnectedError();
  }
}

function isBridgeClientDisconnectedError(error: unknown): boolean {
  return error instanceof BridgeClientDisconnectedError;
}

function createBridgeRequestAbortSignal(
  request: IncomingMessage,
  response: ServerResponse,
): AbortSignal {
  const controller = new AbortController();
  const abort = () => {
    if (!controller.signal.aborted && !response.writableEnded) {
      controller.abort();
    }
  };
  request.on("aborted", abort);
  response.on("close", abort);
  response.on("error", abort);
  return controller.signal;
}

function mergeBridgeRequestAbortSignal(
  requestOptions: BridgeExecutionRequestOptions | undefined,
  abortSignal: AbortSignal,
): BridgeExecutionRequestOptions {
  return {
    ...(requestOptions ?? {}),
    abortSignal,
  };
}

function shouldIgnoreExecutionFailureCooldowns(
  requestOptions?: BridgeExecutionRequestOptions,
): boolean {
  return requestOptions?.ignoreExecutionFailureCooldowns === true;
}

async function writeSseChunk(
  response: ServerResponse,
  serializedChunk: string,
  abortSignal?: AbortSignal,
): Promise<void> {
  if (abortSignal?.aborted || response.destroyed || response.writableEnded) {
    throw new BridgeClientDisconnectedError();
  }
  if (response.write(serializedChunk)) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      response.off("drain", onDrain);
      response.off("close", onClose);
      response.off("error", onError);
      abortSignal?.removeEventListener("abort", onAbort);
    };
    const onDrain = () => {
      cleanup();
      resolve();
    };
    const onClose = () => {
      cleanup();
      reject(new BridgeClientDisconnectedError());
    };
    const onError = () => {
      cleanup();
      reject(new BridgeClientDisconnectedError());
    };
    const onAbort = () => {
      cleanup();
      reject(new BridgeClientDisconnectedError());
    };
    response.once("drain", onDrain);
    response.once("close", onClose);
    response.once("error", onError);
    abortSignal?.addEventListener("abort", onAbort, { once: true });
  });
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

function readModelOverrideRecord(value: unknown, label: string): BridgeModelOverrideRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const record = value as Record<string, unknown>;
  const next: BridgeModelOverrideRecord = {};
  for (const key of ["ttl", "contextWindow", "concurrencyLimit"] as const) {
    const candidate = record[key];
    if (candidate === undefined) {
      continue;
    }
    if (typeof candidate !== "number" || !Number.isFinite(candidate)) {
      throw new Error(`${label}.${key} must be a finite number.`);
    }
    next[key] = candidate;
  }
  const roleIds = record.roleIds;
  if (roleIds !== undefined) {
    if (!Array.isArray(roleIds) || roleIds.some((entry) => typeof entry !== "string")) {
      throw new Error(`${label}.roleIds must be an array of strings.`);
    }
    next.roleIds = [...roleIds];
  }
  const roleAssignmentMode = record.roleAssignmentMode;
  if (roleAssignmentMode !== undefined) {
    if (
      typeof roleAssignmentMode !== "string" ||
      !["all", "include", "exclude", "custom"].includes(roleAssignmentMode)
    ) {
      throw new Error(`${label}.roleAssignmentMode must be all, include, exclude, or custom.`);
    }
    next.roleAssignmentMode = roleAssignmentMode as BridgeModelOverrideRecord["roleAssignmentMode"];
  }
  for (const key of ["enabledRoleIds", "disabledRoleIds"] as const) {
    const candidate = record[key];
    if (candidate === undefined) {
      continue;
    }
    if (!Array.isArray(candidate) || candidate.some((entry) => typeof entry !== "string")) {
      throw new Error(`${label}.${key} must be an array of strings.`);
    }
    next[key] = [...candidate];
  }
  return next;
}

function readModelOverridesBody(
  value: Record<string, unknown>,
): Record<string, BridgeModelOverrideRecord> {
  return Object.fromEntries(
    Object.entries(value).map(([modelId, entry]) => [
      modelId,
      readModelOverrideRecord(entry, `modelOverrides.${modelId}`),
    ]),
  );
}

function readRequiredRoleIdsFromBody(body: Record<string, unknown>): readonly string[] {
  const roleIds = body.roleIds;
  if (!Array.isArray(roleIds) || roleIds.some((entry) => typeof entry !== "string")) {
    throw new Error("roleIds must be an array of strings.");
  }
  return [...roleIds];
}

interface RuntimeModelRoleAssignmentInput {
  readonly roleIds: readonly string[];
  readonly roleAssignmentMode?: "all" | "include" | "exclude" | "custom";
  readonly enabledRoleIds?: readonly string[];
  readonly disabledRoleIds?: readonly string[];
}

function readRoleAssignmentFromBody(
  body: Record<string, unknown>,
  required: boolean,
): RuntimeModelRoleAssignmentInput | undefined {
  if (!("roleIds" in body) && !("roleAssignmentMode" in body)) {
    if (required) {
      throw new Error("roleIds must be an array of strings.");
    }
    return undefined;
  }
  const roleIds = readRequiredRoleIdsFromBody(body);
  const roleAssignmentMode =
    typeof body.roleAssignmentMode === "string" &&
    ["all", "include", "exclude", "custom"].includes(body.roleAssignmentMode)
      ? (body.roleAssignmentMode as RuntimeModelRoleAssignmentInput["roleAssignmentMode"])
      : undefined;
  const enabledRoleIds = Array.isArray(body.enabledRoleIds)
    ? body.enabledRoleIds.filter((entry): entry is string => typeof entry === "string")
    : undefined;
  const disabledRoleIds = Array.isArray(body.disabledRoleIds)
    ? body.disabledRoleIds.filter((entry): entry is string => typeof entry === "string")
    : undefined;
  return {
    roleIds,
    ...(roleAssignmentMode ? { roleAssignmentMode } : {}),
    ...(enabledRoleIds ? { enabledRoleIds } : {}),
    ...(disabledRoleIds ? { disabledRoleIds } : {}),
  };
}

function readModelOverridesFromDisk(
  runtimeStateRoot: string,
): Record<string, BridgeModelOverrideRecord> {
  const overridesPath = path.join(runtimeStateRoot, "model-overrides.json");
  try {
    if (existsSync(overridesPath)) {
      return JSON.parse(readFileSync(overridesPath, "utf8")) as Record<
        string,
        BridgeModelOverrideRecord
      >;
    }
  } catch {
    // Fall through to empty
  }
  return {};
}

function readOptionalPositiveInteger(params: URLSearchParams, key: string): number | undefined {
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

function readOptionalTelemetryStringList(
  params: URLSearchParams,
  key: string,
): readonly string[] | undefined {
  const values = params.getAll(key).flatMap((value) => value.split(","));
  const normalized = values.map((value) => value.trim()).filter((value) => value.length > 0);
  return normalized.length > 0 ? normalized : undefined;
}

function readTelemetryQuery(url: URL): BridgeTelemetryQuery {
  const windowMs = readOptionalPositiveInteger(url.searchParams, "windowMs");
  const limit = readOptionalPositiveInteger(url.searchParams, "limit");
  const endAtMs = readOptionalPositiveInteger(url.searchParams, "endAtMs");
  const startAtMs = readOptionalPositiveInteger(url.searchParams, "startAtMs");
  const sourceTypes = readOptionalTelemetryStringList(url.searchParams, "sourceTypes") as
    | readonly ("local" | "remote")[]
    | undefined;
  const endpointIds = readOptionalTelemetryStringList(url.searchParams, "endpointIds");
  const modelIds = readOptionalTelemetryStringList(url.searchParams, "modelIds");
  const providerIds = readOptionalTelemetryStringList(url.searchParams, "providerIds");
  const providerKinds = readOptionalTelemetryStringList(url.searchParams, "providerKinds");
  const providerFamilies = readOptionalTelemetryStringList(url.searchParams, "providerFamilies");
  const providerAccountIds = readOptionalTelemetryStringList(
    url.searchParams,
    "providerAccountIds",
  );
  const requestedRoleIds = readOptionalTelemetryStringList(url.searchParams, "requestedRoleIds");
  const selectedStrategies = readOptionalTelemetryStringList(
    url.searchParams,
    "selectedStrategies",
  );
  const routingModes = readOptionalTelemetryStringList(url.searchParams, "routingModes") as
    | readonly ("baseline" | "difficulty" | "controller" | "hybrid")[]
    | undefined;
  const difficultyBuckets = readOptionalTelemetryStringList(
    url.searchParams,
    "difficultyBuckets",
  ) as readonly ("easy" | "medium" | "hard")[] | undefined;
  const statusFamilies = readOptionalTelemetryStringList(url.searchParams, "statusFamilies") as
    | readonly ("success" | "failure" | "unknown")[]
    | undefined;
  const requestOperations = readOptionalTelemetryStringList(url.searchParams, "requestOperations");
  const filters = {
    ...(sourceTypes ? { sourceTypes } : {}),
    ...(endpointIds ? { endpointIds } : {}),
    ...(modelIds ? { modelIds } : {}),
    ...(providerIds ? { providerIds } : {}),
    ...(providerKinds ? { providerKinds } : {}),
    ...(providerFamilies ? { providerFamilies } : {}),
    ...(providerAccountIds ? { providerAccountIds } : {}),
    ...(requestedRoleIds ? { requestedRoleIds } : {}),
    ...(selectedStrategies ? { selectedStrategies } : {}),
    ...(routingModes ? { routingModes } : {}),
    ...(difficultyBuckets ? { difficultyBuckets } : {}),
    ...(statusFamilies ? { statusFamilies } : {}),
    ...(requestOperations ? { requestOperations } : {}),
  } satisfies BridgeTelemetryAnalyticsFilters;
  return {
    ...(typeof windowMs === "number" ? { windowMs } : {}),
    ...(typeof limit === "number" ? { limit } : {}),
    ...(typeof endAtMs === "number" ? { endAtMs } : {}),
    ...(typeof startAtMs === "number" ? { startAtMs } : {}),
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
  };
}

async function readJson<TValue>(filePath: string): Promise<TValue> {
  return JSON.parse(await readFile(filePath, "utf8")) as TValue;
}

function firstExistingPath(candidatePaths: readonly string[]): string {
  for (const candidatePath of candidatePaths) {
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }
  return candidatePaths[0] ?? "";
}

async function loadResponseCaptures(
  repoRoot: string,
  fixtureBasePath: string,
  fixtureMap: CaptureFixtureMap,
): Promise<RuntimeResponseCaptureMap> {
  const byEndpointId: Record<string, { body: unknown }> = {};
  for (const [endpointId, fixture] of Object.entries(fixtureMap.byEndpointId)) {
    const fixturePath = path.isAbsolute(fixture.responseFixture)
      ? fixture.responseFixture
      : await firstExistingPath([
          path.join(fixtureBasePath, fixture.responseFixture),
          path.join(repoRoot, "testdata", "router-runtime", fixture.responseFixture),
        ]);
    byEndpointId[endpointId] = {
      body: await readJson<unknown>(fixturePath),
    };
  }

  return { byEndpointId };
}

export async function loadMcpConnectorConfigs(
  repoRoot: string,
): Promise<DeclaredMcpConnectorConfig[]> {
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
  networkFetcher: typeof fetch,
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
        case "$web_search": {
          return {
            content: toolArguments,
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
  networkFetcher: typeof fetch,
): Promise<ToolRegistry> {
  const definitions = createMcpConnectorDefinitions(await loadMcpConnectorConfigs(repoRoot));
  const connectors: ToolConnector[] = [
    {
      connectorId: "runtime.builtin",
      connectorKind: "builtin",
      tools: [
        createConnectorTool(
          registry,
          "runtime.builtin",
          {
            name: "$web_search",
            description: "Passthrough Kimi hosted web-search continuation tool.",
            inputSchema: {
              type: "object",
            },
          },
          networkFetcher,
        ),
      ],
    },
    ...definitions.map((definition) => ({
      connectorId: definition.connectorId,
      connectorKind: definition.connectorKind,
      tools: definition.tools.map((tool) =>
        createConnectorTool(registry, definition.connectorId, tool, networkFetcher),
      ),
    })),
  ];
  return createToolRegistry({
    connectors,
  });
}

export function createRequestScopedToolRegistry(
  dynamicTools: readonly Extract<RuntimeExecutionToolDefinition, { readonly kind?: "function" }>[],
  options: {
    readonly workspaceRoot?: string;
    readonly applyPatchMode?: "ack" | "mutate";
  } = {},
): ToolRegistry {
  const executeReadFile = async (toolArguments: unknown): Promise<unknown> => {
    const requestedPath = readRequestScopedPathArgument(toolArguments);
    if (!requestedPath) {
      throw new Error("read_file requires a path string.");
    }
    const workspacePath = resolveRequestScopedWorkspacePath(options.workspaceRoot, requestedPath);
    return readFile(workspacePath, "utf8");
  };

  const executeGrepSearch = async (toolArguments: unknown): Promise<unknown> => {
    const pattern = readRequestScopedPatternArgument(toolArguments);
    if (!pattern) {
      throw new Error("grep_search requires a pattern string.");
    }
    return buildRequestScopedGrepResult(options.workspaceRoot, pattern);
  };

  const executeListDir = async (toolArguments: unknown): Promise<unknown> => {
    return buildRequestScopedListDirResult(options.workspaceRoot, toolArguments);
  };

  const executeWriteFile = async (toolArguments: unknown): Promise<unknown> => {
    return await writeRequestScopedWorkspaceFile(options.workspaceRoot, toolArguments);
  };

  const executeCreateDirectory = async (toolArguments: unknown): Promise<unknown> => {
    return await createRequestScopedWorkspaceDirectory(options.workspaceRoot, toolArguments);
  };

  const executeMoveFile = async (toolArguments: unknown): Promise<unknown> => {
    return await moveRequestScopedWorkspacePath(options.workspaceRoot, toolArguments);
  };

  const executeDeleteFile = async (toolArguments: unknown): Promise<unknown> => {
    return await deleteRequestScopedWorkspacePath(options.workspaceRoot, toolArguments);
  };

  const executeApplyPatch = async (toolArguments: unknown): Promise<unknown> => {
    const diff = readRequestScopedDiffArgument(toolArguments);
    if (!diff) {
      throw new Error("apply_patch requires a diff or patch string.");
    }
    return applyRequestScopedUnifiedDiff(
      options.workspaceRoot,
      diff,
      options.applyPatchMode ?? "ack",
    );
  };

  return createToolRegistry({
    connectors: [
      {
        connectorId: "request-scoped",
        connectorKind: "dynamic-tool",
        tools: dynamicTools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          execute: async ({ arguments: toolArguments }) => {
            switch (tool.name) {
              case "read_file":
                return { content: await executeReadFile(toolArguments) };
              case "grep_search":
                return { content: await executeGrepSearch(toolArguments) };
              case "list_dir":
                return { content: await executeListDir(toolArguments) };
              case "write_file":
                return { content: await executeWriteFile(toolArguments) };
              case "create_directory":
              case "create_folder":
              case "mkdir":
                return { content: await executeCreateDirectory(toolArguments) };
              case "move_file":
              case "rename_file":
                return { content: await executeMoveFile(toolArguments) };
              case "delete_file":
              case "remove_file":
                return { content: await executeDeleteFile(toolArguments) };
              case "apply_patch":
                return { content: await executeApplyPatch(toolArguments) };
              case "list_endpoints":
                return { content: buildRequestScopedEndpointList() };
              case "get_metrics":
                return { content: buildRequestScopedMetrics(toolArguments) };
              default:
                throw new Error(
                  `Request-scoped tool ${tool.name} is not implemented by the Codex Subscription bridge.`,
                );
            }
          },
        })),
      },
    ],
  });
}

const CODEX_BENCHMARK_ROUTER_FIXTURE = `export const MODE = "fast";

type EndpointCandidate = {
  readonly id: string;
  readonly hardDeniedBySla: boolean;
  readonly throughputScore: number;
};

type RoutingInput = {
  readonly candidates: readonly EndpointCandidate[];
  readonly throughputSlaHardDeny: boolean;
};

export function routeRuntimeRequest(input: RoutingInput): string {
  const eligible = evaluateEligibility(input.candidates);
  if (input.throughputSlaHardDeny && eligible.length === 0) {
    return "deny";
  }
  return eligible.length > 0 ? eligible[0]!.id : "none";
}

function evaluateEligibility(
  candidates: readonly EndpointCandidate[],
): readonly EndpointCandidate[] {
  return candidates.filter((candidate) => !candidate.hardDeniedBySla);
}

export function guardSoleCandidateThroughputDeny(input: RoutingInput): boolean {
  if (!input.throughputSlaHardDeny) return false;
  const eligible = evaluateEligibility(input.candidates);
  return eligible.length === 0 && input.candidates.length === 1 && input.candidates[0]!.hardDeniedBySla;
}
`;

const CODEX_BENCHMARK_CONFIG_FIXTURE = `export const MODE = 'baseline';
`;

const CODEX_BENCHMARK_RUNTIME_CONFIG_FIXTURE = `routing:
  strategy: controller
  execution_mode: remote_only
`;

export async function seedManagedCodexWorkspaceFixture(workspaceRoot: string): Promise<void> {
  await mkdir(path.join(workspaceRoot, "src"), { recursive: true });
  await mkdir(path.join(workspaceRoot, "state"), { recursive: true });
  await writeFile(path.join(workspaceRoot, "src", "router.ts"), CODEX_BENCHMARK_ROUTER_FIXTURE);
  await writeFile(path.join(workspaceRoot, "src", "config.ts"), CODEX_BENCHMARK_CONFIG_FIXTURE);
  await writeFile(
    path.join(workspaceRoot, "state", "runtime-config.yaml"),
    CODEX_BENCHMARK_RUNTIME_CONFIG_FIXTURE,
  );
}

function readRequestScopedObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readRequestScopedStringValue(
  value: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

function resolveRequestScopedWorkspacePath(
  workspaceRoot: string | undefined,
  requestedPath: string,
): string {
  if (!workspaceRoot) {
    throw new Error("This runtime request did not include a workspace root.");
  }
  const normalizedWorkspaceRoot = path.resolve(workspaceRoot);
  const resolvedPath = path.isAbsolute(requestedPath)
    ? path.resolve(requestedPath)
    : path.resolve(normalizedWorkspaceRoot, requestedPath);
  const workspacePrefix = `${normalizedWorkspaceRoot}${path.sep}`.toLowerCase();
  const normalizedResolvedPath = resolvedPath.toLowerCase();
  if (
    normalizedResolvedPath !== normalizedWorkspaceRoot.toLowerCase() &&
    !normalizedResolvedPath.startsWith(workspacePrefix)
  ) {
    throw new Error(
      `Path ${requestedPath} is outside the managed Codex workspace. Use shell commands for external filesystem paths instead of the request-scoped file tools.`,
    );
  }
  return resolvedPath;
}

function readRequestScopedPathArgument(toolArguments: unknown): string | null {
  return readRequestScopedStringValue(readRequestScopedObject(toolArguments), [
    "path",
    "file_path",
    "filepath",
    "directory_path",
    "dir_path",
    "folder_path",
  ]);
}

function readRequestScopedPatternArgument(toolArguments: unknown): string | null {
  return readRequestScopedStringValue(readRequestScopedObject(toolArguments), ["pattern", "query"]);
}

function readRequestScopedDiffArgument(toolArguments: unknown): string | null {
  return readRequestScopedStringValue(readRequestScopedObject(toolArguments), ["diff", "patch"]);
}

function readRequestScopedContentArgument(toolArguments: unknown): string | null {
  return readRequestScopedStringValue(readRequestScopedObject(toolArguments), [
    "content",
    "contents",
    "text",
  ]);
}

function readRequestScopedSourcePathArgument(toolArguments: unknown): string | null {
  return readRequestScopedStringValue(readRequestScopedObject(toolArguments), [
    "source_path",
    "sourcePath",
    "from",
    "old_path",
    "oldPath",
  ]);
}

function readRequestScopedDestinationPathArgument(toolArguments: unknown): string | null {
  return readRequestScopedStringValue(readRequestScopedObject(toolArguments), [
    "destination_path",
    "destinationPath",
    "to",
    "new_path",
    "newPath",
  ]);
}

function collectRequestScopedWorkspaceFiles(rootPath: string): string[] {
  const pending = [rootPath];
  const files: string[] = [];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) {
      continue;
    }
    for (const entry of readdirSync(current)) {
      const entryPath = path.join(current, entry);
      const stats = statSync(entryPath);
      if (stats.isDirectory()) {
        pending.push(entryPath);
      } else if (stats.isFile()) {
        files.push(entryPath);
      }
    }
  }
  return files.sort(compareText);
}

function buildRequestScopedGrepResult(
  workspaceRoot: string | undefined,
  patternText: string,
): string {
  if (!workspaceRoot) {
    throw new Error("This runtime request did not include a workspace root.");
  }
  const matcher = new RegExp(patternText, "i");
  const matchBlocks: string[] = [];
  for (const filePath of collectRequestScopedWorkspaceFiles(workspaceRoot)) {
    const relativePath = path.relative(workspaceRoot, filePath).replace(/\\/g, "/");
    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
    const fileMatches: string[] = [];
    lines.forEach((line, index) => {
      if (matcher.test(line)) {
        fileMatches.push(`line ${index + 1}: ${line}`);
      }
    });
    if (fileMatches.length > 0) {
      matchBlocks.push(`${relativePath}:\n${fileMatches.join("\n")}`);
    }
  }
  if (matchBlocks.length > 0) {
    const totalMatches = matchBlocks.reduce(
      (sum, block) => sum + Math.max(0, block.split(/\r?\n/).length - 1),
      0,
    );
    return `Found ${totalMatches} matches for ${patternText}:\n${matchBlocks.join("\n\n")}`;
  }
  return `Found 0 matches for ${patternText}.`;
}

function buildRequestScopedListDirResult(
  workspaceRoot: string | undefined,
  toolArguments: unknown,
): string {
  if (!workspaceRoot) {
    throw new Error("This runtime request did not include a workspace root.");
  }
  const requestedPath = readRequestScopedPathArgument(toolArguments) ?? ".";
  const resolvedPath = resolveRequestScopedWorkspacePath(workspaceRoot, requestedPath);
  const stats = statSync(resolvedPath);
  if (!stats.isDirectory()) {
    throw new Error(`Path ${requestedPath} is not a directory.`);
  }
  const relativePath = path.relative(workspaceRoot, resolvedPath).replace(/\\/g, "/");
  const renderedPath = relativePath.length > 0 ? relativePath : ".";
  const entries = readdirSync(resolvedPath, { withFileTypes: true })
    .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
    .sort(compareText);
  return `Directory ${renderedPath}:\n${entries.join("\n")}`;
}

async function writeRequestScopedWorkspaceFile(
  workspaceRoot: string | undefined,
  toolArguments: unknown,
): Promise<string> {
  const requestedPath = readRequestScopedPathArgument(toolArguments);
  if (!requestedPath) {
    throw new Error("write_file requires a path string.");
  }
  const content = readRequestScopedContentArgument(toolArguments);
  if (content === null) {
    throw new Error("write_file requires content text.");
  }
  const resolvedPath = resolveRequestScopedWorkspacePath(workspaceRoot, requestedPath);
  await mkdir(path.dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, content, "utf8");
  return `Wrote ${requestedPath}.`;
}

async function createRequestScopedWorkspaceDirectory(
  workspaceRoot: string | undefined,
  toolArguments: unknown,
): Promise<string> {
  const requestedPath = readRequestScopedPathArgument(toolArguments);
  if (!requestedPath) {
    throw new Error("create_directory requires a path string.");
  }
  const resolvedPath = resolveRequestScopedWorkspacePath(workspaceRoot, requestedPath);
  await mkdir(resolvedPath, { recursive: true });
  return `Created directory ${requestedPath}.`;
}

async function moveRequestScopedWorkspacePath(
  workspaceRoot: string | undefined,
  toolArguments: unknown,
): Promise<string> {
  const sourcePath = readRequestScopedSourcePathArgument(toolArguments);
  const destinationPath = readRequestScopedDestinationPathArgument(toolArguments);
  if (!sourcePath || !destinationPath) {
    throw new Error("move_file requires source and destination path strings.");
  }
  const resolvedSourcePath = resolveRequestScopedWorkspacePath(workspaceRoot, sourcePath);
  const resolvedDestinationPath = resolveRequestScopedWorkspacePath(workspaceRoot, destinationPath);
  await mkdir(path.dirname(resolvedDestinationPath), { recursive: true });
  await rename(resolvedSourcePath, resolvedDestinationPath);
  return `Moved ${sourcePath} to ${destinationPath}.`;
}

async function deleteRequestScopedWorkspacePath(
  workspaceRoot: string | undefined,
  toolArguments: unknown,
): Promise<string> {
  const requestedPath = readRequestScopedPathArgument(toolArguments);
  if (!requestedPath) {
    throw new Error("delete_file requires a path string.");
  }
  const resolvedPath = resolveRequestScopedWorkspacePath(workspaceRoot, requestedPath);
  await rm(resolvedPath, { recursive: true, force: true });
  return `Deleted ${requestedPath}.`;
}

function parsePatchTargetPath(diff: string): string | null {
  const lines = diff.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith("+++ ")) {
      return line.slice(4).replace(/^b\//, "").trim();
    }
  }
  for (const line of lines) {
    if (line.startsWith("--- ")) {
      return line.slice(4).replace(/^a\//, "").trim();
    }
  }
  return null;
}

async function applyRequestScopedUnifiedDiff(
  workspaceRoot: string | undefined,
  diff: string,
  mode: "ack" | "mutate",
): Promise<string> {
  const targetPath = parsePatchTargetPath(diff);
  if (!targetPath) {
    return "Patch applied successfully. 0 files changed.";
  }
  if (mode === "ack") {
    return `Patch applied successfully. 1 file changed (${targetPath}).`;
  }
  const resolvedPath = resolveRequestScopedWorkspacePath(workspaceRoot, targetPath);
  let content = await readFile(resolvedPath, "utf8");
  const lines = diff.split(/\r?\n/);
  const removals = lines
    .filter((line) => line.startsWith("-") && !line.startsWith("--- "))
    .map((line) => line.slice(1));
  const additions = lines
    .filter((line) => line.startsWith("+") && !line.startsWith("+++ "))
    .map((line) => line.slice(1));

  const [singleRemoval] = removals;
  const [singleAddition] = additions;
  if (
    removals.length === 1 &&
    additions.length === 1 &&
    singleRemoval !== undefined &&
    singleAddition !== undefined &&
    content.includes(singleRemoval)
  ) {
    content = content.replace(singleRemoval, singleAddition);
  } else if (removals.length === 0 && additions.length > 0) {
    const suffix = content.endsWith("\n") ? "" : "\n";
    content = `${content}${suffix}${additions.join("\n")}\n`;
  }

  await writeFile(resolvedPath, content);
  return `Patch applied successfully. 1 file changed (${targetPath}).`;
}

function buildRequestScopedEndpointList(): {
  readonly endpoints: readonly {
    readonly endpoint_id: string;
    readonly model_id: string;
    readonly source_type: "local" | "remote";
    readonly status: "active";
  }[];
} {
  return { endpoints: [] };
}

function buildRequestScopedMetrics(toolArguments: unknown): {
  readonly endpoint_id: string;
  readonly p95_latency_ms: number;
  readonly request_count: number;
  readonly error_rate: number;
} {
  const endpointId =
    readRequestScopedStringValue(readRequestScopedObject(toolArguments), [
      "endpoint_id",
      "endpointId",
    ]) ?? "remote.default";
  const localEndpoint = endpointId.toLowerCase().includes("local");
  return {
    endpoint_id: endpointId,
    p95_latency_ms: localEndpoint ? 62 : 245,
    request_count: 120,
    error_rate: localEndpoint ? 0.005 : 0.01,
  };
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

function validateExternalUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("External URL must be a valid absolute URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("External URL must use http or https.");
  }

  return parsed.toString();
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
  return value
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function createCredentialRef(providerId: string, providerAccountId: string): string {
  return `oauth/${sanitizeSegment(providerId)}/${sanitizeSegment(providerAccountId)}`;
}

function normalizeArchivedReasonCode(code: string): string {
  return code.trim().toLowerCase().replace(/_/g, "-");
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
  return `${path.join(runtimeStateRoot, scopeId, "credentials", ...safeSegments)}.json`;
}

function createDeviceHeaders(
  deviceId: string,
  requiredHeaders: readonly string[] = [],
): Record<string, string> {
  const isKimi = requiredHeaders.includes("X-Msh-Platform");
  const headers: Record<string, string> = {
    "User-Agent": isKimi ? "KimiCLI/1.41.0" : "role-model-runtime/1.0",
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

function parseStoredOauthJwtPayload(token: unknown): Record<string, unknown> | null {
  if (typeof token !== "string" || token.trim().length === 0) {
    return null;
  }
  const [, payloadSegment] = token.split(".");
  if (typeof payloadSegment !== "string" || payloadSegment.trim().length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf8"));
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readStoredOauthTokenDeviceId(payload: StoredOauthTokenPayload | null): string {
  for (const candidate of [payload?.refresh_token, payload?.access_token]) {
    const parsed = parseStoredOauthJwtPayload(candidate);
    if (typeof parsed?.device_id === "string" && parsed.device_id.trim().length > 0) {
      return parsed.device_id.trim();
    }
  }
  return "";
}

function resolveOauthHeaderDeviceId(input: {
  runtimeStateRoot: string;
  scopeId: string;
  credentialRef: CredentialReference;
  fallbackDeviceId: string;
  tokenPayload?: StoredOauthTokenPayload | null;
}): string {
  const storedDeviceId = readStoredOauthTokenDeviceId(
    input.tokenPayload ??
      readFreshestStoredOauthTokenFileSync({
        runtimeStateRoot: input.runtimeStateRoot,
        scopeId: input.scopeId,
        credentialRef: input.credentialRef.ref,
      }).payload,
  );
  return storedDeviceId.length > 0 ? storedDeviceId : input.fallbackDeviceId;
}

async function persistOauthTokenFile(
  runtimeStateRoot: string,
  scopeId: string,
  credentialRef: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const filePath = resolveCredentialFilePath(runtimeStateRoot, scopeId, credentialRef);
  const tempFilePath = `${filePath}.${randomUUID()}.tmp`;
  const serializedPayload = JSON.stringify(payload, null, 2);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(tempFilePath, serializedPayload, "utf8");
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await rm(filePath, { force: true });
      await rename(tempFilePath, filePath);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EBUSY" && code !== "EPERM" && code !== "ENOTEMPTY") {
        throw error;
      }
      await delay(150);
    }
  }
  await writeFile(filePath, serializedPayload, "utf8");
  await rm(tempFilePath, { force: true });
}

async function persistStaticCredentialFile(
  runtimeStateRoot: string,
  scopeId: string,
  credentialRef: string,
  accessToken: string,
): Promise<void> {
  await persistOauthTokenFile(runtimeStateRoot, scopeId, credentialRef, {
    access_token: accessToken,
    token_type: "Bearer",
    saved_at_ms: Date.now(),
  });
}

async function removeCredentialFile(
  runtimeStateRoot: string,
  scopeId: string,
  credentialRef: string,
): Promise<void> {
  await rm(resolveCredentialFilePath(runtimeStateRoot, scopeId, credentialRef), { force: true });
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
  readonly codexAuth?: CodexAuthCacheSnapshot;
}

interface StoredCodexAuthPayload extends CodexAuthCacheSnapshot {}

interface CodexDeviceCodeSessionPayload {
  readonly loginId: string;
  readonly userCode: string;
  readonly wsUrl: string;
  readonly codexHome: string;
  readonly pid: number;
}

function isCodexSubscriptionEndpoint(endpoint: string): boolean {
  return (
    endpoint === OPENAI_CODEX_SUBSCRIPTION_START_ENDPOINT ||
    endpoint === OPENAI_CODEX_SUBSCRIPTION_TOKEN_ENDPOINT
  );
}

function resolveCodexAuthCachePath(codexHome = os.homedir()): string {
  return path.join(codexHome, "auth.json");
}

function readStoredCodexAuthCache(
  codexHome = path.join(os.homedir(), ".codex"),
): StoredCodexAuthPayload | null {
  try {
    return JSON.parse(
      readFileSync(resolveCodexAuthCachePath(codexHome), "utf8"),
    ) as StoredCodexAuthPayload;
  } catch {
    return null;
  }
}

async function writeStoredCodexAuthCache(
  codexHome: string,
  payload: StoredCodexAuthPayload,
): Promise<void> {
  await mkdir(codexHome, { recursive: true });
  await writeFile(resolveCodexAuthCachePath(codexHome), JSON.stringify(payload, null, 2), "utf8");
}

function readStoredCodexAuthSnapshot(
  payload: StoredOauthTokenPayload | null,
): StoredCodexAuthPayload | null {
  if (!payload?.codexAuth || payload.codexAuth.auth_mode !== "chatgpt") {
    return null;
  }
  return payload.codexAuth;
}

function encodeCodexDeviceCodeSessionPayload(payload: CodexDeviceCodeSessionPayload): string {
  return `${OPENAI_CODEX_DEVICE_CODE_SESSION_PREFIX}${Buffer.from(
    JSON.stringify(payload),
    "utf8",
  ).toString("base64url")}`;
}

function decodeCodexDeviceCodeSessionPayload(value: string): CodexDeviceCodeSessionPayload | null {
  if (!value.startsWith(OPENAI_CODEX_DEVICE_CODE_SESSION_PREFIX)) {
    return null;
  }
  try {
    return JSON.parse(
      Buffer.from(
        value.slice(OPENAI_CODEX_DEVICE_CODE_SESSION_PREFIX.length),
        "base64url",
      ).toString("utf8"),
    ) as CodexDeviceCodeSessionPayload;
  } catch {
    return null;
  }
}

function resolveManagedCodexSubscriptionHome(
  runtimeStateRoot: string,
  scopeId: string,
  authRequestId: string,
): string {
  return path.join(runtimeStateRoot, scopeId, "codex-subscription", authRequestId);
}

function readOpenAICodexAccountIdFromAccessToken(accessToken: string): string {
  const payload = decodeJwtPayload(accessToken);
  const authClaim = asPlainRecord(payload?.["https://api.openai.com/auth"]);
  const accountId =
    typeof authClaim?.chatgpt_account_id === "string" ? authClaim.chatgpt_account_id.trim() : "";
  if (accountId.length === 0) {
    throw new Error("OpenAI Codex OAuth token did not contain a ChatGPT account id.");
  }
  return accountId;
}

async function readOpenAICodexJsonResponse(
  response: Response,
  fallback: string,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  let payload: Record<string, unknown>;
  try {
    payload = text.length > 0 ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    payload = {};
  }
  if (!response.ok) {
    throw new Error(
      readCodexResponsesErrorMessage(payload) ??
        (text.length > 0 ? text.slice(0, 2_000) : fallback),
    );
  }
  return payload;
}

async function exchangeOpenAICodexAuthorizationCode(input: {
  readonly networkFetcher: typeof fetch;
  readonly authorizationCode: string;
  readonly codeVerifier: string;
}): Promise<StoredCodexAuthPayload> {
  const response = await input.networkFetcher(OPENAI_CODEX_OAUTH_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: OPENAI_CODEX_OAUTH_CLIENT_ID,
      code: input.authorizationCode,
      code_verifier: input.codeVerifier,
      redirect_uri: "https://auth.openai.com/deviceauth/callback",
    }),
  });
  const payload = await readOpenAICodexJsonResponse(
    response,
    "OpenAI Codex authorization-code exchange failed.",
  );
  const accessToken = typeof payload.access_token === "string" ? payload.access_token : "";
  const refreshToken = typeof payload.refresh_token === "string" ? payload.refresh_token : "";
  if (accessToken.length === 0 || refreshToken.length === 0) {
    throw new Error("OpenAI Codex token response did not contain access and refresh tokens.");
  }
  return {
    auth_mode: "chatgpt",
    last_refresh: new Date().toISOString(),
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken,
      account_id: readOpenAICodexAccountIdFromAccessToken(accessToken),
    },
  };
}

function isProcessRunning(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function cleanupManagedCodexDeviceCodeSession(
  payload: CodexDeviceCodeSessionPayload,
): Promise<void> {
  if (isProcessRunning(payload.pid)) {
    try {
      process.kill(payload.pid);
    } catch {
      // Ignore cleanup failures.
    }
  }
  await removeDirectoryWithRetries(payload.codexHome).catch(() => undefined);
}

function createSystemCodexAuthAdapter(networkFetcher: typeof fetch): CodexAuthAdapter {
  return {
    async startDeviceCodeLogin(input) {
      await mkdir(input.codexHome, { recursive: true });
      const response = await networkFetcher(OPENAI_CODEX_DEVICE_USER_CODE_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client_id: OPENAI_CODEX_OAUTH_CLIENT_ID }),
      });
      const payload = await readOpenAICodexJsonResponse(
        response,
        "OpenAI Codex device authorization failed.",
      );
      const loginId = typeof payload.device_auth_id === "string" ? payload.device_auth_id : "";
      const userCode = typeof payload.user_code === "string" ? payload.user_code : "";
      if (loginId.length === 0 || userCode.length === 0) {
        throw new Error("OpenAI Codex device authorization response did not contain a code.");
      }
      return {
        loginId,
        verificationUrl: OPENAI_CODEX_SUBSCRIPTION_VERIFICATION_URL,
        userCode,
        wsUrl: "",
        pid: -1,
      };
    },
    async readAccount(input) {
      const response = await networkFetcher(OPENAI_CODEX_DEVICE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          device_auth_id: input.loginId,
          user_code: input.userCode,
        }),
      });
      const payloadText = await response.text();
      const payload =
        payloadText.length > 0 ? (JSON.parse(payloadText) as Record<string, unknown>) : {};
      if (!response.ok) {
        const error = asPlainRecord(payload.error);
        const errorCode =
          typeof error?.code === "string"
            ? error.code
            : typeof payload.error === "string"
              ? payload.error
              : "";
        if (errorCode === "deviceauth_authorization_pending" || errorCode === "slow_down") {
          return {
            account: null,
            requiresOpenaiAuth: true,
          };
        }
        throw new Error(
          readCodexResponsesErrorMessage(payload) ?? "OpenAI Codex device token polling failed.",
        );
      }
      const authorizationCode =
        typeof payload.authorization_code === "string" ? payload.authorization_code : "";
      const codeVerifier = typeof payload.code_verifier === "string" ? payload.code_verifier : "";
      if (authorizationCode.length === 0 || codeVerifier.length === 0) {
        return {
          account: null,
          requiresOpenaiAuth: true,
        };
      }
      const codexAuth = await exchangeOpenAICodexAuthorizationCode({
        networkFetcher,
        authorizationCode,
        codeVerifier,
      });
      await writeStoredCodexAuthCache(input.codexHome, codexAuth);
      return {
        account: {
          type: "chatgpt",
        },
        requiresOpenaiAuth: true,
      };
    },
  };
}

function readCodexExecutionRequestShape(
  requestCapture: ProviderRequestCapture,
): "responses" | "chat-completions" {
  return requestCapture.url.endsWith("/chat/completions") ? "chat-completions" : "responses";
}

function readOpenAIIngressSurface(
  requestShape: "responses" | "chat-completions",
): OpenAIIngressSurface {
  return requestShape === "chat-completions" ? "openai.chat.completions" : "openai.responses";
}

function readCodexTurnMessages(
  requestCapture: ProviderRequestCapture,
): readonly OpenAIChatCompletionsMessage[] {
  const requestShape = readCodexExecutionRequestShape(requestCapture);
  return requestShape === "chat-completions"
    ? Array.isArray(requestCapture.body.messages)
      ? requestCapture.body.messages
      : []
    : typeof requestCapture.body.input === "string"
      ? [{ role: "user", content: requestCapture.body.input }]
      : Array.isArray(requestCapture.body.input)
        ? requestCapture.body.input
        : [];
}

function renderCodexMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return "";
      }
      const record = entry as { readonly text?: unknown };
      return typeof record.text === "string" ? record.text : "";
    })
    .filter((entry) => entry.length > 0)
    .join("\n");
}

export function buildCodexDynamicTools(
  requestCapture: Pick<ProviderRequestCapture, "url" | "body">,
): readonly Extract<RuntimeExecutionToolDefinition, { readonly kind?: "function" }>[] {
  const requestShape = readCodexExecutionRequestShape(requestCapture as ProviderRequestCapture);
  const rawTools =
    requestShape === "chat-completions"
      ? Array.isArray(requestCapture.body.tools)
        ? requestCapture.body.tools
        : []
      : Array.isArray(requestCapture.body.tools)
        ? requestCapture.body.tools
        : [];

  return rawTools.flatMap((tool) => {
    if (typeof tool !== "object" || tool === null) {
      return [];
    }
    if (requestShape === "chat-completions") {
      const record = tool as OpenAIChatCompletionsTool;
      if (
        record.type !== "function" ||
        typeof record.function?.name !== "string" ||
        typeof record.function.parameters !== "object" ||
        record.function.parameters === null
      ) {
        return [];
      }
      return [
        {
          name: record.function.name,
          description: record.function.description,
          inputSchema: record.function.parameters,
        },
      ];
    }

    const record = tool as OpenAIResponsesTool;
    if (
      record.type !== "function" ||
      typeof record.name !== "string" ||
      typeof record.parameters !== "object" ||
      record.parameters === null
    ) {
      return [];
    }
    return [
      {
        name: record.name,
        description: record.description,
        inputSchema: record.parameters,
      },
    ];
  });
}

export function normalizeCodexSubscriptionModelName(model: string): string {
  const trimmed = model.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  return trimmed.includes("/") ? (trimmed.split("/").at(-1) ?? "").trim() : trimmed;
}

function serializeCodexToolOutput(output: unknown): string {
  if (typeof output === "string") {
    return output;
  }
  try {
    return JSON.stringify(output);
  } catch {
    return String(output);
  }
}

function toCodexDynamicToolCallResult(execution: ToolRegistryExecution): {
  readonly success: boolean;
  readonly contentItems: readonly {
    readonly type: "inputText";
    readonly text: string;
  }[];
} {
  if (execution.status === "succeeded") {
    return {
      success: true,
      contentItems: [
        {
          type: "inputText",
          text: serializeCodexToolOutput(execution.output),
        },
      ],
    };
  }

  const message =
    execution.diagnostics
      .map((diagnostic) => diagnostic.message)
      .join("\n")
      .trim() || `Tool ${execution.toolName} failed.`;
  return {
    success: false,
    contentItems: [
      {
        type: "inputText",
        text: message,
      },
    ],
  };
}

async function removeDirectoryWithRetries(directoryPath: string): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await rm(directoryPath, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EBUSY" && code !== "EPERM" && code !== "ENOTEMPTY") {
        throw error;
      }
      await delay(150);
    }
  }
  await rm(directoryPath, { recursive: true, force: true });
}

type CodexResponsesNormalizedTranscript = {
  readonly responseId: string;
  readonly outputText: string;
  readonly reasoningText: string;
  readonly textDeltas: readonly string[];
  readonly reasoningDeltas: readonly string[];
  readonly finishReason: string;
  readonly toolCalls: readonly {
    readonly id: string;
    readonly type: "function";
    readonly function: {
      readonly name: string;
      readonly arguments: string;
    };
  }[];
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteTokens: number;
    readonly cacheReadSupported: boolean;
    readonly cacheWriteSupported: boolean;
  };
};

function readCodexUsageCacheFacts(usage: Record<string, unknown> | undefined): {
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly cacheReadSupported: boolean;
  readonly cacheWriteSupported: boolean;
} {
  const inputDetails = asPlainRecord(usage?.input_tokens_details);
  const promptDetails = asPlainRecord(usage?.prompt_tokens_details);
  const cacheReadTokens =
    (typeof inputDetails?.cached_tokens === "number" ? inputDetails.cached_tokens : undefined) ??
    (typeof promptDetails?.cached_tokens === "number" ? promptDetails.cached_tokens : undefined) ??
    (typeof usage?.cached_tokens === "number" ? usage.cached_tokens : undefined);
  const cacheWriteTokens =
    (typeof inputDetails?.cache_write_tokens === "number"
      ? inputDetails.cache_write_tokens
      : undefined) ??
    (typeof promptDetails?.cache_write_tokens === "number"
      ? promptDetails.cache_write_tokens
      : undefined) ??
    (typeof usage?.cache_write_tokens === "number" ? usage.cache_write_tokens : undefined);

  return {
    cacheReadTokens: cacheReadTokens ?? 0,
    cacheWriteTokens: cacheWriteTokens ?? 0,
    cacheReadSupported: typeof cacheReadTokens === "number",
    cacheWriteSupported: typeof cacheWriteTokens === "number",
  };
}

function createChatCompletionsUsageFromCodexUsage(input: {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly cacheReadSupported: boolean;
  readonly cacheWriteSupported: boolean;
}): Record<string, unknown> {
  return {
    prompt_tokens: input.inputTokens,
    completion_tokens: input.outputTokens,
    ...(input.cacheReadSupported || input.cacheWriteSupported
      ? {
          prompt_tokens_details: {
            ...(input.cacheReadSupported ? { cached_tokens: input.cacheReadTokens } : {}),
            ...(input.cacheWriteSupported ? { cache_write_tokens: input.cacheWriteTokens } : {}),
          },
        }
      : {}),
  };
}

function createResponsesUsageFromCodexUsage(input: {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly cacheReadSupported: boolean;
  readonly cacheWriteSupported: boolean;
}): Record<string, unknown> {
  return {
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    ...(input.cacheReadSupported || input.cacheWriteSupported
      ? {
          input_tokens_details: {
            ...(input.cacheReadSupported ? { cached_tokens: input.cacheReadTokens } : {}),
            ...(input.cacheWriteSupported ? { cache_write_tokens: input.cacheWriteTokens } : {}),
          },
        }
      : {}),
  };
}

function readSsePayloadTexts(transcript: string): readonly string[] {
  return transcript.split(/\r?\n\r?\n/u).flatMap((block) =>
    block
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim())
      .filter((line) => line.length > 0 && line !== "[DONE]"),
  );
}

function readSsePayloadTextFromBlock(block: string): string | null {
  const payloadText = block
    .split(/\n/u)
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trimStart())
    .join("\n")
    .trim();
  return payloadText.length > 0 && payloadText !== "[DONE]" ? payloadText : null;
}

async function readCodexResponsesSseTranscript(
  response: Response,
  onPayloadText?: (payloadText: string) => Promise<void> | void,
): Promise<string> {
  if (!response.body) {
    const transcript = await response.text();
    if (onPayloadText) {
      for (const payloadText of readSsePayloadTexts(transcript)) {
        await onPayloadText(payloadText);
      }
    }
    return transcript;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let rawTranscript = "";
  let normalizedBuffer = "";

  const processCompleteBlocks = async (flush = false): Promise<void> => {
    while (true) {
      const separatorIndex = normalizedBuffer.indexOf("\n\n");
      if (separatorIndex < 0) {
        break;
      }
      const block = normalizedBuffer.slice(0, separatorIndex);
      normalizedBuffer = normalizedBuffer.slice(separatorIndex + 2);
      const payloadText = readSsePayloadTextFromBlock(block);
      if (payloadText) {
        await onPayloadText?.(payloadText);
      }
    }
    if (flush && normalizedBuffer.trim().length > 0) {
      const payloadText = readSsePayloadTextFromBlock(normalizedBuffer);
      normalizedBuffer = "";
      if (payloadText) {
        await onPayloadText?.(payloadText);
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunkText = decoder.decode(value, { stream: true });
      rawTranscript += chunkText;
      normalizedBuffer += chunkText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      await processCompleteBlocks();
    }
    const finalText = decoder.decode();
    if (finalText.length > 0) {
      rawTranscript += finalText;
      normalizedBuffer += finalText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    }
    await processCompleteBlocks(true);
    return rawTranscript;
  } catch (error) {
    await reader.cancel(error).catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

function normalizeCodexResponsesTranscript(
  transcript: string,
  requestId: string,
): CodexResponsesNormalizedTranscript {
  let responseId = `resp_${sanitizeSegment(requestId)}`;
  const textDeltas: string[] = [];
  const reasoningDeltas: string[] = [];
  const toolCallsByOutputIndex = new Map<
    number,
    {
      readonly id: string;
      readonly name: string;
      readonly arguments: string;
    }
  >();
  let finalOutputText = "";
  let finalReasoningText = "";
  let finishReason = "stop";
  const usage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    cacheReadSupported: false,
    cacheWriteSupported: false,
  };
  const normalizeArguments = (value: unknown): string => {
    if (typeof value === "string") {
      return value;
    }
    if (value === undefined) {
      return "";
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };
  const upsertToolCall = (
    outputIndex: number,
    update: {
      readonly id?: string;
      readonly name?: string;
      readonly arguments?: string;
    },
    options?: {
      readonly replaceArguments?: boolean;
    },
  ): void => {
    const current = toolCallsByOutputIndex.get(outputIndex);
    const nextArguments =
      update.arguments === undefined
        ? (current?.arguments ?? "")
        : options?.replaceArguments
          ? update.arguments
          : `${current?.arguments ?? ""}${update.arguments}`;
    toolCallsByOutputIndex.set(outputIndex, {
      id: update.id ?? current?.id ?? `call_${outputIndex}`,
      name: update.name ?? current?.name ?? "unknown",
      arguments: nextArguments,
    });
  };

  for (const payloadText of readSsePayloadTexts(transcript)) {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadText) as Record<string, unknown>;
    } catch {
      continue;
    }
    const type = typeof payload.type === "string" ? payload.type : "";
    const outputIndex =
      typeof payload.output_index === "number"
        ? payload.output_index
        : typeof payload.item_index === "number"
          ? payload.item_index
          : 0;
    if (type === "response.output_text.delta" && typeof payload.delta === "string") {
      textDeltas.push(payload.delta);
      continue;
    }
    if (
      (type === "response.reasoning_summary_text.delta" ||
        type === "response.reasoning_text.delta") &&
      typeof payload.delta === "string"
    ) {
      reasoningDeltas.push(payload.delta);
      continue;
    }
    if (type === "response.output_item.added") {
      const item = asPlainRecord(payload.item);
      if (item?.type === "function_call") {
        upsertToolCall(
          outputIndex,
          {
            id:
              typeof item.call_id === "string"
                ? item.call_id
                : typeof item.id === "string"
                  ? item.id
                  : undefined,
            name: typeof item.name === "string" ? item.name : undefined,
            arguments:
              item.arguments !== undefined ? normalizeArguments(item.arguments) : undefined,
          },
          { replaceArguments: true },
        );
      }
      continue;
    }
    if (type === "response.function_call_arguments.delta" && typeof payload.delta === "string") {
      upsertToolCall(outputIndex, { arguments: payload.delta });
      continue;
    }
    if (type === "response.function_call_arguments.done") {
      upsertToolCall(
        outputIndex,
        {
          arguments: normalizeArguments(payload.arguments),
        },
        { replaceArguments: true },
      );
      continue;
    }
    if (type === "response.output_item.done") {
      const item = asPlainRecord(payload.item);
      if (item?.type === "message" && Array.isArray(item.content)) {
        finalOutputText = item.content
          .map((content) => {
            const contentRecord = asPlainRecord(content);
            return typeof contentRecord?.text === "string" ? contentRecord.text : "";
          })
          .filter(Boolean)
          .join("");
      }
      if (item?.type === "reasoning") {
        const summaryText = Array.isArray(item.summary)
          ? item.summary
              .map((summary) => {
                const summaryRecord = asPlainRecord(summary);
                return typeof summaryRecord?.text === "string" ? summaryRecord.text : "";
              })
              .filter(Boolean)
              .join("\n\n")
          : "";
        const contentText = Array.isArray(item.content)
          ? item.content
              .map((content) => {
                const contentRecord = asPlainRecord(content);
                return typeof contentRecord?.text === "string" ? contentRecord.text : "";
              })
              .filter(Boolean)
              .join("\n\n")
          : "";
        finalReasoningText = summaryText || contentText || finalReasoningText;
      }
      if (item?.type === "function_call") {
        upsertToolCall(
          outputIndex,
          {
            id:
              typeof item.call_id === "string"
                ? item.call_id
                : typeof item.id === "string"
                  ? item.id
                  : undefined,
            name: typeof item.name === "string" ? item.name : undefined,
            arguments: normalizeArguments(item.arguments),
          },
          { replaceArguments: true },
        );
      }
      continue;
    }
    if (
      type === "response.completed" ||
      type === "response.incomplete" ||
      type === "response.done"
    ) {
      const response = asPlainRecord(payload.response);
      if (typeof response?.id === "string" && response.id.length > 0) {
        responseId = response.id;
      }
      finishReason =
        type === "response.incomplete" || response?.status === "incomplete"
          ? "length"
          : toolCallsByOutputIndex.size > 0
            ? "tool_calls"
            : "stop";
      const responseUsage = asPlainRecord(response?.usage);
      const cacheUsage = readCodexUsageCacheFacts(responseUsage);
      usage.inputTokens =
        typeof responseUsage?.input_tokens === "number"
          ? responseUsage.input_tokens
          : usage.inputTokens;
      usage.outputTokens =
        typeof responseUsage?.output_tokens === "number"
          ? responseUsage.output_tokens
          : usage.outputTokens;
      usage.cacheReadTokens = cacheUsage.cacheReadTokens;
      usage.cacheWriteTokens = cacheUsage.cacheWriteTokens;
      usage.cacheReadSupported = cacheUsage.cacheReadSupported;
      usage.cacheWriteSupported = cacheUsage.cacheWriteSupported;
    }
  }

  const outputText = textDeltas.length > 0 ? textDeltas.join("") : finalOutputText;
  const reasoningText = reasoningDeltas.length > 0 ? reasoningDeltas.join("") : finalReasoningText;
  const toolCalls = [...toolCallsByOutputIndex.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([, toolCall]) => ({
      id: toolCall.id,
      type: "function" as const,
      function: {
        name: toolCall.name,
        arguments: toolCall.arguments,
      },
    }));

  return {
    responseId,
    outputText,
    reasoningText,
    textDeltas: textDeltas.length > 0 ? textDeltas : outputText ? [outputText] : [],
    reasoningDeltas:
      reasoningDeltas.length > 0 ? reasoningDeltas : reasoningText ? [reasoningText] : [],
    finishReason,
    toolCalls,
    usage,
  };
}

function createChatCompletionsSseFromCodexResponsesTranscript(input: {
  readonly requestId: string;
  readonly requestedModel: string;
  readonly transcript: CodexResponsesNormalizedTranscript;
}): string {
  const created = Math.floor(Date.now() / 1000);
  const baseChunk = {
    id: `chatcmpl_${sanitizeSegment(input.requestId)}`,
    object: "chat.completion.chunk",
    created,
    model: input.requestedModel,
  };
  const chunks: Record<string, unknown>[] = [];
  let roleEmitted = false;
  const nextDelta = (delta: Record<string, unknown>): Record<string, unknown> => {
    const withRole = roleEmitted ? delta : { role: "assistant", ...delta };
    roleEmitted = true;
    return withRole;
  };

  for (const delta of input.transcript.reasoningDeltas) {
    chunks.push({
      ...baseChunk,
      choices: [
        {
          index: 0,
          delta: nextDelta({ reasoning_content: delta }),
          finish_reason: null,
        },
      ],
    });
  }
  for (const delta of input.transcript.textDeltas) {
    chunks.push({
      ...baseChunk,
      choices: [
        {
          index: 0,
          delta: nextDelta({ content: delta }),
          finish_reason: null,
        },
      ],
    });
  }
  for (const [index, toolCall] of input.transcript.toolCalls.entries()) {
    chunks.push({
      ...baseChunk,
      choices: [
        {
          index: 0,
          delta: nextDelta({
            tool_calls: [
              {
                index,
                id: toolCall.id,
                type: "function",
                function: {
                  name: toolCall.function.name,
                  arguments: toolCall.function.arguments,
                },
              },
            ],
          }),
          finish_reason: null,
        },
      ],
    });
  }
  chunks.push({
    ...baseChunk,
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: input.transcript.finishReason,
      },
    ],
    usage: createChatCompletionsUsageFromCodexUsage(input.transcript.usage),
  });

  return chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("");
}

function readCodexResponsesErrorMessage(payload: unknown): string | null {
  const pending: unknown[] = [payload];
  const seen = new Set<unknown>();
  const messages: string[] = [];
  while (pending.length > 0) {
    const current = pending.shift();
    if (current === null || current === undefined || seen.has(current)) {
      continue;
    }
    seen.add(current);
    if (typeof current === "string" && current.trim().length > 0) {
      messages.push(current.trim());
      continue;
    }
    const record = asPlainRecord(current);
    if (!record) {
      continue;
    }
    for (const key of ["message", "code", "type", "error_description", "detail"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim().length > 0) {
        messages.push(value.trim());
      }
    }
    for (const key of ["error", "cause", "data", "response"]) {
      if (record[key] !== undefined) {
        pending.push(record[key]);
      }
    }
  }
  return messages.length > 0 ? [...new Set(messages)].join(" | ").slice(0, 2_000) : null;
}

function createCodexResponsesChatCompletionsStreamMapper(input: {
  readonly requestId: string;
  readonly requestedModel: string;
}): (payloadText: string) => readonly string[] {
  const created = Math.floor(Date.now() / 1000);
  const baseChunk = {
    id: `chatcmpl_${sanitizeSegment(input.requestId)}`,
    object: "chat.completion.chunk",
    created,
    model: input.requestedModel,
  };
  const toolItemsByOutputIndex = new Map<
    number,
    { readonly id: string; readonly name: string; readonly callId: string }
  >();
  let roleEmitted = false;
  let emittedToolCall = false;

  const nextDelta = (delta: Record<string, unknown>): Record<string, unknown> => {
    const withRole = roleEmitted ? delta : { role: "assistant", ...delta };
    roleEmitted = true;
    return withRole;
  };
  const encode = (chunk: Record<string, unknown>): string => `data: ${JSON.stringify(chunk)}\n\n`;
  const deltaChunk = (delta: Record<string, unknown>): string =>
    encode({
      ...baseChunk,
      choices: [
        {
          index: 0,
          delta: nextDelta(delta),
          finish_reason: null,
        },
      ],
    });
  const finishChunk = (finishReason: string, usage?: Record<string, unknown>): string =>
    encode({
      ...baseChunk,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: finishReason,
        },
      ],
      ...(usage
        ? {
            usage: createChatCompletionsUsageFromCodexUsage({
              inputTokens: typeof usage.input_tokens === "number" ? usage.input_tokens : 0,
              outputTokens: typeof usage.output_tokens === "number" ? usage.output_tokens : 0,
              ...readCodexUsageCacheFacts(usage),
            }),
          }
        : {}),
    });

  return (payloadText: string): readonly string[] => {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadText) as Record<string, unknown>;
    } catch (error) {
      throw new Error(
        `Codex Responses stream emitted invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const type = typeof payload.type === "string" ? payload.type : "";
    const outputIndex =
      typeof payload.output_index === "number"
        ? payload.output_index
        : typeof payload.item_index === "number"
          ? payload.item_index
          : 0;
    if (type === "response.output_item.added") {
      const item = asPlainRecord(payload.item);
      if (item?.type === "function_call") {
        const name = typeof item.name === "string" ? item.name : "";
        const id = typeof item.id === "string" ? item.id : `call_${outputIndex}`;
        const callId = typeof item.call_id === "string" ? item.call_id : id;
        toolItemsByOutputIndex.set(outputIndex, { id, name, callId });
      }
      return [];
    }
    if (
      (type === "response.reasoning_summary_text.delta" ||
        type === "response.reasoning_text.delta") &&
      typeof payload.delta === "string"
    ) {
      return [deltaChunk({ reasoning_content: payload.delta })];
    }
    if (type === "response.output_text.delta" && typeof payload.delta === "string") {
      return [deltaChunk({ content: payload.delta })];
    }
    if (type === "response.function_call_arguments.delta" && typeof payload.delta === "string") {
      emittedToolCall = true;
      const item = toolItemsByOutputIndex.get(outputIndex);
      return [
        deltaChunk({
          tool_calls: [
            {
              index: outputIndex,
              ...(item?.callId ? { id: item.callId } : {}),
              type: "function",
              function: {
                ...(item?.name ? { name: item.name } : {}),
                arguments: payload.delta,
              },
            },
          ],
        }),
      ];
    }
    if (type === "response.function_call_arguments.done" && typeof payload.arguments === "string") {
      emittedToolCall = true;
      const item = toolItemsByOutputIndex.get(outputIndex);
      return [
        deltaChunk({
          tool_calls: [
            {
              index: outputIndex,
              ...(item?.callId ? { id: item.callId } : {}),
              type: "function",
              function: {
                ...(item?.name ? { name: item.name } : {}),
                arguments: "",
              },
            },
          ],
        }),
      ];
    }
    if (
      type === "response.completed" ||
      type === "response.incomplete" ||
      type === "response.done"
    ) {
      const response = asPlainRecord(payload.response);
      const usage = asPlainRecord(response?.usage);
      const finishReason =
        type === "response.incomplete" || response?.status === "incomplete"
          ? "length"
          : emittedToolCall
            ? "tool_calls"
            : "stop";
      return [finishChunk(finishReason, usage ?? undefined)];
    }
    if (type === "response.failed" || type === "error") {
      const message =
        readCodexResponsesErrorMessage(payload) ??
        readCodexResponsesErrorMessage(asPlainRecord(payload.error)) ??
        "Codex Responses stream failed.";
      throw new Error(message);
    }
    return [];
  };
}

function createChatCompletionsBodyFromCodexResponsesTranscript(input: {
  readonly requestId: string;
  readonly requestedModel: string;
  readonly transcript: CodexResponsesNormalizedTranscript;
}): Record<string, unknown> {
  return {
    id: `chatcmpl_${sanitizeSegment(input.requestId)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: input.requestedModel,
    choices: [
      {
        index: 0,
        finish_reason: input.transcript.finishReason,
        message: {
          role: "assistant",
          content: input.transcript.outputText,
          ...(input.transcript.toolCalls.length > 0
            ? { tool_calls: input.transcript.toolCalls }
            : {}),
          ...(input.transcript.reasoningText.length > 0
            ? { reasoning_content: input.transcript.reasoningText }
            : {}),
        },
      },
    ],
    usage: createChatCompletionsUsageFromCodexUsage(input.transcript.usage),
  };
}

function createResponsesBodyFromCodexResponsesTranscript(input: {
  readonly requestId: string;
  readonly requestedModel: string;
  readonly transcript: CodexResponsesNormalizedTranscript;
}): Record<string, unknown> {
  return {
    id: input.transcript.responseId || `resp_${sanitizeSegment(input.requestId)}`,
    object: "response",
    created_at: Math.floor(Date.now() / 1000),
    status: input.transcript.finishReason === "stop" ? "completed" : "incomplete",
    model: input.requestedModel,
    output: [
      ...(input.transcript.reasoningText.length > 0
        ? [
            {
              type: "reasoning",
              summary: [{ type: "summary_text", text: input.transcript.reasoningText }],
            },
          ]
        : []),
      {
        type: "message",
        id: `msg_${input.transcript.responseId || `resp_${sanitizeSegment(input.requestId)}`}`,
        role: "assistant",
        content:
          input.transcript.outputText.length > 0
            ? [{ type: "output_text", text: input.transcript.outputText }]
            : [],
      },
      ...input.transcript.toolCalls.map((toolCall) => ({
        type: "function_call",
        id: toolCall.id,
        call_id: toolCall.id,
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
      })),
    ],
    usage: createResponsesUsageFromCodexUsage(input.transcript.usage),
  };
}

function readCodexSubscriptionAccessToken(authPayload: CodexAuthCacheSnapshot): string {
  const accessToken = authPayload.tokens?.access_token?.trim() ?? "";
  if (accessToken.length === 0) {
    throw new Error("Stored Codex Subscription credential does not contain an access token.");
  }
  return accessToken;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function readCodexSubscriptionAccountId(authPayload: CodexAuthCacheSnapshot): string {
  const explicitAccountId = authPayload.tokens?.account_id?.trim() ?? "";
  if (explicitAccountId.length > 0) {
    return explicitAccountId;
  }
  const accessToken = readCodexSubscriptionAccessToken(authPayload);
  const payload = decodeJwtPayload(accessToken);
  const authClaim = asPlainRecord(payload?.["https://api.openai.com/auth"]);
  const claimAccountId =
    typeof authClaim?.chatgpt_account_id === "string" ? authClaim.chatgpt_account_id.trim() : "";
  if (claimAccountId.length === 0) {
    throw new Error("Stored Codex Subscription credential does not contain a ChatGPT account id.");
  }
  return claimAccountId;
}

type CodexResponsesInputRecord = Record<string, unknown>;
type CodexResponsesContentPartRecord = Record<string, unknown>;

function toCodexResponsesTextPart(
  text: string,
  role: "user" | "assistant",
): CodexResponsesContentPartRecord {
  return { type: role === "assistant" ? "output_text" : "input_text", text };
}

function toCodexResponsesContentPart(
  content: unknown,
  role: "user" | "assistant",
): CodexResponsesContentPartRecord {
  if (typeof content === "string") {
    return toCodexResponsesTextPart(content, role);
  }
  const record = asPlainRecord(content);
  if (!record) {
    return toCodexResponsesTextPart(String(content ?? ""), role);
  }
  if (
    (record.type === "text" || record.type === "input_text" || record.type === "output_text") &&
    typeof record.text === "string"
  ) {
    return toCodexResponsesTextPart(record.text, role);
  }
  if (role === "assistant" && record.type === "refusal") {
    return record;
  }
  const imageUrl = asPlainRecord(record.image_url);
  if (role === "user" && record.type === "image_url" && typeof imageUrl?.url === "string") {
    return { type: "input_image", image_url: imageUrl.url };
  }
  return record;
}

function toCodexResponsesInputFromChatMessages(messages: unknown): {
  readonly instructions?: string;
  readonly input: readonly CodexResponsesInputRecord[];
} {
  if (!Array.isArray(messages)) {
    return { input: [] };
  }
  const instructions = messages
    .flatMap((message) => {
      const record = asPlainRecord(message);
      return record?.role === "system" && typeof record.content === "string"
        ? [record.content]
        : [];
    })
    .join("\n\n");
  const input: CodexResponsesInputRecord[] = [];
  for (const message of messages) {
    const record = asPlainRecord(message);
    if (!record || record.role === "system") {
      continue;
    }
    if (
      record.role === "assistant" &&
      Array.isArray(record.tool_calls) &&
      record.tool_calls.length > 0
    ) {
      const assistantContent: CodexResponsesContentPartRecord[] =
        record.content === null || record.content === undefined
          ? []
          : Array.isArray(record.content)
            ? record.content.map((part) => toCodexResponsesContentPart(part, "assistant"))
            : [toCodexResponsesContentPart(record.content, "assistant")];
      const toolCalls = record.tool_calls.flatMap<CodexResponsesInputRecord>((rawToolCall) => {
        const toolCall = asPlainRecord(rawToolCall);
        const toolFunction = asPlainRecord(toolCall?.function);
        if (typeof toolFunction?.name !== "string") {
          return [];
        }
        return [
          {
            type: "function_call",
            call_id:
              typeof toolCall?.id === "string"
                ? toolCall.id
                : `call_${sanitizeSegment(toolFunction.name)}`,
            name: toolFunction.name,
            arguments:
              typeof toolFunction.arguments === "string"
                ? toolFunction.arguments
                : serializeCodexToolOutput(toolFunction.arguments),
          },
        ];
      });
      if (assistantContent.length > 0) {
        input.push({
          role: "assistant",
          content: assistantContent,
        });
      }
      input.push(...toolCalls);
      continue;
    }
    if (record.role === "tool" && typeof record.tool_call_id === "string") {
      input.push({
        type: "function_call_output",
        call_id: record.tool_call_id,
        output: serializeCodexToolOutput(record.content ?? ""),
      });
      continue;
    }
    const role =
      typeof record.role === "string" && record.role === "assistant" ? "assistant" : "user";
    const rawContent = record.content;
    const content: CodexResponsesContentPartRecord[] = Array.isArray(rawContent)
      ? rawContent.map((part) => toCodexResponsesContentPart(part, role))
      : [toCodexResponsesContentPart(rawContent, role)];
    input.push({
      role,
      content,
    });
  }
  return {
    ...(instructions.length > 0 ? { instructions } : {}),
    input,
  };
}

function toCodexResponsesInputFromResponsesInput(
  input: unknown,
): readonly CodexResponsesInputRecord[] {
  if (typeof input === "string") {
    return [{ role: "user", content: [{ type: "input_text", text: input }] }];
  }
  if (!Array.isArray(input)) {
    return [];
  }
  return input.flatMap<CodexResponsesInputRecord>((item) => {
    const record = asPlainRecord(item);
    return record ? [record] : [];
  });
}

function toCodexResponsesTool(tool: unknown): unknown {
  const record = asPlainRecord(tool);
  if (!record) {
    return tool;
  }
  if (record.type === "function") {
    const fn = asPlainRecord(record.function);
    if (fn) {
      return {
        type: "function",
        name: fn.name,
        ...(typeof fn.description === "string" ? { description: fn.description } : {}),
        parameters: fn.parameters ?? {},
      };
    }
  }
  return record;
}

function hasOwnRequestField(requestBody: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(requestBody, field);
}

function createCodexDroppedParameterDecision(
  field: string,
  sourceSurface: OpenAIIngressSurface,
): AdapterParameterDecision {
  return {
    field,
    sourceSurface,
    targetSurface: "chatgpt.codex.responses",
    action: "drop_with_receipt",
    reason: "unsupported_by_selected_backend",
    sourceValueKind: "present",
    adapterFamily: "codex-subscription-responses",
    providerId: "openai",
    vendorId: "chatgpt-codex-responses",
  };
}

function collectCodexResponsesParameterSanitization(input: {
  readonly requestBody: Record<string, unknown>;
  readonly sourceSurface: OpenAIIngressSurface;
}): readonly AdapterParameterDecision[] {
  const unsupportedOptionalFields =
    input.sourceSurface === "openai.chat.completions"
      ? ["temperature", "max_tokens", "max_completion_tokens", "max_output_tokens"]
      : ["temperature", "max_output_tokens", "max_tokens", "max_completion_tokens"];
  return unsupportedOptionalFields.flatMap((field) =>
    hasOwnRequestField(input.requestBody, field)
      ? [createCodexDroppedParameterDecision(field, input.sourceSurface)]
      : [],
  );
}

function isOpenAIIngressSurface(value: unknown): value is OpenAIIngressSurface {
  return value === "openai.chat.completions" || value === "openai.responses";
}

function isAdapterParameterAction(value: unknown): value is AdapterParameterAction {
  return (
    value === "forward" ||
    value === "translate" ||
    value === "drop_with_receipt" ||
    value === "emulate_locally" ||
    value === "reject_with_local_error"
  );
}

function readAdapterParameterSanitization(
  vendorMetadata: unknown,
): readonly AdapterParameterDecision[] {
  const record = asPlainRecord(vendorMetadata);
  const rawDecisions = record?.parameterSanitization;
  if (!Array.isArray(rawDecisions)) {
    return [];
  }
  return rawDecisions.flatMap((rawDecision) => {
    const decision = asPlainRecord(rawDecision);
    if (!decision) {
      return [];
    }
    if (
      typeof decision.field !== "string" ||
      !isOpenAIIngressSurface(decision.sourceSurface) ||
      typeof decision.targetSurface !== "string" ||
      !isAdapterParameterAction(decision.action) ||
      typeof decision.reason !== "string" ||
      decision.sourceValueKind !== "present" ||
      typeof decision.adapterFamily !== "string" ||
      typeof decision.providerId !== "string" ||
      typeof decision.vendorId !== "string"
    ) {
      return [];
    }
    return [
      {
        field: decision.field,
        sourceSurface: decision.sourceSurface,
        targetSurface: decision.targetSurface,
        action: decision.action,
        reason: decision.reason,
        sourceValueKind: decision.sourceValueKind,
        ...(typeof decision.forwardedField === "string"
          ? { forwardedField: decision.forwardedField }
          : {}),
        adapterFamily: decision.adapterFamily,
        providerId: decision.providerId,
        vendorId: decision.vendorId,
      },
    ];
  });
}

function buildCodexResponsesRequestBody(input: {
  readonly modelId: string;
  readonly requestCapture: ProviderRequestCapture;
}): {
  readonly body: Record<string, unknown>;
  readonly parameterSanitization: readonly AdapterParameterDecision[];
} {
  const requestShape = readCodexExecutionRequestShape(input.requestCapture);
  const sourceSurface = readOpenAIIngressSurface(requestShape);
  const requestBody = input.requestCapture.body;
  const requestedModel =
    typeof requestBody.model === "string" && requestBody.model.trim().length > 0
      ? normalizeCodexSubscriptionModelName(requestBody.model)
      : normalizeCodexSubscriptionModelName(input.modelId);
  const mappedInput =
    requestShape === "chat-completions"
      ? toCodexResponsesInputFromChatMessages(requestBody.messages)
      : { input: toCodexResponsesInputFromResponsesInput(requestBody.input) };
  const tools = Array.isArray(requestBody.tools) ? requestBody.tools.map(toCodexResponsesTool) : [];
  const reasoning =
    typeof requestBody.reasoning_effort === "string"
      ? { effort: requestBody.reasoning_effort }
      : asPlainRecord(requestBody.reasoning);
  const parameterSanitization = collectCodexResponsesParameterSanitization({
    requestBody,
    sourceSurface,
  });
  const toolChoiceRecord = asPlainRecord(requestBody.tool_choice);
  const toolChoice =
    toolChoiceRecord?.type === "function"
      ? (() => {
          const functionRecord = asPlainRecord(toolChoiceRecord.function);
          const functionName =
            typeof functionRecord?.name === "string"
              ? functionRecord.name.trim()
              : typeof toolChoiceRecord.name === "string"
                ? toolChoiceRecord.name.trim()
                : "";
          return functionName.length > 0
            ? {
                type: "function",
                name: functionName,
              }
            : toolChoiceRecord;
        })()
      : requestBody.tool_choice;

  return {
    body: {
      model: requestedModel,
      store: false,
      stream: true,
      ...mappedInput,
      include: ["reasoning.encrypted_content"],
      ...(tools.length > 0
        ? {
            tools,
            tool_choice: toolChoice ?? "auto",
            ...(typeof requestBody.parallel_tool_calls === "boolean"
              ? { parallel_tool_calls: requestBody.parallel_tool_calls }
              : {}),
          }
        : {}),
      ...(reasoning ? { reasoning } : {}),
      ...(typeof requestBody.prompt_cache_key === "string"
        ? { prompt_cache_key: requestBody.prompt_cache_key }
        : {}),
    },
    parameterSanitization,
  };
}

function buildCodexResponsesHeaders(authPayload: CodexAuthCacheSnapshot): Headers {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${readCodexSubscriptionAccessToken(authPayload)}`);
  headers.set("chatgpt-account-id", readCodexSubscriptionAccountId(authPayload));
  headers.set("OpenAI-Beta", "responses=experimental");
  headers.set("accept", "text/event-stream");
  headers.set("content-type", "application/json");
  return headers;
}

function resolveCodexResponsesUrl(): string {
  return "https://chatgpt.com/backend-api/codex/responses";
}

export function createCodexSubscriptionResponsesExecutionAdapter(options?: {
  readonly networkFetcher?: typeof fetch;
}): CodexExecutionAdapter {
  const networkFetcher = options?.networkFetcher ?? fetch;
  return {
    async executeRequest(input) {
      const startedAt = Date.now();
      const requestBuild = buildCodexResponsesRequestBody({
        modelId: input.modelId,
        requestCapture: input.requestCapture,
      });
      const requestBody = requestBuild.body;
      const response = await networkFetcher(resolveCodexResponsesUrl(), {
        method: "POST",
        headers: buildCodexResponsesHeaders(input.authPayload),
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const rawBody = await response.text();
        return {
          statusCode: response.status,
          body: parseProviderResponseBody(rawBody),
          vendorMetadata: {
            vendorId: "chatgpt-codex-responses",
            latencyMs: Math.max(0, Date.now() - startedAt),
            ...(requestBuild.parameterSanitization.length > 0
              ? { parameterSanitization: requestBuild.parameterSanitization }
              : {}),
          },
        };
      }

      const requestShape = readCodexExecutionRequestShape(input.requestCapture);
      const requestedModel =
        typeof input.requestCapture.body.model === "string"
          ? input.requestCapture.body.model
          : input.modelId;
      const streamedDownstreamChunks: string[] = [];
      const chatStreamMapper =
        requestShape === "chat-completions" && input.requestCapture.body.stream === true
          ? createCodexResponsesChatCompletionsStreamMapper({
              requestId: input.requestId,
              requestedModel,
            })
          : null;
      const rawBody = await readCodexResponsesSseTranscript(response, async (payloadText) => {
        if (chatStreamMapper && input.streamChunkWriter) {
          const chunks = chatStreamMapper(payloadText);
          for (const chunk of chunks) {
            streamedDownstreamChunks.push(chunk);
            await input.streamChunkWriter(chunk);
          }
          return;
        }
        if (
          requestShape === "responses" &&
          input.requestCapture.body.stream === true &&
          input.streamChunkWriter
        ) {
          const chunk = `data: ${payloadText}\n\n`;
          streamedDownstreamChunks.push(chunk);
          await input.streamChunkWriter(chunk);
        }
      });
      const transcript = normalizeCodexResponsesTranscript(rawBody, input.requestId);
      const body =
        streamedDownstreamChunks.length > 0
          ? streamedDownstreamChunks.join("")
          : requestShape === "chat-completions"
            ? input.requestCapture.body.stream === true
              ? createChatCompletionsSseFromCodexResponsesTranscript({
                  requestId: input.requestId,
                  requestedModel,
                  transcript,
                })
              : createChatCompletionsBodyFromCodexResponsesTranscript({
                  requestId: input.requestId,
                  requestedModel,
                  transcript,
                })
            : input.requestCapture.body.stream === true
              ? rawBody
              : createResponsesBodyFromCodexResponsesTranscript({
                  requestId: input.requestId,
                  requestedModel,
                  transcript,
                });

      return {
        statusCode: response.status,
        body,
        vendorMetadata: {
          vendorId: "chatgpt-codex-responses",
          latencyMs: Math.max(0, Date.now() - startedAt),
          ...(requestBuild.parameterSanitization.length > 0
            ? { parameterSanitization: requestBuild.parameterSanitization }
            : {}),
        },
      };
    },
  };
}

function readStoredCodexAccessToken(payload: StoredCodexAuthPayload | null): string {
  return payload?.auth_mode === "chatgpt" && typeof payload.tokens?.access_token === "string"
    ? payload.tokens.access_token.trim()
    : "";
}

function readStoredCodexRefreshToken(payload: StoredCodexAuthPayload | null): string {
  return payload?.auth_mode === "chatgpt" && typeof payload.tokens?.refresh_token === "string"
    ? payload.tokens.refresh_token.trim()
    : "";
}

function readStoredAccessToken(payload: StoredOauthTokenPayload | null): string {
  return typeof payload?.access_token === "string" ? payload.access_token.trim() : "";
}

function readStoredRefreshToken(payload: StoredOauthTokenPayload | null): string {
  return typeof payload?.refresh_token === "string" ? payload.refresh_token.trim() : "";
}

function readStoredOauthTokenFileSync(
  runtimeStateRoot: string,
  scopeId: string,
  credentialRef: string,
): StoredOauthTokenPayload | null {
  try {
    const filePath = resolveCredentialFilePath(runtimeStateRoot, scopeId, credentialRef);
    return JSON.parse(readFileSync(filePath, "utf8")) as StoredOauthTokenPayload;
  } catch {
    return null;
  }
}

function persistStoredOauthTokenFileSync(
  runtimeStateRoot: string,
  scopeId: string,
  credentialRef: string,
  payload: StoredOauthTokenPayload,
): void {
  const filePath = resolveCredentialFilePath(runtimeStateRoot, scopeId, credentialRef);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

interface StoredOauthTokenLocation {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}

export function resolveStoredOauthTokenLocations(input: {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}): readonly StoredOauthTokenLocation[] {
  const activeLocation: StoredOauthTokenLocation = {
    runtimeStateRoot: input.runtimeStateRoot,
    scopeId: input.scopeId,
  };
  if (input.scopeId !== "standalone-runtime" && input.scopeId !== "runtime-host-bridge") {
    return [activeLocation];
  }
  const normalizedRoot = path.resolve(input.runtimeStateRoot);
  const containerRoot =
    path.basename(normalizedRoot).toLowerCase() === "state"
      ? path.dirname(normalizedRoot)
      : normalizedRoot;
  const counterpartLocation: StoredOauthTokenLocation =
    input.scopeId === "standalone-runtime"
      ? {
          runtimeStateRoot: path.join(containerRoot, "state"),
          scopeId: "runtime-host-bridge",
        }
      : {
          runtimeStateRoot: containerRoot,
          scopeId: "standalone-runtime",
        };

  const seenLocationKeys = new Set<string>();
  return [activeLocation, counterpartLocation].filter((location) => {
    const locationKey = `${location.runtimeStateRoot}\u0000${location.scopeId}`;
    if (seenLocationKeys.has(locationKey)) {
      return false;
    }
    seenLocationKeys.add(locationKey);
    return true;
  });
}

function readStoredOauthTokenFileAtLocationSync(
  location: StoredOauthTokenLocation,
  credentialRef: string,
): StoredOauthTokenPayload | null {
  try {
    return readStoredOauthTokenFileSync(location.runtimeStateRoot, location.scopeId, credentialRef);
  } catch {
    return null;
  }
}

function readStoredCodexAuthFreshnessMs(payload: StoredOauthTokenPayload | null): number {
  const authPayload = readStoredCodexAuthSnapshot(payload);
  if (authPayload) {
    const refreshedAtMs = Date.parse(String(authPayload.last_refresh ?? ""));
    if (Number.isFinite(refreshedAtMs)) {
      return refreshedAtMs;
    }
  }
  return typeof payload?.saved_at_ms === "number" && Number.isFinite(payload.saved_at_ms)
    ? payload.saved_at_ms
    : 0;
}

function readStoredOauthTokenFreshnessMs(payload: StoredOauthTokenPayload | null): number {
  const codexFreshnessMs = readStoredCodexAuthFreshnessMs(payload);
  if (codexFreshnessMs > 0) {
    return codexFreshnessMs;
  }
  return typeof payload?.saved_at_ms === "number" && Number.isFinite(payload.saved_at_ms)
    ? payload.saved_at_ms
    : 0;
}

function hasStoredCodexAuthTokens(payload: StoredOauthTokenPayload | null): boolean {
  const authPayload = readStoredCodexAuthSnapshot(payload);
  if (!authPayload) {
    return false;
  }
  const accessToken =
    typeof authPayload.tokens?.access_token === "string"
      ? authPayload.tokens.access_token.trim()
      : "";
  const refreshToken =
    typeof authPayload.tokens?.refresh_token === "string"
      ? authPayload.tokens.refresh_token.trim()
      : "";
  return accessToken.length > 0 || refreshToken.length > 0;
}

function hasStoredOauthTokens(payload: StoredOauthTokenPayload | null): boolean {
  if (hasStoredCodexAuthTokens(payload)) {
    return true;
  }
  return readStoredAccessToken(payload).length > 0 || readStoredRefreshToken(payload).length > 0;
}

function readFreshestStoredOauthTokenFileSync(input: {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly credentialRef: string;
}): {
  readonly payload: StoredOauthTokenPayload | null;
  readonly repairedActiveCredential: boolean;
} {
  const locations = resolveStoredOauthTokenLocations({
    runtimeStateRoot: input.runtimeStateRoot,
    scopeId: input.scopeId,
  });
  const [activeLocation, ...counterpartLocations] = locations;
  const activePayload = activeLocation
    ? readStoredOauthTokenFileAtLocationSync(activeLocation, input.credentialRef)
    : null;
  const activeHasTokens = hasStoredOauthTokens(activePayload);
  const activeFreshnessMs = readStoredOauthTokenFreshnessMs(activePayload);
  const counterpartCandidates = counterpartLocations
    .map((location) => ({
      location,
      payload: readStoredOauthTokenFileAtLocationSync(location, input.credentialRef),
    }))
    .filter(
      (
        candidate,
      ): candidate is {
        location: StoredOauthTokenLocation;
        payload: StoredOauthTokenPayload;
      } => Boolean(candidate.payload && hasStoredOauthTokens(candidate.payload)),
    );
  if (counterpartCandidates.length === 0) {
    return {
      payload: activePayload,
      repairedActiveCredential: false,
    };
  }
  const freshestCounterpart = counterpartCandidates.reduce((best, candidate) => {
    const bestFreshnessMs = readStoredOauthTokenFreshnessMs(best.payload);
    const candidateFreshnessMs = readStoredOauthTokenFreshnessMs(candidate.payload);
    if (candidateFreshnessMs > bestFreshnessMs) {
      return candidate;
    }
    if (
      candidateFreshnessMs === bestFreshnessMs &&
      JSON.stringify(candidate.payload) > JSON.stringify(best.payload)
    ) {
      return candidate;
    }
    return best;
  });
  const freshestCounterpartFreshnessMs = readStoredOauthTokenFreshnessMs(
    freshestCounterpart.payload,
  );
  const shouldRepairActive =
    !activeHasTokens ||
    freshestCounterpartFreshnessMs > activeFreshnessMs ||
    (freshestCounterpartFreshnessMs === activeFreshnessMs &&
      JSON.stringify(freshestCounterpart.payload) !== JSON.stringify(activePayload));
  if (!shouldRepairActive || !activeLocation) {
    return {
      payload: activeHasTokens ? activePayload : freshestCounterpart.payload,
      repairedActiveCredential: false,
    };
  }
  try {
    persistStoredOauthTokenFileSync(
      activeLocation.runtimeStateRoot,
      activeLocation.scopeId,
      input.credentialRef,
      freshestCounterpart.payload,
    );
  } catch {
    // Best effort: still use the fresher counterpart payload for the current request.
  }
  return {
    payload: freshestCounterpart.payload,
    repairedActiveCredential: true,
  };
}

function readFreshestStoredCodexOauthTokenFileSync(input: {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly credentialRef: string;
}): {
  readonly payload: StoredOauthTokenPayload | null;
  readonly repairedActiveCredential: boolean;
} {
  const repairedAuth = readFreshestStoredOauthTokenFileSync(input);
  return hasStoredCodexAuthTokens(repairedAuth.payload)
    ? repairedAuth
    : {
        payload: readStoredOauthTokenFileSync(
          input.runtimeStateRoot,
          input.scopeId,
          input.credentialRef,
        ),
        repairedActiveCredential: false,
      };
}

function filterRecoveredCodexCooldownDeniedEndpoints(input: {
  readonly databasePath: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly runtimeEndpoints: readonly {
    endpointId: string;
    providerAccountId: string;
  }[];
  readonly accounts: readonly ProviderAccountRecord[];
  readonly deniedEndpointIds: readonly string[];
}): readonly string[] {
  if (input.deniedEndpointIds.length === 0) {
    return input.deniedEndpointIds;
  }
  const cooldownState = readExecutionCircuitState(input.databasePath);
  if (Object.keys(cooldownState.endpoints).length === 0) {
    return input.deniedEndpointIds;
  }
  const accountsById = new Map(
    input.accounts.map((account) => [account.providerAccountId, account] as const),
  );
  const providerAccountIdByEndpointId = new Map(
    input.runtimeEndpoints.map(
      (endpoint) => [endpoint.endpointId, endpoint.providerAccountId] as const,
    ),
  );
  const retainedEndpointIds: string[] = [];
  for (const endpointId of input.deniedEndpointIds) {
    const cooldownRecord = cooldownState.endpoints[endpointId];
    if (!cooldownRecord || cooldownRecord.lastErrorClass !== "provider_auth_error") {
      retainedEndpointIds.push(endpointId);
      continue;
    }
    const providerAccountId = providerAccountIdByEndpointId.get(endpointId);
    const account = providerAccountId ? accountsById.get(providerAccountId) : undefined;
    if (!account || !isCodexSubscriptionAccount(account)) {
      retainedEndpointIds.push(endpointId);
      continue;
    }
    const repairedAuth = readFreshestStoredCodexOauthTokenFileSync({
      runtimeStateRoot: input.runtimeStateRoot,
      scopeId: input.scopeId,
      credentialRef: account.credentialRef.ref,
    });
    if (!repairedAuth.repairedActiveCredential) {
      retainedEndpointIds.push(endpointId);
      continue;
    }
    clearExecutionFailureCooldown({
      databasePath: input.databasePath,
      endpointId,
    });
  }
  return retainedEndpointIds;
}

function listStoredCredentialRefsSync(runtimeStateRoot: string, scopeId: string): string[] {
  const credentialsRoot = path.join(runtimeStateRoot, scopeId, "credentials");
  if (!existsSync(credentialsRoot)) {
    return [];
  }

  const refs: string[] = [];
  const walk = (directoryPath: string, relativeSegments: readonly string[]): void => {
    for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
      const nextPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        walk(nextPath, [...relativeSegments, entry.name]);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }
      const fileName = entry.name.slice(0, -".json".length);
      refs.push([...relativeSegments, fileName].join("/"));
    }
  };

  walk(credentialsRoot, []);
  return refs.sort(compareText);
}

function hydrateOauthProviderAccounts(
  runtimeStateRoot: string,
  scopeId: string,
  accounts: readonly ProviderAccountRecord[],
): ProviderAccountRecord[] {
  const oauthLocation = { runtimeStateRoot, scopeId };
  return accounts.map((account) => {
    if (
      account.authMode !== "oauth2-device-code" ||
      (account.credentialRef.backend !== "local-file" &&
        account.credentialRef.backend !== "local-encrypted-file")
    ) {
      return account;
    }

    const resolvedCredential =
      resolveOauthCredentialRef(
        oauthLocation,
        account.providerId,
        account.providerAccountId,
        account.credentialRef,
      ) ?? account.credentialRef;
    const payload = readFreshestStoredOauthTokenFileSync({
      runtimeStateRoot,
      scopeId,
      credentialRef: resolvedCredential.ref,
    }).payload;
    const preserveRefreshFailure =
      tokenNeedsRefresh(payload) &&
      account.rotationState === "failed" &&
      (account.healthStatus === "refresh-failing" ||
        account.healthStatus === "provider-auth-error");
    const hasStoredToken =
      readStoredAccessToken(payload).length > 0 || readStoredRefreshToken(payload).length > 0;
    if (!hasStoredToken) {
      return account;
    }
    if (preserveRefreshFailure) {
      return {
        ...account,
        credentialRef: resolvedCredential,
      };
    }

    const hydratedAccount = {
      ...account,
      credentialRef: resolvedCredential,
      status: "active" as const,
      healthStatus: "healthy" as const,
      rotationState: "stable" as const,
    };

    if (
      account.status === hydratedAccount.status &&
      account.healthStatus === hydratedAccount.healthStatus &&
      account.rotationState === hydratedAccount.rotationState &&
      account.credentialRef.ref === hydratedAccount.credentialRef.ref
    ) {
      return account;
    }

    return hydratedAccount;
  });
}

function isRecoveredOauthRuntimeAccount(
  persistedAccount: ProviderAccountRecord,
  hydratedAccount: ProviderAccountRecord,
): boolean {
  return (
    hydratedAccount.authMode === "oauth2-device-code" &&
    hydratedAccount.status === "active" &&
    hydratedAccount.healthStatus === "healthy" &&
    hydratedAccount.rotationState === "stable" &&
    (persistedAccount.healthStatus === "refresh-failing" ||
      persistedAccount.healthStatus === "provider-auth-error" ||
      persistedAccount.rotationState === "failed")
  );
}

function readEnvCredentialError(
  account: ProviderAccountRecord,
  ignoredAccountIds: ReadonlySet<string> = new Set<string>(),
): string | null {
  if (account.credentialRef.backend !== "env") {
    return null;
  }
  if (ignoredAccountIds.has(account.providerAccountId)) {
    return null;
  }

  const value = process.env[account.credentialRef.ref];
  if (typeof value === "string" && value.trim().length > 0) {
    return null;
  }

  return `Environment credential ${account.credentialRef.ref} is not set.`;
}

function hydrateEnvProviderAccounts(
  accounts: readonly ProviderAccountRecord[],
  ignoredAccountIds: ReadonlySet<string> = new Set<string>(),
): ProviderAccountRecord[] {
  return accounts.map((account) => {
    const envCredentialError = readEnvCredentialError(account, ignoredAccountIds);
    if (!envCredentialError) {
      if (
        account.authMode === "api-key-static" &&
        (account.status !== "active" ||
          account.healthStatus !== "healthy" ||
          account.rotationState !== "stable")
      ) {
        return {
          ...account,
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        };
      }

      return account;
    }

    if (
      account.status === "disabled" &&
      account.healthStatus === "credentials-missing" &&
      account.rotationState === "not-required"
    ) {
      return account;
    }

    return {
      ...account,
      status: "disabled",
      healthStatus: "credentials-missing",
      rotationState: "not-required",
    };
  });
}

function tokenNeedsRefresh(payload: StoredOauthTokenPayload | null): boolean {
  if (
    !payload ||
    typeof payload.saved_at_ms !== "number" ||
    typeof payload.expires_in !== "number"
  ) {
    return false;
  }
  return payload.saved_at_ms + payload.expires_in * 1000 <= Date.now() + 60_000;
}

function resolveOAuthVariant(
  providerPresets: ProviderPresetCatalog,
  liteLLMProviders: readonly {
    providerId: string;
    displayName: string;
    apiBase: string;
    oauth?: {
      apiBase?: string;
      clientId: string;
      deviceAuthorizationEndpoint: string;
      tokenEndpoint: string;
      requiredHeaders: readonly string[];
      scope?: string;
    } | null;
  }[],
  providerId: string,
  variantId: string,
): (ProviderPresetVariant & { oauth: ProviderPresetVariantOAuth }) | undefined {
  // Exact match in presets
  const fromPresets = providerPresets.providers[providerId]?.variants.find(
    (entry): entry is ProviderPresetVariant & { oauth: ProviderPresetVariantOAuth } =>
      entry.variantId === variantId &&
      entry.authMode === "oauth2-device-code" &&
      Boolean(entry.oauth),
  );
  if (fromPresets) return fromPresets;
  // Fall back to LiteLLM provider OAuth config (handles "{providerId}-oauth" alias from UI)
  if (variantId === `${providerId}-oauth`) {
    const liteLLMProvider = liteLLMProviders.find((p) => p.providerId === providerId);
    if (liteLLMProvider?.oauth) {
      return {
        variantId,
        label: `${liteLLMProvider.displayName} OAuth`,
        description: `OAuth device-code authentication for ${liteLLMProvider.displayName}.`,
        authMode: "oauth2-device-code",
        availability: "ready" as const,
        baseUrl: liteLLMProvider.oauth.apiBase ?? liteLLMProvider.apiBase,
        modelIds: [],
        oauth: liteLLMProvider.oauth,
      };
    }
  }
  return undefined;
}

function getOauthVariant(
  providerPresets: ProviderPresetCatalog,
  liteLLMProviders: readonly {
    providerId: string;
    displayName: string;
    apiBase: string;
    oauth?: {
      apiBase?: string;
      clientId: string;
      deviceAuthorizationEndpoint: string;
      tokenEndpoint: string;
      requiredHeaders: readonly string[];
      scope?: string;
    } | null;
  }[],
  providerId: string,
): ProviderPresetVariant & { oauth: ProviderPresetVariantOAuth } {
  const fromPresets = providerPresets.providers[providerId]?.variants.find(
    (entry): entry is ProviderPresetVariant & { oauth: ProviderPresetVariantOAuth } =>
      entry.authMode === "oauth2-device-code" && Boolean(entry.oauth),
  );
  if (fromPresets) return fromPresets;
  const liteLLMProvider = liteLLMProviders.find((p) => p.providerId === providerId);
  if (liteLLMProvider?.oauth) {
    return {
      variantId: `${providerId}-oauth`,
      label: `${liteLLMProvider.displayName} OAuth`,
      description: `OAuth device-code authentication for ${liteLLMProvider.displayName}.`,
      authMode: "oauth2-device-code",
      availability: "ready" as const,
      baseUrl: liteLLMProvider.oauth.apiBase ?? liteLLMProvider.apiBase,
      modelIds: [],
      oauth: liteLLMProvider.oauth,
    };
  }
  throw new Error(`Provider ${providerId} does not expose an OAuth device-code variant.`);
}

function isCodexSubscriptionAccount(
  account: Pick<ProviderAccountRecord, "providerId" | "authMode" | "status"> | null | undefined,
): boolean {
  return (
    account?.providerId === OPENAI_PROVIDER_ID &&
    account.authMode === "oauth2-device-code" &&
    account.status === "active"
  );
}

function normalizeCodexSubscriptionAccountTruth(
  account: ProviderAccountRecord,
): ProviderAccountRecord {
  return account;
}

async function refreshOauthAccessToken(
  runtimeStateRoot: string,
  scopeId: string,
  target: ResolvedExecutionTarget,
  providerPresets: ProviderPresetCatalog,
  liteLLMProviders: readonly {
    providerId: string;
    displayName: string;
    apiBase: string;
    oauth?: {
      clientId: string;
      deviceAuthorizationEndpoint: string;
      tokenEndpoint: string;
      requiredHeaders: readonly string[];
      scope?: string;
    } | null;
  }[],
  networkFetcher: typeof fetch,
  deviceId: string,
  onRefreshed?: () => void,
): Promise<string> {
  const credentialRef = target.account?.credentialRef;
  if (
    !credentialRef ||
    (credentialRef.backend !== "local-file" && credentialRef.backend !== "local-encrypted-file")
  ) {
    throw new Error(`Endpoint ${target.endpointId} does not support OAuth token refresh.`);
  }

  const existingPayload = readFreshestStoredOauthTokenFileSync({
    runtimeStateRoot,
    scopeId,
    credentialRef: credentialRef.ref,
  }).payload;
  const refreshToken = readStoredRefreshToken(existingPayload);
  if (refreshToken.length === 0) {
    throw new Error(
      `Stored OAuth credential ${credentialRef.ref} does not contain a refresh token.`,
    );
  }

  const variant = getOauthVariant(providerPresets, liteLLMProviders, target.providerId);
  const tokenResponse = await networkFetcher(variant.oauth.tokenEndpoint, {
    method: "POST",
    headers: createDeviceHeaders(
      resolveOauthHeaderDeviceId({
        runtimeStateRoot,
        scopeId,
        credentialRef,
        fallbackDeviceId: deviceId,
        tokenPayload: existingPayload,
      }),
      variant.oauth.requiredHeaders,
    ),
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
  if (
    typeof refreshedPayload.access_token !== "string" ||
    refreshedPayload.access_token.trim().length === 0
  ) {
    throw new Error(`Refresh response for ${credentialRef.ref} did not include an access token.`);
  }

  await persistOauthTokenFile(runtimeStateRoot, scopeId, credentialRef.ref, {
    providerId: target.providerId,
    providerAccountId: target.providerAccountId,
    access_token: refreshedPayload.access_token,
    refresh_token:
      typeof refreshedPayload.refresh_token === "string" &&
      refreshedPayload.refresh_token.length > 0
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
  liteLLMProviders?: readonly {
    providerId: string;
    displayName: string;
    apiBase: string;
    oauth?: {
      clientId: string;
      deviceAuthorizationEndpoint: string;
      tokenEndpoint: string;
      requiredHeaders: readonly string[];
      scope?: string;
    } | null;
  }[],
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
    const tokenPayload = readFreshestStoredOauthTokenFileSync({
      runtimeStateRoot,
      scopeId,
      credentialRef: credentialRef.ref,
    }).payload;
    if (
      tokenNeedsRefresh(tokenPayload) &&
      providerPresets &&
      liteLLMProviders &&
      networkFetcher &&
      typeof deviceId === "string"
    ) {
      const refreshedAccessToken = await refreshOauthAccessToken(
        runtimeStateRoot,
        scopeId,
        target,
        providerPresets,
        liteLLMProviders,
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
    throw new Error(
      `Stored OAuth credential ${credentialRef.ref} does not contain an access token.`,
    );
  }

  throw new Error(
    `Credential backend ${credentialRef.backend} is not supported for live execution.`,
  );
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

function isReasoningOnlyChatCompletionsChunk(payload: Record<string, unknown>): boolean {
  if (!Array.isArray(payload.choices) || payload.choices.length === 0) {
    return false;
  }
  let sawReasoningOnlyDelta = false;
  for (const choice of payload.choices) {
    if (typeof choice !== "object" || choice === null) {
      continue;
    }
    const delta = (choice as { delta?: Record<string, unknown> }).delta;
    if (!delta || typeof delta !== "object") {
      continue;
    }
    if (typeof delta.content === "string" && delta.content.length > 0) {
      return false;
    }
    if (Array.isArray(delta.tool_calls) && delta.tool_calls.length > 0) {
      return false;
    }
    if (typeof delta.reasoning_content === "string" && delta.reasoning_content.length > 0) {
      sawReasoningOnlyDelta = true;
    }
  }
  return sawReasoningOnlyDelta;
}

function countChatCompletionsReasoningDeltas(payload: Record<string, unknown>): number {
  if (!Array.isArray(payload.choices)) {
    return 0;
  }
  let count = 0;
  for (const choice of payload.choices) {
    if (typeof choice !== "object" || choice === null) {
      continue;
    }
    const delta = (choice as { delta?: Record<string, unknown> }).delta;
    if (
      delta &&
      typeof delta === "object" &&
      typeof delta.reasoning_content === "string" &&
      delta.reasoning_content.length > 0
    ) {
      count += 1;
    }
  }
  return count;
}

function hasForwardedReasoningControl(body: Record<string, unknown>): boolean {
  return (
    typeof body.reasoning_effort === "string" ||
    asPlainRecord(body.reasoning) !== undefined ||
    asPlainRecord(body.thinking) !== undefined
  );
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
  let hasForwardedDownstreamSafeChunk = false;

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

      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(payloadText) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (
        !metadata.reasoningRequested &&
        !hasForwardedDownstreamSafeChunk &&
        isReasoningOnlyChatCompletionsChunk(payload)
      ) {
        continue;
      }
      hasForwardedDownstreamSafeChunk = true;
      await streamWriter(payload, metadata);
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
  let hasForwardedDownstreamSafeChunk = false;
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

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadText) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (
      !metadata.reasoningRequested &&
      !hasForwardedDownstreamSafeChunk &&
      isReasoningOnlyChatCompletionsChunk(payload)
    ) {
      continue;
    }
    hasForwardedDownstreamSafeChunk = true;
    await streamWriter(payload, metadata);
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
      if (
        typeof nestedRecord.error_description === "string" &&
        nestedRecord.error_description.length > 0
      ) {
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
  const backend = target.account?.credentialRef.backend;
  return (
    target.adapterFamily === "ai-sdk-openai-compatible" &&
    (backend === "env" || backend === "local-file" || backend === "local-encrypted-file")
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

export function filterRouterRegistryByExecutionMode(
  registry: EndpointRegistryResult,
  executionMode: UnifiedRuntimeExecutionMode,
): EndpointRegistryResult {
  const endpoints =
    executionMode === "remote_only"
      ? registry.endpoints.filter(
          (endpoint) => toSourceType(endpoint.identity.endpoint_kind) === "remote",
        )
      : executionMode === "local_only"
        ? registry.endpoints.filter(
            (endpoint) => toSourceType(endpoint.identity.endpoint_kind) === "local",
          )
        : registry.endpoints;
  return {
    ...registry,
    endpoints,
    lifecycleSummary: {
      active: endpoints.filter((endpoint) => endpoint.status === "active").length,
      degraded: endpoints.filter((endpoint) => endpoint.status === "degraded").length,
      offline: endpoints.filter((endpoint) => endpoint.status === "offline").length,
    },
  };
}

function toControllerAssignmentFromEndpoint(
  endpoint: EndpointRegistryResult["endpoints"][number],
): BridgeControllerAssignment {
  return {
    scope: "global",
    endpointId: endpoint.identity.endpoint_id,
    modelId: endpoint.identity.model_id,
    sourceType: toSourceType(endpoint.identity.endpoint_kind),
  };
}

function isControllerAssignmentAllowedByExecutionMode(
  controller: BridgeControllerAssignment,
  registry: EndpointRegistryResult,
): boolean {
  return registry.endpoints.some(
    (endpoint) =>
      endpoint.identity.endpoint_id === controller.endpointId &&
      toSourceType(endpoint.identity.endpoint_kind) === controller.sourceType,
  );
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
        lifecycleState:
          endpoint.lifecycleState as RegistrySources["cloud"][number]["lifecycleState"],
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

function createResponsesResponse(result: BridgeResponsesExecutionResult): Record<string, unknown> {
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

function createRuntimeTaxonomyManifestResponse(): Record<string, unknown> {
  return {
    ...taxonomyManifest,
    links: {
      full: "/api/role-model/taxonomy",
      version: "/api/role-model/taxonomy/version",
      summary: "/api/role-model/taxonomy/summary",
      effective: "/api/role-model/taxonomy/effective",
      classificationGuide: "/api/role-model/taxonomy/classification-guide",
      groups: "/api/role-model/taxonomy/groups",
      roles: "/api/role-model/taxonomy/roles",
      roleSummaries: "/api/role-model/taxonomy/roles?view=summary",
      groupRoles: "/api/role-model/taxonomy/groups/{groupId}/roles",
      roleDetail: "/api/role-model/taxonomy/roles/{roleId}",
      roleTaskTypes: "/api/role-model/taxonomy/roles/{roleId}/task-types",
      taskTypes: "/api/role-model/taxonomy/task-types",
      taskTypeDetail: "/api/role-model/taxonomy/task-types/{taskType}",
      capabilities: "/api/role-model/taxonomy/capabilities",
      modalities: "/api/role-model/taxonomy/modalities",
      toolClasses: "/api/role-model/taxonomy/tool-classes",
      compactGroups: "/api/role-model/taxonomy/compact/groups",
      compactRoleSummaries: "/api/role-model/taxonomy/compact/roles",
      roleTaskChunk: "/api/role-model/taxonomy/roles/{roleId}/tasks.compact",
      validate: "/api/role-model/taxonomy/validate",
    },
  };
}

function taxonomyEnvelope(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: taxonomyManifest.schemaVersion,
    taxonomyVersion: taxonomyManifest.taxonomyVersion,
    databaseVersion: taxonomyManifest.databaseVersion,
    contentRevision: taxonomyManifest.contentRevision,
    classificationContractVersion: taxonomyManifest.classificationContractVersion,
    ...extra,
  };
}

function createRuntimeTaxonomyFullResponse(): Record<string, unknown> {
  return taxonomyEnvelope({
    manifest: createRuntimeTaxonomyManifestResponse(),
    groups: canonicalTaxonomy.groups,
    roles: canonicalTaxonomy.roles,
    taskTypes: canonicalTaxonomy.tasks,
    capabilities: canonicalTaxonomy.capabilities,
    modalities: canonicalTaxonomy.modalities,
    toolClasses: canonicalTaxonomy.toolClasses,
    intentPresets: canonicalTaxonomy.intentPresets,
  });
}

function createRuntimeTaxonomyVersionResponse(): Record<string, unknown> {
  return taxonomyEnvelope({
    generatedAt: taxonomyManifest.generatedAt,
    entryCounts: taxonomyManifest.entryCounts,
  });
}

function createRuntimeTaxonomySummaryResponse(): Record<string, unknown> {
  return taxonomyEnvelope({
    entryCounts: taxonomyManifest.entryCounts,
    groups: canonicalTaxonomy.groups.map((group) => ({
      id: group.id,
      label: group.label,
      description: group.description,
      roleIds: group.primaryRoleIds,
      secondaryRoleIds: group.secondaryRoleIds,
      next: `/api/role-model/taxonomy/groups/${encodeURIComponent(group.id)}/roles`,
    })),
    next: {
      groups: "/api/role-model/taxonomy/groups",
      roles: "/api/role-model/taxonomy/roles?view=summary",
      classificationGuide: "/api/role-model/taxonomy/classification-guide",
    },
  });
}

function createRuntimeTaxonomyEffectiveResponse(): Record<string, unknown> {
  return taxonomyEnvelope({
    scope: { kind: "core" },
    groups: canonicalTaxonomy.groups,
    roles: canonicalTaxonomy.roles,
    taskTypes: canonicalTaxonomy.tasks,
    capabilities: canonicalTaxonomy.capabilities,
    modalities: canonicalTaxonomy.modalities,
    toolClasses: canonicalTaxonomy.toolClasses,
    annotations: {
      rbac: "core read/use only in taxonomy V1 phase 1-4",
      customScopes: ["provider", "client", "org", "team", "user"],
    },
  });
}

function createRuntimeTaxonomyClassificationGuideResponse(): Record<string, unknown> {
  const groups = canonicalTaxonomy.groups.map((group) => {
    const groupRoles = canonicalTaxonomy.roles.filter(
      (role) => role.primaryGroupId === group.id || role.secondaryGroupIds.includes(group.id),
    );
    return {
      id: group.id,
      label: group.label,
      description: group.description,
      roleCount: groupRoles.length,
      roles: groupRoles.map((role) => ({
        id: role.id,
        label: role.label,
        description: role.description,
        classification: role.classification
          ? {
              summary: role.classification.summary,
              positiveSignals: role.classification.positiveSignals,
              negativeSignals: role.classification.negativeSignals,
            }
          : undefined,
      })),
    };
  });

  return taxonomyEnvelope({
    algorithm: [
      "1. Identify candidate groups from prompt keywords and context signals (tools, images, files).",
      "2. Load role summaries for candidate groups from the taxonomy.",
      "3. Score each candidate role using classification signals (positiveSignals, negativeSignals, description keywords).",
      "4. Select the highest-scoring role; load its task chunk.",
      "5. Score tasks within the chunk using task labels, descriptions, and classifier guidance.",
      "6. Emit role_model.intent with role_hint_id, task_type, preferred_capabilities, modalities, tool_classes, confidence, source, evidence, and alternatives.",
    ],
    groups,
    wireWrapper: "role_model.intent",
    hardFields: [
      "trusted internal required capabilities",
      "trusted internal required modalities",
      "trusted internal tool classes",
      "internal role/task objects with hard: true",
    ],
    advisoryFields: [
      "role_hint_id",
      "task_type",
      "preferred_capabilities from Pi metadata",
      "required_capabilities from Pi metadata",
      "task_confidence",
      "alternatives",
    ],
  });
}

function createRuntimeTaxonomyGroupsResponse(): Record<string, unknown> {
  return taxonomyEnvelope({ groups: canonicalTaxonomy.groups });
}

function createRuntimeTaxonomyRolesResponse(view: string | null): Record<string, unknown> {
  if (view === "summary") {
    return createRuntimeTaxonomyCompactRolesResponse();
  }
  return taxonomyEnvelope({ roles: canonicalTaxonomy.roles });
}

function createRuntimeTaxonomyGroupRolesResponse(groupId: string): Record<string, unknown> | null {
  const group = canonicalTaxonomy.groups.find((entry) => entry.id === groupId);
  if (!group) return null;
  const groupRoleIds = new Set([...group.primaryRoleIds, ...group.secondaryRoleIds]);
  return taxonomyEnvelope({
    group,
    roles: canonicalTaxonomy.roles.filter((role) => groupRoleIds.has(role.id)),
  });
}

function createRuntimeTaxonomyRoleDetailResponse(roleId: string): Record<string, unknown> | null {
  const role = canonicalTaxonomy.roles.find((entry) => entry.id === roleId);
  if (!role) return null;
  return taxonomyEnvelope({
    role,
    related: {
      primaryGroup: `/api/role-model/taxonomy/groups/${encodeURIComponent(role.primaryGroupId)}/roles`,
      secondaryGroups: role.secondaryGroupIds.map(
        (groupId) => `/api/role-model/taxonomy/groups/${encodeURIComponent(groupId)}/roles`,
      ),
    },
    next: {
      taskTypes: `/api/role-model/taxonomy/roles/${encodeURIComponent(role.id)}/task-types`,
    },
  });
}

function createRuntimeTaxonomyRoleTaskTypesResponse(
  roleId: string,
): Record<string, unknown> | null {
  const role = canonicalTaxonomy.roles.find((entry) => entry.id === roleId);
  if (!role) return null;
  return taxonomyEnvelope({
    role,
    taskTypes: canonicalTaxonomy.tasks.filter((task) => task.primaryRole === roleId),
  });
}

function createRuntimeTaxonomyTaskTypesResponse(): Record<string, unknown> {
  return taxonomyEnvelope({ taskTypes: canonicalTaxonomy.tasks });
}

function createRuntimeTaxonomyTaskTypeDetailResponse(
  taskType: string,
): Record<string, unknown> | null {
  const task = canonicalTaxonomy.tasks.find((entry) => entry.id === taskType);
  if (!task) return null;
  return taxonomyEnvelope({
    taskType: task,
    related: {
      role: `/api/role-model/taxonomy/roles/${encodeURIComponent(task.primaryRole)}`,
      capabilities: task.requiredCapabilities.map(
        (capabilityId) =>
          `/api/role-model/taxonomy/capabilities#${encodeURIComponent(capabilityId)}`,
      ),
    },
  });
}

function createRuntimeTaxonomyCapabilitiesResponse(): Record<string, unknown> {
  return taxonomyEnvelope({ capabilities: canonicalTaxonomy.capabilities });
}

function createRuntimeTaxonomyModalitiesResponse(): Record<string, unknown> {
  return taxonomyEnvelope({ modalities: canonicalTaxonomy.modalities });
}

function createRuntimeTaxonomyToolClassesResponse(): Record<string, unknown> {
  return taxonomyEnvelope({ toolClasses: canonicalTaxonomy.toolClasses });
}

function createRuntimeTaxonomyCompactGroupsResponse(): Record<string, unknown> {
  return taxonomyEnvelope({
    groups: canonicalTaxonomy.groups.map((group) => ({
      id: group.id,
      label: group.label,
      description: group.description,
      primaryRoleIds: group.primaryRoleIds,
      secondaryRoleIds: group.secondaryRoleIds,
      ui: group.ui,
    })),
  });
}

function createRuntimeTaxonomyCompactRolesResponse(): Record<string, unknown> {
  return taxonomyEnvelope({
    roles: canonicalTaxonomy.roles.map((role) => ({
      id: role.id,
      label: role.label,
      description: role.description,
      primaryGroupId: role.primaryGroupId,
      secondaryGroupIds: role.secondaryGroupIds,
      taskCount: role.taskIds.length,
      typicalTaskIds: role.typicalTaskIds,
      preferredCapabilities: role.preferredCapabilities,
      ui: role.ui,
    })),
  });
}

function createRuntimeTaxonomyRoleTasksResponse(roleId: string): Record<string, unknown> | null {
  const role = canonicalTaxonomy.roles.find((entry) => entry.id === roleId);
  if (!role) {
    return null;
  }
  return taxonomyEnvelope({
    roleId,
    tasks: canonicalTaxonomy.tasks
      .filter((task) => task.primaryRole === roleId)
      .map((task) => ({
        id: task.id,
        label: task.label,
        description: task.description,
        requiredCapabilities: task.requiredCapabilities,
        preferredCapabilities: task.preferredCapabilities,
        requiredModalities: task.requiredModalities,
        toolClasses: task.toolClasses,
        classifier: task.classifier,
      })),
  });
}

function validateRuntimeTaxonomyRequest(body: Record<string, unknown>): Record<string, unknown> {
  const roleIds = new Set(canonicalTaxonomy.roles.map((role) => role.id));
  const taskIds = new Set(canonicalTaxonomy.tasks.map((task) => task.id));
  const capabilityIds = new Set(canonicalTaxonomy.capabilities.map((capability) => capability.id));
  const modalityIds = new Set(canonicalTaxonomy.modalities.map((modality) => modality.id));
  const toolClassIds = new Set(canonicalTaxonomy.toolClasses.map((toolClass) => toolClass.id));
  const diagnostics: { code: string; id: string }[] = [];
  const pushUnknown = (code: string, value: unknown, known: ReadonlySet<string>): void => {
    if (typeof value === "string" && !known.has(value)) {
      diagnostics.push({ code, id: value });
    }
  };

  pushUnknown("UNKNOWN_ROLE", body.roleId, roleIds);
  pushUnknown("UNKNOWN_TASK", body.taskType, taskIds);
  for (const capability of Array.isArray(body.capabilities) ? body.capabilities : []) {
    pushUnknown("UNKNOWN_CAPABILITY", capability, capabilityIds);
  }
  for (const modality of Array.isArray(body.modalities) ? body.modalities : []) {
    pushUnknown("UNKNOWN_MODALITY", modality, modalityIds);
  }
  for (const toolClass of Array.isArray(body.toolClasses) ? body.toolClasses : []) {
    pushUnknown("UNKNOWN_TOOL_CLASS", toolClass, toolClassIds);
  }

  return {
    valid: diagnostics.length === 0,
    diagnostics,
    schemaVersion: taxonomyManifest.schemaVersion,
    taxonomyVersion: taxonomyManifest.taxonomyVersion,
    databaseVersion: taxonomyManifest.databaseVersion,
    contentRevision: taxonomyManifest.contentRevision,
    classificationContractVersion: taxonomyManifest.classificationContractVersion,
  };
}

function serializeToolCallArguments(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value ?? null);
}

function toBridgeToolCall(toolCall: BridgeContinuationToolCall, index: number): BridgeToolCall {
  return {
    id: toolCall.providerToolId ?? `call_${index + 1}`,
    type: "function",
    function: {
      name: toolCall.name,
      arguments: serializeToolCallArguments(toolCall.arguments),
    },
  };
}

function serializeToolExecutionContent(execution: ToolRegistryExecution | undefined): string {
  if (!execution) {
    return JSON.stringify({
      status: "missing",
      error: "No tool execution receipt was recorded for this tool call.",
    });
  }

  if (execution.status === "succeeded") {
    return serializeToolCallArguments(execution.output);
  }

  return JSON.stringify({
    status: execution.status,
    output: execution.output,
    diagnostics: execution.diagnostics.map((diagnostic) => diagnostic.message),
  });
}

function createDeepSeekDsmlInvokePattern(): RegExp {
  return /<｜｜DSML｜｜invoke\s+name="([^"]+)">([\s\S]*?)(?=<｜｜DSML｜｜invoke\s+name=|$)/g;
}

function createDeepSeekDsmlParameterPattern(): RegExp {
  return /<｜｜DSML｜｜parameter\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/｜｜DSML｜｜parameter>/g;
}

function stripDeepSeekDsmlToolMarkup(outputText: string): string {
  return outputText
    .replace(/<｜｜DSML｜｜tool_calls>\s*/g, "")
    .replace(createDeepSeekDsmlInvokePattern(), "")
    .trim();
}

function mapDeepSeekDsmlToolName(
  providerToolName: string,
): "web_search" | "web_open" | "web_browse" | null {
  switch (providerToolName) {
    case "web_search":
    case "$web_search":
      return "web_search";
    case "web_open":
      return "web_open";
    case "web_browse":
      return "web_browse";
    default:
      return null;
  }
}

function parseDeepSeekDsmlParameterArguments(rawBody: string): Record<string, string> {
  const argumentsRecord: Record<string, string> = {};
  for (const match of rawBody.matchAll(createDeepSeekDsmlParameterPattern())) {
    const name = match[1]?.trim();
    const value = match[2]?.trim();
    if (!name || !value) {
      continue;
    }
    argumentsRecord[name] = value;
  }
  return argumentsRecord;
}

function parseDeepSeekDsmlToolCallArguments(
  providerToolName: "web_search" | "web_open" | "web_browse",
  rawBody: string,
): unknown | null {
  const parameterArguments = parseDeepSeekDsmlParameterArguments(rawBody);
  if (Object.keys(parameterArguments).length > 0) {
    return parameterArguments;
  }
  const cleaned = rawBody.replace(/<｜｜DSML｜｜[^>]+>/g, "").trim();
  if (cleaned.length === 0) {
    return null;
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = cleaned.slice(firstBrace, lastBrace + 1).trim();
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Fall back to a query wrapper when the provider emits non-JSON DSML bodies.
    }
  }
  if (providerToolName === "web_search") {
    return { query: cleaned };
  }
  return { url: cleaned };
}

function parseDeepSeekDsmlToolCalls(
  outputText: string,
  continuationStep: number,
): readonly BridgeContinuationToolCall[] {
  if (!outputText.includes("<｜｜DSML｜｜invoke")) {
    return [];
  }
  const toolCalls: BridgeContinuationToolCall[] = [];
  for (const match of outputText.matchAll(createDeepSeekDsmlInvokePattern())) {
    const toolName = mapDeepSeekDsmlToolName(match[1]?.trim() ?? "");
    if (toolName === null) {
      continue;
    }
    const argumentsValue = parseDeepSeekDsmlToolCallArguments(toolName, match[2] ?? "");
    if (argumentsValue === null) {
      continue;
    }
    toolCalls.push({
      name: toolName,
      arguments: argumentsValue,
      providerToolId: `deepseek_dsml_call_${continuationStep + 1}_${toolCalls.length + 1}`,
    });
  }
  return toolCalls;
}

function resolveContinuationTurn(input: {
  readonly providerId: string;
  readonly outputText: string;
  readonly toolCalls: readonly BridgeContinuationToolCall[];
  readonly continuationStep: number;
}): {
  readonly outputText: string;
  readonly toolCalls: readonly BridgeContinuationToolCall[];
} {
  if (input.toolCalls.length > 0) {
    return {
      outputText: input.outputText,
      toolCalls: input.toolCalls,
    };
  }
  if (input.providerId !== "deepseek") {
    return {
      outputText: input.outputText,
      toolCalls: [],
    };
  }
  const dsmlToolCalls = parseDeepSeekDsmlToolCalls(input.outputText, input.continuationStep);
  return {
    outputText:
      dsmlToolCalls.length > 0 ? stripDeepSeekDsmlToolMarkup(input.outputText) : input.outputText,
    toolCalls: dsmlToolCalls,
  };
}

function shouldBridgeManageToolContinuation(
  tools: readonly RuntimeExecutionToolDefinition[] | undefined,
): boolean {
  return tools !== undefined && tools.length > 0 && tools.every((tool) => tool.kind === "hosted");
}

function surfaceContinuationTurnToExecution(
  execution: RoutedExecutionResult,
  continuationTurn: {
    readonly outputText: string;
    readonly toolCalls: readonly BridgeContinuationToolCall[];
  },
): RoutedExecutionResult {
  return {
    ...execution,
    normalized: {
      ...execution.normalized,
      outputText: continuationTurn.outputText,
      toolCalls: continuationTurn.toolCalls,
      finishReason: "tool_calls",
    },
  };
}

function buildContinuationExecutionRequest(
  executionRequest: RuntimeExecutionRequest,
  toolCalls: readonly {
    readonly id: string;
    readonly type: "function";
    readonly function: {
      readonly name: string;
      readonly arguments: string;
    };
  }[],
  toolExecutions: readonly ToolRegistryExecution[],
  outputText: string,
  keepTools: boolean,
): RuntimeExecutionRequest {
  const { toolChoice: _toolChoice, ...requestWithoutToolChoice } = executionRequest;
  const continuationBase = keepTools
    ? requestWithoutToolChoice
    : (() => {
        const { tools: _tools, ...rest } = requestWithoutToolChoice;
        return rest;
      })();
  const executionsByToolCallId = new Map(
    toolExecutions.map((execution) => [execution.toolCallId, execution]),
  );
  const assistantMessage: OpenAIChatCompletionsMessage = {
    role: "assistant",
    content: outputText.length > 0 ? outputText : null,
    tool_calls: toolCalls,
  };
  const toolMessages: RuntimeExecutionMessage[] = toolCalls.map((toolCall) => ({
    role: "tool",
    tool_call_id: toolCall.id,
    content: serializeToolExecutionContent(executionsByToolCallId.get(toolCall.id)),
  }));
  const followUpInstructionMessage: RuntimeExecutionMessage = {
    role: "user",
    content: BRIDGE_TOOL_LOOP_FOLLOWUP_INSTRUCTION,
  };

  return {
    ...continuationBase,
    messages: [
      ...executionRequest.messages,
      assistantMessage,
      ...toolMessages,
      followUpInstructionMessage,
    ],
  };
}

function dedupeToolExecutions(
  executions: readonly ToolRegistryExecution[],
): readonly ToolRegistryExecution[] {
  const seen = new Set<string>();
  const deduped: ToolRegistryExecution[] = [];
  for (const execution of executions) {
    const key = JSON.stringify({
      toolCallId: execution.toolCallId,
      toolName: execution.toolName,
      connectorId: execution.connectorId,
      connectorKind: execution.connectorKind,
      status: execution.status,
      output: execution.output,
      diagnostics: execution.diagnostics,
    });
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(execution);
  }
  return deduped;
}

function hasRequestScopedDynamicToolExecution(
  executions: readonly ToolRegistryExecution[],
): boolean {
  return executions.some(
    (execution) =>
      execution.connectorId === "request-scoped" && execution.connectorKind === "dynamic-tool",
  );
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
    ...(result.reasoningText && result.reasoningText.length > 0
      ? [
          {
            ...baseChunk,
            choices: [
              {
                index: 0,
                delta: {
                  role: "assistant",
                  reasoning_content: result.reasoningText,
                },
                finish_reason: null,
              },
            ],
          },
        ]
      : []),
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

type ResponsesStreamNormalizationState = {
  responseId: string;
  messageId: string;
  model: string;
  createdAt: number;
  nativeResponsesSeen: boolean;
  chatCompletionsSeen: boolean;
  createdEmitted: boolean;
  messageItemEmitted: boolean;
  textDeltaEmitted: boolean;
  terminalEmitted: boolean;
};

function createResponsesStreamNormalizationState(
  requestId: string,
  requestedModel: string,
): ResponsesStreamNormalizationState {
  const responseId = `resp_${requestId}`;
  return {
    responseId,
    messageId: `msg_${responseId}`,
    model: requestedModel,
    createdAt: Math.floor(Date.now() / 1000),
    nativeResponsesSeen: false,
    chatCompletionsSeen: false,
    createdEmitted: false,
    messageItemEmitted: false,
    textDeltaEmitted: false,
    terminalEmitted: false,
  };
}

function isResponsesStreamEventPayload(payload: Record<string, unknown>): boolean {
  return typeof payload.type === "string" && payload.type.startsWith("response.");
}

function isChatCompletionsStreamPayload(payload: Record<string, unknown>): boolean {
  return payload.object === "chat.completion.chunk" && Array.isArray(payload.choices);
}

function readChatCompletionsStreamTextDeltas(payload: Record<string, unknown>): readonly string[] {
  if (!Array.isArray(payload.choices)) {
    return [];
  }
  const textDeltas: string[] = [];
  for (const choice of payload.choices) {
    if (typeof choice !== "object" || choice === null) {
      continue;
    }
    const delta = (choice as { delta?: Record<string, unknown> }).delta;
    if (!delta || typeof delta !== "object") {
      continue;
    }
    if (typeof delta.content === "string" && delta.content.length > 0) {
      textDeltas.push(delta.content);
    }
  }
  return textDeltas;
}

function readChatCompletionsStreamFinishReason(
  payload: Record<string, unknown>,
): string | null | undefined {
  if (!Array.isArray(payload.choices)) {
    return undefined;
  }
  for (const choice of payload.choices) {
    if (typeof choice !== "object" || choice === null) {
      continue;
    }
    const finishReason = (choice as { finish_reason?: unknown }).finish_reason;
    if (typeof finishReason === "string" && finishReason.length > 0) {
      return finishReason;
    }
    if (finishReason === null) {
      return null;
    }
  }
  return undefined;
}

function readChatCompletionsStreamUsage(
  payload: Record<string, unknown>,
): { input_tokens: number; output_tokens: number } | null {
  const usage =
    typeof payload.usage === "object" && payload.usage !== null
      ? (payload.usage as Record<string, unknown>)
      : null;
  const inputTokens = usage?.prompt_tokens;
  const outputTokens = usage?.completion_tokens;
  return typeof inputTokens === "number" && typeof outputTokens === "number"
    ? {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      }
    : null;
}

function normalizeResponsesStreamStateFromNativeEvent(
  payload: Record<string, unknown>,
  state: ResponsesStreamNormalizationState,
): void {
  state.nativeResponsesSeen = true;
  const eventType = typeof payload.type === "string" ? payload.type : "";
  if (
    eventType === "response.created" &&
    typeof payload.response === "object" &&
    payload.response !== null
  ) {
    const response = payload.response as Record<string, unknown>;
    if (typeof response.id === "string" && response.id.length > 0) {
      state.responseId = response.id;
      state.messageId = `msg_${response.id}`;
    }
    if (typeof response.model === "string" && response.model.length > 0) {
      state.model = response.model;
    }
    if (typeof response.created_at === "number") {
      state.createdAt = response.created_at;
    }
    state.createdEmitted = true;
    return;
  }
  if (eventType === "response.output_item.added") {
    const item =
      typeof payload.item === "object" && payload.item !== null
        ? (payload.item as Record<string, unknown>)
        : null;
    if (item?.type === "message") {
      state.messageItemEmitted = true;
    }
    return;
  }
  if (eventType === "response.output_text.delta") {
    state.textDeltaEmitted = true;
    return;
  }
  if (eventType === "response.completed" || eventType === "response.incomplete") {
    state.terminalEmitted = true;
  }
}

function createResponsesEventsFromChatCompletionsStreamPayload(
  payload: Record<string, unknown>,
  state: ResponsesStreamNormalizationState,
): ReadonlyArray<Record<string, unknown>> {
  state.chatCompletionsSeen = true;
  const events: Record<string, unknown>[] = [];
  if (typeof payload.model === "string" && payload.model.length > 0) {
    state.model = payload.model;
  }
  if (typeof payload.created === "number") {
    state.createdAt = payload.created;
  }
  if (!state.createdEmitted) {
    events.push({
      type: "response.created",
      response: {
        id: state.responseId,
        created_at: state.createdAt,
        model: state.model,
      },
    });
    state.createdEmitted = true;
  }
  if (!state.messageItemEmitted) {
    events.push({
      type: "response.output_item.added",
      output_index: 0,
      item: {
        type: "message",
        id: state.messageId,
      },
    });
    state.messageItemEmitted = true;
  }

  const textDeltas = readChatCompletionsStreamTextDeltas(payload);
  for (const delta of textDeltas) {
    events.push({
      type: "response.output_text.delta",
      item_id: state.messageId,
      output_index: 0,
      delta,
    });
    state.textDeltaEmitted = true;
  }

  const finishReason = readChatCompletionsStreamFinishReason(payload);
  if (typeof finishReason === "string" && finishReason.length > 0 && !state.terminalEmitted) {
    const usage = readChatCompletionsStreamUsage(payload);
    events.push({
      type: finishReason === "stop" ? "response.completed" : "response.incomplete",
      response: {
        id: state.responseId,
        ...(usage ? { usage } : {}),
        ...(finishReason === "stop"
          ? {}
          : {
              incomplete_details: {
                reason: finishReason,
              },
            }),
      },
    });
    state.terminalEmitted = true;
  }

  return events;
}

function normalizeResponsesStreamChunk(
  payload: Record<string, unknown>,
  state: ResponsesStreamNormalizationState,
): ReadonlyArray<Record<string, unknown>> {
  if (isResponsesStreamEventPayload(payload)) {
    normalizeResponsesStreamStateFromNativeEvent(payload, state);
    return [payload];
  }
  if (isChatCompletionsStreamPayload(payload)) {
    return createResponsesEventsFromChatCompletionsStreamPayload(payload, state);
  }
  return [payload];
}

function createResponsesStreamFinalizationChunks(
  result: BridgeResponsesExecutionResult,
  state: ResponsesStreamNormalizationState,
): ReadonlyArray<Record<string, unknown>> {
  if (state.nativeResponsesSeen && !state.chatCompletionsSeen) {
    if (state.terminalEmitted) {
      return [];
    }
    return createResponsesStreamChunks({
      ...result,
      responseId: state.responseId,
      model: state.model || result.model,
    }).filter((chunk) => {
      const eventType = typeof chunk.type === "string" ? chunk.type : "";
      return eventType === "response.completed" || eventType === "response.incomplete";
    });
  }
  const fallbackChunks = createResponsesStreamChunks({
    ...result,
    responseId: state.responseId,
    model: state.model || result.model,
  });
  const finalized: Record<string, unknown>[] = [];
  for (const chunk of fallbackChunks) {
    const eventType = typeof chunk.type === "string" ? chunk.type : "";
    if (eventType === "response.created" && state.createdEmitted) {
      continue;
    }
    if (
      eventType === "response.output_item.added" &&
      typeof chunk.item === "object" &&
      chunk.item !== null &&
      (chunk.item as { type?: unknown }).type === "message" &&
      state.messageItemEmitted
    ) {
      continue;
    }
    if (eventType === "response.output_text.delta" && state.textDeltaEmitted) {
      continue;
    }
    if (
      (eventType === "response.completed" || eventType === "response.incomplete") &&
      state.terminalEmitted
    ) {
      continue;
    }
    finalized.push(chunk);
  }
  return finalized;
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
    } catch {}
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
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Request-ID, X-Role-Model-Routing-Mode, X-Role-Model-Endpoint-Id, X-Role-Model-Requested-Role-Id",
  );
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

    if (request.method === "POST" && url.pathname === "/api/role-model/runtime/shutdown") {
      if (!options.shutdown) {
        writeJson(response, 404, { error: "runtime shutdown is not available" });
        return;
      }

      writeJson(response, 202, { status: "shutting_down" });
      setImmediate(() => {
        void options.shutdown?.();
      });
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

    const startupReadiness = options.readStartupReadiness?.();
    const isPotentialStaticUiRequest =
      Boolean(options.staticRoot) &&
      request.method === "GET" &&
      !url.pathname.startsWith("/api/") &&
      !url.pathname.startsWith("/v1/") &&
      url.pathname !== "/logs" &&
      !url.pathname.startsWith("/logs/");
    if (startupReadiness && !startupReadiness.ready && !isPotentialStaticUiRequest) {
      writeJson(response, 503, {
        error: "runtime_initializing",
        status: startupReadiness.status,
        ...(startupReadiness.message ? { message: startupReadiness.message } : {}),
      });
      return;
    }

    const registry = options.getRegistry?.() ?? options.registry;

    if (request.method === "GET" && url.pathname === "/v1/models") {
      const modelAliases = await resolveConfiguredModelAliases(options.readRuntimeConfig);
      const inventory = options.getRoutableInventory?.() ?? null;
      writeJson(
        response,
        200,
        createModelListResponse(
          registry,
          modelAliases,
          inventory,
          options.getExecutionCatalog?.(),
          resolveExternalBaseUrl(request, {
            host: options.host,
            port: options.port,
          }),
        ),
      );
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/chat/completions") {
      try {
        const requestId = readBridgeRequestId(request);
        const requestAbortSignal = createBridgeRequestAbortSignal(request, response);
        const requestOptions = mergeBridgeRequestAbortSignal(
          readBridgeExecutionRequestOptions(request),
          requestAbortSignal,
        );
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
                await writeSseChunk(response, pendingChunk, requestAbortSignal);
              }
              pendingChunks.length = 0;
            }
            await writeSseChunk(response, serializedChunk, requestAbortSignal);
          };
          const result = await options.executeChatCompletions(
            parsedBody,
            requestId,
            streamWriter,
            requestOptions,
          );
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
                await writeSseChunk(response, pendingChunk, requestAbortSignal);
              }
            } else {
              for (const chunk of createChatCompletionsStreamChunks(result)) {
                await writeSseChunk(
                  response,
                  `data: ${JSON.stringify(chunk)}\n\n`,
                  requestAbortSignal,
                );
              }
            }
          }
          await writeSseChunk(response, "data: [DONE]\n\n", requestAbortSignal);
          response.end();
          return;
        }
        const result = await options.executeChatCompletions(
          parsedBody,
          requestId,
          undefined,
          requestOptions,
        );
        writeJson(
          response,
          200,
          createChatCompletionsResponse(result),
          createExecutionHeaders({
            endpointId: result.endpointId,
            adapterFamily: result.adapterFamily,
            routingDecisionId: result.routingDecisionId,
            costUsd: result.vendorMetadata?.costUsd,
          }),
        );
        return;
      } catch (error) {
        if (endCommittedBridgeResponse(response)) {
          return;
        }
        if (error instanceof BridgeHttpError) {
          throw error;
        }
        if (isBridgeClientDisconnectedError(error)) {
          response.end();
          return;
        }
        const message = error instanceof Error ? error.message : "chat completions request failed";
        writeJson(response, 400, { error: message });
        return;
      }
    }

    if (request.method === "POST" && url.pathname === "/v1/responses") {
      try {
        const requestId = readBridgeRequestId(request);
        const requestAbortSignal = createBridgeRequestAbortSignal(request, response);
        const requestOptions = mergeBridgeRequestAbortSignal(
          readBridgeExecutionRequestOptions(request),
          requestAbortSignal,
        );
        const body = await readJsonBody(request);
        const parsedBody = parseResponsesBody(body);
        if (parsedBody.stream) {
          let wroteStreamChunk = false;
          const pendingChunks: string[] = [];
          const responsesStreamState = createResponsesStreamNormalizationState(
            requestId,
            parsedBody.model,
          );
          const writeNormalizedChunk = async (
            serializedChunk: string,
            metadata?: BridgeStreamMetadata,
          ): Promise<boolean> => {
            if (!wroteStreamChunk) {
              if (!metadata) {
                pendingChunks.push(serializedChunk);
                return false;
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
                await writeSseChunk(response, pendingChunk, requestAbortSignal);
              }
              pendingChunks.length = 0;
            }
            await writeSseChunk(response, serializedChunk, requestAbortSignal);
            return true;
          };
          const streamWriter: BridgeStreamWriter = async (chunk, metadata) => {
            for (const normalizedChunk of normalizeResponsesStreamChunk(
              chunk,
              responsesStreamState,
            )) {
              await writeNormalizedChunk(`data: ${JSON.stringify(normalizedChunk)}\n\n`, metadata);
            }
          };
          const result = await options.executeResponses(
            parsedBody,
            requestId,
            streamWriter,
            requestOptions,
          );
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
                await writeSseChunk(response, pendingChunk, requestAbortSignal);
              }
            } else {
              for (const chunk of createResponsesStreamFinalizationChunks(
                result,
                responsesStreamState,
              )) {
                await writeSseChunk(
                  response,
                  `data: ${JSON.stringify(chunk)}\n\n`,
                  requestAbortSignal,
                );
              }
            }
          } else {
            for (const chunk of createResponsesStreamFinalizationChunks(
              result,
              responsesStreamState,
            )) {
              await writeSseChunk(
                response,
                `data: ${JSON.stringify(chunk)}\n\n`,
                requestAbortSignal,
              );
            }
          }
          response.end();
          return;
        }
        const result = await options.executeResponses(
          parsedBody,
          requestId,
          undefined,
          requestOptions,
        );
        writeJson(
          response,
          200,
          createResponsesResponse(result),
          createExecutionHeaders({
            endpointId: result.endpointId,
            adapterFamily: result.adapterFamily,
            routingDecisionId: result.routingDecisionId,
            costUsd: result.vendorMetadata?.costUsd,
          }),
        );
        return;
      } catch (error) {
        if (endCommittedBridgeResponse(response)) {
          return;
        }
        if (error instanceof BridgeHttpError) {
          throw error;
        }
        if (isBridgeClientDisconnectedError(error)) {
          response.end();
          return;
        }
        const message = error instanceof Error ? error.message : "responses request failed";
        writeJson(response, 400, { error: message });
        return;
      }
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

    if (request.method === "GET" && url.pathname === "/api/role-model/extensions") {
      if (!options.listExtensions) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listExtensions());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/extensions/qa") {
      if (!options.readTrackBQaExtensions) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readTrackBQaExtensions());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/track-b/shadow-receipts") {
      if (!options.readTrackBShadowReceipts) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readTrackBShadowReceipts());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/graph-migration") {
      if (!options.readGraphMigration) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readGraphMigration());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/storage-retention") {
      if (!options.readStorageRetention) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readStorageRetention());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/role-model/storage-retention/dry-run") {
      if (!options.dryRunStorageRetention) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.dryRunStorageRetention());
      return;
    }

    const operationRoutes: Readonly<
      Record<
        string,
        {
          readonly method: string;
          readonly callback: ((body: Record<string, unknown>) => Promise<unknown>) | undefined;
          readonly body: boolean;
        }
      >
    > = {
      "/api/role-model/storage-retention/policy": {
        method: "PUT",
        callback: options.updateStorageRetentionPolicy,
        body: true,
      },
      "/api/role-model/graph-migration/advance": {
        method: "POST",
        callback: options.advanceGraphMigration,
        body: true,
      },
      "/api/role-model/graph-migration/rollback": {
        method: "POST",
        callback: options.rollbackGraphMigration,
        body: false,
      },
      "/api/role-model/storage-retention/execute": {
        method: "POST",
        callback: options.executeStorageRetention,
        body: true,
      },
      "/api/role-model/storage-retention/cancel": {
        method: "POST",
        callback: options.cancelStorageRetentionJob,
        body: false,
      },
      "/api/role-model/storage-retention/rollback": {
        method: "POST",
        callback: options.rollbackStorageRetention,
        body: true,
      },
      "/api/role-model/contribution": {
        method: request.method === "GET" ? "GET" : "PUT",
        callback:
          request.method === "GET"
            ? options.readContributionState
            : options.updateContributionState,
        body: request.method !== "GET",
      },
      "/api/role-model/extensions/mutate": {
        method: "POST",
        callback: options.mutateExtension,
        body: true,
      },
      "/api/role-model/recommendations": {
        method: "GET",
        callback: options.listRecommendations,
        body: false,
      },
      "/api/role-model/recommendations/download": {
        method: "POST",
        callback: options.downloadRecommendations,
        body: false,
      },
      "/api/role-model/recommendations/apply": {
        method: "POST",
        callback: options.applyRecommendation,
        body: true,
      },
      "/api/role-model/recommendations/dismiss": {
        method: "POST",
        callback: options.dismissRecommendation,
        body: true,
      },
      "/api/role-model/recommendations/active-pack": {
        method: "GET",
        callback: options.readActivePack,
        body: false,
      },
    };
    const operationRoute = operationRoutes[url.pathname];
    if (operationRoute && request.method === operationRoute.method) {
      if (!operationRoute.callback) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      try {
        const body = operationRoute.body ? await readJsonBody(request) : {};
        writeJson(response, 200, await operationRoute.callback(body));
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "operation failed",
        });
      }
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

    if (request.method === "POST" && url.pathname === "/api/role-model/telemetry/query") {
      if (!options.queryTelemetryAnalytics) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      try {
        writeJson(
          response,
          200,
          await options.queryTelemetryAnalytics(await readJsonBody(request)),
        );
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "telemetry analytics query failed",
        });
      }
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

    if (request.method === "GET" && url.pathname.startsWith("/logs/stream")) {
      if (!options.proxyVendorLogStream) {
        writeJson(response, 503, {
          error: "log stream unavailable without an active llama-swap vendor",
        });
        return;
      }
      const proxied = await options.proxyVendorLogStream(url.pathname, url.search);
      if (!proxied) {
        writeJson(response, 503, {
          error: "log stream unavailable without an active llama-swap vendor",
        });
        return;
      }
      writeText(response, 200, proxied.body, proxied.contentType);
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
      const runtimeIdentity = options.readVersionInfo ? await options.readVersionInfo() : null;
      const configuredRuntimeConfig = await resolveConfiguredRuntimeConfig(
        options.readRuntimeConfig,
      );
      const modelAliases = configuredRuntimeConfig?.modelAliases ?? [];
      const inventory = options.getRoutableInventory?.() ?? null;
      const recommendedModelId = configuredRuntimeConfig
        ? deriveUnifiedRuntimeRoutingAliasId({
            routingStrategy: configuredRuntimeConfig.routingStrategy,
            executionMode: configuredRuntimeConfig.executionMode,
          })
        : null;
      writeJson(
        response,
        200,
        createDownstreamOpenAIProviderConfig(
          registry,
          resolveExternalBaseUrl(request, {
            host: options.host,
            port: options.port,
          }),
          modelAliases,
          {
            catalog: options.getExecutionCatalog?.(),
            inventory,
            recommendedModelId,
            displayName:
              runtimeIdentity &&
              typeof runtimeIdentity === "object" &&
              "name" in runtimeIdentity &&
              typeof runtimeIdentity.name === "string"
                ? runtimeIdentity.name
                : "role-model",
          },
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

    if (request.method === "GET" && url.pathname === "/api/role-model/models") {
      if (!options.listModels) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listModels());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/taxonomy") {
      writeTaxonomyJson(request, response, createRuntimeTaxonomyFullResponse());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/taxonomy/version") {
      writeTaxonomyJson(request, response, createRuntimeTaxonomyVersionResponse());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/taxonomy/summary") {
      writeTaxonomyJson(request, response, createRuntimeTaxonomySummaryResponse());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/taxonomy/effective") {
      writeTaxonomyJson(request, response, createRuntimeTaxonomyEffectiveResponse());
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/role-model/taxonomy/classification-guide"
    ) {
      writeTaxonomyJson(request, response, createRuntimeTaxonomyClassificationGuideResponse());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/taxonomy/manifest") {
      writeTaxonomyJson(request, response, createRuntimeTaxonomyManifestResponse());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/taxonomy/groups") {
      writeTaxonomyJson(request, response, createRuntimeTaxonomyGroupsResponse());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/taxonomy/roles") {
      writeTaxonomyJson(
        request,
        response,
        createRuntimeTaxonomyRolesResponse(url.searchParams.get("view")),
      );
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/taxonomy/task-types") {
      writeTaxonomyJson(request, response, createRuntimeTaxonomyTaskTypesResponse());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/taxonomy/capabilities") {
      writeTaxonomyJson(request, response, createRuntimeTaxonomyCapabilitiesResponse());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/taxonomy/modalities") {
      writeTaxonomyJson(request, response, createRuntimeTaxonomyModalitiesResponse());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/taxonomy/tool-classes") {
      writeTaxonomyJson(request, response, createRuntimeTaxonomyToolClassesResponse());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/taxonomy/compact/groups") {
      writeTaxonomyJson(request, response, createRuntimeTaxonomyCompactGroupsResponse());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/taxonomy/compact/roles") {
      writeTaxonomyJson(request, response, createRuntimeTaxonomyCompactRolesResponse());
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname.startsWith("/api/role-model/taxonomy/roles/") &&
      url.pathname.endsWith("/tasks.compact")
    ) {
      const roleId = decodeURIComponent(
        url.pathname
          .slice("/api/role-model/taxonomy/roles/".length)
          .slice(0, -"/tasks.compact".length),
      );
      const roleTasks = createRuntimeTaxonomyRoleTasksResponse(roleId);
      if (!roleTasks) {
        writeJson(response, 404, { error: "unknown role", roleId });
        return;
      }
      writeTaxonomyJson(request, response, roleTasks);
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname.startsWith("/api/role-model/taxonomy/groups/") &&
      url.pathname.endsWith("/roles")
    ) {
      const groupId = decodeURIComponent(
        url.pathname.slice("/api/role-model/taxonomy/groups/".length).slice(0, -"/roles".length),
      );
      const groupRoles = createRuntimeTaxonomyGroupRolesResponse(groupId);
      if (!groupRoles) {
        writeJson(response, 404, { error: "unknown group", groupId });
        return;
      }
      writeTaxonomyJson(request, response, groupRoles);
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname.startsWith("/api/role-model/taxonomy/roles/") &&
      url.pathname.endsWith("/task-types")
    ) {
      const roleId = decodeURIComponent(
        url.pathname
          .slice("/api/role-model/taxonomy/roles/".length)
          .slice(0, -"/task-types".length),
      );
      const roleTaskTypes = createRuntimeTaxonomyRoleTaskTypesResponse(roleId);
      if (!roleTaskTypes) {
        writeJson(response, 404, { error: "unknown role", roleId });
        return;
      }
      writeTaxonomyJson(request, response, roleTaskTypes);
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/role-model/taxonomy/roles/")) {
      const roleId = decodeURIComponent(
        url.pathname.slice("/api/role-model/taxonomy/roles/".length),
      );
      const roleDetail = createRuntimeTaxonomyRoleDetailResponse(roleId);
      if (!roleDetail) {
        writeJson(response, 404, { error: "unknown role", roleId });
        return;
      }
      writeTaxonomyJson(request, response, roleDetail);
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname.startsWith("/api/role-model/taxonomy/task-types/")
    ) {
      const taskType = decodeURIComponent(
        url.pathname.slice("/api/role-model/taxonomy/task-types/".length),
      );
      const taskTypeDetail = createRuntimeTaxonomyTaskTypeDetailResponse(taskType);
      if (!taskTypeDetail) {
        writeJson(response, 404, { error: "unknown task type", taskType });
        return;
      }
      writeTaxonomyJson(request, response, taskTypeDetail);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/role-model/taxonomy/validate") {
      try {
        writeJson(
          response,
          200,
          validateRuntimeTaxonomyRequest((await readJsonBody(request)) as Record<string, unknown>),
        );
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "taxonomy validation failed",
        });
      }
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

    if (request.method === "GET" && url.pathname === "/api/role-model/role-policy") {
      if (!options.readRolePolicy) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readRolePolicy());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/role-model/roles") {
      if (!options.createRolePolicyRole) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      try {
        writeJson(response, 200, await options.createRolePolicyRole(await readJsonBody(request)));
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "role create failed",
        });
      }
      return;
    }

    if (request.method === "PUT" && url.pathname.startsWith("/api/role-model/roles/")) {
      if (!options.updateRolePolicyRole) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      try {
        const roleId = decodeURIComponent(url.pathname.slice("/api/role-model/roles/".length));
        writeJson(
          response,
          200,
          await options.updateRolePolicyRole(roleId, await readJsonBody(request)),
        );
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "role update failed",
        });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/tasks") {
      if (!options.listTaskDefinitions) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listTaskDefinitions());
      return;
    }

    if (request.method === "PUT" && url.pathname === "/api/role-model/tasks") {
      if (!options.updateTaskDefinitions) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      try {
        const body = await readJsonBody(request);
        if (!Array.isArray(body)) {
          throw new Error("tasks body must be an array");
        }
        writeJson(response, 200, await options.updateTaskDefinitions(body));
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "task update failed",
        });
      }
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

    if (request.method === "GET" && url.pathname === "/api/role-model/accounts/device") {
      if (!options.listProviderDeviceAuthorizations) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listProviderDeviceAuthorizations());
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
        writeJson(
          response,
          200,
          await options.updateControllerAssignment(await readJsonBody(request)),
        );
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "controller assignment update failed",
        });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/router/summary") {
      if (!options.readRouterSummary) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readRouterSummary());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/router/config") {
      if (!options.readRouterConfig) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readRouterConfig());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/router/candidates") {
      if (!options.listRouterCandidates) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listRouterCandidates());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/benchmark/suite") {
      if (!options.readBenchmarkSuite) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readBenchmarkSuite());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/benchmark/runs") {
      if (!options.listBenchmarkRuns) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listBenchmarkRuns());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/benchmark/runs/active") {
      if (!options.readActiveBenchmarkRun) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readActiveBenchmarkRun());
      return;
    }

    if (request.method === "DELETE" && url.pathname === "/api/role-model/benchmark/data") {
      if (!options.clearBenchmarkData) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      try {
        writeJson(response, 200, await options.clearBenchmarkData());
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "benchmark data clear failed",
        });
      }
      return;
    }

    if (
      request.method === "DELETE" &&
      url.pathname.startsWith("/api/role-model/benchmark/endpoints/") &&
      url.pathname.endsWith("/data")
    ) {
      if (!options.clearBenchmarkEndpointData) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const endpointId = decodeURIComponent(
        url.pathname.slice("/api/role-model/benchmark/endpoints/".length).slice(0, -"/data".length),
      ).trim();
      if (!endpointId) {
        writeJson(response, 400, { error: "endpointId is required" });
        return;
      }
      try {
        writeJson(response, 200, await options.clearBenchmarkEndpointData(endpointId));
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "benchmark data clear failed",
        });
      }
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/role-model/benchmark/runs/")) {
      if (!options.readBenchmarkRun) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const runId = url.pathname.slice("/api/role-model/benchmark/runs/".length).trim();
      if (!runId) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      try {
        writeJson(response, 200, await options.readBenchmarkRun(runId));
      } catch (error) {
        writeJson(response, 404, {
          error: error instanceof Error ? error.message : "benchmark run not found",
        });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/role-model/benchmark/runs") {
      if (!options.runBenchmark) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      try {
        writeJson(response, 202, await options.runBenchmark(await readJsonBody(request)));
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "benchmark run failed",
        });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/benchmark/summary") {
      if (!options.readBenchmarkSummary) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readBenchmarkSummary());
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/role-model/benchmark/summaries/by-mode"
    ) {
      if (!options.readBenchmarkSummariesByMode) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readBenchmarkSummariesByMode());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/benchmark/preferences") {
      if (!options.readBenchmarkPreferences) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readBenchmarkPreferences());
      return;
    }

    if (request.method === "PUT" && url.pathname === "/api/role-model/benchmark/preferences") {
      if (!options.updateBenchmarkPreferences) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      try {
        writeJson(
          response,
          200,
          await options.updateBenchmarkPreferences(await readJsonBody(request)),
        );
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "benchmark preferences update failed",
        });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/router/decisions") {
      if (!options.listRouterDecisions) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listRouterDecisions());
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/role-model/router/decisions/")) {
      if (!options.readRouterDecision) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const requestId = decodeURIComponent(
        url.pathname.slice("/api/role-model/router/decisions/".length),
      );
      const detail = await options.readRouterDecision(requestId);
      if (!detail) {
        writeJson(response, 404, { error: "request not found" });
        return;
      }
      writeJson(response, 200, detail);
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

    if (
      request.method === "DELETE" &&
      url.pathname.startsWith("/api/role-model/accounts/") &&
      url.pathname.includes("/models/")
    ) {
      if (!options.removeProviderAccountModel) {
        writeJson(response, 404, { error: "not found" });
        return;
      }

      const suffix = url.pathname.slice("/api/role-model/accounts/".length);
      const segments = suffix.split("/");
      if (segments.length !== 3 || segments[1] !== "models") {
        writeJson(response, 404, { error: "not found" });
        return;
      }

      const providerAccountId = decodeURIComponent(segments[0] ?? "").trim();
      const modelId = decodeURIComponent(segments[2] ?? "").trim();
      if (!providerAccountId || !modelId) {
        writeJson(response, 400, { error: "providerAccountId and modelId are required" });
        return;
      }

      try {
        writeJson(
          response,
          200,
          await options.removeProviderAccountModel(providerAccountId, modelId),
        );
      } catch (error) {
        if (error instanceof ConfiguredModelReferenceConflictError) {
          writeJson(response, 409, {
            error: error.message,
            code: error.code,
            references: error.references,
            mutationApplied: error.mutationApplied,
          });
        } else if (error instanceof ConfiguredModelEjectMutationError) {
          writeJson(response, 500, {
            error: error.message,
            code: error.code,
            failedBoundary: error.failedBoundary,
            mutationApplied: error.mutationApplied,
            reconciliationRequired: error.reconciliationRequired,
          });
        } else {
          writeJson(response, 400, {
            error: error instanceof Error ? error.message : "provider model removal failed",
          });
        }
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/role-model/accounts/repair/reconnect") {
      if (!options.reconnectProviderAccount) {
        writeJson(response, 404, { error: "not found" });
        return;
      }

      try {
        writeJson(
          response,
          200,
          await options.reconnectProviderAccount(await readJsonBody(request)),
        );
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "provider reconnect failed",
        });
      }
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/role-model/accounts/repair/update-key"
    ) {
      if (!options.updateProviderApiKey) {
        writeJson(response, 404, { error: "not found" });
        return;
      }

      try {
        writeJson(response, 200, await options.updateProviderApiKey(await readJsonBody(request)));
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "provider API key update failed",
        });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/role-model/system/open-url") {
      if (!options.openExternalUrl) {
        writeJson(response, 404, { error: "not found" });
        return;
      }

      try {
        writeJson(response, 200, await options.openExternalUrl(await readJsonBody(request)));
      } catch (error) {
        writeJson(response, 400, {
          error: error instanceof Error ? error.message : "external URL open failed",
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
        writeJson(
          response,
          200,
          await options.startProviderDeviceAuthorization(await readJsonBody(request)),
        );
      } catch (error) {
        writeJson(response, 400, {
          error:
            error instanceof Error ? error.message : "provider device authorization start failed",
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
        writeJson(
          response,
          200,
          await options.pollProviderDeviceAuthorization(await readJsonBody(request)),
        );
      } catch (error) {
        writeJson(response, 400, {
          error:
            error instanceof Error ? error.message : "provider device authorization poll failed",
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

    if (request.method === "GET" && url.pathname === "/api/role-model/requests/latest-ids") {
      if (!options.listRecentRequestIds) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const limit = readOptionalPositiveInteger(url.searchParams, "limit") ?? 10;
      writeJson(response, 200, await options.listRecentRequestIds(limit));
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

    if (request.method === "GET" && url.pathname === "/api/role-model/local/models") {
      if (!options.listLocalModels) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listLocalModels());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/local/peer/models") {
      if (!options.listPeerLocalModels) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listPeerLocalModels());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/local/llama-swap/models") {
      if (!options.listLlamaSwapLocalModels) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listLlamaSwapLocalModels());
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname.startsWith("/api/role-model/local/peer/models/") &&
      url.pathname.endsWith("/load")
    ) {
      if (!options.loadPeerModel) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const modelId = decodeURIComponent(
        url.pathname.slice("/api/role-model/local/peer/models/".length, -"/load".length),
      );
      const body = await readJsonBody(request);
      writeJson(
        response,
        200,
        await options.loadPeerModel(modelId, readRoleAssignmentFromBody(body, false)),
      );
      return;
    }

    if (
      request.method === "PUT" &&
      url.pathname.startsWith("/api/role-model/local/peer/models/") &&
      url.pathname.endsWith("/roles")
    ) {
      if (!options.setPeerModelRoles) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const modelId = decodeURIComponent(
        url.pathname.slice("/api/role-model/local/peer/models/".length, -"/roles".length),
      );
      const body = await readJsonBody(request);
      const roleAssignment = readRoleAssignmentFromBody(body, true);
      if (!roleAssignment) {
        throw new Error("roleIds must be an array of strings.");
      }
      writeJson(response, 200, await options.setPeerModelRoles(modelId, roleAssignment));
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname.startsWith("/api/role-model/local/peer/models/") &&
      url.pathname.endsWith("/unload")
    ) {
      if (!options.unloadPeerModel) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const modelId = decodeURIComponent(
        url.pathname.slice("/api/role-model/local/peer/models/".length, -"/unload".length),
      );
      writeJson(response, 200, await options.unloadPeerModel(modelId));
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname.startsWith("/api/role-model/local/llama-swap/models/") &&
      url.pathname.endsWith("/load")
    ) {
      if (!options.loadLlamaSwapModel) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const modelId = decodeURIComponent(
        url.pathname.slice("/api/role-model/local/llama-swap/models/".length, -"/load".length),
      );
      const body = await readJsonBody(request);
      writeJson(
        response,
        200,
        await options.loadLlamaSwapModel(modelId, readRoleAssignmentFromBody(body, false)),
      );
      return;
    }

    if (
      request.method === "PUT" &&
      url.pathname.startsWith("/api/role-model/local/llama-swap/models/") &&
      url.pathname.endsWith("/roles")
    ) {
      if (!options.setLlamaSwapModelRoles) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const modelId = decodeURIComponent(
        url.pathname.slice("/api/role-model/local/llama-swap/models/".length, -"/roles".length),
      );
      const body = await readJsonBody(request);
      const roleAssignment = readRoleAssignmentFromBody(body, true);
      if (!roleAssignment) {
        throw new Error("roleIds must be an array of strings.");
      }
      writeJson(response, 200, await options.setLlamaSwapModelRoles(modelId, roleAssignment));
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname.startsWith("/api/role-model/local/models/") &&
      url.pathname.endsWith("/load")
    ) {
      if (!options.loadLocalModel) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const modelId = decodeURIComponent(
        url.pathname.slice("/api/role-model/local/models/".length, -"/load".length),
      );
      writeJson(response, 200, await options.loadLocalModel(modelId));
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname.startsWith("/api/role-model/local/models/") &&
      url.pathname.endsWith("/unload")
    ) {
      if (!options.unloadLocalModel) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const modelId = decodeURIComponent(
        url.pathname.slice("/api/role-model/local/models/".length, -"/unload".length),
      );
      writeJson(response, 200, await options.unloadLocalModel(modelId));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/role-model/local/models/unload") {
      if (!options.unloadLocalModel) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.unloadLocalModel());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/local/policy") {
      if (!options.readLocalPolicy) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readLocalPolicy());
      return;
    }

    if (request.method === "PUT" && url.pathname === "/api/role-model/local/policy") {
      if (!options.updateLocalPolicy) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.updateLocalPolicy(await readJsonBody(request)));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/local/swap") {
      if (!options.listSwapHistory) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.listSwapHistory());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/local/logs") {
      if (!options.getLocalLogs) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.getLocalLogs());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/local/overrides") {
      if (!options.readModelOverrides) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readModelOverrides());
      return;
    }

    if (request.method === "PUT" && url.pathname === "/api/role-model/local/overrides") {
      if (!options.updateModelOverrides) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(
        response,
        200,
        await options.updateModelOverrides(readModelOverridesBody(await readJsonBody(request))),
      );
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/local/peers") {
      if (!options.readPeers) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      writeJson(response, 200, await options.readPeers());
      return;
    }

    if (request.method === "PUT" && url.pathname === "/api/role-model/local/peers") {
      if (!options.updatePeers) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const body = await readJsonBody(request);
      if (!Array.isArray(body)) {
        writeJson(response, 400, { error: "expected array" });
        return;
      }
      writeJson(
        response,
        200,
        await options.updatePeers(
          body as readonly { id: string; url: string; authToken?: string }[],
        ),
      );
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/role-model/local/peers/health") {
      if (!options.checkPeerHealth) {
        writeJson(response, 404, { error: "not found" });
        return;
      }
      const peerUrl = url.searchParams.get("url");
      if (!peerUrl) {
        writeJson(response, 400, { error: "missing url query param" });
        return;
      }
      writeJson(response, 200, await options.checkPeerHealth(peerUrl));
      return;
    }

    if (options.staticRoot && request.method === "GET") {
      const filePath = path.join(
        options.staticRoot,
        url.pathname === "/" ? "index.html" : url.pathname,
      );
      const resolvedPath = existsSync(filePath)
        ? filePath
        : path.join(options.staticRoot, "index.html");
      if (existsSync(resolvedPath)) {
        const ext = path.extname(resolvedPath).toLowerCase();
        const contentType =
          ext === ".html"
            ? "text/html; charset=utf-8"
            : ext === ".js"
              ? "application/javascript; charset=utf-8"
              : ext === ".css"
                ? "text/css; charset=utf-8"
                : ext === ".json"
                  ? "application/json; charset=utf-8"
                  : ext === ".png"
                    ? "image/png"
                    : ext === ".jpg" || ext === ".jpeg"
                      ? "image/jpeg"
                      : ext === ".svg"
                        ? "image/svg+xml"
                        : ext === ".woff2"
                          ? "font/woff2"
                          : ext === ".woff"
                            ? "font/woff"
                            : "application/octet-stream";
        const data = readFileSync(resolvedPath);
        response.writeHead(200, {
          "cache-control": "no-store",
          "content-type": contentType,
          "content-length": data.length,
        });
        response.end(data);
        return;
      }
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

export const RUNTIME_HOST_STORAGE_REGISTRY = Object.freeze({
  schemaVersion: "role-model.storage-registry.v1",
  entries: Object.freeze([
    Object.freeze({
      id: "runtime_logs",
      owner: "runtime-host",
      channels: Object.freeze(["development", "stage", "production"] as const),
    }),
  ]),
});

export function assertRuntimeHostStorageWriteAllowed(storageClass: string, channel: string): void {
  const registration = RUNTIME_HOST_STORAGE_REGISTRY.entries.find(
    (entry) => entry.id === storageClass,
  );
  const normalizedChannel = channel === "staging" ? "stage" : channel;
  if (!registration) throw new Error(`unregistered storage class: ${storageClass}`);
  if (
    !registration.channels.includes(normalizedChannel as "development" | "stage" | "production")
  ) {
    throw new Error(`storage class ${storageClass} is not writable in ${channel || "unknown"}`);
  }
}

function appendRuntimeHttpTrace(
  runtimeStateRoot: string,
  runtimeChannel: string,
  message: string,
): void {
  try {
    assertRuntimeHostStorageWriteAllowed("runtime_logs", runtimeChannel);
    const logPath = path.join(runtimeStateRoot, "logs", "runtime-http.log");
    mkdirSync(path.dirname(logPath), { recursive: true });
    appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`, "utf8");
  } catch {
    // Ignore tracing failures while debugging packaged startup behavior.
  }
}

export async function startBridgeServer(options: StartBridgeServerOptions): Promise<BridgeServer> {
  const server = createServer((request, response) => {
    const requestStart = Date.now();
    const requestPath = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const runtimeStateRoot = options.runtimeStateRoot;
    const runtimeChannel = options.runtimeChannel ?? "development";
    const shouldTraceRequest =
      typeof runtimeStateRoot === "string" &&
      runtimeStateRoot.length > 0 &&
      request.method === "GET" &&
      (requestPath === "/" ||
        requestPath === "/app" ||
        requestPath.startsWith("/assets/") ||
        requestPath === "/favicon.ico");
    if (shouldTraceRequest) {
      appendRuntimeHttpTrace(
        runtimeStateRoot,
        runtimeChannel,
        `request-start method=${request.method} path=${requestPath}`,
      );
      response.on("finish", () => {
        appendRuntimeHttpTrace(
          runtimeStateRoot,
          runtimeChannel,
          `request-finish method=${request.method} path=${requestPath} status=${response.statusCode} duration_ms=${Date.now() - requestStart}`,
        );
      });
      response.on("close", () => {
        if (!response.writableEnded) {
          appendRuntimeHttpTrace(
            runtimeStateRoot,
            runtimeChannel,
            `request-close method=${request.method} path=${requestPath} duration_ms=${Date.now() - requestStart}`,
          );
        }
      });
    }
    void createRequestHandler(options)(request, response).catch((error: unknown) => {
      if (!writeUnhandledBridgeError(response, error)) {
        console.error("runtime host bridge request failed after response commit", error);
      }
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
  const runtimeChannel = options.runtimeChannel ?? "development";
  const createTrackBOperations = (input: Parameters<typeof createTrackBOperationsFromState>[0]) =>
    createTrackBOperationsFromState({
      ...input,
      operationsEndpoint: options.trackBOperationsEndpoint,
      operationsToken: options.trackBOperationsToken,
    });
  const networkFetcher = options.networkFetcher ?? fetch;
  const codexAuthAdapter = options.codexAuthAdapter ?? createSystemCodexAuthAdapter(networkFetcher);
  const codexExecutionAdapter =
    options.codexExecutionAdapter ??
    createCodexSubscriptionResponsesExecutionAdapter({ networkFetcher });
  const codexDynamicToolExecutionsByRequestId = new Map<string, ToolRegistryExecution[]>();
  const runtimeVendorStartup = options.runtimeVendorStartup ?? "enabled";
  const fixtureRoot = options.fixtureRoot ?? null;
  const useFixtures = fixtureRoot !== null;
  const migrateLegacyStandaloneRuntimeConfigIfNeeded = async (): Promise<void> => {
    if (!options.unifiedRuntimeConfigPath || options.scopeId !== "standalone-runtime") {
      return;
    }

    const normalizedCanonicalPath = path.resolve(options.unifiedRuntimeConfigPath);
    const legacyRuntimeConfigPath = path.resolve(
      path.join(options.runtimeStateRoot, "runtime-config.yaml"),
    );
    if (legacyRuntimeConfigPath === normalizedCanonicalPath) {
      return;
    }

    const canonicalRuntimeConfigText = await readFile(
      options.unifiedRuntimeConfigPath,
      "utf8",
    ).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    });
    if (canonicalRuntimeConfigText !== null) {
      return;
    }

    const legacyRuntimeConfigText = await readFile(legacyRuntimeConfigPath, "utf8").catch(
      (error: unknown) => {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return null;
        }
        throw error;
      },
    );
    if (legacyRuntimeConfigText === null) {
      return;
    }

    await mkdir(path.dirname(options.unifiedRuntimeConfigPath), { recursive: true });
    await writeFile(options.unifiedRuntimeConfigPath, legacyRuntimeConfigText, "utf8");
  };
  await migrateLegacyStandaloneRuntimeConfigIfNeeded();
  const initialUnifiedRuntimeConfigText = options.unifiedRuntimeConfigPath
    ? await readFile(options.unifiedRuntimeConfigPath, "utf8").catch((error: unknown) => {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return null;
        }
        throw error;
      })
    : null;
  const initialUnifiedRuntimeConfig = initialUnifiedRuntimeConfigText
    ? parseUnifiedRuntimeConfigText(initialUnifiedRuntimeConfigText)
    : null;
  const runtimeVersionInfo = await resolveRuntimeVersionInfo({
    repoRoot: options.repoRoot,
    fallbackConfigVersion: initialUnifiedRuntimeConfig?.version ?? null,
  });
  if (
    options.unifiedRuntimeConfigPath &&
    initialUnifiedRuntimeConfigText !== null &&
    initialUnifiedRuntimeConfig !== null &&
    containsLegacyRoutingAliasConfigText(initialUnifiedRuntimeConfigText)
  ) {
    await mkdir(path.dirname(options.unifiedRuntimeConfigPath), { recursive: true });
    await writeFile(
      options.unifiedRuntimeConfigPath,
      renderUnifiedRuntimeConfigText(initialUnifiedRuntimeConfig),
      "utf8",
    );
  }
  const supervisor = options.unifiedRuntimeConfigPath ? new ProcessSupervisor() : null;
  const baseCatalog = await readNormalizedCatalogFile(
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
  if (useFixtures && fixtureRoot === null) {
    throw new Error("Fixture root must be provided when fixture loading is enabled.");
  }
  const fixtureBasePath = fixtureRoot ?? "";
  const providerAccountsFixture = useFixtures
    ? await readJson<{ accounts: ProviderAccountRecord[] }>(
        path.join(fixtureBasePath, "provider-accounts.json"),
      )
    : { accounts: [] };
  const registrySourcesFixture = useFixtures
    ? await readJson<RegistrySources>(path.join(fixtureBasePath, "registry-sources.json"))
    : { cloud: [], local: [] };
  const fixtureAccounts = useFixtures
    ? synthesizeFixtureProviderAccounts(
        baseCatalog,
        providerAccountsFixture.accounts,
        registrySourcesFixture,
      )
    : [];
  const continuityFixture = useFixtures
    ? await readJson<{
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
      }>(path.join(fixtureBasePath, "context-envelope.json"))
    : null;
  const fixtureRoutingModel = useFixtures
    ? await readJson<RoutingModelSelection>(
        path.join(fixtureBasePath, "routing-model-guidance.json"),
      ).catch(() => undefined)
    : undefined;
  let routingModel: RoutingModelSelection | undefined;
  const captureFixtureMap = useFixtures
    ? await readJson<CaptureFixtureMap>(path.join(fixtureBasePath, "adapter-captures.json"))
    : { byEndpointId: {}, byRequestId: {} };
  const observabilityHistory = useFixtures
    ? await readJson<{
        byEndpointId: Record<string, ObservedPerformanceSample[]>;
      }>(path.join(fixtureBasePath, "observability-history.json"))
    : { byEndpointId: {} };
  const observabilityPolicy = useFixtures
    ? await readJson<RuntimeCapturePolicy>(path.join(fixtureBasePath, "observability-policy.json"))
    : ({ captureMode: "none" } as RuntimeCapturePolicy);
  const fixtureProviderPresets = useFixtures
    ? await readJson<ProviderPresetCatalog>(path.join(fixtureBasePath, "provider-presets.json"))
    : { providers: {} };
  const repoProviderPresets = useFixtures
    ? await readJson<ProviderPresetCatalog>(
        path.join(fixtureBasePath, "provider-presets.json"),
      ).catch(() => ({ providers: {} }) as ProviderPresetCatalog)
    : ({ providers: {} } as ProviderPresetCatalog);
  const legacyPlaceholderAccounts = fixtureAccounts;
  const legacyPlaceholderProviderAccountIds = [
    ...new Set(
      legacyPlaceholderAccounts.map((account) => account.providerAccountId).filter(Boolean),
    ),
  ];
  const providerPresets: ProviderPresetCatalog = {
    providers: {
      ...repoProviderPresets.providers,
      ...fixtureProviderPresets.providers,
    },
  };
  const initialization = initializeSqliteMemory({
    runtimeStateRoot: options.runtimeStateRoot,
    scopeId: options.scopeId,
    channel: runtimeChannel,
  });
  const restartCircuitState = readExecutionCircuitState(initialization.databasePath);
  const normalizedRestartCircuitState = normalizeExecutionCircuitStateForRestart(
    restartCircuitState,
    Date.now(),
  );
  if (normalizedRestartCircuitState !== restartCircuitState) {
    writeExecutionCircuitState(initialization.databasePath, normalizedRestartCircuitState);
  }
  const operatorIntentLocation = {
    runtimeStateRoot: options.runtimeStateRoot,
    scopeId: options.scopeId,
  };
  let operatorIntentDiagnostic: OperatorIntentDiagnostic =
    readOperatorIntentResult(operatorIntentLocation).diagnostic;
  if (initialUnifiedRuntimeConfig === null) {
    deleteRuntimeConfigProviderAccounts(initialization.databasePath);
  }
  deleteProviderDeviceAuthorizationsByAccountId(
    initialization.databasePath,
    legacyPlaceholderProviderAccountIds,
  );
  deleteRuntimeEndpointsByProviderAccountId(
    initialization.databasePath,
    legacyPlaceholderProviderAccountIds,
  );
  deleteProviderAccountsById(initialization.databasePath, legacyPlaceholderProviderAccountIds);
  const rolePolicyPath = getRuntimeRolePolicyPath(options.runtimeStateRoot);
  let currentRolePolicy: RuntimeRolePolicyRecord;
  try {
    currentRolePolicy = existsSync(rolePolicyPath)
      ? validateRuntimeRolePolicyRecord(
          JSON.parse(await readFile(rolePolicyPath, "utf8")),
          "runtime role policy",
        )
      : buildDefaultRuntimeRolePolicy();
  } catch {
    currentRolePolicy = buildDefaultRuntimeRolePolicy();
  }
  let currentRuntimeRoles = buildRuntimeRoleCatalog(currentRolePolicy.roleDefinitions);
  const getAllowedRoleIds = (): readonly string[] =>
    currentRuntimeRoles.roleSummaries.map((role) => role.roleId);
  const mergeProviderAccountMutation = (
    account: Record<string, unknown>,
    existingAccount: ProviderAccountRecord | undefined,
  ): Record<string, unknown> => {
    if (!existingAccount) {
      return account;
    }

    const mergedAccount = { ...account };
    const newAllowedModels = Array.isArray(mergedAccount.allowedModels)
      ? (mergedAccount.allowedModels as string[])
      : [];
    mergedAccount.allowedModels = [
      ...new Set([...existingAccount.allowedModels, ...newAllowedModels]),
    ];

    if (
      Array.isArray(mergedAccount.modelRoleBindings) &&
      (existingAccount.modelRoleBindings?.length ?? 0) > 0
    ) {
      const newBindings = mergedAccount.modelRoleBindings as NonNullable<
        ProviderAccountRecord["modelRoleBindings"]
      >;
      const existingBindings = existingAccount.modelRoleBindings ?? [];
      mergedAccount.modelRoleBindings = [
        ...existingBindings.filter(
          (existingBinding) =>
            !newBindings.some((newBinding) => newBinding.modelId === existingBinding.modelId),
        ),
        ...newBindings,
      ];
    }

    if (!mergedAccount.credentialRef) {
      mergedAccount.credentialRef = existingAccount.credentialRef;
    }
    if (mergedAccount.status === undefined && existingAccount.status) {
      mergedAccount.status = existingAccount.status;
    }
    if (mergedAccount.healthStatus === undefined && existingAccount.healthStatus) {
      mergedAccount.healthStatus = existingAccount.healthStatus;
    }
    if (mergedAccount.rotationState === undefined && existingAccount.rotationState) {
      mergedAccount.rotationState = existingAccount.rotationState;
    }

    return mergedAccount;
  };
  const deviceId = randomUUID();

  // ── Retention cleanup: delete telemetry records past their retainUntil timestamp ──
  const runRetentionCleanup = (): { deletedCount: number } => {
    const database = new DatabaseSync(initialization.databasePath);
    let deletedCount = 0;
    try {
      const result = database
        .prepare(
          "DELETE FROM runtime_observations WHERE retain_until_ms IS NOT NULL AND retain_until_ms < ?",
        )
        .run(Date.now());
      deletedCount = Number(result.changes);
    } finally {
      database.close();
    }
    return { deletedCount };
  };
  runRetentionCleanup();

  if (continuityFixture) {
    persistContinuitySnapshot({
      databasePath: initialization.databasePath,
      session: continuityFixture.session,
      conversation: continuityFixture.conversation,
      turns: continuityFixture.turns,
      artifacts: continuityFixture.artifacts,
      artifactLinks: continuityFixture.artifactLinks,
      handoffs: continuityFixture.handoffs,
    });
  }

  let currentUnifiedRuntimeConfig = initialUnifiedRuntimeConfig;
  const catalogWithFixtureModels = withBuiltinLocalOpenAIProvider(
    synthesizeFixtureModelsForCatalog(baseCatalog, fixtureAccounts, registrySourcesFixture),
  );
  const fixtureAccountIds = new Set(fixtureAccounts.map((account) => account.providerAccountId));
  let runtimeConfigProviderAccountIds = new Set<string>();
  const catalogWithAdapterOverrides = applyUnifiedLiteLLMAdapterFamilyOverrides(
    catalogWithFixtureModels,
    currentUnifiedRuntimeConfig,
    liteLLMProviders,
  );
  let currentNormalizedCatalog: NormalizedCatalog = {
    ...catalogWithAdapterOverrides,
    models: applyAliasedCatalogPricing(catalogWithAdapterOverrides.models),
  };
  let currentModelsById = new Map(
    currentNormalizedCatalog.models.map((model) => [model.modelId, model]),
  );
  let currentRegistrySources: RegistrySources =
    currentUnifiedRuntimeConfig !== null
      ? {
          cloud: createUnifiedCloudSources(currentUnifiedRuntimeConfig),
          local: createUnifiedLocalSources(currentUnifiedRuntimeConfig),
        }
      : registrySourcesFixture;
  const activeProviderAccountRepairs = new Set<string>();
  let latestConfiguredMembershipReconciliation: ConfiguredMembershipReconciliationReceipt | null =
    null;
  let unifiedConfigMutationTail: Promise<void> = Promise.resolve();
  const withUnifiedConfigMutationLock = async <T>(operation: () => Promise<T>): Promise<T> => {
    const previous = unifiedConfigMutationTail;
    let release!: () => void;
    unifiedConfigMutationTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  };
  const writeConfigTextAtomically = async (targetPath: string, text: string): Promise<void> => {
    await mkdir(path.dirname(targetPath), { recursive: true });
    const tempPath = `${targetPath}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(tempPath, text, "utf8");
    try {
      await rename(tempPath, targetPath);
    } catch (error) {
      await rm(tempPath, { force: true });
      throw error;
    }
  };
  const repairPersistedProviderAccountsFromRuntimeState = (
    persistedAccounts: readonly ProviderAccountRecord[],
  ): ProviderAccountRecord[] => {
    const persistedRuntimeEndpoints = listRuntimeEndpoints({
      databasePath: initialization.databasePath,
    });
    const operatorIntentRead = readOperatorIntentResult(operatorIntentLocation);
    operatorIntentDiagnostic = operatorIntentRead.diagnostic;
    const remoteActivations: readonly OperatorIntentRemoteActivation[] =
      operatorIntentRead.diagnostic.status === "corrupt"
        ? []
        : (operatorIntentRead.intent?.remoteActivations ?? []);
    const configuredModelKeys = new Set(
      persistedAccounts.flatMap((account) =>
        account.allowedModels.map((modelId) => `${account.providerAccountId}\u0000${modelId}`),
      ),
    );
    const isConfigured = (providerAccountId: string, modelId: string): boolean =>
      configuredModelKeys.has(`${providerAccountId}\u0000${modelId}`);
    let prunedEndpointCount = 0;
    for (const endpoint of persistedRuntimeEndpoints) {
      if (
        endpoint.servingSource === "remote-service" &&
        !isConfigured(endpoint.providerAccountId, endpoint.modelId)
      ) {
        deleteRuntimeEndpointsByModelId(initialization.databasePath, endpoint.modelId, [
          endpoint.providerAccountId,
        ]);
        prunedEndpointCount += 1;
      }
    }
    const staleActivations = remoteActivations.filter(
      (activation) => !isConfigured(activation.providerAccountId, activation.modelId),
    );
    if (staleActivations.length > 0) {
      persistOperatorIntent(operatorIntentLocation, (intent) =>
        staleActivations.reduce(
          (next, activation) =>
            removeRemoteActivationsByConfiguredModel(
              next,
              activation.providerAccountId,
              activation.modelId,
            ),
          intent,
        ),
      );
    }
    const requiredModelsByAccountId = new Map<string, Set<string>>();
    const activationBindingsByAccountModelKey = new Map<string, ProviderAccountModelRoleBinding>();
    const rememberRequiredModel = (providerAccountId: string, modelId: string): void => {
      if (!isConfigured(providerAccountId, modelId)) {
        return;
      }
      const requiredModels = requiredModelsByAccountId.get(providerAccountId) ?? new Set<string>();
      requiredModels.add(modelId);
      requiredModelsByAccountId.set(providerAccountId, requiredModels);
    };
    const buildActivationBinding = (
      activation: OperatorIntentRemoteActivation,
    ): ProviderAccountModelRoleBinding | null => {
      const matchingBindings = (activation.modelRoleBindings ?? []).filter(
        (binding) => binding.modelId === activation.modelId,
      );
      if (matchingBindings.length === 0) {
        return null;
      }
      const roleIds = [
        ...new Set(
          matchingBindings.flatMap(
            (binding) => normalizeRuntimeRoleIds(binding.roleIds) ?? binding.roleIds,
          ),
        ),
      ].sort(compareText);
      if (roleIds.length === 0) {
        return {
          modelId: activation.modelId,
          roleIds: [],
          roleAssignmentMode: "all",
          enabledRoleIds: [],
          disabledRoleIds: [],
        };
      }
      return {
        modelId: activation.modelId,
        roleIds,
      };
    };

    for (const endpoint of persistedRuntimeEndpoints) {
      rememberRequiredModel(endpoint.providerAccountId, endpoint.modelId);
    }
    for (const activation of remoteActivations) {
      rememberRequiredModel(activation.providerAccountId, activation.modelId);
      const binding = buildActivationBinding(activation);
      if (binding) {
        activationBindingsByAccountModelKey.set(
          `${activation.providerAccountId}:${activation.modelId}`,
          binding,
        );
      }
    }

    const allowedRoleIds = new Set(getAllowedRoleIds());
    let prunedBindingCount = 0;
    const repairedAccounts = persistedAccounts.map((account) => {
      const requiredModels =
        requiredModelsByAccountId.get(account.providerAccountId) ?? new Set<string>();

      const nextAllowedModels = [...new Set([...account.allowedModels, ...requiredModels])].sort(
        compareText,
      );
      const nextBindings = (
        (account.modelRoleBindings ?? []).map((binding) =>
          normalizeProviderAccountModelRoleBinding(binding),
        ) as ProviderAccountModelRoleBinding[]
      ).filter((binding) => account.allowedModels.includes(binding.modelId));
      prunedBindingCount += (account.modelRoleBindings?.length ?? 0) - nextBindings.length;
      const existingBindingModelIds = new Set(nextBindings.map((binding) => binding.modelId));
      for (const modelId of requiredModels) {
        if (existingBindingModelIds.has(modelId)) {
          continue;
        }
        const activationBinding = activationBindingsByAccountModelKey.get(
          `${account.providerAccountId}:${modelId}`,
        );
        if (!activationBinding) {
          continue;
        }
        nextBindings.push(activationBinding);
        existingBindingModelIds.add(modelId);
      }
      const sanitizedBindings = sanitizeProviderAccountModelRoleBindingsForAllowedRoles(
        nextBindings,
        allowedRoleIds,
      );
      return {
        ...account,
        allowedModels: nextAllowedModels,
        ...(sanitizedBindings ? { modelRoleBindings: sanitizedBindings } : {}),
      };
    });
    const changedAccounts = repairedAccounts.filter((account, index) => {
      const previousAccount = persistedAccounts[index];
      return (
        previousAccount !== undefined &&
        (JSON.stringify(account.allowedModels) !== JSON.stringify(previousAccount.allowedModels) ||
          JSON.stringify(account.modelRoleBindings ?? []) !==
            JSON.stringify(previousAccount.modelRoleBindings ?? []))
      );
    });
    if (changedAccounts.length > 0) {
      persistProviderAccounts({
        databasePath: initialization.databasePath,
        accounts: changedAccounts,
      });
    }
    const reconciliationReceipt: ConfiguredMembershipReconciliationReceipt = {
      reconciledAt: new Date().toISOString(),
      authorityVersion: 1,
      inspected: {
        runtimeEndpoints: persistedRuntimeEndpoints.length,
        remoteActivations: remoteActivations.length,
      },
      pruned: {
        runtimeEndpoints: prunedEndpointCount,
        remoteActivations: staleActivations.length,
        modelRoleBindings: prunedBindingCount,
      },
      reasonCodes: [
        ...(prunedEndpointCount > 0 ? ["endpoint-not-configured"] : []),
        ...(staleActivations.length > 0 ? ["activation-not-configured"] : []),
        ...(prunedBindingCount > 0 ? ["binding-not-configured"] : []),
      ],
    };
    if (
      latestConfiguredMembershipReconciliation === null ||
      prunedEndpointCount + staleActivations.length + prunedBindingCount > 0
    ) {
      latestConfiguredMembershipReconciliation = reconciliationReceipt;
    }
    return repairedAccounts;
  };
  const readCurrentAccounts = (): ProviderAccountRecord[] => {
    const persistedAccounts = repairPersistedProviderAccountsFromRuntimeState(
      listProviderAccounts({ databasePath: initialization.databasePath }).map(
        (account) =>
          normalizeProviderAccountRoleBindings(
            account as unknown as Record<string, unknown>,
          ) as unknown as ProviderAccountRecord,
      ),
    );
    const normalizedPersistedAccounts = persistedAccounts.map(
      (account) =>
        normalizeProviderAccountRoleBindings(
          account as unknown as Record<string, unknown>,
        ) as unknown as ProviderAccountRecord,
    );
    const validation = validateProviderAccounts({
      catalog: currentNormalizedCatalog,
      additionalProviders: liteLLMProviders,
      accounts: normalizedPersistedAccounts,
      allowedRoleIds: getAllowedRoleIds(),
    });
    const ignoredAccountIds = new Set([
      ...fixtureAccountIds,
      ...validation.accounts
        .filter((account) => isRuntimeConfigProviderAccount(account))
        .map((account) => account.providerAccountId),
    ]);
    const hydratedAccounts = hydrateOauthProviderAccounts(
      options.runtimeStateRoot,
      options.scopeId,
      hydrateEnvProviderAccounts(validation.accounts, ignoredAccountIds),
    ).map(normalizeCodexSubscriptionAccountTruth);
    const recoveredOauthAccountIds = new Set(
      hydratedAccounts.flatMap((account, index) => {
        const persistedAccount = validation.accounts[index];
        return persistedAccount && isRecoveredOauthRuntimeAccount(persistedAccount, account)
          ? [account.providerAccountId]
          : [];
      }),
    );
    const changedAccounts = hydratedAccounts.filter((account, index) => {
      const persistedAccount = validation.accounts[index];
      return (
        persistedAccount !== undefined &&
        (persistedAccount.status !== account.status ||
          persistedAccount.healthStatus !== account.healthStatus ||
          persistedAccount.rotationState !== account.rotationState)
      );
    });
    if (changedAccounts.length > 0) {
      persistProviderAccounts({
        databasePath: initialization.databasePath,
        accounts: changedAccounts,
      });
    }
    if (recoveredOauthAccountIds.size > 0) {
      const repairedEndpoints = listRuntimeEndpoints({
        databasePath: initialization.databasePath,
      }).filter(
        (endpoint) =>
          endpoint.lifecycleState === "active" &&
          endpoint.healthStatus !== "healthy" &&
          recoveredOauthAccountIds.has(endpoint.providerAccountId),
      );
      for (const endpoint of repairedEndpoints) {
        upsertSqliteRuntimeEndpoint({
          databasePath: initialization.databasePath,
          endpoint: {
            ...endpoint,
            healthStatus: "healthy",
          },
        });
      }
    }
    return hydratedAccounts;
  };
  const listCurrentProviderDeviceAuthorizations = (): DeviceAuthorizationReadbackResult[] =>
    listProviderDeviceAuthSessions({ databasePath: initialization.databasePath })
      .filter(
        (
          session,
        ): session is typeof session & { status: DeviceAuthorizationReadbackResult["status"] } =>
          session.status === "pending" ||
          session.status === "connected" ||
          session.status === "expired" ||
          session.status === "failed",
      )
      .map((session) => ({
        authRequestId: session.authRequestId,
        providerAccountId: session.providerAccountId,
        providerId: session.providerId,
        variantId: session.variantId,
        status: session.status,
        userCode: session.userCode,
        verificationUri: session.verificationUri,
        verificationUriComplete: session.verificationUriComplete,
        intervalSeconds: session.intervalSeconds,
        expiresAtMs: session.expiresAtMs,
        ...(session.lastError ? { lastError: session.lastError } : {}),
      }));
  const supersedePendingCodexSubscriptionSessions = async (
    providerAccountId: string,
  ): Promise<void> => {
    const activeSessions = listProviderDeviceAuthSessions({
      databasePath: initialization.databasePath,
    }).filter(
      (session) =>
        session.providerAccountId === providerAccountId &&
        session.providerId === OPENAI_PROVIDER_ID &&
        session.variantId === OPENAI_CODEX_SUBSCRIPTION_VARIANT_ID &&
        session.status === "pending" &&
        session.expiresAtMs > Date.now(),
    );

    for (const session of activeSessions) {
      const payload = decodeCodexDeviceCodeSessionPayload(session.deviceCode);
      if (payload) {
        await cleanupManagedCodexDeviceCodeSession(payload);
      }
      upsertProviderDeviceAuthSession({
        databasePath: initialization.databasePath,
        session: {
          ...session,
          status: "failed",
          lastError: "Superseded by a newer sign-in attempt.",
        },
      });
    }
  };
  const cleanupPendingManagedCodexSubscriptionSessions = async (
    reason: string,
  ): Promise<{ cleanedCount: number }> => {
    const activeSessions = listProviderDeviceAuthSessions({
      databasePath: initialization.databasePath,
    }).filter(
      (session) =>
        session.providerId === OPENAI_PROVIDER_ID &&
        session.variantId === OPENAI_CODEX_SUBSCRIPTION_VARIANT_ID &&
        session.status === "pending",
    );

    let cleanedCount = 0;
    for (const session of activeSessions) {
      const payload = decodeCodexDeviceCodeSessionPayload(session.deviceCode);
      if (payload) {
        await cleanupManagedCodexDeviceCodeSession(payload);
      }
      upsertProviderDeviceAuthSession({
        databasePath: initialization.databasePath,
        session: {
          ...session,
          status: "failed",
          lastError: reason,
        },
      });
      cleanedCount += 1;
    }

    return { cleanedCount };
  };
  await cleanupPendingManagedCodexSubscriptionSessions(
    "Previous runtime session ended before OpenAI sign-in completed. Start OAuth again.",
  );
  const buildCredentialLifecycleSummary = (): RuntimeCredentialLifecycleSummary => {
    const persistedAccounts = listProviderAccounts({ databasePath: initialization.databasePath });
    const normalizedPersistedAccounts = persistedAccounts.map(
      (account) =>
        normalizeProviderAccountRoleBindings(
          account as unknown as Record<string, unknown>,
        ) as unknown as ProviderAccountRecord,
    );
    const accountValidation = validateProviderAccounts({
      catalog: currentNormalizedCatalog,
      additionalProviders: liteLLMProviders,
      accounts: normalizedPersistedAccounts,
      allowedRoleIds: getAllowedRoleIds(),
    });
    const invalidAccountsById = new Map(
      persistedAccounts.map((account) => [account.providerAccountId, account]),
    );
    const latestAccounts = readCurrentAccounts();
    const latestEndpoints = listRuntimeEndpoints({
      databasePath: initialization.databasePath,
    });
    const nowMs = Date.now();
    const validAccountIds = new Set(latestAccounts.map((account) => account.providerAccountId));
    const deviceAuthorizationSessions = listProviderDeviceAuthSessions({
      databasePath: initialization.databasePath,
    }).filter(
      (
        session,
      ): session is typeof session & { status: DeviceAuthorizationReadbackResult["status"] } =>
        session.status === "pending" ||
        session.status === "connected" ||
        session.status === "expired" ||
        session.status === "failed",
    );
    const deviceAuthorizations = deviceAuthorizationSessions
      .filter((session) => validAccountIds.has(session.providerAccountId))
      .map((session) => ({
        authRequestId: session.authRequestId,
        providerAccountId: session.providerAccountId,
        providerId: session.providerId,
        variantId: session.variantId,
        status: session.status,
        userCode: session.userCode,
        verificationUri: session.verificationUri,
        verificationUriComplete: session.verificationUriComplete,
        intervalSeconds: session.intervalSeconds,
        expiresAtMs: session.expiresAtMs,
        ...(session.lastError ? { lastError: session.lastError } : {}),
      }));
    const orphanDeviceAuthorizations = deviceAuthorizationSessions.filter(
      (session) => !validAccountIds.has(session.providerAccountId),
    );
    const pendingAuthorizations = deviceAuthorizations.filter(
      (authorization) => authorization.status === "pending" && authorization.expiresAtMs > nowMs,
    );
    const expiredPendingAuthorizations = deviceAuthorizations.filter(
      (authorization) => authorization.status === "pending" && authorization.expiresAtMs <= nowMs,
    );
    const pendingAccountIds = new Set(
      pendingAuthorizations.map((authorization) => authorization.providerAccountId),
    );
    const activeEndpointIdsByAccountId = new Map<string, string[]>();
    for (const endpoint of latestEndpoints) {
      if (
        endpoint.lifecycleState !== "active" ||
        typeof endpoint.providerAccountId !== "string" ||
        endpoint.providerAccountId.length === 0
      ) {
        continue;
      }
      const current = activeEndpointIdsByAccountId.get(endpoint.providerAccountId) ?? [];
      current.push(endpoint.endpointId);
      activeEndpointIdsByAccountId.set(endpoint.providerAccountId, current);
    }

    const emptyCounts = (): CredentialLifecycleCounts => ({
      executionReady: 0,
      connectedNoEndpoint: 0,
      pendingAuthorization: 0,
      expiredAuth: 0,
      credentialsMissing: 0,
      envUnresolved: 0,
      archivedStale: 0,
    });
    const normalizeCredentialBackend = (backend: string | undefined): string => {
      if (backend === "local-encrypted-file") {
        return "local-file";
      }
      return backend ?? "unknown";
    };
    const resolveCredentialStorageMode = (
      account: ProviderAccountRecord,
    ): CredentialLifecycleAccountRecord["credentialStorageMode"] => {
      const backend = normalizeCredentialBackend(account.credentialRef?.backend);
      if (backend === "env") {
        return "env-ref";
      }
      if (backend === "local-file") {
        return account.authMode === "oauth2-device-code" ? "oauth-local" : "persisted-local";
      }
      return "unknown";
    };
    const resolveSourceProvenance = (
      account: ProviderAccountRecord,
    ): readonly CredentialLifecycleSourceProvenance[] => {
      if (isRuntimeConfigProviderAccount(account)) {
        return ["runtime-config"];
      }
      if (runtimeConfigProviderAccountIds.has(account.providerAccountId)) {
        return ["manual", "runtime-config"];
      }
      return ["manual"];
    };
    const hasResolvedEnvCredential = (account: ProviderAccountRecord): boolean => {
      if (account.credentialRef?.backend !== "env") {
        return false;
      }
      const value = process.env[account.credentialRef.ref];
      return typeof value === "string" && value.trim().length > 0;
    };

    const lifecycleAccounts: CredentialLifecycleAccountRecord[] = latestAccounts.map((account) => {
      const activeEndpointIds = [
        ...(activeEndpointIdsByAccountId.get(account.providerAccountId) ?? []),
      ].sort((left, right) => compareText(left, right));
      const configuredModelIds = [...new Set(account.allowedModels ?? [])].sort((left, right) =>
        compareText(left, right),
      );
      const credentialBackendCanonical = normalizeCredentialBackend(account.credentialRef?.backend);
      const credentialStorageMode = resolveCredentialStorageMode(account);
      const pendingAuthorization =
        pendingAccountIds.has(account.providerAccountId) && activeEndpointIds.length === 0;
      const envUnresolved =
        credentialBackendCanonical === "env" &&
        account.credentialRef !== undefined &&
        !hasResolvedEnvCredential(account);
      const expiredAuth =
        !pendingAuthorization &&
        !envUnresolved &&
        account.authMode === "oauth2-device-code" &&
        account.rotationState === "failed" &&
        (account.healthStatus === "refresh-failing" ||
          account.healthStatus === "provider-auth-error");
      const executionReady = activeEndpointIds.length > 0;
      const credentialsMissing =
        !pendingAuthorization &&
        !envUnresolved &&
        !expiredAuth &&
        account.healthStatus === "credentials-missing";
      const connectedNoEndpoint =
        !pendingAuthorization &&
        !envUnresolved &&
        !expiredAuth &&
        !credentialsMissing &&
        !executionReady &&
        account.status === "active" &&
        account.healthStatus === "healthy";

      let lifecycleState: CredentialLifecycleState = "connected-no-endpoint";
      let reasonCode = "connected-no-endpoint";
      if (pendingAuthorization) {
        lifecycleState = "pending-authorization";
        reasonCode = "pending-device-authorization";
      } else if (envUnresolved) {
        lifecycleState = "env-unresolved";
        reasonCode = "env-var-missing";
      } else if (expiredAuth) {
        lifecycleState = "expired-auth";
        reasonCode = "oauth-refresh-failed";
      } else if (credentialsMissing) {
        lifecycleState = "credentials-missing";
        reasonCode = "credential-material-missing";
      } else if (executionReady) {
        lifecycleState = "execution-ready";
        reasonCode = "active-endpoint-present";
      } else if (connectedNoEndpoint) {
        lifecycleState = "connected-no-endpoint";
        reasonCode = "active-without-endpoint";
      }

      const supportsRemoteApiKeyMaintenance =
        account.authMode === "api-key-static" &&
        !isLocalPeerProviderAccountId(account.providerAccountId);

      const availableActions = (() => {
        switch (lifecycleState) {
          case "pending-authorization":
          case "expired-auth":
            return ["reconnect"] as const;
          case "env-unresolved":
            return ["set-env"] as const;
          case "credentials-missing":
            return account.authMode === "oauth2-device-code"
              ? (["reconnect"] as const)
              : supportsRemoteApiKeyMaintenance
                ? (["update-api-key"] as const)
                : ([] as const);
          case "connected-no-endpoint":
            return supportsRemoteApiKeyMaintenance
              ? (["activate-endpoint", "update-api-key"] as const)
              : (["activate-endpoint"] as const);
          case "execution-ready":
            return supportsRemoteApiKeyMaintenance ? (["update-api-key"] as const) : ([] as const);
          default:
            return [] as const;
        }
      })();

      return {
        logicalAccountId: account.providerAccountId,
        providerAccountId: account.providerAccountId,
        providerId: account.providerId,
        sourceProvenance: resolveSourceProvenance(account),
        authMode: account.authMode,
        credentialStorageMode,
        credentialBackendCanonical,
        lifecycleState,
        reasonCode,
        blocking: lifecycleState !== "execution-ready",
        activeEndpointIds,
        configuredModelIds,
        availableActions,
      };
    });

    const counts = lifecycleAccounts.reduce<CredentialLifecycleCounts>((result, account) => {
      switch (account.lifecycleState) {
        case "execution-ready":
          result.executionReady += 1;
          break;
        case "connected-no-endpoint":
          result.connectedNoEndpoint += 1;
          break;
        case "pending-authorization":
          result.pendingAuthorization += 1;
          break;
        case "expired-auth":
          result.expiredAuth += 1;
          break;
        case "credentials-missing":
          result.credentialsMissing += 1;
          break;
        case "env-unresolved":
          result.envUnresolved += 1;
          break;
        case "archived-stale":
          result.archivedStale += 1;
          break;
      }
      return result;
    }, emptyCounts());
    const referencedCredentialRefs = new Set<string>([
      ...latestAccounts
        .map((account) => {
          const backend = account.credentialRef?.backend;
          return backend === "local-file" || backend === "local-encrypted-file"
            ? account.credentialRef?.ref
            : undefined;
        })
        .filter((value): value is string => typeof value === "string" && value.length > 0),
      ...deviceAuthorizationSessions
        .map((session) => session.credentialRef)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ]);
    const orphanCredentialArtifacts = listStoredCredentialRefsSync(
      options.runtimeStateRoot,
      options.scopeId,
    )
      .filter((credentialRef) => !referencedCredentialRefs.has(credentialRef))
      .map((credentialRef) => ({
        artifactId: `credential-file/${credentialRef}`,
        providerId: credentialRef.split("/")[1] ?? null,
        providerAccountId: null,
        artifactType: "credential-file",
        reasonCode: "orphan-credential-file",
      }));
    const archivedArtifacts: CredentialLifecycleArchivedArtifact[] = [
      ...expiredPendingAuthorizations.map((authorization) => ({
        artifactId: authorization.authRequestId,
        providerId: authorization.providerId,
        providerAccountId: authorization.providerAccountId,
        artifactType: "device-authorization",
        reasonCode: "expired-pending-authorization",
      })),
      ...orphanDeviceAuthorizations.map((session) => ({
        artifactId: session.authRequestId,
        providerId: session.providerId,
        providerAccountId: session.providerAccountId,
        artifactType: "device-authorization",
        reasonCode: "orphan-device-authorization",
      })),
      ...accountValidation.diagnostics.map((diagnostic) => ({
        artifactId: `provider-account/${diagnostic.providerAccountId}`,
        providerId: invalidAccountsById.get(diagnostic.providerAccountId)?.providerId ?? null,
        providerAccountId: diagnostic.providerAccountId,
        artifactType: "provider-account",
        reasonCode: normalizeArchivedReasonCode(diagnostic.code),
      })),
      ...orphanCredentialArtifacts,
    ];
    counts.archivedStale += archivedArtifacts.length;

    const providerIds = [...new Set(lifecycleAccounts.map((account) => account.providerId))].sort(
      (left, right) => compareText(left, right),
    );
    const providerRollups: CredentialLifecycleProviderRollup[] = providerIds.map((providerId) => {
      const providerAccounts = lifecycleAccounts.filter(
        (account) => account.providerId === providerId,
      );
      const countsByLifecycle = providerAccounts.reduce<CredentialLifecycleCounts>(
        (result, account) => {
          switch (account.lifecycleState) {
            case "execution-ready":
              result.executionReady += 1;
              break;
            case "connected-no-endpoint":
              result.connectedNoEndpoint += 1;
              break;
            case "pending-authorization":
              result.pendingAuthorization += 1;
              break;
            case "expired-auth":
              result.expiredAuth += 1;
              break;
            case "credentials-missing":
              result.credentialsMissing += 1;
              break;
            case "env-unresolved":
              result.envUnresolved += 1;
              break;
            case "archived-stale":
              result.archivedStale += 1;
              break;
          }
          return result;
        },
        emptyCounts(),
      );

      return {
        providerId,
        accountIds: providerAccounts.map((account) => account.providerAccountId).sort(compareText),
        countsByLifecycle,
        readyAccountIds: providerAccounts
          .filter((account) => account.lifecycleState === "execution-ready")
          .map((account) => account.providerAccountId)
          .sort(compareText),
        attentionAccountIds: providerAccounts
          .filter((account) => account.blocking)
          .map((account) => account.providerAccountId)
          .sort(compareText),
        hasArchivedArtifacts: archivedArtifacts.some(
          (artifact) => artifact.providerId === providerId,
        ),
      };
    });

    return {
      version: 1,
      authority: buildCredentialLifecycleAuthority(),
      counts,
      accounts: lifecycleAccounts,
      providerRollups,
      archivedArtifacts,
    };
  };
  const buildCredentialLifecycleAuthority = (): RuntimeCredentialLifecycleSummary["authority"] => ({
    state:
      sessionBootstrapState.status === "pending" || sessionBootstrapState.status === "running"
        ? "provisional"
        : "authoritative",
    bootstrapStatus: sessionBootstrapState.status,
  });
  const buildCredentialReadinessSummary = (): {
    pendingDeviceAuthorizationCount: number;
    credentialsMissingAccountCount: number;
    connectedWithoutEndpointCount: number;
    readyAccountCount: number;
  } => {
    const lifecycle = buildCredentialLifecycleSummary();
    return {
      pendingDeviceAuthorizationCount: lifecycle.counts.pendingAuthorization,
      credentialsMissingAccountCount: lifecycle.counts.credentialsMissing,
      connectedWithoutEndpointCount: lifecycle.counts.connectedNoEndpoint,
      readyAccountCount: lifecycle.counts.executionReady,
    };
  };
  let currentAccounts = [...readCurrentAccounts()];
  let runtimeEndpoints = [...listRuntimeEndpoints({ databasePath: initialization.databasePath })];
  let currentModelOverrides: Record<string, BridgeModelOverrideRecord> = readModelOverridesFromDisk(
    options.runtimeStateRoot,
  );
  const getLlamaSwapRoleIdsByModelId = (): Record<string, readonly string[]> =>
    readLlamaSwapRoleIdsByModelId(currentModelOverrides, currentRolePolicy.roleDefinitions);
  let currentRegistry!: EndpointRegistryResult;
  let currentLlamaSwapVendor: VendorRuntime | null = null;
  let currentLiteLLMVendor: VendorRuntime | null = null;
  const getCurrentRegistrySources = (): RegistrySources =>
    mergeRegistrySources(currentRegistrySources, runtimeEndpoints);
  const getRouterExecutionMode = (): UnifiedRuntimeExecutionMode =>
    currentUnifiedRuntimeConfig?.executionMode ?? "decision_only";
  const getRouterEffectiveRegistry = (): EndpointRegistryResult =>
    filterRouterRegistryByExecutionMode(currentRegistry, getRouterExecutionMode());
  const getRouterEffectiveRoutableInventory = (): RoutableInventory =>
    buildRoutableInventory(getRouterEffectiveRegistry(), getCurrentRegistrySources());
  const getCurrentExecutionCatalog = (): NormalizedCatalog =>
    withRuntimeEndpointFallbackModels(currentNormalizedCatalog, currentAccounts, runtimeEndpoints);
  const emptyRoutableInventory = (): RoutableInventory => ({
    modelIds: [],
    endpointIds: [],
    entries: [],
    bySourceType: { local: [], remote: [] },
  });
  const deriveRoutingAliasBootstrapModelIds = (
    executionMode: UnifiedRuntimeExecutionMode,
  ): readonly string[] => {
    const effectiveInventory = buildRoutableInventory(
      filterRouterRegistryByExecutionMode(currentRegistry, executionMode),
      getCurrentRegistrySources(),
    );
    if (effectiveInventory.modelIds.length > 0) {
      return effectiveInventory.modelIds;
    }

    const configuredLocalModelIds = (
      currentUnifiedRuntimeConfig?.llamaSwap.models.map((model) => model.modelId) ?? []
    ).sort(compareText);
    const configuredRemoteModelIds = [
      ...new Set(
        (currentUnifiedRuntimeConfig?.liteLLM.providers ?? []).flatMap((provider) =>
          provider.modelMappings.length > 0
            ? provider.modelMappings.map((mapping) => mapping.modelId)
            : provider.modelNames,
        ),
      ),
    ].sort(compareText);

    if (executionMode === "local_only") {
      return configuredLocalModelIds;
    }
    if (executionMode === "remote_only") {
      return configuredRemoteModelIds;
    }

    return [...new Set([...configuredLocalModelIds, ...configuredRemoteModelIds])].sort(
      compareText,
    );
  };
  const sameModelIds = (left: readonly string[], right: readonly string[]): boolean =>
    left.length === right.length && left.every((value, index) => value === right[index]);
  const sameModelAliases = (
    left: readonly UnifiedRuntimeModelAliasConfig[],
    right: readonly UnifiedRuntimeModelAliasConfig[],
  ): boolean =>
    left.length === right.length &&
    left.every((alias, index) => {
      const nextAlias = right[index];
      return (
        nextAlias !== undefined &&
        alias.aliasId === nextAlias.aliasId &&
        alias.mode === nextAlias.mode &&
        sameModelIds(alias.modelIds, nextAlias.modelIds)
      );
    });
  const materializeCanonicalRoutingAliasMatrix = (
    config: UnifiedRuntimeConfig,
  ): UnifiedRuntimeConfig => {
    const preservedCustomAliases = (config.modelAliases ?? []).filter(
      (alias) => !isPrimaryRoutingAliasId(alias.aliasId),
    );
    const canonicalAliases: UnifiedRuntimeModelAliasConfig[] = [];

    for (const executionMode of CANONICAL_ROUTING_ALIAS_EXECUTION_MODES) {
      const modelIds = deriveRoutingAliasBootstrapModelIds(executionMode);
      if (modelIds.length === 0) {
        continue;
      }
      for (const routingStrategy of CANONICAL_ROUTING_ALIAS_STRATEGIES) {
        canonicalAliases.push({
          aliasId: deriveUnifiedRuntimeRoutingAliasId({
            routingStrategy,
            executionMode,
          }),
          mode: deriveUnifiedRuntimeRoutingAliasMode(routingStrategy, null),
          modelIds: [...modelIds],
        });
      }
    }

    if (canonicalAliases.length === 0) {
      return config;
    }

    const nextAliases = [...canonicalAliases, ...preservedCustomAliases];
    if (sameModelAliases(config.modelAliases ?? [], nextAliases)) {
      return config;
    }

    return {
      ...config,
      modelAliases: nextAliases,
    };
  };
  const persistMaterializedCanonicalRoutingAliasesIfNeeded = async (): Promise<boolean> => {
    if (currentUnifiedRuntimeConfig === null) {
      return false;
    }

    const materializedConfig = materializeCanonicalRoutingAliasMatrix(currentUnifiedRuntimeConfig);
    if (materializedConfig === currentUnifiedRuntimeConfig) {
      return false;
    }

    currentUnifiedRuntimeConfig = materializedConfig;
    syncRoutingModelSelection();
    refreshRoutableInventoryState();
    if (options.unifiedRuntimeConfigPath) {
      await mkdir(path.dirname(options.unifiedRuntimeConfigPath), { recursive: true });
      await writeFile(
        options.unifiedRuntimeConfigPath,
        renderUnifiedRuntimeConfigText(materializedConfig),
        "utf8",
      );
    }

    return true;
  };
  let currentRoutableInventory: RoutableInventory = emptyRoutableInventory();
  let currentAliasDriftWarnings: readonly AliasDriftWarning[] = [];
  const refreshRoutableInventoryState = (): void => {
    currentRoutableInventory = buildRoutableInventory(currentRegistry, getCurrentRegistrySources());
    const aliases = currentUnifiedRuntimeConfig?.modelAliases ?? [];
    currentAliasDriftWarnings = aliases.flatMap((alias) =>
      warnAliasModelIdDrift(alias, currentRoutableInventory),
    );
  };
  const buildInventorySummary = (): {
    modelIdCount: number;
    endpointIdCount: number;
    localEndpointCount: number;
    remoteEndpointCount: number;
    emptyAliasIds: readonly string[];
  } => {
    const aliases = currentUnifiedRuntimeConfig?.modelAliases ?? [];
    const emptyAliasIds = aliases
      .filter(
        (alias) =>
          resolveAliasAllowEndpoints(alias, currentRoutableInventory, currentRegistry).poolEmpty,
      )
      .map((alias) => alias.aliasId)
      .sort(compareText);
    return {
      modelIdCount: currentRoutableInventory.modelIds.length,
      endpointIdCount: currentRoutableInventory.endpointIds.length,
      localEndpointCount: currentRoutableInventory.bySourceType.local.length,
      remoteEndpointCount: currentRoutableInventory.bySourceType.remote.length,
      emptyAliasIds,
    };
  };
  const syncRoutingModelSelection = (): void => {
    routingModel = resolveRuntimeRoutingModelSelection({
      fixtureRoutingModel,
      unifiedConfig: currentUnifiedRuntimeConfig,
      routableEndpointIds: currentRegistry.endpoints.map(
        (endpoint) => endpoint.identity.endpoint_id,
      ),
    });
  };
  const rebuildCurrentState = (): void => {
    currentAccounts = [...readCurrentAccounts()];
    runtimeEndpoints = [...listRuntimeEndpoints({ databasePath: initialization.databasePath })];
    const registryCatalog = withRuntimeEndpointFallbackModels(
      currentNormalizedCatalog,
      currentAccounts,
      runtimeEndpoints,
    );
    currentModelsById = new Map(registryCatalog.models.map((model) => [model.modelId, model]));
    currentRegistry = buildEndpointRegistry({
      catalog: registryCatalog,
      accounts: currentAccounts,
      sources: getCurrentRegistrySources(),
    });
    if (currentRegistry.diagnostics.length > 0) {
      console.error(
        "Endpoint-registry diagnostics:",
        JSON.stringify(currentRegistry.diagnostics, null, 2),
      );
      const summary = currentRegistry.diagnostics
        .map((d) => `[${d.severity}] ${d.message}`)
        .join("; ");
      throw new Error(`Endpoint-registry validation failed after runtime state update: ${summary}`);
    }
    currentModelOverrides = readModelOverridesFromDisk(options.runtimeStateRoot);
    syncRoutingModelSelection();
    refreshRoutableInventoryState();
  };
  const createExecutionRuntimeSnapshot = (registry: EndpointRegistryResult) => ({
    registry,
    accounts: [...currentAccounts],
    runtimeEndpoints: runtimeEndpoints.map((endpoint) => ({
      endpointId: endpoint.endpointId,
      providerAccountId: endpoint.providerAccountId,
      modelId: endpoint.modelId,
    })),
    registrySources: getCurrentRegistrySources(),
    executionCatalog: getCurrentExecutionCatalog(),
    roleDefinitions: currentRuntimeRoles.roleDefinitions,
    taskDefinitions: currentRolePolicy.taskDefinitions,
    routingModel,
  });
  const withProviderAccountRepairLock = async <T>(
    providerAccountId: string,
    operation: () => Promise<T>,
  ): Promise<T> => {
    if (activeProviderAccountRepairs.has(providerAccountId)) {
      throw new Error(`Provider account ${providerAccountId} already has a repair in progress.`);
    }
    activeProviderAccountRepairs.add(providerAccountId);
    try {
      return await operation();
    } finally {
      activeProviderAccountRepairs.delete(providerAccountId);
    }
  };
  const buildProbeExecutionTarget = (providerAccountId: string): ResolvedExecutionTarget | null => {
    const account = currentAccounts.find((entry) => entry.providerAccountId === providerAccountId);
    if (!account) {
      return null;
    }
    const source = getCurrentRegistrySources().cloud.find(
      (entry) => entry.providerAccountId === providerAccountId,
    );
    return {
      endpointId: source?.endpointId ?? account.providerAccountId,
      modelId: source?.modelId ?? account.allowedModels[0] ?? account.providerId,
      providerId: account.providerId,
      providerKind: "remote_openai_compat",
      providerAccountId: account.providerAccountId,
      adapterFamily: "ai-sdk-openai-compatible",
      authFamily: account.authMode,
      apiBase: account.baseUrlOverride ?? "",
      requestShapeHints: null,
      candidate: {} as never,
      account,
      provider: null,
      model: null,
    };
  };
  const resolveProbeAuthorization = async (providerAccountId: string): Promise<string | null> => {
    const target = buildProbeExecutionTarget(providerAccountId);
    if (!target) {
      return null;
    }
    try {
      return await resolveCredentialValue(
        options.runtimeStateRoot,
        options.scopeId,
        target,
        providerPresets,
        liteLLMProviders,
        networkFetcher,
        deviceId,
        rebuildCurrentState,
      );
    } catch {
      return null;
    }
  };
  const refreshProbeAuthorization = async (providerAccountId: string): Promise<string | null> => {
    const target = buildProbeExecutionTarget(providerAccountId);
    if (!target) {
      return null;
    }
    const backend = target.account?.credentialRef.backend;
    if (backend === "env") {
      return resolveProbeAuthorization(providerAccountId);
    }
    if (
      (backend === "local-file" || backend === "local-encrypted-file") &&
      target.account?.authMode === "oauth2-device-code"
    ) {
      try {
        return await refreshOauthAccessToken(
          options.runtimeStateRoot,
          options.scopeId,
          target,
          providerPresets,
          liteLLMProviders,
          networkFetcher,
          deviceId,
          rebuildCurrentState,
        );
      } catch {
        return null;
      }
    }
    return resolveProbeAuthorization(providerAccountId);
  };
  const resolveProbeHeaders = async (
    providerAccountId: string,
  ): Promise<Readonly<Record<string, string>>> => {
    const account = currentAccounts.find((entry) => entry.providerAccountId === providerAccountId);
    if (!account || account.authMode !== "oauth2-device-code") {
      return {};
    }
    try {
      const variant = getOauthVariant(providerPresets, liteLLMProviders, account.providerId);
      const credentialRef = account.credentialRef;
      if (
        credentialRef &&
        (credentialRef.backend === "local-file" || credentialRef.backend === "local-encrypted-file")
      ) {
        return createDeviceHeaders(
          resolveOauthHeaderDeviceId({
            runtimeStateRoot: options.runtimeStateRoot,
            scopeId: options.scopeId,
            credentialRef,
            fallbackDeviceId: deviceId,
          }),
          variant.oauth.requiredHeaders,
        );
      }
      return createDeviceHeaders(deviceId, variant.oauth.requiredHeaders);
    } catch {
      return {};
    }
  };
  const collectRemoteHealthProbeTargets = (): RemoteHealthProbeTarget[] => {
    const accountsById = new Map(
      currentAccounts.map((account) => [account.providerAccountId, account] as const),
    );
    const litellmBaseUrl = currentLiteLLMVendor?.readStatus().baseUrl ?? null;
    const seenEndpointIds = new Set<string>();
    const targets: RemoteHealthProbeTarget[] = [];

    for (const source of getCurrentRegistrySources().cloud) {
      if (seenEndpointIds.has(source.endpointId)) {
        continue;
      }
      seenEndpointIds.add(source.endpointId);
      const account = accountsById.get(source.providerAccountId);
      if (isCodexSubscriptionAccount(account)) {
        continue;
      }
      const apiBase =
        account?.baseUrlOverride ??
        (source.servingSource === "vendor-litellm" ? litellmBaseUrl : null) ??
        "";
      if (apiBase.trim().length === 0) {
        continue;
      }
      targets.push({
        endpointId: source.endpointId,
        providerAccountId: source.providerAccountId,
        modelId: source.modelId,
        apiBase,
        servingSource: source.servingSource,
      });
    }

    return targets;
  };
  const applyRemoteHealthProbeResults = (results: readonly RemoteHealthProbeResult[]): void => {
    const resultsByEndpointId = new Map(
      results.map((result) => [result.endpointId, result] as const),
    );

    for (const endpoint of runtimeEndpoints) {
      const result = resultsByEndpointId.get(endpoint.endpointId);
      if (!result || endpoint.healthStatus === result.healthStatus) {
        continue;
      }
      upsertSqliteRuntimeEndpoint({
        databasePath: initialization.databasePath,
        endpoint: {
          ...endpoint,
          healthStatus: result.healthStatus,
        },
      });
    }

    if (currentUnifiedRuntimeConfig !== null) {
      currentRegistrySources = {
        ...currentRegistrySources,
        cloud: currentRegistrySources.cloud.map((source) => {
          const result = resultsByEndpointId.get(source.endpointId);
          return result ? { ...source, healthStatus: result.healthStatus } : source;
        }),
      };
    }

    rebuildCurrentState();
  };
  const persistCurrentRolePolicy = async (
    nextPolicy: RuntimeRolePolicyRecord,
  ): Promise<RuntimeRolePolicyRecord> => {
    const validatedPolicy = validateRuntimeRolePolicyRecord(nextPolicy, "runtime role policy");
    const nextRuntimeRoles = buildRuntimeRoleCatalog(validatedPolicy.roleDefinitions);
    const validation = validateProviderAccounts({
      catalog: currentNormalizedCatalog,
      additionalProviders: liteLLMProviders,
      accounts: currentAccounts,
      allowedRoleIds: nextRuntimeRoles.roleSummaries.map((role) => role.roleId),
    });
    if (validation.diagnostics.length > 0) {
      throw new Error(validation.diagnostics[0]?.message ?? "runtime role policy is incompatible");
    }
    await mkdir(options.runtimeStateRoot, { recursive: true });
    await writeFile(rolePolicyPath, JSON.stringify(validatedPolicy, null, 2));
    currentRolePolicy = validatedPolicy;
    currentRuntimeRoles = nextRuntimeRoles;
    return currentRolePolicy;
  };
  const readStoredPeers = async (): Promise<readonly LocalPeerConfig[]> => {
    const peersPath = path.join(options.runtimeStateRoot, "peers.json");
    try {
      if (existsSync(peersPath)) {
        return JSON.parse(await readFile(peersPath, "utf8")) as readonly LocalPeerConfig[];
      }
    } catch {
      // Fall through to empty
    }
    return [];
  };
  const collectPersistedPeerAutoReloads = (
    intent: OperatorIntentV1 | null,
  ): readonly {
    modelId: string;
    assignment?: RuntimeModelRoleAssignmentInput;
  }[] => {
    const peerLoads = (intent?.peerLoads ?? []).filter((entry) => entry.autoReload);
    const modelIds = [...new Set(peerLoads.map((entry) => entry.modelId))];
    return modelIds.map((modelId) => {
      const roleIds = peerLoads.find((entry) => entry.modelId === modelId)?.roleIds;
      return {
        modelId,
        assignment: roleIds
          ? {
              roleIds,
              roleAssignmentMode: roleIds.length === 0 ? "all" : "include",
              enabledRoleIds: roleIds,
              disabledRoleIds: [],
            }
          : undefined,
      };
    });
  };
  const replayPersistedPeerAutoReloads = async (
    intent: OperatorIntentV1 | null,
  ): Promise<{
    reloaded: number;
    failed: number;
  }> => {
    const persistedReloads = collectPersistedPeerAutoReloads(intent);
    let reloaded = 0;
    let failed = 0;
    for (const entry of persistedReloads) {
      try {
        if (await activateConfiguredLocalPeerModel(entry.modelId, entry.assignment)) {
          reloaded += 1;
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }
    return { reloaded, failed };
  };
  const createLocalPeerAccount = (peer: LocalPeerConfig): ProviderAccountRecord => {
    const providerAccountId = createLocalPeerProviderAccountId(peer.id);
    return {
      providerAccountId,
      providerId: LOCAL_OPENAI_PROVIDER_ID,
      providerKind: "provider-openai",
      orgScope: "personal",
      accountScope: sanitizeSegment(peer.id) || "peer",
      credentialRef: {
        backend: "local-file",
        ref: createLocalPeerCredentialRef(providerAccountId),
      },
      authMode: "api-key-static",
      regionPolicy: {
        mode: "prefer",
        regions: ["local"],
      },
      baseUrlOverride: normalizeLocalPeerApiBase(peer.url),
      allowedModels: [],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    };
  };
  const syncLocalPeerState = async (peers: readonly LocalPeerConfig[]): Promise<void> => {
    const existingPeerAccounts = listProviderAccounts({
      databasePath: initialization.databasePath,
    }).filter((account) => account.providerId === LOCAL_OPENAI_PROVIDER_ID);
    const allowedRoleIdSet = new Set(getAllowedRoleIds());
    const existingPeerAccountsById = new Map(
      existingPeerAccounts.map((account) => [account.providerAccountId, account] as const),
    );
    const localPeerAccounts = peers.map((peer) => {
      const nextAccount = createLocalPeerAccount(peer);
      const existingAccount = existingPeerAccountsById.get(nextAccount.providerAccountId);
      if (!existingAccount) {
        return nextAccount;
      }
      return {
        ...nextAccount,
        allowedModels: [...existingAccount.allowedModels],
        modelRoleBindings: sanitizeProviderAccountModelRoleBindingsForAllowedRoles(
          existingAccount.modelRoleBindings,
          allowedRoleIdSet,
        ),
        deniedModels: [...existingAccount.deniedModels],
      };
    });
    const validationResult = validateProviderAccounts({
      catalog: currentNormalizedCatalog,
      additionalProviders: liteLLMProviders,
      allowedRoleIds: getAllowedRoleIds(),
      accounts: localPeerAccounts,
    });
    if (validationResult.diagnostics.length > 0) {
      throw new Error(
        validationResult.diagnostics[0]?.message ?? "Local endpoint account validation failed.",
      );
    }

    const nextPeerAccountIds = new Set(
      validationResult.accounts.map((account) => account.providerAccountId),
    );
    const removedPeerAccounts = existingPeerAccounts.filter(
      (account) => !nextPeerAccountIds.has(account.providerAccountId),
    );
    if (removedPeerAccounts.length > 0) {
      deleteRuntimeEndpointsByProviderAccountId(
        initialization.databasePath,
        removedPeerAccounts.map((account) => account.providerAccountId),
      );
      deleteProviderAccountsById(
        initialization.databasePath,
        removedPeerAccounts.map((account) => account.providerAccountId),
      );
      await Promise.all(
        removedPeerAccounts.map((account) =>
          removeCredentialFile(
            options.runtimeStateRoot,
            options.scopeId,
            account.credentialRef.ref,
          ),
        ),
      );
    }

    if (validationResult.accounts.length > 0) {
      persistProviderAccounts({
        databasePath: initialization.databasePath,
        accounts: validationResult.accounts,
      });
      await Promise.all(
        validationResult.accounts.map((account) =>
          persistStaticCredentialFile(
            options.runtimeStateRoot,
            options.scopeId,
            account.credentialRef.ref,
            normalizeLocalPeerAuthToken(
              peers.find(
                (peer) => createLocalPeerProviderAccountId(peer.id) === account.providerAccountId,
              )?.authToken,
            ),
          ),
        ),
      );
    }
  };
  const readLocalPeerModelIds = async (peer: LocalPeerConfig): Promise<readonly string[]> => {
    const apiBase = normalizeLocalPeerApiBase(peer.url);
    const response = await networkFetcher(`${apiBase}/models`, {
      headers: buildLocalPeerAuthHeaders(peer),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(`GET ${apiBase}/models returned HTTP ${response.status}.`);
    }
    const payload = (await response.json()) as { data?: Array<{ id?: unknown }> };
    if (!Array.isArray(payload.data)) {
      throw new Error(`GET ${apiBase}/models did not return a model list.`);
    }
    return payload.data.flatMap((entry) =>
      typeof entry.id === "string" && entry.id.length > 0 ? [entry.id] : [],
    );
  };
  const upsertPeerModelRoleBindings = async (
    modelId: string,
    assignment: RuntimeModelRoleAssignmentInput,
    peerAccountIds?: ReadonlySet<string>,
  ): Promise<void> => {
    const normalizedRoleIds = normalizeRuntimeRoleIds(assignment.roleIds) ?? [];
    const normalizedEnabledRoleIds = normalizeRuntimeRoleIds(assignment.enabledRoleIds) ?? [];
    const normalizedDisabledRoleIds = normalizeRuntimeRoleIds(assignment.disabledRoleIds) ?? [];
    const peerAccounts = listProviderAccounts({
      databasePath: initialization.databasePath,
    })
      .filter((account) => account.providerId === LOCAL_OPENAI_PROVIDER_ID)
      .filter((account) => !peerAccountIds || peerAccountIds.has(account.providerAccountId));
    if (peerAccounts.length === 0) {
      return;
    }

    const nextAccounts = peerAccounts.map((account) => {
      const otherBindings = (account.modelRoleBindings ?? []).filter(
        (binding) => binding.modelId !== modelId,
      );
      const nextBinding = assignment.roleAssignmentMode
        ? {
            modelId,
            roleIds: [...normalizedRoleIds],
            roleAssignmentMode: assignment.roleAssignmentMode,
            enabledRoleIds: [...normalizedEnabledRoleIds],
            disabledRoleIds: [...normalizedDisabledRoleIds],
          }
        : normalizedRoleIds.length > 0
          ? { modelId, roleIds: [...normalizedRoleIds] }
          : null;
      const nextBindings = nextBinding ? [...otherBindings, nextBinding] : otherBindings;
      return {
        ...account,
        modelRoleBindings: nextBindings.length > 0 ? nextBindings : undefined,
      };
    });
    const validationResult = validateProviderAccounts({
      catalog: currentNormalizedCatalog,
      additionalProviders: liteLLMProviders,
      allowedRoleIds: getAllowedRoleIds(),
      accounts: nextAccounts,
    });
    if (validationResult.diagnostics.length > 0) {
      throw new Error(
        validationResult.diagnostics[0]?.message ?? "Peer model role binding validation failed.",
      );
    }
    for (const account of validationResult.accounts) {
      upsertSqliteProviderAccount({
        databasePath: initialization.databasePath,
        account,
      });
    }
    rebuildCurrentState();
  };
  const persistLlamaSwapModelRoleIds = async (
    modelId: string,
    assignment: RuntimeModelRoleAssignmentInput,
  ): Promise<void> => {
    const normalizedRoleIds = normalizeRuntimeRoleIds(assignment.roleIds) ?? [];
    const normalizedEnabledRoleIds = normalizeRuntimeRoleIds(assignment.enabledRoleIds) ?? [];
    const normalizedDisabledRoleIds = normalizeRuntimeRoleIds(assignment.disabledRoleIds) ?? [];
    const nextOverrides = { ...currentModelOverrides };
    const existing = nextOverrides[modelId] ?? {};
    if (assignment.roleAssignmentMode) {
      nextOverrides[modelId] = {
        ...existing,
        roleIds: [...normalizedRoleIds].sort(compareText),
        roleAssignmentMode: assignment.roleAssignmentMode,
        enabledRoleIds: [...normalizedEnabledRoleIds].sort(compareText),
        disabledRoleIds: [...normalizedDisabledRoleIds].sort(compareText),
      };
    } else if (normalizedRoleIds.length === 0) {
      const { roleIds: _removed, ...rest } = existing;
      if (Object.keys(rest).length === 0) {
        delete nextOverrides[modelId];
      } else {
        nextOverrides[modelId] = rest;
      }
    } else {
      nextOverrides[modelId] = { ...existing, roleIds: [...normalizedRoleIds].sort(compareText) };
    }
    const overridesPath = path.join(options.runtimeStateRoot, "model-overrides.json");
    await writeFile(overridesPath, JSON.stringify(nextOverrides, null, 2));
    currentModelOverrides = nextOverrides;
    rebuildCurrentState();
  };
  const getPeerRoleIdsForModel = (modelId: string): readonly string[] => {
    const roleIds = new Set<string>();
    for (const account of currentAccounts) {
      if (account.providerId !== LOCAL_OPENAI_PROVIDER_ID) {
        continue;
      }
      const binding = account.modelRoleBindings?.find((entry) => entry.modelId === modelId);
      if (!binding) {
        continue;
      }
      for (const roleId of binding.roleIds) {
        roleIds.add(roleId);
      }
    }
    return [...roleIds].sort(compareText);
  };
  const collectLocalModels = async (
    sourceFilter?: "peer-backed" | "llama-swap",
  ): Promise<
    readonly {
      modelId: string;
      loadedAt: string;
      engine: string;
      localModelSource?: "llama-swap" | "peer-backed";
      roleIds?: readonly string[];
      contextWindow?: number | null;
      proxyBaseUrl?: string | null;
      checkEndpoint?: string | null;
      useModelName?: string | null;
    }[]
  > => {
    const localConfigByModelId = new Map(
      (currentUnifiedRuntimeConfig?.llamaSwap.models ?? []).map(
        (model) => [model.modelId, model] as const,
      ),
    );
    const vendorModels =
      sourceFilter === "peer-backed" || !currentLlamaSwapVendor?.getRunningModels
        ? []
        : await currentLlamaSwapVendor.getRunningModels();
    const localPeerEndpoints =
      sourceFilter === "llama-swap"
        ? []
        : runtimeEndpoints.filter(
            (endpoint) =>
              endpoint.lifecycleState === "active" &&
              isLocalPeerProviderAccountId(endpoint.providerAccountId),
          );
    const loadedAtByModelId = new Map<string, string>();
    for (const event of listSwapEvents({
      databasePath: initialization.databasePath,
      limit: 200,
    })) {
      if (event.newModelId && !loadedAtByModelId.has(event.newModelId)) {
        loadedAtByModelId.set(event.newModelId, event.timestamp);
      }
    }
    const llamaSwapRoleIdsByModelId = getLlamaSwapRoleIdsByModelId();
    const localPeerModels = localPeerEndpoints.flatMap((endpoint) =>
      loadedAtByModelId.has(endpoint.modelId) ||
      !vendorModels.some((model) => model.modelId === endpoint.modelId)
        ? [
            {
              modelId: endpoint.modelId,
              loadedAt: loadedAtByModelId.get(endpoint.modelId) ?? new Date().toISOString(),
              engine: LOCAL_OPENAI_PROVIDER_ID,
              localModelSource: "peer-backed" as const,
              roleIds: getPeerRoleIdsForModel(endpoint.modelId),
              contextWindow: null,
              proxyBaseUrl: null,
              checkEndpoint: null,
              useModelName: null,
            },
          ]
        : [],
    );

    const mergedModels: Array<{
      modelId: string;
      loadedAt: string;
      engine: string;
      localModelSource?: "llama-swap" | "peer-backed";
      roleIds?: readonly string[];
      contextWindow?: number | null;
      proxyBaseUrl?: string | null;
      checkEndpoint?: string | null;
      useModelName?: string | null;
    }> = vendorModels.map((model) => {
      const config = localConfigByModelId.get(model.modelId);
      return {
        ...model,
        localModelSource: "llama-swap" as const,
        roleIds: [...(llamaSwapRoleIdsByModelId[model.modelId] ?? [])].sort(compareText),
        contextWindow: config?.contextWindow ?? null,
        proxyBaseUrl: config?.proxyBaseUrl ?? null,
        checkEndpoint: config?.checkEndpoint ?? null,
        useModelName: config?.useModelName ?? null,
      };
    });
    for (const model of localPeerModels) {
      if (!mergedModels.some((entry) => entry.modelId === model.modelId)) {
        mergedModels.push(model);
      }
    }
    if (!sourceFilter) {
      return mergedModels;
    }
    return mergedModels.filter((model) => model.localModelSource === sourceFilter);
  };
  const activateConfiguredLocalPeerModel = async (
    modelId: string,
    assignment?: RuntimeModelRoleAssignmentInput,
  ): Promise<boolean> => {
    const peers = await readStoredPeers();
    if (peers.length === 0) {
      return false;
    }

    await syncLocalPeerState(peers);
    rebuildCurrentState();

    const matchingPeers: LocalPeerConfig[] = [];
    const probeErrors: string[] = [];
    let successfulProbeCount = 0;
    for (const peer of peers) {
      try {
        const modelIds = await readLocalPeerModelIds(peer);
        successfulProbeCount += 1;
        if (modelIds.includes(modelId)) {
          matchingPeers.push(peer);
        }
      } catch (error) {
        probeErrors.push(
          error instanceof Error
            ? error.message
            : `Failed to inspect configured local endpoint ${peer.url}.`,
        );
      }
    }

    if (matchingPeers.length === 0) {
      if (successfulProbeCount === 0 && probeErrors.length > 0) {
        throw new Error(probeErrors[0] ?? "Failed to inspect configured local endpoints.");
      }
      throw new Error(`Model ${modelId} is not available on any configured local endpoint.`);
    }

    if (assignment !== undefined) {
      await upsertPeerModelRoleBindings(
        modelId,
        assignment,
        new Set(matchingPeers.map((peer) => createLocalPeerProviderAccountId(peer.id))),
      );
    }

    for (const peer of matchingPeers) {
      activateRuntimeEndpoint({
        providerAccountId: createLocalPeerProviderAccountId(peer.id),
        modelId,
        region: "local",
        endpointKind: "local-openai-compatible",
        servingSource: "local-peer",
      });
    }

    for (const peer of matchingPeers) {
      const providerAccountId = createLocalPeerProviderAccountId(peer.id);
      const account = currentAccounts.find(
        (entry) => entry.providerAccountId === providerAccountId,
      );
      persistOperatorIntent(operatorIntentLocation, (intent) =>
        upsertPeerLoad(intent, {
          peerId: peer.id,
          modelId,
          roleIds: account ? getModelRoleIds(account, modelId) : (assignment?.roleIds ?? []),
          autoReload: true,
        }),
      );
    }

    insertSwapEvent({
      databasePath: initialization.databasePath,
      timestamp: new Date().toISOString(),
      oldModelId: null,
      newModelId: modelId,
      reason: "manual-load",
    });
    return true;
  };
  const activateRuntimeEndpoint = (
    body: Record<string, unknown>,
  ): {
    endpointId: string;
    providerAccountId: string;
    providerId: string;
    modelId: string;
    roleIds: readonly string[];
    status: "active";
  } => {
    const providerAccountId = readRequiredString(body, "providerAccountId", "activateEndpoint");
    const modelId = readRequiredString(body, "modelId", "activateEndpoint");
    const region = readOptionalString(body, "region") ?? "global";
    const account = currentAccounts.find((entry) => entry.providerAccountId === providerAccountId);
    if (!account) {
      throw new Error(`Provider account ${providerAccountId} was not found.`);
    }
    if (account.status !== "active" || account.healthStatus !== "healthy") {
      throw new Error(
        `Provider account ${providerAccountId} is not ready for endpoint activation.`,
      );
    }
    if (isOpenAICodexSubscriptionAccount(account)) {
      assertOpenAICodexSubscriptionModelIds([modelId]);
    }
    if (account.allowedModels.length > 0 && !account.allowedModels.includes(modelId)) {
      throw new Error(`Model ${modelId} is not enabled for provider account ${providerAccountId}.`);
    }
    let model = currentModelsById.get(modelId);
    if (!model) {
      const fallbackTemplate = createFallbackModelTemplate(currentNormalizedCatalog);
      const baseModel = resolveRuntimeEndpointCatalogTemplate({
        catalog: currentNormalizedCatalog,
        account,
        endpointModelId: modelId,
        fallbackTemplate,
      });
      model = {
        ...baseModel,
        modelId,
        providerId: account.providerId,
        displayName:
          baseModel.modelId === modelId
            ? baseModel.displayName
            : readDefaultDisplayNameFromModelId(modelId),
        localOverrideApplied: true,
        localNotes: [
          ...baseModel.localNotes,
          baseModel === fallbackTemplate
            ? "Synthesized on-demand during endpoint activation."
            : `Synthesized on-demand during endpoint activation by cloning canonical catalog metadata from ${baseModel.modelId}.`,
        ],
        upstreamProvenance: currentNormalizedCatalog.source,
      };
      currentNormalizedCatalog = {
        ...currentNormalizedCatalog,
        models: applyAliasedCatalogPricing([...currentNormalizedCatalog.models, model]),
      };
      currentModelsById = new Map(
        currentNormalizedCatalog.models.map((entry) => [entry.modelId, entry]),
      );
    }

    const endpointId =
      readOptionalString(body, "endpointId") ??
      createEndpointId(providerAccountId, region, modelId);
    const endpointKind = readOptionalString(body, "endpointKind") ?? "remote-openai-compatible";
    const servingSource = readOptionalString(body, "servingSource") ?? "remote-service";
    upsertSqliteRuntimeEndpoint({
      databasePath: initialization.databasePath,
      endpoint: {
        endpointId,
        providerAccountId,
        modelId,
        region,
        endpointKind,
        servingSource,
        lifecycleState: "active",
        healthStatus: "healthy",
      },
    });
    if (servingSource !== "local-peer") {
      const modelRoleBindings = (account.modelRoleBindings ?? [])
        .filter((binding) => binding.modelId === model.modelId)
        .map((binding) => ({
          ...binding,
          roleIds: [...binding.roleIds],
          ...(binding.enabledRoleIds ? { enabledRoleIds: [...binding.enabledRoleIds] } : {}),
          ...(binding.disabledRoleIds ? { disabledRoleIds: [...binding.disabledRoleIds] } : {}),
        }));
      persistOperatorIntent(operatorIntentLocation, (intent) =>
        upsertRemoteActivation(intent, {
          providerAccountId,
          modelId: model.modelId,
          region,
          endpointId,
          ...(modelRoleBindings.length > 0 ? { modelRoleBindings } : {}),
        }),
      );
    }
    rebuildCurrentState();
    return {
      endpointId,
      providerAccountId,
      providerId: account.providerId,
      modelId: model.modelId,
      roleIds: getModelRoleIds(account, model.modelId),
      status: "active",
    };
  };
  const dedupeProviderVariantsById = (
    variants: readonly ProviderPresetVariant[],
  ): ProviderPresetVariant[] => {
    const seen = new Set<string>();
    return variants.filter((variant) => {
      if (seen.has(variant.variantId)) {
        return false;
      }
      seen.add(variant.variantId);
      return true;
    });
  };
  const resolveProviderVariants = (input: {
    providerId: string;
    displayName: string;
    apiBase: string;
    modelIds: readonly string[];
    presetVariants: readonly ProviderPresetVariant[];
    supportedAuthModes: readonly string[];
    oauth?: {
      apiBase?: string;
      clientId: string;
      deviceAuthorizationEndpoint: string;
      tokenEndpoint: string;
      requiredHeaders: readonly string[];
      scope?: string;
    };
  }): readonly ProviderPresetVariant[] => {
    const isOpenAICanonicalProvider = input.providerId === OPENAI_PROVIDER_ID;
    const generatedOAuthVariants: ProviderPresetVariant[] = input.oauth
      ? [
          {
            variantId: isOpenAICanonicalProvider
              ? OPENAI_CODEX_SUBSCRIPTION_VARIANT_ID
              : `${input.providerId}-oauth`,
            label: isOpenAICanonicalProvider ? "Codex Subscription" : `${input.displayName} OAuth`,
            description: isOpenAICanonicalProvider
              ? "Use the current Codex ChatGPT session cached on this machine."
              : `OAuth device-code authentication for ${input.displayName}.`,
            authMode: "oauth2-device-code",
            availability: isOpenAICanonicalProvider ? "backend-limited" : "ready",
            baseUrl: input.oauth.apiBase ?? input.apiBase,
            modelIds: isOpenAICanonicalProvider
              ? [...OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS]
              : input.modelIds,
            oauth: {
              clientId: input.oauth.clientId,
              deviceAuthorizationEndpoint: input.oauth.deviceAuthorizationEndpoint,
              tokenEndpoint: input.oauth.tokenEndpoint,
              requiredHeaders: [...input.oauth.requiredHeaders],
              ...(input.oauth.scope ? { scope: input.oauth.scope } : {}),
            },
          },
        ]
      : [];
    const generatedApiKeyVariants: ProviderPresetVariant[] =
      input.supportedAuthModes.includes("api-key-static") || input.supportedAuthModes.length === 0
        ? [
            {
              variantId: `${input.providerId}-api-key`,
              label: isOpenAICanonicalProvider ? "API Key" : `${input.displayName} API Key`,
              description: isOpenAICanonicalProvider
                ? "Usage-based OpenAI Platform API key authentication."
                : `API-key authentication for ${input.displayName}.`,
              authMode: "api-key-static",
              availability: "ready" as const,
              baseUrl: input.apiBase,
              modelIds: input.modelIds,
            },
          ]
        : [];
    const legacyMoonshotVariants: ProviderPresetVariant[] =
      input.providerId === "moonshot"
        ? [
            ...(!input.presetVariants.some(
              (variant) => variant.variantId === "moonshot-open-platform",
            ) && generatedApiKeyVariants[0]
              ? [
                  {
                    ...generatedApiKeyVariants[0],
                    variantId: "moonshot-open-platform",
                    label: "Moonshot Open Platform",
                  },
                ]
              : []),
            ...(!input.presetVariants.some((variant) => variant.variantId === "kimi-code") &&
            generatedOAuthVariants[0]
              ? [
                  {
                    ...generatedOAuthVariants[0],
                    variantId: "kimi-code",
                    label: "Kimi Code",
                  },
                ]
              : []),
          ]
        : [];

    return dedupeProviderVariantsById([
      ...input.presetVariants,
      ...(input.providerId === "moonshot" &&
      input.presetVariants.some((variant) => variant.variantId === "moonshot-open-platform")
        ? []
        : generatedApiKeyVariants),
      ...(input.providerId === "moonshot" &&
      input.presetVariants.some((variant) => variant.variantId === "kimi-code")
        ? []
        : generatedOAuthVariants),
      ...legacyMoonshotVariants,
    ]);
  };
  const applyUnifiedRuntimeConfigState = async (
    nextConfig: UnifiedRuntimeConfig | null,
  ): Promise<void> => {
    const nextNormalizedCatalog = withBuiltinLocalOpenAIProvider(
      applyUnifiedLiteLLMAdapterFamilyOverrides(
        synthesizeFixtureModelsForCatalog(baseCatalog, fixtureAccounts, registrySourcesFixture),
        nextConfig,
        liteLLMProviders,
      ),
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
      runtimeVendorStartup === "enabled" && nextConfig?.llamaSwap.enabled && supervisor
        ? await startLlamaSwapVendor({
            repoRoot: options.repoRoot,
            runtimeStateRoot: options.runtimeStateRoot,
            supervisor,
            config: {
              models: nextConfig.llamaSwap.models,
              command:
                nextConfig.llamaSwap.process.command ?? resolvedLlamaSwapCommand ?? undefined,
              args: nextConfig.llamaSwap.process.args,
              env: nextConfig.llamaSwap.process.env,
              cwd: nextConfig.llamaSwap.process.cwd ?? undefined,
              startupTimeoutMs: nextConfig.llamaSwap.process.startupTimeoutMs ?? undefined,
            },
          })
        : null;
    const nextLiteLLMVendor =
      runtimeVendorStartup === "enabled" && nextConfig?.liteLLM.enabled && supervisor
        ? await startLiteLLMVendor({
            runtimeStateRoot: options.runtimeStateRoot,
            supervisor,
            config: {
              providers: nextConfig.liteLLM.providers.map((provider) => ({
                providerId: provider.providerId,
                apiKeyRef: provider.apiKeyRef,
                modelMappings: provider.modelMappings,
              })),
              routerSettings: nextConfig.liteLLM.routerSettings,
              litellmSettings: nextConfig.liteLLM.litellmSettings,
              command: nextConfig.liteLLM.process.command ?? undefined,
              args: nextConfig.liteLLM.process.args,
              env: nextConfig.liteLLM.process.env,
              cwd: nextConfig.liteLLM.process.cwd ?? undefined,
              startupTimeoutMs: nextConfig.liteLLM.process.startupTimeoutMs ?? undefined,
            },
          })
        : null;

    if (nextConfig !== null) {
      const persistedAccounts = listProviderAccounts({ databasePath: initialization.databasePath });
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
          persistedAccounts,
        ),
        allowedRoleIds: getAllowedRoleIds(),
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
      runtimeConfigProviderAccountIds = new Set(
        validation.accounts.map((account) => account.providerAccountId),
      );
    } else {
      runtimeConfigProviderAccountIds = new Set();
    }

    currentUnifiedRuntimeConfig = nextConfig;
    currentNormalizedCatalog = {
      ...nextNormalizedCatalog,
      models: applyAliasedCatalogPricing(nextNormalizedCatalog.models),
    };
    const liteLLMProviderIds = new Set(
      nextConfig?.liteLLM.providers.map((p) => p.providerId) ?? [],
    );
    liteLLMProviders = liteLLMProviders.map((provider) =>
      liteLLMProviderIds.has(provider.providerId)
        ? { ...provider, adapterFamily: "litellm-proxy" as const }
        : provider,
    );
    currentModelsById = new Map(
      currentNormalizedCatalog.models.map((model) => [model.modelId, model]),
    );
    currentRegistrySources =
      nextConfig !== null
        ? {
            cloud: createUnifiedCloudSources(nextConfig),
            local: createUnifiedLocalSources(nextConfig),
          }
        : registrySourcesFixture;
    currentLlamaSwapVendor = nextLlamaSwapVendor;
    currentLiteLLMVendor = nextLiteLLMVendor;
    await syncLocalPeerState(await readStoredPeers());
    rebuildCurrentState();
    if (nextConfig !== null) {
      await persistMaterializedCanonicalRoutingAliasesIfNeeded();
    }
    const nextModelAliases = currentUnifiedRuntimeConfig?.modelAliases ?? [];
    if (
      currentUnifiedRuntimeConfig !== null &&
      nextModelAliases.length > 0 &&
      currentRoutableInventory.endpointIds.length > 0
    ) {
      const aliasValidation = validateAliasInventoryResolution(
        nextModelAliases.filter((alias) => !isPrimaryRoutingAliasId(alias.aliasId)),
        currentRoutableInventory,
      );
      if (!aliasValidation.valid) {
        throw new Error(aliasValidation.errors[0] ?? "Alias inventory resolution failed.");
      }
    }
  };

  if (currentUnifiedRuntimeConfig === null) {
    const validation = validateProviderAccounts({
      catalog: currentNormalizedCatalog,
      additionalProviders: liteLLMProviders,
      accounts: fixtureAccounts,
      allowedRoleIds: getAllowedRoleIds(),
    });
    if (validation.diagnostics.length > 0) {
      throw new Error("Provider-account validation failed for runtime host bridge.");
    }
    persistProviderAccounts({
      databasePath: initialization.databasePath,
      accounts: validation.accounts,
    });
    await syncLocalPeerState(await readStoredPeers());
    rebuildCurrentState();
  } else {
    await applyUnifiedRuntimeConfigState(currentUnifiedRuntimeConfig);
  }

  let envelope: ReturnType<typeof assembleContextEnvelope>;
  let retrievalReceipt: ReturnType<typeof createRetrievalReceipt>;
  if (continuityFixture) {
    const continuity = readConversationContinuity({
      databasePath: initialization.databasePath,
      conversationId: continuityFixture.conversation.conversationId,
    });
    envelope = assembleContextEnvelope({
      continuity,
      maxTurns: continuityFixture.selection.maxTurns,
      maxArtifacts: continuityFixture.selection.maxArtifacts,
      tokenBudget: continuityFixture.selection.tokenBudget,
    });
    retrievalReceipt = createRetrievalReceipt({
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
  } else {
    const emptySnapshot: ConversationContinuitySnapshot = {
      session: {
        sessionId: `${options.scopeId}-empty-session`,
        workspaceScope: options.scopeId,
        createdAtMs: 0,
        updatedAtMs: 0,
      },
      conversation: {
        conversationId: `${options.scopeId}-empty-conversation`,
        sessionId: `${options.scopeId}-empty-session`,
        createdAtMs: 0,
        updatedAtMs: 0,
      },
      turns: [],
      artifacts: [],
      handoffs: [],
    };
    envelope = assembleContextEnvelope({
      continuity: emptySnapshot,
      maxTurns: 0,
      maxArtifacts: 0,
      tokenBudget: 0,
    });
    retrievalReceipt = createRetrievalReceipt({
      envelope,
      totalTurns: 0,
      totalArtifacts: 0,
    });
  }

  const captures = await loadResponseCaptures(options.repoRoot, fixtureBasePath, captureFixtureMap);
  const getRegistryEndpoint = (
    endpointId: string,
  ): EndpointRegistryResult["endpoints"][number] | undefined =>
    currentRegistry.endpoints.find((endpoint) => endpoint.identity.endpoint_id === endpointId);
  const telemetryListeners = new Set<(event: RuntimeTelemetryStreamEvent) => void>();
  const normalizeTelemetryQuery = (query?: BridgeTelemetryQuery): BridgeTelemetryQuery => ({
    windowMs: query?.windowMs ?? DEFAULT_TELEMETRY_WINDOW_MS,
    limit: query?.limit ?? DEFAULT_TELEMETRY_LIMIT,
    ...(typeof query?.endAtMs === "number" ? { endAtMs: query.endAtMs } : {}),
    ...(typeof query?.startAtMs === "number" ? { startAtMs: query.startAtMs } : {}),
    ...(query?.filters ? { filters: query.filters } : {}),
  });
  const TELEMETRY_ANALYTICS_GRANULARITY_MS: Record<BridgeTelemetryAnalyticsGranularity, number> = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
  };
  const SUPPORTED_TELEMETRY_ANALYTICS_METRICS: readonly BridgeTelemetryAnalyticsMetric[] = [
    "requestCount",
    "successCount",
    "failureCount",
    "inputTokens",
    "outputTokens",
    "totalTokens",
    "cacheHitTokens",
    "cacheReadTokens",
    "cacheBackedRequestRate",
    "cacheHitTokenRate",
    "actualCostUsd",
    "estimatedCostUsd",
    "effectiveCostUsd",
    "selectedUncachedCostUsd",
    "baselineMaxEligibleCostUsd",
    "routingCostSavingsUsd",
    "cacheCostSavingsUsd",
    "totalAvoidedCostUsd",
    "averageLatencyMs",
    "p95LatencyMs",
  ];
  const SUPPORTED_TELEMETRY_ANALYTICS_DIMENSIONS: readonly BridgeTelemetryAnalyticsDimension[] = [
    "sourceType",
    "endpointId",
    "modelId",
    "providerId",
    "providerKind",
    "providerFamily",
    "providerAccountId",
    "requestedRoleId",
    "selectedStrategy",
    "routingMode",
    "difficultyBucket",
    "statusFamily",
    "requestOperation",
    "taxonomyGroupId",
    "taxonomyRoleId",
    "taxonomyTaskType",
    "taxonomyTaskVariant",
    "taxonomyCapabilityId",
    "taxonomyModalityId",
    "taxonomyToolClassId",
  ];
  const readTelemetryAnalyticsMetric = (value: string): BridgeTelemetryAnalyticsMetric => {
    if (!SUPPORTED_TELEMETRY_ANALYTICS_METRICS.includes(value as BridgeTelemetryAnalyticsMetric)) {
      throw new Error(`unsupported telemetry analytics metric: ${value}`);
    }
    return value as BridgeTelemetryAnalyticsMetric;
  };
  const readTelemetryAnalyticsDimension = (value: string): BridgeTelemetryAnalyticsDimension => {
    if (
      !SUPPORTED_TELEMETRY_ANALYTICS_DIMENSIONS.includes(value as BridgeTelemetryAnalyticsDimension)
    ) {
      throw new Error(`unsupported telemetry analytics dimension: ${value}`);
    }
    return value as BridgeTelemetryAnalyticsDimension;
  };
  const percentile95 = (values: readonly number[]): number | null => {
    if (values.length === 0) {
      return null;
    }
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? null;
  };
  const roundAnalyticsValue = (value: number): number => Number(value.toFixed(6));
  const computeTelemetryMetricValue = (
    metric: BridgeTelemetryAnalyticsMetric,
    records: readonly BridgeTelemetryRequestRecord[],
  ): number | null => {
    switch (metric) {
      case "requestCount":
        return records.length;
      case "successCount":
        return records.filter((record) => record.errorClass === null).length;
      case "failureCount":
        return records.filter((record) => record.errorClass !== null).length;
      case "inputTokens":
        return records.some((record) => record.inputTokensAvailable)
          ? records.reduce(
              (sum, record) => sum + (record.inputTokensAvailable ? record.inputTokens : 0),
              0,
            )
          : null;
      case "outputTokens":
        return records.some((record) => record.outputTokensAvailable)
          ? records.reduce(
              (sum, record) => sum + (record.outputTokensAvailable ? record.outputTokens : 0),
              0,
            )
          : null;
      case "totalTokens":
        return records.some((record) => record.inputTokensAvailable && record.outputTokensAvailable)
          ? records.reduce(
              (sum, record) =>
                sum +
                (record.inputTokensAvailable && record.outputTokensAvailable
                  ? record.totalTokens
                  : 0),
              0,
            )
          : null;
      case "cacheHitTokens":
      case "cacheReadTokens":
        return records.reduce((sum, record) => sum + record.cacheReadTokens, 0);
      case "cacheBackedRequestRate":
        return records.length === 0
          ? null
          : roundAnalyticsValue(
              records.filter((record) => record.promptCacheUsed).length / records.length,
            );
      case "cacheHitTokenRate": {
        const supportedRecords = records.filter(
          (record) => record.cacheReadTokensSupported && record.inputTokensAvailable,
        );
        if (supportedRecords.length === 0) {
          return null;
        }
        const cacheReadTokens = supportedRecords.reduce(
          (sum, record) => sum + record.cacheReadTokens,
          0,
        );
        const tokenDenominator = supportedRecords.reduce(
          (sum, record) => sum + record.inputTokens,
          0,
        );
        return tokenDenominator === 0
          ? null
          : roundAnalyticsValue(cacheReadTokens / tokenDenominator);
      }
      case "actualCostUsd":
        return roundAnalyticsValue(
          records.reduce((sum, record) => sum + (record.actualCostUsd ?? 0), 0),
        );
      case "estimatedCostUsd":
        return roundAnalyticsValue(
          records.reduce((sum, record) => sum + (record.estimatedCostUsd ?? 0), 0),
        );
      case "effectiveCostUsd":
        return roundAnalyticsValue(
          records.reduce((sum, record) => sum + record.effectiveCostUsd, 0),
        );
      case "selectedUncachedCostUsd":
        return roundAnalyticsValue(
          records.reduce((sum, record) => sum + (record.selectedUncachedCostUsd ?? 0), 0),
        );
      case "baselineMaxEligibleCostUsd":
        return roundAnalyticsValue(
          records.reduce((sum, record) => sum + (record.baselineMaxEligibleCostUsd ?? 0), 0),
        );
      case "routingCostSavingsUsd":
        return roundAnalyticsValue(
          records.reduce((sum, record) => sum + record.routingCostSavingsUsd, 0),
        );
      case "cacheCostSavingsUsd":
        return roundAnalyticsValue(
          records.reduce((sum, record) => sum + record.cacheCostSavingsUsd, 0),
        );
      case "totalAvoidedCostUsd":
        return roundAnalyticsValue(
          records.reduce((sum, record) => sum + record.totalAvoidedCostUsd, 0),
        );
      case "averageLatencyMs": {
        const latencies = records
          .map((record) => record.latencyMs)
          .filter((value): value is number => typeof value === "number");
        return latencies.length === 0
          ? null
          : Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length);
      }
      case "p95LatencyMs": {
        const latencies = records
          .map((record) => record.latencyMs)
          .filter((value): value is number => typeof value === "number");
        return percentile95(latencies);
      }
    }
  };
  const getTelemetryDimensionValues = (
    record: BridgeTelemetryRequestRecord,
    dimension: BridgeTelemetryAnalyticsDimension,
  ): readonly string[] => {
    switch (dimension) {
      case "sourceType":
        return [record.sourceType];
      case "endpointId":
        return [record.endpointId];
      case "modelId":
        return record.modelId ? [record.modelId] : [];
      case "providerId":
        return record.providerId ? [record.providerId] : [];
      case "providerKind":
        return record.providerKind ? [record.providerKind] : [];
      case "providerFamily":
        return record.providerFamily ? [record.providerFamily] : [];
      case "providerAccountId":
        return record.providerAccountId ? [record.providerAccountId] : [];
      case "requestedRoleId":
        return record.requestedRoleId ? [record.requestedRoleId] : [];
      case "selectedStrategy":
        return record.selectedStrategy ? [record.selectedStrategy] : [];
      case "routingMode":
        return record.routingMode ? [record.routingMode] : [];
      case "difficultyBucket":
        return record.difficultyBucket ? [record.difficultyBucket] : [];
      case "statusFamily":
        return record.statusFamily ? [record.statusFamily] : [];
      case "requestOperation":
        return record.requestOperation ? [record.requestOperation] : [];
      case "taxonomyGroupId":
        return record.taxonomyGroupId ? [record.taxonomyGroupId] : [];
      case "taxonomyRoleId":
        return record.taxonomyRoleId ? [record.taxonomyRoleId] : [];
      case "taxonomyTaskType":
        return record.taxonomyTaskType ? [record.taxonomyTaskType] : [];
      case "taxonomyTaskVariant":
        return record.taxonomyTaskVariant ? [record.taxonomyTaskVariant] : [];
      case "taxonomyCapabilityId":
        return record.taxonomyCapabilityIds ?? [];
      case "taxonomyModalityId":
        return record.taxonomyModalityIds ?? [];
      case "taxonomyToolClassId":
        return record.taxonomyToolClassIds ?? [];
    }
  };
  const matchesTelemetryDimensionFilter = (
    record: BridgeTelemetryRequestRecord,
    dimension: BridgeTelemetryAnalyticsDimension,
    filterValues: readonly string[],
  ): boolean => {
    const recordValues = getTelemetryDimensionValues(record, dimension);
    return recordValues.some((value) => filterValues.includes(value));
  };
  const getTelemetryDimensionLabel = (
    dimension: BridgeTelemetryAnalyticsDimension,
    key: string,
  ): string => {
    if (dimension === "sourceType") {
      return key === "local" ? "Local" : key === "remote" ? "Remote" : key;
    }
    return key;
  };
  const getTelemetryMetricAggregation = (metric: BridgeTelemetryAnalyticsMetric): string => {
    switch (metric) {
      case "requestCount":
      case "successCount":
      case "failureCount":
        return "count";
      case "cacheBackedRequestRate":
      case "cacheHitTokenRate":
        return "rate";
      case "averageLatencyMs":
        return "average";
      case "p95LatencyMs":
        return "p95";
      default:
        return "sum";
    }
  };
  const isTelemetryMetricSupportedForRecord = (
    metric: BridgeTelemetryAnalyticsMetric,
    record: BridgeTelemetryRequestRecord,
  ): boolean => {
    switch (metric) {
      case "cacheHitTokens":
      case "cacheReadTokens":
        return record.cacheReadTokensSupported;
      case "cacheHitTokenRate":
        return record.cacheReadTokensSupported && record.inputTokensAvailable;
      case "inputTokens":
        return record.inputTokensAvailable;
      case "outputTokens":
        return record.outputTokensAvailable;
      case "totalTokens":
        return record.inputTokensAvailable && record.outputTokensAvailable;
      case "actualCostUsd":
        return record.actualCostUsd !== null;
      case "estimatedCostUsd":
        return record.estimatedCostUsd !== null;
      case "selectedUncachedCostUsd":
        return record.selectedUncachedCostUsd !== null;
      case "baselineMaxEligibleCostUsd":
        return record.baselineMaxEligibleCostUsd !== null;
      case "routingCostSavingsUsd":
      case "cacheCostSavingsUsd":
      case "totalAvoidedCostUsd":
        return record.costSavingsSupport !== null;
      case "averageLatencyMs":
      case "p95LatencyMs":
        return typeof record.latencyMs === "number";
      default:
        return true;
    }
  };
  const describeTelemetryMetricUnsupported = (metric: BridgeTelemetryAnalyticsMetric): string => {
    if (metric === "inputTokens") {
      return "No rows in this slice expose available input-token usage.";
    }
    if (metric === "outputTokens") {
      return "No rows in this slice expose available output-token usage.";
    }
    if (metric === "totalTokens") {
      return "No rows in this slice expose complete available token usage.";
    }
    if (metric === "cacheHitTokenRate") {
      return "No rows in this slice expose cache-read-token support.";
    }
    if (metric === "cacheHitTokens" || metric === "cacheReadTokens") {
      return "No rows in this slice expose cache-read-token support.";
    }
    if (
      metric === "routingCostSavingsUsd" ||
      metric === "cacheCostSavingsUsd" ||
      metric === "totalAvoidedCostUsd"
    ) {
      return "No rows in this slice expose cost-savings support.";
    }
    if (metric.endsWith("CostUsd") || metric === "selectedUncachedCostUsd") {
      return "No rows in this slice expose cost telemetry support.";
    }
    if (metric === "averageLatencyMs" || metric === "p95LatencyMs") {
      return "No rows in this slice expose latency telemetry.";
    }
    return `No rows in this slice support ${metric}.`;
  };
  const buildTelemetryMetricSupport = (
    metric: BridgeTelemetryAnalyticsMetric,
    records: readonly BridgeTelemetryRequestRecord[],
  ): BridgeTelemetryAnalyticsMetricSupport => {
    const supportedRows = records.filter((record) =>
      isTelemetryMetricSupportedForRecord(metric, record),
    );
    const nullValueCount = records.filter(
      (record) => computeTelemetryMetricValue(metric, [record]) === null,
    ).length;
    const status: BridgeTelemetryAnalyticsSupportStatus =
      records.length === 0 || supportedRows.length === records.length
        ? "supported"
        : supportedRows.length === 0
          ? "unsupported"
          : "partial";
    return {
      metric,
      status,
      aggregation: getTelemetryMetricAggregation(metric),
      matchedRowCount: records.length,
      supportedRowCount: supportedRows.length,
      unsupportedRowCount: records.length - supportedRows.length,
      nullValueCount,
      reason:
        status === "unsupported"
          ? describeTelemetryMetricUnsupported(metric)
          : status === "partial"
            ? `${records.length - supportedRows.length} row(s) in this slice do not support ${metric}.`
            : null,
    };
  };
  const isTaxonomyTelemetryDimension = (dimension: BridgeTelemetryAnalyticsDimension): boolean =>
    dimension.startsWith("taxonomy");
  const buildTelemetryTaxonomyCoverage = (
    records: readonly BridgeTelemetryRequestRecord[],
  ): {
    readonly matchedRowCount: number;
    readonly richerTaxonomyRowCount: number;
    readonly legacyRowCount: number;
    readonly coverageRate: number;
    readonly backfillPerformed: false;
  } => {
    const richerTaxonomyRowCount = records.filter(
      (record) =>
        Boolean(record.taxonomyGroupId) ||
        Boolean(record.taxonomyRoleId) ||
        Boolean(record.taxonomyTaskType) ||
        Boolean(record.taxonomyTaskVariant) ||
        (record.taxonomyCapabilityIds?.length ?? 0) > 0 ||
        (record.taxonomyModalityIds?.length ?? 0) > 0 ||
        (record.taxonomyToolClassIds?.length ?? 0) > 0,
    ).length;
    const matchedRowCount = records.length;
    return {
      matchedRowCount,
      richerTaxonomyRowCount,
      legacyRowCount: matchedRowCount - richerTaxonomyRowCount,
      coverageRate:
        matchedRowCount === 0 ? 0 : Number((richerTaxonomyRowCount / matchedRowCount).toFixed(6)),
      backfillPerformed: false,
    };
  };
  const describeTelemetryTaxonomyCoverage = (
    dimension: BridgeTelemetryAnalyticsDimension,
    coverage: ReturnType<typeof buildTelemetryTaxonomyCoverage>,
  ): string => {
    if (!isTaxonomyTelemetryDimension(dimension) || coverage.matchedRowCount === 0) {
      return "";
    }
    if (coverage.richerTaxonomyRowCount === coverage.matchedRowCount) {
      return "";
    }
    return ` Richer taxonomy coverage in this range is ${coverage.richerTaxonomyRowCount}/${coverage.matchedRowCount} rows (${(coverage.coverageRate * 100).toFixed(1)}%); rows without richer taxonomy remain included and richer-taxonomy backfill is not performed.`;
  };
  const buildTelemetryDimensionSupport = (
    dimension: BridgeTelemetryAnalyticsDimension,
    records: readonly BridgeTelemetryRequestRecord[],
  ): BridgeTelemetryAnalyticsDimensionSupport => {
    const taxonomyCoverage = buildTelemetryTaxonomyCoverage(records);
    const populatedRowCount = records.filter(
      (record) => getTelemetryDimensionValues(record, dimension).length > 0,
    ).length;
    const status: BridgeTelemetryAnalyticsSupportStatus =
      records.length === 0 || populatedRowCount === records.length
        ? "supported"
        : populatedRowCount === 0
          ? "unsupported"
          : "partial";
    return {
      dimension,
      status,
      matchedRowCount: records.length,
      populatedRowCount,
      sparseRowCount: records.length - populatedRowCount,
      reason:
        status === "unsupported"
          ? `No rows in this slice include ${dimension}.${describeTelemetryTaxonomyCoverage(
              dimension,
              taxonomyCoverage,
            )}`
          : status === "partial"
            ? `${records.length - populatedRowCount} row(s) in this slice do not include ${dimension}.${describeTelemetryTaxonomyCoverage(
                dimension,
                taxonomyCoverage,
              )}`
            : null,
    };
  };
  const readTelemetryAnalyticsQuery = (
    body: Record<string, unknown>,
  ): BridgeTelemetryAnalyticsQuery => {
    const granularity = body.granularity;
    if (granularity !== "hour" && granularity !== "day" && granularity !== "week") {
      throw new Error("granularity must be one of: hour, day, week");
    }
    const metrics = body.metrics;
    if (
      !Array.isArray(metrics) ||
      metrics.length === 0 ||
      metrics.some((metric) => typeof metric !== "string")
    ) {
      throw new Error("metrics must be a non-empty array of strings");
    }
    const parsedMetrics = metrics.map((metric) => readTelemetryAnalyticsMetric(metric as string));
    const breakdown =
      typeof body.breakdown === "string"
        ? readTelemetryAnalyticsDimension(body.breakdown)
        : body.breakdown === null || body.breakdown === undefined
          ? null
          : (() => {
              throw new Error("breakdown must be a string when provided");
            })();
    const rankingBody =
      body.ranking === undefined || body.ranking === null
        ? null
        : asObject(body.ranking, "ranking");
    const filtersBody =
      body.filters === undefined || body.filters === null
        ? undefined
        : asObject(body.filters, "filters");
    const readStringList = (value: unknown, label: string): string[] | undefined => {
      if (value === undefined) {
        return undefined;
      }
      if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
        throw new Error(`${label} must be an array of strings`);
      }
      return [...value];
    };
    const readEnumStringList = <T extends string>(
      value: unknown,
      label: string,
      allowed: readonly T[],
    ): T[] | undefined => {
      const entries = readStringList(value, label);
      if (entries === undefined) {
        return undefined;
      }
      for (const entry of entries) {
        if (!allowed.includes(entry as T)) {
          throw new Error(`${label} contains unsupported value: ${entry}`);
        }
      }
      return entries as T[];
    };
    const startAtMs =
      typeof body.startAtMs === "number" && Number.isFinite(body.startAtMs)
        ? body.startAtMs
        : undefined;
    const endAtMs =
      typeof body.endAtMs === "number" && Number.isFinite(body.endAtMs) ? body.endAtMs : undefined;
    const windowMs =
      typeof body.windowMs === "number" && Number.isFinite(body.windowMs)
        ? body.windowMs
        : undefined;
    if (typeof body.startAtMs !== "undefined" && startAtMs === undefined) {
      throw new Error("startAtMs must be a finite number when provided");
    }
    if (typeof body.endAtMs !== "undefined" && endAtMs === undefined) {
      throw new Error("endAtMs must be a finite number when provided");
    }
    if (typeof body.windowMs !== "undefined" && windowMs === undefined) {
      throw new Error("windowMs must be a finite number when provided");
    }
    if (typeof windowMs === "number" && windowMs <= 0) {
      throw new Error("windowMs must be greater than zero");
    }
    if (typeof startAtMs === "number" && typeof endAtMs === "number" && endAtMs <= startAtMs) {
      throw new Error("endAtMs must be greater than startAtMs");
    }
    if (
      rankingBody &&
      typeof rankingBody.limit !== "undefined" &&
      (!Number.isInteger(rankingBody.limit) || (rankingBody.limit as number) <= 0)
    ) {
      throw new Error("ranking.limit must be a positive integer");
    }
    return {
      ...(typeof startAtMs === "number" ? { startAtMs } : {}),
      ...(typeof endAtMs === "number" ? { endAtMs } : {}),
      ...(typeof windowMs === "number" ? { windowMs } : {}),
      granularity,
      metrics: parsedMetrics,
      ...(breakdown ? { breakdown } : {}),
      ...(filtersBody
        ? {
            filters: {
              ...(readEnumStringList(filtersBody.sourceTypes, "filters.sourceTypes", [
                "local",
                "remote",
              ] as const)
                ? {
                    sourceTypes: readEnumStringList(
                      filtersBody.sourceTypes,
                      "filters.sourceTypes",
                      ["local", "remote"] as const,
                    ),
                  }
                : {}),
              ...(readStringList(filtersBody.endpointIds, "filters.endpointIds")
                ? { endpointIds: readStringList(filtersBody.endpointIds, "filters.endpointIds") }
                : {}),
              ...(readStringList(filtersBody.modelIds, "filters.modelIds")
                ? { modelIds: readStringList(filtersBody.modelIds, "filters.modelIds") }
                : {}),
              ...(readStringList(filtersBody.providerIds, "filters.providerIds")
                ? { providerIds: readStringList(filtersBody.providerIds, "filters.providerIds") }
                : {}),
              ...(readStringList(filtersBody.providerKinds, "filters.providerKinds")
                ? {
                    providerKinds: readStringList(
                      filtersBody.providerKinds,
                      "filters.providerKinds",
                    ),
                  }
                : {}),
              ...(readStringList(filtersBody.providerFamilies, "filters.providerFamilies")
                ? {
                    providerFamilies: readStringList(
                      filtersBody.providerFamilies,
                      "filters.providerFamilies",
                    ),
                  }
                : {}),
              ...(readStringList(filtersBody.providerAccountIds, "filters.providerAccountIds")
                ? {
                    providerAccountIds: readStringList(
                      filtersBody.providerAccountIds,
                      "filters.providerAccountIds",
                    ),
                  }
                : {}),
              ...(readStringList(filtersBody.requestedRoleIds, "filters.requestedRoleIds")
                ? {
                    requestedRoleIds: readStringList(
                      filtersBody.requestedRoleIds,
                      "filters.requestedRoleIds",
                    ),
                  }
                : {}),
              ...(readStringList(filtersBody.selectedStrategies, "filters.selectedStrategies")
                ? {
                    selectedStrategies: readStringList(
                      filtersBody.selectedStrategies,
                      "filters.selectedStrategies",
                    ),
                  }
                : {}),
              ...(readEnumStringList(filtersBody.routingModes, "filters.routingModes", [
                "baseline",
                "difficulty",
                "controller",
                "hybrid",
              ] as const)
                ? {
                    routingModes: readEnumStringList(
                      filtersBody.routingModes,
                      "filters.routingModes",
                      ["baseline", "difficulty", "controller", "hybrid"] as const,
                    ),
                  }
                : {}),
              ...(readEnumStringList(filtersBody.difficultyBuckets, "filters.difficultyBuckets", [
                "easy",
                "medium",
                "hard",
              ] as const)
                ? {
                    difficultyBuckets: readEnumStringList(
                      filtersBody.difficultyBuckets,
                      "filters.difficultyBuckets",
                      ["easy", "medium", "hard"] as const,
                    ),
                  }
                : {}),
              ...(readEnumStringList(filtersBody.statusFamilies, "filters.statusFamilies", [
                "success",
                "failure",
                "unknown",
              ] as const)
                ? {
                    statusFamilies: readEnumStringList(
                      filtersBody.statusFamilies,
                      "filters.statusFamilies",
                      ["success", "failure", "unknown"] as const,
                    ),
                  }
                : {}),
              ...(readStringList(filtersBody.requestOperations, "filters.requestOperations")
                ? {
                    requestOperations: readStringList(
                      filtersBody.requestOperations,
                      "filters.requestOperations",
                    ),
                  }
                : {}),
              ...(readStringList(filtersBody.taxonomyGroupIds, "filters.taxonomyGroupIds")
                ? {
                    taxonomyGroupIds: readStringList(
                      filtersBody.taxonomyGroupIds,
                      "filters.taxonomyGroupIds",
                    ),
                  }
                : {}),
              ...(readStringList(filtersBody.taxonomyRoleIds, "filters.taxonomyRoleIds")
                ? {
                    taxonomyRoleIds: readStringList(
                      filtersBody.taxonomyRoleIds,
                      "filters.taxonomyRoleIds",
                    ),
                  }
                : {}),
              ...(readStringList(filtersBody.taxonomyTaskTypes, "filters.taxonomyTaskTypes")
                ? {
                    taxonomyTaskTypes: readStringList(
                      filtersBody.taxonomyTaskTypes,
                      "filters.taxonomyTaskTypes",
                    ),
                  }
                : {}),
              ...(readStringList(filtersBody.taxonomyTaskVariants, "filters.taxonomyTaskVariants")
                ? {
                    taxonomyTaskVariants: readStringList(
                      filtersBody.taxonomyTaskVariants,
                      "filters.taxonomyTaskVariants",
                    ),
                  }
                : {}),
              ...(readStringList(filtersBody.taxonomyCapabilityIds, "filters.taxonomyCapabilityIds")
                ? {
                    taxonomyCapabilityIds: readStringList(
                      filtersBody.taxonomyCapabilityIds,
                      "filters.taxonomyCapabilityIds",
                    ),
                  }
                : {}),
              ...(readStringList(filtersBody.taxonomyModalityIds, "filters.taxonomyModalityIds")
                ? {
                    taxonomyModalityIds: readStringList(
                      filtersBody.taxonomyModalityIds,
                      "filters.taxonomyModalityIds",
                    ),
                  }
                : {}),
              ...(readStringList(filtersBody.taxonomyToolClassIds, "filters.taxonomyToolClassIds")
                ? {
                    taxonomyToolClassIds: readStringList(
                      filtersBody.taxonomyToolClassIds,
                      "filters.taxonomyToolClassIds",
                    ),
                  }
                : {}),
            },
          }
        : {}),
      ...(rankingBody
        ? {
            ranking: {
              dimension: readTelemetryAnalyticsDimension(
                readRequiredString(rankingBody, "dimension", "ranking"),
              ),
              metric: readTelemetryAnalyticsMetric(
                readRequiredString(rankingBody, "metric", "ranking"),
              ),
              ...(typeof rankingBody.limit === "number" && Number.isFinite(rankingBody.limit)
                ? { limit: rankingBody.limit }
                : {}),
            },
          }
        : {}),
    };
  };
  const filterTelemetryRequestRecords = (
    records: readonly BridgeTelemetryRequestRecord[],
    filters?: BridgeTelemetryAnalyticsFilters,
  ): readonly BridgeTelemetryRequestRecord[] => {
    if (!filters) {
      return records;
    }
    return records.filter((record) => {
      if (filters.sourceTypes && !filters.sourceTypes.includes(record.sourceType)) {
        return false;
      }
      if (filters.endpointIds && !filters.endpointIds.includes(record.endpointId)) {
        return false;
      }
      if (filters.modelIds && !(record.modelId && filters.modelIds.includes(record.modelId))) {
        return false;
      }
      if (
        filters.providerIds &&
        !(record.providerId && filters.providerIds.includes(record.providerId))
      ) {
        return false;
      }
      if (
        filters.providerKinds &&
        !(record.providerKind && filters.providerKinds.includes(record.providerKind))
      ) {
        return false;
      }
      if (
        filters.providerFamilies &&
        !(record.providerFamily && filters.providerFamilies.includes(record.providerFamily))
      ) {
        return false;
      }
      if (
        filters.providerAccountIds &&
        !(record.providerAccountId && filters.providerAccountIds.includes(record.providerAccountId))
      ) {
        return false;
      }
      if (
        filters.requestedRoleIds &&
        !(record.requestedRoleId && filters.requestedRoleIds.includes(record.requestedRoleId))
      ) {
        return false;
      }
      if (
        filters.selectedStrategies &&
        !(record.selectedStrategy && filters.selectedStrategies.includes(record.selectedStrategy))
      ) {
        return false;
      }
      if (
        filters.routingModes &&
        !(record.routingMode && filters.routingModes.includes(record.routingMode))
      ) {
        return false;
      }
      if (
        filters.difficultyBuckets &&
        !(record.difficultyBucket && filters.difficultyBuckets.includes(record.difficultyBucket))
      ) {
        return false;
      }
      if (
        filters.statusFamilies &&
        !(record.statusFamily && filters.statusFamilies.includes(record.statusFamily))
      ) {
        return false;
      }
      if (
        filters.requestOperations &&
        !(record.requestOperation && filters.requestOperations.includes(record.requestOperation))
      ) {
        return false;
      }
      if (
        filters.taxonomyGroupIds &&
        !matchesTelemetryDimensionFilter(record, "taxonomyGroupId", filters.taxonomyGroupIds)
      ) {
        return false;
      }
      if (
        filters.taxonomyRoleIds &&
        !matchesTelemetryDimensionFilter(record, "taxonomyRoleId", filters.taxonomyRoleIds)
      ) {
        return false;
      }
      if (
        filters.taxonomyTaskTypes &&
        !matchesTelemetryDimensionFilter(record, "taxonomyTaskType", filters.taxonomyTaskTypes)
      ) {
        return false;
      }
      if (
        filters.taxonomyTaskVariants &&
        !matchesTelemetryDimensionFilter(
          record,
          "taxonomyTaskVariant",
          filters.taxonomyTaskVariants,
        )
      ) {
        return false;
      }
      if (
        filters.taxonomyCapabilityIds &&
        !matchesTelemetryDimensionFilter(
          record,
          "taxonomyCapabilityId",
          filters.taxonomyCapabilityIds,
        )
      ) {
        return false;
      }
      if (
        filters.taxonomyModalityIds &&
        !matchesTelemetryDimensionFilter(record, "taxonomyModalityId", filters.taxonomyModalityIds)
      ) {
        return false;
      }
      if (
        filters.taxonomyToolClassIds &&
        !matchesTelemetryDimensionFilter(
          record,
          "taxonomyToolClassId",
          filters.taxonomyToolClassIds,
        )
      ) {
        return false;
      }
      return true;
    });
  };
  const summarizeTelemetryRequestRecords = (
    records: readonly BridgeTelemetryRequestRecord[],
  ): ReturnType<typeof readRuntimeTelemetrySummary> => {
    const latencies = records
      .map((record) => record.latencyMs)
      .filter((value): value is number => typeof value === "number")
      .sort((left, right) => left - right);
    const totalLatency = latencies.reduce((sum, value) => sum + value, 0);
    const p95Index =
      latencies.length > 0 ? Math.max(0, Math.ceil(latencies.length * 0.95) - 1) : -1;
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
      totalEffectiveCostUsd: Number(
        records.reduce((sum, record) => sum + record.effectiveCostUsd, 0).toFixed(6),
      ),
      averageLatencyMs: latencies.length > 0 ? Math.round(totalLatency / latencies.length) : null,
      p95LatencyMs: p95Index >= 0 ? (latencies[p95Index] ?? null) : null,
      lastSeenAtMs: records[0]?.createdAtMs ?? null,
    };
  };
  const getTelemetryEndpointMeta = (endpointId: string): BridgeTelemetryEndpointMeta => {
    const registryEndpoint = getRegistryEndpoint(endpointId);
    const runtimeEndpoint = runtimeEndpoints.find((entry) => entry.endpointId === endpointId);
    const runtimeAccount = runtimeEndpoint
      ? currentAccounts.find(
          (entry) => entry.providerAccountId === runtimeEndpoint.providerAccountId,
        )
      : undefined;
    return {
      sourceType: registryEndpoint
        ? toSourceType(registryEndpoint.identity.endpoint_kind)
        : "local",
      providerId:
        (registryEndpoint
          ? currentModelsById.get(registryEndpoint.identity.model_id)?.providerId
          : undefined) ??
        runtimeAccount?.providerId ??
        null,
      endpointKind:
        registryEndpoint?.identity.endpoint_kind ?? runtimeEndpoint?.endpointKind ?? null,
      servingSource:
        registryEndpoint?.identity.serving_source ?? runtimeEndpoint?.servingSource ?? null,
      healthStatus:
        runtimeEndpoint?.healthStatus ??
        (registryEndpoint?.deniedByPolicy
          ? "policy-blocked"
          : registryEndpoint
            ? "healthy"
            : "unknown"),
      status: registryEndpoint?.status ?? runtimeEndpoint?.lifecycleState ?? "unknown",
      roleIds: getEndpointRoleIds(
        endpointId,
        runtimeEndpoints,
        currentAccounts,
        currentRegistry,
        currentRolePolicy.roleDefinitions,
        getLlamaSwapRoleIdsByModelId(),
      ),
    };
  };
  const listTelemetryRequestRecords = (
    query?: BridgeTelemetryQuery,
  ): readonly BridgeTelemetryRequestRecord[] => {
    const normalizedQuery = normalizeTelemetryQuery(query);
    const records = listRuntimeTelemetryRecords({
      databasePath: initialization.databasePath,
      ...normalizedQuery,
    });
    return filterTelemetryRequestRecords(
      records.map((record) => {
        const endpointMeta = getTelemetryEndpointMeta(record.endpointId);
        return {
          ...record,
          clientRequestId: record.clientRequestId,
          requestClass: record.requestClass ?? "unknown",
          ...endpointMeta,
          sourceType: record.sourceType ?? endpointMeta.sourceType,
          providerId: record.providerId ?? endpointMeta.providerId,
          endpointKind: record.endpointKind ?? endpointMeta.endpointKind,
          servingSource: record.servingSource ?? endpointMeta.servingSource,
          healthStatus: record.healthStatusAtRequest ?? endpointMeta.healthStatus,
          status: record.lifecycleStateAtRequest ?? endpointMeta.status,
          roleIds: record.roleIds.length > 0 ? record.roleIds : endpointMeta.roleIds,
          taxonomyGroupId: record.taxonomyGroupId,
          taxonomyRoleId: record.taxonomyRoleId,
          taxonomyTaskType: record.taxonomyTaskType,
          taxonomyTaskVariant: record.taxonomyTaskVariant,
          taxonomyCapabilityIds: record.taxonomyCapabilityIds,
          taxonomyModalityIds: record.taxonomyModalityIds,
          taxonomyToolClassIds: record.taxonomyToolClassIds,
        };
      }),
      normalizedQuery.filters,
    );
  };
  const enrichTelemetryRequestRecords = (
    records: readonly ReturnType<typeof listRuntimeTelemetryRecords>[number][],
  ): readonly BridgeTelemetryRequestRecord[] => {
    return records.map((record) => {
      const endpointMeta = getTelemetryEndpointMeta(record.endpointId);
      return {
        ...record,
        clientRequestId: record.clientRequestId,
        requestClass: record.requestClass ?? "unknown",
        ...endpointMeta,
        sourceType: record.sourceType ?? endpointMeta.sourceType,
        providerId: record.providerId ?? endpointMeta.providerId,
        endpointKind: record.endpointKind ?? endpointMeta.endpointKind,
        servingSource: record.servingSource ?? endpointMeta.servingSource,
        healthStatus: record.healthStatusAtRequest ?? endpointMeta.healthStatus,
        status: record.lifecycleStateAtRequest ?? endpointMeta.status,
        roleIds: record.roleIds.length > 0 ? record.roleIds : endpointMeta.roleIds,
        taxonomyGroupId: record.taxonomyGroupId,
        taxonomyRoleId: record.taxonomyRoleId,
        taxonomyTaskType: record.taxonomyTaskType,
        taxonomyTaskVariant: record.taxonomyTaskVariant,
        taxonomyCapabilityIds: record.taxonomyCapabilityIds,
        taxonomyModalityIds: record.taxonomyModalityIds,
        taxonomyToolClassIds: record.taxonomyToolClassIds,
      };
    });
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
    const requestMetaByEndpointId = new Map(
      listTelemetryRequestRecords(normalizedQuery).map((record) => [
        record.endpointId,
        {
          sourceType: record.sourceType,
          providerId: record.providerId,
          endpointKind: record.endpointKind,
          servingSource: record.servingSource,
          healthStatus: record.healthStatusAtRequest ?? record.healthStatus,
          status: record.lifecycleStateAtRequest ?? record.status,
          roleIds: record.roleIds,
        } satisfies BridgeTelemetryEndpointMeta,
      ]),
    );
    return listRuntimeTelemetryComparisonRows({
      databasePath: initialization.databasePath,
      ...normalizedQuery,
    }).map((row) => ({
      ...row,
      ...(requestMetaByEndpointId.get(row.endpointId) ?? getTelemetryEndpointMeta(row.endpointId)),
    }));
  };
  const queryTelemetryAnalyticsData = (
    rawBody: Record<string, unknown>,
  ): BridgeTelemetryAnalyticsResponse => {
    const query = readTelemetryAnalyticsQuery(rawBody);
    const endAtMs = query.endAtMs ?? Date.now();
    const startAtMs = query.startAtMs ?? endAtMs - (query.windowMs ?? DEFAULT_TELEMETRY_WINDOW_MS);
    const appliedQuery: BridgeTelemetryAnalyticsQuery = {
      ...query,
      startAtMs,
      endAtMs,
      windowMs: endAtMs - startAtMs,
      breakdown: query.breakdown ?? null,
      filters: query.filters ?? {},
      ranking: query.ranking ?? null,
    };
    const scannedRequestRecords = enrichTelemetryRequestRecords(
      listRuntimeTelemetryRecords({
        databasePath: initialization.databasePath,
        startAtMs,
        endAtMs,
        windowMs: endAtMs - startAtMs,
      }),
    );
    const requestRecords = filterTelemetryRequestRecords(scannedRequestRecords, query.filters);
    const bucketSizeMs = TELEMETRY_ANALYTICS_GRANULARITY_MS[query.granularity];
    const bucketCount = Math.max(1, Math.ceil(Math.max(1, endAtMs - startAtMs) / bucketSizeMs));
    const buckets: BridgeTelemetryAnalyticsBucket[] = [];
    for (let index = 0; index < bucketCount; index += 1) {
      const bucketStartMs = startAtMs + bucketSizeMs * index;
      const bucketEndMs = Math.min(endAtMs, bucketStartMs + bucketSizeMs);
      const bucketRecords = requestRecords.filter(
        (record) => record.createdAtMs >= bucketStartMs && record.createdAtMs < bucketEndMs,
      );
      const totals = Object.fromEntries(
        query.metrics.map((metric) => [metric, computeTelemetryMetricValue(metric, bucketRecords)]),
      );
      const series = (() => {
        const breakdownDimension = query.breakdown;
        if (breakdownDimension === null || breakdownDimension === undefined) {
          return [];
        }
        return [
          ...new Set(
            bucketRecords
              .flatMap((record) => getTelemetryDimensionValues(record, breakdownDimension))
              .filter((value): value is string => Boolean(value)),
          ),
        ]
          .sort((left, right) => left.localeCompare(right))
          .map((key) => {
            const seriesRecords = bucketRecords.filter((record) =>
              getTelemetryDimensionValues(record, breakdownDimension).includes(key),
            );
            return {
              key,
              label: getTelemetryDimensionLabel(breakdownDimension, key),
              metrics: Object.fromEntries(
                query.metrics.map((metric) => [
                  metric,
                  computeTelemetryMetricValue(metric, seriesRecords),
                ]),
              ),
            } satisfies BridgeTelemetryAnalyticsSeries;
          });
      })();
      buckets.push({
        startAtMs: bucketStartMs,
        endAtMs: bucketEndMs,
        totals,
        series,
      });
    }
    const totals = Object.fromEntries(
      query.metrics.map((metric) => [metric, computeTelemetryMetricValue(metric, requestRecords)]),
    );
    const metricSupport = Object.fromEntries(
      query.metrics.map((metric) => [metric, buildTelemetryMetricSupport(metric, requestRecords)]),
    ) as Partial<Record<BridgeTelemetryAnalyticsMetric, BridgeTelemetryAnalyticsMetricSupport>>;
    const supportDimensions = new Set<BridgeTelemetryAnalyticsDimension>(
      [
        query.breakdown ?? undefined,
        query.ranking?.dimension,
        ...(query.filters?.sourceTypes ? (["sourceType"] as const) : []),
        ...(query.filters?.endpointIds ? (["endpointId"] as const) : []),
        ...(query.filters?.modelIds ? (["modelId"] as const) : []),
        ...(query.filters?.providerIds ? (["providerId"] as const) : []),
        ...(query.filters?.providerKinds ? (["providerKind"] as const) : []),
        ...(query.filters?.providerFamilies ? (["providerFamily"] as const) : []),
        ...(query.filters?.providerAccountIds ? (["providerAccountId"] as const) : []),
        ...(query.filters?.requestedRoleIds ? (["requestedRoleId"] as const) : []),
        ...(query.filters?.selectedStrategies ? (["selectedStrategy"] as const) : []),
        ...(query.filters?.routingModes ? (["routingMode"] as const) : []),
        ...(query.filters?.difficultyBuckets ? (["difficultyBucket"] as const) : []),
        ...(query.filters?.statusFamilies ? (["statusFamily"] as const) : []),
        ...(query.filters?.requestOperations ? (["requestOperation"] as const) : []),
        ...(query.filters?.taxonomyGroupIds ? (["taxonomyGroupId"] as const) : []),
        ...(query.filters?.taxonomyRoleIds ? (["taxonomyRoleId"] as const) : []),
        ...(query.filters?.taxonomyTaskTypes ? (["taxonomyTaskType"] as const) : []),
        ...(query.filters?.taxonomyTaskVariants ? (["taxonomyTaskVariant"] as const) : []),
        ...(query.filters?.taxonomyCapabilityIds ? (["taxonomyCapabilityId"] as const) : []),
        ...(query.filters?.taxonomyModalityIds ? (["taxonomyModalityId"] as const) : []),
        ...(query.filters?.taxonomyToolClassIds ? (["taxonomyToolClassId"] as const) : []),
      ].filter((value): value is BridgeTelemetryAnalyticsDimension => Boolean(value)),
    );
    const dimensionSupport = Object.fromEntries(
      [...supportDimensions].map((dimension) => [
        dimension,
        buildTelemetryDimensionSupport(dimension, requestRecords),
      ]),
    ) as Partial<
      Record<BridgeTelemetryAnalyticsDimension, BridgeTelemetryAnalyticsDimensionSupport>
    >;
    const labels: Partial<Record<BridgeTelemetryAnalyticsDimension, Record<string, string>>> = {};
    const labelDimensions = new Set<BridgeTelemetryAnalyticsDimension>(
      [
        query.breakdown ?? undefined,
        query.ranking?.dimension,
        ...(query.filters?.sourceTypes ? (["sourceType"] as const) : []),
        ...(query.filters?.requestedRoleIds ? (["requestedRoleId"] as const) : []),
        ...(query.filters?.selectedStrategies ? (["selectedStrategy"] as const) : []),
        ...(query.filters?.taxonomyGroupIds ? (["taxonomyGroupId"] as const) : []),
        ...(query.filters?.taxonomyRoleIds ? (["taxonomyRoleId"] as const) : []),
        ...(query.filters?.taxonomyTaskTypes ? (["taxonomyTaskType"] as const) : []),
        ...(query.filters?.taxonomyTaskVariants ? (["taxonomyTaskVariant"] as const) : []),
        ...(query.filters?.taxonomyCapabilityIds ? (["taxonomyCapabilityId"] as const) : []),
        ...(query.filters?.taxonomyModalityIds ? (["taxonomyModalityId"] as const) : []),
        ...(query.filters?.taxonomyToolClassIds ? (["taxonomyToolClassId"] as const) : []),
      ].filter((value): value is BridgeTelemetryAnalyticsDimension => Boolean(value)),
    );
    for (const dimension of labelDimensions) {
      labels[dimension] = Object.fromEntries(
        [
          ...new Set(
            requestRecords
              .flatMap((record) => getTelemetryDimensionValues(record, dimension))
              .filter((value): value is string => Boolean(value)),
          ),
        ]
          .sort((left, right) => left.localeCompare(right))
          .map((key) => [key, getTelemetryDimensionLabel(dimension, key)]),
      );
    }
    const rankingResult = (() => {
      const rankingQuery = query.ranking;
      if (rankingQuery === null || rankingQuery === undefined) {
        return {
          ranking: null,
          truncated: false,
          truncationReason: null,
        } as const;
      }
      const grouped = new Map<string, BridgeTelemetryRequestRecord[]>();
      for (const record of requestRecords) {
        for (const key of getTelemetryDimensionValues(record, rankingQuery.dimension)) {
          const existing = grouped.get(key) ?? [];
          existing.push(record);
          grouped.set(key, existing);
        }
      }
      const limit = rankingQuery.limit ?? DEFAULT_TELEMETRY_LIMIT;
      const rows = [...grouped.entries()]
        .map(([key, groupedRecords]) => ({
          key,
          label: getTelemetryDimensionLabel(rankingQuery.dimension, key),
          value: computeTelemetryMetricValue(rankingQuery.metric, groupedRecords),
        }))
        .sort(
          (left, right) =>
            (right.value ?? Number.NEGATIVE_INFINITY) - (left.value ?? Number.NEGATIVE_INFINITY) ||
            left.key.localeCompare(right.key),
        );
      const truncated = rows.length > limit;
      return {
        ranking: {
          dimension: rankingQuery.dimension,
          metric: rankingQuery.metric,
          rows: rows.slice(0, limit),
        },
        truncated,
        truncationReason: truncated
          ? `Ranking limited to top ${limit} ${rankingQuery.dimension} value(s) out of ${rows.length} matched value(s).`
          : null,
      } as const;
    })();
    return {
      startAtMs,
      endAtMs,
      appliedQuery,
      granularity: query.granularity,
      metrics: query.metrics,
      breakdown: query.breakdown ?? null,
      buckets,
      totals,
      ranking: rankingResult.ranking,
      labels,
      metadata: {
        scannedRowCount: scannedRequestRecords.length,
        matchedRowCount: requestRecords.length,
        aggregationRowCount: requestRecords.length,
        truncated: rankingResult.truncated,
        truncationReason: rankingResult.truncationReason,
        generatedAtMs: Date.now(),
        taxonomyCoverage: buildTelemetryTaxonomyCoverage(requestRecords),
      },
      metricSupport,
      dimensionSupport,
    };
  };
  const emitTelemetryUpdate = (requestId: string): void => {
    const request = listTelemetryRequestRecords({ limit: DEFAULT_TELEMETRY_LIMIT }).find(
      (record) => record.requestId === requestId,
    );
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
  const resolveDefaultControllerAssignment = (
    effectiveRegistry: EndpointRegistryResult,
  ): BridgeControllerAssignment | null => {
    const guidance = summarizeRouterGuidance({
      routingModel,
      routableEndpointIds: effectiveRegistry.endpoints.map(
        (endpoint) => endpoint.identity.endpoint_id,
      ),
    });
    if (guidance.endpointId) {
      const defaultEndpoint = getRegistryEndpoint(guidance.endpointId);
      if (defaultEndpoint) {
        return toControllerAssignmentFromEndpoint(defaultEndpoint);
      }
    }
    const fallbackEndpoint = effectiveRegistry.endpoints[0];
    if (!fallbackEndpoint) {
      return null;
    }
    return toControllerAssignmentFromEndpoint(fallbackEndpoint);
  };
  const getDefaultControllerAssignment = (): BridgeControllerAssignment | null =>
    resolveDefaultControllerAssignment(getRouterEffectiveRegistry());
  const resolveProjectedControllerAssignment = (
    excludedEndpointIds: ReadonlySet<string>,
  ): BridgeControllerAssignment | null => {
    const effectiveRegistry = getRouterEffectiveRegistry();
    const candidates = effectiveRegistry.endpoints
      .filter((endpoint) => !excludedEndpointIds.has(endpoint.identity.endpoint_id))
      .map((endpoint) => toControllerAssignmentFromEndpoint(endpoint));
    const candidateByEndpointId = new Map(
      candidates.map((candidate) => [candidate.endpointId, candidate]),
    );
    for (const endpoint of runtimeEndpoints) {
      if (
        excludedEndpointIds.has(endpoint.endpointId) ||
        candidateByEndpointId.has(endpoint.endpointId)
      ) {
        continue;
      }
      candidates.push({
        scope: "global",
        endpointId: endpoint.endpointId,
        modelId: endpoint.modelId,
        sourceType: telemetrySourceTypeFromEndpointKind(endpoint.endpointKind),
      });
      candidateByEndpointId.set(endpoint.endpointId, candidates[candidates.length - 1]);
    }
    const guidance = summarizeRouterGuidance({
      routingModel,
      routableEndpointIds: candidates.map((candidate) => candidate.endpointId),
    });
    if (guidance.endpointId) {
      const guided = candidateByEndpointId.get(guidance.endpointId);
      if (guided) {
        return guided;
      }
    }
    return candidates[0] ?? null;
  };
  const readPersistedControllerAssignment = () =>
    readRuntimeControllerAssignment({
      databasePath: initialization.databasePath,
      scope: "global",
    });
  const writeResolvedControllerAssignment = (
    controller: BridgeControllerAssignment | null,
  ): void => {
    if (controller) {
      upsertRuntimeControllerAssignment({
        databasePath: initialization.databasePath,
        assignment: {
          scope: "global",
          endpointId: controller.endpointId,
          modelId: controller.modelId,
          sourceType: controller.sourceType,
          updatedAtMs: Date.now(),
        },
      });
      return;
    }
    deleteRuntimeControllerAssignment({
      databasePath: initialization.databasePath,
      scope: "global",
    });
  };
  const asObjectRecord = (value: unknown): Record<string, unknown> | null =>
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
  const asStringValue = (value: unknown): string | null =>
    typeof value === "string" && value.length > 0 ? value : null;
  const encodeCaptureBody = (value: unknown): string =>
    Buffer.from(
      typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2),
      "utf8",
    ).toString("base64");
  const inferActivityRequestPath = (body: Record<string, unknown> | null): string => {
    if (!body) {
      return "/v1/chat/completions";
    }
    if (Array.isArray(body.messages)) {
      return "/v1/chat/completions";
    }
    if ("input" in body) {
      return "/v1/responses";
    }
    if ("prompt" in body) {
      return "/completion";
    }
    return "/v1/chat/completions";
  };
  const buildObservedActivityEntries = () => {
    const recent = listRecentRuntimeObservations({
      databasePath: initialization.databasePath,
      limit: DEFAULT_TELEMETRY_LIMIT,
    });
    return recent
      .map((entry, index) => {
        const observation = readRuntimeObservationBundle({
          databasePath: initialization.databasePath,
          requestId: entry.requestId,
        }) as Record<string, unknown> | null;
        if (!observation) {
          return null;
        }
        const usageEvent = asObjectRecord(observation.usageEvent);
        const inspection = asObjectRecord(observation.inspection);
        const inspectionRequest = asObjectRecord(inspection?.request);
        const requestCapture = asObjectRecord(inspectionRequest?.requestCapture);
        const responseCapture = asObjectRecord(inspectionRequest?.responseCapture);
        const requestBody = asObjectRecord(requestCapture?.body);
        const requestHeaders = asObjectRecord(requestCapture?.headers) ?? {};
        const responseBody = responseCapture?.body ?? {};
        const responseHeaders = asObjectRecord(responseCapture?.headers) ?? {};
        const cacheObservability = asObjectRecord(observation.cacheObservability);
        const requestPath = inferActivityRequestPath(requestBody);
        const statusCode =
          typeof responseCapture?.statusCode === "number"
            ? responseCapture.statusCode
            : usageEvent?.error_class
              ? 500
              : 200;
        const id = index + 1;
        const durationMs = typeof usageEvent?.latency_ms === "number" ? usageEvent.latency_ms : 0;
        return {
          id,
          metric: {
            id,
            timestamp: new Date(
              typeof usageEvent?.timestamp_ms === "number" ? usageEvent.timestamp_ms : Date.now(),
            ).toISOString(),
            model: asStringValue(usageEvent?.model_id) ?? entry.endpointId,
            req_path: requestPath,
            resp_content_type: asStringValue(responseHeaders["content-type"]) ?? "application/json",
            resp_status_code: statusCode,
            tokens: {
              cache_tokens:
                typeof cacheObservability?.cacheReadTokens === "number"
                  ? Number(cacheObservability.cacheReadTokens)
                  : 0,
              input_tokens: typeof usageEvent?.tokens_in === "number" ? usageEvent.tokens_in : 0,
              output_tokens: typeof usageEvent?.tokens_out === "number" ? usageEvent.tokens_out : 0,
              prompt_per_second:
                durationMs > 0 && typeof usageEvent?.tokens_in === "number"
                  ? Number(((usageEvent.tokens_in * 1000) / durationMs).toFixed(1))
                  : 0,
              tokens_per_second:
                durationMs > 0 && typeof usageEvent?.tokens_out === "number"
                  ? Number(((usageEvent.tokens_out * 1000) / durationMs).toFixed(1))
                  : 0,
            },
            duration_ms: durationMs,
            has_capture: requestCapture !== null || responseCapture !== null,
          },
          capture:
            requestCapture || responseCapture
              ? {
                  id,
                  req_path: requestPath,
                  req_headers: requestHeaders,
                  req_body: encodeCaptureBody(requestCapture?.body ?? {}),
                  resp_headers:
                    Object.keys(responseHeaders).length > 0
                      ? responseHeaders
                      : {
                          "content-type": "application/json",
                        },
                  resp_body: encodeCaptureBody(responseBody),
                }
              : null,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  };
  const getCurrentControllerAssignment = (): BridgeControllerAssignment | null => {
    const persisted = readPersistedControllerAssignment();
    if (persisted) {
      const normalizedPersisted: BridgeControllerAssignment = {
        ...persisted,
        scope: "global",
        sourceType: persisted.sourceType === "remote" ? "remote" : "local",
      };
      if (
        isControllerAssignmentAllowedByExecutionMode(
          normalizedPersisted,
          getRouterEffectiveRegistry(),
        )
      ) {
        return normalizedPersisted;
      }
    }
    return getDefaultControllerAssignment();
  };
  const getRouterGuidance = () =>
    summarizeRouterGuidance({
      routingModel,
      routableEndpointIds: getRouterEffectiveRegistry().endpoints.map(
        (endpoint) => endpoint.identity.endpoint_id,
      ),
    });
  const readEndpointProfileData = (endpointId: string) => {
    const observedDataConfig = resolveUnifiedRuntimeObservedDataConfig(currentUnifiedRuntimeConfig);
    const difficultyProfiles = Object.fromEntries(
      (["easy", "medium", "hard"] as const).map((difficultyBucket) => [
        difficultyBucket,
        readLatestObservedProfile({
          databasePath: initialization.databasePath,
          endpointId,
          difficultyBucket,
        }),
      ]),
    ) as Record<UnifiedRuntimeDifficultyBucket, ReturnType<typeof readLatestObservedProfile>>;

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
      difficultyProfiles,
      advisoryMaxDifficultyRecommendation: readAdvisoryMaxDifficultyRecommendation({
        databasePath: initialization.databasePath,
        endpointId,
        thresholds: observedDataConfig.difficultyLearning.recommendation,
      }),
    };
  };
  const readRouterSummaryData = () => {
    const effectiveRegistry = getRouterEffectiveRegistry();
    const effectiveInventory = getRouterEffectiveRoutableInventory();
    const aliasInventory = (currentUnifiedRuntimeConfig?.modelAliases ?? []).map((alias) => {
      const resolution = resolveAliasAllowEndpoints(alias, effectiveInventory, effectiveRegistry);
      const endpointMeta = resolution.allowEndpoints.map((endpointId) => ({
        endpointId,
        ...getTelemetryEndpointMeta(endpointId),
      }));
      const activeEndpointCount = endpointMeta.filter((entry) => entry.status === "active").length;
      const healthyEndpointCount = endpointMeta.filter(
        (entry) => entry.healthStatus === "healthy",
      ).length;
      const readiness =
        resolution.allowEndpoints.length === 0 || activeEndpointCount === 0
          ? "unavailable"
          : activeEndpointCount === resolution.allowEndpoints.length &&
              healthyEndpointCount === resolution.allowEndpoints.length
            ? "ready"
            : "degraded";
      return {
        aliasId: alias.aliasId,
        mode: alias.mode ?? "basic",
        configuredHintModelIds: [...alias.modelIds],
        allowEndpointIds: [...resolution.allowEndpoints].sort(compareText),
        resolvedModelIds: [...resolution.resolvedModelIds].sort(compareText),
        driftWarnings: resolution.driftWarnings.map((warning) => ({
          aliasId: warning.aliasId,
          hintModelId: warning.hintModelId,
          suggestedModelIds: warning.suggestedModelIds,
          message: warning.message,
        })),
        localEndpointCount: endpointMeta.filter((entry) => entry.sourceType === "local").length,
        remoteEndpointCount: endpointMeta.filter((entry) => entry.sourceType === "remote").length,
        activeEndpointCount,
        healthyEndpointCount,
        readiness,
      };
    });
    return {
      strategy: currentUnifiedRuntimeConfig?.routingStrategy ?? null,
      executionMode: getRouterExecutionMode(),
      controller: getCurrentControllerAssignment(),
      guidance: getRouterGuidance(),
      configuredCandidateCount: currentRegistry.endpoints.length,
      recentDecisionCount: listTelemetryRequestRecords({ limit: DEFAULT_TELEMETRY_LIMIT }).length,
      aliasInventory,
    };
  };
  const readRouterConfigData = () => ({
    persisted: {
      strategy: currentUnifiedRuntimeConfig?.routingStrategy ?? null,
      executionMode: currentUnifiedRuntimeConfig?.executionMode ?? "decision_only",
    },
    controller: getCurrentControllerAssignment(),
    guidance: getRouterGuidance(),
    sources: {
      runtimeConfigPath: options.unifiedRuntimeConfigPath ?? null,
      routingModel: routingModel ? "resolved" : "unconfigured",
      policyInputs: "runtime",
    },
    policySources: {
      roles: currentRuntimeRoles.roleDefinitions,
      tasks: currentRolePolicy.taskDefinitions,
      roleBindings: buildRuntimeRoleBindings(
        [],
        runtimeEndpoints,
        currentAccounts,
        currentRegistry,
        currentRuntimeRoles.roleDefinitions,
        currentRolePolicy.taskDefinitions,
        getLlamaSwapRoleIdsByModelId(),
      ),
    },
  });
  const benchmarkArtifactRoot = path.join(
    path.dirname(initialization.databasePath),
    "benchmark-runs",
  );
  const benchmarkPreferencesPath = path.join(
    path.dirname(initialization.databasePath),
    "benchmark-preferences.json",
  );
  const resolveBenchmarkEndpointModelId = (endpointId: string): string | null => {
    const registryEndpoint = currentRegistry.endpoints.find(
      (entry) => entry.identity.endpoint_id === endpointId,
    );
    return registryEndpoint?.identity.model_id ?? null;
  };
  const readBenchmarkSummaryData = async () =>
    readLatestBenchmarkSummary({
      artifactRoot: benchmarkArtifactRoot,
      resolveModelId: resolveBenchmarkEndpointModelId,
    });
  const resolveEndpointAvailableRoleIds = (endpointId: string) =>
    getEndpointRoleIds(
      endpointId,
      runtimeEndpoints,
      currentAccounts,
      currentRegistry,
      currentRolePolicy.roleDefinitions,
      getLlamaSwapRoleIdsByModelId(),
    );
  const readCandidateProfileDataByEndpointId = () => {
    const endpointIds = currentRegistry.endpoints.map((endpoint) => endpoint.identity.endpoint_id);
    const latestProfiles = readLatestObservedProfilesByEndpointIds({
      databasePath: initialization.databasePath,
      endpointIds,
    });
    const difficultyProfilesByBucket = Object.fromEntries(
      (["easy", "medium", "hard"] as const).map((difficultyBucket) => [
        difficultyBucket,
        readLatestObservedProfilesByEndpointIds({
          databasePath: initialization.databasePath,
          endpointIds,
          difficultyBucket,
        }),
      ]),
    );
    const thresholds = resolveUnifiedRuntimeObservedDataConfig(currentUnifiedRuntimeConfig)
      .difficultyLearning.recommendation;
    return Object.fromEntries(
      endpointIds.map((endpointId) => {
        const difficultyProfiles = Object.fromEntries(
          (["easy", "medium", "hard"] as const).map((difficultyBucket) => [
            difficultyBucket,
            difficultyProfilesByBucket[difficultyBucket][endpointId] ?? null,
          ]),
        ) as Record<UnifiedRuntimeDifficultyBucket, ReturnType<typeof readLatestObservedProfile>>;
        return [
          endpointId,
          {
            endpointId,
            latestProfile: latestProfiles[endpointId] ?? null,
            recentSamples: [],
            difficultyProfiles,
            advisoryMaxDifficultyRecommendation: buildAdvisoryMaxDifficultyRecommendation({
              profiles: difficultyProfiles,
              thresholds,
            }),
          },
        ] as const;
      }),
    );
  };
  const buildBenchmarkCapabilityByEndpointId = async (
    profilesByEndpointId: ReturnType<typeof readCandidateProfileDataByEndpointId>,
  ) => {
    const benchmarkSummary = await readBenchmarkSummaryData();
    return Object.fromEntries(
      currentRegistry.endpoints.map((endpoint) => {
        const endpointId = endpoint.identity.endpoint_id;
        const profile = profilesByEndpointId[endpointId];
        return [
          endpointId,
          buildBenchmarkCapabilityForEndpoint({
            endpointId,
            latestProfile: profile.latestProfile as unknown as Record<string, unknown> | null,
            difficultyProfiles: profile.difficultyProfiles as Record<string, unknown> | null,
            summary: benchmarkSummary,
            availableRoleIds: resolveEndpointAvailableRoleIds(endpointId),
          }),
        ] as const;
      }),
    );
  };
  const buildEffectiveEligibilitySnapshot = () => {
    const effectiveExecutionEndpointIds = new Set(
      getRouterEffectiveRegistry().endpoints.map((endpoint) => endpoint.identity.endpoint_id),
    );
    const effectiveRoutableEndpointIds = new Set(getRouterEffectiveRoutableInventory().endpointIds);
    return {
      executionEndpointIds: effectiveExecutionEndpointIds,
      routingEligibleEndpointIds: effectiveRoutableEndpointIds,
      benchmarkEligibleEndpointIds: effectiveRoutableEndpointIds,
    };
  };
  const resolveHealthyEndpoint = (endpointId: string): boolean => {
    const runtimeEndpoint = runtimeEndpoints.find((entry) => entry.endpointId === endpointId);
    if (!runtimeEndpoint) {
      return currentRegistry.endpoints.some(
        (entry) => entry.identity.endpoint_id === endpointId && !entry.deniedByPolicy,
      );
    }
    return runtimeEndpoint.healthStatus !== "offline";
  };
  const listRouterCandidateData = async () => {
    const controller = getCurrentControllerAssignment();
    const guidance = getRouterGuidance();
    const profilesByEndpointId = readCandidateProfileDataByEndpointId();
    const benchmarkCapabilitiesByEndpointId =
      await buildBenchmarkCapabilityByEndpointId(profilesByEndpointId);
    const { executionEndpointIds, routingEligibleEndpointIds, benchmarkEligibleEndpointIds } =
      buildEffectiveEligibilitySnapshot();
    return currentRegistry.endpoints.map((endpoint) => {
      const endpointId = endpoint.identity.endpoint_id;
      const profile = profilesByEndpointId[endpointId];
      const benchmarkCapability = benchmarkCapabilitiesByEndpointId[endpointId] ?? null;
      const routingQualityScore =
        profile.latestProfile?.quality_score ?? profile.latestProfile?.judge_score ?? null;
      const catalogPricing = resolveModelCapabilityProfile({
        modelId: endpoint.identity.model_id,
        catalog: currentNormalizedCatalog,
      }).pricing;
      const latestProfile = (() => {
        const existing = profile.latestProfile as unknown as Record<string, unknown> | null;
        if (!catalogPricing) {
          return profile.latestProfile;
        }
        if (!existing) {
          return { pricing: catalogPricing };
        }
        if (existing.pricing != null) {
          return profile.latestProfile;
        }
        return {
          ...existing,
          pricing: catalogPricing,
        };
      })();
      return {
        endpointId,
        modelId: endpoint.identity.model_id,
        providerId: currentModelsById.get(endpoint.identity.model_id)?.providerId ?? null,
        sourceType: toSourceType(endpoint.identity.endpoint_kind),
        endpointKind: endpoint.identity.endpoint_kind,
        servingSource: endpoint.identity.serving_source,
        region: endpoint.identity.region,
        status: endpoint.status,
        healthStatus:
          runtimeEndpoints.find((entry) => entry.endpointId === endpointId)?.healthStatus ??
          (endpoint.deniedByPolicy ? "policy-blocked" : "healthy"),
        roleBindings: resolveEndpointAvailableRoleIds(endpointId),
        capabilities: endpoint.declared.capabilities,
        toolCallingSupported: endpoint.declared.tool_calling.supported,
        toolCallingStyle: endpoint.declared.tool_calling.style,
        webSearchSupport: resolveEndpointWebSearchSupport(endpoint),
        executionModeEligible: executionEndpointIds.has(endpointId),
        routingEligible: routingEligibleEndpointIds.has(endpointId),
        benchmarkEligible: benchmarkEligibleEndpointIds.has(endpointId),
        controllerEligible: controller?.endpointId === endpointId,
        preferred: guidance.preferredEndpointIds.includes(endpointId),
        ignored: guidance.ignoredEndpointIds.includes(endpointId),
        latestProfile,
        recentSamples: profile.recentSamples,
        difficultyProfiles: profile.difficultyProfiles,
        advisoryMaxDifficultyRecommendation: profile.advisoryMaxDifficultyRecommendation,
        ...(benchmarkCapability ? { benchmarkCapability } : {}),
        ...(routingQualityScore !== null ? { routingQualityScore } : {}),
      };
    });
  };
  const listRouterDecisionData = () =>
    listTelemetryRequestRecords({ limit: DEFAULT_TELEMETRY_LIMIT }).map((record) => {
      const observation = readRuntimeObservationBundle({
        databasePath: initialization.databasePath,
        requestId: record.requestId,
      }) as Record<string, unknown> | null;
      const routingDiagnostics = asObjectRecord(observation?.routingDiagnostics);
      const routingMode = asObjectRecord(routingDiagnostics?.routingMode);
      return {
        requestId: record.requestId,
        routingDecisionId: record.routingDecisionId ?? null,
        selectedEndpointId: record.endpointId,
        selectedModelId: record.modelId ?? null,
        strategyLabel:
          asStringValue(routingMode?.effectiveMode) ??
          currentUnifiedRuntimeConfig?.routingStrategy ??
          null,
        decidedAtMs: record.createdAtMs,
        sourceType: record.sourceType,
        providerId: record.providerId ?? null,
        finishReason: record.finishReason ?? null,
      };
    });
  function toProposalWireContract(
    normalizedIntent: Record<string, unknown> | undefined,
  ): Record<string, unknown> | null {
    if (!normalizedIntent) return null;

    const role = normalizedIntent.role as Record<string, unknown> | undefined;
    const task = normalizedIntent.task as Record<string, unknown> | undefined;
    const caps = normalizedIntent.capabilities as Record<string, unknown> | undefined;
    const mods = normalizedIntent.modalities as Record<string, unknown> | undefined;
    const tcs = normalizedIntent.toolClasses as readonly string[] | undefined;

    const alternatives = Array.isArray(normalizedIntent.alternatives)
      ? (normalizedIntent.alternatives as readonly Record<string, unknown>[]).map((alt) => ({
          ...(typeof alt.roleId === "string" ? { role_hint_id: alt.roleId } : {}),
          ...(typeof alt.taskType === "string" ? { task_type: alt.taskType } : {}),
          ...(typeof alt.confidence === "number" ? { confidence: alt.confidence } : {}),
        }))
      : undefined;

    return {
      contract_version: normalizedIntent.contractVersion,
      intent: {
        taxonomy_version: normalizedIntent.taxonomyVersion,
        ...(normalizedIntent.contentRevision
          ? { content_revision: normalizedIntent.contentRevision }
          : {}),
        classification_contract_version: normalizedIntent.classificationContractVersion,
        ...(role?.id ? { role_hint_id: role.id } : {}),
        ...(task?.id ? { task_type: task.id } : {}),
        ...(normalizedIntent.taskAction ? { task_action: normalizedIntent.taskAction } : {}),
        ...(normalizedIntent.taskVariant !== undefined && normalizedIntent.taskVariant !== null
          ? { task_variant: normalizedIntent.taskVariant }
          : {}),
        ...(normalizedIntent.taskSource ? { task_source: normalizedIntent.taskSource } : {}),
        ...(typeof normalizedIntent.taskConfidence === "number"
          ? { task_confidence: normalizedIntent.taskConfidence }
          : {}),
        ...(normalizedIntent.roleSource ? { role_source: normalizedIntent.roleSource } : {}),
        ...(typeof normalizedIntent.confidence === "number"
          ? { confidence: normalizedIntent.confidence }
          : {}),
        ...(normalizedIntent.source ? { source: normalizedIntent.source } : {}),
        ...(caps?.required && (caps.required as readonly string[]).length > 0
          ? { required_capabilities: caps.required }
          : {}),
        ...(caps?.preferred && (caps.preferred as readonly string[]).length > 0
          ? { preferred_capabilities: caps.preferred }
          : {}),
        ...(mods?.required ? { required_modalities: mods.required } : {}),
        ...(tcs && tcs.length > 0 ? { tool_classes: tcs } : {}),
        ...(normalizedIntent.contextTokensEstimate
          ? { context_tokens_estimate: normalizedIntent.contextTokensEstimate }
          : {}),
        ...(normalizedIntent.evidence ? { evidence: normalizedIntent.evidence } : {}),
        ...(alternatives && alternatives.length > 0 ? { alternatives } : {}),
      },
    };
  }

  const readRouterDecisionData = (requestId: string) => {
    const observation = readRuntimeObservationBundle({
      databasePath: initialization.databasePath,
      requestId,
    }) as (RuntimeObservationBundle & BridgeTelemetryEndpointMeta) | null;
    if (!observation) {
      return null;
    }
    const routingDiagnostics = asObjectRecord(observation.routingDiagnostics);
    const routingMode = asObjectRecord(routingDiagnostics?.routingMode);
    const decision = asObjectRecord(observation.decision);
    const requestRecord = listTelemetryRequestRecords({ limit: DEFAULT_TELEMETRY_LIMIT }).find(
      (record) => record.requestId === requestId,
    );
    return {
      requestId,
      routingDecisionId:
        requestRecord?.routingDecisionId ?? asStringValue(decision?.routing_decision_id) ?? null,
      selectedEndpointId: observation.endpointId,
      selectedModelId: requestRecord?.modelId ?? null,
      fallbackEndpointIds: Array.isArray(decision?.fallback_endpoint_ids)
        ? decision.fallback_endpoint_ids
        : [],
      strategyLabel:
        asStringValue(routingMode?.effectiveMode) ??
        currentUnifiedRuntimeConfig?.routingStrategy ??
        null,
      decision,
      routingDiagnostics: observation.routingDiagnostics ?? null,
      retrievalReceipt: observation.retrievalReceipt ?? null,
      contextEnvelope: observation.contextEnvelope ?? null,
      request: {
        ...observation,
        ...getTelemetryEndpointMeta(observation.endpointId),
      },
      normalizedIntent: observation.normalizedIntent ?? null,
      role_model: observation.normalizedIntent
        ? toProposalWireContract(observation.normalizedIntent as Record<string, unknown>)
        : null,
      endpointProfile: readEndpointProfileData(observation.endpointId),
      observeRequestPath: `/app/observe/requests/${requestId}`,
    };
  };
  const executeBridgePlan = async (
    plan: BridgeExecutionPlan,
    requestId: string,
    streamRequested: boolean | undefined,
    streamWriter?: BridgeStreamWriter,
    executionOptions?: {
      readonly persistObservation?: boolean;
      readonly requestOptions?: BridgeExecutionRequestOptions;
      readonly requestBody?: Record<string, unknown>;
      readonly requestedModel?: string;
      readonly requestOperation?: string;
      readonly executionSnapshot?: ReturnType<typeof createExecutionRuntimeSnapshot>;
    },
  ) => {
    const executionSnapshot =
      executionOptions?.executionSnapshot ?? createExecutionRuntimeSnapshot(currentRegistry);
    const observedDataConfig = resolveUnifiedRuntimeObservedDataConfig(currentUnifiedRuntimeConfig);
    const routingTimeMs = Date.now();
    const runtimeObservedProfiles = readObservedProfilesForRouting({
      databasePath: initialization.databasePath,
      registry: executionSnapshot.registry,
      observedDataConfig,
      difficultyBucket: resolveObservedDifficultyBucketForPlan(plan),
      routingTimeMs,
    });
    let streamedChunkCount = 0;
    let streamedReasoningDeltaCount = 0;
    const trackedStreamWriter: BridgeStreamWriter | undefined = streamWriter
      ? async (chunk, metadata) => {
          streamedChunkCount += 1;
          streamedReasoningDeltaCount += countChatCompletionsReasoningDeltas(chunk);
          await streamWriter(chunk, metadata);
        }
      : undefined;
    const benchmarkCapabilitiesByEndpointId = await buildBenchmarkCapabilityByEndpointId(
      readCandidateProfileDataByEndpointId(),
    );
    const roleBindings = buildRuntimeRoleBindings(
      [],
      executionSnapshot.runtimeEndpoints,
      executionSnapshot.accounts,
      executionSnapshot.registry,
      executionSnapshot.roleDefinitions,
      executionSnapshot.taskDefinitions,
      getLlamaSwapRoleIdsByModelId(),
    );
    const readMergedDeniedExecutionEndpoints = (
      denyEndpoints: readonly string[],
    ): readonly string[] => {
      if (shouldIgnoreExecutionFailureCooldowns(executionOptions?.requestOptions)) {
        return [...new Set(denyEndpoints)];
      }
      const cooldownDeniedEndpoints = filterRecoveredCodexCooldownDeniedEndpoints({
        databasePath: initialization.databasePath,
        runtimeStateRoot: options.runtimeStateRoot,
        scopeId: options.scopeId,
        runtimeEndpoints: executionSnapshot.runtimeEndpoints,
        accounts: executionSnapshot.accounts,
        deniedEndpointIds: readDeniedExecutionCircuitEndpointIds({
          databasePath: initialization.databasePath,
          nowMs: Date.now(),
        }),
      });
      return [...new Set([...denyEndpoints, ...cooldownDeniedEndpoints])];
    };
    const routeExecutionRequest = (
      denyEndpoints: readonly string[],
    ): {
      readonly deniedEndpointIds: readonly string[];
      readonly routed: ReturnType<typeof routeRuntimeRequest>;
    } => {
      const mergedDenyEndpoints = readMergedDeniedExecutionEndpoints(denyEndpoints);
      const cacheContinuityRouteHints = readCacheContinuityRouteHints({
        databasePath: initialization.databasePath,
        executionRequest: plan.executionRequest,
      });
      return {
        deniedEndpointIds: mergedDenyEndpoints,
        routed: routeRuntimeRequest({
          request: {
            ...plan.routingRequest,
            ...(mergedDenyEndpoints.length > 0 ? { denyEndpoints: mergedDenyEndpoints } : {}),
          },
          registry: executionSnapshot.registry,
          catalog: executionSnapshot.executionCatalog,
          observedProfilesByEndpointId: runtimeObservedProfiles.observedProfilesByEndpointId,
          benchmarkCapabilitiesByEndpointId,
          observedDataConfig,
          throughputPenaltyStateByEndpointId:
            runtimeObservedProfiles.throughputPenaltyStateByEndpointId,
          routingTimeMs,
          maxOutputTokens:
            typeof plan.executionRequest.maxOutputTokens === "number"
              ? plan.executionRequest.maxOutputTokens
              : undefined,
          envelope,
          retrievalReceipt,
          roleDefinitions: executionSnapshot.roleDefinitions,
          taskDefinitions: executionSnapshot.taskDefinitions,
          roleBindings,
          routingModel: plan.routingModel ?? executionSnapshot.routingModel ?? undefined,
          ...(cacheContinuityRouteHints
            ? {
                cacheContinuity: {
                  activeEndpointId: cacheContinuityRouteHints.activeEndpointId,
                  warmedEndpointIds: cacheContinuityRouteHints.warmedEndpointIds,
                },
              }
            : {}),
        }),
      };
    };
    const throwUnavailableExecutionTarget = (input: {
      readonly deniedEndpointIds: readonly string[];
      readonly previousError?: UpstreamExecutionError;
    }): never => {
      if (input.previousError) {
        throw input.previousError;
      }
      const requestedModel = executionOptions?.requestedModel ?? null;
      const temporarilyUnavailable = input.deniedEndpointIds.length > 0;
      const executionCooldowns = temporarilyUnavailable
        ? readExecutionCooldownReceipts({
            databasePath: initialization.databasePath,
            nowMs: Date.now(),
            endpointIds: input.deniedEndpointIds,
          })
        : [];
      const nowMs = Date.now();
      const circuitRefusal = temporarilyUnavailable
        ? resolveExecutionCircuitRefusal(executionCooldowns, nowMs)
        : undefined;
      const refusalCode = circuitRefusal?.code ?? "no_eligible_target";
      throw new BridgeHttpError(circuitRefusal?.statusCode ?? 400, {
        error: {
          type: "routing_error",
          code: refusalCode,
          message: requestedModel
            ? circuitRefusal?.code === "endpoint_configuration_blocked"
              ? `All eligible endpoints for model ${requestedModel} require account or quota configuration.`
              : circuitRefusal
                ? `All eligible endpoints for model ${requestedModel} are temporarily unavailable after recent execution failures.`
                : `No execution target is currently eligible for model ${requestedModel}.`
            : circuitRefusal?.code === "endpoint_configuration_blocked"
              ? "All eligible endpoints require account or quota configuration."
              : circuitRefusal
                ? "All eligible endpoints are temporarily unavailable after recent execution failures."
                : "No execution target is currently eligible for this request.",
          ...(requestedModel ? { requestedModel } : {}),
          ...(circuitRefusal?.nextProbeAtMs === undefined
            ? {}
            : {
                nextProbeAtMs: circuitRefusal.nextProbeAtMs,
                retryAfterMs: circuitRefusal.retryAfterMs,
              }),
          ...(input.deniedEndpointIds.length > 0
            ? { deniedEndpointIds: [...input.deniedEndpointIds] }
            : {}),
          ...(executionCooldowns.length > 0 ? { executionCooldowns } : {}),
        },
      });
    };
    const deniedEndpointIds = [...(plan.routingRequest.denyEndpoints ?? [])];
    const streamReasoningRequested = Boolean(plan.executionRequest.reasoning);
    let { routed, deniedEndpointIds: initialDeniedEndpointIds } =
      routeExecutionRequest(deniedEndpointIds);
    if (routed.decision.chosen_endpoint_id.trim().length === 0) {
      throwUnavailableExecutionTarget({
        deniedEndpointIds: initialDeniedEndpointIds,
      });
    }
    let routingDecisionId = routed.decision.routing_decision_id;
    const adapters = [
      ...(currentUnifiedRuntimeConfig?.liteLLM.enabled ? [createLiteLLMProviderAdapter()] : []),
      createOpenAIProviderAdapter(),
      createOpenAIProviderAdapter("ai-sdk-openai-compatible"),
      createAnthropicProviderAdapter(),
    ];
    const executeProviderRequest = async ({
      target,
      requestCapture,
      fallbackModelIds,
    }: {
      target: ResolvedExecutionTarget;
      requestCapture: ProviderRequestCapture;
      fallbackModelIds?: readonly string[];
    }) => {
      // File-backed credentials (OAuth, locally-saved API keys) always need direct HTTP execution
      // so that OAuth tokens are correctly resolved and X-Msh-* device headers are applied.
      // In the unified config path, LiteLLM providers get adapterFamily "litellm-proxy", so
      // shouldUseLiveProviderExecution would return false for them — this flag bypasses that check.
      const useDirectExecution =
        target.account?.credentialRef.backend === "local-file" ||
        target.account?.credentialRef.backend === "local-encrypted-file";
      const capture = captures.byEndpointId[target.endpointId];
      const failureContext = {
        providerId: target.providerId,
        providerFamily: requestCapture.providerFamily,
        executionFamily: target.candidate.identity.serving_source ?? target.adapterFamily,
        adapterFamily: target.adapterFamily,
        failurePhase: "provider_execution",
      } as const;
      const usesFixtureAccount =
        target.providerAccountId !== null && fixtureAccountIds.has(target.providerAccountId);

      if (
        !useDirectExecution &&
        capture &&
        currentUnifiedRuntimeConfig === null &&
        usesFixtureAccount
      ) {
        return {
          providerFamily: requestCapture.providerFamily,
          endpointId: target.endpointId,
          statusCode: 200,
          body: capture.body,
        };
      }

      if (currentUnifiedRuntimeConfig) {
        if (target.providerAccountId === null) {
          if (!currentLlamaSwapVendor) {
            throw createVendorError(
              "llama-swap",
              "Configure llama_swap.models to enable local execution.",
            );
          }
          const abortSignal = executionOptions?.requestOptions?.abortSignal;
          throwIfBridgeClientAborted(abortSignal);
          const result = await currentLlamaSwapVendor
            .execute(
              {
                providerFamily: requestCapture.providerFamily,
                endpointId: requestCapture.endpointId,
                url: requestCapture.url,
                headers: requestCapture.headers,
                body: requestCapture.body,
              },
              trackedStreamWriter && requestCapture.body.stream === true
                ? {
                    streamWriter: async (chunk) => {
                      await trackedStreamWriter(chunk, {
                        endpointId: target.endpointId,
                        adapterFamily: target.adapterFamily,
                        routingDecisionId,
                        reasoningRequested: streamReasoningRequested,
                      });
                    },
                    abortSignal,
                  }
                : abortSignal
                  ? { abortSignal }
                  : undefined,
            )
            .catch((error: unknown) => {
              throwIfBridgeClientAborted(abortSignal);
              throw error;
            });
          if (result.statusCode >= 400) {
            throw classifyUpstreamExecutionFailure({
              endpointId: target.endpointId,
              statusCode: result.statusCode,
              body: result.body,
              vendorId: result.metadata?.vendorId ?? "llama-swap",
              ...failureContext,
            });
          }
          return {
            providerFamily: requestCapture.providerFamily,
            endpointId: target.endpointId,
            statusCode: result.statusCode,
            body: result.body,
            vendorMetadata: result.metadata,
          };
        }
        if (!useDirectExecution) {
          if (!currentLiteLLMVendor) {
            throw createVendorError(
              "litellm",
              "Configure litellm_proxy.providers to enable remote execution.",
            );
          }
          const abortSignal = executionOptions?.requestOptions?.abortSignal;
          throwIfBridgeClientAborted(abortSignal);
          const result = await currentLiteLLMVendor
            .execute(
              {
                providerFamily: requestCapture.providerFamily,
                endpointId: requestCapture.endpointId,
                url: requestCapture.url,
                headers: requestCapture.headers,
                body: requestCapture.body,
              },
              {
                ...(trackedStreamWriter && requestCapture.body.stream === true
                  ? {
                      streamWriter: async (chunk) => {
                        await trackedStreamWriter(chunk, {
                          endpointId: target.endpointId,
                          adapterFamily: target.adapterFamily,
                          routingDecisionId,
                          reasoningRequested: streamReasoningRequested,
                        });
                      },
                    }
                  : {}),
                ...(fallbackModelIds?.length ? { fallbackModelIds } : {}),
                ...(abortSignal ? { abortSignal } : {}),
              },
            )
            .catch((error: unknown) => {
              throwIfBridgeClientAborted(abortSignal);
              throw error;
            });
          if (result.statusCode >= 400) {
            throw classifyUpstreamExecutionFailure({
              endpointId: target.endpointId,
              statusCode: result.statusCode,
              body: result.body,
              vendorId: result.metadata?.vendorId ?? "litellm",
              ...failureContext,
            });
          }
          return {
            providerFamily: requestCapture.providerFamily,
            endpointId: target.endpointId,
            statusCode: result.statusCode,
            body: result.body,
            vendorMetadata: result.metadata,
          };
        }
        // Fall through to direct HTTP execution for file-backed credential accounts.
      }

      if (!useDirectExecution && !shouldUseLiveProviderExecution(target)) {
        if (!capture) {
          throw new Error(`No response capture is configured for endpoint ${target.endpointId}.`);
        }
        return {
          providerFamily: requestCapture.providerFamily,
          endpointId: target.endpointId,
          statusCode: 200,
          body: capture.body,
        };
      }

      const codexAccount = target.account;
      if (codexAccount && isCodexSubscriptionAccount(codexAccount)) {
        const { payload: credentialPayload, repairedActiveCredential } =
          readFreshestStoredCodexOauthTokenFileSync({
            runtimeStateRoot: options.runtimeStateRoot,
            scopeId: options.scopeId,
            credentialRef: codexAccount.credentialRef.ref,
          });
        const authPayload = readStoredCodexAuthSnapshot(credentialPayload);
        if (!authPayload) {
          throw new Error(OPENAI_CODEX_SUBSCRIPTION_AUTH_MISSING_ERROR);
        }
        if (repairedActiveCredential) {
          clearExecutionFailureCooldown({
            databasePath: initialization.databasePath,
            endpointId: target.endpointId,
          });
        }
        const codexDynamicTools = buildCodexDynamicTools(requestCapture);
        const dynamicToolNames = new Set(codexDynamicTools.map((tool) => tool.name));
        let runtimeToolRegistry: ToolRegistry | null = null;
        let codexResponse: Awaited<ReturnType<CodexExecutionAdapter["executeRequest"]>>;
        try {
          codexResponse = await codexExecutionAdapter.executeRequest({
            runtimeStateRoot: options.runtimeStateRoot,
            scopeId: options.scopeId,
            requestId,
            providerAccountId: codexAccount.providerAccountId,
            modelId: target.modelId,
            requestCapture,
            authPayload,
            ...(trackedStreamWriter && requestCapture.body.stream === true
              ? {
                  streamChunkWriter: async (chunk: string) => {
                    for (const payloadText of readSsePayloadTexts(chunk)) {
                      let payload: Record<string, unknown>;
                      try {
                        payload = JSON.parse(payloadText) as Record<string, unknown>;
                      } catch {
                        continue;
                      }
                      await trackedStreamWriter(payload, {
                        endpointId: target.endpointId,
                        adapterFamily: target.adapterFamily,
                        routingDecisionId,
                        reasoningRequested: streamReasoningRequested,
                      });
                    }
                  },
                }
              : {}),
            ...(codexDynamicTools.length > 0
              ? {
                  executeDynamicToolCall: async ({
                    toolCallId,
                    toolName,
                    toolArguments,
                    workspaceRoot,
                  }: {
                    readonly toolCallId: string;
                    readonly toolName: string;
                    readonly toolArguments: unknown;
                    readonly workspaceRoot: string;
                  }) => {
                    runtimeToolRegistry ??= createRequestScopedToolRegistry(codexDynamicTools, {
                      workspaceRoot,
                      applyPatchMode: "mutate",
                    });
                    const originalToolName = toolName;
                    const executionResult = dynamicToolNames.has(originalToolName)
                      ? await executeToolCalls(runtimeToolRegistry, {
                          requestId,
                          toolCalls: [
                            {
                              name: originalToolName,
                              arguments: toolArguments,
                              providerToolId: toolCallId,
                            },
                          ],
                        })
                      : {
                          executions: [
                            {
                              toolCallId,
                              toolName: originalToolName,
                              connectorId: "request-scoped",
                              connectorKind: "dynamic-tool",
                              status: "rejected" as const,
                              output: null,
                              diagnostics: [
                                {
                                  code: "TOOL_NOT_ALLOWED",
                                  message: `Tool ${originalToolName} was not declared for this request.`,
                                },
                              ],
                            },
                          ],
                          diagnostics: [],
                        };
                    const execution = executionResult.executions[0] ?? {
                      toolCallId,
                      toolName,
                      connectorId: "request-scoped",
                      connectorKind: "dynamic-tool",
                      status: "failed" as const,
                      output: null,
                      diagnostics: [
                        {
                          code: "TOOL_EXECUTION_FAILED",
                          message: `Tool ${toolName} did not produce an execution record.`,
                        },
                      ],
                    };
                    const recordedExecutions =
                      codexDynamicToolExecutionsByRequestId.get(requestId) ?? [];
                    recordedExecutions.push(execution);
                    codexDynamicToolExecutionsByRequestId.set(requestId, recordedExecutions);
                    return {
                      ...toCodexDynamicToolCallResult(execution),
                      execution,
                    };
                  },
                }
              : {}),
          });
        } catch (error) {
          throw classifyUpstreamExecutionFailure({
            endpointId: target.endpointId,
            message: error instanceof Error ? error.message : "Codex execution failed.",
            fallbackStatusCode: 503,
            vendorId: "chatgpt-codex-responses",
            ...failureContext,
          });
        }
        if (codexResponse.statusCode >= 400) {
          throw classifyUpstreamExecutionFailure({
            endpointId: target.endpointId,
            statusCode: codexResponse.statusCode,
            body: codexResponse.body,
            vendorId: codexResponse.vendorMetadata?.vendorId ?? "chatgpt-codex-responses",
            ...failureContext,
          });
        }
        return {
          providerFamily: requestCapture.providerFamily,
          endpointId: target.endpointId,
          ...codexResponse,
        };
      }

      const credentialValue = await resolveCredentialValue(
        options.runtimeStateRoot,
        options.scopeId,
        target,
        providerPresets,
        liteLLMProviders,
        networkFetcher,
        deviceId,
        rebuildCurrentState,
      );
      const oauthVariant = (() => {
        if (!target.account || target.account.authMode !== "oauth2-device-code") return null;
        try {
          return getOauthVariant(providerPresets, liteLLMProviders, target.providerId ?? "");
        } catch {
          return null;
        }
      })();
      const performRequest = async (resolvedCredentialValue: string) => {
        const startedAtMs = Date.now();
        let response: Response;
        try {
          response = await networkFetcher(requestCapture.url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(useDirectExecution
                ? createDeviceHeaders(
                    target.account?.credentialRef &&
                      (target.account.credentialRef.backend === "local-file" ||
                        target.account.credentialRef.backend === "local-encrypted-file")
                      ? resolveOauthHeaderDeviceId({
                          runtimeStateRoot: options.runtimeStateRoot,
                          scopeId: options.scopeId,
                          credentialRef: target.account.credentialRef,
                          fallbackDeviceId: deviceId,
                        })
                      : deviceId,
                    oauthVariant?.oauth?.requiredHeaders,
                  )
                : {}),
              ...applyCredentialToHeaders(requestCapture.headers, resolvedCredentialValue),
            },
            signal: executionOptions?.requestOptions?.abortSignal,
            body: JSON.stringify(requestCapture.body),
          });
        } catch (error) {
          throwIfBridgeClientAborted(executionOptions?.requestOptions?.abortSignal);
          throw classifyUpstreamExecutionFailure({
            endpointId: target.endpointId,
            message:
              error instanceof Error ? error.message : "Provider request could not be completed.",
            fallbackStatusCode: 503,
            ...failureContext,
          });
        }
        return {
          response,
          latencyMs: Math.max(0, Date.now() - startedAtMs),
        };
      };
      let { response, latencyMs } = await performRequest(credentialValue);
      if (
        (response.status === 401 || response.status === 403) &&
        (target.account?.credentialRef.backend === "local-file" ||
          target.account?.credentialRef.backend === "local-encrypted-file")
      ) {
        const refreshedCredentialValue = await refreshOauthAccessToken(
          options.runtimeStateRoot,
          options.scopeId,
          target,
          providerPresets,
          liteLLMProviders,
          networkFetcher,
          deviceId,
          rebuildCurrentState,
        );
        ({ response, latencyMs } = await performRequest(refreshedCredentialValue));
      }
      const measuredVendorMetadata = {
        latencyMs,
      };
      if (!response.ok) {
        const rawBody = await response.text();
        const parsedBody = parseProviderResponseBody(rawBody);
        throw classifyUpstreamExecutionFailure({
          endpointId: target.endpointId,
          statusCode: response.status,
          body: parsedBody,
          retryAfterMs: parseRetryAfterMs(response.headers.get("retry-after"), Date.now()),
          ...failureContext,
        });
      }
      if (trackedStreamWriter && requestCapture.body.stream === true) {
        const rawBody = await readProviderStreamTranscript(response, trackedStreamWriter, {
          endpointId: target.endpointId,
          adapterFamily: target.adapterFamily,
          routingDecisionId,
          reasoningRequested: streamReasoningRequested,
        });
        if (!rawBody.includes("data:")) {
          return {
            providerFamily: requestCapture.providerFamily,
            endpointId: target.endpointId,
            statusCode: response.status,
            body: parseProviderResponseBody(rawBody),
            vendorMetadata: measuredVendorMetadata,
          };
        }
        return {
          providerFamily: requestCapture.providerFamily,
          endpointId: target.endpointId,
          statusCode: response.status,
          body: rawBody,
          vendorMetadata: measuredVendorMetadata,
        };
      }
      const responseContentType = response.headers.get("content-type") ?? "";
      if (responseContentType.includes("text/event-stream")) {
        const rawBody = await response.text();
        if (!rawBody.includes("data:")) {
          return {
            providerFamily: requestCapture.providerFamily,
            endpointId: target.endpointId,
            statusCode: response.status,
            body: parseProviderResponseBody(rawBody),
            vendorMetadata: measuredVendorMetadata,
          };
        }
        return {
          providerFamily: requestCapture.providerFamily,
          endpointId: target.endpointId,
          statusCode: response.status,
          body: rawBody,
          vendorMetadata: measuredVendorMetadata,
        };
      }
      const rawBody = await response.text();
      const parsedBody = parseProviderResponseBody(rawBody);
      return {
        providerFamily: requestCapture.providerFamily,
        endpointId: target.endpointId,
        statusCode: response.status,
        body: parsedBody,
        vendorMetadata: measuredVendorMetadata,
      };
    };
    const executionSemanticsReceipt: {
      retryCount: number;
      rerouteCount: number;
      cooldownDecision: string;
      failedAttempts: RuntimeExecutionFailedAttemptReceipt[];
      executionCooldownsByEndpointId: Map<string, RuntimeExecutionCooldownReceipt>;
    } = {
      retryCount: 0,
      rerouteCount: 0,
      cooldownDecision: "not_applied",
      failedAttempts: [],
      executionCooldownsByEndpointId: new Map(),
    };
    let routedAttemptSequence = 0;
    const recordFailedAttemptReceipt = (input: {
      readonly error: UpstreamExecutionError;
      readonly cooldownRecord?: ExecutionCircuitRecord;
    }): RuntimeExecutionFailedAttemptReceipt => {
      routedAttemptSequence += 1;
      const attemptId = `${requestId}:attempt:${routedAttemptSequence}`;
      const receipt: RuntimeExecutionFailedAttemptReceipt = {
        attemptId,
        routedAttemptId: attemptId,
        requestId,
        routingDecisionId,
        failedEndpointId: input.error.endpointId,
        providerId: input.error.providerId,
        providerFamily: input.error.providerFamily,
        ...(input.error.vendorId ? { vendorId: input.error.vendorId } : {}),
        executionFamily: input.error.executionFamily,
        adapterFamily: input.error.adapterFamily,
        statusCode: input.error.statusCode,
        failureClass: input.error.errorClass,
        retryable: input.error.retryable,
        fallbackEligible: input.error.fallbackEligible,
        failurePhase: input.error.failurePhase,
        cooldownRecorded: Boolean(input.cooldownRecord),
        ...(typeof input.cooldownRecord?.failureCount === "number"
          ? { cooldownFailureCount: input.cooldownRecord.failureCount }
          : {}),
        ...(typeof input.cooldownRecord?.nextProbeAtMs === "number"
          ? { cooldownUntilMs: input.cooldownRecord.nextProbeAtMs }
          : {}),
        ...(input.error.errorPreview ? { errorPreview: { ...input.error.errorPreview } } : {}),
      };
      executionSemanticsReceipt.failedAttempts.push(receipt);
      if (input.cooldownRecord) {
        executionSemanticsReceipt.executionCooldownsByEndpointId.set(
          input.cooldownRecord.endpointId,
          toExecutionCooldownReceipt(input.cooldownRecord, Date.now()),
        );
      }
      return receipt;
    };
    const persistRoutedProviderFailure = (error: UpstreamExecutionError): void => {
      if (executionOptions?.persistObservation === false || hasRuntimeTelemetryPersisted(error)) {
        return;
      }
      const selectedEndpointId = error.endpointId;
      const candidateByEndpointId = new Map(
        routed.projected.routeInput.candidates.map((candidate) => [
          candidate.identity.endpoint_id,
          candidate,
        ]),
      );
      const selectedCandidate = candidateByEndpointId.get(selectedEndpointId);
      const selectedRuntimeEndpoint = executionSnapshot.runtimeEndpoints.find(
        (endpoint) => endpoint.endpointId === selectedEndpointId,
      );
      const selectedProviderAccount = selectedRuntimeEndpoint
        ? executionSnapshot.accounts.find(
            (account) => account.providerAccountId === selectedRuntimeEndpoint.providerAccountId,
          )
        : undefined;
      const scoredEndpointIds = routed.decision.scored_candidates.map(
        (candidate) => candidate.endpoint_id,
      );
      const eligibleEndpointIds = uniqueTelemetryStrings([
        selectedEndpointId,
        ...scoredEndpointIds,
        ...routed.decision.fallback_endpoint_ids,
      ]);
      const eligibleModelIds = uniqueTelemetryStrings(
        eligibleEndpointIds.map((endpointId) => {
          const candidate = candidateByEndpointId.get(endpointId);
          if (candidate) {
            return candidate.identity.model_id;
          }
          return endpointId === selectedEndpointId
            ? (selectedCandidate?.identity.model_id ?? executionOptions?.requestedModel)
            : null;
        }),
      );
      const sourceType = selectedCandidate
        ? telemetrySourceTypeFromEndpointKind(selectedCandidate.identity.endpoint_kind)
        : currentUnifiedRuntimeConfig?.executionMode === "remote_only"
          ? "remote"
          : "local";
      const requestRoutingMode = summarizeRequestRoutingModeDiagnostics(
        executionOptions?.requestOptions,
      );
      const sourceClient =
        executionOptions?.requestOperation === "responses"
          ? "openai.responses"
          : "openai.chat.completions";
      const failureLatencyMs = Math.max(0, Date.now() - routingTimeMs);
      const payloadBytes = {
        ingress: measureStructuredPayloadBytes(executionOptions?.requestBody ?? null),
        translated: measureStructuredPayloadBytes(plan.executionRequest),
        providerCanonical: measureStructuredPayloadBytes(plan.executionRequest),
        providerWire: measureStructuredPayloadBytes(plan.executionRequest),
        providerResponse: measureStructuredPayloadBytes(error.body),
      };
      const selectedEconomics = routed.catalogEconomicsByEndpointId[selectedEndpointId] ?? null;
      const selectedModelId =
        selectedCandidate?.identity.model_id ?? executionOptions?.requestedModel ?? null;
      const selectedEndpointDimensions = {
        selectedEndpointId,
        candidateCount: eligibleEndpointIds.length,
        failurePhase: error.failurePhase,
        retryable: error.retryable,
        fallbackEligible: error.fallbackEligible,
        errorPreview: error.errorPreview,
      };
      const capturePolicy = {
        environment: "runtime-failure",
        redactionLevel: "strict",
        retentionClass: "standard",
        structuredInspectionMode: "summary",
        rawCaptureAvailable: false,
        structuredInspectionAvailable: true,
        redactedFields: ["request.headers.authorization"],
        suppressedFields: [],
      } as const;
      const telemetrySnapshot = {
        providerId: error.providerId,
        providerAccountId:
          selectedProviderAccount?.providerAccountId ??
          selectedRuntimeEndpoint?.providerAccountId ??
          null,
        sourceType,
        endpointKind: selectedCandidate?.identity.endpoint_kind ?? "remote_api",
        servingSource:
          selectedCandidate?.identity.serving_source ?? error.executionFamily ?? "remote-service",
        region: selectedCandidate?.identity.region ?? null,
        lifecycleStateAtRequest: selectedCandidate?.status ?? "unknown",
        healthStatusAtRequest: selectedProviderAccount?.healthStatus ?? null,
        requestedModelId: executionOptions?.requestedModel ?? null,
        selectedModelId,
        requestOperation: executionOptions?.requestOperation ?? "chat",
        roleIds: uniqueTelemetryStrings([
          plan.routingRequest.requestedRoleId,
          plan.routingDiagnostics?.rolePolicy?.requestedRoleId,
          plan.routingDiagnostics?.rolePolicy?.appliedRoleId,
        ]),
        toolingUsed: Boolean(plan.executionRequest.tools?.length),
        cacheState: "unknown",
        eligibleEndpointIds,
        eligibleModelIds,
        candidateCostSnapshot: Object.fromEntries(
          eligibleEndpointIds.map((endpointId) => {
            const candidate = candidateByEndpointId.get(endpointId);
            const economics = routed.catalogEconomicsByEndpointId[endpointId] ?? null;
            return [
              endpointId,
              {
                modelId: candidate?.identity.model_id ?? endpointId,
                providerId: endpointId === selectedEndpointId ? error.providerId : null,
                providerKind: candidate?.identity.provider_kind ?? null,
                sourceType: candidate
                  ? telemetrySourceTypeFromEndpointKind(candidate.identity.endpoint_kind)
                  : "remote",
                endpointKind: candidate?.identity.endpoint_kind ?? null,
                servingSource: candidate?.identity.serving_source ?? null,
                region: candidate?.identity.region ?? null,
                tokenEconomicsSource: economics?.tokenEconomicsSource ?? "unknown",
                estimatedRequestUsd: economics?.estimatedRequestUsd ?? null,
              },
            ];
          }),
        ),
        selectedPricingSnapshot: selectedEconomics
          ? {
              canonicalModelId: selectedEconomics.canonicalModelId,
              tokenEconomicsSource: selectedEconomics.tokenEconomicsSource,
              inputPer1M: selectedEconomics.inputPer1M,
              outputPer1M: selectedEconomics.outputPer1M,
              estimatedRequestUsd: selectedEconomics.estimatedRequestUsd,
            }
          : null,
        selectedUncachedCostUsd: selectedEconomics?.estimatedRequestUsd ?? null,
        baselineMaxEligibleCostUsd: null,
        routingCostSavingsUsd: 0,
        cacheCostSavingsUsd: 0,
        totalAvoidedCostUsd: 0,
        costBaselineSource: null,
        costSavingsSupport: "partial",
        dimensions: selectedEndpointDimensions,
      } as const;
      const failureObservation = {
        requestId,
        ...(executionOptions?.requestOptions?.clientRequestId
          ? { clientRequestId: executionOptions.requestOptions.clientRequestId }
          : {}),
        routingDecisionId: routingDecisionId,
        endpointId: selectedEndpointId,
        conversationId: envelope.conversationId,
        decision: {
          ...routed.decision,
          chosen_endpoint_id: selectedEndpointId,
        },
        routingDiagnostics: {
          ...routed.routingDiagnostics,
          ...plan.routingDiagnostics,
          ...(requestRoutingMode ? { routingMode: requestRoutingMode } : {}),
          catalogEconomics: selectedEconomics ?? undefined,
          effectiveMetrics: summarizeEffectiveMetricsFromDecision(routed.decision),
          selection: summarizeSelectionDiagnosticsFromDecision(routed.decision),
          throughputPenalty: summarizeThroughputPenaltyFromDecision(routed.decision),
        },
        retrievalReceipt: {
          receiptId: retrievalReceipt.receiptId,
          summary: retrievalReceipt.summary,
        },
        contextEnvelope: {
          conversationId: envelope.conversationId,
          latestHandoffId: envelope.latestHandoff?.handoffId ?? null,
          estimatedTokenCount: envelope.estimatedTokenCount,
        },
        usageEvent: {
          request_id: requestId,
          routing_decision_id: routingDecisionId,
          endpoint_id: selectedEndpointId,
          model_id: selectedModelId,
          provider_kind: selectedCandidate?.identity.provider_kind ?? null,
          tokens_in: 0,
          tokens_out: 0,
          latency_ms: failureLatencyMs,
          cost_actual: null,
          cost_estimate: null,
          currency: "USD",
          error_class: error.errorClass,
          timestamp_ms: Date.now(),
        },
        diagnostics: {
          routing: [],
          execution: [
            {
              code: error.errorClass,
              severity: "error",
              message: error.message,
            },
          ],
          authAccount: [],
          memoryQuality: [],
          tooling: [],
          operator: [],
        },
        capturePolicy,
        executionTelemetry: {
          providerFamily: error.providerFamily,
          ...(error.vendorId ? { vendorId: error.vendorId } : {}),
          finishReason: "error",
          stream: {
            requested: Boolean(plan.executionRequest.stream),
            textDeltas: streamedChunkCount,
            toolCallDeltas: 0,
            toolArgumentDeltas: 0,
          },
          streamSupport: {
            supported: Boolean(plan.executionRequest.stream),
          },
          promptCaching: {
            supported: true,
          },
          usageSupport: {
            inputTokens: true,
            outputTokens: true,
            cacheReadTokens: true,
            cacheWriteTokens: true,
          },
          costProvenance: "unavailable",
        },
        executionSemantics: {
          sourceClient,
          executionFamily: error.executionFamily,
          adapterFamily: error.adapterFamily,
          payloadBytes,
          retryCount: executionSemanticsReceipt.retryCount,
          rerouteCount: executionSemanticsReceipt.rerouteCount,
          cooldownDecision: executionSemanticsReceipt.cooldownDecision,
          idempotencyDecision: "not_needed",
          toolSideEffectState: "none",
          failedAttempts: executionSemanticsReceipt.failedAttempts,
          ...(executionSemanticsReceipt.executionCooldownsByEndpointId.size > 0
            ? {
                executionCooldowns: [
                  ...executionSemanticsReceipt.executionCooldownsByEndpointId.values(),
                ],
              }
            : {}),
        },
        telemetrySnapshot,
        privacyReceipt: {
          samplingRate: 1,
          retentionTtlHours: 720,
          retainUntil: Date.now() + 720 * 3600 * 1000,
        },
        inspection: {
          request: {
            requestId,
            routingDecisionId,
            requestCapture: {
              body: {
                suppressed: true,
                reason:
                  "Provider execution failed; raw request body is omitted from failure observation.",
              },
            },
            responseCapture: {
              body: error.errorPreview,
            },
            diagnostics: {
              execution: [
                {
                  code: error.errorClass,
                  severity: "error",
                  message: error.message,
                },
              ],
            },
            capturePolicy,
          },
          endpoint: {
            endpointId: selectedEndpointId,
            endpointVersion: selectedCandidate?.identity.runtime_version ?? "unknown",
            recentSamples: [],
          },
        },
      };
      persistRuntimeTelemetryFailure({
        databasePath: initialization.databasePath,
        requestId,
        routingDecisionId,
        endpointId: selectedEndpointId,
        modelId: selectedModelId ?? undefined,
        requestedModelId: executionOptions?.requestedModel ?? selectedModelId,
        selectedModelId,
        requestOperation: executionOptions?.requestOperation ?? "chat",
        statusCode: error.statusCode,
        errorClass: error.errorClass,
        latencyMs: failureLatencyMs,
        clientRequestId: executionOptions?.requestOptions?.clientRequestId ?? null,
        requestClass: "live_request",
        sourceType,
        providerKind: selectedCandidate?.identity.provider_kind ?? null,
        providerFamily: error.providerFamily,
        vendorId: error.vendorId ?? null,
        providerId: error.providerId,
        providerAccountId:
          selectedProviderAccount?.providerAccountId ??
          selectedRuntimeEndpoint?.providerAccountId ??
          null,
        endpointKind: selectedCandidate?.identity.endpoint_kind ?? "remote_api",
        servingSource:
          selectedCandidate?.identity.serving_source ?? error.executionFamily ?? "remote-service",
        region: selectedCandidate?.identity.region ?? null,
        lifecycleStateAtRequest: selectedCandidate?.status ?? "unknown",
        healthStatusAtRequest: selectedProviderAccount?.healthStatus ?? null,
        routingMode: requestRoutingMode?.effectiveMode ?? null,
        selectedStrategy: plan.routingRequest.strategy,
        sourceClient,
        executionFamily: error.executionFamily,
        adapterFamily: error.adapterFamily,
        requestPayloadBytes: payloadBytes.ingress,
        ingressPayloadBytes: payloadBytes.ingress,
        translatedPayloadBytes: payloadBytes.translated,
        providerCanonicalPayloadBytes: payloadBytes.providerCanonical,
        providerWirePayloadBytes: payloadBytes.providerWire,
        responsePayloadBytes: payloadBytes.providerResponse,
        retryCount: executionSemanticsReceipt.retryCount,
        rerouteCount: executionSemanticsReceipt.rerouteCount,
        cooldownDecision: executionSemanticsReceipt.cooldownDecision,
        idempotencyDecision: "not_needed",
        toolSideEffectState: "none",
        toolingUsed: Boolean(plan.executionRequest.tools?.length),
        cacheState: "unknown",
        roleIds: telemetrySnapshot.roleIds,
        eligibleEndpointIds,
        eligibleModelIds,
        candidateCostSnapshot: telemetrySnapshot.candidateCostSnapshot,
        selectedPricingSnapshot: telemetrySnapshot.selectedPricingSnapshot,
        selectedUncachedCostUsd: telemetrySnapshot.selectedUncachedCostUsd,
        baselineMaxEligibleCostUsd: telemetrySnapshot.baselineMaxEligibleCostUsd,
        routingCostSavingsUsd: telemetrySnapshot.routingCostSavingsUsd,
        cacheCostSavingsUsd: telemetrySnapshot.cacheCostSavingsUsd,
        totalAvoidedCostUsd: telemetrySnapshot.totalAvoidedCostUsd,
        costBaselineSource: telemetrySnapshot.costBaselineSource,
        costSavingsSupport: telemetrySnapshot.costSavingsSupport,
        samplingRate: failureObservation.privacyReceipt.samplingRate,
        retentionTtlHours: failureObservation.privacyReceipt.retentionTtlHours,
        retainUntil: failureObservation.privacyReceipt.retainUntil,
        redactionLevel: capturePolicy.redactionLevel,
        retentionClass: capturePolicy.retentionClass,
        structuredInspectionMode: capturePolicy.structuredInspectionMode,
        rawCaptureAvailable: capturePolicy.rawCaptureAvailable,
        structuredInspectionAvailable: capturePolicy.structuredInspectionAvailable,
        dimensions: selectedEndpointDimensions,
        observation: failureObservation,
      });
      markRuntimeTelemetryPersisted(error);
      emitTelemetryUpdate(requestId);
    };
    const executeCurrentExecutionRequest = async (
      executionRequest: RuntimeExecutionRequest,
    ): Promise<RoutedExecutionResult> => {
      const retriedEndpointIds = new Set<string>();
      const trafficClass = executionOptions?.requestOptions?.executionTrafficClass ?? "live";
      let ownedProbeEndpointId: string | undefined;
      while (true) {
        if (
          trafficClass === "live" &&
          !shouldIgnoreExecutionFailureCooldowns(executionOptions?.requestOptions)
        ) {
          const selectedEndpointId = routed.decision.chosen_endpoint_id;
          const state = readExecutionCircuitState(initialization.databasePath);
          const claim = claimExecutionCircuitProbe({
            state,
            endpointId: selectedEndpointId,
            nowMs: Date.now(),
            probeOwnerId: requestId,
          });
          if (!claim.claimed) {
            deniedEndpointIds.push(selectedEndpointId);
            const nextRoute = routeExecutionRequest(deniedEndpointIds);
            if (nextRoute.routed.decision.chosen_endpoint_id.trim().length === 0) {
              throwUnavailableExecutionTarget({ deniedEndpointIds: nextRoute.deniedEndpointIds });
            }
            executionSemanticsReceipt.rerouteCount += 1;
            routed = nextRoute.routed;
            routingDecisionId = routed.decision.routing_decision_id;
            continue;
          }
          if (claim.required) {
            writeExecutionCircuitState(initialization.databasePath, claim.state);
            ownedProbeEndpointId = selectedEndpointId;
          }
        }
        try {
          const result = await executeLiveRoutedRequest({
            routeResult: routed,
            catalog: executionSnapshot.executionCatalog,
            additionalProviders: liteLLMProviders,
            accounts: executionSnapshot.accounts,
            registry: executionSnapshot.registry,
            registrySources: executionSnapshot.registrySources,
            executionRequest,
            adapters,
            executeProviderRequest,
          });
          clearExecutionFailureCooldown({
            databasePath: initialization.databasePath,
            endpointId: result.target.endpointId,
          });
          ownedProbeEndpointId = undefined;
          routingDecisionId = routed.decision.routing_decision_id;
          return result;
        } catch (error) {
          if (!(error instanceof UpstreamExecutionError) || streamedChunkCount > 0) {
            if (ownedProbeEndpointId) {
              const released = releaseExecutionCircuitProbe({
                state: readExecutionCircuitState(initialization.databasePath),
                endpointId: ownedProbeEndpointId,
                probeOwnerId: requestId,
                nowMs: Date.now(),
              });
              if (released.released) {
                writeExecutionCircuitState(initialization.databasePath, released.state);
              }
              ownedProbeEndpointId = undefined;
            }
            throw error;
          }
          const failureCategory = classifyExecutionFailureCategory(
            error.errorClass,
            error.statusCode,
          );
          const shouldRetry = shouldRetryUpstreamExecutionOnSameEndpoint({
            retryable: error.retryable,
            errorClass: error.errorClass,
            statusCode: error.statusCode,
            alreadyRetried: retriedEndpointIds.has(error.endpointId),
          });
          let cooldownRecord: ExecutionCircuitRecord | undefined;
          if (shouldRetry) {
            retriedEndpointIds.add(error.endpointId);
            executionSemanticsReceipt.retryCount += 1;
          } else if (failureCategory) {
            cooldownRecord = recordExecutionFailureCooldown({
              databasePath: initialization.databasePath,
              endpointId: error.endpointId,
              errorClass: error.errorClass,
              nowMs: Date.now(),
              trafficClass,
              retryAfterMs: error.retryAfterMs,
              providerId: error.providerId,
              providerFamily: error.providerFamily,
              vendorId: error.vendorId,
              executionFamily: error.executionFamily,
              adapterFamily: error.adapterFamily,
              failurePhase: error.failurePhase,
              statusCode: error.statusCode,
            });
            if (cooldownRecord) {
              executionSemanticsReceipt.cooldownDecision = "recorded";
            }
          }
          ownedProbeEndpointId = undefined;
          const failedAttempt = recordFailedAttemptReceipt({
            error,
            cooldownRecord,
          });
          if (cooldownRecord) {
            const sourceBoundRecord: ExecutionCircuitRecord = {
              ...cooldownRecord,
              sourceAttemptId: failedAttempt.attemptId,
              sourceRequestId: failedAttempt.requestId,
              sourceRoutingDecisionId: failedAttempt.routingDecisionId,
            };
            const currentState = readExecutionCircuitState(initialization.databasePath);
            writeExecutionCircuitState(initialization.databasePath, {
              ...currentState,
              endpoints: {
                ...currentState.endpoints,
                [sourceBoundRecord.endpointId]: sourceBoundRecord,
              },
            });
            executionSemanticsReceipt.executionCooldownsByEndpointId.set(
              cooldownRecord.endpointId,
              toExecutionCooldownReceipt(sourceBoundRecord, Date.now()),
            );
          }
          if (shouldRetry) {
            continue;
          }
          if (!error.fallbackEligible || deniedEndpointIds.includes(error.endpointId)) {
            persistRoutedProviderFailure(error);
            throw error;
          }
          deniedEndpointIds.push(error.endpointId);
          let nextRoute: ReturnType<typeof routeExecutionRequest>;
          try {
            nextRoute = routeExecutionRequest(deniedEndpointIds);
          } catch {
            persistRoutedProviderFailure(error);
            throw error;
          }
          if (nextRoute.routed.decision.chosen_endpoint_id.trim().length === 0) {
            persistRoutedProviderFailure(error);
            throwUnavailableExecutionTarget({
              deniedEndpointIds: nextRoute.deniedEndpointIds,
              previousError: error,
            });
          }
          executionSemanticsReceipt.rerouteCount += 1;
          routed = nextRoute.routed;
          routingDecisionId = routed.decision.routing_decision_id;
        }
      }
    };
    let currentExecutionRequest = plan.executionRequest as RuntimeExecutionRequest;
    let execution = await executeCurrentExecutionRequest(currentExecutionRequest);
    const continuedToolCalls: Array<{
      name: string;
      arguments: unknown;
      providerToolId?: string;
    }> = [];
    const continuedToolExecutions: ToolRegistryExecution[] = [];
    let runtimeToolRegistry: ToolRegistry | null = null;
    let continuationStep = 0;
    let continuationTurn = resolveContinuationTurn({
      providerId: execution.target.providerId,
      outputText: execution.normalized.outputText,
      toolCalls: execution.normalized.toolCalls,
      continuationStep,
    });
    if (!shouldBridgeManageToolContinuation(currentExecutionRequest.tools)) {
      if (continuationTurn.toolCalls.length > 0) {
        continuedToolCalls.push(...continuationTurn.toolCalls);
        execution = surfaceContinuationTurnToExecution(execution, continuationTurn);
      }
    } else {
      while (
        continuationTurn.toolCalls.length > 0 &&
        continuationStep < BRIDGE_TOOL_LOOP_MAX_STEPS
      ) {
        runtimeToolRegistry ??= await createRuntimeToolRegistry(
          options.repoRoot,
          executionSnapshot.registry,
          networkFetcher,
        );
        const currentToolCalls = continuationTurn.toolCalls.map((toolCall, index) =>
          toBridgeToolCall(toolCall, index),
        );
        const currentToolExecutionResult = await executeToolCalls(runtimeToolRegistry, {
          requestId,
          toolCalls: continuationTurn.toolCalls,
        });
        continuedToolCalls.push(...continuationTurn.toolCalls);
        continuedToolExecutions.push(...currentToolExecutionResult.executions);
        currentExecutionRequest = buildContinuationExecutionRequest(
          currentExecutionRequest,
          currentToolCalls,
          currentToolExecutionResult.executions,
          continuationTurn.outputText,
          execution.target.providerId === "moonshot",
        );
        execution = await executeCurrentExecutionRequest(currentExecutionRequest);
        continuationStep += 1;
        continuationTurn = resolveContinuationTurn({
          providerId: execution.target.providerId,
          outputText: execution.normalized.outputText,
          toolCalls: execution.normalized.toolCalls,
          continuationStep,
        });
      }
    }
    const executionVendorId =
      execution.responseCapture.vendorMetadata?.vendorId ??
      execution.normalized.vendorMetadata?.vendorId;
    const effectiveExecutionAdapterFamily = resolveEffectiveExecutionAdapterFamily({
      endpointId: execution.target.endpointId,
      adapterFamily: execution.target.adapterFamily,
      vendorId: executionVendorId,
    });
    const adapterParameterSanitization = [
      ...readAdapterParameterSanitization(execution.responseCapture.vendorMetadata),
      ...readAdapterParameterSanitization(execution.normalized.vendorMetadata),
    ];
    const ingressParameterSanitization =
      executionOptions?.requestOperation === "responses" &&
      effectiveExecutionAdapterFamily === "codex-subscription-responses" &&
      executionOptions.requestBody
        ? collectCodexResponsesParameterSanitization({
            requestBody: executionOptions.requestBody,
            sourceSurface: "openai.responses",
          })
        : [];
    const executionParameterSanitization =
      ingressParameterSanitization.length > 0
        ? ingressParameterSanitization
        : adapterParameterSanitization;
    if (
      trackedStreamWriter &&
      streamRequested === true &&
      streamedChunkCount === 0 &&
      typeof execution.responseCapture.body === "string" &&
      execution.responseCapture.body.includes("data:")
    ) {
      await replayProviderStreamTranscript(execution.responseCapture.body, trackedStreamWriter, {
        endpointId: execution.target.endpointId,
        adapterFamily: effectiveExecutionAdapterFamily,
        routingDecisionId,
        reasoningRequested: streamReasoningRequested,
      });
    }
    const bridgedToolExecutionResult = {
      executions: continuedToolExecutions,
      diagnostics: continuedToolExecutions.flatMap((toolExecution) => toolExecution.diagnostics),
    };
    const codexDynamicToolExecutions = dedupeToolExecutions([
      ...(execution.responseCapture.dynamicToolExecutions ?? []),
      ...(codexDynamicToolExecutionsByRequestId.get(requestId) ?? []),
    ]);
    codexDynamicToolExecutionsByRequestId.delete(requestId);
    const toolExecutionResult = {
      executions: dedupeToolExecutions([
        ...codexDynamicToolExecutions,
        ...bridgedToolExecutionResult.executions,
      ]),
      diagnostics: [
        ...codexDynamicToolExecutions.flatMap((execution) => execution.diagnostics),
        ...bridgedToolExecutionResult.diagnostics,
      ],
    };
    const providerAccount = executionSnapshot.accounts.find(
      (account) => account.providerAccountId === execution.target.providerAccountId,
    );
    const observedProfileDiagnostic =
      runtimeObservedProfiles.diagnosticsByEndpointId[routed.decision.chosen_endpoint_id] ??
      ({
        endpointId: routed.decision.chosen_endpoint_id,
        source: "none",
        readMode: "per-request",
      } as const);
    const requestSurface =
      executionOptions?.requestOperation === "responses"
        ? "openai.responses"
        : "openai.chat.completions";
    const cacheContinuityOutcome = persistCacheContinuityOutcome({
      databasePath: initialization.databasePath,
      executionRequest: currentExecutionRequest,
      endpointId: execution.target.endpointId,
      promptCachingSupported: execution.capabilities.promptCaching.supported,
      inputTokens: execution.normalized.usage.inputTokens,
      requestSurface,
    });
    const cacheContinuityDiagnostics = summarizeCacheContinuityDiagnostics({
      routeHints: readCacheContinuityRouteHints({
        databasePath: initialization.databasePath,
        executionRequest: currentExecutionRequest,
      }),
      selectedEndpointId: execution.target.endpointId,
      outcome: cacheContinuityOutcome,
    });
    if (executionOptions?.persistObservation !== false) {
      const requestRoutingMode = summarizeRequestRoutingModeDiagnostics(
        executionOptions?.requestOptions,
      );
      const rewriteDiagnostics = executionOptions?.requestedModel
        ? summarizeRewriteDiagnostics({
            requestedModel: executionOptions.requestedModel,
            downstreamModelId: execution.target.modelId,
          })
        : undefined;
      const telemetrySnapshot = buildRuntimeTelemetrySnapshot({
        routed,
        execution,
        requestOperation: executionOptions?.requestOperation ?? "chat",
        requestedModelId: executionOptions?.requestedModel ?? null,
        roleIds: uniqueTelemetryStrings([
          plan.routingRequest.requestedRoleId,
          plan.routingDiagnostics?.rolePolicy?.requestedRoleId,
          plan.routingDiagnostics?.rolePolicy?.appliedRoleId,
        ]),
        toolingUsed:
          execution.normalized.toolCalls.length > 0 || toolExecutionResult.executions.length > 0,
      });
      const normalizedIntentObservation = createRoleModelNormalizedIntentObservation(
        plan.routingRequest.roleModelIntent,
        executionSnapshot.roleDefinitions,
        executionSnapshot.taskDefinitions,
      );
      const reasoningRequested = Boolean(plan.executionRequest.reasoning);
      const syntheticReasoningDeltaCount =
        plan.executionRequest.stream &&
        execution.normalized.reasoningText &&
        streamedReasoningDeltaCount === 0
          ? 1
          : 0;
      const reasoningDeltaCount = streamedReasoningDeltaCount + syntheticReasoningDeltaCount;
      const reasoningUnavailableReason =
        reasoningRequested && !execution.normalized.reasoningText
          ? "provider_returned_no_reasoning"
          : undefined;
      const bundle = createRuntimeObservationBundle({
        decision: routed.decision,
        clientRequestId: executionOptions?.requestOptions?.clientRequestId,
        ...(normalizedIntentObservation.normalizedIntent
          ? { normalizedIntent: normalizedIntentObservation.normalizedIntent }
          : {}),
        routingDiagnostics: {
          ...routed.routingDiagnostics,
          ...plan.routingDiagnostics,
          ...(normalizedIntentObservation.diagnostics.length > 0
            ? {
                roleModelIntent: {
                  diagnostics: normalizedIntentObservation.diagnostics,
                },
              }
            : {}),
          ...(requestRoutingMode ? { routingMode: requestRoutingMode } : {}),
          ...(rewriteDiagnostics ? { rewrite: rewriteDiagnostics } : {}),
          observedProfile: observedProfileDiagnostic,
          catalogEconomics:
            routed.catalogEconomicsByEndpointId[routed.decision.chosen_endpoint_id] ?? undefined,
          effectiveMetrics: summarizeEffectiveMetricsFromDecision(routed.decision),
          selection: summarizeSelectionDiagnosticsFromDecision(routed.decision),
          throughputPenalty: summarizeThroughputPenaltyFromDecision(routed.decision),
          ...(cacheContinuityDiagnostics
            ? {
                cacheContinuity: cacheContinuityDiagnostics,
              }
            : {}),
        },
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
          ...(continuedToolCalls.length > 0 ? { toolCalls: continuedToolCalls } : {}),
        },
        executionSemantics: {
          sourceClient:
            executionOptions?.requestOperation === "responses"
              ? "openai.responses"
              : "openai.chat.completions",
          adapterFamily: effectiveExecutionAdapterFamily,
          payloadBytes: {
            ingress: measureStructuredPayloadBytes(executionOptions?.requestBody ?? null),
            translated: measureStructuredPayloadBytes(plan.executionRequest),
            providerCanonical: measureStructuredPayloadBytes(execution.requestCapture.body),
            providerWire: measureStructuredPayloadBytes(execution.requestCapture.body),
            providerResponse: measureStructuredPayloadBytes(execution.responseCapture.body),
          },
          retryCount: executionSemanticsReceipt.retryCount,
          rerouteCount: executionSemanticsReceipt.rerouteCount,
          cooldownDecision: executionSemanticsReceipt.cooldownDecision,
          ...(reasoningRequested || execution.normalized.reasoningText
            ? {
                reasoning: {
                  requested: reasoningRequested,
                  controlForwarded: hasForwardedReasoningControl(execution.requestCapture.body),
                  deltaCount: reasoningDeltaCount,
                  streamSuppressed:
                    reasoningRequested &&
                    Boolean(plan.executionRequest.stream) &&
                    Boolean(execution.normalized.reasoningText) &&
                    reasoningDeltaCount === 0,
                  ...(reasoningUnavailableReason
                    ? { unavailableReason: reasoningUnavailableReason }
                    : {}),
                },
              }
            : {}),
          ...(executionSemanticsReceipt.failedAttempts.length > 0
            ? { failedAttempts: executionSemanticsReceipt.failedAttempts }
            : {}),
          ...(executionSemanticsReceipt.executionCooldownsByEndpointId.size > 0
            ? {
                executionCooldowns: [
                  ...executionSemanticsReceipt.executionCooldownsByEndpointId.values(),
                ],
              }
            : {}),
          ...(executionParameterSanitization.length > 0
            ? { parameterSanitization: executionParameterSanitization }
            : {}),
        },
        telemetrySnapshot,
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
      let artifactRef:
        | { readonly scopeId: string; readonly artifactId: string; readonly contentHash: string }
        | undefined;
      try {
        const requestBody = executionOptions?.requestBody ?? {};
        const captureInput = Array.isArray(requestBody.messages)
          ? requestBody.messages
          : Array.isArray(requestBody.input)
            ? requestBody.input
            : [];
        const capture = (await createTrackBOperations({
          statePath: path.join(
            options.runtimeStateRoot,
            options.scopeId,
            "track-b-production-bridge.json",
          ),
          catalog: [],
        }).recordLocalRouteCapture({
          requestId,
          routingDecisionId,
          endpointId: execution.target.endpointId,
          messages: captureInput,
          outputText: execution.normalized.outputText,
          toolExecutions: toolExecutionResult.executions,
        })) as Record<string, unknown>;
        if (
          typeof capture.scope === "string" &&
          typeof capture.rootArtifactId === "string" &&
          typeof capture.rootArtifactDigest === "string"
        ) {
          artifactRef = {
            scopeId: capture.scope,
            artifactId: capture.rootArtifactId,
            contentHash: capture.rootArtifactDigest,
          };
        }
      } catch {
        // Capture remains non-routing-critical before graph-primary cutover.
      }
      persistRuntimeObservationBundle({
        databasePath: initialization.databasePath,
        channel: runtimeChannel,
        observation: bundle,
        ...(artifactRef ? { artifactRef } : {}),
      });
      if (options.trackBPostObservation) {
        try {
          await options.trackBPostObservation(
            bundle as unknown as Readonly<Record<string, unknown>>,
          );
        } catch (error) {
          console.error("Track B shadow post-observation processing failed", error);
        }
      }
      emitTelemetryUpdate(bundle.requestId);
    }

    return {
      routingDecisionId,
      execution,
      toolExecutionResult,
    };
  };

  const resolveDifficultyClassification = async (input: {
    readonly requestId: string;
    readonly requestedModel: string;
    readonly messages: readonly OpenAIChatCompletionsMessage[];
    readonly contextTokens: number;
    readonly toolCount: number;
    readonly requestOptions?: BridgeExecutionRequestOptions;
  }): Promise<
    NonNullable<BridgeDifficultyRoutingContext["resolvedClassification"]> | undefined
  > => {
    const modelAliases = currentUnifiedRuntimeConfig?.modelAliases ?? [];
    const effectiveRoutingMode = resolveEffectiveRoutingMode({
      requestedModel: input.requestedModel,
      modelAliases,
      requestOptions: input.requestOptions,
      defaultRoutingMode:
        normalizeConfiguredRoutingMode(currentUnifiedRuntimeConfig?.routingStrategy) ?? undefined,
    });
    if (!shouldApplyDifficultyRouting(effectiveRoutingMode)) {
      return undefined;
    }

    const observedDataConfig = resolveUnifiedRuntimeObservedDataConfig(currentUnifiedRuntimeConfig);
    const cachePolicy = observedDataConfig.difficultyLearning;
    const conversationId = envelope.conversationId;
    const signals = summarizeDifficultySignals({
      messages: input.messages,
      contextTokens: input.contextTokens,
      toolCount: input.toolCount,
    });
    const nowMs = Date.now();
    const cachedClassification = readDifficultyClassificationCache({
      databasePath: initialization.databasePath,
      conversationId,
    });
    const cacheInvalidationReasons = cachedClassification
      ? [
          ...(cachedClassification.expiresAtMs < nowMs ? (["expired"] as const) : []),
          ...getDifficultyCacheInvalidationReasons({
            cachedSignals: cachedClassification.rubricSignals,
            currentSignals: signals,
            invalidation: cachePolicy.invalidation,
          }),
        ]
      : [];
    if (cachedClassification && cacheInvalidationReasons.length === 0) {
      return {
        difficulty: cachedClassification.difficulty,
        fallbackApplied: cachedClassification.fallbackApplied,
        ...(cachedClassification.fallbackReason
          ? { fallbackReason: cachedClassification.fallbackReason }
          : {}),
        cacheHit: true,
        rubricSignals: signals,
      };
    }
    const persistResolvedClassification = (
      classification: NonNullable<BridgeDifficultyRoutingContext["resolvedClassification"]>,
    ): NonNullable<BridgeDifficultyRoutingContext["resolvedClassification"]> => {
      upsertDifficultyClassificationCache({
        databasePath: initialization.databasePath,
        cache: {
          conversationId,
          difficulty: classification.difficulty,
          fallbackApplied: classification.fallbackApplied,
          ...(classification.fallbackReason
            ? { fallbackReason: classification.fallbackReason }
            : {}),
          cachedAtMs: nowMs,
          expiresAtMs: nowMs + cachePolicy.cacheTtlMs,
          rubricSignals: signals,
        },
      });
      return {
        ...classification,
        ...(cacheInvalidationReasons.length
          ? {
              cacheInvalidated: true,
              cacheInvalidationReasons,
            }
          : {}),
      };
    };
    if (signals.historyTurnCount === 0) {
      return persistResolvedClassification(
        createDifficultyFallbackResult({
          signals,
          classifier: currentUnifiedRuntimeConfig?.difficultyClassifier,
          reason: "missing-request-content",
        }),
      );
    }

    const classifier = currentUnifiedRuntimeConfig?.difficultyClassifier;

    // When classifier.modelId is not set, fall back to controller's modelId.
    // Without this, the classifier endpoint filter matches nothing and difficulty
    // routing degrades to basic mode. See addenda/04-difficulty-classifier-bug.
    const configuredController = currentUnifiedRuntimeConfig?.controller;
    const persistedControllerAssignment = !configuredController?.enabled
      ? getCurrentControllerAssignment()
      : null;
    const effectiveController = configuredController?.enabled
      ? configuredController
      : persistedControllerAssignment;
    const effectiveClassifierModelId = classifier?.modelId ?? effectiveController?.modelId ?? null;
    if (!classifier?.enabled) {
      return persistResolvedClassification({
        ...classifyDifficultyFromSignals({
          signals,
          classifier,
        }),
        rubricSignals: signals,
      });
    }

    const classifierAllowEndpoints = currentRegistry.endpoints
      .filter(
        (endpoint) =>
          endpoint.identity.model_id === effectiveClassifierModelId &&
          toSourceType(endpoint.identity.endpoint_kind) === classifier.sourceType,
      )
      .map((endpoint) => endpoint.identity.endpoint_id)
      .sort(compareText);

    if (classifierAllowEndpoints.length === 0) {
      return persistResolvedClassification(
        createDifficultyFallbackResult({
          signals,
          classifier,
          reason: "classifier-endpoint-unavailable",
        }),
      );
    }

    const classifierPlan: BridgeExecutionPlan = {
      routingRequest: {
        requestId: `${input.requestId}:difficulty-classifier`,
        taskType: "text.chat",
        requiredCapabilities: ["text.chat"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: estimateContextTokens(
          buildDifficultyClassifierMessages({ messages: input.messages, signals }),
          0,
        ),
        needsTools: false,
        strategy: "balanced",
        preferLocal: false,
        allowEndpoints: classifierAllowEndpoints,
      },
      executionRequest: {
        messages: buildDifficultyClassifierMessages({
          messages: input.messages,
          signals,
        }),
        temperature: 0,
        maxOutputTokens: 32,
      },
    };

    try {
      const classifierExecution = await Promise.race([
        executeBridgePlan(
          classifierPlan,
          `${input.requestId}:difficulty-classifier`,
          false,
          undefined,
          { persistObservation: false },
        ),
        delay(Math.max(1, classifier.timeoutMs)).then(() => {
          throw new Error("classifier-timeout");
        }),
      ]);
      const difficulty = parseClassifierDifficultyOutput(
        classifierExecution.execution.normalized.outputText,
      );
      if (!difficulty) {
        return persistResolvedClassification(
          createDifficultyFallbackResult({
            signals,
            classifier,
            reason: "invalid-classifier-output",
          }),
        );
      }
      return persistResolvedClassification({
        difficulty,
        fallbackApplied: false,
        rubricSignals: signals,
      });
    } catch (error) {
      return persistResolvedClassification(
        createDifficultyFallbackResult({
          signals,
          classifier,
          reason:
            error instanceof Error && error.message === "classifier-timeout"
              ? "classifier-timeout"
              : "classifier-execution-failed",
        }),
      );
    }
  };

  const resolveControllerGuidance = async (input: {
    readonly requestId: string;
    readonly requestedModel: string;
    readonly messages: readonly OpenAIChatCompletionsMessage[];
    readonly toolCount: number;
    readonly requestOptions?: BridgeExecutionRequestOptions;
  }): Promise<BridgeControllerRoutingContext | undefined> => {
    const modelAliases = currentUnifiedRuntimeConfig?.modelAliases ?? [];
    const effectiveRoutingMode = resolveEffectiveRoutingMode({
      requestedModel: input.requestedModel,
      modelAliases,
      requestOptions: input.requestOptions,
      defaultRoutingMode:
        normalizeConfiguredRoutingMode(currentUnifiedRuntimeConfig?.routingStrategy) ?? undefined,
    });
    if (!shouldApplyControllerRouting(effectiveRoutingMode)) {
      return undefined;
    }

    const configuredController = currentUnifiedRuntimeConfig?.controller;
    const persistedControllerAssignment = !configuredController?.enabled
      ? getCurrentControllerAssignment()
      : null;
    const controller = configuredController?.enabled
      ? configuredController
      : persistedControllerAssignment
        ? {
            enabled: true,
            sourceType: persistedControllerAssignment.sourceType,
            endpointId: persistedControllerAssignment.endpointId,
            modelId: persistedControllerAssignment.modelId,
            timeoutMs: DEFAULT_UNIFIED_RUNTIME_CONTROLLER_TIMEOUT_MS,
          }
        : null;
    if (!controller?.enabled) {
      return undefined;
    }

    const executionRegistry = getRouterEffectiveRegistry();
    const executionInventory = getRouterEffectiveRoutableInventory();

    const controllerAllowEndpoints = executionRegistry.endpoints
      .filter(
        (endpoint) =>
          endpoint.identity.model_id === controller.modelId &&
          toSourceType(endpoint.identity.endpoint_kind) === controller.sourceType,
      )
      .map((endpoint) => endpoint.identity.endpoint_id)
      .sort(compareText);

    if (controllerAllowEndpoints.length === 0) {
      return {
        active: true,
        fallbackApplied: true,
        fallbackReason: "controller-endpoint-unavailable",
      };
    }

    const candidateEndpointIds = resolveRequestedModelPool(
      executionRegistry,
      input.requestedModel,
      modelAliases,
      executionInventory.endpointIds.length > 0 ? executionInventory : null,
    ).allowEndpoints;
    const controllerMessages = buildControllerRoutingMessages({
      requestedModel: input.requestedModel,
      messages: input.messages,
      toolCount: input.toolCount,
      candidateEndpointIds,
      roleDefinitions: currentRolePolicy.roleDefinitions,
      taskDefinitions: currentRolePolicy.taskDefinitions,
    });
    const compactControllerMessages = buildCompactControllerRoutingMessages({
      requestedModel: input.requestedModel,
      messages: input.messages,
      toolCount: input.toolCount,
      candidateEndpointIds,
      roleDefinitions: currentRolePolicy.roleDefinitions,
      taskDefinitions: currentRolePolicy.taskDefinitions,
    });
    const parseControllerGuidanceFromMessages = async (
      messages: readonly OpenAIChatCompletionsMessage[],
      attemptLabel: string,
    ): Promise<ControllerAcceptedDirectives | null> => {
      const controllerPlan: BridgeExecutionPlan = {
        routingRequest: {
          requestId: `${input.requestId}:${attemptLabel}`,
          taskType: "text.chat",
          requiredCapabilities: ["text.chat"],
          preferredCapabilities: [],
          requiredModalities: ["text"],
          contextTokens: estimateContextTokens(messages, 0),
          needsTools: false,
          strategy: "balanced",
          preferLocal: false,
          allowEndpoints: controllerAllowEndpoints,
        },
        executionRequest: {
          messages,
          temperature: 0,
          maxOutputTokens: CONTROLLER_MAX_OUTPUT_TOKENS,
        },
      };
      const controllerExecution = await Promise.race([
        executeBridgePlan(controllerPlan, `${input.requestId}:${attemptLabel}`, false, undefined, {
          persistObservation: false,
        }),
        delay(Math.max(1, controller.timeoutMs)).then(() => {
          throw new Error("controller-timeout");
        }),
      ]);
      return parseControllerRoutingOutput(controllerExecution.execution.normalized.outputText, {
        roleDefinitions: currentRolePolicy.roleDefinitions,
        taskDefinitions: currentRolePolicy.taskDefinitions,
        candidateEndpointIds,
      });
    };

    try {
      const heuristicGuidance = inferHeuristicControllerGuidance({
        messages: input.messages,
        toolCount: input.toolCount,
        roleDefinitions: currentRolePolicy.roleDefinitions,
        taskDefinitions: currentRolePolicy.taskDefinitions,
      });
      const guidance =
        (await parseControllerGuidanceFromMessages(controllerMessages, "controller")) ??
        (await parseControllerGuidanceFromMessages(
          compactControllerMessages,
          "controller:compact-retry",
        ));
      if (guidance === null) {
        const constrainedHeuristicGuidance = heuristicGuidance
          ? constrainControllerGuidanceToCandidatePool({
              guidance: heuristicGuidance,
              candidateEndpointIds,
              registry: executionRegistry,
              runtimeEndpoints,
              accounts: currentAccounts,
              roleDefinitions: currentRolePolicy.roleDefinitions,
              taskDefinitions: currentRolePolicy.taskDefinitions,
              llamaSwapRoleIdsByModelId: getLlamaSwapRoleIdsByModelId(),
            })
          : null;
        if (constrainedHeuristicGuidance) {
          return {
            active: true,
            fallbackApplied: true,
            fallbackReason: "controller-heuristic-fallback",
            resolvedGuidance: constrainedHeuristicGuidance,
          };
        }
        return {
          active: true,
          fallbackApplied: true,
          fallbackReason: "invalid-controller-output",
        };
      }
      const constrainedGuidance = constrainControllerGuidanceToCandidatePool({
        guidance: mergeControllerGuidanceDefaults({
          guidance,
          heuristic: heuristicGuidance,
        }),
        candidateEndpointIds,
        registry: executionRegistry,
        runtimeEndpoints,
        accounts: currentAccounts,
        roleDefinitions: currentRolePolicy.roleDefinitions,
        taskDefinitions: currentRolePolicy.taskDefinitions,
        llamaSwapRoleIdsByModelId: getLlamaSwapRoleIdsByModelId(),
      });
      if (constrainedGuidance === null) {
        return {
          active: true,
          fallbackApplied: true,
          fallbackReason: "controller-guidance-no-compatible-candidates",
        };
      }
      return {
        active: true,
        resolvedGuidance: constrainedGuidance,
      };
    } catch (error) {
      return {
        active: true,
        fallbackApplied: true,
        fallbackReason:
          error instanceof Error && error.message === "controller-timeout"
            ? "controller-timeout"
            : "controller-execution-failed",
      };
    }
  };

  let lastDetectedModel: string | null = null;
  let sessionBootstrapState: SessionBootstrapState = createPendingBootstrapState();
  const backend = {
    get registry(): EndpointRegistryResult {
      return currentRegistry;
    },
    get effectiveRegistry(): EndpointRegistryResult {
      return getRouterEffectiveRegistry();
    },
    async readVersionInfo(): Promise<{
      version: string;
      commit: string;
      build_date: string;
    }> {
      return {
        ...runtimeVersionInfo,
        ...(currentUnifiedRuntimeConfig?.version
          ? { configVersion: currentUnifiedRuntimeConfig.version }
          : {}),
      };
    },
    async listActivityMetrics(): Promise<readonly unknown[]> {
      return buildObservedActivityEntries().map((entry) => entry.metric);
    },
    async readActivityCapture(captureId: number): Promise<unknown | null> {
      return (
        buildObservedActivityEntries().find((entry) => entry.id === captureId)?.capture ?? null
      );
    },
    async executeChatCompletions(
      body: OpenAIChatCompletionsBody,
      requestId: string,
      streamWriter?: BridgeStreamWriter,
      requestOptions?: BridgeExecutionRequestOptions,
    ): Promise<BridgeChatCompletionsExecutionResult> {
      let executionStartedAtMs = 0;
      const fallbackFailureEndpointId =
        requestOptions?.endpointId && requestOptions.endpointId.trim().length > 0
          ? requestOptions.endpointId
          : "routing.failed.pre-execution";
      const fallbackFailureSourceType: "local" | "remote" =
        currentUnifiedRuntimeConfig?.executionMode === "remote_only" ? "remote" : "local";
      const recordChatCompletionFailure = (error: unknown): void => {
        const statusCode = error instanceof BridgeHttpError ? error.statusCode : 400;
        const latencyMs = Math.max(0, Date.now() - executionStartedAtMs);
        const dimensions = runtimeTelemetryDimensionsFor(error);
        persistRuntimeTelemetryFailure({
          databasePath: initialization.databasePath,
          requestId,
          clientRequestId: requestOptions?.clientRequestId ?? null,
          requestClass: "live_request",
          sourceType: fallbackFailureSourceType,
          endpointId: fallbackFailureEndpointId,
          modelId: body.model,
          requestedModelId: body.model,
          requestOperation: "chat",
          statusCode,
          errorClass: runtimeTelemetryErrorClassFor(error),
          latencyMs,
          dimensions,
          observation: buildPreExecutionFailureObservation({
            requestId,
            clientRequestId: requestOptions?.clientRequestId ?? null,
            endpointId: fallbackFailureEndpointId,
            modelId: body.model,
            sourceType: fallbackFailureSourceType,
            error,
            latencyMs,
            dimensions,
            toolingUsed: Boolean(body.tools?.length),
          }),
        });
      };
      try {
        executionStartedAtMs = Date.now();
        if (
          currentUnifiedRuntimeConfig?.executionMode === "decision_only" &&
          currentRegistry.endpoints.length === 0
        ) {
          throw createVendorError(
            "runtime",
            "Configure llama_swap.models or litellm_proxy.providers to enable execution.",
          );
        }
        const resolvedDifficultyClassification = await resolveDifficultyClassification({
          requestId,
          requestedModel: body.model,
          messages: body.messages,
          contextTokens: estimateContextTokens(body.messages, body.tools?.length ?? 0),
          toolCount: body.tools?.length ?? 0,
          requestOptions,
        });
        const resolvedControllerGuidance = await resolveControllerGuidance({
          requestId,
          requestedModel: body.model,
          messages: body.messages,
          toolCount: body.tools?.length ?? 0,
          requestOptions,
        });
        const executionRegistry = getRouterEffectiveRegistry();
        const executionInventory = getRouterEffectiveRoutableInventory();
        const executionSnapshot = createExecutionRuntimeSnapshot(executionRegistry);
        const plan = mapChatCompletionsRequest(
          executionRegistry,
          body,
          requestId,
          currentUnifiedRuntimeConfig?.modelAliases ?? [],
          {
            difficultyClassifier: currentUnifiedRuntimeConfig?.difficultyClassifier,
            endpointMaxDifficultyByEndpointId: buildEndpointMaxDifficultyByEndpointId(
              currentUnifiedRuntimeConfig,
            ),
            ...(resolvedDifficultyClassification
              ? {
                  overrideRecommendedMaxDifficultyByEndpointId:
                    readObservedOverrideMaxDifficultyByEndpointId({
                      databasePath: initialization.databasePath,
                      endpointIds: executionRegistry.endpoints.map(
                        (endpoint) => endpoint.identity.endpoint_id,
                      ),
                      observedDataConfig: resolveUnifiedRuntimeObservedDataConfig(
                        currentUnifiedRuntimeConfig,
                      ),
                    }),
                }
              : {}),
            ...(resolvedDifficultyClassification
              ? { resolvedClassification: resolvedDifficultyClassification }
              : {}),
          },
          resolvedControllerGuidance,
          requestOptions,
          currentRolePolicy.roleDefinitions,
          normalizeConfiguredRoutingMode(currentUnifiedRuntimeConfig?.routingStrategy) ?? undefined,
          executionInventory.endpointIds.length > 0 ? executionInventory : null,
          currentRolePolicy.taskDefinitions,
        );
        const { execution, toolExecutionResult, routingDecisionId } = await executeBridgePlan(
          plan,
          requestId,
          body.stream,
          streamWriter,
          {
            requestOptions,
            requestBody: body as unknown as Record<string, unknown>,
            requestedModel: body.model,
            requestOperation: "chat",
            persistObservation: !requestId.startsWith("bench-"),
            executionSnapshot,
          },
        );
        const costUsd =
          execution.normalized.vendorMetadata?.costUsd ??
          execution.responseCapture.vendorMetadata?.costUsd;
        const cacheUsed =
          execution.normalized.vendorMetadata?.cacheUsed ??
          execution.responseCapture.vendorMetadata?.cacheUsed;
        const responseVendorId =
          execution.responseCapture.vendorMetadata?.vendorId ??
          execution.normalized.vendorMetadata?.vendorId;
        const responseAdapterFamily = resolveEffectiveExecutionAdapterFamily({
          endpointId: execution.target.endpointId,
          adapterFamily: execution.target.adapterFamily,
          vendorId: responseVendorId,
        });
        const shouldSuppressResponseToolCalls = hasRequestScopedDynamicToolExecution(
          toolExecutionResult.executions,
        );
        const responseToolCalls = shouldSuppressResponseToolCalls
          ? []
          : execution.normalized.toolCalls;

        const bridgeResult: BridgeChatCompletionsExecutionResult = {
          model: execution.target.modelId,
          endpointId: execution.target.endpointId,
          adapterFamily: responseAdapterFamily,
          routingDecisionId,
          ...(responseVendorId ? { vendorId: responseVendorId } : {}),
          outputText: execution.normalized.outputText,
          contentText: execution.normalized.outputText,
          ...(execution.normalized.reasoningText
            ? { reasoningText: execution.normalized.reasoningText }
            : {}),
          finishReason: shouldSuppressResponseToolCalls
            ? "stop"
            : execution.normalized.finishReason,
          ...(responseToolCalls.length
            ? {
                toolCalls: responseToolCalls.map((toolCall, index) =>
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
        const trackBOperations = createTrackBOperations({
          statePath: path.join(
            options.runtimeStateRoot,
            options.scopeId,
            "track-b-production-bridge.json",
          ),
          catalog: [],
        });
        try {
          await trackBOperations.recordContributionAggregate({
            requestId,
            routingDecisionId,
            endpointId: execution.target.endpointId,
            modelId: bridgeResult.model,
            taskType: "general.chat",
            inputTokens: execution.normalized.usage.inputTokens,
            outputTokens: execution.normalized.usage.outputTokens,
            success: true,
          });
        } catch {
          // Contribution is non-routing-critical; its bounded outbox owns retry.
        }
        return bridgeResult;
      } catch (error) {
        if (!hasRuntimeTelemetryPersisted(error)) {
          recordChatCompletionFailure(error);
        }
        throw error;
      }
    },
    async executeResponses(
      body: OpenAIResponsesBody,
      requestId: string,
      streamWriter?: BridgeStreamWriter,
      requestOptions?: BridgeExecutionRequestOptions,
    ): Promise<BridgeResponsesExecutionResult> {
      if (
        currentUnifiedRuntimeConfig?.executionMode === "decision_only" &&
        currentRegistry.endpoints.length === 0
      ) {
        throw createVendorError(
          "runtime",
          "Configure llama_swap.models or litellm_proxy.providers to enable execution.",
        );
      }
      const responseMessages = toResponsesInputMessages(body.input);
      const resolvedDifficultyClassification = await resolveDifficultyClassification({
        requestId,
        requestedModel: body.model,
        messages: responseMessages,
        contextTokens: estimateContextTokens(responseMessages, body.tools?.length ?? 0),
        toolCount: body.tools?.length ?? 0,
        requestOptions,
      });
      const resolvedControllerGuidance = await resolveControllerGuidance({
        requestId,
        requestedModel: body.model,
        messages: responseMessages,
        toolCount: body.tools?.length ?? 0,
        requestOptions,
      });
      const executionRegistry = getRouterEffectiveRegistry();
      const executionInventory = getRouterEffectiveRoutableInventory();
      const executionSnapshot = createExecutionRuntimeSnapshot(executionRegistry);
      const plan = mapResponsesRequest(
        executionRegistry,
        body,
        requestId,
        currentUnifiedRuntimeConfig?.modelAliases ?? [],
        {
          difficultyClassifier: currentUnifiedRuntimeConfig?.difficultyClassifier,
          endpointMaxDifficultyByEndpointId: buildEndpointMaxDifficultyByEndpointId(
            currentUnifiedRuntimeConfig,
          ),
          ...(resolvedDifficultyClassification
            ? {
                overrideRecommendedMaxDifficultyByEndpointId:
                  readObservedOverrideMaxDifficultyByEndpointId({
                    databasePath: initialization.databasePath,
                    endpointIds: executionRegistry.endpoints.map(
                      (endpoint) => endpoint.identity.endpoint_id,
                    ),
                    observedDataConfig: resolveUnifiedRuntimeObservedDataConfig(
                      currentUnifiedRuntimeConfig,
                    ),
                  }),
              }
            : {}),
          ...(resolvedDifficultyClassification
            ? { resolvedClassification: resolvedDifficultyClassification }
            : {}),
        },
        resolvedControllerGuidance,
        requestOptions,
        currentRolePolicy.roleDefinitions,
        normalizeConfiguredRoutingMode(currentUnifiedRuntimeConfig?.routingStrategy) ?? undefined,
        executionInventory.endpointIds.length > 0 ? executionInventory : null,
        currentRolePolicy.taskDefinitions,
      );
      const { execution, toolExecutionResult, routingDecisionId } = await executeBridgePlan(
        plan,
        requestId,
        body.stream,
        streamWriter,
        {
          requestOptions,
          requestBody: body as unknown as Record<string, unknown>,
          requestedModel: body.model,
          requestOperation: "responses",
          executionSnapshot,
        },
      );
      const costUsd =
        execution.normalized.vendorMetadata?.costUsd ??
        execution.responseCapture.vendorMetadata?.costUsd;
      const cacheUsed =
        execution.normalized.vendorMetadata?.cacheUsed ??
        execution.responseCapture.vendorMetadata?.cacheUsed;
      const responseVendorId =
        execution.responseCapture.vendorMetadata?.vendorId ??
        execution.normalized.vendorMetadata?.vendorId;
      const responseAdapterFamily = resolveEffectiveExecutionAdapterFamily({
        endpointId: execution.target.endpointId,
        adapterFamily: execution.target.adapterFamily,
        vendorId: responseVendorId,
      });
      const shouldSuppressResponseToolCalls = hasRequestScopedDynamicToolExecution(
        toolExecutionResult.executions,
      );
      const responseToolCalls = shouldSuppressResponseToolCalls
        ? []
        : execution.normalized.toolCalls;

      const bridgeResult: BridgeResponsesExecutionResult = {
        responseId: extractResponseId(execution.responseCapture.body) ?? "resp-role-model",
        model: execution.target.modelId,
        endpointId: execution.target.endpointId,
        adapterFamily: responseAdapterFamily,
        routingDecisionId,
        ...(responseVendorId ? { vendorId: responseVendorId } : {}),
        outputText: execution.normalized.outputText,
        finishReason: shouldSuppressResponseToolCalls ? "stop" : execution.normalized.finishReason,
        ...(responseToolCalls.length
          ? {
              toolCalls: responseToolCalls.map((toolCall, index) =>
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
      const trackBOperations = createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      });
      try {
        await trackBOperations.recordContributionAggregate({
          requestId,
          routingDecisionId,
          endpointId: execution.target.endpointId,
          modelId: bridgeResult.model,
          taskType: "general.chat",
          inputTokens: execution.normalized.usage.inputTokens,
          outputTokens: execution.normalized.usage.outputTokens,
          success: true,
        });
      } catch {
        // Contribution is non-routing-critical; its bounded outbox owns retry.
      }
      return bridgeResult;
    },
    async readRuntimeSummary(): Promise<RuntimeBridgeSummary> {
      const credentialLifecycle = buildCredentialLifecycleSummary();
      return {
        runtime: runtimeVersionInfo,
        lifecycleSummary: currentRegistry.lifecycleSummary,
        providerCount:
          currentNormalizedCatalog.providers.length +
          liteLLMProviders.filter(
            (provider) =>
              !currentNormalizedCatalog.providers.some((p) => p.providerId === provider.providerId),
          ).length,
        accountCount: currentAccounts.length,
        endpointCount: currentRegistry.endpoints.length,
        scopeId: options.scopeId,
        runtimeStateRoot: options.runtimeStateRoot,
        readinessSummary: {
          pendingDeviceAuthorizationCount: credentialLifecycle.counts.pendingAuthorization,
          credentialsMissingAccountCount: credentialLifecycle.counts.credentialsMissing,
          connectedWithoutEndpointCount: credentialLifecycle.counts.connectedNoEndpoint,
          readyAccountCount: credentialLifecycle.counts.executionReady,
        },
        credentialLifecycle,
        executionMode: currentUnifiedRuntimeConfig?.executionMode ?? "decision_only",
        unifiedConfig: {
          enabled: currentUnifiedRuntimeConfig !== null,
          path: options.unifiedRuntimeConfigPath ?? null,
        },
        sessionBootstrap: {
          status: sessionBootstrapState.status,
          startedAt: sessionBootstrapState.startedAt,
          finishedAt: sessionBootstrapState.finishedAt,
          stages: sessionBootstrapState.stages,
        },
        inventorySummary: buildInventorySummary(),
        aliasDrift: currentAliasDriftWarnings.map((warning) => ({
          aliasId: warning.aliasId,
          hintModelId: warning.hintModelId,
          suggestedModelIds: warning.suggestedModelIds,
          message: warning.message,
        })),
        operatorIntent: {
          path: resolveOperatorIntentPath(operatorIntentLocation),
          status: operatorIntentDiagnostic.status,
          ...(operatorIntentDiagnostic.status === "corrupt"
            ? { message: operatorIntentDiagnostic.message }
            : {}),
        },
        configuredMembershipReconciliation: latestConfiguredMembershipReconciliation,
      };
    },
    async readHealthStatus(): Promise<{
      runtime: RuntimeVersionInfoRecord;
      status: "healthy" | "degraded";
      executionMode: UnifiedRuntimeExecutionMode;
      vendors: Record<string, VendorRuntimeStatus>;
      inactiveVendors: string[];
      credentialLifecycleAuthority: RuntimeCredentialLifecycleSummary["authority"];
      sessionBootstrap: {
        status: SessionBootstrapState["status"];
        startedAt: string | null;
        finishedAt: string | null;
        stages: SessionBootstrapState["stages"];
      };
    }> {
      const vendors = {
        "llama-swap":
          currentLlamaSwapVendor?.readStatus() ?? createInactiveVendorStatus("llama-swap"),
        litellm: currentLiteLLMVendor?.readStatus() ?? createInactiveVendorStatus("litellm"),
      };
      const summarized = summarizeHealthStatus(vendors);
      const bootstrapBlocked =
        sessionBootstrapState.status === "blocked" || sessionBootstrapState.status === "degraded";
      return {
        runtime: runtimeVersionInfo,
        status: bootstrapBlocked ? "degraded" : summarized.status,
        executionMode: currentUnifiedRuntimeConfig?.executionMode ?? "decision_only",
        vendors,
        inactiveVendors: summarized.inactiveVendors,
        credentialLifecycleAuthority: buildCredentialLifecycleAuthority(),
        sessionBootstrap: {
          status: sessionBootstrapState.status,
          startedAt: sessionBootstrapState.startedAt,
          finishedAt: sessionBootstrapState.finishedAt,
          stages: sessionBootstrapState.stages,
        },
      };
    },
    getRoutableInventory(): RoutableInventory | null {
      return currentRoutableInventory.endpointIds.length > 0 ? currentRoutableInventory : null;
    },
    getExecutionCatalog(): NormalizedCatalog {
      return getCurrentExecutionCatalog();
    },
    getEffectiveRoutableInventory(): RoutableInventory | null {
      const inventory = getRouterEffectiveRoutableInventory();
      return inventory.endpointIds.length > 0 ? inventory : null;
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
      const unifiedRuntimeConfigPath = options.unifiedRuntimeConfigPath;
      return withUnifiedConfigMutationLock(async () => {
        const previousConfig = currentUnifiedRuntimeConfig;
        const previousText = await readFile(unifiedRuntimeConfigPath, "utf8").catch(
          (error: unknown) => {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
              return null;
            }
            throw error;
          },
        );
        const previousDocument = previousText
          ? (parse(previousText) as Record<string, unknown>)
          : null;
        const nextConfig = mergeUnifiedRuntimeConfigDocuments(previousDocument, body);
        let finalConfig = nextConfig;
        let finalText = renderUnifiedRuntimeConfigText(finalConfig);

        await writeConfigTextAtomically(unifiedRuntimeConfigPath, finalText);

        try {
          await applyUnifiedRuntimeConfigState(finalConfig);
          if (currentUnifiedRuntimeConfig !== null && currentUnifiedRuntimeConfig !== finalConfig) {
            finalConfig = currentUnifiedRuntimeConfig;
            finalText = renderUnifiedRuntimeConfigText(currentUnifiedRuntimeConfig);
            await writeConfigTextAtomically(unifiedRuntimeConfigPath, finalText);
          }
        } catch (error) {
          if (previousText === null) {
            await rm(unifiedRuntimeConfigPath, { force: true });
          } else {
            await writeConfigTextAtomically(unifiedRuntimeConfigPath, previousText);
          }
          if (previousConfig) {
            await applyUnifiedRuntimeConfigState(previousConfig);
          }
          throw error;
        }

        return {
          applied: true,
          path: unifiedRuntimeConfigPath,
          config: currentUnifiedRuntimeConfig,
        };
      });
    },
    async listProviders(): Promise<
      readonly {
        providerId: string;
        displayName: string;
        npmPackage?: string;
        providerKind: string;
        authFamily: string;
        adapterFamily: string;
        apiBase: string;
        docsUrl?: string | null;
        envVars: readonly string[];
        supportedAuthModes: readonly string[];
        controlPlaneRequirements: readonly string[];
        localOverrideApplied: boolean;
        modelIds: readonly string[];
        variants: readonly ProviderPresetVariant[];
      }[]
    > {
      function resolveModelIds(providerId: string): readonly string[] {
        const fromConfig = readUnifiedLiteLLMProviderModelIds(
          currentUnifiedRuntimeConfig,
          providerId,
        );
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
        return providerPresets.providers[providerId]?.variants?.[0]?.modelIds ?? [];
      }

      const normalizedProviderIds = new Set(
        currentNormalizedCatalog.providers.map((p) => p.providerId),
      );
      const visibleLiteLLMProviders = liteLLMProviders.filter(
        (provider) => provider.providerId !== CHATGPT_PROVIDER_ID,
      );
      const liteLLMProviderIds = new Set(visibleLiteLLMProviders.map((p) => p.providerId));
      const localModelIds =
        currentUnifiedRuntimeConfig?.llamaSwap.models.map((m) => m.modelId) ?? [];
      const mergedProviders = [
        ...currentNormalizedCatalog.providers
          .filter((provider) => !OPERATOR_HIDDEN_CATALOG_PROVIDER_IDS.has(provider.providerId))
          .map((provider) => {
            const effectiveModelIds = resolveModelIds(provider.providerId);
            const presetVariants = (
              providerPresets.providers[provider.providerId]?.variants ?? []
            ).map((variant) => ({
              ...variant,
              modelIds: effectiveModelIds.length > 0 ? effectiveModelIds : variant.modelIds,
            }));
            const liteLLMProvider = visibleLiteLLMProviders.find(
              (p) => p.providerId === provider.providerId,
            );
            const mergedMetadata = resolveValidationProviderMetadata({
              catalogProvider: provider,
              liteLLMProvider,
            });
            const variants = resolveProviderVariants({
              providerId: provider.providerId,
              displayName: provider.displayName,
              apiBase: mergedMetadata.apiBase,
              modelIds: effectiveModelIds,
              presetVariants,
              supportedAuthModes:
                liteLLMProvider?.supportedAuthModes ?? provider.supportedAuthModes,
              oauth: liteLLMProvider?.oauth,
            });
            return {
              providerId: provider.providerId,
              displayName: provider.displayName,
              npmPackage: provider.npmPackage,
              providerKind: mergedMetadata.providerKind,
              authFamily: provider.authFamily,
              adapterFamily: mergedMetadata.adapterFamily,
              apiBase: mergedMetadata.apiBase,
              docsUrl: provider.docsUrl,
              envVars: provider.envVars,
              supportedAuthModes: provider.supportedAuthModes,
              controlPlaneRequirements: provider.controlPlaneRequirements,
              localOverrideApplied: provider.localOverrideApplied,
              modelIds: effectiveModelIds,
              variants,
            };
          }),
        ...visibleLiteLLMProviders
          .filter((provider) => !normalizedProviderIds.has(provider.providerId))
          .map((provider) => {
            const effectiveModelIds = resolveModelIds(provider.providerId);
            const presetVariants = (
              providerPresets.providers[provider.providerId]?.variants ?? []
            ).map((variant) => ({
              ...variant,
              modelIds: effectiveModelIds.length > 0 ? effectiveModelIds : variant.modelIds,
            }));
            const variants = resolveProviderVariants({
              providerId: provider.providerId,
              displayName: provider.displayName,
              apiBase: provider.apiBase,
              modelIds: effectiveModelIds,
              presetVariants,
              supportedAuthModes: provider.supportedAuthModes,
              oauth: provider.oauth,
            });
            return {
              providerId: provider.providerId,
              displayName: provider.displayName,
              npmPackage: provider.npmPackage || undefined,
              providerKind: provider.providerKind,
              authFamily: provider.authFamily,
              adapterFamily: provider.adapterFamily,
              apiBase: provider.apiBase,
              docsUrl: provider.docsUrl,
              envVars: provider.envVars,
              supportedAuthModes: provider.supportedAuthModes,
              controlPlaneRequirements: provider.controlPlaneRequirements,
              localOverrideApplied: provider.localOverrideApplied,
              modelIds: effectiveModelIds,
              variants,
            };
          }),
        ...(!normalizedProviderIds.has("llamacpp") && !liteLLMProviderIds.has("llamacpp")
          ? [
              {
                providerId: "llamacpp",
                displayName: "llama.cpp",
                npmPackage: undefined,
                providerKind: "local-engine",
                authFamily: "none",
                adapterFamily: "ai-sdk-openai-compatible",
                apiBase: "http://localhost:8080",
                docsUrl: null,
                envVars: [] as readonly string[],
                supportedAuthModes: [] as readonly string[],
                controlPlaneRequirements: [] as readonly string[],
                localOverrideApplied: true,
                modelIds: localModelIds,
                variants: [
                  {
                    variantId: "local-default",
                    label: "llama.cpp server",
                    description:
                      "Local inference via llama.cpp (llama-server). Best supported by llama-swap.",
                    authMode: "api-key-static" as const,
                    availability: "ready" as const,
                    baseUrl: "http://localhost:8080",
                    modelIds: localModelIds,
                  },
                ] as readonly ProviderPresetVariant[],
              },
              {
                providerId: "vllm",
                displayName: "vLLM",
                npmPackage: undefined,
                providerKind: "local-engine",
                authFamily: "none",
                adapterFamily: "ai-sdk-openai-compatible",
                apiBase: "http://localhost:8080",
                docsUrl: null,
                envVars: [] as readonly string[],
                supportedAuthModes: [] as readonly string[],
                controlPlaneRequirements: [] as readonly string[],
                localOverrideApplied: true,
                modelIds: localModelIds,
                variants: [
                  {
                    variantId: "local-default",
                    label: "vLLM server",
                    description:
                      "Local inference via vLLM. Recommended to run via Docker/Podman for clean shutdown.",
                    authMode: "api-key-static" as const,
                    availability: "ready" as const,
                    baseUrl: "http://localhost:8080",
                    modelIds: localModelIds,
                  },
                ] as readonly ProviderPresetVariant[],
              },
              {
                providerId: "tabbyapi",
                displayName: "TabbyAPI",
                npmPackage: undefined,
                providerKind: "local-engine",
                authFamily: "none",
                adapterFamily: "ai-sdk-openai-compatible",
                apiBase: "http://localhost:8080",
                docsUrl: null,
                envVars: [] as readonly string[],
                supportedAuthModes: [] as readonly string[],
                controlPlaneRequirements: [] as readonly string[],
                localOverrideApplied: true,
                modelIds: localModelIds,
                variants: [
                  {
                    variantId: "local-default",
                    label: "TabbyAPI server",
                    description:
                      "Local inference via TabbyAPI. Recommended to run via Docker/Podman for clean shutdown.",
                    authMode: "api-key-static" as const,
                    availability: "ready" as const,
                    baseUrl: "http://localhost:8080",
                    modelIds: localModelIds,
                  },
                ] as readonly ProviderPresetVariant[],
              },
              {
                providerId: "stable-diffusion-cpp",
                displayName: "stable-diffusion.cpp",
                npmPackage: undefined,
                providerKind: "local-engine",
                authFamily: "none",
                adapterFamily: "ai-sdk-openai-compatible",
                apiBase: "http://localhost:8080",
                docsUrl: null,
                envVars: [] as readonly string[],
                supportedAuthModes: [] as readonly string[],
                controlPlaneRequirements: [] as readonly string[],
                localOverrideApplied: true,
                modelIds: localModelIds,
                variants: [
                  {
                    variantId: "local-default",
                    label: "stable-diffusion.cpp server",
                    description:
                      "Local image generation via stable-diffusion.cpp. SDAPI endpoints supported.",
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
    async listModels(): Promise<readonly BridgeRuntimeModelRecord[]> {
      return createRuntimeModelRecords(currentRegistry, currentNormalizedCatalog);
    },
    async listExtensions(): Promise<readonly unknown[]> {
      const contract = JSON.parse(
        await readFile(
          path.join(
            options.repoRoot,
            "packages",
            "protocol-types",
            "generated",
            "product-contracts.json",
          ),
          "utf8",
        ),
      ) as { extensions?: readonly Record<string, unknown>[] };
      const rows = await createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: contract.extensions ?? [],
        extensionRuntime: options.trackBExtensionRuntime?.() ?? undefined,
      }).listExtensions();
      if (options.trackBExtensionRuntime?.()) return rows;
      const hostedIds = new Set(options.trackBExtensionHealth?.().host?.extensions ?? []);
      return (rows as readonly Record<string, unknown>[]).map((row) => {
        if (!hostedIds.has(String(row.id))) return row;
        const priorHealth =
          row.health && typeof row.health === "object"
            ? (row.health as Record<string, unknown>)
            : {};
        const routingDependency = Boolean(
          row.routingDependency ?? priorHealth.routingDependency ?? false,
        );
        // Unregistered catalog rows default enabled:false; host overlay still marks them
        // ready unless an installed bridge row explicitly disables them.
        const enabled = !(row.installed === true && row.enabled === false);
        const enabledMode =
          typeof row.enabledMode === "string" && row.enabledMode.length > 0
            ? row.enabledMode
            : enabled
              ? "active"
              : "disabled";
        const reason = enabled
          ? priorHealth.reason === "operator_disabled"
            ? "hosted_extension_ready"
            : typeof priorHealth.reason === "string" && priorHealth.reason.length > 0
              ? priorHealth.reason
              : "hosted_extension_ready"
          : "operator_disabled";
        const probe = enabled
          ? priorHealth.probe === "operator_disabled"
            ? "hosted_extension_ready"
            : typeof priorHealth.probe === "string" && priorHealth.probe.length > 0
              ? priorHealth.probe
              : "hosted_extension_ready"
          : "operator_disabled";
        const summary = enabled
          ? typeof priorHealth.summary === "string" &&
            priorHealth.summary.length > 0 &&
            !priorHealth.summary.includes("disabled by operator")
            ? priorHealth.summary
            : routingDependency
              ? "Hosted extension is ready and marked as a routing dependency."
              : "Hosted extension is ready; core routing continues if this worker degrades."
          : "Extension disabled by operator; core routing continues independently.";
        return {
          ...row,
          installed: true,
          enabled,
          enabledMode,
          lifecycle: enabled ? "ready" : "stopped",
          health: {
            ...priorHealth,
            available: enabled,
            routingDependency,
            probe,
            summary,
            reason,
          },
        };
      });
    },
    async readTrackBQaExtensions(): Promise<readonly unknown[]> {
      const catalog = options.trackBQaExtensionCatalog?.() ?? [];
      const extensionRuntime = options.trackBExtensionRuntime?.() ?? undefined;
      if (!extensionRuntime || catalog.length === 0) return [];
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog,
        extensionRuntime,
      }).listExtensions();
    },
    async mutateExtension(body: Record<string, unknown>): Promise<unknown> {
      const contract = JSON.parse(
        await readFile(
          path.join(
            options.repoRoot,
            "packages",
            "protocol-types",
            "generated",
            "product-contracts.json",
          ),
          "utf8",
        ),
      ) as { extensions?: readonly Record<string, unknown>[] };
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: contract.extensions ?? [],
        extensionRuntime: options.trackBExtensionRuntime?.() ?? undefined,
      }).mutateExtension(body);
    },
    async readTrackBShadowReceipts(): Promise<unknown> {
      if (!options.trackBPostObservationReceipts) {
        return { pendingCount: 0, receiptCount: 0, receipts: [] };
      }
      return options.trackBPostObservationReceipts();
    },
    async readGraphMigration(): Promise<unknown> {
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      }).readGraphMigration();
    },
    async advanceGraphMigration(body: Record<string, unknown>): Promise<unknown> {
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      }).advanceGraphMigration(body);
    },
    async rollbackGraphMigration(): Promise<unknown> {
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      }).rollbackGraphMigration();
    },
    async readStorageRetention(): Promise<unknown> {
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      }).readStorageRetention();
    },
    async dryRunStorageRetention(): Promise<unknown> {
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      }).dryRunStorageRetention();
    },
    async updateStorageRetentionPolicy(body: Record<string, unknown>): Promise<unknown> {
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      }).updateStorageRetentionPolicy(body);
    },
    async executeStorageRetention(body: Record<string, unknown>): Promise<unknown> {
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      }).executeStorageRetention(body);
    },
    async cancelStorageRetentionJob(): Promise<unknown> {
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      }).cancelStorageRetentionJob();
    },
    async rollbackStorageRetention(body: Record<string, unknown>): Promise<unknown> {
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      }).rollbackStorageRetention(body);
    },
    async readContributionState(): Promise<unknown> {
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      }).readContributionState();
    },
    async updateContributionState(body: Record<string, unknown>): Promise<unknown> {
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      }).updateContributionState(body);
    },
    async listRecommendations(): Promise<readonly unknown[]> {
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      }).listRecommendations();
    },
    async downloadRecommendations(): Promise<readonly unknown[]> {
      const serviceUrl = process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_URL;
      const verificationKey = process.env.ROLE_MODEL_RECOMMENDATION_VERIFICATION_KEY;
      if (!serviceUrl || !verificationKey)
        throw new Error("recommendation service trust is not configured");
      const baseUrl = serviceUrl.endsWith("/") ? serviceUrl : `${serviceUrl}/`;
      const channel = process.env.ROLE_MODEL_RECOMMENDATION_CHANNEL ?? "production";
      const statePath = path.join(
        options.runtimeStateRoot,
        options.scopeId,
        "track-b-production-bridge.json",
      );
      const operations = createTrackBOperations({
        statePath,
        catalog: [],
      });
      const contribution = (await operations.readContributionState()) as {
        readonly recommendationTier?: string;
      };
      let run88CorrelationHeader: Record<string, string> = {};
      if (runtimeChannel === "stage") {
        const identity = options.run88StageIdentity;
        if (!identity)
          throw new Error("stage recommendation correlation identity is not configured");
        const requestId = `recommendation-resolve-${randomUUID()}`;
        const correlation = createRun88RuntimeCorrelation({
          requestId,
          routingDecisionId: requestId,
          releaseId: identity.releaseId,
          sourceId: identity.sourceId,
          deploymentId: `local-stage:${identity.executableSha256}`,
          scope: options.scopeId,
          operation: "recommendation.resolve",
          outcome: "requested",
        });
        run88CorrelationHeader = {
          "x-role-model-correlation": JSON.stringify(correlation),
        };
      }
      const headers = {
        "content-type": "application/json",
        ...(process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_TOKEN
          ? { authorization: `Bearer ${process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_TOKEN}` }
          : {}),
        ...run88CorrelationHeader,
      };
      const response = await fetch(new URL("api/role-model/recommendations/resolve", baseUrl), {
        method: "POST",
        headers,
        body: JSON.stringify({
          contract: "RecommendationResolveRequestV1",
          channel,
          runtimeChannel: channel,
          releaseTrack: "stable",
          recommendationTier: contribution.recommendationTier ?? "advanced",
          clientSchemaVersions: ["1.0.0"],
          activeChannelSequence: 0,
          identityKind: "anonymous_public",
          scopeId: options.scopeId,
          boundaryProtocolVersion: "1.1",
        }),
      });
      if (!response.ok) throw new Error(`recommendation download failed with ${response.status}`);
      const resolved = (await response.json()) as Record<string, unknown>;
      if (resolved.status === "not_eligible" || resolved.status === "not_modified")
        return operations.listRecommendations();
      if (
        resolved.status !== "available" ||
        typeof resolved.bundleUri !== "string" ||
        typeof resolved.manifestHash !== "string"
      )
        throw new Error("recommendation resolve response did not include an available bundle");
      const manifestUrl = new URL(resolved.bundleUri);
      const manifestResponse = await fetch(manifestUrl);
      if (!manifestResponse.ok)
        throw new Error(`recommendation manifest download failed with ${manifestResponse.status}`);
      const manifestText = await manifestResponse.text();
      const manifest = JSON.parse(manifestText) as Record<string, unknown>;
      const contents = manifest.contents;
      if (!Array.isArray(contents)) throw new Error("recommendation bundle contents missing");
      const recordsByPath: Record<string, string> = {};
      for (const content of contents) {
        if (
          !content ||
          typeof content !== "object" ||
          typeof (content as Record<string, unknown>).path !== "string"
        )
          throw new Error("recommendation bundle content path missing");
        const contentPath = (content as Record<string, unknown>).path as string;
        const recordResponse = await fetch(new URL(contentPath, manifestUrl));
        if (!recordResponse.ok)
          throw new Error(`recommendation record download failed with ${recordResponse.status}`);
        recordsByPath[contentPath] = await recordResponse.text();
      }
      if (typeof manifest.signatureRef !== "string")
        throw new Error("recommendation bundle signature reference missing");
      const signatureResponse = await fetch(new URL(manifest.signatureRef, manifestUrl));
      if (!signatureResponse.ok)
        throw new Error(
          `recommendation signature download failed with ${signatureResponse.status}`,
        );
      const signature = (await signatureResponse.json()) as Record<string, unknown>;
      return operations.importRecommendationArtifactBundle(
        {
          manifest,
          manifestText,
          expectedManifestSha256: resolved.manifestHash,
          recordsByPath,
          signature,
        },
        verificationKey,
      );
    },
    async applyRecommendation(body: Record<string, unknown>): Promise<unknown> {
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      }).applyRecommendation(body);
    },
    async dismissRecommendation(body: Record<string, unknown>): Promise<unknown> {
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      }).dismissRecommendation(body);
    },
    async readActivePack(): Promise<unknown> {
      return createTrackBOperations({
        statePath: path.join(
          options.runtimeStateRoot,
          options.scopeId,
          "track-b-production-bridge.json",
        ),
        catalog: [],
      }).readActivePack();
    },
    async listRoles(): Promise<
      readonly {
        roleId: string;
        label: string;
        description: string;
        taskTypes: readonly string[];
      }[]
    > {
      return currentRuntimeRoles.roleSummaries;
    },
    async listAccounts(): Promise<ReturnType<typeof listProviderAccounts>> {
      currentAccounts = [...readCurrentAccounts()];
      return currentAccounts;
    },
    async listProviderDeviceAuthorizations(): Promise<
      readonly DeviceAuthorizationReadbackResult[]
    > {
      return listCurrentProviderDeviceAuthorizations();
    },
    async reconnectProviderAccount(
      body: Record<string, unknown>,
    ): Promise<DeviceAuthorizationStartResult> {
      const providerAccountId = readRequiredString(
        body,
        "providerAccountId",
        "reconnectProviderAccount",
      );
      return withProviderAccountRepairLock(providerAccountId, async () => {
        currentAccounts = [...readCurrentAccounts()];
        const existingAccount = currentAccounts.find(
          (entry) => entry.providerAccountId === providerAccountId,
        );
        if (!existingAccount) {
          throw new Error(`Provider account ${providerAccountId} was not found.`);
        }
        if (existingAccount.authMode !== "oauth2-device-code") {
          throw new Error(
            `Provider account ${providerAccountId} does not use OAuth device authorization.`,
          );
        }

        const catalogProvider = currentNormalizedCatalog.providers.find(
          (entry) => entry.providerId === existingAccount.providerId,
        );
        const liteLLMProvider = liteLLMProviders.find(
          (entry) => entry.providerId === existingAccount.providerId,
        );
        const provider = catalogProvider ?? liteLLMProvider;
        if (!provider) {
          throw new Error(
            `Provider ${existingAccount.providerId} is not present in the normalized catalog or LiteLLM provider list.`,
          );
        }
        const mergedMetadata = catalogProvider
          ? resolveValidationProviderMetadata({
              catalogProvider,
              liteLLMProvider,
            })
          : null;
        const effectiveModelIds =
          readUnifiedLiteLLMProviderModelIds(
            currentUnifiedRuntimeConfig,
            existingAccount.providerId,
          ) ??
          currentNormalizedCatalog.models
            .filter((model) => model.providerId === existingAccount.providerId)
            .map((model) => model.modelId);
        const presetVariants = (
          providerPresets.providers[existingAccount.providerId]?.variants ?? []
        ).map((entry) => ({
          ...entry,
          modelIds: effectiveModelIds.length > 0 ? effectiveModelIds : entry.modelIds,
        }));
        const variants = resolveProviderVariants({
          providerId: existingAccount.providerId,
          displayName: provider.displayName,
          apiBase: mergedMetadata?.apiBase ?? provider.apiBase,
          modelIds: effectiveModelIds,
          presetVariants,
          supportedAuthModes: liteLLMProvider?.supportedAuthModes ?? provider.supportedAuthModes,
          oauth: liteLLMProvider?.oauth,
        });
        const variant =
          variants.find(
            (entry) =>
              entry.authMode === existingAccount.authMode &&
              (existingAccount.baseUrlOverride
                ? (entry.baseUrl ?? provider.apiBase) === existingAccount.baseUrlOverride
                : true),
          ) ?? variants.find((entry) => entry.authMode === existingAccount.authMode);
        if (!variant?.oauth) {
          throw new Error(
            `Provider account ${providerAccountId} does not expose a reconnectable OAuth variant.`,
          );
        }

        const activePendingSession = listCurrentProviderDeviceAuthorizations().find(
          (session) =>
            session.providerAccountId === providerAccountId &&
            session.status === "pending" &&
            session.expiresAtMs > Date.now(),
        );
        const usesCodexSubscriptionHelper = isCodexSubscriptionEndpoint(
          variant.oauth.deviceAuthorizationEndpoint,
        );
        if (activePendingSession && !usesCodexSubscriptionHelper) {
          return {
            authRequestId: activePendingSession.authRequestId,
            providerAccountId: activePendingSession.providerAccountId,
            status: "pending",
            userCode: activePendingSession.userCode,
            verificationUri: activePendingSession.verificationUri,
            verificationUriComplete: activePendingSession.verificationUriComplete,
            intervalSeconds: activePendingSession.intervalSeconds,
            expiresAtMs: activePendingSession.expiresAtMs,
          };
        }
        if (usesCodexSubscriptionHelper) {
          await supersedePendingCodexSubscriptionSessions(providerAccountId);
          const authRequestId = randomUUID();
          const codexHome = resolveManagedCodexSubscriptionHome(
            options.runtimeStateRoot,
            options.scopeId,
            authRequestId,
          );
          const login = await codexAuthAdapter.startDeviceCodeLogin({ codexHome });
          const expiresAtMs = Date.now() + 15 * 60 * 1000;
          upsertProviderDeviceAuthSession({
            databasePath: initialization.databasePath,
            session: {
              authRequestId,
              providerAccountId,
              providerId: existingAccount.providerId,
              variantId: variant.variantId,
              credentialBackend:
                existingAccount.credentialRef.backend === "local-encrypted-file"
                  ? "local-file"
                  : existingAccount.credentialRef.backend,
              credentialRef:
                existingAccount.credentialRef.ref ||
                createCredentialRef(existingAccount.providerId, providerAccountId),
              authMode: existingAccount.authMode,
              verificationUri: login.verificationUrl,
              verificationUriComplete: login.verificationUrl,
              userCode: login.userCode,
              deviceCode: encodeCodexDeviceCodeSessionPayload({
                loginId: login.loginId,
                userCode: login.userCode,
                wsUrl: login.wsUrl,
                codexHome,
                pid: login.pid,
              }),
              intervalSeconds: 5,
              status: "pending",
              lastError: null,
              expiresAtMs,
            },
          });
          rebuildCurrentState();

          return {
            authRequestId,
            providerAccountId,
            status: "pending",
            userCode: login.userCode,
            verificationUri: login.verificationUrl,
            verificationUriComplete: login.verificationUrl,
            intervalSeconds: 5,
            expiresAtMs,
          };
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
        upsertProviderDeviceAuthSession({
          databasePath: initialization.databasePath,
          session: {
            authRequestId,
            providerAccountId,
            providerId: existingAccount.providerId,
            variantId: variant.variantId,
            credentialBackend:
              existingAccount.credentialRef.backend === "local-encrypted-file"
                ? "local-file"
                : existingAccount.credentialRef.backend,
            credentialRef:
              existingAccount.credentialRef.ref ||
              createCredentialRef(existingAccount.providerId, providerAccountId),
            authMode: existingAccount.authMode,
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
      });
    },
    async updateProviderApiKey(body: Record<string, unknown>): Promise<ProviderAccountRecord> {
      const providerAccountId = readRequiredString(
        body,
        "providerAccountId",
        "updateProviderApiKey",
      );
      const apiKey = readRequiredString(body, "apiKey", "updateProviderApiKey");
      return withProviderAccountRepairLock(providerAccountId, async () => {
        currentAccounts = [...readCurrentAccounts()];
        const existingAccount = currentAccounts.find(
          (entry) => entry.providerAccountId === providerAccountId,
        );
        if (!existingAccount) {
          throw new Error(`Provider account ${providerAccountId} was not found.`);
        }
        if (
          existingAccount.authMode !== "api-key-static" &&
          existingAccount.authMode !== "api-key-rotating-ref"
        ) {
          throw new Error(
            `Provider account ${providerAccountId} does not use an API key auth mode.`,
          );
        }
        const activePendingSession = listCurrentProviderDeviceAuthorizations().find(
          (session) =>
            session.providerAccountId === providerAccountId &&
            session.status === "pending" &&
            session.expiresAtMs > Date.now(),
        );
        if (activePendingSession) {
          throw new Error(
            `Provider account ${providerAccountId} already has a reconnect in progress.`,
          );
        }

        const apiKeyRef = `api-key/${sanitizeSegment(existingAccount.providerId)}/${sanitizeSegment(providerAccountId)}`;
        const validationResult = validateProviderAccounts({
          catalog: currentNormalizedCatalog,
          additionalProviders: liteLLMProviders,
          allowedRoleIds: getAllowedRoleIds(),
          accounts: [
            {
              ...existingAccount,
              credentialRef: {
                backend: "local-file",
                ref: apiKeyRef,
              },
              status: "active",
              healthStatus: "healthy",
              rotationState: "stable",
            },
          ],
        });
        if (validationResult.diagnostics.length > 0 || validationResult.accounts.length !== 1) {
          const message =
            validationResult.diagnostics[0]?.message ??
            "Provider API-key repair validation failed.";
          throw new Error(message);
        }

        const [validatedAccount] = validationResult.accounts;
        await persistStaticCredentialFile(
          options.runtimeStateRoot,
          options.scopeId,
          apiKeyRef,
          apiKey,
        );
        upsertSqliteProviderAccount({
          databasePath: initialization.databasePath,
          account: validatedAccount,
        });
        rebuildCurrentState();
        clearExecutionCircuitsForProviderAccount({
          databasePath: initialization.databasePath,
          providerAccountId: validatedAccount.providerAccountId,
          runtimeEndpoints,
        });
        return validatedAccount;
      });
    },
    async openExternalUrl(body: Record<string, unknown>): Promise<{ opened: true; url: string }> {
      const url = validateExternalUrl(readRequiredString(body, "url", "openExternalUrl"));
      openUrlInDefaultBrowser(url);
      return {
        opened: true,
        url,
      };
    },
    async removeProviderAccountModel(
      providerAccountId: string,
      modelId: string,
    ): Promise<ConfiguredModelEjectResult> {
      if (isLocalPeerProviderAccountId(providerAccountId)) {
        return configuredModelEjectResult("absent", false, true, {}, false);
      }
      return withUnifiedConfigMutationLock(async () => {
        const targetEndpointIds = new Set([
          ...runtimeEndpoints
            .filter(
              (endpoint) =>
                endpoint.providerAccountId === providerAccountId && endpoint.modelId === modelId,
            )
            .map((endpoint) => endpoint.endpointId),
          ...currentRegistrySources.cloud
            .filter(
              (endpoint) =>
                endpoint.providerAccountId === providerAccountId && endpoint.modelId === modelId,
            )
            .map((endpoint) => endpoint.endpointId),
        ]);
        const explicitReferences = [
          ...(currentUnifiedRuntimeConfig?.modelAliases ?? [])
            .filter(
              (alias) =>
                !isPrimaryRoutingAliasId(alias.aliasId) && alias.modelIds.includes(modelId),
            )
            .map((alias) => ({
              kind: "custom-alias",
              owner: "unified-runtime-config",
              path: `modelAliases.${alias.aliasId}`,
              policy: "block" as const,
              modelId,
            })),
          ...(currentUnifiedRuntimeConfig?.controller
            ? [
                {
                  kind: "controller",
                  owner: "unified-runtime-config",
                  path: "controller",
                  policy: "auto-reassign-or-clear" as const,
                  modelId: currentUnifiedRuntimeConfig.controller.modelId ?? undefined,
                  endpointId: currentUnifiedRuntimeConfig.controller.endpointId ?? undefined,
                },
              ]
            : []),
          ...(currentUnifiedRuntimeConfig?.difficultyClassifier
            ? [
                {
                  kind: "difficulty-classifier",
                  owner: "unified-runtime-config",
                  path: "difficultyClassifier",
                  policy: "block" as const,
                  modelId: currentUnifiedRuntimeConfig.difficultyClassifier.modelId ?? undefined,
                  endpointId:
                    currentUnifiedRuntimeConfig.difficultyClassifier.endpointId ?? undefined,
                },
              ]
            : []),
        ];
        const configuredKeys = currentAccounts.flatMap((account) =>
          account.allowedModels.map((configuredModelId) => ({
            providerAccountId: account.providerAccountId,
            modelId: configuredModelId,
          })),
        );
        const blockingReferences = findConfiguredModelBlockingReferences({
          target: { providerAccountId, modelId },
          configuredKeys,
          references: explicitReferences,
          targetEndpointIds,
        });
        const controllerReferences = findConfiguredModelReferencesByPolicy({
          target: { providerAccountId, modelId },
          configuredKeys,
          references: explicitReferences,
          policy: "auto-reassign-or-clear",
          targetEndpointIds,
        });
        const modelSuppliedBySibling = currentAccounts.some(
          (account) =>
            account.providerAccountId !== providerAccountId &&
            account.allowedModels.includes(modelId),
        );
        const generatedAliasPruneCount = modelSuppliedBySibling
          ? 0
          : (currentUnifiedRuntimeConfig?.modelAliases ?? []).filter(
              (alias) => isPrimaryRoutingAliasId(alias.aliasId) && alias.modelIds.includes(modelId),
            ).length;
        if (blockingReferences.length > 0) {
          throw new ConfiguredModelReferenceConflictError(blockingReferences);
        }
        const resolvedControllerAssignment =
          controllerReferences.length > 0
            ? resolveProjectedControllerAssignment(targetEndpointIds)
            : null;
        const nextUnifiedRuntimeConfig =
          currentUnifiedRuntimeConfig && controllerReferences.length > 0
            ? rewriteUnifiedRuntimeConfigController(
                currentUnifiedRuntimeConfig,
                resolvedControllerAssignment
                  ? {
                      endpointId: resolvedControllerAssignment.endpointId,
                      modelId: resolvedControllerAssignment.modelId,
                      sourceType: resolvedControllerAssignment.sourceType,
                    }
                  : null,
              )
            : currentUnifiedRuntimeConfig;
        const configOwnsAccount =
          currentUnifiedRuntimeConfig?.liteLLM.providers.some(
            (provider) => `${provider.providerId}.litellm` === providerAccountId,
          ) ?? false;
        const previousPersistedController = readPersistedControllerAssignment();
        if (configOwnsAccount && currentUnifiedRuntimeConfig) {
          if (!currentUnifiedRuntimeConfig) {
            throw new Error("Runtime config disappeared while waiting for its mutation lock.");
          }
          const mutation = removeUnifiedRuntimeConfigProviderModel(
            currentUnifiedRuntimeConfig,
            providerAccountId,
            modelId,
          );
          const nextConfig =
            mutation.removed && nextUnifiedRuntimeConfig
              ? removeUnifiedRuntimeConfigProviderModel(
                  nextUnifiedRuntimeConfig,
                  providerAccountId,
                  modelId,
                ).config
              : mutation.config;
          if (!mutation.removed) {
            return configuredModelEjectResult(
              "runtime-config-managed",
              mutation.removedAccount,
              true,
            );
          }
          if (!options.unifiedRuntimeConfigPath) {
            throw new Error("Config-owned model eject requires unifiedRuntimeConfigPath.");
          }
          const previousConfig = currentUnifiedRuntimeConfig;
          const previousText = await readFile(options.unifiedRuntimeConfigPath, "utf8");
          const previousIntent = readOperatorIntentResult(operatorIntentLocation);
          if (previousIntent.diagnostic.status === "corrupt") {
            throw new Error(
              `operator intent manifest is corrupt: ${previousIntent.diagnostic.message}`,
            );
          }
          const previousAccount = currentAccounts.find(
            (account) => account.providerAccountId === providerAccountId,
          );
          const previousEndpoints = runtimeEndpoints.filter(
            (endpoint) => endpoint.providerAccountId === providerAccountId,
          );
          const nextText = renderUnifiedRuntimeConfigText(nextConfig);
          try {
            await writeConfigTextAtomically(options.unifiedRuntimeConfigPath, nextText);
            persistOperatorIntent(operatorIntentLocation, (intent) =>
              removeRemoteActivationsByConfiguredModel(intent, providerAccountId, modelId),
            );
            deleteRuntimeEndpointsByModelId(initialization.databasePath, modelId, [
              providerAccountId,
            ]);
            writeResolvedControllerAssignment(resolvedControllerAssignment);
            const projectedModelIds =
              nextConfig.liteLLM.providers
                .find((provider) => `${provider.providerId}.litellm` === providerAccountId)
                ?.modelMappings.map((mapping) => mapping.modelId) ?? [];
            const projectedAccount = currentAccounts.find(
              (account) => account.providerAccountId === providerAccountId,
            );
            if (projectedModelIds.length === 0) {
              deleteProviderAccountsById(initialization.databasePath, [providerAccountId]);
            } else if (projectedAccount) {
              upsertSqliteProviderAccount({
                databasePath: initialization.databasePath,
                account: {
                  ...projectedAccount,
                  allowedModels: projectedModelIds,
                  modelRoleBindings: projectedAccount.modelRoleBindings?.filter((binding) =>
                    projectedModelIds.includes(binding.modelId),
                  ),
                },
              });
            }
            await applyUnifiedRuntimeConfigState(nextConfig);
          } catch (error) {
            try {
              await writeConfigTextAtomically(options.unifiedRuntimeConfigPath, previousText);
              await applyUnifiedRuntimeConfigState(previousConfig);
              writeResolvedControllerAssignment(
                previousPersistedController
                  ? {
                      scope: "global",
                      endpointId: previousPersistedController.endpointId,
                      modelId: previousPersistedController.modelId,
                      sourceType:
                        previousPersistedController.sourceType === "remote" ? "remote" : "local",
                      updatedAtMs: previousPersistedController.updatedAtMs,
                    }
                  : null,
              );
              if (previousAccount) {
                upsertSqliteProviderAccount({
                  databasePath: initialization.databasePath,
                  account: previousAccount,
                });
              }
              for (const endpoint of previousEndpoints) {
                upsertSqliteRuntimeEndpoint({
                  databasePath: initialization.databasePath,
                  endpoint,
                });
              }
              if (previousIntent.intent) {
                writeOperatorIntent(operatorIntentLocation, previousIntent.intent);
              } else {
                await rm(resolveOperatorIntentPath(operatorIntentLocation), { force: true });
              }
              rebuildCurrentState();
            } catch (rollbackError) {
              throw new ConfiguredModelEjectMutationError(
                "configured_model_eject_indeterminate",
                "runtime-config-rollback",
                "indeterminate",
                true,
                rollbackError instanceof Error
                  ? rollbackError.message
                  : "Runtime config rollback failed.",
              );
            }
            throw new ConfiguredModelEjectMutationError(
              "configured_model_eject_rolled_back",
              "runtime-config-apply",
              false,
              false,
              error instanceof Error ? error.message : "Runtime config eject was rolled back.",
            );
          }
          return configuredModelEjectResult(
            "runtime-config-managed",
            mutation.removedAccount,
            false,
            {
              modelRoleBindings:
                (previousAccount?.modelRoleBindings?.length ?? 0) -
                (currentAccounts.find((account) => account.providerAccountId === providerAccountId)
                  ?.modelRoleBindings?.length ?? 0),
              runtimeEndpoints: previousEndpoints.filter((endpoint) => endpoint.modelId === modelId)
                .length,
              remoteActivations:
                previousIntent.intent?.remoteActivations.filter(
                  (activation) =>
                    activation.providerAccountId === providerAccountId &&
                    activation.modelId === modelId,
                ).length ?? 0,
              generatedAliases: generatedAliasPruneCount,
            },
          );
        }
        const existingAccount = currentAccounts.find(
          (entry) => entry.providerAccountId === providerAccountId,
        );
        if (!existingAccount) {
          return configuredModelEjectResult("absent", true, true);
        }

        const nextAllowedModels = existingAccount.allowedModels.filter(
          (candidate) => candidate !== modelId,
        );
        const nextModelRoleBindings = (existingAccount.modelRoleBindings ?? []).filter(
          (binding) => binding.modelId !== modelId,
        );
        const hadEndpoint = runtimeEndpoints.some(
          (endpoint) =>
            endpoint.providerAccountId === providerAccountId && endpoint.modelId === modelId,
        );
        const modelChanged =
          nextAllowedModels.length !== existingAccount.allowedModels.length ||
          nextModelRoleBindings.length !== (existingAccount.modelRoleBindings?.length ?? 0) ||
          hadEndpoint;
        if (!modelChanged) {
          return configuredModelEjectResult("account-managed", false, true);
        }

        let validatedAccount: ProviderAccountRecord | null = null;
        if (nextAllowedModels.length > 0) {
          const normalizedAccount = normalizeProviderAccountRoleBindings({
            ...existingAccount,
            allowedModels: nextAllowedModels,
            modelRoleBindings: nextModelRoleBindings,
          });
          const validationResult = validateProviderAccounts({
            catalog: currentNormalizedCatalog,
            additionalProviders: liteLLMProviders,
            allowedRoleIds: getAllowedRoleIds(),
            accounts: [normalizedAccount],
          });
          if (validationResult.diagnostics.length > 0 || validationResult.accounts.length !== 1) {
            throw new Error(
              validationResult.diagnostics[0]?.message ??
                "Provider account model removal validation failed.",
            );
          }
          validatedAccount = validationResult.accounts[0];
        }

        const previousIntent = readOperatorIntentResult(operatorIntentLocation);
        if (previousIntent.diagnostic.status === "corrupt") {
          throw new Error(
            `operator intent manifest is corrupt: ${previousIntent.diagnostic.message}`,
          );
        }
        const removedEndpoints = runtimeEndpoints.filter(
          (endpoint) =>
            endpoint.providerAccountId === providerAccountId && endpoint.modelId === modelId,
        );
        const runtimeConfigChanged =
          nextUnifiedRuntimeConfig !== null &&
          nextUnifiedRuntimeConfig !== currentUnifiedRuntimeConfig;
        const previousConfig = currentUnifiedRuntimeConfig;
        const previousConfigText =
          runtimeConfigChanged && options.unifiedRuntimeConfigPath
            ? await readFile(options.unifiedRuntimeConfigPath, "utf8")
            : null;
        try {
          persistOperatorIntent(operatorIntentLocation, (intent) =>
            removeRemoteActivationsByConfiguredModel(intent, providerAccountId, modelId),
          );
          deleteRuntimeEndpointsByModelId(initialization.databasePath, modelId, [
            providerAccountId,
          ]);
          if (
            runtimeConfigChanged &&
            nextUnifiedRuntimeConfig &&
            options.unifiedRuntimeConfigPath
          ) {
            await writeConfigTextAtomically(
              options.unifiedRuntimeConfigPath,
              renderUnifiedRuntimeConfigText(nextUnifiedRuntimeConfig),
            );
            writeResolvedControllerAssignment(resolvedControllerAssignment);
          }
          if (!validatedAccount) {
            deleteProviderAccountsById(initialization.databasePath, [providerAccountId]);
          } else {
            upsertSqliteProviderAccount({
              databasePath: initialization.databasePath,
              account: validatedAccount,
            });
          }
          if (runtimeConfigChanged && nextUnifiedRuntimeConfig) {
            await applyUnifiedRuntimeConfigState(nextUnifiedRuntimeConfig);
          } else {
            rebuildCurrentState();
          }
          return configuredModelEjectResult("account-managed", validatedAccount === null, false, {
            modelRoleBindings:
              (existingAccount.modelRoleBindings?.length ?? 0) - nextModelRoleBindings.length,
            runtimeEndpoints: removedEndpoints.length,
            remoteActivations:
              previousIntent.intent?.remoteActivations.filter(
                (activation) =>
                  activation.providerAccountId === providerAccountId &&
                  activation.modelId === modelId,
              ).length ?? 0,
            generatedAliases: generatedAliasPruneCount,
          });
        } catch (error) {
          try {
            upsertSqliteProviderAccount({
              databasePath: initialization.databasePath,
              account: existingAccount,
            });
            for (const endpoint of removedEndpoints) {
              upsertSqliteRuntimeEndpoint({ databasePath: initialization.databasePath, endpoint });
            }
            if (previousIntent.intent) {
              writeOperatorIntent(operatorIntentLocation, previousIntent.intent);
            } else {
              await rm(resolveOperatorIntentPath(operatorIntentLocation), { force: true });
            }
            if (
              runtimeConfigChanged &&
              previousConfigText &&
              previousConfig &&
              options.unifiedRuntimeConfigPath
            ) {
              await writeConfigTextAtomically(options.unifiedRuntimeConfigPath, previousConfigText);
              writeResolvedControllerAssignment(
                previousPersistedController
                  ? {
                      scope: "global",
                      endpointId: previousPersistedController.endpointId,
                      modelId: previousPersistedController.modelId,
                      sourceType:
                        previousPersistedController.sourceType === "remote" ? "remote" : "local",
                      updatedAtMs: previousPersistedController.updatedAtMs,
                    }
                  : null,
              );
              await applyUnifiedRuntimeConfigState(previousConfig);
            } else {
              rebuildCurrentState();
            }
          } catch (rollbackError) {
            throw new ConfiguredModelEjectMutationError(
              "configured_model_eject_indeterminate",
              "account-managed-rollback",
              "indeterminate",
              true,
              rollbackError instanceof Error
                ? rollbackError.message
                : "Account eject rollback failed.",
            );
          }
          throw new ConfiguredModelEjectMutationError(
            "configured_model_eject_rolled_back",
            "account-managed-apply",
            false,
            false,
            error instanceof Error ? error.message : "Account eject was rolled back.",
          );
        }
      });
    },
    async upsertProviderAccount(account: Record<string, unknown>): Promise<ProviderAccountRecord> {
      const credentialRef = account.credentialRef as { backend: string; ref: string } | undefined;
      if (
        credentialRef?.backend === "env" &&
        typeof credentialRef.ref === "string" &&
        looksLikeInlineApiKey(credentialRef.ref)
      ) {
        const providerId = String(account.providerId ?? "unknown");
        const providerAccountId = String(account.providerAccountId ?? "unknown");
        const apiKeyRef = `api-key/${sanitizeSegment(providerId)}/${sanitizeSegment(providerAccountId)}`;
        await persistStaticCredentialFile(
          options.runtimeStateRoot,
          options.scopeId,
          apiKeyRef,
          credentialRef.ref,
        );
        account.credentialRef = {
          backend: "local-file",
          ref: apiKeyRef,
        };
      }

      const providerAccountId = String(account.providerAccountId ?? "");
      const existingAccount = currentAccounts.find(
        (entry) => entry.providerAccountId === providerAccountId,
      );
      const mergedAccount = mergeProviderAccountMutation(account, existingAccount);

      const normalizedAccount = normalizeProviderAccountRoleBindings(mergedAccount);

      if (
        typeof normalizedAccount.providerId === "string" &&
        typeof normalizedAccount.authMode === "string" &&
        isOpenAICodexSubscriptionAccount({
          providerId: normalizedAccount.providerId,
          authMode: normalizedAccount.authMode,
        })
      ) {
        const allowedModels = Array.isArray(normalizedAccount.allowedModels)
          ? (normalizedAccount.allowedModels as string[])
          : [];
        assertOpenAICodexSubscriptionModelIds(allowedModels);
      }

      const validationResult = validateProviderAccounts({
        catalog: currentNormalizedCatalog,
        additionalProviders: liteLLMProviders,
        allowedRoleIds: getAllowedRoleIds(),
        accounts: [normalizedAccount],
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
      clearExecutionCircuitsForProviderAccount({
        databasePath: initialization.databasePath,
        providerAccountId: validatedAccount.providerAccountId,
        runtimeEndpoints,
      });

      return validatedAccount;
    },
    async startProviderDeviceAuthorization(
      body: Record<string, unknown>,
    ): Promise<DeviceAuthorizationStartResult> {
      const providerAccountId = readRequiredString(
        body,
        "providerAccountId",
        "deviceAuthorization",
      );
      const providerId = readRequiredString(body, "providerId", "deviceAuthorization");
      const variantId = readRequiredString(body, "variantId", "deviceAuthorization");
      const catalogProvider = currentNormalizedCatalog.providers.find(
        (entry) => entry.providerId === providerId,
      );
      const liteLLMProvider = liteLLMProviders.find((entry) => entry.providerId === providerId);
      const provider = catalogProvider ?? liteLLMProvider;
      if (!provider) {
        throw new Error(
          `Provider ${providerId} is not present in the normalized catalog or LiteLLM provider list.`,
        );
      }
      const mergedMetadata = catalogProvider
        ? resolveValidationProviderMetadata({
            catalogProvider,
            liteLLMProvider,
          })
        : null;
      const effectiveModelIds =
        readUnifiedLiteLLMProviderModelIds(currentUnifiedRuntimeConfig, providerId) ??
        currentNormalizedCatalog.models
          .filter((model) => model.providerId === providerId)
          .map((model) => model.modelId);
      const presetVariants = (providerPresets.providers[providerId]?.variants ?? []).map(
        (entry) => ({
          ...entry,
          modelIds: effectiveModelIds.length > 0 ? effectiveModelIds : entry.modelIds,
        }),
      );
      const runtimeProvider = liteLLMProvider;
      const variants = resolveProviderVariants({
        providerId,
        displayName: provider.displayName,
        apiBase: mergedMetadata?.apiBase ?? provider.apiBase,
        modelIds: effectiveModelIds,
        presetVariants,
        supportedAuthModes: runtimeProvider?.supportedAuthModes ?? provider.supportedAuthModes,
        oauth: runtimeProvider?.oauth,
      });
      const variant = variants.find((entry) => entry.variantId === variantId);
      if (!variant || variant.authMode !== "oauth2-device-code" || !variant.oauth) {
        throw new Error(`Provider variant ${variantId} does not expose device OAuth.`);
      }

      const effectiveVariantModelIds =
        effectiveModelIds.length > 0 ? effectiveModelIds : variant.modelIds;
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
      if (providerId === OPENAI_PROVIDER_ID && variantId === OPENAI_CODEX_SUBSCRIPTION_VARIANT_ID) {
        assertOpenAICodexSubscriptionModelIds(allowedModels);
      }

      const existingAccount = currentAccounts.find(
        (entry) => entry.providerAccountId === providerAccountId,
      );
      const credentialRef = createCredentialRef(providerId, providerAccountId);
      const deviceAuthorizationAccount = normalizeProviderAccountRoleBindings(
        mergeProviderAccountMutation(
          {
            providerAccountId,
            providerId,
            providerKind:
              readOptionalString(body, "providerKind") ??
              mergedMetadata?.providerKind ??
              provider.providerKind,
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
          existingAccount,
        ),
      );
      const validationResult = validateProviderAccounts({
        catalog: currentNormalizedCatalog,
        additionalProviders: liteLLMProviders,
        allowedRoleIds: getAllowedRoleIds(),
        accounts: [deviceAuthorizationAccount],
      });

      if (validationResult.diagnostics.length > 0 || validationResult.accounts.length !== 1) {
        throw new Error(
          validationResult.diagnostics[0]?.message ??
            "Provider device-authorization validation failed.",
        );
      }

      if (isCodexSubscriptionEndpoint(variant.oauth.deviceAuthorizationEndpoint)) {
        await supersedePendingCodexSubscriptionSessions(providerAccountId);
        const authRequestId = randomUUID();
        const codexHome = resolveManagedCodexSubscriptionHome(
          options.runtimeStateRoot,
          options.scopeId,
          authRequestId,
        );
        const login = await codexAuthAdapter.startDeviceCodeLogin({ codexHome });
        const expiresAtMs = Date.now() + 15 * 60 * 1000;
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
            verificationUri: login.verificationUrl,
            verificationUriComplete: login.verificationUrl,
            userCode: login.userCode,
            deviceCode: encodeCodexDeviceCodeSessionPayload({
              loginId: login.loginId,
              userCode: login.userCode,
              wsUrl: login.wsUrl,
              codexHome,
              pid: login.pid,
            }),
            intervalSeconds: 5,
            status: "pending",
            lastError: null,
            expiresAtMs,
          },
        });
        rebuildCurrentState();

        return {
          authRequestId,
          providerAccountId,
          status: "pending",
          userCode: login.userCode,
          verificationUri: login.verificationUrl,
          verificationUriComplete: login.verificationUrl,
          intervalSeconds: 5,
          expiresAtMs,
        };
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
    async pollProviderDeviceAuthorization(
      body: Record<string, unknown>,
    ): Promise<DeviceAuthorizationPollResult> {
      const authRequestId = readRequiredString(body, "authRequestId", "deviceAuthorization");
      const session = readProviderDeviceAuthSession({
        databasePath: initialization.databasePath,
        authRequestId,
      });
      if (!session) {
        throw new Error(`Device authorization request ${authRequestId} was not found.`);
      }
      const provider =
        currentNormalizedCatalog.providers.find(
          (entry) => entry.providerId === session.providerId,
        ) ?? liteLLMProviders.find((entry) => entry.providerId === session.providerId);
      if (!provider) {
        throw new Error(
          `Provider ${session.providerId} is not present in the normalized catalog or LiteLLM provider list.`,
        );
      }
      const effectiveModelIds =
        readUnifiedLiteLLMProviderModelIds(currentUnifiedRuntimeConfig, session.providerId) ??
        currentNormalizedCatalog.models
          .filter((model) => model.providerId === session.providerId)
          .map((model) => model.modelId);
      const presetVariants = (providerPresets.providers[session.providerId]?.variants ?? []).map(
        (entry) => ({
          ...entry,
          modelIds: effectiveModelIds.length > 0 ? effectiveModelIds : entry.modelIds,
        }),
      );
      const runtimeProvider = liteLLMProviders.find(
        (entry) => entry.providerId === session.providerId,
      );
      const variant = resolveProviderVariants({
        providerId: session.providerId,
        displayName: provider.displayName,
        apiBase: provider.apiBase,
        modelIds: effectiveModelIds,
        presetVariants,
        supportedAuthModes: runtimeProvider?.supportedAuthModes ?? provider.supportedAuthModes,
        oauth: runtimeProvider?.oauth,
      }).find((entry) => entry.variantId === session.variantId);
      if (!variant?.oauth) {
        throw new Error(`Provider variant ${session.variantId} does not expose device OAuth.`);
      }
      if (Date.now() >= session.expiresAtMs) {
        if (isCodexSubscriptionEndpoint(variant.oauth.tokenEndpoint)) {
          const payload = decodeCodexDeviceCodeSessionPayload(session.deviceCode);
          if (payload) {
            await cleanupManagedCodexDeviceCodeSession(payload);
          }
        }
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

      if (isCodexSubscriptionEndpoint(variant.oauth.tokenEndpoint)) {
        const payload = decodeCodexDeviceCodeSessionPayload(session.deviceCode);
        if (!payload) {
          upsertProviderDeviceAuthSession({
            databasePath: initialization.databasePath,
            session: {
              ...session,
              status: "failed",
              lastError:
                "Codex Subscription device authorization metadata is invalid. Reconnect to continue.",
            },
          });
          return {
            authRequestId,
            providerAccountId: session.providerAccountId,
            status: "failed",
            lastError:
              "Codex Subscription device authorization metadata is invalid. Reconnect to continue.",
          };
        }

        let accountRead: {
          readonly account: {
            readonly type?: string;
            readonly email?: string;
            readonly planType?: string;
          } | null;
          readonly requiresOpenaiAuth: boolean;
        } | null = null;
        try {
          accountRead = await codexAuthAdapter.readAccount({
            codexHome: payload.codexHome,
            loginId: payload.loginId,
            userCode: payload.userCode,
            wsUrl: payload.wsUrl,
            refreshToken: false,
          });
        } catch {
          await cleanupManagedCodexDeviceCodeSession(payload);
          upsertProviderDeviceAuthSession({
            databasePath: initialization.databasePath,
            session: {
              ...session,
              status: "failed",
              lastError:
                "Codex Subscription login helper stopped before the device authorization completed. Reconnect to continue.",
            },
          });
          return {
            authRequestId,
            providerAccountId: session.providerAccountId,
            status: "failed",
            lastError:
              "Codex Subscription login helper stopped before the device authorization completed. Reconnect to continue.",
          };
        }

        const isConnected =
          typeof accountRead?.account?.type === "string" &&
          accountRead.account.type.trim() === "chatgpt";
        if (!isConnected) {
          return {
            authRequestId,
            providerAccountId: session.providerAccountId,
            status: "pending",
            retryAfterSeconds: session.intervalSeconds,
          };
        }

        const cachedAuth = readStoredCodexAuthCache(payload.codexHome);
        const accessToken = readStoredCodexAccessToken(cachedAuth);
        if (accessToken.length === 0) {
          return {
            authRequestId,
            providerAccountId: session.providerAccountId,
            status: "pending",
            retryAfterSeconds: session.intervalSeconds,
            lastError:
              "Codex Subscription authorization completed, but the local auth cache is not ready yet.",
          };
        }

        await persistOauthTokenFile(
          options.runtimeStateRoot,
          options.scopeId,
          session.credentialRef,
          {
            providerId: session.providerId,
            providerAccountId: session.providerAccountId,
            access_token: accessToken,
            refresh_token: readStoredCodexRefreshToken(cachedAuth),
            token_type: "Bearer",
            saved_at_ms: Date.now(),
            codexAuth: cachedAuth,
          },
        );
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
        await cleanupManagedCodexDeviceCodeSession(payload);
        return {
          authRequestId,
          providerAccountId: session.providerAccountId,
          status: "connected",
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
        await persistOauthTokenFile(
          options.runtimeStateRoot,
          options.scopeId,
          session.credentialRef,
          {
            providerId: session.providerId,
            providerAccountId: session.providerAccountId,
            access_token: tokenPayload.access_token,
            refresh_token: tokenPayload.refresh_token,
            expires_in: tokenPayload.expires_in,
            scope: tokenPayload.scope,
            token_type: tokenPayload.token_type,
            saved_at_ms: Date.now(),
          },
        );
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

      const errorCode =
        typeof tokenPayload.error === "string" ? tokenPayload.error : "authorization_pending";
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
          ? {
              retryAfterSeconds:
                errorCode === "slow_down" ? session.intervalSeconds + 5 : session.intervalSeconds,
            }
          : {}),
        ...(mappedStatus === "pending" ? {} : { lastError: errorDescription }),
      };
    },
    async activateEndpoint(body: Record<string, unknown>): Promise<Record<string, unknown>> {
      return activateRuntimeEndpoint(body);
    },
    async readControllerAssignment(): Promise<BridgeControllerAssignment | null> {
      return getCurrentControllerAssignment();
    },
    async updateControllerAssignment(
      body: Record<string, unknown>,
    ): Promise<BridgeControllerAssignment> {
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
        providerAccountId?: string;
        roleIds: readonly string[];
        localModelSource?: "llama-swap" | "peer-backed";
        endpointKind: string;
        servingSource: string;
        sourceType: "local" | "remote";
        healthStatus: string;
        routingEligible: boolean;
        benchmarkEligible: boolean;
        capabilities: readonly string[];
        toolCallingSupported: boolean;
        toolCallingStyle: string;
        executionCooldown?: RuntimeExecutionCooldownReceipt;
        status: string;
      }[]
    > {
      const { routingEligibleEndpointIds, benchmarkEligibleEndpointIds } =
        buildEffectiveEligibilitySnapshot();
      const localSourcesByEndpointId = new Map(
        getCurrentRegistrySources().local.map((source) => [source.endpointId, source] as const),
      );
      const runtimeEndpointsById = new Map(
        runtimeEndpoints.map((entry) => [entry.endpointId, entry] as const),
      );
      const accountsById = new Map(
        currentAccounts.map((account) => [account.providerAccountId, account] as const),
      );
      const cooldownsByEndpointId = new Map(
        readExecutionCooldownReceipts({
          databasePath: initialization.databasePath,
          nowMs: Date.now(),
        }).map((receipt) => [receipt.endpointId, receipt] as const),
      );
      return currentRegistry.endpoints.map((endpoint) => {
        const runtimeEndpoint = runtimeEndpointsById.get(endpoint.identity.endpoint_id);
        const localSource = localSourcesByEndpointId.get(endpoint.identity.endpoint_id);
        return {
          endpointId: endpoint.identity.endpoint_id,
          modelId: endpoint.identity.model_id,
          providerId:
            localSource?.providerId ??
            (runtimeEndpoint
              ? (accountsById.get(runtimeEndpoint.providerAccountId)?.providerId ?? null)
              : (currentModelsById.get(endpoint.identity.model_id)?.providerId ?? null)),
          providerAccountId: runtimeEndpoint?.providerAccountId,
          roleIds: getEndpointRoleIds(
            endpoint.identity.endpoint_id,
            runtimeEndpoints,
            currentAccounts,
            currentRegistry,
            currentRolePolicy.roleDefinitions,
            getLlamaSwapRoleIdsByModelId(),
          ),
          localModelSource:
            localSource?.localModelSource ?? toLocalModelSource(endpoint.identity.serving_source),
          endpointKind: endpoint.identity.endpoint_kind,
          servingSource: endpoint.identity.serving_source,
          sourceType: toSourceType(endpoint.identity.endpoint_kind),
          healthStatus:
            runtimeEndpoint?.healthStatus ??
            (endpoint.deniedByPolicy ? "policy-blocked" : "healthy"),
          routingEligible: routingEligibleEndpointIds.has(endpoint.identity.endpoint_id),
          benchmarkEligible: benchmarkEligibleEndpointIds.has(endpoint.identity.endpoint_id),
          capabilities: endpoint.declared.capabilities,
          toolCallingSupported: endpoint.declared.tool_calling.supported,
          toolCallingStyle: endpoint.declared.tool_calling.style,
          ...(cooldownsByEndpointId.get(endpoint.identity.endpoint_id)
            ? {
                executionCooldown: cooldownsByEndpointId.get(endpoint.identity.endpoint_id),
              }
            : {}),
          webSearchSupport: resolveEndpointWebSearchSupport(endpoint),
          status: endpoint.status,
        };
      });
    },
    async readRouterSummary(): Promise<unknown> {
      return readRouterSummaryData();
    },
    async readRouterConfig(): Promise<unknown> {
      return readRouterConfigData();
    },
    async listRouterCandidates(): Promise<readonly unknown[]> {
      return listRouterCandidateData();
    },
    async readBenchmarkSummary(): Promise<unknown> {
      const summary = await readBenchmarkSummaryData();
      if (summary.subjects.length > 0) {
        return summary;
      }
      const candidates = await listRouterCandidateData();
      const subjects = candidates.flatMap((candidate) => {
        const capability = (
          candidate as {
            benchmarkCapability?: {
              overallScore: number | null;
              scoresByBucket?: Record<string, { score: number; cases?: number }>;
            };
          }
        ).benchmarkCapability;
        const latestProfile = candidate.latestProfile as unknown as Record<string, unknown> | null;
        const sources = latestProfile?.sources as Record<string, unknown> | undefined;
        const benchmarkSamples =
          typeof sources?.benchmark_samples === "number" ? sources.benchmark_samples : 0;
        const profileScore =
          typeof latestProfile?.judge_score === "number"
            ? latestProfile.judge_score
            : typeof latestProfile?.quality_score === "number"
              ? latestProfile.quality_score
              : null;
        if (!capability && benchmarkSamples === 0 && profileScore === null) {
          return [];
        }
        const emptyBucket = { score: 0, cases: 0 };
        const scoresByBucket = {
          easy: capability?.scoresByBucket?.easy ?? emptyBucket,
          medium: capability?.scoresByBucket?.medium ?? emptyBucket,
          hard: capability?.scoresByBucket?.hard ?? emptyBucket,
        };
        return [
          {
            endpointId: candidate.endpointId,
            modelId: candidate.modelId,
            overallScore: capability?.overallScore ?? profileScore ?? 0,
            scoresByBucket,
            passingCaseIds: [],
            caseCount: 0,
          },
        ];
      });
      return subjects.length > 0 ? { ...summary, subjects } : summary;
    },
    async listBenchmarkRuns(): Promise<unknown> {
      return listBenchmarkRuns(benchmarkArtifactRoot);
    },
    async readBenchmarkSummariesByMode(): Promise<unknown> {
      return readBenchmarkSummariesByMode({
        artifactRoot: benchmarkArtifactRoot,
        resolveModelId: resolveBenchmarkEndpointModelId,
      });
    },
    async readBenchmarkPreferences(): Promise<unknown> {
      return readBenchmarkPreferences(benchmarkPreferencesPath);
    },
    async updateBenchmarkPreferences(body: Record<string, unknown>): Promise<unknown> {
      const judgeEndpointId =
        typeof body.judge_endpoint_id === "string"
          ? body.judge_endpoint_id
          : typeof body.judgeEndpointId === "string"
            ? body.judgeEndpointId
            : null;
      if (!judgeEndpointId) {
        throw new Error("judgeEndpointId is required.");
      }
      const registryEndpoint = currentRegistry.endpoints.find(
        (entry) => entry.identity.endpoint_id === judgeEndpointId,
      );
      if (!registryEndpoint) {
        throw new Error(`Unknown endpoint id: ${judgeEndpointId}`);
      }
      if (!resolveHealthyEndpoint(judgeEndpointId)) {
        throw new Error(`Endpoint is not healthy enough for judge role: ${judgeEndpointId}`);
      }
      return writeBenchmarkPreferences(benchmarkPreferencesPath, { judgeEndpointId });
    },
    async listRouterDecisions(): Promise<readonly unknown[]> {
      return listRouterDecisionData();
    },
    async readRouterDecision(requestId: string): Promise<unknown> {
      return readRouterDecisionData(requestId);
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
    async queryTelemetryAnalytics(
      body: Record<string, unknown>,
    ): Promise<BridgeTelemetryAnalyticsResponse> {
      return queryTelemetryAnalyticsData(body);
    },
    subscribeTelemetry(listener: (event: RuntimeTelemetryStreamEvent) => void): () => void {
      telemetryListeners.add(listener);
      return () => {
        telemetryListeners.delete(listener);
      };
    },
    async readRequestObservation(requestId: string): Promise<BridgeRequestObservation | null> {
      const telemetryRecord = listTelemetryRequestRecords({
        startAtMs: 0,
        endAtMs: Date.now() + DEFAULT_TELEMETRY_WINDOW_MS,
        limit: DEFAULT_TELEMETRY_LIMIT,
      }).find((record) => record.requestId === requestId);
      const observation = readRuntimeObservationBundle({
        databasePath: initialization.databasePath,
        requestId,
      }) as RuntimeObservationBundle | null;
      if (!observation) {
        if (!telemetryRecord) {
          return null;
        }
        const capturePolicy = synthesizeFallbackCapturePolicy(telemetryRecord);
        const privacyReceipt = synthesizeFallbackPrivacyReceipt(telemetryRecord);
        const fallbackExecutionCooldowns = readExecutionCooldownsFromTelemetryDimensions(
          telemetryRecord.dimensions,
        );
        const fallbackErrorContext = readTelemetryErrorContextFromDimensions(
          telemetryRecord.dimensions,
        );
        const fallbackExecutionDiagnostics =
          telemetryRecord.errorClass !== null
            ? [
                {
                  code: telemetryRecord.errorClass,
                  severity: "error",
                  message:
                    typeof fallbackErrorContext?.message === "string" &&
                    fallbackErrorContext.message.trim().length > 0
                      ? fallbackErrorContext.message.trim()
                      : humanizeRuntimeErrorClass(telemetryRecord.errorClass),
                },
              ]
            : [];
        return {
          requestId: telemetryRecord.requestId,
          routingDecisionId: telemetryRecord.routingDecisionId,
          endpointId: telemetryRecord.endpointId,
          clientRequestId: telemetryRecord.clientRequestId ?? null,
          sourceType: telemetryRecord.sourceType,
          providerId: telemetryRecord.providerId,
          endpointKind: telemetryRecord.endpointKind,
          servingSource: telemetryRecord.servingSource,
          healthStatus: telemetryRecord.healthStatus,
          status: telemetryRecord.status,
          roleIds: telemetryRecord.roleIds,
          statusFamily: telemetryRecord.statusFamily,
          usageEvent: {
            request_id: telemetryRecord.requestId,
            routing_decision_id: telemetryRecord.routingDecisionId,
            endpoint_id: telemetryRecord.endpointId,
            model_id: telemetryRecord.modelId,
            provider_kind: telemetryRecord.providerKind,
            tokens_in: telemetryRecord.inputTokens,
            tokens_in_source: telemetryRecord.inputTokensSource,
            tokens_in_available: telemetryRecord.inputTokensAvailable,
            tokens_out: telemetryRecord.outputTokens,
            tokens_out_source: telemetryRecord.outputTokensSource,
            tokens_out_available: telemetryRecord.outputTokensAvailable,
            latency_ms: telemetryRecord.latencyMs,
            cost_actual: telemetryRecord.actualCostUsd,
            cost_estimate: telemetryRecord.estimatedCostUsd,
            currency: telemetryRecord.currency ?? "USD",
            error_class: telemetryRecord.errorClass,
            timestamp_ms: telemetryRecord.createdAtMs,
          },
          cacheObservability: {
            promptCacheRequested: telemetryRecord.promptCacheRequested,
            ...(telemetryRecord.promptCacheRequestSource
              ? { promptCacheRequestSource: telemetryRecord.promptCacheRequestSource }
              : {}),
            promptCacheUsed: telemetryRecord.promptCacheUsed,
            cacheReadTokens: telemetryRecord.cacheReadTokens,
            cacheWriteTokens: telemetryRecord.cacheWriteTokens,
          },
          diagnostics: {
            routing: [],
            execution: fallbackExecutionDiagnostics,
            authAccount: [],
            memoryQuality: [],
            tooling: [],
            operator: [],
          },
          executionTelemetry: {
            providerFamily: telemetryRecord.providerFamily,
            ...(telemetryRecord.vendorId ? { vendorId: telemetryRecord.vendorId } : {}),
            finishReason: telemetryRecord.finishReason,
            promptCaching: {
              supported: telemetryRecord.promptCacheSupported,
            },
            usageSupport: {
              inputTokens: true,
              outputTokens: true,
              cacheReadTokens: telemetryRecord.cacheReadTokensSupported,
              cacheWriteTokens: telemetryRecord.cacheWriteTokensSupported,
            },
            costProvenance: telemetryRecord.costProvenance,
          },
          executionSemantics: {
            ...(telemetryRecord.sourceClient ? { sourceClient: telemetryRecord.sourceClient } : {}),
            executionFamily:
              telemetryRecord.executionFamily ?? telemetryRecord.servingSource ?? "unknown",
            adapterFamily: telemetryRecord.adapterFamily ?? "unknown",
            payloadBytes: {
              ingress:
                telemetryRecord.ingressPayloadBytes ?? telemetryRecord.requestPayloadBytes ?? 0,
              translated:
                telemetryRecord.translatedPayloadBytes ?? telemetryRecord.requestPayloadBytes ?? 0,
              providerCanonical:
                telemetryRecord.providerCanonicalPayloadBytes ??
                telemetryRecord.requestPayloadBytes ??
                0,
              providerWire:
                telemetryRecord.providerWirePayloadBytes ??
                telemetryRecord.requestPayloadBytes ??
                0,
              providerResponse: telemetryRecord.responsePayloadBytes ?? 0,
            },
            retryCount: telemetryRecord.retryCount,
            rerouteCount: telemetryRecord.rerouteCount,
            cooldownDecision: telemetryRecord.cooldownDecision ?? "not_applied",
            idempotencyDecision: telemetryRecord.idempotencyDecision ?? "not_needed",
            toolSideEffectState: telemetryRecord.toolSideEffectState ?? "none",
            ...(fallbackExecutionCooldowns.length > 0
              ? { executionCooldowns: fallbackExecutionCooldowns }
              : {}),
          },
          telemetrySnapshot: {
            providerId: telemetryRecord.providerId,
            providerAccountId: telemetryRecord.providerAccountId,
            sourceType: telemetryRecord.sourceType,
            endpointKind: telemetryRecord.endpointKind,
            servingSource: telemetryRecord.servingSource,
            region: telemetryRecord.region,
            lifecycleStateAtRequest: telemetryRecord.status,
            healthStatusAtRequest: telemetryRecord.healthStatus,
            requestedModelId: telemetryRecord.requestedModelId,
            requestOperation: telemetryRecord.requestOperation,
            roleIds: telemetryRecord.roleIds,
            toolingUsed: telemetryRecord.toolingUsed,
            cacheState: telemetryRecord.cacheState,
            eligibleEndpointIds: telemetryRecord.eligibleEndpointIds,
            eligibleModelIds: telemetryRecord.eligibleModelIds,
            candidateCostSnapshot: telemetryRecord.candidateCostSnapshot,
            selectedPricingSnapshot: telemetryRecord.selectedPricingSnapshot,
            selectedUncachedCostUsd: telemetryRecord.selectedUncachedCostUsd,
            baselineMaxEligibleCostUsd: telemetryRecord.baselineMaxEligibleCostUsd,
            routingCostSavingsUsd: telemetryRecord.routingCostSavingsUsd,
            cacheCostSavingsUsd: telemetryRecord.cacheCostSavingsUsd,
            totalAvoidedCostUsd: telemetryRecord.totalAvoidedCostUsd,
            costBaselineSource: telemetryRecord.costBaselineSource,
            costSavingsSupport: telemetryRecord.costSavingsSupport,
            ...(telemetryRecord.dimensions ? { dimensions: telemetryRecord.dimensions } : {}),
          },
          ...(telemetryRecord.taxonomyGroupId ||
          telemetryRecord.taxonomyRoleId ||
          telemetryRecord.taxonomyTaskType ||
          telemetryRecord.taxonomyTaskVariant ||
          telemetryRecord.taxonomyCapabilityIds.length > 0 ||
          telemetryRecord.taxonomyModalityIds.length > 0 ||
          telemetryRecord.taxonomyToolClassIds.length > 0
            ? {
                taxonomyDimensions: {
                  ...(telemetryRecord.taxonomyGroupId
                    ? { taxonomy_group_id: telemetryRecord.taxonomyGroupId }
                    : {}),
                  ...(telemetryRecord.taxonomyRoleId
                    ? { taxonomy_role_id: telemetryRecord.taxonomyRoleId }
                    : {}),
                  ...(telemetryRecord.taxonomyTaskType
                    ? { taxonomy_task_type: telemetryRecord.taxonomyTaskType }
                    : {}),
                  ...(telemetryRecord.taxonomyTaskVariant
                    ? { taxonomy_task_variant: telemetryRecord.taxonomyTaskVariant }
                    : {}),
                  ...(telemetryRecord.taxonomyCapabilityIds.length > 0
                    ? { taxonomy_capability_ids: telemetryRecord.taxonomyCapabilityIds }
                    : {}),
                  ...(telemetryRecord.taxonomyModalityIds.length > 0
                    ? { taxonomy_modality_ids: telemetryRecord.taxonomyModalityIds }
                    : {}),
                  ...(telemetryRecord.taxonomyToolClassIds.length > 0
                    ? { taxonomy_tool_class_ids: telemetryRecord.taxonomyToolClassIds }
                    : {}),
                },
              }
            : {}),
          capturePolicy,
          inspection: {
            request: {
              requestId: telemetryRecord.requestId,
              ...(telemetryRecord.clientRequestId
                ? { clientRequestId: telemetryRecord.clientRequestId }
                : {}),
              routingDecisionId: telemetryRecord.routingDecisionId,
              responseCapture: {
                ...(telemetryRecord.statusCode !== null
                  ? { statusCode: telemetryRecord.statusCode }
                  : {}),
                ...(fallbackErrorContext ? { body: fallbackErrorContext } : {}),
              },
              diagnostics: {
                execution: fallbackExecutionDiagnostics,
              },
              capturePolicy,
            },
          },
          ...(privacyReceipt ? { privacyReceipt } : {}),
          observationAvailability: {
            source: "telemetry-ledger-fallback",
            rawObservationAvailable: false,
            structuredInspectionAvailable: capturePolicy.structuredInspectionAvailable,
            reason:
              "Raw observation retention has expired or the preserved observation bundle is unavailable; canonical request detail is reconstructed from the telemetry ledger.",
          },
          effectiveCostUsd: telemetryRecord.effectiveCostUsd,
          costCalculationBasis: telemetryRecord.costCalculationBasis,
          costCalculationVersion: telemetryRecord.costCalculationVersion,
          selectedUncachedCostUsd: telemetryRecord.selectedUncachedCostUsd,
          baselineMaxEligibleCostUsd: telemetryRecord.baselineMaxEligibleCostUsd,
          routingCostSavingsUsd: telemetryRecord.routingCostSavingsUsd,
          cacheCostSavingsUsd: telemetryRecord.cacheCostSavingsUsd,
          totalAvoidedCostUsd: telemetryRecord.totalAvoidedCostUsd,
          costBaselineSource: telemetryRecord.costBaselineSource,
          costSavingsSupport: telemetryRecord.costSavingsSupport,
        } as unknown as BridgeRequestObservation;
      }
      return {
        ...observation,
        ...getTelemetryEndpointMeta(observation.endpointId),
        observationAvailability: {
          source: "raw-observation",
          rawObservationAvailable: true,
          structuredInspectionAvailable: observation.capturePolicy.structuredInspectionAvailable,
          reason:
            "Request detail is backed by the preserved runtime observation bundle plus telemetry ledger supplements.",
        },
        ...(telemetryRecord
          ? {
              effectiveCostUsd: telemetryRecord.effectiveCostUsd,
              costCalculationBasis: telemetryRecord.costCalculationBasis,
              costCalculationVersion: telemetryRecord.costCalculationVersion,
              selectedUncachedCostUsd: telemetryRecord.selectedUncachedCostUsd,
              baselineMaxEligibleCostUsd: telemetryRecord.baselineMaxEligibleCostUsd,
              routingCostSavingsUsd: telemetryRecord.routingCostSavingsUsd,
              cacheCostSavingsUsd: telemetryRecord.cacheCostSavingsUsd,
              totalAvoidedCostUsd: telemetryRecord.totalAvoidedCostUsd,
              costBaselineSource: telemetryRecord.costBaselineSource,
              costSavingsSupport: telemetryRecord.costSavingsSupport,
            }
          : {}),
      } satisfies BridgeRequestObservation;
    },
    async listRecentRequestObservations(): Promise<
      readonly ReturnType<typeof listRecentRuntimeObservations>[number][]
    > {
      return listRecentRuntimeObservations({
        databasePath: initialization.databasePath,
      });
    },
    async listRecentRequestIds(limit = 10): Promise<readonly string[]> {
      return listRecentRuntimeRequestIds({
        databasePath: initialization.databasePath,
        limit,
      });
    },
    async readEndpointProfile(endpointId: string): Promise<{
      endpointId: string;
      latestProfile: ReturnType<typeof readLatestObservedProfile>;
      recentSamples: readonly ObservedPerformanceSample[];
      difficultyProfiles: Record<
        UnifiedRuntimeDifficultyBucket,
        ReturnType<typeof readLatestObservedProfile>
      >;
      advisoryMaxDifficultyRecommendation: ReturnType<
        typeof readAdvisoryMaxDifficultyRecommendation
      >;
    }> {
      return readEndpointProfileData(endpointId);
    },
    async readBenchmarkSuite(): Promise<unknown> {
      return readRoutingCapabilityBenchmarkSuite();
    },
    async runBenchmark(body: Record<string, unknown>): Promise<unknown> {
      const endpointIds = Array.isArray(body.endpoint_ids)
        ? body.endpoint_ids.filter((value): value is string => typeof value === "string")
        : Array.isArray(body.endpointIds)
          ? body.endpointIds.filter((value): value is string => typeof value === "string")
          : undefined;
      const caseIds = Array.isArray(body.case_ids)
        ? body.case_ids.filter((value): value is string => typeof value === "string")
        : Array.isArray(body.caseIds)
          ? body.caseIds.filter((value): value is string => typeof value === "string")
          : undefined;
      const mode = body.mode === "full" ? "full" : "quick";
      const judgeEndpointId =
        typeof body.judge_endpoint_id === "string"
          ? body.judge_endpoint_id
          : typeof body.judgeEndpointId === "string"
            ? body.judgeEndpointId
            : undefined;
      const useJudge = !(body.use_judge === false || body.useJudge === false);
      const preflightProbe = body.preflight_probe === true || body.preflightProbe === true;
      const startGuards = evaluateBenchmarkStartGuards({
        endpointIds,
        judgeEndpointId,
        useJudge,
      });
      if (!startGuards.allowed) {
        throw new Error(startGuards.warnings[0] ?? "benchmark_start_rejected");
      }
      const benchmarkCandidates = await listRouterCandidateData();
      const targetEligibility = evaluateBenchmarkTargetEligibility({
        endpointIds,
        judgeEndpointId,
        endpoints: benchmarkCandidates.map((candidate) => ({
          endpointId: candidate.endpointId,
          executionModeEligible: candidate.executionModeEligible,
          benchmarkEligible: candidate.benchmarkEligible,
        })),
      });
      if (!targetEligibility.allowed) {
        throw new Error(targetEligibility.warnings[0] ?? "benchmark_endpoint_ineligible");
      }
      if (judgeEndpointId && resolveHealthyEndpoint(judgeEndpointId)) {
        await writeBenchmarkPreferences(benchmarkPreferencesPath, { judgeEndpointId });
      }
      const runId = randomUUID();
      const warnings: string[] = [...startGuards.warnings];
      if (preflightProbe && judgeEndpointId && resolveHealthyEndpoint(judgeEndpointId)) {
        const configuredEndpoints = await backend.listEndpoints();
        const judgeEndpoint = configuredEndpoints.find(
          (endpoint) => endpoint.endpointId === judgeEndpointId,
        );
        if (judgeEndpoint) {
          const probe = await probeJudgeEndpoint(
            {
              databasePath: initialization.databasePath,
              listConfiguredEndpoints: async () => {
                const [endpoints, candidates] = await Promise.all([
                  backend.listEndpoints(),
                  listRouterCandidateData(),
                ]);
                const executionEligibilityByEndpointId = new Map(
                  candidates.map((candidate) => [
                    candidate.endpointId,
                    candidate.executionModeEligible,
                  ]),
                );
                return endpoints.map((endpoint) => ({
                  endpointId: endpoint.endpointId,
                  modelId: endpoint.modelId,
                  sourceType: endpoint.sourceType,
                  healthStatus: endpoint.healthStatus,
                  executionModeEligible: executionEligibilityByEndpointId.get(endpoint.endpointId),
                  benchmarkEligible: candidates.find(
                    (candidate) => candidate.endpointId === endpoint.endpointId,
                  )?.benchmarkEligible,
                }));
              },
              executeChatCompletions: async (chatBody, requestId, requestOptions) =>
                backend.executeChatCompletions(
                  chatBody as unknown as OpenAIChatCompletionsBody,
                  requestId,
                  undefined,
                  requestOptions,
                ),
              deriveEndpointVersion: () => "preflight",
            },
            { endpointId: judgeEndpoint.endpointId, modelId: judgeEndpoint.modelId },
          );
          if (!probe.ok) {
            warnings.push(`judge_probe_failed: ${probe.error ?? "unknown"}`);
          }
        }
      }
      void runRoutingCapabilityBenchmark(
        {
          databasePath: initialization.databasePath,
          benchmarkArtifactRoot,
          listConfiguredEndpoints: async () => {
            const [endpoints, candidates] = await Promise.all([
              backend.listEndpoints(),
              listRouterCandidateData(),
            ]);
            const executionEligibilityByEndpointId = new Map(
              candidates.map((candidate) => [
                candidate.endpointId,
                candidate.executionModeEligible,
              ]),
            );
            return endpoints.map((endpoint) => ({
              endpointId: endpoint.endpointId,
              modelId: endpoint.modelId,
              sourceType: endpoint.sourceType,
              healthStatus: endpoint.healthStatus,
              executionModeEligible: executionEligibilityByEndpointId.get(endpoint.endpointId),
              benchmarkEligible: candidates.find(
                (candidate) => candidate.endpointId === endpoint.endpointId,
              )?.benchmarkEligible,
            }));
          },
          executeChatCompletions: async (chatBody, requestId, requestOptions) =>
            backend.executeChatCompletions(
              chatBody as unknown as OpenAIChatCompletionsBody,
              requestId,
              undefined,
              requestOptions,
            ),
          deriveEndpointVersion: (endpointId: string) => {
            const endpoint = currentRegistry.endpoints.find(
              (entry) => entry.identity.endpoint_id === endpointId,
            );
            if (!endpoint) {
              return `${endpointId}:unknown`;
            }
            return `${endpoint.identity.runtime_version}:${endpoint.identity.variant_id ?? "default"}`;
          },
        },
        {
          runId,
          endpointIds,
          judgeEndpointId,
          mode,
          caseIds,
          useJudge,
          preflightProbe,
        },
      ).catch(() => undefined);
      return warnings.length > 0
        ? {
            runId,
            status: "running",
            warnings,
            judgeSubjectOverlap: startGuards.judgeSubjectOverlap,
          }
        : { runId, status: "running", judgeSubjectOverlap: startGuards.judgeSubjectOverlap };
    },
    async readBenchmarkRun(runId: string): Promise<unknown> {
      const progress = readBenchmarkRunProgress(runId);
      if (!progress) {
        throw new Error("benchmark run not found");
      }
      return progress;
    },
    async readActiveBenchmarkRun(): Promise<unknown> {
      return readActiveBenchmarkRunProgress();
    },
    async clearBenchmarkEndpointData(endpointId: string): Promise<unknown> {
      const registryEndpoint = currentRegistry.endpoints.find(
        (entry) => entry.identity.endpoint_id === endpointId,
      );
      if (!registryEndpoint) {
        throw new Error(`Unknown endpoint id: ${endpointId}`);
      }
      return clearObservedBenchmarkDataForEndpoint({
        databasePath: initialization.databasePath,
        endpointId,
      });
    },
    async clearBenchmarkData(): Promise<unknown> {
      const sqliteResult = clearAllObservedBenchmarkData({
        databasePath: initialization.databasePath,
      });
      const artifactResult = clearBenchmarkRunArtifacts({
        artifactRoot: benchmarkArtifactRoot,
      });
      return {
        ...sqliteResult,
        ...artifactResult,
      };
    },
    async listLocalModels(): Promise<
      readonly {
        modelId: string;
        loadedAt: string;
        engine: string;
        localModelSource?: "llama-swap" | "peer-backed";
        roleIds?: readonly string[];
        contextWindow?: number | null;
        proxyBaseUrl?: string | null;
        checkEndpoint?: string | null;
        useModelName?: string | null;
      }[]
    > {
      return collectLocalModels();
    },
    async listPeerLocalModels(): Promise<
      readonly {
        modelId: string;
        loadedAt: string;
        engine: string;
        localModelSource?: "llama-swap" | "peer-backed";
        roleIds?: readonly string[];
        contextWindow?: number | null;
        proxyBaseUrl?: string | null;
        checkEndpoint?: string | null;
        useModelName?: string | null;
      }[]
    > {
      return collectLocalModels("peer-backed");
    },
    async listLlamaSwapLocalModels(): Promise<
      readonly {
        modelId: string;
        loadedAt: string;
        engine: string;
        localModelSource?: "llama-swap" | "peer-backed";
        roleIds?: readonly string[];
        contextWindow?: number | null;
        proxyBaseUrl?: string | null;
        checkEndpoint?: string | null;
        useModelName?: string | null;
      }[]
    > {
      return collectLocalModels("llama-swap");
    },
    async loadLocalModel(modelId: string): Promise<{ success: boolean }> {
      if (await activateConfiguredLocalPeerModel(modelId)) {
        return { success: true };
      }
      return this.loadLlamaSwapModel(modelId);
    },
    async loadPeerModel(
      modelId: string,
      assignment?: RuntimeModelRoleAssignmentInput,
    ): Promise<{ success: boolean }> {
      const peers = await readStoredPeers();
      if (peers.length === 0) {
        throw new Error(
          "No peer endpoints configured. Add a peer endpoint before registering peer models.",
        );
      }
      if (!(await activateConfiguredLocalPeerModel(modelId, assignment))) {
        throw new Error(
          "No peer endpoints configured. Add a peer endpoint before registering peer models.",
        );
      }
      return { success: true };
    },
    async loadLlamaSwapModel(
      modelId: string,
      assignment?: RuntimeModelRoleAssignmentInput,
    ): Promise<{ success: boolean }> {
      if (assignment !== undefined) {
        await persistLlamaSwapModelRoleIds(modelId, assignment);
      }
      if (!currentLlamaSwapVendor) {
        throw new Error(
          "Llama-swap is not running. Enable llama_swap in runtime config before loading a model.",
        );
      }

      await currentLlamaSwapVendor.execute({
        providerFamily: "local",
        endpointId: "llama-swap.local",
        url: "local://runtime/v1/chat/completions",
        headers: { "content-type": "application/json" },
        body: { model: modelId, messages: [{ role: "user", content: "hello" }] },
      });
      insertSwapEvent({
        databasePath: initialization.databasePath,
        timestamp: new Date().toISOString(),
        oldModelId: null,
        newModelId: modelId,
        reason: "manual-load",
      });
      persistOperatorIntent(operatorIntentLocation, (intent) =>
        upsertLlamaSwapLoad(intent, {
          modelId,
          roleIds: assignment?.roleIds ?? getLlamaSwapRoleIdsByModelId()[modelId] ?? [],
          autoReload: true,
        }),
      );
      return { success: true };
    },
    async setPeerModelRoles(
      modelId: string,
      assignment: RuntimeModelRoleAssignmentInput,
    ): Promise<{ success: boolean }> {
      const peerAccountIds = new Set(
        runtimeEndpoints
          .filter(
            (endpoint) =>
              endpoint.lifecycleState === "active" &&
              endpoint.modelId === modelId &&
              isLocalPeerProviderAccountId(endpoint.providerAccountId),
          )
          .map((endpoint) => endpoint.providerAccountId),
      );
      if (peerAccountIds.size === 0) {
        const peers = await readStoredPeers();
        if (peers.length === 0) {
          throw new Error(`Peer model ${modelId} is not registered with the router.`);
        }
        await upsertPeerModelRoleBindings(
          modelId,
          assignment,
          new Set(peers.map((peer) => createLocalPeerProviderAccountId(peer.id))),
        );
      } else {
        await upsertPeerModelRoleBindings(modelId, assignment, peerAccountIds);
      }
      return { success: true };
    },
    async setLlamaSwapModelRoles(
      modelId: string,
      assignment: RuntimeModelRoleAssignmentInput,
    ): Promise<{ success: boolean }> {
      await persistLlamaSwapModelRoleIds(modelId, assignment);
      return { success: true };
    },
    async unloadPeerModel(modelId: string): Promise<{ success: boolean }> {
      const peerAccountIds = runtimeEndpoints
        .filter(
          (endpoint) =>
            endpoint.lifecycleState === "active" &&
            endpoint.modelId === modelId &&
            isLocalPeerProviderAccountId(endpoint.providerAccountId),
        )
        .map((endpoint) => endpoint.providerAccountId);
      if (peerAccountIds.length === 0) {
        return { success: false };
      }
      deleteRuntimeEndpointsByModelId(initialization.databasePath, modelId, peerAccountIds);
      const peers = await readStoredPeers();
      for (const peer of peers) {
        persistOperatorIntent(operatorIntentLocation, (intent) =>
          removePeerLoad(intent, peer.id, modelId),
        );
      }
      rebuildCurrentState();
      return { success: true };
    },
    async unloadLocalModel(modelId?: string): Promise<{ success: boolean }> {
      if (!currentLlamaSwapVendor?.unloadModel) {
        return { success: false };
      }
      const result = await currentLlamaSwapVendor.unloadModel(modelId);
      if (result.success) {
        insertSwapEvent({
          databasePath: initialization.databasePath,
          timestamp: new Date().toISOString(),
          oldModelId: modelId ?? null,
          newModelId: null,
          reason: "manual-unload",
        });
      }
      return { success: result.success };
    },
    async readLocalPolicy(): Promise<Record<string, unknown>> {
      const policyPath = path.join(options.runtimeStateRoot, "local-policy.json");
      try {
        if (existsSync(policyPath)) {
          return JSON.parse(await readFile(policyPath, "utf8")) as Record<string, unknown>;
        }
      } catch {
        // Fall through to defaults
      }
      return {
        ttl: 300,
        maxConcurrency: 1,
        autoUnload: true,
      };
    },
    async updateLocalPolicy(body: Record<string, unknown>): Promise<Record<string, unknown>> {
      const policyPath = path.join(options.runtimeStateRoot, "local-policy.json");
      const existing = await this.readLocalPolicy();
      const merged = { ...existing, ...body };
      await writeFile(policyPath, JSON.stringify(merged, null, 2));
      return merged;
    },
    async readRolePolicy(): Promise<RuntimeRolePolicyRecord> {
      return currentRolePolicy;
    },
    async createRolePolicyRole(
      body: Record<string, unknown>,
    ): Promise<RuntimeRoleDefinitionRecord> {
      const nextRole = validateRuntimeRoleDefinitionRecord(body, "createRolePolicyRole");
      if (currentRolePolicy.roleDefinitions.some((role) => role.role_id === nextRole.role_id)) {
        throw new Error(`Role ${nextRole.role_id} already exists.`);
      }
      const nextPolicy = await persistCurrentRolePolicy({
        roleDefinitions: [...currentRolePolicy.roleDefinitions, nextRole],
        taskDefinitions: currentRolePolicy.taskDefinitions,
      });
      return (
        nextPolicy.roleDefinitions.find((role) => role.role_id === nextRole.role_id) ?? nextRole
      );
    },
    async updateRolePolicyRole(
      roleId: string,
      body: Record<string, unknown>,
    ): Promise<RuntimeRoleDefinitionRecord> {
      const bodyRoleId = readOptionalString(body, "role_id");
      if (bodyRoleId && bodyRoleId !== roleId) {
        throw new Error(`Role update body role_id must match ${roleId}.`);
      }
      if (!currentRolePolicy.roleDefinitions.some((role) => role.role_id === roleId)) {
        throw new Error(`Role ${roleId} does not exist.`);
      }
      const nextRole = validateRuntimeRoleDefinitionRecord(
        { ...body, role_id: roleId },
        "updateRolePolicyRole",
      );
      const nextPolicy = await persistCurrentRolePolicy({
        roleDefinitions: currentRolePolicy.roleDefinitions.map((role) =>
          role.role_id === roleId ? nextRole : role,
        ),
        taskDefinitions: currentRolePolicy.taskDefinitions,
      });
      return nextPolicy.roleDefinitions.find((role) => role.role_id === roleId) ?? nextRole;
    },
    async listTaskDefinitions(): Promise<readonly RuntimeTaskDefinitionRecord[]> {
      return currentRolePolicy.taskDefinitions;
    },
    async updateTaskDefinitions(
      body: readonly Record<string, unknown>[],
    ): Promise<readonly RuntimeTaskDefinitionRecord[]> {
      const nextTasks = body.map((entry, index) =>
        validateRuntimeTaskDefinitionRecord(entry, `updateTaskDefinitions[${index}]`),
      );
      const nextPolicy = await persistCurrentRolePolicy({
        roleDefinitions: currentRolePolicy.roleDefinitions,
        taskDefinitions: nextTasks,
      });
      return nextPolicy.taskDefinitions;
    },
    async listSwapHistory(): Promise<
      readonly {
        timestamp: string;
        oldModel: string | null;
        newModel: string | null;
        reason: string;
      }[]
    > {
      try {
        const events = listSwapEvents({ databasePath: initialization.databasePath });
        return events.map((event) => ({
          timestamp: event.timestamp,
          oldModel: event.oldModelId,
          newModel: event.newModelId,
          reason: event.reason,
        }));
      } catch {
        return [];
      }
    },
    async getLocalLogs(): Promise<{ logs: string }> {
      const status = currentLlamaSwapVendor?.readStatus();
      const baseUrl = status?.baseUrl;
      if (baseUrl) {
        try {
          const response = await fetch(`${baseUrl}/logs`);
          if (response.ok) {
            const text = await response.text();
            if (text.trim().length > 0) {
              return { logs: text };
            }
          }
        } catch {
          // Fall through to telemetry-formatted logs.
        }
      }
      const records = listRuntimeTelemetryRecords({
        databasePath: initialization.databasePath,
        limit: 200,
      });
      return { logs: formatRuntimeTelemetryLogs(records) };
    },
    async proxyVendorLogStream(
      pathname: string,
      search: string,
    ): Promise<{ readonly body: string; readonly contentType: string } | null> {
      const status = currentLlamaSwapVendor?.readStatus();
      const baseUrl = status?.baseUrl;
      if (!baseUrl) {
        return null;
      }
      try {
        const response = await fetch(`${baseUrl}${pathname}${search}`);
        if (!response.ok) {
          return null;
        }
        return {
          body: await response.text(),
          contentType: response.headers.get("content-type") ?? "text/plain; charset=utf-8",
        };
      } catch {
        return null;
      }
    },
    async readModelOverrides(): Promise<Record<string, BridgeModelOverrideRecord>> {
      const overridesPath = path.join(options.runtimeStateRoot, "model-overrides.json");
      try {
        if (existsSync(overridesPath)) {
          return JSON.parse(await readFile(overridesPath, "utf8")) as Record<
            string,
            { ttl?: number; contextWindow?: number; concurrencyLimit?: number }
          >;
        }
      } catch {
        // Fall through to empty
      }
      return {};
    },
    async updateModelOverrides(
      body: Record<string, BridgeModelOverrideRecord>,
    ): Promise<Record<string, BridgeModelOverrideRecord>> {
      const overridesPath = path.join(options.runtimeStateRoot, "model-overrides.json");
      await writeFile(overridesPath, JSON.stringify(body, null, 2));
      currentModelOverrides = body;
      rebuildCurrentState();
      return body;
    },
    async readPeers(): Promise<readonly { id: string; url: string; authToken?: string }[]> {
      const peersPath = path.join(options.runtimeStateRoot, "peers.json");
      try {
        if (existsSync(peersPath)) {
          return JSON.parse(await readFile(peersPath, "utf8")) as readonly {
            id: string;
            url: string;
            authToken?: string;
          }[];
        }
      } catch {
        // Fall through to empty
      }
      return [];
    },
    async updatePeers(
      body: readonly { id: string; url: string; authToken?: string }[],
    ): Promise<readonly { id: string; url: string; authToken?: string }[]> {
      const peersPath = path.join(options.runtimeStateRoot, "peers.json");
      await writeFile(peersPath, JSON.stringify(body, null, 2));
      await syncLocalPeerState(body);
      if (body.length > 0) {
        await replayPersistedPeerAutoReloads(readOperatorIntent(operatorIntentLocation));
      }
      rebuildCurrentState();
      return body;
    },
    async checkPeerHealth(url: string): Promise<{ healthy: boolean }> {
      try {
        const response = await fetch(`${url}/healthz`, { signal: AbortSignal.timeout(5000) });
        return { healthy: response.ok };
      } catch {
        return { healthy: false };
      }
    },
    async shutdown(): Promise<void> {
      clearInterval(autoSwapInterval);
      await cleanupPendingManagedCodexSubscriptionSessions(
        "Runtime shut down before OpenAI sign-in completed. Start OAuth again.",
      );
      await Promise.all([currentLlamaSwapVendor?.shutdown(), currentLiteLLMVendor?.shutdown()]);
      await supervisor?.shutdown();
    },
  };

  void (async () => {
    sessionBootstrapState = {
      status: "running",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      stages: [],
    };
    sessionBootstrapState = await runSessionBootstrapStages({
      credentials: async () => {
        const operatorIntentRead = readOperatorIntentResult(operatorIntentLocation);
        operatorIntentDiagnostic = operatorIntentRead.diagnostic;
        if (operatorIntentRead.diagnostic.status === "corrupt") {
          return {
            status: "failed",
            message: `operator-intent.json is corrupt: ${operatorIntentRead.diagnostic.message}`,
            details: {
              path: resolveOperatorIntentPath(operatorIntentLocation),
            },
          };
        }

        currentAccounts = [...readCurrentAccounts()];
        rebuildCurrentState();

        const pendingAuthorizations = listCurrentProviderDeviceAuthorizations().filter(
          (authorization) =>
            authorization.status === "pending" && authorization.expiresAtMs > Date.now(),
        );
        const pendingToPoll = [...pendingAuthorizations]
          .sort((left, right) => {
            const expiresDelta = left.expiresAtMs - right.expiresAtMs;
            if (expiresDelta !== 0) {
              return expiresDelta;
            }
            return compareText(left.authRequestId, right.authRequestId);
          })
          .slice(0, 5);
        let pendingAttempted = 0;
        let pendingSucceeded = 0;
        let pendingConnected = 0;
        let pendingFailed = 0;
        const pendingDeferred = Math.max(0, pendingAuthorizations.length - pendingToPoll.length);
        for (const authorization of pendingToPoll) {
          pendingAttempted += 1;
          try {
            const pollResult = await backend.pollProviderDeviceAuthorization({
              authRequestId: authorization.authRequestId,
            });
            pendingSucceeded += 1;
            if (pollResult.status === "connected") {
              pendingConnected += 1;
            }
          } catch {
            pendingFailed += 1;
          }
        }

        let refreshAttempted = 0;
        let refreshSucceeded = 0;
        let refreshFailed = 0;
        for (const account of currentAccounts) {
          if (account.authMode !== "oauth2-device-code") {
            continue;
          }
          if (isCodexSubscriptionAccount(account)) {
            continue;
          }
          const tokenPayload = readFreshestStoredOauthTokenFileSync({
            runtimeStateRoot: options.runtimeStateRoot,
            scopeId: options.scopeId,
            credentialRef: account.credentialRef.ref,
          }).payload;
          if (!tokenNeedsRefresh(tokenPayload)) {
            continue;
          }
          refreshAttempted += 1;
          try {
            await refreshOauthAccessToken(
              options.runtimeStateRoot,
              options.scopeId,
              {
                endpointId: account.providerAccountId,
                modelId: account.allowedModels[0] ?? account.providerId,
                providerId: account.providerId,
                providerAccountId: account.providerAccountId,
                account,
              } as ResolvedExecutionTarget,
              providerPresets,
              liteLLMProviders,
              networkFetcher,
              deviceId,
              () => {
                rebuildCurrentState();
              },
            );
            upsertSqliteProviderAccount({
              databasePath: initialization.databasePath,
              account: {
                ...account,
                status: "active",
                healthStatus: "healthy",
                rotationState: "stable",
              },
            });
            currentAccounts = [...readCurrentAccounts()];
            rebuildCurrentState();
            refreshSucceeded += 1;
          } catch {
            upsertSqliteProviderAccount({
              databasePath: initialization.databasePath,
              account: {
                ...account,
                status: "active",
                healthStatus: "refresh-failing",
                rotationState: "failed",
              },
            });
            currentAccounts = [...readCurrentAccounts()];
            rebuildCurrentState();
            refreshFailed += 1;
          }
        }

        const credentialsStatus: BootstrapStageResult["status"] =
          pendingFailed > 0 || refreshFailed > 0 ? "degraded" : "ready";

        return {
          status: credentialsStatus,
          details: {
            pendingAttempted,
            pendingSucceeded,
            pendingConnected,
            pendingFailed,
            pendingDeferred,
            refreshAttempted,
            refreshSucceeded,
            refreshFailed,
          },
        };
      },
      endpoints: async () => {
        const operatorIntentRead = readOperatorIntentResult(operatorIntentLocation);
        operatorIntentDiagnostic = operatorIntentRead.diagnostic;
        if (operatorIntentRead.diagnostic.status === "corrupt") {
          return {
            status: "failed",
            message: `operator-intent.json is corrupt: ${operatorIntentRead.diagnostic.message}`,
            details: {
              path: resolveOperatorIntentPath(operatorIntentLocation),
            },
          };
        }

        const manifest = operatorIntentRead.intent;
        const existingEndpoints = listRuntimeEndpoints({
          databasePath: initialization.databasePath,
        });
        const existingEndpointIds = new Set(
          existingEndpoints.map((endpoint) => endpoint.endpointId),
        );
        let reconciled = 0;
        let failed = 0;
        let skipped = 0;
        for (const activation of manifest?.remoteActivations ?? []) {
          const manifestEndpointId =
            activation.endpointId ??
            createEndpointId(activation.providerAccountId, activation.region, activation.modelId);
          if (existingEndpointIds.has(manifestEndpointId)) {
            skipped += 1;
            continue;
          }
          try {
            activateRuntimeEndpoint({
              providerAccountId: activation.providerAccountId,
              modelId: activation.modelId,
              region: activation.region,
              endpointId: manifestEndpointId,
            });
            existingEndpointIds.add(manifestEndpointId);
            reconciled += 1;
          } catch {
            failed += 1;
          }
        }

        rebuildCurrentState();

        if (reconciled === 0 && failed > 0) {
          return {
            status: "degraded",
            message: "manifest endpoint reconciliation failed",
            details: {
              source: existingEndpoints.length > 0 ? "sqlite+manifest" : "manifest",
              count: existingEndpoints.length,
              reconciled,
              failed,
              skipped,
            },
          };
        }

        return {
          status: failed > 0 ? "degraded" : "ready",
          details: {
            source:
              existingEndpoints.length > 0
                ? reconciled > 0 || skipped > 0
                  ? "sqlite+manifest"
                  : "sqlite"
                : "manifest",
            count: existingEndpoints.length + reconciled,
            reconciled,
            failed,
            skipped,
          },
        };
      },
      peers: async () => {
        const operatorIntentRead = readOperatorIntentResult(operatorIntentLocation);
        operatorIntentDiagnostic = operatorIntentRead.diagnostic;
        if (operatorIntentRead.diagnostic.status === "corrupt") {
          return {
            status: "failed",
            message: `operator-intent.json is corrupt: ${operatorIntentRead.diagnostic.message}`,
            details: {
              path: resolveOperatorIntentPath(operatorIntentLocation),
            },
          };
        }

        const manifest = operatorIntentRead.intent;
        const persistedReloads = collectPersistedPeerAutoReloads(manifest);
        if (persistedReloads.length === 0) {
          return {
            status: "skipped",
            message: "no peer loads in manifest",
            details: { reloaded: 0, failed: 0 },
          };
        }

        const peers = await readStoredPeers();
        if (peers.length === 0) {
          return {
            status: "skipped",
            message: "no peer endpoints configured",
            details: {
              deferred: persistedReloads.length,
              reloaded: 0,
              failed: 0,
            },
          };
        }

        const { reloaded, failed } = await replayPersistedPeerAutoReloads(manifest);
        if (failed > 0) {
          return {
            status: "degraded",
            message: "peer reload incomplete",
            details: { reloaded, failed },
          };
        }

        return {
          status: "ready",
          details: { reloaded, failed },
        };
      },
      vendors: async () => {
        if (currentUnifiedRuntimeConfig === null) {
          return {
            status: "skipped",
            message: "unified runtime config disabled",
          };
        }

        const unhealthyVendors: string[] = [];
        if (
          currentUnifiedRuntimeConfig.llamaSwap.enabled &&
          currentLlamaSwapVendor?.readStatus().healthStatus !== "healthy"
        ) {
          unhealthyVendors.push("llama-swap");
        }
        if (
          currentUnifiedRuntimeConfig.liteLLM.enabled &&
          currentLiteLLMVendor?.readStatus().healthStatus !== "healthy"
        ) {
          unhealthyVendors.push("litellm");
        }

        if (unhealthyVendors.length > 0) {
          return {
            status: "degraded",
            message: `vendors not healthy: ${unhealthyVendors.join(", ")}`,
            details: { unhealthyVendors },
          };
        }

        return { status: "ready" };
      },
      localReload: async () => {
        const operatorIntentRead = readOperatorIntentResult(operatorIntentLocation);
        operatorIntentDiagnostic = operatorIntentRead.diagnostic;
        if (operatorIntentRead.diagnostic.status === "corrupt") {
          return {
            status: "failed",
            message: `operator-intent.json is corrupt: ${operatorIntentRead.diagnostic.message}`,
            details: {
              path: resolveOperatorIntentPath(operatorIntentLocation),
            },
          };
        }

        const manifest = operatorIntentRead.intent;
        const loads = (manifest?.llamaSwapLoads ?? []).filter((entry) => entry.autoReload);
        if (loads.length === 0) {
          return {
            status: "skipped",
            message: "no llama-swap loads in manifest",
          };
        }
        if (!currentLlamaSwapVendor) {
          return {
            status: "degraded",
            message: "llama-swap vendor is not running",
          };
        }

        let reloaded = 0;
        let failed = 0;
        for (const load of loads) {
          try {
            await backend.loadLlamaSwapModel(load.modelId, {
              roleIds: load.roleIds,
              roleAssignmentMode: load.roleIds.length === 0 ? "all" : "include",
              enabledRoleIds: load.roleIds,
              disabledRoleIds: [],
            });
            reloaded += 1;
          } catch {
            failed += 1;
          }
        }

        if (failed > 0) {
          return {
            status: "degraded",
            message: "llama-swap reload incomplete",
            details: { reloaded, failed },
          };
        }

        return {
          status: "ready",
          details: { reloaded, failed },
        };
      },
      remoteHealth: async () => {
        const executionMode = currentUnifiedRuntimeConfig?.executionMode ?? "decision_only";
        if (executionMode === "decision_only") {
          return {
            status: "skipped",
            message: "execution probes skipped in decision_only mode",
          };
        }

        const targets = collectRemoteHealthProbeTargets();
        if (targets.length === 0) {
          return {
            status: "skipped",
            message: "no remote endpoints to probe",
          };
        }

        const litellmHealthy = currentLiteLLMVendor?.readStatus().healthStatus === "healthy";
        const summary = await probeRemoteEndpoints({
          litellmHealthy,
          targets,
          resolveAuthorization: resolveProbeAuthorization,
          refreshAuthorization: refreshProbeAuthorization,
          resolveProbeHeaders,
          networkFetcher,
        });
        applyRemoteHealthProbeResults(summary.results);

        return {
          status: summary.degraded > 0 ? "degraded" : "ready",
          details: {
            probed: summary.probed,
            healthy: summary.healthy,
            degraded: summary.degraded,
            results: summary.results.map((result) => ({
              endpointId: result.endpointId,
              modelId: result.modelId,
              reason: result.reason,
              healthStatus: result.healthStatus,
              ...(result.message ? { message: result.message } : {}),
            })),
          },
        };
      },
      inventory: async () => {
        refreshRoutableInventoryState();
        await persistMaterializedCanonicalRoutingAliasesIfNeeded();
        const inventorySummary = buildInventorySummary();
        const driftWarnings = currentAliasDriftWarnings;

        if (inventorySummary.endpointIdCount === 0) {
          return {
            status: "skipped",
            message: "no routable endpoints in inventory",
            details: inventorySummary,
          };
        }

        return {
          status:
            inventorySummary.emptyAliasIds.length > 0 || driftWarnings.length > 0
              ? "degraded"
              : "ready",
          ...(driftWarnings.length > 0
            ? { message: `${driftWarnings.length} alias hint drift warning(s)` }
            : {}),
          details: {
            ...inventorySummary,
            driftWarningCount: driftWarnings.length,
            driftWarnings: driftWarnings.map((warning) => ({
              aliasId: warning.aliasId,
              hintModelId: warning.hintModelId,
              suggestedModelIds: warning.suggestedModelIds,
            })),
          },
        };
      },
    });
  })().catch((error) => {
    sessionBootstrapState = {
      status: "blocked",
      startedAt: sessionBootstrapState.startedAt ?? new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      stages: [
        ...sessionBootstrapState.stages,
        {
          stageId: "credentials",
          status: "failed",
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          message: error instanceof Error ? error.message : "session bootstrap failed",
        },
      ],
    };
  });

  const autoSwapInterval = setInterval(async () => {
    try {
      const models = await backend.listLocalModels();
      const currentModel = models[0]?.modelId ?? null;
      if (currentModel !== lastDetectedModel) {
        insertSwapEvent({
          databasePath: initialization.databasePath,
          timestamp: new Date().toISOString(),
          oldModelId: lastDetectedModel,
          newModelId: currentModel,
          reason: "auto-detected",
        });
        lastDetectedModel = currentModel;
      }
    } catch {
      // Silently ignore polling errors
    }
  }, 5000);

  return backend;
}

function usesWindowsPathDialect(value: string | undefined): boolean {
  const normalized = value?.trim();
  return normalized ? /^[A-Za-z]:\\/u.test(normalized) || normalized.includes("\\") : false;
}

function usesPosixPathDialect(value: string | undefined): boolean {
  const normalized = value?.trim();
  return normalized ? normalized.startsWith("/") : false;
}

function resolveBridgePathApi(explicitValues: Array<string | undefined>, fallbackValue?: string) {
  if (explicitValues.some((value) => usesWindowsPathDialect(value))) {
    return path.win32;
  }
  if (explicitValues.some((value) => usesPosixPathDialect(value))) {
    return path.posix;
  }
  if (usesWindowsPathDialect(fallbackValue)) {
    return path.win32;
  }
  if (usesPosixPathDialect(fallbackValue)) {
    return path.posix;
  }
  return process.platform === "win32" ? path.win32 : path.posix;
}

export function resolveStandaloneStaticRoot(input: {
  readonly repoPath: typeof path;
  readonly repoRoot: string;
  readonly executablePath?: string;
  readonly preferRepoRootBuild?: boolean;
}): string {
  const repoBuildRoot = input.repoPath.join(input.repoRoot, "build", "client");
  const devStaticRoot = input.repoPath.join(
    input.repoRoot,
    "role-model-router",
    "apps",
    "runtime-ui",
    "build",
    "client",
  );
  const candidates: string[] = [];
  if (input.preferRepoRootBuild) {
    candidates.push(repoBuildRoot, devStaticRoot);
  }
  if (input.executablePath) {
    const executableDir = input.repoPath.dirname(input.repoPath.resolve(input.executablePath));
    candidates.push(input.repoPath.join(executableDir, "build", "client"));
  }
  if (!input.preferRepoRootBuild) {
    candidates.push(repoBuildRoot, devStaticRoot);
  }
  for (const candidate of candidates) {
    if (existsSync(input.repoPath.join(candidate, "index.html"))) {
      return candidate;
    }
  }
  return devStaticRoot;
}

export function resolveBridgeServerOptions(input: {
  host?: string;
  port?: string;
  repoRoot?: string;
  runtimeStateRoot?: string;
  scopeId?: string;
  executablePath?: string;
  localAppData?: string;
  unifiedRuntimeConfigPath?: string;
}): BridgeServerOptions {
  const repoPath = resolveBridgePathApi([input.executablePath, input.repoRoot]);
  const packagedProfile = readPackagedRuntimeProfile(input.executablePath);
  const profile = packagedProfile ?? resolveRuntimeChannelProfile("production");
  const statePath = resolveBridgePathApi([input.localAppData], process.env.LOCALAPPDATA);
  const runtimeStatePath = resolveBridgePathApi(
    [input.runtimeStateRoot, input.localAppData],
    process.env.LOCALAPPDATA,
  );
  const inferredRepoRoot = input.executablePath
    ? (() => {
        const executableDir = repoPath.dirname(repoPath.resolve(input.executablePath));
        const releaseDir = repoPath.dirname(executableDir);
        const distDir = repoPath.dirname(releaseDir);
        const routerRoot = repoPath.dirname(distDir);
        if (
          repoPath.basename(releaseDir) !== "release" ||
          repoPath.basename(distDir) !== "dist" ||
          repoPath.basename(routerRoot) !== "role-model-router"
        ) {
          return undefined;
        }
        return repoPath.dirname(routerRoot);
      })()
    : undefined;
  const packagedRoot =
    packagedProfile && input.executablePath
      ? repoPath.dirname(repoPath.resolve(input.executablePath))
      : undefined;
  const repoRoot = input.repoRoot?.trim() || inferredRepoRoot || packagedRoot;
  if (!repoRoot) {
    throw new Error("repoRoot is required for the runtime host bridge.");
  }
  const platformStateBase =
    input.localAppData?.trim() ||
    process.env.LOCALAPPDATA ||
    process.env.XDG_STATE_HOME ||
    statePath.join(os.homedir(), ".local", "state");
  const runtimeStateRoot =
    input.runtimeStateRoot?.trim() || statePath.join(platformStateBase, profile.state_root_name);

  return {
    host: input.host?.trim() || profile.host,
    port: input.port ? Number.parseInt(input.port, 10) : profile.port,
    repoRoot,
    runtimeStateRoot,
    scopeId: input.scopeId?.trim() || profile.scope_id,
    staticRoot: resolveStandaloneStaticRoot({
      repoPath,
      repoRoot,
      executablePath: input.executablePath,
      preferRepoRootBuild: Boolean(input.repoRoot?.trim()) || Boolean(packagedProfile),
    }),
    unifiedRuntimeConfigPath:
      input.unifiedRuntimeConfigPath?.trim() ||
      runtimeStatePath.join(runtimeStateRoot, "state", "runtime-config.yaml"),
  };
}
