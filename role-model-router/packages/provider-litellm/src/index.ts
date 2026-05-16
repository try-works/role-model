import type {
  NormalizedProviderResponse,
  ProviderAdapter,
  ProviderAdapterExecutionContext,
  ProviderAdapterNormalizeContext,
  ProviderCapabilityMatrix,
} from "@role-model-router/adapter-execution";
import { buildOpenAIRequest, normalizeOpenAIResponse } from "@role-model-router/provider-openai";

function readCachedTokens(body: unknown): number {
  if (!body || typeof body !== "object") {
    return 0;
  }
  const usage = "usage" in body ? body.usage : undefined;
  if (!usage || typeof usage !== "object") {
    return 0;
  }
  const promptDetails =
    "prompt_tokens_details" in usage &&
    usage.prompt_tokens_details &&
    typeof usage.prompt_tokens_details === "object"
      ? usage.prompt_tokens_details
      : undefined;
  if (
    promptDetails &&
    "cached_tokens" in promptDetails &&
    typeof promptDetails.cached_tokens === "number"
  ) {
    return promptDetails.cached_tokens;
  }
  return 0;
}

function readResponseCost(body: unknown): number | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const hidden =
    "_hidden_params" in body && body._hidden_params && typeof body._hidden_params === "object"
      ? body._hidden_params
      : undefined;
  if (hidden && "response_cost" in hidden && typeof hidden.response_cost === "number") {
    return hidden.response_cost;
  }
  if ("response_cost" in body && typeof body.response_cost === "number") {
    return body.response_cost;
  }
  return undefined;
}

function readCacheHit(body: unknown): boolean | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const hidden =
    "_hidden_params" in body && body._hidden_params && typeof body._hidden_params === "object"
      ? body._hidden_params
      : undefined;
  if (hidden && "cache_hit" in hidden && typeof hidden.cache_hit === "boolean") {
    return hidden.cache_hit;
  }
  return undefined;
}

function getLiteLLMCapabilities(hasStructuredOutput: boolean): ProviderCapabilityMatrix {
  return {
    structuredOutputs: hasStructuredOutput ? "native" : "unsupported",
    toolCalling: {
      supported: true,
      extraction: "provider-native",
    },
    streaming: {
      text: "delta",
      toolCalls: "delta",
      toolArguments: "delta",
    },
    promptCaching: {
      supported: true,
      mode: "implicit",
    },
    usage: {
      inputTokens: true,
      outputTokens: true,
      cacheReadTokens: true,
      cacheWriteTokens: true,
    },
  };
}

export function createLiteLLMProviderAdapter(adapterFamily = "litellm-proxy"): ProviderAdapter {
  return {
    adapterFamily,
    negotiateCapabilities: ({ executionRequest }: ProviderAdapterExecutionContext) =>
      getLiteLLMCapabilities(Boolean(executionRequest.structuredOutput)),
    buildRequest: buildOpenAIRequest,
    normalizeResponse: (input: ProviderAdapterNormalizeContext): NormalizedProviderResponse => {
      const normalized = normalizeOpenAIResponse(input);
      const cacheReadTokens = readCachedTokens(input.responseCapture.body);
      const cacheStatus = input.responseCapture.vendorMetadata?.cacheStatus;
      const cacheUsed =
        readCacheHit(input.responseCapture.body) ??
        input.responseCapture.vendorMetadata?.cacheUsed ??
        cacheReadTokens > 0;
      const costUsd =
        readResponseCost(input.responseCapture.body) ??
        input.responseCapture.vendorMetadata?.costUsd;

      return {
        ...normalized,
        promptCache: {
          requested: Boolean(input.executionRequest.promptCache),
          used: cacheUsed,
          readTokens: cacheReadTokens,
          writeTokens: input.responseCapture.vendorMetadata?.cacheWriteTokens ?? 0,
        },
        usage: {
          ...normalized.usage,
          cacheReadTokens,
          cacheWriteTokens: input.responseCapture.vendorMetadata?.cacheWriteTokens ?? 0,
        },
        vendorMetadata: {
          ...(normalized.vendorMetadata ?? {}),
          ...(typeof costUsd === "number" ? { costUsd } : {}),
          ...(typeof cacheStatus === "string" ? { cacheStatus } : {}),
          ...(typeof cacheUsed === "boolean" ? { cacheUsed } : {}),
        },
      };
    },
  };
}
