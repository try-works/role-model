import type { ReadbackState } from "../../readback";

/** S620: the host's /api/role-model/role-policy contract, kept separate from the UI draft. */
export interface RoleDefinition {
  readonly role_id: string;
  readonly name: string;
  readonly description: string;
  readonly role_kind: string;
  readonly default_system_instructions: string;
  readonly task_types_supported: readonly string[];
  readonly required_capabilities: readonly string[];
  readonly preferred_capabilities: readonly string[];
  readonly forbidden_capabilities: readonly string[];
  readonly tool_policy: { readonly mode: string; readonly allowed_tools?: readonly string[] };
  readonly routing_policy_overrides: Record<string, unknown>;
  readonly output_contracts: readonly string[];
  readonly safety_policy_refs: readonly string[];
  readonly primaryGroupId?: string;
  readonly secondaryGroupIds?: readonly string[];
  readonly riskLevel?: string;
}

export interface TaskDefinition {
  readonly task_type: string;
  readonly description: string;
  readonly required_inputs: readonly string[];
  readonly required_capabilities: readonly string[];
  readonly preferred_capabilities: readonly string[];
  readonly quality_metrics: readonly string[];
  readonly allowed_roles: readonly string[];
  readonly default_benchmark_suites: readonly string[];
}

export interface RolePolicy {
  readonly roleDefinitions: readonly RoleDefinition[];
  readonly taskDefinitions: readonly TaskDefinition[];
}

export interface RoleDraft {
  readonly allowedTools: string;
  readonly defaultSystemInstructions: string;
  readonly description: string;
  readonly forbiddenCapabilities: string;
  readonly name: string;
  readonly outputContracts: string;
  readonly preferredCapabilities: string;
  readonly requiredCapabilities: string;
  readonly roleId: string;
  readonly roleKind: string;
  readonly routingOverridesText: string;
  readonly safetyPolicyRefs: string;
  readonly taskTypesSupported: string;
  readonly toolPolicyMode: string;
}

export const ROLE_KIND_OPTIONS = ["assistant", "capability"] as const;
export const TOOL_POLICY_OPTIONS = ["allowed", "limited", "disabled"] as const;

const parseTokenList = (value: string): string[] =>
  value
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const formatTokenList = (values: readonly string[] | undefined): string => (values ?? []).join(", ");

export const blankRoleDraft = (): RoleDraft => ({
  allowedTools: "",
  defaultSystemInstructions: "",
  description: "",
  forbiddenCapabilities: "",
  name: "",
  outputContracts: "",
  preferredCapabilities: "",
  requiredCapabilities: "",
  roleId: "",
  roleKind: "assistant",
  routingOverridesText: "{}",
  safetyPolicyRefs: "",
  taskTypesSupported: "",
  toolPolicyMode: "allowed",
});

export const draftFromRole = (role: RoleDefinition): RoleDraft => ({
  allowedTools: formatTokenList(role.tool_policy.allowed_tools),
  defaultSystemInstructions: role.default_system_instructions,
  description: role.description,
  forbiddenCapabilities: formatTokenList(role.forbidden_capabilities),
  name: role.name,
  outputContracts: formatTokenList(role.output_contracts),
  preferredCapabilities: formatTokenList(role.preferred_capabilities),
  requiredCapabilities: formatTokenList(role.required_capabilities),
  roleId: role.role_id,
  roleKind: role.role_kind,
  routingOverridesText: JSON.stringify(role.routing_policy_overrides ?? {}, null, 2),
  safetyPolicyRefs: formatTokenList(role.safety_policy_refs),
  taskTypesSupported: formatTokenList(role.task_types_supported),
  toolPolicyMode: role.tool_policy.mode,
});

/** The exact body the host's create/update role routes accept (reference toRolePayload). */
export const draftToRolePayload = (draft: RoleDraft): Record<string, unknown> => ({
  default_system_instructions: draft.defaultSystemInstructions.trim(),
  description: draft.description.trim(),
  forbidden_capabilities: parseTokenList(draft.forbiddenCapabilities),
  name: draft.name.trim(),
  output_contracts: parseTokenList(draft.outputContracts),
  preferred_capabilities: parseTokenList(draft.preferredCapabilities),
  required_capabilities: parseTokenList(draft.requiredCapabilities),
  role_id: draft.roleId.trim(),
  role_kind: draft.roleKind.trim(),
  routing_policy_overrides: JSON.parse(draft.routingOverridesText.trim().length === 0 ? "{}" : draft.routingOverridesText) as Record<string, unknown>,
  safety_policy_refs: parseTokenList(draft.safetyPolicyRefs),
  task_types_supported: parseTokenList(draft.taskTypesSupported),
  tool_policy: { allowed_tools: parseTokenList(draft.allowedTools), mode: draft.toolPolicyMode.trim() },
});

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const asArray = (value: unknown): readonly unknown[] => Array.isArray(value) ? value : [];
const stringValue = (value: unknown, fallback = ""): string => typeof value === "string" ? value : fallback;
const stringArray = (value: unknown): readonly string[] => asArray(value).filter((entry): entry is string => typeof entry === "string");

