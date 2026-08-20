import { ChartGrid, ChartGridCell, FilterSelect, PageFilters } from "@role-model/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import { ObserveKitChartBlock } from "../components/observe-chart-block";
import { DisclosureSection, ErrorState } from "../components/page-primitives";
import { TelemetryTextField } from "../components/telemetry-controls";
import { foregroundEmphasisClassName, mutedPanelClassName } from "../lib/design-system";
import { startDeferredLiveRefresh } from "../lib/live-refresh";
import { adaptObserveChartBlock } from "../lib/observe-chart-adapter";
import type {
  RuntimeTelemetryAnalyticsDimension,
  RuntimeTelemetryAnalyticsFilters,
  RuntimeTelemetryAnalyticsResponse,
} from "../lib/runtime-api";
import { fetchTelemetryAnalytics, subscribeTelemetryStream } from "../lib/runtime-api";
import {
  buildQuerySnapshot,
  createStaleChartDiagnostic,
  flushStaleRefreshDiagnostics,
  resolveTelemetryChartRefresh,
} from "../lib/stale-refresh-diagnostics";
import { telemetryBreakdownOptions } from "../lib/telemetry-chart-config";
import {
  fromPageTimeRange,
  observePageTimeRangeOptions,
  toPageTimeRange,
} from "../lib/telemetry-page-filters";
import type {
  TelemetryRouteChartDefinition,
  TelemetryTimeRangeValue,
} from "../lib/telemetry-route-models";
import { buildObserveRoutingChartDefinitions } from "../lib/telemetry-route-models";

const routingBreakdownOptions = [
  { label: "Total", value: "" },
  { label: "By requested role", value: "requestedRoleId" },
  ...telemetryBreakdownOptions
    .filter((option) =>
      [
        "sourceType",
        "endpointId",
        "modelId",
        "reasoningEffort",
        "effortSource",
        "selectedStrategy",
        "taxonomyGroupId",
        "taxonomyRoleId",
        "taxonomyTaskType",
        "taxonomyTaskVariant",
        "taxonomyCapabilityId",
        "taxonomyModalityId",
        "taxonomyToolClassId",
      ].includes(option.value),
    )
    .map((option) => ({ label: `By ${option.label.toLowerCase()}`, value: option.value })),
];

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

type RoutingChartRecord = {
  readonly definition: TelemetryRouteChartDefinition;
  readonly response?: RuntimeTelemetryAnalyticsResponse;
  readonly errorMessage?: string;
};

function getChartLoadErrorMessage(title: string, value: unknown): string {
  const detail = value instanceof Error ? value.message : "Could not load telemetry analytics.";
  return `${title}: ${detail}`;
}

