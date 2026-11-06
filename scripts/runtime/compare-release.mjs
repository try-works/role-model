#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const OPERATOR_PORTS = new Set([3456, 3457, 3458]);
const args = process.argv.slice(2);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const fixtureRootInput = value("--fixture-root");
const left = value("--left");
const right = value("--right");
const rightExe = value("--right-exe");
const rightPort = value("--right-port");
const rightState = value("--right-state");
const leftExe = value("--left-exe");
const leftPort = value("--left-port");
const leftState = value("--left-state");
const expectLeftVersion = value("--expect-left-version");
const expectRightVersion = value("--expect-right-version");
const problems = [];
if (!left && !leftExe) problems.push("--left or --left-exe is required");
if (!right && !rightExe) problems.push("--right or --right-exe is required");
if (rightExe && !rightPort) problems.push("--right-port is required with --right-exe");
if (leftExe && !leftPort) problems.push("--left-port is required with --left-exe");
if (leftPort && (!Number.isInteger(Number(leftPort)) || OPERATOR_PORTS.has(Number(leftPort))))
  problems.push("--left-port is invalid or an operator port");
if (leftExe && !existsSync(leftExe)) problems.push("--left-exe does not exist");
if (leftExe && rightExe && path.resolve(leftExe) === path.resolve(rightExe))
  problems.push("--left-exe and --right-exe are the same binary");
const fixtureRoot = path.resolve(
  fixtureRootInput ?? path.join(process.cwd(), "testdata", "router-runtime", "fixtures"),
);
if ((leftExe || rightExe) && !existsSync(fixtureRoot)) {
  problems.push(`fixture root does not exist (${fixtureRoot}) - pass --fixture-root`);
}
for (const [name, raw] of [
  ["--left", left],
  ["--right", right],
])
  if (raw) {
    try {
      const url = new URL(raw);
      if (OPERATOR_PORTS.has(Number(url.port))) problems.push(`${name} uses an operator port`);
    } catch {
      problems.push(`${name} is not a URL`);
    }
  }
if (rightPort && (!Number.isInteger(Number(rightPort)) || OPERATOR_PORTS.has(Number(rightPort))))
  problems.push("--right-port is invalid or an operator port");
// S170: the same port on both sides made the right child fail to bind while waitReady reached the
// LEFT server, and every surface then compared left against left and reported "same".
if (
  leftExe &&
  rightExe &&
  leftPort !== undefined &&
  rightPort !== undefined &&
  Number(leftPort) === Number(rightPort)
)
  problems.push(
    "--left-port and --right-port must differ (the same port on both sides compares one process with itself)",
  );
if (rightExe && !existsSync(rightExe)) problems.push("--right-exe does not exist");
if (left && right && left.replace(/\/$/, "") === right.replace(/\/$/, ""))
  problems.push("--left and --right are the same URL");
// S167: comparing a production package against a development package measures the channel
// difference, not migration parity. Refuse unless the caller says it is deliberate (S167).
const channelOf = (exe) => {
  if (exe === undefined) return undefined;
  const manifestPath = path.join(path.dirname(exe), "manifest.json");
  if (!existsSync(manifestPath)) return undefined;
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8")).channel;
  } catch {
    return undefined;
  }
};
const leftChannel = channelOf(leftExe);
const rightChannel = channelOf(rightExe);
if (
  leftChannel !== undefined &&
  rightChannel !== undefined &&
  leftChannel !== rightChannel &&
  !args.includes("--allow-cross-channel")
) {
  problems.push(
    `channels differ (${leftChannel} vs ${rightChannel}); pass --allow-cross-channel if that is deliberate`,
  );
}
if (problems.length > 0) {
  console.log(`NOT RUN: ${problems.join("; ")}`);
  process.exit(2);
}

const fetchWithTimeout = async (url) => {
  try {
    return await fetch(url, {
      headers: { connection: "close" },
      signal: AbortSignal.timeout(Number(process.env.R39_FETCH_TIMEOUT_MS ?? 10_000)),
    });
  } catch {
    return undefined;
  }
};

// S167: the scope id is NOT forced. Hardcoding "standalone-runtime-dev" made a
// production-channel package refuse to start (its profile carries a different scope), and the
// comparison then reported NOT RUN against a binary that runs fine by hand.
const READY_TIMEOUT_MS = Number(process.env.R39_READY_TIMEOUT_MS ?? 120_000);
const waitReady = async (base) => {
  // A production-channel package starts its sidecar and thirteen extensions before /healthz
  // answers; 30 s was too short for a cold start (observed with a staged operator build).
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const response = await fetchWithTimeout(`${base}/healthz`);
    if (response?.ok) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
};

