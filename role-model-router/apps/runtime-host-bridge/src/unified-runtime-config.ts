import { parse } from "yaml";

export type UnifiedRuntimeExecutionMode =
  | "decision_only"
  | "hybrid"
  | "local_only"
  | "remote_only";

export interface UnifiedRuntimeConfigModel {
  readonly modelId: string;
  readonly path: string;
  readonly contextWindow: number | null;
  readonly command: string | null;
  readonly proxyBaseUrl: string | null;
  readonly checkEndpoint: string | null;
  readonly useModelName: string | null;
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

export interface UnifiedRuntimeConfig {
  readonly version: string;
  readonly routingStrategy: string | null;
  readonly executionMode: UnifiedRuntimeExecutionMode;
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
}

interface RawLiteLLMProvider {
  readonly api_key?: string;
  readonly model_list?: ReadonlyArray<{
    readonly model_name?: string;
    readonly litellm_params?: Readonly<Record<string, unknown>>;
  }>;
}

interface RawUnifiedRuntimeConfig {
  readonly version?: string;
  readonly routing?: {
    readonly strategy?: string;
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
    llamaSwap,
    liteLLM,
  };
}
