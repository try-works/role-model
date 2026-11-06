/**
 * R10 chart-only approved-render-change policy for the parity harness.
 *
 * The harness may classify a chart change separately from page chrome, but only when the chart node
 * itself changed AND the change is explicitly approved. A missing chart is invalid, never a same.
 */
export interface ChartOnlyCapture {
  readonly charts: readonly string[];
}

export interface ChartRenderChange {
  readonly status: "same" | "approved-chart-change" | "unapproved-chart-change" | "invalid-capture";
  readonly changed: boolean;
  readonly chartOnly: true;
  readonly approved: boolean;
  readonly counts: {
    readonly chartChanges: 0 | 1;
    readonly approvedChartChanges: 0 | 1;
  };
  readonly reason?: string;
}

const CHART_SVG = /<svg\b[^>]*\bdata-chart-part="chart"[\s\S]*?<\/svg>/g;

/** Extracts only served chart SVGs; everything outside them is outside this comparison. */
export const captureChartOnly = (html: string): ChartOnlyCapture => ({
  charts: [...String(html).matchAll(CHART_SVG)].map((match) => match[0]),
});

export const evaluateChartRenderChange = ({
  approved,
  next,
  previous,
}: {
  readonly approved: boolean;
  readonly next: ChartOnlyCapture;
  readonly previous: ChartOnlyCapture;
}): ChartRenderChange => {
  const chartOnly = true as const;
  if (previous.charts.length === 0 || next.charts.length === 0)
    return {
      approved: false,
      changed: previous.charts.join("\n") !== next.charts.join("\n"),
      chartOnly,
      counts: { approvedChartChanges: 0, chartChanges: 0 },
      reason: "no-chart-capture",
      status: "invalid-capture",
    };
  const changed = previous.charts.join("\n") !== next.charts.join("\n");
  if (!changed)
    return {
      approved: false,
      changed: false,
      chartOnly,
      counts: { approvedChartChanges: 0, chartChanges: 0 },
      status: "same",
    };
  if (approved)
    return {
      approved: true,
      changed: true,
      chartOnly,
      counts: { approvedChartChanges: 1, chartChanges: 1 },
      status: "approved-chart-change",
    };
  return {
    approved: false,
    changed: true,
    chartOnly,
    counts: { approvedChartChanges: 0, chartChanges: 1 },
    reason: "chart-render-change-not-approved",
    status: "unapproved-chart-change",
  };
};
