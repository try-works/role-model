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
  readonly leaderEndpointId: string | null;
  readonly leaderLabel: string | null;
  readonly eligibleEndpointIds: readonly string[];
}

/** One execution scope the runtime reported as `ALIAS_POOL_EMPTY` for this entry. */
export interface PostureUnresolvableScopeView {
  readonly aliasId: string;
  readonly scopeLabel: string;
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
  /** The violations and warnings this entry owns, rendered inside its card. */
  readonly messages: readonly string[];
  /** Every alias row the readback published, including the empty ones. */
  readonly aliases: readonly PostureAliasRowView[];
  /** The alias rows the page lists: the scopes that can actually resolve (operator decision). */
  readonly resolvableAliases: readonly PostureAliasRowView[];
  readonly unresolvableScopes: readonly PostureUnresolvableScopeView[];
  /** One plain-English line for the scopes that cannot resolve; null when every scope resolves. */
  readonly unresolvableScopeNotice: string | null;
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

/**
 * Run 103 post-lock repair (operator decision): a diagnostic belongs to the entry it *names*. The
 * runtime's messages begin with their subject (`role "coder" has unknown role_id "ghost"`,
 * `posture alias "coder.remote-only" collides …`), so the first quoted token decides which entry owns
 * the message; a message that quotes no entry at all falls back to the kind prefix. The previous
 * `startsWith(<kind>)` rule attributed every role message to every role entry, which is how the
 * Workloads page ended up showing the `batch`/`embedding` scopes on the Agent strategy page.
 */
function diagnosticsFor(kind: PostureEntryKind, name: string, text: string): boolean {
  const firstQuoted = /"([^"]*)"/.exec(text)?.[1] ?? null;
  if (firstQuoted !== null) {
    return firstQuoted === name || firstQuoted.startsWith(`${name}.`);
  }
  return text.trimStart().startsWith(`${kind} `);
}

/**
 * Run 103 post-lock repair (operator decision): the diagnostics card renders one page, so it must only
 * see the diagnostics of the entries that page owns. A skipped scope belongs to the entry whose name
 * prefixes its alias id; a violation or warning belongs to the entry it names.
 */
export function filterPostureDiagnosticsForKind(
  kind: PostureEntryKind,
  entries: readonly { readonly name: string }[],
  diagnostics: PostureDiagnosticsReadback,
): PostureDiagnosticsReadback {
  const names = entries.map((entry) => entry.name).filter((name) => name.length > 0);
  return {
    violations: diagnostics.violations.filter((text) =>
      names.some((name) => diagnosticsFor(kind, name, text)),
    ),
    skipped: diagnostics.skipped.filter((report) =>
      names.some((name) => report.aliasId.startsWith(`${name}.`)),
    ),
    warnings: diagnostics.warnings.filter((text) =>
      names.some((name) => diagnosticsFor(kind, name, text)),
    ),
  };
}

/**
 * Operator decision: the scope that cannot resolve is a note, not a published alias row, and the note
 * is plain English - never the runtime's `ALIAS_POOL_EMPTY` marker printed twice.
 */
export function buildUnresolvableScopeNotice(
  scopes: readonly PostureUnresolvableScopeView[],
): string | null {
  if (scopes.length === 0) {
    return null;
  }
  const labels = [...new Set(scopes.map((scope) => scope.scopeLabel))].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  const countable = scopes.length === 1 ? "scope" : "scopes";
  const pronoun = scopes.length === 1 ? "this scope" : "those scopes";
  return `${scopes.length} ${countable} cannot resolve: ${labels.join(", ")} — no eligible candidate for ${pronoun}.`;
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
      scoringStrategy
        ? formatScoringStrategyLabel(scoringStrategy)
        : "inherits the scoring strategy",
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
        leaderEndpointId,
        leaderLabel: leaderEndpointId === null ? null : "current leader",
        eligibleEndpointIds: eligible,
      } satisfies PostureAliasRowView;
    });

    /**
     * Operator decision: the scopes that cannot resolve are collected from both sources the runtime
     * publishes - an alias row the readback flagged empty, and a scope it only reported as skipped -
     * and rendered once, on the entry, in plain English.
     */
    const unresolvableScopes = [
      ...new Map(
        [
          ...aliases
            .filter((alias) => alias.poolEmpty)
            .map((alias) => ({ aliasId: alias.aliasId, scopeLabel: alias.scopeLabel })),
          ...diagnostics.skipped
            .filter((report) => report.aliasId.startsWith(`${entry.name}.`))
            .map((report) => ({
              aliasId: report.aliasId,
              scopeLabel: scopeOfAlias(report.aliasId),
            })),
        ]
          .sort((left, right) => left.aliasId.localeCompare(right.aliasId, "en"))
          .map((scope) => [scope.aliasId, scope] as const),
      ).values(),
    ];
    const poolEmptyAliasIds = unresolvableScopes.map((scope) => scope.aliasId);
    const messages = [
      ...new Set([
        ...entry.violations,
        ...diagnostics.violations.filter((text) => diagnosticsFor(entry.kind, entry.name, text)),
        ...diagnostics.warnings.filter((text) => diagnosticsFor(entry.kind, entry.name, text)),
      ]),
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
      messages,
      aliases,
      resolvableAliases: aliases.filter((alias) => !alias.poolEmpty),
      unresolvableScopes,
      unresolvableScopeNotice: buildUnresolvableScopeNotice(unresolvableScopes),
      poolEmptyAliasIds,
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
    rawComputePreference.length === 0 ? null : readComputePreference(rawComputePreference);
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

/**
 * Post-lock repair (run 103): the block is keyed by entry name, so two rows with the same name
 * silently collapse into one when the block is rendered — the operator sees one entry disappear
 * without an error. The page must refuse the save instead.
 */
export function findDuplicateEntryNames(names: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const rawName of names) {
    const name = rawName.trim();
    if (name.length === 0) {
      continue;
    }
    if (seen.has(name)) {
      duplicates.add(name);
      continue;
    }
    seen.add(name);
  }
  return [...duplicates].sort((left, right) => left.localeCompare(right, "en"));
}

