import { spawn } from "node:child_process";
import { createHash, randomBytes, verify as verifySignature } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { copyFile, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import type { RuntimeEffortSource } from "@role-model-router/runtime-observability";
import {
  type GraphArtifactReference,
  type LegacyArtifactWriteInput,
  type LegacyArtifactWriteResult,
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

function hasPersistedArtifactState(stateRoot: string): boolean {
  const legacyFile = path.join(stateRoot, "artifact-store.json");
  const roots = [path.join(stateRoot, "artifact-store"), `${legacyFile}.store`];
  return (
    existsSync(legacyFile) ||
    roots.some(
      (root) =>
        existsSync(path.join(root, "metadata.sqlite")) || existsSync(path.join(root, "blobs")),
    )
  );
}

/**
 * Small local graph adapter for fixture and development runs that do not have
 * the private operations sidecar configured. Rich observations live in these
 * content-addressed files; SQLite stores only the bounded graph pointer.
 */
export function createTrackBFileGraphStore(input: {
  readonly scopeId: string;
  readonly rootPath: string;
}): RuntimeObservationGraphStore {
  const scopeId = input.scopeId.trim();
  const rootPath = path.resolve(input.rootPath);
  const artifactRoot = path.join(rootPath, "artifacts");
  if (!scopeId) throw new Error("local graph scope is required");

  const assertScope = (candidate: string): void => {
    if (candidate !== scopeId) throw new Error("local graph scope mismatch");
  };
  const assertPath = (candidate: string): string => {
    const resolved = path.resolve(candidate);
    const relative = path.relative(rootPath, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("local graph artifact path escapes its root");
    }
    return resolved;
  };
  const artifactPathForDigest = (digest: string): string =>
    path.join(artifactRoot, `${digest}.json`);

  return {
    scopeId,
    write(artifact: LegacyArtifactWriteInput): LegacyArtifactWriteResult {
      assertScope(artifact.scopeId);
      const contentHash = createHash("sha256").update(artifact.content).digest("hex");
      const declaredHash = artifact.contentHash.replace(/^sha256:/, "");
      if (declaredHash !== contentHash) {
        throw new Error("local graph content hash mismatch");
      }
      mkdirSync(artifactRoot, { recursive: true });
      const artifactPath = artifactPathForDigest(contentHash);
      if (existsSync(artifactPath)) {
        if (readFileSync(artifactPath, "utf8") !== artifact.content) {
          throw new Error("local graph artifact content conflicts with its digest");
        }
      } else {
        const temporaryPath = `${artifactPath}.${process.pid}.${Date.now()}.tmp`;
        writeFileSync(temporaryPath, artifact.content, { encoding: "utf8", flag: "wx" });
        try {
          try {
            renameSync(temporaryPath, artifactPath);
          } catch (error) {
            if (!existsSync(artifactPath)) throw error;
          }
        } finally {
          rmSync(temporaryPath, { force: true });
        }
      }
      return {
        artifactId: `sha256:${contentHash}`,
        artifactPath,
        contentHash,
      };
    },
    read(reference: GraphArtifactReference): string {
      assertScope(reference.scopeId);
      const artifactPath = assertPath(
        reference.artifactPath ?? artifactPathForDigest(reference.contentHash),
      );
      const content = readFileSync(artifactPath, "utf8");
      const contentHash = createHash("sha256").update(content).digest("hex");
      if (contentHash !== reference.contentHash.replace(/^sha256:/, "")) {
        throw new Error("local graph artifact content hash mismatch");
      }
      return content;
    },
    remove(artifact: LegacyArtifactWriteResult): void {
      assertScope(scopeId);
      rmSync(assertPath(artifact.artifactPath), { force: true });
    },
  };
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
 * Resolves operator-supplied keys or provisions a runtime-owned Stage/production key pair.
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
  if (options.channel === "development") return {};

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

  // Generating a replacement pair for persisted ciphertext irreversibly makes
  // the existing graph unreadable. Require recovery of the original pair
  // instead; first install is the only safe time to provision keys.
  if (hasPersistedArtifactState(stableStateRoot)) {
    throw new Error(
      "managed artifact keys are absent for existing artifact state; restore both Message Graph keys from backup instead of generating replacements",
    );
  }

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
 * A persisted Track B state can take longer than a process-spawn grace period
 * to reconcile before it can report ready. Keep that recovery bounded while
 * matching the extension supervisor's documented allowance.
 */
export const TRACK_B_SIDECAR_STARTUP_TIMEOUT_MS = 90_000;

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
  readonly correlationId?: string;
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
  const correlationId = input.correlationId ?? `corr-${hex("correlation", 24)}`;
  if (!/^corr-[a-f0-9]{24}$/.test(correlationId))
    throw new Error("Run 88 correlationId is invalid");
  return normalizeRun88RuntimeCorrelation(
    {
      schemaVersion: "run88-correlation.v1",
      eventId: `evt-${hex("event", 24)}`,
      correlationId,
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

export function createRuntimeRequestCorrelationId(input: {
  readonly scope: string;
  readonly requestId: string;
  readonly routingDecisionId: string;
}): string {
  for (const [field, value] of Object.entries(input)) {
    if (typeof value !== "string" || !value.trim() || value.length > 512 || /[\r\n]/.test(value))
      throw new Error(`runtime request correlation ${field} is invalid`);
  }
  return `corr-${createHash("sha256")
    .update(
      `role-model.request-correlation.v1\0${input.scope}\0${input.requestId}\0${input.routingDecisionId}`,
    )
    .digest("hex")
    .slice(0, 24)}`;
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
  /** Exact public Git tree from which an N-generation private distribution was built. */
  readonly expectedPublicSourceTree?: string;
}) {
  const manifestPath = path.join(options.sourceRoot, "track-b-runtime-manifest.json");
  const manifestBytes = await readFile(manifestPath);
  const manifestSha256 = createHash("sha256").update(manifestBytes).digest("hex");
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as {
    readonly schemaVersion: string;
    readonly publicSourceTree?: string;
    readonly graphRegistry?: {
      readonly version?: number;
      readonly artifactSha256?: string;
      readonly kinds?: readonly unknown[];
    };
    readonly registryBindings?: {
      readonly graphRegistry?: {
        readonly schemaVersion?: string;
        readonly version?: number;
        readonly path?: string;
      };
      readonly storageRegistry?: {
        readonly schemaVersion?: string;
        readonly modulePath?: string;
      };
    };
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
    compatibilityGeneration === "N" &&
    (!manifest.graphRegistry ||
      manifest.graphRegistry.version !== 1 ||
      !/^[a-f0-9]{64}$/.test(manifest.graphRegistry.artifactSha256 ?? "") ||
      !Array.isArray(manifest.graphRegistry.kinds))
  ) {
    throw new Error("Track B runtime distribution graph registry is missing or invalid");
  }
  if (
    compatibilityGeneration === "N" &&
    (manifest.registryBindings?.graphRegistry?.schemaVersion !== "role-model.graph-registry.v1" ||
      manifest.registryBindings?.graphRegistry?.version !== 1 ||
      manifest.registryBindings?.graphRegistry?.path !== "shared/graph/registry.json" ||
      manifest.registryBindings.storageRegistry?.schemaVersion !==
        "role-model.storage-registry.v1" ||
      manifest.registryBindings?.storageRegistry?.modulePath !== "shared/retention/index.mjs")
  ) {
    throw new Error("Track B runtime distribution registry bindings are missing or invalid");
  }
  if (compatibilityGeneration === "N") {
    const graphRegistry = manifest.graphRegistry;
    if (!graphRegistry) throw new Error("Track B runtime distribution graph registry is missing");
    const graphRegistryBytes = Buffer.from(
      JSON.stringify({
        version: graphRegistry.version,
        kinds: graphRegistry.kinds,
      }),
      "utf8",
    );
    const graphRegistryDigest = createHash("sha256").update(graphRegistryBytes).digest("hex");
    if (graphRegistryDigest !== graphRegistry.artifactSha256) {
      throw new Error(
        "Track B runtime distribution graph registry digest does not bind its contents",
      );
    }
  }
  if (options.expectedPublicSourceTree) {
    if (
      !/^[0-9a-f]{40}$/.test(options.expectedPublicSourceTree) ||
      manifest.publicSourceTree !== options.expectedPublicSourceTree
    ) {
      throw new Error(
        "Track B runtime distribution public source tree does not match this package",
      );
    }
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
    publicSourceTree: manifest.publicSourceTree ?? null,
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
  readonly modelId?: string;
  readonly reasoningEffort?: string | null;
  readonly effortSource?: RuntimeEffortSource;
  readonly legacyIdentityMissing?: true;
  readonly run88Correlation?: Readonly<Record<string, unknown>>;
}

export interface TrackBPostObservationReceipt {
  readonly requestId: string;
  readonly completedAt: string;
  readonly result: unknown;
}

export const TRACK_B_CANONICAL_EXTENSION_IDS = [
  "artifact-store",
  "event-log",
  "repository-context",
  "background-evidence-scheduler",
  "memory-store",
  "knowledge-store",
  "evaluation-core",
  "crowdsourced-learning",
  "replay-core",
  "evaluation-runner-local",
  "trajectory-signals",
  "profile-learner",
  "knowledge-worker",
] as const;

export interface TrackBExtensionOutputRecord {
  readonly extensionId: string;
  readonly capability: string;
  readonly requestId: string;
  readonly workerPid: number;
  readonly durableOutputId: string;
  readonly durableLocator: unknown;
  readonly evidenceRef: string | null;
  readonly readCapability: string | null;
  readonly resultDigest: string;
}

export interface TrackBExtensionClosureEntry {
  readonly extensionId: string;
  readonly outputs: readonly TrackBExtensionOutputRecord[];
}

export interface TrackBExtensionClosure {
  readonly schemaVersion: "role-model.track-b-extension-closure.v1";
  readonly requestId: string;
  readonly routingDecisionId: string;
  readonly scope: string;
  readonly channel: string;
  readonly authorizationEpoch: number;
  readonly registry: Readonly<Record<string, TrackBExtensionClosureEntry>>;
}

function canonicalExtensionValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalExtensionValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonicalExtensionValue((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

function extensionResultRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function extensionEvidenceRef(result: Record<string, unknown>): string | null {
  if (typeof result.evidenceRef === "string" && result.evidenceRef.trim())
    return result.evidenceRef;
  const provenance = extensionResultRecord(result.provenance);
  return typeof provenance.evidenceRef === "string" && provenance.evidenceRef.trim()
    ? provenance.evidenceRef
    : null;
}

function extensionDurableLocator(result: Record<string, unknown>): unknown {
  if (result.durableLocator !== undefined) return result.durableLocator;
  if (result.artifactRef !== undefined) return result.artifactRef;
  if (typeof result.id === "string" && result.id.trim()) return { id: result.id };
  if (typeof result.receiptId === "string" && result.receiptId.trim())
    return { receiptId: result.receiptId };
  return null;
}

function buildExtensionOutputRecord(
  extensionId: string,
  envelope: Record<string, unknown>,
  result: unknown,
): TrackBExtensionOutputRecord {
  const record = extensionResultRecord(result);
  const workerPid = record.workerPid;
  if (!Number.isInteger(workerPid) || Number(workerPid) < 1)
    throw new Error(`extension ${extensionId} did not return an actual worker PID`);
  const durableLocator = extensionDurableLocator(record);
  const evidenceRef = extensionEvidenceRef(record);
  const supervisorOnlyKeys = new Set([
    "workerPid",
    "health",
    "available",
    "lifecycle",
    "restarts",
    "id",
    "durableLocator",
    "evidenceRef",
    "readCapability",
    "artifactRef",
    "receiptId",
    "resultDigest",
  ]);
  const meaningful = Object.fromEntries(
    Object.entries(record).filter(([key]) => !supervisorOnlyKeys.has(key)),
  );
  if (durableLocator === null || Object.keys(meaningful).length === 0)
    throw new Error(`extension ${extensionId} returned no durable business output`);
  const outputIdentity = canonicalExtensionValue({
    durableLocator,
    evidenceRef,
    businessOutput: record.businessOutput ?? meaningful,
  });
  const durableOutputId = `sha256:${createHash("sha256").update(JSON.stringify(outputIdentity)).digest("hex")}`;
  return {
    extensionId,
    capability: String(envelope.capability ?? ""),
    requestId: String(envelope.requestId ?? ""),
    workerPid: Number(workerPid),
    durableOutputId,
    durableLocator,
    evidenceRef,
    readCapability:
      typeof record.readCapability === "string" && record.readCapability.trim()
        ? record.readCapability
        : null,
    resultDigest: durableOutputId,
  };
}

export interface TrackBExtensionReadbackRuntime {
  listExtensions(): readonly unknown[] | Promise<readonly unknown[]>;
  mutateExtension(input: Record<string, unknown>): unknown | Promise<unknown>;
  invoke(id: string, envelope: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export async function verifyTrackBExtensionClosureAfterRestart(
  runtime: TrackBExtensionReadbackRuntime,
  closure: TrackBExtensionClosure,
  input: {
    readonly channel: string;
    readonly scope: string;
    readonly authorizationEpoch: number;
    readonly readDurableEvidence?: (input: {
      readonly extensionId: string;
      readonly durableLocator: unknown;
      readonly durableOutputId: string;
    }) => Promise<unknown>;
  },
) {
  if (closure?.schemaVersion !== "role-model.track-b-extension-closure.v1")
    throw new Error("extension closure schema is invalid");
  const states = await runtime.listExtensions();
  const results: Array<{
    extensionId: string;
    capability: string;
    durableOutputId: string;
    readbackOutputId: string;
    durableLocator: unknown;
    evidenceRef: string | null;
    readCapability: string | null;
    resultDigest: string;
    preRestartPid: number;
    postRestartPid: number;
  }> = [];
  for (const extensionId of Object.keys(closure.registry).sort()) {
    const entry = closure.registry[extensionId];
    if (!entry || entry.extensionId !== extensionId || entry.outputs.length === 0)
      throw new Error(`extension closure entry is incomplete for ${extensionId}`);
    const state = states.find(
      (candidate) => String((candidate as Record<string, unknown>).id ?? "") === extensionId,
    ) as Record<string, unknown> | undefined;
    const preRestartPid = Number(state?.pid);
    if (!Number.isInteger(preRestartPid) || preRestartPid < 1)
      throw new Error(`extension ${extensionId} has no live pre-restart PID`);
    const revision = Number(state?.revision ?? 1);
    const mutation = (await runtime.mutateExtension({
      id: extensionId,
      action: "restart",
      mutationId: `run94-readback:${closure.requestId}:${extensionId}:revision:${revision}`,
      expectedRevision: revision,
    })) as Record<string, unknown>;
    const mutationState = extensionResultRecord(mutation.state);
    const postRestartPid = Number(mutationState.pid);
    if (!Number.isInteger(postRestartPid) || postRestartPid < 1 || postRestartPid === preRestartPid)
      throw new Error(`extension ${extensionId} restart did not produce a distinct worker PID`);
    for (const output of entry.outputs) {
      let readback: unknown;
      if (output.readCapability) {
        readback = await runtime.invoke(extensionId, {
          requestId: `${closure.requestId}:readback:${output.durableOutputId}`,
          protocolVersion: "1.1.0",
          channel: input.channel,
          scope: input.scope,
          authorizationEpoch: input.authorizationEpoch,
          capability: output.readCapability,
          payload: {
            durableLocator: output.durableLocator,
            durableOutputId: output.durableOutputId,
            evidenceRef: output.evidenceRef,
          },
        });
      } else if (input.readDurableEvidence) {
        readback = await input.readDurableEvidence({
          extensionId,
          durableLocator: output.durableLocator,
          durableOutputId: output.durableOutputId,
        });
      } else {
        throw new Error(
          `extension ${extensionId} has no read capability or durable evidence reader`,
        );
      }
      const readbackRecord = extensionResultRecord(readback);
      const readbackOutputId = String(
        readbackRecord.readbackOutputId ?? readbackRecord.durableOutputId ?? "",
      );
      if (readbackOutputId !== output.durableOutputId)
        throw new Error(`extension ${extensionId} durable output readback mismatch`);
      results.push({
        extensionId,
        capability: output.capability,
        durableOutputId: output.durableOutputId,
        readbackOutputId,
        durableLocator: output.durableLocator,
        evidenceRef: output.evidenceRef,
        readCapability: output.readCapability,
        resultDigest: output.resultDigest,
        preRestartPid,
        postRestartPid,
      });
    }
  }
  return {
    schemaVersion: "role-model.track-b-extension-readback.v1" as const,
    requestId: closure.requestId,
    outputs: results,
  };
}

const TRACK_B_OUTBOX_SCHEMA_VERSION = "role-model.track-b-post-observation-outbox.v3" as const;
const TRACK_B_OUTBOX_RECEIPT_CAP_BYTES = 10 * 1024 * 1024;
const TRACK_B_OUTBOX_RECEIPT_RAW_CAP_BYTES = 10 * 1024 * 1024;
const TRACK_B_OUTBOX_SQLITE_HEADER = "SQLite format 3";

function boundedJson(value: unknown, capBytes = TRACK_B_OUTBOX_RECEIPT_CAP_BYTES): string {
  const json = JSON.stringify(value ?? null);
  if (Buffer.byteLength(json, "utf8") <= capBytes) return json;
  const bytes = Buffer.from(json, "utf8");
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (bytes.byteLength <= TRACK_B_OUTBOX_RECEIPT_RAW_CAP_BYTES) {
    const compressed = JSON.stringify({
      status: "compressed_receipt",
      encoding: "gzip-base64",
      byteLength: bytes.byteLength,
      sha256: `sha256:${digest}`,
      payload: gzipSync(bytes, { level: 9 }).toString("base64"),
    });
    if (Buffer.byteLength(compressed, "utf8") <= capBytes) return compressed;
  }
  return JSON.stringify({
    status: "bounded_receipt",
    byteLength: bytes.byteLength,
    sha256: `sha256:${digest}`,
  });
}

function parseBoundedJson(json: string): unknown {
  const value = JSON.parse(json) as Record<string, unknown> | unknown;
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (value as Record<string, unknown>).status !== "compressed_receipt"
  ) {
    return value;
  }
  const record = value as Record<string, unknown>;
  if (
    record.encoding !== "gzip-base64" ||
    typeof record.payload !== "string" ||
    !Number.isSafeInteger(record.byteLength) ||
    Number(record.byteLength) < 0 ||
    Number(record.byteLength) > TRACK_B_OUTBOX_RECEIPT_RAW_CAP_BYTES ||
    !/^sha256:[a-f0-9]{64}$/.test(String(record.sha256 ?? ""))
  ) {
    throw new Error("compressed receipt identity is invalid");
  }
  const bytes = gunzipSync(Buffer.from(record.payload, "base64"), {
    maxOutputLength: TRACK_B_OUTBOX_RECEIPT_RAW_CAP_BYTES,
  });
  if (
    bytes.byteLength !== record.byteLength ||
    `sha256:${createHash("sha256").update(bytes).digest("hex")}` !== record.sha256
  ) {
    throw new Error("compressed receipt integrity verification failed");
  }
  return JSON.parse(bytes.toString("utf8"));
}

function outboxSchema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS track_b_post_observation_pending (
      request_id TEXT PRIMARY KEY,
      routing_decision_id TEXT NOT NULL,
      endpoint_id TEXT NOT NULL,
      model_id TEXT,
      reasoning_effort TEXT,
      effort_source TEXT,
      run88_correlation_json TEXT,
      legacy_identity_missing INTEGER NOT NULL DEFAULT 0,
      enqueued_at_ms INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS track_b_post_observation_receipts (
      request_id TEXT PRIMARY KEY,
      completed_at TEXT NOT NULL,
      result_json TEXT NOT NULL,
      completed_at_ms INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS track_b_post_observation_legacy_rows (
      source_kind TEXT NOT NULL,
      source_index INTEGER NOT NULL,
      source_id TEXT,
      classification TEXT NOT NULL CHECK (classification IN ('imported', 'quarantined')),
      reason TEXT,
      source_hash TEXT NOT NULL,
      classified_at_ms INTEGER NOT NULL,
      PRIMARY KEY (source_kind, source_index)
    );
    CREATE INDEX IF NOT EXISTS track_b_post_observation_pending_order
      ON track_b_post_observation_pending(enqueued_at_ms, request_id);
    CREATE TABLE IF NOT EXISTS track_b_post_observation_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  database
    .prepare(
      "INSERT OR IGNORE INTO track_b_post_observation_meta (key, value) VALUES ('schemaVersion', ?)",
    )
    .run(TRACK_B_OUTBOX_SCHEMA_VERSION);
  // SQLite authorities created before effort variants were modeled can retain
  // pending rows without a complete variant identity. They cannot safely enter
  // a current Track B workflow: preserve the row as a bounded retired receipt
  // instead of dispatching it and failing the whole recovery pass.
  database.exec(`
    UPDATE track_b_post_observation_pending
       SET legacy_identity_missing = 1
     WHERE legacy_identity_missing = 0
       AND (
         model_id IS NULL
         OR trim(model_id) = ''
         OR effort_source IS NULL
         OR effort_source NOT IN ('none', 'client', 'variant', 'variant_coerced')
         OR (reasoning_effort IS NULL AND effort_source <> 'none')
         OR (reasoning_effort IS NOT NULL AND effort_source = 'none')
       )
  `);
}

function sqliteHeader(bytes: Buffer): boolean {
  return (
    bytes.subarray(0, TRACK_B_OUTBOX_SQLITE_HEADER.length).toString("utf8") ===
    TRACK_B_OUTBOX_SQLITE_HEADER
  );
}

function legacyRowHash(row: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(row ?? null))
    .digest("hex")}`;
}

function legacySourceId(row: unknown): string | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const value = (row as Record<string, unknown>).requestId;
  return typeof value === "string" && value.trim() ? value : null;
}

function insertLegacyClassification(
  database: DatabaseSync,
  input: {
    readonly sourceKind: "pending" | "receipt";
    readonly sourceIndex: number;
    readonly sourceId: string | null;
    readonly classification: "imported" | "quarantined";
    readonly reason?: string;
    readonly sourceHash: string;
  },
): void {
  database
    .prepare(
      `INSERT INTO track_b_post_observation_legacy_rows
       (source_kind, source_index, source_id, classification, reason, source_hash, classified_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.sourceKind,
      input.sourceIndex,
      input.sourceId,
      input.classification,
      input.reason ?? null,
      input.sourceHash,
      Date.now(),
    );
}

async function initializeTrackBPostObservationOutbox(
  filePath: string,
  maxItems: number,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const legacyArchivePath = `${filePath}.n-1.json`;
  const bytes = await readFile(filePath).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  });
  if (bytes && sqliteHeader(bytes)) {
    const database = new DatabaseSync(filePath);
    try {
      outboxSchema(database);
    } finally {
      database.close();
    }
    return;
  }

  let legacyValue: unknown = null;
  let legacySourcePath: string | null = null;
  if (bytes) {
    try {
      legacyValue = JSON.parse(bytes.toString("utf8")) as unknown;
    } catch (error) {
      throw new Error(
        `Track B post-observation legacy JSON is malformed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (
      await readFile(legacyArchivePath)
        .then(() => true)
        .catch(() => false)
    ) {
      throw new Error("Track B post-observation legacy JSON archive already exists");
    }
    await rename(filePath, legacyArchivePath);
    legacySourcePath = legacyArchivePath;
  } else if (
    await readFile(legacyArchivePath)
      .then(() => true)
      .catch(() => false)
  ) {
    try {
      legacyValue = JSON.parse(await readFile(legacyArchivePath, "utf8"));
    } catch (error) {
      throw new Error(
        `Track B post-observation legacy archive is malformed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const legacyPending = Array.isArray(legacyValue) ? legacyValue : null;
  const document =
    !legacyPending && legacyValue && typeof legacyValue === "object" ? legacyValue : null;
  const pending = legacyPending ?? (document as { pending?: unknown[] } | null)?.pending;
  const receipts = (document as { receipts?: unknown[] } | null)?.receipts;
  if (legacyValue !== null && (!Array.isArray(pending) || !Array.isArray(receipts ?? []))) {
    throw new Error("Track B post-observation legacy JSON document is malformed");
  }

  const database = new DatabaseSync(filePath);
  try {
    outboxSchema(database);
    database.exec("BEGIN IMMEDIATE");
    try {
      let importedPendingCount = 0;
      let importedReceiptCount = 0;
      for (const [sourceIndex, raw] of (pending ?? []).entries()) {
        const row =
          raw && typeof raw === "object" && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : {};
        const sourceId = legacySourceId(raw);
        try {
          const normalized = normalizeTrackBVariantIdentity(row);
          if (!row.requestId || !row.routingDecisionId) throw new Error("identity incomplete");
          if (importedPendingCount >= maxItems) {
            throw new Error("outbox capacity exceeded during legacy import");
          }
          database
            .prepare(
              `INSERT OR IGNORE INTO track_b_post_observation_pending
               (request_id, routing_decision_id, endpoint_id, model_id, reasoning_effort, effort_source,
                run88_correlation_json, legacy_identity_missing, enqueued_at_ms)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
            )
            .run(
              String(row.requestId),
              String(row.routingDecisionId),
              normalized.endpointId,
              normalized.modelId,
              normalized.reasoningEffort,
              normalized.effortSource,
              row.run88Correlation && typeof row.run88Correlation === "object"
                ? boundedJson(row.run88Correlation)
                : null,
              Date.now() + sourceIndex,
            );
          importedPendingCount += 1;
          insertLegacyClassification(database, {
            sourceKind: "pending",
            sourceIndex,
            sourceId,
            classification: "imported",
            sourceHash: legacyRowHash(raw),
          });
        } catch (error) {
          insertLegacyClassification(database, {
            sourceKind: "pending",
            sourceIndex,
            sourceId,
            classification: "quarantined",
            reason: error instanceof Error ? error.message : String(error),
            sourceHash: legacyRowHash(raw),
          });
        }
      }
      for (const [sourceIndex, raw] of (receipts ?? []).entries()) {
        const row =
          raw && typeof raw === "object" && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : {};
        const sourceId = legacySourceId(raw);
        try {
          if (!row.requestId || !row.completedAt || !("result" in row))
            throw new Error("receipt identity incomplete");
          if (importedReceiptCount >= maxItems) {
            throw new Error("receipt capacity exceeded during legacy import");
          }
          database
            .prepare(
              `INSERT OR IGNORE INTO track_b_post_observation_receipts
               (request_id, completed_at, result_json, completed_at_ms) VALUES (?, ?, ?, ?)`,
            )
            .run(
              String(row.requestId),
              String(row.completedAt),
              boundedJson(row.result),
              Date.now(),
            );
          importedReceiptCount += 1;
          insertLegacyClassification(database, {
            sourceKind: "receipt",
            sourceIndex,
            sourceId,
            classification: "imported",
            sourceHash: legacyRowHash(raw),
          });
        } catch (error) {
          insertLegacyClassification(database, {
            sourceKind: "receipt",
            sourceIndex,
            sourceId,
            classification: "quarantined",
            reason: error instanceof Error ? error.message : String(error),
            sourceHash: legacyRowHash(raw),
          });
        }
      }
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  } catch (error) {
    database.close();
    if (legacySourcePath) await rename(legacySourcePath, filePath).catch(() => undefined);
    await rm(filePath, { force: true }).catch(() => undefined);
    throw error;
  }
  database.close();
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
  let initialized: Promise<void> | null = null;
  const ensureInitialized = () => {
    if (!initialized) initialized = initializeTrackBPostObservationOutbox(filePath, maxItems);
    return initialized;
  };
  const withDatabase = async <T>(run: (database: DatabaseSync) => T): Promise<T> => {
    await ensureInitialized();
    const database = new DatabaseSync(filePath);
    try {
      outboxSchema(database);
      return run(database);
    } finally {
      database.close();
    }
  };
  const exclusive = <T>(run: () => Promise<T>): Promise<T> => {
    const result = operation.then(run, run);
    operation = result.catch(() => undefined);
    return result;
  };
  return {
    enqueue(observation: Readonly<Record<string, unknown>>): Promise<void> {
      return exclusive(async () => {
        const identity = normalizeTrackBVariantIdentity(observation);
        const item = {
          requestId: String(observation.requestId ?? ""),
          routingDecisionId: String(observation.routingDecisionId ?? ""),
          ...identity,
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
        await withDatabase((database) => {
          database.exec("BEGIN IMMEDIATE");
          try {
            const existing = database
              .prepare(
                "SELECT 1 AS found FROM track_b_post_observation_pending WHERE request_id=? UNION ALL SELECT 1 FROM track_b_post_observation_receipts WHERE request_id=? LIMIT 1",
              )
              .get(item.requestId, item.requestId);
            if (existing) {
              database.exec("COMMIT");
              return;
            }
            const count = database
              .prepare("SELECT COUNT(*) AS count FROM track_b_post_observation_pending")
              .get() as { count: number };
            if (count.count >= maxItems) throw new Error("Track B post-observation outbox is full");
            database
              .prepare(
                `INSERT INTO track_b_post_observation_pending
                 (request_id, routing_decision_id, endpoint_id, model_id, reasoning_effort, effort_source,
                  run88_correlation_json, legacy_identity_missing, enqueued_at_ms)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
              )
              .run(
                item.requestId,
                item.routingDecisionId,
                item.endpointId,
                item.modelId,
                item.reasoningEffort,
                item.effortSource,
                item.run88Correlation ? boundedJson(item.run88Correlation) : null,
                Date.now(),
              );
            database.exec("COMMIT");
          } catch (error) {
            database.exec("ROLLBACK");
            throw error;
          }
        });
      });
    },
    drain(
      handler: (observation: TrackBPostObservationWorkItem) => Promise<unknown>,
    ): Promise<void> {
      return exclusive(async () => {
        for (;;) {
          const item = await withDatabase((database) => {
            const row = database
              .prepare(
                `SELECT request_id, routing_decision_id, endpoint_id, model_id, reasoning_effort,
                        effort_source, run88_correlation_json, legacy_identity_missing
                 FROM track_b_post_observation_pending ORDER BY enqueued_at_ms, request_id LIMIT 1`,
              )
              .get() as
              | {
                  request_id: string;
                  routing_decision_id: string;
                  endpoint_id: string;
                  model_id: string | null;
                  reasoning_effort: string | null;
                  effort_source: RuntimeEffortSource | null;
                  run88_correlation_json: string | null;
                  legacy_identity_missing: number;
                }
              | undefined;
            if (!row) return null;
            return {
              requestId: row.request_id,
              routingDecisionId: row.routing_decision_id,
              endpointId: row.endpoint_id,
              ...(row.model_id !== null ? { modelId: row.model_id } : {}),
              // `null` is the explicit provider-default effort identity. Preserve it
              // through the SQLite round trip so the strict variant validator can
              // distinguish a valid default from an N-1 record with no identity.
              reasoningEffort: row.reasoning_effort,
              ...(row.effort_source !== null ? { effortSource: row.effort_source } : {}),
              ...(row.run88_correlation_json
                ? { run88Correlation: parseBoundedJson(row.run88_correlation_json) }
                : {}),
              ...(row.legacy_identity_missing ? { legacyIdentityMissing: true as const } : {}),
            } as TrackBPostObservationWorkItem;
          });
          if (!item) break;
          const result = item.legacyIdentityMissing
            ? { status: "retired_legacy_missing_variant_identity", productionMutation: false }
            : await handler(item);
          await withDatabase((database) => {
            database.exec("BEGIN IMMEDIATE");
            try {
              database
                .prepare("DELETE FROM track_b_post_observation_pending WHERE request_id=?")
                .run(item.requestId);
              database
                .prepare(
                  `INSERT OR REPLACE INTO track_b_post_observation_receipts
                   (request_id, completed_at, result_json, completed_at_ms) VALUES (?, ?, ?, ?)`,
                )
                .run(item.requestId, new Date().toISOString(), boundedJson(result), Date.now());
              database
                .prepare(
                  `DELETE FROM track_b_post_observation_receipts
                   WHERE request_id NOT IN
                     (SELECT request_id FROM track_b_post_observation_receipts ORDER BY completed_at_ms DESC, request_id DESC LIMIT ?)`,
                )
                .run(maxItems);
              database.exec("COMMIT");
            } catch (error) {
              database.exec("ROLLBACK");
              throw error;
            }
          });
        }
      });
    },
    async drainUntilReceipt(
      requestId: string,
      handler: (observation: TrackBPostObservationWorkItem) => Promise<unknown>,
    ): Promise<TrackBPostObservationReceipt | null> {
      const existing = await this.readReceipt(requestId);
      if (existing) return existing;
      await this.drain(handler);
      return this.readReceipt(requestId);
    },
    async read(): Promise<{
      readonly pendingCount: number;
      readonly receiptCount: number;
      readonly receipts: readonly TrackBPostObservationReceipt[];
    }> {
      await operation;
      return withDatabase((database) => {
        const pendingCount = (
          database
            .prepare("SELECT COUNT(*) AS count FROM track_b_post_observation_pending")
            .get() as {
            count: number;
          }
        ).count;
        const rows = database
          .prepare(
            "SELECT request_id, completed_at, result_json FROM track_b_post_observation_receipts ORDER BY completed_at_ms, request_id",
          )
          .all() as Array<{ request_id: string; completed_at: string; result_json: string }>;
        return {
          pendingCount,
          receiptCount: rows.length,
          receipts: rows.map((row) => ({
            requestId: row.request_id,
            completedAt: row.completed_at,
            result: parseBoundedJson(row.result_json),
          })),
        };
      });
    },
    async readReceipt(requestId: string): Promise<TrackBPostObservationReceipt | null> {
      await operation;
      return withDatabase((database) => {
        const row = database
          .prepare(
            "SELECT request_id, completed_at, result_json FROM track_b_post_observation_receipts WHERE request_id=?",
          )
          .get(requestId) as
          | { request_id: string; completed_at: string; result_json: string }
          | undefined;
        return row
          ? {
              requestId: row.request_id,
              completedAt: row.completed_at,
              result: parseBoundedJson(row.result_json),
            }
          : null;
      });
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
  readonly comparableEvidence?: Readonly<Record<string, unknown>>;
  readonly evaluationCases: readonly Record<string, unknown>[];
  readonly trajectoryEvents: readonly Record<string, unknown>[];
  readonly identity?: TrackBVariantIdentity;
  readonly occurrence?: Readonly<{ occurrenceId: string; contentId: string }>;
}

export interface TrackBVariantIdentity {
  readonly endpointId: string;
  readonly modelId: string;
  readonly reasoningEffort: string | null;
  readonly effortSource: RuntimeEffortSource;
}

const TRACK_B_EFFORT_SOURCES = new Set<RuntimeEffortSource>([
  "none",
  "client",
  "variant",
  "variant_coerced",
]);

function readTrackBIdentityText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 256) {
    throw new Error(`persisted observation effort identity ${field} is invalid`);
  }
  return value;
}

function normalizeTrackBVariantIdentity(
  observation: Readonly<Record<string, unknown>>,
): TrackBVariantIdentity {
  const usageEvent =
    observation.usageEvent &&
    typeof observation.usageEvent === "object" &&
    !Array.isArray(observation.usageEvent)
      ? (observation.usageEvent as Record<string, unknown>)
      : null;
  const endpointId = readTrackBIdentityText(observation.endpointId, "endpointId");
  const modelId = readTrackBIdentityText(observation.modelId ?? usageEvent?.model_id, "modelId");
  if (usageEvent?.endpoint_id !== undefined && usageEvent.endpoint_id !== endpointId) {
    throw new Error("persisted observation effort identity endpointId conflicts with usageEvent");
  }
  if (usageEvent?.model_id !== undefined && usageEvent.model_id !== modelId) {
    throw new Error("persisted observation effort identity modelId conflicts with usageEvent");
  }
  if (!("reasoningEffort" in observation) || !("effortSource" in observation)) {
    throw new Error("persisted observation effort identity is incomplete");
  }
  const reasoningEffort = observation.reasoningEffort;
  if (
    reasoningEffort !== null &&
    (typeof reasoningEffort !== "string" || !reasoningEffort.trim() || reasoningEffort.length > 128)
  ) {
    throw new Error("persisted observation effort identity reasoningEffort is invalid");
  }
  const effortSource = observation.effortSource;
  if (
    typeof effortSource !== "string" ||
    !TRACK_B_EFFORT_SOURCES.has(effortSource as RuntimeEffortSource)
  ) {
    throw new Error("persisted observation effort identity effortSource is invalid");
  }
  if (
    (reasoningEffort === null && effortSource !== "none") ||
    (reasoningEffort !== null && effortSource === "none")
  ) {
    throw new Error("persisted observation effort identity effort/source pair is inconsistent");
  }
  if (
    usageEvent?.reasoning_effort !== undefined &&
    usageEvent.reasoning_effort !== reasoningEffort
  ) {
    throw new Error(
      "persisted observation effort identity reasoningEffort conflicts with usageEvent",
    );
  }
  if (usageEvent?.effort_source !== undefined && usageEvent.effort_source !== effortSource) {
    throw new Error("persisted observation effort identity effortSource conflicts with usageEvent");
  }
  return {
    endpointId,
    modelId,
    reasoningEffort: reasoningEffort as string | null,
    effortSource: effortSource as RuntimeEffortSource,
  };
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
  const comparableEvidence = input.comparableEvidence;
  const sourceRollout = comparableEvidence?.source as Record<string, unknown> | undefined;
  const counterfactualRollouts = Array.isArray(comparableEvidence?.counterfactuals)
    ? (comparableEvidence.counterfactuals as Record<string, unknown>[])
    : [];
  const candidateSet = Array.isArray(comparableEvidence?.candidateSet)
    ? (comparableEvidence.candidateSet as Record<string, unknown>[])
    : [];
  if (
    !sourceRollout ||
    counterfactualRollouts.length < 1 ||
    candidateSet.length < 2 ||
    input.counterfactuals.length < 1 ||
    input.counterfactuals.every((counterfactual) => counterfactual.id === input.routePackage) ||
    counterfactualRollouts.some(
      (rollout) =>
        rollout.rolloutId === sourceRollout.rolloutId ||
        (rollout.routePackage === sourceRollout.routePackage &&
          rollout.endpointId === sourceRollout.endpointId &&
          rollout.modelId === sourceRollout.modelId &&
          rollout.policyId === sourceRollout.policyId &&
          rollout.reasoningEffort === sourceRollout.reasoningEffort),
    )
  ) {
    throw new Error("R14_NO_DISTINCT_COUNTERFACTUAL: routing-shadow self-comparison is prohibited");
  }
  const envelope = (capability: string, value: unknown): Record<string, unknown> => ({
    requestId: `${input.requestId}:${capability}`,
    sessionId: input.requestId,
    protocolVersion: "1.1.0",
    channel: input.channel,
    scope: input.scope,
    authorizationEpoch: input.authorizationEpoch,
    capability,
    ...(input.identity ? { identity: input.identity } : {}),
    ...(input.occurrence ? { occurrence: input.occurrence } : {}),
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
      comparableEvidence,
      cases: input.evaluationCases,
    }),
    scorerDefinitions: [scorer],
  });
  const scores = Array.isArray(evaluation.scores)
    ? evaluation.scores.filter((score): score is number => Number.isFinite(score))
    : [];
  const holdout = evaluation.holdout as Record<string, unknown> | undefined;
  if (!scores.length || holdout?.passed !== true || typeof holdout.evidenceRef !== "string") {
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
      rows: [sourceRollout, ...counterfactualRollouts].map((rollout) => ({
        model: rollout.modelId,
        endpoint: rollout.endpointId,
        prompt: "unchanged",
        tool: "unchanged",
        sampling: "deterministic",
        experience: "routing-evaluation",
        routePackage: rollout.routePackage,
        outcome:
          (rollout.outcome as Record<string, unknown> | undefined)?.status === "success" ? 1 : 0,
        propensity: rollout.propensity,
        evidenceRef: rollout.evidenceRef,
      })),
    }),
    rows: [sourceRollout, ...counterfactualRollouts].map((rollout) => ({
      model: rollout.modelId,
      endpoint: rollout.endpointId,
      prompt: "unchanged",
      tool: "unchanged",
      sampling: "deterministic",
      experience: "routing-evaluation",
      routePackage: rollout.routePackage,
      outcome:
        (rollout.outcome as Record<string, unknown> | undefined)?.status === "success" ? 1 : 0,
      propensity: rollout.propensity,
      evidenceRef: rollout.evidenceRef,
    })),
  });
  const rolloutRows = [sourceRollout, ...counterfactualRollouts];
  const scoredRollouts = rolloutRows.map((rollout) => ({
    ...rollout,
    score: (rollout.outcome as Record<string, unknown> | undefined)?.status === "success" ? 1 : 0,
  }));
  const positive = scoredRollouts.filter((rollout) => rollout.score === 1);
  const negative = scoredRollouts.filter((rollout) => rollout.score === 0);
  if (!positive.length || !negative.length)
    throw new Error(
      "R14_INSUFFICIENT_ROLLOUT_EVIDENCE: positive and negative rollout evidence is required",
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
        negative,
        candidateSet,
      },
      holdout,
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

async function runTrackBObservationPipeline(
  runtime: TrackBShadowPipelineRuntime,
  input: {
    readonly requestId: string;
    readonly channel: string;
    readonly scope: string;
    readonly authorizationEpoch: number;
    readonly productionState: Readonly<Record<string, unknown>>;
    readonly routePackage: string;
    readonly sourceDecisionId: string;
    readonly sourceGraphRef: string;
    readonly trajectoryEvents: readonly Record<string, unknown>[];
    readonly identity: TrackBVariantIdentity;
    readonly occurrence?: Readonly<{ occurrenceId: string; contentId: string }>;
  },
) {
  const envelope = (capability: string, value: unknown): Record<string, unknown> => ({
    requestId: `${input.requestId}:${capability}`,
    sessionId: input.requestId,
    protocolVersion: "1.1.0",
    channel: input.channel,
    scope: input.scope,
    authorizationEpoch: input.authorizationEpoch,
    capability,
    identity: input.identity,
    ...(input.occurrence ? { occurrence: input.occurrence } : {}),
    value,
  });
  const replay = await runtime.invoke(
    "replay-core",
    envelope("replay:plan-graph", {
      sourceDecisionId: input.sourceDecisionId,
      sourceGraphRef: input.sourceGraphRef,
      prefix: [{ routingDecisionId: input.sourceDecisionId, identity: input.identity }],
      counterfactuals: [],
      disposition: "observation_only_no_distinct_counterfactual",
    }),
  );
  const scorer = { id: "run94-observation", version: "1", algorithm: "exact_match" };
  const evaluationCase = { expected: input.routePackage, actual: input.routePackage };
  const evaluation = await runtime.invoke("evaluation-runner-local", {
    ...envelope("evaluation:run-local", {
      policy: "routing-observation",
      task: "route-selection-observation",
      scorer: `${scorer.id}@${scorer.version}`,
      split: "observed",
      seed: 94,
      evidenceRef: input.sourceGraphRef,
      cases: [evaluationCase],
    }),
    scorerDefinitions: [scorer],
  });
  const signals = await runtime.invoke(
    "trajectory-signals",
    envelope("signals:analyze", {
      routeDecisionId: input.sourceDecisionId,
      graphRef: input.sourceGraphRef,
      events: input.trajectoryEvents,
    }),
  );
  const profileRows = [
    {
      model: input.identity.modelId,
      endpoint: input.identity.endpointId,
      prompt: "unchanged",
      tool: "unchanged",
      sampling: "observed",
      experience: "none",
      routePackage: input.routePackage,
      outcome: 1,
      propensity: 1,
      evidenceRef: input.sourceGraphRef,
    },
  ];
  const profile = await runtime.invoke("profile-learner", {
    ...envelope("profile:estimate", { rows: profileRows }),
    rows: profileRows,
  });
  return {
    replay,
    evaluation,
    signals,
    profile,
    productionState: structuredClone(input.productionState),
    receipt: {
      schemaVersion: "role-model.track-b-shadow-pipeline-receipt.v1",
      mode: "shadow",
      status: "insufficient_comparable_evidence",
      refusalCode: "R14_NO_DISTINCT_COUNTERFACTUAL",
      requestId: input.requestId,
      providerCalls: 0,
      productionMutation: false,
      candidateId: null,
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
  const identity = normalizeTrackBVariantIdentity(observation);
  const occurrenceId = String(observation.occurrenceId ?? `occurrence:${requestId}`);
  const contentId = String(observation.contentId ?? `content:${requestId}`);
  if (!occurrenceId || !contentId) {
    throw new Error("post-observation occurrence and content identity is required");
  }
  let occurrence = Object.freeze({ occurrenceId, contentId });
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
    identity,
    occurrence,
    ...(run88Correlation ? { run88Correlation } : {}),
    ...extra,
  });
  const closureEntries = new Map<string, TrackBExtensionClosureEntry>();
  const durableOutputIds = new Set<string>();
  const observedRuntime: TrackBShadowPipelineRuntime = {
    async invoke(id, envelope) {
      const result = await runtime.invoke(id, envelope);
      const output = buildExtensionOutputRecord(id, envelope, result);
      if (durableOutputIds.has(output.durableOutputId))
        throw new Error(`duplicate durable extension output ${output.durableOutputId}`);
      durableOutputIds.add(output.durableOutputId);
      const prior = closureEntries.get(id);
      closureEntries.set(id, {
        extensionId: id,
        outputs: [...(prior?.outputs ?? []), output],
      });
      return result;
    },
  };
  const artifact = await observedRuntime.invoke(
    "artifact-store",
    businessEnvelope("graph:write", {
      payload: {
        scope: input.scope,
        record: {
          content: JSON.stringify({ requestId, sourceDecisionId, routePackage, identity }),
          mediaType: "application/json",
          schema: "role-model.track-b-post-observation.v1",
        },
      },
    }),
  );
  const artifactRef = String(artifact.id ?? `observation:${requestId}`);
  const artifactOccurrence =
    artifact.occurrence && typeof artifact.occurrence === "object"
      ? (artifact.occurrence as Record<string, unknown>)
      : null;
  if (
    artifactOccurrence?.occurrenceId === occurrenceId &&
    typeof artifactOccurrence.contentId === "string"
  ) {
    occurrence = Object.freeze({ occurrenceId, contentId: artifactOccurrence.contentId });
  } else {
    occurrence = Object.freeze({ occurrenceId, contentId: artifactRef });
  }
  await observedRuntime.invoke(
    "event-log",
    businessEnvelope("event:append", {
      payload: {
        channel: input.channel,
        type: "track_b_post_observation",
        idempotencyKey: `track-b:${requestId}`,
        artifactRef,
        identity,
      },
    }),
  );
  const repositoryContextResult = await observedRuntime.invoke(
    "repository-context",
    businessEnvelope("repository:read", {
      payload: { scopeId: input.scope, canonicalIdentity: input.scope, identity },
    }),
  );
  const repositoryContextRecord = repositoryContextResult as Record<string, unknown>;
  const repositoryContextValue = repositoryContextRecord.context as
    | Record<string, unknown>
    | undefined;
  const repositoryDiagnostics = Array.isArray(repositoryContextRecord.diagnostics)
    ? repositoryContextRecord.diagnostics.map((diagnostic) => {
        const row = diagnostic as Record<string, unknown>;
        return {
          code: String(row.code ?? ""),
          message: String(row.message ?? ""),
          severity: String(row.severity ?? ""),
        };
      })
    : [];
  const repositoryContext =
    repositoryContextRecord.available === true
      ? {
          available: true as const,
          scopeId: String(repositoryContextValue?.scopeId ?? ""),
          repoFingerprint: String(repositoryContextValue?.repoFingerprint ?? ""),
          packageId:
            repositoryContextValue?.packageId === null ||
            typeof repositoryContextValue?.packageId === "string"
              ? repositoryContextValue.packageId
              : null,
          fallbackLevel: String(repositoryContextValue?.fallbackLevel ?? ""),
          branchCompatibility: String(repositoryContextValue?.branchCompatibility ?? ""),
          fingerprintEpoch: Number(repositoryContextValue?.fingerprintEpoch),
          diagnostics: repositoryDiagnostics,
        }
      : {
          available: false as const,
          unavailableReason: String(repositoryContextRecord.unavailableReason ?? "unavailable"),
          diagnostics: repositoryDiagnostics,
        };
  if (
    repositoryContext.available &&
    (!repositoryContext.scopeId ||
      !/^[a-f0-9]{64}$/.test(repositoryContext.repoFingerprint) ||
      !Number.isSafeInteger(repositoryContext.fingerprintEpoch) ||
      repositoryContext.fingerprintEpoch < 1)
  ) {
    throw new Error("repository-context returned an invalid privacy-safe receipt");
  }
  await observedRuntime.invoke(
    "background-evidence-scheduler",
    businessEnvelope("scheduler:schedule-and-run", {
      jobId: `post-observation:${requestId}`,
      payload: { requestId, sourceDecisionId, artifactRef, identity },
    }),
  );
  await observedRuntime.invoke(
    "memory-store",
    businessEnvelope("memory:write", {
      payload: {
        row: { scope: input.scope, key: `observation:${requestId}`, artifactRef, identity },
      },
    }),
  );
  const knowledge = await observedRuntime.invoke(
    "knowledge-store",
    businessEnvelope("knowledge:write", {
      payload: {
        value: {
          type: "track_b_observation_reference",
          version: 1,
          scope: input.scope,
          artifactRef,
          provenance: `routing-decision:${sourceDecisionId}`,
          identity,
        },
      },
    }),
  );
  await observedRuntime.invoke(
    "knowledge-store",
    businessEnvelope("knowledge:read", {
      payload: { id: knowledge.id, scope: input.scope, identity },
    }),
  );
  await observedRuntime.invoke(
    "crowdsourced-learning",
    businessEnvelope("aggregate:preview", {
      input: {
        channel: input.channel,
        scope: input.scope,
        destination: "aggregate",
        schemaId: "route_outcome_aggregate.v1",
        classId: "route_outcome",
        identity,
        payload: { count: 1, identity },
      },
    }),
  );
  const sourceHash = createHash("sha256").update(JSON.stringify(observation)).digest("hex");
  const sourceGraphRef = `sha256:${sourceHash}`;
  const productionState = {
    routingDecisionId: sourceDecisionId,
    endpointId: routePackage,
    identity,
    immutable: true,
  } as const;
  const trajectoryEvents = [
    { requestId, routingDecisionId: sourceDecisionId, endpointId: routePackage, identity },
  ];
  const routingShadowEvidence =
    observation.routingShadowEvidence &&
    typeof observation.routingShadowEvidence === "object" &&
    !Array.isArray(observation.routingShadowEvidence)
      ? (observation.routingShadowEvidence as Readonly<Record<string, unknown>>)
      : null;
  const routingShadowCases = Array.isArray(observation.routingShadowCases)
    ? observation.routingShadowCases.filter((item): item is Record<string, unknown> =>
        Boolean(item && typeof item === "object" && !Array.isArray(item)),
      )
    : [];
  const comparableCounterfactuals = Array.isArray(routingShadowEvidence?.counterfactuals)
    ? (routingShadowEvidence.counterfactuals as Record<string, unknown>[])
    : [];
  const pipeline =
    routingShadowEvidence && routingShadowCases.length > 0
      ? await runTrackBShadowPipeline(observedRuntime, {
          requestId,
          channel: input.channel,
          scope: input.scope,
          authorizationEpoch: input.authorizationEpoch,
          productionState,
          routePackage,
          sourceDecisionId,
          sourceGraphRef,
          prefix: [{ routingDecisionId: sourceDecisionId, identity }],
          counterfactuals: comparableCounterfactuals.map((rollout) => ({
            id: String(rollout.routePackage ?? ""),
            suffix: [{ endpointId: rollout.endpointId, modelId: rollout.modelId }],
          })),
          comparableEvidence: routingShadowEvidence,
          evaluationCases: routingShadowCases,
          trajectoryEvents,
          identity,
          occurrence,
        })
      : await runTrackBObservationPipeline(observedRuntime, {
          requestId,
          channel: input.channel,
          scope: input.scope,
          authorizationEpoch: input.authorizationEpoch,
          productionState,
          routePackage,
          sourceDecisionId,
          sourceGraphRef,
          trajectoryEvents,
          identity,
          occurrence,
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
      identity,
      candidateId:
        "candidate" in pipeline && typeof pipeline.candidate?.id === "string"
          ? pipeline.candidate.id
          : null,
    },
  });
  const consumption = await consumeTrackBProjection(observedRuntime, projection, {
    channel: input.channel,
    authorizationEpoch: input.authorizationEpoch,
    identity: { ...identity },
    occurrence,
  });
  const registry = Object.fromEntries(
    [...closureEntries.entries()].sort(([left], [right]) => left.localeCompare(right)),
  ) as Record<string, TrackBExtensionClosureEntry>;
  const missing = TRACK_B_CANONICAL_EXTENSION_IDS.filter((id) => !registry[id]);
  if (missing.length)
    throw new Error(`extension closure is missing registry outputs: ${missing.join(", ")}`);
  const extensionClosure: TrackBExtensionClosure = {
    schemaVersion: "role-model.track-b-extension-closure.v1",
    requestId,
    routingDecisionId: sourceDecisionId,
    scope: input.scope,
    channel: input.channel,
    authorizationEpoch: input.authorizationEpoch,
    registry,
  };
  return {
    pipeline: pipeline.receipt,
    projection,
    consumption,
    repositoryContext,
    extensionClosure,
  };
}

