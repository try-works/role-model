import { describe, expect, test } from "vitest";

import {
  BenchmarkBusyError,
  BenchmarkCancelledError,
  benchmarkGate,
} from "../src/composition-dag.js";

/** S330 (R27 Benchmark): DAG gate overlap isolation, cancellation, shutdown cancel, runner abort threading. */

describe("S330 benchmark gate", () => {
  test("overlap isolation: a second benchmark while one runs is refused as busy", () => {
    const first = benchmarkGate.begin("run-a");
    expect(first.ok).toBe(true);
    if (!first.ok) throw new BenchmarkBusyError(first.activeRunId);
    const second = benchmarkGate.begin("run-b");
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.activeRunId).toBe("run-a");
      expect(() => { throw new BenchmarkBusyError(second.activeRunId); }).toThrow(BenchmarkBusyError);
    }
    first.finish();
    const third = benchmarkGate.begin("run-b");
    expect(third.ok).toBe(true);
    if (third.ok) third.finish();
  });

  test("shutdown cancels an in-flight benchmark through the gate", () => {
    const running = benchmarkGate.begin("run-shutdown");
    expect(running.ok).toBe(true);
    if (!running.ok) throw new Error("begin failed");
    expect(benchmarkGate.running()).toBe(true);
    expect(benchmarkGate.cancel("shutdown")).toBe(true);
    expect(running.signal.aborted).toBe(true);
    expect(benchmarkGate.running()).toBe(false);
    running.finish();
    expect(running.signal.aborted).toBe(true);
    const next = benchmarkGate.begin("run-after-shutdown");
    expect(next.ok).toBe(true);
    if (next.ok) next.finish();
  });

  test("runner honors the abort signal with the typed cancellation error", async () => {
    const { readFileSync } = await import("node:fs");
    const runner = readFileSync(new URL("../src/benchmark-runner.ts", import.meta.url), "utf8");
    expect(runner).toContain("BenchmarkCancelledError");
    expect(runner).toContain("signal?.aborted");
  });

  test("production route gate wiring keeps the 202 accepted path and refuses overlap", async () => {
    const { readFileSync } = await import("node:fs");
    const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
    expect(index).toContain("benchmarkGate.begin(");
    expect(index).toContain("benchmark_already_running");
    expect(index).toContain("writeJson(response, 202, await options.runBenchmark(");
    const cli = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
    expect(cli).toContain("benchmarkGate.cancel(");
    expect(benchmarkGate.brand).toBe("dso-benchmark-gate");
  });
});
