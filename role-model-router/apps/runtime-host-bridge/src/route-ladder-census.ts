import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import type { RouteFocusCandidate } from "@role-model-router/core";
import { resolveSqliteMemoryLocation } from "@role-model-router/sqlite-memory";

export const ROUTE_CENSUS_MAX_PAIRS = 2000;
export type RouteLadderCensusResult =
  | { readonly status: "available"; readonly candidates: readonly RouteFocusCandidate[] }
  | {
      readonly status: "degraded";
      readonly reason:
        | "database_unavailable"
        | "schema_unavailable"
        | "invalid_window"
        | "pair_limit"
        | "ladder_unavailable";
      readonly candidates: null;
    };
const degraded = (
  reason: Extract<RouteLadderCensusResult, { status: "degraded" }>["reason"],
): RouteLadderCensusResult => ({ status: "degraded", reason, candidates: null });
/**
 * Run 108: the faithful-projection budget the corpus read enforces - `route-challenge-evidence.ts:556` refuses when its
 * LIMIT 501 query returns more than 500 rows. A family above it can never be replayed, so the census must not offer it
 * while a family that CAN be replayed is waiting.
 */
const ROUTE_CORPUS_PROJECTION_BUDGET = 500;
const exactId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.trim().length > 0 && !value.includes("\0");
const key = (roleId: string, taskTypeId: string) => JSON.stringify([roleId, taskTypeId]);

