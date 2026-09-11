import { afterEach, describe, expect, test } from "vitest";

import * as cli from "../src/cli.js";
import {
  TRACK_B_CANONICAL_EXTENSION_IDS,
  evaluateProductionExtensionRuntimeReadiness,
} from "../src/track-b-runtime.js";

const { projectCliStartupReadiness } = cli;

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
 * R8/R24/R30: ordinary routing must stay available when an extension that
 * routing does not depend on degrades. Only a failure of the host transport,
 * the supervisor, or the supervisor's declared routing availability is fatal
 * to the whole runtime.
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
        pid: 9100 + index,
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
    mutateHealth: (mutate: (health: Record<string, unknown>) => void) => {
      const original = runtime.health;
      runtime.health = () => {
        const health = original();
        mutate(health);
        return health;
      };
    },
  };
}

afterEach(async () => undefined);

describe("Run 96 F188b routing-nondependency degradation", () => {
  test("F188b: a terminal routing-nondependent worker degrades instead of failing the runtime", () => {
    const mutable = mutableExtensionRuntime();
    expect(evaluateProductionExtensionRuntimeReadiness(mutable.runtime)).toMatchObject({
      state: "ready",
    });

    mutable.setLifecycle("background-evidence-scheduler", "failed");
    expect(evaluateProductionExtensionRuntimeReadiness(mutable.runtime)).toMatchObject({
      state: "degraded",
      failedIds: ["background-evidence-scheduler"],
    });

    mutable.setLifecycle("event-log", "exited");
    const multipleDegraded = evaluateProductionExtensionRuntimeReadiness(mutable.runtime);
    expect(multipleDegraded).toMatchObject({ state: "degraded" });
    expect([...((multipleDegraded as { failedIds: readonly string[] }).failedIds)].sort()).toEqual(
      ["background-evidence-scheduler", "event-log"],
    );
  });

  test("F188b: a broken host transport or routing boundary is still fatal", () => {
    const unavailableHost = mutableExtensionRuntime();
    unavailableHost.mutateHealth((health) => {
      (health.host as Record<string, unknown>).available = false;
    });
    expect(evaluateProductionExtensionRuntimeReadiness(unavailableHost.runtime)).toMatchObject({
      state: "failed",
    });

    const routingUnavailable = mutableExtensionRuntime();
    routingUnavailable.mutateHealth((health) => {
      (health.supervisor as Record<string, unknown>).routingAvailable = false;
    });
    expect(
      evaluateProductionExtensionRuntimeReadiness(routingUnavailable.runtime),
    ).toMatchObject({ state: "failed" });

    const missingWorker = mutableExtensionRuntime();
    missingWorker.mutateHealth((health) => {
      (health.host as Record<string, unknown>).extensions = [
        ...TRACK_B_CANONICAL_EXTENSION_IDS.filter((id) => id !== "knowledge-worker"),
      ];
    });
    expect(evaluateProductionExtensionRuntimeReadiness(missingWorker.runtime)).toMatchObject({
      state: "failed",
    });
  });

  test("F188b: the watchdog keeps a degraded runtime alive and still tears down a fatal one", async () => {
    const startWatchdog = readFunction<
      typeof import("../src/cli.js").startCliExtensionRuntimeWatchdog
    >(cli, "startCliExtensionRuntimeWatchdog");
    expect(startWatchdog).toBeTypeOf("function");
    if (!startWatchdog) return;

    const mutable = mutableExtensionRuntime();
    const state: { status: "pending" | "ready" | "degraded" | "failed"; message?: string } = {
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
      mutable.setLifecycle("background-evidence-scheduler", "failed");
      await delay(30);
      expect(cleanupCount).toBe(0);
      expect(state.status).toBe("degraded");

      mutable.setLifecycle("background-evidence-scheduler", "ready");
      await delay(30);
      expect(state.status).toBe("ready");

      mutable.mutateHealth((health) => {
        (health.supervisor as Record<string, unknown>).routingAvailable = false;
      });
      await delay(30);
      expect(cleanupCount).toBe(1);
      expect(state.status).toBe("failed");
    } finally {
      stop();
    }
  });

  test("F188b: the HTTP boundary only blocks when routing itself is unavailable", () => {
    expect(projectCliStartupReadiness({ status: "ready" })).toMatchObject({ ready: true });
    expect(
      projectCliStartupReadiness({
        status: "degraded",
        message: "production extension runtime is degraded while routing remains available",
      }),
    ).toMatchObject({ ready: true, status: "degraded" });
    expect(projectCliStartupReadiness({ status: "pending" })).toMatchObject({ ready: false });
    expect(projectCliStartupReadiness({ status: "failed" })).toMatchObject({ ready: false });
  });
});
