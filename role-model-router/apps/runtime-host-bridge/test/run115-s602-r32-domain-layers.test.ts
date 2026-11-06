import { Effect, Exit, Layer, Scope } from "effect";
import { describe, expect, test } from "vitest";

import {
  type R32DomainFactory,
  R32DomainGraph,
  type R32DomainGraphContract,
  R32_DOMAIN_IDS,
  composeR32DomainLayers,
} from "../src/r32-domain-layers.js";

const closed: string[] = [];
const waitFor = async (read: () => boolean): Promise<void> => {
  const end = Date.now() + 3000;
  while (Date.now() < end) {
    if (read()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("timed out");
};

const events = (): string[] => [...closed];
const acquired = (): string[] =>
  events()
    .filter((event) => event.startsWith("acquire:"))
    .map((event) => event.slice(8));
const released = (): string[] =>
  events()
    .filter((event) => event.startsWith("release:"))
    .map((event) => event.slice(8));

describe("S602 R32 per-domain private Layer boundaries", () => {
  test("composition captures no domain and every domain is Layer-provided with its own release", async () => {
    closed.length = 0;
    let graph: R32DomainGraphContract | undefined;
    const scope = Effect.runSync(Scope.make());
    const layer = composeR32DomainLayers({
      events: closed,
      onGraph: (value) => {
        graph = value;
      },
    });
    expect(events()).toEqual([]);
    await Effect.runPromise(Layer.buildWithScope(layer, scope));
    expect(graph?.domains).toBeDefined();
    for (const id of R32_DOMAIN_IDS) {
      expect(graph?.domains[id]?.id).toBe(id);
      expect(graph?.domains[id]?.handle).toMatchObject({ domain: id });
    }
    expect(acquired()).toEqual([...R32_DOMAIN_IDS]);
    await Effect.runPromise(Scope.close(scope, Exit.void));
    expect(released()).toEqual([...R32_DOMAIN_IDS].reverse());
  });

  test("each domain factory receives only its own options (no ambient cross-domain capture)", async () => {
    closed.length = 0;
    const seen: string[] = [];
    const scope = Effect.runSync(Scope.make());
    const layer = composeR32DomainLayers({
      events: closed,
      acquire: Object.fromEntries(
        R32_DOMAIN_IDS.map((id) => [
          id,
          async (options: { readonly id: string }) => {
            seen.push(options.id);
            return {
              handle: { domain: id, options },
              release: async () => {
                closed.push(`release:${id}`);
              },
            };
          },
        ]),
      ),
    });
    await Effect.runPromise(Layer.buildWithScope(layer, scope));
    expect(seen).toEqual([...R32_DOMAIN_IDS]);
    await Effect.runPromise(Scope.close(scope, Exit.void));
  });

  test("a failed domain build aborts and releases only domains already acquired", async () => {
    closed.length = 0;
    const scope = Effect.runSync(Scope.make());
    const layer = composeR32DomainLayers({ events: closed, failOn: "capture" });
    await expect(Effect.runPromise(Layer.buildWithScope(layer, scope))).rejects.toThrow(
      /r32 domain acquisition failed: capture/,
    );
    expect(acquired()).toContain("eventLog");
    expect(acquired()).not.toContain("capture");
    expect(acquired()).not.toContain("knowledge");
    await Effect.runPromise(Scope.close(scope, Exit.void)).catch(() => undefined);
    expect(released()).toEqual([...acquired()].reverse());
  });

  test("the domain graph layer exposes a shutdown handshake and bounded release order", async () => {
    closed.length = 0;
    let graph: R32DomainGraphContract | undefined;
    const scope = Effect.runSync(Scope.make());
    await Effect.runPromise(
      Layer.buildWithScope(
        composeR32DomainLayers({
          events: closed,
          onGraph: (value) => {
            graph = value;
          },
        }),
        scope,
      ),
    );
    expect(graph?.shutdownOrder).toEqual([...R32_DOMAIN_IDS].reverse());
    expect(graph?.ready).toBe(true);
    const close = graph?.close();
    await close;
    await close;
    expect(released()).toEqual([...R32_DOMAIN_IDS].reverse());
    await Effect.runPromise(Scope.close(scope, Exit.void));
  });
  test("one composed layer owns independent domain instances per build", async () => {
    const events: string[] = [];
    const graphs: R32DomainGraphContract[] = [];
    let build = 0;
    const factories = Object.fromEntries(
      R32_DOMAIN_IDS.map((id) => [
        id,
        async () => {
          const instance = ++build;
          return {
            handle: { build: instance, domain: id },
            release: async () => {
              events.push(`release:${instance}:${id}`);
            },
          };
        },
      ]),
    ) as Partial<Record<(typeof R32_DOMAIN_IDS)[number], R32DomainFactory>>;
    const layer = composeR32DomainLayers({
      events,
      onGraph: (graph) => {
        graphs.push(graph);
      },
      acquire: factories,
    });
    const first = Effect.runSync(Scope.make());
    const second = Effect.runSync(Scope.make());
    await Promise.all([
      Effect.runPromise(Layer.buildWithScope(layer, first)),
      Effect.runPromise(Layer.buildWithScope(layer, second)),
    ]);
    expect(graphs).toHaveLength(2);
    const firstGraph = graphs[0]!;
    const secondGraph = graphs[1]!;
    expect(firstGraph.domains.retention.handle).toMatchObject({ build: 1 });
    expect(secondGraph.domains.retention.handle).toMatchObject({ build: 2 });
    const firstExpected = [...R32_DOMAIN_IDS]
      .reverse()
      .map((id) => `release:${firstGraph.domains[id].handle.build}:${id}`);
    const secondExpected = [...R32_DOMAIN_IDS]
      .reverse()
      .map((id) => `release:${secondGraph.domains[id].handle.build}:${id}`);
    await firstGraph.close();
    expect(events.filter((event) => event.startsWith("release:"))).toEqual(firstExpected);
    await secondGraph.close();
    expect(events.filter((event) => event.startsWith("release:"))).toEqual([
      ...firstExpected,
      ...secondExpected,
    ]);
  });

  test("close releases every domain even when one release rejects", async () => {
    const events: string[] = [];
    let graph: R32DomainGraphContract | undefined;
    const scope = Effect.runSync(Scope.make());
    await Effect.runPromise(
      Layer.buildWithScope(
        composeR32DomainLayers({
          events,
          onGraph: (value) => {
            graph = value;
          },
          acquire: {
            learning: async () => ({
              handle: { domain: "learning" },
              release: async () => {
                throw new Error("learning release failed");
              },
            }),
          },
        }),
        scope,
      ),
    );
    await expect(graph?.close()).rejects.toThrow(/r32 domain release failures/);
    expect(events.filter((event) => event.startsWith("release:"))).toEqual(
      [...R32_DOMAIN_IDS]
        .reverse()
        .filter((id) => id !== "learning")
        .map((id) => `release:${id}`),
    );
    await Effect.runPromise(Scope.close(scope, Exit.void)).catch(() => undefined);
  });
});
