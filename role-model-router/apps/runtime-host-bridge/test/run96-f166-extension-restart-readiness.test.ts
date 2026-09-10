import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import * as cli from "../src/cli.js";
import * as bridge from "../src/index.js";
import {
  TRACK_B_CANONICAL_EXTENSION_IDS,
  createProductionExtensionRuntime,
  evaluateProductionExtensionRuntimeReadiness,
} from "../src/track-b-runtime.js";

const temporaryRoots: string[] = [];
const testTempRoot =
  process.env.ROLE_MODEL_TEST_TEMP_ROOT ?? process.env.RUN96_TEST_TEMP_ROOT ?? "E:/role-model-temp";

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

type FakeExtensionRuntime = {
  health(): Record<string, unknown>;
  close(): Promise<void>;
};

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function readFunction<T>(namespace: object, name: string): T | undefined {
  const value = (namespace as Record<string, unknown>)[name];
  return typeof value === "function" ? (value as T) : undefined;
}

/**
 * A health surface whose workers can be placed into any lifecycle.  Lifecycle
 * strings are the real ones the extension host publishes, including the
 * bounded `starting`/`stopping` windows produced by a supervised restart.
 */
function mutableExtensionRuntime() {
  const lifecycles = new Map<string, string>(
    TRACK_B_CANONICAL_EXTENSION_IDS.map((id) => [id, "ready"]),
  );
  const runtime: FakeExtensionRuntime = {
    health: () => {
      const workers = TRACK_B_CANONICAL_EXTENSION_IDS.map((id, index) => ({
        id,
        desiredState: "enabled",
        lifecycle: lifecycles.get(id) ?? "ready",
        pid: 9000 + index,
      }));
      return {
        host: {
          available: true,
          enabled: true,
          extensions: [...TRACK_B_CANONICAL_EXTENSION_IDS],
        },
        supervisor: {
          available: true,
          routingAvailable: true,
          readyWorkers: workers.filter((worker) => worker.lifecycle === "ready").length,
          workers,
        },
      };
    },
    close: async () => undefined,
  };
  return {
    runtime,
    setLifecycle: (id: string, lifecycle: string) => {
      lifecycles.set(id, lifecycle);
    },
  };
}

async function createSlowStartExtensionFixtures(startupDelayMs: number) {
  await mkdir(testTempRoot, { recursive: true });
  const root = await mkdtemp(path.join(testTempRoot, "run96-f166-restart-readiness-"));
  temporaryRoots.push(root);
  return Promise.all(
    TRACK_B_CANONICAL_EXTENSION_IDS.map(async (id, index) => {
      const modulePath = path.join(root, `${index + 1}.mjs`);
      const source =
        `await new Promise((resolve) => setTimeout(resolve, ${startupDelayMs}));\n` +
        `export async function run(envelope){return {available:true,id:${JSON.stringify(id)},requestId:envelope.requestId}}\n`;
      await writeFile(modulePath, source, "utf8");
      return {
        descriptor: {
          id,
          protocolVersion: "1.1.0",
          capabilities: ["health:probe"],
        },
        modulePath,
        artifactSha256: createHash("sha256").update(source).digest("hex"),
      };
    }),
  );
}

