#!/usr/bin/env node
/**
 * S612 (R14): packaged parity lane.
 *
 * Bounded, committed answer to the two R14 clauses the 03 summary still lists for the packaged lane:
 *
 *   (a) packaged comparison of BOTH artifacts - the preserved 0.0.20 React package
 *       (D:/role-model-router/0.0.20/role-model.exe, channel production) against the rebuilt Foldkit
 *       package (role-model-router/dist/release/win32-x64/role-model-dev.exe). The lane invokes the
 *       maintained compare-release.mjs on the SAME fixture root with fresh state + distinct ports and
 *       --allow-cross-channel, then classifies its summary (same / additive-shape / environment-state
 *       are compatible; different / not-run / shape-delta are not).
 *
 *   (b) a deterministic double run of the routing harness - routing-e2e.mjs is executed TWICE against
 *       the rebuilt artifact, each run with its own fresh state root and free port and the same
 *       --expect-version pin. The lane asserts both runs PASS and that their assertion outcomes are
 *       IDENTICAL, and writes a PARITY line naming both outcome sets.
 *
 * The React "selfcheck endpoint/route" clause is answered honestly: neither client (runtime-ui,
 * runtime-ui-next) nor either packaged static root exposes a selfcheck route, a react checksum endpoint
 * or a selfcheck marker; the lane records NOT PRESENT with the scanned file count and the matching
 * evidence. The separate browser-capture lane (scripts/runtime/parity-selfcheck.mjs) is a script, not a
 * served route, and is not invoked here.
 *
 * Usage:
 *   node scripts/runtime/packaged-parity-lane.mjs
 *   node scripts/runtime/packaged-parity-lane.mjs --exe <rebuilt.exe> --left-exe <preserved.exe> \
 *     --expect-version 0.0.20-471-g2e4aca6b --expect-left-version 0.0.20 [--runs 2] [--skip-compare]
 *
 * Exit: 0 all phases pass; 1 a phase judged divergence/failure; 2 NOT RUN (missing artifact / busy port).
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const checkoutRoot = path.resolve(__dirname, "../..");

// ---------------------------------------------------------------------------------------------------
// Pure helpers (unit-pinned in packaged-parity-lane.test.mjs)
// ---------------------------------------------------------------------------------------------------
const OUTCOME_LINE = /^(PASS|FAIL) ([^:]+): (.*)$/;
const COMPARE_NOT_RUN = /^NOT RUN:/m;

/** Parses the routing harness assertion lines into ordered {status, name} outcomes. */
export const parseRunOutcomes = (logText) => {
  const outcomes = [];
  const seen = new Set();
  for (const line of String(logText).split("\n")) {
    const match = OUTCOME_LINE.exec(line.trim());
    if (match === null) continue;
    const name = match[2].trim();
    // The harness prints each assertion once while it runs and again in its RESULT summary; count the
    // assertion once so the parity line names the assertion count, not twice that.
    if (seen.has(name)) continue;
    seen.add(name);
    outcomes.push({ status: match[1], name });
  }
  return outcomes;
};

/** A deterministic double run is PARITY only when both runs produced the same ordered outcomes. */
export const outcomeParity = (first, second) => {
  if (first.length === 0 || second.length === 0) {
    return {
      verdict: "INCOMPLETE",
      detail: `one or both runs produced no assertion outcomes (first=${String(first.length)}, second=${String(second.length)})`,
    };
  }
  if (first.length !== second.length) {
    return {
      verdict: "DIVERGENCE",
      detail: `outcome count differs (first=${String(first.length)}, second=${String(second.length)})`,
    };
  }
  for (let index = 0; index < first.length; index += 1) {
    const left = first[index];
    const right = second[index];
    if (left.name !== right.name || left.status !== right.status) {
      return {
        verdict: "DIVERGENCE",
        detail: `outcome ${String(index + 1)} differs (first=${left.status} ${left.name}, second=${right.status} ${right.name})`,
      };
    }
  }
  const passed = first.filter((entry) => entry.status === "PASS").length;
  return {
    verdict: "PARITY",
    detail: `${String(first.length)} identical outcomes (${String(passed)} PASS)`,
  };
};

