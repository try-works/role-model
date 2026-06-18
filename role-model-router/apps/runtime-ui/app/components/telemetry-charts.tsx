import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";

import { cn } from "../lib/cn";
import type {
  TelemetryRankingChartModel,
  TelemetryTimeSeriesChartModel,
} from "../lib/telemetry-analytics";
import {
  buildTelemetryRankingChartModel,
  buildTelemetryTimeSeriesChartModel,
} from "../lib/telemetry-analytics";
import {
  bodyTextClassName,
  chartAxisCategoryTickStyle,
  chartAxisTickStyle,
  chartBarRadius,
  chartRankingBarRadius,
  eyebrowClassName,
  mutedPanelClassName,
  sectionTitleClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import type { TelemetryRouteChartDefinition } from "../lib/telemetry-route-models";
import type { RuntimeTelemetryAnalyticsResponse } from "../lib/runtime-api";

function ChartLegendContent(props: {
  readonly payload?: ReadonlyArray<{
    readonly color?: string;
    readonly value?: string;
  }>;
}) {
  const items = props.payload ?? [];
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 pt-4">
      {items.map((item) => (
        <div key={`${item.value}:${item.color}`} className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color ?? "var(--rm-chart-neutral-1)" }}
          />
          <span className={`${utilityLabelClassName} text-[var(--rm-secondary)]`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartTooltipContent(props: {
  readonly active?: boolean;
  readonly label?: string;
  readonly payload?: ReadonlyArray<{
    readonly color?: string;
    readonly dataKey?: string | number;
    readonly name?: string;
    readonly value?: number | string | null;
  }>;
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }
  return (
    <div className="min-w-[180px] rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2 shadow-[var(--rm-shadow-card)]">
      {props.label ? <p className={eyebrowClassName}>{props.label}</p> : null}
      <div className="mt-2 space-y-1.5">
        {props.payload.map((entry) => (
          <div
            key={`${entry.name}:${entry.dataKey}`}
            className="flex items-center justify-between gap-4"
          >
            <span className="inline-flex items-center gap-2 text-[var(--rm-secondary)]">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color ?? "var(--rm-chart-neutral-1)" }}
              />
              <span className={utilityLabelClassName}>{entry.name}</span>
            </span>
            <span className={`${utilityLabelClassName} text-[var(--rm-fg)]`}>
              {entry.value ?? "n/a"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TelemetryChartSkeleton() {
  return (
    <div className="grid min-h-[240px] gap-3">
      <div className="flex items-end gap-2">
        <div className="h-24 w-1/6 rounded-[8px] bg-[var(--rm-panel)]" />
        <div className="h-32 w-1/6 rounded-[8px] bg-[var(--rm-panel)]" />
        <div className="h-20 w-1/6 rounded-[8px] bg-[var(--rm-panel)]" />
        <div className="h-36 w-1/6 rounded-[8px] bg-[var(--rm-panel)]" />
        <div className="h-28 w-1/6 rounded-[8px] bg-[var(--rm-panel)]" />
      </div>
      <p className={`${bodyTextClassName} text-[var(--rm-secondary)]`}>Loading chart data…</p>
    </div>
  );
}

export function TelemetryChartCard({
  title,
  description,
  loading = false,
  emptyMessage,
  refreshing = false,
  minHeightClassName = "min-h-[240px]",
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly loading?: boolean;
  readonly emptyMessage?: string;
  readonly refreshing?: boolean;
  readonly minHeightClassName?: string;
  readonly children?: ReactNode;
}) {
  return (
    <section className="rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-5 py-5 md:px-6 md:py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h3 className={`text-[var(--rm-fg)] ${sectionTitleClassName}`}>{title}</h3>
          {description ? (
            <p className={`${bodyTextClassName} max-w-[65ch] text-[var(--rm-secondary)]`}>
              {description}
            </p>
          ) : null}
        </div>
        {refreshing ? (
          <span
            className={cn(
              "inline-flex min-h-[28px] items-center rounded-[var(--rm-radius-pill)] border border-[var(--rm-border)] px-3 py-1.5",
              `${utilityLabelClassName} text-[var(--rm-secondary)]`,
            )}
          >
            Refreshing…
          </span>
        ) : null}
      </div>
      <div className={cn("mt-5", minHeightClassName)}>
        {loading ? (
          <TelemetryChartSkeleton />
        ) : emptyMessage ? (
          <div
            className={cn(
              mutedPanelClassName,
              `${minHeightClassName} flex items-center p-6 ${bodyTextClassName} text-[var(--rm-secondary)]`,
            )}
          >
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function TelemetryAreaTimeSeriesChart({
  model,
}: {
  readonly model: TelemetryTimeSeriesChartModel;
}) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={[...model.data]}>
          <CartesianGrid stroke="var(--rm-divider-soft)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="bucketLabel"
            tick={chartAxisTickStyle}
            tickLine={false}
          />
          <YAxis axisLine={false} tick={chartAxisTickStyle} tickLine={false} />
          <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: "var(--rm-border)" }} />
          <Legend content={<ChartLegendContent />} />
          {model.series.map((series) => (
            <Area
              key={series.key}
              dataKey={series.dataKey}
              fill={series.colorToken}
              fillOpacity={series.fillOpacity}
              name={series.label}
              stroke={series.colorToken}
              strokeOpacity={series.strokeOpacity}
              strokeWidth={2}
              type="monotone"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TelemetryLineTimeSeriesChart({
  model,
}: {
  readonly model: TelemetryTimeSeriesChartModel;
}) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={[...model.data]}>
          <CartesianGrid stroke="var(--rm-divider-soft)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="bucketLabel"
            tick={chartAxisTickStyle}
            tickLine={false}
          />
          <YAxis axisLine={false} tick={chartAxisTickStyle} tickLine={false} />
          <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: "var(--rm-border)" }} />
          <Legend content={<ChartLegendContent />} />
          {model.series.map((series) => (
            <Line
              key={series.key}
              dataKey={series.dataKey}
              dot={false}
              name={series.label}
              stroke={series.colorToken}
              strokeOpacity={series.strokeOpacity}
              strokeWidth={2}
              type="monotone"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TelemetryBarTimeSeriesChart({
  model,
}: {
  readonly model: TelemetryTimeSeriesChartModel;
}) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[...model.data]}>
          <CartesianGrid stroke="var(--rm-divider-soft)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="bucketLabel"
            tick={chartAxisTickStyle}
            tickLine={false}
          />
          <YAxis axisLine={false} tick={chartAxisTickStyle} tickLine={false} />
          <Tooltip content={<ChartTooltipContent />} cursor={{ fill: "var(--rm-panel)" }} />
          <Legend content={<ChartLegendContent />} />
          {model.series.map((series) => (
            <Bar key={series.key} dataKey={series.dataKey} fill={series.colorToken} name={series.label} radius={chartBarRadius} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TelemetryRankingBarChart({
  model,
}: {
  readonly model: TelemetryRankingChartModel;
}) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[...model.rows]} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid stroke="var(--rm-divider-soft)" horizontal={false} />
          <XAxis axisLine={false} tick={chartAxisTickStyle} tickLine={false} type="number" />
          <YAxis
            axisLine={false}
            dataKey="label"
            tick={chartAxisCategoryTickStyle}
            tickLine={false}
            type="category"
            width={128}
          />
          <Tooltip content={<ChartTooltipContent />} cursor={{ fill: "var(--rm-panel)" }} />
          <Bar dataKey="value" name={model.title} radius={chartRankingBarRadius}>
            {model.rows.map((row) => (
              <Cell key={row.key} fill={row.colorToken} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TelemetryAnalyticsChartCard({
  definition,
  response,
  loading = false,
  refreshing = false,
}: {
  readonly definition: TelemetryRouteChartDefinition;
  readonly response?: RuntimeTelemetryAnalyticsResponse;
  readonly loading?: boolean;
  readonly refreshing?: boolean;
}) {
  if (!response) {
    return (
      <TelemetryChartCard
        title={definition.title}
        description={definition.description}
        loading={loading}
        minHeightClassName={definition.minHeightClassName}
      />
    );
  }

  if (definition.kind === "ranking") {
    const model = buildTelemetryRankingChartModel(response, {
      title: definition.title,
      metric: definition.metrics[0] ?? "requestCount",
    });
    return (
      <TelemetryChartCard
        title={definition.title}
        description={definition.description}
        emptyMessage={model.isEmpty ? definition.emptyMessage : undefined}
        minHeightClassName={definition.minHeightClassName}
        refreshing={refreshing}
      >
        <TelemetryRankingBarChart model={model} />
      </TelemetryChartCard>
    );
  }

  const model = buildTelemetryTimeSeriesChartModel(response, {
    title: definition.title,
    metrics: definition.metrics,
    breakdown: response.breakdown,
  });

  return (
    <TelemetryChartCard
      title={definition.title}
      description={definition.description}
      emptyMessage={model.isEmpty ? definition.emptyMessage : undefined}
      minHeightClassName={definition.minHeightClassName}
      refreshing={refreshing}
    >
      {definition.kind === "area" ? (
        <TelemetryAreaTimeSeriesChart model={model} />
      ) : definition.kind === "line" ? (
        <TelemetryLineTimeSeriesChart model={model} />
      ) : (
        <TelemetryBarTimeSeriesChart model={model} />
      )}
    </TelemetryChartCard>
  );
}
