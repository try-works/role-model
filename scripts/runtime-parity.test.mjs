import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
function invoke(args) {
  return spawnSync(process.execPath, ["--import", "tsx", "scripts/runtime-parity.mjs", ...args], { cwd: root, encoding: "utf8", timeout: 15000 });
}
test("request-only selfcheck executes controls without claiming browser parity", () => {
  const result = invoke(["--request-selfcheck"]);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, "PASSED");
  assert.equal(output.scope, "request-comparator-only");
  assert.equal(output.checks.length, 10);
  assert.ok(output.checks.every((check) => check.passed));
});
test("full React selfcheck is NOT RUN until actual captures are available", () => {
  const result = invoke(["--selfcheck"]);
  assert.equal(result.status, 2);
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, "NOT_RUN");
  assert.equal(output.scope, "browser-parity");
  // The harness reports the concrete reason it could not capture: the React capture runner may be
  // unavailable, or the machine may expose no browser at all. Both are honest NOT_RUN results.
  assert.ok(
    ["react-capture-runner-unavailable", "no-browser-available"].includes(output.reason),
    `unexpected browser-parity reason: ${String(output.reason)}`,
  );
});
test("unknown or combined modes fail without silently selecting fixture success", () => {
  for (const args of [[], ["--wat"], ["--request-selfcheck", "--selfcheck"]]) {
    const result = invoke(args);
    assert.equal(result.status, 1);
    assert.deepEqual(JSON.parse(result.stdout), { status: "FAILED", reason: "invalid-mode" });
  }
});
