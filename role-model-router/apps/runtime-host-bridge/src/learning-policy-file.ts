import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  resolveRoutingLatencySelectionPolicy,
  type ResolvedRoutingLatencySelectionPolicy,
} from "./routing-latency-policy.js";

/**
 * Run 98 R15/R17: the runtime host's read side of the versioned activation policy config.
 *
 * The operator's single source of truth is `shared/route-learning-activation-policy.json`,
 * staged with the packaged runtime. The host resolves the effective values for its channel
 * and scope (scope overrides channel overrides global) and fails closed to the documented
 * defaults when the file is missing or malformed, so a broken config can never widen
 * activation.
 */

export const ACTIVATION_POLICY_SCHEMA_VERSION = "role-model.route-learning-activation-policy.v1";
export const ACTIVATION_POLICY_RELATIVE_PATH = "shared/route-learning-activation-policy.json";
/**
 * Run 99 R23: the durable operator state written by
 * `shared/route-learning/policy-store.mjs` and read/written by the Learning > Configuration
 * page. The packaged host resolves it first, so a UI policy change actually reaches live
 * routing instead of only updating a record that no router reads.
 */
export const LEARNING_POLICY_STATE_SCHEMA_VERSION =
  "role-model.route-learning-policy-state.v1";
export const LEARNING_POLICY_STATE_RELATIVE_PATH = "learning/activation-policy-state.json";

export type ActivationStage = "S0" | "S1" | "S2" | "S3" | "S4";
const STAGES = new Set<ActivationStage>(["S0", "S1", "S2", "S3", "S4"]);

/**
 * Run 98 addendum 45 J1 (`A44-S1`'s rule applied at the second process boundary): names the schema retired.
 *
 * The policy store migrates a live state file by removing these and reporting them in `retiredFields`; the host
 * read the raw document, so the two sides hashed *different* documents and the Configuration page showed a
 * stored digest that could never equal the router's. Stripping here (the same list, the same places) makes both
 * boundaries resolve and hash the migrated document.
 */
const RETIRED_POLICY_FIELDS = ["advisoryAuthorizationTtlMs", "judgeEndpointId"] as const;

function stripRetiredPolicyFields(document: Record<string, unknown>): void {
  const blocks = [
    document.global,
    ...Object.values(asRecord(document.channels)),
    ...Object.values(asRecord(document.scopes)),
  ];
  for (const block of blocks) {
    const record = asRecord(block);
    for (const name of RETIRED_POLICY_FIELDS) delete record[name];
  }
}

