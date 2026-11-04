import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { renderToString } from "@role-model-router/foldkit/experimental/server";

import { mountShell } from "../src/mount";
import { buildRoutingChartQueries, ROUTING_CHARTS } from "../src/features/observe/routing-charts";
import { emptyReadbacks, parseReadbackFixture } from "../src/readback";
import { shellModel } from "./support/runtime-shell";
import { view } from "../src/view";

/**
 * S632 (task-112): observe-routing chart suite parity with the :3456 reference. All nine definition cards render,
 * the batch analytics query is dispatched for them, real bucket/ranking data draws series, and a card with no
 * data shows the honest empty state inside its plot (never a visible table).
 */

const startAtMs = Date.UTC(2026, 10, 3, 0, 0, 0);
const day = 86_400_000;
const buckets = (values: ReadonlyArray<number>) => ({
  buckets: values.map((value, index) => ({ endAtMs: startAtMs + (index + 1) * day, series: [], startAtMs: startAtMs + index * day, totals: { requestCount: value } })),
  granularity: "day",
  ranking: null,
});

const entries = [
  { id: "Routing decision volume", json: JSON.stringify(buckets([3, 5, 0])) },
  { id: "Model selection", json: JSON.stringify({ ranking: { dimension: "modelId", metric: "requestCount", rows: [{ key: "m1", label: "Model One", value: 7 }, { key: "m2", label: "Model Two", value: 3 }] } }) },
  { id: "Cost avoided by routing", json: JSON.stringify({ buckets: [{ startAtMs, totals: { cacheCostSavingsUsd: 0, routingCostSavingsUsd: 0, totalAvoidedCostUsd: 0 } }], granularity: "day" }) },
];

