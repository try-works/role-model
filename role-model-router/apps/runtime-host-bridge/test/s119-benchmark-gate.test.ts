import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { makeBenchmarkGate } from "../src/benchmark-gate.js";

/**
 * Run 115 S119 (R27): benchmark cancellation and overlap isolation.
 *
 * R27 requires benchmark runs not to overlap silently: either the new run cancels the previous
 * one (with the previous run observing the cancellation) or the overlap is rejected with the
 * active run named.
 */
describe("S119 benchmark gate", () => {
  it("cancel-previous: a new run cancels the active one and the cancelled run observes it", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const gate = yield* makeBenchmarkGate({ mode: "cancel-previous" });
        const first = yield* gate.begin("run-a");
        const observed: string[] = [];
        // Work that checks the token the way a benchmark loop would.
        for (let step = 0; step < 5; step += 1) {
          if (yield* gate.isCancelled("run-a")) {
            observed.push(`cancelled-at-${String(step)}`);
            break;
          }
          if (step === 2) yield* gate.begin("run-b");
        }
        const second = yield* gate.begin("run-b");
        return { active: yield* gate.active, first, observed, second };
      }),
    );
    expect(result.first.ok).toBe(true);
    expect(result.observed).toEqual(["cancelled-at-3"]);
    expect(result.active).toBe("run-b");
  });

  it("reject-overlap: the second run is refused and the active run is named", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const gate = yield* makeBenchmarkGate({ mode: "reject-overlap" });
        yield* gate.begin("run-a");
        const second = yield* gate.begin("run-b");
        const stillActive = yield* gate.active;
        yield* gate.end("run-a");
        const third = yield* gate.begin("run-b");
        return { second, stillActive, third };
      }),
    );
    expect(result.second).toEqual({ activeRunId: "run-a", ok: false, reason: "busy" });
    expect(result.stillActive).toBe("run-a");
    expect(result.third.ok).toBe(true);
  });

  it("end is idempotent and clears the active run", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const gate = yield* makeBenchmarkGate({ mode: "cancel-previous" });
        yield* gate.begin("run-a");
        yield* gate.end("run-a");
        yield* gate.end("run-a");
        return yield* gate.active;
      }),
    );
    expect(result).toBeUndefined();
  });

  it("ending a run does not mark it cancelled", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const gate = yield* makeBenchmarkGate({ mode: "cancel-previous" });
        yield* gate.begin("run-a");
        yield* gate.end("run-a");
        return yield* gate.isCancelled("run-a");
      }),
    );
    expect(result).toBe(false);
  });
});
