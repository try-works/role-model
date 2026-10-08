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

/** Candidates derived per learner sweep. Tag contract: { outcome: "derived" | "skipped" | "refused" }. */
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

export function recordLearnerDerivation(count: number, outcome: "derived" | "idle"): void {
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
  const grouped = new Map<string, { type: ObservabilityMetricType; series: ObservabilityMetricSeries[] }>();
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
