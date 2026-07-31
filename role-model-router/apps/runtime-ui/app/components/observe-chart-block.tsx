import { ObserveChartBlockView } from "@role-model/ui";

import type { ObserveChartBlockModel } from "../lib/observe-chart-adapter";
import { ChartKitStatePanel } from "./chart-kit-state-panel";

export function ObserveKitChartBlock({
  block,
}: {
  readonly block: ObserveChartBlockModel;
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

  if (block.kind === "ranking" && (!block.rows || block.rows.length === 0)) {
    return (
      <ChartKitStatePanel
        title={block.title}
        description={block.description}
        status="empty"
        statusMessage={block.statusMessage}
      />
    );
  }

  if (block.kind !== "ranking" && (!block.data || !block.series)) {
    return (
      <ChartKitStatePanel
        title={block.title}
        description={block.description}
        status="empty"
        statusMessage={block.statusMessage}
      />
    );
  }

  const chart = (
    <ObserveChartBlockView
      block={{
        title: block.title,
        description: block.description,
        kind: block.kind,
        data: block.data,
        series: block.series,
        rows: block.rows,
        valueLabel: block.valueLabel,
        xKey: block.xKey,
        xAxisMode: block.xAxisMode,
        xDomain: block.xDomain,
        xTicks: block.xTicks,
        xTickFormatter: block.xTickFormatter,
        leftTickFormatter: block.leftTickFormatter,
        rightTickFormatter: block.rightTickFormatter,
        valueFormatter: block.valueFormatter,
      }}
    />
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
