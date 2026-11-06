import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { Message } from "../../message";
import type { ReadbacksState } from "../../readback";
import type { StudioState } from "../../studio";
import { card } from "../s563-layout";

export interface StudioRouteContext {
  readonly h: HtmlBuilder<Message>;
  readonly readbacks: ReadbacksState;
  readonly studio: StudioState;
  readonly studioPage: (
    state: StudioState,
    h: HtmlBuilder<Message>,
    configuredModels?: readonly string[],
  ) => Html;
}

type Field = "mode" | "model" | "prompt" | "query" | "documents" | "size" | "advancedBody";

const labelClass = "mb-4 flex flex-col gap-1 font-sans text-xs leading-4 text-foreground";
const controlClass =
  "h-[34px] w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground";
const textClass =
  "w-full rounded-md border border-input bg-secondary p-2 font-mono text-sm text-foreground";

const field = (
  label: string,
  fieldName: Field,
  value: string,
  h: HtmlBuilder<Message>,
  textarea = false,
  height = "min-h-10",
): Html =>
  h.label(
    [h.Class(labelClass)],
    [
      label,
      textarea
        ? h.textarea([
            h.DataAttribute("studio-field", fieldName),
            h.AriaLabel(label),
            h.Class(`${textClass} ${height}`),
            h.Value(value),
            h.OnInput((next) => Message.StudioFieldChanged({ field: fieldName, value: next })),
          ])
        : h.input([
            h.DataAttribute("studio-field", fieldName),
            h.AriaLabel(label),
            h.Class(controlClass),
            h.Value(value),
            h.OnInput((next) => Message.StudioFieldChanged({ field: fieldName, value: next })),
          ]),
    ],
  );

const select = (
  label: string,
  fieldName: Field,
  value: string,
  options: ReadonlyArray<string>,
  h: HtmlBuilder<Message>,
): Html =>
  h.label(
    [h.Class(labelClass)],
    [
      label,
      h.select(
        [
          h.DataAttribute("studio-field", fieldName),
          h.AriaLabel(label),
          h.Class(controlClass),
          h.OnChange((next) => Message.StudioFieldChanged({ field: fieldName, value: next })),
        ],
        options.map((option) =>
          h.option([h.Value(option), ...(option === value ? [h.Selected(true)] : [])], [option]),
        ),
      ),
    ],
  );

const runButton = (label: string, state: StudioState, h: HtmlBuilder<Message>): Html =>
  h.button(
    [
      h.Type("button"),
      h.DataAttribute("studio-run", ""),
      ...(state.status === "loading" ? [h.AriaBusy(true), h.Disabled(true)] : []),
      h.OnClick(Message.StudioRunRequested({ token: state.token + 1 })),
      h.Class(
        "mt-2 inline-flex h-[34px] w-full items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground",
      ),
    ],
    [label],
  );

const responseBox = (state: StudioState, empty: string, h: HtmlBuilder<Message>): Html => {
  const raw = state.status === "success" || state.status === "error" ? state.responseText : "";
  return h.div(
    [h.DataAttribute("studio-response", ""), h.DataAttribute("studio-raw", state.status)],
    [
      h.pre(
        [
          h.Class(
            "min-h-[240px] whitespace-pre-wrap rounded-lg border border-border bg-secondary p-4 font-mono text-xs leading-5 text-foreground",
          ),
        ],
        [raw.length > 0 ? raw : empty],
      ),
    ],
  );
};

const resultBody = (state: StudioState, h: HtmlBuilder<Message>): Html => {
  const raw = state.status === "success" || state.status === "error" ? state.responseText : "";
  if (state.status === "error") {
    return h.div(
      [
        h.Role("alert"),
        h.DataAttribute("studio-error", ""),
        h.DataAttribute("studio-raw", "error"),
      ],
      [
        h.p(
          [h.Class("font-mono text-xs uppercase tracking-[0.08em] text-[var(--rm-error)]")],
          [`HTTP ${String(state.statusCode)}`],
        ),
        h.pre(
          [
            h.Class(
              "mt-2 whitespace-pre-wrap rounded-lg border border-border bg-secondary p-4 font-mono text-xs leading-5 text-foreground",
            ),
          ],
          [state.responseText],
        ),
      ],
    );
  }
  switch (state.tab) {
    case "images":
      return h.div(
        [h.DataAttribute("studio-result-stage", "images")],
        [
          h.p(
            [
              h.Class(
                "font-mono text-[11px] uppercase leading-4 tracking-[0.08em] text-muted-foreground",
              ),
            ],
            ["GENERATED IMAGES"],
          ),
          h.p(
            [h.Class("mt-2 text-sm leading-5 text-muted-foreground")],
            ["Run an image request to populate the result stage."],
          ),
          h.p(
            [
              h.Class(
                "mt-4 font-mono text-[11px] uppercase leading-4 tracking-[0.08em] text-muted-foreground",
              ),
            ],
            ["RAW RESPONSE"],
          ),
          h.pre(
            [
              h.Class(
                "mt-2 min-h-[240px] whitespace-pre-wrap rounded-lg border border-border bg-secondary p-4 font-mono text-xs leading-5 text-foreground",
              ),
            ],
            [raw.length > 0 ? raw : '{ "status": "No image request yet" }'],
          ),
        ],
      );
    case "audio":
      return h.div(
        [h.DataAttribute("studio-result-stage", "audio")],
        [
          h.p(
            [h.Class("text-sm leading-5 text-muted-foreground")],
            ["Run a speech or transcription request to populate the audio stage."],
          ),
          h.p(
            [
              h.Class(
                "mt-4 font-mono text-[11px] uppercase leading-4 tracking-[0.08em] text-muted-foreground",
              ),
            ],
            ["VOICE INVENTORY"],
          ),
          h.p(
            [h.Class("mt-2 text-sm leading-5 text-muted-foreground")],
            ["Voice inventory is unavailable on this runtime host."],
          ),
        ],
      );
    case "rerank":
      return h.div(
        [h.DataAttribute("studio-result-stage", "rerank")],
        [
          h.p(
            [h.Class("text-sm leading-5 text-muted-foreground")],
            ["Submit a rerank request to populate ordered scores."],
          ),
          h.p(
            [
              h.Class(
                "mt-4 font-mono text-[11px] uppercase leading-4 tracking-[0.08em] text-muted-foreground",
              ),
            ],
            ["CONTRACT DETAILS"],
          ),
          h.pre(
            [
              h.Class(
                "mt-2 min-h-[240px] whitespace-pre-wrap rounded-lg border border-border bg-secondary p-4 font-mono text-xs leading-5 text-foreground",
              ),
            ],
            [raw.length > 0 ? raw : '{ "status": "No rerank request yet" }'],
          ),
        ],
      );
    case "advanced":
      return h.div(
        [h.DataAttribute("studio-result-stage", "advanced")],
        [
          h.pre(
            [
              h.Class(
                "min-h-[220px] whitespace-pre-wrap rounded-lg border border-border bg-secondary p-4 font-mono text-xs leading-5 text-foreground",
              ),
            ],
            [raw.length > 0 ? raw : '{ "status": "No advanced request yet" }'],
          ),
          h.p(
            [
              h.Class(
                "mt-4 font-mono text-[11px] uppercase leading-4 tracking-[0.08em] text-muted-foreground",
              ),
            ],
            ["REQUEST TEMPLATE"],
          ),
          h.pre(
            [
              h.Class(
                "mt-2 min-h-[120px] whitespace-pre-wrap rounded-lg border border-border bg-secondary p-4 font-mono text-xs leading-5 text-foreground",
              ),
            ],
            [
              '{ "model": "deepseek.personal.deepseek-api-key.global.deepseek-flash-high", "input": "Explain the current contract family." }',
            ],
          ),
        ],
      );
    default:
      return h.div(
        [h.DataAttribute("studio-result-stage", "chat")],
        [
          raw.length > 0
            ? responseBox(state, "No result yet.", h)
            : h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No result yet."]),
        ],
      );
  }
};

