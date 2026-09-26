/**
 * Run 101 / R3 (Phase 5 repair) - the release staging must carry the queue policy.
 *
 * The RC built from this branch (`Stage RC 3ebbda8a3eda`) shipped
 * `shared/route-learning-activation-policy.json` but **not**
 * `shared/queue-policy.json`, even though the private distribution stages both.
 * The host resolves the shipped queue policy from `<repo-root>/shared/queue-policy.json`
 * and fails closed to `legacy` when it is absent, so every queue plane in that RC
 * would have stayed inert - the same defect class run 99's R23 recorded for the
 * activation policy ("the release staging used to drop it").
 *
 * RED at the frozen baseline: `releaseRuntimeBundle` does not stage the queue
 * policy, so the source scan below fails.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  QUEUE_POLICY_SCHEMA_VERSION,
  QUEUE_POLICY_SHIPPED_RELATIVE_PATH,
} from "../src/queue-runtime/policy.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const runtimeSource = readFileSync(path.join(here, "..", "src", "track-b-runtime.ts"), "utf8");

describe("run 101 R3 packaged queue policy", () => {
  it("stages the queue policy beside the activation policy, with a fail-closed check", () => {
    assert.equal(QUEUE_POLICY_SHIPPED_RELATIVE_PATH, "shared/queue-policy.json");
    assert.equal(QUEUE_POLICY_SCHEMA_VERSION, "role-model.queue-policy.v1");
    expect(runtimeSource).toContain("Track B runtime distribution queue policy config is missing");
    expect(runtimeSource).toContain("queue-policy.json");
    expect(runtimeSource).toContain(QUEUE_POLICY_SCHEMA_VERSION);
  });

  it("stages it into both release shared directories the packaged host may resolve from", () => {
    const queuePolicyBlock = runtimeSource.slice(
      runtimeSource.indexOf("const queuePolicySource"),
      runtimeSource.indexOf(
        'if (compatibilityGeneration === "N")',
        runtimeSource.indexOf("const queuePolicySource"),
      ),
    );
    assert.ok(queuePolicyBlock.length > 0, "the staging block exists");
    const nested = 'path.join(options.releaseDir, "..", "..", "shared", "queue-policy.json")';
    const sibling = 'path.join(options.releaseDir, "..", "shared", "queue-policy.json")';
    assert.ok(queuePolicyBlock.includes(nested), "the nested release shared directory is staged");
    assert.ok(queuePolicyBlock.includes(sibling), "the host release shared directory is staged");
    assert.equal(
      queuePolicyBlock.split(nested).length - 1,
      1,
      "the nested destination appears once",
    );
    assert.equal(
      queuePolicyBlock.split(sibling).length - 1,
      1,
      "the sibling destination appears once",
    );
  });

  it(
    "keeps the private distribution's packaged-config list in step",
    () => {
      // The private list is the source of the file; this test fails if one side gains a
      // document the other does not stage.
      const privateList = readFileSync(
        path.join(
          here,
          "..",
          "..",
          "..",
          "..",
          ".cache",
          "paired-private",
          "scripts",
          "track-b",
          "distribution-shared-config.mjs",
        ),
        "utf8",
      );
      assert.match(privateList, /"queue-policy\.json"/);
    },
    { skip: !process.env.ROLE_MODEL_PRIVATE_WORKTREE },
  );
});
