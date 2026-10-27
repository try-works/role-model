import { Effect } from "effect";
import { describe, expect, test } from "vitest";

import {
  composeMetadataCacheOwner,
  makeMetadataCache,
  metadataCacheKey,
  metadataConfigIdentity,
} from "../src/composition-dag.js";

/**
 * S318 (R27): the DAG metadata cache keys include authority + configuration generation + model, invalidates by
 * GENERATION on config change, keeps TTL/cap behavior, never deduplicates distinct stochastic inference, and the
 * live routing-prep path reads through the generation-keyed cache.
 */

describe("S318 metadata cache identity", () => {
  test("keys include authority, generation and model (NUL separated)", () => {
    const key = metadataCacheKey({ authorityId: "auth-a", configGeneration: 3, modelId: "model-x" });
    expect(key).toBe("auth-a\u00003\u0000model-x");
    expect(metadataCacheKey({ authorityId: "auth-a", configGeneration: 4, modelId: "model-x" })).not.toBe(key);
    expect(metadataCacheKey({ authorityId: "auth-b", configGeneration: 3, modelId: "model-x" })).not.toBe(key);
  });

  test("config change bumps the generation and invalidates the previous generation", () => {
    const owner = composeMetadataCacheOwner();
    const first = owner.noteConfig(metadataConfigIdentity({ executionMode: "local" }));
    expect(first.generation).toBeGreaterThanOrEqual(1);
    const key = owner.keyFor("model-x");
    expect(key).toContain("\u0000" + String(first.generation) + "\u0000");
    owner.setSync(key, "value-under-gen-1", 1000);
    expect(owner.sizeSync()).toBe(1);
    expect(owner.noteConfig(metadataConfigIdentity({ executionMode: "local" })).generation).toBe(first.generation);
    const second = owner.noteConfig(metadataConfigIdentity({ executionMode: "remote" }));
    expect(second.generation).toBeGreaterThan(first.generation);
    expect(second.invalidated).toBeGreaterThanOrEqual(1);
    expect(owner.sizeSync()).toBe(0);
    expect(owner.keyFor("model-x")).not.toBe(key);
  });

  test("TTL and capacity bounds are preserved", () => {
    const cache = makeMetadataCache({ capacity: 2, ttlMs: 10 });
    const keyA = metadataCacheKey({ authorityId: "a", configGeneration: 1, modelId: "m-a" });
    const keyB = metadataCacheKey({ authorityId: "a", configGeneration: 1, modelId: "m-b" });
    const keyC = metadataCacheKey({ authorityId: "a", configGeneration: 1, modelId: "m-c" });
    Effect.runSync(cache.set(keyA, "a", 0));
    Effect.runSync(cache.set(keyB, "b", 0));
    expect(Effect.runSync(cache.size())).toBe(2);
    Effect.runSync(cache.set(keyC, "c", 0));
    expect(Effect.runSync(cache.size())).toBe(2);
    Effect.runSync(cache.set(keyA, "a2", 100));
    expect(Effect.runSync(cache.get(keyA, 105))).toBe("a2");
    expect(Effect.runSync(cache.get(keyA, 200))).toBeUndefined();
  });

  test("narrowed no-dedup scope: the metadata cache has no stochastic-inference dedup API", () => {
    const owner = composeMetadataCacheOwner();
    // NARROWED CLAIM: the metadata cache API is get/set/invalidate/size only; it has no in-flight coalescing or
    // request-dedup surface, so it cannot collapse distinct inference requests. (The real provider path's
    // stochastic execution is NOT exercised here - see the task doc's remaining-scope note.)
    expect(Object.keys(owner).some((name) => /inflight|dedupe|coalesce/i.test(name))).toBe(false);
    expect(owner.getSync).toBeTypeOf("function");
    expect(owner.setSync).toBeTypeOf("function");
    const key = metadataCacheKey({ authorityId: "auth", configGeneration: 1, modelId: "m" });
    owner.setSync(key, "metadata-1", 0);
    owner.setSync(key, "metadata-2", 0);
    expect(owner.sizeSync()).toBe(1);
  });

  test("live routing prep keys by authority+generation and reads the DAG cache", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
    const start = source.indexOf("const routingPrepConfigIdentity =");
    const end = source.indexOf("const telemetryScoresByEndpointId", start);
    expect(start).toBeGreaterThanOrEqual(0);
    const region = source.slice(start, end);
    expect(region).toContain("metadataCacheKey({");
    expect(region).toContain("metadataCacheOwner.noteConfig(");
    expect(region).toContain("metadataCacheOwner.getSync(");
    // S319: the DAG cache holds a REAL routing payload (observed profiles JSON), read for the decision path.
    expect(region).toContain("cachedObservedProfilesJson");
    expect(region).toContain("JSON.stringify(profiles)");
    expect(region).toContain("JSON.parse(cachedObservedProfilesJson");
    expect(region).toContain("metadataCacheOwner.keyFor(");
    expect(region).not.toContain("executeChatCompletions");
  });
});