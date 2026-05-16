import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router";

import { cn } from "../lib/cn";
import {
  cardClassName,
  getRuntimeRouteDefinition,
  runtimeNavigationSections,
} from "../lib/design-system";

function primarySectionLinkClass(isActive: boolean): string {
  return cn(
    "flex min-h-[52px] items-center justify-between gap-3 rounded-none border px-4 py-3 text-sm transition-colors",
    isActive
      ? "border-[var(--rm-border-strong)] bg-[var(--rm-surface-strong)] text-[var(--rm-fg)]"
      : "border-transparent text-[var(--rm-secondary)] hover:border-[var(--rm-border)] hover:bg-[var(--rm-panel)] hover:text-[var(--rm-fg)]",
  );
}

function secondaryNavLinkClass(isActive: boolean): string {
  return cn(
    "inline-flex min-h-[44px] items-center gap-2 rounded-none border px-3 py-2 text-sm transition-colors",
    isActive
      ? "border-[var(--rm-border-strong)] bg-[var(--rm-surface-strong)] text-[var(--rm-fg)]"
      : "border-[var(--rm-border)] bg-[var(--rm-panel)] text-[var(--rm-secondary)] hover:border-[var(--rm-border-strong)] hover:text-[var(--rm-fg)]",
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const route = getRuntimeRouteDefinition(location.pathname) ?? getRuntimeRouteDefinition("/app");
  const activeSection =
    runtimeNavigationSections.find((section) => section.title === route?.section) ??
    runtimeNavigationSections[0];

  return (
    <div className="min-h-screen bg-[var(--rm-bg)] text-[var(--rm-fg)]">
      <div className="mx-auto grid min-h-screen max-w-[var(--rm-shell-width)] gap-5 px-4 py-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className={`${cardClassName} p-5 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]`}>
          <div className="border-b border-[var(--rm-border)] pb-5">
            <h1 className="text-2xl font-medium tracking-tight">role-model</h1>
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
                    <span>{section.title}</span>
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--rm-muted)]">
                    {section.items.length}
                  </span>
                </NavLink>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <header className={`${cardClassName} px-5 py-5`}>
            <div>
              <div className="h-px w-10 bg-[var(--rm-accent)]" />
              <p className="text-xs font-normal uppercase tracking-[0.24em] text-[var(--rm-muted)]">
                {route?.section ?? "Overview"}
              </p>
              <h2 className="mt-3 text-3xl font-light tracking-tight">
                {route?.title ?? "Runtime overview"}
              </h2>
              <p className="mt-3 max-w-[60ch] text-sm leading-6 text-[var(--rm-secondary)]">
                {route?.description ??
                  "Runtime, provider onboarding, endpoint visibility, and request inspection in one shell."}
              </p>
            </div>
            <div className="mt-5 border-t border-[var(--rm-border)] pt-4">
              <p className="text-xs font-normal uppercase tracking-[0.22em] text-[var(--rm-muted)]">
                {activeSection.title} pages
              </p>
              <nav className="mt-3 flex flex-wrap gap-2">
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
          </header>
          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
