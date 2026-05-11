import { describe, expect, test, vi } from "vitest";

import {
  activateRuntimeEndpoint,
  fetchAudioVoices,
  fetchActivityCapture,
  fetchActivityMetrics,
  fetchTelemetryDashboard,
  fetchTelemetryRequests,
  fetchDownstreamOpenAIProviderConfig,
  fetchControllerAssignment,
  fetchRequestDetail,
  fetchRuntimeConfig,
  fetchRuntimeSnapshot,
  fetchVersionInfo,
  fetchTextLogs,
  pollRuntimeDeviceAuthorization,
  subscribeTelemetryStream,
  submitAdvancedRequest,
  submitAudioTranscription,
  submitImageGeneration,
  submitRerankRequest,
  submitSdApiTxt2Img,
  submitSpeechGeneration,
  startRuntimeDeviceAuthorization,
  submitWorkbenchChat,
  updateRuntimeConfig,
  updateControllerAssignment,
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
          return jsonResponse([{ providerId: "moonshot" }]);
        case "/api/role-model/accounts":
          return jsonResponse([
            {
              providerAccountId: "moonshot.personal.primary",
              modelRoleBindings: [
                {
                  modelId: "moonshot/kimi-k2.5",
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
      providers: [{ providerId: "moonshot" }],
      accounts: [
        {
          providerAccountId: "moonshot.personal.primary",
          modelRoleBindings: [
            {
              modelId: "moonshot/kimi-k2.5",
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
            id: "moonshot/kimi-k2.5",
            object: "model",
            owned_by: "role-model",
            endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"],
          },
        ],
        setup: {
          recommendedModel: "moonshot/kimi-k2.5",
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
          id: "moonshot/kimi-k2.5",
          object: "model",
          owned_by: "role-model",
          endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"],
        },
      ],
      setup: {
        recommendedModel: "moonshot/kimi-k2.5",
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

describe("telemetry APIs", () => {
  test("loads the canonical telemetry dashboard reads from the role-model telemetry endpoints", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;

      switch (url) {
        case "/api/role-model/telemetry/summary":
          return jsonResponse({
            requestCount: 3,
            successCount: 2,
            failureCount: 1,
            totalInputTokens: 96,
            totalOutputTokens: 30,
            totalTokens: 126,
            cachedRequestCount: 1,
            totalActualCostUsd: 0.0042,
            totalEstimatedCostUsd: 0.0053,
            averageLatencyMs: 420,
            p95LatencyMs: 880,
            lastSeenAtMs: 1_770_000_000_100,
            sourceBreakdown: {
              local: {
                requestCount: 1,
                successCount: 1,
                failureCount: 0,
                totalInputTokens: 32,
                totalOutputTokens: 14,
                totalTokens: 46,
                cachedRequestCount: 0,
                totalActualCostUsd: 0,
                totalEstimatedCostUsd: 0.0011,
                averageLatencyMs: 280,
                p95LatencyMs: 280,
                lastSeenAtMs: 1_770_000_000_000,
              },
              remote: {
                requestCount: 2,
                successCount: 1,
                failureCount: 1,
                totalInputTokens: 64,
                totalOutputTokens: 16,
                totalTokens: 80,
                cachedRequestCount: 1,
                totalActualCostUsd: 0.0042,
                totalEstimatedCostUsd: 0.0042,
                averageLatencyMs: 490,
                p95LatencyMs: 880,
                lastSeenAtMs: 1_770_000_000_100,
              },
            },
          });
        case "/api/role-model/telemetry/rows":
          return jsonResponse([
            {
              endpointId: "llama-swap.local.local-mock-llama",
              modelId: "local/mock-llama",
              sourceType: "local",
              providerFamily: "llama-swap",
              promptCacheSupported: false,
              requestCount: 1,
            },
            {
              endpointId: "openai.personal.primary.us-east-1.fast",
              modelId: "openai/gpt-4.1-mini-fast",
              sourceType: "remote",
              providerFamily: "ai-sdk-openai",
              promptCacheSupported: true,
              requestCount: 2,
            },
          ]);
        case "/api/role-model/telemetry/requests":
          return jsonResponse([
            {
              requestId: "req-002",
              endpointId: "openai.personal.primary.us-east-1.fast",
              sourceType: "remote",
              providerFamily: "ai-sdk-openai",
              finishReason: "stop",
              promptCacheSupported: true,
              streamTextDeltaCount: 4,
            },
          ]);
        default:
          throw new Error(`Unexpected request: ${url}`);
      }
    });

    await expect(fetchTelemetryDashboard(fetcher)).resolves.toEqual({
      summary: expect.objectContaining({
        requestCount: 3,
        sourceBreakdown: expect.objectContaining({
          local: expect.objectContaining({ requestCount: 1 }),
          remote: expect.objectContaining({ requestCount: 2 }),
        }),
      }),
      rows: [
          {
            endpointId: "llama-swap.local.local-mock-llama",
            modelId: "local/mock-llama",
            sourceType: "local",
            providerFamily: "llama-swap",
            promptCacheSupported: false,
            requestCount: 1,
          },
          {
            endpointId: "openai.personal.primary.us-east-1.fast",
            modelId: "openai/gpt-4.1-mini-fast",
            sourceType: "remote",
            providerFamily: "ai-sdk-openai",
            promptCacheSupported: true,
            requestCount: 2,
          },
        ],
      requests: [
          {
            requestId: "req-002",
            endpointId: "openai.personal.primary.us-east-1.fast",
            sourceType: "remote",
            providerFamily: "ai-sdk-openai",
            finishReason: "stop",
            promptCacheSupported: true,
            streamTextDeltaCount: 4,
          },
        ],
      });
  });

  test("loads telemetry request rows with limit parameters", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      expect(url).toContain("/api/role-model/telemetry/requests?limit=25");
      return jsonResponse([
        {
          requestId: "req-001",
          endpointId: "llama-swap.local.local-mock-llama",
          sourceType: "local",
        },
      ]);
    });

    await expect(fetchTelemetryRequests({ limit: 25 }, fetcher)).resolves.toEqual([
      {
        requestId: "req-001",
        endpointId: "llama-swap.local.local-mock-llama",
        sourceType: "local",
      },
    ]);
  });

  test("subscribes to canonical telemetry SSE updates and closes the source on cleanup", () => {
    let listener: (event: MessageEvent<string>) => void = () => {
      throw new Error("telemetry listener was not registered");
    };
    const close = vi.fn();
    const factory = vi.fn(() => ({
      addEventListener(type: string, handler: (event: MessageEvent<string>) => void) {
        expect(type).toBe("telemetry.update");
        listener = handler;
      },
      close,
    }));
    const onEvent = vi.fn();

    const dispose = subscribeTelemetryStream(onEvent, factory);

    listener({
      data: JSON.stringify({
        eventName: "telemetry.update",
        emittedAtMs: 1_770_000_000_100,
        request: {
          requestId: "req-telemetry-001",
          sourceType: "remote",
        },
      }),
    } as MessageEvent<string>);

    expect(factory).toHaveBeenCalledWith("/api/role-model/telemetry/stream");
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "telemetry.update",
        request: expect.objectContaining({
          requestId: "req-telemetry-001",
          sourceType: "remote",
        }),
      }),
    );

    dispose();
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe("observe APIs", () => {
  test("loads vendor activity metrics for the observe activity page", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/metrics");

      return jsonResponse([
        {
          id: 7,
          timestamp: "2026-05-07T04:00:00.000Z",
          model: "moonshot/kimi-k2.5",
          req_path: "/v1/chat/completions",
          resp_content_type: "application/json",
          resp_status_code: 200,
          tokens: {
            cache_tokens: 12,
            input_tokens: 44,
            output_tokens: 19,
            prompt_per_second: 88.1,
            tokens_per_second: 45.2,
          },
          duration_ms: 840,
          has_capture: true,
        },
      ]);
    });

    await expect(fetchActivityMetrics(fetcher)).resolves.toEqual([
      {
        id: 7,
        timestamp: "2026-05-07T04:00:00.000Z",
        model: "moonshot/kimi-k2.5",
        req_path: "/v1/chat/completions",
        resp_content_type: "application/json",
        resp_status_code: 200,
        tokens: {
          cache_tokens: 12,
          input_tokens: 44,
          output_tokens: 19,
          prompt_per_second: 88.1,
          tokens_per_second: 45.2,
        },
        duration_ms: 840,
        has_capture: true,
      },
    ]);
  });

  test("loads a persisted request/response capture by id", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/captures/7");

      return jsonResponse({
        id: 7,
        req_path: "/v1/chat/completions",
        req_headers: {
          authorization: "Bearer role-model-local",
        },
        req_body: "e30=",
        resp_headers: {
          "content-type": "application/json",
        },
        resp_body: "W10=",
      });
    });

    await expect(fetchActivityCapture(7, fetcher)).resolves.toEqual({
      id: 7,
      req_path: "/v1/chat/completions",
      req_headers: {
        authorization: "Bearer role-model-local",
      },
      req_body: "e30=",
      resp_headers: {
        "content-type": "application/json",
      },
      resp_body: "W10=",
    });
  });

  test("returns null when an activity capture is not found", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: "capture not found" }), { status: 404 }));

    await expect(fetchActivityCapture(404, fetcher)).resolves.toBeNull();
  });

  test("loads raw log text for observe log consoles", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/logs");

      return new Response("proxy ready\nupstream warm\n", {
        status: 200,
        headers: {
          "content-type": "text/plain",
        },
      });
    });

    await expect(fetchTextLogs("/logs", fetcher)).resolves.toBe("proxy ready\nupstream warm\n");
  });

  test("loads vendor version info for the runtime system surface", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/version");

      return jsonResponse({
        version: "1.2.3",
        commit: "abc123",
        build_date: "2026-05-07",
      });
    });

    await expect(fetchVersionInfo(fetcher)).resolves.toEqual({
      version: "1.2.3",
      commit: "abc123",
      build_date: "2026-05-07",
    });
  });
});

