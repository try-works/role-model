import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { Message } from "../../message";
import type { Model } from "../../model";
import type { ObservabilityState } from "../../observability";
import type { ReadbackState } from "../../readback";
import { REQUESTS_RANKING_METRIC_OPTIONS, REQUESTS_RANKING_TARGET_OPTIONS, type RequestsRankingState } from "../requests-ranking/model";
import { renderRequestsRanking } from "../requests-ranking/view";
import { telemetryChartCard } from "../overview/charts";
import { card, chartGrid, filterBar, metrics, segmented, table } from "../s563-layout";
import type { ChartSeries } from "@role-model/ui/foldkit-chart";

const page = (title: string, children: ReadonlyArray<Html>, h: HtmlBuilder<Message>): Html =>
  h.section([h.Class("rm3-next-route flex flex-col gap-4"), h.DataAttribute("route", "observe")], [
    h.h2([h.Class("rm3-next-route-title text-sm font-medium leading-5 tracking-tight")], [title]),
    ...children,
  ]);

const section = (title: string, description: string, children: ReadonlyArray<Html>, h: HtmlBuilder<Message>): Html =>
  card(title, description, children, h);

const empty = (label: string, h: HtmlBuilder<Message>): Html =>
  h.p([h.DataAttribute("observe-state", "empty"), h.Role("status"), h.Class("text-sm leading-5 text-muted-foreground")], [label]);

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

const observeCharts = (card: Html, h: HtmlBuilder<Message>): Html => chartGrid([{ span: 12, body: card }], h);

const filterGroups = (h: HtmlBuilder<Message>): Html =>
  filterBar(
    [
      { label: "Time range", value: "Day", options: ["Day", "Week", "Month", "90 days"] },
      { label: "Breakdown", value: "Total", options: ["Total", "By endpoint variant", "By upstream model", "By provider"] },
      { label: "Source", value: "All sources", options: ["All sources", "Local only", "Remote only"] },
      { label: "Difficulty", value: "All buckets", options: ["All buckets", "Easy only", "Medium only", "Hard only"] },
    ],
    h,
  );

const filterActions = (h: HtmlBuilder<Message>): Html =>
  h.div([h.Class("flex flex-wrap gap-2")], ["Advanced controls", "Expand"].map((label) =>
    h.button([h.Type("button"), h.Class("h-[34px] rounded-md border border-input bg-secondary px-3 font-sans text-sm text-foreground")], [label]),
  ));

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
    filterBar([
      { label: "Status", value: "All statuses", options: ["All statuses"] },
      { label: "Ranking metric", value: "Average latency", options: ["Average latency", "Endpoint variants"] },
      { label: "Ranking target", value: "Endpoint variants", options: ["Endpoint variants"] },
    ], h),
    h.div([h.Class("flex flex-wrap items-end gap-4")], [
      h.label([h.Class("flex w-[150px] flex-col gap-1.5")], [
        h.span([h.Class("font-sans text-xs font-normal leading-4 text-muted-foreground")], ["Ranking metric"]),
        h.select([h.AriaLabel("Ranking metric"), h.Class("h-[34px] rounded-md border border-input bg-secondary px-2.5 font-sans text-sm text-foreground")], REQUESTS_RANKING_METRIC_OPTIONS.map((option) => h.option(option.value === ranking?.metric ? [h.Value(option.value), h.Selected(true)] : [h.Value(option.value)], [option.label]))),
      ]),
      h.label([h.Class("flex w-[150px] flex-col gap-1.5")], [
        h.span([h.Class("font-sans text-xs font-normal leading-4 text-muted-foreground")], ["Ranking target"]),
        h.select([h.AriaLabel("Ranking target"), h.Class("h-[34px] rounded-md border border-input bg-secondary px-2.5 font-sans text-sm text-foreground")], REQUESTS_RANKING_TARGET_OPTIONS.map((option) => h.option(option.value === ranking?.rankingTarget ? [h.Value(option.value), h.Selected(true)] : [h.Value(option.value)], [option.label]))),
      ]),
      filterActions(h),
    ]),
    section("Recent telemetry requests", "Explainable request ledger with endpoint, model, status, and direct Observe/Router drill-in.", [
      table(["Request", "Model", "Endpoint", "Status"], rows, "Loading the canonical telemetry ledger…", h),
    ], h),
    observeCharts(observeChart("Request volume", "Explainable requests by time bucket for the selected window.", emptySeries("requests", "Requests"), "No request volume data recorded yet.", h), h),
  ], h);
};

