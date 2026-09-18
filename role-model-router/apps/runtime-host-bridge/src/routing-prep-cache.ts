/**
 * Run 98 addendum 40 (L3).
 *
 * Routing preparation reads the same bounded store state for every request in a tick: observed
 * profiles, the seven-day live-telemetry rollup, the benchmark capability map and the execution
 * runtime snapshot. Re-reading them per request put seconds of store work on the client-visible path
 * (measured 0.86-2.21 s on a 20 KB request against a quiet runtime).
 *
 * v1.1 guidance 05 is explicit that non-request work must never starve request handling, so those
 * reads are served from a short-TTL shared snapshot:
 *
 * - one load per key, shared by concurrent readers (a routing tick cannot stampede the store);
 * - bounded entries, so a long-lived runtime cannot grow an unbounded cache;
 * - a failed load is never cached — the error propagates so a store problem cannot silently become a
 *   stale routing input;
 * - `ttlMs: 0` disables reuse entirely, which is the escape hatch if a caller needs per-request reads.
 *
 * The snapshot is deliberately *not* a routing-decision cache: every decision still runs against the
 * snapshot it was given, so identical inputs keep producing identical decisions.
 */
export interface RoutingPrepCacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly loads: number;
  readonly entries: number;
  readonly lastLoadDurationMs: number | null;
}

export interface RoutingPrepCache {
  read<T>(key: string, load: () => T | Promise<T>): Promise<T>;
  invalidate(key?: string): void;
  stats(): RoutingPrepCacheStats;
}

interface RoutingPrepCacheEntry {
  readonly value: unknown;
  readonly loadedAtMs: number;
}

export function createRoutingPrepCache(options: {
  readonly ttlMs: number;
  readonly maxEntries?: number;
  readonly clock?: () => number;
}): RoutingPrepCache {
  const ttlMs = Number.isFinite(options.ttlMs) ? Math.max(0, Math.floor(options.ttlMs)) : 0;
  const maxEntries = Math.max(1, Math.floor(options.maxEntries ?? 64));
  const clock = options.clock ?? (() => Date.now());

  const entries = new Map<string, RoutingPrepCacheEntry>();
  const inFlight = new Map<string, Promise<unknown>>();
  let hits = 0;
  let misses = 0;
  let loads = 0;
  let lastLoadDurationMs: number | null = null;

  const isFresh = (entry: RoutingPrepCacheEntry, nowMs: number): boolean =>
    ttlMs > 0 && nowMs - entry.loadedAtMs < ttlMs;

  const store = (key: string, entry: RoutingPrepCacheEntry): void => {
    entries.delete(key);
    entries.set(key, entry);
    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value;
      if (typeof oldestKey !== "string") break;
      entries.delete(oldestKey);
    }
  };

  return {
    async read<T>(key: string, load: () => T | Promise<T>): Promise<T> {
      const nowMs = clock();
      const existing = entries.get(key);
      if (existing && isFresh(existing, nowMs)) {
        hits += 1;
        entries.delete(key);
        entries.set(key, existing);
        return existing.value as T;
      }
      const pending = inFlight.get(key);
      if (pending) {
        hits += 1;
        return (await pending) as T;
      }
      misses += 1;
      const startedAtMs = clock();
      const loading = (async () => {
        const value = await load();
        loads += 1;
        lastLoadDurationMs = Math.max(0, clock() - startedAtMs);
        if (ttlMs > 0) {
          store(key, { value, loadedAtMs: clock() });
        }
        return value;
      })();
      inFlight.set(key, loading);
      try {
        return (await loading) as T;
      } finally {
        // A failed load stays uncached, and the next reader retries instead of inheriting the failure.
        inFlight.delete(key);
      }
    },
    invalidate(key?: string) {
      if (key === undefined) {
        entries.clear();
        return;
      }
      entries.delete(key);
    },
    stats() {
      return {
        hits,
        misses,
        loads,
        entries: entries.size,
        lastLoadDurationMs,
      };
    },
  };
}

/**
 * Reads the operator's snapshot TTL. `0` disables the snapshot (per-request reads); the default is a
 * 5 s window, which is short enough that routing sees registry/store changes within a tick and long
 * enough to remove the per-request store work.
 */
export function resolveRoutingPrepCacheTtlMs(environment: Record<string, string | undefined>): number {
  const raw = environment.ROLE_MODEL_ROUTING_PREP_CACHE_TTL_MS?.trim();
  if (!raw) return 5_000;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 5_000;
  return Math.floor(parsed);
}
