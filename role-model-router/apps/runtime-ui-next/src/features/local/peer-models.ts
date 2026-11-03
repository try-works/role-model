import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { Message } from "../../message";
import type { ReadbackState } from "../../readback";
import { card, table } from "../s563-layout";

const fieldClass = "h-[34px] w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground outline-none";
const primaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-primary px-3 font-sans text-sm font-medium text-primary-foreground";

export interface PeerModelsState {
  readonly localPeerModelId?: string;
  readonly localPeerModelMessage?: string;
}

export const localPeerModelsPage = (readback: ReadbackState, h: HtmlBuilder<Message>, state?: PeerModelsState): Html => {
  const modelId = state?.localPeerModelId ?? "";
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta]);
  return h.div([h.Class("space-y-8"), h.DataAttribute("route", "local-peer-models"), h.DataAttribute("page-layout", "reference")], [
    h.svg([h.Class("mt-3 h-10 w-full text-[var(--rm-accent)]")], [h.rect([], []), h.rect([], [])]),
    card("Register model", "Register a model id from a configured peer catalog; the runtime probes the peer before registering it.", [
      h.label([h.Class("space-y-2 font-sans text-xs leading-4 text-foreground")], ["Model id", h.input([h.Id("peer-model-id"), h.Value(modelId), h.Placeholder("openai/gpt-4.1"), h.Class(fieldClass), h.OnInput((next) => Message.LocalPeerModelIdChanged({ value: next }))])]),
      h.div([h.Class("mt-4 flex flex-wrap items-center gap-3")], [
        h.button([h.Type("button"), h.DataAttribute("local-peer-model-load", ""), h.OnClick(Message.LocalPeerModelLoadRequested({})), h.Class(primaryButton)], ["Load model"]),
        state?.localPeerModelMessage === undefined ? null : h.p([h.Role("status"), h.Class("text-xs text-muted-foreground")], [state.localPeerModelMessage]),
      ]),
    ], h),
    card("Registered models", "Models currently registered with the router from peer endpoints.", [
      readback.rows.length > 0 ? table(["Model", "State", "Detail"], rows, "No peer models registered yet.", h) : h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No peer models registered yet. Add an endpoint first, then register a model id from that peer catalog."]),
    ], h),
  ]);
};
