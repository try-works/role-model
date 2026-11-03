import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { Message } from "../../message";
import type { ReadbackState } from "../../readback";
import { card, table } from "../s563-layout";

const fieldLabel = "font-sans text-xs leading-4 text-foreground";
const fieldClass = "h-[34px] w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground outline-none";
const primaryButton = "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-primary px-3 font-sans text-sm font-medium text-primary-foreground";

export interface SystemOperatorState {
  readonly learningOperatorToken?: string;
  readonly systemOperatorMessage?: string;
  readonly systemOperatorReplayCount?: string;
  readonly systemOperatorTraceRoot?: string;
}

export const systemOperatorPage = (readback: ReadbackState | undefined, h: HtmlBuilder<Message>, state?: SystemOperatorState): Html => {
  const token = state?.learningOperatorToken ?? "";
  const traceRoot = state?.systemOperatorTraceRoot ?? "";
  const count = state?.systemOperatorReplayCount ?? "25";
  return h.div([h.Class("space-y-5"), h.DataAttribute("route", "system-operator"), h.DataAttribute("page-layout", "reference")], [
    card("Operator status", "Bounded operator status readback for the current session.", [
      readback === undefined || readback.rows.length === 0
        ? h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["No operator status rows recorded yet."])
        : table(["Name", "Value", "Detail"], readback.rows.map((row) => [row.label, row.value, row.meta]), "No operator status rows recorded yet.", h),
    ], h),
    card("Operator Controls", "Inspect bounded replay, evaluation, and shadow-learning state. The access token stays only in this browser component and is never stored.", [
      h.label([h.Class(fieldLabel), h.Attribute("for", "operator-token")], ["Operator access token"]),
      h.div([h.Class("flex flex-col gap-3 md:flex-row")], [
        h.input([h.Id("operator-token"), h.Type("password"), h.Value(token), h.Placeholder("Paste a local operator token…"), h.Class(fieldClass + " flex-1"), h.OnInput((next) => Message.LearningOperatorTokenChanged({ value: next }))]),
        h.button([h.Type("button"), h.DataAttribute("operator-load-state", ""), h.OnClick(Message.SystemOperatorLoadRequested({})), h.Class(primaryButton)], ["Load Operator State"]),
      ]),
    ], h),
    card("Replay Jobs", "Review live replay work. Cancelling a job requires confirmation.", [
      h.div([h.Class("flex flex-wrap items-end gap-3")], [
        h.div([h.Class("min-w-0 flex-1 space-y-2")], [h.label([h.Class(fieldLabel)], ["Trace root id"]), h.input([h.Id("operator-trace-root"), h.Value(traceRoot), h.Placeholder("trace-root…"), h.Class(fieldClass), h.OnInput((next) => Message.SystemOperatorTraceRootChanged({ value: next }))])]),
        h.div([h.Class("w-[120px] space-y-2")], [h.label([h.Class(fieldLabel)], ["Max requests"]), h.input([h.Id("operator-replay-count"), h.Type("number"), h.Value(count), h.Class(fieldClass), h.OnInput((next) => Message.SystemOperatorReplayCountChanged({ value: next }))])]),
        h.button([h.Type("button"), h.DataAttribute("operator-create-replay", ""), h.OnClick(Message.SystemOperatorCreateReplayRequested({})), h.Class(primaryButton)], ["Create Replay"]),
      ]),
      state?.systemOperatorMessage === undefined ? null : h.p([h.Role("status"), h.Class("mt-3 text-xs text-muted-foreground")], [state.systemOperatorMessage]),
    ], h),
  ]);
};
