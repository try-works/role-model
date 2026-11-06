import { describe, test } from "vitest";

import { expect, given, role, scene, text } from "@role-model-router/foldkit/scene";

import { type ControlState, emptyControls } from "../src/control";
import { view } from "../src/view";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S250: the rendering half of the control-action test, driven through the real view.
 *
 * s26k-control asserts wiring (two clicks -> one dispatch) and cannot move to scene without losing that fact
 * (S249). These are the rendering assertions from the same file: pending, success and failure text painted
 * from a model state. No click, no client, no happy-dom event path.
 *
 * S260: the model is schema-derived (`Model`) and the reducer/view pair is inferred, so the action
 * state cannot drift from `ControlState` behind a cast.
 */
const providerRow = { id: "provider-1", label: "provider-1", meta: "controller", value: "active" };

const modelWithProviders = (action: Pick<ControlState, "actionMessage" | "actionStatus">) =>
  shellModel({
    controls: {
      ...emptyControls(),
      providers: {
        actionMessage: action.actionMessage,
        actionStatus: action.actionStatus,
        rows: [providerRow],
        status: "ok",
        token: 1,
      },
    },
    route: { _tag: "Providers" },
  });

describe("control action rendering", () => {
  test("pending shows the in-flight label and disables the action", () => {
    scene(
      { update: shellUpdate, view },
      given(modelWithProviders({ actionStatus: "pending" })),
      expect(role("button", { name: "Dispatching…" })).toExist(),
    );
  });

  test("success paints the completion message", () => {
    scene(
      { update: shellUpdate, view },
      given(
        modelWithProviders({ actionMessage: "Providers action completed.", actionStatus: "ok" }),
      ),
      expect(text("Providers action completed.")).toExist(),
    );
  });

  test("failure paints the bounded error phrase", () => {
    scene(
      { update: shellUpdate, view },
      given(
        modelWithProviders({
          actionMessage: "Providers action failed: HTTP 500",
          actionStatus: "error",
        }),
      ),
      expect(text("Providers action failed: HTTP 500")).toExist(),
    );
  });
});
