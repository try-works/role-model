import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  appendTrackBRouteAdvisoryObservation,
  buildTrackBRouteAdvisoryObservation,
} from "../src/track-b-runtime.js";

/**
 * Run 107 (advisory ledger attribution): the operator surface reads the advisory ledger's
 * `totals` without replaying the decisions, but the totals carried no fallback-reason tally and
 * no origin split, so the reader had to derive both from the *retained* `entries` window. The
 * window is capped (`TRACK_B_ROUTE_ADVISORY_LEDGER_MAX_ENTRIES`), so every eviction silently
 * undercounted the reasons: measured live, 827 observed rows carried only 204 attributed reasons.
 *
 * These tests pin the two halves of the fix together, because either one alone is a regression:
 *   - the tally (so a reason count survives the entry cap), and
 *   - the backfill (so the ledger that already exists gains an honest seed instead of starting at
 *     zero on its next append).
 * The ledger schema is deliberately UNCHANGED: both readers drop a ledger whose
 * `schemaVersion` differs, so a version bump would zero the live ledger.
 */

const LEDGER_SCHEMA = "role-model.route-advisory-observation-ledger.v1";

type LedgerShape = {
  readonly schemaVersion: string;
  readonly revision: number;
  readonly totals: Record<string, unknown>;
  readonly entries: readonly Record<string, unknown>[];
};