describe("controller assignment APIs", () => {
  test("loads the current global controller assignment", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/controller");

      return jsonResponse({
        scope: "global",
        endpointId: "cli.local.coder",
        modelId: "gpt-5.4",
        sourceType: "local",
        status: "active",
      });
    });

    await expect(fetchControllerAssignment(fetcher)).resolves.toEqual({
      scope: "global",
      endpointId: "cli.local.coder",
      modelId: "gpt-5.4",
      sourceType: "local",
      status: "active",
    });
  });

  test("loads a null controller assignment when no controller is configured yet", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/controller");

      return jsonResponse(null);
    });

    await expect(fetchControllerAssignment(fetcher)).resolves.toBeNull();
  });

  test("patches the selected controller candidate", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/controller");
      expect(init?.method).toBe("PATCH");
      expect(init?.body).toBe(
        JSON.stringify({
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        }),
      );

      return jsonResponse({
        scope: "global",
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        modelId: "moonshot/kimi-k2.5",
        sourceType: "remote",
        status: "active",
      });
    });

    await expect(
      updateControllerAssignment(
        {
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        },
        fetcher,
      ),
    ).resolves.toEqual({
      scope: "global",
      endpointId: "moonshot.personal.primary.global.kimi-k2.5",
      modelId: "moonshot/kimi-k2.5",
      sourceType: "remote",
      status: "active",
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

  test("sends routing-mode override as a header instead of leaking it into the OpenAI-compatible body", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/v1/chat/completions");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual(
        expect.objectContaining({
          "content-type": "application/json",
          "x-role-model-routing-mode": "hybrid",
        }),
      );
      expect(init?.body).toBe(
        JSON.stringify({
          model: "gpt-5.4",
          messages: [{ role: "user", content: "Route this through the hybrid path." }],
        }),
      );

      return jsonResponse({
        choices: [{ message: { content: "Handled." } }],
      });
    });

    const payload: import("./runtime-api").WorkbenchChatInput & { routingModeOverride: "hybrid" } = {
      model: "gpt-5.4",
      messages: [{ role: "user", content: "Route this through the hybrid path." }],
      routingModeOverride: "hybrid",
    };

    await expect(submitWorkbenchChat(payload, fetcher)).resolves.toEqual({
      choices: [{ message: { content: "Handled." } }],
    });
  });
});

