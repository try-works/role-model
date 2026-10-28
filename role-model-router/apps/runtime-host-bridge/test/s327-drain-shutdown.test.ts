import { describe, expect, test } from "vitest";

import {
  composeBackendOwner,
  composeServerOwner,
  DrainTimeoutError,
  type ServerTransport,
  type ShutdownDrain,
} from "../src/composition-dag.js";

/** S327 (R27 Drain): registered drains run in the shutdown phase between join and interrupt, bounded and release-all. */

const fakeBackend = () => ({ effectiveRegistry: { diagnostics: [], endpoints: [], lifecycleSummary: { active: 0, degraded: 0, offline: 0 } } });

const makeBackend = () => composeBackendOwner({
  closeBackend: async () => {},
  // SAFETY: test-only structural cast required by the composer input types.
  emptyCatalog: { catalogVersion: "1", source: {} } as never,
  // SAFETY: test-only structural cast required by the composer input types.
  emptyRegistry: { diagnostics: [], endpoints: [], lifecycleSummary: { active: 0, degraded: 0, offline: 0 } } as never,
  host: "127.0.0.1",
  overrides: {},
  port: 0,
  projectCliStartupReadiness: (state) => state,
  readBootstrapState: () => ({ status: "ready" }),
  resolveBackend: () => fakeBackend(),
});

const makeTransport = (order: string[]): ServerTransport => ({
  close: async () => { order.push("transport-close"); },
  createListener: () => () => {},
  createServer: () => ({ handle: true }),
  interrupt: () => { order.push("interrupt"); },
  join: async () => { order.push("join"); },
  listen: async () => 7777,
  stopAccepting: async () => { order.push("stop-accepting"); },
});

describe("S327 drain shutdown phase", () => {
  test("drains join between join and interrupt; a hung drain is bounded and later releases still run", async () => {
    const order: string[] = [];
    const hangs: ShutdownDrain = { name: "hung-drain", run: () => new Promise<void>(() => { order.push("drain-hung"); }), timeoutMs: 15 };
    const drains: ShutdownDrain[] = [
      { name: "replay", run: () => { order.push("drain-replay"); }, timeoutMs: 50 },
      hangs,
      { name: "outbox", run: async () => { order.push("drain-outbox"); }, timeoutMs: 50 },
    ];
    const server = composeServerOwner({ backend: makeBackend(), drains, handlerFactory: () => async () => {}, transport: makeTransport(order) });
    await server.start();
    await expect(server.shutdown()).rejects.toBeInstanceOf(AggregateError);
    expect(order).toEqual(["stop-accepting", "join", "drain-replay", "drain-hung", "drain-outbox", "interrupt", "transport-close"]);
    const failure = await server.shutdown().catch((error: unknown) => error);
    const aggregate = failure instanceof AggregateError ? failure : undefined;
    expect(aggregate?.errors.some((entry) => entry instanceof DrainTimeoutError && entry.drain === "hung-drain")).toBe(true);
  });

  test("a failing drain does not skip later drains or releases (release-all)", async () => {
    const order: string[] = [];
    const drains: ShutdownDrain[] = [
      { name: "first", run: async () => { order.push("drain-first"); throw new Error("drain failed"); } },
      { name: "second", run: async () => { order.push("drain-second"); } },
    ];
    const server = composeServerOwner({ backend: makeBackend(), drains, handlerFactory: () => async () => {}, transport: makeTransport(order) });
    await server.start();
    await expect(server.shutdown()).rejects.toBeInstanceOf(AggregateError);
    expect(order).toEqual(["stop-accepting", "join", "drain-first", "drain-second", "interrupt", "transport-close"]);
  });

  test("production cli registers the drain phase steps (source wiring)", async () => {
    const { readFileSync } = await import("node:fs");
    const cli = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
    const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
    expect(cli).toContain("queueRuntime?.stop()");
    expect(cli).toContain("evaluationQueueRuntime?.stop()");
    expect(cli).toContain("learnerDeriveQueueRuntime?.stop()");
    expect(cli).toContain("learnerPromoteQueueRuntime?.stop()");
    expect(cli).toContain("drainDeferredRouteCapture");
    expect(cli).toContain("drains:");
    expect(index).toContain("drainDeferredRouteCapture");
  });
});
