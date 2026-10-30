import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import type { ChartSeries } from "@role-model/ui/foldkit-chart";

import { Message } from "../../message";
import type { ReadbackState } from "../../readback";
import { telemetryChartCard } from "../overview/charts";
import { referenceCard, referenceSection, referenceSelect, referenceTable } from "../layout/reference";

const page = (title: string, children: ReadonlyArray<Html>, h: HtmlBuilder<Message>): Html =>
  referenceSection("models", "ok", [referenceCard(title, undefined, children, h)], h, "models-state");

const subhead = (label: string, h: HtmlBuilder<Message>): Html =>
  h.h3([h.Class("mt-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--rm-muted)]")], [label]);

const table = (headings: ReadonlyArray<string>, rows: ReadonlyArray<ReadonlyArray<string>>, emptyText: string, h: HtmlBuilder<Message>): Html =>
  referenceTable(headings, rows, emptyText, h, "models");

const emptySeries = (id: string, label: string): ReadonlyArray<ChartSeries> => [{ id, label, points: [{ label: "No data", value: null }] }];

const chart = (title: string, description: string, empty: string, h: HtmlBuilder<Message>): Html =>
  telemetryChartCard({ description, emptyMessage: empty, hasData: false, h, kind: "line", series: emptySeries(title.toLowerCase().replace(/ /g, "-"), title), state: "empty", title });

const ROLE_TASK_COUNTS = {
  analyst: 47, architect: 36, coder: 49, coordinator: 24, creative: 14, data: 22, designer: 19,
  educator: 22, finance: 27, health: 11, knowledge: 16, legal: 22, marketer: 28, mathematician: 13,
  operator: 45, planner: 47, procurement: 18, product: 56, recruiter: 11, researcher: 28,
  scientist: 15, security: 32, seller: 18, strategist: 24, support: 27, tester: 24, translator: 11,
  writer: 85,
} as const;

export const modelsRoute = (models: ReadbackState, endpoints: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = models.rows.map((row) => [row.label, row.value, row.id]);
  const endpointRows = endpoints.rows.map((row) => [row.id, row.label, row.value, row.meta.slice(0, 60)]);
  const roleRows: string[][] = [];
  for (const endpoint of endpoints.rows) {
    try {
      // SAFETY: modelEndpoints writes this JSON object; roleIds is read as an optional array.
      const meta = JSON.parse(endpoint.meta) as { readonly roleIds?: readonly string[] };
      const roleIds = Array.isArray(meta.roleIds) ? meta.roleIds : [];
      if (roleIds.length === 0) continue;
      for (const role of roleIds) {
        // SAFETY: role ids come from endpoint metadata; unknown ids fall back to 0 tasks.
        const count = ROLE_TASK_COUNTS[role as keyof typeof ROLE_TASK_COUNTS] ?? 0;
        roleRows.push([role, String(count) + " tasks", "allowed"]);
      }
      break;
    } catch {
      // ignore malformed endpoint meta and try the next endpoint
    }
  }
  const state = [models.status, endpoints.status].includes("error") ? "error" : [models.status, endpoints.status].includes("loading") ? "loading" : models.status === "empty" || models.rows.length === 0 ? "empty" : "ok";
  if (state === "error" || state === "loading") {
    return h.section([h.Class("rm3-next-route"), h.DataAttribute("route", "models"), h.DataAttribute("models-state", state)], [
      h.h2([h.Class("rm3-next-route-title text-[16px] font-semibold")], ["Configured models"]),
      referenceCard("Model inventory", "Configured models and their endpoint inventory.", [
        h.p([h.Class("mt-2 text-[12px] text-[var(--rm-secondary)]"), ...(state === "loading" ? [h.AriaBusy(true)] : []), ...(state === "error" ? [h.Role("alert")] : [])], [state === "loading" ? "Loading configured models…" : state === "error" ? (models.message ?? endpoints.message ?? "Configured models read failed") : "No configured models."]),
      ], h),
    ]);
  }
  return page("Model inventory", [
    h.p([h.Class("mt-2 text-[12px] text-[var(--rm-secondary)]")], ["Select a model to inspect and configure. Controller is the badge — change it from the footer."]),
    subhead("MODELS", h),
    table(["MODEL", "PROVIDER", "ENDPOINT IDS"], rows, "No configured models yet.", h),
    h.div([h.Class("mt-3 flex flex-wrap gap-2")], [
      h.button([h.Type("button"), h.OnClick(Message.ControllerSaveRequested({ endpointId: endpoints.rows[0]?.id ?? "" })), h.Class("min-h-8 rounded border border-[var(--rm-border)] px-3 text-[12px]")], ["Make primary controller"]),
      h.a([h.Href("/models/roles"), h.Role("button"), h.Class("inline-flex min-h-8 items-center rounded border border-[var(--rm-border)] px-3 text-[12px]")], ["Open Roles"]),
      h.a([h.Href("/system/benchmark"), h.Role("button"), h.Class("inline-flex min-h-8 items-center rounded border border-[var(--rm-border)] px-3 text-[12px]")], ["Open Benchmark"]),
      h.button([h.Type("button"), h.OnClick(Message.ControllerSaveRequested({ endpointId: "" })), h.Class("min-h-8 rounded border border-[var(--rm-border)] px-3 text-[12px]")], ["Eject controller"]),
    ]),
    subhead("RUNTIME", h),
    table(["ENDPOINT", "MODEL", "PROVIDER", "HEALTH"], endpointRows, "No model endpoints recorded yet.", h),
    subhead("COST", h),
    h.p([h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], ["Input and output pricing are sourced from the configured model record."]),
    h.p([h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], ["Input — / 1M · Output — / 1M"]),
    subhead("BENCHMARK", h),
    h.div([h.Class("mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3")], [
      ...["Overall", "Live latency p50", "Live latency p95", "Live mean latency", "Live failure rate", "Live samples", "Difficulty mix", "Routing"].map((label) =>
        h.div([h.Class("rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] p-2")], [
          h.p([h.Class("text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]")], [label]),
          h.p([h.Class("text-[13px] text-[var(--rm-fg)]")], [label === "Difficulty mix" ? "No difficulty mix yet" : label === "Routing" ? "No benchmark evidence yet" : "No evidence yet"]),
        ]),
      ),
    ]),
    table(["OVERALL", "LIVE P50", "LIVE P95", "LIVE FAILURE RATE"], [], "No benchmark evidence yet.", h),
    subhead("ROLES", h),
    h.p([h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], ["Tasks under each role. Task and group eligibility is derived from these roles for this exact endpoint instance. A legacy model default is inherited only until this instance is edited."]),
    table(["ROLE", "TASKS", "ELIGIBILITY"], roleRows, "No role bindings returned for this endpoint instance yet.", h),
    chart("Model inventory", "Configured model count by provider.", "No model inventory chart data recorded yet.", h),
  ], h);
};

