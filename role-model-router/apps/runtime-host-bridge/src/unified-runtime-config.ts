import { parse, stringify } from "yaml";

export type UnifiedRuntimeExecutionMode =
  | "decision_only"
  | "hybrid"
  | "local_only"
  | "remote_only";

export type UnifiedRuntimeDifficultyBucket = "easy" | "medium" | "hard";
export type UnifiedRuntimeAliasRoutingMode = "basic" | "difficulty" | "intelligent" | "hybrid";

export interface UnifiedRuntimeConfigModel {
  readonly modelId: string;
  readonly path: string;
  readonly contextWindow: number | null;
  readonly command: string | null;
  readonly proxyBaseUrl: string | null;
  readonly checkEndpoint: string | null;
  readonly useModelName: string | null;
  readonly maxDifficulty?: UnifiedRuntimeDifficultyBucket | null;
}

export type UnifiedRuntimeJSONValue =
  | string
  | number
  | boolean
  | null
  | readonly UnifiedRuntimeJSONValue[]
  | { readonly [key: string]: UnifiedRuntimeJSONValue };

export interface UnifiedRuntimeConfigProviderMapping {
  readonly modelId: string;
  readonly litellmModel: string;
  readonly litellmParams: Readonly<Record<string, UnifiedRuntimeJSONValue>>;
  readonly maxDifficulty?: UnifiedRuntimeDifficultyBucket | null;
}

export interface UnifiedRuntimeProcessConfig {
  readonly command: string | null;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
  readonly cwd: string | null;
  readonly startupTimeoutMs: number | null;
}

export interface UnifiedRuntimeConfigProvider {
  readonly providerId: string;
  readonly apiKeyRef: string | null;
  readonly modelNames: readonly string[];
  readonly modelMappings: readonly UnifiedRuntimeConfigProviderMapping[];
}

export interface UnifiedRuntimeModelAliasConfig {
  readonly aliasId: string;
  readonly mode?: UnifiedRuntimeAliasRoutingMode | null;
  readonly modelIds: readonly string[];
}

export interface UnifiedRuntimeDifficultyClassifierConfig {
  readonly enabled: boolean;
  readonly rubricVersion: string;
  readonly sourceType: "local" | "remote";
  readonly endpointId: string | null;
  readonly modelId: string | null;
  readonly timeoutMs: number;
  readonly fallbackDifficulty: UnifiedRuntimeDifficultyBucket;
}

export interface UnifiedRuntimeControllerConfig {
  readonly enabled: boolean;
  readonly sourceType: "local" | "remote";
  readonly endpointId: string | null;
  readonly modelId: string | null;
  readonly timeoutMs: number;
}

export interface UnifiedRuntimeObservedDataConfig {
  readonly enabled: boolean;
  readonly aggregation: {
    readonly minSamples: number;
  };
  readonly difficultyLearning: {
    readonly cacheTtlMs: number;
    readonly invalidation: {
      readonly maxContextTokensDelta: number;
      readonly maxHistoryTurnDelta: number;
      readonly maxToolCountDelta: number;
      readonly maxInstructionConstraintDelta: number;
      readonly maxDecompositionKeywordDelta: number;
      readonly reclassifyOnCodeOrSchemaChange: boolean;
    };
    readonly override: {
      readonly minSamples: number;
      readonly maxFailureRate: number;
      readonly minQualityScore: number;
      readonly minTokensPerSec: number;
    };
    readonly recommendation: {
      readonly minSamples: number;
      readonly maxFailureRate: number;
      readonly minQualityScore: number;
      readonly minTokensPerSec: number;
    };
  };
  readonly metricHalflives: {
    readonly qualityMs: number;
    readonly latencyMs: number;
    readonly throughputMs: number;
    readonly reliabilityMs: number;
    readonly costMs: number;
  };
  readonly throughputSla: {
    readonly enabled: boolean;
    readonly minTokensPerSec: number;
    readonly penaltyTimeoutMs: number;
    readonly penaltyFactor: number;
  };
}

export const DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG: UnifiedRuntimeObservedDataConfig = {
  enabled: true,
  aggregation: {
    minSamples: 2,
  },
  difficultyLearning: {
    cacheTtlMs: 15 * 60_000,
    invalidation: {
      maxContextTokensDelta: 800,
      maxHistoryTurnDelta: 2,
      maxToolCountDelta: 1,
      maxInstructionConstraintDelta: 3,
      maxDecompositionKeywordDelta: 2,
      reclassifyOnCodeOrSchemaChange: true,
    },
    override: {
      minSamples: 3,
      maxFailureRate: 0.35,
      minQualityScore: 0.7,
      minTokensPerSec: 18,
    },
    recommendation: {
      minSamples: 4,
      maxFailureRate: 0.2,
      minQualityScore: 0.8,
      minTokensPerSec: 22,
    },
  },
  metricHalflives: {
    qualityMs: 15 * 60_000,
    latencyMs: 5 * 60_000,
    throughputMs: 2 * 60_000,
    reliabilityMs: 10 * 60_000,
    costMs: 30 * 60_000,
  },
  throughputSla: {
    enabled: true,
    minTokensPerSec: 24,
    penaltyTimeoutMs: 10 * 60_000,
    penaltyFactor: 0,
  },
};

export function resolveUnifiedRuntimeObservedDataConfig(
  config: Pick<UnifiedRuntimeConfig, "observedData"> | null | undefined,
): UnifiedRuntimeObservedDataConfig {
  return config?.observedData ?? DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG;
}

export interface UnifiedRuntimeConfig {
  readonly version: string;
  readonly routingStrategy: string | null;
  readonly executionMode: UnifiedRuntimeExecutionMode;
  readonly observedData?: UnifiedRuntimeObservedDataConfig;
  readonly difficultyClassifier?: UnifiedRuntimeDifficultyClassifierConfig;
  readonly controller?: UnifiedRuntimeControllerConfig;
  readonly modelAliases?: readonly UnifiedRuntimeModelAliasConfig[];
  readonly llamaSwap: {
    readonly enabled: boolean;
    readonly models: readonly UnifiedRuntimeConfigModel[];
    readonly process: UnifiedRuntimeProcessConfig;
  };
  readonly liteLLM: {
    readonly enabled: boolean;
    readonly providers: readonly UnifiedRuntimeConfigProvider[];
    readonly process: UnifiedRuntimeProcessConfig;
  };
}

interface RawLlamaSwapModel {
  readonly path?: string;
  readonly context_window?: number;
  readonly command?: string;
  readonly proxy?: string;
  readonly check_endpoint?: string;
  readonly use_model_name?: string;
  readonly max_difficulty?: string;
}

interface RawLiteLLMProvider {
  readonly api_key?: string;
  readonly model_list?: ReadonlyArray<{
    readonly model_name?: string;
    readonly max_difficulty?: string;
    readonly litellm_params?: Readonly<Record<string, unknown>>;
  }>;
}

