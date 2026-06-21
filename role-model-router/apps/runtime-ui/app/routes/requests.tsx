import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { EmptyState, ErrorState, SectionCard } from "../components/page-primitives";
import { TelemetryAnalyticsChartCard } from "../components/telemetry-charts";
import {
  TelemetrySelectField,
  TelemetryTextField,
  TelemetryTimeRangeControl,
} from "../components/telemetry-controls";
import { listRowClassName, secondaryButtonClassName } from "../lib/design-system";
import type {
  RuntimeTelemetryAnalyticsDimension,
  RuntimeTelemetryAnalyticsFilters,
  RuntimeTelemetryAnalyticsMetric,
  RuntimeTelemetryAnalyticsResponse,
  RuntimeTelemetryRequestRecord,
} from "../lib/runtime-api";
import {
  fetchTelemetryAnalytics,
  fetchTelemetryRequests,
  subscribeTelemetryStream,
} from "../lib/runtime-api";
import {
  telemetryBreakdownOptions,
  telemetryMetricOptions,
  telemetryTimeRangeOptions,
} from "../lib/telemetry-chart-config";
import type {
  TelemetryRouteChartDefinition,
  TelemetryTimeRangeValue,
} from "../lib/telemetry-route-models";
import { buildObserveRequestsChartDefinitions } from "../lib/telemetry-route-models";
import { buildTelemetryRequestRows } from "../lib/view-models";

const requestBreakdownOptions = [
  { label: "Total", value: "" },
  ...telemetryBreakdownOptions
    .filter((option) =>
      ["sourceType", "endpointId", "modelId", "providerId"].includes(option.value),
    )
    .map((option) => ({ label: option.label, value: option.value })),
];

const rankingDimensionOptions = [
  { label: "Endpoints", value: "endpointId" },
  { label: "Models", value: "modelId" },
  { label: "Providers", value: "providerId" },
];

const rankingMetricOptions = telemetryMetricOptions.filter((option) =>
  [
    "requestCount",
    "totalTokens",
    "effectiveCostUsd",
    "averageLatencyMs",
    "p95LatencyMs",
    "failureCount",
    "cacheHitTokens",
    "cacheHitTokenRate",
  ].includes(option.value),
);

function getWindowMs(timeRange: TelemetryTimeRangeValue): number {
  return telemetryTimeRangeOptions.find((option) => option.value === timeRange)?.windowMs ?? 0;
}

