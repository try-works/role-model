import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import {
  assembleEntries as assemblePlatformEntries,
  vendoredPackageDir as platformVendoredDir,
  renderWrapperExports as renderPlatformExports,
} from "../../effect-platform-browser/entries.mjs";
import {
  assembleEntries as assembleUiEntries,
  renderWrapperExports as renderUiExports,
  vendoredPackageDir as uiVendoredDir,
} from "../../foldkit-ui/entries.mjs";
import {
  assembleEntries as assembleFoldkitEntries,
  vendoredPackageDir as foldkitVendoredDir,
  renderWrapperExports as renderFoldkitExports,
} from "../entries.mjs";

/**
 * Run 115 S3b/S3c (R6/R5): the first-party Foldkit wrappers (and the browser platform wrapper they
 * peer on) are built from vendored sources; the published Foldkit manifests point at a `dist/`
 * this repository does not vendor, and the browser platform package is published from src.
 *
 * This test is the maintained proof that the BUILT output is a browser graph:
 *   1. no Node builtin and no @effect/platform-node import in either package's dist,
 *   2. `effect` is one shared bare specifier (never bundled, never a vendored relative path),
 *   3. every subpath in the vendored manifest has a wrapper export whose built file exists, and
 *      the wrapper manifest is exactly what entry generation derives (no hand-typed drift),
 *   4. entry generation fails loudly for a published subpath whose source file is missing.
 */

const here = import.meta.dirname;

const packages = [
  {
    label: "@role-model-router/foldkit",
    manifestDir: path.resolve(here, ".."),
    vendoredDir: foldkitVendoredDir,
    assembleEntries: assembleFoldkitEntries,
    renderWrapperExports: renderFoldkitExports,
    expectedSubpaths: 37,
  },
  {
    label: "@role-model-router/foldkit-ui",
    manifestDir: path.resolve(here, "..", "..", "foldkit-ui"),
    vendoredDir: uiVendoredDir,
    assembleEntries: assembleUiEntries,
    renderWrapperExports: renderUiExports,
    expectedSubpaths: 30,
  },
  {
    label: "@role-model-router/effect-platform-browser",
    manifestDir: path.resolve(here, "..", "..", "effect-platform-browser"),
    vendoredDir: platformVendoredDir,
    assembleEntries: assemblePlatformEntries,
    renderWrapperExports: renderPlatformExports,
    expectedSubpaths: 18,
  },
];

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

/** All built `.js` files under `dist` (the generated declaration tree is not a runtime graph). */
async function builtJavaScriptFiles(root) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    assert.fail(
      `build output is missing under ${root}: run \`node build.mjs\` in the wrapper package before this test`,
    );
  }
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "types") continue;
      files.push(...(await builtJavaScriptFiles(entryPath)));
    } else if (entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  }
  return files;
}

/**
 * Blank out string, template and comment contents (keeping delimiters and newlines) so a
 * specifier-looking string inside a Foldkit warning message cannot be mistaken for an import.
 */
function maskNonCode(source) {
  const characters = source.split("");
  const blank = (index) => {
    if (characters[index] !== "\n") characters[index] = " ";
  };
  let index = 0;

  const skipString = (quote) => {
    index += 1;
    while (index < source.length) {
      const character = source[index];
      if (character === "\\") {
        blank(index);
        index += 1;
        if (index < source.length) blank(index);
        index += 1;
        continue;
      }
      if (character === quote) {
        index += 1;
        return;
      }
      blank(index);
      index += 1;
    }
  };

  const skipTemplate = () => {
    index += 1;
    while (index < source.length) {
      const character = source[index];
      if (character === "\\") {
        blank(index);
        index += 1;
        if (index < source.length) blank(index);
        index += 1;
        continue;
      }
      if (character === "`") {
        index += 1;
        return;
      }
      if (character === "$" && source[index + 1] === "{") {
        blank(index);
        blank(index + 1);
        index += 2;
        let depth = 1;
        while (index < source.length && depth > 0) {
          const inner = source[index];
          if (inner === "`") {
            skipTemplate();
            continue;
          }
          if (inner === '"' || inner === "'") {
            skipString(inner);
            continue;
          }
          if (inner === "{") depth += 1;
          if (inner === "}") {
            depth -= 1;
            blank(index);
            index += 1;
            continue;
          }
          blank(index);
          index += 1;
        }
        continue;
      }
      blank(index);
      index += 1;
    }
  };

  while (index < source.length) {
    const character = source[index];
    if (character === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") {
        blank(index);
        index += 1;
      }
      continue;
    }
    if (character === "/" && source[index + 1] === "*") {
      blank(index);
      blank(index + 1);
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
        blank(index);
        index += 1;
      }
      if (index < source.length) {
        blank(index);
        blank(index + 1);
        index += 2;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      skipString(character);
      continue;
    }
    if (character === "`") {
      skipTemplate();
      continue;
    }
    index += 1;
  }
  return characters.join("");
}