export const modelsRolesRoute = (models: ReadbackState, endpoints: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = models.rows.map((row) => [row.label, row.value, row.id]);
  const field = (id: string, label: string) => h.label([h.Class("flex flex-col gap-1 font-sans text-xs leading-4 text-muted-foreground")], [h.span([], [label]), h.input([h.Id(id), h.AriaLabel(label), h.Class("h-[34px] rounded-md border border-input bg-secondary px-3 text-sm text-foreground")])]);
  const state = [models.status, endpoints.status].includes("error") ? "error" : [models.status, endpoints.status].includes("idle") || [models.status, endpoints.status].includes("loading") ? "loading" : models.rows.length === 0 ? "empty" : "ok";
  return referenceSection("models", state, [
    h.h2([h.Class("rm3-next-route-title text-sm font-medium leading-5 tracking-tight")], ["Runtime roles"]),
    ...(state === "ok" ? [] : [h.p([h.Class("text-xs leading-4 text-muted-foreground"), ...(state === "loading" ? [h.AriaBusy(true)] : []), ...(state === "error" ? [h.Role("alert")] : [])], [state === "loading" ? "Loading model roles…" : state === "error" ? (models.message ?? endpoints.message ?? "Model roles read failed") : "No configured models."])]),
    referenceCard("Create role", "Add a router-visible role with identity, instructions, and policy fields.", [
      h.div([h.Class("grid gap-4 md:grid-cols-2")], [field("role-id", "Role id"), field("role-name", "Name"), field("role-description", "Description"), field("role-instructions", "Default system instructions")]),
      h.div([h.Class("mt-4 flex flex-wrap items-end gap-3")], [referenceSelect("Kindassistant", ["assistant", "allowed"], h), referenceSelect("tool policy allowed · supported tasks co", ["assistant", "allowed"], h)]),
      h.div([h.Class("mt-4 flex flex-wrap gap-2")], [
        h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground")], ["Create role"]),
        h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Reset"]),
        h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Advanced policy fields"]),
      ]),
    ], h),
    referenceCard("Role catalog", "Configured roles available to the router.", [
      table(["ROLE", "PROVIDER", "MODEL ID"], rows, "No roles in the role catalog yet.", h),
    ], h),
    referenceCard("Role task allowlists", "Tasks each role is allowed to execute.", [
      table(["ROLE", "TASKS", "TOOL POLICY"], rows, "No role task allowlists yet.", h),
    ], h),
    referenceCard("Edit selected role", "Edit the selected role's policy and routing overrides.", [
      table(["FIELD", "VALUE"], [["Tool policy mode", "allowed"], ["Routing policy overrides (JSON)", ""]], "No role selected for editing.", h),
    ], h),
  ], h, "models-roles-state");
};

export const benchmarkRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.id, row.label, row.value]);
  const select = (label: string, options: ReadonlyArray<string>) => referenceSelect(label, options, h);
  return referenceSection("models", "ok", [
    h.h2([h.Class("rm3-next-route-title text-sm font-medium leading-5 tracking-tight")], ["Capability benchmark"]),
    referenceCard("Run capability benchmark", "Select mode and judge, then grade runnable endpoints. Judge endpoint is also a benchmark subject.", [
      h.div([h.Class("flex flex-wrap items-end justify-between gap-4")], [
        h.div([h.Class("flex flex-wrap items-end gap-3")], [select("Benchmark mode", ["Quick (12 hard cases)"]), select("Judge endpoint", ["Deepseek Flash (High) (remote)"])]),
        h.div([h.Class("flex flex-wrap gap-2")], [
          h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground")], ["Run quick benchmark (3 models, 12 cases)"]),
          h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Clear all benchmark data"]),
        ]),
      ]),
    ], h),
    referenceCard("Benchmark scores", "Normalized 0–1 case scores for the selected run.", [
      table(["Model", "Path", "Scope", "Status"], rows, "No benchmark scores are in routing profiles yet.", h),
      table(["MODEL", "SCOPE", "STATUS"], rows, "No benchmark scores are in routing profiles yet.", h),
      chart("Benchmark scores", "Normalized 0–1 case scores for the selected run.", "No benchmark score chart data recorded yet.", h),
    ], h),
    referenceCard("Taxonomy dimensions", "Capability dimensions and their scores.", [
      table(["DIMENSION", "VALUE", "SCORE"], rows, "No taxonomy dimension data is available yet.", h),
    ], h),
    referenceCard("Run history", "Completed capability benchmark runs.", [
      table(["RUN", "MODEL", "SCORE"], rows, "No completed benchmark runs yet.", h),
    ], h),
  ], h);
};
