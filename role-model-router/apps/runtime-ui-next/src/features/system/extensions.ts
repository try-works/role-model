import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { Message } from "../../message";
import type { ReadbackState } from "../../readback";
import { card, table } from "../s563-layout";

const secondaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground";
const primaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-primary px-3 font-sans text-sm font-medium text-primary-foreground";

export interface SystemExtensionsState {
  readonly systemExtensionsMessage?: string;
}

export const systemExtensionsPage = (readback: ReadbackState, h: HtmlBuilder<Message>, state?: SystemExtensionsState): Html =>
  h.div([h.Class("space-y-6"), h.DataAttribute("route", "system-extensions"), h.DataAttribute("page-layout", "reference"), h.DataAttribute("final-family-state", readback.status === "idle" ? "loading" : readback.status), h.DataAttribute("readback-state", readback.status === "idle" ? "loading" : readback.status)], [
    h.svg([h.Class("mt-3 h-10 w-full text-[var(--rm-accent)]")], [h.rect([], []), h.rect([], [])]),
    readback.status === "error" ? h.p([h.Role("alert"), h.Class("text-sm leading-5 text-muted-foreground")], ["Extensions read failed: " + (readback.message ?? "unknown error")]) : null,
    card("Extension boundary", "The host enforces the extension boundary before any extension runs.", [
      h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["Contribution posture and extension inventory are read from the host."]),
    ], h),
    card("Installed extensions", "Extension lifecycle is host-managed; the runtime remains the source of truth.", [
      readback.rows.length === 0
        ? h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No extensions recorded."])
        : h.div([h.Class("flex flex-col divide-y divide-border")], readback.rows.map((row) => h.div([h.Class("flex flex-wrap items-center justify-between gap-3 py-3")], [
            h.div([h.Class("min-w-0")], [h.p([h.Class("font-mono text-[13px] font-semibold text-foreground")], [row.label]), h.p([h.Class("text-xs text-muted-foreground")], [row.value + " · " + row.meta])]),
            h.button([h.Type("button"), h.DataAttribute("system-extensions-pause", row.id), h.OnClick(Message.SystemExtensionsPauseRequested({ extensionId: row.id })), h.Class(secondaryButton)], ["Pause"]),
          ]))),
    ], h),
    card("Replay automation", "Replay automation is configured per extension and reported by the host.", [
      h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["Pause acts on the extension row you choose above."]),
    ], h),
    card("Extension inventory", "Extensions installed on this host and their lifecycle state.", [
      readback.rows.length === 0 ? h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No extension inventory rows recorded."]) : h.p([h.Class("text-sm leading-5 text-muted-foreground")], [String(readback.rows.length) + " extension(s) installed."]),
    ], h),
    card("Recommendation ledger", "Signed bundles validated locally before apply.", [
      h.button([h.Type("button"), h.DataAttribute("system-extensions-download", ""), h.OnClick(Message.SystemExtensionsDownloadRequested({})), h.Class(primaryButton + " mb-4")], ["Download & validate latest"]),
      state?.systemExtensionsMessage === undefined ? null : h.p([h.Role("status"), h.Class("text-xs text-muted-foreground")], [state.systemExtensionsMessage]),
    ], h),
  ]);
