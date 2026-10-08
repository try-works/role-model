import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import * as Tracer from "effect/Tracer";
import { describe, expect, test } from "vitest";

// Run 108 R7 - the observability spine: module-scope metric declarations for the four chains,
// registry-scoped so tests and per-scope runtimes isolate, per the effect-grep canonical idiom.
import {
  collectObservabilitySnapshot,
  evalFinaliseRefusals,
  learnerDerivations,
  recordFinaliseRefusal,
  recordLearnerDerivation,
  recordReplayAdmission,
  recordRouterDecision,
  replayAdmissions,
  routerDecisions,
  withStageSpan,
} from "../src/run108-observability.js";

const readIn = (
  metric: Metric.Metric<unknown, unknown, unknown>,
  registry: Metric.MetricRegistry,
) =>
  Effect.runSync(
    Metric.value(metric as never).pipe(Effect.provideService(Metric.MetricRegistry, registry)),
  );

describe("run108 R7 the observability spine", () => {
  test("declares the four chain metrics at module scope with the spec namespaces", () => {
    // The declarations exist (collection-level RED today: no module). Reading in a fresh registry
    // yields zero before any update - the module-scope declaration contract.
    const registry = new Map();
    expect(readIn(routerDecisions, registry)).toEqual({ count: 0, incremental: true });
    expect(readIn(replayAdmissions, registry)).toEqual({ count: 0, incremental: true });
    expect(readIn(evalFinaliseRefusals, registry)).toEqual({ count: 0, incremental: true });
    expect(readIn(learnerDerivations, registry)).toEqual({ count: 0, incremental: true });
  });

  test("updates are scoped to the active MetricRegistry and do not leak across registries", () => {
    const registryA = new Map();
    const registryB = new Map();
    Effect.runSync(
      Metric.update(replayAdmissions as never, 2).pipe(
        Effect.provideService(Metric.MetricRegistry, registryA),
      ),
    );
    expect(readIn(replayAdmissions, registryA)).toEqual({ count: 2, incremental: true });
    expect(readIn(replayAdmissions, registryB)).toEqual({ count: 0, incremental: true });
  });

  test("the finalise-refusal counter carries its guard/reason tag contract", () => {
    const registry = new Map();
    const attributed = Metric.withAttributes(evalFinaliseRefusals as never, {
      guard: "declared_pair",
      reason: "submitted_outside_pair",
    });
    Effect.runSync(
      Metric.update(attributed, 1).pipe(Effect.provideService(Metric.MetricRegistry, registry)),
    );
    expect(readIn(attributed, registry)).toEqual({ count: 1, incremental: true });
  });

  test("withStageSpan runs the work under a named span carrying the stage attributes", () => {
    // RED today: no withStageSpan export (collection failure).
    const recorded: Array<{ name: string; attributes: Record<string, unknown> }> = [];
    let completedExit: unknown = null;
    const makeSpan = (name: string): Tracer.Span => {
      const attributes: Record<string, unknown> = {};
      recorded.push({ name, attributes });
      return {
        _tag: "Span",
        name,
        spanId: "span-1",
        traceId: "trace-1",
        parent: Option.none(),
        annotations: Context.empty(),
        status: { _tag: "Started", startTime: 0n },
        attributes: new Map(),
        links: [],
        sampled: true,
        kind: "internal" as Tracer.SpanKind,
        end(_endTime, exit) {
          completedExit = exit;
        },
        attribute(key, value) {
          attributes[key] = value;
        },
        event() {},
        addLinks() {},
      };
    };
    const spy = Tracer.make({
      span(options) {
        return makeSpan(options.name);
      },
    });
    // The tracer is injectable on the sync wrapper (the host is plain TS, not an Effect program).
    const result = withStageSpan("router.decision", { kind: "live" }, () => 42, { tracer: spy });
    expect(result).toBe(42);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.name).toBe("router.decision");
    expect(recorded[0]?.attributes).toEqual({ kind: "live" });
    // completion recorded as effect.exit (canonical convention)
    expect((completedExit as { _tag: string })._tag).toBe("Success");
  });

  test("the production wiring helpers update the default registry and the snapshot reads them", () => {
    // RED today: the helpers do not exist (collection failure). 03.5 review M2/M4: the phase-3
    // call sites were inline (no pinned contract) and the metrics were write-only.
    const before = collectObservabilitySnapshot();
    recordRouterDecision("advisory_applied");
    recordReplayAdmission("replay", 1);
    recordLearnerDerivation(3, "derived");
    recordFinaliseRefusal("finalise", "declared_pair");
    const snapshot = collectObservabilitySnapshot();

    for (const name of [
      "role-model.router.decisions",
      "role-model.replay.admissions",
      "role-model.eval.finalise_refusals",
      "role-model.learner.derivations",
    ]) {
      expect(typeof snapshot[name]?.count).toBe("number");
    }
    // The attributed writes aggregate under the metric name: +1 decision, +1 admission, +3 derivations,
    // +1 refusal over the before snapshot.
    const delta = (name: string): number =>
      (snapshot[name]?.count ?? 0) - (before[name]?.count ?? 0);
    expect(delta("role-model.router.decisions")).toBe(1);
    expect(delta("role-model.replay.admissions")).toBe(1);
    expect(delta("role-model.learner.derivations")).toBe(3);
    expect(delta("role-model.eval.finalise_refusals")).toBe(1);
  });
});

