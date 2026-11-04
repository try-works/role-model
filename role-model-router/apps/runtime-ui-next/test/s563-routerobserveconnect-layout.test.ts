import { Effect } from "effect";
import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { describe, expect, it } from "vitest";

import { shellModel } from "./support/runtime-shell";
import { view } from "../src/view";
import type { Model } from "../src/model";
import type { AppRoute } from "../src/route";

/**
 * S563: structural layout gate for the Router / Observe / Connect pages. It renders each assigned
 * route with representative readbacks and asserts the reference section order, table columns,
 * filter/control names, card shell and header rule. It is intentionally a structure test, not a
 * pixel-diff: the visual acceptance is the separate live route comparison.
 */
const readback = (rows: readonly { id: string; label: string; value: string; meta: string }[]) =>
  ({ rows, status: "ok" as const, token: 1 });

const routerConfigRows = [
  { id: "strategy", label: "Routing strategy", value: "hybrid", meta: "persisted" },
  { id: "executionMode", label: "Execution mode", value: "decision_only", meta: "persisted" },
  { id: "routing.mode", label: "Routing posture: mode", value: "hybrid", meta: "routing" },
  { id: "workload.batch", label: "Workload: batch", value: "baseline / cost", meta: "posture" },
  { id: "agentStrategy.coder", label: "Agent strategy: coder", value: "difficulty / difficulty", meta: "posture" },
  { id: "diagnostics.summary", label: "Diagnostics", value: "ok", meta: "diagnostics" },
];

const readbacks = {
  router: readback([{ id: "endpoints", label: "endpoints", value: "12", meta: "summary" }]),
  routerConfig: readback(routerConfigRows),
  routerCandidates: readback([{ id: "cand-1", label: "gpt-6.1-sol", value: "0.82", meta: JSON.stringify({ endpointId: "openai.personal.global.gpt-6.1-sol", healthStatus: "healthy" }) }]),
  routerDecisions: readback([{ id: "req-1", label: "gpt-6.1-sol", value: "0.9", meta: "openai.personal.global.gpt-6.1-sol" }]),
  observeActivity: readback([{ id: "req-1", label: "gpt-6.1-sol", value: "200", meta: JSON.stringify({ atMs: 1700000000000, duration_ms: 42, model_id: "gpt-6.1-sol", request_operation: "chat.completions", status: 200 }) }]),
  observeLogs: readback([{ id: "log-1", label: "line", value: "2026-10-30T00:00:00Z INFO boot ok", meta: "" }]),
  observeRouting: readback([{ id: "route-1", label: "gpt-6.1-sol", value: "4", meta: "openai.personal.global.gpt-6.1-sol" }]),
  storeReceipts: readback([
    { id: "store:1", label: "store", value: "2026-10-30T00:00:00Z", meta: "ladder write refused" },
    { id: "worker:1", label: "worker", value: "2026-10-30T00:01:00Z", meta: "floor write refused" },
  ]),
  queues: readback([{ id: "replay", label: "replay", value: "2", meta: "effect" }]),
  downstreamOpenAI: readback([{ id: "base-url", label: "Base URL", value: "http://127.0.0.1:3458/v1", meta: "contract" }]),
  integrationProviders: readback([{ id: "openai", label: "openai", value: "configured", meta: "provider account" }]),
  modelEndpoints: readback([{ id: "endpoint-1", label: "openai", value: "active", meta: "healthy" }]),
};

