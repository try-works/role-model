import { describe, expect, test } from "vitest";

import { probeRemoteEndpointAdmission } from "../src/remote-health-probe.js";

describe("remote endpoint admission probes", () => {
  test("uses the configured effort in a bounded OpenAI-compatible readiness request", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];

    const result = await probeRemoteEndpointAdmission({
      endpointId: "deepseek.personal.global.deepseek-v4-flash-high",
      providerAccountId: "deepseek.personal",
      modelId: "deepseek/deepseek-v4-flash",
      reasoningEffort: "high",
      apiBase: "https://api.deepseek.example/v1",
      servingSource: "remote-service",
      resolveAuthorization: async () => "test-token",
      networkFetcher: async (input, init) => {
        calls.push({ url: String(input), init });
        return new Response(
          JSON.stringify({
            id: "admission-probe",
            choices: [{ message: { role: "assistant", content: "ok" } }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        endpointId: "deepseek.personal.global.deepseek-v4-flash-high",
        reason: "healthy",
        healthStatus: "healthy",
      }),
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(
      expect.objectContaining({
        url: "https://api.deepseek.example/v1/chat/completions",
        init: expect.objectContaining({ method: "POST" }),
      }),
    );
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: "role-model admission readiness probe" }],
      max_tokens: 1,
      stream: false,
      reasoning_effort: "high",
    });
    expect(calls[0]?.init?.headers).toEqual(
      expect.objectContaining({ authorization: "Bearer test-token" }),
    );
  });

  test("classifies a failed effort-specific readiness request as degraded", async () => {
    const result = await probeRemoteEndpointAdmission({
      endpointId: "deepseek.personal.global.deepseek-v4-flash-max",
      providerAccountId: "deepseek.personal",
      modelId: "deepseek/deepseek-v4-flash",
      reasoningEffort: "max",
      apiBase: "https://api.deepseek.example/v1",
      servingSource: "remote-service",
      resolveAuthorization: async () => "test-token",
      networkFetcher: async () =>
        new Response(JSON.stringify({ error: { message: "temporarily unavailable" } }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
    });

    expect(result).toEqual(
      expect.objectContaining({ reason: "vendor-down", healthStatus: "provider-unavailable" }),
    );
  });
});
