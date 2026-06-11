import { describe, expect, it } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import type { RegistrySources } from "@role-model-router/endpoint-registry";

import {
  buildRoutableInventory,
  resolveAliasAllowEndpoints,
  validateAliasInventoryResolution,
  warnAliasModelIdDrift,
} from "./routable-inventory.js";

const registry = {
  endpoints: [
    {
      identity: {
        endpoint_id: "peer.local.lfm",
        endpoint_kind: "local_engine",
        provider_kind: "remote_openai_compat",
        serving_source: "local-peer",
        model_id: "lfm2.5-8b-a1b",
        runtime_version: "1",
        region: "local",
      },
      declared: {
        endpoint_id: "peer.local.lfm",
        capabilities: ["text.chat"],
        modalities: ["text"],
        max_context_tokens: 32000,
        tool_calling: { supported: true, style: "openai" },
        supports_embeddings: false,
      },
      status: "active",
    },
    {
      identity: {
        endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.6",
        endpoint_kind: "remote_api",
        provider_kind: "remote_openai_compat",
        serving_source: "remote-service",
        model_id: "moonshot/kimi-k2.6",
        runtime_version: "1",
        region: "global",
      },
      declared: {
        endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.6",
        capabilities: ["text.chat"],
        modalities: ["text"],
        max_context_tokens: 128000,
        tool_calling: { supported: false, style: "none" },
        supports_embeddings: false,
      },
      status: "active",
    },
  ],
  diagnostics: [],
  lifecycleSummary: { active: 2, degraded: 0, offline: 0 },
} as unknown as EndpointRegistryResult;

const sources: RegistrySources = {
  cloud: [
    {
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.6",
      providerAccountId: "moonshot.personal.kimi-code",
      modelId: "moonshot/kimi-k2.6",
      region: "global",
      endpointKind: "remote-openai-compatible",
      servingSource: "remote-service",
      lifecycleState: "active",
      healthStatus: "healthy",
    },
  ],
  local: [
    {
      endpointId: "peer.local.lfm",
      providerKind: "provider-openai",
      providerId: "local-openai-compatible",
      modelId: "lfm2.5-8b-a1b",
      capabilities: ["text.chat"],
      modalities: ["text"],
      endpointKind: "local-openai-compatible",
      servingSource: "local-peer",
      lifecycleState: "active",
      hostClass: "developer-workstation",
      deviceClass: "developer-workstation",
      region: "local",
      orgScope: "personal",
      localModelSource: "peer-backed",
    },
  ],
};

describe("routable-inventory", () => {
  it("builds inventory from active registry endpoints", () => {
    const inventory = buildRoutableInventory(registry, sources);
    expect(inventory.modelIds).toEqual(["lfm2.5-8b-a1b", "moonshot/kimi-k2.6"]);
    expect(inventory.endpointIds).toHaveLength(2);
    expect(inventory.bySourceType.local).toHaveLength(1);
    expect(inventory.bySourceType.remote).toHaveLength(1);
  });

  it("resolves alias pools from inventory even when hint model ids are stale", () => {
    const inventory = buildRoutableInventory(registry, sources);
    const resolved = resolveAliasAllowEndpoints(
      {
        aliasId: "mixed.local-remote",
        mode: "basic",
        modelIds: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.6"],
      },
      inventory,
      registry,
    );

    expect(resolved.allowEndpoints).toEqual(
      expect.arrayContaining(["peer.local.lfm", "moonshot.personal.kimi-code.global.kimi-k2.6"]),
    );
    expect(resolved.poolEmpty).toBe(false);
    expect(resolved.resolvedModelIds).toEqual(
      expect.arrayContaining(["lfm2.5-8b-a1b", "moonshot/kimi-k2.6"]),
    );
  });

  it("emits drift warnings for hint model ids outside inventory", () => {
    const inventory = buildRoutableInventory(registry, sources);
    const warnings = warnAliasModelIdDrift(
      {
        aliasId: "mixed.local-remote",
        mode: "basic",
        modelIds: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.6"],
      },
      inventory,
    );

    expect(warnings).toEqual([
      expect.objectContaining({
        aliasId: "mixed.local-remote",
        hintModelId: "lfm2.5-1.2b-instruct",
        suggestedModelIds: expect.arrayContaining(["lfm2.5-8b-a1b"]),
      }),
    ]);
  });

  it("marks alias pools empty with ALIAS_POOL_EMPTY when inventory has no matches", () => {
    const emptyRegistry = {
      endpoints: [],
      diagnostics: [],
      lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
    } as unknown as EndpointRegistryResult;
    const inventory = buildRoutableInventory(emptyRegistry, { cloud: [], local: [] });
    const resolved = resolveAliasAllowEndpoints(
      {
        aliasId: "mixed.local-remote",
        mode: "basic",
        modelIds: ["moonshot/kimi-k2.6"],
      },
      inventory,
      emptyRegistry,
    );

    expect(resolved.allowEndpoints).toEqual([]);
    expect(resolved.poolEmpty).toBe(true);
    expect(resolved.poolEmptyReason).toBe("ALIAS_POOL_EMPTY");
  });

  it("rejects alias definitions that cannot resolve against inventory on config save", () => {
    const emptyRegistry = {
      endpoints: [],
      diagnostics: [],
      lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
    } as unknown as EndpointRegistryResult;
    const inventory = buildRoutableInventory(emptyRegistry, { cloud: [], local: [] });
    const validation = validateAliasInventoryResolution(
      [
        {
          aliasId: "mixed.local-remote",
          mode: "basic",
          modelIds: ["moonshot/kimi-k2.6"],
        },
      ],
      inventory,
    );

    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toContain("mixed.local-remote");
  });
});
