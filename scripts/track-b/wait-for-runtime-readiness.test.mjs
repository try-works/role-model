import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const helperPath = path.join(repoRoot, "scripts", "track-b", "wait-for-runtime-readiness.mjs");

function runReadinessCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [helperPath, ...args], {
      cwd: repoRoot,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function withHealthServer(handler, callback) {
  const server = createServer(async (request, response) => {
    if (request.url !== "/healthz") {
      response.writeHead(404).end();
      return;
    }
    const next = await handler();
    response.writeHead(next.status ?? 200, {
      "content-type": next.contentType ?? "application/json",
    });
    response.end(next.body);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object", "health server must bind a TCP port");
  const url = `http://127.0.0.1:${address.port}/healthz`;
  try {
    await callback(url);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

function readinessArgs(url) {
  return ["--url", url, "--timeout-ms", "500", "--poll-interval-ms", "20"];
}

test("refuses an HTTP-200 health response while runtime bootstrap is degraded and pending", async () => {
  await withHealthServer(
    () => ({
      body: JSON.stringify({
        status: "degraded",
        credentialLifecycleAuthority: { state: "provisional", bootstrapStatus: "pending" },
        sessionBootstrap: { status: "pending" },
      }),
    }),
    async (url) => {
      const result = await runReadinessCli(readinessArgs(url));
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, /timed out waiting for semantic runtime readiness/i);
      assert.match(result.stderr, /status=degraded/i);
      assert.match(result.stderr, /sessionBootstrap=pending/i);
    },
  );
});

test("accepts only healthy, authoritative, bootstrap-ready runtime health", async () => {
  await withHealthServer(
    () => ({
      body: JSON.stringify({
        status: "healthy",
        credentialLifecycleAuthority: { state: "authoritative", bootstrapStatus: "ready" },
        sessionBootstrap: { status: "ready" },
      }),
    }),
    async (url) => {
      const result = await runReadinessCli(readinessArgs(url));
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /semantic runtime readiness: ready/i);
    },
  );
});

test("fails closed when health responds with malformed JSON", async () => {
  await withHealthServer(
    () => ({ body: "not-json", contentType: "application/json" }),
    async (url) => {
      const result = await runReadinessCli(readinessArgs(url));
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, /timed out waiting for semantic runtime readiness/i);
      assert.match(result.stderr, /malformed JSON/i);
    },
  );
});

test("fails closed with bounded diagnostics when health never becomes ready", async () => {
  await withHealthServer(
    () => ({ status: 503, body: "unavailable", contentType: "text/plain" }),
    async (url) => {
      const result = await runReadinessCli(readinessArgs(url));
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, /timed out waiting for semantic runtime readiness/i);
      assert.match(result.stderr, /HTTP 503/i);
    },
  );
});
