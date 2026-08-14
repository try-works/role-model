import { spawn } from "node:child_process";
import { createHash, randomBytes, verify as verifySignature } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

import {
  type LegacyMigrationState,
  type LegacySqliteMigration,
  type PersistRuntimeObservationBundleInput,
  type RuntimeObservationGraphStore,
  persistRuntimeObservationBundle,
  readLegacyMigrationJournal,
  readRuntimeObservationBundle,
} from "@role-model-router/sqlite-memory";
import { createProjectionV2 } from "@role-model-router/trace";

import { consumeTrackBProjection } from "./track-b-projections.js";

const RUN88_PI_PROOF_VALIDITY_MS = 90 * 60 * 1000;
const isSuppressedRun88Capture = (value: unknown): boolean =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as Record<string, unknown>).suppressed === true,
  );

function canonicalizeRun88Proof(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeRun88Proof);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonicalizeRun88Proof((value as Record<string, unknown>)[key])]),
    );
  return value;
}

export { consumeTrackBProjection } from "./track-b-projections.js";

export function trackBDistributionRequiresSQLiteMaintenance(manifest: {
  readonly schemaVersion: string;
  readonly publicRuntimeAdapter?: unknown;
}): boolean {
  return (
    manifest.schemaVersion === "role-model.track-b-runtime-distribution.v2" &&
    manifest.publicRuntimeAdapter !== undefined &&
    manifest.publicRuntimeAdapter !== null
  );
}

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

