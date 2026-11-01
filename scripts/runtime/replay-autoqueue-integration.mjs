#!/usr/bin/env node
/**
 * Run 115 replay auto-queue live integration harness.
 *
 * Starts the packaged dev host on an unused loopback port with an isolated state root and proves the
 * Learning Overview's replay auto-queue control end to end:
 *
 *   1. PUT { replay: { auto_queue: { enabled: true, daily_cap: 25 } } } to the runtime config route;
 *   2. GET /track-b/replay/status reports the 25 daily counterfactual ceiling;
 *   3. GET /api/role-model/runtime/config returns config.replay.autoQueue {enabled:true,dailyCap:25};
 *   4. the runtimeConfig readback row the Learning card hydrates from is replay.autoQueue with
 *      meta {enabled:true,dailyCap:25};
 *   5. PUT enabled:false makes the readback/status hard ceiling zero (no automatic reservation).
 *
 * The artifact is version/sha pinned: --expect-version and --expect-sha256 (defaults to the 505 dev
 * artifact) refuse to run on any other binary. Raw API traffic and host output go to one evidence log;
 * no credential bytes are read or written.
 *
 * Usage: node --import tsx scripts/runtime/replay-autoqueue-integration.mjs
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const checkoutRoot = path.resolve(__dirname, "../..");
/**
 * Use the PRODUCT projections, not local copies: the readback row must be produced by the same
 * parser the Learning Overview hydrates from, and the disabled check must be the ledger's real
 * replayBudgetAvailable. Run with `node --import tsx` so the TypeScript modules load.
 */
const uiReadbackModule = await import(
  pathToFileURL(
    path.join(checkoutRoot, "role-model-router", "apps", "runtime-ui-next", "src", "readback.ts"),
  ).href
);
const ledgerModule = await import(
  pathToFileURL(
    path.join(
      checkoutRoot,
      "role-model-router",
      "apps",
      "runtime-host-bridge",
      "src",
      "track-b-replay-ledger.ts",
    ),
  ).href
);
const parseRuntimeConfigFixture = uiReadbackModule.parseRuntimeConfigFixture;
const replayBudgetAvailable = ledgerModule.replayBudgetAvailable;
if (typeof parseRuntimeConfigFixture !== "function" || typeof replayBudgetAvailable !== "function") {
  throw new Error("could not import the product readback/budget functions");
}
const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};

