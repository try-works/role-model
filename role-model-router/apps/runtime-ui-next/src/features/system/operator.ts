import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { Message } from "../../message";
import type { ReadbackRow, ReadbackState, ReadbacksState } from "../../readback";
import { card } from "../s563-layout";

const fieldLabel = "font-sans text-xs leading-4 text-foreground";
const fieldClass = "h-[34px] w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground outline-none";
const primaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-primary px-3 font-sans text-sm font-medium text-primary-foreground";
const secondaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground";
const supporting = "text-sm leading-5 text-muted-foreground";
const tableHead = "pb-2 pr-3 font-mono text-[10px] font-normal uppercase tracking-[0.08em] text-muted-foreground";
const tableCell = "border-t border-[var(--rm-border)] py-2 pr-3 align-top text-xs text-[var(--rm-fg)]";

export interface SystemOperatorState {
  readonly learningOperatorToken?: string;
  readonly operatorLearningMode?: string;
  readonly systemOperatorMessage?: string;
  readonly systemOperatorReplayCount?: string;
  readonly systemOperatorTraceRoot?: string;
}

type OperatorReadbacks = {
  readonly operatorStatus?: ReadbackState;
  readonly operatorTraceRoots?: ReadbackState;
  readonly replayJobs?: ReadbackState;
  readonly evaluationJobs?: ReadbackState;
  readonly learningProfile?: ReadbackState;
  readonly learningAdvisory?: ReadbackState;
};

const readbacksOf = (input: ReadbacksState | ReadbackState | undefined): OperatorReadbacks => {
  if (input === undefined) return {};
  if ("operatorStatus" in input) return input;
  return { operatorStatus: input };
};

const parseRecord = (value: string): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
};
const scalarText = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const state = record.state ?? record.status ?? record.available;
    return state === undefined ? "—" : String(state);
  }
  return "—";
};
const expandedRows = (rows: ReadonlyArray<ReadbackRow>): ReadonlyArray<ReadbackRow> => rows.flatMap((row) => {
  const parsed = parseRecord(row.meta);
  const nested = parsed.evidence !== null && typeof parsed.evidence === "object" && !Array.isArray(parsed.evidence) ? parsed.evidence as Record<string, unknown> : parsed;
  const entries = Object.entries(nested);
  if (entries.length === 0) return [row];
  return entries.map(([key, value]) => ({ id: row.id + "." + key, label: key, meta: row.label, value: scalarText(value) }));
});

const expandedState = (state: ReadbackState | undefined): ReadbackState | undefined => state === undefined || state.status !== "ok" ? state : { ...state, rows: expandedRows(state.rows) };
const rowTable = (rows: ReadbackState | undefined, headings: ReadonlyArray<string>, empty: string, h: HtmlBuilder<Message>, actions?: (row: ReadbackRow) => ReadonlyArray<Html>): Html => {
  if (rows === undefined || rows.status === "idle" || rows.status === "loading") return h.p([h.Class(supporting)], ["Loading " + headings.join(", ").toLowerCase() + "…"]);
  if (rows.status === "error") return h.p([h.Role("alert"), h.Class(supporting)], [rows.message ?? "Readback failed."]);
  if (rows.rows.length === 0) return h.p([h.Class(supporting)], [empty]);
  const heads = actions === undefined ? headings : [...headings, "Action"];
  return h.div([h.Class("overflow-x-auto")], [h.table([h.Class("min-w-full text-left")], [
    h.thead([], [h.tr([], heads.map((head) => h.th([h.Class(tableHead)], [head])))]),
    h.tbody([], rows.rows.map((row: ReadbackRow) => h.tr([], [
      h.td([h.Class(tableCell + " font-mono")], [row.label]),
      h.td([h.Class(tableCell)], [row.value.length === 0 ? "—" : row.value]),
      h.td([h.Class(tableCell + " text-muted-foreground")], [row.meta.length === 0 ? "—" : row.meta]),
      ...(actions === undefined ? [] : [h.td([h.Class(tableCell)], actions(row))]),
    ]))),
  ])]);
};

