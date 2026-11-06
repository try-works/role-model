import { describe, expect, test } from "vitest";

import {
  type MetadataCacheValue,
  ServerJoinTimeoutError,
  type ServerTransport,
  composeBackendOwner,
  composeServerOwner,
  isComposedServerOwner,
  runReleaseAll,
  testSeamBackendOwner,
} from "../src/composition-dag.js";

/**
 * S321 (R27 partial shutdown): Server/Backend owners expose close/quiesce/join/interrupt; shutdown stops
 * admission, joins, interrupts, closes transport, then closes the Backend; every release runs even when an
 * earlier one fails (AggregateError, no early exit).
 */

const fakeBackend = () => ({
  effectiveRegistry: {
    diagnostics: [],
    endpoints: [],
    lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
  },
});

const makeComposedBackend = (order: string[], closeImpl?: () => Promise<void>) =>
  composeBackendOwner({
    closeBackend: closeImpl,
    // SAFETY: test-only structural cast required by the composer input types.
    emptyCatalog: { catalogVersion: "1", source: {} } as never,
    // SAFETY: test-only structural cast required by the composer input types.
    emptyRegistry: {
      diagnostics: [],
      endpoints: [],
      lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
    } as never,
    host: "127.0.0.1",
    overrides: {},
    port: 0,
    projectCliStartupReadiness: (state) => state,
    readBootstrapState: () => ({ status: "ready" }),
    resolveBackend: () => fakeBackend(),
  });

const makeTransport = (order: string[], failClose = false): ServerTransport => ({
  close: async () => {
    order.push("transport-close");
    if (failClose) throw new Error("transport close failed");
  },
  createListener: () => () => {},
  createServer: () => ({ handle: true }),
  interrupt: () => {
    order.push("interrupt");
  },
  join: async () => {
    order.push("join");
  },
  listen: async () => 4321,
  stopAccepting: async () => {
    order.push("stop-accepting");
  },
});

const handlerFactory = () => async () => {};