describe("studio vendor API helpers", () => {
  test("posts an OpenAI image-generation request", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/v1/images/generations");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({
          model: "gpt-image-1",
          prompt: "Swiss design poster",
          n: 1,
          size: "1024x1024",
        }),
      );
      return jsonResponse({
        created: 123,
        data: [{ b64_json: "aW1hZ2U=" }],
      });
    });

    await expect(
      submitImageGeneration(
        {
          model: "gpt-image-1",
          prompt: "Swiss design poster",
          n: 1,
          size: "1024x1024",
        },
        fetcher,
      ),
    ).resolves.toEqual({
      created: 123,
      data: [{ b64_json: "aW1hZ2U=" }],
    });
  });

  test("posts an SDAPI txt2img request", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/sdapi/v1/txt2img");
      expect(init?.method).toBe("POST");
      return jsonResponse({
        images: ["c2Q="],
        parameters: { prompt: "Poster" },
        info: "ok",
      });
    });

    await expect(submitSdApiTxt2Img({ prompt: "Poster", width: 512, height: 512 }, fetcher)).resolves.toEqual({
      images: ["c2Q="],
      parameters: { prompt: "Poster" },
      info: "ok",
    });
  });

  test("loads available speech voices for a selected model", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? `${input.pathname}${input.search}` : input.url;
      expect(url).toBe("/v1/audio/voices?model=moonshot%2Fkimi-audio");
      return jsonResponse([{ id: "alloy", name: "Alloy" }]);
    });

    await expect(fetchAudioVoices("moonshot/kimi-audio", fetcher)).resolves.toEqual([
      { id: "alloy", name: "Alloy" },
    ]);
  });

  test("posts a speech-generation request and returns audio bytes as a blob", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/v1/audio/speech");
      expect(init?.method).toBe("POST");
      return new Response("audio-data", {
        status: 200,
        headers: {
          "content-type": "audio/mpeg",
        },
      });
    });

    const blob = await submitSpeechGeneration(
      {
        model: "moonshot/kimi-audio",
        input: "Read this out loud.",
        voice: "alloy",
      },
      fetcher,
    );
    await expect(blob.text()).resolves.toBe("audio-data");
  });

  test("posts a multipart transcription request", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/v1/audio/transcriptions");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeInstanceOf(FormData);
      return jsonResponse({ text: "Decoded transcript" });
    });

    const file = new File(["audio-bytes"], "clip.wav", { type: "audio/wav" });
    await expect(
      submitAudioTranscription(
        {
          file,
          model: "moonshot/kimi-audio",
        },
        fetcher,
      ),
    ).resolves.toEqual({ text: "Decoded transcript" });
  });

  test("posts a rerank request to the selected vendor path", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/v1/reranking");
      expect(init?.method).toBe("POST");
      return jsonResponse({
        results: [{ index: 1, relevance_score: 0.91 }],
        usage: { total_tokens: 32 },
      });
    });

    await expect(
      submitRerankRequest(
        {
          model: "cohere/rerank-v3.5",
          query: "routing policy",
          documents: ["overview", "routing policy", "glossary"],
        },
        "/v1/reranking",
        fetcher,
      ),
    ).resolves.toEqual({
      results: [{ index: 1, relevance_score: 0.91 }],
      usage: { total_tokens: 32 },
    });
  });

  test("posts a raw advanced API request to the selected endpoint family", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/v1/responses");
      expect(init?.method).toBe("POST");
      return jsonResponse({
        id: "resp_123",
        output: [{ type: "message" }],
      });
    });

    await expect(
      submitAdvancedRequest(
        "/v1/responses",
        {
          model: "openai/gpt-4.1-mini-fast",
          input: "Summarize the endpoint registry.",
        },
        fetcher,
      ),
    ).resolves.toEqual({
      id: "resp_123",
      output: [{ type: "message" }],
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
          providerId: "moonshot",
          variantId: "kimi-code",
          allowedModels: ["moonshot/kimi-k2.5"],
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
          providerId: "moonshot",
          variantId: "kimi-code",
          allowedModels: ["moonshot/kimi-k2.5"],
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
          modelId: "moonshot/kimi-k2.5",
          region: "global",
        }),
      );

      return jsonResponse({
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshot/kimi-k2.5",
        status: "active",
      });
    });

    await expect(
      activateRuntimeEndpoint(
        {
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.5",
          region: "global",
        },
        fetcher,
      ),
    ).resolves.toEqual({
      endpointId: "moonshot.personal.primary.global.kimi-k2.5",
      providerAccountId: "moonshot.personal.primary",
      modelId: "moonshot/kimi-k2.5",
      status: "active",
    });
  });
});