const parseRoleDefinition = (value: unknown): RoleDefinition | null => {
  const entry = asRecord(value);
  if (entry === undefined || typeof entry.role_id !== "string" || entry.role_id.trim().length === 0) return null;
  const toolPolicy = asRecord(entry.tool_policy);
  const routing = asRecord(entry.routing_policy_overrides);
  return {
    default_system_instructions: stringValue(entry.default_system_instructions),
    description: stringValue(entry.description),
    forbidden_capabilities: stringArray(entry.forbidden_capabilities),
    name: stringValue(entry.name, entry.role_id),
    output_contracts: stringArray(entry.output_contracts),
    preferred_capabilities: stringArray(entry.preferred_capabilities),
    required_capabilities: stringArray(entry.required_capabilities),
    role_id: entry.role_id,
    role_kind: stringValue(entry.role_kind),
    routing_policy_overrides: routing ?? {},
    safety_policy_refs: stringArray(entry.safety_policy_refs),
    task_types_supported: stringArray(entry.task_types_supported),
    tool_policy: {
      ...(toolPolicy?.allowed_tools === undefined ? {} : { allowed_tools: stringArray(toolPolicy.allowed_tools) }),
      mode: stringValue(toolPolicy?.mode, "allowed"),
    },
    ...(typeof entry.primaryGroupId === "string" ? { primaryGroupId: entry.primaryGroupId } : {}),
    ...(typeof entry.riskLevel === "string" ? { riskLevel: entry.riskLevel } : {}),
    ...(entry.secondaryGroupIds === undefined ? {} : { secondaryGroupIds: stringArray(entry.secondaryGroupIds) }),
  };
};

const parseTaskDefinition = (value: unknown): TaskDefinition | null => {
  const entry = asRecord(value);
  if (entry === undefined || typeof entry.task_type !== "string" || entry.task_type.trim().length === 0) return null;
  return {
    allowed_roles: stringArray(entry.allowed_roles),
    default_benchmark_suites: stringArray(entry.default_benchmark_suites),
    description: stringValue(entry.description),
    preferred_capabilities: stringArray(entry.preferred_capabilities),
    quality_metrics: stringArray(entry.quality_metrics),
    required_capabilities: stringArray(entry.required_capabilities),
    required_inputs: stringArray(entry.required_inputs),
    task_type: entry.task_type,
  };
};

export const parseRolePolicy = (body: unknown): RolePolicy | null => {
  const record = asRecord(body);
  if (record === undefined || !Array.isArray(record.roleDefinitions) || !Array.isArray(record.taskDefinitions)) return null;
  return {
    roleDefinitions: record.roleDefinitions.flatMap((role) => { const parsed = parseRoleDefinition(role); return parsed === null ? [] : [parsed]; }),
    taskDefinitions: record.taskDefinitions.flatMap((task) => { const parsed = parseTaskDefinition(task); return parsed === null ? [] : [parsed]; }),
  };
};

/** The readback stores the whole policy in one meta row; never fabricate roles from model rows. */
export const rolePolicyFromReadback = (readback: ReadbackState | undefined): RolePolicy | null => {
  if (readback === undefined) return null;
  const row = readback.rows.find((entry) => entry.id === "role-policy");
  if (row === undefined) return null;
  try {
    return parseRolePolicy(JSON.parse(row.meta));
  } catch {
    return null;
  }
};

export const tasksForRole = (policy: RolePolicy, role: RoleDefinition): readonly TaskDefinition[] =>
  [...policy.taskDefinitions]
    .filter((task) => task.allowed_roles.includes(role.role_id) || role.task_types_supported.includes(task.task_type))
    .sort((left, right) => left.task_type.localeCompare(right.task_type, "en"));

export const groupLabel = (groupId: string): string =>
  groupId.split(/[_-]+/).filter((part) => part.length > 0).map((part) => part.slice(0, 1).toUpperCase() + part.slice(1)).join(" ");

export const isHighRiskRole = (role: RoleDefinition): boolean =>
  role.riskLevel === "high" || ["security", "legal", "finance", "recruiter", "health"].includes(role.role_id);