const tempDir = async (label: string) => {
  const root = await mkdtemp(path.join(os.tmpdir(), `run107-advisory-${label}-`));
  return {
    root,
    filePath: path.join(root, "track-b", "advisory-observations.json"),
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
};

const readLedger = async (filePath: string): Promise<LedgerShape> =>
  JSON.parse(await readFile(filePath, "utf8")) as LedgerShape;

const reasonTotal = (ledger: LedgerShape): number =>
  Object.values((ledger.totals.fallbackReasons ?? {}) as Record<string, number>).reduce(
    (sum, value) => sum + value,
    0,
  );

const originsTotal = (ledger: LedgerShape): number =>
  Object.values((ledger.totals.origins ?? {}) as Record<string, number>).reduce(
    (sum, value) => sum + value,
    0,
  );

/**
 * The invariant the operator's origin split rests on: every row the ledger has EVER counted is
 * either attributed to a live/shadow/other bucket or reported as an honest remainder. The split is
 * cumulative - it is compared against the lifetime `totals.observed`, never against the retained
 * `entries.length` window.
 */
const assertOriginInvariant = (ledger: LedgerShape): void => {
  expect(originsTotal(ledger) + Number(ledger.totals.originsUnattributed)).toBe(
    Number(ledger.totals.observed),
  );
};

/** A row shaped exactly as the pre-run107 writer produced them (no tally anywhere). */
const legacyRow = (index: number, fallbackReason: string | null) => ({
  schemaVersion: "role-model.route-advisory-observation.v1",
  decisionId: `decision-legacy-${index}`,
  routePackage: "endpoint:incumbent",
  preferredRoutePackage: null,
  preferredEligible: false,
  eligibleRoutePackageCount: 0,
  wouldHaveChanged: false,
  advisoryState: "unavailable",
  confidence: 0,
  profileSnapshotIds: [],
  candidateId: null,
  advisoryId: null,
  mode: "advisory_considered",
  selection: "baseline_retained",
  applied: false,
  fallbackReason,
  origin: "live",
  observedAtMs: index,
});

/**
 * Writes an OLD-shape ledger: the totals block is the pre-run107 enumeration, so
 * `totals.fallbackReasons` is absent and `observed` may exceed the retained rows.
 */
const writeLegacyLedger = async (
  filePath: string,
  input: { readonly observed: number; readonly entries: readonly Record<string, unknown>[] },
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    `${JSON.stringify(
      {
        schemaVersion: LEDGER_SCHEMA,
        revision: input.entries.length,
        updatedAtMs: 0,
        totals: {
          observed: input.observed,
          fresh: 0,
          stale: 0,
          unavailable: input.observed,
          wouldHaveChanged: 0,
          preferredEligible: 0,
          considered: input.observed,
          applied: 0,
          rungWalked: 0,
          rungApplied: 0,
        },
        entries: input.entries,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
};

describe("run107 advisory ledger fallback-reason attribution", () => {
  test("the tally survives the entry cap: 25 appends with maxEntries 10 keeps 20 reasons", async () => {
    const space = await tempDir("divergence");
    try {
      // 25 decisions: the first 20 were considered and retained with a typed fallback reason,
      // the last 5 applied the advisory (and therefore carry `fallbackReason: null`).
      for (let index = 0; index < 25; index += 1) {
        const applied = index >= 20;
        await appendTrackBRouteAdvisoryObservation({
          filePath: space.filePath,
          maxEntries: 10,
          observation: buildTrackBRouteAdvisoryObservation({
            decisionId: `decision-${index}`,
            routePackage: "endpoint:incumbent",
            advisoryState: "fresh",
            mode: "advisory_considered",
            applied,
            fallbackReason: applied ? null : "cohort_excluded",
            origin: "live",
            observedAtMs: index,
          }),
        });
      }
      const ledger = await readLedger(space.filePath);
      expect(ledger.schemaVersion).toBe(LEDGER_SCHEMA);
      expect(ledger.totals.observed).toBe(25);
      expect(ledger.entries).toHaveLength(10);
      expect(ledger.totals.fallbackReasons).toEqual({ cohort_excluded: 20 });
      expect(ledger.totals.fallbackReasonsUnattributed).toBe(0);
      expect(reasonTotal(ledger)).toBe(20);
      // The identity the operator reads: a retained decision either applied or carries a reason.
      expect(ledger.totals.considered).toBe(25);
      expect(ledger.totals.applied).toBe(5);
      expect(reasonTotal(ledger)).toBe(
        Number(ledger.totals.considered) - Number(ledger.totals.applied),
      );
      // THE DIVERGENCE: the retained window alone can only account for 5 of those 20, which is
      // what the pre-fix reader reported.
      const retainedOnly = ledger.entries.filter(
        (entry) => typeof entry.fallbackReason === "string" && entry.fallbackReason.trim(),
      ).length;
      expect(retainedOnly).toBe(5);
      // THE SAME DIVERGENCE FOR ORIGINS: the split is CUMULATIVE like the reason tally, not a
      // window over the 10 retained rows. Every appended row is live, so all 25 are attributed and
      // the honest remainder is 0 - and the sum is compared against `observed`, not against the
      // window, which is exactly the comparison the operator's surface makes.
      expect(ledger.totals.origins).toEqual({ live: 25, shadow: 0, other: 0 });
      expect(ledger.totals.originsUnattributed).toBe(0);
      assertOriginInvariant(ledger);
      expect(originsTotal(ledger)).not.toBe(ledger.entries.length);
    } finally {
      await space.cleanup();
    }
  });

  test("the backfill seeds an existing old-shape ledger instead of starting at zero", async () => {
    const space = await tempDir("backfill");
    try {
      const entries = Array.from({ length: 30 }, (_value, index) =>
        legacyRow(index, "advisory_task_unscoped"),
      );
      await writeLegacyLedger(space.filePath, { observed: 30, entries });

      await appendTrackBRouteAdvisoryObservation({
        filePath: space.filePath,
        observation: legacyRow(30, null),
      });

      const ledger = await readLedger(space.filePath);
      expect(ledger.schemaVersion).toBe(LEDGER_SCHEMA);
      expect(ledger.totals.observed).toBe(31);
      expect(ledger.entries).toHaveLength(31);
      expect(ledger.totals.fallbackReasons).toEqual({ advisory_task_unscoped: 30 });
      // 31 rows were already accounted for by the seed (30 recovered + 1 appended without a
      // reason), so nothing is unattributed.
      expect(ledger.totals.fallbackReasonsUnattributed).toBe(0);
    } finally {
      await space.cleanup();
    }
  });

  test("an honest partial: 6000 observed with 10 recoverable rows is never silently 0", async () => {
    const space = await tempDir("partial");
    try {
      const entries = Array.from({ length: 10 }, (_value, index) =>
        legacyRow(index, "cohort_excluded"),
      );
      await writeLegacyLedger(space.filePath, { observed: 6000, entries });

      await appendTrackBRouteAdvisoryObservation({
        filePath: space.filePath,
        observation: legacyRow(10, null),
      });

      const ledger = await readLedger(space.filePath);
      expect(ledger.totals.observed).toBe(6001);
      expect(ledger.entries).toHaveLength(11);
      expect(ledger.totals.fallbackReasons).toEqual({ cohort_excluded: 10 });
      // 6000 observed - 10 recoverable = 5990 rows whose reason was never recorded. Reporting 0
      // here would claim the ledger is fully attributed when it is not.
      expect(ledger.totals.fallbackReasonsUnattributed).toBe(5990);
      expect(reasonTotal(ledger)).toBeLessThan(Number(ledger.totals.observed));
    } finally {
      await space.cleanup();
    }
  });

  test("a ledger that already carries the tally keeps it instead of re-seeding from the window", async () => {
    const space = await tempDir("prior-tally");
    try {
      const entries = [legacyRow(0, "cohort_excluded"), legacyRow(1, "cohort_excluded")];
      await writeLegacyLedger(space.filePath, { observed: 105, entries });
      // Add the run107 keys by hand: this is what a ledger written by the fixed writer looks like.
      const seeded = await readLedger(space.filePath);
      await writeFile(
        space.filePath,
        `${JSON.stringify(
          {
            ...seeded,
            totals: {
              ...seeded.totals,
              fallbackReasons: { cohort_excluded: 100 },
              fallbackReasonsUnattributed: 4,
              origins: { live: 2, shadow: 0, other: 0 },
            },
          },
          null,
          2,
        )}\n`,
        "utf8",
      );

      await appendTrackBRouteAdvisoryObservation({
        filePath: space.filePath,
        observation: legacyRow(2, "cohort_excluded"),
      });

      const ledger = await readLedger(space.filePath);
      // The prior tally is authoritative: re-seeding from the two retained rows would report 3.
      expect(ledger.totals.fallbackReasons).toEqual({ cohort_excluded: 101 });
      // The unattributed count is sticky, never recomputed downwards to 0 on the next append.
      expect(ledger.totals.fallbackReasonsUnattributed).toBe(4);
    } finally {
      await space.cleanup();
    }
  });

  test("origins are cumulative: an evicted row still counts, and every row is bucketed", async () => {
    const space = await tempDir("origins");
    try {
      // Index 2 carries NO origin key at all, and index 3 carries a vocabulary the ledger does
      // not own; both are "other" rather than being dropped from the split.
      const rows: readonly Record<string, unknown>[] = [
        { ...legacyRow(0, null), origin: "live" },
        { ...legacyRow(1, null), origin: "shadow" },
        (() => {
          const { origin: _origin, ...rest } = legacyRow(2, null);
          return rest;
        })(),
        { ...legacyRow(3, null), origin: "replay" },
        { ...legacyRow(4, null), origin: "shadow" },
        { ...legacyRow(5, null), origin: "live" },
      ];
      for (const row of rows) {
        await appendTrackBRouteAdvisoryObservation({
          filePath: space.filePath,
          maxEntries: 5,
          observation: row,
        });
      }
      const ledger = await readLedger(space.filePath);
      expect(ledger.entries).toHaveLength(5);
      // UPDATED DELIBERATELY (run-107 follow-up): this assertion used to pin the WINDOWED
      // semantics - `sum(origins) === entries.length`, so the evicted index 0 vanished from the
      // split. That is the defect: `observed` is a lifetime total while `entries` is capped, so a
      // windowed split silently stops summing to `observed` past the cap. The split is now
      // cumulative-and-sticky like `fallbackReasons`: all 6 appended rows are counted, including
      // the one the 5-row window evicted, and no row has aged out before the split existed.
      expect(ledger.totals.observed).toBe(6);
      expect(ledger.totals.origins).toEqual({ live: 2, shadow: 2, other: 2 });
      expect(ledger.totals.originsUnattributed).toBe(0);
      assertOriginInvariant(ledger);
      expect(originsTotal(ledger)).not.toBe(ledger.entries.length);
    } finally {
      await space.cleanup();
    }
  });

  test("an old-shape ledger seeds origins from the rows it retains and the rest as unattributed", async () => {
    const space = await tempDir("origins-backfill");
    try {
      // The pre-run107 shape: 6000 rows observed, only 10 of them still retained.
      const entries = Array.from({ length: 10 }, (_value, index) => legacyRow(index, null));
      await writeLegacyLedger(space.filePath, { observed: 6000, entries });

      await appendTrackBRouteAdvisoryObservation({
        filePath: space.filePath,
        observation: { ...legacyRow(10, null), origin: "shadow" },
      });

      const ledger = await readLedger(space.filePath);
      expect(ledger.totals.observed).toBe(6001);
      expect(ledger.entries).toHaveLength(11);
      // 10 rows recovered from the retained window, plus the shadow row just appended.
      expect(ledger.totals.origins).toEqual({ live: 10, shadow: 1, other: 0 });
      // 6000 observed - 10 recoverable = 5990 rows whose origin was never recorded, reported
      // honestly instead of being folded into `other` (which means "origin was not live/shadow")
      // or silently reported as 0.
      expect(ledger.totals.originsUnattributed).toBe(5990);
      expect((ledger.totals.origins as Record<string, number>).other).toBe(0);
      assertOriginInvariant(ledger);
    } finally {
      await space.cleanup();
    }
  });

  test("origins stay sticky: a second append carries the split forward and moves one bucket", async () => {
    const space = await tempDir("origins-sticky");
    try {
      // A ledger the fixed writer already produced: its published split (100 rows) is far larger
      // than the 2 rows it still retains, and 3 rows were already unaccounted for.
      const entries = [legacyRow(0, null), legacyRow(1, null)];
      await writeLegacyLedger(space.filePath, { observed: 100, entries });
      const seeded = await readLedger(space.filePath);
      await writeFile(
        space.filePath,
        `${JSON.stringify(
          {
            ...seeded,
            totals: {
              ...seeded.totals,
              origins: { live: 90, shadow: 5, other: 2 },
              originsUnattributed: 3,
            },
          },
          null,
          2,
        )}\n`,
        "utf8",
      );

      await appendTrackBRouteAdvisoryObservation({
        filePath: space.filePath,
        observation: { ...legacyRow(2, null), origin: "shadow" },
      });
      const first = await readLedger(space.filePath);
      // Re-seeding from the 3-row window would report {live: 2, shadow: 1, other: 0} and zero the
      // remainder; the published split is authoritative and exactly one bucket moved.
      expect(first.totals.origins).toEqual({ live: 90, shadow: 6, other: 2 });
      expect(first.totals.originsUnattributed).toBe(3);
      assertOriginInvariant(first);

      await appendTrackBRouteAdvisoryObservation({
        filePath: space.filePath,
        observation: legacyRow(3, null),
      });
      const second = await readLedger(space.filePath);
      expect(second.totals.observed).toBe(102);
      expect(second.totals.origins).toEqual({ live: 91, shadow: 6, other: 2 });
      // Sticky means sticky: the remainder is not recomputed downwards to 0 on the next append.
      expect(second.totals.originsUnattributed).toBe(3);
      assertOriginInvariant(second);
      expect(originsTotal(second) + Number(second.totals.originsUnattributed)).not.toBe(
        second.entries.length,
      );
    } finally {
      await space.cleanup();
    }
  });

  test("a row with no origin key counts as other, and the split still sums to observed", async () => {
    const space = await tempDir("origin-absent");
    try {
      const rows: readonly Record<string, unknown>[] = [
        { ...legacyRow(0, null), origin: "shadow" },
        (() => {
          const { origin: _origin, ...rest } = legacyRow(1, null);
          return rest;
        })(),
        { ...legacyRow(2, null), origin: "replay" },
      ];
      for (const row of rows) {
        await appendTrackBRouteAdvisoryObservation({ filePath: space.filePath, observation: row });
      }

      const ledger = await readLedger(space.filePath);
      expect(ledger.totals.observed).toBe(3);
      // A missing origin is "other" - the same meaning as an origin the ledger does not own - and
      // an ABSENT key is never dropped from the split.
      expect(ledger.totals.origins).toEqual({ live: 0, shadow: 1, other: 2 });
      expect(ledger.totals.originsUnattributed).toBe(0);
      assertOriginInvariant(ledger);
    } finally {
      await space.cleanup();
    }
  });
});
