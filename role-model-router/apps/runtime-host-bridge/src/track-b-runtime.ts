import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

export interface OwnedTrackBSidecarProcess {
  endpoint: string;
  /** Ephemeral launcher-issued bearer token; never persisted or logged. */
  operationsToken: string;
  pid: number;
  exited: boolean;
  stop(): Promise<void>;
}

export interface OwnedTrackBSidecarSpec {
  artifactPath: string;
  artifactSha256: string;
  launch(): Promise<OwnedTrackBSidecarProcess>;
}

export interface TrackBProductionRuntimeOptions {
  stateRoot: string;
  sidecar: OwnedTrackBSidecarSpec;
}

export interface PackagedProductionBackendOptions {
  readonly trackBOperationsEndpoint: string;
  readonly trackBOperationsToken: string;
}

const trackBServerOperationNames = [
  "listExtensions",
  "readStorageRetention",
  "dryRunStorageRetention",
  "updateStorageRetentionPolicy",
  "executeStorageRetention",
  "cancelStorageRetentionJob",
  "rollbackStorageRetention",
  "readContributionState",
  "updateContributionState",
  "listRecommendations",
  "downloadRecommendations",
  "applyRecommendation",
  "readActivePack",
] as const;

export function createTrackBBridgeServerOptions<
  Backend extends Record<(typeof trackBServerOperationNames)[number], unknown>,
>(backend: Backend) {
  return Object.fromEntries(
    trackBServerOperationNames.map((name) => [name, backend[name]]),
  ) as Pick<Backend, (typeof trackBServerOperationNames)[number]>;
}

