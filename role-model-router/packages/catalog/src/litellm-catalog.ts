import { readFile } from "node:fs/promises";
import path from "node:path";

export interface LiteLLMProviderOAuth {
  readonly apiBase?: string;
  readonly oauthHost: string;
  readonly clientId: string;
  readonly deviceAuthorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly requiredHeaders: readonly string[];
  readonly scope?: string;
}

export interface LiteLLMProviderInfo {
  readonly providerId: string;
  readonly displayName: string;
  readonly providerKind: string;
  readonly authFamily: string;
  readonly adapterFamily: string;
  readonly apiBase: string;
  readonly envVars: readonly string[];
  readonly supportedAuthModes: readonly string[];
  readonly controlPlaneRequirements: readonly string[];
  readonly localOverrideApplied: boolean;
  readonly upstreamProvenance: {
    readonly vendor: string;
    readonly commit: string;
    readonly capturedAt: string;
    readonly schemaVersion: string;
  };
  readonly oauth?: LiteLLMProviderOAuth;
}

const KNOWN_PROVIDER_OVERRIDES: Readonly<Record<string, Partial<LiteLLMProviderInfo>>> = {
  openai: {
    displayName: "OpenAI",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai",
    apiBase: "https://api.openai.com/v1",
    envVars: ["OPENAI_API_KEY"],
  },
  anthropic: {
    displayName: "Anthropic",
    providerKind: "provider-anthropic",
    adapterFamily: "ai-sdk-anthropic",
    apiBase: "https://api.anthropic.com/v1",
    envVars: ["ANTHROPIC_API_KEY"],
  },
  moonshot: {
    displayName: "Moonshot AI",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://api.moonshot.ai/v1",
    envVars: ["MOONSHOT_API_KEY"],
    supportedAuthModes: ["api-key-static", "oauth2-device-code"],
    controlPlaneRequirements: ["workspace.required", "kimi-code.oauth.device"],
    oauth: {
      apiBase: "https://api.kimi.com/coding/v1",
      oauthHost: "https://auth.kimi.com",
      clientId: "17e5f671-d194-4dfb-9706-5516cb48c098",
      deviceAuthorizationEndpoint: "https://auth.kimi.com/api/oauth/device_authorization",
      tokenEndpoint: "https://auth.kimi.com/api/oauth/token",
      requiredHeaders: [
        "X-Msh-Platform",
        "X-Msh-Version",
        "X-Msh-Device-Name",
        "X-Msh-Device-Model",
        "X-Msh-Os-Version",
        "X-Msh-Device-Id",
      ],
    },
  },
  gemini: {
    displayName: "Google Gemini",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://generativelanguage.googleapis.com/v1beta",
    envVars: ["GEMINI_API_KEY"],
  },
  vertex_ai: {
    displayName: "Google Vertex AI",
    providerKind: "provider-vertex",
    adapterFamily: "ai-sdk-vertex",
    apiBase: "https://us-central1-aiplatform.googleapis.com/v1",
    envVars: ["GOOGLE_APPLICATION_CREDENTIALS"],
  },
  azure: {
    displayName: "Azure OpenAI",
    providerKind: "provider-azure",
    adapterFamily: "ai-sdk-azure",
    apiBase: "https://{resource-name}.openai.azure.com",
    envVars: ["AZURE_API_KEY", "AZURE_API_BASE"],
  },
  azure_ai: {
    displayName: "Azure AI",
    providerKind: "provider-azure",
    adapterFamily: "ai-sdk-azure",
    apiBase: "https://services.ai.azure.com/models",
    envVars: ["AZURE_AI_API_KEY"],
  },
  bedrock: {
    displayName: "Amazon Bedrock",
    providerKind: "provider-bedrock",
    adapterFamily: "ai-sdk-bedrock",
    apiBase: "https://bedrock-runtime.us-east-1.amazonaws.com",
    envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
  },
  bedrock_converse: {
    displayName: "Amazon Bedrock (Converse)",
    providerKind: "provider-bedrock",
    adapterFamily: "ai-sdk-bedrock",
    apiBase: "https://bedrock-runtime.us-east-1.amazonaws.com",
    envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
  },
  mistral: {
    displayName: "Mistral AI",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://api.mistral.ai/v1",
    envVars: ["MISTRAL_API_KEY"],
  },
  cohere: {
    displayName: "Cohere",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://api.cohere.com/v1",
    envVars: ["COHERE_API_KEY"],
  },
  groq: {
    displayName: "Groq",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://api.groq.com/openai/v1",
    envVars: ["GROQ_API_KEY"],
  },
  togetherai: {
    displayName: "Together AI",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://api.together.xyz/v1",
    envVars: ["TOGETHERAI_API_KEY"],
  },
  fireworks_ai: {
    displayName: "Fireworks AI",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://api.fireworks.ai/inference/v1",
    envVars: ["FIREWORKS_API_KEY"],
  },
  perplexity: {
    displayName: "Perplexity",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://api.perplexity.ai",
    envVars: ["PERPLEXITYAI_API_KEY"],
  },
  ai21: {
    displayName: "AI21 Labs",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://api.ai21.com/studio/v1",
    envVars: ["AI21_API_KEY"],
  },
  xai: {
    displayName: "xAI",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://api.x.ai/v1",
    envVars: ["XAI_API_KEY"],
  },
  deepseek: {
    displayName: "DeepSeek",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://api.deepseek.com/v1",
    envVars: ["DEEPSEEK_API_KEY"],
  },
  voyage: {
    displayName: "Voyage AI",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://api.voyageai.com/v1",
    envVars: ["VOYAGE_API_KEY"],
  },
  nvidia_nim: {
    displayName: "NVIDIA NIM",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://integrate.api.nvidia.com/v1",
    envVars: ["NVIDIA_NIM_API_KEY"],
  },
  sambanova: {
    displayName: "SambaNova",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://api.sambanova.ai/v1",
    envVars: ["SAMBANOVA_API_KEY"],
  },
  friendliai: {
    displayName: "FriendliAI",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://inference.friendli.ai/v1",
    envVars: ["FRIENDLI_TOKEN"],
  },
  predibase: {
    displayName: "Predibase",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://serving.predibase.com/v1",
    envVars: ["PREDIBASE_API_KEY"],
  },
  octoai: {
    displayName: "OctoAI",
    providerKind: "provider-openai",
    adapterFamily: "ai-sdk-openai-compatible",
    apiBase: "https://text.octoai.run/v1",
    envVars: ["OCTOAI_API_KEY"],
  },
};

