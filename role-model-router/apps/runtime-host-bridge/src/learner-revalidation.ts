/**
 * Live finding (isolated production-learning verification, 2026-10-15): in queue mode, a candidate whose
 * family evidence was too thin when it was derived has no driver afterwards.
 *
 * The chain that strands it:
 *  - `learner.promote` is offered exactly ONCE, from the derivation callback (`onDerivedCandidate`);
 *  - the durable job id is `learner.promote:<candidateId>`, so one candidate is one job forever;
 *  - the queue's own `offer` is `INSERT OR IGNORE ... ON CONFLICT DO NOTHING`, so re-offering an existing
 *    (completed or failed) job is a no-op rather than a fresh attempt;
 *  - and queue mode deliberately retires the fallback learner sweep
 *    (`learnerQueueAuthoritative` gates `learnFromUnconsumedCandidates`), so nothing else looks at it.
 *
 * Measured on the isolated store: 11 shadow candidates that comfortably cleared the family floor
 * (decisive 50-59 / development 23 / distinctCaptures 10, against floors of 3/1/3) held no promote job at
 * all, and 20 more held a terminal failure that predated the evidence it needed.
 *
 * The revival rule is deliberately EVIDENCE-CHANGE gated. Reviving every refusal would re-run the same
 * doomed comparison every tick forever, which is worse than doing nothing: it spends the worker's bounded
 * attempts on evidence that has not changed. A refusal is only worth a fresh attempt when a finalized
 * comparison for the candidate's OWN (routePackage x taskType) is NEWER than the receipt that refused it -
 * the one thing that can actually change the verdict.
 */

export interface RevalidatableRefusal {
  readonly candidateId: string;
  readonly routePackage?: string | null;
  readonly taskTypeId?: string | null;
  /** The decision the candidate's latest receipt recorded. */
  readonly receiptDecision: string;
  /** When that receipt was written, in epoch ms. */
  readonly receiptCreatedAtMs?: number | null;
}

export function learnerFamilyEvidenceKey(routePackage: string, taskTypeId: string): string {
  return `${routePackage}\u0000${taskTypeId}`;
}

/**
 * The candidates whose promotion is worth a fresh attempt: a previous NOT-YET refusal, a terminal
 * promotion job to revive, and finalized evidence for the candidate's own family newer than that refusal.
 *
 * Bounded and deterministic: candidates are considered in the order given and at most `limit` are chosen,
 * so one pass can never stampede the queue.
 */
export function selectRevalidatableRefusals(input: {
  readonly candidates: readonly RevalidatableRefusal[];
  /** Newest finalized-comparison time per (routePackage x taskType), from the durable group set. */
  readonly newestEvidenceAtMs: ReadonlyMap<string, number>;
  /** True when this candidate already holds a terminal promotion job that a revive would reopen. */
  readonly hasTerminalPromotionJob: (candidateId: string) => boolean;
  readonly limit?: number;
}): readonly string[] {
  const limit =
    Number.isSafeInteger(input.limit) && (input.limit ?? 0) > 0 ? Number(input.limit) : 5;
  const selected: string[] = [];
  for (const candidate of input.candidates) {
    if (selected.length >= limit) break;
    if (!candidate || typeof candidate.candidateId !== "string" || !candidate.candidateId) continue;
    // Only a NOT-YET verdict is re-openable. `validate` is done; `reject` is a terminal decision about the
    // candidate itself, not a statement that its evidence was insufficient.
    if (candidate.receiptDecision !== "insufficient_evidence") continue;
    const routePackage =
      typeof candidate.routePackage === "string" ? candidate.routePackage.trim() : "";
    const taskTypeId = typeof candidate.taskTypeId === "string" ? candidate.taskTypeId.trim() : "";
    // Without the family identity there is nothing to compare the refusal against.
    if (!routePackage || !taskTypeId) continue;
    const newest = input.newestEvidenceAtMs.get(learnerFamilyEvidenceKey(routePackage, taskTypeId));
    if (!Number.isFinite(newest)) continue;
    const receiptAt =
      typeof candidate.receiptCreatedAtMs === "number" &&
      Number.isFinite(candidate.receiptCreatedAtMs)
        ? candidate.receiptCreatedAtMs
        : null;
    // Strictly newer: evidence that is already covered by the refusal cannot change its verdict.
    if (receiptAt === null || !(Number(newest) > receiptAt)) continue;
    if (!input.hasTerminalPromotionJob(candidate.candidateId)) continue;
    selected.push(candidate.candidateId);
  }
  return selected;
}