export async function stageTrackBRuntimeDistribution(options: {
  readonly sourceRoot: string;
  readonly releaseDir: string;
}) {
  const manifestPath = path.join(options.sourceRoot, "track-b-runtime-manifest.json");
  const manifestBytes = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as {
    readonly schemaVersion: string;
    readonly sidecar: { readonly modulePath: string; readonly artifactSha256: string };
    readonly extensions: readonly {
      readonly descriptor: ProductionExtensionDescriptor;
      readonly modulePath: string;
      readonly artifactSha256: string;
    }[];
  };
  if (
    manifest.schemaVersion !== "role-model.track-b-runtime-distribution.v1" ||
    manifest.extensions.length !== 13
  ) {
    throw new Error("Track B runtime distribution manifest is incomplete");
  }
  const files = [manifest.sidecar, ...manifest.extensions];
  const verified = await Promise.all(
    files.map(async (file) => {
      const relative = file.modulePath.replaceAll("\\", "/");
      if (relative.startsWith("/") || relative.split("/").includes("..")) {
        throw new Error("Track B runtime distribution path is unsafe");
      }
      const sourcePath = path.join(options.sourceRoot, relative);
      const observed = createHash("sha256")
        .update(await readFile(sourcePath))
        .digest("hex");
      if (observed !== file.artifactSha256.toLowerCase()) {
        throw new Error(
          `Track B runtime distribution integrity verification failed for ${relative}`,
        );
      }
      return { relative, sourcePath };
    }),
  );
  await mkdir(options.releaseDir, { recursive: true });
  for (const file of verified) {
    const destination = path.join(options.releaseDir, file.relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(file.sourcePath, destination);
  }
  const stagedManifestPath = path.join(options.releaseDir, "track-b-runtime-manifest.json");
  await copyFile(manifestPath, stagedManifestPath);
  return {
    manifestPath: stagedManifestPath,
    sidecarPath: path.join(options.releaseDir, manifest.sidecar.modulePath),
    sidecarSha256: manifest.sidecar.artifactSha256,
    extensionCount: manifest.extensions.length,
  };
}

export interface ProductionExtensionDescriptor {
  readonly id: string;
  readonly protocolVersion: string;
  readonly capabilities: readonly string[];
}

export function resolveExtensionHostModuleUrl(
  options: {
    readonly moduleUrl?: string;
    readonly repoRoot?: string;
  } = {},
) {
  const moduleUrl = options.moduleUrl?.trim();
  if (moduleUrl) {
    try {
      return new URL("../../../packages/extension-host/index.mjs", moduleUrl).href;
    } catch {
      // Packaged CJS/SEA builds can erase import.meta.url; fall through to explicit roots.
    }
  }

  const roots = [
    options.repoRoot,
    process.env.ROLE_MODEL_REPO_ROOT,
    process.cwd(),
    path.dirname(process.execPath),
  ].filter((root): root is string => Boolean(root?.trim()));
  const seen = new Set<string>();
  for (const root of roots) {
    const absoluteRoot = path.resolve(root);
    for (const candidate of [
      path.join(absoluteRoot, "role-model-router", "packages", "extension-host", "index.mjs"),
      path.join(absoluteRoot, "packages", "extension-host", "index.mjs"),
    ]) {
      const normalized = path.resolve(candidate);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      if (existsSync(normalized)) return pathToFileURL(normalized).href;
    }
  }
  throw new Error(
    "Track B extension host module could not be resolved from packaged runtime repo root",
  );
}

export function resolveTrackBNodeExecutable(
  options: {
    readonly configured?: string;
    readonly runtimeExecPath?: string;
  } = {},
) {
  const explicit =
    options.configured?.trim() ||
    process.env.ROLE_MODEL_TRACK_B_NODE_EXECUTABLE?.trim() ||
    process.env.ROLE_MODEL_NODE_EXECUTABLE?.trim();
  if (explicit) return explicit;
  const runtimeExecPath = options.runtimeExecPath?.trim() || process.execPath;
  const executableName = path.basename(runtimeExecPath).toLowerCase();
  return executableName === "node.exe" || executableName === "node" ? runtimeExecPath : "node";
}

export async function createProductionExtensionRuntime(options: {
  readonly stateRoot: string;
  readonly authorizationEpoch: number;
  readonly repoRoot?: string;
  readonly extensions: readonly {
    readonly descriptor: ProductionExtensionDescriptor;
    readonly modulePath: string;
    readonly artifactSha256: string;
  }[];
}) {
  if (options.extensions.length !== 13)
    throw new Error("exactly thirteen canonical extensions are required");
  const ids = options.extensions.map((row) => row.descriptor.id);
  if (new Set(ids).size !== ids.length) throw new Error("canonical extension ids must be unique");
  for (const extension of options.extensions) {
    const observed = createHash("sha256")
      .update(await readFile(extension.modulePath))
      .digest("hex");
    if (observed !== extension.artifactSha256.toLowerCase()) {
      throw new Error(
        `canonical extension integrity verification failed for ${extension.descriptor.id}`,
      );
    }
  }
  const hostModuleUrl = resolveExtensionHostModuleUrl({ repoRoot: options.repoRoot });
  const hostModule = (await import(hostModuleUrl)) as {
    ExtensionHost: new (
      options: Record<string, unknown>,
    ) => {
      registerProcess(descriptor: ProductionExtensionDescriptor, modulePath: string): Promise<void>;
      invoke(id: string, envelope: Record<string, unknown>): Promise<Record<string, unknown>>;
      health(): Record<string, unknown>;
      disable(): void;
      shutdown(): Promise<void>;
    };
    ExtensionSupervisor: new (
      options: Record<string, unknown>,
    ) => {
      ensure(id: string): Promise<{ status: string }>;
      stop(id: string): unknown;
      health(): Record<string, unknown>;
    };
  };
  const host = new hostModule.ExtensionHost({
    protocolVersion: "1.1.0",
    compatibleProtocolVersions: ["1.0.0"],
    authorizationEpoch: options.authorizationEpoch,
    journalPath: path.join(options.stateRoot, "extension-host.journal.ndjson"),
  });
  const supervisor = new hostModule.ExtensionSupervisor({
    factory: async (id: string) => ({
      exited: !(host.health().extensions as string[]).includes(id),
    }),
    maxRestarts: 3,
    restartBackoffMs: 10,
  });
  try {
    for (const extension of options.extensions) {
      await host.registerProcess(extension.descriptor, extension.modulePath);
      const supervised = await supervisor.ensure(extension.descriptor.id);
      if (supervised.status !== "ready")
        throw new Error(`extension supervisor rejected ${extension.descriptor.id}`);
    }
  } catch (error) {
    await host.shutdown();
    throw error;
  }
  return {
    invoke(id: string, envelope: Record<string, unknown>) {
      return host.invoke(id, envelope);
    },
    health() {
      return { host: host.health(), supervisor: supervisor.health() };
    },
    async close() {
      for (const id of ids) supervisor.stop(id);
      host.disable();
      await host.shutdown();
    },
  };
}

export async function createPackagedProductionRuntime<
  Backend extends {
    close?(): Promise<void>;
    shutdown?(): Promise<void>;
  },
>(
  options: TrackBProductionRuntimeOptions & {
    readonly createBackend: (options: PackagedProductionBackendOptions) => Promise<Backend>;
  },
): Promise<{
  readonly backend: Backend;
  readonly trackB: ReturnType<typeof createTrackBProductionRuntime>;
  close(): Promise<void>;
}> {
  const trackB = createTrackBProductionRuntime(options);
  const started = await trackB.start();
  let backend: Backend;
  try {
    backend = await options.createBackend({
      trackBOperationsEndpoint: started.operationsEndpoint,
      trackBOperationsToken: started.operationsToken,
    });
  } catch (error) {
    await trackB.stop();
    throw error;
  }
  return {
    backend,
    trackB,
    async close() {
      if (backend.shutdown) await backend.shutdown();
      else if (backend.close) await backend.close();
      await trackB.stop();
    },
  };
}

export function createOwnedTrackBSidecarSpec(options: {
  artifactPath: string;
  artifactSha256: string;
  stateRoot: string;
  channel: "development" | "stage" | "production";
  artifactDigestKeyFile?: string;
  artifactEncryptionKeyFile?: string;
  trustMaterialFile?: string;
  aggregateEndpoint?: string;
  aggregateScope?: string;
  startupTimeoutMs?: number;
}): OwnedTrackBSidecarSpec {
  if (
    options.channel === "production" &&
    (!options.artifactDigestKeyFile || !options.artifactEncryptionKeyFile)
  ) {
    throw new Error("production Track B sidecar requires managed artifact keys");
  }
  return {
    artifactPath: options.artifactPath,
    artifactSha256: options.artifactSha256,
    async launch() {
      const bytes = await readFile(options.artifactPath);
      const observedSha256 = createHash("sha256").update(bytes).digest("hex");
      if (observedSha256 !== options.artifactSha256.toLowerCase()) {
        throw new Error("Track B sidecar integrity verification failed");
      }

      const operationsToken = randomBytes(32).toString("hex");
      const nodeExecutable = resolveTrackBNodeExecutable();
      const child = spawn(
        nodeExecutable,
        [
          options.artifactPath,
          "--state-root",
          options.stateRoot,
          "--channel",
          options.channel,
          "--host",
          "127.0.0.1",
          "--port",
          "0",
          ...(options.artifactDigestKeyFile
            ? ["--artifact-digest-key-file", options.artifactDigestKeyFile]
            : []),
          ...(options.artifactEncryptionKeyFile
            ? ["--artifact-encryption-key-file", options.artifactEncryptionKeyFile]
            : []),
          ...(options.trustMaterialFile
            ? ["--trust-material-file", options.trustMaterialFile]
            : []),
          ...(options.aggregateEndpoint ? ["--aggregate-endpoint", options.aggregateEndpoint] : []),
          ...(options.aggregateScope ? ["--aggregate-scope", options.aggregateScope] : []),
        ],
        {
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
          env: {
            ...process.env,
            ROLE_MODEL_TRACK_B_OPERATIONS_TOKEN: operationsToken,
          },
        },
      );
      let exited = false;
      let ready = false;
      let stderr = "";
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        stderr = `${stderr}${chunk}`.slice(-16_384);
      });
      child.once("exit", () => {
        exited = true;
      });
      const lines = createInterface({ input: child.stdout });
      const endpoint = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Track B sidecar readiness timeout${stderr ? `: ${stderr}` : ""}`));
        }, options.startupTimeoutMs ?? 10_000);
        const rejectError = (error: Error) => {
          clearTimeout(timer);
          reject(
            new Error(`Track B node worker executable failed: ${error.message}`, { cause: error }),
          );
        };
        const rejectExit = (code: number | null, signal: NodeJS.Signals | null) => {
          clearTimeout(timer);
          reject(
            new Error(
              `Track B sidecar exited before readiness (${code ?? signal})${stderr ? `: ${stderr}` : ""}`,
            ),
          );
        };
        child.once("error", rejectError);
        child.once("exit", rejectExit);
        lines.on("line", (line) => {
          let message: unknown;
          try {
            message = JSON.parse(line);
          } catch {
            return;
          }
          if (
            typeof message === "object" &&
            message !== null &&
            (message as { type?: unknown }).type === "ready" &&
            typeof (message as { endpoint?: unknown }).endpoint === "string"
          ) {
            ready = true;
            clearTimeout(timer);
            child.off("error", rejectError);
            child.off("exit", rejectExit);
            resolve((message as { endpoint: string }).endpoint);
          }
        });
      }).catch((error) => {
        if (!exited) child.kill();
        throw error;
      });
      if (!ready || !child.pid) throw new Error("Track B sidecar readiness protocol failed");

      return {
        endpoint,
        operationsToken,
        pid: child.pid,
        get exited() {
          return exited;
        },
        async stop() {
          if (exited) return;
          await new Promise<void>((resolve) => {
            const force = setTimeout(() => {
              if (!exited) child.kill();
            }, 2_000);
            child.once("exit", () => {
              clearTimeout(force);
              resolve();
            });
            child.kill("SIGTERM");
          });
        },
      };
    },
  };
}

export function createTrackBProductionRuntime(options: TrackBProductionRuntimeOptions) {
  if (process.env.ROLE_MODEL_TRACK_B_OPERATIONS_URL?.trim()) {
    throw new Error(
      "Externally prestarted Track B operations boundary is forbidden in production composition",
    );
  }
  if (!options.stateRoot?.trim()) throw new Error("Track B state root is required");
  if (!options.sidecar.artifactPath?.trim())
    throw new Error("Track B sidecar artifact path is required");
  if (!/^[a-f0-9]{64}$/i.test(options.sidecar.artifactSha256)) {
    throw new Error("Track B sidecar artifact SHA-256 is required");
  }

  let processHandle: OwnedTrackBSidecarProcess | null = null;
  let status: "stopped" | "starting" | "ready" | "degraded" = "stopped";

  return {
    async start() {
      if (processHandle && !processHandle.exited) {
        return {
          operationsEndpoint: processHandle.endpoint,
          operationsToken: processHandle.operationsToken,
          sidecar: { ownedByLauncher: true, supervised: true, pid: processHandle.pid },
        };
      }
      status = "starting";
      try {
        processHandle = await options.sidecar.launch();
        if (!processHandle || processHandle.exited || !Number.isInteger(processHandle.pid)) {
          throw new Error("owned Track B sidecar exited during startup");
        }
        const endpoint = new URL(processHandle.endpoint);
        if (
          endpoint.protocol !== "http:" ||
          !["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname)
        ) {
          throw new Error("owned Track B sidecar must bind a loopback HTTP endpoint");
        }
        status = "ready";
        return {
          operationsEndpoint: processHandle.endpoint,
          operationsToken: processHandle.operationsToken,
          sidecar: { ownedByLauncher: true, supervised: true, pid: processHandle.pid },
        };
      } catch (error) {
        status = "degraded";
        throw error;
      }
    },
    health() {
      return {
        routingAvailable: true,
        sidecar: {
          status,
          ownedByLauncher: true,
          supervised: true,
          pid: processHandle?.pid ?? null,
        },
      };
    },
    async stop() {
      const active = processHandle;
      processHandle = null;
      status = "stopped";
      if (active && !active.exited) await active.stop();
    },
  };
}
