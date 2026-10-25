import { Context, Effect, Layer, Scope } from "effect";

/**
 * R27/B6 slice: one explicit scoped layer per long-lived host resource. Acquisition runs inside
 * the layer's Scope, release is the inverse finalizer, and Layer.build's scope closes resources in
 * reverse acquisition order even when a later acquisition fails or a finalizer throws.
 */
export interface ManagedResource<A> {
  readonly acquire: Effect.Effect<A>;
  readonly name: string;
  readonly release: (value: A) => Effect.Effect<void>;
}

export const managedLayer = <A>(
  tag: { readonly key: string },
  resource: ManagedResource<A>,
): Layer.Layer<A> =>
  Layer.fromBuild((_memo, scope: Scope.Scope) =>
    Effect.map(
      Scope.provide(Effect.acquireRelease(resource.acquire, resource.release), scope),
      (value) => Context.make(tag as never, value),
    ),
  );
