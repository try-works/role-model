export const THEME_STORAGE_KEY = "role-model-runtime-theme";

export type RuntimeTheme = "light" | "dark";

/** Inline FOUC palette; must stay aligned with `html[data-theme]` tokens in app.css. */
export const BOOT_THEME_PALETTES = {
  dark: {
    accent: "#5e6ad2",
    bg: "#010102",
    border: "#23252a",
    fg: "#f7f8f8",
    secondary: "#d0d6e0",
    surface: "#0f1011",
  },
  light: {
    accent: "#5e6ad2",
    bg: "#ffffff",
    border: "#e3e6ec",
    fg: "#0f1115",
    secondary: "#3a4150",
    surface: "#f7f8f8",
  },
} as const;

export type BootThemePalette = (typeof BOOT_THEME_PALETTES)[RuntimeTheme];

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
  return "dark";
}

export function getThemeColor(theme: RuntimeTheme): string {
  return BOOT_THEME_PALETTES[theme].bg;
}

export function getBootThemePalette(theme: RuntimeTheme): BootThemePalette {
  return BOOT_THEME_PALETTES[theme];
}

/** Apply dataset + inline FOUC tokens so stylesheet theme switches are not masked. */
export function applyDocumentThemeStyles(
  theme: RuntimeTheme,
  target: HTMLElement = document.documentElement,
): void {
  const palette = getBootThemePalette(theme);
  target.dataset.theme = theme;
  target.style.colorScheme = theme;
  target.style.backgroundColor = palette.bg;
  target.style.color = palette.fg;
  for (const [token, value] of Object.entries(palette)) {
    target.style.setProperty(`--rm-${token}`, value);
  }
}

export function syncDocumentTheme(theme: RuntimeTheme): void {
  applyDocumentThemeStyles(theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", getThemeColor(theme));
}
