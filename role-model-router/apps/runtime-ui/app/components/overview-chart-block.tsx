import {
  ChartCard,
  ChartCardDescription,
  ChartCardHeader,
  ChartCardTitle,
  TimeSeriesAreaChart,
  TimeSeriesBarChart,
  TimeSeriesLineChart,
} from "@role-model/ui";

import type { OverviewChartBlockModel } from "../lib/overview-chart-adapter";

function OverviewChartStatePanel({
  block,
}: {
  readonly block: OverviewChartBlockModel;
}) {
  const message =
    block.statusMessage ??
    (block.status === "loading"
      ? "Loading chart data."
      : block.status === "empty"
        ? "No telemetry rows match the current filters."
        : "Telemetry analytics could not be loaded.");

  const toneClass =
    block.status === "error"
      ? "border-destructive/30 bg-destructive/5 text-destructive"
      : block.status === "unsupported"
        ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
        : block.status === "partial" || block.status === "truncated"
          ? "border-amber-500/30 text-amber-700 dark:text-amber-400"
          : "border-border text-muted-foreground";

  return (
    <ChartCard chrome="cell">
      <ChartCardHeader>
        <ChartCardTitle>{block.title}</ChartCardTitle>
        {block.description ? (
          <ChartCardDescription>{block.description}</ChartCardDescription>
        ) : null}
      </ChartCardHeader>
      <div className={`rounded-md border px-4 py-3 text-sm ${toneClass}`}>{message}</div>
    </ChartCard>
  );
}

export function OverviewKitChartBlock({
  block,
}: {
  readonly block: OverviewChartBlockModel;
}) {
  if (
    block.status === "loading" ||
    block.status === "error" ||
    block.status === "empty" ||
    block.status === "unsupported"
  ) {
    return <OverviewChartStatePanel block={block} />;
  }

  if (!block.data || !block.series) {
    return <OverviewChartStatePanel block={{ ...block, status: "empty" }} />;
  }

  const shared = {
    title: block.title,
    description: block.description,
    data: block.data,
    series: block.series,
    leftTickFormatter: block.leftTickFormatter,
    rightTickFormatter: block.rightTickFormatter,
    valueFormatter: block.valueFormatter,
    chrome: "cell" as const,
    className: "w-full",
  };

  const chart =
    block.kind === "area" ? (
      <TimeSeriesAreaChart {...shared} />
    ) : block.kind === "bar" ? (
      <TimeSeriesBarChart {...shared} />
    ) : (
      <TimeSeriesLineChart {...shared} />
    );

  if (block.status === "partial" || block.status === "truncated") {
    return (
      <div className="flex h-full flex-col gap-2">
        {chart}
        {block.statusMessage ? (
          <p className="px-4 pb-3 text-xs text-amber-700 dark:text-amber-400">
            {block.statusMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return chart;
}
