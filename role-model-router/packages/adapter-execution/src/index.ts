import type {
  NormalizedCatalog,
  NormalizedCatalogModel,
  NormalizedCatalogProvider,
  RequestShapeHints,
} from "@role-model-router/catalog";
import type {
  EndpointCandidate,
  EndpointRegistryResult,
  RegistrySources,
} from "@role-model-router/endpoint-registry";
import type { RouteRuntimeRequestResult } from "@role-model-router/protocol-routing";
import type { ProviderAccountRecord } from "@role-model-router/provider-account";
import type { TraceEventRecord, TraceSpanRecord } from "@role-model-router/trace";
import type { UsageEventRecord } from "@role-model-router/usage";

export interface RuntimeExecutionMessage {
  readonly role: string;
  readonly content: string;
}

export interface RuntimeExecutionToolDefinition {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: Record<string, unknown>;
}

export interface StructuredOutputRequest {
  readonly name: string;
  readonly schema: Record<string, unknown>;
}

export interface PromptCacheRequest {
  readonly mode: "prefer" | "require" | "disabled";
  readonly key?: string;
}

export interface RuntimeExecutionRequest {
  readonly messages: readonly RuntimeExecutionMessage[];
  readonly maxOutputTokens?: number;
  readonly temperature?: number;
  readonly stream?: boolean;
  readonly tools?: readonly RuntimeExecutionToolDefinition[];
  readonly structuredOutput?: StructuredOutputRequest | null;
  readonly promptCache?: PromptCacheRequest;
}

export interface ProviderCapabilityMatrix {
  readonly structuredOutputs: "native" | "json-fallback" | "unsupported";
  readonly toolCalling: {
    readonly supported: boolean;
    readonly extraction: "provider-native" | "unsupported";
  };
  readonly streaming: {
    readonly text: "delta" | "message" | "unsupported";
    readonly toolCalls: "delta" | "message" | "unsupported";
    readonly toolArguments: "delta" | "message" | "unsupported";
  };
  readonly promptCaching: {
    readonly supported: boolean;
    readonly mode: "explicit" | "implicit" | "unsupported";
  };
  readonly usage: {
    readonly inputTokens: boolean;
    readonly outputTokens: boolean;
    readonly cacheReadTokens: boolean;
    readonly cacheWriteTokens: boolean;
  };
}

export interface ProviderRequestCapture {
  readonly providerFamily: string;
  readonly endpointId: string;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: Record<string, unknown>;
}

export interface ProviderResponseCapture {
  readonly providerFamily: string;
  readonly endpointId: string;
  readonly statusCode: number;
  readonly body: unknown;
  readonly vendorMetadata?: {
    readonly vendorId: string;
    readonly resolvedModelId?: string;
    readonly latencyMs?: number;
    readonly costUsd?: number;
    readonly cacheStatus?: string;
    readonly cacheUsed?: boolean;
    readonly cacheReadTokens?: number;
    readonly cacheWriteTokens?: number;
  };
}

export interface NormalizedToolCall {
  readonly name: string;
  readonly arguments: unknown;
  readonly providerToolId?: string;
}

export interface NormalizedProviderResponse {
  readonly providerFamily: string;
  readonly requestCapture: ProviderRequestCapture;
  readonly responseCapture: ProviderResponseCapture;
  readonly outputText: string;
  readonly toolCalls: readonly NormalizedToolCall[];
  readonly finishReason: string;
  readonly structuredOutputMode: "native" | "json-fallback" | "none";
  readonly stream: {
    readonly requested: boolean;
    readonly textDeltas: number;
    readonly toolCallDeltas: number;
    readonly toolArgumentDeltas: number;
  };
  readonly promptCache: {
    readonly requested: boolean;
    readonly used: boolean;
    readonly readTokens: number;
    readonly writeTokens: number;
  };
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteTokens: number;
  };
  readonly errorClass: string | null;
  readonly latencyMs: number;
  readonly diagnostics: readonly AdapterDiagnostic[];
  readonly vendorMetadata?: {
    readonly vendorId?: string;
    readonly latencyMs?: number;
    readonly costUsd?: number;
    readonly cacheStatus?: string;
    readonly cacheUsed?: boolean;
    readonly cacheReadTokens?: number;
    readonly cacheWriteTokens?: number;
  };
}

