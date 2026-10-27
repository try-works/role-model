import { describe, expect, test } from "vitest";

import { startBridgeServer } from "../src/index.js";
import {
  assertComposedServerOwner,
  composeServerOwner,
  testSeamBackendOwner,
  isComposedServerOwner,
  type ServerTransport,
} from "../src/composition-dag.js";

/**
 * S313 (R27): the DAG Server owner is the ONE lifecycle construction site. The facade startBridgeServer composes it
 * for every caller (plain options included), the serving listener/server comes from the owner's transport, and a
 * legacy local listen/close construction is refused.
 */

type Captured = {
  listener: object | undefined;
  listenerFactoryOptions: unknown;
  server: object | undefined;
};

type FakeTransport = {
  readonly transport: ServerTransport;
  readonly calls: string[];
  readonly captured: Captured;
};

const makeTransport = (): FakeTransport => {
  const calls: string[] = [];
  const captured: Captured = { listener: undefined, listenerFactoryOptions: undefined, server: undefined };
  const transport: ServerTransport = {
    createListener: (options) => {
      calls.push("createListener");
      captured.listenerFactoryOptions = options;
      const listener = (): void => {};
      captured.listener = listener;
      return listener;
    },
    createServer: (listener) => {
      calls.push("createServer");
      captured.server = { closing: false };
      return captured.server;
    },
    listen: async (_server, _host, _port) => {
      calls.push("listen");
      return 4242;
    },
    close: async (server) => {
      calls.push("close");
      captured.server = server;
    },
  };
  return { calls, captured, transport };
};

const handlerFactory = () => async () => {};

describe("S313 DAG Server owner", () => {
  test("composeServerOwner builds the listener/server through the transport and owns close ordering", async () => {
    const fake = makeTransport();
    // SAFETY: the plain options start the server through the DAG facade; only host/port are read here.
    const backend = testSeamBackendOwner({ host: "127.0.0.1", port: 0 } as never);
    const owner = composeServerOwner({ backend, handlerFactory, transport: fake.transport });
    expect(isComposedServerOwner(owner)).toBe(true);
    const started = await owner.start();
    expect(fake.calls).toEqual(["createListener", "createServer", "listen"]);
    expect(started.port).toBe(4242);
    await started.close();
    expect(fake.calls).toEqual(["createListener", "createServer", "listen", "close"]);
    expect(fake.captured.listener).toBeDefined();
    expect(fake.captured.server).toBeDefined();
    expect(() => assertComposedServerOwner({ id: "legacy" })).toThrow();
  });

  test("facade startBridgeServer composes the DAG Server owner; no local listen/lifecycle path exists", async () => {
    const fake = makeTransport();
    let capturedOwner: unknown;
    // SAFETY: the facade brands these plain options as a DAG backend owner; only host/port are read here.
    // SAFETY: this is the explicit test seam; production never passes allowTestSeamBackend.
    const server = await startBridgeServer({ host: "127.0.0.1", port: 0 } as never, {
      allowTestSeamBackend: true,
      handlerFactory,
      onServerOwner: (owner) => {
        capturedOwner = owner;
      },
      transport: fake.transport,
    });
    expect(capturedOwner).toBe(server.serverOwner);
    expect(isComposedServerOwner(server.serverOwner)).toBe(true);
    expect(fake.calls).toEqual(["createListener", "createServer", "listen"]);
    await server.close();
    expect(fake.calls).toEqual(["createListener", "createServer", "listen", "close"]);
    const legacy = { builtHere: true };
    expect(() => assertComposedServerOwner(legacy)).toThrow();
  });

  test("facade threads the real composed BackendOwner: serverOwner.backend === composedBackendOwner", async () => {
    const fake = makeTransport();
    const { composeBackendOwner } = await import("../src/composition-dag.js");
    // SAFETY: the empty registry/catalog are only structural inputs; the composed owner is the identity under test.
    const composed = composeBackendOwner({
      emptyCatalog: { catalogVersion: "1", source: {} } as never,
      emptyRegistry: { diagnostics: [], endpoints: [], lifecycleSummary: { active: 0, degraded: 0, offline: 0 } } as never,
      host: "127.0.0.1",
      overrides: {},
      port: 0,
      projectCliStartupReadiness: (state) => state,
      readBootstrapState: () => ({ status: "ready" }),
      resolveBackend: () => ({ effectiveRegistry: { diagnostics: [], endpoints: [], lifecycleSummary: { active: 0, degraded: 0, offline: 0 } } }),
    });
    const server = await startBridgeServer(composed.options, { handlerFactory, transport: fake.transport });
    expect(server.serverOwner?.backend).toBe(composed);
  });

  test("a plain-options owner injected as the backend is refused (legacy brand bypass gone)", async () => {
    const fake = makeTransport();
    const { composeBackendOwner } = await import("../src/composition-dag.js");
    // SAFETY: minimal structural inputs for the composed owner under test.
    const composed = composeBackendOwner({
      emptyCatalog: { catalogVersion: "1", source: {} } as never,
      emptyRegistry: { diagnostics: [], endpoints: [], lifecycleSummary: { active: 0, degraded: 0, offline: 0 } } as never,
      host: "127.0.0.1",
      overrides: {},
      port: 0,
      projectCliStartupReadiness: (state) => state,
      readBootstrapState: () => ({ status: "ready" }),
      resolveBackend: () => ({ effectiveRegistry: { diagnostics: [], endpoints: [], lifecycleSummary: { active: 0, degraded: 0, offline: 0 } } }),
    });
    // SAFETY: the legacy owner is a plain object; the cast only feeds the facade's backend input.
    const legacy = { id: "legacy-owner", options: composed.options } as never;
    await expect(startBridgeServer(composed.options, { backend: legacy, handlerFactory, transport: fake.transport }))
      .rejects.toThrow(/composition DAG/);
  });

  test("bare options are refused outside the explicit test seam (production-style path)", async () => {
    const fake = makeTransport();
    // SAFETY: a plain options object with no DAG-composed Backend owner; the facade must refuse it.
    const plainOptions = { host: "127.0.0.1", port: 0 } as never;
    await expect(startBridgeServer(plainOptions, { handlerFactory, transport: fake.transport }))
      .rejects.toThrow(/composeBackendOwner|test seam/);
  });
});