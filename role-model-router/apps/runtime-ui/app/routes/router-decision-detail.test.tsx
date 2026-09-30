import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RouterProvider, createMemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";

import { ShellHeaderProvider } from "../lib/shell-header-context";
import RouterDecisionDetailRoute from "./router-decision-detail";

const detailSource = readFileSync(
  new URL("./router-decision-detail.tsx", import.meta.url),
  "utf8",
);
const listSource = readFileSync(new URL("./router-decisions.tsx", import.meta.url), "utf8");

describe("run 103 decision surfaces", () => {
  test("renders the decision detail shell", () => {
    const wrapped = createElement(ShellHeaderProvider, null, createElement(RouterDecisionDetailRoute));
    const router = createMemoryRouter(
      [{ path: "/app/router/decisions/:requestId", element: wrapped }],
      { initialEntries: ["/app/router/decisions/req-1"] },
    );
    expect(renderToStaticMarkup(createElement(RouterProvider, { router }))).toContain(
      "Loading routing decision detail",
    );
  });

  test("shows the effective strategy, its source, the weights digest and the latency receipt", () => {
    expect(detailSource).toContain("readStrategyReceipt");
    expect(detailSource).toContain("readLatencyReceipt");
    expect(detailSource).toContain("readAliasPostureReceipt");
    expect(detailSource).toContain("Strategy receipt");
    expect(detailSource).toContain("Latency-override receipt");
    expect(detailSource).toContain("Alias posture binding");
    expect(detailSource).toContain("weightsDigest");
    expect(detailSource).toContain("discardedLabel");
  });

  test("removes the raw config-string fallback from both decision surfaces", () => {
    expect(detailSource).not.toContain("formatRoutingModeLabel(detail.strategyLabel)");
    expect(detailSource).not.toContain("formatRoutingModeLabel");
    expect(listSource).toContain("formatDecisionStrategyLabel");
    expect(listSource).not.toContain("formatRoutingModeLabel");
  });
});
