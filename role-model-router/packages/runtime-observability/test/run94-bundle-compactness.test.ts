import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { expect, test } from "vitest";

import { runRuntimeAdapterValidation } from "@role-model-router/adapter-execution/cli";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

test("run94 F7: bundle output never carries cumulative history or recentSamples", async () => {
  const moduleImport = import(pathToFileURL(path.join(__dirname, "..", "src", "index.js")).href);
  const runtimeObservability = (await moduleImport) as {
    createRuntimeObservationBundle(input: Record<string, unknown>): Record<string, unknown>;
  };
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run94-bundle-compact-"));
  const validation = await runRuntimeAdapterValidation({
    repoRoot,
    fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
    runtimeStateRoot,
    scopeId: "run94-bundle-compact",
  });
  const priorSamples = [
    {
      endpoint_id: validation.decision.chosen_endpoint_id,
      endpoint_version: "legacy",
      source_type: "live_request",
      timestamp_ms: Date.now() - 60_000,
      latency_ms: 300,
      success: true,
    },
    {
      endpoint_id: validation.decision.chosen_endpoint_id,
      endpoint_version: "legacy",
      source_type: "live_request",
      timestamp_ms: Date.now() - 30_000,
      latency_ms: 200,
      success: true,
    },
  ];
  const bundle = runtimeObservability.createRuntimeObservationBundle({
    decision: validation.decision,
    routingDiagnostics: validation.routingDiagnostics,
    retrievalReceipt: validation.retrievalReceipt,
    contextEnvelope: validation.contextEnvelope,
    execution: validation.execution,
    priorSamples,
    maintenancePolicy: {},
    capturePolicy: {
      environment: "development",
      redactionLevel: "strict",
      retentionClass: "standard",
      structuredInspectionMode: "summary",
    },
  }) as {
    observedPerformance: Record<string, unknown>;
    inspection: { endpoint: Record<string, unknown> };
  };
  expect(bundle.observedPerformance).not.toHaveProperty("history");
  expect(bundle.inspection.endpoint).not.toHaveProperty("recentSamples");
  expect(JSON.stringify(bundle)).not.toContain("recentSamples");
  expect(JSON.stringify(bundle)).not.toContain('"history"');
  // The aggregate profile is still computed for the immediate UI update.
  expect(bundle.observedPerformance.profile).toBeTruthy();
});
