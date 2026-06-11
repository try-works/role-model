import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, test } from "vitest";

import * as bridge from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures");

describe("session bootstrap health", () => {
  test("exposes bootstrap receipts on /healthz summary after async startup", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `runtime-bootstrap-health-${Date.now()}`);
    const scopeId = "bootstrap-health-tests";

    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
          }) => Promise<{
            readHealthStatus: () => Promise<{
              sessionBootstrap: {
                status: string;
                stages: readonly { stageId: string; status: string }[];
              };
            }>;
            shutdown?: () => Promise<void>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
      });

      let health = await backend.readHealthStatus();
      for (let attempt = 0; attempt < 20 && health.sessionBootstrap.status === "running"; attempt += 1) {
        await delay(50);
        health = await backend.readHealthStatus();
      }

      expect(["ready", "degraded", "blocked"]).toContain(health.sessionBootstrap.status);
      expect(health.sessionBootstrap.stages.length).toBeGreaterThan(0);
      expect(health.sessionBootstrap.stages.map((stage) => stage.stageId)).toContain("credentials");
      await backend.shutdown?.();
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
