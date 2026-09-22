import { describe, expect, test } from "vitest";

import {
  controlActionFor,
  formatLearningSummary,
  formatReplayBudget,
  formatReplayLiveness,
  normalizeLearningSummary,
  normalizeReplayAutomationStatus,
} from "./replay-status";

describe("run97 replay automation view model", () => {
  test("normalizes a live status payload", () => {
    const view = normalizeReplayAutomationStatus({
      ticks: 19,
      running: false,
      paused: false,
      lastOutcome: "ok",
      lastError: null,
      lastProcessedAtMs: 1789196244218,
      budget: {
        window: "2026-09-12",
        counterfactuals: 3,
        reservedCounterfactuals: 1,
        reservedDispatches: 2,
        dispatches: 7,
        counterfactualLimit: 100,
        dispatchLimit: 300,
      },
      lastDispositions: 2,
    });
    expect(view.available).toBe(true);
    expect(view.paused).toBe(false);
    expect(view.ticks).toBe(19);
    expect(view.lastOutcome).toBe("ok");
    expect(view.budget).toMatchObject({
      window: "2026-09-12",
      counterfactuals: 3,
      dispatches: 7,
      dispatchLimit: 300,
    });
  });

  test("reports an unavailable loop without throwing", () => {
    const view = normalizeReplayAutomationStatus(null);
    expect(view.available).toBe(false);
    expect(view.paused).toBe(false);
    expect(view.ticks).toBe(0);
    expect(view.budget).toBeNull();
    expect(controlActionFor(view)).toBeNull();
  });

  test("control action follows the paused state", () => {
    const running = normalizeReplayAutomationStatus({ paused: false, ticks: 1 });
    const paused = normalizeReplayAutomationStatus({ paused: true, ticks: 1 });
    expect(controlActionFor(running)).toBe("pause");
    expect(controlActionFor(paused)).toBe("resume");
  });

  test("budget summary stays readable and bounded", () => {
    const view = normalizeReplayAutomationStatus({
      ticks: 1,
      budget: {
        window: "2026-09-12",
        counterfactuals: 3,
        reservedCounterfactuals: 1,
        reservedDispatches: 2,
        dispatches: 7,
        counterfactualLimit: 100,
        dispatchLimit: 300,
      },
    });
    expect(formatReplayBudget(view)).toBe(
      "3/100 counterfactuals · 7/300 dispatches · 2 reserved · window 2026-09-12",
    );
    expect(formatReplayBudget(normalizeReplayAutomationStatus(null))).toBe(
      "replay automation unavailable",
    );
  });

  /**
   * Run 100 addendum `00-requirements.evaluation-lease-wedge-repair.addendum-02` S1: the liveness sweeps
   * (expire stale replay jobs, resume interrupted evaluations, reconcile non-terminal evaluation jobs) run
   * every tick and their counts belong on the operator surface — a reconcile that strands work must be
   * visible, not discovered by eye days later.
   */
  test("run100h surfaces the liveness sweep counters", () => {
    const view = normalizeReplayAutomationStatus({
      ticks: 3,
      lastOutcome: "ok",
      lastExpiredJobs: 1,
      lastResumedEvaluations: 2,
      lastReconciledEvaluations: 3,
      lastStrandedEvaluations: 4,
      lastReclaimedEvaluations: 5,
    });
    expect(view.liveness).toMatchObject({
      expiredJobs: 1,
      resumedEvaluations: 2,
      reconciledEvaluations: 3,
      strandedEvaluations: 4,
      reclaimedEvaluations: 5,
    });
    expect(formatReplayLiveness(view)).toBe(
      "sweeps: 1 expired · 2 resumed · 3 reconciled · 4 stranded · 5 reclaimed",
    );
    // A payload from a build without the counters must read as zeros, and an unavailable loop has no line.
    const older = normalizeReplayAutomationStatus({ ticks: 1, lastOutcome: "ok" });
    expect(older.liveness).toMatchObject({ reconciledEvaluations: 0, strandedEvaluations: 0 });
    expect(formatReplayLiveness(normalizeReplayAutomationStatus(null))).toBeNull();
  });
});

describe("run97 learning summary view model", () => {
  test("normalizes durable evaluation and learner counters", () => {
    const view = normalizeLearningSummary({
      evaluation: { jobs: 2, trials: 3, trialScores: 2, comparisonGroups: 1 },
      learning: { trajectorySignalReports: 4, knowledgeCandidates: 5 },
    });
    expect(formatLearningSummary(view)).toBe(
      "2 evaluation job(s) · 3 trial(s) · 1 group(s) · 4 signal report(s) · 5 candidate(s)",
    );
  });

  test("missing or partial payloads render zeros", () => {
    expect(formatLearningSummary(normalizeLearningSummary(null))).toBe(
      "0 evaluation job(s) · 0 trial(s) · 0 group(s) · 0 signal report(s) · 0 candidate(s)",
    );
    const partial = normalizeLearningSummary({ evaluation: { jobs: 1 } });
    expect(partial.learning.knowledgeCandidates).toBe(0);
    expect(partial.evaluation.comparisonGroups).toBe(0);
  });
});
