import { existsSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Effect } from "effect";
import { afterEach, describe, expect, test } from "vitest";

import {
  MaintenanceBudgetError,
  MaintenanceBusyError,
  MaintenanceDrainTimeoutError,
  MaintenancePragmaVerificationError,
  type SqliteService,
  makeSync,
} from "../src/service.js";

/**
 * S307 (R23:220 / R24:226): maintenance drain/fence. backup/reset/restore must refuse or bounded-drain
 * every owner (never force-close one), fail with typed errors, and re-apply the store's actual PRAGMAs.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const PROBE_PATH = path.join(
  REPO_ROOT,
  ".recursive/run/115-effect-foldkit-runtime-migration/evidence/other/s307-lock-probe.json",
);

const services: SqliteService[] = [];
const roots: string[] = [];

afterEach(async () => {
  for (const service of services.splice(0)) {
    try {
      service.closeSync();
    } catch {
      // already closed
    }
  }
  await Promise.all(roots.splice(0).map(async (root) => rm(root, { recursive: true, force: true })));
});

const makeRoot = async (): Promise<string> => {
  const root = await mkdtemp(path.join(os.tmpdir(), "s307-sql-"));
  roots.push(root);
  return root;
};

const openService = async (): Promise<{ service: SqliteService; root: string }> => {
  const root = await makeRoot();
  const service = makeSync({
    databasePath: path.join(root, "s307.db"),
    // The STORE's pragmas are what setup applies at open; the maintenance fence must preserve this baseline.
    setup: (database) => {
      database.exec("PRAGMA foreign_keys = ON");
      database.exec("PRAGMA journal_mode = WAL");
      database.exec("PRAGMA synchronous = NORMAL");
    },
  });
  services.push(service);
  return { service, root };
};

/** Starts an async transaction that holds the connection until the returned release() is called. */
const holdTransaction = async (service: SqliteService): Promise<{ release: () => void; done: Promise<void> }> => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started: () => void = () => {};
  const startedGate = new Promise<void>((resolve) => {
    started = resolve;
  });
  const done = Effect.runPromise(
    service.transaction(() => Effect.promise(async () => {
      started();
      await gate;
    })),
  );
  await startedGate;
  return { done, release };
};

