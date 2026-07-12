import { describe, expect, test } from "vitest";

import { inspectRequest, listRecentRequests } from "../src/runtime-inspection.js";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("runtime inspection helpers", () => {
  test("uses ROLE_MODEL_ENDPOINT when no explicit endpoint override is provided", async () => {
    const calls: string[] = [];
    const originalEndpoint = process.env.ROLE_MODEL_ENDPOINT;
    process.env.ROLE_MODEL_ENDPOINT = "http://127.0.0.1:4567/";
    try {
      await listRecentRequests({
        fetch: async (input) => {
          calls.push(String(input));
          return jsonResponse([]);
        },
      });
    } finally {
      if (originalEndpoint === undefined) {
        delete process.env.ROLE_MODEL_ENDPOINT;
      } else {
        process.env.ROLE_MODEL_ENDPOINT = originalEndpoint;
      }
    }

    expect(calls).toEqual(["http://127.0.0.1:4567/api/role-model/requests"]);
  });

  test("lists recent structured runtime requests", async () => {
    const requests = await listRecentRequests({
      fetch: async () =>
        jsonResponse([
          {
            requestId: "req-001",
            endpointId: "openai.primary",
            modelId: "openai/gpt-5.4",
            providerId: "openai",
            status: "succeeded",
            createdAtMs: 1_770_000_000_000,
            normalizedIntent: {
              roleId: "security",
              taskType: "security.audit",
            },
          },
        ]),
      limit: 1,
    });

    expect(requests).toEqual([
      expect.objectContaining({
        requestId: "req-001",
        endpointId: "openai.primary",
        modelId: "openai/gpt-5.4",
      }),
    ]);
  });

  test("loads request inspection and linked router decision detail", async () => {
    const inspection = await inspectRequest({
      requestId: "req-001",
      fetch: async (input) => {
        const url = String(input);
        if (url.endsWith("/api/role-model/requests/req-001")) {
          return jsonResponse({
            requestId: "req-001",
            endpointId: "openai.primary",
            modelId: "openai/gpt-5.4",
            providerId: "openai",
            status: "succeeded",
            normalizedIntent: {
              roleId: "security",
              taskType: "security.audit",
            },
          });
        }
        if (url.endsWith("/api/role-model/router/decisions/req-001")) {
          return jsonResponse({
            requestId: "req-001",
            selectedEndpointId: "openai.primary",
            selectedModelId: "openai/gpt-5.4",
            strategyLabel: "quality",
            decision: {
              selection_reasons: ["BENCHMARK_TASK_SCORE"],
            },
            observeRequestPath: "/app/observe/requests/req-001",
          });
        }
        return jsonResponse({ error: "not found" }, 404);
      },
    });

    expect(inspection).toEqual(
      expect.objectContaining({
        runtimeBaseUrl: "http://127.0.0.1:3456",
        request: expect.objectContaining({
          requestId: "req-001",
        }),
        routerDecision: expect.objectContaining({
          strategyLabel: "quality",
        }),
      }),
    );
  });

  test("returns null when the runtime request does not exist", async () => {
    await expect(
      inspectRequest({
        requestId: "req-missing",
        fetch: async () => jsonResponse({ error: "not found" }, 404),
      }),
    ).resolves.toBeNull();
  });
});
