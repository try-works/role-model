import type { EndpointAdmissionField, EndpointAdmissionState } from "./endpoint-admission";
import type { ProviderAccountField, ProviderAccountState } from "./provider-account";
import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { ControlSpec, ControlState } from "./control";
import { Message } from "./message";




export const renderEndpointAdmissionForm = (state: EndpointAdmissionState, h: HtmlBuilder<Message>): Html => {
  const pending = state.run.pending.length > 0;
  const busy = pending || state.status === "saving" || state.pendingAction !== undefined;
  const needsReset = state.run.settled.length > 0;
  const frozen = busy || needsReset;
  const textField = (label: string, field: EndpointAdmissionField, value: string) =>
    h.label([h.Class("mt-3 flex flex-col gap-1 text-[12px]")], [
      h.span([], [label]),
      h.input([
        h.Class("w-full max-w-[420px] rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1.5 text-[12px]"),
        h.OnInput((next) => Message.EndpointAdmissionFieldChanged({ field, value: next })),
        h.Type("text"),
        h.Value(value),
        ...(frozen ? [h.Disabled(true)] : []),
      ]),
    ]);
  return h.section(
    [h.Class("rm3-next-route mt-6"), h.DataAttribute("route", "endpoint-admission"), h.DataAttribute("endpoint-admission-state", state.status)],
    [
      h.h3([h.Class("text-[14px] font-semibold")], ["Endpoint admission"]),
      textField("Provider account", "providerAccountId", state.draft.providerAccountId),
      textField("Region", "region", state.draft.region),
      textField("Reasoning effort", "reasoningEffort", state.draft.reasoningEffort),
      textField("Batch mode (true/false)", "batchMode", state.draft.batchMode),
      textField("Activation batch id", "activationBatchId", state.draft.activationBatchId),
      h.label([h.Class("mt-3 flex flex-col gap-1 text-[12px]")], [
        h.span([], ["Model"]),
        h.input([h.Class("w-full max-w-[420px] rounded px-2 py-1.5 text-[12px]"), h.OnInput((next) => Message.EndpointAdmissionFieldChanged({ field: "modelInput", value: next })), h.Type("text"), h.Value(state.draft.modelInput), ...(frozen ? [h.Disabled(true)] : [])]),
      ]),
      h.button([h.Class("mt-2 rounded border px-3 py-1.5 text-[12px]"), h.AriaDisabled(frozen), ...(frozen ? [h.Disabled(true)] : []), h.OnClick(Message.EndpointAdmissionModelAdded({})), h.Type("button")], ["Add model"]),
      h.ul([h.Class("mt-2 text-[12px]")], state.draft.selectedModelIds.map((modelId) =>
        h.li([], [modelId + " ", h.button([h.Class("underline"), ...(frozen ? [h.Disabled(true)] : []), h.OnClick(Message.EndpointAdmissionModelRemoved({ modelId })), h.Type("button")], ["Remove"])]),
      )),
      h.button([h.Class("mt-4 rounded border px-3 py-1.5 text-[12px]"), h.AriaDisabled(frozen), ...(frozen ? [h.Disabled(true)] : []), h.DataAttribute("endpoint-admission-submit", ""), h.OnClick(Message.EndpointAdmissionSubmitRequested({})), h.Type("button")], [pending ? "Activating " + String(state.run.pending.length) + " endpoint(s)..." : "Activate endpoints"]),
      ...(() => {
        const succeeded = state.run.settled.filter((entry) => entry.outcome === "succeeded").length;
        const failed = state.run.settled.filter((entry) => entry.outcome === "failed").length;
        const summary = pending
          ? "Waiting for " + String(state.run.pending.length) + " endpoint activation(s); " + String(succeeded) + " succeeded, " + String(failed) + " failed."
          : state.run.status === "saved"
            ? "All " + String(succeeded) + " endpoint activation(s) succeeded."
            : state.run.status === "partial"
              ? "Partial activation: " + String(succeeded) + " succeeded, " + String(failed) + " failed. Review the failed rows, then reset to begin a new activation."
              : state.run.status === "error"
                ? "Activation failed: " + String(failed) + " endpoint(s) failed. Review the rows, then reset to try again."
                : undefined;
        return summary === undefined
          ? []
          : [h.p([h.Role("status"), h.AriaLive("polite"), h.DataAttribute("endpoint-admission-summary", state.run.status)], [summary])];
      })(),
      ...(needsReset && !pending
        ? [
            h.button([h.Class("ml-2 mt-4 rounded border px-3 py-1.5 text-[12px]"), h.DataAttribute("endpoint-admission-reset", ""), h.OnClick(Message.EndpointAdmissionResetRequested({})), h.Type("button")], ["Reset results / Begin new activation"]),
            h.p([h.Class("mt-1 text-[11px]"), h.DataAttribute("endpoint-admission-reset-hint", "")], ["Reset starts a new activation. The selected models may be activated again."]),
          ]
        : []),
      ...(state.run.settled.length === 0
        ? []
        : [
            h.ul([h.Class("mt-2 text-[12px]"), h.DataAttribute("endpoint-admission-results", "")], state.run.settled.map((entry) =>
              h.li([], [entry.activationId + " " + entry.outcome + (entry.message === undefined || entry.message.length === 0 ? "" : ": " + entry.message)]),
            )),
          ]),
      ...(state.error === undefined ? [] : [h.p([h.Role("alert"), h.DataAttribute("endpoint-admission-error", "")], [state.error])]),
    ],
  );
};
export const renderProviderAccountForm = (state: ProviderAccountState, h: HtmlBuilder<Message>): Html => {
  const textField = (label: string, field: ProviderAccountField, value: string) =>
    h.label([h.Class("mt-3 flex flex-col gap-1 text-[12px]")], [
      h.span([], [label]),
      h.input([
        h.Class("w-full max-w-[420px] rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1.5 text-[12px]"),
        h.OnInput((next) => Message.ProviderAccountFieldChanged({ field, value: next })),
        h.Type("text"),
        h.Value(value),
      ]),
    ]);
  const busy = state.status === "saving" || state.pendingAction !== undefined;
  return h.section(
    [h.Class("rm3-next-route mt-6"), h.DataAttribute("route", "provider-account"), h.DataAttribute("provider-account-state", state.status)],
    [
      h.h3([h.Class("text-[14px] font-semibold")], ["Provider account"]),
      textField("Account id", "providerAccountId", state.draft.providerAccountId),
      textField("Provider", "providerId", state.draft.providerId),
      textField("Provider kind", "providerKind", state.draft.providerKind),
      textField("Variant", "variantId", state.draft.variantId),
      textField("Auth mode", "authMode", state.draft.authMode),
      textField("Credential ref", "credentialRef", state.draft.credentialRef),
      textField("API key", "apiKey", state.draft.apiKey),
      textField("Base URL override", "baseUrlOverride", state.draft.baseUrlOverride),
      textField("Role ids (comma separated)", "roleIdsInput", state.draft.roleIdsInput),
      textField("OAuth connected (true/false)", "oauthConnected", state.draft.oauthConnected),
      h.label([h.Class("mt-3 flex flex-col gap-1 text-[12px]")], [
        h.span([], ["Model"]),
        h.input([
          h.Class("w-full max-w-[420px] rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1.5 text-[12px]"),
          h.OnInput((next) => Message.ProviderAccountFieldChanged({ field: "modelInput", value: next })),
          h.Type("text"),
          h.Value(state.draft.modelInput),
        ]),
      ]),
      h.button([h.Class("mt-2 rounded border px-3 py-1.5 text-[12px]"), h.OnClick(Message.ProviderAccountModelAdded({})), h.Type("button")], ["Add model"]),
      h.ul([h.Class("mt-2 text-[12px]")], state.draft.selectedModelIds.map((modelId) =>
        h.li([], [modelId + " ", h.button([h.Class("underline"), h.OnClick(Message.ProviderAccountModelRemoved({ modelId })), h.Type("button")], ["Remove"])]),
      )),
      h.button([h.Class("mt-4 rounded border px-3 py-1.5 text-[12px]"), h.AriaDisabled(busy), h.DataAttribute("provider-account-save", ""), h.OnClick(Message.ProviderAccountCreateRequested({})), h.Type("button")], ["Save provider account"]),
      h.button([h.Class("ml-2 mt-4 rounded border px-3 py-1.5 text-[12px]"), h.AriaDisabled(busy), h.DataAttribute("provider-account-update-key", ""), h.OnClick(Message.ProviderAccountUpdateKeyRequested({})), h.Type("button")], ["Update API key"]),
      ...(state.error === undefined ? [] : [h.p([h.Role("alert"), h.DataAttribute("provider-account-error", "")], [state.error])]),
      ...(state.status === "saved" ? [h.p([h.DataAttribute("provider-account-saved", "")], ["Provider account saved."])] : []),
    ],
  );
};
/**
 * S425: the pending step is where the operator authorizes. It must show the real host userCode and a
 * safe verification link before authorization (S420 F11), and a terminal host status must never read
 * as "Connected" (S420 F8).
 */
