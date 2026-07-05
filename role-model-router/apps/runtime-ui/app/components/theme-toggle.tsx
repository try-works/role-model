import { startTransition, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "../lib/cn";
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

export function ThemeToggle() {
  const [theme, setTheme] = useState<RuntimeTheme>("dark");

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
    <fieldset
      aria-label="Theme toggle"
      className="ml-auto inline-flex h-[44px] w-[104px] items-center gap-1 rounded-[var(--rm-radius-pill)] border border-[var(--rm-border)] bg-[var(--rm-panel-muted)] p-1"
    >
      {(["dark", "light"] as const).map((option) => (
        <button
          key={option}
          aria-label={option === "light" ? "Switch to light theme" : "Switch to dark theme"}
          aria-pressed={theme === option}
          className={cn(
            "inline-flex h-[36px] w-[46px] items-center justify-center rounded-[var(--rm-radius-pill)] transition active:scale-95",
            theme === option
              ? "bg-[var(--rm-accent)] text-[color:var(--rm-on-primary)]"
              : "bg-transparent text-[var(--rm-secondary)] hover:text-[var(--rm-fg)]",
          )}
          onClick={() => handleThemeChange(option)}
          type="button"
        >
          {option === "light" ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
        </button>
      ))}
    </fieldset>
  );
}
