import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
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
} from "recharts";

import { StatusPill } from "../components/page-primitives";
import { cn } from "../lib/cn";
import {
  chartAxisTickStyle,
  chartBarRadius,
  chartHorizontalRankingLegend,
  chartRankingBarRadius,
  eyebrowClassName,
  getTelemetryChartStatePillTone,
  inlineTitleClassName,
  mutedPanelClassName,
  supportingTextClassName,
  telemetryChartStates,
  utilityLabelClassName,
} from "../lib/design-system";
import type { RuntimeTelemetryAnalyticsResponse } from "../lib/runtime-api";
import type {
  TelemetryRankingChartModel,
  TelemetryTimeSeriesChartModel,
} from "../lib/telemetry-analytics";
import {
  buildTelemetryRankingChartModel,
  buildTelemetryTimeSeriesChartModel,
} from "../lib/telemetry-analytics";
import type { TelemetryRouteChartDefinition } from "../lib/telemetry-route-models";

const chartTimeSeriesMargin = {
  top: 4,
  right: 8,
  bottom: 0,
  left: -18,
} as const;

const chartCompactYAxisProps = {
  axisLine: false,
  tick: chartAxisTickStyle,
  tickLine: false,
  width: 36,
} as const;

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

type TelemetryChartCardStateKind = keyof typeof telemetryChartStates;

type TelemetryChartCardState = {
  readonly kind: TelemetryChartCardStateKind;
  readonly message?: string;
};

function TelemetryChartStateBadge({
  state,
}: {
  readonly state: TelemetryChartCardState;
}) {
  return (
    <StatusPill tone={getTelemetryChartStatePillTone(state.kind)}>
      {telemetryChartStates[state.kind].label}
    </StatusPill>
  );
}

function TelemetryChartStateMessage({ state }: { readonly state: TelemetryChartCardState }) {
  const message = state.message ?? telemetryChartStates[state.kind].copy;
  if (state.kind === "partial" || state.kind === "truncated") {
    return (
      <div
        className={cn(
          "rounded-[var(--rm-radius-md)] border border-[var(--rm-warning)] px-4 py-3",
          `${utilityLabelClassName} text-[var(--rm-warning)]`,
        )}
      >
        {message}
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div
        className={cn(
          "rounded-[var(--rm-radius-panel)] border border-[var(--rm-error)] bg-[var(--rm-error-ghost)] p-6",
          `${utilityLabelClassName} text-[var(--rm-error)]`,
        )}
      >
        {message}
      </div>
    );
  }

  if (state.kind === "unsupported") {
    return (
      <div
        className={cn(
          "rounded-[var(--rm-radius-panel)] border border-[var(--rm-warning)] p-6",
          `${utilityLabelClassName} text-[var(--rm-warning)]`,
        )}
      >
        {message}
      </div>
    );
  }

  return (
    <div
      className={cn(
        mutedPanelClassName,
        `${utilityLabelClassName} border-dashed px-5 py-4 text-[var(--rm-secondary)]`,
      )}
    >
      {message}
    </div>
  );
}

function getTelemetryChartCardState(
  input: {
    readonly modelState?:
      | TelemetryTimeSeriesChartModel["state"]
      | TelemetryRankingChartModel["state"];
    readonly isEmpty?: boolean;
    readonly emptyMessage?: string;
  } = {},
): TelemetryChartCardState | undefined {
  if (input.modelState) {
    return {
      kind: input.modelState.kind,
      message: input.modelState.message,
    };
  }
  if (input.isEmpty && input.emptyMessage) {
    return {
      kind: "empty",
      message: input.emptyMessage,
    };
  }
  return undefined;
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
      <p className={supportingTextClassName}>Loading chart data…</p>
    </div>
  );
}

