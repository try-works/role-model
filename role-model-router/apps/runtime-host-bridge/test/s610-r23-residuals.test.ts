import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { composeBackendStorage, graphObservationKey } from "../src/composition-dag.js";

/** S610 (R23 bounded slice): graph hydration failure hygiene + transaction-owned cleanup close. */

const storageFor = (scopeId: string) =>
  composeBackendStorage({
    channel: "development",
    runtimeStateRoot: mkdtempSync(path.join(os.tmpdir(), "s610-r23-")),
    scopeId,
    trackBOperationsEndpoint: undefined,
    useFixtures: false,
  });

describe("S610 R23 residual clauses", () => {
  test("a failed graph hydration never installs a partial cache entry", async () => {
    const storage = storageFor("graph-failure");
    const key = graphObservationKey("graph-failure", "request-failed");
    storage.observationStorage.persist(() => {}, async () => {
      throw new Error("graph hydration failed");
    }, key);
    await storage.observationStorage.drain();
    expect(storage.observationStorage.read(key, () => ({ fallback: true }))).toEqual({ fallback: true });
    expect(storage.observationStorage.readHydrated(key, () => ({ fresh: true }))).toEqual({ fresh: true });
    await storage.close();
  });

  test("rich graph hydration is cached only after the async job settles", async () => {
    const storage = storageFor("graph-settled");
    const key = graphObservationKey("graph-settled", "request-settled");
    storage.observationStorage.persist(() => {}, async () => ({ nodes: ["a", "b"], edges: 1 }), key);
    expect(storage.observationStorage.read(key, () => null)).toBeNull();
    await storage.observationStorage.drain();
    expect(storage.observationStorage.read(key, () => null)).toEqual({ nodes: ["a", "b"], edges: 1 });
    await storage.close();
  });

  test("transaction-owned cleanup databases are closed by the backend storage lifecycle", async () => {
    const storage = storageFor("cleanup-close");
    const first = storage.openRetentionCleanupDatabase(":memory:");
    const second = storage.openRetentionCleanupDatabase(":memory:");
    expect(first.querySync("SELECT 1 AS ok")[0]).toEqual({ ok: 1 });
    await storage.close();
    expect(() => first.querySync("SELECT 1")).toThrow();
    expect(() => second.querySync("SELECT 1")).toThrow();
    await storage.close();
  });
});
