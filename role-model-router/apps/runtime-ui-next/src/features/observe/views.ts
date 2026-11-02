import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { Message } from "../../message";
import type { Model } from "../../model";
import type { ObservabilityState } from "../../observability";
import type { ReadbackState } from "../../readback";
import { REQUESTS_RANKING_METRIC_OPTIONS, REQUESTS_RANKING_TARGET_OPTIONS, type RequestsRankingState } from "../requests-ranking/model";
import { renderRequestsRanking } from "../requests-ranking/view";
import { telemetryChartCard } from "../overview/charts";
import { initRequestsMetricListbox, initRequestsTargetListbox, requestsMetricListboxView, requestsTargetListboxView } from "../../ui/listbox";
import { card, chartGrid, filterBar, metrics, segmented, table } from "../s563-layout";
import type { ChartSeries } from "@role-model/ui/foldkit-chart";

const page = (title: string, children: ReadonlyArray<Html>, h: HtmlBuilder<Message>): Html =>
  h.section([h.Class("rm3-next-route flex flex-col gap-4"), h.DataAttribute("route", "observe")], [
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

const observeFilterBar = (
  h: HtmlBuilder<Message>,
  extra: ReadonlyArray<string> = [],
  filters?: { readonly breakdown: string; readonly difficulty: string; readonly expanded: boolean; readonly range: string; readonly source: string },
  on?: {
    readonly advanced: () => Message;
    readonly filter: (field: "breakdown" | "difficulty" | "source", value: string) => Message;
    readonly range: (value: string) => Message;
  },
): Html => {
  const labelClass = "font-sans text-xs font-normal leading-4 text-muted-foreground";
  const fieldClass = "flex shrink-0 flex-col gap-1.5";
  const selectClass =
    "flex h-[34px] min-w-[9rem] items-center justify-between gap-2 rounded-md border border-input bg-secondary px-2.5 text-left font-sans text-sm text-foreground";
  const field = (label: string, value: string, options: ReadonlyArray<string>, key: "breakdown" | "difficulty" | "source") =>
    h.label([h.Class(fieldClass)], [
      h.span([h.Class(labelClass)], [label]),
      h.select(
        [h.AriaLabel(label), h.Class(selectClass), h.Value(value), ...(on === undefined ? [] : [h.OnInput((next) => on.filter(key, next))])],
        options.map((option) => h.option([h.Value(option), ...(option === value ? [h.Selected(true)] : [])], [option])),
      ),
    ]);
  return h.div([h.Class("flex flex-col gap-4")], [
    h.div(
      [h.Class("flex w-full flex-wrap items-end justify-between gap-4")],
      [
        h.div([h.Class(fieldClass)], [
          h.span([h.Class(labelClass)], ["Time range"]),
          h.div(
            [h.Class("flex h-9 w-fit shrink-0 items-center gap-1 rounded-md border border-border bg-secondary p-1"), h.Attribute("role", "group"), h.AriaLabel("Time range")],
            ["Day", "Week", "Month", "90 days"].map((option) =>
              h.button(
                [
                  h.Type("button"),
                  h.AriaPressed(String((filters?.range ?? "Day") === option)),
                  h.DataAttribute("requests-range", option),
                  ...(on === undefined ? [] : [h.OnClick(on.range(option))]),
                  h.Class(
                    "flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-[5px] px-2.5 font-sans text-sm leading-[18px] " +
                      ((filters?.range ?? "Day") === option ? "bg-primary font-semibold text-primary-foreground" : "font-normal text-muted-foreground hover:text-foreground"),
                  ),
                ],
                [option],
              ),
            ),
          ),
        ]),
        h.div([h.Class("flex flex-wrap items-end gap-3")], [
          field("Breakdown", filters?.breakdown ?? "By endpoint variant", ["Total", "By endpoint variant", "By upstream model", "By provider"], "breakdown"),
          field("Source", filters?.source ?? "All sources", ["All sources", "Local only", "Remote only"], "source"),
          ...(extra.includes("Difficulty") ? [field("Difficulty", filters?.difficulty ?? "All buckets", ["All buckets", "Easy only", "Medium only", "Hard only"], "difficulty")] : []),
        ]),
      ],
    ),
    h.div(
      [h.Class("flex w-full flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-3"), h.DataAttribute("observe-advanced", "")],
      [
        h.span([h.Class("font-sans text-sm font-medium text-foreground")], ["Advanced controls"]),
        h.button([h.Type("button"), h.AriaExpanded(filters?.expanded === true), ...(on === undefined ? [] : [h.OnClick(on.advanced())]), h.Class("inline-flex h-[34px] items-center gap-1 rounded-md border border-border bg-background px-3 font-sans text-sm text-foreground")], ["Expand"]),
      ],
    ),
  ]);
};

export const telemetryRequestsRoute = (
  readback: ReadbackState,
  ranking: RequestsRankingState | undefined,
  metricListbox: Model["requestsRankingMetricListbox"],
  targetListbox: Model["requestsRankingTargetListbox"],
  h: HtmlBuilder<Message>,
  filters?: Model["requestsFilters"],
): Html => {
  const rows = readback.rows.map((row) => [row.id, row.label, row.meta, row.value]);
  const current = ranking ?? { metric: "averageLatencyMs", rankingTarget: "endpointId", rows: [], status: "idle" as const, token: 0 };
  const loading = current.status === "loading";
  const labelClass = "font-sans text-xs font-normal leading-4 text-muted-foreground";
  const fieldClass = "flex shrink-0 flex-col gap-1.5";
  const selectClass =
    "flex h-[34px] min-w-[9rem] items-center justify-between gap-2 rounded-md border border-input bg-secondary px-2.5 text-left font-sans text-sm text-foreground";
  const fieldSelect = (label: string, value: string, options: ReadonlyArray<string>, field: "breakdown" | "source" | "statusFamily") =>
    h.label([h.Class(fieldClass)], [
      h.span([h.Class(labelClass)], [label]),
      h.select(
        [h.AriaLabel(label), h.DataAttribute("requests-filter", label.toLowerCase().replace(/ /g, "-")), h.Class(selectClass), h.Value(value), h.OnInput((next) => Message.RequestsFilterChanged({ field, value: next }))],
        options.map((option) => h.option([h.Value(option), ...(option === value ? [h.Selected(true)] : [])], [option])),
      ),
    ]);
  const listboxField = (label: string, control: Html) =>
    h.label([h.Class(fieldClass)], [h.span([h.Class(labelClass)], [label]), control]);
  const runRanking = h.button(
    [
      h.Type("button"),
      h.DataAttribute("ranking-submit", ""),
      h.AriaDisabled(loading),
      h.OnClick(Message.RequestsRankingSubmitRequested({})),
      h.Class("inline-flex h-[34px] items-center rounded-md border border-input bg-background px-3 font-sans text-sm font-medium text-foreground disabled:opacity-50"),
    ],
    [loading ? "Querying…" : "Run ranking"],
  );
  const expand = h.button(
    [h.Type("button"), h.AriaExpanded(filters?.expanded === true), h.OnClick(Message.RequestsAdvancedToggled({})), h.Class("inline-flex h-[34px] items-center gap-1 rounded-md border border-border bg-background px-3 font-sans text-sm text-foreground")],
    ["Expand"],
  );
  return h.section(
    [h.Class("rm3-next-route flex flex-col gap-4"), h.DataAttribute("route", "observe"), h.DataAttribute("requests-page", "")],
    [
      h.div(
        [h.Class("flex w-full flex-wrap items-end justify-between gap-4")],
        [
          h.div([h.Class(fieldClass)], [
            h.span([h.Class(labelClass)], ["Time range"]),
            h.div(
              [
                h.Class("flex h-9 w-fit shrink-0 items-center gap-1 rounded-md border border-border bg-secondary p-1"),
                h.Attribute("role", "group"),
                h.AriaLabel("Time range"),
              ],
              ["Day", "Week", "Month", "90 days"].map((option) =>
                h.button(
                  [
                    h.Type("button"),
                    h.AriaPressed(String((filters?.range ?? "Day") === option)),
                    h.DataAttribute("requests-range", option),
                    h.OnClick(Message.RequestsRangeChanged({ value: option })),
                    h.Class(
                      "flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-[5px] px-2.5 font-sans text-sm leading-[18px] " +
                        ((filters?.range ?? "Day") === option ? "bg-primary font-semibold text-primary-foreground" : "font-normal text-muted-foreground hover:text-foreground"),
                    ),
                  ],
                  [option],
                ),
              ),
            ),
          ]),
          h.div(
            [h.Class("flex flex-wrap items-end gap-3")],
            [
              fieldSelect("Breakdown", filters?.breakdown ?? "Total", ["Total", "By endpoint variant", "By upstream model", "By provider"], "breakdown"),
              fieldSelect("Source", filters?.source ?? "All sources", ["All sources", "Local only", "Remote only"], "source"),
              listboxField(
                "Ranking metric",
                requestsMetricListboxView(
                  {
                    model: metricListbox ?? initRequestsMetricListbox(),
                    selected: current.metric,
                    options: REQUESTS_RANKING_METRIC_OPTIONS,
                    toParentMessage: (message: unknown) => Message.GotRequestsRankingMetricListboxMessage({ message }),
                  },
                  h,
                ),
              ),
              listboxField(
                "Ranking target",
                requestsTargetListboxView(
                  {
                    model: targetListbox ?? initRequestsTargetListbox(),
                    selected: current.rankingTarget,
                    options: REQUESTS_RANKING_TARGET_OPTIONS,
                    toParentMessage: (message: unknown) => Message.GotRequestsRankingTargetListboxMessage({ message }),
                  },
                  h,
                ),
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class("flex w-full flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-3"), h.DataAttribute("requests-advanced", "")],
        [
          h.span([h.Class("font-sans text-sm font-medium text-foreground")], ["Advanced controls"]),
          h.div([h.Class("flex items-center gap-2")], [expand]),
          h.div(
            [h.Class("hidden"), h.DataAttribute("requests-advanced-fields", "")],
            [
              fieldSelect("Status family", filters?.statusFamily ?? "All statuses", ["All statuses", "Success only", "Failure only", "Unknown only"], "statusFamily"),
              runRanking,
            ],
          ),
        ],
      ),
      ...(current.status === "error"
        ? [h.p([h.Role("alert"), h.DataAttribute("ranking-state", "error"), h.Class("text-sm text-[var(--rm-error)]")], [current.message ?? "Ranking query failed."])]
        : []),
      ...(current.status === "ok"
        ? [card("Ranked comparison", "Metric and ranking target over the last week.", [
            table(["Key", "Label", "Value"], current.rows.map((row) => [row.key, row.label, row.value === null ? "not reported" : String(row.value)]), "No ranked rows for this metric and target.", h),
          ], h)]
        : []),
      section("Recent telemetry requests", "Explainable request ledger with endpoint, model, status, and direct Observe/Router drill-in.", [
        table(["Request", "Model", "Endpoint", "Status"], rows, "Loading the canonical telemetry ledger…", h),
      ], h),
      observeCharts(observeChart("Request volume", "Explainable requests by time bucket for the selected window.", emptySeries("requests", "Requests"), "No request volume data recorded yet.", h), h),
    ],
  );
};

export const observeActivityRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const records = readback.rows.flatMap((row) => {
    try {
      // SAFETY: activity rows carry the runtime's raw JSON record in meta; every field is read defensively.
      const raw = JSON.parse(row.meta) as { readonly atMs?: number; readonly captureId?: unknown; readonly duration_ms?: number; readonly model_id?: string; readonly request_operation?: string; readonly status?: string | number };
      return [{ capture: raw.captureId === undefined ? "No capture" : String(raw.captureId), duration: raw.duration_ms === undefined ? "" : String(raw.duration_ms) + " ms", model: raw.model_id ?? row.label, operation: raw.request_operation ?? "", status: raw.status === undefined ? row.value : String(raw.status), time: raw.atMs === undefined ? "" : new Date(raw.atMs).toLocaleString("en-US", { day: "2-digit", hour: "numeric", minute: "2-digit", month: "2-digit", second: "2-digit", year: "numeric" }) }];
    } catch {
      return [{ capture: "No capture", duration: "", model: row.label, operation: "", status: row.value, time: "" }];
    }
  });
  const errors = records.filter((record) => record.status.includes("500") || record.status.toLowerCase().includes("error")).length;
  const tiles = [
    { label: "ENTRIES", value: String(records.length) },
    { label: "ERRORS", value: String(errors) },
    { label: "PROMPT TOKENS", value: "0" },
    { label: "COMPLETION TOKENS", value: "0" },
  ];
  return page("Host activity and metrics", [
    metrics(tiles, h),
    h.div([h.Class("grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] xl:items-start")], [
      section("Recent host activity", "Showing " + String(records.length) + " of " + String(records.length) + " requests in the last 24 hours", [
        records.length === 0
          ? empty("No host activity recorded yet.", h)
          : h.div([h.Class("flex flex-col")], records.map((record) =>
              h.div([h.Class("flex flex-col gap-1 border-b border-border py-3 last:border-b-0")], [
                h.div([h.Class("flex items-baseline justify-between gap-3")], [
                  h.span([h.Class("min-w-0 truncate font-sans text-[13px] font-semibold text-foreground")], [record.model]),
                  h.span([h.Class("shrink-0 font-mono text-[11px] text-muted-foreground")], [record.time]),
                ]),
                h.span([h.Class("truncate font-mono text-[12px] text-muted-foreground")], [record.operation]),
                h.div([h.Class("flex items-center justify-between gap-3 font-mono text-[12px] text-muted-foreground")], [
                  h.span([], [record.status + (record.duration.length > 0 ? "  " + record.duration : "")]),
                  h.span([], [record.capture]),
                ]),
              ]),
            )),
      ], h),
      section("Capture inspector", "Inspect the exact request and response capture admitted for replay.", [
        empty("Choose a ledger row with a capture to inspect.", h),
      ], h),
    ]),
  ], h);
};

const parseLog = (value: string): readonly [string, string, string, string, string] => {
  const match = value.match(/^(\S+)\s+\S+\s+(.*)$/);
  return [match?.[1] ?? "—", "combined", "—", match?.[2] ?? value, ""];
};

export const observeLogsRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const parsed = readback.rows.map((row) => {
    const time = row.label.replace(/^\[|\]$/g, "");
    const level = row.meta.includes("error=") ? "error" : row.meta.includes("status=") ? "info" : "—";
    const message = row.meta.replace(/^\[[^\]]*\]\s*\S+\s*/, "");
    return [time.length > 0 ? time : "—", "combined", level, message, row.value] as const;
  });
  const correlated = new Set(readback.rows.map((row) => row.value).filter((value) => value.length > 0)).size;
  return page("Host logs", [
    metrics([
      { label: "STRUCTURED ROWS", value: String(parsed.length) },
      { label: "SOURCES", value: "1" },
      { label: "CORRELATED REQUESTS", value: String(correlated) },
    ], h),
    h.div([h.Class("flex flex-col gap-2")], [
      h.span([h.Class("font-sans text-[13px] font-medium leading-5 text-foreground")], ["Source filter"]),
      segmented("Log source filter", ["All sources", "combined"], "All sources", h),
    ]),
    section("Structured log rows", "Rows are parsed into Time, Source, Level, Message, and Request fields so they can be scanned without leaving the shell.", [
      table(["Time", "Source", "Level", "Message", "Request"], parsed, "No structured log rows recorded yet.", h),
    ], h),
    section("Raw lines", "The raw local log stream, unparsed.", [
      readback.rows.length === 0
        ? empty("No raw log lines recorded yet.", h)
        : h.pre([h.Class("max-h-[320px] overflow-auto rounded-md border border-border bg-secondary p-3 font-mono text-xs leading-5")], [readback.rows.map((row) => row.value).join("\n")]),
    ], h),
  ], h);
};

export const observeRoutingRoute = (readback: ReadbackState, h: HtmlBuilder<Message>, filters?: Model["observeRoutingFilters"]): Html => page("Routing analytics", [
  observeFilterBar(h, ["Difficulty"], filters, {
    advanced: () => Message.ObserveAdvancedToggled({}),
    filter: (field, value) => Message.ObserveFilterChanged({ field, value }),
    range: (value) => Message.ObserveRangeChanged({ value }),
  }),
  section("Routing results", "Bounded routing analytics for the selected filters.", [
    table(["Model", "Endpoint", "Count"], readback.rows.map((row) => [row.label, row.meta, row.value]), "No routing rows recorded yet.", h),
  ], h),
  observeCharts(observeChart("Routing analytics volume", "Routing decisions per time bucket for the selected filters.", emptySeries("routing", "Routing rows"), "No routing analytics volume recorded yet.", h), h),
], h);

export const observabilitySnapshotRoute = (state: ObservabilityState, h: HtmlBuilder<Message>): Html =>
  h.section([h.Class("rm3-next-route flex flex-col gap-4"), h.DataAttribute("route", "observe")], [
    section("Observability snapshot", "What this runtime has measured: routing decisions served, captures admitted for replay, evaluation finalise refusals, and learner candidates examined. The readback is the live metric registry of the running host, not a stored projection.", [
      h.div([h.Class("flex flex-wrap items-center justify-between gap-3 pb-2")], [
        h.p([h.Class("font-sans text-[13px] leading-5 text-muted-foreground")], [String(state.rows.length) + " metric row(s) in the registry"]),
        h.button([h.Type("button"), h.DataAttribute("observability-refresh", ""), h.OnClick(Message.ObservabilityRefreshRequested({})), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground")], ["Refresh"]),
      ]),
      ...(state.rows.length === 0
        ? [empty("No metric rows in the registry.", h)]
        : state.rows.map((row) =>
            h.div([h.Class("flex flex-col gap-2 rounded-md border border-border p-4")], [
              h.div([h.Class("flex flex-wrap items-baseline gap-2")], [
                h.span([h.Class("font-mono text-[13px] font-semibold tabular-nums text-foreground")], [String(row.count)]),
                h.span([h.Class("font-mono text-[12px] uppercase tracking-[0.02em] text-foreground")], [row.name]),
                h.span([h.Class("font-sans text-[12px] text-muted-foreground")], [row.incremental ? "incremental counter" : "counter"]),
              ]),
            ]),
          )),
    ], h),
  ]);

export const storeDegradationReceiptsRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html =>
  h.section([h.Class("rm3-next-route flex flex-col gap-4"), h.DataAttribute("route", "observe")], [
    section("Store degradation receipts", "Materialization failures (R3 ladder writes, R6b development floors) are never silent: every failed write lands a durable, operator-visible receipt in the knowledge store and the knowledge worker store.", [
      h.div([h.Class("flex flex-wrap items-center justify-between gap-3 pb-2")], [
        h.p([h.Class("font-sans text-[13px] leading-5 text-muted-foreground")], [String(readback.rows.length) + " receipt row(s) across both stores"]),
        h.button([h.Type("button"), h.DataAttribute("store-receipts-refresh", ""), h.OnClick(Message.StoreReceiptsRefreshRequested({})), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground")], ["Refresh"]),
      ]),
      ...(readback.rows.length === 0
        ? [empty("No receipt rows recorded in this store.", h)]
        : readback.rows.map((row) => {
            const source = row.id.startsWith("worker:") ? "Knowledge worker" : "Knowledge store";
            const scope = row.id.replace(/^(store|worker):/, "");
            return h.div([h.Class("flex flex-col gap-2 rounded-md border border-border p-4")], [
              h.div([h.Class("flex flex-wrap items-center gap-3 font-sans text-[12px] leading-4 text-muted-foreground")], [
                h.span([], [source]),
                h.span([h.Class("font-mono uppercase tracking-[0.02em]")], [row.label]),
              ]),
              h.p([h.Class("font-sans text-[13px] font-semibold leading-5 text-foreground")], [row.meta]),
              h.p([h.Class("break-all font-mono text-[11px] leading-4 text-muted-foreground")], [row.value + (scope.length > 0 ? " · " + scope : "")]),
            ]);
          })),
    ], h),
  ]);
