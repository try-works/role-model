import assert from "node:assert/strict";

import { describe, it } from "vitest";

import type { SqliteService } from "../src/service";
import {
  type CleanupFailure,
  type SuspendedTransaction,
  disposeAfterTest,
  finishSuspended,
  makeCleanupBatch,
  makeTempDatabase,
} from "./support/s273-cleanup";

/**
 * Run 115 S273: deterministic cleanup/error-order coverage for the S268 mixed-owner
 * tests. These tests use the real helper from `test/support/s273-cleanup.ts`; the
 * suspended transactions are plain typed callbacks (no module mocks), and the
 * setup-failure case opens a real disposable SQLite database.
 */

interface Settled {
  readonly rejected: boolean;
  readonly reason: unknown;
}

/** Capture a rejection even when the thrown value is `undefined`. */
const settle = async (promise: Promise<void>): Promise<Settled> => {
  try {
    await promise;
    return { rejected: false, reason: undefined };
  } catch (reason) {
    return { rejected: true, reason };
  }
};

interface FakeSuspendedSteps {
  readonly ready?: () => Promise<void>;
  readonly release?: () => Promise<void>;
  readonly commit?: () => Promise<void>;
}

const fakeSuspended = (steps: FakeSuspendedSteps = {}): SuspendedTransaction => ({
  ready: (steps.ready ?? (() => Promise.resolve()))(),
  release: steps.release ?? (() => Promise.resolve()),
  commit: steps.commit ?? (() => Promise.resolve()),
});

const collect =
  (failures: CleanupFailure[]): ((failure: CleanupFailure) => void) =>
  (failure) => {
    failures.push(failure);
  };

describe("S273 suspended transaction cleanup", () => {
  it("keeps the inspect primary identity after release and commit both fail, and attempts both", async () => {
    const primary = new Error("primary inspect failure");
    const releaseError = new Error("release failed");
    const commitError = new Error("commit failed");
    const attempted: string[] = [];
    const reported: CleanupFailure[] = [];

    const settled = await settle(
      finishSuspended(
        fakeSuspended({
          release: async () => {
            attempted.push("release");
            throw releaseError;
          },
          commit: async () => {
            attempted.push("commit");
            throw commitError;
          },
        }),
        () => {
          throw primary;
        },
        collect(reported),
      ),
    );

    assert.equal(settled.rejected, true);
    assert.equal(settled.reason, primary);
    assert.deepEqual(attempted, ["release", "commit"]);
    assert.deepEqual(
      reported.map((failure) => failure.step),
      ["release", "commit"],
    );
    assert.equal(reported[0]?.error, releaseError);
    assert.equal(reported[1]?.error, commitError);
  });

  it("surfaces a release-only cleanup failure instead of swallowing it", async () => {
    const releaseError = new Error("release failed");
    const attempted: string[] = [];
    const reported: CleanupFailure[] = [];

    const settled = await settle(
      finishSuspended(
        fakeSuspended({
          release: async () => {
            attempted.push("release");
            throw releaseError;
          },
          commit: async () => {
            attempted.push("commit");
          },
        }),
        () => {},
        collect(reported),
      ),
    );

    assert.equal(settled.rejected, true);
    assert.equal(settled.reason, releaseError);
    assert.deepEqual(attempted, ["release", "commit"]);
    assert.deepEqual(
      reported.map((failure) => failure.step),
      ["release"],
    );
  });

  it("surfaces a commit-only cleanup failure instead of swallowing it", async () => {
    const commitError = new Error("commit failed");
    const reported: CleanupFailure[] = [];

    const settled = await settle(
      finishSuspended(
        fakeSuspended({
          commit: async () => {
            throw commitError;
          },
        }),
        () => {},
        collect(reported),
      ),
    );

    assert.equal(settled.rejected, true);
    assert.equal(settled.reason, commitError);
    assert.deepEqual(
      reported.map((failure) => failure.step),
      ["commit"],
    );
  });

  it("attempts release and commit when ready rejects, leaving no suspended transaction unjoined", async () => {
    const readyError = new Error("ready failed");
    const attempted: string[] = [];
    let inspected = false;

    const settled = await settle(
      finishSuspended(
        fakeSuspended({
          ready: async () => {
            throw readyError;
          },
          release: async () => {
            attempted.push("release");
          },
          commit: async () => {
            attempted.push("commit");
          },
        }),
        () => {
          inspected = true;
        },
        () => {},
      ),
    );

    assert.equal(settled.rejected, true);
    assert.equal(settled.reason, readyError);
    assert.equal(inspected, false);
    assert.deepEqual(attempted, ["release", "commit"]);
  });

  it("preserves every falsey inspect primary even when a cleanup step fails", async () => {
    const falseyPrimaries: ReadonlyArray<unknown> = [undefined, null, 0, "", false];

    for (const primary of falseyPrimaries) {
      const releaseError = new Error("release failed");
      let commitAttempted = false;

      const settled = await settle(
        finishSuspended(
          fakeSuspended({
            release: async () => {
              throw releaseError;
            },
            commit: async () => {
              commitAttempted = true;
            },
          }),
          () => {
            throw primary;
          },
          () => {},
        ),
      );

      assert.equal(settled.rejected, true, `primary ${String(primary)} must reject`);
      assert.equal(settled.reason, primary, `primary ${String(primary)} must survive cleanup`);
      assert.equal(commitAttempted, true, `primary ${String(primary)} must still join the commit`);
    }
  });

  it("surfaces every falsey cleanup-only failure instead of treating it as absent", async () => {
    const falseyCleanupFailures: ReadonlyArray<unknown> = [undefined, null, 0, "", false];

    for (const cleanupFailure of falseyCleanupFailures) {
      const settled = await settle(
        finishSuspended(
          fakeSuspended({
            release: async () => {
              throw cleanupFailure;
            },
          }),
          () => {},
          () => {},
        ),
      );

      assert.equal(settled.rejected, true, `cleanup ${String(cleanupFailure)} must reject`);
      assert.equal(settled.reason, cleanupFailure);
    }
  });
});

