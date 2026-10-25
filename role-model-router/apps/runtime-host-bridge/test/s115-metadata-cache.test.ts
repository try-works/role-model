import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  metadataCacheKey,
  makeMetadataCache,
} from "../src/composition-dag.js";

/**
 * Run 115 S115 (R27): cache identity, TTL, cap and invalidation for the metadata cache.
 *
 * R27 requires the metadata cache to have explicit identity (authority, config generation,
 * model), a bounded size, a TTL, and invalidation when the owning configuration changes - so a
 * router decision can never be served from an entry that belongs to a different authority or to
 * a superseded configuration.
 */
const config = { instanceId: "rt-1", channel: "development" as const, providerMaxConcurrent: 2, providerMaxWaiters: 4 };

describe("S115 metadata cache identity, TTL and invalidation", () => {
  it("keys distinguish authority, configuration generation and model", () => {
    const a = metadataCacheKey({ authorityId: "graph-1", configGeneration: 3, modelId: "m" });
    const otherAuthority = metadataCacheKey({ authorityId: "graph-2", configGeneration: 3, modelId: "m" });
    const otherGeneration = metadataCacheKey({ authorityId: "graph-1", configGeneration: 4, modelId: "m" });
    const otherModel = metadataCacheKey({ authorityId: "graph-1", configGeneration: 3, modelId: "m2" });
    expect(new Set([a, otherAuthority, otherGeneration, otherModel]).size).toBe(4);
  });

  it("serves a stored value and expires it after the TTL", async () => {
    const cache = makeMetadataCache({ capacity: 4, ttlMs: 40 });
    const key = metadataCacheKey({ authorityId: "graph-1", configGeneration: 1, modelId: "m" });
    await Effect.runPromise(cache.set(key, { value: 1 }, 0));
    expect(await Effect.runPromise(cache.get(key, 10))).toEqual({ value: 1 });
    expect(await Effect.runPromise(cache.get(key, 50))).toBeUndefined();
  });

  it("evicts the oldest entry when the capacity is exceeded", async () => {
    const cache = makeMetadataCache({ capacity: 2, ttlMs: 1_000 });
    const keyFor = (n: number) => metadataCacheKey({ authorityId: "graph-1", configGeneration: 1, modelId: "m" + n });
    await Effect.runPromise(cache.set(keyFor(1), 1, 0));
    await Effect.runPromise(cache.set(keyFor(2), 2, 1));
    await Effect.runPromise(cache.set(keyFor(3), 3, 2));
    expect(await Effect.runPromise(cache.get(keyFor(1), 3))).toBeUndefined();
    expect(await Effect.runPromise(cache.get(keyFor(2), 3))).toBe(2);
    expect(await Effect.runPromise(cache.get(keyFor(3), 3))).toBe(3);
  });

  it("invalidates every entry when the configuration generation changes", async () => {
    const cache = makeMetadataCache({ capacity: 8, ttlMs: 1_000 });
    const oldKey = metadataCacheKey({ authorityId: "graph-1", configGeneration: 1, modelId: "m" });
    const newKey = metadataCacheKey({ authorityId: "graph-1", configGeneration: 2, modelId: "m" });
    await Effect.runPromise(cache.set(oldKey, "old", 0));
    await Effect.runPromise(cache.set(newKey, "new", 0));
    await Effect.runPromise(cache.invalidateGeneration(1));
    expect(await Effect.runPromise(cache.get(oldKey, 1))).toBeUndefined();
    expect(await Effect.runPromise(cache.get(newKey, 1))).toBe("new");
  });

  it("reports its size so a leak is observable", async () => {
    const cache = makeMetadataCache({ capacity: 4, ttlMs: 1_000 });
    expect(await Effect.runPromise(cache.size())).toBe(0);
    await Effect.runPromise(cache.set("k", 1, 0));
    expect(await Effect.runPromise(cache.size())).toBe(1);
  });
});
