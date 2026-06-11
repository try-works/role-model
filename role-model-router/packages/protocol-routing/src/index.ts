import type { ContextEnvelopeResult } from "@role-model-router/context-envelope";
import type { NormalizedCatalog } from "@role-model-router/catalog";
import { resolveRoutingCostEstimate } from "@role-model-router/catalog";
import type {
  CatalogCostEstimateSignals,
  EndpointCandidate as CoreEndpointCandidate,
  ObservedDataConfigRecord,
  ObservedPerformanceProfileRecord,
  RoleBindingRecord,
  RoleDefinitionRecord,
  RouteRequestInput,
  RouterDecisionRecord,
  RoutingRequest,
  TaskDefinitionRecord,
  ThroughputPenaltyStateRecord,
} from "@role-model-router/core";
import { routeRequest } from "@role-model-router/core";
import type {
  EndpointRegistryResult,
  EndpointCandidate as RegistryEndpointCandidate,
} from "@role-model-router/endpoint-registry";
import type { RetrievalReceipt } from "@role-model-router/retrieval-receipt";

export interface RoutingModelSelection {
  endpointId: string;
  preferredEndpointIds: readonly string[];
}

export interface ProjectRuntimeRouteInputInput {
  request: RoutingRequest;
  registry: EndpointRegistryResult;
  catalog: NormalizedCatalog;
  observedProfilesByEndpointId: Record<string, ObservedPerformanceProfileRecord>;
  observedDataConfig?: ObservedDataConfigRecord;
  throughputPenaltyStateByEndpointId?: Record<string, ThroughputPenaltyStateRecord>;
  routingTimeMs?: number;
  envelope: ContextEnvelopeResult;
  retrievalReceipt: RetrievalReceipt;
  roleDefinitions: readonly RoleDefinitionRecord[];
  taskDefinitions: readonly TaskDefinitionRecord[];
  roleBindings: readonly RoleBindingRecord[];
  routingModel?: RoutingModelSelection;
  maxOutputTokens?: number;
}

export interface ProjectRuntimeRouteInputResult {
  routeInput: RouteRequestInput;
  routingDiagnostics: {
    retrievalReceiptId: string;
    routingModel: {
      enabled: boolean;
      endpointId: string | null;
      preferredEndpointIds: readonly string[];
      ignoredEndpointIds: readonly string[];
    };
  };
}

export interface RouteRuntimeRequestResult {
  projected: ProjectRuntimeRouteInputResult;
  decision: RouterDecisionRecord;
  routingDiagnostics: ProjectRuntimeRouteInputResult["routingDiagnostics"];
  catalogEconomicsByEndpointId: Readonly<Record<string, CatalogCostEstimateSignals>>;
}

function toRoutingModelRank(
  endpointId: string,
  routingModel: RoutingModelSelection | undefined,
): number | undefined {
  if (!routingModel) {
    return undefined;
  }

  const index = routingModel.preferredEndpointIds.indexOf(endpointId);
  return index === -1 ? undefined : index;
}

function isLocalRegistryCandidate(candidate: RegistryEndpointCandidate): boolean {
  return (
    candidate.identity.serving_source === "local-process" ||
    candidate.identity.serving_source === "local-peer" ||
    candidate.identity.region === "local"
  );
}

function resolveMaxOutputTokens(
  candidate: RegistryEndpointCandidate,
  input: ProjectRuntimeRouteInputInput,
): number {
  if (typeof input.maxOutputTokens === "number" && input.maxOutputTokens > 0) {
    return input.maxOutputTokens;
  }
  return Math.min(candidate.declared.max_context_tokens, 4096);
}

function toCatalogCostEstimateSignals(
  estimate: ReturnType<typeof resolveRoutingCostEstimate>,
): CatalogCostEstimateSignals {
  return {
    canonicalModelId: estimate.economics.canonicalModelId,
    tokenEconomicsSource: estimate.economics.source,
    inputPer1M: estimate.economics.inputPer1M,
    outputPer1M: estimate.economics.outputPer1M,
    estimatedRequestUsd: estimate.estimatedRequestUsd,
    cost_per_1k_tokens_est: estimate.cost_per_1k_tokens_est,
  };
}

