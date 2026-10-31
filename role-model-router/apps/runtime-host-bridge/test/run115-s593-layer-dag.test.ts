import { Effect, Fiber, Layer } from "effect";
import { describe, expect, test } from "vitest";

import {
  composeR27HostLayer,
  makeR27ReadinessOwner,
  R27_RESOURCE_IDS,
  R27Host,
} from "../src/r27-layer-dag.js";

const waitFor = async (read: () => boolean): Promise<void> => {
  const end = Date.now() + 3000;
  while (Date.now() < end) {
    if (read()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("timed out waiting for readiness");
};

const acquired = (events: readonly string[]): readonly string[] =>
  events.filter((event) => event.startsWith("acquire:")).map((event) => event.slice("acquire:".length));
const released = (events: readonly string[]): readonly string[] =>
  events.filter((event) => event.startsWith("release:")).map((event) => event.slice("release:".length));

describe("S593 R27 closed Layer DAG", () => {
  test("(a) composition performs no acquisition; every top-level resource is Layer-provided", async () => {
    const events: string[] = [];
    const readiness = makeR27ReadinessOwner();
    const layer = composeR27HostLayer({ events, readiness });
    expect(events).toEqual([]);

    const host = await Effect.runPromise(
      Effect.scoped(
        Effect.provide(
          Effect.gen(function* () {
            const value = yield* R27Host;
            expect(events).toContain("ready");
            return value;
          }),
          layer,
        ),
      ),
    );

    expect(host.resources).toEqual(R27_RESOURCE_IDS);
    expect(acquired(events)).toEqual(expect.arrayContaining(["readiness", ...R27_RESOURCE_IDS]));
    for (const id of R27_RESOURCE_IDS) {
      expect(acquired(events).filter((entry) => entry === id)).toHaveLength(1);
      expect(released(events).filter((entry) => entry === id)).toHaveLength(1);
    }
    expect(released(events)).toEqual([...acquired(events)].reverse());
  });

  test("(b) Layer.launch reaches ready then releases in order on interrupt", async () => {
    const events: string[] = [];
    const readiness = makeR27ReadinessOwner();
    const fiber = Effect.runFork(Layer.launch(composeR27HostLayer({ events, readiness })));
    try {
      await waitFor(() => readiness.ready());
      expect(readiness.state().status).toBe("ready");
      expect(events.indexOf("ready")).toBeGreaterThan(events.findIndex((event) => event === "acquire:cli"));
      expect(released(events)).toEqual([]);
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber));
    }
    expect(released(events)).toEqual([...acquired(events)].reverse());
  });

  test("(c) readiness is pending before launch and partial shutdown releases only acquired resources on failure", async () => {
    const events: string[] = [];
    const readiness = makeR27ReadinessOwner();
    expect(readiness.state().status).toBe("pending");
    const layer = composeR27HostLayer({ events, readiness, failOn: "server" });
    await Effect.runPromise(
      Effect.scoped(
        Effect.provide(
          Effect.gen(function* () {
            yield* R27Host;
          }),
          layer,
        ),
      ).pipe(Effect.exit),
    );

    expect(readiness.state().status).toBe("failed");
    expect(events).not.toContain("ready");
    expect(acquired(events)).toContain("benchmarks");
    expect(acquired(events)).not.toContain("server");
    expect(acquired(events)).not.toContain("cli");
    expect(released(events)).toEqual([...acquired(events)].reverse());
  });

  test("the DAG-provided readiness owner passes the composed admission assertion", async () => {
    const { assertComposedReadiness } = await import("../src/composition-dag.js");
    const events: string[] = [];
    const program = Effect.gen(function* () {
      const host = yield* R27Host;
      expect(host.readiness.ready()).toBe(true);
      expect(() => assertComposedReadiness(host.readiness)).not.toThrow();
    }).pipe(
      Effect.provide(composeR27HostLayer({ events })),
    );
    await Effect.runPromise(program);
    expect(events).toContain("ready");
  });
});
