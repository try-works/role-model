#!/usr/bin/env node
/**
 * Compatibility wrapper: vendoring is handled by `scripts/vendor-upstream.mjs`, which describes every pinned
 * upstream. This entry point keeps the documented `node scripts/vendor-effect.mjs --verify|--sync` command working
 * for the Effect v4 tree under `vendor/effect/`.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const tool = fileURLToPath(new URL("./vendor-upstream.mjs", import.meta.url));
const result = spawnSync(process.execPath, [tool, "--name", "effect", ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
