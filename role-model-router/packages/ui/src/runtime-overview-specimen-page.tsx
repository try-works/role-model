import * as React from "react";

import { cn } from "./lib/utils";
import { RuntimeOverviewSpecimensDemo } from "./runtime-overview-specimens";

export type Rm3SpecimenTheme = "light" | "dark";

export type RuntimeOverviewSpecimenPageProps = {
  readonly theme?: Rm3SpecimenTheme;
  readonly onThemeChange?: (theme: Rm3SpecimenTheme) => void;
  /** Hide chrome for clean Paper captures (1440-wide frame). */
  readonly capture?: boolean;
  /** Extra toolbar controls (e.g. playground view tabs). */
  readonly toolbarSlot?: React.ReactNode;
  readonly className?: string;
};

/**
 * Specimen shell for RuntimeOverview — light/dark toggle + optional capture mode.
 * Used by `@role-model/ui` playground (`bun run --cwd packages/role-model/ui playground`).
 */
function RuntimeOverviewSpecimenPage({
  theme = "light",
  onThemeChange,
  capture = false,
  toolbarSlot,
  className,
}: RuntimeOverviewSpecimenPageProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-neutral-200 text-neutral-900",
        theme === "dark" && "bg-neutral-950 text-neutral-100",
        className,
      )}
    >
      {capture ? null : (
        <div className="sticky top-0 z-50 flex flex-wrap items-center gap-3 border-b border-black/10 bg-white/90 px-4 py-2 backdrop-blur dark:border-white/10 dark:bg-black/80">
          <div className="font-mono text-xs font-medium tracking-tight">
            rm3 · RuntimeOverview specimen
          </div>
          {toolbarSlot}
          <div className="flex items-center gap-1 rounded-md border border-black/10 p-0.5 dark:border-white/15">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={theme === t}
                onClick={() => onThemeChange?.(t)}
                className={cn(
                  "rounded-sm px-2.5 py-1 text-xs capitalize",
                  theme === t
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <a
            href={`?theme=${theme}&view=overview&capture=1`}
            className="rounded-md border border-black/10 px-2.5 py-1 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            Capture mode
          </a>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Paper sync: open capture URLs → screenshot 1440 frame → replace Production ·
            RuntimeOverview artboards
          </span>
        </div>
      )}

      <div
        className={cn(
          "mx-auto",
          capture ? "w-[1440px]" : "flex justify-center overflow-auto p-6",
        )}
      >
        <div
          data-rm3-specimen-frame
          data-theme={theme}
          className={cn(
            "w-[1440px] shrink-0 overflow-hidden rounded-none bg-background shadow-sm",
            theme === "dark" && "dark",
            !capture && "rounded-lg ring-1 ring-black/10 dark:ring-white/10",
          )}
        >
          <RuntimeOverviewSpecimensDemo />
        </div>
      </div>
    </div>
  );
}

export { RuntimeOverviewSpecimenPage };
