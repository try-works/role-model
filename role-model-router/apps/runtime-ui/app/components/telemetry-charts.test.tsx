import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

vi.mock("recharts", () => {
  function pickAttributeValue(value: unknown) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return undefined;
  }

  function createMockComponent(name: string) {
    return function MockComponent(props: Record<string, unknown>) {
      const children = props.children;
      const attributes: Record<string, string> = {
        "data-recharts": name,
      };
      const propNames = [
        "dataKey",
        "name",
        "orientation",
        "yAxisId",
        "layout",
        "type",
        "width",
        "data-testid",
      ];
      for (const propName of propNames) {
        const value = pickAttributeValue(props[propName]);
        if (value !== undefined) {
          attributes[`data-${propName.toLowerCase()}`] = value;
        }
      }
      return <div {...attributes}>{(name === "Legend" ? props.content : children) as never}</div>;
    };
  }

  return {
    Area: createMockComponent("Area"),
    AreaChart: createMockComponent("AreaChart"),
    Bar: createMockComponent("Bar"),
    BarChart: createMockComponent("BarChart"),
    CartesianGrid: createMockComponent("CartesianGrid"),
    Cell: createMockComponent("Cell"),
    Legend: createMockComponent("Legend"),
    Line: createMockComponent("Line"),
    LineChart: createMockComponent("LineChart"),
    ResponsiveContainer: createMockComponent("ResponsiveContainer"),
    Tooltip: createMockComponent("Tooltip"),
    XAxis: createMockComponent("XAxis"),
    YAxis: createMockComponent("YAxis"),
  };
});

import { resolveTelemetryChartLayout, telemetryChartLayoutContract } from "../lib/design-system";
import {
  TelemetryAnalyticsChartCard,
  TelemetryAreaTimeSeriesChart,
  TelemetryBarTimeSeriesChart,
  TelemetryChartCard,
  TelemetryLineTimeSeriesChart,
  TelemetryRankingBarChart,
} from "./telemetry-charts";

describe("telemetry chart layout contract", () => {
  test("exports bounded data-dependent geometry and shared plot values", () => {
    const compact = resolveTelemetryChartLayout({
      leftTickLabels: ["0", "8"],
      rightTickLabels: [],
    });
    const wide = resolveTelemetryChartLayout({
      leftTickLabels: ["0", "120,000"],
      rightTickLabels: ["0", "0.25", "0.5", "0.75", "1"],
    });

    expect(telemetryChartLayoutContract).toEqual(
      expect.objectContaining({
        leftAxisGutter: expect.objectContaining({
          min: expect.any(Number),
          max: expect.any(Number),
        }),
        rightAxisReserve: expect.objectContaining({
          min: expect.any(Number),
          max: expect.any(Number),
        }),
        legendInset: expect.any(Number),
        plotMargin: expect.objectContaining({ left: 0, right: 0 }),
        plotHeight: expect.any(Number),
      }),
    );
    expect(wide.leftAxisGutter).toBeGreaterThan(compact.leftAxisGutter);
    expect(wide.leftAxisGutter).toBeLessThanOrEqual(
      telemetryChartLayoutContract.leftAxisGutter.max,
    );
    expect(wide.rightAxisReserve).toBeGreaterThan(0);
    expect(compact.rightAxisReserve).toBe(0);
    expect(wide.plotMargin.left).toBeGreaterThanOrEqual(0);
    expect(wide.plotMargin.right).toBeGreaterThanOrEqual(0);
  });
});

