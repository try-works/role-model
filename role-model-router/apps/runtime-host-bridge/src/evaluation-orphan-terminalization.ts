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
}

export interface AbandonedEvaluationTerminalizationResult {
  readonly cancelled: boolean;
  readonly scope: string | null;
  readonly detail: string | null;
}

const MAX_REASON_CHARS = 512;
const MAX_DETAIL_CHARS = 360;

/**
 * Terminal statuses (or an unknown job) are a benign no-op: the give-up has already been recorded, and
 * re-reporting it as a failure would only add noise. Any other error that is not a scope mismatch is a real
 * failure and stops the attempt instead of being retried against every candidate scope.
 */
const BENIGN_TERMINAL = /(completed evaluation job cannot be cancelled|cannot be cancelled in its current state|evaluation job not found)/iu;
const SCOPE_MISMATCH = /scope binding mismatch/iu;

export async function terminalizeAbandonedEvaluation(
  input: AbandonedEvaluationTerminalizationInput,
): Promise<AbandonedEvaluationTerminalizationResult> {
  const scopes: string[] = [];
  const push = (value: unknown): void => {
    const text = typeof value === "string" ? value.trim() : "";
    if (text && !scopes.includes(text)) scopes.push(text);
  };
  push(input.entry.scope);
  push(input.operatorScope);

  const reason = `evaluation_unavailable: ${input.reason}`.slice(0, MAX_REASON_CHARS);
  let detail: string | null = null;
  for (const scope of scopes) {
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
      if (!SCOPE_MISMATCH.test(detail)) return { cancelled: false, scope, detail };
    }
  }
  return { cancelled: false, scope: null, detail };
}
