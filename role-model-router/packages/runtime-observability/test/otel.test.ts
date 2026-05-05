import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, test } from "vitest";

import { runRuntimeAdapterValidation } from "@role-model-router/adapter-execution/cli";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

async function readJson<T>(relativePath: string): Promise<T> {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

describe("runtime-observability otel mapping", () => {
  test("derives a deterministic OpenTelemetry export from canonical role-model artifacts", async () => {
    const runtimeModuleImport = import(
      pathToFileURL(path.join(__dirname, "..", "src", "index.js")).href
    );
    const otelModuleImport = import(pathToFileURL(path.join(__dirname, "..", "src", "otel.js")).href);
    await expect(runtimeModuleImport).resolves.toHaveProperty("createRuntimeObservationBundle");
    await expect(otelModuleImport).resolves.toHaveProperty("createOpenTelemetryGenAiExport");

    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-observability-otel-"),
    );

    try {
      const runtimeObservability = (await runtimeModuleImport) as {
        createRuntimeObservationBundle(input: Record<string, unknown>): Record<string, unknown>;
      };
      const otel = (await otelModuleImport) as {
        createOpenTelemetryGenAiExport(
          bundle: Record<string, unknown>,
        ): { traceId: string; spanId: string; attributes: Record<string, unknown> };
      };
      const validation = await runRuntimeAdapterValidation({
        repoRoot,
        runtimeStateRoot,
        scopeId: "runtime-observability-otel-test",
      });
      const history = await readJson<{
        byEndpointId: Record<string, unknown[]>;
      }>("testdata/router-runtime/observability-history.json");
      const policy = await readJson<Record<string, unknown>>(
        "testdata/router-runtime/observability-policy.json",
      );

      const bundle = runtimeObservability.createRuntimeObservationBundle({
        decision: validation.decision,
        routingDiagnostics: validation.routingDiagnostics,
        retrievalReceipt: validation.retrievalReceipt,
        contextEnvelope: validation.contextEnvelope,
        execution: validation.execution,
        priorSamples: history.byEndpointId[validation.decision.chosen_endpoint_id] ?? [],
        maintenancePolicy: {
          "redaction.level": "strict",
          "retention.class": "standard",
        },
        capturePolicy: policy,
      });

      expect(otel.createOpenTelemetryGenAiExport(bundle)).toEqual({
        traceId: expect.any(String),
        spanId: expect.any(String),
        attributes: expect.objectContaining({
          "gen_ai.request.id": validation.decision.request_id,
          "gen_ai.response.model": validation.execution.target.modelId,
          "gen_ai.usage.input_tokens": validation.execution.usageEvent.tokens_in,
          "gen_ai.usage.output_tokens": validation.execution.usageEvent.tokens_out,
          "role_model.routing.decision_id": validation.decision.routing_decision_id,
          "role_model.endpoint.id": validation.decision.chosen_endpoint_id,
          "role_model.cache.prompt_cache_used": false,
          "role_model.capture.redaction_level": "strict",
        }),
      });
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
