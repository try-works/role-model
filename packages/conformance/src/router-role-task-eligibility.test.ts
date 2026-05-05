import { describe, expect, test } from "vitest";

import { routeRequest } from "@role-model-router/core";

const supportedToolCalling = {
  supported: true,
  style: "openai",
} as const;

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

describe("routeRequest role/task eligibility", () => {
  test("excludes endpoints when the requested task is unsupported by the role and the role is not allowed for the task", () => {
    const result = routeRequest({
      request: {
        requestId: "req-role-task-1",
        requestedRoleId: "general.chat",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 2048,
        needsTools: false,
        strategy: "balanced",
        preferLocal: false,
      },
      candidates: [
        {
          identity: {
            endpoint_id: "endpoint-1",
            endpoint_kind: "local-engine",
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
            endpoint_id: "endpoint-1",
            capabilities: ["code.edit"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: supportedToolCalling,
            supports_embeddings: false,
            platform_constraints: [],
          },
          status: "active",
        },
      ],
      roleDefinitions: [
        {
          role_id: "general.chat",
          name: "General Chat",
          description: "General-purpose chat role",
          role_kind: "assistant",
          default_system_instructions: "Be helpful.",
          task_types_supported: ["text.chat"],
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
          task_type: "code.edit",
          description: "Code editing task",
          required_inputs: [],
          required_capabilities: ["code.edit"],
          preferred_capabilities: [],
          quality_metrics: [],
          allowed_roles: ["coder.patch", "coder.review"],
          default_benchmark_suites: [],
        },
      ],
      roleBindings: [],
    } as never);

    expect(result.eligibility.filter((candidate) => !candidate.eligible)).toHaveLength(1);
    expect(getExclusionCodes(result, "endpoint-1")).toEqual(
      expect.arrayContaining(["TASK_NOT_SUPPORTED_BY_ROLE", "ROLE_NOT_ALLOWED"]),
    );
    expect(result.chosen_endpoint_id).toBe("");
    expect(result.fallback_endpoint_ids).toHaveLength(0);
  });

  test("excludes endpoints when the matching role binding is not active", () => {
    const result = routeRequest({
      request: {
        requestId: "req-role-binding-1",
        requestedRoleId: "developer",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 2048,
        needsTools: false,
        strategy: "balanced",
        preferLocal: false,
      },
      candidates: [
        {
          identity: {
            endpoint_id: "endpoint-1",
            endpoint_kind: "local-engine",
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
            endpoint_id: "endpoint-1",
            capabilities: ["code.edit"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: supportedToolCalling,
            supports_embeddings: false,
            platform_constraints: [],
          },
          status: "active",
        },
      ],
      roleDefinitions: [
        {
          role_id: "developer",
          name: "Developer",
          description: "Code editing role",
          role_kind: "assistant",
          default_system_instructions: "Help with code edits.",
          task_types_supported: ["code.edit"],
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
          task_type: "code.edit",
          description: "Code editing task",
          required_inputs: [],
          required_capabilities: ["code.edit"],
          preferred_capabilities: [],
          quality_metrics: [],
          allowed_roles: ["developer"],
          default_benchmark_suites: [],
        },
      ],
      roleBindings: [
        {
          binding_id: "binding-1",
          role_id: "developer",
          endpoint_id: "endpoint-1",
          status: "inactive",
          policy_overrides: {},
          effective_capabilities: ["code.edit"],
          effective_task_types: ["code.edit"],
        },
      ],
    } as never);

    expect(result.eligibility.filter((candidate) => !candidate.eligible)).toHaveLength(1);
    expect(getExclusionCodes(result, "endpoint-1")).toEqual(
      expect.arrayContaining(["ROLE_BINDING_INACTIVE"]),
    );
    expect(result.chosen_endpoint_id).toBe("");
  });

  test("excludes endpoints when the matching role binding is disabled", () => {
    const result = routeRequest({
      request: {
        requestId: "req-role-binding-disabled-1",
        requestedRoleId: "developer",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 2048,
        needsTools: false,
        strategy: "balanced",
        preferLocal: false,
      },
      candidates: [
        {
          identity: {
            endpoint_id: "endpoint-1",
            endpoint_kind: "local-engine",
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
            endpoint_id: "endpoint-1",
            capabilities: ["code.edit"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: supportedToolCalling,
            supports_embeddings: false,
            platform_constraints: [],
          },
          status: "active",
        },
      ],
      roleDefinitions: [
        {
          role_id: "developer",
          name: "Developer",
          description: "Code editing role",
          role_kind: "assistant",
          default_system_instructions: "Help with code edits.",
          task_types_supported: ["code.edit"],
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
          task_type: "code.edit",
          description: "Code editing task",
          required_inputs: [],
          required_capabilities: ["code.edit"],
          preferred_capabilities: [],
          quality_metrics: [],
          allowed_roles: ["developer"],
          default_benchmark_suites: [],
        },
      ],
      roleBindings: [
        {
          binding_id: "binding-1",
          role_id: "developer",
          endpoint_id: "endpoint-1",
          status: "disabled",
          policy_overrides: {},
          effective_capabilities: ["code.edit"],
          effective_task_types: ["code.edit"],
        },
      ],
    } as never);

    expect(getExclusionCodes(result, "endpoint-1")).toEqual(
      expect.arrayContaining(["ROLE_BINDING_DISABLED"]),
    );
  });

  test("excludes endpoints missing required capabilities inherited from the requested role and task", () => {
    const result = routeRequest({
      request: {
        requestId: "req-role-task-capabilities-1",
        requestedRoleId: "developer",
        taskType: "code.edit",
        requiredCapabilities: [],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 2048,
        needsTools: false,
        strategy: "balanced",
        preferLocal: false,
      },
      candidates: [
        {
          identity: {
            endpoint_id: "endpoint-1",
            endpoint_kind: "local-engine",
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
            endpoint_id: "endpoint-1",
            capabilities: ["code.edit"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: supportedToolCalling,
            supports_embeddings: false,
            platform_constraints: [],
          },
          status: "active",
        },
      ],
      roleDefinitions: [
        {
          role_id: "developer",
          name: "Developer",
          description: "Code editing role",
          role_kind: "assistant",
          default_system_instructions: "Help with code edits.",
          task_types_supported: ["code.edit"],
          required_capabilities: ["tools.function_calling"],
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
          task_type: "code.edit",
          description: "Code editing task",
          required_inputs: [],
          required_capabilities: ["code.edit"],
          preferred_capabilities: [],
          quality_metrics: [],
          allowed_roles: ["developer"],
          default_benchmark_suites: [],
        },
      ],
      roleBindings: [],
    } as never);

    expect(result.eligibility.filter((candidate) => !candidate.eligible)).toHaveLength(1);
    expect(getExclusionCodes(result, "endpoint-1")).toEqual(
      expect.arrayContaining(["CAPABILITY_MISSING"]),
    );
    expect(result.chosen_endpoint_id).toBe("");
  });

  test("excludes endpoints exposing capabilities forbidden by the requested role", () => {
    const result = routeRequest({
      request: {
        requestId: "req-role-task-forbidden-1",
        requestedRoleId: "developer",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 2048,
        needsTools: false,
        strategy: "balanced",
        preferLocal: false,
      },
      candidates: [
        {
          identity: {
            endpoint_id: "endpoint-1",
            endpoint_kind: "local-engine",
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
            endpoint_id: "endpoint-1",
            capabilities: ["code.edit", "network.remote"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: supportedToolCalling,
            supports_embeddings: false,
            platform_constraints: [],
          },
          status: "active",
        },
      ],
      roleDefinitions: [
        {
          role_id: "developer",
          name: "Developer",
          description: "Code editing role",
          role_kind: "assistant",
          default_system_instructions: "Help with code edits.",
          task_types_supported: ["code.edit"],
          required_capabilities: [],
          preferred_capabilities: [],
          forbidden_capabilities: ["network.remote"],
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
          preferred_capabilities: [],
          quality_metrics: [],
          allowed_roles: ["developer"],
          default_benchmark_suites: [],
        },
      ],
      roleBindings: [],
    } as never);

    expect(result.eligibility.filter((candidate) => !candidate.eligible)).toHaveLength(1);
    expect(getExclusionCodes(result, "endpoint-1")).toEqual(
      expect.arrayContaining(["FORBIDDEN_CAPABILITY_PRESENT"]),
    );
    expect(result.chosen_endpoint_id).toBe("");
  });

  test("excludes endpoints when binding-effective capabilities are narrower than the candidate declaration", () => {
    const result = routeRequest({
      request: {
        requestId: "req-binding-capability-restriction-1",
        requestedRoleId: "developer",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit", "tools.function_calling"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 2048,
        needsTools: true,
        strategy: "balanced",
        preferLocal: false,
      },
      candidates: [
        {
          identity: {
            endpoint_id: "endpoint-1",
            endpoint_kind: "local-engine",
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
            endpoint_id: "endpoint-1",
            capabilities: ["code.edit", "tools.function_calling"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: supportedToolCalling,
            supports_embeddings: false,
            platform_constraints: [],
          },
          status: "active",
        },
      ],
      roleDefinitions: [
        {
          role_id: "developer",
          name: "Developer",
          description: "Code editing role",
          role_kind: "assistant",
          default_system_instructions: "Help with code edits.",
          task_types_supported: ["code.edit"],
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
          task_type: "code.edit",
          description: "Code editing task",
          required_inputs: [],
          required_capabilities: ["code.edit"],
          preferred_capabilities: [],
          quality_metrics: [],
          allowed_roles: ["developer"],
          default_benchmark_suites: [],
        },
      ],
      roleBindings: [
        {
          binding_id: "binding-1",
          role_id: "developer",
          endpoint_id: "endpoint-1",
          status: "active",
          policy_overrides: {},
          effective_capabilities: ["code.edit"],
          effective_task_types: ["code.edit"],
        },
      ],
    } as never);

    expect(getExclusionCodes(result, "endpoint-1")).toEqual(
      expect.arrayContaining(["ROLE_BINDING_CAPABILITY_MISSING"]),
    );
  });

  test("excludes endpoints when binding-effective task types do not allow the requested task", () => {
    const result = routeRequest({
      request: {
        requestId: "req-binding-task-restriction-1",
        requestedRoleId: "developer",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 2048,
        needsTools: false,
        strategy: "balanced",
        preferLocal: false,
      },
      candidates: [
        {
          identity: {
            endpoint_id: "endpoint-1",
            endpoint_kind: "local-engine",
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
            endpoint_id: "endpoint-1",
            capabilities: ["code.edit"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: supportedToolCalling,
            supports_embeddings: false,
            platform_constraints: [],
          },
          status: "active",
        },
      ],
      roleDefinitions: [
        {
          role_id: "developer",
          name: "Developer",
          description: "Code editing role",
          role_kind: "assistant",
          default_system_instructions: "Help with code edits.",
          task_types_supported: ["code.edit"],
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
          task_type: "code.edit",
          description: "Code editing task",
          required_inputs: [],
          required_capabilities: ["code.edit"],
          preferred_capabilities: [],
          quality_metrics: [],
          allowed_roles: ["developer"],
          default_benchmark_suites: [],
        },
      ],
      roleBindings: [
        {
          binding_id: "binding-1",
          role_id: "developer",
          endpoint_id: "endpoint-1",
          status: "active",
          policy_overrides: {},
          effective_capabilities: ["code.edit"],
          effective_task_types: ["text.chat"],
        },
      ],
    } as never);

    expect(getExclusionCodes(result, "endpoint-1")).toEqual(
      expect.arrayContaining(["ROLE_BINDING_TASK_NOT_ALLOWED"]),
    );
  });

  test("excludes endpoints whose provider kind is denied by policy", () => {
    const result = routeRequest({
      request: {
        requestId: "req-provider-kind-deny-1",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 2048,
        needsTools: false,
        strategy: "balanced",
        preferLocal: false,
        denyProviderKinds: ["provider-mcp"],
      },
      candidates: [
        {
          identity: {
            endpoint_id: "local-cli",
            endpoint_kind: "local-engine",
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
            capabilities: ["code.edit"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: supportedToolCalling,
            supports_embeddings: false,
            platform_constraints: [],
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
            capabilities: ["code.edit"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: supportedToolCalling,
            supports_embeddings: false,
            platform_constraints: [],
          },
          status: "active",
        },
      ],
    } as never);

    expect(result.chosen_endpoint_id).toBe("local-cli");
    expect(result.eligibility).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpoint_id: "remote-mcp",
          eligible: false,
          exclusions: expect.arrayContaining([
            expect.objectContaining({ code: "POLICY_DENY_ENDPOINT" }),
          ]),
        }),
      ]),
    );
    expect(result.policy_snapshot.deny_provider_kinds).toEqual(["provider-mcp"]);
  });

  test("excludes endpoints whose endpoint id is denied by policy", () => {
    const result = routeRequest({
      request: {
        requestId: "req-endpoint-deny-1",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 2048,
        needsTools: false,
        strategy: "balanced",
        preferLocal: false,
        denyEndpoints: ["remote-mcp"],
      },
      candidates: [
        {
          identity: {
            endpoint_id: "local-cli",
            endpoint_kind: "local-engine",
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
            capabilities: ["code.edit"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: supportedToolCalling,
            supports_embeddings: false,
            platform_constraints: [],
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
            capabilities: ["code.edit"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: supportedToolCalling,
            supports_embeddings: false,
            platform_constraints: [],
          },
          status: "active",
        },
      ],
    } as never);

    expect(result.chosen_endpoint_id).toBe("local-cli");
    expect(result.eligibility).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpoint_id: "remote-mcp",
          eligible: false,
          exclusions: expect.arrayContaining([
            expect.objectContaining({ code: "POLICY_DENY_ENDPOINT" }),
          ]),
        }),
      ]),
    );
    expect(result.policy_snapshot.deny_endpoints).toEqual(["remote-mcp"]);
  });

  test("excludes endpoints not present in the policy allow list", () => {
    const result = routeRequest({
      request: {
        requestId: "req-endpoint-allow-1",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 2048,
        needsTools: false,
        strategy: "balanced",
        preferLocal: false,
        allowEndpoints: ["local-cli"],
      },
      candidates: [
        {
          identity: {
            endpoint_id: "local-cli",
            endpoint_kind: "local-engine",
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
            capabilities: ["code.edit"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: supportedToolCalling,
            supports_embeddings: false,
            platform_constraints: [],
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
            capabilities: ["code.edit"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: supportedToolCalling,
            supports_embeddings: false,
            platform_constraints: [],
          },
          status: "active",
        },
      ],
    } as never);

    expect(result.chosen_endpoint_id).toBe("local-cli");
    expect(result.eligibility).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpoint_id: "remote-mcp",
          eligible: false,
          exclusions: expect.arrayContaining([
            expect.objectContaining({ code: "POLICY_DENY_ENDPOINT" }),
          ]),
        }),
      ]),
    );
    expect(result.policy_snapshot.allow_endpoints).toEqual(["local-cli"]);
  });
});
