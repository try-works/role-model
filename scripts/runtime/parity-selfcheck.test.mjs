import assert from "node:assert/strict";
import { test } from "node:test";

import os from "node:os";

import {
  enforceTempRoot,
  evaluateSelfcheck,
  exitCodeFor,
  launchChrome,
  main,
  partitionCaptureIssues,
  planTargets,
  runSelfcheck,
} from "./parity-selfcheck.mjs";

/**
 * S294 (R14): the selfcheck runner must prove React-vs-React 0 differences and run determinism, record the
 * dual-build comparison (React vs Foldkit, classified, never faked equal), and map to the existing JSON
 * contract/exit codes. These tests inject the capture; the real Chrome lane is the final GREEN.
 */

const target = (id, available = true) => ({
  id,
  label: id + " build",
  staticRoot: "/dist/" + id,
  available,
});

const capture = (targetId, sha256, issues = [], ignoredIssues = []) => ({
  evidencePath: "/evidence/" + targetId + "-" + sha256.slice(0, 8) + ".png",
  ignoredIssues,
  issues,
  sha256,
  targetId,
});

const runsOf = (reactShas, foldkitShas) => [
  [capture("react", reactShas[0]), capture("foldkit", foldkitShas[0])],
  [capture("react", reactShas[1]), capture("foldkit", foldkitShas[1])],
];

test("S294 PASSED when both builds are deterministic, clean and the dual comparison is recorded", () => {
  const sha = "a".repeat(64);
  const fold = "b".repeat(64);
  const result = evaluateSelfcheck({
    chromeAvailable: true,
    runs: runsOf([sha, sha], [fold, fold]),
    targets: [target("react"), target("foldkit")],
  });
  assert.equal(result.status, "PASSED");
  assert.equal(result.scope, "browser-parity");
  assert.equal(exitCodeFor(result.status), 0);
  assert.equal(result.targets.find((entry) => entry.id === "react")?.sha256, sha);
  assert.equal(result.targets.find((entry) => entry.id === "foldkit")?.sha256, fold);
  assert.equal(result.comparisons.reactVsReact.equal, true);
  assert.equal(result.comparisons.reactVsFoldkit.equal, false, "a real difference must be reported as different");
  assert.equal(result.comparisons.reactVsFoldkit.classification, "different");
});

test("S294 a React-vs-Foldkit difference is classified, never forced equal", () => {
  const result = evaluateSelfcheck({
    chromeAvailable: true,
    runs: runsOf(["a".repeat(64), "a".repeat(64)], ["c".repeat(64), "c".repeat(64)]),
    targets: [target("react"), target("foldkit")],
  });
  assert.equal(result.status, "PASSED");
  assert.equal(result.comparisons.reactVsFoldkit.equal, false);
  assert.equal(result.comparisons.reactVsFoldkit.classification, "different");
});

test("S294 FAILED when a build is nondeterministic across the two runs", () => {
  const result = evaluateSelfcheck({
    chromeAvailable: true,
    runs: runsOf(["a".repeat(64), "d".repeat(64)], ["b".repeat(64), "b".repeat(64)]),
    targets: [target("react"), target("foldkit")],
  });
  assert.equal(result.status, "FAILED");
  assert.equal(exitCodeFor(result.status), 1);
  assert.match(String(result.reason), /nondeterministic/);
});

test("S294 FAILED when a capture surfaces console or network issues", () => {
  const sha = "a".repeat(64);
  const result = evaluateSelfcheck({
    chromeAvailable: true,
    runs: [[capture("react", sha, ["console: boom"]), capture("foldkit", sha)], [capture("react", sha), capture("foldkit", sha)]],
    targets: [target("react"), target("foldkit")],
  });
  assert.equal(result.status, "FAILED");
  assert.match(String(result.reason), /capture-issues/);
});

test("S294 FAILED (not NOT_RUN) when a build target is unavailable", () => {
  const sha = "a".repeat(64);
  const result = evaluateSelfcheck({
    chromeAvailable: true,
    runs: runsOf([sha, sha], [sha, sha]),
    targets: [target("react", false), target("foldkit")],
  });
  assert.equal(result.status, "FAILED");
  assert.match(String(result.reason), /target-unavailable/);
});

test("S294 NOT_RUN with exit 2 only when no browser is available", () => {
  const result = evaluateSelfcheck({ chromeAvailable: false, runs: [], targets: [target("react"), target("foldkit")] });
  assert.equal(result.status, "NOT_RUN");
  assert.equal(result.reason, "no-browser-available");
  assert.equal(exitCodeFor(result.status), 2);
});