describe("S273 temp database ownership cleanup", () => {
  it("closes the acquired database before rethrowing a failed setup", () => {
    const setupError = new Error("initialize failed");
    const batch = makeCleanupBatch();
    const reported: CleanupFailure[] = [];
    let acquired: SqliteService | undefined;

    try {
      assert.throws(
        () =>
          makeTempDatabase(batch, {
            initialize: (service) => {
              acquired = service;
              service.execSync("CREATE TABLE t (value INTEGER)");
              throw setupError;
            },
            reportCleanupFailure: collect(reported),
          }),
        (error) => error === setupError,
      );

      const opened = acquired;
      assert.ok(opened !== undefined);
      assert.equal(opened.isOpen(), false);
      assert.deepEqual(reported, []);
    } finally {
      if (acquired?.isOpen() === true) {
        acquired.closeSync();
      }
      batch.disposeAll();
    }
  });

  it("closes and removes the owned database on a passing teardown", () => {
    const batch = makeCleanupBatch();
    const database = makeTempDatabase(batch);
    database.service.execSync("INSERT INTO t(value) VALUES (1)");
    assert.equal(database.service.isOpen(), true);

    const failures = batch.disposeAll();

    assert.deepEqual(failures, []);
    assert.equal(database.service.isOpen(), false);
  });

  it("attempts every teardown step and reports each failure separately", () => {
    const batch = makeCleanupBatch();
    const attempted: string[] = [];
    const closeError = new Error("close failed");
    const removeError = new Error("remove failed");

    batch.add("close-temp-service", () => {
      attempted.push("close");
      throw closeError;
    });
    batch.add("remove-temp-directory", () => {
      attempted.push("remove");
      throw removeError;
    });

    const failures = batch.disposeAll();

    assert.deepEqual(attempted, ["close", "remove"]);
    assert.deepEqual(
      failures.map((failure) => failure.step),
      ["close-temp-service", "remove-temp-directory"],
    );
    assert.equal(failures[0]?.error, closeError);
    assert.equal(failures[1]?.error, removeError);
  });

  it("does not mask an existing test failure but reports teardown errors separately", () => {
    const batch = makeCleanupBatch();
    const reported: CleanupFailure[] = [];
    const closeError = new Error("close failed");
    batch.add("close-temp-service", () => {
      throw closeError;
    });

    assert.doesNotThrow(() => disposeAfterTest(batch, true, collect(reported)));

    assert.equal(reported.length, 1);
    assert.equal(reported[0]?.step, "close-temp-service");
    assert.equal(reported[0]?.error, closeError);
  });

  it("throws when teardown cleanup is the sole failure instead of suppressing it", () => {
    const batch = makeCleanupBatch();
    const reported: CleanupFailure[] = [];
    const closeError = new Error("close failed");
    batch.add("close-temp-service", () => {
      throw closeError;
    });

    assert.throws(
      () => disposeAfterTest(batch, false, collect(reported)),
      (error) => error instanceof AggregateError && error.errors[0] === closeError,
    );
    assert.equal(reported.length, 1);
  });
});
