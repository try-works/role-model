#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const WORKTREE = "D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration";
const TEMP_ROOT = "E:/role-model-run115";
const FIXTURES = path.join(WORKTREE, "testdata/router-runtime/fixtures");
const artifacts = [
  { label: "R", dir: "D:/role-model-router/0.0.20" },
  { label: "C", dir: path.join(WORKTREE, "role-model-router/dist/release/win32-x64") },
];
const endpoints = [
  "/healthz",
  "/api/version",
  "/api/role-model/runtime/summary",
  "/api/role-model/taxonomy/version",
  "/api/role-model/taxonomy/manifest",
  "/api/role-model/extensions",
  "/api/role-model/operator/status",
  "/api/role-model/operator/diagnostics",
];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const allocatePort = () => new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") { server.close(); reject(new Error("no port")); return; }
    const port = address.port;
    server.close((error) => error ? reject(error) : resolve(port));
  });
});
const stop = (child) => {
  if (child.pid == null || child.exitCode !== null) return;
  spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
};
const fetchJson = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: response.status, body };
  } catch (error) {
    return { status: null, body: null, error: String(error) };
  }
};
const capture = async (artifact) => {
  const manifest = JSON.parse(await readFile(path.join(artifact.dir, "manifest.json"), "utf8"));
  const stateRoot = await mkdtemp(path.join(TEMP_ROOT, "s28a-"));
  const port = await allocatePort();
  const child = spawn(path.join(artifact.dir, manifest.executable), [
    "--repo-root", artifact.dir,
    "--runtime-state-root", stateRoot,
    "--scope-id", manifest.scope_id,
    "--host", "127.0.0.1",
    "--port", String(port),
    "--fixture-root", FIXTURES,
    "--static-root", path.join(artifact.dir, "build", "client"),
  ], { cwd: artifact.dir, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  const stdout = [], stderr = [];
  child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  try {
    let healthy = false;
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline && child.exitCode === null) {
      const health = await fetchJson(`http://127.0.0.1:${port}/healthz`);
      if (health.status === 200) { healthy = true; break; }
      await delay(250);
    }
    const captures = {};
    if (healthy) {
      for (const endpoint of endpoints) {
        captures[endpoint] = await fetchJson(`http://127.0.0.1:${port}${endpoint}`);
      }
    }
    return {
      label: artifact.label,
      dir: artifact.dir,
      manifest,
      port,
      healthy,
      exitCode: child.exitCode,
      stdout: stdout.join("").trim(),
      stderr: stderr.join("").trim(),
      captures,
    };
  } finally {
    stop(child);
    await delay(300);
    await rm(stateRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
};
await mkdir(TEMP_ROOT, { recursive: true });
const results = [];
for (const artifact of artifacts) results.push(await capture(artifact));
const comparisons = [];
for (const endpoint of endpoints) {
  const left = results[0].captures?.[endpoint];
  const right = results[1].captures?.[endpoint];
  const equal = JSON.stringify(left) === JSON.stringify(right);
  comparisons.push({ endpoint, equal, R: left, C: right });
}
const output = { fixtures: FIXTURES, results, comparisons };
const outPath = path.join(WORKTREE, ".recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/s28a-compare.json");
await writeFile(outPath, JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));