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

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "./chart";
import {
  ChartCard,
  ChartCardDescription,
  ChartCardHeader,
  ChartCardLegend,
  ChartCardPlot,
  ChartCardTitle,
  type ChartLegendItem,
} from "./chart-card";
import { cn } from "./lib/utils";

/** 7 ticks on a 24h domain: bucket starts 00:00…20:00 plus end 24:00 (RM3 rule #8 · Day). */
export const CHART_TIME_TICKS = [0, 4, 8, 12, 16, 20, 24] as const;

/** Six 4h buckets (no end-rail point). Bars sit in these slots; 24:00 is axis-only. */
export const CHART_TIME_BUCKETS = [0, 4, 8, 12, 16, 20] as const;

export type ChartTimeHour = (typeof CHART_TIME_TICKS)[number];

/** Day view uses the fixed 24h clock; longer windows use indexed bucket labels. */
export type ChartTimeAxisMode = "day-24h" | "window";

export function formatChartTimeTick(hour: number): string {
  const h = Math.max(0, Math.min(24, Math.round(hour)));
  return `${String(h).padStart(2, "0")}:00`;
}

/**
 * Up to `maxTicks` evenly spaced indices across `pointCount` buckets (inclusive ends).
 * Used for Week / Month / 90d axes so labels track the selected window.
 */
export function chartWindowTickIndices(pointCount: number, maxTicks = 7): number[] {
  if (pointCount <= 0) {
    return [];
  }
  if (pointCount === 1) {
    return [0];
  }
  const tickCount = Math.min(maxTicks, pointCount);
  const indices: number[] = [];
  for (let i = 0; i < tickCount; i += 1) {
    indices.push(Math.round((i / (tickCount - 1)) * (pointCount - 1)));
  }
  return [...new Set(indices)];
}

/**
 * Window **bars** use domain `[0, n]` with `n` buckets.
 * Values sit at bucket centers; vertical grid rails sit on integer boundaries.
 * Line/area charts use integer indices on `[0, n-1]` instead (see `resolveTimeAxis`).
 */
export function chartWindowBucketCenter(index: number): number {
  return index + 0.5;
}

/** Boundary rails for `n` window buckets: `0…n` inclusive (bar grid). */
export function chartWindowBoundaryTicks(pointCount: number): number[] {
  if (pointCount <= 0) {
    return [0];
  }
  return Array.from({ length: pointCount + 1 }, (_, i) => i);
}

/** Every bucket center on `[0, n]` — keeps Recharts bar/hover band = one slot. */
export function chartWindowCenterTicks(pointCount: number): number[] {
  if (pointCount <= 0) {
    return [];
  }
  return Array.from({ length: pointCount }, (_, i) => chartWindowBucketCenter(i));
}

/**
 * Visible X label positions for window **line/area** charts (integer indices on `[0, n-1]`).
 * Bars use `chartWindowCenterTicks` / boundary grid instead.
 */
export function chartWindowLabelTicks(pointCount: number, maxTicks = 7): number[] {
  return chartWindowTickIndices(pointCount, maxTicks);
}

/** Hours per vertical grid column on the day-24h axis (7 ticks → 6 bands). */
export const CHART_DAY_BAND_HOURS = 4;

/** Center a bucket-start hour in its 4h slot so bars sit between tick rails. */
export function chartBarBucketCenter(bucketStartHour: number): number {
  return bucketStartHour + CHART_DAY_BAND_HOURS / 2;
}

/**
 * Bar width for a 4h grid column on a 0–24 number axis.
 * Matches the vertical grid band exactly (full column, no max-width cap).
 */
export function chartBarSizeForPlotWidth(plotWidth: number): number {
  if (plotWidth <= 0) return 32;
  return Math.max(8, Math.floor(plotWidth * (CHART_DAY_BAND_HOURS / 24)));
}

/**
 * Bar width for one window bucket on domain `[0, n]`.
 * Matches the bucket band exactly (full column, no max-width cap).
 */
