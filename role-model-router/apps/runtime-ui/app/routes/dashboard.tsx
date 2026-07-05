import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { TelemetryAnalyticsChartCard } from "../components/telemetry-charts";
import { TelemetrySelectField, TelemetryTimeRangeControl } from "../components/telemetry-controls";
import {
  foregroundEmphasisClassName,
  listRowClassName,
  mutedPanelClassName,
  rightAlignedSupportingTextClassName,
  secondaryButtonClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import type {
  RuntimeSnapshot,
  RuntimeTelemetryAnalyticsDimension,
  RuntimeTelemetryAnalyticsFilters,
  RuntimeTelemetryAnalyticsResponse,
  RuntimeTelemetryRequestRecord,
} from "../lib/runtime-api";
import {
  fetchRuntimeSnapshot,
  fetchTelemetryAnalytics,
  fetchTelemetryRequests,
  subscribeTelemetryStream,
} from "../lib/runtime-api";
import { telemetryBreakdownOptions, telemetryTimeRangeOptions } from "../lib/telemetry-chart-config";
import {
  type TelemetryRouteChartDefinition,
  type TelemetryTimeRangeValue,
  buildOverviewChartDefinitions,
} from "../lib/telemetry-route-models";
import { buildDashboardLatestRequestRows, buildEndpointCatalogRows } from "../lib/view-models";
import { usePageActions } from "../lib/shell-header-context";

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

function getWindowMs(timeRange: TelemetryTimeRangeValue): number {
  return telemetryTimeRangeOptions.find((option) => option.value === timeRange)?.windowMs ?? 0;
}

type OverviewChartRecord = {
  readonly definition: TelemetryRouteChartDefinition;
  readonly response?: RuntimeTelemetryAnalyticsResponse;
  readonly errorMessage?: string;
};

function getChartLoadErrorMessage(title: string, value: unknown): string {
  const detail = value instanceof Error ? value.message : "Could not load telemetry analytics.";
  return `${title}: ${detail}`;
}

function collectSelectOptions(
  values: Iterable<string | null | undefined>,
  labels?: ReadonlyMap<string, string>,
): Array<{ label: string; value: string }> {
  const uniqueValues = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      continue;
    }
    uniqueValues.add(trimmed);
  }
  return [...uniqueValues]
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({
      label: labels?.get(value) ?? value,
      value,
    }));
}

