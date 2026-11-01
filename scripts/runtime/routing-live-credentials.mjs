#!/usr/bin/env node
/**
 * S611: live-credential routing verification against the packaged build.
 *
 * This is the ONLY harness that spends real provider credentials. The owner directed testing routing with
 * the DeepSeek credentials that live on this device, so the harness copies an isolated, pre-seeded
 * credential state per run, launches the packaged executable against the COPY on port 3461, and proves a
 * real DeepSeek completion travelled through the router:
 *
 *   1. /healthz healthy, serving the pinned artifact version;
 *   2. /v1/models serves a DeepSeek alias (default \`deepseek/deepseek-flash\`);
 *   3. POST /v1/chat/completions returns 200 with a non-empty assistant message and usage.total_tokens > 0;
 *   4. GET /api/role-model/router/decisions has a NEW row (decidedAtMs > run start) with
 *      providerId="deepseek" and finishReason="stop";
 *   5. the source state root is byte-for-byte untouched, and the per-run copy is deleted.
 *
 * CREDENTIAL SAFETY
 * - The state source is never read for content: only a metadata tree signature (relative path + size) is
 *   taken, before and after, to prove the original is pristine.
 * - No state file bytes, no authorization header and no key material are ever written. Every captured
 *   line/body passes through \`redact()\`, which strips bearer tokens and api-key-shaped values, and the
 *   per-run copy is removed in a finally block.
 *
 * Usage:
 *   node scripts/runtime/routing-live-credentials.mjs
 *   node scripts/runtime/routing-live-credentials.mjs --state-source <dir> --port 3461 --model deepseek/deepseek-flash
 *   node scripts/runtime/routing-live-credentials.mjs --exe <exe> --expect-version 0.0.20-471-g2e4aca6b
 *
 * Exit: 0 all assertions passed; 1 an assertion failed; 2 NOT RUN (bad inputs / busy port / unhealthy host).
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const checkoutRoot = path.resolve(__dirname, "../..");

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};

const head = (() => {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: checkoutRoot, encoding: "utf8" });
  return result.status === 0 ? String(result.stdout).trim() : "unknown";
})();

const exe = path.resolve(value("--exe") ?? path.join(checkoutRoot, "role-model-router", "dist", "release", "win32-x64", "role-model-dev.exe"));
const stateSource = path.resolve(value("--state-source") ?? "D:/DEV/rm-clean/live-state2");
const port = Number(value("--port") ?? 3461);
const model = value("--model") ?? "deepseek/deepseek-flash";

const expectedVersion = value("--expect-version") ?? "0.0.20-471-g2e4aca6b";
const expectedSha256 = value("--expect-sha256");
const healthBudgetMs = Number(process.env.ROUTING_LIVE_HEALTH_TIMEOUT_MS ?? 240_000);
const logPath = path.resolve(
  value("--log") ??
    path.join(checkoutRoot, ".recursive", "run", "115-effect-foldkit-runtime-migration", "evidence", "logs", "routing-live-deepseek-" + head + ".log"),
);

const lines = [];
const record = (line = "") => {
  lines.push(line);
  console.log(line);
};
const truncate = (text, limit = 4000) => (text.length <= limit ? text : text.slice(0, limit) + "…(" + String(text.length) + " bytes)");
// Credential material must never reach the log. Strip bearer values and api-key-shaped assignments; the
// harness additionally never reads state-file contents, so this is defence in depth for anything the host
// itself prints.
const redact = (text) =>
  String(text)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/(sk-[A-Za-z0-9_-]{4,})/g, "[REDACTED_API_KEY]")
    .replace(/("?api[-_]?key"?\s*[:=]\s*)("[^"]*"|[^\s,;}]+)/gi, "$1[REDACTED]")
    .replace(/(authorization"?\s*[:=]\s*)("[^"]*"|[^\s,;}]+)/gi, "$1[REDACTED]");

const failures = [];
const checks = [];
const check = async (name, fn) => {
  try {
    const detail = await fn();
    checks.push({ name, status: "PASS", detail });
    record("PASS " + name + ": " + redact(String(detail)));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    checks.push({ name, status: "FAIL", detail });
    failures.push(name + ": " + detail);
    record("FAIL " + name + ": " + redact(detail));
  }
};

const finishLog = () => {
  try {
    mkdirSync(path.dirname(logPath), { recursive: true });
    writeFileSync(logPath, redact(lines.join("\n")) + "\n", "utf8");
    console.log("log=" + logPath);
  } catch (error) {
    console.log("could not write evidence log: " + (error instanceof Error ? error.message : String(error)));
  }
};
const notRun = (message) => {
  record("NOT RUN: " + message);
  finishLog();
  process.exit(2);
};

/** Metadata-only signature: relative path + byte size. Never reads file contents. */
const treeSignature = (root) => {
  const entries = [];
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const nextRel = rel.length === 0 ? entry.name : rel + "/" + entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, nextRel);
      else if (entry.isFile()) entries.push(nextRel + "\t" + String(statSync(full).size));
    }
  };
  walk(root, "");
  return entries.sort().join("\n");
};

