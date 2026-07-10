import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

const url = process.env.CRAFT_SERVER_URL;
const token = process.env.CRAFT_SERVER_TOKEN;
const outputPath = process.env.CRAFT_VERIFY_OUTPUT;
const roleModelEndpoint = normalizeOpenAIBaseUrl(
  process.env.ROLE_MODEL_ENDPOINT ?? "http://127.0.0.1:3456",
);
const model = process.env.CRAFT_VERIFY_MODEL ?? "difficulty.remote-only";
const prompt = process.env.CRAFT_VERIFY_PROMPT ?? "Reply with exactly CRAFT_ALIAS_OK.";
const expectedText = process.env.CRAFT_VERIFY_EXPECTED_TEXT ?? "";
const timeoutMs = Number(process.env.CRAFT_VERIFY_TIMEOUT_MS ?? "120000");
const thinkingLevel = process.env.CRAFT_VERIFY_THINKING_LEVEL ?? "high";

if (!url || !token || !outputPath) {
  throw new Error("CRAFT_SERVER_URL, CRAFT_SERVER_TOKEN, and CRAFT_VERIFY_OUTPUT are required");
}

function normalizeOpenAIBaseUrl(value) {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

const startedAt = Date.now();
const events = [];
let clientId = null;
let serverVersion = null;
let lastSeq = 0;

function now() {
  return new Date().toISOString();
}

function record(type, data = {}) {
  events.push({ at: now(), type, ...data });
}

function send(ws, envelope) {
  ws.send(JSON.stringify(envelope));
}

function waitForOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
}

function waitForHandshake(ws) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Craft handshake timed out")), 10000);
    const onMessage = (event) => {
      const envelope = JSON.parse(String(event.data));
      if (envelope.type === "handshake_ack") {
        clearTimeout(timer);
        ws.removeEventListener("message", onMessage);
        clientId = envelope.clientId ?? null;
        serverVersion = envelope.serverVersion ?? null;
        record("handshake_ack", {
          clientId,
          serverVersion,
          channelCount: Array.isArray(envelope.registeredChannels) ? envelope.registeredChannels.length : null,
        });
        resolve(envelope);
      } else if (envelope.type === "error") {
        clearTimeout(timer);
        ws.removeEventListener("message", onMessage);
        reject(new Error(envelope.error?.message ?? "Craft handshake error"));
      }
    };
    ws.addEventListener("message", onMessage);
  });
}

function createClient(workspaceId) {
  const pending = new Map();
  const sessionCompleteWaiters = [];
  const ws = new WebSocket(url);

  const invoke = (channel, ...args) => {
    const id = randomUUID();
    const request = { id, type: "request", channel, args };
    record("invoke", { channel, id, workspaceId: workspaceId ?? null });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Craft RPC timeout: ${channel}`));
      }, timeoutMs);
      timer.unref?.();
      pending.set(id, { channel, resolve, reject, timer });
      send(ws, request);
    });
  };

  const waitForSessionComplete = (sessionId) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Craft session completion event timed out: ${sessionId}`)),
        timeoutMs,
      );
      timer.unref?.();
      const check = (event) => {
        if (event.channel !== "session:event") return false;
        const payload = event.args?.[0];
        if (!payload || payload.sessionId !== sessionId) return false;
        if (payload.type === "complete") {
          clearTimeout(timer);
          resolve(payload);
          return true;
        }
        if (payload.type === "error") {
          clearTimeout(timer);
          reject(new Error(payload.error ?? "Craft session error"));
          return true;
        }
        return false;
      };
      sessionCompleteWaiters.push(check);
    });

  const close = () => {
    for (const [id, waiter] of pending) {
      clearTimeout(waiter.timer);
      pending.delete(id);
      waiter.reject(new Error(`Craft websocket closed before ${waiter.channel} completed`));
    }
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  };

  const ready = (async () => {
    await waitForOpen(ws);
    send(ws, {
      id: randomUUID(),
      type: "handshake",
      protocolVersion: "1.0",
      token,
      ...(workspaceId ? { workspaceId } : {}),
      clientCapabilities: [],
    });
    await waitForHandshake(ws);
  })();

  ws.addEventListener("message", (event) => {
    const envelope = JSON.parse(String(event.data));
    if (envelope.type === "response") {
      const waiter = pending.get(envelope.id);
      if (!waiter) return;
      clearTimeout(waiter.timer);
      pending.delete(envelope.id);
      if (envelope.error) {
        const error = new Error(envelope.error.message);
        error.code = envelope.error.code;
        waiter.reject(error);
      } else {
        waiter.resolve(envelope.result);
      }
      return;
    }
    if (envelope.type === "event") {
      if (typeof envelope.seq === "number") lastSeq = envelope.seq;
      record("event", { channel: envelope.channel, args: envelope.args, workspaceId: workspaceId ?? null });
      for (let i = sessionCompleteWaiters.length - 1; i >= 0; i -= 1) {
        if (sessionCompleteWaiters[i](envelope)) {
          sessionCompleteWaiters.splice(i, 1);
        }
      }
      return;
    }
    if (envelope.type === "request") {
      send(ws, {
        id: envelope.id,
        type: "response",
        channel: envelope.channel,
        error: { code: "CHANNEL_NOT_FOUND", message: `Verification client has no handler for ${envelope.channel}` },
      });
      return;
    }
    record("envelope", { envelope, workspaceId: workspaceId ?? null });
  });

  return { ws, ready, invoke, waitForSessionComplete, close };
}

