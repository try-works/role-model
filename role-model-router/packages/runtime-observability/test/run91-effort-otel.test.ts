import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, test } from "vitest";

import { runRuntimeAdapterValidation } from "@role-model-router/adapter-execution/cli";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), "utf8")) as T;
}

describe("Run 91 runtime effort receipts", () => {
  test("persists exact effort fields on the observation and maps them to OTel", async () => {
    const runtimeModuleImport = import(
      pathToFileURL(path.join(__dirname, "..", "src", "index.js")).href
    );
    const otelModuleImport = import(
      pathToFileURL(path.join(__dirname, "..", "src", "otel.js")).href
    );
    await expect(runtimeModuleImport).resolves.toHaveProperty("createRuntimeObservationBundle");
    await expect(otelModuleImport).resolves.toHaveProperty("createOpenTelemetryGenAiExport");

    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-run91-effort-"),
    );
    try {
      const runtimeObservability = (await runtimeModuleImport) as {
        createRuntimeObservationBundle(input: Record<string, unknown>): Record<string, unknown>;
      };
      const otel = (await otelModuleImport) as {
        createOpenTelemetryGenAiExport(bundle: Record<string, unknown>): {
          attributes: Record<string, unknown>;
        };
      };
      const validation = await runRuntimeAdapterValidation({
        repoRoot,
        fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
        runtimeStateRoot,
        scopeId: "runtime-observability-run91-effort-test",
      });
      const history = await readJson<{ byEndpointId: Record<string, unknown[]> }>(
        "testdata/router-runtime/observability-history.json",
      );
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
        capturePolicy: policy,
        reasoningEffort: "medium",
        effortSource: "variant",
      });

      expect(bundle).toMatchObject({
        reasoningEffort: "medium",
        effortSource: "variant",
        usageEvent: {
          reasoning_effort: "medium",
          effort_source: "variant",
        },
      });
      expect(otel.createOpenTelemetryGenAiExport(bundle).attributes).toMatchObject({
        "role_model.reasoning_effort": "medium",
        "role_model.effort_source": "variant",
      });
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("normalizes missing historical effort receipt to provider-default null", async () => {
    const runtimeModuleImport = await import(
      pathToFileURL(path.join(__dirname, "..", "src", "index.js")).href
    );
    expect(runtimeModuleImport.normalizeRuntimeEffortReceipt({})).toEqual({
      reasoningEffort: null,
      effortSource: "none",
    });
  });
});
