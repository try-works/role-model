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

export const DEFAULT_LEARNING_GUARDRAILS = Object.freeze({ qualityMinDelta: -0.02 });

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
}): {
  readonly decisiveComparisons: number;
  readonly holdoutComparisons: number;
  readonly distinctCaptures: number;
  readonly caseManifestRef: string;
} {
  const decisiveGroupIds: string[] = [];
  const captures = new Set<string>();
  let holdoutComparisons = 0;
  for (const group of input.groups) {
    const result = asRecord(group.result);
    const comparability = asRecord(group.comparability ?? result?.comparability);
    const holdout = asRecord(group.holdout ?? result?.holdout);
    const groupId = boundedText(group.groupId ?? result?.groupId);
    if (!result || !comparability || !groupId) continue;
    if (result.status !== "finalized") continue;
    if (!DECISIVE_OUTCOMES.has(String(result.outcome ?? ""))) continue;
    // The candidate's route package must be the counterfactual or the source of the
    // comparison: evidence about a different package can never validate this candidate.
    const involved =
      String(comparability.counterfactualCandidateRef ?? "") === input.routePackage ||
      String(comparability.sourceCandidateRef ?? "") === input.routePackage;
    if (!involved) continue;
    const ageMs = evidenceAgeMs(comparability, input.nowMs);
    if (ageMs !== null && ageMs > input.evidenceMaxAgeMs) continue;
    decisiveGroupIds.push(groupId);
    const captureRef =
      boundedText(comparability.inputRef) ??
      boundedText(comparability.forkRef) ??
      boundedText(comparability.sourceEvidenceRef) ??
      groupId;
    captures.add(captureRef);
    const caseIds = Array.isArray(holdout?.caseIds) ? holdout.caseIds : [];
    if (caseIds.length > 0) holdoutComparisons += 1;
  }
  return {
    decisiveComparisons: decisiveGroupIds.length,
    holdoutComparisons,
    distinctCaptures: captures.size,
    caseManifestRef: `manifest:learning-pass:${decisiveGroupIds.length}:${[...captures]
      .sort()
      .join(",")
      .length}`,
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

export interface TrackBLearningPassInput {
  readonly requestId: string;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
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
  readonly evidenceMaxAgeMs?: number;
  readonly nowMs?: number;
  /** Promotion stays opt-in so a caller can record validation evidence without a pack. */
  readonly allowPromotion?: boolean;
  /** Compose the envelope the sidecar host expects (`{value, filePath, ...}`). */
  readonly envelope?: (capability: string, value: Record<string, unknown>) => Record<string, unknown>;
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

  const rawGroups = await runtime.invoke("evaluation-core", envelope("evaluation:list-groups", {}));
  const groups: TrackBLearningEvidenceGroup[] = Array.isArray(rawGroups)
    ? (rawGroups as TrackBLearningEvidenceGroup[])
    : [];
  const evidenceSummary = buildTrackBLearningEvidenceSummary({
    groups,
    routePackage,
    nowMs,
    evidenceMaxAgeMs: input.evidenceMaxAgeMs ?? 30 * 24 * 60 * 60 * 1_000,
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
        scope: { routePackage, channel: input.channel, scopeId: input.scope },
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
