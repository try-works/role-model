/**
 * Run 100 addendum `00-requirements.evaluation-lease-wedge-repair.addendum-02` S3 (operator report
 * 2026-09-23: "18 evals have been stuck in flight for hours").
 *
 * When a supervised-replay resume entry reaches its attempt cap the host already fails the *replay* job
 * (`replay:fail-job`, run 98 addendum 34 S5), but the *evaluation* job behind the same handoff was left
 * non-terminal. Because the supervising session that held its lease was gone, the row carried NULL lease
 * fields: `evaluation:claim-job` could not take it, the stranded sweep does not treat it as stranded while
 * its trials are non-terminal, and `evaluation:reconcile-jobs` has no production caller. The row therefore
 * stayed "in flight" forever.
 *
 * This helper closes the give-up path: an abandoned handoff terminalizes its evaluation job with the
 * recorded reason, so a retry cap can never leave an unreclaimable row behind. It is deliberately small and
 * invoke-injected so the behaviour is testable without the runtime.
 */

export interface AbandonedEvaluationTerminalizationInput {
  readonly entry: {
    readonly replayJobId: string;
    readonly evaluationJobId: string;
    /** The scope recorded on the handoff, when the entry carries one (older entries do not). */
    readonly scope?: string | null;
  };
  readonly channel: string;
  /** The operator scope the host itself runs under - the fallback and usually the right one. */
  readonly operatorScope: string;
  /** The reason already recorded on the abandoned resume entry. */
  readonly reason: string;
  readonly invoke: (
    capability: string,
    value: Readonly<Record<string, unknown>>,
    scope: string,
  ) => Promise<unknown>;
  /**
   * Run 100 addendum 28 §2: a sound, quiet existence check per candidate scope. `evaluation:get-job` answers
   * `null` for a missing id without throwing, so a stale id can be recognised without paying for a cancel that
   * can only fail — and without the host bridge logging `invoke-failed` for it. `false` skips the scope, `true`
   * cancels there, and `null` means "unknown": the previous behaviour, so a caller that cannot answer keeps
   * the old path exactly.
   */
  readonly jobExists?: (scope: string) => Promise<boolean | null>;
}

export interface AbandonedEvaluationTerminalizationResult {
  readonly cancelled: boolean;
  readonly scope: string | null;
  readonly detail: string | null;
  /**
   * Run 100 addendum 16 item 8d: the job id exists in none of the candidate scopes, so there is nothing to
   * terminalize. The delegated census measured 305 of 321 target ids absent from the live evaluation store;
   * treating that as a refusal produced hundreds of self-defeating log lines per window. Callers should not
   * report a benign result as a failure.
   */
  readonly benign?: boolean;
}

/**
 * Run 100 addendum 16 item 8d (delegated census, 2026-09-25): Evaluation Core's `evaluation:cancel-job`
 * validates its reason against its own bound of 256 characters
 * (`extensions/evaluation-core/index.mjs` `MAX_REASON_CHARS = 256`). This caller truncated to 512, so any
 * give-up carrying a longer reason was refused outright with "bounded cancellation reason required" — 59
 * such refusals in the observed build windows — and the abandoned evaluation job was never terminalized.
 * The caller now respects the extension's bound instead of its own.
 */
const MAX_REASON_CHARS = 256;
const MAX_DETAIL_CHARS = 360;

/**
 * Terminal statuses (or an unknown job) are a benign no-op: the give-up has already been recorded, and
 * re-reporting it as a failure would only add noise. Any other error that is not a scope mismatch is a real
 * failure and stops the attempt instead of being retried against every candidate scope.
 *
 * "evaluation job not found" is deliberately NOT in this set: it is what the *wrong scope* answers, and the
 * capture-scope rows live under `runtime:714f4a87…` while this pass is handed the operator scope. Treating it
 * as benign stopped the fallback at the first candidate and left the row untouched (78 live log lines
 * targeted the operator scope). It is handled as scope-scoped below and is benign only once every candidate
 * scope has answered it.
 */
const BENIGN_TERMINAL = /(completed evaluation job cannot be cancelled|cannot be cancelled in its current state)/iu;
const JOB_NOT_FOUND = /evaluation job not found/iu;
const SCOPE_MISMATCH = /scope binding mismatch/iu;

