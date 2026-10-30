import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import type { ChartSeries } from "@role-model/ui/foldkit-chart";

import type { Message } from "../../message";
import { READBACK_SPECS, type ReadbackState, renderReadbackPage } from "../../readback";
import type { LearningRankingState } from "../learning-ranking/model";
import { telemetryChartCard } from "../overview/charts";
import { referenceCard, referenceDescription, referenceFilterBar, referenceSection, referenceSelect, referenceTable } from "../layout/reference";

const operatorTokenEnvelope = (h: HtmlBuilder<Message>): Html =>
  h.div([h.Class("mt-3 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] p-3")], [
    h.p([h.Class("text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]")], ["Operator token"]),
    h.p([h.Class("mt-1 max-w-[90ch] text-[12px] leading-5 text-[var(--rm-secondary)]")], [
      "This machine's owner is trusted: readbacks, policy changes, pack activation/rollback and the kill switch all work here without a token. Set one only for clients that are not the device owner — the value is the runtime's --operator-auth-token, and a runtime exposed beyond loopback still requires it.",
    ]),
  ]);

const stateOf = (readback: ReadbackState): string => (readback.status === "idle" ? "loading" : readback.status);

const page = (title: string, routeName: string, readback: ReadbackState, children: ReadonlyArray<Html>, h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Class("rm3-next-route space-y-6"), h.DataAttribute("route", routeName), h.DataAttribute("learning-family-state", stateOf(readback)), h.DataAttribute("page-layout", "reference"), h.DataAttribute("page-state", stateOf(readback))],
    [referenceCard(title, undefined, [
      ...(readback.status === "error" ? [h.p([h.Role("alert"), h.Class("mt-1 text-xs text-[var(--rm-error)]")], [readback.message ?? (title + " read failed")])] : []),
      operatorTokenEnvelope(h),
      ...children,
    ], h)],
  );

const subhead = (label: string, h: HtmlBuilder<Message>): Html =>
  h.h3([h.Class("mt-4 text-sm font-medium leading-5 tracking-tight text-foreground")], [label]);

const table = (headings: ReadonlyArray<string>, rows: ReadonlyArray<ReadonlyArray<string>>, emptyText: string, h: HtmlBuilder<Message>): Html =>
  referenceTable(headings, rows, emptyText, h, "learning");

const emptySeries = (id: string, label: string): ReadonlyArray<ChartSeries> => [{ id, label, points: [{ label: "No data", value: null }] }];

const chart = (title: string, description: string, emptyMessage: string, h: HtmlBuilder<Message>): Html =>
  telemetryChartCard({ description, emptyMessage, hasData: false, h, kind: "line", series: emptySeries(title.toLowerCase().replace(/ /g, "-"), title), state: "empty", title });

const select = (label: string, options: ReadonlyArray<string>, h: HtmlBuilder<Message>): Html => referenceSelect(label, options, h);

export const learningOverviewRoute = (readback: ReadbackState, replayJobs: ReadbackState, evaluationJobs: ReadbackState, ranking: LearningRankingState | undefined, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta.slice(0, 80)]);
  return referenceSection("learning", stateOf(readback), [
    referenceCard("Learning overview", "What the learning loop is doing right now, read from durable state.", [
      operatorTokenEnvelope(h),
      h.svg([h.Class("mt-3 h-10 w-full text-[var(--rm-accent)]"), h.AriaLabel("Learning activity summary")], [h.rect([], []), h.rect([], [])]),
      h.div([h.Class("mt-3 flex flex-wrap items-center gap-3")], [
        h.input([h.Id("learning-operator-token"), h.Type("password"), h.AriaLabel("Operator token"), h.Class("h-[34px] rounded-md border border-input bg-secondary px-3 text-sm")]),
        h.span([h.Class("text-xs leading-4 text-muted-foreground")], [String(ranking?.phases === undefined ? 0 : Object.keys(ranking.phases).length) + " tracked ladder phase(s)"]),
      ]),
      subhead("Live replay & evaluation", h),
      referenceDescription("scope not set · last 60m · reading. Reading live replay and evaluation state.", h),
      referenceDescription("The newest replay decisions among the last 0 observations; the selection follows the configured activation stage. Each row is one decision with its observation count.", h),
    ], h),
    referenceCard("Recent decisions", "Every adjudicated decision with its evidence in columns, and the receipt chain each one produced.", [
      referenceTable(["Role · task", "Models · judge score", "Judge", "Evidence", "Decision"], [], "No decisions recorded yet.", h, "learning"),
      h.p([h.Class("mt-4 text-sm font-medium leading-5 text-foreground")], ["Ladder state"]),
      table(["LADDER", "STATE", "SCOPE"], rows, "Loading learning state…", h),
      renderReadbackPage(READBACK_SPECS.learning, readback, h),
    ], h),
    referenceCard("Replay and evaluation", "Bounded replay and evaluation jobs behind the learning loop.", [
      renderReadbackPage(READBACK_SPECS.replayJobs, replayJobs, h),
      renderReadbackPage(READBACK_SPECS.evaluationJobs, evaluationJobs, h),
    ], h),
  ], h);
};

