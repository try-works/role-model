import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // These tests launch repository-wide Biome, build, and validation commands.
    // Keep the commands serialized so workspace-level test concurrency does not
    // turn resource contention into false timeout failures.
    fileParallelism: false,
    // A bounded budget for the slowest command is still preferable to an
    // unbounded test; constrained Windows and CI hosts need more than Vitest's
    // five-second default while these checks run.
    testTimeout: 60_000,
  },
});
