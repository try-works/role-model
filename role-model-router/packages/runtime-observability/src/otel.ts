import type { RuntimeObservationBundle } from "./index.js";

export interface OpenTelemetryGenAiExport {
  readonly traceId: string;
  readonly spanId: string;
  readonly attributes: Readonly<Record<string, unknown>>;
}

export function createOpenTelemetryGenAiExport(
  bundle: RuntimeObservationBundle,
): OpenTelemetryGenAiExport {
  const rootSpan = bundle.trace.spans[0];
  if (!rootSpan) {
    throw new Error("Runtime observation bundle must include at least one trace span.");
  }

  return {
    traceId: rootSpan.trace_id,
    spanId: rootSpan.span_id,
    attributes: {
      "gen_ai.request.id": bundle.requestId,
      "gen_ai.response.model": bundle.usageEvent.model_id ?? bundle.endpointId,
      "gen_ai.usage.input_tokens": bundle.usageEvent.tokens_in,
      "gen_ai.usage.output_tokens": bundle.usageEvent.tokens_out,
      "role_model.routing.decision_id": bundle.routingDecisionId,
      "role_model.endpoint.id": bundle.endpointId,
      "role_model.cache.prompt_cache_used": bundle.cacheObservability.promptCacheUsed,
      "role_model.capture.redaction_level": bundle.capturePolicy.redactionLevel,
    },
  };
}
