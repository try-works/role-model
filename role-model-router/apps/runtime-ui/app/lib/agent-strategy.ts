/**
 * Run 103 / SP8 - the pure view-models behind the Agent strategy and Workloads pages.
 *
 * The runtime publishes one entry per `agent_strategies.<name>` / `workloads.<name>` block plus one
 * alias row per execution scope (`readPostureEntrySummaries`). These helpers turn that readback into
 * rows the pages can render, validate the editable drafts, and render the canonical write blocks
 * (snake_case, whole block, never a legacy synonym, never a `role_id` on a workload).
 */

import {
  type ExecutionScopeName,
  type RoutingModeName,
  type ScoringStrategyName,
  formatRoutingModeLabel,
  formatScoringStrategyLabel,
  normalizeRoutingModeValue,
  normalizeScoringStrategyValue,
} from "./routing-mode";

export type PostureEntryKind = "role" | "workload";

export const POSTURE_ENTRY_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** Names the alias namespace already owns (design document section 4). */
export const RESERVED_POSTURE_NAMES = [
  "default",
  "baseline",
  "controller",
  "difficulty",
  "hybrid",
] as const;

export const COMPUTE_PREFERENCE_NAMES = ["auto", "local", "remote", "hybrid"] as const;
export type ComputePreferenceName = (typeof COMPUTE_PREFERENCE_NAMES)[number];

export interface PostureAliasReadback {
  readonly aliasId: string;
  readonly mode: string | null;
  readonly candidateCount: number;
  readonly allowEndpointIds: readonly string[];
  readonly poolEmpty: boolean;
}

export interface PostureEntryReadback {
  readonly name: string;
  readonly kind: PostureEntryKind;
  readonly roleId: string | null;
  readonly scoringStrategy: string | null;
  readonly routingMode: string | null;
  readonly computePreference: string | null;
  readonly configuredModelIds: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly violations: readonly string[];
  readonly aliases: readonly PostureAliasReadback[];
}

export interface PostureDiagnosticsReadback {
  readonly violations: readonly string[];
  readonly skipped: readonly { readonly aliasId: string; readonly reason: string }[];
  readonly warnings: readonly string[];
}

export const EMPTY_POSTURE_DIAGNOSTICS: PostureDiagnosticsReadback = {
  violations: [],
  skipped: [],
  warnings: [],
};

export interface PostureAliasRowView {
  readonly aliasId: string;
  readonly scopeLabel: string;
  readonly modeLabel: string;
  readonly candidateCount: number;
  readonly candidateLabel: string;
  readonly poolEmpty: boolean;
  readonly poolEmptyLabel: string | null;
  readonly leaderEndpointId: string | null;
  readonly leaderLabel: string | null;
  readonly eligibleEndpointIds: readonly string[];
}

export interface PostureEntryRowView {
  readonly name: string;
  readonly kind: PostureEntryKind;
  readonly kindLabel: string;
  readonly bindingLabel: string;
  readonly roleId: string | null;
  readonly scoringStrategy: ScoringStrategyName | null;
  readonly scoringStrategyLabel: string;
  readonly routingMode: RoutingModeName | null;
  readonly routingModeLabel: string;
  readonly computePreference: ComputePreferenceName | null;
  readonly postureSummary: string;
  readonly modelIds: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly capabilityLabel: string;
  readonly violations: readonly string[];
  readonly warnings: readonly string[];
  readonly aliases: readonly PostureAliasRowView[];
  readonly poolEmptyAliasIds: readonly string[];
}

export const POSTURE_KIND_LABELS: Readonly<Record<PostureEntryKind, string>> = {
  role: "Agent strategy",
  workload: "Workloads",
};

function readComputePreference(value: string | null): ComputePreferenceName | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return (COMPUTE_PREFERENCE_NAMES as readonly string[]).includes(normalized)
    ? (normalized as ComputePreferenceName)
    : null;
}

function scopeOfAlias(aliasId: string): string {
  const separator = aliasId.lastIndexOf(".");
  return separator === -1 ? aliasId : aliasId.slice(separator + 1);
}

/** Diagnostics the readback addresses to a kind (`role "…"` / `workload "…"`) or to one entry. */
function diagnosticsFor(kind: PostureEntryKind, name: string, text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith(`${kind} `) || text.includes(`"${name}"`);
}

export function summarizePostureDiagnostics(diagnostics: PostureDiagnosticsReadback): {
  readonly violations: readonly string[];
  readonly poolEmptyReports: readonly { readonly aliasId: string; readonly reason: string }[];
  readonly warnings: readonly string[];
  readonly unknownCapabilityWarnings: readonly string[];
} {
  return {
    violations: diagnostics.violations,
    poolEmptyReports: diagnostics.skipped,
    warnings: diagnostics.warnings,
    unknownCapabilityWarnings: diagnostics.warnings.filter((warning) => /capabilit/i.test(warning)),
  };
}

/**
 * One row per entry with its binding, its posture and one alias row per execution scope. The
 * readback does not publish which endpoint the latest decision picked for an alias, so the row names
 * the top-ranked eligible endpoint a "current leader" instead of inventing a winner.
 */
