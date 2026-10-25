import type { Attribute, Html, HtmlBuilder } from "@role-model-router/foldkit/html";

/**
 * Run 115 S12c (R7/R8): the RM3 input primitive, following the accepted foldkit-button shape.
 *
 * The RM3 class contract is the LIVE helper, not the written grammar:
 * fieldClassName (role-model-router/apps/runtime-ui/app/lib/design-system.ts:1233-1234) and
 * fieldLabelClassName (:1177). DESIGN_SYSTEM.md:388 claims shared fields target 44px; the live
 * helper is min-h-[34px] with 13px/18px text, so the code wins.
 *
 * No React import, no local state: the value is the parent's Model and typing dispatches the
 * configured Message through onInput (matching the vendored input's controlled contract,
 * vendor/foldkit/packages/ui/src/input/index.ts:56-61).
 */

/** Live RM3 field base class, copied verbatim. */
export const RM3_FIELD_CLASS =
  "w-full min-h-[34px] rounded-md border border-input bg-background px-3 py-1.5 font-sans !text-[13px] !font-normal !leading-[18px] !tracking-[0em] text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Live RM3 field label class, copied verbatim (design-system.ts:1177). */
export const RM3_FIELD_LABEL_CLASS = "font-sans text-xs leading-4 text-foreground";

export interface Rm3InputViewConfig<Message> {
  /** Caller-owned stable id, required for label association. Never generated here. */
  readonly id: string;
  /** Current value from the parent Model (controlled input). */
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
  /** Defaults to "text". */
  readonly type?: string;
  /** Pass-through for the live call sites' virtual-keyboard hint (storage-retention.tsx:461, studio-images.tsx:169/178). */
  readonly inputMode?: string;
  /** Pass-through for the live call sites' autofill hint (operator-controls.tsx:378). */
  readonly autoComplete?: string;
  readonly className?: string;
}

const assertHasAccessibleName = (
  label: string | undefined,
  ariaLabel: string | undefined,
  control: string,
): void => {
  const hasLabel = (label ?? "").trim().length > 0;
  const hasAriaLabel = (ariaLabel ?? "").trim().length > 0;
  if (!hasLabel && !hasAriaLabel) {
    throw new Error(
      `RM3 ${control} requires an accessible name: pass a label or an explicit ariaLabel`,
    );
  }
};

/** Renders the RM3 input. The runtime supplies h; the caller supplies the Message. */
export function view<Message>(config: Rm3InputViewConfig<Message>, h: HtmlBuilder<Message>): Html {
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
    type = "text",
    inputMode,
    autoComplete,
    className,
  } = config;

  assertHasAccessibleName(label, ariaLabel, "input");

  const attributes: Attribute<Message>[] = [
    h.Id(id),
    h.Class([RM3_FIELD_CLASS, className].filter(Boolean).join(" ")),
    h.Type(type),
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
  if (ariaLabel !== undefined) {
    attributes.push(h.AriaLabel(ariaLabel));
  }
  if (isAutofocus) {
    attributes.push(h.Autofocus(true));
  }

  if (isDisabled) {
    // Native disabled is the live RM3 behaviour; the data marker is the vendored component's
    // styling hook (vendor/foldkit/packages/ui/src/input/index.ts:60-62). The input handler is
    // omitted entirely, so a disabled field cannot dispatch.
    attributes.push(h.Disabled(true), h.DataAttribute("disabled", ""));
  } else {
    attributes.push(h.OnInput(onInput));
  }

  const field = h.input(attributes);

  if (label === undefined || label.trim().length === 0) {
    return field;
  }

  return h.div(
    [h.Class("grid gap-1.5")],
    [h.label([h.For(id), h.Class(RM3_FIELD_LABEL_CLASS)], [label]), field],
  );
}
