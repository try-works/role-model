import { DatabaseSync } from "node:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const { makeSync } = await import("file:///D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration/role-model-router/packages/sql-sqlite-node/dist/service.js");
const dir = mkdtempSync(path.join(tmpdir(), "s6c-measure-"));
const file = path.join(dir, "memory.sqlite");
const seed = new DatabaseSync(file);
seed.exec("CREATE TABLE runtime_endpoints (endpoint_id TEXT PRIMARY KEY, model_id TEXT)");
seed.exec("INSERT INTO runtime_endpoints (endpoint_id, model_id) VALUES ('endpoint:known', 'provider/model-known')");
seed.close();
const blocker = new DatabaseSync(file);
blocker.exec("BEGIN EXCLUSIVE");
const run = (setup) => {
  const t0 = performance.now();
  const service = makeSync({
    databasePath: file,
    openDatabase: (f) => new DatabaseSync(f, { readOnly: true }),
    ...(setup === undefined ? {} : { setup }),
  });
  const t1 = performance.now();
  let error;
  try {
    service.querySync("SELECT model_id FROM runtime_endpoints WHERE endpoint_id = ?", ["endpoint:known"]);
  } catch (e) { error = e; }
  const t2 = performance.now();
  service.closeSync();
  const t3 = performance.now();
  console.log(JSON.stringify({ setup: setup === undefined ? "none" : "busy0", openMs: Math.round(t1 - t0), queryMs: Math.round(t2 - t1), closeMs: Math.round(t3 - t2), totalMs: Math.round(t3 - t0), code: error?.code, message: String(error?.message ?? "") }));
};
run((database) => database.exec("PRAGMA busy_timeout = 0"));
run(undefined);
blocker.exec("ROLLBACK");
blocker.close();