export function buildPostureEntryRows(
  entries: readonly PostureEntryReadback[],
  diagnostics: PostureDiagnosticsReadback = EMPTY_POSTURE_DIAGNOSTICS,
): readonly PostureEntryRowView[] {
  return entries.map((entry) => {
    const kindLabel = POSTURE_KIND_LABELS[entry.kind];
    const roleId = entry.roleId ?? null;
    const scoringStrategy = normalizeScoringStrategyValue(entry.scoringStrategy);
    const routingMode = normalizeRoutingModeValue(entry.routingMode);
    const computePreference = readComputePreference(entry.computePreference);
    const postureParts = [
      routingMode ? `${formatRoutingModeLabel(routingMode)} mode` : "inherits the routing mode",
      scoringStrategy ? formatScoringStrategyLabel(scoringStrategy) : "inherits the scoring strategy",
      computePreference ? `compute ${computePreference}` : null,
    ].filter((part): part is string => part !== null);

    const aliases = entry.aliases.map((alias) => {
      const eligible = [...alias.allowEndpointIds].sort((left, right) =>
        left.localeCompare(right, "en"),
      );
      const leaderEndpointId = alias.poolEmpty ? null : (eligible[0] ?? null);
      return {
        aliasId: alias.aliasId,
        scopeLabel: scopeOfAlias(alias.aliasId),
        modeLabel: formatRoutingModeLabel(alias.mode),
        candidateCount: alias.candidateCount,
        candidateLabel: `${alias.candidateCount} candidate${alias.candidateCount === 1 ? "" : "s"}`,
        poolEmpty: alias.poolEmpty,
        poolEmptyLabel: alias.poolEmpty ? "POOL EMPTY" : null,
        leaderEndpointId,
        leaderLabel: leaderEndpointId === null ? null : "current leader",
        eligibleEndpointIds: eligible,
      } satisfies PostureAliasRowView;
    });

    const poolEmptyAliasIds = [
      ...aliases.filter((alias) => alias.poolEmpty).map((alias) => alias.aliasId),
      ...diagnostics.skipped
        .filter((report) => report.aliasId.startsWith(`${entry.name}.`))
        .map((report) => report.aliasId),
    ];

    return {
      name: entry.name,
      kind: entry.kind,
      kindLabel,
      bindingLabel: roleId === null ? "no role binding" : `role_id ${roleId}`,
      roleId,
      scoringStrategy,
      scoringStrategyLabel: scoringStrategy
        ? formatScoringStrategyLabel(scoringStrategy)
        : "inherits",
      routingMode,
      routingModeLabel: routingMode ? formatRoutingModeLabel(routingMode) : "inherits",
      computePreference,
      postureSummary: postureParts.join(" · "),
      modelIds: entry.configuredModelIds,
      requiredCapabilities: entry.requiredCapabilities,
      capabilityLabel:
        entry.requiredCapabilities.length === 0
          ? "no capability requirement"
          : entry.requiredCapabilities.join(", "),
      violations: entry.violations,
      warnings: [
        ...entry.violations,
        ...diagnostics.violations.filter((text) => diagnosticsFor(entry.kind, entry.name, text)),
        ...diagnostics.warnings.filter((text) => diagnosticsFor(entry.kind, entry.name, text)),
      ],
      aliases,
      poolEmptyAliasIds: [...new Set(poolEmptyAliasIds)],
    } satisfies PostureEntryRowView;
  });
}

export interface PostureDraft {
  readonly kind: PostureEntryKind;
  readonly name: string;
  readonly roleId: string;
  readonly scoringStrategy: string;
  readonly routingMode: string;
  readonly computePreference: string;
  readonly modelIds: readonly string[];
  readonly requiredCapabilities: readonly string[];
}

export interface PostureWriteEntry {
  readonly name: string;
  readonly roleId: string | null;
  readonly scoringStrategy: ScoringStrategyName | null;
  readonly routingMode: RoutingModeName | null;
  readonly computePreference: ComputePreferenceName | null;
  readonly modelIds: readonly string[];
  readonly requiredCapabilities: readonly string[];
}

export function createPostureDraft(kind: PostureEntryKind): PostureDraft {
  return {
    kind,
    name: "",
    roleId: "",
    scoringStrategy: "",
    routingMode: "",
    computePreference: "",
    modelIds: [],
    requiredCapabilities: [],
  };
}

export function postureDraftFromEntry(entry: PostureEntryReadback): PostureDraft {
  return {
    kind: entry.kind,
    name: entry.name,
    roleId: entry.roleId ?? "",
    scoringStrategy: entry.scoringStrategy ?? "",
    routingMode: entry.routingMode ?? "",
    computePreference: entry.computePreference ?? "",
    modelIds: [...entry.configuredModelIds],
    requiredCapabilities: [...entry.requiredCapabilities],
  };
}

export type PostureValidationResult =
  | { readonly ok: true; readonly entry: PostureWriteEntry }
  | { readonly ok: false; readonly errors: Readonly<Record<string, string>> };

