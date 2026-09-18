import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "vitest";

import {
  ACTIVATION_POLICY_RELATIVE_PATH,
  readLearningPolicyFile,
} from "../src/learning-policy-file.js";

// Run 98 addendum 40 (L5): the measured-latency selection parameters are part of the operator's
// versioned policy document (the same file the other activation parameters live in), resolved with the
// same global -> channel -> scope precedence and the same fail-closed behaviour.
const roots: string[] = [];
const writePolicy = (document: {
  readonly global: Record<string, unknown>;
  readonly channels?: Record<string, unknown>;
  readonly scopes?: Record<string, unknown>;
}): string => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run98-a40-policy-file-"));
  roots.push(root);
  mkdirSync(path.join(root, "shared"), { recursive: true });
  writeFileSync(
    path.join(root, ACTIVATION_POLICY_RELATIVE_PATH),
    JSON.stringify(
      {
        schemaVersion: "role-model.route-learning-activation-policy.v1",
        policyVersion: 7,
        channels: {},
        scopes: {},
        ...document,
      },
      null,
      2,
    ),
    "utf8",
  );
  return root;
};

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

test("a40 L5: the policy document's global section carries the selection parameters", () => {
  const repoRoot = writePolicy({
    global: {
      stage: "S3",
      latencySelection: { enabled: true, minStage: "S3", maxDeltaMs: 5_000, minSamples: 12 },
    },
  });
  const snapshot = readLearningPolicyFile({ repoRoot, channel: "stage", scopeId: "scope-a" });
  expect(snapshot?.latencySelection).toMatchObject({
    source: "config",
    violations: [],
    policy: { enabled: true, minStage: "S3", maxDeltaMs: 5_000, minSamples: 12 },
  });
});

test("a40 L5: a scope override narrows the section instead of replacing it", () => {
  const repoRoot = writePolicy({
    global: { stage: "S3", latencySelection: { enabled: true, minStage: "S3", maxDeltaMs: 5_000 } },
    scopes: { "stage/scope-a": { latencySelection: { maxDeltaMs: 1_000 } } },
  });
  const snapshot = readLearningPolicyFile({ repoRoot, channel: "stage", scopeId: "scope-a" });
  // The scope narrows the delta and keeps the global authorization.
  expect(snapshot?.latencySelection).toMatchObject({
    policy: { enabled: true, minStage: "S3", maxDeltaMs: 1_000 },
  });
});

test("a40 L5: a malformed section fails closed with the reason recorded", () => {
  const repoRoot = writePolicy({
    global: { stage: "S3", latencySelection: { enabled: true, maxDeltaMs: -5 } },
  });
  const snapshot = readLearningPolicyFile({ repoRoot, channel: "stage", scopeId: "scope-a" });
  expect(snapshot?.latencySelection).toMatchObject({
    source: "defaults",
    violations: ["maxDeltaMs"],
    policy: { enabled: false },
  });
});

test("a40 L5: a document without the section resolves to the documented identity defaults", () => {
  const repoRoot = writePolicy({ global: { stage: "S2" } });
  const snapshot = readLearningPolicyFile({ repoRoot, channel: "stage", scopeId: "scope-a" });
  expect(snapshot?.latencySelection).toMatchObject({
    source: "defaults",
    violations: [],
    policy: { enabled: false },
  });
});

// The Configuration page edits flat, typed fields (the private policy registry is flat-field based), so
// the host resolves those names into the same policy object the nested section produces.
test("a40 L5: the flat Configuration fields resolve into the selection policy", () => {
  const repoRoot = writePolicy({
    global: {
      stage: "S3",
      latencySelectionEnabled: true,
      latencySelectionMinStage: "S3",
      latencySelectionMaxDeltaMs: 5_000,
      latencySelectionMinSamples: 9,
      latencySelectionWindowHours: 12,
      latencySelectionBucketBounds: "30000,120000",
      latencySelectionMaxCandidates: 6,
    },
  });
  const snapshot = readLearningPolicyFile({ repoRoot, channel: "stage", scopeId: "scope-a" });
  expect(snapshot?.latencySelection).toMatchObject({
    source: "config",
    violations: [],
    policy: {
      enabled: true,
      minStage: "S3",
      maxDeltaMs: 5_000,
      minSamples: 9,
      windowHours: 12,
      tokenBucketUpperBounds: [30_000, 120_000],
      maxCandidates: 6,
    },
  });
});

test("a40 L5: flat Configuration fields win over the nested section, and a bad bucket list fails closed", () => {
  const repoRoot = writePolicy({
    global: {
      stage: "S3",
      latencySelection: { enabled: false, maxDeltaMs: 1_000 },
      latencySelectionEnabled: true,
      latencySelectionMaxDeltaMs: 3_000,
    },
  });
  const snapshot = readLearningPolicyFile({ repoRoot, channel: "stage", scopeId: "scope-a" });
  expect(snapshot?.latencySelection).toMatchObject({
    policy: { enabled: true, maxDeltaMs: 3_000 },
    violations: [],
  });

  const badBounds = writePolicy({
    global: { stage: "S3", latencySelectionEnabled: true, latencySelectionBucketBounds: "50000,notanumber" },
  });
  const badSnapshot = readLearningPolicyFile({
    repoRoot: badBounds,
    channel: "stage",
    scopeId: "scope-a",
  });
  expect(badSnapshot?.latencySelection).toMatchObject({
    source: "defaults",
    violations: ["tokenBucketUpperBounds"],
    policy: { enabled: false },
  });
});
