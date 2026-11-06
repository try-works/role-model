import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

/**
 * S177: the Overview filter selects must be named by their field label.
 *
 * They sit inside `<label>` elements, so the computed accessible name was the WHOLE label -
 * "BREAKDOWN All Endpoint Model Provider" - because the option text is part of the label content.
 * A screen reader announced every option as the control name. `aria-label` fixes it; this test
 * keeps it fixed.
 */
const source = await readFile(path.join(import.meta.dirname, "..", "src", "view.ts"), "utf8");

test("S177: the filter select carries an aria-label", () => {
  const markerAt = source.indexOf('h.DataAttribute("overview-filter", filter)');
  assert.ok(markerAt > 0, "the filter select is still built in one place");
  // The Foldkit port wraps the attributes over several lines. Check the select's own
  // attribute block, not one arbitrary source line, or a correct multi-line control reads as missing.
  const selectBlock = source.slice(
    source.lastIndexOf("h.select(", markerAt),
    source.indexOf("options.map", markerAt),
  );
  assert.match(selectBlock, /h\.AriaLabel\(label\)/, "the select must be named by its field label");
  // S199: presence alone is vacuous - an empty label would pass it.
  assert.equal(selectBlock.includes('h.AriaLabel("")'), false, "an empty aria-label is not a name");
});

test("S177: no select is added without a name in the port", () => {
  const tags = [...source.matchAll(/h\.select\(\s*\[([\s\S]*?)\]\s*,/g)].map((match) => match[1]);
  assert.ok(tags.length > 0, "the port still builds selects");
  for (const tag of tags) {
    assert.match(
      tag,
      /h\.AriaLabel\(/,
      `a select without an aria-label inherits its whole label content: ${tag.slice(0, 80)}`,
    );
  }
});