export function postureBlockDocumentKey(kind: PostureEntryKind): string {
  return kind === "role" ? "agent_strategies" : "workloads";
}

export interface PosturePatchRow {
  /** The saved entry this row was loaded from; null for a row the operator just added. */
  readonly originName: string | null;
  readonly entry: PostureWriteEntry;
}

export interface PostureNamedBlockPatch {
  /** The per-entry patch: `{name: entry}` upserts, `{name: null}` deletes. */
  readonly block: Record<string, Record<string, unknown> | null>;
  readonly upsertedNames: readonly string[];
  readonly deletedNames: readonly string[];
  /** Saved entries whose row was renamed; the old entry stays until the operator removes it. */
  readonly keptOriginNames: readonly string[];
}

/**
 * Run 103 post-lock repair (operator decision): the page never rewrites the block. It sends one
 * upsert per edited row and an explicit `null` only for the entries the operator removed with the
 * Remove action, so a save can only touch the entries it names and a rename never deletes the
 * saved entry behind it. Fields the saved entry had and the row no longer sets are cleared with an
 * explicit `null`.
 */
export function buildPostureNamedBlockPatch(
  kind: PostureEntryKind,
  input: {
    readonly saved: readonly PostureEntryReadback[];
    readonly rows: readonly PosturePatchRow[];
    readonly removedNames: readonly string[];
  },
): PostureNamedBlockPatch {
  const upsertedNames = input.rows.map((row) => row.entry.name);
  const keptOriginNames = input.rows
    .filter((row) => row.originName !== null && row.originName !== row.entry.name)
    .map((row) => row.originName as string)
    .filter((name) => input.saved.some((entry) => entry.name === name));
  const deletedNames = [...new Set(input.removedNames)]
    .filter((name) => name.length > 0 && !upsertedNames.includes(name))
    .sort((left, right) => left.localeCompare(right, "en"));

  const block: Record<string, Record<string, unknown> | null> = {};
  for (const row of input.rows) {
    const previous =
      row.originName === null
        ? null
        : (input.saved.find((entry) => entry.name === row.originName) ?? null);
    block[row.entry.name] = renderPosturePatchEntry(kind, row.entry, previous);
  }
  for (const name of deletedNames) {
    block[name] = null;
  }
  return { block, upsertedNames, deletedNames, keptOriginNames };
}

function renderPosturePatchEntry(
  kind: PostureEntryKind,
  entry: PostureWriteEntry,
  previous: PostureEntryReadback | null,
): Record<string, unknown> {
  const rendered = { ...buildPostureWriteBlock(kind, [entry])[entry.name] };
  if (previous === null) {
    return rendered;
  }
  /** A saved value the row no longer sets must be cleared explicitly, or the merge keeps it. */
  if (kind === "role" && previous.roleId !== null && !entry.roleId) {
    rendered.role_id = null;
  }
  if (previous.scoringStrategy !== null && !entry.scoringStrategy) {
    rendered.scoring_strategy = null;
  }
  if (previous.routingMode !== null && !entry.routingMode) {
    rendered.routing_mode = null;
  }
  if (previous.computePreference !== null && !entry.computePreference) {
    rendered.compute_preference = null;
  }
  if (previous.configuredModelIds.length > 0 && entry.modelIds.length === 0) {
    rendered.model_ids = null;
  }
  if (
    kind === "workload" &&
    previous.requiredCapabilities.length > 0 &&
    entry.requiredCapabilities.length === 0
  ) {
    rendered.required_capabilities = null;
  }
  return rendered;
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