export interface ManagedArtifactKeyFiles {
  readonly artifactDigestKeyFile?: string;
  readonly artifactEncryptionKeyFile?: string;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function assertManagedArtifactKeyFile(filePath: string): Promise<void> {
  const resolved = path.resolve(filePath);
  const status = await lstat(resolved);
  if (!status.isFile() || status.isSymbolicLink()) {
    throw new Error("managed artifact key path must be a regular non-symlink file");
  }
  const raw = await readFile(resolved);
  const trimmed = raw.toString("utf8").trim();
  if (raw.length !== 32 && !/^[a-f0-9]{64}$/i.test(trimmed)) {
    throw new Error(
      "managed artifact key must contain exactly 32 bytes or 64 hexadecimal characters",
    );
  }
}

/**
 * Resolves operator-supplied keys or provisions a runtime-owned production key pair.
 * The owned pair lives under the stable runtime state root, never the versioned package,
 * so manual binary updates keep existing Message Graph ciphertext readable.
 */
export async function resolveManagedArtifactKeyFiles(options: {
  readonly channel: "development" | "stage" | "production";
  readonly stateRoot: string;
  readonly artifactDigestKeyFile?: string;
  readonly artifactEncryptionKeyFile?: string;
}): Promise<ManagedArtifactKeyFiles> {
  const suppliedDigest = options.artifactDigestKeyFile?.trim();
  const suppliedEncryption = options.artifactEncryptionKeyFile?.trim();
  if (suppliedDigest || suppliedEncryption) {
    if (!suppliedDigest || !suppliedEncryption) {
      throw new Error("managed artifact digest and encryption key files must be supplied together");
    }
    const resolved = {
      artifactDigestKeyFile: path.resolve(suppliedDigest),
      artifactEncryptionKeyFile: path.resolve(suppliedEncryption),
    };
    await Promise.all([
      assertManagedArtifactKeyFile(resolved.artifactDigestKeyFile),
      assertManagedArtifactKeyFile(resolved.artifactEncryptionKeyFile),
    ]);
    return resolved;
  }
  if (options.channel !== "production") return {};

  const stableStateRoot = path.resolve(options.stateRoot);
  const keyRoot = path.join(stableStateRoot, "managed-keys");
  const artifactDigestKeyFile = path.join(keyRoot, "artifact-digest.key");
  const artifactEncryptionKeyFile = path.join(keyRoot, "artifact-encryption.key");
  const readPublishedPair = async (): Promise<ManagedArtifactKeyFiles> => {
    const [digestExists, encryptionExists] = await Promise.all([
      pathExists(artifactDigestKeyFile),
      pathExists(artifactEncryptionKeyFile),
    ]);
    if (!digestExists || !encryptionExists) {
      throw new Error(
        "incomplete managed artifact key set; restore both Message Graph keys from backup",
      );
    }
    await Promise.all([
      assertManagedArtifactKeyFile(artifactDigestKeyFile),
      assertManagedArtifactKeyFile(artifactEncryptionKeyFile),
    ]);
    return { artifactDigestKeyFile, artifactEncryptionKeyFile };
  };

  if (await pathExists(keyRoot)) return readPublishedPair();

  await mkdir(stableStateRoot, { recursive: true });
  const temporaryRoot = await mkdtemp(`${keyRoot}.tmp-`);
  try {
    await Promise.all([
      writeFile(path.join(temporaryRoot, "artifact-digest.key"), randomBytes(32), {
        flag: "wx",
        mode: 0o600,
      }),
      writeFile(path.join(temporaryRoot, "artifact-encryption.key"), randomBytes(32), {
        flag: "wx",
        mode: 0o600,
      }),
    ]);
    try {
      await rename(temporaryRoot, keyRoot);
    } catch (error) {
      if (!(await pathExists(keyRoot))) throw error;
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
  return readPublishedPair();
}

export interface TrackBProductionRuntimeOptions {
  stateRoot: string;
  sidecar: OwnedTrackBSidecarSpec;
}

/**
 * Normal host-path adapter for graph-primary observation storage. The SQLite
 * package owns the journal and pointer rows; the injected store owns rich bytes.
 */
export function createTrackBGraphObservationPersistence(input: {
  readonly databasePath: string;
  readonly channel: "development" | "stage" | "production";
  readonly graphStore: RuntimeObservationGraphStore;
}) {
  if (!input.databasePath || !input.graphStore?.scopeId) {
    throw new Error("scoped graph observation persistence is required");
  }
  return {
    persist(observation: PersistRuntimeObservationBundleInput["observation"]): void {
      persistRuntimeObservationBundle({
        databasePath: input.databasePath,
        channel: input.channel,
        observation,
        graphStore: input.graphStore,
      });
    },
    read(requestId: string) {
      if (!requestId) throw new Error("runtime observation request ID is required");
      return readRuntimeObservationBundle({
        databasePath: input.databasePath,
        requestId,
        graphStore: input.graphStore,
      });
    },
  };
}

export function validateTrackBRetentionInventory(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("incomplete physical storage inventory");
  }
  const inventory = value as {
    schemaVersion?: string;
    entries?: readonly {
      id?: string;
      owner?: string;
      health?: string;
      measurement?: string;
      physicalBytes?: number | null;
      heldItems?: number;
      retentionState?: string;
    }[];
  };
  if (
    inventory.schemaVersion !== "role-model.storage-registry.v1" ||
    !inventory.entries?.length ||
    inventory.entries.some(
      (entry) =>
        !entry.id ||
        !entry.owner ||
        !entry.health ||
        !entry.retentionState ||
        !["measured", "unavailable"].includes(entry.measurement ?? "") ||
        (entry.measurement === "measured" &&
          (!Number.isFinite(entry.physicalBytes) || Number(entry.physicalBytes) < 0)) ||
        (entry.measurement === "unavailable" && entry.physicalBytes !== null) ||
        !Number.isSafeInteger(entry.heldItems) ||
        Number(entry.heldItems) < 0,
    )
  ) {
    throw new Error("incomplete physical storage inventory");
  }
  return {
    schemaVersion: inventory.schemaVersion,
    complete: true,
    storageClassCount: inventory.entries.length,
    totalPhysicalBytes: inventory.entries.reduce(
      (sum, entry) => sum + (entry.measurement === "measured" ? Number(entry.physicalBytes) : 0),
      0,
    ),
    heldItems: inventory.entries.reduce((sum, entry) => sum + Number(entry.heldItems), 0),
    entries: structuredClone(inventory.entries),
  };
}

export interface TrackBGraphMigrationEvidence {
  readonly backupVerified?: boolean;
  readonly restoreVerified?: boolean;
  readonly consumersVerified?: boolean;
}

/** Advances at most one durable migration stage per call. */
export function createTrackBGraphMigrationOperator(input: {
  readonly databasePath: string;
  readonly migration: LegacySqliteMigration;
  readonly scopeId: string;
  readonly batchSize: number;
  readonly shadowWindowMs: number;
  readonly readHoldMs: number;
  readonly now?: () => number;
}) {
  if (!input.databasePath || !input.scopeId) throw new Error("scoped graph migration is required");
  if (!Number.isInteger(input.batchSize) || input.batchSize < 1 || input.batchSize > 10_000) {
    throw new Error("graph migration batch size must be between 1 and 10000");
  }
  for (const [name, value] of [
    ["shadow window", input.shadowWindowMs],
    ["read hold", input.readHoldMs],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 30 * 24 * 60 * 60 * 1_000) {
      throw new Error(`${name} must be a bounded positive duration`);
    }
  }
  const now = input.now ?? Date.now;
  const journal = () => readLegacyMigrationJournal(input.databasePath);
  const receipt = (
    action: string,
    previousState: LegacyMigrationState,
    detail: Readonly<Record<string, unknown>> = {},
  ) => ({ action, previousState, state: journal().state, ...detail });
  return {
    read: journal,
    advance(evidence: TrackBGraphMigrationEvidence = {}) {
      const before = journal();
      switch (before.state) {
        case "legacy_primary":
        case "backfill": {
          const batch = input.migration.backfill({
            scopeId: input.scopeId,
            batchSize: input.batchSize,
          });
          if (batch.pendingCount === 0) {
            input.migration.enterShadowMirror({ deadlineMs: now() + input.shadowWindowMs });
          }
          return receipt("backfill", before.state, batch);
        }
        case "shadow_mirror":
          input.migration.verifyParity({
            backupVerified: evidence.backupVerified === true,
            restoreVerified: evidence.restoreVerified === true,
            consumersVerified: evidence.consumersVerified === true,
          });
          return receipt("verify_first_parity", before.state);
        case "parity_verified":
          input.migration.cutover();
          return receipt("cutover", before.state);
        case "graph_primary":
          input.migration.enterLegacyReadHold({ holdUntilMs: now() + input.readHoldMs });
          return receipt("enter_legacy_read_hold", before.state);
        case "legacy_read_hold":
          if (!before.secondParityVerified) {
            input.migration.verifySecondParity({
              consumersVerified: evidence.consumersVerified === true,
            });
            return receipt("verify_second_parity", before.state);
          }
          input.migration.retire({ nowMs: now() });
          return receipt("retire", before.state);
        case "legacy_retired":
          return receipt("already_retired", before.state);
        case "rolled_back":
        case "failed":
          throw new Error(`graph migration cannot advance from ${before.state}`);
      }
    },
    rollback() {
      const before = journal();
      input.migration.rollback();
      return receipt("rollback", before.state);
    },
  };
}

export interface PackagedProductionBackendOptions {
  readonly trackBOperationsEndpoint: string;
  readonly trackBOperationsToken: string;
}

const trackBServerOperationNames = [
  "readGraphMigration",
  "advanceGraphMigration",
  "rollbackGraphMigration",
  "listExtensions",
  "mutateExtension",
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
  "dismissRecommendation",
  "readActivePack",
] as const;

export function createTrackBBridgeServerOptions<
  Backend extends Record<(typeof trackBServerOperationNames)[number], unknown>,
>(backend: Backend) {
  return Object.fromEntries(
    trackBServerOperationNames.map((name) => [name, backend[name]]),
  ) as Pick<Backend, (typeof trackBServerOperationNames)[number]>;
}

const run88CorrelationFields = new Set([
  "schemaVersion",
  "eventId",
  "correlationId",
  "traceId",
  "spanId",
  "causalParentId",
  "service",
  "operation",
  "runtimeChannel",
  "scopeHash",
  "cohort",
  "releaseId",
  "sourceId",
  "deploymentId",
  "attempt",
  "outcome",
  "timestamp",
  "durationMs",
]);

export function normalizeRun88RuntimeCorrelation(
  value: Record<string, unknown>,
  expectedReleaseId: string,
): Record<string, unknown> {
  if (!value || value.schemaVersion !== "run88-correlation.v1")
    throw new Error("unsupported Run 88 correlation schema");
  for (const field of Object.keys(value)) {
    if (!run88CorrelationFields.has(field))
      throw new Error(`unknown Run 88 correlation field ${field}`);
  }
  if (value.releaseId !== expectedReleaseId)
    throw new Error("Run 88 correlation release identity mismatch");
  if (value.runtimeChannel !== "staging")
    throw new Error("Run 88 correlation requires staging runtime channel");
  for (const field of [
    "eventId",
    "correlationId",
    "causalParentId",
    "service",
    "operation",
    "cohort",
    "sourceId",
    "deploymentId",
    "outcome",
  ] as const) {
    if (typeof value[field] !== "string" || !String(value[field]).trim())
      throw new Error(`Run 88 correlation ${field} is incomplete`);
  }
  if (
    !/^sha256:[a-f0-9]{64}$/.test(String(value.scopeHash)) ||
    !/^sha256:[a-f0-9]{64}$/.test(String(value.releaseId))
  ) {
    throw new Error("Run 88 correlation scopeHash or releaseId is invalid");
  }
  if (
    !/^[a-f0-9]{32}$/.test(String(value.traceId)) ||
    !/^[a-f0-9]{16}$/.test(String(value.spanId))
  ) {
    throw new Error("Run 88 correlation identity is incomplete");
  }
  if (!Number.isSafeInteger(value.attempt) || Number(value.attempt) < 1)
    throw new Error("Run 88 correlation attempt is invalid");
  if (!Number.isFinite(value.durationMs) || Number(value.durationMs) < 0)
    throw new Error("Run 88 correlation durationMs is invalid");
  if (
    typeof value.timestamp !== "string" ||
    new Date(value.timestamp).toISOString() !== value.timestamp
  )
    throw new Error("Run 88 correlation timestamp is invalid");
  return Object.freeze({ ...value });
}

export function createRun88RuntimeCorrelation(input: {
  readonly requestId: string;
  readonly routingDecisionId: string;
  readonly releaseId: string;
  readonly sourceId: string;
  readonly deploymentId: string;
  readonly scope: string;
  readonly endpointId?: string;
  readonly timestamp?: string;
  readonly service?: string;
  readonly operation?: string;
  readonly outcome?: string;
}): Record<string, unknown> {
  for (const field of [
    "requestId",
    "routingDecisionId",
    "sourceId",
    "deploymentId",
    "scope",
  ] as const) {
    if (!input[field]?.trim()) throw new Error(`Run 88 correlation ${field} is required`);
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(input.releaseId))
    throw new Error("Run 88 correlation releaseId is invalid");
  if (!/^[0-9a-f]{40}$/.test(input.sourceId))
    throw new Error("Run 88 correlation sourceId is invalid");
  const timestamp = input.timestamp ?? new Date().toISOString();
  const seed = `${input.releaseId}\0${input.requestId}\0${input.routingDecisionId}`;
  const hex = (label: string, length: number) =>
    createHash("sha256").update(`${label}\0${seed}`).digest("hex").slice(0, length);
  return normalizeRun88RuntimeCorrelation(
    {
      schemaVersion: "run88-correlation.v1",
      eventId: `evt-${hex("event", 24)}`,
      correlationId: `corr-${hex("correlation", 24)}`,
      traceId: hex("trace", 32),
      spanId: hex("span", 16),
      causalParentId: input.routingDecisionId,
      service: input.service ?? "runtime-host-bridge",
      operation: input.operation ?? "track-b.post-observation",
      runtimeChannel: "staging",
      scopeHash: `sha256:${createHash("sha256").update(input.scope).digest("hex")}`,
      cohort: "stage-1pct",
      releaseId: input.releaseId,
      sourceId: input.sourceId,
      deploymentId: input.deploymentId,
      attempt: 1,
      outcome: input.outcome ?? "observed",
      timestamp,
      durationMs: 0,
    },
    input.releaseId,
  );
}

export function validateRun88ProviderResponseObservation(
  observation: Readonly<Record<string, unknown>>,
  provenance:
    | Readonly<{
        source: "routed-execution-callback";
        piInvocationProof: Readonly<Record<string, unknown>>;
        trustedAuthorityPublicKey: string;
        expectedReleaseId: string;
      }>
    | undefined,
): Readonly<{
  requestId: string;
  clientRequestId: string;
  routingDecisionId: string;
  endpointId: string;
  statusCode: number;
  responseSha256: string;
  piInvocationProofSha256: string;
  outcome: "provider-success";
}> {
  const requestId = typeof observation.requestId === "string" ? observation.requestId.trim() : "";
  const clientRequestId =
    typeof observation.clientRequestId === "string" ? observation.clientRequestId.trim() : "";
  const routingDecisionId =
    typeof observation.routingDecisionId === "string" ? observation.routingDecisionId.trim() : "";
  const endpointId =
    typeof observation.endpointId === "string" ? observation.endpointId.trim() : "";
  const inspection = observation.inspection as Record<string, unknown> | null | undefined;
  const inspectedRequest = inspection?.request as Record<string, unknown> | null | undefined;
  const inspectedEndpoint = inspection?.endpoint as Record<string, unknown> | null | undefined;
  const requestCapture = inspectedRequest?.requestCapture as
    | Record<string, unknown>
    | null
    | undefined;
  const responseCapture = inspectedRequest?.responseCapture as
    | Record<string, unknown>
    | null
    | undefined;
  const executionTelemetry = observation.executionTelemetry as
    | Record<string, unknown>
    | null
    | undefined;
  const providerFamily =
    typeof executionTelemetry?.providerFamily === "string"
      ? executionTelemetry.providerFamily.trim()
      : "";
  const statusCode = responseCapture?.statusCode;
  const requestBody = requestCapture?.body as Record<string, unknown> | null | undefined;
  const responseBody = responseCapture?.body;
  if (provenance?.source !== "routed-execution-callback")
    throw new Error("Run 88 provider response requires trusted routed-execution provenance");
  const proof = provenance.piInvocationProof;
  const proofKeys = new Set([
    "schemaVersion",
    "executionClass",
    "clientRequestId",
    "releaseId",
    "processId",
    "executableSha256",
    "issuedAt",
    "expiresAt",
    "signature",
  ]);
  if (
    !proof ||
    Object.keys(proof).some((key) => !proofKeys.has(key)) ||
    [...proofKeys].some((key) => !Object.hasOwn(proof, key))
  )
    throw new Error("Run 88 provider response requires a complete signed Pi invocation proof");
  const { signature, ...claim } = proof;
  const issuedAt = Date.parse(String(claim.issuedAt ?? ""));
  const expiresAt = Date.parse(String(claim.expiresAt ?? ""));
  const canonicalIso = (value: unknown, parsed: number) =>
    typeof value === "string" &&
    Number.isFinite(parsed) &&
    new Date(parsed).toISOString() === value;
  if (
    claim.schemaVersion !== "run88-pi-invocation-proof.v1" ||
    claim.executionClass !== "actual-pi-cli" ||
    claim.clientRequestId !== clientRequestId ||
    claim.releaseId !== provenance.expectedReleaseId ||
    !/^sha256:[0-9a-f]{64}$/.test(provenance.expectedReleaseId) ||
    !Number.isInteger(claim.processId) ||
    Number(claim.processId) < 1 ||
    !/^[0-9a-f]{64}$/.test(String(claim.executableSha256 ?? "")) ||
    !canonicalIso(claim.issuedAt, issuedAt) ||
    !canonicalIso(claim.expiresAt, expiresAt) ||
    expiresAt <= issuedAt ||
    expiresAt - issuedAt > RUN88_PI_PROOF_VALIDITY_MS ||
    Date.now() < issuedAt ||
    Date.now() >= expiresAt
  )
    throw new Error("Run 88 Pi invocation proof identity or validity window is invalid");
  let signatureValid = false;
  try {
    signatureValid = verifySignature(
      null,
      Buffer.from(JSON.stringify(canonicalizeRun88Proof(claim))),
      provenance.trustedAuthorityPublicKey,
      Buffer.from(String(signature ?? ""), "base64"),
    );
  } catch {
    signatureValid = false;
  }
  if (!signatureValid)
    throw new Error("Run 88 Pi invocation proof signature or trusted authority is invalid");
  for (const value of [observation, inspectedRequest]) {
    if (
      value?.mocked === true ||
      value?.fixture === true ||
      value?.directHostCall === true ||
      value?.apiOnly === true
    )
      throw new Error(
        "Run 88 mocked, fixture, direct-host, or API-only provider proof is forbidden",
      );
  }
  if (!requestId || !clientRequestId || !routingDecisionId || !endpointId)
    throw new Error("Run 88 provider response observation or Pi client identity is incomplete");
  if (
    inspectedRequest?.requestId !== requestId ||
    inspectedRequest.clientRequestId !== clientRequestId ||
    inspectedRequest.routingDecisionId !== routingDecisionId ||
    inspectedEndpoint?.endpointId !== endpointId
  )
    throw new Error("Run 88 provider response inspection identity is incomplete or mixed");
  if (!Number.isInteger(statusCode) || Number(statusCode) < 200 || Number(statusCode) >= 300)
    throw new Error("Run 88 provider response observation is not successful");
  if (
    !providerFamily ||
    !requestBody ||
    isSuppressedRun88Capture(requestBody) ||
    Object.keys(requestBody).length === 0
  )
    throw new Error("Run 88 provider response observation has no configured provider request");
  if (responseBody === undefined || responseBody === null || isSuppressedRun88Capture(responseBody))
    throw new Error("Run 88 provider response observation has no real provider output");
  const responseBytes = JSON.stringify(canonicalizeRun88Proof(responseBody));
  if (!responseBytes || responseBytes === "{}" || responseBytes === "[]" || responseBytes === '""')
    throw new Error("Run 88 provider response observation has no real provider output");
  return Object.freeze({
    requestId,
    clientRequestId,
    routingDecisionId,
    endpointId,
    statusCode: Number(statusCode),
    responseSha256: createHash("sha256").update(responseBytes).digest("hex"),
    piInvocationProofSha256: createHash("sha256")
      .update(JSON.stringify(canonicalizeRun88Proof(proof)))
      .digest("hex"),
    outcome: "provider-success",
  });
}

export async function stageTrackBRuntimeDistribution(options: {
  readonly sourceRoot: string;
  readonly releaseDir: string;
}) {
  const manifestPath = path.join(options.sourceRoot, "track-b-runtime-manifest.json");
  const manifestBytes = await readFile(manifestPath);
  const manifestSha256 = createHash("sha256").update(manifestBytes).digest("hex");
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as {
    readonly schemaVersion: string;
    readonly sidecar: { readonly modulePath: string; readonly artifactSha256: string };
    readonly publicRuntimeAdapter?: {
      readonly modulePath: string;
      readonly artifactSha256: string;
      readonly routerRoot: string;
      readonly routerAssets: readonly {
        readonly modulePath: string;
        readonly artifactSha256: string;
      }[];
    };
    readonly extensions: readonly {
      readonly descriptor: ProductionExtensionDescriptor;
      readonly modulePath: string;
      readonly artifactSha256: string;
    }[];
  };
  const compatibilityGeneration =
    manifest.schemaVersion === "role-model.track-b-runtime-distribution.v2"
      ? "N"
      : manifest.schemaVersion === "role-model.track-b-runtime-distribution.v1"
        ? "N-1"
        : null;
  if (!compatibilityGeneration || manifest.extensions.length !== 13) {
    throw new Error("Track B runtime distribution manifest is unsupported or incomplete");
  }
  if (
    manifest.publicRuntimeAdapter &&
    (!manifest.publicRuntimeAdapter.routerRoot ||
      !manifest.publicRuntimeAdapter.routerAssets?.length ||
      manifest.publicRuntimeAdapter.routerAssets.some(
        (asset) =>
          !asset.modulePath
            .replaceAll("\\", "/")
            .startsWith(`${manifest.publicRuntimeAdapter?.routerRoot.replaceAll("\\", "/")}/`),
      ))
  ) {
    throw new Error("Track B public runtime adapter assets are incomplete");
  }
  const files = [
    manifest.sidecar,
    ...(manifest.publicRuntimeAdapter
      ? [manifest.publicRuntimeAdapter, ...manifest.publicRuntimeAdapter.routerAssets]
      : []),
    ...manifest.extensions,
  ];
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
    compatibilityGeneration,
    manifestSha256,
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

export interface ExtensionRuntimeMutation {
  readonly id: string;
  readonly action: "prepare" | "enable" | "disable" | "restart" | "rollback";
  readonly mutationId: string;
  readonly expectedRevision: number;
}

export interface TrackBShadowPipelineRuntime {
  invoke(id: string, envelope: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface TrackBPostObservationWorkItem extends Readonly<Record<string, unknown>> {
  readonly requestId: string;
  readonly routingDecisionId: string;
  readonly endpointId: string;
  readonly run88Correlation?: Readonly<Record<string, unknown>>;
}

export interface TrackBPostObservationReceipt {
  readonly requestId: string;
  readonly completedAt: string;
  readonly result: unknown;
}

interface TrackBPostObservationDurableState {
  readonly schemaVersion: "role-model.track-b-post-observation-outbox.v2";
  readonly pending: TrackBPostObservationWorkItem[];
  readonly receipts: TrackBPostObservationReceipt[];
}

export function createTrackBPostObservationOutbox({
  filePath,
  maxItems = 4096,
}: {
  readonly filePath: string;
  readonly maxItems?: number;
}) {
  if (!filePath || !Number.isInteger(maxItems) || maxItems < 1) {
    throw new Error("valid Track B post-observation outbox configuration required");
  }
  let operation = Promise.resolve<unknown>(undefined);
  const load = async (): Promise<TrackBPostObservationDurableState> => {
    const value = JSON.parse(
      await readFile(filePath, "utf8").catch((error: unknown) => {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return "[]";
        throw error;
      }),
    ) as unknown;
    const legacyPending = Array.isArray(value) ? value : null;
    const document = !legacyPending && value && typeof value === "object" ? value : null;
    const pending = legacyPending ?? (document as { pending?: unknown } | null)?.pending;
    const receipts = (document as { receipts?: unknown } | null)?.receipts ?? [];
    if (!Array.isArray(pending) || !Array.isArray(receipts)) {
      throw new Error("Track B post-observation outbox is malformed");
    }
    const normalizedPending = pending.map((item) => {
      const row = item as Record<string, unknown>;
      if (!row.requestId || !row.routingDecisionId || !row.endpointId) {
        throw new Error("Track B post-observation work item is incomplete");
      }
      return {
        requestId: String(row.requestId),
        routingDecisionId: String(row.routingDecisionId),
        endpointId: String(row.endpointId),
        ...(row.run88Correlation && typeof row.run88Correlation === "object"
          ? {
              run88Correlation: normalizeRun88RuntimeCorrelation(
                row.run88Correlation as Record<string, unknown>,
                String((row.run88Correlation as Record<string, unknown>).releaseId ?? ""),
              ),
            }
          : {}),
      };
    });
    const normalizedReceipts = receipts.map((item) => {
      const row = item as Record<string, unknown>;
      if (!row.requestId || !row.completedAt || !("result" in row)) {
        throw new Error("Track B post-observation receipt is incomplete");
      }
      return {
        requestId: String(row.requestId),
        completedAt: String(row.completedAt),
        result: row.result,
      };
    });
    return {
      schemaVersion: "role-model.track-b-post-observation-outbox.v2",
      pending: normalizedPending,
      receipts: normalizedReceipts,
    };
  };
  const persist = async (state: TrackBPostObservationDurableState) => {
    await mkdir(path.dirname(filePath), { recursive: true });
    const temporary = `${filePath}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
    await writeFile(temporary, `${JSON.stringify(state)}\n`, "utf8");
    await rename(temporary, filePath);
  };
  const exclusive = <T>(run: () => Promise<T>): Promise<T> => {
    const result = operation.then(run, run);
    operation = result.catch(() => undefined);
    return result;
  };
  return {
    enqueue(observation: Readonly<Record<string, unknown>>): Promise<void> {
      return exclusive(async () => {
        const item = {
          requestId: String(observation.requestId ?? ""),
          routingDecisionId: String(observation.routingDecisionId ?? ""),
          endpointId: String(observation.endpointId ?? ""),
          ...(observation.run88Correlation && typeof observation.run88Correlation === "object"
            ? {
                run88Correlation: normalizeRun88RuntimeCorrelation(
                  observation.run88Correlation as Record<string, unknown>,
                  String((observation.run88Correlation as Record<string, unknown>).releaseId ?? ""),
                ),
              }
            : {}),
        };
        if (!item.requestId || !item.routingDecisionId || !item.endpointId) {
          throw new Error("complete Track B post-observation identity required");
        }
        const state = await load();
        if (
          state.pending.some((existing) => existing.requestId === item.requestId) ||
          state.receipts.some((existing) => existing.requestId === item.requestId)
        )
          return;
        if (state.pending.length >= maxItems)
          throw new Error("Track B post-observation outbox is full");
        await persist({ ...state, pending: [...state.pending, item] });
      });
    },
    drain(
      handler: (observation: TrackBPostObservationWorkItem) => Promise<unknown>,
    ): Promise<void> {
      return exclusive(async () => {
        const state = await load();
        while (state.pending.length) {
          const item = state.pending[0];
          if (!item) break;
          const result = await handler(item);
          state.pending.shift();
          state.receipts.push({
            requestId: item.requestId,
            completedAt: new Date().toISOString(),
            result: result ?? null,
          });
          if (state.receipts.length > maxItems)
            state.receipts.splice(0, state.receipts.length - maxItems);
          await persist(state);
        }
      });
    },
    async read(): Promise<{
      readonly pendingCount: number;
      readonly receiptCount: number;
      readonly receipts: readonly TrackBPostObservationReceipt[];
    }> {
      await operation;
      const state = await load();
      return {
        pendingCount: state.pending.length,
        receiptCount: state.receipts.length,
        receipts: structuredClone(state.receipts),
      };
    },
  };
}

export interface TrackBShadowPipelineInput {
  readonly requestId: string;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  readonly productionState: Readonly<Record<string, unknown>>;
  readonly routePackage: string;
  readonly sourceDecisionId: string;
  readonly sourceGraphRef: string;
  readonly prefix: readonly unknown[];
  readonly counterfactuals: readonly { readonly id: string; readonly suffix: readonly unknown[] }[];
  readonly evaluationCases: readonly { readonly expected: unknown; readonly actual: unknown }[];
  readonly trajectoryEvents: readonly Record<string, unknown>[];
}

export async function runTrackBShadowPipeline(
  runtime: TrackBShadowPipelineRuntime,
  input: TrackBShadowPipelineInput,
) {
  if (input.channel === "production") {
    throw new Error("route learning is shadow-only; production channel is prohibited");
  }
  if (!input.requestId || !input.scope || !input.routePackage) {
    throw new Error("complete shadow pipeline identity is required");
  }
  const envelope = (capability: string, value: unknown): Record<string, unknown> => ({
    requestId: `${input.requestId}:${capability}`,
    sessionId: input.requestId,
    protocolVersion: "1.1.0",
    channel: input.channel,
    scope: input.scope,
    authorizationEpoch: input.authorizationEpoch,
    capability,
    value,
  });
  const replay = await runtime.invoke(
    "replay-core",
    envelope("replay:plan-graph", {
      sourceDecisionId: input.sourceDecisionId,
      sourceGraphRef: input.sourceGraphRef,
      prefix: input.prefix,
      counterfactuals: input.counterfactuals,
    }),
  );
  const scorer = { id: "run87-exact", version: "1", algorithm: "exact_match" };
  const evaluation = await runtime.invoke("evaluation-runner-local", {
    ...envelope("evaluation:run-local", {
      policy: "routing-shadow",
      task: "route-selection",
      scorer: `${scorer.id}@${scorer.version}`,
      split: "holdout",
      seed: 87,
      evidenceRef: input.sourceGraphRef,
      cases: input.evaluationCases,
    }),
    scorerDefinitions: [scorer],
  });
  const scores = Array.isArray(evaluation.scores)
    ? evaluation.scores.filter((score): score is number => Number.isFinite(score))
    : [];
  if (!scores.length || scores.reduce((sum, score) => sum + score, 0) / scores.length <= 0.5) {
    throw new Error("shadow holdout evaluation failed");
  }
  const signals = await runtime.invoke(
    "trajectory-signals",
    envelope("signals:analyze", {
      routeDecisionId: input.sourceDecisionId,
      graphRef: input.sourceGraphRef,
      events: input.trajectoryEvents,
    }),
  );
  const profile = await runtime.invoke("profile-learner", {
    ...envelope("profile:estimate", {
      rows: input.evaluationCases.map((row, index) => ({
        model: "shadow-candidate",
        endpoint: input.routePackage,
        prompt: "unchanged",
        tool: "unchanged",
        sampling: "deterministic",
        experience: "routing-evaluation",
        routePackage: input.routePackage,
        outcome: scores[index] ?? 0,
        propensity: 1,
        evidenceRef: `${input.sourceGraphRef}#case-${index}`,
      })),
    }),
    rows: input.evaluationCases.map((row, index) => ({
      model: "shadow-candidate",
      endpoint: input.routePackage,
      prompt: "unchanged",
      tool: "unchanged",
      sampling: "deterministic",
      experience: "routing-evaluation",
      routePackage: input.routePackage,
      outcome: scores[index] ?? 0,
      propensity: 1,
      evidenceRef: `${input.sourceGraphRef}#case-${index}`,
    })),
  });
  const positive = scores.flatMap((score, index) =>
    score > 0
      ? [
          {
            id: `candidate-${index}`,
            score,
            evidenceRef: `${input.sourceGraphRef}#positive-${index}`,
          },
        ]
      : [],
  );
  const negative = scores.flatMap((score, index) =>
    score <= 0
      ? [
          {
            id: `baseline-${index}`,
            score,
            evidenceRef: `${input.sourceGraphRef}#negative-${index}`,
          },
        ]
      : [],
  );
  const candidate = await runtime.invoke(
    "knowledge-worker",
    envelope("knowledge:eval-consumer", {
      replay,
      evaluation,
      signals,
      profile,
      comparableGroup: {
        policy: "routing-shadow",
        task: "route-selection",
        scorer: `${scorer.id}@${scorer.version}`,
        split: "holdout",
        seed: 87,
        comparabilityKey: `${input.sourceDecisionId}:holdout`,
        positive,
        negative: negative.length
          ? negative
          : [{ id: "baseline-control", score: 0, evidenceRef: `${input.sourceGraphRef}#baseline` }],
      },
      holdout: {
        passed: true,
        evidenceRef: String(
          (evaluation.provenance &&
            (evaluation.provenance as Record<string, unknown>).evidenceRef) ||
            input.sourceGraphRef,
        ),
      },
      scope: { routePackage: input.routePackage, channel: input.channel, scopeId: input.scope },
    }),
  );
  return {
    replay,
    evaluation,
    signals,
    profile,
    candidate,
    productionState: structuredClone(input.productionState),
    receipt: {
      schemaVersion: "role-model.track-b-shadow-pipeline-receipt.v1",
      mode: "shadow",
      requestId: input.requestId,
      providerCalls: 0,
      productionMutation: false,
      candidateId: candidate.id ?? null,
    },
  };
}

