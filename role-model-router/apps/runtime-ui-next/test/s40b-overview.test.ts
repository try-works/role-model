import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";

const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const waitFor = async <T>(read: () => T | undefined, label: string): Promise<T> => {
  const end = Date.now() + 3000;
  while (Date.now() < end) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label + " | " + (document.body.textContent ?? "").slice(0, 400));
};
const summary = (requestCount: number, averageLatencyMs: number | null, p95: number | null) => ({
  requestCount, successCount: requestCount, failureCount: 0, totalInputTokens: 10, totalOutputTokens: 5, totalTokens: 15,
  averageLatencyMs, p95LatencyMs: p95, cachedRequestCount: 0, excludedRequestCount: 0,
  totalActualCostUsd: 0, totalEstimatedCostUsd: 0, totalEffectiveCostUsd: 0,
});
const mountAt = (id: string, fetchImpl: typeof fetch) => {
  window.history.replaceState({}, "", "/");
  const container = document.createElement("div");
  container.id = id;
  document.body.append(container);
  const handle = mountShell(container, { readbackFetchImpl: fetchImpl });
  mounted.push({ container, handle });
};
afterEach(() => {
  for (const entry of mounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); }
  window.history.replaceState({}, "", "/");
});

describe("S40b overview charts and windows", () => {
  const fixture = JSON.parse(readFileSync(path.join(import.meta.dirname, "fixtures", "s26o", "dashboard-latency-split.json"), "utf8"));

  it("renders latency and success/failure charts with the Day window", async () => {
    const calls: string[] = [];
    mountAt("s40b-success", async (input) => {
      const url = new URL(String(input), "http://localhost");
      calls.push(url.pathname + url.search);
      if (url.pathname === "/api/role-model/telemetry/summary") return json(fixture);
      return json({});
    });
    await waitFor(() => document.querySelector("[data-overview-state='success']") ?? undefined, "success");
    expect(document.body.textContent).toContain("Latency (ms)");
    expect(document.body.textContent).toContain("Success vs failure");
    expect(document.querySelector("[data-window='Day']")?.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector("[data-overview-period]")?.textContent).toBe("Last Day");
    expect(calls.some((call) => call.includes("windowMs=86400000"))).toBe(true);
    const table = document.querySelector("[data-chart-part='table']");
    const rows = Array.from(table?.querySelectorAll("tbody tr") ?? []).map((row) => Array.from(row.querySelectorAll("th,td")).map((cell) => cell.textContent));
    expect(rows).toContainEqual(["Average", "10"]);
    expect(rows).toContainEqual(["p95", "90"]);
    expect(document.querySelector("[data-chart-point-label='Average']")).not.toBeNull();
    expect(document.querySelector("[data-chart-point-label='p95']")).not.toBeNull();
    expect(table?.textContent).not.toContain("—");
  });

  it("switches to Week and ignores a late Day response", async () => {
    let resolveDay: ((value: Response) => void) | undefined;
    mountAt("s40b-stale", async (input) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname !== "/api/role-model/telemetry/summary") return json({});
      if (url.searchParams.get("windowMs") === "86400000") {
        return await new Promise<Response>((resolve) => { resolveDay = resolve; });
      }
      return json(summary(9, 50, 90));
    });
    await waitFor(() => document.querySelector("[data-window='Week']") ?? undefined, "filters");
    (document.querySelector("[data-window='Week']") as HTMLButtonElement).click();
    await waitFor(() => document.querySelector("[data-overview-state='success']") ?? undefined, "week success");
    expect(document.querySelector("[data-window='Week']")?.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector("[data-overview-period]")?.textContent).toBe("Last Week");
    resolveDay?.(json(summary(1, 1, 2)));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(document.querySelector("[data-overview-period]")?.textContent).toBe("Last Week");
    expect(document.body.textContent).toContain("50");
    expect(document.body.textContent).not.toContain("Last Day");
  });

  it("renders explicit empty, loading and error states without a flat-line chart", async () => {
    mountAt("s40b-empty", async (input) => {
      const url = new URL(String(input), "http://localhost");
      return url.pathname === "/api/role-model/telemetry/summary" ? json(summary(0, null, null)) : json({});
    });
    await waitFor(() => document.querySelector("[data-overview-state='empty']") ?? undefined, "empty");
    expect(document.body.textContent).toContain("No telemetry requests in the last day.");
    expect(document.body.textContent).not.toContain("Latency (ms)");
  });

  it("rejects a fabricated 90-day response", async () => {
    mountAt("s40b-fabricated", async (input) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname !== "/api/role-model/telemetry/summary") return json({});
      return json({ requestCount: "lots", successCount: 999 });
    });
    await waitFor(() => document.querySelector("[data-overview-state='error']") ?? undefined, "fabricated error");
    expect(document.querySelector("[role='alert']")).not.toBeNull();
    expect(document.body.textContent).not.toContain("Success vs failure");
  });
});
