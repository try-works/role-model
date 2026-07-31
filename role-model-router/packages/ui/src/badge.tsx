import type * as React from "react";

import { cn } from "./lib/utils";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "warning"
  | "success"
  | "error"
  | "info"
  | "advisory";

export type BadgeProps = React.ComponentProps<"span"> & {
  readonly tone?: BadgeTone;
};

/**
 * Paper RM3 Badge (System Readiness / Connections):
 * height 22 · padding-inline 8 · rounded-full · mono 11/14 regular.
 *
 * Soft tones = muted fill + semantic ink (healthy = chart-cache).
 * Accent = solid primary fill + contrast ink (e.g. "selected").
 */
const BASE_CLASS =
  "inline-flex h-[22px] shrink-0 items-center rounded-full px-2 font-mono text-[11px] font-normal leading-[14px] tracking-normal";

const TONE_CLASS: Record<BadgeTone, string> = {
  accent: "bg-[var(--rm-pill-accent-bg)] !text-[var(--rm-pill-accent-ink)]",
  neutral: "bg-[var(--rm-pill-soft-bg)] text-[var(--rm-pill-neutral-ink)]",
  success: "bg-[var(--rm-pill-soft-bg)] text-[var(--rm-pill-success-ink)]",
  warning: "bg-[var(--rm-pill-soft-bg)] text-[var(--rm-pill-warning-ink)]",
  error: "bg-[var(--rm-pill-soft-bg)] text-[var(--rm-pill-error-ink)]",
  info: "bg-[var(--rm-pill-soft-bg)] text-[var(--rm-pill-info-ink)]",
  advisory: "bg-[var(--rm-pill-soft-bg)] text-[var(--rm-pill-advisory-ink)]",
};

/**
 * Compact status/meta chip (RM3). Prefer Badge on happy-path pages over inventing
 * FactCard / StatusPill walls.
 */
function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-tone={tone}
      className={cn(BASE_CLASS, TONE_CLASS[tone], className)}
      {...props}
    />
  );
}

export { Badge };
