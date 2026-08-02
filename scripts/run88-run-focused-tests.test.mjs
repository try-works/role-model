import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { publicAcceptanceProbes } from "./run88-public-semantic-probes.mjs";
const module = await import("./run88-run-focused-tests.mjs").catch(() => ({}));

test("public package probes are criterion-specific at every required layer", () => {
  const expected = [
    "R1-AC03",
    "R2-AC02",
    "R2-AC03",
    "R2-AC04",
    "R3-AC01",
    "R4-AC05",
    "R6-AC06",
    "R8-AC05",
    "R9-AC01",
    "R9-AC02",
    "R9-AC03",
    "R9-AC04",
    "R9-AC05",
    "R9-AC06",
    "R10-AC02",
    "R11-AC04",
    "R11-AC09",
    "R14-AC06",
  ];
  assert.deepEqual(Object.keys(publicAcceptanceProbes).sort(), expected.sort());
  for (const layer of ["unit", "integration", "regression"]) {
    const probes = expected.map((id) => publicAcceptanceProbes[id]?.[layer]);
    assert.ok(
      probes.every((probe) => typeof probe === "function"),
      `missing ${layer} public package probe`,
    );
    assert.equal(
      new Set(probes).size,
      expected.length,
      `${layer} public package probes reuse generic behavior`,
    );
  }
});

test("public criterion probes do not substitute generic delegates or fabricated readiness values", async () => {
  const packageSource = await readFile(
    new URL("./run88-public-semantic-probes.mjs", import.meta.url),
    "utf8",
  );
  const runtimeSource = await readFile(
    new URL(
      "../role-model-router/apps/runtime-host-bridge/test/run88-public-runtime-probes.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(runtimeSource, /const delegate\s*=|packageR\d+Ac\d+\s*=\s*delegate/);
  assert.doesNotMatch(packageSource, /function cloudReadiness|cloudReadiness\(\{\s*environment:/);
  assert.match(runtimeSource, /validateRun88ProviderResponseObservation/);
});

test("RUN88-U-PUB-R11-AC04 focused runner always aggregates unit, integration, and regression layers", async () => {
  assert.equal(typeof module.runFocusedTests, "function", "missing semantic focused-test runner");
  const called = [];
  const result = await module.runFocusedTests({
    surface: "package",
    acceptance: "R2-AC02",
    expect: "red",
    execute: async (layer) => {
      called.push(layer);
      return { layer, exitCode: layer === "unit" ? 1 : 0 };
    },
  });
  assert.deepEqual(called, ["unit", "integration", "regression"]);
  assert.equal(result.verdict, "PASS");
  await assert.rejects(
    () =>
      module.runFocusedTests({
        surface: "package",
        acceptance: "R2-AC02",
        expect: "green",
        execute: async (layer) => ({ layer, exitCode: layer === "integration" ? 1 : 0 }),
      }),
    /integration/i,
  );
});

test("focused runner emits individual Vitest acceptance IDs for auditable coverage", () => {
  for (const surface of ["package", "runtime"]) {
    for (const command of Object.values(module.focusedTestPlans[surface])) {
      if (command[1][0].includes("vitest")) assert.ok(command[1].includes("--reporter=verbose"));
    }
  }
});
