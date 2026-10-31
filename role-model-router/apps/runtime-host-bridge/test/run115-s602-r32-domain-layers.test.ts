import { Effect, Exit, Layer, Scope } from "effect";
import { describe, expect, test } from "vitest";

import {
  composeR32DomainLayers,
  R32_DOMAIN_IDS,
  R32DomainGraph,
  type R32DomainGraphContract,
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
const acquired = (): string[] => events().filter((event) => event.startsWith("acquire:")).map((event) => event.slice(8));
const released = (): string[] => events().filter((event) => event.startsWith("release:")).map((event) => event.slice(8));

describe("S602 R32 per-domain private Layer boundaries", () => {
  test("composition captures no domain and every domain is Layer-provided with its own release", async () => {
    closed.length = 0;
    let graph: R32DomainGraphContract | undefined;
    const scope = Effect.runSync(Scope.make());
    const layer = composeR32DomainLayers({ events: closed, onGraph: (value) => { graph = value; } });
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
    const layer = composeR32DomainLayers({ events: closed,
      acquire: Object.fromEntries(R32_DOMAIN_IDS.map((id) => [id, async (options: { readonly id: string }) => {
        seen.push(options.id);
        return { handle: { domain: id, options }, release: async () => { closed.push("release:" + id); } };
      }])),
    });
    await Effect.runPromise(Layer.buildWithScope(layer, scope));
    expect(seen).toEqual([...R32_DOMAIN_IDS]);
    await Effect.runPromise(Scope.close(scope, Exit.void));
  });

  test("a failed domain build aborts and releases only domains already acquired", async () => {
    closed.length = 0;
    const scope = Effect.runSync(Scope.make());
    const layer = composeR32DomainLayers({ events: closed,
      failOn: "capture",
    });
    await expect(Effect.runPromise(Layer.buildWithScope(layer, scope))).rejects.toThrow(/r32 domain acquisition failed: capture/);
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
    await Effect.runPromise(Layer.buildWithScope(composeR32DomainLayers({ events: closed, onGraph: (value) => { graph = value; } }), scope));
    expect(graph?.shutdownOrder).toEqual([...R32_DOMAIN_IDS].reverse());
    expect(graph?.ready).toBe(true);
    const close = graph?.close();
    await close;
    await close;
    expect(released()).toEqual([...R32_DOMAIN_IDS].reverse());
    await Effect.runPromise(Scope.close(scope, Exit.void));
  });
});
