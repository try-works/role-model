import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";

import type {
  NormalizedCatalog,
  NormalizedCatalogModel,
  PricingHints,
} from "@role-model-router/catalog";
import { assembleContextEnvelope } from "@role-model-router/context-envelope";
import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import { type RegistrySources, buildEndpointRegistry } from "@role-model-router/endpoint-registry";
import { ProcessSupervisor } from "@role-model-router/process-supervisor";
import type { ObservedPerformanceSample } from "@role-model-router/profile-aggregator";
import {
  type RoutingModelSelection,
  routeRuntimeRequest,
} from "@role-model-router/protocol-routing";
import {
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
  type RuntimeObservationBundle,
  type RuntimeRoutingDiagnostics,
  type RuntimeRoutingMode,
  createRuntimeObservationBundle,
} from "@role-model-router/runtime-observability";
import {
  initializeSqliteMemory,
  insertSwapEvent,
  listProviderAccounts,
  listRecentRuntimeObservations,
  listRuntimeEndpoints,
  listRuntimeTelemetryComparisonRows,
  listRuntimeTelemetryRecords,
  listSwapEvents,
  persistContinuitySnapshot,
  persistProviderAccounts,
  persistRetrievalReceipt,
  persistRuntimeObservationBundle,
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
  upsertProviderAccount as upsertSqliteProviderAccount,
  upsertRuntimeEndpoint as upsertSqliteRuntimeEndpoint,
} from "@role-model-router/sqlite-memory";
import { listProviderDeviceAuthSessions } from "@role-model-router/sqlite-memory";
import {
  type ToolConnector,
  type ToolRegistry,
  type ToolRegistryExecution,
  createToolRegistry,
  executeToolCalls,
} from "@role-model-router/tool-registry";

import {
  type ProviderRequestCapture,
  type ResolvedExecutionTarget,
  type RuntimeExecutionRequest,
  type RuntimeResponseCaptureMap,
  executeLiveRoutedRequest,
} from "@role-model-router/adapter-execution";
import type { VendorRuntime, VendorRuntimeStatus } from "@role-model-router/vendor-abstraction";
import { createVendorNotConfiguredError } from "@role-model-router/vendor-abstraction";
import { startLiteLLMVendor } from "@role-model-router/vendor-litellm";
import { startLlamaSwapVendor } from "@role-model-router/vendor-llama-swap";

import {
  type LiteLLMProviderInfo,
  deriveLiteLLMProviders,
  extractLiteLLMModelIds,
  loadLiteLLMModelPrices,
} from "@role-model-router/catalog";
import { resolveLlamaSwapCommand } from "./runtime-assets.js";
import {
  type UnifiedRuntimeConfig,
  type UnifiedRuntimeDifficultyBucket,
  type UnifiedRuntimeDifficultyClassifierConfig,
  type UnifiedRuntimeExecutionMode,
  type UnifiedRuntimeModelAliasConfig,
  normalizeUnifiedRuntimeConfigInput,
  parseUnifiedRuntimeConfigText,
  renderUnifiedRuntimeConfigText,
  resolveUnifiedRuntimeObservedDataConfig,
} from "./unified-runtime-config.js";

interface OpenAIChatCompletionsTool {
  readonly type: string;
  readonly function?: {
    readonly name: string;
    readonly description?: string;
    readonly parameters: Record<string, unknown>;
  };
}

const LOCAL_OPENAI_PROVIDER_ID = "local-openai-compatible";
const LOCAL_OPENAI_PLACEHOLDER_TOKEN = "role-model-local";

interface LocalPeerConfig {
  readonly id: string;
  readonly url: string;
  readonly authToken?: string;
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

export interface BridgeRuntimeModelRecord extends BridgeModelRecord {
  readonly providerId: string;
  readonly displayName: string;
  readonly capabilities: readonly string[];
  readonly modalities: readonly string[];
  readonly contextWindow: number;
  readonly maxOutputTokens: number;
  readonly pricing: PricingHints | null;
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
  readonly routingRequest: Parameters<typeof routeRuntimeRequest>[0]["request"];
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
  readonly routingModel?: RoutingModelSelection;
  readonly routingDiagnostics?: Pick<
    RuntimeRoutingDiagnostics,
    | "aliasResolution"
    | "difficultyRouting"
    | "controllerRouting"
    | "hybridArbitration"
    | "routingMode"
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
  readonly resolvedGuidance?: NonNullable<
    RuntimeRoutingDiagnostics["controllerRouting"]
  >["acceptedDirectives"];
  readonly fallbackApplied?: boolean;
  readonly fallbackReason?: string;
}

type DifficultyRoutingSignals = NonNullable<
  RuntimeRoutingDiagnostics["difficultyRouting"]
>["rubricSignals"];
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

function summarizeDifficultySignals(input: {
  readonly messages: readonly OpenAIChatCompletionsMessage[];
  readonly contextTokens: number;
  readonly toolCount: number;
}): DifficultyRoutingSignals {
  const combined = input.messages.map((message) => message.content).join("\n");
  const instructionConstraintCount = countMatches(
    combined.toLowerCase(),
    /\b(must|should|need to|required|preserve|verify|strict|do not|don't|never|without|constraint|compatible)\b/g,
  );
  const decompositionKeywordCount = countMatches(
    combined.toLowerCase(),
    /\b(analyze|compare|iterate|plan|step|decompose|refactor|workflow|multi-step|across)\b/g,
  );
  return {
    contextTokens: input.contextTokens,
    toolCount: input.toolCount,
    historyTurnCount: input.messages.length,
    instructionConstraintCount,
    decompositionKeywordCount,
    codeOrSchemaBurden: /\b(code|diff|patch|refactor|schema|contract|validation|test)\b/i.test(
      combined,
    ),
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
}): readonly OpenAIChatCompletionsMessage[] {
  return [
    {
      role: "system",
      content:
        "ROLE_MODEL_ROUTING_CONTROLLER\nReturn only compact JSON. Optional fields: requestedRoleId, taskType, requiredCapabilities, preferredCapabilities, strategy, preferLocal, preferredEndpointIds.",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          requestedModel: input.requestedModel,
          toolCount: input.toolCount,
          candidateEndpointIds: input.candidateEndpointIds,
          messages: input.messages,
        },
        null,
        2,
      ),
    },
  ];
}

function readControllerStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return normalized.length > 0 ? [...new Set(normalized)] : undefined;
}

