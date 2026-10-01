/**
 * Run 104 R10: the post-finalization signals sweep lists every finalized comparison group on every tick, and
 * that listing is the sweep's whole cost.
 *
 * Measured read-only on the live stage store (2026-10-01): **61 calls / 17,882,699 bytes in 30 minutes, every
 * call exactly 293,159 bytes** (~35.8 MB/h of extension-host read plus the durable write behind it, against a
 * 123.3 MB store that holds only 21 finalized groups), while the operator readbacks on the same process hung
 * for more than 25 s. The listing has no timestamp and no ordering other than `group_id ASC`, so a smaller page
 * limit does not help - `collectPagedComparisonGroups` pages until `hasMore` is false.
 *
 * The sweep is idempotent and each group's own report is settled once written, so a bounded reuse window is
 * safe: a group finalized inside the window is picked up by the next listing. The window is deliberately much
 * shorter than the retention ring the sweep exists to beat, and shorter than the sweep's own cadence budget.
 */
export const FINALIZED_GROUP_LISTING_TTL_MS = 5 * 60_000;

export interface FinalizedGroupListingCache<T> {
  /**
   * Returns the cached listing when it is younger than the TTL, otherwise loads it once. Concurrent callers
   * share one in-flight load, so a burst of sweeps cannot multiply the extension-host reads.
   */
  read(key: string, load: () => Promise<readonly T[]>): Promise<readonly T[]>;
  /** The cached listing without triggering a load, or `null` when the entry is absent or stale. */
  peek(key: string): readonly T[] | null;
  /** Test seam: the number of times `load` has actually run. */
  loadCount(): number;
}

export function createFinalizedGroupListingCache<T>(options?: {
  readonly ttlMs?: number;
  readonly now?: () => number;
}): FinalizedGroupListingCache<T> {
  const ttlMs = options?.ttlMs ?? FINALIZED_GROUP_LISTING_TTL_MS;
  const now = options?.now ?? (() => Date.now());
  const entries = new Map<string, { readonly storedAtMs: number; readonly groups: readonly T[] }>();
  const inFlight = new Map<string, Promise<readonly T[]>>();
  let loads = 0;

  const isFresh = (entry: { readonly storedAtMs: number } | undefined): boolean =>
    entry !== undefined && now() - entry.storedAtMs < ttlMs;

  return {
    async read(key, load) {
      const cached = entries.get(key);
      if (isFresh(cached)) return cached?.groups ?? [];
      const pending = inFlight.get(key);
      if (pending) return pending;
      loads += 1;
      const promise = (async () => {
        try {
          const groups = await load();
          entries.set(key, { storedAtMs: now(), groups });
          return groups;
        } finally {
          inFlight.delete(key);
        }
      })();
      inFlight.set(key, promise);
      return promise;
    },
    peek(key) {
      const cached = entries.get(key);
      return isFresh(cached) ? (cached?.groups ?? []) : null;
    },
    loadCount() {
      return loads;
    },
  };
}
