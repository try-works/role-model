import { expect, test } from "vitest";

import { createCliServerOptions } from "../src/cli.js";

/**
 * Run 98 addendum 43 S4, second wiring point.
 *
 * The packaged runtime serves from `createCliServerOptions`'s hand-written table rather than from the
 * backend object, so a route can be implemented, unit-tested and still answer `404` live — which is exactly
 * what the first v270 swap did with `/api/role-model/benchmark/sample-runs`. This asserts the binding exists
 * so the gap is caught before a rebuild rather than after it.
 */
test("run98 a43 S4: the CLI server options bind the sample-backed run read", () => {
  const backend = {
    readBenchmarkSampleRunStates: async () => ({ stalledAfterMs: 1, runs: [] }),
  };
  const options = createCliServerOptions(
    {
      host: "127.0.0.1",
      port: 0,
      runtimeStateRoot: "unused-for-this-assertion",
      runtimeChannel: "development",
    } as never,
    {
      getBackend: () => backend as never,
      readBootstrapState: () => null,
    },
  );

  expect(typeof options.readBenchmarkSampleRunStates).toBe("function");
});