interface RawUnifiedRuntimeConfig {
  readonly version?: string;
  readonly routing?: {
    readonly strategy?: string;
  };
  readonly controller?: {
    readonly enabled?: boolean;
    readonly source_type?: string;
    readonly endpoint_id?: string;
    readonly model_id?: string;
    readonly timeout_ms?: number;
  };
  readonly difficulty_classifier?: {
    readonly enabled?: boolean;
    readonly rubric_version?: string;
    readonly source_type?: string;
    readonly endpoint_id?: string;
    readonly model_id?: string;
    readonly timeout_ms?: number;
    readonly fallback_difficulty?: string;
  };
  readonly model_aliases?: Readonly<
    Record<
      string,
      {
        readonly mode?: string;
        readonly model_ids?: readonly string[];
      }
    >
  >;
  readonly observed_data?: {
    readonly enabled?: boolean;
    readonly aggregation?: {
      readonly min_samples?: number;
    };
    readonly difficulty_learning?: {
      readonly cache_ttl_ms?: number;
      readonly invalidation?: {
        readonly max_context_tokens_delta?: number;
        readonly max_history_turn_delta?: number;
        readonly max_tool_count_delta?: number;
        readonly max_instruction_constraint_delta?: number;
        readonly max_decomposition_keyword_delta?: number;
        readonly reclassify_on_code_or_schema_change?: boolean;
      };
      readonly override?: {
        readonly min_samples?: number;
        readonly max_failure_rate?: number;
        readonly min_quality_score?: number;
        readonly min_tokens_per_sec?: number;
      };
      readonly recommendation?: {
        readonly min_samples?: number;
        readonly max_failure_rate?: number;
        readonly min_quality_score?: number;
        readonly min_tokens_per_sec?: number;
      };
    };
    readonly metric_halflives?: {
      readonly quality_ms?: number;
      readonly latency_ms?: number;
      readonly throughput_ms?: number;
      readonly reliability_ms?: number;
      readonly cost_ms?: number;
    };
    readonly throughput_sla?: {
      readonly enabled?: boolean;
      readonly min_tokens_per_sec?: number;
      readonly penalty_timeout_ms?: number;
      readonly penalty_factor?: number;
    };
  };
  readonly llama_swap?: {
    readonly models?: Readonly<Record<string, RawLlamaSwapModel>>;
    readonly command?: string;
    readonly args?: readonly string[];
    readonly env?: Readonly<Record<string, string>>;
    readonly cwd?: string;
    readonly startup_timeout_ms?: number;
  };
  readonly litellm_proxy?: {
    readonly providers?: Readonly<Record<string, RawLiteLLMProvider>>;
    readonly command?: string;
    readonly args?: readonly string[];
    readonly env?: Readonly<Record<string, string>>;
    readonly cwd?: string;
    readonly startup_timeout_ms?: number;
  };
}

function ensureObject(
  value: unknown,
  message: string,
): asserts value is Readonly<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }
}

function parseProcessConfig(
  value:
    | {
        readonly command?: string;
        readonly args?: readonly string[];
        readonly env?: Readonly<Record<string, string>>;
        readonly cwd?: string;
        readonly startup_timeout_ms?: number;
      }
    | undefined,
): UnifiedRuntimeProcessConfig {
  const envEntries = value?.env ?? {};
  const env: Record<string, string> = {};
  for (const [key, entry] of Object.entries(envEntries)) {
    if (typeof entry === "string") {
      env[key] = entry;
    }
  }
  return {
    command: typeof value?.command === "string" && value.command.trim().length > 0 ? value.command : null,
    args: Array.isArray(value?.args) ? value.args.filter((entry): entry is string => typeof entry === "string") : [],
    env,
    cwd: typeof value?.cwd === "string" && value.cwd.trim().length > 0 ? value.cwd : null,
    startupTimeoutMs:
      typeof value?.startup_timeout_ms === "number" && value.startup_timeout_ms > 0
        ? value.startup_timeout_ms
        : null,
  };
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readDifficultyBucket(
  value: unknown,
  path: string,
): UnifiedRuntimeDifficultyBucket | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (value === "easy" || value === "medium" || value === "hard") {
    return value;
  }
  throw new Error(`${path} must be easy, medium, or hard.`);
}

function readAliasRoutingMode(
  value: unknown,
  path: string,
): UnifiedRuntimeAliasRoutingMode | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (value === "basic" || value === "difficulty" || value === "intelligent" || value === "hybrid") {
    return value;
  }
  throw new Error(`${path} must be basic, difficulty, intelligent, or hybrid.`);
}

function readClassifierSourceType(value: unknown, path: string): "local" | "remote" {
  if (value === "local" || value === "remote") {
    return value;
  }
  throw new Error(`${path} must be local or remote.`);
}

function readRequiredPositiveNumber(value: unknown, path: string, fallback: number): number {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${path} must be a positive number.`);
  }
  return value;
}

function readPenaltyFactor(value: unknown, path: string, fallback: number): number {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${path} must be between 0 and 1 inclusive.`);
  }
  return value;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function readStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const normalized: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      normalized[key] = entry;
    }
  }
  return normalized;
}

function normalizeJSONValue(value: unknown): UnifiedRuntimeJSONValue | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => normalizeJSONValue(entry))
      .filter((entry): entry is UnifiedRuntimeJSONValue => entry !== undefined);
    return normalized;
  }
  if (value && typeof value === "object") {
    const normalized: Record<string, UnifiedRuntimeJSONValue> = {};
    for (const [key, entry] of Object.entries(value)) {
      const normalizedEntry = normalizeJSONValue(entry);
      if (normalizedEntry !== undefined) {
        normalized[key] = normalizedEntry;
      }
    }
    return normalized;
  }
  return undefined;
}

function isUnifiedRuntimeJSONObject(
  value: UnifiedRuntimeJSONValue | undefined,
): value is Readonly<Record<string, UnifiedRuntimeJSONValue>> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeProcessConfigInput(value: unknown): UnifiedRuntimeProcessConfig {
  if (value === undefined || value === null) {
    return {
      command: null,
      args: [],
      env: {},
      cwd: null,
      startupTimeoutMs: null,
    };
  }
  ensureObject(value, "Unified runtime process config must be an object.");
  return {
    command: readNonEmptyString(value.command),
    args: readStringArray(value.args),
    env: readStringRecord(value.env),
    cwd: readNonEmptyString(value.cwd),
    startupTimeoutMs: readPositiveNumber(
      "startupTimeoutMs" in value ? value.startupTimeoutMs : value.startup_timeout_ms,
    ),
  };
}

