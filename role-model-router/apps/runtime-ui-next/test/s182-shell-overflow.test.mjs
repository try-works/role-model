import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

/**
 * S182: the shell main column must not be `w-full` next to a left margin.
 *
 * `ml-3 w-full` makes the column 100% of the row PLUS 12px of margin, so the page scrolled
 * horizontally at EVERY width - 1440, 800 and 390. The rendered audit only noticed because it
 * measured scrollWidth against clientWidth; no behavioural test could see it.
 */
const source = await readFile(path.join(import.meta.dirname, "..", "src", "view.ts"), "utf8");

test("S182: the shell main column is a shrinking flex item, not w-full", () => {
  const mainClass = source
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.includes('h.Class("flex min-h-0 min-w-0 flex-1 flex-col bg-background")'));
  assert.ok(mainClass, "the main column class is still in one place");
  assert.match(mainClass, /min-w-0/, "a flex child needs min-w-0 to be allowed to shrink");
  assert.match(mainClass, /flex-1/);
  assert.doesNotMatch(mainClass, /\bw-full\b/, "w-full plus a margin overflows the row");
});
