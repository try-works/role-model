import { describe, expect, it, vi } from "vitest";

import { type RuntimeRevisionUpdate, createRuntimeRefreshBus } from "./runtime-refresh-bus";

describe("runtime-refresh-bus", () => {
  it("delivers a revision update once to a subscribed surface", () => {
    const bus = createRuntimeRefreshBus();
    const onRefresh = vi.fn();
    const unsubscribe = bus.subscribe("overview", onRefresh);

    const update: RuntimeRevisionUpdate = {
      revision: 7,
      profileRevisionByEndpointId: { "acct.global.gpt-5-high": "rev-a" },
      membershipRevision: "membership-7",
      emittedAtMs: 1_000,
    };
    bus.publishRevisionUpdate(update);

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledWith(update);
    unsubscribe();
  });

  it("deduplicates a repeated revision so a surface refreshes once per revision", () => {
    const bus = createRuntimeRefreshBus();
    const onRefresh = vi.fn();
    bus.subscribe("router", onRefresh);

    const update: RuntimeRevisionUpdate = {
      revision: 9,
      profileRevisionByEndpointId: {},
      membershipRevision: "membership-9",
      emittedAtMs: 1_000,
    };
    bus.publishRevisionUpdate(update);
    bus.publishRevisionUpdate({ ...update, emittedAtMs: 1_001 });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("delivers a newer revision again", () => {
    const bus = createRuntimeRefreshBus();
    const onRefresh = vi.fn();
    bus.subscribe("observe", onRefresh);

    bus.publishRevisionUpdate({
      revision: 1,
      profileRevisionByEndpointId: {},
      membershipRevision: "membership-1",
      emittedAtMs: 1_000,
    });
    bus.publishRevisionUpdate({
      revision: 2,
      profileRevisionByEndpointId: {},
      membershipRevision: "membership-2",
      emittedAtMs: 1_100,
    });

    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it("does not deliver after unsubscribe", () => {
    const bus = createRuntimeRefreshBus();
    const onRefresh = vi.fn();
    const unsubscribe = bus.subscribe("connect", onRefresh);
    unsubscribe();

    bus.publishRevisionUpdate({
      revision: 3,
      profileRevisionByEndpointId: {},
      membershipRevision: "membership-3",
      emittedAtMs: 1_000,
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("isolates subscribers so one surface unsubscribing does not affect another", () => {
    const bus = createRuntimeRefreshBus();
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = bus.subscribe("models", first);
    bus.subscribe("benchmark", second);

    bus.publishRevisionUpdate({
      revision: 4,
      profileRevisionByEndpointId: {},
      membershipRevision: "membership-4",
      emittedAtMs: 1_000,
    });
    unsubscribeFirst();
    bus.publishRevisionUpdate({
      revision: 5,
      profileRevisionByEndpointId: {},
      membershipRevision: "membership-5",
      emittedAtMs: 1_100,
    });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });
});
