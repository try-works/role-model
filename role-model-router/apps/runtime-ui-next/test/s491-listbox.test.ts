import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";

/**
 * S491/S496: the Requests ranking selectors are now real <select> controls on the route (task-108), wired to
 * RequestsRankingFieldChanged. These tests drive the route selections and assert the ranking readback query,
 * which is the behaviour the former listbox facade tests covered.
 */
const mounted: Array<{ readonly container: HTMLElement; readonly handle: { dispose(): void } }> = [];

const waitFor = async <T,>(read: () => T | undefined, label: string): Promise<T> => {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("timed out waiting for " + label);
};

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, status: 200 });

const mountRequests = (onRanking: (request: { readonly body: unknown; readonly method: string; readonly url: string }) => void): void => {
  window.history.replaceState({}, "", "/requests");
  const container = document.createElement("div");
  container.id = "s491-requests-selects";
  document.body.append(container);
  mounted.push({
    container,
    handle: mountShell(container, {
      readbackFetchImpl: async () => json({ items: [], rows: [], requests: [], window: { startAtMs: 0, endAtMs: 0 } }),
      requestsRankingFetchImpl: async (input, init) => {
        onRanking({ body: JSON.parse(String(init?.body)), method: String(init?.method ?? ""), url: String(input) });
        return json({ ranking: { rows: [] } });
      },
    }),
  });
};

const choose = (select: HTMLSelectElement, value: string): void => {
  select.value = value;
  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
};

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  window.history.replaceState({}, "", "/");
});

describe("S491 Requests ranking metric select", () => {
  it("renders the real metric select and dispatches the ranking query on change", async () => {
    const rankingCalls: Array<{ readonly body: unknown; readonly method: string; readonly url: string }> = [];
    mountRequests((request) => {
      rankingCalls.push(request);
    });
    const metric = await waitFor(
      () => (document.querySelector("[data-requests-ranking-metric]") as HTMLSelectElement | null) ?? undefined,
      "metric select",
    );
    expect(metric.getAttribute("aria-label")).toBe("Ranking metric");
    expect(metric.value).toBe("averageLatencyMs");
    const labels = [...metric.options].map((option) => option.textContent?.trim());
    expect(labels).toContain("Requests");
    expect(labels).toContain("Total tokens");
    choose(metric, "totalTokens");
    await waitFor(() => (rankingCalls.length > 0 ? true : undefined), "ranking query after metric change");
    expect(rankingCalls[0]?.method).toBe("POST");
    expect(new URL(String(rankingCalls[0]?.url), "http://localhost").pathname).toBe("/api/role-model/telemetry/query");
    expect(rankingCalls[0]?.body).toMatchObject({
      metrics: ["totalTokens"],
      ranking: { dimension: "endpointId", metric: "totalTokens" },
    });
  });
});

describe("S496 Requests ranking target select", () => {
  it("renders the real target select and dispatches the ranking query on change", async () => {
    const rankingCalls: Array<{ readonly body: unknown; readonly method: string }> = [];
    mountRequests((request) => {
      rankingCalls.push({ body: request.body, method: request.method });
    });
    const target = await waitFor(
      () => (document.querySelector("[data-requests-ranking-target]") as HTMLSelectElement | null) ?? undefined,
      "target select",
    );
    expect(target.getAttribute("aria-label")).toBe("Ranking target");
    expect(target.value).toBe("endpointId");
    choose(target, "modelId");
    await waitFor(() => (rankingCalls.length > 0 ? true : undefined), "ranking query after target change");
    expect(rankingCalls[0]?.method).toBe("POST");
    expect(rankingCalls[0]?.body).toMatchObject({
      metrics: ["averageLatencyMs"],
      ranking: { dimension: "modelId", metric: "averageLatencyMs" },
    });
  });
});
