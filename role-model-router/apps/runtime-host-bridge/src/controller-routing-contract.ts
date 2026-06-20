type ControllerRoleDefinition = {
  readonly role_id: string;
  readonly name: string;
  readonly description: string;
  readonly task_types_supported: readonly string[];
  readonly required_capabilities: readonly string[];
  readonly preferred_capabilities: readonly string[];
  readonly forbidden_capabilities: readonly string[];
};

type ControllerTaskDefinition = {
  readonly task_type: string;
  readonly description: string;
  readonly required_capabilities: readonly string[];
  readonly preferred_capabilities: readonly string[];
  readonly allowed_roles: readonly string[];
};

type SupportedControllerStrategy = "balanced" | "cost" | "quality";

type ControllerStrategyCompatibilityMapping = {
  readonly strategy?: SupportedControllerStrategy;
  readonly preferLocal?: boolean;
};

type RawControllerRoutingGuidance = {
  readonly requestedRoleId?: unknown;
  readonly taskType?: unknown;
  readonly requiredCapabilities?: unknown;
  readonly preferredCapabilities?: unknown;
  readonly strategy?: unknown;
  readonly preferLocal?: unknown;
  readonly preferredEndpointIds?: unknown;
};

export type SanitizedControllerRoutingGuidance = {
  readonly requestedRoleId?: string;
  readonly taskType?: string;
  readonly requiredCapabilities?: readonly string[];
  readonly preferredCapabilities?: readonly string[];
  readonly strategy?: SupportedControllerStrategy;
  readonly preferLocal?: boolean;
  readonly preferredEndpointIds?: readonly string[];
};

export type ControllerRoutingChoiceSetInput = {
  readonly roleDefinitions?: readonly ControllerRoleDefinition[];
  readonly taskDefinitions?: readonly ControllerTaskDefinition[];
  readonly candidateEndpointIds?: readonly string[];
};

const supportedStrategies = ["balanced", "cost", "quality"] as const;
const QUALITY_STRATEGY_TASK_TYPES = new Set([
  "code.edit",
  "json.schema_adherence",
  "tools.function_calling",
]);
const COST_STRATEGY_TASK_TYPES = new Set([
  "text.classification",
  "text.language_detection",
  "embeddings.text",
]);
const QUALITY_STRATEGY_CAPABILITIES = new Set([
  "code.edit",
  "json.schema_adherence",
  "reasoning.multi_step",
  "tools.function_calling",
]);
const COST_STRATEGY_CAPABILITIES = new Set([
  "text.classification",
  "text.language_detection",
  "embeddings.text",
]);

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "en");
}

function normalizeStringArray(value: unknown): readonly string[] | undefined {
  const entries =
    typeof value === "string"
      ? [value]
      : Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string")
        : [];
  const normalized = entries.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  return normalized.length > 0 ? [...new Set(normalized)] : undefined;
}

function normalizeStrategy(value: unknown): SupportedControllerStrategy | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return supportedStrategies.find((strategy) => strategy === normalized);
}

function normalizeCompatibleStrategy(
  value: unknown,
): ControllerStrategyCompatibilityMapping | undefined {
  const normalizedStrategy = normalizeStrategy(value);
  if (normalizedStrategy) {
    return { strategy: normalizedStrategy };
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "capability_based":
    case "prefer-capability":
      return { strategy: "quality" };
    case "remote_only":
    case "remote-only":
      return { preferLocal: false };
    case "local_only":
    case "local-only":
      return { preferLocal: true };
    default:
      return undefined;
  }
}

function inferControllerStrategy(input: {
  readonly requestedRoleId?: string;
  readonly taskType?: string;
  readonly requiredCapabilities?: readonly string[];
  readonly preferredCapabilities?: readonly string[];
  readonly roleDefinitions?: readonly ControllerRoleDefinition[];
}): SupportedControllerStrategy | undefined {
  const capabilitySignals = [
    ...(input.requiredCapabilities ?? []),
    ...(input.preferredCapabilities ?? []),
  ];
  const roleDefinition = input.requestedRoleId
    ? input.roleDefinitions?.find((entry) => entry.role_id === input.requestedRoleId)
    : undefined;
  const taskSignals = new Set<string>([
    ...(input.taskType ? [input.taskType] : []),
    ...(roleDefinition?.task_types_supported ?? []),
  ]);
  const allCapabilities = new Set<string>([
    ...capabilitySignals,
    ...(roleDefinition?.required_capabilities ?? []),
    ...(roleDefinition?.preferred_capabilities ?? []),
  ]);
  const hasQualitySignal =
    [...taskSignals].some((taskType) => QUALITY_STRATEGY_TASK_TYPES.has(taskType)) ||
    [...allCapabilities].some((capability) => QUALITY_STRATEGY_CAPABILITIES.has(capability));
  const hasCostSignal =
    [...taskSignals].some((taskType) => COST_STRATEGY_TASK_TYPES.has(taskType)) ||
    [...allCapabilities].some((capability) => COST_STRATEGY_CAPABILITIES.has(capability));
  const hasSemanticGuidance =
    taskSignals.size > 0 ||
    allCapabilities.size > 0 ||
    typeof input.requestedRoleId === "string";
  if (!hasSemanticGuidance) {
    return undefined;
  }
  if (hasQualitySignal) {
    return "quality";
  }
  if (hasCostSignal) {
    return "cost";
  }
  return "balanced";
}

