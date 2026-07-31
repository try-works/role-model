import { describe, expect, it } from "vitest";

import { chartCssColorValue, chartCssVariableName } from "./chart";
import { rankingPlotHeight, resolveRowColor } from "./chart-ranking";
import {
  CHART_TIME_TICKS,
  chartBarBucketCenter,
  chartBarSizeForPlotWidth,
  chartValueDomain,
  formatChartTimeTick,
  resolveSeriesColor,
  seriesNeedsDualY,
  seriesToChartConfig,
  type ChartSeries,
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

  it("sizes bar bands to fill the 4h slot on a 0–24 axis", () => {
    expect(chartBarBucketCenter(0)).toBe(2);
    expect(chartBarBucketCenter(20)).toBe(22);
    expect(chartBarSizeForPlotWidth(1200)).toBe(Math.floor(1200 * (4 / 24) * 0.98));
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
      { key: "cacheHitTokens", label: "cacheHitTokens", color: "var(--chart-cache)" },
      { key: "cacheHitTokenRate", label: "cacheHitTokenRate", yAxis: "right" },
    ];
    const config = seriesToChartConfig(series);
    expect(config.cacheHitTokens?.color).toBe("var(--chart-cache)");
    expect(config.cacheHitTokenRate?.color).toBe("var(--chart-2)");
    expect(seriesNeedsDualY(series)).toBe(true);
    expect(seriesNeedsDualY([{ key: "a", label: "a" }])).toBe(false);
  });

  it("falls back to categorical chart colors by index", () => {
    expect(resolveSeriesColor({ key: "a", label: "a" }, 0)).toBe("var(--chart-1)");
    expect(resolveSeriesColor({ key: "b", label: "b" }, 5)).toBe("var(--chart-7)");
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
      resolveRowColor({ key: "a", label: "a", value: 1, color: "var(--chart-cache)" }, 0),
    ).toBe("var(--chart-cache)");
    expect(resolveRowColor({ key: "b", label: "b", value: 2 }, 1)).toBe("var(--chart-2)");
  });
});
