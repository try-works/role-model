import { describe, expect, it } from "vitest";
import { createHostRuntimeScope } from "../src/host-runtime-scope.js";

describe("S94a host runtime scope", () => {
  it("uses release order, not registration order", async () => {
    const events: string[] = [];
    const scope = createHostRuntimeScope();
    scope.register("extensionRuntime", async () => { events.push("extension"); });
    scope.register("server", async () => { events.push("server"); });
    scope.register("backend", async () => { events.push("backend"); });
    const result = await scope.close();
    expect(events).toEqual(["server", "backend", "extension"]);
    expect(result.released).toEqual(["server", "backend", "extension"]);
  });

  it("throws on duplicate live registration and does not overwrite", async () => {
    const events: string[] = [];
    const scope = createHostRuntimeScope();
    scope.register("server", async () => { events.push("first"); });
    expect(() => scope.register("server", async () => { events.push("second"); })).toThrow(/already registered/);
    await scope.close();
    expect(events).toEqual(["first"]);
  });

  it("closes idempotently", async () => {
    const events: string[] = [];
    const scope = createHostRuntimeScope();
    scope.register("server", async () => { events.push("server"); });
    await scope.close();
    const second = await scope.close();
    expect(events).toEqual(["server"]);
    expect(second).toEqual({ errors: [], released: [] });
  });

  it("releases the rest and reports a throwing closer", async () => {
    const events: string[] = [];
    const scope = createHostRuntimeScope();
    scope.register("server", async () => { events.push("server"); throw new Error("server boom"); });
    scope.register("backend", async () => { events.push("backend"); });
    const result = await scope.close();
    expect(events).toEqual(["server", "backend"]);
    expect(result.errors.map((error) => error.step)).toEqual(["server"]);
  });

  it("skips unregistered resources", async () => {
    const events: string[] = [];
    const scope = createHostRuntimeScope();
    scope.register("extensionRuntime", async () => { events.push("extension"); });
    const result = await scope.close();
    expect(events).toEqual(["extension"]);
    expect(result.released).toEqual(["extension"]);
    expect(result.errors).toEqual([]);
  });
});
