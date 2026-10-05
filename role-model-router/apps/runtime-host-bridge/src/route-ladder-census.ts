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
    return { status: "available", candidates };
  } catch {
    return degraded("database_unavailable");
  } finally {
    database?.close();
  }
}
