import { Context, Effect, Layer } from "effect";

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
  readonly state: () => { readonly status: "pending" | "ready" | "failed"; readonly message?: string };
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

export interface R27Node {
  readonly id: R27ResourceId;
  readonly release: () => Promise<void>;
}

export interface R27HostContract {
  readonly id: string;
  readonly readiness: R27Readiness;
  readonly resources: readonly R27ResourceId[];
}

export class R27Host extends Context.Service<R27Host, R27HostContract>()("R27Host") {}

class R27ReadinessService extends Context.Service<R27ReadinessService, R27Readiness>()("R27ReadinessService") {}
class R27ProviderPermits extends Context.Service<R27ProviderPermits, R27Node>()("R27ProviderPermits") {}
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
}

const eventList = (options: R27LayerOptions): string[] => options.events ?? [];

const readinessLeaf = (options: R27LayerOptions): Layer.Layer<R27ReadinessService, never, never> => {
  const events = eventList(options);
  const readiness = options.readiness ?? makeR27ReadinessOwner();
  return Layer.effect(
    R27ReadinessService,
    Effect.acquireRelease(
      Effect.sync(() => {
        if (options.failOn === "readiness") throw new Error("r27 layer acquisition failed: readiness");
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
  previous: Layer.Layer<any, never, never>,
): Layer.Layer<any, never, never> => {
  const events = eventList(options);
  const leaf = Layer.effect(
    service,
    Effect.acquireRelease(
      Effect.gen(function* () {
        if (options.failOn === id) return yield* Effect.die(new Error("r27 layer acquisition failed: " + id));
        events.push("acquire:" + id);
        return {
          id,
          release: async () => {
            events.push("release:" + id);
          },
        };
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
          events.push("acquire:host");
          readiness.markReady();
          events.push("ready");
          return R27Host.of({ id: "r27:host", readiness, resources: R27_RESOURCE_IDS });
        }),
        () => Effect.sync(() => {
          events.push("release:host");
        }),
      ),
    ),
    cli,
  );
};

/** Compose the closed graph. No acquire runs until the returned Layer is built. */
export const composeR27HostLayer = (options: R27LayerOptions = {}): Layer.Layer<R27Host, never, never> => {
  const shared = options.readiness === undefined ? makeR27ReadinessOwner() : options.readiness;
  const patched: R27LayerOptions = { ...options, readiness: shared };
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
