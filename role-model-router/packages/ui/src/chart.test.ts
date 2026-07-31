import { describe, expect, it } from "vitest";

import { chartCssColorValue, chartCssVariableName } from "./chart";
import { rankingPlotHeight, resolveRowColor } from "./chart-ranking";
import {
  CHART_TIME_TICKS,
  CHART_Y_AXIS,
  type ChartSeries,
  chartBarBucketCenter,
  chartBarSizeForPlotWidth,
  chartValueDomain,
  chartWindowBarSizeForPlotWidth,
  chartWindowBoundaryTicks,
  chartWindowBucketCenter,
  chartWindowCenterTicks,
  chartWindowLabelTicks,
  chartWindowTickIndices,
  formatChartTimeTick,
  resolveChartYAxisLayout,
  resolveChartYAxisWidth,
  resolveSeriesColor,
  seriesNeedsDualY,
  seriesToChartConfig,
} from "./chart-time-series";

describe("chart style helpers", () => {
  it("accepts CSS-safe chart keys and colors", () => {
    expect(chartCssVariableName("requests_2xx")).toBe("--color-requests_2xx");
    expect(chartCssColorValue("#0ea5e9")).toBe("#0ea5e9");
    expect(chartCssColorValue("rgb(14 165 233 / 50%)")).toBe("rgb(14 165 233 / 50%)");
    expect(chartCssColorValue("var(--chart-1)")).toBe("var(--chart-1)");
  });

  it("rejects style-breaking keys and color values", () => {
    expect(chartCssVariableName("x];body{color:red")).toBeNull();
    expect(chartCssColorValue("red; background: url(https://example.test/x)")).toBeNull();
    expect(chartCssColorValue("</style><script>alert(1)</script>")).toBeNull();
  });
});

describe("time-series chart helpers", () => {
  it("exposes seven 24h time ticks through 24:00", () => {
    expect([...CHART_TIME_TICKS]).toEqual([0, 4, 8, 12, 16, 20, 24]);
    expect(formatChartTimeTick(0)).toBe("00:00");
    expect(formatChartTimeTick(20)).toBe("20:00");
    expect(formatChartTimeTick(24)).toBe("24:00");
  });

  it("spaces window ticks evenly across longer ranges", () => {
    expect(chartWindowTickIndices(1)).toEqual([0]);
    expect(chartWindowTickIndices(7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(chartWindowTickIndices(13)).toEqual([0, 2, 4, 6, 8, 10, 12]);
    expect(chartWindowTickIndices(30).length).toBeLessThanOrEqual(7);
    expect(chartWindowTickIndices(30)[0]).toBe(0);
    expect(chartWindowTickIndices(30).at(-1)).toBe(29);
  });

  it("places window bars between boundary rails like the day-24h model", () => {
    expect(chartWindowBucketCenter(0)).toBe(0.5);
    expect(chartWindowBucketCenter(6)).toBe(6.5);
    expect(chartWindowBoundaryTicks(7)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(chartWindowCenterTicks(7)).toEqual([0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5]);
    expect(chartWindowLabelTicks(7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(chartWindowLabelTicks(13)).toEqual([0, 2, 4, 6, 8, 10, 12]);
    expect(chartWindowBarSizeForPlotWidth(700, 7)).toBe(Math.floor(700 / 7));
    expect(chartWindowBarSizeForPlotWidth(1400, 7)).toBe(Math.floor(1400 / 7));
  });

  it("sizes bar bands to fill the 4h grid column on a 0–24 axis", () => {
    expect(chartBarBucketCenter(0)).toBe(2);
    expect(chartBarBucketCenter(20)).toBe(22);
    expect(chartBarSizeForPlotWidth(600)).toBe(Math.floor(600 * (4 / 24)));
    expect(chartBarSizeForPlotWidth(1200)).toBe(Math.floor(1200 * (4 / 24)));
    expect(chartBarSizeForPlotWidth(0)).toBe(32);
  });

  it("keeps 0 in the Y domain by default", () => {
    const domain = chartValueDomain();
    expect(Array.isArray(domain)).toBe(true);
    expect(typeof domain[0]).toBe("function");
    expect(typeof domain[1]).toBe("function");
    const [lo, hi] = domain as [(n: number) => number, (n: number) => number];
    expect(lo(40)).toBe(0);
    expect(lo(-12)).toBe(-12);
    expect(hi(40)).toBe(40);
    expect(hi(-12)).toBe(0);
    expect(chartValueDomain(false)).toEqual(["auto", "auto"]);
  });

  it("maps series to ChartConfig with chart token colors", () => {
    const series: ChartSeries[] = [
      { key: "cacheHitTokens", label: "cacheHitTokens", color: "var(--rm3-chart-cache)" },
      { key: "cacheHitTokenRate", label: "cacheHitTokenRate", yAxis: "right" },
    ];
    const config = seriesToChartConfig(series);
    expect(config.cacheHitTokens?.color).toBe("var(--rm3-chart-cache)");
    expect(config.cacheHitTokenRate?.color).toBe("var(--rm3-chart-2)");
    expect(seriesNeedsDualY(series)).toBe(true);
    expect(seriesNeedsDualY([{ key: "a", label: "a" }])).toBe(false);
  });

  it("falls back to categorical chart colors by index", () => {
    expect(resolveSeriesColor({ key: "a", label: "a" }, 0)).toBe("var(--rm3-chart-1)");
    expect(resolveSeriesColor({ key: "b", label: "b" }, 5)).toBe("var(--rm3-chart-7)");
  });

  it("widens the Y gutter for currency tick labels so `$0.10` is not clipped", () => {
    expect(resolveChartYAxisWidth(["0", "40"])).toBe(CHART_Y_AXIS.widthMin);
    const usdWidth = resolveChartYAxisWidth(["$0.00", "$0.10"]);
    expect(usdWidth).toBeGreaterThan(CHART_Y_AXIS.widthMin);
    expect(usdWidth).toBeGreaterThanOrEqual(5 * CHART_Y_AXIS.tickCharacterWidth);
    expect(
      resolveChartYAxisLayout({
        data: [{ hour: 0, routingCostSavingsUsd: 0.1 }],
        series: [{ key: "routingCostSavingsUsd", label: "Routing avoided cost" }],
        leftTickFormatter: (value) => `$${value.toFixed(2)}`,
      }).leftWidth,
    ).toBe(usdWidth);
  });
});

describe("ranking chart helpers", () => {
  it("scales plot height with row count and respects an explicit height", () => {
    expect(rankingPlotHeight(0)).toBe(160);
    expect(rankingPlotHeight(8)).toBe(Math.max(160, 8 * 28 + 24));
    expect(rankingPlotHeight(8, 240)).toBe(240);
  });

  it("resolves row colors from explicit tokens or categorical fallbacks", () => {
    expect(
      resolveRowColor({ key: "a", label: "a", value: 1, color: "var(--rm3-chart-cache)" }, 0),
    ).toBe("var(--rm3-chart-cache)");
    expect(resolveRowColor({ key: "b", label: "b", value: 2 }, 1)).toBe("var(--rm3-chart-2)");
  });

  it("keeps category labels in the bottom legend only (no left-hand bar labels)", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("./chart-ranking.tsx", import.meta.url), "utf8"),
    );
    expect(source).toContain("tick={false}");
    expect(source).toContain("const DEFAULT_CATEGORY_WIDTH = 0");
    expect(source).toContain("ChartCardLegend");
  });
});
