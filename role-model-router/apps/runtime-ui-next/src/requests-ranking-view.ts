import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { RequestsRankingState } from "./requests-ranking";
import { Message } from "./message";
import {
  initRequestsMetricListbox,
  initRequestsTargetListbox,
  requestsMetricListboxView,
  requestsTargetListboxView,
  type RequestsMetricListboxModel,
} from "./ui/listbox";

/** S413: Requests ranking metric/target controls + honest ranking result. The GET readback is separate. */
export const renderRequestsRanking = (
  state: RequestsRankingState | undefined,
  metricListbox: RequestsMetricListboxModel | undefined,
  targetListbox: RequestsMetricListboxModel | undefined,
  metricOptions: ReadonlyArray<{ readonly label: string; readonly value: string }>,
  targetOptions: ReadonlyArray<{ readonly label: string; readonly value: string }>,
  h: HtmlBuilder<Message>,
): Html => {
  const current = state ?? {
    metric: "averageLatencyMs",
    rankingTarget: "endpointId",
    rows: [],
    status: "idle" as const,
    token: 0,
  };
  const loading = current.status === "loading";
  return h.section([h.DataAttribute("requests-ranking", ""), h.Class("mt-6 rounded-[8px] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4")], [
    h.h3([h.Class("text-[14px] font-semibold")], ["Ranked comparison"]),
    h.p([h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]")], ["Metric and ranking target feed POST /telemetry/query over the last week. The request list below is a separate readback."]),
    h.div([h.Class("mt-3 flex flex-wrap items-end gap-2")], [
      h.div([h.Class("flex flex-col gap-1 text-[11px] uppercase tracking-[0.14em] text-[var(--rm-muted)]")], [
        h.span([], ["Ranking metric"]),
        requestsMetricListboxView(
          {
            model: metricListbox ?? initRequestsMetricListbox(),
            selected: current.metric,
            options: metricOptions,
            toParentMessage: (message) => Message.GotRequestsRankingMetricListboxMessage({ message }),
          },
          h,
        ),
      ]),
      h.div([h.Class("flex flex-col gap-1 text-[11px] uppercase tracking-[0.14em] text-[var(--rm-muted)]")], [
        h.span([], ["Ranking target"]),
        requestsTargetListboxView(
          {
            model: targetListbox ?? initRequestsTargetListbox(),
            selected: current.rankingTarget,
            options: targetOptions,
            toParentMessage: (message) => Message.GotRequestsRankingTargetListboxMessage({ message }),
          },
          h,
        ),
      ]),
      h.button([h.Type("button"), h.DataAttribute("ranking-submit", ""), h.AriaDisabled(loading), h.OnClick(Message.RequestsRankingSubmitRequested({})), h.Class("rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-1.5 text-[12px] font-medium disabled:opacity-50")], [loading ? "Querying…" : "Run ranking"]),
    ]),
    ...(current.status === "loading" ? [h.p([h.Role("status"), h.AriaLive("polite"), h.DataAttribute("ranking-state", "loading"), h.Class("mt-3 text-[12px] text-[var(--rm-secondary)]")], ["Loading ranking…"])] : []),
    ...(current.status === "error" ? [h.p([h.Role("alert"), h.DataAttribute("ranking-state", "error"), h.Class("mt-3 text-[12px] text-[var(--rm-error)]")], [current.message ?? "Ranking query failed."])] : []),
    ...(current.status === "empty" ? [h.p([h.DataAttribute("ranking-state", "empty"), h.Class("mt-3 text-[12px] text-[var(--rm-secondary)]")], ["No ranked rows for this metric and target."])] : []),
    ...(current.status === "ok" ? [h.table([h.Class("mt-3 w-full text-left text-[12px]"), h.DataAttribute("ranking-rows", "")], [
      h.thead([], [h.tr([], [h.th([], ["Key"]), h.th([], ["Label"]), h.th([], ["Value"])])]),
      h.tbody([], current.rows.map((row) => h.tr([], [h.td([], [row.key]), h.td([], [row.label]), h.td([], [row.value === null ? "not reported" : String(row.value)])]))),
    ])] : []),
  ]);
};
