#!/usr/bin/env node
/**
 * Run 115 R39: verify a packaged candidate with no arguments.
 *
 * Resolves the package directory, finds the executable, chooses a free port and a fresh
 * temp state root, and delegates to verify-client-journeys.mjs. This exists so the
 * maintained flow (validate-packaging) can call one command instead of remembering five
 * arguments - and so the arguments cannot drift between callers.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const packageDirInput = value("--package-dir") ?? path.join(
  "role-model-router",
  "dist",
  "release",
  process.platform === "win32" ? "win32-x64" : `${process.platform}-${process.arch}`,
);
const packageDir = path.resolve(packageDirInput);
const staticRoot = path.resolve(
  value("--static-root") ?? path.join("role-model-router", "apps", "runtime-ui-next", "dist", "client"),
);
const fixtureRoot = path.resolve(
  value("--fixture-root") ?? path.join("testdata", "router-runtime", "fixtures"),
);

const problems = [];
if (!existsSync(packageDir)) problems.push("package directory does not exist: " + packageDir);
if (!existsSync(staticRoot)) problems.push("static root does not exist: " + staticRoot);
if (!existsSync(fixtureRoot)) problems.push("fixture root does not exist: " + fixtureRoot);

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
      problems.push("manifest does not name an executable present in " + packageDir);
    }
  }
}
if (problems.length > 0) {
  console.log("NOT RUN: " + problems.join("; "));
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
    probe.close(() => resolve(typeof address === "object" && address !== null ? address.port : undefined));
  });
  probe.listen(0, "127.0.0.1");
});
if (port === undefined) {
  console.log("NOT RUN: could not allocate a port");
  process.exit(2);
}

const stateRoot = path.join(os.tmpdir(), "r39-candidate-state");
rmSync(stateRoot, { force: true, recursive: true });

const result = spawnSync(
  process.execPath,
  [
    path.join("scripts", "runtime", "verify-client-journeys.mjs"),
    "--manifest", manifest,
    "--executable", executable,
    "--repo-root", packageDir,
    "--static-root", staticRoot,
    "--port", String(port),
    "--state-root", stateRoot,
    "--fixture-root", fixtureRoot,
  ],
  { encoding: "utf8", stdio: "inherit" },
);
process.exit(result.status ?? 2);
