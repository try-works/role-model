/**
 * Run 115 S7b (R25): the single synchronous boundary between this package's synchronous
 * routing API and the deterministic route decision producer's Effect service.
 *
 * `routeRuntimeRequest` never calls the router kernel directly. It delegates here, and this
 * module is the only place that runs the producer's Effect: `Effect.runSync` with an explicit
 * `Effect.provide` and an explicit `Layer`. There is no ambient provider and no global mutable
 * state. The default Layer is the producer's live Layer created once at module scope, so a call
 * allocates no Layer; callers that need to observe or decorate the producer pass their own Layer
 * through `routeRuntimeRequest`'s options (the wiring test does exactly that).
 *
 * Vendored Effect 4.0.6 API used here (read from vendor/effect/packages/effect):
 *   - `Layer.Layer` type: src/Layer.ts:56 (`Layer<ROut, E = never, RIn = never>`).
 *   - `RouteDecisionProducer.use(...)`: the service's `use` combinator, src/Context.ts:103
 *     (`Service.use<A, E, R>(f): Effect<A, E, R | Identifier>`).
 *   - `Effect.provide(effect, layer)`: src/Effect.ts:6142 (direct overload at 6177-6183).
 *   - `Effect.runSync(effect)`: src/Effect.ts:9587.
 *
 * Synchronous by design: every current caller of `routeRuntimeRequest` is synchronous and the
 * kernel itself is pure, so `Effect.runSync` cannot block on I/O.
 */
import { RouteDecisionProducer, RouteDecisionProducerLive } from "@role-model-router/core";
import type { RouteRequestInput, RouterDecisionRecord } from "@role-model-router/core";
import { Effect, type Layer } from "effect";

/** The producer Layer accepted by the boundary: it provides exactly the route decision service. */
export type RouteDecisionLayer = Layer.Layer<RouteDecisionProducer>;

/**
 * The default producer Layer. Module scope, so repeated calls do not allocate a Layer; it is the
 * live Layer exported by the core producer (the deterministic kernel behind the service).
 */
export const DefaultRouteDecisionLayer: RouteDecisionLayer = RouteDecisionProducerLive;

/** Options accepted by `routeRuntimeRequest`; only the producer Layer is injectable. */
export interface RouteRuntimeRequestOptions {
  readonly routeDecisionLayer?: RouteDecisionLayer;
}

/**
 * The only place the producer Effect is run. The program is the producer's own service
 * (`RouteDecisionProducer.use((producer) => producer.decide(input))`); the Layer is provided
 * explicitly here, and the result is the kernel's `RouterDecisionRecord` unchanged.
 */
export function runRouteDecisionThroughProducer(
  input: RouteRequestInput,
  routeDecisionLayer: RouteDecisionLayer = DefaultRouteDecisionLayer,
): RouterDecisionRecord {
  const program = RouteDecisionProducer.use((producer) => producer.decide(input));
  return Effect.runSync(Effect.provide(program, routeDecisionLayer));
}
