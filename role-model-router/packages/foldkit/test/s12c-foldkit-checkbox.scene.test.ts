import { Option, Schema } from "effect";
import { describe, expect, it } from "vitest";

import { defineMessageUnion } from "../dist/message.js";
import * as Scene from "../dist/scene.js";
import { setup } from "../dist/test/vitest.js";
import type { Html, HtmlBuilder } from "../dist/types/html.js";
import type { Return as UpdateReturn } from "../dist/types/update.js";

import {
  RM3_CHECKBOX_BASE_CLASS,
  RM3_CHECKBOX_CHECKED_CLASS,
  RM3_CHECKBOX_UNCHECKED_CLASS,
  view as checkboxView,
} from "../../ui/src/foldkit-checkbox";

setup();

/**
 * Run 115 S12c (R7/R8): the RM3 checkbox primitive.
 *
 * The live RM3 checkbox is not a native <input type="checkbox">: it is a <button
 * role="checkbox">, 16x16, radius 4, primary fill when on, with a check/dash SVG
 * (role-model-router/apps/runtime-ui/app/components/checkbox-control.tsx:4-5,30-73).
 * Its classes and SVG paths are copied verbatim below; there is no checkbox helper in
 * design-system.ts. aria-label is the live accessible-name mechanism (every live usage passes
 * one), with an optional explicit <label for> path added for form-style call sites.
 */

const Message = defineMessageUnion({
  Toggled: { isChecked: Schema.Boolean },
});
type Message = typeof Message.Type;

type Model = Readonly<{
  isChecked: boolean;
  lastToggle: boolean;
}>;

const update = (model: Model, message: Message): UpdateReturn<Model, Message> =>
  Message.match<UpdateReturn<Model, Message>>(message, {
    Toggled: ({ isChecked }) => ({ model: { isChecked, lastToggle: isChecked } }),
  });

const sceneView =
  ({
    isDisabled = false,
    isMixed = false,
  }: Readonly<{ isDisabled?: boolean; isMixed?: boolean }> = {}) =>
  (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
      [h.DataAttribute("last-toggle", String(model.lastToggle))],
      [
        checkboxView(
          {
            ariaLabel: "Bind role viewer",
            isChecked: model.isChecked,
            isMixed,
            isDisabled,
            onToggle: (isChecked) => Message.Toggled({ isChecked }),
          },
          h,
        ),
      ],
    );

const checkbox = Scene.role("checkbox");
const lastToggle = Scene.selector('div[data-last-toggle="true"]');

const labelledView =
  ({ labelled }: Readonly<{ labelled: boolean }>) =>
  (model: Model, h: HtmlBuilder<Message>): Html =>
    checkboxView(
      labelled
        ? {
            id: "accept-terms",
            label: "Accept terms",
            isChecked: model.isChecked,
            onToggle: (isChecked) => Message.Toggled({ isChecked }),
          }
        : {
            isChecked: model.isChecked,
            onToggle: (isChecked) => Message.Toggled({ isChecked }),
          },
      h,
    );

