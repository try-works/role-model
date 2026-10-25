#!/usr/bin/env node
/**
 * Maintained pin test for the vendored Effect v4 source drop (`vendor/effect`).
 *
 * The pin is one reviewed decision expressed on five surfaces, so moving it is
 * only correct when every surface moves together:
 *   - `vendor/effect/VENDORED.json` upstream tag and commit (what was acquired)
 *   - `vendor/effect/packages/effect/package.json` version (what was extracted)
 *   - `role-model-router/packages/effect/package.json` version (workspace wrapper)
 *   - `scripts/vendor-upstream.mjs` default tag and commit (how it is re-acquired)
 *
 * Run with: `node --test scripts/vendor-upstream.test.mjs`
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const EXPECTED_TAG = "effect@4.0.6";
const EXPECTED_COMMIT = "3b28bf686bf26e9700edd39c025aff2744dc5303";
const EXPECTED_VERSION = "4.0.6";

const readJson = (relativePath) =>
  JSON.parse(readFileSync(path.join(REPO_ROOT, relativePath), "utf8"));

test("VENDORED.json records the reviewed upstream tag", () => {
  assert.equal(readJson("vendor/effect/VENDORED.json").upstream.tag, EXPECTED_TAG);
});

test("VENDORED.json records the reviewed upstream commit", () => {
  assert.equal(readJson("vendor/effect/VENDORED.json").upstream.commit, EXPECTED_COMMIT);
});

test("the vendored upstream effect package reports the pinned version", () => {
  assert.equal(readJson("vendor/effect/packages/effect/package.json").version, EXPECTED_VERSION);
});

test("the workspace Effect wrapper reports the pinned version", () => {
  assert.equal(readJson("role-model-router/packages/effect/package.json").version, EXPECTED_VERSION);
});

test("vendor-upstream.mjs defaults Effect to the reviewed tag and commit", () => {
  const source = readFileSync(path.join(REPO_ROOT, "scripts/vendor-upstream.mjs"), "utf8");
  const start = source.indexOf("  effect: {");
  const end = source.indexOf('"effect-mq": {', start);
  assert.ok(start !== -1 && end > start, "UPSTREAMS.effect entry not found");
  const entry = source.slice(start, end);
  assert.equal(entry.match(/tag:\s*"([^"]+)"/)?.[1], EXPECTED_TAG);
  assert.equal(entry.match(/commit:\s*"([0-9a-f]{40})"/)?.[1], EXPECTED_COMMIT);
});