test("S294 runSelfcheck captures every target twice (two runs) and evaluates the result", async () => {
  const calls = [];
  const result = await runSelfcheck({
    capture: async ({ run, target: entry }) => {
      calls.push({ run, targetId: entry.id });
      return capture(entry.id, "e".repeat(64));
    },
    chromeAvailable: true,
    repoRoot: "/repo",
    targets: [target("react"), target("foldkit")],
  });
  assert.equal(result.status, "PASSED");
  assert.equal(calls.length, 4);
  assert.deepEqual(calls.map((call) => call.run).sort(), [0, 0, 1, 1]);
  assert.deepEqual(calls.map((call) => call.targetId).sort(), ["foldkit", "foldkit", "react", "react"]);
});

test("S294 partitions favicon harness noise out of the capture issues while recording it", () => {
  const partitioned = partitionCaptureIssues([
    "console: Failed to load resource: the server responded with a status of 404 (Not Found)",
    "network: http://127.0.0.1:1/favicon.ico -> 404",
    "console: TypeError: boom",
  ]);
  assert.deepEqual(partitioned.kept, ["console: TypeError: boom"]);
  assert.deepEqual(partitioned.ignored, [
    "console: Failed to load resource: the server responded with a status of 404 (Not Found)",
    "network: http://127.0.0.1:1/favicon.ico -> 404",
  ]);
  const withoutFavicon = partitionCaptureIssues([
    "console: Failed to load resource: the server responded with a status of 404 (Not Found)",
  ]);
  assert.equal(withoutFavicon.kept.length, 1, "a 404 echo without a favicon line is still surfaced");
});

test("S295 FAILED when a target has fewer than exactly two captures", () => {
  const sha = "a".repeat(64);
  const result = evaluateSelfcheck({
    chromeAvailable: true,
    runs: [[capture("react", sha), capture("foldkit", sha)], [capture("foldkit", sha)]],
    targets: [target("react"), target("foldkit")],
  });
  assert.equal(result.status, "FAILED");
  assert.match(String(result.reason), /capture-count/);
  assert.equal(result.comparisons, null, "an invalid run shape has no meaningful comparison to report");
});

test("S295 FAILED when a target entry is missing from the plan", () => {
  const sha = "a".repeat(64);
  const result = evaluateSelfcheck({
    chromeAvailable: true,
    runs: runsOf([sha, sha], [sha, sha]),
    targets: [target("react")],
  });
  assert.equal(result.status, "FAILED");
  assert.match(String(result.reason), /target-missing/);
});

test("S295 emits per-target ignoredIssues and an ignored count in the JSON", () => {
  const sha = "a".repeat(64);
  const favicon = "network: http://127.0.0.1:1/favicon.ico -> 404";
  const result = evaluateSelfcheck({
    chromeAvailable: true,
    runs: [[capture("react", sha, [], [favicon]), capture("foldkit", sha)], [capture("react", sha, [], [favicon]), capture("foldkit", sha)]],
    targets: [target("react"), target("foldkit")],
  });
  const react = result.targets.find((entry) => entry.id === "react");
  assert.deepEqual(react?.ignoredIssues, [favicon, favicon]);
  assert.equal(result.ignoredCount, 2);
});

test("S295 emits comparisons on the FAILED path and computes reactVsReact from the two react shas", () => {
  const result = evaluateSelfcheck({
    chromeAvailable: true,
    runs: runsOf(["a".repeat(64), "d".repeat(64)], ["b".repeat(64), "b".repeat(64)]),
    targets: [target("react"), target("foldkit")],
  });
  assert.equal(result.status, "FAILED");
  assert.equal(result.comparisons.reactVsReact.equal, false);
  assert.deepEqual(result.comparisons.reactVsReact.shas, ["a".repeat(64), "d".repeat(64)]);
  assert.equal(result.comparisons.reactVsFoldkit.equal, false);
});

test("S295 evidence.targets lists both run PNGs per target and echoes executable/temp roots", () => {
  const sha = "a".repeat(64);
  const executable = { path: "/exe", sha256: "e".repeat(64), version: "0.0.20-231-gd61c32dc" };
  const result = evaluateSelfcheck({
    chromeAvailable: true,
    chromeUserDataRoot: "E:/rm-tmp/s294-chrome-x",
    executable,
    runs: runsOf([sha, sha], [sha, sha]),
    targets: [target("react"), target("foldkit")],
    tempRoot: "E:/rm-tmp",
  });
  const react = result.evidence.targets.find((entry) => entry.id === "react");
  assert.equal(react?.pngs.length, 2);
  assert.equal(result.executable.version, "0.0.20-231-gd61c32dc");
  assert.equal(result.tempRoot, "E:/rm-tmp");
  assert.equal(result.chromeUserDataRoot, "E:/rm-tmp/s294-chrome-x");
});

