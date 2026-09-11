import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  createPackagedRuntimeArtifactClosure,
  validatePairedReleasePackagingInputs,
} from "../src/package-sea.js";
import {
  buildGraphEvidenceFromCapture,
  createTrackBOperations,
} from "../src/track-b-operations.js";
import {
  type RouterReplayAdapter,
  TRACK_B_CANONICAL_EXTENSION_IDS,
  createProductionExtensionRuntime,
  createReplaySourceAttestation,
  createRouterReplayAdapter,
  createTrackBProductionRuntime,
  runSupervisedReplay,
} from "../src/track-b-runtime.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

const dispatchReceipt = {
  dispatchReceiptId: "dispatch:run96-f67",
  routerDecisionId: "decision:run96-f67",
  providerResultRef: "artifact:provider-result-run96-f67",
  observedCostMicros: 0,
  observedResponseBytes: 0,
};

function createAdapter(): RouterReplayAdapter {
  return createRouterReplayAdapter({
    channel: "development",
    scope: "run96:f67",
    authorizationEpoch: 96,
    authorizationSecret: "run96-f67-public-boundary-secret",
    dispatch: async () => dispatchReceipt,
  });
}

function baseEnvelope(): Record<string, unknown> {
  return {
    schemaVersion: "role-model.replay-dispatch.v1",
    channel: "development",
    scope: "run96:f67",
    replayJobId: "replay:run96-f67",
    sourceGeneration: 1,
    sourceDecisionId: "decision:source-run96-f67",
    normalizedRequestRef: "artifact:request-run96-f67",
    candidateEndpointId: "endpoint:counterfactual-run96-f67",
    dispatchIdempotencyKey: "a".repeat(64),
    candidatePackage: {
      endpointId: "endpoint:counterfactual-run96-f67",
      modelId: "model:run96-f67",
      reasoningEffort: null,
      promptAdapterId: "prompt:stable-v1",
      toolPolicy: "deny",
      experiencePackId: "experience:none",
      samplingProfileId: "sampling:stable-v1",
    },
    budget: {
      maxCandidates: 1,
      maxProviderCalls: 1,
      maxCostMicros: 5_000,
      maxBytes: 16_384,
      deadlineMs: 10_000,
    },
    toolPolicy: "deny",
  };
}

function sourceAttestation() {
  return createReplaySourceAttestation({
    channel: "development",
    scope: "run96:f67",
    authorizationEpoch: 96,
    capture: {
      schemaVersion: "role-model.route-capture-read.v2",
      scope: "run96:f67",
      rootArtifactId: "artifact:source-run96-f67",
      routingDecisionId: "decision:source-run96-f67",
      endpointId: "endpoint:observed-run96-f67",
      trace: {
        generation: 1,
        readiness: "ready",
        rootOccurrenceId: "occurrence:source-run96-f67",
        headOccurrenceId: "occurrence:source-run96-f67",
        leafOccurrenceIds: ["occurrence:source-run96-f67"],
        lastSequence: 1,
        traversalDigest: `sha256:${"0".repeat(64)}`,
      },
      replaySource: {
        schemaVersion: "role-model.route-capture-replay-source.v1",
        normalizedRequestRef: "artifact:request-run96-f67",
        sharedPrefixRef: "artifact:prefix-run96-f67",
        forkOccurrenceId: "occurrence:source-run96-f67",
        policySnapshotRef: "artifact:policy-run96-f67",
        capturePolicyRef: "artifact:capture-policy-run96-f67",
      },
    },
    eligibleEndpointIds: ["endpoint:observed-run96-f67", "endpoint:counterfactual-run96-f67"],
  });
}

