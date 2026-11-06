import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { renderToString } from "@role-model-router/foldkit/experimental/server";

import { telemetryChartCard } from "../src/features/overview/charts.js";
import { tanstackChartSvg } from "../src/features/overview/tanstack-chart.js";
import { shellModel } from "./support/runtime-shell.js";

/** S612 (R9/R10): TanStack Charts is the chart engine behind the Foldkit Html surface. */

const series = [
  {
    id: "latency",
    label: "Latency",
    points: [
      { label: "00:00", value: 10 },
      { label: "01:00", value: 30 },
      { label: "02:00", value: null },
    ],
  },
  {
    id: "tokens",
    label: "Tokens",
    points: [
      { label: "00:00", value: 4 },
      { label: "01:00", value: 8 },
      { label: "02:00", value: 2 },
    ],
  },
];

describe("S612 TanStack chart adapter", () => {
  it("renders responsive, accessible static SVG through TanStack Charts", () => {
    const svg = tanstackChartSvg(series, { ariaLabel: "Latency trend", height: 220, width: 640 });
    expect(svg).toContain("<svg");
    expect(svg).toContain('aria-label="Latency trend"');
    expect(svg).toContain('viewBox="0 0 640 220"');
    expect(svg).toContain("<path");
    expect(svg).toContain('role="img"');
    expect(svg).toContain('data-chart-part="chart"');
    expect(svg).not.toContain("tabindex=");
  });

  it("keeps one series per color and handles a null point without inventing data", () => {
    const svg = tanstackChartSvg(series, { ariaLabel: "Series", height: 180, width: 480 });
    expect((svg.match(/<path/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(svg).not.toContain("NaN");
  });

  it("returns an empty-state svg instead of a broken chart when there are no points", () => {
    const svg = tanstackChartSvg([], { ariaLabel: "Empty", height: 120, width: 400 });
    expect(svg).toContain("<svg");
    expect(svg).toContain('aria-label="Empty"');
    expect(svg).not.toContain("<path");
    expect((svg.match(/data-chart-part=/g) ?? []).length).toBe(1);
    expect((svg.match(/data-chart-series-count=/g) ?? []).length).toBe(1);
  });
});

const renderCard = async (input: {
  readonly hasData: boolean;
  readonly kind: "area" | "bar" | "line";
  readonly series: typeof series;
  readonly state: "empty" | "error" | "loading" | "ready";
}): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(
    renderToString(
      {
        init: () => ({ model: shellModel({ route: { _tag: "Index" } }), commands: [] }),
        view: (_model, h) => ({
          body: telemetryChartCard({
            description: "card test",
            emptyMessage: "No data yet",
            // SAFETY: renderToString infers Message=unknown for this fixture view; the card emits no handlers.
            h: h as Parameters<typeof telemetryChartCard>[0]["h"],
            hasData: input.hasData,
            kind: input.kind,
            series: input.series,
            state: input.state,
            title: "Latency trend",
          }),
          title: "chart card test",
        }),
      },
      { isHydratable: false },
    ),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S612 telemetry chart card visible contract", () => {
  it("renders the visible TanStack svg plus the sr-only numeric table for a line card", async () => {
    const card = await renderCard({ hasData: true, kind: "line", series, state: "ready" });
    const svg = card.querySelector("[data-chart-part='chart']");
    const table = card.querySelector("[data-chart-part='table']");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("Latency trend");
    expect(svg?.getAttribute("data-chart-series-count")).toBe("2");
    expect(svg?.getAttribute("tabindex")).toBeNull();
    expect(table).not.toBeNull();
    expect(table?.textContent).toContain("Latency trend");
    expect(table?.textContent).toContain("00:00");
    expect(table?.textContent).toContain("30");
    const point = svg?.querySelector(
      "[data-chart-series-id='latency'][data-chart-point-label='00:00']",
    );
    expect(point).not.toBeNull();
    expect(point?.getAttribute("data-chart-series-id")).toBe("latency");
    expect(point?.getAttribute("data-chart-point-label")).toBe("00:00");
    expect(point?.getAttribute("data-chart-point")).not.toBeNull();
    expect(table?.classList.contains("sr-only")).toBe(true);
    expect(card.querySelector("table:not(.sr-only)")).toBeNull();
  });

  it("renders a TanStack bar scene for a bar card", async () => {
    const card = await renderCard({ hasData: true, kind: "bar", series, state: "ready" });
    const svg = card.querySelector("[data-chart-part='chart']");
    expect(svg).not.toBeNull();
    expect(svg?.querySelectorAll("rect").length).toBeGreaterThan(0);
    const bar = svg?.querySelector(
      "rect[data-chart-series-id='latency'][data-chart-point-label='00:00']",
    );
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute("data-chart-series-id")).toBe("latency");
    expect(bar?.getAttribute("data-chart-point-label")).toBe("00:00");
    expect(bar?.getAttribute("data-chart-point")).not.toBeNull();
    expect(card.querySelector("[data-chart-part='table']")).not.toBeNull();
  });

  it("keeps a null bucket as a gap without NaN and still renders the table row", async () => {
    const card = await renderCard({ hasData: true, kind: "line", series, state: "ready" });
    expect(card.textContent).not.toContain("NaN");
    expect(card.textContent).toContain("02:00");
    expect(card.textContent).toContain("—");
  });

  it("renders the empty state svg and table without asserting fabricated points", async () => {
    const card = await renderCard({ hasData: false, kind: "line", series, state: "empty" });
    const svg = card.querySelector("[data-chart-part='chart']");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("data-chart-series-count")).toBe("0");
    expect(svg?.querySelector("path")).toBeNull();
    expect(card.textContent).toContain("No data yet");
  });
});
