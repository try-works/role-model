#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vitest = path.join(repoRoot, "node_modules", "vitest", "vitest.mjs");
const PLANS = Object.freeze({
  workflow: {
    unit: [process.execPath, ["--test", "scripts/run88-stage-release-workflow.test.mjs"]],
    integration: [
      process.execPath,
      ["--test", "scripts/run88-stage-release-workflow.integration.test.mjs"],
    ],
    regression: [
      process.execPath,
      ["--test", "scripts/run88-stage-release-workflow.regression.test.mjs"],
    ],
  },
  package: {
    unit: [process.execPath, ["--test", "scripts/run88-stage-release.test.mjs"]],
    integration: [
      process.execPath,
      [
        vitest,
        "run",
        "--reporter=verbose",
        "role-model-router/apps/runtime-host-bridge/test/run88-stage-release.integration.test.ts",
      ],
    ],
    regression: [process.execPath, ["--test", "scripts/run88-stage-release-regression.test.mjs"]],
  },
  runtime: {
    unit: [
      process.execPath,
      [
        vitest,
        "run",
        "--reporter=verbose",
        "role-model-router/apps/runtime-host-bridge/test/run88-stage-release.unit.test.ts",
      ],
    ],
    integration: [
      process.execPath,
      [
        vitest,
        "run",
        "--reporter=verbose",
        "role-model-router/apps/runtime-host-bridge/test/run88-stage-release.integration.test.ts",
      ],
    ],
    regression: [
      process.execPath,
      [
        vitest,
        "run",
        "--reporter=verbose",
        "role-model-router/apps/runtime-host-bridge/test/run88-stage-release.regression.test.ts",
      ],
    ],
  },
});

function executeLayer(layer, command) {
  const [executable, args] = command;
  return new Promise((resolve) => {
    const child = spawn(executable, args, {
      cwd: repoRoot,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout = `${stdout}${chunk}`.slice(-65_536);
    });
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-65_536);
    });
    child.on("error", (error) =>
      resolve({ layer, exitCode: -1, stdout, stderr: `${stderr}\n${error.message}` }),
    );
    child.on("close", (code) => resolve({ layer, exitCode: code ?? -1, stdout, stderr }));
  });
}

export async function runFocusedTests({
  surface,
  acceptance,
  expect,
  cumulative = false,
  execute,
} = {}) {
  const plan = PLANS[surface];
  if (!plan || !/^R\d+-AC\d{2}$/.test(acceptance ?? "") || !new Set(["red", "green"]).has(expect))
    throw new Error("focused runner arguments are invalid");
  const results = [];
  for (const layer of ["unit", "integration", "regression"]) {
    results.push(await (execute ? execute(layer, plan[layer]) : executeLayer(layer, plan[layer])));
  }
  const failed = results.filter(({ exitCode }) => exitCode !== 0);
  if (expect === "green" && failed.length)
    throw new Error(`focused GREEN failed layers: ${failed.map(({ layer }) => layer).join(", ")}`);
  if (expect === "red" && failed.length === 0)
    throw new Error("focused RED unexpectedly passed every layer");
  return Object.freeze({
    schemaVersion: "run88-public-focused-tests.v1",
    surface,
    acceptance,
    expected: expect,
    cumulative: Boolean(cumulative),
    results,
    verdict: "PASS",
  });
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? "")).href) {
  runFocusedTests({
    surface: arg("--surface"),
    acceptance: arg("--acceptance"),
    expect: arg("--expect"),
    cumulative: process.argv.includes("--cumulative"),
  })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

export const focusedTestPlans = PLANS;
