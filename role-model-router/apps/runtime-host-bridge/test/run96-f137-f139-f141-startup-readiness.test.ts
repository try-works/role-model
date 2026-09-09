import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import * as cli from "../src/cli.js";
import * as bridge from "../src/index.js";
import * as runtimeChannel from "../src/runtime-channel.js";
import {
  TRACK_B_CANONICAL_EXTENSION_IDS,
  createProductionExtensionRuntime,
} from "../src/track-b-runtime.js";

const temporaryRoots: string[] = [];
const testTempRoot =
  process.env.ROLE_MODEL_TEST_TEMP_ROOT ?? process.env.RUN96_TEST_TEMP_ROOT ?? "E:/role-model-temp";

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

type FakeExtensionRuntime = {
  health(): Record<string, unknown>;
  close(): Promise<void>;
};

function mutableReadyRuntime(): {
  runtime: FakeExtensionRuntime;
  setReady: (ready: boolean) => void;
} {
  let ready = true;
  return {
    runtime: {
      health: () => ({
        host: {
          available: ready,
          enabled: ready,
          extensions: [...TRACK_B_CANONICAL_EXTENSION_IDS],
        },
        supervisor: {
          available: ready,
          routingAvailable: ready,
          readyWorkers: ready ? TRACK_B_CANONICAL_EXTENSION_IDS.length : 12,
          workers: TRACK_B_CANONICAL_EXTENSION_IDS.map((id) => ({
            id,
            lifecycle: ready ? "ready" : "failed",
            pid: null,
          })),
        },
      }),
      close: async () => undefined,
    },
    setReady: (nextReady) => {
      ready = nextReady;
    },
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function readFunction<T>(namespace: object, name: string): T | undefined {
  const value = (namespace as Record<string, unknown>)[name];
  return typeof value === "function" ? (value as T) : undefined;
}

function fakeReadyRuntime(
  readyWorkers = TRACK_B_CANONICAL_EXTENSION_IDS.length,
): FakeExtensionRuntime {
  return {
    health: () => ({
      host: {
        available: true,
        enabled: true,
        extensions: [...TRACK_B_CANONICAL_EXTENSION_IDS],
      },
      supervisor: {
        available: true,
        routingAvailable: true,
        readyWorkers,
        workers: TRACK_B_CANONICAL_EXTENSION_IDS.map((id) => ({
          id,
          lifecycle: readyWorkers === TRACK_B_CANONICAL_EXTENSION_IDS.length ? "ready" : "starting",
          pid: null,
        })),
      },
    }),
    close: async () => undefined,
  };
}

async function createExtensionFixtures(replaceId?: string) {
  await mkdir(testTempRoot, { recursive: true });
  const root = await mkdtemp(path.join(testTempRoot, "run96-startup-boundary-"));
  temporaryRoots.push(root);
  return Promise.all(
    TRACK_B_CANONICAL_EXTENSION_IDS.map(async (id, index) => {
      const descriptorId = index === 0 && replaceId ? replaceId : id;
      const modulePath = path.join(root, `${index + 1}.mjs`);
      const source = `export async function run(envelope){return {available:true,id:${JSON.stringify(descriptorId)},requestId:envelope.requestId}}\n`;
      await writeFile(modulePath, source, "utf8");
      return {
        descriptor: {
          id: descriptorId,
          protocolVersion: "1.1.0",
          capabilities: ["health:probe"],
        },
        modulePath,
        artifactSha256: createHash("sha256").update(source).digest("hex"),
      };
    }),
  );
}

const canonicalBusinessCapabilities: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "artifact-store": ["graph:write", "artifact:read"],
  "event-log": ["event:append", "event:read"],
  "repository-context": ["repository:read"],
  "background-evidence-scheduler": [
    "job:schedule",
    "artifact:reference",
    "scheduler:schedule-and-run",
  ],
  "memory-store": ["memory:read", "memory:write", "memory:ingest-receipt", "memory:clear-scope"],
  "knowledge-store": [
    "knowledge:read",
    "knowledge:write",
    "knowledge:promote",
    "knowledge:tombstone",
    "knowledge:list",
  ],
  "evaluation-core": [
    "evaluation:run",
    "evaluation:score",
    "evaluation:create-job",
    "evaluation:consume-projection",
  ],
  "crowdsourced-learning": [
    "aggregate:preview",
    "aggregate:authorize",
    "aggregate:send",
    "aggregate:disclose",
    "aggregate:revoke",
  ],
  "replay-core": [
    "replay:plan",
    "replay:plan-graph",
    "replay:route-only",
    "replay:execute",
    "replay:cancel",
  ],
  "evaluation-runner-local": [
    "evaluation:local",
    "evaluation:run-local",
    "evaluation:work-once",
    "evaluation:pause",
    "evaluation:start",
  ],
  "trajectory-signals": ["signals:derive", "signals:analyze"],
  "profile-learner": [
    "profile:estimate",
    "profile:propose",
    "profile:build-snapshot",
    "profile:contextual-estimate",
    "profile:active",
    "profile:consume-projection",
  ],
  "knowledge-worker": [
    "knowledge:derive",
    "knowledge:retrieve",
    "knowledge:rollback",
    "knowledge:eval-consumer",
    "knowledge:consume-projection",
  ],
});

