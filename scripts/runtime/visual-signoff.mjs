#!/usr/bin/env node
/**
 * S615: visual sign-off via deepseek-flash vision + R14 rendered evidence.
 *
 * Captures the SAME operator view from two builds - the running production instance at :3456 and the
 * rebuilt packaged Foldkit build started on an isolated port with the fixture root - then asks
 * deepseek-flash (through the packaged host, using a fresh copy of the owner-approved isolated credential
 * state) for a structured, area-by-area visual delta and a one-line verdict.
 *
 * The image-provider path is 429-blocked, so deepseek-flash is the chosen comparator. Credential bytes are
 * never read or logged: the state source is metadata-signature checked before/after, the per-run copy is
 * deleted, and every captured line/body is redacted. Screenshots are saved beside the log and committed as
 * the evidence artefact; image base64 is never written to the log (only sha256 + byte counts).
 *
 * Usage:
 *   node scripts/runtime/visual-signoff.mjs
 *   node scripts/runtime/visual-signoff.mjs --prod-url http://127.0.0.1:3456 \
 *     --foldkit-port 3465 --vision-port 3464 --expect-version 0.0.20-478-g2d4fa10b
 *
 * Exit: 0 both screenshots captured and the vision comparison answered; 1 a comparison assertion failed;
 *       2 NOT RUN (no Chrome / production unreachable / bad inputs).
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const checkoutRoot = path.resolve(__dirname, "../..");

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};

const head = (() => {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: checkoutRoot,
    encoding: "utf8",
  });
  return result.status === 0 ? String(result.stdout).trim() : "unknown";
})();

const exe = path.resolve(
  value("--exe") ??
    path.join(
      checkoutRoot,
      "role-model-router",
      "dist",
      "release",
      "win32-x64",
      "role-model-dev.exe",
    ),
);
const stateSource = path.resolve(value("--state-source") ?? "D:/DEV/rm-clean/live-state2");
const fixtureRoot = path.resolve(
  value("--fixture-root") ?? path.join(checkoutRoot, "testdata", "router-runtime", "fixtures"),
);
const prodUrl = value("--prod-url") ?? "http://127.0.0.1:3456";
const foldkitPort = Number(value("--foldkit-port") ?? 3465);
const visionPort = Number(value("--vision-port") ?? 3464);
const expectedVersion = value("--expect-version") ?? "0.0.20-478-g2d4fa10b";
const visionModel = value("--vision-model") ?? "baseline.remote-only";
const visionBudgetMs = Number(process.env.VISUAL_SIGNOFF_VISION_TIMEOUT_MS ?? 240_000);
const baseName = `visual-signoff-${head}`;
const evidenceDir = path.resolve(
  value("--evidence-dir") ??
    path.join(
      checkoutRoot,
      ".recursive",
      "run",
      "115-effect-foldkit-runtime-migration",
      "evidence",
      "logs",
      baseName,
    ),
);
const logPath = path.resolve(
  value("--log") ??
    path.join(
      checkoutRoot,
      ".recursive",
      "run",
      "115-effect-foldkit-runtime-migration",
      "evidence",
      "logs",
      `${baseName}.log`,
    ),
);
const prodPng = path.join(evidenceDir, "production-3456.png");
const foldkitPng = path.join(evidenceDir, "foldkit.png");
// The sandbox blocks Chrome's named-pipe IPC, so the headless-CLI screenshot path can fail with
// "Failed to open named pipe server ... Access is denied". The shared browser's captures can be supplied
// through these overrides instead; they are copied into the evidence directory like any other capture.
const prodPngOverride = value("--production-png");
const foldkitPngOverride = value("--foldkit-png");
// Provenance: a run whose images came from --production-png/--foldkit-png did NOT capture through the
// harness, and its result line must say so instead of claiming two captures.
const suppliedCaptures = prodPngOverride !== undefined || foldkitPngOverride !== undefined;

const lines = [];
const record = (line = "") => {
  lines.push(line);
  console.log(line);
};
const truncate = (text, limit = 8000) =>
  text.length <= limit ? text : `${text.slice(0, limit)}…(${String(text.length)} bytes)`;
const redact = (text) =>
  String(text)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/(sk-[A-Za-z0-9_-]{4,})/g, "[REDACTED_API_KEY]")
    .replace(/("?api[-_]?key"?\s*[:=]\s*)("[^"]*"|[^\s,;}]+)/gi, "$1[REDACTED]")
    .replace(/(authorization"?\s*[:=]\s*)("[^"]*"|[^\s,;}]+)/gi, "$1[REDACTED]");
const finishLog = () => {
  try {
    mkdirSync(path.dirname(logPath), { recursive: true });
    writeFileSync(logPath, `${redact(lines.join("\n"))}\n`, "utf8");
    console.log(`log=${logPath}`);
  } catch (error) {
    console.log(`could not write evidence log: ${String(error)}`);
  }
};
const notRun = (message) => {
  record(`NOT RUN: ${message}`);
  finishLog();
  process.exit(2);
};
const sha256File = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const treeSignature = (root) => {
  const entries = [];
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const nextRel = rel.length === 0 ? entry.name : `${rel}/${entry.name}`;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, nextRel);
      else if (entry.isFile()) entries.push(`${nextRel}\t${String(statSync(full).size)}`);
    }
  };
  walk(root, "");
  return entries.sort().join("\n");
};

const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const chromePath =
  process.env.CHROME_PATH === undefined
    ? chromeCandidates.find((candidate) => existsSync(candidate))
    : existsSync(process.env.CHROME_PATH)
      ? process.env.CHROME_PATH
      : undefined;

record("# S615 visual sign-off (deepseek-flash vision)");
record(`head=${head}`);
record(`production_url=${prodUrl}`);
record(`foldkit_exe=${exe}`);
record(`expected_version=${expectedVersion}`);
record(`vision_model=${visionModel}`);
record(`chrome=${String(chromePath ?? "missing")}`);
record(`started_at=${new Date().toISOString()}`);
record("");
if (chromePath === undefined) notRun("no Chromium-family browser found (set CHROME_PATH)");
if (!existsSync(exe)) notRun(`packaged executable not found: ${exe}`);
if (!existsSync(fixtureRoot)) notRun(`fixture root not found: ${fixtureRoot}`);
if (!existsSync(stateSource)) notRun(`credential state source not found: ${stateSource}`);
const manifestVersion = (() => {
  try {
    return JSON.parse(readFileSync(path.join(path.dirname(exe), "manifest.json"), "utf8")).version;
  } catch {
    return undefined;
  }
})();
record(`manifest_version=${String(manifestVersion ?? "missing")}`);
if (expectedVersion !== undefined && manifestVersion !== expectedVersion) {
  notRun(
    `manifest version ${String(manifestVersion)} does not match --expect-version ${expectedVersion}`,
  );
}
const exeSha = sha256File(exe);
record(`exe_sha256=${exeSha}`);
mkdirSync(evidenceDir, { recursive: true });
record(`evidence_dir=${evidenceDir}`);
record("");

const freePort = async (candidate) => {
  const server = net.createServer();
  const free = await new Promise((resolve) => {
    server.once("error", () => resolve(false));
    server.listen(candidate, "127.0.0.1", () => server.close(() => resolve(true)));
  });
  return free;
};
for (const port of [foldkitPort, visionPort]) {
  if (!(await freePort(port))) notRun(`port ${String(port)} is already in use`);
}

const capture = (url, file) => {
  record(`capture: ${url} -> ${file}`);
  const result = spawnSync(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--force-device-scale-factor=1",
      "--window-size=1360,920",
      "--virtual-time-budget=9000",
      `--user-data-dir=${mkdtempSync(path.join(os.tmpdir(), "visual-chrome-"))}`,
      `--screenshot=${file}`,
      url,
    ],
    { encoding: "utf8", timeout: 120_000 },
  );
  if (result.status !== 0 || !existsSync(file)) {
    throw new Error(
      `screenshot failed for ${url} (status ${String(result.status)}): ${truncate(String(result.stderr ?? ""), 400)}`,
    );
  }
  return { file, bytes: statSync(file).size, sha256: sha256File(file) };
};

const bootHost = async (label, port, stateRoot, extraArgs) => {
  const childArgs = [
    "--repo-root",
    path.dirname(exe),
    "--runtime-state-root",
    stateRoot,
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    ...extraArgs,
  ];
  record(`spawn[${label}]: ${exe} ${childArgs.join(" ")}`);
  const child = spawn(exe, childArgs, { stdio: ["ignore", "pipe", "pipe"] });
  let exited = null;
  child.once("exit", (code, signal) => {
    exited = { code, signal };
  });
  const deadline = Date.now() + 240_000;
  const base = `http://127.0.0.1:${String(port)}`;
  while (Date.now() < deadline) {
    if (exited !== null)
      throw new Error(`${label} host exited before health (code ${String(exited.code)})`);
    try {
      const response = await fetch(`${base}/healthz`, { headers: { connection: "close" } });
      if (response.ok) {
        const body = await response.json();
        record(`healthz[${label}]=${redact(truncate(JSON.stringify(body), 1200))}`);
        // A 200 healthz is not enough: the packaged host answers while session bootstrap is still
        // running and the router is not ready yet (measured: the first chat call after such a 200 failed
        // with "fetch failed"). Wait for bootstrap to settle before returning the instance.
        const bootstrap = String(body?.sessionBootstrap?.status ?? "ready");
        if (body?.ready === false || bootstrap === "running" || bootstrap === "pending") {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
        return { child, base, version: body?.runtime?.version };
      }
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label} host did not become healthy`);
};
const stopHost = async (child) => {
  if (child === null || child.exitCode !== null) return;
  // The exit listener must exist before the kill: a tree kill can make the host exit before the listener
  // is attached, and awaiting an already-emitted exit event would park for the full timeout.
  const exited = new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve(true);
      return;
    }
    const timer = setTimeout(() => resolve(false), 10_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
  if (process.platform === "win32") {
    // Kill the tree BEFORE the parent exits: once the host is gone, taskkill /T can no longer find its
    // Track B sidecar children by parent PID, and those children keep the state root open (measured:
    // EPERM deleting the credential copy after a graceful parent exit).
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill();
  }
  if (!(await exited) && process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  }
  // Give the OS a moment to release the sidecar file handles before the caller deletes the copy.
  if (process.platform === "win32")
    spawnSync("ping", ["-n", "3", "127.0.0.1"], { stdio: "ignore" });
};

const failures = [];
let foldkitHost = null;
let visionHost = null;
let visionCopy = null;
let prodShot;
let foldkitShot;
let visionAnswer = "";
try {
  // (a) production screenshot
  const suppliedShot = (file, target, label) => {
    if (!existsSync(file)) throw new Error(`supplied ${label} screenshot not found: ${file}`);
    mkdirSync(path.dirname(target), { recursive: true });
    if (path.resolve(file) !== path.resolve(target)) cpSync(file, target);
    const shot = { file: target, bytes: statSync(target).size, sha256: sha256File(target) };
    record(`${label}_shot(source=supplied) bytes=${String(shot.bytes)} sha256=${shot.sha256}`);
    return shot;
  };
  if (prodPngOverride !== undefined) {
    record(
      "production_capture=supplied (Chrome CLI screenshot path unavailable under the sandbox named-pipe policy)",
    );
    prodShot = suppliedShot(path.resolve(prodPngOverride), prodPng, "production");
  } else {
    await fetch(prodUrl, { headers: { connection: "close" } }).then(
      (response) => record(`production_status=${String(response.status)}`),
      (error) => notRun(`production URL is not reachable: ${String(error)}`),
    );
    prodShot = capture(prodUrl, prodPng);
    record(`production_shot bytes=${String(prodShot.bytes)} sha256=${prodShot.sha256}`);
  }

  // (a) Foldkit screenshot: packaged build on an isolated port with the fixture root
  if (foldkitPngOverride !== undefined) {
    record("foldkit_capture=supplied (see production_capture note)");
    foldkitShot = suppliedShot(path.resolve(foldkitPngOverride), foldkitPng, "foldkit");
  } else {
    const foldkitState = mkdtempSync(path.join(os.tmpdir(), "visual-foldkit-state-"));
    try {
      foldkitHost = await bootHost("foldkit", foldkitPort, foldkitState, [
        "--fixture-root",
        fixtureRoot,
      ]);
      if (expectedVersion !== undefined && foldkitHost.version !== expectedVersion) {
        throw new Error(
          `foldkit host version ${String(foldkitHost.version)} does not match ${expectedVersion}`,
        );
      }
      foldkitShot = capture(`${foldkitHost.base}/`, foldkitPng);
      record(`foldkit_shot bytes=${String(foldkitShot.bytes)} sha256=${foldkitShot.sha256}`);
    } finally {
      await stopHost(foldkitHost);
      foldkitHost = null;
      rmSync(foldkitState, { force: true, recursive: true });
    }
  }

  // (b) vision comparison through the packaged host with the isolated credential copy
  const sourceBefore = treeSignature(stateSource);
  record(
    `state_source_signature_sha256=${createHash("sha256").update(sourceBefore).digest("hex")}`,
  );
  visionCopy = mkdtempSync(path.join(os.tmpdir(), "visual-vision-"));
  const visionState = path.join(visionCopy, "state");
  cpSync(stateSource, visionState, { recursive: true });
  const staleKeyLifecycle = path.join(
    visionState,
    "standalone-runtime-dev",
    "track-b",
    "key-lifecycle.json",
  );
  if (existsSync(staleKeyLifecycle)) rmSync(staleKeyLifecycle, { force: true });
  visionHost = await bootHost("vision", visionPort, visionState, []);
  if (expectedVersion !== undefined && visionHost.version !== expectedVersion) {
    throw new Error(
      `vision host version ${String(visionHost.version)} does not match ${expectedVersion}`,
    );
  }
  const toDataUrl = (shot) => `data:image/png;base64,${readFileSync(shot.file).toString("base64")}`;
  const prompt = [
    "You are comparing two screenshots of the same operator UI. Image 1 is the production build at :3456 (reference). Image 2 is the rebuilt Foldkit build.",
    "Compare them area by area: (1) header and navigation, (2) main content blocks and cards/tables, (3) typography and wording, (4) colours and theme, (5) spacing and layout, (6) anything missing or extra.",
    "Be concrete and only state what you can see. End with exactly one verdict line: VISUAL_VERDICT: parity | minor-deltas | major-deltas.",
  ].join("\n");
  const body = {
    model: visionModel,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "text", text: "Image 1: production build at :3456." },
          { type: "image_url", image_url: { url: toDataUrl(prodShot) } },
          { type: "text", text: "Image 2: rebuilt Foldkit build." },
          { type: "image_url", image_url: { url: toDataUrl(foldkitShot) } },
        ],
      },
    ],
  };
  record("");
  record(
    `vision_request model=${visionModel} images=${String(prodShot.bytes)}/${String(foldkitShot.bytes)} bytes (base64 omitted)`,
  );
  // The packaged host can reset a connection once while post-bootstrap work settles; a transport-level
  // retry is not a token-budget retry and makes the capture lane deterministic. Bounded: 3 attempts.
  let response;
  let text = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const controller = AbortSignal.timeout(visionBudgetMs);
      response = await fetch(`${visionHost.base}/v1/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", connection: "close" },
        body: JSON.stringify(body),
        signal: controller,
      });
      text = await response.text();
      break;
    } catch (error) {
      record(
        `vision_fetch_retry attempt=${String(attempt)} error=${String(error instanceof Error ? error.message : error)}`,
      );
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  // Stop the vision host as soon as the response body is in hand: its Track B children hold the state
  // root, and the fail-closed deletion below must be able to remove the credential copy.
  await stopHost(visionHost);
  visionHost = null;
  record("vision_host_stopped_before_cleanup=true");
  record(`vision_status=${String(response.status)}`);
  record(`vision_response=${redact(truncate(text, 12000))}`);
  if (response.status !== 200) failures.push(`vision comparison HTTP ${String(response.status)}`);
  const parsed = (() => {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  })();
  visionAnswer =
    typeof parsed?.choices?.[0]?.message?.content === "string"
      ? parsed.choices[0].message.content
      : "";
  if (visionAnswer.trim().length === 0) failures.push("vision answer is empty");
  record("");
  record(`VISION_ANSWER=${redact(visionAnswer)}`);
  const verdictMatch = /VISUAL_VERDICT:\s*(parity|minor-deltas|major-deltas)/i.exec(visionAnswer);
  record(`VISION_VERDICT=${verdictMatch === null ? "unparsed" : verdictMatch[1]}`);
  record(
    "VISION_VERDICT_NOTE=the verdict is a delta between the captures AS TAKEN and is NOT a design-match acceptance; the captures differ in data source (production live vs Foldkit fixture-backed), which dominates the comparison",
  );
  const sourceAfter = treeSignature(stateSource);
  record(`state_source_unchanged=${String(sourceAfter === sourceBefore)}`);
  if (sourceAfter !== sourceBefore) failures.push("credential state source changed during the run");
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
  record(`FAIL ${redact(error instanceof Error ? error.message : String(error))}`);
} finally {
  await stopHost(visionHost);
  if (visionCopy !== null) {
    // A credential copy must not survive the run. Retry the delete so a briefly-held SQLite/WAL handle
    // from a just-killed sidecar cannot leave it behind.
    let removed = false;
    let lastError = "";
    // Detached Track B worker processes can outlive the host tree kill and keep the copy open. Kill any
    // node/role-model-dev process whose command line names THIS copy (never a wildcard, never another run's
    // state root), then retry the delete.
    const needle = visionCopy.replace(/'/g, "''");
    const ps = `$n='${needle}'; Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'node.exe' -or $_.Name -eq 'role-model-dev.exe') -and $_.CommandLine -and $_.CommandLine.Contains($n) } | ForEach-Object { taskkill /PID $_.ProcessId /T /F | Out-Null }`;
    spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], { stdio: "ignore" });
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const attemptRemoval = () => {
      try {
        rmSync(visionCopy, { force: true, recursive: true });
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
      if (!existsSync(visionCopy)) return true;
      // Second strategy: the OS rmdir can succeed where the Node recursive delete hit a transient handle.
      const fallback = spawnSync("cmd", ["/c", "rd", "/s", "/q", visionCopy], { stdio: "ignore" });
      if (!existsSync(visionCopy)) return true;
      if (fallback.status !== 0) lastError = lastError || `rd exit ${String(fallback.status)}`;
      return false;
    };
    // A just-killed sidecar (or an external scanner) can hold the tree for tens of seconds; retry for a
    // bounded minute, and FAIL the run if the credential copy still exists afterwards.
    for (let attempt = 1; attempt <= 30 && !removed; attempt += 1) {
      removed = attemptRemoval();
      if (!removed) await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    record(
      `vision_state_copy_removed=${String(removed)}${removed ? "" : ` error=${redact(lastError)}`}`,
    );
    // Fail closed: a surviving credential copy is a failed run, never a pass.
    if (!removed)
      failures.push(
        `cleanup_failed: could not delete credential state copy ${visionCopy} (${lastError})`,
      );
    record(`cleanup_failed=${String(!removed)}`);
  }
}

record("");
record("# RESULT");
record(
  `production_shot=${prodShot === undefined ? "missing" : `${prodShot.file} sha256=${prodShot.sha256}`}`,
);
record(
  `foldkit_shot=${foldkitShot === undefined ? "missing" : `${foldkitShot.file} sha256=${foldkitShot.sha256}`}`,
);
record(`vision_model=${visionModel}`);
record(`vision_answer_chars=${String(visionAnswer.length)}`);
record(
  `captures=${
    suppliedCaptures
      ? "supplied-overrides (Chrome CLI capture unavailable under the sandbox named-pipe policy)"
      : "captured by the harness"
  }`,
);
if (failures.length === 0)
  record(
    suppliedCaptures
      ? "RESULT: PASS (comparison answered on supplied captures; Chrome CLI capture unavailable; the verdict is data-state-dominated and is NOT a design-match acceptance)"
      : "RESULT: PASS (two screenshots captured by the harness, deepseek-flash comparison returned an answer; the verdict is data-state-dominated and is NOT a design-match acceptance)",
  );
else {
  record(`RESULT: FAIL (${String(failures.length)} failure(s))`);
  for (const failure of failures) record(`  ${redact(failure)}`);
}
finishLog();
process.exit(failures.length === 0 ? 0 : 1);
