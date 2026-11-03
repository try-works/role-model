import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { renderToString } from "@role-model-router/foldkit/experimental/server";

import { READBACK_SPECS, emptyReadbacks, parseReadbackFixture } from "../src/readback";
import { mountShell } from "../src/mount";
import { shellModel } from "./support/runtime-shell";
import type { Model } from "../src/model";
import { view } from "../src/view";

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
    { duration_ms: 120, modelId: "openai/gpt-4.1-mini-fast", resp_status_code: 200, timestamp: new Date(startAtMs + 60 * 60 * 1000).toISOString(), tokens: { cache_tokens: 4, input_tokens: 32, output_tokens: 24 } },
    { duration_ms: 300, modelId: "openai/gpt-4.1-mini-fast", resp_status_code: 500, timestamp: new Date(startAtMs + 2 * 60 * 60 * 1000).toISOString(), tokens: { cache_tokens: 0, input_tokens: 10, output_tokens: 5 } },
  ],
  window: { startAtMs, endAtMs },
};

const render = async (route: Model["route"], readbacks: Partial<Model["readbacks"]> = {}): Promise<HTMLElement> => {
  const base = shellModel({ route });
  const model = { ...base, readbacks: { ...emptyReadbacks(), ...base.readbacks, ...readbacks } };
  const rendered = await Effect.runPromise(renderToString({
    init: () => ({ commands: [], model }),
    view,
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const card = (container: HTMLElement, title: string): HTMLElement | null =>
  container.querySelector("[data-overview-card='" + title + "']");

const drawnShapes = (container: HTMLElement, title: string): number => {
  const target = card(container, title);
  return (target?.querySelectorAll("svg.ts-chart path, svg.ts-chart rect").length ?? 0);
};

describe("S628 chart data binding", () => {
  it("draws the real token, cache, latency and volume series from metrics items", async () => {
    const container = await render({ _tag: "Index" }, { overviewMetrics: parseReadbackFixture("overviewMetrics", metricsBody) });
    expect(drawnShapes(container, "Token usage over time")).toBeGreaterThan(0);
    expect(drawnShapes(container, "Cache efficiency trend")).toBeGreaterThan(0);
    expect(drawnShapes(container, "Latency trend")).toBeGreaterThan(0);
    expect(drawnShapes(container, "Success vs failure volume")).toBeGreaterThan(0);
    expect(card(container, "Token usage over time")?.textContent).toContain("Input tokens");
    expect(card(container, "Cache efficiency trend")?.textContent).toContain("Cache hit token rate");
    expect(card(container, "Success vs failure volume")?.textContent).toContain("Success");
  });

  it("renders the honest empty state INSIDE the plot when the payload has no cost facts", async () => {
    const container = await render({ _tag: "Index" }, { overviewMetrics: parseReadbackFixture("overviewMetrics", metricsBody) });
    const expected: ReadonlyArray<readonly [string, string]> = [
      ["Effective cost over time", "No request costs have been recorded"],
      ["Cost avoided over time", "No routing or cache savings have been recorded"],
    ];
    for (const [title, text] of expected) {
      const message = card(container, title)?.querySelector("[data-chart-plot] [data-chart-empty-message]");
      expect(message, title + " must show an in-plot empty state").not.toBeNull();
      expect(message?.textContent ?? "").toContain(text);
    }
  });

  it("renders in-plot empty states for every chart when the window has no requests", async () => {
    const empty = { items: [], window: { startAtMs, endAtMs } };
    const container = await render({ _tag: "Index" }, { overviewMetrics: parseReadbackFixture("overviewMetrics", empty) });
    const tokenEmpty = card(container, "Token usage over time")?.querySelector("[data-chart-plot] [data-chart-empty-message]");
    expect(tokenEmpty).not.toBeNull();
    expect(drawnShapes(container, "Token usage over time")).toBe(0);
  });

  it("renders an in-plot honest empty state on the observe volume card when there are no metrics", async () => {
    const container = await render({ _tag: "ObserveRouting" }, {
      observeRouting: parseReadbackFixture("observeRouting", []),
    });
    const message = card(container, "Routing analytics volume")?.querySelector("[data-chart-plot] [data-chart-empty-message]");
    expect(message).not.toBeNull();
    expect(message?.textContent ?? "").toContain("No routing analytics volume");
  });

  it("draws the real requests and routing volume series from the metrics readback", async () => {
    const metrics = parseReadbackFixture("overviewMetrics", metricsBody);
    const requests = await render({ _tag: "Requests" }, {
      overviewMetrics: metrics,
      requests: parseReadbackFixture("requests", []),
    });
    expect(drawnShapes(requests, "Request volume")).toBeGreaterThan(0);
    expect(card(requests, "Request volume")?.textContent).toContain("Requests");
    const routing = await render({ _tag: "ObserveRouting" }, {
      observeRouting: parseReadbackFixture("observeRouting", []),
      overviewMetrics: metrics,
    });
    expect(drawnShapes(routing, "Routing analytics volume")).toBeGreaterThan(0);
    expect(card(routing, "Routing analytics volume")?.querySelector("[data-chart-plot] [data-chart-empty-message]")).toBeNull();
  });

  it("requests the metrics page with the exact window on Requests and ObserveRouting entry", async () => {
    const waitFor = async <T>(read: () => T | undefined, label: string): Promise<T> => {
      const end = Date.now() + 10000;
      while (Date.now() < end) {
        const value = read();
        if (value !== undefined) return value;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error("Timed out waiting for " + label);
    };
    const metricsUrlFor = async (path: string): Promise<string> => {
      const urls: string[] = [];
      window.history.replaceState({}, "", path);
      const container = document.createElement("div");
      container.id = "s628-" + path.replaceAll("/", "-");
      document.body.append(container);
      const handle = mountShell(container, {
        readbackFetchImpl: async (input) => {
          urls.push(new URL(String(input), "http://localhost").pathname + new URL(String(input), "http://localhost").search);
          return new Response(JSON.stringify(metricsBody), { status: 200, headers: { "content-type": "application/json" } });
        },
      });
      try {
        return await waitFor(() => urls.find((url) => url.startsWith("/api/metrics/page")), path + " metrics fetch");
      } finally {
        handle.dispose();
        container.remove();
      }
    };
    expect(await metricsUrlFor("/requests")).toBe("/api/metrics/page?windowMs=86400000");
    expect(await metricsUrlFor("/observe/routing")).toBe("/api/metrics/page?windowMs=86400000");
  });

  it("never builds the malformed empty windowMs query for the dashboard or metrics readbacks", () => {
    expect(READBACK_SPECS.dashboard.pathFor?.("")).toBe("/api/role-model/telemetry/summary?windowMs=86400000");
    expect(READBACK_SPECS.overviewMetrics.pathFor?.("")).toBe("/api/metrics/page?windowMs=86400000");
    expect(READBACK_SPECS.dashboard.pathFor?.("604800000")).toBe("/api/role-model/telemetry/summary?windowMs=604800000");
  });
});
