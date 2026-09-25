import { mkdtempSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { expect, test } from "vitest";

import { readPersistedControllerEndpointId } from "../src/cli.js";

/**
 * Run 100 addendum 19, item 8c. Measured live on `:3457` 2026-09-25:
 *
 * - `runtime_controller_assignments` holds `scope = global ->
 *   deepseek.personal.deepseek-api-key.global.deepseek-flash-high`, and `/api/role-model/controller`
 *   answers exactly that row;
 * - in the last 24 h, 30 of the 64 replay jobs were planned with that same endpoint as their **source**
 *   arm, and `judge_candidate_overlap` — the tick's named deferral for "the capture's own endpoint is the
 *   judge" — has **never** appeared in 5804 dispositions.
 *
 * The tick receives its judge only through `resolveJudgeEndpointId`, which reads the in-process
 * `readControllerAssignment` binding; when that answers nothing (the narrow options object handed to the
 * auto-replay loop does not always carry the binding) the guard silently sleeps and comparisons are
 * planned whose judge is one of their own arms — the class Evaluation Core later excludes as
 * `judge_self_evaluation`. The durable row is the fallback the run's addendum asks for, so the resolver
 * can always name the judge the operator configured.
 */

const createMemoryDatabase = (rows: ReadonlyArray<{ scope: string; endpointId: string; updatedAtMs: number }>) => {
  const stateRoot = mkdtempSync(path.join(tmpdir(), "run153-controller-"));
  const scopeId = "standalone-runtime-stage";
  const directory = path.join(stateRoot, scopeId, "memory");
  mkdirSync(directory, { recursive: true });
  const databasePath = path.join(directory, "memory.sqlite");
  const database = new DatabaseSync(databasePath);
  database.exec(
    "CREATE TABLE runtime_controller_assignments (scope TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, model_id TEXT NOT NULL, source_type TEXT NOT NULL, updated_at_ms INTEGER NOT NULL)",
  );
  const insert = database.prepare(
    "INSERT INTO runtime_controller_assignments (scope, endpoint_id, model_id, source_type, updated_at_ms) VALUES (?, ?, ?, ?, ?)",
  );
  for (const row of rows) {
    insert.run(row.scope, row.endpointId, "deepseek/deepseek-flash", "remote", row.updatedAtMs);
  }
  database.close();
  return { stateRoot, scopeId, databasePath };
};

test("run153 item 8c the fallback reads the durable controller endpoint the operator configured", () => {
  const { stateRoot, scopeId } = createMemoryDatabase([
    {
      scope: "global",
      endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
      updatedAtMs: 1789898496926,
    },
  ]);

  expect(readPersistedControllerEndpointId({ runtimeStateRoot: stateRoot, scopeId })).toBe(
    "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
  );
});

test("run153 item 8c a scope-specific assignment wins over the global row", () => {
  const { stateRoot, scopeId } = createMemoryDatabase([
    { scope: "global", endpointId: "endpoint:global", updatedAtMs: 1 },
    { scope: "standalone-runtime-stage", endpointId: "endpoint:scoped", updatedAtMs: 2 },
  ]);

  expect(readPersistedControllerEndpointId({ runtimeStateRoot: stateRoot, scopeId })).toBe(
    "endpoint:scoped",
  );
});

test("run153 item 8c no durable assignment means no fallback answer", () => {
  const { stateRoot, scopeId } = createMemoryDatabase([]);
  expect(readPersistedControllerEndpointId({ runtimeStateRoot: stateRoot, scopeId })).toBeNull();
  expect(
    readPersistedControllerEndpointId({
      runtimeStateRoot: path.join(stateRoot, "does-not-exist"),
      scopeId,
    }),
  ).toBeNull();
});
