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
    "track-b-runtime",
  ]) {
    assert.match(workflow, new RegExp(`^  ${job}:`, "m"));
  }
});

test("Track B CI is always-on, explicit, and runs the tagged browser contract", () => {
  assert.match(workflow, /^ {2}track-b-runtime:/m);
  assert.doesNotMatch(workflow, /track-b-runtime:[\s\S]*?if:\s*\$\{\{\s*false\s*\}\}/);
  assert.match(workflow, /recursive-87-ci-contract\.test\.ts/);
  assert.match(workflow, /@recursive:94-direct-track-b-storage-graph-cloud-roundtrip/);
  assert.match(workflow, /--ci-contract/);
  assert.match(workflow, /playwright install --with-deps chromium/);
  assert.match(workflow, /repository:\s*try-works\/role-model-internal/);
  assert.match(workflow, /PRIVATE_PAIRED_SHA/);
  assert.match(workflow, /ROLE_MODEL_PUBLIC_WORKTREE/);
  const trackBJob = workflow.slice(workflow.indexOf("  track-b-runtime:"));
  const publicBuild = trackBJob.indexOf("run: pnpm run build");
  assert.notEqual(publicBuild, -1, "the paired Track B job must build the public workspace");
  assert.ok(
    publicBuild < trackBJob.indexOf("corepack pnpm build:run00-runtime"),
    "the public workspace must be built before private paired tests import public dist files",
  );
  for (const required of [
    "run87-recommendation-fixture-server.mjs",
    "--qa-extension-manifest",
    "--fixture-root",
    "--recommendation-material-file",
  ]) {
    assert.match(
      trackBJob,
      new RegExp(required.replaceAll("-", "\\-")),
      `paired browser gate missing ${required}`,
    );
  }
});

test("Track B browser gate waits for semantic readiness without weakening exact private pairing", () => {
  const trackBJob = workflow.slice(workflow.indexOf("  track-b-runtime:"));
  const privateValidation = trackBJob.indexOf("Validate exact private paired revision");
  const privateCheckout = trackBJob.indexOf("Checkout exact private paired repository");
  const readinessGate = trackBJob.indexOf("wait-for-runtime-readiness.mjs");
  const browserGate = trackBJob.indexOf(
    "playwright test --grep @recursive:94-direct-track-b-storage-graph-cloud-roundtrip",
  );

  assert.match(trackBJob, /if \[\[ ! "\$PRIVATE_PAIRED_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
  assert.match(trackBJob, /ref: \$\{\{ env\.PRIVATE_PAIRED_SHA \}\}/);
  assert.ok(privateValidation >= 0, "the exact private SHA validation must remain present");
  assert.ok(privateCheckout > privateValidation, "the private checkout must follow SHA validation");
  assert.ok(readinessGate > privateCheckout, "semantic readiness must run after paired checkout");
  assert.ok(browserGate > readinessGate, "Playwright must run only after semantic readiness");
  assert.match(trackBJob, /--timeout-ms\s+120000/);
  assert.match(trackBJob, /--poll-interval-ms\s+1000/);
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