function normalizeLlamaSwapModelInput(
  value: unknown,
  fallbackModelId?: string,
): UnifiedRuntimeConfigModel | null {
  ensureObject(value, "Unified llama-swap model config must be an object.");
  const modelId = readNonEmptyString("modelId" in value ? value.modelId : value.model_id) ?? fallbackModelId ?? null;
  const path = readNonEmptyString(value.path);
  if (!modelId || !path) {
    return null;
  }
  return {
    modelId,
    path,
    contextWindow: readPositiveNumber(
      "contextWindow" in value ? value.contextWindow : value.context_window,
    ),
    command: readNonEmptyString(value.command),
    proxyBaseUrl: readNonEmptyString(
      "proxyBaseUrl" in value ? value.proxyBaseUrl : value.proxy,
    ),
    checkEndpoint: readNonEmptyString(
      "checkEndpoint" in value ? value.checkEndpoint : value.check_endpoint,
    ),
    useModelName: readNonEmptyString(
      "useModelName" in value ? value.useModelName : value.use_model_name,
    ),
    maxDifficulty: readDifficultyBucket(
      "maxDifficulty" in value ? value.maxDifficulty : "max_difficulty" in value ? value.max_difficulty : undefined,
      `llamaSwap.models.${modelId}.maxDifficulty`,
    ),
  };
}

function normalizeLlamaSwapInput(value: unknown): UnifiedRuntimeConfig["llamaSwap"] {
  if (value === undefined || value === null) {
    return {
      enabled: false,
      models: [],
      process: normalizeProcessConfigInput(undefined),
    };
  }
  ensureObject(value, "Unified llama-swap config must be an object.");

  const rawModels = "models" in value ? value.models : undefined;
  const models: UnifiedRuntimeConfigModel[] = [];

  if (Array.isArray(rawModels)) {
    for (const entry of rawModels) {
      const normalized = normalizeLlamaSwapModelInput(entry);
      if (normalized) {
        models.push(normalized);
      }
    }
  } else if (rawModels && typeof rawModels === "object") {
    for (const [modelId, entry] of Object.entries(rawModels)) {
      const normalized = normalizeLlamaSwapModelInput(entry, modelId);
      if (normalized) {
        models.push(normalized);
      }
    }
  }

  const processSource =
    "process" in value && value.process && typeof value.process === "object" ? value.process : value;

  return {
    enabled: models.length > 0,
    models,
    process: normalizeProcessConfigInput(processSource),
  };
}

function normalizeLiteLLMProviderMappingInput(
  value: unknown,
): UnifiedRuntimeConfigProviderMapping | null {
  ensureObject(value, "Unified LiteLLM model mapping must be an object.");
  const modelId =
    readNonEmptyString("modelId" in value ? value.modelId : value.model_name) ??
    readNonEmptyString("model_id" in value ? value.model_id : undefined);
  const normalizedLiteLLMParams = normalizeJSONValue(
    "litellmParams" in value ? value.litellmParams : value.litellm_params,
  );
  const litellmParams = isUnifiedRuntimeJSONObject(normalizedLiteLLMParams)
    ? normalizedLiteLLMParams
    : {};
  const litellmModel =
    readNonEmptyString("litellmModel" in value ? value.litellmModel : value.litellm_model) ??
    (typeof litellmParams.model === "string" ? litellmParams.model : null) ??
    modelId;
  if (!modelId || !litellmModel) {
    return null;
  }
  return {
    modelId,
    litellmModel,
    litellmParams: {
      ...litellmParams,
      model: litellmModel,
    },
    maxDifficulty: readDifficultyBucket(
      "maxDifficulty" in value ? value.maxDifficulty : "max_difficulty" in value ? value.max_difficulty : undefined,
      `liteLLM.modelMappings.${modelId}.maxDifficulty`,
    ),
  };
}

function normalizeLiteLLMProviderInput(
  value: unknown,
  fallbackProviderId?: string,
): UnifiedRuntimeConfigProvider | null {
  ensureObject(value, "Unified LiteLLM provider config must be an object.");
  const providerId =
    readNonEmptyString("providerId" in value ? value.providerId : value.provider_id) ?? fallbackProviderId ?? null;
  if (!providerId) {
    return null;
  }

  const modelMappings: UnifiedRuntimeConfigProviderMapping[] = [];
  const rawModelMappings =
    "modelMappings" in value
      ? value.modelMappings
      : "model_mappings" in value
        ? value.model_mappings
        : "model_list" in value
          ? value.model_list
          : undefined;
  if (Array.isArray(rawModelMappings)) {
    for (const entry of rawModelMappings) {
      const normalized = normalizeLiteLLMProviderMappingInput(entry);
      if (normalized) {
        modelMappings.push(normalized);
      }
    }
  }

  const explicitModelNames = readStringArray(
    "modelNames" in value ? value.modelNames : "model_names" in value ? value.model_names : undefined,
  );
  const modelNames = explicitModelNames.length > 0 ? explicitModelNames : modelMappings.map((entry) => entry.modelId);

  return {
    providerId,
    apiKeyRef: readNonEmptyString("apiKeyRef" in value ? value.apiKeyRef : value.api_key),
    modelNames,
    modelMappings,
  };
}

function normalizeLiteLLMInput(value: unknown): UnifiedRuntimeConfig["liteLLM"] {
  if (value === undefined || value === null) {
    return {
      enabled: false,
      providers: [],
      process: normalizeProcessConfigInput(undefined),
    };
  }
  ensureObject(value, "Unified LiteLLM config must be an object.");

  const rawProviders = "providers" in value ? value.providers : undefined;
  const providers: UnifiedRuntimeConfigProvider[] = [];
  if (Array.isArray(rawProviders)) {
    for (const entry of rawProviders) {
      const normalized = normalizeLiteLLMProviderInput(entry);
      if (normalized) {
        providers.push(normalized);
      }
    }
  } else if (rawProviders && typeof rawProviders === "object") {
    for (const [providerId, entry] of Object.entries(rawProviders)) {
      const normalized = normalizeLiteLLMProviderInput(entry, providerId);
      if (normalized) {
        providers.push(normalized);
      }
    }
  }

  const processSource =
    "process" in value && value.process && typeof value.process === "object" ? value.process : value;

  return {
    enabled: providers.length > 0,
    providers,
    process: normalizeProcessConfigInput(processSource),
  };
}

function normalizeModelAliasInput(
  value: unknown,
  fallbackAliasId?: string,
  prefix = "modelAliases",
): UnifiedRuntimeModelAliasConfig | null {
  ensureObject(value, `${prefix} must be an object.`);
  const aliasId =
    readNonEmptyString("aliasId" in value ? value.aliasId : value.alias_id) ?? fallbackAliasId ?? null;
  if (!aliasId) {
    throw new Error(`${prefix}.alias_id is required.`);
  }
  const modelIds = readStringArray("modelIds" in value ? value.modelIds : "model_ids" in value ? value.model_ids : undefined)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (modelIds.length === 0) {
    throw new Error(`${prefix}.${aliasId}.model_ids must include at least one model id.`);
  }
  return {
    aliasId,
    mode: readAliasRoutingMode(
      "mode" in value ? value.mode : undefined,
      `${prefix}.${aliasId}.mode`,
    ),
    modelIds,
  };
}