export const learningConfigurationRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta.slice(0, 120)]);
  return page("Learning configuration", "learning-configuration", readback, [
    h.p([h.Class("mt-2 max-w-[80ch] text-[12px] text-[var(--rm-secondary)]")], ["Every activation parameter with its current value, unit, default and allowed range. Bounds are enforced here and again on the server."]),
    h.div([h.Class("mt-3 flex flex-wrap gap-3")], [
      h.label([h.Class("flex flex-col gap-1 text-[11px]")], [h.span([], ["Operator token"]), h.input([h.Id("learning-config-token"), h.Type("password"), h.AriaLabel("Operator token"), h.Class("h-[34px] rounded-md border border-input bg-secondary px-3 text-sm text-foreground")])]),
      h.label([h.Class("flex flex-col gap-1 text-[11px]")], [h.span([], ["Operator identity"]), h.input([h.Id("learning-operator-identity"), h.AriaLabel("Operator identity"), h.Class("h-[34px] rounded-md border border-input bg-secondary px-3 text-sm text-foreground")])]),
    ]),
    table(["PARAMETER", "CURRENT VALUE / RANGE", "DETAIL"], rows, "Loading learning configuration…", h),
    chart("Activation parameters", "Current activation parameter values.", "No activation parameter data recorded yet.", h),
  ], h);
};

export const learningDecisionsRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta.includes("shadow") ? "shadow" : row.meta.includes("live") ? "live" : "", row.meta.slice(0, 80)]);
  return page("Decision receipts", "learning-decisions", readback, [
    h.p([h.Class("mt-2 max-w-[85ch] text-[12px] text-[var(--rm-secondary)]")], ["Every adjudicated decision with its evidence in columns, and the receipt chain each one produced."]),
    referenceFilterBar([
      select("Role", ["all roles"], h),
      select("Task", ["all tasks"], h),
      select("Outcome", ["all outcomes"], h),
      select("Advisory state", ["all", "fresh", "stale", "unavailable"], h),
      select("Observation origin", ["live", "shadow", "all"], h),
    ], [], h),
    table(["DECISION", "OUTCOME", "ORIGIN", "EVIDENCE"], rows, "Loading decision receipts…", h),
    chart("Decision volume", "Adjudicated decisions by time bucket.", "No decision receipts recorded yet.", h),
  ], h);
};

export const learningEvidenceRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta.slice(0, 100)]);
  return referenceSection("learning-evidence", stateOf(readback), [
    referenceCard("Evidence", "Baseline-versus-advisory comparison on the paired holdout distribution with the guardrail verdicts.", [
      h.div([h.Class("grid gap-4 sm:grid-cols-2 xl:grid-cols-3")], [
        ...["PAIRED HOLDOUT TASKS", "BASELINE SAMPLES", "ADVISORY SAMPLES", "APPLIED SHARE", "QUALITY DELTA", "COST MULTIPLIER", "LATENCY P95 DELTA (MS)", "ERROR-RATE DELTA (PP)", "QUALITY CI"].map((label) =>
          h.div([h.Class("rounded-lg border border-border bg-card p-4")], [
            h.p([h.Class("font-mono text-[11px] uppercase leading-4 tracking-[0.08em] text-muted-foreground")], [label]),
            h.p([h.Class("mt-2 text-sm leading-5 text-foreground")], ["not measured here"]),
          ]),
        ),
      ]),
      h.p([h.Class("mt-4 text-sm font-medium leading-5 text-foreground")], ["Guardrail"]),
      table(["Guardrail", "Bound", "Observed", "Verdict"], [["quality", "—", "—", "—"], ["cost", "—", "—", "—"], ["latency", "—", "—", "—"], ["error", "—", "—", "—"]], "No guardrail rows recorded yet.", h),
      table(["GUARDRAIL", "BOUND", "OBSERVED", "VERDICT"], [["quality", "—", "—", "—"], ["cost", "—", "—", "—"], ["latency", "—", "—", "—"], ["error", "—", "—", "—"]], "No guardrail rows recorded yet.", h),
      h.p([h.Class("mt-4 text-sm font-medium leading-5 text-foreground")], ["Cohort measurement"]),
      table(["METRIC", "OBSERVED", "GUARDRAIL VERDICT"], rows, "Loading cohort evidence…", h),
    ], h),
    referenceCard("Evidence loss by reason", "Per-family evidence against the operator's floor and the learner's exclusions, read from the validation receipts the runtime recorded.", [
      table(["REASON", "COUNT", "DETAIL"], rows, "No evidence-loss rows recorded yet.", h),
    ], h),
  ], h);
};

export const learningHistoryRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta.slice(0, 100)]);
  return page("Learning history", "learning-history", readback, [
    referenceDescription("What the replay, evaluation and learning loop did over the window, read from durable state.", h),
    table(["BUCKET", "VALUE", "DETAIL"], rows, "Loading learning history…", h),
    chart("Learning history", "Replay, evaluation and learning volume over the window.", "No learning-history rows recorded yet.", h),
  ], h);
};

export const learningPacksRoute = (readback: ReadbackState, h: HtmlBuilder<Message>): Html => {
  const rows = readback.rows.map((row) => [row.label, row.value, row.meta.slice(0, 100)]);
  return page("Learned packs", "learning-packs", readback, [
    referenceDescription("Candidate and pack records with their validation receipts, holdout evidence and activation state.", h),
    h.div([h.Class("flex flex-wrap gap-2")], [
      h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Roll back active pack (scope-wide)"]),
      h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Engage kill switch"]),
      h.button([h.Type("button"), h.Class("inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Release kill switch"]),
    ]),
    subhead("ENDPOINT LADDER INDEX", h),
    referenceDescription("One row per role · task: the top three ranked endpoints, how many configured endpoints are admitted, the per-task full-ranking detail, and the Activate / Roll back toggle.", h),
    table(["ROLE · TASK", "TOP ENDPOINTS", "ACTIVATION"], rows, "No endpoint ladder rows reported.", h),
    subhead("TASK-SCOPED LEARNED PACKS", h),
    table(["PACK", "VALIDATION", "STATE"], rows, "No task-scoped pack records returned by the operator readback.", h),
    chart("Pack activation", "Learned-pack activation and rollback volume.", "No learned-pack activity recorded yet.", h),
  ], h);
};
