#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const OPERATOR_PORTS = new Set([3456, 3457, 3458]);
const args = process.argv.slice(2);
const value = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const inputs = { manifest: value("--manifest"), executable: value("--executable"), repoRoot: value("--repo-root"), staticRoot: value("--static-root"), port: value("--port"), stateRoot: value("--state-root"), fixtureRoot: value("--fixture-root") };
const problems = [];
for (const [name, value] of Object.entries(inputs)) if (value === undefined || value.trim() === "") problems.push(name + " is required");
if (inputs.port !== undefined) { const port = Number(inputs.port); if (!Number.isInteger(port) || port < 1 || port > 65535) problems.push("port is invalid"); else if (OPERATOR_PORTS.has(port)) problems.push("port " + port + " is an operator port"); }
if (inputs.executable && !existsSync(inputs.executable)) problems.push("executable does not exist");
if (inputs.repoRoot && !existsSync(inputs.repoRoot)) problems.push("repo root does not exist");
if (inputs.staticRoot && !existsSync(inputs.staticRoot)) problems.push("static root does not exist");
if (inputs.manifest !== undefined && !existsSync(inputs.manifest)) problems.push("manifest does not exist");
// Only resolve the fixture root once the inputs it depends on are present, so a missing
// input reports as NOT RUN instead of throwing.
const resolvedFixtureRoot =
  inputs.repoRoot === undefined
    ? undefined
    : inputs.fixtureRoot
      ? path.resolve(inputs.fixtureRoot)
      : path.join(path.resolve(inputs.repoRoot), "testdata", "router-runtime", "fixtures");
if (resolvedFixtureRoot !== undefined && !existsSync(resolvedFixtureRoot)) {
  problems.push(
    "fixture root does not exist (" + resolvedFixtureRoot + ") - pass --fixture-root",
  );
}
const allowDirtyState = args.includes("--allow-dirty-state");
// S192: a fixture catalogue can name a specific worker; assert it is actually served, so the
// configuration path is checked instead of assumed. Repeatable: --expect-model a --expect-model b.
const expectModels = [];
for (let i = 0; i < args.length; i += 1) if (args[i] === "--expect-model" && args[i + 1]) expectModels.push(args[i + 1]);
if (inputs.stateRoot !== undefined) {
  const resolvedState = path.resolve(inputs.stateRoot);
  if (allowDirtyState === false && existsSync(resolvedState)) {
    const { readdirSync } = await import("node:fs");
    if (readdirSync(resolvedState).length > 0) {
      problems.push("state root is not empty (" + resolvedState + ") - pass --allow-dirty-state");
    }
  }
}
if (problems.length > 0) { console.log("NOT RUN: " + problems.join("; ")); process.exit(2); }

// S106: a stale service on the requested port would answer the journeys for the WRONG
// binary. Refuse to run rather than measure someone else's process.
{
  const net = await import("node:net");
  const portFree = await new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(Number(inputs.port), "127.0.0.1");
  });
  if (portFree === false) {
    console.log("NOT RUN: port " + String(inputs.port) + " is already in use; refusing to measure another process");
    process.exit(2);
  }
}

