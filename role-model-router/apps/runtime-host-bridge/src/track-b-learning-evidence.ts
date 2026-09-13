/**
 * Run 97 learning-evidence selection.
 *
 * The durable evaluation comparison is the authority on which trials were positive
 * and which were negative. The shadow pipeline previously re-derived its knowledge
 * gate from an in-memory re-score, so a comparison the evaluation store had already
 * decided as `candidate` could still be refused as
 * `insufficient_comparable_evidence`, and a learning step that degraded threw away
 * the whole replay instead of recording a bounded refusal. Both behaviours are
 * corrected here so a completed replay stays complete and only learning degrades.
 */

export interface TrackBLearningEvidenceRow {
  readonly trialId: string;
  readonly scoreId: string;
  readonly score: number;
  readonly evidenceRef: string;
}

export interface TrackBLearningRolloutLike {
  readonly trialId: string;
  readonly score: number;
  readonly scoreId?: string;
  readonly evidenceRef?: string;
}

interface DispositionedEvidenceRow extends TrackBLearningEvidenceRow {
  readonly disposition: "positive" | "negative";
}

const boundedString = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value ? value : fallback;

/**
 * Join the durable comparison member dispositions to the rollout evidence references
 * the knowledge boundary requires. Comparisons without dispositions keep the bounded
 * score split used before this contract existed.
 */
export function selectTrackBLearningEvidence(input: {
  readonly members: readonly Record<string, unknown>[];
  readonly rollouts: readonly TrackBLearningRolloutLike[];
}): {
  readonly positive: readonly TrackBLearningEvidenceRow[];
  readonly negative: readonly TrackBLearningEvidenceRow[];
} {
  const rolloutByTrialId = new Map(input.rollouts.map((row) => [row.trialId, row]));
  const dispositioned = input.members.filter(
    (member) => member.disposition === "positive" || member.disposition === "negative",
  );
  if (dispositioned.length > 0) {
    const rows: DispositionedEvidenceRow[] = [];
    for (const member of dispositioned) {
      const trialId = boundedString(member.trialId);
      const rollout = trialId ? rolloutByTrialId.get(trialId) : undefined;
      const evidenceRef = boundedString(rollout?.evidenceRef);
      const score = Number(member.score);
      if (!trialId || !evidenceRef || !Number.isFinite(score)) continue;
      rows.push({
        trialId,
        scoreId: boundedString(member.scoreId, boundedString(rollout?.scoreId)),
        score,
        evidenceRef,
        disposition: member.disposition as "positive" | "negative",
      });
    }
    return {
      positive: rows.filter((row) => row.disposition === "positive"),
      negative: rows.filter((row) => row.disposition === "negative"),
    };
  }
  const fallback: TrackBLearningEvidenceRow[] = input.rollouts.flatMap((rollout) => {
    const evidenceRef = boundedString(rollout.evidenceRef);
    if (!evidenceRef || !Number.isFinite(rollout.score)) return [];
    return [
      {
        trialId: rollout.trialId,
        scoreId: boundedString(rollout.scoreId),
        score: rollout.score,
        evidenceRef,
      },
    ];
  });
  return {
    positive: fallback.filter((row) => row.score === 1),
    negative: fallback.filter((row) => row.score === 0),
  };
}

/**
 * A learning step that cannot run must not fail the replay or its evaluation. The
 * refusal is bounded, names the failing capability, and stays metadata-only.
 */
export function boundedTrackBLearningRefusal(
  capability: string,
  error: unknown,
): {
  readonly id: null;
  readonly state: "learning_degraded";
  readonly capability: string;
  readonly refusalCode: "R14_LEARNING_DEGRADED";
  readonly reason: string;
} {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");
  return {
    id: null,
    state: "learning_degraded",
    capability,
    refusalCode: "R14_LEARNING_DEGRADED",
    reason: (message || "learning step failed").slice(0, 240),
  };
}

export interface TrackBFinalizedLearningLineageRow {
  readonly trialId: string;
  readonly scoreId: string;
  readonly score: number;
  readonly confidence: number;
}

