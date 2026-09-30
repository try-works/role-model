/**
 * Run 103 / SP5 - agent strategies (role-bound) and workloads: validated postures that materialise
 * one client-facing alias per execution scope (design document sections 4 and 6.2; requirements R5, R6).
 */
import { supportsCapabilityRequirement } from "@role-model-router/core";

import {
  type RoutingModeName,
  type ScoringStrategyName,
  normalizeRoutingModeName,
  normalizeScoringStrategyName,
} from "./scoring-strategy.js";

export const AGENT_STRATEGY_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export const RESERVED_ALIAS_FAMILY_PREFIXES = [
  "default",
  "baseline",
  "controller",
  "difficulty",
  "hybrid",
] as const;

export type AgentStrategyKind = "role" | "workload";

export const COMPUTE_PREFERENCES = ["auto", "local", "remote", "hybrid"] as const;
export type ComputePreferenceName = (typeof COMPUTE_PREFERENCES)[number];

const SHARED_ENTRY_KEYS = [
  "scoring_strategy",
  "scoringStrategy",
  "routing_mode",
  "routingMode",
  "compute_preference",
  "computePreference",
  "model_ids",
  "modelIds",
] as const;

/** Unknown keys are rejected rather than ignored, so a typo cannot silently drop a binding. */
export const ALLOWED_ENTRY_KEYS: Readonly<Record<AgentStrategyKind, readonly string[]>> = {
  role: [...SHARED_ENTRY_KEYS, "role_id", "roleId"],
  workload: [...SHARED_ENTRY_KEYS, "required_capabilities", "requiredCapabilities"],
};

export interface AgentStrategyEntry {
  readonly name: string;
  readonly kind: AgentStrategyKind;
  readonly roleId: string | null;
  readonly scoringStrategy: ScoringStrategyName | null;
  readonly routingMode: RoutingModeName | null;
  readonly computePreference: ComputePreferenceName | null;
  readonly modelIds: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly violations: readonly string[];
}

function readStringList(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value
            .filter(
              (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
            )
            .map((entry) => entry.trim()),
        ),
      ]
    : [];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readComputePreference(value: unknown): ComputePreferenceName | null {
  const normalized = readString(value)?.toLowerCase() ?? "";
  return (COMPUTE_PREFERENCES as readonly string[]).includes(normalized)
    ? (normalized as ComputePreferenceName)
    : null;
}

export function isValidAgentStrategyName(name: string): boolean {
  if (!AGENT_STRATEGY_NAME_PATTERN.test(name)) {
    return false;
  }
  return !(RESERVED_ALIAS_FAMILY_PREFIXES as readonly string[]).includes(name);
}

/**
 * Decode one entry. Every failure is recorded as a violation and the offending value fails closed
 * (null) instead of silently widening behaviour.
 */
export function decodeAgentStrategyEntry(
  name: string,
  raw: unknown,
  kind: AgentStrategyKind,
): AgentStrategyEntry {
  const violations: string[] = [];
  const record =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const allowedKeys = ALLOWED_ENTRY_KEYS[kind];
  for (const key of Object.keys(record).sort()) {
    if (!allowedKeys.includes(key)) {
      violations.push(`${kind} "${name}" has unknown key "${key}"`);
    }
  }

  if (!AGENT_STRATEGY_NAME_PATTERN.test(name)) {
    violations.push(
      `agent strategy name "${name}" must match ${AGENT_STRATEGY_NAME_PATTERN.source}`,
    );
  } else if ((RESERVED_ALIAS_FAMILY_PREFIXES as readonly string[]).includes(name)) {
    violations.push(`agent strategy name "${name}" is reserved for a routing alias family`);
  }

  const roleId = readString(record.role_id ?? record.roleId);
  if (kind === "role" && !roleId) {
    violations.push(`agent strategy "${name}" requires a role_id`);
  }
  if (kind === "workload" && roleId) {
    violations.push(`workload "${name}" must not declare a role_id`);
  }

  const rawStrategy = readString(record.scoring_strategy ?? record.scoringStrategy);
  const scoringStrategy = rawStrategy ? normalizeScoringStrategyName(rawStrategy) : null;
  if (rawStrategy && !scoringStrategy) {
    violations.push(`agent strategy "${name}" has unknown scoring_strategy "${rawStrategy}"`);
  }

  const rawMode = readString(record.routing_mode ?? record.routingMode);
  const routingMode = rawMode ? normalizeRoutingModeName(rawMode) : null;
  if (rawMode && !routingMode) {
    violations.push(`agent strategy "${name}" has unknown routing_mode "${rawMode}"`);
  }

  const rawPreference = record.compute_preference ?? record.computePreference;
  const computePreference = readComputePreference(rawPreference);
  if (readString(rawPreference) && !computePreference) {
    violations.push(
      `agent strategy "${name}" has unknown compute_preference "${String(rawPreference)}"`,
    );
  }

  return {
    name,
    kind,
    roleId: kind === "role" ? roleId : null,
    scoringStrategy,
    routingMode,
    computePreference,
    modelIds: readStringList(record.model_ids ?? record.modelIds),
    requiredCapabilities: readStringList(
      record.required_capabilities ?? record.requiredCapabilities,
    ),
    violations,
  };
}

