import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { Message } from "../../message";
import type { ReadbackState } from "../../readback";
import { card, table } from "../s563-layout";

const mutedPanel = "rounded-md border border-border bg-secondary p-4";
const secondaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground";

export interface LocalLogsState {
  readonly localLogsAutoRefresh?: boolean;
}

export const localLogsPage = (readback: ReadbackState, h: HtmlBuilder<Message>, state?: LocalLogsState): Html => {
  const autoRefresh = state?.localLogsAutoRefresh === true;
  return h.div([h.Class("space-y-8"), h.DataAttribute("route", "local-logs"), h.DataAttribute("page-layout", "reference"), h.DataAttribute("readback-route", "localLogs"), h.DataAttribute("readback-state", readback.status === "idle" ? "loading" : readback.status)], [
    h.svg([h.Class("mt-3 h-10 w-full text-[var(--rm-accent)]")], [h.rect([], []), h.rect([], [])]),
    card("Structured local log history", "Rows are parsed into Timestamp, Source, Severity, Request, and message fields so local runtime behavior can be inspected without raw console noise.", [
      h.div([h.Class(mutedPanel + " mb-4 flex flex-wrap items-center gap-4 p-4")], [
        h.button([h.Type("button"), h.DataAttribute("local-logs-refresh", ""), h.OnClick(Message.LocalLogsRefreshRequested({})), h.Class(secondaryButton)], ["Refresh"]),
        h.label([h.Class("flex items-center gap-2 text-sm text-foreground")], [h.input([h.Id("autoRefresh"), h.Type("checkbox"), h.Checked(autoRefresh), h.AriaLabel("Auto-refresh logs every 3 seconds"), h.Class("size-6 rounded border border-input"), h.OnChange((checked) => Message.LocalLogsAutoRefreshToggled({ value: checked === "true" || checked === "on" }))]), h.span([], ["Auto-refresh (3s)"])]),
        h.span([h.Class("ml-auto text-sm text-muted-foreground")], [readback.rows.length + " rows"]),
      ]),
      readback.rows.length === 0 ? h.p([h.Class("mb-3 text-sm leading-5 text-muted-foreground")], ["No logs available. The local runtime may not be running."]) : null,
      table(["Time", "Source", "Level", "Message", "Request"], readback.rows.map((row) => [row.value, "local", "info", row.label, "—"]), "No logs available.", h),
    ], h),
    card("Raw log streams", "Keep proxy and llama-swap runtime output side by side so operators can compare the gateway-facing stream against the local engine stream.", [
      h.div([h.Class("grid gap-4 xl:grid-cols-2")], [
        h.div([], [h.p([h.Class("mb-2 text-[15px] font-semibold leading-5 text-foreground")], ["Proxy log stream"]), h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No proxy log lines are available yet."])]),
        h.div([], [h.p([h.Class("mb-2 text-[15px] font-semibold leading-5 text-foreground")], ["Llama-swap log stream"]), h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No llama-swap log lines are available yet."])]),
      ]),
    ], h),
  ]);
};
