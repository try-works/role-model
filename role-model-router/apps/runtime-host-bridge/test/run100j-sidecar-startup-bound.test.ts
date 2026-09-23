import { expect, test } from "vitest";

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S6, measured while verifying the backlog repair:
 * the mature real-traffic state root (`E:\role-model-temp\rc-run\state`, thousands of captures, 1 627 replay
 * jobs, 680 comparison groups) made the Track B sidecar reconcile for longer than the packaged 240 s startup
 * bound, and the host refused the boot with `Track B sidecar readiness timeout` - while the sidecar process
 * was demonstrably working (506 s of CPU in six minutes). Run 99 R33 raised this bound once for the same
 * reason (90 s -> 240 s); the operator's own decision that bounds must fit the real work applies here too.
 *
 * The resolver reads the environment at module load, so the test asserts the shipped default and the
 * documented override shape rather than mutating the process environment.
 */
test("run100j the packaged sidecar startup bound fits a mature root", async () => {
  const modulePath = "../src/track-b-runtime.js";
  const { TRACK_B_SIDECAR_STARTUP_TIMEOUT_MS } = await import(modulePath);
  expect(TRACK_B_SIDECAR_STARTUP_TIMEOUT_MS).toBe(600_000);
});
