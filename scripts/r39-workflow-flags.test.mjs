import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

/**
 * S215: the R39 steps only run in CI, so a flag the script does not accept is invisible locally.
 * This reads the workflow, extracts every `--flag` passed to each runtime script, and requires the
 * script source to mention it. It cannot prove the value is right - only that the option exists,
 * which is the failure mode that actually happens when a script grows a new required flag.
 */
const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

const workflow = read(".github/workflows/build-binaries.yml");

// The composite gate (verify-packaged-candidate.mjs) is a LOCAL convenience: it starts its own host,
// so running it beside the individual CI steps would contend for the same ports. CI runs the pieces.
const SCRIPTS = [
  ["scripts/runtime/compare-release.mjs", "compare-release.mjs"],
  ["scripts/runtime/verify-client-journeys.mjs", "verify-client-journeys.mjs"],
  ["scripts/runtime/audit-rendered-ui.mjs", "audit-rendered-ui.mjs"],
];

/** Every `node scripts/runtime/<script>.mjs …` invocation in the workflow, with its arguments. */
const invocations = (script) => {
  const lines = workflow.split("\n");
  const found = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes(`scripts/runtime/${script}`)) continue;
    const block = [lines[index]];
    for (let next = index + 1; next < Math.min(index + 20, lines.length); next += 1) {
      block.push(lines[next]);
      if (!/\\\s*$/.test(lines[next])) break;
    }
    found.push(block.join(" "));
  }
  return found;
};

for (const [path, script] of SCRIPTS) {
  test(`S215: every --flag the workflow passes to ${script} exists in the script`, () => {
    const source = read(path);
    const seen = invocations(script);
    assert.ok(seen.length > 0, `the workflow still invokes ${script}`);
    const missing = [];
    for (const invocation of seen) {
      for (const match of invocation.matchAll(/(?<![\w-])--[a-z][a-z0-9-]*/g)) {
        const flag = match[0];
        if (!source.includes(`"${flag}"`) && !source.includes(flag)) missing.push(flag);
      }
    }
    assert.deepEqual(
      [...new Set(missing)],
      [],
      `the workflow passes flags ${script} does not accept`,
    );
  });
}

test("S215: the R39 steps use distinct loopback ports", () => {
  const ports = [...workflow.matchAll(/--(?:left-port|right-port|port)\s+(\d+)/g)].map(
    (match) => match[1],
  );
  assert.ok(ports.length >= 4, "the workflow still binds several ports");
  assert.equal(new Set(ports).size, ports.length, `two R39 steps share a port: ${ports.join(",")}`);
});

test("S225: every workspace package's declared types entry resolves", () => {
  const root = new URL("../", import.meta.url);
  const packages = [
    "role-model-router/packages/effect/package.json",
    "role-model-router/packages/protocol-routing/package.json",
  ];
  const missing = [];
  for (const relative of packages) {
    const file = new URL(relative, root);
    const manifest = JSON.parse(readFileSync(file, "utf8"));
    const types = manifest.exports?.["."]?.types;
    if (typeof types !== "string") continue;
    const target = new URL(types, file);
    if (!existsSync(target)) missing.push(`${relative} -> ${types}`);
  }
  assert.deepEqual(
    missing,
    [],
    "a published type entry points at a file the build does not produce",
  );
});

test("S215: the advisory flag can be flipped to blocking", () => {
  const advisory =
    workflow.match(/continue-on-error: \$\{\{ vars\.R39_VERIFY_BLOCKING != 'true' \}\}/g) ?? [];
  assert.ok(advisory.length >= 3, "each R39 step is advisory through the same variable");
  // The CLI guard is PowerShell interpolation, not an exported env var: the scripts themselves never
  // see R39_VERIFY_BLOCKING in CI, so a NOT RUN has to be caught here.
  const guards = workflow.match(/did NOT RUN while R39_VERIFY_BLOCKING=true/g) ?? [];
  assert.ok(guards.length >= 2, "both audits refuse to skip while the gate is blocking");
});

test("S215: CI runs the individual R39 checks, not the local composite gate", () => {
  assert.ok(workflow.includes("scripts/runtime/compare-release.mjs"));
  assert.ok(workflow.includes("scripts/runtime/verify-client-journeys.mjs"));
  assert.ok(workflow.includes("scripts/runtime/audit-rendered-ui.mjs"));
  assert.equal(
    workflow.includes("scripts/runtime/verify-packaged-candidate.mjs"),
    false,
    "the composite gate would contend for the same ports",
  );
});
