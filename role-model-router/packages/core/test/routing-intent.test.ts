import { describe, expect, test } from "vitest";

import { getQualityMetric, routeRequest } from "../src/router.js";
import { extractTaxonomyDimensions } from "../src/taxonomy/telemetry-linkage.js";
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
    const input = {
      request: baseRequest,
      candidates: [c],
      observedDataConfig: {
        enabled: false,
        metricHalflives: {
          qualityMs: 900000,
          latencyMs: 300000,
          throughputMs: 120000,
          reliabilityMs: 600000,
          costMs: 1800000,
        },
        throughputSla: { enabled: false, minTokensPerSec: 24, penaltyTimeoutMs: 600000 },
        difficultyLearning: {
          recommendation: {
            minSamples: 4,
            maxFailureRate: 0.2,
            minQualityScore: 0.8,
            minTokensPerSec: 22,
          },
        },
      },
    };
    const quality = getQualityMetric(c, input);
    expect(quality.value).toBeGreaterThan(0.5);
    expect(quality.value).toBeLessThanOrEqual(0.85);
    expect(quality.source).toBe("benchmark");
    expect(quality.raw.benchmark_quality_score).toBe(0.85);
  });

  test("getQualityMetric prefers benchmark task score over live quality_score for benchmark-scoped requests", () => {
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
      benchmarkCapability: {
        overallScore: 0.7,
        taskScores: { "coder.review": 0.96 },
      },
    });
    const input = {
      request: { ...baseRequest, taskType: "coder.review" },
      candidates: [c],
      observedDataConfig: {
        enabled: false,
        metricHalflives: {
          qualityMs: 900000,
          latencyMs: 300000,
          throughputMs: 120000,
          reliabilityMs: 600000,
          costMs: 1800000,
        },
        throughputSla: { enabled: false, minTokensPerSec: 24, penaltyTimeoutMs: 600000 },
        difficultyLearning: {
          recommendation: {
            minSamples: 4,
            maxFailureRate: 0.2,
            minQualityScore: 0.8,
            minTokensPerSec: 22,
          },
        },
      },
    };
    const quality = getQualityMetric(c, input);
    expect(quality.source).toBe("benchmark");
    expect(quality.value).toBeCloseTo(0.778, 3);
    expect(quality.raw.benchmark_task_score).toBe(0.96);
    expect(quality.raw.quality_score).toBeUndefined();
  });

  test("getQualityMetric prefers benchmark role score over judge_score for benchmark-scoped requests", () => {
    const c = candidate("test-ep", ["text.chat"], {
      observed: {
        latency_ms_p50: 100,
        latency_ms_p95: 200,
        tokens_per_sec: 50,
        failure_rate: 0,
        cost_per_1k_tokens_est: 0.002,
        measured_at_ms: Date.now(),
        judge_score: 0.95,
        quality_score: 0.8,
        quality_measured_at_ms: Date.now(),
        quality_freshness_score: 1.0,
      },
      benchmarkCapability: {
        overallScore: 0.6,
        eligibleRoleScores: { coder: 0.9 },
      },
    });
    const input = {
      request: { ...baseRequest, requestedRoleId: "coder", taskType: "coder.edit" },
      candidates: [c],
      observedDataConfig: {
        enabled: false,
        metricHalflives: {
          qualityMs: 900000,
          latencyMs: 300000,
          throughputMs: 120000,
          reliabilityMs: 600000,
          costMs: 1800000,
        },
        throughputSla: { enabled: false, minTokensPerSec: 24, penaltyTimeoutMs: 600000 },
        difficultyLearning: {
          recommendation: {
            minSamples: 4,
            maxFailureRate: 0.2,
            minQualityScore: 0.8,
            minTokensPerSec: 22,
          },
        },
      },
    };
    const quality = getQualityMetric(c, input);
    expect(quality.source).toBe("benchmark");
    expect(quality.value).toBe(0.9);
    expect(quality.raw.benchmark_role_score).toBe(0.9);
    expect(quality.raw.judge_score).toBeUndefined();
  });

  test("getQualityMetric falls back to default when no quality data exists", () => {
    const c = candidate("test-ep", ["text.chat"], { observed: undefined });
    const input = {
      request: baseRequest,
      candidates: [c],
      observedDataConfig: {
        enabled: false,
        metricHalflives: {
          qualityMs: 900000,
          latencyMs: 300000,
          throughputMs: 120000,
          reliabilityMs: 600000,
          costMs: 1800000,
        },
        throughputSla: { enabled: false, minTokensPerSec: 24, penaltyTimeoutMs: 600000 },
        difficultyLearning: {
          recommendation: {
            minSamples: 4,
            maxFailureRate: 0.2,
            minQualityScore: 0.8,
            minTokensPerSec: 22,
          },
        },
      },
    };
    const quality = getQualityMetric(c, input);
    expect(quality.value).toBe(0.5);
    expect(quality.source).toBe("default");
  });

  test("multiple candidates with different benchmark scores get different quality metrics", () => {
    const c1 = candidate("v4-pro", ["text.chat"], {
      observed: undefined,
      benchmarkCapability: { overallScore: 1.0 },
    });
    const c2 = candidate("v4-flash", ["text.chat"], {
      observed: undefined,
      benchmarkCapability: { overallScore: 0.75 },
    });
    const input = {
      request: baseRequest,
      candidates: [c1, c2],
      observedDataConfig: {
        enabled: false,
        metricHalflives: {
          qualityMs: 900000,
          latencyMs: 300000,
          throughputMs: 120000,
          reliabilityMs: 600000,
          costMs: 1800000,
        },
        throughputSla: { enabled: false, minTokensPerSec: 24, penaltyTimeoutMs: 600000 },
        difficultyLearning: {
          recommendation: {
            minSamples: 4,
            maxFailureRate: 0.2,
            minQualityScore: 0.8,
            minTokensPerSec: 22,
          },
        },
      },
    };
    const q1 = getQualityMetric(c1, input);
    const q2 = getQualityMetric(c2, input);
    expect(q1.value).toBeGreaterThan(q2.value);
    expect(q1.source).toBe("benchmark");
    expect(q2.source).toBe("benchmark");
  });

  const minimalObservedConfig = {
    enabled: false,
    metricHalflives: {
      qualityMs: 900000,
      latencyMs: 300000,
      throughputMs: 120000,
      reliabilityMs: 600000,
      costMs: 1800000,
    },
  } as const;

  // ── SP4: Task-specific benchmark scoring ──

  test("getQualityMetric blends task-specific score when taskScores available", () => {
    const c = candidate("v4-pro", ["text.chat"], {
      observed: undefined,
      benchmarkCapability: {
        overallScore: 0.7,
        taskScores: { "coder.review": 0.95 },
      },
    });
    const input = {
      request: { ...baseRequest, taskType: "coder.review" },
      candidates: [c],
      observedDataConfig: minimalObservedConfig,
    };
    const quality = getQualityMetric(c, input);
    // Blended: 0.7 * 0.7 + 0.3 * 0.95 = 0.49 + 0.285 = 0.775
    expect(quality.value).toBeCloseTo(0.775, 3);
    expect(quality.source).toBe("benchmark");
    expect(quality.raw.benchmark_task_score).toBe(0.95);
  });

  test("getQualityMetric falls back to overallScore when taskScores lacks requested task", () => {
    const c = candidate("v4-pro", ["text.chat"], {
      observed: undefined,
      benchmarkCapability: {
        overallScore: 0.7,
        taskScores: { "coder.review": 0.95 },
      },
    });
    const input = {
      request: { ...baseRequest, taskType: "coder.write" },
      candidates: [c],
      observedDataConfig: minimalObservedConfig,
    };
    const quality = getQualityMetric(c, input);
    // No task match: uses overallScore directly = 0.7
    expect(quality.value).toBe(0.7);
    expect(quality.source).toBe("benchmark");
    expect(quality.raw.benchmark_task_score).toBeUndefined();
  });

  test("getQualityMetric includes benchmark_task_score in raw when task data exists", () => {
    const c = candidate("v4-flash", ["text.chat"], {
      observed: undefined,
      benchmarkCapability: {
        overallScore: 0.6,
        taskScores: { "researcher.compare_sources": 0.88 },
      },
    });
    const input = {
      request: { ...baseRequest, taskType: "researcher.compare_sources" },
      candidates: [c],
      observedDataConfig: minimalObservedConfig,
    };
    const quality = getQualityMetric(c, input);
    expect(quality.raw.benchmark_quality_score).toBe(0.6);
    expect(quality.raw.benchmark_task_score).toBe(0.88);
    expect(quality.raw.benchmark_source).toBe("routing-capability-benchmark");
  });

  // ── SP9: Telemetry advisory boundary ──

  test("getQualityMetric applies telemetry advisory penalty when failure rate is high", () => {
    const c = candidate("v4-flash", ["text.chat"], {
      observed: undefined,
      benchmarkCapability: {
        overallScore: 0.8,
        taskScores: { "coder.review": 0.9 },
      },
      telemetryScores: {
        taskSuccessRates: { "coder.review": 0.6 }, // 40% failure > 20% threshold
      },
    });
    const input = {
      request: { ...baseRequest, taskType: "coder.review" },
      candidates: [c],
      observedDataConfig: minimalObservedConfig,
    };
    const quality = getQualityMetric(c, input);
    // Blended: 0.7*0.8 + 0.3*0.9 = 0.83, then penalty: 0.83 - 0.05 = 0.78
    expect(quality.value).toBeCloseTo(0.78, 3);
    expect(quality.source).toBe("benchmark");
    expect(quality.raw.telemetry_advisory_applied).toBe(true);
    expect(quality.raw.telemetry_success_rate).toBe(0.6);
    expect(quality.raw.telemetry_advisory_adjustment).toBe(-0.05);
  });

  test("getQualityMetric does not apply telemetry penalty when failure rate is low", () => {
    const c = candidate("v4-flash", ["text.chat"], {
      observed: undefined,
      benchmarkCapability: {
        overallScore: 0.8,
        taskScores: { "coder.review": 0.9 },
      },
      telemetryScores: {
        taskSuccessRates: { "coder.review": 0.85 }, // 15% failure < 20% threshold
      },
    });
    const input = {
      request: { ...baseRequest, taskType: "coder.review" },
      candidates: [c],
      observedDataConfig: minimalObservedConfig,
    };
    const quality = getQualityMetric(c, input);
    // Blended: 0.7*0.8 + 0.3*0.9 = 0.83, no penalty
    expect(quality.value).toBeCloseTo(0.83, 3);
    expect(quality.raw.telemetry_advisory_applied).toBeUndefined();
  });

  test("getQualityMetric floors telemetry-adjusted value at 0", () => {
    const c = candidate("bad-model", ["text.chat"], {
      observed: undefined,
      benchmarkCapability: {
        overallScore: 0.03,
      },
      telemetryScores: {
        taskSuccessRates: { "coder.review": 0.5 }, // 50% failure
      },
    });
    const input = {
      request: { ...baseRequest, taskType: "coder.review" },
      candidates: [c],
      observedDataConfig: minimalObservedConfig,
    };
    const quality = getQualityMetric(c, input);
    // 0.03 - 0.05 would be negative, floored to 0
    expect(quality.value).toBe(0);
  });

  // ── SP-A3: Configurable blend weights ──

  test("getQualityMetric uses custom blend weight from config", () => {
    const c = candidate("v4-pro", ["text.chat"], {
      observed: undefined,
      benchmarkCapability: {
        overallScore: 0.6,
        taskScores: { "coder.review": 0.9 },
      },
    });
    const input = {
      request: { ...baseRequest, taskType: "coder.review" },
      candidates: [c],
      observedDataConfig: { ...minimalObservedConfig, benchmarkTaskBlendWeight: 0.5 },
    };
    const quality = getQualityMetric(c, input);
    // 0.5 * 0.6 + 0.5 * 0.9 = 0.75
    expect(quality.value).toBeCloseTo(0.75, 3);
  });

  test("getQualityMetric uses default blend weight when config absent", () => {
    const c = candidate("v4-pro", ["text.chat"], {
      observed: undefined,
      benchmarkCapability: {
        overallScore: 0.6,
        taskScores: { "coder.review": 0.9 },
      },
    });
    const input = {
      request: { ...baseRequest, taskType: "coder.review" },
      candidates: [c],
      observedDataConfig: { ...minimalObservedConfig },
    };
    const quality = getQualityMetric(c, input);
    // Default: 0.7 * 0.6 + 0.3 * 0.9 = 0.69
    expect(quality.value).toBeCloseTo(0.69, 3);
  });

  test("getQualityMetric falls back to eligible benchmark role score when task score is absent", () => {
    const c = candidate("v4-pro", ["text.chat"], {
      observed: undefined,
      benchmarkCapability: {
        overallScore: 0.6,
        eligibleRoleScores: { coder: 0.9 },
      },
    });
    const quality = getQualityMetric(c, {
      request: { ...baseRequest, requestedRoleId: "coder", taskType: "coder.edit" },
      candidates: [c],
      roleDefinitions: [],
      taskDefinitions: [],
      observedDataConfig: minimalObservedConfig,
    });

    expect(quality.value).toBe(0.9);
    expect(quality.raw.benchmark_role_score).toBe(0.9);
    expect(quality.raw.benchmark_quality_score).toBe(0.6);
  });

  test("getQualityMetric falls back to eligible benchmark group score when role score is absent", () => {
    const c = candidate("v4-pro", ["text.chat"], {
      observed: undefined,
      benchmarkCapability: {
        overallScore: 0.6,
        groupScores: { engineering: 0.84 },
      },
    });
    const quality = getQualityMetric(c, {
      request: {
        ...baseRequest,
        taskType: "text.chat",
        roleModelIntent: {
          taxonomyVersion: "1.0.0-alpha.1",
          classificationContractVersion: "role-model.classification.v1",
          role: { id: "coder", hard: false },
        },
      },
      candidates: [c],
      roleDefinitions: [],
      taskDefinitions: [],
      observedDataConfig: minimalObservedConfig,
    });

    expect(quality.value).toBe(0.84);
    expect(quality.raw.benchmark_group_score).toBe(0.84);
    expect(quality.raw.benchmark_group_ids).toEqual(["engineering"]);
  });

  test("getQualityMetric uses custom telemetry threshold from config", () => {
    const c = candidate("v4-flash", ["text.chat"], {
      observed: undefined,
      benchmarkCapability: { overallScore: 0.8 },
      telemetryScores: {
        taskSuccessRates: { "coder.review": 0.75 }, // 25% failure
      },
    });
    const input = {
      request: { ...baseRequest, taskType: "coder.review" },
      candidates: [c],
      observedDataConfig: {
        ...minimalObservedConfig,
        telemetryAdvisoryFailureThreshold: 0.3,
        telemetryAdvisoryPenalty: -0.1,
      },
    };
    const quality = getQualityMetric(c, input);
    // 25% failure < 30% threshold → no penalty
    expect(quality.value).toBe(0.8);
    expect(quality.raw.telemetry_advisory_applied).toBeUndefined();
  });

  test("getQualityMetric applies custom penalty when below custom threshold", () => {
    const c = candidate("v4-flash", ["text.chat"], {
      observed: undefined,
      benchmarkCapability: { overallScore: 0.8 },
      telemetryScores: {
        taskSuccessRates: { "coder.review": 0.55 }, // 45% failure
      },
    });
    const input = {
      request: { ...baseRequest, taskType: "coder.review" },
      candidates: [c],
      observedDataConfig: {
        ...minimalObservedConfig,
        telemetryAdvisoryFailureThreshold: 0.4,
        telemetryAdvisoryPenalty: -0.08,
      },
    };
    const quality = getQualityMetric(c, input);
    // 45% > 40% threshold → penalty: 0.8 - 0.08 = 0.72
    expect(quality.value).toBeCloseTo(0.72, 3);
    expect(quality.raw.telemetry_advisory_applied).toBe(true);
    expect(quality.raw.telemetry_advisory_adjustment).toBe(-0.08);
  });

  test("routeRequest prefers eligible benchmark role score over stronger fallback overall score", () => {
    const eligibleRoleCandidate = candidate("eligible-role", ["text.chat"], {
      benchmarkCapability: {
        overallScore: 0.62,
        eligibleRoleScores: { coder: 0.91 },
      },
    });
    const fallbackOnlyCandidate = candidate("fallback-only", ["text.chat"], {
      benchmarkCapability: {
        overallScore: 0.82,
      },
    });

    const decision = routeRequest({
      request: {
        ...baseRequest,
        requestedRoleId: "coder",
        taskType: "coder.edit",
      },
      candidates: [fallbackOnlyCandidate, eligibleRoleCandidate],
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
          required_capabilities: [],
          preferred_capabilities: [],
          quality_metrics: [],
          allowed_roles: ["coder"],
          default_benchmark_suites: [],
        },
      ],
      observedDataConfig: {
        ...minimalObservedConfig,
        throughputSla: { enabled: false, minTokensPerSec: 24, penaltyTimeoutMs: 600000 },
        difficultyLearning: {
          recommendation: {
            minSamples: 4,
            maxFailureRate: 0.2,
            minQualityScore: 0.8,
            minTokensPerSec: 22,
          },
        },
      },
    });

    expect(decision.chosen_endpoint_id).toBe("eligible-role");
    expect(decision.selection_reasons).toContain("BENCHMARK_ROLE_SCORE");
  });

  test("routeRequest prefers benchmark role evidence over stronger measured quality after eligibility", () => {
    const benchmarkRoleCandidate = candidate("benchmark-role", ["text.chat"], {
      observed: {
        latency_ms_p50: 100,
        latency_ms_p95: 200,
        tokens_per_sec: 50,
        failure_rate: 0,
        cost_per_1k_tokens_est: 0.002,
        measured_at_ms: Date.now(),
        judge_score: 0.72,
      },
      benchmarkCapability: {
        overallScore: 0.62,
        eligibleRoleScores: { coder: 0.91 },
      },
    });
    const strongerMeasuredCandidate = candidate("stronger-measured", ["text.chat"], {
      observed: {
        latency_ms_p50: 100,
        latency_ms_p95: 200,
        tokens_per_sec: 50,
        failure_rate: 0,
        cost_per_1k_tokens_est: 0.002,
        measured_at_ms: Date.now(),
        judge_score: 0.96,
      },
      benchmarkCapability: {
        overallScore: 0.61,
        eligibleRoleScores: { coder: 0.66 },
      },
    });

    const decision = routeRequest({
      request: {
        ...baseRequest,
        requestedRoleId: "coder",
        taskType: "coder.edit",
      },
      candidates: [strongerMeasuredCandidate, benchmarkRoleCandidate],
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
          required_capabilities: [],
          preferred_capabilities: [],
          quality_metrics: [],
          allowed_roles: ["coder"],
          default_benchmark_suites: [],
        },
      ],
      observedDataConfig: {
        ...minimalObservedConfig,
        throughputSla: { enabled: false, minTokensPerSec: 24, penaltyTimeoutMs: 600000 },
        difficultyLearning: {
          recommendation: {
            minSamples: 4,
            maxFailureRate: 0.2,
            minQualityScore: 0.8,
            minTokensPerSec: 22,
          },
        },
      },
    });

    expect(decision.chosen_endpoint_id).toBe("benchmark-role");
    expect(decision.selection_reasons).toContain("BENCHMARK_ROLE_SCORE");
  });

  test("routeRequest reports fallback overall benchmark reason when role and group evidence are low coverage", () => {
    const decision = routeRequest({
      request: {
        ...baseRequest,
        requestedRoleId: "analyst",
        taskType: "analyst.compare",
      },
      candidates: [
        candidate("benchmark-overall-fallback", ["text.chat"], {
          observed: {
            latency_ms_p50: 100,
            latency_ms_p95: 200,
            tokens_per_sec: 50,
            failure_rate: 0,
            cost_per_1k_tokens_est: 0.002,
            measured_at_ms: Date.now(),
            judge_score: 0.72,
          },
          benchmarkCapability: {
            overallScore: 0.95,
            eligibleRoleScores: { analyst: 1 },
            groupScores: { product_design: 1 },
            coverage: {
              lowCoverageRoleIds: ["analyst"],
              lowCoverageGroupIds: ["product_design"],
              roleCases: { analyst: 1 },
            },
          },
        }),
      ],
      roleDefinitions: [
        {
          role_id: "analyst",
          name: "Analyst",
          description: "Analysis work",
          role_kind: "assistant",
          default_system_instructions: "Operate as analyst.",
          task_types_supported: ["analyst.compare"],
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
          task_type: "analyst.compare",
          description: "Compare options",
          required_inputs: ["text"],
          required_capabilities: [],
          preferred_capabilities: [],
          quality_metrics: [],
          allowed_roles: ["analyst"],
          default_benchmark_suites: [],
        },
      ],
      observedDataConfig: {
        ...minimalObservedConfig,
        throughputSla: { enabled: false, minTokensPerSec: 24, penaltyTimeoutMs: 600000 },
        difficultyLearning: {
          recommendation: {
            minSamples: 4,
            maxFailureRate: 0.2,
            minQualityScore: 0.8,
            minTokensPerSec: 22,
          },
        },
      },
    });

    expect(decision.selection_reasons).toContain("BENCHMARK_FALLBACK_OVERALL_SCORE");
    expect(decision.selection_reasons).not.toContain("BENCHMARK_ROLE_SCORE");
    expect(decision.selection_reasons).not.toContain("BENCHMARK_GROUP_SCORE");
  });
});

