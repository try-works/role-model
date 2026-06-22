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
  modalities?: Record<string, unknown>;
  capabilities?: Record<string, unknown>;
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
}

export interface PiExtensionAPI {
  registerProvider(name: string, config: PiProviderConfig): void;
  registerCommand(name: string, config: { description: string; handler: PiCommandHandler }): void;
}

export interface PiCommandContext {
  ui?: {
    notify?: (message: string, level?: "info" | "error") => void;
  };
}

export type PiCommandHandler = (args?: string, context?: PiCommandContext) => Promise<void>;

export interface DiscoveryResult {
  discovery: DownstreamOpenAIDiscovery;
  version?: Record<string, unknown>;
}

export interface RoleModelCommandResult {
  ok: boolean;
  text: string;
}
