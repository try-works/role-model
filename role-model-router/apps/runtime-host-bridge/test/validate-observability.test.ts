import { describe, expect, test } from "vitest";

import { runRuntimeObservabilityValidation } from "../src/validate-observability.js";

describe("runRuntimeObservabilityValidation", () => {
  test("proves structured request, capture, metrics, and otel observability over the real host path", async () => {
    const result = await runRuntimeObservabilityValidation();

    expect(result.routedRequestId).toBe("req-runtime-ui-routing-001");
    expect(result.telemetryListIncludesRoutedRequest).toBe(true);
    expect(result.routedRequestRoutingDecisionId).toBeTruthy();
    expect(result.mixedAliasTelemetryListIncludesRequest).toBe(true);
    expect(result.mixedAliasRouterDecisionMatchesRequest).toBe(true);
    expect(result.mixedAliasOverviewIncludesSelectedEndpoint).toBe(true);
  }, 60_000);
});
