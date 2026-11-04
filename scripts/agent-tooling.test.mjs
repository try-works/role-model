#!/usr/bin/env node
/**
 * Repository tooling contracts for the agent quality gates (see
 * `docs/plans/agent-quality-gates-and-effect-foldkit-tooling.md`, Phase 0).
 *
 * These assertions are structural on purpose: they pin the workspace build
 * policy, the root vendored-source verification script and its CI wiring, so a
 * later edit cannot quietly drop the guard while every product test still
 * passes.
 *
 * Run with: `node --test scripts/agent-tooling.test.mjs`
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
