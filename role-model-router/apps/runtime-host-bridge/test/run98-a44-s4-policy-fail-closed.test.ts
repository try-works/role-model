import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  ACTIVATION_POLICY_RELATIVE_PATH,
  readLearningPolicyFile,
} from "../src/learning-policy-file.js";

/**
 * Run 98 addendum 44 `A44-S4`: a bad policy file fails closed.
 *
 * The host reads this file on the routing path, but it only checked the schema *version*: a bound-violating
 * file was coerced field by field, an unknown stage fell back to the shipped default (which is S4, i.e. the
 * most active stage), and a missing or truncated file answered `null` so every caller had to guess. The
 * acceptance is explicit — base-route decisions, a bounded receipt naming the failing field or version, and a
 * degraded Configuration state — so a bad input now resolves to stage S0 with the reason attached, and a
 * restored file resolves to the file's own digest again.
 */
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const policyDocument = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: "role-model.route-learning-activation-policy.v1",
  policyVersion: 7,
  global: { stage: "S4" },
  channels: {},
  scopes: {},
  ...overrides,
});

const withPolicy = (content: unknown): string => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run98-a44-s4-"));
  roots.push(root);
  mkdirSync(path.join(root, "shared"), { recursive: true });
  writeFileSync(
    path.join(root, ACTIVATION_POLICY_RELATIVE_PATH),
    typeof content === "string" ? content : JSON.stringify(content, null, 2),
    "utf8",
  );
  return root;
};

const emptyRoot = (): string => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run98-a44-s4-none-"));
  roots.push(root);
  return root;
};

describe("run98 a44 s4 policy file fail-closed", () => {
  test("a missing, truncated or unknown-version file resolves to the base route with a bounded receipt", () => {
    const missing = readLearningPolicyFile({ repoRoot: emptyRoot(), channel: "stage" });
    expect(missing?.effective.stage).toBe("S0");
    expect(missing?.degraded?.reason).toBe("policy_source_missing");
    expect(missing?.degraded?.detail).toMatch(/no readable policy source/i);

    const truncated = readLearningPolicyFile({
      repoRoot: withPolicy('{"schemaVersion":"role-model.route-learning-activation-policy.v1",'),
      channel: "stage",
    });
    expect(truncated?.effective.stage).toBe("S0");
    expect(truncated?.degraded?.reason).toBe("policy_source_unreadable");

    const unknownVersion = readLearningPolicyFile({
      repoRoot: withPolicy(policyDocument({ schemaVersion: "role-model.route-learning-activation-policy.v9" })),
      channel: "stage",
    });
    expect(unknownVersion?.effective.stage).toBe("S0");
    expect(unknownVersion?.degraded?.reason).toBe("policy_source_unknown_version");
    expect(unknownVersion?.degraded?.version).toBe("role-model.route-learning-activation-policy.v9");
  });

  test("a bound-violating or unknown-valued file resolves to the base route and names the field", () => {
    const outOfRange = readLearningPolicyFile({
      repoRoot: withPolicy(policyDocument({ global: { stage: "S4", scoreBand: 4 } })),
      channel: "stage",
    });
    expect(outOfRange?.effective.stage).toBe("S0");
    expect(outOfRange?.degraded?.reason).toBe("policy_source_invalid_field");
    expect(outOfRange?.degraded?.field).toBe("scoreBand");

    // An unknown stage used to fall back to the shipped default, which is the most active stage.
    const unknownStage = readLearningPolicyFile({
      repoRoot: withPolicy(policyDocument({ channels: { stage: { stage: "S9" } } })),
      channel: "stage",
    });
    expect(unknownStage?.effective.stage).toBe("S0");
    expect(unknownStage?.degraded?.field).toBe("stage");

    const brokenInvariant = readLearningPolicyFile({
      repoRoot: withPolicy(
        policyDocument({
          global: {
            stage: "S4",
            minDecisiveComparisons: 3,
            minHoldoutComparisons: 5,
          },
        }),
      ),
      channel: "stage",
    });
    expect(brokenInvariant?.effective.stage).toBe("S0");
    expect(brokenInvariant?.degraded?.field).toBe("minHoldoutComparisons");
  });

  test("a valid file resolves normally, carries no degradation, and a restore changes the digest back", () => {
    const root = withPolicy(policyDocument({ channels: { stage: { stage: "S4" } } }));
    const valid = readLearningPolicyFile({ repoRoot: root, channel: "stage" });
    expect(valid?.effective.stage).toBe("S4");
    expect(valid?.degraded).toBeUndefined();
    const restoredDigest = valid?.digest;

    writeFileSync(path.join(root, ACTIVATION_POLICY_RELATIVE_PATH), "{ not json", "utf8");
    const broken = readLearningPolicyFile({ repoRoot: root, channel: "stage" });
    expect(broken?.effective.stage).toBe("S0");
    expect(broken?.digest).not.toBe(restoredDigest);

    // Restoring the file restores the last valid policy and its digest without a rebuild.
    writeFileSync(
      path.join(root, ACTIVATION_POLICY_RELATIVE_PATH),
      JSON.stringify(policyDocument({ channels: { stage: { stage: "S4" } } }), null, 2),
      "utf8",
    );
    const restored = readLearningPolicyFile({ repoRoot: root, channel: "stage" });
    expect(restored?.effective.stage).toBe("S4");
    expect(restored?.digest).toBe(restoredDigest);
  });
});
