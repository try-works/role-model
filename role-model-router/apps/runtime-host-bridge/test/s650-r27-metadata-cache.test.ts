import { Effect } from "effect";
import { describe, expect, test } from "vitest";

import {
  STOCHASTIC_INFERENCE_DEDUPE,
  composeMetadataCacheOwner,
  makeMetadataCache,
  metadataCacheKey,
  stochasticInferenceCacheKey,
} from "../src/composition-dag.js";

/**
 * S650/R27: the metadata cache identity is validated at its boundary and every stochastic inference
 * attempt gets its own key. The cache may reuse metadata, but it must never coalesce two distinct
 * stochastic attempts even when authority/config/model are identical.
 */

describe("S650 R27 metadata cache identity guards", () => {
  test("rejects an empty authority, empty model, non-integer generation, or NUL injection", () => {
    expect(() => metadataCacheKey({ authorityId: "", configGeneration: 1, modelId: "m" })).toThrow(/authority/i);
    expect(() => metadataCacheKey({ authorityId: "a", configGeneration: 1, modelId: "" })).toThrow(/model/i);
    expect(() => metadataCacheKey({ authorityId: "a", configGeneration: 1.5, modelId: "m" })).toThrow(/generation/i);
    expect(() => metadataCacheKey({ authorityId: "a\u0000b", configGeneration: 1, modelId: "m" })).toThrow(/authority|NUL/i);
  });

  test("the production metadata cache owner exposes the stochastic key guard and no dedupe", () => {
    const owner = composeMetadataCacheOwner();
    expect(owner.stochasticInferenceDedupe).toBe(false);
    const first = owner.stochasticKeyFor("model", "attempt-1");
    const second = owner.stochasticKeyFor("model", "attempt-2");
    expect(first).not.toBe(second);
    expect(first).not.toBe(owner.keyFor("model"));
    owner.setSync(first, "inference-1", 0);
    owner.setSync(second, "inference-2", 0);
    expect(owner.getSync(first, 1)).toBe("inference-1");
    expect(owner.getSync(second, 1)).toBe("inference-2");
  });

  test("distinct stochastic attempts always produce distinct keys and both values remain available", () => {
    const input = { authorityId: "auth", configGeneration: 2, modelId: "model" };
    const first = stochasticInferenceCacheKey({ ...input, attemptId: "attempt-1" });
    const second = stochasticInferenceCacheKey({ ...input, attemptId: "attempt-2" });
    expect(first).not.toBe(second);
    expect(first).not.toBe(metadataCacheKey(input));
    expect(STOCHASTIC_INFERENCE_DEDUPE).toBe(false);
    expect(() => stochasticInferenceCacheKey({ ...input, attemptId: "" })).toThrow(/attempt/i);
    const cache = makeMetadataCache({ capacity: 4, ttlMs: 1_000 });
    Effect.runSync(cache.set(first, "inference-1", 0));
    Effect.runSync(cache.set(second, "inference-2", 0));
    expect(Effect.runSync(cache.get(first, 1))).toBe("inference-1");
    expect(Effect.runSync(cache.get(second, 1))).toBe("inference-2");
  });
});