export interface TrackBFinalizedLearningCapability {
  readonly learningCapable: boolean;
  readonly finalizedEvaluation: {
    readonly groupId: string;
    readonly status: "finalized";
    readonly outcome: "candidate";
    readonly members: readonly TrackBFinalizedLearningLineageRow[];
  } | null;
  readonly learningEvidence: {
    readonly schemaVersion: "role-model.finalized-evaluation-signal.v1";
    readonly groupId: string;
    readonly outcome: "candidate";
    readonly trialScoreRefs: readonly TrackBFinalizedLearningLineageRow[];
  } | null;
}

const withheldLearningCapability: TrackBFinalizedLearningCapability = {
  learningCapable: false,
  finalizedEvaluation: null,
  learningEvidence: null,
};

/**
 * Derive the learning-capability claim the knowledge boundary demands.
 *
 * Canonical guidance (`07_knowledge_store_and_knowledge_worker.md`) accepts only
 * immutable `finalized` rollout groups whose members are comparable under the
 * recorded policy and whose scorer provenance is complete. The marker therefore
 * has to be derived from the durable comparison readback joined to the evidence
 * rows actually handed to the consumer: membership comes from the comparison, the
 * trial/score lineage is completed from the selected rows, and anything incomplete
 * withholds the claim instead of asserting it.
 */
export function deriveTrackBLearningCapability(input: {
  readonly comparison: {
    readonly groupId?: unknown;
    readonly status?: unknown;
    readonly outcome?: unknown;
  };
  readonly members: readonly Record<string, unknown>[];
  readonly positive: readonly TrackBLearningEvidenceRow[];
  readonly negative: readonly TrackBLearningEvidenceRow[];
}): TrackBFinalizedLearningCapability {
  if (input.comparison?.status !== "finalized") return withheldLearningCapability;
  if (input.comparison?.outcome !== "candidate") return withheldLearningCapability;
  const groupId = boundedString(input.comparison?.groupId);
  if (!groupId) return withheldLearningCapability;
  if (!input.positive.length || !input.negative.length) return withheldLearningCapability;

  const selected = [...input.positive, ...input.negative];
  const selectedByTrialId = new Map<string, TrackBLearningEvidenceRow>();
  for (const row of selected) {
    const trialId = boundedString(row?.trialId);
    const scoreId = boundedString(row?.scoreId);
    if (!trialId || !scoreId || !Number.isFinite(row?.score)) {
      return withheldLearningCapability;
    }
    selectedByTrialId.set(trialId, { ...row, trialId, scoreId });
  }

  const lineage: TrackBFinalizedLearningLineageRow[] = [];
  for (const member of input.members) {
    const trialId = boundedString(member?.trialId);
    if (!trialId) return withheldLearningCapability;
    const scoreId = boundedString(member?.scoreId, selectedByTrialId.get(trialId)?.scoreId ?? "");
    if (!scoreId) return withheldLearningCapability;
    const rawScore = Number(member?.score);
    const score = Number.isFinite(rawScore)
      ? rawScore
      : Number(selectedByTrialId.get(trialId)?.score);
    if (!Number.isFinite(score)) return withheldLearningCapability;
    const rawConfidence = Number(member?.confidence);
    lineage.push({
      trialId,
      scoreId,
      score,
      confidence: Number.isFinite(rawConfidence) && rawConfidence > 0 ? rawConfidence : 1,
    });
  }
  if (!lineage.length) return withheldLearningCapability;
  const lineageKeys = new Set(lineage.map((row) => `${row.trialId}\u0000${row.scoreId}`));
  if (
    selected.some(
      (row) => !lineageKeys.has(`${boundedString(row?.trialId)}\u0000${boundedString(row?.scoreId)}`),
    )
  ) {
    return withheldLearningCapability;
  }

  return {
    learningCapable: true,
    finalizedEvaluation: {
      groupId,
      status: "finalized",
      outcome: "candidate",
      members: lineage,
    },
    learningEvidence: {
      schemaVersion: "role-model.finalized-evaluation-signal.v1",
      groupId,
      outcome: "candidate",
      trialScoreRefs: lineage,
    },
  };
}