function collectKnownCapabilities(input: ControllerRoutingChoiceSetInput): readonly string[] {
  const capabilities = new Set<string>();
  for (const roleDefinition of input.roleDefinitions ?? []) {
    for (const capability of roleDefinition.required_capabilities ?? []) {
      capabilities.add(capability);
    }
    for (const capability of roleDefinition.preferred_capabilities ?? []) {
      capabilities.add(capability);
    }
    for (const capability of roleDefinition.forbidden_capabilities ?? []) {
      capabilities.add(capability);
    }
  }
  for (const taskDefinition of input.taskDefinitions ?? []) {
    for (const capability of taskDefinition.required_capabilities ?? []) {
      capabilities.add(capability);
    }
    for (const capability of taskDefinition.preferred_capabilities ?? []) {
      capabilities.add(capability);
    }
  }
  return [...capabilities].sort(compareText);
}

function collectAllowedRolesByTask(
  taskDefinitions: readonly ControllerTaskDefinition[],
): ReadonlyMap<string, readonly string[]> {
  return new Map(
    taskDefinitions.map((taskDefinition) => [
      taskDefinition.task_type,
      [...taskDefinition.allowed_roles].sort(compareText),
    ]),
  );
}

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    return fenced.trim();
  }
  let inString = false;
  let escaping = false;
  let depth = 0;
  let startIndex = -1;
  for (let index = 0; index < trimmed.length; index += 1) {
    const character = trimmed[index];
    if (!character) {
      continue;
    }
    if (escaping) {
      escaping = false;
      continue;
    }
    if (character === "\\") {
      escaping = true;
      continue;
    }
    if (character === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (character === "{") {
      if (depth === 0) {
        startIndex = index;
      }
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0 && startIndex >= 0) {
        return trimmed.slice(startIndex, index + 1);
      }
      if (depth < 0) {
        return null;
      }
    }
  }
  return null;
}

function buildControllerAllowedValues(input: ControllerRoutingChoiceSetInput) {
  const taskDefinitions = [...(input.taskDefinitions ?? [])].sort((left, right) =>
    compareText(left.task_type, right.task_type),
  );
  const allowedRolesByTask = collectAllowedRolesByTask(taskDefinitions);
  const roles = [...(input.roleDefinitions ?? [])]
    .sort((left, right) => compareText(left.role_id, right.role_id))
    .map((roleDefinition) => ({
      roleId: roleDefinition.role_id,
      label: roleDefinition.name,
      description: roleDefinition.description,
      taskTypes: [...roleDefinition.task_types_supported].sort(compareText),
      tasks: taskDefinitions
        .filter(
          (taskDefinition) =>
            taskDefinition.allowed_roles.includes(roleDefinition.role_id) ||
            roleDefinition.task_types_supported.includes(taskDefinition.task_type),
        )
        .map((taskDefinition) => ({
          taskType: taskDefinition.task_type,
          description: taskDefinition.description,
          requiredCapabilities: [...taskDefinition.required_capabilities].sort(compareText),
          preferredCapabilities: [...taskDefinition.preferred_capabilities].sort(compareText),
          allowedRoles: allowedRolesByTask.get(taskDefinition.task_type) ?? [],
        })),
    }));

  const allowedValues = {
    requestedRoleId: roles.map((role) => role.roleId),
    taskType: taskDefinitions.map((taskDefinition) => taskDefinition.task_type),
    requiredCapabilities: collectKnownCapabilities(input),
    preferredCapabilities: collectKnownCapabilities(input),
    strategy: [...supportedStrategies],
    preferredEndpointIds: [...new Set(input.candidateEndpointIds ?? [])].sort(compareText),
    roles,
  };

  return allowedValues;
}

export function buildControllerSystemPrompt(input: ControllerRoutingChoiceSetInput): string {
  const allowedValues = buildControllerAllowedValues(input);

  return [
    "ROLE_MODEL_ROUTING_CONTROLLER",
    "Return only compact JSON.",
    "Allowed fields: requestedRoleId, taskType, requiredCapabilities, preferredCapabilities, strategy, preferLocal, preferredEndpointIds.",
    "Always include strategy whenever you return any other directive.",
    "Choose only from the runtime-known values below.",
    "If no exact match exists for a field, omit that field.",
    "Choose a valid role instead of inventing a new task label when the request is semantically close.",
    "Do not create new roles, tasks, capabilities, endpoint ids, or strategy values.",
    "Use quality for code edits, schema adherence, verification-heavy or multi-step reasoning work, and tool orchestration.",
    "Use cost for classification, language detection, embeddings, or other cheap/simple labeling work.",
    "Use balanced for general chat, summaries, and ambiguous requests.",
    JSON.stringify(allowedValues, null, 2),
  ].join("\n");
}