export function chartWindowBarSizeForPlotWidth(plotWidth: number, pointCount: number): number {
  if (plotWidth <= 0 || pointCount <= 0) return 32;
  return Math.max(8, Math.floor(plotWidth / pointCount));
}

/** Y domain always includes 0 (RM3 rule #9). Allows negative values for diverging bars. */
export function chartValueDomain(
  includeZero = true,
): [number | "auto", number | "auto"] | [(dataMin: number) => number, (dataMax: number) => number] {
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
  /** X-axis key. Day: `hour` (0–24). Window: `t` (bucket index). Default `hour`. */
  xKey?: string;
  /** Day keeps RM3 24h clock; window uses indexed labels for week/month/90d. */
  xAxisMode?: ChartTimeAxisMode;
  /** Numeric domain for the X scale. Defaults: day `[0,24]`, window `[0, n-1]`. */
  xDomain?: [number, number];
  /** Explicit tick positions (defaults to CHART_TIME_TICKS or window indices). */
  xTicks?: readonly number[];
  /** Label formatter for X ticks (defaults to `HH:00` in day mode). */
  xTickFormatter?: (value: number) => string;
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
  "var(--rm3-chart-1)",
  "var(--rm3-chart-2)",
  "var(--rm3-chart-3)",
  "var(--rm3-chart-6)",
  "var(--rm3-chart-5)",
  "var(--rm3-chart-7)",
  "var(--rm3-chart-8)",
  "var(--rm3-chart-4)",
] as const;

export function resolveSeriesColor(series: ChartSeries, index: number): string {
  return (
    series.color ??
    DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length] ??
    DEFAULT_SERIES_COLORS[0]
  );
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

export function seriesNeedsDualY(series: readonly ChartSeries[]): boolean {
  return series.some((s) => (s.yAxis ?? "left") === "right");
}

/** Y gutter sizing — default 40; widen for long ticks (e.g. `$0.10`) so labels are not clipped. */
export const CHART_Y_AXIS = {
  widthMin: 40,
  widthMax: 88,
  tickMargin: 6,
  /** Mono ~10px glyph advance used for gutter sizing (err high for `$` / commas). */
  tickCharacterWidth: 8,
  /** Extra room beyond glyph estimate (tickMargin + antialias + overflow clip). */
  tickHorizontalPadding: 24,
  /** Legend/plot rail beyond Y width (40 + 16 → 56 at default). */
  legendGutter: 16,
  /** Keep labels off the SVG clip edge inside ChartGrid overflow. */
  plotMarginLeft: 4,
} as const;

export function resolveChartYAxisWidth(labels: readonly string[]): number {
  const widest = labels.reduce((width, label) => Math.max(width, Array.from(label).length), 0);
  return Math.min(
    CHART_Y_AXIS.widthMax,
    Math.max(
      CHART_Y_AXIS.widthMin,
      widest * CHART_Y_AXIS.tickCharacterWidth + CHART_Y_AXIS.tickHorizontalPadding,
    ),
  );
}

function defaultAxisTickLabel(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  if (Math.abs(value) >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2);
}

