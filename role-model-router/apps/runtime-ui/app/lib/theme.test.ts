import { describe, expect, test } from "vitest";

import {
  THEME_STORAGE_KEY,
  getThemeColor,
  normalizeStoredTheme,
  resolveInitialTheme,
} from "./theme";

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
});