function normalizeModelAliasesInput(
  value: unknown,
  prefix = "modelAliases",
): readonly UnifiedRuntimeModelAliasConfig[] {
  if (value === undefined || value === null) {
    return [];
  }
  const aliases: UnifiedRuntimeModelAliasConfig[] = [];
  if (Array.isArray(value)) {
    for (const entry of value) {
      const normalized = normalizeModelAliasInput(entry, undefined, prefix);
      if (normalized) {
        aliases.push(normalized);
      }
    }
    return aliases;
  }
  ensureObject(value, `${prefix} must be an object.`);
  for (const [aliasId, entry] of Object.entries(value)) {
    const normalized = normalizeModelAliasInput(entry, aliasId, prefix);
    if (normalized) {
      aliases.push(normalized);
    }
  }
  return aliases;
}

const DEFAULT_UNIFIED_RUNTIME_DIFFICULTY_CLASSIFIER_CONFIG: UnifiedRuntimeDifficultyClassifierConfig = {
  enabled: true,
  rubricVersion: "v1",
  sourceType: "remote",
  endpointId: null,
  modelId: null,
  timeoutMs: 1500,
  fallbackDifficulty: "hard",
};

const DEFAULT_UNIFIED_RUNTIME_CONTROLLER_CONFIG: UnifiedRuntimeControllerConfig = {
  enabled: true,
  sourceType: "remote",
  endpointId: null,
  modelId: null,
  timeoutMs: 1500,
};

function normalizeDifficultyClassifierInput(
  value: unknown,
  prefix: string,
): UnifiedRuntimeDifficultyClassifierConfig {
  ensureObject(value, `${prefix} must be an object.`);
  return {
    enabled: readBoolean(value.enabled) ?? DEFAULT_UNIFIED_RUNTIME_DIFFICULTY_CLASSIFIER_CONFIG.enabled,
    rubricVersion:
      readNonEmptyString("rubricVersion" in value ? value.rubricVersion : "rubric_version" in value ? value.rubric_version : undefined) ??
      DEFAULT_UNIFIED_RUNTIME_DIFFICULTY_CLASSIFIER_CONFIG.rubricVersion,
    sourceType: readClassifierSourceType(
      "sourceType" in value ? value.sourceType : "source_type" in value ? value.source_type : DEFAULT_UNIFIED_RUNTIME_DIFFICULTY_CLASSIFIER_CONFIG.sourceType,
      `${prefix}.source_type`,
    ),
    endpointId: readNonEmptyString("endpointId" in value ? value.endpointId : "endpoint_id" in value ? value.endpoint_id : undefined),
    modelId: readNonEmptyString("modelId" in value ? value.modelId : "model_id" in value ? value.model_id : undefined),
    timeoutMs: readRequiredPositiveNumber(
      "timeoutMs" in value ? value.timeoutMs : "timeout_ms" in value ? value.timeout_ms : undefined,
      `${prefix}.timeout_ms`,
      DEFAULT_UNIFIED_RUNTIME_DIFFICULTY_CLASSIFIER_CONFIG.timeoutMs,
    ),
    fallbackDifficulty:
      readDifficultyBucket(
        "fallbackDifficulty" in value
          ? value.fallbackDifficulty
          : "fallback_difficulty" in value
            ? value.fallback_difficulty
            : DEFAULT_UNIFIED_RUNTIME_DIFFICULTY_CLASSIFIER_CONFIG.fallbackDifficulty,
        `${prefix}.fallback_difficulty`,
      ) ?? DEFAULT_UNIFIED_RUNTIME_DIFFICULTY_CLASSIFIER_CONFIG.fallbackDifficulty,
  };
}

function normalizeControllerInput(
  value: unknown,
  prefix: string,
): UnifiedRuntimeControllerConfig {
  ensureObject(value, `${prefix} must be an object.`);
  return {
    enabled: readBoolean(value.enabled) ?? DEFAULT_UNIFIED_RUNTIME_CONTROLLER_CONFIG.enabled,
    sourceType: readClassifierSourceType(
      "sourceType" in value ? value.sourceType : "source_type" in value ? value.source_type : DEFAULT_UNIFIED_RUNTIME_CONTROLLER_CONFIG.sourceType,
      `${prefix}.source_type`,
    ),
    endpointId: readNonEmptyString("endpointId" in value ? value.endpointId : "endpoint_id" in value ? value.endpoint_id : undefined),
    modelId: readNonEmptyString("modelId" in value ? value.modelId : "model_id" in value ? value.model_id : undefined),
    timeoutMs: readRequiredPositiveNumber(
      "timeoutMs" in value ? value.timeoutMs : "timeout_ms" in value ? value.timeout_ms : undefined,
      `${prefix}.timeout_ms`,
      DEFAULT_UNIFIED_RUNTIME_CONTROLLER_CONFIG.timeoutMs,
    ),
  };
}

