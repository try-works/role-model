import { describe, expect, test } from "vitest";

import { getQualityMetric, routeRequest } from "../src/router.js";
import type { EndpointCandidate, RouteRequestInput, RoutingRequest } from "../src/types.js";

function candidate(
  endpointId: string,
  capabilities: readonly string[],
  overrides: Partial<EndpointCandidate> = {},
): EndpointCandidate {
  return {
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: endpointId,
      runtime_version: "1",
      region: "global",
    },
    declared: {
      endpoint_id: endpointId,
      capabilities,
      modalities: ["text"],
      max_context_tokens: 100_000,
      tool_calling: { supported: capabilities.includes("tools.function_calling"), style: "openai" },
      supports_embeddings: false,
    },
    status: "active",
    ...overrides,
  };
}

const baseRequest: RoutingRequest = {
  requestId: "intent-test",
  taskType: "text.chat",
  requiredCapabilities: [],
  preferredCapabilities: [],
  requiredModalities: ["text"],
  contextTokens: 1000,
  needsTools: false,
  strategy: "balanced",
  preferLocal: false,
};

function input(request: RoutingRequest): RouteRequestInput {
  return {
    request,
    candidates: [
      candidate("text-model", ["text.chat"]),
      candidate("code-model", ["text.chat", "code.read", "code.write", "reasoning.multi_step"]),
    ],
    roleDefinitions: [
      {
        role_id: "coder",
        name: "Coder",
        description: "Code work",
        role_kind: "assistant",
        default_system_instructions: "Operate as coder.",
        task_types_supported: ["coder.edit"],
        required_capabilities: [],
        preferred_capabilities: [],
        forbidden_capabilities: [],
        tool_policy: { mode: "allowed" },
        routing_policy_overrides: {},
        output_contracts: [],
        safety_policy_refs: [],
      },
    ],
    taskDefinitions: [
      {
        task_type: "coder.edit",
        description: "Code edit",
        required_inputs: ["text"],
        required_capabilities: ["code.read", "code.write"],
        preferred_capabilities: ["reasoning.multi_step"],
        quality_metrics: [],
        allowed_roles: ["coder"],
        default_benchmark_suites: [],
      },
    ],
  };
}

