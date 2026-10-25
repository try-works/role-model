import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const here = path.join(import.meta.dirname, "..");

describe("S48a styled client build", () => {
  it("builds a linked non-empty stylesheet and Geist fonts", () => {
    const result = spawnSync(process.execPath, ["build.mjs"], { cwd: here, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    const css = readFileSync(path.join(here, "dist/client/assets/main.css"), "utf8");
    expect(css.length).toBeGreaterThan(80_000);
    expect(css).toContain(".text-\\[11px\\]");
    expect(css).toContain("--rm-bg");
    const index = readFileSync(path.join(here, "dist/client/index.html"), "utf8");
    expect(index).toContain('href="/assets/main.css"');
    expect(index).toContain("geist-latin-400-normal.woff2");
  });
});
