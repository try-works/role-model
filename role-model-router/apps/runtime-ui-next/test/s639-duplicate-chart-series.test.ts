import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { emptyReadbacks } from "../src/readback";
import { view } from "../src/view";
import { shellModel } from "./support/runtime-shell";

/** S639 (task-123): two endpoints sharing a displayName must not crash the chart grid or collapse to one series. */

const rankingBody = (labels: ReadonlyArray<readonly [string, string, number]>) =>
  JSON.stringify({
    ranking: { rows: labels.map(([key, label, value]) => ({ key, label, value })) },
  });

const renderRoute = async (tag: "Requests" | "ObserveRouting", chartId: string, json: string) => {
  const base = shellModel({ route: { _tag: tag } });
  const charts = { entries: [{ id: chartId, json }], status: "ok" as const, token: 1 };
  const model = {
    ...base,
    readbacks: { ...emptyReadbacks(), ...base.readbacks },
    ...(tag === "Requests" ? { requestsCharts: charts } : { routingCharts: charts }),
  };
  const rendered = await Effect.runPromise(
    renderToString({ init: () => ({ commands: [], model }), view }, { isHydratable: false }),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S639 duplicate display names in chart series", () => {
  it("keeps both /requests ranking rows and disambiguates the shared label", async () => {
    const container = await renderRoute(
      "Requests",
      "Ranked comparison",
      rankingBody([
        ["ep-a", "Gpt 5.4", 3],
        ["ep-b", "Gpt 5.4", 2],
      ]),
    );
    const card = container.querySelector("[data-overview-card='Ranked comparison']");
    expect(card).not.toBeNull();
    const rows = card?.querySelectorAll("table[data-chart-part='table'].sr-only tbody tr") ?? [];
    expect(rows.length).toBe(2);
    const text = card?.textContent ?? "";
    expect(text).toContain("Gpt 5.4 (ep-a)");
    expect(text).toContain("Gpt 5.4 (ep-b)");
  });

  it("keeps both observe-routing ranking rows with a shared display name", async () => {
    const container = await renderRoute(
      "ObserveRouting",
      "Model selection",
      rankingBody([
        ["ep-a", "Gpt 5.4", 3],
        ["ep-b", "Gpt 5.4", 2],
      ]),
    );
    const card = container.querySelector("[data-overview-card='Model selection']");
    expect(card).not.toBeNull();
    const rows = card?.querySelectorAll("table[data-chart-part='table'].sr-only tbody tr") ?? [];
    expect(rows.length).toBe(2);
    expect(card?.textContent ?? "").toContain("Gpt 5.4 (ep-a)");
    expect(card?.textContent ?? "").toContain("Gpt 5.4 (ep-b)");
  });
});
