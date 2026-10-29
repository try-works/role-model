import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { ReadbacksState } from "../../readback";
import type { StudioState } from "../../studio";
import type { Message } from "../../message";

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

export const studioRoute = (ctx: StudioRouteContext): Html =>
  ctx.studioPage(
    ctx.studio,
    ctx.h,
    ctx.readbacks.configuredModels.status === "ok"
      ? ctx.readbacks.configuredModels.rows.map((entry) => entry.id).filter((id) => id.length > 0)
      : [],
  );
