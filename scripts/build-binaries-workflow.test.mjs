import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../.github/workflows/build-binaries.yml", import.meta.url),
  "utf8",
);
const acceptanceWorkflow = readFileSync(
  new URL("../.github/workflows/accept-release-candidate.yml", import.meta.url),
  "utf8",
);

test("build-binaries retries release attestation before failing", () => {
  assert.match(workflow, /Attest release archive \(attempt 1\)/);
  assert.match(workflow, /Attest release archive \(attempt 2\)/);
  assert.match(workflow, /Attest release archive \(attempt 3\)/);
  assert.match(workflow, /Assert attestation succeeded after retries/);
  assert.match(workflow, /steps\.attest_release_archive_attempt_1\.outcome == 'failure'/);
  assert.match(workflow, /steps\.attest_release_archive_attempt_2\.outcome == 'failure'/);
});

test("build-binaries pins one exact Node patch for reproducible SEA payloads", () => {
  const exactPins = workflow.match(/node-version: "24\.19\.0"/g) ?? [];
  assert.equal(exactPins.length, 2);
  assert.doesNotMatch(workflow, /node-version:\s*24(?:\s|$)/);
});

test("build-binaries produces stage candidates, manual dev builds, and tag-only releases", () => {
  assert.match(workflow, /branches:\s*\n\s*- stage/);
  assert.match(workflow, /ROLE_MODEL_BUILD_CHANNEL/);
  assert.match(workflow, /development/);
  assert.match(workflow, /stage/);
  assert.match(workflow, /production/);
  assert.match(workflow, /core_payload_sha256/);
  assert.match(workflow, /source_tree/);
  assert.match(workflow, /github\.ref_type == 'tag'/);
  assert.match(workflow, /role-model-stage/);
  assert.match(workflow, /role-model-dev/);
});

test("production artifacts include the exact private runtime tested at stage", () => {
  assert.match(workflow, /private_source_commit/);
  assert.match(workflow, /extension_count/);
  assert.match(workflow, /sidecar_sha256/);
  assert.match(workflow, /private_distribution_sha256/);
  assert.match(workflow, /--verify-production-manifest/);
});

test("the public release orchestrator enforces paired private promotion", () => {
  assert.match(workflow, /workflow_run\.head_branch -ne "stage"/);
  assert.match(workflow, /run\.conclusion -eq "success"/);
  assert.match(workflow, /run\.event -eq "push"/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /Verify private revision passed paired promotion branch/);
  assert.match(workflow, /REQUIRED_PRIVATE_BRANCH:[\s\S]*?'main'[\s\S]*?'stage'/);
  assert.match(workflow, /git merge-base --is-ancestor/);
});

test("stage pushes publish downloadable prereleases before stable promotion", () => {
  assert.match(workflow, /^ {2}publish-stage-prerelease:/m);
  assert.match(workflow, /github\.ref == 'refs\/heads\/stage'/);
  assert.match(workflow, /stage-rc-\$\{short_sha\}/);
  assert.match(workflow, /role-model-stage-candidate-\*/);
  assert.match(workflow, /--prerelease/);
  assert.match(workflow, /SHA256SUMS\.txt/);
});

test("stable tags require a manually accepted exact stage candidate", () => {
  assert.match(workflow, /rc-approved/);
  assert.match(workflow, /candidate\.workflow_run\.head_sha/);
  assert.match(workflow, /Stable release tag must be exact SemVer/);
  assert.match(workflow, /Production tag must point to a commit promoted through main/);
});

test("release candidate acceptance is explicit, checksum-bound, and manual only", () => {
  assert.match(acceptanceWorkflow, /workflow_dispatch:/);
  assert.doesNotMatch(acceptanceWorkflow, /^ {2}push:/m);
  assert.match(acceptanceWorkflow, /candidate_tag:/);
  assert.match(acceptanceWorkflow, /accept:/);
  assert.match(acceptanceWorkflow, /isPrerelease/);
  assert.match(acceptanceWorkflow, /sha256sum -c SHA256SUMS\.txt/);
  for (const target of ["linux-x64", "darwin-x64", "darwin-arm64", "win32-x64"]) {
    assert.match(acceptanceWorkflow, new RegExp(target));
  }
  assert.match(acceptanceWorkflow, /rc-approved\/\$CANDIDATE_SHA/);
});