type Overrides = { readonly readbacks?: Partial<Model["readbacks"]> };
const render = async (tag: AppRoute["_tag"], overrides: Overrides = {}): Promise<HTMLElement> => {
  const base = shellModel();
  const model = shellModel({
    // SAFETY: the test supplies one of the exact AppRoute tags.
    route: { _tag: tag } as AppRoute,
    readbacks: { ...base.readbacks, ...readbacks, ...(overrides.readbacks ?? {}) },
  });
  const rendered = await Effect.runPromise(renderToString({ init: () => ({ model, commands: [] }), view }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const textOf = (container: HTMLElement) => container.textContent ?? "";

const expectOrdered = (text: string, titles: readonly string[]) => {
  let cursor = -1;
  for (const title of titles) {
    const at = text.indexOf(title);
    expect(at, "missing title: " + title).toBeGreaterThanOrEqual(0);
    expect(at, "out-of-order title: " + title).toBeGreaterThan(cursor);
    cursor = at;
  }
};

const expectCardShell = (container: HTMLElement) => {
  const cards = [...container.querySelectorAll("[data-s563-card]")];
  expect(cards.length).toBeGreaterThanOrEqual(1);
  const shell = cards[0] as HTMLElement;
  expect(shell.className).toContain("rounded-lg");
  expect(shell.className).toContain("border-border");
  expect(shell.className).toContain("bg-card");
  const header = shell.firstElementChild as HTMLElement | null;
  expect(header?.className).toContain("-mx-4");
  expect(header?.className).toContain("border-b");
  expect(header?.className).toContain("px-4");
};

const expectTables = (container: HTMLElement, headers: readonly string[]) => {
  const tables = [...container.querySelectorAll("table")];
  expect(tables.length).toBeGreaterThanOrEqual(1);
  for (const table of tables) {
    expect(table.querySelector("thead")).not.toBeNull();
    expect(table.querySelector("tbody")).not.toBeNull();
  }
  const text = textOf(container);
  for (const header of headers) expect(text).toContain(header);
};

const expectFilters = (container: HTMLElement) => {
  const bar = container.querySelector("[data-s563-filters]") as HTMLElement | null;
  expect(bar).not.toBeNull();
  expect(bar?.className).toContain("flex");
  expect(bar?.className).toContain("items-end");
  expect(bar?.className).toContain("justify-between");
  const label = bar?.querySelector("span");
  expect(label?.className).toContain("font-sans");
  expect(label?.className).toContain("text-xs");
  expect(label?.className).toContain("text-muted-foreground");
  const select = bar?.querySelector("select");
  expect(select?.className).toContain("h-[34px]");
  expect(select?.className).toContain("border-input");
  expect(select?.className).toContain("bg-secondary");
};

describe("S563 Router + Observe + Connect reference layout", () => {
  it("router overview: alias inventory then routing candidates, reference tables", async () => {
    const container = await render("Router");
    const text = textOf(container);
    expectOrdered(text, ["Routing overview", "Alias inventory", "Routing candidates"]);
    expectTables(container, ["Alias", "Mode", "Effective models", "Candidate expansion", "Readiness", "Model", "Endpoint", "Source", "Health", "Routing"]);
    expectCardShell(container);
  });

  it("router candidates: candidate inventory columns", async () => {
    const container = await render("RouterCandidates");
    const text = textOf(container);
    expectOrdered(text, ["Candidate inventory"]);
    expect((text.match(/Candidate inventory/g) ?? []).length).toBeGreaterThanOrEqual(2);
    for (const label of ["ENDPOINT", "CAP", "EFFORT", "LIVE P50", "LIVE FAIL", "LIVE SAMPLES", "ROLES", "TOOLING"]) expect(text).toContain(label);
    expectCardShell(container);
  });

  it("router decisions: decision ledger columns and drill-in links", async () => {
    const container = await render("RouterDecisions");
    const text = textOf(container);
    expectOrdered(text, ["Routing decisions", "Decision ledger"]);
    for (const label of ["MODEL", "ENDPOINT", "EFFORT", "STRATEGY", "SOURCE", "DECIDED", "Router · Open detail", "Observe · Open detail"]) expect(text).toContain(label);
    expectCardShell(container);
  });

  it("router strategy/config: strategy card, controls, measured-latency override", async () => {
    for (const tag of ["RouterStrategy", "RouterConfig"] as const) {
      const container = await render(tag);
      const text = textOf(container);
      expectOrdered(text, ["Routing strategy", "Measured-latency override", "Saved posture"]);
      for (const control of ["Routing mode", "Scoring strategy", "Execution scope", "Measured-latency override"]) expect(text).toContain(control);
      expectCardShell(container);
    }
  });

  it("router workloads: posture sections and workload templates", async () => {
    const container = await render("RouterWorkloads");
    const text = textOf(container);
    expectOrdered(text, ["Workloads", "Posture diagnostics", "Workload templates", "Entries"]);
    for (const control of ["Use batch template", "Use embedding template", "Add workload", "Save Workloads"]) expect(text).toContain(control);
    expectCardShell(container);
  });

  it("router agent strategy: role editor and entries", async () => {
    const container = await render("RouterAgentStrategy");
    const text = textOf(container);
    expectOrdered(text, ["Agent strategy", "Posture diagnostics", "Entries", "Entries editor"]);
    for (const control of ["Name", "Role (required)", "Add entry", "Save Agent strategy"]) expect(text).toContain(control);
    expectCardShell(container);
  });

  it("observe activity: metric strip, ledger table, capture inspector", async () => {
    const container = await render("ObserveActivity");
    const text = textOf(container);
    expectOrdered(text, ["Host activity and metrics", "Recent host activity", "Capture inspector"]);
    for (const label of ["ENTRIES", "ERRORS", "PROMPT TOKENS", "COMPLETION TOKENS"]) expect(text).toContain(label);
    expectCardShell(container);
  });

  it("observe logs: metric strip, source filter, structured table, raw lines", async () => {
    const container = await render("ObserveLogs");
    const text = textOf(container);
    expectOrdered(text, ["Host logs", "Structured log rows", "Raw lines"]);
    for (const label of ["STRUCTURED ROWS", "SOURCES", "CORRELATED REQUESTS", "All sources"]) expect(text).toContain(label);
    expectTables(container, ["Time", "Source", "Level", "Message", "Request"]);
    expectCardShell(container);
    const sourceFilter = container.querySelector("[data-s563-segmented]") as HTMLElement | null;
    expect(sourceFilter).not.toBeNull();
    expect(sourceFilter?.getAttribute("aria-label")).toBe("Log source filter");
  });

  it("observe routing: filter bar and chart grid only, with no visible table", async () => {
    const container = await render("ObserveRouting");
    const text = textOf(container);
    expectOrdered(text, ["Routing analytics", "Routing decision volume"]);
    expect(container.querySelectorAll("select").length).toBeGreaterThanOrEqual(1);
    expect(container.querySelectorAll("table:not(.sr-only)")).toHaveLength(0);
    expect(container.querySelectorAll("table[data-chart-part='table'].sr-only")).toHaveLength(9);
    expect(container.querySelector(".md\\:grid-cols-2")).not.toBeNull();
    expect(container.querySelectorAll("[data-overview-card]")).toHaveLength(9);
  });

  it("observability snapshot: card, refresh and metric registry table", async () => {
    const container = await render("Observability");
    const text = textOf(container);
    expectOrdered(text, ["Observability snapshot"]);
    expect(text).toContain("metric row(s) in the registry");
    expect(text).toContain("Refresh");
    expectCardShell(container);
  });

  it("queues: filter bar, queue depth and job detail tables", async () => {
    const container = await render("Queues");
    const text = textOf(container);
    expectOrdered(text, ["Queues"]);
    expectTables(container, ["Queue", "Mode", "Waiting", "Active", "Delayed", "Failed", "Stalled", "Oldest waiting", "p50", "p95", "Last error", "Drain"]);
  });

  it("store degradation receipts: main card plus per-store tables", async () => {
    const container = await render("StoreReceipts");
    const text = textOf(container);
    expectOrdered(text, ["Store degradation receipts"]);
    expect(text).toContain("receipt row(s) across both stores");
    expect(text).toContain("Refresh");
    expectCardShell(container);
  });

  it("providers: reference sections and provider controls", async () => {
    const container = await render("Providers");
    const text = textOf(container);
    expectOrdered(text, ["Remote providers", "Choose provider and models", "Configured provider connections"]);
    for (const control of ["Provider", "Connection method", "Model"]) expect(text).toContain(control);
    expectCardShell(container);
  });

  it("endpoints: runtime connections table with reference columns", async () => {
    const container = await render("Endpoints");
    const text = textOf(container);
    expectOrdered(text, ["Available models & endpoints", "Runtime connections"]);
    expectTables(container, ["Provider", "Connection", "Model", "Endpoint", "Effort", "Source", "Health", "Readiness"]);
    expectCardShell(container);
  });

  it("integrations downstream: connection contract and consumer setup", async () => {
    const container = await render("IntegrationsDownstream");
    const text = textOf(container);
    expectOrdered(text, ["Connection contract", "Consumer setup"]);
    for (const label of ["Provider type", "Base URL (standard)", "Models endpoint", "Setup steps", "Available models", "Example commands"]) expect(text).toContain(label);
    expectCardShell(container);
  });

  it("integrations upstream: accounts, boundary guidance and target inventory", async () => {
    const container = await render("IntegrationsUpstream");
    const text = textOf(container);
    expectOrdered(text, ["Provider accounts in scope", "Boundary guidance", "Upstream target inventory"]);
    for (const label of ["Raw passthrough only", "Live inventory", "Runtime boundary"]) expect(text).toContain(label);
    expectCardShell(container);
  });
});