export const systemOperatorPage = (input: ReadbacksState | ReadbackState | undefined, h: HtmlBuilder<Message>, state?: SystemOperatorState): Html => {
  const readbacks = readbacksOf(input);
  const token = state?.learningOperatorToken ?? "";
  const traceRoot = state?.systemOperatorTraceRoot ?? "";
  const count = state?.systemOperatorReplayCount ?? "25";
  const statusReadback = readbacks.operatorStatus;
  const status = statusReadback === undefined ? "empty" : statusReadback.status === "idle" ? "loading" : statusReadback.status;
  const mode = state?.operatorLearningMode ?? "shadow";
  return h.div([h.Class("space-y-6"), h.DataAttribute("route", "system-operator"), h.DataAttribute("page-layout", "reference"), h.DataAttribute("final-family-state", status), h.DataAttribute("readback-state", status)], [
    statusReadback?.status === "error" ? h.p([h.Role("alert"), h.Class(supporting)], ["Operator status read failed: " + (statusReadback.message ?? "unknown error")]) : null,
    card("Operator Controls", "Inspect bounded replay, evaluation, and shadow-learning state. The access token stays only in this browser component and is never stored.", [
      h.div([h.Class("flex flex-col gap-3 sm:flex-row sm:items-end")], [
        h.div([h.Class("min-w-0 flex-1")], [h.label([h.Class(fieldLabel), h.Attribute("for", "operator-access-token")], ["Operator access token"]), h.input([h.Id("operator-access-token"), h.Type("password"), h.Value(token), h.Placeholder("Paste a local operator token…"), h.Class(fieldClass + " mt-1 w-full"), h.OnInput((next) => Message.LearningOperatorTokenChanged({ value: next }))])]),
        h.button([h.Type("button"), h.DataAttribute("operator-load-state", ""), h.OnClick(Message.SystemOperatorLoadRequested({})), h.Class(primaryButton)], ["Load Operator State"]),
      ]),
      h.p([h.Class("mt-3 " + supporting)], ["This page does not enable production learning. Learning actions remain shadow-only and the runtime is the source of truth."]),
      state?.systemOperatorMessage === undefined ? null : h.p([h.Role("status"), h.Class("mt-3 text-sm text-[var(--rm-success)]")], [state.systemOperatorMessage]),
    ], h),
    card("Operator Capability Status", "Availability is reported separately for each control-plane capability.", [
      statusReadback === undefined || statusReadback.status !== "ok" || statusReadback.rows.length === 0
        ? h.p([h.Class(supporting)], [statusReadback?.status === "ok" ? "No operator status rows recorded yet." : "Operator status is not available yet."])
        : h.div([h.Class("grid gap-3 sm:grid-cols-2 xl:grid-cols-3"), h.DataAttribute("operator-capability-grid", "")], expandedRows(statusReadback.rows).map((row) => h.div([h.Class("flex min-w-0 items-center justify-between gap-3 rounded-md border border-[var(--rm-border)] px-3 py-2")], [
            h.span([h.Class("min-w-0 truncate font-mono text-xs text-foreground")], [row.label]),
            h.div([h.Class("flex min-w-0 flex-col items-end gap-1")], [
              h.span([h.Class("rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground")], [row.value.length === 0 ? "unobserved" : row.value]),
              row.meta.length === 0 || row.meta === row.label || row.meta === "0" ? null : h.span([h.Class("max-w-48 truncate text-[10px] text-muted-foreground")], [row.meta]),
            ]),
          ]))),
    ], h),
    card("Trace lineage", "Trace roots, generations, branches, and completeness are read from the runtime authority; missing evidence remains visibly unavailable.", [
      rowTable(expandedState(readbacks.operatorTraceRoots), ["Trace root", "Value", "Detail"], "No trace roots recorded for this operator session.", h),
    ], h),
    card("Replay Jobs", "Review live replay work. Cancelling a job requires confirmation.", [
      h.div([h.Class("mb-4 grid gap-3 rounded-md border border-[var(--rm-border)] p-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end")], [
        h.div([], [h.label([h.Class(fieldLabel), h.Attribute("for", "replay-trace-root")], ["Trace root id"]), h.input([h.Id("replay-trace-root"), h.Value(traceRoot), h.Placeholder("trace-root…"), h.Class(fieldClass + " mt-1 w-full"), h.OnInput((next) => Message.SystemOperatorTraceRootChanged({ value: next }))])]),
        h.div([], [h.label([h.Class(fieldLabel), h.Attribute("for", "replay-budget")], ["Max requests"]), h.input([h.Id("replay-budget"), h.Type("number"), h.Value(count), h.Class(fieldClass + " mt-1 w-full"), h.OnInput((next) => Message.SystemOperatorReplayCountChanged({ value: next }))])]),
        h.button([h.Type("button"), h.DataAttribute("operator-create-replay", ""), h.OnClick(Message.SystemOperatorCreateReplayRequested({})), h.Class(primaryButton)], ["Create Replay"]),
      ]),
      rowTable(readbacks.replayJobs, ["Job", "Status", "Budget"], "No replay jobs recorded for this operator session.", h, (row) => [
        h.button([h.Type("button"), h.DataAttribute("operator-replay-cancel", row.id), h.OnClick(Message.SystemOperatorReplayCancelRequested({ jobId: row.id })), h.Class(secondaryButton)], ["Cancel"]),
      ]),
    ], h),
    card("Evaluation Jobs", "Retry or cancel bounded evaluation work with confirmation for cancellation.", [
      rowTable(readbacks.evaluationJobs, ["Job", "Status", "Detail"], "No evaluation jobs recorded for this operator session.", h, (row) => [
        h.div([h.Class("flex gap-2")], [
          h.button([h.Type("button"), h.DataAttribute("operator-evaluation-retry", row.id), h.OnClick(Message.SystemOperatorEvaluationRetryRequested({ jobId: row.id })), h.Class(secondaryButton)], ["Retry"]),
          h.button([h.Type("button"), h.DataAttribute("operator-evaluation-cancel", row.id), h.OnClick(Message.SystemOperatorEvaluationCancelRequested({ jobId: row.id })), h.Class(secondaryButton)], ["Cancel"]),
        ]),
      ]),
    ], h),
    card("Shadow Learning", "Learning output is advisory. Mode changes and rollback never directly alter production routing.", [
      h.div([h.Class("grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end")], [
        h.div([], [h.label([h.Class(fieldLabel), h.Attribute("for", "shadow-learning-mode")], ["Learning mode"]), h.select([h.Id("shadow-learning-mode"), h.AriaLabel("Learning mode"), h.DataAttribute("learning-mode-select", ""), h.Class(fieldClass + " mt-1 w-full"), h.OnChange((value) => Message.LearningModeSelectChanged({ mode: value }))], [h.option([h.Value("disabled"), ...(mode === "disabled" ? [h.Selected(true)] : [])], ["Disabled"]), h.option([h.Value("shadow"), ...(mode === "shadow" ? [h.Selected(true)] : [])], ["Shadow"]), h.option([h.Value("advisory"), ...(mode === "advisory" ? [h.Selected(true)] : [])], ["Advisory"])])]),
        h.div([h.Class("flex flex-wrap gap-2")], [h.button([h.Type("button"), h.DataAttribute("learning-mode-update", ""), h.OnClick(Message.LearningModeUpdateRequested({ mode })), h.Class(secondaryButton)], ["Update Mode"]), h.button([h.Type("button"), h.DataAttribute("learning-rollback", ""), h.OnClick(Message.LearningRollbackRequested({})), h.Class(secondaryButton)], ["Roll Back Shadow State"])]),
      ]),
      h.div([h.Class("mt-5 grid gap-4 lg:grid-cols-2")], [
        h.div([], [h.h3([h.Class("font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground")], ["Learning profile"]), h.div([h.Class("mt-2")], [rowTable(expandedState(readbacks.learningProfile), ["Field", "Value", "Detail"], "No learning profile recorded.", h)])]),
        h.div([], [h.h3([h.Class("font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground")], ["Advisory"]), h.div([h.Class("mt-2")], [rowTable(expandedState(readbacks.learningAdvisory), ["Field", "Value", "Detail"], "No advisory recorded.", h)])]),
      ]),
      h.div([h.Class("mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rm-border)] pt-4")], [h.a([h.Href("/system/storage-retention"), h.Role("button"), h.Class(secondaryButton)], ["Open Storage & Retention"])]),
    ], h),
  ]);
};
