import { describe, expect, test } from "vitest";

import {
  composeBackendOwner,
  composeReadinessOwner,
  composeServerOwner,
  isComposedReadiness,
  startupReadinessRefusalBody,
  type ServerAdmissionReadiness,
  type ServerTransport,
} from "../src/composition-dag.js";

type TestRequest = { method?: string; url?: string };
type TestResponse = { writeHead: (status: number, headers: Record<string, string>) => void; end?: (body?: string) => void };
type Captured = { listener?: (request: TestRequest, response: TestResponse) => Promise<void> };

/**
 * S324 (R27 early readiness): the DAG owns the bootstrap readiness transition (pending -> ready | failed)
 * and the Server refuses/defer admission while not ready, with the exact existing 503 readback shape.
 */

const fakeBackend = () => ({ effectiveRegistry: { diagnostics: [], endpoints: [], lifecycleSummary: { active: 0, degraded: 0, offline: 0 } } });

const makeBackend = (readiness?: ServerAdmissionReadiness) =>
  composeBackendOwner({
    // SAFETY: test-only cast required by the transport/composer input types.
    emptyCatalog: { catalogVersion: "1", source: {} } as never,
    // SAFETY: test-only cast required by the transport/composer input types.
    emptyRegistry: { diagnostics: [], endpoints: [], lifecycleSummary: { active: 0, degraded: 0, offline: 0 } } as never,
    host: "127.0.0.1",
    overrides: {},
    port: 0,
    projectCliStartupReadiness: (state) => state,
    readBootstrapState: () => ({ status: "ready" }),
    resolveBackend: () => fakeBackend(),
  });

type Captured = { listener?: (request: TestRequest, response: TestResponse) => Promise<void> };

const makeTransport = (captured: Captured = {}): ServerTransport => ({
  close: async () => {},
  createListener: (_options, factory) => {
    const handler = factory(_options);
    // SAFETY: test-only cast required by the transport/composer input types.
    captured.listener = handler as (request: TestRequest, response: TestResponse) => Promise<void>;
    // SAFETY: test-only cast required by the transport/composer input types.
    return handler as never;
  },
  createServer: () => ({ handle: true }),
  listen: async () => 4242,
});

const makeResponse = () => {
    // SAFETY: test-only cast required by the transport/composer input types.
  const out = { status: 0, body: "", headers: {} as Record<string, string> };
  return {
    out,
    response: {
      end: (body?: string) => { if (body !== undefined) out.body = body; },
      writeHead: (status: number, headers: Record<string, string>) => { out.status = status; out.headers = headers; },
    },
  };
};

