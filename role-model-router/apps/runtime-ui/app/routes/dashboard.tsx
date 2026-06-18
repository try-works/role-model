import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  TelemetryAnalyticsChartCard,
} from "../components/telemetry-charts";
import {
  TelemetrySelectField,
  TelemetryTimeRangeControl,
} from "../components/telemetry-controls";
import { listRowClassName, mutedPanelClassName, secondaryButtonClassName } from "../lib/design-system";
import type {
  RuntimeSnapshot,
  RuntimeTelemetryAnalyticsDimension,
  RuntimeTelemetryAnalyticsResponse,
  RuntimeTelemetryRequestRecord,
} from "../lib/runtime-api";
import {
  fetchRuntimeSnapshot,
  fetchTelemetryAnalytics,
  fetchTelemetryRequests,
  subscribeTelemetryStream,
} from "../lib/runtime-api";
import {
  type TelemetryRouteChartDefinition,
  type TelemetryTimeRangeValue,
  buildOverviewChartDefinitions,
} from "../lib/telemetry-route-models";
import { telemetryTimeRangeOptions } from "../lib/telemetry-chart-config";
import {
  buildDashboardLatestRequestRows,
  buildEndpointCatalogRows,
} from "../lib/view-models";
import { usePageActions } from "../lib/shell-header-context";

const overviewBreakdownOptions: Array<{
  label: string;
  value: "" | RuntimeTelemetryAnalyticsDimension;
}> = [
  { label: "Total", value: "" },
  { label: "By source", value: "sourceType" },
  { label: "By endpoint", value: "endpointId" },
  { label: "By model", value: "modelId" },
  { label: "By provider", value: "providerId" },
];

function getWindowMs(timeRange: TelemetryTimeRangeValue): number {
  return telemetryTimeRangeOptions.find((option) => option.value === timeRange)?.windowMs ?? 0;
}

type OverviewChartRecord = {
  readonly definition: TelemetryRouteChartDefinition;
  readonly response: RuntimeTelemetryAnalyticsResponse;
};

export default function DashboardRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [requests, setRequests] = useState<readonly RuntimeTelemetryRequestRecord[]>([]);
  const [charts, setCharts] = useState<readonly OverviewChartRecord[]>([]);
  const [timeRange, setTimeRange] = useState<TelemetryTimeRangeValue>("week");
  const [breakdownValue, setBreakdownValue] = useState<"" | RuntimeTelemetryAnalyticsDimension>("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "local" | "remote">("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const sourceTypes = sourceFilter === "all" ? [] : ([sourceFilter] as const);
  const breakdown = breakdownValue === "" ? null : breakdownValue;

  useEffect(() => {
    let disposed = false;

    const load = async (background = false) => {
      const hasExisting = snapshot !== null || charts.length > 0 || requests.length > 0;
      if (!background && !hasExisting) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const definitions = buildOverviewChartDefinitions({
          timeRange,
          sourceTypes,
          breakdown,
        });
        const [nextSnapshot, nextRequests, ...responses] = await Promise.all([
          fetchRuntimeSnapshot(),
          fetchTelemetryRequests({
            limit: 60,
            windowMs: getWindowMs(timeRange),
          }),
          ...definitions.map((definition) => fetchTelemetryAnalytics(definition.query)),
        ]);

        if (disposed) {
          return;
        }

        setSnapshot(nextSnapshot);
        setRequests(nextRequests);
        setCharts(
          definitions.map((definition, index) => ({
            definition,
            response: responses[index] as RuntimeTelemetryAnalyticsResponse,
          })),
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
  }, [breakdown, sourceFilter, timeRange]);

  const endpointRows = useMemo(
    () =>
      snapshot
        ? buildEndpointCatalogRows(snapshot.endpoints).filter((row) =>
            sourceFilter === "all"
              ? true
              : sourceFilter === "local"
                ? row.sourceLabel === "Local"
                : row.sourceLabel === "Remote",
          )
        : [],
    [snapshot, sourceFilter],
  );
  const requestRows = useMemo(() => buildDashboardLatestRequestRows(requests), [requests]);

  usePageActions(
    <div
      aria-label="Overview telemetry filters"
      className="flex w-full flex-wrap items-end justify-between gap-3"
    >
      <div className="flex min-w-0 items-end justify-start overflow-x-auto">
        <TelemetryTimeRangeControl onChange={setTimeRange} value={timeRange} />
      </div>
      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:ml-auto xl:max-w-[520px] xl:justify-end">
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
      </div>
    </div>,
    [breakdownValue, sourceFilter, timeRange],
  );

  if (error) {
    return <ErrorState label={error} />;
  }
  if (loading && !snapshot && charts.length === 0) {
    return <LoadingState label="Loading runtime overview…" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-4">
        {charts.map((chart) => (
          <div key={chart.definition.title} className={chart.definition.className ?? "col-span-12"}>
            <TelemetryAnalyticsChartCard
              definition={chart.definition}
              refreshing={refreshing}
              response={chart.response}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard className="col-span-12 xl:col-span-8" title="Current endpoint inventory">
          {endpointRows.length === 0 ? (
            <EmptyState label="No routable endpoints are available for the current source filter." />
          ) : (
            <div className="space-y-3">
              {endpointRows.map((row) => (
                <div key={row.endpointId} className={`${listRowClassName} md:items-center`}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--rm-fg)]">{row.modelId}</p>
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
                    <p className="text-sm text-[var(--rm-secondary)]">{row.endpointId}</p>
                    <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                      {row.providerLabel} • {row.endpointKind} • {row.servingSource}
                    </p>
                  </div>
                  <p className="text-right text-sm text-[var(--rm-secondary)]">{row.status}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="col-span-12 space-y-4 xl:col-span-4">
          <SectionCard title="Latest requests">
            {requestRows.length === 0 ? (
              <EmptyState label="No recent requests exist for the selected historical window." />
            ) : (
              <div className="space-y-2">
                {requestRows.map((request) => (
                  <div
                    key={request.requestId}
                    className={`${mutedPanelClassName} flex flex-col gap-2 p-3 text-sm`}
                  >
                    <span className="font-semibold text-[var(--rm-fg)]">{request.primaryLabel}</span>
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
        </div>
      </div>
    </div>
  );
}
