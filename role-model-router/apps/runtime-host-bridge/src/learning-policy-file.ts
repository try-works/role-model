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
    readonly minDistinctCaptures: number;
    readonly evidenceMaxAgeDays: number;
    /**
     * Run 98 R10: judge configuration is resolved from the versioned policy (env vars remain an
     * explicit local override in the runtime composition).
     */
    readonly judgeMode: "identified" | "identity_blind";
    readonly judgeOrderPolicy: "source_first" | "dual_order";
    readonly judgeMeasureAgreement: boolean;
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
  minDistinctCaptures: 3,
  evidenceMaxAgeDays: 30,
  judgeMode: "identified",
  judgeOrderPolicy: "source_first",
  judgeMeasureAgreement: false,
});

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function readLearningPolicyFile(input: {
  readonly repoRoot: string;
  readonly channel: string;
  readonly scopeId?: string | null;
}): LearningPolicySnapshot | null {
  if (typeof input.repoRoot !== "string" || !input.repoRoot.trim()) return null;
  let parsed: Record<string, unknown>;
  try {
    const text = readFileSync(path.join(input.repoRoot, ACTIVATION_POLICY_RELATIVE_PATH), "utf8");
    parsed = asRecord(JSON.parse(text));
    if (parsed.schemaVersion !== ACTIVATION_POLICY_SCHEMA_VERSION) return null;
  } catch {
    return null;
  }
  const global = asRecord(parsed.global);
  const channels = asRecord(parsed.channels);
  const scopes = asRecord(parsed.scopes);
  const channelValues = asRecord(channels[input.channel]);
  const scopeValues = input.scopeId ? asRecord(scopes[String(input.scopeId)]) : {};
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
    minDistinctCaptures: Math.max(
      1,
      Math.round(finiteOr(merged.minDistinctCaptures, DEFAULT_EFFECTIVE.minDistinctCaptures)),
    ),
    evidenceMaxAgeDays: Math.max(
      1,
      finiteOr(merged.evidenceMaxAgeDays, DEFAULT_EFFECTIVE.evidenceMaxAgeDays),
    ),
    judgeMode: merged.judgeMode === "identity_blind" ? "identity_blind" : "identified",
    judgeOrderPolicy: merged.judgeOrderPolicy === "dual_order" ? "dual_order" : "source_first",
    judgeMeasureAgreement: merged.judgeMeasureAgreement === true,
  };
  return {
    policyVersion: Number.isSafeInteger(parsed.policyVersion) ? Number(parsed.policyVersion) : 1,
    digest: `sha256:${createHash("sha256").update(JSON.stringify(parsed)).digest("hex")}`,
    source: ACTIVATION_POLICY_RELATIVE_PATH,
    effective,
  };
}
