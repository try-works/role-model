import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import * as Tracer from "effect/Tracer";

/**
 * Run 108 R7 - the observability spine, phase 1 (metrics).
 *
 * Per the effect-grep canonical idiom (Effect-TS/effect @460272d, packages/effect/test/Metric.test.ts):
 * declare each metric ONCE at module scope with a description and a documented tag contract, update via
 * Metric.update, scope to the active Metric.MetricRegistry (tests and per-scope runtimes isolate via
 * Effect.provideService(Metric.MetricRegistry, registry)), and tag per call with Metric.withAttributes.
 *
 * Namespaces: role-model.router.*, role-model.replay.*, role-model.eval.*, role-model.learner.*.
 * Spans (Tracer.make, per-stage attributes) are phase 2 of this requirement.
 */

/** Routing decisions served by the runtime. Tag contract: none at call time (the decision id travels on the span in phase 2). */
export const routerDecisions = Metric.counter("role-model.router.decisions", {
  description: "Routing decisions served by the runtime.",
  incremental: true,
});

/**
 * Replay admission attempts. Tag contract: { pass: "replay", admitted: "true" | "false" } - every
 * attempt counts once and the outcome rides the tag, so refusals are visible as their own series.
 */
export const replayAdmissions = Metric.counter("role-model.replay.admissions", {
  description: "Captures admitted for replay.",
  incremental: true,
});

/** Finalise guard refusals. Tag contract: { guard, reason } - the RC-1 observability gap (which guard refused never reached the disposition). */
export const evalFinaliseRefusals = Metric.counter("role-model.eval.finalise_refusals", {
  description: "Evaluation finalise guard refusals, tagged by guard and reason.",
  incremental: true,
});

/**
 * Run 108 phase-03 F4 (effect-grep canonicalization): the learner outcome vocabulary, declared
 * once. The metric JSDoc below had drifted to derived | skipped | refused while the wiring helper
 * accepted derived | idle and the sweep passes idle - a documented tag contract the code cannot
 * produce. These are the two outcomes the sweep has: it derived candidates, or it was idle.
 */
export type LearnerDerivationOutcome = "derived" | "idle";

/** Candidates derived per learner sweep. Tag contract: { outcome: "derived" | "idle" }. */
export const learnerDerivations = Metric.counter("role-model.learner.derivations", {
  description: "Candidates examined by the learner sweep per tick.",
  incremental: true,
});

/**
 * Run 108 R7 span phase, per the effect-grep canonical convention (memory pro-0081, alchemy-effect
 * @ef7d3077): spans are created through the active Tracer (Tracer.make), scalar attributes are
 * forwarded, and completion is recorded as effect.exit.
 */