export interface AgentStrategyBindingValidation {
  readonly violations: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Run 103 / SP5e - the runtime-side half of the entry contract: `role_id` must exist in the runtime
 * role policy (a write error), while an unknown capability is only a warning because capability
 * taxonomies extend independently of the runtime (requirements R5, R6).
 */
export function validateAgentStrategyBindings(input: {
  readonly entries: readonly AgentStrategyEntry[];
  readonly knownRoleIds?: readonly string[];
  readonly knownCapabilities?: readonly string[];
}): AgentStrategyBindingValidation {
  const violations: string[] = [];
  const warnings: string[] = [];
  for (const entry of input.entries) {
    if (entry.roleId && input.knownRoleIds && !input.knownRoleIds.includes(entry.roleId)) {
      violations.push(`${entry.kind} "${entry.name}" has unknown role_id "${entry.roleId}"`);
    }
    if (input.knownCapabilities) {
      for (const capability of entry.requiredCapabilities) {
        if (!input.knownCapabilities.includes(capability)) {
          warnings.push(
            `${entry.kind} "${entry.name}" references unknown capability "${capability}"`,
          );
        }
      }
    }
  }
  return { violations, warnings };
}

/**
 * Run 103 / SP5e - the request-time lookup: the alias id (`<name>.<scope>`) resolves back to the
 * entry that declares its binding, so a request that names a posture alias inherits the role,
 * capabilities and scoring strategy the operator saved with it.
 */
export function findAgentStrategyAlias(input: {
  readonly entries: readonly AgentStrategyEntry[];
  readonly executionModes: readonly string[];
  readonly aliasId: string;
}): AgentStrategyEntry | null {
  const normalized = input.aliasId.trim().toLowerCase();
  for (const entry of input.entries) {
    if (entry.violations.length > 0) {
      continue;
    }
    for (const executionMode of input.executionModes) {
      if (agentStrategyAliasId(entry.name, executionMode) === normalized) {
        return entry;
      }
    }
  }
  return null;
}

export interface PostureRequestBinding {
  readonly aliasId: string;
  readonly name: string;
  readonly kind: AgentStrategyKind;
  readonly declaredRoleId: string | null;
  readonly presetRoleId: string | null;
  readonly roleId: string | null;
  readonly roleSource: "declared" | "preset" | "none";
  readonly requiredCapabilities: readonly string[];
  readonly preferLocal: boolean;
  readonly scoringStrategy: ScoringStrategyName | null;
}

/**
 * Run 103 / SP5g - the binding a request inherits from the posture alias it named: the declared
 * role stays authoritative, the alias preset fills in when nothing was declared, workload
 * capabilities are added to (never instead of) the request's own requirements, and the compute
 * preference becomes a local bias.
 */
export function resolvePostureRequestBinding(input: {
  readonly entry: AgentStrategyEntry;
  readonly aliasId: string;
  readonly declaredRoleId?: string | null;
  readonly requiredCapabilities?: readonly string[];
}): PostureRequestBinding {
  const role = resolveAliasRequestedRole({
    declaredRoleId: input.declaredRoleId ?? null,
    presetRoleId: input.entry.roleId,
  });
  return {
    aliasId: input.aliasId,
    name: input.entry.name,
    kind: input.entry.kind,
    declaredRoleId: input.declaredRoleId?.trim() ? input.declaredRoleId.trim() : null,
    presetRoleId: input.entry.roleId,
    roleId: role.roleId,
    roleSource: role.source,
    requiredCapabilities: [
      ...new Set([...(input.requiredCapabilities ?? []), ...input.entry.requiredCapabilities]),
    ],
    preferLocal:
      input.entry.computePreference === "local" || input.entry.computePreference === "hybrid",
    scoringStrategy: input.entry.scoringStrategy,
  };
}

/**
 * Run 103 / SP5g - the decision receipt for an alias preset: the declared and preset role are both
 * recorded so an operator can see which one the decision used (requirement R5).
 */
export function withAliasPostureBinding<TDiagnostics extends object>(
  diagnostics: TDiagnostics,
  binding: PostureRequestBinding | null,
): TDiagnostics & { readonly aliasPostureBinding?: PostureRequestBinding } {
  return binding === null ? diagnostics : { ...diagnostics, aliasPostureBinding: binding };
}

/** The alias namespace is shared: duplicates within a kind and collisions across kinds are errors. */
export function validateAgentStrategyNames(
  entries: readonly { readonly name: string; readonly kind: AgentStrategyKind }[],
): readonly string[] {
  const seen = new Map<string, AgentStrategyKind>();
  const violations: string[] = [];
  for (const entry of entries) {
    const existing = seen.get(entry.name);
    if (existing) {
      violations.push(
        existing === entry.kind
          ? `duplicate ${entry.kind} strategy name "${entry.name}"`
          : `strategy name "${entry.name}" is used by both an agent strategy and a workload`,
      );
      continue;
    }
    seen.set(entry.name, entry.kind);
  }
  return violations;
}

/** `<name>.<scope>` - the same shape the canonical routing aliases use. */
export function agentStrategyAliasId(name: string, executionMode: string): string {
  return `${name}.${executionMode.trim().toLowerCase().replaceAll("_", "-")}`;
}

export interface MaterializedAgentStrategyAlias {
  readonly aliasId: string;
  readonly name: string;
  readonly kind: AgentStrategyKind;
  readonly mode: RoutingModeName;
  readonly roleId: string | null;
  readonly scoringStrategy: ScoringStrategyName | null;
  readonly requiredCapabilities: readonly string[];
  readonly modelIds: readonly string[];
}

/**
 * Run 103 / SP5b - one alias per execution scope per validated entry. The pool is copied verbatim
 * from the caller's slice, so an empty slice stays empty and is reported honestly instead of
 * widening to the whole inventory.
 */
export function materializeAgentStrategyAliases(input: {
  readonly entries: readonly AgentStrategyEntry[];
  readonly executionModes: readonly string[];
  readonly runtimeMode: RoutingModeName;
  readonly modelIdsByExecutionMode: Readonly<Record<string, readonly string[]>>;
  /**
   * Run 103 post-lock repair (operator decision): the capability vocabulary the pool actually
   * supports, keyed by model id. When an entry pins `required_capabilities`, the published pool
   * narrows to the models that satisfy them with the same rule the router applies at request time
   * (`supportsCapabilityRequirement`), so a pin nothing can serve reports `ALIAS_POOL_EMPTY` instead
   * of advertising candidates the first call would reject. Omitted means "no capability index
   * available": the pool is not narrowed by capabilities (pre-repair behaviour).
   */
  readonly supportedCapabilitiesByModelId?: Readonly<Record<string, readonly string[]>>;
}): readonly MaterializedAgentStrategyAlias[] {
  const aliases: MaterializedAgentStrategyAlias[] = [];
  for (const entry of input.entries) {
    if (entry.violations.length > 0) {
      continue;
    }
    for (const executionMode of input.executionModes) {
      const scopeModelIds = input.modelIdsByExecutionMode[executionMode] ?? [];
      /**
       * Run 103 review F6: a declared `model_ids` slice narrows the alias pool instead of reading as
       * documentation. An empty intersection copies the empty slice verbatim, so the caller reports
       * `ALIAS_POOL_EMPTY` rather than widening.
       */
      const modelIdsNarrowedBySlice =
        entry.modelIds.length === 0
          ? [...scopeModelIds]
          : scopeModelIds.filter((modelId) => entry.modelIds.includes(modelId));
      const modelIds =
        entry.requiredCapabilities.length === 0 ||
        input.supportedCapabilitiesByModelId === undefined
          ? modelIdsNarrowedBySlice
          : modelIdsNarrowedBySlice.filter((modelId) =>
              entry.requiredCapabilities.every((capability) =>
                supportsCapabilityRequirement(
                  input.supportedCapabilitiesByModelId?.[modelId] ?? [],
                  capability,
                ),
              ),
            );
      aliases.push({
        aliasId: agentStrategyAliasId(entry.name, executionMode),
        name: entry.name,
        kind: entry.kind,
        mode: entry.routingMode ?? input.runtimeMode,
        roleId: entry.roleId,
        scoringStrategy: entry.scoringStrategy,
        requiredCapabilities: entry.requiredCapabilities,
        modelIds,
      });
    }
  }
  return aliases;
}

export interface AliasRequestedRoleResolution {
  readonly roleId: string | null;
  readonly source: "declared" | "preset" | "none";
}

/**
 * Run 103 / SP5b - the alias preset is a default, not a cage: a role the request itself declared
 * always wins, and the decision records which of the two supplied the role.
 */
export function resolveAliasRequestedRole(input: {
  readonly declaredRoleId?: string | null;
  readonly presetRoleId: string | null;
}): AliasRequestedRoleResolution {
  const declared = input.declaredRoleId?.trim();
  if (declared && declared.length > 0) {
    return { roleId: declared, source: "declared" };
  }
  if (input.presetRoleId) {
    return { roleId: input.presetRoleId, source: "preset" };
  }
  return { roleId: null, source: "none" };
}

function decodeAgentStrategyBlock(raw: unknown, kind: AgentStrategyKind): AgentStrategyEntry[] {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return [];
  }
  return Object.entries(raw as Record<string, unknown>).map(([name, value]) =>
    decodeAgentStrategyEntry(name, value, kind),
  );
}

