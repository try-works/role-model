import { describe, expect, test } from "vitest";

import { BenchmarkCancelledError } from "../src/benchmark-gate.js";
import { runRoutingCapabilityBenchmark } from "../src/benchmark-runner.js";
import { benchmarkGate } from "../src/composition-dag.js";
import { startBridgeServer } from "../src/index.js";

/**
 * S331 behavioral repair: exercise the real HTTP handler for benchmark admission/cancel release, and a real
 * benchmark-runner invocation with a pre-aborted signal (loop-boundary cancellation), not source-string matching.
 */

describe("S331 benchmark route behavior", () => {
  test("route: first run accepted 202 with forwarded signal/runId, concurrent run 409, failure releases the slot", async () => {
    let releaseFirst: ((value: unknown) => void) | null = null;
    let capturedSignal: AbortSignal | undefined;
    let capturedRunId: string | undefined;
    let failNext = false;
    const runBenchmark = (
      _body: Record<string, unknown>,
      signal: AbortSignal,
      runId: string,
    ): Promise<unknown> => {
      capturedSignal = signal;
      capturedRunId = runId;
      if (failNext) {
        failNext = false;
        return Promise.reject(new Error("benchmark exploded"));
      }
      return new Promise((resolve) => {
        releaseFirst = resolve;
      });
    };
    // SAFETY: the probe only exercises the benchmark route; unrelated StartBridgeServerOptions fields are unused.
    const probeOptions = { host: "127.0.0.1", port: 0, runBenchmark } as never;
    const server = await startBridgeServer(probeOptions, { allowTestSeamBackend: true });
    try {
      const base = `http://127.0.0.1:${String(server.port)}`;
      const first = fetch(`${base}/api/role-model/benchmark/runs`, {
        body: JSON.stringify({ mode: "quick" }),
        method: "POST",
      });
      // wait until the handler reached runBenchmark
      for (let tick = 0; tick < 50 && capturedRunId === undefined; tick += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(capturedRunId).toBeTypeOf("string");
      expect(capturedSignal).toBeInstanceOf(AbortSignal);
      expect(benchmarkGate.running()).toBe(true);
      const second = await fetch(`${base}/api/role-model/benchmark/runs`, {
        body: JSON.stringify({ mode: "quick" }),
        method: "POST",
      });
      expect(second.status).toBe(409);
      // SAFETY: test-only structural cast required by the benchmark route/runner probe types.
      const refusal = (await second.json()) as { activeRunId?: string; error?: string };
      expect(refusal).toEqual({ activeRunId: capturedRunId, error: "benchmark_already_running" });
      releaseFirst?.({ runId: capturedRunId });
      const firstResponse = await first;
      expect(firstResponse.status).toBe(202);
      // SAFETY: test-only structural cast required by the benchmark route/runner probe types.
      const accepted = (await firstResponse.json()) as { runId?: string };
      expect(accepted.runId).toBe(capturedRunId);
      expect(benchmarkGate.running()).toBe(false);
      // FAILURE path releases the slot too.
      failNext = true;
      const failed = await fetch(`${base}/api/role-model/benchmark/runs`, {
        body: JSON.stringify({ mode: "quick" }),
        method: "POST",
      });
      expect(failed.status).toBe(400);
      expect(benchmarkGate.running()).toBe(false);
      const next = fetch(`${base}/api/role-model/benchmark/runs`, {
        body: JSON.stringify({ mode: "quick" }),
        method: "POST",
      });
      for (let tick = 0; tick < 50 && benchmarkGate.running() === false; tick += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(benchmarkGate.running()).toBe(true);
      releaseFirst?.({ runId: capturedRunId });
      expect((await next).status).toBe(202);
    } finally {
      await server.close();
    }
  });

  test("runner: a pre-aborted signal throws BenchmarkCancelledError at a loop boundary (no upstream call)", async () => {
    const controller = new AbortController();
    controller.abort();
    let upstreamCalls = 0;
    // SAFETY: the probe only reaches the cancellation boundary; unrelated runner dependency fields are unused.
    const deps = {
      benchmarkArtifactRoot: undefined,
      databasePath: "E:/rm-tmp/s331-benchmark.sqlite",
      deriveEndpointVersion: () => "v1",
      executeChatCompletions: async () => {
        upstreamCalls += 1;
        throw new Error("upstream must not be called after abort");
      },
      listConfiguredEndpoints: async () => [],
      membershipRevision: () => "revision",
      signal: controller.signal,
      // SAFETY: test-only structural cast required by the benchmark route/runner probe types.
    } as never;
    await expect(
      runRoutingCapabilityBenchmark(deps, { mode: "quick", runId: "run-cancelled" }),
    ).rejects.toBeInstanceOf(BenchmarkCancelledError);
    expect(upstreamCalls).toBe(0);
  });
});