test("S295 runSelfcheck contains a capture failure as a FAILED JSON result, not a rejection", async () => {
  const result = await runSelfcheck({
    capture: async () => {
      throw new Error("capture boom");
    },
    chromeAvailable: true,
    repoRoot: "/repo",
    targets: [target("react"), target("foldkit")],
  });
  assert.equal(result.status, "FAILED");
  assert.match(String(result.reason), /capture-failed: capture boom/);
  assert.equal(result.exitCode, 1);
});

test("S295 r2 FAILED unless there are exactly two runs and one capture per target per run", () => {
  const sha = "a".repeat(64);
  const mismatchedRuns = evaluateSelfcheck({
    chromeAvailable: true,
    runs: [
      [capture("react", sha), capture("react", sha)],
      [capture("foldkit", sha), capture("foldkit", sha)],
    ],
    targets: [target("react"), target("foldkit")],
  });
  assert.equal(mismatchedRuns.status, "FAILED");
  assert.match(String(mismatchedRuns.reason), /capture-count|run-shape/);
  const missingSecondRun = evaluateSelfcheck({
    chromeAvailable: true,
    runs: [[capture("react", sha), capture("foldkit", sha)]],
    targets: [target("react"), target("foldkit")],
  });
  assert.equal(missingSecondRun.status, "FAILED");
  assert.match(String(missingSecondRun.reason), /run-count/);
});

test("S295 r2 enforces the required temp drive (E: passes, another drive fails)", () => {
  const wrongDrive = enforceTempRoot({ requiredDrive: "Z:", tempRoot: "E:/rm-tmp" });
  assert.equal(wrongDrive.ok, false);
  assert.match(String(wrongDrive.reason), /temp-root/);
  assert.equal(enforceTempRoot({ requiredDrive: "E:", tempRoot: "E:/rm-tmp" }).ok, true);
});

test("S295 r2 launchChrome kills its child when the DevTools endpoint never appears", async () => {
  const fakeChild = {
    exitCode: null,
    killed: false,
    kill() {
      this.killed = true;
    },
    on() {},
    stderr: { on() {} },
  };
  const spawned = [];
  await assert.rejects(
    launchChrome({
      chromePath: "fake-chrome",
      endpointTimeoutMs: 200,
      onSpawn: (child) => spawned.push(child),
      spawnImpl: () => fakeChild,
      userDataDir: "E:/rm-tmp/s294-test-chrome",
    }),
  );
  assert.equal(spawned.length, 1, "the child handle must be tracked before the endpoint await");
  assert.equal(fakeChild.killed, true, "a launch failure must kill the child");
});

test("S295 r2 main emits FAILED JSON when the injected launch rejects (no uncaught rejection)", async () => {
  const result = await main({
    chromePath: process.execPath,
    evidenceDir: "E:/rm-tmp/s294-test-evidence",
    executablePath: process.execPath,
    launchChromeImpl: async () => {
      throw new Error("launch boom");
    },
    requiredTempDrive: "E:",
    targets: [target("react"), target("foldkit")],
  });
  assert.equal(result.status, "FAILED");
  assert.match(String(result.reason), /runner-failure: launch boom/);
  assert.equal(result.exitCode, 1);
  // Separator-agnostic: the JSON must record the actual os.tmpdir() root, whether TMP was given with
  // forward or backslashes (os.tmpdir() returns the ambient value unchanged on Windows).
  assert.equal(result.tempRoot, os.tmpdir());
});

test("S295 r3 launchChrome rejects a spawn error and kills the child (no orphan, no uncaught error)", async () => {
  const listeners = new Map();
  const child = {
    exitCode: null,
    killed: false,
    kill() {
      this.killed = true;
    },
    on(type, listener) {
      listeners.set(type, listener);
    },
    stderr: { on() {} },
  };
  const promise = launchChrome({
    chromePath: "missing-chrome",
    endpointTimeoutMs: 5000,
    spawnImpl: () => child,
    userDataDir: "E:/rm-tmp/s294-test-chrome",
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  const errorListener = listeners.get("error");
  assert.ok(errorListener !== undefined, "a child error listener must be attached");
  errorListener(new Error("spawn ENOENT"));
  await assert.rejects(promise, /spawn ENOENT/);
  assert.equal(child.killed, true, "a spawn error must kill the child");
});

test("S294 planTargets names the React and Foldkit static roots from the repo root", () => {
  const planned = planTargets({ repoRoot: "D:/repo" });
  assert.equal(planned.length, 2);
  assert.equal(planned[0]?.id, "react");
  assert.match(String(planned[0]?.staticRoot), /runtime-ui[\\/]build[\\/]client$/);
  assert.equal(planned[1]?.id, "foldkit");
  assert.match(String(planned[1]?.staticRoot), /runtime-ui-next[\\/]dist[\\/]client$/);
});
