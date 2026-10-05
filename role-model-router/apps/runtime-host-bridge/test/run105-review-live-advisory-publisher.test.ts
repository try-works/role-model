import { afterEach, describe, expect, test, vi } from "vitest";
import { startDurableRouteAdvisoryRefresh } from "../src/cli.js";
vi.mock("../src/learning-policy-file.js", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    readLearningPolicyFile: () => ({
      effective: {
        stage: "S3",
        cohortPercent: 25,
        evidenceMaxAgeDays: 30,
        revalidationIntervalDays: 7,
      },
    }),
  };
});
afterEach(() => vi.useRealTimers());
describe("run105 production publisher scope", () => {
  test("enumerates actual stored role-task ladders and reads each exact pair, never one scope-only advisory", async () => {
    vi.useFakeTimers();
    const calls: Array<{ capability: string; value: Record<string, unknown> }> = [];
    const pairs = [
      { roleId: "writer", taskTypeId: "coder.review" },
      { roleId: "writer", taskTypeId: "coder.explain" },
    ];
    const stop = startDurableRouteAdvisoryRefresh({
      getRuntime: () =>
        ({
          invoke: async (_id: string, envelope: Record<string, unknown>) => {
            const capability = String(envelope.capability);
            const value = (envelope.value ?? {}) as Record<string, unknown>;
            calls.push({ capability, value });
            if (capability === "knowledge:list-route-ladders")
              return { ladders: pairs, nextCursor: null };
            if (capability === "knowledge:read-route-ladder") return { ...value, ladder: null };
            if (capability === "knowledge:rollout-state")
              return { state: "disabled", cohortPercent: 25, killSwitchAtMs: null };
            return null;
          },
        }) as never,
      repoRoot: ".",
      stateRoot: ".",
      runtimeStateRoot: ".",
      channel: "development",
      scopeId: "publisher-test",
      intervalMs: 15000,
    });
    try {
      await vi.advanceTimersByTimeAsync(0);
      expect(calls.some((call) => call.capability === "knowledge:list-route-ladders")).toBe(true);
      for (const call of calls.filter(
        (item) => item.capability === "knowledge:read-route-ladder",
      )) {
        expect(call.value.scopeId).toBe("publisher-test");
      }
      expect(
        calls
          .filter((call) => call.capability === "knowledge:read-route-ladder")
          .map((call) => ({ roleId: call.value.roleId, taskTypeId: call.value.taskTypeId })),
      ).toEqual(pairs);
    } finally {
      stop();
    }
  });
  test("continues scoped keyset pages and publishes pairs beyond the first64", async () => {
    vi.useFakeTimers();
    const pairs = Array.from({ length: 202 }, (_, index) => ({
      roleId: "writer",
      taskTypeId: `task-${String(index).padStart(3, "0")}`,
    }));
    const readPairs: unknown[] = [];
    const pages: Record<string, unknown>[] = [];
    const stop = startDurableRouteAdvisoryRefresh({
      getRuntime: () =>
        ({
          invoke: async (_id: string, envelope: Record<string, unknown>) => {
            const value = envelope.value as Record<string, unknown>;
            if (envelope.capability === "knowledge:list-route-ladders") {
              pages.push(value);
              return value.afterTaskTypeId
                ? { ladders: pairs.slice(200), total: 202, truncated: false, nextCursor: null }
                : {
                    ladders: pairs.slice(0, 200),
                    total: 202,
                    truncated: true,
                    nextCursor: { afterRoleId: "writer", afterTaskTypeId: "task-199" },
                  };
            }
            if (envelope.capability === "knowledge:read-route-ladder") {
              readPairs.push({ roleId: value.roleId, taskTypeId: value.taskTypeId });
              return { ladder: null };
            }
            return null;
          },
        }) as never,
      repoRoot: ".",
      stateRoot: ".",
      runtimeStateRoot: ".",
      channel: "development",
      scopeId: "paged-publisher",
      intervalMs: 15000,
    });
    try {
      await vi.advanceTimersByTimeAsync(0);
      expect(readPairs).toEqual(pairs);
      expect(pages).toHaveLength(2);
      expect(pages[1]).toMatchObject({
        scopeId: "paged-publisher",
        afterRoleId: "writer",
        afterTaskTypeId: "task-199",
      });
    } finally {
      stop();
    }
  });
  test("a slow refresh never overlaps another timer pass", async () => {
    vi.useFakeTimers();
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let listingCalls = 0;
    const stop = startDurableRouteAdvisoryRefresh({
      getRuntime: () =>
        ({
          invoke: async () => {
            listingCalls++;
            await pending;
            return { ladders: [] };
          },
        }) as never,
      repoRoot: ".",
      stateRoot: ".",
      runtimeStateRoot: ".",
      channel: "development",
      scopeId: "slow-refresh",
      intervalMs: 15_000,
    });
    try {
      await vi.advanceTimersByTimeAsync(45_000);
      expect(listingCalls).toBe(1);
    } finally {
      stop();
      release?.();
      await vi.advanceTimersByTimeAsync(0);
    }
  });
});
