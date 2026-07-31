"use client";

import * as React from "react";

import { cn } from "./lib/utils";

export type SegmentedControlOption<T extends string = string> = {
  readonly value: T;
  readonly label: string;
};

export type SegmentedControlProps<T extends string = string> = {
  readonly value: T;
  readonly options: readonly SegmentedControlOption<T>[];
  readonly onChange?: (value: T) => void;
  /** Accessible name for the control group. */
  readonly "aria-label"?: string;
  readonly className?: string;
};

/**
 * Bordered segmented control — secondary page nav (Studio) and filter chips
 * that share one track. Active = primary fill; inactive = muted text.
 *
 * Same visual language as `TimeRangeControl` (without the field label).
 */
function SegmentedControl<T extends string = string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel = "Options",
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      data-slot="role-model-segmented-control"
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex w-fit shrink-0 items-center gap-1 rounded-md border border-border bg-secondary p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange?.(option.value)}
            className={cn(
              "flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-sm px-2.5 font-sans text-xs leading-4",
              active
                ? "bg-primary font-medium text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export { SegmentedControl };
