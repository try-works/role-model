import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { renderToString } from "@role-model-router/foldkit/experimental/server";

import type { Model } from "../src/model";
import { mountShell } from "../src/mount";
import { READBACK_SPECS, emptyReadbacks, parseReadbackFixture } from "../src/readback";
import { view } from "../src/view";
import { shellModel } from "./support/runtime-shell";

/**
 * S628 (task-104): chart data binding. Owner-reported regression: overview + observe charts rendered blank
 * (SVGs with zero series paths / blank volume cards) after the chart migration. These tests pin the data
 * binding from the per-request metrics items and the honest empty state INSIDE the plot when the payload
 * has no facts for a chart (e.g. costs: the metrics items carry no cost fields).
 */

const startAtMs = Date.UTC(2026, 10, 3, 10, 0, 0);
const endAtMs = startAtMs + 24 * 60 * 60 * 1000;
const metricsBody = {
  items: [
    {
      duration_ms: 120,
      modelId: "openai/gpt-4.1-mini-fast",
      resp_status_code: 200,
      timestamp: new Date(startAtMs + 60 * 60 * 1000).toISOString(),
      tokens: { cache_tokens: 4, input_tokens: 32, output_tokens: 24 },
    },
    {
      duration_ms: 300,
      modelId: "openai/gpt-4.1-mini-fast",
      resp_status_code: 500,
      timestamp: new Date(startAtMs + 2 * 60 * 60 * 1000).toISOString(),
      tokens: { cache_tokens: 0, input_tokens: 10, output_tokens: 5 },
    },
  ],
  window: { startAtMs, endAtMs },
};

