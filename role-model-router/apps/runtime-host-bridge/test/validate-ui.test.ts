import os from "node:os";
import path from "node:path";
import { mkdtemp, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { runRuntimeUiValidation } from "../src/validate-ui.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

describe("runRuntimeUiValidation", () => {
  test("validates runtime config reads and the main control-plane mutations", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-ui-"));
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      [
        "version: 1.0",
        "routing:",
        "  strategy: balanced",
        "llama_swap:",
        "  models: {}",
        "litellm_proxy:",
        "  providers: {}",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runRuntimeUiValidation({
      repoRoot,
      runtimeStateRoot,
      scopeId: "runtime-ui-validation",
      unifiedRuntimeConfigPath,
    });

    expect(result.providerCount).toBeGreaterThan(3);
    expect(result.accountCount).toBeGreaterThanOrEqual(1);
    expect(result.endpointCount).toBeGreaterThanOrEqual(1);
    expect(result.runtimeConfigPath).toBe(unifiedRuntimeConfigPath);
    expect(result.runtimeConfigInitialApplied).toBe(true);
    expect(result.runtimeConfigUpdatedVersion).toBe("1.1");
    expect(result.runtimeConfigUpdatedRoutingStrategy).toBe("latency-first");
    expect(result.moonshotVariantIds).toEqual(["moonshot-open-platform", "kimi-code"]);
    expect(result.availableRoleIds).toEqual(expect.arrayContaining(["general.chat"]));
    expect(result.upsertedAccountId).toBe("moonshot.personal.primary");
    expect(result.accountListIncludesUpsert).toBe(true);
    expect(result.accountRoleBindingIncludesUpsert).toBe(true);
    expect(result.activatedEndpointId).toBe("moonshot.personal.primary.global.kimi-k2.5");
    expect(result.endpointListIncludesActivation).toBe(true);
  });
});