describe("S324 early readiness owner and admission gate", () => {
  test("pending -> ready transition", () => {
    const readiness = composeReadinessOwner();
    expect(readiness.state().status).toBe("pending");
    expect(readiness.ready()).toBe(false);
    readiness.markReady();
    expect(readiness.state().status).toBe("ready");
    expect(readiness.ready()).toBe(true);
  });

  test("pending -> failed transition carries the message and never becomes ready", () => {
    const readiness = composeReadinessOwner();
    readiness.markFailed("bootstrap exploded");
    expect(readiness.state()).toEqual({ message: "bootstrap exploded", status: "failed" });
    readiness.markReady();
    expect(readiness.state().status).toBe("failed");
  });

  test("server admission is refused with the existing 503 shape while pending, served after ready", async () => {
    const readiness = composeReadinessOwner();
    expect(isComposedReadiness(readiness)).toBe(true);
    // SAFETY: test-only cast required by the transport/composer input types.
    const captured = {} as Captured;
    let served = 0;
    const server = composeServerOwner({
      backend: makeBackend(),
      handlerFactory: () => async () => { served += 1; },
      readiness,
      transport: makeTransport(captured),
    });
    await server.start();
    const pending = makeResponse();
    await captured.listener!({ method: "POST", url: "/v1/chat/completions" }, pending.response);
    expect(pending.out.status).toBe(503);
    expect(JSON.parse(pending.out.body)).toEqual({ error: "runtime_initializing", status: "pending" });
    expect(served).toBe(0);
    readiness.markReady();
    const after = makeResponse();
    await captured.listener!({ method: "POST", url: "/v1/chat/completions" }, after.response);
    expect(served).toBe(1);
  });

  test("failed readiness is refused with the message and static UI assets stay allowed", async () => {
    const readiness = composeReadinessOwner();
    readiness.markFailed("boom");
    // SAFETY: test-only cast required by the transport/composer input types.
    const captured = {} as Captured;
    const server = composeServerOwner({
      backend: makeBackend(),
      handlerFactory: () => async () => {},
      readiness,
      transport: makeTransport(captured),
    });
    await server.start();
    const failed = makeResponse();
    await captured.listener!({ method: "POST", url: "/v1/chat" }, failed.response);
    expect(JSON.parse(failed.out.body)).toEqual({ error: "runtime_initializing", message: "boom", status: "failed" });
    // Without staticRoot the static-UI exemption does not apply (byte-for-byte parity with the host gate).
    const asset = makeResponse();
    await captured.listener!({ method: "GET", url: "/app.js" }, asset.response);
    expect(asset.out.status).toBe(503);
  });

  test("an unbranded readiness object fails closed (no fallback owner)", async () => {
    const server = composeServerOwner({
      backend: makeBackend(),
      handlerFactory: () => async () => {},
      readiness: { markFailed: () => {}, markReady: () => {}, ready: () => true, state: () => ({ status: "ready" }) },
      transport: makeTransport({}),
    });
    await expect(server.start()).rejects.toThrow(/composed readiness owner/);
  });

  test("readiness refusal bytes match the host gate exactly for pending/failed/ready", async () => {
    // SAFETY: test-only cast required by the transport/composer input types.
    const captured = {} as Captured;
    let served = 0;
    const readiness = composeReadinessOwner();
    const server = composeServerOwner({
      backend: makeBackend(),
      handlerFactory: () => async () => { served += 1; },
      readiness,
      transport: makeTransport(captured),
    });
    await server.start();
    const pending = makeResponse();
    await captured.listener!({ method: "POST", url: "/v1/chat" }, pending.response);
    expect(pending.out.status).toBe(503);
    expect(pending.out.headers["content-type"]).toBe("application/json");
    expect(pending.out.body).toBe('{"error":"runtime_initializing","status":"pending"}\n');
    expect(pending.out.body).toBe(startupReadinessRefusalBody({ status: "pending" }));
    readiness.markReady();
    const ready = makeResponse();
    await captured.listener!({ method: "POST", url: "/v1/chat" }, ready.response);
    expect(served).toBe(1);
    expect(ready.out.status).toBe(0);
    const failedReadiness = composeReadinessOwner();
    failedReadiness.markFailed("boom");
    // SAFETY: test-only cast required by the transport/composer input types.
    const failedCaptured = {} as Captured;
    const failedServer = composeServerOwner({
      backend: makeBackend(),
      handlerFactory: () => async () => {},
      readiness: failedReadiness,
      transport: makeTransport(failedCaptured),
    });
    await failedServer.start();
    const failed = makeResponse();
    await failedCaptured.listener!({ method: "POST", url: "/api/status" }, failed.response);
    expect(failed.out.body).toBe('{"error":"runtime_initializing","status":"failed","message":"boom"}\n');
    expect(failed.out.body).toBe(startupReadinessRefusalBody({ message: "boom", status: "failed" }));
    // Falsy message omits the field (host gate spread semantics), byte for byte.
    expect(startupReadinessRefusalBody({ message: "", status: "failed" })).toBe('{"error":"runtime_initializing","status":"failed"}\n');
  });

  test("failed readiness with staticRoot: static assets are SERVED while /api and /v1 return 503", async () => {
    // SAFETY: test-only cast required by the transport/composer input types.
    const captured = {} as Captured;
    const readiness = composeReadinessOwner();
    readiness.markFailed("maintenance");
    let served = 0;
    const server = composeServerOwner({
      backend: composeBackendOwner({
    // SAFETY: test-only cast required by the transport/composer input types.
        emptyCatalog: { catalogVersion: "1", source: {} } as never,
    // SAFETY: test-only cast required by the transport/composer input types.
        emptyRegistry: { diagnostics: [], endpoints: [], lifecycleSummary: { active: 0, degraded: 0, offline: 0 } } as never,
        host: "127.0.0.1",
        overrides: { staticRoot: "/tmp/role-model-ui" },
        port: 0,
        projectCliStartupReadiness: (state) => state,
        readBootstrapState: () => ({ status: "ready" }),
        resolveBackend: () => fakeBackend(),
      }),
      handlerFactory: () => async () => { served += 1; },
      readiness,
      transport: makeTransport(captured),
    });
    await server.start();
    const asset = makeResponse();
    await captured.listener!({ method: "GET", url: "/app.js" }, asset.response);
    expect(served).toBe(1);
    expect(asset.out.status).toBe(0);
    const api = makeResponse();
    await captured.listener!({ method: "GET", url: "/api/status" }, api.response);
    expect(api.out.status).toBe(503);
    const v1 = makeResponse();
    await captured.listener!({ method: "POST", url: "/v1/chat" }, v1.response);
    expect(v1.out.status).toBe(503);
  });
});