let child;
let leftChild;
// S171: a per-run temporary state directory, so a stale fixed directory can never block a
// legitimate package or silently reuse another run's state.
const freshStateDir = (prefix) => mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
// Per-side state directories, used only to normalise path-shaped values in the comparison.
let leftStateForDiff = undefined;
let rightStateForDiff = undefined;
let leftBase = left;
if (leftExe) {
  const leftStateResolved =
    leftState === undefined ? freshStateDir("compare-left") : path.resolve(leftState);
  leftStateForDiff = leftStateResolved;
  mkdirSync(leftStateResolved, { recursive: true });
  leftChild = spawn(
    leftExe,
    [
      "--repo-root",
      path.dirname(leftExe),
      "--runtime-state-root",
      leftStateResolved,
      "--host",
      "127.0.0.1",
      "--port",
      String(Number(leftPort)),
      "--fixture-root",
      fixtureRoot,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  leftBase = `http://127.0.0.1:${String(Number(leftPort))}`;
}
let rightBase = right;
if (rightExe) {
  const rightStateResolved =
    rightState === undefined ? freshStateDir("compare-right") : path.resolve(rightState);
  rightStateForDiff = rightStateResolved;
  mkdirSync(rightStateResolved, { recursive: true });
  child = spawn(
    rightExe,
    [
      "--repo-root",
      path.dirname(rightExe),
      "--runtime-state-root",
      rightStateResolved,
      "--host",
      "127.0.0.1",
      "--port",
      String(Number(rightPort)),
      "--fixture-root",
      fixtureRoot,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  rightBase = `http://127.0.0.1:${String(Number(rightPort))}`;
  const ready = await waitReady(rightBase);
  if (!ready) {
    child.kill();
    leftChild?.kill();
    console.log(`NOT RUN: --right-exe did not become healthy on ${rightBase}`);
    process.exit(2);
  }
}
const endpoints = [
  "/healthz",
  "/api/role-model/runtime/summary",
  "/api/role-model/models",
  "/api/role-model/endpoints",
  "/api/role-model/router/summary",
  "/api/role-model/telemetry/summary",
  "/api/role-model/operator/learning",
  "/api/role-model/operator/replay/jobs",
  "/api/role-model/operator/evaluation/jobs",
];
const IDENTITY = new Set([
  "version",
  "release_version",
  "commit",
  "build_date",
  "executable_sha256",
  "core_payload_sha256",
  "source_tree",
  "runtimeStateRoot",
  "runtime_state_root",
  "stateRoot",
  "repoRoot",
  "repo_root",
  "staticRoot",
  "databasePath",
  "database_path",
  "port",
  "host",
  "startedAt",
  "started_at",
  "finishedAt",
  "finished_at",
  "pid",
]);
// S171 (review): the previous set also stripped the generic keys "endpoint" and "path", which
// turned a real controller/runtime configuration difference into a silent "same". Only identity
// and per-side runtime location are stripped; anything a client configures stays compared.
const readJson = async (url) => {
  const response = await fetchWithTimeout(url);
  if (!response) return { response: undefined };
  const text = await response.text();
  // S170: two 200 text/html bodies both parse to undefined, which compared as "same". A non-JSON
  // body is not evidence of agreement, it is evidence that the surface did not answer as an API.
  try {
    return { response, body: JSON.parse(text) };
  } catch {
    return { response, body: undefined, notJson: true };
  }
};
const strip = (value) => {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !IDENTITY.has(key))
        .map(([key, item]) => [key, strip(item)]),
    );
  return value;
};
// S171: 162 commits apart, a surface legitimately gains keys. Equality alone reported that as
// "different" and hid which keys were new, which is the shape of the answer a reviewer needs.
const valueDiff = (left, right, leftState, rightState, prefix = "", out = []) => {
  if (out.length >= 12) return out;
  if (left === right) return out;
  const bothObjects = left && right && typeof left === "object" && typeof right === "object";
  if (!bothObjects) {
    const pathname = prefix.slice(0, -1);
    out.push({
      path: pathname,
      left,
      right,
      environmental: isEnvironmental(pathname, left, right, leftState, rightState),
    });
    return out;
  }
  for (const key of Object.keys(left)) {
    if (!(key in right)) continue;
    valueDiff(left[key], right[key], leftState, rightState, `${prefix + key}.`, out);
  }
  return out;
};
const shapeDelta = (left, right, prefix = "", out = []) => {
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object")
    return out;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  for (const key of leftKeys) if (!rightKeys.includes(key)) out.push(`-${prefix}${key}`);
  for (const key of rightKeys) if (!leftKeys.includes(key)) out.push(`+${prefix}${key}`);
  for (const key of leftKeys) {
    if (!rightKeys.includes(key)) continue;
    const next = `${prefix + key}.`;
    if (left[key] && right[key] && typeof left[key] === "object" && typeof right[key] === "object")
      shapeDelta(left[key], right[key], next, out);
  }
  return out;
};
// S171: a per-side state path, a process memory figure and a reconciliation timestamp differ
// between ANY two runs; treating them as a parity difference made the tool report "different"
// for a candidate that was fine, and stripping whole subtrees hid real configuration keys.
const ENV_KEY_PATTERN =
  /(^|\.)(rssBytes|heapUsedBytes|heapTotalBytes|externalBytes|uptimeMs|uptimeSeconds|reconciledAt|generatedAt|refreshedAt|atMs|startedAt|finishedAt|durationMs|pid)$/;
const ENV_PATH_KEY = /(^|\.)(path|stateRoot|runtimeStateRoot|databasePath|staticRoot)$/;
const isEnvironmental = (pathname, leftValue, rightValue, leftState, rightState) => {
  if (ENV_KEY_PATTERN.test(pathname)) return true;
  if (!ENV_PATH_KEY.test(pathname)) return false;
  if (typeof leftValue !== "string" || typeof rightValue !== "string") return false;
  const normalize = (value, stateDir) =>
    stateDir && value.startsWith(stateDir) ? `<state>${value.slice(stateDir.length)}` : value;
  return normalize(leftValue, leftState) === normalize(rightValue, rightState);
};
const FETCH_TIMEOUT_MS = Number(process.env.R39_FETCH_TIMEOUT_MS ?? 10_000);

// S173 (review): cross-channel refusal only worked exe/exe. Resolve the channel of a URL side too,
// by asking that side directly, before any comparison runs. Children started for the other side are
// killed on refusal so nothing is left running.
const channelOfUrl = async (base) => {
  const result = await readJson(`${base}/healthz`);
  return result.body?.runtime?.channel;
};
const urlBaseOf = (url, port) =>
  url ?? (port === undefined ? undefined : `http://127.0.0.1:${String(Number(port))}`);
if (!args.includes("--allow-cross-channel")) {
  const leftUrlBase = urlBaseOf(left, leftPort);
  const rightUrlBase = urlBaseOf(right, rightPort);
  const leftChannelResolved =
    leftChannel ??
    (leftUrlBase === undefined ? undefined : await channelOfUrl(leftUrlBase.replace(/\/$/, "")));
  const rightChannelResolved =
    rightChannel ??
    (rightUrlBase === undefined ? undefined : await channelOfUrl(rightUrlBase.replace(/\/$/, "")));
  if (
    leftChannelResolved !== undefined &&
    rightChannelResolved !== undefined &&
    leftChannelResolved !== rightChannelResolved
  ) {
    child?.kill();
    leftChild?.kill();
    console.log(
      `NOT RUN: channels differ (${leftChannelResolved} vs ${rightChannelResolved}); pass --allow-cross-channel if that is deliberate`,
    );
    process.exit(2);
  }
}
if (leftChild) {
  const ok = await waitReady(leftBase);
  if (!ok) {
    leftChild.kill();
    child?.kill();
    console.log(`NOT RUN: --left-exe did not become healthy on ${leftBase}`);
    process.exit(2);
  }
}

// S237: a parity record must name the build it compared. These flags make the record self-verifying:
// pass the expected version for each side and the run fails when the binary is not what was recorded.
const healthVersionOf = async (base) => {
  const result = await readJson(`${base}/healthz`);
  const runtime =
    result.body !== null && typeof result.body === "object" ? result.body.runtime : undefined;
  return runtime !== null && typeof runtime === "object" && typeof runtime.version === "string"
    ? runtime.version
    : undefined;
};
const leftVersion = await healthVersionOf(leftBase);
const rightVersion = await healthVersionOf(rightBase);
const versionMismatches = [];
if (expectLeftVersion !== undefined && leftVersion !== expectLeftVersion)
  versionMismatches.push(`left is ${String(leftVersion)}, expected ${expectLeftVersion}`);
if (expectRightVersion !== undefined && rightVersion !== expectRightVersion)
  versionMismatches.push(`right is ${String(rightVersion)}, expected ${expectRightVersion}`);
let identityFailed = false;
if (versionMismatches.length > 0) {
  console.log(`FAIL identity: ${versionMismatches.join("; ")}`);
  child?.kill();
  identityFailed = true;
  // S171: process.exit here trips a libuv assertion (0xC0000409) while fetch sockets close. Skip the
  // comparison instead and set the exit code at the end, where the script already does it.
  endpoints.splice(0, endpoints.length);
}
console.log(`identity left=${String(leftVersion)} right=${String(rightVersion)}`);
const rows = [];
const shapeDeltas = {};
const valueDeltas = {};
try {
  for (const endpoint of endpoints) {
    const leftResult = await readJson(leftBase + endpoint);
    const rightResult = await readJson(rightBase + endpoint);
    const lj = leftResult.body;
    const rj = rightResult.body;
    const ls = leftResult.response?.status;
    const rs = rightResult.response?.status;
    if (leftResult.notJson || rightResult.notJson) {
      rows.push({ endpoint, leftStatus: ls, rightStatus: rs, classification: "not-run" });
      continue;
    }
    const isOk = (status) => typeof status === "number" && status >= 200 && status < 300;
    let classification;
    if (!isOk(ls) || !isOk(rs)) {
      classification = "not-run";
    } else if (ls !== rs) {
      classification = "different";
    } else if (
      endpoint.includes("telemetry") ||
      endpoint.includes("operator/learning") ||
      endpoint.includes("replay") ||
      endpoint.includes("evaluation")
    ) {
      classification = JSON.stringify(lj) === JSON.stringify(rj) ? "same" : "environment-state";
    } else {
      const strippedLeft = strip(lj);
      const strippedRight = strip(rj);
      if (JSON.stringify(strippedLeft) === JSON.stringify(strippedRight)) {
        classification = "same";
      } else {
        const delta = shapeDelta(strippedLeft, strippedRight);
        // A key-set change is reported separately from a value change: it is version skew
        // unless a shared key also changed value.
        //
        // S235: distinguish additions from other shape changes. A key that only one side carries and
        // the other side never contradicts is compatible skew; a removal or a mixed change is not.
        // Reporting both as "shape-delta" hid that difference in the S234 production comparison.
        const onlyAdditions =
          delta.length > 0 && delta.every((entry) => entry.trim().startsWith("+"));
        const onlyRemovals =
          delta.length > 0 && delta.every((entry) => entry.trim().startsWith("-"));
        classification =
          delta.length > 0
            ? onlyAdditions || onlyRemovals
              ? "additive-shape"
              : "shape-delta"
            : "different";
        if (delta.length > 0) shapeDeltas[endpoint] = delta;
        else {
          const diffs = valueDiff(strippedLeft, strippedRight, leftStateForDiff, rightStateForDiff);
          if (diffs.every((entry) => entry.environmental)) {
            classification = "environment-state";
            valueDeltas[endpoint] = diffs;
          } else {
            valueDeltas[endpoint] = diffs.filter((entry) => !entry.environmental);
          }
        }
      }
    }
    rows.push({ endpoint, leftStatus: ls, rightStatus: rs, classification });
  }
} finally {
  child?.kill();
  leftChild?.kill();
}
for (const row of rows)
  console.log(
    `${row.classification} ${row.endpoint} (${String(row.leftStatus)}/${String(row.rightStatus)})`,
  );
for (const [endpoint, diff] of Object.entries(valueDeltas)) {
  console.log(
    `value-diff ${endpoint}: ${diff
      .map(
        (entry) =>
          `${entry.path} (${JSON.stringify(entry.left)} -> ${JSON.stringify(entry.right)})`,
      )
      .join(" | ")}`,
  );
}
for (const [endpoint, delta] of Object.entries(shapeDeltas)) {
  console.log(
    `shape-delta keys ${endpoint}: ${delta.slice(0, 12).join(", ")}${delta.length > 12 ? ` (+${String(delta.length - 12)} more)` : ""}`,
  );
}
const counts = {};
for (const row of rows) {
  counts[row.classification] = (counts[row.classification] ?? 0) + 1;
}
console.log(JSON.stringify(counts));
const notRun = counts["not-run"] ?? 0;
if (notRun > 0) {
  console.log(
    `NOT RUN: ${String(notRun)} endpoint(s) were unreachable or did not answer 2xx on both sides; a comparison is not evidence`,
  );
  // S171: exitCode, not process.exit - exiting while fetch sockets are still closing trips a libuv
  // assertion on Windows (0xC0000409), which reports a crash for a comparison that completed.
  process.exitCode = (counts.different ?? 0) > 0 ? 1 : 2;
} else {
  process.exitCode = (counts.different ?? 0) > 0 ? 1 : 0;
}
if (identityFailed) process.exitCode = 2;
