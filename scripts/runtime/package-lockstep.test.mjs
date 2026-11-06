/**
 * Run 115 R28/R29 packaged lockstep (S650 wave 2).
 *
 * A public package is only eligible when the private distribution it embeds is the
 * SAME build: its recorded public source tree must match the public worktree tree,
 * and the package manifest's embedded private-distribution digests must match the
 * distribution manifest. The previous clean builds failed later with an opaque
 * "private distribution identity mismatch"; this test pins a small, total validator
 * so the mismatch is reported before packaging.
 *
 * RED at b3d5bcf4: scripts/runtime/package-lockstep.mjs does not exist.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertLockstepIdentity,
  distributionIdentityOf,
} from "./package-lockstep.mjs";

const DISTRIBUTION = {
  publicCommit: "a".repeat(40),
  publicSourceTree: "b".repeat(40),
  sidecar: { artifactSha256: "c".repeat(64) },
  publicRuntimeAdapter: { artifactSha256: "d".repeat(64) },
};
const PACKAGE = {
  source_tree: "b".repeat(40),
  track_b_runtime: {
    public_source_tree: "b".repeat(40),
    manifest_sha256: "e".repeat(64),
    sidecar_sha256: "c".repeat(64),
  },
};

test("matching public tree and embedded distribution digests are accepted", () => {
  const result = assertLockstepIdentity({
    publicTree: "b".repeat(40),
    distribution: DISTRIBUTION,
    packageManifest: PACKAGE,
    distributionManifestSha256: "e".repeat(64),
  });
  assert.equal(result.publicSourceTree, "b".repeat(40));
  assert.equal(result.distributionManifestSha256, "e".repeat(64));
});

test("a distribution built from a different public tree is rejected with the exact mismatch", () => {
  assert.throws(
    () =>
      assertLockstepIdentity({
        publicTree: "f".repeat(40),
        distribution: DISTRIBUTION,
        packageManifest: PACKAGE,
        distributionManifestSha256: "e".repeat(64),
      }),
    /public source tree mismatch.*expected f{40}.*distribution b{40}/s,
  );
});

test("a package embedding a different private distribution digest is rejected", () => {
  const changed = {
    ...PACKAGE,
    track_b_runtime: { ...PACKAGE.track_b_runtime, manifest_sha256: "9".repeat(64) },
  };
  assert.throws(
    () =>
      assertLockstepIdentity({
        publicTree: "b".repeat(40),
        distribution: DISTRIBUTION,
        packageManifest: changed,
        distributionManifestSha256: "e".repeat(64),
      }),
    /private distribution identity mismatch/,
  );
  const changedSidecar = {
    ...PACKAGE,
    track_b_runtime: { ...PACKAGE.track_b_runtime, sidecar_sha256: "9".repeat(64) },
  };
  assert.throws(
    () =>
      assertLockstepIdentity({
        publicTree: "b".repeat(40),
        distribution: DISTRIBUTION,
        packageManifest: changedSidecar,
        distributionManifestSha256: "e".repeat(64),
      }),
    /sidecar identity mismatch/,
  );
});

test("distributionIdentityOf requires every identity field", () => {
  assert.deepEqual(distributionIdentityOf(DISTRIBUTION), {
    publicCommit: "a".repeat(40),
    publicSourceTree: "b".repeat(40),
    sidecarSha256: "c".repeat(64),
    publicRuntimeAdapterSha256: "d".repeat(64),
  });
  assert.throws(
    () => distributionIdentityOf({ ...DISTRIBUTION, publicSourceTree: "" }),
    /distribution manifest is missing publicSourceTree/,
  );
});
