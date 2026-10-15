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
 * Measured split of the 51 stranded candidates: 20 held a TERMINAL promotion job (a plain `offer` cannot
 * reopen those, because the queue inserts with ON CONFLICT DO NOTHING - they need a revive) and 31 held NO
 * job at all (nothing was ever offered, so they need a fresh offer). The two populations need different
 * actions, so the selector names which one applies.
 *
 * Both are deliberately EVIDENCE-CHANGE gated. Re-driving every refusal would re-run the same doomed
 * comparison every tick forever, which is worse than doing nothing: it spends the worker's bounded attempts
 * on evidence that has not changed. A refusal is only worth a fresh attempt when a finalized comparison for
 * the candidate's OWN (routePackage x taskType) is NEWER than the receipt that refused it - the one thing
 * that can actually change the verdict.
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
 * Live finding (isolated production-learning verification, 2026-10-15): a producer that reads only the newest
 * page repeats the very defect class this run has already fixed twice. Measured on the isolated store: of 51
 * stranded shadow candidates, only 21 sit inside the newest 64 - a single no-cursor listing would silently
 * MISS 30 of them, and the pass would report success while most stranded work was never seen.
 *
 * The walk therefore pages with the listing's own cursor until a page runs short or a bound is reached, and it
 * never visits the same candidate twice.
 */
export async function collectStrandedCandidates(input: {
  readonly readPage: (cursor: {
    readonly afterCreatedAtMs: number;
    readonly afterCandidateId: string;
  } | null) => Promise<readonly Record<string, unknown>[]>;
  readonly pageSize: number;
  readonly maxPages?: number;
}): Promise<readonly Record<string, unknown>[]> {
  const maxPages =
    Number.isSafeInteger(input.maxPages) && (input.maxPages ?? 0) > 0 ? Number(input.maxPages) : 5;
  const collected: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  let cursor: { afterCreatedAtMs: number; afterCandidateId: string } | null = null;
  for (let page = 0; page < maxPages; page += 1) {
    const rows = await input.readPage(cursor);
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const candidateId = typeof row.candidateId === "string" ? row.candidateId : "";
      if (!candidateId || seen.has(candidateId)) continue;
      seen.add(candidateId);
      collected.push(row);
    }
    // A short page means the listing is exhausted; anything else could walk forever.
    if (rows.length < input.pageSize) break;
    const last = rows[rows.length - 1];
    const afterCandidateId =
      last && typeof last.candidateId === "string" ? last.candidateId : "";
    const afterCreatedAtMs =
      last && Number.isSafeInteger(last.createdAtMs) ? Number(last.createdAtMs) : null;
    if (!afterCandidateId || afterCreatedAtMs === null) break;
    cursor = { afterCreatedAtMs, afterCandidateId };
  }
  return collected;
}

export interface LearnerRevalidationSummary {
  readonly examined: number;
  readonly offered: number;
  readonly revived: number;
  readonly refused: number;
  readonly lastError?: string;
}

/**
 * The missing driver for queue mode: take the candidates the selector marks, and route each to the action its
 * own job state calls for. An `offer` is a no-op for a candidate that already holds a terminal job (the queue
 * inserts with ON CONFLICT DO NOTHING), so those must be revived instead - the two actions are not
 * interchangeable, which is exactly why the selector names one.
 *
 * Bounded and never fatal: a refused or throwing action is counted and reported so the tick continues, and the
 * pass fabricates no verdict - it only re-drives validation, whose gates then decide for themselves.
 */
export async function runLearnerRevalidationPass(input: {
  readonly candidates: readonly RevalidatableRefusal[];
  readonly newestEvidenceAtMs: ReadonlyMap<string, number>;
  readonly promotionJobState: (candidateId: string) => string | null;
  readonly offer: (job: { readonly candidateId: string }) => Promise<{
    readonly enqueued: boolean;
    readonly reason?: string;
  }>;
  readonly revive: (candidateId: string) => Promise<{ readonly ok: boolean; readonly reason?: string }>;
  readonly limit?: number;
}): Promise<LearnerRevalidationSummary> {
  const selected = selectRevalidatableRefusals({
    candidates: input.candidates,
    newestEvidenceAtMs: input.newestEvidenceAtMs,
    promotionJobState: input.promotionJobState,
    ...(input.limit === undefined ? {} : { limit: input.limit }),
  });
  let offered = 0;
  let revived = 0;
  let refused = 0;
  let lastError: string | undefined;
  for (const entry of selected) {
    try {
      if (entry.action === "offer") {
        const result = await input.offer({ candidateId: entry.candidateId });
        if (result?.enqueued) offered += 1;
        else refused += 1;
      } else {
        const result = await input.revive(entry.candidateId);
        if (result?.ok) revived += 1;
        else refused += 1;
      }
    } catch (error) {
      // A refused action is a fact about the queue, not a reason to fail the whole tick.
      refused += 1;
      lastError = String((error as { message?: unknown })?.message ?? error).slice(0, 200);
    }
  }
  return {
    examined: input.candidates.length,
    offered,
    revived,
    refused,
    ...(lastError ? { lastError } : {}),
  };
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
  /**
   * The candidate's current promotion job state, or null when it has no job.
   * "pending"/"processing" is work already in flight and must be left alone; a terminal
   * state ("completed"/"failed") is what a revive can reopen; null means nothing was ever offered.
   */
  readonly promotionJobState: (candidateId: string) => string | null;
  readonly limit?: number;
}): readonly { readonly candidateId: string; readonly action: "offer" | "revive" }[] {
  const limit =
    Number.isSafeInteger(input.limit) && (input.limit ?? 0) > 0 ? Number(input.limit) : 5;
  const selected: { candidateId: string; action: "offer" | "revive" }[] = [];
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
    const jobState = input.promotionJobState(candidate.candidateId);
    // Work already in flight is left alone; it will produce its own verdict.
    if (jobState === "pending" || jobState === "processing") continue;
    selected.push({
      candidateId: candidate.candidateId,
      action: jobState === null ? "offer" : "revive",
    });
  }
  return selected;
}
