import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { PARITY_CAPTURE_DEFAULTS, captureIssues, captureParityScreenshot } from "./parity-capture.mjs";

/**
 * S294/S295 (R14): real React capture / determinism / dual-build selfcheck.
 *
 * Builds ON the committed S282 primitive (semantics untouched). Each target (React build, Foldkit build) is
 * served by the packaged dev executable with the SAME fixture root (testdata/router-runtime/fixtures) and is
 * captured twice in two fresh browser contexts (react-vs-react 0 differences) and in two identical full runs
 * (determinism). A React-vs-Foldkit difference is recorded and classified as "different" - never forced equal.
 */

export const SCENARIO_ROUTE = "/";
export const REACT_TARGET = "react";
export const FOLDKIT_TARGET = "foldkit";
export const DEFAULT_RUN_COUNT = 2;

export const planTargets = ({ repoRoot }) => [
  {
    id: REACT_TARGET,
    label: "React build",
    staticRoot: path.join(repoRoot, "role-model-router", "apps", "runtime-ui", "build", "client"),
  },
  {
    id: FOLDKIT_TARGET,
    label: "Foldkit build",
    staticRoot: path.join(repoRoot, "role-model-router", "apps", "runtime-ui-next", "dist", "client"),
  },
];

export const resolveTargets = ({ exists = existsSync, repoRoot }) =>
  planTargets({ repoRoot }).map((target) => ({ ...target, available: exists(target.staticRoot) }));

export const exitCodeFor = (status) => (status === "PASSED" ? 0 : status === "FAILED" ? 1 : 2);

export const DEFAULT_TEMP_DRIVE = "E:";

/** S295 r2: the temp root must be on the required drive; the required drive is overridable for tests. */
export const enforceTempRoot = ({ requiredDrive = DEFAULT_TEMP_DRIVE, tempRoot = os.tmpdir() } = {}) => {
  const drive = String(requiredDrive).toUpperCase().replace(/[\\/]$/, "");
  const root = path.parse(tempRoot).root.toUpperCase();
  return root.startsWith(drive)
    ? { ok: true, requiredDrive, tempRoot }
    : { ok: false, reason: "temp-root: " + tempRoot + " is not on the required drive " + requiredDrive, requiredDrive, tempRoot };
};

/**
 * Fixture-backed servers may 404 /favicon.ico. That is serving-harness noise, not a capture determinism or
 * parity difference; it is partitioned out AND recorded (never silently dropped).
 */
export const IGNORED_CAPTURE_ISSUES = [/favicon\.ico/i];

const FAVICON_CONSOLE_ECHO =
  /^console: Failed to load resource: the server responded with a status of 404 \(Not Found\)$/;

export const partitionCaptureIssues = (issues) => {
  const kept = [];
  const ignored = [];
  const faviconSeen = issues.some((issue) => IGNORED_CAPTURE_ISSUES.some((pattern) => pattern.test(issue)));
  for (const issue of issues) {
    const isFavicon = IGNORED_CAPTURE_ISSUES.some((pattern) => pattern.test(issue));
    if (isFavicon || (faviconSeen && FAVICON_CONSOLE_ECHO.test(issue))) ignored.push(issue);
    else kept.push(issue);
  }
  return { ignored, kept };
};

export const hashFile = (filePath) => new Promise((resolve, reject) => {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);
  stream.on("data", (chunk) => hash.update(chunk));
  stream.on("error", reject);
  stream.on("end", () => resolve(hash.digest("hex")));
});

/** Reads the manifest beside the executable; a missing/invalid manifest keeps version undefined (honest). */
export const readManifestVersion = (manifestPath) => {
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (parsed === null || parsed === undefined) return undefined;
    const version = parsed.version;
    return version === null || version === undefined ? undefined : String(version);
  } catch {
    return undefined;
  }
};

