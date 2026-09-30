import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RouterProvider, createMemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";

import { PIN_WEIGHTS_HELP_TEXT } from "../lib/routing-mode";
import { ShellHeaderProvider } from "../lib/shell-header-context";
import ControlRoutingStrategyRoute from "./control-routing-strategy";

const pageSource = readFileSync(new URL("./control-routing-strategy.tsx", import.meta.url), "utf8");

function renderRoute(pathname: string, element: React.ReactElement): string {
  const wrapped = createElement(ShellHeaderProvider, null, element);
  const router = createMemoryRouter([{ path: pathname, element: wrapped }], {
    initialEntries: [pathname],
  });
  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

describe("run 103 routing strategy page", () => {
  test("renders the loading state before the runtime readback arrives", () => {
    expect(
      renderRoute("/app/router/strategy", createElement(ControlRoutingStrategyRoute)),
    ).toContain("Loading routing strategy");
  });

  test("reads the posture from the router config readback and writes a canonical patch", () => {
    expect(pageSource).toContain("fetchRouterConfig");
    expect(pageSource).toContain("updateRuntimeConfig");
    expect(pageSource).toContain("buildRoutingPatchDocument");
    expect(pageSource).toContain("resolveRoutingPostureSummary");
    // The raw-string alias derivation and the legacy mirror must be gone.
    expect(pageSource).not.toContain("formatDraftRoutingAlias");
    expect(pageSource).not.toContain("RuntimeRoutingMode");
    expect(pageSource).not.toContain("Use runtime default");
    expect(pageSource).not.toContain("Custom strategy");
  });

  test("publishes the section-8 controls with the exact copy the controller checks", () => {
    expect(pageSource).toContain("ROUTING_MODE_OPTIONS");
    expect(pageSource).toContain("SCORING_STRATEGY_OPTIONS");
    expect(pageSource).toContain("Pin scoring strategy");
    expect(pageSource).toContain("PIN_WEIGHTS_HELP_TEXT");
    // The page renders this one constant, so the copy is asserted where it is defined.
    expect(PIN_WEIGHTS_HELP_TEXT).toBe(
      "Prevent difficulty classification and Intelligent mode from overriding the saved strategy",
    );
    expect(pageSource).toContain("WEIGHT_METRICS");
    expect(pageSource).toContain("Reset to preset");
    expect(pageSource).toContain("Custom weights");
    expect(pageSource).toContain("Execution scope");
    expect(pageSource).toContain("Resolved posture");
    expect(pageSource).toContain("Measured-latency override");
    expect(pageSource).toContain("LATENCY_COMPARISON_METRIC_COPY");
    expect(pageSource).toContain("Reset to default");
    expect(pageSource).toContain("Evidence behind this setting");
    expect(pageSource).toContain("Active posture");
    // The controller still greps for the save affordance the page has always carried.
    expect(pageSource).toContain("Save and apply strategy");
  });

  test("keeps the latency override on the learning policy API and shows its bounds", () => {
    expect(pageSource).toContain("fetchLearningPolicy");
    expect(pageSource).toContain("saveLearningPolicy");
    expect(pageSource).toContain("validateLatencyOverrideDraft");
    expect(pageSource).toContain("summarizeLatencyOverrideEvidence");
    expect(pageSource).toContain("fetchTelemetryRequests");
  });
});