describe("Run 96 F166 supervised extension restart readiness", () => {
  test("F166: readiness classification separates bounded restart windows from worker failure", () => {
    expect(evaluateProductionExtensionRuntimeReadiness).toBeTypeOf("function");

    const ready = mutableExtensionRuntime();
    expect(evaluateProductionExtensionRuntimeReadiness(ready.runtime)).toMatchObject({
      state: "ready",
    });

    ready.setLifecycle("evaluation-runner-local", "stopping");
    expect(evaluateProductionExtensionRuntimeReadiness(ready.runtime)).toMatchObject({
      state: "pending",
      pendingIds: ["evaluation-runner-local"],
    });

    ready.setLifecycle("evaluation-runner-local", "starting");
    expect(evaluateProductionExtensionRuntimeReadiness(ready.runtime)).toMatchObject({
      state: "pending",
      pendingIds: ["evaluation-runner-local"],
    });

    ready.setLifecycle("evaluation-runner-local", "exited");
    expect(evaluateProductionExtensionRuntimeReadiness(ready.runtime)).toMatchObject({
      state: "failed",
      failedIds: ["evaluation-runner-local"],
    });

    ready.setLifecycle("evaluation-runner-local", "degraded");
    expect(evaluateProductionExtensionRuntimeReadiness(ready.runtime)).toMatchObject({
      state: "failed",
      failedIds: ["evaluation-runner-local"],
    });
  });

  test("F166: the readiness watchdog tolerates a bounded restart window and still retracts a failed worker", async () => {
    const startWatchdog = readFunction<
      typeof import("../src/cli.js").startCliExtensionRuntimeWatchdog
    >(cli, "startCliExtensionRuntimeWatchdog");
    expect(startWatchdog).toBeTypeOf("function");
    if (!startWatchdog) return;

    const mutable = mutableExtensionRuntime();
    const state: { status: "pending" | "ready" | "failed"; message?: string } = {
      status: "ready",
    };
    let cleanupCount = 0;
    const stop = startWatchdog({
      getRuntime: () => mutable.runtime,
      bootstrapState: state,
      expectedExtensionIds: TRACK_B_CANONICAL_EXTENSION_IDS,
      onFailure: () => {
        cleanupCount += 1;
      },
      intervalMs: 1,
    });
    try {
      mutable.setLifecycle("evaluation-runner-local", "stopping");
      await delay(30);
      expect(cleanupCount).toBe(0);
      expect(state.status).toBe("ready");

      mutable.setLifecycle("evaluation-runner-local", "starting");
      await delay(30);
      expect(cleanupCount).toBe(0);
      expect(state.status).toBe("ready");

      mutable.setLifecycle("evaluation-runner-local", "ready");
      await delay(10);
      expect(cleanupCount).toBe(0);

      mutable.setLifecycle("evaluation-runner-local", "exited");
      await delay(30);
      expect(cleanupCount).toBe(1);
      expect(state.status).toBe("failed");
    } finally {
      stop();
    }
  });

  test("F166: /healthz reports an in-flight restart as pending without permanently failing the runtime", async () => {
    const mutable = mutableExtensionRuntime();
    const state: { status: "pending" | "ready" | "failed"; message?: string } = {
      status: "ready",
    };
    let runtime: FakeExtensionRuntime | null = mutable.runtime;
    let failureCount = 0;
    const backend = {
      effectiveRegistry: {
        endpoints: [],
        diagnostics: [],
        lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
      },
      readHealthStatus: async () => ({ status: "healthy", ready: true }),
    };
    const server = await bridge.startBridgeServer(
      cli.createCliServerOptions(
        { host: "127.0.0.1", port: 0 },
        {
          getBackend: () => backend as never,
          readBootstrapState: () => state,
          readExtensionRuntime: () => runtime,
          onExtensionRuntimeFailure: () => {
            failureCount += 1;
            runtime = null;
            state.status = "failed";
          },
        },
      ),
    );
    try {
      const readyHealth = await fetch(`http://127.0.0.1:${server.port}/healthz`);
      expect(readyHealth.status).toBe(200);

      mutable.setLifecycle("artifact-store", "stopping");
      const pendingHealth = await fetch(`http://127.0.0.1:${server.port}/healthz`);
      expect(pendingHealth.status).toBe(503);
      await expect(pendingHealth.json()).resolves.toEqual(
        expect.objectContaining({
          status: "degraded",
          sessionBootstrap: expect.objectContaining({ status: "pending" }),
        }),
      );
      expect(failureCount).toBe(0);
      expect(runtime).not.toBeNull();

      mutable.setLifecycle("artifact-store", "ready");
      const recovered = await fetch(`http://127.0.0.1:${server.port}/healthz`);
      expect(recovered.status).toBe(200);
      expect(failureCount).toBe(0);

      mutable.setLifecycle("artifact-store", "failed");
      const failedHealth = await fetch(`http://127.0.0.1:${server.port}/healthz`);
      expect(failedHealth.status).toBe(503);
      await expect(failedHealth.json()).resolves.toEqual(
        expect.objectContaining({
          status: "degraded",
          sessionBootstrap: expect.objectContaining({ status: "blocked" }),
        }),
      );
      expect(failureCount).toBe(1);
    } finally {
      await server.close();
    }
  });

  test("F166: restarting every canonical extension under a live watchdog never retracts readiness", async () => {
    const startWatchdog = readFunction<
      typeof import("../src/cli.js").startCliExtensionRuntimeWatchdog
    >(cli, "startCliExtensionRuntimeWatchdog");
    expect(startWatchdog).toBeTypeOf("function");
    if (!startWatchdog) return;

    const extensions = await createSlowStartExtensionFixtures(60);
    const runtime = await createProductionExtensionRuntime({
      stateRoot: path.dirname(extensions[0].modulePath),
      authorizationEpoch: 96,
      repoRoot: path.resolve(import.meta.dirname, "../../../../"),
      extensions,
    });
    const failures: unknown[] = [];
    const state: { status: "pending" | "ready" | "failed"; message?: string } = {
      status: "ready",
    };
    const stop = startWatchdog({
      getRuntime: () => runtime,
      bootstrapState: state,
      expectedExtensionIds: TRACK_B_CANONICAL_EXTENSION_IDS,
      onFailure: (error) => {
        failures.push(error);
      },
      intervalMs: 1,
    });
    try {
      const pidsBefore = new Map(
        (await runtime.listExtensions()).map((row) => [row.id, row.pid] as const),
      );
      for (const id of TRACK_B_CANONICAL_EXTENSION_IDS) {
        const current = (await runtime.listExtensions()).find((row) => row.id === id);
        expect(current?.lifecycle).toBe("ready");
        const receipt = (await runtime.mutateExtension({
          id,
          action: "restart",
          mutationId: `f166:restart:${id}`,
          expectedRevision: Number(current?.revision ?? 1),
        })) as { state: { lifecycle: string; pid: number | null } };
        expect(receipt.state.lifecycle).toBe("ready");
        expect(receipt.state.pid).toBeGreaterThan(0);
        expect(receipt.state.pid).not.toBe(pidsBefore.get(id));
      }
      expect(failures).toEqual([]);
      expect(state.status).toBe("ready");
      expect(runtime.health()).toMatchObject({
        supervisor: { available: true, readyWorkers: TRACK_B_CANONICAL_EXTENSION_IDS.length },
      });
      expect(evaluateProductionExtensionRuntimeReadiness(runtime)).toMatchObject({
        state: "ready",
      });
    } finally {
      stop();
      await runtime.close();
    }
  }, 60_000);

  test("F166: a supervised start that fails is terminal, not an unbounded pending transition", async () => {
    const extensions = await createSlowStartExtensionFixtures(0);
    const runtime = await createProductionExtensionRuntime({
      stateRoot: path.dirname(extensions[0].modulePath),
      authorizationEpoch: 96,
      repoRoot: path.resolve(import.meta.dirname, "../../../../"),
      extensions,
    });
    try {
      const target = extensions[0];
      expect(target.descriptor.id).toBe("artifact-store");
      await rm(target.modulePath, { force: true });
      await expect(
        runtime.mutateExtension({
          id: target.descriptor.id,
          action: "restart",
          mutationId: "f166:restart-failure",
          expectedRevision: 1,
        }),
      ).rejects.toThrow();
      const observed = (await runtime.listExtensions()).find(
        (row) => row.id === target.descriptor.id,
      );
      expect(observed?.lifecycle).toBe("exited");
      expect(observed?.transitioning).toBe(false);
      expect(evaluateProductionExtensionRuntimeReadiness(runtime)).toMatchObject({
        state: "failed",
        failedIds: [target.descriptor.id],
      });
    } finally {
      await runtime.close();
    }
  }, 60_000);
});
