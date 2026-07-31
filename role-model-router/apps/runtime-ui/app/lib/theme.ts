export const THEME_STORAGE_KEY = "role-model-runtime-theme";

export type RuntimeTheme = "light" | "dark";

/** Inline FOUC palette; must stay aligned with `html[data-theme]` tokens in app.css. */
export const BOOT_THEME_PALETTES = {
  dark: {
    accent: "#ffffff",
    bg: "#0a0a0a",
    border: "#1f1f1f",
    fg: "#ededed",
    secondary: "#9a9a9a",
    surface: "#0f0f0f",
  },
  light: {
    accent: "#0a0a0a",
    bg: "#ffffff",
    border: "#eaeaea",
    fg: "#111111",
    secondary: "#666666",
    surface: "#ffffff",
  },
} as const;

/** RM3 token keys mirrored during FOUC bootstrap alongside transitional `--rm-*`. */
export const BOOT_RM3_TOKEN_KEYS = {
  dark: {
    background: "#0a0a0a",
    foreground: "#ededed",
    primary: "#ffffff",
    border: "#1f1f1f",
    card: "#0f0f0f",
  },
  light: {
    background: "#ffffff",
    foreground: "#111111",
    primary: "#0a0a0a",
    border: "#eaeaea",
    card: "#ffffff",
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
  const rm3Tokens = BOOT_RM3_TOKEN_KEYS[theme];
  target.dataset.theme = theme;
  target.style.colorScheme = theme;
  target.style.backgroundColor = palette.bg;
  target.style.color = palette.fg;
  for (const [token, value] of Object.entries(palette)) {
    target.style.setProperty(`--rm-${token}`, value);
  }
  for (const [token, value] of Object.entries(rm3Tokens)) {
    target.style.setProperty(`--rm3-${token}`, value);
  }
}

export function syncDocumentTheme(theme: RuntimeTheme): void {
  applyDocumentThemeStyles(theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", getThemeColor(theme));
}
