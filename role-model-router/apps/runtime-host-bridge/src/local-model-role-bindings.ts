import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import type { routeRuntimeRequest } from "@role-model-router/protocol-routing";
import type { ProviderAccountRecord } from "@role-model-router/provider-account";

type RuntimeRoleDefinitionRecord = NonNullable<
  Parameters<typeof routeRuntimeRequest>[0]["roleDefinitions"]
>[number];

type RuntimeRoleBindingRecord = NonNullable<
  Parameters<typeof routeRuntimeRequest>[0]["roleBindings"]
>[number];
type RuntimeTaskDefinitionRecord = NonNullable<
  Parameters<typeof routeRuntimeRequest>[0]["taskDefinitions"]
>[number];
type ModelRoleAssignmentBinding = NonNullable<ProviderAccountRecord["modelRoleBindings"]>[number];

export interface RuntimeEndpointRef {
  readonly endpointId: string;
  readonly providerAccountId: string;
  readonly modelId: string;
}

function buildEffectiveRoleCapabilities(input: {
  readonly endpointCapabilities: readonly string[];
  readonly roleDefinition: RuntimeRoleDefinitionRecord;
  readonly taskDefinitions: readonly RuntimeTaskDefinitionRecord[];
}): string[] {
  const capabilities = new Set<string>(input.endpointCapabilities);
  for (const capability of input.roleDefinition.required_capabilities ?? []) {
    capabilities.add(capability);
  }
  for (const capability of input.roleDefinition.preferred_capabilities ?? []) {
    capabilities.add(capability);
  }
  for (const taskType of input.roleDefinition.task_types_supported ?? []) {
    const taskDefinition = input.taskDefinitions.find((entry) => entry.task_type === taskType);
    for (const capability of taskDefinition?.required_capabilities ?? []) {
      capabilities.add(capability);
    }
    for (const capability of taskDefinition?.preferred_capabilities ?? []) {
      capabilities.add(capability);
    }
  }
  return [...capabilities];
}

function resolveAssignedRoleIds(input: {
  readonly binding?: ModelRoleAssignmentBinding;
  readonly roleDefinitions: readonly RuntimeRoleDefinitionRecord[];
}): readonly string[] {
  const allRoleIds = input.roleDefinitions.map((role) => role.role_id);
  const binding = input.binding;
  if (!binding) {
    return allRoleIds;
  }

  if (binding.roleAssignmentMode === "all") {
    return allRoleIds;
  }

  if (binding.roleAssignmentMode === "exclude") {
    const disabledRoleIds = new Set(binding.disabledRoleIds ?? []);
    return allRoleIds.filter((roleId) => !disabledRoleIds.has(roleId));
  }

  if (binding.roleAssignmentMode === "include" || binding.roleAssignmentMode === "custom") {
    return [...(binding.enabledRoleIds ?? binding.roleIds)];
  }

  return [...binding.roleIds];
}

export function buildAccountEndpointRoleBindings(input: {
  readonly staticBindings: readonly RuntimeRoleBindingRecord[];
  readonly runtimeEndpoints: readonly RuntimeEndpointRef[];
  readonly accounts: readonly ProviderAccountRecord[];
  readonly registry: EndpointRegistryResult;
  readonly roleDefinitions: readonly RuntimeRoleDefinitionRecord[];
  readonly taskDefinitions: readonly RuntimeTaskDefinitionRecord[];
  readonly sanitizeSegment: (value: string) => string;
}): readonly RuntimeRoleBindingRecord[] {
  const roleDefinitionsById = new Map(input.roleDefinitions.map((role) => [role.role_id, role]));
  const capabilitiesByEndpointId = new Map(
    input.registry.endpoints.map((endpoint) => [
      endpoint.identity.endpoint_id,
      [...endpoint.declared.capabilities],
    ]),
  );
  const dynamicBindings = input.runtimeEndpoints.flatMap((endpoint) => {
    const account = input.accounts.find(
      (entry) => entry.providerAccountId === endpoint.providerAccountId,
    );
    if (!account) {
      return [];
    }
    const modelBinding = account.modelRoleBindings?.find(
      (entry) => entry.modelId === endpoint.modelId,
    );
    const endpointCapabilities = capabilitiesByEndpointId.get(endpoint.endpointId) ?? [];
    return resolveAssignedRoleIds({
      binding: modelBinding,
      roleDefinitions: input.roleDefinitions,
    }).flatMap((roleId) => {
      const roleDefinition = roleDefinitionsById.get(roleId);
      if (!roleDefinition) {
        return [];
      }
      return [
        {
          binding_id: `runtime.${input.sanitizeSegment(endpoint.endpointId)}.${input.sanitizeSegment(roleId)}`,
          role_id: roleId,
          endpoint_id: endpoint.endpointId,
          status: "active" as const,
          policy_overrides: {},
          effective_capabilities: buildEffectiveRoleCapabilities({
            endpointCapabilities,
            roleDefinition,
            taskDefinitions: input.taskDefinitions,
          }),
          effective_task_types: [...roleDefinition.task_types_supported],
        },
      ];
    });
  });

  return [...input.staticBindings, ...dynamicBindings];
}

