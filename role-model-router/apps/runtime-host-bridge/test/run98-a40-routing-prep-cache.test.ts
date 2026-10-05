import { expect, test } from "vitest";

import { createRoutingPrepCache } from "../src/routing-prep-cache.js";

// Run 98 addendum 40 (L3) with v1.1 guidance 05 §"Post-v1 maintenance and shadow jobs": work that is
// not the request itself must never starve request handling. Routing preparation reads the same
// bounded store state for every request in a tick, so it is served from a short-TTL shared snapshot.
test("a40 L3: a snapshot is reused within its TTL and refreshed after it", async () => {
  let nowMs = 1_000;
  let loads = 0;
  const cache = createRoutingPrepCache({ ttlMs: 5_000, clock: () => nowMs });

  const first = await cache.read("profiles:standard", () => {
    loads += 1;
    return { revision: loads };
  });
  nowMs += 4_999;
  const second = await cache.read("profiles:standard", () => {
    loads += 1;
    return { revision: loads };
  });
  expect(first).toEqual({ revision: 1 });
  expect(second).toBe(first);

  nowMs += 2;
  const third = await cache.read("profiles:standard", () => {
    loads += 1;
    return { revision: loads };
  });
  expect(third).toEqual({ revision: 2 });
  expect(loads).toBe(2);
});

test("a40 L3: concurrent readers of one key share a single load", async () => {
  let loads = 0;
  const cache = createRoutingPrepCache({ ttlMs: 5_000 });
  const load = async () => {
    loads += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return loads;
  };

  const values = await Promise.all([
    cache.read("telemetry:tick", load),
    cache.read("telemetry:tick", load),
    cache.read("telemetry:tick", load),
  ]);
  expect(values).toEqual([1, 1, 1]);
  expect(loads).toBe(1);
});

test("a40 L3: keys are isolated and a failed load is never cached", async () => {
  const cache = createRoutingPrepCache({ ttlMs: 5_000 });
  let attempts = 0;

  await expect(
    cache.read("observed:hard", () => {
      attempts += 1;
      throw new Error("store unavailable");
    }),
  ).rejects.toThrow("store unavailable");
  expect(await cache.read("observed:hard", () => ({ ok: true }))).toEqual({ ok: true });
  expect(attempts).toBe(1);

  expect(await cache.read("observed:easy", () => "easy")).toBe("easy");
  expect(await cache.read("observed:hard", () => "hard")).toEqual({ ok: true });
});

test("a40 L3: the cache stays bounded and reports its own load statistics", async () => {
  const cache = createRoutingPrepCache({ ttlMs: 5_000, maxEntries: 2 });
  let loads = 0;
  const load = (value: string) => () => {
    loads += 1;
    return value;
  };

  await cache.read("a", load("a"));
  await cache.read("b", load("b"));
  await cache.read("c", load("c"));
  // "a" was evicted, so it loads again while "c" is still served from the snapshot.
  expect(await cache.read("a", load("a-again"))).toBe("a-again");
  expect(await cache.read("c", load("c-again"))).toBe("c");
  expect(loads).toBe(4);
  expect(cache.stats()).toMatchObject({ hits: 1, misses: 4 });
});

test("a40 L3: a zero TTL disables reuse so the caller reads the store every time", async () => {
  let loads = 0;
  const cache = createRoutingPrepCache({ ttlMs: 0 });
  const load = () => {
    loads += 1;
    return loads;
  };
  expect(await cache.read("k", load)).toBe(1);
  expect(await cache.read("k", load)).toBe(2);
});
