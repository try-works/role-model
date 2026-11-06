import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { Message } from "../../message";
import { type TelemetryChartDefinition, telemetryChartCards } from "./telemetry-chart-suite";

/**
 * S632 (task-112): the observe-routing chart suite ported from the :3456 reference
 * (apps/runtime-ui/app/routes/observe-routing.tsx + lib/telemetry-route-models.ts). Every card is fed by the
 * telemetry analytics query (POST /api/role-model/telemetry/query); a card whose query failed or returned no
 * data renders the honest empty state INSIDE the plot.
 */
export type RoutingChartDefinition = TelemetryChartDefinition;

export const ROUTING_CHARTS: ReadonlyArray<RoutingChartDefinition> = [
  {
    className: "min-w-0 bg-card col-span-1 md:col-span-2",
    description:
      "Avoided spend based on the selected route versus the highest-cost eligible configured candidate, plus cache savings.",
    emptyMessage: "No routing savings have been recorded for the current slice.",
    kind: "area",
    metrics: ["routingCostSavingsUsd", "cacheCostSavingsUsd", "totalAvoidedCostUsd"],
    title: "Cost avoided by routing",
    usesSelectedBreakdown: true,
  },
  {
    className: "min-w-0 bg-card col-span-1 md:col-span-2",
    description: "Historical routed decision volume across the filtered slice.",
    emptyMessage: "No routed decisions match the current filters.",
    kind: "bar",
    metrics: ["requestCount"],
    title: "Routing decision volume",
    usesSelectedBreakdown: true,
  },
  {
    breakdown: "taxonomyRoleId",
    className: "min-w-0 bg-card col-span-1",
    description: "Observe which taxonomy roles are driving routing decisions over time.",
    emptyMessage: "No taxonomy role routing telemetry is available for the current slice.",
    kind: "bar",
    metrics: ["requestCount"],
    title: "Routing volume by taxonomy role",
  },
  {
    className: "min-w-0 bg-card col-span-1",
    description: "Compare routing-driven avoided cost across normalized taxonomy tasks.",
    emptyMessage: "No taxonomy task savings are available for the current slice.",
    kind: "ranking",
    metrics: ["totalAvoidedCostUsd"],
    ranking: { dimension: "taxonomyTaskType", limit: 8, metric: "totalAvoidedCostUsd" },
    title: "Avoided cost by taxonomy task",
  },
  {
    className: "min-w-0 bg-card col-span-1",
    description: "Easy, medium, and hard demand mix for the selected historical slice.",
    emptyMessage: "No difficulty-classified requests match the current slice.",
    kind: "ranking",
    metrics: ["requestCount"],
    ranking: { dimension: "difficultyBucket", limit: 8, metric: "requestCount" },
    title: "Difficulty distribution",
  },
  {
    breakdown: "selectedStrategy",
    className: "min-w-0 bg-card col-span-1",
    description: "Which routing strategies are being selected over time.",
    emptyMessage: "No routing strategy selections match the current slice.",
    kind: "bar",
    metrics: ["requestCount"],
    title: "Strategy selection trend",
  },
  {
    className: "min-w-0 bg-card col-span-1",
    description: "Rank the taxonomy capabilities currently driving routed traffic.",
    emptyMessage: "No capability-tagged telemetry is available for the current slice.",
    kind: "ranking",
    metrics: ["requestCount"],
    ranking: { dimension: "taxonomyCapabilityId", limit: 8, metric: "requestCount" },
    title: "Capability routing mix",
  },
  {
    className: "min-w-0 bg-card col-span-1",
    description: "See which tool-class patterns are most associated with routed requests.",
    emptyMessage: "No tool-class telemetry is available for the current slice.",
    kind: "ranking",
    metrics: ["requestCount"],
    ranking: { dimension: "taxonomyToolClassId", limit: 8, metric: "requestCount" },
    title: "Tool class routing mix",
  },
  {
    className: "min-w-0 bg-card col-span-1",
    description: "Selected model distribution across the filtered routing slice.",
    emptyMessage: "No model-selection history is available for the current slice.",
    kind: "ranking",
    metrics: ["requestCount"],
    ranking: { dimension: "modelId", limit: 8, metric: "requestCount" },
    title: "Model selection",
  },
];

/** The analytics filters carried by the routing page (source/difficulty/taxonomy/strategy selections). */
export interface RoutingChartFilters {
  readonly difficultyBuckets?: ReadonlyArray<string>;
  readonly effortSources?: ReadonlyArray<string>;
  readonly reasoningEfforts?: ReadonlyArray<string>;
  readonly requestedRoleIds?: ReadonlyArray<string>;
  readonly selectedStrategies?: ReadonlyArray<string>;
  readonly sourceTypes?: ReadonlyArray<string>;
  readonly taxonomyCapabilityIds?: ReadonlyArray<string>;
  readonly taxonomyGroupIds?: ReadonlyArray<string>;
  readonly taxonomyModalityIds?: ReadonlyArray<string>;
  readonly taxonomyRoleIds?: ReadonlyArray<string>;
  readonly taxonomyTaskTypes?: ReadonlyArray<string>;
  readonly taxonomyTaskVariants?: ReadonlyArray<string>;
  readonly taxonomyToolClassIds?: ReadonlyArray<string>;
}