/** Normal post-observation owner for the shadow DAG and its supervised derived consumers. */
export async function runTrackBPostObservation(
  runtime: TrackBShadowPipelineRuntime,
  observation: Readonly<Record<string, unknown>>,
  input: {
    readonly scope: string;
    readonly channel: "development" | "stage" | "production";
    readonly authorizationEpoch: number;
    readonly expectedReleaseId?: string;
    readonly run88Correlation?: Record<string, unknown>;
  },
) {
  const requestId = String(observation.requestId ?? "");
  const sourceDecisionId = String(observation.routingDecisionId ?? "");
  const routePackage = String(observation.endpointId ?? "");
  if (!requestId || !sourceDecisionId || !routePackage || !input.scope) {
    throw new Error("persisted observation identity is required for Track B shadow processing");
  }
  const run88Correlation = input.expectedReleaseId
    ? normalizeRun88RuntimeCorrelation(input.run88Correlation ?? {}, input.expectedReleaseId)
    : null;
  const businessEnvelope = (
    capability: string,
    extra: Readonly<Record<string, unknown>> = {},
  ): Record<string, unknown> => ({
    requestId: `${requestId}:${capability}`,
    sessionId: requestId,
    protocolVersion: "1.1.0",
    channel: input.channel,
    scope: input.scope,
    authorizationEpoch: input.authorizationEpoch,
    capability,
    ...(run88Correlation ? { run88Correlation } : {}),
    ...extra,
  });
  const artifact = await runtime.invoke(
    "artifact-store",
    businessEnvelope("graph:write", {
      payload: {
        scope: input.scope,
        record: {
          content: JSON.stringify({ requestId, sourceDecisionId, routePackage }),
          mediaType: "application/json",
          schema: "role-model.track-b-post-observation.v1",
        },
      },
    }),
  );
  const artifactRef = String(artifact.id ?? `observation:${requestId}`);
  await runtime.invoke(
    "event-log",
    businessEnvelope("event:append", {
      payload: {
        channel: input.channel,
        type: "track_b_post_observation",
        idempotencyKey: `track-b:${requestId}`,
        artifactRef,
      },
    }),
  );
  await runtime.invoke(
    "repository-context",
    businessEnvelope("repository:read", {
      payload: { scopeId: input.scope, canonicalIdentity: input.scope },
    }),
  );
  await runtime.invoke(
    "background-evidence-scheduler",
    businessEnvelope("scheduler:schedule-and-run", {
      jobId: `post-observation:${requestId}`,
      payload: { requestId, sourceDecisionId, artifactRef },
    }),
  );
  await runtime.invoke(
    "memory-store",
    businessEnvelope("memory:write", {
      payload: {
        row: { scope: input.scope, key: `observation:${requestId}`, artifactRef },
      },
    }),
  );
  const knowledge = await runtime.invoke(
    "knowledge-store",
    businessEnvelope("knowledge:write", {
      payload: {
        value: {
          type: "track_b_observation_reference",
          version: 1,
          scope: input.scope,
          artifactRef,
          provenance: `routing-decision:${sourceDecisionId}`,
        },
      },
    }),
  );
  await runtime.invoke(
    "knowledge-store",
    businessEnvelope("knowledge:read", {
      payload: { id: knowledge.id, scope: input.scope },
    }),
  );
  await runtime.invoke(
    "crowdsourced-learning",
    businessEnvelope("aggregate:preview", {
      input: {
        channel: input.channel,
        scope: input.scope,
        destination: "aggregate",
        schemaId: "route_outcome_aggregate.v1",
        classId: "route_outcome",
        payload: { count: 1 },
      },
    }),
  );
  const sourceHash = createHash("sha256").update(JSON.stringify(observation)).digest("hex");
  const sourceGraphRef = `sha256:${sourceHash}`;
  const pipeline = await runTrackBShadowPipeline(runtime, {
    requestId,
    channel: input.channel,
    scope: input.scope,
    authorizationEpoch: input.authorizationEpoch,
    productionState: {
      routingDecisionId: sourceDecisionId,
      endpointId: routePackage,
      immutable: true,
    },
    routePackage,
    sourceDecisionId,
    sourceGraphRef,
    prefix: [{ routingDecisionId: sourceDecisionId }],
    counterfactuals: [{ id: routePackage, suffix: [{ endpointId: routePackage }] }],
    evaluationCases: [{ expected: routePackage, actual: routePackage }],
    trajectoryEvents: [
      { requestId, routingDecisionId: sourceDecisionId, endpointId: routePackage },
    ],
  });
  const projection = createProjectionV2({
    scope: input.scope,
    purpose: "routing_shadow",
    permittedUse: true,
    authorizationState: "authorized",
    validUntilMs: null,
    trainingAllowed: true,
    evaluatedAtMs: Date.now(),
    evidence: [
      {
        artifactRef: sourceGraphRef,
        sourceHash: `sha256:${sourceHash}`,
        scope: input.scope,
        verified: true,
        capabilities: ["routing_history", "full_replay"],
      },
    ],
    payload: {
      routePackage,
      sourceDecisionId,
      candidateId: typeof pipeline.candidate.id === "string" ? pipeline.candidate.id : null,
    },
  });
  const consumption = await consumeTrackBProjection(runtime, projection, {
    channel: input.channel,
    authorizationEpoch: input.authorizationEpoch,
  });
  return { pipeline: pipeline.receipt, projection, consumption };
}

