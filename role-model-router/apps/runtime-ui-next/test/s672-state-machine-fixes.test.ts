import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { Message } from "../src/message";
import type { Model } from "../src/model";
import { initDeviceAuthDialog } from "../src/ui/dialog";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S672: regression tests for the two S671 P1 state-machine findings.
 * RED before the fix: the save overwrites a newer draft, and cancel/activated leave the dialog open.
 */
const editorModel = (overrides: Partial<NonNullable<Model["runtimeConfigEditor"]>> = {}) =>
  shellModel({
    route: { _tag: "Runtime" },
    runtimeConfigEditor: {
      diff: [],
      originalText: '{"a":1}',
      status: "editing",
      text: '{"a":2}',
      token: 0,
      ...overrides,
    },
  });

describe("S672 runtime-config save must not clobber a newer draft", () => {
  it("drops the saved snapshot when the user edits after confirming", () => {
    const reviewed = shellUpdate(editorModel(), Message.RuntimeConfigSaveRequested({}));
    assert.equal(reviewed.model.runtimeConfigEditor?.status, "confirming");
    const token = reviewed.model.runtimeConfigEditor?.token ?? 0;
    const pending = shellUpdate(
      reviewed.model,
      Message.RuntimeConfigConfirmRequested({ token }),
    );
    assert.equal(pending.model.runtimeConfigEditor?.status, "pending");

    const edited = shellUpdate(
      pending.model,
      Message.RuntimeConfigTextChanged({ text: '{"a":3}' }),
    );
    assert.equal(edited.model.runtimeConfigEditor?.text, '{"a":3}');
    assert.equal(edited.model.runtimeConfigEditor?.status, "editing");

    const saved = shellUpdate(
      edited.model,
      Message.RuntimeConfigSaved({
        recordJson: '{"config":{"a":4},"applied":true}',
        status: 200,
        token,
      }),
    );
    assert.equal(
      saved.model.runtimeConfigEditor?.text,
      '{"a":3}',
      "the newer draft must not be replaced by the server snapshot",
    );
    assert.equal(saved.model.runtimeConfigEditor?.status, "editing");
  });
});

describe("S672 device-auth cancel/activated closes the modal", () => {
  const deviceModel = () => {
    const dialog = initDeviceAuthDialog();
    return shellModel({
      route: { _tag: "Providers" },
      deviceAuth: {
        draft: {
          authMode: "oauth2-device-code",
          modelInput: "",
          providerId: "moonshot",
          providerKind: "direct",
          region: "global",
          selectedModelIds: [],
          variantId: "v1",
        },
        inflight: true,
        session: {
          authRequestId: "auth-1",
          providerAccountId: "moonshot.personal.v1",
          status: "pending",
          userCode: "CODE",
        },
        status: "pending",
        token: 1,
      },
      deviceAuthDialog: { ...dialog, isOpen: true },
      deviceAuthModalKey: "auth-1:CODE",
    });
  };

  it("cancel closes the dialog and clears the modal key", () => {
    const next = shellUpdate(deviceModel(), Message.DeviceAuthCancelled({}));
    assert.equal(next.model.deviceAuth?.status, "draft");
    assert.equal(next.model.deviceAuthDialog?.isOpen, false, "cancel must close the modal");
    assert.equal(next.model.deviceAuthModalKey, undefined);
  });

  it("activation closes the dialog after connected", () => {
    const next = shellUpdate(deviceModel(), Message.DeviceAuthActivated({ token: 1 }));
    assert.equal(next.model.deviceAuth?.status, "pending");
    assert.equal(next.model.deviceAuth?.inflight, true);
    assert.equal(next.model.deviceAuthDialog?.isOpen, false, "activation must close the modal");
    assert.equal(next.model.deviceAuthModalKey, undefined);
  });
});
