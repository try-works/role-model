import { Effect, Exit, Layer, Scope } from "effect";
import { describe, expect, test } from "vitest";

import { composeR27HostLayer, R27_RESOURCE_IDS } from "../src/r27-layer-dag.js";
import { composeReadinessOwner } from "../src/composition-dag.js";

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
    await Effect.runPromise(Layer.buildWithScope(composeR27HostLayer({ events, readiness }), scope));
    expect(readiness.ready()).toBe(true);
    const acquired = events.filter((event) => event.startsWith("acquire:")).map((event) => event.slice("acquire:".length));
    expect(acquired).toEqual(["readiness", "providerPermits", "backend", "bootstrap", "refresh", "drains", "benchmarks", "server", "cli", "host"]);
    expect(events).toContain("ready");
    await Effect.runPromise(Scope.close(scope, Exit.void));
    const released = events.filter((event) => event.startsWith("release:")).map((event) => event.slice("release:".length));
    expect(released).toEqual([...acquired].reverse());
  });

  test("a failing DAG acquisition rejects, aborting startup", async () => {
    const events: string[] = [];
    const scope = Effect.runSync(Scope.make());
    await expect(
      Effect.runPromise(Layer.buildWithScope(composeR27HostLayer({ events, failOn: "benchmarks", readiness: composeReadinessOwner() }), scope)),
    ).rejects.toThrow(/r27 layer acquisition failed: benchmarks/);
    const acquired = events.filter((event) => event.startsWith("acquire:")).map((event) => event.slice("acquire:".length));
    expect(acquired).toContain("drains");
    expect(acquired).not.toContain("server");
    await Effect.runPromise(Scope.close(scope, Exit.void)).catch(() => undefined);
  });

  test("the resource id set covers every acquired non-leaf node", () => {
    for (const id of ["providerPermits", "backend", "bootstrap", "refresh", "drains", "benchmarks", "server", "cli"]) {
      expect(R27_RESOURCE_IDS).toContain(id);
    }
  });
});
