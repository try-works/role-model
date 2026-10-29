import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import type { ChartSeries } from "@role-model/ui/foldkit-chart";

import type { Message } from "../../message";
import type { ReadbackState } from "../../readback";
import { telemetryChartCard } from "../overview/charts";

const page = (title: string, children: ReadonlyArray<Html>, h: HtmlBuilder<Message>): Html =>
  h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "models")], [h.h2([h.Class("rm3-next-route-title")], [title]), ...children]);

const subhead = (label: string, h: HtmlBuilder<Message>): Html =>
  h.h3([h.Class("mt-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--rm-muted)]")], [label]);

const table = (headings: ReadonlyArray<string>, rows: ReadonlyArray<ReadonlyArray<string>>, emptyText: string, h: HtmlBuilder<Message>): Html =>
  h.table([h.Class("mt-3 w-full border-collapse text-left text-[12px]")], [
    h.thead([], [h.tr([], headings.map((heading) => h.th([h.Class("border-b border-[var(--rm-border)] px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-[var(--rm-muted)]")], [heading])))]),
    h.tbody([], rows.length === 0
      ? [h.tr([], [h.td([h.Attribute("colspan", String(headings.length)), h.DataAttribute("models-state", "empty"), h.Class("px-2 py-2 text-[var(--rm-secondary)]")], [emptyText])])]
      : rows.map((cells) => h.tr([h.Class("border-b border-[var(--rm-border)]")], cells.map((cell) => h.td([h.Class("px-2 py-1 align-top")], [cell]))))),
  ]);

const emptySeries = (id: string, label: string): ReadonlyArray<ChartSeries> => [{ id, label, points: [{ label: "No data", value: null }] }];

const chart = (title: string, description: string, empty: string, h: HtmlBuilder<Message>): Html =>
  telemetryChartCard({ description, emptyMessage: empty, hasData: false, h, kind: "line", series: emptySeries(title.toLowerCase().replace(/ /g, "-"), title), state: "empty", title });

export const modelsRoute = (models: ReadbackState, endpoints: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = models.rows.map((row) => [row.label, row.value, row.id]);
  const endpointRows = endpoints.rows.map((row) => [row.id, row.label, row.value, row.meta.slice(0, 60)]);
  return page("Model inventory", [
    h.p([h.Class("mt-2 text-[12px] text-[var(--rm-secondary)]")], ["Select a model to inspect and configure. Controller is the badge — change it from the footer."]),
    table(["MODEL", "PROVIDER", "ENDPOINT IDS"], rows, "No configured models yet.", h),
    subhead("RUNTIME", h),
    table(["ENDPOINT", "MODEL", "PROVIDER", "HEALTH"], endpointRows, "No model endpoints recorded yet.", h),
    subhead("COST", h),
    h.p([h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], ["Input and output pricing are sourced from the configured model record."]),
    subhead("BENCHMARK", h),
    table(["OVERALL", "LIVE P50", "LIVE P95", "LIVE FAILURE RATE"], [], "No benchmark evidence yet.", h),
    subhead("ROLES", h),
    table(["MODEL", "ROLES", "TASK COUNTS"], rows, "No model role projections yet.", h),
    chart("Model inventory", "Configured model count by provider.", "No model inventory chart data recorded yet.", h),
  ], h);
};

export const modelsRolesRoute = (models: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = models.rows.map((row) => [row.label, row.value, row.id]);
  const field = (id: string, label: string) => h.label([h.Class("flex flex-col gap-1 text-[11px]")], [h.span([], [label]), h.input([h.Id(id), h.AriaLabel(label), h.Class("min-h-8 rounded border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2")])]);
  return page("Create role", [
    h.p([h.Class("mt-2 text-[12px] text-[var(--rm-secondary)]")], ["Add a router-visible role with identity, instructions, and policy fields."]),
    h.div([h.Class("mt-3 grid gap-2 md:grid-cols-2")], [field("role-id", "Role id"), field("role-name", "Name"), field("role-description", "Description"), field("role-instructions", "Default system instructions")]),
    h.div([h.Class("mt-3 flex gap-2")], [h.button([h.Type("button"), h.Class("min-h-8 rounded bg-[var(--rm-accent)] px-3 text-[12px]")], ["Create role"]), h.button([h.Type("button"), h.Class("min-h-8 rounded border border-[var(--rm-border)] px-3 text-[12px]")], ["Reset"]), h.button([h.Type("button"), h.Class("min-h-8 rounded border border-[var(--rm-border)] px-3 text-[12px]")], ["Advanced policy fields"])]),
    subhead("Role catalog", h),
    table(["ROLE", "PROVIDER", "MODEL ID"], rows, "No roles in the role catalog yet.", h),
    subhead("Role task allowlists", h),
    table(["ROLE", "TASKS", "TOOL POLICY"], rows, "No role task allowlists yet.", h),
    subhead("Edit selected role", h),
    table(["FIELD", "VALUE"], [["Tool policy mode", "allowed"], ["Routing policy overrides (JSON)", ""]], "No role selected for editing.", h),
    chart("Role catalog", "Configured roles by provider.", "No role catalog chart data recorded yet.", h),
  ], h);
};

export const benchmarkRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.id, row.label, row.value]);
  const select = (label: string, options: ReadonlyArray<string>) => h.label(
    [h.Class("flex flex-col gap-1 text-[11px]")],
    [
      h.span([h.Class("uppercase tracking-[0.12em] text-[var(--rm-muted)]")], [label]),
      h.select(
        [h.Class("min-h-8 rounded border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2"), h.AriaLabel(label)],
        options.map((option) => h.option([], [option])),
      ),
    ],
  );
  return page("Capability benchmark", [
    h.p([h.Class("mt-2 max-w-[85ch] text-[12px] text-[var(--rm-secondary)]")], ["Select mode and judge, then grade runnable endpoints. Judge endpoint is also a benchmark subject."]),
    subhead("Run capability benchmark", h),
    h.div([h.Class("mt-3 flex flex-wrap items-end gap-3")], [select("Benchmark mode", ["Quick (12 hard cases)"]), select("Judge endpoint", ["Deepseek Flash (High) (remote)"])]),
    h.div([h.Class("mt-3 flex gap-2")], [h.button([h.Type("button"), h.Class("min-h-8 rounded bg-[var(--rm-accent)] px-3 text-[12px]")], ["Run quick benchmark (3 models, 12 cases)"]), h.button([h.Type("button"), h.Class("min-h-8 rounded border border-[var(--rm-border)] px-3 text-[12px]")], ["Clear all benchmark data"])]),
    subhead("Benchmark scores", h),
    table(["MODEL", "SCOPE", "STATUS"], rows, "No benchmark scores are in routing profiles yet.", h),
    subhead("Taxonomy dimensions", h),
    table(["DIMENSION", "VALUE", "SCORE"], rows, "No taxonomy dimension data is available yet.", h),
    subhead("Run history", h),
    table(["RUN", "MODEL", "SCORE"], rows, "No completed benchmark runs yet.", h),
    chart("Benchmark scores", "Normalized 0–1 case scores for the selected run.", "No benchmark score chart data recorded yet.", h),
  ], h);
};
