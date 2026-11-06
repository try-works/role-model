import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

/**
 * S207: the Studio model default must come from the host catalogue.
 *
 * `studioIdle()` hardcodes "moonshot/kimi-k2.5". On a host without that model the first request
 * returns 400 no_eligible_target, which is what a fresh installation does. The fix needs BOTH
 * halves: request the catalogue on the Studio route, and prefer it over the hardcoded id.
 */
const dir = path.join(import.meta.dirname, "..", "src");
const init = await readFile(path.join(dir, "init.ts"), "utf8");
const view = await readFile(path.join(dir, "view.ts"), "utf8");
const update = await readFile(path.join(dir, "update.ts"), "utf8");

test("S207: the Studio route requests the configured model catalogue", () => {
  const studioBranch = init.slice(
    init.indexOf('route._tag === "Studio"'),
    init.indexOf('route._tag === "Learning"'),
  );
  assert.match(
    studioBranch,
    /readReadback\(\{ key: "configuredModels"/,
    "the catalogue readback is route-scoped; Studio must ask for it",
  );
});

test("S207: the Studio form prefers a catalogue model over the hardcoded default", () => {
  assert.match(
    view,
    /configuredModels\.includes\(state\.model\)/,
    "the field must fall back to a served model",
  );
  assert.equal(
    view.includes('studioField("Model", "model", state.model, h)'),
    false,
    "no field may use the raw default",
  );
});

test("S207: a Studio run sends a model the host serves", () => {
  assert.match(update, /catalogue\.includes\(current\.model\)/, "the run must check the catalogue");
  assert.match(
    update,
    /model: modelForRequest/,
    "the substituted model must reach the request state",
  );
});