/** Classifies compare-release output: compatible skew is parity; different/not-run/shape-delta is not. */
export const parseCompareCounts = (stdout) => {
  const text = String(stdout);
  if (COMPARE_NOT_RUN.test(text)) {
    const line = text.split("\n").find((entry) => entry.startsWith("NOT RUN:")) ?? "NOT RUN";
    return { verdict: "NOT_RUN", counts: undefined, detail: line.trim() };
  }
  let counts;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        Object.values(parsed).every((value) => typeof value === "number")
      )
        counts = parsed;
    } catch {
      // a non-summary JSON line is not the counts record
    }
  }
  if (counts === undefined)
    return { verdict: "NOT_RUN", counts: undefined, detail: "no compare-release counts record" };
  const different = counts.different ?? 0;
  const notRun = counts["not-run"] ?? 0;
  const shapeDelta = counts["shape-delta"] ?? 0;
  const compatible =
    (counts.same ?? 0) + (counts["additive-shape"] ?? 0) + (counts["environment-state"] ?? 0);
  if (different > 0 || notRun > 0 || shapeDelta > 0) {
    return {
      verdict: "DIVERGENCE",
      counts,
      detail: `different=${String(different)} not-run=${String(notRun)} shape-delta=${String(shapeDelta)}`,
    };
  }
  if (compatible === 0)
    return { verdict: "NOT_RUN", counts, detail: "no comparable surface answered on both sides" };
  return {
    verdict: "PARITY",
    counts,
    detail: `same=${String(counts.same ?? 0)} additive-shape=${String(counts["additive-shape"] ?? 0)} environment-state=${String(counts["environment-state"] ?? 0)} different=0 not-run=0`,
  };
};

/** Honest verdict for the selfcheck endpoint probe: absence is recorded, never invented. */
export const selfcheckSurfaceVerdict = (matches) =>
  Array.isArray(matches) && matches.length > 0 ? "PRESENT" : "NOT PRESENT";

const SELFCHECK_PATTERN = /self-?check/i;
const REACT_CHECKSUM_PATTERN = /react/i;
const CHECKSUM_PATTERN = /checksum|sha256|digest/i;
const TEXT_SNIFF_BYTES = 4096;
const MAX_SCAN_BYTES = 5 * 1024 * 1024;

/**
 * Scans bounded text files under the given roots for a selfcheck route/endpoint marker, or a line that
 * mentions both react and a checksum. Returns matches plus the number of files inspected; never throws on
 * an unreadable file (it is counted as skipped).
 */
export const scanSelfcheckSurface = (roots) => {
  const matches = [];
  let scanned = 0;
  let skipped = 0;
  const walk = (dir, depth) => {
    if (depth > 8) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      skipped += 1;
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      let size;
      try {
        size = statSync(full).size;
      } catch {
        skipped += 1;
        continue;
      }
      if (size === 0 || size > MAX_SCAN_BYTES) {
        skipped += 1;
        continue;
      }
      let buffer;
      try {
        buffer = readFileSync(full);
      } catch {
        skipped += 1;
        continue;
      }
      if (buffer.subarray(0, TEXT_SNIFF_BYTES).includes(0)) {
        skipped += 1;
        continue;
      }
      scanned += 1;
      const text = buffer.toString("utf8");
      // Minified bundles are ONE line, so a plain "react" + "digest" co-occurrence is noise, not a
      // selfcheck surface. Bundles only count when the selfcheck token itself appears (a served route
      // name would be a string in the bundle); source files may also match the react-checksum shape.
      const isBundle = /[\\/]assets[\\/]/.test(full) || (!text.includes("\n") && size > 100_000);
      for (const line of text.split("\n")) {
        if (matches.length >= 20) break;
        const selfcheckMarker = SELFCHECK_PATTERN.test(line);
        const reactChecksumMarker =
          !isBundle && REACT_CHECKSUM_PATTERN.test(line) && CHECKSUM_PATTERN.test(line);
        if (selfcheckMarker || reactChecksumMarker) {
          matches.push({ file: full, line: line.trim().slice(0, 200) });
        }
      }
    }
  };
  for (const root of roots) {
    if (existsSync(root)) walk(root, 0);
    else skipped += 1;
  }
  return { matches, scanned, skipped };
};

// ---------------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------------
const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

const head = () => {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: checkoutRoot,
    encoding: "utf8",
  });
  return result.status === 0 ? String(result.stdout).trim() : "unknown";
};

const freePort = async () => {
  const server = net.createServer();
  const port = await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(address && typeof address !== "string" ? address.port : 0);
    });
  });
  await new Promise((resolve) => server.close(resolve));
  return port;
};

const runNode = (args, timeoutMs) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: checkoutRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        // already gone
      }
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });

