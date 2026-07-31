"use client";

import * as React from "react";

import { cn } from "./lib/utils";

export type SegmentedControlOption<T extends string = string> = {
  readonly value: T;
  readonly label: string;
};

export type SegmentedControlSize = "md" | "sm";

export type SegmentedControlProps<T extends string = string> = {
  readonly value: T;
  readonly options: readonly SegmentedControlOption<T>[];
  readonly onChange?: (value: T) => void;
  /**
   * `md` — default. Page nav (Studio / Local / System / Observe / …) and
   * PageFilters time range share Overview SoT: 14px / `text-sm`.
   * `sm` — compact 13px; avoid for shell page nav.
   */
  readonly size?: SegmentedControlSize;
  /** Accessible name for the control group. */
  readonly "aria-label"?: string;
  readonly className?: string;
};

/**
 * Bordered segmented control — secondary page nav and filter chips
 * that share one track. Active = primary fill; inactive = muted text.
 *
 * Paper geometry: track h-36 · p-4 · gap-4 · radius-md; segment h-28 · px-10 · radius-sm (5px).
 * Place page-nav instances inside the 12-col content track (same lane as PageFilters).
 */
function SegmentedControl<T extends string = string>({
  value,
  options,
  onChange,
  size = "md",
  "aria-label": ariaLabel = "Options",
  className,
}: SegmentedControlProps<T>) {
  const isFilter = size === "md";
  return (
    <div
      data-slot="role-model-segmented-control"
      data-size={size}
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex h-9 w-fit shrink-0 items-center gap-1 rounded-md border border-border bg-secondary p-1",
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
              "flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-[5px] px-2.5 font-sans",
              isFilter ? "text-sm leading-[18px]" : "text-[13px] leading-[18px]",
              active
                ? "bg-primary font-semibold text-primary-foreground"
                : "font-normal text-muted-foreground hover:text-foreground",
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
