import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect } from "vitest";

import {
  validatePublicRollbackTarget,
  validatePublicStageIdentity,
} from "../../../../scripts/run88-stage-release.mjs";
import { createRun88StagePostObservation } from "../src/cli.js";
import { validateRun88PrivateDistributionIdentity } from "../src/kw-private-loader.js";
import { validateRun88PackagedStageIdentity } from "../src/runtime-version.js";
import { createTrackBOperations } from "../src/track-b-operations.js";
import {
  createRun88RuntimeCorrelation,
  createTrackBPostObservationOutbox,
  normalizeRun88RuntimeCorrelation,
  runTrackBShadowPipeline,
  validateRun88ProviderResponseObservation,
} from "../src/track-b-runtime.js";

type Probe = () => unknown | Promise<unknown>;
type ProbeLayers = Readonly<{
  unit: Probe;
  integration: Probe;
  regression: Probe;
}>;

const releaseId = `sha256:${"a".repeat(64)}`;
const manifestSha256 = "c".repeat(64);

const correlation = (overrides: Readonly<Record<string, unknown>> = {}) =>
  createRun88RuntimeCorrelation({
    requestId: "request-1",
    routingDecisionId: "decision-1",
    endpointId: "endpoint-1",
    releaseId,
    sourceId: "b".repeat(40),
    deploymentId: "local-stage-runtime",
    scope: "stage-scope",
    timestamp: "2026-08-02T00:00:00.000Z",
    ...overrides,
  });

const stageManifest = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  channel: "stage",
  commit: "a".repeat(40),
  name: "role-model-stage",
  host: "127.0.0.1",
  port: 3457,
  endpoint: "http://127.0.0.1:3457",
  state_root_name: "role-model-runtime-stage",
  scope_id: "standalone-runtime-stage",
  release_id: releaseId,
  private_distribution_sha256: manifestSha256,
  source_tree: "b".repeat(40),
  executable_sha256: "d".repeat(64),
  core_payload_sha256: "e".repeat(64),
  track_b_runtime: { manifest_sha256: manifestSha256 },
  ...overrides,
});

const packageIdentity = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  schemaVersion: "run88-public-stage-identity.v1",
  channel: "stage",
  name: "role-model-stage",
  port: 3457,
  publicSource: "a".repeat(40),
  publicSourceTree: "b".repeat(40),
  privateDistribution: {
    generation: "N",
    manifestSha256,
    sidecarSha256: "d".repeat(64),
  },
  package: {
    executableSha256: "d".repeat(64),
    corePayloadSha256: "e".repeat(64),
    embeddedPrivateManifestSha256: manifestSha256,
  },
  ...overrides,
});

const rollbackTarget = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  channel: "stage",
  ref: "1".repeat(40),
  sourceTree: "2".repeat(40),
  packageSha256: "3".repeat(64),
  compatibilityGeneration: "N",
  ...overrides,
});

const expectedDistribution = {
  channel: "stage" as const,
  manifestSha256,
  publicGeneration: "N" as const,
};

function compatibleDistribution(generation: "N" | "N-1" = "N") {
  return validateRun88PrivateDistributionIdentity(
    { generation, manifestSha256, channel: "stage" },
    expectedDistribution,
  );
}

async function workflowBytes() {
  const [ci, binaries] = await Promise.all([
    readFile(new URL("../../../../.github/workflows/ci.yml", import.meta.url), "utf8"),
    readFile(new URL("../../../../.github/workflows/build-binaries.yml", import.meta.url), "utf8"),
  ]);
  return { ci, binaries, combined: `${ci}\n${binaries}` };
}