export const withStageSpanEffect = <A, E, R>(
  stage: string,
  attributes: Readonly<Record<string, string>>,
  self: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, Exclude<R, Tracer.ParentSpan>> =>
  Effect.withSpan(self, stage, { attributes });

/**
 * Sync wrapper for the plain-TS host: run a stage under a named span. The tracer is injectable so
 * tests can record span lifecycle; by default it uses the runtime's active tracer.
 */
export function withStageSpan<A>(
  stage: string,
  attributes: Readonly<Record<string, string>>,
  run: () => A,
  options: { readonly tracer?: Tracer.Tracer } = {},
): A {
  const tracer = options.tracer ?? Effect.runSync(Effect.service(Tracer.Tracer));
  const startTime = BigInt(Math.floor(Date.now() * 1_000_000));
  const span = tracer.span({
    name: stage,
    parent: Option.none(),
    annotations: Context.empty(),
    links: [],
    startTime,
    kind: "internal",
    root: true,
    sampled: true,
  });
  for (const [key, value] of Object.entries(attributes)) {
    span.attribute(key, value);
  }
  try {
    const result = run();
    span.end(BigInt(Math.floor(Date.now() * 1_000_000)), Exit.succeed(result));
    return result;
  } catch (error) {
    /**
     * Run 108 phase-03 F1 (effect-grep canonicalization): a JS throw is a DEFECT, not a typed
     * error. The canonical completion is Exit.die - see effect test/Tracer.test.ts "ends the span
     * when the callback throws", which asserts deepStrictEqual(exit, Exit.die(defect)). Exit.fail
     * here reported a typed failure for something that never travelled the typed error channel.
     */
    span.end(BigInt(Math.floor(Date.now() * 1_000_000)), Exit.die(error));
    throw error;
  }
}

/**
 * The production wiring helpers. 03.5 review M2: the phase-3 call sites were inline metric updates
 * with no pinned contract - these are the one-line contracts the production paths call, each covered
 * by run108-observability.test.ts.
 */
export function recordRouterDecision(selection: "advisory_applied" | "baseline_retained"): void {
  Effect.runSync(Metric.update(Metric.withAttributes(routerDecisions, { selection }), 1));
}

/**
 * Run 108 phase-03 F3 (effect-grep canonicalization): every attempt updates by 1 and the outcome
 * travels in the tag. The baseline updated by `admitted ? 1 : 0`, so a refusal added +0 and was
 * indistinguishable from no attempt at all - the counter could not answer "how often was replay
 * refused".
 */
export function recordReplayAdmission(pass: "replay", admitted: boolean): void {
  Effect.runSync(
    Metric.update(
      Metric.withAttributes(replayAdmissions, { pass, admitted: admitted ? "true" : "false" }),
      1,
    ),
  );
}

export function recordFinaliseRefusal(guard: string, reason: string): void {
  Effect.runSync(Metric.update(Metric.withAttributes(evalFinaliseRefusals, { guard, reason }), 1));
}

export function recordLearnerDerivation(count: number, outcome: LearnerDerivationOutcome): void {
  Effect.runSync(Metric.update(Metric.withAttributes(learnerDerivations, { outcome }), count));
}

/**
 * Run 108 phase-03 F2 (effect-grep canonicalization): the readback keeps the registry's own
 * granularity. Metric.snapshot hands out one entry per (metric, attributes) pair, each with its own
 * state (Effect-TS/effect @460272d, Metric.ts SnapshotProto); aggregating by metric id alone
 * DISCARDED the attributes and collapsed the guard/reason tag contract into a single total - the
 * exact RC-1 gap the refusal counter exists to close ("which guard refused" never reached the
 * disposition). The claim the counter carries is the breakdown, not the sum.
 */

/** The metric families the registry can hand back (Effect Metric.Type). */
export type ObservabilityMetricType = "Counter" | "Gauge" | "Histogram" | "Frequency" | "Summary";

/**
 * The state of one series, discriminated by the metric family that produced it. The counter-only
 * cast this replaces silently zeroed every gauge and histogram, so each family reads back through
 * its own state shape.
 */
export type ObservabilityMetricState =
  | { readonly kind: "counter"; readonly count: number; readonly incremental: boolean }
  | { readonly kind: "gauge"; readonly value: number }
  | {
      readonly kind: "histogram";
      readonly buckets: ReadonlyArray<readonly [number, number]>;
      readonly count: number;
      readonly sum: number;
      readonly min: number;
      readonly max: number;
    };

/** One (id, attributes, state) series - the registry's granularity, never collapsed. */
export interface ObservabilityMetricSeries {
  readonly id: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly state: ObservabilityMetricState;
}

/** One metric id and every series written under it. */
export interface ObservabilityMetricReadback {
  /** The family the id was declared as (one id is one family). */
  readonly type: ObservabilityMetricType;
  /**
   * Convenience total: counters sum their counts, histograms their observation counts and gauges
   * their values across the series. The series breakdown is the authoritative reading.
   */
  readonly count: number;
  /** The counter contract: true only while every series is an incremental counter. */
  readonly incremental: boolean;
  readonly series: ReadonlyArray<ObservabilityMetricSeries>;
}

const asNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const asBuckets = (value: unknown): ReadonlyArray<readonly [number, number]> =>
  Array.isArray(value)
    ? value.filter(
        (bucket): bucket is [number, number] =>
          Array.isArray(bucket) &&
          bucket.length === 2 &&
          typeof bucket[0] === "number" &&
          typeof bucket[1] === "number",
      )
    : [];

const seriesAttributes = (attributes: unknown): Readonly<Record<string, string>> => {
  const out: Record<string, string> = {};
  if (attributes !== null && typeof attributes === "object" && !Array.isArray(attributes)) {
    for (const [key, value] of Object.entries(attributes)) {
      out[key] = String(value);
    }
  }
  return out;
};

const toSeriesState = (type: string, state: Record<string, unknown>): ObservabilityMetricState => {
  if (type === "Gauge") {
    return { kind: "gauge", value: asNumber(state.value) };
  }
  if (type === "Histogram") {
    return {
      kind: "histogram",
      buckets: asBuckets(state.buckets),
      count: asNumber(state.count),
      sum: asNumber(state.sum),
      min: asNumber(state.min),
      max: asNumber(state.max),
    };
  }
  // The spine declares counters (the four module-scope families above); any other family reads
  // back as the counter shape its state shares rather than being folded into a zero.
  return { kind: "counter", count: asNumber(state.count), incremental: state.incremental === true };
};

const seriesScalar = (state: ObservabilityMetricState): number =>
  state.kind === "counter" ? state.count : state.kind === "gauge" ? state.value : state.count;

/** A stable key for one attribute set, so the readback order does not depend on write order. */
const attributeKey = (attributes: Readonly<Record<string, string>>): string =>
  JSON.stringify(Object.entries(attributes).sort(([left], [right]) => (left < right ? -1 : 1)));

/** 03.5 review M4: the metrics were write-only - this is the readback the UI/status surfaces. */
export function collectObservabilitySnapshot(): Record<string, ObservabilityMetricReadback> {
  const snapshots = Effect.runSync(Metric.snapshot) as ReadonlyArray<{
    id: string;
    type: string;
    attributes?: unknown;
    state?: unknown;
  }>;
  const grouped = new Map<
    string,
    { type: ObservabilityMetricType; series: ObservabilityMetricSeries[] }
  >();
  for (const snap of snapshots) {
    const series: ObservabilityMetricSeries = {
      id: snap.id,
      attributes: seriesAttributes(snap.attributes),
      state: toSeriesState(snap.type, (snap.state ?? {}) as Record<string, unknown>),
    };
    const group = grouped.get(snap.id);
    if (group === undefined) {
      grouped.set(snap.id, { type: snap.type as ObservabilityMetricType, series: [series] });
      continue;
    }
    group.series.push(series);
  }
  const out: Record<string, ObservabilityMetricReadback> = {};
  for (const [id, group] of grouped) {
    const series = [...group.series].sort((left, right) =>
      attributeKey(left.attributes).localeCompare(attributeKey(right.attributes)),
    );
    out[id] = {
      type: group.type,
      count: series.reduce((total, entry) => total + seriesScalar(entry.state), 0),
      incremental:
        series.length > 0 &&
        series.every((entry) => entry.state.kind === "counter" && entry.state.incremental),
      series,
    };
  }
  return out;
}

/**
 * Run 108 phase-03 F5 (R7 "Metrics"): the per-family evidence counter.
 *
 * CANONICAL SHAPE (effect-grep audit, generation local-e7d9d448): ONE counter id carrying a
 * BOUNDED `family` attribute and a `dimension` tag. A dynamic metric name per family
 * (`role-model.learner.family_derivations.<family>`) is the noncanonical form the audit rejects:
 * the registry would then hold one metric per task family the store has ever reported.
 *
 * Value contract: every update is the number of times the learning pass DERIVED evidence for that
 * (family, dimension) this pass, so the counter is a monotonic sum of derivations - work done, not a
 * census. Re-deriving the same durable evidence on a later pass counts again, exactly as a byte or
 * row counter counts a re-read; the per-series total is therefore cumulative and is never a
 * statement about how much evidence currently exists.
 */
export type LearnerFamilyDimension = "decisive" | "holdout" | "development" | "distinct";

/** The ONE attribute value every family id beyond the bound collapses onto. */
export const UNKNOWN_FAMILY_ATTRIBUTE = "other";

/**
 * How many distinct family ids keep an attribute value of their own. Small on purpose: the
 * attribute space is bounded so the registry cannot grow per distinct family id.
 */
export const LEARNER_FAMILY_ATTRIBUTE_BOUND = 16;

export interface FamilyAttributeCollapser {
  /** The attribute value for a family id: the id itself while admitted, otherwise "other". */
  attributeFor(familyId: string): string;
  /** How many family ids currently hold a series of their own (never more than the bound). */
  readonly admittedCount: number;
}

/**
 * The explicit family-attribute collapse. The first `bound` distinct ids seen are admitted and keep
 * their own attribute value; every id after that - and every empty id - maps to the single overflow
 * value "other". An id already admitted is never re-bucketed, so a series does not move once it
 * exists. This is what bounds the registry: at most bound + 1 family series, for ever.
 */
export function createFamilyAttributeCollapser(
  bound: number = LEARNER_FAMILY_ATTRIBUTE_BOUND,
): FamilyAttributeCollapser {
  const admitted = new Set<string>();
  return {
    attributeFor(familyId: string): string {
      const id =
        typeof familyId === "string" && familyId.trim().length > 0
          ? familyId
          : UNKNOWN_FAMILY_ATTRIBUTE;
      if (admitted.has(id)) return id;
      if (admitted.size < bound) {
        admitted.add(id);
        return id;
      }
      return UNKNOWN_FAMILY_ATTRIBUTE;
    },
    get admittedCount(): number {
      return admitted.size;
    },
  };
}

/** The per-family evidence counter. Tag contract: { family, dimension: decisive|holdout|development|distinct }. */
export const learnerFamilyDerivations = Metric.counter("role-model.learner.family_derivations", {
  description: "Learner evidence derivations per task family and evidence dimension.",
  incremental: true,
});

/** The four per-family dimensions the learning-pass summary already counts. */
export interface LearnerFamilyEvidenceCounts {
  readonly decisiveComparisons?: number;
  readonly holdoutComparisons?: number;
  readonly developmentComparisons?: number;
  readonly distinctCaptures?: number;
}

const FAMILY_DIMENSION_FIELDS: ReadonlyArray<
  readonly [LearnerFamilyDimension, keyof LearnerFamilyEvidenceCounts]
> = [
  ["decisive", "decisiveComparisons"],
  ["holdout", "holdoutComparisons"],
  ["development", "developmentComparisons"],
  ["distinct", "distinctCaptures"],
];

/** The ONE collapser the production recordings share, so the bound holds across every call site. */
const familyAttributes = createFamilyAttributeCollapser();

/**
 * Record one learning pass's per-family evidence counts. Called where the host already computes
 * them (`buildTrackBLearningEvidenceSummary(...).byFamily`), so the metric adds no new readback.
 */
export function recordLearnerFamilyEvidence(
  byFamily: Readonly<Record<string, LearnerFamilyEvidenceCounts>>,
): void {
  for (const [familyId, counts] of Object.entries(byFamily ?? {})) {
    const family = familyAttributes.attributeFor(familyId);
    for (const [dimension, field] of FAMILY_DIMENSION_FIELDS) {
      const value = counts?.[field];
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
      Effect.runSync(
        Metric.update(
          Metric.withAttributes(learnerFamilyDerivations, { family, dimension }),
          value,
        ),
      );
    }
  }
}

/**
 * Run 108 phase-03 F5 (R7 "Metrics"): the queue-state gauges.
 *
 * A depth is a LEVEL, so each gauge is declared once at module scope and SET with
 * `Metric.update(gauge, currentDepth)`; the canonical gauge state is `{ value }` and a second
 * observation REPLACES the first. `Metric.modify` is the delta form and is deliberately not used -
 * a queue that drains from 7 to 3 must read 3, not 10.
 *
 * Sources are the readbacks the host ALREADY performs per tick; this adds no poller:
 *   queued             - the `pendingCount` of the tick's own pending-capture readback
 *                        (`listPendingReplayCaptures`), i.e. captures still owed a replay.
 *   awaiting_evaluation - the durable replay jobs in the awaiting-evaluation state that the tick's
 *                        own pending-dispatch readback observed for the tasks it walked
 *                        (`readPendingRouteDispatches`). The replay plane exposes no whole-census
 *                        depth per tick, so this is a CENSUS OF WHAT THE TICK READ; a tick that
 *                        walks no task leaves the gauge at its last observation.
 *   stranded           - the count the evaluation reconcile pass reported stranded in this sweep
 *                        (`reconcileEvaluationJobs().stranded`).
 */
export const replayQueueQueued = Metric.gauge("role-model.replay.queue.queued", {
  description: "Captures pending replay, as the tick's own pending-capture readback reports them.",
});

export const replayQueueAwaitingEvaluation = Metric.gauge(
  "role-model.replay.queue.awaiting_evaluation",
  {
    description:
      "Durable replay jobs awaiting evaluation, as observed by the tick's pending-dispatch readback.",
  },
);

export const replayQueueStranded = Metric.gauge("role-model.replay.queue.stranded", {
  description: "Evaluation jobs the reconcile pass reported stranded in the current sweep.",
});

export interface ReplayQueueDepths {
  readonly queued?: number;
  readonly awaitingEvaluation?: number;
  readonly stranded?: number;
}

/** A depth is a non-negative whole count; anything else is "not observed" and writes nothing. */
const observedDepth = (value: number | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;

/** SET the gauges the caller observed this tick. An omitted depth is left untouched. */
export function recordQueueDepths(depths: ReplayQueueDepths): void {
  const queued = observedDepth(depths?.queued);
  if (queued !== null) Effect.runSync(Metric.update(replayQueueQueued, queued));
  const awaitingEvaluation = observedDepth(depths?.awaitingEvaluation);
  if (awaitingEvaluation !== null)
    Effect.runSync(Metric.update(replayQueueAwaitingEvaluation, awaitingEvaluation));
  const stranded = observedDepth(depths?.stranded);
  if (stranded !== null) Effect.runSync(Metric.update(replayQueueStranded, stranded));
}

/**
 * Run 108 phase-03 F5 (R7 "Metrics"): the arm-count histogram.
 *
 * A total cannot answer "how many arms does a plan usually carry", so the arm-planning result is
 * recorded as a distribution. The boundaries are EXPLICIT and cover the arm counts this runtime
 * actually produces: the dispatcher plans one arm per eligible counterfactual endpoint, the dev
 * runtime configures twelve endpoints, and the shipped challenge batch is one - so unit steps of
 * two up to twelve, plus Effect's overflow partition, cover the expected range without pretending
 * to resolve a count the planner never produces.
 */
export const REPLAY_ARM_PLAN_BOUNDARIES: ReadonlyArray<number> = Metric.linearBoundaries({
  start: 0,
  width: 2,
  count: 8,
});

/** Planned arms per arm-planning result (the selector call site). */
export const replayArmPlanArms = Metric.histogram("role-model.replay.arm_plan_arms", {
  description: "Arms planned per replay arm-planning result.",
  boundaries: REPLAY_ARM_PLAN_BOUNDARIES,
});

/** Record one arm-planning result. A negative or non-finite count is not an observation. */
export function recordArmPlan(armCount: number): void {
  if (typeof armCount !== "number" || !Number.isFinite(armCount) || armCount < 0) return;
  Effect.runSync(Metric.update(replayArmPlanArms, Math.trunc(armCount)));
}

/**
 * Run 108 phase-03 F5 (R7 "Metrics"): the ladder admission floor.
 *
 * The floor is the rule that decides whether a (role, task) ladder has admitted enough evidence to
 * go active - K finalized effort-comparable comparisons at a mean confidence at or above the
 * product-defaults minimum. It is a RATE, so the counter updates by 1 on every evaluation and the
 * verdict rides the tag: { admitted: "true" | "false" } are the numerator and the denominator of
 * the same measurement, and a refusal is its own visible series.
 */
export const learnerAdmissionFloor = Metric.counter("role-model.learner.admission_floor", {
  description: "Route-ladder admission-floor evaluations, tagged by whether the floor was met.",
  incremental: true,
});

export function recordAdmissionFloor(admitted: boolean): void {
  Effect.runSync(
    Metric.update(
      Metric.withAttributes(learnerAdmissionFloor, { admitted: admitted ? "true" : "false" }),
      1,
    ),
  );
}

/**
 * Run 108 phase-03 F5 (R7 "Metrics"): the ladder-rung count at the materialization outcome.
 *
 * A ladder is a ranked list of rungs, so an outcome that writes a 3-rung ladder and one that
 * writes a 12-rung ladder are different events; the count is a histogram over the same explicit
 * boundaries as the arm plan, because a rung is one admitted endpoint of the same pool.
 */
export const LADDER_RUNG_BOUNDARIES: ReadonlyArray<number> = Metric.linearBoundaries({
  start: 0,
  width: 2,
  count: 8,
});

export const ladderRungs = Metric.histogram("role-model.learner.ladder_rungs", {
  description: "Rungs a route-ladder materialization outcome wrote.",
  boundaries: LADDER_RUNG_BOUNDARIES,
});

/**
 * The rung count a materialization outcome row carries: its own rung list when the row holds one,
 * otherwise the admitted count of its completeness summary. A row that carries neither does NOT
 * mean "zero rungs" - it means the outcome does not measure rungs - so it answers null and the
 * caller records nothing rather than a fabricated zero.
 */
export function ladderRungCountOf(row: unknown): number | null {
  if (row === null || typeof row !== "object" || Array.isArray(row)) return null;
  const record = row as Record<string, unknown>;
  if (Array.isArray(record.rungs)) return record.rungs.length;
  const completeness = record.completeness;
  if (completeness === null || typeof completeness !== "object" || Array.isArray(completeness))
    return null;
  const admitted = (completeness as Record<string, unknown>).admitted;
  return typeof admitted === "number" && Number.isFinite(admitted) && admitted >= 0
    ? Math.trunc(admitted)
    : null;
}

export function recordLadderRungs(rungCount: number): void {
  if (typeof rungCount !== "number" || !Number.isFinite(rungCount) || rungCount < 0) return;
  Effect.runSync(Metric.update(ladderRungs, Math.trunc(rungCount)));
}