export function buildLlamaSwapRegistryRoleBindings(input: {
  readonly registry: EndpointRegistryResult;
  readonly roleDefinitions: readonly RuntimeRoleDefinitionRecord[];
  readonly taskDefinitions: readonly RuntimeTaskDefinitionRecord[];
  readonly roleIdsByModelId: Readonly<Record<string, readonly string[]>>;
  readonly sanitizeSegment: (value: string) => string;
}): readonly RuntimeRoleBindingRecord[] {
  const roleDefinitionsById = new Map(input.roleDefinitions.map((role) => [role.role_id, role]));
  const bindings: RuntimeRoleBindingRecord[] = [];

  for (const endpoint of input.registry.endpoints) {
    const endpointId = endpoint.identity.endpoint_id;
    if (!endpointId.startsWith("llama-swap.local.")) {
      continue;
    }
    const modelId = endpoint.identity.model_id;
    const roleIds =
      input.roleIdsByModelId[modelId] ?? input.roleDefinitions.map((role) => role.role_id);
    const endpointCapabilities = [...endpoint.declared.capabilities];
    for (const roleId of roleIds) {
      const roleDefinition = roleDefinitionsById.get(roleId);
      if (!roleDefinition) {
        continue;
      }
      bindings.push({
        binding_id: `runtime.${input.sanitizeSegment(endpointId)}.${input.sanitizeSegment(roleId)}`,
        role_id: roleId,
        endpoint_id: endpointId,
        status: "active",
        policy_overrides: {},
        effective_capabilities: buildEffectiveRoleCapabilities({
          endpointCapabilities,
          roleDefinition,
          taskDefinitions: input.taskDefinitions,
        }),
        effective_task_types: [...roleDefinition.task_types_supported],
      });
    }
  }

  return bindings;
}

export function mergeRuntimeRoleBindings(
  accountBindings: readonly RuntimeRoleBindingRecord[],
  llamaSwapBindings: readonly RuntimeRoleBindingRecord[],
): readonly RuntimeRoleBindingRecord[] {
  const seen = new Set<string>();
  const merged: RuntimeRoleBindingRecord[] = [];
  for (const binding of [...accountBindings, ...llamaSwapBindings]) {
    const key = `${binding.endpoint_id}:${binding.role_id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(binding);
  }
  return merged;
}

export function resolveEndpointRoleIds(input: {
  readonly endpointId: string;
  readonly runtimeEndpoints: readonly RuntimeEndpointRef[];
  readonly accounts: readonly ProviderAccountRecord[];
  readonly registry: EndpointRegistryResult;
  readonly roleDefinitions: readonly RuntimeRoleDefinitionRecord[];
  readonly roleIdsByModelId: Readonly<Record<string, readonly string[]>>;
  readonly compareText: (left: string, right: string) => number;
}): readonly string[] {
  const runtimeEndpoint = input.runtimeEndpoints.find(
    (entry) => entry.endpointId === input.endpointId,
  );
  if (runtimeEndpoint) {
    const account = input.accounts.find(
      (entry) => entry.providerAccountId === runtimeEndpoint.providerAccountId,
    );
    if (!account) {
      return [];
    }
    return [
      ...resolveAssignedRoleIds({
        binding: account.modelRoleBindings?.find(
          (entry) => entry.modelId === runtimeEndpoint.modelId,
        ),
        roleDefinitions: input.roleDefinitions,
      }),
    ].sort(input.compareText);
  }

  const registryEndpoint = input.registry.endpoints.find(
    (entry) => entry.identity.endpoint_id === input.endpointId,
  );
  if (!registryEndpoint) {
    return [];
  }
  return [
    ...(input.roleIdsByModelId[registryEndpoint.identity.model_id] ??
      input.roleDefinitions.map((role) => role.role_id)),
  ].sort(input.compareText);
}

export function readLlamaSwapRoleIdsByModelId(
  overrides: Readonly<
    Record<
      string,
      {
        readonly roleIds?: readonly string[];
        readonly roleAssignmentMode?: "all" | "include" | "exclude" | "custom";
        readonly enabledRoleIds?: readonly string[];
        readonly disabledRoleIds?: readonly string[];
      }
    >
  >,
  roleDefinitions: readonly RuntimeRoleDefinitionRecord[] = [],
): Record<string, readonly string[]> {
  const result: Record<string, readonly string[]> = {};
  const allRoleIds = roleDefinitions.map((role) => role.role_id);
  for (const [modelId, override] of Object.entries(overrides)) {
    if (override.roleAssignmentMode === "all") {
      result[modelId] = [...allRoleIds];
      continue;
    }
    if (override.roleAssignmentMode === "exclude") {
      const disabledRoleIds = new Set(override.disabledRoleIds ?? []);
      result[modelId] = allRoleIds.filter((roleId) => !disabledRoleIds.has(roleId));
      continue;
    }
    if (override.roleAssignmentMode === "include" || override.roleAssignmentMode === "custom") {
      result[modelId] = [...(override.enabledRoleIds ?? override.roleIds ?? [])];
      continue;
    }
    if (Array.isArray(override.roleIds) && override.roleIds.length > 0) {
      result[modelId] = [...override.roleIds];
    }
  }
  return result;
}
