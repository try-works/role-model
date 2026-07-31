import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChartCard,
  ChartCardDescription,
  ChartCardHeader,
  ChartCardTitle,
  ChartGrid,
  ChartGridCell,
  PageFilters,
} from "@role-model/ui";

import { OverviewKitChartBlock } from "../components/overview-chart-block";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusPill,
} from "../components/page-primitives";
import {
  foregroundEmphasisClassName,
  mutedPanelClassName,
} from "../lib/design-system";
import { startDeferredLiveRefresh } from "../lib/live-refresh";
import {
  adaptOverviewChartBlock,
  sortOverviewChartBlocks,
} from "../lib/overview-chart-adapter";
import type {
  RuntimeDashboardSnapshot,
  RuntimeTelemetryAnalyticsDimension,
  RuntimeTelemetryAnalyticsFilters,
  RuntimeTelemetryRequestRecord,
} from "../lib/runtime-api";
import {
  fetchRuntimeDashboardSnapshot,
  fetchTelemetryAnalytics,
  fetchTelemetryRequests,
  subscribeTelemetryStream,
} from "../lib/runtime-api";
import {
  buildQuerySnapshot,
  createStaleChartDiagnostic,
  flushStaleRefreshDiagnostics,
  resolveTelemetryChartRefresh,
} from "../lib/stale-refresh-diagnostics";
import {
  telemetryBreakdownOptions,
  telemetryTimeRangeOptions,
} from "../lib/telemetry-chart-config";
import {
  type TelemetryRouteChartDefinition,
  type TelemetryTimeRangeValue,
  buildOverviewChartDefinitions,
} from "../lib/telemetry-route-models";

const overviewBreakdownOptions: Array<{
  label: string;
  value: "" | RuntimeTelemetryAnalyticsDimension;
}> = [
  { label: "Total", value: "" },
  { label: "By requested role", value: "requestedRoleId" },
  { label: "By difficulty", value: "difficultyBucket" },
  { label: "By status", value: "statusFamily" },
  ...telemetryBreakdownOptions.map((option) => ({
    label: `By ${option.label.toLowerCase()}`,
    value: option.value,
  })),
];

const overviewTimeRangeOptions = telemetryTimeRangeOptions.map((option) => ({
  label: option.label,
  value: option.value,
}));

function getWindowMs(timeRange: TelemetryTimeRangeValue): number {
  return telemetryTimeRangeOptions.find((option) => option.value === timeRange)?.windowMs ?? 0;
}

type OverviewChartRecord = {
  readonly definition: TelemetryRouteChartDefinition;
  readonly response?: import("../lib/runtime-api").RuntimeTelemetryAnalyticsResponse;
  readonly errorMessage?: string;
};

function getChartLoadErrorMessage(title: string, value: unknown): string {
  const detail = value instanceof Error ? value.message : "Could not load telemetry analytics.";
  return `${title}: ${detail}`;
}

