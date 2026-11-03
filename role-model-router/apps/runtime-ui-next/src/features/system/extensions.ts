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
  h.div([h.Class("space-y-6"), h.DataAttribute("route", "system-extensions"), h.DataAttribute("page-layout", "reference")], [
    card("Installed extensions", "Extension lifecycle is host-managed; the runtime remains the source of truth.", [
      readback.rows.length === 0
        ? h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No extensions recorded."])
        : table(["Extension", "Mode", "Detail"], readback.rows.map((row) => [row.label, row.value, row.meta]), "No extensions recorded.", h),
    ], h),
    card("Replay automation", "Replay automation is configured per extension and reported by the host.", [
      h.div([h.Class("flex flex-wrap items-center gap-2")], [
        h.button([h.Type("button"), h.DataAttribute("system-extensions-pause", ""), h.OnClick(Message.SystemExtensionsPauseRequested({})), h.Class(secondaryButton)], ["Pause"]),
      ]),
    ], h),
    card("Recommendation ledger", "Signed bundles validated locally before apply.", [
      h.button([h.Type("button"), h.DataAttribute("system-extensions-download", ""), h.OnClick(Message.SystemExtensionsDownloadRequested({})), h.Class(primaryButton + " mb-4")], ["Download & validate latest"]),
      state?.systemExtensionsMessage === undefined ? null : h.p([h.Role("status"), h.Class("text-xs text-muted-foreground")], [state.systemExtensionsMessage]),
    ], h),
  ]);
