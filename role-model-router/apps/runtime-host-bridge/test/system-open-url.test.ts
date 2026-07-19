import { describe, expect, test, vi } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import { startBridgeServer } from "../src/index.js";

const emptyRegistry: EndpointRegistryResult = {
  endpoints: [],
  diagnostics: [],
  lifecycleSummary: {
    active: 0,
    degraded: 0,
    offline: 0,
  },
};

describe("system open-url API", () => {
  test("opens verification URLs through the runtime-owned external browser helper", async () => {
    const openExternalUrl = vi.fn(async (body: Record<string, unknown>) => ({
      opened: true as const,
      url: String(body.url ?? ""),
    }));

    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry: emptyRegistry,
      executeChatCompletions: async () => {
        throw new Error("unused");
      },
      executeResponses: async () => {
        throw new Error("unused");
      },
      openExternalUrl,
    });

    try {
      const response = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/system/open-url`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            url: "https://auth.openai.com/device",
          }),
        },
      );

      expect(response.ok).toBe(true);
      await expect(response.json()).resolves.toEqual({
        opened: true,
        url: "https://auth.openai.com/device",
      });
      expect(openExternalUrl).toHaveBeenCalledWith({
        url: "https://auth.openai.com/device",
      });
    } finally {
      await server.close();
    }
  });
});
