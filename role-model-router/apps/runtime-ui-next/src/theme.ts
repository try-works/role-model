/**
 * S26b shell fact: theme is persisted under the legacy key and applied to the document root.
 * The model is hydrated from localStorage; the toggle writes through a Command.
 */
export const THEME_STORAGE_KEY = "role-model-runtime-theme";
export type RuntimeTheme = "light" | "dark";

export const normalizeStoredTheme = (value: string | null): RuntimeTheme | null =>
  value === "light" || value === "dark" ? value : null;

export const readInitialTheme = (): RuntimeTheme => {
  try {
    return (
      normalizeStoredTheme(globalThis.localStorage?.getItem(THEME_STORAGE_KEY) ?? null) ?? "dark"
    );
  } catch {
    return "dark";
  }
};

export const applyDocumentTheme = (
  theme: RuntimeTheme,
  target: HTMLElement | undefined = globalThis.document?.documentElement,
): void => {
  if (target === undefined) return;
  target.dataset.theme = theme;
  target.classList.toggle("dark", theme === "dark");
  target.classList.toggle("light", theme === "light");
  target.style.colorScheme = theme;
  globalThis.document
    ?.querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#0a0a0a" : "#ffffff");
};

export const persistTheme = (theme: RuntimeTheme): void => {
  try {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable; the model still carries the current theme.
  }
};