/** Bounded reason text for an unknown thrown value (no runtime type narrowing). */
const reasonFrom = (error) => {
  const text = String(error);
  return text.startsWith("Error: ") ? text.slice("Error: ".length) : text;
};

export const resolveExecutableIdentity = async ({ executablePath }) => ({
  path: executablePath,
  sha256: await hashFile(executablePath),
  version: readManifestVersion(path.join(path.dirname(executablePath), "manifest.json")),
});

const captureOf = (runs, targetId) => {
  const captures = [];
  for (const run of runs) {
    for (const capture of run) {
      if (capture.targetId === targetId) captures.push(capture);
    }
  }
  return captures;
};

const buildComparisons = (perTarget) => {
  const react = perTarget.find((entry) => entry.id === REACT_TARGET);
  const foldkit = perTarget.find((entry) => entry.id === FOLDKIT_TARGET);
  const reactShas = react === undefined ? [] : react.shas;
  const reactSha = reactShas[0];
  const foldkitSha = foldkit === undefined ? undefined : foldkit.shas[0];
  const equal = reactSha !== undefined && foldkitSha !== undefined && reactSha === foldkitSha;
  return {
    reactVsFoldkit: {
      classification: equal ? "identical" : "different",
      equal,
      foldkitSha256: foldkitSha,
      reactSha256: reactSha,
    },
    reactVsReact: {
      equal: reactShas.length === DEFAULT_RUN_COUNT && reactShas.every((sha) => sha === reactSha),
      sha256: reactSha,
      shas: reactShas,
    },
  };
};

export const evaluateSelfcheck = ({ chromeAvailable, chromeUserDataRoot, executable, runs, targets, tempRoot }) => {
  const base = { chromeUserDataRoot, executable, scope: "browser-parity", tempRoot };
  if (!chromeAvailable) {
    return { ...base, reason: "no-browser-available", status: "NOT_RUN" };
  }
  if (runs.length !== DEFAULT_RUN_COUNT) {
    return { ...base, comparisons: null, reason: "run-count: " + String(runs.length), status: "FAILED", targets };
  }
  const incompleteRuns = [];
  for (let runIndex = 0; runIndex < runs.length; runIndex += 1) {
    for (const target of targets) {
      if (!target.available) continue;
      const count = runs[runIndex].filter((capture) => capture.targetId === target.id).length;
      if (count !== 1) incompleteRuns.push(target.id + "[" + String(runIndex) + "]=" + String(count));
    }
  }
  if (incompleteRuns.length > 0) {
    return { ...base, comparisons: null, reason: "capture-count: " + incompleteRuns.join(","), status: "FAILED", targets };
  }
  const missing = [REACT_TARGET, FOLDKIT_TARGET].filter((id) => !targets.some((target) => target.id === id));
  if (missing.length > 0) {
    return { ...base, comparisons: null, reason: "target-missing: " + missing.join(","), status: "FAILED", targets };
  }
  const unavailable = targets.filter((target) => !target.available).map((target) => target.id);
  if (unavailable.length > 0) {
    return { ...base, comparisons: null, reason: "target-unavailable: " + unavailable.join(","), status: "FAILED", targets };
  }
  const perTarget = targets.map((target) => {
    const captures = captureOf(runs, target.id);
    const shas = captures.map((capture) => capture.sha256);
    return {
      captures: captures.map((capture) => ({
        evidencePath: capture.evidencePath,
        ignoredIssues: capture.ignoredIssues ?? [],
        sha256: capture.sha256,
      })),
      evidencePath: captures[0] === undefined ? undefined : captures[0].evidencePath,
      id: target.id,
      ignoredIssues: captures.flatMap((capture) => capture.ignoredIssues ?? []),
      issues: captures.flatMap((capture) => capture.issues ?? []),
      shas,
      sha256: shas[0],
      deterministic: shas.length === DEFAULT_RUN_COUNT && shas.every((sha) => sha === shas[0]),
    };
  });
  const comparisons = buildComparisons(perTarget);
  const evidence = {
    targets: perTarget.map((entry) => ({
      id: entry.id,
      pngs: entry.captures.map((capture) => capture.evidencePath),
      sha256: entry.sha256,
    })),
  };
  const ignoredCount = perTarget.reduce((count, entry) => count + entry.ignoredIssues.length, 0);
  const counts = perTarget.filter((entry) => entry.captures.length !== DEFAULT_RUN_COUNT).map((entry) => entry.id + "=" + String(entry.captures.length));
  if (counts.length > 0) {
    return { ...base, comparisons, evidence, ignoredCount, reason: "capture-count: " + counts.join(","), status: "FAILED", targets: perTarget };
  }
  const issues = perTarget.flatMap((entry) => entry.issues);
  if (issues.length > 0) {
    return { ...base, comparisons, evidence, ignoredCount, issues, reason: "capture-issues", status: "FAILED", targets: perTarget };
  }
  const nondeterministic = perTarget.filter((entry) => !entry.deterministic).map((entry) => entry.id);
  if (nondeterministic.length > 0) {
    return { ...base, comparisons, evidence, ignoredCount, reason: "nondeterministic: " + nondeterministic.join(","), status: "FAILED", targets: perTarget };
  }
  return { ...base, comparisons, evidence, ignoredCount, route: SCENARIO_ROUTE, status: "PASSED", targets: perTarget };
};

