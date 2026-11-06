import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { assembleEntries, renderWrapperExports, vendoredPackageDir } from "../entries.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WRAPPER = path.resolve(HERE, "..");
const REPO_ROOT = path.resolve(WRAPPER, "..", "..", "..");
const VENDORED_FOLDKIT = path.join(REPO_ROOT, "vendor", "foldkit");
const DIST = path.join(WRAPPER, "dist");
const manifest = JSON.parse(readFileSync(path.join(WRAPPER, "package.json"), "utf8"));

function builtFiles(root) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "types") out.push(...builtFiles(full));
    } else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

const { entries, bySubpath } = await assembleEntries({ packageDir: vendoredPackageDir });

// One independent test per upstream published entry.
for (const [subpath, sourceFile] of [...bySubpath.entries()].sort()) {
  test(`publishes ${subpath} with a built import and declaration`, async () => {
    assert.ok(existsSync(sourceFile), `${subpath} source is missing: ${sourceFile}`);
    const exportEntry = manifest.exports[subpath];
    assert.ok(exportEntry, `wrapper package.json has no export for ${subpath}`);
    const importPath = path.join(WRAPPER, exportEntry.import.replace(/^\.\//, ""));
    const typePath = path.join(WRAPPER, exportEntry.types.replace(/^\.\//, ""));
    assert.ok(existsSync(importPath), `${subpath} built import is missing: ${importPath}`);
    assert.ok(existsSync(typePath), `${subpath} declaration is missing: ${typePath}`);
    const namespace = await import(pathToFileURL(importPath).href);
    assert.ok(Object.keys(namespace).length > 0, `${subpath} built entry exports no names`);
  });
}

test("the wrapper exports map is exactly the derived entry surface", () => {
  assert.deepEqual(manifest.exports, renderWrapperExports(bySubpath));
  assert.equal(bySubpath.size, 30);
  assert.equal(Object.keys(entries).length, 30);
});

test("the built wrapper graph is browser-safe and excludes the Vite plugin", () => {
  const files = builtFiles(DIST);
  assert.ok(files.length > 0, "foldkit-ui dist is missing; run node build.mjs");
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /from\s+["']node:/, `${path.relative(DIST, file)} imports a Node builtin`);
    assert.doesNotMatch(source, /@foldkit\/vite-plugin|vite-plugin-foldkit/, `${path.relative(DIST, file)} imports the Vite plugin`);
  }
  assert.equal(Object.keys(manifest.exports).some((key) => key.includes("vite")), false);
});

test("@foldkit/oxlint-plugin is pinned at 0.15.3 and vendored with the UI payload", () => {
  const pluginManifestPath = path.join(VENDORED_FOLDKIT, "packages", "oxlint-plugin-foldkit", "package.json");
  assert.ok(existsSync(pluginManifestPath), "vendored oxlint plugin package is missing");
  const plugin = JSON.parse(readFileSync(pluginManifestPath, "utf8"));
  assert.equal(plugin.version, "0.15.3");
  const provenance = readFileSync(path.join(VENDORED_FOLDKIT, "PROVENANCE.md"), "utf8");
  assert.match(provenance, /@foldkit\/oxlint-plugin/);
  assert.match(provenance, /0\.169\.0/);
});

test("the packaged wrapper closure receipt covers every entry and the packaged client", () => {
  const receiptPath = path.join(
    REPO_ROOT,
    ".recursive/run/115-effect-foldkit-runtime-migration/evidence/logs/r6-packaged-wrapper-closure.json",
  );
  assert.ok(
    existsSync(receiptPath),
    `missing packaged wrapper closure receipt: ${receiptPath}. Run the packaged build and scripts/generate-r6-closure-receipt.mjs.`,
  );
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  assert.equal(receipt.entries.length, 30);
  assert.equal(receipt.packagedClient.assetCount > 0, true);
  for (const entry of receipt.entries) {
    assert.ok(entry.subpath && entry.importSha256 && entry.typesSha256, entry.subpath);
    assert.match(entry.importSha256, /^[a-f0-9]{64}$/);
    assert.match(entry.typesSha256, /^[a-f0-9]{64}$/);
  }
});
