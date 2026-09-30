/**
 * Run 103 / SP8 - the decision receipts the Router decision surfaces render.
 *
 * The runtime records `routingDiagnostics.strategyResolution`, `.aliasPostureBinding` and
 * `.latencySelection` (run 103 SP3/SP5g/SP7). These readers project that diagnostics bag into small
 * views and name an unrecognized strategy as unrecognized instead of echoing a raw config string
 * (R3: "the `strategyLabel` fallback to the raw config string must be removed").
 */

import { WEIGHT_METRICS, formatScoringStrategyLabel } from "./routing-mode";

export const STRATEGY_SOURCE_LABELS: Readonly<Record<string, string>> = {
  controller: "controller directive",
  difficulty: "difficulty classification",
  operator: "operator strategy",
  default: "runtime default",
};

export interface DiscardedDirectiveView {
  readonly source: string;
  readonly strategy: string;
}

export interface StrategyReceiptView {
  readonly strategy: string;
  readonly strategyLabel: string;
  readonly source: string;
  readonly sourceLabel: string;
  readonly weightsDigest: string | null;
  /** Run 103 R2: the effective weights the decision used, when the runtime published them. */
  readonly weightsLabel: string | null;
  readonly discarded: DiscardedDirectiveView | null;
  readonly discardedLabel: string | null;
}

export type LatencyOutcomeName =
  | "disabled"
  | "no_candidates"
  | "insufficient_evidence"
  | "kept_router_choice"
  | "selected_faster_candidate";

export const LATENCY_OUTCOME_LABELS: Readonly<Record<LatencyOutcomeName, string>> = {
  disabled: "disabled",
  no_candidates: "no candidates in the prompt-size bucket",
  insufficient_evidence: "insufficient evidence",
  kept_router_choice: "kept the router choice",
  selected_faster_candidate: "selected a faster candidate",
};

export interface LatencyCandidateView {
  readonly endpointId: string;
  readonly p50LatencyMs: number | null;
  readonly p95LatencyMs: number | null;
  readonly effectiveLatencyMs: number | null;
  readonly sampleCount: number | null;
}

export interface LatencyReceiptView {
  readonly outcome: LatencyOutcomeName;
  readonly outcomeLabel: string;
  readonly acted: boolean;
  readonly chosenEndpointId: string | null;
  readonly bucketUpperBoundTokens: number | null;
  readonly bucketLabel: string;
  readonly reason: string | null;
  readonly candidates: readonly LatencyCandidateView[];
  readonly candidateCount: number;
}

