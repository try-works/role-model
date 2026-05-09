import type { ContextEnvelopeResult } from "@role-model-router/context-envelope";
import type {
  EndpointCandidate as CoreEndpointCandidate,
  ObservedPerformanceProfileRecord,
  RoleBindingRecord,
  RoleDefinitionRecord,
  RouteRequestInput,
  RouterDecisionRecord,
  RoutingRequest,
  TaskDefinitionRecord,
} from "@role-model-router/core";
import { routeRequest } from "@role-model-router/core";
import type {
  EndpointCandidate as RegistryEndpointCandidate,
  EndpointRegistryResult,
} from "@role-model-router/endpoint-registry";
import type { RetrievalReceipt } from "@role-model-router/retrieval-receipt";

export interface RoutingModelSelection {
  endpointId: string;
  preferredEndpointIds: readonly string[];
}

export interface ProjectRuntimeRouteInputInput {
  request: RoutingRequest;
  registry: EndpointRegistryResult;
  observedProfilesByEndpointId: Record<string, ObservedPerformanceProfileRecord>;
  envelope: ContextEnvelopeResult;
  retrievalReceipt: RetrievalReceipt;
  roleDefinitions: readonly RoleDefinitionRecord[];
  taskDefinitions: readonly TaskDefinitionRecord[];
  roleBindings: readonly RoleBindingRecord[];
  routingModel?: RoutingModelSelection;
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

function toCoreCandidate(
  candidate: RegistryEndpointCandidate,
  input: ProjectRuntimeRouteInputInput,
): CoreEndpointCandidate {
  const observed = input.observedProfilesByEndpointId[candidate.identity.endpoint_id];
  const routingModelRank = toRoutingModelRank(candidate.identity.endpoint_id, input.routingModel);

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
    },
  };
}

export function projectRuntimeRouteInput(
  input: ProjectRuntimeRouteInputInput,
): ProjectRuntimeRouteInputResult {
  const candidateIds = new Set(input.registry.endpoints.map((candidate) => candidate.identity.endpoint_id));
  const deniedEndpointIds = new Set(input.request.denyEndpoints ?? []);
  const allowEndpoints = input.request.allowEndpoints ?? [];
  const ignoredEndpointIds = input.routingModel?.preferredEndpointIds
    ? input.routingModel.preferredEndpointIds.filter(
        (endpointId) =>
          !candidateIds.has(endpointId) ||
          deniedEndpointIds.has(endpointId) ||
          (allowEndpoints.length > 0 && !allowEndpoints.includes(endpointId)),
      )
    : [];

  return {
    routeInput: {
      request: input.request,
      candidates: input.registry.endpoints.map((candidate) => toCoreCandidate(candidate, input)),
      roleDefinitions: input.roleDefinitions,
      taskDefinitions: input.taskDefinitions,
      roleBindings: input.roleBindings,
    },
    routingDiagnostics: {
      retrievalReceiptId: input.retrievalReceipt.receiptId,
      routingModel: {
        enabled: Boolean(input.routingModel),
        endpointId: input.routingModel?.endpointId ?? null,
        preferredEndpointIds: input.routingModel?.preferredEndpointIds ?? [],
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

  return {
    projected,
    decision,
    routingDiagnostics: projected.routingDiagnostics,
  };
}
