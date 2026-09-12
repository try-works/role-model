import { spawn } from "node:child_process";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
  verify as verifySignature,
} from "node:crypto";
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

import { DEFAULT_REPLAY_CANDIDATE_CAP } from "./track-b-replay-policy.js";

import { deriveRuntimeContributionOutcomeFromObservation } from "./contribution-outcome.js";
import { consumeTrackBProjection } from "./track-b-projections.js";

const RUN88_PI_PROOF_VALIDITY_MS = 90 * 60 * 1000;
// fixtures/source-authority/crowdsourced-evals-docs/guidance/capacity-slo-contracts.json
// localRuntime.inlineContentMaxBytes / boundary.inlinePayloadMaxBytes
const TRACK_B_INLINE_CONTENT_MAX_BYTES = 16_384;
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

/**
 * The one identity projection for a semantic evaluation criterion.  Replay
 * handoffs, persisted Evaluation Core cases, and the CLI must not each invent
 * their own JSON ordering rule for this digest.
 */
export function digestTrackBSemanticEvaluationCriteria(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(
      JSON.stringify(canonicalizeRun88Proof(normalizeTrackBSemanticEvaluationCriteria(value))),
    )
    .digest("hex")}`;
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
  "runTrackBSupervisedReplay",
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
      readonly contractRegistry?: {
        readonly schemaVersion?: string;
        readonly registryPath?: string;
        readonly schemaPath?: string;
        readonly registrySha256?: string;
        readonly schemaSha256?: string;
      };
      readonly runtimeChannel?: {
        readonly schema?: string;
        readonly contractPath?: string;
        readonly schemaPath?: string;
        readonly sourceMatrixPath?: string;
        readonly contractSha256?: string;
        readonly schemaSha256?: string;
        readonly sourceMatrixSha256?: string;
      };
      readonly capacitySlo?: {
        readonly schemaVersion?: string;
        readonly contractPath?: string;
        readonly schemaPath?: string;
        readonly contractSha256?: string;
        readonly schemaSha256?: string;
      };
    };
    readonly sidecar: { readonly modulePath: string; readonly artifactSha256: string };
    readonly sourceAuthorityFixtures?: readonly {
      readonly modulePath: string;
      readonly artifactSha256: string;
    }[];
    readonly publicRuntimeAdapter?: {
      readonly modulePath: string;
      readonly artifactSha256: string;
      readonly routerRoot: string;
      readonly routerAssets: readonly {
        readonly modulePath: string;
        readonly artifactSha256: string;
      }[];
    };
    readonly publicExtensionHost?: {
      readonly modulePath: string;
      readonly artifactSha256: string;
      readonly workerModulePath: string;
      readonly workerArtifactSha256: string;
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
  if (
    compatibilityGeneration === "N" &&
    (!manifest.publicExtensionHost?.modulePath ||
      !/^[a-f0-9]{64}$/i.test(manifest.publicExtensionHost.artifactSha256) ||
      !manifest.publicExtensionHost.workerModulePath ||
      !/^[a-f0-9]{64}$/i.test(manifest.publicExtensionHost.workerArtifactSha256))
  ) {
    throw new Error("Track B public extension host artifacts are incomplete");
  }
  const contractCandidates =
    compatibilityGeneration === "N"
      ? [
          {
            modulePath: manifest.registryBindings?.contractRegistry?.registryPath,
            artifactSha256: manifest.registryBindings?.contractRegistry?.registrySha256,
          },
          {
            modulePath: manifest.registryBindings?.contractRegistry?.schemaPath,
            artifactSha256: manifest.registryBindings?.contractRegistry?.schemaSha256,
          },
          {
            modulePath: manifest.registryBindings?.runtimeChannel?.contractPath,
            artifactSha256: manifest.registryBindings?.runtimeChannel?.contractSha256,
          },
          {
            modulePath: manifest.registryBindings?.runtimeChannel?.schemaPath,
            artifactSha256: manifest.registryBindings?.runtimeChannel?.schemaSha256,
          },
          {
            modulePath: manifest.registryBindings?.runtimeChannel?.sourceMatrixPath,
            artifactSha256: manifest.registryBindings?.runtimeChannel?.sourceMatrixSha256,
          },
          {
            modulePath: manifest.registryBindings?.capacitySlo?.contractPath,
            artifactSha256: manifest.registryBindings?.capacitySlo?.contractSha256,
          },
          {
            modulePath: manifest.registryBindings?.capacitySlo?.schemaPath,
            artifactSha256: manifest.registryBindings?.capacitySlo?.schemaSha256,
          },
        ].filter((file) => file.modulePath !== undefined || file.artifactSha256 !== undefined)
      : [];
  if (
    contractCandidates.some(
      (file) =>
        typeof file.modulePath !== "string" ||
        !file.modulePath ||
        !/^[a-f0-9]{64}$/i.test(file.artifactSha256 ?? ""),
    )
  ) {
    throw new Error("Track B runtime distribution contract bindings are incomplete");
  }
  const contractFiles = contractCandidates as Array<{
    readonly modulePath: string;
    readonly artifactSha256: string;
  }>;
  const files = [
    manifest.sidecar,
    ...(manifest.publicRuntimeAdapter
      ? [manifest.publicRuntimeAdapter, ...manifest.publicRuntimeAdapter.routerAssets]
      : []),
    ...(manifest.publicExtensionHost
      ? [
          manifest.publicExtensionHost,
          {
            modulePath: manifest.publicExtensionHost.workerModulePath,
            artifactSha256: manifest.publicExtensionHost.workerArtifactSha256,
          },
        ]
      : []),
    ...manifest.extensions,
    ...contractFiles,
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
  // shared/capacity loads the v2 contract next to the bundled sidecar so a
  // packaged runtime can boot without reaching back into the source checkout.
  // The v3 contract is manifest-bound; the v2 compatibility copy is staged
  // alongside it by the private distribution build.
  const capacityV2Source = path.join(options.sourceRoot, "capacity-slo-contracts.v2.json");
  if (existsSync(capacityV2Source)) {
    await copyFile(
      capacityV2Source,
      path.join(options.releaseDir, "capacity-slo-contracts.v2.json"),
    );
  }
  if (compatibilityGeneration === "N") {
    const graphRelative = manifest.registryBindings?.graphRegistry?.path;
    const graphSource = graphRelative ? path.join(options.sourceRoot, graphRelative) : null;
    if (!graphSource) {
      throw new Error("Track B runtime distribution graph registry path is missing");
    }
    const graphBytes = await readFile(graphSource);
    const graph = JSON.parse(graphBytes.toString("utf8")) as {
      readonly version?: number;
      readonly kinds?: readonly unknown[];
    };
    const graphDigest = createHash("sha256")
      .update(JSON.stringify({ version: graph.version, kinds: graph.kinds }))
      .digest("hex");
    if (graphDigest !== manifest.graphRegistry?.artifactSha256) {
      throw new Error("Track B runtime distribution graph registry integrity verification failed");
    }
    const graphDestination = path.join(
      options.releaseDir,
      "..",
      "..",
      "shared",
      "graph",
      "registry.json",
    );
    await mkdir(path.dirname(graphDestination), { recursive: true });
    await copyFile(graphSource, graphDestination);
    const extensionGraphDestination = path.join(
      options.releaseDir,
      "..",
      "shared",
      "graph",
      "registry.json",
    );
    await mkdir(path.dirname(extensionGraphDestination), { recursive: true });
    await copyFile(graphSource, extensionGraphDestination);
    // Optional N-generation bindings are staged exactly as declared.  An older
    // or narrower N-generation manifest that omits them must still stage, so the
    // staging contract stays compatible while every declared artifact remains
    // integrity-verified and fail-closed.
    const fixtures = manifest.sourceAuthorityFixtures;
    if (fixtures !== undefined) {
      if (!Array.isArray(fixtures) || fixtures.length === 0) {
        throw new Error("Track B runtime distribution source-authority fixtures are incomplete");
      }
      for (const fixture of fixtures) {
        if (
          typeof fixture.modulePath !== "string" ||
          !fixture.modulePath ||
          !/^[a-f0-9]{64}$/i.test(fixture.artifactSha256 ?? "")
        ) {
          throw new Error("Track B runtime distribution source-authority fixture is incomplete");
        }
        const fixtureSource = path.join(options.sourceRoot, fixture.modulePath);
        const fixtureDigest = createHash("sha256")
          .update(await readFile(fixtureSource))
          .digest("hex");
        if (fixtureDigest !== fixture.artifactSha256.toLowerCase()) {
          throw new Error("Track B runtime distribution source-authority fixture integrity failed");
        }
        const fixtureDestination = path.join(options.releaseDir, "..", "..", fixture.modulePath);
        await mkdir(path.dirname(fixtureDestination), { recursive: true });
        await copyFile(fixtureSource, fixtureDestination);
      }
    }
    const capacity = manifest.registryBindings?.capacitySlo;
    if (capacity) {
      if (
        !capacity.contractPath ||
        !capacity.schemaPath ||
        !capacity.contractSha256 ||
        !capacity.schemaSha256
      ) {
        throw new Error("Track B runtime distribution capacity bindings are incomplete");
      }
      for (const [sourceRelative, destinationName, expectedHash] of [
        [capacity.contractPath, path.basename(capacity.contractPath), capacity.contractSha256],
        [capacity.schemaPath, path.basename(capacity.schemaPath), capacity.schemaSha256],
      ] as const) {
        const source = path.join(options.sourceRoot, sourceRelative);
        const digest = createHash("sha256")
          .update(await readFile(source))
          .digest("hex");
        if (digest !== expectedHash?.toLowerCase()) {
          throw new Error("Track B runtime distribution capacity artifact integrity failed");
        }
        await copyFile(source, path.join(options.releaseDir, destinationName));
      }
    }
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

export interface ReplayIntentClaim {
  readonly jobId: string;
  readonly payload: Readonly<{ replayJobId: string; scope: string }>;
  readonly leaseId: string;
  readonly fence: number;
  readonly attempt: number;
  readonly deadlineAtMs: number | null;
}

export interface ReplayIntentScheduler {
  enqueue(
    input: Readonly<{ jobId: string; replayJobId: string; deadlineAtMs: number }>,
  ): Promise<{ accepted: boolean }>;
  claim(input?: Readonly<{ jobId: string }>): Promise<ReplayIntentClaim | null>;
  complete(
    input: Readonly<{
      jobId: string;
      leaseId: string;
      fence: number;
      result: Readonly<{ replayJobId: string; state: string }>;
    }>,
  ): Promise<{ completed: boolean }>;
  fail(
    input: Readonly<{ jobId: string; leaseId: string; fence: number }>,
  ): Promise<{ failed: boolean }>;
}

/**
 * Bridges reference-only scheduler intent records through authenticated runtime IPC.
 * The scheduler queues and fences work; provider dispatch stays in the router host.
 */
export function createReplayIntentScheduler(options: {
  readonly runtime: TrackBShadowPipelineRuntime;
  readonly requestId: string;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  readonly ownerId: string;
}): ReplayIntentScheduler {
  if (
    !options.requestId ||
    !options.channel ||
    !options.scope ||
    !options.ownerId ||
    !Number.isSafeInteger(options.authorizationEpoch)
  ) {
    throw new Error("authenticated replay scheduler identity is required");
  }
  const invoke = async (
    capability: string,
    value: Record<string, unknown>,
  ): Promise<Record<string, unknown>> =>
    options.runtime.invoke("background-evidence-scheduler", {
      requestId: `${options.requestId}:${capability}`,
      sessionId: options.requestId,
      protocolVersion: "1.1.0",
      channel: options.channel,
      scope: options.scope,
      authorizationEpoch: options.authorizationEpoch,
      ownerId: options.ownerId,
      capability,
      value,
    });
  return {
    async enqueue(input) {
      if (!input.jobId || !input.replayJobId || !Number.isSafeInteger(input.deadlineAtMs)) {
        throw new Error("bounded replay scheduler intent is required");
      }
      const result = await invoke("scheduler:enqueue-replay-intent", {
        jobId: input.jobId,
        replayJobId: input.replayJobId,
        scope: options.scope,
        deadlineAtMs: input.deadlineAtMs,
      });
      if (typeof result.accepted !== "boolean")
        throw new Error("replay scheduler enqueue receipt is invalid");
      return { accepted: result.accepted };
    },
    async claim(input) {
      if (input !== undefined && (!input.jobId || !input.jobId.trim())) {
        throw new Error("target replay scheduler intent is required");
      }
      const result = await invoke(
        "scheduler:claim-replay-intent",
        input === undefined ? {} : { jobId: input.jobId },
      );
      if (result === null) return null;
      const payload = result.payload;
      const fence = result.fence;
      const attempt = result.attempt;
      const deadlineAtMs = result.deadlineAtMs;
      if (
        !result.jobId ||
        !result.leaseId ||
        typeof fence !== "number" ||
        !Number.isSafeInteger(fence) ||
        typeof attempt !== "number" ||
        !Number.isSafeInteger(attempt) ||
        !payload ||
        typeof payload !== "object" ||
        Array.isArray(payload) ||
        (payload as Record<string, unknown>).scope !== options.scope ||
        typeof (payload as Record<string, unknown>).replayJobId !== "string" ||
        (deadlineAtMs !== null &&
          (typeof deadlineAtMs !== "number" || !Number.isSafeInteger(deadlineAtMs)))
      ) {
        throw new Error("replay scheduler claim receipt is invalid");
      }
      return {
        jobId: String(result.jobId),
        payload: {
          replayJobId: String((payload as Record<string, unknown>).replayJobId),
          scope: options.scope,
        },
        leaseId: String(result.leaseId),
        fence,
        attempt,
        deadlineAtMs: deadlineAtMs === null ? null : deadlineAtMs,
      };
    },
    async complete(input) {
      if (
        !input.jobId ||
        !input.leaseId ||
        !Number.isSafeInteger(input.fence) ||
        !input.result.replayJobId ||
        !input.result.state
      ) {
        throw new Error("fenced replay scheduler completion is required");
      }
      const result = await invoke("scheduler:complete-replay-intent", {
        jobId: input.jobId,
        leaseId: input.leaseId,
        fence: input.fence,
        result: {
          replayJobId: input.result.replayJobId,
          state: input.result.state,
        },
      });
      if (typeof result.completed !== "boolean")
        throw new Error("replay scheduler completion receipt is invalid");
      return { completed: result.completed };
    },
    async fail(input) {
      if (!input.jobId || !input.leaseId || !Number.isSafeInteger(input.fence)) {
        throw new Error("fenced replay scheduler failure is required");
      }
      const result = await invoke("scheduler:fail-replay-intent", {
        jobId: input.jobId,
        leaseId: input.leaseId,
        fence: input.fence,
        reason: "supervised replay did not complete",
      });
      if (typeof result.failed !== "boolean")
        throw new Error("replay scheduler failure receipt is invalid");
      return { failed: result.failed };
    },
  };
}

export interface RouterReplayAdapter {
  readonly protocolVersion: "role-model.router-replay-adapter.v1";
  readonly authenticated: true;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  authorize(input: {
    readonly envelope: Record<string, unknown>;
  }): Promise<RouterReplayAdapterAuthorization>;
  verifyAuthorization(input: {
    readonly envelope: Record<string, unknown>;
    readonly authorization: Record<string, unknown>;
  }): Promise<{ readonly verified: true } | { readonly verified: false }>;
  authorizeSandboxedTools(input: {
    readonly envelope: Record<string, unknown>;
    readonly sandbox: Record<string, unknown>;
  }): Promise<
    | { readonly authorized: true; readonly policyDigest: string }
    | { readonly authorized: false; readonly reason: string }
  >;
  dispatch(
    envelope: Record<string, unknown>,
    context?: RouterReplayAdapterDispatchContext,
  ): Promise<Record<string, unknown>>;
}

/**
 * Durable one-shot authorization nonce storage for replay adapters.  The
 * adapter calls `consume` while issuing authorization, so a nonce is burned
 * before any provider side effect and cannot be re-authorized after restart.
 */
export interface RouterReplayAuthorizationNonceStore {
  has(nonce: string): boolean | Promise<boolean>;
  consume(nonce: string): boolean | Promise<boolean>;
}

export interface RouterReplayAdapterDispatchContext {
  readonly authorization: RouterReplayAdapterAuthorization;
  readonly sandboxReceipt?: Readonly<Record<string, unknown>>;
}

export interface RouterReplayAdapterAuthorization {
  readonly schemaVersion: "role-model.replay-adapter-authorization.v1";
  readonly algorithm: "hmac-sha256" | "ed25519";
  readonly keyId: string;
  readonly nonce: string;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  readonly mac?: string;
  readonly signature?: string;
}

export interface RouterEvaluationJudgeAdapter {
  readonly protocolVersion: "role-model.router-evaluation-judge-adapter.v1";
  readonly authenticated: true;
  readonly channel: string;
  readonly scope: string;
  dispatch(envelope: Record<string, unknown>): Promise<Record<string, unknown>>;
}

function readBoundedReplayUsage(result: Record<string, unknown>): {
  readonly observedCostMicros: number;
  readonly observedResponseBytes: number;
} {
  const observedCostMicros = result.observedCostMicros;
  const observedResponseBytes = result.observedResponseBytes;
  if (
    typeof observedCostMicros !== "number" ||
    !Number.isSafeInteger(observedCostMicros) ||
    observedCostMicros < 0 ||
    typeof observedResponseBytes !== "number" ||
    !Number.isSafeInteger(observedResponseBytes) ||
    observedResponseBytes < 0
  ) {
    throw new Error("router replay dispatch receipt is missing bounded resource usage");
  }
  return { observedCostMicros, observedResponseBytes };
}

const replayCredentialKey =
  /(credential|api[_-]?key|secret|password|access[_-]?token|refresh[_-]?token)/i;

function containsReplayCredential(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsReplayCredential);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(
    ([key, nested]) => replayCredentialKey.test(key) || containsReplayCredential(nested),
  );
}

const REPLAY_ADAPTER_AUTHORIZATION_SCHEMA = "role-model.replay-adapter-authorization.v1" as const;
const REPLAY_TOOL_SIDE_EFFECT_RECEIPT_SCHEMA =
  "role-model.replay-tool-side-effect-receipt.v1" as const;
const replayAdapterAuthorizationNonces = new WeakMap<object, Set<string>>();
const REPLAY_AUTHORIZATION_NONCE_STORE_SCHEMA =
  "role-model.replay-authorization-nonce-store.v1" as const;

/** Build the bounded file-backed nonce store used by the public host adapter. */
export function createReplayAuthorizationNonceStore(
  filePath: string,
): RouterReplayAuthorizationNonceStore {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new Error("replay authorization nonce store path is required");
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
  let nonces: Set<string>;
  if (!existsSync(filePath)) {
    nonces = new Set<string>();
  } else {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      throw new Error("replay authorization nonce store is invalid");
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      (parsed as Record<string, unknown>).schemaVersion !==
        REPLAY_AUTHORIZATION_NONCE_STORE_SCHEMA ||
      !Array.isArray((parsed as Record<string, unknown>).nonces)
    ) {
      throw new Error("replay authorization nonce store is invalid");
    }
    const persisted = (parsed as Record<string, unknown>).nonces as unknown[];
    if (
      persisted.length > 8192 ||
      persisted.some((nonce) => typeof nonce !== "string" || !nonce || nonce.length > 256)
    ) {
      throw new Error("replay authorization nonce store exceeds its bounded cap");
    }
    nonces = new Set<string>(persisted as string[]);
  }

  const persist = (): void => {
    const payload = `${JSON.stringify({
      schemaVersion: REPLAY_AUTHORIZATION_NONCE_STORE_SCHEMA,
      nonces: [...nonces].sort(),
    })}\n`;
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, payload, { encoding: "utf8" });
    renameSync(temporaryPath, filePath);
  };

  return Object.freeze({
    has(nonce: string): boolean {
      return nonces.has(nonce);
    },
    consume(nonce: string): boolean {
      if (typeof nonce !== "string" || !nonce || nonce.length > 256) {
        throw new Error("replay authorization nonce is invalid");
      }
      if (nonces.has(nonce)) return false;
      if (nonces.size >= 8192) {
        throw new Error("replay authorization nonce store exceeds its bounded cap");
      }
      nonces.add(nonce);
      persist();
      return true;
    },
  });
}

function normalizeReplayAdapterText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 256 || /[\r\n]/.test(value)) {
    throw new Error(`replay adapter ${field} is invalid`);
  }
  return value.trim();
}

function normalizeReplayAdapterSecret(secret: string | Uint8Array): Buffer {
  const bytes = typeof secret === "string" ? Buffer.from(secret, "utf8") : Buffer.from(secret);
  if (bytes.length < 16 || bytes.length > 4096) {
    throw new Error("replay adapter authorization secret is invalid");
  }
  return bytes;
}

function replayAdapterAuthorizationPayload(input: {
  readonly keyId: string;
  readonly nonce: string;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
}) {
  return {
    schemaVersion: REPLAY_ADAPTER_AUTHORIZATION_SCHEMA,
    algorithm: "hmac-sha256" as const,
    keyId: input.keyId,
    nonce: input.nonce,
    channel: input.channel,
    scope: input.scope,
    authorizationEpoch: input.authorizationEpoch,
  };
}

function digestReplaySandbox(sandbox: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalizeRun88Proof(sandbox)))
    .digest("hex");
}

function digestReplaySandboxWire(sandbox: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(sandbox)).digest("hex");
}

function replaySandboxPolicyDigests(sandbox: Record<string, unknown>): readonly string[] {
  return [...new Set([digestReplaySandbox(sandbox), digestReplaySandboxWire(sandbox)])];
}

function normalizeReplaySandboxDigest(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (/^[a-f0-9]{64}$/.test(normalized)) return normalized;
  if (/^sha256:[a-f0-9]{64}$/.test(normalized)) return normalized.slice("sha256:".length);
  return null;
}

function assertReplaySandboxPolicy(candidate: Record<string, unknown>): void {
  if (candidate.toolPolicy !== "sandboxed_allowlist") return;
  const sandbox = candidate.sandbox;
  const sandboxRecord =
    sandbox && typeof sandbox === "object" && !Array.isArray(sandbox)
      ? (sandbox as Record<string, unknown>)
      : null;
  const executableAllowlist = sandboxRecord?.executableAllowlist;
  if (
    !sandboxRecord ||
    !Array.isArray(executableAllowlist) ||
    executableAllowlist.length === 0 ||
    executableAllowlist.length > 32 ||
    executableAllowlist.some(
      (value) => typeof value !== "string" || !value || value.length > 256,
    ) ||
    !["none", "read_only"].includes(String(sandboxRecord.sideEffectClass)) ||
    !["none", "allowlisted"].includes(String(sandboxRecord.network)) ||
    !["none", "workspace_read_only"].includes(String(sandboxRecord.filesystem)) ||
    !Number.isSafeInteger(sandboxRecord.maxBytes) ||
    Number(sandboxRecord.maxBytes) < 1 ||
    !Number.isSafeInteger(sandboxRecord.maxDurationMs) ||
    Number(sandboxRecord.maxDurationMs) < 1
  ) {
    throw new Error("sandboxed replay tool policy requires a bounded executable allowlist");
  }
  if (containsReplayCredential(sandbox)) {
    throw new Error("provider credential or secret is prohibited from replay sandbox policy");
  }
}

function assertReplayAdapterAuthorization(
  authorization: unknown,
  envelope: Record<string, unknown>,
): asserts authorization is RouterReplayAdapterAuthorization {
  const allowedKeys = new Set([
    "schemaVersion",
    "algorithm",
    "keyId",
    "nonce",
    "channel",
    "scope",
    "authorizationEpoch",
    "mac",
    "signature",
  ]);
  if (!authorization || typeof authorization !== "object" || Array.isArray(authorization)) {
    throw new Error("authenticated replay adapter authorization is invalid");
  }
  const value = authorization as Record<string, unknown>;
  const mac = value.mac;
  const signature = value.signature;
  if (
    Object.keys(value).some((key) => !allowedKeys.has(key)) ||
    value.schemaVersion !== REPLAY_ADAPTER_AUTHORIZATION_SCHEMA ||
    (value.algorithm !== "hmac-sha256" && value.algorithm !== "ed25519") ||
    typeof value.keyId !== "string" ||
    !value.keyId ||
    value.keyId.length > 256 ||
    typeof value.nonce !== "string" ||
    !value.nonce ||
    value.nonce.length > 256 ||
    value.nonce !== envelope.nonce ||
    value.channel !== envelope.channel ||
    value.scope !== envelope.scope ||
    value.authorizationEpoch !== envelope.authorizationEpoch ||
    (typeof value.mac !== "string" && typeof value.signature !== "string") ||
    (mac !== undefined && (typeof mac !== "string" || mac.length === 0 || mac.length > 1024)) ||
    (signature !== undefined &&
      (typeof signature !== "string" || signature.length === 0 || signature.length > 1024))
  ) {
    throw new Error("authenticated replay adapter authorization is invalid");
  }
}

function assertReplayAdapterEnvelopeBinding(
  envelope: Record<string, unknown>,
  channel: string,
  scope: string,
  authorizationEpoch: number,
): void {
  if (envelope.channel !== channel) throw new Error("replay adapter channel mismatch");
  if (envelope.scope !== scope) throw new Error("replay adapter scope mismatch");
  if (envelope.authorizationEpoch !== authorizationEpoch) {
    throw new Error("replay adapter authorization epoch mismatch");
  }
  normalizeReplayAdapterText(envelope.nonce, "authorization nonce");
}

function assertReplayToolSideEffectReceipt(
  candidate: Record<string, unknown>,
  receipt: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (candidate.toolPolicy !== "sandboxed_allowlist") return undefined;
  const sandbox = candidate.sandbox;
  if (!sandbox || typeof sandbox !== "object" || Array.isArray(sandbox)) {
    throw new Error("sandboxed replay requires a valid side-effect receipt");
  }
  const value = receipt.toolSideEffectReceipt;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("sandboxed replay requires a valid side-effect receipt");
  }
  const sideEffectReceipt = value as Record<string, unknown>;
  const sandboxRecord = sandbox as Record<string, unknown>;
  const suppliedPolicyDigest = normalizeReplaySandboxDigest(sideEffectReceipt.policyDigest);
  if (
    sideEffectReceipt.schemaVersion !== REPLAY_TOOL_SIDE_EFFECT_RECEIPT_SCHEMA ||
    suppliedPolicyDigest === null ||
    !replaySandboxPolicyDigests(sandboxRecord).includes(suppliedPolicyDigest) ||
    sideEffectReceipt.sideEffectClass !== sandboxRecord.sideEffectClass ||
    !["none", "read_only"].includes(String(sideEffectReceipt.sideEffectClass))
  ) {
    throw new Error("sandboxed replay requires a valid side-effect receipt");
  }
  return {
    schemaVersion: REPLAY_TOOL_SIDE_EFFECT_RECEIPT_SCHEMA,
    policyDigest: suppliedPolicyDigest,
    sideEffectClass: sideEffectReceipt.sideEffectClass,
  };
}

function assertReplayDispatchEnvelope(
  envelope: Record<string, unknown>,
  channel: string,
  scope: string,
): void {
  if (envelope.schemaVersion !== "role-model.replay-dispatch.v1")
    throw new Error("unsupported replay dispatch schema");
  if (envelope.channel !== channel) throw new Error("replay dispatch channel mismatch");
  if (envelope.scope !== scope) throw new Error("replay dispatch scope mismatch");
  const serializedEnvelope = JSON.stringify(envelope);
  if (Buffer.byteLength(serializedEnvelope, "utf8") > 1024 * 1024) {
    throw new Error("replay dispatch envelope exceeds the 1 MiB size limit");
  }
  const forbiddenPathKey =
    /^(?:path|cwd|workdir|working[-_]?directory|(?:caller|client|host|local|source|filesystem|workspace)[-_]?(?:file[-_]?path|path))$/i;
  const containsCallerFilesystemPath = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(containsCallerFilesystemPath);
    if (typeof value === "string") {
      return /^(?:[a-z]:[\\/]|\\\\|\/|file:\/\/)/i.test(value);
    }
    if (!value || typeof value !== "object") return false;
    return Object.entries(value as Record<string, unknown>).some(
      ([key, nested]) => forbiddenPathKey.test(key) || containsCallerFilesystemPath(nested),
    );
  };
  if (containsCallerFilesystemPath(envelope)) {
    throw new Error("caller filesystem paths are prohibited from replay IPC");
  }
  const capability = envelope.capability;
  if (
    capability !== undefined &&
    (typeof capability !== "string" || capability !== "replay:provider-dispatch")
  ) {
    throw new Error("replay dispatch capability is not allowlisted");
  }
  if (containsReplayCredential(envelope))
    throw new Error("provider credential or secret is prohibited from replay IPC");
  if (
    typeof envelope.replayJobId !== "string" ||
    !envelope.replayJobId ||
    typeof envelope.sourceDecisionId !== "string" ||
    !envelope.sourceDecisionId ||
    typeof envelope.normalizedRequestRef !== "string" ||
    !envelope.normalizedRequestRef ||
    typeof envelope.candidateEndpointId !== "string" ||
    !envelope.candidateEndpointId ||
    typeof envelope.dispatchIdempotencyKey !== "string" ||
    !/^[a-f0-9]{64}$/.test(envelope.dispatchIdempotencyKey) ||
    !Number.isSafeInteger(envelope.sourceGeneration)
  ) {
    throw new Error("complete bounded replay dispatch identity required");
  }
  const budget = envelope.budget;
  if (!budget || typeof budget !== "object" || Array.isArray(budget))
    throw new Error("bounded replay dispatch budget required");
  for (const key of [
    "maxCandidates",
    "maxProviderCalls",
    "maxCostMicros",
    "maxBytes",
    "deadlineMs",
  ] as const) {
    if (!Number.isSafeInteger((budget as Record<string, unknown>)[key]))
      throw new Error("bounded replay dispatch budget required");
  }
  if (
    envelope.toolPolicy !== "deny" &&
    envelope.toolPolicy !== "recorded_results_only" &&
    envelope.toolPolicy !== "sandboxed_allowlist"
  ) {
    throw new Error("unsupported replay tool policy");
  }
  const candidatePackage = envelope.candidatePackage;
  if (
    !candidatePackage ||
    typeof candidatePackage !== "object" ||
    Array.isArray(candidatePackage)
  ) {
    throw new Error("materialized replay candidate package required");
  }
  const candidate = candidatePackage as Record<string, unknown>;
  if (candidate.toolPolicy !== envelope.toolPolicy) {
    throw new Error("materialized replay candidate package tool policy is invalid");
  }
  if (
    candidate.endpointId !== envelope.candidateEndpointId ||
    typeof candidate.modelId !== "string" ||
    (candidate.reasoningEffort !== null && typeof candidate.reasoningEffort !== "string") ||
    typeof candidate.promptAdapterId !== "string" ||
    typeof candidate.experiencePackId !== "string" ||
    typeof candidate.samplingProfileId !== "string"
  ) {
    throw new Error("materialized replay candidate package is invalid");
  }
  assertReplaySandboxPolicy(candidate);
}

function assertEvaluationJudgeDispatchEnvelope(
  envelope: Record<string, unknown>,
  channel: string,
  scope: string,
): void {
  if (envelope.schemaVersion !== "role-model.evaluation-judge-dispatch.v1")
    throw new Error("unsupported evaluation judge dispatch schema");
  if (envelope.channel !== channel) throw new Error("evaluation judge dispatch channel mismatch");
  if (envelope.scope !== scope) throw new Error("evaluation judge dispatch scope mismatch");
  if (containsReplayCredential(envelope))
    throw new Error("provider credential or secret is prohibited from evaluation judge IPC");
  for (const key of ["evaluationJobId", "trialId", "outputRef", "judgeEndpointId"] as const) {
    if (typeof envelope[key] !== "string" || !envelope[key])
      throw new Error("complete evaluation judge dispatch identity required");
  }
  const scorer = envelope.scorer;
  if (!scorer || typeof scorer !== "object" || Array.isArray(scorer))
    throw new Error("evaluation judge scorer provenance is required");
  for (const key of ["id", "version", "digest", "dimension"] as const) {
    if (
      typeof (scorer as Record<string, unknown>)[key] !== "string" ||
      !(scorer as Record<string, unknown>)[key]
    )
      throw new Error("evaluation judge scorer provenance is required");
  }
}

/** The only Evaluation Runner → remote-judge provider boundary; credentials stay in the router host. */
export function createRouterEvaluationJudgeAdapter(options: {
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  readonly dispatch: (request: Record<string, unknown>) => Promise<Record<string, unknown>>;
}): RouterEvaluationJudgeAdapter {
  if (!options.channel || !options.scope || !Number.isSafeInteger(options.authorizationEpoch))
    throw new Error("router evaluation judge adapter identity is required");
  return Object.freeze({
    protocolVersion: "role-model.router-evaluation-judge-adapter.v1" as const,
    authenticated: true as const,
    channel: options.channel,
    scope: options.scope,
    async dispatch(envelope: Record<string, unknown>): Promise<Record<string, unknown>> {
      assertEvaluationJudgeDispatchEnvelope(envelope, options.channel, options.scope);
      const result = await options.dispatch({
        schemaVersion: "role-model.evaluation-judge-router-request.v1",
        source: "evaluation-runner-local",
        authorizationEpoch: options.authorizationEpoch,
        evaluationJobId: envelope.evaluationJobId,
        trialId: envelope.trialId,
        outputRef: envelope.outputRef,
        scorer: structuredClone(envelope.scorer),
        judgeEndpointId: envelope.judgeEndpointId,
      });
      if (
        !result ||
        typeof result.dispatchReceiptId !== "string" ||
        typeof result.routerDecisionId !== "string" ||
        typeof result.judgeResultRef !== "string" ||
        typeof result.score !== "number" ||
        !Number.isFinite(result.score) ||
        typeof result.confidence !== "number" ||
        !Number.isFinite(result.confidence) ||
        result.confidence < 0 ||
        result.confidence > 1
      )
        throw new Error("router evaluation judge receipt is incomplete");
      return {
        dispatchReceiptId: result.dispatchReceiptId,
        routerDecisionId: result.routerDecisionId,
        judgeResultRef: result.judgeResultRef,
        score: result.score,
        confidence: result.confidence,
      };
    },
  });
}

/**
 * Exposes the only replay-to-provider boundary. The callback is supplied by the
 * router host, where normal eligibility, policy, fallback, timeout, and provider
 * credential handling already live; extensions receive neither those credentials
 * nor a direct transport handle.
 */
export function requireReplayRouterDecisionId(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 512 || /[\r\n]/.test(value)) {
    throw new Error("replay provider execution is missing a normal router decision");
  }
  return value;
}

export function createRouterReplayAdapter(options: {
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  readonly authorizationSecret?: string | Uint8Array;
  readonly authorizationKeyId?: string;
  /** Optional durable owner for one-shot authorization nonces. */
  readonly authorizationNonceStore?: RouterReplayAuthorizationNonceStore;
  /** Convenience path for the built-in bounded file-backed nonce owner. */
  readonly authorizationNonceStorePath?: string;
  readonly authorize?: (input: {
    readonly envelope: Record<string, unknown>;
  }) => Promise<Record<string, unknown>>;
  readonly verifyAuthorization?: (input: {
    readonly envelope: Record<string, unknown>;
    readonly authorization: Record<string, unknown>;
  }) => Promise<boolean | { readonly verified: boolean }>;
  readonly authorizeSandboxedTools?: (input: {
    readonly envelope: Record<string, unknown>;
    readonly sandbox: Record<string, unknown>;
  }) => Promise<
    | true
    | { readonly authorized: boolean; readonly policyDigest?: string; readonly reason?: string }
  >;
  readonly dispatch: (request: Record<string, unknown>) => Promise<Record<string, unknown>>;
}): RouterReplayAdapter {
  if (!options.channel || !options.scope || !Number.isSafeInteger(options.authorizationEpoch)) {
    throw new Error("router replay adapter identity is required");
  }
  const authorizationSecret =
    options.authorizationSecret === undefined
      ? normalizeReplayAdapterSecret(randomBytes(32))
      : normalizeReplayAdapterSecret(options.authorizationSecret);
  const authorizationKeyId = normalizeReplayAdapterText(
    options.authorizationKeyId ?? "router-replay-adapter",
    "authorization key id",
  );
  if (options.authorizationNonceStore && options.authorizationNonceStorePath) {
    throw new Error("replay adapter nonce store options are mutually exclusive");
  }
  const authorizationNonceStore =
    options.authorizationNonceStore ??
    (options.authorizationNonceStorePath
      ? createReplayAuthorizationNonceStore(options.authorizationNonceStorePath)
      : undefined);
  if (
    authorizationNonceStore &&
    (typeof authorizationNonceStore.consume !== "function" ||
      typeof authorizationNonceStore.has !== "function")
  ) {
    throw new Error("replay adapter nonce store is invalid");
  }
  const consumedAuthorizationNonces = new Set<string>();
  // A durable nonce is consumed while issuing authorization. Keep only the
  // in-process pending handoff needed to permit the immediately following
  // dispatch; a restart intentionally cannot re-use that handoff.
  const pendingAuthorizationNonces = new Set<string>();

  const authorize = async (input: {
    readonly envelope: Record<string, unknown>;
  }): Promise<RouterReplayAdapterAuthorization> => {
    assertReplayAdapterEnvelopeBinding(
      input.envelope,
      options.channel,
      options.scope,
      options.authorizationEpoch,
    );
    const customAuthorization = options.authorize
      ? await options.authorize({ envelope: structuredClone(input.envelope) })
      : undefined;
    let authorization: RouterReplayAdapterAuthorization;
    if (customAuthorization !== undefined) {
      assertReplayAdapterAuthorization(customAuthorization, input.envelope);
      authorization = { ...customAuthorization };
    } else {
      const payload = replayAdapterAuthorizationPayload({
        keyId: authorizationKeyId,
        nonce: String(input.envelope.nonce),
        channel: options.channel,
        scope: options.scope,
        authorizationEpoch: options.authorizationEpoch,
      });
      const mac = createHmac("sha256", authorizationSecret)
        .update(JSON.stringify(canonicalizeRun88Proof(payload)))
        .digest("hex");
      authorization = { ...payload, mac };
      assertReplayAdapterAuthorization(authorization, input.envelope);
    }
    if (authorizationNonceStore) {
      if (!(await authorizationNonceStore.consume(authorization.nonce))) {
        throw new Error("replayed replay adapter authorization nonce");
      }
      pendingAuthorizationNonces.add(authorization.nonce);
    }
    return Object.freeze(authorization);
  };

  const verifyAuthorization = async (input: {
    readonly envelope: Record<string, unknown>;
    readonly authorization: Record<string, unknown>;
  }): Promise<{ readonly verified: true } | { readonly verified: false }> => {
    try {
      assertReplayAdapterEnvelopeBinding(
        input.envelope,
        options.channel,
        options.scope,
        options.authorizationEpoch,
      );
      assertReplayAdapterAuthorization(input.authorization, input.envelope);
      if (options.verifyAuthorization) {
        const result = await options.verifyAuthorization({
          envelope: structuredClone(input.envelope),
          authorization: structuredClone(input.authorization),
        });
        return result === true || (typeof result === "object" && result.verified === true)
          ? { verified: true }
          : { verified: false };
      }
      if (
        input.authorization.algorithm !== "hmac-sha256" ||
        typeof input.authorization.mac !== "string" ||
        !/^[a-f0-9]{64}$/.test(input.authorization.mac)
      ) {
        return { verified: false };
      }
      const payload = replayAdapterAuthorizationPayload({
        keyId: input.authorization.keyId,
        nonce: input.authorization.nonce,
        channel: input.authorization.channel,
        scope: input.authorization.scope,
        authorizationEpoch: input.authorization.authorizationEpoch,
      });
      const expectedMac = createHmac("sha256", authorizationSecret)
        .update(JSON.stringify(canonicalizeRun88Proof(payload)))
        .digest();
      const suppliedMac = Buffer.from(input.authorization.mac, "hex");
      return suppliedMac.length === expectedMac.length && timingSafeEqual(suppliedMac, expectedMac)
        ? { verified: true }
        : { verified: false };
    } catch {
      return { verified: false };
    }
  };

  const authorizeSandboxedTools = async (input: {
    readonly envelope: Record<string, unknown>;
    readonly sandbox: Record<string, unknown>;
  }): Promise<
    | { readonly authorized: true; readonly policyDigest: string }
    | { readonly authorized: false; readonly reason: string }
  > => {
    try {
      assertReplayDispatchEnvelope(input.envelope, options.channel, options.scope);
      assertReplayAdapterEnvelopeBinding(
        input.envelope,
        options.channel,
        options.scope,
        options.authorizationEpoch,
      );
      const candidate = input.envelope.candidatePackage as Record<string, unknown>;
      if (candidate.toolPolicy !== "sandboxed_allowlist") {
        return { authorized: false, reason: "sandboxed tool authorization is not required" };
      }
      assertReplaySandboxPolicy(candidate);
      const candidateSandbox = candidate.sandbox as Record<string, unknown>;
      const policyDigest = digestReplaySandbox(candidateSandbox);
      if (policyDigest !== digestReplaySandbox(input.sandbox)) {
        return { authorized: false, reason: "sandbox policy does not match candidate package" };
      }
      if (!options.authorizeSandboxedTools) {
        return { authorized: false, reason: "sandboxed replay authorization hook is unavailable" };
      }
      const result = await options.authorizeSandboxedTools({
        envelope: structuredClone(input.envelope),
        sandbox: structuredClone(input.sandbox),
      });
      if (result !== true && result.authorized !== true) {
        return {
          authorized: false,
          reason: result.reason ?? "sandbox authorization rejected",
        };
      }
      const acceptedPolicyDigests = new Set([
        ...replaySandboxPolicyDigests(candidateSandbox),
        ...replaySandboxPolicyDigests(input.sandbox),
      ]);
      const authorizedPolicyDigest =
        result === true ? policyDigest : normalizeReplaySandboxDigest(result.policyDigest);
      if (authorizedPolicyDigest === null || !acceptedPolicyDigests.has(authorizedPolicyDigest)) {
        return { authorized: false, reason: "sandbox policy digest mismatch" };
      }
      return { authorized: true, policyDigest: authorizedPolicyDigest };
    } catch (error) {
      return {
        authorized: false,
        reason: String(error instanceof Error ? error.message : error).slice(0, 256),
      };
    }
  };

  return Object.freeze({
    protocolVersion: "role-model.router-replay-adapter.v1" as const,
    authenticated: true as const,
    channel: options.channel,
    scope: options.scope,
    authorizationEpoch: options.authorizationEpoch,
    authorize,
    verifyAuthorization,
    authorizeSandboxedTools,
    async dispatch(
      envelope: Record<string, unknown>,
      context?: RouterReplayAdapterDispatchContext,
    ): Promise<Record<string, unknown>> {
      assertReplayDispatchEnvelope(envelope, options.channel, options.scope);
      if (
        envelope.authorizationEpoch !== undefined &&
        envelope.authorizationEpoch !== options.authorizationEpoch
      ) {
        throw new Error("replay adapter authorization epoch mismatch");
      }
      if (context === undefined) {
        throw new Error("replay adapter authorization is required");
      }
      assertReplayAdapterAuthorization(context.authorization, envelope);
      if (
        context.sandboxReceipt !== undefined &&
        (typeof context.sandboxReceipt !== "object" ||
          context.sandboxReceipt === null ||
          Array.isArray(context.sandboxReceipt))
      ) {
        throw new Error("replay adapter sandbox authorization receipt is invalid");
      }
      const verified = await verifyAuthorization({
        envelope: structuredClone(envelope),
        authorization: structuredClone(context.authorization) as unknown as Record<string, unknown>,
      });
      if (!verified.verified) {
        throw new Error("replay adapter authorization verification failed");
      }
      if (envelope.toolPolicy === "sandboxed_allowlist") {
        if (context.sandboxReceipt === undefined) {
          throw new Error("sandboxed replay requires a valid side-effect receipt");
        }
        assertReplayToolSideEffectReceipt(envelope.candidatePackage as Record<string, unknown>, {
          toolSideEffectReceipt: context.sandboxReceipt,
        });
      }
      if (authorizationNonceStore) {
        if (!pendingAuthorizationNonces.delete(context.authorization.nonce)) {
          throw new Error("replayed replay adapter authorization nonce");
        }
      } else {
        if (consumedAuthorizationNonces.has(context.authorization.nonce)) {
          throw new Error("replayed replay adapter authorization nonce");
        }
        consumedAuthorizationNonces.add(context.authorization.nonce);
      }
      const result = await options.dispatch({
        schemaVersion: "role-model.router-replay-router-request.v1",
        source: "replay-core",
        authorizationEpoch: options.authorizationEpoch,
        replayJobId: envelope.replayJobId,
        sourceGeneration: envelope.sourceGeneration,
        sourceDecisionId: envelope.sourceDecisionId,
        normalizedRequestRef: envelope.normalizedRequestRef,
        candidateEndpointId: envelope.candidateEndpointId,
        dispatchIdempotencyKey: envelope.dispatchIdempotencyKey,
        candidatePackage: structuredClone(envelope.candidatePackage),
        budget: structuredClone(envelope.budget),
        toolPolicy: envelope.toolPolicy,
        ...(envelope.nonce === undefined ? {} : { nonce: envelope.nonce }),
        ...(context === undefined
          ? {}
          : {
              authorization: structuredClone(context.authorization),
              ...(context.sandboxReceipt === undefined
                ? {}
                : { sandboxReceipt: structuredClone(context.sandboxReceipt) }),
            }),
      });
      if (
        !result ||
        typeof result.dispatchReceiptId !== "string" ||
        typeof result.routerDecisionId !== "string" ||
        typeof result.providerResultRef !== "string"
      ) {
        throw new Error("router replay dispatch receipt is incomplete");
      }
      if (containsReplayCredential(result)) {
        throw new Error("provider credential or secret is prohibited from replay receipts");
      }
      const usage = readBoundedReplayUsage(result);
      const toolSideEffectReceipt = assertReplayToolSideEffectReceipt(
        envelope.candidatePackage as Record<string, unknown>,
        result,
      );
      return {
        dispatchReceiptId: result.dispatchReceiptId,
        routerDecisionId: result.routerDecisionId,
        providerResultRef: result.providerResultRef,
        ...usage,
        ...(toolSideEffectReceipt === undefined ? {} : { toolSideEffectReceipt }),
      };
    },
  });
}

/**
 * Builds the only source-root value Replay Core may accept from the public host.
 * The graph receipt proves durable local availability; raw messages, responses, and
 * tool payloads intentionally never cross this control-plane boundary.
 */
function readReplayTraversalClosure(trace: Record<string, unknown>): {
  readonly rootOccurrenceId: string;
  readonly headOccurrenceId: string;
  readonly leafOccurrenceIds: readonly string[];
  readonly lastSequence: number;
  readonly traversalDigest: string;
  readonly sourceRootOccurrenceId: string;
  readonly sourceHeadOccurrenceId: string;
  readonly sourceLeafOccurrenceIds: readonly string[];
  readonly sourceLastSequence: number;
  readonly sourceTraversalDigest: string;
} {
  const nested =
    trace.traversal && typeof trace.traversal === "object" && !Array.isArray(trace.traversal)
      ? (trace.traversal as Record<string, unknown>)
      : null;
  const read = (keys: readonly string[]): unknown => {
    const values = [
      ...keys.filter((key) => trace[key] !== undefined).map((key) => trace[key]),
      ...(nested === null
        ? []
        : keys.filter((key) => nested[key] !== undefined).map((key) => nested[key])),
    ];
    if (
      values.length > 1 &&
      values.some((value) => JSON.stringify(value) !== JSON.stringify(values[0]))
    ) {
      throw new Error("replay source traversal closure is mismatched");
    }
    return values[0];
  };
  const rootOccurrenceId = read(["rootOccurrenceId", "sourceRootOccurrenceId"]);
  const headOccurrenceId = read(["headOccurrenceId", "sourceHeadOccurrenceId"]);
  const leafOccurrenceIds = read(["leafOccurrenceIds", "sourceLeafOccurrenceIds"]);
  const lastSequence = read(["lastSequence", "sourceLastSequence"]);
  const traversalDigest = read(["traversalDigest", "sourceTraversalDigest", "digest"]);
  if (
    typeof rootOccurrenceId !== "string" ||
    !rootOccurrenceId.trim() ||
    rootOccurrenceId.length > 512 ||
    typeof headOccurrenceId !== "string" ||
    !headOccurrenceId.trim() ||
    headOccurrenceId.length > 512 ||
    !Array.isArray(leafOccurrenceIds) ||
    leafOccurrenceIds.length === 0 ||
    leafOccurrenceIds.length > 1_000 ||
    leafOccurrenceIds.some(
      (value) => typeof value !== "string" || !value.trim() || value.length > 512,
    ) ||
    new Set(leafOccurrenceIds).size !== leafOccurrenceIds.length ||
    typeof lastSequence !== "number" ||
    !Number.isSafeInteger(lastSequence) ||
    lastSequence < 0 ||
    typeof traversalDigest !== "string" ||
    !/^sha256:[a-f0-9]{64}$/.test(traversalDigest) ||
    !leafOccurrenceIds.includes(headOccurrenceId)
  ) {
    throw new Error("complete replay source traversal closure is required");
  }
  return {
    rootOccurrenceId,
    headOccurrenceId,
    leafOccurrenceIds: [...leafOccurrenceIds],
    lastSequence,
    traversalDigest,
    sourceRootOccurrenceId: rootOccurrenceId,
    sourceHeadOccurrenceId: headOccurrenceId,
    sourceLeafOccurrenceIds: [...leafOccurrenceIds],
    sourceLastSequence: lastSequence,
    sourceTraversalDigest: traversalDigest,
  };
}

function assertReplayBranchTraversalBinding(
  request: Record<string, unknown>,
  traversal: ReturnType<typeof readReplayTraversalClosure>,
): Record<string, unknown> {
  const expected = {
    sourceRootOccurrenceId: traversal.sourceRootOccurrenceId,
    sourceHeadOccurrenceId: traversal.sourceHeadOccurrenceId,
    sourceLeafOccurrenceIds: traversal.sourceLeafOccurrenceIds,
    sourceLastSequence: traversal.sourceLastSequence,
    sourceTraversalDigest: traversal.sourceTraversalDigest,
  } as const;
  for (const [field, expectedValue] of Object.entries(expected)) {
    const suppliedValue = request[field];
    if (
      suppliedValue !== undefined &&
      JSON.stringify(suppliedValue) !== JSON.stringify(expectedValue)
    ) {
      throw new Error("replay branch traversal binding mismatch");
    }
  }
  return { ...request, ...expected };
}

export function createReplaySourceAttestation(input: {
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  readonly capture: Readonly<Record<string, unknown>>;
  readonly normalizedRequestRef?: string;
  readonly sharedPrefixRef?: string;
  readonly forkOccurrenceId?: string;
  readonly policySnapshotRef?: string;
  readonly capturePolicyRef?: string;
  readonly eligibleEndpointIds: readonly string[];
}): Readonly<Record<string, unknown>> {
  if (!input.channel || !input.scope || !Number.isSafeInteger(input.authorizationEpoch)) {
    throw new Error("replay source attestation identity is required");
  }
  const capture = input.capture;
  const trace = capture.trace;
  const replaySource =
    capture.replaySource &&
    typeof capture.replaySource === "object" &&
    !Array.isArray(capture.replaySource)
      ? (capture.replaySource as Record<string, unknown>)
      : null;
  const normalizedRequestRef = input.normalizedRequestRef ?? replaySource?.normalizedRequestRef;
  const sharedPrefixRef = input.sharedPrefixRef ?? replaySource?.sharedPrefixRef;
  const forkOccurrenceId = input.forkOccurrenceId ?? replaySource?.forkOccurrenceId;
  const policySnapshotRef = input.policySnapshotRef ?? replaySource?.policySnapshotRef;
  const capturePolicyRef = input.capturePolicyRef ?? replaySource?.capturePolicyRef;
  const traversal =
    trace && typeof trace === "object" && !Array.isArray(trace)
      ? readReplayTraversalClosure(trace as Record<string, unknown>)
      : null;
  const capturedEligibleEndpointIds = Array.isArray(replaySource?.eligibleEndpointIds)
    ? [
        ...new Set(
          replaySource.eligibleEndpointIds.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0,
          ),
        ),
      ].sort()
    : null;
  // Name every missing input so an operator can repair the capture or the caller
  // instead of guessing which durable receipt is incomplete.
  const missingReceiptInputs: string[] = [];
  const captureEndpointId = typeof capture.endpointId === "string" ? capture.endpointId : "";
  // A durable capture may be read as v1 (no inline graph trace) or v2 (traced); both
  // are replayable because the requirement is durability, not trace richness.
  if (
    capture.schemaVersion !== "role-model.route-capture-read.v1" &&
    capture.schemaVersion !== "role-model.route-capture-read.v2"
  ) {
    missingReceiptInputs.push(`capture schema ${String(capture.schemaVersion)}`);
  }
  if (capture.scope !== input.scope) missingReceiptInputs.push("capture scope");
  if (typeof capture.rootArtifactId !== "string" || !capture.rootArtifactId) {
    missingReceiptInputs.push("root artifact");
  }
  if (typeof capture.routingDecisionId !== "string" || !capture.routingDecisionId) {
    missingReceiptInputs.push("routing decision");
  }
  if (!captureEndpointId) {
    missingReceiptInputs.push("selected endpoint");
  }
  if (trace !== undefined && (typeof trace !== "object" || Array.isArray(trace))) {
    missingReceiptInputs.push("trace");
  } else if (trace !== undefined) {
    if (!Number.isSafeInteger((trace as Record<string, unknown>).generation)) {
      missingReceiptInputs.push("trace generation");
    }
  }
  if (trace !== undefined && traversal === null) missingReceiptInputs.push("canonical traversal");
  if (
    replaySource !== null &&
    replaySource.schemaVersion !== "role-model.route-capture-replay-source.v1"
  ) {
    missingReceiptInputs.push("replay source schema");
  }
  if (typeof normalizedRequestRef !== "string" || !normalizedRequestRef) {
    missingReceiptInputs.push("normalized request reference");
  }
  if (typeof sharedPrefixRef !== "string" || !sharedPrefixRef) {
    missingReceiptInputs.push("shared prefix reference");
  }
  if (typeof forkOccurrenceId !== "string" || !forkOccurrenceId) {
    missingReceiptInputs.push("fork occurrence");
  }
  if (typeof policySnapshotRef !== "string" || !policySnapshotRef) {
    missingReceiptInputs.push("policy snapshot reference");
  }
  if (typeof capturePolicyRef !== "string" || !capturePolicyRef) {
    missingReceiptInputs.push("capture policy reference");
  }
  if (input.eligibleEndpointIds.length === 0) {
    missingReceiptInputs.push("effective eligible endpoints");
  } else if (!input.eligibleEndpointIds.includes(captureEndpointId)) {
    missingReceiptInputs.push("source endpoint in effective eligible set");
  }
  if (missingReceiptInputs.length > 0) {
    throw new Error(
      `complete durable replay source receipt is required: ${missingReceiptInputs.join(", ")}`,
    );
  }
  const traceRecord =
    trace && typeof trace === "object" && !Array.isArray(trace)
      ? (trace as Record<string, unknown>)
      : null;
  const untracedOccurrenceId =
    typeof capture.rootOccurrenceId === "string" && capture.rootOccurrenceId
      ? capture.rootOccurrenceId
      : typeof capture.rootArtifactId === "string"
        ? capture.rootArtifactId
        : "";
  const traversalFields = traversal
    ? {
        rootOccurrenceId: traversal.rootOccurrenceId,
        headOccurrenceId: traversal.headOccurrenceId,
        leafOccurrenceIds: traversal.leafOccurrenceIds,
        lastSequence: traversal.lastSequence,
        traversalDigest: traversal.traversalDigest,
        sourceRootOccurrenceId: traversal.sourceRootOccurrenceId,
        sourceHeadOccurrenceId: traversal.sourceHeadOccurrenceId,
        sourceLeafOccurrenceIds: traversal.sourceLeafOccurrenceIds,
        sourceLastSequence: traversal.sourceLastSequence,
        sourceTraversalDigest: traversal.sourceTraversalDigest,
      }
    : {
        rootOccurrenceId: untracedOccurrenceId,
        headOccurrenceId: untracedOccurrenceId,
        leafOccurrenceIds: [untracedOccurrenceId],
        lastSequence: 0,
        traversalDigest: "unavailable",
        sourceRootOccurrenceId: untracedOccurrenceId,
        sourceHeadOccurrenceId: untracedOccurrenceId,
        sourceLeafOccurrenceIds: [untracedOccurrenceId],
        sourceLastSequence: 0,
        sourceTraversalDigest: "unavailable",
      };
  const eligibleEndpointIds = [...new Set(input.eligibleEndpointIds)].sort();
  return Object.freeze({
    schemaVersion: "role-model.replay-source-attestation.v1",
    channel: input.channel,
    scope: input.scope,
    authorizationEpoch: input.authorizationEpoch,
    traceRoot: Object.freeze({
      traceRootId: capture.rootArtifactId,
      scope: input.scope,
      generation: typeof traceRecord?.generation === "number" ? traceRecord.generation : 0,
      readiness: traceRecord ? traceRecord.readiness : "unavailable",
      retentionState: "available",
      ...traversalFields,
      sharedPrefixRef,
      normalizedRequestRef,
      sourceDecisionId: capture.routingDecisionId,
      forkOccurrenceId,
      policySnapshotRef,
      capturePolicyRef,
      eligibleEndpointIds,
      // The frozen decision snapshot is provenance, not a filter: the effective set
      // above may be wider than what the source decision recorded.
      ...(capturedEligibleEndpointIds !== null ? { capturedEligibleEndpointIds } : {}),
      selectedEndpointId: capture.endpointId,
    }),
  });
}

export interface SupervisedReplayRuntime {
  invoke(id: string, envelope: Record<string, unknown>): Promise<Record<string, unknown>>;
}

function classifyReplayDispatchFailure(error: unknown): {
  readonly code:
    | "connection"
    | "provider_unavailable"
    | "provider_5xx"
    | "rate_limit"
    | "timeout"
    | "partial_response"
    | "router_dispatch_error";
  readonly message: string;
  readonly retryable: boolean;
} {
  const value = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const upstreamCode = typeof value.code === "string" ? value.code : "";
  const knownCode = new Set([
    "connection",
    "provider_unavailable",
    "provider_5xx",
    "rate_limit",
    "timeout",
    "partial_response",
  ]);
  const code = knownCode.has(upstreamCode)
    ? (upstreamCode as
        | "connection"
        | "provider_unavailable"
        | "provider_5xx"
        | "rate_limit"
        | "timeout"
        | "partial_response")
    : "router_dispatch_error";
  return {
    code,
    message: error instanceof Error ? error.message.slice(0, 256) : "router dispatch failed",
    // A provider could have committed an observable partial result. Retrying it as a
    // fresh provider call would violate Replay Core's duplicate-call fence.
    retryable: code !== "partial_response",
  };
}

/**
 * Produces the shadow-pipeline identity for one durable replay job.  A source
 * request may be replayed again under a new idempotency key, so source-request
 * identity alone is not a safe Evaluation Core comparison-group namespace.
 */
/**
 * Run 97 replay dispatch transcript.
 *
 * Durable captures store tool linkage in the graph's normalised camelCase shape
 * (`toolCalls`, `toolCallId`) while provider requests require the wire shape
 * (`tool_calls`, `tool_call_id`). Replaying a tool-bearing capture without this
 * mapping sends `role: "tool"` messages without their call identity and the
 * provider rejects the whole request with `messages[N]: missing field
 * tool_call_id`, which is why tool-using captures could not be replayed at all.
 * Requirement R1/R2: every capture, including tool-bearing ones, is replayable and
 * recorded tool results are reused rather than re-executed.
 */
export function buildReplayDispatchMessages(
  sourceMessages: readonly unknown[],
): Record<string, unknown>[] {
  const messages: Record<string, unknown>[] = [];
  for (const raw of sourceMessages) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const message = raw as Record<string, unknown>;
    const role = typeof message.role === "string" && message.role ? message.role : "user";
    const record: Record<string, unknown> = { role, content: message.content ?? null };
    const toolCallId =
      typeof message.toolCallId === "string" && message.toolCallId
        ? message.toolCallId
        : typeof message.tool_call_id === "string" && message.tool_call_id
          ? message.tool_call_id
          : null;
    if (toolCallId) record.tool_call_id = toolCallId;
    const rawCalls = Array.isArray(message.toolCalls)
      ? message.toolCalls
      : Array.isArray(message.tool_calls)
        ? message.tool_calls
        : [];
    const toolCalls: Record<string, unknown>[] = [];
    for (const rawCall of rawCalls) {
      if (!rawCall || typeof rawCall !== "object" || Array.isArray(rawCall)) continue;
      const call = rawCall as Record<string, unknown>;
      const fn =
        call.function && typeof call.function === "object" && !Array.isArray(call.function)
          ? (call.function as Record<string, unknown>)
          : null;
      const id = typeof call.id === "string" ? call.id : "";
      const name = typeof fn?.name === "string" ? fn.name : "";
      if (!id || !name) continue;
      toolCalls.push({
        id,
        type: "function",
        function: {
          name,
          arguments:
            typeof fn?.arguments === "string"
              ? fn.arguments
              : typeof call.arguments === "string"
                ? call.arguments
                : "{}",
        },
      });
    }
    if (toolCalls.length > 0) record.tool_calls = toolCalls;
    if (typeof message.name === "string" && message.name) record.name = message.name;
    messages.push(record);
  }
  return messages;
}

export function createSupervisedReplayEvaluationRequestId(
  sourceRequestId: string,
  replayJobId: string,
): string {
  if (!sourceRequestId || !replayJobId) {
    throw new Error("supervised replay evaluation identity is required");
  }
  return `supervised-replay:${createHash("sha256")
    .update(`${sourceRequestId}\u0000${replayJobId}`, "utf8")
    .digest("hex")}`;
}

/**
 * Validates the provider route capture recovered during evaluation.  Its root
 * is deliberately different from the later appended replay-branch root: the
 * provider receipt is written before the graph branch append.  Both references
 * remain durable, but they are different receipts and must not be equated.
 */
export function validateRecoveredReplayCapture(input: {
  readonly scope: string;
  readonly candidate: Readonly<{ endpointId: string; modelId: string }>;
  readonly dispatchReceipt: Readonly<{ routerDecisionId?: unknown; branchRootRef?: unknown }>;
  readonly capture: Readonly<Record<string, unknown>>;
}): void {
  if (
    typeof input.dispatchReceipt.branchRootRef !== "string" ||
    !input.dispatchReceipt.branchRootRef ||
    typeof input.capture.rootArtifactId !== "string" ||
    !input.capture.rootArtifactId ||
    input.capture.scope !== input.scope ||
    input.capture.endpointId !== input.candidate.endpointId ||
    input.capture.modelId !== input.candidate.modelId ||
    input.capture.routingDecisionId !== input.dispatchReceipt.routerDecisionId
  ) {
    throw new Error(
      "durable replay evaluation recovered capture does not match its fenced replay receipt",
    );
  }
}

/**
 * Executes the control-plane half of a bounded replay. The public host owns the
 * source transcript, router credentials, provider dispatch, and branch writer;
 * Replay Core receives only references, candidate identity, budgets, and durable
 * receipts. This deliberately makes a restart after provider completion resume at
 * branch append rather than repeat a paid provider call.
 */
export async function runSupervisedReplay(input: {
  readonly runtime: SupervisedReplayRuntime;
  readonly adapter: RouterReplayAdapter;
  readonly requestId: string;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  readonly sourceAttestation: Readonly<Record<string, unknown>>;
  readonly idempotencyKey: string;
  readonly intent: string;
  /** Digest of the normalized semantic criteria used for durable evaluation. */
  readonly evaluationCriteriaDigest: string;
  readonly candidatePackages: readonly Record<string, unknown>[];
  readonly budget: Readonly<Record<string, unknown>>;
  readonly leaseOwner: string;
  readonly leaseMs: number;
  readonly scheduler?: ReplayIntentScheduler;
  /** Creates the immutable replay branch root before a paid provider dispatch. */
  readonly prepareBranch: (request: Readonly<Record<string, unknown>>) => Promise<{
    readonly branchRootRef: string;
  }>;
  readonly appendBranch: (request: Readonly<Record<string, unknown>>) => Promise<{
    readonly branchRootRef: string;
  }>;
  readonly handoffEvaluation: (request: Readonly<Record<string, unknown>>) => Promise<{
    readonly evaluationJobId: string;
  }>;
  /**
   * Runs the separately durable evaluator only after Replay Core has accepted
   * its handoff receipt.  The callback returns references/digests, never model
   * output, so the replay journal can close without importing business text.
   */
  readonly completeEvaluation?: (
    request: Readonly<Record<string, unknown>>,
  ) => Promise<Readonly<Record<string, unknown>>>;
}): Promise<Record<string, unknown>> {
  if (!input.requestId || !input.idempotencyKey || !input.intent || !input.leaseOwner) {
    throw new Error("supervised replay identity is required");
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(input.evaluationCriteriaDigest)) {
    throw new Error("supervised replay requires a semantic evaluation criteria digest");
  }
  if (!Number.isSafeInteger(input.authorizationEpoch) || !Number.isSafeInteger(input.leaseMs)) {
    throw new Error("supervised replay authorization and lease are required");
  }
  if (
    input.adapter.channel !== input.channel ||
    input.adapter.scope !== input.scope ||
    input.sourceAttestation.schemaVersion !== "role-model.replay-source-attestation.v1" ||
    input.sourceAttestation.channel !== input.channel ||
    input.sourceAttestation.scope !== input.scope ||
    input.sourceAttestation.authorizationEpoch !== input.authorizationEpoch ||
    !Array.isArray(input.candidatePackages) ||
    input.candidatePackages.length === 0 ||
    typeof input.prepareBranch !== "function" ||
    containsReplayCredential(input.sourceAttestation) ||
    containsReplayCredential(input.candidatePackages)
  ) {
    throw new Error("supervised replay authorization or source attestation is invalid");
  }
  const controlEnvelope = (capability: string, value: Record<string, unknown>) => ({
    requestId: `${input.requestId}:${capability}`,
    sessionId: input.requestId,
    protocolVersion: "1.1.0",
    channel: input.channel,
    scope: input.scope,
    authorizationEpoch: input.authorizationEpoch,
    capability,
    value,
  });
  const sourceRoot = input.sourceAttestation.traceRoot as Record<string, unknown>;
  if (!sourceRoot || typeof sourceRoot !== "object" || Array.isArray(sourceRoot)) {
    throw new Error("supervised replay source root is invalid");
  }
  const traversal = readReplayTraversalClosure(sourceRoot);
  const selectedSourceEndpointId = sourceRoot.selectedEndpointId;
  if (typeof selectedSourceEndpointId !== "string" || !selectedSourceEndpointId) {
    throw new Error("supervised replay source endpoint is invalid");
  }
  if (
    input.candidatePackages.some((candidate) => candidate.endpointId === selectedSourceEndpointId)
  ) {
    throw new Error(
      "supervised replay requires a counterfactual distinct from the source endpoint",
    );
  }
  const assertTerminalEvaluationReceipt = (value: unknown, expectedJobId: string): void => {
    const receipt = value as Record<string, unknown> | null;
    if (
      !receipt ||
      typeof receipt !== "object" ||
      Array.isArray(receipt) ||
      receipt.evaluationJobId !== expectedJobId ||
      typeof receipt.comparisonGroupId !== "string" ||
      !receipt.comparisonGroupId ||
      typeof receipt.comparisonDigest !== "string" ||
      !receipt.comparisonDigest ||
      !new Set([
        "candidate",
        "source",
        "tie",
        "rejected",
        "incomplete",
        "insufficient",
        "disagreement",
      ]).has(String(receipt.outcome))
    ) {
      throw new Error("completed replay is missing a valid durable evaluation result");
    }
  };
  const created = await input.runtime.invoke(
    "replay-core",
    controlEnvelope("replay:create-job", {
      idempotencyKey: input.idempotencyKey,
      intent: input.intent,
      traceRootId: sourceRoot.traceRootId,
      scope: input.scope,
      candidatePackages: structuredClone(input.candidatePackages),
      budget: structuredClone(input.budget),
      evaluationCriteriaDigest: input.evaluationCriteriaDigest,
      sourceAttestation: structuredClone(input.sourceAttestation),
    }),
  );
  const jobId = typeof created.jobId === "string" ? created.jobId : null;
  if (!jobId) throw new Error("Replay Core did not return a durable replay job ID");
  // `awaiting_evaluation` is already a durable terminal result for the replay
  // dispatch pipeline. Reclaiming it can duplicate scheduler work (and, after a
  // restart, a provider call) before Evaluation Core completes its separate job.
  if (created.state === "complete") {
    if (typeof created.evaluationJobId !== "string" || !created.evaluationJobId) {
      throw new Error("completed replay is missing its durable evaluation receipt");
    }
    assertTerminalEvaluationReceipt(created.evaluationResult, created.evaluationJobId);
    return structuredClone(created);
  }
  if (created.state === "awaiting_evaluation") {
    if (typeof created.evaluationJobId !== "string" || !created.evaluationJobId) {
      throw new Error("awaiting replay is missing its durable evaluation receipt");
    }
    if (!input.completeEvaluation) return structuredClone(created);
    const lease = await input.runtime.invoke(
      "replay-core",
      controlEnvelope("replay:claim-job", {
        jobId,
        leaseOwner: input.leaseOwner,
        leaseMs: input.leaseMs,
      }),
    );
    if (!Number.isSafeInteger(lease.fenceToken)) {
      throw new Error("Replay Core did not return a fenced lease for evaluation recovery");
    }
    const evaluation = await input.completeEvaluation({
      replayJobId: jobId,
      evaluationJobId: created.evaluationJobId,
      scope: input.scope,
      sourceDecisionId: sourceRoot.sourceDecisionId,
      sourceGeneration: sourceRoot.generation,
      resultTraceIds: Array.isArray(created.resultTraceIds)
        ? structuredClone(created.resultTraceIds)
        : [],
      resultBranches: Array.isArray(created.branches) ? structuredClone(created.branches) : [],
      candidates: structuredClone(input.candidatePackages),
      replayJob: structuredClone(created),
      recovery: true,
    });
    const finalized = await input.runtime.invoke(
      "replay-core",
      controlEnvelope("replay:record-evaluation-result", {
        jobId,
        leaseOwner: input.leaseOwner,
        fenceToken: lease.fenceToken,
        evaluation,
      }),
    );
    if (input.scheduler) {
      const schedulerClaim = await input.scheduler.claim({ jobId: `replay-intent:${jobId}` });
      if (schedulerClaim) {
        const receipt = await input.scheduler.complete({
          jobId: schedulerClaim.jobId,
          leaseId: schedulerClaim.leaseId,
          fence: schedulerClaim.fence,
          result: { replayJobId: jobId, state: "complete" },
        });
        if (!receipt?.completed) return { ...finalized, schedulerState: "completion_not_accepted" };
      }
    }
    return finalized;
  }
  let schedulerClaim: ReplayIntentClaim | null = null;
  const resultTraceIds: string[] = [];
  const resultBranches: { candidateEndpointId: string; branchRootRef: string }[] = [];
  const providerFailures: Array<{
    readonly candidateEndpointId: string;
    readonly failure: ReturnType<typeof classifyReplayDispatchFailure>;
    readonly receipt: Readonly<Record<string, unknown>>;
    readonly branchRootRef: string;
  }> = [];
  let lastRetryableProviderError: unknown = null;
  const consumedNonces =
    replayAdapterAuthorizationNonces.get(input.adapter as object) ?? new Set<string>();
  replayAdapterAuthorizationNonces.set(input.adapter as object, consumedNonces);
  if (input.scheduler) {
    const deadlineMs = input.budget.deadlineMs;
    if (typeof deadlineMs !== "number" || !Number.isSafeInteger(deadlineMs) || deadlineMs < 1) {
      throw new Error("supervised replay requires a bounded scheduler deadline");
    }
    const createdAtMs =
      typeof created.createdAtMs === "number" && Number.isSafeInteger(created.createdAtMs)
        ? created.createdAtMs
        : Date.now();
    await input.scheduler.enqueue({
      jobId: `replay-intent:${jobId}`,
      replayJobId: jobId,
      deadlineAtMs: createdAtMs + deadlineMs,
    });
    schedulerClaim = await input.scheduler.claim({ jobId: `replay-intent:${jobId}` });
    if (schedulerClaim === null) return { jobId, state: "queued", schedulerState: "deferred" };
    if (
      schedulerClaim.payload.replayJobId !== jobId ||
      schedulerClaim.payload.scope !== input.scope
    ) {
      throw new Error("scheduler replay intent does not match the supervised job");
    }
  }
  try {
    const lease = await input.runtime.invoke(
      "replay-core",
      controlEnvelope("replay:claim-job", {
        jobId,
        leaseOwner: input.leaseOwner,
        leaseMs: input.leaseMs,
      }),
    );
    if (!Number.isSafeInteger(lease.fenceToken))
      throw new Error("Replay Core did not return a fenced lease");
    const finalizeProviderFailure = async (failureInput: {
      readonly candidateEndpointId: string;
      readonly failure: ReturnType<typeof classifyReplayDispatchFailure>;
      readonly preparedBranchRootRef: string;
    }): Promise<{
      readonly failureReceipt: Record<string, unknown>;
      readonly branchRootRef: string;
    }> => {
      const preparedFailure = await input.runtime.invoke(
        "replay-core",
        controlEnvelope("replay:prepare-provider-failure", {
          jobId,
          candidateEndpointId: failureInput.candidateEndpointId,
          leaseOwner: input.leaseOwner,
          fenceToken: lease.fenceToken,
          failure: failureInput.failure,
        }),
      );
      if (preparedFailure.status === "retryable_failure" || preparedFailure.status === "failed") {
        if (
          typeof preparedFailure.failureBranchRootRef !== "string" ||
          !preparedFailure.failureBranchRootRef
        ) {
          throw new Error("durable provider failure receipt is missing its branch");
        }
        return {
          failureReceipt: structuredClone(preparedFailure),
          branchRootRef: preparedFailure.failureBranchRootRef,
        };
      }
      if (
        preparedFailure.status !== "failure_append_pending" ||
        !preparedFailure.branchRequest ||
        typeof preparedFailure.branchRequest !== "object" ||
        Array.isArray(preparedFailure.branchRequest)
      ) {
        throw new Error("Replay Core did not prepare a durable provider failure branch");
      }
      const failureBranch = await input.appendBranch({
        ...(preparedFailure.branchRequest as Record<string, unknown>),
        branchKind: "replay",
        branchPhase: "provider_failure",
        disposition: failureInput.failure.retryable ? "retryable" : "terminal",
        preparedBranchRootRef: failureInput.preparedBranchRootRef,
      });
      if (typeof failureBranch?.branchRootRef !== "string" || !failureBranch.branchRootRef) {
        throw new Error("replay provider failure branch was not persisted");
      }
      const failureReceipt = await input.runtime.invoke(
        "replay-core",
        controlEnvelope("replay:record-provider-failure", {
          jobId,
          candidateEndpointId: failureInput.candidateEndpointId,
          leaseOwner: input.leaseOwner,
          fenceToken: lease.fenceToken,
          failure: structuredClone(preparedFailure.failure ?? failureInput.failure),
          failureBranch: {
            branchRootRef: failureBranch.branchRootRef,
            failureClass: failureInput.failure.code,
            disposition: failureInput.failure.retryable ? "retryable" : "terminal",
          },
        }),
      );
      return {
        failureReceipt: structuredClone(failureReceipt),
        branchRootRef: failureBranch.branchRootRef,
      };
    };

    for (const candidate of input.candidatePackages) {
      const candidateEndpointId =
        typeof candidate.endpointId === "string" ? candidate.endpointId : null;
      const toolPolicy = candidate.toolPolicy;
      if (
        !candidateEndpointId ||
        (toolPolicy !== "deny" &&
          toolPolicy !== "recorded_results_only" &&
          toolPolicy !== "sandboxed_allowlist")
      ) {
        throw new Error("supervised replay candidate package is invalid");
      }
      const prepared = await input.runtime.invoke(
        "replay-core",
        controlEnvelope("replay:prepare-dispatch", {
          jobId,
          candidateEndpointId,
          leaseOwner: input.leaseOwner,
          fenceToken: lease.fenceToken,
          toolPolicy,
        }),
      );
      if (prepared.status === "complete" || prepared.status === "cancelled") continue;
      if (prepared.status === "failure_append_pending") {
        const recoveredBranch = await input.prepareBranch({
          ...(prepared.branchRequest as Record<string, unknown>),
          candidateEndpointId,
        });
        const finalized = await finalizeProviderFailure({
          candidateEndpointId,
          failure: prepared.failure as ReturnType<typeof classifyReplayDispatchFailure>,
          preparedBranchRootRef: recoveredBranch.branchRootRef,
        });
        const pendingFailure = prepared.failure as ReturnType<typeof classifyReplayDispatchFailure>;
        if (finalized.failureReceipt.status === "cancelled") {
          return {
            jobId,
            state: "cancelled",
            cancellation: "provider_failure",
          };
        }
        if (pendingFailure.retryable && finalized.failureReceipt.status === "retryable_failure") {
          providerFailures.push({
            candidateEndpointId,
            failure: pendingFailure,
            receipt: finalized.failureReceipt,
            branchRootRef: finalized.branchRootRef,
          });
          lastRetryableProviderError = Object.assign(new Error(pendingFailure.message), {
            code: pendingFailure.code,
            retryable: true,
          });
          continue;
        }
        throw Object.assign(new Error(pendingFailure.message), {
          code: pendingFailure.code,
          retryable: pendingFailure.retryable,
        });
      }
      const preparedEnvelope = prepared.envelope;
      if (
        prepared.status !== "provider_dispatch" ||
        !preparedEnvelope ||
        typeof preparedEnvelope !== "object" ||
        Array.isArray(preparedEnvelope)
      ) {
        throw new Error("Replay Core did not prepare a bounded router dispatch");
      }
      const envelope: Record<string, unknown> = {
        ...(preparedEnvelope as Record<string, unknown>),
        authorizationEpoch:
          (preparedEnvelope as Record<string, unknown>).authorizationEpoch ??
          input.authorizationEpoch,
        nonce:
          typeof (preparedEnvelope as Record<string, unknown>).nonce === "string"
            ? (preparedEnvelope as Record<string, unknown>).nonce
            : randomBytes(16).toString("hex"),
      };
      assertReplayDispatchEnvelope(envelope, input.channel, input.scope);
      if (envelope.authorizationEpoch !== input.authorizationEpoch) {
        throw new Error("replay adapter authorization epoch mismatch");
      }
      let authorization: RouterReplayAdapterAuthorization;
      let sandboxReceipt: Readonly<Record<string, unknown>> | undefined;
      try {
        authorization = await input.adapter.authorize({ envelope: structuredClone(envelope) });
        assertReplayAdapterAuthorization(authorization as unknown, envelope);
        if (consumedNonces.has(authorization.nonce)) {
          throw new Error("replayed replay adapter authorization nonce");
        }
        const verified = await input.adapter.verifyAuthorization({
          envelope: structuredClone(envelope),
          authorization: structuredClone(authorization) as unknown as Record<string, unknown>,
        });
        if (verified.verified !== true) {
          throw new Error("replay adapter authorization verification failed");
        }
        consumedNonces.add(authorization.nonce);
        if (toolPolicy === "sandboxed_allowlist") {
          const sandbox =
            envelope.candidatePackage &&
            typeof envelope.candidatePackage === "object" &&
            !Array.isArray(envelope.candidatePackage)
              ? (envelope.candidatePackage as Record<string, unknown>).sandbox
              : undefined;
          if (!sandbox || typeof sandbox !== "object" || Array.isArray(sandbox)) {
            throw new Error("sandboxed replay requires a valid sandbox authorization");
          }
          const authorized = await input.adapter.authorizeSandboxedTools({
            envelope: structuredClone(envelope),
            sandbox: structuredClone(sandbox as Record<string, unknown>),
          });
          if (authorized.authorized !== true) {
            throw new Error(authorized.reason || "sandboxed replay authorization rejected");
          }
          sandboxReceipt = Object.freeze({
            schemaVersion: REPLAY_TOOL_SIDE_EFFECT_RECEIPT_SCHEMA,
            policyDigest: authorized.policyDigest,
            sideEffectClass: (sandbox as Record<string, unknown>).sideEffectClass,
          });
        }
      } catch (error) {
        throw new Error(
          String(
            error instanceof Error ? error.message : "replay adapter authorization failed",
          ).slice(0, 256),
        );
      }
      const preparedBranch = await input.prepareBranch({
        replayJobId: jobId,
        scope: input.scope,
        sourceGeneration: sourceRoot.generation,
        sourceDecisionId: sourceRoot.sourceDecisionId,
        candidateEndpointId,
        sharedPrefixRef: sourceRoot.sharedPrefixRef,
        sourceRootOccurrenceId: traversal.sourceRootOccurrenceId,
        sourceHeadOccurrenceId: traversal.sourceHeadOccurrenceId,
        sourceLeafOccurrenceIds: traversal.sourceLeafOccurrenceIds,
        sourceLastSequence: traversal.sourceLastSequence,
        sourceTraversalDigest: traversal.sourceTraversalDigest,
      });
      if (!preparedBranch.branchRootRef || typeof preparedBranch.branchRootRef !== "string") {
        throw new Error("replay branch preparation did not return a durable root");
      }
      let receipt: Record<string, unknown>;
      try {
        receipt = await input.adapter.dispatch(envelope, {
          authorization,
          ...(sandboxReceipt === undefined ? {} : { sandboxReceipt }),
        });
      } catch (error) {
        const failure = classifyReplayDispatchFailure(error);
        const finalized = await finalizeProviderFailure({
          candidateEndpointId,
          failure,
          preparedBranchRootRef: preparedBranch.branchRootRef,
        });
        const { failureReceipt } = finalized;
        if (failureReceipt.status === "cancelled") {
          return {
            jobId,
            state: "cancelled",
            cancellation: "provider_failure",
          };
        }
        if (failure.retryable && failureReceipt.status === "retryable_failure") {
          providerFailures.push({
            candidateEndpointId,
            failure,
            receipt: structuredClone(failureReceipt),
            branchRootRef: finalized.branchRootRef,
          });
          lastRetryableProviderError = error;
          continue;
        }
        throw error;
      }
      const recorded = await input.runtime.invoke(
        "replay-core",
        controlEnvelope("replay:record-provider-receipt", {
          jobId,
          candidateEndpointId,
          leaseOwner: input.leaseOwner,
          fenceToken: lease.fenceToken,
          receipt,
        }),
      );
      if (recorded.status === "cancelled_late") {
        if (schedulerClaim) {
          const schedulerReceipt = await input.scheduler?.complete({
            jobId: schedulerClaim.jobId,
            leaseId: schedulerClaim.leaseId,
            fence: schedulerClaim.fence,
            result: { replayJobId: jobId, state: "cancelled" },
          });
          if (!schedulerReceipt?.completed) {
            throw new Error("replay scheduler did not accept the cancelled supervision receipt");
          }
        }
        return {
          jobId,
          state: "cancelled",
          cancellation: "late_provider_completion",
        };
      }
      const branchRequest = recorded.branchRequest;
      if (
        recorded.status !== "append_recovery" ||
        !branchRequest ||
        typeof branchRequest !== "object"
      ) {
        throw new Error("Replay Core did not persist a branch append recovery receipt");
      }
      const boundBranchRequest = assertReplayBranchTraversalBinding(
        branchRequest as Record<string, unknown>,
        traversal,
      );
      const branch = await input.appendBranch({
        ...boundBranchRequest,
        ...(preparedBranch ? { preparedBranchRootRef: preparedBranch.branchRootRef } : {}),
      });
      const appended = await input.runtime.invoke(
        "replay-core",
        controlEnvelope("replay:record-branch-append", {
          jobId,
          candidateEndpointId,
          leaseOwner: input.leaseOwner,
          fenceToken: lease.fenceToken,
          branch,
        }),
      );
      if (appended.status !== "complete" && appended.status !== "awaiting_evaluation") {
        throw new Error("Replay Core did not accept the durable branch append receipt");
      }
      resultTraceIds.push(branch.branchRootRef);
      resultBranches.push({ candidateEndpointId, branchRootRef: branch.branchRootRef });
    }
    if (resultBranches.length === 0) {
      if (lastRetryableProviderError) throw lastRetryableProviderError;
      throw new Error("supervised replay produced no durable provider result");
    }
    if (
      providerFailures.some(
        (entry) => typeof entry.branchRootRef !== "string" || !entry.branchRootRef,
      )
    ) {
      throw new Error("supervised replay provider failure is missing its durable branch");
    }
    const failureTraceIds = [
      ...new Set(providerFailures.map((entry) => entry.branchRootRef)),
    ].sort();
    const evaluation = await input.handoffEvaluation({
      replayJobId: jobId,
      scope: input.scope,
      sourceDecisionId: sourceRoot.sourceDecisionId,
      sourceGeneration: sourceRoot.generation,
      resultTraceIds: [...new Set(resultTraceIds)].sort(),
      failureTraceIds,
      resultBranches: resultBranches.sort((left, right) =>
        left.candidateEndpointId.localeCompare(right.candidateEndpointId),
      ),
      candidates: structuredClone(input.candidatePackages),
      providerFailures: structuredClone(providerFailures),
    });
    const completed = await input.runtime.invoke(
      "replay-core",
      controlEnvelope("replay:record-evaluation-receipt", {
        jobId,
        leaseOwner: input.leaseOwner,
        fenceToken: lease.fenceToken,
        evaluation,
      }),
    );
    const completedEvaluation = input.completeEvaluation
      ? await input.completeEvaluation({
          replayJobId: jobId,
          evaluationJobId: evaluation.evaluationJobId,
          scope: input.scope,
          sourceDecisionId: sourceRoot.sourceDecisionId,
          sourceGeneration: sourceRoot.generation,
          resultTraceIds: [...new Set(resultTraceIds)].sort(),
          failureTraceIds,
          resultBranches: resultBranches.sort((left, right) =>
            left.candidateEndpointId.localeCompare(right.candidateEndpointId),
          ),
          candidates: structuredClone(input.candidatePackages),
          providerFailures: structuredClone(providerFailures),
        })
      : null;
    const finalized = completedEvaluation
      ? await input.runtime.invoke(
          "replay-core",
          controlEnvelope("replay:record-evaluation-result", {
            jobId,
            leaseOwner: input.leaseOwner,
            fenceToken: lease.fenceToken,
            evaluation: completedEvaluation,
          }),
        )
      : completed;
    if (schedulerClaim) {
      const state = typeof finalized.state === "string" ? finalized.state : "complete";
      const receipt = await input.scheduler?.complete({
        jobId: schedulerClaim.jobId,
        leaseId: schedulerClaim.leaseId,
        fence: schedulerClaim.fence,
        result: { replayJobId: jobId, state },
      });
      if (!receipt?.completed) {
        // Replay Core has already durably recorded the provider, branch, and
        // evaluation receipts. An expired supervisory lease must be observable,
        // but it must not turn that completed durable work into a false API
        // failure or trigger a second provider dispatch on retry.
        return { jobId, ...finalized, schedulerState: "completion_not_accepted" };
      }
    }
    return finalized;
  } catch (error) {
    if (schedulerClaim) {
      try {
        await input.scheduler?.fail({
          jobId: schedulerClaim.jobId,
          leaseId: schedulerClaim.leaseId,
          fence: schedulerClaim.fence,
        });
      } catch {
        // A scheduler failure is isolated from the original replay failure; the
        // durable Replay Core state remains the recovery authority.
      }
    }
    throw error;
  }
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
  readonly occurrenceId?: string;
  readonly contentId?: string;
  readonly trajectoryEvents?: readonly Record<string, unknown>[];
  readonly routingShadowEvidence?: Readonly<Record<string, unknown>>;
  readonly routingShadowCases?: readonly Record<string, unknown>[];
  readonly evaluationReferences?: Readonly<Record<string, unknown>>;
  readonly usageEvent?: Readonly<Record<string, unknown>>;
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

/**
 * Production Track B is a closed composition, not merely a count of workers.
 * Keeping this check at the production constructor means a package cannot
 * replace one canonical extension with an arbitrary module while still
 * claiming to contain the production runtime.
 */
export function validateProductionExtensionSet(
  extensions: readonly { readonly descriptor: Pick<ProductionExtensionDescriptor, "id"> }[],
): void {
  const expected = new Set<string>(TRACK_B_CANONICAL_EXTENSION_IDS);
  const ids = extensions.map((extension) => extension.descriptor.id);
  const observed = new Set(ids);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))].sort();
  const missing = TRACK_B_CANONICAL_EXTENSION_IDS.filter((id) => !observed.has(id));
  const unknown = [...observed].filter((id) => !expected.has(id)).sort();
  if (ids.length !== TRACK_B_CANONICAL_EXTENSION_IDS.length || missing.length || unknown.length) {
    throw new Error(
      `canonical extension set mismatch: expected exactly thirteen IDs; missing=${
        missing.join(",") || "none"
      }; unknown=${unknown.join(",") || "none"}; duplicates=${duplicates.join(",") || "none"}`,
    );
  }
  if (duplicates.length || observed.size !== ids.length) {
    throw new Error(
      `canonical extension set mismatch: duplicate IDs=${duplicates.join(",") || "unknown"}`,
    );
  }
  const orderMismatch = ids.some((id, index) => id !== TRACK_B_CANONICAL_EXTENSION_IDS[index]);
  if (orderMismatch) {
    throw new Error(
      `canonical extension set order mismatch: expected=${TRACK_B_CANONICAL_EXTENSION_IDS.join(",")}; received=${ids.join(",")}`,
    );
  }
}

export type TrackBExtensionRuntimeReadiness =
  | { readonly state: "ready" }
  | {
      readonly state: "degraded";
      readonly message: string;
      readonly failedIds: readonly string[];
    }
  | {
      readonly state: "pending";
      readonly message: string;
      readonly pendingIds: readonly string[];
    }
  | {
      readonly state: "failed";
      readonly message: string;
      readonly failedIds: readonly string[];
    };

/**
 * Lifecycles that describe an in-flight supervised transition rather than a
 * worker that can no longer serve traffic.
 */
const TRACK_B_EXTENSION_PENDING_LIFECYCLES = new Set(["starting", "stopping"]);

/**
 * Classify the extension host and supervisor against the canonical ready set.
 *
 * A supervised restart is a bounded, expected transition: readiness stays
 * retracted while it is in flight, but the runtime must not be torn down and
 * routing must stay available.  A terminal lifecycle (exited/degraded/failed,
 * or an expected-stopped worker that is not mid-transition) still fails closed.
 */
export function evaluateProductionExtensionRuntimeReadiness(
  runtime: { readonly health: () => Record<string, unknown> },
  expectedIds: readonly string[] = TRACK_B_CANONICAL_EXTENSION_IDS,
): TrackBExtensionRuntimeReadiness {
  const health = runtime.health();
  const host = health.host;
  const supervisor = health.supervisor;
  const hostRecord = host && typeof host === "object" ? (host as Record<string, unknown>) : null;
  const supervisorRecord =
    supervisor && typeof supervisor === "object" ? (supervisor as Record<string, unknown>) : null;
  const hostIds = hostRecord?.extensions;
  const workerRows = supervisorRecord?.workers;
  const observedIds = Array.isArray(hostIds)
    ? hostIds.filter((id): id is string => typeof id === "string")
    : [];
  const observedWorkers = Array.isArray(workerRows) ? workerRows : [];
  const missingIds = expectedIds.filter((id) => !observedIds.includes(id));
  // A deliberately disabled extension is not required to be ready.
  const requiredRows = expectedIds
    .map((id) => ({
      id,
      row: observedWorkers.find(
        (candidate) =>
          candidate &&
          typeof candidate === "object" &&
          (candidate as Record<string, unknown>).id === id,
      ) as Record<string, unknown> | undefined,
    }))
    .filter(({ row }) => row?.desiredState !== "disabled");
  const pendingIds: string[] = [];
  const failedIds: string[] = [];
  for (const { id, row } of requiredRows) {
    const lifecycle = row?.lifecycle;
    if (lifecycle === "ready") continue;
    const transitioning = row?.transitioning === true;
    if (
      transitioning ||
      (typeof lifecycle === "string" && TRACK_B_EXTENSION_PENDING_LIFECYCLES.has(lifecycle))
    ) {
      pendingIds.push(id);
      continue;
    }
    failedIds.push(id);
  }
  const readyWorkers =
    typeof supervisorRecord?.readyWorkers === "number"
      ? supervisorRecord.readyWorkers
      : requiredRows.length - pendingIds.length - failedIds.length;
  const summary =
    `expected=${expectedIds.length}; readyWorkers=${readyWorkers}; ` +
    `missing=${missingIds.join(",") || "none"}`;
  // R8/R24/R30: ordinary routing depends on the host transport, the supervisor,
  // and the supervisor's declared routing availability, not on every worker
  // being ready. A terminal worker for a routing-nondependent extension is a
  // degradation of that extension's capability, not a routing outage.
  if (
    hostRecord?.available !== true ||
    hostRecord.enabled !== true ||
    supervisorRecord?.available !== true ||
    supervisorRecord.routingAvailable !== true ||
    missingIds.length > 0
  ) {
    return {
      state: "failed",
      failedIds,
      message:
        `production extension runtime is not ready: ${summary}; ` +
        `notReady=${[...missingIds, ...failedIds].join(",") || "none"}`,
    };
  }
  if (failedIds.length > 0) {
    return {
      state: "degraded",
      failedIds,
      message:
        `production extension runtime is degraded while routing remains available: ${summary}; ` +
        `degraded=${failedIds.join(",")}`,
    };
  }
  if (pendingIds.length > 0 || readyWorkers < expectedIds.length) {
    return {
      state: "pending",
      pendingIds,
      message:
        `production extension runtime is transitioning: ${summary}; ` +
        `pending=${pendingIds.join(",") || "none"}`,
    };
  }
  return { state: "ready" };
}

/**
 * Verify the extension host and supervisor have both reached the same
 * canonical ready set before the HTTP server transitions out of pending.
 */
export function assertProductionExtensionRuntimeReady(
  runtime: { readonly health: () => Record<string, unknown> },
  expectedIds: readonly string[] = TRACK_B_CANONICAL_EXTENSION_IDS,
): void {
  const readiness = evaluateProductionExtensionRuntimeReadiness(runtime, expectedIds);
  if (readiness.state !== "ready") throw new Error(readiness.message);
}

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

const TRACK_B_OUTBOX_SCHEMA_VERSION = "role-model.track-b-post-observation-outbox.v4" as const;
const TRACK_B_OUTBOX_RECEIPT_CAP_BYTES = 10 * 1024 * 1024;
const TRACK_B_OUTBOX_RECEIPT_RAW_CAP_BYTES = 10 * 1024 * 1024;
const TRACK_B_OUTBOX_SQLITE_HEADER = "SQLite format 3";
const TRACK_B_OUTBOX_OBSERVATION_CAP_BYTES = 64 * 1024;
const TRACK_B_OUTBOX_OBSERVATION_TEXT_CAP_BYTES = 16 * 1024;
const TRACK_B_OUTBOX_OBSERVATION_COLLECTION_CAP = 128;

function outboxSafeText(value: unknown, capBytes = 1024): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return Buffer.byteLength(value, "utf8") <= capBytes ? value : undefined;
}

function outboxSafeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && Number.isSafeInteger(value)
    ? value
    : undefined;
}

function outboxSafeFinite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function outboxPickScalar(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  key: string,
  capBytes = 1024,
): void {
  const value = source[key];
  if (typeof value === "string") {
    const safe = outboxSafeText(value, capBytes);
    if (safe !== undefined) target[key] = safe;
  } else if (typeof value === "boolean") {
    target[key] = value;
  } else {
    const safe = outboxSafeFinite(value);
    if (safe !== undefined) target[key] = safe;
  }
}

function outboxPickStringArray(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  key: string,
  maxItems = 32,
  capBytes = 512,
): void {
  const value = source[key];
  if (!Array.isArray(value) || value.length > maxItems) return;
  const strings = value.map((item) => outboxSafeText(item, capBytes));
  if (strings.every((item): item is string => item !== undefined)) target[key] = strings;
}

function sanitizeTrackBOutboxOutcome(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const target: Record<string, unknown> = {};
  for (const key of [
    "outcomeRef",
    "outcomeDigest",
    "status",
    "failureClass",
    "errorClass",
    "error_class",
    "responseStatusCode",
    "response_status_code",
    "statusCode",
    "status_code",
  ]) {
    outboxPickScalar(source, target, key, key.toLowerCase().includes("ref") ? 2048 : 512);
  }
  return Object.keys(target).length ? target : undefined;
}

function sanitizeTrackBOutboxDimensions(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const target: Record<string, unknown> = {};
  for (const key of [
    "task",
    "repository",
    "sampling",
    "experience",
    "environment",
    "prompt",
    "tool",
  ]) {
    const raw = source[key];
    if (raw === null) {
      target[key] = null;
      continue;
    }
    const safe = outboxSafeText(raw, key === "prompt" || key === "tool" ? 256 : 512);
    if (safe !== undefined) {
      // Prompt/tool dimensions are accepted only as opaque references. Never
      // persist an inline prompt or tool payload in the durable outbox.
      if ((key === "prompt" || key === "tool") && !/^sha256:[a-f0-9]{64}$/.test(safe)) continue;
      target[key] = safe;
    }
  }
  outboxPickStringArray(source, target, "unknownDimensions");
  return Object.keys(target).length ? target : undefined;
}

function sanitizeTrackBOutboxRollout(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const target: Record<string, unknown> = {};
  for (const key of [
    "rolloutId",
    "routePackage",
    "endpointId",
    "modelId",
    "policyId",
    "reasoningEffort",
    "effortSource",
    "evidenceRef",
    "artifactRef",
  ]) {
    outboxPickScalar(source, target, key, 2048);
  }
  for (const key of ["evaluationActual"])
    outboxPickScalar(source, target, key, TRACK_B_OUTBOX_OBSERVATION_TEXT_CAP_BYTES);
  const propensity = outboxSafeFinite(source.propensity);
  if (propensity !== undefined) target.propensity = propensity;
  const dimensions = sanitizeTrackBOutboxDimensions(source.observedDimensions);
  if (dimensions) target.observedDimensions = dimensions;
  const outcome = sanitizeTrackBOutboxOutcome(source.outcome);
  if (outcome) target.outcome = outcome;
  return Object.keys(target).length ? target : undefined;
}

function sanitizeTrackBOutboxCandidate(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const target: Record<string, unknown> = {};
  for (const key of [
    "routePackage",
    "endpointId",
    "modelId",
    "policyId",
    "reasoningEffort",
    "effortSource",
  ])
    outboxPickScalar(source, target, key, 2048);
  const propensity = outboxSafeFinite(source.propensity);
  if (propensity !== undefined) target.propensity = propensity;
  return Object.keys(target).length ? target : undefined;
}

function sanitizeTrackBOutboxEvaluationReferences(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const target: Record<string, unknown> = {};
  for (const key of [
    "taskRef",
    "inputRef",
    "forkRef",
    "toolPolicyDigest",
    "environmentDigest",
    "sourceEvidenceRef",
    "counterfactualEvidenceRef",
    "sourceOutcomeRef",
    "counterfactualOutcomeRef",
  ])
    outboxPickScalar(source, target, key, 2048);
  const perCase = Array.isArray(source.perCase)
    ? source.perCase.slice(0, TRACK_B_OUTBOX_OBSERVATION_COLLECTION_CAP).flatMap((value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) return [];
        const row = value as Record<string, unknown>;
        const caseId = outboxSafeText(row.caseId, 512);
        const evidenceRef = outboxSafeText(row.evidenceRef, 2048);
        return caseId && evidenceRef ? [{ caseId, evidenceRef }] : [];
      })
    : [];
  if (perCase.length) target.perCase = perCase;
  return Object.keys(target).length ? target : undefined;
}

function sanitizeTrackBOutboxShadowEvidence(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const target: Record<string, unknown> = {};
  const sourceRollout = sanitizeTrackBOutboxRollout(source.source);
  if (sourceRollout) target.source = sourceRollout;
  const counterfactuals = Array.isArray(source.counterfactuals)
    ? source.counterfactuals
        .slice(0, TRACK_B_OUTBOX_OBSERVATION_COLLECTION_CAP)
        .flatMap((rollout) => {
          const safe = sanitizeTrackBOutboxRollout(rollout);
          return safe ? [safe] : [];
        })
    : [];
  if (counterfactuals.length) target.counterfactuals = counterfactuals;
  const candidateSet = Array.isArray(source.candidateSet)
    ? source.candidateSet
        .slice(0, TRACK_B_OUTBOX_OBSERVATION_COLLECTION_CAP)
        .flatMap((candidate) => {
          const safe = sanitizeTrackBOutboxCandidate(candidate);
          return safe ? [safe] : [];
        })
    : [];
  if (candidateSet.length) target.candidateSet = candidateSet;
  const references = sanitizeTrackBOutboxEvaluationReferences(source.evaluationReferences);
  if (references) target.evaluationReferences = references;
  return Object.keys(target).length ? target : undefined;
}

function sanitizeTrackBOutboxTrajectoryEvent(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const target: Record<string, unknown> = {};
  for (const key of [
    "id",
    "type",
    "requestId",
    "routingDecisionId",
    "endpointId",
    "modelId",
    "reasoningEffort",
    "effortSource",
    "evidenceRef",
    "outcomeRef",
    "status",
    "failureClass",
    "errorClass",
  ])
    outboxPickScalar(source, target, key, 2048);
  for (const key of [
    "timestampMs",
    "timestamp_ms",
    "occurredAtMs",
    "occurred_at_ms",
    "createdAtMs",
    "created_at_ms",
  ]) {
    const safe = outboxSafeNumber(source[key]);
    if (safe !== undefined) target[key] = safe;
  }
  return Object.keys(target).length ? target : undefined;
}

function sanitizeTrackBOutboxContributionRecord(
  value: unknown,
  depth = 0,
): Record<string, unknown> | undefined {
  if (depth > 2 || !value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const target: Record<string, unknown> = {};
  for (const key of [
    "responseStatusCode",
    "response_status_code",
    "statusCode",
    "status_code",
    "errorClass",
    "error_class",
    "normalizedErrorClass",
    "failureClass",
    "failure_class",
    "code",
    "type",
    "name",
    "cancelled",
    "canceled",
    "aborted",
    "failed",
    "isError",
    "success",
  ])
    outboxPickScalar(source, target, key, 512);
  for (const key of ["failure", "error", "metadata"]) {
    const nested = sanitizeTrackBOutboxContributionRecord(source[key], depth + 1);
    if (nested) target[key] = nested;
  }
  const diagnostics = Array.isArray(source.diagnostics)
    ? source.diagnostics.slice(0, 32).flatMap((diagnostic) => {
        const safe = sanitizeTrackBOutboxContributionRecord(diagnostic, depth + 1);
        return safe ? [safe] : [];
      })
    : [];
  if (diagnostics.length) target.diagnostics = diagnostics;
  return Object.keys(target).length ? target : undefined;
}

function sanitizeTrackBOutboxUsageEvent(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const target: Record<string, unknown> = {};
  for (const key of [
    "endpoint_id",
    "model_id",
    "reasoning_effort",
    "effort_source",
    "error_class",
    "errorClass",
    "status_code",
    "statusCode",
    "response_status_code",
    "responseStatusCode",
    "tokens_in",
    "tokens_out",
    "input_tokens",
    "output_tokens",
    "cache_read_input_tokens",
    "cache_creation_input_tokens",
    "cancelled",
    "canceled",
    "aborted",
  ])
    outboxPickScalar(source, target, key, 2048);
  return Object.keys(target).length ? target : undefined;
}

const OUTBOX_STATUS_CODE_KEYS = [
  "responseStatusCode",
  "response_status_code",
  "statusCode",
  "status_code",
] as const;

function readOutboxStatusCode(record: unknown): number | undefined {
  if (!record || typeof record !== "object" || Array.isArray(record)) return undefined;
  const source = record as Record<string, unknown>;
  for (const key of OUTBOX_STATUS_CODE_KEYS) {
    const value = source[key];
    if (typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599) {
      return value;
    }
  }
  return undefined;
}

/**
 * Resolve the authoritative provider response status from the observation
 * shapes the packaged runtime actually emits: the status lives inside the
 * execution or inspection response capture, not as a top-level scalar.
 */
function readOutboxResponseStatusCode(
  observation: Readonly<Record<string, unknown>>,
): number | undefined {
  const execution = observation.execution;
  const executionRecord =
    execution && typeof execution === "object" && !Array.isArray(execution)
      ? (execution as Record<string, unknown>)
      : null;
  const inspection = observation.inspection;
  const inspectionRecord =
    inspection && typeof inspection === "object" && !Array.isArray(inspection)
      ? (inspection as Record<string, unknown>)
      : null;
  const inspectionRequest = inspectionRecord?.request;
  const inspectionRequestRecord =
    inspectionRequest && typeof inspectionRequest === "object" && !Array.isArray(inspectionRequest)
      ? (inspectionRequest as Record<string, unknown>)
      : null;
  for (const candidate of [
    observation,
    observation.responseCapture,
    executionRecord,
    executionRecord?.responseCapture,
    inspectionRequestRecord?.responseCapture,
  ]) {
    const statusCode = readOutboxStatusCode(candidate);
    if (statusCode !== undefined) return statusCode;
  }
  return undefined;
}

function sanitizeTrackBPostObservationForOutbox(
  observation: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const target: Record<string, unknown> = {};
  for (const key of ["occurrenceId", "contentId"]) outboxPickScalar(observation, target, key, 2048);
  const trajectoryEvents = Array.isArray(observation.trajectoryEvents)
    ? observation.trajectoryEvents
        .slice(0, TRACK_B_OUTBOX_OBSERVATION_COLLECTION_CAP)
        .flatMap((event) => {
          const safe = sanitizeTrackBOutboxTrajectoryEvent(event);
          return safe ? [safe] : [];
        })
    : [];
  if (trajectoryEvents.length) target.trajectoryEvents = trajectoryEvents;
  const shadowEvidence = sanitizeTrackBOutboxShadowEvidence(observation.routingShadowEvidence);
  if (shadowEvidence) target.routingShadowEvidence = shadowEvidence;
  const shadowCases = Array.isArray(observation.routingShadowCases)
    ? observation.routingShadowCases
        .slice(0, TRACK_B_OUTBOX_OBSERVATION_COLLECTION_CAP)
        .flatMap((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return [];
          const source = item as Record<string, unknown>;
          const targetCase: Record<string, unknown> = {};
          outboxPickScalar(source, targetCase, "id", 512);
          outboxPickScalar(source, targetCase, "actual", TRACK_B_OUTBOX_OBSERVATION_TEXT_CAP_BYTES);
          const criteria = source.evaluationCriteria;
          if (criteria && typeof criteria === "object" && !Array.isArray(criteria)) {
            const criteriaRecord = criteria as Record<string, unknown>;
            const safeCriteria: Record<string, unknown> = {};
            outboxPickScalar(criteriaRecord, safeCriteria, "schemaVersion", 128);
            outboxPickStringArray(criteriaRecord, safeCriteria, "requiredTerms");
            outboxPickStringArray(criteriaRecord, safeCriteria, "forbiddenTerms");
            outboxPickScalar(criteriaRecord, safeCriteria, "minOutputChars", 128);
            if (Object.keys(safeCriteria).length) targetCase.evaluationCriteria = safeCriteria;
          }
          return Object.keys(targetCase).length ? [targetCase] : [];
        })
    : [];
  if (shadowCases.length) target.routingShadowCases = shadowCases;
  const evaluationReferences = sanitizeTrackBOutboxEvaluationReferences(
    observation.evaluationReferences,
  );
  if (evaluationReferences) target.evaluationReferences = evaluationReferences;
  const evaluationJobIds = Array.isArray(observation.evaluationJobIds)
    ? observation.evaluationJobIds
        .slice(0, TRACK_B_OUTBOX_OBSERVATION_COLLECTION_CAP)
        .flatMap((jobId) => {
          const safe = outboxSafeText(jobId, 512);
          return safe ? [safe] : [];
        })
    : [];
  if (evaluationJobIds.length) target.evaluationJobIds = evaluationJobIds;
  const usageEvent = sanitizeTrackBOutboxUsageEvent(observation.usageEvent);
  if (usageEvent) target.usageEvent = usageEvent;
  for (const key of ["responseStatusCode", "normalizedErrorClass", "errorClass", "error_class"]) {
    outboxPickScalar(observation, target, key, 512);
  }
  // The live runtime observation carries the authoritative provider status
  // inside the execution/response capture rather than as a top-level scalar.
  // Project it into the bounded durable field so a queued observation still
  // classifies the same contribution outcome the live observation did.
  if (target.responseStatusCode === undefined) {
    const statusCode = readOutboxResponseStatusCode(observation);
    if (statusCode !== undefined) target.responseStatusCode = statusCode;
  }
  for (const key of ["execution", "responseCapture", "inspection", "diagnostics"]) {
    const safe = sanitizeTrackBOutboxContributionRecord(observation[key]);
    if (safe) target[key] = safe;
  }
  const payload = JSON.stringify(target);
  if (Buffer.byteLength(payload, "utf8") > TRACK_B_OUTBOX_OBSERVATION_CAP_BYTES) {
    throw new Error("Track B post-observation outbox payload exceeds the bounded observation cap");
  }
  return target;
}

function boundedTrackBObservationJson(value: unknown): string {
  const json = JSON.stringify(value ?? {});
  if (Buffer.byteLength(json, "utf8") > TRACK_B_OUTBOX_OBSERVATION_CAP_BYTES) {
    throw new Error("Track B post-observation outbox payload exceeds the bounded observation cap");
  }
  return json;
}

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
      observation_json TEXT CHECK(length(CAST(observation_json AS BLOB)) <= 65536),
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
  const columns = database
    .prepare("PRAGMA table_info(track_b_post_observation_pending)")
    .all() as Array<{ name?: string }>;
  if (!columns.some((column) => column.name === "observation_json")) {
    database.exec(
      "ALTER TABLE track_b_post_observation_pending ADD COLUMN observation_json TEXT CHECK(length(CAST(observation_json AS BLOB)) <= 65536)",
    );
  }
  database
    .prepare(
      "INSERT INTO track_b_post_observation_meta (key, value) VALUES ('schemaVersion', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
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
                run88_correlation_json, observation_json, legacy_identity_missing, enqueued_at_ms)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
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
              boundedTrackBObservationJson(sanitizeTrackBPostObservationForOutbox(row)),
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
        const observationPayload = sanitizeTrackBPostObservationForOutbox(observation);
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
                  run88_correlation_json, observation_json, legacy_identity_missing, enqueued_at_ms)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
              )
              .run(
                item.requestId,
                item.routingDecisionId,
                item.endpointId,
                item.modelId,
                item.reasoningEffort,
                item.effortSource,
                item.run88Correlation ? boundedJson(item.run88Correlation) : null,
                boundedTrackBObservationJson(observationPayload),
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
                        effort_source, run88_correlation_json, observation_json, legacy_identity_missing
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
                  observation_json: string | null;
                  legacy_identity_missing: number;
                }
              | undefined;
            if (!row) return null;
            const payload = row.observation_json ? parseBoundedJson(row.observation_json) : {};
            const payloadRecord =
              payload && typeof payload === "object" && !Array.isArray(payload)
                ? (payload as Record<string, unknown>)
                : {};
            return {
              ...payloadRecord,
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
  /**
   * Authoritative durable reference for the source prefix the caller observed.
   * A replay plan must echo it instead of deriving a look-alike identity that
   * cannot bind the observed replay.
   */
  readonly sourcePrefixRef?: string;
  readonly counterfactuals: readonly { readonly id: string; readonly suffix: readonly unknown[] }[];
  readonly comparableEvidence?: Readonly<Record<string, unknown>>;
  readonly evaluationCases: readonly Record<string, unknown>[];
  readonly trajectoryEvents: readonly Record<string, unknown>[];
  /**
   * Caller-owned, independently materialized references for the evaluation
   * join.  The public adapter forwards the sidecar proof for these references
   * without manufacturing or rewriting it.
   */
  readonly evaluationReferences?: TrackBEvaluationReferences;
  /** A proposed proof is diagnostic input only; it is never trusted by this adapter. */
  readonly referenceAttestation?: Readonly<Record<string, unknown>>;
  /** Observed dimension values are kept on each rollout, including explicit nulls. */
  readonly observedDimensions?: Readonly<Record<string, unknown>>;
  /** Optional host-owned durable job IDs, used to correlate a supervised replay handoff. */
  readonly evaluationJobIds?: readonly string[];
  readonly identity?: TrackBVariantIdentity;
  readonly occurrence?: Readonly<{ occurrenceId: string; contentId: string }>;
}

export interface TrackBEvaluationReferenceSet {
  readonly taskRef: string;
  readonly inputRef: string;
  readonly forkRef: string;
  readonly toolPolicyDigest: string;
  readonly environmentDigest: string;
  readonly sourceEvidenceRef: string;
  readonly counterfactualEvidenceRef: string;
  readonly sourceOutcomeRef: string;
  readonly counterfactualOutcomeRef: string;
}

export interface TrackBEvaluationCaseReference {
  readonly caseId: string;
  readonly evidenceRef: string;
}

export interface TrackBEvaluationReferences extends TrackBEvaluationReferenceSet {
  readonly perCase: readonly TrackBEvaluationCaseReference[];
}

type TrackBReferenceAttestation = Record<string, unknown>;

const trackBReferenceDigest = (reference: string): string =>
  `sha256:${createHash("sha256").update(reference).digest("hex")}`;

function requireTrackBReference(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`trusted evaluation ${label} reference is required`);
  }
  return value;
}

function normalizeTrackBEvaluationReferences(
  value: unknown,
  expectedCaseCount: number,
): TrackBEvaluationReferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("trusted evaluation references are required");
  }
  const record = value as Record<string, unknown>;
  const normalized = {
    taskRef: requireTrackBReference(record.taskRef, "task"),
    inputRef: requireTrackBReference(record.inputRef, "input"),
    forkRef: requireTrackBReference(record.forkRef, "fork"),
    toolPolicyDigest: requireTrackBReference(record.toolPolicyDigest, "tool policy"),
    environmentDigest: requireTrackBReference(record.environmentDigest, "environment"),
    sourceEvidenceRef: requireTrackBReference(record.sourceEvidenceRef, "source evidence"),
    counterfactualEvidenceRef: requireTrackBReference(
      record.counterfactualEvidenceRef,
      "counterfactual evidence",
    ),
    sourceOutcomeRef: requireTrackBReference(record.sourceOutcomeRef, "source outcome"),
    counterfactualOutcomeRef: requireTrackBReference(
      record.counterfactualOutcomeRef,
      "counterfactual outcome",
    ),
  } satisfies TrackBEvaluationReferenceSet;
  const fields = [
    normalized.taskRef,
    normalized.inputRef,
    normalized.forkRef,
    normalized.toolPolicyDigest,
    normalized.environmentDigest,
    normalized.sourceEvidenceRef,
    normalized.counterfactualEvidenceRef,
    normalized.sourceOutcomeRef,
    normalized.counterfactualOutcomeRef,
  ];
  if (new Set(fields).size !== fields.length) {
    throw new Error("trusted evaluation comparability references must be distinct");
  }
  if (!Array.isArray(record.perCase) || record.perCase.length !== expectedCaseCount) {
    throw new Error("trusted evaluation per-case references are required for every case");
  }
  const perCase = record.perCase.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`trusted evaluation case ${index} reference is invalid`);
    }
    const row = item as Record<string, unknown>;
    return {
      caseId: requireTrackBReference(row.caseId, `case ${index}`),
      evidenceRef: requireTrackBReference(row.evidenceRef, `case ${index} evidence`),
    };
  });
  if (new Set(perCase.map((row) => row.caseId)).size !== perCase.length) {
    throw new Error("trusted evaluation case references must be unique");
  }
  if (new Set(perCase.map((row) => row.evidenceRef)).size !== perCase.length) {
    throw new Error("trusted evaluation case evidence references must be distinct");
  }
  if (perCase.some((row) => fields.includes(row.evidenceRef))) {
    throw new Error("trusted evaluation case evidence must remain independent from comparability");
  }
  return { ...normalized, perCase };
}

function trackBReferenceEntries(refs: TrackBEvaluationReferences): Record<string, string> {
  return {
    taskRef: refs.taskRef,
    inputRef: refs.inputRef,
    forkRef: refs.forkRef,
    toolPolicyDigest: refs.toolPolicyDigest,
    environmentDigest: refs.environmentDigest,
    sourceEvidenceRef: refs.sourceEvidenceRef,
    counterfactualEvidenceRef: refs.counterfactualEvidenceRef,
    sourceOutcomeRef: refs.sourceOutcomeRef,
    counterfactualOutcomeRef: refs.counterfactualOutcomeRef,
    ...Object.fromEntries(refs.perCase.map((row) => [row.caseId, row.evidenceRef])),
  };
}

function validateTrackBReferenceAttestation(
  value: unknown,
  refs: TrackBEvaluationReferences,
  context: Readonly<{ channel: string; scope: string; authorizationEpoch: number }>,
  additionalReferences: Readonly<Record<string, string>> = {},
  nowMs = Date.now(),
): TrackBReferenceAttestation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("trusted evaluation reference attestation is required");
  }
  const attestation = value as TrackBReferenceAttestation;
  if (attestation.schemaVersion !== "role-model.evaluation-reference-attestation.v1") {
    throw new Error("trusted evaluation reference attestation schema is invalid");
  }
  const authority = attestation.authority;
  if (
    typeof authority !== "string" ||
    !authority ||
    authority === "runtime-shadow-pipeline" ||
    !(authority.startsWith("sidecar:") || authority === "evaluation-reference-store")
  ) {
    throw new Error("trusted evaluation reference attestation authority is invalid");
  }
  if (attestation.purpose !== "evaluation") {
    throw new Error("trusted evaluation reference attestation purpose is invalid");
  }
  if (
    attestation.channel !== context.channel ||
    attestation.scope !== context.scope ||
    attestation.authorizationEpoch !== context.authorizationEpoch
  ) {
    throw new Error("trusted evaluation reference attestation context is invalid");
  }
  const issuedAtMs = attestation.issuedAtMs;
  const expiresAtMs = attestation.expiresAtMs;
  if (
    typeof issuedAtMs !== "number" ||
    !Number.isFinite(issuedAtMs) ||
    typeof expiresAtMs !== "number" ||
    !Number.isFinite(expiresAtMs) ||
    issuedAtMs > nowMs + 5_000 ||
    expiresAtMs <= nowMs ||
    expiresAtMs <= issuedAtMs ||
    expiresAtMs - issuedAtMs > RUN88_PI_PROOF_VALIDITY_MS
  ) {
    throw new Error("trusted evaluation reference attestation freshness is invalid");
  }
  const references = attestation.references;
  if (!references || typeof references !== "object" || Array.isArray(references)) {
    throw new Error("trusted evaluation reference proofs are required");
  }
  for (const [field, reference] of Object.entries({
    ...trackBReferenceEntries(refs),
    ...additionalReferences,
  })) {
    const proof = (references as Record<string, unknown>)[field];
    if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
      throw new Error(`trusted evaluation proof for ${field} is required`);
    }
    const proofRecord = proof as Record<string, unknown>;
    if (
      proofRecord.reference !== reference ||
      proofRecord.resolved !== true ||
      proofRecord.referenceDigest !== trackBReferenceDigest(reference) ||
      proofRecord.purpose !== "evaluation" ||
      proofRecord.authority !== authority ||
      proofRecord.channel !== context.channel ||
      proofRecord.scope !== context.scope ||
      proofRecord.authorizationEpoch !== context.authorizationEpoch ||
      typeof proofRecord.issuedAtMs !== "number" ||
      typeof proofRecord.expiresAtMs !== "number" ||
      proofRecord.issuedAtMs > nowMs + 5_000 ||
      proofRecord.expiresAtMs <= nowMs ||
      proofRecord.expiresAtMs <= proofRecord.issuedAtMs
    ) {
      throw new Error(`trusted evaluation proof for ${field} is invalid`);
    }
  }
  return attestation;
}

async function resolveTrackBReferenceAttestation(
  runtime: TrackBShadowPipelineRuntime,
  envelope: (capability: string, value: unknown) => Record<string, unknown>,
  refs: TrackBEvaluationReferences,
  context: Readonly<{ channel: string; scope: string; authorizationEpoch: number }>,
  additionalReferences: Readonly<Record<string, string>> = {},
): Promise<TrackBReferenceAttestation> {
  const result = await runtime.invoke(
    "evaluation-core",
    envelope("evaluation:attest-references", {
      purpose: "evaluation",
      references: { ...trackBReferenceEntries(refs), ...additionalReferences },
      context,
    }),
  );
  return validateTrackBReferenceAttestation(result, refs, context, additionalReferences);
}

export interface TrackBSemanticEvaluationCriteria {
  readonly schemaVersion: "role-model.semantic-criteria.v1";
  readonly requiredTerms: readonly string[];
  readonly forbiddenTerms?: readonly string[];
  readonly minOutputChars?: number;
}

export function normalizeTrackBSemanticEvaluationCriteria(
  value: unknown,
): TrackBSemanticEvaluationCriteria {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("semantic evaluation criteria are required");
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== "role-model.semantic-criteria.v1") {
    throw new Error("unsupported semantic evaluation criteria schema");
  }
  const normalizeTerms = (raw: unknown, field: string, allowEmpty: boolean): readonly string[] => {
    if (!Array.isArray(raw) || (!allowEmpty && raw.length === 0) || raw.length > 32) {
      throw new Error(`semantic evaluation criteria ${field} are invalid`);
    }
    const terms = raw.map((item) => {
      if (typeof item !== "string" || !item.trim() || Buffer.byteLength(item, "utf8") > 512) {
        throw new Error(`semantic evaluation criteria ${field} are invalid`);
      }
      return item.trim().toLocaleLowerCase("en-US");
    });
    if (new Set(terms).size !== terms.length) {
      throw new Error(`semantic evaluation criteria ${field} contain duplicates`);
    }
    return terms;
  };
  const requiredTerms = normalizeTerms(record.requiredTerms, "requiredTerms", false);
  const forbiddenTerms = normalizeTerms(record.forbiddenTerms ?? [], "forbiddenTerms", true);
  if (record.minOutputChars !== undefined && typeof record.minOutputChars !== "number") {
    throw new Error("semantic evaluation criteria minOutputChars is invalid");
  }
  const minOutputChars: number = record.minOutputChars ?? 1;
  if (!Number.isSafeInteger(minOutputChars) || minOutputChars < 1 || minOutputChars > 65_536) {
    throw new Error("semantic evaluation criteria minOutputChars is invalid");
  }
  return {
    schemaVersion: "role-model.semantic-criteria.v1",
    requiredTerms,
    ...(forbiddenTerms.length ? { forbiddenTerms } : {}),
    ...(minOutputChars !== 1 ? { minOutputChars } : {}),
  };
}

export interface TrackBVariantIdentity {
  readonly endpointId: string;
  readonly modelId: string;
  readonly reasoningEffort: string | null;
  readonly effortSource: RuntimeEffortSource;
}

export type TrackBRouteAdvisoryState = "fresh" | "stale" | "unavailable";

export interface TrackBRouteAdvisoryClaims {
  readonly baselineDecisionId: string;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  readonly routePackage: string;
  readonly profileSnapshotIds: readonly string[];
  readonly candidateId: string | null;
  readonly advisoryState: TrackBRouteAdvisoryState;
  readonly confidence: number;
}

export interface TrackBRouteAdvisoryAuthorization {
  readonly schemaVersion: "role-model.route-advisory-authorization.v1";
  readonly keyId: string;
  readonly issuedAtMs: number;
  readonly expiresAtMs: number;
  readonly receiptId: string;
  readonly claims: TrackBRouteAdvisoryClaims;
  readonly signature: string;
}

export type TrackBRouteAdvisoryAuthorizationValidator = (
  authorization: TrackBRouteAdvisoryAuthorization,
  expected: TrackBRouteAdvisoryClaims,
  nowMs: number,
) => boolean;

const TRACK_B_ROUTE_ADVISORY_AUTHORIZATION_SCHEMA =
  "role-model.route-advisory-authorization.v1" as const;
const TRACK_B_ROUTE_ADVISORY_MAX_PROFILE_SNAPSHOTS = 64;
const TRACK_B_ROUTE_ADVISORY_MAX_TTL_MS = 5 * 60 * 1_000;
const TRACK_B_ROUTE_ADVISORY_CLOCK_SKEW_MS = 30 * 1_000;
const TRACK_B_ROUTE_ADVISORY_CHANNELS = new Set(["development", "stage", "production"]);

function normalizeTrackBRouteAdvisoryText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 256 || /[\r\n]/.test(value)) {
    throw new Error(`route-learning advisory ${field} is invalid`);
  }
  return value.trim();
}

function normalizeTrackBRouteAdvisoryClaims(
  value: TrackBRouteAdvisoryClaims,
): TrackBRouteAdvisoryClaims {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("route-learning advisory authorization claims are invalid");
  }
  const profileSnapshotIds = value.profileSnapshotIds;
  if (
    !Array.isArray(profileSnapshotIds) ||
    profileSnapshotIds.length > TRACK_B_ROUTE_ADVISORY_MAX_PROFILE_SNAPSHOTS
  ) {
    throw new Error("route-learning advisory profile snapshot ids are invalid");
  }
  const normalizedProfileSnapshotIds = [
    ...new Set(
      profileSnapshotIds.map((id) => normalizeTrackBRouteAdvisoryText(id, "profile snapshot id")),
    ),
  ].sort();
  const channel = normalizeTrackBRouteAdvisoryText(value.channel, "channel");
  if (!TRACK_B_ROUTE_ADVISORY_CHANNELS.has(channel)) {
    throw new Error("route-learning advisory channel is invalid");
  }
  if (!Number.isSafeInteger(value.authorizationEpoch) || value.authorizationEpoch < 0) {
    throw new Error("route-learning advisory authorization epoch is invalid");
  }
  if (!new Set(["fresh", "stale", "unavailable"]).has(value.advisoryState)) {
    throw new Error("route-learning advisory state is invalid");
  }
  if (
    typeof value.confidence !== "number" ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1
  ) {
    throw new Error("route-learning advisory confidence is invalid");
  }
  const candidateId =
    value.candidateId === null
      ? null
      : normalizeTrackBRouteAdvisoryText(value.candidateId, "candidate id");
  return {
    baselineDecisionId: normalizeTrackBRouteAdvisoryText(
      value.baselineDecisionId,
      "baseline decision id",
    ),
    channel,
    scope: normalizeTrackBRouteAdvisoryText(value.scope, "scope"),
    authorizationEpoch: value.authorizationEpoch,
    routePackage: normalizeTrackBRouteAdvisoryText(value.routePackage, "route package"),
    profileSnapshotIds: normalizedProfileSnapshotIds,
    candidateId,
    advisoryState: value.advisoryState,
    confidence: value.confidence,
  };
}

function freezeTrackBRouteAdvisoryClaims(
  claims: TrackBRouteAdvisoryClaims,
): TrackBRouteAdvisoryClaims {
  return Object.freeze({
    ...claims,
    profileSnapshotIds: Object.freeze([...claims.profileSnapshotIds]),
  });
}

function normalizeTrackBRouteAdvisorySecret(secret: string | Uint8Array): Buffer {
  const bytes = typeof secret === "string" ? Buffer.from(secret, "utf8") : Buffer.from(secret);
  if (bytes.length < 32) throw new Error("route-learning advisory authority secret is too short");
  return bytes;
}

function hasBoundedTrackBRouteAdvisoryAuthorization(
  value: unknown,
  nowMs: number,
): value is TrackBRouteAdvisoryAuthorization {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const authorization = value as Record<string, unknown>;
    if (
      authorization.schemaVersion !== TRACK_B_ROUTE_ADVISORY_AUTHORIZATION_SCHEMA ||
      typeof authorization.keyId !== "string" ||
      typeof authorization.issuedAtMs !== "number" ||
      typeof authorization.expiresAtMs !== "number" ||
      typeof authorization.receiptId !== "string" ||
      typeof authorization.signature !== "string"
    ) {
      return false;
    }
    normalizeTrackBRouteAdvisoryText(authorization.keyId, "authorization key id");
    normalizeTrackBRouteAdvisoryText(authorization.receiptId, "authorization receipt id");
    normalizeTrackBRouteAdvisoryText(authorization.signature, "authorization signature");
    if (
      !Number.isSafeInteger(authorization.issuedAtMs) ||
      !Number.isSafeInteger(authorization.expiresAtMs) ||
      authorization.issuedAtMs < 0 ||
      authorization.expiresAtMs <= authorization.issuedAtMs ||
      authorization.expiresAtMs - authorization.issuedAtMs > TRACK_B_ROUTE_ADVISORY_MAX_TTL_MS ||
      authorization.issuedAtMs > nowMs + TRACK_B_ROUTE_ADVISORY_CLOCK_SKEW_MS ||
      authorization.expiresAtMs <= nowMs
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function trackBRouteAdvisoryAuthorizationPayload(
  authorization: Pick<
    TrackBRouteAdvisoryAuthorization,
    "keyId" | "issuedAtMs" | "expiresAtMs" | "claims"
  >,
) {
  return {
    schemaVersion: TRACK_B_ROUTE_ADVISORY_AUTHORIZATION_SCHEMA,
    keyId: authorization.keyId,
    issuedAtMs: authorization.issuedAtMs,
    expiresAtMs: authorization.expiresAtMs,
    claims: authorization.claims,
  };
}

function digestTrackBRouteAdvisoryAuthorizationPayload(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalizeRun88Proof(value)))
    .digest("hex");
}

/** Creates the signed, short-lived receipt a trusted router host may attach to an advisory. */
export function createTrackBRouteAdvisoryAuthorization(input: {
  readonly authoritySecret: string | Uint8Array;
  readonly keyId: string;
  readonly issuedAtMs: number;
  readonly expiresAtMs: number;
  readonly claims: Omit<TrackBRouteAdvisoryClaims, "confidence"> & { readonly confidence?: number };
}): TrackBRouteAdvisoryAuthorization {
  const keyId = normalizeTrackBRouteAdvisoryText(input.keyId, "authorization key id");
  if (
    !Number.isSafeInteger(input.issuedAtMs) ||
    !Number.isSafeInteger(input.expiresAtMs) ||
    input.issuedAtMs < 0 ||
    input.expiresAtMs <= input.issuedAtMs ||
    input.expiresAtMs - input.issuedAtMs > TRACK_B_ROUTE_ADVISORY_MAX_TTL_MS
  ) {
    throw new Error("route-learning advisory authorization lifetime is invalid");
  }
  const claims = freezeTrackBRouteAdvisoryClaims(
    normalizeTrackBRouteAdvisoryClaims({
      ...input.claims,
      confidence: input.claims.confidence ?? 0,
    }),
  );
  const payload = trackBRouteAdvisoryAuthorizationPayload({
    keyId,
    issuedAtMs: input.issuedAtMs,
    expiresAtMs: input.expiresAtMs,
    claims,
  });
  const canonicalPayload = JSON.stringify(canonicalizeRun88Proof(payload));
  const signature = createHmac("sha256", normalizeTrackBRouteAdvisorySecret(input.authoritySecret))
    .update(canonicalPayload)
    .digest("hex");
  const receiptId = `authorization:${digestTrackBRouteAdvisoryAuthorizationPayload(payload)}`;
  return Object.freeze({
    schemaVersion: TRACK_B_ROUTE_ADVISORY_AUTHORIZATION_SCHEMA,
    keyId,
    issuedAtMs: input.issuedAtMs,
    expiresAtMs: input.expiresAtMs,
    receiptId,
    claims,
    signature,
  });
}

/** Verifies receipt integrity, lifetime, and exact advisory identity binding. */
export function verifyTrackBRouteAdvisoryAuthorization(
  authorization: unknown,
  authoritySecret: string | Uint8Array,
  options: {
    readonly nowMs: number;
    readonly expected: TrackBRouteAdvisoryClaims;
  },
): boolean {
  try {
    if (!authorization || typeof authorization !== "object" || Array.isArray(authorization))
      return false;
    const value = authorization as Record<string, unknown>;
    if (value.schemaVersion !== TRACK_B_ROUTE_ADVISORY_AUTHORIZATION_SCHEMA) return false;
    if (
      !Number.isSafeInteger(options.nowMs) ||
      options.nowMs < 0 ||
      typeof value.keyId !== "string" ||
      typeof value.issuedAtMs !== "number" ||
      typeof value.expiresAtMs !== "number" ||
      typeof value.receiptId !== "string" ||
      typeof value.signature !== "string"
    )
      return false;
    const keyId = normalizeTrackBRouteAdvisoryText(value.keyId, "authorization key id");
    const issuedAtMs = value.issuedAtMs;
    const expiresAtMs = value.expiresAtMs;
    if (
      !Number.isSafeInteger(issuedAtMs) ||
      !Number.isSafeInteger(expiresAtMs) ||
      issuedAtMs < 0 ||
      expiresAtMs <= issuedAtMs ||
      expiresAtMs - issuedAtMs > TRACK_B_ROUTE_ADVISORY_MAX_TTL_MS ||
      issuedAtMs > options.nowMs + TRACK_B_ROUTE_ADVISORY_CLOCK_SKEW_MS ||
      expiresAtMs <= options.nowMs
    )
      return false;
    const claims = normalizeTrackBRouteAdvisoryClaims(value.claims as TrackBRouteAdvisoryClaims);
    const expected = normalizeTrackBRouteAdvisoryClaims(options.expected);
    if (
      JSON.stringify(canonicalizeRun88Proof(claims)) !==
      JSON.stringify(canonicalizeRun88Proof(expected))
    )
      return false;
    const payload = trackBRouteAdvisoryAuthorizationPayload({
      keyId,
      issuedAtMs,
      expiresAtMs,
      claims,
    });
    if (
      value.receiptId !== `authorization:${digestTrackBRouteAdvisoryAuthorizationPayload(payload)}`
    )
      return false;
    if (!/^[a-f0-9]{64}$/.test(value.signature)) return false;
    const expectedSignature = createHmac(
      "sha256",
      normalizeTrackBRouteAdvisorySecret(authoritySecret),
    )
      .update(JSON.stringify(canonicalizeRun88Proof(payload)))
      .digest();
    const suppliedSignature = Buffer.from(value.signature, "hex");
    return (
      suppliedSignature.length === expectedSignature.length &&
      timingSafeEqual(suppliedSignature, expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Track B evidence is observational only.  Keep the acknowledgement beside the
 * pipeline so a caller cannot accidentally turn a learning candidate into a
 * route mutation just by treating its presence as approval.
 */
export function resolveTrackBRouteAdvisory(input: {
  readonly baselineDecisionId: string;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  readonly routePackage: string;
  readonly profileSnapshotIds: readonly string[];
  readonly candidateId: string | null;
  /** The durable availability disposition of the evidence, never a routing instruction. */
  readonly advisoryState?: TrackBRouteAdvisoryState;
  readonly confidence?: number;
  readonly nowMs: number;
  readonly authorization: TrackBRouteAdvisoryAuthorization;
  readonly authorizationValidator: TrackBRouteAdvisoryAuthorizationValidator;
}) {
  if (!Number.isSafeInteger(input.nowMs) || input.nowMs < 0) {
    throw new Error("route-learning advisory timestamp is invalid");
  }
  const advisoryState = input.advisoryState ?? "fresh";
  const expectedClaims = normalizeTrackBRouteAdvisoryClaims({
    baselineDecisionId: input.baselineDecisionId,
    channel: input.channel,
    scope: input.scope,
    authorizationEpoch: input.authorizationEpoch,
    routePackage: input.routePackage,
    profileSnapshotIds: input.profileSnapshotIds,
    candidateId: input.candidateId,
    advisoryState,
    confidence: input.confidence ?? 0,
  });
  if (expectedClaims.channel === "production") {
    throw new Error("route-learning advisories are shadow-only; production channel is prohibited");
  }
  if (!input.authorization || typeof input.authorizationValidator !== "function") {
    throw new Error("signed route-learning advisory authorization is required");
  }
  if (!hasBoundedTrackBRouteAdvisoryAuthorization(input.authorization, input.nowMs)) {
    throw new Error("route-learning advisory authorization is invalid");
  }
  let authorized = false;
  try {
    authorized =
      input.authorizationValidator(input.authorization, expectedClaims, input.nowMs) === true;
  } catch {
    authorized = false;
  }
  if (!authorized) throw new Error("route-learning advisory authorization is invalid");
  const authorizationClaims = normalizeTrackBRouteAdvisoryClaims(input.authorization.claims);
  if (
    JSON.stringify(canonicalizeRun88Proof(authorizationClaims)) !==
    JSON.stringify(canonicalizeRun88Proof(expectedClaims))
  ) {
    throw new Error("route-learning advisory authorization claims do not match");
  }
  const authorization = Object.freeze({
    schemaVersion: TRACK_B_ROUTE_ADVISORY_AUTHORIZATION_SCHEMA,
    keyId: normalizeTrackBRouteAdvisoryText(input.authorization.keyId, "authorization key id"),
    issuedAtMs: input.authorization.issuedAtMs,
    expiresAtMs: input.authorization.expiresAtMs,
    receiptId: normalizeTrackBRouteAdvisoryText(
      input.authorization.receiptId,
      "authorization receipt id",
    ),
    claims: freezeTrackBRouteAdvisoryClaims(authorizationClaims),
    signature: input.authorization.signature,
  });
  const advisoryId = `advisory:${createHash("sha256")
    .update(
      JSON.stringify({
        claims: expectedClaims,
        authorizationReceiptId: authorization.receiptId,
      }),
    )
    .digest("hex")}`;
  return {
    schemaVersion: "role-model.route-advisory-disposition.v1",
    mode: "shadow" as const,
    disposition: "not_applied_shadow" as const,
    baselineDecisionId: expectedClaims.baselineDecisionId,
    scope: expectedClaims.scope,
    authorizationEpoch: expectedClaims.authorizationEpoch,
    routePackage: expectedClaims.routePackage,
    profileSnapshotIds: [...expectedClaims.profileSnapshotIds],
    candidateId: expectedClaims.candidateId,
    advisoryState: expectedClaims.advisoryState,
    authorization,
    advisoryId,
    decisionAdvice: {
      consideredAdviceIds: [advisoryId],
      acceptedAdviceIds: [],
      rejectedAdviceIds: [advisoryId],
      staleAdviceIds: advisoryState === "stale" ? [advisoryId] : [],
      unavailableAdviceIds: advisoryState === "unavailable" ? [advisoryId] : [],
      deterministicFallback: "baseline_retained" as const,
    },
    confidence: expectedClaims.confidence,
    // A short-lived receipt makes stale evidence visibly non-actionable.  This
    // is a contract value for the shadow receipt, not an IPC content cap.
    expiresAtMs: authorization.expiresAtMs,
    rollbackDisposition: "baseline_retained" as const,
    productionMutation: false,
  };
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

/**
 * R14: the routing-shadow scorer is identified by ID/version/digest, and its
 * digest must bind the definition that Evaluation Core persists. Deriving both
 * the version generation and the digest from the definition keeps an upgraded
 * runtime from re-registering a changed definition under the old identity,
 * which a durable store must refuse as a conflicting version.
 */
export const RUN96_ROUTING_SHADOW_SCORER_SET_VERSION = "run96-routing-shadow-v3";

export function createRun96RoutingShadowScorer(
  overrides: Partial<{
    readonly id: string;
    readonly version: string;
    readonly algorithm: string;
    readonly dimensions: readonly string[];
    readonly requiredInputs: readonly string[];
  }> = {},
): {
  readonly manifestVersion: 2;
  readonly id: string;
  readonly version: string;
  readonly digest: string;
  readonly scorerSetVersion: string;
  readonly algorithm: string;
  readonly dimensions: readonly string[];
  readonly range: { readonly min: number; readonly max: number };
  readonly direction: string;
  readonly requiredInputs: readonly string[];
} {
  const definition = {
    manifestVersion: 2 as const,
    id: overrides.id ?? "run96-semantic-criteria",
    version: overrides.version ?? "2",
    scorerSetVersion: RUN96_ROUTING_SHADOW_SCORER_SET_VERSION,
    algorithm: overrides.algorithm ?? "required_terms",
    dimensions: [...(overrides.dimensions ?? ["correctness"])],
    range: { min: 0, max: 1 },
    direction: "higher_is_better",
    requiredInputs: [...(overrides.requiredInputs ?? ["outputRef", "evaluationCriteria"])],
  };
  return {
    ...definition,
    digest: `sha256:${createHash("sha256")
      .update(JSON.stringify(canonicalExtensionValue(definition)))
      .digest("hex")}`,
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
      ...(input.sourcePrefixRef ? { sourcePrefixRef: input.sourcePrefixRef } : {}),
      counterfactuals: input.counterfactuals,
    }),
  );
  const replayDigest = (replay as Record<string, unknown>).digest;
  if (typeof replayDigest !== "string" || !replayDigest) {
    throw new Error("replay plan must expose a durable digest before learning signals are emitted");
  }
  const replayRecord = replay as Record<string, unknown>;
  const replayBranches = replayRecord.branches;
  if (
    typeof replayRecord.sourceDecisionId !== "string" ||
    !replayRecord.sourceDecisionId ||
    typeof replayRecord.sourceGraphRef !== "string" ||
    !replayRecord.sourceGraphRef ||
    typeof replayRecord.sharedPrefixRef !== "string" ||
    !replayRecord.sharedPrefixRef ||
    !Array.isArray(replayBranches) ||
    replayBranches.length > 128
  ) {
    throw new Error("replay plan must expose bounded provenance before knowledge learning");
  }
  const replayForKnowledge = {
    sourceDecisionId: replayRecord.sourceDecisionId,
    sourceGraphRef: replayRecord.sourceGraphRef,
    sharedPrefixRef: replayRecord.sharedPrefixRef,
    branches: replayBranches.map((branch) => {
      const record = branch as Record<string, unknown>;
      if (typeof record?.id !== "string" || !record.id) {
        throw new Error("replay plan contains a branch without a bounded identifier");
      }
      return {
        id: record.id,
        sourceDecisionId: replayRecord.sourceDecisionId,
        sourceGraphRef: replayRecord.sourceGraphRef,
      };
    }),
    digest: replayDigest,
  };
  const scorer = createRun96RoutingShadowScorer();
  const scorerSetVersion = scorer.scorerSetVersion;
  await runtime.invoke("evaluation-core", {
    ...envelope("evaluation:register-scorer", scorer),
  });
  const rolloutRows = [sourceRollout, ...counterfactualRollouts];
  if (input.evaluationCases.length < 1) {
    throw new Error("durable routing-shadow evaluation cases are required");
  }
  const evaluationReferences = normalizeTrackBEvaluationReferences(
    input.evaluationReferences,
    rolloutRows.length,
  );
  const caseIds = rolloutRows.map((_, index) => {
    const referenceCaseId = evaluationReferences.perCase[index]?.caseId;
    const evaluationCaseId = input.evaluationCases[index]?.id;
    return referenceCaseId ?? (typeof evaluationCaseId === "string" ? evaluationCaseId : "");
  });
  if (caseIds.some((caseId) => !caseId)) {
    throw new Error("durable routing-shadow evaluation case identity is required");
  }
  const holdout = {
    holdoutId: `sha256:${createHash("sha256").update(`${input.requestId}:holdout`).digest("hex")}`,
    membershipDigest: `sha256:${createHash("sha256")
      .update(
        JSON.stringify(
          canonicalizeRun88Proof({ partition: "holdout", caseIds: [...caseIds].sort() }),
        ),
      )
      .digest("hex")}`,
    partition: "holdout" as const,
    caseIds: [...caseIds].sort(),
  };
  const firstCounterfactual = counterfactualRollouts[0];
  if (!firstCounterfactual) {
    throw new Error("durable routing-shadow counterfactual evidence is required");
  }
  const sourceOutcome =
    sourceRollout.outcome &&
    typeof sourceRollout.outcome === "object" &&
    !Array.isArray(sourceRollout.outcome)
      ? (sourceRollout.outcome as Record<string, unknown>)
      : null;
  const counterfactualOutcome =
    firstCounterfactual.outcome &&
    typeof firstCounterfactual.outcome === "object" &&
    !Array.isArray(firstCounterfactual.outcome)
      ? (firstCounterfactual.outcome as Record<string, unknown>)
      : null;
  const comparability = {
    taskRef: evaluationReferences.taskRef,
    inputRef: evaluationReferences.inputRef,
    forkRef: evaluationReferences.forkRef,
    policyId: "run96-routing-shadow",
    scorerSetVersion,
    toolPolicyDigest: evaluationReferences.toolPolicyDigest,
    environmentDigest: evaluationReferences.environmentDigest,
    sourceEvidenceRef: evaluationReferences.sourceEvidenceRef,
    counterfactualEvidenceRef: evaluationReferences.counterfactualEvidenceRef,
    sourceOutcomeRef: evaluationReferences.sourceOutcomeRef,
    counterfactualOutcomeRef: evaluationReferences.counterfactualOutcomeRef,
    sourceCandidateRef: requireTrackBReference(sourceRollout.endpointId, "source candidate"),
    counterfactualCandidateRef: requireTrackBReference(
      firstCounterfactual.endpointId,
      "counterfactual candidate",
    ),
  };
  if (
    sourceRollout.evidenceRef !== comparability.sourceEvidenceRef ||
    firstCounterfactual.evidenceRef !== comparability.counterfactualEvidenceRef ||
    sourceOutcome?.outcomeRef !== comparability.sourceOutcomeRef ||
    counterfactualOutcome?.outcomeRef !== comparability.counterfactualOutcomeRef ||
    replayRecord.sharedPrefixRef !== comparability.forkRef
  ) {
    throw new Error(
      "durable routing-shadow comparability references do not bind the observed replay",
    );
  }
  const referenceAttestation = await resolveTrackBReferenceAttestation(
    runtime,
    envelope,
    evaluationReferences,
    {
      channel: input.channel,
      scope: input.scope,
      authorizationEpoch: input.authorizationEpoch,
    },
  );
  const jobId = input.evaluationJobIds?.[0] ?? `evaluation:${input.requestId}`;
  if (typeof jobId !== "string" || !jobId) {
    throw new Error("durable routing-shadow evaluation job identity is invalid");
  }
  const durableCases = rolloutRows.map((rollout, index) => {
    const evaluationCase = input.evaluationCases[index % input.evaluationCases.length] ?? {};
    const caseReference = evaluationReferences.perCase[index];
    if (!caseReference || caseReference.caseId !== caseIds[index]) {
      throw new Error("durable routing-shadow case identity does not match its evidence reference");
    }
    const evaluationCriteria = normalizeTrackBSemanticEvaluationCriteria(
      evaluationCase.evaluationCriteria,
    );
    return {
      id: caseIds[index],
      candidateRef: requireTrackBReference(rollout.endpointId, "candidate"),
      evidenceRef: caseReference.evidenceRef,
      sourceGeneration: 0,
      evaluationCriteria,
      evaluationCriteriaDigest: digestTrackBSemanticEvaluationCriteria(evaluationCriteria),
    };
  });
  await runtime.invoke("evaluation-core", {
    ...envelope("evaluation:create-job", {
      id: jobId,
      idempotencyKey: jobId,
      evaluationSchemaVersion: 3,
      candidateRef: requireTrackBReference(sourceRollout.endpointId, "source candidate"),
      policyId: "run96-routing-shadow",
      scorerSetVersion,
      requestKind: "routing_shadow_durable",
      comparability,
      holdout,
      referenceAttestation,
      cases: durableCases,
    }),
  });
  const trialIds: string[] = [];
  const completedRollouts: Array<{
    rollout: Record<string, unknown>;
    score: number;
    trialId: string;
    scoreId: string;
    referenceAttestation?: TrackBReferenceAttestation;
  }> = [];
  for (const [index, rollout] of rolloutRows.entries()) {
    const evaluationCase = input.evaluationCases[index % input.evaluationCases.length] ?? {};
    const evaluationCriteria = normalizeTrackBSemanticEvaluationCriteria(
      evaluationCase.evaluationCriteria,
    );
    const trials = await runtime.invoke("evaluation-core", {
      ...envelope("evaluation:list-trials", { jobId }),
    });
    const trialRows = Array.isArray(trials)
      ? trials
      : Array.isArray((trials as Record<string, unknown>).value)
        ? ((trials as Record<string, unknown>).value as unknown[])
        : [];
    const caseId = caseIds[index];
    const trial =
      (trialRows.find(
        (candidate) =>
          candidate &&
          typeof candidate === "object" &&
          ((candidate as Record<string, unknown>).caseId === caseId ||
            (candidate as Record<string, unknown>).candidateRef === rollout.endpointId),
      ) as Record<string, unknown> | undefined) ??
      (trialRows.length === 1 ? (trialRows[0] as Record<string, unknown>) : undefined);
    if (!trial || typeof trial.trialId !== "string" || !trial.trialId) {
      throw new Error("durable routing-shadow trial materialization failed");
    }
    if (trial.status === "scored") {
      const scores = await runtime.invoke("evaluation-core", {
        ...envelope("evaluation:list-trial-scores", { trialId: trial.trialId }),
      });
      const scoreRows = Array.isArray(scores) ? (scores as Record<string, unknown>[]) : [];
      const correctness = scoreRows.find(
        (score) =>
          score.dimension === "correctness" &&
          score.scorerId === scorer.id &&
          score.scorerVersion === scorer.version,
      );
      if (!correctness || !Number.isFinite(correctness.score)) {
        throw new Error("durable scored trial is missing semantic correctness evidence");
      }
      completedRollouts.push({
        rollout,
        score: Number(correctness.score),
        trialId: trial.trialId,
        scoreId:
          typeof correctness.scoreId === "string" && correctness.scoreId
            ? correctness.scoreId
            : `score:${trial.trialId}:${scorer.id}:correctness`,
      });
      trialIds.push(trial.trialId);
      continue;
    }
    const alreadySubmitted = trial.status === "result_submitted";
    if (trial.status !== undefined && trial.status !== "queued" && !alreadySubmitted) {
      throw new Error("durable routing-shadow trial is not recoverable without an expired lease");
    }
    const claimed = alreadySubmitted
      ? null
      : await runtime.invoke("evaluation-core", {
          ...envelope("evaluation:claim-trial", {
            trialId: trial.trialId,
            workerId: `runtime-host:${input.requestId}`,
          }),
        });
    if (
      !alreadySubmitted &&
      (!claimed ||
        typeof claimed.trialId !== "string" ||
        typeof claimed.leaseId !== "string" ||
        claimed.trialId !== trial.trialId)
    ) {
      throw new Error("durable routing-shadow trial lease failed");
    }
    const independentlyObservedActual =
      typeof rollout.evaluationActual === "string" && rollout.evaluationActual
        ? rollout.evaluationActual
        : typeof evaluationCase.actual === "string" && evaluationCase.actual
          ? evaluationCase.actual
          : null;
    if (!independentlyObservedActual) {
      throw new Error(
        "R14_INDEPENDENT_EVIDENCE_REQUIRED: durable routing evaluation requires semantic criteria and observed evidence",
      );
    }
    // Do not derive the score input from a success/failure status.  A replay may
    // execute successfully while still failing an independently specified task
    // criterion; the runner receives bounded evidence values instead.
    const actual = independentlyObservedActual;
    const outputRef = requireTrackBReference(rollout.artifactRef, "rollout output");
    const outputDigest = requireTrackBReference(
      (rollout.outcome as Record<string, unknown> | undefined)?.outcomeDigest,
      "rollout outcome",
    );
    const execution = await runtime.invoke("evaluation-runner-local", {
      ...envelope("evaluation:execute-trial", {
        trialId: trial.trialId,
        actual,
        evaluationCriteria,
        outputRef,
        outputDigest,
        stdoutRef: outputRef,
        stderrRef: outputRef,
        exitCode: 0,
        measurements: { elapsedMs: 0, outputBytes: 0 },
      }),
      scorerDefinitions: [scorer],
    });
    if (
      !Array.isArray(execution.scores) ||
      typeof execution.outputRef !== "string" ||
      typeof execution.outputDigest !== "string" ||
      typeof execution.stdoutRef !== "string" ||
      typeof execution.stderrRef !== "string"
    ) {
      throw new Error("durable routing-shadow runner receipt is invalid");
    }
    const trialReferenceAttestation = await resolveTrackBReferenceAttestation(
      runtime,
      envelope,
      evaluationReferences,
      {
        channel: input.channel,
        scope: input.scope,
        authorizationEpoch: input.authorizationEpoch,
      },
      {
        trialOutputRef: execution.outputRef,
        trialStdoutRef: execution.stdoutRef,
        trialStderrRef: execution.stderrRef,
      },
    );
    if (!alreadySubmitted) {
      await runtime.invoke("evaluation-core", {
        ...envelope("evaluation:submit-trial-result", {
          trialId: trial.trialId,
          leaseId: claimed?.leaseId,
          workerId: `runtime-host:${input.requestId}`,
          outputRef: execution.outputRef,
          outputDigest: execution.outputDigest,
          stdoutRef: execution.stdoutRef,
          stderrRef: execution.stderrRef,
          exitCode: execution.exitCode,
          measurements: execution.measurements,
          referenceAttestation: trialReferenceAttestation,
        }),
      });
    }
    await runtime.invoke("evaluation-core", {
      ...envelope("evaluation:record-trial-score-batch", {
        trialId: trial.trialId,
        scores: execution.scores,
        referenceAttestation: trialReferenceAttestation,
      }),
    });
    const correctness = (execution.scores as Record<string, unknown>[]).find(
      (score) =>
        score.dimension === "correctness" &&
        score.scorerId === scorer.id &&
        score.scorerVersion === scorer.version,
    );
    if (!correctness || !Number.isFinite(correctness.score)) {
      throw new Error("durable semantic evaluation did not produce a correctness score");
    }
    completedRollouts.push({
      rollout,
      score: Number(correctness.score),
      trialId: trial.trialId,
      scoreId:
        typeof correctness.scoreId === "string" && correctness.scoreId
          ? correctness.scoreId
          : `score:${trial.trialId}:${scorer.id}:correctness`,
      referenceAttestation: trialReferenceAttestation,
    });
    trialIds.push(trial.trialId);
  }
  const evaluation = await runtime.invoke("evaluation-core", {
    ...envelope("evaluation:finalize-comparison-group", {
      groupId: `comparison:${input.requestId}`,
      trialIds,
      comparability,
      holdout,
    }),
  });
  const persistedEvaluation = await runtime.invoke("evaluation-core", {
    ...envelope("evaluation:read-comparison-group", { groupId: `comparison:${input.requestId}` }),
  });
  if (
    !persistedEvaluation ||
    (persistedEvaluation as Record<string, unknown>).status !== "finalized" ||
    !new Set([
      "candidate",
      "source",
      "tie",
      "rejected",
      "incomplete",
      "insufficient",
      "disagreement",
    ]).has(String((persistedEvaluation as Record<string, unknown>).outcome ?? ""))
  ) {
    throw new Error("durable routing-shadow comparison finalization failed");
  }
  const durableComparison = persistedEvaluation as Record<string, unknown>;
  const finalizedComparison = {
    groupId: durableComparison.groupId,
    comparisonId: durableComparison.groupId,
    status: durableComparison.status,
    outcome: durableComparison.outcome,
    holdout: durableComparison.holdout,
    members: durableComparison.members,
  };
  const evaluationAuthoritySecret = randomBytes(32).toString("hex");
  const finalizedComparisonReceiptPayload = {
    schemaVersion: "role-model.evaluation-comparison-readback-receipt.v1",
    kind: "evaluation_core_comparison_readback",
    channel: input.channel,
    routePackage: input.routePackage,
    comparisonDigest: createHash("sha256")
      .update(JSON.stringify(canonicalizeRun88Proof(finalizedComparison)))
      .digest("hex"),
  };
  const finalizedComparisonReceipt = {
    payload: finalizedComparisonReceiptPayload,
    signature: createHmac("sha256", evaluationAuthoritySecret)
      .update(JSON.stringify(canonicalizeRun88Proof(finalizedComparisonReceiptPayload)))
      .digest("hex"),
  };
  const knowledgeEvaluation = {
    environment: "local-routing-evaluation",
    scores: Array.isArray(durableComparison.members)
      ? durableComparison.members.map((member) => (member as Record<string, unknown>).score)
      : [],
    provenance: {
      policy: "run96-routing-shadow",
      task: "route-selection",
      scorer: `${scorer.id}@${scorer.version}`,
      split: "holdout",
      seed: 87,
      evidenceRef: input.sourceGraphRef,
    },
    finalizedComparison,
    finalizedComparisonReceipt,
  };
  const signals = await runtime.invoke(
    "trajectory-signals",
    envelope("signals:analyze-finalized-evaluation", {
      routeDecisionId: input.sourceDecisionId,
      graphRef: input.sourceGraphRef,
      replayRef: replayDigest,
      routePackage: input.routePackage,
      events: input.trajectoryEvents,
      finalizedEvaluation: persistedEvaluation,
    }),
  );
  const signalRecord = signals as Record<string, unknown>;
  // R16 forbids us from inventing a trajectory merely to complete an otherwise
  // finalized replay/evaluation join.  The extension's bounded degradation
  // receipt is therefore a non-learning outcome, not missing provenance or a
  // reason to affect the baseline route.  Preserve the evidence already
  // collected, make the unavailable advisory explicit, and stop before profile
  // or knowledge mutation.
  if (
    signalRecord.schemaVersion === "role-model.degradation-receipt.v1" &&
    signalRecord.degraded === true &&
    signalRecord.capability === "signals:analyze-finalized-evaluation" &&
    signalRecord.mode === "omit_signals"
  ) {
    const advisoryNowMs = Date.now();
    const advisoryAuthorization = createTrackBRouteAdvisoryAuthorization({
      authoritySecret: evaluationAuthoritySecret,
      keyId: `runtime:${input.requestId}`,
      issuedAtMs: advisoryNowMs,
      expiresAtMs: advisoryNowMs + 60_000,
      claims: {
        baselineDecisionId: input.sourceDecisionId,
        channel: input.channel,
        scope: input.scope,
        authorizationEpoch: input.authorizationEpoch,
        routePackage: input.routePackage,
        profileSnapshotIds: [],
        candidateId: null,
        advisoryState: "unavailable",
        confidence: 0,
      },
    });
    const advisory = resolveTrackBRouteAdvisory({
      baselineDecisionId: input.sourceDecisionId,
      channel: input.channel,
      scope: input.scope,
      authorizationEpoch: input.authorizationEpoch,
      routePackage: input.routePackage,
      profileSnapshotIds: [],
      candidateId: null,
      advisoryState: "unavailable",
      confidence: 0,
      nowMs: advisoryNowMs,
      authorization: advisoryAuthorization,
      authorizationValidator: (authorization, expected, nowMs) =>
        verifyTrackBRouteAdvisoryAuthorization(authorization, evaluationAuthoritySecret, {
          expected,
          nowMs,
        }),
    });
    const candidate = {
      id: null,
      state: "insufficient_trajectory_evidence",
      refusalCode: "R16_TRAJECTORY_EVIDENCE_UNAVAILABLE",
      productionEffects: {
        providerCalls: 0,
        promptMutations: 0,
        routeMutations: 0,
        weightMutations: 0,
        activeProfileMutations: 0,
      },
    };
    return {
      replay,
      evaluation: persistedEvaluation,
      signals,
      profile: {
        state: "not_run",
        reason: "R16_TRAJECTORY_EVIDENCE_UNAVAILABLE",
      },
      candidate,
      advisory,
      productionState: structuredClone(input.productionState),
      receipt: {
        schemaVersion: "role-model.track-b-shadow-pipeline-receipt.v1",
        mode: "shadow",
        requestId: input.requestId,
        providerCalls: 0,
        productionMutation: false,
        candidateId: null,
        advisoryDisposition: advisory.disposition,
        advisoryId: advisory.advisoryId,
        decisionAdvice: structuredClone(advisory.decisionAdvice),
        learningDisposition: "insufficient_trajectory_evidence",
      },
    };
  }
  if (
    signalRecord.routeDecisionId !== replayForKnowledge.sourceDecisionId ||
    signalRecord.graphRef !== replayForKnowledge.sourceGraphRef ||
    !Array.isArray(signalRecord.signals)
  ) {
    throw new Error("finalized trajectory signals must retain replay provenance");
  }
  const linkedTrialScoreRefs = completedRollouts.map(({ trialId, scoreId, score }) => ({
    trialId,
    scoreId,
    score,
    confidence: 1,
  }));
  const knowledgeSignalRefs = signalRecord.signals.map((signal) => {
    const record = signal as Record<string, unknown>;
    const lineage =
      record.lineage && typeof record.lineage === "object" && !Array.isArray(record.lineage)
        ? record.lineage
        : {
            traceRef: replayForKnowledge.sourceGraphRef,
            replayRef: replayDigest,
            evaluationId: durableComparison.groupId,
            routeDecisionId: input.sourceDecisionId,
            routePackage: input.routePackage,
            trialScoreRefs: linkedTrialScoreRefs,
          };
    const compact = {
      signalInstanceId: record.signalInstanceId,
      signalType: record.signalType,
      dimension: record.dimension,
      unit: record.unit,
      direction: record.direction,
      value: record.value,
      confidence: record.confidence,
      weight: record.weight,
      missingness: record.missingness,
      evidenceRef: record.evidenceRef,
      routePackage: record.routePackage,
      evaluationId: record.evaluationId ?? durableComparison.groupId,
      trialScoreRefs: Array.isArray(record.trialScoreRefs)
        ? record.trialScoreRefs
        : linkedTrialScoreRefs,
      lineage,
    };
    if (
      typeof compact.signalInstanceId !== "string" ||
      !compact.signalInstanceId ||
      typeof compact.signalType !== "string" ||
      !compact.signalType ||
      typeof compact.dimension !== "string" ||
      !compact.dimension ||
      typeof compact.unit !== "string" ||
      !compact.unit ||
      typeof compact.direction !== "string" ||
      !compact.direction ||
      !Number.isFinite(compact.value) ||
      !Number.isFinite(compact.confidence) ||
      !Number.isFinite(compact.weight) ||
      typeof compact.missingness !== "string" ||
      !compact.missingness ||
      typeof compact.evidenceRef !== "string" ||
      !compact.evidenceRef ||
      (compact.routePackage !== undefined &&
        (typeof compact.routePackage !== "string" || !compact.routePackage)) ||
      Buffer.byteLength(JSON.stringify(compact), "utf8") > TRACK_B_INLINE_CONTENT_MAX_BYTES
    ) {
      throw new Error("finalized trajectory signal reference exceeds the knowledge boundary");
    }
    return compact;
  });
  const finalizedTrialScoreRefs = completedRollouts.map(({ trialId, scoreId, score }) => ({
    trialId,
    scoreId,
    score,
    confidence: 1,
  }));
  const sourceGeneration = createHash("sha256")
    .update(
      JSON.stringify(
        canonicalizeRun88Proof({
          groupId: durableComparison.groupId,
          replayRef: replayDigest,
          trialScoreRefs: finalizedTrialScoreRefs,
        }),
      ),
    )
    .digest("hex");
  const evaluationSignalProvenance = {
    groupId: durableComparison.groupId,
    status: "finalized",
    outcome: durableComparison.outcome,
  };
  const learningSignalEvidence = {
    schemaVersion: "role-model.finalized-evaluation-signal.v1",
    groupId: durableComparison.groupId,
    outcome: durableComparison.outcome,
    traceRef: replayForKnowledge.sourceGraphRef,
    replayRef: replayDigest,
    routePackage: input.routePackage,
    scorerSetVersion,
    trialScoreRefs: finalizedTrialScoreRefs,
    sourceGeneration,
  };
  const signalsWithProvenance = {
    ...(signals && typeof signals === "object" && !Array.isArray(signals)
      ? (signals as Record<string, unknown>)
      : {}),
    evaluationProvenance: evaluationSignalProvenance,
    learningEvidence: learningSignalEvidence,
  };
  const signalsForKnowledge = {
    routeDecisionId: signalRecord.routeDecisionId,
    graphRef: signalRecord.graphRef,
    signals: knowledgeSignalRefs,
    evaluationProvenance: evaluationSignalProvenance,
    learningEvidence: learningSignalEvidence,
  };
  const observedProfileDimensions = (rollout: Record<string, unknown>) => {
    const raw = rollout.observedDimensions;
    const dimensions =
      raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const names = [
      "task",
      "repository",
      "prompt",
      "tool",
      "sampling",
      "experience",
      "environment",
    ] as const;
    const unknownDimensions = names.filter(
      (name) => dimensions[name] === null || dimensions[name] === undefined,
    );
    const declaredUnknown = Array.isArray(dimensions.unknownDimensions)
      ? dimensions.unknownDimensions.filter(
          (name): name is string =>
            typeof name === "string" && names.includes(name as (typeof names)[number]),
        )
      : [];
    return {
      task: dimensions.task ?? null,
      repository: dimensions.repository ?? null,
      prompt: dimensions.prompt ?? null,
      tool: dimensions.tool ?? null,
      sampling: dimensions.sampling ?? null,
      experience: dimensions.experience ?? null,
      environment: dimensions.environment ?? null,
      unknownDimensions: [...new Set([...unknownDimensions, ...declaredUnknown])].sort(),
    };
  };
  const profile = await runtime.invoke("profile-learner", {
    ...envelope("profile:estimate-finalized-evaluation", {
      finalizedEvaluation: persistedEvaluation,
      signals: signalsWithProvenance,
      rows: completedRollouts.map(({ rollout, score, trialId, scoreId }) => ({
        model: rollout.modelId,
        endpoint: rollout.endpointId,
        effort: rollout.reasoningEffort,
        ...observedProfileDimensions(rollout),
        routePackage: rollout.routePackage,
        outcome: score,
        propensity: rollout.propensity,
        evidenceRef: rollout.evidenceRef,
        trialId,
        scoreId,
      })),
    }),
  });
  const profileRecord = profile as Record<string, unknown>;
  if (typeof profileRecord.digest !== "string" || !profileRecord.digest || !profileRecord.effects) {
    throw new Error("finalized profile estimate must retain attributable evidence");
  }
  const profileForKnowledge = {
    digest: profileRecord.digest,
    effects: profileRecord.effects,
  };
  const scoredRollouts = completedRollouts.map(({ rollout, score, trialId, scoreId }) => {
    if (typeof rollout.evidenceRef !== "string" || !rollout.evidenceRef) {
      throw new Error("routing-shadow rollout evidence references are required");
    }
    return {
      evidenceRef: rollout.evidenceRef,
      // Derived only from the durable Runner Local semantic scorer receipt,
      // never from a transport status or output equality proxy.
      score,
      trialId,
      scoreId,
    };
  });
  const positive = scoredRollouts.filter((rollout) => rollout.score === 1);
  const negative = scoredRollouts.filter((rollout) => rollout.score === 0);
  const proofForEvidence = (evidenceRef: string): Record<string, unknown> => {
    const references = referenceAttestation.references;
    if (!references || typeof references !== "object" || Array.isArray(references)) {
      throw new Error("trusted evaluation evidence proofs are required for knowledge learning");
    }
    const proof = Object.values(references as Record<string, unknown>).find(
      (candidate) =>
        candidate &&
        typeof candidate === "object" &&
        !Array.isArray(candidate) &&
        (candidate as Record<string, unknown>).reference === evidenceRef,
    );
    if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
      throw new Error("trusted evaluation evidence proof is missing from the attestation");
    }
    return proof as Record<string, unknown>;
  };
  const knowledgeEvidenceRow = (rollout: (typeof scoredRollouts)[number]) => ({
    evidenceRef: rollout.evidenceRef,
    score: rollout.score,
    evidenceKind: "evaluation",
    learningCapable: true,
    evaluationRef: durableComparison.groupId,
    trialId: rollout.trialId,
    scoreId: rollout.scoreId,
    sourceGroupId: durableComparison.groupId,
    referenceProof: proofForEvidence(rollout.evidenceRef),
  });
  const candidate =
    positive.length && negative.length
      ? await runtime.invoke("knowledge-worker", {
          ...envelope("knowledge:eval-consumer", {
            replay: replayForKnowledge,
            evaluation: knowledgeEvaluation,
            signals: signalsForKnowledge,
            profile: profileForKnowledge,
            comparableGroup: {
              policy: "routing-shadow",
              task: "route-selection",
              scorer: `${scorer.id}@${scorer.version}`,
              split: "holdout",
              seed: 87,
              comparabilityKey: `${input.sourceDecisionId}:holdout`,
              positive: positive.map(knowledgeEvidenceRow),
              negative: negative.map(knowledgeEvidenceRow),
              candidateSet: candidateSet.map((candidate) => ({
                routePackage: candidate.routePackage,
                endpointId: candidate.endpointId,
                propensity: candidate.propensity,
              })),
            },
            holdout: {
              ...holdout,
              evidenceRef: evaluationReferences.inputRef,
              passed: durableComparison.outcome === "candidate",
            },
            scope: {
              routePackage: input.routePackage,
              channel: input.channel,
              scopeId: input.scope,
            },
          }),
          evaluationAuthoritySecret,
        })
      : {
          id: null,
          state: "insufficient_comparable_evidence",
          refusalCode: "R14_INSUFFICIENT_ROLLOUT_EVIDENCE",
        };
  const candidateId =
    typeof (candidate as Record<string, unknown>).id === "string"
      ? ((candidate as Record<string, unknown>).id as string)
      : null;
  const profileConfidence = (profile as Record<string, unknown>).confidence;
  const candidateConfidence = (candidate as Record<string, unknown>).confidence;
  const advisoryConfidence =
    typeof profileConfidence === "number" && Number.isFinite(profileConfidence)
      ? Math.max(0, Math.min(1, profileConfidence))
      : typeof candidateConfidence === "number" && Number.isFinite(candidateConfidence)
        ? Math.max(0, Math.min(1, candidateConfidence))
        : 0;
  const advisoryNowMs = Date.now();
  const advisoryAuthorization = createTrackBRouteAdvisoryAuthorization({
    authoritySecret: evaluationAuthoritySecret,
    keyId: `runtime:${input.requestId}`,
    issuedAtMs: advisoryNowMs,
    expiresAtMs: advisoryNowMs + 60_000,
    claims: {
      baselineDecisionId: input.sourceDecisionId,
      channel: input.channel,
      scope: input.scope,
      authorizationEpoch: input.authorizationEpoch,
      routePackage: input.routePackage,
      profileSnapshotIds: Array.isArray((profile as Record<string, unknown>).snapshotIds)
        ? ((profile as Record<string, unknown>).snapshotIds as unknown[]).filter(
            (snapshotId): snapshotId is string => typeof snapshotId === "string",
          )
        : [],
      candidateId,
      advisoryState: "fresh",
      confidence: advisoryConfidence,
    },
  });
  const advisory = resolveTrackBRouteAdvisory({
    baselineDecisionId: input.sourceDecisionId,
    channel: input.channel,
    scope: input.scope,
    authorizationEpoch: input.authorizationEpoch,
    routePackage: input.routePackage,
    profileSnapshotIds: Array.isArray((profile as Record<string, unknown>).snapshotIds)
      ? ((profile as Record<string, unknown>).snapshotIds as unknown[]).filter(
          (snapshotId): snapshotId is string => typeof snapshotId === "string",
        )
      : [],
    candidateId: candidateId,
    confidence: advisoryConfidence,
    nowMs: advisoryNowMs,
    authorization: advisoryAuthorization,
    authorizationValidator: (authorization, expected, nowMs) =>
      verifyTrackBRouteAdvisoryAuthorization(authorization, evaluationAuthoritySecret, {
        expected,
        nowMs,
      }),
  });
  return {
    replay,
    evaluation: persistedEvaluation,
    signals,
    profile,
    candidate,
    advisory,
    productionState: structuredClone(input.productionState),
    receipt: {
      schemaVersion: "role-model.track-b-shadow-pipeline-receipt.v1",
      mode: "shadow",
      requestId: input.requestId,
      providerCalls: 0,
      productionMutation: false,
      candidateId: candidate.id ?? null,
      advisoryDisposition: advisory.disposition,
      // Keep the complete advice disposition in the durable pipeline receipt so
      // RouterDecision read models can report every considered/accepted/rejected
      // and stale/unavailable advisory without reconstructing it from a sibling
      // result or mutating the baseline decision.
      advisoryId: advisory.advisoryId,
      decisionAdvice: structuredClone(advisory.decisionAdvice),
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
    /**
     * R3: when the runtime has distinct configured candidates, the observation
     * records a durable replay intent instead of the `R14_NO_DISTINCT_COUNTERFACTUAL`
     * refusal. The canonical extension closure is unchanged: replay-core,
     * evaluation-runner-local, and trajectory-signals still run, so the closure stays
     * truthful and the post-observation remains durable.
     */
    readonly replayIntent?: Readonly<{
      jobId: string;
      candidateEndpointIds: readonly string[];
      accepted: boolean;
    }>;
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
      disposition: input.replayIntent
        ? "replay_intent_enqueued_for_configured_candidates"
        : "observation_only_no_distinct_counterfactual",
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
  // Without distinct configured candidates this path exists only because no
  // comparable evidence was available, and the refusal names that blocking input.
  // With distinct candidates the same closure runs, but the durable outcome is the
  // enqueued replay intent; there is no comparability refusal to report.
  const refusalCode = input.replayIntent ? null : "R14_NO_DISTINCT_COUNTERFACTUAL";
  const profile = {
    schemaVersion: "role-model.track-b-observation-profile-receipt.v1",
    state: "not_run",
    reason: refusalCode ?? "awaiting_replay",
    durableMutation: false,
    authoritative: false,
  } as const;
  return {
    replay,
    evaluation,
    signals,
    profile,
    productionState: structuredClone(input.productionState),
    receipt: {
      schemaVersion: "role-model.track-b-shadow-pipeline-receipt.v1",
      mode: "shadow",
      status: input.replayIntent ? "replay_enqueued" : "insufficient_comparable_evidence",
      ...(refusalCode ? { refusalCode } : {}),
      requestId: input.requestId,
      providerCalls: 0,
      productionMutation: false,
      candidateId: null,
      ...(input.replayIntent
        ? {
            replayIntentJobId: input.replayIntent.jobId,
            replayIntentAccepted: input.replayIntent.accepted,
            candidateEndpointIds: [...input.replayIntent.candidateEndpointIds],
          }
        : {}),
    },
  };
}

/**
 * Run 97 replay-intent pipeline.
 *
 * A live request whose runtime has at least one distinct configured endpoint is
 * replay work, not an observation-only refusal: the request is durably enqueued as
 * a replay intent (bound to the capture scope) so the automatic producer can
 * replay it against the configured candidate set. No provider call happens here,
 * the routing decision is untouched, and the receipt carries no refusal code.
 *
 * The observation closure itself stays in `runTrackBObservationPipeline`: every
 * canonical extension still runs and records a durable output, so a cutover cannot
 * leave the post-observation closure incomplete (an incomplete closure fails the
 * observation and retries forever on the outbox).
 */
async function runTrackBReplayIntentPipeline(
  runtime: TrackBShadowPipelineRuntime,
  input: {
    readonly requestId: string;
    readonly channel: "development" | "stage" | "production";
    readonly scope: string;
    readonly authorizationEpoch: number;
    readonly productionState: Readonly<Record<string, unknown>>;
    readonly routePackage: string;
    readonly sourceDecisionId: string;
    readonly sourceGraphRef: string;
    readonly trajectoryEvents: readonly Record<string, unknown>[];
    readonly candidates: readonly string[];
    readonly identity: TrackBVariantIdentity;
    readonly occurrence: Readonly<{ occurrenceId: string; contentId: string }>;
  },
) {
  const scheduler = createReplayIntentScheduler({
    runtime,
    requestId: input.requestId,
    channel: input.channel,
    scope: input.scope,
    authorizationEpoch: input.authorizationEpoch,
    ownerId: `runtime-host:post-observation:${input.requestId}`.slice(0, 256),
  });
  const replayIntentJobId = `replay-intent:${input.requestId}`;
  const enqueued = await scheduler.enqueue({
    jobId: replayIntentJobId,
    replayJobId: `capture:${input.requestId}`,
    deadlineAtMs: Date.now() + 24 * 60 * 60 * 1000,
  });
  return runTrackBObservationPipeline(runtime, {
    requestId: input.requestId,
    channel: input.channel,
    scope: input.scope,
    authorizationEpoch: input.authorizationEpoch,
    productionState: input.productionState,
    routePackage: input.routePackage,
    sourceDecisionId: input.sourceDecisionId,
    sourceGraphRef: input.sourceGraphRef,
    trajectoryEvents: input.trajectoryEvents,
    identity: input.identity,
    occurrence: input.occurrence,
    replayIntent: {
      jobId: replayIntentJobId,
      candidateEndpointIds: [...input.candidates],
      accepted: enqueued.accepted === true,
    },
  });
}

const TRACK_B_R16_TRAJECTORY_REFUSAL = "R16_TRAJECTORY_EVIDENCE_UNAVAILABLE" as const;
const TRACK_B_RECOGNIZED_TRAJECTORY_TYPES = new Set([
  "request_started",
  "route_selected",
  "provider_error",
  "provider_success",
  "response_received",
  "model_response",
  "tool_success",
  "tool_failure",
  "user_correction",
  "assistant_correction",
  "semantic_evaluation",
  "evaluation_outcome",
  "task_completed",
  "outcome",
]);

function trackBTrajectoryTimestamp(event: Record<string, unknown>): number | null {
  for (const key of [
    "timestampMs",
    "timestamp_ms",
    "occurredAtMs",
    "occurred_at_ms",
    "createdAtMs",
    "created_at_ms",
  ]) {
    const value = event[key];
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  }
  return null;
}

function hasFinalizableTrackBTrajectory(
  events: readonly Record<string, unknown>[],
  requestId: string,
): boolean {
  if (events.length < 2 || events.length > TRACK_B_OUTBOX_OBSERVATION_COLLECTION_CAP) return false;
  const ids = new Set<string>();
  let previousTimestamp = -1;
  for (const event of events) {
    const id = outboxSafeText(event.id, 512);
    const type = outboxSafeText(event.type, 128);
    const timestamp = trackBTrajectoryTimestamp(event);
    if (
      !id ||
      ids.has(id) ||
      !type ||
      !TRACK_B_RECOGNIZED_TRAJECTORY_TYPES.has(type) ||
      timestamp === null ||
      timestamp <= previousTimestamp
    ) {
      return false;
    }
    if (event.requestId !== undefined && event.requestId !== requestId) return false;
    ids.add(id);
    previousTimestamp = timestamp;
  }
  return true;
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
    /**
     * R3: the counterfactual candidate set comes from the running registry, not
     * from the capture's frozen decision snapshot (which is provenance only). The
     * host passes the configured endpoint ids so a real request with at least one
     * distinct configured endpoint becomes replay work instead of an
     * `R14_NO_DISTINCT_COUNTERFACTUAL` refusal.
     */
    readonly configuredCandidateEndpointIds?: readonly string[];
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
      // A closure is the authoritative durable proof for the canonical
      // extension identity, rather than a trace of every internal read after
      // it has written that proof.  Record the first business output produced
      // by each extension; subsequent reads and projections remain executed
      // but cannot create duplicate closure rows for the same extension.
      if (closureEntries.has(id)) return result;
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
  const trajectoryEvents = Array.isArray(observation.trajectoryEvents)
    ? observation.trajectoryEvents.filter((event): event is Record<string, unknown> =>
        Boolean(event && typeof event === "object" && !Array.isArray(event)),
      )
    : [];
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
  const productionState = {
    routingDecisionId: sourceDecisionId,
    endpointId: routePackage,
    identity,
    immutable: true,
  } as const;
  const sourceHash = createHash("sha256")
    .update(
      JSON.stringify(
        canonicalizeRun88Proof({
          requestId,
          sourceDecisionId,
          routePackage,
          identity,
          trajectoryEvents,
        }),
      ),
    )
    .digest("hex");
  const hasComparableEvidence = routingShadowEvidence !== null && routingShadowCases.length > 0;
  if (hasComparableEvidence && !hasFinalizableTrackBTrajectory(trajectoryEvents, requestId)) {
    // Insufficient trajectory is a complete, read-only observation. Probe every
    // canonical extension so the closure remains truthful, but do not dispatch
    // replay/evaluation/profile/knowledge business capabilities or fabricate an
    // event that could make the observation look finalizable.
    for (const extensionId of TRACK_B_CANONICAL_EXTENSION_IDS) {
      await observedRuntime.invoke(extensionId, businessEnvelope("health:probe"));
    }
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
    const projection = createProjectionV2({
      scope: input.scope,
      purpose: "routing_shadow",
      permittedUse: false,
      authorizationState: "unknown",
      validUntilMs: null,
      trainingAllowed: false,
      evaluatedAtMs: Date.now(),
      evidence: [
        {
          artifactRef: `sha256:${sourceHash}`,
          sourceHash: `sha256:${sourceHash}`,
          scope: input.scope,
          verified: false,
          capabilities: ["routing_history", "full_replay"],
        },
      ],
      payload: {
        routePackage,
        sourceDecisionId,
        identity,
        candidateId: null,
        learningDisposition: "insufficient_trajectory_evidence",
      },
    });
    return {
      pipeline: {
        schemaVersion: "role-model.track-b-shadow-pipeline-receipt.v1",
        mode: "shadow",
        status: "insufficient_trajectory_evidence",
        requestId,
        providerCalls: 0,
        productionMutation: false,
        candidateId: null,
        refusalCode: TRACK_B_R16_TRAJECTORY_REFUSAL,
        learningDisposition: "insufficient_trajectory_evidence",
      },
      advisory: null,
      projection,
      consumption: null,
      repositoryContext: {
        available: false,
        unavailableReason: TRACK_B_R16_TRAJECTORY_REFUSAL,
        diagnostics: [],
      },
      extensionClosure,
      productionState: structuredClone(productionState),
    };
  }
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
  const sourceGraphRef = `sha256:${sourceHash}`;
  // R3: the frozen decision snapshot is provenance, never a candidate filter. A
  // live request with at least one distinct configured endpoint is replay work, so
  // it must not fall through to the observation-only refusal.
  const configuredCounterfactualCandidates = [
    ...new Set(
      (input.configuredCandidateEndpointIds ?? []).filter(
        (endpointId): endpointId is string =>
          typeof endpointId === "string"
          && endpointId.trim().length > 0
          && endpointId.trim() !== routePackage,
      ),
    ),
  ]
    .sort()
    .slice(0, DEFAULT_REPLAY_CANDIDATE_CAP);
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
          evaluationReferences:
            routingShadowEvidence.evaluationReferences &&
            typeof routingShadowEvidence.evaluationReferences === "object"
              ? (routingShadowEvidence.evaluationReferences as TrackBEvaluationReferences)
              : observation.evaluationReferences &&
                  typeof observation.evaluationReferences === "object"
                ? (observation.evaluationReferences as TrackBEvaluationReferences)
                : undefined,
          identity,
          occurrence,
        })
      : configuredCounterfactualCandidates.length > 0
        ? await runTrackBReplayIntentPipeline(observedRuntime, {
            requestId,
            channel: input.channel,
            scope: input.scope,
            authorizationEpoch: input.authorizationEpoch,
            productionState,
            routePackage,
            sourceDecisionId,
            sourceGraphRef,
            trajectoryEvents,
            candidates: configuredCounterfactualCandidates,
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
  const pipelineReceipt = pipeline.receipt as Record<string, unknown>;
  const pipelineCandidateId =
    "candidate" in pipeline && pipeline.candidate && typeof pipeline.candidate.id === "string"
      ? pipeline.candidate.id
      : null;
  const learningEligible =
    pipelineCandidateId !== null &&
    pipelineReceipt.productionMutation === true &&
    pipelineReceipt.refusalCode === undefined &&
    pipelineReceipt.learningDisposition !== "insufficient_trajectory_evidence";
  const projection = createProjectionV2({
    scope: input.scope,
    purpose: "routing_shadow",
    permittedUse: learningEligible,
    authorizationState: learningEligible ? "authorized" : "unknown",
    validUntilMs: null,
    trainingAllowed: learningEligible,
    evaluatedAtMs: Date.now(),
    evidence: [
      {
        artifactRef: sourceGraphRef,
        sourceHash: `sha256:${sourceHash}`,
        scope: input.scope,
        verified: learningEligible,
        capabilities: ["routing_history", "full_replay"],
      },
    ],
    payload: {
      routePackage,
      sourceDecisionId,
      identity,
      candidateId: pipelineCandidateId,
      learningDisposition: learningEligible ? "authorized" : "insufficient_evidence",
    },
  });
  const consumption = learningEligible
    ? await consumeTrackBProjection(observedRuntime, projection, {
        channel: input.channel,
        authorizationEpoch: input.authorizationEpoch,
        identity: { ...identity },
        occurrence,
      })
    : null;
  // A refusal to learn is still a complete Track B execution.  Probe the
  // learning consumers read-only so the thirteen-extension closure remains
  // truthful without turning an insufficient observation into a mutation.
  for (const extensionId of ["evaluation-core", "profile-learner", "knowledge-worker"]) {
    if (!closureEntries.has(extensionId)) {
      await observedRuntime.invoke(extensionId, businessEnvelope("health:probe"));
    }
  }
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
    // This is an asynchronous observation result.  It may explain a shadow
    // comparison, but it never changes the already-persisted baseline decision.
    // An explicit null lets decision/receipt readers distinguish "not considered"
    // from a missing or malformed advisory payload.
    advisory: "advisory" in pipeline ? pipeline.advisory : null,
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
  const contributionOutcome = deriveRuntimeContributionOutcomeFromObservation(observation);
  if (!contributionOutcome) return result;
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
    ...contributionOutcome,
  });
  // The aggregate service is the durable authority for upload state, while this
  // request correlation is generated by the runtime that observed the routed
  // request. Keep the correlation alongside the opaque service result so a
  // read-only verifier can make an exact request-to-cloud join without learning
  // any credential, payload, or private graph identity.
  const contributionReceipt =
    contribution && typeof contribution === "object" && !Array.isArray(contribution)
      ? { ...contribution, correlationId }
      : contribution;
  return { ...result, contribution: contributionReceipt, contributionCorrelationId: correlationId };
}

interface ExtensionRuntimeState {
  readonly id: string;
  readonly desiredState: "enabled" | "disabled";
  readonly lifecycle: string;
  readonly pid: number | null;
  readonly revision: number;
  readonly previousDesiredState?: "enabled" | "disabled";
  readonly transitioning?: boolean;
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
        readonly transitioning: boolean;
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
    const next = {
      ...current,
      lifecycle: observed.lifecycle,
      pid: observed.pid,
      transitioning: observed.transitioning === true,
    };
    states.set(id, next);
    return next;
  };
  const persist = async () => {
    const document = {
      schemaVersion: "role-model.extension-runtime-state.v1",
      // The supervised-transition flag is live readiness information, not
      // durable runtime state, so the persisted document stays schema-stable.
      states: ids.map((id) => {
        const { transitioning: _transitioning, ...durable } = refresh(id);
        return durable;
      }),
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
        transitioning: observed.transitioning === true,
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
  validateProductionExtensionSet(options.extensions);
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
  authorizationEpoch?: number;
  artifactDigestKeyFile?: string;
  artifactEncryptionKeyFile?: string;
  trustMaterialFile?: string;
  developmentVerificationLeaseFile?: string;
  developmentVerificationTrustKeyFile?: string;
  developmentVerificationDeploymentIds?: readonly string[];
  developmentVerificationRevocationEpoch?: number;
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
  const authorizationEpoch =
    options.authorizationEpoch === undefined ? 1 : options.authorizationEpoch;
  if (!Number.isSafeInteger(authorizationEpoch) || authorizationEpoch < 0) {
    throw new Error("Track B sidecar authorization epoch must be a non-negative safe integer");
  }
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
          "--authorization-epoch",
          String(authorizationEpoch),
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
          ...(options.developmentVerificationLeaseFile
            ? ["--development-verification-lease-file", options.developmentVerificationLeaseFile]
            : []),
          ...(options.developmentVerificationTrustKeyFile
            ? [
                "--development-verification-trust-key-file",
                options.developmentVerificationTrustKeyFile,
              ]
            : []),
          ...(options.developmentVerificationDeploymentIds?.length
            ? [
                "--development-verification-deployment-ids",
                options.developmentVerificationDeploymentIds.join(","),
              ]
            : []),
          ...(Number.isSafeInteger(options.developmentVerificationRevocationEpoch) &&
          (options.developmentVerificationRevocationEpoch ?? -1) >= 0
            ? [
                "--development-verification-revocation-epoch",
                String(options.developmentVerificationRevocationEpoch),
              ]
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
