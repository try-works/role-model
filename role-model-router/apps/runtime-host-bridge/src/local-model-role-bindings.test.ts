import { describe, expect, it } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import type { ProviderAccountRecord } from "@role-model-router/provider-account";

import {
  buildAccountEndpointRoleBindings,
  buildLlamaSwapRegistryRoleBindings,
  mergeRuntimeRoleBindings,
  readLlamaSwapRoleIdsByModelId,
  resolveEndpointRoleIds,
} from "./local-model-role-bindings.js";

const roleDefinitions = [
  {
    role_id: "general.chat",
    name: "General chat",
    description: "Chat",
    role_kind: "task",
    default_system_instructions: "",
    task_types_supported: ["chat"],
    required_capabilities: ["chat"],
    preferred_capabilities: [],
    forbidden_capabilities: [],
    tool_policy: { mode: "allowed" as const },
    routing_policy_overrides: {},
    output_contracts: [],
    safety_policy_refs: [],
  },
  {
    role_id: "coder.assistant",
    name: "Coder",
    description: "Code",
    role_kind: "task",
    default_system_instructions: "",
    task_types_supported: ["code"],
    required_capabilities: ["chat"],
    preferred_capabilities: [],
    forbidden_capabilities: [],
    tool_policy: { mode: "allowed" as const },
    routing_policy_overrides: {},
    output_contracts: [],
    safety_policy_refs: [],
  },
  {
    role_id: "classifier",
    name: "Classifier",
    description: "Classification",
    role_kind: "task",
    default_system_instructions: "",
    task_types_supported: ["text.classification"],
    required_capabilities: [],
    preferred_capabilities: [],
    forbidden_capabilities: [],
    tool_policy: { mode: "allowed" as const },
    routing_policy_overrides: {},
    output_contracts: [],
    safety_policy_refs: [],
  },
];

const taskDefinitions = [
  {
    task_type: "text.classification",
    description: "Classification task",
    required_inputs: [],
    required_capabilities: ["text.classification"],
    preferred_capabilities: [],
    quality_metrics: [],
    allowed_roles: ["classifier"],
    default_benchmark_suites: [],
  },
];

const registry = {
  endpoints: [
    {
      identity: {
        endpoint_id: "llama-swap.local.lfm",
        model_id: "lfm2.5-8b-a1b",
        runtime_version: "1",
        variant_id: "default",
      },
      declared: { capabilities: ["chat"] },
    },
    {
      identity: {
        endpoint_id: "peer.local.lfm",
        model_id: "lfm2.5-8b-a1b",
        runtime_version: "1",
        variant_id: "default",
      },
      declared: { capabilities: ["chat"] },
    },
  ],
} as unknown as EndpointRegistryResult;

const peerAccount: ProviderAccountRecord = {
  providerAccountId: "local-openai-compatible.personal.peer-a",
  providerId: "local-openai-compatible",
  providerKind: "provider-openai",
  orgScope: "personal",
  accountScope: "peer-a",
  credentialRef: { backend: "local-file", ref: "peer-a" },
  authMode: "api-key-static",
  regionPolicy: { mode: "prefer", regions: ["local"] },
  baseUrlOverride: "http://127.0.0.1:1234/v1",
  allowedModels: [],
  modelRoleBindings: [{ modelId: "lfm2.5-8b-a1b", roleIds: ["general.chat"] }],
  deniedModels: [],
  entitlementTags: ["chat"],
  budgetPolicyRef: "budget.default",
  quotaPolicyRef: "quota.default",
  status: "active",
  healthStatus: "healthy",
  rotationState: "stable",
};

