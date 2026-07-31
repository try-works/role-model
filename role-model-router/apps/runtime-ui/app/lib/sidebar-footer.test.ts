import { describe, expect, test } from "vitest";

import type {
  RuntimeEndpoint,
  RuntimeModelRecord,
  RuntimeTelemetryComparisonRow,
  RuntimeTelemetryRequestRecord,
} from "./runtime-api";
import {
  buildSidebarModels,
  cacheHitRateFromRequest,
  createEmptySidebarFooter,
  formatRouterEndpointHost,
  mapEndpointHealthToSidebarStatus,
  resolveActiveRouterAlias,
} from "./sidebar-footer";

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

describe("sidebar-footer", () => {
  test("maps endpoint health into sidebar model statuses", () => {
    expect(mapEndpointHealthToSidebarStatus("healthy", "active")).toBe("active");
    expect(mapEndpointHealthToSidebarStatus("degraded", "active")).toBe("degraded");
    expect(mapEndpointHealthToSidebarStatus("offline", "active")).toBe("offline");
    expect(mapEndpointHealthToSidebarStatus(undefined, "active")).toBe("active");
  });

  test("builds inventory rows sorted by request count with rolled-up status", () => {
    const models: RuntimeModelRecord[] = [
      { id: "moonshot/kimi-k2.5", owned_by: "moonshot" },
      { id: "local/llama", owned_by: "local" },
    ] as RuntimeModelRecord[];
    const endpoints = [
      endpoint({
        endpointId: "ep-kimi",
        modelId: "moonshot/kimi-k2.5",
        healthStatus: "healthy",
      }),
      endpoint({
        endpointId: "ep-llama-a",
        modelId: "local/llama",
        healthStatus: "healthy",
      }),
      endpoint({
        endpointId: "ep-llama-b",
        modelId: "local/llama",
        healthStatus: "offline",
      }),
    ];
    const telemetryRows: RuntimeTelemetryComparisonRow[] = [
      {
        endpointId: "ep-kimi",
        modelId: "moonshot/kimi-k2.5",
        sourceType: "remote",
        requestCount: 12,
        successCount: 12,
        failureCount: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        cachedRequestCount: 0,
        totalActualCostUsd: 0,
        totalEstimatedCostUsd: 0,
        averageLatencyMs: null,
        p95LatencyMs: null,
        lastSeenAtMs: null,
      },
      {
        endpointId: "ep-llama-a",
        modelId: "local/llama",
        sourceType: "local",
        requestCount: 3,
        successCount: 3,
        failureCount: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        cachedRequestCount: 0,
        totalActualCostUsd: 0,
        totalEstimatedCostUsd: 0,
        averageLatencyMs: null,
        p95LatencyMs: null,
        lastSeenAtMs: null,
      },
    ];

    expect(buildSidebarModels({ models, endpoints, telemetryRows })).toEqual([
      { id: "moonshot/kimi-k2.5", status: "active", requestCount: 12 },
      { id: "local/llama", status: "degraded", requestCount: 3 },
    ]);
  });

  test("derives cache hit rate from the latest request", () => {
    const measured: RuntimeTelemetryRequestRecord = {
      requestId: "r1",
      endpointId: "ep",
      createdAtMs: 1,
      sourceType: "remote",
      promptCacheSupported: true,
      cacheReadTokensSupported: true,
      cacheReadTokens: 40,
      inputTokens: 100,
    };
    expect(cacheHitRateFromRequest(measured)).toBe(40);
    expect(
      cacheHitRateFromRequest({
        ...measured,
        cacheReadTokensSupported: false,
        promptCacheUsed: true,
      }),
    ).toBe(100);
    expect(cacheHitRateFromRequest(null)).toBe(0);
  });

  test("resolves active alias and router endpoint host", () => {
    expect(
      resolveActiveRouterAlias({
        config: { routingStrategy: "baseline", executionMode: "remote_only" } as never,
        summary: null,
      }),
    ).toBe("baseline.remote-only");
    expect(formatRouterEndpointHost({ baseUrl: "http://127.0.0.1:8091" } as never)).toBe(
      "127.0.0.1:8091/v1",
    );
    expect(formatRouterEndpointHost(null, "127.0.0.1:3456")).toBe("127.0.0.1:3456/v1");
  });

  test("empty footer uses the provided host until live data loads", () => {
    expect(createEmptySidebarFooter("127.0.0.1:3470")).toEqual({
      models: [],
      cacheHitRate: 0,
      routerEndpoint: "127.0.0.1:3470/v1",
      routerAlias: "—",
    });
  });
});
