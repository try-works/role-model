import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedTrackBExtensionBridgeState } from "../src/track-b-operations.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const stateRoot =
  process.env.RUNTIME_QA_STATE_ROOT ??
  path.join(process.env.TEMP ?? "/tmp", "role-model-runtime-qa-run00-remediation");
const scopeId = process.env.RUNTIME_QA_SCOPE_ID ?? "runtime-qa";

const contracts = JSON.parse(
  await readFile(
    path.join(repoRoot, "packages", "protocol-types", "generated", "product-contracts.json"),
    "utf8",
  ),
);
const bridgePath = path.join(stateRoot, scopeId, "track-b-production-bridge.json");
const seeded = await seedTrackBExtensionBridgeState({
  statePath: bridgePath,
  catalog: contracts.extensions ?? [],
});
console.log(
  JSON.stringify(
    {
      bridgePath,
      count: seeded.extensions.length,
      revision: seeded.revision,
      ready: seeded.extensions.filter((row) => row.lifecycle === "ready").length,
    },
    null,
    2,
  ),
);