async function withDurableOutbox<T>(
  run: (outbox: ReturnType<typeof createTrackBPostObservationOutbox>) => Promise<T>,
) {
  const root = await mkdtemp(path.join(os.tmpdir(), "run88-public-probe-"));
  try {
    return await run(
      createTrackBPostObservationOutbox({ filePath: path.join(root, "outbox.json") }),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function enqueueCorrelatedObservation(
  outbox: ReturnType<typeof createTrackBPostObservationOutbox>,
  overrides: Readonly<Record<string, unknown>> = {},
) {
  const item = {
    requestId: "request-1",
    routingDecisionId: "decision-1",
    endpointId: "endpoint-1",
    modelId: "provider/model-1",
    reasoningEffort: "high",
    effortSource: "variant",
    run88Correlation: correlation(),
    ...overrides,
  };
  await outbox.enqueue(item);
  return item;
}

const providerObservation = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  requestId: "pi-request-1",
  clientRequestId: "pi-client-request-1",
  routingDecisionId: "provider-decision-1",
  endpointId: "provider-endpoint-1",
  modelId: "provider/model-1",
  reasoningEffort: "high",
  effortSource: "variant",
  executionTelemetry: { providerFamily: "openai" },
  inspection: {
    request: {
      requestId: "pi-request-1",
      clientRequestId: "pi-client-request-1",
      routingDecisionId: "provider-decision-1",
      requestCapture: { headers: { "content-type": "application/json" }, body: { model: "gpt" } },
      responseCapture: {
        statusCode: 200,
        body: { output: [{ text: "successful provider response" }] },
      },
    },
    endpoint: { endpointId: "provider-endpoint-1" },
  },
  ...overrides,
});

const piProofAuthority = generateKeyPairSync("ed25519");
const canonicalProof = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalProof);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonicalProof((value as Record<string, unknown>)[key])]),
    );
  return value;
};
const piProvenance = () => {
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  const claim = {
    schemaVersion: "run88-pi-invocation-proof.v1",
    executionClass: "actual-pi-cli",
    clientRequestId: "pi-client-request-1",
    releaseId: `sha256:${"a".repeat(64)}`,
    processId: 4242,
    executableSha256: "a".repeat(64),
    issuedAt,
    expiresAt,
  } as const;
  return {
    source: "routed-execution-callback" as const,
    piInvocationProof: {
      ...claim,
      signature: sign(
        null,
        Buffer.from(JSON.stringify(canonicalProof(claim))),
        piProofAuthority.privateKey,
      ).toString("base64"),
    },
    expectedReleaseId: claim.releaseId,
    trustedAuthorityPublicKey: piProofAuthority.publicKey
      .export({ type: "spki", format: "pem" })
      .toString(),
  };
};

async function withRecommendationOperations<T>(
  recommendation: Readonly<Record<string, unknown>>,
  run: (operations: ReturnType<typeof createTrackBOperations>, statePath: string) => Promise<T>,
) {
  const root = await mkdtemp(path.join(os.tmpdir(), "run88-recommendation-probe-"));
  const statePath = path.join(root, "track-b-production-bridge.json");
  try {
    await writeFile(
      statePath,
      JSON.stringify({
        schemaVersion: "role-model.track-b-production-bridge.v1",
        protocolVersion: "1.0",
        revision: 1,
        generatedAt: "2026-08-02T00:00:00.000Z",
        extensions: [],
        storageServices: [],
        retention: { managedPolicy: false, receipts: [], activeJob: null },
        contribution: {
          mode: "contributor",
          contributionTier: "advanced",
          recommendationTier: "advanced",
          recommendationAccess: "preview_and_apply",
          allowCloudUpload: true,
          authorizationState: "active",
          revocationEpoch: 0,
          queuedCount: 0,
          managed: false,
        },
        recommendations: [recommendation],
        recommendationRevision: 1,
        activePack: null,
      }),
      "utf8",
    );
    return await run(createTrackBOperations({ statePath, catalog: [] }), statePath);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const recommendation = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  id: "stage-recommendation-1",
  version: "1",
  status: "validated",
  signatureValid: true,
  policyAllowed: true,
  provenance: "cloud:stage-bundle",
  ...overrides,
});

const shadowInput = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  requestId: "shadow-request-1",
  channel: "stage",
  scope: "stage-scope",
  authorizationEpoch: 88,
  productionState: Object.freeze({ route: "unchanged", providerCalls: 1 }),
  routePackage: "candidate-stage",
  sourceDecisionId: "decision-1",
  sourceGraphRef: "sha256:graph-1",
  prefix: ["request"],
  counterfactuals: [{ id: "candidate-control", suffix: ["candidate-control"] }],
  comparableEvidence: {
    source: {
      rolloutId: "rollout-stage-candidate",
      routePackage: "candidate-stage",
      endpointId: "endpoint-stage",
      modelId: "model-stage",
      policyId: "policy-stage",
      reasoningEffort: "medium",
      evidenceRef: "evidence:stage-candidate",
      propensity: 0.6,
      outcome: { status: "success", outcomeRef: "outcome:stage-candidate" },
    },
    counterfactuals: [
      {
        rolloutId: "rollout-stage-control",
        routePackage: "candidate-control",
        endpointId: "endpoint-control",
        modelId: "model-control",
        policyId: "policy-control",
        reasoningEffort: "high",
        evidenceRef: "evidence:stage-control",
        propensity: 0.4,
        outcome: { status: "failure", outcomeRef: "outcome:stage-control" },
      },
    ],
    candidateSet: [
      { routePackage: "candidate-stage", endpointId: "endpoint-stage", propensity: 0.6 },
      { routePackage: "candidate-control", endpointId: "endpoint-control", propensity: 0.4 },
    ],
  },
  evaluationCases: [
    {
      expected: "candidate-stage",
      actual: "candidate-stage",
      expectedRolloutId: "rollout-stage-candidate",
      actualRolloutId: "rollout-stage-control",
      expectedOutcomeRef: "outcome:stage-candidate",
      actualOutcomeRef: "outcome:stage-control",
      expectedEvidenceRef: "evidence:stage-candidate",
      actualEvidenceRef: "evidence:stage-control",
    },
  ],
  trajectoryEvents: [],
  ...overrides,
});

