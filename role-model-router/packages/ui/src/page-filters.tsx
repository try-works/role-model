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

function CheckMark() {
  return (
    <svg
      aria-hidden
      className="size-3.5 shrink-0 text-foreground"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 16 16"
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

/** PageFilters field label — Paper Runtime overview: sans 12/16 muted, sentence case (not mono caps). */
const pageFilterLabelClassName = "font-sans text-xs font-normal leading-4 text-muted-foreground";

/**
 * Labeled filter select — Paper PageFilters (Runtime overview / Observe):
 * `bg-secondary` + `border-input` · h-34 · px-10 · CSS triangle chevron · accent menu.
 * Secondary (not card) so the fill still reads on card/surface panels (Advanced controls).
 * Distinct from Forms `Select` (`bg-background`).
 */
function FilterSelect({
  label,
  value,
  options,
  onChange,
  className,
  hideLabel = false,
}: {
  label: string;
  value: string;
  options: readonly PageFilterOption[];
  onChange?: (value: string) => void;
  className?: string;
  /** When true, omit the visible label (e.g. table column already names the field). */
  hideLabel?: boolean;
}) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const listboxId = React.useId();
  const labelId = React.useId();
  const [open, setOpen] = React.useState(false);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const [activeIndex, setActiveIndex] = React.useState(selectedIndex >= 0 ? selectedIndex : 0);

  React.useEffect(() => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [selectedIndex]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const choose = (next: string) => {
    onChange?.(next);
    setOpen(false);
  };

  const moveActive = (direction: 1 | -1) => {
    if (options.length === 0) {
      return;
    }
    setActiveIndex((current) => {
      const base = current >= 0 ? current : 0;
      return (base + direction + options.length) % options.length;
    });
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex w-[150px] shrink-0 flex-col",
        !hideLabel && "gap-1.5",
        className,
      )}
    >
      {hideLabel ? null : (
        <span className={pageFilterLabelClassName} id={labelId}>
          {label}
        </span>
      )}
      <button
        type="button"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={hideLabel ? label : undefined}
        aria-labelledby={hideLabel ? undefined : labelId}
        className={cn(
          "relative flex h-[34px] w-full shrink-0 items-center justify-between gap-2 rounded-md border border-input bg-secondary px-2.5 text-left",
          "font-sans text-sm font-normal leading-[18px] whitespace-nowrap text-foreground outline-none transition-[color,box-shadow]",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        )}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            moveActive(event.key === "ArrowDown" ? 1 : -1);
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
      >
        <span className="min-w-0 flex-1 truncate text-left font-sans text-sm font-normal leading-[18px] text-foreground">
          {selected?.label ?? value}
        </span>
        <Chevron />
      </button>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={hideLabel ? label : undefined}
          aria-labelledby={hideLabel ? undefined : labelId}
          className={cn(
            "absolute left-0 top-full z-50 mt-1 max-h-[280px] min-w-full w-max max-w-[280px] overflow-y-auto",
            "rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
          )}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "relative flex min-h-[32px] w-full items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-left font-sans text-sm leading-5 outline-none select-none",
                  isActive || isSelected
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    moveActive(1);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    moveActive(-1);
                  } else if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    choose(option.value);
                  }
                }}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? (
                  <span className="absolute right-2 flex size-3.5 items-center justify-center">
                    <CheckMark />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
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
      <div className={pageFilterLabelClassName}>{label}</div>
      <SegmentedControl
        value={value}
        options={options}
        size="md"
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
            onChange={(next) => onFieldChange?.(field.id, next)}
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
