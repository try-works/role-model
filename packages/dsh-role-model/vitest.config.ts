/**
 * Vitest configuration for the plugin package.
 *
 * `@deepseek-ai/schemastery` is a peer dependency supplied by the Harness at
 * runtime. The repo is not the Harness workspace, so an explicit alias points the
 * test run and the typechecker at the local DSH checkout's copy. Override
 * `DSH_HARNESS_ROOT` when the checkout lives elsewhere.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vitest/config";

/** Locate `@deepseek-ai/schemastery` for module resolution during tests. */
function schemasteryEntry(): string {
  const candidates: string[] = [];
  const harnessRoot = process.env.DSH_HARNESS_ROOT;
  if (harnessRoot !== undefined && harnessRoot.trim().length > 0) {
    candidates.push(join(harnessRoot.trim(), "vendor", "schemastery", "lib", "index.mjs"));
  }
  candidates.push("D:\\deepseek-harness\\vendor\\schemastery\\lib\\index.mjs");
  const pnpmRoot = join(process.cwd(), "..", "..", "node_modules", ".pnpm");
  if (existsSync(pnpmRoot)) {
    for (const entry of readdirSync(pnpmRoot)) {
      if (!entry.startsWith("@deepseek-ai+schemastery@")) continue;
      candidates.push(
        join(pnpmRoot, entry, "node_modules", "@deepseek-ai", "schemastery", "lib", "index.mjs"),
      );
    }
  }
  const found = candidates.find((candidate) => existsSync(candidate));
  if (found === undefined) {
    throw new Error(
      "could not locate @deepseek-ai/schemastery; set DSH_HARNESS_ROOT to the DSH checkout",
    );
  }
  return found;
}

export default defineConfig({
  resolve: {
    alias: {
      "@deepseek-ai/schemastery": schemasteryEntry(),
    },
  },
  test: {
    include: ["test/**/*.spec.ts"],
    environment: "node",
  },
});
