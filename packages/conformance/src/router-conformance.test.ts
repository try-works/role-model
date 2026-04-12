import { describe, expect, test } from "vitest";

import { routeRequest } from "@role-model-router/core";

const baseRequest = {
  requestId: "req-1",
  taskType: "code.edit",
  requiredCapabilities: ["code.edit"],
  preferredCapabilities: ["reasoning.multi_step"],
  requiredModalities: ["text"],
  contextTokens: 4096,
  needsTools: true,
  strategy: "balanced",
  preferLocal: true,
  budgetLimit: 0.01,
} as const;

const candidates = [
  {
    identity: {
      endpoint_id: "local-cli",
      endpoint_kind: "cli-agent",
      provider_kind: "provider-cli",
      serving_source: "local-process",
      model_id: "gpt-5.4",
      package_id: "provider-cli",
      variant_id: "default",
      runtime_version: "1.0.0",
      quantization: "none",
      precision: "fp16",
      host_class: "skill-router",
      device_class: "workstation",
      region: "local",
      org_scope: "personal",
    },
    declared: {
      endpoint_id: "local-cli",
      capabilities: ["code.edit", "reasoning.multi_step", "tools.function_calling"],
      modalities: ["text"],
      max_context_tokens: 32768,
      tool_calling: true,
      supports_embeddings: false,
      platform_constraints: [],
    },
    observed: {
      endpoint_id: "local-cli",
      judge_score: 0.87,
      latency_ms_p50: 120,
      latency_ms_p95: 180,
      tokens_per_sec: 62,
      cold_start_ms: 40,
      failure_rate: 0,
      cost_per_1k_tokens_est: 0,
      freshness_score: 0.9,
      confidence_score: 0.9,
    },
    status: "active",
  },
  {
    identity: {
      endpoint_id: "remote-mcp",
      endpoint_kind: "mcp-endpoint",
      provider_kind: "provider-mcp",
      serving_source: "remote-service",
      model_id: "gpt-5.4-mini",
      package_id: "provider-mcp",
      variant_id: "default",
      runtime_version: "1.0.0",
      quantization: "none",
      precision: "fp16",
      host_class: "skill-router",
      device_class: "remote",
      region: "us-east",
      org_scope: "team",
    },
    declared: {
      endpoint_id: "remote-mcp",
      capabilities: ["code.edit", "tools.function_calling"],
      modalities: ["text"],
      max_context_tokens: 32768,
      tool_calling: true,
      supports_embeddings: true,
      platform_constraints: [],
    },
    observed: {
      endpoint_id: "remote-mcp",
      judge_score: 0.92,
      latency_ms_p50: 110,
      latency_ms_p95: 160,
      tokens_per_sec: 80,
      cold_start_ms: 35,
      failure_rate: 0,
      cost_per_1k_tokens_est: 0.005,
      freshness_score: 0.95,
      confidence_score: 0.95,
    },
    status: "active",
  },
];

describe("routeRequest", () => {
  test("excludes capability-missing candidates", () => {
    const result = routeRequest({
      request: { ...baseRequest, requiredCapabilities: ["embeddings.text"] },
      candidates,
    });

    expect(result.ineligible_candidates[0]?.reasons).toContain("CAPABILITY_MISSING");
  });

  test("excludes insufficient context candidates", () => {
    const result = routeRequest({
      request: { ...baseRequest, contextTokens: 999999 },
      candidates,
    });

    expect(
      result.ineligible_candidates.every((candidate) =>
        candidate.reasons.includes("CONTEXT_TOO_SMALL"),
      ),
    ).toBe(true);
  });

  test("excludes tool-unsupported candidates", () => {
    const result = routeRequest({
      request: baseRequest,
      candidates: [
        {
          ...candidates[0],
          declared: { ...candidates[0].declared, tool_calling: false },
        },
      ],
    });

    expect(result.ineligible_candidates[0]?.reasons).toContain("TOOLS_UNSUPPORTED");
  });

  test("applies local preference for balanced ties", () => {
    const result = routeRequest({
      request: { ...baseRequest, preferredCapabilities: [] },
      candidates: [
        candidates[0],
        {
          ...candidates[1],
          observed: {
            ...candidates[1].observed,
            judge_score: 0.87,
            latency_ms_p50: 120,
            latency_ms_p95: 180,
            cost_per_1k_tokens_est: 0,
          },
        },
      ],
    });

    expect(result.chosen_endpoint_id).toBe("local-cli");
    expect(result.selection_reasons).toContain("LOCAL_PREFERENCE_APPLIED");
  });

  test("prefers measured profile strength when available", () => {
    const result = routeRequest({
      request: baseRequest,
      candidates,
    });

    expect(result.chosen_endpoint_id).toBe("local-cli");
    expect(result.selection_reasons).toContain("MEASURED_PROFILE_USED");
  });

  test("can optimize for cost", () => {
    const result = routeRequest({
      request: { ...baseRequest, strategy: "low-cost" },
      candidates,
    });

    expect(result.chosen_endpoint_id).toBe("local-cli");
    expect(result.selection_reasons).toContain("BUDGET_OPTIMIZATION");
  });

  test("breaks ties deterministically by endpoint id last", () => {
    const tieCandidates = [
      {
        ...candidates[0],
        identity: { ...candidates[0].identity, endpoint_id: "beta" },
        declared: { ...candidates[0].declared, endpoint_id: "beta" },
        observed: { ...candidates[0].observed, endpoint_id: "beta" },
      },
      {
        ...candidates[0],
        identity: { ...candidates[0].identity, endpoint_id: "alpha" },
        declared: { ...candidates[0].declared, endpoint_id: "alpha" },
        observed: { ...candidates[0].observed, endpoint_id: "alpha" },
      },
    ];

    const result = routeRequest({
      request: { ...baseRequest, preferLocal: false, preferredCapabilities: [] },
      candidates: tieCandidates,
    });

    expect(result.chosen_endpoint_id).toBe("alpha");
  });
});
