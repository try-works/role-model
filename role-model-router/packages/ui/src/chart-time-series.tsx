import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartCard,
  ChartCardDescription,
  ChartCardHeader,
  ChartCardLegend,
  ChartCardPlot,
  ChartCardTitle,
  type ChartLegendItem,
} from "./chart-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./chart";
import { cn } from "./lib/utils";

/** 7 ticks on a 24h domain: bucket starts 00:00…20:00 plus end 24:00 (RM3 rule #8). */
export const CHART_TIME_TICKS = [0, 4, 8, 12, 16, 20, 24] as const;

/** Six 4h buckets (no end-rail point). Bars sit in these slots; 24:00 is axis-only. */
export const CHART_TIME_BUCKETS = [0, 4, 8, 12, 16, 20] as const;

export type ChartTimeHour = (typeof CHART_TIME_TICKS)[number];

export function formatChartTimeTick(hour: number): string {
  const h = Math.max(0, Math.min(24, Math.round(hour)));
  return `${String(h).padStart(2, "0")}:00`;
}

/** Center a bucket-start hour in its 4h slot so bars sit between tick rails. */
export function chartBarBucketCenter(bucketStartHour: number): number {
  return bucketStartHour + 2;
}

/**
 * Bar width for a 4h bucket on a 0–24 number axis (≈98% of band = 2% gap).
 * Prefer this over a fixed `maxBarSize` so span-12 plots fill instead of stubbing.
 */
export function chartBarSizeForPlotWidth(plotWidth: number): number {
  if (plotWidth <= 0) return 32;
  return Math.max(8, Math.floor(plotWidth * (4 / 24) * 0.98));
}

/** Y domain always includes 0 (RM3 rule #9). Allows negative values for diverging bars. */
export function chartValueDomain(
  includeZero = true,
):
  | [number | "auto", number | "auto"]
  | [(dataMin: number) => number, (dataMax: number) => number] {
  if (!includeZero) {
    return ["auto", "auto"];
  }
  return [(dataMin) => Math.min(0, dataMin), (dataMax) => Math.max(0, dataMax)];
}

export type ChartSeriesYAxis = "left" | "right";

export type ChartSeries = {
  key: string;
  label: string;
  /** CSS color or `var(--chart-*)`. Defaults to categorical chart tokens by index. */
  color?: string;
  yAxis?: ChartSeriesYAxis;
};

export type TimeSeriesChartProps = {
  title: string;
  description?: string;
  data: Record<string, string | number>[];
  series: ChartSeries[];
  /** X-axis key. Values should be hours 0–24 (or mappable). Default `hour`. */
  xKey?: string;
  className?: string;
  plotClassName?: string;
  /** Plot height in px. Default 192 (~20% taller than prior 160). */
  plotHeight?: number;
  leftTickFormatter?: (value: number) => string;
  rightTickFormatter?: (value: number) => string;
  valueFormatter?: (value: number) => string;
  /** Stack area series (e.g. strategy mix over time). Default false = overlaid. */
  stacked?: boolean;
  /** Override ChartCard chrome; omit to inherit `ChartGrid` context. */
  chrome?: "standalone" | "cell";
};

const DEFAULT_SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-6)",
  "var(--chart-5)",
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-4)",
] as const;

export function resolveSeriesColor(series: ChartSeries, index: number): string {
  return series.color ?? DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length]!;
}

export function seriesToChartConfig(series: ChartSeries[]): ChartConfig {
  return Object.fromEntries(
    series.map((s, i) => [
      s.key,
      {
        label: s.label,
        color: resolveSeriesColor(s, i),
      },
    ]),
  );
}

export function seriesNeedsDualY(series: ChartSeries[]): boolean {
  return series.some((s) => (s.yAxis ?? "left") === "right");
}

function legendItemsFromSeries(series: ChartSeries[]): ChartLegendItem[] {
  return series.map((s, i) => ({
    key: s.key,
    label: s.label,
    color: resolveSeriesColor(s, i),
  }));
}

function ChartTimeTick({
  x,
  y,
  payload,
  width,
}: {
  x?: number;
  y?: number;
  payload?: { value?: number };
  width?: number;
}) {
  const hour = Number(payload?.value ?? 0);
  const label = formatChartTimeTick(hour);
  const plotWidth = width ?? 0;
  // First left-aligned; middle centered; 24:00 right-aligned on the end rail.
  let textAnchor: "start" | "middle" | "end" = "middle";
  let dx = 0;
  if (hour === 0) {
    textAnchor = "start";
    dx = 0;
  } else if (hour === 24 || (plotWidth > 0 && (x ?? 0) >= plotWidth - 1)) {
    textAnchor = "end";
    dx = 0;
  }

  return (
    <text
      x={x}
      y={(y ?? 0) + 12}
      dx={dx}
      textAnchor={textAnchor}
      className="fill-muted-foreground font-mono text-[10px]"
    >
      {label}
    </text>
  );
}