function parseControllerRoutingOutput(
  text: string,
): NonNullable<RuntimeRoutingDiagnostics["controllerRouting"]>["acceptedDirectives"] | null {
  const trimmed = text.trim();
  const jsonSource = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? trimmed;
  try {
    const parsed = JSON.parse(jsonSource) as Record<string, unknown>;
    const requestedRoleId =
      typeof parsed.requestedRoleId === "string" ? parsed.requestedRoleId.trim() : "";
    const taskType = typeof parsed.taskType === "string" ? parsed.taskType.trim() : "";
    const strategy =
      parsed.strategy === "balanced" || parsed.strategy === "cost" || parsed.strategy === "quality"
        ? parsed.strategy
        : undefined;
    const acceptedDirectives: NonNullable<
      RuntimeRoutingDiagnostics["controllerRouting"]
    >["acceptedDirectives"] = {
      ...(requestedRoleId.length ? { requestedRoleId } : {}),
      ...(taskType.length ? { taskType } : {}),
      ...(readControllerStringArray(parsed.requiredCapabilities)
        ? { requiredCapabilities: readControllerStringArray(parsed.requiredCapabilities) }
        : {}),
      ...(readControllerStringArray(parsed.preferredCapabilities)
        ? { preferredCapabilities: readControllerStringArray(parsed.preferredCapabilities) }
        : {}),
      ...(strategy ? { strategy } : {}),
      ...(typeof parsed.preferLocal === "boolean" ? { preferLocal: parsed.preferLocal } : {}),
      ...(readControllerStringArray(parsed.preferredEndpointIds)
        ? { preferredEndpointIds: readControllerStringArray(parsed.preferredEndpointIds) }
        : {}),
    };
    return Object.keys(acceptedDirectives).length > 0 ? acceptedDirectives : null;
  } catch {
    return null;
  }
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
  readonly routingDiagnostics?: Pick<RuntimeRoutingDiagnostics, "aliasResolution" | "routingMode">;
  readonly difficultyContext?: BridgeDifficultyRoutingContext;
}): {
  readonly allowEndpoints: readonly string[];
  readonly strategy: "balanced" | "cost" | "quality";
  readonly routingDiagnostics?: Pick<
    RuntimeRoutingDiagnostics,
    "aliasResolution" | "routingMode" | "difficultyRouting"
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
  return filtered;
}

