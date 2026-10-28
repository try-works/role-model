import { describe, expect, test } from "vitest";

import {
  assertComposedObservationStorage,
  composeObservationStorage,
  makeObservationStorage,
  isComposedObservationStorage,
  ObservationHydrationJobTimeoutError,
  ObservationHydrationOverflowError,
  ObservationHydrationTimeoutError,
} from "../src/composition-dag.js";

/** S334 (R23): Backend-owned observation storage: bounded async hydration queue + sync read-through. */

describe("S334 observation storage", () => {
  test("identity: one DAG-owned instance, branded, no fallback", () => {
    const a = composeObservationStorage({ capacity: 4 });
    const b = composeObservationStorage({ capacity: 4 });
    expect(a).toBe(b);
    expect(isComposedObservationStorage(a)).toBe(true);
    expect(() => assertComposedObservationStorage({ persist: () => {}, read: () => "x" })).toThrow(
      /composed DAG owner/,
    );
  });

  test("bounded hydration queue: typed overflow at capacity, writes still applied, drain joins", async () => {
    const storage = makeObservationStorage(1);
    let writes = 0;
    const releases: ((value: object | undefined) => void)[] = [];
    for (let index = 0; index < 3; index += 1) {
      const gate = new Promise<object | undefined>((resolve) => { releases.push(resolve); });
      storage.persist(
        () => { writes += 1; },
        () => gate,
        "key-" + String(index),
      );
    }
    expect(writes).toBe(3);
    expect(storage.queueDepth()).toBeLessThanOrEqual(1);
    expect(storage.hydrationError()).toBeInstanceOf(ObservationHydrationOverflowError);
    for (const release of releases) release(undefined);
    await storage.drain();
    expect(storage.queueDepth()).toBe(0);
  });

  test("sync read-through: cached hydration is returned, raw read fallback preserves sync semantics", async () => {
    const storage = makeObservationStorage(8);
    storage.persist(() => {}, async () => ({ hydrated: true }), "request-1");
    // Before the worker hydrates, the caller gets the existing sync fallback (byte-for-byte semantics).
    const fallback = storage.read("request-1", () => ({ hydrated: false }));
    expect(fallback).toEqual({ hydrated: false });
    await storage.drain();
    expect(storage.read("request-1", () => ({ hydrated: false }))).toEqual({ hydrated: true });
  });

  test("production wiring: persist families and the bundle read family route through the DAG storage", async () => {
    const { readFileSync } = await import("node:fs");
    const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
    expect(index).toContain("observationStorage.readHydrated(");
    expect(index).toContain("observationStorage.persist(");
    expect(index).toContain("observationStorage.readHydrated(graphObservationKey(");
    expect(index).toContain("persistRuntimeObservationBundle(");
  });

  test("hung job: drain rejects with the typed 5s timeout and the pump does not stay permanently active", async () => {
    const storage = makeObservationStorage(2);
    storage.persist(() => {}, () => new Promise<object>(() => {}), "hung");
    await expect(storage.drain()).rejects.toBeInstanceOf(ObservationHydrationTimeoutError);
    expect(storage.hydrationError()).toBeInstanceOf(ObservationHydrationJobTimeoutError);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(storage.pumpActive()).toBe(false);
  });

  test("later-job progress: after a hung job is abandoned, a queued later job runs", async () => {
    const storage = makeObservationStorage(2, 30);
    storage.persist(() => {}, () => new Promise<object>(() => {}), "hung");
    storage.persist(() => {}, async () => ({ later: true }), "later");
    await storage.drain();
    expect(storage.hydrationError()).toBeInstanceOf(ObservationHydrationJobTimeoutError);
    expect(storage.read("later", () => null)).toEqual({ later: true });
  });

  test("failure continues: a failing hydration job does not stop the pump", async () => {
    const storage = makeObservationStorage(2, 100);
    storage.persist(() => {}, async () => { throw new Error("boom"); }, "fails");
    storage.persist(() => {}, async () => ({ next: true }), "next");
    await storage.drain();
    expect(String(storage.hydrationError()?.message)).toContain("boom");
    expect(storage.read("next", () => null)).toEqual({ next: true });
  });

  test("drain watchdog abandons a hung active job and queued later jobs still run", async () => {
    const storage = makeObservationStorage(2, 60_000);
    storage.persist(() => {}, () => new Promise<object>(() => {}), "hung-watchdog");
    storage.persist(() => {}, async () => ({ laterAfterWatchdog: true }), "later-after-watchdog");
    await expect(storage.drain()).rejects.toBeInstanceOf(ObservationHydrationTimeoutError);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(storage.pumpActive()).toBe(false);
    expect(storage.read("later-after-watchdog", () => null)).toEqual({ laterAfterWatchdog: true });
    expect(storage.read("hung-watchdog", () => null)).toBeNull();
  });

  test("eventual settle after abandonment writes no cache entry and does not double-decrement pending", async () => {
    const storage = makeObservationStorage(2, 60_000);
    let releaseHung: ((value: object) => void) | null = null;
    const hungGate = new Promise<object>((resolve) => { releaseHung = resolve; });
    storage.persist(() => {}, () => hungGate, "hung-settles");
    await expect(storage.drain()).rejects.toBeInstanceOf(ObservationHydrationTimeoutError);
    releaseHung?.({ settledLate: true });
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(storage.pumpActive()).toBe(false);
    // No cache write from the abandoned job.
    expect(storage.read("hung-settles", () => null)).toBeNull();
    // pending was decremented once at abandonment; a fresh job still drains (no double-decrement deadlock).
    storage.persist(() => {}, async () => ({ freshAfterSettle: true }), "fresh-after-settle");
    await storage.drain();
    expect(storage.read("fresh-after-settle", () => null)).toEqual({ freshAfterSettle: true });
  });
});