export interface AdapterDiagnostic {
  readonly code: string;
  readonly message: string;
}

export interface ResolvedExecutionTarget {
  readonly endpointId: string;
  readonly modelId: string;
  readonly providerId: string;
  readonly providerKind: string;
  readonly providerAccountId: string | null;
  readonly adapterFamily: string;
  readonly authFamily: string;
  readonly apiBase: string;
  readonly requestShapeHints: RequestShapeHints | null;
  readonly candidate: EndpointCandidate;
  readonly account: ProviderAccountRecord | null;
  readonly provider: NormalizedCatalogProvider | null;
  readonly model: NormalizedCatalogModel | null;
}

export interface ProviderAdapterExecutionContext {
  readonly target: ResolvedExecutionTarget;
  readonly executionRequest: RuntimeExecutionRequest;
}

export interface ProviderAdapterNormalizeContext extends ProviderAdapterExecutionContext {
  readonly capabilities: ProviderCapabilityMatrix;
  readonly requestCapture: ProviderRequestCapture;
  readonly responseCapture: ProviderResponseCapture;
}

export interface ProviderAdapter {
  readonly adapterFamily: string;
  negotiateCapabilities(input: ProviderAdapterExecutionContext): ProviderCapabilityMatrix;
  buildRequest(
    input: ProviderAdapterExecutionContext & {
      readonly capabilities: ProviderCapabilityMatrix;
    },
  ): ProviderRequestCapture;
  normalizeResponse(input: ProviderAdapterNormalizeContext): NormalizedProviderResponse;
}

export interface RuntimeResponseCaptureMap {
  readonly byEndpointId: Readonly<Record<string, { readonly body: unknown }>>;
}

export interface ExecuteRoutedRequestInput {
  readonly routeResult: RouteRuntimeRequestResult;
  readonly catalog: NormalizedCatalog;
  readonly accounts: readonly ProviderAccountRecord[];
  readonly registry: EndpointRegistryResult;
  readonly registrySources: RegistrySources;
  readonly executionRequest: RuntimeExecutionRequest;
  readonly adapters: readonly ProviderAdapter[];
  readonly captures: RuntimeResponseCaptureMap;
  readonly additionalProviders?: readonly NormalizedCatalogProvider[];
}

export interface ProviderRequestExecutionInput {
  readonly target: ResolvedExecutionTarget;
  readonly requestCapture: ProviderRequestCapture;
  readonly fallbackModelIds?: readonly string[];
}

export interface ExecuteLiveRoutedRequestInput extends Omit<ExecuteRoutedRequestInput, "captures"> {
  readonly executeProviderRequest: (
    input: ProviderRequestExecutionInput,
  ) => Promise<ProviderResponseCapture>;
}

export interface RoutedExecutionResult {
  readonly target: ResolvedExecutionTarget;
  readonly capabilities: ProviderCapabilityMatrix;
  readonly requestCapture: ProviderRequestCapture;
  readonly responseCapture: ProviderResponseCapture;
  readonly normalized: NormalizedProviderResponse;
  readonly trace: {
    readonly spans: readonly TraceSpanRecord[];
    readonly events: readonly TraceEventRecord[];
  };
  readonly usageEvent: UsageEventRecord;
  readonly diagnostics: readonly AdapterDiagnostic[];
}

function resolveFallbackModelIds(
  input: Pick<ExecuteLiveRoutedRequestInput, "routeResult" | "registrySources" | "registry">,
): readonly string[] | undefined {
  const fallbackEndpointIds = input.routeResult.decision.fallback_endpoint_ids;
  if (!Array.isArray(fallbackEndpointIds) || fallbackEndpointIds.length === 0) {
    return undefined;
  }

  return fallbackEndpointIds.map((endpointId) => {
    const cloudSource = findCloudSource(input.registrySources, endpointId);
    if (cloudSource) {
      return cloudSource.modelId;
    }

    const localSource = findLocalSource(input.registrySources, endpointId);
    if (localSource) {
      return localSource.modelId;
    }

    const candidate = input.registry.endpoints.find(
      (entry) => entry.identity.endpoint_id === endpointId,
    );
    if (candidate) {
      return candidate.identity.model_id;
    }

    throw new Error(`Fallback endpoint ${endpointId} is not present in the registry sources.`);
  });
}