export async function runTrackBPostObservationWithContribution(
  runtime: TrackBShadowPipelineRuntime,
  observation: Readonly<Record<string, unknown>>,
  input: {
    readonly scope: string;
    readonly channel: "development" | "stage" | "production";
    readonly authorizationEpoch: number;
    readonly expectedReleaseId?: string;
    readonly run88Correlation?: Record<string, unknown>;
  },
  recordContribution: (input: Record<string, unknown>) => Promise<unknown>,
) {
  if (typeof recordContribution !== "function")
    throw new Error("Track B contribution recorder is required");
  const result = await runTrackBPostObservation(runtime, observation, input);
  const identity = normalizeTrackBVariantIdentity(observation);
  const requestId = String(observation.requestId ?? "");
  const routingDecisionId = String(observation.routingDecisionId ?? "");
  const correlationId = createRuntimeRequestCorrelationId({
    scope: input.scope,
    requestId,
    routingDecisionId,
  });
  const usageEvent =
    observation.usageEvent && typeof observation.usageEvent === "object"
      ? (observation.usageEvent as Record<string, unknown>)
      : {};
  const contribution = await recordContribution({
    requestId,
    correlationId,
    routingDecisionId,
    endpointId: identity.endpointId,
    modelId: identity.modelId,
    reasoningEffort: identity.reasoningEffort,
    effortSource: identity.effortSource,
    taskType: "general.chat",
    inputTokens: Number(usageEvent.tokens_in ?? 0),
    outputTokens: Number(usageEvent.tokens_out ?? 0),
    success: true,
  });
  return { ...result, contribution };
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
    startupTimeoutMs: options.startupTimeoutMs ?? 30_000,
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
  aggregateCorrelationReleaseId?: string;
  aggregateCorrelationCohortId?: string;
  aggregateCorrelationOperationId?: string;
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
          ...(options.aggregateCorrelationReleaseId
            ? ["--aggregate-correlation-release-id", options.aggregateCorrelationReleaseId]
            : []),
          ...(options.aggregateCorrelationCohortId
            ? ["--aggregate-correlation-cohort-id", options.aggregateCorrelationCohortId]
            : []),
          ...(options.aggregateCorrelationOperationId
            ? ["--aggregate-correlation-operation-id", options.aggregateCorrelationOperationId]
            : []),
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
          // A persisted Track B graph can require more than the short process-spawn
          // window to reconcile durable state before it can publish readiness. Keep
          // this bounded, but align the owned sidecar with the production extension
          // supervisor's recovery allowance.
        }, options.startupTimeoutMs ?? TRACK_B_SIDECAR_STARTUP_TIMEOUT_MS);
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