function maybeApplyControllerRouting(input: {
  readonly effectiveRoutingMode: RuntimeRoutingMode;
  readonly requestedModel: string;
  readonly modelAliases: readonly UnifiedRuntimeModelAliasConfig[];
  readonly routingRequest: Parameters<typeof routeRuntimeRequest>[0]["request"];
  readonly routingDiagnostics?: Pick<
    RuntimeRoutingDiagnostics,
    "aliasResolution" | "routingMode" | "difficultyRouting"
  >;
  readonly controllerContext?: BridgeControllerRoutingContext;
}): {
  readonly routingRequest: Parameters<typeof routeRuntimeRequest>[0]["request"];
  readonly routingModel?: RoutingModelSelection;
  readonly routingDiagnostics?: Pick<
    RuntimeRoutingDiagnostics,
    | "aliasResolution"
    | "routingMode"
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
  const preferredEndpointIds = collectPreferredEndpointIds(
    input.routingRequest.allowEndpoints ?? [],
    guidance.preferredEndpointIds,
  );
  const requiredCapabilities =
    guidance.taskType && guidance.taskType !== input.routingRequest.taskType
      ? (guidance.requiredCapabilities ?? input.routingRequest.requiredCapabilities)
      : mergeCapabilityList(
          input.routingRequest.requiredCapabilities,
          guidance.requiredCapabilities,
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
      ...(guidance.requestedRoleId ? { requestedRoleId: guidance.requestedRoleId } : {}),
      ...(guidance.taskType ? { taskType: guidance.taskType } : {}),
      requiredCapabilities,
      preferredCapabilities:
        guidance.preferredCapabilities ?? input.routingRequest.preferredCapabilities,
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
          ...(guidance.requestedRoleId ? { requestedRoleId: guidance.requestedRoleId } : {}),
          ...(guidance.taskType ? { taskType: guidance.taskType } : {}),
          ...(guidance.requiredCapabilities?.length
            ? { requiredCapabilities: guidance.requiredCapabilities }
            : {}),
          ...(guidance.preferredCapabilities?.length
            ? { preferredCapabilities: guidance.preferredCapabilities }
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

export type BridgeTelemetryRequestRecord = ReturnType<
  typeof listRuntimeTelemetryRecords
>[number] & {
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
  readonly registry: EndpointRegistryResult;
  readonly getRegistry?: () => EndpointRegistryResult;
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
  readonly listActivityMetrics?: () => Promise<unknown>;
  readonly readActivityCapture?: (captureId: number) => Promise<unknown>;
  readonly readLogs?: () => Promise<string>;
  readonly readRuntimeSummary?: () => Promise<unknown>;
  readonly readHealthStatus?: () => Promise<unknown>;
  readonly listProviders?: () => Promise<readonly unknown[]>;
  readonly listModels?: () => Promise<readonly unknown[]>;
  readonly listRoles?: () => Promise<readonly unknown[]>;
  readonly listAccounts?: () => Promise<readonly unknown[]>;
  readonly listProviderDeviceAuthorizations?: () => Promise<readonly unknown[]>;
  readonly upsertProviderAccount?: (body: Record<string, unknown>) => Promise<unknown>;
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
  readonly listRecentRequestObservations?: () => Promise<readonly unknown[]>;
  readonly readTelemetrySummary?: (query?: BridgeTelemetryQuery) => Promise<unknown>;
  readonly listTelemetryComparisonRows?: (
    query?: BridgeTelemetryQuery,
  ) => Promise<readonly unknown[]>;
  readonly listTelemetryRequests?: (query?: BridgeTelemetryQuery) => Promise<readonly unknown[]>;
  readonly subscribeTelemetry?: (
    listener: (event: RuntimeTelemetryStreamEvent) => void,
  ) => () => void;
  readonly readRequestObservation?: (requestId: string) => Promise<unknown>;
  readonly readEndpointProfile?: (endpointId: string) => Promise<unknown>;
  readonly staticRoot?: string;
  readonly listLocalModels?: () => Promise<
    readonly { modelId: string; loadedAt: string; engine: string }[]
  >;
  readonly loadLocalModel?: (modelId: string) => Promise<{ success: boolean }>;
  readonly unloadLocalModel?: (modelId?: string) => Promise<{ success: boolean }>;
  readonly readLocalPolicy?: () => Promise<Record<string, unknown>>;
  readonly updateLocalPolicy?: (body: Record<string, unknown>) => Promise<Record<string, unknown>>;
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
}

export interface RuntimeBridgeBackend {
  readonly registry: EndpointRegistryResult;
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
  readRuntimeSummary(): Promise<{
    lifecycleSummary: EndpointRegistryResult["lifecycleSummary"];
    providerCount: number;
    accountCount: number;
    endpointCount: number;
    readinessSummary: {
      pendingDeviceAuthorizationCount: number;
      credentialsMissingAccountCount: number;
      connectedWithoutEndpointCount: number;
      readyAccountCount: number;
    };
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
  listModels(): Promise<readonly BridgeRuntimeModelRecord[]>;
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
  listTelemetryComparisonRows(
    query?: BridgeTelemetryQuery,
  ): Promise<readonly BridgeTelemetryComparisonRow[]>;
  listTelemetryRequests(
    query?: BridgeTelemetryQuery,
  ): Promise<readonly BridgeTelemetryRequestRecord[]>;
  subscribeTelemetry(listener: (event: RuntimeTelemetryStreamEvent) => void): () => void;
  readRequestObservation(
    requestId: string,
  ): Promise<(RuntimeObservationBundle & BridgeTelemetryEndpointMeta) | null>;
  readEndpointProfile(endpointId: string): Promise<{
    endpointId: string;
    latestProfile: ReturnType<typeof readLatestObservedProfile>;
    recentSamples: readonly ObservedPerformanceSample[];
  }>;
  listLocalModels(): Promise<
    readonly {
      modelId: string;
      loadedAt: string;
      engine: string;
      localModelSource?: "llama-swap" | "peer-backed";
      contextWindow?: number | null;
      proxyBaseUrl?: string | null;
      checkEndpoint?: string | null;
      useModelName?: string | null;
    }[]
  >;
  loadLocalModel(modelId: string): Promise<{ success: boolean }>;
  unloadLocalModel(modelId?: string): Promise<{ success: boolean }>;
  readLocalPolicy(): Promise<Record<string, unknown>>;
  updateLocalPolicy(body: Record<string, unknown>): Promise<Record<string, unknown>>;
  listSwapHistory(): Promise<
    readonly {
      timestamp: string;
      oldModel: string | null;
      newModel: string | null;
      reason: string;
    }[]
  >;
  getLocalLogs(): Promise<{ logs: string }>;
  readModelOverrides(): Promise<Record<string, BridgeModelOverrideRecord>>;
  updateModelOverrides(
    body: Record<string, BridgeModelOverrideRecord>,
  ): Promise<Record<string, BridgeModelOverrideRecord>>;
  readPeers(): Promise<readonly { id: string; url: string; authToken?: string }[]>;
  updatePeers(
    body: readonly { id: string; url: string; authToken?: string }[],
  ): Promise<readonly { id: string; url: string; authToken?: string }[]>;
  checkPeerHealth(url: string): Promise<{ healthy: boolean }>;
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
  readonly staticRoot: string;
  readonly unifiedRuntimeConfigPath?: string;
}

export interface BridgeExecutionRequestOptions {
  readonly routingModeOverride?: RuntimeRoutingMode;
  readonly endpointId?: string;
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

function slugify(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function resolveEnvCredentialRef(
  value: string | null,
  fallbackName: string,
): ProviderAccountRecord["credentialRef"] {
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

const VALID_RUNTIME_ROUTING_MODES = ["baseline", "difficulty", "controller", "hybrid"] as const;

function parseRuntimeRoutingModeOverride(value: string): RuntimeRoutingMode {
  if ((VALID_RUNTIME_ROUTING_MODES as readonly string[]).includes(value)) {
    return value as RuntimeRoutingMode;
  }
  throw new BridgeHttpError(400, {
    error: `Invalid x-role-model-routing-mode header value "${value}". Expected one of: baseline, difficulty, controller, hybrid.`,
  });
}

function readBridgeExecutionRequestOptions(
  request: IncomingMessage,
): BridgeExecutionRequestOptions | undefined {
  const routingModeOverrideHeader = request.headers["x-role-model-routing-mode"]?.toString().trim();
  const endpointIdHeader = request.headers["x-role-model-endpoint-id"]?.toString().trim();
  if (!routingModeOverrideHeader && !endpointIdHeader) {
    return undefined;
  }
  return {
    ...(routingModeOverrideHeader
      ? { routingModeOverride: parseRuntimeRoutingModeOverride(routingModeOverrideHeader) }
      : {}),
    ...(endpointIdHeader ? { endpointId: endpointIdHeader } : {}),
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
    ? {
        ...endpointWideProfilesByEndpointId,
        ...difficultyBucketProfilesByEndpointId,
      }
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
    capabilities: ["text.chat", "tools.function_calling"],
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
): ProviderAccountRecord[] {
  if (!liteLLMBaseUrl) {
    return [];
  }
  return config.liteLLM.providers.map((providerConfig) => {
    const provider =
      catalog.providers.find((entry) => entry.providerId === providerConfig.providerId) ??
      liteLLMProviderList.find((entry) => entry.providerId === providerConfig.providerId);
    if (!provider) {
      throw new Error(
        `Unified runtime provider ${providerConfig.providerId} is not present in the catalog or LiteLLM provider list.`,
      );
    }

    // Check for existing OAuth token file (R5)
    const oauthTokenPath = path.join(
      runtimeStateRoot,
      scopeId,
      "credentials",
      "oauth",
      provider.providerId,
      `${provider.providerId}.litellm.json`,
    );
    let hasOauthToken = false;
    try {
      const tokenContent = readFileSync(oauthTokenPath, "utf8");
      const tokenPayload = JSON.parse(tokenContent) as Record<string, unknown>;
      hasOauthToken =
        typeof tokenPayload.access_token === "string" && tokenPayload.access_token.length > 0;
    } catch {
      // Token file does not exist or is invalid
    }

    const supportsOAuth = provider.supportedAuthModes?.includes("oauth2-device-code") ?? false;
    const authMode =
      hasOauthToken && supportsOAuth
        ? "oauth2-device-code"
        : (provider.supportedAuthModes?.find((candidate) => candidate === "api-key-static") ??
          provider.supportedAuthModes?.[0] ??
          "api-key-static");

    const credentialRef =
      hasOauthToken && supportsOAuth
        ? {
            backend: "local-file" as const,
            ref: `oauth/${provider.providerId}/${provider.providerId}.litellm`,
          }
        : resolveEnvCredentialRef(
            providerConfig.apiKeyRef,
            `${provider.providerId.toUpperCase()}_API_KEY`,
          );

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
): readonly NonNullable<Parameters<typeof routeRuntimeRequest>[0]["roleBindings"]>[number][] {
  const roleDefinitionsById = new Map(roleDefinitions.map((role) => [role.role_id, role]));
  const capabilitiesByEndpointId = new Map(
    registry.endpoints.map((endpoint) => [
      endpoint.identity.endpoint_id,
      [...endpoint.declared.capabilities],
    ]),
  );
  const dynamicBindings = runtimeEndpoints.flatMap((endpoint) => {
    const account = accounts.find(
      (entry) => entry.providerAccountId === endpoint.providerAccountId,
    );
    if (!account) {
      return [];
    }
    const modelBinding = account.modelRoleBindings?.find(
      (entry) => entry.modelId === endpoint.modelId,
    );
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
): readonly string[] {
  const runtimeEndpoint = runtimeEndpoints.find((entry) => entry.endpointId === endpointId);
  if (!runtimeEndpoint) {
    return [];
  }
  const account = accounts.find(
    (entry) => entry.providerAccountId === runtimeEndpoint.providerAccountId,
  );
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

function toResponsesInputMessages(
  input: OpenAIResponsesInput,
): readonly OpenAIChatCompletionsMessage[] {
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
  modelAliases: readonly UnifiedRuntimeModelAliasConfig[] = [],
): BridgeModelListResponse {
  const byModelId = new Map<string, string[]>();

  for (const endpoint of registry.endpoints) {
    const current = byModelId.get(endpoint.identity.model_id) ?? [];
    current.push(endpoint.identity.endpoint_id);
    byModelId.set(endpoint.identity.model_id, current);
  }

  for (const alias of modelAliases) {
    const endpointIds = registry.endpoints
      .filter((endpoint) => alias.modelIds.includes(endpoint.identity.model_id))
      .map((endpoint) => endpoint.identity.endpoint_id)
      .sort(compareText);
    if (endpointIds.length === 0) {
      continue;
    }
    byModelId.set(alias.aliasId, endpointIds);
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
      const model = catalog.models.find((entry) => entry.modelId === modelId);
      return {
        id: modelId,
        object: "model" as const,
        owned_by: "role-model" as const,
        providerId:
          model?.providerId ?? (modelId.includes("/") ? modelId.split("/")[0] : "unknown"),
        displayName: model?.displayName ?? readDefaultDisplayNameFromModelId(modelId),
        endpoint_ids: [...endpointIds].sort(compareText),
        capabilities: model?.capabilities ?? [],
        modalities: model?.modalities ?? [],
        contextWindow: model?.contextWindow ?? 0,
        maxOutputTokens: model?.maxOutputTokens ?? 0,
        pricing: model?.pricing ?? null,
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

function resolveRequestedModelPool(
  registry: EndpointRegistryResult,
  requestedModel: string,
  modelAliases: readonly UnifiedRuntimeModelAliasConfig[] = [],
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

  const allowEndpoints = collectAllowedEndpointIds(registry, alias.modelIds);
  return {
    allowEndpoints,
    routingDiagnostics: {
      aliasResolution: {
        requestedModel,
        aliasId: alias.aliasId,
        resolvedModelIds: [...alias.modelIds],
        allowEndpoints,
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
  if (!input.allowEndpoints.includes(endpointId)) {
    throw new Error(
      `Requested endpoint ${endpointId} is not available for model ${input.requestedModel}.`,
    );
  }
  return [endpointId];
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
  if (!readRuntimeConfig) {
    return [];
  }
  const runtimeConfig = await readRuntimeConfig();
  if (
    !runtimeConfig ||
    typeof runtimeConfig !== "object" ||
    Array.isArray(runtimeConfig) ||
    !("config" in runtimeConfig)
  ) {
    return [];
  }
  const configValue = runtimeConfig.config;
  if (!configValue || typeof configValue !== "object" || Array.isArray(configValue)) {
    return [];
  }
  return normalizeUnifiedRuntimeConfigInput(configValue).modelAliases ?? [];
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
  modelAliases: readonly UnifiedRuntimeModelAliasConfig[] = [],
): BridgeDownstreamOpenAIProviderConfig {
  const models = createModelListResponse(registry, modelAliases).data;
  const recommendedModel = modelAliases[0]?.aliasId ?? models[0]?.id ?? null;

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
      note: "Inbound API-key validation is not enforced yet. If a downstream client requires a token field, use this placeholder bearer token.",
    },
    models,
    setup: {
      recommendedModel,
      notes: [
        "Configure downstream tooling as an OpenAI-compatible provider.",
        "Use GET /v1/models to discover the current model ids.",
        "Use POST /v1/chat/completions or POST /v1/responses for routed inference.",
      ],
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
  if (!alias) {
    return undefined;
  }
  return {
    source: "alias-default",
    aliasMode: toAliasRoutingMode(alias.mode),
    effectiveMode: input.effectiveRoutingMode,
  };
}

function resolveEffectiveRoutingMode(input: {
  readonly requestedModel: string;
  readonly modelAliases: readonly UnifiedRuntimeModelAliasConfig[];
  readonly requestOptions?: BridgeExecutionRequestOptions;
}): RuntimeRoutingMode {
  if (input.requestOptions?.routingModeOverride) {
    return input.requestOptions.routingModeOverride;
  }
  const alias = resolveRequestedModelAlias(input.requestedModel, input.modelAliases);
  return toAliasRoutingMode(alias?.mode);
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

export function mapChatCompletionsRequest(
  registry: EndpointRegistryResult,
  body: OpenAIChatCompletionsBody,
  requestId: string,
  modelAliases: readonly UnifiedRuntimeModelAliasConfig[] = [],
  difficultyContext?: BridgeDifficultyRoutingContext,
  controllerContext?: BridgeControllerRoutingContext,
  requestOptions?: BridgeExecutionRequestOptions,
): BridgeExecutionPlan {
  const contextTokens = estimateContextTokens(body.messages, body.tools?.length ?? 0);
  const { allowEndpoints: modelAllowEndpoints, routingDiagnostics } = resolveRequestedModelPool(
    registry,
    body.model,
    modelAliases,
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
  });
  const aliasDefaultRoutingMode = summarizeAliasDefaultRoutingModeDiagnostics({
    requestedModel: body.model,
    modelAliases,
    effectiveRoutingMode,
    requestOptions,
  });
  const baseRoutingDiagnostics = aliasDefaultRoutingMode
    ? {
        ...routingDiagnostics,
        routingMode: aliasDefaultRoutingMode,
      }
    : routingDiagnostics;
  const difficultyRouting = maybeApplyDifficultyRouting({
    effectiveRoutingMode,
    requestedModel: body.model,
    modelAliases,
    messages: body.messages,
    contextTokens,
    toolCount: body.tools?.length ?? 0,
    allowEndpoints,
    routingDiagnostics: baseRoutingDiagnostics,
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
      taskType: "text.chat",
      requiredCapabilities: ["text.chat"],
      preferredCapabilities: [],
      requiredModalities: ["text"],
      contextTokens,
      needsTools: Boolean(tools?.length),
      strategy: difficultyRouting.strategy,
      preferLocal: false,
      allowEndpoints: difficultyRouting.allowEndpoints,
    },
    routingDiagnostics: difficultyRouting.routingDiagnostics,
    controllerContext,
  });

  return {
    routingRequest: controllerRouting.routingRequest,
    executionRequest: {
      messages: body.messages,
      ...(tools?.length ? { tools } : {}),
      ...(typeof body.stream === "boolean" ? { stream: body.stream } : {}),
      ...(typeof body.max_tokens === "number" ? { maxOutputTokens: body.max_tokens } : {}),
      ...(typeof body.temperature === "number" ? { temperature: body.temperature } : {}),
    },
    ...(controllerRouting.routingModel ? { routingModel: controllerRouting.routingModel } : {}),
    ...(controllerRouting.routingDiagnostics
      ? { routingDiagnostics: controllerRouting.routingDiagnostics }
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
): BridgeExecutionPlan {
  const messages = toResponsesInputMessages(body.input);
  const contextTokens = estimateContextTokens(messages, body.tools?.length ?? 0);
  const { allowEndpoints: modelAllowEndpoints, routingDiagnostics } = resolveRequestedModelPool(
    registry,
    body.model,
    modelAliases,
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
  });
  const aliasDefaultRoutingMode = summarizeAliasDefaultRoutingModeDiagnostics({
    requestedModel: body.model,
    modelAliases,
    effectiveRoutingMode,
    requestOptions,
  });
  const baseRoutingDiagnostics = aliasDefaultRoutingMode
    ? {
        ...routingDiagnostics,
        routingMode: aliasDefaultRoutingMode,
      }
    : routingDiagnostics;
  const difficultyRouting = maybeApplyDifficultyRouting({
    effectiveRoutingMode,
    requestedModel: body.model,
    modelAliases,
    messages,
    contextTokens,
    toolCount: body.tools?.length ?? 0,
    allowEndpoints,
    routingDiagnostics: baseRoutingDiagnostics,
    difficultyContext,
  });

  if (difficultyRouting.allowEndpoints.length === 0) {
    throw new Error(`No registry endpoints are available for requested model ${body.model}.`);
  }

  const tools = body.tools?.map(toResponsesToolDefinition);

  const controllerRouting = maybeApplyControllerRouting({
    effectiveRoutingMode,
    requestedModel: body.model,
    modelAliases,
    routingRequest: {
      requestId,
      taskType: "text.chat",
      requiredCapabilities: ["text.chat"],
      preferredCapabilities: [],
      requiredModalities: ["text"],
      contextTokens,
      needsTools: Boolean(tools?.length),
      strategy: difficultyRouting.strategy,
      preferLocal: false,
      allowEndpoints: difficultyRouting.allowEndpoints,
    },
    routingDiagnostics: difficultyRouting.routingDiagnostics,
    controllerContext,
  });

  return {
    routingRequest: controllerRouting.routingRequest,
    executionRequest: {
      messages,
      ...(tools?.length ? { tools } : {}),
      ...(typeof body.stream === "boolean" ? { stream: body.stream } : {}),
      ...(typeof body.max_output_tokens === "number"
        ? { maxOutputTokens: body.max_output_tokens }
        : {}),
      ...(typeof body.temperature === "number" ? { temperature: body.temperature } : {}),
    },
    ...(controllerRouting.routingModel ? { routingModel: controllerRouting.routingModel } : {}),
    ...(controllerRouting.routingDiagnostics
      ? { routingDiagnostics: controllerRouting.routingDiagnostics }
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
  return value
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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
  return `${path.join(runtimeStateRoot, scopeId, "credentials", ...safeSegments)}.json`;
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

function hydrateOauthProviderAccounts(
  runtimeStateRoot: string,
  scopeId: string,
  accounts: readonly ProviderAccountRecord[],
): ProviderAccountRecord[] {
  return accounts.map((account) => {
    if (
      account.authMode !== "oauth2-device-code" ||
      (account.credentialRef.backend !== "local-file" &&
        account.credentialRef.backend !== "local-encrypted-file")
    ) {
      return account;
    }

    const payload = readStoredOauthTokenFileSync(
      runtimeStateRoot,
      scopeId,
      account.credentialRef.ref,
    );
    const hasStoredToken =
      readStoredAccessToken(payload).length > 0 || readStoredRefreshToken(payload).length > 0;
    if (!hasStoredToken) {
      return account;
    }

    if (
      account.status === "active" &&
      account.healthStatus === "healthy" &&
      account.rotationState === "stable"
    ) {
      return account;
    }

    return {
      ...account,
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    };
  });
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

  const existingPayload = (await readOauthTokenFile(
    runtimeStateRoot,
    scopeId,
    credentialRef.ref,
  )) as StoredOauthTokenPayload | null;
  const refreshToken = readStoredRefreshToken(existingPayload);
  if (refreshToken.length === 0) {
    throw new Error(
      `Stored OAuth credential ${credentialRef.ref} does not contain a refresh token.`,
    );
  }

  const variant = getOauthVariant(providerPresets, liteLLMProviders, target.providerId);
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
    const tokenPayload = (await readOauthTokenFile(
      runtimeStateRoot,
      scopeId,
      credentialRef.ref,
    )) as StoredOauthTokenPayload | null;
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
      } catch {}
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
    } catch {}
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
    "Content-Type, Authorization, X-Request-ID, X-Role-Model-Routing-Mode, X-Role-Model-Endpoint-Id",
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
      const modelAliases = await resolveConfiguredModelAliases(options.readRuntimeConfig);
      writeJson(response, 200, createModelListResponse(registry, modelAliases));
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/chat/completions") {
      try {
        const requestId = request.headers["x-request-id"]?.toString() ?? "req-runtime-host-bridge";
        const requestOptions = readBridgeExecutionRequestOptions(request);
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
      const requestOptions = readBridgeExecutionRequestOptions(request);
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
      const modelAliases = await resolveConfiguredModelAliases(options.readRuntimeConfig);
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
        response.writeHead(200, { "content-type": contentType, "content-length": data.length });
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

export async function startBridgeServer(options: StartBridgeServerOptions): Promise<BridgeServer> {
  const server = createServer((request, response) => {
    void createRequestHandler(options)(request, response).catch((error: unknown) => {
      if (error instanceof BridgeHttpError) {
        writeJson(response, error.statusCode, error.body);
        return;
      }
      writeJson(response, 500, {
        error: error instanceof Error ? error.message : "runtime host bridge request failed",
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
  const fixtureRoot =
    options.fixtureRoot ?? path.join(options.repoRoot, "testdata", "router-runtime", "fixtures");
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
  const fixtureAccounts = synthesizeFixtureProviderAccounts(
    baseCatalog,
    providerAccountsFixture.accounts,
    registrySourcesFixture,
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
  const fixtureProviderPresets = await readJson<ProviderPresetCatalog>(
    path.join(fixtureRoot, "provider-presets.json"),
  );
  const repoProviderPresets = await readJson<ProviderPresetCatalog>(
    path.join(options.repoRoot, "testdata", "router-runtime", "provider-presets.json"),
  );
  const providerPresets: ProviderPresetCatalog = {
    providers: {
      ...repoProviderPresets.providers,
      ...fixtureProviderPresets.providers,
    },
  };
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
  const catalogWithFixtureModels = withBuiltinLocalOpenAIProvider(
    synthesizeFixtureModelsForCatalog(baseCatalog, fixtureAccounts, registrySourcesFixture),
  );
  const fixtureAccountIds = new Set(fixtureAccounts.map((account) => account.providerAccountId));
  let runtimeConfigProviderAccountIds = new Set<string>();
  let currentNormalizedCatalog = applyUnifiedLiteLLMAdapterFamilyOverrides(
    catalogWithFixtureModels,
    currentUnifiedRuntimeConfig,
    liteLLMProviders,
  );
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
  const readCurrentAccounts = (): ProviderAccountRecord[] => {
    const persistedAccounts = listProviderAccounts({ databasePath: initialization.databasePath });
    const ignoredAccountIds = new Set([...fixtureAccountIds, ...runtimeConfigProviderAccountIds]);
    const hydratedAccounts = hydrateOauthProviderAccounts(
      options.runtimeStateRoot,
      options.scopeId,
      hydrateEnvProviderAccounts(persistedAccounts, ignoredAccountIds),
    );
    const changedAccounts = hydratedAccounts.filter((account, index) => {
      const persistedAccount = persistedAccounts[index];
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
  const buildCredentialReadinessSummary = (): {
    pendingDeviceAuthorizationCount: number;
    credentialsMissingAccountCount: number;
    connectedWithoutEndpointCount: number;
    readyAccountCount: number;
  } => {
    const pendingAccountIds = new Set(
      listCurrentProviderDeviceAuthorizations()
        .filter((authorization) => authorization.status === "pending")
        .map((authorization) => authorization.providerAccountId),
    );
    const readyAccountIds = new Set(
      runtimeEndpoints
        .filter((endpoint) => endpoint.lifecycleState === "active")
        .map((endpoint) => endpoint.providerAccountId),
    );
    let credentialsMissingAccountCount = 0;
    let connectedWithoutEndpointCount = 0;

    for (const account of currentAccounts) {
      if (
        readyAccountIds.has(account.providerAccountId) ||
        pendingAccountIds.has(account.providerAccountId)
      ) {
        continue;
      }
      if (account.healthStatus === "credentials-missing") {
        credentialsMissingAccountCount += 1;
        continue;
      }
      if (account.status === "active" && account.healthStatus === "healthy") {
        connectedWithoutEndpointCount += 1;
      }
    }

    return {
      pendingDeviceAuthorizationCount: pendingAccountIds.size,
      credentialsMissingAccountCount,
      connectedWithoutEndpointCount,
      readyAccountCount: readyAccountIds.size,
    };
  };
  let currentAccounts = [...readCurrentAccounts()];
  let runtimeEndpoints = [...listRuntimeEndpoints({ databasePath: initialization.databasePath })];
  let currentRegistry!: EndpointRegistryResult;
  let currentLlamaSwapVendor: VendorRuntime | null = null;
  let currentLiteLLMVendor: VendorRuntime | null = null;
  const getCurrentRegistrySources = (): RegistrySources =>
    mergeRegistrySources(currentRegistrySources, runtimeEndpoints);
  const rebuildCurrentState = (): void => {
    currentAccounts = [...readCurrentAccounts()];
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
    const localPeerAccounts = peers.map(createLocalPeerAccount);
    const validationResult = validateProviderAccounts({
      catalog: currentNormalizedCatalog,
      additionalProviders: liteLLMProviders,
      allowedRoleIds,
      accounts: localPeerAccounts,
    });
    if (validationResult.diagnostics.length > 0) {
      throw new Error(
        validationResult.diagnostics[0]?.message ?? "Local endpoint account validation failed.",
      );
    }

    const existingPeerAccounts = listProviderAccounts({
      databasePath: initialization.databasePath,
    }).filter((account) => account.providerId === LOCAL_OPENAI_PROVIDER_ID);
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
  const activateConfiguredLocalPeerModel = async (modelId: string): Promise<boolean> => {
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

    for (const peer of matchingPeers) {
      activateRuntimeEndpoint({
        providerAccountId: createLocalPeerProviderAccountId(peer.id),
        modelId,
        region: "local",
        endpointKind: "local-openai-compatible",
        servingSource: "local-peer",
      });
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
    const envCredentialError = readEnvCredentialError(account, fixtureAccountIds);
    if (envCredentialError) {
      throw new Error(envCredentialError);
    }
    if (account.status !== "active" || account.healthStatus !== "healthy") {
      throw new Error(
        `Provider account ${providerAccountId} is not ready for endpoint activation.`,
      );
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

    const endpointId =
      readOptionalString(body, "endpointId") ??
      createEndpointId(providerAccountId, region, modelId);
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
    const generatedOAuthVariants: ProviderPresetVariant[] = input.oauth
      ? [
          {
            variantId: `${input.providerId}-oauth`,
            label: `${input.displayName} OAuth`,
            description: `OAuth device-code authentication for ${input.displayName}.`,
            authMode: "oauth2-device-code",
            availability: "ready" as const,
            baseUrl: input.oauth.apiBase ?? input.apiBase,
            modelIds: input.modelIds,
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
              label: `${input.displayName} API Key`,
              description: `API-key authentication for ${input.displayName}.`,
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

    return [
      ...input.presetVariants,
      ...generatedApiKeyVariants,
      ...generatedOAuthVariants,
      ...legacyMoonshotVariants,
    ];
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
      nextConfig?.llamaSwap.enabled && supervisor
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
      runtimeConfigProviderAccountIds = new Set(
        validation.accounts.map((account) => account.providerAccountId),
      );
    } else {
      runtimeConfigProviderAccountIds = new Set();
    }

    currentUnifiedRuntimeConfig = nextConfig;
    currentNormalizedCatalog = nextNormalizedCatalog;
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
  };

  if (currentUnifiedRuntimeConfig === null) {
    const validation = validateProviderAccounts({
      catalog: currentNormalizedCatalog,
      additionalProviders: liteLLMProviders,
      accounts: fixtureAccounts,
      allowedRoleIds,
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
  const getRegistryEndpoint = (
    endpointId: string,
  ): EndpointRegistryResult["endpoints"][number] | undefined =>
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
  const asObjectRecord = (value: unknown): Record<string, unknown> | null =>
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
  const asStringValue = (value: unknown): string | null =>
    typeof value === "string" && value.length > 0 ? value : null;
  const getCurrentControllerAssignment = (): BridgeControllerAssignment | null => {
    const persisted = readPersistedControllerAssignment();
    if (persisted) {
      return {
        ...persisted,
        scope: "global",
        sourceType: persisted.sourceType === "remote" ? "remote" : "local",
      };
    }
    return getDefaultControllerAssignment();
  };
  const getRouterGuidance = () => ({
    endpointId: routingModel.endpointId,
    preferredEndpointIds: [...routingModel.preferredEndpointIds],
    ignoredEndpointIds: currentRegistry.endpoints
      .map((endpoint) => endpoint.identity.endpoint_id)
      .filter((endpointId) => !routingModel.preferredEndpointIds.includes(endpointId)),
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
  const readRouterSummaryData = () => ({
    strategy: currentUnifiedRuntimeConfig?.routingStrategy ?? null,
    executionMode: currentUnifiedRuntimeConfig?.executionMode ?? "decision_only",
    controller: getCurrentControllerAssignment(),
    guidance: getRouterGuidance(),
    configuredCandidateCount: currentRegistry.endpoints.length,
    recentDecisionCount: listTelemetryRequestRecords({ limit: DEFAULT_TELEMETRY_LIMIT }).length,
  });
  const readRouterConfigData = () => ({
    persisted: {
      strategy: currentUnifiedRuntimeConfig?.routingStrategy ?? null,
      executionMode: currentUnifiedRuntimeConfig?.executionMode ?? "decision_only",
    },
    controller: getCurrentControllerAssignment(),
    guidance: getRouterGuidance(),
    sources: {
      runtimeConfigPath: options.unifiedRuntimeConfigPath ?? null,
      routingModel: "fixture",
      policyInputs: "fixture+runtime",
    },
    policySources: {
      roles: runtimeRoles.roleDefinitions,
      tasks: roleTaskFixture.taskDefinitions,
      roleBindings: buildRuntimeRoleBindings(
        roleTaskFixture.roleBindings ?? [],
        runtimeEndpoints,
        currentAccounts,
        currentRegistry,
        runtimeRoles.roleDefinitions,
      ),
    },
  });
  const listRouterCandidateData = () => {
    const controller = getCurrentControllerAssignment();
    const guidance = getRouterGuidance();
    return currentRegistry.endpoints.map((endpoint) => {
      const endpointId = endpoint.identity.endpoint_id;
      const profile = readEndpointProfileData(endpointId);
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
        roleBindings: getEndpointRoleIds(endpointId, runtimeEndpoints, currentAccounts),
        capabilities: endpoint.declared.capabilities,
        toolCallingSupported: endpoint.declared.tool_calling.supported,
        toolCallingStyle: endpoint.declared.tool_calling.style,
        controllerEligible: controller?.endpointId === endpointId,
        preferred: guidance.preferredEndpointIds.includes(endpointId),
        ignored: guidance.ignoredEndpointIds.includes(endpointId),
        latestProfile: profile.latestProfile,
        recentSamples: profile.recentSamples,
        difficultyProfiles: profile.difficultyProfiles,
        advisoryMaxDifficultyRecommendation: profile.advisoryMaxDifficultyRecommendation,
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
      readonly requestedModel?: string;
    },
  ) => {
    const observedDataConfig = resolveUnifiedRuntimeObservedDataConfig(currentUnifiedRuntimeConfig);
    const routingTimeMs = Date.now();
    const runtimeObservedProfiles = readObservedProfilesForRouting({
      databasePath: initialization.databasePath,
      registry: currentRegistry,
      observedDataConfig,
      difficultyBucket: plan.routingDiagnostics?.difficultyRouting?.difficulty,
      routingTimeMs,
    });
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
      observedProfilesByEndpointId: runtimeObservedProfiles.observedProfilesByEndpointId,
      observedDataConfig,
      throughputPenaltyStateByEndpointId:
        runtimeObservedProfiles.throughputPenaltyStateByEndpointId,
      routingTimeMs,
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
      routingModel: plan.routingModel ?? routingModel,
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
        ...(currentUnifiedRuntimeConfig?.liteLLM.enabled ? [createLiteLLMProviderAdapter()] : []),
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
        // File-backed credentials (OAuth, locally-saved API keys) always need direct HTTP execution
        // so that OAuth tokens are correctly resolved and X-Msh-* device headers are applied.
        // In the unified config path, LiteLLM providers get adapterFamily "litellm-proxy", so
        // shouldUseLiveProviderExecution would return false for them — this flag bypasses that check.
        const useDirectExecution =
          target.account?.credentialRef.backend === "local-file" ||
          target.account?.credentialRef.backend === "local-encrypted-file";
        const capture = captures.byEndpointId[target.endpointId];
        const usesFixtureAccount =
          target.providerAccountId !== null && fixtureAccountIds.has(target.providerAccountId);

        if (
          !useDirectExecution &&
          capture &&
          currentUnifiedRuntimeConfig === null &&
          usesFixtureAccount
        ) {
          return {
            providerFamily: target.adapterFamily,
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
            const result = await currentLlamaSwapVendor.execute(
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
                      });
                    },
                  }
                : undefined,
            );
            return {
              providerFamily: target.adapterFamily,
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
            const result = await currentLiteLLMVendor.execute(
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
                        });
                      },
                    }
                  : {}),
                ...(fallbackModelIds?.length ? { fallbackModelIds } : {}),
              },
            );
            return {
              providerFamily: target.adapterFamily,
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
        const performRequest = async (resolvedCredentialValue: string) =>
          networkFetcher(requestCapture.url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(useDirectExecution
                ? createDeviceHeaders(deviceId, oauthVariant?.oauth?.requiredHeaders)
                : {}),
              ...applyCredentialToHeaders(requestCapture.headers, resolvedCredentialValue),
            },
            body: JSON.stringify(requestCapture.body),
          });
        let response = await performRequest(credentialValue);
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
        const responseContentType = response.headers.get("content-type") ?? "";
        if (responseContentType.includes("text/event-stream")) {
          const rawBody = await response.text();
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
        ? await executeToolCalls(
            await createRuntimeToolRegistry(options.repoRoot, currentRegistry),
            {
              requestId,
              toolCalls: execution.normalized.toolCalls,
            },
          )
        : {
            executions: [],
            diagnostics: [],
          };
    const providerAccount = currentAccounts.find(
      (account) => account.providerAccountId === execution.target.providerAccountId,
    );
    const observedProfileDiagnostic =
      runtimeObservedProfiles.diagnosticsByEndpointId[routed.decision.chosen_endpoint_id] ??
      ({
        endpointId: routed.decision.chosen_endpoint_id,
        source: "none",
        readMode: "per-request",
      } as const);
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
      const bundle = createRuntimeObservationBundle({
        decision: routed.decision,
        routingDiagnostics: {
          ...routed.routingDiagnostics,
          ...plan.routingDiagnostics,
          ...(requestRoutingMode ? { routingMode: requestRoutingMode } : {}),
          ...(rewriteDiagnostics ? { rewrite: rewriteDiagnostics } : {}),
          observedProfile: observedProfileDiagnostic,
          effectiveMetrics: summarizeEffectiveMetricsFromDecision(routed.decision),
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
          endpoint.identity.model_id === classifier.modelId &&
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
    });
    if (!shouldApplyControllerRouting(effectiveRoutingMode)) {
      return undefined;
    }

    const controller = currentUnifiedRuntimeConfig?.controller;
    if (!controller?.enabled) {
      return undefined;
    }

    const controllerAllowEndpoints = currentRegistry.endpoints
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
      currentRegistry,
      input.requestedModel,
      modelAliases,
    ).allowEndpoints;
    const controllerMessages = buildControllerRoutingMessages({
      requestedModel: input.requestedModel,
      messages: input.messages,
      toolCount: input.toolCount,
      candidateEndpointIds,
    });
    const controllerPlan: BridgeExecutionPlan = {
      routingRequest: {
        requestId: `${input.requestId}:controller`,
        taskType: "text.chat",
        requiredCapabilities: ["text.chat"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: estimateContextTokens(controllerMessages, 0),
        needsTools: false,
        strategy: "balanced",
        preferLocal: false,
        allowEndpoints: controllerAllowEndpoints,
      },
      executionRequest: {
        messages: controllerMessages,
        temperature: 0,
        maxOutputTokens: 256,
      },
    };

    try {
      const controllerExecution = await Promise.race([
        executeBridgePlan(controllerPlan, `${input.requestId}:controller`, false, undefined, {
          persistObservation: false,
        }),
        delay(Math.max(1, controller.timeoutMs)).then(() => {
          throw new Error("controller-timeout");
        }),
      ]);
      const guidance = parseControllerRoutingOutput(
        controllerExecution.execution.normalized.outputText,
      );
      if (!guidance) {
        return {
          active: true,
          fallbackApplied: true,
          fallbackReason: "invalid-controller-output",
        };
      }
      return {
        active: true,
        resolvedGuidance: guidance,
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
  const backend = {
    get registry(): EndpointRegistryResult {
      return currentRegistry;
    },
    async readVersionInfo(): Promise<{
      version: string;
      commit: string;
      build_date: string;
    }> {
      return {
        version: currentUnifiedRuntimeConfig?.version ?? "unversioned",
        commit: "runtime-derived",
        build_date: "runtime-derived",
      };
    },
    async executeChatCompletions(
      body: OpenAIChatCompletionsBody,
      requestId: string,
      streamWriter?: BridgeStreamWriter,
      requestOptions?: BridgeExecutionRequestOptions,
    ): Promise<BridgeChatCompletionsExecutionResult> {
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
      const plan = mapChatCompletionsRequest(
        currentRegistry,
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
                    endpointIds: currentRegistry.endpoints.map(
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
      );
      const { execution, toolExecutionResult, routingDecisionId } = await executeBridgePlan(
        plan,
        requestId,
        body.stream,
        streamWriter,
        {
          requestOptions,
          requestedModel: body.model,
        },
      );
      const costUsd =
        execution.normalized.vendorMetadata?.costUsd ??
        execution.responseCapture.vendorMetadata?.costUsd;
      const cacheUsed =
        execution.normalized.vendorMetadata?.cacheUsed ??
        execution.responseCapture.vendorMetadata?.cacheUsed;

      return {
        model: execution.target.modelId,
        endpointId: execution.target.endpointId,
        adapterFamily: execution.target.adapterFamily,
        routingDecisionId,
        ...((execution.responseCapture.vendorMetadata?.vendorId ??
        execution.normalized.vendorMetadata?.vendorId)
          ? {
              vendorId:
                execution.responseCapture.vendorMetadata?.vendorId ??
                execution.normalized.vendorMetadata?.vendorId,
            }
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
      const plan = mapResponsesRequest(
        currentRegistry,
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
                    endpointIds: currentRegistry.endpoints.map(
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
      );
      const { execution, routingDecisionId } = await executeBridgePlan(
        plan,
        requestId,
        body.stream,
        streamWriter,
        {
          requestOptions,
          requestedModel: body.model,
        },
      );
      const costUsd =
        execution.normalized.vendorMetadata?.costUsd ??
        execution.responseCapture.vendorMetadata?.costUsd;
      const cacheUsed =
        execution.normalized.vendorMetadata?.cacheUsed ??
        execution.responseCapture.vendorMetadata?.cacheUsed;

      return {
        responseId: extractResponseId(execution.responseCapture.body) ?? "resp-role-model",
        model: execution.target.modelId,
        endpointId: execution.target.endpointId,
        adapterFamily: execution.target.adapterFamily,
        routingDecisionId,
        ...((execution.responseCapture.vendorMetadata?.vendorId ??
        execution.normalized.vendorMetadata?.vendorId)
          ? {
              vendorId:
                execution.responseCapture.vendorMetadata?.vendorId ??
                execution.normalized.vendorMetadata?.vendorId,
            }
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
      readinessSummary: {
        pendingDeviceAuthorizationCount: number;
        credentialsMissingAccountCount: number;
        connectedWithoutEndpointCount: number;
        readyAccountCount: number;
      };
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
        readinessSummary: buildCredentialReadinessSummary(),
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
        "llama-swap":
          currentLlamaSwapVendor?.readStatus() ?? createInactiveVendorStatus("llama-swap"),
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
      const liteLLMProviderIds = new Set(liteLLMProviders.map((p) => p.providerId));
      const localModelIds =
        currentUnifiedRuntimeConfig?.llamaSwap.models.map((m) => m.modelId) ?? [];
      const mergedProviders = [
        ...currentNormalizedCatalog.providers.map((provider) => {
          const effectiveModelIds = resolveModelIds(provider.providerId);
          const presetVariants = (
            providerPresets.providers[provider.providerId]?.variants ?? []
          ).map((variant) => ({
            ...variant,
            modelIds: effectiveModelIds.length > 0 ? effectiveModelIds : variant.modelIds,
          }));
          const liteLLMProvider = liteLLMProviders.find(
            (p) => p.providerId === provider.providerId,
          );
          const variants = resolveProviderVariants({
            providerId: provider.providerId,
            displayName: provider.displayName,
            apiBase: provider.apiBase,
            modelIds: effectiveModelIds,
            presetVariants,
            supportedAuthModes: liteLLMProvider?.supportedAuthModes ?? provider.supportedAuthModes,
            oauth: liteLLMProvider?.oauth,
          });
          return {
            providerId: provider.providerId,
            displayName: provider.displayName,
            npmPackage: provider.npmPackage,
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
        ...liteLLMProviders
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
      currentAccounts = [...readCurrentAccounts()];
      return currentAccounts;
    },
    async listProviderDeviceAuthorizations(): Promise<
      readonly DeviceAuthorizationReadbackResult[]
    > {
      return listCurrentProviderDeviceAuthorizations();
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
      const provider =
        currentNormalizedCatalog.providers.find((entry) => entry.providerId === providerId) ??
        liteLLMProviders.find((entry) => entry.providerId === providerId);
      if (!provider) {
        throw new Error(
          `Provider ${providerId} is not present in the normalized catalog or LiteLLM provider list.`,
        );
      }
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
      const runtimeProvider = liteLLMProviders.find((entry) => entry.providerId === providerId);
      const variants = resolveProviderVariants({
        providerId,
        displayName: provider.displayName,
        apiBase: provider.apiBase,
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
          validationResult.diagnostics[0]?.message ??
            "Provider device-authorization validation failed.",
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
        capabilities: readonly string[];
        toolCallingSupported: boolean;
        toolCallingStyle: string;
        status: string;
      }[]
    > {
      const localSourcesByEndpointId = new Map(
        getCurrentRegistrySources().local.map((source) => [source.endpointId, source] as const),
      );
      const runtimeEndpointsById = new Map(
        runtimeEndpoints.map((entry) => [entry.endpointId, entry] as const),
      );
      const accountsById = new Map(
        currentAccounts.map((account) => [account.providerAccountId, account] as const),
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
          ),
          localModelSource:
            localSource?.localModelSource ?? toLocalModelSource(endpoint.identity.serving_source),
          endpointKind: endpoint.identity.endpoint_kind,
          servingSource: endpoint.identity.serving_source,
          sourceType: toSourceType(endpoint.identity.endpoint_kind),
          healthStatus:
            runtimeEndpoint?.healthStatus ??
            (endpoint.deniedByPolicy ? "policy-blocked" : "healthy"),
          capabilities: endpoint.declared.capabilities,
          toolCallingSupported: endpoint.declared.tool_calling.supported,
          toolCallingStyle: endpoint.declared.tool_calling.style,
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
    async listLocalModels(): Promise<
      readonly {
        modelId: string;
        loadedAt: string;
        engine: string;
        localModelSource?: "llama-swap" | "peer-backed";
        contextWindow?: number | null;
        proxyBaseUrl?: string | null;
        checkEndpoint?: string | null;
        useModelName?: string | null;
      }[]
    > {
      const localConfigByModelId = new Map(
        (currentUnifiedRuntimeConfig?.llamaSwap.models ?? []).map(
          (model) => [model.modelId, model] as const,
        ),
      );
      const vendorModels = currentLlamaSwapVendor?.getRunningModels
        ? await currentLlamaSwapVendor.getRunningModels()
        : [];
      const localPeerEndpoints = runtimeEndpoints.filter(
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
      const localPeerModels = localPeerEndpoints.flatMap((endpoint) =>
        loadedAtByModelId.has(endpoint.modelId) ||
        !vendorModels.some((model) => model.modelId === endpoint.modelId)
          ? [
              {
                modelId: endpoint.modelId,
                loadedAt: loadedAtByModelId.get(endpoint.modelId) ?? new Date().toISOString(),
                engine: LOCAL_OPENAI_PROVIDER_ID,
                localModelSource: "peer-backed" as const,
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
        contextWindow?: number | null;
        proxyBaseUrl?: string | null;
        checkEndpoint?: string | null;
        useModelName?: string | null;
      }> = vendorModels.map((model) => {
        const config = localConfigByModelId.get(model.modelId);
        return {
          ...model,
          localModelSource: "llama-swap" as const,
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
      return mergedModels;
    },
    async loadLocalModel(modelId: string): Promise<{ success: boolean }> {
      if (await activateConfiguredLocalPeerModel(modelId)) {
        return { success: true };
      }

      if (!currentLlamaSwapVendor) {
        throw new Error(
          "No local endpoints are configured. Add a local endpoint or enable llama_swap.models before loading a model.",
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
      if (!baseUrl) {
        return { logs: "" };
      }
      try {
        const response = await fetch(`${baseUrl}/logs`);
        if (!response.ok) {
          return { logs: "" };
        }
        const text = await response.text();
        return { logs: text };
      } catch {
        return { logs: "" };
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
      await Promise.all([currentLlamaSwapVendor?.shutdown(), currentLiteLLMVendor?.shutdown()]);
      await supervisor?.shutdown();
    },
  };

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
  const inferredRepoRoot = input.executablePath
    ? (() => {
        const executableDir = path.dirname(path.resolve(input.executablePath));
        const releaseDir = path.dirname(executableDir);
        const distDir = path.dirname(releaseDir);
        const routerRoot = path.dirname(distDir);
        if (
          path.basename(releaseDir) !== "release" ||
          path.basename(distDir) !== "dist" ||
          path.basename(routerRoot) !== "role-model-router"
        ) {
          return undefined;
        }
        return path.dirname(routerRoot);
      })()
    : undefined;
  const repoRoot = input.repoRoot?.trim() || inferredRepoRoot;
  if (!repoRoot) {
    throw new Error("repoRoot is required for the runtime host bridge.");
  }
  const runtimeStateRoot =
    input.runtimeStateRoot?.trim() ||
    path.join(
      input.localAppData?.trim() || process.env.LOCALAPPDATA || os.tmpdir(),
      "Role Model Runtime",
      "state",
    );

  return {
    host: input.host?.trim() || "127.0.0.1",
    port: input.port ? Number.parseInt(input.port, 10) : 8091,
    repoRoot,
    runtimeStateRoot,
    scopeId: input.scopeId?.trim() || "runtime-host-bridge",
    staticRoot: path.join(repoRoot, "role-model-router", "apps", "runtime-ui", "build", "client"),
    unifiedRuntimeConfigPath: input.unifiedRuntimeConfigPath?.trim() || undefined,
  };
}
