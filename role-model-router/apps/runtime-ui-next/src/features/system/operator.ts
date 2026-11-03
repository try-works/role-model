import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { Message } from "../../message";
import type { ReadbackState } from "../../readback";
import { card, table } from "../s563-layout";

const fieldLabel = "font-sans text-xs leading-4 text-foreground";
const fieldClass = "h-[34px] w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground outline-none";
const primaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-primary px-3 font-sans text-sm font-medium text-primary-foreground";
const secondaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground";
const supporting = "text-sm leading-5 text-muted-foreground";

export interface SystemOperatorState {
  readonly learningOperatorToken?: string;
  readonly operatorLearningMode?: string;
  readonly systemOperatorMessage?: string;
  readonly systemOperatorReplayCount?: string;
  readonly systemOperatorTraceRoot?: string;
}

export const systemOperatorPage = (readback: ReadbackState | undefined, h: HtmlBuilder<Message>, state?: SystemOperatorState): Html => {
  const token = state?.learningOperatorToken ?? "";
  const traceRoot = state?.systemOperatorTraceRoot ?? "";
  const count = state?.systemOperatorReplayCount ?? "25";
  const status = readback === undefined ? "empty" : readback.status === "idle" ? "loading" : readback.status;
  const mode = state?.operatorLearningMode ?? "shadow";
  return h.div([h.Class("space-y-6"), h.DataAttribute("route", "system-operator"), h.DataAttribute("page-layout", "reference"), h.DataAttribute("final-family-state", status), h.DataAttribute("readback-state", status)], [
    h.svg([h.Class("mt-3 h-10 w-full text-[var(--rm-accent)]")], [h.rect([], []), h.rect([], [])]),
    readback?.status === "error" ? h.p([h.Role("alert"), h.Class(supporting)], ["Operator status read failed: " + (readback.message ?? "unknown error")]) : null,
    card("Operator Controls", "Inspect bounded replay, evaluation, and shadow-learning state. The access token stays only in this browser component and is never stored.", [
      h.div([h.Class("flex flex-col gap-3 sm:flex-row sm:items-end")], [
        h.div([h.Class("min-w-0 flex-1")], [h.label([h.Class(fieldLabel), h.Attribute("for", "operator-access-token")], ["Operator access token"]), h.input([h.Id("operator-access-token"), h.Type("password"), h.Value(token), h.Placeholder("Paste a local operator token…"), h.Class(fieldClass + " mt-1 w-full"), h.OnInput((next) => Message.LearningOperatorTokenChanged({ value: next }))])]),
        h.button([h.Type("button"), h.DataAttribute("operator-load-state", ""), h.OnClick(Message.SystemOperatorLoadRequested({})), h.Class(primaryButton)], ["Load Operator State"]),
      ]),
      h.p([h.Class("mt-3 " + supporting)], ["This page does not enable production learning. Learning actions remain shadow-only and the runtime is the source of truth."]),
      state?.systemOperatorMessage === undefined ? null : h.p([h.Role("status"), h.Class("mt-3 text-sm text-[var(--rm-success)]")], [state.systemOperatorMessage]),
    ], h),
    card("Operator Capability Status", "Availability is reported separately for each control-plane capability.", [
      readback === undefined || readback.rows.length === 0
        ? h.p([h.Class(supporting)], ["No operator status rows recorded yet."])
        : table(["Name", "Value", "Detail"], readback.rows.map((row) => [row.label, row.value, row.meta]), "No operator status rows recorded yet.", h),
    ], h),
    card("Trace lineage", "Trace roots, generations, branches, and completeness are read from the runtime authority; missing evidence remains visibly unavailable.", [
      h.p([h.Class(supporting)], ["Trace-root inspection is unavailable or has not been observed yet."]),
      h.p([h.Class("mt-3 " + supporting)], ["Replay and evaluation operations below preserve the trace root identity instead of inferring lineage from a job label."]),
    ], h),
    card("Replay Jobs", "Review live replay work. Cancelling a job requires confirmation.", [
      h.div([h.Class("mb-4 grid gap-3 rounded-md border border-[var(--rm-border)] p-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end")], [
        h.div([], [h.label([h.Class(fieldLabel), h.Attribute("for", "replay-trace-root")], ["Trace root id"]), h.input([h.Id("replay-trace-root"), h.Value(traceRoot), h.Placeholder("trace-root…"), h.Class(fieldClass + " mt-1 w-full"), h.OnInput((next) => Message.SystemOperatorTraceRootChanged({ value: next }))])]),
        h.div([], [h.label([h.Class(fieldLabel), h.Attribute("for", "replay-budget")], ["Max requests"]), h.input([h.Id("replay-budget"), h.Type("number"), h.Value(count), h.Class(fieldClass + " mt-1 w-full"), h.OnInput((next) => Message.SystemOperatorReplayCountChanged({ value: next }))])]),
        h.button([h.Type("button"), h.DataAttribute("operator-create-replay", ""), h.OnClick(Message.SystemOperatorCreateReplayRequested({})), h.Class(primaryButton)], ["Create Replay"]),
      ]),
      h.p([h.Class(supporting)], ["No replay jobs recorded for this operator session."]),
    ], h),
    card("Evaluation Jobs", "Retry or cancel bounded evaluation work with confirmation for cancellation.", [
      h.p([h.Class(supporting)], ["No evaluation jobs recorded for this operator session."]),
    ], h),
    card("Shadow Learning", "Learning output is advisory. Mode changes and rollback never directly alter production routing.", [
      h.div([h.Class("grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end")], [
        h.div([], [h.label([h.Class(fieldLabel), h.Attribute("for", "shadow-learning-mode")], ["Learning mode"]), h.select([h.Id("shadow-learning-mode"), h.AriaLabel("Learning mode"), h.DataAttribute("learning-mode-select", ""), h.Class(fieldClass + " mt-1 w-full"), h.OnChange((value) => Message.LearningModeSelectChanged({ mode: value }))], [h.option([h.Value("disabled"), ...(mode === "disabled" ? [h.Selected(true)] : [])], ["Disabled"]), h.option([h.Value("shadow"), ...(mode === "shadow" ? [h.Selected(true)] : [])], ["Shadow"]), h.option([h.Value("advisory"), ...(mode === "advisory" ? [h.Selected(true)] : [])], ["Advisory"])])]),
        h.div([h.Class("flex flex-wrap gap-2")], [h.button([h.Type("button"), h.DataAttribute("learning-mode-update", ""), h.OnClick(Message.LearningModeUpdateRequested({ mode })), h.Class(secondaryButton)], ["Update Mode"]), h.button([h.Type("button"), h.DataAttribute("learning-rollback", ""), h.OnClick(Message.LearningRollbackRequested({})), h.Class(secondaryButton)], ["Roll Back Shadow State"])]),
      ]),
      h.p([h.Class("mt-5 border-t border-[var(--rm-border)] pt-4 " + supporting)], ["Load operator state to inspect shadow-learning status."]),
      h.div([h.Class("mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rm-border)] pt-4")], [h.a([h.Href("/system/storage-retention"), h.Role("button"), h.Class(secondaryButton)], ["Open Storage & Retention"])]),
    ], h),
  ]);
};
