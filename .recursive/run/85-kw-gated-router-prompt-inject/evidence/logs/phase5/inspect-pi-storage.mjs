import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";

const dbPath = `${process.env.TEMP}/role-model-packaged-run85/run85-dev/memory/memory.sqlite`;
const outPath = `${process.env.TEMP}/run85-pi-storage-local.json`;
const db = new DatabaseSync(dbPath, { readOnly: true });

const tableInfo = Object.fromEntries(
  [
    "sessions",
    "conversations",
    "conversation_turns",
    "context_artifacts",
    "artifact_links",
    "runtime_observations",
    "runtime_telemetry_records",
  ].map((table) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
    const count = db.prepare(`SELECT count(*) AS c FROM ${table}`).get().c;
    return [table, { count, cols }];
  }),
);

const turnCols = tableInfo.conversation_turns.cols;
const selectTurnCols = turnCols.slice(0, 8).join(", ");
const turns = db.prepare(`SELECT ${selectTurnCols} FROM conversation_turns ORDER BY rowid DESC LIMIT 5`).all();

const artCols = tableInfo.context_artifacts.cols;
const arts = db
  .prepare(`SELECT ${artCols.slice(0, 8).join(", ")} FROM context_artifacts ORDER BY rowid DESC LIMIT 5`)
  .all();

const telCols = tableInfo.runtime_telemetry_records.cols;
const telemetry = db
  .prepare(
    `SELECT ${telCols.slice(0, 10).join(", ")} FROM runtime_telemetry_records ORDER BY rowid DESC LIMIT 8`,
  )
  .all();

const obsCols = tableInfo.runtime_observations.cols;
const observations = db
  .prepare(`SELECT ${obsCols.slice(0, 10).join(", ")} FROM runtime_observations ORDER BY rowid DESC LIMIT 8`)
  .all();

db.close();

const out = {
  databasePath: dbPath,
  tableInfo,
  recentTurns: turns,
  recentArtifacts: arts,
  recentTelemetry: telemetry,
  recentObservations: observations,
  storageBytes: fs.statSync(dbPath).size,
  storageCount:
    tableInfo.conversation_turns.count +
    tableInfo.context_artifacts.count +
    tableInfo.runtime_telemetry_records.count +
    tableInfo.runtime_observations.count,
};
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