describe("Run 96 Addendum 26 F67 production boundaries", () => {
  test("AC-R24-01/R30-02: rejects caller filesystem paths and unallowlisted capabilities at the adapter boundary", async () => {
    const adapter = createAdapter();

    await expect(
      adapter.dispatch({ ...baseEnvelope(), callerFilesystemPath: "C:\\private\\prompt.txt" }),
    ).rejects.toThrow(/path|filesystem/i);

    await expect(
      adapter.dispatch({ ...baseEnvelope(), capability: "filesystem:write" }),
    ).rejects.toThrow(/capability|allowlist/i);
  });

  test("AC-R24-01/R30-02: rejects an oversized authenticated message before provider dispatch", async () => {
    const adapter = createAdapter();
    await expect(
      adapter.dispatch({
        ...baseEnvelope(),
        replayJobId: `replay:${"x".repeat(1_100_000)}`,
      }),
    ).rejects.toThrow(/size|bounded|identity/i);
  });

  test("AC-R24-01/R30-02: supervised replay applies the same boundary before authorization or provider dispatch", async () => {
    const adapter = createAdapter();
    await expect(
      runSupervisedReplay({
        runtime: {
          async invoke(_id, envelope) {
            if (envelope.capability === "replay:create-job") return { jobId: "replay:run96-f67" };
            if (envelope.capability === "replay:claim-job") return { fenceToken: 1 };
            if (envelope.capability === "replay:prepare-dispatch") {
              return {
                status: "provider_dispatch",
                envelope: {
                  ...baseEnvelope(),
                  replayJobId: "replay:run96-f67",
                  authorizationEpoch: 96,
                  nonce: "run96-f67-supervised-nonce",
                  callerFilesystemPath: "C:\\private\\prompt.txt",
                },
              };
            }
            throw new Error(`unexpected replay capability ${String(envelope.capability)}`);
          },
        },
        adapter,
        requestId: "request:run96-f67",
        channel: "development",
        scope: "run96:f67",
        authorizationEpoch: 96,
        sourceAttestation: sourceAttestation(),
        idempotencyKey: "replay:run96-f67",
        intent: "counterfactual_route",
        evaluationCriteriaDigest: `sha256:${"1".repeat(64)}`,
        candidatePackages: [
          {
            ...(baseEnvelope().candidatePackage as Record<string, unknown>),
          },
        ],
        budget: baseEnvelope().budget as Record<string, unknown>,
        leaseOwner: "scheduler:run96-f67",
        leaseMs: 10_000,
        prepareBranch: async () => ({ branchRootRef: "branch:must-not-run" }),
        appendBranch: async () => ({ branchRootRef: "branch:must-not-run" }),
        handoffEvaluation: async () => ({ evaluationJobId: "evaluation:must-not-run" }),
      }),
    ).rejects.toThrow(/path|filesystem/i);
  });

  test("AC-R24-01/R30-02: binds authentication to channel, scope, epoch, and a one-use nonce", async () => {
    const adapter = createAdapter();
    const envelope = {
      ...baseEnvelope(),
      authorizationEpoch: 96,
      nonce: "run96-f67-auth-nonce",
    };
    const authorization = await adapter.authorize({ envelope });

    await expect(adapter.verifyAuthorization({ envelope, authorization })).resolves.toEqual({
      verified: true,
    });
    await expect(
      adapter.verifyAuthorization({
        envelope: { ...envelope, channel: "stage" },
        authorization,
      }),
    ).resolves.toEqual({ verified: false });
    await expect(
      adapter.verifyAuthorization({
        envelope: { ...envelope, scope: "run96:other-scope" },
        authorization,
      }),
    ).resolves.toEqual({ verified: false });
    await expect(
      adapter.verifyAuthorization({
        envelope: { ...envelope, authorizationEpoch: 95 },
        authorization,
      }),
    ).resolves.toEqual({ verified: false });

    await expect(adapter.dispatch(envelope, { authorization })).resolves.toMatchObject(
      dispatchReceipt,
    );
    await expect(adapter.dispatch(envelope, { authorization })).rejects.toThrow(/replay/i);
  });

  test("AC-R24-04: binds paired release identity and closes UI, adapter, sidecar, worker, router, and 13-extension artifacts", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "run96-f67-closure-"));
    temporaryRoots.push(root);
    const releaseDir = path.join(root, "release");
    const writeArtifact = async (relativePath: string, content: string) => {
      const filePath = path.join(releaseDir, ...relativePath.split("/"));
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf8");
      return createHash("sha256").update(content).digest("hex");
    };

    await writeArtifact("build/client/index.html", "run96-f67-ui");
    const sidecarPath = "sidecar.mjs";
    const adapterPath = "public-runtime-adapter.mjs";
    const extensionHostPath = "public-extension-host.mjs";
    const workerPath = "worker-runtime.mjs";
    const routerAssetPath = "router-assets/migration.mjs";
    const sidecarSha256 = await writeArtifact(`track-b-runtime/${sidecarPath}`, "sidecar");
    const adapterSha256 = await writeArtifact(`track-b-runtime/${adapterPath}`, "adapter");
    const extensionHostSha256 = await writeArtifact(
      `track-b-runtime/${extensionHostPath}`,
      "extension-host",
    );
    const workerSha256 = await writeArtifact(`track-b-runtime/${workerPath}`, "worker");
    const routerAssetSha256 = await writeArtifact(`track-b-runtime/${routerAssetPath}`, "router");
    const extensions = await Promise.all(
      Array.from({ length: 13 }, async (_, index) => {
        const modulePath = `extensions/extension-${index + 1}.mjs`;
        const artifactSha256 = await writeArtifact(
          `track-b-runtime/${modulePath}`,
          `extension-${index + 1}`,
        );
        return {
          descriptor: { id: `extension-${index + 1}`, protocolVersion: "1", capabilities: [] },
          modulePath,
          artifactSha256,
        };
      }),
    );
    const manifest = {
      schemaVersion: "role-model.track-b-runtime-distribution.v2",
      publicSourceTree: "0123456789abcdef0123456789abcdef01234567",
      sidecar: { modulePath: sidecarPath, artifactSha256: sidecarSha256 },
      publicRuntimeAdapter: {
        modulePath: adapterPath,
        artifactSha256: adapterSha256,
        routerRoot: "router-assets",
        routerAssets: [{ modulePath: routerAssetPath, artifactSha256: routerAssetSha256 }],
      },
      publicExtensionHost: {
        modulePath: extensionHostPath,
        artifactSha256: extensionHostSha256,
        workerModulePath: workerPath,
        workerArtifactSha256: workerSha256,
      },
      extensions,
    };
    const manifestPath = path.join(releaseDir, "track-b-runtime", "track-b-runtime-manifest.json");
    await writeFile(manifestPath, JSON.stringify(manifest), "utf8");

    expect(
      validatePairedReleasePackagingInputs({
        channel: "stage",
        releaseId: `sha256:${"b".repeat(64)}`,
        trackBRuntime: { manifestSha256: "c".repeat(64) },
      }),
    ).toMatchObject({ releaseId: `sha256:${"b".repeat(64)}` });
    await expect(createPackagedRuntimeArtifactClosure({ releaseDir })).resolves.toMatchObject({
      runtime_ui: { path: "build/client" },
      track_b_runtime: {
        extensions: expect.arrayContaining([
          expect.objectContaining({ id: "extension-1" }),
          expect.objectContaining({ id: "extension-13" }),
        ]),
      },
    });
    const closure = await createPackagedRuntimeArtifactClosure({ releaseDir });
    expect(closure.track_b_runtime.extensions).toHaveLength(13);
    await writeFile(path.join(releaseDir, "track-b-runtime", adapterPath), "tampered", "utf8");
    await expect(createPackagedRuntimeArtifactClosure({ releaseDir })).rejects.toThrow(
      /digest mismatch/i,
    );
    expect(await readFile(manifestPath, "utf8")).toContain("publicSourceTree");
  });

  test("AC-R24-05: exercises the 13-extension closure through the real process host, not direct classes or mock workers", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "run96-f67-process-host-"));
    temporaryRoots.push(root);
    const extensions = await Promise.all(
      Array.from({ length: 13 }, async (_, index) => {
        const id = TRACK_B_CANONICAL_EXTENSION_IDS[index];
        const modulePath = path.join(root, `${id}.mjs`);
        const source = `export async function run(envelope){return {available:true,id:${JSON.stringify(id)},requestId:envelope.requestId,durableLocator:{id:${JSON.stringify(id)}}}}\n`;
        await writeFile(modulePath, source, "utf8");
        return {
          descriptor: { id, protocolVersion: "1.1.0", capabilities: ["health:probe"] },
          modulePath,
          artifactSha256: createHash("sha256").update(source).digest("hex"),
        };
      }),
    );
    const runtime = await createProductionExtensionRuntime({
      stateRoot: root,
      authorizationEpoch: 96,
      repoRoot: path.resolve(import.meta.dirname, "..", "..", "..", ".."),
      extensions,
    });
    try {
      expect(runtime.health()).toMatchObject({ supervisor: { available: true, readyWorkers: 13 } });
      const results = await Promise.all(
        extensions.map((extension) =>
          runtime.invoke(extension.descriptor.id, {
            requestId: `run96-f67:${extension.descriptor.id}`,
            protocolVersion: "1.1.0",
            channel: "development",
            scope: "run96:f67",
            authorizationEpoch: 96,
            capability: "health:probe",
            payload: {},
          }),
        ),
      );
      expect(new Set(results.map((result) => result.workerPid)).size).toBe(13);
    } finally {
      await runtime.close();
    }
    expect(runtime.health().host.enabled).toBe(false);
  });

  test("AC-R30-02: privileged sidecar operations fail closed without a launcher-issued token", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "run96-f67-privileged-"));
    temporaryRoots.push(root);
    const operations = createTrackBOperations({
      statePath: path.join(root, "state.json"),
      catalog: [],
      operationsEndpoint: "http://127.0.0.1:1",
      operationsToken: undefined,
    });
    await expect(operations.readDevelopmentVerificationStatus()).rejects.toThrow(
      /launcher-issued authentication token/i,
    );
  });

  test("AC-R30-05: graph projections expose durable identifiers but never raw/private message content", () => {
    const projected = buildGraphEvidenceFromCapture({
      rootArtifactId: "artifact:run96-f67",
      edgeCount: 2,
      messages: [
        {
          nodeId: "node:user",
          role: "user",
          content: "private prompt with apiKey=do-not-leak",
          secret: "do-not-leak",
        },
      ],
      response: { nodeId: "node:assistant", content: "private response" },
      tools: [{ nodeId: "node:tool", arguments: "private arguments" }],
    });
    const serialized = JSON.stringify(projected);
    expect(projected).toEqual({
      rootArtifactId: "artifact:run96-f67",
      messageNodeIds: ["node:user"],
      responseNodeId: "node:assistant",
      toolExecutionNodeIds: ["node:tool"],
      toolCallNodeIds: [],
      toolResultNodeIds: [],
      edgeCount: 2,
    });
    expect(serialized).not.toContain("private prompt");
    expect(serialized).not.toContain("do-not-leak");
  });

  test("AC-R30-06: a private-operations outage degrades only the dependent operator feature", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "run96-f67-outage-"));
    temporaryRoots.push(root);
    const operations = createTrackBOperations({
      statePath: path.join(root, "state.json"),
      catalog: [],
      operationsEndpoint: "http://127.0.0.1:1",
      operationsToken: "a".repeat(64),
      operationsTimeoutMs: 10,
      scope: "run96:f67",
      authorizationEpoch: 96,
    });
    await expect(operations.readOperatorStatus()).resolves.toMatchObject({
      overall: "unavailable",
      error: "operator_capability_unavailable",
      capability: "operator status",
    });
    expect(typeof operations.listExtensions).toBe("function");
    const productionRuntime = createTrackBProductionRuntime({
      stateRoot: root,
      sidecar: {
        artifactPath: path.join(root, "track-b-sidecar.mjs"),
        artifactSha256: "a".repeat(64),
        async launch() {
          throw new Error("sidecar must not be required for ordinary routing");
        },
      },
    });
    expect(productionRuntime.health()).toMatchObject({
      routingAvailable: true,
      sidecar: { status: "stopped" },
    });
    await productionRuntime.stop();
  });
});