function toTitleCase(value: string): string {
  return value
    .split(/[-_\s]+/g)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function inferProviderInfo(providerId: string): LiteLLMProviderInfo {
  const override = KNOWN_PROVIDER_OVERRIDES[providerId];
  const displayName = override?.displayName ?? toTitleCase(providerId);
  return {
    providerId,
    displayName,
    providerKind: override?.providerKind ?? "provider-openai",
    authFamily: override?.authFamily ?? "api-key",
    adapterFamily: override?.adapterFamily ?? "ai-sdk-openai-compatible",
    apiBase: override?.apiBase ?? "",
    envVars: override?.envVars ?? [
      `${providerId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY`,
    ],
    supportedAuthModes: override?.supportedAuthModes ?? [],
    controlPlaneRequirements: override?.controlPlaneRequirements ?? [],
    localOverrideApplied: Boolean(override),
    oauth: override?.oauth,
    upstreamProvenance: {
      vendor: "litellm",
      commit: "runtime-derived",
      capturedAt: new Date().toISOString(),
      schemaVersion: "litellm.v1",
    },
  };
}

export function extractLiteLLMProviderIds(modelPrices: unknown): readonly string[] {
  if (!modelPrices || typeof modelPrices !== "object") {
    return [];
  }

  const providerIds = new Set<string>();

  for (const [key, entry] of Object.entries(modelPrices)) {
    if (key === "sample_spec") {
      continue;
    }
    if (entry && typeof entry === "object" && "litellm_provider" in entry) {
      const provider = (entry as Record<string, unknown>).litellm_provider;
      if (typeof provider === "string" && provider.length > 0) {
        providerIds.add(provider);
      }
    }
  }

  return [...providerIds].sort();
}

export function deriveLiteLLMProviders(modelPrices: unknown): readonly LiteLLMProviderInfo[] {
  const providerIds = extractLiteLLMProviderIds(modelPrices);
  return providerIds.map(inferProviderInfo);
}

export function extractLiteLLMModelIds(
  modelPrices: unknown,
  providerId: string,
): readonly string[] {
  if (!modelPrices || typeof modelPrices !== "object") {
    return [];
  }

  const modelIds = new Set<string>();

  for (const [key, entry] of Object.entries(modelPrices)) {
    if (key === "sample_spec") {
      continue;
    }
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const provider = (entry as Record<string, unknown>).litellm_provider;
    if (typeof provider !== "string" || provider.length === 0) {
      continue;
    }
    // Match by litellm_provider or by key prefix (e.g. "moonshot/kimi-k2.5")
    if (provider === providerId || key.startsWith(`${providerId}/`)) {
      modelIds.add(key);
    }
  }

  return [...modelIds].sort();
}

export async function loadLiteLLMModelPrices(repoRoot: string): Promise<unknown> {
  const liteLLMPath = path.join(repoRoot, "role-model-router", "vendor", "litellm");
  const candidates = [
    path.join(liteLLMPath, "model_prices_and_context_window.json"),
    path.join(repoRoot, "testdata", "catalog", "litellm-model-prices.json"),
    path.join(
      repoRoot,
      "role-model-router",
      "packages",
      "vendor-litellm",
      "data",
      "model-prices.json",
    ),
  ];

  for (const candidate of candidates) {
    try {
      const content = await readFile(candidate, "utf8");
      return JSON.parse(content) as unknown;
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}
