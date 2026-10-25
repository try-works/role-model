import { existsSync, mkdirSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { makeSync } from "@effect/sql-sqlite-node/service";
import { afterEach, describe, expect, test } from "vitest";

import {
  openReadOnlyStateDatabase,
  readEndpointModelIdForRoutePackage,
  readPersistedControllerEndpointId,
  readRouteCaptureFromQueueReceipt,
  setStateDatabaseServiceFactoryForTests,
} from "../src/cli.js";

/**
 * Run 115 S6b/S6c (R23): the cli.ts single-row read-only lookups use the SQLite service's sync
 * facade. S6c pins the three properties the S6b review could mutate away:
 *   - exactly one connection per lookup (counting factory seam),
 *   - the connection closed on success, on a thrown query and on a failing open,
 *   - the open genuinely read-only (a write through the handle must fail).
 * It also honours ROLE_MODEL_TEST_TEMP_ROOT instead of hardcoding E:.
 *
 * Timing note (see evidence/other/s6c-tdd.json): the busy-lock RED is a measured wall time, not a
 * sum of our sleeps - with setup busy0 removed, open ~1ms, the single SELECT's busy wait ~7384ms,
 * close ~0ms; node:sqlite's 5000ms busy timeout overshoots on Windows. It is NOT 100/200ms open
 * retries (the open phase is 1ms).
 */

const roots: string[] = [];
const baseTemp =
  process.env.ROLE_MODEL_TEST_TEMP_ROOT?.trim() || path.join(tmpdir(), "role-model-run115");

afterEach(async () => {
  setStateDatabaseServiceFactoryForTests(undefined);
  await Promise.all(
    roots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })),
  );
});

async function tempRoot(): Promise<string> {
  await mkdir(baseTemp, { recursive: true });
  const root = await mkdtemp(path.join(baseTemp, "s6c-"));
  roots.push(root);
  return root;
}

function memoryPath(root: string, scope = "tenant"): string {
  return path.join(root, scope, "memory", "memory.sqlite");
}

function receiptPath(root: string, scope = "tenant"): string {
  return path.join(root, scope, "track-b", "deferred-route-captures.sqlite");
}

function ensureDir(file: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
}

function seed(file: string, statements: readonly string[]): void {
  ensureDir(file);
  const database = new DatabaseSync(file);
  try {
    for (const statement of statements) database.exec(statement);
  } finally {
    database.close();
  }
}

interface ConnectionCounts {
  opens: number;
  closes: number;
}

/** Wraps the real service so opens and closeSync are observable without changing behaviour. */
const countingFactory = (counts: ConnectionCounts): typeof makeSync =>
  (config) => {
    counts.opens += 1;
    const service = makeSync(config);
    return {
      ...service,
      closeSync: () => {
        counts.closes += 1;
        service.closeSync();
      },
    };
  };

