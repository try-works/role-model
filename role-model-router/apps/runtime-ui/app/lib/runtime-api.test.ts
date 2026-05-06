import { describe, expect, test, vi } from "vitest";

import {
  activateRuntimeEndpoint,
  fetchDownstreamOpenAIProviderConfig,
  fetchRequestDetail,
  fetchRuntimeSnapshot,
  pollRuntimeDeviceAuthorization,
  startRuntimeDeviceAuthorization,
  submitWorkbenchChat,
} from "./runtime-api";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("fetchRuntimeSnapshot", () => {
  test("loads the operator shell data from the runtime control-plane endpoints", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;

      switch (url) {
        case "/api/role-model/runtime/summary":
          return jsonResponse({ providerCount: 3, accountCount: 2, endpointCount: 3 });
        case "/api/role-model/providers":
          return jsonResponse([{ providerId: "moonshotai" }]);
        case "/api/role-model/accounts":
          return jsonResponse([
            {
              providerAccountId: "moonshot.personal.primary",
              modelRoleBindings: [
                {
                  modelId: "moonshotai/kimi-k2.5",
                  roleIds: ["general.chat"],
                },
              ],
            },
          ]);
        case "/api/role-model/endpoints":
          return jsonResponse([{ endpointId: "openai.personal.primary.us-east-1.fast" }]);
        case "/api/role-model/roles":
          return jsonResponse([{ roleId: "general.chat", label: "General chat" }]);
        case "/api/role-model/requests":
          return jsonResponse([{ requestId: "req-001" }]);
        case "/v1/models":
          return jsonResponse({
            object: "list",
            data: [{ id: "openai/gpt-4.1-mini-fast", object: "model", owned_by: "role-model", endpoint_ids: [] }],
          });
        default:
          throw new Error(`Unexpected request: ${url}`);
      }
    });

    await expect(fetchRuntimeSnapshot(fetcher)).resolves.toEqual({
      summary: { providerCount: 3, accountCount: 2, endpointCount: 3 },
      providers: [{ providerId: "moonshotai" }],
      accounts: [
        {
          providerAccountId: "moonshot.personal.primary",
          modelRoleBindings: [
            {
              modelId: "moonshotai/kimi-k2.5",
              roleIds: ["general.chat"],
            },
          ],
        },
      ],
      endpoints: [{ endpointId: "openai.personal.primary.us-east-1.fast" }],
      requests: [{ requestId: "req-001" }],
      models: [
        { id: "openai/gpt-4.1-mini-fast", object: "model", owned_by: "role-model", endpoint_ids: [] },
      ],
      roles: [{ roleId: "general.chat", label: "General chat" }],
    });
  });
});

describe("fetchDownstreamOpenAIProviderConfig", () => {
  test("loads the downstream OpenAI-compatible provider contract for consumer apps", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/downstream/openai");

      return jsonResponse({
        kind: "openai-compatible",
        providerId: "role-model-runtime",
        displayName: "Role Model Runtime",
        baseUrl: "http://127.0.0.1:8091",
        endpoints: {
          health: "http://127.0.0.1:8091/healthz",
          models: "http://127.0.0.1:8091/v1/models",
          chatCompletions: "http://127.0.0.1:8091/v1/chat/completions",
        },
        authentication: {
          type: "bearer",
          headerName: "Authorization",
          required: false,
          placeholderToken: "role-model-local",
          note: "Inbound API-key validation is not enforced yet. If a downstream client requires a token field, use this placeholder bearer token.",
        },
        models: [
          {
            id: "moonshotai/kimi-k2.5",
            object: "model",
            owned_by: "role-model",
            endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"],
          },
        ],
        setup: {
          recommendedModel: "moonshotai/kimi-k2.5",
          notes: [
            "Configure downstream tooling as an OpenAI-compatible provider.",
            "Use GET /v1/models to discover the current model ids.",
            "Use POST /v1/chat/completions for routed chat inference.",
          ],
        },
      });
    });

    await expect(fetchDownstreamOpenAIProviderConfig(fetcher)).resolves.toEqual({
      kind: "openai-compatible",
      providerId: "role-model-runtime",
      displayName: "Role Model Runtime",
      baseUrl: "http://127.0.0.1:8091",
      endpoints: {
        health: "http://127.0.0.1:8091/healthz",
        models: "http://127.0.0.1:8091/v1/models",
        chatCompletions: "http://127.0.0.1:8091/v1/chat/completions",
      },
      authentication: {
        type: "bearer",
        headerName: "Authorization",
        required: false,
        placeholderToken: "role-model-local",
        note: "Inbound API-key validation is not enforced yet. If a downstream client requires a token field, use this placeholder bearer token.",
      },
      models: [
        {
          id: "moonshotai/kimi-k2.5",
          object: "model",
          owned_by: "role-model",
          endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"],
        },
      ],
      setup: {
        recommendedModel: "moonshotai/kimi-k2.5",
        notes: [
          "Configure downstream tooling as an OpenAI-compatible provider.",
          "Use GET /v1/models to discover the current model ids.",
          "Use POST /v1/chat/completions for routed chat inference.",
        ],
      },
    });
  });
});

