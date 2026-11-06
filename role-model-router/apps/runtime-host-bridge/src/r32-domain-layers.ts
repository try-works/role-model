import { Context, Effect, Layer } from "effect";

/**
 * S602 (R32): explicit per-domain Layers for the private composition surface.
 *
 * Each domain gets its own scoped Layer and its own acquireRelease. Factories receive only their
 * own domain id: no domain can read another domain's handle, options, or an ambient process
 * environment from this boundary.
 *
 * Build isolation: the graph is assembled from the Context produced by the build, never from a map
 * captured at composition. Building the same Layer twice therefore yields two independent domain
 * sets; closing one graph cannot release another graph's resources.
 */

export type R32DomainId =
  | "retention"
  | "evaluation"
  | "artifacts"
  | "eventLog"
  | "capture"
  | "learning"
  | "knowledge"
  | "diagnostics";

export const R32_DOMAIN_IDS: readonly R32DomainId[] = [
  "retention",
  "evaluation",
  "artifacts",
  "eventLog",
  "capture",
  "learning",
  "knowledge",
  "diagnostics",
];

export interface R32DomainNode {
  readonly id: R32DomainId;
  readonly handle: unknown;
  readonly release: () => Promise<void>;
}

export interface R32DomainGraphContract {
  readonly domains: Readonly<Record<R32DomainId, R32DomainNode>>;
  readonly ready: boolean;
  readonly shutdownOrder: readonly R32DomainId[];
  /** Reverse-order release of every domain; all domains run even when one rejects. */
  readonly close: () => Promise<void>;
}

export class R32DomainGraph extends Context.Service<R32DomainGraph, R32DomainGraphContract>()(
  "R32DomainGraph",
) {}

class R32Retention extends Context.Service<R32Retention, R32DomainNode>()("R32Retention") {}
class R32Evaluation extends Context.Service<R32Evaluation, R32DomainNode>()("R32Evaluation") {}
class R32Artifacts extends Context.Service<R32Artifacts, R32DomainNode>()("R32Artifacts") {}
class R32EventLog extends Context.Service<R32EventLog, R32DomainNode>()("R32EventLog") {}
class R32Capture extends Context.Service<R32Capture, R32DomainNode>()("R32Capture") {}
class R32Learning extends Context.Service<R32Learning, R32DomainNode>()("R32Learning") {}
class R32Knowledge extends Context.Service<R32Knowledge, R32DomainNode>()("R32Knowledge") {}
class R32Diagnostics extends Context.Service<R32Diagnostics, R32DomainNode>()("R32Diagnostics") {}

export interface R32AcquiredDomain {
  readonly handle?: unknown;
  readonly release: () => Promise<void>;
}

export type R32DomainFactory = (options: {
  readonly id: R32DomainId;
}) => Promise<R32AcquiredDomain>;

export interface R32DomainLayerOptions {
  readonly events?: string[];
  readonly failOn?: R32DomainId;
  readonly acquire?: Partial<Record<R32DomainId, R32DomainFactory>>;
  readonly onGraph?: (graph: R32DomainGraphContract) => void;
}

const once = (release: () => Promise<void>): (() => Promise<void>) => {
  let pending: Promise<void> | null = null;
  return () => {
    pending ??= release();
    return pending;
  };
};

const nodeLayer = <I>(
  service: Context.Key<I, R32DomainNode>,
  id: R32DomainId,
  options: R32DomainLayerOptions,
  // biome-ignore lint/suspicious/noExplicitAny: predecessor Layers carry heterogeneous service sets merged here.
  previous: Layer.Layer<any, never, never>,
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous service sets are merged into the final Layer.
): Layer.Layer<any, never, never> => {
  const events = options.events ?? [];
  const leaf = Layer.effect(
    service,
    Effect.acquireRelease(
      Effect.gen(function* () {
        if (options.failOn === id)
          return yield* Effect.die(new Error(`r32 domain acquisition failed: ${id}`));
        const factory = options.acquire?.[id];
        const acquired =
          factory === undefined
            ? {
                handle: { domain: id },
                release: async () => {
                  events.push(`release:${id}`);
                },
              }
            : yield* Effect.promise(() => factory({ id }));
        events.push(`acquire:${id}`);
        return { handle: acquired.handle, id, release: once(acquired.release) };
      }),
      (node) => Effect.promise(() => node.release()),
    ),
  );
  return Layer.provideMerge(leaf, previous);
};

const graphLeaf = (
  options: R32DomainLayerOptions,
  // biome-ignore lint/suspicious/noExplicitAny: the predecessor Layer's service set is intentionally opaque.
  last: Layer.Layer<any, never, never>,
): Layer.Layer<R32DomainGraph, never, never> => {
  const events = options.events ?? [];
  return Layer.provideMerge(
    Layer.effect(
      R32DomainGraph,
      Effect.acquireRelease(
        Effect.gen(function* () {
          const domains = {
            artifacts: yield* R32Artifacts,
            capture: yield* R32Capture,
            diagnostics: yield* R32Diagnostics,
            evaluation: yield* R32Evaluation,
            eventLog: yield* R32EventLog,
            knowledge: yield* R32Knowledge,
            learning: yield* R32Learning,
            retention: yield* R32Retention,
          };
          let closePromise: Promise<void> | null = null;
          const close = (): Promise<void> => {
            closePromise ??= (async () => {
              const failures: unknown[] = [];
              for (const id of [...R32_DOMAIN_IDS].reverse()) {
                try {
                  await domains[id].release();
                } catch (error) {
                  failures.push(error);
                }
              }
              if (failures.length > 0)
                throw new AggregateError(failures, "r32 domain release failures");
            })();
            return closePromise;
          };
          const graph: R32DomainGraphContract = {
            close,
            domains,
            ready: true,
            shutdownOrder: [...R32_DOMAIN_IDS].reverse(),
          };
          options.onGraph?.(graph);
          return graph;
        }),
        () => Effect.void,
      ),
    ),
    last,
  );
};

/** Compose the per-domain Layers. No factory runs until the returned Layer is built. */
export const composeR32DomainLayers = (
  options: R32DomainLayerOptions = {},
): Layer.Layer<R32DomainGraph, never, never> => {
  const normalized: R32DomainLayerOptions = { ...options, events: options.events ?? [] };
  // biome-ignore lint/suspicious/noExplicitAny: context keys are heterogeneous per domain and narrowed by nodeLayer.
  const steps: ReadonlyArray<readonly [Context.Key<any, R32DomainNode>, R32DomainId]> = [
    [R32Retention, "retention"],
    [R32Evaluation, "evaluation"],
    [R32Artifacts, "artifacts"],
    [R32EventLog, "eventLog"],
    [R32Capture, "capture"],
    [R32Learning, "learning"],
    [R32Knowledge, "knowledge"],
    [R32Diagnostics, "diagnostics"],
  ];
  // biome-ignore lint/suspicious/noExplicitAny: the accumulated Layer service set grows as each node is provided.
  let previous: Layer.Layer<any, never, never> = Layer.empty as Layer.Layer<any, never, never>;
  for (const [service, id] of steps) {
    previous = nodeLayer(service, id, normalized, previous);
  }
  return graphLeaf(normalized, previous);
};
