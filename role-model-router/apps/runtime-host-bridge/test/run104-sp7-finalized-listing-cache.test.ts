import { expect, test } from "vitest";

import {
  FINALIZED_GROUP_LISTING_TTL_MS,
  createFinalizedGroupListingCache,
} from "../src/finalized-group-listing-cache.js";

/**
 * Run 104 R10: the post-finalization signals sweep listed every finalized comparison group on every tick -
 * 61 calls / 17.9 MB per 30 minutes, each call exactly 293,159 bytes - while the operator readbacks on the same
 * process hung. The listing is reuse-safe because each group's own report is settled once written.
 */

test("R10: a second read inside the window reuses the listing instead of re-listing", async () => {
  let clock = 0;
  const cache = createFinalizedGroupListingCache<string>({
    ttlMs: FINALIZED_GROUP_LISTING_TTL_MS,
    now: () => clock,
  });
  let loads = 0;
  const load = async () => {
    loads += 1;
    return ["g1", "g2"];
  };

  expect(await cache.read("scope-a", load)).toEqual(["g1", "g2"]);
  clock += 60_000;
  expect(await cache.read("scope-a", load)).toEqual(["g1", "g2"]);

  expect(loads).toBe(1);
  expect(cache.loadCount()).toBe(1);
  expect(cache.peek("scope-a")).toEqual(["g1", "g2"]);
});

test("R10: the listing is reloaded once the window expires", async () => {
  let clock = 0;
  const cache = createFinalizedGroupListingCache<string>({ ttlMs: 5_000, now: () => clock });
  let loads = 0;
  const load = async () => {
    loads += 1;
    return [`g${loads}`];
  };

  expect(await cache.read("scope-a", load)).toEqual(["g1"]);
  clock += 4_999;
  expect(await cache.read("scope-a", load)).toEqual(["g1"]);
  clock += 2;
  expect(await cache.read("scope-a", load)).toEqual(["g2"]);
  expect(loads).toBe(2);
});

test("R10: an empty listing is cached too, so an empty store is not re-listed every tick", async () => {
  const cache = createFinalizedGroupListingCache<string>({ ttlMs: 5_000, now: () => 0 });
  let loads = 0;
  const load = async () => {
    loads += 1;
    return [];
  };

  expect(await cache.read("scope-a", load)).toEqual([]);
  expect(await cache.read("scope-a", load)).toEqual([]);
  expect(loads).toBe(1);
});

test("R10: concurrent callers share one in-flight load", async () => {
  const cache = createFinalizedGroupListingCache<string>({ ttlMs: 5_000, now: () => 0 });
  let loads = 0;
  const load = async () => {
    loads += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return ["g1"];
  };

  const [first, second] = await Promise.all([
    cache.read("scope-a", load),
    cache.read("scope-a", load),
  ]);

  expect(first).toEqual(["g1"]);
  expect(second).toEqual(["g1"]);
  expect(loads).toBe(1);
});

test("R10: a failed load is not cached, so the next read retries instead of serving a stale empty page", async () => {
  const cache = createFinalizedGroupListingCache<string>({ ttlMs: 5_000, now: () => 0 });
  let loads = 0;
  const load = async () => {
    loads += 1;
    if (loads === 1) throw new Error("boom");
    return ["g1"];
  };

  await expect(cache.read("scope-a", load)).rejects.toThrow("boom");
  expect(cache.peek("scope-a")).toBeNull();
  expect(await cache.read("scope-a", load)).toEqual(["g1"]);
  expect(loads).toBe(2);
});

test("R10: listings for different scopes do not collide", async () => {
  const cache = createFinalizedGroupListingCache<string>({ ttlMs: 5_000, now: () => 0 });
  let loads = 0;
  const load = async () => {
    loads += 1;
    return [`g${loads}`];
  };

  expect(await cache.read("scope-a", load)).toEqual(["g1"]);
  expect(await cache.read("scope-b", load)).toEqual(["g2"]);
  expect(loads).toBe(2);
});