export default function DashboardRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeDashboardSnapshot | null>(null);
  const [requests, setRequests] = useState<readonly RuntimeTelemetryRequestRecord[]>([]);
  const [charts, setCharts] = useState<readonly OverviewChartRecord[]>([]);
  const chartsRef = useRef<readonly OverviewChartRecord[]>([]);
  const [timeRange, setTimeRange] = useState<TelemetryTimeRangeValue>("day");
  const [breakdownValue, setBreakdownValue] = useState<"" | RuntimeTelemetryAnalyticsDimension>(
    "endpointId",
  );
  const [sourceFilter, setSourceFilter] = useState<"all" | "local" | "remote">("all");
  const [statusFamily, setStatusFamily] = useState<"all" | "success" | "failure" | "unknown">(
    "all",
  );
  const [difficultyBucket, setDifficultyBucket] = useState<"all" | "easy" | "medium" | "hard">(
    "all",
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staleCharts, setStaleCharts] = useState<readonly string[]>([]);

  const breakdown = breakdownValue === "" ? null : breakdownValue;
  const filters = useMemo(
    () =>
      ({
        ...(sourceFilter === "all" ? {} : { sourceTypes: [sourceFilter] }),
        ...(statusFamily === "all" ? {} : { statusFamilies: [statusFamily] }),
        ...(difficultyBucket === "all" ? {} : { difficultyBuckets: [difficultyBucket] }),
      }) satisfies RuntimeTelemetryAnalyticsFilters,
    [difficultyBucket, sourceFilter, statusFamily],
  );

  useEffect(() => {
    let disposed = false;

    const load = async (background = false) => {
      if (!background) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const definitions = buildOverviewChartDefinitions({
          timeRange,
          filters,
          breakdown,
        });
        const [nextSnapshot, nextRequests, chartResults] = await Promise.all([
          fetchRuntimeDashboardSnapshot(),
          fetchTelemetryRequests({
            limit: 60,
            filters,
            windowMs: getWindowMs(timeRange),
          }),
          Promise.allSettled(
            definitions.map((definition) => fetchTelemetryAnalytics(definition.query)),
          ),
        ]);

        if (disposed) {
          return;
        }

        setSnapshot(nextSnapshot);
        setRequests(nextRequests);
        const resolvedCharts = resolveTelemetryChartRefresh({
          background,
          chartResults,
          createDiagnostic: (definition, reason) =>
            createStaleChartDiagnostic({
              routeId: "dashboard",
              chartTitle: definition.title,
              querySnapshot: buildQuerySnapshot(breakdown, timeRange),
              error: reason,
            }),
          definitions,
          getErrorMessage: getChartLoadErrorMessage,
          previousCharts: chartsRef.current,
        });
        chartsRef.current = resolvedCharts.charts;
        setCharts(resolvedCharts.charts);
        setStaleCharts(resolvedCharts.staleChartTitles);
        flushStaleRefreshDiagnostics();
        setError(null);
      } catch (value) {
        if (!disposed) {
          setError(value instanceof Error ? value.message : "Could not load runtime overview.");
        }
      } finally {
        if (!disposed) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    const dispose = startDeferredLiveRefresh({
      load,
      subscribe: (onEvent) => subscribeTelemetryStream(onEvent),
    });

    return () => {
      disposed = true;
      dispose();
    };
  }, [breakdown, filters, timeRange]);

  const chartBlocks = useMemo(
    () =>
      sortOverviewChartBlocks(
        charts.map((chart) =>
          adaptOverviewChartBlock(chart.definition, {
            response: chart.response,
            errorMessage: chart.errorMessage,
            loading: loading && !chart.response,
          }),
        ),
      ),
    [charts, loading],
  );

  const candidateLegend = useMemo(() => {
    const endpoints = snapshot?.endpoints ?? [];
    return endpoints.slice(0, 5).map((endpoint, index) => ({
      id: endpoint.endpointId,
      label: endpoint.modelId,
      detail: endpoint.status,
      selected: index === 0,
    }));
  }, [snapshot]);

  if (error) {
    return <ErrorState label={error} />;
  }

  return (
    <div className="space-y-4">
      <PageFilters
        timeRange={timeRange}
        timeRangeOptions={overviewTimeRangeOptions}
        onTimeRangeChange={(value) => setTimeRange(value as TelemetryTimeRangeValue)}
        fields={[
          {
            id: "breakdown",
            label: "Breakdown",
            value: breakdownValue,
            options: overviewBreakdownOptions,
          },
          {
            id: "source",
            label: "Source filter",
            value: sourceFilter,
            options: [
              { label: "All sources", value: "all" },
              { label: "Local only", value: "local" },
              { label: "Remote only", value: "remote" },
            ],
          },
          {
            id: "status",
            label: "Status",
            value: statusFamily,
            options: [
              { label: "All statuses", value: "all" },
              { label: "Success only", value: "success" },
              { label: "Failure only", value: "failure" },
              { label: "Unknown only", value: "unknown" },
            ],
          },
          {
            id: "difficulty",
            label: "Difficulty",
            value: difficultyBucket,
            options: [
              { label: "All buckets", value: "all" },
              { label: "Easy only", value: "easy" },
              { label: "Medium only", value: "medium" },
              { label: "Hard only", value: "hard" },
            ],
          },
        ]}
        onFieldChange={(id, value) => {
          if (id === "breakdown") {
            setBreakdownValue(value as "" | RuntimeTelemetryAnalyticsDimension);
          } else if (id === "source") {
            setSourceFilter(value as "all" | "local" | "remote");
          } else if (id === "status") {
            setStatusFamily(value as "all" | "success" | "failure" | "unknown");
          } else if (id === "difficulty") {
            setDifficultyBucket(value as "all" | "easy" | "medium" | "hard");
          }
        }}
      />

      {loading && !snapshot && charts.length === 0 ? (
        <LoadingState label="Loading runtime overview…" />
      ) : null}

      {staleCharts.length > 0 ? (
        <div
          className={`${mutedPanelClassName} flex items-center gap-2 border-l-4 border-[var(--rm-chart-warning)] p-3 text-sm`}
        >
          <span className={foregroundEmphasisClassName}>
            Some charts may be using cached data from a previous refresh.
          </span>
          <span className="text-[var(--rm-secondary)]">
            ({staleCharts.length} chart{staleCharts.length !== 1 ? "s" : ""})
          </span>
        </div>
      ) : null}

      {!(loading && !snapshot && charts.length === 0) ? (
      <ChartGrid>
        <ChartGridCell span={12}>
          <ChartCard chrome="cell">
            <ChartCardHeader>
              <ChartCardTitle>Candidate space</ChartCardTitle>
              <ChartCardDescription>
                Route candidates by quality, cost, and speed. Marker size is proportional to route
                score. Cost axis is inverted: higher is cheaper.
              </ChartCardDescription>
            </ChartCardHeader>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
              <div className="flex min-h-[280px] items-center justify-center rounded-md border border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground">
                {candidateLegend.length === 0
                  ? "No routable candidates in the current inventory."
                  : "Candidate scatter uses live endpoint inventory for the legend. Full quality/cost/speed axes land with router candidate telemetry."}
              </div>
              <div className="space-y-2">
                {candidateLegend.length === 0 ? (
                  <EmptyState label="No candidates to list." />
                ) : (
                  candidateLegend.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <span className="truncate font-mono text-[13px]">{entry.label}</span>
                      <StatusPill tone={entry.selected ? "accent" : "neutral"}>
                        {entry.selected ? "Selected" : entry.detail}
                      </StatusPill>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ChartCard>
        </ChartGridCell>
        {chartBlocks.map((block) => (
          <ChartGridCell key={block.title} span={block.span}>
            <OverviewKitChartBlock block={block} />
          </ChartGridCell>
        ))}
      </ChartGrid>
      ) : null}
    </div>
  );
}
