import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { routeRequest } from "@role-model-router/core";
import { runRuntimeRoutingValidation } from "@role-model-router/protocol-routing/cli";
import { assertValid, createAjv } from "./schema-test-helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const schemaDir = path.join(repoRoot, "protocol", "schemas");

describe("runtime routing conformance", () => {
  test("prefers candidates with explicit runtime routing signals when baseline scoring is otherwise tied", () => {
    const result = routeRequest({
      request: {
        requestId: "req-runtime-signals-1",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 512,
        needsTools: false,
        strategy: "balanced",
        preferLocal: false,
      },
      candidates: [
        {
          identity: {
            endpoint_id: "alpha-local",
            endpoint_kind: "local_engine",
            provider_kind: "cli",
            serving_source: "local-process",
            model_id: "gpt-5.4",
            package_id: "provider-cli",
            variant_id: "default",
            runtime_version: "1.0.0",
            quantization: "none",
            precision: "fp16",
            host_class: "developer-workstation",
            device_class: "developer-workstation",
            region: "local",
            org_scope: "personal",
          },
          declared: {
            endpoint_id: "alpha-local",
            capabilities: ["code.edit"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: {
              supported: false,
              style: "none",
            },
            supports_embeddings: false,
            platform_constraints: [],
          },
          observed: {
            endpoint_id: "alpha-local",
            endpoint_version: "alpha-local@1",
            judge_score: 0.8,
            measured_at_ms: 1700000000000,
            measurement_window: {
              started_at_ms: 1699999995000,
              ended_at_ms: 1700000000000,
            },
            sample_size: 10,
            sources: {
              benchmark_samples: 0,
              live_request_samples: 10,
            },
            latency_ms_p50: 100,
            latency_ms_p95: 120,
            tokens_per_sec: 50,
            cold_start_ms: 10,
            failure_rate: 0.02,
            cost_per_1k_tokens_est: 0.001,
            freshness_score: 0.9,
            confidence_score: 0.9,
          },
          status: "active",
        },
        {
          identity: {
            endpoint_id: "zeta-local",
            endpoint_kind: "local_engine",
            provider_kind: "cli",
            serving_source: "local-process",
            model_id: "gpt-5.4",
            package_id: "provider-cli",
            variant_id: "default",
            runtime_version: "1.0.0",
            quantization: "none",
            precision: "fp16",
            host_class: "developer-workstation",
            device_class: "developer-workstation",
            region: "local",
            org_scope: "personal",
          },
          declared: {
            endpoint_id: "zeta-local",
            capabilities: ["code.edit"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: {
              supported: false,
              style: "none",
            },
            supports_embeddings: false,
            platform_constraints: [],
          },
          observed: {
            endpoint_id: "zeta-local",
            endpoint_version: "zeta-local@1",
            judge_score: 0.8,
            measured_at_ms: 1700000000000,
            measurement_window: {
              started_at_ms: 1699999995000,
              ended_at_ms: 1700000000000,
            },
            sample_size: 10,
            sources: {
              benchmark_samples: 0,
              live_request_samples: 10,
            },
            latency_ms_p50: 100,
            latency_ms_p95: 120,
            tokens_per_sec: 50,
            cold_start_ms: 10,
            failure_rate: 0.02,
            cost_per_1k_tokens_est: 0.001,
            freshness_score: 0.9,
            confidence_score: 0.9,
          },
          status: "active",
          routingSignals: {
            continuityAffinity: true,
            cacheAffinity: true,
            routingModelRank: 0,
          },
        },
      ],
    } as const);

    expect(result.chosen_endpoint_id).toBe("zeta-local");
    expect(result.selection_reasons).toEqual(
      expect.arrayContaining([
        "CONTINUITY_AFFINITY_APPLIED",
        "CACHE_AFFINITY_APPLIED",
        "ROUTING_MODEL_PREFERENCE_APPLIED",
      ]),
    );
    expect(result.scored_candidates[0]?.metric_breakdown.preference.raw).toEqual(
      expect.objectContaining({
        continuity_affinity: true,
        cache_affinity: true,
        routing_model_rank: 0,
      }),
    );
  });

  test("emits a schema-valid decision for fixture-backed runtime routing validation", async () => {
    const ajv = await createAjv(schemaDir);
    const validateRouterDecision = ajv.getSchema("router-decision.schema.json");
    if (!validateRouterDecision) {
      throw new Error("router-decision.schema.json did not compile");
    }

    const result = await runRuntimeRoutingValidation({
      repoRoot,
      runtimeStateRoot: path.join(repoRoot, "runtime-output", "conformance-routing"),
      scopeId: "conformance-validation",
    });

    assertValid(validateRouterDecision, result.decision, "runtime-routing-validation");
    expect(result.decision.chosen_endpoint_id).toBe("cli.local.coder");
    expect(result.routingDiagnostics.routingModel.preferredEndpointIds).toEqual([
      "openai.personal.primary.us-east-1.fast",
      "cli.local.coder",
    ]);
    expect(
      result.decision.eligibility.find(
        (entry) => entry.endpoint_id === "openai.personal.primary.us-east-1.fast",
      )?.eligible,
    ).toBe(false);
  });
});
