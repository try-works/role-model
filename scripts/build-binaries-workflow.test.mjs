import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../.github/workflows/build-binaries.yml", import.meta.url),
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
