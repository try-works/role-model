import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { startForwarder } from "../src/forwarder.js";

function waitForOpen(ws: WebSocket, timeoutMs = 5000): Promise<void> {
  if (ws.readyState === WebSocket.OPEN) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WebSocket open timeout")), timeoutMs);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("WebSocket error"));
    });
  });
}

function collectEvents(
  ws: WebSocket,
  untilType: string,
  timeoutMs = 15_000,
): Promise<Array<Record<string, unknown>>> {
  return new Promise((resolve, reject) => {
    const events: Array<Record<string, unknown>> = [];
    const timer = setTimeout(
      () => reject(new Error(`timeout waiting for ${untilType}`)),
      timeoutMs,
    );
    const onMessage = (event: MessageEvent) => {
      const raw = typeof event.data === "string" ? event.data : String(event.data);
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return;
      }
      events.push(parsed);
      if (parsed.type === untilType || parsed.type === "error") {
        clearTimeout(timer);
        ws.removeEventListener("message", onMessage);
        resolve(events);
      }
    };
    ws.addEventListener("message", onMessage);
  });
}

describe("responses websocket bridge", () => {
  test("upgrade on /v1/responses succeeds (no HTTP 404)", async () => {
    const stateDir = await mkdtemp(join(tmpdir(), "codex-ws-"));
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://127.0.0.1:9",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "state.json"),
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: { message: "unused" } }), { status: 500 }),
    });
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("expected tcp address");
      const ws = new WebSocket(`ws://127.0.0.1:${address.port}/v1/responses`);
      await waitForOpen(ws);
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  test("response.create streams SSE-equivalent events over the socket", async () => {
    const stateDir = await mkdtemp(join(tmpdir(), "codex-ws-"));
    const completed = {
      id: "resp_ws_test_1",
      object: "response",
      status: "completed",
      output: [
        {
          type: "message",
          id: "msg_1",
          role: "assistant",
          content: [{ type: "output_text", text: "pong" }],
        },
      ],
    };
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://127.0.0.1:9",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "state.json"),
      fetchImpl: async () =>
        new Response(JSON.stringify(completed), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("expected tcp address");
      const ws = new WebSocket(`ws://127.0.0.1:${address.port}/v1/responses`);
      await waitForOpen(ws);
      ws.send(
        JSON.stringify({
          type: "response.create",
          model: "baseline.remote-only",
          store: false,
          input: [
            {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: "ping" }],
            },
          ],
        }),
      );
      const events = await collectEvents(ws, "response.completed");
      expect(events.some((e) => e.type === "error")).toBe(false);
      const done = events.find((e) => e.type === "response.completed");
      expect(done).toBeTruthy();
      const response = done?.response as { id?: string; output?: unknown[] } | undefined;
      expect(response?.id).toBeTruthy();
      ws.close();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  test("previous_response_id continues from connection-local cache", async () => {
    const stateDir = await mkdtemp(join(tmpdir(), "codex-ws-"));
    let hop = 0;
    const server = await startForwarder({
      listenPort: 0,
      upstreamEndpoint: "http://127.0.0.1:9",
      aliasIds: new Set(["baseline.remote-only"]),
      stateFilePath: join(stateDir, "state.json"),
      fetchImpl: async (_url, init) => {
        hop += 1;
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          input?: unknown[];
          previous_response_id?: string;
        };
        expect(body.previous_response_id).toBeUndefined();
        if (hop === 1) {
          expect(Array.isArray(body.input) && body.input.length).toBeGreaterThan(0);
          return new Response(
            JSON.stringify({
              id: "resp_ws_chain_1",
              object: "response",
              status: "completed",
              output: [
                {
                  type: "function_call",
                  id: "fc_1",
                  call_id: "call_1",
                  name: "shell_command",
                  arguments: '{"command":"echo hi"}',
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        // Second hop should include prior input + output + new tool result.
        expect(Array.isArray(body.input) && body.input.length).toBeGreaterThanOrEqual(3);
        return new Response(
          JSON.stringify({
            id: "resp_ws_chain_2",
            object: "response",
            status: "completed",
            output: [
              {
                type: "message",
                id: "msg_2",
                role: "assistant",
                content: [{ type: "output_text", text: "done" }],
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("expected tcp address");
      const ws = new WebSocket(`ws://127.0.0.1:${address.port}/v1/responses`);
      await waitForOpen(ws);
      ws.send(
        JSON.stringify({
          type: "response.create",
          model: "baseline.remote-only",
          store: false,
          tools: [{ type: "function", name: "shell_command", parameters: { type: "object" } }],
          input: [
            {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: "run echo" }],
            },
          ],
        }),
      );
      const first = await collectEvents(ws, "response.completed");
      const firstDone = first.find((e) => e.type === "response.completed");
      const firstId = (firstDone?.response as { id?: string } | undefined)?.id;
      expect(firstId).toBeTruthy();

      ws.send(
        JSON.stringify({
          type: "response.create",
          model: "baseline.remote-only",
          store: false,
          previous_response_id: firstId,
          tools: [{ type: "function", name: "shell_command", parameters: { type: "object" } }],
          input: [
            {
              type: "function_call_output",
              call_id: "call_1",
              output: "hi",
            },
          ],
        }),
      );
      const second = await collectEvents(ws, "response.completed");
      expect(second.some((e) => e.type === "error")).toBe(false);
      expect(hop).toBe(2);
      ws.close();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