export interface AliasPostureReceiptView {
  readonly aliasId: string;
  readonly name: string | null;
  readonly kind: string | null;
  readonly roleId: string | null;
  readonly roleSource: string;
  readonly roleLabel: string;
  readonly declaredRoleId: string | null;
  readonly presetRoleId: string | null;
  readonly requiredCapabilities: readonly string[];
  readonly capabilityLabel: string;
  readonly scoringStrategy: string | null;
  readonly scoringStrategyLabel: string;
  readonly preferLocal: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringList(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
}

/** The strategy the decision actually used, who chose it, and what a pinned posture discarded. */
export function readStrategyReceipt(
  diagnostics: Record<string, unknown> | null | undefined,
): StrategyReceiptView | null {
  const resolution = asRecord(asRecord(diagnostics)?.strategyResolution);
  if (!resolution) {
    return null;
  }
  const strategy = asString(resolution.strategy);
  if (!strategy) {
    return null;
  }
  const strategyLabel = formatScoringStrategyLabel(strategy);
  if (strategyLabel === "unrecognized strategy") {
    return null;
  }
  const source = asString(resolution.source) ?? "default";
  const discardedRecord = asRecord(resolution.discarded);
  const discardedStrategy = discardedRecord ? asString(discardedRecord.strategy) : null;
  const discardedSource = discardedRecord ? asString(discardedRecord.source) : null;
  const discarded =
    discardedStrategy && discardedSource
      ? { source: discardedSource, strategy: discardedStrategy }
      : null;
  const weightsRecord = asRecord(resolution.weights);
  const weightsLabel = weightsRecord
    ? WEIGHT_METRICS.filter((metric) => typeof weightsRecord[metric] === "number")
        .map((metric) => `${metric} ${weightsRecord[metric]}`)
        .join(" · ")
    : "";
  return {
    strategy,
    strategyLabel,
    source,
    sourceLabel: STRATEGY_SOURCE_LABELS[source] ?? source,
    weightsDigest: asString(resolution.weightsDigest),
    weightsLabel: weightsLabel.length > 0 ? weightsLabel : null,
    discarded,
    discardedLabel: discarded
      ? `${discarded.source} wanted ${formatScoringStrategyLabel(discarded.strategy)}`
      : null,
  };
}

/** The measured-latency outcome and the candidates it compared. */
export function readLatencyReceipt(
  diagnostics: Record<string, unknown> | null | undefined,
): LatencyReceiptView | null {
  const selection = asRecord(asRecord(diagnostics)?.latencySelection);
  const outcome = selection ? asString(selection.outcome) : null;
  if (!selection || !outcome || !(outcome in LATENCY_OUTCOME_LABELS)) {
    return null;
  }
  const candidates = Array.isArray(selection.candidates)
    ? selection.candidates.map((entry) => {
        const record = asRecord(entry) ?? {};
        return {
          endpointId: asString(record.endpointId) ?? "unknown endpoint",
          p50LatencyMs: asNumber(record.p50LatencyMs),
          p95LatencyMs: asNumber(record.p95LatencyMs),
          effectiveLatencyMs: asNumber(record.effectiveLatencyMs),
          sampleCount: asNumber(record.sampleCount),
        } satisfies LatencyCandidateView;
      })
    : [];
  const bucketUpperBoundTokens = asNumber(selection.bucketUpperBoundTokens);
  return {
    outcome: outcome as LatencyOutcomeName,
    outcomeLabel: LATENCY_OUTCOME_LABELS[outcome as LatencyOutcomeName],
    acted: outcome === "selected_faster_candidate",
    chosenEndpointId: asString(selection.chosenEndpointId),
    bucketUpperBoundTokens,
    bucketLabel:
      bucketUpperBoundTokens === null
        ? "no prompt-size bucket matched"
        : `≤ ${bucketUpperBoundTokens} tokens`,
    reason: asString(selection.reason),
    candidates,
    candidateCount: candidates.length,
  };
}

/** The alias binding a posture-scoped request inherited, including which role won. */
export function readAliasPostureReceipt(
  diagnostics: Record<string, unknown> | null | undefined,
): AliasPostureReceiptView | null {
  const binding = asRecord(asRecord(diagnostics)?.aliasPostureBinding);
  if (!binding) {
    return null;
  }
  const aliasId = asString(binding.aliasId);
  if (!aliasId) {
    return null;
  }
  const declaredRoleId = asString(binding.declaredRoleId);
  const presetRoleId = asString(binding.presetRoleId);
  const roleId = asString(binding.roleId);
  const roleSource = asString(binding.roleSource) ?? "none";
  const roleLabel = (() => {
    if (declaredRoleId && presetRoleId) {
      return `${declaredRoleId} (declared) over preset ${presetRoleId}`;
    }
    if (declaredRoleId) {
      return `${declaredRoleId} (declared)`;
    }
    if (presetRoleId) {
      return `${presetRoleId} (preset)`;
    }
    return roleId ?? "no role binding";
  })();
  const requiredCapabilities = asStringList(binding.requiredCapabilities);
  const scoringStrategy = asString(binding.scoringStrategy);
  return {
    aliasId,
    name: asString(binding.name),
    kind: asString(binding.kind),
    roleId,
    roleSource,
    roleLabel,
    declaredRoleId,
    presetRoleId,
    requiredCapabilities,
    capabilityLabel:
      requiredCapabilities.length === 0
        ? "no added capability requirement"
        : requiredCapabilities.join(", "),
    scoringStrategy,
    scoringStrategyLabel: scoringStrategy
      ? formatScoringStrategyLabel(scoringStrategy)
      : "inherits",
    preferLocal: binding.preferLocal === true,
  };
}

/** The label a decision list row shows for the strategy it applied. */
export function formatDecisionStrategyLabel(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) {
    return "no strategy label";
  }
  return formatScoringStrategyLabel(trimmed);
}
