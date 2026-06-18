import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router";

import { cn } from "../lib/cn";
import {
  bodyTextClassName,
  cardClassName,
  displayTitleClassName,
  getRuntimeRouteDefinition,
  navLabelClassName,
  runtimeNavigationSections,
  sectionTitleClassName,
} from "../lib/design-system";
import { useShellHeaderState } from "../lib/shell-header-context";
import { ThemeToggle } from "./theme-toggle";

function primarySectionLinkClass(isActive: boolean): string {
  return cn(
    `flex min-h-[52px] items-center justify-between gap-3 rounded-[var(--rm-radius-panel)] border px-4 py-3 transition-colors ${navLabelClassName}`,
    isActive
      ? "border-[var(--rm-border-strong)] bg-[var(--rm-surface-strong)] text-[var(--rm-fg)]"
      : "border-transparent text-[var(--rm-secondary)] hover:border-[var(--rm-border)] hover:bg-[var(--rm-panel)] hover:text-[var(--rm-fg)]",
  );
}

function secondaryNavLinkClass(isActive: boolean): string {
  return cn(
    `inline-flex min-h-[44px] items-center gap-2 rounded-[var(--rm-radius-pill)] border px-3 py-2 ${navLabelClassName} transition-colors`,
    isActive
      ? "border-[var(--rm-border-strong)] bg-[var(--rm-surface-strong)] text-[var(--rm-fg)]"
      : "border-[var(--rm-border)] bg-[var(--rm-panel)] text-[var(--rm-secondary)] hover:border-[var(--rm-border-strong)] hover:text-[var(--rm-fg)]",
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { actions, override } = useShellHeaderState();
  const route = getRuntimeRouteDefinition(location.pathname) ?? getRuntimeRouteDefinition("/app");
  const activeSection =
    runtimeNavigationSections.find((section) => section.title === route?.section) ??
    runtimeNavigationSections[0];
  const title = override?.title ?? route?.title ?? "Runtime overview";
  const description =
    override?.description ??
    route?.description ??
    "Runtime, provider onboarding, endpoint visibility, and request inspection in one shell.";
  const hasSecondaryNavigation = activeSection.items.length > 1;

  return (
    <div className="min-h-screen bg-[var(--rm-bg)] text-[var(--rm-fg)]">
      <div className="mx-auto grid min-h-screen max-w-[var(--rm-shell-width)] gap-5 px-4 py-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside
          className={`${cardClassName} flex flex-col p-5 lg:sticky lg:top-4 lg:self-start lg:min-h-[calc(100vh-2rem)]`}
        >
          <div>
            <h1 className={`text-[var(--rm-fg)] ${sectionTitleClassName}`}>role-model</h1>
          </div>
          <div className="mt-5 space-y-5">
            {runtimeNavigationSections.map((section) => (
              <div key={section.title}>
                <NavLink
                  to={section.items[0]?.to ?? "/app"}
                  end={section.title === "Overview"}
                  className={() => primarySectionLinkClass(route?.section === section.title)}
                >
                  <span className="flex items-center gap-3">
                    <section.icon size={16} />
                    <span className={navLabelClassName}>{section.title}</span>
                  </span>
                </NavLink>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-2">
            <ThemeToggle />
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <header className={`${cardClassName} px-5 py-5`}>
            <div>
              <div>
                <h2
                  className={`max-w-[16ch] text-balance text-[var(--rm-fg)] ${displayTitleClassName}`}
                >
                  {title}
                </h2>
                <p className={`mt-3 max-w-[60ch] ${bodyTextClassName} text-[var(--rm-secondary)]`}>
                  {description}
                </p>
              </div>
            </div>
            {hasSecondaryNavigation || actions ? (
              <div className="mt-5 flex flex-wrap items-end gap-3">
                {hasSecondaryNavigation ? (
                  <nav className="flex flex-wrap gap-2">
                    {activeSection.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/app"}
                        className={({ isActive }) => secondaryNavLinkClass(isActive)}
                      >
                        <item.icon size={14} />
                        <span className={navLabelClassName}>{item.label}</span>
                      </NavLink>
                    ))}
                  </nav>
                ) : null}
                {actions ? <div className="min-w-0 flex-1">{actions}</div> : null}
              </div>
            ) : null}
          </header>
          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
