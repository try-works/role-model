/**
 * Run 103 / SP5 - agent strategies (role-bound) and workloads: validated postures that materialise
 * one client-facing alias per execution scope (design document sections 4 and 6.2; requirements R5, R6).
 */
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
    ? [...new Set(value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim()))]
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
