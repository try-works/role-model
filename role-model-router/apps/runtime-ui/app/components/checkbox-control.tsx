import type { MouseEvent, PointerEvent } from "react";

/**
 * Paper RM3 checkbox — 16×16 · radius 4 · primary fill when on · contrast check/dash.
 * Native `accent-color` + dark `color-scheme` paints an empty-looking checked box.
 */
export function CheckboxControl({
  id,
  checked,
  mixed = false,
  disabled = false,
  "aria-label": ariaLabel,
  className = "",
  onChange,
  onClick,
  onPointerDown,
}: {
  readonly id?: string;
  readonly checked: boolean;
  readonly mixed?: boolean;
  readonly disabled?: boolean;
  readonly "aria-label"?: string;
  readonly className?: string;
  readonly onChange?: () => void;
  readonly onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  const on = checked || mixed;

  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={mixed ? "mixed" : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-[var(--rm-border-strong)] bg-[var(--rm-panel)] text-transparent"
      } ${className}`}
      onPointerDown={onPointerDown}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onChange?.();
        }
      }}
    >
      {mixed ? (
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className="shrink-0">
          <path
            d="M2.5 5h5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : checked ? (
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className="shrink-0">
          <path
            d="M2 5.2L4.1 7.3L8 2.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}
