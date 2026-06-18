import { startTransition, useEffect, useState } from "react";

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
    <fieldset
      aria-label="Theme toggle"
      className="mx-auto flex w-full max-w-[272px] items-center gap-1 rounded-[var(--rm-radius-pill)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-1"
    >
      {(["light", "dark"] as const).map((option) => (
        <button
          key={option}
          className={cn(
            "inline-flex min-h-[44px] flex-1 items-center justify-center rounded-[var(--rm-radius-pill)] px-4 text-[17px] font-normal leading-[17px] tracking-[-0.022em] transition active:scale-95",
            theme === option
              ? "border border-[var(--rm-accent)] bg-[var(--rm-accent)] text-[var(--rm-on-primary)]"
              : "border border-transparent bg-transparent text-[var(--rm-secondary)] hover:border-[var(--rm-border)] hover:text-[var(--rm-fg)]",
          )}
          onClick={() => handleThemeChange(option)}
          type="button"
        >
          {option === "light" ? "Light" : "Dark"}
        </button>
      ))}
    </fieldset>
  );
}
