import { describe, expect, test } from "vitest";

import { buildConfiguredProviderRows, buildEndpointCatalogRows } from "../lib/view-models";
import { buildRuntimeConnectionRows } from "./endpoints";

describe("buildRuntimeConnectionRows", () => {
  test("lists route-eligible provider endpoints without presenting the legacy LiteLLM vendor proxy as a second endpoint", () => {
    const endpoints = [
      {
        endpointId: "deepseek.litellm.global.deepseek-deepseek-v4-pro",
        modelId: "deepseek/deepseek-v4-pro",
        providerId: "deepseek",
        providerAccountId: "deepseek.litellm",
        sourceType: "remote" as const,
        servingSource: "vendor-litellm",
        endpointKind: "remote_api",
        status: "active",
        healthStatus: "healthy",
        routingEligible: false,
        benchmarkEligible: false,
      },
      {
        endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro",
        modelId: "deepseek/deepseek-v4-pro",
        providerId: "deepseek",
        providerAccountId: "deepseek.personal.deepseek-api-key",
        sourceType: "remote" as const,
        servingSource: "remote-service",
        endpointKind: "remote_api",
        status: "active",
        healthStatus: "healthy",
        routingEligible: true,
        benchmarkEligible: true,
      },
    ];
    const accounts = [
      {
        providerAccountId: "deepseek.litellm",
        providerId: "deepseek",
        authMode: "api-key-static",
        allowedModels: ["deepseek/deepseek-v4-pro"],
        status: "active",
        healthStatus: "healthy",
      },
      {
        providerAccountId: "deepseek.personal.deepseek-api-key",
        providerId: "deepseek",
        authMode: "api-key-static",
        allowedModels: ["deepseek/deepseek-v4-pro"],
        status: "active",
        healthStatus: "healthy",
      },
    ];

    const rows = buildRuntimeConnectionRows({
      providerRows: buildConfiguredProviderRows({ accounts, endpoints }),
      endpointRows: buildEndpointCatalogRows(endpoints),
    });

    expect(rows).toEqual([
      expect.objectContaining({
        key: "endpoint:deepseek.personal.deepseek-api-key.global.deepseek-v4-pro",
        connectionLabel: "deepseek.personal.deepseek-api-key",
        sourceLabel: "Direct provider / remote_api",
        readinessLabel: "active",
        readinessTone: "success",
      }),
    ]);
    expect(rows.some((row) => row.connectionLabel === "deepseek.litellm")).toBe(false);
  });
});
