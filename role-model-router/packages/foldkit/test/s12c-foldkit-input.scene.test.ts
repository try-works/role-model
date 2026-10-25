import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { defineMessageUnion } from "../dist/message.js";
import * as Scene from "../dist/scene.js";
import { setup } from "../dist/test/vitest.js";
import type { Html, HtmlBuilder } from "../dist/types/html.js";
import type { Return as UpdateReturn } from "../dist/types/update.js";

import { RM3_FIELD_CLASS, view as inputView } from "../../ui/src/foldkit-input";

setup();

/**
 * Run 115 S12c (R7/R8): the RM3 input primitive, following the accepted button shape.
 *
 * The RM3 class contract comes from the LIVE helpers, not the stale doc:
 * apps/runtime-ui/app/lib/design-system.ts:1233-1234 (fieldClassName) and :1177
 * (fieldLabelClassName). The live doc claim of 44px fields (DESIGN_SYSTEM.md:388) is stale;
 * the code says min-h-[34px].
 *
 * The id is caller-owned and stable (never generated from an array index), following the
 * digest's slotId guidance (evidence/other/foldkit-0.169-api-notes.md, section 2.4/2.5).
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
    inputView(
      {
        id: "email",
        label: "Email",
        value: model.value,
        onInput: (value) => Message.Changed({ value }),
        placeholder: "you@example.com",
        name: "email",
        inputMode: "numeric",
        autoComplete: "off",
        isDisabled,
        className: "mt-1",
      },
      h,
    );

const field = Scene.role("textbox");

const unlabelledView =
  (config: Readonly<{ ariaLabel?: string }>) =>
  (model: Model, h: HtmlBuilder<Message>): Html =>
    inputView(
      {
        id: "search",
        value: model.value,
        onInput: (value) => Message.Changed({ value }),
        ...config,
      },
      h,
    );

describe("RM3 input Foldkit primitive", () => {
  it("associates its label, carries the live RM3 field classes, and dispatches the typed value", () => {
    // Frozen live contract: deleting a token from the exported constant must fail here rather than
    // silently change the rendered field (design-system.ts:1233-1234 byte parity).
    expect(RM3_FIELD_CLASS).toBe(
      "w-full min-h-[34px] rounded-md border border-input bg-background px-3 py-1.5 font-sans !text-[13px] !font-normal !leading-[18px] !tracking-[0em] text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    );

    Scene.scene(
      { update, view: sceneView() },
      Scene.given({ value: "" }),
      Scene.expect(field).toHaveAccessibleName("Email"),
      Scene.expect(field).toHaveAttr("id", "email"),
      Scene.expect(field).toHaveAttr("type", "text"),
      Scene.expect(field).toHaveAttr("name", "email"),
      Scene.expect(field).toHaveAttr("placeholder", "you@example.com"),
      Scene.expect(field).toHaveAttr("inputmode", "numeric"),
      Scene.expect(field).toHaveAttr("autocomplete", "off"),
      // Full class-attribute equality instead of a few tokens: a composition that drops
      // focus-visible:ring-[3px], placeholder:* or shadow-xs no longer passes.
      Scene.expect(field).toHaveAttr("class", [RM3_FIELD_CLASS, "mt-1"].join(" ")),
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

  it("uses aria-label when there is no visible label, and refuses a nameless field", () => {
    Scene.scene(
      { update, view: unlabelledView({ ariaLabel: "Search" }) },
      Scene.given({ value: "" }),
      Scene.expect(field).toHaveAccessibleName("Search"),
      Scene.expect(field).toHaveAttr("aria-label", "Search"),
    );

    expect(() =>
      Scene.scene({ update, view: unlabelledView({}) }, Scene.given({ value: "" })),
    ).toThrow(/accessible name/);
  });
});
