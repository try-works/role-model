import { describe, test } from "vitest";

import { expect, given, role, scene, selector, text } from "@role-model-router/foldkit/scene";

import type { Model } from "../src/model";
import { view } from "../src/view";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S256: the rendering half of the s76a runtime-config test, driven through the real view.
 *
 * s76a proved what the editor paints by clicking Load, Review changes and Confirm save. The paint is a function
 * of the runtimeConfigEditor state, so it is asserted here with no DOM click (S249: scene may replace rendering
 * assertions). s76a keeps the wiring assertions that need a real client: the stale-confirm guard, the PUT body
 * and the 409 path.
 *
 * S260: the editor shape is derived from `Model`, not restated as a hand-written interface, and the
 * update/view pair is inferred from src signatures.
 */
type Editor = NonNullable<Model["runtimeConfigEditor"]>;

const model = (editor?: Editor) =>
  shellModel(
    editor === undefined
      ? { route: { _tag: "RuntimeConfig" } }
      : { route: { _tag: "RuntimeConfig" }, runtimeConfigEditor: editor },
  );

const original = '{\n  "a": 1,\n  "b": 2\n}';
const edited = '{\n  "a": 1,\n  "b": 3\n}';
const savedText = '{\n  "a": 1,\n  "b": 99\n}';

describe("S256 runtime config editor rendering", () => {
  test("before Load only the Load button is offered, with no editor and no save", () => {
    scene(
      { update: shellUpdate, view },
      given(model()),
      expect(role("button", { name: "Load runtime config" })).toExist(),
      expect(selector("[data-runtime-config-editor]")).toBeAbsent(),
      expect(selector("[data-runtime-config-save]")).toBeAbsent(),
      expect(text("Runtime config not loaded. Click Load runtime config first.")).toExist(),
    );
  });

  test("the editing state paints the editor and an enabled review button", () => {
    scene(
      { update: shellUpdate, view },
      given(model({ diff: [], originalText: original, status: "editing", text: edited, token: 0 })),
      expect(selector("[data-runtime-config-editor]")).toHaveValue(edited),
      expect(role("button", { name: "Review changes" })).toBeEnabled(),
      expect(role("alert")).toBeAbsent(),
    );
  });

  test("invalid JSON paints the alert and keeps the typed text", () => {
    scene(
      { update: shellUpdate, view },
      given(
        model({
          diff: [],
          message: "Unexpected end of JSON input",
          originalText: original,
          status: "invalid",
          text: "{bad",
          token: 0,
        }),
      ),
      expect(selector("[data-runtime-config-error]")).toHaveAttr("role", "alert"),
      expect(selector("[data-runtime-config-error]")).toContainText("Unexpected end of JSON input"),
      expect(selector("[data-runtime-config-editor]")).toHaveValue("{bad"),
    );
  });

  test("confirming lists the changed top-level keys and offers Confirm save", () => {
    scene(
      { update: shellUpdate, view },
      given(
        model({
          diff: ["changed: b"],
          originalText: original,
          status: "confirming",
          text: edited,
          token: 0,
        }),
      ),
      expect(selector("[data-runtime-config-confirm]")).toExist(),
      expect(text("changed: b")).toExist(),
      expect(role("button", { name: "Confirm save" })).toExist(),
      expect(selector("[data-runtime-config-editor]")).toHaveValue(edited),
    );
  });

  test("a saved state paints the applied-snapshot notice and the server text", () => {
    scene(
      { update: shellUpdate, view },
      given(
        model({
          diff: [],
          notice: "Applied snapshot from server",
          originalText: savedText,
          status: "saved",
          text: savedText,
          token: 1,
        }),
      ),
      expect(selector("[data-runtime-config-notice]")).toHaveAttr("role", "status"),
      expect(selector("[data-runtime-config-notice]")).toContainText(
        "Applied snapshot from server",
      ),
      expect(selector("[data-runtime-config-editor]")).toHaveValue(savedText),
    );
  });
});
