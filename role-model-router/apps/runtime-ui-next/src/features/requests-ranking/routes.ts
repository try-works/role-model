import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { READBACK_SPECS, type ReadbacksState, renderReadbackPage } from "../../readback";
import type { Message } from "../../message";
import {
  REQUESTS_RANKING_METRIC_OPTIONS,
  REQUESTS_RANKING_TARGET_OPTIONS,
  type RequestsRankingState,
} from "./model";
import { renderRequestsRanking } from "./view";

export interface RequestsRouteContext {
  readonly h: HtmlBuilder<Message>;
  readonly readbacks: ReadbacksState;
  readonly requestsRanking: RequestsRankingState | undefined;
  readonly requestsRankingMetricListbox: unknown;
  readonly requestsRankingTargetListbox: unknown;
}

export const requestsRoute = (ctx: RequestsRouteContext): Html =>
  ctx.h.section([], [
    renderRequestsRanking(ctx.requestsRanking, ctx.requestsRankingMetricListbox, ctx.requestsRankingTargetListbox, REQUESTS_RANKING_METRIC_OPTIONS, REQUESTS_RANKING_TARGET_OPTIONS, ctx.h),
    renderReadbackPage(READBACK_SPECS.requests, ctx.readbacks.requests, ctx.h),
  ]);
