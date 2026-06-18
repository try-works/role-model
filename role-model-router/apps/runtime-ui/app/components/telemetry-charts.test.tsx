import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { TelemetryChartCard } from "./telemetry-charts";

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
