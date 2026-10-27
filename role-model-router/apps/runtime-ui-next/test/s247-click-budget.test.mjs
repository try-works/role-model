import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

/**
 * S247: a ratchet on synthetic DOM clicks in the app-shell tests.
 *
 * The plan (S247) replaces `element.click()` with Foldkit scene/story steps because a synthetic click has to
 * reach a handler through happy-dom - the mechanism that produced the S217 crash and the "dispatches 0"
 * symptom. Converting 30 call sites at once would be a blind rewrite, so this test records a budget: a file
 * may keep or reduce its count, and adding a click site fails until the budget is lowered deliberately.
 */
const BUDGET = {
  "diagnostics.test.ts": 1,
  "mount.test.ts": 1,
  "routes.test.ts": 1,
  "s25b-refresh-owner-gap.test.ts": 1,
  "s26b-wave1.test.ts": 3,
  "s26k-control.test.ts": 1,
  "s40b-overview.test.ts": 1,
  "s46a-studio.test.ts": 3,
  "s73a-controller.test.ts": 1,
  "s76a-runtime-config.test.ts": 9
};

const testDirectory = path.join(import.meta.dirname);

const countClicks = async () => {
  const counts = {};
  for (const file of (await readdir(testDirectory)).filter((name) => name.endsWith(".test.ts"))) {
    const source = await readFile(path.join(testDirectory, file), "utf8");
    // Strip comments first: a doc comment that mentions element.click() is documentation, not a click.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
    const clicks = (code.match(/\.click\(\)/g) ?? []).length;
    if (clicks > 0) counts[file] = clicks;
  }
  return counts;
};

test("S247: no test may exceed its recorded synthetic-click budget", async () => {
  const counts = await countClicks();
  const over = Object.entries(counts).filter(([file, n]) => n > (BUDGET[file] ?? 0));
  assert.deepEqual(over, [], "lower the site count with a scene/story conversion instead of adding clicks");
});

test("S247: every file with clicks is recorded in the budget", async () => {
  const counts = await countClicks();
  const unrecorded = Object.keys(counts).filter((file) => BUDGET[file] === undefined);
  assert.deepEqual(unrecorded, [], "record a new click site in BUDGET with its justification");
});

test("S247: the total click count does not grow", async () => {
  const counts = await countClicks();
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const budgetTotal = Object.values(BUDGET).reduce((sum, n) => sum + n, 0);
  assert.ok(total <= budgetTotal, "synthetic clicks " + String(total) + " > budget " + String(budgetTotal));
});
