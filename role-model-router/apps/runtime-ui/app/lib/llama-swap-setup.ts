import type { RuntimeConfig, RuntimeConfigRecord } from "./runtime-api";

export const LLAMA_SWAP_SCAFFOLD_MODEL_ID = "your-model-id";

const SCAFFOLD_GGUF_PATH = "C:\\Users\\You\\models\\your-model.gguf";

export const LLAMA_SWAP_SCAFFOLD_YAML = `llama_swap:
  models:
    ${LLAMA_SWAP_SCAFFOLD_MODEL_ID}:
      path: "${SCAFFOLD_GGUF_PATH.replace(/\\/g, "\\\\")}"
      # context_window: 8192
      # command: null
      # proxy: http://127.0.0.1:8081
      # check_endpoint: /health
`;

export function createLlamaSwapScaffoldModel() {
  return {
    modelId: LLAMA_SWAP_SCAFFOLD_MODEL_ID,
    path: SCAFFOLD_GGUF_PATH,
    contextWindow: null,
    command: null,
    proxyBaseUrl: null,
    checkEndpoint: null,
    useModelName: null,
  } as const;
}

export function createLlamaSwapScaffoldJsonSnippet() {
  return {
    models: [createLlamaSwapScaffoldModel()],
    process: {
      command: null,
      args: [],
      env: {},
      cwd: null,
      startupTimeoutMs: null,
    },
  };
}

export function applyLlamaSwapScaffold(config: RuntimeConfig): RuntimeConfig {
  if (config.llamaSwap.models.length > 0) {
    return config;
  }
  return {
    ...config,
    llamaSwap: {
      ...config.llamaSwap,
      models: [createLlamaSwapScaffoldModel()],
    },
  };
}

export type LlamaSwapConfigStatusVariant = "not_configured" | "needs_paths" | "operational";

export interface LlamaSwapConfigStatus {
  readonly operational: boolean;
  readonly variant: LlamaSwapConfigStatusVariant;
  readonly declaredModelIds: readonly string[];
  readonly executionMode: RuntimeConfig["executionMode"] | undefined;
  readonly configPath: string | null;
}

export function readLlamaSwapConfigStatus(
  record: RuntimeConfigRecord | null,
): LlamaSwapConfigStatus {
  const config = record?.config;
  const models = config?.llamaSwap?.models ?? [];
  const declaredModelIds = models.map((model) => model.modelId);

  if (models.length === 0) {
    return {
      operational: false,
      variant: "not_configured",
      declaredModelIds: [],
      executionMode: config?.executionMode,
      configPath: record?.path ?? null,
    };
  }

  const hasValidPath = models.some(
    (model) => typeof model.path === "string" && model.path.trim().length > 0,
  );
  if (hasValidPath) {
    return {
      operational: true,
      variant: "operational",
      declaredModelIds,
      executionMode: config?.executionMode,
      configPath: record?.path ?? null,
    };
  }

  return {
    operational: false,
    variant: "needs_paths",
    declaredModelIds,
    executionMode: config?.executionMode,
    configPath: record?.path ?? null,
  };
}

export function llamaSwapHintHeadline(status: LlamaSwapConfigStatus): string {
  if (status.variant === "needs_paths") {
    return "Llama-swap needs valid model paths before role-model can load GGUF weights.";
  }
  return "Llama-swap is not configured in runtime config yet.";
}

export function llamaSwapHintDetail(): string {
  return "Peer-backed local uses your external OpenAI-compatible server; role-model-managed llama-swap runs the swap process and loads declared GGUF models for you.";
}
