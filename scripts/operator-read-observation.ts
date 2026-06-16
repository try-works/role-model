import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const requestId = process.argv[2] ?? "req-runtime-host-bridge";
const dbPath =
  process.argv[3] ??
  path.join(
    process.env.LOCALAPPDATA ?? "",
    "Role Model Runtime",
    "standalone-runtime",
    "memory",
    "memory.sqlite",
  );

const database = new DatabaseSync(dbPath, { readOnly: true });
const row = database
  .prepare(
    "SELECT request_id, created_at_ms, observation_json FROM runtime_observations WHERE request_id = ? ORDER BY created_at_ms DESC LIMIT 1",
  )
  .get(requestId) as
  | { request_id: string; created_at_ms: number; observation_json: string }
  | undefined;

if (!row) {
  console.log(`no observation for ${requestId}`);
  process.exit(0);
}

const parsed = JSON.parse(row.observation_json) as {
  routingDiagnostics?: {
    difficultyRouting?: Record<string, unknown>;
  };
  request?: { messages?: unknown };
};

console.log("request_id:", row.request_id);
console.log("created_at_ms:", row.created_at_ms);
console.log("difficulty:", JSON.stringify(parsed.routingDiagnostics?.difficultyRouting, null, 2));

database.close();
