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
