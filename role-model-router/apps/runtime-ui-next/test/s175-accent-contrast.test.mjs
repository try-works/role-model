import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

/**
 * S175: an accent-background control must use the accent ink, not `text-white`.
 *
 * Found by looking at the running shell, not by a test: the Studio "Run" button rendered as an
 * empty white box because the dark theme defines --rm-accent as #ffffff, so white text on a white
 * fill was invisible. DOM assertions over text content cannot see that; this invariant can.
 */
const source = await readFile(path.join(import.meta.dirname, "..", "src", "view.ts"), "utf8");

test("S175: no accent-filled control uses text-white", () => {
  const classStrings = [...source.matchAll(/Class\("([^"]*)"\)/g)].map((match) => match[1]);
  const offenders = classStrings.filter(
    (value) => value.includes("bg-[var(--rm-accent)]") && value.includes("text-white"),
  );
  assert.deepEqual(offenders, [], "use text-[var(--rm-on-primary)] on an accent fill");
});

test("S175: accent fills pair with the accent ink token", () => {
  const classStrings = [...source.matchAll(/Class\("([^"]*)"\)/g)].map((match) => match[1]);
  const accentFills = classStrings.filter((value) => value.includes("bg-[var(--rm-accent)]"));
  assert.ok(accentFills.length > 0, "the shell still has accent-filled controls");
  for (const value of accentFills) {
    assert.match(value, /text-\[var\(--rm-on-primary\)\]/, "accent fill without the ink token: " + value);
  }
});
