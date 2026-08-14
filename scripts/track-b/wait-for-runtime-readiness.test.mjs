import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { waitForSemanticRuntimeReadiness } from "./wait-for-runtime-readiness.mjs";

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
  return ["--url", url, "--timeout-ms", "2000", "--poll-interval-ms", "20"];
}

function healthResponse(body, { ok = true, status = 200 } = {}) {
  return { json: async () => body, ok, status };
}

async function assertBoundedFailure(fetchFn, expected) {
  let currentTime = 0;
  await assert.rejects(
    waitForSemanticRuntimeReadiness({
      fetchFn,
      now: () => currentTime,
      pollIntervalMs: 10,
      sleepFn: async (durationMs) => {
        currentTime += durationMs;
      },
      timeoutMs: 50,
      url: "http://127.0.0.1:1/healthz",
    }),
    expected,
  );
}

test("refuses an HTTP-200 health response while runtime bootstrap is degraded and pending", async () => {
  await assertBoundedFailure(
    async () =>
      healthResponse({
        status: "degraded",
        credentialLifecycleAuthority: { state: "provisional", bootstrapStatus: "pending" },
        sessionBootstrap: { status: "pending" },
      }),
    (error) => {
      assert.match(error.message, /timed out waiting for semantic runtime readiness/i);
      assert.match(error.message, /status=degraded/i);
      assert.match(error.message, /sessionBootstrap=pending/i);
      return true;
    },
  );
});

test("retains the last semantic observation when a near-deadline request aborts", async () => {
  let currentTime = 0;
  let requestCount = 0;
  await assert.rejects(
    waitForSemanticRuntimeReadiness({
      fetchFn: async () => {
        requestCount += 1;
        if (requestCount === 1) {
          return healthResponse({
            status: "degraded",
            credentialLifecycleAuthority: { state: "provisional", bootstrapStatus: "pending" },
            sessionBootstrap: { status: "pending" },
          });
        }
        currentTime = 50;
        throw new Error("The operation was aborted due to timeout");
      },
      now: () => currentTime,
      pollIntervalMs: 10,
      sleepFn: async (durationMs) => {
        currentTime += durationMs;
      },
      timeoutMs: 50,
      url: "http://127.0.0.1:1/healthz",
    }),
    /status=degraded/i,
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
  await assertBoundedFailure(
    async () => ({
      json: async () => {
        throw new SyntaxError("fixture is not JSON");
      },
      ok: true,
      status: 200,
    }),
    /malformed JSON/i,
  );
});

test("fails closed with bounded diagnostics when health never becomes ready", async () => {
  await assertBoundedFailure(
    async () => healthResponse(null, { ok: false, status: 503 }),
    /HTTP 503/i,
  );
});
