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

  test("lists Moonshot Kimi coding models on moonshot and kimi-code variants", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run44-providers-"));
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
      scopeId: "runtime-host-run44-providers",
      unifiedRuntimeConfigPath,
    });

    const providers = await backend.listProviders();
    const moonshot = providers.find((provider) => provider.providerId === "moonshot");
    expect(moonshot).toBeDefined();
    expect(moonshot?.modelIds).toEqual(
      expect.arrayContaining([
        "moonshot/kimi-k2.5",
        "moonshot/kimi-k2.6",
        "moonshot/kimi-k2.7-code",
        "moonshot/kimi-k3",
      ]),
    );

    const openPlatform = moonshot?.variants.find(
      (variant) => variant.variantId === "moonshot-open-platform",
    );
    const kimiCode = moonshot?.variants.find((variant) => variant.variantId === "kimi-code");
    expect(openPlatform?.modelIds).toEqual(
      expect.arrayContaining(["moonshot/kimi-k2.7-code", "moonshot/kimi-k3"]),
    );
    expect(kimiCode?.modelIds).toEqual(
      expect.arrayContaining(["moonshot/kimi-k2.7-code", "moonshot/kimi-k3"]),
    );

    await backend.shutdown();
  });
});
