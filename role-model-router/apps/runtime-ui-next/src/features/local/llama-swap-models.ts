import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { Message } from "../../message";
import type { ReadbackState } from "../../readback";
import { card, table } from "../s563-layout";

const fieldClass = "h-[34px] w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground outline-none";
const primaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-primary px-3 font-sans text-sm font-medium text-primary-foreground";
const secondaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground";

export interface LlamaSwapModelsState {
  readonly localLlamaSwapMessage?: string;
  readonly localLlamaSwapModelId?: string;
}

export const localLlamaModelsPage = (readback: ReadbackState, h: HtmlBuilder<Message>, state?: LlamaSwapModelsState): Html => {
  const modelId = state?.localLlamaSwapModelId ?? "";
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta]);
  return h.div([h.Class("space-y-8"), h.DataAttribute("route", "local-llama-swap-models"), h.DataAttribute("page-layout", "reference")], [
    card("Load llama-swap model", "Model must already be declared in runtime config. Loading triggers llama-swap to start or swap to this model instead of inventing a separate registration flow.", [
      h.label([h.Class("space-y-2 font-sans text-xs leading-4 text-foreground")], ["Model ID", h.input([h.Id("llama-swap-model-id"), h.Value(modelId), h.Placeholder("lfm2.5-8b-a1b"), h.Class(fieldClass), h.OnInput((next) => Message.LocalLlamaSwapModelIdChanged({ value: next }))])]),
      h.div([h.Class("mt-4 flex flex-wrap items-center gap-3")], [
        h.button([h.Type("button"), h.DataAttribute("llama-swap-load", ""), h.OnClick(Message.LocalLlamaSwapModelLoadRequested({})), h.Class(primaryButton)], ["Load model"]),
        h.button([h.Type("button"), h.DataAttribute("llama-swap-all-roles", ""), h.OnClick(Message.LocalLlamaSwapAllRolesRequested({})), h.Class(secondaryButton)], ["All roles"]),
        state?.localLlamaSwapMessage === undefined ? null : h.p([h.Role("status"), h.Class("text-xs text-muted-foreground")], [state.localLlamaSwapMessage]),
      ]),
    ], h),
    card("llama-swap models", "Local models declared for the managed llama-swap process.", [
      readback.rows.length > 0 ? table(["Model", "Status", "Detail"], rows, "No llama-swap models available.", h) : h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No llama-swap models available."]),
    ], h),
  ]);
};
