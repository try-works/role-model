#!/usr/bin/env node
import { spawnSync } from "node:child_process";
/**
 * Run 115 R39: verify a packaged candidate with no arguments.
 *
 * Resolves the package directory, finds the executable, chooses a free port and a fresh
 * temp state root, and delegates to verify-client-journeys.mjs. This exists so the
 * maintained flow (validate-packaging) can call one command instead of remembering five
 * arguments - and so the arguments cannot drift between callers.
 */
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";

import net from "node:net";
import os from "node:os";
import path from "node:path";
import { assertShellRegistry } from "./package-ui-shell.mjs";
import { staticRootIdentity } from "./ui-identity.mjs";

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const packageDirInput =
  value("--package-dir") ??
  path.join(
    "role-model-router",
    "dist",
    "release",
    process.platform === "win32" ? "win32-x64" : `${process.platform}-${process.arch}`,
  );
const packageDir = path.resolve(packageDirInput);
const staticRoot = path.resolve(
  value("--static-root") ??
    path.join("role-model-router", "apps", "runtime-ui-next", "dist", "client"),
);
const fixtureRoot = path.resolve(
  value("--fixture-root") ?? path.join("testdata", "router-runtime", "fixtures"),
);

const problems = [];
if (!existsSync(packageDir)) problems.push(`package directory does not exist: ${packageDir}`);
if (!existsSync(staticRoot)) problems.push(`static root does not exist: ${staticRoot}`);
if (!existsSync(fixtureRoot)) problems.push(`fixture root does not exist: ${fixtureRoot}`);

const manifest = path.join(packageDir, "manifest.json");
let executable;
if (problems.length === 0) {
  if (!existsSync(manifest)) {
    problems.push("no manifest.json beside the executable - cannot pin the binary");
  } else {
    // S109: the manifest names the runtime executable. Picking "any .exe" found the launcher
    // first and the sha pin correctly refused it - the selection, not the pin, was wrong.
    const parsed = JSON.parse(readFileSync(manifest, "utf8"));
    const fromManifest =
      typeof parsed.executable === "string" ? path.join(packageDir, parsed.executable) : undefined;
    const fromName =
      typeof parsed.name === "string"
        ? path.join(packageDir, process.platform === "win32" ? `${parsed.name}.exe` : parsed.name)
        : undefined;
    executable = [fromManifest, fromName]
      .filter((candidate) => candidate !== undefined)
      .find((candidate) => existsSync(candidate));
    if (executable === undefined) {
      problems.push(`manifest does not name an executable present in ${packageDir}`);
    }
  }
}
if (problems.length > 0) {
  console.log(`NOT RUN: ${problems.join("; ")}`);
  process.exit(2);
}

const portFree = await new Promise((resolve) => {
  const probe = net.createServer();
  probe.once("error", () => resolve(false));
  probe.once("listening", () => probe.close(() => resolve(true)));
  probe.listen(0, "127.0.0.1");
});
if (!portFree) {
  console.log("NOT RUN: could not bind a loopback port for the candidate");
  process.exit(2);
}
const port = await new Promise((resolve) => {
  const probe = net.createServer();
  probe.once("listening", () => {
    const address = probe.address();
    probe.close(() =>
      resolve(typeof address === "object" && address !== null ? address.port : undefined),
    );
  });
  probe.listen(0, "127.0.0.1");
});
if (port === undefined) {
  console.log("NOT RUN: could not allocate a port");
  process.exit(2);
}

// S174: a fixed state directory collides between concurrent runs (the review flagged the same
// shape in compare-release). A per-run directory cannot collide and is removed on exit.
const stateRoot = mkdtempSync(path.join(os.tmpdir(), "r39-candidate-state-"));
process.on("exit", () => {
  try {
    rmSync(stateRoot, { force: true, recursive: true });
  } catch {}
});

// S213: the package ships the UI copied at distribution-build time. A gate pointed at the worktree
// build can pass while the package carries older UI - which happened for several rounds (S212).
// When the package has build/client, the static root must BE that directory, byte for byte.
const packageClient = path.join(packageDir, "build", "client");
if (existsSync(packageClient) && path.resolve(staticRoot) !== path.resolve(packageClient)) {
  const { differences } = staticRootIdentity({ packageClient, staticRoot });
  if (differences.length > 0) {
    console.log(
      `FAIL ui identity: the static root is not the bytes this package ships (${differences.slice(0, 4).join("; ")})`,
    );
    console.log(`  static:  ${path.resolve(staticRoot)}`);
    console.log(`  package: ${path.resolve(packageClient)}`);
    console.log(`Pass --static-root ${path.resolve(packageClient)}, or rebuild the distribution.`);
    process.exit(2);
  }
}
// R37: a release may carry both shells. The active selection is materialized into
// build/client; verify the registry and that the served root is exactly the selected shell.
const shellRegistryPath = path.join(packageDir, "build", "ui-shells.json");
if (existsSync(shellRegistryPath)) {
  const registry = assertShellRegistry(JSON.parse(readFileSync(shellRegistryPath, "utf8")));
  const expectedShell = value("--expect-ui-shell");
  if (expectedShell !== undefined && registry.active !== expectedShell) {
    console.log(`FAIL ui shell: release is active "${String(registry.active)}", expected "${expectedShell}"`);
    process.exit(2);
  }
  const selectedPath = registry.shells?.[registry.active];
  if (typeof selectedPath !== "string" || !existsSync(path.join(packageDir, selectedPath))) {
    console.log("FAIL ui shell: active shell artifact is missing");
    process.exit(2);
  }
  const selectedClient = path.join(packageDir, selectedPath);
  const { differences } = staticRootIdentity({
    packageClient: selectedClient,
    staticRoot: path.join(packageDir, "build", "client"),
  });
  if (differences.length > 0) {
    console.log(`FAIL ui shell: build/client is not the active "${registry.active}" shell: ${differences.slice(0, 3).join("; ")}`);
    process.exit(2);
  }
  console.log(`PASS ui shell: active=${registry.active} retainedReact=${registry.retainedReactRelease} stateSchema=${registry.stateSchemaVersion}`);
  if (args.includes("--shell-only")) {
    console.log("PASS ui shell switch selection");
    process.exit(0);
  }
}

