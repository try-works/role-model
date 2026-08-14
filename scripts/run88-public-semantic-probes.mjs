import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  validatePublicRollbackTarget,
  validatePublicStageIdentity,
} from "./run88-stage-release.mjs";

const sha = (character) => character.repeat(64);
const ref = (character) => character.repeat(40);

const stageIdentity = (overrides = {}) => ({
  schemaVersion: "run88-public-stage-identity.v1",
  channel: "stage",
  name: "role-model-stage",
  port: 3457,
  publicSource: ref("a"),
  publicSourceTree: ref("b"),
  privateDistribution: {
    generation: "N",
    manifestSha256: sha("c"),
    sidecarSha256: sha("d"),
  },
  package: {
    executableSha256: sha("e"),
    corePayloadSha256: sha("f"),
    embeddedPrivateManifestSha256: sha("c"),
  },
  ...overrides,
});

const rollbackTarget = (overrides = {}) => ({
  channel: "stage",
  ref: ref("1"),
  sourceTree: ref("2"),
  packageSha256: sha("3"),
  compatibilityGeneration: "N",
  ...overrides,
});

async function workflowBytes() {
  const [ci, binaries] = await Promise.all([
    readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/build-binaries.yml", import.meta.url), "utf8"),
  ]);
  return Object.freeze({ ci, binaries, combined: `${ci}\n${binaries}` });
}

function lines(text) {
  return text.split(/\r?\n/).map((line) => line.trim());
}