export const studioRoute = (ctx: StudioRouteContext): Html => {
  const { h, studio: state } = ctx;
  const models =
    ctx.readbacks.configuredModels.status === "ok"
      ? ctx.readbacks.configuredModels.rows
          .map((row) => row.label || row.id)
          .filter((value) => value.length > 0)
      : [];
  const modelOptions = models.length > 0 ? models : [state.model];
  const left = (() => {
    switch (state.tab) {
      case "images":
        return card(
          "Image request modes",
          undefined,
          [
            h.span([h.Class("hidden")], ["Image request modes · Mode"]),
            select(
              "Mode",
              "mode",
              state.mode || "OpenAI-style generation",
              ["OpenAI-style generation", "SDAPI"],
              h,
            ),
            field("Model", "model", state.model, h),
            field("Prompt", "prompt", state.prompt, h, true, "min-h-10"),
            select("Size", "size", state.size || "1024x1024", ["1024x1024", "512x512"], h),
            runButton("Run image request", state, h),
          ],
          h,
        );
      case "audio":
        return card(
          "Audio mode and request",
          undefined,
          [
            h.span([h.Class("hidden")], ["Audio mode and request · Mode"]),
            select(
              "Mode",
              "mode",
              state.mode || "Speech synthesis",
              ["Speech synthesis", "Transcription"],
              h,
            ),
            field("Model", "model", state.model, h),
            select("Voice", "mode", "Select…", ["Select…", "Alloy", "Nova"], h),
            field("Input", "prompt", state.prompt, h, true, "min-h-[60px]"),
            runButton("Run audio request", state, h),
          ],
          h,
        );
      case "rerank":
        return card(
          "Rerank request",
          undefined,
          [
            h.span([h.Class("hidden")], ["Contract /v1/rerank"]),
            select("Contract", "mode", "/v1/rerank", ["/v1/rerank"], h),
            field("Model", "model", state.model, h),
            field("Query", "query", state.query, h, true, "min-h-10"),
            field("Candidate documents", "documents", state.documents, h, true, "min-h-20"),
            runButton("Submit rerank request", state, h),
          ],
          h,
        );
      case "advanced":
        return card(
          "Endpoint family",
          undefined,
          [
            select("Family", "mode", "Responses", ["Responses", "Messages", "Embeddings"], h),
            field("Model", "model", state.model, h),
            field("JSON payload", "advancedBody", state.advancedBody, h, true, "min-h-20"),
            runButton("Submit advanced request", state, h),
          ],
          h,
        );
      default:
        return card(
          "Request",
          undefined,
          [
            field("Model", "model", state.model, h),
            field("Prompt", "prompt", state.prompt, h, true, "min-h-10"),
            runButton("Run request", state, h),
          ],
          h,
        );
    }
  })();
  const rightTitle =
    state.tab === "images"
      ? "Image result stage"
      : state.tab === "audio"
        ? "Audio result stage"
        : state.tab === "rerank"
          ? "Ranked results"
          : state.tab === "advanced"
            ? "Response workspace"
            : "Result workspace";
  return h.section(
    [
      h.Class("rm3-next-route"),
      h.DataAttribute("route", "studio"),
      h.DataAttribute("studio-state", state.status),
      h.DataAttribute("page-layout", "reference"),
    ],
    [
      h.div(
        [h.Class("grid items-start gap-4 xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]")],
        [left, card(rightTitle, undefined, [resultBody(state, h)], h)],
      ),
    ],
  );
};
