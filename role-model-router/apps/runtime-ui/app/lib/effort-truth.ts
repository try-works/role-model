/**
 * Run 106 / R11 (SP8) — operator/UI truthfulness projections.
 *
 * The pure routing primitives (resolveEffortPolicy, resolveBorrowedQualityPrior) live in the host
 * bridge and core packages. These UI projections turn the structured fields those wires already emit
 * (`reasoningEffort`, `effortSource`, `evidenceSource`, `relatedEffortOverallScore`, `effortResolution`)
 * into honest operator-facing disclosure. The rule is the same one R5 states for evidence: borrowed or
 * prior evidence must never read as exact, and a provider-default or coerced arm must never present its
 * effort as if the endpoint instance owned it.
 */

import { formatReasoningEffortLabel } from "./effort-identity";

/**
 * Whether a benchmark score is exact (measured on this endpoint+effort arm), borrowed (a sibling-effort
 * arm of the same model/provider, discounted), prior (a profile-derived aggregate), or absent.
 */
export type EffortEvidenceKind = "exact" | "borrowed" | "prior" | "none";

export interface EffortEvidenceInput {
  readonly evidenceSource?: string | null;
  /** Borrowed cross-effort score; the backend sets it only when the arm has no exact evidence of its own. */
  readonly relatedEffortOverallScore?: number | null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Borrowed wins over exact and prior: a cross-effort sibling score is the strongest non-exact marker and
 * must never be styled as exact benchmark evidence (R5). `run-artifact` is the only exact source; a
 * `profile-derived` capability is a labeled prior.
 */
export function classifyEffortEvidence(input: EffortEvidenceInput): EffortEvidenceKind {
  if (isFiniteNumber(input.relatedEffortOverallScore)) {
    return "borrowed";
  }
  if (input.evidenceSource === "run-artifact") {
    return "exact";
  }
  if (input.evidenceSource === "profile-derived") {
    return "prior";
  }
  return "none";
}

export const EFFORT_EVIDENCE_LABELS: Readonly<Record<EffortEvidenceKind, string>> = {
  exact: "Exact (run artifact)",
  borrowed: "Borrowed (sibling effort)",
  prior: "Prior (profile-derived)",
  none: "No benchmark evidence",
};

export function formatEffortEvidenceLabel(kind: EffortEvidenceKind): string {
  return EFFORT_EVIDENCE_LABELS[kind];
}

/** The closed resolution vocabulary from the R3/R10 wiring (EffortPolicyResolutionKind). */
export type EffortResolutionKind =
  | "router_managed"
  | "exact_primary"
  | "exact_fallback_expanded"
  | "unsupported_fallback"
  | "strict_rejected"
  | "equivalent_mapped";

export const EFFORT_RESOLUTION_LABELS: Readonly<Record<EffortResolutionKind, string>> = {
  router_managed: "Router-managed",
  exact_primary: "Exact effort (primary pool)",
  exact_fallback_expanded: "Exact effort primary · fallback expanded",
  unsupported_fallback: "Unsupported effort · routed fallback",
  strict_rejected: "Strict effort rejected",
  equivalent_mapped: "Equivalent effort mapped",
};

const EFFORT_RESOLUTION_KINDS: ReadonlySet<string> = new Set(Object.keys(EFFORT_RESOLUTION_LABELS));

/** Read a resolution kind from any of the R3/R10 wire field spellings, else null (never invent one). */
export function readEffortResolutionKind(value: unknown): EffortResolutionKind | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const candidate = record.effortResolution ?? record.effort_resolution ?? record.resolution;
  return typeof candidate === "string" && EFFORT_RESOLUTION_KINDS.has(candidate)
    ? (candidate as EffortResolutionKind)
    : null;
}

export function formatEffortResolutionLabel(kind: EffortResolutionKind): string {
  return EFFORT_RESOLUTION_LABELS[kind];
}

/**
 * Unsupported fallback and exact-pool expansion change who actually serves the request, so they must be
 * prominent rather than buried in the raw diagnostics bag (R11: color is not the sole distinction).
 */
export function isProminentEffortResolution(kind: EffortResolutionKind): boolean {
  return kind === "unsupported_fallback" || kind === "exact_fallback_expanded";
}

export interface EffectiveEffortInput {
  readonly reasoningEffort?: string | null;
  readonly effortSource?: string | null;
}

function normalizeEffortSource(source: string | null | undefined): string {
  return (source ?? "").trim().toLowerCase();
}

function isCoercedSource(source: string): boolean {
  return source === "variant" || source === "variant_coerced";
}

/**
 * The honest effective-effort disclosure for one arm row. A fixed arm owns its effort; a provider-default
 * arm lets the adapter decide; a coerced arm is labeled as coerced; `none`/`off` are disabled reasoning,
 * never "no effort". A named effort with an unknown source stays visible rather than being dropped.
 */
export function formatEffectiveEffortDisclosure(input: EffectiveEffortInput): string {
  const normalizedEffort = (input.reasoningEffort ?? "").trim().toLowerCase();
  const source = normalizeEffortSource(input.effortSource);
  const coerced = isCoercedSource(source);

  if (normalizedEffort === "none" || normalizedEffort === "off") {
    return coerced ? "Disabled reasoning (coerced)" : "Disabled reasoning";
  }
  if (coerced) {
    const label = formatReasoningEffortLabel(input.reasoningEffort);
    return label ? `${label} (coerced)` : "Coerced effort";
  }
  const label = formatReasoningEffortLabel(input.reasoningEffort);
  if (label) {
    return source === "fixed" ? `${label} (fixed)` : label;
  }
  return source === "provider-default" ? "Provider default" : "No reasoning effort";
}

export interface EffortArmTruthInput extends EffectiveEffortInput {
  readonly evidence?: EffortEvidenceInput | null;
}

/** One operator line that co-displays effective effort and evidence exactness (R11). */
export function formatEffortArmTruthDisclosure(input: EffortArmTruthInput): string {
  const effortDisclosure = formatEffectiveEffortDisclosure(input);
  const evidenceKind = classifyEffortEvidence(input.evidence ?? {});
  return `${effortDisclosure} · ${formatEffortEvidenceLabel(evidenceKind)}`;
}
