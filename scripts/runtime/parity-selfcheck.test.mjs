import assert from "node:assert/strict";
import { test } from "node:test";

import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { isLoadedPayload } from "./parity-capture.mjs";
import {
  DEFAULT_TEMP_DRIVE,
  enforceTempRoot,
  evaluateMutationCheck,
  evaluateSelfcheck,
  exitCodeFor,
  launchChrome,
  main,
  partitionCaptureIssues,
  planTargets,
  resolveRequiredTempDrive,
  runMutationCheck,
  runSelfcheck,
  statusForCaptureError,
} from "./parity-selfcheck.mjs";

/**
 * S294 (R14): the selfcheck runner must prove React-vs-React 0 differences and run determinism, record the
 * dual-build comparison (React vs Foldkit, classified, never faked equal), and map to the existing JSON
 * contract/exit codes. These tests inject the capture; the real Chrome lane is the final GREEN.
 */

const target = (id, available = true) => ({
  id,
  label: `${id} build`,
  staticRoot: `/dist/${id}`,
  available,
});

const capture = (targetId, sha256, issues = [], ignoredIssues = []) => ({
  evidencePath: `/evidence/${targetId}-${sha256.slice(0, 8)}.png`,
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
  assert.equal(
    result.comparisons.reactVsFoldkit.equal,
    false,
    "a real difference must be reported as different",
  );
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
    runs: [
      [capture("react", sha, ["console: boom"]), capture("foldkit", sha)],
      [capture("react", sha), capture("foldkit", sha)],
    ],
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
  const result = evaluateSelfcheck({
    chromeAvailable: false,
    runs: [],
    targets: [target("react"), target("foldkit")],
  });
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
  assert.deepEqual(calls.map((call) => call.targetId).sort(), [
    "foldkit",
    "foldkit",
    "react",
    "react",
  ]);
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
  assert.equal(
    withoutFavicon.kept.length,
    1,
    "a 404 echo without a favicon line is still surfaced",
  );
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
  assert.equal(
    result.comparisons,
    null,
    "an invalid run shape has no meaningful comparison to report",
  );
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
    runs: [
      [capture("react", sha, [], [favicon]), capture("foldkit", sha)],
      [capture("react", sha, [], [favicon]), capture("foldkit", sha)],
    ],
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
    requiredTempDrive: path.parse(os.tmpdir()).root,
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

const CLASS_MUTATION = {
  file: "assets/root.css",
  from: "display:flex",
  selector: ".flex",
  to: "display:block",
};

test("S297 PASSED when the one-class mutant changes the capture and the unchanged pair is identical", () => {
  const result = evaluateMutationCheck({
    baselineShas: ["a".repeat(64), "a".repeat(64)],
    classMutation: CLASS_MUTATION,
    mutatedSha: "b".repeat(64),
  });
  assert.equal(result.status, "PASSED");
  assert.equal(result.mode, "mutation");
  assert.equal(exitCodeFor(result.status), 0);
  assert.equal(result.mutationCheck.applied, "one-class");
  assert.deepEqual(result.mutationCheck.classMutation, CLASS_MUTATION);
  assert.equal(result.mutationCheck.detected, true);
  assert.equal(result.mutationCheck.noFalseMutation, true);
  assert.equal(result.mutationCheck.baselineSha, "a".repeat(64));
  assert.equal(result.mutationCheck.mutatedSha, "b".repeat(64));
});

test("S297 FAILED when the mutant capture is identical to the baseline (blind harness)", () => {
  const result = evaluateMutationCheck({
    baselineShas: ["a".repeat(64), "a".repeat(64)],
    classMutation: CLASS_MUTATION,
    mutatedSha: "a".repeat(64),
  });
  assert.equal(result.status, "FAILED");
  assert.equal(exitCodeFor(result.status), 1);
  assert.match(String(result.reason), /mutation-not-detected/);
});

test("S297 FAILED when the harness reports detected:false although the shas differ", () => {
  const result = evaluateMutationCheck({
    baselineShas: ["a".repeat(64), "a".repeat(64)],
    classMutation: CLASS_MUTATION,
    mutatedSha: "b".repeat(64),
    reportedDetected: false,
  });
  assert.equal(result.status, "FAILED");
  assert.match(String(result.reason), /inconsistent-detection/);
});

test("S297 FAILED when the unchanged baseline pair itself differs", () => {
  const result = evaluateMutationCheck({
    baselineShas: ["a".repeat(64), "c".repeat(64)],
    classMutation: CLASS_MUTATION,
    mutatedSha: "b".repeat(64),
  });
  assert.equal(result.status, "FAILED");
  assert.match(String(result.reason), /nondeterministic/);
});

test("S297 FAILED on capture issues and NOT_RUN (exit 2) without a browser", () => {
  const failed = evaluateMutationCheck({
    baselineShas: ["a".repeat(64), "a".repeat(64)],
    classMutation: CLASS_MUTATION,
    issues: ["console: TypeError: boom"],
    mutatedSha: "b".repeat(64),
  });
  assert.equal(failed.status, "FAILED");
  assert.match(String(failed.reason), /capture-issues/);
  const notRun = evaluateMutationCheck({ chromeAvailable: false });
  assert.equal(notRun.status, "NOT_RUN");
  assert.equal(exitCodeFor(notRun.status), 2);
});

test("S297 runMutationCheck captures baseline twice and the mutant once via the adapter", async () => {
  const calls = [];
  const result = await runMutationCheck({
    capture: async (request) => {
      calls.push(request);
      if (request.kind === "mutated")
        return { classMutation: CLASS_MUTATION, sha256: "b".repeat(64) };
      return { sha256: "a".repeat(64) };
    },
    chromeAvailable: true,
    repoRoot: "/repo",
  });
  assert.equal(result.status, "PASSED");
  assert.equal(calls.filter((call) => call.kind === "baseline").length, 2);
  assert.equal(calls.filter((call) => call.kind === "mutated").length, 1);
  assert.equal(result.mutationCheck.detected, true);
});

test("S298 mutation JSON carries ignoredIssues/ignoredCount, baseline run identity and PNG evidence", () => {
  const faviconNet = "network: http://127.0.0.1:1/favicon.ico -> 404";
  const faviconEcho =
    "console: Failed to load resource: the server responded with a status of 404 (Not Found)";
  const result = evaluateMutationCheck({
    baselineCaptures: [
      {
        evidencePath: "/caps/baseline-run0.png",
        ignoredIssues: [faviconNet, faviconEcho],
        run: 0,
        sha256: "a".repeat(64),
      },
      {
        evidencePath: "/caps/baseline-run1.png",
        ignoredIssues: [],
        run: 1,
        sha256: "a".repeat(64),
      },
    ],
    classMutation: CLASS_MUTATION,
    mutatedCapture: {
      evidencePath: "/caps/mutated-run0.png",
      ignoredIssues: [faviconNet],
      run: 0,
      sha256: "b".repeat(64),
    },
  });
  assert.equal(result.status, "PASSED");
  assert.equal(result.ignoredCount, 3);
  assert.equal(result.targets.length, 1);
  const target = result.targets[0];
  assert.equal(target === undefined ? undefined : target.id, "react");
  assert.equal(target?.captures.length, 3);
  assert.equal(target?.captures[0]?.role, "baseline");
  assert.equal(target?.captures[0]?.run, 0);
  assert.equal(target?.captures[1]?.run, 1);
  assert.equal(target?.captures[2]?.role, "mutant");
  assert.deepEqual(target?.captures[0]?.ignoredIssues, [faviconNet, faviconEcho]);
  assert.deepEqual(target?.ignoredIssues, [faviconNet, faviconEcho, faviconNet]);
  assert.equal(target?.captures[0]?.evidencePath, "/caps/baseline-run0.png");
  assert.deepEqual(result.evidence.baseline, [
    "/caps/baseline-run0.png",
    "/caps/baseline-run1.png",
  ]);
  assert.equal(result.evidence.mutant, "/caps/mutated-run0.png");
});

test("S294 planTargets names the React and Foldkit static roots from the repo root", () => {
  const planned = planTargets({ repoRoot: "D:/repo" });
  assert.equal(planned.length, 2);
  assert.equal(planned[0]?.id, "react");
  assert.match(String(planned[0]?.staticRoot), /runtime-ui[\\/]build[\\/]client$/);
  assert.equal(planned[1]?.id, "foldkit");
  assert.match(String(planned[1]?.staticRoot), /runtime-ui-next[\\/]dist[\\/]client$/);
});

/** S342c (CI prerequisite): PARITY_SELFCHECK_TEMP_DRIVE override (default E:), empty env falls back. */
const withTempDriveEnv = async (values, run) => {
  const prior = {
    PARITY: process.env.PARITY_SELFCHECK_TEMP_DRIVE,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
  };
  if (values.PARITY === undefined) delete process.env.PARITY_SELFCHECK_TEMP_DRIVE;
  else process.env.PARITY_SELFCHECK_TEMP_DRIVE = values.PARITY;
  process.env.TMP = values.tmp;
  process.env.TEMP = values.tmp;
  try {
    return await run();
  } finally {
    if (prior.PARITY === undefined) delete process.env.PARITY_SELFCHECK_TEMP_DRIVE;
    else process.env.PARITY_SELFCHECK_TEMP_DRIVE = prior.PARITY;
    process.env.TMP = prior.TMP;
    process.env.TEMP = prior.TEMP;
  }
};

const driveOfPath = (targetPath) => {
  const root = path.parse(targetPath).root;
  return root.replace(/[\\/]+$/, "") || root;
};

test("S342c PARITY_SELFCHECK_TEMP_DRIVE selects the required drive for the selfcheck path", async () => {
  const tempDir = path.join(os.tmpdir(), "s342c-parity");
  mkdirSync(tempDir, { recursive: true });
  const result = await withTempDriveEnv({ PARITY: driveOfPath(os.tmpdir()), tmp: tempDir }, () =>
    main({ repoRoot: tempDir, targets: [] }),
  );
  assert.notEqual(result.status, "FAILED");
  assert.equal(result.reason?.includes("not on the required drive") ?? false, false);
});

test("S342c an unavailable PARITY_SELFCHECK_TEMP_DRIVE keeps the existing fail-fast", async () => {
  const tempDir = path.join(os.tmpdir(), "s342c-parity");
  mkdirSync(tempDir, { recursive: true });
  const otherDrive = driveOfPath(os.tmpdir()).toUpperCase() === "Z:" ? "Y:" : "Z:";
  const result = await withTempDriveEnv({ PARITY: otherDrive, tmp: tempDir }, () =>
    main({ repoRoot: tempDir, targets: [] }),
  );
  assert.equal(result.status, "FAILED");
  assert.equal(result.exitCode, 1);
  assert.match(String(result.reason), new RegExp(`not on the required drive ${otherDrive}`));
});

test("S343c an EMPTY PARITY_SELFCHECK_TEMP_DRIVE still applies the default E: guard", async () => {
  assert.equal(DEFAULT_TEMP_DRIVE, "E:");
  assert.equal(resolveRequiredTempDrive(""), "E:");
  assert.equal(resolveRequiredTempDrive("   "), "E:");
  assert.equal(resolveRequiredTempDrive(" z: "), "z:");
  const tempDir = path.join(os.tmpdir(), "s342c-parity");
  mkdirSync(tempDir, { recursive: true });
  if (driveOfPath(os.tmpdir()) !== "E:") {
    const result = await withTempDriveEnv({ PARITY: "", tmp: tempDir }, () =>
      main({ repoRoot: tempDir, targets: [] }),
    );
    assert.equal(result.status, "FAILED");
    assert.match(String(result.reason), /not on the required drive E:/);
  }
});

test("S342c the default required drive stays E: when the env override is absent", async () => {
  assert.equal(DEFAULT_TEMP_DRIVE, "E:");
  const tempDir = path.join(os.tmpdir(), "s342c-parity");
  mkdirSync(tempDir, { recursive: true });
  if (driveOfPath(os.tmpdir()) !== "E:") {
    const result = await withTempDriveEnv({ PARITY: undefined, tmp: tempDir }, () =>
      main({ repoRoot: tempDir, targets: [] }),
    );
    assert.equal(result.status, "FAILED");
    assert.match(String(result.reason), /not on the required drive E:/);
  } else {
    assert.equal(resolveRequiredTempDrive(undefined), "E:");
  }
});

/**
 * S616 (R14 rendered wave): the capture must not fire on a loading shell. react-run0 was a 5852-byte
 * loading capture while run1 was 84738 bytes, which the lane honestly reported as "nondeterministic:
 * react". The loaded gate below is the fix: a page below the minimum visible content is NOT loaded, and a
 * not-loaded capture must map to NOT_RUN (exit 2), never a FAILED pseudo-capture or a fake pass.
 */
test("S616: the loaded gate rejects a loading shell and accepts a loaded page", () => {
  assert.equal(
    isLoadedPayload({ hasMain: false, textLength: 60 }, 200),
    false,
    "a shell without main is not loaded",
  );
  assert.equal(
    isLoadedPayload({ hasMain: true, textLength: 120 }, 200),
    false,
    "a short loading panel is not loaded",
  );
  assert.equal(
    isLoadedPayload({ hasMain: true, textLength: 2148 }, 200),
    true,
    "the rendered overview page is loaded",
  );
  assert.equal(
    isLoadedPayload({ hasMain: true, textLength: 200 }, 200),
    true,
    "the boundary is inclusive",
  );
  assert.equal(isLoadedPayload(undefined, 200), false, "a missing payload is not loaded");
});

test("S616: a not-loaded capture maps to NOT_RUN, other capture failures stay FAILED", () => {
  const notLoaded = statusForCaptureError({
    code: "capture_not_loaded",
    message: "page content did not reach the loaded gate",
  });
  assert.equal(notLoaded.status, "NOT_RUN");
  assert.equal(notLoaded.exitCode, 2);
  assert.match(notLoaded.reason, /capture-not-loaded/);

  const timeout = statusForCaptureError({
    code: "capture_timeout",
    message: "navigation did not complete",
  });
  assert.equal(timeout.status, "FAILED");
  assert.equal(timeout.exitCode, 1);
  assert.match(timeout.reason, /capture-failed/);
});