describe("TelemetryChartCard", () => {
  test("keeps populated chart content visible while a background refresh is in progress", () => {
    const markup = renderToStaticMarkup(
      <TelemetryChartCard
        title="Latency trend"
        description="Average and p95 latency for the selected slice."
        refreshing
      >
        <div>Rendered chart body</div>
      </TelemetryChartCard>,
    );

    expect(markup).toContain("Latency trend");
    expect(markup).toContain('data-testid="telemetry-chart-card-latency-trend"');
    expect(markup).toContain("Average and p95 latency for the selected slice.");
    expect(markup).toContain("Rendered chart body");
    expect(markup).toContain("Refreshing…");
    expect(markup).toContain("text-[16px]");
    expect(markup).not.toContain("text-[28px]");
  });

  test("renders stable loading and empty states without fake chart data", () => {
    const loadingMarkup = renderToStaticMarkup(
      <TelemetryChartCard title="Token usage over time" loading />,
    );
    const emptyMarkup = renderToStaticMarkup(
      <TelemetryChartCard
        title="Cost avoided over time"
        emptyMessage="No request-time routing savings have been recorded yet."
      />,
    );

    expect(loadingMarkup).toContain("Loading chart data…");
    expect(loadingMarkup).not.toContain("synthetic");
    expect(emptyMarkup).toContain("No request-time routing savings have been recorded yet.");
    expect(emptyMarkup).not.toContain(">Empty<");
  });

  test("keeps empty chart states compact instead of reserving full plot height", () => {
    const markup = renderToStaticMarkup(
      <TelemetryChartCard
        title="Latency trend"
        emptyMessage="No telemetry rows match the current filters."
      />,
    );

    expect(markup).toContain("No telemetry rows match the current filters.");
    expect(markup).not.toContain("min-h-[240px] flex items-center");
  });

  test("uses tighter empty-state padding so compact analytics cards do not create oversized blank panels", () => {
    const markup = renderToStaticMarkup(
      <TelemetryChartCard
        title="Cache efficiency"
        emptyMessage="No cache activity has been recorded for this slice yet."
      />,
    );

    expect(markup).toContain("No cache activity has been recorded for this slice yet.");
    expect(markup).toContain("border-dashed");
    expect(markup).toContain("text-muted-foreground");
    expect(markup).toContain("px-4");
    expect(markup).toContain("py-3");
    expect(markup).not.toContain("border-dashed p-6");
    expect(markup).not.toContain("rm-warning");
  });

  test("keeps populated chart content visible for partial telemetry warnings", () => {
    const markup = renderToStaticMarkup(
      <TelemetryChartCard
        title="Request volume over time"
        state={{
          kind: "partial",
          message: "Some matching rows do not carry the selected metric or dimension.",
        }}
      >
        <div>Rendered chart body</div>
      </TelemetryChartCard>,
    );

    expect(markup).toContain("Partial");
    expect(markup).toContain("Some matching rows do not carry the selected metric or dimension.");
    expect(markup).toContain("Rendered chart body");
    expect(markup).toContain("text-muted-foreground");
    expect(markup).not.toContain("rm-warning");
  });

  test("replaces the chart body for blocking unsupported states", () => {
    const markup = renderToStaticMarkup(
      <TelemetryChartCard
        title="Latency trend"
        state={{
          kind: "unsupported",
          message: "The selected metric or dimension is not supported by this telemetry slice.",
        }}
      >
        <div>Rendered chart body</div>
      </TelemetryChartCard>,
    );

    expect(markup).toContain("Unsupported");
    expect(markup).toContain(
      "The selected metric or dimension is not supported by this telemetry slice.",
    );
    expect(markup).not.toContain("Rendered chart body");
    expect(markup).toContain("border-dashed");
    expect(markup).toContain("text-muted-foreground");
    expect(markup).not.toContain("rm-warning");
  });
});

describe("TelemetryAnalyticsChartCard", () => {
  test("renders a per-card error state when a chart query fails", () => {
    const markup = renderToStaticMarkup(
      <TelemetryAnalyticsChartCard
        definition={{
          title: "Latency trend",
          description: "Average and p95 latency across the selected telemetry window.",
          kind: "line",
          metrics: ["averageLatencyMs", "p95LatencyMs"],
          query: {
            granularity: "day",
            metrics: ["averageLatencyMs", "p95LatencyMs"],
          },
          emptyMessage: "Latency telemetry has not been recorded for this slice yet.",
        }}
        errorMessage="Latency trend: upstream query timed out."
      />,
    );

    expect(markup).toContain("Error");
    expect(markup).toContain("Latency trend: upstream query timed out.");
  });
});

