import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import * as Tracer from "effect/Tracer";
import { afterEach, describe, expect, test } from "vitest";

// Run 108 R7 - the observability spine: module-scope metric declarations for the four chains,
// registry-scoped so tests and per-scope runtimes isolate, per the effect-grep canonical idiom.
import {
  LEARNER_FAMILY_ATTRIBUTE_BOUND,
  REPLAY_ARM_PLAN_BOUNDARIES,
  admissionFloorVerdictOf,
  collectObservabilitySnapshot,
  createFamilyAttributeCollapser,
  evalFinaliseRefusals,
  ladderRungCountOf,
  learnerDerivations,
  recordAdmissionFloor,
  recordArmPlan,
  recordFinaliseRefusal,
  recordLadderRungs,
  recordLearnerDerivation,
  recordLearnerFamilyEvidence,
  recordQueueDepths,
  recordReplayAdmission,
  recordRouterDecision,
  replayAdmissions,
  replayQueueAwaitingEvaluation,
  replayQueueQueued,
  replayQueueStranded,
  routerDecisions,
  withStageSpan,
} from "../src/run108-observability.js";

/**
 * The paired private half owns the GENUINE ladder materializer and the knowledge store it writes
 * through. The public CI image checks out only this repository, so the paired case below SKIPS when
 * the private checkout is absent instead of failing on a module that was never fetched (the same
 * pattern as run105-review-advisory-safety and run108-addendum01-a53-refusal-nonterminal).
 */
const ladderPrivateRoot = (() => {
  const configured = process.env.ROLE_MODEL_INTERNAL_WORKTREE ?? process.env.RUN105_PRIVATE_ROOT;
  if (configured && configured.trim().length > 0) return configured.trim();
  const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
  return path.resolve(
    publicRoot,
    "../../../role-model-internal/.worktrees",
    path.basename(publicRoot),
  );
})();
const ladderMaterializerPath = path.join(
  ladderPrivateRoot,
  "shared/route-learning/route-ladder-materialization.mjs",
);
const ladderStorePath = path.join(ladderPrivateRoot, "extensions/knowledge-store/index.mjs");
const pairedLadderTest =
  existsSync(ladderMaterializerPath) && existsSync(ladderStorePath) ? test : test.skip;
