import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  DURABLE_EVALUATION_AUTHORITY_VERSION,
  resolveDurableEvaluationAuthority,
} from "../src/track-b-runtime.js";

/**
 * Run 100 addendum `replay-evaluation-learner-spine-completion.addendum-07` P6.
 *
 * The learner's entry points sign their evidence references with
 * `evaluationAuthoritySecret`, which the pipeline minted per run with `randomBytes(32)`. A learner liveness
 * sweep that reconstructs inputs from durable state therefore had nothing to sign with: the store would refuse
 * evidence it cannot attribute. These cases pin the durable authority - the same secret for the same runtime
 * across constructions (a restart), a different secret per channel and per scope, and a hard refusal when the
 * managed key is absent.
 */

function keyFileWith(root: string, bytes: Buffer): string {
  const keyRoot = path.join(root, "managed-keys");
  const keyFile = path.join(keyRoot, "artifact-digest.key");
  // The key directory is created by the runtime's provisioning path; the test writes the file it reads.
  const { mkdirSync } = require("node:fs") as typeof import("node:fs");
  mkdirSync(keyRoot, { recursive: true });
  writeFileSync(keyFile, bytes);
  return keyFile;
}

test("run103 the durable evidence authority survives a restart and separates channels and scopes", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "run103-authority-"));
  try {
    const keyFile = keyFileWith(root, Buffer.from("0123456789abcdef0123456789abcdef", "utf8"));
    const first = await resolveDurableEvaluationAuthority({
      channel: "stage",
      stateRoot: root,
      scopeId: "standalone-runtime-stage",
      artifactDigestKeyFile: keyFile,
    });
    const second = await resolveDurableEvaluationAuthority({
      channel: "stage",
      stateRoot: root,
      scopeId: "standalone-runtime-stage",
      artifactDigestKeyFile: keyFile,
    });
    expect(first.authoritySecret, "a restart must derive the same authority").toBe(
      second.authoritySecret,
    );
    expect(first.authorityVersion).toBe(DURABLE_EVALUATION_AUTHORITY_VERSION);
    expect(first.authoritySecret).toMatch(/^[a-f0-9]{64}$/);
    const otherChannel = await resolveDurableEvaluationAuthority({
      channel: "development",
      stateRoot: root,
      scopeId: "standalone-runtime-stage",
      artifactDigestKeyFile: keyFile,
    });
    const otherScope = await resolveDurableEvaluationAuthority({
      channel: "stage",
      stateRoot: root,
      scopeId: "another-scope",
      artifactDigestKeyFile: keyFile,
    });
    expect(otherChannel.authoritySecret).not.toBe(first.authoritySecret);
    expect(otherScope.authoritySecret).not.toBe(first.authoritySecret);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("run103 the durable evidence authority refuses a missing managed key", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "run103-authority-missing-"));
  try {
    await expect(
      resolveDurableEvaluationAuthority({
        channel: "stage",
        stateRoot: root,
        scopeId: "standalone-runtime-stage",
      }),
    ).rejects.toThrow();
    await expect(
      resolveDurableEvaluationAuthority({
        channel: "",
        stateRoot: root,
        scopeId: "standalone-runtime-stage",
      }),
    ).rejects.toThrow(/channel/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/**
 * Measured live: the runtime publishes the key under its Track B root (`<runtimeRoot>/<scopeId>/track-b/…`), and
 * the first version of this helper only looked at `<runtimeRoot>/managed-keys/…` - so on the stage root it found
 * nothing and silently fell back to a per-run secret. The scoped layout is now a tested candidate.
 */
test("run103 the durable evidence authority finds the key under the scoped Track B root", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "run103-authority-scoped-"));
  try {
    const scopedRoot = path.join(root, "standalone-runtime-stage", "track-b");
    const keyFile = keyFileWith(
      scopedRoot,
      Buffer.from("fedcba9876543210fedcba9876543210", "utf8"),
    );
    const authority = await resolveDurableEvaluationAuthority({
      channel: "stage",
      stateRoot: root,
      scopeId: "standalone-runtime-stage",
    });
    expect(authority.authorityVersion).toBe(DURABLE_EVALUATION_AUTHORITY_VERSION);
    expect(authority.authoritySecret).toMatch(/^[a-f0-9]{64}$/);
    // The same key read through the explicit path yields the same authority.
    const explicit = await resolveDurableEvaluationAuthority({
      channel: "stage",
      stateRoot: root,
      scopeId: "standalone-runtime-stage",
      artifactDigestKeyFile: keyFile,
    });
    expect(explicit.authoritySecret).toBe(authority.authoritySecret);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