/** Sample formatted tick labels for a Y side so gutter width can fit currency / k-suffix ticks. */
export function collectChartAxisTickLabels(
  data: readonly Record<string, string | number>[],
  series: readonly ChartSeries[],
  side: ChartSeriesYAxis,
  formatter?: (value: number) => string,
): string[] {
  const keys = series.filter((entry) => (entry.yAxis ?? "left") === side).map((entry) => entry.key);
  if (keys.length === 0) {
    return [];
  }

  const values: number[] = [0];
  for (const row of data) {
    for (const key of keys) {
      const value = row[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        values.push(value);
      }
    }
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const format = formatter ?? defaultAxisTickLabel;
  return [
    ...new Set(
      [min, (min + max) / 2, max, 0]
        .map((value) => format(value))
        .filter((label) => label.length > 0),
    ),
  ];
}

export function resolveChartYAxisLayout(input: {
  data: readonly Record<string, string | number>[];
  series: readonly ChartSeries[];
  leftTickFormatter?: (value: number) => string;
  rightTickFormatter?: (value: number) => string;
}): {
  leftWidth: number;
  rightWidth: number;
  legendInset: number;
} {
  const dual = seriesNeedsDualY(input.series);
  const leftWidth = resolveChartYAxisWidth(
    collectChartAxisTickLabels(input.data, input.series, "left", input.leftTickFormatter),
  );
  const rightWidth = dual
    ? resolveChartYAxisWidth(
        collectChartAxisTickLabels(input.data, input.series, "right", input.rightTickFormatter),
      )
    : 0;
  return {
    leftWidth,
    rightWidth,
    legendInset: leftWidth + CHART_Y_AXIS.legendGutter,
  };
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
  formatLabel = formatChartTimeTick,
  endValue = 24,
  /** When true, all ticks are bucket centers — always middle-aligned. */
  centerLabels = false,
}: {
  x?: number;
  y?: number;
  payload?: { value?: number };
  width?: number;
  formatLabel?: (value: number) => string;
  endValue?: number;
  centerLabels?: boolean;
}) {
  const value = Number(payload?.value ?? 0);
  const label = formatLabel(value);
  const plotWidth = width ?? 0;
  // Day rails: first left-aligned; middle centered; last right-aligned on end rail.
  // Window centers: always middle under the bucket.
  let textAnchor: "start" | "middle" | "end" = "middle";
  let dx = 0;
  if (!centerLabels) {
    if (value === 0) {
      textAnchor = "start";
      dx = 0;
    } else if (value === endValue || (plotWidth > 0 && (x ?? 0) >= plotWidth - 1)) {
      textAnchor = "end";
      dx = 0;
    }
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

function resolveTimeAxis(input: {
  xKey: string;
  xAxisMode?: ChartTimeAxisMode;
  xDomain?: [number, number];
  xTicks?: readonly number[];
  xTickFormatter?: (value: number) => string;
  pointCount?: number;
  /** Bars keep the day-like band model; line/area sit on shared integer rails. */
  seriesKind?: "line" | "bar";
}) {
  const mode = input.xAxisMode ?? "day-24h";
  if (mode === "window") {
    const n = Math.max(1, input.pointCount ?? 1);
    const formatLabel = input.xTickFormatter ?? ((value: number) => String(value));
    if (input.seriesKind === "bar") {
      // Domain [0, n]: bars at centers, grid on boundaries (matches day 4h bands).
      const domain = [0, n] as [number, number];
      const labelTicks = chartWindowCenterTicks(n).filter((_, i) =>
        chartWindowLabelTicks(n).includes(i),
      );
      const gridTicks = chartWindowBoundaryTicks(n);
      return {
        xKey: input.xKey,
        domain,
        ticks: labelTicks,
        labelTicks,
        gridTicks,
        formatLabel: (value: number) => formatLabel(Math.floor(value)),
        endValue: domain[1],
        centerLabels: true,
      };
    }
    // Line/area: integer bucket indices share rails with labels + grid.
    const domain = input.xDomain ?? ([0, Math.max(n - 1, 0)] as [number, number]);
    const labelTicks = [...(input.xTicks ?? chartWindowLabelTicks(n))];
    return {
      xKey: input.xKey,
      domain,
      ticks: labelTicks,
      labelTicks,
      gridTicks: labelTicks,
      formatLabel,
      endValue: domain[1],
      centerLabels: false,
    };
  }
  const dayTicks = [...(input.xTicks ?? CHART_TIME_TICKS)];
  return {
    xKey: input.xKey,
    domain: input.xDomain ?? ([0, 24] as [number, number]),
    ticks: dayTicks,
    labelTicks: dayTicks,
    gridTicks: dayTicks,
    formatLabel: input.xTickFormatter ?? formatChartTimeTick,
    endValue: (input.xDomain ?? [0, 24])[1],
    centerLabels: false,
  };
}

function ChartCartesianGridLines() {
  return (
    <CartesianGrid
      vertical
      horizontal
      stroke="currentColor"
      // Horizontals ≈5% ink; baseline strengthened via CSS on last horizontal (RM3 #9).
      strokeOpacity={0.05}
      strokeDasharray="0"
      className="[&_line]:[vector-effect:non-scaling-stroke] [&_.recharts-cartesian-grid-horizontal_line:last-child]:opacity-[1.6]"
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
  width = CHART_Y_AXIS.widthMin,
}: {
  yAxisId: string;
  orientation: "left" | "right";
  tickFormatter?: (value: number) => string;
  width?: number;
}) {
  return (
    <YAxis
      yAxisId={yAxisId}
      orientation={orientation}
      domain={chartValueDomain(true)}
      tickLine={false}
      axisLine={false}
      width={width}
      tickMargin={CHART_Y_AXIS.tickMargin}
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
  legendInset = CHART_Y_AXIS.widthMin + CHART_Y_AXIS.legendGutter,
  children,
}: {
  title: string;
  description?: string;
  series: ChartSeries[];
  className?: string;
  plotClassName?: string;
  plotHeight: number;
  chrome?: "standalone" | "cell";
  legendInset?: number;
  children: React.ReactNode;
}) {
  const showLegend = series.length > 1;

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
        {children}
      </ChartCardPlot>
      {showLegend ? (
        <ChartCardLegend
          items={legendItemsFromSeries(series)}
          style={{ paddingLeft: legendInset }}
          className="pl-0"
        />
      ) : null}
    </ChartCard>
  );
}

/**
 * Axis/grid must be *direct* Recharts primitives as chart children.
 * Wrapper components (ChartTimeAxis etc.) are invisible to findAllByType
 * and never participate in layout — series render, axes/grid do not.
 */
function sharedAxes({
  xKey,
  dual,
  leftWidth = CHART_Y_AXIS.widthMin,
  rightWidth = CHART_Y_AXIS.widthMin,
  leftTickFormatter,
  rightTickFormatter,
  xAxisMode,
  xDomain,
  xTicks,
  xTickFormatter,
  pointCount,
  seriesKind = "line",
}: {
  xKey: string;
  dual: boolean;
  leftWidth?: number;
  rightWidth?: number;
  leftTickFormatter?: (value: number) => string;
  rightTickFormatter?: (value: number) => string;
  xAxisMode?: ChartTimeAxisMode;
  xDomain?: [number, number];
  xTicks?: readonly number[];
  xTickFormatter?: (value: number) => string;
  pointCount?: number;
  seriesKind?: "line" | "bar";
}) {
  const axis = resolveTimeAxis({
    xKey,
    xAxisMode,
    xDomain,
    xTicks,
    xTickFormatter,
    pointCount,
    seriesKind,
  });

  return [
    <CartesianGrid
      key="grid"
      vertical
      horizontal
      stroke="currentColor"
      strokeOpacity={0.05}
      strokeDasharray="0"
      className="[&_line]:[vector-effect:non-scaling-stroke] [&_.recharts-cartesian-grid-horizontal_line:last-child]:opacity-[1.6]"
      verticalCoordinatesGenerator={({ xAxis }) => {
        if (!xAxis) return [];
        const { x, width, domain, scale } = xAxis as {
          x: number;
          width: number;
          domain?: [number, number];
          scale?: (v: number) => number;
        };
        if (typeof scale === "function") {
          return axis.gridTicks.map((t) => scale(t));
        }
        const [d0, d1] = domain ?? axis.domain;
        const span = d1 - d0 || 1;
        return axis.gridTicks.map((t) => x + ((t - d0) / span) * width);
      }}
    />,
    <XAxis
      key="time"
      dataKey={axis.xKey}
      type="number"
      domain={axis.domain}
      ticks={axis.ticks}
      tick={(props) => {
        const value = Number(props.payload?.value ?? Number.NaN);
        if (!axis.labelTicks.some((t) => Math.abs(t - value) < 1e-6)) {
          return <g />;
        }
        return (
          <ChartTimeTick
            {...props}
            formatLabel={axis.formatLabel}
            endValue={axis.endValue}
            centerLabels={axis.centerLabels}
          />
        );
      }}
      tickLine={false}
      axisLine={false}
      interval={0}
      height={20}
    />,
    <YAxis
      key="y-left"
      yAxisId="left"
      orientation="left"
      domain={chartValueDomain(true)}
      tickLine={false}
      axisLine={false}
      width={leftWidth}
      tickMargin={CHART_Y_AXIS.tickMargin}
      tick={{
        fill: "currentColor",
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        // Sit the glyph on the grid rail (Recharts default sits slightly below).
        dy: -3,
      }}
      tickFormatter={leftTickFormatter as ((value: number) => string) | undefined}
      className="text-muted-foreground"
    />,
    dual ? (
      <YAxis
        key="y-right"
        yAxisId="right"
        orientation="right"
        domain={chartValueDomain(true)}
        tickLine={false}
        axisLine={false}
        width={rightWidth}
        tickMargin={CHART_Y_AXIS.tickMargin}
        tick={{
          fill: "currentColor",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          dy: -3,
        }}
        tickFormatter={rightTickFormatter as ((value: number) => string) | undefined}
        className="text-muted-foreground"
      />
    ) : null,
  ];
}

function defaultTooltip(
  valueFormatter?: (value: number) => string,
  cursor?: React.ComponentProps<typeof ChartTooltip>["cursor"],
) {
  return (
    <ChartTooltip
      cursor={cursor}
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
  xAxisMode,
  xDomain,
  xTicks,
  xTickFormatter,
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
  const yLayout = resolveChartYAxisLayout({
    data,
    series,
    leftTickFormatter,
    rightTickFormatter,
  });

  return (
    <ChartCardChrome
      title={title}
      description={description}
      series={series}
      className={className}
      plotClassName={plotClassName}
      plotHeight={plotHeight}
      chrome={chrome}
      legendInset={yLayout.legendInset}
    >
      <ChartContainer
        config={config}
        className="h-full w-full"
        initialDimension={{ width: 640, height: plotHeight }}
      >
        <AreaChart
          data={data}
          margin={{
            top: 4,
            right: dual ? 4 : 8,
            left: CHART_Y_AXIS.plotMarginLeft,
            bottom: 4,
          }}
        >
          {sharedAxes({
            xKey,
            dual,
            leftWidth: yLayout.leftWidth,
            rightWidth: yLayout.rightWidth,
            leftTickFormatter,
            rightTickFormatter,
            xAxisMode,
            xDomain,
            xTicks,
            xTickFormatter,
            pointCount: data.length,
          })}
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
                fillOpacity={stacked ? 0.55 : 0.4}
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
  xAxisMode,
  xDomain,
  xTicks,
  xTickFormatter,
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
  const yLayout = resolveChartYAxisLayout({
    data,
    series,
    leftTickFormatter,
    rightTickFormatter,
  });

  return (
    <ChartCardChrome
      title={title}
      description={description}
      series={series}
      className={className}
      plotClassName={plotClassName}
      plotHeight={plotHeight}
      chrome={chrome}
      legendInset={yLayout.legendInset}
    >
      <ChartContainer
        config={config}
        className="h-full w-full"
        initialDimension={{ width: 640, height: plotHeight }}
      >
        <LineChart
          data={data}
          margin={{
            top: 4,
            right: dual ? 4 : 8,
            left: CHART_Y_AXIS.plotMarginLeft,
            bottom: 4,
          }}
        >
          {sharedAxes({
            xKey,
            dual,
            leftWidth: yLayout.leftWidth,
            rightWidth: yLayout.rightWidth,
            leftTickFormatter,
            rightTickFormatter,
            xAxisMode,
            xDomain,
            xTicks,
            xTickFormatter,
            pointCount: data.length,
          })}
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
  xAxisMode,
  xDomain,
  xTicks,
  xTickFormatter,
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
  const yLayout = resolveChartYAxisLayout({
    data,
    series,
    leftTickFormatter,
    rightTickFormatter,
  });
  const canStack =
    series.length > 1 && data.every((row) => series.every((s) => Number(row[s.key] ?? 0) >= 0));
  const stackId = canStack ? "stack" : undefined;
  const [plotWidth, setPlotWidth] = React.useState(640);
  const hostRef = React.useRef<HTMLDivElement>(null);
  const dayHours = (xAxisMode ?? "day-24h") === "day-24h";

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

  // Day: center bucket-start hours in their 4h slot; drop a lone 24:00 end-rail row.
  // Window: center each integer bucket index in its [i, i+1] band on domain [0, n].
  const barData = React.useMemo(() => {
    if (!dayHours) {
      return data.map((row, index) => {
        const raw = Number(row[xKey]);
        const indexValue = Number.isFinite(raw) ? raw : index;
        // Adapter may already pass centers; otherwise treat as integer index.
        const centered =
          Math.abs((indexValue % 1) - 0.5) < 1e-6
            ? indexValue
            : chartWindowBucketCenter(Math.round(indexValue));
        return { ...row, [xKey]: centered };
      });
    }
    return data
      .filter((row) => Number(row[xKey]) < 24)
      .map((row) => {
        const hour = Number(row[xKey]);
        const centered =
          Number.isFinite(hour) && hour % 4 === 0 ? chartBarBucketCenter(hour) : hour;
        return { ...row, [xKey]: centered };
      });
  }, [data, xKey, dayHours]);

  const barSize = dayHours
    ? chartBarSizeForPlotWidth(
        Math.max(
          0,
          plotWidth -
            CHART_Y_AXIS.plotMarginLeft -
            (dual ? 4 : 8) -
            yLayout.leftWidth -
            (dual ? yLayout.rightWidth : 0),
        ),
      )
    : chartWindowBarSizeForPlotWidth(
        Math.max(
          0,
          plotWidth -
            CHART_Y_AXIS.plotMarginLeft -
            (dual ? 4 : 8) -
            yLayout.leftWidth -
            (dual ? yLayout.rightWidth : 0),
        ),
        Math.max(data.length, 1),
      );

  return (
    <ChartCardChrome
      title={title}
      description={description}
      series={series}
      className={className}
      plotClassName={plotClassName}
      plotHeight={plotHeight}
      chrome={chrome}
      legendInset={yLayout.legendInset}
    >
      <div ref={hostRef} className="h-full w-full">
        <ChartContainer
          config={config}
          className="h-full w-full"
          initialDimension={{ width: 640, height: plotHeight }}
        >
          <BarChart
            data={barData}
            margin={{
              top: 4,
              right: dual ? 4 : 8,
              left: CHART_Y_AXIS.plotMarginLeft,
              bottom: 4,
            }}
            barCategoryGap={0}
            barGap={0}
          >
            {sharedAxes({
              xKey,
              dual,
              leftWidth: yLayout.leftWidth,
              rightWidth: yLayout.rightWidth,
              leftTickFormatter,
              rightTickFormatter,
              xAxisMode,
              // Window bars own [0, n] + centers; ignore line/area [0, n-1] domains.
              xDomain: dayHours ? xDomain : undefined,
              xTicks: dayHours ? xTicks : undefined,
              xTickFormatter,
              pointCount: data.length,
              seriesKind: "bar",
            })}
            {defaultTooltip(valueFormatter, {
              fill: "currentColor",
              fillOpacity: 0.04,
            })}
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
