import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

const EVIDENCE = path.join(REPO_ROOT, ".recursive/run/115-effect-foldkit-runtime-migration/evidence/logs");
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

function validatePackagedReceipt(receipt) {
  assert.match(receipt.publicCommit, /^[a-f0-9]{40}$/);
  assert.match(receipt.publicSourceTree, /^[a-f0-9]{40}$/);
  assert.ok(/^[a-f0-9]{64}$/.test(receipt.executableSha256), "missing executableSha256");
  assert.ok(path.isAbsolute(receipt.releaseRoot), "releaseRoot must be absolute");
  assert.equal(
    path.resolve(receipt.releaseManifestPath),
    path.join(receipt.releaseRoot, "manifest.json"),
    "releaseRoot is foreign to the recorded release manifest",
  );
  const evidenceManifest = path.join(EVIDENCE, receipt.evidence.releaseManifestPath);
  const evidenceBundle = path.join(EVIDENCE, receipt.evidence.clientBundlePath);
  const evidenceExeSha = path.join(EVIDENCE, receipt.evidence.executableSha256Path);
  for (const file of [evidenceManifest, evidenceBundle, evidenceExeSha]) {
    assert.ok(existsSync(file), `packaged receipt evidence missing: ${file}`);
  }
  const manifest = JSON.parse(readFileSync(evidenceManifest, "utf8"));
  assert.equal(sha256(evidenceManifest), receipt.releaseManifestSha256);
  assert.equal(sha256(evidenceManifest), receipt.evidence.releaseManifestSha256);
  assert.equal(manifest.commit, receipt.publicCommit);
  assert.equal(manifest.source_tree, receipt.publicSourceTree);
  assert.equal(manifest.executable_sha256, receipt.executableSha256);
  assert.equal(sha256(evidenceBundle), receipt.clientBundleSha256);
  assert.equal(sha256(evidenceBundle), receipt.evidence.clientBundleSha256);
  assert.match(readFileSync(evidenceExeSha, "utf8"), new RegExp(`^\\s*${receipt.executableSha256}\\b`));
  assert.equal(receipt.clientBundleIdentifiesWrapper, true, "packaged bundle does not identify the wrapper");
  assert.equal(receipt.wrapperMarker, "foldkit-ui");
  assert.equal(receipt.entries.length, 30);
  const wrapperManifest = JSON.parse(readFileSync(path.join(WRAPPER, "package.json"), "utf8"));
  for (const entry of receipt.entries) {
    assert.match(entry.importSha256, /^[a-f0-9]{64}$/);
    assert.match(entry.typesSha256, /^[a-f0-9]{64}$/);
    const target = wrapperManifest.exports[entry.subpath];
    assert.ok(target, `receipt names unknown subpath ${entry.subpath}`);
    assert.equal(
      sha256(path.join(WRAPPER, target.import.replace(/^\.\//, ""))),
      entry.importSha256,
      `${entry.subpath} import hash does not match the local wrapper`,
    );
    assert.equal(
      sha256(path.join(WRAPPER, target.types.replace(/^\.\//, ""))),
      entry.typesSha256,
      `${entry.subpath} types hash does not match the local wrapper`,
    );
  }
  return receipt;
}

test("the packaged wrapper closure receipt is generated from and verified against the packaged release", () => {
  const receiptPath = path.join(EVIDENCE, "r6-packaged-wrapper-closure.json");
  assert.ok(existsSync(receiptPath), "missing packaged wrapper closure receipt");
  const receipt = validatePackagedReceipt(JSON.parse(readFileSync(receiptPath, "utf8")));
  assert.equal(receipt.entries.length, 30);
});

test("a receipt with a foreign releaseRoot is rejected", () => {
  const receipt = JSON.parse(readFileSync(path.join(EVIDENCE, "r6-packaged-wrapper-closure.json"), "utf8"));
  assert.throws(
    () => validatePackagedReceipt({ ...receipt, releaseRoot: "D:/foreign/release" }),
    /releaseRoot is foreign/,
  );
});

test("a receipt with a missing executable hash is rejected", () => {
  const receipt = JSON.parse(readFileSync(path.join(EVIDENCE, "r6-packaged-wrapper-closure.json"), "utf8"));
  assert.throws(
    () => validatePackagedReceipt({ ...receipt, executableSha256: "" }),
    /executableSha256/,
  );
});
