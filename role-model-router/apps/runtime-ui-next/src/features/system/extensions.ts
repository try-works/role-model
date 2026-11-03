import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { Message } from "../../message";
import type { ReadbackState } from "../../readback";
import { card } from "../s563-layout";

const secondaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground";
const primaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-primary px-3 font-sans text-sm font-medium text-primary-foreground";
const supporting = "text-sm leading-5 text-muted-foreground";

export interface SystemExtensionsState {
  readonly systemExtensionsMessage?: string;
}

export const systemExtensionsPage = (readback: ReadbackState, h: HtmlBuilder<Message>, state?: SystemExtensionsState): Html => {
  const status = readback.status === "idle" ? "loading" : readback.status;
  return h.div([h.Class("space-y-6"), h.DataAttribute("route", "system-extensions"), h.DataAttribute("page-layout", "reference"), h.DataAttribute("final-family-state", status), h.DataAttribute("readback-state", status)], [
    h.svg([h.Class("mt-3 h-10 w-full text-[var(--rm-accent)]")], [h.rect([], []), h.rect([], [])]),
    readback.status === "error" ? h.p([h.Role("alert"), h.Class(supporting)], ["Extensions read failed: " + (readback.message ?? "unknown error")]) : null,
    h.div([h.Class("grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]")], [
      card("Contribution posture", "Aggregate upload is independent from local recommendation use, training, external RL, and rich capture. Contribution policy is not extension enablement.", [
        h.p([h.Class(supporting)], ["Loading contribution policy…"]),
        h.p([h.Class("mt-3 " + supporting)], ["Contribution policy is unavailable or unobserved on this host."]),
      ], h),
      card("Recommendation ledger", "Signed bundles validated locally before apply.", [
        h.button([h.Type("button"), h.DataAttribute("system-extensions-download", ""), h.OnClick(Message.SystemExtensionsDownloadRequested({})), h.Class(primaryButton + " mb-4")], ["Download & validate latest"]),
        h.p([h.Class(supporting)], ["No recommendation bundles downloaded."]),
        state?.systemExtensionsMessage === undefined ? null : h.p([h.Role("status"), h.Class("mt-3 text-xs text-muted-foreground")], [state.systemExtensionsMessage]),
      ], h),
    ]),
    card("Replay automation", "Replay automation is configured per extension and reported by the host.", [
      h.p([h.Class(supporting)], ["Replay automation status is unavailable or has not been observed yet."]),
    ], h),
    card("Extension inventory", "Canonical packages on this host. Modes change the extension boundary without becoming contribution policy.", [
      readback.rows.length === 0
        ? h.p([h.Class(supporting)], ["No extension packages are installed."])
        : h.div([h.Class("overflow-x-auto"), h.DataAttribute("extension-inventory-table", "")], [h.table([h.Class("min-w-full text-left text-sm")], [
            h.thead([], [h.tr([], ["Extension", "Lifecycle", "Mode", "Health", "Actions"].map((title) => h.th([h.Class("pb-3 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground")], [title])))]),
            h.tbody([], readback.rows.map((row) => h.tr([], [h.td([h.Class("py-3 pr-4 font-mono text-[13px] text-foreground")], [row.label]), h.td([h.Class("py-3 pr-4 text-muted-foreground")], [row.meta.length === 0 ? "—" : row.meta]), h.td([h.Class("py-3 pr-4 text-foreground")], [row.value]), h.td([h.Class("py-3 pr-4 text-muted-foreground")], ["reported"]), h.td([h.Class("py-3")], [h.button([h.Type("button"), h.DataAttribute("system-extensions-pause", row.id), h.OnClick(Message.SystemExtensionsPauseRequested({ extensionId: row.id })), h.Class(secondaryButton)], ["Pause"])])]))),
          ])]),
    ], h),
  ]);
};