describe("fetchRuntimeConfig", () => {
  test("loads the normalized unified runtime config from the runtime control plane", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/runtime/config");

      return jsonResponse({
        applied: true,
        path: "D:\\runtime-config.yaml",
        config: {
          version: "1.0",
          executionMode: "hybrid",
          llamaSwap: {
            enabled: true,
            models: [{ modelId: "local/mock-llama", path: "./models/mock-llama.gguf" }],
            process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
          },
          liteLLM: {
            enabled: true,
            providers: [{ providerId: "moonshot", modelMappings: [{ modelId: "moonshot/kimi-k2.5" }] }],
            process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
          },
        },
      });
    });

    await expect(fetchRuntimeConfig(fetcher)).resolves.toEqual({
      applied: true,
      path: "D:\\runtime-config.yaml",
      config: {
        version: "1.0",
        executionMode: "hybrid",
        llamaSwap: {
          enabled: true,
          models: [{ modelId: "local/mock-llama", path: "./models/mock-llama.gguf" }],
          process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
        },
        liteLLM: {
          enabled: true,
          providers: [{ providerId: "moonshot", modelMappings: [{ modelId: "moonshot/kimi-k2.5" }] }],
          process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
        },
      },
    });
  });
});

describe("updateRuntimeConfig", () => {
  test("puts the normalized unified runtime config to the runtime control plane", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/runtime/config");
      expect(init?.method).toBe("PUT");
      expect(init?.headers).toEqual(
        expect.objectContaining({
          "content-type": "application/json",
        }),
      );
      expect(init?.body).toBe(
        JSON.stringify({
          version: "1.0",
          routingStrategy: "balanced",
          llamaSwap: {
            models: [{ modelId: "local/mock-llama", path: "./models/mock-llama-v2.gguf" }],
            process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
          },
          liteLLM: {
            providers: [{ providerId: "moonshot", modelMappings: [{ modelId: "moonshot/kimi-k2.5" }] }],
            process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
          },
        }),
      );

      return jsonResponse({
        applied: true,
        path: "D:\\runtime-config.yaml",
        config: {
          version: "1.0",
          executionMode: "hybrid",
        },
      });
    });

    await expect(
      updateRuntimeConfig(
        {
          version: "1.0",
          routingStrategy: "balanced",
          llamaSwap: {
            models: [{ modelId: "local/mock-llama", path: "./models/mock-llama-v2.gguf" }],
            process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
          },
          liteLLM: {
            providers: [{ providerId: "moonshot", modelMappings: [{ modelId: "moonshot/kimi-k2.5" }] }],
            process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
          },
        },
        fetcher,
      ),
    ).resolves.toEqual({
      applied: true,
      path: "D:\\runtime-config.yaml",
      config: {
        version: "1.0",
        executionMode: "hybrid",
      },
    });
  });
});