export function TelemetryChartCard({
  title,
  description,
  loading = false,
  emptyMessage,
  refreshing = false,
  state,
  minHeightClassName = "min-h-[240px]",
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly loading?: boolean;
  readonly emptyMessage?: string;
  readonly refreshing?: boolean;
  readonly state?: TelemetryChartCardState;
  readonly minHeightClassName?: string;
  readonly children?: ReactNode;
}) {
  const resolvedState =
    state ?? (emptyMessage ? { kind: "empty" as const, message: emptyMessage } : undefined);
  const blockingState =
    resolvedState &&
    (resolvedState.kind === "empty" ||
      resolvedState.kind === "unsupported" ||
      resolvedState.kind === "error")
      ? resolvedState
      : undefined;
  const isCompactEmptyState = blockingState?.kind === "empty";
  const inlineState =
    resolvedState && !blockingState && resolvedState.kind !== "populated"
      ? resolvedState
      : undefined;
  const showStateBadge = resolvedState && resolvedState.kind !== "empty";

  return (
    <section className="rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-5 py-5 md:px-6 md:py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h3 className={`text-[var(--rm-fg)] ${inlineTitleClassName}`}>{title}</h3>
          {description ? (
            <p className={`${supportingTextClassName} max-w-[65ch]`}>{description}</p>
          ) : null}
        </div>
        {refreshing || resolvedState ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {showStateBadge ? <TelemetryChartStateBadge state={resolvedState} /> : null}
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
        ) : null}
      </div>
      <div className={cn("mt-5", isCompactEmptyState ? null : minHeightClassName)}>
        {loading ? (
          <TelemetryChartSkeleton />
        ) : blockingState ? (
          <div
            className={cn(
              isCompactEmptyState ? null : minHeightClassName,
              isCompactEmptyState ? null : "flex items-center",
            )}
          >
            <TelemetryChartStateMessage state={blockingState} />
          </div>
        ) : (
          <div className="flex h-full flex-col gap-4">
            {inlineState ? <TelemetryChartStateMessage state={inlineState} /> : null}
            {children}
          </div>
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
        <AreaChart data={[...model.data]} margin={chartTimeSeriesMargin}>
          <CartesianGrid stroke="var(--rm-divider-soft)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="bucketLabel"
            tick={chartAxisTickStyle}
            tickLine={false}
          />
          <YAxis {...chartCompactYAxisProps} />
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
        <LineChart data={[...model.data]} margin={chartTimeSeriesMargin}>
          <CartesianGrid stroke="var(--rm-divider-soft)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="bucketLabel"
            tick={chartAxisTickStyle}
            tickLine={false}
          />
          <YAxis {...chartCompactYAxisProps} />
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
        <BarChart data={[...model.data]} margin={chartTimeSeriesMargin}>
          <CartesianGrid stroke="var(--rm-divider-soft)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="bucketLabel"
            tick={chartAxisTickStyle}
            tickLine={false}
          />
          <YAxis {...chartCompactYAxisProps} />
          <Tooltip content={<ChartTooltipContent />} cursor={{ fill: "var(--rm-panel)" }} />
          <Legend content={<ChartLegendContent />} />
          {model.series.map((series) => (
            <Bar
              key={series.key}
              dataKey={series.dataKey}
              fill={series.colorToken}
              name={series.label}
              radius={chartBarRadius}
            />
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
    <div className="w-full">
      <div data-chart-horizontal-plot="true" className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...model.rows]} layout="vertical" margin={{ left: 0, right: 8 }}>
            <CartesianGrid stroke="var(--rm-divider-soft)" horizontal={false} />
            <XAxis axisLine={false} tick={chartAxisTickStyle} tickLine={false} type="number" />
            <YAxis
              axisLine={false}
              dataKey="label"
              tick={false}
              tickLine={false}
              type="category"
              width={chartHorizontalRankingLegend.axisCategoryWidth}
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
      <div data-chart-horizontal-legend={chartHorizontalRankingLegend.placement}>
        <ChartLegendContent
          payload={model.rows.map((row) => ({
            color: row.colorToken,
            value: row.label,
          }))}
        />
      </div>
    </div>
  );
}

export function TelemetryAnalyticsChartCard({
  definition,
  response,
  loading = false,
  refreshing = false,
  errorMessage,
}: {
  readonly definition: TelemetryRouteChartDefinition;
  readonly response?: RuntimeTelemetryAnalyticsResponse;
  readonly loading?: boolean;
  readonly refreshing?: boolean;
  readonly errorMessage?: string;
}) {
  if (!response) {
    return (
      <TelemetryChartCard
        title={definition.title}
        description={definition.description}
        loading={loading}
        state={
          errorMessage
            ? {
                kind: "error",
                message: errorMessage,
              }
            : undefined
        }
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
        state={getTelemetryChartCardState({
          modelState: model.state,
          isEmpty: model.isEmpty,
          emptyMessage: definition.emptyMessage,
        })}
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
      state={getTelemetryChartCardState({
        modelState: model.state,
        isEmpty: model.isEmpty,
        emptyMessage: definition.emptyMessage,
      })}
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
