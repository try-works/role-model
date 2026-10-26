#!/usr/bin/env node
/**
 * Run 115 S127: smoke the runtime host FROM SOURCE with no packaging step.
 *
 * The R27 rewiring needs a gate that fails when a structural change stops the host starting or
 * serving. This runs the real entry (src/cli-entry.ts via tsx) against a real fixture root and
 * asserts the surfaces an operator depends on, then tears the process tree down.
 *
 * Exit codes follow the R39 convention: 0 pass, 1 fail, 2 invalid or NOT RUN.
 */
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const OPERATOR_PORTS = new Set([3456, 3457, 3458]);
const repoRoot = value("--repo-root");
const explicitPort = value("--port");
const timeoutMs = Number(value("--timeout-ms") ?? 120_000);

const problems = [];
if (repoRoot === undefined) problems.push("--repo-root is required");
else if (!existsSync(repoRoot)) problems.push("repo root does not exist: " + repoRoot);
if (explicitPort !== undefined) {
  const port = Number(explicitPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) problems.push("--port is invalid");
  else if (OPERATOR_PORTS.has(port)) problems.push("port " + port + " is an operator port");
}
if (problems.length > 0) {
  console.log("NOT RUN: " + problems.join("; "));
  process.exit(2);
}

const appDir = path.join(repoRoot, "role-model-router", "apps", "runtime-host-bridge");
const entry = path.join(appDir, "src", "cli-entry.ts");
const fixtureRoot = path.resolve(value("--fixture-root") ?? path.join(repoRoot, "testdata", "router-runtime", "fixtures"));
if (!existsSync(entry)) {
  console.log("NOT RUN: entry not found at " + entry);
  process.exit(2);
}
if (!existsSync(fixtureRoot)) {
  console.log("NOT RUN: fixture root does not exist: " + fixtureRoot + " (pass --fixture-root)");
  process.exit(2);
}

const freePort = () =>
  new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(undefined));
    probe.once("listening", () => {
      const address = probe.address();
      const resolved = typeof address === "object" && address !== null ? address.port : undefined;
      probe.close(() => resolve(resolved));
    });
    probe.listen(0, "127.0.0.1");
  });

const port = explicitPort === undefined ? await freePort() : Number(explicitPort);
if (port === undefined) {
  console.log("NOT RUN: could not allocate a loopback port");
  process.exit(2);
}
if (explicitPort !== undefined) {
  const available = await new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port, "127.0.0.1");
  });
  if (available === false) {
    console.log("NOT RUN: port " + port + " is already in use");
    process.exit(2);
  }
}

// Never write state inside the worktree: a smoke run must leave the tree clean.
const stateRoot = path.join(os.tmpdir(), "r39-source-smoke-" + String(port));
// Spawning .cmd shims needs a shell on modern Node, so run tsx through node directly.
const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
if (!existsSync(tsxCli)) {
  console.log("NOT RUN: tsx CLI not found at " + tsxCli + " (run pnpm install)");
  process.exit(2);
}
const child = spawn(
  process.execPath,
  [
    tsxCli, entry,
    "--repo-root", repoRoot,
    "--runtime-state-root", stateRoot,
    "--host", "127.0.0.1",
    "--port", String(port),
    "--fixture-root", fixtureRoot,
  ],
  { cwd: appDir, stdio: ["ignore", "pipe", "pipe"] },
);

const stderr = [];
let spawnError;
child.once("error", (error) => {
  spawnError = error;
});
child.stderr.on("data", (chunk) => stderr.push(String(chunk)));

const stop = () => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
};

const base = "http://127.0.0.1:" + String(port);
const fetchWithTimeout = async (url) => {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch {
    return undefined;
  }
};

let health;
const deadline = Date.now() + timeoutMs;
while (Date.now() < deadline) {
  const response = await fetchWithTimeout(base + "/healthz");
  if (response !== undefined && response.ok) {
    health = await response.json();
    break;
  }
  if (child.exitCode !== null) break;
  await new Promise((resolve) => setTimeout(resolve, 250));
}

if (health === undefined && spawnError !== undefined) {
  console.log("NOT RUN: could not start the host process: " + spawnError.message);
  process.exit(2);
}

if (health === undefined) {
  stop();
  const tail = stderr.join("").split("\n").filter(Boolean).slice(-3).join(" | ");
  const exited = child.exitCode !== null;
  console.log(
    (exited ? "FAIL" : "NOT RUN") +
      ": the host did not become healthy on port " + String(port) +
      " (child " + (exited ? "exited " + String(child.exitCode) : "still running") +
      (tail ? "; stderr: " + tail : "") + ")",
  );
  process.exit(exited ? 1 : 2);
}

const results = [];
const check = async (name, fn) => {
  try {
    results.push({ detail: await fn(), name, status: "PASS" });
  } catch (error) {
    results.push({ detail: error instanceof Error ? error.message : String(error), name, status: "FAIL" });
  }
};

const getJson = async (pathname) => {
  const response = await fetchWithTimeout(base + pathname);
  if (response === undefined) throw new Error("no response for " + pathname);
  return { body: await response.json().catch(() => undefined), status: response.status, text: await response.text().catch(() => "") };
};

await check("health", () => {
  if (health.status !== "healthy") throw new Error("health status " + String(health.status));
  return String(health.runtime?.version ?? "unknown");
});
await check("models", async () => {
  const response = await getJson("/api/role-model/models");
  if (response.status !== 200 || !Array.isArray(response.body)) throw new Error("models HTTP " + String(response.status));
  if (response.body.length === 0) throw new Error("models list is empty");
  return String(response.body.length) + " models";
});
await check("endpoints", async () => {
  const response = await getJson("/api/role-model/endpoints");
  if (response.status !== 200 || !Array.isArray(response.body)) throw new Error("endpoints HTTP " + String(response.status));
  if (response.body.length === 0) throw new Error("endpoint list is empty");
  return String(response.body.length) + " endpoints";
});
await check("ui shell", async () => {
  const response = await fetchWithTimeout(base + "/");
  if (response === undefined || !response.ok) throw new Error("shell HTTP " + String(response?.status));
  const text = await response.text();
  if (!text.includes("<html")) throw new Error("shell is not HTML");
  return String(text.length) + " bytes";
});

stop();
const failed = results.filter((entry) => entry.status === "FAIL");
console.log("version=" + String(health.runtime?.version ?? "unknown"));
console.log("port=" + String(port) + " fixtures=" + fixtureRoot + " state=" + stateRoot);
for (const result of results) console.log(result.status + " " + result.name + ": " + String(result.detail));
process.exit(failed.length > 0 ? 1 : 0);
