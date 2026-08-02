/**
 * @deprecated Prefer kit `SubPageHeaderBar` theme control via `AppShell`.
 * Kept as a thin compatibility shim for any residual imports.
 */
import { startTransition, useEffect, useState } from "react";

import {
  type RuntimeTheme,
  THEME_STORAGE_KEY,
  normalizeStoredTheme,
  resolveInitialTheme,
  syncDocumentTheme,
} from "../lib/theme";

function readResolvedTheme(): RuntimeTheme {
  const storedTheme = normalizeStoredTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  return resolveInitialTheme({
    storedTheme,
    systemPrefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
  });
}

/** @deprecated Use `SubPageHeaderBar` `onThemeChange` instead of the legacy dual-pill. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<RuntimeTheme>("dark");

  useEffect(() => {
    const initialTheme = readResolvedTheme();
    setTheme(initialTheme);
    syncDocumentTheme(initialTheme);
  }, []);

  function handleThemeChange(): void {
    const nextTheme: RuntimeTheme = theme === "dark" ? "light" : "dark";
    startTransition(() => {
      setTheme(nextTheme);
    });
    syncDocumentTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  return (
    <button
      type="button"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-background text-foreground outline-none hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      onClick={handleThemeChange}
    >
      {theme === "dark" ? (
        <svg aria-hidden viewBox="0 0 24 24" fill="none" width={16} height={16}>
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg aria-hidden viewBox="0 0 24 24" fill="none" width={16} height={16}>
          <path
            d="M21 14.3A9 9 0 1 1 9.7 3 7 7 0 0 0 21 14.3z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
