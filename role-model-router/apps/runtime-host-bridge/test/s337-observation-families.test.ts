import { describe, expect, test } from "vitest";

import {
  composeObservationStorage,
  liveScoresObservationKey,
  makeObservationStorage,
} from "../src/composition-dag.js";

/** S338 behavioral: hydration populates the cache; key identity; persistence for persist families. */

describe("S338 observation family migration behavior", () => {
  test("readHydrated populates the cache and a subsequent read hits it (fallback not called)", async () => {
    const storage = makeObservationStorage(4);
    let fallbackCalls = 0;
    const first = storage.readHydrated("telemetry-summary:k", () => {
      fallbackCalls += 1;
      return { value: 1 };
    });
    await storage.drain();
    const second = storage.readHydrated("telemetry-summary:k", () => {
      fallbackCalls += 1;
      return { value: 2 };
    });
    expect(first).toEqual({ value: 1 });
    expect(second).toEqual({ value: 1 });
    expect(fallbackCalls).toBe(1);
  });

  test("a different hydration key falls back instead of serving the other key's cache", async () => {
    const storage = makeObservationStorage(4);
    let fallbackCalls = 0;
    storage.readHydrated("observed-profiles:a", () => { fallbackCalls += 1; return { value: "a" }; });
    await storage.drain();
    const other = storage.readHydrated("observed-profiles:b", () => { fallbackCalls += 1; return { value: "b" }; });
    expect(other).toEqual({ value: "b" });
    expect(fallbackCalls).toBe(2);
  });

  test("live-scores key includes endpoint + window + minimumSampleCount aggregation identity", () => {
    const base = liveScoresObservationKey("ep-1", 1000, 2000, 10);
    expect(liveScoresObservationKey("ep-1", 1000, 2000, 11)).not.toBe(base);
    expect(liveScoresObservationKey("ep-1", 1000, 3000, 10)).not.toBe(base);
    expect(liveScoresObservationKey("ep-2", 1000, 2000, 10)).not.toBe(base);
    expect(base).toContain("live-scores:ep-1");
    expect(base).toContain(":1000:");
    expect(base).toContain(":2000:");
    expect(base).toContain(":10");
  });

  test("persist families write synchronously then hydrate the same key for later reads", async () => {
    const storage = makeObservationStorage(4);
    let writes = 0;
    storage.persist(() => { writes += 1; }, async () => ({ persisted: true }), "observation:request-1");
    expect(writes).toBe(1);
    expect(storage.read("observation:request-1", () => null)).toBeNull();
    await storage.drain();
    expect(storage.read("observation:request-1", () => null)).toEqual({ persisted: true });
    expect(composeObservationStorage()).toBe(composeObservationStorage());
  });
});
