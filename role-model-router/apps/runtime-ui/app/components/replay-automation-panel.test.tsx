import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { normalizeReplayAutomationStatus } from "../lib/replay-status";
import { ReplayAutomationPanelView } from "./replay-automation-panel";

const liveStatus = normalizeReplayAutomationStatus({
  ticks: 19,
  paused: false,
  lastOutcome: "ok",
  lastError: null,
  lastDispositions: 2,
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

describe("run97 replay automation panel", () => {
  test("renders loop state, budget, and the pause control", () => {
    const html = renderToStaticMarkup(
      <ReplayAutomationPanelView view={liveStatus} onControl={() => {}} busy={false} />,
    );
    expect(html).toContain("Replay automation");
    expect(html).toContain("19 ticks");
    expect(html).toContain("3/100 counterfactuals");
    expect(html).toContain("7/300 dispatches");
    expect(html).toContain(">Pause<");
  });

  test("offers resume while paused and surfaces the last error", () => {
    const paused = normalizeReplayAutomationStatus({
      ticks: 4,
      paused: true,
      lastOutcome: "degraded",
      lastError: "operations boundary unavailable",
    });
    const html = renderToStaticMarkup(
      <ReplayAutomationPanelView view={paused} onControl={() => {}} busy={false} />,
    );
    expect(html).toContain(">Resume<");
    expect(html).toContain("operations boundary unavailable");
  });

  test("renders an unavailable loop without a control", () => {
    const html = renderToStaticMarkup(
      <ReplayAutomationPanelView
        view={normalizeReplayAutomationStatus(null)}
        onControl={() => {}}
        busy={false}
      />,
    );
    expect(html).toContain("replay automation unavailable");
    expect(html).not.toContain("<button");
  });
});
