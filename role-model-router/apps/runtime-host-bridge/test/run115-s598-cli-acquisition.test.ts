import { Effect, Exit, Layer, Scope } from "effect";
import { describe, expect, test } from "vitest";

import { composeReadinessOwner } from "../src/composition-dag.js";
import {
  type R27HostContract,
  R27_RESOURCE_IDS,
  closeR27HostScope,
  composeR27HostLayer,
} from "../src/r27-layer-dag.js";

/**
 * S598 (R27): CLI-level acquisition test. This mirrors the production sequence in cli.ts:
 * Scope.make() -> Layer.buildWithScope(composeR27HostLayer(...), scope) awaited BEFORE any other
 * resource exists -> readiness marked by the host leaf -> Scope.close at shutdown. A failed
 * acquisition rejects, which aborts host startup in production.
 */
describe("S598 R27 production acquisition", () => {
  test("acquires the closed DAG in order, marks readiness from the host leaf, and releases in reverse", async () => {
    const events: string[] = [];
    const readiness = composeReadinessOwner();
    const scope = Effect.runSync(Scope.make());
    await Effect.runPromise(
      Layer.buildWithScope(composeR27HostLayer({ events, readiness }), scope),
    );
    expect(readiness.ready()).toBe(true);
    const acquired = events
      .filter((event) => event.startsWith("acquire:"))
      .map((event) => event.slice("acquire:".length));
    expect(acquired).toEqual([
      "readiness",
      "providerPermits",
      "backend",
      "bootstrap",
      "refresh",
      "drains",
      "benchmarks",
      "server",
      "cli",
      "host",
    ]);
    expect(events).toContain("ready");
    await Effect.runPromise(Scope.close(scope, Exit.void));
    const released = events
      .filter((event) => event.startsWith("release:"))
      .map((event) => event.slice("release:".length));
    expect(released).toEqual([...acquired].reverse());
  });

  test("a failing DAG acquisition rejects, aborting startup", async () => {
    const events: string[] = [];
    const scope = Effect.runSync(Scope.make());
    await expect(
      Effect.runPromise(
        Layer.buildWithScope(
          composeR27HostLayer({ events, failOn: "benchmarks", readiness: composeReadinessOwner() }),
          scope,
        ),
      ),
    ).rejects.toThrow(/r27 layer acquisition failed: benchmarks/);
    const acquired = events
      .filter((event) => event.startsWith("acquire:"))
      .map((event) => event.slice("acquire:".length));
    expect(acquired).toContain("drains");
    expect(acquired).not.toContain("server");
    await Effect.runPromise(Scope.close(scope, Exit.void)).catch(() => undefined);
  });

  test("the resource id set covers every acquired non-leaf node", () => {
    for (const id of [
      "providerPermits",
      "backend",
      "bootstrap",
      "refresh",
      "drains",
      "benchmarks",
      "server",
      "cli",
    ]) {
      expect(R27_RESOURCE_IDS).toContain(id);
    }
  });

  test("a DAG node owns its acquired resource (host exposes the server handle) and release closes it", async () => {
    const events: string[] = [];
    let host: R27HostContract | undefined;
    let serverClosed = 0;
    const scope = Effect.runSync(Scope.make());
    await Effect.runPromise(
      Layer.buildWithScope(
        composeR27HostLayer({
          events,
          onHost: (value) => {
            host = value;
          },
          acquire: {
            server: async () => ({
              handle: {
                close: async () => {
                  serverClosed += 1;
                },
                kind: "bridge-server",
              },
              release: async () => {
                serverClosed += 1;
                events.push("release:server-handle");
              },
            }),
          },
          readiness: composeReadinessOwner(),
        }),
        scope,
      ),
    );
    expect(host?.handles.server?.handle).toMatchObject({ kind: "bridge-server" });
    expect(typeof (host?.handles.server?.handle as { close?: unknown }).close).toBe("function");
    expect(events).toContain("acquire:server");
    await closeR27HostScope(scope);
    expect(serverClosed).toBe(1);
    await closeR27HostScope(scope);
    expect(serverClosed).toBe(1);
  });

  test("a failed resource build aborts startup before later nodes acquire", async () => {
    const events: string[] = [];
    const scope = Effect.runSync(Scope.make());
    await expect(
      Effect.runPromise(
        Layer.buildWithScope(
          composeR27HostLayer({
            events,
            readiness: composeReadinessOwner(),
            acquire: {
              server: async () => {
                throw new Error("server resource build failed");
              },
            },
          }),
          scope,
        ),
      ),
    ).rejects.toThrow(/server resource build failed/);
    expect(events).not.toContain("acquire:server");
    expect(events).not.toContain("acquire:cli");
    expect(events).not.toContain("ready");
    await Effect.runPromise(Scope.close(scope, Exit.void)).catch(() => undefined);
  });
  test("a fail-after-server host error releases the acquired server scope", async () => {
    const events: string[] = [];
    let serverClosed = 0;
    const scope = Effect.runSync(Scope.make());
    await expect(
      Effect.runPromise(
        Layer.buildWithScope(
          composeR27HostLayer({
            events,
            failAfter: "server",
            readiness: composeReadinessOwner(),
            acquire: {
              server: async () => ({
                handle: {
                  close: async () => {
                    serverClosed += 1;
                  },
                  kind: "bridge-server",
                },
                release: async () => {
                  serverClosed += 1;
                },
              }),
            },
          }),
          scope,
        ),
      ),
    ).rejects.toThrow(/r27 host acquisition failed after server/);
    await closeR27HostScope(scope).catch(() => undefined);
    expect(serverClosed).toBe(1);
    expect(events).toContain("acquire:server");
    expect(events).not.toContain("ready");
  });
});