function normalizeOptionalId(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function matchesRequestFilters(
  request: RuntimeTelemetryRequestRecord,
  filters: RuntimeTelemetryAnalyticsFilters,
): boolean {
  if (filters.sourceTypes && !filters.sourceTypes.includes(request.sourceType)) {
    return false;
  }
  if (filters.endpointIds && !filters.endpointIds.includes(request.endpointId)) {
    return false;
  }
  if (filters.modelIds && !(request.modelId && filters.modelIds.includes(request.modelId))) {
    return false;
  }
  if (
    filters.providerIds &&
    !(request.providerId && filters.providerIds.includes(request.providerId))
  ) {
    return false;
  }
  if (filters.statusFamilies) {
    const family =
      typeof request.statusCode === "number"
        ? request.statusCode >= 400
          ? "failure"
          : "success"
        : "unknown";
    if (!filters.statusFamilies.includes(family)) {
      return false;
    }
  }
  return true;
}

type RequestsChartRecord = {
  readonly definition: TelemetryRouteChartDefinition;
  readonly response: RuntimeTelemetryAnalyticsResponse;
};

export default function RequestsRoute() {
  const [timeRange, setTimeRange] = useState<TelemetryTimeRangeValue>("week");
  const [breakdownValue, setBreakdownValue] = useState<"" | RuntimeTelemetryAnalyticsDimension>("");
  const [rankingMetric, setRankingMetric] =
    useState<RuntimeTelemetryAnalyticsMetric>("averageLatencyMs");
  const [rankingDimension, setRankingDimension] =
    useState<RuntimeTelemetryAnalyticsDimension>("endpointId");
  const [sourceFilter, setSourceFilter] = useState<"all" | "local" | "remote">("all");
  const [statusFamily, setStatusFamily] = useState<"all" | "success" | "failure" | "unknown">(
    "all",
  );
  const [endpointId, setEndpointId] = useState("");
  const [modelId, setModelId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [requests, setRequests] = useState<readonly RuntimeTelemetryRequestRecord[]>([]);
  const [charts, setCharts] = useState<readonly RequestsChartRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filters = useMemo(() => {
    const normalizedEndpointId = normalizeOptionalId(endpointId);
    const normalizedModelId = normalizeOptionalId(modelId);
    const normalizedProviderId = normalizeOptionalId(providerId);
    return {
      ...(sourceFilter === "all" ? {} : { sourceTypes: [sourceFilter] }),
      ...(statusFamily === "all" ? {} : { statusFamilies: [statusFamily] }),
      ...(normalizedEndpointId ? { endpointIds: [normalizedEndpointId] } : {}),
      ...(normalizedModelId ? { modelIds: [normalizedModelId] } : {}),
      ...(normalizedProviderId ? { providerIds: [normalizedProviderId] } : {}),
    } satisfies RuntimeTelemetryAnalyticsFilters;
  }, [endpointId, modelId, providerId, sourceFilter, statusFamily]);

  const breakdown = breakdownValue === "" ? null : breakdownValue;

  useEffect(() => {
    let disposed = false;

    const load = async (background = false) => {
      if (!background) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const definitions = buildObserveRequestsChartDefinitions({
          timeRange,
          breakdown,
          rankingMetric,
          rankingDimension,
          filters,
        });
        const [nextRequests, ...responses] = await Promise.all([
          fetchTelemetryRequests({
            limit: 200,
            windowMs: getWindowMs(timeRange),
            filters,
          }),
          ...definitions.map((definition) => fetchTelemetryAnalytics(definition.query)),
        ]);
        if (disposed) {
          return;
        }
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
          setError(value instanceof Error ? value.message : "Could not load telemetry analytics.");
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
  }, [breakdown, filters, rankingDimension, rankingMetric, timeRange]);

  const filteredRequests = useMemo(
    () => requests.filter((request) => matchesRequestFilters(request, filters)),
    [filters, requests],
  );
  const ledgerRows = useMemo(() => buildTelemetryRequestRows(filteredRequests), [filteredRequests]);

  if (error) {
    return <ErrorState label={error} />;
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Analytics controls"
        description="Scope the structured telemetry history and comparison target without leaving the canonical request ledger."
      >
        <div className="space-y-4">
          <TelemetryTimeRangeControl onChange={setTimeRange} value={timeRange} />
          <div className="grid gap-4 xl:grid-cols-4">
            <TelemetrySelectField
              label="Breakdown"
              onChange={(value) =>
                setBreakdownValue(value as "" | RuntimeTelemetryAnalyticsDimension)
              }
              options={requestBreakdownOptions}
              value={breakdownValue}
            />
            <TelemetrySelectField
              label="Ranking metric"
              onChange={(value) => setRankingMetric(value as RuntimeTelemetryAnalyticsMetric)}
              options={rankingMetricOptions}
              value={rankingMetric}
            />
            <TelemetrySelectField
              label="Ranking target"
              onChange={(value) => setRankingDimension(value as RuntimeTelemetryAnalyticsDimension)}
              options={rankingDimensionOptions}
              value={rankingDimension}
            />
            <TelemetrySelectField
              label="Source"
              onChange={(value) => setSourceFilter(value as "all" | "local" | "remote")}
              options={[
                { label: "All sources", value: "all" },
                { label: "Local only", value: "local" },
                { label: "Remote only", value: "remote" },
              ]}
              value={sourceFilter}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-4">
            <TelemetryTextField
              label="Endpoint id"
              onChange={setEndpointId}
              placeholder="Filter a specific endpoint id"
              value={endpointId}
            />
            <TelemetryTextField
              label="Model id"
              onChange={setModelId}
              placeholder="Filter a specific model id"
              value={modelId}
            />
            <TelemetryTextField
              label="Provider id"
              onChange={setProviderId}
              placeholder="Filter a specific provider id"
              value={providerId}
            />
            <TelemetrySelectField
              label="Status family"
              onChange={(value) =>
                setStatusFamily(value as "all" | "success" | "failure" | "unknown")
              }
              options={[
                { label: "All statuses", value: "all" },
                { label: "Success only", value: "success" },
                { label: "Failure only", value: "failure" },
                { label: "Unknown only", value: "unknown" },
              ]}
              value={statusFamily}
            />
          </div>
        </div>
      </SectionCard>

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

      <SectionCard
        title="Adjacent raw-host tools"
        description="Use preserved host surfaces when you need raw metrics, captures, or combined logs beyond the structured telemetry analytics band."
      >
        <div className="flex flex-wrap gap-3">
          <Link className={secondaryButtonClassName} to="/app/observe/activity">
            Host activity & captures
          </Link>
          <Link className={secondaryButtonClassName} to="/app/observe/logs">
            Host logs
          </Link>
          <Link className={secondaryButtonClassName} to="/app/observe/routing">
            Routing analytics
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Recent telemetry requests">
        {loading && charts.length === 0 ? (
          <EmptyState label="Loading the canonical telemetry ledger…" />
        ) : ledgerRows.length === 0 ? (
          <EmptyState label="No requests match the current analytics filters." />
        ) : (
          <div className="space-y-3">
            {ledgerRows.map((request) => (
              <div key={request.requestId} className={`${listRowClassName} md:items-center`}>
                <div>
                  <p className="font-semibold text-[var(--rm-fg)]">{request.requestId}</p>
                  {request.clientRequestId && request.clientRequestId !== request.requestId ? (
                    <p className="text-sm text-[var(--rm-secondary)]">
                      Correlation • {request.clientRequestId}
                    </p>
                  ) : null}
                  <p className="text-sm text-[var(--rm-secondary)]">{request.endpointId}</p>
                  <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                    Routing decision • {request.routingDecisionLabel}
                  </p>
                  <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                    {request.sourceLabel} • {request.statusLabel} • {request.latencyLabel} •{" "}
                    {request.tokenLabel} • {request.costLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--rm-muted)]">
                    {request.createdAtLabel}
                  </p>
                  <Link
                    className="mt-2 inline-block text-sm font-semibold text-[var(--rm-accent)]"
                    to={`/app/observe/requests/${request.requestId}`}
                  >
                    Inspect
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
