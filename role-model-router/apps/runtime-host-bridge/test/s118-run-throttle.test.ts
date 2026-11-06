import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { makeRunThrottle } from "../src/run-throttle.js";

/**
 * Run 115 S118 (R27): per-run judge/throttle isolation.
 *
 * R27 requires each run to get its own throttle: a saturated evaluation run must not block a
 * benchmark run, and finishing a run must release its permits so the next run can proceed.
 */
describe("S118 per-run throttle isolation", () => {
  it("gives each run its own permits so a saturated run does not block another", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const throttle = yield* makeRunThrottle({ maxConcurrentPerRun: 1 });
        const heldA = yield* throttle.take("run-a");
        // run-a is saturated; run-b must still be able to take its own permit.
        const raceResult = yield* Effect.race(
          throttle.take("run-b").pipe(Effect.as("took" as const)),
          Effect.sleep("50 millis").pipe(Effect.as("blocked" as const)),
        );
        return { heldA, raceResult };
      }),
    );
    expect(result.heldA).toBe(true);
    expect(result.raceResult).toBe("took");
  });

  it("queues within a run when the run is saturated and releases on give back", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const throttle = yield* makeRunThrottle({ maxConcurrentPerRun: 1 });
        yield* throttle.take("run-a");
        const blocked = yield* Effect.race(
          throttle.take("run-a").pipe(Effect.as("took" as const)),
          Effect.sleep("40 millis").pipe(Effect.as("blocked" as const)),
        );
        yield* throttle.give("run-a");
        const after = yield* throttle.take("run-a");
        return { after, blocked };
      }),
    );
    expect(result.blocked).toBe("blocked");
    expect(result.after).toBe(true);
  });

  it("releases every permit of a run when it finishes, so the next run is not starved", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const throttle = yield* makeRunThrottle({ maxConcurrentPerRun: 2 });
        yield* throttle.take("run-a");
        yield* throttle.take("run-a");
        yield* throttle.finish("run-a");
        const again = yield* throttle.take("run-a");
        const snapshot = yield* throttle.snapshot("run-a");
        return { again, snapshot };
      }),
    );
    expect(result.again).toBe(true);
    expect(result.snapshot.active).toBe(1);
  });

  it("reports unknown runs as empty rather than throwing", async () => {
    const snapshot = await Effect.runPromise(
      Effect.gen(function* () {
        const throttle = yield* makeRunThrottle({ maxConcurrentPerRun: 1 });
        return yield* throttle.snapshot("never-seen");
      }),
    );
    expect(snapshot).toEqual({ active: 0, waiting: 0 });
  });
});
