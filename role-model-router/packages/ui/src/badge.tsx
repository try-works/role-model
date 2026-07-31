import * as React from "react";

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

const TONE_CLASS: Record<BadgeTone, string> = {
  accent: "border-transparent bg-[var(--rm-pill-accent-bg)] text-[var(--rm-pill-accent-ink)]",
  info: "border-transparent bg-[var(--rm-pill-info-bg)] text-[var(--rm-pill-info-ink)]",
  advisory:
    "border-transparent bg-[var(--rm-pill-advisory-bg)] text-[var(--rm-pill-advisory-ink)]",
  warning:
    "border-transparent bg-[var(--rm-pill-warning-bg)] text-[var(--rm-pill-warning-ink)]",
  error: "border-transparent bg-[var(--rm-pill-error-bg)] text-[var(--rm-pill-error-ink)]",
  success:
    "border-transparent bg-[var(--rm-pill-success-bg)] text-[var(--rm-pill-success-ink)]",
  neutral:
    "border-transparent bg-[var(--rm-pill-neutral-bg)] text-[var(--rm-pill-neutral-ink)]",
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
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 font-sans text-[11px] leading-4 font-medium tracking-[0.01em]",
        TONE_CLASS[tone],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
