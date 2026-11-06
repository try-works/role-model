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
  assert.match(source, /h\.a\(\s*\[\s*h\.Href\("#main-content"\)/, "the skip link exists");
  assert.match(source, /"Skip to content"/);
  assert.match(source, /h\.Id\("main-content"\)/, "the target exists");
});

/** Index of the bracket that closes the first array opened at or after `start`. */
function firstArrayClose(start) {
  const open = source.indexOf("[", start);
  if (open < 0) return -1;
  let depth = 0;
  let quote = null;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote !== null) {
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

test("S181: the skip link is a child of the shell, not one of its attributes", () => {
  const shellStart = source.indexOf(
    'h.Class("flex h-screen w-full overflow-hidden bg-background text-foreground")',
  );
  assert.ok(shellStart > 0, "the shell div is still built as expected");
  // The shell div is h.div(<attributes>, <children>). The anchor must appear after the attribute
  // array closes, i.e. inside the children array. Scan brackets instead of matching one indentation.
  const shellDivAt = source.lastIndexOf("h.div(", shellStart);
  const attributeClose = firstArrayClose(shellDivAt);
  const anchorAt = source.indexOf('h.Href("#main-content")', shellStart);
  assert.ok(attributeClose > shellDivAt, "the shell still has an attributes array");
  assert.ok(
    anchorAt > attributeClose,
    "the skip link must be a CHILD of the shell, not an attribute",
  );
});
