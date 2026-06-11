import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, test } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import type { RegistrySources } from "@role-model-router/endpoint-registry";

import {
  createModelListResponse,
  createRuntimeBridgeBackend,
  mapChatCompletionsRequest,
} from "../src/index.js";
import { buildRoutableInventory } from "../src/routable-inventory.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures");

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

describe("routable inventory bootstrap", () => {
  test("routes alias pools from inventory when yaml hints are stale", () => {
    const inventory = buildRoutableInventory(registry, sources);
    const plan = mapChatCompletionsRequest(
      registry,
      {
        model: "mixed.local-remote",
        messages: [{ role: "user", content: "Route across local and remote inventory." }],
      },
      "req-mixed-alias",
      [
        {
          aliasId: "mixed.local-remote",
          mode: "basic",
          modelIds: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.6"],
        },
      ],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      inventory,
    );

    expect(plan.routingRequest.allowEndpoints).toEqual(
      expect.arrayContaining(["peer.local.lfm", "moonshot.personal.kimi-code.global.kimi-k2.6"]),
    );
    expect(plan.routingDiagnostics?.aliasResolution?.driftWarnings?.length).toBeGreaterThan(0);
    expect(plan.routingDiagnostics?.aliasResolution?.poolEmptyReason).toBeUndefined();
  });

  test("lists alias endpoint pools from inventory on model list responses", () => {
    const inventory = buildRoutableInventory(registry, sources);
    const models = createModelListResponse(
      registry,
      [
        {
          aliasId: "mixed.local-remote",
          mode: "basic",
          modelIds: ["lfm2.5-1.2b-instruct"],
        },
      ],
      inventory,
    );
    const aliasEntry = models.data.find((entry) => entry.id === "mixed.local-remote");

    expect(aliasEntry?.endpoint_ids).toEqual(
      expect.arrayContaining(["peer.local.lfm", "moonshot.personal.kimi-code.global.kimi-k2.6"]),
    );
  });

  test("exposes inventory summary and inventory bootstrap stage after startup", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `routable-inventory-bootstrap-${Date.now()}`);
    const scopeId = "routable-inventory-bootstrap-tests";

    try {
      const backend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
      });

      let health = await backend.readHealthStatus();
      for (
        let attempt = 0;
        attempt < 20 && health.sessionBootstrap.status === "running";
        attempt += 1
      ) {
        await delay(50);
        health = await backend.readHealthStatus();
      }

      const inventoryStage = health.sessionBootstrap.stages.find(
        (stage) => stage.stageId === "inventory",
      );
      expect(inventoryStage).toBeDefined();
      expect(inventoryStage?.message ?? "").not.toContain("deferred to routable-inventory stage");

      const summary = await backend.readRuntimeSummary();
      expect(summary.inventorySummary.endpointIdCount).toBeGreaterThan(0);
      expect(backend.getRoutableInventory?.().endpointIds.length).toBeGreaterThan(0);

      await backend.shutdown();
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
