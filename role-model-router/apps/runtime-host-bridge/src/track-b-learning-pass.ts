/**
 * Run 98 R3: the learning pass.
 *
 * The capture → replay → evaluation → signals chain produces a finalized comparison and (when
 * the trajectory carries recognized behavioural evidence) a shadow candidate. Nothing in the
 * runtime ever turned that candidate into learning: `knowledge:validate-candidate` and
 * `knowledge:promote-candidate` existed as capabilities with no caller, so no validation
 * receipt, no experience pack and no promotable advisory could ever exist and P98-02/P98-06
 * could not pass on a live stage root.
 *
 * This module runs the pass the canonical pipeline describes (`docs/route-learning/
 * shadow-to-active.md`, steps 6-7): aggregate the durable decisive/holdout evidence for the
 * candidate's route package, validate the candidate against its finalized holdout comparison
 * with the policy's floors and guardrails, promote it only when the receipt says `validate`,
 * and record both receipts in the Knowledge Store with their scoring identity.
 *
 * The pass never dispatches a provider call, never mutates a route and never injects a prompt:
 * it only turns already-paid, already-durable evidence into the contract records the rollout
 * policy consumes.
 */

// Run 99 R33 D10: the canonical code for a judge that disagreed with itself under swapped
// presentation order. Imported from the dispatcher so the exclusion counter and the judge share
// one vocabulary.
import { POSITION_ORDER_DISAGREEMENT } from "./track-b-shadow-judge-dispatch.js";

export const RUN98_LEARNING_PASS_SCHEMA = "role-model.route-learning-pass.v1";
export const RUN98_LEARNING_PASS_DEGRADATION_SCHEMA = "role-model.route-learning-pass-degradation.v1";
export const RUN98_LEARNING_ESTIMATOR_VERSION = "paired-cluster-bootstrap@1";
export const RUN98_LEARNING_DEFAULT_BOOTSTRAP_RESAMPLES = 2_000;

/**
 * Policy defaults when the runtime composes the pass without a versioned policy snapshot.
 * Every one of these values is operator-configurable in `shared/route-learning-activation-policy.json`
 * and exposed through the Learning UI.
 */
export const DEFAULT_LEARNING_EVIDENCE_FLOOR = Object.freeze({
  minDecisiveComparisons: 3,
  minHoldoutComparisons: 1,
  minDistinctCaptures: 3,
});

/**
 * Run 99 R33 D12: the shipped default of `evidenceHalfLifeDays`. The pass takes the operator's
 * value when the caller supplies it; otherwise the policy default applies, so the decay is never
 * silently absent.
 */
export const DEFAULT_EVIDENCE_HALF_LIFE_DAYS = 14;

/**
 * Run 99 R33 (addendum 20 D5, `guidance/13` §Evidence-source weighting): how much each evidence
 * class counts toward the learner's floor. Zero means the class is not semantic-quality evidence
 * at all, so the comparison is excluded rather than down-weighted.
 */
export const EVIDENCE_CLASS_WEIGHTS: Readonly<Record<string, number>> = Object.freeze({
  natural_deterministic_outcome: 1,
  manual_replay: 1,
  counterfactual_replay: 0.9,
  background_local_eval: 0.8,
  benchmark: 0.75,
  passive_outcome_proxy: 0.1,
  route_replay: 0,
  passive_observability: 0,
});
const DEFAULT_EVIDENCE_CLASS = "counterfactual_replay";

/**
 * Run 99 R33 (addendum 20 D4): the strength of the parent (route-package) prior when a family's own
 * evidence is thin. `guidance/13` shrinks the most specific level toward its parent; a family below
 * this many effective comparisons leans on the package level, and the fallback level is disclosed.
 */
export const FAMILY_PRIOR_STRENGTH = 5;

export const DEFAULT_LEARNING_GUARDRAILS = Object.freeze({ qualityMinDelta: -0.02 });

/**
 * Run 98 R19 / addendum 02: the predeclared statistical promotion protocol of `guidance/07`.
 * The pass always declares one; the worker fails closed (`promotion_protocol_required`) when a
 * validation arrives without it, so a pack can never be promoted on a point estimate.
 */