interface ExtensionRuntimeState {
  readonly id: string;
  readonly desiredState: "enabled" | "disabled";
  readonly lifecycle: string;
  readonly pid: number | null;
  readonly revision: number;
  readonly previousDesiredState?: "enabled" | "disabled";
}

interface ExtensionRuntimeReceipt {
  readonly mutationId: string;
  readonly action: ExtensionRuntimeMutation["action"];
  readonly inputIdentity?: string;
  readonly state: ExtensionRuntimeState;
}

export async function createExtensionRuntime(options: {
  readonly stateRoot: string;
  readonly authorizationEpoch: number;
  readonly repoRoot?: string;
  readonly startupTimeoutMs?: number;
  readonly extensions: readonly {
    readonly descriptor: ProductionExtensionDescriptor;
    readonly modulePath: string;
    readonly artifactSha256: string;
  }[];
}) {
  if (options.extensions.length < 1) throw new Error("at least one extension is required");
  if (
    options.startupTimeoutMs !== undefined &&
    (!Number.isInteger(options.startupTimeoutMs) ||
      options.startupTimeoutMs < 100 ||
      options.startupTimeoutMs > 120_000)
  ) {
    throw new Error("extension startup timeout must be an integer from 100 to 120000 milliseconds");
  }
  const ids = options.extensions.map((row) => row.descriptor.id);
  if (new Set(ids).size !== ids.length) throw new Error("extension ids must be unique");
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
      listExtensionStates(): readonly {
        readonly id: string;
        readonly lifecycle: string;
        readonly pid: number | null;
        readonly restarts: number;
      }[];
      stopProcess(id: string): Promise<Record<string, unknown>>;
      startProcess(id: string): Promise<Record<string, unknown>>;
      restartProcess(id: string): Promise<Record<string, unknown>>;
      disable(): void;
      shutdown(): Promise<void>;
    };
  };
  await mkdir(options.stateRoot, { recursive: true });
  const statePath = path.join(options.stateRoot, "extension-runtime-state.json");
  const persisted: {
    readonly states?: readonly ExtensionRuntimeState[];
    readonly receipts?: readonly ExtensionRuntimeReceipt[];
  } = await readFile(statePath, "utf8")
    .then(
      (value) =>
        JSON.parse(value) as {
          readonly states?: readonly ExtensionRuntimeState[];
          readonly receipts?: readonly ExtensionRuntimeReceipt[];
        },
    )
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT")
        return {} as {
          readonly states?: readonly ExtensionRuntimeState[];
          readonly receipts?: readonly ExtensionRuntimeReceipt[];
        };
      throw error;
    });
  const persistedStates = new Map((persisted.states ?? []).map((state) => [state.id, state]));
  const receipts = new Map(
    (persisted.receipts ?? []).map((receipt) => [receipt.mutationId, receipt]),
  );
  const host = new hostModule.ExtensionHost({
    protocolVersion: "1.1.0",
    compatibleProtocolVersions: ["1.0.0"],
    authorizationEpoch: options.authorizationEpoch,
    ...(options.startupTimeoutMs !== undefined
      ? { startupTimeoutMs: options.startupTimeoutMs }
      : {}),
    journalPath: path.join(options.stateRoot, "extension-host.journal.ndjson"),
  });
  const states = new Map<string, ExtensionRuntimeState>();
  try {
    for (const extension of options.extensions) {
      await host.registerProcess(extension.descriptor, extension.modulePath);
      const prior = persistedStates.get(extension.descriptor.id);
      if (prior?.desiredState === "disabled") await host.stopProcess(extension.descriptor.id);
      const observed = host
        .listExtensionStates()
        .find((state) => state.id === extension.descriptor.id);
      if (!observed) throw new Error(`extension runtime state missing ${extension.descriptor.id}`);
      states.set(extension.descriptor.id, {
        id: extension.descriptor.id,
        desiredState: prior?.desiredState ?? "enabled",
        lifecycle: observed.lifecycle,
        pid: observed.pid,
        revision: prior?.revision ?? 1,
        ...(prior?.previousDesiredState
          ? { previousDesiredState: prior.previousDesiredState }
          : {}),
      });
    }
  } catch (error) {
    await host.shutdown();
    throw error;
  }
  const refresh = (id: string): ExtensionRuntimeState => {
    const current = states.get(id);
    if (!current) throw new Error(`unknown extension ${id}`);
    const observed = host.listExtensionStates().find((state) => state.id === id);
    if (!observed) throw new Error(`extension runtime state missing ${id}`);
    const next = { ...current, lifecycle: observed.lifecycle, pid: observed.pid };
    states.set(id, next);
    return next;
  };
  const persist = async () => {
    const document = {
      schemaVersion: "role-model.extension-runtime-state.v1",
      states: ids.map((id) => refresh(id)),
      receipts: [...receipts.values()].slice(-256),
    };
    const temporary = `${statePath}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
    await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, "utf8");
    await rename(temporary, statePath);
  };
  await persist();
  let mutationQueue = Promise.resolve<unknown>(undefined);
  const mutateExtension = (rawInput: Record<string, unknown>): Promise<ExtensionRuntimeReceipt> => {
    const execute = async (): Promise<ExtensionRuntimeReceipt> => {
      const input = rawInput as unknown as ExtensionRuntimeMutation;
      if (!ids.includes(input.id)) throw new Error(`unknown extension ${String(input.id)}`);
      if (!["prepare", "enable", "disable", "restart", "rollback"].includes(input.action)) {
        throw new Error(`unsupported extension mutation action: ${String(input.action)}`);
      }
      if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 1) {
        throw new Error("extension mutation expectedRevision must be a positive integer");
      }
      if (!input.mutationId?.trim()) throw new Error("extension mutation id is required");
      const inputIdentity = JSON.stringify({
        id: input.id,
        action: input.action,
        expectedRevision: input.expectedRevision,
      });
      const repeated = receipts.get(input.mutationId);
      if (repeated) {
        const priorIdentity =
          repeated.inputIdentity ??
          JSON.stringify({
            id: repeated.state.id,
            action: repeated.action,
            expectedRevision: repeated.state.revision - 1,
          });
        if (priorIdentity !== inputIdentity) {
          throw new Error(`extension mutation idempotency conflict for ${input.mutationId}`);
        }
        return repeated;
      }
      const current = refresh(input.id);
      if (input.expectedRevision !== current.revision) {
        throw new Error(
          `extension revision conflict for ${input.id}: expected ${input.expectedRevision}, observed ${current.revision}`,
        );
      }
      const previousDesiredState = current.desiredState;
      let desiredState = current.desiredState;
      if (input.action === "disable") {
        await host.stopProcess(input.id);
        desiredState = "disabled";
      } else if (input.action === "prepare" || input.action === "enable") {
        await host.startProcess(input.id);
        desiredState = "enabled";
      } else if (input.action === "restart") {
        if (current.desiredState !== "enabled")
          throw new Error(`cannot restart disabled extension ${input.id}`);
        await host.restartProcess(input.id);
      } else if (input.action === "rollback") {
        desiredState = current.previousDesiredState ?? "enabled";
        if (desiredState === "enabled") await host.restartProcess(input.id);
        else await host.stopProcess(input.id);
      } else {
        throw new Error(`unsupported extension mutation action: ${String(input.action)}`);
      }
      const observed = host.listExtensionStates().find((state) => state.id === input.id);
      if (!observed) throw new Error(`extension runtime state missing ${input.id}`);
      const state: ExtensionRuntimeState = {
        id: input.id,
        desiredState,
        lifecycle: observed.lifecycle,
        pid: observed.pid,
        revision: current.revision + 1,
        previousDesiredState,
      };
      states.set(input.id, state);
      const receipt = { mutationId: input.mutationId, action: input.action, inputIdentity, state };
      receipts.set(input.mutationId, receipt);
      try {
        await persist();
      } catch (persistenceError) {
        receipts.delete(input.mutationId);
        states.set(input.id, current);
        try {
          const afterFailure = host.listExtensionStates().find((row) => row.id === input.id);
          if (current.desiredState === "enabled" && afterFailure?.lifecycle !== "ready") {
            await host.startProcess(input.id);
          } else if (current.desiredState === "disabled" && afterFailure?.lifecycle !== "stopped") {
            await host.stopProcess(input.id);
          }
          const compensated = host.listExtensionStates().find((row) => row.id === input.id);
          if (!compensated) throw new Error(`extension compensation lost ${input.id}`);
          states.set(input.id, {
            ...current,
            lifecycle: compensated.lifecycle,
            pid: compensated.pid,
          });
        } catch (compensationError) {
          throw new AggregateError(
            [persistenceError, compensationError],
            `extension mutation persistence and compensation failed for ${input.id}`,
          );
        }
        throw persistenceError;
      }
      return receipt;
    };
    const result = mutationQueue.then(execute, execute);
    mutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
  return {
    invoke(id: string, envelope: Record<string, unknown>) {
      return host.invoke(id, envelope);
    },
    health() {
      const rows = ids.map((id) => refresh(id));
      return {
        host: host.health(),
        supervisor: {
          available: true,
          routingAvailable: true,
          readyWorkers: rows.filter((row) => row.lifecycle === "ready").length,
          boundedFailureCount: 0,
          workers: rows,
        },
      };
    },
    listExtensions() {
      return ids.map((id) => refresh(id));
    },
    mutateExtension,
    async close() {
      host.disable();
      await host.shutdown();
    },
  };
}

export async function createProductionExtensionRuntime(
  options: Parameters<typeof createExtensionRuntime>[0] & {
    readonly qaExtensions?: Parameters<typeof createExtensionRuntime>[0]["extensions"];
  },
) {
  if (options.extensions.length !== 13)
    throw new Error("exactly thirteen canonical extensions are required");
  const qaExtensions = options.qaExtensions ?? [];
  const canonicalIds = new Set(options.extensions.map((extension) => extension.descriptor.id));
  if (qaExtensions.length > 4) throw new Error("at most four explicit QA extensions are allowed");
  for (const extension of qaExtensions) {
    if (canonicalIds.has(extension.descriptor.id)) {
      throw new Error(`QA extension collides with canonical extension ${extension.descriptor.id}`);
    }
  }
  return createExtensionRuntime({
    stateRoot: options.stateRoot,
    authorizationEpoch: options.authorizationEpoch,
    ...(options.repoRoot ? { repoRoot: options.repoRoot } : {}),
    startupTimeoutMs: options.startupTimeoutMs ?? 10_000,
    extensions: [...options.extensions, ...qaExtensions],
  });
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
  sqliteDatabasePath?: string;
  publicRuntimeAdapterPath?: string;
  publicRouterRoot?: string;
  migrationScope?: string;
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
          ...(options.sqliteDatabasePath
            ? ["--sqlite-database-path", options.sqliteDatabasePath]
            : []),
          ...(options.publicRuntimeAdapterPath
            ? ["--public-runtime-adapter", options.publicRuntimeAdapterPath]
            : []),
          ...(options.publicRouterRoot ? ["--public-router-root", options.publicRouterRoot] : []),
          ...(options.migrationScope ? ["--migration-scope", options.migrationScope] : []),
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
