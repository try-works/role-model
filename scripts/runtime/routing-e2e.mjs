#!/usr/bin/env node
/**
 * S601: packaged-build routing end-to-end verification.
 *
 * Starts the PACKAGED executable on an unused loopback port with an isolated state root, seeds a mock
 * OpenAI-compatible provider account plus an activated endpoint over the host's own HTTP API, sends a
 * real POST /v1/chat/completions through the router, and asserts the whole chain is observable:
 *
 *   1. the router answered 200 with a real chat.completion (usage.tokens > 0, non-empty content);
 *   2. the mock upstream actually received the provider call (the request was not answered from a
 *      fixture/canned path);
 *   3. GET /api/role-model/router/summary reports a higher recentDecisionCount than before the call;
 *   4. GET /api/role-model/telemetry/summary reports a higher request count than before the call;
 *   5. the request is readable from the host request ledger (GET /api/role-model/requests[/:id]).
 *
 * Every raw stdout/stderr line and every API request/response body is written to one evidence log
 * (default: .recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/routing-e2e-<head>.log).
 *
 * Usage:
 *   node scripts/runtime/routing-e2e.mjs
 *   node scripts/runtime/routing-e2e.mjs --exe <role-model-dev.exe> --fixture-root <fixtures> --log <path>
 *   node scripts/runtime/routing-e2e.mjs --expect-version 0.0.20-453-gfbab6294 --expect-sha256 <sha>
 *
 * --exe / --fixture-root / --port / --state-root / --log are all overridable, and --expect-version /
 * --expect-sha256 REFUSE to run (exit 2) when the artifact is not the one the caller meant to measure.
 * The final gate re-runs this against the rebuilt package, so pinning the expected version is part of
 * the interface rather than a hard-coded claim.
 *
 * Exit: 0 all assertions passed; 1 an assertion failed (raw failure captured); 2 NOT RUN (bad inputs,
 * port busy, or the packaged binary did not become healthy - the log still records why).
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
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
const fixtureRoot = path.resolve(value("--fixture-root") ?? path.join(checkoutRoot, "testdata", "router-runtime", "fixtures"));
const logPath = path.resolve(
  value("--log") ??
    path.join(checkoutRoot, ".recursive", "run", "115-effect-foldkit-runtime-migration", "evidence", "logs", "routing-e2e-" + head + ".log"),
);
const explicitStateRoot = value("--state-root");
const explicitPort = value("--port");
const explicitStaticRoot = value("--static-root");
const expectedVersion = value("--expect-version");
const expectedSha256 = value("--expect-sha256");

const lines = [];
const record = (line = "") => {
  lines.push(line);
  console.log(line);
};
const truncate = (text, limit = 4000) => (text.length <= limit ? text : text.slice(0, limit) + "…(" + String(text.length) + " bytes)");
const stripSecret = (text) => text;

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

// ---- preflight: the right binary, the right inputs, a free port -------------------------------
record("# S601 packaged routing E2E");
record("head=" + head);
record("exe=" + exe);
record("fixture_root=" + fixtureRoot);
record("log=" + logPath);
record("started_at=" + new Date().toISOString());
record("");

if (!existsSync(exe)) notRun("packaged executable not found: " + exe);
if (!existsSync(fixtureRoot)) notRun("fixture root not found: " + fixtureRoot);
const exeSha256 = createHash("sha256").update(readFileSync(exe)).digest("hex");
const manifestPath = path.join(path.dirname(exe), "manifest.json");
record("exe_sha256=" + exeSha256);
if (expectedSha256 !== undefined && expectedSha256.toLowerCase() !== exeSha256) {
  notRun("executable sha256 " + exeSha256 + " does not match --expect-sha256 " + expectedSha256);
}
let manifestVersion;
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const expected = manifest?.executable_sha256 ?? manifest?.sha256;
  manifestVersion = typeof manifest?.version === "string" ? manifest.version : undefined;
  record("manifest_version=" + String(manifestVersion ?? "unknown"));
  record("manifest_sha256=" + String(expected ?? "missing"));
  if (typeof expected === "string" && expected.toLowerCase() !== exeSha256) {
    notRun("executable sha256 does not match manifest; refusing to measure the wrong binary");
  }
  if (expectedVersion !== undefined && manifestVersion !== expectedVersion) {
    notRun("manifest version " + String(manifestVersion) + " does not match --expect-version " + expectedVersion);
  }
} else {
  record("manifest=missing (" + manifestPath + ")");
}
if (expectedVersion !== undefined && manifestVersion === undefined) {
  notRun("--expect-version " + expectedVersion + " was given but there is no manifest version to check");
}
record("expect_version=" + String(expectedVersion ?? "(unpinned)") + " expect_sha256=" + String(expectedSha256 ?? "(unpinned)"));
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
const portFree = async (port) => {
  const server = createServer();
  const free = await new Promise((resolve) => {
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
  return free;
};
const port = explicitPort === undefined ? await freePort() : Number(explicitPort);
if (!Number.isInteger(port) || port < 1 || port > 65535) notRun("invalid --port");
if (!(await portFree(port))) notRun("port " + String(port) + " is already in use; refusing to measure another process");

// ---- mock OpenAI-compatible upstream ---------------------------------------------------------
const mock = { chatBodies: [], chatRequests: 0, chatModels: [], modelRequests: 0 };
const mockServer = createServer((request, response) => {
  const url = request.url ?? "";
  const send = (status, body) => {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  };
  if (request.method === "GET" && (url === "/v1/models" || url === "/models")) {
    mock.modelRequests += 1;
    send(200, { object: "list", data: [{ id: "routing-e2e/mock-chat", object: "model" }] });
    return;
  }
  if (request.method === "GET" && url === "/health") {
    send(200, { status: "ok" });
    return;
  }
  if (request.method === "POST" && (url === "/v1/chat/completions" || url === "/chat/completions")) {
    let raw = "";
    request.on("data", (chunk) => {
      raw += String(chunk);
    });
    request.on("end", () => {
      mock.chatRequests += 1;
      mock.chatBodies.push(raw);
      let body = {};
      try {
        body = JSON.parse(raw);
      } catch {
        body = {};
      }
      mock.chatModels.push(typeof body.model === "string" ? body.model : "");
      record("MOCK upstream received POST " + url + " model=" + String(body.model ?? "") + " body_bytes=" + String(raw.length));
      send(200, {
        id: "chatcmpl-routing-e2e-mock",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: typeof body.model === "string" ? body.model : "routing-e2e/mock-chat",
        choices: [{ index: 0, message: { role: "assistant", content: "routing e2e mock pong" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 11, completion_tokens: 4, total_tokens: 15 },
      });
    });
    return;
  }
  send(404, { error: "not found", path: url });
});
const mockPort = await new Promise((resolve, reject) => {
  mockServer.once("error", reject);
  mockServer.listen(0, "127.0.0.1", () => {
    const address = mockServer.address();
    resolve(address && typeof address !== "string" ? address.port : 0);
  });
});
const mockBase = "http://127.0.0.1:" + String(mockPort);
record("mock_upstream=" + mockBase);
record("");

// ---- isolated packaged host -------------------------------------------------------------------
const stateRoot = explicitStateRoot === undefined ? mkdtempSync(path.join(os.tmpdir(), "routing-e2e-state-")) : path.resolve(explicitStateRoot);
mkdirSync(stateRoot, { recursive: true });
const childArgs = [
  "--repo-root", path.dirname(exe),
  "--runtime-state-root", stateRoot,
  "--host", "127.0.0.1",
  "--port", String(port),
  "--fixture-root", fixtureRoot,
];
if (explicitStaticRoot !== undefined) childArgs.push("--static-root", path.resolve(explicitStaticRoot));
record("state_root=" + stateRoot);
record("spawn: " + exe + " " + childArgs.join(" "));
record("");
const child = spawn(exe, childArgs, {
  env: { ...process.env, MOONSHOT_API_KEY: process.env.MOONSHOT_API_KEY || "routing-e2e-key" },
  stdio: ["ignore", "pipe", "pipe"],
});
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
const call = async (method, pathname, body, headers = {}) => {
  let response;
  try {
    response = await fetch(base + pathname, {
      method,
      headers: { connection: "close", ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
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
  if (body !== undefined) record("  request_body=" + truncate(stripSecret(JSON.stringify(body))));
  record("  response_body=" + truncate(stripSecret(text)));
  return { status: response.status, body: parsed, text };
};

const waitForHealth = async () => {
  const budgetMs = Number(process.env.ROUTING_E2E_HEALTH_TIMEOUT_MS ?? 120_000);
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    if (childExited !== null) {
      return { ok: false, reason: "host exited before health (code " + String(childExited.code) + ", signal " + String(childExited.signal) + ")" };
    }
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
  return { ok: false, reason: "health did not become ready within " + String(budgetMs) + "ms" };
};

const readCount = (body) => {
  if (body === null || typeof body !== "object") return undefined;
  for (const key of ["requestCount", "totalRequests", "totalRequestCount", "requests"]) {
    const value = body[key];
    if (typeof value === "number") return value;
  }
  const summary = body.summary;
  if (summary !== null && typeof summary === "object") {
    for (const key of ["requestCount", "totalRequests"]) {
      const value = summary[key];
      if (typeof value === "number") return value;
    }
  }
  return undefined;
};

const cleanup = async () => {
  try {
    mockServer.close();
  } catch {
    // already closed
  }
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
    } else if (!exited) {
      try {
        process.kill(child.pid, "SIGKILL");
      } catch {
        // already gone
      }
    }
  }
  if (explicitStateRoot === undefined) {
    try {
      rmSync(stateRoot, { force: true, recursive: true });
    } catch {
      // best effort
    }
  }
};

const MODEL_ID = "routing-e2e/mock-chat";
const PROVIDER_ACCOUNT_ID = "moonshot.routing-e2e.primary";
let providerEndpointId = "";
let chosenModel = MODEL_ID;

try {
  const health = await waitForHealth();
  if (!health.ok) {
    record("");
    record("NOT RUN: " + health.reason);
    if (childExited !== null) record("host_exit=" + JSON.stringify(childExited));
    await cleanup();
    finishLog();
    process.exit(2);
  }
  await check("health", () => {
    const status = health.body?.status;
    if (status !== undefined && String(status) !== "healthy") throw new Error("health status " + String(status));
    const servedVersion = health.body?.runtime?.version;
    if (expectedVersion !== undefined && servedVersion !== expectedVersion) {
      throw new Error("health version " + String(servedVersion) + " does not match --expect-version " + expectedVersion);
    }
    return "healthy " + String(servedVersion ?? "unknown");
  });

  const beforeRouter = await call("GET", "/api/role-model/router/summary");
  const routerBefore = typeof beforeRouter.body?.recentDecisionCount === "number" ? beforeRouter.body.recentDecisionCount : undefined;
  record("router_before_recentDecisionCount=" + String(routerBefore ?? "missing"));
  const beforeTelemetry = await call("GET", "/api/role-model/telemetry/summary");
  const telemetryBefore = readCount(beforeTelemetry.body);
  record("telemetry_before_requestCount=" + String(telemetryBefore ?? "missing"));
  record("");

  await check("seed provider account", async () => {
    const payload = {
      accountScope: "workspace-default",
      allowedModels: [MODEL_ID],
      authMode: "api-key-static",
      baseUrlOverride: mockBase + "/v1",
      budgetPolicyRef: "budget.default",
      credentialRef: { backend: "env", ref: "MOONSHOT_API_KEY" },
      deniedModels: [],
      entitlementTags: ["chat"],
      healthStatus: "healthy",
      modelRoleBindings: [
        { disabledRoleIds: [], enabledRoleIds: ["general.chat"], modelId: MODEL_ID, roleAssignmentMode: "include", roleIds: ["general.chat"] },
      ],
      orgScope: "personal",
      providerAccountId: PROVIDER_ACCOUNT_ID,
      // A provider whose catalog adapterFamily is "ai-sdk-openai-compatible" is required for the
      // packaged live-execution path (shouldUseLiveProviderExecution); providerId "openai" maps to
      // "ai-sdk-openai" and is routed to the response-capture (replay) path instead, which returns
      // 502 "No response capture is configured" even though the account is healthy.
      providerId: "moonshot",
      providerKind: "provider-openai",
      quotaPolicyRef: "quota.default",
      regionPolicy: { mode: "prefer", regions: ["global"] },
      rotationState: "stable",
      status: "active",
    };
    const result = await call("POST", "/api/role-model/accounts", payload);
    if (result.status !== 200 && result.status !== 201) {
      throw new Error("account upsert HTTP " + String(result.status) + ": " + truncate(result.text, 500));
    }
    return PROVIDER_ACCOUNT_ID;
  });

  await check("activate endpoint", async () => {
    const result = await call("POST", "/api/role-model/endpoints/batch", {
      activationBatchId: "routing-e2e-batch-" + String(Date.now()),
      activations: [{ providerAccountId: PROVIDER_ACCOUNT_ID, modelId: MODEL_ID, region: "global" }],
    });
    if (result.status !== 200 && result.status !== 201) {
      throw new Error("endpoint activation HTTP " + String(result.status) + ": " + truncate(result.text, 500));
    }
    const endpoints = Array.isArray(result.body?.endpoints) ? result.body.endpoints : [];
    const activated = endpoints[0];
    if (activated !== undefined && typeof activated.endpointId === "string") providerEndpointId = activated.endpointId;
    return providerEndpointId.length > 0 ? providerEndpointId : "batch accepted (" + String(endpoints.length) + " endpoints)";
  });

  await check("model is served by /v1/models", async () => {
    const result = await call("GET", "/v1/models");
    if (result.status !== 200) throw new Error("/v1/models HTTP " + String(result.status));
    const entries = Array.isArray(result.body?.data) ? result.body.data : [];
    const ids = entries.map((entry) => (entry !== null && typeof entry === "object" && typeof entry.id === "string" ? entry.id : "")).filter(Boolean);
    const exact = ids.find((id) => id === MODEL_ID);
    const alias = providerEndpointId.length > 0
      ? entries.find((entry) => Array.isArray(entry?.endpoint_ids) && entry.endpoint_ids.includes(providerEndpointId))
      : undefined;
    chosenModel = exact ?? (typeof alias?.id === "string" ? alias.id : ids[0] ?? MODEL_ID);
    record("served_models=" + JSON.stringify(ids));
    record("chosen_model=" + chosenModel);
    if (ids.length === 0) throw new Error("/v1/models returned no models after activation");
    return chosenModel + " (" + String(ids.length) + " served)";
  });

  const requestId = "routing-e2e-" + String(Date.now());
  const mockChatBefore = mock.chatRequests;
  let chat;
  await check("POST /v1/chat/completions returns a real completion", async () => {
    chat = await call("POST", "/v1/chat/completions", {
      model: chosenModel,
      messages: [{ role: "user", content: "Say routing works in five words." }],
      max_tokens: 32,
    }, { "x-request-id": requestId });
    if (chat.status !== 200) throw new Error("chat HTTP " + String(chat.status) + ": " + truncate(chat.text, 500));
    const body = chat.body;
    if (body?.object !== "chat.completion") throw new Error("object " + String(body?.object));
    const choice = body?.choices?.[0];
    if (choice?.message?.role !== "assistant") throw new Error("no assistant message");
    const content = choice?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) throw new Error("assistant content is empty");
    if (typeof body?.usage?.total_tokens !== "number" || body.usage.total_tokens < 1) throw new Error("usage.total_tokens is " + String(body?.usage?.total_tokens));
    return "200 total_tokens=" + String(body.usage.total_tokens) + " content=" + truncate(String(content), 60);
  });

  await check("this request was served by the mock upstream (not a canned fixture)", async () => {
    const delta = mock.chatRequests - mockChatBefore;
    if (delta < 1) throw new Error("mock upstream saw no chat request for this router call (before " + String(mockChatBefore) + ", after " + String(mock.chatRequests) + "); the completion was not routed through a live provider call");
    const carried = mock.chatBodies.slice(-delta).some((raw) => raw.includes("Say routing works in five words."));
    if (!carried) throw new Error("the mock upstream calls did not carry this request's prompt; another caller produced them");
    return "mock_chat_requests_for_this_call=" + String(delta) + " models=" + JSON.stringify(mock.chatModels.slice(-delta));
  });

  await check("router decision recorded", async () => {
    const deadline = Date.now() + 15_000;
    let after;
    let count;
    while (Date.now() < deadline) {
      after = await call("GET", "/api/role-model/router/summary");
      count = typeof after.body?.recentDecisionCount === "number" ? after.body.recentDecisionCount : undefined;
      if (count !== undefined && (routerBefore === undefined || count > routerBefore)) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (count === undefined) throw new Error("router/summary has no recentDecisionCount: " + truncate(String(after?.text), 300));
    if (routerBefore !== undefined && count <= routerBefore) {
      throw new Error("recentDecisionCount did not increase (before " + String(routerBefore) + ", after " + String(count) + ")");
    }
    return "recentDecisionCount " + String(routerBefore ?? "?") + " -> " + String(count);
  });

  await check("telemetry summary reflects the request", async () => {
    const deadline = Date.now() + 15_000;
    let after;
    let count;
    while (Date.now() < deadline) {
      after = await call("GET", "/api/role-model/telemetry/summary");
      count = readCount(after.body);
      if (count !== undefined && (telemetryBefore === undefined || count > telemetryBefore)) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (count === undefined) throw new Error("telemetry/summary has no request count: " + truncate(String(after?.text), 300));
    if (telemetryBefore !== undefined && count <= telemetryBefore) {
      throw new Error("telemetry request count did not increase (before " + String(telemetryBefore) + ", after " + String(count) + ")");
    }
    return "requestCount " + String(telemetryBefore ?? "?") + " -> " + String(count);
  });

  await check("request ledger carries the routed request", async () => {
    const deadline = Date.now() + 15_000;
    let routed;
    while (Date.now() < deadline) {
      const recent = await call("GET", "/api/role-model/requests");
      const rows = Array.isArray(recent.body) ? recent.body : [];
      routed = rows.find((row) => row?.clientRequestId === requestId || row?.requestId === requestId);
      if (routed !== undefined && typeof routed.requestId === "string") break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (routed === undefined || typeof routed.requestId !== "string") {
      throw new Error("request " + requestId + " not found in /api/role-model/requests");
    }
    const detail = await call("GET", "/api/role-model/requests/" + encodeURIComponent(routed.requestId));
    if (detail.status !== 200) throw new Error("request detail HTTP " + String(detail.status));
    return "requestId=" + routed.requestId;
  });

  await check("decisions readback is not empty", async () => {
    const result = await call("GET", "/api/role-model/router/decisions");
    if (result.status !== 200) throw new Error("router/decisions HTTP " + String(result.status));
    const rows = Array.isArray(result.body) ? result.body : Array.isArray(result.body?.rows) ? result.body.rows : [];
    if (rows.length === 0) throw new Error("router/decisions returned no decision rows");
    return String(rows.length) + " decision row(s)";
  });
} catch (error) {
  failures.push("unexpected error: " + (error instanceof Error ? error.message : String(error)));
  record("FAIL unexpected error: " + (error instanceof Error ? error.message : String(error)));
} finally {
  await cleanup();
}

record("");
record("# RESULT");
record("head=" + head + " exe_sha256=" + exeSha256 + " port=" + String(port) + " model=" + chosenModel);
for (const entry of checks) record(entry.status + " " + entry.name + ": " + String(entry.detail));
if (failures.length === 0) {
  record("RESULT: PASS (" + String(checks.length) + "/" + String(checks.length) + " assertions)");
} else {
  record("RESULT: FAIL (" + String(failures.length) + " failure(s))");
  for (const failure of failures) record("  " + failure);
}
finishLog();
process.exit(failures.length === 0 ? 0 : 1);