describe("local-model-role-bindings", () => {
  it("builds peer account bindings for wildcard allowedModels", () => {
    const bindings = buildAccountEndpointRoleBindings({
      staticBindings: [],
      runtimeEndpoints: [
        {
          endpointId: "peer.local.lfm",
          providerAccountId: peerAccount.providerAccountId,
          modelId: "lfm2.5-8b-a1b",
        },
      ],
      accounts: [peerAccount],
      registry,
      roleDefinitions: [...roleDefinitions],
      taskDefinitions: [...taskDefinitions],
      sanitizeSegment: (value) => value.replace(/[^a-z0-9]+/gi, "-"),
    });

    expect(bindings).toEqual([
      expect.objectContaining({
        role_id: "general.chat",
        endpoint_id: "peer.local.lfm",
        status: "active",
      }),
    ]);
  });

  it("treats missing model role assignment as all roles for configured runtime endpoints", () => {
    const unassignedAccount: ProviderAccountRecord = {
      ...peerAccount,
      modelRoleBindings: undefined,
    };

    const bindings = buildAccountEndpointRoleBindings({
      staticBindings: [],
      runtimeEndpoints: [
        {
          endpointId: "peer.local.lfm",
          providerAccountId: unassignedAccount.providerAccountId,
          modelId: "lfm2.5-8b-a1b",
        },
      ],
      accounts: [unassignedAccount],
      registry,
      roleDefinitions: [...roleDefinitions],
      taskDefinitions: [...taskDefinitions],
      sanitizeSegment: (value) => value.replace(/[^a-z0-9]+/gi, "-"),
    });

    expect(bindings.map((binding) => binding.role_id).sort()).toEqual([
      "classifier",
      "coder.assistant",
      "general.chat",
    ]);
  });

  it("honors include and exclude role assignment modes while preserving legacy roleIds", () => {
    const accountWithAssignments: ProviderAccountRecord = {
      ...peerAccount,
      modelRoleBindings: [
        {
          modelId: "lfm2.5-8b-a1b",
          roleIds: ["general.chat"],
          roleAssignmentMode: "exclude",
          enabledRoleIds: [],
          disabledRoleIds: ["coder.assistant"],
        },
      ],
    };

    const bindings = buildAccountEndpointRoleBindings({
      staticBindings: [],
      runtimeEndpoints: [
        {
          endpointId: "peer.local.lfm",
          providerAccountId: accountWithAssignments.providerAccountId,
          modelId: "lfm2.5-8b-a1b",
        },
      ],
      accounts: [accountWithAssignments],
      registry,
      roleDefinitions: [...roleDefinitions],
      taskDefinitions: [...taskDefinitions],
      sanitizeSegment: (value) => value.replace(/[^a-z0-9]+/gi, "-"),
    });

    expect(bindings.map((binding) => binding.role_id).sort()).toEqual([
      "classifier",
      "general.chat",
    ]);
  });

  it("builds llama-swap registry bindings from overrides", () => {
    const bindings = buildLlamaSwapRegistryRoleBindings({
      registry,
      roleDefinitions: [...roleDefinitions],
      taskDefinitions: [...taskDefinitions],
      roleIdsByModelId: { "lfm2.5-8b-a1b": ["coder.assistant"] },
      sanitizeSegment: (value) => value.replace(/[^a-z0-9]+/gi, "-"),
    });

    expect(bindings).toEqual([
      expect.objectContaining({
        role_id: "coder.assistant",
        endpoint_id: "llama-swap.local.lfm",
      }),
    ]);
  });

  it("treats missing llama-swap overrides as all roles for loaded local models", () => {
    const bindings = buildLlamaSwapRegistryRoleBindings({
      registry,
      roleDefinitions: [...roleDefinitions],
      taskDefinitions: [...taskDefinitions],
      roleIdsByModelId: {},
      sanitizeSegment: (value) => value.replace(/[^a-z0-9]+/gi, "-"),
    });

    expect(bindings.map((binding) => binding.role_id).sort()).toEqual([
      "classifier",
      "coder.assistant",
      "general.chat",
    ]);
  });

  it("merges bindings without duplicate endpoint-role pairs", () => {
    const left = [
      {
        binding_id: "a",
        role_id: "general.chat",
        endpoint_id: "peer.local.lfm",
        status: "active" as const,
        policy_overrides: {},
        effective_capabilities: ["chat"],
        effective_task_types: ["chat"],
      },
    ];
    const right = [
      {
        binding_id: "b",
        role_id: "general.chat",
        endpoint_id: "peer.local.lfm",
        status: "active" as const,
        policy_overrides: {},
        effective_capabilities: ["chat"],
        effective_task_types: ["chat"],
      },
      {
        binding_id: "c",
        role_id: "coder.assistant",
        endpoint_id: "llama-swap.local.lfm",
        status: "active" as const,
        policy_overrides: {},
        effective_capabilities: ["chat"],
        effective_task_types: ["code"],
      },
    ];

    expect(mergeRuntimeRoleBindings(left, right)).toHaveLength(2);
  });

  it("resolves peer and llama-swap role ids by endpoint", () => {
    expect(
      resolveEndpointRoleIds({
        endpointId: "peer.local.lfm",
        runtimeEndpoints: [
          {
            endpointId: "peer.local.lfm",
            providerAccountId: peerAccount.providerAccountId,
            modelId: "lfm2.5-8b-a1b",
          },
        ],
        accounts: [peerAccount],
        registry,
        roleDefinitions: [...roleDefinitions],
        roleIdsByModelId: { "lfm2.5-8b-a1b": ["coder.assistant"] },
        compareText: (left, right) => left.localeCompare(right, "en"),
      }),
    ).toEqual(["general.chat"]);

    expect(
      resolveEndpointRoleIds({
        endpointId: "llama-swap.local.lfm",
        runtimeEndpoints: [],
        accounts: [],
        registry,
        roleDefinitions: [...roleDefinitions],
        roleIdsByModelId: { "lfm2.5-8b-a1b": ["coder.assistant"] },
        compareText: (left, right) => left.localeCompare(right, "en"),
      }),
    ).toEqual(["coder.assistant"]);
  });

  it("resolves missing endpoint assignments as all roles in readback paths", () => {
    const unassignedAccount: ProviderAccountRecord = {
      ...peerAccount,
      modelRoleBindings: undefined,
    };

    expect(
      resolveEndpointRoleIds({
        endpointId: "peer.local.lfm",
        runtimeEndpoints: [
          {
            endpointId: "peer.local.lfm",
            providerAccountId: unassignedAccount.providerAccountId,
            modelId: "lfm2.5-8b-a1b",
          },
        ],
        accounts: [unassignedAccount],
        registry,
        roleDefinitions: [...roleDefinitions],
        roleIdsByModelId: {},
        compareText: (left, right) => left.localeCompare(right, "en"),
      }),
    ).toEqual(["classifier", "coder.assistant", "general.chat"]);

    expect(
      resolveEndpointRoleIds({
        endpointId: "llama-swap.local.lfm",
        runtimeEndpoints: [],
        accounts: [],
        registry,
        roleDefinitions: [...roleDefinitions],
        roleIdsByModelId: {},
        compareText: (left, right) => left.localeCompare(right, "en"),
      }),
    ).toEqual(["classifier", "coder.assistant", "general.chat"]);
  });

  it("reads llama-swap role ids from overrides", () => {
    expect(
      readLlamaSwapRoleIdsByModelId({
        "lfm2.5-8b-a1b": { roleIds: ["general.chat"] },
        empty: { roleIds: [] },
      }),
    ).toEqual({ "lfm2.5-8b-a1b": ["general.chat"] });
  });

  it("preserves llama-swap all and explicit empty include assignment modes from overrides", () => {
    expect(
      readLlamaSwapRoleIdsByModelId(
        {
          all: {
            roleIds: [],
            roleAssignmentMode: "all",
            enabledRoleIds: [],
            disabledRoleIds: [],
          },
          none: {
            roleIds: [],
            roleAssignmentMode: "include",
            enabledRoleIds: [],
            disabledRoleIds: [],
          },
          withoutSecurity: {
            roleIds: [],
            roleAssignmentMode: "exclude",
            enabledRoleIds: [],
            disabledRoleIds: ["coder.assistant"],
          },
        },
        [...roleDefinitions],
      ),
    ).toEqual({
      all: ["general.chat", "coder.assistant", "classifier"],
      none: [],
      withoutSecurity: ["general.chat", "classifier"],
    });
  });

  it("projects task-required capabilities into effective role bindings", () => {
    const classifierAccount: ProviderAccountRecord = {
      ...peerAccount,
      providerAccountId: "local-openai-compatible.personal.classifier",
      accountScope: "classifier",
      credentialRef: { backend: "local-file", ref: "classifier" },
      modelRoleBindings: [{ modelId: "lfm2.5-8b-a1b", roleIds: ["classifier"] }],
    };

    const bindings = buildAccountEndpointRoleBindings({
      staticBindings: [],
      runtimeEndpoints: [
        {
          endpointId: "peer.local.lfm",
          providerAccountId: classifierAccount.providerAccountId,
          modelId: "lfm2.5-8b-a1b",
        },
      ],
      accounts: [classifierAccount],
      registry,
      roleDefinitions: [...roleDefinitions],
      taskDefinitions: [...taskDefinitions],
      sanitizeSegment: (value) => value.replace(/[^a-z0-9]+/gi, "-"),
    });

    expect(bindings).toEqual([
      expect.objectContaining({
        role_id: "classifier",
        endpoint_id: "peer.local.lfm",
        effective_capabilities: expect.arrayContaining(["chat", "text.classification"]),
        effective_task_types: ["text.classification"],
      }),
    ]);
  });
});
