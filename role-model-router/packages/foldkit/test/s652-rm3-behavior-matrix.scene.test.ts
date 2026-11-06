import { Schema } from "effect";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { inertHtml } from "../dist/html.js";
import * as Scene from "../dist/scene.js";
import { setup } from "../dist/test/vitest.js";
import type { Html, HtmlBuilder } from "../dist/types/html.js";
import type { Return as UpdateReturn } from "../dist/types/update.js";
import { defineMessageUnion } from "../dist/message.js";

import { rm3ButtonClassName, view as buttonView } from "../../ui/src/foldkit-button";
import { view as checkboxView } from "../../ui/src/foldkit-checkbox";
import { RM3_FIELD_CLASS, view as inputView } from "../../ui/src/foldkit-input";
import { view as textareaView } from "../../ui/src/foldkit-textarea";
import { cn } from "../../ui/src/lib/utils";
import { RM3_BEHAVIOR_MATRIX } from "../../ui/src/rm3-matrix";
import {
  AcquireResources as DialogAcquireResources,
  boot as dialogBoot,
  Message as DialogMessage,
  titleId as dialogTitleId,
  update as dialogUpdate,
  view as dialogView,
} from "../../foldkit-ui/dist/dialog.js";

setup();

const Message = defineMessageUnion({
  Pressed: {},
  Changed: { value: Schema.String },
});
type Message = typeof Message.Type;
type Model = Readonly<{ value: string }>;
const update = (model: Model, _message: Message): UpdateReturn<Model, Message> => ({ model });

const surface = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.DataAttribute("theme", "dark")],
    [
      buttonView<Message>({ children: ["Save"], onClick: Message.Pressed() }, h),
      checkboxView(
        {
          ariaLabel: "Enable feature",
          isChecked: false,
          onToggle: () => Message.Pressed(),
        },
        h,
      ),
      inputView(
        {
          id: "name",
          label: "Name",
          value: "",
          onInput: (value) => Message.Changed({ value }),
        },
        h,
      ),
      textareaView(
        {
          id: "notes",
          label: "Notes",
          value: "",
          onInput: (value) => Message.Changed({ value }),
        },
        h,
      ),
    ],
  );

