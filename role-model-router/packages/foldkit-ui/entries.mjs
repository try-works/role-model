import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Run 115 S3b (R6/R5): entry discovery for the first-party `@role-model-router/foldkit-ui` wrapper.
 *
 * The vendored Foldkit package is source-only: its published manifest maps every subpath to
 * `./dist/*.js`, and `dist/` is deliberately absent from the vendoring payload. This module
 * therefore derives the esbuild entry list from the vendored `package.json` exports map
 * (never hand-typed) and resolves each published target back to the `src/*.ts` file it was
 * compiled from. A mapped source file that does not exist must fail the build loudly: silently
 * dropping a published subpath would produce a wrapper that lies about its surface.
 */
const here = import.meta.dirname;
const repoRoot = path.resolve(here, "..", "..", "..");

export const vendoredPackageDir = path.join(repoRoot, "vendor", "foldkit", "packages", "ui");

/** The public exports map of the vendored package - the source of truth for entry discovery. */
export async function readPublishedExports(packageDir = vendoredPackageDir) {
  const manifestPath = path.join(packageDir, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.exports === undefined || typeof manifest.exports !== "object") {
    throw new Error(`vendored package ${manifestPath} publishes no exports map`);
  }
  return manifest.exports;
}

/**
 * Turn a published target (`./dist/<rel>.js`) into the vendored source file it was compiled
 * from (`src/<rel>.ts`). Anything that is not a `./dist/*.js` import is refused, so a manifest
 * shape this wrapper does not understand fails instead of guessing.
 */
export function sourceRelativePath(target, subpath) {
  const specifier = typeof target === "string" ? target : (target?.import ?? target?.default);
  if (
    typeof specifier !== "string" ||
    !specifier.startsWith("./dist/") ||
    !specifier.endsWith(".js")
  ) {
    throw new Error(
      `published export "${subpath}" does not resolve to a ./dist/*.js import: ${JSON.stringify(target)}`,
    );
  }
  return `src/${specifier.slice("./dist/".length, -".js".length)}.ts`;
}

/**
 * Exact-name existence check. `readdir` never folds case, so a source file whose spelling
 * differs from the manifest (`devTools` vs `devtools`) is reported as missing instead of being
 * opened through a case-insensitive filesystem.
 */
async function exactFile(file) {
  try {
    for (const entry of await readdir(path.dirname(file))) {
      if (entry === path.basename(file)) return file;
    }
  } catch {
    // A missing parent directory means the candidate cannot exist either.
  }
  return undefined;
}

/**
 * The esbuild entry map derived from the published manifest: `index` for the package root and
 * the published subpath otherwise, mapped to the absolute vendored source file.
 */
export async function assembleEntries({ packageDir = vendoredPackageDir, exportsMap } = {}) {
  const published = exportsMap ?? (await readPublishedExports(packageDir));
  const entries = {};
  const bySubpath = new Map();
  const missing = [];

  for (const [subpath, target] of Object.entries(published)) {
    if (!subpath.startsWith(".")) continue;
    const sourceRelative = sourceRelativePath(target, subpath);
    const resolved = await exactFile(path.join(packageDir, ...sourceRelative.split("/")));
    if (resolved === undefined) {
      missing.push(`${subpath} -> ${sourceRelative}`);
      continue;
    }
    const key = subpath === "." ? "index" : subpath.slice(2);
    if (entries[key] !== undefined) throw new Error(`duplicate wrapper entry "${key}"`);
    entries[key] = resolved;
    bySubpath.set(subpath, resolved);
  }

  if (missing.length > 0) {
    throw new Error(
      `published export(s) without a vendored source file: ${missing.join(", ")}. The vendored drop is source-only, so a mapped source file that does not exist would silently disappear from the wrapper.`,
    );
  }

  return { entries, bySubpath };
}

/** The wrapper `exports` map implied by the resolved entries (the build and its test share it). */
export function renderWrapperExports(bySubpath) {
  const exportsMap = { "./package.json": "./package.json" };
  for (const subpath of [...bySubpath.keys()].sort()) {
    const key = subpath === "." ? "index" : subpath.slice(2);
    exportsMap[subpath] = {
      types: `./dist/types/${key}.d.ts`,
      import: `./dist/${key}.js`,
      default: `./dist/${key}.js`,
    };
  }
  return exportsMap;
}
