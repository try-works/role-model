import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router";

import { cn } from "../lib/cn";
import { cardClassName, getRuntimeRouteDefinition, runtimeNavigationSections, shellQuickLinks } from "../lib/design-system";

function navLinkClass(isActive: boolean): string {
  return cn(
    "flex min-h-[44px] items-center gap-3 rounded-none border px-3 py-2.5 text-sm transition-colors",
    isActive
      ? "border-[var(--rm-border-strong)] bg-[var(--rm-surface-strong)] text-[var(--rm-fg)]"
      : "border-transparent text-[var(--rm-secondary)] hover:border-[var(--rm-border)] hover:bg-[var(--rm-panel)] hover:text-[var(--rm-fg)]",
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const route = getRuntimeRouteDefinition(location.pathname) ?? getRuntimeRouteDefinition("/app");

  return (
    <div className="min-h-screen bg-[var(--rm-bg)] text-[var(--rm-fg)]">
      <div className="mx-auto grid min-h-screen max-w-[var(--rm-shell-width)] gap-5 px-4 py-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className={`${cardClassName} p-5 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]`}>
          <div className="border-b border-[var(--rm-border)] pb-5">
            <p className="text-xs font-normal uppercase tracking-[0.24em] text-[var(--rm-muted)]">Role Model Runtime</p>
            <h1 className="mt-2 text-2xl font-light tracking-tight">Operator Shell</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--rm-secondary)]">
              Configure provider state, inspect runtime behavior, and run routed requests from one repo-owned surface.
            </p>
          </div>
          <div className="mt-5 space-y-5">
            {runtimeNavigationSections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 text-xs font-normal uppercase tracking-[0.22em] text-[var(--rm-muted)]">{section.title}</p>
                <nav className="space-y-1.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink key={item.to} to={item.to} end={item.to === "/app"} className={({ isActive }) => navLinkClass(isActive)}>
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-[var(--rm-border)] pt-4">
            <p className="text-xs font-normal uppercase tracking-[0.22em] text-[var(--rm-muted)]">Preserved host tools</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--rm-secondary)]">
              <li><a className="underline-offset-4 hover:text-[var(--rm-fg)] hover:underline" href="/logs">/logs</a></li>
              <li><a className="underline-offset-4 hover:text-[var(--rm-fg)] hover:underline" href="/api/metrics">/api/metrics</a></li>
              <li><a className="underline-offset-4 hover:text-[var(--rm-fg)] hover:underline" href="/ui">/ui</a></li>
            </ul>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <header className={`${cardClassName} px-5 py-5`}>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <p className="text-xs font-normal uppercase tracking-[0.24em] text-[var(--rm-muted)]">
                  {route?.section ?? "Operate"}
                </p>
                <h2 className="mt-3 text-3xl font-light tracking-tight">{route?.title ?? "Runtime overview"}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--rm-secondary)]">
                  {route?.description ?? "Runtime, provider onboarding, endpoint visibility, and request inspection in one shell."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-normal uppercase tracking-[0.18em] text-[var(--rm-muted)]">
                  <span>{location.pathname}</span>
                  {route ? <span>{route.template}</span> : null}
                </div>
              </div>

              <div className="rounded-none border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4">
                <p className="text-xs font-normal uppercase tracking-[0.22em] text-[var(--rm-muted)]">
                  {route?.noteTitle ?? "Route note"}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--rm-secondary)]">{route?.noteBody}</p>
                <div className="mt-4 border-t border-[var(--rm-border)] pt-4">
                  <p className="text-xs font-normal uppercase tracking-[0.22em] text-[var(--rm-muted)]">Quick links</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    {shellQuickLinks.map((link) => (
                      <a
                        key={link.href}
                        className="min-h-[44px] rounded-none border border-[var(--rm-border)] px-3 py-1.5 hover:border-[var(--rm-border-strong)]"
                        href={link.href}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </header>
          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
