import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { staticRootIdentity } from "./runtime/ui-identity.mjs";

/** S239: the identity comparison the packaged gate depends on, tested with two directories. */
const makeRoot = (files) => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ui-identity-"));
  for (const [name, contents] of Object.entries(files)) {
    const full = path.join(root, name);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, contents);
  }
  return root;
};

test("S239: identical trees report no differences", () => {
  const files = { "assets/main.js": "console.log(1)", "index.html": "<html></html>" };
  const left = makeRoot(files);
  const right = makeRoot(files);
  try {
    assert.deepEqual(staticRootIdentity({ packageClient: right, staticRoot: left }).differences, []);
  } finally {
    rmSync(left, { force: true, recursive: true });
    rmSync(right, { force: true, recursive: true });
  }
});

test("S239: one changed byte is reported by name", () => {
  const left = makeRoot({ "assets/main.js": "console.log(1)", "index.html": "<html></html>" });
  const right = makeRoot({ "assets/main.js": "console.log(2)", "index.html": "<html></html>" });
  try {
    assert.deepEqual(staticRootIdentity({ packageClient: right, staticRoot: left }).differences, ["assets/main.js differs"]);
  } finally {
    rmSync(left, { force: true, recursive: true });
    rmSync(right, { force: true, recursive: true });
  }
});

test("S239: an extra file on either side is a difference", () => {
  const left = makeRoot({ "assets/main.js": "x" });
  const right = makeRoot({ "assets/main.js": "x", "assets/extra.css": "y" });
  try {
    assert.deepEqual(staticRootIdentity({ packageClient: right, staticRoot: left }).differences, ["file lists differ"]);
  } finally {
    rmSync(left, { force: true, recursive: true });
    rmSync(right, { force: true, recursive: true });
  }
});
