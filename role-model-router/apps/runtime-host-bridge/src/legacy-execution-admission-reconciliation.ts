import type { RuntimeEndpointRecord } from "@role-model-router/sqlite-memory";

import type { ExecutionCircuitState } from "./execution-circuit-breaker.js";

function isTransientFailureCategory(
  category: ExecutionCircuitState["endpoints"][string]["failureCategory"],
): boolean {
  return (
    category === "connection" ||
    category === "timeout" ||
    category === "provider_5xx" ||
    category === "rate_limit"
  );
}

function hasCompleteSourceChain(record: ExecutionCircuitState["endpoints"][string]): boolean {
  return Boolean(
    record.sourceAttemptId && record.sourceRequestId && record.sourceRoutingDecisionId,
  );
}

/**
 * Repairs the single legacy row shape created by the pre-Run-96 execution failure
 * path. It intentionally refuses to infer admission from an uncorrelated circuit,
 * and never repairs auth or quota circuits because those remain durable blocks.
 */
export function reconcileLegacyExecutionAdmissionRows(input: {
  readonly endpoints: readonly RuntimeEndpointRecord[];
  readonly circuits: ExecutionCircuitState;
}): {
  readonly endpoints: readonly RuntimeEndpointRecord[];
  readonly restoredEndpointIds: readonly string[];
} {
  const restoredEndpointIds: string[] = [];
  const endpoints = input.endpoints.map((endpoint) => {
    const circuit = input.circuits.endpoints[endpoint.endpointId];
    const isLegacyTransientDegradation =
      endpoint.lifecycleState === "degraded" &&
      endpoint.healthStatus === "degraded" &&
      circuit !== undefined &&
      isTransientFailureCategory(circuit.failureCategory) &&
      hasCompleteSourceChain(circuit);
    if (!isLegacyTransientDegradation) {
      return endpoint;
    }
    restoredEndpointIds.push(endpoint.endpointId);
    return {
      ...endpoint,
      lifecycleState: "active",
      healthStatus: "healthy",
    };
  });

  return {
    endpoints,
    restoredEndpointIds: restoredEndpointIds.sort((left, right) => left.localeCompare(right)),
  };
}
