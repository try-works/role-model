import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { runPublicAcceptanceProbe } from "./run88-public-semantic-probes.mjs";
const module = await import("./run88-stage-release.mjs").catch(() => ({}));

const input = {
  schemaVersion: "run88-public-stage-identity.v1",
  channel: "stage",
  name: "role-model-stage",
  port: 3457,
  publicSource: "a".repeat(40),
  publicSourceTree: "b".repeat(40),
  privateDistribution: {
    generation: "N",
    manifestSha256: "c".repeat(64),
    sidecarSha256: "d".repeat(64),
  },
  package: {
    executableSha256: "e".repeat(64),
    corePayloadSha256: "f".repeat(64),
    embeddedPrivateManifestSha256: "c".repeat(64),
  },
};

test("RUN88-U-PUB-R2-AC02 public stage identity binds source, private distribution, and packaged bytes", () => {
  assert.equal(
    typeof module.validatePublicStageIdentity,
    "function",
    "missing semantic public stage identity",
  );
  const result = module.validatePublicStageIdentity(input);
  assert.match(result.identitySha256, /^[0-9a-f]{64}$/);
  assert.equal(result.channel, "stage");
});

test("source-only, wrong distribution, stale, mixed, tampered, future, and production identities fail", () => {
  assert.equal(
    typeof module.validatePublicStageIdentity,
    "function",
    "missing semantic public stage identity",
  );
  for (const bad of [
    { ...input, channel: "production" },
    { ...input, package: { ...input.package, embeddedPrivateManifestSha256: "0".repeat(64) } },
    { ...input, privateDistribution: { ...input.privateDistribution, generation: "N+1" } },
    { ...input, package: { ...input.package, executableSha256: "bad" } },
    { ...input, privateDistribution: undefined },
  ])
    assert.throws(
      () => module.validatePublicStageIdentity(bad),
      /stage|distribution|generation|sha256|incomplete/i,
    );
});

test("actual packaged manifest binding writes and verifies the canonical Run 88 release identity", async () => {
  assert.equal(
    typeof module.bindRun88StageManifest,
    "function",
    "missing actual package identity binder",
  );
  const root = await mkdtemp(path.join(os.tmpdir(), "run88-package-bind-"));
  const manifestPath = path.join(root, "manifest.json");
  await writeFile(
    manifestPath,
    JSON.stringify({
      channel: "stage",
      name: "role-model-stage",
      host: "127.0.0.1",
      port: 3457,
      endpoint: "http://127.0.0.1:3457",
      state_root_name: "role-model-runtime-stage",
      scope_id: "standalone-runtime-stage",
      source_tree: "a".repeat(40),
      executable_sha256: "e".repeat(64),
      core_payload_sha256: "f".repeat(64),
      track_b_runtime: { manifest_sha256: "c".repeat(64), compatibility_generation: "N" },
    }),
  );
  const releaseId = `sha256:${"9".repeat(64)}`;
  const result = await module.bindRun88StageManifest({
    manifestPath,
    releaseId,
    privateDistributionSha256: "c".repeat(64),
  });
  const persisted = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(persisted.release_id, releaseId);
  assert.equal(persisted.private_distribution_sha256, "c".repeat(64));
  assert.equal(result.releaseId, releaseId);
  await assert.rejects(
    () =>
      module.bindRun88StageManifest({
        manifestPath,
        releaseId: `sha256:${"8".repeat(64)}`,
        privateDistributionSha256: "d".repeat(64),
      }),
    /distribution|mismatch/i,
  );
  await rm(root, { recursive: true, force: true });
});

const packageUnitIds = [
  "R2-AC03",
  "R2-AC04",
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
  "R14-AC06",
];

for (const acceptanceId of packageUnitIds) {
  test(`RUN88-U-PUB-${acceptanceId}`, () => runPublicAcceptanceProbe(acceptanceId, "unit"));
}
