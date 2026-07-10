import { describe, expect, test, vi } from "vitest";

import { startDeferredLiveRefresh } from "./live-refresh";

describe("startDeferredLiveRefresh", () => {
  test("waits for the initial load to finish before subscribing to live updates", async () => {
    const events: string[] = [];
    let resolveInitialLoad: VoidFunction | undefined;
    let onEvent: (() => void | Promise<void>) | undefined;
    const unsubscribe = vi.fn(() => {
      events.push("unsubscribe");
    });

    startDeferredLiveRefresh({
      load: async (background) => {
        events.push(background ? "load:background" : "load:initial");
        if (background) {
          return;
        }
        await new Promise<void>((resolve) => {
          resolveInitialLoad = () => {
            events.push("load:initial:resolved");
            resolve();
          };
        });
      },
      subscribe: (callback) => {
        events.push("subscribe");
        onEvent = callback;
        return unsubscribe;
      },
    });

    expect(events).toEqual(["load:initial"]);

    expect(resolveInitialLoad).toBeTypeOf("function");
    const settleInitialLoad = resolveInitialLoad;
    if (!settleInitialLoad) {
      throw new Error("expected initial load resolver");
    }
    settleInitialLoad();
    await vi.waitFor(() => {
      expect(events).toEqual(["load:initial", "load:initial:resolved", "subscribe"]);
    });

    expect(onEvent).toBeTypeOf("function");
    const emitEvent = onEvent;
    if (!emitEvent) {
      throw new Error("expected live event callback");
    }
    await emitEvent();

    expect(events).toEqual([
      "load:initial",
      "load:initial:resolved",
      "subscribe",
      "load:background",
    ]);
  });

  test("skips subscription work when disposed before the initial load settles", async () => {
    const subscribe = vi.fn();
    let resolveInitialLoad: VoidFunction | undefined;

    const dispose = startDeferredLiveRefresh({
      load: async () => {
        await new Promise<void>((resolve) => {
          resolveInitialLoad = resolve;
        });
      },
      subscribe,
    });

    dispose();
    expect(resolveInitialLoad).toBeTypeOf("function");
    const settleInitialLoad = resolveInitialLoad;
    if (!settleInitialLoad) {
      throw new Error("expected initial load resolver");
    }
    settleInitialLoad();

    await Promise.resolve();
    await Promise.resolve();

    expect(subscribe).not.toHaveBeenCalled();
  });
});
