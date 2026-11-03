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
  // S258 coverage repair: retain pointer/idle and tab -> real client integration.
  "s46a-studio.test.ts": 4,
  "s73a-controller.test.ts": 1,
  // S258: restore invalid-save no-PUT integration; scene states alone are not equivalent.
  "s76a-runtime-config.test.ts": 8,
  // S584: exercise the real Save routing strategy button through the wired posture handler.
  "s584-router-posture-wiring.test.ts": 1,
  // S589: exercise the real Save local policy button through the wired policy handler.
  "s589-local-policy-wired.test.ts": 1,
  // S591: three weight-editor save paths (valid, clamped, rejected) through the wired save button.
  "s591-router-weights-editor.test.ts": 3,
  // S595: Save retention, dry-run, execute, learning mode update, and rollback through real controls.
  "s595-storage-retention.test.ts": 5,
  // S619: scope-wide rollback, engage kill switch, release kill switch through the wired LearningPacks controls.
  "s619-learning-controls.test.ts": 3,
  // S620: expand Task detail through the rendered role catalog control.
  "s620-roles-parity.test.ts": 1,
  // task-109: Day->Week range switch to prove the metrics re-read window in s628.
  "s628-charts-data-binding.test.ts": 1
};

/** S247 policy: every budgeted click site names the user path it proves. */
const RATIONALE = {
  "diagnostics.test.ts": "diagnostics refresh control",
  "mount.test.ts": "shell mount interaction",
  "routes.test.ts": "route navigation interaction",
  "s25b-refresh-owner-gap.test.ts": "refresh-owner gap control",
  "s26b-wave1.test.ts": "wave-1 controls",
  "s26k-control.test.ts": "control page action",
  "s40b-overview.test.ts": "overview interaction",
  "s46a-studio.test.ts": "studio run controls",
  "s73a-controller.test.ts": "controller selection",
  "s76a-runtime-config.test.ts": "config editor save/confirm controls",
  "s584-router-posture-wiring.test.ts": "Save routing strategy (decision_only)",
  "s589-local-policy-wired.test.ts": "Save local policy (ttl 900)",
  "s591-router-weights-editor.test.ts": "Save routing strategy from three weight drafts",
  "s595-storage-retention.test.ts": "Save retention, dry-run, execute, mode update, rollback",
  "s619-learning-controls.test.ts": "Scope-wide pack rollback with operator token; engage then release the learning kill switch",
  "s620-roles-parity.test.ts": "Expand Task detail in the role catalog",
  "s628-charts-data-binding.test.ts": "Week-range metrics re-read assertion on Requests and ObserveRouting volume charts"
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

test("S247: every recorded budget entry names the user path it exercises", () => {
  const missing = Object.keys(BUDGET).filter((file) => (RATIONALE[file] ?? "").trim().length === 0);
  assert.deepEqual(missing, [], "record the purpose of the click site in RATIONALE");
});
