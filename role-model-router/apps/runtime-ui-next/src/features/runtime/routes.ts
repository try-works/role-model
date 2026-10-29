import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { Model } from "../../model";
import type { ReadbacksState } from "../../readback";
import type { Message } from "../../message";

export interface RuntimeRouteContext {
  readonly h: HtmlBuilder<Message>;
  readonly readbacks: ReadbacksState;
  readonly runtimeConfigEditor: Model["runtimeConfigEditor"];
  readonly runtimeConfigPage: (
    state: Model["runtimeConfigEditor"],
    configReadback: ReadbacksState["runtimeConfig"],
    runtimeReadback: ReadbacksState["runtime"],
    h: HtmlBuilder<Message>,
  ) => Html;
}

export const runtimeRoute = (ctx: RuntimeRouteContext): Html =>
  ctx.runtimeConfigPage(ctx.runtimeConfigEditor, ctx.readbacks.runtimeConfig, ctx.readbacks.runtime, ctx.h);
