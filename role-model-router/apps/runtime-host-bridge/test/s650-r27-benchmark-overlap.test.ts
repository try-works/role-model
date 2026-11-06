import { describe, expect, test } from "vitest";

import { makeBenchmarkGateOwner } from "../src/benchmark-gate.js";

/**
 * S650/R27: the real concurrent boundary for benchmark admission. Two overlapping attempts on the
 * same judge cannot both own the machine: the second is refused and names the active run, and
 * cancelling the active run aborts only that run's signal while a later run starts cleanly.
 */
describe("S650 R27 benchmark cancellation/overlap", () => {
  test("an overlapping run on the same judge is refused by name and cancelling the owner isolates the next run", async () => {
    const judgeEndpointId = "judge.shared";
    const gate = makeBenchmarkGateOwner({ mode: "reject-overlap" });
    const first = gate.begin("run-a");
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("first run must be admitted");
    const second = gate.begin("run-b");
    expect(second).toEqual({ activeRunId: "run-a", ok: false, reason: "busy" });
    expect(gate.running()).toBe(true);

    let firstObservedAbort = false;
    const firstTask = new Promise<void>((resolve) => {
      first.signal.addEventListener("abort", () => {
        firstObservedAbort = true;
        resolve();
      }, { once: true });
    });
    expect(gate.cancel("operator cancelled " + judgeEndpointId)).toBe(true);
    await firstTask;
    expect(firstObservedAbort).toBe(true);
    expect(first.signal.aborted).toBe(true);
    expect(gate.running()).toBe(false);

    const third = gate.begin("run-c");
    expect(third.ok).toBe(true);
    if (!third.ok) throw new Error("run after cancellation must be admitted");
    expect(third.signal).not.toBe(first.signal);
    expect(third.signal.aborted).toBe(false);
    third.finish();
    expect(gate.running()).toBe(false);
  });
});
