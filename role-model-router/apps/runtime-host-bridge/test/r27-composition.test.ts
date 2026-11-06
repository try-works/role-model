import { Context, Effect, Layer } from "effect";
import { describe, expect, test } from "vitest";

import { managedLayer } from "../src/r27-composition.js";

interface Handle {
  readonly id: string;
}
const Backend = Context.Service<Handle>("R27Backend");
const Server = Context.Service<Handle>("R27Server");

const resource = (
  name: string,
  events: string[],
  options: { failAcquire?: boolean; throwRelease?: boolean } = {},
) => ({
  acquire: Effect.suspend(() => {
    events.push(`acquire:${name}`);
    return options.failAcquire
      ? Effect.fail(new Error("acquire failed"))
      : Effect.succeed({ id: name });
  }),
  name,
  release: (_value: Handle) =>
    Effect.suspend(() => {
      events.push(`release:${name}`);
      return options.throwRelease ? Effect.die(new Error("finalizer threw")) : Effect.void;
    }),
});

const graph = (
  events: string[],
  options: { failServer?: boolean; throwServer?: boolean; throwBackend?: boolean } = {},
) => {
  const backend = managedLayer(
    Backend,
    resource("backend", events, { throwRelease: options.throwBackend }),
  );
  const server = managedLayer(Server, {
    ...resource("server", events, {
      failAcquire: options.failServer,
      throwRelease: options.throwServer,
    }),
    acquire: Effect.flatMap(
      Backend,
      () =>
        resource("server", events, {
          failAcquire: options.failServer,
          throwRelease: options.throwServer,
        }).acquire,
    ),
  });
  return Layer.provideMerge(server, backend);
};

describe("R27/B6 scoped host composition", () => {
  test("releases server then backend in reverse acquisition order", async () => {
    const events: string[] = [];
    const context = await Effect.runPromise(Effect.scoped(Layer.build(graph(events))));
    expect(Context.get(context, Server).id).toBe("server");
    expect(Context.get(context, Backend).id).toBe("backend");
    expect(events).toEqual([
      "acquire:backend",
      "acquire:server",
      "release:server",
      "release:backend",
    ]);
  });

  test("a failed server acquisition releases the already-acquired backend", async () => {
    const events: string[] = [];
    await expect(
      Effect.runPromise(Effect.scoped(Layer.build(graph(events, { failServer: true })))),
    ).rejects.toThrow();
    expect(events).toEqual(["acquire:backend", "acquire:server", "release:backend"]);
  });

  test("a throwing server finalizer does not skip the backend release", async () => {
    const events: string[] = [];
    await expect(
      Effect.runPromise(Effect.scoped(Layer.build(graph(events, { throwServer: true })))),
    ).rejects.toThrow();
    expect(events).toContain("release:server");
    expect(events).toContain("release:backend");
    expect(events.indexOf("release:server")).toBeLessThan(events.indexOf("release:backend"));
  });
});
