import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import type { ChartSeries } from "@role-model/ui/foldkit-chart";

import type { Message } from "../../message";
import type { ReadbackState } from "../../readback";
import type { LearningRankingState } from "../learning-ranking/model";
import { telemetryChartCard } from "../overview/charts";

const page = (title: string, children: ReadonlyArray<Html>, h: HtmlBuilder<Message>): Html =>
  h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "learning")], [h.h2([h.Class("rm3-next-route-title")], [title]), ...children]);

const subhead = (label: string, h: HtmlBuilder<Message>): Html =>
  h.h3([h.Class("mt-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--rm-muted)]")], [label]);

const table = (headings: ReadonlyArray<string>, rows: ReadonlyArray<ReadonlyArray<string>>, emptyText: string, h: HtmlBuilder<Message>): Html =>
  h.table([h.Class("mt-3 w-full border-collapse text-left text-[12px]")], [
    h.thead([], [h.tr([], headings.map((heading) => h.th([h.Class("border-b border-[var(--rm-border)] px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-[var(--rm-muted)]")], [heading])))]),
    h.tbody([], rows.length === 0
      ? [h.tr([], [h.td([h.Attribute("colspan", String(headings.length)), h.DataAttribute("learning-state", "empty"), h.Class("px-2 py-2 text-[var(--rm-secondary)]")], [emptyText])])]
      : rows.map((cells) => h.tr([h.Class("border-b border-[var(--rm-border)]")], cells.map((cell) => h.td([h.Class("px-2 py-1 align-top")], [cell]))))),
  ]);

const emptySeries = (id: string, label: string): ReadonlyArray<ChartSeries> => [{ id, label, points: [{ label: "No data", value: null }] }];

const chart = (title: string, description: string, emptyMessage: string, h: HtmlBuilder<Message>): Html =>
  telemetryChartCard({ description, emptyMessage, hasData: false, h, kind: "line", series: emptySeries(title.toLowerCase().replace(/ /g, "-"), title), state: "empty", title });

const select = (label: string, options: ReadonlyArray<string>, h: HtmlBuilder<Message>): Html =>
  h.label([h.Class("flex flex-col gap-1 text-[11px]")], [
    h.span([h.Class("uppercase tracking-[0.12em] text-[var(--rm-muted)]")], [label]),
    h.select([h.Class("min-h-8 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2"), h.AriaLabel(label)], options.map((option) => h.option([], [option]))),
  ]);

export const learningOverviewRoute = (readback: ReadbackState, ranking: LearningRankingState | undefined, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta.slice(0, 80)]);
  return page("Learning overview", [
    h.p([h.Class("mt-2 max-w-[80ch] text-[12px] text-[var(--rm-secondary)]")], ["What the learning loop is doing right now, read from durable state."]),
    h.div([h.Class("mt-3 flex flex-wrap items-center gap-3")], [
      h.input([h.Id("learning-operator-token"), h.Type("password"), h.AriaLabel("Operator token"), h.Class("min-h-8 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2 text-[12px]")]),
      h.span([h.Class("text-[12px]")], [String(ranking?.phases === undefined ? 0 : Object.keys(ranking.phases).length) + " tracked ladder phase(s)"]),
    ]),
    subhead("Live replay & evaluation", h),
    h.p([h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], ["scope not set · last 60m · reading"]),
    chart("Learning activity", "Replay, evaluation and learning volume for the selected window.", "No learning activity recorded yet.", h),
    subhead("Recent decisions", h),
    table(["LADDER", "STATE", "SCOPE"], rows, "Loading learning state…", h),
  ], h);
};

export const learningConfigurationRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta.slice(0, 120)]);
  return page("Learning configuration", [
    h.p([h.Class("mt-2 max-w-[80ch] text-[12px] text-[var(--rm-secondary)]")], ["Every activation parameter with its current value, unit, default and allowed range. Bounds are enforced here and again on the server."]),
    h.div([h.Class("mt-3 flex flex-wrap gap-3")], [
      h.label([h.Class("flex flex-col gap-1 text-[11px]")], [h.span([], ["Operator token"]), h.input([h.Id("learning-config-token"), h.Type("password"), h.AriaLabel("Operator token"), h.Class("min-h-8 rounded border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2")])]),
      h.label([h.Class("flex flex-col gap-1 text-[11px]")], [h.span([], ["Operator identity"]), h.input([h.Id("learning-operator-identity"), h.AriaLabel("Operator identity"), h.Class("min-h-8 rounded border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2")])]),
    ]),
    table(["PARAMETER", "CURRENT VALUE / RANGE", "DETAIL"], rows, "Loading learning configuration…", h),
    chart("Activation parameters", "Current activation parameter values.", "No activation parameter data recorded yet.", h),
  ], h);
};

