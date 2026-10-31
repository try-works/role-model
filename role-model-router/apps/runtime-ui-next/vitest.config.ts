import { defineConfig } from "vitest/config";

/**
 * The mount test runs under happy-dom, the same environment the vendored Foldkit packages use
 * (vendor/foldkit/packages/foldkit/vitest.config.ts:5 and
 * vendor/foldkit/packages/ui/vitest.config.ts:10). The package's own vitest + happy-dom
 * devDependencies are controller-owned: they are not declared here yet, so this config is only
 * runnable once the workspace install provides them.
 */
export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["test/**/*.test.ts"],
    // Mount tests share a busy happy-dom process; 5s flakes under parallel load.
    testTimeout: 15000,
    // Mount tests are heavy happy-dom sessions; cap parallelism to keep waits deterministic.
    maxWorkers: 4,
  },
});
