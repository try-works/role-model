/**
 * Run 115 S7 (R25): the Effect producer around the deterministic route decision kernel.
 *
 * `routeRequest` stays the sole decision authority: this module adds no validation, no
 * reordering of policy steps and no changed strictness. `decide` runs the same pure synchronous
 * kernel on the same `RouteRequestInput` and yields the kernel's own `RouterDecisionRecord`;
 * only the execution shape changes, so an Effect caller can depend on the
 * `RouteDecisionProducer` service instead of importing `router.ts` directly.
 *
 * WIRED CALLER: `role-model-router/packages/protocol-routing/src/route-decision-boundary.ts`
 * runs this service at one documented synchronous boundary and `routeRuntimeRequest` obtains its
 * decision through it. The kernel's own call site is gone from the caller.
 *
 * Shape follows Effect's own LLMS.md guidance, cross-checked against the vendored 4.0.6 tree:
 * a class-style `Context.Service` with a static `layer` built by `Layer.effect`, methods written
 * with `Effect.fn`, and `Service.of({...})` to build the instance. The vendored source has no
 * `Context.Tag` (Context.ts:209 is the Service constructor) and does have `Effect.fn`
 * (Effect.ts:14042) and `Layer.effect` (Layer.ts:1039).
 */
import { Context, Effect, Layer } from "effect";

import { routeRequest } from "./router.js";
import type { RouteRequestInput, RouterDecisionRecord } from "./types.js";

/** One deterministic decision per input; running it performs no I/O and cannot fail. */
export interface RouteDecisionProducerService {
  readonly decide: (input: RouteRequestInput) => Effect.Effect<RouterDecisionRecord>;
}

/**
 * Service key for the route decision producer. Class-style `Context.Service` is the
 * declaration form in this tree: the class is both the Context key and the service type.
 */
export class RouteDecisionProducer extends Context.Service<
  RouteDecisionProducer,
  RouteDecisionProducerService
>()("role-model-router/RouteDecisionProducer") {
  /** Live implementation backed by the pure kernel; build it once and reuse it. */
  static readonly layer = Layer.effect(
    RouteDecisionProducer,
    Effect.gen(function* () {
      // Untraced: a synchronous pure kernel is not a useful tracing boundary on its own.
      const decide = Effect.fnUntraced(function* (input: RouteRequestInput) {
        return routeRequest(input);
      });
      return RouteDecisionProducer.of({ decide });
    }),
  );
}

/** The pure kernel behind `Effect.sync`: same inputs, same decision, no services required. */
export const decideRoute = (input: RouteRequestInput): Effect.Effect<RouterDecisionRecord> =>
  Effect.sync(() => routeRequest(input));

/** Live layer that provides the producer backed by the synchronous kernel. */
export const RouteDecisionProducerLive = RouteDecisionProducer.layer;