function parseJsonArguments(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export function normalizeToolCallArguments(value: unknown): unknown {
  return parseJsonArguments(value);
}

function findCloudSource(
  registrySources: RegistrySources,
  endpointId: string,
): RegistrySources["cloud"][number] | undefined {
  return registrySources.cloud.find((source) => source.endpointId === endpointId);
}

function findLocalSource(
  registrySources: RegistrySources,
  endpointId: string,
): RegistrySources["local"][number] | undefined {
  return registrySources.local.find((source) => source.endpointId === endpointId);
}

export function resolveExecutionTarget(
  input: Omit<ExecuteRoutedRequestInput, "executionRequest" | "adapters" | "captures">,
): ResolvedExecutionTarget {
  const endpointId = input.routeResult.decision.chosen_endpoint_id;
  const candidate = input.registry.endpoints.find(
    (entry) => entry.identity.endpoint_id === endpointId,
  );
  if (!candidate) {
    throw new Error(`Chosen endpoint ${endpointId} is not present in the registry result.`);
  }

  const allProviders = new Map([
    ...input.catalog.providers.map((p) => [p.providerId, p] as const),
    ...(input.additionalProviders ?? []).map((p) => [p.providerId, p] as const),
  ]);

  const cloudSource = findCloudSource(input.registrySources, endpointId);
  if (cloudSource) {
    const account = input.accounts.find(
      (entry) => entry.providerAccountId === cloudSource.providerAccountId,
    );
    if (!account) {
      throw new Error(
        `Provider account ${cloudSource.providerAccountId} is not present for chosen endpoint ${endpointId}.`,
      );
    }
    const provider = allProviders.get(account.providerId);
    if (!provider) {
      throw new Error(
        `Provider ${account.providerId} is not present in the catalog or additional providers for chosen endpoint ${endpointId}.`,
      );
    }
    const model = input.catalog.models.find((entry) => entry.modelId === cloudSource.modelId);
    if (!model) {
      throw new Error(
        `Model ${cloudSource.modelId} is not present in the normalized catalog for chosen endpoint ${endpointId}.`,
      );
    }

    return {
      endpointId,
      modelId: model.modelId,
      providerId: provider.providerId,
      providerKind: provider.providerKind,
      providerAccountId: account.providerAccountId,
      adapterFamily: provider.adapterFamily,
      authFamily: provider.authFamily,
      apiBase: account.baseUrlOverride ?? provider.apiBase,
      requestShapeHints: cloudSource.requestShapeHints ?? model.requestShapeHints,
      candidate,
      account,
      provider,
      model,
    };
  }

  const localSource = findLocalSource(input.registrySources, endpointId);
  if (localSource) {
    return {
      endpointId,
      modelId: localSource.modelId,
      providerId: localSource.providerId,
      providerKind: localSource.providerKind,
      providerAccountId: null,
      adapterFamily: localSource.providerKind,
      authFamily: "runtime-defined",
      apiBase: "local://runtime",
      requestShapeHints: null,
      candidate,
      account: null,
      provider: null,
      model: null,
    };
  }

  throw new Error(`Chosen endpoint ${endpointId} is not present in the registry sources.`);
}

function resolveAdapter(
  adapters: readonly ProviderAdapter[],
  target: ResolvedExecutionTarget,
): ProviderAdapter {
  const adapter = adapters.find((entry) => entry.adapterFamily === target.adapterFamily);
  if (!adapter) {
    throw new Error(`No provider adapter is registered for ${target.adapterFamily}.`);
  }
  return adapter;
}

function resolveResponseCapture(
  captures: RuntimeResponseCaptureMap,
  target: ResolvedExecutionTarget,
): ProviderResponseCapture {
  const capture = captures.byEndpointId[target.endpointId];
  if (!capture) {
    throw new Error(`No response capture is configured for endpoint ${target.endpointId}.`);
  }
  return {
    providerFamily: target.adapterFamily,
    endpointId: target.endpointId,
    statusCode: 200,
    body: capture.body,
  };
}

interface PreparedRoutedExecution {
  readonly target: ResolvedExecutionTarget;
  readonly adapter: ProviderAdapter;
  readonly capabilities: ProviderCapabilityMatrix;
  readonly requestCapture: ProviderRequestCapture;
}

function prepareRoutedExecution(
  input: Omit<ExecuteRoutedRequestInput, "captures">,
): PreparedRoutedExecution {
  const target = resolveExecutionTarget(input);
  const adapter = resolveAdapter(input.adapters, target);
  const capabilities = adapter.negotiateCapabilities({
    target,
    executionRequest: input.executionRequest,
  });
  const requestCapture = adapter.buildRequest({
    target,
    executionRequest: input.executionRequest,
    capabilities,
  });

  return {
    target,
    adapter,
    capabilities,
    requestCapture,
  };
}

function buildDiagnostics(
  executionRequest: RuntimeExecutionRequest,
  capabilities: ProviderCapabilityMatrix,
  normalized: NormalizedProviderResponse,
): AdapterDiagnostic[] {
  const diagnostics = [...normalized.diagnostics];
  if (executionRequest.structuredOutput && capabilities.structuredOutputs === "json-fallback") {
    diagnostics.push({
      code: "STRUCTURED_OUTPUT_JSON_FALLBACK",
      message:
        "The selected provider family does not expose native strict structured outputs; the adapter used JSON fallback mode.",
    });
  }
  if (
    executionRequest.promptCache &&
    executionRequest.promptCache.mode !== "disabled" &&
    !capabilities.promptCaching.supported
  ) {
    diagnostics.push({
      code: "PROMPT_CACHE_UNAVAILABLE",
      message:
        "The selected provider family does not expose prompt-caching support for this adapter execution.",
    });
  }
  return diagnostics;
}

function createTraceArtifacts(
  routeResult: RouteRuntimeRequestResult,
  target: ResolvedExecutionTarget,
  normalized: NormalizedProviderResponse,
): { spans: TraceSpanRecord[]; events: TraceEventRecord[] } {
  const now = Date.now();
  const traceId = `trace-${routeResult.decision.request_id}`;
  const loadEndedAt = now + 5;
  const decodeEndedAt = now + Math.max(normalized.latencyMs, 10);

  const spans: TraceSpanRecord[] = [
    {
      trace_id: traceId,
      span_id: `span-provider-load-${routeResult.decision.request_id}`,
      request_id: routeResult.decision.request_id,
      routing_decision_id: routeResult.decision.routing_decision_id,
      span_type: "provider.load",
      started_at_ms: now,
      ended_at_ms: loadEndedAt,
      status: normalized.errorClass ? "error" : "ok",
      attributes: {
        adapter_family: target.adapterFamily,
        endpoint_id: target.endpointId,
      },
    },
    {
      trace_id: traceId,
      span_id: `span-provider-decode-${routeResult.decision.request_id}`,
      parent_span_id: `span-provider-load-${routeResult.decision.request_id}`,
      request_id: routeResult.decision.request_id,
      routing_decision_id: routeResult.decision.routing_decision_id,
      span_type: "provider.decode",
      started_at_ms: loadEndedAt,
      ended_at_ms: decodeEndedAt,
      status: normalized.errorClass ? "error" : "ok",
      attributes: {
        endpoint_id: target.endpointId,
        text_delta_count: normalized.stream.textDeltas,
      },
    },
  ];

  const events: TraceEventRecord[] = [
    {
      event_id: `event-provider-load-${routeResult.decision.request_id}`,
      trace_id: traceId,
      span_id: spans[0].span_id,
      request_id: routeResult.decision.request_id,
      routing_decision_id: routeResult.decision.routing_decision_id,
      timestamp_ms: now + 1,
      event_type: "trace.span.opened",
      payload: {
        adapter_family: target.adapterFamily,
        endpoint_id: target.endpointId,
      },
    },
    {
      event_id: `event-usage-${routeResult.decision.request_id}`,
      trace_id: traceId,
      span_id: spans[1].span_id,
      request_id: routeResult.decision.request_id,
      routing_decision_id: routeResult.decision.routing_decision_id,
      timestamp_ms: decodeEndedAt,
      event_type: "usage.event.created",
      payload: {
        input_tokens: normalized.usage.inputTokens,
        output_tokens: normalized.usage.outputTokens,
        ...(typeof normalized.vendorMetadata?.costUsd === "number"
          ? { cost_usd: normalized.vendorMetadata.costUsd }
          : {}),
      },
    },
  ];

  return { spans, events };
}

function createUsageEvent(
  routeResult: RouteRuntimeRequestResult,
  target: ResolvedExecutionTarget,
  normalized: NormalizedProviderResponse,
): UsageEventRecord {
  const chosenProjectedCandidate = routeResult.projected.routeInput.candidates.find(
    (candidate) => candidate.identity.endpoint_id === target.endpointId,
  );

  return {
    event_id: `usage-${routeResult.decision.request_id}`,
    timestamp_ms: Date.now(),
    app_id: routeResult.decision.app_id,
    org_id: routeResult.decision.org_id ?? undefined,
    request_id: routeResult.decision.request_id,
    routing_decision_id: routeResult.decision.routing_decision_id,
    endpoint_id: target.endpointId,
    model_id: target.modelId,
    package_id: target.providerKind,
    provider_kind: target.candidate.identity.provider_kind,
    tokens_in: normalized.usage.inputTokens,
    tokens_out: normalized.usage.outputTokens,
    latency_ms: normalized.latencyMs,
    ...(typeof normalized.vendorMetadata?.costUsd === "number"
      ? { cost_actual: normalized.vendorMetadata.costUsd }
      : {}),
    ...(typeof normalized.vendorMetadata?.costUsd === "number"
      ? { cost_estimate: normalized.vendorMetadata.costUsd }
      : typeof chosenProjectedCandidate?.observed?.cost_per_1k_tokens_est === "number"
        ? { cost_estimate: chosenProjectedCandidate.observed.cost_per_1k_tokens_est }
        : {}),
    ...(typeof normalized.vendorMetadata?.costUsd === "number" ||
    chosenProjectedCandidate?.observed?.cost_per_1k_tokens_est
      ? { currency: "USD" }
      : {}),
    ...(normalized.errorClass ? { error_class: normalized.errorClass } : {}),
    sample_source: "live_request",
  };
}

export function executeRoutedRequest(input: ExecuteRoutedRequestInput): RoutedExecutionResult {
  const { target, adapter, capabilities, requestCapture } = prepareRoutedExecution(input);
  const responseCapture = resolveResponseCapture(input.captures, target);
  const normalized = adapter.normalizeResponse({
    target,
    executionRequest: input.executionRequest,
    capabilities,
    requestCapture,
    responseCapture,
  });
  const diagnostics = buildDiagnostics(input.executionRequest, capabilities, normalized);
  const trace = createTraceArtifacts(input.routeResult, target, normalized);
  const usageEvent = createUsageEvent(input.routeResult, target, normalized);

  return {
    target,
    capabilities,
    requestCapture,
    responseCapture,
    normalized,
    trace,
    usageEvent,
    diagnostics,
  };
}

export async function executeLiveRoutedRequest(
  input: ExecuteLiveRoutedRequestInput,
): Promise<RoutedExecutionResult> {
  const { target, adapter, capabilities, requestCapture } = prepareRoutedExecution(input);
  const fallbackModelIds = resolveFallbackModelIds(input);
  const responseCapture = await input.executeProviderRequest({
    target,
    requestCapture,
    ...(fallbackModelIds ? { fallbackModelIds } : {}),
  });
  const normalized = adapter.normalizeResponse({
    target,
    executionRequest: input.executionRequest,
    capabilities,
    requestCapture,
    responseCapture,
  });
  const diagnostics = buildDiagnostics(input.executionRequest, capabilities, normalized);
  const trace = createTraceArtifacts(input.routeResult, target, normalized);
  const usageEvent = createUsageEvent(input.routeResult, target, normalized);

  return {
    target,
    capabilities,
    requestCapture,
    responseCapture,
    normalized,
    trace,
    usageEvent,
    diagnostics,
  };
}
