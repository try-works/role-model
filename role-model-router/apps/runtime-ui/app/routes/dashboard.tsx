import {
  ChartCard,
  ChartCardDescription,
  ChartCardHeader,
  ChartCardPlot,
  ChartCardTitle,
  ChartGrid,
  ChartGridCell,
  PageFilters,
} from "@role-model/ui";
import { useEffect, useMemo, useRef, useState } from "react";

import { CandidateSpaceChart } from "../components/candidate-space-chart";
import { OverviewKitChartBlock } from "../components/overview-chart-block";
import { ErrorState, LoadingState } from "../components/page-primitives";
import { buildCandidateSpacePoints } from "../lib/candidate-space";
import { supportingTextClassName } from "../lib/design-system";
import { startDeferredLiveRefresh } from "../lib/live-refresh";
import { adaptOverviewChartBlock, sortOverviewChartBlocks } from "../lib/overview-chart-adapter";
import type {
  RouterCandidate,
  RuntimeDashboardSnapshot,
  RuntimeModelRecord,
  RuntimeTelemetryAnalyticsDimension,
  RuntimeTelemetryAnalyticsFilters,
  RuntimeTelemetryRequestRecord,
} from "../lib/runtime-api";
import {
  fetchRouterCandidates,
  fetchRuntimeDashboardSnapshot,
  fetchRuntimeModels,
  fetchTelemetryAnalytics,
  fetchTelemetryRequests,
  subscribeRuntimeRefreshStream,
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
  const [candidates, setCandidates] = useState<readonly RouterCandidate[]>([]);
  const [models, setModels] = useState<readonly RuntimeModelRecord[]>([]);
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
        const [nextSnapshot, nextCandidates, nextModels, nextRequests, chartResults] =
          await Promise.all([
            fetchRuntimeDashboardSnapshot(),
            fetchRouterCandidates().catch(() => [] as RouterCandidate[]),
            fetchRuntimeModels().catch(() => [] as RuntimeModelRecord[]),
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
        setCandidates(nextCandidates);
        setModels(nextModels);
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
      subscribe: (onEvent) => subscribeRuntimeRefreshStream(onEvent),
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

  const candidatePoints = useMemo(() => {
    const pricingByModelId = new Map<string, number>();
    for (const model of models) {
      const inputPer1M = model.pricing?.inputPer1M;
      if (typeof inputPer1M === "number" && Number.isFinite(inputPer1M) && inputPer1M >= 0) {
        pricingByModelId.set(model.id, inputPer1M);
      }
    }
    return buildCandidateSpacePoints(candidates, Number.POSITIVE_INFINITY, pricingByModelId);
  }, [candidates, models]);

  if (error) {
    return <ErrorState label={error} />;
  }

  return (
    <>
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
        <p className={`${supportingTextClassName} text-[var(--rm-warning-fg)]`}>
          Some charts may be using cached data from a previous refresh ({staleCharts.length} chart
          {staleCharts.length !== 1 ? "s" : ""}).
        </p>
      ) : null}

      {!(loading && !snapshot && charts.length === 0) ? (
        <ChartGrid>
          <ChartGridCell span={12}>
            <ChartCard chrome="cell">
              <ChartCardHeader>
                <ChartCardTitle>Model pool</ChartCardTitle>
                <ChartCardDescription>
                  Route candidates by quality, cost, and speed. Marker size is proportional to route
                  score. Cost axis is inverted: higher is cheaper.
                </ChartCardDescription>
              </ChartCardHeader>
              <ChartCardPlot>
                <CandidateSpaceChart points={candidatePoints} />
              </ChartCardPlot>
            </ChartCard>
          </ChartGridCell>
          {chartBlocks.map((block) => (
            <ChartGridCell key={block.title} span={block.span}>
              <OverviewKitChartBlock block={block} />
            </ChartGridCell>
          ))}
        </ChartGrid>
      ) : null}
    </>
  );
}
