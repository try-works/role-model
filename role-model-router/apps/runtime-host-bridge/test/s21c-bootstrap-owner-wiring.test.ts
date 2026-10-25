import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  type BootstrapShape,
  bootstrapOwner,
  composeBootstrapOwner,
} from "../src/composition-dag.js";
import { createRuntimeBridgeBackend } from "../src/index.js";

/**
 * Run 115 S21c (R27): the Bootstrap owner is constructed by the composition DAG's layer, and the
 * host receives that exact singleton. A per-call/second construction (the legacy fallback shape)
 * fails the identity assertion.
 */

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const fixtureRoot = path.join(import.meta.dirname, "fixtures-restart-rehydration");
const baseTemp = path.join("E:", "role-model-run115");
const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })),
  );
});

async function tempStateRoot(): Promise<string> {
  await mkdir(baseTemp, { recursive: true });
  const root = await mkdtemp(path.join(baseTemp, "s21c-"));
  tempRoots.push(root);
  return root;
}

describe("S21c bootstrap owner wiring", () => {
  test("the host calls the exact Bootstrap instance it received from the DAG", async () => {
    const runtimeStateRoot = await tempStateRoot();
    const captured: BootstrapShape[] = [];
    let pendingCalls = 0;
    let runCalls = 0;
    const observedOwner: BootstrapShape = {
      ...bootstrapOwner,
      pending: () => {
        pendingCalls += 1;
        return bootstrapOwner.pending();
      },
      run: (handlers) => {
        runCalls += 1;
        return bootstrapOwner.run(handlers);
      },
    };
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "s21c-bootstrap-owner",
      runtimeVendorStartup: "disabled",
      bootstrapOwner: observedOwner,
      onBootstrapOwner: (owner) => captured.push(owner),
    });
    try {
      expect(captured).toHaveLength(1);
      expect(captured[0]).toBe(observedOwner);
      expect(observedOwner.id).toMatch(/^bootstrap:/);
      expect(pendingCalls).toBe(1);
      const deadline = Date.now() + 5000;
      while (runCalls === 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      expect(runCalls).toBe(1);

      // The real backend still answers the bootstrap projection through the same owner.
      const health = await backend.readHealthStatus();
      expect(health.sessionBootstrap.status).toMatch(/^(pending|running|ready|degraded|blocked)$/);
    } finally {
      await backend.shutdown();
    }
  });

  test("a second DAG construction is a different instance, so per-call fallback cannot pass identity", () => {
    const second = composeBootstrapOwner();
    expect(second).not.toBe(bootstrapOwner);
    expect(second.id).toBe(bootstrapOwner.id);
  });
});
