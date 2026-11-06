import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { EndpointAdmissionField, EndpointAdmissionState } from "../../endpoint-admission";
import { Message } from "../../message";

export const renderEndpointAdmissionForm = (
  state: EndpointAdmissionState,
  h: HtmlBuilder<Message>,
): Html => {
  const pending = state.run.pending.length > 0;
  const busy = pending || state.status === "saving" || state.pendingAction !== undefined;
  const needsReset = state.run.settled.length > 0;
  const frozen = busy || needsReset;
  const textField = (label: string, field: EndpointAdmissionField, value: string) =>
    h.label(
      [h.Class("mt-3 flex flex-col gap-1 text-[12px]")],
      [
        h.span([], [label]),
        h.input([
          h.Class(
            "w-full max-w-[420px] rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1.5 text-[12px]",
          ),
          h.OnInput((next) => Message.EndpointAdmissionFieldChanged({ field, value: next })),
          h.Type("text"),
          h.Value(value),
          ...(frozen ? [h.Disabled(true)] : []),
        ]),
      ],
    );
  return h.section(
    [
      h.Class("rm3-next-route mt-6"),
      h.DataAttribute("route", "endpoint-admission"),
      h.DataAttribute("endpoint-admission-state", state.status),
    ],
    [
      h.h3([h.Class("text-[14px] font-semibold")], ["Endpoint admission"]),
      textField("Provider account", "providerAccountId", state.draft.providerAccountId),
      textField("Region", "region", state.draft.region),
      textField("Reasoning effort", "reasoningEffort", state.draft.reasoningEffort),
      textField("Batch mode (true/false)", "batchMode", state.draft.batchMode),
      textField("Activation batch id", "activationBatchId", state.draft.activationBatchId),
      h.label(
        [h.Class("mt-3 flex flex-col gap-1 text-[12px]")],
        [
          h.span([], ["Model"]),
          h.input([
            h.Class("w-full max-w-[420px] rounded px-2 py-1.5 text-[12px]"),
            h.OnInput((next) =>
              Message.EndpointAdmissionFieldChanged({ field: "modelInput", value: next }),
            ),
            h.Type("text"),
            h.Value(state.draft.modelInput),
            ...(frozen ? [h.Disabled(true)] : []),
          ]),
        ],
      ),
      h.button(
        [
          h.Class("mt-2 rounded border px-3 py-1.5 text-[12px]"),
          h.AriaDisabled(frozen),
          ...(frozen ? [h.Disabled(true)] : []),
          h.OnClick(Message.EndpointAdmissionModelAdded({})),
          h.Type("button"),
        ],
        ["Add model"],
      ),
      h.ul(
        [h.Class("mt-2 text-[12px]")],
        state.draft.selectedModelIds.map((modelId) =>
          h.li(
            [],
            [
              `${modelId} `,
              h.button(
                [
                  h.Class("underline"),
                  ...(frozen ? [h.Disabled(true)] : []),
                  h.OnClick(Message.EndpointAdmissionModelRemoved({ modelId })),
                  h.Type("button"),
                ],
                ["Remove"],
              ),
            ],
          ),
        ),
      ),
      h.button(
        [
          h.Class("mt-4 rounded border px-3 py-1.5 text-[12px]"),
          h.AriaDisabled(frozen),
          ...(frozen ? [h.Disabled(true)] : []),
          h.DataAttribute("endpoint-admission-submit", ""),
          h.OnClick(Message.EndpointAdmissionSubmitRequested({})),
          h.Type("button"),
        ],
        [
          pending
            ? `Activating ${String(state.run.pending.length)} endpoint(s)...`
            : "Activate endpoints",
        ],
      ),
      ...(() => {
        const succeeded = state.run.settled.filter((entry) => entry.outcome === "succeeded").length;
        const failed = state.run.settled.filter((entry) => entry.outcome === "failed").length;
        const summary = pending
          ? `Waiting for ${String(state.run.pending.length)} endpoint activation(s); ${String(succeeded)} succeeded, ${String(failed)} failed.`
          : state.run.status === "saved"
            ? `All ${String(succeeded)} endpoint activation(s) succeeded.`
            : state.run.status === "partial"
              ? `Partial activation: ${String(succeeded)} succeeded, ${String(failed)} failed. Review the failed rows, then reset to begin a new activation.`
              : state.run.status === "error"
                ? `Activation failed: ${String(failed)} endpoint(s) failed. Review the rows, then reset to try again.`
                : undefined;
        return summary === undefined
          ? []
          : [
              h.p(
                [
                  h.Role("status"),
                  h.AriaLive("polite"),
                  h.DataAttribute("endpoint-admission-summary", state.run.status),
                ],
                [summary],
              ),
            ];
      })(),
      ...(needsReset && !pending
        ? [
            h.button(
              [
                h.Class("ml-2 mt-4 rounded border px-3 py-1.5 text-[12px]"),
                h.DataAttribute("endpoint-admission-reset", ""),
                h.OnClick(Message.EndpointAdmissionResetRequested({})),
                h.Type("button"),
              ],
              ["Reset results / Begin new activation"],
            ),
            h.p(
              [h.Class("mt-1 text-[11px]"), h.DataAttribute("endpoint-admission-reset-hint", "")],
              ["Reset starts a new activation. The selected models may be activated again."],
            ),
          ]
        : []),
      ...(state.run.settled.length === 0
        ? []
        : [
            h.ul(
              [h.Class("mt-2 text-[12px]"), h.DataAttribute("endpoint-admission-results", "")],
              state.run.settled.map((entry) =>
                h.li(
                  [],
                  [
                    `${entry.activationId} ${entry.outcome}${
                      entry.message === undefined || entry.message.length === 0
                        ? ""
                        : `: ${entry.message}`
                    }`,
                  ],
                ),
              ),
            ),
          ]),
      ...(state.error === undefined
        ? []
        : [h.p([h.Role("alert"), h.DataAttribute("endpoint-admission-error", "")], [state.error])]),
    ],
  );
};
