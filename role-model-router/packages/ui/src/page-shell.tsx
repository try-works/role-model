"use client";

import * as React from "react";

import { cn } from "./lib/utils";

export type ThemeMode = "light" | "dark";

export type SubPageHeaderBarProps = {
  readonly title: string;
  readonly className?: string;
  readonly children?: React.ReactNode;
  /** Current color mode — drives the theme toggle icon. */
  readonly theme?: ThemeMode;
  /** When set, the top-right theme toggle is interactive. */
  readonly onThemeChange?: (theme: ThemeMode) => void;
};

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      width={16}
      height={16}
    >
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      width={16}
      height={16}
    >
      <path
        d="M21 14.3A9 9 0 1 1 9.7 3 7 7 0 0 0 21 14.3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 48px page title strip under the app chrome.
 * Title left; theme toggle (and optional actions) top-right.
 */
function SubPageHeaderBar({
  title,
  className,
  children,
  theme = "light",
  onThemeChange,
}: SubPageHeaderBarProps) {
  const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";

  return (
    <header
      data-slot="role-model-sub-page-header"
      className={cn(
        "flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4",
        className,
      )}
    >
      <h1 className="min-w-0 truncate font-sans text-sm leading-5 font-medium tracking-tight text-foreground">
        {title}
      </h1>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        <button
          type="button"
          data-slot="role-model-theme-toggle"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md border border-border bg-background text-foreground",
            "outline-none hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            !onThemeChange && "pointer-events-none",
          )}
          onClick={() => onThemeChange?.(nextTheme)}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}

export type PageContentProps = React.ComponentProps<"main"> & {
  /** Inner max width. Default 1216 (12-col main track + page pad). */
  readonly maxWidthClassName?: string;
};

/**
 * Scrollable main column content — 12-col page pad + max track.
 * Place `PageFilters` and chart/grid rows as children.
 */
function PageContent({
  className,
  maxWidthClassName = "max-w-[1216px]",
  children,
  ...props
}: PageContentProps) {
  return (
    <main
      data-slot="role-model-page-content"
      className={cn("flex min-h-0 flex-1 flex-col overflow-auto", className)}
      {...props}
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-6 px-4 py-5",
          maxWidthClassName,
        )}
      >
        {children}
      </div>
    </main>
  );
}

export type PageShellProps = {
  readonly title: string;
  readonly sidebar: React.ReactNode;
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly headerClassName?: string;
  readonly contentClassName?: string;
  readonly theme?: ThemeMode;
  readonly onThemeChange?: (theme: ThemeMode) => void;
  readonly headerActions?: React.ReactNode;
  /** Optional root data-slot (defaults to role-model-page-shell). */
  readonly "data-slot"?: string;
};

/**
 * Full-bleed role-model page: Sidebar + SubPageHeaderBar + PageContent.
 * Use for Runtime overview and subsequent runtime pages.
 */
function PageShell({
  title,
  sidebar,
  children,
  className,
  headerClassName,
  contentClassName,
  theme,
  onThemeChange,
  headerActions,
  "data-slot": dataSlot = "role-model-page-shell",
}: PageShellProps) {
  return (
    <div
      data-slot={dataSlot}
      className={cn("flex min-h-screen w-full bg-background text-foreground", className)}
    >
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        <SubPageHeaderBar
          title={title}
          className={headerClassName}
          theme={theme}
          onThemeChange={onThemeChange}
        >
          {headerActions}
        </SubPageHeaderBar>
        <PageContent className={contentClassName}>{children}</PageContent>
      </div>
    </div>
  );
}

/** @deprecated Prefer `PageShell`. */
const Rm3PageShell = PageShell;
/** @deprecated Prefer `PageShellProps`. */
type Rm3PageShellProps = PageShellProps;

export { SubPageHeaderBar, PageContent, PageShell, Rm3PageShell };
export type { Rm3PageShellProps };
