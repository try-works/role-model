/**
 * Run 97 replay automation view model.
 *
 * Turns the runtime's bounded replay-automation status payload into a display model
 * that never throws on partial or missing data, so the operator surface can always
 * render the loop's state, budget consumption, and the correct control action.
 */

export interface ReplayAutomationBudget {
  readonly window: string;
  readonly counterfactuals: number;
  readonly reservedCounterfactuals: number;
  readonly reservedDispatches: number;
  readonly dispatches: number;
  readonly counterfactualLimit: number;
  readonly dispatchLimit: number;
}

export interface ReplayAutomationView {
  readonly available: boolean;
  readonly ticks: number;
  readonly running: boolean;
  readonly paused: boolean;
  readonly lastOutcome: string;
  readonly lastError: string | null;
  readonly lastProcessedAtMs: number | null;
  readonly lastDispositions: number;
  readonly budget: ReplayAutomationBudget | null;
  /**
   * Run 100 addendum `evaluation-lease-wedge-repair.addendum-02` S1: what the loop's liveness sweeps did on
   * the last tick. `reconciled` completes a job whose comparison finalized; `stranded` is work nothing can
   * pick up any more; `reclaimed` is a stranded job the sweep terminalized after the grace.
   */
  readonly liveness: ReplayAutomationLiveness;
}

export interface ReplayAutomationLiveness {
  readonly expiredJobs: number;
  readonly resumedEvaluations: number;
  readonly reconciledEvaluations: number;
  readonly strandedEvaluations: number;
  readonly reclaimedEvaluations: number;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asCount = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;

const asText = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

export function normalizeReplayAutomationStatus(value: unknown): ReplayAutomationView {
  const record = asRecord(value);
  if (!record) {
    return {
      available: false,
      ticks: 0,
      running: false,
      paused: false,
      lastOutcome: "unknown",
      lastError: null,
      lastProcessedAtMs: null,
      lastDispositions: 0,
      budget: null,
      liveness: {
        expiredJobs: 0,
        resumedEvaluations: 0,
        reconciledEvaluations: 0,
        strandedEvaluations: 0,
        reclaimedEvaluations: 0,
      },
    };
  }
  const budgetRecord = asRecord(record.budget);
  const budget: ReplayAutomationBudget | null = budgetRecord
    ? {
        window: asText(budgetRecord.window, "unknown"),
        counterfactuals: asCount(budgetRecord.counterfactuals),
        reservedCounterfactuals: asCount(budgetRecord.reservedCounterfactuals),
        reservedDispatches: asCount(budgetRecord.reservedDispatches),
        dispatches: asCount(budgetRecord.dispatches),
        counterfactualLimit: asCount(budgetRecord.counterfactualLimit),
        dispatchLimit: asCount(budgetRecord.dispatchLimit),
      }
    : null;
  return {
    available: true,
    ticks: asCount(record.ticks),
    running: record.running === true,
    paused: record.paused === true,
    lastOutcome: asText(record.lastOutcome, "unknown"),
    lastError: typeof record.lastError === "string" && record.lastError ? record.lastError : null,
    lastProcessedAtMs:
      typeof record.lastProcessedAtMs === "number" && Number.isFinite(record.lastProcessedAtMs)
        ? record.lastProcessedAtMs
        : null,
    lastDispositions: asCount(record.lastDispositions),
    budget,
    liveness: {
      expiredJobs: asCount(record.lastExpiredJobs),
      resumedEvaluations: asCount(record.lastResumedEvaluations),
      reconciledEvaluations: asCount(record.lastReconciledEvaluations),
      strandedEvaluations: asCount(record.lastStrandedEvaluations),
      reclaimedEvaluations: asCount(record.lastReclaimedEvaluations),
    },
  };
}

export function formatReplayLiveness(view: ReplayAutomationView): string | null {
  if (!view.available) return null;
  const { liveness } = view;
  return [
    `sweeps: ${liveness.expiredJobs} expired`,
    `${liveness.resumedEvaluations} resumed`,
    `${liveness.reconciledEvaluations} reconciled`,
    `${liveness.strandedEvaluations} stranded`,
    `${liveness.reclaimedEvaluations} reclaimed`,
  ].join(" · ");
}

export function controlActionFor(view: ReplayAutomationView): "pause" | "resume" | null {
  if (!view.available) return null;
  return view.paused ? "resume" : "pause";
}

export function formatReplayBudget(view: ReplayAutomationView): string {
  if (!view.budget) return "replay automation unavailable";
  const { budget } = view;
  return [
    `${budget.counterfactuals}/${budget.counterfactualLimit} counterfactuals`,
    `${budget.dispatches}/${budget.dispatchLimit} dispatches`,
    `${budget.reservedDispatches} reserved`,
    `window ${budget.window}`,
  ].join(" · ");
}

export interface LearningSummaryView {
  readonly evaluation: {
    readonly jobs: number;
    readonly trials: number;
    readonly trialScores: number;
    readonly comparisonGroups: number;
  };
  readonly learning: {
    readonly trajectorySignalReports: number;
    readonly knowledgeCandidates: number;
  };
}

export function normalizeLearningSummary(value: unknown): LearningSummaryView {
  const record = asRecord(value);
  const evaluationRecord = asRecord(record?.evaluation);
  const learningRecord = asRecord(record?.learning);
  return {
    evaluation: {
      jobs: asCount(evaluationRecord?.jobs),
      trials: asCount(evaluationRecord?.trials),
      trialScores: asCount(evaluationRecord?.trialScores),
      comparisonGroups: asCount(evaluationRecord?.comparisonGroups),
    },
    learning: {
      trajectorySignalReports: asCount(learningRecord?.trajectorySignalReports),
      knowledgeCandidates: asCount(learningRecord?.knowledgeCandidates),
    },
  };
}

export function formatLearningSummary(view: LearningSummaryView): string {
  return [
    `${view.evaluation.jobs} evaluation job(s)`,
    `${view.evaluation.trials} trial(s)`,
    `${view.evaluation.comparisonGroups} group(s)`,
    `${view.learning.trajectorySignalReports} signal report(s)`,
    `${view.learning.knowledgeCandidates} candidate(s)`,
  ].join(" · ");
}
