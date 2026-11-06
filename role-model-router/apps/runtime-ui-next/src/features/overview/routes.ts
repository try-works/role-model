import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { ChartInteractionState } from "../../chart-interaction";
import type { Message } from "../../message";
import type { OverviewFilters } from "../../overview-filters";
import type { ReadbacksState } from "../../readback";

export interface OverviewRouteContext {
  readonly chartInteraction: ChartInteractionState | undefined;
  readonly h: HtmlBuilder<Message>;
  readonly overviewFilters: OverviewFilters | undefined;
  readonly overviewWindowMs: number;
  readonly readbacks: ReadbacksState;
  readonly overviewPage: (
    readbacks: ReadbacksState["overviewMetrics"],
    routerCandidates: ReadbacksState["routerCandidates"],
    overviewWindowMs: number,
    h: HtmlBuilder<Message>,
    overviewFilters: OverviewFilters | undefined,
    chartInteraction: ChartInteractionState | undefined,
  ) => Html;
}

export const indexRoute = (ctx: OverviewRouteContext): Html =>
  ctx.overviewPage(
    ctx.readbacks.overviewMetrics,
    ctx.readbacks.routerCandidates,
    ctx.overviewWindowMs,
    ctx.h,
    ctx.overviewFilters,
    ctx.chartInteraction,
  );
