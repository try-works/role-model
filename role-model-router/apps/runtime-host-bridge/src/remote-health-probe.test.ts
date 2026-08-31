import { describe, expect, it } from "vitest";

import {
  type RemoteHealthProbeContext,
  buildModelsProbeUrl,
  extractOpenAIModelIds,
  mapProbeReasonToHealthStatus,
  probeRemoteEndpoints,
} from "./remote-health-probe.js";

describe("remote-health-probe", () => {
  it("marks endpoint healthy when /v1/models lists the target model", async () => {
    const result = await probeRemoteEndpoints({
      litellmHealthy: true,
      targets: [
        {
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.5",
          apiBase: "https://api.moonshot.ai/v1",
          servingSource: "remote-service",
        },
      ],
      resolveAuthorization: async () => "moonshot-live-key",
      networkFetcher: async (input) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "https://api.moonshot.ai/v1/models") {
          return new Response(
            JSON.stringify({
              data: [{ id: "moonshot/kimi-k2.5" }, { id: "moonshot/kimi-k2.6" }],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        throw new Error(`Unexpected request: ${url}`);
      },
    });

    expect(result.probed).toBe(1);
    expect(result.healthy).toBe(1);
    expect(result.results[0]).toMatchObject({
      endpointId: "moonshot.personal.primary.global.kimi-k2.5",
      reason: "healthy",
      healthStatus: "healthy",
    });
  });

  it("coalesces one model-list request across effort siblings on the same provider account", async () => {
    let requestCount = 0;
    const result = await probeRemoteEndpoints({
      litellmHealthy: true,
      targets: [
        {
          endpointId: "deepseek.personal.primary.global.deepseek-v4-flash",
          providerAccountId: "deepseek.personal.primary",
          modelId: "deepseek/deepseek-v4-flash",
          apiBase: "https://api.deepseek.com/v1",
          servingSource: "remote-service",
        },
        {
          endpointId: "deepseek.personal.primary.global.deepseek-v4-flash-max",
          providerAccountId: "deepseek.personal.primary",
          modelId: "deepseek/deepseek-v4-flash",
          apiBase: "https://api.deepseek.com/v1",
          servingSource: "remote-service",
        },
        {
          endpointId: "deepseek.personal.primary.global.deepseek-v4-pro-max",
          providerAccountId: "deepseek.personal.primary",
          modelId: "deepseek/deepseek-v4-pro",
          apiBase: "https://api.deepseek.com/v1",
          servingSource: "remote-service",
        },
      ],
      resolveAuthorization: async () => "deepseek-live-key",
      networkFetcher: async () => {
        requestCount += 1;
        return new Response(
          JSON.stringify({ data: [{ id: "deepseek-v4-flash" }, { id: "deepseek-v4-pro" }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    expect(requestCount).toBe(1);
    expect(result).toMatchObject({ probed: 3, healthy: 3, degraded: 0 });
    expect(result.results).toMatchObject([
      {
        endpointId: "deepseek.personal.primary.global.deepseek-v4-flash",
        modelId: "deepseek/deepseek-v4-flash",
        reason: "healthy",
      },
      {
        endpointId: "deepseek.personal.primary.global.deepseek-v4-flash-max",
        modelId: "deepseek/deepseek-v4-flash",
        reason: "healthy",
      },
      {
        endpointId: "deepseek.personal.primary.global.deepseek-v4-pro-max",
        modelId: "deepseek/deepseek-v4-pro",
        reason: "healthy",
      },
    ]);
  });

  it("maps auth failures to degraded health with auth reason", async () => {
    const result = await probeRemoteEndpoints({
      litellmHealthy: true,
      targets: [
        {
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.5",
          apiBase: "https://api.moonshot.ai/v1",
          servingSource: "remote-service",
        },
      ],
      resolveAuthorization: async () => "bad-key",
      networkFetcher: async () =>
        new Response(JSON.stringify({ error: "invalid api key" }), { status: 401 }),
    });

    expect(result.results[0]).toMatchObject({
      reason: "auth",
      healthStatus: mapProbeReasonToHealthStatus("auth"),
    });
  });

  it("retries auth failures once with refreshed authorization", async () => {
    const seenAuthorizations: string[] = [];
    let requestCount = 0;
    const result = await probeRemoteEndpoints({
      litellmHealthy: true,
      targets: [
        {
          endpointId: "moonshot.personal.primary.global.kimi-k2.7-code",
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.7-code",
          apiBase: "https://api.moonshot.ai/v1",
          servingSource: "remote-service",
        },
      ],
      resolveAuthorization: async () => "stale-token",
      refreshAuthorization: async () => "fresh-token",
      networkFetcher: async (_input: string | URL | Request, init?: RequestInit) => {
        requestCount += 1;
        const authorization = String(
          init && "headers" in init && init.headers
            ? (init.headers as Record<string, string>).authorization
            : "",
        );
        seenAuthorizations.push(authorization);
        if (requestCount === 1) {
          return new Response(JSON.stringify({ error: "invalid token" }), { status: 401 });
        }
        return new Response(
          JSON.stringify({
            data: [{ id: "moonshot/kimi-k2.7-code" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    } as unknown as RemoteHealthProbeContext);

    expect(requestCount).toBe(2);
    expect(seenAuthorizations).toEqual(["Bearer stale-token", "Bearer fresh-token"]);
    expect(result.results[0]).toMatchObject({
      reason: "healthy",
      healthStatus: "healthy",
    });
  });

  it("stays degraded when refreshed authorization still fails", async () => {
    let requestCount = 0;
    const result = await probeRemoteEndpoints({
      litellmHealthy: true,
      targets: [
        {
          endpointId: "moonshot.personal.primary.global.kimi-k2.7-code",
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.7-code",
          apiBase: "https://api.moonshot.ai/v1",
          servingSource: "remote-service",
        },
      ],
      resolveAuthorization: async () => "stale-token",
      refreshAuthorization: async () => "still-bad-token",
      networkFetcher: async () => {
        requestCount += 1;
        return new Response(JSON.stringify({ error: "invalid token" }), { status: 401 });
      },
    } as unknown as RemoteHealthProbeContext);

    expect(requestCount).toBe(2);
    expect(result.results[0]).toMatchObject({
      reason: "auth",
      healthStatus: "degraded",
    });
  });

  it("accepts unprefixed provider model ids for canonical runtime model ids", async () => {
    const result = await probeRemoteEndpoints({
      litellmHealthy: true,
      targets: [
        {
          endpointId: "deepseek.personal.primary.global.deepseek-v4-flash",
          providerAccountId: "deepseek.personal.primary",
          modelId: "deepseek/deepseek-v4-flash",
          apiBase: "https://api.deepseek.com/v1",
          servingSource: "remote-service",
        },
      ],
      resolveAuthorization: async () => "deepseek-live-key",
      networkFetcher: async () =>
        new Response(JSON.stringify({ data: [{ id: "deepseek-v4-flash" }] }), { status: 200 }),
    });

    expect(result.results[0]).toMatchObject({
      reason: "healthy",
      healthStatus: "healthy",
    });
  });

  it("accepts k3 and kimi-k3 as comparable model ids for moonshot/kimi-k3", async () => {
    const result = await probeRemoteEndpoints({
      litellmHealthy: true,
      targets: [
        {
          endpointId: "moonshot.personal.primary.global.kimi-k3",
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k3",
          apiBase: "https://api.kimi.com/coding/v1",
          servingSource: "remote-service",
        },
      ],
      resolveAuthorization: async () => "moonshot-live-key",
      networkFetcher: async () =>
        new Response(JSON.stringify({ data: [{ id: "k3" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });

    expect(result.results[0]).toMatchObject({
      reason: "healthy",
      healthStatus: "healthy",
    });
  });

  it("accepts kimi-for-coding as the comparable model id for moonshot coding OAuth", async () => {
    const result = await probeRemoteEndpoints({
      litellmHealthy: true,
      targets: [
        {
          endpointId: "moonshot.personal.primary.global.kimi-k2.7-code",
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.7-code",
          apiBase: "https://api.kimi.com/coding/v1",
          servingSource: "remote-service",
        },
      ],
      resolveAuthorization: async () => "moonshot-live-key",
      networkFetcher: async () =>
        new Response(JSON.stringify({ data: [{ id: "kimi-for-coding" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });

    expect(result.results[0]).toMatchObject({
      reason: "healthy",
      healthStatus: "healthy",
    });
  });

  it("adds provider-required probe headers when supplied by the caller", async () => {
    const seenHeaderValues: string[] = [];
    const result = await probeRemoteEndpoints({
      litellmHealthy: true,
      targets: [
        {
          endpointId: "moonshot.personal.primary.global.kimi-k2.7-code",
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.7-code",
          apiBase: "https://api.kimi.com/coding/v1",
          servingSource: "remote-service",
        },
      ],
      resolveAuthorization: async () => "moonshot-live-key",
      resolveProbeHeaders: async () => ({
        "X-Msh-Device-Id": "device-123",
        "X-Msh-Platform": "windows",
      }),
      networkFetcher: async (_input: string | URL | Request, init?: RequestInit) => {
        const headers = (init?.headers ?? {}) as Record<string, string>;
        seenHeaderValues.push(String(headers["X-Msh-Device-Id"] ?? ""));
        if (headers["X-Msh-Device-Id"] !== "device-123") {
          return new Response(JSON.stringify({ error: "missing-device-header" }), { status: 403 });
        }
        return new Response(JSON.stringify({ data: [{ id: "kimi-for-coding" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    } as unknown as RemoteHealthProbeContext);

    expect(seenHeaderValues).toEqual(["device-123"]);
    expect(result.results[0]).toMatchObject({
      reason: "healthy",
      healthStatus: "healthy",
    });
  });

  it("maps missing model ids to model-not-found", async () => {
    const result = await probeRemoteEndpoints({
      litellmHealthy: true,
      targets: [
        {
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.5",
          apiBase: "https://api.moonshot.ai/v1",
          servingSource: "remote-service",
        },
      ],
      resolveAuthorization: async () => "moonshot-live-key",
      networkFetcher: async () =>
        new Response(JSON.stringify({ data: [{ id: "moonshot/kimi-k2.6" }] }), { status: 200 }),
    });

    expect(result.results[0]).toMatchObject({
      reason: "model-not-found",
      healthStatus: "degraded",
    });
  });

  it("maps vendor outages to provider-unavailable without probing", async () => {
    const result = await probeRemoteEndpoints({
      litellmHealthy: false,
      targets: [
        {
          endpointId: "moonshot.litellm.global.kimi-k2.5",
          providerAccountId: "moonshot.litellm",
          modelId: "moonshot/kimi-k2.5",
          apiBase: "http://127.0.0.1:4000/v1",
          servingSource: "vendor-litellm",
        },
      ],
      resolveAuthorization: async () => "token",
      networkFetcher: async () => {
        throw new Error("network fetcher should not run when litellm is down");
      },
    });

    expect(result.results[0]).toMatchObject({
      reason: "vendor-down",
      healthStatus: "provider-unavailable",
    });
    expect(result.degraded).toBe(1);
  });

  it("builds /v1/models probe urls from api bases", () => {
    expect(buildModelsProbeUrl("https://api.moonshot.ai/v1")).toBe(
      "https://api.moonshot.ai/v1/models",
    );
    expect(buildModelsProbeUrl("https://api.moonshot.ai")).toBe(
      "https://api.moonshot.ai/v1/models",
    );
  });

  it("extracts model ids from OpenAI-style model list payloads", () => {
    expect(
      extractOpenAIModelIds({
        data: [{ id: "moonshot/kimi-k2.5" }, { id: "gpt-4.1" }],
      }),
    ).toEqual(["moonshot/kimi-k2.5", "gpt-4.1"]);
  });
});