const ladderRoots: string[] = [];
afterEach(async () => {
  for (const root of ladderRoots.splice(0)) await rm(root, { recursive: true, force: true });
});

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
    recordReplayAdmission("replay", true);
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
    recordFinaliseRefusal(
      "finalise",
      "state=declined reason=insufficient refusal=judge_unresolved",
    );
    recordFinaliseRefusal(
      "finalise",
      "state=incomplete reason=disagreement refusal=arms_unresolved",
    );
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

  /**
   * F3 (metric semantics). recordReplayAdmission("replay", admitted ? 1 : 0) made refusals
   * INVISIBLE: a refusal added +0, so the counter could not tell "no replay attempt" from "every
   * replay attempt refused". The canonical tagging updates by 1 on every attempt and puts the
   * outcome in the tag - { pass: "replay", admitted: "true" | "false" } - so successes and errors
   * are two series of one counter.
   */
  test("F3: a refused admission counts 1 and tags admitted=false", () => {
    const replaySeries = (admitted: string) =>
      (snapshotEntry("role-model.replay.admissions")?.series ?? []).filter(
        (entry) => entry.attributes.pass === "replay" && entry.attributes.admitted === admitted,
      );

    const before = snapshotEntry("role-model.replay.admissions")?.count ?? 0;
    recordReplayAdmission("replay", false);
    const after = snapshotEntry("role-model.replay.admissions");
    // The refusal moves the counter: at baseline this delta was 0 and the refusal vanished.
    expect((after?.count ?? 0) - before).toBe(1);
    const refused = replaySeries("false");
    expect(refused).toHaveLength(1);
    expect(refused[0]?.attributes).toEqual({ pass: "replay", admitted: "false" });
    expect(refused[0]?.state).toEqual({ kind: "counter", count: 1, incremental: true });

    // An admitted pass is its own series under the same metric id.
    const admittedBefore = (replaySeries("true")[0]?.state.count as number | undefined) ?? 0;
    recordReplayAdmission("replay", true);
    const admitted = replaySeries("true");
    expect(admitted).toHaveLength(1);
    expect(((admitted[0]?.state.count as number | undefined) ?? 0) - admittedBefore).toBe(1);
    expect(replaySeries("false")).toHaveLength(1);
  });

  /**
   * F4 (contract hygiene). The module JSDoc declared the learner outcome vocabulary
   * "derived" | "skipped" | "refused" while recordLearnerDerivation accepts "derived" | "idle" and
   * the sweep passes "idle" - a documented tag contract the code cannot produce. One bounded
   * vocabulary, declared once (the vocabulary the code actually needs: the sweep has derived/idle),
   * shared by the JSDoc, the type and the call site.
   */
  test("F4: the learner outcome vocabulary is declared once and matches the code", () => {
    const moduleSource = readFileSync(
      new URL("../src/run108-observability.ts", import.meta.url),
      "utf8",
    );
    // declared once, as a type the JSDoc contract and the wiring helper share
    expect(moduleSource).toContain('export type LearnerDerivationOutcome = "derived" | "idle";');
    const contract = moduleSource
      .split("\n")
      .find((line) => line.includes("Tag contract:") && line.includes("outcome"));
    // the declared contract is THE vocabulary: no member the helper cannot accept
    expect(contract).toContain('{ outcome: "derived" | "idle" }');
    expect(contract).not.toContain("skipped");
    expect(contract).not.toContain("refused");
    // the helper takes the declared type, so JSDoc, type and call site cannot drift apart again
    expect(moduleSource).toContain("outcome: LearnerDerivationOutcome");

    // the sweep that writes the metric passes exactly those members
    const sweepSource = readFileSync(
      new URL("../src/track-b-auto-replay-runtime.ts", import.meta.url),
      "utf8",
    );
    expect(sweepSource).toContain(
      'recordLearnerDerivation(derivedCandidates, derivedCandidates > 0 ? "derived" : "idle")',
    );

    // and the runtime accepts exactly the declared members
    recordLearnerDerivation(2, "idle");

    const idle = (snapshotEntry("role-model.learner.derivations")?.series ?? []).filter(
      (entry) => entry.attributes.outcome === "idle",
    );
    expect(idle).toHaveLength(1);
  });
});

/**
 * Run 108 phase-03 F5 (R7 "Metrics" list completion). An effect-grep audit (generation
 * local-e7d9d448) verified the canonical v4 shapes and F2 readback now carries gauge and
 * histogram state plus per-attribute series, so the remaining R7 entries are added here WITHOUT
 * reshaping the spine: one module-scope declaration per metric, one pinned wiring helper, one
 * series shape.
 */