export const runSelfcheck = async ({ capture, chromeAvailable, chromeUserDataRoot, executable, repoRoot, runCount = DEFAULT_RUN_COUNT, targets, tempRoot }) => {
  const resolved = targets ?? resolveTargets({ repoRoot: repoRoot ?? process.cwd() });
  if (!chromeAvailable) return evaluateSelfcheck({ chromeAvailable, chromeUserDataRoot, executable, runs: [], targets: resolved, tempRoot });
  try {
    const runs = [];
    for (let run = 0; run < runCount; run += 1) {
      const results = [];
      for (const target of resolved) {
        if (!target.available) continue;
        results.push(await capture({ route: SCENARIO_ROUTE, run, target }));
      }
      runs.push(results);
    }
    return evaluateSelfcheck({ chromeAvailable, chromeUserDataRoot, executable, runs, targets: resolved, tempRoot });
  } catch (error) {
    return {
      chromeUserDataRoot,
      executable,
      exitCode: 1,
      reason: "capture-failed: " + reasonFrom(error),
      scope: "browser-parity",
      status: "FAILED",
      tempRoot,
    };
  }
};

const sleep = (delayMs) => new Promise((resolve) => { setTimeout(resolve, delayMs); });

const freePort = () => new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    const port = address !== null && "port" in Object(address) ? Number(address.port) : 0;
    server.close(() => resolve(port));
  });
});

const waitForHealth = async (base, timeoutMs = 60000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(base + "/healthz", { signal: AbortSignal.timeout(2000) });
      if (response.ok) return true;
    } catch {
      // not up yet
    }
    await sleep(150);
  }
  return false;
};

/** CDP over one Chrome WebSocket: responses by id, events fanned out to the primitive's listeners. */
const connectCdp = async (wsUrl) => {
  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id !== undefined && pending.has(message.id)) {
      const entry = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
      return;
    }
    for (const listener of listeners.get(message.method) ?? []) listener(message.params ?? {});
  });
  return {
    close: () => socket.close(),
    on: (eventName, listener) => {
      const registered = listeners.get(eventName) ?? [];
      registered.push(listener);
      listeners.set(eventName, registered);
      return () => {
        const current = listeners.get(eventName) ?? [];
        listeners.set(eventName, current.filter((entry) => entry !== listener));
      };
    },
    send: (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = (nextId += 1);
      pending.set(id, { reject, resolve });
      socket.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
    }),
  };
};

