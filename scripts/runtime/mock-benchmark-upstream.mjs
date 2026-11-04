#!/usr/bin/env node
/**
 * Local OpenAI-compatible mock upstream for benchmark proof.
 *
 * Healthy mode answers judge requests with a valid grading JSON and subject requests with a
 * deterministic answer. Fail-after-first mode answers the admission probe once and then
 * returns HTTP 500 so a terminal benchmark run has a real per-case error.
 *
 * Usage:
 *   node scripts/runtime/mock-benchmark-upstream.mjs --port 3490 --mode healthy
 *   node scripts/runtime/mock-benchmark-upstream.mjs --port 3491 --mode fail-after-first
 */
import { appendFileSync } from "node:fs";
import http from "node:http";

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const at = args.indexOf(name);
  return at < 0 ? fallback : args[at + 1];
};
const port = Number(value("--port", "3490"));
const mode = value("--mode", "healthy");
const succeedFirst = Number(value("--succeed-first", "1"));
const logPath = value("--log", "D:/DEV/rm-clean/mock-benchmark-requests.jsonl");
let requestCount = 0;

const isJudge = (body) => {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  return messages.some((message) => /judge|grading|grade this|score/i.test(String(message?.content ?? "")));
};

const completion = (body, content) => JSON.stringify({
  id: "chatcmpl-mock-" + String(++requestCount),
  object: "chat.completion",
  created: Math.floor(Date.now() / 1000),
  model: body?.model ?? "mock-model",
  choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
  usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
});

const server = http.createServer((request, response) => {
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    let body = {};
    try { body = raw.length > 0 ? JSON.parse(raw) : {}; } catch { body = { raw }; }
    requestCount += 1;
    appendFileSync(logPath, JSON.stringify({ at: Date.now(), mode, port, requestCount, method: request.method, url: request.url, body }) + "\n");
    response.setHeader("content-type", "application/json");
    if (mode === "fail-after-first" && requestCount > succeedFirst) {
      response.statusCode = 500;
      response.end(JSON.stringify({ error: { message: "mock upstream failure", type: "server_error" } }));
      return;
    }
    const content = mode === "invalid-judge" && isJudge(body)
      ? "not valid judge json"
      : isJudge(body)
        ? JSON.stringify({ score: 0.82, rationale: "Mock judge: the deliverable addresses the requested capability." })
        : "mock answer for benchmark proof";
    response.end(completion(body, content));
  });
});
server.listen(port, "127.0.0.1", () => console.log(JSON.stringify({ status: "listening", port, mode, logPath })));