function normalizeObservedDataInput(
  value: unknown,
  prefix: string,
): UnifiedRuntimeObservedDataConfig {
  if (value === undefined || value === null) {
    return DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG;
  }
  ensureObject(value, `${prefix} must be an object.`);

  const aggregationSource =
    "aggregation" in value && value.aggregation && typeof value.aggregation === "object"
      ? value.aggregation
      : undefined;
  if (aggregationSource !== undefined) {
    ensureObject(aggregationSource, `${prefix}.aggregation must be an object.`);
  }
  const metricHalflivesSource =
    "metricHalflives" in value
      ? value.metricHalflives
      : "metric_halflives" in value
        ? value.metric_halflives
        : undefined;
  if (metricHalflivesSource !== undefined) {
    ensureObject(metricHalflivesSource, `${prefix}.metric_halflives must be an object.`);
  }
  const throughputSlaSource =
    "throughputSla" in value
      ? value.throughputSla
      : "throughput_sla" in value
        ? value.throughput_sla
        : undefined;
  const difficultyLearningSource =
    "difficultyLearning" in value
      ? value.difficultyLearning
      : "difficulty_learning" in value
        ? value.difficulty_learning
        : undefined;
  if (throughputSlaSource !== undefined) {
    ensureObject(throughputSlaSource, `${prefix}.throughput_sla must be an object.`);
  }
  if (difficultyLearningSource !== undefined) {
    ensureObject(difficultyLearningSource, `${prefix}.difficulty_learning must be an object.`);
  }
  const invalidationSource =
    difficultyLearningSource &&
    typeof difficultyLearningSource === "object" &&
    "invalidation" in difficultyLearningSource &&
    difficultyLearningSource.invalidation &&
    typeof difficultyLearningSource.invalidation === "object"
      ? difficultyLearningSource.invalidation
      : undefined;
  if (invalidationSource !== undefined) {
    ensureObject(invalidationSource, `${prefix}.difficulty_learning.invalidation must be an object.`);
  }
  const overrideSource =
    difficultyLearningSource &&
    typeof difficultyLearningSource === "object" &&
    "override" in difficultyLearningSource &&
    difficultyLearningSource.override &&
    typeof difficultyLearningSource.override === "object"
      ? difficultyLearningSource.override
      : undefined;
  if (overrideSource !== undefined) {
    ensureObject(overrideSource, `${prefix}.difficulty_learning.override must be an object.`);
  }
  const recommendationSource =
    difficultyLearningSource &&
    typeof difficultyLearningSource === "object" &&
    "recommendation" in difficultyLearningSource &&
    difficultyLearningSource.recommendation &&
    typeof difficultyLearningSource.recommendation === "object"
      ? difficultyLearningSource.recommendation
      : undefined;
  if (recommendationSource !== undefined) {
    ensureObject(recommendationSource, `${prefix}.difficulty_learning.recommendation must be an object.`);
  }

  return {
    enabled: readBoolean(value.enabled) ?? DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.enabled,
    aggregation: {
      minSamples: readRequiredPositiveNumber(
        aggregationSource && "minSamples" in aggregationSource
          ? aggregationSource.minSamples
          : aggregationSource && "min_samples" in aggregationSource
            ? aggregationSource.min_samples
            : undefined,
        `${prefix}.aggregation.min_samples`,
        DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.aggregation.minSamples,
      ),
    },
    difficultyLearning: {
      cacheTtlMs: readRequiredPositiveNumber(
        difficultyLearningSource && "cacheTtlMs" in difficultyLearningSource
          ? difficultyLearningSource.cacheTtlMs
          : difficultyLearningSource && "cache_ttl_ms" in difficultyLearningSource
            ? difficultyLearningSource.cache_ttl_ms
            : undefined,
        `${prefix}.difficulty_learning.cache_ttl_ms`,
        DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.difficultyLearning.cacheTtlMs,
      ),
      invalidation: {
        maxContextTokensDelta: readRequiredPositiveNumber(
          invalidationSource && "maxContextTokensDelta" in invalidationSource
            ? invalidationSource.maxContextTokensDelta
            : invalidationSource && "max_context_tokens_delta" in invalidationSource
              ? invalidationSource.max_context_tokens_delta
              : undefined,
          `${prefix}.difficulty_learning.invalidation.max_context_tokens_delta`,
          DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.difficultyLearning.invalidation.maxContextTokensDelta,
        ),
        maxHistoryTurnDelta: readRequiredPositiveNumber(
          invalidationSource && "maxHistoryTurnDelta" in invalidationSource
            ? invalidationSource.maxHistoryTurnDelta
            : invalidationSource && "max_history_turn_delta" in invalidationSource
              ? invalidationSource.max_history_turn_delta
              : undefined,
          `${prefix}.difficulty_learning.invalidation.max_history_turn_delta`,
          DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.difficultyLearning.invalidation.maxHistoryTurnDelta,
        ),
        maxToolCountDelta: readRequiredPositiveNumber(
          invalidationSource && "maxToolCountDelta" in invalidationSource
            ? invalidationSource.maxToolCountDelta
            : invalidationSource && "max_tool_count_delta" in invalidationSource
              ? invalidationSource.max_tool_count_delta
              : undefined,
          `${prefix}.difficulty_learning.invalidation.max_tool_count_delta`,
          DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.difficultyLearning.invalidation.maxToolCountDelta,
        ),
        maxInstructionConstraintDelta: readRequiredPositiveNumber(
          invalidationSource && "maxInstructionConstraintDelta" in invalidationSource
            ? invalidationSource.maxInstructionConstraintDelta
            : invalidationSource && "max_instruction_constraint_delta" in invalidationSource
              ? invalidationSource.max_instruction_constraint_delta
              : undefined,
          `${prefix}.difficulty_learning.invalidation.max_instruction_constraint_delta`,
          DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.difficultyLearning.invalidation.maxInstructionConstraintDelta,
        ),
        maxDecompositionKeywordDelta: readRequiredPositiveNumber(
          invalidationSource && "maxDecompositionKeywordDelta" in invalidationSource
            ? invalidationSource.maxDecompositionKeywordDelta
            : invalidationSource && "max_decomposition_keyword_delta" in invalidationSource
              ? invalidationSource.max_decomposition_keyword_delta
              : undefined,
          `${prefix}.difficulty_learning.invalidation.max_decomposition_keyword_delta`,
          DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.difficultyLearning.invalidation.maxDecompositionKeywordDelta,
        ),
        reclassifyOnCodeOrSchemaChange:
          readBoolean(
            invalidationSource && "reclassifyOnCodeOrSchemaChange" in invalidationSource
              ? invalidationSource.reclassifyOnCodeOrSchemaChange
              : invalidationSource && "reclassify_on_code_or_schema_change" in invalidationSource
                ? invalidationSource.reclassify_on_code_or_schema_change
                : undefined,
          ) ??
          DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.difficultyLearning.invalidation.reclassifyOnCodeOrSchemaChange,
      },
      override: {
        minSamples: readRequiredPositiveNumber(
          overrideSource && "minSamples" in overrideSource
            ? overrideSource.minSamples
            : overrideSource && "min_samples" in overrideSource
              ? overrideSource.min_samples
              : undefined,
          `${prefix}.difficulty_learning.override.min_samples`,
          DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.difficultyLearning.override.minSamples,
        ),
        maxFailureRate: readPenaltyFactor(
          overrideSource && "maxFailureRate" in overrideSource
            ? overrideSource.maxFailureRate
            : overrideSource && "max_failure_rate" in overrideSource
              ? overrideSource.max_failure_rate
              : undefined,
          `${prefix}.difficulty_learning.override.max_failure_rate`,
          DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.difficultyLearning.override.maxFailureRate,
        ),
        minQualityScore: readPenaltyFactor(
          overrideSource && "minQualityScore" in overrideSource
            ? overrideSource.minQualityScore
            : overrideSource && "min_quality_score" in overrideSource
              ? overrideSource.min_quality_score
              : undefined,
          `${prefix}.difficulty_learning.override.min_quality_score`,
          DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.difficultyLearning.override.minQualityScore,
        ),
        minTokensPerSec: readRequiredPositiveNumber(
          overrideSource && "minTokensPerSec" in overrideSource
            ? overrideSource.minTokensPerSec
            : overrideSource && "min_tokens_per_sec" in overrideSource
              ? overrideSource.min_tokens_per_sec
              : undefined,
          `${prefix}.difficulty_learning.override.min_tokens_per_sec`,
          DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.difficultyLearning.override.minTokensPerSec,
        ),
      },
      recommendation: {
        minSamples: readRequiredPositiveNumber(
          recommendationSource && "minSamples" in recommendationSource
            ? recommendationSource.minSamples
            : recommendationSource && "min_samples" in recommendationSource
              ? recommendationSource.min_samples
              : undefined,
          `${prefix}.difficulty_learning.recommendation.min_samples`,
          DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.difficultyLearning.recommendation.minSamples,
        ),
        maxFailureRate: readPenaltyFactor(
          recommendationSource && "maxFailureRate" in recommendationSource
            ? recommendationSource.maxFailureRate
            : recommendationSource && "max_failure_rate" in recommendationSource
              ? recommendationSource.max_failure_rate
              : undefined,
          `${prefix}.difficulty_learning.recommendation.max_failure_rate`,
          DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.difficultyLearning.recommendation.maxFailureRate,
        ),
        minQualityScore: readPenaltyFactor(
          recommendationSource && "minQualityScore" in recommendationSource
            ? recommendationSource.minQualityScore
            : recommendationSource && "min_quality_score" in recommendationSource
              ? recommendationSource.min_quality_score
              : undefined,
          `${prefix}.difficulty_learning.recommendation.min_quality_score`,
          DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.difficultyLearning.recommendation.minQualityScore,
        ),
        minTokensPerSec: readRequiredPositiveNumber(
          recommendationSource && "minTokensPerSec" in recommendationSource
            ? recommendationSource.minTokensPerSec
            : recommendationSource && "min_tokens_per_sec" in recommendationSource
              ? recommendationSource.min_tokens_per_sec
              : undefined,
          `${prefix}.difficulty_learning.recommendation.min_tokens_per_sec`,
          DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.difficultyLearning.recommendation.minTokensPerSec,
        ),
      },
    },
    metricHalflives: {
      qualityMs: readRequiredPositiveNumber(
        metricHalflivesSource && "qualityMs" in metricHalflivesSource
          ? metricHalflivesSource.qualityMs
          : metricHalflivesSource && "quality_ms" in metricHalflivesSource
            ? metricHalflivesSource.quality_ms
            : undefined,
        `${prefix}.metric_halflives.quality_ms`,
        DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.metricHalflives.qualityMs,
      ),
      latencyMs: readRequiredPositiveNumber(
        metricHalflivesSource && "latencyMs" in metricHalflivesSource
          ? metricHalflivesSource.latencyMs
          : metricHalflivesSource && "latency_ms" in metricHalflivesSource
            ? metricHalflivesSource.latency_ms
            : undefined,
        `${prefix}.metric_halflives.latency_ms`,
        DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.metricHalflives.latencyMs,
      ),
      throughputMs: readRequiredPositiveNumber(
        metricHalflivesSource && "throughputMs" in metricHalflivesSource
          ? metricHalflivesSource.throughputMs
          : metricHalflivesSource && "throughput_ms" in metricHalflivesSource
            ? metricHalflivesSource.throughput_ms
            : undefined,
        `${prefix}.metric_halflives.throughput_ms`,
        DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.metricHalflives.throughputMs,
      ),
      reliabilityMs: readRequiredPositiveNumber(
        metricHalflivesSource && "reliabilityMs" in metricHalflivesSource
          ? metricHalflivesSource.reliabilityMs
          : metricHalflivesSource && "reliability_ms" in metricHalflivesSource
            ? metricHalflivesSource.reliability_ms
            : undefined,
        `${prefix}.metric_halflives.reliability_ms`,
        DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.metricHalflives.reliabilityMs,
      ),
      costMs: readRequiredPositiveNumber(
        metricHalflivesSource && "costMs" in metricHalflivesSource
          ? metricHalflivesSource.costMs
          : metricHalflivesSource && "cost_ms" in metricHalflivesSource
            ? metricHalflivesSource.cost_ms
            : undefined,
        `${prefix}.metric_halflives.cost_ms`,
        DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.metricHalflives.costMs,
      ),
    },
    throughputSla: {
      enabled:
        readBoolean(throughputSlaSource && "enabled" in throughputSlaSource ? throughputSlaSource.enabled : undefined) ??
        DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.throughputSla.enabled,
      minTokensPerSec: readRequiredPositiveNumber(
        throughputSlaSource && "minTokensPerSec" in throughputSlaSource
          ? throughputSlaSource.minTokensPerSec
          : throughputSlaSource && "min_tokens_per_sec" in throughputSlaSource
            ? throughputSlaSource.min_tokens_per_sec
            : undefined,
        `${prefix}.throughput_sla.min_tokens_per_sec`,
        DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.throughputSla.minTokensPerSec,
      ),
      penaltyTimeoutMs: readRequiredPositiveNumber(
        throughputSlaSource && "penaltyTimeoutMs" in throughputSlaSource
          ? throughputSlaSource.penaltyTimeoutMs
          : throughputSlaSource && "penalty_timeout_ms" in throughputSlaSource
            ? throughputSlaSource.penalty_timeout_ms
            : undefined,
        `${prefix}.throughput_sla.penalty_timeout_ms`,
        DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.throughputSla.penaltyTimeoutMs,
      ),
      penaltyFactor: readPenaltyFactor(
        throughputSlaSource && "penaltyFactor" in throughputSlaSource
          ? throughputSlaSource.penaltyFactor
          : throughputSlaSource && "penalty_factor" in throughputSlaSource
            ? throughputSlaSource.penalty_factor
            : undefined,
        `${prefix}.throughput_sla.penalty_factor`,
        DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG.throughputSla.penaltyFactor,
      ),
    },
  };
}

