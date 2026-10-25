import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";

const fixture = JSON.parse(readFileSync(path.join(import.meta.dirname, "fixtures", "s26o", "overview-boundary-items.json"), "utf8"));
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
const tableRows = (): string[][] => {
  const table = document.querySelector("[data-chart-part='table']");
  return Array.from(table?.querySelectorAll("tbody tr") ?? []).map((row) => Array.from(row.querySelectorAll("th,td")).map((cell) => cell.textContent ?? ""));
};

describe("S40b bucketed overview", () => {
  it("buckets Day into hourly buckets, omits empty buckets and labels 00:00/24:00", async () => {
    mountAt("s40b-buckets", async (input) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/metrics/page") return json(fixture);
      return json({});
    });
    await waitFor(() => document.querySelector("[data-overview-state='success']") ?? undefined, "success");
    expect(document.querySelector("[data-overview-period]")?.textContent).toBe("Last Day");
    expect(document.querySelector("[data-overview-buckets]")?.getAttribute("data-overview-buckets")).toBe("3");
    const rows = tableRows();
    expect(rows).toContainEqual(["00:00", "10", "10"]);
    expect(rows).toContainEqual(["01:00", "30", "40"]);
    expect(rows).toContainEqual(["23:00", "90", "90"]);
    expect(rows.some((row) => row[0] === "02:00")).toBe(false);
    expect(document.querySelectorAll("[data-chart-point-label]").length).toBeGreaterThanOrEqual(6);
    expect(document.body.textContent).not.toContain("02:00");
  });

  it("shows per-model rail counts from the same items", async () => {
    mountAt("s40b-models", async (input) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/metrics/page") return json(fixture);
      return json({});
    });
    await waitFor(() => document.querySelector("[data-rail-model-count]") ?? undefined, "model count");
    expect(document.querySelector("[data-rail-model='model-a'] [data-rail-model-count]")?.textContent).toBe("2");
    expect(document.querySelector("[data-rail-model='model-b'] [data-rail-model-count]")?.textContent).toBe("2");
  });

  it("switches Week and ignores a late Day response", async () => {
    let resolveDay: ((value: Response) => void) | undefined;
    mountAt("s40b-stale", async (input) => {
      const url = new URL(String(input), "http://localhost");
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
    expect(document.body.textContent).toContain("No telemetry requests in the last day.");
    expect(document.querySelector("[data-overview-charts]")).toBeNull();
  });

  it("rejects a fabricated metrics body", async () => {
    mountAt("s40b-fabricated", async (input) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/metrics/page") return json({ items: "lots", window: {} });
      return json({});
    });
    await waitFor(() => document.querySelector("[data-overview-state='error']") ?? undefined, "error");
    expect(document.querySelector("[role='alert']")).not.toBeNull();
    expect(document.querySelector("[data-overview-charts]")).toBeNull();
  });
});