describe("fetchRequestDetail", () => {
  test("loads request detail and the linked endpoint profile for the inspector pane", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;

      switch (url) {
        case "/api/role-model/requests/req-001":
          return jsonResponse({
            requestId: "req-001",
            endpointId: "openai.personal.primary.us-east-1.fast",
          });
        case "/api/role-model/endpoints/openai.personal.primary.us-east-1.fast/profile":
          return jsonResponse({
            endpointId: "openai.personal.primary.us-east-1.fast",
            latestProfile: { endpoint_id: "openai.personal.primary.us-east-1.fast" },
            recentSamples: [],
          });
        default:
          throw new Error(`Unexpected request: ${url}`);
      }
    });

    await expect(fetchRequestDetail("req-001", fetcher)).resolves.toEqual({
      request: {
        requestId: "req-001",
        endpointId: "openai.personal.primary.us-east-1.fast",
      },
      endpointProfile: {
        endpointId: "openai.personal.primary.us-east-1.fast",
        latestProfile: { endpoint_id: "openai.personal.primary.us-east-1.fast" },
        recentSamples: [],
      },
    });
  });
});

describe("submitWorkbenchChat", () => {
  test("posts a chat-completions payload to the runtime workbench path", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/v1/chat/completions");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual(
        expect.objectContaining({
          "content-type": "application/json",
        }),
      );
      expect(init?.body).toBe(
        JSON.stringify({
          model: "openai/gpt-4.1-mini-fast",
          messages: [{ role: "user", content: "Summarize the routing result." }],
        }),
      );

      return jsonResponse({
        choices: [{ message: { content: "Done." } }],
      });
    });

    await expect(
      submitWorkbenchChat(
        {
          model: "openai/gpt-4.1-mini-fast",
          messages: [{ role: "user", content: "Summarize the routing result." }],
        },
        fetcher,
      ),
    ).resolves.toEqual({
      choices: [{ message: { content: "Done." } }],
    });
  });
});

describe("startRuntimeDeviceAuthorization", () => {
  test("posts the selected provider account payload to the runtime device-auth start path", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/accounts/device/start");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual(
        expect.objectContaining({
          "content-type": "application/json",
        }),
      );
      expect(init?.body).toBe(
        JSON.stringify({
          providerAccountId: "moonshot.personal.kimi-code",
          providerId: "moonshotai",
          variantId: "kimi-code",
          allowedModels: ["moonshotai/kimi-k2.5"],
        }),
      );

      return jsonResponse({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "pending",
        userCode: "ABCD-EFGH",
      });
    });

    await expect(
      startRuntimeDeviceAuthorization(
        {
          providerAccountId: "moonshot.personal.kimi-code",
          providerId: "moonshotai",
          variantId: "kimi-code",
          allowedModels: ["moonshotai/kimi-k2.5"],
        },
        fetcher,
      ),
    ).resolves.toEqual({
      authRequestId: "auth-001",
      providerAccountId: "moonshot.personal.kimi-code",
      status: "pending",
      userCode: "ABCD-EFGH",
    });
  });
});

describe("pollRuntimeDeviceAuthorization", () => {
  test("posts the auth request id to the runtime device-auth poll path", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/accounts/device/poll");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(JSON.stringify({ authRequestId: "auth-001" }));

      return jsonResponse({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "connected",
      });
    });

    await expect(pollRuntimeDeviceAuthorization("auth-001", fetcher)).resolves.toEqual({
      authRequestId: "auth-001",
      providerAccountId: "moonshot.personal.kimi-code",
      status: "connected",
    });
  });
});

describe("activateRuntimeEndpoint", () => {
  test("posts endpoint activation payload to the runtime endpoints mutation path", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/endpoints");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshotai/kimi-k2.5",
          region: "global",
        }),
      );

      return jsonResponse({
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshotai/kimi-k2.5",
        status: "active",
      });
    });

    await expect(
      activateRuntimeEndpoint(
        {
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshotai/kimi-k2.5",
          region: "global",
        },
        fetcher,
      ),
    ).resolves.toEqual({
      endpointId: "moonshot.personal.primary.global.kimi-k2.5",
      providerAccountId: "moonshot.personal.primary",
      modelId: "moonshotai/kimi-k2.5",
      status: "active",
    });
  });
});