describe("run108 phase-03 F5 the R7 metric list in canonical shapes", () => {
  /**
   * F5-a (per-family counters). R7 asks for decisive/holdout/development/distinct per task family.
   * The canonical shape is ONE counter with a BOUNDED family attribute and a dimension tag - a
   * dynamic metric name per family would grow the registry with every task family the store ever
   * reports, which is the noncanonical form the audit rejects.
   */
  test("F5-a: ONE per-family counter carries family+dimension tags, never a dynamic metric name", () => {
    const before = snapshotEntry("role-model.learner.family_derivations");
    recordLearnerFamilyEvidence({
      "coder.review": {
        decisiveComparisons: 3,
        holdoutComparisons: 2,
        developmentComparisons: 1,
        distinctCaptures: 4,
      },
    });
    const snapshot = collectObservabilitySnapshot();
    // exactly ONE id: the family never becomes part of the metric name
    expect(Object.keys(snapshot).filter((id) => id.includes("family_derivations"))).toEqual([
      "role-model.learner.family_derivations",
    ]);

    const series = snapshotEntry("role-model.learner.family_derivations")?.series ?? [];
    const dimension = (name: string) =>
      series.find(
        (entry) =>
          entry.attributes.family === "coder.review" && entry.attributes.dimension === name,
      );
    const countOf = (name: string): number =>
      (dimension(name)?.state.count as number | undefined) ?? 0;
    const beforeCount = (name: string): number =>
      (before?.series ?? [])
        .filter(
          (entry) =>
            entry.attributes.family === "coder.review" && entry.attributes.dimension === name,
        )
        .reduce((total, entry) => total + ((entry.state.count as number | undefined) ?? 0), 0);

    // one series per (family, dimension) pair, each with the counter state
    expect(dimension("decisive")?.attributes).toEqual({
      family: "coder.review",
      dimension: "decisive",
    });
    expect(dimension("decisive")?.state).toEqual({
      kind: "counter",
      count: beforeCount("decisive") + 3,
      incremental: true,
    });
    expect(countOf("holdout") - beforeCount("holdout")).toBe(2);
    expect(countOf("development") - beforeCount("development")).toBe(1);
    expect(countOf("distinct") - beforeCount("distinct")).toBe(4);
  });

  /**
   * F5-a (bounded attribute space). The registry cannot grow per distinct id, so family ids beyond
   * a small bound collapse onto ONE overflow attribute. The collapse is explicit and deterministic:
   * an id already admitted keeps its own series, and only the overflow shares.
   */
  test("F5-a: family ids beyond the bound collapse onto the single other attribute", () => {
    const collapser = createFamilyAttributeCollapser(2);
    expect(collapser.attributeFor("coder.review")).toBe("coder.review");
    expect(collapser.attributeFor("writer.release_notes")).toBe("writer.release_notes");
    // beyond the bound: the id is NOT admitted, it collapses
    expect(collapser.attributeFor("planner.dependency.map")).toBe("other");
    // and the collapse is stable, not a re-bucketing of ids already admitted
    expect(collapser.attributeFor("coder.review")).toBe("coder.review");
    expect(collapser.admittedCount).toBe(2);

    // through the metric: many distinct families cannot grow the registry past the bound + "other"
    for (let index = 0; index < LEARNER_FAMILY_ATTRIBUTE_BOUND + 40; index += 1) {
      recordLearnerFamilyEvidence({
        [`f5-overflow-family-${index}`]: { decisiveComparisons: 1 },
      });
    }
    const families = new Set(
      (snapshotEntry("role-model.learner.family_derivations")?.series ?? []).map(
        (entry) => entry.attributes.family,
      ),
    );
    expect(families.size).toBeLessThanOrEqual(LEARNER_FAMILY_ATTRIBUTE_BOUND + 1);
    expect(families.has("other")).toBe(true);
  });

  /**
   * F5-b (queue-state gauges). A depth is a level, not a running total, so each gauge is declared
   * once at module scope and SET with Metric.update(gauge, currentDepth) - the canonical gauge state
   * is { value }. Metric.modify is for deltas and is deliberately NOT used here.
   */
  test("F5-b: queue depths are gauges - SET semantics, read back as { value }", () => {
    // declaration contract: a fresh registry reads the level 0 before any observation
    const registry = new Map();
    expect(readIn(replayQueueQueued, registry)).toEqual({ value: 0 });
    expect(readIn(replayQueueAwaitingEvaluation, registry)).toEqual({ value: 0 });
    expect(readIn(replayQueueStranded, registry)).toEqual({ value: 0 });

    recordQueueDepths({ queued: 7, awaitingEvaluation: 2, stranded: 1 });
    const gaugeValue = (name: string): number | undefined =>
      (snapshotEntry(name)?.series ?? [])
        .map((entry) => entry.state.value as number | undefined)
        .find((value) => typeof value === "number");
    expect(gaugeValue("role-model.replay.queue.queued")).toBe(7);
    expect(gaugeValue("role-model.replay.queue.awaiting_evaluation")).toBe(2);
    expect(gaugeValue("role-model.replay.queue.stranded")).toBe(1);

    // SET semantics: a later observation REPLACES the level rather than adding to it
    recordQueueDepths({ queued: 3 });
    expect(gaugeValue("role-model.replay.queue.queued")).toBe(3);
    // ... and an omitted depth leaves its own gauge untouched
    expect(gaugeValue("role-model.replay.queue.awaiting_evaluation")).toBe(2);
    expect(gaugeValue("role-model.replay.queue.stranded")).toBe(1);

    // the canonical gauge series state, one series per gauge
    const queuedSeries = snapshotEntry("role-model.replay.queue.queued")?.series ?? [];
    expect(queuedSeries).toHaveLength(1);
    expect(queuedSeries[0]?.state).toEqual({ kind: "gauge", value: 3 });
    expect(snapshotEntry("role-model.replay.queue.queued")?.type).toBe("Gauge");
  });

  /**
   * F5-c (arm-count histogram). R7 wants the DISTRIBUTION of planned arm counts, which a counter
   * cannot carry, so the metric is a histogram with explicit boundaries over the expected arm
   * counts. Effect keeps cumulative buckets whose last entry is [null, total].
   */
  test("F5-c: the arm-plan histogram has explicit boundaries and counts every planning result", () => {
    const histogramState = (name: string) => {
      const state = (snapshotEntry(name)?.series ?? [])[0]?.state ?? {};
      return state as {
        kind?: string;
        count?: number;
        sum?: number;
        buckets?: ReadonlyArray<readonly [number | null, number]>;
      };
    };
    const before = histogramState("role-model.replay.arm_plan_arms");
    recordArmPlan(2);
    recordArmPlan(9);
    const after = histogramState("role-model.replay.arm_plan_arms");

    expect(after.kind).toBe("histogram");
    expect((after.count ?? 0) - (before.count ?? 0)).toBe(2);
    expect((after.sum ?? 0) - (before.sum ?? 0)).toBe(11);

    // explicit boundaries: an increasing finite set that reaches the expected arm counts, and a
    // final overflow partition that carries every observation
    const finite = REPLAY_ARM_PLAN_BOUNDARIES.filter((bound) => Number.isFinite(bound));
    expect(finite.length).toBeGreaterThanOrEqual(4);
    expect([...finite].sort((left, right) => left - right)).toEqual(finite);
    expect(Math.max(...finite)).toBeGreaterThanOrEqual(6);
    // the last boundary is the overflow partition (Effect represents it as Infinity)
    expect(REPLAY_ARM_PLAN_BOUNDARIES[REPLAY_ARM_PLAN_BOUNDARIES.length - 1]).toBe(
      Number.POSITIVE_INFINITY,
    );

    // the boundaries DISCRIMINATE: the 2-arm plan lands at or below boundary 2 while the 9-arm plan
    // does not, so the two plans are separable in the readback
    const cumulativeAt = (state: ReturnType<typeof histogramState>, boundary: number): number =>
      (state.buckets ?? []).find((bucket) => bucket[0] === boundary)?.[1] ?? 0;
    expect(cumulativeAt(after, 2) - cumulativeAt(before, 2)).toBe(1);
    const buckets = after.buckets ?? [];
    expect(buckets[buckets.length - 1]?.[0]).toBe(Number.POSITIVE_INFINITY);
    expect(buckets[buckets.length - 1]?.[1]).toBe(after.count);
  });

  /**
   * F5-d (admission-floor admission rate). The ladder admission floor is the K-comparisons-at-mean-
   * confidence rule the dispatcher already evaluates, so ONE counter tagged admitted true/false
   * carries the rate: the two series are its numerator and denominator.
   */
  test("F5-d: the ladder admission floor counts both verdicts as tagged series", () => {
    const seriesFor = (admitted: string) =>
      (snapshotEntry("role-model.learner.admission_floor")?.series ?? []).filter(
        (entry) => entry.attributes.admitted === admitted,
      );
    const countFor = (admitted: string): number =>
      (seriesFor(admitted)[0]?.state.count as number | undefined) ?? 0;
    const beforeTrue = countFor("true");
    const beforeFalse = countFor("false");

    recordAdmissionFloor(true);
    recordAdmissionFloor(false);
    recordAdmissionFloor(false);

    expect(countFor("true") - beforeTrue).toBe(1);
    expect(countFor("false") - beforeFalse).toBe(2);
    expect(seriesFor("true")[0]?.attributes).toEqual({ admitted: "true" });
    expect(seriesFor("false")[0]?.state).toEqual({
      kind: "counter",
      count: beforeFalse + 2,
      incremental: true,
    });
  });

  /**
   * F5-d (ladder-rung count at the materialization outcome). The outcome names the rungs it wrote;
   * a row that names neither rungs nor admitted completeness is NOT a zero-rung ladder - it is an
   * outcome that does not carry the measurement, and nothing is recorded for it.
   */
  test("F5-d: the ladder-rung count reads the materialization outcome and skips an unmeasured row", () => {
    expect(ladderRungCountOf({ status: "written", rungs: [{}, {}, {}] })).toBe(3);
    expect(
      ladderRungCountOf({ status: "written", completeness: { admitted: 5, configured: 12 } }),
    ).toBe(5);
    expect(ladderRungCountOf({ status: "written", completeness: { admitted: 0 } })).toBe(0);
    expect(ladderRungCountOf({ status: "written" })).toBe(null);
    expect(ladderRungCountOf(null)).toBe(null);

    const stateOf = () =>
      ((snapshotEntry("role-model.learner.ladder_rungs")?.series ?? [])[0]?.state ?? {}) as {
        count?: number;
        sum?: number;
      };
    const before = stateOf();
    recordLadderRungs(3);
    const after = stateOf();
    expect((after.count ?? 0) - (before.count ?? 0)).toBe(1);
    expect((after.sum ?? 0) - (before.sum ?? 0)).toBe(3);
  });

  /**
   * F5-d REPAIR (run 108 follow-up, the broken emit the compliance audit found). Measured against the
   * deployed commit: five "[run105] ladder materialization wrote 1 ladder row(s)" lines produced ZERO
   * live series, because the outcome entry does not carry the measurement at its OWN level. The
   * genuine materializer (paired private checkout, real SQLite store) answers an entry whose keys are
   * exactly roleId,taskTypeId,scopeId,status,ladder,metadata - the rungs and the completeness live on
   * the PERSISTED RouteLadderPackV1 under `ladder`, which is the row the store accepted (the same
   * rungs re-read from knowledge_route_ladders). The reader must therefore count the persisted row.
   */
  test("F5-d fix: the ladder-rung count reads the PERSISTED ladder row the outcome carries", () => {
    // Transcribed from a real materialization outcome: 12 configured endpoints, 2 admitted, so the
    // persisted row holds two rungs and completeness { admitted: 2, configured: 12 }.
    const outcomeEntry = {
      roleId: "role:coder",
      taskTypeId: "task:review",
      scopeId: "tenant:run108-ladder",
      status: "written",
      ladder: {
        roleId: "role:coder",
        taskTypeId: "task:review",
        scopeId: "tenant:run108-ladder",
        contract: "RouteLadderPackV1",
        packId: "ca4641aeab7ed6b37a36185d6dc6d5738f337c0e49a281d6582288cceaf7862b",
        rungs: [
          { endpointId: "endpoint:a", rank: 1, status: "available" },
          { endpointId: "endpoint:b", rank: 2, status: "available" },
        ],
        completeness: { admitted: 2, configured: 12 },
        version: 1,
        expectedVersion: 0,
        preserveRollback: true,
        nextEligibleAtMs: 2000,
        taxonomyVersion: "taxonomy:108",
        rolledBack: { on: false, reason: null, atMs: null },
        metadata: { admissionPolicy: { minComparisons: 1, minConfidence: 0.7 } },
      },
      metadata: { admissionPolicy: { minComparisons: 1, minConfidence: 0.7 }, confidence: 0.8 },
    };
    expect(ladderRungCountOf(outcomeEntry)).toBe(2);

    // a persisted row without a rung list still answers its own admitted completeness
    expect(
      ladderRungCountOf({
        status: "written",
        ladder: { completeness: { admitted: 2, configured: 12 } },
      }),
    ).toBe(2);
    // the PERSISTED row wins over a value carried beside it: the metric counts what the store wrote
    expect(
      ladderRungCountOf({ status: "written", rungs: [{}, {}, {}], ladder: { rungs: [{}, {}] } }),
    ).toBe(2);
    // and an outcome that carries no persisted row at all is still NOT a zero-rung ladder
    expect(ladderRungCountOf({ status: "written" })).toBe(null);

    // through the metric, at the CLI's own seam (cli.ts:6797-6798 records when the count is non-null)
    const stateOf = () =>
      ((snapshotEntry("role-model.learner.ladder_rungs")?.series ?? [])[0]?.state ?? {}) as {
        count?: number;
        sum?: number;
      };
    const before = stateOf();
    const recorded = ladderRungCountOf(outcomeEntry);
    expect(recorded).toBe(2);
    if (recorded !== null) recordLadderRungs(recorded);
    const after = stateOf();
    expect((after.count ?? 0) - (before.count ?? 0)).toBe(1);
    expect((after.sum ?? 0) - (before.sum ?? 0)).toBe(2);
  });

  /**
   * F5-d REPAIR, anti-drift half. The literal above is only as good as the shape it transcribes, so
   * this case drives the GENUINE materializer over a real SQLite store and asserts the recorded count
   * EQUALS the rungs the store persisted - never a value reconstructed beside them.
   */
  pairedLadderTest(
    "F5-d fix (paired): the genuine materializer's written outcome records the PERSISTED rung count",
    async () => {
      const scopeId = "tenant:run108-ladder";
      const roleId = "role:coder";
      const taskTypeId = "task:review";
      const { run } = (await import(/* @vite-ignore */ pathToFileURL(ladderStorePath).href)) as {
        run: (input: Record<string, unknown>) => Promise<unknown>;
      };
      const { createRouteLadderStoreAdapter, materializeRouteLadders } = (await import(
        /* @vite-ignore */ pathToFileURL(ladderMaterializerPath).href
      )) as {
        createRouteLadderStoreAdapter: (input: Record<string, unknown>) => Record<string, unknown>;
        materializeRouteLadders: (
          input: Record<string, unknown>,
        ) => Promise<{ ladders: Array<Record<string, unknown>> }>;
      };
      const root = await mkdtemp(path.join(tmpdir(), "run108-ladder-rungs-"));
      ladderRoots.push(root);
      const filePath = path.join(root, "knowledge.sqlite");
      const invoke = async (capability: string, value: Record<string, unknown>) =>
        run({
          capability,
          channel: "development",
          scope: scopeId,
          authorizationEpoch: 108,
          payload: { ...value, filePath },
        });
      const adapter = createRouteLadderStoreAdapter({
        invoke: async (_id: string, envelope: { capability: string; payload: unknown }) =>
          invoke(envelope.capability, envelope.payload as Record<string, unknown>),
        envelope: {
          channel: "development",
          scope: scopeId,
          authorizationEpoch: 108,
          payload: { filePath },
        },
      });
      const finalized = (groupId: string, confidence: number) => ({
        groupId,
        status: "finalized",
        outcome: "source",
        winnerTrialId: `${groupId}:a`,
        winnerRole: "source",
        createdAtMs: 1000,
        comparability: {
          roleId,
          taskTypeId,
          taxonomyVersion: "taxonomy:108",
          sourceCandidateRef: "endpoint:a",
          counterfactualCandidateRef: "endpoint:b",
        },
        scorerDisagreement: false,
        scorerOutcomes: [{ scorerKey: "judge", outcome: "source" }],
        validityIssues: [],
        effortComparability: [
          {
            endpointId: "endpoint:b",
            modelId: "b",
            sourceModelId: "a",
            reasoningEffort: "high",
            sourceReasoningEffort: "high",
            comparability: "matched",
          },
        ],
        members: [
          { trialId: `${groupId}:a`, candidateRef: "endpoint:a", role: "source", confidence },
          {
            trialId: `${groupId}:b`,
            candidateRef: "endpoint:b",
            role: "counterfactual",
            confidence: 0.75,
          },
        ],
      });
      const outcome = await materializeRouteLadders({
        groups: [finalized("g1", 0.9), finalized("g2", 0.8)],
        configuredEndpointIds: [
          "endpoint:a",
          "endpoint:b",
          ...Array.from(
            { length: 10 },
            (_, index) => `endpoint:pool${String(index + 1).padStart(2, "0")}`,
          ),
        ],
        ...adapter,
        defaults: { minComparisons: 1, minConfidence: 0.7, stalenessWindowDays: 30 },
        nowMs: 2000,
        taxonomyVersion: "taxonomy:108",
        scopeId,
      });
      const entry = outcome.ladders.find((row) => row.status === "written");
      expect(entry).toBeDefined();
      if (!entry) return;
      // the entry does NOT measure rungs at its own level - the exact reason the old reader saw null
      expect(entry.rungs).toBeUndefined();
      expect(entry.completeness).toBeUndefined();
      const persisted = entry.ladder as {
        rungs: unknown[];
        completeness: { admitted: number; configured: number };
      };
      expect(persisted.completeness).toEqual({ admitted: 2, configured: 12 });
      expect(persisted.rungs).toHaveLength(2);
      const stored = (await invoke("knowledge:read-route-ladder", {
        scopeId,
        roleId,
        taskTypeId,
      })) as {
        ladder: { rungs: unknown[] };
      };
      // the row the outcome carries IS the row the store persisted
      expect(stored.ladder.rungs).toEqual(persisted.rungs);

      // the count recorded is the PERSISTED count
      const recorded = ladderRungCountOf(entry);
      expect(recorded).toBe(2);
      expect(recorded).toBe(stored.ladder.rungs.length);
    },
  );

  /**
   * F5 wiring. A metric the production seams never write is the M4 defect in a new dress (declared,
   * read back, and always zero), so each F5 helper is pinned to the seam that owns its measurement.
   */
  test("F5: every F5 helper is called from the production seam it measures", () => {
    const source = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");
    const autoReplay = source("../src/track-b-auto-replay-runtime.ts");
    expect(autoReplay).toContain("recordQueueDepths(");
    expect(autoReplay).not.toContain("recordAdmissionFloor(met)");
    // Run 108 addendum-04: the emit was re-sited to the materialization outcome in cli.ts, so the
    // wiring pin follows it there instead of asserting it still lives in the auto-replay sweep.
    expect(
      admissionFloorVerdictOf({
        status: "insufficient_evidence",
        ladder: { completeness: { admitted: 0 } },
      }),
    ).toBe(false);
    const cli = source("../src/cli.ts");
    expect(cli).toContain("recordArmPlan(");
    // Run 108 follow-up: the rung count must reach the recorder THROUGH the reader that owns the
    // outcome-entry shape, or the emit silently measures nothing again.
    expect(cli).toContain("ladderRungCountOf(");
    expect(cli).toContain("recordLadderRungs(");
    expect(cli).toContain("recordLearnerFamilyEvidence(");
    expect(source("../src/track-b-learning-pass.ts")).toContain("recordLearnerFamilyEvidence(");
  });
});

