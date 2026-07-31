"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import {
  ChartCard,
  ChartCardDescription,
  ChartCardHeader,
  ChartCardLegend,
  ChartCardPlot,
  ChartCardTitle,
} from "./chart-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./chart";
import { chartValueDomain, resolveSeriesColor } from "./chart-time-series";
import { cn } from "./lib/utils";

/** One ranked category row (horizontal bar). */
export type RankingChartRow = {
  key: string;
  label: string;
  value: number;
  /** CSS color or `var(--chart-*)`. Defaults to categorical chart tokens by index. */
  color?: string;
};

export type RankingBarChartProps = {
  title: string;
  description?: string;
  rows: readonly RankingChartRow[];
  /** Legend / tooltip series label. Default `value`. */
  valueLabel?: string;
  className?: string;
  plotClassName?: string;
  /** Plot height in px. Default scales with row count (min 160). */
  plotHeight?: number;
  /** Y-axis category gutter width. Default 120. */
  categoryWidth?: number;
  valueFormatter?: (value: number) => string;
  /** Override ChartCard chrome; omit to inherit `ChartGrid` context. */
  chrome?: "standalone" | "cell";
};

const DEFAULT_CATEGORY_WIDTH = 120;
const DEFAULT_VALUE_LABEL = "value";

function rankingPlotHeight(rowCount: number, explicit?: number): number {
  if (explicit !== undefined) return explicit;
  return Math.max(160, rowCount * 28 + 24);
}

function resolveRowColor(row: RankingChartRow, index: number): string {
  return resolveSeriesColor({ key: row.key, label: row.label, color: row.color }, index);
}

function rankingChartConfig(
  rows: readonly RankingChartRow[],
  valueLabel: string,
): ChartConfig {
  // Single dataKey `value`; colors applied per Cell.
  return {
    value: {
      label: valueLabel,
      color: resolveRowColor(rows[0] ?? { key: "value", label: valueLabel, value: 0 }, 0),
    },
  };
}

/**
 * Horizontal ranking bars (Observe capability leaders, model selection, …).
 * ChartCard chrome + category Y + value X; legend lists each ranked label.
 */
function RankingBarChart({
  title,
  description,
  rows,
  valueLabel = DEFAULT_VALUE_LABEL,
  className,
  plotClassName,
  plotHeight: plotHeightProp,
  categoryWidth = DEFAULT_CATEGORY_WIDTH,
  valueFormatter,
  chrome,
}: RankingBarChartProps) {
  const plotHeight = rankingPlotHeight(rows.length, plotHeightProp);
  const config = rankingChartConfig(rows, valueLabel);
  const data = rows.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.value,
  }));
  const legendItems = rows.map((row, i) => ({
    key: row.key,
    label: row.label,
    color: resolveRowColor(row, i),
  }));

  return (
    <ChartCard className={className} chrome={chrome}>
      <ChartCardHeader>
        <ChartCardTitle>{title}</ChartCardTitle>
        {description ? <ChartCardDescription>{description}</ChartCardDescription> : null}
      </ChartCardHeader>
      <ChartCardPlot
        className={cn("h-[var(--chart-plot-h)]", plotClassName)}
        style={{ "--chart-plot-h": `${plotHeight}px` } as React.CSSProperties}
      >
        <ChartContainer
          config={config}
          className="h-full w-full"
          initialDimension={{ width: 640, height: plotHeight }}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="12%"
          >
            <CartesianGrid
              horizontal={false}
              vertical
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeDasharray="0"
            />
            <XAxis
              type="number"
              domain={chartValueDomain(true)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "currentColor", fontSize: 10, fontFamily: "var(--font-mono)" }}
              tickFormatter={valueFormatter as ((value: number) => string) | undefined}
              className="text-muted-foreground"
            />
            <YAxis
              type="category"
              dataKey="label"
              width={categoryWidth}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "currentColor", fontSize: 11, fontFamily: "var(--font-mono)" }}
              className="text-muted-foreground"
            />
            <ChartTooltip
              cursor={{ fill: "currentColor", fillOpacity: 0.04 }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={
                    valueFormatter
                      ? (value, name) => (
                          <>
                            <span className="text-muted-foreground">{name}</span>
                            <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                              {typeof value === "number" ? valueFormatter(value) : String(value)}
                            </span>
                          </>
                        )
                      : undefined
                  }
                />
              }
            />
            <Bar
              dataKey="value"
              name={valueLabel}
              radius={[0, 2, 2, 0]}
              maxBarSize={96}
              isAnimationActive={false}
            >
              {rows.map((row, i) => (
                <Cell key={row.key} fill={resolveRowColor(row, i)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </ChartCardPlot>
      {legendItems.length > 0 ? <ChartCardLegend items={legendItems} /> : null}
    </ChartCard>
  );
}

export { RankingBarChart, rankingPlotHeight, resolveRowColor };
