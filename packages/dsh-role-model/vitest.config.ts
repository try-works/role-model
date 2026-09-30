/**
 * Vitest configuration for the plugin package.
 *
 * `@deepseek-ai/schemastery` is a declared dependency, so the test run resolves it
 * from this package's own `node_modules` like any other module — no alias is
 * needed, and a build or test run never depends on a harness checkout being
 * present. The alias below only exists for the single case where the dependency has
 * not been installed yet but the harness *is* checked out: it points at the
 * checkout's vendored copy from `DSH_HARNESS_ROOT`.
 *
 * The alias is applied only when normal resolution fails, so the installed package
 * always wins.
 */

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

/**
 * Report whether `@deepseek-ai/schemastery` resolves locally.
 * @returns the resolved entry path, or undefined when it is not installed.
 */
function installedEntry(): string | undefined {
  try {
    return require.resolve("@deepseek-ai/schemastery");
  } catch {
    return undefined;
  }
}

/**
 * The harness checkout's vendored copy, used only when nothing is installed.
 * @returns the entry path, or undefined when no checkout is configured.
 */
function checkoutEntry(): string | undefined {
  const harnessRoot = process.env.DSH_HARNESS_ROOT?.trim();
  if (harnessRoot === undefined || harnessRoot.length === 0) return undefined;
  const entry = join(harnessRoot, "vendor", "schemastery", "lib", "index.mjs");
  return existsSync(entry) ? entry : undefined;
}

const local = installedEntry();
const fallback = local === undefined ? checkoutEntry() : undefined;

if (local === undefined && fallback === undefined) {
  throw new Error(
    "could not resolve @deepseek-ai/schemastery. Run `pnpm install` in packages/dsh-role-model; " +
      "the dependency is declared in package.json and needs no harness checkout.",
  );
}

export default defineConfig({
  resolve: {
    alias: fallback === undefined ? {} : { "@deepseek-ai/schemastery": fallback },
  },
  test: {
    include: ["test/**/*.spec.ts"],
    environment: "node",
  },
});
