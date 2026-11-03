import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { Message } from "../../message";
import type { ReadbackState } from "../../readback";
import { card, table } from "../s563-layout";

const fieldLabel = "font-sans text-xs leading-4 text-foreground";
const fieldClass = "h-[34px] w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground outline-none";
const primaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-primary px-3 font-sans text-sm font-medium text-primary-foreground";
const secondaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground";

export interface LocalPeersState {
  readonly localPeersDraft?: { readonly token: string; readonly url: string };
  readonly localPeersMessage?: string;
}
export const localPeersPage = (
  readback: ReadbackState,
  h: HtmlBuilder<Message>,
  state?: LocalPeersState,
): Html => {
  const draft = state?.localPeersDraft ?? { token: "", url: "" };
  const status = state?.localPeersMessage;
  const pageStatus = readback.status === "idle" ? "loading" : readback.status;
  return h.div([h.Class("space-y-8"), h.DataAttribute("route", "local-peers"), h.DataAttribute("page-layout", "reference"), h.DataAttribute("final-family-state", pageStatus), h.DataAttribute("readback-state", pageStatus)], [
    h.svg([h.Class("mt-3 h-10 w-full text-[var(--rm-accent)]")], [h.rect([], []), h.rect([], [])]),
    pageStatus === "error" ? h.p([h.Role("alert"), h.Class("text-sm leading-5 text-muted-foreground")], ["Local peers read failed: " + (readback.message ?? "unknown error")]) : null,
    card("Local endpoints", "role-model probes each server at /v1/models before peer models can be registered.", [
      table(["Endpoint", "Status", "Type", "Actions"], readback.rows.map((row) => [row.label, row.value, "OpenAI-compatible peer", "Check health  Remove"]), "No peer endpoints configured.", h),
    ], h),
    card("Endpoint inventory", "role-model probes each server at /v1/models before peer models can be registered.", [
      readback.rows.length === 0
        ? h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No peer endpoints configured. Add a server URL below to use peer-backed models."])
        : h.div([h.Class("flex flex-col divide-y divide-border")], readback.rows.map((row) => {
            const meta = (() => { try { return JSON.parse(row.meta) as { readonly id?: string; readonly url?: string }; } catch { return {}; } })();
            const id = meta.id ?? row.id;
            return h.div([h.Class("flex flex-wrap items-center justify-between gap-3 py-3")], [
              h.div([h.Class("min-w-0")], [h.p([h.Class("font-mono text-[13px] font-semibold text-foreground")], [meta.url ?? row.label]), h.p([h.Class("text-xs text-muted-foreground")], [row.value === "auth" ? "Bearer token configured" : "No auth"])]),
              h.div([h.Class("flex gap-2")], [
                h.button([h.Type("button"), h.DataAttribute("local-peer-health", id), h.OnClick(Message.LocalPeerHealthRequested({ peerId: id })), h.Class(secondaryButton)], ["Check health"]),
                h.button([h.Type("button"), h.DataAttribute("local-peer-remove", id), h.OnClick(Message.LocalPeerRemoveRequested({ peerId: id })), h.Class(secondaryButton)], ["Remove"]),
              ]),
            ]);
          })),
    ], h),
    card("Add peer endpoint", "Register an OpenAI-compatible server; the runtime probes /v1/models before peer models appear.", [
      h.div([h.Class("grid gap-4 md:grid-cols-2")], [
        h.label([h.Class("space-y-2 " + fieldLabel)], ["Endpoint URL", h.input([h.Id("peer-url"), h.Type("url"), h.Value(draft.url), h.Placeholder("http://127.0.0.1:1234"), h.Class(fieldClass), h.OnInput((next) => Message.LocalPeerUrlChanged({ value: next }))])]),
        h.label([h.Class("space-y-2 " + fieldLabel)], ["Auth token (optional)", h.input([h.Id("peer-auth-token"), h.Type("password"), h.Value(draft.token), h.Class(fieldClass), h.OnInput((next) => Message.LocalPeerTokenChanged({ value: next }))])]),
      ]),
      h.div([h.Class("mt-4 flex flex-wrap items-center gap-3")], [h.button([h.Type("button"), h.DataAttribute("local-peer-add", ""), h.OnClick(Message.LocalPeerAddRequested({})), h.Class(primaryButton)], ["Add endpoint"]), status === undefined ? null : h.p([h.Role("status"), h.Class("text-xs text-muted-foreground")], [status])]),
    ], h),
  ]);
};
