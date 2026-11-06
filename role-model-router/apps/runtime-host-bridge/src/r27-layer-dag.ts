import { Context, Effect, Exit, Layer, Scope } from "effect";

import { composeReadinessOwner } from "./composition-dag.js";

/**
 * S593 (R27): the closed shared-leaf Layer DAG for the host composition root.
 *
 * Every top-level owner is a scoped Layer. Composing this module performs no acquisition;
 * acquisitions happen only when the returned Layer is built. The host node is acquired last and
 * marks the readiness owner ready. Scoped finalizers release resources in reverse acquisition order,
 * and the readiness leaf marks a partial acquisition failed when its finalizer runs before ready.
 */

export type R27ResourceId =
  | "readiness"
  | "providerPermits"
  | "backend"
  | "bootstrap"
  | "refresh"
  | "drains"
  | "benchmarks"
  | "server"
  | "cli";

export const R27_RESOURCE_IDS: readonly R27ResourceId[] = [
  "readiness",
  "providerPermits",
  "backend",
  "bootstrap",
  "refresh",
  "drains",
  "benchmarks",
  "server",
  "cli",
];

export interface R27Readiness {
  readonly id: string;
  readonly state: () => {
    readonly status: "pending" | "ready" | "failed";
    readonly message?: string;
  };
  readonly ready: () => boolean;
  readonly markReady: () => void;
  readonly markFailed: (message: string) => void;
}

export const makeR27ReadinessOwner = (id = "r27:readiness"): R27Readiness => {
  let state: { status: "pending" | "ready" | "failed"; message?: string } = { status: "pending" };
  return {
    id,
    markFailed: (message) => {
      if (state.status === "pending") state = { message, status: "failed" };
    },
    markReady: () => {
      if (state.status === "pending") state = { status: "ready" };
    },
    ready: () => state.status === "ready",
    state: () => state,
  };
};

export interface R27AcquiredResource {
  readonly handle?: unknown;
  readonly release: () => Promise<void>;
}

export interface R27Node {
  readonly id: R27ResourceId;
  readonly handle?: unknown;
  readonly release: () => Promise<void>;
}

export interface R27HostContract {
  readonly id: string;
  readonly readiness: R27Readiness;
  readonly resources: readonly R27ResourceId[];
  readonly handles: Readonly<Record<string, R27Node>>;
}

export class R27Host extends Context.Service<R27Host, R27HostContract>()("R27Host") {}

class R27ReadinessService extends Context.Service<R27ReadinessService, R27Readiness>()(
  "R27ReadinessService",
) {}
class R27ProviderPermits extends Context.Service<R27ProviderPermits, R27Node>()(
  "R27ProviderPermits",
) {}
class R27Backend extends Context.Service<R27Backend, R27Node>()("R27Backend") {}
class R27Bootstrap extends Context.Service<R27Bootstrap, R27Node>()("R27Bootstrap") {}
class R27Refresh extends Context.Service<R27Refresh, R27Node>()("R27Refresh") {}
class R27Drains extends Context.Service<R27Drains, R27Node>()("R27Drains") {}
class R27Benchmarks extends Context.Service<R27Benchmarks, R27Node>()("R27Benchmarks") {}
class R27Server extends Context.Service<R27Server, R27Node>()("R27Server") {}
class R27Cli extends Context.Service<R27Cli, R27Node>()("R27Cli") {}

export interface R27LayerOptions {
  readonly events?: string[];
  readonly readiness?: R27Readiness;
  readonly failOn?: R27ResourceId;
  readonly onHost?: (host: R27HostContract) => void;
  readonly handles?: Record<string, R27Node>;
  readonly acquire?: Partial<Record<R27ResourceId, () => Promise<R27AcquiredResource>>>;
  readonly failAfter?: R27ResourceId;
}

const eventList = (options: R27LayerOptions): string[] => options.events ?? [];