const exe = path.resolve(
  value("--exe") ?? path.join(checkoutRoot, "role-model-router", "dist", "release", "win32-x64", "role-model-dev.exe"),
);
const expectedVersion = value("--expect-version") ?? "0.0.20-505-ge0b1800a";
const expectedSha256 = (
  value("--expect-sha256") ?? "6d90b28aa2092e7af074324e7f1f0cc5c30d3d9d039c1a0ee25524aa52eea3ed"
).toLowerCase();
const head = (() => {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: checkoutRoot, encoding: "utf8" });
  return result.status === 0 ? String(result.stdout).trim() : "unknown";
})();
const logPath = path.resolve(
  value("--log") ??
    path.join(checkoutRoot, ".recursive", "run", "115-effect-foldkit-runtime-migration", "evidence", "logs", "replay-autoqueue-integration-" + head + ".log"),
);
const lines = [];
const record = (line = "") => {
  lines.push(line);
  console.log(line);
};
const failures = [];
const checks = [];
const check = async (name, fn) => {
  try {
    const detail = await fn();
    checks.push({ name, status: "PASS", detail });
    record("PASS " + name + ": " + String(detail));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    checks.push({ name, status: "FAIL", detail });
    failures.push(name + ": " + detail);
    record("FAIL " + name + ": " + detail);
  }
};
const finishLog = () => {
  try {
    mkdirSync(path.dirname(logPath), { recursive: true });
    writeFileSync(logPath, lines.join("\n") + "\n", "utf8");
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
const truncate = (text, limit = 6000) => (text.length <= limit ? text : text.slice(0, limit) + "…(" + String(text.length) + " bytes)");

record("# Run 115 replay auto-queue live integration");
record("head=" + head);
record("exe=" + exe);
record("log=" + logPath);
record("started_at=" + new Date().toISOString());
record("");

if (!existsSync(exe)) notRun("packaged executable not found: " + exe);
const exeSha256 = createHash("sha256").update(readFileSync(exe)).digest("hex");
record("exe_sha256=" + exeSha256);
if (exeSha256 !== expectedSha256) notRun("executable sha256 " + exeSha256 + " does not match " + expectedSha256);
const manifestPath = path.join(path.dirname(exe), "manifest.json");
if (!existsSync(manifestPath)) notRun("manifest missing: " + manifestPath);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
record("manifest_version=" + String(manifest.version ?? "unknown"));
record("manifest_sha256=" + String(manifest.executable_sha256 ?? "missing"));
if (manifest.version !== expectedVersion) notRun("manifest version " + String(manifest.version) + " does not match " + expectedVersion);
if (String(manifest.executable_sha256 ?? "").toLowerCase() !== exeSha256) {
  notRun("manifest sha256 does not match the executable");
}
record("expect_version=" + expectedVersion + " expect_sha256=" + expectedSha256);
record("");

const freePort = async () => {
  const server = createServer();
  const port = await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(address && typeof address !== "string" ? address.port : 0);
    });
  });
  await new Promise((resolve) => server.close(resolve));
  return port;
};
const port = Number(value("--port") ?? (await freePort()));
if (!Number.isInteger(port) || port < 1 || port > 65535) notRun("invalid port");
const stateRoot = path.resolve(value("--state-root") ?? mkdtempSync(path.join(os.tmpdir(), "replay-autoqueue-state-")));
mkdirSync(stateRoot, { recursive: true });
const childArgs = [
  "--repo-root",
  path.dirname(exe),
  "--runtime-state-root",
  stateRoot,
  "--host",
  "127.0.0.1",
  "--port",
  String(port),
];
record("state_root=" + stateRoot);
record("spawn: " + exe + " " + childArgs.join(" "));
record("");
const child = spawn(exe, childArgs, { env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"] });
let childExited = null;
child.once("exit", (code, signal) => {
  childExited = { code, signal };
});
child.stdout.on("data", (chunk) => {
  for (const line of String(chunk).split("\n").filter((entry) => entry.trim().length > 0)) record("[host] " + line);
});
child.stderr.on("data", (chunk) => {
  for (const line of String(chunk).split("\n").filter((entry) => entry.trim().length > 0)) record("[host:err] " + line);
});

const base = "http://127.0.0.1:" + String(port);
const call = async (method, pathname, body) => {
  let response;
  try {
    response = await fetch(base + pathname, {
      method,
      headers: { connection: "close", ...(body === undefined ? {} : { "content-type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    record("HTTP " + method + " " + pathname + " -> transport error " + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }
  record("HTTP " + method + " " + pathname + " -> " + String(response.status));
  if (body !== undefined) record("  request_body=" + truncate(JSON.stringify(body)));
  record("  response_body=" + truncate(text));
  return { status: response.status, body: parsed, text };
};
const waitForHealth = async () => {
  const deadline = Date.now() + Number(process.env.REPLAY_AUTOQUEUE_HEALTH_TIMEOUT_MS ?? 120_000);
  while (Date.now() < deadline) {
    if (childExited !== null) return { ok: false, reason: "host exited before health (code " + String(childExited.code) + ")" };
    try {
      const response = await fetch(base + "/healthz", { headers: { connection: "close" } });
      if (response.ok) {
        const body = await response.json();
        record("healthz=" + truncate(JSON.stringify(body)));
        return { ok: true, body };
      }
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return { ok: false, reason: "health did not become ready" };
};

const cleanup = async () => {
  if (childExited === null) {
    child.kill();
    const exited = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 5_000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
    if (!exited && process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    }
  }
};
const requireStatus = (response) => {
  if (response.status !== 200) throw new Error("HTTP " + String(response.status) + " " + response.text.slice(0, 500));
  return response.body;
};
const replayBudget = (body) => {
  if (body === null || typeof body !== "object") throw new Error("replay status is not an object");
  const budget = body.budget;
  if (budget === null || typeof budget !== "object") throw new Error("replay status has no budget object");
  return budget;
};
const EXPECTED_DAILY_CAP = 25;
const configAutoQueue = (body) => {
  if (body === null || typeof body !== "object") throw new Error("runtime config is not an object");
  const config = body.config;
  if (config === null || typeof config !== "object") throw new Error("runtime config has no config object");
  const replay = config.replay;
  const autoQueue = replay && typeof replay === "object" ? replay.autoQueue : undefined;
  if (autoQueue === null || typeof autoQueue !== "object") throw new Error("runtime config has no config.replay.autoQueue");
  return autoQueue;
};
/** The real UI parser builds the Learning Overview readback rows from this GET body. */
const runtimeConfigReadbackRow = (configBody, rowId) => {
  const state = parseRuntimeConfigFixture(configBody, 1);
  if (state.status !== "ok") throw new Error("runtimeConfig readback parser status is " + state.status);
  const row = state.rows.find((entry) => entry.id === rowId);
  if (!row) throw new Error("runtimeConfig readback has no row " + rowId);
  return row;
};

const main = async () => {
  const health = await waitForHealth();
  if (!health.ok) notRun(health.reason);

  await check("PUT replay auto-queue enabled true cap 25", async () => {
    const response = await call("PUT", "/api/role-model/runtime/config", {
      replay: { auto_queue: { enabled: true, daily_cap: EXPECTED_DAILY_CAP } },
    });
    if (response.status !== 200) throw new Error("PUT returned " + String(response.status));
    return "HTTP 200";
  });

  await check("GET config readback returns {enabled:true,dailyCap:25}", async () => {
    const config = requireStatus(await call("GET", "/api/role-model/runtime/config"));
    const autoQueue = configAutoQueue(config);
    if (autoQueue.enabled !== true || autoQueue.dailyCap !== EXPECTED_DAILY_CAP) {
      throw new Error("expected {enabled:true,dailyCap:25}, got " + JSON.stringify(autoQueue));
    }
    return JSON.stringify(autoQueue);
  });

  await check("Learning Overview runtimeConfig readback row replay.autoQueue is hydrated", async () => {
    const config = requireStatus(await call("GET", "/api/role-model/runtime/config"));
    const row = runtimeConfigReadbackRow(config, "replay.autoQueue");
    if (row.value !== "on") throw new Error("row value is " + row.value + ", expected on");
    const meta = JSON.parse(row.meta);
    if (meta.enabled !== true || meta.dailyCap !== EXPECTED_DAILY_CAP) {
      throw new Error("row meta is " + row.meta);
    }
    return row.id + " " + row.meta;
  });

  await check("ledger/limits readback reports daily cap 25", async () => {
    const status = requireStatus(await call("GET", "/api/role-model/track-b/replay/status"));
    const budget = replayBudget(status);
    if (budget.counterfactualLimit !== EXPECTED_DAILY_CAP) {
      throw new Error("counterfactualLimit is " + String(budget.counterfactualLimit) + ", expected 25");
    }
    if (budget.hardCounterfactualLimit !== EXPECTED_DAILY_CAP) {
      throw new Error("hardCounterfactualLimit is " + String(budget.hardCounterfactualLimit) + ", expected 25");
    }
    return "counterfactualLimit=25 hardCounterfactualLimit=25";
  });

  await check("PUT enabled false writes a hard zero ceiling", async () => {
    const response = await call("PUT", "/api/role-model/runtime/config", {
      replay: { auto_queue: { enabled: false, daily_cap: EXPECTED_DAILY_CAP } },
    });
    if (response.status !== 200) throw new Error("PUT returned " + String(response.status));
    return "HTTP 200";
  });

  await check("GET config readback returns {enabled:false,dailyCap:25}", async () => {
    const config = requireStatus(await call("GET", "/api/role-model/runtime/config"));
    const autoQueue = configAutoQueue(config);
    if (autoQueue.enabled !== false || autoQueue.dailyCap !== EXPECTED_DAILY_CAP) {
      throw new Error("expected {enabled:false,dailyCap:25}, got " + JSON.stringify(autoQueue));
    }
    const row = runtimeConfigReadbackRow(config, "replay.autoQueue");
    if (row.value !== "off") throw new Error("readback row value is " + row.value + ", expected off");
    return JSON.stringify(autoQueue);
  });

  await check("ledger/limits readback reports hard zero and refuses reservations", async () => {
    const status = requireStatus(await call("GET", "/api/role-model/track-b/replay/status"));
    const budget = replayBudget(status);
    if (budget.hardCounterfactualLimit !== 0) {
      throw new Error("hardCounterfactualLimit is " + String(budget.hardCounterfactualLimit) + ", expected 0");
    }
    if (replayBudgetAvailable(budget)) {
      throw new Error("product replayBudgetAvailable is true despite the hard zero ceiling");
    }
    return "hardCounterfactualLimit=0 budgetAvailable=false";
  });

  record("");
  record("SUMMARY " + checks.filter((entry) => entry.status === "PASS").length + "/" + String(checks.length) + " checks passed");
  if (failures.length > 0) {
    record("FAILURES " + String(failures.length));
    for (const failure of failures) record("- " + failure);
  }
  finishLog();
  await cleanup();
  process.exit(failures.length === 0 ? 0 : 1);
};

try {
  await main();
} catch (error) {
  record("UNCAUGHT: " + (error instanceof Error ? error.stack ?? error.message : String(error)));
  finishLog();
  await cleanup();
  process.exit(1);
}
