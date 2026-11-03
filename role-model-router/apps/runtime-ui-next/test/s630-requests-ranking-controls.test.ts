import { describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";
import { scanRouteTag } from "./support/handler-presence";

/**
 * S630 (task-108): the Requests ranking metric/target selectors are rendered as real <select> controls with
 * parent dispatch wiring, so the handler-presence scanner can see them and the selection drives the real
 * ranking readback query on the route.
 */

const waitFor = async <T>(read: () => T | undefined, label: string): Promise<T> => {
  const end = Date.now() + 10000;
  while (Date.now() < end) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out waiting for " + label);
};

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

const mountRequests = (onRanking: (body: unknown) => void) => {
  window.history.replaceState({}, "", "/requests");
  const container = document.createElement("div");
  container.id = "s630-requests";
  document.body.append(container);
  return mountShell(container, {
    readbackFetchImpl: async () => json({ items: [], rows: [], requests: [], window: { startAtMs: 0, endAtMs: 0 } }),
    requestsRankingFetchImpl: async (_input, init) => {
      onRanking(JSON.parse(String(init?.body)));
      return json({ ranking: { rows: [] } });
    },
  });
};

describe("S630 Requests ranking controls", () => {
  it("is scanned by handler-presence with no error and zero unwired controls", () => {
    const scan = scanRouteTag("Requests");
    expect(scan.error).toBeUndefined();
    expect(scan.unwired).toEqual([]);
    const selects = scan.wired.filter((element) => element.tag === "select");
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it("drives the ranking readback query from real select changes on the route", async () => {
    const bodies: unknown[] = [];
    const handle = mountRequests((body) => bodies.push(body));
    try {
      const metric = await waitFor(
        () => (document.querySelector("[data-requests-ranking-metric]") as HTMLSelectElement | null) ?? undefined,
        "metric select",
      );
      metric.value = "totalTokens";
      metric.dispatchEvent(new Event("input", { bubbles: true }));
      metric.dispatchEvent(new Event("change", { bubbles: true }));
      const first = await waitFor(() => bodies[0], "metric ranking query") as { readonly metrics?: readonly string[]; readonly ranking?: { readonly metric?: string; readonly dimension?: string } };
      expect(first.metrics).toEqual(["totalTokens"]);
      expect(first.ranking?.metric).toBe("totalTokens");

      const target = await waitFor(
        () => (document.querySelector("[data-requests-ranking-target]") as HTMLSelectElement | null) ?? undefined,
        "target select",
      );
      target.value = "modelId";
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      const second = await waitFor(() => bodies[1], "target ranking query") as { readonly ranking?: { readonly metric?: string; readonly dimension?: string } };
      expect(second.ranking?.dimension).toBe("modelId");
      expect(second.ranking?.metric).toBe("totalTokens");
    } finally {
      handle.dispose();
      document.getElementById("s630-requests")?.remove();
    }
  });
});
