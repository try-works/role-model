import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

/**
 * S205: a referenced design token that is never defined is silently invalid.
 *
 * `var(--rm-accent)` was referenced by three controls while `--rm-accent` was only defined in the
 * stylesheet, and `focus-visible:ring-*` produced no paint at all (S203). Both were invisible
 * failures with valid-looking source. This checks the static half: every `var(--rm-*)` the port
 * uses must be defined in the shared theme CSS.
 */
const appDir = path.join(import.meta.dirname, "..");
const view = await readFile(path.join(appDir, "src", "view.ts"), "utf8");
const theme = await readFile(path.join(appDir, "..", "runtime-ui", "app", "app.css"), "utf8");

test("S205: every --rm token referenced by the port is defined", () => {
  const referenced = [...new Set([...view.matchAll(/var\((--rm-[a-z0-9-]+)\)/g)].map((match) => match[1]))].sort();
  assert.ok(referenced.length > 5, "the port still references design tokens");
  const undefinedTokens = referenced.filter((name) => !theme.includes(name + ":"));
  assert.deepEqual(undefinedTokens, [], "undefined design tokens render as invalid CSS");
});

test("S205: the port does not rely on ring utilities, which do not compose on these elements", () => {
  assert.equal(view.includes("focus-visible:ring-"), false, "use an explicit outline for focus");
});
