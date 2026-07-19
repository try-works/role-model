import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("runtime root", () => {
  test("ships a minimal hydration fallback without restoring the old boot splash", () => {
    const source = readFileSync(new URL("./root.tsx", import.meta.url), "utf8");

    expect(source).toContain("export function HydrateFallback");
    expect(source).toContain("Loading role-model runtime");
    expect(source).toContain("--rm-font-display");
    expect(source).not.toContain("Runtime boot");
    expect(source).not.toContain("Opening role-model runtime");
  });

  test("does not rely on remote fonts before the packaged runtime paints", () => {
    const source = readFileSync(new URL("./root.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("fonts.googleapis.com");
    expect(source).not.toContain("fonts.gstatic.com");
  });

  test("preloads bundled design-system fonts for packaged first paint", () => {
    const source = readFileSync(new URL("./root.tsx", import.meta.url), "utf8");

    expect(source).toContain("/assets/fonts/inter-latin-400-normal.woff2");
    expect(source).toContain("/assets/fonts/inter-latin-600-normal.woff2");
    expect(source).toContain("/assets/fonts/ibm-plex-mono-latin-400-normal.woff2");
    expect(source).toContain('as: "font"');
    expect(source).toContain('crossOrigin: "anonymous"');
    expect(source).not.toContain("fonts.googleapis.com");
    expect(source).not.toContain("fonts.gstatic.com");
  });
});