function ChartCartesianGridLines() {
  return (
    <CartesianGrid
      vertical
      horizontal
      stroke="currentColor"
      strokeOpacity={0.08}
      strokeDasharray="0"
      // Verticals align to CHART_TIME_TICKS via shared tick values on XAxis.
      verticalCoordinatesGenerator={({ xAxis }) => {
        if (!xAxis) return [];
        const { x, width, domain, scale } = xAxis as {
          x: number;
          width: number;
          domain?: [number, number];
          scale?: (v: number) => number;
        };
        if (typeof scale === "function") {
          return CHART_TIME_TICKS.map((t) => scale(t));
        }
        const [d0, d1] = domain ?? [0, 24];
        const span = d1 - d0 || 24;
        return CHART_TIME_TICKS.map((t) => x + ((t - d0) / span) * width);
      }}
    />
  );
}

function ChartTimeAxis({
  xKey,
}: {
  xKey: string;
}) {
  return (
    <XAxis
      dataKey={xKey}
      type="number"
      domain={[0, 24]}
      ticks={[...CHART_TIME_TICKS]}
      tick={<ChartTimeTick />}
      tickLine={false}
      axisLine={false}
      interval={0}
      height={20}
    />
  );
}

function ChartValueAxis({
  yAxisId,
  orientation,
  tickFormatter,
}: {
  yAxisId: string;
  orientation: "left" | "right";
  tickFormatter?: (value: number) => string;
}) {
  return (
    <YAxis
      yAxisId={yAxisId}
      orientation={orientation}
      domain={chartValueDomain(true)}
      tickLine={false}
      axisLine={false}
      width={40}
      tickMargin={6}
      tick={{ fill: "currentColor", fontSize: 10, fontFamily: "var(--font-mono)" }}
      tickFormatter={tickFormatter as ((value: number) => string) | undefined}
      className="text-muted-foreground"
    />
  );
}

function ChartCardChrome({
  title,
  description,
  series,
  className,
  plotClassName,
  plotHeight,
  chrome,
  children,
}: {
  title: string;
  description?: string;
  series: ChartSeries[];
  className?: string;
  plotClassName?: string;
  plotHeight: number;
  chrome?: "standalone" | "cell";
  children: React.ReactNode;
}) {
  const showLegend = series.length > 1;

  return (
    <ChartCard className={className} chrome={chrome}>
      <ChartCardHeader>
        <ChartCardTitle>{title}</ChartCardTitle>
        {description ? <ChartCardDescription>{description}</ChartCardDescription> : null}
      </ChartCardHeader>
      <ChartCardPlot className={cn("h-[var(--chart-plot-h)]", plotClassName)} style={{ "--chart-plot-h": `${plotHeight}px` } as React.CSSProperties}>
        {children}
      </ChartCardPlot>
      {showLegend ? <ChartCardLegend items={legendItemsFromSeries(series)} /> : null}
    </ChartCard>
  );
}

function sharedAxes({
  xKey,
  dual,
  leftTickFormatter,
  rightTickFormatter,
}: {
  xKey: string;
  dual: boolean;
  leftTickFormatter?: (value: number) => string;
  rightTickFormatter?: (value: number) => string;
}) {
  return (
    <>
      <ChartCartesianGridLines />
      <ChartTimeAxis xKey={xKey} />
      <ChartValueAxis yAxisId="left" orientation="left" tickFormatter={leftTickFormatter} />
      {dual ? (
        <ChartValueAxis yAxisId="right" orientation="right" tickFormatter={rightTickFormatter} />
      ) : null}
    </>
  );
}

function defaultTooltip(valueFormatter?: (value: number) => string) {
  return (
    <ChartTooltip
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
  );
}

/** Multi-series area chart (e.g. Token usage). Fills close to y=0 baseline. */
function TimeSeriesAreaChart({
  title,
  description,
  data,
  series,
  xKey = "hour",
  className,
  plotClassName,
  plotHeight = 192,
  leftTickFormatter,
  rightTickFormatter,
  valueFormatter,
  stacked = false,
  chrome,
}: TimeSeriesChartProps) {
  const config = seriesToChartConfig(series);
  const dual = seriesNeedsDualY(series);

  return (
    <ChartCardChrome
      title={title}
      description={description}
      series={series}
      className={className}
      plotClassName={plotClassName}
      plotHeight={plotHeight}
      chrome={chrome}
    >
      <ChartContainer config={config} className="h-full w-full" initialDimension={{ width: 640, height: plotHeight }}>
        <AreaChart data={data} margin={{ top: 4, right: dual ? 4 : 8, left: 0, bottom: 4 }}>
          {sharedAxes({ xKey, dual, leftTickFormatter, rightTickFormatter })}
          {defaultTooltip(valueFormatter)}
          {series.map((s, i) => {
            const color = resolveSeriesColor(s, i);
            const yAxisId = s.yAxis ?? "left";
            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                yAxisId={yAxisId}
                stroke={color}
                fill={color}
                fillOpacity={stacked ? 0.55 : 0.18}
                strokeWidth={1.5}
                baseValue={0}
                stackId={stacked ? "stack" : undefined}
                isAnimationActive={false}
              />
            );
          })}
        </AreaChart>
      </ChartContainer>
    </ChartCardChrome>
  );
}

