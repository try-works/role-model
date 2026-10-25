import type { Attribute, ClickOptions, Html, HtmlBuilder } from "@role-model-router/foldkit/html";

/**
 * Run 115 S12b (R7/R8): the first RM3 primitive ported to Foldkit.
 *
 * The RM3 button contract in this repository is not a React component. It lives in the
 * role-model-router runtime-ui app as token-driven class helpers, rendered inline:
 * primaryButtonClassName / primaryButtonBlockClassName / secondaryButtonClassName /
 * compactFieldButtonClassName / compactFieldButtonEmphasisClassName / utilityButtonClassName
 * (role-model-router/apps/runtime-ui/app/lib/design-system.ts:1248-1265). This module keeps those
 * class strings verbatim; the variant fixes the height (34px compact vs 36px standard) because RM3
 * encodes size in the helper, not in a prop.
 *
 * DESIGN_SYSTEM.md:379-384 is STALE and is deliberately not followed: it describes a pill radius
 * and 11px/22px padding, while the live helpers use rounded-[var(--rm-radius-field)] with
 * px-3.5/4 and h-[36px]/h-[34px]. The running code is the contract; where the two disagree the
 * code wins, and this module was verified against it (byte-identical variant strings).
 *
 * Limitation: children must be text. An element child (for example a nested h.span) is rejected
 * even though its text would be a valid accessible name, because this primitive resolves the
 * accessible name statically. No RM3 button currently renders nested-element text, so nothing is
 * broken today; a future component that needs it must extend this contract rather than bypass it.
 *
 * It is a pure Foldkit view builder: no React import, no state, no runtime access. The consumer
 * passes the runtime-supplied `h` builder and a Message; a click dispatches that Message through
 * the Foldkit runtime (a Scene test instead of a React onClick prop).
 *
 * Not ported because RM3 does not define it: there is no loading state contract for buttons in
 * this repository (no loading prop, no aria-busy on a button anywhere in runtime-ui), so this
 * primitive does not invent one.
 */

export type Rm3ButtonVariant =
  | "primary"
  | "secondary"
  | "compactField"
  | "compactFieldEmphasis"
  | "utility";

/** Verbatim RM3 class helpers (role-model-router/apps/runtime-ui/app/lib/design-system.ts:1247-1265). */
const RM3_BUTTON_VARIANT_CLASSES = {
  primary:
    "inline-flex h-[36px] min-h-[36px] items-center justify-center rounded-[var(--rm-radius-field)] border border-primary bg-primary px-3.5 text-[13px] font-semibold leading-[18px] tracking-[-0.01em] !text-primary-foreground transition hover:border-[var(--rm-accent-focus)] hover:bg-[var(--rm-accent-focus)] active:scale-95 disabled:opacity-60",
  secondary:
    "inline-flex h-[36px] min-h-[36px] items-center justify-center rounded-[var(--rm-radius-field)] border border-[var(--rm-border-strong)] bg-[var(--rm-surface)] px-4 text-[13px] font-semibold leading-[18px] tracking-[-0.01em] text-[var(--rm-fg)] transition hover:border-[var(--rm-accent)] hover:bg-[var(--rm-accent-ghost)] hover:text-[var(--rm-fg)] active:scale-95 disabled:opacity-60",
  compactField:
    "inline-flex h-[34px] min-h-[34px] items-center justify-center rounded-[var(--rm-radius-field)] border border-[var(--rm-border-strong)] bg-[var(--rm-panel)] px-4 text-[13px] font-semibold leading-[18px] tracking-[-0.01em] text-[var(--rm-accent-ink)] transition hover:border-[var(--rm-accent)] hover:bg-[var(--rm-accent-ghost)] hover:text-[var(--rm-accent-ink)] active:scale-95 disabled:opacity-60",
  compactFieldEmphasis:
    "inline-flex h-[34px] min-h-[34px] items-center justify-center rounded-[var(--rm-radius-field)] border border-primary bg-primary px-4 text-[13px] font-semibold leading-[18px] tracking-[-0.01em] !text-primary-foreground transition hover:border-[var(--rm-accent-focus)] hover:bg-[var(--rm-accent-focus)] active:scale-95 disabled:opacity-60",
  utility:
    "inline-flex h-[36px] min-h-[36px] items-center justify-center rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3.5 text-[13px] font-semibold leading-[18px] tracking-[-0.01em] text-[var(--rm-fg)] transition hover:border-[var(--rm-border-strong)] hover:bg-[var(--rm-panel)]",
} as const satisfies Record<Rm3ButtonVariant, string>;

