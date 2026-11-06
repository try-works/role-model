#!/usr/bin/env node
/**
 * oxlint + @effect/tsgo policy contracts for the agent quality gates (see
 * `docs/plans/agent-quality-gates-and-effect-foldkit-tooling.md`, Phase 2).
 *
 * T2.1/T2.2 spawn the `effect-tsgo oxlint` wrapper from the installed devDependency
 * (never a bare `.bin` shim, which is not spawnable on Windows) against the two
 * fixture files. T2.3/T2.5 are structural: they parse the committed configs and the
 * committed baseline without spawning a linter, so this file is also cheap in CI.
 *
 * Run with: `node --test scripts/oxlint-policy.test.mjs`
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const EFFECT_CONFIG = ".oxlintrc.effect.json";
const BASE_CONFIG = ".oxlintrc.json";
const BASELINE = "scripts/quality/oxlint-baseline.json";
const FIXTURE_DIR = "scripts/fixtures/oxlint";

const readText = (relativePath) => readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const toNative = (relativePath) => relativePath.split("/").join(path.sep);

/** Effective rule severities: every `extends` entry merged under the config's own rules. */
function effectiveRules(configPath) {
  const config = readJson(configPath);
  const merged = {};
  for (const entry of config.extends ?? []) {
    const resolved = path.posix.normalize(
      entry.startsWith(".") ? path.posix.join(path.posix.dirname(configPath), entry) : entry,
    );
    Object.assign(merged, readJson(resolved).rules ?? {});
  }
  Object.assign(merged, config.rules ?? {});
  return Object.fromEntries(Object.entries(merged).filter(([, severity]) => severity !== "off"));
}

/**
 * The enforced wave-1 scope from plan section 9. Every path is asserted to exist by
 * T2.5; the root script and the baseline must both cover exactly this set.
 */
const REQUIRED_SCOPE = [
  "role-model-router/packages/effect/src",
  "role-model-router/packages/effect/build.mjs",
  "role-model-router/packages/effect/entries.mjs",
  "role-model-router/packages/foldkit/build.mjs",
  "role-model-router/packages/foldkit/entries.mjs",
  "role-model-router/packages/foldkit/test",
  "role-model-router/packages/foldkit-ui/build.mjs",
  "role-model-router/packages/foldkit-ui/entries.mjs",
  "role-model-router/apps/runtime-ui-next/src",
];

/** Resolve an installed package's JS bin so it can be spawned with process.execPath. */
function packageBin(packageName, preferredBin) {
  const packageRoot = path.join(REPO_ROOT, "node_modules", packageName);
  const manifestPath = path.join(packageRoot, "package.json");
  assert.ok(
    existsSync(manifestPath),
    `${packageName} must be installed; run "corepack pnpm install --frozen-lockfile"`,
  );
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const bin =
    typeof manifest.bin === "string"
      ? manifest.bin
      : (manifest.bin?.[preferredBin] ?? Object.values(manifest.bin ?? {})[0]);
  assert.equal(typeof bin, "string", `${packageName} must expose a bin entry`);
  assert.ok(existsSync(path.join(packageRoot, bin)), `${packageName}/${bin} must exist`);
  return path.join(packageRoot, bin);
}

