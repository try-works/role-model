import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { normalizeLearningActivity, normalizeLearningHistory } from "../lib/learning-visuals";
import {
  LearningActivationTimelineView,
  LearningActivityHeatmapView,
  LearningComparisonMixView,
  LearningGuardrailListView,
} from "./learning-history-panels";
import { LearningLivePanelView } from "./learning-live-panel";

/**
 * Run 99 - the live/history panels render the durable numbers, and every degraded state says so
 * instead of showing a plausible-looking zero.
 */

const NOW = Date.UTC(2026, 8, 15, 12, 0, 0);

const activity = normalizeLearningActivity({
  observedAtMs: NOW - 5_000,
  window: { minutes: 60 },
  pipeline: [
    { stage: "capture", pending: 2, recent: 4, active: true, lastEventAtMs: NOW - 20_000 },
    { stage: "replay", pending: 0, recent: 9, active: true, lastEventAtMs: NOW - 30_000 },
    { stage: "evaluation", pending: 1, recent: 3, active: false, lastEventAtMs: NOW - 600_000 },
    { stage: "learner", pending: 0, recent: 0, active: false, lastEventAtMs: null },
  ],
  budget: {
    day: "2026-09-15",
    counterfactuals: { used: 12, limit: 100 },
    dispatches: { used: 36, limit: 300 },
    byKind: [
      { kind: "candidate", count: 20 },
      { kind: "derived", count: 10 },
      { kind: "retry", count: 6 },
    ],
  },
  recent: [
    {
      atMs: NOW - 30_000,
      kind: "replay",
      id: "req-6ad0cb92",
      outcome: "replayed",
      detail: "3 branch(es)",
    },
    {
      atMs: NOW - 120_000,
      kind: "evaluation",
      id: "evaluation-replay-3f2e",
      outcome: "completed",
      detail: null,
    },
    {
      atMs: NOW - 300_000,
      kind: "learner",
      id: "validation-1073ba74",
      outcome: "insufficient_evidence",
      detail: "validation_receipt",
    },
  ],
});

const history = normalizeLearningHistory({
  observedAtMs: NOW,
  window: { hours: 6, bucketHours: 2 },
  policyVersion: 21,
  buckets: [
    {
      startMs: NOW - 6 * 3_600_000,
      endMs: NOW - 4 * 3_600_000,
      replays: 2,
      refusals: 40,
      deferred: 3,
      branches: 5,
      evaluations: 2,
      validations: 1,
      activations: 0,
    },
    {
      startMs: NOW - 4 * 3_600_000,
      endMs: NOW - 2 * 3_600_000,
      replays: 6,
      refusals: 12,
      deferred: 1,
      branches: 14,
      evaluations: 4,
      validations: 0,
      activations: 1,
    },
    {
      startMs: NOW - 2 * 3_600_000,
      endMs: NOW,
      replays: 1,
      refusals: 3,
      deferred: 0,
      branches: 3,
      evaluations: 1,
      validations: 2,
      activations: 0,
    },
  ],
  totals: {
    replays: 9,
    refusals: 55,
    deferred: 4,
    evaluations: 7,
    comparisons: 156,
    decisive: 2,
    validations: 3,
    activations: 1,
    rollbacks: 1,
    guardrailBreaches: 1,
    advisoryObserved: 344,
    advisoryWouldHaveChanged: 17,
  },
  comparisonMix: {
    candidate: 40,
    source: 17,
    tie: 44,
    insufficient: 15,
    deltas: [
      {
        comparisonId: "validation-1073ba74",
        delta: 0.08,
        lower: 0.06,
        upper: 0.16,
        decisive: true,
      },
      {
        comparisonId: "validation-7894febd",
        delta: -0.04,
        lower: -0.09,
        upper: 0.02,
        decisive: false,
      },
    ],
  },
  activationTimeline: [
    {
      atMs: NOW - 20 * 60_000,
      kind: "rollback",
      packageId: "pack-6aed0fe3",
      state: "rolled_back",
      cohortPercent: 0,
      detail: null,
    },
    {
      atMs: NOW - 25 * 60_000,
      kind: "breach",
      packageId: "",
      state: "breach",
      cohortPercent: null,
      detail: "quality",
    },
    {
      atMs: NOW - 60 * 60_000,
      kind: "activate",
      packageId: "pack-6aed0fe3",
      state: "active",
      cohortPercent: 10,
      detail: null,
    },
  ],
  guardrails: [
    { metric: "qualityMinDelta", limit: -0.02, observed: 0.08, status: "ok" },
    { metric: "costMaxMultiplier", limit: 1.5, observed: null, status: "no-data" },
    { metric: "latencyP95MaxDeltaMs", limit: 10000, observed: null, status: "no-data" },
    { metric: "errorRateMaxDeltaPp", limit: 2, observed: null, status: "no-data" },
  ],
});

