/**
 * Run 105 R12/R14 (stage 3): the endpoint ladder index the Packs page renders.
 *
 * One row per (roleId, taskTypeId) - the projection the private Track B sidecar publishes
 * as a sibling `ladders` array on the existing records readback. This module is a total,
 * deterministic normalizer over UNKNOWN readback data: every absent field renders as
 * bounded absence and no value is ever fabricated (AC-R17-09).
 *
 * The word "ladder" alone stays reserved for the cohort exposure ladder (D9); every new
 * string in this surface says "endpoint ladder". "Active" is DERIVED (admitted > 0 and not
 * rolled back) and is never a stored field (R14).
 *
 * R13 note (plain TypeScript on purpose): runtime-ui has zero Effect imports and no Effect
 * dependency; the rung Schema lives in packages B/C. Re-adding the Effect runtime here
 * would be a dependency change with no consumer, so this projection is plain, total
 * TypeScript with no throwing path on malformed input.
 */

export interface LadderEndpointView {
  readonly endpointId: string;
  readonly rank: number;
  readonly status: string;
}

export type LadderState = "no_ladder" | "partial" | "complete" | "rolled_back";

export interface LadderRollbackView {
  readonly on: boolean;
  readonly reason: string | null;
  readonly atMs: number | null;
}

export interface LadderRowView {
  readonly roleId: string;
  readonly taskTypeId: string;
  readonly taxonomyVersion: string | null;
  /** At most three endpoints, rank ascending; every extra rung stays below the fold. */
  readonly topEndpoints: readonly LadderEndpointView[];
  readonly rankedCount: number | null;
  readonly completeness: {
    readonly admitted: number | null;
    readonly configured: number | null;
  };
  readonly state: LadderState | null;
  /** Derived, never stored; absent stays absent. */
  readonly active: boolean | null;
  readonly rolledBack: LadderRollbackView | null;
  readonly ladderVersion: number | null;
  readonly nextEligibleAtMs: number | null;
}

const boundedText = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const boundedNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const boundedInteger = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) ? value : null;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/**
 * The top-3 projection (R12): the three lowest ranks in rank order. Unrankable rungs are
 * kept as bounded absence rather than dropped silently, and the list is capped at three -
 * a fifth rung is below the fold, never shown.
 */
export function topLadderEndpoints(
  input: unknown,
): readonly LadderEndpointView[] {
  const raw = Array.isArray(input) ? input : asRecord(input).topEndpoints;
  if (!Array.isArray(raw)) return [];
  const views: LadderEndpointView[] = [];
  for (const entry of raw) {
    const rung = asRecord(entry);
    const endpointId = boundedText(rung.endpointId);
    if (endpointId === null) continue;
    views.push({
      endpointId,
      rank: Number.isSafeInteger(rung.rank) ? (rung.rank as number) : Number.POSITIVE_INFINITY,
      status: boundedText(rung.status) ?? "not reported",
    });
  }
  views.sort((left, right) => left.rank - right.rank);
  return views.slice(0, 3);
}

/**
 * One LadderRowView per published row; absent role/task rows are kept as bounded absence.
 * Unknown rows never throw - the table states what the readback did not carry.
 */
export function normalizeLadderRows(input: unknown): readonly LadderRowView[] {
  const source = asRecord(input);
  const raw = Array.isArray(source.ladders) ? source.ladders : [];
  const rows: LadderRowView[] = [];
  for (const entry of raw) {
    const row = asRecord(entry);
    // Bounded absence: a row whose identity is partly missing still renders what it carries
    // (its cell says `not reported`) instead of being dropped silently.
    const roleId = boundedText(row.roleId) ?? "";
    const taskTypeId = boundedText(row.taskTypeId) ?? "";
    if (roleId === "" && taskTypeId === "") continue;
    rows.push({
      roleId,
      taskTypeId,
      taxonomyVersion: boundedText(row.taxonomyVersion),
      topEndpoints: topLadderEndpoints(row),
      rankedCount: boundedInteger(row.rankedCount),
      completeness: {
        admitted: boundedInteger(asRecord(row.completeness).admitted),
        configured: boundedInteger(asRecord(row.completeness).configured),
      },
      state: ladderRowState(asRecord(row)),
      active: typeof row.active === "boolean" ? row.active : null,
      rolledBack: (() => {
        const rolledBack = asRecord(row.rolledBack);
        return { on: Boolean(rolledBack.on), reason: boundedText(rolledBack.reason), atMs: boundedNumber(rolledBack.atMs) };
      })(),
      ladderVersion: boundedInteger(row.ladderVersion),
      nextEligibleAtMs: boundedNumber(row.nextEligibleAtMs),
    });
  }
  return rows;
}

/**
 * R14: the observable lifecycle state, derived from the published row:
 * no_ladder (zero admitted) -> partial -> complete; the rollback flag wins.
 */
export function ladderRowState(input: unknown): LadderState {
  const row = asRecord(input);
  const rolledBack = asRecord(row.rolledBack);
  if (rolledBack.on === true) return "rolled_back";
  const completeness = asRecord(row.completeness);
  const admitted = Number.isInteger(completeness.admitted) ? (completeness.admitted as number) : 0;
  const configured = Number.isInteger(completeness.configured) ? (completeness.configured as number) : 0;
  if (admitted <= 0) return "no_ladder";
  if (configured > 0 && admitted >= configured) return "complete";
  return "partial";
}

/** R14: Active is derived (admitted > 0 AND not rolled back), never stored. */
export function ladderRowActive(input: unknown): boolean {
  const state = ladderRowState(input);
  return state === "partial" || state === "complete";
}

/**
 * Deterministic ordering (R12): complete first, then partial by the largest unfilled gap
 * (configured - admitted) descending, then no_ladder; ties by roleId then taskTypeId.
 * Same input in any order -> same output.
 */
export function compareLadderRows(left: LadderRowView, right: LadderRowView): number {
  const orderOf = (row: LadderRowView): number => {
    const state = ladderRowState(row);
    if (state === "complete") return 0;
    if (state === "rolled_back") return 3;
    if (state === "no_ladder") return 2;
    return 1;
  };
  const byState = orderOf(left) - orderOf(right);
  if (byState !== 0) return byState;
  if (orderOf(left) === 1) {
    const gapOf = (row: LadderRowView): number => {
      const admitted = row.completeness.admitted ?? 0;
      const configured = row.completeness.configured ?? 0;
      return Math.max(0, configured - admitted);
    };
    const byGap = gapOf(right) - gapOf(left);
    if (byGap !== 0) return byGap;
  }
  const byRole = left.roleId < right.roleId ? -1 : left.roleId > right.roleId ? 1 : 0;
  if (byRole !== 0) return byRole;
  const byTask = left.taskTypeId < right.taskTypeId ? -1 : left.taskTypeId > right.taskTypeId ? 1 : 0;
  return byTask;
}

/** R12: "3 / 7 admitted"; absent values stay bounded absence - never a fabricated 0. */
export function formatLadderCompleteness(completeness: {
  readonly admitted: number | null;
  readonly configured: number | null;
}): string {
  const admitted = completeness.admitted;
  const configured = completeness.configured;
  if (admitted === null || configured === null) return "admitted not reported";
  return `${admitted} / ${configured} admitted`;
}