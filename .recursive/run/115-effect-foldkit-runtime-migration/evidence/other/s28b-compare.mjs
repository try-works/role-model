#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const RUN = "D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration";
const TEMP = "E:/rm-tmp/s28b";
const FIXTURES = path.join(RUN, "testdata/router-runtime/fixtures");
const artifacts = [
  { label: "R", dir: "D:/role-model-router/0.0.20" },
  { label: "DPROD", dir: "D:/DEV/role-model/.worktrees/baseline-0.0.20-main/role-model-router/dist/release/win32-x64" },
  { label: "C", dir: path.join(RUN, "role-model-router/dist/release/win32-x64") },
  { label: "DDEV", dir: "E:/rm-tmp/s28b/release-dev/win32-x64" },
];
const endpoints = [
  "/",
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
const fetchTextJson = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: response.status, body };
  } catch (error) { return { status: null, body: null, error: String(error) }; }
};
const capture = async (artifact) => {
  const manifest = JSON.parse(await readFile(path.join(artifact.dir, "manifest.json"), "utf8"));
  const stateRoot = await mkdtemp(path.join(TEMP, "state-"));
  const port = await allocatePort();
  const child = spawn(path.join(artifact.dir, manifest.executable), [
    "--repo-root", artifact.dir, "--runtime-state-root", stateRoot,
    "--scope-id", manifest.scope_id, "--host", "127.0.0.1", "--port", String(port),
    "--fixture-root", FIXTURES, "--static-root", path.join(artifact.dir, "build", "client"),
  ], { cwd: artifact.dir, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  const stderr = [];
  child.stdout.resume();
  child.stderr.setEncoding("utf8"); child.stderr.on("data", (chunk) => stderr.push(chunk));
  try {
    let healthy = false;
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline && child.exitCode === null) {
      const health = await fetchTextJson(`http://127.0.0.1:${port}/healthz`);
      if (health.status === 200) { healthy = true; break; }
      await delay(250);
    }
    const captures = {};
    if (healthy) for (const endpoint of endpoints) captures[endpoint] = await fetchTextJson(`http://127.0.0.1:${port}${endpoint}`);
    return { label: artifact.label, dir: artifact.dir, manifest, port, healthy, captures, stderr: stderr.join("").slice(-2000) };
  } finally {
    stop(child); await delay(300);
    await rm(stateRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
};
await mkdir(TEMP, { recursive: true });
const results = [];
for (const artifact of artifacts) results.push(await capture(artifact));
const output = { fixtures: FIXTURES, results };
const outPath = path.join(RUN, ".recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/s28b-compare.json");
await writeFile(outPath, JSON.stringify(output, null, 2));
for (const r of results) {
  console.log(JSON.stringify({ label: r.label, healthy: r.healthy, port: r.port, version: r.manifest.version, commit: r.manifest.commit, channel: r.manifest.channel, scope: r.manifest.scope_id, source_tree: r.manifest.source_tree, sha256: r.manifest.sha256,
    root: r.captures["/"]?.status, diagnostics: r.captures["/api/role-model/operator/diagnostics"]?.status, diagnosticsBody: r.captures["/api/role-model/operator/diagnostics"]?.body }, null, 2));
}
console.error("WROTE", outPath);