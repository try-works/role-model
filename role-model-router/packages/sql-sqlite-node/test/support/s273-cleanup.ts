import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { type SqliteService, makeSync } from "../../src/service";

/**
 * Run 115 S273 test-only cleanup helpers.
 *
 * Error-order contract:
 * - the first failure (ready or inspect) is the primary and is rethrown by identity;
 * - release and commit are both attempted, even when ready or inspect failed;
 * - each cleanup failure is reported through the reporter, so it is visible without
 *   replacing a primary failure;
 * - when there is no primary, the first cleanup failure is rethrown, including falsey
 *   thrown values (`undefined`, `null`, `0`, `""`, `false`).
 */

export interface SuspendedTransaction {
  readonly ready: Promise<void>;
  readonly release: () => Promise<void>;
  readonly commit: () => Promise<void>;
}

export interface CleanupFailure {
  readonly step: string;
  readonly error: unknown;
}

export type CleanupFailureReporter = (failure: CleanupFailure) => void;

export type InspectSuspended = () => void;

export interface CleanupBatch {
  readonly add: (step: string, dispose: () => void) => void;
  readonly disposeAll: () => ReadonlyArray<CleanupFailure>;
}

export interface TempDatabaseOptions {
  readonly initialize?: (service: SqliteService) => void;
  readonly reportCleanupFailure?: CleanupFailureReporter;
}

export interface TempDatabase {
  readonly service: SqliteService;
}

export const reportCleanupFailureToConsole: CleanupFailureReporter = (failure) => {
  console.error(`[s273 cleanup] ${failure.step} failed:`, failure.error);
};

const attemptCleanup = async (
  step: string,
  cleanup: () => Promise<void>,
  failures: CleanupFailure[],
): Promise<void> => {
  try {
    await cleanup();
  } catch (error) {
    failures.push({ step, error });
  }
};

export const finishSuspended = async (
  suspended: SuspendedTransaction,
  inspect: InspectSuspended,
  report: CleanupFailureReporter = reportCleanupFailureToConsole,
): Promise<void> => {
  let primary: { readonly error: unknown } | undefined;
  try {
    await suspended.ready;
    inspect();
  } catch (error) {
    primary = { error };
  }

  const failures: CleanupFailure[] = [];
  await attemptCleanup("release", suspended.release, failures);
  await attemptCleanup("commit", suspended.commit, failures);

  for (const failure of failures) {
    report(failure);
  }

  if (primary !== undefined) {
    throw primary.error;
  }

  const firstFailure = failures[0];
  if (firstFailure !== undefined) {
    throw firstFailure.error;
  }
};

export const makeCleanupBatch = (): CleanupBatch => {
  const steps: Array<{ readonly step: string; readonly dispose: () => void }> = [];
  return {
    add: (step, dispose) => {
      steps.push({ step, dispose });
    },
    // Insertion order is teardown order: callers add close before remove.
    disposeAll: () => {
      const failures: CleanupFailure[] = [];
      for (const current of steps.splice(0)) {
        try {
          current.dispose();
        } catch (error) {
          failures.push({ step: current.step, error });
        }
      }
      return failures;
    },
  };
};

export const disposeAfterTest = (
  batch: CleanupBatch,
  testFailed: boolean,
  report: CleanupFailureReporter = reportCleanupFailureToConsole,
): void => {
  const failures = batch.disposeAll();
  for (const failure of failures) {
    report(failure);
  }

  if (failures.length === 0 || testFailed) {
    return;
  }

  throw new AggregateError(
    failures.map((failure) => failure.error),
    `temporary database cleanup failed: ${failures.map((failure) => failure.step).join(", ")}`,
  );
};

const createOwnerTable = (service: SqliteService): void => {
  service.execSync("CREATE TABLE t (value INTEGER)");
};

export const makeTempDatabase = (
  batch: CleanupBatch,
  options: TempDatabaseOptions = {},
): TempDatabase => {
  const directory = mkdtempSync(join(tmpdir(), "s268-sql-owner-"));
  const databasePath = join(directory, "owner.sqlite");
  let opened: SqliteService | undefined;

  try {
    opened = makeSync({ databasePath });
    (options.initialize ?? createOwnerTable)(opened);
  } catch (error) {
    const cleanupFailures: CleanupFailure[] = [];
    if (opened !== undefined) {
      try {
        opened.closeSync();
      } catch (closeError) {
        cleanupFailures.push({ step: "close-after-failed-setup", error: closeError });
      }
    }
    try {
      rmSync(directory, { force: true, recursive: true });
    } catch (removeError) {
      cleanupFailures.push({ step: "remove-after-failed-setup", error: removeError });
    }

    const report = options.reportCleanupFailure ?? reportCleanupFailureToConsole;
    for (const failure of cleanupFailures) {
      report(failure);
    }
    throw error;
  }

  const service = opened;
  if (service === undefined) {
    throw new Error("makeSync did not return a database service");
  }

  batch.add("close-temp-service", () => {
    service.closeSync();
  });
  batch.add("remove-temp-directory", () => {
    rmSync(directory, { force: true, recursive: true });
  });

  return { service };
};
