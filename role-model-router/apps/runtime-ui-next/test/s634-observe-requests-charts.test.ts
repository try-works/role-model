import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { renderToString } from "@role-model-router/foldkit/experimental/server";

import { mountShell } from "../src/mount";
import {
  buildRequestsChartQueries,
  requestsBreakdownDimension,
  requestsChartFilters,
  REQUESTS_CHARTS,
} from "../src/features/observe/requests-charts";
import { emptyReadbacks, parseReadbackFixture } from "../src/readback";
import { shellModel } from "./support/runtime-shell";
import { view } from "../src/view";

/**
 * S634: the Requests analytics chart suite (nine cards) ported from :3456. The tests pin the full query payloads,
 * the page-filter -> analytics-filter mapping, the rendered cards/empty states, and the mounted route dispatching
 * (and re-dispatching) the nine POST /api/role-model/telemetry/query requests.
 */

const DAY = 86_400_000;
const startAtMs = Date.UTC(2026, 10, 3, 0, 0, 0);
const defaults = { breakdown: null, filters: {}, rankingDimension: "endpointId", rankingMetric: "averageLatencyMs" } as const;

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

const renderRequests = async (entries: ReadonlyArray<{ readonly id: string; readonly json: string }>) => {
  const base = shellModel({ route: { _tag: "Requests" } });
  const model = {
    ...base,
    readbacks: { ...emptyReadbacks(), ...base.readbacks, requests: parseReadbackFixture("requests", []), overviewMetrics: parseReadbackFixture("overviewMetrics", { items: [], window: { startAtMs, endAtMs: startAtMs + DAY } }) },
    requestsCharts: { entries, status: "ok" as const, token: 1 },
  };
  const rendered = await Effect.runPromise(renderToString({ init: () => ({ commands: [], model }), view }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S634 requests charts", () => {
  it("defines the nine reference charts with their full query payloads", () => {
    expect(REQUESTS_CHARTS.map((chart) => chart.title)).toEqual([
      "Request volume over time", "Taxonomy demand by group", "Task success vs failure", "Token usage over time",
      "Cache efficiency trend", "Effective cost over time", "Latency trend", "Capability leaders", "Ranked comparison",
    ]);
    expect(buildRequestsChartQueries(DAY, defaults)).toEqual([
      { id: "Request volume over time", query: { breakdown: null, filters: {}, granularity: "hour", metrics: ["requestCount"], ranking: null, windowMs: DAY } },
      { id: "Taxonomy demand by group", query: { breakdown: "taxonomyGroupId", filters: {}, granularity: "hour", metrics: ["requestCount"], ranking: null, windowMs: DAY } },
      { id: "Task success vs failure", query: { breakdown: "taxonomyTaskType", filters: {}, granularity: "hour", metrics: ["successCount", "failureCount"], ranking: null, windowMs: DAY } },
      { id: "Token usage over time", query: { breakdown: null, filters: {}, granularity: "hour", metrics: ["inputTokens", "outputTokens", "totalTokens"], ranking: null, windowMs: DAY } },
      { id: "Cache efficiency trend", query: { breakdown: null, filters: {}, granularity: "hour", metrics: ["cacheHitTokens", "cacheHitTokenRate"], ranking: null, windowMs: DAY } },
      { id: "Effective cost over time", query: { breakdown: null, filters: {}, granularity: "hour", metrics: ["actualCostUsd", "estimatedCostUsd", "effectiveCostUsd"], ranking: null, windowMs: DAY } },
      { id: "Latency trend", query: { breakdown: null, filters: {}, granularity: "hour", metrics: ["averageLatencyMs", "p95LatencyMs"], ranking: null, windowMs: DAY } },
      { id: "Capability leaders", query: { breakdown: null, filters: {}, granularity: "hour", metrics: ["requestCount"], ranking: { dimension: "taxonomyCapabilityId", limit: 8, metric: "requestCount" }, windowMs: DAY } },
      { id: "Ranked comparison", query: { breakdown: null, filters: {}, granularity: "hour", metrics: ["averageLatencyMs"], ranking: { dimension: "endpointId", limit: 8, metric: "averageLatencyMs" }, windowMs: DAY } },
    ]);
  });

  it("maps the Requests page breakdown/source/status/ranking/range state into the queries", () => {
    const queries = buildRequestsChartQueries(604_800_000, {
      breakdown: requestsBreakdownDimension("By upstream model"),
      filters: requestsChartFilters({ source: "Local only", statusFamily: "Failure only" }),
      rankingDimension: "modelId",
      rankingMetric: "totalTokens",
    });
    expect(requestsBreakdownDimension("By endpoint variant")).toBe("endpointId");
    expect(requestsBreakdownDimension("By provider")).toBe("providerId");
    expect(requestsBreakdownDimension("Total")).toBeNull();
    expect(requestsChartFilters({ source: "Remote only", statusFamily: "Success only" })).toEqual({ sourceTypes: ["remote"], statusFamilies: ["success"] });
    expect(queries.every((entry) => entry.query.windowMs === 604_800_000 && entry.query.granularity === "day")).toBe(true);
    expect(queries.every((entry) => JSON.stringify(entry.query.filters) === JSON.stringify({ sourceTypes: ["local"], statusFamilies: ["failure"] }))).toBe(true);
    expect(queries.find((entry) => entry.id === "Request volume over time")?.query.breakdown).toBe("modelId");
    expect(queries.find((entry) => entry.id === "Token usage over time")?.query.breakdown).toBe("modelId");
    expect(queries.find((entry) => entry.id === "Taxonomy demand by group")?.query.breakdown).toBe("taxonomyGroupId");
    expect(queries.find((entry) => entry.id === "Ranked comparison")?.query).toMatchObject({ metrics: ["totalTokens"], ranking: { dimension: "modelId", metric: "totalTokens" } });
  });

  it("renders the nine cards with real series, in-plot empties and no visible chart tables", async () => {
    const entries = [
      { id: "Request volume over time", json: JSON.stringify({ buckets: [{ startAtMs, totals: { requestCount: 4 } }], granularity: "day" }) },
      { id: "Latency trend", json: JSON.stringify({ buckets: [{ startAtMs, totals: { averageLatencyMs: 120, p95LatencyMs: 300 } }], granularity: "day" }) },
      { id: "Capability leaders", json: JSON.stringify({ ranking: { rows: [{ key: "c1", label: "Capability One", value: 3 }] } }) },
    ];
    const container = await renderRequests(entries);
    const titles = [...container.querySelectorAll("[data-overview-card]")].map((element) => element.getAttribute("data-overview-card"));
    expect(titles).toEqual(REQUESTS_CHARTS.map((chart) => chart.title));
    const volume = container.querySelector("[data-overview-card='Request volume over time']");
    expect(volume?.querySelectorAll("svg[data-chart-part='chart'] rect, svg[data-chart-part='chart'] path").length ?? 0).toBeGreaterThan(0);
    const capability = container.querySelector("[data-overview-card='Capability leaders']");
    expect(capability?.querySelectorAll("svg[data-chart-part='chart'] rect, svg[data-chart-part='chart'] path").length ?? 0).toBeGreaterThan(0);
    const empty = container.querySelector("[data-overview-card='Effective cost over time'] [data-chart-plot] [data-chart-empty-message]");
    expect(empty?.textContent).toContain("No request cost");
    expect(container.querySelectorAll("[data-overview-card] table:not(.sr-only)")).toHaveLength(0);
    expect(container.querySelectorAll("[data-overview-card] table[data-chart-part='table'].sr-only")).toHaveLength(9);
  });

  it("dispatches the nine analytics queries on the mounted route and re-queries on filter/range/ranking changes", async () => {
    const bodies: unknown[] = [];
    window.history.replaceState({}, "", "/requests");
    const container = document.createElement("div");
    container.id = "s634-requests";
    document.body.append(container);
    const handle = mountShell(container, {
      readbackFetchImpl: async () => json({ items: [], requests: [], rows: [], window: { startAtMs: 0, endAtMs: 0 } }),
      requestsChartsFetchImpl: async (_input, init) => {
        bodies.push(JSON.parse(String(init?.body)));
        return json({ buckets: [], ranking: { rows: [] } });
      },
    });
    const waitFor = async (read: () => boolean, label: string) => {
      const end = Date.now() + 15000;
      while (Date.now() < end) {
        if (read()) return;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error("Timed out waiting for " + label);
    };
    try {
      await waitFor(() => bodies.length >= 9, "initial nine requests charts queries");
      const expected = buildRequestsChartQueries(DAY, defaults) as unknown;
      for (const query of expected as ReadonlyArray<{ readonly query: unknown }>) {
        expect(bodies.slice(0, 9).map((body) => body as unknown)).toContainEqual(query.query);
      }

      const source = document.querySelector("select[aria-label='Source']") as HTMLSelectElement;
      expect(source).not.toBeNull();
      source.value = "Local only";
      source.dispatchEvent(new Event("input", { bubbles: true }));
      source.dispatchEvent(new Event("change", { bubbles: true }));
      await waitFor(() => bodies.length >= 18, "source-filtered queries");
      for (const body of bodies.slice(-9)) expect((body as { readonly filters?: unknown }).filters).toEqual({ sourceTypes: ["local"] });

      const range = document.querySelector("[data-requests-range='Week']") as HTMLButtonElement;
      expect(range).not.toBeNull();
      range.click();
      await waitFor(() => bodies.length >= 27, "week-range queries");
      for (const body of bodies.slice(-9)) expect((body as { readonly windowMs?: number; readonly granularity?: string }).windowMs).toBe(604_800_000);

      const metric = document.querySelector("[data-requests-ranking-metric]") as HTMLSelectElement;
      expect(metric).not.toBeNull();
      metric.value = "totalTokens";
      metric.dispatchEvent(new Event("input", { bubbles: true }));
      metric.dispatchEvent(new Event("change", { bubbles: true }));
      await waitFor(() => bodies.length >= 36, "ranking-metric queries");
      const ranked = bodies.slice(-9).find((body) => Array.isArray((body as { readonly metrics?: unknown }).metrics) && (body as { readonly metrics: string[] }).metrics[0] === "totalTokens");
      expect(ranked).toBeDefined();
      expect((ranked as { readonly ranking?: { readonly metric?: string } }).ranking?.metric).toBe("totalTokens");
    } finally {
      handle.dispose();
      container.remove();
    }
  });
});
