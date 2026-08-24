import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Public forwarder for the run 94 productized read-only storage audit.
// The audit implementation lives in the paired internal worktree (same convention
// as run-command-test.mjs): resolve ROLE_MODEL_INTERNAL_ROOT or infer the sibling
// .worktrees/<runName> checkout, then forward all arguments unchanged.
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
const audit = path.join(internalRoot, "scripts", "track-b", "storage-audit.mjs");
if (!existsSync(audit))
  throw new Error(
    `Run 94 internal storage audit not found. Set ROLE_MODEL_INTERNAL_ROOT (resolved: ${internalRoot})`,
  );
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const result = spawnSync(process.execPath, [audit, ...args], {
  cwd: internalRoot,
  stdio: "inherit",
  env: process.env,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
