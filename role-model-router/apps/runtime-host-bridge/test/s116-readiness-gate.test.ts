import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { makeReadinessGate } from "../src/readiness-gate.js";

/**
 * Run 115 S116 (R27): early readiness.
 *
 * R27 requires the host to report ready as soon as the REQUIRED stages are terminal, without
 * waiting for advisory stages (peers, remote health) that can take much longer - and to report
 * failure rather than hang when a required stage fails.
 */
describe("S116 early readiness gate", () => {
  it("resolves when the required stages are terminal even though advisory stages are pending", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const gate = yield* makeReadinessGate({ required: ["credentials", "endpoints"] });
        yield* gate.mark("credentials", "ready");
        yield* gate.mark("endpoints", "ready");
        return yield* gate.awaitReady;
      }),
    );
    expect(result.ready).toBe(true);
    expect([...result.stages].sort()).toEqual(["credentials", "endpoints"]);
  });

  it("does not report ready while a required stage is still running", async () => {
    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const gate = yield* makeReadinessGate({ required: ["credentials"] });
        yield* gate.mark("credentials", "running");
        return yield* Effect.race(
          gate.awaitReady.pipe(Effect.as("ready-early" as const)),
          Effect.sleep("50 millis").pipe(Effect.as("still-waiting" as const)),
        );
      }),
    );
    expect(outcome).toBe("still-waiting");
  });

  it("reports a failed required stage instead of hanging", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const gate = yield* makeReadinessGate({ required: ["credentials"] });
        yield* gate.mark("credentials", "failed");
        return yield* gate.awaitReady;
      }),
    );
    expect(result.ready).toBe(false);
    expect([...result.failed]).toEqual(["credentials"]);
  });

  it("treats an advisory degraded stage as satisfied, matching the bootstrap summary rule", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const gate = yield* makeReadinessGate({ required: ["credentials", "peers"] });
        yield* gate.mark("credentials", "ready");
        yield* gate.mark("peers", "degraded");
        return yield* gate.awaitReady;
      }),
    );
    expect(result.ready).toBe(true);
  });
});
