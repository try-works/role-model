import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { Message } from "../../message";
import {
  deviceAuthVerificationUrl,
  type DeviceAuthField,
  type DeviceAuthSession,
  type DeviceAuthState,
} from "./model";
import { deviceAuthDialogView, type DeviceAuthDialogModel } from "../../ui/dialog";

const renderDeviceAuthSession = (session: DeviceAuthSession, h: HtmlBuilder<Message>): Html => {
  if (session.status === "connected") {
    return h.p(
      [h.DataAttribute("device-auth-session", "connected")],
      ["Connected" + (session.userCode === undefined ? "" : " (code " + session.userCode + ")")],
    );
  }
  if (session.status === "pending") {
    const verificationUrl = deviceAuthVerificationUrl(session);
    return h.div(
      [h.DataAttribute("device-auth-session", "pending"), h.Role("status"), h.AriaLive("polite")],
      [
        h.p([], ["Waiting for authorization"]),
        ...(session.userCode === undefined
          ? []
          : [
              h.p([h.Class("mt-1 text-[12px]")], ["Enter this code on the verification page:"]),
              h.code(
                [
                  h.DataAttribute("device-auth-user-code", ""),
                  h.Class("mt-1 inline-block font-mono text-[13px] tracking-[0.08em]"),
                ],
                [session.userCode],
              ),
            ]),
        ...(verificationUrl === undefined
          ? [
              h.p(
                [
                  h.DataAttribute("device-auth-verification-unavailable", ""),
                  h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]"),
                ],
                ["Verification link unavailable."],
              ),
            ]
          : [
              h.p([h.Class("mt-1 text-[12px]")], [
                h.a(
                  [
                    h.Href(verificationUrl),
                    h.Target("_blank"),
                    h.Rel("noreferrer noopener"),
                    h.DataAttribute("device-auth-verification-link", ""),
                    h.Class("underline"),
                  ],
                  ["Open verification page"],
                ),
              ]),
            ]),
        ...(session.lastError === undefined
          ? []
          : [
              h.p(
                [
                  h.DataAttribute("device-auth-note", ""),
                  h.Class("mt-1 text-[12px] text-[var(--rm-secondary)]"),
                ],
                [session.lastError],
              ),
            ]),
      ],
    );
  }
  return h.p(
    [
      h.DataAttribute("device-auth-session", session.status),
      h.Role("alert"),
      h.Class("mt-1 text-[12px]"),
    ],
    [
      session.lastError ??
        (session.status === "expired"
          ? "Device authorization expired."
          : "Device authorization failed."),
    ],
  );
};

export const renderDeviceAuthorizationDialog = (
  state: DeviceAuthState,
  dialogModel: DeviceAuthDialogModel | undefined,
  h: HtmlBuilder<Message>,
  includeDialog = true,
): Html => {
  const session = state.session;
  if (session === undefined) return h.div([], []);
  const busy = state.status === "starting" || state.status === "pending";
  return deviceAuthDialogView(
    {
      model: dialogModel,
      content: h.div([], [
        renderDeviceAuthSession(session, h),
        ...(busy
          ? [
              h.button(
                [h.Class("ml-2 mt-4 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] px-3 py-1.5 text-[12px]"), h.OnClick(Message.DeviceAuthCancelled({})), h.Type("button")],
                ["Cancel"],
              ),
            ]
          : []),
      ]),
      toParentMessage: (message) => Message.GotDeviceAuthDialogMessage({ message }),
    },
    h,
  );
};

export const renderDeviceAuthorizationForm = (
  state: DeviceAuthState,
  dialogModel: DeviceAuthDialogModel | undefined,
  h: HtmlBuilder<Message>,
  includeDialog = true,
): Html => {
  const textField = (label: string, field: DeviceAuthField, value: string) =>
    h.label(
      [h.Class("mt-3 flex flex-col gap-1 text-[12px]")],
      [
        h.span([], [label]),
        h.input([
          h.AriaLabel(label),
          h.Class("w-full max-w-[420px] rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1.5 text-[12px]"),
          h.OnInput((next) => Message.DeviceAuthFieldChanged({ field, value: next })),
          h.Type("text"),
          h.Value(value),
        ]),
      ],
    );
  const busy = state.status === "starting" || state.status === "pending";
  const form = h.section(
    [h.Class("rm3-next-route mt-6"), h.DataAttribute("route", "device-authorization"), h.DataAttribute("device-auth-state", state.status)],
    [
      h.h3([h.Class("text-[14px] font-semibold")], ["Provider connection"]),
      textField("Provider", "providerId", state.draft.providerId),
      textField("Provider kind", "providerKind", state.draft.providerKind),
      textField("Variant", "variantId", state.draft.variantId),
      textField("Auth mode", "authMode", state.draft.authMode),
      textField("Region", "region", state.draft.region),
      h.label([h.Class("mt-3 flex flex-col gap-1 text-[12px]")], [
        h.span([], ["Model"]),
        h.input([
          h.AriaLabel("Model"),
          h.Class("w-full max-w-[420px] rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1.5 text-[12px]"),
          h.OnInput((next) => Message.DeviceAuthFieldChanged({ field: "modelInput", value: next })),
          h.Type("text"),
          h.Value(state.draft.modelInput),
        ]),
      ]),
      h.button(
        [h.AriaLabel("Add model"), h.Class("mt-2 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-1.5 text-[12px]"), h.OnClick(Message.DeviceAuthModelAdded({})), h.Type("button")],
        ["Add model"],
      ),
      h.ul(
        [h.Class("mt-2 text-[12px]")],
        state.draft.selectedModelIds.map((modelId) =>
          h.li([], [modelId + " ", h.button([h.AriaLabel("Remove model " + modelId), h.Class("underline"), h.OnClick(Message.DeviceAuthModelRemoved({ modelId })), h.Type("button")], ["Remove"])]),
        ),
      ),
      h.button(
        [
          h.AriaLabel("Start device authorization"),
          h.Class("mt-4 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-1.5 text-[12px]"),
          h.AriaDisabled(busy),
          h.DataAttribute("device-auth-start", ""),
          h.OnClick(Message.DeviceAuthStartRequested({})),
          h.Type("button"),
        ],
        ["Start device authorization"],
      ),
      ...(state.status === "error"
        ? [
            h.button(
              [
                h.AriaLabel("Retry"),
                h.Class("ml-2 mt-4 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] px-3 py-1.5 text-[12px]"),
                h.DataAttribute("device-auth-retry", ""),
                h.OnClick(Message.DeviceAuthRetryRequested({})),
                h.Type("button"),
              ],
              ["Retry"],
            ),
          ]
        : []),
      ...(state.error === undefined
        ? []
        : [h.p([h.Role("alert"), h.DataAttribute("device-auth-error", "")], [state.error])]),
    ],
  );
  return h.div([], [
    form,
    ...(includeDialog ? [renderDeviceAuthorizationDialog(state, dialogModel, h)] : []),
  ]);
};