const result = spawnSync(
  process.execPath,
  [
    path.join("scripts", "runtime", "verify-client-journeys.mjs"),
    "--manifest",
    manifest,
    "--executable",
    executable,
    "--repo-root",
    packageDir,
    "--static-root",
    staticRoot,
    "--port",
    String(port),
    "--state-root",
    stateRoot,
    "--fixture-root",
    fixtureRoot,
  ],
  { encoding: "utf8", stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 2);

// S192: with --worker-fixtures, run the same journeys against a catalogue that names a specific
// worker and require that worker to be served. This is how the deepseek-official/deepseek-flash
// configuration path gets checked on every run instead of being demonstrated once by hand.
const workerFixtures = value("--worker-fixtures");
const workerModel = value("--expect-model");
if (workerFixtures !== undefined && workerModel !== undefined) {
  console.log(`worker fixtures: ${workerFixtures} (expecting ${workerModel})`);
  const workerResult = spawnSync(
    process.execPath,
    [
      path.join("scripts", "runtime", "verify-client-journeys.mjs"),
      "--manifest",
      manifest,
      "--executable",
      executable,
      "--repo-root",
      packageDir,
      "--static-root",
      staticRoot,
      "--port",
      String(port + 2),
      "--state-root",
      `${stateRoot}-workers`,
      "--fixture-root",
      path.resolve(workerFixtures),
      "--expect-model",
      workerModel,
    ],
    { encoding: "utf8", stdio: "inherit", env: { ...process.env, R39_CHAT_MODEL: workerModel } },
  );
  if (workerResult.status !== 0) process.exit(workerResult.status ?? 2);
}

// S183: optional rendered audit. HTTP checks cannot see an invisible control, a mislabelled one,
// low contrast, or a crash banner - all of which have shipped in this run (S175-S182).
// A missing browser is NOT a failure: the audit reports 2 (not run) and this gate says so.
if (args.includes("--rendered")) {
  const audit = spawnSync(
    process.execPath,
    [
      path.join("scripts", "runtime", "audit-rendered-ui.mjs"),
      "--exe",
      executable,
      "--static-root",
      staticRoot,
      "--fixture-root",
      fixtureRoot,
      "--port",
      String(port + 1),
      "--width",
      "1440",
      "--height",
      "900",
      "--focus",
      "--seed-chat",
      "--expect-overview-cards",
      "3",
      "--studio-run",
      "--theme",
      "light",
      "--control-action",
      "--click-sweep",
    ],
    { encoding: "utf8", stdio: "inherit" },
  );
  if (audit.status === 2) {
    console.log("SKIP rendered: no browser available (set CHROME_PATH to enable)");
    // S201: a skip must not pass when the caller asked for a blocking gate. --require-rendered is
    // the explicit ask; R39_VERIFY_BLOCKING=true is the same ask from CI, and forgetting the flag
    // there was the asymmetry review #2 flagged.
    const blocking = process.env.R39_VERIFY_BLOCKING === "true";
    if (args.includes("--require-rendered") || blocking) {
      console.log(
        "FAIL rendered: a rendered audit was required (--require-rendered or R39_VERIFY_BLOCKING=true) and no browser is available",
      );
      process.exit(2);
    }
  } else if (audit.status !== 0) {
    process.exit(audit.status ?? 2);
  }
}

// R21: packaged/browser diagnostics defect receipt. The candidate is launched again because the
// journey verifier owns and closes its child; this leg injects a stale+loss+missing-build response
// for the already-authorized diagnostics request and records the rendered page.
if (args.includes("--diagnostics")) {
  const receipt = value("--diagnostics-receipt") ?? path.resolve("r21-diagnostics-receipt.json");
  const screenshot =
    value("--diagnostics-screenshot") ?? path.resolve("r21-diagnostics-page.png");
  const diagnostics = spawnSync(
    process.execPath,
    [
      path.join("scripts", "runtime", "verify-packaged-diagnostics.mjs"),
      "--exe",
      executable,
      "--manifest",
      manifest,
      "--static-root",
      staticRoot,
      "--fixture-root",
      fixtureRoot,
      "--receipt",
      receipt,
      "--screenshot",
      screenshot,
    ],
    { encoding: "utf8", stdio: "inherit" },
  );
  if (diagnostics.status !== 0) process.exit(diagnostics.status ?? 2);
}
process.exit(0);
