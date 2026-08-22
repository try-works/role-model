/**
 * Cross-page runtime refresh bus (R4).
 *
 * A benchmark-completion or membership/profile revision update is delivered as a
 * `revision.update` signal; any surface (Overview, Router, Observe, Models,
 * Benchmark, Connect) subscribes to re-fetch once per new revision. Repeated
 * updates with the same revision are deduplicated per subscriber.
 */

export type RuntimeRefreshSurface =
  | "overview"
  | "router"
  | "observe"
  | "models"
  | "benchmark"
  | "connect"
  | "endpoints";

export interface RuntimeRevisionUpdate {
  readonly revision: number;
  readonly profileRevisionByEndpointId: Readonly<Record<string, string>>;
  readonly membershipRevision: string | null;
  readonly emittedAtMs: number;
}

type RefreshHandler = (update: RuntimeRevisionUpdate) => void;

export interface RuntimeRefreshBus {
  readonly subscribe: (surface: RuntimeRefreshSurface, handler: RefreshHandler) => () => void;
  readonly publishRevisionUpdate: (update: RuntimeRevisionUpdate) => void;
}

export function createRuntimeRefreshBus(): RuntimeRefreshBus {
  const handlersBySurface = new Map<RuntimeRefreshSurface, Set<RefreshHandler>>();
  const lastRevisionBySurface = new Map<RuntimeRefreshSurface, number>();

  function subscribe(surface: RuntimeRefreshSurface, handler: RefreshHandler): () => void {
    const handlers = handlersBySurface.get(surface) ?? new Set<RefreshHandler>();
    handlers.add(handler);
    handlersBySurface.set(surface, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        handlersBySurface.delete(surface);
        lastRevisionBySurface.delete(surface);
      }
    };
  }

  function publishRevisionUpdate(update: RuntimeRevisionUpdate): void {
    for (const [surface, handlers] of handlersBySurface) {
      const lastRevision = lastRevisionBySurface.get(surface) ?? -1;
      if (update.revision <= lastRevision) {
        continue;
      }
      lastRevisionBySurface.set(surface, update.revision);
      for (const handler of handlers) {
        handler(update);
      }
    }
  }

  return { subscribe, publishRevisionUpdate };
}