/** Read the JavaScript string literal whose opening quote is at `quoteIndex`. */
function readStringLiteral(source, quoteIndex) {
  const quote = source[quoteIndex];
  let index = quoteIndex + 1;
  let value = "";
  while (index < source.length) {
    const character = source[index];
    if (character === "\\") {
      value += source[index + 1] ?? "";
      index += 2;
      continue;
    }
    if (character === quote) return value;
    value += character;
    index += 1;
  }
  return undefined;
}

function firstQuoteBetween(masked, from, to) {
  for (let index = from; index < to; index += 1) {
    if (masked[index] === '"' || masked[index] === "'") return index;
  }
  return -1;
}

/**
 * Module specifiers of the built ESM file: static imports/re-exports, side-effect imports and
 * dynamic `import("...")`. Scanned on a masked copy so strings and comments cannot contribute.
 */
function importSpecifiers(source) {
  const masked = maskNonCode(source);
  const specifiers = new Set();
  const statementPattern = /(?:^|[;\n])[ \t]*(import|export)\b/g;

  const addStatementSpecifier = (start, end, statement, afterKeyword) => {
    const fromMatch = /\bfrom\b/.exec(statement);
    if (fromMatch === null && afterKeyword.startsWith(".")) return; // `import.meta`
    const quoteIndex =
      fromMatch === null
        ? firstQuoteBetween(masked, start + "import".length, end)
        : firstQuoteBetween(masked, start + fromMatch.index + fromMatch[0].length, end);
    if (quoteIndex === -1) return;
    const value = readStringLiteral(source, quoteIndex);
    if (value !== undefined) specifiers.add(value);
  };

  let match = statementPattern.exec(masked);
  while (match !== null) {
    const keyword = match[1];
    const start = match.index + match[0].indexOf(keyword);
    const statementEnd = masked.indexOf(";", start);
    const end = statementEnd === -1 ? masked.length : statementEnd;
    const statement = masked.slice(start, end);
    const afterKeyword = statement.slice(keyword.length);

    if (keyword === "import") {
      const trimmed = afterKeyword.replace(/^(?:\s+|\btype\b)+/, "");
      const isDynamic = trimmed.startsWith("(");
      addStatementSpecifier(start, end, isDynamic ? "" : statement, isDynamic ? "" : trimmed);
    } else {
      addStatementSpecifier(start, end, statement, "");
    }

    statementPattern.lastIndex = end;
    match = statementPattern.exec(masked);
  }
  return [...specifiers];
}

function nodeBuiltinViolationsFor(specifier) {
  if (specifier.startsWith("node:")) return true;
  if (specifier === "@effect/platform-node" || specifier.startsWith("@effect/platform-node/")) {
    return true;
  }
  // Only @effect/platform-browser is the browser platform package; every other
  // @effect/platform-* package is a Node (or otherwise host) platform package.
  return (
    specifier.startsWith("@effect/platform-") && !specifier.startsWith("@effect/platform-browser")
  );
}

