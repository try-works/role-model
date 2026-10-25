import { Effect, Exit, Ref, Scope } from "effect";

/**
 * s63a STEP 1: the backend+server+packagedRuntime pair, in one typed scope.
 *
 * Acquisition order is backend -> server -> packagedRuntime; release order is the automatic inverse:
 * packagedRuntime -> server -> backend. A failed acquisition closes the scope, releasing everything
 * already acquired. close() is idempotent (the first call owns the releases) and a throwing finalizer
 * does not stop the later releases; the close effect surfaces the failure to the caller.
 *
 * This module deliberately imports neither the real server nor the CLI. STEP 2 injects the CLI's
 * factories and keeps the old shutdown as a fallback.
 */
export interface HostRuntimeFactories<Backend, Server, PackagedRuntime> {
  readonly acquireBackend: Effect.Effect<Backend>;
  readonly acquireServer: (backend: Backend) => Effect.Effect<Server>;
  readonly acquirePackagedRuntime: (server: Server, backend: Backend) => Effect.Effect<PackagedRuntime>;
  readonly releaseBackend: (backend: Backend) => Effect.Effect<void>;
  readonly releaseServer: (server: Server) => Effect.Effect<void>;
  readonly releasePackagedRuntime: (runtime: PackagedRuntime) => Effect.Effect<void>;
}

export interface HostRuntime<Backend, Server, PackagedRuntime> {
  readonly backend: Backend;
  readonly server: Server;
  readonly packagedRuntime: PackagedRuntime;
  readonly close: Effect.Effect<void, unknown>;
}

export const makeHostRuntime = <Backend, Server, PackagedRuntime>(
  factories: HostRuntimeFactories<Backend, Server, PackagedRuntime>,
): Effect.Effect<HostRuntime<Backend, Server, PackagedRuntime>, unknown> =>
  Effect.gen(function* () {
    const scope = yield* Scope.make();
    const closed = yield* Ref.make(false);
    const stack = Effect.gen(function* () {
      const backend = yield* Effect.acquireRelease(
        factories.acquireBackend,
        factories.releaseBackend,
      );
      const server = yield* Effect.acquireRelease(
        factories.acquireServer(backend),
        factories.releaseServer,
      );
      const packagedRuntime = yield* Effect.acquireRelease(
        factories.acquirePackagedRuntime(server, backend),
        factories.releasePackagedRuntime,
      );
      return { backend, packagedRuntime, server };
    });
    const resources = yield* Scope.provide(stack, scope).pipe(
      Effect.onError(() => Scope.close(scope, Exit.void)),
    );
    return {
      ...resources,
      close: Effect.gen(function* () {
        const alreadyClosed = yield* Ref.getAndSet(closed, true);
        if (alreadyClosed) return;
        yield* Scope.close(scope, Exit.void);
      }),
    };
  });