/** Run the wrapper on one fixture and return its status and combined output. */
function lintFixture(fixture) {
  const result = spawnSync(
    process.execPath,
    [
      packageBin("@effect/tsgo", "effect-tsgo"),
      "oxlint",
      "--config",
      EFFECT_CONFIG,
      "--deny-warnings",
      fixture,
    ],
    { cwd: REPO_ROOT, encoding: "utf8", timeout: 180_000 },
  );
  return {
    status: result.status,
    signal: result.signal,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

test("T2.1 the Effect anti-pattern fixture is rejected by the effecttsgo gate", () => {
  const { status, signal, output } = lintFixture(`${FIXTURE_DIR}/effect-antipattern.ts`);
  assert.equal(signal, null, `the gate must not be killed by a timeout; output:\n${output}`);
  assert.notEqual(status, 0, `the anti-pattern fixture must fail the gate; output:\n${output}`);
  assert.match(output, /effecttsgo\(try-catch-in-effect-gen\)/u);
});

test("T2.2 the clean Effect fixture passes the effecttsgo gate", () => {
  const { status, signal, output } = lintFixture(`${FIXTURE_DIR}/effect-clean.ts`);
  assert.equal(signal, null, `the gate must not be killed by a timeout; output:\n${output}`);
  assert.equal(status, 0, `the clean fixture must pass the gate; output:\n${output}`);
  assert.doesNotMatch(output, /effecttsgo\(/u);
});

test("T2.3 the configs keep Biome ownership and mirror the committed baseline", () => {
  const effectConfig = readJson(EFFECT_CONFIG);
  assert.ok(Array.isArray(effectConfig.extends), "the effect config must extend presets");
  assert.ok(
    effectConfig.extends.some((entry) => entry.includes("@effect/tsgo/oxlint-presets/")),
    "the effect config must extend an @effect/tsgo oxlint preset",
  );
  assert.equal(
    effectConfig.rules?.["effecttsgo/unstable-api-usage"],
    "off",
    "unstable-api-usage stays off until the vendored Effect line is stable",
  );

  const baseline = readJson(BASELINE);
  const enabled = effectiveRules(EFFECT_CONFIG);
  assert.deepEqual(
    Object.keys(enabled).sort(),
    Object.keys(baseline.enforcedRules).sort(),
    "the effective enabled effecttsgo rules must equal the baseline enforced rules",
  );
  for (const rule of Object.keys(enabled)) {
    assert.match(
      String(enabled[rule]),
      /^(warn|error)$/u,
      `${rule} must be enabled at warn or error`,
    );
  }

  const baseConfig = readJson(BASE_CONFIG);
  for (const [rule, severity] of Object.entries(baseConfig.rules ?? {})) {
    assert.doesNotMatch(
      rule,
      /(sort-imports|consistent-type-assertions|oxfmt)/u,
      `Biome owns ${rule}; the oxlint base config must not duplicate it`,
    );
    assert.ok(severity === "off" || typeof severity === "string");
  }
  assert.ok(
    !(baseConfig.extends ?? []).some((entry) => /foldkit/u.test(entry)),
    "@foldkit/oxlint-plugin is deferred; the base config must not load it",
  );
  for (const ignore of ["vendor/**", ".worktrees/**", "node_modules/**", "dist/**"]) {
    assert.ok(
      (baseConfig.ignorePatterns ?? []).includes(ignore),
      `the base config must ignore ${ignore}`,
    );
  }

  // Deliberate omission of the template's first "oxlint src": Biome stays the base
  // linter and formatter (plan section 1), so oxlint is additive only.
  const manifest = readJson("package.json");
  assert.ok(
    !String(manifest.scripts?.lint ?? "").includes("oxlint"),
    "Biome must remain the base lint command",
  );
});

test("T2.5 the committed baseline is a zero-finding ratchet over existing paths", () => {
  const baseline = readJson(BASELINE);
  assert.equal(baseline.version, 1, "baseline schema version must be 1");
  assert.ok(Array.isArray(baseline.scope), "baseline.scope must be an array of paths");
  assert.deepEqual(
    [...baseline.scope].sort(),
    [...REQUIRED_SCOPE].sort(),
    "baseline.scope must be exactly the enforced wave-1 scope",
  );
  for (const scopePath of baseline.scope) {
    assert.equal(typeof scopePath, "string");
    assert.ok(
      existsSync(path.join(REPO_ROOT, toNative(scopePath))),
      `every enforced scope path must exist: ${scopePath}`,
    );
  }

  const enabledRules = effectiveRules(EFFECT_CONFIG);
  const enforced = Object.entries(baseline.enforcedRules ?? {});
  assert.ok(enforced.length > 0, "the baseline must enforce at least one rule");
  for (const [rule, count] of enforced) {
    assert.match(rule, /^effecttsgo\/[a-z0-9-]+$/u, `unexpected rule id: ${rule}`);
    assert.equal(count, 0, `enforced rule ${rule} must be recorded at 0, got ${count}`);
    assert.match(
      String(enabledRules[rule]),
      /^(warn|error)$/u,
      `enforced rule ${rule} must be enabled in ${EFFECT_CONFIG}`,
    );
  }

  const reportOnly = Object.entries(baseline.reportOnly ?? {});
  assert.deepEqual(
    reportOnly.map(([rule]) => rule).sort(),
    enforced.map(([rule]) => rule).sort(),
    "every enabled rule needs one report-only count",
  );
  for (const [rule, count] of reportOnly) {
    assert.match(rule, /^effecttsgo\/[a-z0-9-]+$/u, `unexpected rule id: ${rule}`);
    assert.ok(
      Number.isInteger(count) && count >= 0,
      `report-only count for ${rule} must be a non-negative integer, got ${count}`,
    );
  }
});
