import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = () => readFileSync(path.join(root, ".circleci", "config.yml"), "utf8");

test("CircleCI runs the maintained public verification contract", () => {
  const source = config();
  assert.match(source, /cimg\/node:24\.4\.1/);
  assert.match(source, /corepack pnpm install --frozen-lockfile/);
  assert.match(source, /corepack pnpm run ci:check/);
  assert.match(source, /corepack pnpm run runtime:test-router/);
  assert.doesNotMatch(source, /(?<!p)npm\s+(?:install|test)\b|circleci run release/i);
});

test("CircleCI does not deploy or publish releases", () => {
  const source = config();
  assert.doesNotMatch(source, /\bdeploy\b|pages:deploy|build-binaries/i);
});