describe("run99 learning live panel", () => {
  /**
   * Run 98 addendum 24: the durable receipt names `replay_handoff_evaluation_pending` when a replay
   * handed its branches to Evaluation Core. The panel must render operator copy for that vocabulary
   * instead of the raw code, and must not present it as a failure.
   */
  test("run98 a24 a handed-off replay renders operator copy, not the raw receipt reason", () => {
    const handedOff = normalizeLearningActivity({
      observedAtMs: NOW,
      window: { minutes: 60 },
      pipeline: [{ stage: "replay", pending: 0, recent: 1, active: false, lastEventAtMs: NOW }],
      budget: {
        day: "2026-09-15",
        counterfactuals: { used: 0, limit: 100 },
        dispatches: { used: 0, limit: 300 },
        byKind: [],
      },
      recent: [
        {
          atMs: NOW,
          kind: "replay",
          id: "req-handoff",
          outcome: "refused",
          detail:
            '{"reason":"replay_handoff_evaluation_pending","evaluationJobId":"evaluation-replay-1"}',
        },
      ],
    });
    const html = renderToStaticMarkup(
      <LearningLivePanelView
        view={handedOff}
        loading={false}
        error={null}
        nowMs={NOW}
        scopeLabel="standalone-runtime-stage"
      />,
    );
    expect(html).toContain("Handed off");
    expect(html).toContain("not a failed replay");
    // The raw vocabulary stays in the DOM so the ledger can still be grepped from the page.
    expect(html).toContain('data-outcome="refused"');
    expect(html).toContain("replay_handoff_evaluation_pending");
  });

  test("renders pipeline rows, the budget gauge and the newest events", () => {
    const html = renderToStaticMarkup(
      <LearningLivePanelView
        view={activity}
        loading={false}
        error={null}
        nowMs={NOW}
        scopeLabel="standalone-runtime-stage"
      />,
    );
    expect(html).toContain("Live replay &amp; evaluation");
    expect(html).toContain("standalone-runtime-stage");
    // Pipeline rows with in-flight and window counters.
    expect(html).toContain("Capture");
    expect(html).toContain("Evaluation");
    expect(html).toContain("2 in flight");
    expect(html).toContain("9 in window");
    // Budget gauge and legend.
    expect(html).toContain("of 300 dispatches");
    expect(html).toContain("12 / 100");
    expect(html).toContain("candidate dispatches");
    // Event feed with outcome chips.
    expect(html).toContain("req-6ad0cb92");
    expect(html).toContain("replayed");
    expect(html).toContain("insufficient_evidence");
    expect(html).toContain("3 branch(es)");
  });

  /**
   * Operator-reported alignment defect (2026-09-23): the right-hand column of the live panel read as
   * vertically centred against the pipeline table on the left. Measured live before the fix, the
   * column's first row started at y=520 while the gauge's visible content began at y=618 - the arc's
   * viewBox carried 22 units of empty space above the apex and the readout was anchored to the bottom
   * of a 168px box. This is the contract that keeps both columns starting at the same top edge.
   */
  test("keeps the live panel's columns top-aligned and the gauge anchored to the top", () => {
    const html = renderToStaticMarkup(
      <LearningLivePanelView
        view={activity}
        loading={false}
        error={null}
        nowMs={NOW}
        scopeLabel="standalone-runtime-stage"
      />,
    );
    // The two-column grid is explicitly top-aligned rather than stretching its items.
    expect(html).toContain("lg:grid-cols-2 lg:items-start");
    // The gauge box hugs its arc and anchors the readout from the top.
    expect(html).toContain("h-[150px] items-start");
    expect(html).toContain('viewBox="0 22 220 128"');
    expect(html).toContain("absolute inset-x-0 top-[84px]");
    expect(html).not.toContain("bottom-[18px]");
  });

  test("renders loading, error and empty states without fabricating numbers", () => {
    const loading = renderToStaticMarkup(
      <LearningLivePanelView view={activity} loading error={null} nowMs={NOW} scopeLabel="scope" />,
    );
    expect(loading).toContain("Reading live replay and evaluation state");
    expect(loading).toContain("loading");
    const failed = renderToStaticMarkup(
      <LearningLivePanelView
        view={activity}
        loading={false}
        error="operator_authentication_required"
        nowMs={NOW}
      />,
    );
    expect(failed).toContain("No value is fabricated");
    // An unreadable panel must never claim to be idle or running.
    expect(failed).toContain("token required");
    expect(failed).toContain("awaiting operator token");
    expect(failed).not.toContain(">idle<");
    const empty = renderToStaticMarkup(
      <LearningLivePanelView
        view={normalizeLearningActivity(null)}
        loading={false}
        error={null}
        nowMs={NOW}
      />,
    );
    expect(empty).toContain("No live activity readback has been recorded");
    expect(empty).not.toContain("of 300 dispatches");
    expect(empty).toContain("no readback");
  });
});

describe("run99 learning history panels", () => {
  test("renders the activity heat grid with the peak bucket", () => {
    const html = renderToStaticMarkup(
      <LearningActivityHeatmapView history={history} nowMs={NOW} />,
    );
    expect(html).toContain("Activity by bucket");
    expect(html).toContain("peak");
    expect(html).toContain("replayed");
    expect(html).toContain("refused");
    expect(html).toContain("deferred");
  });

  test("renders the comparison mix, worst delta and deliverable counts", () => {
    const html = renderToStaticMarkup(<LearningComparisonMixView history={history} />);
    expect(html).toContain("Decisive comparison mix");
    expect(html).toContain("156 comparisons");
    expect(html).toContain("candidate");
    expect(html).toContain("tie");
    expect(html).toContain("insufficient");
    expect(html).toContain("-0.040");
    expect(html).toContain("validation-7894febd");
  });

  test("renders the activation timeline with the rollback annotation and cohort", () => {
    const html = renderToStaticMarkup(
      <LearningActivationTimelineView history={history} nowMs={NOW} />,
    );
    expect(html).toContain("Activation timeline");
    expect(html).toContain("1 rollback(s)");
    expect(html).toContain("rolled back");
    expect(html).toContain("pack-6aed0fe3");
    expect(html).toContain("10% cohort");
  });

  test("renders guardrail rows with explicit no-data verdicts", () => {
    const html = renderToStaticMarkup(<LearningGuardrailListView history={history} />);
    expect(html).toContain("Guardrails");
    expect(html).toContain("Quality delta");
    expect(html).toContain("p95 latency");
    expect(html).toContain("no-data");
    expect(html).toContain("all clear");
  });
});
