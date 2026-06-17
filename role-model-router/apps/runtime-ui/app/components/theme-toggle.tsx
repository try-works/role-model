import { startTransition, useEffect, useState } from "react";

import { cn } from "../lib/cn";
import {
  THEME_STORAGE_KEY,
  getThemeColor,
  normalizeStoredTheme,
  resolveInitialTheme,
  type RuntimeTheme,
} from "../lib/theme";
import { utilityButtonClassName } from "../lib/design-system";

function syncDocumentTheme(theme: RuntimeTheme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", getThemeColor(theme));
}

function readResolvedTheme(): RuntimeTheme {
  const storedTheme = normalizeStoredTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  return resolveInitialTheme({
    storedTheme,
    systemPrefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
  });
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<RuntimeTheme>("light");

  useEffect(() => {
    const initialTheme = readResolvedTheme();
    setTheme(initialTheme);
    syncDocumentTheme(initialTheme);
  }, []);

  function handleThemeChange(nextTheme: RuntimeTheme): void {
    startTransition(() => {
      setTheme(nextTheme);
    });
    syncDocumentTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  return (
    <div
      aria-label="Theme toggle"
      className="mx-auto flex w-full max-w-[272px] items-center gap-1 rounded-[var(--rm-radius-pill)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-1"
      role="group"
    >
      {(["light", "dark"] as const).map((option) => (
        <button
          key={option}
          className={cn(
            `${utilityButtonClassName} flex-1 min-w-0 rounded-[var(--rm-radius-pill)] px-4`,
            theme === option
              ? "border border-[var(--rm-accent)] bg-[var(--rm-accent)] text-white"
              : "border border-transparent bg-transparent text-[var(--rm-secondary)] hover:border-[var(--rm-border)] hover:text-[var(--rm-fg)]",
          )}
          onClick={() => handleThemeChange(option)}
          type="button"
        >
          {option === "light" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  );
}