describe("routing intent metadata", () => {
  test("uses hard role/task/capability intent as eligibility filters", () => {
    const decision = routeRequest(
      input({
        ...baseRequest,
        roleModelIntent: {
          taxonomyVersion: "1.0.0-alpha.1",
          classificationContractVersion: "role-model.classification.v1",
          role: { id: "coder", hard: true },
          task: { id: "coder.edit", hard: true },
          capabilities: {
            required: ["code.read", "code.write"],
            preferred: ["reasoning.multi_step"],
          },
          modalities: { required: ["text"] },
          toolClasses: [],
          source: "explicit_user",
          confidence: 0.99,
        },
      }),
    );

    expect(decision.chosen_endpoint_id).toBe("code-model");
    expect(decision.eligibility.find((entry) => entry.endpoint_id === "text-model")).toMatchObject({
      eligible: false,
      exclusions: expect.arrayContaining([expect.objectContaining({ code: "CAPABILITY_MISSING" })]),
    });
  });

  test("keeps advisory intent out of hard eligibility while still influencing preference", () => {
    const decision = routeRequest(
      input({
        ...baseRequest,
        roleModelIntent: {
          taxonomyVersion: "1.0.0-alpha.1",
          classificationContractVersion: "role-model.classification.v1",
          role: { id: "coder", hard: false },
          task: { id: "coder.edit", hard: false },
          capabilities: {
            preferred: ["code.write"],
          },
          modalities: { required: ["text"] },
          toolClasses: [],
          source: "heuristic",
          confidence: 0.56,
        },
      }),
    );

    expect(decision.eligibility.every((entry) => entry.eligible)).toBe(true);
    expect(decision.chosen_endpoint_id).toBe("code-model");
  });

  test("uses advisory task metadata as task-fit scoring without hard filtering", () => {
    const decision = routeRequest(
      input({
        ...baseRequest,
        roleModelIntent: {
          taxonomyVersion: "1.0.0-alpha.1",
          classificationContractVersion: "role-model.classification.v1",
          role: { id: "coder", hard: false },
          task: { id: "coder.edit", hard: false },
          modalities: { required: ["text"] },
          toolClasses: [],
          source: "heuristic",
          confidence: 0.56,
        },
      }),
    );

    expect(decision.eligibility.every((entry) => entry.eligible)).toBe(true);
    expect(decision.chosen_endpoint_id).toBe("code-model");
    expect(decision.selection_reasons).toContain("TASK_POLICY_APPLIED");
  });

  test("keeps stable Pi advisory capability and modality metadata out of hard eligibility", () => {
    const decision = routeRequest(
      input({
        ...baseRequest,
        roleModelIntent: {
          contractVersion: 1,
          taxonomyVersion: "1.0.0-alpha.1",
          classificationContractVersion: "role-model.classification.v1",
          role: { id: "missing-role", hard: false },
          task: { id: "missing-role.missing-task", hard: false },
          capabilities: {
            required: ["missing.required.capability"],
            preferred: ["missing.preferred.capability"],
          },
          modalities: { required: ["missing-modality"] },
          toolClasses: ["missing.tool"],
          source: "heuristic",
          confidence: 0.12,
        },
      }),
    );

    expect(decision.chosen_endpoint_id).not.toBe("");
    expect(decision.eligibility.every((entry) => entry.eligible)).toBe(true);
  });

  // ── Addendum 10: Benchmark quality feeds into routing quality metric ──

  test("getQualityMetric uses benchmark quality when live quality is unavailable", () => {
    const c = candidate("test-ep", ["text.chat"], {
      observed: {
        latency_ms_p50: 100,
        latency_ms_p95: 200,
        tokens_per_sec: 50,
        failure_rate: 0,
        cost_per_1k_tokens_est: 0.002,
        measured_at_ms: Date.now(),
      },
      benchmarkCapability: { overallScore: 0.85 },
    });
    const input = { request: baseRequest, candidates: [c], observedDataConfig: { enabled: false, metricHalflives: { qualityMs: 900000, latencyMs: 300000, throughputMs: 120000, reliabilityMs: 600000, costMs: 1800000 }, throughputSla: { enabled: false, minTokensPerSec: 24, penaltyTimeoutMs: 600000 }, difficultyLearning: { recommendation: { minSamples: 4, maxFailureRate: 0.2, minQualityScore: 0.8, minTokensPerSec: 22 } } } };
    const quality = getQualityMetric(c, input);
    expect(quality.value).toBeGreaterThan(0.5);
    expect(quality.value).toBeLessThanOrEqual(0.85);
    expect(quality.source).toBe("benchmark");
    expect(quality.raw.benchmark_quality_score).toBe(0.85);
  });

  test("getQualityMetric prefers live quality_score over benchmark", () => {
    const c = candidate("test-ep", ["text.chat"], {
      observed: {
        latency_ms_p50: 100,
        latency_ms_p95: 200,
        tokens_per_sec: 50,
        failure_rate: 0,
        cost_per_1k_tokens_est: 0.002,
        measured_at_ms: Date.now(),
        quality_score: 0.92,
        quality_measured_at_ms: Date.now(),
        quality_freshness_score: 1.0,
        quality_live_request_samples: 5,
      },
      benchmarkCapability: { overallScore: 0.70 },
    });
    const input = { request: baseRequest, candidates: [c], observedDataConfig: { enabled: false, metricHalflives: { qualityMs: 900000, latencyMs: 300000, throughputMs: 120000, reliabilityMs: 600000, costMs: 1800000 }, throughputSla: { enabled: false, minTokensPerSec: 24, penaltyTimeoutMs: 600000 }, difficultyLearning: { recommendation: { minSamples: 4, maxFailureRate: 0.2, minQualityScore: 0.8, minTokensPerSec: 22 } } } };
    const quality = getQualityMetric(c, input);
    expect(quality.source).toBe("measured");
    expect(quality.raw.quality_score).toBe(0.92);
  });

  test("getQualityMetric prefers judge_score over both quality_score and benchmark", () => {
    const c = candidate("test-ep", ["text.chat"], {
      observed: {
        latency_ms_p50: 100,
        latency_ms_p95: 200,
        tokens_per_sec: 50,
        failure_rate: 0,
        cost_per_1k_tokens_est: 0.002,
        measured_at_ms: Date.now(),
        judge_score: 0.95,
        quality_score: 0.80,
        quality_measured_at_ms: Date.now(),
        quality_freshness_score: 1.0,
      },
      benchmarkCapability: { overallScore: 0.60 },
    });
    const input = { request: baseRequest, candidates: [c], observedDataConfig: { enabled: false, metricHalflives: { qualityMs: 900000, latencyMs: 300000, throughputMs: 120000, reliabilityMs: 600000, costMs: 1800000 }, throughputSla: { enabled: false, minTokensPerSec: 24, penaltyTimeoutMs: 600000 }, difficultyLearning: { recommendation: { minSamples: 4, maxFailureRate: 0.2, minQualityScore: 0.8, minTokensPerSec: 22 } } } };
    const quality = getQualityMetric(c, input);
    expect(quality.source).toBe("measured");
    expect(quality.raw.judge_score).toBe(0.95);
  });

  test("getQualityMetric falls back to default when no quality data exists", () => {
    const c = candidate("test-ep", ["text.chat"], { observed: undefined });
    const input = { request: baseRequest, candidates: [c], observedDataConfig: { enabled: false, metricHalflives: { qualityMs: 900000, latencyMs: 300000, throughputMs: 120000, reliabilityMs: 600000, costMs: 1800000 }, throughputSla: { enabled: false, minTokensPerSec: 24, penaltyTimeoutMs: 600000 }, difficultyLearning: { recommendation: { minSamples: 4, maxFailureRate: 0.2, minQualityScore: 0.8, minTokensPerSec: 22 } } } };
    const quality = getQualityMetric(c, input);
    expect(quality.value).toBe(0.5);
    expect(quality.source).toBe("default");
  });

  test("multiple candidates with different benchmark scores get different quality metrics", () => {
    const c1 = candidate("v4-pro", ["text.chat"], { observed: undefined, benchmarkCapability: { overallScore: 1.0 } });
    const c2 = candidate("v4-flash", ["text.chat"], { observed: undefined, benchmarkCapability: { overallScore: 0.75 } });
    const input = { request: baseRequest, candidates: [c1, c2], observedDataConfig: { enabled: false, metricHalflives: { qualityMs: 900000, latencyMs: 300000, throughputMs: 120000, reliabilityMs: 600000, costMs: 1800000 }, throughputSla: { enabled: false, minTokensPerSec: 24, penaltyTimeoutMs: 600000 }, difficultyLearning: { recommendation: { minSamples: 4, maxFailureRate: 0.2, minQualityScore: 0.8, minTokensPerSec: 22 } } } };
    const q1 = getQualityMetric(c1, input);
    const q2 = getQualityMetric(c2, input);
    expect(q1.value).toBeGreaterThan(q2.value);
    expect(q1.source).toBe("benchmark");
    expect(q2.source).toBe("benchmark");
  });
});