export interface LearningPolicySnapshot {
  readonly policyVersion: number;
  readonly digest: string;
  readonly source: string;
  /**
   * Run 98 addendum 40 (L5): the measured-latency selection parameters from the same versioned
   * document, resolved with the same precedence and the same fail-closed behaviour.
   */
  readonly latencySelection: ResolvedRoutingLatencySelectionPolicy;
  readonly effective: {
    readonly stage: ActivationStage;
    readonly scoreBand: number;
    readonly minAdvisoryConfidence: number;
    readonly cohortPercent: number;
    readonly qualityMinDelta: number;
    readonly costMaxMultiplier: number;
    readonly latencyP95MaxDeltaMs: number;
    readonly errorRateMaxDeltaPp: number;
    /**
     * Run 98 R3: the evidence floors the learning pass validates against, so the validation
     * decision follows the operator's versioned policy instead of a hardcoded threshold.
     */
    readonly minDecisiveComparisons: number;
    readonly minHoldoutComparisons: number;
    /** Run 98 addendum 32 S1: the development-partition floor the gate fits against. */
    readonly minDevelopmentComparisons: number;
    readonly minDistinctCaptures: number;
    readonly evidenceMaxAgeDays: number;
    /**
     * Run 98 R10: judge configuration is resolved from the versioned policy (env vars remain an
     * explicit local override in the runtime composition).
     */
    readonly judgeMode: "identified" | "identity_blind";
    readonly judgeOrderPolicy: "source_first" | "dual_order";
    /** Run 98 addendum 33 S2: how a position-order flip is scored. */
    readonly judgeOrderAggregation: "balanced" | "strict_consistency" | "fails_closed";
    /** Run 98 addendum 33 S2: the position-consistency floor a judge must clear. */
    readonly judgePositionConsistencyFloor: number;
    readonly judgeMeasureAgreement: boolean;
    /**
     * Run 98 addendum 45 J1/J2 (operator instruction 2026-09-20: "i told you this should just use the
     * controller... hardcode it to just use the controller!"): where the pairwise judge comes from.
     * `controller` resolves the endpoint the operator configured as the controller at judge time, so a
     * controller change needs no policy write; `disabled` judges nothing rather than substituting a
     * scored candidate for the judge.
     */
    readonly judgeSource: "controller" | "disabled";
    /**
     * Run 98 R19 / addendum 02: the predeclared statistical promotion protocol of
     * `guidance/07`. The learning pass sends these to the worker, and the worker's promotion
     * decision uses the paired interval lower bound against `minimumPracticalDelta`.
     */
    readonly minimumPracticalDelta: number;
    readonly promotionIntervalLevel: number;
    readonly promotionResamples: number;
    readonly promotionBootstrapSeed: number;
    readonly promotionAnalysisMethod: "paired_cluster_bootstrap";
    readonly multiplicityAdjustment: "none" | "holm_bonferroni";
    readonly promotionSelectionFamilySize: number;
    /**
     * Run 99 R33 (addendum 21 D12): the enforced age limit of the derived advisory source record.
     * Distinct from `evidenceMaxAgeDays`, which bounds the evidence behind the advisory.
     */
    readonly advisorySourceMaxAgeMs: number;
    /**
     * Run 99 R33 (addendum 21 D12): the scheduled revalidation interval the advisory source
     * enforces — evidence older than this is reported stale until the scope is revalidated.
     */
    readonly revalidationIntervalDays: number;
  };
  /**
   * Run 98 addendum 44 `A44-S4`: present when the resolved policy did not come from a valid source. The
   * snapshot is then the base route (stage S0) rather than the shipped default, and this receipt names what
   * was wrong so the Configuration readback can show a degraded state instead of an unexplained S0.
   */
  readonly degraded?: LearningPolicyDegradation;
}

export type LearningPolicyDegradationReason =
  | "policy_source_missing"
  | "policy_source_unreadable"
  | "policy_source_unknown_version"
  | "policy_source_invalid_field";

export interface LearningPolicyDegradation {
  readonly reason: LearningPolicyDegradationReason;
  readonly detail: string;
  readonly field: string | null;
  readonly version: string | null;
  readonly source: string | null;
  readonly atMs: number;
}

const DEFAULT_EFFECTIVE: LearningPolicySnapshot["effective"] = Object.freeze({
  // Run 98 addendum 47 (operator decision 2026-09-20): the per-field defaults a *valid* document inherits are
  // the active stage, production included. A document that is missing or invalid does not reach these: it
  // resolves to BASE_ROUTE_EFFECTIVE below (addendum 44 A44-S4).
  stage: "S4",
  scoreBand: 0.05,
  minAdvisoryConfidence: 0.7,
  cohortPercent: 100,
  qualityMinDelta: -0.02,
  costMaxMultiplier: 1.5,
  latencyP95MaxDeltaMs: 10_000,
  errorRateMaxDeltaPp: 2,
  minDecisiveComparisons: 3,
  minHoldoutComparisons: 1,
  minDevelopmentComparisons: 1,
  minDistinctCaptures: 3,
  evidenceMaxAgeDays: 30,
  judgeMode: "identified",
  judgeOrderPolicy: "source_first",
  judgeOrderAggregation: "balanced",
  judgePositionConsistencyFloor: 0.5,
  judgeMeasureAgreement: false,
  judgeSource: "controller",
  minimumPracticalDelta: 0.05,
  promotionIntervalLevel: 0.95,
  promotionResamples: 10_000,
  promotionBootstrapSeed: 0,
  promotionAnalysisMethod: "paired_cluster_bootstrap",
  multiplicityAdjustment: "holm_bonferroni",
  promotionSelectionFamilySize: 1,
  advisorySourceMaxAgeMs: 900_000,
  revalidationIntervalDays: 7,
});

/**
 * Run 98 addendum 44 `A44-S4`: with no valid policy source the host serves the base route — shadow only, no
 * advisory influence — and attaches the reason. Every other value is the documented per-field default, which
 * is what a valid document that omits a field inherits.
 */
const BASE_ROUTE_EFFECTIVE: LearningPolicySnapshot["effective"] = Object.freeze({
  ...DEFAULT_EFFECTIVE,
  stage: "S0",
});

