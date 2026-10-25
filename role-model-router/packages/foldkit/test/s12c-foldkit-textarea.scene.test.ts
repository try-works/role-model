import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { defineMessageUnion } from "../dist/message.js";
import * as Scene from "../dist/scene.js";
import { setup } from "../dist/test/vitest.js";
import type { Html, HtmlBuilder } from "../dist/types/html.js";
import type { Return as UpdateReturn } from "../dist/types/update.js";

import { RM3_FIELD_CLASS } from "../../ui/src/foldkit-input";
import { view as textareaView } from "../../ui/src/foldkit-textarea";

setup();

/**
 * Run 115 S12c (R7/R8): the RM3 textarea primitive.
 *
 * There is no dedicated textarea helper in the live design system: every live call composes
 * fieldClassName (design-system.ts:1233-1234) with per-use height/mono classes, e.g.
 * apps/runtime-ui/app/routes/extensions.tsx:818 (`${fieldClassName} mt-1 min-h-24 font-mono`).
 * This primitive keeps that composition: the base class is fixed, className is appended.
 */

const Message = defineMessageUnion({ Changed: { value: Schema.String } });
type Message = typeof Message.Type;
type Model = Readonly<{ value: string }>;

const update = (model: Model, message: Message): UpdateReturn<Model, Message> =>
  Message.match<UpdateReturn<Model, Message>>(message, {
    Changed: ({ value }) => ({ model: { value } }),
  });

const sceneView =
  ({ isDisabled = false }: Readonly<{ isDisabled?: boolean }> = {}) =>
  (model: Model, h: HtmlBuilder<Message>): Html =>
    textareaView(
      {
        id: "message",
        label: "Message",
        value: model.value,
        onInput: (value) => Message.Changed({ value }),
        placeholder: "Write a message",
        name: "message",
        inputMode: "text",
        autoComplete: "off",
        rows: 4,
        isDisabled,
        className: "min-h-24 font-mono",
      },
      h,
    );

const field = Scene.role("textbox");

const unlabelledView =
  (config: Readonly<{ ariaLabel?: string }>) =>
  (model: Model, h: HtmlBuilder<Message>): Html =>
    textareaView(
      {
        id: "notes",
        value: model.value,
        onInput: (value) => Message.Changed({ value }),
        ...config,
      },
      h,
    );

describe("RM3 textarea Foldkit primitive", () => {
  it("associates its label, keeps the live field classes plus caller layout, and dispatches the typed value", () => {
    Scene.scene(
      { update, view: sceneView() },
      Scene.given({ value: "" }),
      Scene.expect(field).toHaveAccessibleName("Message"),
      Scene.expect(field).toHaveAttr("id", "message"),
      Scene.expect(field).toHaveAttr("name", "message"),
      Scene.expect(field).toHaveAttr("placeholder", "Write a message"),
      Scene.expect(field).toHaveAttr("rows", "4"),
      Scene.expect(field).toHaveAttr("inputmode", "text"),
      Scene.expect(field).toHaveAttr("autocomplete", "off"),
      // Full class-attribute equality instead of a few tokens: a composition that drops
      // focus-visible:ring-[3px], placeholder:* or shadow-xs no longer passes.
      Scene.expect(field).toHaveAttr("class", [RM3_FIELD_CLASS, "min-h-24 font-mono"].join(" ")),
      Scene.type(field, "hello"),
      Scene.expect(field).toHaveValue("hello"),
    );
  });

  it("does not emit when disabled", () => {
    Scene.scene(
      { update, view: sceneView({ isDisabled: true }) },
      Scene.given({ value: "" }),
      Scene.expect(field).toBeDisabled(),
      Scene.expect(field).toHaveAttr("data-disabled", ""),
      Scene.expect(field).not.toHaveHandler("input"),
    );

    expect(() =>
      Scene.scene(
        { update, view: sceneView({ isDisabled: true }) },
        Scene.given({ value: "" }),
        Scene.type(field, "nope"),
      ),
    ).toThrow(/no input handler/);
  });

  it("uses aria-label when there is no visible label, and refuses a nameless textarea", () => {
    Scene.scene(
      { update, view: unlabelledView({ ariaLabel: "Notes" }) },
      Scene.given({ value: "" }),
      Scene.expect(field).toHaveAccessibleName("Notes"),
      Scene.expect(field).toHaveAttr("aria-label", "Notes"),
    );

    expect(() =>
      Scene.scene({ update, view: unlabelledView({}) }, Scene.given({ value: "" })),
    ).toThrow(/accessible name/);
  });
});
