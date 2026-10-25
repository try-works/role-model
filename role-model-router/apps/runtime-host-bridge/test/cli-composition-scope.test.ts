import { createServer, type Server as NodeServer } from "node:http";
import { Effect } from "effect";
import { describe, expect, test } from "vitest";

import { makeHostRuntime, makeHostRuntimeServerFirst, type HostRuntimeFactories } from "../src/host-runtime-resource.js";

interface Backend { readonly id: "backend" }
interface Server { readonly node: NodeServer; readonly port: number }
interface Packaged { readonly id: "packaged" }

interface Options {
  readonly failPackaged?: boolean;
  readonly throwPackagedRelease?: boolean;
}

const factories = (
  events: string[],
  options: Options = {},
): HostRuntimeFactories<Backend, Server, Packaged> => ({
  acquireBackend: Effect.sync(() => {
    events.push("acquire:backend");
    return { id: "backend" as const };
  }),
  acquireServer: (_backend) =>
    Effect.tryPromise({
      catch: (error) => error,
      try: () =>
        new Promise<Server>((resolve, reject) => {
          const node = createServer((_request, response) => response.end("ok"));
          node.once("error", reject);
          node.listen(0, "127.0.0.1", () => {
            const address = node.address();
            const port = typeof address === "object" && address !== null ? address.port : 0;
            events.push("acquire:server");
            resolve({ node, port });
          });
        }),
    }),
  acquirePackagedRuntime: (_server, _backend) =>
    options.failPackaged
      ? Effect.fail(new Error("packaged runtime failed"))
      : Effect.sync(() => {
          events.push("acquire:packaged");
          return { id: "packaged" as const };
        }),
  releaseBackend: (_backend) =>
    Effect.sync(() => {
      events.push("release:backend");
    }),
  releaseServer: (server) =>
    Effect.tryPromise({
      catch: (error) => error,
      try: () =>
        new Promise<void>((resolve) => {
          server.node.close(() => {
            events.push("release:server");
            resolve();
          });
        }),
    }),
  releasePackagedRuntime: (_runtime) =>
    Effect.suspend(() => {
      events.push("release:packaged");
      return options.throwPackagedRelease
        ? Effect.die(new Error("packaged finalizer threw"))
        : Effect.void;
    }),
});

describe("s63a HostRuntimeResource (backend+server pair)", () => {
  test("server-first variant acquires server before backend and releases it last", async () => {
    const events: string[] = [];
    const backendFirst = factories(events);
    const host = await Effect.runPromise(
      makeHostRuntimeServerFirst({
        acquireBackend: backendFirst.acquireBackend,
        acquirePackagedRuntime: backendFirst.acquirePackagedRuntime,
        acquireServer: backendFirst.acquireServer({ id: "backend" }),
        releaseBackend: backendFirst.releaseBackend,
        releasePackagedRuntime: backendFirst.releasePackagedRuntime,
        releaseServer: backendFirst.releaseServer,
      }),
    );
    await Effect.runPromise(host.close);
    expect(events).toEqual([
      "acquire:server",
      "acquire:backend",
      "acquire:packaged",
      "release:packaged",
      "release:backend",
      "release:server",
    ]);
  });

  test("binds a real ephemeral port and closes packaged -> server -> backend", async () => {
    const events: string[] = [];
    const host = await Effect.runPromise(makeHostRuntime(factories(events)));
    expect(host.server.port).toBeGreaterThan(0);
    expect(host.server.node.listening).toBe(true);
    expect(events).toEqual(["acquire:backend", "acquire:server", "acquire:packaged"]);
    await Effect.runPromise(host.close);
    expect(events).toEqual([
      "acquire:backend",
      "acquire:server",
      "acquire:packaged",
      "release:packaged",
      "release:server",
      "release:backend",
    ]);
    expect(host.server.node.listening).toBe(false);
  });

  test("a failed packaged acquisition after bind closes the server once and the backend", async () => {
    const events: string[] = [];
    await expect(Effect.runPromise(makeHostRuntime(factories(events, { failPackaged: true })))).rejects.toThrow();
    expect(events).toEqual(["acquire:backend", "acquire:server", "release:server", "release:backend"]);
    expect(events.filter((event) => event === "release:server")).toHaveLength(1);
  });

  test("a throwing packaged finalizer still releases server and backend and surfaces the failure", async () => {
    const events: string[] = [];
    const host = await Effect.runPromise(makeHostRuntime(factories(events, { throwPackagedRelease: true })));
    await expect(Effect.runPromise(host.close)).rejects.toThrow();
    expect(events).toContain("release:packaged");
    expect(events).toContain("release:server");
    expect(events).toContain("release:backend");
    expect(events.indexOf("release:server")).toBeLessThan(events.indexOf("release:backend"));
  });

  test("a failed backend acquisition releases nothing, because nothing was acquired", async () => {
    const events: string[] = [];
    const failing: HostRuntimeFactories<Backend, Server, Packaged> = {
      acquireBackend: Effect.suspend(() => {
        events.push("acquire:backend");
        return Effect.fail(new Error("backend failed"));
      }),
      acquirePackagedRuntime: (_server, _backend) => Effect.sync(() => ({ id: "packaged" as const })),
      acquireServer: (_backend) =>
        Effect.sync(() => {
          events.push("acquire:server");
          return { node: createServer(), port: 0 };
        }),
      releaseBackend: (_backend) => Effect.sync(() => { events.push("release:backend"); }),
      releasePackagedRuntime: (_packaged) => Effect.sync(() => { events.push("release:packaged"); }),
      releaseServer: (_server) => Effect.sync(() => { events.push("release:server"); }),
    };
    await expect(Effect.runPromise(makeHostRuntime(failing))).rejects.toThrow();
    expect(events).toEqual(["acquire:backend"]);
  });

  test("a server that cannot bind releases the backend it already acquired", async () => {
    const events: string[] = [];
    const blocker = createServer();
    await new Promise<void>((resolve) => blocker.listen(0, "127.0.0.1", resolve));
    const address = blocker.address();
    const taken = typeof address === "object" && address !== null ? address.port : 0;
    const failing: HostRuntimeFactories<Backend, Server, Packaged> = {
      acquireBackend: Effect.sync(() => {
        events.push("acquire:backend");
        return { id: "backend" as const };
      }),
      acquirePackagedRuntime: (_server, _backend) => Effect.sync(() => ({ id: "packaged" as const })),
      acquireServer: (_backend) =>
        Effect.tryPromise({
          catch: (error) => error,
          try: () =>
            new Promise<Server>((resolve, reject) => {
              const node = createServer((_request, response) => response.end("ok"));
              node.once("error", reject);
              node.listen(taken, "127.0.0.1", () => {
                events.push("acquire:server");
                resolve({ node, port: taken });
              });
            }),
        }),
      releaseBackend: (_backend) => Effect.sync(() => { events.push("release:backend"); }),
      releasePackagedRuntime: (_packaged) => Effect.sync(() => { events.push("release:packaged"); }),
      releaseServer: (_server) => Effect.sync(() => { events.push("release:server"); }),
    };
    try {
      await expect(Effect.runPromise(makeHostRuntime(failing))).rejects.toThrow();
      expect(events).toEqual(["acquire:backend", "release:backend"]);
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  });

  test("double close is a no-op", async () => {
    const events: string[] = [];
    const host = await Effect.runPromise(makeHostRuntime(factories(events)));
    await Effect.runPromise(host.close);
    await Effect.runPromise(host.close);
    expect(events.filter((event) => event === "release:server")).toHaveLength(1);
    expect(events.filter((event) => event === "release:backend")).toHaveLength(1);
  });
});
