import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";

import {
  DisclosureSection,
  EmptyState,
  ErrorState,
  SectionCard,
} from "../components/page-primitives";
import { TelemetryAnalyticsChartCard } from "../components/telemetry-charts";
import {
  TelemetrySelectField,
  TelemetryTextField,
  TelemetryTimeRangeControl,
} from "../components/telemetry-controls";
import {
  accentActionTextClassName,
  bodyTextClassName,
  foregroundEmphasisClassName,
  listRowClassName,
  metaTextClassName,
  mutedPanelClassName,
  secondaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { startDeferredLiveRefresh } from "../lib/live-refresh";
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
  buildQuerySnapshot,
  createStaleChartDiagnostic,
  flushStaleRefreshDiagnostics,
  resolveTelemetryChartRefresh,
} from "../lib/stale-refresh-diagnostics";
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
      [
        "sourceType",
        "endpointId",
        "modelId",
        "providerId",
        "taxonomyGroupId",
        "taxonomyRoleId",
        "taxonomyTaskType",
        "taxonomyTaskVariant",
        "taxonomyCapabilityId",
        "taxonomyModalityId",
        "taxonomyToolClassId",
      ].includes(option.value),
    )
    .map((option) => ({ label: option.label, value: option.value })),
];

const rankingDimensionOptions = [
  { label: "Endpoints", value: "endpointId" },
  { label: "Models", value: "modelId" },
  { label: "Providers", value: "providerId" },
  { label: "Taxonomy groups", value: "taxonomyGroupId" },
  { label: "Taxonomy roles", value: "taxonomyRoleId" },
  { label: "Taxonomy tasks", value: "taxonomyTaskType" },
  { label: "Task variants", value: "taxonomyTaskVariant" },
  { label: "Capabilities", value: "taxonomyCapabilityId" },
  { label: "Modalities", value: "taxonomyModalityId" },
  { label: "Tool classes", value: "taxonomyToolClassId" },
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

function normalizeOptionalCsvIds(value: string): readonly string[] | undefined {
  const normalized = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return normalized.length > 0 ? normalized : undefined;
}

function matchesOptionalIdFilter(
  filters: readonly string[] | undefined,
  value: string | null | undefined,
): boolean {
  if (!filters || filters.length === 0) {
    return true;
  }
  return value ? filters.includes(value) : false;
}

function matchesOptionalListFilter(
  filters: readonly string[] | undefined,
  values: readonly string[] | undefined,
): boolean {
  if (!filters || filters.length === 0) {
    return true;
  }
  if (!values || values.length === 0) {
    return false;
  }
  return filters.some((filterValue) => values.includes(filterValue));
}

function matchesRequestFilters(
  request: RuntimeTelemetryRequestRecord,
  filters: RuntimeTelemetryAnalyticsFilters,
): boolean {
  if (!matchesOptionalIdFilter(filters.sourceTypes, request.sourceType)) {
    return false;
  }
  if (!matchesOptionalIdFilter(filters.endpointIds, request.endpointId)) {
    return false;
  }
  if (!matchesOptionalIdFilter(filters.modelIds, request.modelId)) {
    return false;
  }
  if (!matchesOptionalIdFilter(filters.providerIds, request.providerId)) {
    return false;
  }
  if (!matchesOptionalIdFilter(filters.taxonomyGroupIds, request.taxonomyGroupId)) {
    return false;
  }
  if (!matchesOptionalIdFilter(filters.taxonomyRoleIds, request.taxonomyRoleId)) {
    return false;
  }
  if (!matchesOptionalIdFilter(filters.taxonomyTaskTypes, request.taxonomyTaskType)) {
    return false;
  }
  if (!matchesOptionalIdFilter(filters.taxonomyTaskVariants, request.taxonomyTaskVariant)) {
    return false;
  }
  if (!matchesOptionalListFilter(filters.taxonomyCapabilityIds, request.taxonomyCapabilityIds)) {
    return false;
  }
  if (!matchesOptionalListFilter(filters.taxonomyModalityIds, request.taxonomyModalityIds)) {
    return false;
  }
  if (!matchesOptionalListFilter(filters.taxonomyToolClassIds, request.taxonomyToolClassIds)) {
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
  readonly response?: RuntimeTelemetryAnalyticsResponse;
  readonly errorMessage?: string;
};

function getChartLoadErrorMessage(title: string, value: unknown): string {
  const detail = value instanceof Error ? value.message : "Could not load telemetry analytics.";
  return `${title}: ${detail}`;
}

export default function RequestsRoute() {
  const [searchParams, setSearchParams] = useSearchParams();

  const timeRange = (searchParams.get("range") as TelemetryTimeRangeValue) || "week";
  const breakdownValue =
    (searchParams.get("breakdown") as "" | RuntimeTelemetryAnalyticsDimension) || "";
  const rankingMetric =
    (searchParams.get("metric") as RuntimeTelemetryAnalyticsMetric) || "averageLatencyMs";
  const rankingDimension =
    (searchParams.get("rankBy") as RuntimeTelemetryAnalyticsDimension) || "endpointId";
  const sourceFilter = (searchParams.get("source") as "all" | "local" | "remote") || "all";
  const statusFamily =
    (searchParams.get("status") as "all" | "success" | "failure" | "unknown") || "all";
  const endpointId = searchParams.get("endpointId") || "";
  const modelId = searchParams.get("modelId") || "";
  const providerId = searchParams.get("providerId") || "";
  const taxonomyGroupId = searchParams.get("taxGroup") || "";
  const taxonomyRoleId = searchParams.get("taxRole") || "";
  const taxonomyTaskType = searchParams.get("taxTask") || "";
  const taxonomyTaskVariant = searchParams.get("taxVariant") || "";
  const taxonomyCapabilityIds = searchParams.get("taxCapability") || "";
  const taxonomyModalityIds = searchParams.get("taxModality") || "";
  const taxonomyToolClassIds = searchParams.get("taxTool") || "";
  const [requests, setRequests] = useState<readonly RuntimeTelemetryRequestRecord[]>([]);
  const [charts, setCharts] = useState<readonly RequestsChartRecord[]>([]);
  const chartsRef = useRef<readonly RequestsChartRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staleCharts, setStaleCharts] = useState<readonly string[]>([]);

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const filters = useMemo(() => {
    const normalizedEndpointId = normalizeOptionalId(endpointId);
    const normalizedModelId = normalizeOptionalId(modelId);
    const normalizedProviderId = normalizeOptionalId(providerId);
    const normalizedTaxonomyGroupId = normalizeOptionalId(taxonomyGroupId);
    const normalizedTaxonomyRoleId = normalizeOptionalId(taxonomyRoleId);
    const normalizedTaxonomyTaskType = normalizeOptionalId(taxonomyTaskType);
    const normalizedTaxonomyTaskVariant = normalizeOptionalId(taxonomyTaskVariant);
    const normalizedTaxonomyCapabilityIds = normalizeOptionalCsvIds(taxonomyCapabilityIds);
    const normalizedTaxonomyModalityIds = normalizeOptionalCsvIds(taxonomyModalityIds);
    const normalizedTaxonomyToolClassIds = normalizeOptionalCsvIds(taxonomyToolClassIds);
    return {
      ...(sourceFilter === "all" ? {} : { sourceTypes: [sourceFilter] }),
      ...(statusFamily === "all" ? {} : { statusFamilies: [statusFamily] }),
      ...(normalizedEndpointId ? { endpointIds: [normalizedEndpointId] } : {}),
      ...(normalizedModelId ? { modelIds: [normalizedModelId] } : {}),
      ...(normalizedProviderId ? { providerIds: [normalizedProviderId] } : {}),
      ...(normalizedTaxonomyGroupId ? { taxonomyGroupIds: [normalizedTaxonomyGroupId] } : {}),
      ...(normalizedTaxonomyRoleId ? { taxonomyRoleIds: [normalizedTaxonomyRoleId] } : {}),
      ...(normalizedTaxonomyTaskType ? { taxonomyTaskTypes: [normalizedTaxonomyTaskType] } : {}),
      ...(normalizedTaxonomyTaskVariant
        ? { taxonomyTaskVariants: [normalizedTaxonomyTaskVariant] }
        : {}),
      ...(normalizedTaxonomyCapabilityIds
        ? { taxonomyCapabilityIds: normalizedTaxonomyCapabilityIds }
        : {}),
      ...(normalizedTaxonomyModalityIds
        ? { taxonomyModalityIds: normalizedTaxonomyModalityIds }
        : {}),
      ...(normalizedTaxonomyToolClassIds
        ? { taxonomyToolClassIds: normalizedTaxonomyToolClassIds }
        : {}),
    } satisfies RuntimeTelemetryAnalyticsFilters;
  }, [
    endpointId,
    modelId,
    providerId,
    sourceFilter,
    statusFamily,
    taxonomyCapabilityIds,
    taxonomyGroupId,
    taxonomyModalityIds,
    taxonomyRoleId,
    taxonomyTaskType,
    taxonomyTaskVariant,
    taxonomyToolClassIds,
  ]);

  const hasAdvancedFilters =
    endpointId.trim().length > 0 ||
    modelId.trim().length > 0 ||
    providerId.trim().length > 0 ||
    statusFamily !== "all" ||
    taxonomyGroupId.trim().length > 0 ||
    taxonomyRoleId.trim().length > 0 ||
    taxonomyTaskType.trim().length > 0 ||
    taxonomyTaskVariant.trim().length > 0 ||
    taxonomyCapabilityIds.trim().length > 0 ||
    taxonomyModalityIds.trim().length > 0 ||
    taxonomyToolClassIds.trim().length > 0;

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
        const [nextRequests, chartResults] = await Promise.all([
          fetchTelemetryRequests({
            limit: 200,
            windowMs: getWindowMs(timeRange),
            filters,
          }),
          Promise.allSettled(
            definitions.map((definition) => fetchTelemetryAnalytics(definition.query)),
          ),
        ]);
        if (disposed) {
          return;
        }
        setRequests(nextRequests);
        const resolvedCharts = resolveTelemetryChartRefresh({
          background,
          chartResults,
          createDiagnostic: (definition, reason) =>
            createStaleChartDiagnostic({
              routeId: "requests",
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
          setError(value instanceof Error ? value.message : "Could not load telemetry analytics.");
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
      <SectionCard
        title="Analytics controls"
        description="Scope the structured telemetry history and comparison target without leaving the canonical request ledger."
      >
        <div className="space-y-4">
          <TelemetryTimeRangeControl
            onChange={(value) => updateParam("range", value)}
            value={timeRange}
          />
          <div className="grid gap-4 xl:grid-cols-4">
            <TelemetrySelectField
              label="Breakdown"
              onChange={(value) => updateParam("breakdown", value)}
              options={requestBreakdownOptions}
              value={breakdownValue}
            />
            <TelemetrySelectField
              label="Ranking metric"
              onChange={(value) => updateParam("metric", value)}
              options={rankingMetricOptions}
              value={rankingMetric}
            />
            <TelemetrySelectField
              label="Ranking target"
              onChange={(value) => updateParam("rankBy", value)}
              options={rankingDimensionOptions}
              value={rankingDimension}
            />
            <TelemetrySelectField
              label="Source"
              onChange={(value) => updateParam("source", value)}
              options={[
                { label: "All sources", value: "all" },
                { label: "Local only", value: "local" },
                { label: "Remote only", value: "remote" },
              ]}
              value={sourceFilter}
            />
          </div>
          <DisclosureSection compact defaultOpen={hasAdvancedFilters} summary="Advanced controls">
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-4">
                <TelemetryTextField
                  label="Endpoint id"
                  onChange={(value) => updateParam("endpointId", value)}
                  placeholder="Filter a specific endpoint id"
                  value={endpointId}
                />
                <TelemetryTextField
                  label="Model id"
                  onChange={(value) => updateParam("modelId", value)}
                  placeholder="Filter a specific model id"
                  value={modelId}
                />
                <TelemetryTextField
                  label="Provider id"
                  onChange={(value) => updateParam("providerId", value)}
                  placeholder="Filter a specific provider id"
                  value={providerId}
                />
                <TelemetrySelectField
                  label="Status family"
                  onChange={(value) => updateParam("status", value)}
                  options={[
                    { label: "All statuses", value: "all" },
                    { label: "Success only", value: "success" },
                    { label: "Failure only", value: "failure" },
                    { label: "Unknown only", value: "unknown" },
                  ]}
                  value={statusFamily}
                />
              </div>
              <div className="grid gap-4 xl:grid-cols-4">
                <TelemetryTextField
                  label="Taxonomy group id"
                  onChange={(value) => updateParam("taxGroup", value)}
                  placeholder="e.g. engineering"
                  value={taxonomyGroupId}
                />
                <TelemetryTextField
                  label="Taxonomy role id"
                  onChange={(value) => updateParam("taxRole", value)}
                  placeholder="e.g. coder"
                  value={taxonomyRoleId}
                />
                <TelemetryTextField
                  label="Taxonomy task type"
                  onChange={(value) => updateParam("taxTask", value)}
                  placeholder="e.g. coder.review"
                  value={taxonomyTaskType}
                />
                <TelemetryTextField
                  label="Taxonomy task variant"
                  onChange={(value) => updateParam("taxVariant", value)}
                  placeholder="e.g. deep-audit"
                  value={taxonomyTaskVariant}
                />
              </div>
              <div className="grid gap-4 xl:grid-cols-3">
                <TelemetryTextField
                  label="Taxonomy capability ids"
                  onChange={(value) => updateParam("taxCapability", value)}
                  placeholder="Comma-separated capability ids"
                  value={taxonomyCapabilityIds}
                />
                <TelemetryTextField
                  label="Taxonomy modality ids"
                  onChange={(value) => updateParam("taxModality", value)}
                  placeholder="Comma-separated modality ids"
                  value={taxonomyModalityIds}
                />
                <TelemetryTextField
                  label="Taxonomy tool class ids"
                  onChange={(value) => updateParam("taxTool", value)}
                  placeholder="Comma-separated tool class ids"
                  value={taxonomyToolClassIds}
                />
              </div>
            </div>
          </DisclosureSection>
        </div>
      </SectionCard>

      <div className="grid grid-cols-12 gap-4">
        {charts.map((chart) => (
          <div key={chart.definition.title} className={chart.definition.className ?? "col-span-12"}>
            <TelemetryAnalyticsChartCard
              definition={chart.definition}
              errorMessage={chart.errorMessage}
              loading={loading && charts.length === 0}
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
                  <p className={foregroundEmphasisClassName}>{request.requestId}</p>
                  {request.clientRequestId && request.clientRequestId !== request.requestId ? (
                    <p className={supportingTextClassName}>
                      Correlation • {request.clientRequestId}
                    </p>
                  ) : null}
                  <p className={supportingTextClassName}>{request.endpointId}</p>
                  <p className={`mt-2 ${supportingTextClassName}`}>
                    Routing decision • {request.routingDecisionLabel}
                  </p>
                  <p className={`mt-2 ${supportingTextClassName}`}>
                    {request.sourceLabel} • {request.statusLabel} • {request.latencyLabel} •{" "}
                    {request.tokenLabel} • {request.costLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className={metaTextClassName}>{request.createdAtLabel}</p>
                  <Link
                    className={`mt-2 inline-block ${accentActionTextClassName}`}
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