describe("S6b/S6c cli SQLite service migration", () => {
  test("endpoint model lookup preserves result, null fallbacks and read-only open", async () => {
    const root = await tempRoot();
    const file = memoryPath(root);
    seed(file, [
      "CREATE TABLE runtime_endpoints (endpoint_id TEXT PRIMARY KEY, model_id TEXT)",
      "INSERT INTO runtime_endpoints (endpoint_id, model_id) VALUES ('endpoint:known', 'provider/model-known')",
    ]);
    expect(
      readEndpointModelIdForRoutePackage({
        runtimeStateRoot: root,
        scopeId: "tenant",
        routePackage: "endpoint:known",
      }),
    ).toBe("provider/model-known");
    expect(
      readEndpointModelIdForRoutePackage({
        runtimeStateRoot: root,
        scopeId: "tenant",
        routePackage: "endpoint:missing",
      }),
    ).toBeNull();

    // A missing file must stay missing: any open would be pointless and a read-write open would create it.
    const absentFile = memoryPath(root, "absent-scope");
    expect(
      readEndpointModelIdForRoutePackage({
        runtimeStateRoot: root,
        scopeId: "absent-scope",
        routePackage: "endpoint:known",
      }),
    ).toBeNull();
    expect(existsSync(absentFile)).toBe(false);

    // A corrupt file is the same null surface, not a throw.
    const corruptFile = memoryPath(root, "corrupt-scope");
    ensureDir(corruptFile);
    await writeFile(corruptFile, "not a sqlite database");
    expect(
      readEndpointModelIdForRoutePackage({
        runtimeStateRoot: root,
        scopeId: "corrupt-scope",
        routePackage: "endpoint:known",
      }),
    ).toBeNull();
  });

  test("opens exactly one connection per lookup", async () => {
    const root = await tempRoot();
    seed(memoryPath(root), [
      "CREATE TABLE runtime_endpoints (endpoint_id TEXT PRIMARY KEY, model_id TEXT)",
      "INSERT INTO runtime_endpoints (endpoint_id, model_id) VALUES ('endpoint:known', 'provider/model-known')",
    ]);
    const counts: ConnectionCounts = { closes: 0, opens: 0 };
    setStateDatabaseServiceFactoryForTests(countingFactory(counts));

    expect(
      readEndpointModelIdForRoutePackage({
        runtimeStateRoot: root,
        scopeId: "tenant",
        routePackage: "endpoint:known",
      }),
    ).toBe("provider/model-known");
    expect(counts).toEqual({ closes: 1, opens: 1 });

    // Every lookup is its own single connection, not a shared or duplicated one.
    expect(readPersistedControllerEndpointId({ runtimeStateRoot: root, scopeId: "tenant" })).toBeNull();
    expect(counts).toEqual({ closes: 2, opens: 2 });
  });

  test("closes the connection on success, on a thrown query and on a failing open", async () => {
    const root = await tempRoot();
    seed(memoryPath(root), [
      "CREATE TABLE runtime_endpoints (endpoint_id TEXT PRIMARY KEY, model_id TEXT)",
      "INSERT INTO runtime_endpoints (endpoint_id, model_id) VALUES ('endpoint:known', 'provider/model-known')",
    ]);
    const counts: ConnectionCounts = { closes: 0, opens: 0 };
    setStateDatabaseServiceFactoryForTests(countingFactory(counts));

    // success: work returns, finally closes.
    expect(
      readEndpointModelIdForRoutePackage({
        runtimeStateRoot: root,
        scopeId: "tenant",
        routePackage: "endpoint:known",
      }),
    ).toBe("provider/model-known");
    expect(counts).toEqual({ closes: 1, opens: 1 });

    // thrown query: the table is missing, work throws inside the helper, finally still closes.
    seed(memoryPath(root, "empty-scope"), ["CREATE TABLE unrelated (id TEXT)"]);
    expect(
      readEndpointModelIdForRoutePackage({
        runtimeStateRoot: root,
        scopeId: "empty-scope",
        routePackage: "endpoint:known",
      }),
    ).toBeNull();
    expect(counts).toEqual({ closes: 2, opens: 2 });

    // failing open: no service exists, so there is nothing to close, and the error is still null.
    let openAttempts = 0;
    setStateDatabaseServiceFactoryForTests(() => {
      openAttempts += 1;
      throw new Error("open refused");
    });
    expect(
      readEndpointModelIdForRoutePackage({
        runtimeStateRoot: root,
        scopeId: "tenant",
        routePackage: "endpoint:known",
      }),
    ).toBeNull();
    expect(openAttempts).toBe(1);
    expect(counts.closes).toBe(2);
  });

  test("opens the state database genuinely read-only: a write through the handle fails", async () => {
    const root = await tempRoot();
    const file = memoryPath(root);
    seed(file, [
      "CREATE TABLE runtime_endpoints (endpoint_id TEXT PRIMARY KEY, model_id TEXT)",
      "INSERT INTO runtime_endpoints (endpoint_id, model_id) VALUES ('endpoint:known', 'provider/model-known')",
    ]);
    const database = openReadOnlyStateDatabase(file);
    try {
      // The handle is usable for reads...
      const row = database
        .prepare("SELECT model_id FROM runtime_endpoints WHERE endpoint_id = ?")
        .get("endpoint:known") as { model_id?: unknown } | undefined;
      expect(row?.model_id).toBe("provider/model-known");
      // ...and refuses any write: a read-write open would let this succeed.
      expect(() => database.exec("CREATE TABLE s6c_write_probe (id TEXT)")).toThrow(
        /readonly|read-only|readonly database/iu,
      );
    } finally {
      database.close();
    }
  });

  test("preserves busy_timeout=0: an exclusive writer yields null immediately", async () => {
    const root = await tempRoot();
    const file = memoryPath(root);
    seed(file, [
      "CREATE TABLE runtime_endpoints (endpoint_id TEXT PRIMARY KEY, model_id TEXT)",
      "INSERT INTO runtime_endpoints (endpoint_id, model_id) VALUES ('endpoint:known', 'provider/model-known')",
    ]);
    const blocker = new DatabaseSync(file);
    try {
      blocker.exec("BEGIN EXCLUSIVE");
      const startedAt = Date.now();
      expect(
        readEndpointModelIdForRoutePackage({
          runtimeStateRoot: root,
          scopeId: "tenant",
          routePackage: "endpoint:known",
        }),
      ).toBeNull();
      expect(Date.now() - startedAt).toBeLessThan(1000);
    } finally {
      blocker.exec("ROLLBACK");
      blocker.close();
    }
  });

  test("controller lookup preserves scope precedence and latest-row ordering", async () => {
    const root = await tempRoot();
    seed(memoryPath(root), [
      "CREATE TABLE runtime_controller_assignments (scope TEXT, endpoint_id TEXT, updated_at_ms INTEGER)",
      "INSERT INTO runtime_controller_assignments VALUES ('global', 'endpoint:global-new', 300)",
      "INSERT INTO runtime_controller_assignments VALUES ('tenant', 'endpoint:tenant-old', 100)",
      "INSERT INTO runtime_controller_assignments VALUES ('tenant', 'endpoint:tenant-new', 200)",
    ]);
    expect(readPersistedControllerEndpointId({ runtimeStateRoot: root, scopeId: "tenant" })).toBe(
      "endpoint:tenant-new",
    );
    seed(memoryPath(root, "global-only"), [
      "CREATE TABLE runtime_controller_assignments (scope TEXT, endpoint_id TEXT, updated_at_ms INTEGER)",
      "INSERT INTO runtime_controller_assignments VALUES ('global', 'endpoint:global-new', 300)",
    ]);
    expect(
      readPersistedControllerEndpointId({ runtimeStateRoot: root, scopeId: "global-only" }),
    ).toBe("endpoint:global-new");
    seed(memoryPath(root, "none"), [
      "CREATE TABLE runtime_controller_assignments (scope TEXT, endpoint_id TEXT, updated_at_ms INTEGER)",
    ]);
    expect(
      readPersistedControllerEndpointId({ runtimeStateRoot: root, scopeId: "none" }),
    ).toBeNull();
    const absent = path.join(root, "absent", "memory", "memory.sqlite");
    expect(
      readPersistedControllerEndpointId({ runtimeStateRoot: root, scopeId: "absent" }),
    ).toBeNull();
    expect(existsSync(absent)).toBe(false);
  });

  test("capture receipt lookup preserves envelope/bare shapes and malformed fallbacks", async () => {
    const root = await tempRoot();
    const file = receiptPath(root);
    seed(file, [
      "CREATE TABLE track_b_route_capture_receipts (request_id TEXT PRIMARY KEY, result_json TEXT)",
      `INSERT INTO track_b_route_capture_receipts VALUES ('req:envelope', '{"status":"delivered","result":{"requestId":"req:envelope","marker":"envelope"}}')`,
      `INSERT INTO track_b_route_capture_receipts VALUES ('req:bare', '{"requestId":"req:bare","marker":"bare"}')`,
      "INSERT INTO track_b_route_capture_receipts VALUES ('req:malformed', '{not-json')",
      `INSERT INTO track_b_route_capture_receipts VALUES ('req:noid', '{"marker":"none"}')`,
    ]);
    expect(
      readRouteCaptureFromQueueReceipt({
        runtimeStateRoot: root,
        scopeId: "tenant",
        requestId: "req:envelope",
      }),
    ).toMatchObject({ marker: "envelope", requestId: "req:envelope" });
    expect(
      readRouteCaptureFromQueueReceipt({
        runtimeStateRoot: root,
        scopeId: "tenant",
        requestId: "req:bare",
      }),
    ).toMatchObject({ marker: "bare", requestId: "req:bare" });
    expect(
      readRouteCaptureFromQueueReceipt({
        runtimeStateRoot: root,
        scopeId: "tenant",
        requestId: "req:malformed",
      }),
    ).toBeNull();
    expect(
      readRouteCaptureFromQueueReceipt({
        runtimeStateRoot: root,
        scopeId: "tenant",
        requestId: "req:noid",
      }),
    ).toBeNull();
    expect(
      readRouteCaptureFromQueueReceipt({
        runtimeStateRoot: root,
        scopeId: "tenant",
        requestId: "req:absent",
      }),
    ).toBeNull();
    const absent = receiptPath(root, "absent");
    expect(
      readRouteCaptureFromQueueReceipt({
        runtimeStateRoot: root,
        scopeId: "absent",
        requestId: "req:envelope",
      }),
    ).toBeNull();
    expect(existsSync(absent)).toBe(false);
  });
});
