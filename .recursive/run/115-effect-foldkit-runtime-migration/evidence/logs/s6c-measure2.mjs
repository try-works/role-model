import { DatabaseSync } from "node:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const dir = mkdtempSync(path.join(tmpdir(), "s6c-measure2-"));
const file = path.join(dir, "memory.sqlite");
const seed = new DatabaseSync(file);
seed.exec("CREATE TABLE t (id TEXT PRIMARY KEY, v TEXT)");
seed.exec("INSERT INTO t VALUES ('k', 'v')");
seed.close();
const blocker = new DatabaseSync(file);
blocker.exec("BEGIN EXCLUSIVE");
const timed = (label, open, pragma) => {
  const t0 = performance.now();
  const db = open();
  const t1 = performance.now();
  if (pragma !== undefined) db.exec(`PRAGMA busy_timeout = ${pragma}`);
  const t2 = performance.now();
  let error;
  try { db.prepare("SELECT v FROM t WHERE id = ?").all("k"); } catch (e) { error = e; }
  const t3 = performance.now();
  db.close();
  console.log(JSON.stringify({ label, openMs: Math.round(t1 - t0), pragmaMs: Math.round(t2 - t1), queryMs: Math.round(t3 - t2), totalMs: Math.round(t3 - t0), code: error?.code, message: String(error?.message ?? "") }));
};
for (const busy of [0, 250, 1000, 5000]) timed("readonly+pragma", () => new DatabaseSync(file, { readOnly: true }), busy);
timed("readonly+default", () => new DatabaseSync(file, { readOnly: true }), undefined);
blocker.exec("ROLLBACK");
blocker.close();
