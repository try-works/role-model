import { describe, expect, test, vi } from "vitest";

import {
  BOOT_THEME_PALETTES,
  THEME_STORAGE_KEY,
  applyDocumentThemeStyles,
  getThemeColor,
  normalizeStoredTheme,
  resolveInitialTheme,
  syncDocumentTheme,
} from "./theme";

function createStyleMock() {
  const props = new Map<string, string>();
  return {
    colorScheme: "",
    backgroundColor: "",
    color: "",
    setProperty(name: string, value: string) {
      props.set(name, value);
    },
    getPropertyValue(name: string) {
      return props.get(name) ?? "";
    },
  };
}

function createRootMock() {
  return {
    dataset: {} as Record<string, string>,
    style: createStyleMock(),
  };
}

describe("runtime theme helpers", () => {
  test("normalizes only the supported persisted Light and Dark themes", () => {
    expect(THEME_STORAGE_KEY).toBe("role-model-runtime-theme");
    expect(normalizeStoredTheme("light")).toBe("light");
    expect(normalizeStoredTheme("dark")).toBe("dark");
    expect(normalizeStoredTheme("system")).toBeNull();
    expect(normalizeStoredTheme("LIGHT")).toBeNull();
    expect(normalizeStoredTheme(null)).toBeNull();
  });

  test("uses persisted operator choice before consulting system preference", () => {
    expect(resolveInitialTheme({ storedTheme: "light", systemPrefersDark: true })).toBe("light");
    expect(resolveInitialTheme({ storedTheme: "dark", systemPrefersDark: false })).toBe("dark");
  });

  test("defaults to the dark runtime shell before an explicit operator choice exists", () => {
    expect(resolveInitialTheme({ storedTheme: null, systemPrefersDark: true })).toBe("dark");
    expect(resolveInitialTheme({ storedTheme: null, systemPrefersDark: false })).toBe("dark");
  });

  test("maps active themes to the browser chrome colors used by the Linear review shell", () => {
    expect(getThemeColor("light")).toBe("#ffffff");
    expect(getThemeColor("dark")).toBe("#010102");
  });

  test("applyDocumentThemeStyles rewrites FOUC inline tokens when switching themes", () => {
    const root = createRootMock();
    applyDocumentThemeStyles("dark", root as unknown as HTMLElement);
    expect(root.dataset.theme).toBe("dark");
    expect(root.style.getPropertyValue("--rm-bg")).toBe(BOOT_THEME_PALETTES.dark.bg);
    expect(root.style.getPropertyValue("--rm-fg")).toBe(BOOT_THEME_PALETTES.dark.fg);

    applyDocumentThemeStyles("light", root as unknown as HTMLElement);
    expect(root.dataset.theme).toBe("light");
    expect(root.style.colorScheme).toBe("light");
    expect(root.style.backgroundColor).toBe(BOOT_THEME_PALETTES.light.bg);
    expect(root.style.color).toBe(BOOT_THEME_PALETTES.light.fg);
    expect(root.style.getPropertyValue("--rm-bg")).toBe(BOOT_THEME_PALETTES.light.bg);
    expect(root.style.getPropertyValue("--rm-fg")).toBe(BOOT_THEME_PALETTES.light.fg);
    expect(root.style.getPropertyValue("--rm-surface")).toBe(BOOT_THEME_PALETTES.light.surface);
    expect(root.style.getPropertyValue("--rm-border")).toBe(BOOT_THEME_PALETTES.light.border);
    expect(root.style.getPropertyValue("--rm-secondary")).toBe(BOOT_THEME_PALETTES.light.secondary);
  });

  test("syncDocumentTheme updates theme-color meta alongside document tokens", () => {
    const root = createRootMock();
    const meta = { getAttribute: vi.fn(), setAttribute: vi.fn() };
    vi.stubGlobal("document", {
      documentElement: root,
      querySelector: (selector: string) =>
        selector === 'meta[name="theme-color"]' ? meta : null,
    });

    syncDocumentTheme("light");

    expect(root.dataset.theme).toBe("light");
    expect(root.style.getPropertyValue("--rm-bg")).toBe(BOOT_THEME_PALETTES.light.bg);
    expect(meta.setAttribute).toHaveBeenCalledWith("content", BOOT_THEME_PALETTES.light.bg);
    vi.unstubAllGlobals();
  });
});
