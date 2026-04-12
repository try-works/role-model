import { describe, expect, test } from "vitest";

import { routeRequest } from "@role-model-router/core";

const supportedToolCalling = {
  supported: true,
  style: "openai",
} as const;

const unsupportedToolCalling = {
  supported: false,
  style: "none",
} as const;

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
      tool_calling: supportedToolCalling,
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
      tool_calling: supportedToolCalling,
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

function getEligibilityEntry(
  result: ReturnType<typeof routeRequest>,
  endpointId: string,
): (typeof result.eligibility)[number] {
  const entry = result.eligibility.find((candidate) => candidate.endpoint_id === endpointId);
  if (!entry) {
    throw new Error(`Missing eligibility entry for ${endpointId}`);
  }

  return entry;
}

function getExclusionCodes(result: ReturnType<typeof routeRequest>, endpointId: string): string[] {
  return getEligibilityEntry(result, endpointId).exclusions.map((exclusion) => exclusion.code);
}

describe("routeRequest", () => {
  test("excludes capability-missing candidates", () => {
    const result = routeRequest({
      request: { ...baseRequest, requiredCapabilities: ["embeddings.text"] },
      candidates,
    });

    expect(getExclusionCodes(result, "local-cli")).toContain("CAPABILITY_MISSING");
  });

  test("excludes insufficient context candidates", () => {
    const result = routeRequest({
      request: { ...baseRequest, contextTokens: 999999 },
      candidates,
    });

    expect(
      result.eligibility.every(
        (candidate) => candidate.eligible || candidate.exclusions.some((reason) => reason.code === "CONTEXT_TOO_SMALL"),
      ),
    ).toBe(true);
  });

  test("excludes tool-unsupported candidates", () => {
    const result = routeRequest({
      request: baseRequest,
      candidates: [
        {
          ...candidates[0],
          declared: { ...candidates[0].declared, tool_calling: unsupportedToolCalling },
        },
      ],
    });

    expect(getExclusionCodes(result, "local-cli")).toContain("TOOLS_UNSUPPORTED");
  });

  test("excludes tool-unsupported candidates when tool_calling.supported is false", () => {
    const input = JSON.parse(`{
      "request": {
        "requestId": "req-tool-object-1",
        "taskType": "code.edit",
        "requiredCapabilities": ["code.edit"],
        "preferredCapabilities": ["reasoning.multi_step"],
        "requiredModalities": ["text"],
        "contextTokens": 4096,
        "needsTools": true,
        "strategy": "balanced",
        "preferLocal": true,
        "budgetLimit": 0.01
      },
      "candidates": [
        {
          "identity": {
            "endpoint_id": "local-cli",
            "endpoint_kind": "cli-agent",
            "provider_kind": "provider-cli",
            "serving_source": "local-process",
            "model_id": "gpt-5.4",
            "package_id": "provider-cli",
            "variant_id": "default",
            "runtime_version": "1.0.0",
            "quantization": "none",
            "precision": "fp16",
            "host_class": "skill-router",
            "device_class": "workstation",
            "region": "local",
            "org_scope": "personal"
          },
          "declared": {
            "endpoint_id": "local-cli",
            "capabilities": ["code.edit", "reasoning.multi_step", "tools.function_calling"],
            "modalities": ["text"],
            "max_context_tokens": 32768,
            "tool_calling": {
              "supported": false,
              "style": "none"
            },
            "supports_embeddings": false,
            "platform_constraints": []
          },
          "status": "active"
        }
      ]
    }`);

    const result = routeRequest(input);

    expect(getExclusionCodes(result, "local-cli")).toContain("TOOLS_UNSUPPORTED");
  });

  test("emits canonical eligibility entries with exclusions instead of legacy ineligible candidate lists", () => {
    const result = routeRequest({
      request: baseRequest,
      candidates: [
        {
          ...candidates[0],
          declared: { ...candidates[0].declared, tool_calling: unsupportedToolCalling },
        },
      ],
    }) as unknown as {
      eligibility?: Array<{
        endpoint_id: string;
        eligible: boolean;
        exclusions: Array<{ code: string; detail: string }>;
      }>;
    };

    expect(result.eligibility).toEqual([
      {
        endpoint_id: "local-cli",
        eligible: false,
        exclusions: [
          {
            code: "TOOLS_UNSUPPORTED",
            detail: "Endpoint does not support tool calling.",
          },
        ],
      },
    ]);
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

  test("applies canonical remote compute preference during scoring", () => {
    const request: Parameters<typeof routeRequest>[0]["request"] & {
      computePreference: "remote";
    } = {
      ...baseRequest,
      requestId: "req-remote-preference-1",
      preferLocal: false,
      preferredCapabilities: [],
      computePreference: "remote",
    };

    const result = routeRequest({
      request,
      candidates: [
        {
          ...candidates[0],
          identity: {
            ...candidates[0].identity,
            endpoint_id: "alpha-local",
          },
          declared: {
            ...candidates[0].declared,
            endpoint_id: "alpha-local",
            capabilities: ["code.edit", "tools.function_calling"],
          },
          observed: {
            ...candidates[0].observed,
            endpoint_id: "alpha-local",
            judge_score: 0.9,
            latency_ms_p50: 100,
            latency_ms_p95: 150,
            tokens_per_sec: 70,
            cold_start_ms: 30,
            cost_per_1k_tokens_est: 0.001,
            freshness_score: 0.93,
            confidence_score: 0.93,
          },
        },
        {
          ...candidates[1],
          identity: {
            ...candidates[1].identity,
            endpoint_id: "zeta-remote",
          },
          declared: {
            ...candidates[1].declared,
            endpoint_id: "zeta-remote",
            capabilities: ["code.edit", "tools.function_calling"],
          },
          observed: {
            ...candidates[1].observed,
            endpoint_id: "zeta-remote",
            judge_score: 0.9,
            latency_ms_p50: 100,
            latency_ms_p95: 150,
            tokens_per_sec: 70,
            cold_start_ms: 30,
            cost_per_1k_tokens_est: 0.001,
            freshness_score: 0.93,
            confidence_score: 0.93,
          },
        },
      ],
    });

    expect(result.chosen_endpoint_id).toBe("zeta-remote");
    expect(result.selection_reasons).toContain("REMOTE_PREFERENCE_APPLIED");
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

  test("accepts canonical cost strategy inputs", () => {
    const request: Parameters<typeof routeRequest>[0]["request"] & {
      strategy: "cost";
    } = {
      ...baseRequest,
      requestId: "req-canonical-cost-1",
      strategy: "cost",
    };

    const result = routeRequest({
      request,
      candidates,
    });

    expect(result.selection_reasons).toContain("BUDGET_OPTIMIZATION");
  });

  test("uses balanced strategy weights so substantially lower cost can beat slightly higher quality", () => {
    const result = routeRequest({
      request: {
        ...baseRequest,
        requestId: "req-balanced-weights-1",
        preferLocal: false,
        preferredCapabilities: [],
      },
      candidates: [
        {
          ...candidates[0],
          identity: {
            ...candidates[0].identity,
            endpoint_id: "alpha-expensive",
            serving_source: "remote-service",
            device_class: "remote",
            region: "us-west",
          },
          declared: {
            ...candidates[0].declared,
            endpoint_id: "alpha-expensive",
            capabilities: ["code.edit", "tools.function_calling"],
          },
          observed: {
            ...candidates[0].observed,
            endpoint_id: "alpha-expensive",
            judge_score: 0.95,
            latency_ms_p50: 100,
            latency_ms_p95: 150,
            tokens_per_sec: 70,
            failure_rate: 0,
            cost_per_1k_tokens_est: 0.009,
            freshness_score: 0.93,
            confidence_score: 0.93,
          },
        },
        {
          ...candidates[1],
          identity: {
            ...candidates[1].identity,
            endpoint_id: "zeta-cheaper",
            serving_source: "remote-service",
            region: "us-east",
          },
          declared: {
            ...candidates[1].declared,
            endpoint_id: "zeta-cheaper",
            capabilities: ["code.edit", "tools.function_calling"],
          },
          observed: {
            ...candidates[1].observed,
            endpoint_id: "zeta-cheaper",
            judge_score: 0.85,
            latency_ms_p50: 100,
            latency_ms_p95: 150,
            tokens_per_sec: 70,
            failure_rate: 0,
            cost_per_1k_tokens_est: 0.001,
            freshness_score: 0.93,
            confidence_score: 0.93,
          },
        },
      ],
    });

    expect(result.chosen_endpoint_id).toBe("zeta-cheaper");
  });

  test("applies role and task preferred capabilities through preference scoring", () => {
    const preferenceCandidates = [
      {
        ...candidates[0],
        identity: {
          ...candidates[0].identity,
          endpoint_id: "zeta-local",
          serving_source: "remote-service",
          device_class: "remote",
          region: "us-west",
        },
        declared: { ...candidates[0].declared, endpoint_id: "zeta-local" },
        observed: {
          ...candidates[0].observed,
          endpoint_id: "zeta-local",
          judge_score: 0.88,
          latency_ms_p50: 115,
          latency_ms_p95: 170,
          tokens_per_sec: 70,
          cost_per_1k_tokens_est: 0.001,
          freshness_score: 0.93,
          confidence_score: 0.93,
        },
      },
      {
        ...candidates[1],
        identity: { ...candidates[1].identity, endpoint_id: "alpha-remote" },
        declared: { ...candidates[1].declared, endpoint_id: "alpha-remote" },
        observed: {
          ...candidates[1].observed,
          endpoint_id: "alpha-remote",
          judge_score: 0.88,
          latency_ms_p50: 115,
          latency_ms_p95: 170,
          tokens_per_sec: 70,
          cost_per_1k_tokens_est: 0.001,
          freshness_score: 0.93,
          confidence_score: 0.93,
        },
      },
    ];

    const result = routeRequest({
      request: {
        ...baseRequest,
        requestId: "req-role-task-preference-1",
        requestedRoleId: "developer",
        preferredCapabilities: [],
        preferLocal: false,
      },
      candidates: preferenceCandidates,
      roleDefinitions: [
        {
          role_id: "developer",
          name: "Developer",
          description: "Code editing role",
          role_kind: "assistant",
          default_system_instructions: "Help with code edits.",
          task_types_supported: ["code.edit"],
          required_capabilities: [],
          preferred_capabilities: ["reasoning.multi_step"],
          forbidden_capabilities: [],
          tool_policy: { mode: "allowed" },
          routing_policy_overrides: {},
          output_contracts: [],
          safety_policy_refs: [],
        },
      ],
      taskDefinitions: [
        {
          task_type: "code.edit",
          description: "Code editing task",
          required_inputs: [],
          required_capabilities: ["code.edit"],
          preferred_capabilities: ["reasoning.multi_step"],
          quality_metrics: [],
          allowed_roles: ["developer"],
          default_benchmark_suites: [],
        },
      ],
      roleBindings: [],
    });

    expect(result.chosen_endpoint_id).toBe("zeta-local");
    expect(result.selection_reasons).toEqual(
      expect.arrayContaining(["ROLE_PREFERENCE_APPLIED", "TASK_REQUIREMENTS_SATISFIED"]),
    );
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

  test("treats near-equal total scores as ties and breaks them by higher quality first", () => {
    const nearTieCandidates = [
      {
        ...candidates[0],
        identity: {
          ...candidates[0].identity,
          endpoint_id: "lower-quality-cheaper",
          serving_source: "remote-service",
          device_class: "remote",
          region: "us-west",
        },
        declared: { ...candidates[0].declared, endpoint_id: "lower-quality-cheaper" },
        observed: {
          ...candidates[0].observed,
          endpoint_id: "lower-quality-cheaper",
          judge_score: 0.9,
          latency_ms_p95: 170,
          cost_per_1k_tokens_est: 0,
          freshness_score: 0.93,
          confidence_score: 0.93,
        },
      },
      {
        ...candidates[1],
        identity: {
          ...candidates[1].identity,
          endpoint_id: "higher-quality-costlier",
          serving_source: "remote-service",
          device_class: "remote",
          region: "us-east",
        },
        declared: { ...candidates[1].declared, endpoint_id: "higher-quality-costlier" },
        observed: {
          ...candidates[1].observed,
          endpoint_id: "higher-quality-costlier",
          judge_score: 0.9001,
          latency_ms_p95: 170,
          cost_per_1k_tokens_est: 0.00003,
          freshness_score: 0.93,
          confidence_score: 0.93,
        },
      },
    ];

    const result = routeRequest({
      request: { ...baseRequest, preferLocal: false, preferredCapabilities: [] },
      candidates: nearTieCandidates,
    });

    expect(result.chosen_endpoint_id).toBe("higher-quality-costlier");
  });
});