/**
 * Run 98 addendum 44 `A44-S4`: the fail-closed answer.
 *
 * With no usable policy source the host must still answer, and the safe answer is the base route: stage `S0`
 * (comparisons and advisories are still recorded, selection is unchanged), every other value at its documented
 * default, and the measured-latency input disabled because nothing authorized it. The digest identifies the
 * *degradation*, not a policy an operator wrote, so a decision receipt that cites it cannot be mistaken for a
 * citation of a real policy version.
 */
function baseRouteSnapshot(receipt: LearningPolicyDegradation): LearningPolicySnapshot {
  return {
    policyVersion: 1,
    digest: `sha256:${createHash("sha256")
      .update(
        canonicalPolicyJson({
          baseRoute: true,
          reason: receipt.reason,
          field: receipt.field,
          version: receipt.version,
          source: receipt.source,
        }),
      )
      .digest("hex")}`,
    source: receipt.source ?? "no-policy-source",
    degraded: receipt,
    latencySelection: resolveRoutingLatencySelectionPolicy({}),
    effective: BASE_ROUTE_EFFECTIVE,
  };
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

interface ResolvedPolicyDocument {
  readonly document: Record<string, unknown>;
  readonly policyVersion: number;
  readonly source: string;
}

/**
 * Run 98 addendum 44 `A44-S4`: a source resolution answers with the document or with the bounded reason it
 * could not be used. A missing *durable state* is not a degradation (the operator may never have written one);
 * a missing or damaged staged file is.
 */
type PolicySourceResolution =
  | ({
      readonly ok: true;
    } & ResolvedPolicyDocument)
  | {
      readonly ok: false;
      readonly optional?: boolean;
      readonly degradation: LearningPolicyDegradation;
    };

const degradation = (
  reason: LearningPolicyDegradationReason,
  detail: string,
  extra: { readonly field?: string | null; readonly version?: string | null; readonly source?: string | null } = {},
): LearningPolicyDegradation => ({
  reason,
  detail,
  field: extra.field ?? null,
  version: extra.version ?? null,
  source: extra.source ?? null,
  atMs: Date.now(),
});
/** Canonical JSON identical to `policyDigest` in the operator policy store. */
function canonicalPolicyJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalPolicyJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalPolicyJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function safePolicyVersion(...candidates: unknown[]): number {
  for (const candidate of candidates) {
    if (Number.isSafeInteger(candidate) && Number(candidate) >= 1) return Number(candidate);
  }
  return 1;
}

/**
 * Run 99 R23: where the durable operator policy state actually lives on disk.
 *
 * The host composes the Track B state root for the sidecar as
 * `<runtime-state-root>/<scope-id>/track-b` and the sidecar writes the policy store under it,
 * so live routing has to resolve the same directory instead of the runtime state root; passing
 * the base root silently falls back to the shipped defaults.
 */
export function resolveLearningPolicyStateRoot(input: {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}): string {
  return path.join(input.runtimeStateRoot, input.scopeId, "track-b");
}

/** The durable operator state is the control plane; a foreign or damaged file is ignored. */
function resolveDurablePolicyState(
  stateRoot: string | null | undefined,
): PolicySourceResolution {
  if (typeof stateRoot !== "string" || !stateRoot.trim()) {
    return { ok: false, optional: true, degradation: degradation("policy_source_missing", "no policy state root is configured") };
  }
  const statePath = path.join(stateRoot, LEARNING_POLICY_STATE_RELATIVE_PATH);
  let text: string;
  try {
    text = readFileSync(statePath, "utf8");
  } catch {
    // No operator change has been written yet: fall through to the staged seed without calling it degraded.
    return {
      ok: false,
      optional: true,
      degradation: degradation("policy_source_missing", "no durable policy state exists yet", {
        source: LEARNING_POLICY_STATE_RELATIVE_PATH,
      }),
    };
  }
  try {
    const state = asRecord(JSON.parse(text));
    if (state.schemaVersion !== LEARNING_POLICY_STATE_SCHEMA_VERSION) {
      return {
        ok: false,
        degradation: degradation(
          "policy_source_unknown_version",
          `durable policy state declares an unknown schema version ${String(state.schemaVersion)}`,
          { version: String(state.schemaVersion ?? ""), source: LEARNING_POLICY_STATE_RELATIVE_PATH },
        ),
      };
    }
    const document = asRecord(state.document);
    if (document.schemaVersion !== ACTIVATION_POLICY_SCHEMA_VERSION) {
      return {
        ok: false,
        degradation: degradation(
          "policy_source_unknown_version",
          `durable policy document declares an unknown schema version ${String(document.schemaVersion)}`,
          { version: String(document.schemaVersion ?? ""), source: LEARNING_POLICY_STATE_RELATIVE_PATH },
        ),
      };
    }
    return {
      ok: true,
      document,
      policyVersion: safePolicyVersion(state.policyVersion, document.policyVersion),
      source: LEARNING_POLICY_STATE_RELATIVE_PATH,
    };
  } catch (error) {
    return {
      ok: false,
      degradation: degradation(
        "policy_source_unreadable",
        `durable policy state could not be parsed: ${error instanceof Error ? error.message : String(error)}`,
        { source: LEARNING_POLICY_STATE_RELATIVE_PATH },
      ),
    };
  }
}

/** The staged file is the shipped seed used before any operator change exists. */
function resolveStagedPolicyFile(repoRoot: string): PolicySourceResolution {
  let text: string;
  try {
    text = readFileSync(path.join(repoRoot, ACTIVATION_POLICY_RELATIVE_PATH), "utf8");
  } catch {
    return {
      ok: false,
      degradation: degradation("policy_source_missing", "no readable policy source", {
        source: ACTIVATION_POLICY_RELATIVE_PATH,
      }),
    };
  }
  try {
    const document = asRecord(JSON.parse(text));
    if (document.schemaVersion !== ACTIVATION_POLICY_SCHEMA_VERSION) {
      return {
        ok: false,
        degradation: degradation(
          "policy_source_unknown_version",
          `the staged policy declares an unknown schema version ${String(document.schemaVersion)}`,
          { version: String(document.schemaVersion ?? ""), source: ACTIVATION_POLICY_RELATIVE_PATH },
        ),
      };
    }
    return {
      ok: true,
      document,
      policyVersion: safePolicyVersion(document.policyVersion),
      source: ACTIVATION_POLICY_RELATIVE_PATH,
    };
  } catch (error) {
    return {
      ok: false,
      degradation: degradation(
        "policy_source_unreadable",
        `the staged policy could not be parsed: ${error instanceof Error ? error.message : String(error)}`,
        { source: ACTIVATION_POLICY_RELATIVE_PATH },
      ),
    };
  }
}

/**
 * Run 98 addendum 44 `A44-S4`: the read-side guard.
 *
 * `shared/route-learning/activation-policy.mjs` is the write-path authority, but it is not part of the
 * packaged host (only the JSON seed ships), so the host validates the fields it actually consumes against the
 * same documented bounds before trusting a document. A violation names the first failing field.
 */
const POLICY_NUMERIC_BOUNDS: Record<string, { readonly min: number; readonly max?: number; readonly integer?: boolean }> = {
  scoreBand: { min: 0, max: 0.25 },
  minAdvisoryConfidence: { min: 0.5, max: 1 },
  qualityMinDelta: { min: -0.5, max: 0.5 },
  costMaxMultiplier: { min: 1, max: 3 },
  latencyP95MaxDeltaMs: { min: 0, max: 60_000 },
  errorRateMaxDeltaPp: { min: 0, max: 10 },
  minDecisiveComparisons: { min: 1, max: 100, integer: true },
  minHoldoutComparisons: { min: 0, max: 100, integer: true },
  minDevelopmentComparisons: { min: 0, max: 100, integer: true },
  minDistinctCaptures: { min: 1, max: 100, integer: true },
  evidenceMaxAgeDays: { min: 1, max: 365 },
  evidenceHalfLifeDays: { min: 1, max: 180 },
  advisorySourceMaxAgeMs: { min: 60_000, max: 86_400_000, integer: true },
  revalidationIntervalDays: { min: 1, max: 90 },
  guardrailWindowMinutes: { min: 5, max: 1440, integer: true },
  minAppliedShare: { min: 0, max: 1 },
  minimumPracticalDelta: { min: 0, max: 0.5 },
  promotionIntervalLevel: { min: 0, max: 1 },
  promotionResamples: { min: 1, integer: true },
  promotionBootstrapSeed: { min: 0, integer: true },
  promotionSelectionFamilySize: { min: 1, integer: true },
  judgePositionConsistencyFloor: { min: 0, max: 1 },
};

const JUDGE_MODES = new Set(["identified", "identity_blind"]);
const JUDGE_ORDER_POLICIES = new Set(["source_first", "dual_order"]);
/** Documented shipped default for `evidenceHalfLifeDays` (the read-side guard's own copy of the registry). */
const DEFAULT_EVIDENCE_HALF_LIFE_DAYS = 14;

function validatePolicyBlock(
  block: Record<string, unknown>,
  label: string,
): { readonly field: string; readonly detail: string } | null {
  for (const [field, bounds] of Object.entries(POLICY_NUMERIC_BOUNDS)) {
    if (!(field in block)) continue;
    const value = block[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { field, detail: `${label}.${field} must be a finite number (saw ${String(value)})` };
    }
    if (bounds.integer === true && !Number.isInteger(value)) {
      return { field, detail: `${label}.${field} must be an integer (saw ${String(value)})` };
    }
    if (value < bounds.min || (bounds.max !== undefined && value > bounds.max)) {
      return {
        field,
        detail: `${label}.${field} out of range ${bounds.min}..${bounds.max ?? "∞"} (saw ${String(value)})`,
      };
    }
  }
  if ("stage" in block && !STAGES.has(block.stage as ActivationStage)) {
    return {
      field: "stage",
      detail: `${label}.stage must be one of ${[...STAGES].join(", ")} (saw ${String(block.stage)})`,
    };
  }
  if ("judgeMode" in block && !JUDGE_MODES.has(String(block.judgeMode))) {
    return { field: "judgeMode", detail: `${label}.judgeMode is not a known judge mode` };
  }
  if ("judgeOrderPolicy" in block && !JUDGE_ORDER_POLICIES.has(String(block.judgeOrderPolicy))) {
    return { field: "judgeOrderPolicy", detail: `${label}.judgeOrderPolicy is not a known order policy` };
  }
  if ("cohortLadder" in block) {
    const ladder = block.cohortLadder;
    if (!Array.isArray(ladder) || ladder.length === 0) {
      return { field: "cohortLadder", detail: `${label}.cohortLadder must be a non-empty array` };
    }
    let previous: number | null = null;
    for (const step of ladder) {
      if (typeof step !== "number" || !Number.isInteger(step) || step < 10 || step > 100) {
        return {
          field: "cohortLadder",
          detail: `${label}.cohortLadder steps must be integers within 10-100 (saw ${String(step)})`,
        };
      }
      if (previous !== null && step < previous) {
        return { field: "cohortLadder", detail: `${label}.cohortLadder must be non-decreasing` };
      }
      previous = step;
    }
  }
  return null;
}

function validateResolvedPolicyDocument(
  document: Record<string, unknown>,
): { readonly ok: true } | { readonly ok: false; readonly field: string; readonly detail: string } {
  const blocks: readonly (readonly [string, unknown])[] = [
    ["global", document.global],
    ...Object.entries(asRecord(document.channels)).map(
      ([channel, block]) => [`channels.${channel}`, block] as const,
    ),
    ...Object.entries(asRecord(document.scopes)).map(
      ([scope, block]) => [`scopes.${scope}`, block] as const,
    ),
  ];
  for (const [label, block] of blocks) {
    if (typeof block !== "object" || block === null || Array.isArray(block)) {
      return { ok: false, field: label, detail: `${label} must be an object` };
    }
    const failure = validatePolicyBlock(block as Record<string, unknown>, label);
    if (failure) return { ok: false, ...failure };
  }
  const global = asRecord(document.global);
  const decisive = finiteOr(global.minDecisiveComparisons, DEFAULT_EFFECTIVE.minDecisiveComparisons);
  const holdout = finiteOr(global.minHoldoutComparisons, DEFAULT_EFFECTIVE.minHoldoutComparisons);
  if (holdout > decisive) {
    return {
      ok: false,
      field: "minHoldoutComparisons",
      detail: `minHoldoutComparisons (${holdout}) must not exceed minDecisiveComparisons (${decisive})`,
    };
  }
  const maxAge = finiteOr(global.evidenceMaxAgeDays, DEFAULT_EFFECTIVE.evidenceMaxAgeDays);
  // The estimator decay half-life is a documented parameter of the policy document, not a field of the
  // snapshot the host consumes, so its default lives beside the bounds table rather than on `effective`.
  const halfLife = finiteOr(global.evidenceHalfLifeDays, DEFAULT_EVIDENCE_HALF_LIFE_DAYS);
  if (halfLife > maxAge) {
    return {
      ok: false,
      field: "evidenceHalfLifeDays",
      detail: `evidenceHalfLifeDays (${halfLife}) must not exceed evidenceMaxAgeDays (${maxAge})`,
    };
  }
  return { ok: true };
}

export function readLearningPolicyFile(input: {
  readonly repoRoot: string;
  readonly channel: string;
  readonly scopeId?: string | null;
  readonly stateRoot?: string | null;
}): LearningPolicySnapshot | null {
  const durable = resolveDurablePolicyState(input.stateRoot);
  const staged = durable.ok ? null : resolveStagedPolicyFile(String(input.repoRoot ?? ""));
  const resolved = durable.ok ? durable : staged?.ok ? staged : null;
  if (!resolved) {
    /**
     * Run 98 addendum 44 `A44-S4`: no valid source is not "no answer". The host serves the base route and says
     * why — the failing field or the version it saw — so the decision is fail-closed and explicable, and the
     * Configuration readback can report a degraded state instead of an unexplained S0.
     */
    const durableFailure = durable.ok === false && durable.optional !== true ? durable.degradation : null;
    const stagedFailure = staged && staged.ok === false ? staged.degradation : null;
    return baseRouteSnapshot(
      stagedFailure ??
        durableFailure ??
        (staged?.ok === false ? staged.degradation : null) ??
        degradation("policy_source_missing", "no readable policy source"),
    );
  }
  const validation = validateResolvedPolicyDocument(resolved.document);
  if (!validation.ok) {
    return baseRouteSnapshot(
      degradation("policy_source_invalid_field", validation.detail, {
        field: validation.field,
        version: String(resolved.document.schemaVersion ?? ""),
        source: resolved.source,
      }),
    );
  }
  // Run 98 addendum 45 J1: hash and serve the *migrated* document, so the router's digest is the same digest
  // the operator readback reports for the stored policy.
  stripRetiredPolicyFields(resolved.document);
  // A durable state that exists but cannot be read is a degradation even when the staged seed saves the day.
  const inheritedDegradation =
    durable.ok === false && durable.optional !== true && resolved.source !== durable.degradation.source
      ? durable.degradation
      : null;
  const parsed = resolved.document;
  const global = asRecord(parsed.global);
  const channels = asRecord(parsed.channels);
  const scopes = asRecord(parsed.scopes);
  const channelValues = asRecord(channels[input.channel]);
  // Run 99 R23: the operator policy store keys scopes as `channel/scope`
  // (`shared/route-learning/activation-policy.mjs`); the host used to look up the bare
  // scope id, so every scope override was silently ignored. The canonical key wins and the
  // bare id stays readable for older documents.
  const scopeId = input.scopeId ? String(input.scopeId) : "";
  const scopeValues = scopeId
    ? {
        ...asRecord(scopes[scopeId]),
        ...asRecord(scopes[`${input.channel}/${scopeId}`]),
      }
    : {};
  const merged = { ...global, ...channelValues, ...scopeValues };
  const stage = STAGES.has(merged.stage as ActivationStage)
    ? (merged.stage as ActivationStage)
    : DEFAULT_EFFECTIVE.stage;
  const ladder = Array.isArray(merged.cohortLadder)
    ? (merged.cohortLadder as unknown[]).filter((value): value is number => Number.isInteger(value))
    : [];
  // Stage S2 applies to every eligible decision; stages S3+ are cohort-gated, and the
  // active cohort step is durable rollout state rather than a config value.
  const cohortPercent =
    stage === "S2" ? 100 : ladder.length > 0 ? Math.min(100, Math.max(0, ladder[0] as number)) : 100;
  const effective: LearningPolicySnapshot["effective"] = {
    stage,
    scoreBand: finiteOr(merged.scoreBand, DEFAULT_EFFECTIVE.scoreBand),
    minAdvisoryConfidence: finiteOr(
      merged.minAdvisoryConfidence,
      DEFAULT_EFFECTIVE.minAdvisoryConfidence,
    ),
    cohortPercent,
    qualityMinDelta: finiteOr(merged.qualityMinDelta, DEFAULT_EFFECTIVE.qualityMinDelta),
    costMaxMultiplier: finiteOr(merged.costMaxMultiplier, DEFAULT_EFFECTIVE.costMaxMultiplier),
    latencyP95MaxDeltaMs: finiteOr(
      merged.latencyP95MaxDeltaMs,
      DEFAULT_EFFECTIVE.latencyP95MaxDeltaMs,
    ),
    errorRateMaxDeltaPp: finiteOr(merged.errorRateMaxDeltaPp, DEFAULT_EFFECTIVE.errorRateMaxDeltaPp),
    minDecisiveComparisons: Math.max(
      1,
      Math.round(
        finiteOr(merged.minDecisiveComparisons, DEFAULT_EFFECTIVE.minDecisiveComparisons),
      ),
    ),
    minHoldoutComparisons: Math.max(
      0,
      Math.round(finiteOr(merged.minHoldoutComparisons, DEFAULT_EFFECTIVE.minHoldoutComparisons)),
    ),
    minDevelopmentComparisons: Math.max(
      0,
      Math.round(
        finiteOr(merged.minDevelopmentComparisons, DEFAULT_EFFECTIVE.minDevelopmentComparisons),
      ),
    ),
    minDistinctCaptures: Math.max(
      1,
      Math.round(finiteOr(merged.minDistinctCaptures, DEFAULT_EFFECTIVE.minDistinctCaptures)),
    ),
    evidenceMaxAgeDays: Math.max(
      1,
      finiteOr(merged.evidenceMaxAgeDays, DEFAULT_EFFECTIVE.evidenceMaxAgeDays),
    ),
    // Run 99 R33 (addendum 21 D12): the enforced advisory-source age bound, clamped to the same
    // 1 minute - 24 hour range the operator policy declares.
    advisorySourceMaxAgeMs: Math.min(
      86_400_000,
      Math.max(
        60_000,
        finiteOr(merged.advisorySourceMaxAgeMs, DEFAULT_EFFECTIVE.advisorySourceMaxAgeMs),
      ),
    ),
    revalidationIntervalDays: Math.min(
      90,
      Math.max(1, finiteOr(merged.revalidationIntervalDays, DEFAULT_EFFECTIVE.revalidationIntervalDays)),
    ),
    judgeMode: merged.judgeMode === "identity_blind" ? "identity_blind" : "identified",
    judgeOrderPolicy: merged.judgeOrderPolicy === "dual_order" ? "dual_order" : "source_first",
    judgeOrderAggregation:
      merged.judgeOrderAggregation === "strict_consistency" ||
      merged.judgeOrderAggregation === "fails_closed"
        ? merged.judgeOrderAggregation
        : "balanced",
    // Run 98 addendum 33 S2: the floor is a probability in [0,1]; a malformed value falls back to the
    // shipped default rather than silently disabling the check.
    judgePositionConsistencyFloor: (() => {
      const value = Number(merged.judgePositionConsistencyFloor);
      return Number.isFinite(value) && value >= 0 && value <= 1
        ? value
        : DEFAULT_EFFECTIVE.judgePositionConsistencyFloor;
    })(),
    judgeMeasureAgreement: merged.judgeMeasureAgreement === true,
    // Run 98 addendum 45 J1: a malformed or absent selector resolves to `controller` (the shipped
    // behaviour), and only the explicit `disabled` value turns judging off. No endpoint id is read from
    // policy at all — the retired `judgeEndpointId` name is stripped by the schema before it reaches here.
    judgeSource: merged.judgeSource === "disabled" ? "disabled" : "controller",
    // The legacy name `qualityClaimedImprovement` is the same value under its pre-R19 name, so an
    // older config that only carries the alias still resolves the enforced parameter.
    minimumPracticalDelta: Math.min(
      0.5,
      Math.max(
        0,
        finiteOr(
          merged.minimumPracticalDelta ?? merged.qualityClaimedImprovement,
          DEFAULT_EFFECTIVE.minimumPracticalDelta,
        ),
      ),
    ),
    promotionIntervalLevel: Math.min(
      0.99,
      Math.max(
        0.8,
        finiteOr(merged.promotionIntervalLevel, DEFAULT_EFFECTIVE.promotionIntervalLevel),
      ),
    ),
    promotionResamples: Math.min(
      20_000,
      Math.max(
        1000,
        Math.round(finiteOr(merged.promotionResamples, DEFAULT_EFFECTIVE.promotionResamples)),
      ),
    ),
    promotionBootstrapSeed: Math.min(
      2_147_483_647,
      Math.max(
        0,
        Math.round(finiteOr(merged.promotionBootstrapSeed, DEFAULT_EFFECTIVE.promotionBootstrapSeed)),
      ),
    ),
    promotionAnalysisMethod: "paired_cluster_bootstrap",
    multiplicityAdjustment: merged.multiplicityAdjustment === "none" ? "none" : "holm_bonferroni",
    promotionSelectionFamilySize: Math.min(
      100,
      Math.max(
        1,
        Math.round(
          finiteOr(
            merged.promotionSelectionFamilySize,
            DEFAULT_EFFECTIVE.promotionSelectionFamilySize,
          ),
        ),
      ),
    ),
  };
  return {
    policyVersion: resolved.policyVersion,
    digest: `sha256:${createHash("sha256").update(canonicalPolicyJson(parsed)).digest("hex")}`,
    source: resolved.source,
    ...(inheritedDegradation ? { degraded: inheritedDegradation } : {}),
    latencySelection: resolveRoutingLatencySelectionPolicy({
      // A scope or channel section narrows the global one field by field, so an override that only
      // lowers the delta cannot silently drop the authorization the global section granted.
      raw: (() => {
        const globalSelection = asRecord(global.latencySelection);
        const channelSelection = asRecord(channelValues.latencySelection);
        const scopeSelection = asRecord(scopeValues.latencySelection);
        const nestedSelection = {
          ...globalSelection,
          ...channelSelection,
          ...scopeSelection,
        };
        // The Configuration page edits flat, typed fields (the private policy registry is flat-field
        // based), so those names are folded into the same policy object — and they win over the nested
        // section, because an explicit operator control beats a file-level default.
        const flatSelection: Record<string, unknown> = {};
        const setFlat = (key: string, value: unknown): void => {
          if (value !== undefined) flatSelection[key] = value;
        };
        setFlat("enabled", merged.latencySelectionEnabled);
        setFlat("minStage", merged.latencySelectionMinStage);
        setFlat("windowHours", merged.latencySelectionWindowHours);
        setFlat("minSamples", merged.latencySelectionMinSamples);
        setFlat("maxDeltaMs", merged.latencySelectionMaxDeltaMs);
        setFlat("maxCandidates", merged.latencySelectionMaxCandidates);
        const rawBounds = merged.latencySelectionBucketBounds;
        if (rawBounds !== undefined) {
          if (typeof rawBounds === "string") {
            const parsed = rawBounds
              .split(",")
              .map((part) => Number(part.trim()));
            // A malformed list is passed through unchanged so the resolver records the violation and
            // fails closed, instead of silently falling back to the default bucket layout.
            setFlat(
              "tokenBucketUpperBounds",
              parsed.every((value) => Number.isSafeInteger(value) && value > 0)
                ? parsed
                : rawBounds,
            );
          } else {
            setFlat("tokenBucketUpperBounds", rawBounds);
          }
        }
        const mergedSelection = { ...nestedSelection, ...flatSelection };
        return Object.keys(mergedSelection).length > 0 ? mergedSelection : undefined;
      })(),
    }),
    effective,
  };
}
/**
 * Run 98 addendum 44 `A44-S4`: the bounded projection the operator readback publishes.
 *
 * The Configuration page renders the sidecar's stored policy; this projection says what the *router* resolved
 * for the live scope — which source, which version and digest, and whether that resolution was degraded. It is
 * a whitelist, not the whole snapshot, so the readback cannot leak policy internals it never promised.
 */
export interface RouterPolicyResolution {
  readonly stage: ActivationStage;
  readonly policyVersion: number;
  readonly digest: string;
  readonly source: string;
  readonly degraded: LearningPolicyDegradation | null;
}

export function describeRouterPolicyResolution(
  snapshot: LearningPolicySnapshot | null | undefined,
): RouterPolicyResolution | null {
  if (!snapshot) return null;
  return {
    stage: snapshot.effective.stage,
    policyVersion: snapshot.policyVersion,
    digest: snapshot.digest,
    source: snapshot.source,
    degraded: snapshot.degraded ? { ...snapshot.degraded } : null,
  };
}
