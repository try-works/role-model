import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { Duplex } from "node:stream";
import type { ForwarderOptions } from "./forwarder.js";
import { handleResponsesProxy } from "./forwarder.js";

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export interface CachedResponseState {
  readonly id: string;
  readonly input: unknown[];
  readonly output: unknown[];
  readonly model?: string;
  readonly tools?: unknown;
  readonly instructions?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function urlPath(req: IncomingMessage): string {
  return (req.url ?? "").split("?")[0] ?? "";
}

function acceptKey(secWebSocketKey: string): string {
  return createHash("sha1").update(`${secWebSocketKey}${WS_GUID}`).digest("base64");
}

function encodeTextFrame(text: string): Buffer {
  const payload = Buffer.from(text, "utf8");
  const len = payload.length;
  if (len < 126) {
    const frame = Buffer.alloc(2 + len);
    frame[0] = 0x81; // FIN + text
    frame[1] = len;
    payload.copy(frame, 2);
    return frame;
  }
  if (len < 65536) {
    const frame = Buffer.alloc(4 + len);
    frame[0] = 0x81;
    frame[1] = 126;
    frame.writeUInt16BE(len, 2);
    payload.copy(frame, 4);
    return frame;
  }
  const frame = Buffer.alloc(10 + len);
  frame[0] = 0x81;
  frame[1] = 127;
  frame.writeUInt32BE(0, 2);
  frame.writeUInt32BE(len, 6);
  payload.copy(frame, 10);
  return frame;
}

function encodeCloseFrame(code = 1000): Buffer {
  const frame = Buffer.alloc(4);
  frame[0] = 0x88;
  frame[1] = 2;
  frame.writeUInt16BE(code, 2);
  return frame;
}

class WsConnection {
  private buffer = Buffer.alloc(0);
  private closed = false;
  private busy = false;
  private readonly queue: string[] = [];
  private readonly cache = new Map<string, CachedResponseState>();
  private latestId: string | undefined;

  constructor(
    private readonly socket: Duplex,
    private readonly req: IncomingMessage,
    private readonly options: ForwarderOptions,
  ) {
    this.socket.on("data", (chunk: Buffer) => this.onData(chunk));
    this.socket.on("error", () => this.close());
    this.socket.on("close", () => {
      this.closed = true;
    });
  }

  sendJson(payload: unknown): void {
    if (this.closed) return;
    try {
      this.socket.write(encodeTextFrame(JSON.stringify(payload)));
    } catch {
      this.close();
    }
  }

  sendError(message: string, code = "invalid_request_error", status = 400): void {
    this.sendJson({
      type: "error",
      status,
      error: {
        type: "invalid_request_error",
        code,
        message,
      },
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.socket.write(encodeCloseFrame());
    } catch {
      // ignore
    }
    this.socket.destroy();
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const parsed = this.readFrame();
      if (!parsed) break;
      if (parsed.opcode === 0x8) {
        this.close();
        return;
      }
      if (parsed.opcode === 0x9) {
        // ping → pong
        const pong = Buffer.alloc(2 + parsed.payload.length);
        pong[0] = 0x8a;
        pong[1] = parsed.payload.length;
        parsed.payload.copy(pong, 2);
        this.socket.write(pong);
        continue;
      }
      if (parsed.opcode === 0xa) continue; // pong
      if (parsed.opcode !== 0x1) continue; // text only
      const text = parsed.payload.toString("utf8");
      void this.enqueue(text);
    }
  }

  private readFrame(): { opcode: number; payload: Buffer } | null {
    if (this.buffer.length < 2) return null;
    const b0 = this.buffer[0]!;
    const b1 = this.buffer[1]!;
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let offset = 2;
    if (len === 126) {
      if (this.buffer.length < 4) return null;
      len = this.buffer.readUInt16BE(2);
      offset = 4;
    } else if (len === 127) {
      if (this.buffer.length < 10) return null;
      const high = this.buffer.readUInt32BE(2);
      const low = this.buffer.readUInt32BE(6);
      if (high !== 0 || low > 0x7fffffff) {
        this.close();
        return null;
      }
      len = low;
      offset = 10;
    }
    const maskLen = masked ? 4 : 0;
    if (this.buffer.length < offset + maskLen + len) return null;
    let payload = this.buffer.subarray(offset + maskLen, offset + maskLen + len);
    if (masked) {
      const mask = this.buffer.subarray(offset, offset + 4);
      const unmasked = Buffer.alloc(len);
      for (let i = 0; i < len; i += 1) {
        unmasked[i] = payload[i]! ^ mask[i % 4]!;
      }
      payload = unmasked;
    }
    this.buffer = this.buffer.subarray(offset + maskLen + len);
    return { opcode, payload };
  }

  private async enqueue(text: string): Promise<void> {
    this.queue.push(text);
    if (this.busy) return;
    this.busy = true;
    try {
      while (this.queue.length > 0 && !this.closed) {
        const next = this.queue.shift()!;
        await this.handleMessage(next);
      }
    } finally {
      this.busy = false;
    }
  }

  private async handleMessage(text: string): Promise<void> {
    let message: unknown;
    try {
      message = JSON.parse(text);
    } catch {
      this.sendError("Invalid JSON in WebSocket message");
      return;
    }
    if (!isRecord(message)) {
      this.sendError("WebSocket message must be a JSON object");
      return;
    }

    const eventType = typeof message.type === "string" ? message.type : "";
    if (eventType !== "response.create") {
      this.sendError(`Unsupported WebSocket event type: ${eventType || "(missing)"}`);
      return;
    }

    const nested = isRecord(message.response) ? message.response : undefined;
    const createBody: Record<string, unknown> = {
      ...(nested ?? message),
    };
    delete createBody.type;
    delete createBody.response;

    if (createBody.generate === false) {
      this.handleWarmup(createBody);
      return;
    }

    const expanded = this.expandPreviousResponse(createBody);
    if (!expanded.ok) {
      this.sendJson(expanded.error);
      return;
    }

    // WebSocket mode always delivers streaming events on the socket.
    const payload: Record<string, unknown> = {
      ...expanded.payload,
      stream: true,
    };
    delete payload.previous_response_id;
    delete payload.generate;
    delete payload.background;

    const completed = await this.forwardCreate(payload);
    if (completed) {
      this.rememberCompleted(expanded.payload, completed);
    }
  }

  private handleWarmup(createBody: Record<string, unknown>): void {
    const id = `resp_ws_warm_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const input = Array.isArray(createBody.input) ? createBody.input : [];
    const response = {
      id,
      object: "response",
      created_at: Math.floor(Date.now() / 1000),
      status: "completed",
      model: typeof createBody.model === "string" ? createBody.model : undefined,
      output: [] as unknown[],
      store: createBody.store === true,
    };
    this.cache.set(id, {
      id,
      input,
      output: [],
      model: typeof createBody.model === "string" ? createBody.model : undefined,
      tools: createBody.tools,
      instructions: createBody.instructions,
    });
    this.latestId = id;
    this.sendJson({ type: "response.created", response: { ...response, status: "in_progress" } });
    this.sendJson({ type: "response.completed", response });
  }

  private expandPreviousResponse(
    createBody: Record<string, unknown>,
  ):
    | { ok: true; payload: Record<string, unknown> }
    | { ok: false; error: Record<string, unknown> } {
    const prevId =
      typeof createBody.previous_response_id === "string"
        ? createBody.previous_response_id
        : createBody.previous_response_id == null
          ? undefined
          : undefined;
    if (!prevId) {
      return { ok: true, payload: createBody };
    }

    const cached = this.cache.get(prevId) ?? (this.latestId === prevId ? this.cache.get(this.latestId) : undefined);
    if (!cached) {
      return {
        ok: false,
        error: {
          type: "error",
          status: 400,
          error: {
            code: "previous_response_not_found",
            message: `Previous response with id '${prevId}' not found.`,
            param: "previous_response_id",
          },
        },
      };
    }

    const newInput = Array.isArray(createBody.input) ? createBody.input : [];
    return {
      ok: true,
      payload: {
        ...createBody,
        model: createBody.model ?? cached.model,
        tools: createBody.tools ?? cached.tools,
        instructions: createBody.instructions ?? cached.instructions,
        input: [...cached.input, ...cached.output, ...newInput],
        previous_response_id: undefined,
      },
    };
  }

  private rememberCompleted(
    requestPayload: Record<string, unknown>,
    completedResponse: Record<string, unknown>,
  ): void {
    const id = typeof completedResponse.id === "string" ? completedResponse.id : undefined;
    if (!id) return;
    const requestInput = Array.isArray(requestPayload.input) ? requestPayload.input : [];
    const output = Array.isArray(completedResponse.output) ? completedResponse.output : [];
    this.cache.clear(); // connection-local: keep only latest
    this.cache.set(id, {
      id,
      input: requestInput,
      output,
      model:
        typeof completedResponse.model === "string"
          ? completedResponse.model
          : typeof requestPayload.model === "string"
            ? requestPayload.model
            : undefined,
      tools: requestPayload.tools,
      instructions: requestPayload.instructions,
    });
    this.latestId = id;
  }

  private async forwardCreate(payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    const body = Buffer.from(JSON.stringify(payload), "utf8");
    let completed: Record<string, unknown> | null = null;
    let sseBuffer = "";
    const connection = this;

    const mockReq = {
      method: "POST",
      url: "/v1/responses",
      headers: {
        ...Object.fromEntries(
          Object.entries(this.req.headers).filter(([key]) => key.toLowerCase() !== "content-encoding"),
        ),
        "content-type": "application/json",
        "content-length": String(body.length),
      },
      on(event: string, listener: (...args: unknown[]) => void) {
        if (event === "data") {
          queueMicrotask(() => listener(body));
        } else if (event === "end") {
          queueMicrotask(() => listener());
        }
        return mockReq;
      },
      once(event: string, listener: (...args: unknown[]) => void) {
        return mockReq.on(event, listener);
      },
    } as unknown as IncomingMessage;

    const mockRes: {
      statusCode: number;
      headersSent: boolean;
      setHeader: () => void;
      writeHead: (statusCode: number) => void;
      write: (chunk: unknown) => boolean;
      end: (chunk?: unknown) => void;
    } = {
      statusCode: 200,
      headersSent: false,
      setHeader() {
        // ignore; WS does not use HTTP response headers
      },
      writeHead(statusCode: number) {
        mockRes.statusCode = statusCode;
        mockRes.headersSent = true;
      },
      write(chunk: unknown) {
        const text =
          typeof chunk === "string"
            ? chunk
            : Buffer.isBuffer(chunk)
              ? chunk.toString("utf8")
              : String(chunk);
        sseBuffer += text;
        const extracted = flushSseEvents(sseBuffer);
        sseBuffer = extracted.rest;
        for (const event of extracted.events) {
          connection.sendJson(event);
          if (event.type === "response.completed" && isRecord(event.response)) {
            completed = event.response;
          }
          if (event.type === "response.failed" && isRecord(event.response)) {
            const failedId =
              typeof event.response.id === "string" ? event.response.id : undefined;
            if (failedId) connection.cache.delete(failedId);
            if (connection.latestId === failedId) connection.latestId = undefined;
          }
        }
        return true;
      },
      end(chunk?: unknown) {
        if (chunk !== undefined && chunk !== null) mockRes.write(chunk);
        if (sseBuffer.trim()) {
          const extracted = flushSseEvents(`${sseBuffer}\n\n`);
          for (const event of extracted.events) {
            connection.sendJson(event);
            if (event.type === "response.completed" && isRecord(event.response)) {
              completed = event.response;
            }
          }
        }
        if (!completed && sseBuffer.trim() && !sseBuffer.includes("data:")) {
          try {
            const parsed = JSON.parse(sseBuffer) as unknown;
            if (isRecord(parsed) && parsed.error) {
              connection.sendJson({
                type: "error",
                status: mockRes.statusCode || 502,
                error: parsed.error,
              });
            } else if (isRecord(parsed) && typeof parsed.id === "string") {
              completed = parsed;
              connection.sendJson({ type: "response.completed", response: parsed });
            }
          } catch {
            connection.sendError(
              `Upstream returned non-event payload (HTTP ${mockRes.statusCode})`,
              "server_error",
              mockRes.statusCode || 502,
            );
          }
        }
      },
    };

    try {
      await handleResponsesProxy(mockReq, mockRes as unknown as ServerResponse, this.options);
    } catch (error) {
      this.sendError(
        error instanceof Error ? error.message : String(error),
        "server_error",
        502,
      );
      return null;
    }
    return completed;
  }
}

function flushSseEvents(buffer: string): {
  rest: string;
  events: Array<Record<string, unknown>>;
} {
  const events: Array<Record<string, unknown>> = [];
  let rest = buffer;
  while (true) {
    const sep = rest.indexOf("\n\n");
    if (sep < 0) break;
    const block = rest.slice(0, sep);
    rest = rest.slice(sep + 2);
    const dataLines = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart());
    if (dataLines.length === 0) continue;
    const data = dataLines.join("\n");
    if (data === "[DONE]") continue;
    try {
      const parsed = JSON.parse(data) as unknown;
      if (isRecord(parsed)) events.push(parsed);
    } catch {
      // ignore malformed SSE chunks
    }
  }
  return { rest, events };
}

export function attachResponsesWebSocket(server: Server, options: ForwarderOptions): void {
  server.on("upgrade", (req, socket, head) => {
    const path = urlPath(req);
    if (path !== "/v1/responses" && path !== "/responses") {
      socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 9\r\n\r\nNot found");
      socket.destroy();
      return;
    }

    const key = req.headers["sec-websocket-key"];
    if (typeof key !== "string" || !key) {
      socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    const accept = acceptKey(key);
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${accept}\r\n` +
        "\r\n",
    );
    if (head.length > 0) {
      socket.unshift(head);
    }
    new WsConnection(socket, req, options);
  });
}