const render = async (
  route: Model["route"],
  readbacks: Partial<Model["readbacks"]> = {},
): Promise<HTMLElement> => {
  const base = shellModel({ route });
  const model = { ...base, readbacks: { ...emptyReadbacks(), ...base.readbacks, ...readbacks } };
  const rendered = await Effect.runPromise(
    renderToString(
      {
        init: () => ({ commands: [], model }),
        view,
      },
      { isHydratable: false },
    ),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const card = (container: HTMLElement, title: string): HTMLElement | null =>
  container.querySelector(`[data-overview-card='${title}']`);

const drawnShapes = (container: HTMLElement, title: string): number => {
  const target = card(container, title);
  return target?.querySelectorAll("svg.ts-chart path, svg.ts-chart rect").length ?? 0;
};

describe("S628 chart data binding", () => {
  it("draws the real token, cache, latency and volume series from metrics items", async () => {
    const container = await render(
      { _tag: "Index" },
      { overviewMetrics: parseReadbackFixture("overviewMetrics", metricsBody) },
    );
    expect(drawnShapes(container, "Token usage over time")).toBeGreaterThan(0);
    expect(drawnShapes(container, "Cache efficiency trend")).toBeGreaterThan(0);
    expect(drawnShapes(container, "Latency trend")).toBeGreaterThan(0);
    expect(drawnShapes(container, "Success vs failure volume")).toBeGreaterThan(0);
    expect(card(container, "Token usage over time")?.textContent).toContain("Input tokens");
    expect(card(container, "Cache efficiency trend")?.textContent).toContain(
      "Cache hit token rate",
    );
    expect(card(container, "Success vs failure volume")?.textContent).toContain("Success");
  });

  it("renders the honest empty state INSIDE the plot when the payload has no cost facts", async () => {
    const container = await render(
      { _tag: "Index" },
      { overviewMetrics: parseReadbackFixture("overviewMetrics", metricsBody) },
    );
    const expected: ReadonlyArray<readonly [string, string]> = [
      ["Effective cost over time", "No request costs have been recorded"],
      ["Cost avoided over time", "No routing or cache savings have been recorded"],
    ];
    for (const [title, text] of expected) {
      const message = card(container, title)?.querySelector(
        "[data-chart-plot] [data-chart-empty-message]",
      );
      expect(message, `${title} must show an in-plot empty state`).not.toBeNull();
      expect(message?.textContent ?? "").toContain(text);
    }
  });

  it("renders in-plot empty states for every chart when the window has no requests", async () => {
    const empty = { items: [], window: { startAtMs, endAtMs } };
    const container = await render(
      { _tag: "Index" },
      { overviewMetrics: parseReadbackFixture("overviewMetrics", empty) },
    );
    const tokenEmpty = card(container, "Token usage over time")?.querySelector(
      "[data-chart-plot] [data-chart-empty-message]",
    );
    expect(tokenEmpty).not.toBeNull();
    expect(drawnShapes(container, "Token usage over time")).toBe(0);
  });

  it("renders in-plot honest empty states on the observe routing chart suite when no analytics are loaded", async () => {
    const container = await render(
      { _tag: "ObserveRouting" },
      {
        observeRouting: parseReadbackFixture("observeRouting", []),
      },
    );
    const message = card(container, "Routing decision volume")?.querySelector(
      "[data-chart-plot] [data-chart-empty-message]",
    );
    expect(message).not.toBeNull();
    expect(message?.textContent ?? "").toContain("No routed decisions");
    expect(
      container.querySelectorAll("[data-overview-card] svg[data-chart-part='chart']").length,
    ).toBe(9);
  });

  it("draws the real requests volume and observe-routing chart series from their readbacks", async () => {
    const metrics = parseReadbackFixture("overviewMetrics", metricsBody);
    const startAtMs = Date.UTC(2026, 10, 3, 0, 0, 0);
    const dayMs = 86_400_000;
    const requestsBase = shellModel({ route: { _tag: "Requests" } });
    const requestsModel = {
      ...requestsBase,
      readbacks: {
        ...emptyReadbacks(),
        ...requestsBase.readbacks,
        requests: parseReadbackFixture("requests", []),
        overviewMetrics: metrics,
      },
      requestsCharts: {
        entries: [
          {
            id: "Request volume over time",
            json: JSON.stringify({
              buckets: [{ startAtMs, totals: { requestCount: 4 } }],
              granularity: "day",
            }),
          },
          {
            id: "Latency trend",
            json: JSON.stringify({
              buckets: [{ startAtMs, totals: { averageLatencyMs: 120, p95LatencyMs: 300 } }],
              granularity: "day",
            }),
          },
        ],
        status: "ok" as const,
        token: 1,
      },
    };
    const requestsRendered = await Effect.runPromise(
      renderToString(
        { init: () => ({ commands: [], model: requestsModel }), view },
        { isHydratable: false },
      ),
    );
    const requests = document.createElement("div");
    requests.innerHTML = requestsRendered.html;
    expect(drawnShapes(requests, "Request volume over time")).toBeGreaterThan(0);
    expect(card(requests, "Request volume over time")?.textContent).toContain("Requests");
    const routing = await render(
      { _tag: "ObserveRouting" },
      {
        observeRouting: parseReadbackFixture("observeRouting", []),
        overviewMetrics: metrics,
      },
    );
    const baseModel = shellModel({ route: { _tag: "ObserveRouting" } });
    const routingModel = {
      ...baseModel,
      readbacks: {
        ...emptyReadbacks(),
        ...baseModel.readbacks,
        observeRouting: parseReadbackFixture("observeRouting", []),
        overviewMetrics: metrics,
      },
      routingCharts: {
        entries: [
          {
            id: "Routing decision volume",
            json: JSON.stringify({
              buckets: [{ startAtMs, totals: { requestCount: 4 } }],
              granularity: "day",
            }),
          },
          {
            id: "Model selection",
            json: JSON.stringify({
              ranking: {
                dimension: "modelId",
                metric: "requestCount",
                rows: [{ key: "m1", label: "Model One", value: 4 }],
              },
            }),
          },
        ],
        status: "ok" as const,
        token: 1,
      },
    };
    const rendered = await Effect.runPromise(
      renderToString(
        { init: () => ({ commands: [], model: routingModel }), view },
        { isHydratable: false },
      ),
    );
    const container = document.createElement("div");
    container.innerHTML = rendered.html;
    expect(drawnShapes(container, "Routing decision volume")).toBeGreaterThan(0);
    expect(drawnShapes(container, "Model selection")).toBeGreaterThan(0);
    expect(
      card(routing, "Routing decision volume")?.querySelector(
        "[data-chart-plot] [data-chart-empty-message]",
      ),
    ).not.toBeNull();
  });

  it("re-reads metrics and the route with the exact Day and Week windows on Requests and ObserveRouting", async () => {
    const waitFor = async <T>(read: () => T | undefined, label: string): Promise<T> => {
      const end = Date.now() + 10000;
      while (Date.now() < end) {
        const value = read();
        if (value !== undefined) return value;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error(`Timed out waiting for ${label}`);
    };
    const primaryPath: Readonly<Record<string, string>> = {
      "/observe/routing": "/api/role-model/telemetry/rows",
      "/requests": "/api/role-model/telemetry/requests",
    };
    const mountedReads = async (
      path: string,
    ): Promise<{ dayMetrics: string; weekMetrics: string; weekPrimary: string }> => {
      const urls: string[] = [];
      window.history.replaceState({}, "", path);
      const container = document.createElement("div");
      container.id = `s628-${path.replaceAll("/", "-")}`;
      document.body.append(container);
      const handle = mountShell(container, {
        readbackFetchImpl: async (input) => {
          const url = new URL(String(input), "http://localhost");
          urls.push(url.pathname + url.search);
          return new Response(JSON.stringify(metricsBody), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      });
      try {
        const dayMetrics = await waitFor(
          () => urls.find((url) => url.startsWith("/api/metrics/page")),
          `${path} Day metrics fetch`,
        );
        const weekButton = await waitFor(
          () =>
            (document.querySelector("[data-requests-range='Week']") as HTMLButtonElement | null) ??
            undefined,
          `${path} Week range button`,
        );
        weekButton.click();
        const weekMetrics = await waitFor(
          () =>
            urls.find(
              (url) => url.startsWith("/api/metrics/page") && url.includes("windowMs=604800000"),
            ),
          `${path} Week metrics fetch`,
        );
        const expectedPrimary = primaryPath[path] ?? "";
        const weekPrimary = await waitFor(
          () =>
            urls.find(
              (url) =>
                expectedPrimary.length > 0 &&
                url.startsWith(expectedPrimary) &&
                url.includes("range=Week"),
            ),
          `${path} Week route re-read`,
        );
        return { dayMetrics, weekMetrics, weekPrimary };
      } finally {
        handle.dispose();
        container.remove();
      }
    };
    const requests = await mountedReads("/requests");
    expect(requests.dayMetrics).toBe("/api/metrics/page?windowMs=86400000");
    expect(requests.weekMetrics).toBe("/api/metrics/page?windowMs=604800000");
    expect(requests.weekPrimary).toContain("range=Week");
    const routing = await mountedReads("/observe/routing");
    expect(routing.dayMetrics).toBe("/api/metrics/page?windowMs=86400000");
    expect(routing.weekMetrics).toBe("/api/metrics/page?windowMs=604800000");
    expect(routing.weekPrimary).toContain("range=Week");
  });

  it("never builds the malformed empty windowMs query for the dashboard or metrics readbacks", () => {
    expect(READBACK_SPECS.dashboard.pathFor?.("")).toBe(
      "/api/role-model/telemetry/summary?windowMs=86400000",
    );
    expect(READBACK_SPECS.overviewMetrics.pathFor?.("")).toBe(
      "/api/metrics/page?windowMs=86400000",
    );
    expect(READBACK_SPECS.dashboard.pathFor?.("604800000")).toBe(
      "/api/role-model/telemetry/summary?windowMs=604800000",
    );
  });

  it("keeps the chart data table as an sr-only a11y surface, never a visible table", async () => {
    const container = await render(
      { _tag: "Index" },
      { overviewMetrics: parseReadbackFixture("overviewMetrics", metricsBody) },
    );
    const tables = [
      ...container.querySelectorAll("[data-overview-card] table[data-chart-part='table']"),
    ];
    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      expect(table.classList.contains("sr-only"), "chart table must be sr-only").toBe(true);
    }
    expect(container.querySelectorAll("[data-overview-card] table:not(.sr-only)")).toHaveLength(0);

    const metrics = parseReadbackFixture("overviewMetrics", metricsBody);
    const requests = await render(
      { _tag: "Requests" },
      {
        overviewMetrics: metrics,
        requests: parseReadbackFixture("requests", []),
      },
    );
    expect(
      requests.querySelectorAll("[data-overview-card] table[data-chart-part='table']").length,
    ).toBeGreaterThan(0);
    expect(requests.querySelectorAll("[data-overview-card] table:not(.sr-only)")).toHaveLength(0);

    const routing = await render(
      { _tag: "ObserveRouting" },
      {
        observeRouting: parseReadbackFixture("observeRouting", []),
        overviewMetrics: metrics,
      },
    );
    expect(
      routing.querySelectorAll("[data-overview-card] table[data-chart-part='table']"),
    ).toHaveLength(9);
    expect(routing.querySelectorAll("[data-overview-card] table:not(.sr-only)")).toHaveLength(0);
  });
});
