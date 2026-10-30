import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { Message } from "../../message";
import { READBACK_SPECS, type ReadbackState, renderReadbackPage } from "../../readback";
import type { LearningRankingState } from "../learning-ranking/model";
import { referenceCard, referenceDescription, referenceSection, referenceTable } from "../layout/reference";

const stateOf = (readback: ReadbackState): string => (readback.status === "idle" ? "loading" : readback.status);

const fieldClass = "mt-1 h-[34px] w-full rounded-md border border-input bg-secondary px-2.5 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground";

const operatorToken = (id: string, h: HtmlBuilder<Message>): Html =>
  h.label([h.Class("block font-sans text-xs leading-4 text-foreground")], [
    "Operator token",
    h.input([
      h.Id(id),
      h.Type("password"),
      h.AriaLabel("Operator token"),
      h.Attribute("placeholder", "Not needed on this machine — only for other clients"),
      h.Class(fieldClass),
    ]),
    h.span([h.Class("mt-1 block text-xs leading-4 text-[var(--rm-muted)]")], [
      "This machine's owner is trusted: readbacks, policy changes, pack activation/rollback and the kill switch all work here without a token. Set one only for clients that are not the device owner — the value is the runtime's ",
      h.span([h.Class("font-mono")], ["--operator-auth-token"]),
      ", and a runtime exposed beyond loopback still requires it.",
    ]),
  ]);

const loading = (message: string, h: HtmlBuilder<Message>, extra = ""): Html =>
  h.p([h.Class("rounded-lg border border-dashed border-border bg-secondary p-6 text-sm leading-5 text-[var(--rm-muted)] " + extra), h.Role("status")], [message]);

const hiddenTable = (table: Html, h: HtmlBuilder<Message>): Html => h.div([h.Class("hidden")], [table]);

const livePanel = (h: HtmlBuilder<Message>): Html =>
  h.section([h.Class("rounded-lg border border-[var(--rm-border-strong)] bg-[var(--rm-surface)]"), h.AriaLabel("Live replay and evaluation")], [
    h.div([h.Class("flex flex-wrap items-start justify-between gap-3 border-b border-[var(--rm-border)] p-4")], [
      h.div([h.Class("flex items-start gap-3")], [
        h.span([h.Class("flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-[var(--rm-border-strong)] text-[var(--rm-muted)]")], [
          h.svg([h.Attribute("viewBox", "0 0 16 16"), h.Attribute("width", "16"), h.Attribute("height", "16"), h.Attribute("fill", "none"), h.Attribute("stroke", "currentColor"), h.Attribute("stroke-width", "1.5")], [h.path([h.Attribute("d", "M1 8h3l2-5 3 10 2-5h4")], [])]),
        ]),
        h.div([h.Class("space-y-1")], [
          h.h2([h.Class("text-sm font-semibold text-[var(--rm-fg)]")], ["Live replay & evaluation"]),
          h.p([h.Class("font-mono text-xs text-[var(--rm-muted)]")], ["scope not set · last 60m · reading"]),
        ]),
      ]),
      h.span([h.Class("rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground")], ["loading"]),
    ]),
    h.div([h.Class("p-4")], [loading("Reading live replay and evaluation state", h)]),
  ]);

const page = (title: string, routeName: string, readback: ReadbackState, description: string, children: ReadonlyArray<Html>, h: HtmlBuilder<Message>): Html =>
  referenceSection(routeName, stateOf(readback), [
    referenceCard(title, description, [
      operatorToken("learning-" + routeName + "-token", h),
      ...(readback.status === "error" ? [h.p([h.Role("alert"), h.Class("mt-3 text-sm text-[var(--rm-error)]")], [readback.message ?? (title + " read failed")])] : []),
      h.div([h.Class("mt-4")], children),
    ], h),
  ], h);

const table = (headers: ReadonlyArray<string>, rows: ReadonlyArray<ReadonlyArray<string>>, emptyText: string, h: HtmlBuilder<Message>): Html =>
  referenceTable(headers, rows, emptyText, h, "learning");

export const learningOverviewRoute = (readback: ReadbackState, replayJobs: ReadbackState, evaluationJobs: ReadbackState, ranking: LearningRankingState | undefined, h: HtmlBuilder<Message>): Html => {
  void replayJobs;
  void evaluationJobs;
  void ranking;
  return referenceSection("learning", stateOf(readback), [
    referenceCard("Learning overview", "What the learning loop is doing right now, read from durable state.", [
      operatorToken("learning-overview-token", h),
      h.div([h.Class("mt-4")], [loading("Loading learning state…", h)]),
    ], h),
    livePanel(h),
    referenceCard("Recent decisions", "The newest replay decisions among the last 0 observations; the selection follows the configured activation stage. Each row is one decision with its observation count.", [
      loading("Loading learning state…", h),
    ], h),
  ], h);
};

