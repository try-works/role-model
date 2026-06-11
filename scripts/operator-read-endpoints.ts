import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const dbPath = path.join(
  process.env.LOCALAPPDATA ?? "",
  "Role Model Runtime",
  "standalone-runtime",
  "memory",
  "memory.sqlite",
);

const database = new DatabaseSync(dbPath, { readOnly: true });
const rows = database
  .prepare("SELECT endpoint_id, model_id, endpoint_kind, lifecycle_state FROM runtime_endpoints")
  .all();
console.log(`runtime_endpoints: ${rows.length}`);
console.log(JSON.stringify(rows, null, 2));
database.close();
