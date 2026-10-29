import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { LearningRankingState } from "./model";
import { READBACK_SPECS, type ReadbacksState, renderReadbackPage } from "../../readback";
import type { Message } from "../../message";

export interface LearningPageContext {
  readonly h: HtmlBuilder<Message>;
  readonly learningPage: (
    readbacks: ReadbacksState,
    learningRanking: LearningRankingState | undefined,
    h: HtmlBuilder<Message>,
  ) => Html;
  readonly learningRanking: LearningRankingState | undefined;
  readonly readbacks: ReadbacksState;
}

export interface LearningFamilyContext {
  readonly h: HtmlBuilder<Message>;
  readonly learningFamilyPage: (
    label: string,
    routeName: string,
    spec: Parameters<typeof renderReadbackPage>[0],
    readback: ReadbacksState[keyof ReadbacksState],
    h: HtmlBuilder<Message>,
  ) => Html;
  readonly readbacks: ReadbacksState;
}

export const learningRoute = (ctx: LearningPageContext): Html =>
  ctx.learningPage(ctx.readbacks, ctx.learningRanking, ctx.h);

export const learningConfigurationRoute = (ctx: LearningFamilyContext): Html =>
  ctx.learningFamilyPage("Learning configuration", "learning-configuration", READBACK_SPECS.learningConfiguration, ctx.readbacks.learningConfiguration, ctx.h);

export const learningPacksRoute = (ctx: LearningFamilyContext): Html =>
  ctx.learningFamilyPage("Learning packs", "learning-packs", READBACK_SPECS.learningPacks, ctx.readbacks.learningPacks, ctx.h);

export const learningDecisionsRoute = (ctx: LearningFamilyContext): Html =>
  ctx.learningFamilyPage("Learning decisions", "learning-decisions", READBACK_SPECS.learningDecisions, ctx.readbacks.learningDecisions, ctx.h);

export const learningEvidenceRoute = (ctx: LearningFamilyContext): Html =>
  ctx.learningFamilyPage("Learning evidence", "learning-evidence", READBACK_SPECS.learningEvidence, ctx.readbacks.learningEvidence, ctx.h);

export const learningHistoryRoute = (ctx: LearningFamilyContext): Html =>
  ctx.learningFamilyPage("Learning history", "learning-history", READBACK_SPECS.learningHistory, ctx.readbacks.learningHistory, ctx.h);