describe("run108 addendum-04 - the admission floor is counted at the MATERIALIZATION outcome", () => {
  test("counts the PERSISTED row verdict, and the refusal case is reachable", () => {
    // "written" with a full admitted count, and the steady-state "unchanged" row - both passed the floor.
    expect(
      admissionFloorVerdictOf({
        status: "written",
        ladder: { completeness: { admitted: 8, configured: 12 } },
      }),
    ).toBe(true);
    expect(
      admissionFloorVerdictOf({ status: "unchanged", ladder: { completeness: { admitted: 7 } } }),
    ).toBe(true);
    // THE case the old in-flight-challenge emit could never reach: a row the floor REFUSED.
    expect(
      admissionFloorVerdictOf({
        status: "insufficient_evidence",
        ladder: { completeness: { admitted: 0, configured: 12 } },
      }),
    ).toBe(false);
  });

  test("skips rows that carry no admitted count rather than inventing a refusal", () => {
    expect(admissionFloorVerdictOf({ status: "written", ladder: { rungs: [{}, {}] } })).toBeNull();
    expect(admissionFloorVerdictOf({ status: "refused" })).toBeNull();
    expect(admissionFloorVerdictOf(null)).toBeNull();
    expect(admissionFloorVerdictOf("nonsense")).toBeNull();
  });

  test("the persisted row WINS over a value carried beside it", () => {
    expect(
      admissionFloorVerdictOf({
        status: "written",
        completeness: { admitted: 0 },
        ladder: { completeness: { admitted: 5 } },
      }),
    ).toBe(true);
  });
});
