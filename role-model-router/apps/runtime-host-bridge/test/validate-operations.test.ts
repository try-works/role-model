import os from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { runRuntimeOperationsValidation } from "../src/validate-operations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

describe("runRuntimeOperationsValidation", () => {
  test("validates isolated scopes and runtime-state maintenance drills", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-ops-"));

    const result = await runRuntimeOperationsValidation({
      repoRoot,
      runtimeStateRoot,
      hostValidation: async () => ({
        requestId: "req-runtime-host-observability-001",
        endpointId: "test.capture.tool-v1",
        captureId: 0,
      }),
    });

    expect(result.hostValidation).toEqual({
      requestId: "req-runtime-host-observability-001",
      endpointId: "test.capture.tool-v1",
      captureId: 0,
    });
    expect(result.isolation.distinctDatabasePaths).toBe(true);
    expect(result.isolation.distinctScopeIds).toBe(true);
    expect(result.scopes.map((scope) => scope.scopeId)).toEqual([
      "operations-primary",
      "operations-secondary",
    ]);
    expect(result.maintenance.exportSummary.observationCount).toBe(1);
    expect(result.maintenance.exportSummary.profileCount).toBe(1);
    expect(result.maintenance.deletedDatabaseMissing).toBe(true);
    expect(result.maintenance.restoredObservation).toMatchObject({
      requestId: result.scopes[0]?.requestId,
      endpointId: result.scopes[0]?.endpointId,
    });
    expect(result.replayShadow.matchesChosenEndpoint).toBe(true);
    expect(result.replayShadow.replayedEndpointId).toBe(result.scopes[0]?.endpointId);
  });
});
