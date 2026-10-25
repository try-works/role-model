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
  },
});