export interface Rm3ButtonClassNameOptions {
  /** Only the primary variant has an RM3 block form (primaryButtonBlockClassName). */
  readonly block?: boolean;
}

/** The RM3 class string for a variant, including the primary block form when opted in. */
export function rm3ButtonClassName(
  variant: Rm3ButtonVariant = "primary",
  options: Rm3ButtonClassNameOptions = {},
): string {
  const base = RM3_BUTTON_VARIANT_CLASSES[variant];
  if (base === undefined) {
    throw new Error(`RM3 button: unknown variant "${String(variant)}"`);
  }
  if (options.block !== true) {
    return base;
  }
  if (variant !== "primary") {
    throw new Error(
      "RM3 button: the block form is only defined for the primary variant (primaryButtonBlockClassName)",
    );
  }
  return `${base} w-full`;
}

export interface Rm3ButtonViewConfig<Message> {
  readonly variant?: Rm3ButtonVariant;
  /** Visible content. A string child is the accessible name unless ariaLabel overrides it. */
  readonly children: ReadonlyArray<Html | string>;
  /** Dispatched through the Foldkit runtime when the button is activated. */
  readonly onClick?: Message;
  /** Forwarded to h.OnClick; e.g. { defaultAction: "Prevent" } for in-form actions. */
  readonly clickOptions?: ClickOptions;
  readonly isDisabled?: boolean;
  readonly type?: "button" | "submit" | "reset";
  readonly block?: boolean;
  /** Accessible name for icon-only buttons. */
  readonly ariaLabel?: string;
  readonly className?: string;
}

/**
 * Mirrors the RM3 accessible-name expectation: a button is named by its text content, and an
 * icon-only button must supply ariaLabel. No RM3 icon-only button omits one, so failing here is
 * cheaper than shipping an unnamed control.
 */
function assertHasAccessibleName(
  children: ReadonlyArray<Html | string>,
  ariaLabel: string | undefined,
): void {
  const hasAriaLabel = (ariaLabel ?? "").trim().length > 0;
  // SAFETY: the declared union is exactly Html (a VNode object) | string, so a child is a string
  // exactly when it carries a callable `trim`; a VNode does not. This also avoids a runtime typeof
  // check that would widen the type back to unknown.
  const asText = (child: Html | string): string => (child as string).trim === undefined ? "" : (child as string);
  const hasTextChild = children.some((child) => asText(child).trim().length > 0);
  if (!hasAriaLabel && !hasTextChild) {
    throw new Error(
      "RM3 button requires an accessible name: pass text children or an explicit ariaLabel",
    );
  }
}

/** Renders the RM3 button. The runtime supplies h; the caller supplies the Message. */
export function view<Message>(config: Rm3ButtonViewConfig<Message>, h: HtmlBuilder<Message>): Html {
  const {
    variant = "primary",
    children,
    onClick,
    clickOptions,
    isDisabled = false,
    type = "button",
    block = false,
    ariaLabel,
    className,
  } = config;

  assertHasAccessibleName(children, ariaLabel);

  // Live RM3 helpers compose by plain concatenation (design-system.ts:1252
  // primaryButtonBlockClassName = `${primaryButtonClassName} w-full`), so the port joins with a
  // space instead of tailwind-merge: a caller class that conflicts with a base utility is kept
  // rather than deleted.
  const buttonClass = [rm3ButtonClassName(variant, { block }), className].filter(Boolean).join(" ");
  const attributes: Attribute<Message>[] = [h.Type(type), h.Class(buttonClass)];

  if (ariaLabel !== undefined) {
    attributes.push(h.AriaLabel(ariaLabel));
  }

  if (isDisabled === true) {
    // Native disabled removes the control from pointer/keyboard interaction and tab order;
    // aria-disabled keeps the state explicit for assistive technology and Scene's click guard
    // (src/test/scene.ts:1908-1916 refuses to click a disabled element). The click handler is
    // omitted entirely, matching Ui.Button's disabled path
    // (vendor/foldkit/packages/ui/src/button/index.ts:45-46).
    attributes.push(h.Disabled(true), h.AriaDisabled(true));
  } else if (onClick !== undefined) {
    attributes.push(h.OnClick(onClick, clickOptions));
  }

  return h.button(attributes, children);
}
