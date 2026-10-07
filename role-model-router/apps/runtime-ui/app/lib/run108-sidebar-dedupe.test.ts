import { describe, expect, test } from "vitest";

import type {
  RuntimeEndpoint,
  RuntimeModelRecord,
  RuntimeTelemetryComparisonRow,
} from "./runtime-api";
import { buildSidebarModels } from "./sidebar-footer";

function endpoint(
  partial: Partial<RuntimeEndpoint> & Pick<RuntimeEndpoint, "endpointId" | "modelId">,
): RuntimeEndpoint {
  return {
    providerId: "provider",
    providerAccountId: "account",
    sourceType: "remote",
    status: "active",
    healthStatus: "healthy",
    routingEligible: true,
    benchmarkEligible: true,
    ...partial,
  };
}

describe("run108 R8 the sidebar renders each model exactly once", () => {
  test("duplicated endpoint entries collapse to unique sidebar row ids", () => {
    const models: RuntimeModelRecord[] = [
      { id: "deepseek/deepseek-flash", owned_by: "deepseek" },
    ] as RuntimeModelRecord[];
    // Two DISTINCT endpoint objects that are the same model + effort + display name - exactly the live
    // duplicated registry entries (flash-high appeared twice in the endpoints API).
    const endpoints = [
      endpoint({
        endpointId: "ep-flash-high-1",
        modelId: "deepseek/deepseek-flash",
        displayName: "DeepSeek V4.1 Flash",
        reasoningEffort: "high",
      }),
      endpoint({
        endpointId: "ep-flash-high-2",
        modelId: "deepseek/deepseek-flash",
        displayName: "DeepSeek V4.1 Flash",
        reasoningEffort: "high",
      }),
    ];
    const telemetryRows: RuntimeTelemetryComparisonRow[] = [];

    const rows = buildSidebarModels({ models, endpoints, telemetryRows });
    const ids = rows.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length); // RED today: two rows with the same id
    expect(ids.length).toBe(1);
  });
});
