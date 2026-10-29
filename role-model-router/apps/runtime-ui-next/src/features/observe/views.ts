import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { Message } from "../../message";
import type { Model } from "../../model";
import type { ObservabilityState } from "../../observability";
import type { ReadbackState } from "../../readback";
import { REQUESTS_RANKING_METRIC_OPTIONS, REQUESTS_RANKING_TARGET_OPTIONS, type RequestsRankingState } from "../requests-ranking/model";
import { renderRequestsRanking } from "../requests-ranking/view";
import { telemetryChartCard } from "../overview/charts";
import type { ChartSeries } from "@role-model/ui/foldkit-chart";

const page = (title: string, children: ReadonlyArray<Html>, h: HtmlBuilder<Message>): Html =>
  h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "observe")], [
    h.h2([h.Class("rm3-next-route-title")], [title]),
    ...children,
  ]);

const subhead = (label: string, h: HtmlBuilder<Message>): Html =>
  h.h3([h.Class("mt-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--rm-muted)]")], [label]);

const empty = (label: string, h: HtmlBuilder<Message>): Html =>
  h.p([h.DataAttribute("observe-state", "empty"), h.Role("status")], [label]);

const table = (
  headings: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<string>>,
  emptyText: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.table([h.Class("mt-3 w-full border-collapse text-left text-[12px]")], [
    h.thead([], [h.tr([], headings.map((heading) => h.th([h.Class("border-b border-[var(--rm-border)] px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-[var(--rm-muted)]")], [heading])))]),
    h.tbody([], rows.length === 0
      ? [h.tr([], [h.td([h.Attribute("colspan", String(headings.length)), h.DataAttribute("observe-state", "empty"), h.Class("px-2 py-2 text-[var(--rm-secondary)]")], [emptyText])])]
      : rows.map((cells) => h.tr([h.Class("border-b border-[var(--rm-border)]")], cells.map((cell) => h.td([h.Class("px-2 py-1 align-top")], [cell]))))),
  ]);

const emptySeries = (id: string, label: string): ReadonlyArray<ChartSeries> => [
  { id, label, points: [{ label: "No data", value: null }] },
];

const observeChart = (
  title: string,
  description: string,
  series: ReadonlyArray<ChartSeries>,
  emptyMessage: string,
  h: HtmlBuilder<Message>,
): Html =>
  telemetryChartCard({
    description,
    emptyMessage,
    hasData: false,
    h,
    kind: "line",
    series,
    state: "empty",
    title,
  });

const filterGroups = (h: HtmlBuilder<Message>): Html =>
  h.div([h.Class("mt-3 flex flex-wrap items-end gap-3"), h.DataAttribute("observe-filters", "")], [
    h.label([h.Class("flex flex-col gap-1 text-[11px]")], [h.span([h.Class("uppercase tracking-[0.12em] text-[var(--rm-muted)]")], ["Time range"]), h.select([h.Class("min-h-8 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2"), h.AriaLabel("Time range")], [h.option([], ["Day"]), h.option([], ["Week"]), h.option([], ["Month"]), h.option([], ["90 days"])])]),
    h.label([h.Class("flex flex-col gap-1 text-[11px]")], [h.span([h.Class("uppercase tracking-[0.12em] text-[var(--rm-muted)]")], ["Breakdown"]), h.select([h.Class("min-h-8 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2"), h.AriaLabel("Breakdown")], [h.option([], ["Total"]), h.option([], ["By endpoint variant"]), h.option([], ["By upstream model"]), h.option([], ["By provider"])])]),
    h.label([h.Class("flex flex-col gap-1 text-[11px]")], [h.span([h.Class("uppercase tracking-[0.12em] text-[var(--rm-muted)]")], ["Source"]), h.select([h.Class("min-h-8 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2"), h.AriaLabel("Source")], [h.option([], ["All sources"]), h.option([], ["Local only"]), h.option([], ["Remote only"])])]),
    h.label([h.Class("flex flex-col gap-1 text-[11px]")], [h.span([h.Class("uppercase tracking-[0.12em] text-[var(--rm-muted)]")], ["Difficulty"]), h.select([h.Class("min-h-8 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2"), h.AriaLabel("Difficulty")], [h.option([], ["All buckets"]), h.option([], ["Easy only"]), h.option([], ["Medium only"]), h.option([], ["Hard only"])])]),
    h.button([h.Type("button"), h.Class("min-h-8 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] px-3 text-[12px]")], ["Advanced controls"]),
    h.button([h.Type("button"), h.Class("min-h-8 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] px-3 text-[12px]")], ["Expand"]),
  ]);

export const telemetryRequestsRoute = (
  readback: ReadbackState,
  ranking: RequestsRankingState | undefined,
  metricListbox: Model["requestsRankingMetricListbox"],
  targetListbox: Model["requestsRankingTargetListbox"],
  h: HtmlBuilder<Message>,
): Html => {
  const rows = readback.rows.map((row) => [row.id, row.label, row.meta, row.value]);
  return page("Telemetry request ledger", [
    renderRequestsRanking(ranking, metricListbox, targetListbox, REQUESTS_RANKING_METRIC_OPTIONS, REQUESTS_RANKING_TARGET_OPTIONS, h),
    filterGroups(h),
    h.label([h.Class("mt-3 flex flex-col gap-1 text-[11px]")], [h.span([h.Class("uppercase tracking-[0.12em] text-[var(--rm-muted)]")], ["Ranking metric"]), h.select([h.Class("min-h-8 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2"), h.AriaLabel("Ranking metric")], REQUESTS_RANKING_METRIC_OPTIONS.map((option) => h.option(ranking?.metric === option.value ? [h.Selected(true)] : [], [option.label])))]),
    h.label([h.Class("mt-2 flex flex-col gap-1 text-[11px]")], [h.span([h.Class("uppercase tracking-[0.12em] text-[var(--rm-muted)]")], ["Ranking target"]), h.select([h.Class("min-h-8 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2"), h.AriaLabel("Ranking target")], REQUESTS_RANKING_TARGET_OPTIONS.map((option) => h.option(ranking?.rankingTarget === option.value ? [h.Selected(true)] : [], [option.label])))]),
    subhead("Recent telemetry requests", h),
    h.p([h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], ["Explainable request ledger with endpoint, model, status, and direct Observe/Router drill-in."]),
    table(["REQUEST", "MODEL", "ENDPOINT", "STATUS"], rows, "Loading the canonical telemetry ledger…", h),
    observeChart("Request volume", "Explainable requests by time bucket for the selected window.", emptySeries("requests", "Requests"), "No request volume data recorded yet.", h),
  ], h);
};

export const observeActivityRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const errors = readback.rows.filter((row) => row.value.includes("500") || row.value.includes("error")).length;
  const tiles = [["ENTRIES", String(readback.rows.length)], ["ERRORS", String(errors)], ["PROMPT TOKENS", "—"], ["COMPLETION TOKENS", "—"]] as const;
  return page("Host activity and metrics", [
    h.div([h.Class("mt-3 grid grid-cols-2 gap-3 md:grid-cols-4")], tiles.map(([label, value]) => h.div([h.Class("rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3")], [h.p([h.Class("text-[10px] uppercase tracking-[0.12em] text-[var(--rm-muted)]")], [label]), h.p([h.Class("mt-1 text-[20px] font-semibold")], [value])]))),
    subhead("Recent host activity", h),
    h.p([h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], ["Showing " + String(readback.rows.length) + " of " + String(readback.rows.length) + " requests in the last 24 hours"]),
    table(["MODEL", "DECIDED", "PATH", "STATUS", "DURATION", "CAPTURE"], readback.rows.map((row) => {
      try {
        // SAFETY: activity rows carry the runtime's raw JSON record in meta; every field is read
        // defensively with optional access and String fallback.
        const raw = JSON.parse(row.meta) as { readonly atMs?: unknown; readonly captureId?: unknown; readonly duration_ms?: unknown; readonly model_id?: unknown; readonly request_operation?: unknown; readonly status?: unknown };
        return [String(raw.model_id ?? row.label), String(raw.atMs ?? ""), String(raw.request_operation ?? ""), String(raw.status ?? ""), raw.duration_ms === undefined ? "" : String(raw.duration_ms) + " ms", raw.captureId === undefined ? "No capture" : String(raw.captureId)];
      } catch {
        return [row.label, "", "", row.value, "", "No capture"];
      }
    }), "No host activity recorded yet.", h),
    subhead("Capture inspector", h),
    h.p([h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], ["Inspect the exact request and response capture admitted for replay."]),
    empty("No capture selected.", h),
    observeChart("Host activity volume", "Host requests per time bucket for the last 24 hours.", emptySeries("activity", "Activity"), "No host activity volume recorded yet.", h),
  ], h);
};