const renderRoute = async () => {
  const base = shellModel({ route: { _tag: "ObserveRouting" } });
  const model = {
    ...base,
    readbacks: { ...emptyReadbacks(), ...base.readbacks, observeRouting: parseReadbackFixture("observeRouting", []), overviewMetrics: parseReadbackFixture("overviewMetrics", { items: [], window: { startAtMs, endAtMs: startAtMs + day } }) },
    routingCharts: { entries, status: "ok" as const, token: 1 },
  };
  const rendered = await Effect.runPromise(renderToString({ init: () => ({ commands: [], model }), view }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S632 observe routing charts", () => {
  it("emits the full reference definition payloads for all nine charts", () => {
    expect(ROUTING_CHARTS.map((chart) => chart.title)).toEqual([
      "Cost avoided by routing", "Routing decision volume", "Routing volume by taxonomy role", "Avoided cost by taxonomy task",
      "Difficulty distribution", "Strategy selection trend", "Capability routing mix", "Tool class routing mix", "Model selection",
    ]);
    expect(ROUTING_CHARTS.find((chart) => chart.title === "Capability routing mix")?.emptyMessage)
      .toBe("No capability-tagged telemetry is available for the current slice.");
    expect(buildRoutingChartQueries(86_400_000)).toEqual([
      { id: "Cost avoided by routing", query: { breakdown: null, filters: {}, granularity: "hour", metrics: ["routingCostSavingsUsd", "cacheCostSavingsUsd", "totalAvoidedCostUsd"], ranking: null, windowMs: 86_400_000 } },
      { id: "Routing decision volume", query: { breakdown: null, filters: {}, granularity: "hour", metrics: ["requestCount"], ranking: null, windowMs: 86_400_000 } },
      { id: "Routing volume by taxonomy role", query: { breakdown: "taxonomyRoleId", filters: {}, granularity: "hour", metrics: ["requestCount"], ranking: null, windowMs: 86_400_000 } },
      { id: "Avoided cost by taxonomy task", query: { breakdown: null, filters: {}, granularity: "hour", metrics: ["totalAvoidedCostUsd"], ranking: { dimension: "taxonomyTaskType", limit: 8, metric: "totalAvoidedCostUsd" }, windowMs: 86_400_000 } },
      { id: "Difficulty distribution", query: { breakdown: null, filters: {}, granularity: "hour", metrics: ["requestCount"], ranking: { dimension: "difficultyBucket", limit: 8, metric: "requestCount" }, windowMs: 86_400_000 } },
      { id: "Strategy selection trend", query: { breakdown: "selectedStrategy", filters: {}, granularity: "hour", metrics: ["requestCount"], ranking: null, windowMs: 86_400_000 } },
      { id: "Capability routing mix", query: { breakdown: null, filters: {}, granularity: "hour", metrics: ["requestCount"], ranking: { dimension: "taxonomyCapabilityId", limit: 8, metric: "requestCount" }, windowMs: 86_400_000 } },
      { id: "Tool class routing mix", query: { breakdown: null, filters: {}, granularity: "hour", metrics: ["requestCount"], ranking: { dimension: "taxonomyToolClassId", limit: 8, metric: "requestCount" }, windowMs: 86_400_000 } },
      { id: "Model selection", query: { breakdown: null, filters: {}, granularity: "hour", metrics: ["requestCount"], ranking: { dimension: "modelId", limit: 8, metric: "requestCount" }, windowMs: 86_400_000 } },
    ]);
    expect(buildRoutingChartQueries(604_800_000).every((entry) => entry.query.granularity === "day")).toBe(true);
  });

  it("gives the time-series charts the selected breakdown and threads the analytics filters into every query", () => {
    const filters = { difficultyBuckets: ["hard"], sourceTypes: ["local"], taxonomyRoleIds: ["coder"] };
    const queries = buildRoutingChartQueries(86_400_000, "modelId", filters);
    expect(queries.find((entry) => entry.id === "Cost avoided by routing")?.query.breakdown).toBe("modelId");
    expect(queries.find((entry) => entry.id === "Routing decision volume")?.query.breakdown).toBe("modelId");
    expect(queries.find((entry) => entry.id === "Routing volume by taxonomy role")?.query.breakdown).toBe("taxonomyRoleId");
    expect(queries.every((entry) => entry.query.filters === filters)).toBe(true);
  });

  it("renders all nine cards, real series where data exists, and in-plot empty states otherwise", async () => {
    const container = await renderRoute();
    const titles = [...container.querySelectorAll("[data-overview-card]")].map((element) => element.getAttribute("data-overview-card"));
    expect(titles).toEqual(ROUTING_CHARTS.map((chart) => chart.title));
    const decision = container.querySelector("[data-overview-card='Routing decision volume']");
    expect(decision?.querySelectorAll("svg[data-chart-part='chart'] rect, svg[data-chart-part='chart'] path").length ?? 0).toBeGreaterThan(0);
    const model = container.querySelector("[data-overview-card='Model selection']");
    expect(model?.querySelectorAll("svg[data-chart-part='chart'] rect, svg[data-chart-part='chart'] path").length ?? 0).toBeGreaterThan(0);
    const costEmpty = container.querySelector("[data-overview-card='Cost avoided by routing'] [data-chart-plot] [data-chart-empty-message]");
    expect(costEmpty?.textContent).toContain("No routing savings");
    expect(container.querySelectorAll("[data-overview-card] table:not(.sr-only)")).toHaveLength(0);
  });

  it("dispatches the analytics batch with nine queries on the real route", async () => {
    const requests: Array<{ readonly body: unknown; readonly path: string }> = [];
    window.history.replaceState({}, "", "/observe/routing");
    const container = document.createElement("div");
    container.id = "s632-routing";
    document.body.append(container);
    const handle = mountShell(container, {
      readbackFetchImpl: async () => new Response(JSON.stringify({ items: [], rows: [], requests: [], window: { startAtMs: 0, endAtMs: 0 } }), { status: 200, headers: { "content-type": "application/json" } }),
      routingChartsFetchImpl: async (input, init) => {
        requests.push({ body: JSON.parse(String(init?.body)), path: new URL(String(input), "http://localhost").pathname });
        return new Response(JSON.stringify({ buckets: [], ranking: { rows: [] } }), { status: 200, headers: { "content-type": "application/json" } });
      },
    });
    try {
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline && new Set(requests.map((entry) => (entry.body as { ranking?: { dimension?: string } }).ranking?.dimension ?? (entry.body as { breakdown?: string }).breakdown ?? "base")).size < 9) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      expect(requests.length).toBe(9);
      expect(requests.every((entry) => entry.path === "/api/role-model/telemetry/query")).toBe(true);
      const expected = buildRoutingChartQueries(86_400_000).map((entry) => entry.query as unknown);
      for (const query of expected) {
        expect(requests.map((entry) => entry.body as unknown)).toContainEqual(query);
      }
      expect(new Set(requests.map((entry) => JSON.stringify(entry.body))).size).toBe(9);
    } finally {
      handle.dispose();
      container.remove();
    }
  });
});