function createPackagedManifest() {
  const canonicalExtensions = TRACK_B_CANONICAL_EXTENSION_IDS.map((id) => ({
    id,
    protocolVersion: "1.1.0",
    capabilities: ["health:probe", ...(canonicalBusinessCapabilities[id] ?? [])],
  }));
  const contractRegistryText = JSON.stringify({
    schemaVersion: "role-model.extension-package-registry.v2",
    contractVersion: "1.1.0",
    contractRegistry: {
      schemaVersion: "role-model.contract-registry.v1",
      currentVersion: "1.1.0",
      minimumReaderVersion: "1.0.0",
      unknownFuture: "fail_closed",
    },
    packages: canonicalExtensions.map((descriptor) => ({
      id: descriptor.id,
      class: "canonical_extension",
      runtime: descriptor,
    })),
  });
  return {
    schemaVersion: "role-model.track-b-runtime-distribution.v2",
    registryBindings: {
      runtimeChannel: {
        schema: "role-model.runtime-channel-contracts.v1",
        currentVersion: "2.0.0",
        minimumReaderVersion: "1.0.0",
      },
      contractRegistry: {
        schemaVersion: "role-model.contract-registry.v1",
        currentVersion: "1.1.0",
        minimumReaderVersion: "1.0.0",
        unknownFuture: "fail_closed",
        registryPath: "contracts/package-registry.json",
        schemaPath: "contracts/contract-registry.schema.json",
        adapterPath: "public-runtime-adapter.mjs",
        registrySha256: createHash("sha256").update(contractRegistryText).digest("hex"),
        schemaSha256: "a".repeat(64),
        adapterSha256: "b".repeat(64),
      },
    },
    runtimeChannelContext: {
      channel: "stage" as const,
      scopeId: "standalone-runtime-stage",
      authorizationEpoch: 96,
    },
    extensions: canonicalExtensions.map((descriptor) => ({
      descriptor: {
        ...descriptor,
        channelContractVersion: "2.0.0",
      },
    })),
    contractRegistryText,
  };
}

