/**
 * Build the installable bundle half.
 *
 * The Harness loads an installed bundle's entry as a plain ES module, so this
 * package ships built JavaScript under `lib/` (the convention every other
 * installed bundle follows). `src/` remains the authored source and the target of
 * the test suite.
 *
 * Bundling decisions:
 *  - The plugin's own modules are inlined, so nothing depends on the profile's
 *    module resolution.
 *  - `@deepseek-ai/schemastery` is bundled in. It is a vendored DSH workspace
 *    package whose dependency on `@deepseek-ai/cosmokit` is a `workspace:`
 *    specifier, so it cannot be installed as a plain dependency from this repo.
 *    Inlining it keeps the plugin self-contained with no extra install step.
 *  - `HOST_EXTERNAL` packages stay external and must resolve to the HOST's own
 *    copies at runtime: `@deepseek-ai/dsh-llm` in particular, because `LlmError`
 *    class identity decides whether the host trusts our failure codes (see
 *    `src/host-llm.ts`). Bundling them would create a second class identity and
 *    silently degrade every error to `UNKNOWN`.
 */

import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";

/** Packages that must resolve to the Harness's own copies at runtime. */
const HOST_EXTERNAL = [
  "@deepseek-ai/dsh-llm",
  "@deepseek-ai/dsh-tools",
  "@deepseek-ai/dsh-skill",
  "@deepseek-ai/dsh-system-prompt",
  "@deepseek-ai/dsh-agent",
  "@deepseek-ai/dsh-session",
  "@deepseek-ai/cordis",
];

/**
 * Locate the vendored schemastery build to inline.
 * @returns the absolute path to the ESM entry.
 */
function schemasteryEntry() {
  const candidates = [];
  const harnessRoot = process.env.DSH_HARNESS_ROOT;
  if (harnessRoot !== undefined && harnessRoot.trim().length > 0) {
    candidates.push(join(harnessRoot.trim(), "vendor", "schemastery", "lib", "index.mjs"));
  }
  candidates.push("D:\\deepseek-harness\\vendor\\schemastery\\lib\\index.mjs");
  const pnpmRoot = join(import.meta.dirname, "..", "..", "..", "node_modules", ".pnpm");
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

const outdir = "lib";
rmSync(outdir, { recursive: true, force: true });

const result = await build({
  entryPoints: { index: "src/index.ts" },
  outdir,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  sourcemap: false,
  external: HOST_EXTERNAL,
  alias: { "@deepseek-ai/schemastery": schemasteryEntry() },
  logLevel: "info",
});

if (result.errors.length > 0) process.exitCode = 1;
