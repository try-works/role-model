import type { Command } from "@role-model-router/foldkit/command";
import * as Dialog from "@role-model-router/foldkit-ui/dialog";

import type { Model } from "../../model";
import { openDeviceAuthDialog } from "../../ui/dialog";
import type { DeviceAuthSession, DeviceAuthState } from "./model";

/** W1c (S509): pure device-auth update/wiring decisions. The parent dispatcher owns Commands. */
export const withDeviceAuthDialog = (model: Model, session: DeviceAuthSession): Model => {
  if (session.status !== "pending" || session.userCode === undefined) return model;
  const key = `${session.authRequestId}:${session.userCode}`;
  if (model.deviceAuthModalKey === key) return model;
  return {
    ...model,
    deviceAuthDialog: openDeviceAuthDialog(model.deviceAuthDialog),
    deviceAuthModalKey: key,
  };
};

/** S672: every terminal/cancel transition closes the session modal, not just the deviceAuth slice. */
export const closeDeviceAuthDialog = (
  model: Model,
): Readonly<{ model: Model; commands: ReadonlyArray<Command<Dialog.Message>> }> => {
  if (model.deviceAuthDialog === undefined)
    return { commands: [], model: { ...model, deviceAuthModalKey: undefined } };
  const closed = Dialog.close(model.deviceAuthDialog);
  return {
    commands: closed.commands ?? [],
    model: {
      ...model,
      deviceAuthDialog: closed.model,
      deviceAuthModalKey: undefined,
    },
  };
};

export const deviceAuthCancelledState = (state: DeviceAuthState): DeviceAuthState => ({
  ...state,
  error: undefined,
  inflight: false,
  session: undefined,
  sessions: undefined,
  status: "draft",
  token: state.token + 1,
});

export const deviceAuthFailedState = (
  state: DeviceAuthState,
  message: string,
): DeviceAuthState => ({
  ...state,
  error: message,
  inflight: false,
  status: "error",
});
