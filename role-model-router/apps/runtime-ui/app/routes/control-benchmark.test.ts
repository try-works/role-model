import { expect, test, vi } from "vitest";

import * as benchmarkModule from "./control-benchmark";

test("publishes essential benchmark controls while advisory reads remain pending", async () => {
  const startProgressiveBenchmarkBootstrap = (
    benchmarkModule as { startProgressiveBenchmarkBootstrap?: unknown }
  ).startProgressiveBenchmarkBootstrap;
  expect(startProgressiveBenchmarkBootstrap).toBeTypeOf("function");
  if (typeof startProgressiveBenchmarkBootstrap !== "function") {
    return;
  }

  const onEssential = vi.fn();
  const onAdvisory = vi.fn();
  const never = new Promise<never>(() => undefined);
  const dispose = (
    startProgressiveBenchmarkBootstrap as (input: {
      loadSuite: () => Promise<string>;
      loadCandidates: () => Promise<readonly string[]>;
      loadPreferences: () => Promise<{ judgeEndpointId: string }>;
      onEssential: (value: unknown) => void;
      advisoryLoads: readonly { load: () => Promise<unknown>; onData: (value: unknown) => void }[];
      onError: (message: string) => void;
    }) => () => void
  )({
    loadSuite: async () => "suite",
    loadCandidates: async () => ["candidate"],
    loadPreferences: async () => ({ judgeEndpointId: "candidate" }),
    onEssential,
    advisoryLoads: [{ load: () => never, onData: onAdvisory }],
    onError: () => undefined,
  });

  await vi.waitFor(() => {
    expect(onEssential).toHaveBeenCalledWith({
      suite: "suite",
      candidates: ["candidate"],
      preferences: { judgeEndpointId: "candidate" },
    });
  });
  expect(onAdvisory).not.toHaveBeenCalled();
  dispose();
});
