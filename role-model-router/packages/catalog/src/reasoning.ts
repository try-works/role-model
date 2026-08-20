export interface ReasoningEffortAdapterCapability {
  /** Provider adapter family, for example `ai-sdk-openai-compatible`. */
  readonly family: string;
  /** Version of the serializer capability contract. */
  readonly version: string;
  /** Raw wire tokens accepted by the tested serializer. */
  readonly serializers: readonly string[];
}

export interface ReasoningEffortFallback {
  /** Explicit provider-family fallback table key; never inferred from model id. */
  readonly providerFamily: string;
  readonly version: string;
  readonly levels: readonly string[];
}

export interface ReasoningEffortResolutionInput {
  readonly providerId: string;
  readonly modelId: string;
  readonly providerFamily?: string;
  readonly capabilities: readonly string[];
  readonly reasoningEffortLevels: readonly string[];
  readonly reasoningOptionKinds: readonly string[];
  /** Sparse LiteLLM additions; catalog values always retain precedence/order. */
  readonly liteLlmEffortLevels?: readonly string[];
  readonly fallback?: ReasoningEffortFallback;
  readonly adapter: ReasoningEffortAdapterCapability | null;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/**
 * Resolve operator-selectable effort values without turning reasoning into a
 * boolean enum. The catalog is authoritative, LiteLLM can append sparse
 * values, and a fallback is considered only when both sources are empty.
 * Every candidate is finally intersected with a tested adapter serializer.
 */
export function resolveReasoningEffortLevels(input: ReasoningEffortResolutionInput): string[] {
  if (!input.capabilities.includes("reasoning")) {
    return [];
  }

  const catalogLevels = unique(input.reasoningEffortLevels);
  const liteLlmLevels = unique(input.liteLlmEffortLevels ?? []);
  let candidates = unique([...catalogLevels, ...liteLlmLevels]);

  if (candidates.length === 0 && input.fallback) {
    const family = input.providerFamily ?? input.providerId;
    if (family === input.fallback.providerFamily) {
      candidates = unique(input.fallback.levels);
    }
  }

  if (!input.adapter || input.adapter.serializers.length === 0) {
    return [];
  }

  const supported = new Set(input.adapter.serializers);
  return candidates.filter((candidate) => supported.has(candidate));
}
