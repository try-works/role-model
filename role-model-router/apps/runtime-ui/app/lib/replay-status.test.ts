import { describe, expect, test } from "vitest";

import {
  controlActionFor,
  formatReplayBudget,
  normalizeReplayAutomationStatus,
} from "./replay-status";

describe("run97 replay automation view model", () => {
  test("normalizes a live status payload", () => {
    const view = normalizeReplayAutomationStatus({
      ticks: 19,
      running: false,
      paused: false,
      lastOutcome: "ok",
      lastError: null,
      lastProcessedAtMs: 1789196244218,
      budget: {
        window: "2026-09-12",
        counterfactuals: 3,
        reservedCounterfactuals: 1,
        reservedDispatches: 2,
        dispatches: 7,
        counterfactualLimit: 100,
        dispatchLimit: 300,
      },
      lastDispositions: 2,
    });
    expect(view.available).toBe(true);
    expect(view.paused).toBe(false);
    expect(view.ticks).toBe(19);
    expect(view.lastOutcome).toBe("ok");
    expect(view.budget).toMatchObject({
      window: "2026-09-12",
      counterfactuals: 3,
      dispatches: 7,
      dispatchLimit: 300,
    });
  });

  test("reports an unavailable loop without throwing", () => {
    const view = normalizeReplayAutomationStatus(null);
    expect(view.available).toBe(false);
    expect(view.paused).toBe(false);
    expect(view.ticks).toBe(0);
    expect(view.budget).toBeNull();
    expect(controlActionFor(view)).toBeNull();
  });

  test("control action follows the paused state", () => {
    const running = normalizeReplayAutomationStatus({ paused: false, ticks: 1 });
    const paused = normalizeReplayAutomationStatus({ paused: true, ticks: 1 });
    expect(controlActionFor(running)).toBe("pause");
    expect(controlActionFor(paused)).toBe("resume");
  });

  test("budget summary stays readable and bounded", () => {
    const view = normalizeReplayAutomationStatus({
      ticks: 1,
      budget: {
        window: "2026-09-12",
        counterfactuals: 3,
        reservedCounterfactuals: 1,
        reservedDispatches: 2,
        dispatches: 7,
        counterfactualLimit: 100,
        dispatchLimit: 300,
      },
    });
    expect(formatReplayBudget(view)).toBe(
      "3/100 counterfactuals · 7/300 dispatches · 2 reserved · window 2026-09-12",
    );
    expect(formatReplayBudget(normalizeReplayAutomationStatus(null))).toBe(
      "replay automation unavailable",
    );
  });
});
