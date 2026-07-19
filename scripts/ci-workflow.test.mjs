import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
const packageManifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

test("CI is scoped to long-lived branches with stable cancellable lanes", () => {
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- dev\s*\n\s*- stage\s*\n\s*- main/);
  assert.match(
    workflow,
    /pull_request:\s*\n\s*branches:\s*\n\s*- dev\s*\n\s*- stage\s*\n\s*- main/,
  );
  assert.match(workflow, /concurrency:[\s\S]*cancel-in-progress: true/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.doesNotMatch(workflow, /--frozen-lockfile=false/);
  for (const job of [
    "promotion-guard",
    "quality",
    "build-test",
    "runtime-critical",
    "runtime-router",
    "rust",
    "smoke",
  ]) {
    assert.match(workflow, new RegExp(`^  ${job}:`, "m"));
  }
});

test("promotion guard encodes dev to stage to main with a hotfix exception", () => {
  assert.match(workflow, /BASE_REF.*stage[\s\S]*HEAD_REF.*dev/);
  assert.match(workflow, /BASE_REF.*main[\s\S]*HEAD_REF.*stage/);
  assert.match(workflow, /hotfix\//);
  assert.match(workflow, /Invalid promotion source/);
});

test("workspace tests serialize the resource-heavy runtime proofs", () => {
  assert.match(
    packageManifest.scripts.test,
    /--filter=\.\/\*\* --filter=!@role-model-router\/runtime-host-bridge --filter=!@try-works\/pi-role-model test.*--filter @role-model-router\/runtime-host-bridge test.*--filter @try-works\/pi-role-model test/,
  );
});
