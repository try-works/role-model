import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { type NormalizedCatalog, readNormalizedCatalogFile } from "@role-model-router/catalog";

import { routeRuntimeRequest } from "../src/index.js";
import { TEST_CATALOG } from "./test-catalog-fixture.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

async function loadNormalizedCatalog(): Promise<NormalizedCatalog> {
  const catalogPath = path.join(
    repoRoot,
    "role-model-router",
    "packages",
    "catalog",
    "data",
    "normalized-catalog.json",
  );
  return readNormalizedCatalogFile(catalogPath);
}

describe("catalog economics routing", () => {
  test("prefers local-free endpoint over Kimi on cost strategy when both are eligible", async () => {
    const catalog = await loadNormalizedCatalog();
    const result = routeRuntimeRequest({
      request: {
        requestId: "req-cost-local-vs-kimi",
        taskType: "text.chat",
        requiredCapabilities: ["text.chat"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 1000,
        needsTools: false,
        strategy: "cost",
        preferLocal: true,
      },
      catalog,
      registry: {
        endpoints: [
          {
            identity: {
              endpoint_id: "peer.local.lfm",
              endpoint_kind: "local_engine",
              provider_kind: "cli",
              serving_source: "local-process",
              model_id: "lfm2.5-8b-a1b",
              runtime_version: "run40-test",
              region: "local",
              host_class: "developer-workstation",
              device_class: "developer-workstation",
              org_scope: "personal",
            },
            declared: {
              endpoint_id: "peer.local.lfm",
              capabilities: ["text.chat"],
              modalities: ["text"],
              max_context_tokens: 32768,
              tool_calling: { supported: false, style: "none" },
              supports_embeddings: false,
              platform_constraints: [],
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
              runtime_version: "run40-test",
              region: "global",
              host_class: "server",
              device_class: "server",
              org_scope: "personal",
            },
            declared: {
              endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.6",
              capabilities: ["text.chat"],
              modalities: ["text"],
              max_context_tokens: 262144,
              tool_calling: { supported: true, style: "openai" },
              supports_embeddings: false,
              platform_constraints: [],
            },
            status: "active",
          },
        ],
        diagnostics: [],
        lifecycleSummary: { active: 2, degraded: 0, offline: 0 },
      },
      observedProfilesByEndpointId: {
        "peer.local.lfm": {
          endpoint_id: "peer.local.lfm",
          judge_score: 0.7,
          latency_ms_p50: 200,
          latency_ms_p95: 300,
          tokens_per_sec: 40,
          cold_start_ms: 10,
          failure_rate: 0.01,
          cost_per_1k_tokens_est: 99,
          freshness_score: 0.9,
          confidence_score: 0.9,
        },
        "moonshot.personal.kimi-code.global.kimi-k2.6": {
          endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.6",
          judge_score: 0.95,
          latency_ms_p50: 80,
          latency_ms_p95: 120,
          tokens_per_sec: 90,
          cold_start_ms: 20,
          failure_rate: 0.01,
          cost_per_1k_tokens_est: 0.001,
          freshness_score: 0.9,
          confidence_score: 0.9,
        },
      },
      envelope: {
        sessionId: "session-cost",
        conversationId: "conversation-cost",
        selectedTurns: [],
        selectedArtifacts: [],
        latestHandoff: null,
        estimatedTokenCount: 1000,
        diagnostics: [],
      },
      retrievalReceipt: {
        receiptId: "conversation-cost-receipt",
        conversationId: "conversation-cost",
        summary: {
          selectedTurns: 0,
          selectedArtifacts: 0,
          omittedTurns: 0,
          omittedArtifacts: 0,
          estimatedTokens: 1000,
        },
        entries: [],
      },
      roleDefinitions: [],
      taskDefinitions: [],
      roleBindings: [],
      maxOutputTokens: 512,
    });

    expect(result.decision.chosen_endpoint_id).toBe("peer.local.lfm");
    expect(result.catalogEconomicsByEndpointId["peer.local.lfm"]?.tokenEconomicsSource).toBe(
      "local-free",
    );
    expect(
      result.catalogEconomicsByEndpointId["moonshot.personal.kimi-code.global.kimi-k2.6"]
        ?.canonicalModelId,
    ).toBe("moonshot/kimi-k2.6");
    const chosenCostMetric = result.decision.scored_candidates.find(
      (candidate) => candidate.endpoint_id === result.decision.chosen_endpoint_id,
    )?.metric_breakdown.cost;
    expect(chosenCostMetric?.source).toBe("catalog");
  });

  test("ignores telemetry cost_per_1k when catalog economics are available", () => {
    const result = routeRuntimeRequest({
      request: {
        requestId: "req-ignore-telemetry-cost",
        taskType: "text.chat",
        requiredCapabilities: ["text.chat"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 500,
        needsTools: false,
        strategy: "cost",
        preferLocal: false,
      },
      catalog: TEST_CATALOG,
      registry: {
        endpoints: [
          {
            identity: {
              endpoint_id: "remote.kimi",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "remote-service",
              model_id: "moonshot/kimi-k2.6",
              runtime_version: "run40-test",
              region: "global",
              host_class: "server",
              device_class: "server",
              org_scope: "personal",
            },
            declared: {
              endpoint_id: "remote.kimi",
              capabilities: ["text.chat"],
              modalities: ["text"],
              max_context_tokens: 262144,
              tool_calling: { supported: true, style: "openai" },
              supports_embeddings: false,
              platform_constraints: [],
            },
            status: "active",
          },
        ],
        diagnostics: [],
        lifecycleSummary: { active: 1, degraded: 0, offline: 0 },
      },
      observedProfilesByEndpointId: {
        "remote.kimi": {
          endpoint_id: "remote.kimi",
          judge_score: 0.9,
          latency_ms_p50: 80,
          latency_ms_p95: 120,
          tokens_per_sec: 90,
          cold_start_ms: 20,
          failure_rate: 0.01,
          cost_per_1k_tokens_est: 0.0001,
          freshness_score: 0.9,
          confidence_score: 0.9,
        },
      },
      envelope: {
        sessionId: "session-telemetry",
        conversationId: "conversation-telemetry",
        selectedTurns: [],
        selectedArtifacts: [],
        latestHandoff: null,
        estimatedTokenCount: 500,
        diagnostics: [],
      },
      retrievalReceipt: {
        receiptId: "conversation-telemetry-receipt",
        conversationId: "conversation-telemetry",
        summary: {
          selectedTurns: 0,
          selectedArtifacts: 0,
          omittedTurns: 0,
          omittedArtifacts: 0,
          estimatedTokens: 500,
        },
        entries: [],
      },
      roleDefinitions: [],
      taskDefinitions: [],
      roleBindings: [],
      maxOutputTokens: 256,
    });

    expect(
      result.catalogEconomicsByEndpointId["remote.kimi"]?.cost_per_1k_tokens_est,
    ).toBeGreaterThan(0.0001);
    expect(result.projected.routeInput.candidates[0]?.observed?.cost_per_1k_tokens_est).toBe(
      result.catalogEconomicsByEndpointId["remote.kimi"]?.cost_per_1k_tokens_est,
    );
  });

  test("does not decay catalog local-free cost toward neutral when local telemetry is stale", async () => {
    const catalog = await loadNormalizedCatalog();
    const staleMeasuredAtMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const freshMeasuredAtMs = Date.now() - 60_000;
    const result = routeRuntimeRequest({
      request: {
        requestId: "req-stale-local-catalog-cost",
        taskType: "text.chat",
        requiredCapabilities: ["text.chat"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 1000,
        needsTools: false,
        strategy: "cost",
        preferLocal: false,
      },
      catalog,
      registry: {
        endpoints: [
          {
            identity: {
              endpoint_id: "peer.local.lfm",
              endpoint_kind: "local_engine",
              provider_kind: "cli",
              serving_source: "local-process",
              model_id: "lfm2.5-8b-a1b",
              runtime_version: "run40-test",
              region: "local",
              host_class: "developer-workstation",
              device_class: "developer-workstation",
              org_scope: "personal",
            },
            declared: {
              endpoint_id: "peer.local.lfm",
              capabilities: ["text.chat"],
              modalities: ["text"],
              max_context_tokens: 32768,
              tool_calling: { supported: false, style: "none" },
              supports_embeddings: false,
              platform_constraints: [],
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
              runtime_version: "run40-test",
              region: "global",
              host_class: "server",
              device_class: "server",
              org_scope: "personal",
            },
            declared: {
              endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.6",
              capabilities: ["text.chat"],
              modalities: ["text"],
              max_context_tokens: 262144,
              tool_calling: { supported: true, style: "openai" },
              supports_embeddings: false,
              platform_constraints: [],
            },
            status: "active",
          },
        ],
        diagnostics: [],
        lifecycleSummary: { active: 2, degraded: 0, offline: 0 },
      },
      observedProfilesByEndpointId: {
        "peer.local.lfm": {
          endpoint_id: "peer.local.lfm",
          judge_score: 0.7,
          latency_ms_p50: 37347,
          latency_ms_p95: 37347,
          tokens_per_sec: 6,
          cold_start_ms: 10,
          failure_rate: 0,
          cost_per_1k_tokens_est: 99,
          measured_at_ms: staleMeasuredAtMs,
          freshness_score: 0.1,
          confidence_score: 0.9,
        },
        "moonshot.personal.kimi-code.global.kimi-k2.6": {
          endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.6",
          judge_score: 0.95,
          latency_ms_p50: 80,
          latency_ms_p95: 120,
          tokens_per_sec: 90,
          cold_start_ms: 20,
          failure_rate: 0.01,
          cost_per_1k_tokens_est: 0.001,
          measured_at_ms: freshMeasuredAtMs,
          freshness_score: 0.9,
          confidence_score: 0.9,
        },
      },
      observedDataConfig: {
        enabled: true,
        aggregation: { minSamples: 2 },
        metricDecayPercentPerDay: {
          latency: 10,
          throughput: 10,
        },
        throughputSla: {
          enabled: false,
          minTokensPerSec: 24,
          penaltyTimeoutMs: 600_000,
          penaltyFactor: 0,
        },
      },
      routingTimeMs: Date.now(),
      envelope: {
        sessionId: "session-stale-local",
        conversationId: "conversation-stale-local",
        selectedTurns: [],
        selectedArtifacts: [],
        latestHandoff: null,
        estimatedTokenCount: 1000,
        diagnostics: [],
      },
      retrievalReceipt: {
        receiptId: "conversation-stale-local-receipt",
        conversationId: "conversation-stale-local",
        summary: {
          selectedTurns: 0,
          selectedArtifacts: 0,
          omittedTurns: 0,
          omittedArtifacts: 0,
          estimatedTokens: 1000,
        },
        entries: [],
      },
      roleDefinitions: [],
      taskDefinitions: [],
      roleBindings: [],
      maxOutputTokens: 512,
    });

    const localCostMetric = result.decision.scored_candidates.find(
      (candidate) => candidate.endpoint_id === "peer.local.lfm",
    )?.metric_breakdown.cost;
    const kimiCostMetric = result.decision.scored_candidates.find(
      (candidate) => candidate.endpoint_id === "moonshot.personal.kimi-code.global.kimi-k2.6",
    )?.metric_breakdown.cost;
    expect(localCostMetric?.source).toBe("catalog");
    expect(localCostMetric?.value).toBe(1);
    expect(kimiCostMetric?.source).toBe("catalog");
    expect(kimiCostMetric?.value ?? 0).toBeLessThan(localCostMetric?.value ?? 0);
  });
});
