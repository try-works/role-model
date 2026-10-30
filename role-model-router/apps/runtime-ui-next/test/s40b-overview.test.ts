import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";
import { percentile } from "../src/view";

const fixture = JSON.parse(readFileSync(path.join(import.meta.dirname, "fixtures", "s26o", "overview-boundary-items.json"), "utf8"));
const candidates = JSON.parse(readFileSync(path.join(import.meta.dirname, "fixtures", "s26o", "routerCandidates.json"), "utf8"));
const realTokens = JSON.parse(readFileSync(path.join(import.meta.dirname, "fixtures", "s26o", "overview-real-tokens.json"), "utf8"));
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
const tableRows = (title = "Latency trend"): string[][] => {
  const table = [...document.querySelectorAll("[data-chart-part='table']")].find((entry) => entry.textContent?.includes(title));
  return Array.from(table?.querySelectorAll("tbody tr") ?? []).map((row) => Array.from(row.querySelectorAll("th,td")).map((cell) => cell.textContent ?? ""));
};

describe("S40b bucketed overview", () => {
  it("uses the nearest-rank p95 index for n=20 and n=21", () => {
    const twenty = Array.from({ length: 20 }, (_, index) => index + 1);
    const twentyOne = Array.from({ length: 21 }, (_, index) => index + 1);
    expect(percentile(twenty, 95)).toBe(19);
    expect(percentile(twentyOne, 95)).toBe(20);
  });

  it("buckets Day hourly, omits empty buckets, and clamps an end-boundary item to 23:00", async () => {
    mountAt("s40b-buckets", async (input) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/metrics/page") return json(fixture);
      if (url.pathname === "/api/role-model/router/candidates") return json(candidates);
      return json({});
    });
    await waitFor(() => document.querySelector("[data-overview-state='success']") ?? undefined, "success");
    expect(document.querySelector("[data-overview-period]")?.textContent).toBe("Last Day");
    expect(document.querySelector("[data-overview-buckets]")?.getAttribute("data-overview-buckets")).toBe("3");
    expect(document.querySelector("[data-overview-labels]")?.getAttribute("data-overview-labels")).toBe("24");
    expect(document.body.textContent).toContain("00:00");
    expect(document.body.textContent).toContain("23:00");
    expect(document.body.textContent).toContain("02:00");
    expect(document.querySelector("[data-chart-point-label='02:00']")).toBeNull();
    const segmented = [...document.querySelectorAll("path.rm3-chart-series")].some((path) => (path.getAttribute("d")?.match(/M/g)?.length ?? 0) >= 2);
    expect(segmented).toBe(true);
    expect(document.querySelector("[data-overview-card='Model pool']")).not.toBeNull();
    expect(document.body.textContent).toContain("Model pool");
    expect(document.body.textContent).toContain("openai/gpt-4.1-mini-fast");
    expect(document.body.textContent).toContain("Token usage over time");
    expect(document.body.textContent).not.toContain("NaN");
  });

  it("accepts the real metrics body with object-valued tokens", async () => {
    mountAt("s40b-real", async (input) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/metrics/page") return json(realTokens);
      if (url.pathname === "/api/role-model/router/candidates") return json(candidates);
      return json({});
    });
    await waitFor(() => document.querySelector("[data-overview-state='success']") ?? undefined, "real success");
    expect(Number(document.querySelector("[data-overview-buckets]")?.getAttribute("data-overview-buckets"))).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain("NaN");
  });

  it("shows per-model rail counts from the same items", async () => {
    mountAt("s40b-models", async (input) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/metrics/page") return json(fixture);
      return json({});
    });
    await waitFor(() => document.querySelector("[data-slot='role-model-model-inventory']") ?? undefined, "model inventory");
    const inventory = document.querySelector("[data-slot='role-model-model-inventory']")?.textContent ?? "";
    expect(inventory).toContain("Models");
    expect(inventory).toContain("Requests");
  });

  it("switches Week and ignores a late Day response", async () => {
    let resolveDay: ((value: Response) => void) | undefined;
    mountAt("s40b-stale", async (input) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/role-model/router/candidates") return json(candidates);
      if (url.pathname !== "/api/metrics/page") return json({});
      if (url.searchParams.get("windowMs") === "86400000") return await new Promise<Response>((resolve) => { resolveDay = resolve; });
      return json(fixture);
    });
    await waitFor(() => document.querySelector("[data-window='Week']") ?? undefined, "filters");
    (document.querySelector("[data-window='Week']") as HTMLButtonElement).click();
    await waitFor(() => document.querySelector("[data-overview-state='success']") ?? undefined, "week success");
    expect(document.querySelector("[data-overview-period]")?.textContent).toBe("Last Week");
    resolveDay?.(json(fixture));
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(document.querySelector("[data-overview-period]")?.textContent).toBe("Last Week");
    expect(document.querySelector("[data-overview-state='success']")).not.toBeNull();
  });

  it("renders explicit empty and rejects fabricated metrics", async () => {
    mountAt("s40b-empty", async (input) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/metrics/page") return json({ items: [], window: { startAtMs: 0, endAtMs: 86400000, asOfMs: 0 } });
      return json({});
    });
    await waitFor(() => document.querySelector("[data-overview-state='empty']") ?? undefined, "empty");
    expect(document.body.textContent).toContain("No token-bearing requests have been recorded yet.");
    expect(document.querySelector("[data-overview-charts]")).not.toBeNull();
  });

  it("rejects a fabricated metrics body", async () => {
    mountAt("s40b-fabricated", async (input) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/metrics/page") return json({ items: "lots", window: {} });
      return json({});
    });
    await waitFor(() => document.querySelector("[data-overview-state='error']") ?? undefined, "error");
    expect(document.querySelector("[role='alert']")).not.toBeNull();
    expect(document.querySelector("[data-overview-state='error']")).not.toBeNull();
  });
});