const port = Number(inputs.port);
const base = "http://127.0.0.1:" + port;
const sha256 = createHash("sha256").update(readFileSync(inputs.executable)).digest("hex");
if (inputs.manifest !== undefined) {
  const manifest = JSON.parse(readFileSync(inputs.manifest, "utf8"));
  const expected = manifest?.executable_sha256 ?? manifest?.runtime?.executable_sha256;
  if (typeof expected !== "string" || expected.toLowerCase() !== sha256) {
    console.log(
      "NOT RUN: executable sha256 " + sha256 + " does not match manifest " + String(expected) +
        " - refusing to verify the wrong binary",
    );
    process.exit(2);
  }
}
const stateRoot = path.resolve(inputs.stateRoot);
mkdirSync(stateRoot, { recursive: true });
if (resolvedFixtureRoot === undefined) {
  console.log("NOT RUN: fixture root could not be resolved");
  process.exit(2);
}
const fixtureRoot = resolvedFixtureRoot;
// S170: the scope id is not forced. Hardcoding a development scope made a production-channel
// package refuse to start, and the verifier then reported a health failure for a binary that runs
// fine by hand (same defect the reviewer found in compare-release).
const childArgs = [
  "--repo-root", path.resolve(inputs.repoRoot),
  "--runtime-state-root", stateRoot,
  "--host", "127.0.0.1",
  "--port", String(port),
  "--fixture-root", fixtureRoot,
];
// S106: --static-root was validated and then never forwarded, so the journeys measured the
// packaged default instead of the root the caller supplied.
if (inputs.staticRoot !== undefined) childArgs.push("--static-root", path.resolve(inputs.staticRoot));
const child = spawn(inputs.executable, childArgs, { stdio: ["ignore", "pipe", "pipe"] });
const childStderr = [];
child.stderr.on("data", (chunk) => { childStderr.push(String(chunk)); });
const results = [];
let healthFailure = null;
const check = async (name, fn) => { try { const detail = await fn(); results.push({ name, status: "PASS", detail }); } catch (error) { results.push({ name, status: "FAIL", detail: error instanceof Error ? error.message : String(error) }); } };
const getJson = async (pathname) => { const response = await fetch(base + pathname); const text = await response.text(); let body; try { body = JSON.parse(text); } catch { body = undefined; } return { body, status: response.status, text }; };
try {
  let health;
  const healthBudgetMs = Number(process.env.R39_HEALTH_TIMEOUT_MS ?? 90_000);
  const deadline = Date.now() + healthBudgetMs;
  while (Date.now() < deadline) { try { const response = await fetch(base + "/healthz"); if (response.ok) { health = await response.json(); break; } } catch {} await new Promise((resolve) => setTimeout(resolve, 250)); }
  if (health === undefined) {
    const tail = childStderr.join("").split("\n").filter(Boolean).slice(-3).join(" | ");
    const exited = child.exitCode !== null;
    // S170: log, then THROW. A process.exit here skipped the finally that kills and waits for the
    // child, so a failed health check could leave the package running.
    healthFailure = {
      exitCode: exited ? 1 : 2,
      message:
        (exited ? "FAIL" : "NOT RUN") +
        ": health did not become ready on port " + String(port) +
        " (child " + (exited ? "exited " + String(child.exitCode) : "still running") +
        (tail ? "; stderr: " + tail : "") + ")",
      tail,
    };
    throw new Error("health not ready");
  }
  await check("health", () => { if (health.status !== "healthy") throw new Error("health status " + String(health.status)); return "healthy " + String(health.runtime?.version ?? "unknown"); });
  await check("models", async () => { const r = await getJson("/api/role-model/models"); if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("models HTTP " + String(r.status)); return String(r.body.length) + " models"; });
  await check("telemetry", async () => { const r = await getJson("/api/role-model/telemetry/summary"); if (r.status !== 200) throw new Error("telemetry HTTP " + String(r.status)); return "requestCount " + String(r.body?.requestCount); });
  await check("controller", async () => { const r = await getJson("/api/role-model/controller"); if (r.status !== 200 || typeof r.body?.endpointId !== "string") throw new Error("controller HTTP " + String(r.status)); return r.body.endpointId; });
  await check("learning", async () => { const r = await getJson("/api/role-model/operator/learning"); if (r.status !== 200 || r.body?.knowledge === undefined) throw new Error("learning HTTP " + String(r.status)); return String(r.body.knowledge.schemaVersion); });
  await check("replay jobs", async () => { const r = await getJson("/api/role-model/operator/replay/jobs"); if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("replay HTTP " + String(r.status)); return String(r.body.length) + " jobs"; });
  await check("evaluation jobs", async () => { const r = await getJson("/api/role-model/operator/evaluation/jobs"); if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("evaluation HTTP " + String(r.status)); return String(r.body.length) + " jobs"; });
  // S180: the shell is more than index bytes. Three defects found by eye in S175-S179 are
  // checkable here, so a package cannot ship them again: a missing stylesheet, a missing bundle,
  // and the inline dark palette that made the light theme unreadable (1.12:1).
  await check("ui css", async () => {
    const response = await fetch(base + "/assets/main.css");
    if (response.status !== 200) throw new Error("main.css status " + String(response.status));
    const css = await response.text();
    if (css.length < 10_000) throw new Error("main.css is only " + String(css.length) + " bytes");
    if (!css.includes("html[data-theme=light]")) throw new Error("main.css has no light theme block");
    if (!css.includes("html[data-theme=dark]")) throw new Error("main.css has no dark theme block");
    return String(css.length) + " bytes, both theme blocks";
  });
  await check("ui bundle", async () => {
    const response = await fetch(base + "/assets/main.js");
    if (response.status !== 200) throw new Error("main.js status " + String(response.status));
    const type = response.headers.get("content-type") ?? "";
    if (!/javascript/i.test(type)) throw new Error("main.js content-type " + type);
    const body = await response.text();
    if (body.length < 50_000) throw new Error("main.js is only " + String(body.length) + " bytes");
    if (!body.includes('"studio-run"')) throw new Error("main.js does not contain the Studio control");
    if (!body.includes('"overview-filter"')) throw new Error("main.js does not contain the Overview filters");
    return String(body.length) + " bytes";
  });
  await check("ui theme boot", async () => {
    const response = await fetch(base + "/");
    const html = await response.text();
    if (!html.includes("dataset.theme")) throw new Error("index does not select a theme");
    if (/setProperty\(\s*"--rm-/.test(html)) throw new Error("index writes palette tokens inline; the light theme breaks");
    return "theme selected in CSS, no inline palette";
  });
  for (const expected of expectModels) {
    await check("expected model " + expected, async () => {
      const response = await getJson("/api/role-model/models");
      if (response.status !== 200 || !Array.isArray(response.body)) throw new Error("models status " + String(response.status));
      const ids = response.body.map((entry) => entry?.id).filter((id) => typeof id === "string");
      if (!ids.includes(expected)) throw new Error("model not served: " + expected + " (saw " + ids.join(", ") + ")");
      return expected;
    });
  }
  await check("ui shell", async () => { const response = await fetch(base + "/"); const text = await response.text(); if (response.status !== 200 || !/Runtime UI|role-model/i.test(text)) throw new Error("UI shell HTTP " + String(response.status)); return String(text.length) + " bytes"; });
} finally {
  // S106: kill and WAIT. A bare kill() can leave the child alive while the script exits.
  if (child.exitCode === null && child.signalCode === null) {
    child.kill();
    const exited = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 5_000);
      child.once("exit", () => { clearTimeout(timer); resolve(true); });
    });
    if (exited === false) {
      if (process.platform === "win32") {
        const { spawnSync } = await import("node:child_process");
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
      }
    }
  }
}
if (healthFailure !== null) {
  console.log(healthFailure.message);
  if (healthFailure.tail) console.log("stderr_tail=" + healthFailure.tail);
  process.exit(healthFailure.exitCode);
}
const failed = results.filter((entry) => entry.status === "FAIL");
console.log("version=" + String(results[0]?.detail ?? "unknown"));
console.log("sha256=" + sha256);
console.log("port=" + String(port) + " state=" + stateRoot + " fixtures=" + fixtureRoot);
for (const result of results) console.log(result.status + " " + result.name + ": " + String(result.detail));
if (results.length === 0) { console.log("NOT RUN: no journey assertions executed"); process.exit(2); }
if (failed.length === 0 && results.length < 8) { console.log("NOT RUN: journey assertions incomplete"); process.exit(2); }
process.exit(failed.length > 0 ? 1 : 0);