export const DEFAULT_PROMOTION_PROTOCOL = Object.freeze({
  protocolId: "promotion:paired-cluster-bootstrap",
  primaryMetricId: "role_model_pairwise_judge.battle",
  direction: "higher_is_better" as const,
  minimumPracticalDelta: 0.05,
  intervalLevel: 0.95,
  resamples: 10_000,
  bootstrapSeed: 0,
  analysisMethod: "paired_cluster_bootstrap" as const,
  selectionFamilySize: 1,
  multiplicityAdjustment: "holm_bonferroni" as const,
});

const DECISIVE_OUTCOMES = new Set(["candidate", "source"]);

export interface TrackBLearningPassRuntime {
  invoke(extensionId: string, envelope: Record<string, unknown>): Promise<unknown>;
}

export interface TrackBLearningEvidenceGroup {
  readonly groupId?: unknown;
  readonly status?: unknown;
  readonly comparability?: unknown;
  readonly holdout?: unknown;
  readonly result?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function boundedText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function buildTrackBLearningEvidenceSummary(input: {
  readonly groups: readonly TrackBLearningEvidenceGroup[];
  readonly routePackage: string;
  readonly evidenceMaxAgeMs: number;
  readonly nowMs: number;
  /**
   * Run 99 R33 (addendum 21 D12): the estimator decay half-life from the operator policy. Each
   * comparison contributes `0.5 ** (ageDays / halfLifeDays)` to the effective count, so old
   * evidence cannot outweigh fresh evidence of the same nominal count.
   */
  readonly evidenceHalfLifeDays?: number | null;
}): {
  readonly decisiveComparisons: number;
  readonly holdoutComparisons: number;
  readonly distinctCaptures: number;
  readonly caseManifestRef: string;
  readonly effectiveDecisiveComparisons: number;
  readonly effectiveHoldoutComparisons: number;
  /**
   * Run 99 R33 (addendum 19 S34, addendum 20 D2/D4, addendum 21 D11): the same counts keyed by
   * the task family the comparison was produced for. The learner's floor is per
   * (route package x task family), so another family's evidence can never clear this one's.
   */
  readonly byFamily: Record<
    string,
    {
      decisiveComparisons: number;
      holdoutComparisons: number;
      distinctCaptures: number;
      effectiveDecisiveComparisons: number;
      effectiveHoldoutComparisons: number;
      effectiveSampleSize: number;
      maxCaptureShare: number | null;
      drift: number | null;
      evidenceClasses: Record<string, number>;
      hierarchy: {
        level: "task_family";
        fallbackLevel: "route_package" | null;
        effectiveN: number;
        priorMean: number | null;
        priorStrength: number;
        shrunkValue: number;
        confidence: number;
      };
      propensityCoverage: number;
      causalClaim: "observational" | "randomized";
    }
  >;
  /** Run 99 R33 / addendum 21 D10: why the other finalized groups were not counted. */
  readonly excludedByReason: Record<string, number>;
} {
  const decisiveGroupIds: string[] = [];
  const captures = new Set<string>();
  const familyCaptures = new Map<string, Set<string>>();
  const familyDecisive = new Map<string, string[]>();
  const familyHoldout = new Map<string, number>();
  const familyEffectiveDecisive = new Map<string, number>();
  const familyEffectiveHoldout = new Map<string, number>();
  // Run 99 R33 D11: per-family source concentration and temporal drift dimensions.
  const familyCaptureCounts = new Map<string, Map<string, number>>();
  const familyObservations = new Map<string, { atMs: number; delta: number }[]>();
  // Run 99 R33 D5: how many comparisons of each evidence class back each family.
  const familyEvidenceClasses = new Map<string, Record<string, number>>();
  // Run 99 R33 D6: how much of each family's evidence carries a valid selection probability.
  const familyCounted = new Map<string, number>();
  const familyWithPropensity = new Map<string, number>();
  const excludedByReason: Record<string, number> = {};
  const exclude = (reason: string): void => {
    excludedByReason[reason] = (excludedByReason[reason] ?? 0) + 1;
  };
  let holdoutComparisons = 0;
  let effectiveDecisiveComparisons = 0;
  let effectiveHoldoutComparisons = 0;
  const halfLifeDays =
    typeof input.evidenceHalfLifeDays === "number" &&
    Number.isFinite(input.evidenceHalfLifeDays) &&
    input.evidenceHalfLifeDays > 0
      ? input.evidenceHalfLifeDays
      : DEFAULT_EVIDENCE_HALF_LIFE_DAYS;
  const roundWeight = (value: number) => Math.round(value * 10_000) / 10_000;
  for (const group of input.groups) {
    const result = asRecord(group.result);
    const comparability = asRecord(group.comparability ?? result?.comparability);
    const holdout = asRecord(group.holdout ?? result?.holdout);
    const groupId = boundedText(group.groupId ?? result?.groupId);
    if (!result || !comparability || !groupId) {
      exclude("missing_comparability");
      continue;
    }
    if (result.status !== "finalized") {
      exclude("not_finalized");
      continue;
    }
    // Run 99 R33 (addendum 21 D10, `guidance/11` "incomparable ... groups are ineligible for
    // promotion evidence"): a comparison that reports validity issues — including the judge's
    // own position-order disagreement — is excluded and counted by code, never averaged in.
    const validityIssues = Array.isArray(result.validityIssues)
      ? result.validityIssues
          .map((issue) => boundedText(issue))
          .filter((issue): issue is string => issue !== null)
      : [];
    if (
      result.orderDisagreement === true ||
      String(result.outcome ?? "").trim().toLowerCase() === "order_disagreement"
    ) {
      validityIssues.push(POSITION_ORDER_DISAGREEMENT);
    }
    if (validityIssues.length > 0) {
      for (const issue of new Set(validityIssues)) {
        exclude(`incomparable:${issue.slice(0, 48)}`);
      }
      continue;
    }
    // Run 99 R33 D5: the evidence class decides how much the comparison is worth. A class with
    // weight 0 (route-only replay, passive observability) is not quality evidence and is excluded.
    const evidenceClass =
      boundedText(comparability.evidenceStrength) ??
      boundedText(result.evidenceStrength) ??
      DEFAULT_EVIDENCE_CLASS;
    const classWeight = EVIDENCE_CLASS_WEIGHTS[evidenceClass] ?? EVIDENCE_CLASS_WEIGHTS[DEFAULT_EVIDENCE_CLASS];
    if (!(classWeight > 0)) {
      exclude(`non_semantic_evidence:${evidenceClass.slice(0, 48)}`);
      continue;
    }
    // Run 99 R33 D6: a comparison is randomized evidence only when it declares a valid selection
    // probability for a randomized mode; everything else counts as observational.
    const selectionMode =
      boundedText(comparability.selectionMode) ?? boundedText(result.selectionMode) ?? null;
    const selectionProbabilityRaw = comparability.selectionProbability ?? result.selectionProbability;
    const selectionProbability = Number(selectionProbabilityRaw);
    const hasPropensity =
      (selectionMode === "controlled_exploration" || selectionMode === "policy_randomized") &&
      Number.isFinite(selectionProbability) &&
      selectionProbability > 0 &&
      selectionProbability <= 1;
    if (!DECISIVE_OUTCOMES.has(String(result.outcome ?? ""))) {
      exclude("non_decisive_outcome");
      continue;
    }
    // The candidate's route package must be the counterfactual or the source of the
    // comparison: evidence about a different package can never validate this candidate.
    const involved =
      String(comparability.counterfactualCandidateRef ?? "") === input.routePackage ||
      String(comparability.sourceCandidateRef ?? "") === input.routePackage;
    if (!involved) {
      exclude("package_not_involved");
      continue;
    }
    const ageMs = evidenceAgeMs(comparability, input.nowMs);
    if (ageMs !== null && ageMs > input.evidenceMaxAgeMs) {
      exclude("evidence_expired");
      continue;
    }
    decisiveGroupIds.push(groupId);
    const captureRef =
      boundedText(comparability.inputRef) ??
      boundedText(comparability.forkRef) ??
      boundedText(comparability.sourceEvidenceRef) ??
      groupId;
    captures.add(captureRef);
    const caseIds = Array.isArray(holdout?.caseIds) ? holdout.caseIds : [];
    if (caseIds.length > 0) holdoutComparisons += 1;
    // Run 99 R33 D12: the decay weight uses the same age the freshness window used.
    const decay = ageMs === null ? 1 : Math.pow(0.5, ageMs / 86_400_000 / halfLifeDays);
    const weight = decay * classWeight;
    effectiveDecisiveComparisons += weight;
    if (caseIds.length > 0) effectiveHoldoutComparisons += weight;
    const family = boundedText(comparability.taskTypeId);
    if (family) {
      const bucket = familyDecisive.get(family) ?? [];
      bucket.push(groupId);
      familyDecisive.set(family, bucket);
      const familyCaptureSet = familyCaptures.get(family) ?? new Set<string>();
      familyCaptureSet.add(captureRef);
      familyCaptures.set(family, familyCaptureSet);
      if (caseIds.length > 0) familyHoldout.set(family, (familyHoldout.get(family) ?? 0) + 1);
      familyEffectiveDecisive.set(family, (familyEffectiveDecisive.get(family) ?? 0) + weight);
      if (caseIds.length > 0) {
        familyEffectiveHoldout.set(family, (familyEffectiveHoldout.get(family) ?? 0) + weight);
      }
      const classCounts = familyEvidenceClasses.get(family) ?? {};
      classCounts[evidenceClass] = (classCounts[evidenceClass] ?? 0) + 1;
      familyEvidenceClasses.set(family, classCounts);
      familyCounted.set(family, (familyCounted.get(family) ?? 0) + 1);
      if (hasPropensity) {
        familyWithPropensity.set(family, (familyWithPropensity.get(family) ?? 0) + 1);
      }
      const captureCounts = familyCaptureCounts.get(family) ?? new Map<string, number>();
      captureCounts.set(captureRef, (captureCounts.get(captureRef) ?? 0) + 1);
      familyCaptureCounts.set(family, captureCounts);
      const delta = comparisonDelta(result);
      const observedAtMs = comparisonObservedAtMs(comparability, input.nowMs, ageMs);
      if (delta !== null && observedAtMs !== null) {
        const rows = familyObservations.get(family) ?? [];
        rows.push({ atMs: observedAtMs, delta });
        familyObservations.set(family, rows);
      }
    }
  }
  const byFamily: Record<
    string,
    {
      decisiveComparisons: number;
      holdoutComparisons: number;
      distinctCaptures: number;
      effectiveDecisiveComparisons: number;
      effectiveHoldoutComparisons: number;
      effectiveSampleSize: number;
      maxCaptureShare: number | null;
      drift: number | null;
      evidenceClasses: Record<string, number>;
      hierarchy: {
        level: "task_family";
        fallbackLevel: "route_package" | null;
        effectiveN: number;
        priorMean: number | null;
        priorStrength: number;
        shrunkValue: number;
        confidence: number;
      };
      propensityCoverage: number;
      causalClaim: "observational" | "randomized";
    }
  > = {};
  for (const [family, groupIds] of familyDecisive) {
    const captureCounts = familyCaptureCounts.get(family) ?? new Map<string, number>();
    const captureTotal = [...captureCounts.values()].reduce((sum, count) => sum + count, 0);
    const maxCaptureShare =
      captureTotal > 0 ? roundWeight(Math.max(...captureCounts.values()) / captureTotal) : null;
    const observations = [...(familyObservations.get(family) ?? [])].sort(
      (left, right) => left.atMs - right.atMs,
    );
    const drift = (() => {
      if (observations.length < 4) return null;
      const half = Math.floor(observations.length / 2);
      const mean = (rows: { delta: number }[]) =>
        rows.reduce((sum, row) => sum + row.delta, 0) / rows.length;
      return roundWeight(Math.abs(mean(observations.slice(0, half)) - mean(observations.slice(half))));
    })();
    // Run 99 R33 D4: shrink the family estimate toward the route-package prior, calibrated from the
    // *other* families only (a disjoint set), and record which level the estimate actually leans on.
    const ownObservations = familyObservations.get(family) ?? [];
    const mean = (rows: { delta: number }[]) =>
      rows.length ? rows.reduce((sum, row) => sum + row.delta, 0) / rows.length : 0;
    const ownMean = mean(ownObservations);
    const packagePrior = [...familyObservations.entries()]
      .filter(([otherFamily]) => otherFamily !== family)
      .flatMap(([, rows]) => rows);
    const priorMean = packagePrior.length > 0 ? mean(packagePrior) : null;
    const familyEffectiveN = familyEffectiveDecisive.get(family) ?? 0;
    const hierarchy = {
      level: "task_family" as const,
      fallbackLevel:
        priorMean !== null && familyEffectiveN < FAMILY_PRIOR_STRENGTH
          ? ("route_package" as const)
          : null,
      effectiveN: roundWeight(familyEffectiveN),
      priorMean: priorMean === null ? null : roundWeight(priorMean),
      priorStrength: FAMILY_PRIOR_STRENGTH,
      shrunkValue: roundWeight(
        priorMean === null
          ? ownMean
          : (ownMean * familyEffectiveN + priorMean * FAMILY_PRIOR_STRENGTH) /
              (familyEffectiveN + FAMILY_PRIOR_STRENGTH),
      ),
      confidence: roundWeight(
        Math.min(1, familyEffectiveN / (familyEffectiveN + FAMILY_PRIOR_STRENGTH)),
      ),
    };
    byFamily[family] = {
      decisiveComparisons: groupIds.length,
      holdoutComparisons: familyHoldout.get(family) ?? 0,
      distinctCaptures: familyCaptures.get(family)?.size ?? 0,
      effectiveDecisiveComparisons: roundWeight(familyEffectiveDecisive.get(family) ?? 0),
      effectiveHoldoutComparisons: roundWeight(familyEffectiveHoldout.get(family) ?? 0),
      effectiveSampleSize: roundWeight(familyEffectiveDecisive.get(family) ?? 0),
      maxCaptureShare,
      drift,
      evidenceClasses: { ...(familyEvidenceClasses.get(family) ?? {}) },
      hierarchy,
      // Run 99 R33 D6: observational unless every counted comparison carries a valid propensity.
      propensityCoverage: (() => {
        const counted = familyCounted.get(family) ?? 0;
        return counted > 0 ? roundWeight((familyWithPropensity.get(family) ?? 0) / counted) : 0;
      })(),
      causalClaim:
        (familyCounted.get(family) ?? 0) > 0 &&
        (familyWithPropensity.get(family) ?? 0) === (familyCounted.get(family) ?? 0)
          ? ("randomized" as const)
          : ("observational" as const),
    };
  }
  return {
    decisiveComparisons: decisiveGroupIds.length,
    holdoutComparisons,
    distinctCaptures: captures.size,
    caseManifestRef: `manifest:learning-pass:${decisiveGroupIds.length}:${[...captures]
      .sort()
      .join(",")
      .length}`,
    byFamily,
    excludedByReason,
    effectiveDecisiveComparisons: roundWeight(effectiveDecisiveComparisons),
    effectiveHoldoutComparisons: roundWeight(effectiveHoldoutComparisons),
  };
}

function evidenceAgeMs(
  comparability: Record<string, unknown>,
  nowMs: number,
): number | null {
  const observedAt = boundedText(comparability.observedAt) ?? boundedText(comparability.recordedAt);
  if (observedAt) {
    const parsed = Date.parse(observedAt);
    return Number.isFinite(parsed) ? Math.max(0, nowMs - parsed) : null;
  }
  const observedAtMs = comparability.observedAtMs;
  return Number.isSafeInteger(observedAtMs) && Number(observedAtMs) > 0
    ? Math.max(0, nowMs - Number(observedAtMs))
    : null;
}

/**
 * Run 99 R33 (addendum 21 D11): the per-family gate dimensions. `delta` is the observed
 * positive-minus-negative member score of one comparison, and the observation time is what the
 * temporal drift split needs.
 */
function comparisonDelta(result: Record<string, unknown>): number | null {
  const members = Array.isArray(result.members) ? result.members : [];
  const scored = members
    .map((member) => ({
      score: Number((member as Record<string, unknown>)?.score),
      disposition: String((member as Record<string, unknown>)?.disposition ?? ""),
    }))
    .filter((row) => Number.isFinite(row.score));
  const positives = scored.filter((row) => row.disposition === "positive").map((row) => row.score);
  const negatives = scored.filter((row) => row.disposition === "negative").map((row) => row.score);
  if (positives.length === 0 || negatives.length === 0) return null;
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return mean(positives) - mean(negatives);
}

function comparisonObservedAtMs(
  comparability: Record<string, unknown>,
  nowMs: number,
  ageMs: number | null,
): number | null {
  if (ageMs !== null) return Math.max(0, nowMs - ageMs);
  const observedAtMs = comparability.observedAtMs;
  return Number.isSafeInteger(observedAtMs) && Number(observedAtMs) > 0
    ? Number(observedAtMs)
    : null;
}

export interface TrackBLearningPassInput {
  readonly requestId: string;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  /** Run 99 R33: the task family of the capture this candidate was derived from. */
  readonly taskTypeId?: string | null;
  readonly taxonomyVersion?: string | null;
  readonly candidateId: string;
  readonly routePackage: string;
  /** The finalized comparison the candidate was derived from, as Evaluation Core returned it. */
  readonly finalizedComparison: Readonly<Record<string, unknown>>;
  readonly finalizedComparisonReceipt: Readonly<Record<string, unknown>>;
  readonly safetyReceipt: Readonly<Record<string, unknown>>;
  readonly provenance: Readonly<Record<string, unknown>>;
  readonly identity: Readonly<{ scorerSetVersion: string; judgeEndpointId: string | null }>;
  readonly evidenceFloor?: Readonly<{
    minDecisiveComparisons: number;
    minHoldoutComparisons: number;
    minDistinctCaptures: number;
  }>;
  readonly guardrails?: Readonly<{ qualityMinDelta: number }>;
  readonly estimator?: Readonly<{ bootstrapSeed?: number; resamples?: number }>;
  /**
   * Run 98 R19: the predeclared promotion protocol the validation decides under. Callers pass the
   * effective policy; when omitted the pass declares `DEFAULT_PROMOTION_PROTOCOL` so a validation
   * is never taken without one.
   */
  readonly promotionProtocol?: Readonly<{
    protocolId: string;
    primaryMetricId: string;
    direction: "higher_is_better";
    minimumPracticalDelta: number;
    intervalLevel: number;
    resamples: number;
    bootstrapSeed: number;
    analysisMethod: "paired_cluster_bootstrap";
    selectionFamilySize: number;
    multiplicityAdjustment: "none" | "holm_bonferroni";
  }>;
  readonly evidenceMaxAgeMs?: number;
  /** Run 99 R33 D12: `evidenceHalfLifeDays` from the operator policy. */
  readonly evidenceHalfLifeDays?: number | null;
  readonly nowMs?: number;
  /** Promotion stays opt-in so a caller can record validation evidence without a pack. */
  readonly allowPromotion?: boolean;
  /** Compose the envelope the sidecar host expects (`{value, filePath, ...}`). */
  readonly envelope?: (capability: string, value: Record<string, unknown>) => Record<string, unknown>;
  /**
   * Run 98 R3: the packaged extension host externalizes a business result that exceeds the
   * inline cap (`evaluation:list-groups` on a live stage root answers with a durable-output
   * envelope). The caller supplies the host's own decoder so the pass reads the same list the
   * pipeline does; without it the pass silently counted zero decisive comparisons and refused
   * every candidate with `insufficient_evidence` (observed live on stage v86).
   */
  readonly decodeResult?: (
    extensionId: string,
    capability: string,
    raw: unknown,
  ) => unknown;
  /**
   * Run 98 R3: the same evidence-authority secret the derive call used. Without it the worker has
   * no authority to verify the durable comparison readback and safety receipts, and validation
   * fails closed with `verified durable comparison readback receipt required for validation`
   * (observed live on stage v83).
   */
  readonly evaluationAuthoritySecret?: string;
}

function defaultEnvelope(
  input: TrackBLearningPassInput,
  capability: string,
  value: Record<string, unknown>,
): Record<string, unknown> {
  return {
    requestId: `${input.requestId}:${capability}`,
    sessionId: input.requestId,
    protocolVersion: "1.1.0",
    channel: input.channel,
    scope: input.scope,
    authorizationEpoch: input.authorizationEpoch,
    capability,
    value,
  };
}

function decodeBusinessResult(
  result: unknown,
  extensionId: string,
  scopeId: string,
): Record<string, unknown> {
  const record = asRecord(result);
  if (!record) return {};
  const inner = asRecord(record.businessOutput);
  if (inner && record.durableLocator !== undefined) {
    const nested = asRecord((inner as Record<string, unknown>).value);
    return nested ?? inner;
  }
  const nested = asRecord(record.value);
  if (!("jobId" in record) && !("receipt" in record) && nested && extensionId && scopeId) {
    return nested;
  }
  return record;
}

/**
 * Runs one learning pass for one derived candidate. Throws for a programming error (missing
 * identity or evidence); the caller records a bounded degradation receipt in that case.
 */
export async function runTrackBLearningPass(
  runtime: TrackBLearningPassRuntime,
  input: TrackBLearningPassInput,
): Promise<Record<string, unknown>> {
  const candidateId = boundedText(input.candidateId);
  if (!candidateId) throw new Error("learning pass requires a derived candidate identity");
  const routePackage = boundedText(input.routePackage);
  if (!routePackage) throw new Error("learning pass requires the candidate route package");
  const scorerSetVersion = boundedText(input.identity?.scorerSetVersion);
  if (!scorerSetVersion) throw new Error("learning pass requires the scoring identity");
  const evaluationAuthoritySecret = boundedText(input.evaluationAuthoritySecret);
  if (!evaluationAuthoritySecret) {
    throw new Error("learning pass requires the evidence authority secret");
  }
  const envelope = input.envelope ?? ((capability, value) => defaultEnvelope(input, capability, value));
  const workerEnvelope = (capability: string, value: Record<string, unknown>) => ({
    ...envelope(capability, value),
    evaluationAuthoritySecret,
  });
  /**
   * Run 98 R3: the Knowledge Store reads `envelope.payload` (the worker reads
   * `envelope.value`), and it answers a bounded degradation receipt instead of throwing, so the
   * pass must both use the right field and verify the answer.
   */
  const storeEnvelope = (capability: string, payload: Record<string, unknown>) => ({
    ...envelope(capability, payload),
    payload,
  });
  const nowMs = input.nowMs ?? Date.now();
  const evidenceFloor = input.evidenceFloor ?? DEFAULT_LEARNING_EVIDENCE_FLOOR;
  const guardrails = input.guardrails ?? DEFAULT_LEARNING_GUARDRAILS;
  const promotionProtocol = { ...DEFAULT_PROMOTION_PROTOCOL, ...(input.promotionProtocol ?? {}) };

  const rawGroups = await runtime.invoke("evaluation-core", envelope("evaluation:list-groups", {}));
  const decodedGroups = input.decodeResult
    ? input.decodeResult("evaluation-core", "evaluation:list-groups", rawGroups)
    : Array.isArray(rawGroups)
      ? rawGroups
      : decodeBusinessResult(rawGroups, "evaluation-core", input.scope);
  const groups: TrackBLearningEvidenceGroup[] = Array.isArray(decodedGroups)
    ? (decodedGroups as TrackBLearningEvidenceGroup[])
    : Array.isArray(asRecord(decodedGroups)?.groups)
      ? ((asRecord(decodedGroups) as Record<string, unknown>).groups as TrackBLearningEvidenceGroup[])
      : [];
  const evidenceSummary = buildTrackBLearningEvidenceSummary({
    groups,
    routePackage,
    nowMs,
    evidenceMaxAgeMs: input.evidenceMaxAgeMs ?? 30 * 24 * 60 * 60 * 1_000,
    // Run 99 R33 D12: `evidenceHalfLifeDays` from the operator policy decays the effective counts.
    evidenceHalfLifeDays: input.evidenceHalfLifeDays ?? DEFAULT_EVIDENCE_HALF_LIFE_DAYS,
  });
  const holdout = asRecord(input.finalizedComparison.holdout);
  const holdoutCaseIds = Array.isArray(holdout?.caseIds)
    ? holdout.caseIds.filter((caseId): caseId is string => typeof caseId === "string" && caseId.length > 0)
    : [];

  const validation = decodeBusinessResult(
    await runtime.invoke(
      "knowledge-worker",
      workerEnvelope("knowledge:validate-candidate", {
        candidateId,
        scope: {
          routePackage,
          channel: input.channel,
          scopeId: input.scope,
          ...(boundedText(input.taskTypeId) ? { taskTypeId: boundedText(input.taskTypeId) } : {}),
          ...(boundedText(input.taxonomyVersion)
            ? { taxonomyVersion: boundedText(input.taxonomyVersion) }
            : {}),
        },
        identity: {
          scorerSetVersion,
          judgeEndpointId: input.identity.judgeEndpointId ?? null,
        },
        evaluation: {
          environment: "local-routing-evaluation",
          provenance: { ...input.provenance },
          finalizedComparison: { ...input.finalizedComparison },
          finalizedComparisonReceipt: { ...input.finalizedComparisonReceipt },
          safetyReceipt: { ...input.safetyReceipt },
        },
        holdoutCaseIds,
        evidenceSummary,
        evidenceFloor: { ...evidenceFloor },
        guardrails: { ...guardrails },
        // Run 98 R19: the protocol is declared before the holdout decision and the non-inferiority
        // margin is the quality guardrail bound the operator already configures.
        promotionProtocol: {
          ...promotionProtocol,
          nonInferiorityMargin: guardrails.qualityMinDelta,
        },
        estimator: {
          estimatorVersion: RUN98_LEARNING_ESTIMATOR_VERSION,
          bootstrapSeed: input.estimator?.bootstrapSeed ?? 0,
          resamples: input.estimator?.resamples ?? RUN98_LEARNING_DEFAULT_BOOTSTRAP_RESAMPLES,
        },
      }),
    ),
    "knowledge-worker",
    input.scope,
  );
  const receipt = asRecord(validation.receipt);
  const receiptId = boundedText(receipt?.receiptId);
  if (!receiptId || !receipt) {
    throw new Error("learning pass validation did not return a durable receipt");
  }
  const decision = boundedText(receipt.decision) ?? "insufficient_evidence";

  // The validation receipt is durable learning evidence even when the decision is
  // `insufficient_evidence` or `reject`; recording it is how the operator sees why learning
  // did not promote instead of seeing silence.
  const recordValidationReceipt = async (): Promise<Record<string, unknown>> => {
    const answer = await runtime.invoke(
      "knowledge-store",
      storeEnvelope("knowledge:record-learning", {
        record: {
          recordId: receiptId,
          kind: "validation_receipt",
          state: decision,
          scopeId: input.scope,
          identity: {
            scorerSetVersion,
            judgeEndpointId: input.identity.judgeEndpointId ?? null,
          },
          record: { ...receipt },
        },
      }),
    );
    const decoded = decodeBusinessResult(answer, "knowledge-store", input.scope);
    if (decoded.schemaVersion === "role-model.degradation-receipt.v1") {
      throw new Error(
        `knowledge store refused the validation receipt: ${String(decoded.reason ?? decoded.code ?? "unknown")}`,
      );
    }
    return decoded;
  };
  const validationRecord = await recordValidationReceipt();

  let packId: string | null = null;
  let promoted = false;
  if (
    validation.promotionEligible === true &&
    decision === "validate" &&
    input.allowPromotion !== false
  ) {
    const promotion = decodeBusinessResult(
      await runtime.invoke(
        "knowledge-worker",
        workerEnvelope("knowledge:promote-candidate", {
          candidateId,
          validationReceiptId: receiptId,
          baselinePackId: boundedText(receipt.baselineId) ?? undefined,
        }),
      ),
      "knowledge-worker",
      input.scope,
    );
    const packCandidate = asRecord(promotion.packCandidate);
    packId = boundedText(packCandidate?.packId);
    if (!packId || !packCandidate) {
      throw new Error("learning pass promotion did not return a pack candidate");
    }
    promoted = true;
    const packAnswer = await runtime.invoke(
      "knowledge-store",
      storeEnvelope("knowledge:record-learning", {
        record: {
          recordId: packId,
          kind: "pack",
          state: boundedText(packCandidate.status) ?? "validated",
          scopeId: input.scope,
          identity: {
            scorerSetVersion,
            judgeEndpointId: input.identity.judgeEndpointId ?? null,
          },
          record: { ...packCandidate },
        },
      }),
    );
    const decodedPack = decodeBusinessResult(packAnswer, "knowledge-store", input.scope);
    if (decodedPack.schemaVersion === "role-model.degradation-receipt.v1") {
      throw new Error(
        `knowledge store refused the pack record: ${String(decodedPack.reason ?? decodedPack.code ?? "unknown")}`,
      );
    }
  }

  return {
    schemaVersion: RUN98_LEARNING_PASS_SCHEMA,
    candidateId,
    routePackage,
    decision,
    validationReceiptId: receiptId,
    evidenceSummary,
    evidenceFloor: { ...evidenceFloor },
    guardrails: { ...guardrails },
    identity: {
      scorerSetVersion,
      judgeEndpointId: input.identity.judgeEndpointId ?? null,
    },
    packId,
    promoted,
    validationRecord: asRecord(validationRecord) ?? null,
    productionEffects: {
      providerCalls: 0,
      promptMutations: 0,
      routeMutations: 0,
      weightMutations: 0,
      activeProfileMutations: 0,
    },
  };
}
