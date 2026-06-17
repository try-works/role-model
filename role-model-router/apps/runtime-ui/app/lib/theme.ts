export type RuntimeTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "rm-runtime-ui-theme";

const LIGHT_THEME_COLOR = "#f5f5f7";
const DARK_THEME_COLOR = "#000000";

export function normalizeStoredTheme(value: string | null | undefined): RuntimeTheme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function resolveInitialTheme({
  storedTheme,
  systemPrefersDark,
}: {
  storedTheme: string | null | undefined;
  systemPrefersDark: boolean;
}): RuntimeTheme {
  return normalizeStoredTheme(storedTheme) ?? (systemPrefersDark ? "dark" : "light");
}

export function getThemeColor(theme: RuntimeTheme): string {
  return theme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
}

export function getThemeBootstrapScript(storageKey = THEME_STORAGE_KEY): string {
  return `(function(){const storageKey=${JSON.stringify(storageKey)};const lightColor=${JSON.stringify(LIGHT_THEME_COLOR)};const darkColor=${JSON.stringify(DARK_THEME_COLOR)};const normalize=function(value){return value==="light"||value==="dark"?value:null;};const resolve=function(storedTheme,systemPrefersDark){return normalize(storedTheme)||(systemPrefersDark?"dark":"light");};const readStoredTheme=function(){try{return window.localStorage.getItem(storageKey);}catch{return null;}};const root=document.documentElement;const systemPrefersDark=!!(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);const theme=resolve(readStoredTheme(),systemPrefersDark);root.dataset.theme=theme;root.style.colorScheme=theme;const meta=document.querySelector('meta[name="theme-color"]');if(meta){meta.setAttribute("content",theme==="dark"?darkColor:lightColor);}})();`;
}