export const publicAcceptanceProbes = Object.freeze({
  "R1-AC03": Object.freeze({
    unit: async () => {
      const { ci, binaries } = await workflowBytes();
      assert.ok(lines(ci).includes("promotion-guard:"));
      assert.ok(lines(binaries).includes("- stage"));
      assert.ok(binaries.includes("github.ref_name == 'stage' && 'stage'"));
      return { acceptanceId: "R1-AC03", layer: "unit", enforcement: "workflow-bytes" };
    },
    integration: async () => {
      const { ci, binaries } = await workflowBytes();
      assert.ok(ci.includes("ROLE_MODEL_PAIRED_PRIVATE_SHA"));
      assert.ok(binaries.includes("Validate exact private stage revision"));
      assert.ok(binaries.includes("Bind canonical Run 88 identity into stage package"));
      return {
        acceptanceId: "R1-AC03",
        layer: "integration",
        enforcement: "paired-stage-workflow",
      };
    },
    regression: async () => {
      const { combined } = await workflowBytes();
      assert.ok(combined.includes('BASE_REF" == "stage"'));
      assert.ok(combined.includes('HEAD_REF" != "dev"'));
      assert.ok(!combined.includes("environment: production"));
      assert.ok(!combined.includes("wrangler deploy"));
      return { acceptanceId: "R1-AC03", layer: "regression", enforcement: "production-refusal" };
    },
  }),
  "R2-AC02": Object.freeze({
    unit: async () => {
      const identity = validatePublicStageIdentity(stageIdentity());
      assert.equal(
        identity.privateDistribution.manifestSha256,
        identity.package.embeddedPrivateManifestSha256,
      );
      return { acceptanceId: "R2-AC02", layer: "unit", enforcement: "distribution-binding" };
    },
    integration: async () => {
      const { binaries } = await workflowBytes();
      assert.ok(binaries.includes("ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT"));
      assert.ok(binaries.includes("ROLE_MODEL_PRIVATE_DISTRIBUTION_MANIFEST_SHA256"));
      assert.ok(binaries.includes("package/private distribution mismatch"));
      return {
        acceptanceId: "R2-AC02",
        layer: "integration",
        enforcement: "packaged-distribution",
      };
    },
    regression: async () => {
      assert.throws(
        () =>
          validatePublicStageIdentity(
            stageIdentity({
              package: { ...stageIdentity().package, embeddedPrivateManifestSha256: sha("0") },
            }),
          ),
        /distribution/i,
      );
      return { acceptanceId: "R2-AC02", layer: "regression", enforcement: "source-only-refusal" };
    },
  }),
  "R2-AC03": Object.freeze({
    unit: async () => {
      const identity = validatePublicStageIdentity(stageIdentity());
      assert.deepEqual(
        [identity.channel, identity.name, identity.port],
        ["stage", "role-model-stage", 3457],
      );
      return { acceptanceId: "R2-AC03", layer: "unit", enforcement: "stage-endpoint-identity" };
    },
    integration: async () => {
      const identity = validatePublicStageIdentity(stageIdentity());
      assert.equal(identity.publicSource.length, 40);
      assert.equal(identity.package.executableSha256.length, 64);
      assert.equal(identity.package.corePayloadSha256.length, 64);
      return {
        acceptanceId: "R2-AC03",
        layer: "integration",
        enforcement: "package-byte-identity",
      };
    },
    regression: async () => {
      assert.throws(() => validatePublicStageIdentity(stageIdentity({ port: 3456 })), /stage/i);
      assert.throws(
        () => validatePublicStageIdentity(stageIdentity({ name: "role-model" })),
        /stage/i,
      );
      return { acceptanceId: "R2-AC03", layer: "regression", enforcement: "non-stage-refusal" };
    },
  }),
  "R2-AC04": Object.freeze({
    unit: async () => {
      const first = validatePublicStageIdentity(stageIdentity());
      const second = validatePublicStageIdentity(structuredClone(stageIdentity()));
      assert.equal(first.identitySha256, second.identitySha256);
      return { acceptanceId: "R2-AC04", layer: "unit", enforcement: "deterministic-identity" };
    },
    integration: async () => {
      const original = stageIdentity();
      const reordered = Object.fromEntries(Object.entries(original).reverse());
      assert.equal(
        validatePublicStageIdentity(original).identitySha256,
        validatePublicStageIdentity(reordered).identitySha256,
      );
      return { acceptanceId: "R2-AC04", layer: "integration", enforcement: "canonical-bytes" };
    },
    regression: async () => {
      const original = validatePublicStageIdentity(stageIdentity()).identitySha256;
      const changed = validatePublicStageIdentity(
        stageIdentity({ package: { ...stageIdentity().package, corePayloadSha256: sha("9") } }),
      ).identitySha256;
      assert.notEqual(original, changed);
      return {
        acceptanceId: "R2-AC04",
        layer: "regression",
        enforcement: "digest-drift-detection",
      };
    },
  }),
  "R3-AC01": Object.freeze({
    unit: async () => {
      const { ci } = await workflowBytes();
      assert.ok(ci.includes('BASE_REF" == "stage"'));
      assert.ok(ci.includes('HEAD_REF" != "dev"'));
      return { acceptanceId: "R3-AC01", layer: "unit", enforcement: "dev-to-stage-only" };
    },
    integration: async () => {
      const { ci, binaries } = await workflowBytes();
      assert.ok(ci.includes("promotion-guard"));
      assert.ok(binaries.includes("Validate exact private stage revision"));
      assert.ok(binaries.includes("ROLE_MODEL_PAIRED_PRIVATE_SHA"));
      return {
        acceptanceId: "R3-AC01",
        layer: "integration",
        enforcement: "protected-promotion-bytes",
      };
    },
    regression: async () => {
      const { ci } = await workflowBytes();
      assert.ok(ci.includes("Invalid promotion source: stage only accepts dev."));
      assert.ok(ci.includes("exit 1"));
      assert.ok(!ci.includes("git push --force"));
      return { acceptanceId: "R3-AC01", layer: "regression", enforcement: "wrong-head-refusal" };
    },
  }),
  "R4-AC05": Object.freeze({
    unit: async () => {
      const { binaries } = await workflowBytes();
      assert.ok(binaries.includes('"phase5.mock"'));
      assert.ok(binaries.includes("Forbidden QA/mock marker"));
      return {
        acceptanceId: "R4-AC05",
        layer: "unit",
        enforcement: "phase5-live-cloud-evidence-required",
      };
    },
    integration: async () => {
      assert.equal(validatePublicStageIdentity(stageIdentity()).channel, "stage");
      const { combined } = await workflowBytes();
      assert.ok(!combined.includes("wrangler deploy"));
      assert.ok(!combined.includes("livePlatformState: true"));
      return {
        acceptanceId: "R4-AC05",
        layer: "integration",
        enforcement: "phase5-live-platform-state-required",
      };
    },
    regression: async () => {
      assert.throws(
        () => validatePublicStageIdentity(stageIdentity({ channel: "production" })),
        /stage/i,
      );
      const { combined } = await workflowBytes();
      assert.ok(!combined.includes("cloudReadiness({"));
      return {
        acceptanceId: "R4-AC05",
        layer: "regression",
        enforcement: "offline-readiness-substitution-refused",
      };
    },
  }),
  "R6-AC06": Object.freeze({
    unit: async () => {
      assert.equal(validatePublicRollbackTarget(rollbackTarget()).ok, true);
      return {
        acceptanceId: "R6-AC06",
        layer: "unit",
        enforcement: "phase5-measured-soak-decision-required",
      };
    },
    integration: async () => {
      const target = validatePublicRollbackTarget(
        rollbackTarget({ compatibilityGeneration: "N-1" }),
      );
      assert.equal(target.channel, "stage");
      assert.equal(target.compatibilityGeneration, "N-1");
      return {
        acceptanceId: "R6-AC06",
        layer: "integration",
        enforcement: "phase5-threshold-receipt-required",
      };
    },
    regression: async () => {
      assert.throws(
        () => validatePublicRollbackTarget(rollbackTarget({ channel: "production" })),
        /stage/i,
      );
      const { binaries } = await workflowBytes();
      assert.ok(binaries.includes("Forbidden QA/mock marker"));
      return {
        acceptanceId: "R6-AC06",
        layer: "regression",
        enforcement: "fabricated-soak-pass-refused",
      };
    },
  }),
  "R8-AC05": Object.freeze({
    unit: async () => {
      const { binaries } = await workflowBytes();
      assert.ok(binaries.includes('"phase5.mock"'));
      return {
        acceptanceId: "R8-AC05",
        layer: "unit",
        enforcement: "phase5-live-outage-recovery-required",
      };
    },
    integration: async () => {
      const identity = validatePublicStageIdentity(stageIdentity());
      assert.equal(identity.package.embeddedPrivateManifestSha256, sha("c"));
      return {
        acceptanceId: "R8-AC05",
        layer: "integration",
        enforcement: "runtime-outbox-and-live-cloud-recovery-required",
      };
    },
    regression: async () => {
      assert.throws(
        () => validatePublicRollbackTarget(rollbackTarget({ packageSha256: "not-a-digest" })),
        /sha256/i,
      );
      return {
        acceptanceId: "R8-AC05",
        layer: "regression",
        enforcement: "unbound-recovery-target-refused",
      };
    },
  }),
  "R9-AC01": Object.freeze({
    unit: async () => {
      const target = validatePublicRollbackTarget(rollbackTarget());
      assert.deepEqual(
        [target.ref, target.sourceTree, target.packageSha256],
        [ref("1"), ref("2"), sha("3")],
      );
      return {
        acceptanceId: "R9-AC01",
        layer: "unit",
        enforcement: "phase5-immutable-snapshot-required",
      };
    },
    integration: async () => {
      const current = validatePublicStageIdentity(stageIdentity());
      const target = validatePublicRollbackTarget(rollbackTarget());
      assert.equal(current.channel, target.channel);
      assert.notEqual(current.publicSource, target.ref);
      return {
        acceptanceId: "R9-AC01",
        layer: "integration",
        enforcement: "candidate-and-recovery-target-bound",
      };
    },
    regression: async () => {
      assert.throws(
        () => validatePublicRollbackTarget(rollbackTarget({ sourceTree: undefined })),
        /identity/i,
      );
      assert.throws(
        () => validatePublicRollbackTarget(rollbackTarget({ packageSha256: undefined })),
        /sha256/i,
      );
      return {
        acceptanceId: "R9-AC01",
        layer: "regression",
        enforcement: "partial-snapshot-refused",
      };
    },
  }),
  "R9-AC02": Object.freeze({
    unit: async () => {
      assert.equal(validatePublicRollbackTarget(rollbackTarget()).compatibilityGeneration, "N");
      return {
        acceptanceId: "R9-AC02",
        layer: "unit",
        enforcement: "phase5-executed-order-receipts-required",
      };
    },
    integration: async () => {
      assert.equal(
        validatePublicRollbackTarget(rollbackTarget({ compatibilityGeneration: "N-1" }))
          .compatibilityGeneration,
        "N-1",
      );
      return {
        acceptanceId: "R9-AC02",
        layer: "integration",
        enforcement: "ordered-n-minus-one-target-bound",
      };
    },
    regression: async () => {
      assert.throws(
        () => validatePublicRollbackTarget(rollbackTarget({ compatibilityGeneration: "future" })),
        /generation/i,
      );
      return { acceptanceId: "R9-AC02", layer: "regression", enforcement: "future-target-refused" };
    },
  }),
  "R9-AC03": Object.freeze({
    unit: async () => {
      assert.equal(validatePublicRollbackTarget(rollbackTarget()).channel, "stage");
      return {
        acceptanceId: "R9-AC03",
        layer: "unit",
        enforcement: "phase5-executed-fault-drills-required",
      };
    },
    integration: async () => {
      const { binaries } = await workflowBytes();
      assert.ok(binaries.includes("Verify package contains no QA fixtures or mock data"));
      assert.ok(binaries.includes("Forbidden QA/mock marker"));
      return {
        acceptanceId: "R9-AC03",
        layer: "integration",
        enforcement: "real-package-fault-drills-only",
      };
    },
    regression: async () => {
      assert.throws(
        () => validatePublicRollbackTarget(rollbackTarget({ ref: "fault-fixture" })),
        /identity/i,
      );
      return {
        acceptanceId: "R9-AC03",
        layer: "regression",
        enforcement: "fixture-target-refused",
      };
    },
  }),
  "R9-AC04": Object.freeze({
    unit: async () => {
      assert.equal(validatePublicStageIdentity(stageIdentity()).name, "role-model-stage");
      return {
        acceptanceId: "R9-AC04",
        layer: "unit",
        enforcement: "runtime-continuity-tested-separately",
      };
    },
    integration: async () => {
      const current = validatePublicStageIdentity(stageIdentity());
      const recovery = validatePublicRollbackTarget(rollbackTarget());
      assert.deepEqual([current.channel, recovery.channel], ["stage", "stage"]);
      return {
        acceptanceId: "R9-AC04",
        layer: "integration",
        enforcement: "stage-continuity-identities-bound",
      };
    },
    regression: async () => {
      assert.throws(
        () => validatePublicStageIdentity(stageIdentity({ channel: "development" })),
        /stage/i,
      );
      return {
        acceptanceId: "R9-AC04",
        layer: "regression",
        enforcement: "cross-channel-write-refused",
      };
    },
  }),
  "R9-AC05": Object.freeze({
    unit: async () => {
      const candidate = validatePublicStageIdentity(stageIdentity());
      const repaired = validatePublicStageIdentity(structuredClone(stageIdentity()));
      assert.equal(candidate.identitySha256, repaired.identitySha256);
      return {
        acceptanceId: "R9-AC05",
        layer: "unit",
        enforcement: "same-reviewed-source-rebuild",
      };
    },
    integration: async () => {
      const candidate = validatePublicStageIdentity(stageIdentity());
      const recovery = validatePublicRollbackTarget(rollbackTarget());
      assert.notEqual(candidate.publicSource, recovery.ref);
      assert.equal(candidate.channel, recovery.channel);
      return {
        acceptanceId: "R9-AC05",
        layer: "integration",
        enforcement: "phase5-forward-repair-rerun-required",
      };
    },
    regression: async () => {
      const first = validatePublicStageIdentity(stageIdentity()).identitySha256;
      const mixed = validatePublicStageIdentity(
        stageIdentity({ publicSource: ref("9") }),
      ).identitySha256;
      assert.notEqual(first, mixed);
      return { acceptanceId: "R9-AC05", layer: "regression", enforcement: "mixed-source-detected" };
    },
  }),
  "R9-AC06": Object.freeze({
    unit: async () => {
      assert.equal(validatePublicRollbackTarget(rollbackTarget()).ok, true);
      return {
        acceptanceId: "R9-AC06",
        layer: "unit",
        enforcement: "phase5-immutable-attempt-history-required",
      };
    },
    integration: async () => {
      const { binaries } = await workflowBytes();
      assert.ok(binaries.includes("Bind canonical Run 88 identity into stage package"));
      assert.ok(binaries.includes("Verify package contains no QA fixtures or mock data"));
      return {
        acceptanceId: "R9-AC06",
        layer: "integration",
        enforcement: "authoritative-real-package-attempt-only",
      };
    },
    regression: async () => {
      const { combined } = await workflowBytes();
      assert.ok(!combined.includes("attempts: [{ outcome: 'passed' }]"));
      assert.ok(combined.includes('"phase5.mock"'));
      return {
        acceptanceId: "R9-AC06",
        layer: "regression",
        enforcement: "fabricated-success-history-refused",
      };
    },
  }),
  "R10-AC02": Object.freeze({
    unit: async () => {
      const current = validatePublicStageIdentity(stageIdentity());
      const previous = validatePublicStageIdentity(
        stageIdentity({
          privateDistribution: { ...stageIdentity().privateDistribution, generation: "N-1" },
        }),
      );
      assert.deepEqual(
        [current.privateDistribution.generation, previous.privateDistribution.generation],
        ["N", "N-1"],
      );
      return { acceptanceId: "R10-AC02", layer: "unit", enforcement: "n-and-n-minus-one" };
    },
    integration: async () => {
      const identity = validatePublicStageIdentity(stageIdentity());
      const target = validatePublicRollbackTarget(
        rollbackTarget({ compatibilityGeneration: "N-1" }),
      );
      assert.deepEqual([identity.channel, target.channel], ["stage", "stage"]);
      return {
        acceptanceId: "R10-AC02",
        layer: "integration",
        enforcement: "package-to-rollback-window",
      };
    },
    regression: async () => {
      assert.throws(
        () =>
          validatePublicStageIdentity(
            stageIdentity({
              privateDistribution: { ...stageIdentity().privateDistribution, generation: "N+1" },
            }),
          ),
        /generation/i,
      );
      return {
        acceptanceId: "R10-AC02",
        layer: "regression",
        enforcement: "future-generation-refused",
      };
    },
  }),
  "R11-AC04": Object.freeze({
    unit: async () => {
      assert.doesNotThrow(() => validatePublicStageIdentity(stageIdentity()));
      assert.throws(
        () => validatePublicStageIdentity(stageIdentity({ channel: "production" })),
        /stage/i,
      );
      return {
        acceptanceId: "R11-AC04",
        layer: "unit",
        enforcement: "validator-happy-and-refusal",
      };
    },
    integration: async () => {
      assert.doesNotThrow(() => validatePublicRollbackTarget(rollbackTarget()));
      assert.throws(() => validatePublicRollbackTarget(rollbackTarget({ ref: "bad" })), /ref/i);
      return {
        acceptanceId: "R11-AC04",
        layer: "integration",
        enforcement: "changed-boundary-tests",
      };
    },
    regression: async () => {
      for (const target of [
        rollbackTarget({ channel: "production" }),
        rollbackTarget({ packageSha256: "bad" }),
        rollbackTarget({ compatibilityGeneration: "future" }),
      ])
        assert.throws(() => validatePublicRollbackTarget(target));
      return { acceptanceId: "R11-AC04", layer: "regression", enforcement: "refusal-matrix" };
    },
  }),
  "R11-AC09": Object.freeze({
    unit: async () => {
      const { ci } = await workflowBytes();
      assert.ok(ci.includes("scripts/run88-stage-release.test.mjs"));
      assert.ok(ci.includes("scripts/run88-stage-release-workflow.test.mjs"));
      return { acceptanceId: "R11-AC09", layer: "unit", enforcement: "run88-ci-unit-gates" };
    },
    integration: async () => {
      const source = await readFile(
        new URL("./run88-run-focused-tests.mjs", import.meta.url),
        "utf8",
      );
      assert.ok(source.includes("run88-stage-release-workflow.integration.test.mjs"));
      assert.ok(source.includes("run88-stage-release.integration.test.ts"));
      return {
        acceptanceId: "R11-AC09",
        layer: "integration",
        enforcement: "run88-ci-integration-gates",
      };
    },
    regression: async () => {
      const [{ combined }, source] = await Promise.all([
        workflowBytes(),
        readFile(new URL("./run88-run-focused-tests.mjs", import.meta.url), "utf8"),
      ]);
      assert.ok(source.includes("run88-stage-release-workflow.regression.test.mjs"));
      assert.ok(source.includes("run88-stage-release.regression.test.ts"));
      assert.ok(!combined.includes("environment: production"));
      return {
        acceptanceId: "R11-AC09",
        layer: "regression",
        enforcement: "run88-ci-regression-gates",
      };
    },
  }),
  "R14-AC06": Object.freeze({
    unit: async () => {
      const source = await readFile(
        new URL("./run88-run-focused-tests.mjs", import.meta.url),
        "utf8",
      );
      assert.ok(source.includes('for (const layer of ["unit", "integration", "regression"])'));
      assert.ok(source.includes("const PLANS = Object.freeze"));
      return { acceptanceId: "R14-AC06", layer: "unit", enforcement: "versioned-layer-plan" };
    },
    integration: async () => {
      const source = await readFile(
        new URL("./run88-run-focused-tests.mjs", import.meta.url),
        "utf8",
      );
      for (const surface of ["workflow", "package", "runtime"])
        assert.ok(source.includes(`${surface}: {`));
      return {
        acceptanceId: "R14-AC06",
        layer: "integration",
        enforcement: "systematic-surface-registry",
      };
    },
    regression: async () => {
      const source = await readFile(
        new URL("./run88-run-focused-tests.mjs", import.meta.url),
        "utf8",
      );
      assert.ok(source.includes("focused GREEN failed layers"));
      assert.ok(source.includes("focused RED unexpectedly passed every layer"));
      return {
        acceptanceId: "R14-AC06",
        layer: "regression",
        enforcement: "false-success-refusal",
      };
    },
  }),
});

export async function runPublicAcceptanceProbe(acceptanceId, layer) {
  assert.ok(new Set(["unit", "integration", "regression"]).has(layer), `invalid layer ${layer}`);
  const probe = publicAcceptanceProbes[acceptanceId]?.[layer];
  assert.equal(
    typeof probe,
    "function",
    `no exact public acceptance probe for ${acceptanceId}/${layer}`,
  );
  return probe();
}