function parseLlamaSwapModels(rawConfig: RawUnifiedRuntimeConfig): UnifiedRuntimeConfig["llamaSwap"] {
  const models = rawConfig.llama_swap?.models ?? {};
  const normalizedModels = Object.entries(models).map(([modelId, config]) => {
    ensureObject(config, `llama_swap.models.${modelId} must be an object.`);
    if (typeof config.path !== "string" || config.path.trim().length === 0) {
      throw new Error(`llama_swap.models.${modelId}.path is required.`);
    }
    return {
      modelId,
      path: config.path,
      contextWindow: typeof config.context_window === "number" ? config.context_window : null,
      command: typeof config.command === "string" && config.command.trim().length > 0 ? config.command : null,
      proxyBaseUrl: typeof config.proxy === "string" && config.proxy.trim().length > 0 ? config.proxy : null,
      checkEndpoint:
        typeof config.check_endpoint === "string" && config.check_endpoint.trim().length > 0
          ? config.check_endpoint
          : null,
      useModelName:
        typeof config.use_model_name === "string" && config.use_model_name.trim().length > 0
          ? config.use_model_name
          : null,
      maxDifficulty: readDifficultyBucket(
        config.max_difficulty,
        `llama_swap.models.${modelId}.max_difficulty`,
      ),
    };
  });

  return {
    enabled: normalizedModels.length > 0,
    models: normalizedModels,
    process: parseProcessConfig(rawConfig.llama_swap),
  };
}