/**
 * Run 108 phase-03 (effect-grep canonicalization F1-F4). One test per defect the audit found in
 * run108-observability.ts, each pinned to the canonical corpus (Effect-TS/effect @460272d).
 */

/** A Tracer that records every span it creates and the Exit each span ended with. */
const recordingTracer = (): {
  readonly tracer: Tracer.Tracer;
  readonly spans: Array<{ name: string; attributes: Record<string, unknown> }>;
  readonly exits: Array<unknown>;
} => {
  const spans: Array<{ name: string; attributes: Record<string, unknown> }> = [];
  const exits: Array<unknown> = [];
  const tracer = Tracer.make({
    span(options) {
      const attributes: Record<string, unknown> = {};
      spans.push({ name: options.name, attributes });
      return {
        _tag: "Span",
        name: options.name,
        spanId: "span-1",
        traceId: "trace-1",
        parent: Option.none(),
        annotations: Context.empty(),
        status: { _tag: "Started", startTime: 0n },
        attributes: new Map(),
        links: [],
        sampled: true,
        kind: "internal" as Tracer.SpanKind,
        end(_endTime: bigint, exit: unknown) {
          exits.push(exit);
        },
        attribute(key: string, value: unknown) {
          attributes[key] = value;
        },
        event() {},
        addLinks() {},
      } as unknown as Tracer.Span;
    },
  });
  return { tracer, spans, exits };
};

/** The F2 readback shape under test: per-series (id, attributes, state) entries. */
interface SnapshotSeries {
  readonly id: string;
  readonly attributes: Record<string, string>;
  readonly state: Record<string, unknown>;
}

interface SnapshotEntry {
  readonly count?: number;
  readonly incremental?: boolean;
  readonly series?: ReadonlyArray<SnapshotSeries>;
}

const snapshotEntry = (name: string): SnapshotEntry | undefined =>
  (collectObservabilitySnapshot() as unknown as Record<string, SnapshotEntry | undefined>)[name];

