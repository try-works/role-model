/**
 * Run 101 / R1: emit declarations for a workspace package that re-exports a
 * vendored, source-only tree.
 *
 * The vendored trees import their own modules with explicit `.ts` extensions,
 * which TypeScript only accepts under `allowImportingTsExtensions` - a flag that
 * is only legal together with `noEmit`/`emitDeclarationOnly`. Emitting the
 * declarations here (with `--noCheck`, so the vendored tree's own type state can
 * never fail a consumer's build) and rewriting the emitted `.ts` specifiers to
 * `.js` gives consumers real types without touching vendored bytes.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function emitVendoredDeclarations({ repoRoot, entryFiles, typesDir }) {
  if (!entryFiles?.length) {
    throw new Error("declaration emit requires at least one entry file");
  }
  await mkdir(typesDir, { recursive: true });
  execFileSync(
    process.execPath,
    [
      path.join(repoRoot, "node_modules", "typescript", "bin", "tsc"),
      "--noCheck",
      "--emitDeclarationOnly",
      "--declaration",
      "--allowImportingTsExtensions",
      "--module",
      "nodenext",
      "--moduleResolution",
      "nodenext",
      "--target",
      "es2022",
      "--skipLibCheck",
      "--outDir",
      typesDir,
      ...entryFiles,
    ],
    { stdio: "pipe" },
  );

  for (const file of await readdir(typesDir, { recursive: true, withFileTypes: true })) {
    if (!file.isFile() || !file.name.endsWith(".d.ts")) continue;
    const filePath = path.join(file.parentPath ?? file.path, file.name);
    const source = await readFile(filePath, "utf8");
    const rewritten = source.replace(
      /(from\s+|import\()(["'])([^"']+)\.ts\2/g,
      (_match, prefix, quote, specifier) => `${prefix}${quote}${specifier}.js${quote}`,
    );
    if (rewritten !== source) {
      await writeFile(filePath, rewritten, "utf8");
    }
  }
}
