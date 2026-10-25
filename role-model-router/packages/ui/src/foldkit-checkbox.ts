import type { Attribute, Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { RM3_FIELD_LABEL_CLASS } from "./foldkit-input";

/**
 * Run 115 S12c (R7/R8): the RM3 checkbox primitive, following the accepted foldkit-button shape.
 *
 * The live RM3 checkbox is a <button role="checkbox"> rather than a native checkbox:
 * 16x16, radius 4, primary fill when on, contrast check/dash SVG, native disabled
 * (role-model-router/apps/runtime-ui/app/components/checkbox-control.tsx:4-5,30-73). Its class
 * strings and SVG paths are copied verbatim; there is no checkbox helper in design-system.ts.
 * The checked state is the parent's Model (isChecked), never local state; a toggle dispatches
 * the next state through onToggle, matching the vendored controlled checkbox contract
 * (vendor/foldkit/packages/ui/src/checkbox/index.ts:103-153).
 */

export const RM3_CHECKBOX_BASE_CLASS =
  "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border";

/** Live on-state pair from checkbox-control.tsx:40-41. */
export const RM3_CHECKBOX_CHECKED_CLASS = "border-primary bg-primary text-primary-foreground";
export const RM3_CHECKBOX_UNCHECKED_CLASS =
  "border-[var(--rm-border-strong)] bg-[var(--rm-panel)] text-transparent";

export interface Rm3CheckboxViewConfig<Message> {
  /** Current checked state from the parent Model. */
  readonly isChecked: boolean;
  /** Tri-state marker; renders the dash icon and aria-checked="mixed". */
  readonly isMixed?: boolean;
  /** Dispatched with the next checked state (the live component's next state). */
  readonly onToggle: (isChecked: boolean) => Message;
  /** Caller-owned stable id. Required when a visible label is rendered. */
  readonly id?: string;
  /** Visible label text; renders a <label for={id}> association. */
  readonly label?: string;
  /** Accessible name for the live icon-only usage (every live call passes one). */
  readonly ariaLabel?: string;
  readonly isDisabled?: boolean;
  /**
   * Optional caller-owned Foldkit click attribute, e.g.
   * `h.OnClick(message, { defaultAction: "Prevent", propagation: "Stop" })`. It is a real
   * event attribute, so the caller controls preventDefault/stopPropagation. Its presence
   * replaces the primitive's own toggle; the live control only toggles when the event was
   * not prevented (checkbox-control.tsx:44-49).
   */
  readonly onClick?: Attribute<Message>;
  /** Optional caller-owned Foldkit pointerdown attribute (h.OnPointerDown(...)), attached as-is. */
  readonly onPointerDown?: Attribute<Message>;
  readonly className?: string;
}

const assertHasAccessibleName = (
  label: string | undefined,
  ariaLabel: string | undefined,
): void => {
  const hasLabel = (label ?? "").trim().length > 0;
  const hasAriaLabel = (ariaLabel ?? "").trim().length > 0;
  if (!hasLabel && !hasAriaLabel) {
    throw new Error(
      "RM3 checkbox requires an accessible name: pass a label or an explicit ariaLabel",
    );
  }
};

/** Live check icon from checkbox-control.tsx:61-71. */
const CheckIcon = <Message>(h: HtmlBuilder<Message>): Html =>
  h.svg(
    [
      h.Width("10"),
      h.Height("10"),
      h.ViewBox("0 0 10 10"),
      h.AriaHidden(true),
      h.Class("shrink-0"),
    ],
    [
      h.path(
        [
          h.D("M2 5.2L4.1 7.3L8 2.8"),
          h.Fill("none"),
          h.Stroke("currentColor"),
          h.StrokeWidth("1.5"),
          h.StrokeLinecap("round"),
          h.StrokeLinejoin("round"),
        ],
        [],
      ),
    ],
  );

/** Live dash icon from checkbox-control.tsx:51-60. */
const DashIcon = <Message>(h: HtmlBuilder<Message>): Html =>
  h.svg(
    [
      h.Width("10"),
      h.Height("10"),
      h.ViewBox("0 0 10 10"),
      h.AriaHidden(true),
      h.Class("shrink-0"),
    ],
    [
      h.path(
        [
          h.D("M2.5 5h5"),
          h.Fill("none"),
          h.Stroke("currentColor"),
          h.StrokeWidth("1.5"),
          h.StrokeLinecap("round"),
        ],
        [],
      ),
    ],
  );

/** Renders the RM3 checkbox. The runtime supplies h; the caller supplies the Message. */
export function view<Message>(
  config: Rm3CheckboxViewConfig<Message>,
  h: HtmlBuilder<Message>,
): Html {
  const {
    isChecked,
    isMixed = false,
    onToggle,
    id,
    label,
    ariaLabel,
    isDisabled = false,
    onClick,
    onPointerDown,
    className,
  } = config;

  assertHasAccessibleName(label, ariaLabel);

  const hasVisibleLabel = (label ?? "").trim().length > 0;

  const isOn = isChecked || isMixed;
  const stateClass = isOn ? RM3_CHECKBOX_CHECKED_CLASS : RM3_CHECKBOX_UNCHECKED_CLASS;

  const attributes: Attribute<Message>[] = [
    h.Type("button"),
    h.Role("checkbox"),
    h.AriaChecked(isMixed ? "mixed" : isChecked),
    h.Class([RM3_CHECKBOX_BASE_CLASS, stateClass, className].filter(Boolean).join(" ")),
  ];

  if (id !== undefined) {
    attributes.push(h.Id(id));
  }
  if (ariaLabel !== undefined) {
    attributes.push(h.AriaLabel(ariaLabel));
  }

  if (isDisabled) {
    // The live control emits no data-disabled marker (checkbox-control.tsx has 0 usages).
    attributes.push(h.Disabled(true));
  } else if (onClick !== undefined) {
    // The caller's event attribute carries the message and its ClickOptions
    // (defaultAction/propagation), so it can preventDefault and suppress this toggle.
    attributes.push(onClick);
  } else {
    attributes.push(h.OnClick(onToggle(!isChecked)));
  }
  if (onPointerDown !== undefined) {
    attributes.push(onPointerDown);
  }

  const icon = isMixed ? DashIcon(h) : isChecked ? CheckIcon(h) : null;
  const control = h.button(attributes, icon === null ? [] : [icon]);

  if (!hasVisibleLabel) {
    return control;
  }
  if (id === undefined) {
    throw new Error("RM3 checkbox: a visible label needs a stable id for label association");
  }

  return h.div(
    [h.Class("flex items-center gap-2")],
    [control, h.label([h.For(id), h.Class(RM3_FIELD_LABEL_CLASS)], [label ?? ""])],
  );
}
