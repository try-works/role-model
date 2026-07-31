import { TimeSeriesAreaChart, TimeSeriesBarChart, TimeSeriesLineChart } from "@role-model/ui";

import type { OverviewChartBlockModel } from "../lib/overview-chart-adapter";
import { ChartKitStatePanel } from "./chart-kit-state-panel";

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
    return (
      <ChartKitStatePanel
        title={block.title}
        description={block.description}
        status={block.status}
        statusMessage={block.statusMessage}
      />
    );
  }

  if (!block.data || !block.series) {
    return (
      <ChartKitStatePanel
        title={block.title}
        description={block.description}
        status="empty"
        statusMessage={block.statusMessage}
      />
    );
  }

  const shared = {
    title: block.title,
    description: block.description,
    data: block.data,
    series: block.series,
    xKey: block.xKey,
    xAxisMode: block.xAxisMode,
    xDomain: block.xDomain,
    xTicks: block.xTicks,
    xTickFormatter: block.xTickFormatter,
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
          <p className="px-4 pb-3 text-xs text-muted-foreground">{block.statusMessage}</p>
        ) : null}
      </div>
    );
  }

  return chart;
}