describe("run108 phase-03 effect-grep canonicalization", () => {
  /**
   * F1 (correctness). A JavaScript throw out of the wrapped callback is a DEFECT, not a typed
   * error: the canonical span completion for it is Exit.die (effect test/Tracer.test.ts, "ends the
   * span when the callback throws", asserts deepStrictEqual(exit, Exit.die(defect))). The baseline
   * completed the span with Exit.fail(error), reporting a typed failure for something that never
   * travelled the typed error channel.
   */
  test("F1: a throwing stage ends its span with a Die exit, not a Fail", () => {
    const { tracer, exits } = recordingTracer();
    const defect = new Error("boom");
    expect(() =>
      withStageSpan(
        "router.decision",
        { kind: "live" },
        () => {
          throw defect;
        },
        { tracer },
      ),
    ).toThrow(defect);
    expect(exits).toHaveLength(1);
    const ended = exits[0] as {
      readonly _tag: string;
      readonly cause?: { readonly reasons: ReadonlyArray<{ readonly _tag: string }> };
    };
    expect(ended._tag).toBe("Failure");
    expect(ended.cause?.reasons.map((reason) => reason._tag)).toEqual(["Die"]);
    // The canonical statement of the same fact, mirroring the upstream assertion.
    expect(ended).toEqual(Exit.die(defect));
  });

  /**
   * F2 (readback value). The snapshot aggregated by metric id and DISCARDED the attributes, so the
   * tag contract the refusal counter exists for - WHICH guard refused, the RC-1 gap - collapsed
   * into one total. Canonical snapshot consumers keep per-series (id, attributes, state). The
   * counter-only state cast also zeroed every gauge and histogram, so the state typing widens to
   * the counter | gauge | histogram union.
   */
  test("F2: two different guard/reason refusals read back as TWO series, not one total", () => {
    recordFinaliseRefusal("finalise", "state=declined reason=insufficient refusal=judge_unresolved");
    recordFinaliseRefusal("finalise", "state=incomplete reason=disagreement refusal=arms_unresolved");
    const refusals = snapshotEntry("role-model.eval.finalise_refusals");
    const refused = (reason: string) =>
      (refusals?.series ?? []).filter((entry) => entry.attributes.reason === reason);
    const insufficient = refused("state=declined reason=insufficient refusal=judge_unresolved");
    expect(insufficient).toHaveLength(1);
    expect(insufficient[0]?.id).toBe("role-model.eval.finalise_refusals");
    expect(insufficient[0]?.attributes).toEqual({
      guard: "finalise",
      reason: "state=declined reason=insufficient refusal=judge_unresolved",
    });
    expect(insufficient[0]?.state).toEqual({ kind: "counter", count: 1, incremental: true });
    // The other refusal is a DIFFERENT series: the readback keeps the tag breakdown instead of
    // folding both refusals into the one id total.
    expect(refused("state=incomplete reason=disagreement refusal=arms_unresolved")).toHaveLength(1);
    expect(refusals?.count).toBeGreaterThanOrEqual(2);
  });

  test("F2: a gauge and a histogram read back through their own state, not a zeroed counter", () => {
    const gauge = Metric.gauge("role-model.test.f2_gauge", { description: "F2 gauge readback." });
    const histogram = Metric.histogram("role-model.test.f2_histogram", {
      description: "F2 histogram readback.",
      boundaries: Metric.linearBoundaries({ start: 0, width: 10, count: 4 }),
    });
    Effect.runSync(Metric.update(gauge as never, 7));
    Effect.runSync(Metric.update(histogram as never, 25));

    const gaugeSeries = snapshotEntry("role-model.test.f2_gauge")?.series ?? [];
    expect(gaugeSeries).toHaveLength(1);
    expect(gaugeSeries[0]?.state).toEqual({ kind: "gauge", value: 7 });

    const histogramSeries = snapshotEntry("role-model.test.f2_histogram")?.series ?? [];
    expect(histogramSeries).toHaveLength(1);
    const histogramState = histogramSeries[0]?.state ?? {};
    expect(histogramState.kind).toBe("histogram");
    expect(Array.isArray(histogramState.buckets)).toBe(true);
    expect(histogramState.count).toBe(1);
    expect(histogramState.sum).toBe(25);
    expect(histogramState.min).toBe(25);
    expect(histogramState.max).toBe(25);
  });
});
