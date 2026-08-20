import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import { type RoutableInventory, resolveAliasAllowEndpoints } from "../src/routable-inventory.js";
import {
  parseUnifiedRuntimeConfigText,
  renderUnifiedRuntimeConfigText,
} from "../src/unified-runtime-config.js";

const modelId = "deepseek/deepseek-v4-pro";
const defaultEndpointId = "account.global.deepseek-v4-pro";
const mediumEndpointId = "account.global.deepseek-v4-pro~effort-v1~bWVkaXVt";
const maxEndpointId = "account.global.deepseek-v4-pro~effort-v1~bWF4";

const registry = {
  endpoints: [defaultEndpointId, mediumEndpointId, maxEndpointId].map((endpointId) => ({
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: modelId,
      runtime_version: "run91-test",
      region: "global",
    },
    declared: {
      endpoint_id: endpointId,
      capabilities: ["text.chat"],
      modalities: ["text"],
      max_context_tokens: 128_000,
      tool_calling: { supported: true, style: "openai" },
      supports_embeddings: false,
    },
    status: "active",
  })),
  diagnostics: [],
  lifecycleSummary: { active: 3, degraded: 0, offline: 0 },
} as unknown as EndpointRegistryResult;

const inventory: RoutableInventory = {
  modelIds: [modelId],
  endpointIds: [defaultEndpointId, mediumEndpointId, maxEndpointId],
  entries: [defaultEndpointId, mediumEndpointId, maxEndpointId].map((endpointId) => ({
    endpointId,
    modelId,
    sourceType: "remote",
    healthStatus: "healthy",
    servingSource: "remote-service",
  })),
  bySourceType: {
    local: [],
    remote: [defaultEndpointId, mediumEndpointId, maxEndpointId].map((endpointId) => ({
      endpointId,
      modelId,
      sourceType: "remote",
      healthStatus: "healthy",
      servingSource: "remote-service",
    })),
  },
};

describe("Run 91 Wave B integration gaps", () => {
  test("applies an alias endpointIds allowlist and fails closed for drift", () => {
    const alias = {
      aliasId: "deepseek-selected",
      modelIds: [modelId],
      endpointIds: [mediumEndpointId],
    } as never;
    expect(resolveAliasAllowEndpoints(alias, inventory, registry).allowEndpoints).toEqual([
      mediumEndpointId,
    ]);

    const driftedAlias = {
      aliasId: "deepseek-drifted",
      modelIds: [modelId],
      endpointIds: ["account.global.unknown"],
    } as never;
    expect(resolveAliasAllowEndpoints(driftedAlias, inventory, registry)).toMatchObject({
      allowEndpoints: [],
      resolvedModelIds: [],
      poolEmpty: true,
      poolEmptyReason: "ALIAS_POOL_EMPTY",
    });
  });

  test("persists alias endpointIds through unified config parse and render", () => {
    const parsed = parseUnifiedRuntimeConfigText(`
version: "1.0"
model_aliases:
  deepseek-selected:
    model_ids:
      - ${modelId}
    endpoint_ids:
      - ${mediumEndpointId}
`);
    expect(parsed.modelAliases).toEqual([
      expect.objectContaining({
        aliasId: "deepseek-selected",
        endpointIds: [mediumEndpointId],
      }),
    ]);
    expect(renderUnifiedRuntimeConfigText(parsed)).toContain(
      `endpoint_ids:\n      - ${mediumEndpointId}`,
    );
  });

  test("publishes effort identity and endpoint-row fields in protocol schemas", () => {
    const endpointSchema = JSON.parse(
      readFileSync(
        new URL("../../../../protocol/schemas/endpoint-identity.schema.json", import.meta.url),
        "utf8",
      ),
    ) as { properties?: Record<string, unknown> };
    const discoverySchema = JSON.parse(
      readFileSync(
        new URL(
          "../../../../protocol/schemas/downstream-openai-discovery.schema.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as {
      $defs?: {
        DownstreamOpenAIModelRecord?: {
          properties?: Record<string, unknown>;
          required?: readonly string[];
        };
      };
    };
    expect(endpointSchema.properties?.reasoning_effort).toEqual(
      expect.objectContaining({ type: ["string", "null"] }),
    );
    expect(discoverySchema.$defs?.DownstreamOpenAIModelRecord?.properties?.type).toEqual(
      expect.objectContaining({ enum: expect.arrayContaining(["endpoint"]) }),
    );
    expect(discoverySchema.$defs?.DownstreamOpenAIModelRecord?.properties).toEqual(
      expect.objectContaining({
        upstream_model_id: expect.any(Object),
        fixed_effort: expect.any(Object),
      }),
    );
  });
});
