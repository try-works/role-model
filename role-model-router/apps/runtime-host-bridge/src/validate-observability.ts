import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type RuntimeUiValidationResult, runRuntimeUiValidation } from "./validate-ui.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

export interface RuntimeObservabilityValidationResult
  extends Pick<
    RuntimeUiValidationResult,
    | "routedRequestId"
    | "telemetryListIncludesRoutedRequest"
    | "routedRequestRoutingDecisionId"
    | "mixedAliasTelemetryListIncludesRequest"
    | "mixedAliasRouterDecisionMatchesRequest"
    | "mixedAliasOverviewIncludesSelectedEndpoint"
  > {}

export async function runRuntimeObservabilityValidation(): Promise<RuntimeObservabilityValidationResult> {
  const runtimeStateRoot = await mkdtemp(
    path.join(os.tmpdir(), "role-model-runtime-observability-"),
  );
  const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");

  try {
    await mkdir(runtimeStateRoot, { recursive: true });
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
      fixtureRoot: path.join(__dirname, "..", "test", "fixtures"),
      runtimeStateRoot,
      scopeId: "runtime-observability-validation",
      unifiedRuntimeConfigPath,
    });

    return {
      routedRequestId: result.routedRequestId,
      telemetryListIncludesRoutedRequest: result.telemetryListIncludesRoutedRequest,
      routedRequestRoutingDecisionId: result.routedRequestRoutingDecisionId,
      mixedAliasTelemetryListIncludesRequest: result.mixedAliasTelemetryListIncludesRequest,
      mixedAliasRouterDecisionMatchesRequest: result.mixedAliasRouterDecisionMatchesRequest,
      mixedAliasOverviewIncludesSelectedEndpoint: result.mixedAliasOverviewIncludesSelectedEndpoint,
    };
  } finally {
    await rm(runtimeStateRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] === __filename) {
  console.log(JSON.stringify(await runRuntimeObservabilityValidation(), null, 2));
  process.exit(0);
}