/** Maps the observe page breakdown label to the analytics dimension (:3456 mapping). */
export const routingBreakdownDimension = (breakdown: string | undefined): string | null => {
  switch (breakdown) {
    case "By endpoint variant":
      return "endpointId";
    case "By upstream model":
      return "modelId";
    case "By provider":
      return "providerId";
    default:
      return null;
  }
};

/** Maps the observe page filter labels to the reference analytics filters. */
const csv = (value: string | undefined): ReadonlyArray<string> =>
  value === undefined
    ? []
    : value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
const single = (value: string | undefined): ReadonlyArray<string> =>
  value === undefined || value.trim().length === 0 ? [] : [value.trim()];

/** Maps the observe page filter state (basic selects + Advanced controls) to the reference analytics filters. */
export const routingChartFilters = (
  state:
    | {
        readonly difficulty?: string;
        readonly effortSources?: string;
        readonly reasoningEfforts?: string;
        readonly requestedRoleId?: string;
        readonly selectedStrategy?: string;
        readonly source?: string;
        readonly taxonomyCapabilityIds?: string;
        readonly taxonomyGroupId?: string;
        readonly taxonomyModalityIds?: string;
        readonly taxonomyRoleId?: string;
        readonly taxonomyTaskType?: string;
        readonly taxonomyTaskVariant?: string;
        readonly taxonomyToolClassIds?: string;
      }
    | undefined,
): RoutingChartFilters => ({
  ...(state?.source === "Local only"
    ? { sourceTypes: ["local"] }
    : state?.source === "Remote only"
      ? { sourceTypes: ["remote"] }
      : {}),
  ...(state?.difficulty === "Easy only"
    ? { difficultyBuckets: ["easy"] }
    : state?.difficulty === "Medium only"
      ? { difficultyBuckets: ["medium"] }
      : state?.difficulty === "Hard only"
        ? { difficultyBuckets: ["hard"] }
        : {}),
  ...(single(state?.requestedRoleId).length === 0
    ? {}
    : { requestedRoleIds: single(state?.requestedRoleId) }),
  ...(single(state?.selectedStrategy).length === 0
    ? {}
    : { selectedStrategies: single(state?.selectedStrategy) }),
  ...(csv(state?.reasoningEfforts).length === 0
    ? {}
    : { reasoningEfforts: csv(state?.reasoningEfforts) }),
  ...(csv(state?.effortSources).length === 0 ? {} : { effortSources: csv(state?.effortSources) }),
  ...(single(state?.taxonomyGroupId).length === 0
    ? {}
    : { taxonomyGroupIds: single(state?.taxonomyGroupId) }),
  ...(single(state?.taxonomyRoleId).length === 0
    ? {}
    : { taxonomyRoleIds: single(state?.taxonomyRoleId) }),
  ...(single(state?.taxonomyTaskType).length === 0
    ? {}
    : { taxonomyTaskTypes: single(state?.taxonomyTaskType) }),
  ...(single(state?.taxonomyTaskVariant).length === 0
    ? {}
    : { taxonomyTaskVariants: single(state?.taxonomyTaskVariant) }),
  ...(csv(state?.taxonomyCapabilityIds).length === 0
    ? {}
    : { taxonomyCapabilityIds: csv(state?.taxonomyCapabilityIds) }),
  ...(csv(state?.taxonomyModalityIds).length === 0
    ? {}
    : { taxonomyModalityIds: csv(state?.taxonomyModalityIds) }),
  ...(csv(state?.taxonomyToolClassIds).length === 0
    ? {}
    : { taxonomyToolClassIds: csv(state?.taxonomyToolClassIds) }),
});

export interface RoutingChartQuery {
  readonly id: string;
  readonly query: {
    readonly breakdown: string | null;
    readonly filters: RoutingChartFilters;
    readonly granularity: "hour" | "day";
    readonly metrics: ReadonlyArray<string>;
    readonly ranking: {
      readonly dimension: string;
      readonly limit: number;
      readonly metric: string;
    } | null;
    readonly windowMs: number;
  };
}

export const routingChartGranularity = (windowMs: number): "hour" | "day" =>
  windowMs <= 86_400_000 ? "hour" : "day";

export const buildRoutingChartQueries = (
  windowMs: number,
  selectedBreakdown: string | null = null,
  filters: RoutingChartFilters = {},
): ReadonlyArray<RoutingChartQuery> =>
  ROUTING_CHARTS.map((chart) => ({
    id: chart.title,
    query: {
      breakdown:
        chart.usesSelectedBreakdown === true ? selectedBreakdown : (chart.breakdown ?? null),
      filters,
      granularity: routingChartGranularity(windowMs),
      metrics: chart.metrics,
      ranking: chart.ranking ?? null,
      windowMs,
    },
  }));

export const routingChartCards = (
  entries: ReadonlyArray<{ readonly id: string; readonly json: string }>,
  state: { readonly status: "idle" | "loading" | "ok" | "error"; readonly message?: string },
  h: HtmlBuilder<Message>,
): Html => telemetryChartCards(ROUTING_CHARTS, entries, state, h, "routing-charts");