export { renderDeviceAuthorizationForm } from "./features/device-auth/view";

export const renderControlPage = (
  spec: ControlSpec,
  state: ControlState,
  h: HtmlBuilder<Message>,
  endpointOptions: readonly string[] = [],
): Html => {
  const statusText = (() => {
    switch (state.status) {
      case "loading":
        return `Loading ${spec.label.toLowerCase()}…`;
      case "error":
        return state.error ?? `${spec.label} read failed: unknown error`;
      case "empty":
        return spec.emptyText;
      case "ok":
        return `${String(state.rows.length)} row(s) from the live host read`;
      case "idle":
        return `Waiting for the ${spec.label.toLowerCase()} read.`;
    }
  })();
  return h.section(
    [
      h.Class("rm3-next-route mt-4"),
      h.DataAttribute("route", "control"),
      h.DataAttribute("control-route", spec.key),
      h.DataAttribute("control-state", state.status),
      h.DataAttribute("control-action-state", state.actionStatus),
      ...(state.status === "error" ? [h.Role("alert")] : []),
    ],
    [
      h.p(
        [h.Class("text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]")],
        ["Runtime control"],
      ),
      h.h2([h.Class("rm3-next-route-title")], [spec.label]),
      h.p(
        [
          h.Role("status"),
          h.AriaLive("polite"),
          h.AriaBusy(state.status === "loading"),
          h.Class("mt-1 text-[13px] leading-5 text-[var(--rm-secondary)]"),
        ],
        [statusText],
      ),
      ...(spec.key === "controlController"
        ? [
            h.div([h.Class("mt-3 grid gap-2")], [
              h.label([h.Class("text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]")], ["Controller endpoint"]),
              h.select(
                [h.AriaLabel("Controller endpoint"), h.Class("w-full max-w-[560px] rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1.5 text-[12px] text-[var(--rm-fg)]"), h.DataAttribute("controller-endpoint-select", ""), h.OnChange((value) => Message.ControllerEndpointSelected({ endpointId: value }))],
                (endpointOptions.length > 0 ? endpointOptions : state.selectedEndpointId === undefined ? [] : [state.selectedEndpointId]).map((id) =>
                  h.option([h.Value(id), ...(id === (state.selectedEndpointId ?? endpointOptions[0] ?? state.rows[0]?.value) ? [h.Selected(true)] : [])], [id]),
                ),
              ),
              h.p([h.DataAttribute("controller-current", ""), h.Class("text-[12px] text-[var(--rm-secondary)]")], ["Current: " + (state.rows.find((row) => row.id.toLowerCase().includes("endpoint"))?.value ?? state.rows[0]?.value ?? "—")]),
              h.button(
                [h.Type("button"), h.DataAttribute("controller-save", ""), h.AriaDisabled(state.actionStatus === "pending"), h.OnClick(Message.ControllerSaveRequested({ endpointId: state.selectedEndpointId ?? endpointOptions[0] ?? "" })), h.Class("justify-self-start rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--rm-fg)] disabled:opacity-50")],
                [state.actionStatus === "pending" ? "Saving…" : "Save controller"],
              ),
              ...(state.notice === undefined ? [] : [h.p([h.Role("status"), h.AriaLive("polite"), h.DataAttribute("controller-notice", "")], [state.notice])]),
            ]),
          ]
        : []),
      ...(state.status === "ok"
        ? [
            h.ul(
              [h.Class("mt-3 space-y-1.5")],
              state.rows.map((item) =>
                h.li(
                  [
                    h.Class(
                      "flex flex-wrap items-baseline gap-2 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1.5 text-[12px] leading-4",
                    ),
                  ],
                  [
                    h.span([h.Class("break-all font-mono text-[var(--rm-fg)]")], [item.label]),
                    h.span([h.Class("ml-auto font-medium text-[var(--rm-fg)]")], [item.value]),
                    h.span([h.Class("text-[11px] text-[var(--rm-secondary)]")], [item.meta]),
                  ],
                ),
              ),
            ),
          ]
        : []),
      ...(spec.action === undefined
        ? []
        : [
            h.button(
              [
                h.Type("button"),
                h.Class(
                  "mt-3 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--rm-fg)] disabled:opacity-50",
                ),
                h.DataAttribute("control-action", spec.action.id),
                h.AriaDisabled(state.actionStatus === "pending" || state.status === "loading" || spec.action.disabledReason !== undefined),
                ...(spec.action.disabledReason === undefined ? [] : [h.Disabled(true), h.Title(spec.action.disabledReason)]),
                h.OnClick(
                  Message.ControlActionRequested({
                    key: spec.key,
                    targetId: spec.key === "controlController" ? (state.selectedEndpointId ?? state.rows[0]?.id) : state.rows[0]?.id,
                    token: state.token,
                  }),
                ),
              ],
              [state.actionStatus === "pending" ? "Dispatching…" : spec.action.label],
            ),
          ]),
      ...(state.actionMessage === undefined
        ? []
        : [
            h.p(
              [
                ...(state.actionStatus === "error" ? [h.Role("alert")] : [h.Role("status")]),
                h.AriaLive("polite"),
                h.DataAttribute("control-action-message", state.actionStatus),
              ],
              [state.actionMessage],
            ),
          ]),
    ],
  );
};
