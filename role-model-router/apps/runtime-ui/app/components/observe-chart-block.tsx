import {
  ChartCard,
  ChartCardDescription,
  ChartCardHeader,
  ChartCardTitle,
  ObserveChartBlockView,
} from "@role-model/ui";

import type { ObserveChartBlockModel } from "../lib/observe-chart-adapter";

function ObserveChartStatePanel({
  block,
}: {
  readonly block: ObserveChartBlockModel;
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
    return <ObserveChartStatePanel block={block} />;
  }

  if (block.kind === "ranking" && (!block.rows || block.rows.length === 0)) {
    return <ObserveChartStatePanel block={{ ...block, status: "empty" }} />;
  }

  if (block.kind !== "ranking" && (!block.data || !block.series)) {
    return <ObserveChartStatePanel block={{ ...block, status: "empty" }} />;
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
          <p className="px-4 pb-3 text-xs text-amber-700 dark:text-amber-400">
            {block.statusMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return chart;
}
