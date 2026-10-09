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
  type ObservabilityScope,
  REPLAY_ARM_PLAN_BOUNDARIES,
  admissionFloorVerdictOf,
  collectObservabilitySnapshot,
  createFamilyAttributeCollapser,
  createObservabilityScope,
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
// The GENUINE producer of the per-family evidence the recorder reads (F5-a). Importing it is what
// makes the key pin behavioural instead of self-referential: the F5-a case hand-built `byFamily` with
// the recorder's OWN key names, so it could only ever agree with itself (03.5 re-review M5).
import { buildTrackBLearningEvidenceSummary } from "../src/track-b-learning-pass.js";

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

  test("the production wiring helpers update the SCOPE registry and the snapshot reads THAT", () => {
    // 03.5 review M2/M4: the phase-3 call sites were inline (no pinned contract) and the metrics were
    // write-only.
    //
    // Run 108 follow-up: this case used to read through the DEFAULT registry - it was named "...
    // update the default registry ..." and passed only because the wiring helpers and the readback
    // both fell back to Effect's process-global default Map. That is the defect, not the contract: the
    // scope is now built here and handed to BOTH ends, so the assertion is about THIS scope's
    // registry and can only be satisfied by the helpers recording into it.
    const scope = createObservabilityScope("run108-observability:wiring-helpers");
    const before = collectObservabilitySnapshot(scope);
    recordRouterDecision("advisory_applied", scope);
    recordReplayAdmission("replay", true, scope);
    recordLearnerDerivation(3, "derived", scope);
    recordFinaliseRefusal("finalise", "declared_pair", scope);
    const snapshot = collectObservabilitySnapshot(scope);

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

    // ...and a SECOND scope that recorded nothing reads nothing: the same four ids are absent from it,
    // so the delta above cannot have come from a registry the two scopes share.
    const other = collectObservabilitySnapshot(createObservabilityScope("no-writes"));
    for (const name of Object.keys(snapshot)) {
      expect(other[name]).toBeUndefined();
    }
  });

  /**
   * RED-FIRST CASE (run 108 follow-up, the per-runtime-scope registry fix).
   *
   * THE DEFECT: every recorder and the readback call bare Effect.runSync(Metric.update(...)) /
   * Effect.runSync(Metric.snapshot) with NO registry provided, so all of them resolve to the
   * PROCESS-GLOBAL default Map. Effect states the contract itself (vendor/effect Metric.ts
   * :1638-1668): MetricRegistry is a Context.Reference with `defaultValue: () => new Map()` and
   * "Because Context.Reference caches default values, the default Map is shared by contexts that do
   * not provide an override. Provide MetricRegistry with a fresh Map when isolation matters."
   *
   * THE SCENARIO: ONE runtime scope records through the PRODUCTION recorder; a SECOND scope records
   * the SAME metric id. The first scope's readback must not move. It moves today, which is the leak.
   */
  test("scope isolation: a second scope's write leaves this scope's snapshot untouched", () => {
    const scope = createObservabilityScope("run108-observability:isolation-a");
    // THIS SCOPE records through the production wiring helper ...
    const before = collectObservabilitySnapshot(scope);
    recordRouterDecision("advisory_applied", scope);

    // ... and a DIFFERENT runtime scope records the SAME metric id by hand. This is the RED that
    // failed before the fix: with no registry provided, that hand write resolved to the same
    // process-global default Map the recorder had just written into, so it landed in THIS scope's
    // readback and the delta below was 6 instead of 1.
    const other = createObservabilityScope("run108-observability:isolation-b");
    Effect.runSync(
      Metric.update(routerDecisions as never, 5).pipe(
        Effect.provideService(Metric.MetricRegistry, other.registry),
      ),
    );
    // ... and so does a writer that provides NO registry at all - the bare default Map every recorder
    // in this module used to resolve to.
    Effect.runSync(Metric.update(routerDecisions as never, 5));

    const after = collectObservabilitySnapshot(scope);
    const delta =
      (after["role-model.router.decisions"]?.count ?? 0) -
      (before["role-model.router.decisions"]?.count ?? 0);
    expect(delta).toBe(1);
    // the second scope's own registry holds its five, so the isolation is real and not a dropped write
    const isolated = collectObservabilitySnapshot(other)["role-model.router.decisions"]?.count ?? 0;
    expect(isolated).toBe(5);
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

/**
 * Read ONE metric id back from ONE runtime scope's registry. Every case below builds its own scope
 * (run 108 follow-up, the per-runtime-scope registry fix) so the readback can only ever see what that
 * case itself recorded - never a write another case, another runtime, or the process-global default
 * Map happened to make.
 */
const snapshotEntry = (scope: ObservabilityScope, name: string): SnapshotEntry | undefined =>
  (collectObservabilitySnapshot(scope) as unknown as Record<string, SnapshotEntry | undefined>)[
    name
  ];

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
    const scope = createObservabilityScope("run108-observability:f2-refusals");
    recordFinaliseRefusal(
      "finalise",
      "state=declined reason=insufficient refusal=judge_unresolved",
      scope,
    );
    recordFinaliseRefusal(
      "finalise",
      "state=incomplete reason=disagreement refusal=arms_unresolved",
      scope,
    );
    const refusals = snapshotEntry(scope, "role-model.eval.finalise_refusals");
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
    // Both ends on ONE registry, as the contract requires: a write with no registry provided lands
    // in Effect's process-global default Map, which this scope's readback must never show.
    const scope = createObservabilityScope("run108-observability:f2-families");
    const writeIn = (metric: unknown, value: number) =>
      Effect.runSync(
        Metric.update(metric as never, value).pipe(
          Effect.provideService(Metric.MetricRegistry, scope.registry),
        ),
      );
    writeIn(gauge, 7);
    writeIn(histogram, 25);

    const gaugeSeries = snapshotEntry(scope, "role-model.test.f2_gauge")?.series ?? [];
    expect(gaugeSeries).toHaveLength(1);
    expect(gaugeSeries[0]?.state).toEqual({ kind: "gauge", value: 7 });

    const histogramSeries = snapshotEntry(scope, "role-model.test.f2_histogram")?.series ?? [];
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
    const scope = createObservabilityScope("run108-observability:f3-refusal");
    const replaySeries = (admitted: string) =>
      (snapshotEntry(scope, "role-model.replay.admissions")?.series ?? []).filter(
        (entry) => entry.attributes.pass === "replay" && entry.attributes.admitted === admitted,
      );

    const before = snapshotEntry(scope, "role-model.replay.admissions")?.count ?? 0;
    recordReplayAdmission("replay", false, scope);
    const after = snapshotEntry(scope, "role-model.replay.admissions");
    // The refusal moves the counter: at baseline this delta was 0 and the refusal vanished.
    expect((after?.count ?? 0) - before).toBe(1);
    const refused = replaySeries("false");
    expect(refused).toHaveLength(1);
    expect(refused[0]?.attributes).toEqual({ pass: "replay", admitted: "false" });
    expect(refused[0]?.state).toEqual({ kind: "counter", count: 1, incremental: true });

    // An admitted pass is its own series under the same metric id.
    const admittedBefore = (replaySeries("true")[0]?.state.count as number | undefined) ?? 0;
    recordReplayAdmission("replay", true, scope);
    const admitted = replaySeries("true");
    expect(admitted).toHaveLength(1);
    expect(((admitted[0]?.state.count as number | undefined) ?? 0) - admittedBefore).toBe(1);
    expect(replaySeries("false")).toHaveLength(1);

    // m4 (03.5 re-review): the declaration's DESCRIPTION has to state what the counter now counts. F3
    // made every attempt count and moved the outcome into the attribute, but the description still read
    // "Captures admitted for replay." - a claim the counter no longer makes. Read back through
    // Metric.snapshot, the same readback the operator surface consumes.
    const declared = (
      Effect.runSync(
        Metric.snapshot.pipe(Effect.provideService(Metric.MetricRegistry, scope.registry)),
      ) as unknown as ReadonlyArray<{
        id: string;
        description?: string;
      }>
    ).find((entry) => entry.id === "role-model.replay.admissions");
    expect(declared?.description).toBe(
      "Replay admission attempts, tagged by whether the capture was admitted.",
    );
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
    // The same pin, now carrying the runtime scope: the sweep still passes EXACTLY the declared
    // vocabulary, and it passes the scope that vocabulary is recorded into (run 108 follow-up - a
    // call that dropped the scope would record nothing at all, which is the M4 class this guards).
    expect(sweepSource).toMatch(
      /recordLearnerDerivation\(\s*derivedCandidates,\s*derivedCandidates > 0 \? "derived" : "idle",\s*observabilityScope,?\s*\)/,
    );

    // and the runtime accepts exactly the declared members
    const scope = createObservabilityScope("run108-observability:f4-vocabulary");
    recordLearnerDerivation(2, "idle", scope);

    const idle = (snapshotEntry(scope, "role-model.learner.derivations")?.series ?? []).filter(
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
/**
 * The per-family evidence a learning pass derives, produced by the GENUINE producer
 * (`buildTrackBLearningEvidenceSummary`, track-b-learning-pass.ts:980) from the comparison shape the
 * pass consumes (:1107-1270): one finalized decisive outcome whose comparability names the route
 * package and the task family, with the holdout AND the development partition populated, so all four
 * per-family dimensions are non-zero. The F5-a cases below drive the recorder with THIS object, so a
 * renamed producer key records nothing instead of silently agreeing with a hand-built literal.
 */
const learnFamilyEvidence = (
  family: string,
  routePackage: string,
): ReturnType<typeof buildTrackBLearningEvidenceSummary>["byFamily"] =>
  buildTrackBLearningEvidenceSummary({
    groups: [
      {
        groupId: "g1",
        result: {
          groupId: "g1",
          status: "finalized",
          outcome: "source",
          validityIssues: [],
          developmentPartition: { caseIds: ["case-1"] },
        },
        comparability: {
          taskTypeId: family,
          sourceCandidateRef: routePackage,
          counterfactualCandidateRef: "endpoint:b",
          inputRef: "capture-1",
        },
        holdout: { caseIds: ["case-1"] },
      },
    ],
    routePackage,
    nowMs: 1_000_000,
    evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
  }).byFamily;

/**
 * The keys the learning pass' `byFamily[family] = { ... }` literal emits, in source order
 * (track-b-learning-pass.ts:1346-1350). Read from the SOURCE on purpose: the list the recorder
 * iterates lives in another file (run108-observability.ts FAMILY_DIMENSION_FIELDS), and the point of
 * the pin is that the two lists cannot drift apart unnoticed - the ladder_rungs failure mode, where a
 * producer/consumer shape mismatch left a declared metric permanently unobserved.
 */
const emittedByFamilyKeys = (source: string): ReadonlyArray<string> => {
  const marker = /^([ \t]*)byFamily\[family\] = \{$/m.exec(source);
  if (marker === null) return [];
  const indent = `${marker[1]}  `;
  const closing = new RegExp(`^${marker[1]}\\};?\\s*$`);
  const keys: string[] = [];
  const body = source
    .slice((marker.index ?? 0) + marker[0].length)
    .split("\n")
    .slice(1);
  for (const line of body) {
    if (closing.test(line)) break;
    const key = new RegExp(`^${indent}([A-Za-z_$][A-Za-z0-9_$]*)\\s*:`).exec(line);
    if (key?.[1] !== undefined) keys.push(key[1]);
  }
  return keys;
};

describe("run108 phase-03 F5 the R7 metric list in canonical shapes", () => {
  /**
   * F5-a (per-family counters). R7 asks for decisive/holdout/development/distinct per task family.
   * The canonical shape is ONE counter with a BOUNDED family attribute and a dimension tag - a
   * dynamic metric name per family would grow the registry with every task family the store ever
   * reports, which is the noncanonical form the audit rejects.
   */
  test("F5-a: ONE per-family counter carries family+dimension tags, never a dynamic metric name", () => {
    const scope = createObservabilityScope("run108-observability:f5a-one-counter");
    const before = snapshotEntry(scope, "role-model.learner.family_derivations");
    recordLearnerFamilyEvidence(
      {
        "coder.review": {
          decisiveComparisons: 3,
          holdoutComparisons: 2,
          developmentComparisons: 1,
          distinctCaptures: 4,
        },
      },
      scope,
    );
    const snapshot = collectObservabilitySnapshot(scope);
    // exactly ONE id: the family never becomes part of the metric name
    expect(Object.keys(snapshot).filter((id) => id.includes("family_derivations"))).toEqual([
      "role-model.learner.family_derivations",
    ]);

    const series = snapshotEntry(scope, "role-model.learner.family_derivations")?.series ?? [];
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
    const scope = createObservabilityScope("run108-observability:f5a-collapse");
    for (let index = 0; index < LEARNER_FAMILY_ATTRIBUTE_BOUND + 40; index += 1) {
      recordLearnerFamilyEvidence(
        {
          [`f5-overflow-family-${index}`]: { decisiveComparisons: 1 },
        },
        scope,
      );
    }
    const families = new Set(
      (snapshotEntry(scope, "role-model.learner.family_derivations")?.series ?? []).map(
        (entry) => entry.attributes.family,
      ),
    );
    expect(families.size).toBeLessThanOrEqual(LEARNER_FAMILY_ATTRIBUTE_BOUND + 1);
    expect(families.has("other")).toBe(true);
  });

  /**
   * F5-a (producer/consumer KEY match, 03.5 re-review M5). The recorder reads four field names off the
   * object the learning pass builds; if either side renames one - `decisiveComparisons` becomes
   * `decisive`, say - the recorder skips that dimension and the series stops advancing. That is the
   * SAME failure mode as the ladder_rungs shape defect: a metric declared, wired and permanently
   * unobserved, with nothing red. Nothing pinned the match before: the F5-a case above hand-builds
   * `byFamily` with the recorder's OWN key names, so it can only ever agree with itself.
   *
   * Two independent pins:
   *   (1) BEHAVIOURAL - the genuine producer's `byFamily` flows into the recorder and all four
   *       dimensions move, so a rename on either side records nothing and lands here;
   *   (2) STRUCTURAL - the keys emitted by the object literal at track-b-learning-pass.ts:1346-1350 are
   *       compared with the declaration at run108-observability.ts FAMILY_DIMENSION_FIELDS, so a rename
   *       fails here even if the producer's inputs stop reaching that literal.
   */
  test("F5-a: the family-evidence KEY SET is the same on the producer and the recorder side", () => {
    const scope = createObservabilityScope("run108-observability:f5a-key-set");
    const dimensionCount = (dimension: string): number =>
      ((snapshotEntry(scope, "role-model.learner.family_derivations")?.series ?? []).find(
        (entry) =>
          entry.attributes.family === "coder.review" && entry.attributes.dimension === dimension,
      )?.state.count as number | undefined) ?? 0;

    // (1) behavioural: the GENUINE producer's output, recorded exactly as both call sites do
    const byFamily = learnFamilyEvidence("coder.review", "endpoint:a");
    expect(Object.keys(byFamily)).toEqual(["coder.review"]);
    expect(byFamily["coder.review"]).toMatchObject({
      decisiveComparisons: 1,
      holdoutComparisons: 1,
      developmentComparisons: 1,
      distinctCaptures: 1,
    });
    const before = {
      decisive: dimensionCount("decisive"),
      holdout: dimensionCount("holdout"),
      development: dimensionCount("development"),
      distinct: dimensionCount("distinct"),
    };
    recordLearnerFamilyEvidence(byFamily, scope);
    expect(dimensionCount("decisive") - before.decisive).toBe(1);
    expect(dimensionCount("holdout") - before.holdout).toBe(1);
    expect(dimensionCount("development") - before.development).toBe(1);
    expect(dimensionCount("distinct") - before.distinct).toBe(1);

    // the key names are LOAD-BEARING, not cosmetic: the same numbers under a renamed key record
    // NOTHING - which is exactly why a rename has to fail this suite instead of opening a silent hole
    const renamed = dimensionCount("decisive");
    recordLearnerFamilyEvidence(
      {
        "coder.review": { decisive: 1 },
      } as unknown as Parameters<typeof recordLearnerFamilyEvidence>[0],
      scope,
    );
    expect(dimensionCount("decisive")).toBe(renamed);

    // (2) structural: the emitted keys vs the declared fields, read from the two sources
    const declaredFields = [
      ...readFileSync(new URL("../src/run108-observability.ts", import.meta.url), "utf8").matchAll(
        /\[\s*"(?:decisive|holdout|development|distinct)"\s*,\s*"([A-Za-z][A-Za-z0-9]*)"\s*\]/g,
      ),
    ].map((match) => match[1]);
    expect(declaredFields).toEqual([
      "decisiveComparisons",
      "holdoutComparisons",
      "developmentComparisons",
      "distinctCaptures",
    ]);

    const emittedFields = emittedByFamilyKeys(
      readFileSync(new URL("../src/track-b-learning-pass.ts", import.meta.url), "utf8"),
    );
    expect(emittedFields.slice(0, 4)).toEqual(declaredFields);
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

    const scope = createObservabilityScope("run108-observability:f5b-gauges");
    recordQueueDepths({ queued: 7, awaitingEvaluation: 2, stranded: 1 }, scope);
    const gaugeValue = (name: string): number | undefined =>
      (snapshotEntry(scope, name)?.series ?? [])
        .map((entry) => entry.state.value as number | undefined)
        .find((value) => typeof value === "number");
    expect(gaugeValue("role-model.replay.queue.queued")).toBe(7);
    expect(gaugeValue("role-model.replay.queue.awaiting_evaluation")).toBe(2);
    expect(gaugeValue("role-model.replay.queue.stranded")).toBe(1);

    // SET semantics: a later observation REPLACES the level rather than adding to it
    recordQueueDepths({ queued: 3 }, scope);
    expect(gaugeValue("role-model.replay.queue.queued")).toBe(3);
    // ... and an omitted depth leaves its own gauge untouched
    expect(gaugeValue("role-model.replay.queue.awaiting_evaluation")).toBe(2);
    expect(gaugeValue("role-model.replay.queue.stranded")).toBe(1);

    // the canonical gauge series state, one series per gauge
    const queuedSeries = snapshotEntry(scope, "role-model.replay.queue.queued")?.series ?? [];
    expect(queuedSeries).toHaveLength(1);
    expect(queuedSeries[0]?.state).toEqual({ kind: "gauge", value: 3 });
    expect(snapshotEntry(scope, "role-model.replay.queue.queued")?.type).toBe("Gauge");
  });

  /**
   * F5-c (arm-count histogram). R7 wants the DISTRIBUTION of planned arm counts, which a counter
   * cannot carry, so the metric is a histogram with explicit boundaries over the expected arm
   * counts. Effect keeps cumulative buckets whose last entry is [null, total].
   */
  test("F5-c: the arm-plan histogram has explicit boundaries and counts every planning result", () => {
    const scope = createObservabilityScope("run108-observability:f5c-histogram");
    const histogramState = (name: string) => {
      const state = (snapshotEntry(scope, name)?.series ?? [])[0]?.state ?? {};
      return state as {
        kind?: string;
        count?: number;
        sum?: number;
        buckets?: ReadonlyArray<readonly [number | null, number]>;
      };
    };
    const before = histogramState("role-model.replay.arm_plan_arms");
    recordArmPlan(2, scope);
    recordArmPlan(9, scope);
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
    const scope = createObservabilityScope("run108-observability:f5d-admission-floor");
    const seriesFor = (admitted: string) =>
      (snapshotEntry(scope, "role-model.learner.admission_floor")?.series ?? []).filter(
        (entry) => entry.attributes.admitted === admitted,
      );
    const countFor = (admitted: string): number =>
      (seriesFor(admitted)[0]?.state.count as number | undefined) ?? 0;
    const beforeTrue = countFor("true");
    const beforeFalse = countFor("false");

    recordAdmissionFloor(true, scope);
    recordAdmissionFloor(false, scope);
    recordAdmissionFloor(false, scope);

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
   * F5-d (the committed BARE-ROW contract). A row that measures its rungs at its OWN level is still
   * answered: `rungs` first, then the admitted count of its own `completeness`. That is the shape the
   * reader was originally written against and the shape a STORE RECEIPT carries - kept as its own case
   * so the two shapes stay distinguishable from the materialization-OUTCOME entry the host loop walks
   * (the case below), which carries neither at its own level.
   */
  test("F5-d: a bare row carrying its own rungs or admitted completeness is still answered", () => {
    expect(ladderRungCountOf({ status: "written", rungs: [{}, {}, {}] })).toBe(3);
    expect(
      ladderRungCountOf({ status: "written", completeness: { admitted: 5, configured: 12 } }),
    ).toBe(5);
    expect(ladderRungCountOf({ status: "written", completeness: { admitted: 0 } })).toBe(0);
    // carrying NEITHER is not a zero-rung ladder: the row does not carry the measurement at all
    expect(ladderRungCountOf({ status: "written" })).toBe(null);
    expect(ladderRungCountOf(null)).toBe(null);
  });

  /**
   * F5-d REPAIR (03.5 re-review M2). Measured against the deployed commit: five "[run105] ladder
   * materialization wrote 1 ladder row(s)" lines produced ZERO live series, because the outcome entry
   * does not carry the measurement at its OWN level.
   *
   * THIS CASE USED TO HAND-BUILD { status: "written", rungs: [{}, {}, {}] } - an entry-level shape the
   * real producer NEVER emits - so it stayed GREEN with the reader reverted to its broken form: it
   * certified the very defect the fix removed (proved by revert in the 03.5 re-review). The literal
   * below is therefore transcribed from the PRODUCER, not from the reader:
   *
   *   paired private shared/route-learning/route-ladder-materialization.mjs:87, :147, :151
   *     identity = { roleId, taskTypeId, scopeId }
   *     snapshot = { ...identity, contract, packId, rungs, completeness, version, ... }
   *     ladders.push({ ...identity, status, ladder: { ...snapshot, packId: written?.packId ?? ... }, metadata })
   *
   * `rungs` and `completeness` live ONLY under `ladder`; the entry's own keys are exactly roleId,
   * taskTypeId, scopeId, status, ladder, metadata. The paired case below re-asserts that key set against
   * a GENUINE materialization over a real SQLite store, so this literal cannot drift back into a shape
   * production never emits.
   */
  test("F5-d fix: the ladder-rung count reads the PERSISTED ladder row the outcome carries", () => {
    // A real outcome: 12 configured endpoints, THREE persisted rungs of which two are
    // admitted-and-configured. The rung list and the admitted count deliberately DIFFER (an unavailable
    // rung is retained history; completeness counts configured admissions), so the assertion below says
    // WHICH carrier was read instead of accepting either number.
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
          { endpointId: "endpoint:retired", rank: 3, status: "unavailable" },
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
    // (1) THE SHAPE the producer emits: NO rungs and NO completeness at the entry's own level, or the
    // case has drifted back into a shape production never emits (the M2 failure mode)
    expect(Object.keys(outcomeEntry).sort()).toEqual([
      "ladder",
      "metadata",
      "roleId",
      "scopeId",
      "status",
      "taskTypeId",
    ]);
    expect((outcomeEntry as Record<string, unknown>).rungs).toBeUndefined();
    expect((outcomeEntry as Record<string, unknown>).completeness).toBeUndefined();
    // (2) THE MEASUREMENT: the three rungs the PERSISTED row carries
    expect(ladderRungCountOf(outcomeEntry)).toBe(3);

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
    expect(ladderRungCountOf({ status: "written", ladder: null })).toBe(null);

    // (3) THE EMIT, at the CLI's own seam (cli.ts:6799-6800 reads, then records only when non-null)
    const scope = createObservabilityScope("run108-observability:f5d-ladder-rungs");
    const stateOf = () =>
      ((snapshotEntry(scope, "role-model.learner.ladder_rungs")?.series ?? [])[0]?.state ?? {}) as {
        count?: number;
        sum?: number;
      };
    const before = stateOf();
    const recorded = ladderRungCountOf(outcomeEntry);
    expect(recorded).toBe(3);
    if (recorded !== null) recordLadderRungs(recorded, scope);
    const after = stateOf();
    expect((after.count ?? 0) - (before.count ?? 0)).toBe(1);
    expect((after.sum ?? 0) - (before.sum ?? 0)).toBe(3);
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
      // ...and its OWN key set IS the producer's: identity + status + ladder + metadata
      // (route-ladder-materialization.mjs:87/:151). This is the strongest form of the M2 pin - the
      // hand-built literal in the non-paired case is only trustworthy while it matches THIS entry.
      expect(Object.keys(entry).sort()).toEqual([
        "ladder",
        "metadata",
        "roleId",
        "scopeId",
        "status",
        "taskTypeId",
      ]);
      // strip the persisted row and the entry measures nothing at all - which is what the pre-fix
      // reader answered for EVERY written ladder, at any traffic volume
      expect(ladderRungCountOf({ ...entry, ladder: undefined })).toBeNull();
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
   * F5 wiring, BEHAVIOURAL half (03.5 re-review M1). The source-text case below is only a guard that
   * the call still EXISTS; on its own it cannot see the defect class it claims to prevent - the
   * reviewer reverted the ladder reader to its broken form and it stayed GREEN, as did the old F5-d
   * case. So every F5 metric is ALSO driven at the shape its production seam passes and asserted to
   * MOVE: a helper that is called but reads the wrong shape moves nothing, and that is what fails here.
   */
  test("F5: every F5 helper moves its metric when driven at the production seam shape", () => {
    const scope = createObservabilityScope("run108-observability:f5-production-seams");
    const histogram = (name: string) =>
      ((snapshotEntry(scope, name)?.series ?? [])[0]?.state ?? {}) as {
        count?: number;
        sum?: number;
      };
    const gaugeValue = (name: string): number | undefined =>
      (snapshotEntry(scope, name)?.series ?? [])
        .map((entry) => entry.state.value as number | undefined)
        .find((value) => typeof value === "number");
    const floorCount = (admitted: string): number =>
      ((snapshotEntry(scope, "role-model.learner.admission_floor")?.series ?? []).find(
        (entry) => entry.attributes.admitted === admitted,
      )?.state.count as number | undefined) ?? 0;

    // (a) ladder_rungs - cli.ts:6799-6800 walks the materialization outcome and records the count the
    // reader answers. Driven with the PRODUCER's entry shape (the F5-d fix case above): 4 persisted
    // rungs, and the rung list deliberately differs from the admitted count.
    const writtenEntry = {
      roleId: "role:coder",
      taskTypeId: "task:review",
      scopeId: "tenant:run108-ladder",
      status: "written",
      ladder: {
        contract: "RouteLadderPackV1",
        packId: "ladder:seam",
        rungs: [
          { endpointId: "endpoint:a", rank: 1, status: "available" },
          { endpointId: "endpoint:b", rank: 2, status: "available" },
          { endpointId: "endpoint:c", rank: 3, status: "available" },
          { endpointId: "endpoint:retired", rank: 4, status: "unavailable" },
        ],
        completeness: { admitted: 3, configured: 12 },
      },
      metadata: {},
    };
    const ladderBefore = histogram("role-model.learner.ladder_rungs");
    const seamRungs = ladderRungCountOf(writtenEntry);
    expect(seamRungs).toBe(4);
    if (seamRungs !== null) recordLadderRungs(seamRungs, scope);
    const ladderAfter = histogram("role-model.learner.ladder_rungs");
    expect((ladderAfter.count ?? 0) - (ladderBefore.count ?? 0)).toBe(1);
    expect((ladderAfter.sum ?? 0) - (ladderBefore.sum ?? 0)).toBe(4);

    // (b) admission_floor - cli.ts:6809-6810 records the verdict of every entry that carries one. The
    // refusal and the admission are the two series of the one rate.
    const refusedBefore = floorCount("false");
    const refusal = admissionFloorVerdictOf({
      roleId: "role:coder",
      taskTypeId: "task:review",
      scopeId: "tenant:run108-ladder",
      status: "insufficient_evidence",
      ladder: null,
    });
    expect(refusal).toBe(false);
    if (refusal !== null) recordAdmissionFloor(refusal, scope);
    expect(floorCount("false") - refusedBefore).toBe(1);

    const admittedBefore = floorCount("true");
    const admittedVerdict = admissionFloorVerdictOf(writtenEntry);
    expect(admittedVerdict).toBe(true);
    if (admittedVerdict !== null) recordAdmissionFloor(admittedVerdict, scope);
    expect(floorCount("true") - admittedBefore).toBe(1);

    // a persisted row that admitted NOTHING is a refusal too
    expect(
      admissionFloorVerdictOf({ status: "written", ladder: { completeness: { admitted: 0 } } }),
    ).toBe(false);
    // ...while a null-ladder status that is NOT a floor verdict records NOTHING at the seam
    expect(admissionFloorVerdictOf({ status: "capacity_exceeded", ladder: null })).toBeNull();

    // (c) family_derivations - cli.ts:6454 and track-b-learning-pass.ts:1680 both call
    // recordLearnerFamilyEvidence(evidenceSummary.byFamily). Driven with the GENUINE producer's output;
    // the rename guard itself lives in the F5-a key-set case above.
    const familyDimension = (dimension: string): number =>
      ((snapshotEntry(scope, "role-model.learner.family_derivations")?.series ?? []).find(
        (entry) =>
          entry.attributes.family === "coder.review" && entry.attributes.dimension === dimension,
      )?.state.count as number | undefined) ?? 0;
    const familyBefore = {
      decisive: familyDimension("decisive"),
      holdout: familyDimension("holdout"),
      development: familyDimension("development"),
      distinct: familyDimension("distinct"),
    };
    recordLearnerFamilyEvidence(learnFamilyEvidence("coder.review", "endpoint:a"), scope);
    expect(familyDimension("decisive") - familyBefore.decisive).toBe(1);
    expect(familyDimension("holdout") - familyBefore.holdout).toBe(1);
    expect(familyDimension("development") - familyBefore.development).toBe(1);
    expect(familyDimension("distinct") - familyBefore.distinct).toBe(1);

    // (d) queue gauges - the sweep calls recordQueueDepths ONCE PER DEPTH, a single key each
    // (track-b-auto-replay-runtime.ts:1006 stranded, :1324 queued, :1685 awaitingEvaluation).
    recordQueueDepths({ stranded: 3 }, scope);
    expect(gaugeValue("role-model.replay.queue.stranded")).toBe(3);
    recordQueueDepths({ queued: 5 }, scope);
    expect(gaugeValue("role-model.replay.queue.queued")).toBe(5);
    recordQueueDepths({ awaitingEvaluation: 1 }, scope);
    expect(gaugeValue("role-model.replay.queue.awaiting_evaluation")).toBe(1);

    // (e) arm_plan_arms - cli.ts:9008 records the planned arm count of the plan about to be shipped.
    const armBefore = histogram("role-model.replay.arm_plan_arms");
    recordArmPlan(4, scope);
    const armAfter = histogram("role-model.replay.arm_plan_arms");
    expect((armAfter.count ?? 0) - (armBefore.count ?? 0)).toBe(1);
    expect((armAfter.sum ?? 0) - (armBefore.sum ?? 0)).toBe(4);
  });

  /**
   * F5 wiring, SOURCE half. The behavioural case above proves the helpers read the right shape; this one
   * proves the production seams still CALL them (a helper nobody calls is the M4 defect - declared, read
   * back and always zero). Kept as an ADDITIONAL guard, never as the only pin.
   */
  test("F5 (source guard): every F5 helper is still called from the production seam it measures", () => {
    const source = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");
    const autoReplay = source("../src/track-b-auto-replay-runtime.ts");
    expect(autoReplay).toContain("recordQueueDepths(");
    expect(autoReplay).not.toContain("recordAdmissionFloor(met)");
    const cli = source("../src/cli.ts");
    expect(cli).toContain("recordArmPlan(");
    // Run 108 addendum-04: the POSITIVE half matters as much as the negative one - without it,
    // deleting the cli.ts loop would leave this suite green (the M4 class: a pin that cannot fail).
    expect(cli).toContain("admissionFloorVerdictOf(");
    expect(cli).toContain("recordAdmissionFloor(");
    // Run 108 follow-up: the rung count must reach the recorder THROUGH the reader that owns the
    // outcome-entry shape, or the emit silently measures nothing again.
    expect(cli).toContain("ladderRungCountOf(");
    expect(cli).toContain("recordLadderRungs(");
    expect(cli).toContain("recordLearnerFamilyEvidence(");
    expect(source("../src/track-b-learning-pass.ts")).toContain("recordLearnerFamilyEvidence(");

    /**
     * Run 108 follow-up: the SOURCE half of the registry contract. The recorders REQUIRE a scope, so
     * tsc already fails a src call site that omits one - but the components that carry a scope through
     * an optional options field degrade to "records nothing" when a caller forgets it, and THAT is the
     * quiet hole this case closes: every production seam hands its component the runtime scope.
     */
    // the CLI hands the ONE scope it created at its composition root to the backend, the server and
    // the auto-replay loop it starts.
    expect(cli).toContain("const observabilityScope = createObservabilityScope(options.scopeId);");
    expect(cli).toContain("observabilityScope,");
    expect(source("../src/index.ts")).toContain("collectObservabilitySnapshot(observabilityScope)");
    expect(source("../src/index.ts")).toContain(
      "...(observabilityScope ? { observabilityScope } : {})",
    );
    expect(source("../src/track-b-auto-replay-runtime.ts")).toContain("input.observabilityScope");
    expect(source("../src/track-b-runtime.ts")).toContain("...(input.observabilityScope ?");
    expect(source("../src/track-b-learning-pass.ts")).toContain("input.observabilityScope");
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
    // THE case the old in-flight-challenge emit could never reach: the floor REFUSED. This is the REAL
    // shape - the materializer pushes { status: "insufficient_evidence", ladder: null } with NO
    // completeness (route-ladder-materialization.mjs:94); completeness is built only on the write path
    // (:129). The earlier synthetic admitted:0 row is not a shape production ever emits.
    expect(admissionFloorVerdictOf({ status: "insufficient_evidence", ladder: null })).toBe(false);
    expect(admissionFloorVerdictOf({ status: "insufficient_evidence" })).toBe(false);
    // ...but a null-ladder status that is NOT a floor verdict must record NOTHING.
    expect(admissionFloorVerdictOf({ status: "capacity_exceeded", ladder: null })).toBeNull();
    expect(admissionFloorVerdictOf({ status: "stale", ladder: null })).toBeNull();
    expect(admissionFloorVerdictOf({ status: "rolled_back", ladder: null })).toBeNull();
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
