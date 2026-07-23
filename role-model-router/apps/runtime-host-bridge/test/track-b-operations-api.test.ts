import { createHash, createHmac, createPublicKey, generateKeyPairSync, sign } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";
import { readRuntimeObservationBundle, resolveSqliteMemoryLocation } from "@role-model-router/sqlite-memory";
import { LegacySqliteMigration } from "../../../packages/sqlite-memory/src/legacy-migration.js";

import { createRuntimeBridgeBackend, startBridgeServer } from "../src/index.js";
import { applyRecommendationServiceLauncherConfig } from "../src/cli.js";
import { seedTrackBExtensionBridgeState } from "../src/track-b-operations.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const fixtureRoot = path.join(import.meta.dirname, "fixtures");
const canonicalJson = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonicalJson).join(",")}]`
    : value && typeof value === "object"
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`)
          .join(",")}}`
      : JSON.stringify(value);
const roots: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  delete process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_URL;
  delete process.env.ROLE_MODEL_RECOMMENDATION_VERIFICATION_KEY;
  delete process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_TOKEN;
  delete process.env.ROLE_MODEL_RECOMMENDATION_CHANNEL;
  delete process.env.ROLE_MODEL_TRACK_B_OPERATIONS_URL;
  delete process.env.ROLE_MODEL_TRACK_B_OPERATIONS_TOKEN;
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Track B operations APIs", () => {
  test("fails closed instead of issuing unauthenticated calls to an owned operations endpoint", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-operations-auth-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "track-b-operations-auth",
      trackBOperationsEndpoint: "http://127.0.0.1:1",
    });

    await expect(backend.readStorageRetention()).rejects.toThrow(/launcher-issued authentication token/i);
    await backend.shutdown();
  });

  test("serves extension lifecycle and storage retention through bounded callbacks", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-operations-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "track-b-operations",
    });
    const extensions = [
      {
        id: "artifact-store",
        packageClass: "canonical_extension",
        lifecycle: "ready",
        installed: true,
        enabled: true,
        channel: "production",
        scope: "global",
        authorizationEpoch: 2,
        health: { available: true, routingDependency: false },
        permissions: ["graph:write"],
        dataClasses: ["rich_artifact"],
        retention: "policy_bound",
        degradation: "routing_continues",
        compatibility: ["N/N", "N/N-1"],
      },
    ];
    const summary = {
      totalBytes: 100,
      categories: [{ id: "graph", tier: "canonical", scope: "global", bytes: 100, count: 2 }],
      managedPolicy: false,
      conflicts: [],
      receipts: [],
      activeJob: null,
    };
    let dryRunCount = 0;
    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry: backend.registry,
      getRegistry: () => backend.registry,
      executeChatCompletions: backend.executeChatCompletions,
      executeResponses: backend.executeResponses,
      listExtensions: async () => extensions,
      readStorageRetention: async () => summary,
      dryRunStorageRetention: async () => ({
        ...summary,
        receipts: [
          {
            id: `dry-${++dryRunCount}`,
            status: "preview",
            affectedCount: 2,
            rollbackAvailable: true,
          },
        ],
      }),
      updateStorageRetentionPolicy: async (body) => ({ ...summary, policies: [body] }),
      executeStorageRetention: async () => ({
        ...summary,
        activeJob: { id: "job-1", status: "running", progress: 0 },
      }),
      cancelStorageRetentionJob: async () => ({
        ...summary,
        activeJob: { id: "job-1", status: "cancelled", progress: 0 },
      }),
      rollbackStorageRetention: async () => ({
        ...summary,
        receipts: [{ id: "rollback-1", status: "rolled_back" }],
      }),
      readContributionState: async () => ({
        mode: "contributor",
        authorizationState: "pending_disclosure",
      }),
      updateContributionState: async (body) => ({
        mode: body.action === "opt_out" ? "consumer" : "contributor",
        authorizationState: "revoked",
      }),
      listRecommendations: async () => [{ id: "pack-1", signatureValid: true }],
      applyRecommendation: async () => ({ activePack: { id: "pack-1", version: "1" } }),
      readActivePack: async () => ({ id: "pack-1", version: "1" }),
    });
    try {
      const base = `http://127.0.0.1:${server.port}`;
      expect(await (await fetch(`${base}/api/role-model/extensions`)).json()).toEqual(extensions);
      expect(await (await fetch(`${base}/api/role-model/storage-retention`)).json()).toEqual(
        summary,
      );
      const dryRun = await fetch(`${base}/api/role-model/storage-retention/dry-run`, {
        method: "POST",
      });
      expect(dryRun.status).toBe(200);
      expect((await dryRun.json()).receipts[0].id).toBe("dry-1");
      expect((await (await fetch(`${base}/api/role-model/contribution`)).json()).mode).toBe(
        "contributor",
      );
      expect(
        (
          await (
            await fetch(`${base}/api/role-model/contribution`, {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ action: "opt_out" }),
            })
          ).json()
        ).mode,
      ).toBe("consumer");
      expect((await (await fetch(`${base}/api/role-model/recommendations`)).json())[0].id).toBe(
        "pack-1",
      );
      expect(
        (
          await (
            await fetch(`${base}/api/role-model/recommendations/apply`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ id: "pack-1" }),
            })
          ).json()
        ).activePack.id,
      ).toBe("pack-1");
      expect(
        (
          await (
            await fetch(`${base}/api/role-model/storage-retention/execute`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ manifestHash: "a".repeat(64) }),
            })
          ).json()
        ).activeJob.status,
      ).toBe("running");
    } finally {
      await server.close();
      await backend.shutdown();
    }
  });

  test("fails closed when an operations capability is not wired", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-operations-absent-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "track-b-operations-absent",
    });
    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry: backend.registry,
      getRegistry: () => backend.registry,
      executeChatCompletions: backend.executeChatCompletions,
      executeResponses: backend.executeResponses,
    });
    try {
      expect(
        (await fetch(`http://127.0.0.1:${server.port}/api/role-model/extensions`)).status,
      ).toBe(404);
    } finally {
      await server.close();
      await backend.shutdown();
    }
  });

  test("production backend never infers extension health from the catalog", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-production-absent-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "production",
    });
    try {
      const rows = (await backend.listExtensions()) as readonly {
        installed: boolean;
        lifecycle: string;
        health: { available: boolean };
      }[];
      expect(rows).toHaveLength(13);
      expect(
        rows.every(
          (row) => !row.installed && row.lifecycle === "unavailable" && !row.health.available,
        ),
      ).toBe(true);
    } finally {
      await backend.shutdown();
    }
  });

  test("local Track B bridge seed marks catalog extensions ready without ExtensionHost override", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-seeded-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const contract = JSON.parse(
      await readFile(
        path.join(repoRoot, "packages", "protocol-types", "generated", "product-contracts.json"),
        "utf8",
      ),
    ) as { extensions: readonly Record<string, unknown>[] };
    await seedTrackBExtensionBridgeState({
      statePath: path.join(runtimeStateRoot, "production", "track-b-production-bridge.json"),
      catalog: contract.extensions,
    });
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "production",
    });
    try {
      const rows = (await backend.listExtensions()) as readonly {
        id: string;
        installed: boolean;
        lifecycle: string;
        enabled: boolean;
        health: { available: boolean };
      }[];
      expect(rows).toHaveLength(13);
      expect(
        rows.every(
          (row) => row.installed && row.enabled && row.lifecycle === "ready" && row.health.available,
        ),
      ).toBe(true);
    } finally {
      await backend.shutdown();
    }
  });

  test("production backend reports readiness only from the supervised ExtensionHost", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-production-hosted-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "production",
      trackBExtensionHealth: () => ({
        host: { extensions: ["artifact-store", "event-log"] },
        supervisor: { "artifact-store": { status: "ready" }, "event-log": { status: "ready" } },
      }),
    });
    try {
      const rows = (await backend.listExtensions()) as readonly {
        id: string; installed: boolean; lifecycle: string; health: { available: boolean };
      }[];
      expect(rows.filter(row => row.health.available).map(row => row.id).sort()).toEqual(["artifact-store", "event-log"]);
      expect(rows.find(row => row.id === "artifact-store")).toMatchObject({ installed: true, lifecycle: "ready", health: { available: true } });
      expect(rows.find(row => row.id === "repository-context")).toMatchObject({ installed: false, lifecycle: "unavailable", health: { available: false } });
    } finally {
      await backend.shutdown();
    }
  });

  test("production backend clean start uses the canonical Advanced aggregate defaults", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-production-fresh-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "production",
    });
    try {
      expect(await backend.readContributionState()).toEqual({
        mode: "contributor",
        contributionTier: "advanced",
        recommendationTier: "advanced",
        recommendationAccess: "preview_and_apply",
        allowCloudUpload: true,
        authorizationState: "pending_disclosure",
        revocationEpoch: 0,
        queuedCount: 0,
        managed: false,
        disclosureId: null,
      });
    } finally {
      await backend.shutdown();
    }
  });

  test("production request completion reports only aggregate metrics to the private operations boundary", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-production-upload-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const received: Array<{ path: string; authorization?: string; body: Record<string, unknown> }> = [];
    const operations = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      received.push({
        path: request.url ?? "",
        authorization: request.headers.authorization,
        body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(request.url === "/capture/route"
        ? { status: "captured", scope: "tenant:production-upload", rootArtifactId: "artifact-route-capture", rootArtifactDigest: "a".repeat(64) }
        : { status: "accepted" }));
    });
    await new Promise<void>((resolve, reject) => {
      operations.once("error", reject);
      operations.listen(0, "127.0.0.1", resolve);
    });
    const address = operations.address();
    if (!address || typeof address === "string") throw new Error("operations server did not bind");
    const trackBOperationsEndpoint = `http://127.0.0.1:${address.port}`;
    delete process.env.ROLE_MODEL_TRACK_B_OPERATIONS_URL;
    process.env.ROLE_MODEL_TRACK_B_OPERATIONS_TOKEN = "a".repeat(64);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "production-upload",
      trackBOperationsEndpoint,
    });
    try {
      const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId: "production-upload" });
      const migration = new LegacySqliteMigration({
        databasePath,
        backupPath: path.join(runtimeStateRoot, "legacy-backup.sqlite"),
        artifactWriter: ({ contentHash }) => ({ artifactId: contentHash, artifactPath: `artifact://${contentHash}`, contentHash }),
        routerRoot: path.join(repoRoot, "role-model-router"),
      });
      migration.backfill({ scopeId: "tenant:production-upload", batchSize: 10 });
      migration.enterShadowMirror({ deadlineMs: Date.now() + 10_000 });
      migration.verifyParity({ backupVerified: true, restoreVerified: true, consumersVerified: true });
      migration.cutover();
      const result = await backend.executeChatCompletions(
        {
          model: "deepseek/chat-capture-v1",
          messages: [{ role: "user", content: "private prompt must never cross the boundary" }],
        },
        "req-track-b-upload-001",
      );
      expect(result.outputText.length).toBeGreaterThan(0);
      expect(received).toHaveLength(2);
      const aggregate = received.find((entry) => entry.path === "/contribution/aggregate");
      const capture = received.find((entry) => entry.path === "/capture/route");
      expect(aggregate).toMatchObject({
        path: "/contribution/aggregate",
        authorization: `Bearer ${"a".repeat(64)}`,
        body: {
          requestId: "req-track-b-upload-001",
          routingDecisionId: result.routingDecisionId,
          endpointId: result.endpointId,
          modelId: "deepseek/chat-capture-v1",
          taskType: "general.chat",
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          success: true,
        },
      });
      const serialized = JSON.stringify(aggregate?.body);
      for (const forbidden of ["messages", "prompt", "response", "content", "toolOutput", "providerBody"])
        expect(serialized).not.toContain(forbidden);
      expect(capture).toMatchObject({
        path: "/capture/route",
        body: {
          requestId: "req-track-b-upload-001",
          routingDecisionId: result.routingDecisionId,
          messages: [{ role: "user", content: "private prompt must never cross the boundary" }],
          outputText: result.outputText,
        },
      });
      expect(readRuntimeObservationBundle({ databasePath, requestId: "req-track-b-upload-001" })).toMatchObject({
        graphPrimary: true,
        artifactRef: {
          scopeId: "tenant:production-upload",
          artifactId: "artifact-route-capture",
          contentHash: "a".repeat(64),
        },
      });
    } finally {
      await backend.shutdown();
      await new Promise<void>((resolve, reject) =>
        operations.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  test("production Responses requests report aggregate metrics through the same private operations boundary", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-production-responses-upload-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const received: Array<{ path: string; authorization?: string; body: Record<string, unknown> }> = [];
    const operations = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      received.push({
        path: request.url ?? "",
        authorization: request.headers.authorization,
        body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(request.url === "/capture/route"
        ? { status: "captured", scope: "tenant:production-responses-upload", rootArtifactId: "artifact-route-capture", rootArtifactDigest: "b".repeat(64) }
        : { status: "accepted" }));
    });
    await new Promise<void>((resolve, reject) => {
      operations.once("error", reject);
      operations.listen(0, "127.0.0.1", resolve);
    });
    const address = operations.address();
    if (!address || typeof address === "string") throw new Error("operations server did not bind");
    const trackBOperationsEndpoint = `http://127.0.0.1:${address.port}`;
    delete process.env.ROLE_MODEL_TRACK_B_OPERATIONS_URL;
    process.env.ROLE_MODEL_TRACK_B_OPERATIONS_TOKEN = "b".repeat(64);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "production-responses-upload",
      trackBOperationsEndpoint,
    });
    try {
      const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId: "production-responses-upload" });
      const migration = new LegacySqliteMigration({
        databasePath,
        backupPath: path.join(runtimeStateRoot, "legacy-responses-backup.sqlite"),
        artifactWriter: ({ contentHash }) => ({ artifactId: contentHash, artifactPath: `artifact://${contentHash}`, contentHash }),
        routerRoot: path.join(repoRoot, "role-model-router"),
      });
      migration.backfill({ scopeId: "tenant:production-responses-upload", batchSize: 10 });
      migration.enterShadowMirror({ deadlineMs: Date.now() + 10_000 });
      migration.verifyParity({ backupVerified: true, restoreVerified: true, consumersVerified: true });
      migration.cutover();
      const result = await backend.executeResponses(
        {
          model: "deepseek/chat-capture-v1",
          input: "private responses prompt must never cross the aggregate boundary",
        },
        "req-track-b-responses-upload-001",
      );
      expect(result.outputText.length).toBeGreaterThan(0);
      expect(received).toHaveLength(2);
      const aggregate = received.find((entry) => entry.path === "/contribution/aggregate");
      const capture = received.find((entry) => entry.path === "/capture/route");
      expect(aggregate).toMatchObject({
        path: "/contribution/aggregate",
        authorization: `Bearer ${"b".repeat(64)}`,
        body: {
          requestId: "req-track-b-responses-upload-001",
          routingDecisionId: result.routingDecisionId,
          endpointId: result.endpointId,
          modelId: "deepseek/chat-capture-v1",
          taskType: "general.chat",
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          success: true,
        },
      });
      const serialized = JSON.stringify(aggregate?.body);
      expect(Object.keys(aggregate?.body ?? {}).sort()).toEqual([
        "endpointId",
        "inputTokens",
        "modelId",
        "outputTokens",
        "requestId",
        "routingDecisionId",
        "success",
        "taskType",
      ]);
      for (const forbidden of ["messages", "prompt", "content", "toolOutput", "providerBody", "private responses prompt"])
        expect(serialized).not.toContain(forbidden);
      expect(capture).toMatchObject({
        path: "/capture/route",
        body: {
          requestId: "req-track-b-responses-upload-001",
          routingDecisionId: result.routingDecisionId,
          outputText: result.outputText,
        },
      });
      expect(readRuntimeObservationBundle({ databasePath, requestId: "req-track-b-responses-upload-001" })).toMatchObject({
        graphPrimary: true,
        artifactRef: {
          scopeId: "tenant:production-responses-upload",
          artifactId: "artifact-route-capture",
          contentHash: "b".repeat(64),
        },
      });
    } finally {
      await backend.shutdown();
      await new Promise<void>((resolve, reject) =>
        operations.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  test("production backend reads and atomically updates real bridge storage state", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-production-state-${Date.now()}`);
    const scopeId = "production";
    const directory = path.join(runtimeStateRoot, scopeId);
    roots.push(runtimeStateRoot);
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "track-b-production-bridge.json"),
      JSON.stringify({
        schemaVersion: "role-model.track-b-production-bridge.v1",
        protocolVersion: "1.0",
        revision: 7,
        generatedAt: new Date().toISOString(),
        extensions: [
          {
            id: "artifact-store",
            lifecycle: "ready",
            enabled: true,
            channel: "production",
            scope: "global",
            authorizationEpoch: 3,
            health: { available: true, routingDependency: false },
          },
        ],
        storageServices: [
          {
            id: "artifact-store",
            category: "rich_trace",
            tier: "canonical",
            scope: "global",
            bytes: 100,
            count: 2,
            holds: 1,
            leases: 0,
            conflicts: [],
          },
          {
            id: "event-log",
            category: "routing_only",
            tier: "hot",
            scope: "global",
            bytes: 40,
            count: 4,
            holds: 0,
            leases: 1,
            conflicts: [],
          },
        ],
        retention: {
          managedPolicy: false,
          policies: [{ policyId: "balanced", scope: "global", maxBytes: 1024, maxAgeDays: 30 }],
          receipts: [],
          activeJob: null,
          currentPlan: {
            schemaVersion: "role-model.retention-dry-run.v1",
            channel: "production",
            affectedCount: 1,
            estimatedBytes: 100,
            conflicts: [{ id: "event-log", reason: "active_lease" }],
            lostCapabilities: ["token_exact"],
            retainedCapabilities: ["routing_history"],
            blocks: [],
            manifestHash: "a".repeat(64),
            rollbackAvailable: false,
            sourceRevision: 7,
          },
        },
        contribution: {
          mode: "contributor",
          contributionTier: "advanced",
          recommendationTier: "advanced",
          recommendationAccess: "preview_and_apply",
          allowCloudUpload: true,
          authorizationState: "pending_disclosure",
          revocationEpoch: 0,
          queuedCount: 2,
          managed: false,
        },
        recommendations: [
          {
            id: "pack-1",
            version: "1",
            status: "downloaded",
            signatureValid: true,
            policyAllowed: true,
            provenance: "cloud:bundle-1",
          },
          {
            id: "pack-bad",
            version: "1",
            status: "downloaded",
            signatureValid: false,
            policyAllowed: true,
            provenance: "cloud:bundle-2",
          },
        ],
        activePack: null,
      }),
    );
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId,
    });
    try {
      const extensions = (await backend.listExtensions()) as readonly {
        id: string;
        installed: boolean;
        health: { available: boolean };
      }[];
      expect(extensions.find((row) => row.id === "artifact-store")).toMatchObject({
        installed: true,
        health: { available: true },
      });
      expect(extensions.filter((row) => row.installed)).toHaveLength(1);
      expect(await backend.readStorageRetention()).toMatchObject({
        revision: 7,
        totalBytes: 140,
        holds: 1,
        leases: 1,
      });
      const next = (await backend.dryRunStorageRetention()) as {
        revision: number;
        receipts: readonly { affectedCount: number; rollbackAvailable: boolean }[];
      };
      expect(next.revision).toBe(8);
      expect(next.receipts.at(-1)).toMatchObject({ affectedCount: 1, rollbackAvailable: false });
      const policy = await backend.updateStorageRetentionPolicy({
        policyId: "strict",
        scope: "global",
        maxBytes: 512,
        maxAgeDays: 14,
      });
      expect(policy).toMatchObject({
        policies: [{ policyId: "strict", scope: "global", maxBytes: 512, maxAgeDays: 14 }],
        currentPlan: null,
      });
      await expect(
        backend.executeStorageRetention({ manifestHash: "a".repeat(64), scope: "global" }),
      ).rejects.toThrow(/hash-bound/i);
      const replanned = (await backend.dryRunStorageRetention()) as {
        currentPlan: { manifestHash: string };
      };
      await expect(
        backend.executeStorageRetention({
          manifestHash: replanned.currentPlan.manifestHash,
          scope: "global",
        }),
      ).rejects.toThrow(/private operations endpoint/i);
      const contribution = await backend.updateContributionState({ action: "opt_out" });
      expect(contribution).toMatchObject({
        allowCloudUpload: false,
        queuedCount: 0,
        authorizationState: "revoked",
        recommendationAccess: "preview_and_apply",
      });
      const reenabled = await backend.updateContributionState({ action: "reenable" });
      expect(reenabled).toMatchObject({
        authorizationState: "pending_disclosure",
        revocationEpoch: 2,
      });
      const recommendations = (await backend.listRecommendations()) as readonly {
        id: string;
        status: string;
      }[];
      expect(recommendations).toHaveLength(2);
      await expect(backend.applyRecommendation({ id: "pack-bad" })).rejects.toThrow(/signature/i);
      const { privateKey } = generateKeyPairSync("ed25519");
      const publicKey = createPublicKey(privateKey)
        .export({ format: "der", type: "spki" })
        .toString("base64");
      const record = {
        envelope: {
          artifactId: "recommendation-pack-downloaded",
          artifactKind: "endpoint_preference",
          source: { sourceContentHash: "a".repeat(64) },
          privacy: { rawContentIncluded: false, redactionApplied: true },
        },
        snapshotId: "snapshot-pack-downloaded",
        channelSequence: 2,
        recommendationEvidenceTier: "advanced",
        endpointId: "deepseek.run00.dev.global.deepseek-chat",
        modelId: "deepseek-chat",
        preferredFor: ["general.chat"],
        action: "prefer",
        confidence: 0.92,
      };
      const recordBytes = `${canonicalJson(record)}\n`;
      const recordHash = createHash("sha256").update(recordBytes).digest("hex");
      const manifest = {
        artifactFormat: "role-model.artifact-bundle.v1",
        contract: "ServerReturnBundleManifestV1",
        artifactBundleId: "snapshot-pack-downloaded",
        snapshotId: "snapshot-pack-downloaded",
        lifecycleState: "sealed",
        channel: "development",
        channelSequence: 2,
        recommendationTier: "advanced",
        manifestHash: recordHash,
        signingKeyId: "role-model-recommendations-run00-dev-v1",
        signatureRef: "signatures/manifest.sig",
        scopeId: "standalone-runtime-dev",
        boundaryProtocolVersion: "1.1",
        contents: [
          {
            path: "records/endpoint-preferences.jsonl",
            schemaId: "role-model.artifact.endpoint_preference.v1",
            artifactKinds: ["endpoint_preference"],
            recordCount: 1,
            byteLength: Buffer.byteLength(recordBytes),
            sha256: recordHash,
          },
        ],
      };
      const manifestBytes = `${canonicalJson(manifest)}\n`;
      const manifestSha256 = createHash("sha256").update(manifestBytes).digest("hex");
      const signature = {
        keyId: "role-model-recommendations-run00-dev-v1",
        algorithm: "ed25519",
        value: sign(null, Buffer.from(manifestBytes), privateKey).toString("base64"),
        manifestSha256,
      };
      process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_URL = "https://recommendations.example";
      process.env.ROLE_MODEL_RECOMMENDATION_VERIFICATION_KEY = publicKey;
      process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_TOKEN = "service-token";
      process.env.ROLE_MODEL_RECOMMENDATION_CHANNEL = "development";
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async (input, init) => {
            const url = String(input);
            if (url === "https://recommendations.example/api/role-model/recommendations/resolve") {
              expect(init?.method).toBe("POST");
              expect(new Headers(init?.headers).get("authorization")).toBe("Bearer service-token");
              return new Response(
                JSON.stringify({
                  contract: "RecommendationResolveResponseV1",
                  channel: "development",
                  status: "available",
                  snapshotId: "snapshot-pack-downloaded",
                  channelSequence: 2,
                  bundleUri: "https://recommendations.example/snapshots/development/stable/advanced/standalone-runtime-dev/sequence-2/manifest.json",
                  manifestHash: manifestSha256,
                }),
                { status: 200, headers: { "content-type": "application/json" } },
              );
            }
            if (url.endsWith("/manifest.json"))
              return new Response(manifestBytes, {
                status: 200,
                headers: { "content-type": "application/json" },
              });
            if (url.endsWith("/records/endpoint-preferences.jsonl"))
              return new Response(recordBytes, {
                status: 200,
                headers: { "content-type": "application/x-ndjson" },
              });
            if (url.endsWith("/signatures/manifest.sig"))
              return new Response(JSON.stringify(signature), {
                status: 200,
                headers: { "content-type": "application/json" },
              });
            return new Response(JSON.stringify({ error: "unexpected_url", url }), {
              status: 404,
              headers: { "content-type": "application/json" },
            });
          },
        ),
      );
      const downloaded = (await backend.downloadRecommendations()) as readonly {
        id: string;
        status: string;
        signatureValid: boolean;
        endpointId?: string;
        modelId?: string;
        preferredFor?: readonly string[];
        confidence?: number;
      }[];
      expect(downloaded).toEqual([
        {
          id: "recommendation-pack-downloaded",
          version: "2",
          provenance: `cloud:${manifestSha256}`,
          status: "validated",
          signatureValid: true,
          policyAllowed: true,
        endpointId: "deepseek.run00.dev.global.deepseek-chat",
        modelId: "deepseek-chat",
        preferredFor: ["general.chat"],
        action: "prefer",
        confidence: 0.92,
      },
      ]);
      const applied = await backend.applyRecommendation({ id: "recommendation-pack-downloaded" });
      expect(applied).toMatchObject({
        activePack: { id: "recommendation-pack-downloaded", version: "2" },
      });
    } finally {
      await backend.shutdown();
    }
  });

  test("launcher recommendation material config populates runtime download trust without raw env injection", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-recommendation-material-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const materialPath = path.join(runtimeStateRoot, "recommendation-material.json");
    await mkdir(runtimeStateRoot, { recursive: true });
    await writeFile(
      materialPath,
      JSON.stringify({
        recommendationPublicSpkiBase64: "public-spki-fixture",
        internalServiceToken: "service-token-fixture",
      }),
    );

    applyRecommendationServiceLauncherConfig({
      "recommendation-service-url": "https://recommendations-run00.role-model.dev",
      "recommendation-material-file": materialPath,
      "recommendation-channel": "development",
    });

    expect(process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_URL).toBe(
      "https://recommendations-run00.role-model.dev",
    );
    expect(process.env.ROLE_MODEL_RECOMMENDATION_CHANNEL).toBe("development");
    expect(process.env.ROLE_MODEL_RECOMMENDATION_VERIFICATION_KEY).toBe("public-spki-fixture");
    expect(process.env.ROLE_MODEL_RECOMMENDATION_SERVICE_TOKEN).toBe("service-token-fixture");
  });
});
