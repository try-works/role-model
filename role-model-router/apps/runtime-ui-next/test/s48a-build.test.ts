import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const here = path.join(import.meta.dirname, "..");

describe("S48a styled client build", () => {
  it("builds a linked non-empty stylesheet and Geist fonts", { timeout: 20_000 }, () => {
    const result = spawnSync(process.execPath, ["build.mjs"], { cwd: here, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    const css = readFileSync(path.join(here, "dist/client/assets/main.css"), "utf8");
    expect(css.length).toBeGreaterThan(50_000);
    for (const selector of [".md\\:flex{", ".flex-col{", ".text-\\[11px\\]{", ".border-\\[var\\(--rm-border\\)\\]{", ".bg-\\[var\\(--rm-surface\\)\\]{"]) {
      expect(css, selector).toContain(selector);
    }
    expect(css).toContain(".text-\\[11px\\]");
    expect(css).toContain("--rm-bg");
    /**
     * S112: the generated stylesheet must keep the accessibility affordances the design system
     * provides. Regenerating the CSS without them would silently strip keyboard focus indication
     * and reduced-motion handling, which no component test would notice.
     */
    expect(css).toContain("focus-visible");
    expect(css).toContain("prefers-reduced-motion");
    const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((match) => (match[1] ?? "").replace(/^["\']|["\']$/g, "")).filter((ref) => ref.startsWith("/"));
    for (const url of urls) {
      expect(existsSync(path.join(here, "dist/client", url.slice(1))), url).toBe(true);
    }
    expect(readdirSync(path.join(here, "dist/client/assets/fonts")).filter((file) => file.endsWith(".woff2")).length).toBeGreaterThanOrEqual(14);
    const buildSource = readFileSync(path.join(here, "build.mjs"), "utf8");
    expect(buildSource).toContain("runtime-ui/public/assets/fonts");
    expect(buildSource).not.toContain("runtime-ui/build/client/assets/fonts");
    const index = readFileSync(path.join(here, "dist/client/index.html"), "utf8");
    expect(index).toContain('href="/assets/main.css"');
    expect(index).toContain("geist-latin-400-normal.woff2");
  });
});