export interface AgentStrategySectionInput {
  readonly agentStrategies?: unknown;
  readonly workloads?: unknown;
  readonly executionModes: readonly string[];
  readonly runtimeMode: RoutingModeName;
  readonly modelIdsByExecutionMode: Readonly<Record<string, readonly string[]>>;
}

export interface AgentStrategySection {
  readonly entries: readonly AgentStrategyEntry[];
  readonly aliases: readonly MaterializedAgentStrategyAlias[];
  readonly violations: readonly string[];
}

/**
 * Run 103 / SP5c - the config blocks as one section. A namespace violation (duplicate or cross-kind
 * collision) suppresses materialisation entirely rather than letting one entry shadow another; a
 * single malformed entry is reported and skipped while its valid siblings still materialise.
 */
export function decodeAgentStrategySection(input: AgentStrategySectionInput): AgentStrategySection {
  const entries = [
    ...decodeAgentStrategyBlock(input.agentStrategies, "role"),
    ...decodeAgentStrategyBlock(input.workloads, "workload"),
  ];
  const entryViolations = entries.flatMap((entry) => entry.violations);
  const namespaceViolations = validateAgentStrategyNames(
    entries.map((entry) => ({ name: entry.name, kind: entry.kind })),
  );
  const violations = [...entryViolations, ...namespaceViolations];
  if (namespaceViolations.length > 0) {
    return { entries, aliases: [], violations };
  }
  return {
    entries,
    aliases: materializeAgentStrategyAliases({
      entries,
      executionModes: input.executionModes,
      runtimeMode: input.runtimeMode,
      modelIdsByExecutionMode: input.modelIdsByExecutionMode,
    }),
    violations,
  };
}

