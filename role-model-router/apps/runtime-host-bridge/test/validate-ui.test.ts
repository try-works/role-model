import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test, vi } from "vitest";

import { runRuntimeUiValidation, waitForSessionBootstrapIdle } from "../src/validate-ui.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(__dirname, "fixtures");

describe("runRuntimeUiValidation", () => {
  test("[AC-R27-01] accepts a degraded health response while bootstrap is already idle", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "degraded",
          sessionBootstrap: { status: "ready" },
        }),
        {
          status: 503,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    try {
      await expect(
        waitForSessionBootstrapIdle("http://runtime", { connection: "close" }, 1_000),
      ).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledWith("http://runtime/healthz", {
        headers: { connection: "close" },
      });
    } finally {
      fetchMock.mockRestore();
    }
  });

  test("validates runtime config reads and the main control-plane mutations", async () => {
    const tempRoot = process.env.ROLE_MODEL_TEST_TEMP_ROOT ?? "E:/role-model-temp";
    await mkdir(tempRoot, { recursive: true });
    const runtimeStateRoot = await mkdtemp(path.join(tempRoot, "role-model-runtime-ui-"));
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      [
        'version: "1.0"',
        "routing:",
        "  strategy: baseline",
        "model_aliases:",
        "  mixed.local-remote:",
        "    model_ids:",
        "      - lfm2.5-1.2b-instruct",
        "      - moonshot/kimi-k2.5",
        "    mode: hybrid",
        "llama_swap:",
        "  models:",
        "    lfm2.5-1.2b-instruct:",
        "      path: ./models/lfm2.5-1.2b-instruct.gguf",
        "litellm_proxy:",
        "  providers: {}",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runRuntimeUiValidation({
      repoRoot,
      fixtureRoot: testFixtureRoot,
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
    expect(result.runtimeConfigUpdatedRoutingStrategy).toBe("baseline");
    expect(result.moonshotVariantIds).toEqual(["moonshot-open-platform", "kimi-code"]);
    expect(result.availableRoleIds).toEqual(expect.arrayContaining(["coder", "writer"]));
    expect(result.upsertedAccountId).toBe("moonshot.personal.primary");
    expect(result.accountListIncludesUpsert).toBe(true);
    expect(result.accountRoleBindingIncludesUpsert).toBe(true);
    expect(result.activatedEndpointId).toBe("moonshot.personal.primary.global.kimi-k2.5");
    expect(result.endpointListIncludesActivation).toBe(true);
    expect(result.routedRequestId).toBe("req-runtime-ui-routing-001");
    expect(result.telemetryListIncludesRoutedRequest).toBe(true);
    expect(result.routedRequestRoutingDecisionId).toEqual(expect.any(String));
    expect(result.routedRequestEffectiveMode).toBe("baseline");
    expect(result.routedRequestRewriteReason).toBe("requested-model-matches-downstream");
    expect(result.mixedAliasId).toBe("mixed.local-remote");
    expect(result.mixedAliasModelListIncludesAlias).toBe(false);
    expect(result.mixedAliasRequestId).toBe("req-runtime-ui-mixed-alias-001");
    expect(result.mixedAliasAllowEndpoints).toEqual(
      expect.arrayContaining([
        "llama-swap.local.lfm2-5-1-2b-instruct",
        "moonshot.personal.primary.global.kimi-k2.5",
      ]),
    );
    expect(result.mixedAliasResolvedModelIds).toEqual(
      expect.arrayContaining(["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.5"]),
    );
    expect(result.mixedAliasTelemetryListIncludesRequest).toBe(true);
    expect(result.mixedAliasRequestDetailAliasResolvedModelIds).toEqual(
      expect.arrayContaining(["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.5"]),
    );
    expect(result.mixedAliasRouterDecisionMatchesRequest).toBe(true);
    expect(result.mixedAliasOverviewIncludesSelectedEndpoint).toBe(true);
    expect(result.mixedAliasEndpointsIncludeSelectedEndpoint).toBe(true);

    const rerun = await runRuntimeUiValidation({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-ui-validation",
      unifiedRuntimeConfigPath,
    });
    expect(rerun.activatedEndpointId).toBe("moonshot.personal.primary.global.kimi-k2.5");
  }, 240_000);
});