export const launchChrome = async ({ chromePath, endpointTimeoutMs = 30000, onSpawn, spawnImpl = spawn, userDataDir }) => {
  const child = spawnImpl(chromePath, [
    "--headless=new",
    "--remote-debugging-port=0",
    "--user-data-dir=" + userDataDir,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "about:blank",
  ], { stdio: ["ignore", "pipe", "pipe"] });
  onSpawn?.(child);
  let endpoint;
  try {
    endpoint = await new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => reject(new Error("chrome did not report a DevTools endpoint")), endpointTimeoutMs);
    child.stderr.on("data", (chunk) => {
      buffer += String(chunk);
      const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    child.on("exit", () => reject(new Error("chrome exited before reporting an endpoint")));
    child.on("error", (error) => {
      // A real spawn error (e.g. ENOENT) also emits 'error' on the child; without this listener Node throws an
      // uncaught error and the lane dies without a FAILED JSON. Reject here; the catch below kills the child.
      clearTimeout(timer);
      reject(error);
    });
    });
  } catch (error) {
    // The child is tracked BEFORE the endpoint await, so a timeout/exit failure cannot orphan Chrome.
    try {
      child.kill();
    } catch {
      // the launch error is the error worth propagating
    }
    throw error;
  }
  return { child, endpoint };
};

/**
 * S295 r2: the SPA can still be on a data-loading placeholder when document.readyState completes, so the
 * capture uses the primitive's own bounded readiness with a longer DOM-quiet window and a third stable frame.
 * Those are the primitive's documented options (semantics untouched). This makes a false placeholder PASS
 * materially less likely but does NOT eliminate it: a stable placeholder can still pass. A content-readiness
 * assertion belongs to a later comparator slice, not to this capture lane.
 */
const CAPTURE_OPTIONS = {
  deadlineMs: PARITY_CAPTURE_DEFAULTS.deadlineMs,
  quietMs: 1200,
  stableCount: 3,
  viewport: PARITY_CAPTURE_DEFAULTS.viewport,
};

const captureWithChrome = async ({ cdp, evidenceDir, run, staticRoot, target }) => {
  const context = await cdp.send("Target.createBrowserContext", { disposeOnDetach: true });
  const targetInfo = await cdp.send("Target.createTarget", { browserContextId: context.browserContextId, url: "about:blank" });
  const attached = await cdp.send("Target.attachToTarget", { flatten: true, targetId: targetInfo.targetId });
  try {
    const result = await captureParityScreenshot({
      ...CAPTURE_OPTIONS,
      cdp,
      sessionId: attached.sessionId,
      url: staticRoot,
    });
    const pngPath = path.join(evidenceDir, target + "-run" + String(run) + ".png");
    writeFileSync(pngPath, result.png);
    const partitioned = partitionCaptureIssues(captureIssues(result));
    return {
      evidencePath: pngPath,
      ignoredIssues: partitioned.ignored,
      issues: partitioned.kept,
      sha256: result.sha256,
      targetId: target,
    };
  } finally {
    await cdp.send("Target.disposeBrowserContext", { browserContextId: context.browserContextId }).catch(() => undefined);
  }
};