/** Multi-series line chart; set `yAxis: "right"` on a series for dual-Y (e.g. Cache). */
function TimeSeriesLineChart({
  title,
  description,
  data,
  series,
  xKey = "hour",
  className,
  plotClassName,
  plotHeight = 192,
  leftTickFormatter,
  rightTickFormatter,
  valueFormatter,
  chrome,
}: TimeSeriesChartProps) {
  const config = seriesToChartConfig(series);
  const dual = seriesNeedsDualY(series);

  return (
    <ChartCardChrome
      title={title}
      description={description}
      series={series}
      className={className}
      plotClassName={plotClassName}
      plotHeight={plotHeight}
      chrome={chrome}
    >
      <ChartContainer config={config} className="h-full w-full" initialDimension={{ width: 640, height: plotHeight }}>
        <LineChart data={data} margin={{ top: 4, right: dual ? 4 : 8, left: 0, bottom: 4 }}>
          {sharedAxes({ xKey, dual, leftTickFormatter, rightTickFormatter })}
          {defaultTooltip(valueFormatter)}
          {series.map((s, i) => {
            const color = resolveSeriesColor(s, i);
            const yAxisId = s.yAxis ?? "left";
            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                yAxisId={yAxisId}
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ChartContainer>
    </ChartCardChrome>
  );
}

/** Multi-series bar chart (e.g. Success vs failure). Domain includes 0. */
function TimeSeriesBarChart({
  title,
  description,
  data,
  series,
  xKey = "hour",
  className,
  plotClassName,
  plotHeight = 192,
  leftTickFormatter,
  rightTickFormatter,
  valueFormatter,
  chrome,
}: TimeSeriesChartProps) {
  const config = seriesToChartConfig(series);
  const dual = seriesNeedsDualY(series);
  const canStack =
    series.length > 1 &&
    data.every((row) => series.every((s) => Number(row[s.key] ?? 0) >= 0));
  const stackId = canStack ? "stack" : undefined;
  const [plotWidth, setPlotWidth] = React.useState(640);
  const hostRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (typeof w === "number" && w > 0) setPlotWidth(w);
    });
    ro.observe(el);
    setPlotWidth(el.clientWidth || 640);
    return () => ro.disconnect();
  }, []);

  // Center bucket-start hours in their 4h slot; drop a lone 24:00 end-rail row
  // so we don't paint a bar on the right edge.
  const barData = React.useMemo(
    () =>
      data
        .filter((row) => Number(row[xKey]) < 24)
        .map((row) => {
          const hour = Number(row[xKey]);
          const centered =
            Number.isFinite(hour) && hour % 4 === 0 ? chartBarBucketCenter(hour) : hour;
          return { ...row, [xKey]: centered };
        }),
    [data, xKey],
  );

  const barSize = chartBarSizeForPlotWidth(plotWidth);

  return (
    <ChartCardChrome
      title={title}
      description={description}
      series={series}
      className={className}
      plotClassName={plotClassName}
      plotHeight={plotHeight}
      chrome={chrome}
    >
      <div ref={hostRef} className="h-full w-full">
        <ChartContainer
          config={config}
          className="h-full w-full"
          initialDimension={{ width: 640, height: plotHeight }}
        >
          <BarChart
            data={barData}
            margin={{ top: 4, right: dual ? 4 : 8, left: 0, bottom: 4 }}
            barCategoryGap="2%"
            barGap={2}
          >
            {sharedAxes({
              xKey,
              dual,
              leftTickFormatter,
              rightTickFormatter,
            })}
            {defaultTooltip(valueFormatter)}
            {series.map((s, i) => {
              const color = resolveSeriesColor(s, i);
              const yAxisId = s.yAxis ?? "left";
              return (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  yAxisId={yAxisId}
                  fill={color}
                  stackId={stackId}
                  radius={i === series.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                  barSize={barSize}
                  isAnimationActive={false}
                />
              );
            })}
          </BarChart>
        </ChartContainer>
      </div>
    </ChartCardChrome>
  );
}

export {
  ChartCartesianGridLines,
  ChartTimeAxis,
  ChartValueAxis,
  ChartTimeTick,
  TimeSeriesAreaChart,
  TimeSeriesLineChart,
  TimeSeriesBarChart,
};
