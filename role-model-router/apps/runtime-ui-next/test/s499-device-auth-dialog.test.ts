import { describe, it } from "vitest";

import {
  click,
  Command,
  expect as sceneExpect,
  given,
  Mount,
  role,
  scene,
  selector,
} from "@role-model-router/foldkit/scene";
import * as Dialog from "@role-model-router/foldkit-ui/dialog";

import { initialDeviceAuthState } from "../src/device-auth";
import { view } from "../src/view";
import { shellModel, shellUpdate } from "./support/runtime-shell";

const acknowledgeAcquireResources = Mount.resolve(
  Dialog.AcquireResources,
  Dialog.Message.SucceededAcquireResources(),
);

const pendingState = () => ({
  ...initialDeviceAuthState(),
  inflight: true,
  session: {
    authRequestId: "auth-pending",
    providerAccountId: "openai.personal.openai-codex-subscription",
    status: "pending" as const,
    userCode: "ABCD-EFGH",
    verificationUriComplete: "https://auth.openai.com/device?user_code=ABCD-EFGH",
  },
  status: "pending" as const,
});

describe("S499 device-auth session dialog", () => {
  it("renders the pending session inside a real modal dialog with the code and aria-modal", () => {
    scene(
      { update: shellUpdate, view },
      given(shellModel({ deviceAuth: pendingState(), route: { _tag: "Providers" } })),
      acknowledgeAcquireResources,
      sceneExpect(selector("[data-device-auth-modal]")).toExist(),
      sceneExpect(selector("[data-device-auth-modal]")).toHaveAttr("aria-modal", "true"),
      sceneExpect(selector("[data-device-auth-modal]")).toHaveAttr("open", "true"),
      sceneExpect(selector("[data-device-auth-user-code]")).toContainText("ABCD-EFGH"),
      sceneExpect(selector("[data-device-auth-verification-link]")).toHaveAttr(
        "href",
        "https://auth.openai.com/device?user_code=ABCD-EFGH",
      ),
      sceneExpect(role("button", { name: "Dismiss" })).toExist(),
      click(role("button", { name: "Dismiss" })),
      Command.resolve(Dialog.CloseDialog, Dialog.Message.CompletedCloseDialog()),
      Mount.expectEnded(Dialog.AcquireResources),
      sceneExpect(selector("[data-device-auth-modal]")).toBeAbsent(),
    );
  });
});
