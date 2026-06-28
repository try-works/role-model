import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { ErrorState, SectionCard } from "../components/page-primitives";
import { TelemetryAnalyticsChartCard } from "../components/telemetry-charts";
import {
  TelemetrySelectField,
  TelemetryTextField,
  TelemetryTimeRangeControl,
} from "../components/telemetry-controls";
import { secondaryButtonClassName } from "../lib/design-system";
import { telemetryBreakdownOptions } from "../lib/telemetry-chart-config";
import type {
  RuntimeTelemetryAnalyticsDimension,
  RuntimeTelemetryAnalyticsFilters,
  RuntimeTelemetryAnalyticsResponse,
} from "../lib/runtime-api";
import { fetchTelemetryAnalytics, subscribeTelemetryStream } from "../lib/runtime-api";
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
        "modelId",
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
  readonly response: RuntimeTelemetryAnalyticsResponse;
};

export default function ObserveRoutingRoute() {
  const [searchParams, setSearchParams] = useSearchParams();

  const timeRange = (searchParams.get("range") as TelemetryTimeRangeValue) || "week";
  const breakdownValue =
    (searchParams.get("breakdown") as "" | RuntimeTelemetryAnalyticsDimension) ||
    "selectedStrategy";
  const sourceFilter = (searchParams.get("source") as "all" | "local" | "remote") || "all";
  const difficulty =
    (searchParams.get("difficulty") as "all" | "easy" | "medium" | "hard") || "all";
  const selectedStrategy = searchParams.get("strategy") || "";
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filters: RuntimeTelemetryAnalyticsFilters = useMemo(
    () => {
      const normalizedRequestedRoleId = normalizeOptionalId(requestedRoleId);
      const normalizedSelectedStrategy = normalizeOptionalId(selectedStrategy);
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
        ...(normalizedSelectedStrategy
          ? { selectedStrategies: [normalizedSelectedStrategy] }
          : {}),
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
    },
    [
      difficulty,
      requestedRoleId,
      selectedStrategy,
      sourceFilter,
      taxonomyCapabilityIds,
      taxonomyGroupId,
      taxonomyModalityIds,
      taxonomyRoleId,
      taxonomyTaskType,
      taxonomyTaskVariant,
      taxonomyToolClassIds,
    ],
  );

  const breakdown: RuntimeTelemetryAnalyticsDimension | null =
    (breakdownValue as string) === ""
      ? null
      : (breakdownValue as RuntimeTelemetryAnalyticsDimension);

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
        const responses = await Promise.all(
          definitions.map((definition) => fetchTelemetryAnalytics(definition.query)),
        );
        if (disposed) {
          return;
        }
        setCharts(
          definitions.map((definition, index) => ({
            definition,
            response: responses[index] as RuntimeTelemetryAnalyticsResponse,
          })),
        );
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

    void load();
    const unsubscribe = subscribeTelemetryStream(() => {
      void load(true);
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [breakdown, filters, timeRange]);

  if (error) {
    return <ErrorState label={error} />;
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Routing analytics controls"
        description="Inspect routing mix, difficulty distribution, and avoided cost without leaving the Observe pillar."
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
              options={routingBreakdownOptions}
              value={breakdownValue}
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
            <TelemetrySelectField
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
            <TelemetryTextField
              label="Requested role id"
              onChange={(value) => updateParam("roleId", value)}
              placeholder="Filter a specific requested role id"
              value={requestedRoleId}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-4">
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
            <TelemetryTextField
              label="Taxonomy task type"
              onChange={(value) => updateParam("taxTask", value)}
              placeholder="e.g. coder.review"
              value={taxonomyTaskType}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-4">
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
            <TelemetryTextField
              label="Taxonomy tool class ids"
              onChange={(value) => updateParam("taxTool", value)}
              placeholder="Comma-separated tool class ids"
              value={taxonomyToolClassIds}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className={secondaryButtonClassName} to="/app/router">
              Open router configuration
            </Link>
            <Link className={secondaryButtonClassName} to="/app/observe/requests">
              Open request analytics
            </Link>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-12 gap-4">
        {charts.map((chart) => (
          <div key={chart.definition.title} className={chart.definition.className ?? "col-span-12"}>
            <TelemetryAnalyticsChartCard
              definition={chart.definition}
              loading={loading && charts.length === 0}
              refreshing={refreshing}
              response={chart.response}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
