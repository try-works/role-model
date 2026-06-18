import os from "node:os";
import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { createRuntimeBridgeBackend } from "../../../../../role-model-router/apps/runtime-host-bridge/src/index.ts";
import { createQaFixtureRoot } from "../../../../../role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts";
const repoRoot = path.resolve(import.meta.dirname, "../../../../..");
const runtimeStateRoot = path.join(os.tmpdir(), "role-model-runtime-qa-probe-no-config");
const scopeId = "runtime-qa-probe-no-config";
console.log("probe:no-config:start", repoRoot);
await rm(runtimeStateRoot, { recursive: true, force: true });
await mkdir(runtimeStateRoot, { recursive: true });
console.log("probe:no-config:before backend");
const backend = await Promise.race([
  createRuntimeBridgeBackend({ fixtureRoot: createQaFixtureRoot(repoRoot), repoRoot, runtimeStateRoot, scopeId }),
  new Promise((_, reject) => setTimeout(() => reject(new Error("backend timeout")), 10000)),
]);
console.log("probe:no-config:after backend");
await backend.shutdown();
console.log("probe:no-config:done");