const shadowRuntime = {
  async invoke(id: string) {
    if (id === "evaluation-runner-local")
      return {
        scores: [1],
        holdout: { passed: true, evidenceRef: "sha256:graph-1" },
        provenance: { evidenceRef: "sha256:graph-1" },
      };
    if (id === "knowledge-worker") return { id: "shadow-candidate-1", state: "shadow" };
    return { id: `${id}-result` };
  },
};

export const publicRuntimeAcceptanceProbes: Readonly<Record<string, ProbeLayers>> = Object.freeze({
  "R2-AC02": Object.freeze({
    unit: async () => {
      const manifest = validateRun88PackagedStageIdentity(stageManifest());
      expect(manifest.private_distribution_sha256).toBe(manifestSha256);
      expect((manifest.track_b_runtime as Record<string, unknown>).manifest_sha256).toBe(
        manifestSha256,
      );
    },
    integration: async () => {
      const packaged = validateRun88PackagedStageIdentity(stageManifest());
      const distribution = validateRun88PrivateDistributionIdentity(
        { generation: "N", manifestSha256, channel: "stage" },
        expectedDistribution,
      );
      expect(packaged.private_distribution_sha256).toBe(manifestSha256);
      expect(distribution).toMatchObject({ available: true, compatible: true });
    },
    regression: async () => {
      expect(() =>
        validateRun88PackagedStageIdentity(
          stageManifest({ track_b_runtime: { manifest_sha256: "0".repeat(64) } }),
        ),
      ).toThrow(/distribution/i);
      expect(() =>
        validateRun88PackagedStageIdentity(stageManifest({ commit: "runtime-derived" })),
      ).toThrow(/commit identity/i);
    },
  }),
  "R2-AC03": Object.freeze({
    unit: async () => {
      expect(validateRun88PackagedStageIdentity(stageManifest())).toMatchObject({
        channel: "stage",
        name: "role-model-stage",
        host: "127.0.0.1",
        port: 3457,
        endpoint: "http://127.0.0.1:3457",
      });
    },
    integration: async () => {
      const manifest = validateRun88PackagedStageIdentity(stageManifest());
      expect(manifest).toMatchObject({
        state_root_name: "role-model-runtime-stage",
        scope_id: "standalone-runtime-stage",
        release_id: releaseId,
      });
      expect(String(manifest.executable_sha256)).toHaveLength(64);
      expect(String(manifest.core_payload_sha256)).toHaveLength(64);
    },
    regression: async () => {
      expect(() =>
        validateRun88PackagedStageIdentity(
          stageManifest({ endpoint: "http://127.0.0.1:3456", port: 3456 }),
        ),
      ).toThrow(/stage package/i);
    },
  }),
  "R2-AC04": Object.freeze({
    unit: async () => {
      const first = validatePublicStageIdentity(packageIdentity());
      const second = validatePublicStageIdentity(structuredClone(packageIdentity()));
      expect(first.identitySha256).toBe(second.identitySha256);
    },
    integration: async () => {
      const publicIdentity = validatePublicStageIdentity(packageIdentity());
      const runtimeIdentity = validateRun88PackagedStageIdentity(stageManifest());
      expect(publicIdentity.package.corePayloadSha256).toBe(runtimeIdentity.core_payload_sha256);
      expect(publicIdentity.privateDistribution.manifestSha256).toBe(
        runtimeIdentity.private_distribution_sha256,
      );
    },
    regression: async () => {
      expect(() =>
        validateRun88PackagedStageIdentity(stageManifest({ source_tree: "not-a-source-tree" })),
      ).toThrow(/source tree/i);
    },
  }),
  "R4-AC05": Object.freeze({
    unit: async () => {
      const { binaries } = await workflowBytes();
      expect(binaries).toContain('"phase5.mock"');
      expect(binaries).toContain("Forbidden QA/mock marker");
      return { acceptanceId: "R4-AC05", layer: "unit", enforcement: "phase5-live-cloud-required" };
    },
    integration: async () => {
      expect(validateRun88PackagedStageIdentity(stageManifest()).channel).toBe("stage");
      const { combined } = await workflowBytes();
      expect(combined).not.toContain("wrangler deploy");
      return {
        acceptanceId: "R4-AC05",
        layer: "integration",
        enforcement: "phase5-live-platform-state-required",
      };
    },
    regression: async () => {
      expect(() =>
        validateRun88PrivateDistributionIdentity(
          { generation: "N", manifestSha256, channel: "production" },
          expectedDistribution,
        ),
      ).toThrow(/channel/i);
      return {
        acceptanceId: "R4-AC05",
        layer: "regression",
        enforcement: "offline-cloud-readiness-refused",
      };
    },
  }),
  "R4-AC06": Object.freeze({
    unit: async () => {
      expect(validateRun88PrivateDistributionIdentity(null, expectedDistribution)).toEqual({
        available: false,
        compatible: false,
        degradation: "public-routing-only",
      });
    },
    integration: async () => {
      expect(validateRun88PackagedStageIdentity(stageManifest()).name).toBe("role-model-stage");
      expect(validateRun88PrivateDistributionIdentity(null, expectedDistribution).degradation).toBe(
        "public-routing-only",
      );
    },
    regression: async () => {
      expect(() =>
        validateRun88PrivateDistributionIdentity(
          { generation: "N", manifestSha256, channel: "production" },
          expectedDistribution,
        ),
      ).toThrow(/channel/i);
    },
  }),
  "R5-AC01": Object.freeze({
    unit: async () => {
      const envelope = correlation();
      expect(normalizeRun88RuntimeCorrelation(envelope, releaseId)).toEqual(envelope);
      expect(envelope.scopeHash).not.toBe("stage-scope");
    },
    integration: async () => {
      await withDurableOutbox(async (outbox) => {
        const item = await enqueueCorrelatedObservation(outbox);
        let observed: Readonly<Record<string, unknown>> | undefined;
        await outbox.drain(async (value) => {
          observed = value;
          return { status: "processed" };
        });
        expect(observed?.run88Correlation).toEqual(item.run88Correlation);
        await expect(outbox.read()).resolves.toMatchObject({ pendingCount: 0, receiptCount: 1 });
      });
    },
    regression: async () => {
      expect(() =>
        normalizeRun88RuntimeCorrelation({ ...correlation(), prompt: "raw" }, releaseId),
      ).toThrow(/field/i);
      expect(() =>
        normalizeRun88RuntimeCorrelation(
          { ...correlation(), releaseId: `sha256:${"f".repeat(64)}` },
          releaseId,
        ),
      ).toThrow(/release/i);
    },
  }),
  "R6-AC06": Object.freeze({
    unit: async () => {
      expect(validatePublicRollbackTarget(rollbackTarget())).toMatchObject({
        ok: true,
        channel: "stage",
      });
      return { acceptanceId: "R6-AC06", layer: "unit", enforcement: "phase5-soak-required" };
    },
    integration: async () => {
      await withDurableOutbox(async (outbox) => {
        await enqueueCorrelatedObservation(outbox);
        await expect(
          outbox.drain(async () => {
            throw new Error("threshold controller paused delivery");
          }),
        ).rejects.toThrow(/paused/);
        await expect(outbox.read()).resolves.toMatchObject({ pendingCount: 1, receiptCount: 0 });
      });
      return {
        acceptanceId: "R6-AC06",
        layer: "integration",
        enforcement: "phase5-measured-threshold-receipt-required",
      };
    },
    regression: async () => {
      expect(() =>
        validatePublicRollbackTarget(rollbackTarget({ compatibilityGeneration: "future" })),
      ).toThrow(/generation/i);
      return {
        acceptanceId: "R6-AC06",
        layer: "regression",
        enforcement: "fabricated-soak-pass-refused",
      };
    },
  }),
  "R7-AC03": Object.freeze({
    unit: async () => {
      const observed = validateRun88ProviderResponseObservation(
        providerObservation(),
        piProvenance(),
      );
      expect(observed).toMatchObject({
        requestId: "pi-request-1",
        clientRequestId: "pi-client-request-1",
        routingDecisionId: "provider-decision-1",
        endpointId: "provider-endpoint-1",
        statusCode: 200,
        outcome: "provider-success",
      });
      expect(observed.responseSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(observed.piInvocationProofSha256).toMatch(/^[a-f0-9]{64}$/);
      return {
        acceptanceId: "R7-AC03",
        layer: "unit",
        enforcement: "phase5-real-pi-provider-response-required",
      };
    },
    integration: async () => {
      const observed = createRun88StagePostObservation({
        observation: providerObservation(),
        piInvocationProvenance: piProvenance(),
        proofRequired: true,
        releaseId,
        sourceId: "b".repeat(40),
        executableSha256: "c".repeat(64),
        scope: "stage-scope",
      });
      expect(observed.run88ProviderResponse).toMatchObject({
        requestId: "pi-request-1",
        clientRequestId: "pi-client-request-1",
        outcome: "provider-success",
      });
      expect(observed.run88Correlation).toMatchObject({
        causalParentId: "provider-decision-1",
        releaseId,
        sourceId: "b".repeat(40),
        deploymentId: `local-stage:${"c".repeat(64)}`,
      });
      await withDurableOutbox(async (outbox) => {
        await outbox.enqueue(observed);
        await expect(outbox.read()).resolves.toMatchObject({ pendingCount: 1, receiptCount: 0 });
      });
      return {
        acceptanceId: "R7-AC03",
        layer: "integration",
        enforcement: "validated-provider-response-to-durable-observation",
      };
    },
    regression: async () => {
      expect(() =>
        createRun88StagePostObservation({
          observation: providerObservation(),
          piInvocationProvenance: null,
          proofRequired: true,
          releaseId,
          sourceId: "b".repeat(40),
          executableSha256: "c".repeat(64),
          scope: "stage-scope",
        }),
      ).toThrow(/requires signed Pi CLI provenance/i);
      expect(() =>
        validateRun88ProviderResponseObservation(providerObservation(), {
          source: "routed-execution-callback",
        }),
      ).toThrow(/Pi|invocation|proof|authority/i);
      expect(() =>
        validateRun88ProviderResponseObservation(
          {
            requestId: "pi-request-1",
            routingDecisionId: "provider-decision-1",
            endpointId: "direct-host-method",
            statusCode: 200,
            outputText: "direct response",
          },
          piProvenance(),
        ),
      ).toThrow(/identity|successful|output/i);
      expect(() =>
        validateRun88ProviderResponseObservation(
          providerObservation({ mocked: true }),
          piProvenance(),
        ),
      ).toThrow(/real|mock|provider/i);
      expect(() =>
        validateRun88ProviderResponseObservation(
          providerObservation({ endpointId: "" }),
          piProvenance(),
        ),
      ).toThrow(/identity|successful|output/i);
      const failed = providerObservation();
      expect(() =>
        validateRun88ProviderResponseObservation(
          providerObservation({
            inspection: {
              ...(failed.inspection as Readonly<Record<string, unknown>>),
              request: {
                ...failed.inspection.request,
                responseCapture: { statusCode: 503, body: { error: "provider failed" } },
              },
            },
          }),
          piProvenance(),
        ),
      ).toThrow(/successful/i);
    },
  }),
  "R8-AC03": Object.freeze({
    unit: async () => {
      await withRecommendationOperations(recommendation(), async (operations) => {
        const rows = await operations.listRecommendations();
        expect(rows).toContainEqual(
          expect.objectContaining({
            id: "stage-recommendation-1",
            status: "validated",
            signatureValid: true,
          }),
        );
      });
    },
    integration: async () => {
      await withRecommendationOperations(recommendation(), async (operations, statePath) => {
        const applied = (await operations.applyRecommendation({
          id: "stage-recommendation-1",
        })) as {
          activePack: Readonly<Record<string, unknown>>;
        };
        expect(applied.activePack).toMatchObject({ id: "stage-recommendation-1", version: "1" });
        const persisted = await readFile(statePath, "utf8");
        expect(persisted).not.toContain("routePackageActivation");
        expect(persisted).not.toContain('productionActivation":true');
      });
    },
    regression: async () => {
      await withRecommendationOperations(
        recommendation({ signatureValid: false }),
        async (operations) => {
          await expect(
            operations.applyRecommendation({ id: "stage-recommendation-1" }),
          ).rejects.toThrow(/signature/i);
        },
      );
      await withRecommendationOperations(
        recommendation({ status: "dismissed" }),
        async (operations) => {
          await expect(
            operations.applyRecommendation({ id: "stage-recommendation-1" }),
          ).rejects.toThrow(/dismissed/i);
        },
      );
    },
  }),
  "R8-AC05": Object.freeze({
    unit: async () => {
      await withDurableOutbox(async (outbox) => {
        await enqueueCorrelatedObservation(outbox);
        await expect(outbox.read()).resolves.toMatchObject({ pendingCount: 1, receiptCount: 0 });
      });
    },
    integration: async () => {
      await withDurableOutbox(async (outbox) => {
        await enqueueCorrelatedObservation(outbox);
        await expect(
          outbox.drain(async () => {
            throw new Error("cloud queue unavailable");
          }),
        ).rejects.toThrow(/unavailable/);
        await expect(outbox.read()).resolves.toMatchObject({ pendingCount: 1 });
        await outbox.drain(async () => ({ status: "completed-after-recovery" }));
        await expect(outbox.read()).resolves.toMatchObject({ pendingCount: 0, receiptCount: 1 });
      });
      return {
        acceptanceId: "R8-AC05",
        layer: "integration",
        enforcement: "runtime-recovery-plus-phase5-live-cloud-required",
      };
    },
    regression: async () => {
      await withDurableOutbox(async (outbox) => {
        await enqueueCorrelatedObservation(outbox);
        await enqueueCorrelatedObservation(outbox);
        await expect(outbox.read()).resolves.toMatchObject({ pendingCount: 1, receiptCount: 0 });
      });
    },
  }),
  "R9-AC01": Object.freeze({
    unit: async () => {
      expect(validatePublicRollbackTarget(rollbackTarget())).toMatchObject({
        ok: true,
        ref: "1".repeat(40),
        sourceTree: "2".repeat(40),
        packageSha256: "3".repeat(64),
      });
      return { acceptanceId: "R9-AC01", layer: "unit", enforcement: "phase5-snapshot-required" };
    },
    integration: async () => {
      const current = validateRun88PackagedStageIdentity(stageManifest());
      const recovery = validatePublicRollbackTarget(rollbackTarget());
      expect(current.channel).toBe(recovery.channel);
      expect(current.source_tree).not.toBe(recovery.ref);
      return {
        acceptanceId: "R9-AC01",
        layer: "integration",
        enforcement: "current-and-recovery-identities-bound",
      };
    },
    regression: async () => {
      expect(() => validatePublicRollbackTarget(rollbackTarget({ sourceTree: "missing" }))).toThrow(
        /identity/i,
      );
      expect(() =>
        validatePublicRollbackTarget(rollbackTarget({ packageSha256: "missing" })),
      ).toThrow(/sha256/i);
    },
  }),
  "R9-AC02": Object.freeze({
    unit: async () => {
      expect(validatePublicRollbackTarget(rollbackTarget()).compatibilityGeneration).toBe("N");
      return {
        acceptanceId: "R9-AC02",
        layer: "unit",
        enforcement: "phase5-features-private-public-order-required",
      };
    },
    integration: async () => {
      const target = validatePublicRollbackTarget(
        rollbackTarget({ compatibilityGeneration: "N-1" }),
      );
      expect(target).toMatchObject({ ok: true, channel: "stage", compatibilityGeneration: "N-1" });
      return {
        acceptanceId: "R9-AC02",
        layer: "integration",
        enforcement: "n-minus-one-rollback-window",
      };
    },
    regression: async () => {
      expect(() => validatePublicRollbackTarget(rollbackTarget({ channel: "production" }))).toThrow(
        /stage/i,
      );
      expect(() =>
        validatePublicRollbackTarget(rollbackTarget({ compatibilityGeneration: "N+1" })),
      ).toThrow(/generation/i);
    },
  }),
  "R9-AC03": Object.freeze({
    unit: async () => {
      expect(validateRun88PrivateDistributionIdentity(null, expectedDistribution)).toMatchObject({
        available: false,
        degradation: "public-routing-only",
      });
      return {
        acceptanceId: "R9-AC03",
        layer: "unit",
        enforcement: "phase5-executed-fault-matrix-required",
      };
    },
    integration: async () => {
      await withDurableOutbox(async (outbox) => {
        await enqueueCorrelatedObservation(outbox);
        await expect(
          outbox.drain(async () => {
            throw new Error("outbox interruption drill");
          }),
        ).rejects.toThrow(/interruption/);
        await expect(outbox.read()).resolves.toMatchObject({ pendingCount: 1 });
      });
      return {
        acceptanceId: "R9-AC03",
        layer: "integration",
        enforcement: "runtime-fault-plus-phase5-drills-required",
      };
    },
    regression: async () => {
      const { binaries } = await workflowBytes();
      expect(binaries).toContain("Verify package contains no QA fixtures or mock data");
      expect(binaries).toContain("Forbidden QA/mock marker");
    },
  }),
  "R9-AC04": Object.freeze({
    unit: async () => {
      expect(validateRun88PrivateDistributionIdentity(null, expectedDistribution)).toEqual({
        available: false,
        compatible: false,
        degradation: "public-routing-only",
      });
    },
    integration: async () => {
      await withDurableOutbox(async (outbox) => {
        await enqueueCorrelatedObservation(outbox);
        await outbox.drain(async () => ({ status: "resumed" }));
        await expect(outbox.read()).resolves.toMatchObject({ pendingCount: 0, receiptCount: 1 });
      });
      expect(validateRun88PackagedStageIdentity(stageManifest()).channel).toBe("stage");
    },
    regression: async () => {
      expect(() =>
        validateRun88PrivateDistributionIdentity(
          { generation: "N", manifestSha256: "f".repeat(64), channel: "stage" },
          expectedDistribution,
        ),
      ).toThrow(/manifest/i);
    },
  }),
  "R9-AC05": Object.freeze({
    unit: async () => {
      const first = validatePublicStageIdentity(packageIdentity());
      const rebuilt = validatePublicStageIdentity(structuredClone(packageIdentity()));
      expect(rebuilt.identitySha256).toBe(first.identitySha256);
    },
    integration: async () => {
      const candidate = validateRun88PackagedStageIdentity(stageManifest());
      const rollback = validatePublicRollbackTarget(rollbackTarget());
      expect(candidate.channel).toBe(rollback.channel);
      expect(candidate.source_tree).not.toBe(rollback.ref);
      return {
        acceptanceId: "R9-AC05",
        layer: "integration",
        enforcement: "phase5-forward-repair-rerun-required",
      };
    },
    regression: async () => {
      expect(() =>
        validateRun88PackagedStageIdentity(
          stageManifest({ private_distribution_sha256: "f".repeat(64) }),
        ),
      ).toThrow(/distribution/i);
    },
  }),
  "R9-AC06": Object.freeze({
    unit: async () => {
      await withDurableOutbox(async (outbox) => {
        await enqueueCorrelatedObservation(outbox);
        await expect(
          outbox.drain(async () => {
            throw new Error("attempt-1 failed");
          }),
        ).rejects.toThrow(/attempt-1/);
        await expect(outbox.read()).resolves.toMatchObject({ pendingCount: 1, receiptCount: 0 });
      });
    },
    integration: async () => {
      await withDurableOutbox(async (outbox) => {
        await enqueueCorrelatedObservation(outbox);
        await expect(
          outbox.drain(async () => Promise.reject(new Error("partial attempt"))),
        ).rejects.toThrow(/partial/);
        await expect(outbox.read()).resolves.toMatchObject({ pendingCount: 1 });
        await outbox.drain(async () => ({ status: "authoritative-success" }));
        await expect(outbox.read()).resolves.toMatchObject({ pendingCount: 0, receiptCount: 1 });
      });
      return {
        acceptanceId: "R9-AC06",
        layer: "integration",
        enforcement: "phase5-immutable-failed-attempt-receipts-required",
      };
    },
    regression: async () => {
      await withDurableOutbox(async (outbox) => {
        await enqueueCorrelatedObservation(outbox);
        await outbox.drain(async () => ({ status: "passed" }));
        await enqueueCorrelatedObservation(outbox);
        await expect(outbox.read()).resolves.toMatchObject({ pendingCount: 0, receiptCount: 1 });
      });
    },
  }),
  "R10-AC01": Object.freeze({
    unit: async () => {
      expect(compatibleDistribution("N")).toEqual({
        available: true,
        compatible: true,
        generation: "N",
      });
      expect(compatibleDistribution("N-1").generation).toBe("N-1");
    },
    integration: async () => {
      expect(validateRun88PackagedStageIdentity(stageManifest()).channel).toBe("stage");
      expect(compatibleDistribution("N-1").compatible).toBe(true);
    },
    regression: async () => {
      expect(() =>
        validateRun88PrivateDistributionIdentity(
          { generation: "N+1", manifestSha256, channel: "stage" },
          expectedDistribution,
        ),
      ).toThrow(/generation/i);
    },
  }),
  "R10-AC02": Object.freeze({
    unit: async () => {
      expect(compatibleDistribution("N").generation).toBe("N");
      expect(compatibleDistribution("N-1").generation).toBe("N-1");
    },
    integration: async () => {
      const packageN = validatePublicStageIdentity(packageIdentity());
      const packagePrevious = validatePublicStageIdentity(
        packageIdentity({
          privateDistribution: {
            ...(packageIdentity().privateDistribution as Record<string, unknown>),
            generation: "N-1",
          },
        }),
      );
      expect(packageN.privateDistribution.generation).toBe("N");
      expect(packagePrevious.privateDistribution.generation).toBe("N-1");
    },
    regression: async () => {
      expect(() =>
        validateRun88PrivateDistributionIdentity(
          { generation: "future", manifestSha256, channel: "stage" },
          expectedDistribution,
        ),
      ).toThrow(/generation/i);
    },
  }),
  "R10-AC03": Object.freeze({
    unit: async () => {
      expect(validateRun88PrivateDistributionIdentity(null, expectedDistribution)).toMatchObject({
        available: false,
        compatible: false,
        degradation: "public-routing-only",
      });
    },
    integration: async () => {
      expect(validateRun88PrivateDistributionIdentity(null, expectedDistribution).degradation).toBe(
        "public-routing-only",
      );
      expect(validateRun88PackagedStageIdentity(stageManifest()).name).toBe("role-model-stage");
    },
    regression: async () => {
      expect(() =>
        validateRun88PrivateDistributionIdentity(
          { generation: "N", manifestSha256: "d".repeat(64), channel: "stage" },
          expectedDistribution,
        ),
      ).toThrow(/manifest/i);
    },
  }),
  "R10-AC04": Object.freeze({
    unit: async () => {
      expect(correlation()).toMatchObject({
        schemaVersion: "run88-correlation.v1",
        runtimeChannel: "staging",
      });
    },
    integration: async () => {
      await withDurableOutbox(async (outbox) => {
        await enqueueCorrelatedObservation(outbox);
        await outbox.drain(async (item) => ({
          correlationVersion: item.run88Correlation?.schemaVersion,
        }));
        const state = await outbox.read();
        expect(state.receipts[0]?.result).toEqual({ correlationVersion: "run88-correlation.v1" });
      });
      expect(compatibleDistribution("N-1").compatible).toBe(true);
    },
    regression: async () => {
      expect(() =>
        normalizeRun88RuntimeCorrelation(
          { ...correlation(), schemaVersion: "run88-correlation.v2" },
          releaseId,
        ),
      ).toThrow(/schema/i);
      await withDurableOutbox(async (outbox) => {
        await expect(
          outbox.enqueue({
            requestId: "request-1",
            routingDecisionId: "decision-1",
            endpointId: "endpoint-1",
            modelId: "provider/model-1",
            reasoningEffort: "high",
            effortSource: "variant",
            run88Correlation: { ...correlation(), schemaVersion: "run88-correlation.v2" },
          }),
        ).rejects.toThrow(/schema/i);
      });
    },
  }),
  "R10-AC05": Object.freeze({
    unit: async () => {
      await expect(
        runTrackBShadowPipeline(shadowRuntime, shadowInput({ channel: "production" }) as never),
      ).rejects.toThrow(/shadow-only|production/i);
    },
    integration: async () => {
      const input = shadowInput();
      const result = await runTrackBShadowPipeline(shadowRuntime, input as never);
      expect(result.productionState).toEqual(input.productionState);
      expect(result.receipt).toMatchObject({
        mode: "shadow",
        providerCalls: 0,
        productionMutation: false,
      });
    },
    regression: async () => {
      await expect(
        runTrackBShadowPipeline(shadowRuntime, shadowInput({ routePackage: "" }) as never),
      ).rejects.toThrow(/identity/i);
      expect(compatibleDistribution("N").compatible).toBe(true);
      expect(compatibleDistribution("N-1").compatible).toBe(true);
    },
  }),
  "R11-AC04": Object.freeze({
    unit: async () => {
      expect(() => validateRun88PackagedStageIdentity(stageManifest())).not.toThrow();
      expect(() =>
        validateRun88PackagedStageIdentity(stageManifest({ release_id: "missing" })),
      ).toThrow(/release/i);
    },
    integration: async () => {
      const packageValue = validateRun88PackagedStageIdentity(stageManifest());
      const distribution = compatibleDistribution("N");
      expect(packageValue.private_distribution_sha256).toBe(manifestSha256);
      expect(distribution.compatible).toBe(true);
    },
    regression: async () => {
      for (const invalid of [
        stageManifest({ channel: "stage", name: "production" }),
        stageManifest({ private_distribution_sha256: "f".repeat(64) }),
        stageManifest({ source_tree: "bad" }),
      ])
        expect(() => validateRun88PackagedStageIdentity(invalid)).toThrow();
    },
  }),
  "R11-AC05": Object.freeze({
    unit: async () => {
      const envelope = correlation();
      expect(normalizeRun88RuntimeCorrelation(envelope, releaseId).deploymentId).toBe(
        "local-stage-runtime",
      );
    },
    integration: async () => {
      await withDurableOutbox(async (outbox) => {
        const original = await enqueueCorrelatedObservation(outbox);
        await outbox.drain(async (item) => {
          expect(item.run88Correlation).toEqual(original.run88Correlation);
          return { status: "actual-boundary-crossed" };
        });
        await expect(outbox.read()).resolves.toMatchObject({ pendingCount: 0, receiptCount: 1 });
      });
    },
    regression: async () => {
      await withDurableOutbox(async (outbox) => {
        await enqueueCorrelatedObservation(outbox);
        await expect(
          outbox.drain(async () => {
            throw new Error("private process boundary unavailable");
          }),
        ).rejects.toThrow(/unavailable/);
        await expect(outbox.read()).resolves.toMatchObject({ pendingCount: 1, receiptCount: 0 });
      });
    },
  }),
  "R14-AC06": Object.freeze({
    unit: async () => {
      const source = await readFile(
        new URL("../../../../scripts/run88-run-focused-tests.mjs", import.meta.url),
        "utf8",
      );
      expect(source).toContain('for (const layer of ["unit", "integration", "regression"])');
      expect(source).toContain("const PLANS = Object.freeze");
    },
    integration: async () => {
      const source = await readFile(
        new URL("../../../../scripts/run88-run-focused-tests.mjs", import.meta.url),
        "utf8",
      );
      expect(source).toContain("workflow: {");
      expect(source).toContain("package: {");
      expect(source).toContain("runtime: {");
    },
    regression: async () => {
      const source = await readFile(
        new URL("../../../../scripts/run88-run-focused-tests.mjs", import.meta.url),
        "utf8",
      );
      expect(source).toContain("focused GREEN failed layers");
      expect(source).toContain("focused RED unexpectedly passed every layer");
    },
  }),
});

export async function runPublicRuntimeAcceptanceProbe(acceptanceId: string, layer: string) {
  expect(["unit", "integration", "regression"]).toContain(layer);
  const record = publicRuntimeAcceptanceProbes[acceptanceId];
  expect(record, `no exact public runtime probe for ${acceptanceId}`).toBeDefined();
  const probe = record?.[layer as keyof ProbeLayers];
  expect(typeof probe, `no exact ${layer} runtime probe for ${acceptanceId}`).toBe("function");
  return probe?.();
}
