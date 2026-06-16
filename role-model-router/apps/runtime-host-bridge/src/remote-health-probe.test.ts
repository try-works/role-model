import { describe, expect, it } from "vitest";

import {
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
