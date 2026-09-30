/**
 * L7: the naming rule.
 *
 * The product name is always lower-case `role-model`. This is not cosmetic: the
 * provider route key is the string the main model selector shows as the group
 * label, and the same name appears in command text, panel titles and diagnostics.
 * A stray capitalisation is a user-visible defect, so it fails the build.
 *
 * Scanned: every shipped source file, the locale bundle, the manifest metadata and
 * the packaged skill. The only permitted occurrences of a capitalised form are the
 * package identifiers `@try-works/dsh-role-model` and `dsh-role-model`.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

/** The package root, one level above this spec. */
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Directories that are not shipped authored text. */
const SKIPPED_DIRECTORIES = new Set(["node_modules", "lib", ".git"]);

/** File extensions whose contents are authored text. */
const SCANNED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".mts",
  ".json",
  ".md",
  ".yml",
  ".yaml",
]);

/** Files that legitimately mention the capitalised form. */
const ALLOWED_FILES = new Set([
  // This spec names the forbidden pattern in order to forbid it.
  "test/naming.spec.ts",
  // The plan cross-references the Pi package's own capitalised title.
  "docs/plans/dsh-role-model-implementation.md",
]);

/**
 * Collect every shipped authored file under a directory.
 * @param directory - directory to walk.
 * @returns absolute file paths.
 */
function collectFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry)) continue;
      found.push(...collectFiles(path));
      continue;
    }
    if (SCANNED_EXTENSIONS.has(extname(entry))) found.push(path);
  }
  return found;
}

/** The pattern that must not appear: a capitalised "Role Model" or "Role-Model". */
const FORBIDDEN = /\bRole[ -]Model\b/u;

describe("the product name is always lower-case role-model", () => {
  const files = [
    ...collectFiles(join(packageRoot, "src")),
    ...collectFiles(join(packageRoot, "test")),
    ...collectFiles(join(packageRoot, "scripts")),
    ...collectFiles(join(packageRoot, "locale")),
    join(packageRoot, "package.json"),
    join(packageRoot, "cordis.patch.yml"),
  ];

  test("the scan covers a meaningful number of files", () => {
    // A scan that silently found nothing would pass vacuously.
    expect(files.length).toBeGreaterThan(20);
  });

  test("no shipped file capitalises the product name", () => {
    const offenders: string[] = [];
    for (const path of files) {
      const relativePath = relative(packageRoot, path).replace(/\\/gu, "/");
      if (ALLOWED_FILES.has(relativePath)) continue;
      const contents = readFileSync(path, "utf8");
      contents.split("\n").forEach((line, index) => {
        if (FORBIDDEN.test(line))
          offenders.push(`${relativePath}:${String(index + 1)}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  test("the provider route is lower-case", () => {
    const config = readFileSync(join(packageRoot, "src", "config.ts"), "utf8");
    // Match the route value regardless of the string-literal style the formatter uses.
    expect(config).toMatch(/DEFAULT_PROVIDER_ROUTE\s*=\s*["']role-model["']/u);
  });

  test("the locale title is exactly role-model", () => {
    const locale = JSON.parse(readFileSync(join(packageRoot, "locale", "en.json"), "utf8")) as {
      meta: { title: string; description: string };
    };
    expect(locale.meta.title).toBe("role-model");
    expect(FORBIDDEN.test(locale.meta.description)).toBe(false);
  });

  test("the bundle patch names the route in lower case", () => {
    const patch = readFileSync(join(packageRoot, "cordis.patch.yml"), "utf8");
    expect(patch).toContain("providerRoute: role-model");
    expect(FORBIDDEN.test(patch)).toBe(false);
  });
});

describe("the packaged skill names the product correctly", () => {
  test("the skill directory is named role-model", () => {
    const entries = readdirSync(join(packageRoot, "skills"));
    expect(entries).toContain("role-model");
  });

  test("the skill body does not capitalise the product name", () => {
    const body = readFileSync(join(packageRoot, "skills", "role-model", "SKILL.md"), "utf8");
    const offenders = body.split("\n").filter((line) => FORBIDDEN.test(line));
    expect(offenders).toEqual([]);
  });

  test("the skill body documents the command surface", () => {
    const body = readFileSync(join(packageRoot, "skills", "role-model", "SKILL.md"), "utf8");
    for (const command of ["status", "doctor", "alias", "requests", "explain"]) {
      expect(body).toContain(command);
    }
  });
});