/**
 * Validates one editable entry against the rules the runtime enforces, and canonicalizes the
 * vocabulary on the way through so a save can never persist `high-quality` or `controller`.
 */
export function validatePostureDraft(draft: PostureDraft): PostureValidationResult {
  const errors: Record<string, string> = {};
  const name = draft.name.trim();
  if (!POSTURE_ENTRY_NAME_PATTERN.test(name)) {
    errors.name = `must match ${POSTURE_ENTRY_NAME_PATTERN.source}`;
  } else if ((RESERVED_POSTURE_NAMES as readonly string[]).includes(name)) {
    errors.name = `"${name}" is reserved for a routing alias family`;
  }

  const roleId = draft.roleId.trim();
  if (draft.kind === "role") {
    if (roleId.length === 0) {
      errors.roleId = "role_id is required for an agent strategy";
    }
  } else if (roleId.length > 0) {
    errors.roleId = "a workload must not declare a role_id";
  }

  const rawScoringStrategy = draft.scoringStrategy.trim();
  const scoringStrategy =
    rawScoringStrategy.length === 0 ? null : normalizeScoringStrategyValue(rawScoringStrategy);
  if (rawScoringStrategy.length > 0 && scoringStrategy === null) {
    errors.scoringStrategy = "must be balanced, quality, latency, cost, or custom";
  }

  const rawRoutingMode = draft.routingMode.trim();
  const routingMode =
    rawRoutingMode.length === 0 ? null : normalizeRoutingModeValue(rawRoutingMode);
  if (rawRoutingMode.length > 0 && routingMode === null) {
    errors.routingMode = "must be baseline, difficulty, hybrid, or intelligent";
  }

  const rawComputePreference = draft.computePreference.trim().toLowerCase();
  const computePreference =
    rawComputePreference.length === 0
      ? null
      : readComputePreference(rawComputePreference);
  if (rawComputePreference.length > 0 && computePreference === null) {
    errors.computePreference = `must be one of ${COMPUTE_PREFERENCE_NAMES.join(", ")}`;
  }

  const modelIds = draft.modelIds.map((modelId) => modelId.trim()).filter((id) => id.length > 0);
  const requiredCapabilities = draft.requiredCapabilities
    .map((capability) => capability.trim())
    .filter((capability) => capability.length > 0);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    entry: {
      name,
      roleId: draft.kind === "role" ? roleId : null,
      scoringStrategy,
      routingMode,
      computePreference,
      modelIds,
      requiredCapabilities: draft.kind === "workload" ? requiredCapabilities : requiredCapabilities,
    },
  };
}

/**
 * The shipped templates the Workloads page offers one click for (`SHIPPED_WORKLOAD_EXAMPLES`).
 * Anything the runtime does not ship returns null so the page cannot invent a template.
 */
export function buildWorkloadTemplateDraft(
  name: string,
  template: Readonly<Record<string, unknown>>,
): PostureDraft | null {
  if (name !== "batch" && name !== "embedding") {
    return null;
  }
  const scoringStrategy = template.scoring_strategy;
  const requiredCapabilities = template.required_capabilities;
  return {
    ...createPostureDraft("workload"),
    name,
    scoringStrategy: typeof scoringStrategy === "string" ? scoringStrategy : "",
    requiredCapabilities: Array.isArray(requiredCapabilities)
      ? requiredCapabilities.filter((value): value is string => typeof value === "string")
      : [],
  };
}

/**
 * Renders the whole `agent_strategies` / `workloads` block the runtime merge replaces wholesale, so
 * removing an entry is expressed by leaving it out rather than by a partial patch.
 */
export function buildPostureWriteBlock(
  kind: PostureEntryKind,
  entries: readonly PostureWriteEntry[],
): Record<string, Record<string, unknown>> {
  return Object.fromEntries(
    entries.map((entry) => {
      const rendered: Record<string, unknown> = {};
      if (kind === "role" && entry.roleId) {
        rendered.role_id = entry.roleId;
      }
      if (entry.scoringStrategy) {
        rendered.scoring_strategy = entry.scoringStrategy;
      }
      if (entry.routingMode) {
        rendered.routing_mode = entry.routingMode;
      }
      if (entry.computePreference) {
        rendered.compute_preference = entry.computePreference;
      }
      if (entry.modelIds.length > 0) {
        rendered.model_ids = [...entry.modelIds];
      }
      if (kind === "workload" && entry.requiredCapabilities.length > 0) {
        rendered.required_capabilities = [...entry.requiredCapabilities];
      }
      return [entry.name, rendered];
    }),
  );
}

export function postureBlockDocumentKey(kind: PostureEntryKind): string {
  return kind === "role" ? "agent_strategies" : "workloads";
}

export function parseCommaList(value: string): readonly string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  ];
}

export function formatCommaList(values: readonly string[]): string {
  return values.join(", ");
}

export function executionScopeLabel(scope: string): string {
  return scope.trim().replaceAll("_", "-");
}

export type { ExecutionScopeName };
