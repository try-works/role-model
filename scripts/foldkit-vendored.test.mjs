#!/usr/bin/env node
/**
 * Maintained pin proof for the vendored Foldkit source drop (`vendor/foldkit`).
 *
 * The pin is one reviewed decision expressed on several surfaces, so moving it is
 * only correct when every surface moves together:
 *   - `vendor/foldkit/VENDORED.json` upstream tag, commit and licence (what was acquired)
 *   - `vendor/foldkit/VENDORED.json` payload root and includes (what was copied)
 *   - the vendored `packages/<name>/package.json` name/version map (what was extracted)
 *   - `scripts/vendor-upstream.mjs` default tag and commit for `foldkit` (how it is re-acquired)
 *   - the content digest recomputed from the vendored bytes exactly as the tool computes it
 *
 * Payload note: the release line at this tag is 0.169.0 for `foldkit`, `@foldkit/ui` and
 * `@foldkit/devtools`; the repository ships auxiliary packages on independent versions
 * (vite plugin, markdown, oxlint plugin, scaffold, MCP server, node binding, website).
 * The full map is pinned so any of them drifting fails this test.
 *
 * Run with: `node --test scripts/foldkit-vendored.test.mjs`
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR_DIR = path.join(REPO_ROOT, "vendor", "foldkit");
const MANIFEST_FILES = ["VENDORED.json", "PROVENANCE.md"];

const EXPECTED_TAG = "foldkit@0.169.0";
const EXPECTED_COMMIT = "7ee214268c602967937b80f6f20d1e831f2e8ab6";
const EXPECTED_LICENSE_FRAGMENT = "MIT";
const EXPECTED_PAYLOAD_ROOT = "vendor/foldkit";
const EXPECTED_PAYLOAD_INCLUDES = ["packages/**", "LICENSE/**", "README.md"];

/** The release line for this tag, plus every auxiliary package shipped in the same tree. */
const EXPECTED_PACKAGE_VERSIONS = {
  "create-foldkit-app": "0.40.0",
  "@foldkit/devtools": "0.169.0",
  "@foldkit/devtools-mcp": "0.25.0",
  "@foldkit/examples-e2e": "0.0.0",
  foldkit: "0.169.0",
  "@foldkit/markdown": "0.14.4",
  "@foldkit/node": "0.1.0",
  "@foldkit/oxlint-plugin": "0.15.3",
  "@foldkit/ui": "0.169.0",
  "@foldkit/vite-plugin": "0.28.0",
  website: "0.1.0",
};
const RELEASE_LINE_PACKAGES = ["foldkit", "@foldkit/ui", "@foldkit/devtools"];

const manifest = () => JSON.parse(readFileSync(path.join(VENDOR_DIR, "VENDORED.json"), "utf8"));

/** The exact digest algorithm `scripts/vendor-upstream.mjs` uses: stable, path-ordered lines. */
function digestTree() {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        walk(full);
        continue;
      }
      if (entry.isFile() && !entry.name.endsWith(".tsbuildinfo")) files.push(full);
    }
  };
  walk(VENDOR_DIR);
  let bytes = 0;
  const lines = [];
  for (const file of files) {
    const relative = path.relative(VENDOR_DIR, file).split(path.sep).join("/");
    if (MANIFEST_FILES.includes(relative)) continue;
    const size = statSync(file).size;
    bytes += size;
    const digest = createHash("sha256").update(readFileSync(file)).digest("hex");
    lines.push(`${relative}\u0000${size}\u0000${digest}`);
  }
  lines.sort();
  return {
    fileCount: lines.length,
    byteCount: bytes,
    contentDigest: createHash("sha256").update(lines.join("\n")).digest("hex"),
  };
}

function listDirectories(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    out.push({ name: entry.name, relative: path.relative(VENDOR_DIR, path.join(dir, entry.name)).split(path.sep).join("/") });
    listDirectories(path.join(dir, entry.name), out);
  }
  return out;
}

test("VENDORED.json records the reviewed upstream tag, commit and licence", () => {
  const value = manifest();
  assert.equal(value.schemaVersion, "role-model.vendored-upstream.v1");
  assert.equal(value.upstream.name, "foldkit");
  assert.equal(value.upstream.url, "https://github.com/foldkit/foldkit");
  assert.equal(value.upstream.tag, EXPECTED_TAG);
  assert.equal(value.upstream.commit, EXPECTED_COMMIT);
  assert.match(value.upstream.license, new RegExp(EXPECTED_LICENSE_FRAGMENT));
  assert.equal(value.upstream.commitDate, "2026-10-20T23:38:00Z");
});

test("VENDORED.json records the reviewed payload root and includes", () => {
  const value = manifest();
  assert.equal(value.payload.root, EXPECTED_PAYLOAD_ROOT);
  assert.deepEqual(value.payload.includes, EXPECTED_PAYLOAD_INCLUDES);
});

test("the vendored packages report the reviewed release line", () => {
  const packagesDir = path.join(VENDOR_DIR, "packages");
  const versions = {};
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const packageJson = path.join(packagesDir, entry.name, "package.json");
    let value;
    try {
      value = JSON.parse(readFileSync(packageJson, "utf8"));
    } catch {
      continue; // a payload directory without a manifest (for example typing-game) is not versioned
    }
    versions[value.name] = value.version;
  }
  assert.deepEqual(versions, EXPECTED_PACKAGE_VERSIONS);
  for (const name of RELEASE_LINE_PACKAGES) {
    assert.equal(versions[name], "0.169.0", `${name} must report the 0.169.0 release line`);
  }
});

test("the content digest recomputed from the vendored bytes matches the manifest and is stable", () => {
  const first = digestTree();
  const second = digestTree();
  assert.deepEqual(first, second);
  const value = manifest();
  assert.equal(first.fileCount, value.fileCount);
  assert.equal(first.byteCount, value.byteCount);
  assert.equal(first.contentDigest, value.contentDigest);
});

test("the vendored tree carries no node_modules or .git directory", () => {
  const offLimit = listDirectories(VENDOR_DIR).filter((entry) => entry.name === "node_modules" || entry.name === ".git");
  assert.deepEqual(offLimit, []);
});

test("vendor-upstream.mjs defaults Foldkit to the reviewed tag and commit", () => {
  const source = readFileSync(path.join(REPO_ROOT, "scripts", "vendor-upstream.mjs"), "utf8");
  const start = source.indexOf("  foldkit: {");
  assert.ok(start !== -1, "UPSTREAMS.foldkit entry not found");
  const nextKey = source.indexOf("\n  },", start);
  const entry = source.slice(start, nextKey === -1 ? undefined : nextKey);
  assert.equal(entry.match(/url:\s*"([^"]+)"/)?.[1], "https://github.com/foldkit/foldkit");
  assert.equal(entry.match(/tag:\s*"([^"]+)"/)?.[1], EXPECTED_TAG);
  assert.equal(entry.match(/commit:\s*"([0-9a-f]{40})"/)?.[1], EXPECTED_COMMIT);
});