describe("TelemetryLineTimeSeriesChart", () => {
  test("renders dual y axes for mixed-unit cache efficiency charts", () => {
    const markup = renderToStaticMarkup(
      <TelemetryLineTimeSeriesChart
        model={
          {
            title: "Cache efficiency",
            isEmpty: false,
            data: [
              {
                bucketLabel: "Jul 13",
                bucketStartMs: 0,
                bucketEndMs: 1,
                cacheHitTokens: 3394,
                cacheHitTokenRate: 0.96,
              },
            ],
            series: [
              {
                key: "cacheHitTokens",
                label: "Cache hit tokens",
                colorToken: "var(--rm-chart-cache-hit)",
                dataKey: "cacheHitTokens",
                strokeOpacity: 1,
                fillOpacity: 0.16,
                yAxisId: "left",
              },
              {
                key: "cacheHitTokenRate",
                label: "Cache hit token rate",
                colorToken: "var(--rm-chart-cache-rate)",
                dataKey: "cacheHitTokenRate",
                strokeOpacity: 1,
                fillOpacity: 0.16,
                yAxisId: "right",
              },
            ],
          } as unknown as Parameters<typeof TelemetryLineTimeSeriesChart>[0]["model"]
        }
      />,
    );

    expect(markup.match(/data-recharts=\"YAxis\"/g)?.length).toBe(2);
    expect(markup).toContain('data-recharts="YAxis" data-orientation="right"');
    expect(markup).toContain('data-testid="telemetry-chart-plot"');
    expect(markup).toContain('data-testid="telemetry-chart-legend"');
    expect(markup).toContain(`height:${telemetryChartLayoutContract.plotHeight}px`);
    expect(markup).toMatch(
      /data-recharts="Line"[^>]*data-datakey="cacheHitTokens"[^>]*data-yaxisid="left"/,
    );
    expect(markup).toMatch(
      /data-recharts="Line"[^>]*data-datakey="cacheHitTokenRate"[^>]*data-yaxisid="right"/,
    );
  });

  test("keeps same-unit line charts on a single y axis", () => {
    const markup = renderToStaticMarkup(
      <TelemetryLineTimeSeriesChart
        model={
          {
            title: "Latency trend",
            isEmpty: false,
            data: [
              {
                bucketLabel: "Jul 13",
                bucketStartMs: 0,
                bucketEndMs: 1,
                averageLatencyMs: 380,
                p95LatencyMs: 820,
              },
            ],
            series: [
              {
                key: "averageLatencyMs",
                label: "Average latency",
                colorToken: "var(--rm-chart-latency)",
                dataKey: "averageLatencyMs",
                strokeOpacity: 1,
                fillOpacity: 0.16,
                yAxisId: "left",
              },
              {
                key: "p95LatencyMs",
                label: "p95 latency",
                colorToken: "var(--rm-chart-warning)",
                dataKey: "p95LatencyMs",
                strokeOpacity: 1,
                fillOpacity: 0.16,
                yAxisId: "left",
              },
            ],
          } as unknown as Parameters<typeof TelemetryLineTimeSeriesChart>[0]["model"]
        }
      />,
    );

    expect(markup.match(/data-recharts=\"YAxis\"/g)?.length).toBe(1);
    expect(markup).not.toContain('data-recharts="YAxis" data-orientation="right"');
  });
});

describe("shared area and bar time-series geometry", () => {
  const dualAxisModel = {
    title: "Mixed units",
    isEmpty: false,
    data: [
      {
        bucketLabel: "Jul 13",
        bucketStartMs: 0,
        bucketEndMs: 1,
        requestCount: 120000,
        cacheHitTokenRate: 0.75,
      },
    ],
    series: [
      {
        key: "requestCount",
        label: "Requests",
        colorToken: "var(--rm-chart-latency)",
        dataKey: "requestCount",
        strokeOpacity: 1,
        fillOpacity: 0.16,
        yAxisId: "left",
      },
      {
        key: "cacheHitTokenRate",
        label: "Cache hit token rate",
        colorToken: "var(--rm-chart-cache-rate)",
        dataKey: "cacheHitTokenRate",
        strokeOpacity: 1,
        fillOpacity: 0.16,
        yAxisId: "right",
      },
    ],
  } as unknown as Parameters<typeof TelemetryAreaTimeSeriesChart>[0]["model"];

  test.each([
    ["area", TelemetryAreaTimeSeriesChart],
    ["bar", TelemetryBarTimeSeriesChart],
  ] as const)("renders data-dependent dual axes and inset legend for %s charts", (_, Chart) => {
    const markup = renderToStaticMarkup(<Chart model={dualAxisModel} />);

    expect(markup.match(/data-recharts="YAxis"/g)?.length).toBe(2);
    expect(markup).toContain('data-recharts="YAxis" data-orientation="right"');
    expect(markup).toMatch(/data-recharts="YAxis"[^>]*data-width="[5-9][0-9]"/);
    expect(markup).toContain('data-testid="telemetry-chart-legend"');
    expect(markup).toContain(`padding-inline-start:${telemetryChartLayoutContract.legendInset}px`);
  });
});

describe("TelemetryRankingBarChart", () => {
  test("places horizontal chart labels in a bottom legend instead of a left category axis", () => {
    const markup = renderToStaticMarkup(
      <TelemetryRankingBarChart
        model={{
          title: "Ranked comparison",
          metric: "requestCount",
          rows: [
            {
              key: "qa-local-llama-8b",
              label: "qa-local-llama-8b",
              value: 640,
              colorToken: "var(--rm-chart-warning)",
            },
            {
              key: "anthropic-claude-haiku",
              label: "anthropic-claude-haiku",
              value: 585,
              colorToken: "var(--rm3-chart-1)",
            },
          ],
          isEmpty: false,
        }}
      />,
    );

    expect(markup).toContain('data-chart-horizontal-legend="bottom"');
    expect(markup).toContain('data-testid="telemetry-chart-legend-item"');
    expect(markup).toContain('data-chart-horizontal-plot="true"');
    expect(markup).toContain(`height:${telemetryChartLayoutContract.plotHeight}px`);
    expect(markup).not.toContain("h-[280px]");
    expect(markup).toContain("qa-local-llama-8b");
    expect(markup).toContain("anthropic-claude-haiku");
    expect(markup).not.toContain('width="128"');
  });
});