const readinessLeaf = (
  options: R27LayerOptions,
): Layer.Layer<R27ReadinessService, never, never> => {
  const events = eventList(options);
  const readiness = options.readiness ?? makeR27ReadinessOwner();
  return Layer.effect(
    R27ReadinessService,
    Effect.acquireRelease(
      Effect.sync(() => {
        if (options.failOn === "readiness")
          throw new Error("r27 layer acquisition failed: readiness");
        events.push("acquire:readiness");
        return readiness;
      }),
      () =>
        Effect.sync(() => {
          events.push("release:readiness");
          if (!readiness.ready()) readiness.markFailed("r27 layer acquisition did not reach ready");
        }),
    ),
  );
};

const nodeLeaf = <I>(
  service: Context.Key<I, R27Node>,
  id: R27ResourceId,
  options: R27LayerOptions,
  // biome-ignore lint/suspicious/noExplicitAny: predecessor Layers carry heterogeneous service sets merged here.
  previous: Layer.Layer<any, never, never>,
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous service sets are merged into the final Layer.
): Layer.Layer<any, never, never> => {
  const events = eventList(options);
  const leaf = Layer.effect(
    service,
    Effect.acquireRelease(
      Effect.gen(function* () {
        if (options.failOn === id)
          return yield* Effect.die(new Error(`r27 layer acquisition failed: ${id}`));
        const factory = options.acquire?.[id];
        const acquired =
          factory === undefined
            ? {
                release: async () => {
                  events.push(`release:${id}`);
                },
              }
            : yield* Effect.promise(() => factory());
        events.push(`acquire:${id}`);
        const node = { id, handle: acquired.handle, release: acquired.release };
        if (options.handles !== undefined) options.handles[id] = node;
        return node;
      }),
      (node) => Effect.promise(() => node.release()),
    ),
  );
  return Layer.provideMerge(leaf, previous);
};

const hostLeaf = (
  options: R27LayerOptions,
  cli: Layer.Layer<unknown, never, never>,
): Layer.Layer<R27Host, never, never> => {
  const events = eventList(options);
  const readiness = options.readiness ?? makeR27ReadinessOwner();
  return Layer.provideMerge(
    Layer.effect(
      R27Host,
      Effect.acquireRelease(
        Effect.gen(function* () {
          if (options.failAfter !== undefined)
            return yield* Effect.die(
              new Error(`r27 host acquisition failed after ${options.failAfter}`),
            );
          events.push("acquire:host");
          readiness.markReady();
          events.push("ready");
          const host = R27Host.of({
            handles: { ...(options.handles ?? {}) },
            id: "r27:host",
            readiness,
            resources: R27_RESOURCE_IDS,
          });
          options.onHost?.(host);
          return host;
        }),
        () =>
          Effect.sync(() => {
            events.push("release:host");
          }),
      ),
    ),
    cli,
  );
};

/** Compose the closed graph. No acquire runs until the returned Layer is built. */
/** Close the DAG scope; idempotent by Effect Scope semantics. */
export const closeR27HostScope = (scope: Scope.Closeable): Promise<void> =>
  Effect.runPromise(Scope.close(scope, Exit.void));

export const composeR27HostLayer = (
  options: R27LayerOptions = {},
): Layer.Layer<R27Host, never, never> => {
  // SAFETY: the shared owner is a composed readiness owner, so a host composed with this
  // DAG passes assertComposedReadiness in the production admission path.
  const shared = options.readiness === undefined ? composeReadinessOwner() : options.readiness;
  const patched: R27LayerOptions = {
    ...options,
    handles: { ...(options.handles ?? {}) },
    readiness: shared,
  };
  const options2 = patched;
  const readiness = readinessLeaf(options2);
  const permits = nodeLeaf(R27ProviderPermits, "providerPermits", options2, readiness);
  const backend = nodeLeaf(R27Backend, "backend", options2, permits);
  const bootstrap = nodeLeaf(R27Bootstrap, "bootstrap", options2, backend);
  const refresh = nodeLeaf(R27Refresh, "refresh", options2, bootstrap);
  const drains = nodeLeaf(R27Drains, "drains", options2, refresh);
  const benchmarks = nodeLeaf(R27Benchmarks, "benchmarks", options2, drains);
  const server = nodeLeaf(R27Server, "server", options2, benchmarks);
  const cli = nodeLeaf(R27Cli, "cli", options2, server);
  return hostLeaf(options2, cli);
};