// ── SP5: Taxonomy dimension extraction ──

describe("extractTaxonomyDimensions", () => {
  test("extracts taxonomy fields from a fully populated normalizedIntent", () => {
    const result = extractTaxonomyDimensions({
      role: { id: "coder", hard: false },
      task: { id: "coder.review", hard: false },
      roleSource: "heuristic",
      taskSource: "heuristic",
      confidence: 0.85,
      taxonomyVersion: "1.0.0-alpha.1",
      classificationContractVersion: "role-model.classification.v1",
    });

    expect(result).toMatchObject({
      taxonomy_role_id: "coder",
      taxonomy_task_type: "coder.review",
      taxonomy_role_source: "heuristic",
      taxonomy_task_source: "heuristic",
      taxonomy_confidence: 0.85,
      taxonomy_version: "1.0.0-alpha.1",
      classification_contract_version: "role-model.classification.v1",
    });
  });

  test("returns null for missing taxonomy fields", () => {
    const result = extractTaxonomyDimensions({
      roleSource: "user",
      taxonomyVersion: "1.0.0-alpha.1",
      classificationContractVersion: "role-model.classification.v1",
    });

    expect(result).toMatchObject({
      taxonomy_role_id: null,
      taxonomy_task_type: null,
      taxonomy_role_source: "user",
      taxonomy_task_source: null,
      taxonomy_confidence: null,
      taxonomy_version: "1.0.0-alpha.1",
      classification_contract_version: "role-model.classification.v1",
    });
  });

  test("returns undefined when normalizedIntent is undefined", () => {
    expect(extractTaxonomyDimensions(undefined)).toBeUndefined();
  });

  test("handles confidence as non-number gracefully", () => {
    const result = extractTaxonomyDimensions({
      confidence: "high", // not a number
    });
    expect(result?.taxonomy_confidence).toBeNull();
  });

  test("extracts partial data when role exists but task is missing", () => {
    const result = extractTaxonomyDimensions({
      role: { id: "security" },
      roleSource: "trusted",
      taxonomyVersion: "1.0.0-alpha.1",
      classificationContractVersion: "role-model.classification.v1",
    });

    expect(result).toMatchObject({
      taxonomy_role_id: "security",
      taxonomy_task_type: null,
      taxonomy_role_source: "trusted",
      taxonomy_task_source: null,
      taxonomy_confidence: null,
      taxonomy_version: "1.0.0-alpha.1",
      classification_contract_version: "role-model.classification.v1",
    });
  });
});