describe("S307 maintenance owner fence", () => {
  test("maintenance refuses immediately while an async transaction owns the connection", async () => {
    const { service, root } = await openService();
    const holder = await holdTransaction(service);
    try {
      const caught = await service.maintenance.backup(path.join(root, "never.db")).catch((error) => error);
      expect(caught).toBeInstanceOf(MaintenanceBusyError);
      const busy = caught instanceof MaintenanceBusyError ? caught : undefined;
      expect(busy?.code).toBe("MAINTENANCE_BUSY");
      expect(existsSync(path.join(root, "never.db"))).toBe(false);
    } finally {
      holder.release();
      await holder.done;
    }
  });

  test("drain times out with a typed failure instead of waiting unbounded", async () => {
    const { service, root } = await openService();
    const holder = await holdTransaction(service);
    try {
      const startedAt = Date.now();
      const caught = await service.maintenance
        .backup(path.join(root, "never.db"), { drainTimeoutMs: 80 })
        .catch((error) => error);
      const elapsed = Date.now() - startedAt;
      expect(caught).toBeInstanceOf(MaintenanceDrainTimeoutError);
      const drain = caught instanceof MaintenanceDrainTimeoutError ? caught : undefined;
      expect(drain?.code).toBe("MAINTENANCE_DRAIN_TIMEOUT");
      expect(drain?.timeoutMs).toBe(80);
      expect(elapsed).toBeGreaterThanOrEqual(50);
      expect(elapsed).toBeLessThan(5000);
    } finally {
      holder.release();
      await holder.done;
    }
  });

  test("reset and restore re-apply the store's actual PRAGMAs; the naive loss hook shows the failure", async () => {
    const { service, root } = await openService();
    const before = service.maintenance.pragmas();
    expect(before.busy_timeout).toBe("5000");
    expect(String(before.journal_mode).toLowerCase()).toBe("wal");
    expect(String(before.foreign_keys)).toBe("1");

    const naive = await service.maintenance.reset({ reapplyPragmas: false });
    expect(naive.kind).toBe("reset");
    // The reset path resets connection PRAGMAs to non-store defaults; without re-apply the store is LOST.
    expect(service.maintenance.pragmas().busy_timeout).toBe("1");

    await service.maintenance.reset();
    expect(service.maintenance.pragmas()).toEqual(before);
    await service.maintenance.restore();
    expect(service.maintenance.pragmas()).toEqual(before);
    const backup = await service.maintenance.backup(path.join(root, "s307.backup.db"));
    expect(backup.kind).toBe("backup");
    expect(existsSync(path.join(root, "s307.backup.db"))).toBe(true);
  });

  test("bounded drain polls the event loop rather than blocking it (measured probe)", async () => {
    const { service, root } = await openService();
    const holder = await holdTransaction(service);
    const ticks: number[] = [];
    const interval = setInterval(() => ticks.push(Date.now()), 10);
    try {
      const startedAt = Date.now();
      const caught = await service.maintenance
        .backup(path.join(root, "never.db"), { drainTimeoutMs: 100 })
        .catch((error) => error);
      const elapsedMs = Date.now() - startedAt;
      expect(caught).toBeInstanceOf(MaintenanceDrainTimeoutError);
      expect(ticks.length).toBeGreaterThanOrEqual(3);
      writeFileSync(PROBE_PATH, JSON.stringify({
        drainTimeoutMs: 100,
        elapsedMs,
        eventLoopTicks: ticks.length,
        mode: "async-poll-drain",
        statement: "DatabaseSync remains blocking; only the fence drain yields, measured by a 10ms interval",
      }, null, 2) + "\n");
    } finally {
      clearInterval(interval);
      holder.release();
      await holder.done;
    }
  });

  test("concurrent maintenance reserves the slot synchronously: the second caller gets MAINTENANCE_BUSY", async () => {
    const { service, root } = await openService();
    const first = service.maintenance.backup(path.join(root, "one.db"));
    const second = service.maintenance.backup(path.join(root, "two.db")).catch((error) => error);
    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult.kind).toBe("backup");
    expect(secondResult).toBeInstanceOf(MaintenanceBusyError);
    const busy = secondResult instanceof MaintenanceBusyError ? secondResult : undefined;
    expect(busy?.owner).toBe("another maintenance operation");
  });

  test("maintenance is refused while a synchronous facade owner holds the connection", async () => {
    const { service } = await openService();
    let pending: Promise<unknown> | undefined;
    service.transactionSync(() => {
      pending = service.maintenance.reset().catch((error) => error);
    });
    const caught = await pending;
    expect(caught).toBeInstanceOf(MaintenanceBusyError);
    const busy = caught instanceof MaintenanceBusyError ? caught : undefined;
    expect(busy?.owner).toBe("sync facade owner");
  });

  test("non-finite drain budgets are rejected with a typed validation error before any loop", async () => {
    const { service, root } = await openService();
    for (const budget of [Number.POSITIVE_INFINITY, Number.NaN]) {
      const caught = await service.maintenance
        .backup(path.join(root, "never.db"), { drainTimeoutMs: budget })
        .catch((error) => error);
      expect(caught).toBeInstanceOf(MaintenanceBudgetError);
      const invalid = caught instanceof MaintenanceBudgetError ? caught : undefined;
      expect(invalid?.code).toBe("MAINTENANCE_INVALID_BUDGET");
      expect(existsSync(path.join(root, "never.db"))).toBe(false);
    }
  });

  test("a rejected/no-op pragma re-apply is surfaced by the post-re-apply verification", async () => {
    const { service } = await openService();
    const caught = await service.maintenance
      .reset({ reapplyFailurePragma: "busy_timeout" })
      .catch((error) => error);
    expect(caught).toBeInstanceOf(MaintenancePragmaVerificationError);
    const unverified = caught instanceof MaintenancePragmaVerificationError ? caught : undefined;
    expect(unverified?.code).toBe("MAINTENANCE_PRAGMA_UNVERIFIED");
    expect(unverified?.pragmas).toContain("busy_timeout");
  });

  test("a refused drain leaves the store untouched: no PRAGMA writes and no backup target (busy + timeout)", async () => {
    const { service, root } = await openService();
    // A caller-mutated pragma that differs from the setup baseline: a refusal must NOT re-apply the baseline.
    service.execSync("PRAGMA busy_timeout = 777");
    const before = service.maintenance.pragmas();
    expect(before.busy_timeout).toBe("777");
    const holder = await holdTransaction(service);
    try {
      const busyTarget = path.join(root, "busy-refused.db");
      await service.maintenance.backup(busyTarget).catch(() => undefined);
      expect(service.maintenance.pragmas()).toEqual(before);
      expect(existsSync(busyTarget)).toBe(false);

      const timeoutTarget = path.join(root, "timeout-refused.db");
      await service.maintenance.backup(timeoutTarget, { drainTimeoutMs: 60 }).catch(() => undefined);
      expect(service.maintenance.pragmas()).toEqual(before);
      expect(existsSync(timeoutTarget)).toBe(false);
    } finally {
      holder.release();
      await holder.done;
    }
  });
});