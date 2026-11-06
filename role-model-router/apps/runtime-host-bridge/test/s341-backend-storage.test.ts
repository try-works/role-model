import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { composeBackendStorage, graphObservationKey } from "../src/composition-dag.js";

/** S341 (R23): Backend storage factory split: per-backend storage lifecycle + graph keys. */

describe("S341 backend storage factory", () => {
  test("composeBackendStorage returns a per-backend lifecycle with initialization, graph store and observation storage", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "s341-storage-"));
    const a = composeBackendStorage({
      channel: "development",
      runtimeStateRoot: root,
      scopeId: "scope-a",
      trackBOperationsEndpoint: undefined,
      useFixtures: true,
    });
    const b = composeBackendStorage({
      channel: "development",
      runtimeStateRoot: root,
      scopeId: "scope-b",
      trackBOperationsEndpoint: undefined,
      useFixtures: true,
    });
    expect(a).not.toBe(b);
    expect(a.observationStorage).not.toBe(b.observationStorage);
    expect(a.initialization.databasePath).toContain("scope-a");
    expect(a.graphStore).toBeDefined();
    // fixture-mode conditional: a configured Track-B operations endpoint disables the local file graph store.
    const remote = composeBackendStorage({
      channel: "development",
      runtimeStateRoot: root,
      scopeId: "scope-c",
      trackBOperationsEndpoint: "http://track-b.invalid",
      useFixtures: true,
    });
    expect(remote.graphStore).toBeUndefined();
  });

  test("persisted bundle hits the graph read cache with the same helper key", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "s341-hit-"));
    const storage = composeBackendStorage({
      channel: "development",
      runtimeStateRoot: root,
      scopeId: "scope-hit",
      trackBOperationsEndpoint: undefined,
      useFixtures: false,
    });
    const key = graphObservationKey("scope-hit", "request-hit");
    storage.observationStorage.persist(
      () => {},
      async () => ({ persisted: true }),
      key,
    );
    await storage.observationStorage.drain();
    let fallbackCalls = 0;
    const value = storage.observationStorage.read(key, () => {
      fallbackCalls += 1;
      return null;
    });
    expect(value).toEqual({ persisted: true });
    expect(fallbackCalls).toBe(0);
    await storage.close();
  });

  test("graph observation keys are collision-free across scopes and artifacts", () => {
    expect(graphObservationKey("scope-a", "request-1")).not.toBe(
      graphObservationKey("scope-a", "request-2"),
    );
    expect(graphObservationKey("scope-a", "request-1")).not.toBe(
      graphObservationKey("scope-b", "request-1"),
    );
    expect(graphObservationKey("scope-a", "request-1")).toBe("graph:scope-a:request-1");
  });

  test("close drains the observation storage and is idempotent", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "s341-close-"));
    const storage = composeBackendStorage({
      channel: "development",
      runtimeStateRoot: root,
      scopeId: "scope-close",
      trackBOperationsEndpoint: undefined,
      useFixtures: false,
    });
    let hydrated = 0;
    storage.observationStorage.persist(
      () => {},
      async () => {
        hydrated += 1;
        return { ok: true };
      },
      "graph:scope-close:request-1",
    );
    await storage.close();
    await storage.close();
    expect(hydrated).toBe(1);
    expect(storage.observationStorage.queueDepth()).toBe(0);
  });

  test("BackendOwner exposes the same composed storage instance through the storage ref (identity)", async () => {
    const { composeBackendOwner, bindBackendStorageRef } = await import(
      "../src/composition-dag.js"
    );
    const root = mkdtempSync(path.join(os.tmpdir(), "s341-owner-"));
    const storage = composeBackendStorage({
      channel: "development",
      runtimeStateRoot: root,
      scopeId: "scope-owner",
      trackBOperationsEndpoint: undefined,
      useFixtures: false,
    });
    const storageRef: { current: typeof storage | undefined } = { current: undefined };
    const owner = composeBackendOwner({
      // SAFETY: test-only structural cast required by the composer input types.
      emptyCatalog: {} as never,
      // SAFETY: test-only structural cast required by the composer input types.
      emptyRegistry: {
        diagnostics: [],
        endpoints: [],
        lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
      } as never,
      host: "127.0.0.1",
      overrides: {},
      port: 0,
      projectCliStartupReadiness: (state) => state,
      readBootstrapState: () => ({ status: "ready" }),
      resolveBackend: () => ({
        effectiveRegistry: {
          diagnostics: [],
          endpoints: [],
          lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
        },
      }),
      storageRef,
      // SAFETY: test-only structural cast required by the composer input types.
    } as never);
    bindBackendStorageRef(owner.options, storageRef);
    storageRef.current = storage;
    expect(owner.storage).toBe(storage);
    expect(bindBackendStorageRef).toBeTypeOf("function");
  });

  test("observed-profiles read family uses the bound backend storage instance (family identity)", async () => {
    const { readObservedProfilesForRouting } = await import("../src/index.js");
    const { makeObservationStorage } = await import("../src/composition-dag.js");
    const storage = makeObservationStorage(4);
    let readHydratedCalls = 0;
    const spy = {
      ...storage,
      readHydrated: <T>(key: string, read: () => T): T => {
        readHydratedCalls += 1;
        return storage.readHydrated(key, read);
      },
    };
    try {
      readObservedProfilesForRouting(
        {
          databasePath: "s341-memory.sqlite",
          difficultyBucket: undefined,
          observedDataConfig: { aggregation: { minSamples: 1 } },
          registry: {
            diagnostics: [],
            endpoints: [],
            lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
          },
          routingTimeMs: 0,
          // SAFETY: test-only structural cast required by the composer input types.
        } as never,
        spy,
      );
    } catch {
      // the probe only asserts the store instance used by the family
    }
    expect(readHydratedCalls).toBeGreaterThanOrEqual(1);
    await storage.drain().catch(() => undefined);
  });
});
