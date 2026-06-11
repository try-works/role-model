import type { RoutingModelSelection } from "@role-model-router/protocol-routing";
import type { UnifiedRuntimeConfig } from "./unified-runtime-config.js";

export function resolveRuntimeRoutingModelSelection(input: {
  readonly fixtureRoutingModel?: RoutingModelSelection;
  readonly unifiedConfig: UnifiedRuntimeConfig | null;
  readonly routableEndpointIds: readonly string[];
}): RoutingModelSelection | undefined {
  const routableEndpointIds = new Set(input.routableEndpointIds);

  const configEndpointIds = [
    input.unifiedConfig?.difficultyClassifier?.endpointId,
    input.unifiedConfig?.controller?.endpointId,
  ].filter((endpointId): endpointId is string => Boolean(endpointId));

  const routableConfigEndpointIds = [
    ...new Set(configEndpointIds.filter((endpointId) => routableEndpointIds.has(endpointId))),
  ];
  if (routableConfigEndpointIds.length > 0) {
    return {
      endpointId: routableConfigEndpointIds[0],
      preferredEndpointIds: routableConfigEndpointIds,
    };
  }

  if (!input.fixtureRoutingModel) {
    return undefined;
  }

  const routablePreferredEndpointIds = input.fixtureRoutingModel.preferredEndpointIds.filter(
    (endpointId) => routableEndpointIds.has(endpointId),
  );
  if (routablePreferredEndpointIds.length === 0) {
    return undefined;
  }

  const endpointId = routableEndpointIds.has(input.fixtureRoutingModel.endpointId)
    ? input.fixtureRoutingModel.endpointId
    : routablePreferredEndpointIds[0];

  return {
    endpointId,
    preferredEndpointIds: routablePreferredEndpointIds,
  };
}

export function summarizeRouterGuidance(input: {
  readonly routingModel?: RoutingModelSelection;
  readonly routableEndpointIds: readonly string[];
}): {
  readonly endpointId: string | null;
  readonly preferredEndpointIds: readonly string[];
  readonly ignoredEndpointIds: readonly string[];
} {
  if (!input.routingModel) {
    return {
      endpointId: null,
      preferredEndpointIds: [],
      ignoredEndpointIds: [],
    };
  }

  const routableEndpointIds = new Set(input.routableEndpointIds);
  const ignoredEndpointIds = input.routingModel.preferredEndpointIds.filter(
    (endpointId) => !routableEndpointIds.has(endpointId),
  );
  const preferredEndpointIds = input.routingModel.preferredEndpointIds.filter((endpointId) =>
    routableEndpointIds.has(endpointId),
  );

  return {
    endpointId:
      input.routingModel.endpointId && routableEndpointIds.has(input.routingModel.endpointId)
        ? input.routingModel.endpointId
        : (preferredEndpointIds[0] ?? null),
    preferredEndpointIds,
    ignoredEndpointIds,
  };
}
