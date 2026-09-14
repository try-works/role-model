import { describe, expect, test } from "vitest";

import {
  EMPTY_LEARNING_ACTIVITY,
  EMPTY_LEARNING_HISTORY,
  formatCompact,
  formatRelativeAge,
  historyHeatmap,
  normalizeLearningActivity,
  normalizeLearningHistory,
} from "./learning-visuals";

/**
 * Run 99 - the normalisers must never invent a value. A missing or partial payload becomes an
 * explicit unavailable state; a partially readable one keeps only what it can prove.
 */

const HOUR = 60 * 60 * 1_000;

describe("normalizeLearningActivity", () => {
  test("returns the unavailable view for an empty payload", () => {
    expect(normalizeLearningActivity(null)).toBe(EMPTY_LEARNING_ACTIVITY);
    expect(normalizeLearningActivity(undefined)).toBe(EMPTY_LEARNING_ACTIVITY);
    expect(normalizeLearningActivity({})).toBe(EMPTY_LEARNING_ACTIVITY);
    expect(EMPTY_LEARNING_ACTIVITY.available).toBe(false);
  });

  test("labels the pipeline stages and computes budget percentages", () => {
    const view = normalizeLearningActivity({
      observedAtMs: 1_000,
      window: { minutes: 60 },
      pipeline: [
        { stage: "capture", pending: 2, recent: 3, active: true, lastEventAtMs: 900 },
        { stage: "replay", pending: 0, recent: 5, active: false, lastEventAtMs: 800 },
        { stage: "evaluation", pending: 1, recent: 2, active: true, lastEventAtMs: 700 },
        { stage: "learner", pending: 0, recent: 0, active: false, lastEventAtMs: null },
      ],
      budget: {
        day: "2026-09-15",
        counterfactuals: { used: 25, limit: 100 },
        dispatches: { used: 150, limit: 300 },
        byKind: [
          { kind: "candidate", count: 100 },
          { kind: "derived", count: 30 },
          { kind: "retry", count: 20 },
        ],
      },
      recent: [
        { atMs: 900, kind: "replay", id: "req-1", outcome: "replayed", detail: "3 branch(es)" },
        { atMs: 800, kind: "evaluation", id: "job-1", outcome: "completed", detail: null },
      ],
    });

    expect(view.available).toBe(true);
    expect(view.pipeline.map((stage) => stage.label)).toEqual(["Capture", "Replay", "Evaluation", "Learner"]);
    expect(view.pipeline[0]).toMatchObject({ pending: 2, recent: 3, active: true });
    expect(view.budget.counterfactuals.percent).toBe(25);
    expect(view.budget.dispatches.percent).toBe(50);
    expect(view.budget.byKind[0]).toMatchObject({ kind: "candidate", count: 100 });
    expect(view.budget.byKind[0].share).toBeCloseTo(100 / 150, 5);
    expect(view.recent.map((event) => event.id)).toEqual(["req-1", "job-1"]);
  });

  test("survives partial payloads without fabricating counts", () => {
    const view = normalizeLearningActivity({ pipeline: [{ stage: "replay" }, null], recent: [null] });
    expect(view.available).toBe(true);
    expect(view.pipeline[0]).toMatchObject({ stage: "replay", pending: 0, recent: 0, active: false });
    expect(view.pipeline[1]).toMatchObject({ stage: "unknown", label: "unknown" });
    expect(view.recent).toEqual([]);
    expect(view.budget.counterfactuals).toEqual({ used: 0, limit: 0, percent: 0 });
  });
});