export const main = async ({ chromePath = process.env.CHROME_PATH, evidenceDir, executablePath, fixtureRoot, launchChromeImpl = launchChrome, requiredTempDrive = DEFAULT_TEMP_DRIVE, repoRoot = process.cwd(), runCount = DEFAULT_RUN_COUNT, targets: injectedTargets } = {}) => {
  const tempRoot = os.tmpdir();
  const targets = injectedTargets ?? resolveTargets({ repoRoot });
  const exe = executablePath ?? path.join(repoRoot, "role-model-router", "dist", "release", "win32-x64", "role-model-dev.exe");
  const fixtures = fixtureRoot ?? path.join(repoRoot, "testdata", "router-runtime", "fixtures");
  const outputDir = evidenceDir ?? path.join(repoRoot, ".recursive", "run", "115-effect-foldkit-runtime-migration", "evidence", "other", "s294-captures");
  const browserAvailable = chromePath !== undefined && existsSync(chromePath);
  let executable;
  try {
    executable = existsSync(exe) ? await resolveExecutableIdentity({ executablePath: exe }) : undefined;
  } catch {
    executable = undefined;
  }
  const base = { chromeUserDataRoot: undefined, executable, scope: "browser-parity", tempRoot };
  const tempGuard = enforceTempRoot({ requiredDrive: requiredTempDrive, tempRoot });
  if (!tempGuard.ok) {
    return { ...base, exitCode: 1, reason: tempGuard.reason, status: "FAILED" };
  }
  if (!browserAvailable) {
    return { ...base, ...evaluateSelfcheck({ chromeAvailable: false, runs: [], targets, ...base }), exitCode: 2 };
  }
  if (!existsSync(exe)) {
    const unavailableTargets = targets.map((target) => ({ ...target, available: false }));
    return { ...base, ...evaluateSelfcheck({ chromeAvailable: true, runs: [], targets: unavailableTargets, ...base }), exitCode: 1 };
  }
  let chrome;
  let userDataDir;
  let cdp;
  const children = [];
  const killAll = () => {
    for (const child of children) {
      try {
        child.kill();
      } catch {
        // best effort
      }
    }
    try {
      if (chrome !== undefined) chrome.child.kill();
    } catch {
      // best effort
    }
  };
  try {
    mkdirSync(outputDir, { recursive: true });
    userDataDir = mkdtempSync(path.join(tempRoot, "s294-chrome-"));
    chrome = await launchChromeImpl({ chromePath, userDataDir });
    cdp = await connectCdp(chrome.endpoint);
    const ports = new Map();
    for (const target of targets) ports.set(target.id, await freePort());
    const runs = [];
    for (let run = 0; run < runCount; run += 1) {
      const results = [];
      for (const target of targets) {
        if (!target.available) continue;
        const port = ports.get(target.id);
        const stateRoot = mkdtempSync(path.join(tempRoot, "s294-state-" + target.id + "-"));
        const host = spawn(exe, [
          "--repo-root", path.dirname(exe),
          "--runtime-state-root", stateRoot,
          "--host", "127.0.0.1",
          "--port", String(port),
          "--fixture-root", fixtures,
          "--static-root", target.staticRoot,
        ], { stdio: ["ignore", "pipe", "pipe"] });
        children.push(host);
        let hostFailure = null;
        host.on("error", (error) => { hostFailure = error; });
        host.on("exit", (code) => { if (code !== null && code !== 0 && hostFailure === null) hostFailure = new Error("packaged host exited " + String(code) + " for " + target.id); });
        const hostBase = "http://127.0.0.1:" + String(port);
        if (!(await waitForHealth(hostBase))) throw hostFailure ?? new Error("packaged host did not become healthy for " + target.id);
        results.push(await captureWithChrome({ cdp, evidenceDir: outputDir, run, staticRoot: hostBase + SCENARIO_ROUTE, target: target.id }));
        host.kill();
      }
      runs.push(results);
    }
    const evaluation = evaluateSelfcheck({ chromeAvailable: true, chromeUserDataRoot: userDataDir, executable, runs, targets, tempRoot });
    return { ...evaluation, evidenceDir: outputDir, exitCode: exitCodeFor(evaluation.status) };
  } catch (error) {
    return {
      ...base,
      chromeUserDataRoot: userDataDir,
      evidenceDir: outputDir,
      exitCode: 1,
      reason: "runner-failure: " + reasonFrom(error),
      status: "FAILED",
    };
  } finally {
    killAll();
    try {
      if (cdp !== undefined) cdp.close();
    } catch {
      // best effort
    }
  }
};

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const result = await main({});
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exitCode = result.exitCode ?? exitCodeFor(result.status);
}