import { DatabaseSync } from "node:sqlite";

const paths = [
  `${process.env.LOCALAPPDATA}/role-model-runtime/standalone-runtime/memory/memory.sqlite`,
  `${process.env.TEMP}/role-model-packaged-run85/run85-dev/memory/memory.sqlite`,
  `${process.env.LOCALAPPDATA}/role-model-runtime/state/runtime.sqlite`,
  `${process.env.LOCALAPPDATA}/Role Model Runtime/state/runtime.sqlite`,
  `${process.env.TEMP}/role-model-packaged-run85/state/runtime.sqlite`,
];

for (const p of paths) {
  try {
    const db = new DatabaseSync(p, { readOnly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1").all();
    console.log("PATH", p);
    console.log(
      "tables",
      tables.map((t) => t.name).join(","),
    );
    if (tables.some((t) => t.name === "provider_accounts")) {
      const n = db.prepare("SELECT count(*) AS c FROM provider_accounts").get();
      console.log("provider_accounts", n.c);
      console.log(
        db
          .prepare(
            "SELECT provider_account_id, provider_id, health_status FROM provider_accounts LIMIT 8",
          )
          .all(),
      );
    }
    db.close();
  } catch (error) {
    console.log("ERR", p, String(error?.message ?? error));
  }
}
