import { defineConfig } from "vitest/config";

export default defineConfig({
  // Run 101 / R1: the vendored Effect and effect-mq trees are source-only and
  // ship without the upstream repo-root tsconfig their package tsconfigs
  // extend. Vite resolves a tsconfig for every transformed `.ts` file and those
  // trees cannot supply one, so the transform options are pinned here instead of
  // mutating vendored bytes. Values mirror the repository's tsconfig.base.json.
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        target: "ES2022",
        useDefineForClassFields: true,
        verbatimModuleSyntax: true,
      },
    },
  },
  test: {
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    // These tests launch real workers and SQLite-backed runtimes. Parallel files
    // can contend for startup and teardown resources, obscuring real failures.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
