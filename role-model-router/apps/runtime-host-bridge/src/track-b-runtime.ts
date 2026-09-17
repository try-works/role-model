import { spawn } from "node:child_process";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
  verify as verifySignature,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { copyFile, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Run 99 R33 D7: the declared, family-stratified holdout split.
import {
  buildFamilyStratifiedHoldout,
  computeHoldoutMembershipDigest,
  RUN99_HOLDOUT_SPLIT_SEED,
} from "./track-b-holdout-split.js";
import { createInterface } from "node:readline";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

/**
 * Run 98 addendum 04 (live finding, stage v180, 2026-09-16).
 *
 * This process builds its own extension host for the replay/evaluation path and never passed
 * `timeoutMs`, so it inherited the extension host's one-second default while the sidecar's hosts next
 * to it ran on 60 s. Every evaluation slower than a second was reported as
 * `extension evaluation-core failed: timeout`, the replay deferred, and evaluation jobs sat in
 * `scoring`. The timing profile is bounded, shared and operator-tunable; the private sidecar reads the
 * same variables so both halves of the runtime are governed by one contract.
 */
export function extensionHostTiming(env: Record<string, string | undefined> = process.env): {
  readonly timeoutMs: number;
  readonly startupTimeoutMs: number;
  readonly maxRestarts: number;
  readonly restartBackoffMs: number;
  readonly restartCooldownMs: number;
} {
  const bounded = (value: string | undefined, fallback: number, min: number, max: number): number => {
    const numeric =
      typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
    return Number.isSafeInteger(numeric) && numeric >= min && numeric <= max ? numeric : fallback;
  };
  return {
    timeoutMs: bounded(env.ROLE_MODEL_EXTENSION_INVOKE_TIMEOUT_MS, 60_000, 100, 600_000),
    startupTimeoutMs: bounded(env.ROLE_MODEL_EXTENSION_STARTUP_TIMEOUT_MS, 30_000, 100, 600_000),
    maxRestarts: bounded(env.ROLE_MODEL_EXTENSION_MAX_RESTARTS, 3, 0, 20),
    restartBackoffMs: bounded(env.ROLE_MODEL_EXTENSION_RESTART_BACKOFF_MS, 10, 0, 10_000),
    restartCooldownMs: bounded(
      env.ROLE_MODEL_EXTENSION_RESTART_COOLDOWN_MS,
      60_000,
      0,
      3_600_000,
    ),
  };
}

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
import {
  type TrackBRouteAdvisorySourceResult,
  readTrackBRouteAdvisoryFromRollout,
} from "./route-advisory-source.js";
import {
  type TrackBLearningPassRuntime,
  runTrackBLearningPass,
} from "./track-b-learning-pass.js";
import {
  TRACK_B_PAIRWISE_JUDGE_WINNER_COUNTERFACTUAL,
  type TrackBPairwiseJudge,
  pairwiseJudgeScores,
} from "./track-b-shadow-judge.js";
import {
  buildLearnedExperienceCandidate,
  buildRoutePackageActivationReceipt,
  buildRoutingEvaluationExecutionContext,
  buildRoutingRolloutGroupLifecycle,
  emitTrackBContract,
} from "./track-b-contract-emission.js";
import {
  boundedTrackBLearningRefusal,
  deriveTrackBLearningCapability,
  selectTrackBLearningTarget,
  selectTrackBLearningEvidence,
} from "./track-b-learning-evidence.js";

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
/**
 * Run 99 R33 live finding (stage v147, with real coding-agent traffic): a mature stage root needs
 * longer than 90 s to reconcile durable state before it can publish readiness — the host reported
 * `Track B sidecar readiness timeout` on a boot that the previous build completed, because the
 * private operations bound now allows a slow durable commit to run to completion instead of being
 * aborted at eight seconds. The startup budget is a bound, not a latency claim, and it stays
 * operator-tunable (`ROLE_MODEL_TRACK_B_SIDECAR_STARTUP_TIMEOUT_MS`) without a rebuild.
 */
export const TRACK_B_SIDECAR_STARTUP_TIMEOUT_MS = (() => {
  const configured = Number.parseInt(
    process.env.ROLE_MODEL_TRACK_B_SIDECAR_STARTUP_TIMEOUT_MS ?? "",
    10,
  );
  return Number.isSafeInteger(configured) && configured > 0 ? configured : 240_000;
})();

/**
 * Run 98 R2: durable replay job states that can never be dispatched again. RC16 freezes a
 * replay job's deadline at creation, so a job that already failed terminally must never be
 * re-claimed; the automatic producer retires the capture from these states.
 */
const TERMINAL_REPLAY_JOB_STATES = new Set(["timed_out", "expired", "failed", "cancelled"]);

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
  // Run 98 R17: the Learning UI readback and rollout actions must survive the packaged
  // bridge-option projection, or the operator routes answer "unavailable" behind the SEA.
  "readLearningState",
  "readLearningProfile",
  "readLearningAdvisory",
  "updateLearningMode",
  "rollbackLearning",
  "readLearningRollout",
  "readLearningRecords",
  "readLearningDecisions",
  "readLearningMeasurement",
  "readLearningActivity",
  "readLearningHistory",
  "readLearningPolicy",
  "setLearningPolicy",
  "rollbackLearningPolicy",
  "activateLearningPack",
  "rollbackLearningPack",
  "engageLearningKillSwitch",
] as const;

export function createTrackBBridgeServerOptions<
  Backend extends Record<(typeof trackBServerOperationNames)[number], unknown>,
>(backend: Backend) {
  return Object.fromEntries(
    trackBServerOperationNames.map((name) => [name, backend[name]]),
  ) as Pick<Backend, (typeof trackBServerOperationNames)[number]>;
}

/**
 * Run 99 R33 live finding (stage v161): a resumed supervised-replay completion re-presents its
 * durable evaluation job. The extension compares the whole canonical job JSON, so a re-derived
 * attestation or reference proof answers `evaluation job idempotency conflict` — and treating that as
 * fatal meant a resumed comparison could never be finalized. The durable job is the authority for
 * that comparison, so a conflict continues with the stored job; every other create failure still
 * fails closed.
 */
export function isEvaluationJobIdempotencyConflict(error: unknown): boolean {
  return /idempotency conflict/i.test(
    String((error as { message?: unknown })?.message ?? error ?? ""),
  );
}

/**
 * Run 99 R33 live finding (stage v162): a resumed comparison reuses durable scored trials, but the
 * resumed run re-derives its rubric and then demanded a correctness score the durable run never
 * recorded under that scorer identity (`durable scored trial is missing semantic correctness
 * evidence`), so the comparison could never be finalized. What a durable trial can prove is what it
 * actually recorded: the correctness score when it exists, otherwise the recorded score (the router
 * judge's) with a real reference, and a refusal only when the trial recorded nothing at all.
 */
/**
 * The trial-score readback reaches the host as a bare array, as a `{scores}` object, or wrapped in an
 * externalized business result. Live evidence (v162): treating anything but a bare array as "no
 * scores" made a durable scored trial look unscored, so a resumed comparison refused with
 * `durable scored trial has no recorded scores` although the store held 1–2 rows per trial.
 */
export function normalizeTrialScoreRows(value: unknown): readonly Record<string, unknown>[] {
  const looksLikeScore = (row: unknown): row is Record<string, unknown> =>
    Boolean(row) &&
    typeof row === "object" &&
    !Array.isArray(row) &&
    ("dimension" in (row as Record<string, unknown>) ||
      "scoreId" in (row as Record<string, unknown>) ||
      "scorerId" in (row as Record<string, unknown>));
  const visit = (node: unknown, depth: number): readonly Record<string, unknown>[] => {
    if (depth > 5 || node === null || node === undefined) return [];
    if (Array.isArray(node)) return node.filter(looksLikeScore);
    if (typeof node !== "object") return [];
    const record = node as Record<string, unknown>;
    // The live readback reaches the host in several wrappers (a bare array, `{scores}`, `{value}`,
    // `{businessOutput: …}`, an externalized transfer marker). Walk the bounded payload keys instead
    // of guessing one shape: a marker carries no score rows, so it still yields `[]`.
    for (const key of [
      "scores",
      "value",
      "result",
      "businessOutput",
      "businessResult",
      "output",
      "payload",
      "data",
      "rows",
      "items",
      "records",
    ]) {
      if (!(key in record)) continue;
      const found = visit(record[key], depth + 1);
      if (found.length > 0) return found;
    }
    return [];
  };
  return visit(value, 0);
}

/**
 * Run 99 R33 live finding (stage v165): a resumed comparison reuses durable scored trials and then ran
 * the pairwise judge again, recording a second judge score that the extension refused (`evaluation
 * trial score batch conflict`, or `partial evaluation trial scores require recovery`) because the
 * durable receipt from the original attempt is the authority. A pair that already carries *this*
 * judge's score reuses those rows and skips the judge dispatch; a partially judged pair does not.
 */
export function selectDurableJudgeScores(input: {
  readonly trialIds: readonly string[];
  readonly scoresByTrial: Readonly<Record<string, readonly Record<string, unknown>[]>>;
  readonly scorerId: string;
  readonly scorerVersion: string;
  readonly dimension: string;
}): readonly Record<string, unknown>[] | null {
  const selected: Record<string, unknown>[] = [];
  for (const trialId of input.trialIds) {
    const rows = input.scoresByTrial[trialId] ?? [];
    // The stored row is the authority: the judge's version embeds the endpoint and mode, which a
    // resumed run re-derives, so the identity that matters is the scorer id plus the dimension.
    const match = rows.find(
      (row) =>
        row.scorerId === input.scorerId &&
        row.dimension === input.dimension,
    );
    if (!match) return null;
    selected.push(match);
  }
  return selected.length === input.trialIds.length && selected.length > 0 ? selected : null;
}

/**
 * Run 99 R33 live finding (stage v167): a resumed comparison reuses durable scores but passed the
 * comparability and holdout it had re-derived, while the durable trial rows are written against the
 * job's immutable tuple — the extension refused with `submitted trials with matching durable
 * comparability and holdout evidence required`. The stored job's tuple is the authority.
 */
export function selectFinalizeBinding(input: {
  readonly storedJob: unknown;
  readonly comparability: Record<string, unknown>;
  readonly holdout: Record<string, unknown>;
}): { readonly comparability: Record<string, unknown>; readonly holdout: Record<string, unknown> } {
  const job =
    input.storedJob && typeof input.storedJob === "object" && !Array.isArray(input.storedJob)
      ? (input.storedJob as Record<string, unknown>)
      : null;
  const storedComparability =
    job?.comparability && typeof job.comparability === "object" && !Array.isArray(job.comparability)
      ? (job.comparability as Record<string, unknown>)
      : null;
  const storedHoldout =
    job?.holdout && typeof job.holdout === "object" && !Array.isArray(job.holdout)
      ? (job.holdout as Record<string, unknown>)
      : null;
  return {
    comparability: storedComparability ?? input.comparability,
    holdout: storedHoldout ?? input.holdout,
  };
}

export function selectDurableScoredTrialEvidence(input: {
  readonly scores: readonly Record<string, unknown>[];
  readonly scorerId: string;
  readonly scorerVersion: string;
}): { readonly score: number; readonly scoreId: string; readonly hasCorrectness: boolean } {
  const rows = (Array.isArray(input.scores) ? input.scores : []).filter(
    (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row),
  );
  if (rows.length === 0) throw new Error("durable scored trial has no recorded scores");
  // The durable row is the authority: a resumed run re-derives the scorer definition (the judge's
  // version embeds the endpoint and mode), so matching on the exact version alone rejected a trial
  // that had in fact been graded. The dimension plus the scorer identity is what the comparison needs.
  const correctness = rows.find(
    (score) =>
      score.dimension === "correctness" &&
      score.scorerId === input.scorerId,
  );
  const hasCorrectness = Boolean(correctness && Number.isFinite(correctness.score));
  const referenced = rows.find((row) => typeof row.scoreId === "string" && row.scoreId) ?? rows[0];
  const scoreId = hasCorrectness
    ? String(correctness?.scoreId)
    : typeof referenced.scoreId === "string" && referenced.scoreId
      ? String(referenced.scoreId)
      : `score:${String(referenced.trialId ?? "durable")}`;
  return {
    score: hasCorrectness ? Number(correctness?.score) : 0,
    scoreId,
    hasCorrectness,
  };
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
  // Run 99 R23: the packaged host resolves the activation policy from
  // `<repo-root>/shared/route-learning-activation-policy.json`. The private distribution
  // build stages that file, but the release staging used to drop it, so every packaged
  // runtime fell back to the hardcoded S1 defaults and an operator policy change (including
  // the graduation stage) was inert for live routing. Stage it with the release, exactly
  // like the graph registry, and fail closed if the private distribution is incomplete.
  const activationPolicySource = path.join(
    options.sourceRoot,
    "shared",
    "route-learning-activation-policy.json",
  );
  if (!existsSync(activationPolicySource)) {
    throw new Error("Track B runtime distribution activation policy config is missing");
  }
  const activationPolicy = JSON.parse(await readFile(activationPolicySource, "utf8")) as {
    readonly schemaVersion?: string;
  };
  if (activationPolicy.schemaVersion !== "role-model.route-learning-activation-policy.v1") {
    throw new Error(
      "Track B runtime distribution activation policy config has an unknown schema version",
    );
  }
  const activationPolicyDestination = path.join(
    options.releaseDir,
    "..",
    "..",
    "shared",
    "route-learning-activation-policy.json",
  );
  await mkdir(path.dirname(activationPolicyDestination), { recursive: true });
  await copyFile(activationPolicySource, activationPolicyDestination);
  const hostActivationPolicyDestination = path.join(
    options.releaseDir,
    "..",
    "shared",
    "route-learning-activation-policy.json",
  );
  await mkdir(path.dirname(hostActivationPolicyDestination), { recursive: true });
  await copyFile(activationPolicySource, hostActivationPolicyDestination);
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

/**
 * Run 98 R2 (RC18): the scheduler reports an elapsed intent deadline with a typed marker
 * (`{ jobId, expired: true }`) rather than a full claim receipt. Representing it in the
 * type keeps callers from mistaking it for a malformed receipt.
 */
export interface ReplayIntentExpired {
  readonly jobId: string;
  readonly expired: true;
}

export type ReplayIntentClaimOutcome =
  | { readonly state: "claimed"; readonly claim: ReplayIntentClaim }
  | { readonly state: "empty" }
  | {
      readonly state: "expired";
      readonly reason: "scheduler_intent_expired";
      readonly attempts: number;
      readonly intentId: string;
    };

/**
 * Run 98 R2 (RC18): enqueue the intent, claim it, and recover exactly once from an expired
 * intent by enqueueing a *fresh* intent id that still references the same durable replay
 * job. Replay Core's job identity is idempotent, so the recovery never duplicates provider
 * work; the scheduler's dead-lettered intent stays terminal.
 */
export async function claimReplayIntentWithRecovery(input: {
  readonly scheduler: ReplayIntentScheduler;
  readonly replayJobId: string;
  readonly scope: string;
  readonly deadlineAtMs: number;
  readonly maxAttempts?: number;
}): Promise<ReplayIntentClaimOutcome> {
  const maxAttempts = Number.isSafeInteger(input.maxAttempts) && (input.maxAttempts ?? 0) > 0
    ? Number(input.maxAttempts)
    : 2;
  const baseIntentId = `replay-intent:${input.replayJobId}`;
  let lastIntentId = baseIntentId;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const intentId = attempt === 1 ? baseIntentId : `${baseIntentId}:retry-${attempt - 1}`;
    lastIntentId = intentId;
    await input.scheduler.enqueue({
      jobId: intentId,
      replayJobId: input.replayJobId,
      deadlineAtMs: input.deadlineAtMs,
    });
    const result = await input.scheduler.claim({ jobId: intentId });
    if (result === null) return { state: "empty" };
    if ((result as ReplayIntentExpired).expired === true) continue;
    const claim = result as ReplayIntentClaim;
    const invalid: string[] = [];
    if (typeof claim.jobId !== "string" || !claim.jobId) invalid.push("jobId");
    if (typeof claim.leaseId !== "string" || !claim.leaseId) invalid.push("leaseId");
    if (typeof claim.fence !== "number" || !Number.isSafeInteger(claim.fence)) invalid.push("fence");
    if (typeof claim.attempt !== "number" || !Number.isSafeInteger(claim.attempt)) invalid.push("attempt");
    if (!claim.payload || typeof claim.payload !== "object") invalid.push("payload");
    else {
      if (claim.payload.replayJobId !== input.replayJobId) invalid.push("payload.replayJobId");
      if (claim.payload.scope !== input.scope) invalid.push("payload.scope");
    }
    if (
      claim.deadlineAtMs !== null
      && (typeof claim.deadlineAtMs !== "number" || !Number.isSafeInteger(claim.deadlineAtMs))
    ) {
      invalid.push("deadlineAtMs");
    }
    if (invalid.length > 0) {
      // Run 98 R2 diagnosis: include the received shape so a mismatch between the
      // scheduler and the host is diagnosable from the runtime's own error.
      const received = Object.keys(result as unknown as Record<string, unknown>)
        .sort()
        .join("|");
      throw new Error(
        `replay scheduler claim receipt is invalid: ${invalid.join(", ")} (received: ${received || "none"})`,
      );
    }
    return { state: "claimed", claim };
  }
  return {
    state: "expired",
    reason: "scheduler_intent_expired",
    attempts: maxAttempts,
    intentId: lastIntentId,
  };
}