describe("S652 RM3 behaviour matrix", () => {
  it("declares every required matrix dimension", () => {
    expect(Object.keys(RM3_BEHAVIOR_MATRIX).sort()).toEqual([
      "cnMerge",
      "dark",
      "disabled",
      "keyboardFocus",
      "light",
      "mobile",
      "overlay",
      "reducedMotion",
      "rtl",
    ]);
  });

  it("renders light and dark through the theme wrapper with identical control semantics", () => {
    for (const theme of ["light", "dark"]) {
      Scene.scene(
        {
          update,
          view: (model, h) =>
            h.div([h.DataAttribute("theme", theme)], [surface(h)]),
        },
        Scene.given({ value: "" }),
        Scene.expect(Scene.selector('div[data-theme="' + theme + '"]')).toExist(),
        Scene.expect(Scene.role("button")).toHaveAccessibleName("Save"),
        Scene.expect(Scene.role("textbox")).toHaveAttr("id", "name"),
        Scene.expect(Scene.role("textbox")).toHaveClass("w-full"),
        Scene.expectAll(Scene.all.role("textbox")).toHaveCount(2),
        Scene.expect(Scene.role("checkbox")).toHaveAccessibleName("Enable feature"),
      );
    }
  });

  it("keeps mobile block/full-width and keyboard focus affordances", () => {
    expect(RM3_BEHAVIOR_MATRIX.mobile).toContain("390");
    expect(rm3ButtonClassName("primary", { block: true })).toContain("w-full");
    expect(RM3_FIELD_CLASS).toContain("focus-visible:ring-[3px]");
    Scene.scene(
      { update, view: (_model, h) => buttonView<Message>({ block: true, children: ["Save"], onClick: Message.Pressed() }, h) },
      Scene.given({ value: "" }),
      Scene.expect(Scene.role("button")).toHaveClass("w-full"),
      Scene.expect(Scene.role("button")).toHaveHandler("click"),
    );
  });

  it("keeps labels and references in RTL without direction-dependent icon text", () => {
    Scene.scene(
      { update, view: (_model, h) => h.div([h.Dir("rtl")], [surface(h)]) },
      Scene.given({ value: "" }),
      Scene.expect(Scene.selector('div[dir="rtl"]')).toExist(),
      Scene.expect(Scene.role("button")).toHaveAccessibleName("Save"),
      Scene.expect(Scene.role("textbox")).toHaveAttr("id", "name"),
      Scene.expect(Scene.role("textbox")).toHaveAccessibleName("Name"),
      Scene.expect(Scene.role("checkbox")).toHaveAccessibleName("Enable feature"),
      Scene.expectAll(Scene.all.role("textbox")).toHaveCount(2),
    );
  });

  it("disables button, input and dialog dismissal states", () => {
    Scene.scene(
      { update, view: (_model, h) => buttonView<Message>({ isDisabled: true, children: ["Save"], onClick: Message.Pressed() }, h) },
      Scene.given({ value: "" }),
      Scene.expect(Scene.role("button")).toBeDisabled(),
      Scene.expect(Scene.role("button")).toHaveAttr("aria-disabled", "true"),
      Scene.expect(Scene.role("button")).not.toHaveHandler("click"),
    );
  });

  it("pins the donor cn merge and the intentional Foldkit concatenation difference", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    Scene.scene(
      {
        update,
        view: (_model, h) =>
          buttonView<Message>(
            { children: ["Save"], className: "px-1", onClick: Message.Pressed() },
            h,
          ),
      },
      Scene.given({ value: "" }),
      Scene.expect(Scene.role("button")).toHaveClass("px-3.5"),
      Scene.expect(Scene.role("button")).toHaveClass("px-1"),
    );
  });

  it("documents reduced-motion and cn-merge dispositions", () => {
    expect(RM3_BEHAVIOR_MATRIX.reducedMotion).toMatch(/no animation|reduced-motion/i);
    expect(RM3_BEHAVIOR_MATRIX.cnMerge).toMatch(/concat|tailwind-merge/i);
    const css = readFileSync(
      path.resolve(
        import.meta.dirname,
        "../../../../role-model-router/apps/runtime-ui/app/app.css",
      ),
      "utf8",
    );
    expect(css).toContain("prefers-reduced-motion");
  });
});

describe("S653 overlay dialog", () => {
  const model = dialogBoot({ id: "confirm" }).model;
  const dialogScene = (_state: Readonly<Record<string, never>>, h: HtmlBuilder<never>): Html =>
    dialogView(
      model,
      {
        hasDescription: true,
        toView: (renderInfo) =>
          h.dialog(
            renderInfo.dialog,
            [
              h.h2(renderInfo.title, ["Delete this endpoint?"]),
              h.p(renderInfo.description, ["This action cannot be undone."]),
              h.button(renderInfo.closeButton, ["Close"]),
            ],
          ),
      },
      h,
    );

  it("provides a screen-reader name and a dismiss control", () => {
    Scene.scene(
      { update: () => ({ model: {} }), view: dialogScene },
      Scene.given({}),
      Scene.expect(Scene.selector("dialog")).toExist(),
      Scene.expect(Scene.selector("dialog")).toHaveAttr(
        "aria-labelledby",
        dialogTitleId(model),
      ),
      Scene.expect(Scene.selector("dialog")).toContainText("Delete this endpoint?"),
      Scene.expect(Scene.role("button")).toContainText("Close"),
      Scene.Mount.resolve(
        DialogAcquireResources({
          id: "confirm",
          focusSelector: "[data-foldkit-dialog-initial-focus]",
        }),
        DialogMessage.FailedAcquireResources(),
      ),
    );
  });

  it("maps Escape/cancel and close to RequestedClose, closing the model", () => {
    const source = readFileSync(
      path.resolve(
        import.meta.dirname,
        "../../../../vendor/foldkit/packages/ui/src/dialog/index.ts",
      ),
      "utf8",
    );
    expect(source).toContain("h.OnCancelPreventDefault(Message.RequestedClose())");
    expect(source).toContain("h.OnClick(Message.RequestedClose())");
    const closed = dialogUpdate(model, DialogMessage.RequestedClose());
    expect(closed.model.isOpen).toBe(false);
    expect(closed.outMessage?._tag).toBe("Closed");
  });
});
