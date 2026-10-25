import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { defineMessageUnion } from "../dist/message.js";
import * as Scene from "../dist/scene.js";
import { setup } from "../dist/test/vitest.js";
import type { Html, HtmlBuilder } from "../dist/types/html.js";
import type { Return as UpdateReturn } from "../dist/types/update.js";

import {
  type Rm3ButtonVariant,
  rm3ButtonClassName,
  view as rm3ButtonView,
} from "../../ui/src/foldkit-button";

setup();

/**
 * Run 115 S12b (R7/R8): the first RM3 primitive ported to Foldkit.
 *
 * There is no React Button component in this repository (the RM3 button contract lives in
 * role-model-router/apps/runtime-ui/app/lib/design-system.ts:1247-1265 as class helpers and in
 * DESIGN_SYSTEM.md:379-384). These Scene tests pin the behaviour a consumer relies on: a click
 * dispatches the configured Message, a disabled button dispatches nothing and is not clickable,
 * the rendered VNode keeps the RM3 token classes, and every button has an accessible name.
 */

const Message = defineMessageUnion({ Pressed: {} });
type Message = typeof Message.Type;
type Model = Readonly<{ presses: number }>;

const update = (model: Model, message: Message): UpdateReturn<Model, Message> =>
  Message.match(message, {
    Pressed: () => ({ model: { presses: model.presses + 1 } }),
  });

const button = Scene.role("button");

interface ViewOptions {
  readonly variant?: Rm3ButtonVariant;
  readonly isDisabled?: boolean;
  readonly block?: boolean;
  readonly ariaLabel?: string;
  readonly iconOnly?: boolean;
}

const sceneView =
  (options: ViewOptions = {}) =>
  (model: Model, h: HtmlBuilder<Message>): Html =>
    rm3ButtonView<Message>(
      {
        variant: options.variant ?? "primary",
        block: options.block,
        isDisabled: options.isDisabled,
        ariaLabel: options.ariaLabel,
        onClick: Message.Pressed(),
        children: options.iconOnly
          ? [h.span([h.AriaHidden(true)], ["x"])]
          : [`Save changes (${model.presses})`],
      },
      h,
    );

describe("RM3 button Foldkit primitive", () => {
  it("emits its message on click and the model observes it", () => {
    Scene.scene(
      { update, view: sceneView() },
      Scene.given({ presses: 0 }),
      Scene.expect(button).toHaveAccessibleName("Save changes (0)"),
      Scene.expect(button).toHaveAttr("type", "button"),
      Scene.expect(button).toHaveClass("bg-primary"),
      Scene.expect(button).toHaveClass("h-[36px]"),
      Scene.expect(button).toHaveClass("rounded-[var(--rm-radius-field)]"),
      Scene.expect(button).toHaveHandler("click"),
      Scene.click(button),
      Scene.expectHandled(),
      Scene.expect(button).toHaveText("Save changes (1)"),
    );
  });

  it("does not emit when disabled and is not clickable", () => {
    Scene.scene(
      { update, view: sceneView({ isDisabled: true }) },
      Scene.given({ presses: 0 }),
      Scene.expect(button).toBeDisabled(),
      Scene.expect(button).toHaveAttr("aria-disabled", "true"),
      Scene.expect(button).toHaveClass("disabled:opacity-60"),
      Scene.expect(button).not.toHaveHandler("click"),
    );

    expect(() =>
      Scene.scene(
        { update, view: sceneView({ isDisabled: true }) },
        Scene.given({ presses: 0 }),
        Scene.click(button),
        Scene.expectHandled(),
      ),
    ).toThrow(/disabled/);
  });

  it("keeps the RM3 variant token classes and fixed heights", () => {
    // Review follow-up: pinning two or three tokens let a mutation delete active:scale-95,
    // font-semibold, tracking-[-0.01em], hover:* or the padding and still pass. Assert the
    // rendered class attribute EQUALS the RM3 helper string for every variant instead.
    const variants: readonly Rm3ButtonVariant[] = [
      "primary",
      "secondary",
      "compactField",
      "compactFieldEmphasis",
      "utility",
    ];

    for (const variant of variants) {
      Scene.scene(
        { update, view: sceneView({ variant }) },
        Scene.given({ presses: 0 }),
        Scene.expect(button).toHaveAttr("class", rm3ButtonClassName(variant)),
      );
    }
  });

  it("renders the native disabled attribute, not only aria-disabled", () => {
    // Review follow-up: toBeDisabled accepts native disabled OR aria-disabled, so dropping
    // h.Disabled() while keeping the ARIA attribute would still have passed.
    Scene.scene(
      { update, view: sceneView({ isDisabled: true }) },
      Scene.given({ presses: 0 }),
      Scene.expect(button).toHaveAttr("disabled", "true"),
    );
  });

  it("keeps the primary block variant full width", () => {
    expect(rm3ButtonClassName("primary", { block: true })).toContain("w-full");
    Scene.scene(
      { update, view: sceneView({ block: true }) },
      Scene.given({ presses: 0 }),
      Scene.expect(button).toHaveClass("w-full"),
    );
  });

  it("uses aria-label as the accessible name for an icon-only button", () => {
    Scene.scene(
      { update, view: sceneView({ iconOnly: true, ariaLabel: "Close dialog" }) },
      Scene.given({ presses: 0 }),
      Scene.expect(button).toHaveAccessibleName("Close dialog"),
      Scene.expect(button).toHaveAttr("aria-label", "Close dialog"),
    );
  });

  it("refuses an icon-only button without an accessible name", () => {
    expect(() =>
      Scene.scene({ update, view: sceneView({ iconOnly: true }) }, Scene.given({ presses: 0 })),
    ).toThrow(/accessible name/);
  });
});