export interface ReplayIntentScheduler {
  enqueue(
    input: Readonly<{ jobId: string; replayJobId: string; deadlineAtMs: number }>,
  ): Promise<{ accepted: boolean }>;
  claim(input?: Readonly<{ jobId: string }>): Promise<ReplayIntentClaim | ReplayIntentExpired | null>;
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
/**
 * Run 98 R2 (RC18): the packaged extension host returns business results inside a
 * durable-output envelope. Decode the inline form (`businessOutput`) the same way RC09
 * decoded replay-core receipts; envelopes without an inline body stay untouched so the
 * caller reports the received shape instead of silently proceeding.
 */
function decodeSchedulerBusinessOutput(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if ("businessOutput" in record && record.durableLocator !== undefined) {
    const inner = record.businessOutput;
    // The packaged host wraps the business payload once more: `{ value: <result> }`.
    if (inner && typeof inner === "object" && !Array.isArray(inner) && "value" in inner) {
      return (inner as Record<string, unknown>).value;
    }
    return inner;
  }
  // A bare `{ value: <result> }` wrapper is also accepted when it carries no claim fields.
  if (
    "value" in record
    && !("jobId" in record)
    && !("leaseId" in record)
    && !("fence" in record)
  ) {
    return record.value;
  }
  return value;
}

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
  ): Promise<Record<string, unknown>> => {
    const result = await options.runtime.invoke("background-evidence-scheduler", {
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
    // Run 98 R2 (RC18): packaged business results cross the extension host inside a
    // durable-output envelope (`businessOutput` + `durableLocator`), exactly like the
    // replay-core receipts RC09 fixed. Decode it before validating the claim shape,
    // otherwise a valid claim is rejected as a malformed receipt.
    return decodeSchedulerBusinessOutput(result) as Record<string, unknown>;
  };
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
      // Run 98 R2 (RC18): an elapsed intent deadline is a typed scheduler outcome, not a
      // malformed claim receipt. Pass it through so the caller can recover with a fresh
      // intent instead of failing the capture with an invalid-receipt error.
      if (result.expired === true) {
        if (typeof result.jobId !== "string" || !result.jobId) {
          throw new Error("replay scheduler claim receipt is invalid: jobId");
        }
        return { jobId: result.jobId, expired: true } as const;
      }
      const payload = result.payload;
      const fence = result.fence;
      const attempt = result.attempt;
      const deadlineAtMs = result.deadlineAtMs;
      const invalidFields: string[] = [];
      if (!result.jobId) invalidFields.push("jobId");
      if (!result.leaseId) invalidFields.push("leaseId");
      if (typeof fence !== "number" || !Number.isSafeInteger(fence)) invalidFields.push("fence");
      if (typeof attempt !== "number" || !Number.isSafeInteger(attempt)) invalidFields.push("attempt");
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) invalidFields.push("payload");
      else {
        if ((payload as Record<string, unknown>).scope !== options.scope) invalidFields.push("payload.scope");
        if (typeof (payload as Record<string, unknown>).replayJobId !== "string") {
          invalidFields.push("payload.replayJobId");
        }
      }
      if (
        deadlineAtMs !== null &&
        (typeof deadlineAtMs !== "number" || !Number.isSafeInteger(deadlineAtMs))
      ) {
        invalidFields.push("deadlineAtMs");
      }
      if (invalidFields.length > 0) {
        const received = Object.keys(result)
          .sort()
          .join("|");
        throw new Error(
          `replay scheduler claim receipt is invalid: ${invalidFields.join(", ")} (received: ${received || "none"})`,
        );
      }
      return {
        jobId: String(result.jobId),
        payload: {
          replayJobId: String((payload as Record<string, unknown>).replayJobId),
          scope: options.scope,
        },
        leaseId: String(result.leaseId),
        fence: fence as number,
        attempt: attempt as number,
        deadlineAtMs: deadlineAtMs === null ? null : (deadlineAtMs as number),
      } satisfies ReplayIntentClaim;
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
  /**
   * Consumes a fresh nonce for one dispatch identity.
   *
   * Run 99 R33: a replay job resumes its *prepared* envelope verbatim after a failed provider
   * attempt, so the same nonce is presented again for the same `dispatchIdempotencyKey`. The nonce
   * stays bound to that identity — it can never authorize different work — and the caller's policy
   * decides whether the bound dispatch may still be retried (the production composition refuses once
   * the dispatch ledger holds a completed receipt).
   */
  consume(
    nonce: string,
    dispatchIdentity?: string,
    options?: { readonly mayReauthorize?: (dispatchIdentity: string) => boolean },
  ): boolean | Promise<boolean>;
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
  // A nonce is bound to exactly one dispatch identity. The binding is what lets a resumed
  // *prepared* envelope be re-authorized without ever letting a captured nonce authorize
  // different work.
  let bindings: Record<string, string> = {};
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
    const persistedBindings = (parsed as Record<string, unknown>).bindings;
    if (
      persistedBindings !== undefined &&
      (!persistedBindings || typeof persistedBindings !== "object" || Array.isArray(persistedBindings))
    ) {
      throw new Error("replay authorization nonce store is invalid");
    }
    for (const [nonce, identity] of Object.entries(
      (persistedBindings ?? {}) as Record<string, unknown>,
    )) {
      if (
        typeof nonce !== "string" ||
        !nonce ||
        nonce.length > 256 ||
        typeof identity !== "string" ||
        !identity ||
        identity.length > 256 ||
        !nonces.has(nonce)
      ) {
        throw new Error("replay authorization nonce store binding is invalid");
      }
      bindings[nonce] = identity;
    }
  }

  const persist = (): void => {
    const bound = Object.entries(bindings).sort(([left], [right]) => left.localeCompare(right));
    const payload = `${JSON.stringify({
      schemaVersion: REPLAY_AUTHORIZATION_NONCE_STORE_SCHEMA,
      nonces: [...nonces].sort(),
      ...(bound.length > 0 ? { bindings: Object.fromEntries(bound) } : {}),
    })}\n`;
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, payload, { encoding: "utf8" });
    renameSync(temporaryPath, filePath);
  };

  return Object.freeze({
    has(nonce: string): boolean {
      return nonces.has(nonce);
    },
    consume(
      nonce: string,
      dispatchIdentity?: string,
      options?: { readonly mayReauthorize?: (dispatchIdentity: string) => boolean },
    ): boolean {
      if (typeof nonce !== "string" || !nonce || nonce.length > 256) {
        throw new Error("replay authorization nonce is invalid");
      }
      if (
        dispatchIdentity !== undefined &&
        (typeof dispatchIdentity !== "string" ||
          !dispatchIdentity ||
          dispatchIdentity.length > 256)
      ) {
        throw new Error("replay dispatch identity is invalid");
      }
      if (nonces.has(nonce)) {
        const bound = bindings[nonce];
        if (bound === undefined || dispatchIdentity !== bound) return false;
        return options?.mayReauthorize?.(bound) === true;
      }
      if (nonces.size >= 8192) {
        throw new Error("replay authorization nonce store exceeds its bounded cap");
      }
      nonces.add(nonce);
      if (dispatchIdentity !== undefined) bindings[nonce] = dispatchIdentity;
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
      const dispatchIdentity =
        typeof input.envelope.dispatchIdempotencyKey === "string" &&
        input.envelope.dispatchIdempotencyKey.length > 0
          ? input.envelope.dispatchIdempotencyKey
          : undefined;
      if (!(await authorizationNonceStore.consume(authorization.nonce, dispatchIdentity))) {
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
  /**
   * Run 97 RC09: the replay-core worker externalizes results above the canonical inline
   * cap, so the host needs the runtime state root and scope to read a large create-job
   * receipt back instead of treating the transfer marker as the job identity.
   */
  readonly runtimeStateRoot?: string;
  readonly runtimeScopeId?: string;
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
  /**
   * Run 99 R29: a durable replay job record is ~9 KB, so Replay Core hands it back as an
   * externalized transfer marker. The supervised replay read `state` straight off that marker, so
   * the command receipt carried no state and the automatic producer deferred the capture forever
   * as "durable replay state is unknown" (observed live at 06:39Z). Decode before reading.
   */
  const invokeReplayCore = async (capability: string, value: Record<string, unknown>) => {
    const result = await input.runtime.invoke("replay-core", controlEnvelope(capability, value));
    return (
      decodeExtensionBusinessResult({
        result,
        extensionId: "replay-core",
        ...(input.runtimeStateRoot ? { stateRoot: input.runtimeStateRoot } : {}),
        scopeId: input.runtimeScopeId ?? input.scope,
      }) ?? result
    );
  };
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
  const createdRaw = await input.runtime.invoke(
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
  // RC09: a replay job record with several candidates exceeds the canonical inline cap,
  // so the worker answers with `transferState: "externalized"`. Reading the marker as the
  // job identity reported `Replay Core did not return a durable replay job ID` while the
  // job itself was already durable (observed live on stage v44: three such captures had
  // complete replay jobs).
  const created =
    decodeExtensionBusinessResult({
      result: createdRaw,
      extensionId: "replay-core",
      ...(input.runtimeStateRoot ? { stateRoot: input.runtimeStateRoot } : {}),
      scopeId: input.runtimeScopeId ?? input.scope,
    }) ??
    (createdRaw && typeof createdRaw === "object" && !Array.isArray(createdRaw)
      ? (createdRaw as Record<string, unknown>)
      : {});
  const jobId = typeof created.jobId === "string" ? created.jobId : null;
  if (!jobId) throw new Error("Replay Core did not return a durable replay job ID");
  // Run 98 R2: a durable job that already reached a terminal failure state can never be
  // dispatched again — RC16 freezes its deadline at creation, so claiming a fresh scheduler
  // intent only produces instant expiries and an endless `deferred` answer. Before retiring
  // the job, recover the one thing that is still durable and already paid for: a comparison
  // that handed off to Evaluation Core and was scored while the dispatch window closed. Only
  // when that evidence cannot be finalized does the capture get retired.
  if (TERMINAL_REPLAY_JOB_STATES.has(String(created.state ?? ""))) {
    if (
      input.completeEvaluation &&
      typeof created.evaluationJobId === "string" &&
      created.evaluationJobId
    ) {
      try {
        const recoveryLease = (await input.runtime.invoke(
          "replay-core",
          controlEnvelope("replay:claim-job", {
            jobId,
            leaseOwner: input.leaseOwner,
            leaseMs: input.leaseMs,
          }),
        )) as Record<string, unknown> | null;
        const recoveryFenceToken = recoveryLease?.fenceToken;
        if (Number.isSafeInteger(recoveryFenceToken)) {
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
              fenceToken: recoveryFenceToken,
              evaluation,
            }),
          );
          if (finalized && typeof finalized === "object") {
            return { ...(finalized as Record<string, unknown>), schedulerState: "terminal_recovery" };
          }
        }
      } catch (error) {
        // Recovery is best-effort: the durable replay state stays the authority and the
        // capture is retired below when its evidence cannot be finalized.
        console.error(
          `[run98] terminal replay evaluation recovery declined:${jobId} ${String(
            (error as { message?: unknown })?.message ?? error,
          ).slice(0, 200)}`,
        );
      }
    }
    return { ...structuredClone(created), schedulerState: "terminal_job" };
  }
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
      // Run 98 R2 (RC18): recovery completes the same durable replay job, so an elapsed
      // scheduler intent must not fail the recovery. A fresh intent is claimed when the
      // previous one expired; a second expiry is reported as a typed scheduler state.
      const outcome = await claimReplayIntentWithRecovery({
        scheduler: input.scheduler,
        replayJobId: jobId,
        scope: input.scope,
        deadlineAtMs:
          Date.now()
          + (typeof input.budget.deadlineMs === "number"
            && Number.isSafeInteger(input.budget.deadlineMs)
            && input.budget.deadlineMs > 0
            ? input.budget.deadlineMs
            : 120_000),
      });
      if (outcome.state === "claimed") {
        const schedulerClaim = outcome.claim;
        const receipt = await input.scheduler.complete({
          jobId: schedulerClaim.jobId,
          leaseId: schedulerClaim.leaseId,
          fence: schedulerClaim.fence,
          result: { replayJobId: jobId, state: "complete" },
        });
        if (!receipt?.completed) return { ...finalized, schedulerState: "completion_not_accepted" };
      }
      if (outcome.state === "expired") {
        return { ...finalized, schedulerState: "intent_expired" };
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
    // Run 98 R2 (RC18): claim through the recovery helper. An expired intent is replaced by
    // a fresh intent for the same durable replay job; if that also expires the caller
    // receives a typed deferral instead of an invalid-receipt failure.
    const schedulerOutcome = await claimReplayIntentWithRecovery({
      scheduler: input.scheduler,
      replayJobId: jobId,
      scope: input.scope,
      deadlineAtMs: createdAtMs + deadlineMs,
    });
    if (schedulerOutcome.state === "empty") {
      return { jobId, state: "queued", schedulerState: "deferred" };
    }
    if (schedulerOutcome.state === "expired") {
      return {
        jobId,
        state: "deferred",
        schedulerState: "intent_expired",
        schedulerReason: schedulerOutcome.reason,
        schedulerAttempts: schedulerOutcome.attempts,
      };
    }
    schedulerClaim = schedulerOutcome.claim;
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
      const appended = await invokeReplayCore("replay:record-branch-append", {
        jobId,
        candidateEndpointId,
        leaseOwner: input.leaseOwner,
        fenceToken: lease.fenceToken,
        branch,
      });
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
    const completed = await invokeReplayCore("replay:record-evaluation-receipt", {
      jobId,
      leaseOwner: input.leaseOwner,
      fenceToken: lease.fenceToken,
      evaluation,
    });
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
      ? await invokeReplayCore("replay:record-evaluation-result", {
          jobId,
          leaseOwner: input.leaseOwner,
          fenceToken: lease.fenceToken,
          evaluation: completedEvaluation,
        })
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
  /**
   * Run 99 R33 (addendum 19 S33/S34): the task family the captured request belonged to, carried
   * from the routing decision so the comparison, the learned candidate and the promoted pack are
   * all scoped to it. Optional: a caller that omits it keeps the pre-R33 behaviour.
   */
  readonly taskTypeId?: string | null;
  readonly taxonomyVersion?: string | null;
  /**
   * Run 99 close-out (addendas 19-21 `S33`): the classification the captured request was routed
   * with. The shadow pipeline's advisory observation is what the post-observation appends to the
   * durable ledger, so the classification has to travel through this path too.
   */
  readonly classification?: TrackBRouteAdvisoryClassification | null;
  /**
   * Run 99 close-out (addendum 21 §4 `S33`): the judge presentation order the comparison was
   * produced under. Two comparisons judged under different order policies are not comparable, so the
   * value belongs in the comparability key rather than only in the policy that configured the judge.
   */
  readonly judgeOrderPolicy?: "source_first" | "dual_order" | null;
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
  /**
   * Host-owned runtime state root. When present the pipeline persists the documented
   * v1.1 route-learning contracts (execution context, rollout group lifecycle,
   * disabled activation receipt, shadow experience candidate) alongside its
   * internal receipts.
   */
  readonly contractStateRoot?: string;
  /**
   * RC04 (L4): optional router-backed pairwise judge. When present the pipeline
   * registers the canonical `role_model_pairwise_judge.battle` scorer, dispatches the
   * judge exactly once per comparison, and records the preference as a second durable
   * dimension on both trials. A judge failure is recorded as bounded score
   * missingness, never as a fabricated zero (`guidance/09`, `guidance/11`).
   */
  readonly judge?: TrackBPairwiseJudge;
  /**
   * Run 98 R3/R15: the effective activation-policy floors the learning pass validates
   * against. Callers pass the versioned policy snapshot; without it the pass uses the
   * documented defaults.
   */
  readonly learningPolicy?: Readonly<{
    evidenceFloor: Readonly<{
      minDecisiveComparisons: number;
      minHoldoutComparisons: number;
      /** Run 98 addendum 32 S1: development-partition floor for the promotion gate. */
      minDevelopmentComparisons: number;
      minDistinctCaptures: number;
    }>;
    guardrails: Readonly<{ qualityMinDelta: number }>;
    /** Run 98 R19: the predeclared promotion protocol the validation decides under. */
    promotionProtocol?: Readonly<{
      protocolId: string;
      primaryMetricId: string;
      direction: "higher_is_better";
      minimumPracticalDelta: number;
      intervalLevel: number;
      resamples: number;
      bootstrapSeed: number;
      analysisMethod: "paired_cluster_bootstrap";
      selectionFamilySize: number;
      multiplicityAdjustment: "none" | "holm_bonferroni";
    }>;
    evidenceMaxAgeMs?: number;
  }>;
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

/**
 * Large extension results cross the packaged boundary as an externalized durable
 * output (`businessOutput.transferState = "externalized"`). The payload stays in the
 * extension worker's durable output store, so the host must read it back by locator
 * instead of treating the transfer marker as the business result. Returning the
 * marker as-is made every large profile estimate look degraded.
 */
function readExternalizedExtensionOutput(input: {
  readonly stateRoot: string;
  readonly scopeId: string;
  readonly extensionId: string;
  readonly locator: Readonly<Record<string, unknown>>;
}): Record<string, unknown> | null {
  const outputKey = String(input.locator.outputKey ?? "");
  if (!outputKey) return null;
  const databasePath = path.join(
    input.stateRoot,
    input.scopeId,
    "track-b",
    "extensions",
    "workers",
    input.extensionId,
    "durable-output.sqlite",
  );
  if (!existsSync(databasePath)) return null;
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const row = database
      .prepare(
        "SELECT result_json, result_hash, byte_length FROM durable_extension_outputs WHERE output_key = ?",
      )
      .get(outputKey) as
      | { result_json?: string; result_hash?: string; byte_length?: number }
      | undefined;
    if (!row?.result_json) return null;
    const expectedHash = input.locator.resultHash;
    if (typeof expectedHash === "string" && row.result_hash !== expectedHash) {
      throw new Error("externalized extension output hash does not match its locator");
    }
    return JSON.parse(row.result_json) as Record<string, unknown>;
  } finally {
    database.close();
  }
}

/**
 * Run 99 R28: an operator readback that outgrew the inline transfer limit crosses the packaged
 * boundary as an externalized marker (`{transferState, resultHash, byteLength}`), sometimes with
 * and sometimes without the `businessOutput`/`durableLocator` wrapper. Observed live: the
 * Learning rollout readback (7 974 bytes) and the pack records readback (28 149 bytes) answered
 * with the marker, so the packs page rendered "No pack records have been derived" while the
 * payload sat in the worker's durable-output store.
 *
 * A marker with no matching row is returned unchanged, so the surface renders an explicit empty
 * state instead of invented data.
 */
export function decodeExternalizedOperatorReadback(input: {
  readonly stateRoot: string;
  readonly scopeId?: string | null;
  readonly value: unknown;
}): unknown {
  const record =
    input.value && typeof input.value === "object" && !Array.isArray(input.value)
      ? (input.value as Record<string, unknown>)
      : null;
  if (!record) return input.value;
  const business =
    record.businessOutput && typeof record.businessOutput === "object"
      ? (record.businessOutput as Record<string, unknown>)
      : null;
  const marker = business && business.transferState === "externalized" ? business : record;
  if (marker.transferState !== "externalized") return input.value;
  const locator =
    record.durableLocator && typeof record.durableLocator === "object"
      ? (record.durableLocator as Record<string, unknown>)
      : null;
  const outputKey = typeof locator?.outputKey === "string" ? locator.outputKey : null;
  const resultHash =
    typeof marker.resultHash === "string"
      ? marker.resultHash
      : typeof locator?.resultHash === "string"
        ? locator.resultHash
        : null;
  if (!outputKey && !resultHash) return input.value;
  // The caller may not know the runtime scope, so the declared one is tried first and the state
  // root's scope directories are scanned as a bounded fallback.
  const candidateRoots: string[] = [];
  const workerRootsForScope = (scope: string): string[] => [
    // The production extension runtime keeps its workers here.
    path.join(input.stateRoot, scope, "track-b", "extensions", "workers"),
    // The packaged operator extension host keeps its own workers here (`ProcessWorker` roots
    // itself at `<journalDir>/workers/<id>`), and an operator readback is served by that host.
    path.join(input.stateRoot, scope, "track-b", "workers"),
  ];
  if (typeof input.scopeId === "string" && input.scopeId) {
    candidateRoots.push(...workerRootsForScope(input.scopeId).filter((root) => existsSync(root)));
  }
  let scopeDirectories: string[] = [];
  try {
    scopeDirectories = readdirSync(input.stateRoot);
  } catch {
    scopeDirectories = [];
  }
  for (const scope of scopeDirectories.slice(0, 16)) {
    for (const candidate of workerRootsForScope(scope)) {
      if (!candidateRoots.includes(candidate) && existsSync(candidate)) {
        candidateRoots.push(candidate);
      }
    }
  }
  for (const workersRoot of candidateRoots) {
    let workerIds: string[] = [];
    try {
      workerIds = readdirSync(workersRoot);
    } catch {
      continue;
    }
    for (const workerId of workerIds) {
      const databasePath = path.join(workersRoot, workerId, "durable-output.sqlite");
      if (!existsSync(databasePath)) continue;
      let database: DatabaseSync | null = null;
      try {
        database = new DatabaseSync(databasePath, { readOnly: true });
        const row = (
          outputKey
            ? database
                .prepare(
                  "SELECT result_json FROM durable_extension_outputs WHERE output_key = ?",
                )
                .get(outputKey)
            : database
                .prepare(
                  "SELECT result_json FROM durable_extension_outputs WHERE result_hash = ? ORDER BY rowid DESC LIMIT 1",
                )
                .get(resultHash)
        ) as { result_json?: string } | undefined;
        if (row?.result_json) return JSON.parse(row.result_json) as unknown;
      } catch {
        // Keep looking; never invent a value.
      } finally {
        database?.close();
      }
    }
  }
  return input.value;
}

/**
 * Decode an extension invoke result: inline business output when present, otherwise a
 * read-back of the externalized durable output. Returns null when the payload cannot be
 * recovered, so callers keep an honest degradation path.
 *
 * Run 99 R33: `businessOutput` is transport metadata, not automatically the business result.
 * The packaged host returns every extension's own named fields at the top level next to it
 * (`extensions/trajectory-signals` answers `{...report, durableLocator, readCapability}`, and the
 * advisory-measurement receipt read back from the live stage runtime carries exactly that shape).
 * Decoding `businessOutput` whenever it existed therefore handed callers the transport envelope
 * instead of the payload: the post-observation drain threw
 * `finalized trajectory signals must retain replay provenance`, because the "signals" it inspected
 * were `{extensionId, capability}`. Prefer the explicit transfer marker, then the record's own
 * payload, and fall back to `businessOutput` only when the record carries nothing else.
 */
const EXTENSION_TRANSPORT_FIELDS = [
  "workerPid",
  "businessOutput",
  "durableLocator",
  "evidenceRef",
  "readCapability",
] as const;

function decodeExtensionBusinessResult(input: {
  readonly result: unknown;
  readonly extensionId: string;
  readonly stateRoot?: string;
  readonly scopeId: string;
}): Record<string, unknown> | null {
  const record =
    input.result && typeof input.result === "object" && !Array.isArray(input.result)
      ? (input.result as Record<string, unknown>)
      : null;
  if (!record) return null;
  const business =
    record.businessOutput && typeof record.businessOutput === "object" && !Array.isArray(record.businessOutput)
      ? (record.businessOutput as Record<string, unknown>)
      : null;
  if (business && business.transferState === "externalized") {
    if (!input.stateRoot) return null;
    const locator =
      record.durableLocator && typeof record.durableLocator === "object" && !Array.isArray(record.durableLocator)
        ? (record.durableLocator as Record<string, unknown>)
        : null;
    if (!locator) return null;
    try {
      return readExternalizedExtensionOutput({
        stateRoot: input.stateRoot,
        scopeId: input.scopeId,
        extensionId: input.extensionId,
        locator,
      });
    } catch {
      return null;
    }
  }
  // A record that carries its own named payload is authoritative; `businessOutput` is only the
  // payload when the record has nothing else to offer (`{businessOutput, durableLocator}` and the
  // `{value, businessOutput, durableLocator}` array form decode the same either way).
  const carriesOwnPayload = Object.keys(record).some(
    (key) => !(EXTENSION_TRANSPORT_FIELDS as readonly string[]).includes(key),
  );
  if (carriesOwnPayload) return record;
  return business ?? record;
}

/**
 * Run 99: the Learning Evidence page`s cohort measurement, derived from the durable finalized
 * comparisons the learner consumes (the mapping the run-98 phase-5 driver verified): a `source` win
 * is the baseline cohort, a `candidate` win the advisory cohort, and the quality is the winner`s mean
 * member score. The list crosses the extension host inside a durable-output envelope, so it is
 * decoded exactly like the learning pass decodes its own comparison-group readback.
 */
export async function readTrackBAdvisoryMeasurement(input: {
  readonly runtime: TrackBShadowPipelineRuntime | null;
  readonly channel: string;
  readonly scopeId: string;
  readonly authorizationEpoch?: number;
  readonly stateRoot?: string;
  readonly guardrailBounds: {
    readonly qualityMinDelta: number;
    readonly costMaxMultiplier: number;
    readonly latencyP95MaxDeltaMs: number;
    readonly errorRateMaxDeltaPp: number;
  };
}): Promise<Record<string, unknown>> {
  const runtime = input.runtime;
  if (!runtime) {
    return {
      schemaVersion: "role-model.advisory-measurement.v1",
      status: "no-measurement",
      rows: 0,
      reason: "extension runtime unavailable",
    };
  }
  const invoke = async (extensionId: string, capability: string, value: Record<string, unknown>) => {
    const result = await runtime.invoke(extensionId, {
      requestId: `learning-measurement:${capability}:${Date.now()}`,
      sessionId: `learning-measurement:${input.scopeId}`,
      protocolVersion: "1.1.0",
      channel: input.channel,
      scope: input.scopeId,
      authorizationEpoch: input.authorizationEpoch ?? 1,
      capability,
      value,
      payload: value,
    });
    return decodeExtensionBusinessResult({
      result,
      extensionId,
      ...(input.stateRoot ? { stateRoot: input.stateRoot } : {}),
      scopeId: input.scopeId,
    }) ?? result;
  };
  const decodedGroups = await invoke("evaluation-core", "evaluation:list-groups", {});
  const record = decodedGroups && typeof decodedGroups === "object" ? (decodedGroups as Record<string, unknown>) : {};
  const groups = Array.isArray(decodedGroups)
    ? (decodedGroups as readonly Record<string, unknown>[])
    : Array.isArray(record.value)
      ? (record.value as readonly Record<string, unknown>[])
      : Array.isArray(record.groups)
        ? (record.groups as readonly Record<string, unknown>[])
        : [];
  const rows: Record<string, unknown>[] = [];
  for (const group of groups) {
    const result = group?.result && typeof group.result === "object" ? (group.result as Record<string, unknown>) : {};
    const members = Array.isArray(result.members)
      ? (result.members as readonly Record<string, unknown>[])
      : Array.isArray(group?.members)
        ? (group.members as readonly Record<string, unknown>[])
        : [];
    const scored = members.filter((member) => Number.isFinite(Number(member?.score)));
    if (!scored.length) continue;
    const outcome = String(result.outcome ?? group?.outcome ?? "unknown");
    const decisive = outcome === "source" || outcome === "candidate";
    const quality = scored.reduce((sum, member) => sum + Number(member.score), 0) / scored.length;
    const groupId = String(result.groupId ?? group?.groupId ?? group?.group_id ?? "comparison:unknown");
    const holdout = result.holdout && typeof result.holdout === "object" ? (result.holdout as Record<string, unknown>) : {};
    const comparability = group?.comparability && typeof group.comparability === "object"
      ? (group.comparability as Record<string, unknown>)
      : {};
    rows.push({
      decisionId: groupId,
      cohort: decisive && outcome === "source" ? "baseline" : "advisory",
      // Pair on the declared task, not on the per-comparison holdout id: each comparison is its
      // own holdout, so holdout-id pairing always yields zero paired tasks (observed live).
      holdoutTaskId: String(comparability.taskRef ?? holdout.holdoutId ?? groupId),
      quality,
      costUsd: 0.0001,
      latencyMs: 0,
      error: outcome === "failed",
      ...(decisive && outcome === "source" ? {} : { applied: decisive }),
      receiptRef: `comparison:${groupId}`,
    });
  }
  if (!rows.length) {
    return {
      schemaVersion: "role-model.advisory-measurement.v1",
      status: "no-measurement",
      rows: 0,
      reason: "no finalized comparison group with scored members is available yet",
    };
  }
  const report = await invoke("trajectory-signals", "signals:measure-advisory-effect", {
    rows,
    guardrailBounds: { ...input.guardrailBounds },
    minSamples: 1,
    scope: input.scopeId,
    channel: input.channel,
  });
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    return {
      schemaVersion: "role-model.advisory-measurement.v1",
      status: "no-measurement",
      rows: rows.length,
      reason: "measurement produced no report",
    };
  }
  // The extension requires finite cost/latency inputs, but this composition does not measure them
  // per arm; say so instead of letting the placeholder inputs read as measured zeros.
  return {
    ...(report as Record<string, unknown>),
    measurementInputs: {
      rows: rows.length,
      costLatencyAvailable: false,
      pairedTaskKey: "taskRef",
    },
  };
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

/**
 * Run 97 RC04: a `requiredTerms` criterion only discriminates when it names a real
 * task requirement. Live traffic derived `["hey"]` from the request text, which both
 * branches fail (so the dimension is dead weight) and which fires at random when it
 * does match (turning a judge-decided counterfactual into `disagreement`).
 *
 * `guidance/05` selects scorers from case metadata; a greeting is not task metadata,
 * so the comparison keeps the router-judge dimension and drops the semantic-criteria
 * dimension instead of letting a meaningless check vote.
 */
const NON_VERIFIABLE_CRITERIA_TERMS = new Set([
  "hey",
  "hi",
  "hello",
  "yo",
  "sup",
  "ping",
  "test",
  "thanks",
  "thank",
  "please",
  "ok",
  "okay",
  "yes",
  "no",
]);

export function hasVerifiableSemanticCriteria(value: unknown): boolean {
  let criteria: TrackBSemanticEvaluationCriteria;
  try {
    criteria = normalizeTrackBSemanticEvaluationCriteria(value);
  } catch {
    return false;
  }
  // Run 98 addendum 33 S5: a structured assertion is verifiable evidence by construction — it names what
  // the answer must do, not which words it shares with the prompt.
  const assertions = (criteria as { assertions?: readonly unknown[] }).assertions;
  if (Array.isArray(assertions) && assertions.length > 0) return true;
  return [...(criteria.requiredTerms ?? []), ...(criteria.forbiddenTerms ?? [])].some((term) => {
    const normalized = term.trim().toLocaleLowerCase("en-US");
    if (normalized.length < 3) return false;
    if (NON_VERIFIABLE_CRITERIA_TERMS.has(normalized)) return false;
    return /[a-z0-9]/i.test(normalized);
  });
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

export const TRACK_B_ROUTE_ADVISORY_OBSERVATION_SCHEMA =
  "role-model.route-advisory-observation.v1";
export const TRACK_B_ROUTE_ADVISORY_OBSERVATION_LEDGER_SCHEMA =
  "role-model.route-advisory-observation-ledger.v1";
const TRACK_B_ROUTE_ADVISORY_LEDGER_MAX_ENTRIES = 5000;
const TRACK_B_ROUTE_ADVISORY_CACHE_MAX_ENTRIES = 128;
/**
 * Run 98 R4: the newest advisory per (channel, scope, route package) produced by a
 * learning pass. Live decisions observe it; nothing else reads it, so stage S1 cannot
 * change a routed answer (`AC-R04-01`, `AC-R04-02`).
 */
const trackBRouteAdvisoryCache = new Map<
  string,
  {
    readonly preferredRoutePackage: string | null;
    readonly advisoryState: TrackBRouteAdvisoryState;
    readonly confidence: number;
    readonly profileSnapshotIds: readonly string[];
    readonly candidateId: string | null;
    readonly advisoryId: string | null;
    /** Run 99 R33: the task family this pipeline advisory was derived for, when known. */
    readonly taskTypeId: string | null;
    readonly taxonomyVersion: string | null;
    readonly cachedAtMs: number;
  }
>();

export function rememberTrackBRouteAdvisory(input: {
  readonly channel: string;
  readonly scope: string;
  readonly routePackage: string;
  readonly preferredRoutePackage?: string | null;
  readonly advisoryState: TrackBRouteAdvisoryState;
  readonly confidence?: number;
  readonly profileSnapshotIds?: readonly string[];
  readonly candidateId?: string | null;
  readonly advisoryId?: string | null;
  readonly taskTypeId?: string | null;
  readonly taxonomyVersion?: string | null;
  readonly nowMs: number;
}) {
  const key = `${input.channel}\u0000${input.scope}\u0000${input.routePackage}`;
  trackBRouteAdvisoryCache.set(key, {
    preferredRoutePackage: input.preferredRoutePackage ?? null,
    advisoryState: input.advisoryState,
    confidence: Number.isFinite(input.confidence) ? Number(input.confidence) : 0,
    profileSnapshotIds: [...(input.profileSnapshotIds ?? [])],
    candidateId: input.candidateId ?? null,
    advisoryId: input.advisoryId ?? null,
    taskTypeId:
      typeof input.taskTypeId === "string" && input.taskTypeId.trim()
        ? input.taskTypeId.trim()
        : null,
    taxonomyVersion:
      typeof input.taxonomyVersion === "string" && input.taxonomyVersion.trim()
        ? input.taxonomyVersion.trim()
        : null,
    cachedAtMs: input.nowMs,
  });
  while (trackBRouteAdvisoryCache.size > TRACK_B_ROUTE_ADVISORY_CACHE_MAX_ENTRIES) {
    const oldest = trackBRouteAdvisoryCache.keys().next().value;
    if (oldest === undefined) break;
    trackBRouteAdvisoryCache.delete(oldest);
  }
  return trackBRouteAdvisoryCache.get(key);
}

export function recallTrackBRouteAdvisory(input: {
  readonly channel: string;
  readonly scope: string;
  readonly routePackage: string;
}) {
  return (
    trackBRouteAdvisoryCache.get(
      `${input.channel}\u0000${input.scope}\u0000${input.routePackage}`,
    ) ?? null
  );
}

export function clearTrackBRouteAdvisoryCacheForTests() {
  trackBRouteAdvisoryCache.clear();
}

/**
 * Run 98 R5: the newest advisory for a scope, whichever route package produced it. The
 * live decision needs this before the route package is chosen, because the advisory's
 * preferred package is what the bounded tie-break considers.
 */
export function recallNewestTrackBRouteAdvisory(input: {
  readonly channel: string;
  readonly scope: string;
  /** Run 99 R33: when given, only an exact family match (or an unscoped entry) is returned. */
  readonly taskTypeId?: string | null;
}) {
  let newest: (typeof trackBRouteAdvisoryCache extends Map<string, infer TValue>
    ? TValue
    : never) | null = null;
  const requestedFamily =
    typeof input.taskTypeId === "string" && input.taskTypeId.trim()
      ? input.taskTypeId.trim()
      : null;
  for (const [key, value] of trackBRouteAdvisoryCache) {
    const [channel, scope] = key.split("\u0000");
    if (channel !== input.channel || scope !== input.scope) continue;
    if (requestedFamily) {
      // A family-specific entry for a different family is not this request's advisory; an
      // unscoped entry is returned so the router can report `advisory_task_unscoped` honestly.
      if (value.taskTypeId !== null && value.taskTypeId !== requestedFamily) continue;
      if (value.taskTypeId !== null && newest?.taskTypeId === requestedFamily) continue;
    }
    if (!newest || value.cachedAtMs > newest.cachedAtMs) newest = value;
  }
  return newest;
}

/**
 * Run 99 R24 / addendum 06: the advisory the *operator activated*, kept apart from the
 * per-replay pipeline cache.
 *
 * `AC-R05-04` gates S2 influence on an activated pack with a validation receipt and a cohort,
 * so a transient pipeline advisory is evidence, not an authorization. Live routing therefore
 * prefers the durable entry whenever one exists — including when it says `unavailable`, which is
 * the honest answer for a scope whose pack was rolled back.
 */
export interface TrackBDurableRouteAdvisoryEntry {
  readonly preferredRoutePackage: string | null;
  readonly advisoryState: TrackBRouteAdvisoryState;
  readonly confidence: number;
  readonly candidateId: string | null;
  readonly advisoryId: string | null;
  readonly cohortPercent: number;
  readonly reason: string | null;
  /** Run 99 R33: the family the activated pack was validated for, when the pack declares one. */
  readonly taskTypeId: string | null;
  readonly taxonomyVersion: string | null;
  /** Run 99 R33 D12: the activation outlived the operator's revalidation interval. */
  readonly revalidationDue: boolean;
  readonly cachedAtMs: number;
}

const trackBDurableRouteAdvisoryCache = new Map<string, TrackBDurableRouteAdvisoryEntry>();
const TRACK_B_DURABLE_ADVISORY_CACHE_MAX_ENTRIES = 128;

const durableAdvisoryKey = (channel: string, scope: string): string =>
  `${channel}\u0000${scope}`;

export function rememberTrackBDurableRouteAdvisory(input: {
  readonly channel: string;
  readonly scope: string;
  readonly advisory: TrackBRouteAdvisorySourceResult;
  readonly nowMs: number;
}): TrackBDurableRouteAdvisoryEntry {
  const entry: TrackBDurableRouteAdvisoryEntry = {
    preferredRoutePackage: input.advisory.preferredRoutePackage,
    advisoryState: input.advisory.advisoryState,
    confidence: Number.isFinite(input.advisory.confidence) ? input.advisory.confidence : 0,
    candidateId: input.advisory.candidateId,
    advisoryId: input.advisory.advisoryId,
    cohortPercent: Number.isFinite(input.advisory.cohortPercent)
      ? input.advisory.cohortPercent
      : 0,
    reason: input.advisory.reason,
    taskTypeId: input.advisory.taskTypeId ?? null,
    taxonomyVersion: input.advisory.taxonomyVersion ?? null,
    revalidationDue: input.advisory.revalidationDue === true,
    cachedAtMs: input.nowMs,
  };
  const key = durableAdvisoryKey(input.channel, input.scope);
  trackBDurableRouteAdvisoryCache.set(key, entry);
  while (trackBDurableRouteAdvisoryCache.size > TRACK_B_DURABLE_ADVISORY_CACHE_MAX_ENTRIES) {
    const oldest = trackBDurableRouteAdvisoryCache.keys().next().value;
    if (oldest === undefined) break;
    trackBDurableRouteAdvisoryCache.delete(oldest);
  }
  return entry;
}

export function recallTrackBDurableRouteAdvisory(input: {
  readonly channel: string;
  readonly scope: string;
  /**
   * Run 99 R33: when the request declares a family, only that family's entry (or an unscoped
   * entry, which the router then refuses) may be returned.
   */
  readonly taskTypeId?: string | null;
  /**
   * Run 99 R33 (addendum 21 D12): when both are supplied the record's age is enforced, so an
   * advisory source older than the operator's `advisorySourceMaxAgeMs` is reported `stale`
   * instead of silently continuing to authorize influence.
   */
  readonly nowMs?: number;
  readonly maxAgeMs?: number | null;
}): TrackBDurableRouteAdvisoryEntry | null {
  const entry =
    trackBDurableRouteAdvisoryCache.get(durableAdvisoryKey(input.channel, input.scope)) ?? null;
  if (!entry) return null;
  const maxAgeMs =
    typeof input.maxAgeMs === "number" && Number.isFinite(input.maxAgeMs) && input.maxAgeMs > 0
      ? input.maxAgeMs
      : null;
  const aged =
    maxAgeMs !== null &&
    typeof input.nowMs === "number" &&
    Number.isFinite(input.nowMs) &&
    input.nowMs - entry.cachedAtMs > maxAgeMs
      ? { ...entry, advisoryState: "stale" as const, reason: "advisory source beyond max age" }
      : entry;
  const resolved = aged;
  // Run 99 R33 (S37 live finding): a family-mismatched entry must reach the router so it answers
  // `advisory_task_mismatch` — the operator has to see *why* the learned preference was refused.
  // Withholding it here made the host fall through to the transient pipeline advisory, which is
  // refused earlier by the eligibility gate and reported as `advisory_candidate_not_eligible`,
  // hiding the family verdict. The router still cannot apply a mismatched advisory, so the safety
  // property is unchanged; only the reported reason becomes truthful.
  return resolved;
}

/**
 * Reads the durable advisory source through the extension host and decodes the externalized
 * business result the same way the measurement readback does.
 */
export async function readTrackBRouteAdvisorySourceFromRuntime(input: {
  readonly runtime: TrackBShadowPipelineRuntime;
  readonly channel: string;
  readonly scope: string;
  readonly stateRoot?: string;
  readonly authorizationEpoch?: number;
  readonly nowMs: number;
  readonly evidenceMaxAgeMs: number;
  /** Run 99 R33 D12: `revalidationIntervalDays` as milliseconds, when the caller has it. */
  readonly revalidationIntervalMs?: number | null;
  readonly requestId?: string;
}): Promise<TrackBRouteAdvisorySourceResult> {
  const requestId = input.requestId ?? `route-advisory:${input.scope}:${input.nowMs}`;
  const invoke = async (capability: string, value: Readonly<Record<string, unknown>>) => {
    const result = await input.runtime.invoke("knowledge-store", {
      requestId: `${requestId}:${capability}`,
      sessionId: requestId,
      protocolVersion: "1.1.0",
      channel: input.channel,
      scope: input.scope,
      authorizationEpoch: input.authorizationEpoch ?? 1,
      capability,
      value,
      payload: value,
    });
    return (
      decodeExtensionBusinessResult({
        result,
        extensionId: "knowledge-store",
        ...(input.stateRoot ? { stateRoot: input.stateRoot } : {}),
        scopeId: input.scope,
      }) ?? result
    );
  };
  return readTrackBRouteAdvisoryFromRollout({
    invoke,
    scopeId: input.scope,
    nowMs: input.nowMs,
    evidenceMaxAgeMs: input.evidenceMaxAgeMs,
    ...(Number.isFinite(input.revalidationIntervalMs)
      ? { revalidationIntervalMs: input.revalidationIntervalMs }
      : {}),
  });
}

/**
 * The observation for one already-taken live decision: the newest advisory for the scope
 * when one exists, and an explicit `unavailable` observation otherwise (`AC-R04-04`).
 */
export function observeTrackBRouteAdvisoryForDecision(input: {
  readonly channel: string;
  readonly scope: string;
  readonly routePackage: string;
  readonly decisionId: string;
  readonly eligibleRoutePackages?: readonly string[];
  readonly nowMs: number;
}) {
  const cached = recallTrackBRouteAdvisory(input);
  return buildTrackBRouteAdvisoryObservation({
    decisionId: input.decisionId,
    routePackage: input.routePackage,
    preferredRoutePackage: cached?.preferredRoutePackage ?? null,
    eligibleRoutePackages: input.eligibleRoutePackages,
    advisoryState: cached?.advisoryState ?? "unavailable",
    confidence: cached?.confidence ?? 0,
    profileSnapshotIds: cached?.profileSnapshotIds ?? [],
    candidateId: cached?.candidateId ?? null,
    advisoryId: cached?.advisoryId ?? null,
    observedAtMs: input.nowMs,
  });
}

/**
 * Run 98 R4 (stage S1, advisory-observed).
 *
 * The observation records what the advisory would have preferred for a decision that has
 * already been taken, without changing it: the baseline package, the advised package, the
 * advisory state/confidence/profile snapshots/candidate id, whether the advised package was
 * even eligible, and therefore whether the advisory would have changed the choice.
 * `selection: "baseline_retained"` is the S1 invariant (`AC-R04-02`).
 */
export function buildTrackBRouteAdvisoryObservation(input: {
  readonly decisionId: string;
  readonly routePackage: string;
  readonly preferredRoutePackage?: string | null;
  readonly eligibleRoutePackages?: readonly string[];
  readonly advisoryState: TrackBRouteAdvisoryState;
  readonly confidence?: number;
  readonly profileSnapshotIds?: readonly string[];
  readonly candidateId?: string | null;
  readonly advisoryId?: string | null;
  readonly reason?: string | null;
  readonly observedAtMs: number;
  /** Run 99 R25: the operative vocabulary of the decision that produced this observation. */
  readonly mode?: TrackBRouteAdvisoryMode;
  readonly selection?: TrackBRouteAdvisorySelection;
  readonly applied?: boolean;
  readonly fallbackReason?: string | null;
  /** Run 99 R27: the in-band requirement, recorded so a refusal is readable. */
  readonly scoreBand?: number | null;
  readonly scoreGapBefore?: number | null;
  readonly cohortBucket?: number | null;
  readonly cohortPercent?: number | null;
  readonly stage?: "S0" | "S1" | "S2" | "S3" | "S4";
  readonly policyVersion?: string | null;
  readonly origin?: "live" | "shadow";
  /** Live decisions answer the counterfactual question with what actually happened. */
  readonly wouldHaveChangedOverride?: boolean;
  /** Run 99 R27: the router's eligibility verdict, when the caller has it. */
  readonly preferredEligibleOverride?: boolean;
  readonly eligibleRoutePackageCountOverride?: number;
  /** Run 99 R33: the task family the advisory was scoped to, and the request's own family. */
  readonly taskTypeId?: string | null;
  readonly requestTaskTypeId?: string | null;
  readonly taxonomyVersion?: string | null;
  /** Run 99 close-out (addenda 19-21 S33/D1/D2): the classification the request was routed with. */
  readonly classification?: TrackBRouteAdvisoryClassification | null;
  /** Run 99 close-out (addenda 19-21 D6): how the observed arm was selected, and its propensity. */
  readonly selectionMode?: TrackBRouteAdvisorySelectionMode;
  readonly selectionProbability?: number;
}) {
  if (!input.decisionId || !input.routePackage) {
    throw new Error("route advisory observation requires decision and route package");
  }
  if (!Number.isSafeInteger(input.observedAtMs) || input.observedAtMs < 0) {
    throw new Error("route advisory observation timestamp is invalid");
  }
  if (
    input.selectionProbability !== undefined &&
    (!Number.isFinite(input.selectionProbability) ||
      input.selectionProbability <= 0 ||
      input.selectionProbability > 1)
  ) {
    throw new Error("route advisory observation propensity must fall within (0, 1]");
  }
  const normalizedClassification = normalizeTrackBRouteAdvisoryClassification(input.classification);
  const eligible = (input.eligibleRoutePackages ?? []).filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  const preferred =
    typeof input.preferredRoutePackage === "string" && input.preferredRoutePackage
      ? input.preferredRoutePackage
      : null;
  const preferredEligible =
    input.preferredEligibleOverride ?? Boolean(preferred && eligible.includes(preferred));
  return {
    schemaVersion: TRACK_B_ROUTE_ADVISORY_OBSERVATION_SCHEMA,
    decisionId: input.decisionId,
    routePackage: input.routePackage,
    preferredRoutePackage: preferred,
    preferredEligible,
    eligibleRoutePackageCount:
      input.eligibleRoutePackageCountOverride ?? eligible.length,
    wouldHaveChanged:
      input.wouldHaveChangedOverride ?? (preferredEligible && preferred !== input.routePackage),
    advisoryState: input.advisoryState,
    confidence: Number.isFinite(input.confidence) ? Number(input.confidence) : 0,
    profileSnapshotIds: [...(input.profileSnapshotIds ?? [])],
    candidateId: input.candidateId ?? null,
    advisoryId: input.advisoryId ?? null,
    ...(input.reason ? { reason: String(input.reason).slice(0, 256) } : {}),
    mode: input.mode ?? ("shadow" as const),
    selection: input.selection ?? ("baseline_retained" as const),
    ...(input.applied === undefined ? {} : { applied: input.applied === true }),
    ...(input.fallbackReason === undefined
      ? {}
      : {
          fallbackReason:
            input.fallbackReason === null
              ? null
              : String(input.fallbackReason).slice(0, 128),
        }),
    ...(Number.isSafeInteger(input.cohortBucket) ? { cohortBucket: input.cohortBucket } : {}),
    ...(Number.isFinite(input.scoreBand) ? { scoreBand: input.scoreBand } : {}),
    ...(Number.isFinite(input.scoreGapBefore) ? { scoreGapBefore: input.scoreGapBefore } : {}),
    ...(Number.isFinite(input.cohortPercent) ? { cohortPercent: input.cohortPercent } : {}),
    ...(input.stage ? { stage: input.stage } : {}),
    ...(input.policyVersion ? { policyVersion: String(input.policyVersion).slice(0, 128) } : {}),
    ...(input.taskTypeId
      ? { taskTypeId: String(input.taskTypeId).slice(0, 128) }
      : { taskTypeId: null }),
    ...(input.requestTaskTypeId
      ? { requestTaskTypeId: String(input.requestTaskTypeId).slice(0, 128) }
      : { requestTaskTypeId: null }),
    ...(input.taxonomyVersion
      ? { taxonomyVersion: String(input.taxonomyVersion).slice(0, 128) }
      : {}),
    ...(normalizedClassification ? { classification: normalizedClassification } : {}),
    ...(input.selectionMode
      ? {
          selectionMode: input.selectionMode,
          // The canonical contract (`PerformanceSampleV2`) requires a propensity in (0, 1]. A
          // counterfactual arm was chosen by the replay scheduler rather than drawn from the
          // policy, so its propensity is unobservable and `D6` requires the evidence to stay
          // observational instead of inventing one.
          ...(Number.isFinite(input.selectionProbability)
            ? { selectionProbability: Number(input.selectionProbability) }
            : {}),
        }
      : {}),
    origin: input.origin ?? ("shadow" as const),
    observedAtMs: input.observedAtMs,
  };
}

export const TRACK_B_ROUTE_ADVISORY_MODES = [
  "shadow",
  "advisory_considered",
  "bounded_cohort",
  "active",
] as const;
export type TrackBRouteAdvisoryMode = (typeof TRACK_B_ROUTE_ADVISORY_MODES)[number];
export type TrackBRouteAdvisorySelection = "baseline_retained" | "advisory_applied";

/**
 * Run 99 close-out (addenda 19-21 `S33`/`D1`/`D2`): the classification a request was routed with,
 * recorded so the evidence can be keyed by `(channel, scope, route package, taskTypeId)` and by the
 * taxonomy identity it was classified against. Shape follows the canonical
 * `route-learning-contracts.schema.json` `scope` object (`roleId`, `taskTypeId`, `toolClassIds`).
 */
export interface TrackBRouteAdvisoryClassification {
  readonly taskTypeId?: string | null;
  readonly roleId?: string | null;
  readonly toolClassIds?: readonly string[] | null;
  readonly taxonomyVersion?: string | null;
  readonly contentRevision?: string | null;
  readonly contentHashes?: { readonly taskTypes?: string | null } | null;
}

/**
 * Run 99 close-out (`D6`): the canonical `PerformanceSampleV2.selectionMode` vocabulary.
 * `policy_deterministic` is the live routing case — the recorded package is the policy's own
 * deterministic choice, so its propensity is 1. `replay_counterfactual` is an arm the replay
 * scheduler chose, whose propensity is unobservable and therefore never fabricated.
 */
export const TRACK_B_ROUTE_ADVISORY_SELECTION_MODES = [
  "policy_deterministic",
  "policy_randomized",
  "controlled_exploration",
  "manual",
  "replay_counterfactual",
] as const;
export type TrackBRouteAdvisorySelectionMode =
  (typeof TRACK_B_ROUTE_ADVISORY_SELECTION_MODES)[number];

const boundedClassificationId = (value: unknown, max = 128): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

/**
 * Bounds and normalizes the classification before it is persisted, and returns `null` when nothing
 * was declared so the record shows absence rather than an invented classification.
 */
function normalizeTrackBRouteAdvisoryClassification(
  value: TrackBRouteAdvisoryClassification | null | undefined,
): TrackBRouteAdvisoryClassification | null {
  if (!value || typeof value !== "object") return null;
  const taskTypeId = boundedClassificationId(value.taskTypeId);
  const roleId = boundedClassificationId(value.roleId);
  const toolClassIds = Array.isArray(value.toolClassIds)
    ? [
        ...new Set(
          value.toolClassIds
            .map((item) => boundedClassificationId(item))
            .filter((item): item is string => item !== null),
        ),
      ].slice(0, 256)
    : [];
  const taxonomyVersion = boundedClassificationId(value.taxonomyVersion);
  const contentRevision = boundedClassificationId(value.contentRevision);
  const taskTypesHash = boundedClassificationId(value.contentHashes?.taskTypes, 256);
  if (
    !taskTypeId &&
    !roleId &&
    toolClassIds.length === 0 &&
    !taxonomyVersion &&
    !contentRevision &&
    !taskTypesHash
  ) {
    return null;
  }
  return {
    taskTypeId,
    roleId,
    toolClassIds,
    taxonomyVersion,
    contentRevision,
    contentHashes: { taskTypes: taskTypesHash },
  };
}

const advisoryModeForStage = (stage: string): TrackBRouteAdvisoryMode => {
  if (stage === "S4") return "active";
  if (stage === "S3") return "bounded_cohort";
  if (stage === "S2") return "advisory_considered";
  return "shadow";
};

/**
 * Run 99 R25 / `AC-R05-03`: the observation for a decision the live router already took.
 *
 * Unlike the shadow pipeline's observation, this one records what actually happened: whether the
 * advisory was applied, the router's typed fallback reason, the cohort bucket and the operative
 * stage, so the operator surface can distinguish "considered but retained" from "applied" instead
 * of reporting every decision as an S1 shadow.
 */
export function buildLiveRouteAdvisoryObservation(input: {
  readonly decisionId: string;
  readonly routePackage: string;
  readonly eligibleRoutePackages?: readonly string[];
  readonly advisory: {
    readonly candidateId?: string | null;
    readonly preferredEndpointId?: string | null;
    readonly advisoryId?: string | null;
    readonly advisoryState: TrackBRouteAdvisoryState;
    readonly confidence?: number;
    readonly stage: "S0" | "S1" | "S2" | "S3" | "S4";
    readonly policyVersion?: string | null;
    readonly cohortPercent?: number | null;
    readonly scoreBand?: number | null;
    readonly taskTypeId?: string | null;
    readonly requestTaskTypeId?: string | null;
    readonly taxonomyVersion?: string | null;
  };
  /** Run 99 close-out (addenda 19-21 S33): the classification this request was routed with. */
  readonly classification?: TrackBRouteAdvisoryClassification | null;
  /** Run 99 close-out (addenda 19-21 D6): the selection mode of the observed arm. */
  readonly selectionMode?: TrackBRouteAdvisorySelectionMode;
  readonly selectionProbability?: number;
  readonly outcome?: {
    readonly applied?: boolean;
    readonly fallbackReason?: string | null;
    readonly cohortBucket?: number | null;
    readonly scoreGapBefore?: number | null;
    readonly advisoryPackageEligible?: boolean;
    readonly eligibleEndpointCount?: number;
  } | null;
  readonly observedAtMs: number;
}): Record<string, unknown> {
  const stage = input.advisory.stage;
  const consulted = stage === "S2" || stage === "S3" || stage === "S4";
  const applied = consulted && input.outcome?.applied === true;
  const selectionMode = input.selectionMode ?? ("policy_deterministic" as const);
  // A deterministic policy picks the recorded package with probability 1; a counterfactual arm is
  // handed back to the caller's explicit value (or omitted) so no propensity is invented.
  const selectionProbability =
    selectionMode === "replay_counterfactual"
      ? input.selectionProbability
      : (input.selectionProbability ?? 1);
  return buildTrackBRouteAdvisoryObservation({
    decisionId: input.decisionId,
    routePackage: input.routePackage,
    preferredRoutePackage: input.advisory.preferredEndpointId ?? null,
    eligibleRoutePackages: input.eligibleRoutePackages,
    advisoryState: input.advisory.advisoryState,
    confidence: input.advisory.confidence,
    candidateId: input.advisory.candidateId ?? null,
    advisoryId: input.advisory.advisoryId ?? null,
    observedAtMs: input.observedAtMs,
    mode: advisoryModeForStage(stage),
    selection: applied ? "advisory_applied" : "baseline_retained",
    applied,
    // For a live decision the counterfactual question and the observed answer coincide: the
    // advisory changed the choice or it did not.
    wouldHaveChangedOverride: applied,
    fallbackReason: applied ? null : (input.outcome?.fallbackReason ?? null),
    cohortBucket: input.outcome?.cohortBucket ?? null,
    scoreBand: input.advisory.scoreBand ?? null,
    scoreGapBefore: input.outcome?.scoreGapBefore ?? null,
    // The router's own verdict wins over the pre-filter candidate list.
    ...(input.outcome?.advisoryPackageEligible === undefined
      ? {}
      : { preferredEligibleOverride: input.outcome.advisoryPackageEligible }),
    ...(Number.isSafeInteger(input.outcome?.eligibleEndpointCount)
      ? { eligibleRoutePackageCountOverride: input.outcome?.eligibleEndpointCount }
      : {}),
    cohortPercent: input.advisory.cohortPercent ?? null,
    stage,
    policyVersion: input.advisory.policyVersion ?? null,
    taskTypeId: input.advisory.taskTypeId ?? null,
    requestTaskTypeId: input.advisory.requestTaskTypeId ?? null,
    taxonomyVersion: input.advisory.taxonomyVersion ?? null,
    classification: input.classification ?? null,
    selectionMode,
    selectionProbability,
    origin: "live",
  });
}

/**
 * Durable, bounded advisory-observation ledger (`R4`/`R12`). The runtime appends one
 * observation per decision; the operator readback derives the advisory-state distribution
 * and the counterfactual influence rate from `totals` without replaying the decisions.
 */
export async function appendTrackBRouteAdvisoryObservation(input: {
  readonly filePath: string;
  readonly observation: Readonly<Record<string, unknown>>;
  readonly maxEntries?: number;
}) {
  // Run 99 R25: the live routing path and the shadow pipeline append to this ledger from the
  // same process, and the pid-suffixed temp file made one rename consume the other's temp
  // (`ENOENT ... advisory-observations.json.<pid>.tmp`). Serialize per file so a
  // read-modify-write cannot lose entries, and keep a unique temp name as defence in depth.
  const previous = trackBAdvisoryLedgerLocks.get(input.filePath) ?? Promise.resolve();
  const append = previous
    .catch(() => undefined)
    .then(() => appendTrackBRouteAdvisoryObservationExclusive(input));
  trackBAdvisoryLedgerLocks.set(
    input.filePath,
    append.then(
      () => undefined,
      () => undefined,
    ),
  );
  return append;
}

const trackBAdvisoryLedgerLocks = new Map<string, Promise<void>>();

async function appendTrackBRouteAdvisoryObservationExclusive(input: {
  readonly filePath: string;
  readonly observation: Readonly<Record<string, unknown>>;
  readonly maxEntries?: number;
}) {
  const maxEntries =
    Number.isSafeInteger(input.maxEntries) && Number(input.maxEntries) > 0
      ? Number(input.maxEntries)
      : TRACK_B_ROUTE_ADVISORY_LEDGER_MAX_ENTRIES;
  const empty = {
    schemaVersion: TRACK_B_ROUTE_ADVISORY_OBSERVATION_LEDGER_SCHEMA,
    revision: 0,
    updatedAtMs: 0,
    totals: {
      observed: 0,
      fresh: 0,
      stale: 0,
      unavailable: 0,
      wouldHaveChanged: 0,
      preferredEligible: 0,
      // Run 99 R25: `AC-R05-03` observability - a consulted advisory and an applied one are
      // different outcomes, and only the applied count is influence.
      considered: 0,
      applied: 0,
    },
    entries: [] as Readonly<Record<string, unknown>>[],
  };
  let ledger = empty;
  try {
    const parsed = JSON.parse(await readFile(input.filePath, "utf8")) as typeof empty;
    if (parsed?.schemaVersion === TRACK_B_ROUTE_ADVISORY_OBSERVATION_LEDGER_SCHEMA) {
      ledger = {
        ...empty,
        ...parsed,
        totals: { ...empty.totals, ...(parsed.totals ?? {}) },
        entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const observation = input.observation;
  const state = String(observation.advisoryState ?? "unavailable");
  const totals = {
    observed: ledger.totals.observed + 1,
    fresh: ledger.totals.fresh + (state === "fresh" ? 1 : 0),
    stale: ledger.totals.stale + (state === "stale" ? 1 : 0),
    unavailable: ledger.totals.unavailable + (state === "unavailable" ? 1 : 0),
    wouldHaveChanged:
      ledger.totals.wouldHaveChanged + (observation.wouldHaveChanged === true ? 1 : 0),
    preferredEligible:
      ledger.totals.preferredEligible + (observation.preferredEligible === true ? 1 : 0),
    considered:
      ledger.totals.considered +
      (observation.mode === "advisory_considered" ||
      observation.mode === "bounded_cohort" ||
      observation.mode === "active"
        ? 1
        : 0),
    applied: ledger.totals.applied + (observation.applied === true ? 1 : 0),
  };
  const next = {
    schemaVersion: TRACK_B_ROUTE_ADVISORY_OBSERVATION_LEDGER_SCHEMA,
    revision: ledger.revision + 1,
    updatedAtMs: Date.now(),
    totals,
    entries: [...ledger.entries, observation].slice(-maxEntries),
  };
  await mkdir(path.dirname(input.filePath), { recursive: true });
  const temporary = `${input.filePath}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(temporary, input.filePath);
  return next;
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
    // Run 98 addendum 32 S2: `required_terms` now grants proportional credit instead of all-or-nothing
    // (the deterministic ruler's semantics changed), so the definition registers as a new scorer
    // version. Evaluation Core keys on `id@version`; a semantics change under the old identity is
    // refused as "duplicate scorer ID has incompatible version" and mixed-version means stay readable.
    version: overrides.version ?? "3",
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

/**
 * Run 97 RC04: the canonical replay comparison scorer set (`guidance/09`:
 * `role-model.scorers.replay.pairwise.v1 -> ['role_model_pairwise_judge.battle']`).
 *
 * The deterministic semantic-criteria scorer alone cannot decision a routing
 * counterfactual: on live traffic both branches scored 0 against terms derived from
 * the request text, so every comparison finalized as `tie` and the shadow learner
 * never received evidence. This scorer carries the router judge's pairwise
 * preference as its own durable dimension; Evaluation Core persists it with the
 * judge receipt and folds it into the comparison outcome.
 */
export const RUN97_PAIRWISE_JUDGE_SCORER_ID = "role_model_pairwise_judge.battle";
export const RUN97_PAIRWISE_JUDGE_DIMENSION = "task_specific_quality";
/**
 * Run 99 R33 (S34 live finding): version of the judge scorer *definition shape*.
 *
 * Evaluation Core keys its durable scorer registry on `id@version` and refuses a different
 * definition under the same key. Durable registries already contain
 * `role_model_pairwise_judge.battle@1+<identity hash>` — written before the definition carried
 * `judgeMode`. Any change to the definition shape must therefore bump this prefix so the new
 * definition registers under a fresh key instead of colliding with the legacy entry
 * (`duplicate scorer ID has incompatible version`, observed live on stage v132).
 */
export const RUN97_PAIRWISE_JUDGE_DEFINITION_VERSION = 2;

export function createRun97PairwiseJudgeScorer(input: {
  readonly judgeEndpointId: string;
  /**
   * Run 98 R10 (AC-R10-03): the judge mode is part of the scorer identity, so a mode
   * change produces a different scorer digest (and, for non-default modes, a different
   * scorer set version) and therefore invalidates comparisons and packs bound to the
   * previous judge identity.
   */
  readonly judgeMode?: "identified" | "identity_blind";
}): {
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
  readonly source: string;
  readonly judgeEndpointId: string;
  readonly judgeMode: "identified" | "identity_blind";
} {
  if (typeof input?.judgeEndpointId !== "string" || !input.judgeEndpointId.trim()) {
    throw new Error("pairwise judge scorer requires a router judge endpoint");
  }
  const judgeMode: "identified" | "identity_blind" =
    input.judgeMode === "identity_blind" ? "identity_blind" : "identified";
  // Run 98 R10 (AC-R10-03): Evaluation Core keys its durable scorer registry on
  // `id@version` and refuses a different definition under the same key. The judge identity
  // (endpoint + mode) is part of the definition, so it must be part of the version too —
  // otherwise the first judge change fails the comparison with "duplicate scorer ID has
  // incompatible version" (observed live at 2026-09-14T08:38Z).
  // Run 99 R33 (S34 live finding): the definition gained `judgeMode`, but the version prefix stayed
  // `1+…`, so a durable registry written before that field existed collided with today's definition
  // ("duplicate scorer ID has incompatible version") and every comparison deferred. Evaluation Core
  // keys on `id@version`, so a definition change must bump the version: `2+<identity hash>`.
  const judgeIdentityVersion = `${RUN97_PAIRWISE_JUDGE_DEFINITION_VERSION}+${createHash("sha256")
    .update(
      JSON.stringify(
        canonicalExtensionValue({
          judgeEndpointId: input.judgeEndpointId.trim(),
          judgeMode,
        }),
      ),
    )
    .digest("hex")
    .slice(0, 12)}`;
  const definition = {
    manifestVersion: 2 as const,
    id: RUN97_PAIRWISE_JUDGE_SCORER_ID,
    version: judgeIdentityVersion,
    scorerSetVersion:
      judgeMode === "identified"
        ? RUN96_ROUTING_SHADOW_SCORER_SET_VERSION
        : `${RUN96_ROUTING_SHADOW_SCORER_SET_VERSION}.identity-blind`,
    algorithm: "pairwise_battle",
    dimensions: [RUN97_PAIRWISE_JUDGE_DIMENSION],
    range: { min: 0, max: 1 },
    direction: "higher_is_better",
    requiredInputs: ["outputRef", "evaluationCriteria"],
    source: "role_model_pairwise_judge",
    judgeEndpointId: input.judgeEndpointId.trim(),
    judgeMode,
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
  console.error(`[run97] shadow pipeline start ${input.requestId}`);
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
  // Run 98 addendum 33 S5: when the case criteria are structured assertions, the deterministic dimension
  // is scored by the assertion algorithm instead of term overlap — the scorer definition follows the
  // criteria, so both the durable manifest and the recorded score name the ruler that actually ran.
  const usesStructuredAssertions = input.evaluationCases.some((evaluationCase) => {
    const criteria = (evaluationCase as Record<string, unknown> | undefined)?.evaluationCriteria as
      | { assertions?: readonly unknown[] }
      | undefined;
    return Array.isArray(criteria?.assertions) && criteria.assertions.length > 0;
  });
  const scorer = createRun96RoutingShadowScorer(
    usesStructuredAssertions ? { algorithm: "structured_assertions" } : {},
  );
  const scorerSetVersion = scorer.scorerSetVersion;
  // RC04: the semantic-criteria dimension only exists when the comparison carries a
  // real task requirement. Greeting-only criteria from live traffic were dead weight
  // (both branches score 0) and actively harmful when they fired at random.
  const deterministicCriteriaVerifiable = input.evaluationCases.some((evaluationCase) =>
    hasVerifiableSemanticCriteria(
      (evaluationCase as Record<string, unknown> | undefined)?.evaluationCriteria,
    ),
  );
  if (deterministicCriteriaVerifiable) {
    await runtime.invoke("evaluation-core", {
      ...envelope("evaluation:register-scorer", scorer),
    });
  }
  // RC04 (L4): the deterministic semantic-criteria scorer alone cannot decision a
  // real routing counterfactual - live traffic produced `tie` for every group because
  // both branches scored 0 against terms derived from the request text. When the host
  // supplies a router judge, the canonical pairwise judge dimension joins the scorer
  // set so the comparison carries a real preference with judge provenance.
  const judgeScorer = input.judge
    ? createRun97PairwiseJudgeScorer({
        judgeEndpointId: input.judge.endpointId,
        ...(input.judge.mode ? { judgeMode: input.judge.mode } : {}),
      })
    : null;
  if (judgeScorer) {
    await runtime.invoke("evaluation-core", {
      ...envelope("evaluation:register-scorer", judgeScorer),
    });
  }
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
  // Run 99 R33 (addendum 20 D7): the holdout is a declared, family-stratified, reproducible split
  // (`stratified_hash_partition_v1` + seed + stratum), not a request-id-only identity.
  const holdout = buildFamilyStratifiedHoldout({
    requestId: input.requestId,
    taskTypeId: input.taskTypeId ?? null,
    caseIds,
    splitSeed: RUN99_HOLDOUT_SPLIT_SEED,
  });
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
    // Run 99 R33: the family travels with the group (evaluation-core persists it on the
    // comparability record), so per-family evidence counts are derivable from the readback.
    ...(typeof input.taskTypeId === "string" && input.taskTypeId.trim()
      ? { taskTypeId: input.taskTypeId.trim() }
      : {}),
    ...(typeof input.taxonomyVersion === "string" && input.taxonomyVersion.trim()
      ? { taxonomyVersion: input.taxonomyVersion.trim() }
      : {}),
    inputRef: evaluationReferences.inputRef,
    forkRef: evaluationReferences.forkRef,
    policyId: "run96-routing-shadow",
    scorerSetVersion,
    // Run 99 close-out (addendum 21 §4 S33): the judge order policy is part of the comparability key,
    // so a comparison records the presentation order that produced it.
    ...(input.judgeOrderPolicy ? { judgeOrderPolicy: input.judgeOrderPolicy } : {}),
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
  // Run 99 R33 (D7 live finding): Evaluation Core refuses a re-created job whose contract-relevant
  // shape changed under the same id ("evaluation job idempotency conflict"), which stranded every
  // capture whose job had been created by the previous build and blocked the comparison. The durable
  // identity is therefore contract-addressed: it carries a bounded digest of the declared holdout
  // membership, the scoring identity and the comparability, so a changed contract produces a new job
  // instead of colliding with the old one, while an unchanged replay still reuses its job.
  const evaluationContractDigest = createHash("sha256")
    .update(
      JSON.stringify(
        canonicalizeRun88Proof({
          holdoutId: holdout.holdoutId,
          holdoutCaseIds: [...caseIds].sort(),
          scorerSetVersion,
          taskRef: comparability.taskRef,
          inputRef: comparability.inputRef,
          forkRef: comparability.forkRef,
          toolPolicyDigest: comparability.toolPolicyDigest,
          environmentDigest: comparability.environmentDigest,
        }),
      ),
    )
    .digest("hex")
    .slice(0, 16);
  const jobId =
    input.evaluationJobIds?.[0] ?? `evaluation:${input.requestId}:${evaluationContractDigest}`;
  if (typeof jobId !== "string" || !jobId) {
    throw new Error("durable routing-shadow evaluation job identity is invalid");
  }
  // Run 99 R33 (addendum 20 D7, second half): the declared split partitions a *candidate's own*
  // cases. A candidate that contributes a single case cannot hold it out and still be compared, so
  // that case stays in the holdout set; the declared partition applies where a candidate carries
  // more than one case. The membership published below always matches the partitions stamped here.
  const casesPerCandidate = new Map<string, number>();
  for (const rollout of rolloutRows) {
    const candidateRef = requireTrackBReference(rollout.endpointId, "candidate");
    casesPerCandidate.set(candidateRef, (casesPerCandidate.get(candidateRef) ?? 0) + 1);
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
    const candidateRef = requireTrackBReference(rollout.endpointId, "candidate");
    const declaredPartition =
      holdout.partitions.find((row) => row.caseId === caseIds[index])?.partition ?? "holdout";
    const partition =
      (casesPerCandidate.get(candidateRef) ?? 1) > 1 ? declaredPartition : "holdout";
    return {
      id: caseIds[index],
      partition,
      candidateRef,
      evidenceRef: caseReference.evidenceRef,
      sourceGeneration: 0,
      evaluationCriteria,
      evaluationCriteriaDigest: digestTrackBSemanticEvaluationCriteria(evaluationCriteria),
    };
  });
  // Run 99 R33 D7: publish the membership that matches the partitions actually stamped — a candidate
  // whose only case cannot be held out still binds the canonical digest Evaluation Core recomputes.
  const effectiveHoldoutCaseIds = durableCases
    .filter((entry) => entry.partition === "holdout")
    .map((entry) => entry.id);
  const effectiveHoldout = {
    ...holdout,
    caseIds: effectiveHoldoutCaseIds,
    membershipDigest: computeHoldoutMembershipDigest(effectiveHoldoutCaseIds),
  };
  /**
   * Run 99 R33 live finding (stage v161): a resumed completion re-presents the same durable job. The
   * extension compares the whole canonical job JSON, so a re-derived attestation or proof makes the
   * re-presentation an `evaluation job idempotency conflict` — and a conflict meant the resumed
   * comparison could never be finalized. The durable job is the authority for this comparison, so a
   * conflict continues with the stored job and lets the finalize step refuse if its holdout does not
   * match the resumed derivation. Any other create failure still fails closed.
   */
  const createJobEnvelope = {
    ...envelope("evaluation:create-job", {
      id: jobId,
      idempotencyKey: jobId,
      evaluationSchemaVersion: 3,
      candidateRef: requireTrackBReference(sourceRollout.endpointId, "source candidate"),
      policyId: "run96-routing-shadow",
      scorerSetVersion,
      requestKind: "routing_shadow_durable",
      comparability,
      holdout: effectiveHoldout,
      referenceAttestation,
      cases: durableCases,
    }),
  };
  try {
    await runtime.invoke("evaluation-core", createJobEnvelope);
  } catch (error) {
    if (!isEvaluationJobIdempotencyConflict(error)) throw error;
  }
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
      const rawScores = await runtime.invoke("evaluation-core", {
        ...envelope("evaluation:list-trial-scores", { trialId: trial.trialId }),
      });
      // Run 99 R33 (v162 live finding): the readback can cross the boundary as an externalized
      // business result or a `{scores}` wrapper; only a bare array was recognized, so durable scored
      // trials looked unscored and the resumed comparison refused with "no recorded scores".
      const decodedScores =
        decodeExtensionBusinessResult({
          result: rawScores,
          extensionId: "evaluation-core",
          ...(input.contractStateRoot ? { stateRoot: input.contractStateRoot } : {}),
          scopeId: input.scope,
        }) ?? rawScores;
      const scoreRows = [...normalizeTrialScoreRows(decodedScores)];
      if (scoreRows.length === 0) {
        // Bounded diagnostic: a durable scored trial always has rows in the store, so an empty
        // readback means the host did not recognize the transport shape.
        console.error(
          `[run99] durable trial score readback unrecognized:${trial.trialId} ${JSON.stringify(
            rawScores,
          ).slice(0, 300)}`,
        );
      }
      // Run 99 R33: the durable trial's own recorded scores decide what it can prove. A resumed run
      // can re-derive a rubric the durable run never graded against, and refusing that trial made the
      // comparison unfinalizable; the recorded scores carry the comparison instead.
      const durableEvidence = selectDurableScoredTrialEvidence({
        scores: scoreRows,
        scorerId: scorer.id,
        scorerVersion: scorer.version,
      });
      completedRollouts.push({
        rollout,
        score: durableEvidence.score,
        trialId: trial.trialId,
        scoreId: durableEvidence.scoreId,
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
    // Run 98 addendum 31 S4 (live finding, stage v191): the trial result claimed three streams
    // (`outputRef == stdoutRef == stderrRef`) and two measurements it never made
    // (`{elapsedMs: 0, outputBytes: 0}`). A replay executes one provider call whose raw record is the
    // provider-result artifact, so the stdout/stderr references point at that record and the result
    // says they are one artifact; and because this runner performs no timing or byte measurement, it
    // says so instead of reporting zeros as measured values.
    const providerRecordRef =
      typeof (rollout.outcome as Record<string, unknown> | undefined)?.outcomeRef === "string" &&
      String((rollout.outcome as Record<string, unknown>).outcomeRef).trim()
        ? String((rollout.outcome as Record<string, unknown>).outcomeRef).trim()
        : outputRef;
    const execution = await runtime.invoke("evaluation-runner-local", {
      ...envelope("evaluation:execute-trial", {
        trialId: trial.trialId,
        actual,
        evaluationCriteria,
        outputRef,
        outputDigest,
        stdoutRef: providerRecordRef,
        stderrRef: providerRecordRef,
        exitCode: 0,
        streams: "single_provider_artifact",
        measurements: { measured: false, reason: "replay_runner_reports_no_timings" },
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
          // Run 98 addendum 31 S4: the stream model travels with the result, so a reader can tell the
          // single provider artifact from three independently captured streams.
          ...(execution.streams ? { streams: execution.streams } : {}),
          referenceAttestation: trialReferenceAttestation,
        }),
      });
    }
    // RC04: when no verifiable task requirement exists the semantic-criteria scores are
    // not recorded at all, so the comparison is decided by the router judge dimension
    // alone (or reported `insufficient` when no judge exists) instead of by a check
    // that measures nothing.
    let correctness: Record<string, unknown> | undefined;
    if (deterministicCriteriaVerifiable) {
      await runtime.invoke("evaluation-core", {
        ...envelope("evaluation:record-trial-score-batch", {
          trialId: trial.trialId,
          scores: execution.scores,
          referenceAttestation: trialReferenceAttestation,
        }),
      });
      correctness = (execution.scores as Record<string, unknown>[]).find(
        (score) =>
          score.dimension === "correctness" &&
          score.scorerId === scorer.id &&
          score.scorerVersion === scorer.version,
      );
      if (!correctness || !Number.isFinite(correctness.score)) {
        throw new Error("durable semantic evaluation did not produce a correctness score");
      }
    }
    completedRollouts.push({
      rollout,
      score: correctness ? Number(correctness.score) : 0,
      trialId: trial.trialId,
      scoreId:
        typeof correctness?.scoreId === "string" && correctness.scoreId
          ? correctness.scoreId
          : `score:${trial.trialId}:${scorer.id}:correctness`,
      referenceAttestation: trialReferenceAttestation,
    });
    trialIds.push(trial.trialId);
  }
  if (judgeScorer && input.judge) {
    // One bounded judgement per comparison, after both branches produced durable
    // output, so the judge sees the same evidence the comparison will bind. The
    // dispatch itself is the host's (provider execution + ledger accounting).
    const sourceEntry = completedRollouts[0];
    const counterfactualEntry = completedRollouts[1];
    const judgeBranches = [sourceEntry, counterfactualEntry].map((entry, index) =>
      entry
        ? {
            trialId: entry.trialId,
            candidateRef: entry.rollout.endpointId as string,
            outputRef: String(entry.rollout.artifactRef ?? ""),
            outputDigest: String(
              (entry.rollout.outcome as Record<string, unknown> | undefined)?.outcomeDigest ?? "",
            ),
            outputText:
              typeof entry.rollout.evaluationActual === "string"
                ? entry.rollout.evaluationActual
                : "",
            role: index === 0 ? ("source" as const) : ("counterfactual" as const),
          }
        : null,
    );
    const [sourceBranch, counterfactualBranch] = judgeBranches;
    if (!sourceBranch || !counterfactualBranch) {
      throw new Error("pairwise judge requires both durable comparison branches");
    }
    // Run 99 R33 live finding (v165): a resumed comparison reuses durable scored trials, and a pair
    // that already carries *this* judge's score keeps the original receipt. Re-judging would dispatch
    // again and then be refused as a score conflict (`evaluation trial score batch conflict` /
    // `partial evaluation trial scores require recovery`), so the durable rows are the authority.
    const durableJudgeScores = await (async () => {
      const scoresByTrial: Record<string, readonly Record<string, unknown>[]> = {};
      for (const branch of [sourceBranch, counterfactualBranch]) {
        const rawScores = await runtime.invoke("evaluation-core", {
          ...envelope("evaluation:list-trial-scores", { trialId: branch.trialId }),
        });
        const decoded =
          decodeExtensionBusinessResult({
            result: rawScores,
            extensionId: "evaluation-core",
            ...(input.contractStateRoot ? { stateRoot: input.contractStateRoot } : {}),
            scopeId: input.scope,
          }) ?? rawScores;
        scoresByTrial[branch.trialId] = normalizeTrialScoreRows(decoded);
      }
      return selectDurableJudgeScores({
        trialIds: [sourceBranch.trialId, counterfactualBranch.trialId],
        scoresByTrial,
        scorerId: judgeScorer.id,
        scorerVersion: judgeScorer.version,
        dimension: judgeScorer.dimensions[0],
      });
    })();
    let judgeScores: Array<Record<string, unknown>>;
    if (durableJudgeScores) {
      judgeScores = [...durableJudgeScores];
    } else {
    try {
      const decision = await input.judge.dispatch({
        requestId: input.requestId,
        channel: input.channel,
        scope: input.scope,
        authorizationEpoch: input.authorizationEpoch,
        evaluationJobId: jobId,
        judgeEndpointId: input.judge.endpointId,
        source: {
          trialId: sourceBranch.trialId,
          candidateRef: sourceBranch.candidateRef,
          outputRef: sourceBranch.outputRef,
          outputDigest: sourceBranch.outputDigest,
          outputText: sourceBranch.outputText,
        },
        counterfactual: {
          trialId: counterfactualBranch.trialId,
          candidateRef: counterfactualBranch.candidateRef,
          outputRef: counterfactualBranch.outputRef,
          outputDigest: counterfactualBranch.outputDigest,
          outputText: counterfactualBranch.outputText,
        },
      });
      const winner = decision?.winner;
      if (
        winner !== "source" &&
        winner !== TRACK_B_PAIRWISE_JUDGE_WINNER_COUNTERFACTUAL &&
        winner !== "tie"
      ) {
        throw new Error("router judge returned an unknown pairwise winner");
      }
      if (!Number.isFinite(decision.confidence) || decision.confidence < 0 || decision.confidence > 1) {
        throw new Error("router judge returned unbounded confidence");
      }
      const judgeReceipt = {
        dispatchReceiptId: decision.dispatchReceiptId,
        routerDecisionId: decision.routerDecisionId,
        judgeResultRef: decision.judgeResultRef,
        judgeEndpointId: decision.judgeEndpointId,
        ...(decision.judgeMode ? { judgeMode: decision.judgeMode } : {}),
        ...(decision.presentation ? { presentation: decision.presentation } : {}),
        ...(decision.judgeModeAgreement === undefined
          ? {}
          : { judgeModeAgreement: decision.judgeModeAgreement }),
        // Run 98 addendum 33 S2: a pair the judge flipped under the swapped presentation was calibrated
        // to an explicit tie; the flip travels with the receipt so the comparison can report it.
        ...(decision.orderDisagreement === true ? { orderDisagreement: true } : {}),
      };
      judgeScores = [sourceBranch, counterfactualBranch].map((branch) => ({
        scorerId: judgeScorer.id,
        scorerVersion: judgeScorer.version,
        scorerDigest: judgeScorer.digest,
        scorerDefinition: judgeScorer,
        dimension: judgeScorer.dimensions[0],
        score: pairwiseJudgeScores({ winner, role: branch.role }),
        confidence: decision.confidence,
        source: judgeScorer.source,
        judgeReceipt,
      }));
    } catch (error) {
      // guidance/09: a judge failure is persisted as a scorer failure, never as a
      // valid zero score. The comparison then stays honestly undecided instead of
      // manufacturing a tie from an unrun judge.
      // Run 99 R33 (addendum 21 D10): the canonical code travels with the failure, so the
      // learner's exclusion counter can name the incomparability instead of a generic string.
      const failureCode =
        typeof (error as { code?: unknown })?.code === "string"
          ? String((error as { code: string }).code).slice(0, 48)
          : null;
      const reason = `${failureCode ? `${failureCode}: ` : ""}router judge failed: ${
        error instanceof Error ? error.message.slice(0, 160) : "unknown judge error"
      }`;
      judgeScores = [sourceBranch, counterfactualBranch].map((branch) => ({
        scorerId: judgeScorer.id,
        scorerVersion: judgeScorer.version,
        scorerDigest: judgeScorer.digest,
        scorerDefinition: judgeScorer,
        dimension: judgeScorer.dimensions[0],
        score: null,
        confidence: 0,
        source: judgeScorer.source,
        missingness: "invalid",
        missingReason: reason.slice(0, 200),
      }));
    }
    }
    for (const [index, branch] of [sourceBranch, counterfactualBranch].entries()) {
      // A reused durable judgement is already recorded; re-recording it is what the extension refuses.
      if (durableJudgeScores) break;
      const entry = index === 0 ? sourceEntry : counterfactualEntry;
      await runtime.invoke("evaluation-core", {
        ...envelope("evaluation:record-trial-score-batch", {
          trialId: branch.trialId,
          scores: [judgeScores[index]],
          ...(entry?.referenceAttestation
            ? { referenceAttestation: entry.referenceAttestation }
            : {}),
        }),
      });
    }
  }
  // Run 99 R33 live finding (v167): the durable trial rows are written against the job's immutable
  // comparability and holdout tuple, so a resumed run that passes its own re-derivation is refused
  // with "submitted trials with matching durable comparability and holdout evidence required". Read
  // the stored job and adopt that tuple when it exists.
  const storedJobForBinding = await (async () => {
    try {
      const rawJob = await runtime.invoke("evaluation-core", {
        ...envelope("evaluation:get-job", { jobId }),
      });
      return (
        decodeExtensionBusinessResult({
          result: rawJob,
          extensionId: "evaluation-core",
          ...(input.contractStateRoot ? { stateRoot: input.contractStateRoot } : {}),
          scopeId: input.scope,
        }) ?? rawJob
      );
    } catch {
      return null;
    }
  })();
  const finalizeBinding = selectFinalizeBinding({
    storedJob: storedJobForBinding,
    comparability: comparability as unknown as Record<string, unknown>,
    holdout: effectiveHoldout as unknown as Record<string, unknown>,
  });
  const evaluation = await runtime.invoke("evaluation-core", {
    ...envelope("evaluation:finalize-comparison-group", {
      groupId: `comparison:${input.requestId}`,
      trialIds,
      comparability: finalizeBinding.comparability,
      // Run 99 R33 D7 live finding: the comparison has to bind the same membership the durable job
      // was created with (the effective holdout), otherwise the authority refuses the finalize with
      // "durable evaluation holdout membership mismatch" and the job stays in `scoring` forever.
      holdout: finalizeBinding.holdout,
      // Run 99 R26: the predeclared promotion protocol names the primary metric, so the
      // comparison outcome follows it instead of collapsing a two-scorer split into
      // `disagreement` (observed live: 38 of 60 groups).
      ...(input.learningPolicy?.promotionProtocol?.primaryMetricId
        ? { primaryMetricId: input.learningPolicy.promotionProtocol.primaryMetricId }
        : {}),
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
  // Run 97 RC06: a decisive comparison is evidence about the winning package, and both
  // directions are learnable (`guidance/07`: the worker compares winners and losers;
  // `guidance/13`: signed observational evidence, `keep` for a holding incumbent). The
  // target is derived from the durable member dispositions, never assumed.
  const learningTarget = selectTrackBLearningTarget({
    comparisonOutcome: durableComparison.outcome,
    members: Array.isArray(durableComparison.members)
      ? (durableComparison.members as Record<string, unknown>[])
      : [],
    sourceRoutePackage: input.routePackage,
    routePackages: completedRollouts.flatMap(({ rollout }) => {
      const endpointId = typeof rollout.endpointId === "string" ? rollout.endpointId : "";
      const routePackage = typeof rollout.routePackage === "string" ? rollout.routePackage : "";
      return endpointId && routePackage ? [{ endpointId, routePackage }] : [];
    }),
    // The compared alternatives, so a decisive counterfactual win stays attributable
    // when the durable member carries no candidate reference.
    counterfactualRoutePackages: completedRollouts
      .slice(1)
      .map(({ rollout }) => rollout.routePackage)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  });
  // The learned package is the winner's when the comparison is decisive; otherwise the
  // incumbent's package stays the attributed package for the bounded refusal receipts.
  const learningRoutePackage = learningTarget.routePackage ?? input.routePackage;
  const finalizedComparison = {
    groupId: durableComparison.groupId,
    comparisonId: durableComparison.groupId,
    status: durableComparison.status,
    outcome: durableComparison.outcome,
    holdout: durableComparison.holdout,
    // Run 99 R33 S34 live finding (stage v136): the learner must know *which* dimension decided the
    // comparison. Dropping the declared primary metric left it with the cross-dimension mean, which
    // ties at 0.5/0.5 on live traffic (the judge prefers the counterfactual, the deterministic
    // semantic scorer prefers the source), so every `knowledge:eval-consumer` degraded with
    // "group-relative semantic advantage could not be derived from the finalized comparison".
    // The primary metric, every scorer's verdict and the per-dimension member scores travel with
    // the comparison; `members` already carries the durable `dimensionScores`.
    ...(durableComparison.primaryMetric ? { primaryMetric: durableComparison.primaryMetric } : {}),
    ...(Array.isArray(durableComparison.scorerOutcomes)
      ? { scorerOutcomes: durableComparison.scorerOutcomes }
      : {}),
    members: durableComparison.members,
  };
  const evaluationAuthoritySecret = randomBytes(32).toString("hex");
  const finalizedComparisonReceiptPayload = {
    schemaVersion: "role-model.evaluation-comparison-readback-receipt.v1",
    kind: "evaluation_core_comparison_readback",
    channel: input.channel,
    routePackage: learningRoutePackage,
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
  // The knowledge boundary verifies a machine-issued redaction and safety receipt
  // before it can persist a shadow candidate. Issue it from the same durable
  // comparison readback the evaluation store returned, exactly as the packaged
  // shadow-pipeline harness does, so live comparisons and harness comparisons carry
  // one contract instead of the live path degrading on a missing receipt.
  const durableHoldout =
    durableComparison.holdout &&
    typeof durableComparison.holdout === "object" &&
    !Array.isArray(durableComparison.holdout)
      ? (durableComparison.holdout as Record<string, unknown>)
      : holdout;
  const knowledgeSafetyReceiptPayload = {
    schemaVersion: "role-model.knowledge-safety-receipt.v1",
    kind: "knowledge_safety",
    comparisonId: finalizedComparison.comparisonId,
    comparisonDigest: finalizedComparisonReceiptPayload.comparisonDigest,
    channel: input.channel,
    routePackage: learningRoutePackage,
    packageIdentity: learningRoutePackage,
    redactionEvidenceRef: evaluationReferences.sourceEvidenceRef,
    safetyReviewEvidenceRef:
      typeof durableHoldout?.holdoutId === "string" && durableHoldout.holdoutId
        ? durableHoldout.holdoutId
        : evaluationReferences.counterfactualEvidenceRef,
    redacted: true,
    safetyReviewed: true,
    safeForPrompt: false,
    holdoutPassed: learningTarget.decisive,
  };
  const knowledgeSafetyReceipt = {
    payload: knowledgeSafetyReceiptPayload,
    signature: createHmac("sha256", evaluationAuthoritySecret)
      .update(JSON.stringify(canonicalizeRun88Proof(knowledgeSafetyReceiptPayload)))
      .digest("hex"),
  };
  // Persist the documented v1.1 route-learning contracts for this execution. Emission
  // is contract-validated, and a failure is recorded without ever failing the replay.
  const contractEmissions: ReturnType<typeof emitTrackBContract>[] = [];
  const executionContextId = `execution:${input.requestId}`;
  const contractMembers = Array.isArray(durableComparison.members)
    ? (durableComparison.members as Record<string, unknown>[])
    : [];
  const contractRefsOfDisposition = (disposition: string): string[] =>
    contractMembers
      .filter((member) => member.disposition === disposition)
      .map((member) => String(member.trialId ?? ""))
      .filter(Boolean);
  if (input.contractStateRoot) {
    try {
      contractEmissions.push(
        emitTrackBContract({
          stateRoot: input.contractStateRoot,
          scopeId: input.scope,
          contract: buildRoutingEvaluationExecutionContext({
            executionId: executionContextId,
            purpose: "routing_replay",
            tasksetRef: "taskset:live-captures",
            harnessRef: "harness:recorded-capture",
            runtimeRef: `runtime:${input.channel}:${input.scope}`,
            routerPolicyVersion: comparability.policyId,
            splitSeed: 87,
            sourceProjectionIds: [input.sourceGraphRef],
            channel: input.channel,
            scopeId: input.scope,
            createdAtMs: Date.now(),
          }),
        }),
      );
      contractEmissions.push(
        emitTrackBContract({
          stateRoot: input.contractStateRoot,
          scopeId: input.scope,
          contract: buildRoutingRolloutGroupLifecycle({
            groupId: String(durableComparison.groupId ?? `comparison:${input.requestId}`),
            executionContextId,
            // A finalized rollout group must carry positive and negative rollout
            // references. A tie carries neither, so it is recorded as a partial
            // grouping rather than a fabricated decision.
            state:
              durableComparison.outcome === "candidate" || durableComparison.outcome === "source"
                ? "finalized"
                : durableComparison.outcome === "tie"
                  ? "partial"
                  : "failed",
            comparabilityKey: `${comparability.taskRef}|${comparability.inputRef}|${comparability.policyId}`,
            rolloutRefs: contractMembers
              .map((member) => String(member.trialId ?? ""))
              .filter(Boolean),
            scoreRefs: contractMembers
              .map((member) => String(member.scoreId ?? ""))
              .filter(Boolean),
            ...(contractRefsOfDisposition("positive").length
              ? { positiveRolloutRefs: contractRefsOfDisposition("positive") }
              : {}),
            ...(contractRefsOfDisposition("negative").length
              ? { negativeRolloutRefs: contractRefsOfDisposition("negative") }
              : {}),
            scorerSetVersion: `${scorer.id}@${scorer.version}`,
            policySnapshotRef: comparability.policyId,
            channel: input.channel,
            scopeId: input.scope,
            createdAtMs: Date.now(),
            updatedAtMs: Date.now(),
          }),
        }),
      );
      contractEmissions.push(
        emitTrackBContract({
          stateRoot: input.contractStateRoot,
          scopeId: input.scope,
          contract: buildRoutePackageActivationReceipt({
            receiptId: `activation:${input.requestId}`,
            packageId: input.routePackage,
            scope: { taskTypeId: "task:route-selection" },
            policyGateId: "gate:route-package-activation",
            priorPackageId: input.routePackage,
            state: "disabled",
            channel: input.channel,
            scopeId: input.scope,
            activatedAtMs: Date.now(),
          }),
        }),
      );
    } catch (error) {
      console.error(
        `[run97] contract emission degraded:${input.requestId} ${String(
          (error as { message?: unknown })?.message ?? error,
        ).slice(0, 200)}`,
      );
    }
  }
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
    safetyReceipt: knowledgeSafetyReceipt,
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
      // R6: the trajectory analyzer requires every reference it consumes to be
      // demonstrably resolved. The host has already resolved all three: the source
      // graph ref comes from the durable capture, the replay digest from the replay
      // plan it just read back, and the evaluation group from the finalized
      // comparison readback. A resolver function cannot cross the extension IPC
      // boundary, so the resolution is stated as data.
      resolvedReferences: {
        graph: [input.sourceGraphRef],
        replay: [replayDigest],
        evaluation: [String(persistedEvaluation.groupId ?? "")].filter(Boolean),
      },
    }),
  );
  const signalRecord =
    decodeExtensionBusinessResult({
      result: signals,
      extensionId: "trajectory-signals",
      ...(input.contractStateRoot ? { stateRoot: input.contractStateRoot } : {}),
      scopeId: input.scope,
    }) ?? (signals as Record<string, unknown>);
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
    // Run 97 RC10: this outcome is a non-learning one, so it must be observable. It was
    // silent, which made a live learner that produced no candidates indistinguishable
    // from a learner that never ran.
    console.error(
      `[run97] learning degraded signals:${input.requestId} ${String(
        signalRecord.reasonCode ?? signalRecord.code ?? "omit_signals",
      ).slice(0, 80)} ${String(signalRecord.reason ?? "").slice(0, 160)}`,
    );
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
  // The durable comparison is authoritative for which trial/score pairs the
  // boundary will validate; a re-scored in-memory set can carry different ids after
  // a restart. Signal lineage therefore cites the durable members.
  const durableTrialScoreRefs = (Array.isArray(durableComparison.members)
    ? (durableComparison.members as Record<string, unknown>[])
    : []
  ).map((member) => ({
    trialId: String(member.trialId ?? ""),
    scoreId: String(member.scoreId ?? ""),
    score: Number(member.score ?? 0),
    confidence: Number(member.confidence ?? 1),
  }));
  const linkedTrialScoreRefs = durableTrialScoreRefs.length
    ? durableTrialScoreRefs
    : completedRollouts.map(({ trialId, scoreId, score }) => ({
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
      trialScoreRefs: linkedTrialScoreRefs,
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
  const finalizedTrialScoreRefs = linkedTrialScoreRefs;
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
    // The knowledge boundary binds the finalized signal evidence to the replay
    // provenance it can verify: the shared prefix of the replay plan, not the plan
    // digest. A plan digest here made every live knowledge consumption fail the
    // "finalized trajectory signal references must match replay provenance" check.
    replayRef: replayForKnowledge.sharedPrefixRef,
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
  const profileRequest = () =>
    runtime.invoke("profile-learner", {
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
  const decodeProfileResult = (raw: unknown): Record<string, unknown> =>
    decodeExtensionBusinessResult({
      result: raw,
      extensionId: "profile-learner",
      ...(input.contractStateRoot ? { stateRoot: input.contractStateRoot } : {}),
      scopeId: input.scope,
    }) ??
    (raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {});
  let profileRecord = decodeProfileResult(await profileRequest());
  // A worker that restarts mid-invoke can answer once with a bounded degradation even
  // though the same request succeeds on a fresh attempt. Retry the estimate once
  // before the pipeline records a learning refusal.
  if (
    (typeof profileRecord.digest !== "string" || !profileRecord.digest || !profileRecord.effects) &&
    profileRecord.schemaVersion === "role-model.degradation-receipt.v1"
  ) {
    console.error(
      `[run97] profile estimate retry:${input.requestId} keys=${Object.keys(profileRecord).join(",")} reason=${String(
        (profileRecord as Record<string, unknown>).reason ?? "",
      ).slice(0, 160)}`,
    );
    profileRecord = decodeProfileResult(await profileRequest());
  }
  // A degraded profile estimate is a learning refusal with a receipt, not a replay
  // failure: the comparison is already durable and the replay already completed.
  const profileForKnowledge =
    typeof profileRecord.digest === "string" &&
    profileRecord.digest &&
    profileRecord.effects
      ? {
          digest: profileRecord.digest,
          effects: profileRecord.effects,
        }
      : null;
  // The durable comparison decides which trials were positive and negative. The
  // in-memory re-score stays a fallback only, because a comparison the evaluation
  // store finalized as `candidate` must not be refused by a drifted local score.
  const learningEvidence = selectTrackBLearningEvidence({
    members: Array.isArray(durableComparison.members)
      ? (durableComparison.members as Record<string, unknown>[])
      : [],
    rollouts: completedRollouts.map(({ rollout, score, trialId, scoreId }) => ({
      trialId,
      score,
      scoreId,
      evidenceRef: typeof rollout.evidenceRef === "string" ? rollout.evidenceRef : "",
    })),
  });
  const positive = learningEvidence.positive;
  const negative = learningEvidence.negative;
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
  // RC06 (L7): the knowledge boundary requires explicit graph *and* evaluation lineage
  // on every grouped learning evidence set
  // (`extensions/knowledge-worker`: "explicit graph/evaluation/trial/score lineage
  // required"). The winner's branch artifact is the graph authority for that trial, so
  // the winning row carries the branch graph reference while the losing row keeps the
  // evaluation reference; both keep their durable trial and score lineage.
  const branchGraphRefByTrialId = new Map<string, string>();
  for (const { rollout, trialId } of completedRollouts) {
    const artifactRef = typeof rollout.artifactRef === "string" ? rollout.artifactRef.trim() : "";
    if (trialId && artifactRef) branchGraphRefByTrialId.set(trialId, artifactRef);
  }
  // RC14: the knowledge boundary proves every reference through the durable artifact
  // store, so the rows must cite the per-case evidence artifacts the completer persisted
  // (`persistSupervisedReplayEvaluationCaseReferences`), not the rollout-fact references
  // that exist only inside the evaluation job JSON. Live evidence: the worker refused
  // with "authoritative trusted resolver-backed reference proof is required
  // (reference=artifact:2ff7abe0...)" and those ids were absent from the artifact store.
  const perCaseEvidenceRefByTrialId = new Map<string, string>();
  // The per-case references are built in rollout order (source first, then the evaluated
  // counterfactuals), so the join is by rollout index - a member-order join paired the
  // winner with the loser's case artifact.
  completedRollouts.forEach((entry, index) => {
    const reference = evaluationReferences.perCase[index];
    const evidenceRef =
      reference && typeof reference.evidenceRef === "string" ? reference.evidenceRef : "";
    if (entry.trialId && evidenceRef) {
      perCaseEvidenceRefByTrialId.set(entry.trialId, evidenceRef);
    }
  });
  const durableEvidenceRefForTrial = (trialId: string, fallback: string): string =>
    perCaseEvidenceRefByTrialId.get(trialId) ?? fallback;
  const knowledgeEvidenceRow = (row: (typeof positive)[number]) => {
    const graphRef = positive.some((entry) => entry.trialId === row.trialId)
      ? (branchGraphRefByTrialId.get(row.trialId) ?? "")
      : "";
    const evidenceRef = durableEvidenceRefForTrial(row.trialId, row.evidenceRef);
    return {
      evidenceRef,
      score: row.score,
      evidenceKind: graphRef ? "graph" : "evaluation",
      ...(graphRef ? { graphRef, rolloutRef: graphRef } : {}),
      learningCapable: true,
      evaluationRef: durableComparison.groupId,
      trialId: row.trialId,
      scoreId: row.scoreId,
      sourceGroupId: durableComparison.groupId,
      referenceProof: proofForEvidence(evidenceRef),
    };
  };
  let candidate: Record<string, unknown>;
  if (!profileForKnowledge) {
    console.error(
      `[run97] learning degraded profile:${input.requestId} keys=${Object.keys(profileRecord).join(",")} ${String(
        (profileRecord as Record<string, unknown>).reason ?? "profile estimate unavailable",
      ).slice(0, 160)}`,
    );
    candidate = boundedTrackBLearningRefusal(
      "profile:estimate-finalized-evaluation",
      "finalized profile estimate must retain attributable evidence",
    );
  } else if (learningTarget.decisive && !learningTarget.routePackage) {
    // A decisive counterfactual win whose package cannot be resolved is never
    // attributed to the incumbent package (which lost the comparison). The learning
    // step records a bounded refusal instead.
    console.error(
      `[run97] learning degraded target:${input.requestId} winner=${String(learningTarget.winnerRole)} outcome=${String(durableComparison.outcome)}`,
    );
    candidate = boundedTrackBLearningRefusal(
      "knowledge:eval-consumer",
      "winning route package cannot be attributed",
    );
  } else if (positive.length && negative.length) {
    try {
      // The knowledge consumer refuses any eval-consumer input without a derived
      // learning-capability claim, so the marker and its finalized lineage travel
      // with the evidence instead of being asserted by the caller.
      const learningCapability = deriveTrackBLearningCapability({
        comparison: durableComparison as {
          readonly groupId?: unknown;
          readonly status?: unknown;
          readonly outcome?: unknown;
        },
        members: Array.isArray(durableComparison.members)
          ? (durableComparison.members as Record<string, unknown>[])
          : [],
        positive,
        negative,
      });
      const knowledgeRaw = await runtime.invoke("knowledge-worker", {
          ...envelope("knowledge:eval-consumer", {
            replay: replayForKnowledge,
            evaluation: knowledgeEvaluation,
            signals: signalsForKnowledge,
            profile: profileForKnowledge,
            // Run 99 R33: the derived candidate records the family it was learned for, so the
            // promoted pack can carry it to the durable advisory.
            ...(typeof input.taskTypeId === "string" && input.taskTypeId.trim()
              ? { taskTypeId: input.taskTypeId.trim() }
              : {}),
            ...(typeof input.taxonomyVersion === "string" && input.taxonomyVersion.trim()
              ? { taxonomyVersion: input.taxonomyVersion.trim() }
              : {}),
            ...(learningCapability.learningCapable &&
            learningCapability.finalizedEvaluation &&
            learningCapability.learningEvidence
              ? {
                  learningCapable: true as const,
                  finalizedEvaluation: learningCapability.finalizedEvaluation,
                  learningEvidence: learningCapability.learningEvidence,
                }
              : {}),
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
              ...effectiveHoldout,
              evidenceRef: evaluationReferences.inputRef,
              passed: learningTarget.decisive,
            },
            scope: {
              routePackage: learningRoutePackage,
              channel: input.channel,
              scopeId: input.scope,
            },
          }),
          evaluationAuthoritySecret,
        });
      candidate =
        decodeExtensionBusinessResult({
          result: knowledgeRaw,
          extensionId: "knowledge-worker",
          ...(input.contractStateRoot ? { stateRoot: input.contractStateRoot } : {}),
          scopeId: input.scope,
        }) ?? (knowledgeRaw as Record<string, unknown>);
    } catch (error) {
      console.error(
        `[run97] learning degraded knowledge:${input.requestId} ${String(
          (error as { message?: unknown })?.message ?? error,
        ).slice(0, 200)}`,
      );
      candidate = boundedTrackBLearningRefusal("knowledge:eval-consumer", error);
    }
  } else {
    console.error(
      `[run97] learning gate closed:${input.requestId} positive=${positive.length} negative=${negative.length} members=${Array.isArray(durableComparison.members) ? durableComparison.members.length : 0}`,
    );
    candidate = {
      id: null,
      state: "insufficient_comparable_evidence",
      refusalCode: "R14_INSUFFICIENT_ROLLOUT_EVIDENCE",
    };
  }
  const candidateId =
    typeof (candidate as Record<string, unknown>).id === "string"
      ? ((candidate as Record<string, unknown>).id as string)
      : null;
  // RC11 (KW-F): `knowledge-store` is a hard dependency of `knowledge-worker`
  // (`guidance/24` / `extension-dependencies.json`) and TB10 requires the successful
  // Knowledge Store handoff. The worker persists the candidate in its own table; the
  // durable knowledge authority must receive it as a Store document, or knowledge never
  // outlives the worker. Failures degrade the handoff with a bounded receipt instead of
  // failing the replay.
  // The handoff only runs when the runtime actually advertises the Knowledge Store
  // extension: a composition without it must degrade the optional step silently rather
  // than invoke a capability that does not exist (`guidance/05`: missing optional
  // producers mark the work unavailable and continue).
  const runtimeWithExtensions = runtime as unknown as { listExtensions?: () => unknown };
  const runtimeExtensionIds =
    typeof runtimeWithExtensions.listExtensions === "function"
      ? (runtimeWithExtensions.listExtensions() as unknown[])
      : null;
  const knowledgeStoreAvailable =
    runtimeExtensionIds === null
      ? false
      : runtimeExtensionIds.some(
          (row) => row && typeof row === "object" && (row as { id?: unknown }).id === "knowledge-store",
        );
  if (candidateId && knowledgeStoreAvailable) {
    const learned = (candidate as Record<string, unknown>).learnedExperienceCandidate;
    const learnedRecord =
      learned && typeof learned === "object" && !Array.isArray(learned)
        ? (learned as Record<string, unknown>)
        : null;
    const experienceTextRef =
      typeof learnedRecord?.experienceTextRef === "string" && learnedRecord.experienceTextRef
        ? learnedRecord.experienceTextRef
        : `contract:${candidateId}`;
    try {
      const written = (await runtime.invoke("knowledge-store", {
        ...envelope("knowledge:write", {}),
        // The knowledge-store extension reads `envelope.payload`, so the document travels
        // at the envelope's top level (the post-observation path does the same).
        payload: {
          value: {
            type: "learned_experience_candidate",
            version: 1,
            scope: input.scope,
            artifactRef: experienceTextRef,
            provenance: `evaluation-comparison:${String(
              durableComparison.groupId ?? `comparison:${input.requestId}`,
            )}`,
            taskType: "task:route-selection",
            sensitivity: "reviewed_shadow_candidate",
          },
        },
      })) as Record<string, unknown> | null;
      const knowledgeDocumentId =
        written && typeof written.id === "string" && written.id ? written.id : null;
      if (!knowledgeDocumentId) {
        throw new Error("knowledge store did not return a durable document id");
      }
      const readBack = (await runtime.invoke("knowledge-store", {
        ...envelope("knowledge:read", {}),
        payload: { id: knowledgeDocumentId, scope: input.scope },
      })) as Record<string, unknown> | null;
      (candidate as Record<string, unknown>).knowledgeStoreHandoff = {
        schemaVersion: "role-model.knowledge-store-handoff.v1",
        id: knowledgeDocumentId,
        state: typeof readBack?.state === "string" ? readBack.state : null,
        experienceTextRef,
      };
    } catch (error) {
      console.error(
        `[run97] learning degraded knowledge-store:${input.requestId} ${String(
          (error as { message?: unknown })?.message ?? error,
        ).slice(0, 200)}`,
      );
      (candidate as Record<string, unknown>).knowledgeStoreHandoff = {
        schemaVersion: "role-model.knowledge-store-handoff.v1",
        degraded: true,
        reason: String((error as { message?: unknown })?.message ?? error).slice(0, 200),
      };
    }
  }
  if (candidateId && input.contractStateRoot) {
    try {
      contractEmissions.push(
        emitTrackBContract({
          stateRoot: input.contractStateRoot,
          scopeId: input.scope,
          contract: buildLearnedExperienceCandidate({
            experienceId: candidateId,
            scope: {
              taskTypeId: "task:route-selection",
              ...(input.identity?.modelId ? { modelFamily: input.identity.modelId } : {}),
            },
            experienceTextRef: `contract:${candidateId}`,
            sourceGroupIds: [String(durableComparison.groupId ?? `comparison:${input.requestId}`)],
            positiveRolloutRefs: contractRefsOfDisposition("positive"),
            negativeRolloutRefs: contractRefsOfDisposition("negative"),
            status: "shadow_validating",
            redactionStatus: "redacted",
            instructionHierarchyChecked: true,
            promptInjectionReviewed: true,
            channel: input.channel,
            scopeId: input.scope,
            createdAtMs: Date.now(),
          }),
        }),
      );
    } catch (error) {
      console.error(
        `[run97] experience contract degraded:${input.requestId} ${String(
          (error as { message?: unknown })?.message ?? error,
        ).slice(0, 200)}`,
      );
    }
  }
  const profileConfidence = profileRecord.confidence;
  // Run 98 R3: the learning pass. A derived candidate is only text until validation turns it
  // into a receipt and promotion turns that receipt into a pack. The pass runs here, on the
  // durable finalized comparison the candidate was derived from, and never performs a provider
  // call, a route mutation or a prompt injection.
  let learningPass: Record<string, unknown> | null = null;
  if (candidateId) {
    const candidateScorerIdentity =
      candidate && typeof candidate === "object" && !Array.isArray(candidate)
        ? ((candidate as Record<string, unknown>).scorerIdentity as
            | { scorerSetVersion?: unknown; judgeEndpointId?: unknown }
            | null
            | undefined)
        : undefined;
    const scorerSetVersion =
      typeof candidateScorerIdentity?.scorerSetVersion === "string"
        ? candidateScorerIdentity.scorerSetVersion
        : null;
    if (scorerSetVersion) {
      try {
        learningPass = await runTrackBLearningPass(runtime, {
          requestId: input.requestId,
          channel: input.channel,
          scope: input.scope,
          authorizationEpoch: input.authorizationEpoch,
          ...(typeof input.taskTypeId === "string" && input.taskTypeId.trim()
            ? { taskTypeId: input.taskTypeId.trim() }
            : {}),
          ...(typeof input.taxonomyVersion === "string" && input.taxonomyVersion.trim()
            ? { taxonomyVersion: input.taxonomyVersion.trim() }
            : {}),
          candidateId,
          routePackage: learningRoutePackage,
          finalizedComparison,
          finalizedComparisonReceipt,
          safetyReceipt: knowledgeSafetyReceipt,
          evaluationAuthoritySecret,
          provenance: {
            policy: "routing-shadow",
            task: String(
              (durableComparison.comparability as Record<string, unknown> | undefined)?.taskRef ??
                evaluationReferences.sourceEvidenceRef,
            ),
            scorer: scorerSetVersion,
            split: "holdout",
            seed: 87,
            evidenceRef: evaluationReferences.sourceEvidenceRef,
          },
          identity: {
            scorerSetVersion,
            judgeEndpointId:
              typeof candidateScorerIdentity?.judgeEndpointId === "string"
                ? candidateScorerIdentity.judgeEndpointId
                : null,
          },
          ...(input.learningPolicy
            ? {
                evidenceFloor: input.learningPolicy.evidenceFloor,
                guardrails: input.learningPolicy.guardrails,
                ...(input.learningPolicy.promotionProtocol
                  ? { promotionProtocol: input.learningPolicy.promotionProtocol }
                  : {}),
                ...(input.learningPolicy.evidenceMaxAgeMs
                  ? { evidenceMaxAgeMs: input.learningPolicy.evidenceMaxAgeMs }
                  : {}),
              }
            : {}),
          envelope: (capability, value) => envelope(capability, value),
          // The packaged host externalizes oversized business results, so the pass decodes the
          // comparison-group list exactly like the pipeline decodes its own extension answers.
          decodeResult: (extensionId, _capability, raw) =>
            decodeExtensionBusinessResult({
              result: raw,
              extensionId,
              ...(input.contractStateRoot ? { stateRoot: input.contractStateRoot } : {}),
              scopeId: input.scope,
            }) ?? raw,
        });
      } catch (error) {
        learningPass = {
          schemaVersion: "role-model.route-learning-pass-degradation.v1",
          degraded: true,
          candidateId,
          reason: String((error as { message?: unknown })?.message ?? error).slice(0, 256),
        };
        console.error(
          `[run98] learning pass declined:${input.requestId} ${String(
            (error as { message?: unknown })?.message ?? error,
          ).slice(0, 200)}`,
        );
      }
    } else {
      // R10: validation refuses a candidate without a bound scoring identity, so the pass
      // reports that instead of sending an unverifiable request.
      learningPass = {
        schemaVersion: "role-model.route-learning-pass-degradation.v1",
        degraded: true,
        candidateId,
        reason: "candidate carries no scoring identity; re-derive it under the current judge",
      };
    }
  }
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
      profileSnapshotIds: Array.isArray(profileRecord.snapshotIds)
        ? (profileRecord.snapshotIds as unknown[]).filter(
            (snapshotId): snapshotId is string => typeof snapshotId === "string",
          )
        : [],
      candidateId,
      advisoryState: "fresh",
      confidence: advisoryConfidence,
    },
  });
  const advisoryProfileSnapshotIds = Array.isArray(profileRecord.snapshotIds)
    ? (profileRecord.snapshotIds as unknown[]).filter(
        (snapshotId): snapshotId is string => typeof snapshotId === "string",
      )
    : [];
  const advisoryValidator = (
    authorization: TrackBRouteAdvisoryAuthorization,
    expected: TrackBRouteAdvisoryClaims,
    nowMs: number,
  ) =>
    verifyTrackBRouteAdvisoryAuthorization(authorization, evaluationAuthoritySecret, {
      expected,
      nowMs,
    });
  // Run 98 R4 (AC-R04-04): a stale or expired advisory is recorded as stale and never
  // blocks the decision; the deterministic baseline stays selected either way.
  let advisory: ReturnType<typeof resolveTrackBRouteAdvisory>;
  let advisoryStaleReason: string | null = null;
  try {
    advisory = resolveTrackBRouteAdvisory({
      baselineDecisionId: input.sourceDecisionId,
      channel: input.channel,
      scope: input.scope,
      authorizationEpoch: input.authorizationEpoch,
      routePackage: input.routePackage,
      profileSnapshotIds: advisoryProfileSnapshotIds,
      candidateId,
      confidence: advisoryConfidence,
      nowMs: advisoryNowMs,
      authorization: advisoryAuthorization,
      authorizationValidator: advisoryValidator,
    });
  } catch (error) {
    advisoryStaleReason = String(
      (error as { message?: unknown })?.message ?? error,
    ).slice(0, 256);
    const staleNowMs = Date.now();
    advisory = resolveTrackBRouteAdvisory({
      baselineDecisionId: input.sourceDecisionId,
      channel: input.channel,
      scope: input.scope,
      authorizationEpoch: input.authorizationEpoch,
      routePackage: input.routePackage,
      profileSnapshotIds: advisoryProfileSnapshotIds,
      candidateId: null,
      advisoryState: "stale",
      confidence: 0,
      nowMs: staleNowMs,
      authorization: createTrackBRouteAdvisoryAuthorization({
        authoritySecret: evaluationAuthoritySecret,
        keyId: `runtime:${input.requestId}`,
        issuedAtMs: staleNowMs,
        expiresAtMs: staleNowMs + 60_000,
        claims: {
          baselineDecisionId: input.sourceDecisionId,
          channel: input.channel,
          scope: input.scope,
          authorizationEpoch: input.authorizationEpoch,
          routePackage: input.routePackage,
          profileSnapshotIds: advisoryProfileSnapshotIds,
          candidateId: null,
          advisoryState: "stale",
          confidence: 0,
        },
      }),
      authorizationValidator: advisoryValidator,
    });
  }
  // AC-R04-01/02: observe what the advisory would have preferred for the decision that
  // was already taken; the selection itself is never changed in S1.
  const eligibleRoutePackages = [
    input.routePackage,
    ...(Array.isArray(input.comparableEvidence?.candidateSet)
      ? (input.comparableEvidence.candidateSet as Record<string, unknown>[]).flatMap((entry) =>
          typeof entry?.id === "string" && entry.id ? [entry.id] : [],
        )
      : []),
    ...(Array.isArray(input.comparableEvidence?.counterfactuals)
      ? (input.comparableEvidence.counterfactuals as Record<string, unknown>[]).flatMap((entry) =>
          typeof entry?.id === "string" && entry.id ? [entry.id] : [],
        )
      : []),
  ];
  const advisoryObservation = buildTrackBRouteAdvisoryObservation({
    decisionId: input.sourceDecisionId,
    routePackage: input.routePackage,
    preferredRoutePackage:
      typeof (candidate as Record<string, unknown>).routePackageAttribution === "object" &&
      (candidate as Record<string, unknown>).routePackageAttribution !== null
        ? String(
            ((candidate as Record<string, unknown>).routePackageAttribution as Record<
              string,
              unknown
            >).routePackage ?? "",
          ) || null
        : null,
    eligibleRoutePackages,
    advisoryState: advisory.advisoryState,
    confidence: advisory.confidence,
    profileSnapshotIds: advisory.profileSnapshotIds,
    candidateId: advisory.candidateId,
    advisoryId: advisory.advisoryId,
    reason: advisoryStaleReason,
    observedAtMs: Date.now(),
    // Run 99 close-out (addendas 19-21 S33/D1/D6): the shadow path records the request's family and
    // the classification it was routed against, not just the advisory's own state. The observed arm
    // is the policy's own deterministic choice for these inputs, so its propensity is 1.
    ...(typeof input.taskTypeId === "string" && input.taskTypeId.trim()
      ? { requestTaskTypeId: input.taskTypeId.trim() }
      : {}),
    ...(input.classification ? { classification: input.classification } : {}),
    selectionMode: "policy_deterministic" as const,
    selectionProbability: 1,
  });
  // Run 98 R4: the next live decision for this scope observes this advisory.
  rememberTrackBRouteAdvisory({
    channel: input.channel,
    scope: input.scope,
    routePackage: input.routePackage,
    preferredRoutePackage: advisoryObservation.preferredRoutePackage,
    advisoryState: advisory.advisoryState,
    confidence: advisory.confidence,
    profileSnapshotIds: advisory.profileSnapshotIds,
    candidateId: advisory.candidateId,
    advisoryId: advisory.advisoryId,
    nowMs: advisoryObservation.observedAtMs,
  });
  return {
    replay,
    evaluation: persistedEvaluation,
    signals,
    profile: profileRecord,
    candidate,
    advisory,
    advisoryObservation,
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
      advisoryObservation,
      ...(learningPass ? { learningPass } : {}),
      contractRefs: contractEmissions.map((emission) => ({
        contract: emission.contract,
        contractId: emission.contractId,
        ref: emission.ref,
        digest: emission.digest,
      })),
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
  // Run 98 R4 (AC-R04-01/03): every live decision carries an advisory observation, using
  // the newest advisory produced for the scope (or an explicit `unavailable`), and the
  // observation never changes the decision that already happened.
  const advisoryObservation = observeTrackBRouteAdvisoryForDecision({
    channel: input.channel,
    scope: input.scope,
    routePackage: input.routePackage,
    decisionId: input.sourceDecisionId,
    eligibleRoutePackages: input.replayIntent?.candidateEndpointIds,
    nowMs: Date.now(),
  });
  return {
    replay,
    evaluation,
    signals,
    profile,
    advisoryObservation,
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
      advisoryObservation,
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
  // The replay intent is owned by the automatic producer, not by the supervised
  // scheduler queue: the producer discovers the capture through its pending
  // projection, reserves daily budget, and dispatches without any manual call. A
  // duplicate scheduler intent here would share one queue with the job-scoped
  // intents the supervised replay path claims and corrupt that bookkeeping.
  const replayIntentJobId = `replay-intent:${input.requestId}`;
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
      accepted: true,
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
    /**
     * Run 98 R4: durable advisory-observation ledger path. When present the post-observation
     * appends the decision's advisory observation so the readback can report the state
     * distribution and the counterfactual influence rate from durable state.
     */
    readonly advisoryObservationLedgerPath?: string;
    /** Run 99 close-out (addendum 21 §4 S33): the judge order policy in force for this scope. */
    readonly judgeOrderPolicy?: "source_first" | "dual_order" | null;
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
          // Run 99 R33: the capture carries the request's task family (addendum 19 S33), so the
          // comparison, the learned candidate and the promoted pack are all family-scoped.
          ...(typeof observation.taskTypeId === "string" && observation.taskTypeId.trim()
            ? { taskTypeId: observation.taskTypeId.trim() }
            : {}),
          ...(typeof observation.taxonomyVersion === "string" && observation.taxonomyVersion.trim()
            ? { taxonomyVersion: observation.taxonomyVersion.trim() }
            : {}),
          // Run 99 close-out (addendas 19-21 S33): the capture now records the whole classification,
          // so the shadow observation can carry it instead of only the family string. The builder
          // bounds it again on the way in.
          ...(observation.classification && typeof observation.classification === "object"
            ? {
                classification:
                  observation.classification as TrackBRouteAdvisoryClassification,
              }
            : {}),
          ...(input.judgeOrderPolicy ? { judgeOrderPolicy: input.judgeOrderPolicy } : {}),
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
  // Run 98 R4 (AC-R04-01/03): persist the advisory observation for this decision so the
  // operator readback can report the advisory-state distribution and the influence rate
  // from durable state instead of logs.
  if (input.advisoryObservationLedgerPath && "advisoryObservation" in pipeline) {
    const observation = (pipeline as { readonly advisoryObservation?: unknown })
      .advisoryObservation;
    if (observation && typeof observation === "object") {
      try {
        await appendTrackBRouteAdvisoryObservation({
          filePath: input.advisoryObservationLedgerPath,
          observation: observation as Readonly<Record<string, unknown>>,
        });
      } catch (error) {
        console.error(
          `[run98] advisory observation ledger degraded:${requestId} ${String(
            (error as { message?: unknown })?.message ?? error,
          ).slice(0, 200)}`,
        );
      }
    }
  }
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
  /**
   * Run 98 addendum 04 §7 (`L2`), measured on real dsh traffic: the observation was rejected
   * whenever the *contribution upload* failed at the transport layer. `runTrackBPostObservation`
   * above has already completed and its effects (the advisory ledger entry, the replay handoff) are
   * durable, so retrying the whole observation because telemetry failed produced an outbox that never
   * drained — and the capture then looked like a failed replay. The pipeline result is therefore kept
   * and the contribution failure is reported alongside it.
   */
  let contribution: unknown = null;
  let contributionFailure: { readonly code: string; readonly message: string } | null = null;
  try {
    contribution = await recordContribution({
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
  } catch (error) {
    const cause = (error as { cause?: { code?: unknown } })?.cause;
    contributionFailure = {
      code:
        typeof cause?.code === "string" && cause.code
          ? cause.code
          : String((error as { name?: unknown })?.name ?? "contribution_failed").slice(0, 64),
      message: String((error as { message?: unknown })?.message ?? error).slice(0, 200),
    };
    console.error(
      `[run98] contribution upload degraded:${requestId} ${contributionFailure.code} ${contributionFailure.message}`,
    );
  }
  // The aggregate service is the durable authority for upload state, while this
  // request correlation is generated by the runtime that observed the routed
  // request. Keep the correlation alongside the opaque service result so a
  // read-only verifier can make an exact request-to-cloud join without learning
  // any credential, payload, or private graph identity.
  const contributionReceipt =
    contribution && typeof contribution === "object" && !Array.isArray(contribution)
      ? { ...contribution, correlationId }
      : contribution;
  return {
    ...result,
    contribution: contributionReceipt,
    contributionCorrelationId: correlationId,
    ...(contributionFailure ? { contributionFailure } : {}),
  };
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
  /**
   * R14: the packaged extension host must know the runtime channel so envelopes
   * built without an explicit channel are stamped with the served channel instead
   * of defaulting to development (which breaks scope bindings and reference
   * attestation on stage and production runtimes).
   */
  readonly channel?: string;
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
    // Run 98 addendum 04: without this spread the host ran on the extension host's 1 s default and
    // every slower evaluation was reported as `extension evaluation-core failed: timeout`.
    ...extensionHostTiming(),
    ...(options.startupTimeoutMs !== undefined
      ? { startupTimeoutMs: options.startupTimeoutMs }
      : {}),
    ...(options.channel ? { channel: options.channel } : {}),
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
    ...(options.channel ? { channel: options.channel } : {}),
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
  /**
   * Run 98 R7/R17: the staged Track B runtime manifest. The owned sidecar composes its
   * supervised evaluation and rollout domains from this manifest; without it those operator
   * controls answer `operator_capability_unavailable` (observed live: the Learning activation
   * drill could not activate or roll back a promoted pack).
   */
  manifestPath?: string;
  migrationScope?: string;
  /**
   * Run 98 R17: the runtime scope identity the host sends as
   * `x-role-model-scope` on operator requests. The sidecar adopts it as its own
   * operator context so the host and the sidecar agree without either side
   * guessing an installation-derived scope.
   */
  runtimeScope?: string;
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
          ...(options.manifestPath
            ? ["--track-b-runtime-manifest", options.manifestPath]
            : []),
          ...(options.migrationScope ? ["--migration-scope", options.migrationScope] : []),
          ...(options.runtimeScope ? ["--runtime-scope", options.runtimeScope] : []),
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
