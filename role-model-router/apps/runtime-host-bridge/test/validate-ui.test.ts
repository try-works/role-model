import os from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { runRuntimeUiValidation } from "../src/validate-ui.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

describe("runRuntimeUiValidation", () => {
  test("validates runtime summary, provider variants, account upserts, and endpoint activation", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-ui-"));

    const result = await runRuntimeUiValidation({
      repoRoot,
      runtimeStateRoot,
      scopeId: "runtime-ui-validation",
    });

    expect(result.providerCount).toBe(3);
    expect(result.accountCount).toBeGreaterThanOrEqual(2);
    expect(result.endpointCount).toBeGreaterThanOrEqual(2);
    expect(result.moonshotVariantIds).toEqual(["moonshot-open-platform", "kimi-code"]);
    expect(result.availableRoleIds).toEqual(expect.arrayContaining(["general.chat"]));
    expect(result.upsertedAccountId).toBe("moonshot.personal.primary");
    expect(result.accountListIncludesUpsert).toBe(true);
    expect(result.accountRoleBindingIncludesUpsert).toBe(true);
    expect(result.activatedEndpointId).toBe("moonshot.personal.primary.global.kimi-k2.5");
    expect(result.endpointListIncludesActivation).toBe(true);
  });
});
