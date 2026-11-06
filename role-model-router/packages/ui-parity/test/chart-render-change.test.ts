import { describe, expect, it } from "vitest";

import {
  captureChartOnly,
  evaluateChartRenderChange,
} from "../src/chart-render-change.js";

const page = (chart, outside = "") =>
  `<main>${outside}<svg data-chart-part="chart"><path d="M 0 0"/>${chart}</svg></main>`;

describe("chart-only render-change policy", () => {
  it("captures only chart SVGs and ignores page chrome outside them", () => {
    const before = captureChartOnly(page("<path class=\"old\"/>", "<p>chrome</p>"));
    const after = captureChartOnly(page("<path class=\"old\"/>", "<p>changed chrome</p>"));
    const result = evaluateChartRenderChange({ approved: false, next: after, previous: before });
    expect(before.charts).toHaveLength(1);
    expect(result.status).toBe("same");
    expect(result.chartOnly).toBe(true);
    expect(result.counts.chartChanges).toBe(0);
  });

  it("classifies an approved chart change separately with its own count", () => {
    const previous = captureChartOnly(page("<path class=\"old\"/>"));
    const next = captureChartOnly(page("<path class=\"new\"/>"));
    const result = evaluateChartRenderChange({ approved: true, next, previous });
    expect(result.status).toBe("approved-chart-change");
    expect(result.approved).toBe(true);
    expect(result.counts).toEqual({ approvedChartChanges: 1, chartChanges: 1 });
  });

  it("does not approve an unapproved chart change or a missing chart", () => {
    const previous = captureChartOnly(page("<path class=\"old\"/>"));
    const next = captureChartOnly(page("<path class=\"new\"/>"));
    expect(evaluateChartRenderChange({ approved: false, next, previous }).status).toBe(
      "unapproved-chart-change",
    );
    const missing = captureChartOnly("<main>not a chart</main>");
    expect(
      evaluateChartRenderChange({ approved: true, next: missing, previous }).status,
    ).toBe("invalid-capture");
  });
});
