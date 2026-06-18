import { useEffect, useState } from "react";
import { Link } from "react-router";

import { ErrorState, SectionCard } from "../components/page-primitives";
import { TelemetryAnalyticsChartCard } from "../components/telemetry-charts";
import {
  TelemetrySelectField,
  TelemetryTextField,
  TelemetryTimeRangeControl,
} from "../components/telemetry-controls";
import type {
  RuntimeTelemetryAnalyticsDimension,
  RuntimeTelemetryAnalyticsFilters,
  RuntimeTelemetryAnalyticsResponse,
} from "../lib/runtime-api";
import { fetchTelemetryAnalytics, subscribeTelemetryStream } from "../lib/runtime-api";
import { secondaryButtonClassName } from "../lib/design-system";
import type { TelemetryRouteChartDefinition, TelemetryTimeRangeValue } from "../lib/telemetry-route-models";
import { buildObserveRoutingChartDefinitions } from "../lib/telemetry-route-models";

const routingBreakdownOptions = [
  { label: "Total", value: "" },
  { label: "By source", value: "sourceType" },
  { label: "By requested role", value: "requestedRoleId" },
  { label: "By model", value: "modelId" },
  { label: "By strategy", value: "selectedStrategy" },
];

type RoutingChartRecord = {
  readonly definition: TelemetryRouteChartDefinition;
  readonly response: RuntimeTelemetryAnalyticsResponse;
};

export default function ObserveRoutingRoute() {
  const [timeRange, setTimeRange] = useState<TelemetryTimeRangeValue>("week");
  const [breakdownValue, setBreakdownValue] = useState<"" | RuntimeTelemetryAnalyticsDimension>(
    "selectedStrategy",
  );
  const [sourceFilter, setSourceFilter] = useState<"all" | "local" | "remote">("all");
  const [difficulty, setDifficulty] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [requestedRoleId, setRequestedRoleId] = useState("");
  const [charts, setCharts] = useState<readonly RoutingChartRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filters: RuntimeTelemetryAnalyticsFilters = {
    ...(sourceFilter === "all" ? {} : { sourceTypes: [sourceFilter] }),
    ...(difficulty === "all" ? {} : { difficultyBuckets: [difficulty] }),
    ...(requestedRoleId.trim().length > 0 ? { requestedRoleIds: [requestedRoleId.trim()] } : {}),
    ...(selectedStrategy.trim().length > 0
      ? { selectedStrategies: [selectedStrategy.trim()] }
      : {}),
  };

  const breakdown = breakdownValue === "" ? null : breakdownValue;

  useEffect(() => {
    let disposed = false;

    const load = async (background = false) => {
      const hasExisting = charts.length > 0;
      if (!background && !hasExisting) {
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
          setError(
            value instanceof Error ? value.message : "Could not load routing analytics.",
          );
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
  }, [breakdown, difficulty, requestedRoleId, selectedStrategy, sourceFilter, timeRange]);

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
          <TelemetryTimeRangeControl onChange={setTimeRange} value={timeRange} />
          <div className="grid gap-4 xl:grid-cols-4">
            <TelemetrySelectField
              label="Breakdown"
              onChange={(value) => setBreakdownValue(value as "" | RuntimeTelemetryAnalyticsDimension)}
              options={routingBreakdownOptions}
              value={breakdownValue}
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
            <TelemetrySelectField
              label="Difficulty"
              onChange={(value) => setDifficulty(value as "all" | "easy" | "medium" | "hard")}
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
              onChange={setRequestedRoleId}
              placeholder="Filter a specific requested role id"
              value={requestedRoleId}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <TelemetryTextField
              label="Selected strategy"
              onChange={setSelectedStrategy}
              placeholder="Filter a specific selected strategy"
              value={selectedStrategy}
            />
            <div className="flex flex-wrap gap-3">
              <Link className={secondaryButtonClassName} to="/app/router">
                Open router configuration
              </Link>
              <Link className={secondaryButtonClassName} to="/app/observe/requests">
                Open request analytics
              </Link>
            </div>
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
