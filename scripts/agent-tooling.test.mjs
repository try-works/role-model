#!/usr/bin/env node
/**
 * Repository tooling contracts for the agent quality gates (see
 * `docs/plans/agent-quality-gates-and-effect-foldkit-tooling.md`, Phases 0 and 3).
 *
 * These assertions are structural on purpose: they pin the workspace build
 * policy, the root vendored-source verification script and its CI wiring, the
 * repo-local Foldkit/Effect skills, the devtools MCP registration and the skill
 * inventory, so a later edit cannot quietly drop the guard while every product
 * test still passes.
 *
 * Run with: `node --test scripts/agent-tooling.test.mjs`
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const readText = (relativePath) => readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(readText(relativePath));

/** The top-level `key:` block of a small YAML document, as raw lines. */
function topLevelBlock(source, key) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const start = lines.findIndex((line) => line === `${key}:`);
  if (start === -1) return null;
  const block = [];
  for (const line of lines.slice(start + 1)) {
    if (line === "" || line.startsWith(" ")) {
      block.push(line);
      continue;
    }
    break;
  }
  return block;
}

/** A YAML block-sequence entry list, with surrounding quotes removed. */
function yamlList(source, key) {
  const block = topLevelBlock(source, key);
  if (block === null) return null;
  return block
    .filter((line) => line.trim().startsWith("- "))
    .map((line) =>
      line
        .trim()
        .slice(2)
        .trim()
        .replace(/^["']|["']$/g, ""),
    );
}

/** The indented step block starting at line `index` of a job slice. */
function workflowStep(job, index) {
  const lines = job.split("\n");
  const step = [lines[index]];
  const stepIndent = lines[index].search(/\S/u);
  for (const line of lines.slice(index + 1)) {
    if (line.trim() !== "" && line.search(/\S/u) <= stepIndent) break;
    step.push(line);
  }
  return step.join("\n");
}

/** One job block of the CI workflow, from its header to the next job header. */
function workflowJob(workflow, name) {
  const start = workflow.indexOf(`\n  ${name}:\n`);
  if (start === -1) return null;
  const rest = workflow.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[A-Za-z0-9_-]+:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

/** Upstream names declared in scripts/vendor-upstream.mjs UPSTREAMS. */
function upstreamNames(source) {
  const start = source.indexOf("const UPSTREAMS = {");
  assert.notEqual(start, -1, "UPSTREAMS declaration not found");
  const end = source.indexOf("\n};", start);
  const block = source.slice(start, end === -1 ? undefined : end);
  const names = [];
  for (const line of block.split("\n")) {
    const match = /^ {2}(?:"([^"]+)"|([A-Za-z0-9_-]+)): \{$/.exec(line);
    if (match) names.push(match[1] ?? match[2]);
  }
  return names;
}

test("pnpm workspace build policy is valid and honest under the pinned pnpm", () => {
  const workspace = readText("pnpm-workspace.yaml");
  assert.doesNotMatch(
    workspace,
    /set this to true or false/u,
    "placeholder allowBuilds values are not a build policy",
  );
  assert.equal(
    topLevelBlock(workspace, "allowBuilds"),
    null,
    "allowBuilds is not supported by pnpm 10.6.5; onlyBuiltDependencies is the policy",
  );

  const onlyBuiltDependencies = yamlList(workspace, "onlyBuiltDependencies");
  assert.ok(onlyBuiltDependencies, "pnpm-workspace.yaml must declare onlyBuiltDependencies");
  assert.deepEqual(
    [...onlyBuiltDependencies].sort(),
    ["@biomejs/biome", "esbuild", "sharp", "workerd"],
    "onlyBuiltDependencies must be exactly the four approved build-script packages",
  );

  const packages = yamlList(workspace, "packages");
  assert.ok(packages, "pnpm-workspace.yaml must still declare the workspace globs");
  for (const glob of [
    "apps/*",
    "packages/*",
    "role-model-router/packages/*",
    "role-model-router/apps/*",
  ]) {
    assert.ok(packages.includes(glob), `workspace glob ${glob} must remain present`);
  }
});

test("root verify:vendors script covers every vendored upstream", () => {
  const manifest = readJson("package.json");
  const command = manifest.scripts?.["verify:vendors"];
  assert.equal(typeof command, "string", "root package.json must define a verify:vendors script");

  const names = upstreamNames(readText("scripts/vendor-upstream.mjs"));
  assert.deepEqual(
    names.sort(),
    ["crease", "effect", "effect-mq", "foldkit"],
    "UPSTREAMS should still describe the four vendored source drops",
  );
  for (const name of names) {
    assert.ok(
      command.includes(`--name ${name} --verify`),
      `verify:vendors must verify the ${name} source drop`,
    );
  }
});

/** Index of a direct workflow step command inside one job block, or -1. */
function workflowRunIndex(job, command) {
  return job.split("\n").findIndex((line) => line.trim() === `- run: ${command}`);
}

test("CI quality job verifies vendored upstream pins after lint", () => {
  const workflow = readText(".github/workflows/ci.yml").replaceAll("\r\n", "\n");
  const quality = workflowJob(workflow, "quality");
  assert.ok(quality, "CI quality job not found");
  const qualityIndex = workflowRunIndex(quality, "pnpm run ci:quality");
  const verifyIndex = workflowRunIndex(quality, "pnpm run verify:vendors");
  assert.notEqual(
    qualityIndex,
    -1,
    "quality job must run pnpm run ci:quality (lint and schema validation)",
  );
  assert.notEqual(verifyIndex, -1, "quality job must run pnpm run verify:vendors");
  assert.ok(
    verifyIndex > qualityIndex,
    "vendor verification must run after ci:quality so lint runs first",
  );
  assert.doesNotMatch(
    workflowStep(quality, verifyIndex),
    /continue-on-error:\s*true/u,
    "vendor verification must not be allowed to fail",
  );
});
/** Every `--filter=<value>` token of a script command, in order. */
function workspaceFilters(command) {
  return [...command.matchAll(/--filter=\S+/gu)].map((match) => match[0]);
}

/** The step block containing `needle`, or null when no step mentions it. */
function workflowStepContaining(job, needle) {
  const index = job.split("\n").findIndex((line) => line.includes(needle));
  return index === -1 ? null : workflowStep(job, index);
}

const TYPECHECK_COVERAGE_FILE = "scripts/quality/typecheck-coverage.json";

test("root typecheck script runs turbo over the build workspace filters", () => {
  const { scripts } = readJson("package.json");
  const command = scripts?.typecheck;
  assert.equal(typeof command, "string", "root package.json must define a typecheck script");

  const generateIndex = command.indexOf("types:generate");
  const turboIndex = command.indexOf("turbo run typecheck");
  assert.notEqual(generateIndex, -1, "typecheck must run types:generate first");
  assert.notEqual(turboIndex, -1, "typecheck must invoke turbo run typecheck");
  assert.ok(generateIndex < turboIndex, "types:generate must run before turbo run typecheck");

  const buildFilters = workspaceFilters(scripts.build ?? "");
  assert.ok(buildFilters.length > 0, "root build script must declare workspace filters to mirror");
  assert.deepEqual(
    [...workspaceFilters(command)].sort(),
    [...buildFilters].sort(),
    "typecheck must run turbo with the same workspace filters as build",
  );
});

test("turbo typecheck task builds workspace dependencies first", () => {
  const { tasks } = readJson("turbo.json");
  const task = tasks?.typecheck;
  assert.ok(task, "turbo.json must define a typecheck task");
  assert.deepEqual(
    task.dependsOn,
    ["^build"],
    "turbo typecheck must depend on dependency builds so workspace types exist",
  );
});

test("CI typecheck job installs the pinned toolchain and runs the gate", () => {
  const workflow = readText(".github/workflows/ci.yml").replaceAll("\r\n", "\n");
  const job = workflowJob(workflow, "typecheck");
  assert.ok(job, "CI workflow must define a typecheck job");

  assert.match(job, /uses:\s*actions\/checkout@v4/u, "typecheck job must check out the repository");
  const pnpmStep = workflowStepContaining(job, "pnpm/action-setup@v4");
  assert.ok(pnpmStep, "typecheck job must set up pnpm");
  assert.match(pnpmStep, /version:\s*10\.6\.5/u, "typecheck job must pin pnpm 10.6.5");
  const nodeStep = workflowStepContaining(job, "actions/setup-node@v4");
  assert.ok(nodeStep, "typecheck job must set up Node.js");
  assert.match(nodeStep, /node-version:\s*24\b/u, "typecheck job must use Node.js 24");

  const installIndex = workflowRunIndex(job, "pnpm install --frozen-lockfile");
  const typecheckIndex = workflowRunIndex(job, "pnpm run typecheck");
  assert.notEqual(installIndex, -1, "typecheck job must run pnpm install --frozen-lockfile");
  assert.notEqual(typecheckIndex, -1, "typecheck job must run pnpm run typecheck");
  assert.ok(typecheckIndex > installIndex, "typecheck must run after the frozen-lockfile install");
  assert.doesNotMatch(
    workflowStep(job, typecheckIndex),
    /continue-on-error:\s*true/u,
    "the typecheck gate must not be allowed to fail",
  );

  const timeout = /timeout-minutes:\s*(\d+)/u.exec(job);
  assert.ok(timeout, "typecheck job must declare timeout-minutes");
  const minutes = Number(timeout[1]);
  assert.ok(
    minutes > 0 && minutes <= 20,
    `typecheck job timeout must be <= 20 minutes (found ${minutes})`,
  );
});

test("typecheck coverage ratchet is honest about the checked packages", () => {
  const coveragePath = path.join(REPO_ROOT, TYPECHECK_COVERAGE_FILE);
  assert.ok(existsSync(coveragePath), `${TYPECHECK_COVERAGE_FILE} must exist`);
  const coverage = JSON.parse(readFileSync(coveragePath, "utf8"));

  assert.equal(coverage.version, 1, "typecheck coverage must declare version 1");
  assert.equal(coverage.wave, 1, "typecheck coverage must declare wave 1");
  assert.equal(
    typeof coverage.note,
    "string",
    "typecheck coverage must document the append-only review rule in the file",
  );
  assert.match(coverage.note, /append-only/iu, "the coverage note must state the append-only rule");
  assert.ok(Array.isArray(coverage.packages), "typecheck coverage must declare a packages array");
  assert.ok(coverage.packages.length > 0, "typecheck coverage must not be empty");

  for (const entry of coverage.packages) {
    assert.equal(typeof entry.dir, "string", "every coverage entry must have a string dir");
    assert.ok(entry.dir.length > 0, "every coverage entry must name a package directory");
    assert.equal(typeof entry.command, "string", `${entry.dir}: command must be a string`);
    assert.ok(entry.command.length > 0, `${entry.dir}: command must not be empty`);
    assert.ok(!entry.dir.includes("\\"), `${entry.dir}: use repo-relative POSIX paths`);
    assert.ok(
      !entry.dir.startsWith("/") && !entry.dir.startsWith("."),
      `${entry.dir}: must be a repo-relative directory`,
    );
    assert.ok(
      !entry.dir.split("/").includes(".."),
      `${entry.dir}: must not escape the repository root`,
    );

    const manifestPath = path.join(REPO_ROOT, entry.dir, "package.json");
    assert.ok(existsSync(manifestPath), `${entry.dir}: coverage entry must name a real package`);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    assert.equal(
      manifest.scripts?.typecheck,
      entry.command,
      `${entry.dir}: package.json scripts.typecheck must equal the coverage command`,
    );
  }

  const dirs = coverage.packages.map((entry) => entry.dir);
  assert.deepEqual(dirs, [...new Set(dirs)].sort(), "coverage dirs must be unique and sorted");
});

test("root oxlint scripts and CI quality steps enforce the effect gate", () => {
  const manifest = readJson("package.json");
  const lint = manifest.scripts?.["lint:oxlint"];
  const report = manifest.scripts?.["lint:oxlint:report"];
  assert.equal(typeof lint, "string", "root package.json must define lint:oxlint");
  assert.equal(typeof report, "string", "root package.json must define lint:oxlint:report");
  assert.match(
    lint,
    /effect-tsgo oxlint\b/u,
    "lint:oxlint must use the effect-tsgo oxlint wrapper",
  );
  assert.match(
    lint,
    /--config \.oxlintrc\.effect\.json\b/u,
    "lint:oxlint must load the effect config",
  );
  assert.match(lint, /--deny-warnings\b/u, "lint:oxlint must deny warnings to enforce the gate");
  assert.match(
    report,
    /^node scripts\/quality\/oxlint-report\.mjs$/u,
    "the report must run the committed report helper",
  );
  const reportSource = readText("scripts/quality/oxlint-report.mjs");
  assert.match(
    reportSource,
    /--config", EFFECT_CONFIG/u,
    "the report must load the effect config through the shared constant",
  );
  assert.doesNotMatch(
    reportSource,
    /["']--deny-warnings["']/u,
    "the report must not pass --deny-warnings to oxlint",
  );
  assert.match(
    manifest.scripts?.["lint:oxlint:baseline"] ?? "",
    /^node scripts\/quality\/oxlint-baseline-check\.mjs$/u,
    "the baseline check must run the committed check helper",
  );

  const enforcedScope = [
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
  for (const scopePath of enforcedScope) {
    assert.ok(lint.includes(scopePath), `lint:oxlint must cover ${scopePath}`);
  }

  const workflow = readText(".github/workflows/ci.yml").replaceAll("\r\n", "\n");
  const quality = workflowJob(workflow, "quality");
  assert.ok(quality, "CI quality job not found");
  const qualityIndex = workflowRunIndex(quality, "pnpm run ci:quality");
  const lintIndex = workflowRunIndex(quality, "pnpm run lint:oxlint");
  const baselineIndex = workflowRunIndex(quality, "pnpm run lint:oxlint:baseline");
  assert.notEqual(qualityIndex, -1, "quality job must run pnpm run ci:quality");
  assert.notEqual(lintIndex, -1, "quality job must run pnpm run lint:oxlint");
  assert.ok(lintIndex > qualityIndex, "the oxlint gate must run after ci:quality");
  assert.doesNotMatch(
    workflowStep(quality, lintIndex),
    /continue-on-error:\s*true/u,
    "the oxlint gate must not be allowed to fail",
  );
  assert.notEqual(baselineIndex, -1, "quality job must run pnpm run lint:oxlint:baseline");
  assert.ok(baselineIndex > lintIndex, "the baseline check must run after the oxlint gate");
  assert.doesNotMatch(
    workflowStep(quality, baselineIndex),
    /continue-on-error:\s*true/u,
    "the baseline check must not be allowed to fail",
  );
  assert.equal(
    quality.split("\n").filter((line) => line.trim() === "- run: pnpm run lint:oxlint").length,
    1,
    "the quality job must run the oxlint gate exactly once",
  );
});

/** Names of installed skills: directories under `.agents/skills` that contain a SKILL.md. */
function installedSkillNames() {
  return readdirSync(path.join(REPO_ROOT, ".agents/skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(path.join(REPO_ROOT, ".agents/skills", name, "SKILL.md")))
    .sort();
}

/** The YAML frontmatter fields of a SKILL.md, parsed from its leading `---` block. */
function skillFrontmatter(source) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  assert.equal(lines[0], "---", "SKILL.md must open with a YAML frontmatter delimiter");
  const end = lines.indexOf("---", 1);
  assert.notEqual(end, -1, "SKILL.md must close its YAML frontmatter");
  const fields = new Map();
  for (const line of lines.slice(1, end)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/u.exec(line);
    if (match) fields.set(match[1], match[2].trim());
  }
  return fields;
}

/** Concrete `vendor/...` paths referenced by a document (glob tokens are skipped). */
function referencedVendorPaths(source) {
  const tokens = source.match(/vendor\/[A-Za-z0-9._/-]+/gu) ?? [];
  const paths = new Set();
  for (const token of tokens) {
    const candidate = token.replace(/[.,;:]+$/u, "").replace(/\/+$/u, "");
    if (!candidate.includes("*")) paths.add(candidate);
  }
  return [...paths].sort();
}

/**
 * Installed skills with no skills-lock.json entry, each with the reason it is
 * allowlisted instead. The names here are checked against the actual uncovered
 * set; no computedHash is ever written by hand, so an entry carries evidence
 * (a PROVENANCE.md or recorded CLI output), never a guessed hash.
 */
const UNLOCKED_SKILL_ALLOWLIST = [
  {
    name: "effect-ts",
    reason:
      "Installed copy pinned in .agents/skills/effect-ts/PROVENANCE.md (upstream commit, sha256 and the three-line local delta); `npx skills list --json` reports it untracked and the CLI metadata hash is not reproducible from the tree.",
  },
  {
    name: "effect-v3-to-v4",
    reason:
      "Installed copy pinned in .agents/skills/effect-v3-to-v4/PROVENANCE.md (upstream commit and sha256); `npx skills list --json` reports it untracked and the CLI metadata hash is not reproducible from the tree.",
  },
  {
    name: "foldkit",
    reason:
      "Repo-local skill authored for this repository in Phase 3 of the agent-quality-gates plan; it is not installed from an upstream registry, so there is no lock source or CLI-computable hash.",
  },
  {
    name: "swiss-design",
    reason:
      "No upstream source or provenance is recorded in-repo; `npx skills list --json` reports it untracked with no source, so there is no verified source to lock.",
  },
  {
    name: "ui-design-system",
    reason:
      "No upstream source or provenance is recorded in-repo; `npx skills list --json` reports it untracked with no source, so there is no verified source to lock.",
  },
];

test("repo-local Foldkit skill points at the vendored source and records provenance", () => {
  const skill = readText(".agents/skills/foldkit/SKILL.md");
  assert.equal(skillFrontmatter(skill).get("name"), "foldkit");

  for (const required of [
    "vendor/foldkit",
    "vendor/foldkit/packages/foldkit/src",
    "vendor/foldkit/packages/typing-game/client/src",
    "vendor/foldkit/packages/website/src",
  ]) {
    assert.ok(skill.includes(required), `Foldkit skill must reference ${required}`);
  }
  assert.doesNotMatch(skill, /repos\/foldkit/u, "the Foldkit subtree is not vendored under repos/");
  assert.match(skill, /examples\/\*\*/u, "the skill must call out the upstream examples directory");
  assert.match(skill, /not vendored/iu, "the skill must state that examples/** is not vendored");

  const referenced = referencedVendorPaths(skill);
  assert.ok(referenced.length > 0, "the Foldkit skill must reference the vendored source");
  for (const relativePath of referenced) {
    assert.ok(
      existsSync(path.join(REPO_ROOT, relativePath)),
      `Foldkit skill references ${relativePath}, which does not exist`,
    );
  }

  const provenance = readText(".agents/skills/foldkit/PROVENANCE.md");
  assert.match(provenance, /foldkit@0\.169\.0/u, "provenance must record the vendored tag");
  assert.match(
    provenance,
    /7ee214268c602967937b80f6f20d1e831f2e8ab6/u,
    "provenance must record the upstream commit",
  );
  assert.match(
    provenance,
    /packages\/create-foldkit-app\/templates\/base\/FOLDKIT\.md/u,
    "provenance must record the upstream source path",
  );
  assert.match(
    provenance,
    /528a49661fa7265fcf4f724413b8b004ce43e5f5773dcd0e178ec300ec9f7faf/u,
    "provenance must record the sha256 of the adapted source",
  );
});

test("every installed skill is locked or allowlisted with a concrete reason", () => {
  const lock = readJson("skills-lock.json");
  const lockEntries = lock.skills ?? {};
  const installed = installedSkillNames();

  const allowlistNames = UNLOCKED_SKILL_ALLOWLIST.map((entry) => entry.name);
  assert.equal(
    new Set(allowlistNames).size,
    allowlistNames.length,
    "allowlist names must be unique",
  );
  for (const entry of UNLOCKED_SKILL_ALLOWLIST) {
    assert.ok(installed.includes(entry.name), `allowlisted skill ${entry.name} must exist on disk`);
    assert.equal(typeof entry.reason, "string");
    assert.ok(
      entry.reason.trim().length >= 20,
      `allowlist reason for ${entry.name} is not concrete`,
    );
  }

  const uncovered = installed.filter((name) => !(name in lockEntries));
  assert.deepEqual(
    [...allowlistNames].sort(),
    uncovered,
    "the in-test allowlist must cover exactly the installed skills missing from skills-lock.json",
  );
  assert.ok(
    installed.length > uncovered.length,
    "skills-lock.json must still track the installed marketplace skills",
  );

  for (const name of Object.keys(lockEntries)) {
    assert.ok(
      installed.includes(name),
      `skills-lock.json entry ${name} must be an installed skill`,
    );
    const entry = lockEntries[name];
    assert.equal(typeof entry.source, "string", `${name}.source must be a string`);
    assert.ok(entry.source.trim().length > 0, `${name}.source must be non-empty`);
    assert.equal(typeof entry.sourceType, "string", `${name}.sourceType must be a string`);
    assert.ok(entry.sourceType.trim().length > 0, `${name}.sourceType must be non-empty`);
    assert.match(
      entry.computedHash,
      /^[0-9a-f]{64}$/u,
      `${name}.computedHash must be a CLI-computed sha256`,
    );
  }
});

test("AGENTS.md routes agents to the Foldkit skill and the vendored source", () => {
  const agents = readText("AGENTS.md");
  assert.ok(
    agents.includes(".agents/skills/foldkit/SKILL.md"),
    "AGENTS.md must tell agents to read the Foldkit skill",
  );
  assert.ok(
    agents.includes("vendor/foldkit"),
    "AGENTS.md must point at the vendored Foldkit source",
  );
});

test("root .mcp.json registers exactly one Foldkit devtools server", () => {
  const config = readJson(".mcp.json");
  const servers = Object.entries(config.mcpServers ?? {});
  assert.equal(servers.length, 1, ".mcp.json must register exactly one MCP server");
  const [name, server] = servers[0];
  assert.equal(name, "foldkit-devtools");
  assert.equal(server.command, "npx");
  assert.deepEqual(server.args, ["-y", "@foldkit/devtools-mcp"]);
  assert.equal(
    existsSync(path.join(REPO_ROOT, "role-model-router/apps/runtime-ui-next/.mcp.json")),
    false,
    "the Foldkit devtools MCP is registered once, at the repository root",
  );
});

test("Effect skill body redirects to the vendored Effect source", () => {
  const skill = readText(".agents/skills/effect-ts/SKILL.md");
  assert.equal(
    skill.match(/node_modules\/effect/gu),
    null,
    "the Effect skill body must not point at the absent node_modules/effect package",
  );
  assert.ok(
    skill.includes("vendor/effect"),
    "the Effect skill body must redirect to vendor/effect",
  );

  for (const relativePath of referencedVendorPaths(skill)) {
    assert.ok(
      existsSync(path.join(REPO_ROOT, relativePath)),
      `Effect skill references ${relativePath}, which does not exist`,
    );
  }

  const provenance = readText(".agents/skills/effect-ts/PROVENANCE.md");
  assert.match(
    provenance,
    /node_modules\/effect/u,
    "PROVENANCE must record the replaced upstream pointers as a local delta",
  );
  assert.match(provenance, /vendor\/effect/u, "PROVENANCE must record the vendor redirect");
});
