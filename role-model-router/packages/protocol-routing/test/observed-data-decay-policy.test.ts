import { describe, expect, test } from "vitest";

import { routeRuntimeRequest } from "../src/index.js";
import { TEST_CATALOG } from "./test-catalog-fixture.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("protocol routing observed-data decay policy (run-64 RED)", () => {
  test("lets a fresh local endpoint beat a faster remote endpoint when the remote latency evidence is a week old", () => {
    const routingTimeMs = 7 * DAY_MS;

    const result = routeRuntimeRequest({
      request: {
        requestId: "req-runtime-latency-decay-local-vs-remote",
        taskType: "text.chat",
        requiredCapabilities: [],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 256,
        needsTools: false,
        strategy: "latency",
        preferLocal: true,
      },
      catalog: TEST_CATALOG,
      registry: {
        endpoints: [
          {
            identity: {
              endpoint_id: "remote.stale.fast",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "remote-service",
              model_id: "remote/stale-fast",
              runtime_version: "run-64-protocol-routing",
              region: "us-east-1",
              host_class: "server",
              device_class: "server",
              org_scope: "personal",
            },
            declared: {
              endpoint_id: "remote.stale.fast",
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
              endpoint_id: "local.fresh.steady",
              endpoint_kind: "local_engine",
              provider_kind: "cli",
              serving_source: "local-process",
              model_id: "local/fresh-steady",
              runtime_version: "run-64-protocol-routing",
              region: "local",
              host_class: "developer-workstation",
              device_class: "developer-workstation",
              org_scope: "personal",
            },
            declared: {
              endpoint_id: "local.fresh.steady",
              capabilities: ["text.chat"],
              modalities: ["text"],
              max_context_tokens: 32768,
              tool_calling: { supported: false, style: "none" },
              supports_embeddings: false,
              platform_constraints: [],
            },
            status: "active",
          },
        ],
        diagnostics: [],
        lifecycleSummary: {
          active: 2,
          degraded: 0,
          offline: 0,
        },
      },
      observedProfilesByEndpointId: {
        "remote.stale.fast": {
          endpoint_id: "remote.stale.fast",
          measured_at_ms: 0,
          judge_score: 0.7,
          latency_ms_p50: 40,
          latency_ms_p95: 55,
          tokens_per_sec: 90,
          cold_start_ms: 10,
          failure_rate: 0.01,
          cost_per_1k_tokens_est: 0.001,
          freshness_score: 0.95,
          confidence_score: 0.9,
        },
        "local.fresh.steady": {
          endpoint_id: "local.fresh.steady",
          measured_at_ms: routingTimeMs,
          judge_score: 0.7,
          latency_ms_p50: 70,
          latency_ms_p95: 90,
          tokens_per_sec: 50,
          cold_start_ms: 10,
          failure_rate: 0.01,
          cost_per_1k_tokens_est: 0.002,
          freshness_score: 0.95,
          confidence_score: 0.9,
        },
      },
      envelope: {
        sessionId: "session-run-64-local-remote",
        conversationId: "conversation-run-64-local-remote",
        selectedTurns: [],
        selectedArtifacts: [],
        latestHandoff: null,
        estimatedTokenCount: 0,
        diagnostics: [],
      },
      retrievalReceipt: {
        receiptId: "conversation-run-64-local-remote-receipt",
        conversationId: "conversation-run-64-local-remote",
        summary: {
          selectedTurns: 0,
          selectedArtifacts: 0,
          omittedTurns: 0,
          omittedArtifacts: 0,
          estimatedTokens: 0,
        },
        entries: [],
      },
      roleDefinitions: [],
      taskDefinitions: [],
      roleBindings: [],
      observedDataConfig: {
        enabled: true,
        aggregation: { minSamples: 1 },
        metricDecayPercentPerDay: {
          latency: 10,
          throughput: 10,
        },
        throughputSla: {
          enabled: true,
          minTokensPerSec: 24,
          penaltyTimeoutMs: 600_000,
          penaltyFactor: 0,
        },
      },
      routingTimeMs,
    } as Parameters<typeof routeRuntimeRequest>[0]);

    expect(result.decision.chosen_endpoint_id).toBe("local.fresh.steady");
  });

  test("keeps benchmark-only quality routing stable even when profile freshness metadata is low", () => {
    const result = routeRuntimeRequest({
      request: {
        requestId: "req-runtime-benchmark-quality-no-time-decay",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 180,
        needsTools: false,
        strategy: "quality",
        preferLocal: false,
      },
      catalog: TEST_CATALOG,
      registry: {
        endpoints: [
          {
            identity: {
              endpoint_id: "a.lower-quality",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "remote-service",
              model_id: "custom/lower-quality",
              runtime_version: "run-64-quality",
              region: "us-east-1",
              host_class: "server",
              device_class: "server",
              org_scope: "personal",
            },
            declared: {
              endpoint_id: "a.lower-quality",
              capabilities: ["code.edit"],
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
              endpoint_id: "b.higher-quality",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "remote-service",
              model_id: "custom/higher-quality",
              runtime_version: "run-64-quality",
              region: "us-east-1",
              host_class: "server",
              device_class: "server",
              org_scope: "personal",
            },
            declared: {
              endpoint_id: "b.higher-quality",
              capabilities: ["code.edit"],
              modalities: ["text"],
              max_context_tokens: 32768,
              tool_calling: { supported: false, style: "none" },
              supports_embeddings: false,
              platform_constraints: [],
            },
            status: "active",
          },
        ],
        diagnostics: [],
        lifecycleSummary: {
          active: 2,
          degraded: 0,
          offline: 0,
        },
      },
      observedProfilesByEndpointId: {
        "a.lower-quality": {
          endpoint_id: "a.lower-quality",
          measured_at_ms: 1_000,
          judge_score: 0.68,
          latency_ms_p50: 120,
          latency_ms_p95: 150,
          tokens_per_sec: 40,
          cold_start_ms: 10,
          failure_rate: 0.01,
          cost_per_1k_tokens_est: 0.002,
          freshness_score: 0.95,
          confidence_score: 0.9,
          sample_size: 21,
          sources: {
            live_request_samples: 0,
            benchmark_samples: 21,
          },
        },
        "b.higher-quality": {
          endpoint_id: "b.higher-quality",
          measured_at_ms: 1_000,
          judge_score: 0.93,
          latency_ms_p50: 120,
          latency_ms_p95: 150,
          tokens_per_sec: 40,
          cold_start_ms: 10,
          failure_rate: 0.01,
          cost_per_1k_tokens_est: 0.002,
          freshness_score: 0.05,
          confidence_score: 0.9,
          sample_size: 21,
          sources: {
            live_request_samples: 0,
            benchmark_samples: 21,
          },
        },
      },
      envelope: {
        sessionId: "session-run-64-quality",
        conversationId: "conversation-run-64-quality",
        selectedTurns: [],
        selectedArtifacts: [],
        latestHandoff: null,
        estimatedTokenCount: 0,
        diagnostics: [],
      },
      retrievalReceipt: {
        receiptId: "conversation-run-64-quality-receipt",
        conversationId: "conversation-run-64-quality",
        summary: {
          selectedTurns: 0,
          selectedArtifacts: 0,
          omittedTurns: 0,
          omittedArtifacts: 0,
          estimatedTokens: 0,
        },
        entries: [],
      },
      roleDefinitions: [],
      taskDefinitions: [],
      roleBindings: [],
      observedDataConfig: {
        enabled: true,
        aggregation: { minSamples: 1 },
        metricDecayPercentPerDay: {
          latency: 10,
          throughput: 10,
        },
        throughputSla: {
          enabled: true,
          minTokensPerSec: 24,
          penaltyTimeoutMs: 600_000,
          penaltyFactor: 0,
        },
      },
      routingTimeMs: 100_000_000,
    } as Parameters<typeof routeRuntimeRequest>[0]);

    expect(result.decision.chosen_endpoint_id).toBe("b.higher-quality");
  });
});
