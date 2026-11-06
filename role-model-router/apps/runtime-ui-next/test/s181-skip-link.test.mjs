import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

/**
 * S181: the shell needs a bypass block, and it must be a CHILD of the shell div.
 *
 * The sidebar repeats on every route, so a keyboard user needs to jump past it (WCAG 2.4.1).
 * My first attempt put the anchor in the shell div ATTRIBUTE array; Foldkit treated it as an
 * attribute builder and the running app crashed with "handler is not a function" - the build passed
 * and only loading the page showed it.
 */
const source = await readFile(path.join(import.meta.dirname, "..", "src", "view.ts"), "utf8");

test("S181: the shell offers a skip link to main content", () => {
  assert.match(source, /h\.a\(\[h\.Href\("#main-content"\)/, "the skip link exists");
  assert.match(source, /"Skip to content"/);
  assert.match(source, /h\.Id\("main-content"\)/, "the target exists");
});

test("S181: the skip link is a child of the shell, not one of its attributes", () => {
  const shellStart = source.indexOf(
    'h.Class("flex h-screen w-full overflow-hidden bg-background text-foreground")',
  );
  assert.ok(shellStart > 0, "the shell div is still built as expected");
  // The shell div is h.div(<attributes>, <children>). The anchor must appear after the attribute
  // array closes, i.e. inside the children array.
  const childrenStart = source.indexOf("\n    [\n", shellStart);
  const anchorAt = source.indexOf('h.a([h.Href("#main-content")', shellStart);
  assert.ok(childrenStart > 0, "the shell still has an attributes array followed by children");
  assert.ok(
    anchorAt > childrenStart,
    "the skip link must be a CHILD of the shell, not an attribute",
  );
});
