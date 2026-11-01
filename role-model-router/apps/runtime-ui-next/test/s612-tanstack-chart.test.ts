import { describe, expect, it } from "vitest";

import { tanstackChartSvg } from "../src/features/overview/tanstack-chart.js";

/** S612 (R9/R10): TanStack Charts is the chart engine behind the Foldkit Html surface. */

const series = [
  { id: "latency", label: "Latency", points: [{ label: "00:00", value: 10 }, { label: "01:00", value: 30 }, { label: "02:00", value: null }] },
  { id: "tokens", label: "Tokens", points: [{ label: "00:00", value: 4 }, { label: "01:00", value: 8 }, { label: "02:00", value: 2 }] },
];

describe("S612 TanStack chart adapter", () => {
  it("renders responsive, accessible static SVG through TanStack Charts", () => {
    const svg = tanstackChartSvg(series, { ariaLabel: "Latency trend", height: 220, width: 640 });
    expect(svg).toContain("<svg");
    expect(svg).toContain('aria-label="Latency trend"');
    expect(svg).toContain('viewBox="0 0 640 220"');
    expect(svg).toContain("<path");
    expect(svg).toContain('role="img"');
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
  });
});
