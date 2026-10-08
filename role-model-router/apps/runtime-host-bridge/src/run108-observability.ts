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
    span.end(BigInt(Math.floor(Date.now() * 1_000_000)), Exit.fail(error));
    throw error;
  }
}