describe("Run 96 Addendum 27 F137/F139/F141 startup boundaries", () => {
  test("F137: delayed extension startup does not mark the CLI ready before all workers negotiate", async () => {
    const awaitStartup = readFunction<typeof import("../src/cli.js").awaitCliExtensionRuntime>(
      cli,
      "awaitCliExtensionRuntime",
    );
    expect(awaitStartup).toBeTypeOf("function");
    if (!awaitStartup) return;

    const bootstrapState = { status: "pending" as const };
    let resolveRuntime!: (runtime: FakeExtensionRuntime) => void;
    const startup = awaitStartup(
      new Promise<FakeExtensionRuntime>((resolve) => {
        resolveRuntime = resolve;
      }),
      bootstrapState,
      { expectedExtensionIds: TRACK_B_CANONICAL_EXTENSION_IDS },
    );

    await Promise.resolve();
    expect(bootstrapState.status).toBe("pending");
    resolveRuntime(fakeReadyRuntime());
    await expect(startup).resolves.toBeDefined();
    expect(bootstrapState.status).toBe("ready");
  });

  test("F137: rejected and incomplete extension startup leaves the CLI failed and never ready", async () => {
    const awaitStartup = readFunction<typeof import("../src/cli.js").awaitCliExtensionRuntime>(
      cli,
      "awaitCliExtensionRuntime",
    );
    expect(awaitStartup).toBeTypeOf("function");
    if (!awaitStartup) return;

    const rejectedState = { status: "pending" as const };
    await expect(
      awaitStartup(Promise.reject(new Error("worker startup rejected")), rejectedState, {
        expectedExtensionIds: TRACK_B_CANONICAL_EXTENSION_IDS,
      }),
    ).rejects.toThrow("worker startup rejected");
    expect(rejectedState.status).toBe("failed");

    const incompleteState = { status: "pending" as const };
    await expect(
      awaitStartup(Promise.resolve(fakeReadyRuntime(12)), incompleteState, {
        expectedExtensionIds: TRACK_B_CANONICAL_EXTENSION_IDS,
      }),
    ).rejects.toThrow(/ready|13|extension/i);
    expect(incompleteState.status).toBe("failed");
  });

  test("F137: an early extension rejection is observed before later packaged startup can orphan it", async () => {
    const createOwner = readFunction<typeof import("../src/cli.js").createCliExtensionRuntimeOwner>(
      cli,
      "createCliExtensionRuntimeOwner",
    );
    expect(createOwner).toBeTypeOf("function");
    if (!createOwner) return;

    const unhandledReasons: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => {
      unhandledReasons.push(reason);
    };
    process.on("unhandledRejection", onUnhandledRejection);
    try {
      const startupError = new Error("extension startup rejected before packaged backend");
      const owner = createOwner(Promise.reject(startupError));

      await delay(0);
      expect(unhandledReasons).toEqual([]);
      await expect(owner.promise).rejects.toThrow(startupError.message);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }
  });

  test("F137: later packaged startup failure closes an extension runtime that already resolved", async () => {
    const createOwner = readFunction<typeof import("../src/cli.js").createCliExtensionRuntimeOwner>(
      cli,
      "createCliExtensionRuntimeOwner",
    );
    expect(createOwner).toBeTypeOf("function");
    if (!createOwner) return;

    let closeCount = 0;
    const owner = createOwner(
      Promise.resolve({
        health: () => ({
          host: { available: true },
          supervisor: { available: true },
        }),
        close: async () => {
          closeCount += 1;
        },
      }),
    );

    await expect(
      (async () => {
        await owner.promise;
        throw new Error("packaged backend startup failed");
      })(),
    ).rejects.toThrow("packaged backend startup failed");
    await owner.close();
    await owner.close();
    expect(closeCount).toBe(1);
  });

  test("F139: production startup rejects an unknown ID even when the extension count is thirteen", async () => {
    const extensions = await createExtensionFixtures("unknown-extension");
    const result = await createProductionExtensionRuntime({
      stateRoot: path.dirname(extensions[0].modulePath),
      authorizationEpoch: 96,
      repoRoot: path.resolve(import.meta.dirname, "../../../../"),
      extensions,
    }).then(
      (runtime) => ({ runtime, error: undefined }),
      (error: unknown) => ({ runtime: undefined, error }),
    );
    if (result.runtime) await result.runtime.close();
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error | undefined)?.message).toMatch(
      /canonical extension set|unknown extension|missing extension/i,
    );
  });

  test("F141: packaged startup negotiation accepts current and N-1 readers and rejects capability/version/context/epoch mismatches", () => {
    const negotiate = readFunction<typeof runtimeChannel.negotiateRuntimeChannelStartup>(
      runtimeChannel,
      "negotiateRuntimeChannelStartup",
    );
    expect(negotiate).toBeTypeOf("function");
    if (!negotiate) return;

    const base = {
      channel: "stage" as const,
      writerVersion: "2.0.0",
      readerVersion: "2.0.0",
      offeredCapabilities: ["runtime:health", "track-b:extensions"],
      requiredCapabilities: ["runtime:health"],
      writerContext: {
        channel: "stage" as const,
        scopeId: "standalone-runtime-stage",
        authorizationEpoch: 96,
      },
      readerContext: {
        channel: "stage" as const,
        scopeId: "standalone-runtime-stage",
        authorizationEpoch: 96,
      },
    };

    expect(negotiate(base)).toMatchObject({ accepted: true, compatibility: "current" });
    expect(negotiate({ ...base, writerVersion: "1.0.0" })).toMatchObject({
      accepted: true,
      compatibility: "N-1",
    });
    expect(() => negotiate({ ...base, offeredCapabilities: [] })).toThrow(/capabilit/i);
    expect(() => negotiate({ ...base, writerVersion: "9.0.0" })).toThrow(
      /version|future|unsupported/i,
    );
    expect(() =>
      negotiate({
        ...base,
        readerContext: { ...base.readerContext, channel: "development" },
      }),
    ).toThrow(/context|channel|scope/i);
    expect(() =>
      negotiate({
        ...base,
        readerContext: { ...base.readerContext, authorizationEpoch: 95 },
      }),
    ).toThrow(/epoch|stale|context/i);
  });

  test("F141: the packaged startup path binds manifest negotiation to the runtime readiness context", () => {
    const negotiatePackaged = readFunction<typeof cli.negotiatePackagedTrackBStartup>(
      cli,
      "negotiatePackagedTrackBStartup",
    );
    expect(negotiatePackaged).toBeTypeOf("function");
    if (!negotiatePackaged) return;

    const manifest = createPackagedManifest();
    const input = {
      channel: "stage" as const,
      scopeId: "standalone-runtime-stage",
      authorizationEpoch: 96,
      manifest,
      contractRegistryText: manifest.contractRegistryText,
      writerContext: manifest.runtimeChannelContext,
      readerContext: {
        channel: "stage" as const,
        scopeId: "standalone-runtime-stage",
        authorizationEpoch: 96,
      },
    };

    expect(negotiatePackaged(input)).toMatchObject({ accepted: true, compatibility: "current" });
    expect(() =>
      negotiatePackaged({
        ...input,
        manifest: {
          ...manifest,
          extensions: manifest.extensions.map((extension) => ({
            ...extension,
            descriptor: { ...extension.descriptor, capabilities: [] },
          })),
        },
      }),
    ).toThrow(/capabilit/i);
    expect(() =>
      negotiatePackaged({
        ...input,
        manifest: {
          ...manifest,
          registryBindings: {
            runtimeChannel: {
              ...manifest.registryBindings.runtimeChannel,
              currentVersion: "9.0.0",
            },
          },
        },
      }),
    ).toThrow(/version|unsupported/i);
    expect(() =>
      negotiatePackaged({
        ...input,
        manifest: {
          ...manifest,
          runtimeChannelContext: { ...manifest.runtimeChannelContext, scopeId: "other-scope" },
        },
      }),
    ).toThrow(/context|scope/i);
    expect(() =>
      negotiatePackaged({
        ...input,
        manifest: {
          ...manifest,
          runtimeChannelContext: { ...manifest.runtimeChannelContext, authorizationEpoch: 95 },
        },
      }),
    ).toThrow(/epoch|stale|context/i);
  });

  test("F141: packaged startup rejects a canonical extension missing its own mandatory capability", () => {
    const negotiatePackaged = readFunction<typeof cli.negotiatePackagedTrackBStartup>(
      cli,
      "negotiatePackagedTrackBStartup",
    );
    expect(negotiatePackaged).toBeTypeOf("function");
    if (!negotiatePackaged) return;

    const manifest = createPackagedManifest();
    const artifact = manifest.extensions.find(
      (extension) => extension.descriptor.id === "artifact-store",
    );
    if (!artifact) throw new Error("artifact-store fixture missing");
    const input = {
      channel: "stage" as const,
      scopeId: "standalone-runtime-stage",
      authorizationEpoch: 96,
      manifest,
      contractRegistryText: manifest.contractRegistryText,
      writerContext: manifest.runtimeChannelContext,
      readerContext: {
        channel: "stage" as const,
        scopeId: "standalone-runtime-stage",
        authorizationEpoch: 96,
      },
    };
    expect(() =>
      negotiatePackaged({
        ...input,
        manifest: {
          ...manifest,
          extensions: manifest.extensions.map((extension) =>
            extension === artifact
              ? {
                  ...extension,
                  descriptor: {
                    ...extension.descriptor,
                    capabilities: ["health:probe", "artifact:read"],
                  },
                }
              : extension,
          ),
        },
      }),
    ).toThrow(/artifact-store|graph:write|capabil/i);
  });

  test("F141: packaged startup rejects a business capability offered only by the wrong extension", () => {
    const negotiatePackaged = readFunction<typeof cli.negotiatePackagedTrackBStartup>(
      cli,
      "negotiatePackagedTrackBStartup",
    );
    expect(negotiatePackaged).toBeTypeOf("function");
    if (!negotiatePackaged) return;

    const manifest = createPackagedManifest();
    const input = {
      channel: "stage" as const,
      scopeId: "standalone-runtime-stage",
      authorizationEpoch: 96,
      manifest,
      contractRegistryText: manifest.contractRegistryText,
      writerContext: manifest.runtimeChannelContext,
      readerContext: {
        channel: "stage" as const,
        scopeId: "standalone-runtime-stage",
        authorizationEpoch: 96,
      },
    };
    expect(() =>
      negotiatePackaged({
        ...input,
        manifest: {
          ...manifest,
          extensions: manifest.extensions.map((extension) => {
            if (extension.descriptor.id === "artifact-store") {
              return {
                ...extension,
                descriptor: {
                  ...extension.descriptor,
                  capabilities: ["health:probe", "artifact:read"],
                },
              };
            }
            if (extension.descriptor.id === "event-log") {
              return {
                ...extension,
                descriptor: {
                  ...extension.descriptor,
                  capabilities: [...extension.descriptor.capabilities, "graph:write"],
                },
              };
            }
            return extension;
          }),
        },
      }),
    ).toThrow(/artifact-store|graph:write|capabil/i);
  });

  test("F141: packaged startup rejects duplicate or unknown descriptor IDs", () => {
    const negotiatePackaged = readFunction<typeof cli.negotiatePackagedTrackBStartup>(
      cli,
      "negotiatePackagedTrackBStartup",
    );
    expect(negotiatePackaged).toBeTypeOf("function");
    if (!negotiatePackaged) return;

    const manifest = createPackagedManifest();
    const input = {
      channel: "stage" as const,
      scopeId: "standalone-runtime-stage",
      authorizationEpoch: 96,
      manifest,
      contractRegistryText: manifest.contractRegistryText,
      writerContext: manifest.runtimeChannelContext,
      readerContext: {
        channel: "stage" as const,
        scopeId: "standalone-runtime-stage",
        authorizationEpoch: 96,
      },
    };
    const duplicateExtensions = manifest.extensions.map((extension, index) =>
      index === manifest.extensions.length - 1
        ? {
            ...extension,
            descriptor: {
              ...extension.descriptor,
              id: "artifact-store",
            },
          }
        : extension,
    );
    expect(() =>
      negotiatePackaged({ ...input, manifest: { ...manifest, extensions: duplicateExtensions } }),
    ).toThrow(/duplicate|canonical|descriptor/i);

    const unknownExtensions = manifest.extensions.map((extension, index) =>
      index === 0
        ? {
            ...extension,
            descriptor: {
              ...extension.descriptor,
              id: "unknown-extension",
            },
          }
        : extension,
    );
    expect(() =>
      negotiatePackaged({ ...input, manifest: { ...manifest, extensions: unknownExtensions } }),
    ).toThrow(/unknown|canonical|descriptor/i);
  });

  test("F141: packaged startup rejects a per-extension protocol or channel-contract version mismatch", () => {
    const negotiatePackaged = readFunction<typeof cli.negotiatePackagedTrackBStartup>(
      cli,
      "negotiatePackagedTrackBStartup",
    );
    expect(negotiatePackaged).toBeTypeOf("function");
    if (!negotiatePackaged) return;

    const manifest = createPackagedManifest();
    const input = {
      channel: "stage" as const,
      scopeId: "standalone-runtime-stage",
      authorizationEpoch: 96,
      manifest,
      contractRegistryText: manifest.contractRegistryText,
      writerContext: manifest.runtimeChannelContext,
      readerContext: {
        channel: "stage" as const,
        scopeId: "standalone-runtime-stage",
        authorizationEpoch: 96,
      },
    };
    expect(() =>
      negotiatePackaged({
        ...input,
        manifest: {
          ...manifest,
          extensions: manifest.extensions.map((extension) =>
            extension.descriptor.id === "artifact-store"
              ? {
                  ...extension,
                  descriptor: { ...extension.descriptor, protocolVersion: "9.9.9" },
                }
              : extension,
          ),
        },
      }),
    ).toThrow(/artifact-store|protocol|version/i);

    expect(() =>
      negotiatePackaged({
        ...input,
        manifest: {
          ...manifest,
          extensions: manifest.extensions.map((extension) =>
            extension.descriptor.id === "event-log"
              ? {
                  ...extension,
                  descriptor: { ...extension.descriptor, channelContractVersion: "1.0.0" },
                }
              : extension,
          ),
        },
      }),
    ).toThrow(/event-log|channel|contract|version/i);
  });

  test("F141: packaged startup rejects a non-canonical descriptor order", () => {
    const negotiatePackaged = readFunction<typeof cli.negotiatePackagedTrackBStartup>(
      cli,
      "negotiatePackagedTrackBStartup",
    );
    expect(negotiatePackaged).toBeTypeOf("function");
    if (!negotiatePackaged) return;

    const manifest = createPackagedManifest();
    expect(() =>
      negotiatePackaged({
        channel: "stage",
        scopeId: "standalone-runtime-stage",
        authorizationEpoch: 96,
        manifest: { ...manifest, extensions: [...manifest.extensions].reverse() },
        contractRegistryText: manifest.contractRegistryText,
        writerContext: manifest.runtimeChannelContext,
        readerContext: {
          channel: "stage" as const,
          scopeId: "standalone-runtime-stage",
          authorizationEpoch: 96,
        },
      }),
    ).toThrow(/canonical|order/i);
  });

  test("F141: current packaged startup requires explicit context and per-extension contract versions", () => {
    const negotiatePackaged = readFunction<typeof cli.negotiatePackagedTrackBStartup>(
      cli,
      "negotiatePackagedTrackBStartup",
    );
    expect(negotiatePackaged).toBeTypeOf("function");
    if (!negotiatePackaged) return;

    const manifest = createPackagedManifest();
    const input = {
      channel: "stage" as const,
      scopeId: "standalone-runtime-stage",
      authorizationEpoch: 96,
      manifest,
      contractRegistryText: manifest.contractRegistryText,
      writerContext: manifest.runtimeChannelContext,
      readerContext: {
        channel: "stage" as const,
        scopeId: "standalone-runtime-stage",
        authorizationEpoch: 96,
      },
    };
    expect(() =>
      negotiatePackaged({
        ...input,
        manifest: { ...manifest, runtimeChannelContext: undefined },
      }),
    ).toThrow(/context|channel/i);
    expect(() =>
      negotiatePackaged({
        ...input,
        manifest: {
          ...manifest,
          extensions: manifest.extensions.map((extension) =>
            extension.descriptor.id === "artifact-store"
              ? {
                  ...extension,
                  descriptor: {
                    id: extension.descriptor.id,
                    protocolVersion: extension.descriptor.protocolVersion,
                    capabilities: extension.descriptor.capabilities,
                  },
                }
              : extension,
          ),
        },
      }),
    ).toThrow(/contract|version/i);
  });

  test("F141: packaged startup uses and integrity-checks the bundled registry authority", () => {
    const negotiatePackaged = readFunction<typeof cli.negotiatePackagedTrackBStartup>(
      cli,
      "negotiatePackagedTrackBStartup",
    );
    expect(negotiatePackaged).toBeTypeOf("function");
    if (!negotiatePackaged) return;

    const manifest = createPackagedManifest();
    const input = {
      channel: "stage" as const,
      scopeId: "standalone-runtime-stage",
      authorizationEpoch: 96,
      manifest,
      contractRegistryText: manifest.contractRegistryText,
      writerContext: manifest.runtimeChannelContext,
      readerContext: {
        channel: "stage" as const,
        scopeId: "standalone-runtime-stage",
        authorizationEpoch: 96,
      },
    };
    expect(() =>
      negotiatePackaged({
        ...input,
        contractRegistryText: `${manifest.contractRegistryText}\n`,
      }),
    ).toThrow(/registry|digest|integrity/i);

    const authority = JSON.parse(manifest.contractRegistryText) as {
      packages: Array<{ id: string; runtime: { capabilities: string[] } }>;
    };
    const artifact = authority.packages.find((entry) => entry.id === "artifact-store");
    if (!artifact) throw new Error("artifact-store registry fixture missing");
    artifact.runtime.capabilities = ["health:probe", "artifact:read"];
    const mutatedRegistryText = JSON.stringify(authority);
    expect(() =>
      negotiatePackaged({
        ...input,
        contractRegistryText: mutatedRegistryText,
      }),
    ).toThrow(/artifact-store|registry|capabil/i);
  });

  test("F137: actual HTTP healthz stays pending until publication and retracts after a late worker failure", async () => {
    const startWatchdog = readFunction<typeof cli.startCliExtensionRuntimeWatchdog>(
      cli,
      "startCliExtensionRuntimeWatchdog",
    );
    expect(startWatchdog).toBeTypeOf("function");
    if (!startWatchdog) return;

    const mutable = mutableReadyRuntime();
    const state: { status: "pending" | "ready" | "failed"; message?: string } = {
      status: "pending",
      message: "extension runtime starting",
    };
    let published = true;
    let runtime: FakeExtensionRuntime | null = mutable.runtime;
    let cleanupCount = 0;
    const backend = {
      effectiveRegistry: {
        endpoints: [],
        diagnostics: [],
        lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
      },
      readHealthStatus: async () => ({ status: "healthy" }),
    };
    const onFailure = async (error: unknown) => {
      cleanupCount += 1;
      published = false;
      runtime = null;
      state.status = "failed";
      state.message = error instanceof Error ? error.message : "extension runtime failed";
    };
    const server = await bridge.startBridgeServer(
      cli.createCliServerOptions(
        { host: "127.0.0.1", port: 0 },
        {
          getBackend: () => (published ? (backend as never) : null),
          readBootstrapState: () => state,
          readExtensionRuntime: () => runtime,
          onExtensionRuntimeFailure: onFailure,
        },
      ),
    );
    let stopWatchdog: (() => void) | undefined;
    try {
      const initialHealth = await fetch(`http://127.0.0.1:${server.port}/healthz`);
      expect(initialHealth.status).toBe(200);
      await expect(initialHealth.json()).resolves.toEqual(
        expect.objectContaining({
          status: "degraded",
          sessionBootstrap: expect.objectContaining({ status: "pending" }),
        }),
      );

      state.status = "ready";
      delete state.message;
      const readyHealth = await fetch(`http://127.0.0.1:${server.port}/healthz`);
      expect(readyHealth.status).toBe(200);
      await expect(readyHealth.json()).resolves.toEqual({ status: "healthy" });

      stopWatchdog = startWatchdog({
        getRuntime: () => runtime,
        bootstrapState: state,
        expectedExtensionIds: TRACK_B_CANONICAL_EXTENSION_IDS,
        onFailure,
        intervalMs: 5,
      });
      mutable.setReady(false);
      await delay(40);
      expect(cleanupCount).toBe(1);
      expect(state.status).toBe("failed");
      expect(published).toBe(false);

      const failedHealth = await fetch(`http://127.0.0.1:${server.port}/healthz`);
      expect(failedHealth.status).toBe(200);
      await expect(failedHealth.json()).resolves.toEqual(
        expect.objectContaining({
          status: "degraded",
          sessionBootstrap: expect.objectContaining({ status: "blocked" }),
        }),
      );
    } finally {
      stopWatchdog?.();
      await server.close();
    }
  });
});
