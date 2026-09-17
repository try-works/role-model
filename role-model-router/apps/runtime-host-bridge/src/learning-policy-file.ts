import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

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

export interface LearningPolicySnapshot {
  readonly policyVersion: number;
  readonly digest: string;
  readonly source: string;
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
     * Run 98 addendum 30 S1 (`guidance/11` `judgePolicy`): the **designated** judge endpoint. Empty
     * means no judge is designated, so the runtime judges nothing rather than substituting a scored
     * candidate for the judge.
     */
    readonly judgeEndpointId: string;
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
}

const DEFAULT_EFFECTIVE: LearningPolicySnapshot["effective"] = Object.freeze({
  stage: "S1",
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
  judgeEndpointId: "",
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

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

interface ResolvedPolicyDocument {
  readonly document: Record<string, unknown>;
  readonly policyVersion: number;
  readonly source: string;
}

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
): ResolvedPolicyDocument | null {
  if (typeof stateRoot !== "string" || !stateRoot.trim()) return null;
  try {
    const text = readFileSync(path.join(stateRoot, LEARNING_POLICY_STATE_RELATIVE_PATH), "utf8");
    const state = asRecord(JSON.parse(text));
    if (state.schemaVersion !== LEARNING_POLICY_STATE_SCHEMA_VERSION) return null;
    const document = asRecord(state.document);
    if (document.schemaVersion !== ACTIVATION_POLICY_SCHEMA_VERSION) return null;
    return {
      document,
      policyVersion: safePolicyVersion(state.policyVersion, document.policyVersion),
      source: LEARNING_POLICY_STATE_RELATIVE_PATH,
    };
  } catch {
    return null;
  }
}

/** The staged file is the shipped seed used before any operator change exists. */
function resolveStagedPolicyFile(repoRoot: string): ResolvedPolicyDocument | null {
  try {
    const text = readFileSync(path.join(repoRoot, ACTIVATION_POLICY_RELATIVE_PATH), "utf8");
    const document = asRecord(JSON.parse(text));
    if (document.schemaVersion !== ACTIVATION_POLICY_SCHEMA_VERSION) return null;
    return {
      document,
      policyVersion: safePolicyVersion(document.policyVersion),
      source: ACTIVATION_POLICY_RELATIVE_PATH,
    };
  } catch {
    return null;
  }
}

export function readLearningPolicyFile(input: {
  readonly repoRoot: string;
  readonly channel: string;
  readonly scopeId?: string | null;
  readonly stateRoot?: string | null;
}): LearningPolicySnapshot | null {
  if (typeof input.repoRoot !== "string" || !input.repoRoot.trim()) return null;
  const resolved =
    resolveDurablePolicyState(input.stateRoot) ?? resolveStagedPolicyFile(input.repoRoot);
  if (!resolved) return null;
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
    // Run 98 addendum 30 S1: a designated judge endpoint is a bounded, schema-validated identity; a
    // malformed or absent value resolves to the empty string, which means "no judge" rather than
    // "pick a candidate".
    judgeEndpointId:
      typeof merged.judgeEndpointId === "string" &&
      /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(merged.judgeEndpointId.trim())
        ? merged.judgeEndpointId.trim()
        : "",
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
    effective,
  };
}
