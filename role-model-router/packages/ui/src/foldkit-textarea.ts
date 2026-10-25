import type { Html, HtmlBuilder, TextareaAttribute } from "@role-model-router/foldkit/html";

import { RM3_FIELD_CLASS, RM3_FIELD_LABEL_CLASS } from "./foldkit-input";
/**
 * Run 115 S12c (R7/R8): the RM3 textarea primitive, following the accepted foldkit-button shape.
 *
 * The live app has no dedicated textarea helper: each call composes fieldClassName
 * (design-system.ts:1233-1234) with per-use classes, e.g.
 * apps/runtime-ui/app/routes/extensions.tsx:818 uses `${fieldClassName} mt-1 min-h-24 font-mono`.
 * The base class is shared with foldkit-input (one verbatim copy); className is appended so a
 * caller can add the live height/mono grammar without editing this module.
 *
 * Textarea content must go through h.Value, not children/innerHTML, or the live value stops
 * tracking the Model (vendor/foldkit/packages/foldkit/src/html/index.ts:3268-3274).
 */

export interface Rm3TextareaViewConfig<Message> {
  /** Caller-owned stable id, required for label association. Never generated here. */
  readonly id: string;
  /** Current value from the parent Model (controlled textarea). */
  readonly value: string;
  /** Dispatched with the new value when the user types. */
  readonly onInput: (value: string) => Message;
  /** Visible label text; renders a <label for={id}> wrapper. */
  readonly label?: string;
  /** Accessible name when no visible label is rendered. */
  readonly ariaLabel?: string;
  readonly placeholder?: string;
  readonly isDisabled?: boolean;
  readonly isAutofocus?: boolean;
  readonly name?: string;
  /** Pass-through for the live call sites' virtual-keyboard hint. */
  readonly inputMode?: string;
  /** Pass-through for the live call sites' autofill hint. */
  readonly autoComplete?: string;
  readonly rows?: number;
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
      "RM3 textarea requires an accessible name: pass a label or an explicit ariaLabel",
    );
  }
};

/** Renders the RM3 textarea. The runtime supplies h; the caller supplies the Message. */
export function view<Message>(
  config: Rm3TextareaViewConfig<Message>,
  h: HtmlBuilder<Message>,
): Html {
  const {
    id,
    value,
    onInput,
    label,
    ariaLabel,
    placeholder,
    isDisabled = false,
    isAutofocus = false,
    name,
    inputMode,
    autoComplete,
    rows,
    className,
  } = config;

  assertHasAccessibleName(label, ariaLabel);

  const attributes: TextareaAttribute<Message>[] = [
    h.Id(id),
    h.Class([RM3_FIELD_CLASS, className].filter(Boolean).join(" ")),
    h.Value(value),
  ];

  if (name !== undefined) {
    attributes.push(h.Name(name));
  }
  if (placeholder !== undefined) {
    attributes.push(h.Placeholder(placeholder));
  }
  if (inputMode !== undefined) {
    attributes.push(h.InputMode(inputMode));
  }
  if (autoComplete !== undefined) {
    attributes.push(h.Autocomplete(autoComplete));
  }
  if (rows !== undefined) {
    attributes.push(h.Rows(rows));
  }
  if (ariaLabel !== undefined) {
    attributes.push(h.AriaLabel(ariaLabel));
  }
  if (isAutofocus) {
    attributes.push(h.Autofocus(true));
  }

  if (isDisabled) {
    attributes.push(h.Disabled(true), h.DataAttribute("disabled", ""));
  } else {
    attributes.push(h.OnInput(onInput));
  }

  const field = h.textarea(attributes);

  if (label === undefined || label.trim().length === 0) {
    return field;
  }

  return h.div(
    [h.Class("grid gap-1.5")],
    [h.label([h.For(id), h.Class(RM3_FIELD_LABEL_CLASS)], [label]), field],
  );
}
