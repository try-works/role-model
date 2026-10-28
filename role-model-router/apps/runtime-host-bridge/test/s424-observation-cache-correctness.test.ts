import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  initializeSqliteMemory,
  persistRuntimeTelemetryFailure,
  readRuntimeTelemetrySummary,
} from "@role-model-router/sqlite-memory";
import { describe, expect, test } from "vitest";

import {
  makeObservationStorage,
  ObservationHydrationJobTimeoutError,
  ObservationHydrationOverflowError,
  ObservationHydrationTimeoutError,
} from "../src/composition-dag.js";

/** S424 (R23/R27): mutable reads are fresh; explicit snapshots are bounded and write-invalidated. */

describe("S424 mutable read freshness", () => {
  test("readHydrated invokes the reader on every call and never returns a captured snapshot", async () => {
    const storage = makeObservationStorage(8);
    let calls = 0;
    let version = 1;
    const read = () => {
      calls += 1;
      return { version };
    };
    expect(storage.readHydrated("mutable", read)).toEqual({ version: 1 });
    await storage.drain();
    version = 2;
    expect(storage.readHydrated("mutable", read)).toEqual({ version: 2 });
    expect(calls).toBe(2);
    expect(storage.cached("mutable")).toBeUndefined();
    expect(storage.queueDepth()).toBe(0);
  });

  test("fresh readHydrated calls do not create cached async work", async () => {
    const storage = makeObservationStorage(8);
    storage.readHydrated("one", () => ({ one: 1 }));
    storage.readHydrated("two", () => ({ two: 2 }));
    expect(storage.queueDepth()).toBe(0);
    expect(storage.pumpActive()).toBe(false);
    await storage.drain();
    expect(storage.cached("one")).toBeUndefined();
    expect(storage.cached("two")).toBeUndefined();
  });

  test("read() serves explicit hydration snapshots while readHydrated stays live", async () => {
    const storage = makeObservationStorage(8);
    storage.persist(() => {}, async () => ({ snap: true }), "explicit");
    await storage.drain();
    expect(storage.read("explicit", () => ({ fresh: true }))).toEqual({ snap: true });
    expect(storage.readHydrated("explicit", () => ({ fresh: true }))).toEqual({ fresh: true });
  });

  test("a real disposable SQLite mutable read observes newly persisted telemetry", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "s424-sqlite-"));
    try {
      const initialized = initializeSqliteMemory({ channel: "development", runtimeStateRoot: root, scopeId: "s424" });
      const databasePath = initialized.databasePath;
      const storage = makeObservationStorage(8);
      const read = () => readRuntimeTelemetrySummary({ databasePath, windowMs: 60_000 });
      persistRuntimeTelemetryFailure({ databasePath, errorClass: "none", requestId: "s424-1", statusCode: 200 });
      expect(storage.readHydrated("telemetry-summary:real", read).requestCount).toBe(1);
      persistRuntimeTelemetryFailure({ databasePath, errorClass: "none", requestId: "s424-2", statusCode: 200 });
      expect(storage.readHydrated("telemetry-summary:real", read).requestCount).toBe(2);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

describe("S424 explicit snapshot bounds and write invalidation", () => {
  test("six sequential successful persist/drain cycles retain at most capacity snapshots", async () => {
    const storage = makeObservationStorage(2);
    let callbacks = 0;
    for (let index = 0; index < 6; index += 1) {
      storage.persist(() => {}, async () => {
        callbacks += 1;
        return { index };
      }, "snap-" + String(index));
      await storage.drain();
    }
    expect(callbacks).toBe(6);
    const retained = Array.from({ length: 6 }, (_, index) => storage.cached("snap-" + String(index))).filter(
      (value) => value !== undefined,
    );
    expect(retained.length).toBeLessThanOrEqual(2);
  });

  test("a successful write invalidates the old same-key snapshot immediately", async () => {
    const storage = makeObservationStorage(4);
    storage.persist(() => {}, async () => ({ value: 1 }), "same");
    await storage.drain();
    expect(storage.read("same", () => ({ fresh: 0 }))).toEqual({ value: 1 });
    storage.persist(() => {}, undefined, "same");
    expect(storage.read("same", () => ({ fresh: 2 }))).toEqual({ fresh: 2 });
  });

  test("failed hydration installs no snapshot", async () => {
    const storage = makeObservationStorage(1);
    storage.persist(() => {}, async () => ({ old: true }), "key");
    await storage.drain();
    storage.persist(() => {}, async () => { throw new Error("hydrate failed"); }, "key");
    await storage.drain();
    expect(storage.read("key", () => ({ fallback: true }))).toEqual({ fallback: true });
  });

  test("a true queue-full same-key overflow invalidates the old snapshot and a fresh hydration succeeds", async () => {
    const storage = makeObservationStorage(2);
    storage.persist(() => {}, async () => ({ old: true }), "same-key");
    await storage.drain();
    expect(storage.read("same-key", () => ({ fallback: true }))).toEqual({ old: true });

    let releaseHung: (() => void) | null = null;
    const hung = new Promise<object>((resolve) => { releaseHung = () => resolve({ hung: true }); });
    storage.persist(() => {}, () => hung, "active-hung");
    storage.persist(() => {}, async () => ({ queued: "b" }), "queued-b");
    storage.persist(() => {}, async () => ({ queued: "d" }), "queued-d");
    expect(storage.queueDepth()).toBe(2);

    storage.persist(() => {}, async () => ({ overflowed: true }), "same-key");
    expect(storage.hydrationError()).toBeInstanceOf(ObservationHydrationOverflowError);
    expect(storage.read("same-key", () => ({ fallback: true }))).toEqual({ fallback: true });

    releaseHung?.();
    await storage.drain();
    storage.persist(() => {}, async () => ({ fresh: true }), "same-key");
    await storage.drain();
    expect(storage.read("same-key", () => ({ fallback: true }))).toEqual({ fresh: true });
  });

  test("a late old hydration cannot restore a value after a newer same-key write", async () => {
    interface StaleHydrationValue { readonly stale: true }
    const storage = makeObservationStorage(4);
    let releaseOld: ((value: StaleHydrationValue) => void) | null = null;
    const oldGate = new Promise<StaleHydrationValue>((resolve) => { releaseOld = resolve; });
    storage.persist(() => {}, () => oldGate, "late");
    storage.persist(() => {}, undefined, "late");
    releaseOld?.({ stale: true });
    await storage.drain();
    expect(storage.read("late", () => ({ fresh: true }))).toEqual({ fresh: true });
    expect(storage.cached("late")).toBeUndefined();
  });

  test("invalid capacities are rejected instead of allowing an unbounded snapshot store", () => {
    expect(() => makeObservationStorage(0)).toThrow(/positive/);
    expect(() => makeObservationStorage(-1)).toThrow(/positive/);
    expect(() => makeObservationStorage(Number.NaN)).toThrow(/positive/);
  });

  test("sync reader and write errors retain their identity", () => {
    const storage = makeObservationStorage(4);
    const readError = new Error("read failed");
    expect(() => storage.read("missing", () => { throw readError; })).toThrow(readError);
    const writeError = new Error("write failed");
    expect(() => storage.persist(() => { throw writeError; }, async () => null, "write-fail")).toThrow(writeError);
    expect(storage.queueDepth()).toBe(0);
  });

  test("a late rejection after the drain timeout does not overwrite the typed timeout", async () => {
    const storage = makeObservationStorage(2);
    let rejectHung: ((error: Error) => void) | null = null;
    const hung = new Promise<object>((_, reject) => { rejectHung = (error) => reject(error); });
    storage.persist(() => {}, () => hung, "late-reject");
    await expect(storage.drain()).rejects.toBeInstanceOf(ObservationHydrationTimeoutError);
    expect(storage.hydrationError()).toBeInstanceOf(ObservationHydrationJobTimeoutError);
    rejectHung?.(new Error("late-reject"));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(storage.hydrationError()).toBeInstanceOf(ObservationHydrationJobTimeoutError);
    expect(storage.hydrationError()?.message).toContain("job timed out: late-reject");
  });
});
