import type { NormalizedCatalog } from "@role-model-router/catalog";
import { resolveRoutingCostEstimate } from "@role-model-router/catalog";
import type { ContextEnvelopeResult } from "@role-model-router/context-envelope";
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

export interface CacheContinuityRoutingHints {
  activeEndpointId: string | null;
  warmedEndpointIds: readonly string[];
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
  cacheContinuity?: CacheContinuityRoutingHints;
  maxOutputTokens?: number;
  benchmarkCapabilitiesByEndpointId?: Record<
    string,
    CoreEndpointCandidate["benchmarkCapability"] | null | undefined
  >;
  telemetryScoresByEndpointId?: Record<
    string,
    CoreEndpointCandidate["telemetryScores"] | null | undefined
  >;
  /**
   * Run 98 R5: operator-policy-gated advisory consideration. Passed only when the
   * effective learning stage is S2 or above; hard eligibility and scoring still run first.
   */
  advisoryConsideration?: RouteRequestInput["advisoryConsideration"];
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
    cacheContinuity?: CacheContinuityRoutingHints;
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

function normalizeCacheContinuityHints(
  cacheContinuity: ProjectRuntimeRouteInputInput["cacheContinuity"],
): CacheContinuityRoutingHints | undefined {
  if (!cacheContinuity) {
    return undefined;
  }
  const warmedEndpointIds = [
    ...new Set(
      cacheContinuity.warmedEndpointIds.filter(
        (endpointId): endpointId is string =>
          typeof endpointId === "string" && endpointId.trim().length > 0,
      ),
    ),
  ];
  return {
    activeEndpointId:
      typeof cacheContinuity.activeEndpointId === "string" &&
      cacheContinuity.activeEndpointId.trim().length > 0
        ? cacheContinuity.activeEndpointId
        : null,
    warmedEndpointIds,
  };
}

function toCoreCandidate(
  candidate: RegistryEndpointCandidate,
  input: ProjectRuntimeRouteInputInput,
  cacheContinuity: CacheContinuityRoutingHints | undefined,
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
  const observed: CoreEndpointCandidate["observed"] = observedProfile
    ? {
        ...observedProfile,
        ...(typeof catalogCostEstimate.cost_per_1k_tokens_est === "number"
          ? { cost_per_1k_tokens_est: catalogCostEstimate.cost_per_1k_tokens_est }
          : {}),
      }
    : undefined;

  return {
    identity: candidate.identity,
    declared: candidate.declared,
    observed,
    ...(input.benchmarkCapabilitiesByEndpointId?.[candidate.identity.endpoint_id]
      ? {
          benchmarkCapability:
            input.benchmarkCapabilitiesByEndpointId[candidate.identity.endpoint_id] ?? undefined,
        }
      : {}),
    ...(input.telemetryScoresByEndpointId?.[candidate.identity.endpoint_id]
      ? {
          telemetryScores:
            input.telemetryScoresByEndpointId[candidate.identity.endpoint_id] ?? undefined,
        }
      : {}),
    status: candidate.status,
    deniedByPolicy: candidate.deniedByPolicy,
    runtimeEligibility: candidate.runtimeEligibility,
    routingSignals: {
      continuityAffinity:
        cacheContinuity?.activeEndpointId === candidate.identity.endpoint_id ||
        input.envelope.latestHandoff?.toEndpointId === candidate.identity.endpoint_id,
      cacheAffinity: cacheContinuity
        ? cacheContinuity.warmedEndpointIds.includes(candidate.identity.endpoint_id)
        : input.envelope.estimatedTokenCount <= candidate.declared.max_context_tokens &&
          input.retrievalReceipt.summary.estimatedTokens <= candidate.declared.max_context_tokens,
      ...(typeof routingModelRank === "number" ? { routingModelRank } : {}),
      catalogCostEstimate,
    },
  };
}

export function projectRuntimeRouteInput(
  input: ProjectRuntimeRouteInputInput,
): ProjectRuntimeRouteInputResult {
  const cacheContinuity = normalizeCacheContinuityHints(input.cacheContinuity);
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
      candidates: input.registry.endpoints.map((candidate) =>
        toCoreCandidate(candidate, input, cacheContinuity),
      ),
      roleDefinitions: input.roleDefinitions,
      taskDefinitions: input.taskDefinitions,
      roleBindings: input.roleBindings,
      observedDataConfig: input.observedDataConfig,
      throughputPenaltyStateByEndpointId: input.throughputPenaltyStateByEndpointId,
      routingTimeMs: input.routingTimeMs,
      ...(input.advisoryConsideration
        ? { advisoryConsideration: input.advisoryConsideration }
        : {}),
    },
    routingDiagnostics: {
      retrievalReceiptId: input.retrievalReceipt.receiptId,
      routingModel: routingModelEnabled
        ? {
            enabled: true,
            endpointId: endpointIdRoutable ? endpointId : (routablePreferredEndpointIds[0] ?? null),
            preferredEndpointIds: routablePreferredEndpointIds,
            ignoredEndpointIds,
          }
        : {
            enabled: false,
            endpointId: null,
            preferredEndpointIds: [],
            ignoredEndpointIds,
          },
      ...(cacheContinuity ? { cacheContinuity } : {}),
    },
  };
}

export function routeRuntimeRequest(
  input: ProjectRuntimeRouteInputInput,
): RouteRuntimeRequestResult {
  const projected = projectRuntimeRouteInput(input);
  const decision = routeRequest(projected.routeInput);
  /**
   * Run 115 (addendum 10, E0). The eligibility verdict - which candidates were excluded and by which code - lived
   * only in memory: `RouterDecisionRecord.eligibility` is consumed by nothing but the gateway-smoke app, so a live
   * request that kept 1 of 7 candidates left no evidence of *why*. Measured 2026-09-24: every recent live request
   * recorded `eligible_endpoint_ids_json` with a single member while all 7 registry endpoints reached
   * `routeRequest`, and the alias's own mode/bias was absent from telemetry entirely. This bounded line makes the
   * verdict observable on the next request, which is what turns the current hypothesis (policy allow-list vs hard
   * taxonomy/role binding) into a named filter.
   */
  {
    const excluded = decision.eligibility.filter((entry) => entry.eligible !== true);
    const codes = new Map<string, number>();
    for (const entry of excluded) {
      const entryCodes =
        (entry as { readonly codes?: readonly string[] }).codes ??
        (entry as { readonly reasons?: readonly string[] }).reasons ??
        (entry as { readonly exclusionCodes?: readonly string[] }).exclusionCodes ??
        [];
      for (const code of entryCodes) {
        const key = String(code);
        codes.set(key, (codes.get(key) ?? 0) + 1);
      }
    }
    const histogram = [...codes.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 8)
      .map(([code, count]) => `${code}=${count}`)
      .join(",");
    console.log(
      `[run115] eligibility candidates=${projected.routeInput.candidates.length} eligible=${
        decision.eligibility.filter((entry) => entry.eligible === true).length
      } codes=${histogram || "none"}`,
    );
  }
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