export interface AliasInventoryRow {
  readonly aliasId: string;
  readonly mode: string;
  readonly modelIds: readonly string[];
}

export interface AliasInventoryMerge {
  readonly rows: readonly AliasInventoryRow[];
  readonly violations: readonly string[];
}

/**
 * Run 103 / SP5d - the canonical matrix stays authoritative: posture aliases are appended, and a
 * posture alias that would shadow an existing row is reported and skipped. Empty pools are carried
 * verbatim so the caller reports `ALIAS_POOL_EMPTY` instead of widening.
 */
export function mergeAliasInventory(input: {
  readonly canonical: readonly AliasInventoryRow[];
  readonly postureAliases: readonly MaterializedAgentStrategyAlias[];
}): AliasInventoryMerge {
  const rows: AliasInventoryRow[] = [...input.canonical];
  const seen = new Set(rows.map((row) => row.aliasId));
  const canonicalIds = new Set(input.canonical.map((row) => row.aliasId));
  const violations: string[] = [];
  for (const alias of input.postureAliases) {
    if (seen.has(alias.aliasId)) {
      /** Run 103 review F7: name the actual cause of the rejection. */
      violations.push(
        canonicalIds.has(alias.aliasId)
          ? `posture alias "${alias.aliasId}" collides with an existing routing alias and is rejected`
          : `posture alias "${alias.aliasId}" is declared twice (the name is used by both an agent strategy and a workload, or repeated) and both declarations are rejected`,
      );
      continue;
    }
    seen.add(alias.aliasId);
    rows.push({ aliasId: alias.aliasId, mode: alias.mode, modelIds: [...alias.modelIds] });
  }
  return { rows, violations };
}

