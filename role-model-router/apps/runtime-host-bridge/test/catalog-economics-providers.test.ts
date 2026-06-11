import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { createRuntimeBridgeBackend } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(repoRoot, "testdata", "router-runtime", "fixtures");

describe("catalog economics provider surfaces", () => {
  test("hides moonshotai from listProviders while keeping operator moonshot", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run40-providers-"));
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");

    await writeFile(
      unifiedRuntimeConfigPath,
      `
version: "1.0"
`,
      "utf8",
    );

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "runtime-host-run40-providers",
      unifiedRuntimeConfigPath,
    });

    const providers = await backend.listProviders();
    expect(providers.some((provider) => provider.providerId === "moonshot")).toBe(true);
    expect(providers.some((provider) => provider.providerId === "moonshotai")).toBe(false);

    await backend.shutdown();
  });
});