function messageToText(message) {
  const content = message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          if (typeof part.text === "string") return part.text;
          if (typeof part.content === "string") return part.content;
        }
        return "";
      })
      .join("");
  }
  return "";
}

function hasExpectedAssistantMessage(session) {
  const messages = Array.isArray(session?.messages) ? session.messages : [];
  return messages.some((message) => {
    if (message?.role !== "assistant") return false;
    const text = messageToText(message);
    return expectedText ? text.includes(expectedText) : text.trim().length > 0;
  });
}

function readCraftErrorMessage(session) {
  const messages = Array.isArray(session?.messages) ? session.messages : [];
  const errorMessage = messages.find((message) => message?.role === "error");
  return errorMessage ? messageToText(errorMessage) || "Craft session error" : "";
}

async function pollSessionMessages(client, sessionId) {
  const deadline = Date.now() + timeoutMs;
  let lastSession = null;
  while (Date.now() < deadline) {
    lastSession = await client.invoke("sessions:getMessages", sessionId);
    const errorMessage = readCraftErrorMessage(lastSession);
    if (errorMessage) {
      throw new Error(errorMessage);
    }
    if (hasExpectedAssistantMessage(lastSession)) {
      return { session: lastSession, completedBy: "messages" };
    }
    if (lastSession?.isProcessing === false && Array.isArray(lastSession?.messages)) {
      const assistantMessages = lastSession.messages.filter((message) => message?.role === "assistant");
      if (assistantMessages.length > 0 && !expectedText) {
        return { session: lastSession, completedBy: "messages" };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const messageCount = Array.isArray(lastSession?.messages) ? lastSession.messages.length : 0;
  throw new Error(`Craft session messages timed out: ${sessionId}; last message count=${messageCount}`);
}

const discoveryClient = createClient();
await discoveryClient.ready;
const workspaces = await discoveryClient.invoke("server:getWorkspaces");
const workspace = workspaces?.[0] ?? await discoveryClient.invoke("server:createWorkspace", "Run 62 Verification");
discoveryClient.close();

const client = createClient(workspace.id);
await client.ready;

const connection = {
  slug: "role-model-run62-verification",
  name: "Role-Model Run 62 Verification",
  providerType: "pi_compat",
  authType: "none",
  piAuthProvider: "openai",
  baseUrl: roleModelEndpoint,
  customEndpoint: { api: "openai-completions", supportsImages: false },
  modelSelectionMode: "userDefined3Tier",
  models: [
    "difficulty.remote-only",
    "baseline.remote-only",
    "chatgpt/gpt-5.4",
    "deepseek/deepseek-v4-pro",
  ],
  defaultModel: model,
  createdAt: Date.now(),
};
const saveResult = await client.invoke("LLM_Connection:save", connection);
if (!saveResult?.success) {
  throw new Error(`Craft connection save failed: ${saveResult?.error ?? "unknown"}`);
}

const session = await client.invoke("sessions:create", workspace.id, {
  name: `Run 62 ${model}`,
  model,
  llmConnection: connection.slug,
  workingDirectory: "none",
  permissionMode: "allow-all",
  thinkingLevel,
});
await client.invoke("session:setModel", session.id, workspace.id, model, connection.slug);

const completionPromise = client
  .waitForSessionComplete(session.id)
  .then((event) => ({ completedBy: "event", event }));
const messagesPromise = pollSessionMessages(client, session.id);
const accepted = await client.invoke("sessions:sendMessage", session.id, prompt, [], [], {
  thinkingLevel,
});
const completion = await Promise.race([completionPromise, messagesPromise]);
const finalSession = await client.invoke("sessions:getMessages", session.id);
const eventCompletion = await Promise.race([
  completionPromise.catch((error) => ({ completedBy: "event-error", error: error.message })),
  new Promise((resolve) => setTimeout(() => resolve({ completedBy: "event-not-waited" }), 500)),
]);
const finalErrorMessage = readCraftErrorMessage(finalSession);
if (finalErrorMessage) {
  throw new Error(finalErrorMessage);
}
if (!hasExpectedAssistantMessage(finalSession)) {
  throw new Error(`Craft session completed without expected assistant text: ${expectedText || "<any>"}`);
}

send(client.ws, { id: randomUUID(), type: "sequence_ack", lastSeq });
client.close();

const result = {
  ok: true,
  elapsedMs: Date.now() - startedAt,
  clientId,
  serverVersion,
  roleModelEndpoint,
  workspaceId: workspace.id,
  sessionId: session.id,
  connectionSlug: connection.slug,
  model,
  thinkingLevel,
  prompt,
  expectedText,
  accepted,
  completion,
  eventCompletion,
  messages: finalSession?.messages ?? [],
  events,
};
writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  ok: true,
  elapsedMs: result.elapsedMs,
  sessionId: session.id,
  messageCount: result.messages.length,
}, null, 2));
