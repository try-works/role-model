/**
 * Run 108 follow-up (the sibling fabricated zero): the FAIL-CLOSED rule for the evaluation reconcile
 * readback the CLI's sweep operations answer with.
 *
 * The tick counts the reconcile pass's own `stranded` array and SETS it on
 * `role-model.replay.queue.stranded` (track-b-auto-replay-runtime.ts:1006-1025), so the shape this
 * readback answers with IS a metric observation.
 *
 * The producer's `evaluation:reconcile-jobs` capability normally answers a record. It can also answer
 * nothing usable - an absent answer, or one of the non-record shapes a capability boundary produces
 * (the transfer-marker class this repository already decodes elsewhere, a scalar, an array). The
 * pre-fix fallback turned every one of those into `{ scanned: 0, completed: [], stranded: [], reclaimed: [] }`,
 * the empty-sweep literal, which the tick cannot tell apart from a real sweep that found nothing
 * stranded: a FABRICATED ZERO, the same defect class the no-runtime guard beside it removes.
 *
 * `null` is the tick's own "not authoritative" signal (the contract documented at the consumer): the
 * sweep block is skipped and no depth is recorded for this tick, so the last genuine observation - or
 * nothing at all - survives instead of a zero nothing measured.
 */
export function reconcileSweepRecordOf(record: unknown): Record<string, unknown> | null {
  return record && typeof record === "object" && !Array.isArray(record)
    ? (record as Record<string, unknown>)
    : null;
}