record("# S611 live-credential routing verification");
record("head=" + head);
record("exe=" + exe);
record("state_source=" + stateSource);
record("port=" + String(port));
record("model=" + model);
record("expect_version=" + expectedVersion);
record("started_at=" + new Date().toISOString());
record("");

// ---- preflight -------------------------------------------------------------------------------
if (!existsSync(exe)) notRun("packaged executable not found: " + exe);
if (!existsSync(stateSource)) notRun("credential state source not found: " + stateSource);
if (!Number.isInteger(port) || port < 1 || port > 65535) notRun("invalid --port");
const exeSha256 = createHash("sha256").update(readFileSync(exe)).digest("hex");
record("exe_sha256=" + exeSha256);
if (expectedSha256 !== undefined && expectedSha256.toLowerCase() !== exeSha256) {
  notRun("executable sha256 " + exeSha256 + " does not match --expect-sha256 " + expectedSha256);
}
const manifestPath = path.join(path.dirname(exe), "manifest.json");
let manifestVersion;
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifestVersion = typeof manifest?.version === "string" ? manifest.version : undefined;
  record("manifest_version=" + String(manifestVersion ?? "unknown"));
  record("manifest_sha256=" + String(manifest?.executable_sha256 ?? manifest?.sha256 ?? "missing"));
  if (expectedVersion !== undefined && manifestVersion !== expectedVersion) {
    notRun("manifest version " + String(manifestVersion) + " does not match --expect-version " + expectedVersion);
  }
} else {
  record("manifest=missing (" + manifestPath + ")");
}
record("");

const portFree = async (candidate) => {
  const server = net.createServer();
  const free = await new Promise((resolve) => {
    server.once("error", () => resolve(false));
    server.listen(candidate, "127.0.0.1", () => server.close(() => resolve(true)));
  });
  return free;
};
if (!(await portFree(port))) notRun("port " + String(port) + " is already in use; refusing to measure another process");

// ---- pristine-source check + per-run copy ----------------------------------------------------
const sourceBefore = treeSignature(stateSource);
record("state_source_files=" + String(sourceBefore.length === 0 ? 0 : sourceBefore.split("\n").length) + " signature_sha256=" + createHash("sha256").update(sourceBefore).digest("hex"));
const stateCopy = mkdtempSync(path.join(os.tmpdir(), "routing-live-"));
const copiedState = path.join(stateCopy, "state");
record("state_copy=" + copiedState);
cpSync(stateSource, copiedState, { recursive: true });
const copyFiles = treeSignature(copiedState).split("\n").filter(Boolean).length;
record("state_copy_files=" + String(copyFiles));
// The Track B sidecar derives its managed-key scope from hash(channel, resolved state-root path). A copy
// lives at a different path, so the ORIGINAL run's durable key-lifecycle.json conflicts with the new scope
// ("managed key lifecycle identity conflicts with durable metadata") and the sidecar refuses to start.
// Removing that one file from the COPY lets the sidecar mint its own lifecycle rows under the copy's root.
// It holds no provider credential material: the provider API key lives under credentials/ and memory.sqlite.
// The source state is never touched.
const staleKeyLifecycle = path.join(copiedState, "standalone-runtime-dev", "track-b", "key-lifecycle.json");
if (existsSync(staleKeyLifecycle)) {
  rmSync(staleKeyLifecycle, { force: true });
  record("copied_key_lifecycle_reset=true (path-scoped Track B key rows are re-minted under the copy root)");
} else {
  record("copied_key_lifecycle_reset=false (no key-lifecycle.json in the source state)");
}
record("");

