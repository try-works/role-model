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
  utilityLabelClassName,
} from "../lib/design-system";
import { useShellHeaderState } from "../lib/shell-header-context";
import { ThemeToggle } from "./theme-toggle";

function primarySectionLinkClass(isActive: boolean): string {
  return cn(
    `flex min-h-[44px] items-center gap-3 rounded-[var(--rm-radius-lg)] border px-4 py-3 ${navLabelClassName} transition-colors`,
    isActive
      ? "border-[var(--rm-border)] bg-[var(--rm-panel)] text-[var(--rm-fg)]"
      : "border-transparent bg-transparent text-[var(--rm-secondary)] hover:border-[var(--rm-border)] hover:bg-[var(--rm-panel)] hover:text-[var(--rm-fg)]",
  );
}

function secondaryNavLinkClass(isActive: boolean): string {
  return cn(
    `inline-flex min-h-[44px] items-center gap-2 rounded-[var(--rm-radius-pill)] border px-4 py-2 ${utilityLabelClassName} transition-colors`,
    isActive
      ? "border-[var(--rm-border-strong)] bg-[var(--rm-surface)] text-[var(--rm-fg)]"
      : "border-[var(--rm-border)] bg-transparent text-[var(--rm-secondary)] hover:border-[var(--rm-border-strong)] hover:bg-[var(--rm-panel)] hover:text-[var(--rm-fg)]",
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { actions, override } = useShellHeaderState();
  const route = getRuntimeRouteDefinition(location.pathname) ?? getRuntimeRouteDefinition("/app");
  const activeSection =
    runtimeNavigationSections.find((section) => section.title === route?.section) ??
    runtimeNavigationSections[0];
  const hasSecondaryNavigation = activeSection.items.length > 1;
  const title = override?.title ?? route?.title ?? "Runtime overview";
  const description =
    override?.description ??
    route?.description ??
    "Runtime, provider onboarding, endpoint visibility, and request inspection in one shell.";

  return (
    <div className="min-h-screen bg-[var(--rm-bg)] text-[var(--rm-fg)]">
      <div className="mx-auto grid min-h-screen max-w-[var(--rm-shell-width)] gap-5 px-4 py-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside
          className={`${cardClassName} flex flex-col p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-hidden`}
        >
          <div className="pb-2">
            <h1 className={sectionTitleClassName}>role-model</h1>
          </div>
          <div className="mt-5 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <div className="space-y-5">
              {runtimeNavigationSections.map((section) => (
                <div key={section.title}>
                  <NavLink
                    to={section.items[0]?.to ?? "/app"}
                    end={section.title === "Overview"}
                    className={() => primarySectionLinkClass(route?.section === section.title)}
                  >
                    <span className="flex items-center gap-3">
                      <section.icon size={16} />
                      <span>{section.title}</span>
                    </span>
                  </NavLink>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 shrink-0 overflow-hidden">
            <ThemeToggle />
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <header className={`${cardClassName} px-5 py-5`}>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
              <div>
                <h2 className={`max-w-[18ch] text-balance ${displayTitleClassName}`}>
                  {title}
                </h2>
                <p className={`mt-3 max-w-[60ch] ${bodyTextClassName} text-[var(--rm-secondary)]`}>
                  {description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">{actions}</div>
            </div>
            {hasSecondaryNavigation ? (
              <div className="mt-5">
                <nav className="flex flex-wrap gap-2">
                  {activeSection.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/app"}
                      className={({ isActive }) => secondaryNavLinkClass(isActive)}
                    >
                      <item.icon size={14} />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>
            ) : null}
          </header>
          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