function parseLiteLLMProviders(rawConfig: RawUnifiedRuntimeConfig): UnifiedRuntimeConfig["liteLLM"] {
  const providers = rawConfig.litellm_proxy?.providers ?? {};
  const normalizedProviders = Object.entries(providers).map(([providerId, config]) => {
    ensureObject(config, `litellm_proxy.providers.${providerId} must be an object.`);
    const modelList = Array.isArray(config.model_list) ? config.model_list : [];
    const modelMappings: UnifiedRuntimeConfigProviderMapping[] = [];

    for (const entry of modelList) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const modelId = "model_name" in entry && typeof entry.model_name === "string" ? entry.model_name : null;
      const rawLiteLLMParams =
        "litellm_params" in entry &&
        entry.litellm_params &&
        typeof entry.litellm_params === "object"
          ? entry.litellm_params
          : {};
      const normalizedLiteLLMParams = normalizeJSONValue(rawLiteLLMParams);
      const litellmParams = isUnifiedRuntimeJSONObject(normalizedLiteLLMParams)
        ? normalizedLiteLLMParams
        : {};
      const rawLitellmModel = litellmParams["model"];
      const litellmModel = typeof rawLitellmModel === "string" ? rawLitellmModel : modelId;
      if (!modelId || !litellmModel) {
        continue;
      }
      modelMappings.push({
        modelId,
        litellmModel,
        litellmParams: {
          ...litellmParams,
          model: litellmModel,
        },
        maxDifficulty: readDifficultyBucket(
          "max_difficulty" in entry ? entry.max_difficulty : undefined,
          `litellm_proxy.providers.${providerId}.model_list.${modelId}.max_difficulty`,
        ),
      });
    }

    return {
      providerId,
      apiKeyRef: typeof config.api_key === "string" ? config.api_key : null,
      modelNames: modelList
        .map((entry) => (entry && typeof entry === "object" && "model_name" in entry ? entry.model_name : undefined))
        .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0),
      modelMappings,
    };
  });

  return {
    enabled: normalizedProviders.length > 0,
    providers: normalizedProviders,
    process: parseProcessConfig(rawConfig.litellm_proxy),
  };
}

export function deriveUnifiedRuntimeExecutionMode(config: {
  readonly llamaSwapEnabled: boolean;
  readonly liteLLMEnabled: boolean;
}): UnifiedRuntimeExecutionMode {
  if (config.llamaSwapEnabled && config.liteLLMEnabled) {
    return "hybrid";
  }
  if (config.llamaSwapEnabled) {
    return "local_only";
  }
  if (config.liteLLMEnabled) {
    return "remote_only";
  }
  return "decision_only";
}

export function parseUnifiedRuntimeConfigText(text: string): UnifiedRuntimeConfig {
  const rawDocument = parse(text) as unknown;
  ensureObject(rawDocument, "Unified runtime config root must be an object.");
  const rawConfig = rawDocument as RawUnifiedRuntimeConfig;

  const llamaSwap = parseLlamaSwapModels(rawConfig);
  const liteLLM = parseLiteLLMProviders(rawConfig);

  return {
    version:
      typeof rawConfig.version === "string" && rawConfig.version.trim().length > 0
        ? rawConfig.version
        : "1.0",
    routingStrategy:
      typeof rawConfig.routing?.strategy === "string" && rawConfig.routing.strategy.trim().length > 0
        ? rawConfig.routing.strategy
        : null,
    executionMode: deriveUnifiedRuntimeExecutionMode({
      llamaSwapEnabled: llamaSwap.enabled,
      liteLLMEnabled: liteLLM.enabled,
    }),
    ...(rawConfig.controller ? { controller: normalizeControllerInput(rawConfig.controller, "controller") } : {}),
    ...(rawConfig.difficulty_classifier
      ? { difficultyClassifier: normalizeDifficultyClassifierInput(rawConfig.difficulty_classifier, "difficulty_classifier") }
      : {}),
    ...(rawConfig.model_aliases ? { modelAliases: normalizeModelAliasesInput(rawConfig.model_aliases, "model_aliases") } : {}),
    ...(rawConfig.observed_data ? { observedData: normalizeObservedDataInput(rawConfig.observed_data, "observed_data") } : {}),
    llamaSwap,
    liteLLM,
  };
}

export function normalizeUnifiedRuntimeConfigInput(input: unknown): UnifiedRuntimeConfig {
  ensureObject(input, "Unified runtime config input must be an object.");
  const routingStrategyInput =
    "routing" in input &&
    input.routing &&
    typeof input.routing === "object" &&
    !Array.isArray(input.routing) &&
    "strategy" in input.routing
      ? input.routing.strategy
      : undefined;
  const llamaSwap = normalizeLlamaSwapInput(
    "llamaSwap" in input ? input.llamaSwap : "llama_swap" in input ? input.llama_swap : undefined,
  );
  const liteLLM = normalizeLiteLLMInput(
    "liteLLM" in input ? input.liteLLM : "litellm_proxy" in input ? input.litellm_proxy : undefined,
  );
  const observedDataSource =
    "observedData" in input ? input.observedData : "observed_data" in input ? input.observed_data : undefined;
  const controllerSource =
    "controller" in input ? input.controller : undefined;
  const difficultyClassifierSource =
    "difficultyClassifier" in input
      ? input.difficultyClassifier
      : "difficulty_classifier" in input
        ? input.difficulty_classifier
        : undefined;
  const modelAliasesSource =
    "modelAliases" in input ? input.modelAliases : "model_aliases" in input ? input.model_aliases : undefined;

  return {
    version: readNonEmptyString(input.version) ?? "1.0",
    routingStrategy:
      readNonEmptyString(
        "routingStrategy" in input
          ? input.routingStrategy
          : routingStrategyInput,
      ) ?? null,
    executionMode: deriveUnifiedRuntimeExecutionMode({
      llamaSwapEnabled: llamaSwap.enabled,
      liteLLMEnabled: liteLLM.enabled,
    }),
    ...(controllerSource !== undefined
      ? {
          controller: normalizeControllerInput(controllerSource, "controller"),
        }
      : {}),
    ...(difficultyClassifierSource !== undefined
      ? {
          difficultyClassifier: normalizeDifficultyClassifierInput(
            difficultyClassifierSource,
            "difficultyClassifier",
          ),
        }
      : {}),
    ...(modelAliasesSource !== undefined
      ? {
          modelAliases: normalizeModelAliasesInput(modelAliasesSource),
        }
      : {}),
    ...(observedDataSource !== undefined
      ? {
          observedData: normalizeObservedDataInput(observedDataSource, "observedData"),
        }
      : {}),
    llamaSwap,
    liteLLM,
  };
}

function hasProcessConfig(config: UnifiedRuntimeProcessConfig): boolean {
  return (
    config.command !== null ||
    config.args.length > 0 ||
    Object.keys(config.env).length > 0 ||
    config.cwd !== null ||
    config.startupTimeoutMs !== null
  );
}