describe("RM3 checkbox Foldkit primitive", () => {
  it("reflects the model, dispatches the next checked payload, and keeps the live RM3 state classes", () => {
    // Frozen live contract: the three exported class constants are the checkbox-control.tsx
    // strings; deleting a token must fail here rather than silently change the rendered control.
    expect([
      RM3_CHECKBOX_BASE_CLASS,
      RM3_CHECKBOX_CHECKED_CLASS,
      RM3_CHECKBOX_UNCHECKED_CLASS,
    ]).toEqual([
      "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
      "border-primary bg-primary text-primary-foreground",
      "border-[var(--rm-border-strong)] bg-[var(--rm-panel)] text-transparent",
    ]);

    Scene.scene(
      { update, view: sceneView() },
      Scene.given({ isChecked: false, lastToggle: false }),
      Scene.expect(checkbox).toHaveAccessibleName("Bind role viewer"),
      Scene.expect(checkbox).toHaveAttr("role", "checkbox"),
      Scene.expect(checkbox).toHaveAttr("type", "button"),
      Scene.expect(checkbox).toHaveAttr("aria-checked", "false"),
      Scene.expect(checkbox).toHaveAttr(
        "class",
        [RM3_CHECKBOX_BASE_CLASS, RM3_CHECKBOX_UNCHECKED_CLASS].join(" "),
      ),
      Scene.expect(checkbox).toHaveHandler("click"),
      Scene.click(checkbox),
      Scene.expectHandled(),
      Scene.expect(checkbox).toHaveAttr("aria-checked", "true"),
      Scene.expect(checkbox).toHaveAttr(
        "class",
        [RM3_CHECKBOX_BASE_CLASS, RM3_CHECKBOX_CHECKED_CLASS].join(" "),
      ),
      Scene.expect(lastToggle).toExist(),
    );
  });

  it("renders checked from the model, not from local state", () => {
    Scene.scene(
      { update, view: sceneView() },
      Scene.given({ isChecked: true, lastToggle: true }),
      Scene.expect(checkbox).toHaveAttr("aria-checked", "true"),
      Scene.expect(checkbox).toHaveAttr(
        "class",
        [RM3_CHECKBOX_BASE_CLASS, RM3_CHECKBOX_CHECKED_CLASS].join(" "),
      ),
      Scene.click(checkbox),
      Scene.expectHandled(),
      Scene.expect(checkbox).toHaveAttr("aria-checked", "false"),
      Scene.expect(checkbox).toHaveAttr(
        "class",
        [RM3_CHECKBOX_BASE_CLASS, RM3_CHECKBOX_UNCHECKED_CLASS].join(" "),
      ),
    );
  });

  it("emits nothing when disabled", () => {
    Scene.scene(
      { update, view: sceneView({ isDisabled: true }) },
      Scene.given({ isChecked: false, lastToggle: false }),
      Scene.expect(checkbox).toBeDisabled(),
      Scene.expect(checkbox).not.toHaveHandler("click"),
      // The live control emits no data-disabled marker (0 usages); the port must not invent one.
      Scene.expect(checkbox).not.toHaveAttr("data-disabled"),
    );

    expect(() =>
      Scene.scene(
        { update, view: sceneView({ isDisabled: true }) },
        Scene.given({ isChecked: false, lastToggle: false }),
        Scene.click(checkbox),
      ),
    ).toThrow(/disabled/);
  });

  it("supports the mixed state as aria-checked=mixed", () => {
    Scene.scene(
      { update, view: sceneView({ isMixed: true }) },
      Scene.given({ isChecked: true, lastToggle: true }),
      Scene.expect(checkbox).toHaveAttr("aria-checked", "mixed"),
    );
  });

  it("associates an explicit label when given one, and refuses a nameless checkbox", () => {
    Scene.scene(
      { update, view: labelledView({ labelled: true }) },
      Scene.given({ isChecked: false, lastToggle: false }),
      Scene.expect(checkbox).toHaveAccessibleName("Accept terms"),
      Scene.expect(checkbox).toHaveAttr("id", "accept-terms"),
      Scene.expect(Scene.label("Accept terms")).toHaveAttr("id", "accept-terms"),
    );

    expect(() =>
      Scene.scene(
        { update, view: labelledView({ labelled: false }) },
        Scene.given({ isChecked: false, lastToggle: false }),
      ),
    ).toThrow(/accessible name/);
  });

  it("forwards caller-supplied click/pointerdown hooks so a caller can prevent the default toggle", () => {
    // The live control (checkbox-control.tsx:43-49) runs onPointerDown and onClick first and only
    // toggles when the event was not default-prevented; local-model-role-picker.tsx:312-321 uses
    // both to keep a surrounding <summary> from toggling. These are Foldkit event ATTRIBUTES, so
    // the caller controls ClickOptions (defaultAction/propagation) and the primitive suppresses
    // its own toggle whenever a caller onClick attribute is present.
    const HookMessage = defineMessageUnion({
      CallerClicked: {},
      ParentClicked: {},
      PointerDowned: {},
      DefaultToggled: {},
    });
    type HookMessage = typeof HookMessage.Type;
    type HookModel = Readonly<{
      callerClicks: number;
      parentClicks: number;
      pointerDowns: number;
      defaultToggles: number;
    }>;
    const hookUpdate = (
      model: HookModel,
      message: HookMessage,
    ): UpdateReturn<HookModel, HookMessage> =>
      HookMessage.match<UpdateReturn<HookModel, HookMessage>>(message, {
        CallerClicked: () => ({ model: { ...model, callerClicks: model.callerClicks + 1 } }),
        ParentClicked: () => ({ model: { ...model, parentClicks: model.parentClicks + 1 } }),
        PointerDowned: () => ({ model: { ...model, pointerDowns: model.pointerDowns + 1 } }),
        DefaultToggled: () => ({ model: { ...model, defaultToggles: model.defaultToggles + 1 } }),
      });
    const hookView = (model: HookModel, h: HtmlBuilder<HookMessage>): Html =>
      h.div(
        [
          h.DataAttribute("caller-clicks", String(model.callerClicks)),
          h.DataAttribute("parent-clicks", String(model.parentClicks)),
          h.DataAttribute("pointer-downs", String(model.pointerDowns)),
          h.DataAttribute("default-toggles", String(model.defaultToggles)),
          h.OnClick(HookMessage.ParentClicked()),
        ],
        [
          checkboxView(
            {
              ariaLabel: "Bind role viewer",
              isChecked: false,
              onClick: h.OnClick(HookMessage.CallerClicked(), {
                defaultAction: "Prevent",
                propagation: "Stop",
              }),
              onPointerDown: h.OnPointerDown(() => Option.some(HookMessage.PointerDowned())),
              onToggle: () => HookMessage.DefaultToggled(),
            },
            h,
          ),
        ],
      );

    Scene.scene(
      { update: hookUpdate, view: hookView },
      Scene.given({ callerClicks: 0, parentClicks: 0, pointerDowns: 0, defaultToggles: 0 }),
      Scene.expect(Scene.selector('div[data-caller-clicks="0"]')).toExist(),
      Scene.click(checkbox),
      Scene.expectHandled(),
      Scene.expect(Scene.selector('div[data-caller-clicks="1"]')).toExist(),
      Scene.expect(Scene.selector('div[data-default-toggles="0"]')).toExist(),
      Scene.expect(Scene.selector('div[data-parent-clicks="0"]')).toExist(),
      Scene.pointerDown(checkbox),
      Scene.expectHandled(),
      Scene.expect(Scene.selector('div[data-pointer-downs="1"]')).toExist(),
    );
  });
});
