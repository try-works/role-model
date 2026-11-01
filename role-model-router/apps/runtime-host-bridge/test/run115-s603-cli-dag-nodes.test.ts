import { Effect, Exit, Layer, Scope } from "effect";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { composeReadinessOwner } from "../src/composition-dag.js";
import { composeR27HostLayer } from "../src/r27-layer-dag.js";

const cli = readFileSync(path.join(import.meta.dirname, "..", "src", "cli.ts"), "utf8");

describe("S603 CLI DAG nodes for remaining resources", () => {
  test("cli wires bootstrap, drains and benchmarks acquire factories", () => {
    expect(cli).toContain("bootstrap: async () =>");
    expect(cli).toContain("drains: async () =>");
    expect(cli).toContain("benchmarks: async () =>");
    expect(cli).toContain("backend/refresh remain records");
  });

  test("the three remaining nodes own handles and release on scope close", async () => {
    const events: string[] = [];
    let host: import("../src/r27-layer-dag.js").R27HostContract | undefined;
    const scope = Effect.runSync(Scope.make());
    const layer = composeR27HostLayer({
      events,
      readiness: composeReadinessOwner(),
      onHost: (value) => { host = value; },
      acquire: {
        bootstrap: async () => ({ handle: { kind: "bootstrap" }, release: async () => { events.push("release:bootstrap-handle"); } }),
        drains: async () => ({ handle: { kind: "drains" }, release: async () => { events.push("release:drains-handle"); } }),
        benchmarks: async () => ({ handle: { kind: "benchmarks" }, release: async () => { events.push("release:benchmarks-handle"); } }),
      },
    });
    await Effect.runPromise(Layer.buildWithScope(layer, scope));
    expect(host?.handles.bootstrap.handle).toMatchObject({ kind: "bootstrap" });
    expect(host?.handles.drains.handle).toMatchObject({ kind: "drains" });
    expect(host?.handles.benchmarks.handle).toMatchObject({ kind: "benchmarks" });
    await Effect.runPromise(Scope.close(scope, Exit.void));
    expect(events).toEqual(expect.arrayContaining(["release:benchmarks-handle", "release:drains-handle", "release:bootstrap-handle"]));
  });
});