export default function ObserveRoutingRoute() {
  const [searchParams, setSearchParams] = useSearchParams();

  const timeRange = (searchParams.get("range") as TelemetryTimeRangeValue) || "week";
  const breakdownValue =
    (searchParams.get("breakdown") as "" | RuntimeTelemetryAnalyticsDimension) || "endpointId";
  const sourceFilter = (searchParams.get("source") as "all" | "local" | "remote") || "all";
  const difficulty =
    (searchParams.get("difficulty") as "all" | "easy" | "medium" | "hard") || "all";
  const selectedStrategy = searchParams.get("strategy") || "";
  const reasoningEffort = searchParams.get("effort") || "";
  const effortSource = searchParams.get("effortSource") || "";
  const taxonomyGroupId = searchParams.get("taxGroup") || "";
  const requestedRoleId = searchParams.get("roleId") || "";
  const taxonomyRoleId = searchParams.get("taxRole") || "";
  const taxonomyTaskType = searchParams.get("taxTask") || "";
  const taxonomyTaskVariant = searchParams.get("taxVariant") || "";
  const taxonomyCapabilityIds = searchParams.get("taxCapability") || "";
  const taxonomyModalityIds = searchParams.get("taxModality") || "";
  const taxonomyToolClassIds = searchParams.get("taxTool") || "";

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
  const [charts, setCharts] = useState<readonly RoutingChartRecord[]>([]);
  const chartsRef = useRef<readonly RoutingChartRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staleCharts, setStaleCharts] = useState<readonly string[]>([]);

  const filters: RuntimeTelemetryAnalyticsFilters = useMemo(() => {
    const normalizedRequestedRoleId = normalizeOptionalId(requestedRoleId);
    const normalizedSelectedStrategy = normalizeOptionalId(selectedStrategy);
    const normalizedReasoningEfforts = normalizeOptionalCsvIds(reasoningEffort);
    const normalizedEffortSources = normalizeOptionalCsvIds(effortSource);
    const normalizedTaxonomyGroupId = normalizeOptionalId(taxonomyGroupId);
    const normalizedTaxonomyRoleId = normalizeOptionalId(taxonomyRoleId);
    const normalizedTaxonomyTaskType = normalizeOptionalId(taxonomyTaskType);
    const normalizedTaxonomyTaskVariant = normalizeOptionalId(taxonomyTaskVariant);
    const normalizedTaxonomyCapabilityIds = normalizeOptionalCsvIds(taxonomyCapabilityIds);
    const normalizedTaxonomyModalityIds = normalizeOptionalCsvIds(taxonomyModalityIds);
    const normalizedTaxonomyToolClassIds = normalizeOptionalCsvIds(taxonomyToolClassIds);

    return {
      ...(sourceFilter === "all" ? {} : { sourceTypes: [sourceFilter] }),
      ...(difficulty === "all" ? {} : { difficultyBuckets: [difficulty] }),
      ...(normalizedRequestedRoleId ? { requestedRoleIds: [normalizedRequestedRoleId] } : {}),
      ...(normalizedSelectedStrategy ? { selectedStrategies: [normalizedSelectedStrategy] } : {}),
      ...(normalizedReasoningEfforts ? { reasoningEfforts: normalizedReasoningEfforts } : {}),
      ...(normalizedEffortSources ? { effortSources: normalizedEffortSources } : {}),
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
    };
  }, [
    difficulty,
    effortSource,
    requestedRoleId,
    reasoningEffort,
    selectedStrategy,
    sourceFilter,
    taxonomyCapabilityIds,
    taxonomyGroupId,
    taxonomyModalityIds,
    taxonomyRoleId,
    taxonomyTaskType,
    taxonomyTaskVariant,
    taxonomyToolClassIds,
  ]);

  const breakdown: RuntimeTelemetryAnalyticsDimension | null =
    (breakdownValue as string) === ""
      ? null
      : (breakdownValue as RuntimeTelemetryAnalyticsDimension);

  const hasAdvancedFilters =
    requestedRoleId.trim().length > 0 ||
    selectedStrategy.trim().length > 0 ||
    reasoningEffort.trim().length > 0 ||
    effortSource.trim().length > 0 ||
    taxonomyGroupId.trim().length > 0 ||
    taxonomyRoleId.trim().length > 0 ||
    taxonomyTaskType.trim().length > 0 ||
    taxonomyTaskVariant.trim().length > 0 ||
    taxonomyCapabilityIds.trim().length > 0 ||
    taxonomyModalityIds.trim().length > 0 ||
    taxonomyToolClassIds.trim().length > 0;

  useEffect(() => {
    let disposed = false;

    const load = async (background = false) => {
      if (!background) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const definitions = buildObserveRoutingChartDefinitions({
          timeRange,
          breakdown,
          filters,
        });
        const chartResults = await Promise.allSettled(
          definitions.map((definition) => fetchTelemetryAnalytics(definition.query)),
        );
        if (disposed) {
          return;
        }
        const resolvedCharts = resolveTelemetryChartRefresh({
          background,
          chartResults,
          createDiagnostic: (definition, reason) =>
            createStaleChartDiagnostic({
              routeId: "observe-routing",
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
          setError(value instanceof Error ? value.message : "Could not load routing analytics.");
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
      charts.map((chart) =>
        adaptObserveChartBlock(chart.definition, {
          response: chart.response,
          errorMessage: chart.errorMessage,
          loading: loading && charts.length === 0,
        }),
      ),
    [charts, loading],
  );

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

      <PageFilters
        timeRange={toPageTimeRange(timeRange)}
        timeRangeOptions={observePageTimeRangeOptions}
        onTimeRangeChange={(value) => updateParam("range", fromPageTimeRange(value))}
        trailing={
          <div className="flex flex-wrap items-end gap-3">
            <FilterSelect
              label="Breakdown"
              onChange={(value) => updateParam("breakdown", value)}
              options={routingBreakdownOptions}
              value={breakdownValue}
            />
            <FilterSelect
              label="Source"
              onChange={(value) => updateParam("source", value)}
              options={[
                { label: "All sources", value: "all" },
                { label: "Local only", value: "local" },
                { label: "Remote only", value: "remote" },
              ]}
              value={sourceFilter}
            />
            <FilterSelect
              label="Difficulty"
              onChange={(value) => updateParam("difficulty", value)}
              options={[
                { label: "All buckets", value: "all" },
                { label: "Easy only", value: "easy" },
                { label: "Medium only", value: "medium" },
                { label: "Hard only", value: "hard" },
              ]}
              value={difficulty}
            />
          </div>
        }
      />

      <DisclosureSection compact defaultOpen={hasAdvancedFilters} summary="Advanced controls">
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-4">
            <TelemetryTextField
              label="Requested role id"
              onChange={(value) => updateParam("roleId", value)}
              placeholder="Filter a specific requested role id"
              value={requestedRoleId}
            />
            <TelemetryTextField
              label="Selected strategy"
              onChange={(value) => updateParam("strategy", value)}
              placeholder="Filter a specific selected strategy"
              value={selectedStrategy}
            />
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
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <TelemetryTextField
              label="Reasoning efforts"
              onChange={(value) => updateParam("effort", value)}
              placeholder="Comma-separated values, e.g. high,max"
              value={reasoningEffort}
            />
            <TelemetryTextField
              label="Effort sources"
              onChange={(value) => updateParam("effortSource", value)}
              placeholder="Comma-separated values, e.g. variant,client"
              value={effortSource}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-4">
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
          </div>
          <div className="grid gap-4 xl:grid-cols-4">
            <TelemetryTextField
              label="Taxonomy tool class ids"
              onChange={(value) => updateParam("taxTool", value)}
              placeholder="Comma-separated tool class ids"
              value={taxonomyToolClassIds}
            />
          </div>
        </div>
      </DisclosureSection>

      <ChartGrid>
        {chartBlocks.map((block) => (
          <ChartGridCell key={block.title} span={block.span}>
            <ObserveKitChartBlock block={block} />
          </ChartGridCell>
        ))}
      </ChartGrid>
    </div>
  );
}