describe("normalizeLearningHistory", () => {
  const payload = {
    observedAtMs: 10 * HOUR,
    window: { hours: 6, bucketHours: 2 },
    policyVersion: 21,
    buckets: [
      { startMs: 4 * HOUR, endMs: 6 * HOUR, replays: 1, refusals: 2, deferred: 1, branches: 3, evaluations: 2, validations: 1, activations: 0 },
      { startMs: 6 * HOUR, endMs: 8 * HOUR, replays: 0, refusals: 5, deferred: 0, branches: 0, evaluations: 0, validations: 0, activations: 1 },
    ],
    totals: {
      replays: 1,
      refusals: 7,
      deferred: 1,
      evaluations: 2,
      comparisons: 3,
      decisive: 1,
      validations: 1,
      activations: 1,
      rollbacks: 1,
      guardrailBreaches: 0,
      advisoryObserved: 12,
      advisoryWouldHaveChanged: 4,
    },
    comparisonMix: {
      candidate: 2,
      source: 1,
      tie: 5,
      insufficient: 2,
      deltas: [
        { comparisonId: "v1", delta: 0.08, lower: 0.06, upper: 0.16, decisive: true },
        { comparisonId: "v2", delta: -0.03, lower: -0.09, upper: 0.02, decisive: false },
      ],
    },
    activationTimeline: [
      { atMs: 9 * HOUR, kind: "rollback", packageId: "pack-1", state: "rolled_back", cohortPercent: 0, detail: null },
      { atMs: 8 * HOUR, kind: "activate", packageId: "pack-1", state: "active", cohortPercent: 10, detail: null },
    ],
    guardrails: [
      { metric: "qualityMinDelta", limit: -0.02, observed: 0.08, status: "ok" },
      { metric: "costMaxMultiplier", limit: 1.5, observed: null, status: "no-data" },
    ],
  };

  test("maps buckets, totals, mix and the worst comparison", () => {
    const view = normalizeLearningHistory(payload);
    expect(view.available).toBe(true);
    expect(view.windowHours).toBe(6);
    expect(view.bucketHours).toBe(2);
    expect(view.policyVersion).toBe(21);
    expect(view.buckets[0]).toMatchObject({ replays: 1, refusals: 2, deferred: 1, total: 1 + 2 + 1 + 2 + 1 });
    expect(view.totals).toMatchObject({ replays: 1, refusals: 7, evaluations: 2, advisoryWouldHaveChanged: 4 });
    expect(view.mix.decisiveShare).toBeCloseTo(3 / 10, 5);
    expect(view.mix.worst?.comparisonId).toBe("v2");
    expect(view.timeline.map((entry) => entry.kind)).toEqual(["rollback", "activate"]);
    expect(view.guardrails.map((row) => row.label)).toEqual(["Quality delta", "Cost"]);
    expect(view.guardrailsFiring).toBe(0);
  });

  test("reports firing guardrails and degrades unreadable payloads", () => {
    const firing = normalizeLearningHistory({
      ...payload,
      guardrails: [{ metric: "qualityMinDelta", limit: -0.02, observed: -0.4, status: "firing" }],
    });
    expect(firing.guardrailsFiring).toBe(1);
    expect(normalizeLearningHistory(null)).toBe(EMPTY_LEARNING_HISTORY);
    expect(normalizeLearningHistory({ buckets: "nope" }).buckets).toEqual([]);
  });
});

describe("historyHeatmap", () => {
  test("scales intensity, keeps a weekday grid and marks the busiest bucket", () => {
    const buckets = [
      { startMs: Date.UTC(2026, 8, 14, 0), endMs: 0, replays: 0, refusals: 0, deferred: 0, branches: 0, evaluations: 0, validations: 0, activations: 0, total: 0 },
      { startMs: Date.UTC(2026, 8, 15, 0), endMs: 0, replays: 4, refusals: 0, deferred: 0, branches: 0, evaluations: 0, validations: 0, activations: 0, total: 4 },
    ];
    const heatmap = historyHeatmap(buckets);
    expect(heatmap.max).toBe(4);
    expect(heatmap.columns).toBe(2);
    expect(heatmap.cells[1].intensity).toBe(1);
    expect(heatmap.cells[0].intensity).toBe(0);
    expect(heatmap.worstStartMs).toBe(buckets[1].startMs);
    // 2026-09-14 is a Monday (row 0) and 2026-09-15 a Tuesday (row 1).
    expect(heatmap.cells.map((cell) => cell.weekday)).toEqual([0, 1]);
    expect(historyHeatmap([])).toEqual({ cells: [], max: 0, columns: 0, worstStartMs: null });
  });
});

describe("formatters", () => {
  test("formatRelativeAge buckets seconds, minutes, hours and days", () => {
    const now = 10 * HOUR;
    expect(formatRelativeAge(now - 30_000, now)).toBe("30s ago");
    expect(formatRelativeAge(now - 5 * 60_000, now)).toBe("5m ago");
    expect(formatRelativeAge(now - 3 * HOUR, now)).toBe("3h ago");
    expect(formatRelativeAge(now - 2 * 24 * HOUR, now)).toBe("2d ago");
    expect(formatRelativeAge(null, now)).toBe("no data");
  });

  test("formatCompact keeps the reference-style compact numerals", () => {
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(999)).toBe("999");
    expect(formatCompact(1970)).toBe("1.97k");
    expect(formatCompact(12_480)).toBe("12.5k");
    expect(formatCompact(1_240_000)).toBe("1.2M");
  });
});
