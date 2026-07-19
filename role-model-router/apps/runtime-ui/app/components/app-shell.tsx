import { type ReactNode, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router";

import {
  displayTitleClassName,
  getPrimarySectionLinkClassName,
  getRuntimeRouteDefinition,
  getSecondaryNavigationLinkClassName,
  navLabelClassName,
  runtimeNavigationSections,
} from "../lib/design-system";
import { useShellHeaderState } from "../lib/shell-header-context";
import { ThemeToggle } from "./theme-toggle";

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const contentScrollRef = useRef<HTMLElement | null>(null);
  const { actions, override } = useShellHeaderState();
  const route = getRuntimeRouteDefinition(location.pathname) ?? getRuntimeRouteDefinition("/app");
  const activeSection =
    runtimeNavigationSections.find((section) => section.title === route?.section) ??
    runtimeNavigationSections[0];
  const title = override?.title ?? route?.title ?? "Runtime overview";
  const hasSecondaryNavigation = activeSection.items.length > 1;
  const pathname = location.pathname;

  useEffect(() => {
    if (pathname) {
      contentScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [pathname]);

  return (
    <div className="h-screen overflow-hidden bg-[var(--rm-bg)] text-[var(--rm-fg)]">
      <div className="mx-auto h-full max-w-[var(--rm-shell-width)] px-10 py-10">
        <div className="h-full overflow-hidden rounded-[var(--rm-radius-shell)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-5 py-5">
          <div className="grid h-full min-h-0 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="flex h-full flex-col gap-3 overflow-hidden lg:pt-5">
              <div>
                <h1 className={`text-[var(--rm-fg)] ${displayTitleClassName}`}>role-model</h1>
              </div>
              <div className="space-y-2 overflow-y-auto pr-1">
                {runtimeNavigationSections.map((section) => (
                  <div key={section.title}>
                    <NavLink
                      to={section.items[0]?.to ?? "/app"}
                      end={section.title === "Overview"}
                      className={() =>
                        getPrimarySectionLinkClassName(route?.section === section.title)
                      }
                    >
                      <span className={navLabelClassName}>{section.title}</span>
                    </NavLink>
                  </div>
                ))}
              </div>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-col gap-4">
              <header className="min-w-0 shrink-0">
                <div className="flex items-start justify-between gap-4 pt-5">
                  <div className="min-w-0 max-w-[560px]">
                    <h2 className={`text-balance text-[var(--rm-fg)] ${displayTitleClassName}`}>
                      {title}
                    </h2>
                  </div>
                  <ThemeToggle />
                </div>
                {hasSecondaryNavigation || actions ? (
                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    {hasSecondaryNavigation ? (
                      <nav className="flex flex-wrap gap-2">
                        {activeSection.items.map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end
                            className={({ isActive }) =>
                              getSecondaryNavigationLinkClassName(isActive)
                            }
                          >
                            {({ isActive }) => (
                              <span
                                className={navLabelClassName}
                                style={isActive ? { color: "var(--rm-on-primary)" } : undefined}
                              >
                                {item.label}
                              </span>
                            )}
                          </NavLink>
                        ))}
                      </nav>
                    ) : null}
                    {actions ? <div className="min-w-0 flex-1">{actions}</div> : null}
                  </div>
                ) : null}
              </header>
              <main
                ref={contentScrollRef}
                className="runtime-shell-content-scroll min-h-0 flex-1 overflow-y-auto pr-2"
              >
                <div className="space-y-6 pb-5">{children}</div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