export const observeActivityRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const errors = readback.rows.filter((row) => row.value.includes("500") || row.value.includes("error")).length;
  const tiles = [
    { label: "ENTRIES", value: String(readback.rows.length) },
    { label: "ERRORS", value: String(errors) },
    { label: "PROMPT TOKENS", value: "—" },
    { label: "COMPLETION TOKENS", value: "—" },
  ];
  return page("Host activity and metrics", [
    metrics(tiles, h),
    section("Recent host activity", "Showing " + String(readback.rows.length) + " of " + String(readback.rows.length) + " requests in the last 24 hours", [
      table(["Model", "Decided", "Path", "Status", "Duration", "Capture"], readback.rows.map((row) => {
        try {
          // SAFETY: activity rows carry the runtime's raw JSON record in meta; every field is read
          // defensively with optional access and String fallback.
          const raw = JSON.parse(row.meta) as { readonly atMs?: unknown; readonly captureId?: unknown; readonly duration_ms?: unknown; readonly model_id?: unknown; readonly request_operation?: unknown; readonly status?: unknown };
          return [String(raw.model_id ?? row.label), String(raw.atMs ?? ""), String(raw.request_operation ?? ""), String(raw.status ?? ""), raw.duration_ms === undefined ? "" : String(raw.duration_ms) + " ms", raw.captureId === undefined ? "No capture" : String(raw.captureId)];
        } catch {
          return [row.label, "", "", row.value, "", "No capture"];
        }
      }), "No host activity recorded yet.", h),
    ], h),
    section("Capture inspector", "Inspect the exact request and response capture admitted for replay.", [
      empty("No capture selected.", h),
    ], h),
    observeCharts(observeChart("Host activity volume", "Host requests per time bucket for the last 24 hours.", emptySeries("activity", "Activity"), "No host activity volume recorded yet.", h), h),
  ], h);
};

const parseLog = (value: string): readonly [string, string, string, string, string] => {
  const match = value.match(/^(\S+)\s+\S+\s+(.*)$/);
  return [match?.[1] ?? "—", "combined", "—", match?.[2] ?? value, ""];
};

export const observeLogsRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => parseLog(row.value));
  return page("Host logs", [
    metrics([
      { label: "STRUCTURED ROWS", value: String(rows.length) },
      { label: "SOURCES", value: "1" },
      { label: "CORRELATED REQUESTS", value: "—" },
    ], h),
    segmented("Log source filter", ["All sources combined"], "All sources combined", h),
    section("Structured log rows", "Rows are parsed into Time, Source, Level, Message, and Request fields so they can be scanned without leaving the shell.", [
      table(["Time", "Source", "Level", "Message", "Request"], rows, "No structured log rows recorded yet.", h),
    ], h),
    section("Raw lines", "The raw local log stream, unparsed.", [
      readback.rows.length === 0
        ? empty("No raw log lines recorded yet.", h)
        : h.pre([h.Class("max-h-[320px] overflow-auto rounded-md border border-border bg-secondary p-3 font-mono text-xs leading-5")], [readback.rows.map((row) => row.value).join("\n")]),
    ], h),
    observeCharts(observeChart("Structured log volume", "Structured log rows per source for the selected window.", emptySeries("logs", "Log rows"), "No structured log volume recorded yet.", h), h),
  ], h);
};

export const observeRoutingRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => page("Routing analytics", [
  filterGroups(h),
  filterActions(h),
  section("Routing results", "Bounded routing analytics for the selected filters.", [
    table(["Model", "Endpoint", "Count"], readback.rows.map((row) => [row.label, row.meta, row.value]), "No routing rows recorded yet.", h),
  ], h),
  observeCharts(observeChart("Routing analytics volume", "Routing decisions per time bucket for the selected filters.", emptySeries("routing", "Routing rows"), "No routing analytics volume recorded yet.", h), h),
], h);

export const observabilitySnapshotRoute = (state: ObservabilityState, h: HtmlBuilder<Message>): Html => page("Observability snapshot", [
  section("Observability snapshot", "What this runtime has measured: routing decisions served, captures admitted for replay, evaluation finalise refusals, and learner candidates examined. The readback is the live metric registry of the running host, not a stored projection.", [
    h.div([h.Class("flex flex-wrap items-center justify-between gap-3")], [
      h.p([h.Class("text-sm leading-5 text-muted-foreground")], [String(state.rows.length) + " metric row(s) in the registry"]),
      h.button([h.Type("button"), h.Class("h-[34px] rounded-md border border-input bg-secondary px-3 font-sans text-sm text-foreground")], ["Refresh"]),
    ]),
    table(["Metric", "Kind", "Count"], state.rows.map((row) => [row.name, row.incremental ? "incremental counter" : "counter", String(row.count)]), "No metric rows in the registry.", h),
  ], h),
  observeCharts(observeChart("Metric registry counts", "Registered metric count by metric name.", emptySeries("metrics", "Metric rows"), "No metric registry counts recorded yet.", h), h),
], h);

export const storeDegradationReceiptsRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const stores = readback.rows.filter((row) => row.id.startsWith("store:"));
  const workers = readback.rows.filter((row) => row.id.startsWith("worker:"));
  const receiptSection = (title: string, rows: ReadbackState["rows"]): Html =>
    section(title, "Durable degradation receipts recorded for this store.", [
      table(["Category", "Message", "Time"], rows.map((row) => [row.label, row.meta, row.value]), "No receipt rows in this store.", h),
    ], h);
  return page("Store degradation receipts", [
    section("Store degradation receipts", "Materialization failures (R3 ladder writes, R6b development floors) are never silent: every failed write lands a durable, operator-visible receipt in the knowledge store and the knowledge worker store.", [
      h.div([h.Class("flex flex-wrap items-center justify-between gap-3")], [
        h.p([h.Class("text-sm leading-5 text-muted-foreground")], [String(readback.rows.length) + " receipt row(s) across both stores"]),
        h.button([h.Type("button"), h.Class("h-[34px] rounded-md border border-input bg-secondary px-3 font-sans text-sm text-foreground")], ["Refresh"]),
      ]),
    ], h),
    receiptSection("Knowledge store", stores),
    receiptSection("Knowledge worker", workers),
  ], h);
};
