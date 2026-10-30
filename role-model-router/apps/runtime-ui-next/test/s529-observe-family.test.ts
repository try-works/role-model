import { Effect } from "effect";

import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { describe, expect, it } from "vitest";

import { shellModel } from "./support/runtime-shell";
import { view } from "../src/view";

const renderContainer = async (tag: string): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(renderToString({
    // SAFETY: each test passes one of the six literal route tags exercised below.
    init: () => ({ model: shellModel({ route: { _tag: tag } as never }), commands: [] }),
    view,
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const render = async (tag: string): Promise<string> => (await renderContainer(tag)).textContent ?? "";

const structuralEnvelope = async (tag: string): Promise<HTMLElement> => {
  const container = await renderContainer(tag);
  expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(1);
  expect(container.querySelectorAll("table").length).toBeGreaterThanOrEqual(1);
  return container;
};

describe("S529 observe family structural parity", () => {
  it("requests renders the telemetry ledger and filter envelope", async () => {
    await structuralEnvelope("Requests");
    const text = await render("Requests");
    for (const label of ["Telemetry request ledger", "Recent telemetry requests", "Explainable request ledger with endpoint, model, status, and direct Observe/Router drill-in.", "Time range", "Breakdown", "Source", "Ranking metric", "Ranking target", "Advanced controls", "Expand"]) expect(text).toContain(label);
  });
  it("activity renders metrics, ledger and capture inspector", async () => {
    const text = await render("ObserveActivity");
    for (const label of ["Host activity and metrics", "ENTRIES", "ERRORS", "PROMPT TOKENS", "COMPLETION TOKENS", "Recent host activity", "Capture inspector", "Choose a ledger row with a capture to inspect."]) expect(text).toContain(label);
  });
  it("logs renders structured rows and raw lines", async () => {
    await structuralEnvelope("ObserveLogs");
    const text = await render("ObserveLogs");
    for (const label of ["Host logs", "STRUCTURED ROWS", "SOURCES", "CORRELATED REQUESTS", "Structured log rows", "Raw lines", "All sources"]) expect(text).toContain(label);
  });
  it("routing renders analytics filters", async () => {
    await structuralEnvelope("ObserveRouting");
    const text = await render("ObserveRouting");
    for (const label of ["Routing analytics", "Time range", "Breakdown", "Source", "Difficulty", "Advanced controls", "Expand"]) expect(text).toContain(label);
  });
  it("observability snapshot renders explanation, registry and Refresh", async () => {
    const text = await render("Observability");
    for (const label of ["Observability snapshot", "What this runtime has measured: routing decisions served, captures admitted for replay, evaluation finalise refusals, and learner candidates examined.", "metric row(s) in the registry", "Refresh"]) expect(text).toContain(label);
  });
  it("store receipts renders dual-store ledger", async () => {
    const text = await render("StoreReceipts");
    for (const label of ["Store degradation receipts", "Materialization failures (R3 ladder writes, R6b development floors) are never silent", "receipt row(s) across both stores", "Refresh"]) expect(text).toContain(label);
  });
});
