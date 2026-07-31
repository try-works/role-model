"use client";

import * as React from "react";

import { cn } from "./lib/utils";

export type MetricItem = {
  readonly id: string;
  /** Full label — inventory / panel / inline (when shortLabel omitted). */
  readonly label: string;
  readonly value: string;
  /**
   * Compact label for `badge` (and optional override for `inline`).
   * e.g. "in" / "out" / "latency"
   */
  readonly shortLabel?: string;
};

export type MetricStripVariant = "inline" | "inventory" | "badge" | "panel";

export type MetricStripProps = {
  readonly items: readonly MetricItem[];
  /**
   * Visual layout:
   * - `inline` — mono key/value row with hairline dividers (Studio Chat default)
   * - `inventory` — stacked label-left / value-right rows (sidebar MODELS)
   * - `badge` — value-first pill cluster
   * - `panel` — single bordered strip with internal columns
   */
  readonly variant?: MetricStripVariant;
  readonly className?: string;
  /** Accessible name for the metrics group. */
  readonly "aria-label"?: string;
};

function MetricStrip({
  items,
  variant = "inline",
  className,
  "aria-label": ariaLabel = "Metrics",
}: MetricStripProps) {
  if (items.length === 0) return null;

  if (variant === "inventory") {
    return (
      <dl
        data-slot="role-model-metric-strip"
        data-variant={variant}
        aria-label={ariaLabel}
        className={cn("flex w-full max-w-sm flex-col", className)}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "flex h-7 shrink-0 items-center justify-between gap-3",
              index < items.length - 1 && "border-b border-border",
            )}
          >
            <dt className="font-mono text-[11px] leading-[14px] tracking-[0.06em] text-muted-foreground uppercase">
              {item.label}
            </dt>
            <dd className="font-mono text-[13px] leading-[18px] font-medium tabular-nums text-foreground">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  if (variant === "badge") {
    return (
      <ul
        data-slot="role-model-metric-strip"
        data-variant={variant}
        aria-label={ariaLabel}
        className={cn("flex w-fit flex-wrap items-center gap-2", className)}
      >
        {items.map((item) => (
          <li
            key={item.id}
            className="flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5"
          >
            <span className="font-mono text-xs leading-4 font-medium tabular-nums text-foreground">
              {item.value}
            </span>
            <span className="font-mono text-[11px] leading-[14px] text-muted-foreground">
              {item.shortLabel ?? item.label}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (variant === "panel") {
    return (
      <div
        data-slot="role-model-metric-strip"
        data-variant={variant}
        role="group"
        aria-label={ariaLabel}
        className={cn(
          "flex w-full overflow-hidden rounded-md border border-border",
          className,
        )}
      >
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            {index > 0 ? (
              <div aria-hidden className="w-px shrink-0 self-stretch bg-border" />
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3.5 py-2.5">
              <div className="font-mono text-[11px] leading-[14px] tracking-[0.08em] text-muted-foreground uppercase">
                {item.label}
              </div>
              <div className="font-mono text-base leading-[22px] font-medium tabular-nums text-foreground">
                {item.value}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  }

  // variant === "inline"
  return (
    <div
      data-slot="role-model-metric-strip"
      data-variant="inline"
      role="group"
      aria-label={ariaLabel}
      className={cn("flex w-fit flex-wrap items-center gap-5", className)}
    >
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 ? (
            <div aria-hidden className="h-3.5 w-px shrink-0 bg-border" />
          ) : null}
          <div className="flex shrink-0 items-baseline gap-2">
            <span className="font-mono text-[11px] leading-[14px] tracking-[0.06em] text-muted-foreground uppercase">
              {item.shortLabel ?? item.label}
            </span>
            <span className="font-mono text-sm leading-5 font-medium tabular-nums text-foreground">
              {item.value}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/** Default Studio result usage metrics (input / output / latency). */
export const STUDIO_USAGE_METRICS: readonly MetricItem[] = [
  { id: "input", label: "Input tokens", shortLabel: "Input", value: "1,284" },
  { id: "output", label: "Output tokens", shortLabel: "Output", value: "426" },
  { id: "latency", label: "Latency", shortLabel: "Latency", value: "1.8s" },
];

/** Badge-oriented short labels for Studio usage. */
export const STUDIO_USAGE_METRICS_BADGE: readonly MetricItem[] = [
  { id: "input", label: "Input tokens", shortLabel: "in", value: "1,284" },
  { id: "output", label: "Output tokens", shortLabel: "out", value: "426" },
  { id: "latency", label: "Latency", shortLabel: "latency", value: "1.8s" },
];

export { MetricStrip };
