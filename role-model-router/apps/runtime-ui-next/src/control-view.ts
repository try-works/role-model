import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { ControlSpec, ControlState } from "./control";
import { Message } from "./message";

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
      h.button(
        [
          h.Type("button"),
          h.Class(
            "mt-3 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--rm-fg)] disabled:opacity-50",
          ),
          h.DataAttribute("control-action", spec.action.id),
          h.AriaDisabled(state.actionStatus === "pending" || state.status === "loading"),
          ...(spec.action.disabledReason === undefined
  ? [h.OnClick(Message.ControlActionRequested({ key: spec.key, targetId: state.rows[0]?.id, token: state.token }))]
  : [h.Disabled(true), h.AriaDisabled(true), h.Title(spec.action.disabledReason)]),
        ],
        [state.actionStatus === "pending" ? "Dispatching…" : spec.action.label],
      ),
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
