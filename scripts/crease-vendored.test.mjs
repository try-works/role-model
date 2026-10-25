#!/usr/bin/env node
/**
 * Maintained pin proof for the vendored Crease UI source drop (`vendor/crease`).
 *
 * Crease has no tag/branch at the reviewed commit, so acquisition is commit-only. This test pins
 * every surface that must move together when the pin moves:
 *   - `vendor/crease/VENDORED.json` upstream commit/date/licence and the commit-only tag marker
 *   - the payload root and includes (what was copied)
 *   - `scripts/vendor-upstream.mjs` UPSTREAMS.crease url/commit and refMode: "commit"
 *   - the content digest recomputed from the vendored bytes exactly as the tool computes it
 *
 * The refMode assertion is deliberate: a future edit that turns this into a tag pin without a commit
 * ref would otherwise pass a naive commit-only check while losing the acquisition mode.
 *
 * Run with: `node --test scripts/crease-vendored.test.mjs`
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR_DIR = path.join(REPO_ROOT, "vendor", "crease");
const MANIFEST_FILES = ["VENDORED.json", "PROVENANCE.md"];

const EXPECTED_URL = "https://github.com/Potti1234/creaseui";
const EXPECTED_COMMIT = "bb447e363e9c717bf11ebb10b2259f053bff6f71";
const EXPECTED_COMMIT_DATE = "2026-10-22T00:20:36+02:00";
const EXPECTED_TAG_MARKER =
  "(commit-only pin: the repository advertises no tag or branch at this commit)";
const EXPECTED_LICENSE_FRAGMENT = "MIT";
const EXPECTED_PAYLOAD_ROOT = "vendor/crease";
const EXPECTED_PAYLOAD_INCLUDES = ["src/**", "LICENSE/**", "compatibility.json"];
const EXPECTED_FILE_COUNT = 1512;
const EXPECTED_BYTE_COUNT = 13981911;
const EXPECTED_CONTENT_DIGEST = "e37e001fd8ba4a9f2f4e530ea391ca288472251d3a0b6b4450e55e6b666c6bed";

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
    out.push({ name: entry.name, relative: path.relative(VENDOR_DIR, path.join(dir, entry.name)) });
    listDirectories(path.join(dir, entry.name), out);
  }
  return out;
}

test("VENDORED.json records the reviewed commit, date, licence and commit-only marker", () => {
  const value = manifest();
  assert.equal(value.schemaVersion, "role-model.vendored-upstream.v1");
  assert.equal(value.upstream.name, "crease");
  assert.equal(value.upstream.url, EXPECTED_URL);
  assert.equal(value.upstream.commit, EXPECTED_COMMIT);
  assert.equal(value.upstream.commitDate, EXPECTED_COMMIT_DATE);
  assert.equal(value.upstream.tag, EXPECTED_TAG_MARKER);
  assert.match(value.upstream.license, new RegExp(EXPECTED_LICENSE_FRAGMENT));
});

test("VENDORED.json records the reviewed payload root and includes", () => {
  const value = manifest();
  assert.equal(value.payload.root, EXPECTED_PAYLOAD_ROOT);
  assert.deepEqual(value.payload.includes, EXPECTED_PAYLOAD_INCLUDES);
});

test("the vendored payload carries the reviewed chart sources, licence and compatibility file", () => {
  for (const relative of [
    "src/ui/chart.ts",
    "src/lib/echarts.ts",
    "LICENSE",
    "compatibility.json",
  ]) {
    assert.ok(
      existsSync(path.join(VENDOR_DIR, ...relative.split("/"))),
      `missing payload file: ${relative}`,
    );
  }
  const licence = readFileSync(path.join(VENDOR_DIR, "LICENSE"), "utf8");
  assert.match(licence, /MIT License/u);
  const compatibility = JSON.parse(
    readFileSync(path.join(VENDOR_DIR, "compatibility.json"), "utf8"),
  );
  assert.equal(typeof compatibility.creaseui, "string");
  assert.equal(typeof compatibility.effect, "string");
});

test("the content digest recomputed from the vendored bytes matches the manifest and is stable", () => {
  const first = digestTree();
  const second = digestTree();
  assert.deepEqual(first, second);
  const value = manifest();
  assert.equal(first.fileCount, EXPECTED_FILE_COUNT);
  assert.equal(first.fileCount, value.fileCount);
  assert.equal(first.byteCount, EXPECTED_BYTE_COUNT);
  assert.equal(first.byteCount, value.byteCount);
  assert.equal(first.contentDigest, EXPECTED_CONTENT_DIGEST);
  assert.equal(first.contentDigest, value.contentDigest);
});

test("the vendored tree carries no node_modules or .git directory", () => {
  const offLimit = listDirectories(VENDOR_DIR).filter(
    (entry) => entry.name === "node_modules" || entry.name === ".git",
  );
  assert.deepEqual(offLimit, []);
});

test("vendor-upstream.mjs declares the reviewed commit and the commit-only acquisition mode", () => {
  const source = readFileSync(path.join(REPO_ROOT, "scripts", "vendor-upstream.mjs"), "utf8");
  const start = source.indexOf("  crease: {");
  assert.ok(start !== -1, "UPSTREAMS.crease entry not found");
  const nextKey = source.indexOf("\n  },", start);
  const entry = source.slice(start, nextKey === -1 ? undefined : nextKey);
  assert.equal(entry.match(/url:\s*"([^"]+)"/)?.[1], EXPECTED_URL);
  assert.equal(entry.match(/commit:\s*"([0-9a-f]{40})"/)?.[1], EXPECTED_COMMIT);
  assert.equal(entry.match(/refMode:\s*"([^"]+)"/)?.[1], "commit");
});
