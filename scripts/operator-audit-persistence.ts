import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const runtimeRoot = path.join(process.env.LOCALAPPDATA ?? "", "Role Model Runtime");
const scopeId = "standalone-runtime";
const dbPath = path.join(runtimeRoot, scopeId, "memory", "memory.sqlite");

const database = new DatabaseSync(dbPath, { readOnly: true });

console.log("=== runtime_endpoints ===");
console.log(
  database.prepare("SELECT endpoint_id, model_id, lifecycle_state FROM runtime_endpoints").all(),
);

console.log("\n=== provider_accounts (oauth) ===");
const accounts = database
  .prepare(
    "SELECT provider_account_id, auth_mode, status, health_status, credential_ref FROM provider_accounts WHERE auth_mode = 'oauth2-device-code'",
  )
  .all();
console.log(accounts);

console.log("\n=== provider_device_auth_sessions ===");
console.log(
  database
    .prepare("SELECT provider_account_id, status, expires_at_ms FROM provider_device_auth_sessions")
    .all(),
);

console.log("\n=== peers.json ===");
const peersPath = path.join(runtimeRoot, "peers.json");
console.log(existsSync(peersPath) ? readFileSync(peersPath, "utf8") : "missing");

console.log("\n=== oauth token files ===");
for (const rel of [
  "credentials/oauth/moonshot/moonshot.personal.kimi-code.json",
  "credentials/oauth/moonshot/moonshot.personal.moonshot-oauth.json",
]) {
  const filePath = path.join(runtimeRoot, scopeId, rel);
  if (!existsSync(filePath)) {
    console.log(rel, "MISSING");
    continue;
  }
  const payload = JSON.parse(readFileSync(filePath, "utf8")) as {
    saved_at_ms?: number;
    expires_in?: number;
    access_token?: string;
  };
  const expiresAt =
    typeof payload.saved_at_ms === "number" && typeof payload.expires_in === "number"
      ? payload.saved_at_ms + payload.expires_in * 1000
      : null;
  console.log(rel, {
    hasAccess: Boolean(payload.access_token),
    expiresAtMs: expiresAt,
    expired: expiresAt ? expiresAt < Date.now() : null,
  });
}

console.log("\n=== operator-intent manifest ===");
const intentPath = path.join(runtimeRoot, scopeId, "operator-intent.json");
console.log(existsSync(intentPath) ? readFileSync(intentPath, "utf8") : "missing");

console.log("\n=== latest req-runtime-host-bridge difficulty cache ===");
const cache = database
  .prepare(
    "SELECT cache_json FROM difficulty_classification_cache WHERE conversation_id = 'conversation-main'",
  )
  .get() as { cache_json?: string } | undefined;
console.log(cache?.cache_json ?? "none");

database.close();
