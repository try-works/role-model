"use client";

import * as React from "react";

import { cn } from "./lib/utils";
import { SegmentedControl } from "./segmented-control";

export type PageFilterOption = {
  readonly value: string;
  readonly label: string;
};

/** Shared default time buckets for RM3 page filter bars. */
export type PageTimeRange = "day" | "week" | "month" | "90d";

export const DEFAULT_PAGE_TIME_RANGES: readonly {
  value: PageTimeRange;
  label: string;
}[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "90d", label: "90 days" },
];

export type PageFilterField = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly options: readonly PageFilterOption[];
};

function Chevron() {
  return (
    <span
      aria-hidden
      className="mt-[-3px] size-2 shrink-0 origin-center rotate-45 border-b-[1.5px] border-r-[1.5px] border-muted-foreground"
    />
  );
}

/** Labeled native select — used in page filter bars. */
function FilterSelect({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: readonly PageFilterOption[];
  onChange?: (value: string) => void;
  className?: string;
}) {
  const selected = options.find((o) => o.value === value)?.label ?? value;

  return (
    <label className={cn("relative flex w-[150px] shrink-0 flex-col gap-1.5", className)}>
      <span className="font-sans text-xs leading-4 text-muted-foreground">{label}</span>
      <span className="relative flex h-[34px] w-full shrink-0 items-center justify-between rounded-md border border-input bg-card px-2.5">
        <span className="truncate font-sans text-sm leading-5 text-foreground">{selected}</span>
        <Chevron />
        <select
          className="absolute inset-0 cursor-pointer opacity-0"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          aria-label={label}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

export type TimeRangeControlProps<T extends string = string> = {
  readonly value: T;
  readonly options?: readonly { value: T; label: string }[];
  readonly label?: string;
  readonly onChange?: (value: T) => void;
  readonly className?: string;
};

/** Segmented time-range control (Day / Week / Month / 90 days). */
function TimeRangeControl<T extends string = PageTimeRange>({
  value,
  options = DEFAULT_PAGE_TIME_RANGES as readonly { value: T; label: string }[],
  label = "Time range",
  onChange,
  className,
}: TimeRangeControlProps<T>) {
  return (
    <div className={cn("flex shrink-0 flex-col gap-1.5", className)}>
      <div className="font-sans text-xs leading-4 text-muted-foreground">{label}</div>
      <SegmentedControl
        value={value}
        options={options}
        onChange={onChange}
        aria-label={label}
      />
    </div>
  );
}

export type PageFiltersProps<T extends string = string> = {
  /** When set with `onTimeRangeChange`, renders the leading time-range control. */
  readonly timeRange?: T;
  readonly timeRangeOptions?: readonly { value: T; label: string }[];
  readonly timeRangeLabel?: string;
  readonly onTimeRangeChange?: (value: T) => void;
  /**
   * Right-side filter selects in display order.
   * Omit or pass `[]` when the page only needs time range (or supply `trailing`).
   */
  readonly fields?: readonly PageFilterField[];
  readonly onFieldChange?: (id: string, value: string) => void;
  /** Replace the default time-range control. */
  readonly leading?: React.ReactNode;
  /** Replace the default select group. */
  readonly trailing?: React.ReactNode;
  readonly className?: string;
};

/**
 * Reusable page filter bar — time range (left) + filter selects (right).
 * Shared across Runtime overview and other RM3 pages with a top filter section.
 */
function PageFilters<T extends string = string>({
  timeRange,
  timeRangeOptions,
  timeRangeLabel,
  onTimeRangeChange,
  fields = [],
  onFieldChange,
  leading,
  trailing,
  className,
}: PageFiltersProps<T>) {
  const leadingNode =
    leading !== undefined ? (
      leading
    ) : timeRange !== undefined ? (
      <TimeRangeControl
        value={timeRange}
        options={timeRangeOptions}
        label={timeRangeLabel}
        onChange={onTimeRangeChange}
      />
    ) : null;

  const trailingNode =
    trailing !== undefined ? (
      trailing
    ) : fields.length > 0 ? (
      <div className="flex flex-wrap items-end gap-3">
        {fields.map((field) => (
          <FilterSelect
            key={field.id}
            label={field.label}
            value={field.value}
            options={field.options}
            onChange={(value) => onFieldChange?.(field.id, value)}
          />
        ))}
      </div>
    ) : null;

  return (
    <div
      data-slot="role-model-page-filters"
      className={cn("flex w-full flex-wrap items-end justify-between gap-4", className)}
    >
      {leadingNode}
      {trailingNode}
    </div>
  );
}

export { PageFilters, FilterSelect, TimeRangeControl };
