import type {
  ExtensionCommandContext as UpstreamPiCommandContext,
  ExtensionAPI as UpstreamPiExtensionAPI,
  ExtensionContext as UpstreamPiExtensionContext,
  ProviderConfig as UpstreamPiProviderConfig,
  ProviderModelConfig as UpstreamPiProviderModelConfig,
} from "@earendil-works/pi-coding-agent";

export interface DownstreamOpenAIModelRecord {
  id: string;
  object: "model";
  owned_by: "role-model";
  endpoint_ids?: string[];
  type: "model" | "alias" | "endpoint";
  displayName?: string;
  upstreamModelId?: string;
  upstream_model_id?: string;
  reasoningEffort?: string | null;
  reasoning_effort?: string | null;
  fixedEffort?: string | null;
  fixed_effort?: string | null;
  effortSource?: string | null;
  effort_source?: string | null;
  reasoningEffortLevels?: string[];
  reasoning_effort_levels?: string[];
  endpoint_id?: string;
  routingMode?: "basic" | "difficulty" | "intelligent" | "hybrid";
  targetModelIds?: string[];
  canonicalModelIds?: string[];
  providerIds?: string[];
  limits?: {
    safeContextWindow?: number | null;
    safeMaxOutputTokens?: number | null;
    maxContextWindow?: number | null;
    maxOutputTokens?: number | null;
  };
  modalities?: {
    guaranteedInput?: string[];
    availableInput?: string[];
    conditionalInput?: unknown;
    output?: string[];
  } & Record<string, unknown>;
  capabilities?:
    | boolean
    | ({
        guaranteed?: string[];
        available?: string[];
        conditional?: unknown;
        tools?: { functionCalling?: boolean } | boolean;
        reasoning?:
          | {
              supported?: boolean;
              effortControl?: boolean;
              effortLevels?: string[];
              effort_levels?: string[];
            }
          | boolean;
        structuredOutput?: { supported?: boolean } | boolean;
        caching?: unknown;
      } & Record<string, unknown>);
  declared?: { modelIds?: string[]; endpointIds?: string[] };
  routable?: { modelIds?: string[]; endpointIds?: string[] };
  piMapping: {
    contextWindow: number | null;
    maxTokens: number | null;
    compat?: {
      supportsDeveloperRole?: boolean;
      sendSessionAffinityHeaders?: boolean;
      supportsLongCacheRetention?: boolean;
    };
  };
  sources?: string[];
  pricing?: {
    inputPer1M?: number;
    outputPer1M?: number;
    cacheReadPer1M?: number;
    cacheWritePer1M?: number;
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
  } | null;
}

export interface DownstreamOpenAIDiscovery {
  contractVersion: "role-model.downstream.openai.v1";
  kind: "openai-compatible";
  providerId: "role-model-runtime";
  displayName: string;
  baseUrl: string;
  endpoints: {
    health: string;
    models: string;
    chatCompletions: string;
    responses: string;
  };
  authentication: {
    type: "bearer";
    headerName: "Authorization";
    required: boolean;
    placeholderToken: string;
    note: string;
  };
  models: [DownstreamOpenAIModelRecord, ...DownstreamOpenAIModelRecord[]];
  setup: {
    recommendedModel: string | null;
    notes: string[];
  };
  freshness: Record<string, unknown>;
}

export interface PiProviderModelConfig extends UpstreamPiProviderModelConfig {
  id: string;
  name: string;
  /** Runtime-owned configured endpoint identity; never inferred from a Pi thinking level. */
  endpointId: string;
  /** `default` for an unpinned endpoint, otherwise the endpoint's normalized fixed effort. */
  variantEffort: string;
  input: ("text" | "image")[];
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
  contextWindow: number;
  maxTokens: number;
  reasoning: boolean;
  thinkingLevelMap?: PiThinkingLevelMap;
  upstreamModelId?: string;
  reasoningEffort?: string | null;
  provider?: string;
  api?: "openai-completions";
  compat?: {
    supportsDeveloperRole?: boolean;
    sendSessionAffinityHeaders?: boolean;
    supportsLongCacheRetention?: boolean;
  };
}

export interface PiProviderConfig
  extends Omit<UpstreamPiProviderConfig, "models" | "refreshModels"> {
  name: string;
  baseUrl: string;
  apiKey: string;
  api: "openai-completions";
  models: PiProviderModelConfig[];
  refreshModels?: (context: PiRefreshModelsContext) => Promise<PiProviderModelConfig[]>;
}

export type PiThinkingLevel = ReturnType<UpstreamPiExtensionAPI["getThinkingLevel"]>;
export type PiThinkingLevelMap = NonNullable<UpstreamPiProviderModelConfig["thinkingLevelMap"]>;
export type PiRefreshModelsContext = Parameters<
  NonNullable<UpstreamPiProviderConfig["refreshModels"]>
>[0];

export interface ProviderRegistration {
  providerId: "role-model";
  config: PiProviderConfig;
  recommendedModel: string | null;
  modelDiagnostics: RoleModelModelDiagnostic[];
}

export interface PiModelRef {
  id: string;
  provider: string;
}

export type PiExtensionMode = "tui" | "rpc" | "json" | "print";

export type PiExtensionContext = UpstreamPiExtensionContext;
export type PiExtensionAPI = UpstreamPiExtensionAPI;
export type PiCommandContext = Partial<
  Pick<UpstreamPiCommandContext, "mode" | "model" | "isProjectTrusted">
> & {
  ui?: Pick<UpstreamPiCommandContext["ui"], "notify">;
  getModel?: () => PiModelRef | undefined;
};

export type PiCommandHandler = (args?: string, context?: PiCommandContext) => Promise<void>;

export interface DiscoveryResult {
  discovery: DownstreamOpenAIDiscovery;
  version?: Record<string, unknown>;
  health?: Record<string, unknown>;
  state?: "ready" | "fallback";
  warnings?: string[];
  providerRegistered?: boolean;
  modelDiagnostics?: RoleModelModelDiagnostic[];
}

export interface RoleModelCommandResult {
  ok: boolean;
  text: string;
}

export interface RoleModelModelDiagnostic {
  id: string;
  degraded: boolean;
  reasons: string[];
}

export interface PiModelSelection extends PiProviderModelConfig {
  provider: "role-model";
  baseUrl: string;
  api: "openai-completions";
}