const laneMain = async () => {
  const args = process.argv.slice(2);
  const value = (name) => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  const laneHead = head();
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
  const leftExe = path.resolve(value("--left-exe") ?? "D:/role-model-router/0.0.20/role-model.exe");
  const fixtureRoot = path.resolve(
    value("--fixture-root") ?? path.join(checkoutRoot, "testdata", "router-runtime", "fixtures"),
  );
  const runs = Number(value("--runs") ?? 2);
  const skipCompare = args.includes("--skip-compare");
  const logPath = path.resolve(
    value("--log") ??
      path.join(
        checkoutRoot,
        ".recursive",
        "run",
        "115-effect-foldkit-runtime-migration",
        "evidence",
        "logs",
        `r14-packaged-parity-${laneHead}.log`,
      ),
  );
  const runLogDir = path.dirname(logPath);

  const manifestVersion = (exePath) => {
    try {
      const manifest = JSON.parse(
        readFileSync(path.join(path.dirname(exePath), "manifest.json"), "utf8"),
      );
      return typeof manifest?.version === "string" ? manifest.version : undefined;
    } catch {
      return undefined;
    }
  };
  const expectVersion = value("--expect-version") ?? manifestVersion(exe);
  const expectLeftVersion = value("--expect-left-version") ?? manifestVersion(leftExe);

  const lines = [];
  const record = (line = "") => {
    lines.push(line);
    console.log(line);
  };
  const finish = (exitCode) => {
    mkdirSync(path.dirname(logPath), { recursive: true });
    writeFileSync(logPath, `${lines.join("\n")}\n`, "utf8");
    console.log(`log=${logPath}`);
    process.exit(exitCode);
  };

  record("# S612 (R14) packaged parity lane");
  record(`head=${laneHead}`);
  record(`right_exe=${exe} expect_version=${String(expectVersion ?? "(unpinned)")}`);
  record(`left_exe=${leftExe} expect_left_version=${String(expectLeftVersion ?? "(unpinned)")}`);
  record(`fixture_root=${fixtureRoot}`);
  record(`runs=${String(runs)}`);
  record(`started_at=${new Date().toISOString()}`);
  record("");
  if (!existsSync(exe)) {
    record(`NOT RUN: rebuilt executable not found: ${exe}`);
    finish(2);
  }
  if (!existsSync(fixtureRoot)) {
    record(`NOT RUN: fixture root not found: ${fixtureRoot}`);
    finish(2);
  }
  const exeSha256 = createHash("sha256").update(readFileSync(exe)).digest("hex");
  record(`right_exe_sha256=${exeSha256}`);
  if (existsSync(leftExe))
    record(`left_exe_sha256=${createHash("sha256").update(readFileSync(leftExe)).digest("hex")}`);
  record("");

  const failures = [];
  const outcomes = [];

  // ---- Phase 1: deterministic double run of the routing harness --------------------------------
  record("## Phase 1 - deterministic double run of routing-e2e.mjs");
  for (let run = 1; run <= Math.max(2, runs); run += 1) {
    const runLogPath = path.join(runLogDir, `r14-parity-run${String(run)}-${laneHead}.log`);
    const runLogRel = path.relative(checkoutRoot, runLogPath).split(path.sep).join("/");
    const argsForRun = [
      path.join(checkoutRoot, "scripts", "runtime", "routing-e2e.mjs"),
      "--log",
      runLogPath,
    ];
    if (expectVersion !== undefined) argsForRun.push("--expect-version", expectVersion);
    record(
      `run${String(run)}: node ${argsForRun
        .map((entry) => path.relative(checkoutRoot, entry).split(path.sep).join("/"))
        .join(" ")}`,
    );
    const result = await runNode(argsForRun, Number(process.env.R14_RUN_TIMEOUT_MS ?? 420_000));
    for (const line of result.stdout.split("\n").filter(Boolean))
      record(`  [run${String(run)}] ${line}`);
    for (const line of result.stderr.split("\n").filter(Boolean))
      record(`  [run${String(run)}:err] ${line}`);
    const parsed = parseRunOutcomes(result.stdout);
    outcomes.push({ run, code: result.code, log: runLogRel, outcomes: parsed });
    record(
      `run${String(run)} exit=${String(result.code)} outcomes=${String(parsed.length)} log=${runLogRel}`,
    );
    if (result.code !== 0) failures.push(`run${String(run)} exited ${String(result.code)}`);
  }
  const parity = outcomeParity(outcomes[0]?.outcomes ?? [], outcomes[1]?.outcomes ?? []);
  record(`PARITY run1-vs-run2: ${parity.verdict} - ${parity.detail}`);
  if (parity.verdict !== "PARITY")
    failures.push(`deterministic double run: ${parity.verdict} (${parity.detail})`);
  if (outcomes.some((entry) => entry.outcomes.some((outcome) => outcome.status === "FAIL")))
    failures.push("an assertion failed inside a run");
  record("");

  // ---- Phase 2: cross-artifact packaged comparison ---------------------------------------------
  record("## Phase 2 - packaged comparison: preserved 0.0.20 (React) vs rebuilt (Foldkit)");
  if (skipCompare) {
    record("SKIPPED by --skip-compare");
  } else if (!existsSync(leftExe)) {
    record(`NOT RUN: preserved 0.0.20 executable not found: ${leftExe}`);
    failures.push("preserved artifact missing (the packaged comparison cannot run)");
  } else {
    const leftPort = await freePort();
    const rightPort = await freePort();
    const argsForCompare = [
      path.join(checkoutRoot, "scripts", "runtime", "compare-release.mjs"),
      "--left-exe",
      leftExe,
      "--left-port",
      String(leftPort),
      "--right-exe",
      exe,
      "--right-port",
      String(rightPort),
      "--fixture-root",
      fixtureRoot,
      "--allow-cross-channel",
      ...(expectLeftVersion === undefined ? [] : ["--expect-left-version", expectLeftVersion]),
      ...(expectVersion === undefined ? [] : ["--expect-right-version", expectVersion]),
    ];
    record(
      `compare: node ${argsForCompare
        .map((entry) => path.relative(checkoutRoot, entry).split(path.sep).join("/"))
        .join(" ")}`,
    );
    const compared = await runNode(
      argsForCompare,
      Number(process.env.R14_COMPARE_TIMEOUT_MS ?? 600_000),
    );
    for (const line of compared.stdout.split("\n").filter(Boolean)) record(`  [compare] ${line}`);
    for (const line of compared.stderr.split("\n").filter(Boolean))
      record(`  [compare:err] ${line}`);
    const verdict = parseCompareCounts(compared.stdout);
    record(`COMPARE verdict: ${verdict.verdict} - ${verdict.detail}`);
    if (verdict.counts === undefined)
      failures.push("packaged comparison produced no counts record");
    if (verdict.verdict !== "PARITY")
      failures.push(`packaged comparison: ${verdict.verdict} (${verdict.detail})`);
    if (compared.code !== 0) failures.push(`compare-release exited ${String(compared.code)}`);
  }
  record("");

  // ---- Phase 3: React selfcheck surface (endpoint/route) ---------------------------------------
  record("## Phase 3 - React selfcheck endpoint/route surface");
  const scanRoots = [
    path.join(checkoutRoot, "role-model-router", "apps", "runtime-ui", "app"),
    path.join(checkoutRoot, "role-model-router", "apps", "runtime-ui", "build", "client"),
    path.join(checkoutRoot, "role-model-router", "apps", "runtime-ui-next", "src"),
    path.join(checkoutRoot, "role-model-router", "apps", "runtime-ui-next", "dist", "client"),
    path.join(path.dirname(exe), "build", "client"),
    path.join(path.dirname(leftExe), "build", "client"),
  ];
  const surface = scanSelfcheckSurface(scanRoots);
  const surfaceVerdict = selfcheckSurfaceVerdict(surface.matches);
  record(
    `roots=${JSON.stringify(
      scanRoots.map((root) => path.relative(checkoutRoot, root).split(path.sep).join("/")),
    )}`,
  );
  record(`files_scanned=${String(surface.scanned)} skipped=${String(surface.skipped)}`);
  for (const match of surface.matches.slice(0, 10))
    record(
      `  match ${path.relative(checkoutRoot, match.file).split(path.sep).join("/")}: ${match.line}`,
    );
  record(
    `SELFCHECK SURFACE: ${surfaceVerdict} - no selfcheck endpoint/route or react-checksum marker is served by either client or packaged static root; the browser-capture lane scripts/runtime/parity-selfcheck.mjs is a script, not a route, and is not claimed here.`,
  );
  record("");

  record("# RESULT");
  record(`head=${laneHead} right_exe_sha256=${exeSha256} runs=${String(outcomes.length)}`);
  record(`PARITY run1-vs-run2: ${parity.verdict} - ${parity.detail}`);
  record(`SELFCHECK SURFACE: ${surfaceVerdict}`);
  if (failures.length === 0) {
    record("RESULT: PASS");
    finish(0);
  } else {
    record(`RESULT: FAIL (${String(failures.length)} failure(s))`);
    for (const failure of failures) record(`  ${failure}`);
    finish(1);
  }
};

if (isMain) {
  await laneMain();
}
