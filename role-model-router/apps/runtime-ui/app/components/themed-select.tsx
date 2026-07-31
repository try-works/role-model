import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { bodyTextClassName, fieldClassName, navLabelClassName } from "../lib/design-system";

export interface ThemedSelectOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

interface ThemedSelectProps {
  readonly value: string;
  readonly options: readonly ThemedSelectOption[];
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly ariaLabel?: string;
  readonly ariaLabelledBy?: string;
  readonly disabled?: boolean;
  readonly name?: string;
}

function clampIndex(index: number, optionCount: number): number {
  if (optionCount === 0) {
    return -1;
  }
  if (index < 0) {
    return optionCount - 1;
  }
  if (index >= optionCount) {
    return 0;
  }
  return index;
}

export function ThemedSelect({
  value,
  options,
  onChange,
  placeholder = "Select an option…",
  ariaLabel,
  ariaLabelledBy,
  disabled = false,
  name,
}: ThemedSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );
  const selectedIndex = useMemo(
    () => options.findIndex((option) => option.value === value),
    [options, value],
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(nextIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }

    optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const commitSelection = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const moveActiveIndex = (delta: number) => {
    if (options.length === 0) {
      return;
    }
    setActiveIndex((current) => clampIndex(current + delta, options.length));
  };

  return (
    <div ref={rootRef} className="relative">
      {name ? <input name={name} type="hidden" value={value} /> : null}
      <button
        ref={triggerRef}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={[
          fieldClassName,
          "flex h-[34px] min-h-[34px] items-center justify-between gap-3 pr-[20px] text-left",
          open ? "border-[var(--rm-accent-focus)] ring-2 ring-[var(--rm-accent-subtle)]" : "",
        ].join(" ")}
        disabled={disabled}
        type="button"
        onClick={() => {
          if (disabled || options.length === 0) {
            return;
          }
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) {
              setOpen(true);
              return;
            }
            moveActiveIndex(1);
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) {
              setOpen(true);
              return;
            }
            moveActiveIndex(-1);
          }
        }}
      >
        <span className={selectedOption ? "text-[var(--rm-fg)]" : "text-[var(--rm-muted)]"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 text-[var(--rm-muted)]" />
      </button>

      {open ? (
        <div
          aria-labelledby={ariaLabelledBy}
          className="absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-80 overflow-y-auto rounded-[var(--rm3-radius-md)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-1 text-[var(--rm-fg)] shadow-md"
          id={listboxId}
          role="listbox"
          tabIndex={-1}
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                aria-selected={selected}
                className={[
                  "relative flex w-full cursor-default items-start gap-2 rounded-[var(--rm3-radius-sm)] py-1.5 pr-8 pl-2 text-left text-sm outline-hidden select-none transition focus-visible:bg-[var(--rm-panel)] focus-visible:outline-none",
                  selected
                    ? "bg-[var(--rm-panel)] text-[var(--rm-fg)]"
                    : "text-[var(--rm-fg)] hover:bg-[var(--rm-panel)]",
                ].join(" ")}
                role="option"
                type="button"
                onClick={() => commitSelection(option.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    moveActiveIndex(1);
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    moveActiveIndex(-1);
                  }
                  if (event.key === "Home") {
                    event.preventDefault();
                    setActiveIndex(0);
                  }
                  if (event.key === "End") {
                    event.preventDefault();
                    setActiveIndex(options.length - 1);
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setOpen(false);
                    triggerRef.current?.focus();
                  }
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className={`block ${navLabelClassName}`}>{option.label}</span>
                  {option.description ? (
                    <span className={`block ${bodyTextClassName} text-[var(--rm-muted)]`}>
                      {option.description}
                    </span>
                  ) : null}
                </span>
                <span className="pointer-events-none absolute top-1.5 right-2 flex size-3.5 items-center justify-center">
                  <Check
                    aria-hidden="true"
                    className={[
                      "size-4 text-[var(--rm-fg)] transition-opacity",
                      selected ? "opacity-100" : "opacity-0",
                    ].join(" ")}
                  />
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
