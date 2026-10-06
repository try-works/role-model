#!/usr/bin/env node
// run105 pi-live localhost-only mock OpenAI-compatible provider (SUCCESS mode).
// Serves /health, /v1/models, /v1/chat/completions, /v1/responses on 127.0.0.1 only.
import http from "node:http";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const MOCK_MODEL_ID = "run105-mock/pi-live-marker";
const MARKER_CONTENT = "RUN105-PI-INTENT-E2E-SUCCESS via explicit current extension and final runtime.";
const ADMISSION_PROBE_CONTENT = "role-model admission readiness probe";

function option(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}
const port = Number(option("--port") ?? "3465");
const receiptPath = option("--receipt") ?? path.join(process.cwd(), "run105-pi-live-mock-receipt.json");
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("--port must be an integer 0-65535");

const state = {
  schemaVersion: "1.0",
  providerKind: "run105-pi-live-loopback-openai-success",
  startedAt: new Date().toISOString(),
  port,
  modelListCount: 0,
  admissionProbeCount: 0,
  chatCompletionsCount: 0,
  responsesCount: 0,
  rejectedRequestCount: 0,
  requests: [],
};

function writeReceipt() {
  mkdirSync(path.dirname(receiptPath), { recursive: true });
  const tmp = receiptPath + ".tmp";
  writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  renameSync(tmp, receiptPath);
}

function isAdmissionProbe(body) {
  if (!body || typeof body !== "object") return false;
  const messages = Array.isArray(body.messages) ? body.messages : null;
  return Boolean(messages && messages.length === 1 && messages[0]?.role === "user"
    && typeof messages[0]?.content === "string" && messages[0].content === ADMISSION_PROBE_CONTENT);
}

function readJsonBody(request, limit = 512 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) { reject(new Error("request body exceeds the bounded limit")); request.destroy(); return; }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch { resolve({}); }
    });
    request.on("error", reject);
  });
}

function summarize(body) {
  return {
    model: typeof body?.model === "string" ? body.model : null,
    stream: Boolean(body?.stream),
    messageRoles: Array.isArray(body?.messages) ? body.messages.map((m) => m?.role) : [],
    userContentPreview: Array.isArray(body?.messages)
      ? String(body.messages.filter((m) => m?.role === "user").map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content))).join(" | ")).slice(0, 300)
      : null,
    intentMetadata: body?.intent ?? body?.role_model ?? body?.metadata?.role_model ?? null,
  };
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  response.setHeader("content-type", "application/json");
  if (request.method === "GET" && pathname === "/health") {
    response.end(JSON.stringify({ status: "ready", providerKind: state.providerKind }));
    return;
  }
  if (request.method === "GET" && pathname === "/v1/models") {
    state.modelListCount += 1;
    writeReceipt();
    response.end(JSON.stringify({ object: "list", data: [{ id: "deepseek/deepseek-flash", object: "model", owned_by: "run105-mock" }, { id: MOCK_MODEL_ID, object: "model", owned_by: "run105-mock" }] }));
    return;
  }
  if (request.method === "POST" && pathname === "/v1/chat/completions") {
    let body = {};
    try { body = await readJsonBody(request); }
    catch {
      state.rejectedRequestCount += 1;
      writeReceipt();
      response.statusCode = 413;
      response.end(JSON.stringify({ error: { type: "payload_too_large", message: "request body exceeds the bounded limit" } }));
      return;
    }
    const probe = isAdmissionProbe(body);
    const record = { at: new Date().toISOString(), kind: probe ? "admission-probe" : "chat-completion", ...summarize(body) };
    state.requests.push(record);
    if (probe) state.admissionProbeCount += 1; else state.chatCompletionsCount += 1;
    writeReceipt();
    response.statusCode = 200;
    response.end(JSON.stringify({
      id: "chatcmpl-run105-" + state.chatCompletionsCount + "-" + state.admissionProbeCount,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body?.model || MOCK_MODEL_ID,
      choices: [{ index: 0, message: { role: "assistant", content: probe ? "ok" : MARKER_CONTENT }, finish_reason: "stop" }],
      usage: { prompt_tokens: 12, completion_tokens: probe ? 1 : 32, total_tokens: probe ? 13 : 44 },
    }));
    return;
  }
  if (request.method === "POST" && pathname === "/v1/responses") {
    let body = {};
    try { body = await readJsonBody(request); } catch {}
    const probe = isAdmissionProbe(body);
    state.responsesCount += 1;
    state.requests.push({ at: new Date().toISOString(), kind: probe ? "admission-probe-responses" : "responses", ...summarize(body) });
    writeReceipt();
    response.statusCode = 200;
    response.end(JSON.stringify({
      id: "resp-run105-" + state.responsesCount,
      object: "response",
      created_at: Math.floor(Date.now() / 1000),
      model: body?.model || MOCK_MODEL_ID,
      output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: probe ? "ok" : MARKER_CONTENT }] }],
      usage: { input_tokens: 12, output_tokens: 32, total_tokens: 44 },
    }));
    return;
  }
  state.rejectedRequestCount += 1;
  writeReceipt();
  response.statusCode = 404;
  response.end(JSON.stringify({ error: { type: "not_found", message: "not found" } }));
});

server.listen(port, "127.0.0.1", () => {
  writeReceipt();
  process.stdout.write(JSON.stringify({ status: "ready", origin: "http://127.0.0.1:" + port, pid: process.pid }) + "\n");
});
const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
