import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, test } from "vitest";

import * as bridge from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures");

describe("remote health bootstrap", () => {
  test("skips remote-health probes in decision_only mode", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `remote-health-skip-${Date.now()}`);
    const scopeId = "remote-health-skip-tests";

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
                stages: readonly { stageId: string; status: string; message?: string }[];
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

      const remoteHealthStage = health.sessionBootstrap.stages.find(
        (stage) => stage.stageId === "remote-health",
      );
      expect(remoteHealthStage?.status).toBe("skipped");
      expect(remoteHealthStage?.message).toContain("decision_only");
      await backend.shutdown?.();
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
