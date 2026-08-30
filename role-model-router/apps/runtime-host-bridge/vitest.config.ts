import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    // These tests launch real workers and SQLite-backed runtimes. Parallel files
    // can contend for startup and teardown resources, obscuring real failures.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
