import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runName = path.basename(publicRoot);
const inferredInternalRoot = path.resolve(
  publicRoot,
  "../../..",
  "role-model-internal",
  ".worktrees",
  runName,
);
const internalRoot = process.env.ROLE_MODEL_INTERNAL_ROOT
  ? path.resolve(process.env.ROLE_MODEL_INTERNAL_ROOT)
  : inferredInternalRoot;
const runner = path.join(internalRoot, "scripts", "track-b", "run-command-test.mjs");
if (!existsSync(runner))
  throw new Error(
    `Run 00 internal command runner not found. Set ROLE_MODEL_INTERNAL_ROOT (resolved: ${internalRoot})`,
  );
const args = [...process.argv.slice(2)].filter((arg) => arg !== "--");
const fromEnv = process.env.ROLE_MODEL_TRACK_B_COMMAND_ID;
const argvCommand = args.find((arg) => /^TB(?:0[0-9]|1[01])-CMD-\d{2}$/.test(arg));
const commandId =
  (fromEnv && /^TB(?:0[0-9]|1[01])-CMD-\d{2}$/.test(fromEnv) ? fromEnv : argvCommand) ?? null;
if (!commandId) {
  throw new Error(
    "public track-b runner requires an exact TBxx-CMD-xx argument or ROLE_MODEL_TRACK_B_COMMAND_ID",
  );
}
const forwarded = [commandId, ...args.filter((arg) => arg !== argvCommand && arg !== commandId)];
const result = spawnSync(process.execPath, [runner, ...forwarded], {
  cwd: internalRoot,
  stdio: "inherit",
  env: process.env,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