export interface PostureAliasDerivation {
  readonly rows: readonly AliasInventoryRow[];
  /**
   * Scopes that exist for the canonical matrix but carry no model slice for this posture. They are
   * reported, never materialised as a widened pool (requirement R5/R6 "pools stay honest").
   */
  readonly skipped: readonly {
    readonly aliasId: string;
    readonly reason: "ALIAS_POOL_EMPTY";
  }[];
  readonly violations: readonly string[];
}

/**
 * Run 103 / SP5e - the runtime's alias inventory: the canonical matrix plus one row per posture
 * entry per non-empty execution scope. The canonical rows stay authoritative, an empty scope is
 * reported as `ALIAS_POOL_EMPTY`, and a collision is a write error the caller surfaces (design
 * document section 6.2).
 */
export function derivePostureAliasInventory(input: {
  readonly canonical: readonly AliasInventoryRow[];
  readonly entries: readonly AgentStrategyEntry[];
  readonly executionModes: readonly string[];
  readonly runtimeMode: RoutingModeName;
  readonly modelIdsByExecutionMode: Readonly<Record<string, readonly string[]>>;
  readonly supportedCapabilitiesByModelId?: Readonly<Record<string, readonly string[]>>;
}): PostureAliasDerivation {
  const materialized = materializeAgentStrategyAliases({
    entries: input.entries,
    executionModes: input.executionModes,
    runtimeMode: input.runtimeMode,
    modelIdsByExecutionMode: input.modelIdsByExecutionMode,
    ...(input.supportedCapabilitiesByModelId !== undefined
      ? { supportedCapabilitiesByModelId: input.supportedCapabilitiesByModelId }
      : {}),
  });
  const routable = materialized.filter((alias) => alias.modelIds.length > 0);
  const skipped = materialized
    .filter((alias) => alias.modelIds.length === 0)
    .map((alias) => ({ aliasId: alias.aliasId, reason: "ALIAS_POOL_EMPTY" as const }));
  const merge = mergeAliasInventory({
    canonical: input.canonical,
    postureAliases: routable,
  });
  const entryViolations = input.entries.flatMap((entry) => entry.violations);
  return {
    rows: merge.rows,
    skipped,
    violations: [...entryViolations, ...merge.violations],
  };
}

/**
 * Run 103 / SP6 - the shipped workload examples of design document section 4: `batch` is posture
 * only, `embedding` pins a retrieval capability. They are the single source the operations guide and
 * the Workloads page quote (requirement R6).
 *
 * Post-lock addendum-02 (operator decision, 2026-10-01): `embedding` pins the taxonomy capability
 * `knowledge.retrieval` instead of the provider spelling `embeddings.text`. The canonical taxonomy
 * carries no embeddings family, so the shipped example warned as an unknown capability by
 * construction; see `addenda/00-requirements.post-lock-shipped-embedding-capability.addendum-01.md`.
 */
export const SHIPPED_WORKLOAD_EXAMPLES: Readonly<
  Record<string, Readonly<Record<string, unknown>>>
> = {
  batch: {
    scoring_strategy: "cost",
  },
  embedding: {
    scoring_strategy: "cost",
    required_capabilities: ["knowledge.retrieval"],
  },
};