for (const pkg of packages) {
  test(`${pkg.label}: built graph has no Node builtin or Node platform-package import`, async () => {
    const files = await builtJavaScriptFiles(path.join(pkg.manifestDir, "dist"));
    assert.ok(files.length > 0, `${pkg.label}: dist contains no built JavaScript`);

    const violations = [];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      for (const specifier of importSpecifiers(source)) {
        if (nodeBuiltinViolationsFor(specifier)) {
          violations.push(`${path.relative(pkg.manifestDir, file)} -> ${specifier}`);
        }
        assert.ok(
          !specifier.includes("vite-plugin-foldkit"),
          `${pkg.label}: vite-plugin-foldkit must not enter the browser graph (${file})`,
        );
        assert.ok(
          !specifier.includes("vendor/"),
          `${pkg.label}: a built file imports back into the vendored tree (${file} -> ${specifier})`,
        );
      }
    }
    assert.deepEqual(violations, [], `${pkg.label}: browser-graph violations`);
  });

  test(`${pkg.label}: effect is one shared external specifier`, async () => {
    const manifest = await readJson(path.join(pkg.manifestDir, "package.json"));
    assert.equal(
      manifest.peerDependencies?.effect !== undefined ||
        manifest.dependencies?.effect !== undefined,
      true,
      `${pkg.label}: effect must be declared as a peer/workspace dependency so it is never bundled`,
    );

    const files = await builtJavaScriptFiles(path.join(pkg.manifestDir, "dist"));
    const effectSpecifiers = new Set();
    for (const file of files) {
      const source = await readFile(file, "utf8");
      for (const specifier of importSpecifiers(source)) {
        if (specifier === "effect" || specifier.startsWith("effect/")) {
          effectSpecifiers.add(specifier);
        }
      }
    }
    assert.ok(effectSpecifiers.size > 0, `${pkg.label}: no effect import found in the built graph`);
    for (const specifier of effectSpecifiers) {
      assert.match(
        specifier,
        /^effect(\/[^"']+)?$/,
        `${pkg.label}: effect import "${specifier}" is not a shared bare specifier`,
      );
    }
  });

  test(`${pkg.label}: every vendored subpath has a wrapper export backed by a built file`, async () => {
    const { entries, bySubpath } = await pkg.assembleEntries({ packageDir: pkg.vendoredDir });
    const manifest = await readJson(path.join(pkg.manifestDir, "package.json"));

    assert.deepEqual(
      manifest.exports,
      pkg.renderWrapperExports(bySubpath),
      `${pkg.label}: package.json exports must be exactly the map derived from the vendored manifest`,
    );

    const subpaths = Object.keys(manifest.exports).filter(
      (subpath) => subpath !== "./package.json",
    );
    assert.equal(
      subpaths.length,
      pkg.expectedSubpaths,
      `${pkg.label}: wrapper surface size changed; vendored sources and wrapper exports disagree`,
    );

    for (const subpath of subpaths) {
      const wrapperExport = manifest.exports[subpath];
      assert.ok(wrapperExport !== undefined, `${pkg.label}: no wrapper export for "${subpath}"`);
      const target = typeof wrapperExport === "string" ? wrapperExport : wrapperExport.import;
      const targetFile = path.join(pkg.manifestDir, target);
      const targetStat = await stat(targetFile).catch(() => undefined);
      assert.ok(
        targetStat?.isFile() === true && targetStat.size > 0,
        `${pkg.label}: wrapper export "${subpath}" points at a missing/empty build file: ${target}`,
      );

      const key = subpath === "." ? "index" : subpath.slice(2);
      assert.ok(entries[key] !== undefined, `${pkg.label}: entry generation dropped "${subpath}"`);
      assert.ok(
        bySubpath.has(subpath),
        `${pkg.label}: "${subpath}" is not derived from vendored sources`,
      );
    }

    const typesDir = path.join(pkg.manifestDir, "dist", "types");
    assert.ok(
      (await stat(typesDir).catch(() => undefined))?.isDirectory() === true,
      `${pkg.label}: declaration output was not emitted`,
    );
  });
}

test("foldkit-ui reaches its framework peer through the first-party wrapper specifier", async () => {
  const foldkitFiles = await builtJavaScriptFiles(path.join(packages[0].manifestDir, "dist"));
  for (const file of foldkitFiles) {
    for (const specifier of importSpecifiers(await readFile(file, "utf8"))) {
      assert.ok(
        specifier !== "foldkit" && !specifier.startsWith("foldkit/"),
        `the foldkit wrapper must not import its vendored package name: ${specifier}`,
      );
    }
  }

  const uiFiles = await builtJavaScriptFiles(path.join(packages[1].manifestDir, "dist"));
  const peerSpecifiers = new Set();
  for (const file of uiFiles) {
    for (const specifier of importSpecifiers(await readFile(file, "utf8"))) {
      assert.ok(
        specifier !== "foldkit" && !specifier.startsWith("foldkit/"),
        `foldkit-ui still imports the vendored peer name: ${specifier}`,
      );
      if (specifier.startsWith("@role-model-router/foldkit")) peerSpecifiers.add(specifier);
    }
  }
  assert.ok(
    peerSpecifiers.size >= 5,
    `foldkit-ui must import @role-model-router/foldkit and its subpaths; saw ${JSON.stringify([...peerSpecifiers])}`,
  );
});

test("the foldkit browser-platform peer resolves to the workspace wrapper", async () => {
  const foldkitManifest = await readJson(path.join(packages[0].manifestDir, "package.json"));
  assert.equal(
    foldkitManifest.peerDependencies?.["@role-model-router/effect-platform-browser"],
    "workspace:*",
    "the foldkit peer must point at the first-party browser platform wrapper",
  );
  assert.equal(
    foldkitManifest.peerDependencies?.["@effect/platform-browser"],
    undefined,
    "the foldkit peer must no longer name the unbuilt @effect/platform-browser package",
  );

  const platformManifest = await readJson(path.join(packages[2].manifestDir, "package.json"));
  assert.equal(platformManifest.name, "@role-model-router/effect-platform-browser");
  assert.equal(platformManifest.version, "4.0.6");
  assert.equal(platformManifest.peerDependencies?.effect, "workspace:*");
  assert.equal(platformManifest.dependencies?.["@effect/platform-node"], undefined);
  assert.equal(platformManifest.dependencies?.["@effect/platform-node-shared"], undefined);

  const foldkitFiles = await builtJavaScriptFiles(path.join(packages[0].manifestDir, "dist"));
  const platformSpecifiers = new Set();
  for (const file of foldkitFiles) {
    for (const specifier of importSpecifiers(await readFile(file, "utf8"))) {
      assert.ok(
        specifier !== "@effect/platform-browser" &&
          !specifier.startsWith("@effect/platform-browser/"),
        `foldkit dist still imports the unbuilt peer: ${specifier}`,
      );
      if (specifier.startsWith("@role-model-router/effect-platform-browser")) {
        platformSpecifiers.add(specifier);
      }
    }
  }
  assert.ok(
    platformSpecifiers.size > 0,
    "foldkit dist must import @role-model-router/effect-platform-browser",
  );
});

test("wrapper subpath coverage is total and stable for every wrapper package", async () => {
  const counts = [];
  for (const pkg of packages) {
    const { bySubpath } = await pkg.assembleEntries({ packageDir: pkg.vendoredDir });
    assert.equal(bySubpath.size, pkg.expectedSubpaths, `${pkg.label}: subpath count drifted`);
    counts.push([pkg.label, bySubpath.size]);
  }
  assert.deepEqual(counts, [
    ["@role-model-router/foldkit", 37],
    ["@role-model-router/foldkit-ui", 30],
    ["@role-model-router/effect-platform-browser", 18],
  ]);
});

test("emitted declarations name the first-party wrappers, never the upstream packages", async () => {
  // Run 115 S14b: esbuild rewrites the RUNTIME specifiers, but tsc emits the declaration files
  // straight from the vendored sources, so a wrapper can ship .d.ts that import a package that is
  // not installed here. That is invisible at runtime and only shows up as a consumer typecheck
  // failure (an app had to carry a paths shim). Guard the emitted types too.
  const upstream = ["foldkit", "@foldkit/ui", "@effect/platform-browser"];
  const offenders = [];
  for (const pkg of packages) {
    const typesRoot = path.resolve(pkg.manifestDir ?? path.resolve(here, ".."), "dist/types");
    let entries = [];
    try {
      entries = await readdir(typesRoot, { recursive: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".d.ts")) continue;
      const file = path.join(typesRoot, entry);
      const source = maskNonCode(await readFile(file, "utf8"));
      for (const specifier of importSpecifiers(source)) {
        for (const name of upstream) {
          if (specifier === name || specifier.startsWith(name + "/")) {
            offenders.push(path.relative(here, file) + " -> " + specifier);
          }
        }
      }
    }
  }
  assert.deepEqual(offenders, [], "declarations must reference @role-model-router/*, not upstream names");
});

test("a published subpath whose source file is missing fails entry generation loudly", async () => {
  const missingExports = {
    ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
    "./missing": {
      types: "./dist/missing/public.d.ts",
      import: "./dist/missing/public.js",
    },
  };

  await assert.rejects(
    () => assembleFoldkitEntries({ packageDir: foldkitVendoredDir, exportsMap: missingExports }),
    (error) => {
      assert.match(String(error.message), /missing\/public\.ts/);
      assert.match(String(error.message), /published export/i);
      return true;
    },
  );

  await assert.rejects(
    () => assembleUiEntries({ packageDir: uiVendoredDir, exportsMap: missingExports }),
    (error) => {
      assert.match(String(error.message), /missing\/public\.ts/);
      return true;
    },
  );
});

test("an export target outside dist/ is refused instead of guessed", async () => {
  await assert.rejects(
    () =>
      assembleFoldkitEntries({
        packageDir: foldkitVendoredDir,
        exportsMap: { ".": { import: "./src/index.js" } },
      }),
    /does not resolve to a \.\/dist\//,
  );
});
