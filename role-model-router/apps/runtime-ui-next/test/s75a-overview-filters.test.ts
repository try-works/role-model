import { afterEach, describe, expect, it } from "vitest";
import { mountShell } from "../src/mount";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_OVERVIEW_FILTERS, overviewQuery, overviewSummary } from "../src/overview-filters";

const DAY = 86400000;
const fixture = (name: string) => JSON.parse(readFileSync(path.join(import.meta.dirname, "fixtures", "s26o", name + ".json"), "utf8"));
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const item = (id: number, sourceType: "local" | "remote", status: number) => ({ id, request_id: "req-" + String(id), timestampMs: Date.now(), sourceType, resp_status_code: status, durations: { totalMs: 10 }, tokens: { input_tokens: 2, output_tokens: 3 }, modelId: "moonshot/kimi-k2.5", endpointId: "endpoint-a", providerId: "moonshot" });
const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const waitFor = async <T>(read: () => T | undefined, label: string): Promise<T> => { const end = Date.now() + 10000; while (Date.now() < end) { const value = read(); if (value !== undefined) return value; await new Promise((r) => setTimeout(r, 10)); } throw new Error("Timed out waiting for " + label); };
afterEach(() => { for (const entry of mounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); } window.history.replaceState({}, "", "/"); });

describe("S75a overview filters", () => {
  it("maps every filter to the exact query parameter", () => {
    const base = { ...DEFAULT_OVERVIEW_FILTERS };
    expect(overviewQuery(base, DAY)).toBe("?windowMs=86400000");
    expect(overviewQuery({ ...base, source: "local" }, DAY)).toBe("?windowMs=86400000&sourceTypes=local");
    expect(overviewQuery({ ...base, status: "failure" }, DAY)).toBe("?windowMs=86400000&statusFamilies=failure");
    expect(overviewQuery({ ...base, difficulty: "hard" }, DAY)).toBe("?windowMs=86400000&difficultyBuckets=hard");
    expect(overviewQuery({ ...base, breakdown: "endpoint", breakdownValue: "endpoint-a" }, DAY)).toBe("?windowMs=86400000&endpointIds=endpoint-a");
    expect(overviewQuery({ ...base, breakdown: "model", breakdownValue: "moonshot/kimi-k2.5" }, DAY)).toBe("?windowMs=86400000&modelIds=moonshot%2Fkimi-k2.5");
    expect(overviewQuery({ ...base, breakdown: "provider", breakdownValue: "moonshot" }, DAY)).toBe("?windowMs=86400000&providerIds=moonshot");
    expect(overviewSummary({ ...base, source: "local", status: "failure", difficulty: "hard", breakdown: "endpoint", breakdownValue: "endpoint-a" })).toBe("Source: local · Status: failure · Difficulty: hard · Breakdown: endpoint=endpoint-a");
  });

  it("recomputes the overview from a real filtered body (4 rows -> 3 success rows)", async () => {
    window.history.replaceState({}, "", "/");
    const container = document.createElement("div"); container.id = "s75a-filtered"; document.body.append(container);
    let releaseSuccess: ((value: Response) => void) | undefined;
    let call = 0;
    const handle = mountShell(container, { readbackFetchImpl: async (input) => { const url = String(input); if (url.includes("/api/metrics/page")) { call += 1; if (call === 1) return json(fixture("overview-filtered-all")); if (url.includes("statusFamilies=success")) return await new Promise<Response>((resolve) => { releaseSuccess = resolve; }); return json(fixture("overview-filtered-failure")); } return json({}); } });
    mounted.push({ container, handle });
    await waitFor(() => document.querySelector("[data-overview-items=\"4\"]") ?? undefined, "all rows");
    const select = document.querySelector("[data-overview-filter=\"status\"]") as HTMLSelectElement;
    select.value = "success"; select.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    releaseSuccess?.(json(fixture("overview-filtered-success")));
    await waitFor(() => document.querySelector("[data-overview-items=\"3\"]") ?? undefined, "filtered rows");
    expect(document.querySelector("[data-overview-summary]")?.textContent).toContain("Status: success");
  });

  it("lets the newest filtered response win when an older response resolves last", async () => {
    window.history.replaceState({}, "", "/");
    const container = document.createElement("div"); container.id = "s75a-stale"; document.body.append(container);
    const urls: string[] = [];
    let releaseOld: ((value: Response) => void) | undefined;
    let releaseNew: ((value: Response) => void) | undefined;
    let call = 0;
    const handle = mountShell(container, { readbackFetchImpl: async (input) => { const url = String(input); if (url.includes("/api/metrics/page")) { urls.push(url); call += 1; if (call === 1) return await new Promise<Response>((resolve) => { releaseOld = resolve; }); return await new Promise<Response>((resolve) => { releaseNew = resolve; }); } return json({}); } });
    mounted.push({ container, handle });
    await waitFor(() => urls.length === 1 ? true : undefined, "first fetch");
    const select = document.querySelector("[data-overview-filter='source']") as HTMLSelectElement;
    select.value = "local"; select.dispatchEvent(new Event("change", { bubbles: true }));
    await waitFor(() => urls.length >= 2 ? true : undefined, "second fetch");
    releaseNew?.(json({ items: [item(1, "local", 200)], window: { startAtMs: Date.now() - DAY, endAtMs: Date.now() } }));
    await waitFor(() => document.querySelector("[data-overview-items=\"1\"]") ?? undefined, "new response");
    releaseOld?.(json({ items: [], window: { startAtMs: Date.now() - DAY, endAtMs: Date.now() } }));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(document.querySelector("[data-overview-items='1']")).not.toBeNull();
    expect(document.querySelector("[data-overview-summary]")?.textContent).toContain("Source: local");
    expect(urls[1]).toContain("sourceTypes=local");
  });
});
