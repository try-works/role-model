#!/usr/bin/env node
/**
 * Tamper proof and stability checks for the vendored-source digest helpers.
 *
 * The CLI (`node scripts/vendor-upstream.mjs --name <name> --verify`) is the
 * production guard, but mutating `vendor/**` to prove it fails is not allowed.
 * These checks exercise the exported helpers against a temporary directory,
 * and they deliberately contain no second digest implementation: the helpers in
 * `scripts/vendor-upstream.mjs` are the only algorithm.
 *
 * Run with: `node --test scripts/vendor-verify.test.mjs`
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { computeVendorDigest, verifyVendorDigest } from "../scripts/vendor-upstream.mjs";

test("digest helpers are stable, reject a one-byte change, and detect added files", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "role-model-vendor-verify-"));
  try {
    mkdirSync(path.join(directory, "nested"));
    writeFileSync(path.join(directory, "a.txt"), "alpha\n");
    writeFileSync(path.join(directory, "nested", "b.txt"), "beta\n");

    const first = computeVendorDigest(directory);
    const second = computeVendorDigest(directory);
    assert.deepEqual(first, second);
    assert.match(first.contentDigest, /^[0-9a-f]{64}$/u);
    assert.equal(first.fileCount, 2);
    assert.equal(verifyVendorDigest(directory, first).ok, true);

    // Flip one byte ("beta" -> "betA"): the size and file count stay identical, the digest does not.
    writeFileSync(path.join(directory, "nested", "b.txt"), "betA\n");
    const tampered = computeVendorDigest(directory);
    assert.equal(tampered.fileCount, first.fileCount);
    assert.notEqual(tampered.contentDigest, first.contentDigest);
    assert.equal(verifyVendorDigest(directory, first).ok, false);

    // Adding a file changes both the file count and the digest.
    const afterAdd = (() => {
      writeFileSync(path.join(directory, "c.txt"), "gamma\n");
      return computeVendorDigest(directory);
    })();
    assert.notEqual(afterAdd.fileCount, tampered.fileCount);
    assert.notEqual(afterAdd.contentDigest, tampered.contentDigest);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
