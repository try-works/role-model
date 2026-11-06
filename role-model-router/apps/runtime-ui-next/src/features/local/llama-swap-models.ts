import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { Message } from "../../message";
import type { ReadbackState } from "../../readback";
import { card, table } from "../s563-layout";

const fieldClass =
  "h-[34px] w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground outline-none";
const primaryButton =
  "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-primary px-3 font-sans text-sm font-medium text-primary-foreground";
const secondaryButton =
  "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground";

export interface LlamaSwapModelsState {
  readonly localLlamaSwapMessage?: string;
  readonly localLlamaSwapModelId?: string;
}

export const localLlamaModelsPage = (
  readback: ReadbackState,
  h: HtmlBuilder<Message>,
  state?: LlamaSwapModelsState,
): Html => {
  const modelId = state?.localLlamaSwapModelId ?? "";
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta]);
  const status = readback.status === "idle" ? "loading" : readback.status;
  return h.div(
    [
      h.Class("space-y-8"),
      h.DataAttribute("route", "local-llama-swap-models"),
      h.DataAttribute("page-layout", "reference"),
      h.DataAttribute("final-family-state", status),
      h.DataAttribute("readback-state", status),
    ],
    [
      h.svg(
        [h.Class("mt-3 h-10 w-full text-[var(--rm-accent)]")],
        [h.rect([], []), h.rect([], [])],
      ),
      status === "error"
        ? h.p(
            [h.Role("alert"), h.Class("text-sm leading-5 text-muted-foreground")],
            [`llama-swap models read failed: ${readback.message ?? "unknown error"}`],
          )
        : null,
      card(
        "Load model",
        "Model must already be declared in runtime config. Loading triggers llama-swap to start or swap to this model instead of inventing a separate registration flow.",
        [
          h.label(
            [h.Class("space-y-2 font-sans text-xs leading-4 text-foreground")],
            [
              "Model ID",
              h.input([
                h.Id("llama-swap-model-id"),
                h.Value(modelId),
                h.Placeholder("lfm2.5-8b-a1b"),
                h.Class(fieldClass),
                h.OnInput((next) => Message.LocalLlamaSwapModelIdChanged({ value: next })),
              ]),
            ],
          ),
          h.div(
            [h.Class("mt-4 flex flex-wrap items-center gap-3")],
            [
              h.button(
                [
                  h.Type("button"),
                  h.DataAttribute("llama-swap-load", ""),
                  h.OnClick(Message.LocalLlamaSwapModelLoadRequested({})),
                  h.Class(primaryButton),
                ],
                ["Load model"],
              ),
              h.a(
                [h.Href("/runtime/config"), h.Role("button"), h.Class(secondaryButton)],
                ["Open runtime config"],
              ),
              h.button(
                [
                  h.Type("button"),
                  h.DataAttribute("llama-swap-all-roles", ""),
                  h.OnClick(Message.LocalLlamaSwapAllRolesRequested({})),
                  h.Class(secondaryButton),
                ],
                ["All roles"],
              ),
              state?.localLlamaSwapMessage === undefined
                ? null
                : h.p(
                    [h.Role("status"), h.Class("text-xs text-muted-foreground")],
                    [state.localLlamaSwapMessage],
                  ),
            ],
          ),
        ],
        h,
      ),
      card(
        "Role summary",
        "Loaded models and assigned route roles.",
        [
          h.p(
            [h.Class("text-sm leading-5 text-muted-foreground")],
            ["28 selected · click to clear"],
          ),
          h.p(
            [h.Class("text-sm leading-5 text-muted-foreground")],
            ["Role summary: loaded models and assigned roles are derived from the readback."],
          ),
        ],
        h,
      ),
      card(
        "Loaded models",
        "Local models declared for the managed llama-swap process.",
        [
          readback.rows.length === 0
            ? h.p(
                [h.Class("text-sm leading-5 text-muted-foreground")],
                ["No llama-swap models loaded yet."],
              )
            : table(["Model", "Status", "Detail"], rows, "No llama-swap models loaded yet.", h),
        ],
        h,
      ),
    ],
  );
};
