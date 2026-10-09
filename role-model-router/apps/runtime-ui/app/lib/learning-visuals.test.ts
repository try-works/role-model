import { describe, expect, test } from "vitest";

import {
  ADVISORY_REFUSAL_VOCABULARY,
  EMPTY_LEARNING_ACTIVITY,
  EMPTY_LEARNING_HISTORY,
  advisoryOriginSplit,
  advisoryReasonBasis,
  advisoryRefusalView,
  appliedShareOf,
  fallbackReasonSummary,
  formatCompact,
  formatPercentShare,
  formatRelativeAge,
  historyHeatmap,
  normalizeLearningActivity,
  normalizeLearningHistory,
  profileInspectionView,
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
    expect(view.pipeline.map((stage) => stage.label)).toEqual([
      "Capture",
      "Replay",
      "Evaluation",
      "Learner",
    ]);
    expect(view.pipeline[0]).toMatchObject({ pending: 2, recent: 3, active: true });
    expect(view.budget.counterfactuals.percent).toBe(25);
    expect(view.budget.dispatches.percent).toBe(50);
    expect(view.budget.byKind[0]).toMatchObject({ kind: "candidate", count: 100 });
    expect(view.budget.byKind[0].share).toBeCloseTo(100 / 150, 5);
    expect(view.recent.map((event) => event.id)).toEqual(["req-1", "job-1"]);
  });

  /**
   * Run 100 addendum `00-requirements.evaluation-lease-wedge-repair.addendum-02` S4 (operator report
   * 2026-09-23: "18 evals have been stuck in flight for hours"). The overview said "18 in flight" for
   * two days because a non-terminal job with no live lease was counted as in-flight work. The readback
   * now carries `wedged` separately, so the panel can flag it instead of reporting it as progress.
   */
  test("run100h keeps a wedged count separate from in-flight work", () => {
    const view = normalizeLearningActivity({
      observedAtMs: 1_000,
      window: { minutes: 60 },
      pipeline: [
        {
          stage: "evaluation",
          pending: 1,
          wedged: 4,
          recent: 2,
          active: false,
          lastEventAtMs: 900,
        },
        { stage: "replay", pending: 0, recent: 1, active: false, lastEventAtMs: 800 },
      ],
      budget: {
        day: "2026-09-23",
        counterfactuals: { used: 0, limit: 100 },
        dispatches: { used: 0, limit: 300 },
        byKind: [],
      },
      recent: [],
    });

    expect(view.pipeline[0]).toMatchObject({ pending: 1, wedged: 4 });
    // A payload written before the field existed must read as zero, never as a missing number.
    expect(view.pipeline[1]).toMatchObject({ pending: 0, wedged: 0 });
  });

  test("survives partial payloads without fabricating counts", () => {
    const view = normalizeLearningActivity({
      pipeline: [{ stage: "replay" }, null],
      recent: [null],
    });
    expect(view.available).toBe(true);
    expect(view.pipeline[0]).toMatchObject({
      stage: "replay",
      pending: 0,
      recent: 0,
      active: false,
    });
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
      {
        startMs: 4 * HOUR,
        endMs: 6 * HOUR,
        replays: 1,
        refusals: 2,
        deferred: 1,
        branches: 3,
        evaluations: 2,
        validations: 1,
        activations: 0,
      },
      {
        startMs: 6 * HOUR,
        endMs: 8 * HOUR,
        replays: 0,
        refusals: 5,
        deferred: 0,
        branches: 0,
        evaluations: 0,
        validations: 0,
        activations: 1,
      },
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
      {
        atMs: 9 * HOUR,
        kind: "rollback",
        packageId: "pack-1",
        state: "rolled_back",
        cohortPercent: 0,
        detail: null,
      },
      {
        atMs: 8 * HOUR,
        kind: "activate",
        packageId: "pack-1",
        state: "active",
        cohortPercent: 10,
        detail: null,
      },
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
    expect(view.buckets[0]).toMatchObject({
      replays: 1,
      refusals: 2,
      deferred: 1,
      total: 1 + 2 + 1 + 2 + 1,
    });
    expect(view.totals).toMatchObject({
      replays: 1,
      refusals: 7,
      evaluations: 2,
      advisoryWouldHaveChanged: 4,
    });
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
      {
        startMs: Date.UTC(2026, 8, 14, 0),
        endMs: 0,
        replays: 0,
        refusals: 0,
        deferred: 0,
        branches: 0,
        evaluations: 0,
        validations: 0,
        activations: 0,
        total: 0,
      },
      {
        startMs: Date.UTC(2026, 8, 15, 0),
        endMs: 0,
        replays: 4,
        refusals: 0,
        deferred: 0,
        branches: 0,
        evaluations: 0,
        validations: 0,
        activations: 0,
        total: 4,
      },
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
  /**
   * Run 98 addendum 44 `A44-S3` (`AC-R12-01`): the Learning Overview must report the applied share, the
   * fallback counts by reason, the rollback count, the guardrail status and — when the packaged runtime has
   * no profile-inspection capability — that absence as a bounded `unavailable` with its reason rather than
   * an error or a blank.
   */
  test("run98 a44 s3: the overview helpers compute the readback's missing numbers", () => {
    expect(appliedShareOf({ applied: 55, observed: 11_778 })).toBeCloseTo(0.00467, 5);
    expect(appliedShareOf({ applied: 0, observed: 0 })).toBeNull();
    expect(appliedShareOf(null)).toBeNull();

    /**
     * Run 114 Tier 1: the row list alone could not say how many reasons it was hiding, so the helper
     * returns the bound with the rows - `total` is every positive-count reason before the slice and
     * `omitted` is what the slice left out. The old `fallbackReasonRows` name is deliberately gone:
     * a caller that still read `.length` on the summary would have compiled silently against the object.
     */
    const reasons = fallbackReasonSummary({
      fallbackReasons: {
        advisory_candidate_not_eligible: 4_708,
        outside_score_band: 12,
        advisory_stale: 2,
      },
    });
    expect(reasons.rows.map((row) => row.reason)).toEqual([
      "advisory_candidate_not_eligible",
      "outside_score_band",
      "advisory_stale",
    ]);
    expect(reasons.total).toBe(3);
    expect(reasons.omitted).toBe(0);
    expect(fallbackReasonSummary({ fallbackReasons: {} })).toEqual({
      rows: [],
      total: 0,
      omitted: 0,
    });
    expect(fallbackReasonSummary(null)).toEqual({ rows: [], total: 0, omitted: 0 });

    expect(profileInspectionView({ capability: "profile", state: "ready" })).toEqual({
      state: "available",
      reason: null,
    });
    expect(
      profileInspectionView({
        error: "operator_capability_unavailable",
        reason: "learning profile inspection operator control is unavailable.",
        capability: "learning profile inspection",
      }),
    ).toEqual({
      state: "unavailable",
      reason: "learning profile inspection operator control is unavailable.",
    });
    expect(profileInspectionView(null)).toEqual({ state: "unavailable", reason: null });
    // Run 113: the route's bounded document carries its own state, and an absence must not render as an
    // available inspection just because it arrived without an error field.
    expect(
      profileInspectionView({
        schemaVersion: "role-model.learning-profile-inspection.v1",
        state: "unavailable",
        reason: "no current estimate for this scope yet",
      }),
    ).toEqual({ state: "unavailable", reason: "no current estimate for this scope yet" });
    expect(
      profileInspectionView({
        schemaVersion: "role-model.learning-profile-inspection.v1",
        state: "available",
        reason: null,
        generationKey: "default",
      }),
    ).toEqual({ state: "available", reason: null });

    expect(formatPercentShare(0)).toBe("0.0%");
    expect(formatPercentShare(0.25)).toBe("25.0%");
    expect(formatPercentShare(null)).toBe("—");
  });

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

/**
 * Run 114 Tier 1 (operator screenshot 2026-10-07): the Overview rendered
 * `cohort_excluded ×128 · advisory_matches_baseline ×41 · advisory_candidate_not_eligible ×22` under a bare
 * `Fallback reasons` label. The 191 shown read as a partition of the 827 observed above it, the 13-row
 * `advisory_task_unscoped` tail was invisible, and the true sum was 204. These helpers carry the
 * denominator, the bound and the origin split so the panel cannot silently drop them again.
 */
describe("advisory disclosure", () => {
  test("the reason summary keeps the ordering and discloses what the bound hid", () => {
    const summary = fallbackReasonSummary(
      {
        fallbackReasons: {
          cohort_excluded: 128,
          advisory_matches_baseline: 41,
          advisory_candidate_not_eligible: 22,
          advisory_task_unscoped: 13,
        },
      },
      3,
    );
    // The order is the helper's, most frequent first, and the omitted tail stays out of the rows.
    expect(summary.rows.map((row) => row.reason)).toEqual([
      "cohort_excluded",
      "advisory_matches_baseline",
      "advisory_candidate_not_eligible",
    ]);
    expect(summary.rows.map((row) => row.count)).toEqual([128, 41, 22]);
    expect(summary.total).toBe(4);
    expect(summary.omitted).toBe(1);

    // A tie falls back to the reason text, so the bound is deterministic across reads.
    const tied = fallbackReasonSummary({ fallbackReasons: { c: 2, a: 2, b: 2 } }, 2);
    expect(tied.rows.map((row) => row.reason)).toEqual(["a", "b"]);
    expect(tied.omitted).toBe(1);

    // Only positive, finite counts are reasons; a limit of zero hides all of them but still totals them.
    expect(
      fallbackReasonSummary({ fallbackReasons: { a: 0, b: -3, c: "4", d: 1, e: null } }, 5),
    ).toEqual({ rows: [{ reason: "d", count: 1 }], total: 1, omitted: 0 });
    expect(fallbackReasonSummary({ fallbackReasons: { a: 4 } }, 0)).toEqual({
      rows: [],
      total: 1,
      omitted: 1,
    });
    // Empty and unreadable inputs are an empty summary, never a fabricated row.
    expect(fallbackReasonSummary(undefined)).toEqual({ rows: [], total: 0, omitted: 0 });
    expect(fallbackReasonSummary({ fallbackReasons: [] })).toEqual({
      rows: [],
      total: 0,
      omitted: 0,
    });
  });

  test("the reason basis claims a live-retained partition only when the counts reconcile", () => {
    // The live calibration: sum(reasons) 204 == considered 208 - applied 4.
    expect(
      advisoryReasonBasis({
        observed: 827,
        considered: 208,
        applied: 4,
        fallbackReasons: {
          cohort_excluded: 128,
          advisory_matches_baseline: 41,
          advisory_candidate_not_eligible: 22,
          advisory_task_unscoped: 13,
        },
      }),
    ).toEqual({ counted: 204, retainedLive: 204, reconciled: true });

    // A drift of even one row is not a partition, and the panel must not print one.
    expect(
      advisoryReasonBasis({
        considered: 210,
        applied: 4,
        fallbackReasons: { cohort_excluded: 128, advisory_task_unscoped: 79 },
      }),
    ).toEqual({ counted: 207, retainedLive: 206, reconciled: false });

    // Without both numbers there is no denominator to claim.
    expect(advisoryReasonBasis({ fallbackReasons: { a: 3 } })).toEqual({
      counted: 3,
      retainedLive: null,
      reconciled: false,
    });
    expect(advisoryReasonBasis({ considered: 9, fallbackReasons: { a: 3 } })).toEqual({
      counted: 3,
      retainedLive: null,
      reconciled: false,
    });
    // A negative remainder is clamped rather than rendered as a negative denominator.
    expect(advisoryReasonBasis({ considered: 2, applied: 9 })).toEqual({
      counted: 0,
      retainedLive: 0,
      reconciled: true,
    });
    expect(advisoryReasonBasis(null)).toEqual({
      counted: 0,
      retainedLive: null,
      reconciled: false,
    });
  });

  test("the origin split prefers the reader's tally and falls back to the decisions readback", () => {
    // Preference: the reader's own `advisory.origins` wins over the decisions readback.
    expect(
      advisoryOriginSplit(
        { observed: 827, origins: { live: 208, shadow: 619, other: 0 } },
        { origins: { live: 1, shadow: 2, other: 3 } },
      ),
    ).toEqual({
      live: 208,
      shadow: 619,
      other: 0,
      unattributed: 0,
      basis: "advisory",
      consistent: true,
    });

    // Until the reader publishes one, the decisions readback the Overview already fetches is the basis.
    expect(
      advisoryOriginSplit(
        { observed: 827 },
        { origins: { live: 208, shadow: 619, other: 0 }, total: 827 },
      ),
    ).toEqual({
      live: 208,
      shadow: 619,
      other: 0,
      unattributed: 0,
      basis: "decisions",
      consistent: true,
    });
    // A bare origins record is accepted as the fallback too.
    expect(advisoryOriginSplit({ observed: 3 }, { live: 1, shadow: 2, other: 0 })).toEqual({
      live: 1,
      shadow: 2,
      other: 0,
      unattributed: 0,
      basis: "decisions",
      consistent: true,
    });

    /**
     * Run 107: the reader publishes origins CUMULATIVELY, matching `observed`, plus `originsUnattributed`
     * for rows that aged out of the capped window before the tally existed. The remainder is part of the
     * sum - without it a ledger past the 5000-entry cap would be reported inconsistent and the panel would
     * silently drop the split exactly when the population grew large enough to need it.
     */
    expect(
      advisoryOriginSplit(
        {
          observed: 6000,
          origins: { live: 3000, shadow: 2990, other: 0 },
          originsUnattributed: 10,
        },
        null,
      ),
    ).toEqual({
      live: 3000,
      shadow: 2990,
      other: 0,
      unattributed: 10,
      basis: "advisory",
      consistent: true,
    });
    // ...and a remainder that does NOT close the gap is still caught: the guard is a real invariant check.
    expect(
      advisoryOriginSplit(
        { observed: 6000, origins: { live: 3000, shadow: 2990, other: 0 }, originsUnattributed: 9 },
        null,
      )?.consistent,
    ).toBe(false);

    /**
     * The guard that matters: the decisions-derived basis counts ENTRIES while `observed` is the
     * cumulative total, and entries are capped, so past the cap the two diverge. A split that does not
     * add up is reported inconsistent and the panel shows the bare count instead of the split.
     */
    expect(
      advisoryOriginSplit({ observed: 900 }, { origins: { live: 208, shadow: 619, other: 0 } }),
    ).toEqual({
      live: 208,
      shadow: 619,
      other: 0,
      unattributed: 0,
      basis: "decisions",
      consistent: false,
    });
    // No observed count at all cannot be reconciled either.
    expect(advisoryOriginSplit({}, { origins: { live: 1, shadow: 2, other: 0 } })?.consistent).toBe(
      false,
    );

    // An incomplete, negative or fractional triple is not a source: half a split is worse than none.
    expect(advisoryOriginSplit({ observed: 3, origins: { live: 1, shadow: 2 } }, null)).toBeNull();
    expect(
      advisoryOriginSplit(
        { observed: 3, origins: { live: 1, shadow: -2, other: 0 } },
        { live: 1.5, shadow: 1, other: 0 },
      ),
    ).toBeNull();
    expect(advisoryOriginSplit({ observed: 3, origins: "nope" }, { origins: null })).toBeNull();
    expect(advisoryOriginSplit(null, null)).toBeNull();
    expect(advisoryOriginSplit(undefined, undefined)).toBeNull();
  });
});

/**
 * Run 114 Tier 2: the per-row refusal. The words below are the advisory source's own refusal and fault
 * texts (`route-advisory-source.ts` `refuse`/`unavailable`, plus the aged override), forwarded onto the
 * observation as `reason`. Nothing enforces this vocabulary - the table is the contract - so a code the
 * table does not know renders as the RAW code rather than an invented meaning.
 */
describe("advisoryRefusalView", () => {
  test("every vocabulary entry resolves to its declared kind", () => {
    for (const code of ADVISORY_REFUSAL_VOCABULARY.absent) {
      expect(advisoryRefusalView({ reason: code })).toEqual({
        code,
        phrase: "no usable pack",
        label: "advisory unavailable",
        kind: "absent",
        source: "reason",
      });
    }
    for (const code of ADVISORY_REFUSAL_VOCABULARY.fault) {
      expect(advisoryRefusalView({ reason: code })).toEqual({
        code,
        phrase: "the advisory store could not be read",
        label: "advisory unavailable",
        kind: "fault",
        source: "reason",
      });
    }
  });

  test("the two concepts carry different labels - a routing outcome is not a refusal", () => {
    /**
     * The defect this guards: `reason` answers "why is there no advice?" while `fallbackReason` answers
     * "why was the advice not used?". Rendering both as "advisory refusal" would put two populations under
     * one word - the same shape of defect as the reason row that read as a partition of observed.
     */
    const noAdvice = advisoryRefusalView({ reason: "no admitted rung" });
    const notUsed = advisoryRefusalView({ fallbackReason: "cohort_excluded" });
    expect(noAdvice.label).toBe("advisory unavailable");
    expect(notUsed.label).toBe("advisory not applied");
    expect(noAdvice.label).not.toBe(notUsed.label);
    // Neither invents a meaning for a code it does not know.
    expect(notUsed.kind).toBe("other");
    expect(notUsed.phrase).toBe("cohort_excluded");
  });

  test("no code is in two buckets, and an unrecognised code renders as itself", () => {
    const all = [...ADVISORY_REFUSAL_VOCABULARY.absent, ...ADVISORY_REFUSAL_VOCABULARY.fault];
    expect(new Set(all).size).toBe(all.length);

    // Drift: a code the table does not know is 'other' and its phrase IS the code - never a meaning we
    // invented for it. Extending the table without extending this test turns it red on purpose.
    for (const unknown of [
      "brand_new_refusal",
      "cohort_excluded",
      "advisory_task_unscoped",
      "a code nobody has emitted yet",
    ]) {
      expect(advisoryRefusalView({ reason: unknown })).toEqual({
        code: unknown,
        phrase: unknown,
        label: "advisory unavailable",
        kind: "other",
        source: "reason",
      });
    }
    // The Tier-2 `reason` is the explanation; the Tier-1 `fallbackReason` is the tally key. The more
    // specific one wins, and either alone still renders.
    expect(
      advisoryRefusalView({ reason: "no admitted rung", fallbackReason: "cohort_excluded" }),
    ).toEqual({
      code: "no admitted rung",
      phrase: "no usable pack",
      label: "advisory unavailable",
      kind: "absent",
      source: "reason",
    });
    expect(advisoryRefusalView({ fallbackReason: "cohort_excluded" })).toEqual({
      code: "cohort_excluded",
      phrase: "cohort_excluded",
      label: "advisory not applied",
      kind: "other",
      source: "fallback",
    });
    // Codes are matched trimmed, so trailing whitespace from a writer cannot silently become 'other'.
    expect(advisoryRefusalView({ reason: "  evidence clock or window unavailable  " })).toEqual({
      code: "evidence clock or window unavailable",
      phrase: "the advisory store could not be read",
      label: "advisory unavailable",
      kind: "fault",
      source: "reason",
    });
    // Codes the table DOES know are bucketed, whichever concept carried them.
    expect(advisoryRefusalView({ reason: "no active pack" }).kind).toBe("absent");
    expect(advisoryRefusalView({ reason: "effective advisory policy unavailable" }).kind).toBe(
      "fault",
    );
  });

  test("a row with nothing to refuse reads as none", () => {
    for (const row of [
      null,
      undefined,
      {},
      { reason: null },
      { reason: "" },
      { reason: "   " },
      { reason: 7 },
      { fallbackReason: null },
    ]) {
      expect(advisoryRefusalView(row)).toEqual({
        code: null,
        phrase: "",
        label: "",
        kind: "none",
        source: "none",
      });
    }
  });
});
