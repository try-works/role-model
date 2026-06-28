import { describe, expect, test, vi } from "vitest";

import {
  createRuntimeInspectionClient,
  selectLatestRuntimeRequest,
} from "../src/runtime-inspection.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("runtime inspection helpers", () => {
  test("selects the latest runtime request by timestamp", () => {
    expect(
      selectLatestRuntimeRequest([
        { requestId: "req-001", createdAtMs: 10 },
        { requestId: "req-003", createdAtMs: 30 },
        { requestId: "req-002", createdAtMs: 20 },
      ]),
    ).toEqual({ requestId: "req-003", createdAtMs: 30 });
  });

  test("lists recent requests with runtime-owned summaries", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      expect(url).toBe("http://127.0.0.1:3456/api/role-model/requests");
      return jsonResponse([
        {
          requestId: "req-001",
          createdAtMs: 100,
          taxonomyTaskType: "general.chat",
          modelId: "openai/gpt-5-mini",
          statusFamily: "success",
        },
        {
          requestId: "req-002",
          createdAtMs: 200,
          taxonomyTaskType: "coder.review",
          modelId: "moonshot/kimi-k2.5",
          statusFamily: "failure",
        },
      ]);
    });

    const client = createRuntimeInspectionClient({ fetch: fetcher });
    const result = await client.listRuntimeRequests();

    expect(result).toContain("Recent Role-Model requests (2)");
    expect(result).toContain("req-002");
    expect(result).toContain("coder.review");
    expect(result).toContain("moonshot/kimi-k2.5");
    expect(result).toContain("failure");
    expect(result.indexOf("req-002")).toBeLessThan(result.indexOf("req-001"));
  });

  test("uses ROLE_MODEL_ENDPOINT for inspection when no endpoint override is provided", async () => {
    const previous = process.env.ROLE_MODEL_ENDPOINT;
    process.env.ROLE_MODEL_ENDPOINT = "http://127.0.0.1:4567/";
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      expect(String(input)).toBe("http://127.0.0.1:4567/api/role-model/requests");
      return jsonResponse([]);
    });

    try {
      const client = createRuntimeInspectionClient({ fetch: fetcher });
      const result = await client.listRuntimeRequests();
      expect(result).toContain("http://127.0.0.1:4567");
    } finally {
      if (previous === undefined) {
        delete process.env.ROLE_MODEL_ENDPOINT;
      } else {
        process.env.ROLE_MODEL_ENDPOINT = previous;
      }
    }
  });

  test("explains the latest request with runtime-owned routing and benchmark signals", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      switch (url) {
        case "http://127.0.0.1:3456/api/role-model/requests":
          return jsonResponse([
            { requestId: "req-001", createdAtMs: 100 },
            { requestId: "req-002", createdAtMs: 200 },
          ]);
        case "http://127.0.0.1:3456/api/role-model/requests/req-002":
          return jsonResponse({
            request: {
              requestId: "req-002",
              endpointId: "moonshot.personal.primary.global.kimi-k2.5",
              usageEvent: {
                model_id: "moonshot/kimi-k2.5",
                latency_ms: 420,
              },
              telemetrySnapshot: {
                totalAvoidedCostUsd: 0.0074,
              },
              taxonomyDimensions: {
                taxonomy_group_id: "engineering",
                taxonomy_role_id: "coder",
                taxonomy_task_type: "coder.review",
              },
              routingDiagnostics: {
                routingMode: { effectiveMode: "hybrid" },
                controllerRouting: {
                  acceptedDirectives: {
                    strategy: "hybrid.remote-only",
                    taskType: "coder.review",
                  },
                },
                hybridArbitration: {
                  dominantSignal: "benchmark_quality",
                  finalStrategy: "remote-only",
                },
              },
            },
            endpointProfile: {
              latestProfile: {
                judge_score: 0.93,
                quality_benchmark_samples: 8,
              },
            },
          });
        case "http://127.0.0.1:3456/api/role-model/router/decisions/req-002":
          return jsonResponse({
            requestId: "req-002",
            selectedEndpointId: "moonshot.personal.primary.global.kimi-k2.5",
            selectedModelId: "moonshot/kimi-k2.5",
            strategyLabel: "hybrid",
            observeRequestPath: "/app/observe/requests/req-002",
          });
        default:
          throw new Error(`Unexpected request: ${url}`);
      }
    });

    const client = createRuntimeInspectionClient({ fetch: fetcher });
    const result = await client.explainLatestRuntimeRequest();

    expect(result).toContain("Role-Model runtime explanation for req-002");
    expect(result).toContain("endpoint: moonshot.personal.primary.global.kimi-k2.5");
    expect(result).toContain("model: moonshot/kimi-k2.5");
    expect(result).toContain("taxonomy task: coder.review");
    expect(result).toContain("avoided cost usd: $0.0074");
    expect(result).toContain("controller strategy: hybrid.remote-only");
    expect(result).toContain("hybrid dominant signal: benchmark_quality");
    expect(result).toContain("benchmark score: 0.93");
    expect(result).toContain("benchmark samples: 8");
  });

  test("fails cleanly when the runtime has no recent requests", async () => {
    const fetcher = vi.fn(async () => jsonResponse([]));
    const client = createRuntimeInspectionClient({ fetch: fetcher });

    await expect(client.explainLatestRuntimeRequest()).rejects.toThrow(
      "No recent Role-Model runtime requests were found",
    );
  });
});