/** Read only classification columns; never initialize/migrate storage or load request bodies. */
export function readRouteLadderCensus(input: {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly nowMs: number;
  readonly stalenessWindowDays: number;
  readonly configuredEndpointIds: readonly string[];
  readonly ladderRows: readonly unknown[];
}): RouteLadderCensusResult {
  if (
    !Number.isSafeInteger(input.nowMs) ||
    !Number.isSafeInteger(input.stalenessWindowDays) ||
    input.stalenessWindowDays < 1 ||
    input.stalenessWindowDays > 3650
  )
    return degraded("invalid_window");
  if (!Array.isArray(input.ladderRows)) return degraded("ladder_unavailable");
  if (input.ladderRows.length > ROUTE_CENSUS_MAX_PAIRS) return degraded("pair_limit");
  const configured = new Set(input.configuredEndpointIds.filter(exactId));
  const pairs = new Map<string, RouteFocusCandidate>();
  /**
   * Run 108: a family held on an eligibility cooldown must not be offered as a focus.
   *
   * MEASURED on stage-rc-0b5dd8fa7899 (:3457): the corpus read refuses a family whose live capture count exceeds its
   * 500-row faithful-projection budget (route-challenge-evidence.ts:556), and the walk puts that family on a cooldown.
   * The cooldown was written and then READ BY NOTHING on the focus path: `selectFocusTask` filters on rolledBack,
   * role/task, requestCount and D1 fillability, and `RouteFocusCandidate` carries no eligibility field at all. So the
   * census kept offering the starved family, the walk kept choosing it (highest requestCount, non-zero fill gap), and it
   * threw on every tick - 9 minutes of observation showed focus=recruiter x4 with focusOTHER=0.
   *
   * The predicate itself already exists (route-ladder-dispatch.ts:682-683, "R8: a complete task is idle until
   * nextEligibleAtMs passes"); it was simply never applied here. Kept in a SIDE MAP rather than on the candidate so the
   * candidate's public shape is unchanged.
   */
  const nextEligibleAtMs = new Map<string, number>();
  for (const value of input.ladderRows) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return degraded("ladder_unavailable");
    const row = value as Record<string, unknown>;
    if (!exactId(row.roleId) || !exactId(row.taskTypeId) || !Array.isArray(row.rungs))
      return degraded("ladder_unavailable");
    const admitted = new Set<string>();
    for (const value of row.rungs) {
      if (!value || typeof value !== "object") continue;
      const rung = value as Record<string, unknown>;
      if (
        exactId(rung.endpointId) &&
        rung.status === "available" &&
        configured.has(rung.endpointId)
      )
        admitted.add(rung.endpointId);
    }
    const rolledBack = row.rolledBack as { on?: unknown } | undefined;
    const scopeKey = key(row.roleId, row.taskTypeId);
    if (Number.isFinite(row.nextEligibleAtMs))
      nextEligibleAtMs.set(scopeKey, Number(row.nextEligibleAtMs));
    if (pairs.has(scopeKey)) return degraded("ladder_unavailable");
    pairs.set(scopeKey, {
      roleId: row.roleId,
      taskTypeId: row.taskTypeId,
      requestCount: 0,
      admitted: admitted.size,
      configured: configured.size,
      rolledBack: rolledBack?.on === true,
    });
  }
  let database: DatabaseSync | undefined;
  try {
    const databasePath = resolveSqliteMemoryLocation(input);
    if (!existsSync(databasePath)) return degraded("database_unavailable");
    database = new DatabaseSync(databasePath, { readOnly: true });
    database.exec("PRAGMA query_only = ON; PRAGMA busy_timeout = 1000;");
    const columns = database.prepare("PRAGMA table_info(runtime_telemetry_records)").all() as {
      name: string;
    }[];
    const names = new Set(columns.map((column) => column.name));
    if (
      ![
        "request_id",
        "created_at_ms",
        "request_class",
        "taxonomy_role_id",
        "taxonomy_task_type",
      ].every((name) => names.has(name))
    )
      return degraded("schema_unavailable");
    const rows = database
      .prepare(
        `SELECT taxonomy_role_id AS roleId, taxonomy_task_type AS taskTypeId, COUNT(DISTINCT request_id) AS requestCount
       FROM runtime_telemetry_records
       WHERE created_at_ms >= ? AND created_at_ms <= ?
         AND request_class IN ('live', 'live_request')
         AND taxonomy_role_id IS NOT NULL AND length(trim(taxonomy_role_id)) > 0
         AND taxonomy_task_type IS NOT NULL AND length(trim(taxonomy_task_type)) > 0
       GROUP BY taxonomy_role_id COLLATE BINARY, taxonomy_task_type COLLATE BINARY
       ORDER BY taxonomy_role_id COLLATE BINARY, taxonomy_task_type COLLATE BINARY
       LIMIT ?`,
      )
      .all(
        input.nowMs - input.stalenessWindowDays * 86400000,
        input.nowMs,
        ROUTE_CENSUS_MAX_PAIRS + 1,
      ) as { roleId: string; taskTypeId: string; requestCount: number }[];
    if (rows.length > ROUTE_CENSUS_MAX_PAIRS) return degraded("pair_limit");
    for (const row of rows) {
      if (!exactId(row.roleId) || !exactId(row.taskTypeId)) continue;
      const scopeKey = key(row.roleId, row.taskTypeId);
      const prior = pairs.get(scopeKey);
      pairs.set(scopeKey, {
        roleId: row.roleId,
        taskTypeId: row.taskTypeId,
        requestCount: row.requestCount,
        admitted: prior?.admitted ?? 0,
        configured: configured.size,
        rolledBack: prior?.rolledBack ?? false,
      });
    }
    if (pairs.size > ROUTE_CENSUS_MAX_PAIRS) return degraded("pair_limit");
    const candidates = [...pairs.values()].sort((a, b) =>
      a.roleId < b.roleId
        ? -1
        : a.roleId > b.roleId
          ? 1
          : a.taskTypeId < b.taskTypeId
            ? -1
            : a.taskTypeId > b.taskTypeId
              ? 1
              : 0,
    );
    /**
     * Prefer families that are NOT on an eligibility cooldown. The fallback mirrors D1: if every family is cooled down
     * there is nothing to prefer, and an empty census would idle the walk while a real family is waiting - so the full
     * set is offered and the walk behaves exactly as it did before this filter existed.
     */
    const ready = candidates.filter(
      (candidate) =>
        (nextEligibleAtMs.get(key(candidate.roleId, candidate.taskTypeId)) ?? 0) <= input.nowMs,
    );
    /**
     * Run 108: a family whose corpus CANNOT be projected must not be offered as the focus either.
     *
     * MEASURED on stage-rc-add42fbffd86: the eligibility filter above is INERT for the family that actually starves the
     * walk, because `recruiter/recruiter.candidate.screen` has NO ladder row at all - the cached
     * `knowledge:list-route-ladders` projection read back from the live store contains only
     * `coordinator/coordinator.follow_up` and `writer/writer.summarize` (both carrying nextEligibleAtMs, so the field
     * itself is present and my earlier suspicion about the projection was WRONG). The census ADDS telemetry-only
     * families from the query above, and those carry no ladder and therefore no eligibility. So the walk kept selecting a
     * family whose corpus read refuses (route-challenge-evidence.ts:556 - LIMIT 501 against a 500 budget, 1465 captures
     * for recruiter) and failed every tick while projectable families sat unused.
     *
     * The deciding number is ALREADY HERE: the query above computes COUNT(DISTINCT request_id) over
     * `request_class IN ('live','live_request')` - the very same measure the corpus gate refuses on. Filtering on it
     * removes the guesswork: the census declines to offer a family the corpus read is about to refuse.
     *
     * Fallback matches D1 and the eligibility filter: if EVERY family is over budget there is nothing to prefer, so the
     * full set is offered and behaviour matches the previous build.
     */
    const projectable = ready.filter(
      (candidate) => (candidate.requestCount ?? 0) <= ROUTE_CORPUS_PROJECTION_BUDGET,
    );
    return {
      status: "available",
      candidates: projectable.length > 0 ? projectable : ready.length > 0 ? ready : candidates,
    };
  } catch {
    return degraded("database_unavailable");
  } finally {
    database?.close();
  }
}
