export const THEME_STORAGE_KEY = "role-model-runtime-theme";

export type RuntimeTheme = "light" | "dark";

export function normalizeStoredTheme(value: string | null): RuntimeTheme | null {
  if (value === "light" || value === "dark") {
    return value;
  }
  return null;
}

export function resolveInitialTheme(input: {
  storedTheme: RuntimeTheme | null;
  systemPrefersDark: boolean;
}): RuntimeTheme {
  if (input.storedTheme) {
    return input.storedTheme;
  }
  return input.systemPrefersDark ? "dark" : "light";
}

export function getThemeColor(theme: RuntimeTheme): string {
  return theme === "dark" ? "#000000" : "#f5f5f7";
}

export function syncDocumentTheme(theme: RuntimeTheme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", getThemeColor(theme));
}