/**
 * Run 100 addendum 27 §2 residual: the terminalization pass revisits the same resume entries on every cycle,
 * so an id that exists in no candidate scope was re-invoked — and re-logged by the host bridge as
 * `invoke-failed … evaluation job not found` — tens of times a minute. Within one process the answer cannot
 * change, so the ids found absent are remembered and the invoke is skipped. Bounded, oldest-first, so a
 * long-lived process cannot grow without limit.
 */
const ABSENT_EVALUATION_JOB_ID_LIMIT = 4_096;
const absentEvaluationJobIds = new Set<string>();

function rememberAbsentEvaluationJobId(evaluationJobId: string): void {
  if (absentEvaluationJobIds.size >= ABSENT_EVALUATION_JOB_ID_LIMIT) {
    const oldest = absentEvaluationJobIds.values().next().value;
    if (oldest !== undefined) absentEvaluationJobIds.delete(oldest);
  }
  absentEvaluationJobIds.add(evaluationJobId);
}

export async function terminalizeAbandonedEvaluation(
  input: AbandonedEvaluationTerminalizationInput,
): Promise<AbandonedEvaluationTerminalizationResult> {
  const evaluationJobId =
    typeof input.entry.evaluationJobId === "string" ? input.entry.evaluationJobId.trim() : "";
  if (evaluationJobId && absentEvaluationJobIds.has(evaluationJobId)) {
    return {
      cancelled: false,
      scope: null,
      detail: "evaluation job not found in any candidate scope (remembered)",
      benign: true,
    };
  }
  const scopes: string[] = [];
  const push = (value: unknown): void => {
    const text = typeof value === "string" ? value.trim() : "";
    if (text && !scopes.includes(text)) scopes.push(text);
  };
  push(input.entry.scope);
  push(input.operatorScope);

  const reason = `evaluation_unavailable: ${input.reason}`.slice(0, MAX_REASON_CHARS);
  let detail: string | null = null;
  let attempted = 0;
  for (const scope of scopes) {
    /**
     * Run 100 addendum 28 §2: skip a scope the caller can prove does not hold the row. This is what removes the
     * measured `invoke-failed … evaluation job not found` stream (~11 lines/min) for the 305-of-321 stale ids,
     * because a *successful* `evaluation:get-job` answering `null` costs nothing to log.
     */
    if (input.jobExists) {
      const exists = await input.jobExists(scope).catch(() => null);
      if (exists === false) continue;
    }
    attempted += 1;
    try {
      await input.invoke(
        "evaluation:cancel-job",
        { jobId: input.entry.evaluationJobId, reason },
        scope,
      );
      return { cancelled: true, scope, detail: null };
    } catch (error) {
      detail = String((error as { message?: unknown })?.message ?? error).slice(0, MAX_DETAIL_CHARS);
      if (BENIGN_TERMINAL.test(detail)) return { cancelled: false, scope, detail };
      if (JOB_NOT_FOUND.test(detail)) continue;
      if (!SCOPE_MISMATCH.test(detail)) return { cancelled: false, scope, detail };
    }
  }
  /**
   * Every candidate scope was tried and each answered "evaluation job not found": the id is stale (never
   * handed off, or aged out of the store), so there is nothing to cancel. Benign, and deliberately distinct
   * from a scope mismatch (which is retried) and from a real failure (which is reported).
   */
  if (detail !== null && JOB_NOT_FOUND.test(detail)) {
    if (evaluationJobId) rememberAbsentEvaluationJobId(evaluationJobId);
    return { cancelled: false, scope: null, detail, benign: true };
  }
  /**
   * Every candidate scope reported the row absent before any invoke: the id is stale and nothing was paid for.
   * Same benign class as the not-found branch, with a detail that says the check (not the cancel) decided it.
   */
  if (attempted === 0) {
    if (evaluationJobId) rememberAbsentEvaluationJobId(evaluationJobId);
    return {
      cancelled: false,
      scope: null,
      detail: "evaluation job not found in any candidate scope (existence check)",
      benign: true,
    };
  }
  return { cancelled: false, scope: null, detail };
}