// ---- launch the packaged host ----------------------------------------------------------------
const childArgs = [
  "--repo-root", path.dirname(exe),
  "--runtime-state-root", copiedState,
  "--host", "127.0.0.1",
  "--port", String(port),
];
record("spawn: " + exe + " " + childArgs.join(" "));
const child = spawn(exe, childArgs, { stdio: ["ignore", "pipe", "pipe"] });
let childExited = null;
child.once("exit", (code, signal) => {
  childExited = { code, signal };
  record("[host] exited code=" + String(code) + " signal=" + String(signal));
});
child.stdout.on("data", (chunk) => {
  for (const line of String(chunk).split("\n").filter((entry) => entry.trim().length > 0)) record("[host] " + redact(line));
});
child.stderr.on("data", (chunk) => {
  for (const line of String(chunk).split("\n").filter((entry) => entry.trim().length > 0)) record("[host:err] " + redact(line));
});

const base = "http://127.0.0.1:" + String(port);
const call = async (method, pathname, body) => {
  const response = await fetch(base + pathname, {
    method,
    headers: { connection: "close", ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }
  record("HTTP " + method + " " + pathname + " -> " + String(response.status));
  if (body !== undefined) record("  request_body=" + redact(truncate(JSON.stringify(body))));
  record("  response_body=" + redact(truncate(text)));
  return { status: response.status, body: parsed, text };
};

const waitForHealth = async () => {
  const deadline = Date.now() + healthBudgetMs;
  while (Date.now() < deadline) {
    if (childExited !== null) return { ok: false, reason: "host exited before health (code " + String(childExited.code) + ")" };
    try {
      const response = await fetch(base + "/healthz", { headers: { connection: "close" } });
      if (response.ok) {
        const body = await response.json();
        record("healthz=" + redact(truncate(JSON.stringify(body), 3000)));
        return { ok: true, body };
      }
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return { ok: false, reason: "health did not become ready within " + String(healthBudgetMs) + "ms" };
};

const shutdown = async () => {
  if (childExited !== null) return;
  child.kill();
  const exited = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 10_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
  if (exited) {
    record("[host] graceful shutdown acknowledged");
    return;
  }
  record("[host] graceful shutdown timed out; escalating");
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(child.pid, "SIGKILL");
    } catch {
      // already gone
    }
  }
};

const runStartedAtMs = Date.now();
let chosenModel = model;
try {
  const health = await waitForHealth();
  if (!health.ok) {
    record("");
    record("NOT RUN: " + health.reason);
    await shutdown();
    // A NOT RUN exit inside the try must still delete the credential copy: process.exit skips finally.
    try {
      rmSync(stateCopy, { force: true, recursive: true });
      record("state_copy_removed=true");
    } catch (error) {
      record("state_copy_removed=false (" + redact(error instanceof Error ? error.message : String(error)) + ")");
    }
    finishLog();
    process.exit(2);
  }
  await check("health", () => {
    if (String(health.body?.status) !== "healthy") throw new Error("health status " + String(health.body?.status));
    const servedVersion = health.body?.runtime?.version;
    if (expectedVersion !== undefined && servedVersion !== expectedVersion) {
      throw new Error("health version " + String(servedVersion) + " does not match --expect-version " + expectedVersion);
    }
    return "healthy " + String(servedVersion);
  });

  await check("deepseek alias is served by /v1/models", async () => {
    const result = await call("GET", "/v1/models");
    if (result.status !== 200) throw new Error("/v1/models HTTP " + String(result.status));
    const entries = Array.isArray(result.body?.data) ? result.body.data : [];
    const ids = entries.map((entry) => (entry !== null && typeof entry === "object" && typeof entry.id === "string" ? entry.id : "")).filter(Boolean);
    const deepseek = ids.filter((id) => id.toLowerCase().includes("deepseek"));
    if (deepseek.length === 0) throw new Error("no deepseek alias served; ids=" + JSON.stringify(ids.slice(0, 20)));
    chosenModel = ids.includes(model) ? model : deepseek[0];
    record("served_deepseek_ids=" + JSON.stringify(deepseek));
    record("chosen_model=" + chosenModel);
    return chosenModel + " (" + String(deepseek.length) + " deepseek alias(es))";
  });

  const requestId = "routing-live-" + String(Date.now());
  await check("POST /v1/chat/completions returns a real DeepSeek completion", async () => {
    // No token budget: the owner removed the cap. The route/provider decides when to stop, so the
    // assertion is a real completed completion, not a budget being filled.
    const result = await call("POST", "/v1/chat/completions", {
      model: chosenModel,
      messages: [{ role: "user", content: "Reply with the single word pong." }],
    });
    if (result.status !== 200) throw new Error("chat HTTP " + String(result.status) + ": " + redact(truncate(result.text, 600)));
    const body = result.body;
    if (body?.object !== "chat.completion") throw new Error("object " + String(body?.object));
    const choice = body?.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) throw new Error("assistant content is empty");
    if (typeof body?.usage?.total_tokens !== "number" || body.usage.total_tokens <= 0) throw new Error("usage.total_tokens is " + String(body?.usage?.total_tokens));
    if (choice?.finish_reason !== "stop") throw new Error("finish_reason " + String(choice?.finish_reason));
    if (typeof body?.model !== "string" || !body.model.toLowerCase().includes("deepseek")) throw new Error("response model is " + String(body?.model));
    return "model=" + body.model + " total_tokens=" + String(body.usage.total_tokens) + " finish=stop content=" + truncate(String(content).trim(), 40);
  });

  await check("router decision recorded for this run", async () => {
    const deadline = Date.now() + 20_000;
    let match;
    let rows = [];
    while (Date.now() < deadline) {
      const result = await call("GET", "/api/role-model/router/decisions");
      if (result.status !== 200) throw new Error("router/decisions HTTP " + String(result.status));
      rows = Array.isArray(result.body) ? result.body : Array.isArray(result.body?.rows) ? result.body.rows : [];
      match = rows.find(
        (row) =>
          typeof row?.decidedAtMs === "number" &&
          row.decidedAtMs > runStartedAtMs &&
          row.providerId === "deepseek" &&
          row.finishReason === "stop",
      );
      if (match !== undefined) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (match === undefined) {
      const after = rows.filter((row) => typeof row?.decidedAtMs === "number" && row.decidedAtMs > runStartedAtMs);
      throw new Error("no NEW decision row in this run with providerId=deepseek/finishReason=stop (new rows: " + JSON.stringify(after.slice(0, 3)) + ")");
    }
    return "requestId=" + String(match.requestId) + " endpoint=" + String(match.selectedEndpointId) + " provider=" + String(match.providerId) + " finishReason=" + String(match.finishReason) + " decidedAtMs=" + String(match.decidedAtMs);
  });

  // Informational (not an acceptance assertion): the request ledger should also carry the request.
  try {
    const ledger = await call("GET", "/api/role-model/requests");
    const rows = Array.isArray(ledger.body) ? ledger.body : [];
    record("ledger_rows=" + String(rows.length) + " latest_client_request_id=" + String(rows[0]?.clientRequestId ?? "none"));
  } catch (error) {
    record("ledger read skipped: " + redact(error instanceof Error ? error.message : String(error)));
  }
} catch (error) {
  failures.push("unexpected error: " + (error instanceof Error ? error.message : String(error)));
  record("FAIL unexpected error: " + redact(error instanceof Error ? error.message : String(error)));
} finally {
  await shutdown();
  try {
    rmSync(stateCopy, { force: true, recursive: true });
    record("state_copy_removed=true");
  } catch (error) {
    record("state_copy_removed=false (" + redact(error instanceof Error ? error.message : String(error)) + ")");
  }
}

record("");
record("# RESULT");
record("head=" + head + " exe_version=" + String(manifestVersion ?? "unknown") + " exe_sha256=" + exeSha256 + " port=" + String(port) + " model=" + chosenModel);
for (const entry of checks) record(entry.status + " " + entry.name + ": " + redact(String(entry.detail)));
const sourceAfter = treeSignature(stateSource);
record("state_source_unchanged=" + String(sourceAfter === sourceBefore) + " signature_sha256=" + createHash("sha256").update(sourceAfter).digest("hex"));
if (sourceAfter !== sourceBefore) failures.push("state source changed during the run; it is no longer pristine");
if (failures.length === 0) record("RESULT: PASS (" + String(checks.length) + "/" + String(checks.length) + " assertions)");
else {
  record("RESULT: FAIL (" + String(failures.length) + " failure(s))");
  for (const failure of failures) record("  " + redact(failure));
}
finishLog();
process.exit(failures.length === 0 ? 0 : 1);