const parseLog = (value: string): readonly [string, string, string, string, string] => {
  const match = value.match(/^(\S+)\s+\S+\s+(.*)$/);
  return [match?.[1] ?? "—", "combined", "—", match?.[2] ?? value, ""];
};

export const observeLogsRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => parseLog(row.value));
  return page("Host logs", [
    h.div([h.Class("mt-3 grid grid-cols-3 gap-3")], [["STRUCTURED ROWS", String(rows.length)], ["SOURCES", "1"], ["CORRELATED REQUESTS", "—"]].map(([label, value]) => h.div([h.Class("rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3")], [h.p([h.Class("text-[10px] uppercase tracking-[0.12em] text-[var(--rm-muted)]")], [label]), h.p([h.Class("mt-1 text-[20px] font-semibold")], [value])]))),
    h.label([h.Class("mt-3 flex flex-col gap-1 text-[11px]")], [h.span([h.Class("uppercase tracking-[0.12em] text-[var(--rm-muted)]")], ["Source filter"]), h.select([h.Class("min-h-8 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2"), h.AriaLabel("Source filter")], [h.option([], ["All sources combined"])])]),
    subhead("Structured log rows", h),
    h.p([h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], ["Rows are parsed into Time, Source, Level, Message, and Request fields so they can be scanned without leaving the shell."]),
    table(["TIME", "SOURCE", "LEVEL", "MESSAGE", "REQUEST"], rows, "No structured log rows recorded yet.", h),
    subhead("Raw lines", h),
    h.p([h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], ["The raw local log stream, unparsed."]),
    readback.rows.length === 0 ? empty("No raw log lines recorded yet.", h) : h.pre([h.Class("mt-2 max-h-[320px] overflow-auto rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel)] p-2 text-[11px]")], [readback.rows.map((row) => row.value).join("\n")]),
    observeChart("Structured log volume", "Structured log rows per source for the selected window.", emptySeries("logs", "Log rows"), "No structured log volume recorded yet.", h),
  ], h);
};