describe("S321 partial shutdown ordering", () => {
  test("release-all runs every release even when an earlier one fails (AggregateError, no early exit)", async () => {
    const order: string[] = [];
    const failing = async () => {
      order.push("first");
      throw new Error("first release failed");
    };
    await expect(
      runReleaseAll([
        failing,
        async () => {
          order.push("second");
        },
        async () => {
          order.push("third");
        },
      ]),
    ).rejects.toBeInstanceOf(AggregateError);
    expect(order).toEqual(["first", "second", "third"]);
  });

  test("server shutdown order: stop admission -> join -> interrupt -> close transport -> close backend", async () => {
    const order: string[] = [];
    const backend = makeComposedBackend(order, async () => {
      order.push("backend-close");
    });
    const server = composeServerOwner({ backend, handlerFactory, transport: makeTransport(order) });
    expect(isComposedServerOwner(server)).toBe(true);
    await server.start();
    await server.shutdown();
    expect(order).toEqual([
      "stop-accepting",
      "join",
      "interrupt",
      "transport-close",
      "backend-close",
    ]);
  });

  test("a failing dependency close does not skip later releases (backend close still runs)", async () => {
    const order: string[] = [];
    const backend = makeComposedBackend(order, async () => {
      order.push("backend-close");
    });
    const server = composeServerOwner({
      backend,
      handlerFactory,
      transport: makeTransport(order, true),
    });
    await server.start();
    await expect(server.shutdown()).rejects.toBeInstanceOf(AggregateError);
    expect(order).toContain("backend-close");
    expect(order.indexOf("backend-close")).toBeGreaterThan(order.indexOf("transport-close"));
  });

  test("the facade's server.close uses the DAG owner's ordered shutdown (identity)", async () => {
    const order: string[] = [];
    const backend = makeComposedBackend(order);
    const owner = composeServerOwner({ backend, handlerFactory, transport: makeTransport(order) });
    const started = await owner.start();
    await started.close();
    expect(order).toEqual(["stop-accepting", "join", "interrupt", "transport-close"]);
    expect(isComposedServerOwner(owner)).toBe(true);
  });

  test("facadeBackendOwner exposes no backend close (test seam only)", () => {
    // SAFETY: test-only structural cast required by the composer input types.
    const seam = testSeamBackendOwner({ host: "127.0.0.1", port: 0 } as never);
    expect(seam.close).toBeUndefined();
  });

  test("production backend close runs last and exactly once when DAG shutdown then hostScope close runs", async () => {
    const { onceClose } = await import("../src/composition-dag.js");
    let closes = 0;
    const closePackagedRuntimeOnce = onceClose(async () => {
      closes += 1;
    });
    const order: string[] = [];
    const backend = composeBackendOwner({
      closeBackend: async () => {
        await closePackagedRuntimeOnce();
        order.push("backend-close");
      },
      // SAFETY: test-only structural cast required by the composer input types.
      emptyCatalog: { catalogVersion: "1", source: {} } as never,
      // SAFETY: test-only structural cast required by the composer input types.
      emptyRegistry: {
        diagnostics: [],
        endpoints: [],
        lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
      } as never,
      host: "127.0.0.1",
      overrides: {},
      port: 0,
      projectCliStartupReadiness: (state) => state,
      readBootstrapState: () => ({ status: "ready" }),
      resolveBackend: () => fakeBackend(),
    });
    const transport = makeTransport(order);
    const server = composeServerOwner({ backend, handlerFactory, transport });
    await server.start();
    await server.shutdown();
    // simulates the later hostScope.close() release of the same packaged runtime resource
    await closePackagedRuntimeOnce();
    expect(order).toEqual([
      "stop-accepting",
      "join",
      "interrupt",
      "transport-close",
      "backend-close",
    ]);
    expect(closes).toBe(1);
  });

  test("production cli passes the idempotent backend close into the DAG owner (source wiring)", async () => {
    const { readFileSync } = await import("node:fs");
    const cli = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
    const start = cli.indexOf("const startServer = () =>");
    const end = cli.indexOf("};", cli.indexOf("return startBridgeServer(serverOptions", start));
    const region = cli.slice(start, end);
    expect(region).toContain("closePackagedRuntimeOnce");
    expect(cli).toContain("closeBackend?:");
    expect(cli).toContain("closeBackend,");
    expect(cli).toContain('hostScope.register("packagedRuntime"');
  });

  test("bounded join: a hung keep-alive connection does not block shutdown; interrupt runs after the bound", async () => {
    const { composeBackendOwner: composeBackend, onceClose } = await import(
      "../src/composition-dag.js"
    );
    const order: string[] = [];
    const backend = composeBackend({
      closeBackend: async () => {
        order.push("backend-close");
      },
      // SAFETY: test-only structural cast required by the composer input types.
      emptyCatalog: { catalogVersion: "1", source: {} } as never,
      // SAFETY: test-only structural cast required by the composer input types.
      emptyRegistry: {
        diagnostics: [],
        endpoints: [],
        lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
      } as never,
      host: "127.0.0.1",
      overrides: {},
      port: 0,
      projectCliStartupReadiness: (state) => state,
      readBootstrapState: () => ({ status: "ready" }),
      resolveBackend: () => fakeBackend(),
    });
    const hungTransport: ServerTransport = {
      close: async () => {
        order.push("transport-close");
      },
      createListener: () => () => {},
      createServer: () => ({ handle: true }),
      interrupt: () => {
        order.push("interrupt");
      },
      join: () =>
        new Promise<void>(() => {
          order.push("join");
        }),
      listen: async () => 9999,
      stopAccepting: async () => {
        order.push("stop-accepting");
      },
    };
    const server = composeServerOwner({
      backend,
      handlerFactory,
      joinTimeoutMs: 25,
      transport: hungTransport,
    });
    await server.start();
    const startedAt = Date.now();
    const failure: unknown = await server.shutdown().catch((error: Error) => error);
    expect(failure).toBeInstanceOf(AggregateError);
    const aggregate = failure instanceof AggregateError ? failure : undefined;
    expect(aggregate?.errors.some((entry) => entry instanceof ServerJoinTimeoutError)).toBe(true);
    expect(Date.now() - startedAt).toBeLessThan(2000);
    expect(order).toEqual([
      "stop-accepting",
      "join",
      "interrupt",
      "transport-close",
      "backend-close",
    ]);
  });

  test("packaged runtime Effect scope closes exactly once across DAG shutdown and hostScope close", async () => {
    const { onceClose } = await import("../src/composition-dag.js");
    const { Effect, Exit, Scope } = await import("effect");
    let finalizers = 0;
    const scope = Effect.runSync(Scope.make());
    await Effect.runPromise(
      Scope.addFinalizer(
        scope,
        Effect.sync(() => {
          finalizers += 1;
        }),
      ),
    );
    const closeScopeOnce = onceClose(async () => {
      await Effect.runPromise(Scope.close(scope, Exit.void));
    });
    await closeScopeOnce();
    await closeScopeOnce();
    expect(finalizers).toBe(1);
  });

  test("production cli closes the packaged SCOPE through the onceClose finalizer (source wiring)", async () => {
    const { readFileSync } = await import("node:fs");
    const cli = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
    expect(cli).toContain("closePackagedScopeRef.current = async");
    expect(cli).toContain("Scope.close(packagedScope");
    expect(cli).not.toContain("packagedRuntime.close()");
  });
});
