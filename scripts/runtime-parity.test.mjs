import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
function invoke(args, env = {}) {
  return spawnSync(process.execPath, ["--import", "tsx", "scripts/runtime-parity.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 15000,
  });
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
test("full React selfcheck is NOT RUN until actual captures are available", async () => {
  // Call the runner with an explicit missing browser instead of spawning the CLI: CI images may ship a
  // Chromium build, and this test asserts the honest NOT_RUN verdict for a machine with no browser,
  // not parity between captures.
  const { main } = await import("./runtime/parity-selfcheck.mjs");
  // CI exports PARITY_SELFCHECK_TEMP_DRIVE for the Windows lanes; on a Linux runner that guard would
  // mask the no-browser verdict, so unset it for this call and restore it immediately after.
  const previousTempDrive = process.env.PARITY_SELFCHECK_TEMP_DRIVE;
  delete process.env.PARITY_SELFCHECK_TEMP_DRIVE;
  let result;
  try {
    result = await main({
      chromePath: join(root, "__no-browser-installed-for-selfcheck-test__"),
    });
  } finally {
    if (previousTempDrive !== undefined)
      process.env.PARITY_SELFCHECK_TEMP_DRIVE = previousTempDrive;
  }
  assert.equal(result.exitCode, 2, JSON.stringify(result));
  assert.equal(result.status, "NOT_RUN");
  assert.equal(result.scope, "browser-parity");
  // The harness reports the concrete reason it could not capture: the React capture runner may be
  // unavailable, or the machine may expose no browser at all. Both are honest NOT_RUN results.
  assert.ok(
    ["react-capture-runner-unavailable", "no-browser-available"].includes(result.reason),
    `unexpected browser-parity reason: ${String(result.reason)}`,
  );
});
test("unknown or combined modes fail without silently selecting fixture success", () => {
  for (const args of [[], ["--wat"], ["--request-selfcheck", "--selfcheck"]]) {
    const result = invoke(args);
    assert.equal(result.status, 1);
    assert.deepEqual(JSON.parse(result.stdout), { status: "FAILED", reason: "invalid-mode" });
  }
});
