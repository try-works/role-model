#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const OPERATOR_PORTS = new Set([3456, 3457, 3458]);
const args = process.argv.slice(2);
const value = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const inputs = { executable: value("--executable"), repoRoot: value("--repo-root"), staticRoot: value("--static-root"), port: value("--port"), stateRoot: value("--state-root"), fixtureRoot: value("--fixture-root") };
const problems = [];
for (const [name, value] of Object.entries(inputs)) if (value === undefined || value.trim() === "") problems.push(name + " is required");
if (inputs.port !== undefined) { const port = Number(inputs.port); if (!Number.isInteger(port) || port < 1 || port > 65535) problems.push("port is invalid"); else if (OPERATOR_PORTS.has(port)) problems.push("port " + port + " is an operator port"); }
if (inputs.executable && !existsSync(inputs.executable)) problems.push("executable does not exist");
if (inputs.repoRoot && !existsSync(inputs.repoRoot)) problems.push("repo root does not exist");
if (inputs.staticRoot && !existsSync(inputs.staticRoot)) problems.push("static root does not exist");
if (problems.length > 0) { console.log("NOT RUN: " + problems.join("; ")); process.exit(2); }

const port = Number(inputs.port);
const base = "http://127.0.0.1:" + port;
const sha256 = createHash("sha256").update(readFileSync(inputs.executable)).digest("hex");
const stateRoot = path.resolve(inputs.stateRoot);
mkdirSync(stateRoot, { recursive: true });
const fixtureRoot = inputs.fixtureRoot
  ? path.resolve(inputs.fixtureRoot)
  : path.join(inputs.repoRoot, "testdata", "router-runtime", "fixtures");
const child = spawn(inputs.executable, ["--repo-root", path.resolve(inputs.repoRoot), "--runtime-state-root", stateRoot, "--scope-id", "standalone-runtime-dev", "--host", "127.0.0.1", "--port", String(port), "--fixture-root", fixtureRoot], { stdio: ["ignore", "pipe", "pipe"] });
const childStderr = [];
child.stderr.on("data", (chunk) => { childStderr.push(String(chunk)); });
const results = [];
const check = async (name, fn) => { try { const detail = await fn(); results.push({ name, status: "PASS", detail }); } catch (error) { results.push({ name, status: "FAIL", detail: error instanceof Error ? error.message : String(error) }); } };
const getJson = async (pathname) => { const response = await fetch(base + pathname); const text = await response.text(); let body; try { body = JSON.parse(text); } catch { body = undefined; } return { body, status: response.status, text }; };
try {
  let health;
  for (let i = 0; i < 120; i += 1) { try { const response = await fetch(base + "/healthz"); if (response.ok) { health = await response.json(); break; } } catch {} await new Promise((resolve) => setTimeout(resolve, 250)); }
  if (health === undefined) {
    const tail = childStderr.join("").split("\n").filter(Boolean).slice(-3).join(" | ");
    const exited = child.exitCode !== null;
    console.log(
      (exited ? "FAIL" : "NOT RUN") +
        ": health did not become ready on port " + String(port) +
        " (child " + (exited ? "exited " + String(child.exitCode) : "still running") +
        (tail ? "; stderr: " + tail : "") + ")",
    );
    if (tail) console.log("stderr_tail=" + tail);
    process.exit(exited ? 1 : 2);
  }
  await check("health", () => { if (health.status !== "healthy") throw new Error("health status " + String(health.status)); return "healthy " + String(health.runtime?.version ?? "unknown"); });
  await check("models", async () => { const r = await getJson("/api/role-model/models"); if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("models HTTP " + String(r.status)); return String(r.body.length) + " models"; });
  await check("telemetry", async () => { const r = await getJson("/api/role-model/telemetry/summary"); if (r.status !== 200) throw new Error("telemetry HTTP " + String(r.status)); return "requestCount " + String(r.body?.requestCount); });
  await check("controller", async () => { const r = await getJson("/api/role-model/controller"); if (r.status !== 200 || typeof r.body?.endpointId !== "string") throw new Error("controller HTTP " + String(r.status)); return r.body.endpointId; });
  await check("learning", async () => { const r = await getJson("/api/role-model/operator/learning"); if (r.status !== 200 || r.body?.knowledge === undefined) throw new Error("learning HTTP " + String(r.status)); return String(r.body.knowledge.schemaVersion); });
  await check("replay jobs", async () => { const r = await getJson("/api/role-model/operator/replay/jobs"); if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("replay HTTP " + String(r.status)); return String(r.body.length) + " jobs"; });
  await check("evaluation jobs", async () => { const r = await getJson("/api/role-model/operator/evaluation/jobs"); if (r.status !== 200 || !Array.isArray(r.body)) throw new Error("evaluation HTTP " + String(r.status)); return String(r.body.length) + " jobs"; });
  await check("ui shell", async () => { const response = await fetch(base + "/"); const text = await response.text(); if (response.status !== 200 || !/Runtime UI|role-model/i.test(text)) throw new Error("UI shell HTTP " + String(response.status)); return String(text.length) + " bytes"; });
} finally { child.kill(); await new Promise((resolve) => setTimeout(resolve, 500)); }
const failed = results.filter((entry) => entry.status === "FAIL");
console.log("version=" + String(results[0]?.detail ?? "unknown"));
console.log("sha256=" + sha256);
console.log("port=" + String(port) + " state=" + stateRoot + " fixtures=" + fixtureRoot);
for (const result of results) console.log(result.status + " " + result.name + ": " + String(result.detail));
if (results.length === 0) { console.log("NOT RUN: no journey assertions executed"); process.exit(2); }
if (failed.length === 0 && results.length < 8) { console.log("NOT RUN: journey assertions incomplete"); process.exit(2); }
process.exit(failed.length > 0 ? 1 : 0);
