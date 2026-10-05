import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { expect, test } from "vitest";

import { runRuntimeAdapterValidation } from "@role-model-router/adapter-execution/cli";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

// Run 98 addendum 40 (L1): the observation bundle must carry the provider breakdown so telemetry can
// report the duration the client waited for instead of only the provider's response-header time.
test("a40 L1: the observation bundle carries the provider breakdown only when it was measured", async () => {
  const moduleImport = import(pathToFileURL(path.join(__dirname, "..", "src", "index.js")).href);
  const runtimeObservability = (await moduleImport) as {
    createRuntimeObservationBundle(input: Record<string, unknown>): Record<string, unknown>;
  };
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run98-a40-breakdown-"));
  const validation = await runRuntimeAdapterValidation({
    repoRoot,
    fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
    runtimeStateRoot,
    scopeId: "run98-a40-breakdown",
  });
  const baseInput = {
    decision: validation.decision,
    routingDiagnostics: validation.routingDiagnostics,
    retrievalReceipt: validation.retrievalReceipt,
    contextEnvelope: validation.contextEnvelope,
    execution: validation.execution,
    maintenancePolicy: {},
    capturePolicy: {
      environment: "development",
      redactionLevel: "strict",
      retentionClass: "standard",
      structuredInspectionMode: "summary",
    },
  };

  const withBreakdown = runtimeObservability.createRuntimeObservationBundle({
    ...baseInput,
    latencyBreakdown: {
      providerHeaderMs: 2_592,
      providerCompletionMs: 58_000,
      timeToFirstTokenMs: 900,
    },
  }) as { latencyBreakdown?: Record<string, unknown> };
  expect(withBreakdown.latencyBreakdown).toEqual({
    providerHeaderMs: 2_592,
    providerCompletionMs: 58_000,
    timeToFirstTokenMs: 900,
  });

  const withoutBreakdown = runtimeObservability.createRuntimeObservationBundle({
    ...baseInput,
  }) as Record<string, unknown>;
  expect("latencyBreakdown" in withoutBreakdown).toBe(false);
});
