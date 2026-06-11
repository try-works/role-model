import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, test } from "vitest";

import { createRuntimeBridgeBackend } from "../src/index.js";
import { resolveOperatorIntentPath } from "../src/operator-intent.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures");

describe("operator intent corrupt manifest", () => {
  test("surfaces corrupt operator-intent diagnostics and blocks bootstrap", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `operator-intent-corrupt-${Date.now()}`);
    const scopeId = "operator-intent-corrupt-tests";
    const intentPath = resolveOperatorIntentPath({ runtimeStateRoot, scopeId });

    await mkdir(path.dirname(intentPath), { recursive: true });
    await writeFile(intentPath, "{ not-valid-json", "utf8");

    try {
      const backend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
      });

      let health = await backend.readHealthStatus();
      for (
        let attempt = 0;
        attempt < 40 && health.sessionBootstrap.status === "running";
        attempt += 1
      ) {
        await delay(50);
        health = await backend.readHealthStatus();
      }

      const summary = await backend.readRuntimeSummary();
      expect(summary.operatorIntent.status).toBe("corrupt");
      expect(summary.operatorIntent.message).toEqual(expect.any(String));
      expect(health.sessionBootstrap.status).toBe("blocked");
      expect(
        health.sessionBootstrap.stages.find((stage) => stage.stageId === "credentials")?.status,
      ).toBe("failed");

      await backend.shutdown?.();
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
