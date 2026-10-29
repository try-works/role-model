import type { Command as FoldCommand } from "@role-model-router/foldkit/command";
import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import type { View as SubmodelView } from "@role-model-router/foldkit/submodel";
import * as Dialog from "@role-model-router/foldkit-ui/dialog";

/**
 * Workspace W1b (S499): the device-auth session Dialog facade.
 *
 * The dialog owns Escape/backdrop/focus/aria-modal through the real vendored
 * Foldkit Dialog. The inline draft/start/retry form stays outside this wrapper.
 */
export type DeviceAuthDialogModel = Dialog.Model;

const dialogView: SubmodelView<DeviceAuthDialogModel, Dialog.Message, Dialog.ViewInputs> =
  Dialog.view;

export const initDeviceAuthDialog = (): DeviceAuthDialogModel =>
  Dialog.boot({ focusSelector: "[data-device-auth-dialog-dismiss]", id: "device-auth-modal" }).model;

export interface DeviceAuthDialogUpdate {
  readonly model: DeviceAuthDialogModel;
  readonly commands: readonly FoldCommand<Dialog.Message>[];
}

export const openDeviceAuthDialog = (model: DeviceAuthDialogModel | undefined): DeviceAuthDialogModel =>
  Dialog.open(model ?? initDeviceAuthDialog()).model;

export const deviceAuthModalKeyFor = (session: {
  readonly authRequestId: string;
  readonly userCode?: string;
}): string => session.authRequestId + ":" + (session.userCode ?? "");

export const updateDeviceAuthDialog = (
  model: DeviceAuthDialogModel | undefined,
  message: Dialog.Message,
): DeviceAuthDialogUpdate => {
  const result = Dialog.update(model ?? initDeviceAuthDialog(), message);
  return { commands: result.commands ?? [], model: result.model };
};

export const deviceAuthDialogView = <ParentMessage>(
  config: {
    readonly model: DeviceAuthDialogModel | undefined;
    readonly content: Html;
    readonly toParentMessage: (message: Dialog.Message) => ParentMessage;
  },
  h: HtmlBuilder<ParentMessage>,
): Html =>
  h.submodel({
    slotId: "device-auth-modal",
    model: config.model ?? initDeviceAuthDialog(),
    view: dialogView,
    viewInputs: {
      hasDescription: true,
      toView: (render) =>
        render.isVisible
          ? h.dialog([
              ...render.dialog,
              h.DataAttribute("device-auth-modal", ""),
            ], [
              h.div([...render.backdrop], []),
              h.div([...render.panel], [
                h.h2([...render.title], ["OpenAI verification code"]),
                h.p([...render.description], [
                  "Keep this code visible, then enter it on the OpenAI page after you sign in.",
                ]),
                config.content,
                h.button(
                  [
                    ...render.closeButton,
                    h.DataAttribute("device-auth-dialog-dismiss", ""),
                    h.Class("mt-4 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] px-3 py-1.5 text-[12px]"),
                  ],
                  ["Dismiss"],
                ),
              ]),
            ])
          : h.span([], []),
    },
    toParentMessage: config.toParentMessage,
  });