export const observeRoutingRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => page("Routing analytics", [
  filterGroups(h),
  subhead("Routing results", h),
  h.p([h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], ["Bounded routing analytics for the selected filters."]),
  table(["MODEL", "ENDPOINT", "COUNT"], readback.rows.map((row) => [row.label, row.meta, row.value]), "No routing rows recorded yet.", h),
  observeChart("Routing analytics volume", "Routing decisions per time bucket for the selected filters.", emptySeries("routing", "Routing rows"), "No routing analytics volume recorded yet.", h),
], h);

export const observabilitySnapshotRoute = (state: ObservabilityState, h: HtmlBuilder<Message>): Html => page("Observability snapshot", [
  h.p([h.Class("mt-2 max-w-[75ch] text-[12px] text-[var(--rm-secondary)]")], ["What this runtime has measured: routing decisions served, captures admitted for replay, evaluation finalise refusals, and learner candidates examined."]),
  h.p([h.Class("mt-1 max-w-[75ch] text-[12px] text-[var(--rm-secondary)]")], ["The readback is the live metric registry of the running host, not a stored projection."]),
  h.div([h.Class("mt-3 flex items-center gap-3")], [h.span([h.Class("text-[12px]")], [String(state.rows.length) + " metric row(s) in the registry"]), h.button([h.Type("button"), h.Class("min-h-8 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] px-3 text-[12px]")], ["Refresh"])]),
  table(["METRIC", "KIND", "COUNT"], state.rows.map((row) => [row.name, row.incremental ? "incremental counter" : "counter", String(row.count)]), "No metric rows in the registry.", h),
  observeChart("Metric registry counts", "Registered metric count by metric name.", emptySeries("metrics", "Metric rows"), "No metric registry counts recorded yet.", h),
], h);

export const storeDegradationReceiptsRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const stores = readback.rows.filter((row) => row.id.startsWith("store:"));
  const workers = readback.rows.filter((row) => row.id.startsWith("worker:"));
  const receiptTable = (rows: ReadbackState["rows"]) => table(["CATEGORY", "MESSAGE", "TIME"], rows.map((row) => [row.label, row.meta, row.value]), "No receipt rows in this store.", h);
  return page("Store degradation receipts", [
    h.p([h.Class("mt-2 max-w-[85ch] text-[12px] text-[var(--rm-secondary)]")], ["Materialization failures (R3 ladder writes, R6b development floors) are never silent: every failed write lands a durable, operator-visible receipt in the knowledge store and the knowledge worker store."]),
    h.div([h.Class("mt-3 flex items-center gap-3")], [h.span([h.Class("text-[12px]")], [String(readback.rows.length) + " receipt row(s) across both stores"]), h.button([h.Type("button"), h.Class("min-h-8 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] px-3 text-[12px]")], ["Refresh"])]),
    subhead("Knowledge store", h), receiptTable(stores),
    subhead("Knowledge worker", h), receiptTable(workers),
    observeChart("Receipt volume by store", "Durable degradation receipt rows across both stores.", emptySeries("receipts", "Receipts"), "No receipt volume recorded yet.", h),
  ], h);
};