function toCoreCandidate(
  candidate: RegistryEndpointCandidate,
  input: ProjectRuntimeRouteInputInput,
): CoreEndpointCandidate {
  const observedProfile = input.observedProfilesByEndpointId[candidate.identity.endpoint_id];
  const routingModelRank = toRoutingModelRank(candidate.identity.endpoint_id, input.routingModel);
  const routingCostEstimate = resolveRoutingCostEstimate({
    modelId: candidate.identity.model_id,
    catalog: input.catalog,
    isLocalEndpoint: isLocalRegistryCandidate(candidate),
    contextTokens: input.request.contextTokens,
    maxOutputTokens: resolveMaxOutputTokens(candidate, input),
  });
  const catalogCostEstimate = toCatalogCostEstimateSignals(routingCostEstimate);
  const observedBase = observedProfile
    ? { ...observedProfile }
    : { endpoint_id: candidate.identity.endpoint_id };
  delete observedBase.cost_per_1k_tokens_est;
  if (typeof catalogCostEstimate.cost_per_1k_tokens_est === "number") {
    observedBase.cost_per_1k_tokens_est = catalogCostEstimate.cost_per_1k_tokens_est;
  }
  const observed =
    Object.keys(observedBase).length > 1 || typeof observedBase.cost_per_1k_tokens_est === "number"
      ? observedBase
      : undefined;

  return {
    identity: candidate.identity,
    declared: candidate.declared,
    observed,
    status: candidate.status,
    deniedByPolicy: candidate.deniedByPolicy,
    runtimeEligibility: candidate.runtimeEligibility,
    routingSignals: {
      continuityAffinity:
        input.envelope.latestHandoff?.toEndpointId === candidate.identity.endpoint_id,
      cacheAffinity:
        input.envelope.estimatedTokenCount <= candidate.declared.max_context_tokens &&
        input.retrievalReceipt.summary.estimatedTokens <= candidate.declared.max_context_tokens,
      ...(typeof routingModelRank === "number" ? { routingModelRank } : {}),
      catalogCostEstimate,
    },
  };
}

export function projectRuntimeRouteInput(
  input: ProjectRuntimeRouteInputInput,
): ProjectRuntimeRouteInputResult {
  const candidateIds = new Set(
    input.registry.endpoints.map((candidate) => candidate.identity.endpoint_id),
  );
  const deniedEndpointIds = new Set(input.request.denyEndpoints ?? []);
  const allowEndpoints = input.request.allowEndpoints ?? [];
  const preferredEndpointIds = input.routingModel?.preferredEndpointIds ?? [];
  const ignoredEndpointIds = preferredEndpointIds.filter(
    (endpointId) =>
      !candidateIds.has(endpointId) ||
      deniedEndpointIds.has(endpointId) ||
      (allowEndpoints.length > 0 && !allowEndpoints.includes(endpointId)),
  );
  const routablePreferredEndpointIds = preferredEndpointIds.filter(
    (endpointId) => !ignoredEndpointIds.includes(endpointId),
  );
  const endpointId = input.routingModel?.endpointId ?? null;
  const endpointIdRoutable =
    endpointId !== null &&
    candidateIds.has(endpointId) &&
    !deniedEndpointIds.has(endpointId) &&
    (allowEndpoints.length === 0 || allowEndpoints.includes(endpointId));
  const routingModelEnabled = Boolean(
    input.routingModel && (routablePreferredEndpointIds.length > 0 || endpointIdRoutable),
  );

  return {
    routeInput: {
      request: input.request,
      candidates: input.registry.endpoints.map((candidate) => toCoreCandidate(candidate, input)),
      roleDefinitions: input.roleDefinitions,
      taskDefinitions: input.taskDefinitions,
      roleBindings: input.roleBindings,
      observedDataConfig: input.observedDataConfig,
      throughputPenaltyStateByEndpointId: input.throughputPenaltyStateByEndpointId,
      routingTimeMs: input.routingTimeMs,
    },
    routingDiagnostics: {
      retrievalReceiptId: input.retrievalReceipt.receiptId,
      routingModel: routingModelEnabled
        ? {
            enabled: true,
            endpointId: endpointIdRoutable
              ? endpointId
              : (routablePreferredEndpointIds[0] ?? null),
            preferredEndpointIds: routablePreferredEndpointIds,
            ignoredEndpointIds,
          }
        : {
            enabled: false,
            endpointId: null,
            preferredEndpointIds: [],
            ignoredEndpointIds,
          },
    },
  };
}

export function routeRuntimeRequest(
  input: ProjectRuntimeRouteInputInput,
): RouteRuntimeRequestResult {
  const projected = projectRuntimeRouteInput(input);
  const decision = routeRequest(projected.routeInput);
  const catalogEconomicsByEndpointId = Object.fromEntries(
    projected.routeInput.candidates.map((candidate) => [
      candidate.identity.endpoint_id,
      candidate.routingSignals?.catalogCostEstimate ?? {
        canonicalModelId: candidate.identity.model_id,
        tokenEconomicsSource: "unknown" as const,
        inputPer1M: null,
        outputPer1M: null,
        estimatedRequestUsd: null,
        cost_per_1k_tokens_est: null,
      },
    ]),
  );

  return {
    projected,
    decision,
    routingDiagnostics: projected.routingDiagnostics,
    catalogEconomicsByEndpointId,
  };
}
