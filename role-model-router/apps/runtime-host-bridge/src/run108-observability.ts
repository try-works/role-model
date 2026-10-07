import * as Metric from "effect/Metric";

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

/** Captures admitted for replay. Tag contract: { pass: "replay" }. */
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