function renderProcessConfig(config: UnifiedRuntimeProcessConfig): Record<string, unknown> {
  const rendered: Record<string, unknown> = {};
  if (config.command !== null) {
    rendered.command = config.command;
  }
  if (config.args.length > 0) {
    rendered.args = [...config.args];
  }
  if (Object.keys(config.env).length > 0) {
    rendered.env = { ...config.env };
  }
  if (config.cwd !== null) {
    rendered.cwd = config.cwd;
  }
  if (config.startupTimeoutMs !== null) {
    rendered.startup_timeout_ms = config.startupTimeoutMs;
  }
  return rendered;
}

export function renderUnifiedRuntimeConfigText(config: UnifiedRuntimeConfig): string {
  const document: Record<string, unknown> = {
    version: config.version,
  };

  if (config.routingStrategy !== null) {
    document.routing = {
      strategy: config.routingStrategy,
    };
  }

  if (config.observedData) {
    document.observed_data = {
      enabled: config.observedData.enabled,
      aggregation: {
        min_samples: config.observedData.aggregation.minSamples,
      },
      difficulty_learning: {
        cache_ttl_ms: config.observedData.difficultyLearning.cacheTtlMs,
        invalidation: {
          max_context_tokens_delta: config.observedData.difficultyLearning.invalidation.maxContextTokensDelta,
          max_history_turn_delta: config.observedData.difficultyLearning.invalidation.maxHistoryTurnDelta,
          max_tool_count_delta: config.observedData.difficultyLearning.invalidation.maxToolCountDelta,
          max_instruction_constraint_delta:
            config.observedData.difficultyLearning.invalidation.maxInstructionConstraintDelta,
          max_decomposition_keyword_delta:
            config.observedData.difficultyLearning.invalidation.maxDecompositionKeywordDelta,
          reclassify_on_code_or_schema_change:
            config.observedData.difficultyLearning.invalidation.reclassifyOnCodeOrSchemaChange,
        },
        override: {
          min_samples: config.observedData.difficultyLearning.override.minSamples,
          max_failure_rate: config.observedData.difficultyLearning.override.maxFailureRate,
          min_quality_score: config.observedData.difficultyLearning.override.minQualityScore,
          min_tokens_per_sec: config.observedData.difficultyLearning.override.minTokensPerSec,
        },
        recommendation: {
          min_samples: config.observedData.difficultyLearning.recommendation.minSamples,
          max_failure_rate: config.observedData.difficultyLearning.recommendation.maxFailureRate,
          min_quality_score: config.observedData.difficultyLearning.recommendation.minQualityScore,
          min_tokens_per_sec: config.observedData.difficultyLearning.recommendation.minTokensPerSec,
        },
      },
      metric_halflives: {
        quality_ms: config.observedData.metricHalflives.qualityMs,
        latency_ms: config.observedData.metricHalflives.latencyMs,
        throughput_ms: config.observedData.metricHalflives.throughputMs,
        reliability_ms: config.observedData.metricHalflives.reliabilityMs,
        cost_ms: config.observedData.metricHalflives.costMs,
      },
      throughput_sla: {
        enabled: config.observedData.throughputSla.enabled,
        min_tokens_per_sec: config.observedData.throughputSla.minTokensPerSec,
        penalty_timeout_ms: config.observedData.throughputSla.penaltyTimeoutMs,
        penalty_factor: config.observedData.throughputSla.penaltyFactor,
      },
    };
  }

  if (config.difficultyClassifier) {
    document.difficulty_classifier = {
      enabled: config.difficultyClassifier.enabled,
      rubric_version: config.difficultyClassifier.rubricVersion,
      source_type: config.difficultyClassifier.sourceType,
      ...(config.difficultyClassifier.endpointId !== null ? { endpoint_id: config.difficultyClassifier.endpointId } : {}),
      ...(config.difficultyClassifier.modelId !== null ? { model_id: config.difficultyClassifier.modelId } : {}),
      timeout_ms: config.difficultyClassifier.timeoutMs,
      fallback_difficulty: config.difficultyClassifier.fallbackDifficulty,
    };
  }

  if (config.controller) {
    document.controller = {
      enabled: config.controller.enabled,
      source_type: config.controller.sourceType,
      ...(config.controller.endpointId !== null ? { endpoint_id: config.controller.endpointId } : {}),
      ...(config.controller.modelId !== null ? { model_id: config.controller.modelId } : {}),
      timeout_ms: config.controller.timeoutMs,
    };
  }

  if (config.modelAliases && config.modelAliases.length > 0) {
    document.model_aliases = Object.fromEntries(
      config.modelAliases.map((alias) => [
        alias.aliasId,
        {
          ...(alias.mode !== null ? { mode: alias.mode } : {}),
          model_ids: [...alias.modelIds],
        },
      ]),
    );
  }

  const llamaSwapSection: Record<string, unknown> = renderProcessConfig(config.llamaSwap.process);
  if (config.llamaSwap.models.length > 0) {
    llamaSwapSection.models = Object.fromEntries(
      config.llamaSwap.models.map((model) => [
        model.modelId,
        {
          path: model.path,
          ...(model.contextWindow !== null ? { context_window: model.contextWindow } : {}),
          ...(model.command !== null ? { command: model.command } : {}),
          ...(model.proxyBaseUrl !== null ? { proxy: model.proxyBaseUrl } : {}),
          ...(model.checkEndpoint !== null ? { check_endpoint: model.checkEndpoint } : {}),
          ...(model.useModelName !== null ? { use_model_name: model.useModelName } : {}),
          ...(model.maxDifficulty !== null ? { max_difficulty: model.maxDifficulty } : {}),
        },
      ]),
    );
  }
  if (config.llamaSwap.models.length > 0 || hasProcessConfig(config.llamaSwap.process)) {
    document.llama_swap = llamaSwapSection;
  }

  const liteLLMSection: Record<string, unknown> = renderProcessConfig(config.liteLLM.process);
  if (config.liteLLM.providers.length > 0) {
    liteLLMSection.providers = Object.fromEntries(
      config.liteLLM.providers.map((provider) => [
        provider.providerId,
        {
          ...(provider.apiKeyRef !== null ? { api_key: provider.apiKeyRef } : {}),
          model_list:
            provider.modelMappings.length > 0
              ? provider.modelMappings.map((mapping) => ({
                  model_name: mapping.modelId,
                  ...(mapping.maxDifficulty !== null ? { max_difficulty: mapping.maxDifficulty } : {}),
                  litellm_params: {
                    ...mapping.litellmParams,
                    model: mapping.litellmModel,
                  },
                }))
              : provider.modelNames.map((modelName) => ({
                  model_name: modelName,
                  litellm_params: {
                    model: modelName,
                  },
                })),
        },
      ]),
    );
  }
  if (config.liteLLM.providers.length > 0 || hasProcessConfig(config.liteLLM.process)) {
    document.litellm_proxy = liteLLMSection;
  }

  return `${stringify(document).trimEnd()}\n`;
}
