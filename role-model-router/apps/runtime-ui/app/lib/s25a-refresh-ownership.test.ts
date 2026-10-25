import { describe, expect, it } from "vitest";

import { startDeferredLiveRefresh } from "./live-refresh";
import type { RuntimeEventSourceFactory } from "./runtime-api";
import { subscribeRuntimeRefreshStream } from "./runtime-api";
import { createRuntimeRefreshBus } from "./runtime-refresh-bus";
import {
  createStaleChartDiagnostic,
  getStaleRefreshDiagnostics,
  resetStaleRefreshDiagnostics,
  resolveTelemetryChartRefresh,
} from "./stale-refresh-diagnostics";

/**
 * Run 115 S25a (R12): characterize the existing refresh ownership and event-source seams.
 *
 * The factory is already injectable. There is one subscription per startDeferredLiveRefresh
 * owner, disposed exactly once; there is no process/page-global owner (the call sites each own
 * their surface). A revision jump reaches the refresh handler; there is no explicit gap marker or
 * last-event-id, so this proves "a later revision after a gap triggers a full reload", not
 * detection of a gap with no later event. Stale refresh diagnostics expose staleDataReused and
 * the stale chart titles.
 */

interface FakeSource {
  readonly listeners: Map<string, (event: MessageEvent<string>) => void>;
  readonly closed: () => number;
}

function fakeFactory(sources: FakeSource[]): RuntimeEventSourceFactory {
  return (url: string) => {
    const listeners = new Map<string, (event: MessageEvent<string>) => void>();
    let closed = 0;
    const source = {
      listeners,
      closed: () => closed,
    };
    sources.push(source);
    expect(url).toBe("/api/role-model/telemetry/stream");
    return {
      addEventListener: (type, listener) => listeners.set(type, listener),
      close: () => {
        closed += 1;
      },
    };
  };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("S25a refresh ownership and event-source characterization", () => {
  it("uses an injected RuntimeEventSourceFactory and closes it on dispose", () => {
    const sources: FakeSource[] = [];
    const events: unknown[] = [];
    const dispose = subscribeRuntimeRefreshStream(
      (event) => events.push(event),
      fakeFactory(sources),
    );
    expect(sources).toHaveLength(1);
    sources[0]?.listeners.get("revision.update")?.({
      data: JSON.stringify({ revision: 7 }),
    } as MessageEvent<string>);
    expect(events).toEqual([{ revision: 7 }]);
    dispose();
    expect(sources[0]?.closed()).toBe(1);
  });

  it("owns exactly one active subscription per start and leaks none across two start/stop cycles", async () => {
    let active = 0;
    let peak = 0;
    let starts = 0;
    let sourceCount = 0;
    const start = (): (() => void) =>
      startDeferredLiveRefresh({
        load: async () => undefined,
        subscribe: () => {
          starts += 1;
          sourceCount += 1;
          active += 1;
          peak = Math.max(peak, active);
          let closed = false;
          return () => {
            if (closed) return;
            closed = true;
            active -= 1;
          };
        },
      });

    const first = start();
    await tick();
    await tick();
    expect(starts).toBe(1);
    expect(active).toBe(1);
    first();
    first();
    expect(active).toBe(0);

    const second = start();
    await tick();
    await tick();
    expect(starts).toBe(2);
    expect(active).toBe(1);
    second();
    second();
    expect(active).toBe(0);
    expect(peak).toBe(1);
    expect(sourceCount).toBe(2);
  });

  it("has no page-global owner: two independent owners each open their own source", async () => {
    let active = 0;
    const start = (): (() => void) =>
      startDeferredLiveRefresh({
        load: async () => undefined,
        subscribe: () => {
          active += 1;
          let closed = false;
          return () => {
            if (closed) return;
            closed = true;
            active -= 1;
          };
        },
      });
    const first = start();
    const second = start();
    await tick();
    await tick();
    expect(active).toBe(2);
    first();
    expect(active).toBe(1);
    second();
    expect(active).toBe(0);
  });

  it("a later revision after a gap reaches the refresh handler (no silent continuation); no explicit gap marker exists", () => {
    const bus = createRuntimeRefreshBus();
    const seen: number[] = [];
    const unsubscribe = bus.subscribe("overview", (update) => seen.push(update.revision));
    bus.publishRevisionUpdate({
      revision: 1,
      profileRevisionByEndpointId: {},
      membershipRevision: null,
      emittedAtMs: 1,
    });
    // revision 2 was missed; revision 3 must still trigger a full reload handler.
    bus.publishRevisionUpdate({
      revision: 3,
      profileRevisionByEndpointId: {},
      membershipRevision: null,
      emittedAtMs: 3,
    });
    bus.publishRevisionUpdate({
      revision: 3,
      profileRevisionByEndpointId: {},
      membershipRevision: null,
      emittedAtMs: 3,
    });
    expect(seen).toEqual([1, 3]);
    unsubscribe();
    bus.publishRevisionUpdate({
      revision: 4,
      profileRevisionByEndpointId: {},
      membershipRevision: null,
      emittedAtMs: 4,
    });
    expect(seen).toEqual([1, 3]);
  });

  it("a reused stale chart is visible as stale in the returned titles and diagnostic field", () => {
    resetStaleRefreshDiagnostics();
    const resolved = resolveTelemetryChartRefresh({
      background: true,
      chartResults: [
        { status: "rejected", reason: new Error("refresh failed") },
        { status: "fulfilled", value: { points: [1] } },
      ],
      createDiagnostic: (definition, reason) =>
        createStaleChartDiagnostic({
          routeId: "dashboard",
          chartTitle: definition.title,
          querySnapshot: "range=24h",
          error: reason,
        }),
      definitions: [{ title: "Chart A" }, { title: "Chart B" }],
      getErrorMessage: (_title, reason) => String(reason),
      previousCharts: [{ definition: { title: "Chart A" }, response: { points: [0] } }],
    });
    expect(resolved.staleChartTitles).toEqual(["Chart A"]);
    expect(resolved.charts[0]?.response).toEqual({ points: [0] });
    const diagnostics = getStaleRefreshDiagnostics();
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      chartTitle: "Chart A",
      routeId: "dashboard",
      staleDataReused: true,
    });
  });
});
