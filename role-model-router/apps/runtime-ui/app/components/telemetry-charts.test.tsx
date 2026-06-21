import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { TelemetryChartCard, TelemetryRankingBarChart } from "./telemetry-charts";

describe("TelemetryChartCard", () => {
  test("keeps populated chart content visible while a background refresh is in progress", () => {
    const markup = renderToStaticMarkup(
      <TelemetryChartCard
        title="Latency Trend"
        description="Average and p95 latency for the selected slice."
        refreshing
      >
        <div>Rendered chart body</div>
      </TelemetryChartCard>,
    );

    expect(markup).toContain("Latency Trend");
    expect(markup).toContain("Average and p95 latency for the selected slice.");
    expect(markup).toContain("Rendered chart body");
    expect(markup).toContain("Refreshing…");
  });

  test("renders stable loading and empty states without fake chart data", () => {
    const loadingMarkup = renderToStaticMarkup(
      <TelemetryChartCard title="Token Usage Over Time" loading />,
    );
    const emptyMarkup = renderToStaticMarkup(
      <TelemetryChartCard
        title="Cost Avoided Over Time"
        emptyMessage="No request-time routing savings have been recorded yet."
      />,
    );

    expect(loadingMarkup).toContain("Loading chart data…");
    expect(loadingMarkup).not.toContain("synthetic");
    expect(emptyMarkup).toContain("No request-time routing savings have been recorded yet.");
  });
});

describe("TelemetryRankingBarChart", () => {
  test("places horizontal chart labels in a bottom legend instead of a left category axis", () => {
    const markup = renderToStaticMarkup(
      <TelemetryRankingBarChart
        model={{
          title: "Ranked Comparison",
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
              colorToken: "var(--rm-chart-link-blue)",
            },
          ],
          isEmpty: false,
        }}
      />,
    );

    expect(markup).toContain('data-chart-horizontal-legend="bottom"');
    expect(markup).toContain('data-chart-horizontal-plot="true"');
    expect(markup).toContain("h-[280px]");
    expect(markup).toContain("qa-local-llama-8b");
    expect(markup).toContain("anthropic-claude-haiku");
    expect(markup).not.toContain('width="128"');
  });
});
