import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import test from "node:test";

/**
 * S238: the parity harness itself had no tests, yet S235 (additive-shape) and S237 (identity flags)
 * both changed its classification and exit codes. Two tiny HTTP servers stand in for the two releases,
 * which is exactly what --left/--right accept.
 */
const listen = (bodies) =>
  new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const body = bodies[request.url];
      if (body === undefined) {
        response.writeHead(404, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "not found" }));
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });

const runCompare = (args) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/runtime/compare-release.mjs", ...args], {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("close", (code) => resolve({ code, stderr, stdout }));
  });

const health = (version, extra = {}) => ({ runtime: { channel: "development", version, ...extra } });
const summary = (extra = {}) => ({ runtime: { channel: "development", ...extra }, unifiedConfig: { path: "x" } });

const bodiesFor = (version, extra = {}) => ({
  "/healthz": health(version, extra),
  "/api/role-model/runtime/summary": summary(extra),
  "/api/role-model/models": [{ id: "m1" }],
  "/api/role-model/endpoints": [{ endpointId: "e1" }],
  "/api/role-model/router/summary": { strategy: "balanced" },
  "/api/role-model/telemetry/summary": { requestCount: 0 },
  "/api/role-model/operator/learning": { rows: [] },
  "/api/role-model/operator/replay/jobs": { jobs: [] },
  "/api/role-model/operator/evaluation/jobs": { jobs: [] },
});

test("S238: identical releases classify as same", async () => {
  const left = await listen(bodiesFor("0.0.20-1"));
  const right = await listen(bodiesFor("0.0.20-1"));
  try {
    const result = await runCompare(["--left", "http://127.0.0.1:" + String(left.port), "--right", "http://127.0.0.1:" + String(right.port)]);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /same \/healthz/);
    assert.equal(result.stdout.includes("different"), false);
  } finally {
    left.server.close();
    right.server.close();
  }
});

test("S238: an added key is additive-shape, not shape-delta", async () => {
  const left = await listen(bodiesFor("0.0.20-1"));
  const right = await listen(bodiesFor("0.0.20-1", { release_id: "run88" }));
  try {
    const result = await runCompare(["--left", "http://127.0.0.1:" + String(left.port), "--right", "http://127.0.0.1:" + String(right.port)]);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /additive-shape \/healthz/);
    assert.match(result.stdout, /"additive-shape":2/);
  } finally {
    left.server.close();
    right.server.close();
  }
});

test("S238: a value change is different, not additive", async () => {
  const left = await listen(bodiesFor("0.0.20-1"));
  const right = await listen({ ...bodiesFor("0.0.20-1"), "/api/role-model/router/summary": { strategy: "cost" } });
  try {
    const result = await runCompare(["--left", "http://127.0.0.1:" + String(left.port), "--right", "http://127.0.0.1:" + String(right.port)]);
    // A real value difference must FAIL the parity run; exit 0 would report a difference as acceptable.
    assert.equal(result.code, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /different \/api\/role-model\/router\/summary/);
    assert.match(result.stdout, /value-diff \/api\/role-model\/router\/summary: strategy \("balanced" -> "cost"\)/);
  } finally {
    left.server.close();
    right.server.close();
  }
});

test("S238: a wrong expected version fails with exit 2", async () => {
  const left = await listen(bodiesFor("0.0.20-231-gd61c32dc"));
  const right = await listen(bodiesFor("0.0.20"));
  try {
    const result = await runCompare([
      "--left", "http://127.0.0.1:" + String(left.port),
      "--right", "http://127.0.0.1:" + String(right.port),
      "--expect-left-version", "0.0.20-999",
    ]);
    assert.equal(result.code, 2, result.stdout + result.stderr);
    assert.match(result.stdout, /FAIL identity: left is 0\.0\.20-231-gd61c32dc, expected 0\.0\.20-999/);
  } finally {
    left.server.close();
    right.server.close();
  }
});

test("S238: matching expected versions pass and are printed", async () => {
  const left = await listen(bodiesFor("0.0.20-231-gd61c32dc"));
  const right = await listen(bodiesFor("0.0.20"));
  try {
    const result = await runCompare([
      "--left", "http://127.0.0.1:" + String(left.port),
      "--right", "http://127.0.0.1:" + String(right.port),
      "--expect-left-version", "0.0.20-231-gd61c32dc",
      "--expect-right-version", "0.0.20",
    ]);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /identity left=0\.0\.20-231-gd61c32dc right=0\.0\.20/);
  } finally {
    left.server.close();
    right.server.close();
  }
});