export default function DashboardRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [requests, setRequests] = useState<readonly RuntimeTelemetryRequestRecord[]>([]);
  const [charts, setCharts] = useState<readonly OverviewChartRecord[]>([]);
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
  const [providerIdFilter, setProviderIdFilter] = useState("all");
  const [modelIdFilter, setModelIdFilter] = useState("all");
  const [endpointIdFilter, setEndpointIdFilter] = useState("all");
  const [requestedRoleFilter, setRequestedRoleFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const breakdown = breakdownValue === "" ? null : breakdownValue;
  const filters = useMemo(
    () =>
      ({
        ...(sourceFilter === "all" ? {} : { sourceTypes: [sourceFilter] }),
        ...(statusFamily === "all" ? {} : { statusFamilies: [statusFamily] }),
        ...(difficultyBucket === "all" ? {} : { difficultyBuckets: [difficultyBucket] }),
        ...(providerIdFilter === "all" ? {} : { providerIds: [providerIdFilter] }),
        ...(modelIdFilter === "all" ? {} : { modelIds: [modelIdFilter] }),
        ...(endpointIdFilter === "all" ? {} : { endpointIds: [endpointIdFilter] }),
        ...(requestedRoleFilter === "all" ? {} : { requestedRoleIds: [requestedRoleFilter] }),
      }) satisfies RuntimeTelemetryAnalyticsFilters,
    [
      difficultyBucket,
      endpointIdFilter,
      modelIdFilter,
      providerIdFilter,
      requestedRoleFilter,
      sourceFilter,
      statusFamily,
    ],
  );

  const providerOptions = useMemo(
    () => [
      { label: "All providers", value: "all" },
      ...collectSelectOptions([
        ...(snapshot?.endpoints.map((endpoint) => endpoint.providerId) ?? []),
        ...requests.map((request) => request.providerId),
      ]),
    ],
    [requests, snapshot],
  );
  const modelOptions = useMemo(
    () => [
      { label: "All models", value: "all" },
      ...collectSelectOptions([
        ...(snapshot?.endpoints.map((endpoint) => endpoint.modelId) ?? []),
        ...requests.map((request) => request.modelId),
      ]),
    ],
    [requests, snapshot],
  );
  const endpointOptions = useMemo(
    () => [
      { label: "All endpoints", value: "all" },
      ...collectSelectOptions([
        ...(snapshot?.endpoints.map((endpoint) => endpoint.endpointId) ?? []),
        ...requests.map((request) => request.endpointId),
      ]),
    ],
    [requests, snapshot],
  );
  const requestedRoleOptions = useMemo(() => {
    const roleLabels = new Map(
      (snapshot?.roles ?? []).map((role) => [role.roleId, role.label ?? role.roleId]),
    );
    return [
      { label: "All roles", value: "all" },
      ...collectSelectOptions(
        [
          ...(snapshot?.roles.map((role) => role.roleId) ?? []),
          ...requests.flatMap((request) => request.roleIds ?? []),
        ],
        roleLabels,
      ),
    ];
  }, [requests, snapshot]);

  usePageActions(
    <div className="grid max-w-[1320px] gap-3 pt-1">
      <div className="overflow-x-auto pb-1">
        <TelemetryTimeRangeControl onChange={setTimeRange} value={timeRange} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TelemetrySelectField
          className="min-w-0"
          label="Breakdown"
          onChange={(value) => setBreakdownValue(value as "" | RuntimeTelemetryAnalyticsDimension)}
          options={overviewBreakdownOptions}
          value={breakdownValue}
        />
        <TelemetrySelectField
          className="min-w-0"
          label="Source filter"
          onChange={(value) => setSourceFilter(value as "all" | "local" | "remote")}
          options={[
            { label: "All sources", value: "all" },
            { label: "Local only", value: "local" },
            { label: "Remote only", value: "remote" },
          ]}
          value={sourceFilter}
        />
        <TelemetrySelectField
          className="min-w-0"
          label="Status family"
          onChange={(value) => setStatusFamily(value as "all" | "success" | "failure" | "unknown")}
          options={[
            { label: "All statuses", value: "all" },
            { label: "Success only", value: "success" },
            { label: "Failure only", value: "failure" },
            { label: "Unknown only", value: "unknown" },
          ]}
          value={statusFamily}
        />
        <TelemetrySelectField
          className="min-w-0"
          label="Difficulty bucket"
          onChange={(value) => setDifficultyBucket(value as "all" | "easy" | "medium" | "hard")}
          options={[
            { label: "All buckets", value: "all" },
            { label: "Easy only", value: "easy" },
            { label: "Medium only", value: "medium" },
            { label: "Hard only", value: "hard" },
          ]}
          value={difficultyBucket}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TelemetrySelectField
          className="min-w-0"
          label="Provider"
          onChange={setProviderIdFilter}
          options={providerOptions}
          value={providerIdFilter}
        />
        <TelemetrySelectField
          className="min-w-0"
          label="Model"
          onChange={setModelIdFilter}
          options={modelOptions}
          value={modelIdFilter}
        />
        <TelemetrySelectField
          className="min-w-0"
          label="Endpoint"
          onChange={setEndpointIdFilter}
          options={endpointOptions}
          value={endpointIdFilter}
        />
        <TelemetrySelectField
          className="min-w-0"
          label="Requested role"
          onChange={setRequestedRoleFilter}
          options={requestedRoleOptions}
          value={requestedRoleFilter}
        />
      </div>
      <p className={`${utilityLabelClassName} text-[var(--rm-secondary)]`}>
        Overview filters
      </p>
    </div>,
    [
      breakdownValue,
      difficultyBucket,
      endpointIdFilter,
      modelIdFilter,
      providerIdFilter,
      requestedRoleFilter,
      requestedRoleOptions,
      providerOptions,
      modelOptions,
      endpointOptions,
      sourceFilter,
      statusFamily,
      timeRange,
    ],
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
          fetchRuntimeSnapshot(),
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
        setCharts((previousCharts) =>
          definitions.map((definition, index) => {
            const result = chartResults[index];
            if (result?.status === "fulfilled") {
              return {
                definition,
                response: result.value,
              };
            }

            const previousChart = previousCharts.find(
              (chart) => chart.definition.title === definition.title,
            );
            if (background && previousChart?.response) {
              return {
                definition,
                response: previousChart.response,
              };
            }

            return {
              definition,
              errorMessage: getChartLoadErrorMessage(definition.title, result?.reason),
            };
          }),
        );
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

    void load();
    const unsubscribe = subscribeTelemetryStream(() => {
      void load(true);
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [breakdown, filters, timeRange]);

  const endpointRows = useMemo(
    () =>
      snapshot
        ? buildEndpointCatalogRows(
            snapshot.endpoints.filter((endpoint) => {
              if (sourceFilter !== "all" && endpoint.sourceType !== sourceFilter) {
                return false;
              }
              if (providerIdFilter !== "all" && endpoint.providerId !== providerIdFilter) {
                return false;
              }
              if (modelIdFilter !== "all" && endpoint.modelId !== modelIdFilter) {
                return false;
              }
              if (endpointIdFilter !== "all" && endpoint.endpointId !== endpointIdFilter) {
                return false;
              }
              if (
                requestedRoleFilter !== "all" &&
                !(endpoint.roleIds ?? []).includes(requestedRoleFilter)
              ) {
                return false;
              }
              return true;
            }),
          )
        : [],
    [endpointIdFilter, modelIdFilter, providerIdFilter, requestedRoleFilter, snapshot, sourceFilter],
  );
  const requestRows = useMemo(() => buildDashboardLatestRequestRows(requests), [requests]);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (loading && !snapshot && charts.length === 0) {
    return <LoadingState label="Loading runtime overview…" />;
  }

  const chartByTitle = new Map(charts.map((chart) => [chart.definition.title, chart] as const));
  const renderChart = (title: string) => {
    const chart = chartByTitle.get(title);
    if (!chart) {
      return null;
    }
    return (
      <TelemetryAnalyticsChartCard
        definition={chart.definition}
        errorMessage={chart.errorMessage}
        refreshing={refreshing}
        response={chart.response}
      />
    );
  };

  return (
    <div className="space-y-4">
      {renderChart("Token Usage Over Time")}

      <div className="grid gap-4 xl:items-start xl:grid-cols-2">
        {renderChart("Effective Cost Over Time")}
        {renderChart("Cost Avoided Over Time")}
      </div>

      <div className="grid gap-4 xl:items-start xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
        {renderChart("Latency Trend")}
        {renderChart("Cache Efficiency")}
        {renderChart("Success vs Failure")}
      </div>

      <SectionCard title="Latest requests">
        {requestRows.length === 0 ? (
          <EmptyState label="No recent requests exist for the selected historical window." />
        ) : (
          <div className="grid gap-3 xl:grid-cols-[repeat(3,minmax(0,1fr))]">
            {requestRows.map((request) => (
              <div
                key={request.requestId}
                className={`${mutedPanelClassName} flex h-full flex-col gap-2 p-4 text-sm`}
              >
                <span className={foregroundEmphasisClassName}>{request.primaryLabel}</span>
                {request.secondaryLabel ? (
                  <span className="text-[var(--rm-secondary)]">{request.secondaryLabel}</span>
                ) : null}
                <span className="text-[var(--rm-secondary)]">{request.endpointLabel}</span>
                <span className="text-[var(--rm-secondary)]">
                  {request.statusLabel} • {request.latencyLabel} • {request.tokenLabel}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className={secondaryButtonClassName} to="/app/observe/requests">
            Open request analytics
          </Link>
          <Link className={secondaryButtonClassName} to="/app/observe/routing">
            Open routing analytics
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Current endpoint inventory">
        {endpointRows.length === 0 ? (
          <EmptyState label="No routable endpoints are available for the current source filter." />
        ) : (
          <div className="space-y-3">
            {endpointRows.map((row) => (
              <div key={row.endpointId} className={`${listRowClassName} md:items-center`}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={foregroundEmphasisClassName}>{row.modelId}</p>
                    <StatusPill tone={row.sourceLabel === "Remote" ? "accent" : "neutral"}>
                      {row.sourceLabel}
                    </StatusPill>
                    <StatusPill
                      tone={
                        row.healthStatus === "healthy" || row.status === "active"
                          ? "success"
                          : "warning"
                      }
                    >
                      {row.healthStatus}
                    </StatusPill>
                  </div>
                  <p className={supportingTextClassName}>{row.endpointId}</p>
                  <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                    {row.providerLabel} • {row.endpointKind} • {row.servingSource}
                  </p>
                </div>
                <p className={rightAlignedSupportingTextClassName}>{row.status}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