export const learningConfigurationRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html =>
  page("Learning configuration", "learning-configuration", readback, "Every activation parameter with its current value, unit, default and allowed range. Bounds are enforced here and again on the server.", [
    h.div([h.Class("mt-4")], [loading("Loading learning state…", h, "min-h-[175px]")]),
  ], h);

export const learningPacksRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta]);
  return page("Learned packs", "learning-packs", readback, "Candidate and pack records with their validation receipts, holdout evidence and activation state.", [
    h.h3([h.Class("text-[11px] font-normal uppercase leading-4 tracking-[0.08em] text-[var(--rm-muted)]")], ["ENDPOINT LADDER INDEX"]),
    referenceDescription("One row per role · task: the top three ranked endpoints, how many configured endpoints are admitted, the per-task full-ranking detail, and the Activate / Roll back toggle.", h),
    loading("Loading learning state…", h),
    hiddenTable(table(["ROLE · TASK", "TOP ENDPOINTS", "ACTIVATION"], rows, "Loading learning state…", h), h),
    h.h3([h.Class("mt-6 text-[11px] font-normal uppercase leading-4 tracking-[0.08em] text-[var(--rm-muted)]")], ["TASK-SCOPED LEARNED PACKS"]),
    loading("Loading learning state…", h),
    hiddenTable(table(["PACK", "VALIDATION", "STATE"], rows, "No task-scoped pack records returned by the operator readback.", h), h),
    h.div([h.Class("mt-6 flex flex-wrap gap-2")], [
      h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Roll back active pack (scope-wide)"]),
      h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Engage kill switch"]),
      h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Release kill switch"]),
    ]),
  ], h);
};

export const learningDecisionsRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta.includes("shadow") ? "shadow" : "live", row.meta]);
  const select = (label: string, options: ReadonlyArray<string>): Html =>
    h.label([h.Class("flex flex-col gap-1 font-sans text-xs leading-4 text-muted-foreground")], [
      label,
      h.select([h.AriaLabel(label + " " + options.join(" ")), h.Class("h-[34px] rounded-md border border-input bg-secondary px-3 text-sm text-foreground")], options.map((option) => h.option([], [option]))),
    ]);
  return page("Decision receipts", "learning-decisions", readback, "Every adjudicated decision with its evidence in columns, and the receipt chain each one produced.", [
    h.div([h.Class("grid gap-4 md:grid-cols-3")], [
      select("Role", ["all roles"]), select("Task", ["all tasks"]), select("Outcome", ["all outcomes"]),
      select("Advisory state", ["all", "fresh", "stale", "unavailable"]), select("Observation origin", ["live", "shadow", "all"]),
    ]),
    h.div([h.Class("mt-4")], [loading("Loading learning state…", h), hiddenTable(table(["DECISION", "OUTCOME", "ORIGIN", "EVIDENCE"], rows, "Loading learning state…", h), h)]),
  ], h);
};

export const learningEvidenceRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta]);
  return referenceSection("learning-evidence", stateOf(readback), [
    referenceCard("Evidence", "Baseline-versus-advisory comparison on the paired holdout distribution with the guardrail verdicts.", [
      operatorToken("learning-evidence-token", h),
      h.div([h.Class("mt-4")], [loading("Loading learning state…", h)]),
      hiddenTable(table(["Guardrail", "Bound", "Observed", "Verdict"], [], "No guardrail rows recorded yet.", h), h),
    ], h),
    referenceCard("Evidence loss by reason", "Per-family evidence against the operator's floor and the learner's exclusions, read from the validation receipts the runtime recorded.", [
      operatorToken("learning-evidence-loss-token", h),
      h.div([h.Class("mt-4")], [loading("Loading learning state…", h)]),
      hiddenTable(table(["REASON", "COUNT", "DETAIL"], rows, "No evidence-loss rows recorded yet.", h), h),
    ], h),
  ], h);
};

export const learningHistoryRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta]);
  return page("Learning history", "learning-history", readback, "What the replay, evaluation and learning loop did over the window, read from durable state.", [
    loading("Loading learning state…", h),
    hiddenTable(table(["BUCKET", "VALUE", "DETAIL"], rows, "No learning-history rows recorded yet.", h), h),
  ], h);
};
