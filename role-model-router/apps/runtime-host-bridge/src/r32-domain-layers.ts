import { Context, Effect, Layer } from "effect";

/**
 * S602 (R32): explicit per-domain Layers for the private composition surface.
 *
 * Each domain gets its own scoped Layer and its own acquireRelease. Factories receive only their
 * own domain id: no domain can read another domain's handle, options, or an ambient process
 * environment from this boundary. The graph leaf exposes a bounded, idempotent close handshake in
 * reverse acquisition order; the Layer Scope remains the owner of record for every finalizer.
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
  /** Idempotent reverse-order release handshake; Layer scope close also releases each once. */
  readonly close: () => Promise<void>;
}

export class R32DomainGraph extends Context.Service<R32DomainGraph, R32DomainGraphContract>()("R32DomainGraph") {}

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

export type R32DomainFactory = (options: { readonly id: R32DomainId }) => Promise<R32AcquiredDomain>;

export interface R32DomainLayerOptions {
  readonly events?: string[];
  readonly failOn?: R32DomainId;
  readonly acquire?: Partial<Record<R32DomainId, R32DomainFactory>>;
  readonly onGraph?: (graph: R32DomainGraphContract) => void;
}

const once = (release: () => Promise<void>): (() => Promise<void>) => {
  let pending: Promise<void> | null = null;
  return () => (pending ??= release());
};

const nodeLayer = <I>(
  service: Context.Key<I, R32DomainNode>,
  id: R32DomainId,
  options: R32DomainLayerOptions,
  nodes: Record<string, R32DomainNode>,
  previous: Layer.Layer<any, never, never>,
): Layer.Layer<any, never, never> => {
  const events = options.events ?? [];
  const leaf = Layer.effect(
    service,
    Effect.acquireRelease(
      Effect.gen(function* () {
        if (options.failOn === id) return yield* Effect.die(new Error("r32 domain acquisition failed: " + id));
        const factory = options.acquire?.[id];
        const acquired = factory === undefined
          ? { handle: { domain: id }, release: async () => { events.push("release:" + id); } }
          : yield* Effect.promise(() => factory({ id }));
        events.push("acquire:" + id);
        const node = { handle: acquired.handle, id, release: once(acquired.release) };
        nodes[id] = node;
        return node;
      }),
      (node) => Effect.promise(() => node.release()),
    ),
  );
  return Layer.provideMerge(leaf, previous);
};

const graphLeaf = (options: R32DomainLayerOptions, domains: Record<string, R32DomainNode>, last: Layer.Layer<any, never, never>): Layer.Layer<R32DomainGraph, never, never> => {
  const events = options.events ?? [];
  return Layer.provideMerge(
    Layer.effect(
      R32DomainGraph,
      Effect.acquireRelease(
        Effect.gen(function* () {
          const nodes = domains as Record<R32DomainId, R32DomainNode>;
          let closePromise: Promise<void> | null = null;
          const graph: R32DomainGraphContract = {
            close: () => (closePromise ??= (async () => {
              for (const id of [...R32_DOMAIN_IDS].reverse()) {
                const node = nodes[id];
                if (node !== undefined) await node.release();
              }
            })()),
            domains: nodes,
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
export const composeR32DomainLayers = (options: R32DomainLayerOptions = {}): Layer.Layer<R32DomainGraph, never, never> => {
  const tags = [
    R32Retention,
    R32Evaluation,
    R32Artifacts,
    R32EventLog,
    R32Capture,
    R32Learning,
    R32Knowledge,
    R32Diagnostics,
  ] as const;
  const normalized: R32DomainLayerOptions = { ...options, events: options.events ?? [] };
  const nodes: Record<string, R32DomainNode> = {};
  let previous: Layer.Layer<any, never, never> = nodeLayer(tags[0] as Context.Key<any, R32DomainNode>, R32_DOMAIN_IDS[0], normalized, nodes, Layer.empty as Layer.Layer<any, never, never>);
  for (let index = 1; index < tags.length; index++) {
    previous = nodeLayer(tags[index] as Context.Key<any, R32DomainNode>, R32_DOMAIN_IDS[index]!, normalized, nodes, previous);
  }
  return graphLeaf(normalized, nodes, previous);
};