export function buildCompactControllerSystemPrompt(
  input: ControllerRoutingChoiceSetInput,
): string {
  const allowedValues = buildControllerAllowedValues(input);

  return [
    "ROLE_MODEL_ROUTING_CONTROLLER_COMPACT",
    "Return only compact JSON.",
    "Allowed fields: requestedRoleId, taskType, requiredCapabilities, preferredCapabilities, strategy, preferLocal, preferredEndpointIds.",
    "Always include strategy whenever you return any other directive.",
    "Choose only from the runtime-known values below.",
    "If no exact match exists for a field, omit that field.",
    "Do not create new roles, tasks, capabilities, endpoint ids, or strategy values.",
    "Strategy rubric: quality for code/schema/reasoning/tool-heavy work; cost for classification/language/embedding work; balanced for general chat or ambiguous requests.",
    JSON.stringify(
      {
        requestedRoleId: allowedValues.requestedRoleId,
        taskType: allowedValues.taskType,
        requiredCapabilities: allowedValues.requiredCapabilities,
        preferredCapabilities: allowedValues.preferredCapabilities,
        strategy: allowedValues.strategy,
        preferredEndpointIds: allowedValues.preferredEndpointIds,
        allowedRolesByTask: allowedValues.roles.map((role) => ({
          roleId: role.roleId,
          taskTypes: role.taskTypes,
        })),
      },
      null,
      2,
    ),
  ].join("\n");
}

export function sanitizeControllerRoutingGuidance(
  guidance: RawControllerRoutingGuidance,
  input: ControllerRoutingChoiceSetInput,
): SanitizedControllerRoutingGuidance | null {
  const knownRoleIds = new Set((input.roleDefinitions ?? []).map((roleDefinition) => roleDefinition.role_id));
  const knownTaskTypes = new Set(
    (input.taskDefinitions ?? []).map((taskDefinition) => taskDefinition.task_type),
  );
  const knownCapabilities = new Set(collectKnownCapabilities(input));
  const knownEndpointIds = new Set(input.candidateEndpointIds ?? []);

  const requestedRoleId =
    typeof guidance.requestedRoleId === "string" &&
    guidance.requestedRoleId.trim().length > 0 &&
    (knownRoleIds.size === 0 || knownRoleIds.has(guidance.requestedRoleId.trim()))
      ? guidance.requestedRoleId.trim()
      : undefined;
  const taskType =
    typeof guidance.taskType === "string" &&
    guidance.taskType.trim().length > 0 &&
    (knownTaskTypes.size === 0 || knownTaskTypes.has(guidance.taskType.trim()))
      ? guidance.taskType.trim()
      : undefined;
  const requiredCapabilities = normalizeStringArray(guidance.requiredCapabilities)?.filter(
    (capability) => knownCapabilities.size === 0 || knownCapabilities.has(capability),
  );
  const preferredCapabilities = normalizeStringArray(guidance.preferredCapabilities)?.filter(
    (capability) => knownCapabilities.size === 0 || knownCapabilities.has(capability),
  );
  const preferredEndpointIds = normalizeStringArray(guidance.preferredEndpointIds)?.filter(
    (endpointId) => knownEndpointIds.size === 0 || knownEndpointIds.has(endpointId),
  );
  const compatibleStrategy = normalizeCompatibleStrategy(guidance.strategy);
  const semanticStrategy = inferControllerStrategy({
      requestedRoleId,
      taskType,
      requiredCapabilities,
      preferredCapabilities,
      roleDefinitions: input.roleDefinitions,
    });
  const effectiveStrategy =
    semanticStrategy && semanticStrategy !== "balanced"
      ? semanticStrategy
      : compatibleStrategy?.strategy ?? semanticStrategy;

  const sanitized: SanitizedControllerRoutingGuidance = {
    ...(requestedRoleId ? { requestedRoleId } : {}),
    ...(taskType ? { taskType } : {}),
    ...(requiredCapabilities && requiredCapabilities.length > 0
      ? { requiredCapabilities: [...new Set(requiredCapabilities)] }
      : {}),
    ...(preferredCapabilities && preferredCapabilities.length > 0
      ? { preferredCapabilities: [...new Set(preferredCapabilities)] }
      : {}),
    ...(effectiveStrategy ? { strategy: effectiveStrategy } : {}),
    ...(typeof guidance.preferLocal === "boolean"
      ? { preferLocal: guidance.preferLocal }
      : compatibleStrategy?.preferLocal !== undefined
        ? { preferLocal: compatibleStrategy.preferLocal }
        : {}),
    ...(preferredEndpointIds && preferredEndpointIds.length > 0
      ? { preferredEndpointIds: [...new Set(preferredEndpointIds)] }
      : {}),
  };

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

export function parseAndSanitizeControllerRoutingGuidance(
  text: string,
  input: ControllerRoutingChoiceSetInput,
): SanitizedControllerRoutingGuidance | null {
  const jsonSource = extractJsonObject(text);
  if (!jsonSource) {
    return null;
  }
  try {
    const parsed = JSON.parse(jsonSource) as RawControllerRoutingGuidance;
    return sanitizeControllerRoutingGuidance(parsed, input);
  } catch {
    return null;
  }
}