export const learningDecisionsRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta.includes("shadow") ? "shadow" : row.meta.includes("live") ? "live" : "", row.meta.slice(0, 80)]);
  return page("Decision receipts", [
    h.p([h.Class("mt-2 max-w-[85ch] text-[12px] text-[var(--rm-secondary)]")], ["Every adjudicated decision with its evidence in columns, and the receipt chain each one produced."]),
    h.div([h.Class("mt-3 flex flex-wrap gap-3")], [
      select("Role", ["all roles"], h),
      select("Task", ["all tasks"], h),
      select("Outcome", ["all outcomes"], h),
      select("Advisory state", ["all", "fresh", "stale", "unavailable"], h),
      select("Observation origin", ["live", "shadow", "all"], h),
    ]),
    table(["DECISION", "OUTCOME", "ORIGIN", "EVIDENCE"], rows, "Loading decision receipts…", h),
    chart("Decision volume", "Adjudicated decisions by time bucket.", "No decision receipts recorded yet.", h),
  ], h);
};

export const learningEvidenceRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta.slice(0, 100)]);
  return page("Cohort evidence", [
    h.p([h.Class("mt-2 max-w-[85ch] text-[12px] text-[var(--rm-secondary)]")], ["Baseline-versus-advisory comparison on the paired holdout distribution with the guardrail verdicts."]),
    subhead("Evidence", h),
    table(["METRIC", "OBSERVED", "GUARDRAIL VERDICT"], rows, "Loading cohort evidence…", h),
    subhead("Evidence loss by reason", h),
    table(["REASON", "COUNT", "DETAIL"], rows, "No evidence-loss rows recorded yet.", h),
    chart("Cohort evidence", "Paired holdout quality and cost evidence.", "No cohort evidence recorded yet.", h),
  ], h);
};

export const learningHistoryRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta.slice(0, 100)]);
  return page("Learning history", [
    h.p([h.Class("mt-2 max-w-[80ch] text-[12px] text-[var(--rm-secondary)]")], ["What the replay, evaluation and learning loop did over the window, read from durable state."]),
    table(["BUCKET", "VALUE", "DETAIL"], rows, "Loading learning history…", h),
    chart("Learning history", "Replay, evaluation and learning volume over the window.", "No learning-history rows recorded yet.", h),
  ], h);
};

export const learningPacksRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta.slice(0, 100)]);
  return page("Learned packs", [
    h.p([h.Class("mt-2 max-w-[85ch] text-[12px] text-[var(--rm-secondary)]")], ["Candidate and pack records with their validation receipts, holdout evidence and activation state."]),
    h.div([h.Class("mt-3 flex gap-2")], [
      h.button([h.Type("button"), h.Class("min-h-8 rounded border border-[var(--rm-border)] px-3 text-[12px]")], ["Roll back active pack (scope-wide)"]),
      h.button([h.Type("button"), h.Class("min-h-8 rounded border border-[var(--rm-border)] px-3 text-[12px]")], ["Engage kill switch"]),
      h.button([h.Type("button"), h.Class("min-h-8 rounded border border-[var(--rm-border)] px-3 text-[12px]")], ["Release kill switch"]),
    ]),
    subhead("ENDPOINT LADDER INDEX", h),
    table(["ROLE · TASK", "TOP ENDPOINTS", "ACTIVATION"], rows, "No endpoint ladder rows reported.", h),
    subhead("TASK-SCOPED LEARNED PACKS", h),
    table(["PACK", "VALIDATION", "STATE"], rows, "No task-scoped pack records returned by the operator readback.", h),
    chart("Pack activation", "Learned-pack activation and rollback volume.", "No learned-pack activity recorded yet.", h),
  ], h);
};
