export interface DownstreamOpenAIModelRecord {
  id: string;
  object: "model";
  owned_by: "role-model";
  endpoint_ids?: string[];
  type: "model" | "alias";
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
        reasoning?: { supported?: boolean; effortControl?: boolean } | boolean;
        structuredOutput?: { supported?: boolean } | boolean;
        caching?: unknown;
      } & Record<string, unknown>);
  declared?: { modelIds?: string[]; endpointIds?: string[] };
  routable?: { modelIds?: string[]; endpointIds?: string[] };
  piMapping: {
    contextWindow: number | null;
    maxTokens: number | null;
  };
  sources?: string[];
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

export interface PiProviderModelConfig {
  id: string;
  name?: string;
  input: ("text" | "image")[];
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
  contextWindow?: number;
  maxTokens?: number;
  reasoning?: boolean;
  provider?: string;
  api?: "openai-completions";
  compat?: {
    supportsDeveloperRole?: boolean;
  };
}

export interface PiProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  api: "openai-completions";
  models: PiProviderModelConfig[];
}

export interface ProviderRegistration {
  providerId: "role-model";
  config: PiProviderConfig;
  recommendedModel: string | null;
  modelDiagnostics: RoleModelModelDiagnostic[];
}

export interface PiExtensionAPI {
  registerProvider(name: string, config: PiProviderConfig): void;
  registerCommand(name: string, config: { description: string; handler: PiCommandHandler }): void;
  on?: (
    event: "before_provider_request",
    handler: (event: { type: "before_provider_request"; payload: unknown }) =>
      | unknown
      | Promise<unknown>,
  ) => void;
  setModel?: (model: PiModelSelection) => Promise<boolean>;
}

export interface PiCommandContext {
  ui?: {
    notify?: (message: string, level?: "info" | "error") => void;
  };
  isProjectTrusted?: () => boolean;
  getModel?: () => PiModelSelection | undefined;
}

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
  api: "openai-completions";
}
