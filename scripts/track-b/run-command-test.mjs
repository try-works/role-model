import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runName = path.basename(publicRoot);
const inferredInternalRoot = path.resolve(publicRoot, "../../..", "role-model-internal", ".worktrees", runName);
const internalRoot = process.env.ROLE_MODEL_INTERNAL_ROOT ? path.resolve(process.env.ROLE_MODEL_INTERNAL_ROOT) : inferredInternalRoot;
const runner = path.join(internalRoot, "scripts", "track-b", "run-command-test.mjs");
if (!existsSync(runner)) throw new Error(`Run 00 internal command runner not found. Set ROLE_MODEL_INTERNAL_ROOT (resolved: ${internalRoot})`);
const result = spawnSync(process.execPath, [runner, ...process.argv.slice(2)], { cwd: internalRoot, stdio: "inherit", env: process.env });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
