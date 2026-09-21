/**
 * Run 98 addendum 34 S1 — coverage-driven pair planning.
 *
 * Live stage v211: 501 comparison groups carry exactly two members each, `deepseek-flash-high` is an arm
 * in 497 of them, and **13 of 21 candidate pairs have no direct comparison at all**. Every uncovered
 * pair excludes the served model, so no amount of rotating the counterfactual arm can close it: a pair
 * (A, B) needs a comparison whose two sides are A and B.
 *
 * Both sides of such a comparison are already durable — the served capture and the dispatched branch
 * captures — so an arm-vs-arm comparison costs scoring and judging, not another model call. This planner
 * decides *which* pairs a capture should add, least-covered first, deterministically and bounded.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface PairCoverageSnapshot {
  /** Direct-comparison count per unordered candidate pair, keyed `left\u0000right` (sorted). */
  readonly pairCounts: Readonly<Record<string, number>>;
}

export interface PlannedPair<T> {
  /** Left-hand side of the comparison (the "source" of that battle). */
  readonly left: T;
  /** Right-hand side (the counterfactual of that battle). */
  readonly right: T;
  /** Direct comparisons this pair already has; 0 means the pair has never been compared. */
  readonly priorCount: number;
}

export const pairKey = (left: string, right: string): string => [left, right].sort().join("\u0000");

export interface PairCoverageLedger {
  /** The current snapshot the planner reads. */
  snapshot(): PairCoverageSnapshot;
  /** Count one produced direct comparison for the pair. */
  record(left: string, right: string): void;
}

/**
 * A bounded, durable ledger of how many direct comparisons each candidate pair has.
 *
 * The runtime cannot re-derive this per capture without reading the whole evaluation store on every tick,
 * so it maintains the counts as it produces comparisons. An unreadable ledger is treated as empty rather
 * than fatal: the worst case is that the next capture re-tries a pair that already has evidence.
 */
export function createPairCoverageLedger(input: {
  readonly filePath: string;
  readonly maxPairs?: number;
}): PairCoverageLedger {
  const maxPairs =
    Number.isSafeInteger(input.maxPairs) && (input.maxPairs ?? 0) > 0
      ? Number(input.maxPairs)
      : 512;
  let counts: Record<string, number> = {};
  try {
    const parsed = JSON.parse(readFileSync(input.filePath, "utf8")) as {
      pairCounts?: Record<string, unknown>;
    };
    for (const [key, value] of Object.entries(parsed.pairCounts ?? {})) {
      if (Number.isSafeInteger(value) && Number(value) >= 0) counts[key] = Number(value);
    }
  } catch {
    counts = {};
  }
  const persist = (): void => {
    try {
      mkdirSync(path.dirname(input.filePath), { recursive: true });
      writeFileSync(
        input.filePath,
        `${JSON.stringify({ schemaVersion: "role-model.pair-coverage-ledger.v1", pairCounts: counts })}\n`,
        { encoding: "utf8", mode: 0o600 },
      );
    } catch {
      // The ledger is an optimisation for selection, never a reason to fail a capture.
    }
  };
  return {
    snapshot: () => ({ pairCounts: { ...counts } }),
    record: (left, right) => {
      if (!left || !right || left === right) return;
      const key = pairKey(left, right);
      counts[key] = (counts[key] ?? 0) + 1;
      const keys = Object.keys(counts);
      if (keys.length > maxPairs) {
        // Bound the file: keep the pairs the planner still needs (lowest counts) plus the newest ones.
        for (const stale of keys
          .sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0) || a.localeCompare(b))
          .slice(0, keys.length - maxPairs)) {
          delete counts[stale];
        }
      }
      persist();
    },
  };
}

/**
 * Plan the comparisons a capture should add so the graph closes its gaps.
 *
 * - The served source is paired with every selected arm first (the existing, proven comparison shape).
 * - Then every unordered arm pair is planned, ordered by how little coverage that pair has, so the pairs
 *   with **zero** direct comparisons are attempted before pairs that already have evidence.
 * - `maxPairs` bounds the work per capture; ties break on the pair key so two ticks on the same capture
 *   and coverage snapshot plan exactly the same pairs.
 */
export function planPairComparisons<T>(input: {
  readonly source: T;
  readonly arms: readonly T[];
  readonly endpointIdOf: (arm: T) => string;
  readonly coverage: PairCoverageSnapshot;
  readonly maxPairs: number;
  /** Pairs already planned or produced for this capture, keyed `left\u0000right`. */
  readonly excludePairs?: readonly string[];
}): readonly PlannedPair<T>[] {
  const maxPairs = Number.isSafeInteger(input.maxPairs) && input.maxPairs > 0 ? input.maxPairs : 0;
  if (maxPairs === 0) return [];
  const sourceId = input.endpointIdOf(input.source);
  const excluded = new Set(input.excludePairs ?? []);
  const candidates: Array<{ planned: PlannedPair<T>; key: string; sourcePair: boolean }> = [];
  for (const arm of input.arms) {
    const armId = input.endpointIdOf(arm);
    if (!armId || armId === sourceId) continue;
    candidates.push({
      planned: {
        left: input.source,
        right: arm,
        priorCount: input.coverage.pairCounts[pairKey(sourceId, armId)] ?? 0,
      },
      key: pairKey(sourceId, armId),
      sourcePair: true,
    });
  }
  for (let left = 0; left < input.arms.length; left += 1) {
    for (let right = left + 1; right < input.arms.length; right += 1) {
      const leftArm = input.arms[left] as T;
      const rightArm = input.arms[right] as T;
      const leftId = input.endpointIdOf(leftArm);
      const rightId = input.endpointIdOf(rightArm);
      if (!leftId || !rightId || leftId === rightId) continue;
      candidates.push({
        planned: {
          left: leftArm,
          right: rightArm,
          priorCount: input.coverage.pairCounts[pairKey(leftId, rightId)] ?? 0,
        },
        key: pairKey(leftId, rightId),
        sourcePair: false,
      });
    }
  }
  return (
    candidates
      .filter((candidate) => !excluded.has(candidate.key))
      // Least-covered first, and **arm-vs-arm before an extra source pair at equal coverage**: the graph's
      // gaps are the pairs that exclude the served model, so those are the ones worth spending on.
      .sort(
        (left, right) =>
          left.planned.priorCount - right.planned.priorCount ||
          Number(left.sourcePair) - Number(right.sourcePair) ||
          left.key.localeCompare(right.key),
      )
      .slice(0, maxPairs)
      .map((candidate) => candidate.planned)
  );
}
