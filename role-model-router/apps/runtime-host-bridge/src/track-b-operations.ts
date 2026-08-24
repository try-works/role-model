import { createHash, createHmac, createPublicKey, timingSafeEqual, verify } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  type KwSessionWorker,
  clearKwPromptInjectSessionsForTests,
  registerKwPromptInjectSession,
  syncPrivateKnowledgeActivation,
} from "./kw-prompt-inject.js";

let kwJoinWorkerFactory: ((sessionId: string) => Promise<KwSessionWorker | undefined>) | undefined;

export function setKwJoinWorkerFactory(
  factory: ((sessionId: string) => Promise<KwSessionWorker | undefined>) | undefined,
): void {
  kwJoinWorkerFactory = factory;
  if (!factory) clearKwPromptInjectSessionsForTests();
}

/** @deprecated Prefer setKwJoinWorkerFactory for production and tests. */
export function setKwJoinWorkerFactoryForTests(
  factory: ((sessionId: string) => Promise<KwSessionWorker | undefined>) | undefined,
): void {
  setKwJoinWorkerFactory(factory);
}

type LifecycleRecord = {
  readonly id: string;
  readonly lifecycle: "ready" | "degraded" | "stopped";
  readonly enabled: boolean;
  readonly enabledMode?: ExtensionMode;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  readonly productionActivation?: boolean;
  readonly health: {
    readonly available: boolean;
    readonly routingDependency: boolean;
    readonly reason?: string;
    readonly productionActivation?: boolean;
    readonly knowledgeWorkerBootstrap?: KnowledgeWorkerBootstrap;
  };
};
type KnowledgeValidationReceipt = {
  readonly payload: {
    readonly kind: "knowledge_validation";
    readonly reviewed: true;
    readonly safetyReviewed: true;
    readonly redacted: true;
    readonly holdoutPassed: true;
    readonly [key: string]: unknown;
  };
  readonly signature: string;
  readonly [key: string]: unknown;
};
type KnowledgeWorkerBootstrap = {
  readonly receipt: KnowledgeValidationReceipt;
  readonly groupDigest: string;
};
type ExtensionMode = "disabled" | "shadow" | "advisory" | "bounded" | "active";
type ExtensionMutationReceipt = {
  readonly id: string;
  readonly at: string;
  readonly who: string;
  readonly extensionId: string;
  readonly action:
    | "enable"
    | "disable"
    | "set_mode"
    | "bootstrap_shadow_ready"
    | "activate_production"
    | "deactivate_production";
  readonly mode: ExtensionMode;
  readonly result: "applied";
};
const EXTENSION_MODES = new Set<ExtensionMode>([
  "disabled",
  "shadow",
  "advisory",
  "bounded",
  "active",
]);
const asExtensionMode = (value: unknown, fallback: ExtensionMode = "active"): ExtensionMode =>
  typeof value === "string" && EXTENSION_MODES.has(value as ExtensionMode)
    ? (value as ExtensionMode)
    : fallback;
const asKnowledgeValidationReceipt = (value: unknown): KnowledgeValidationReceipt => {
  const receipt =
    value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
  const payload =
    receipt?.payload && typeof receipt.payload === "object"
      ? (receipt.payload as Record<string, unknown>)
      : undefined;
  if (
    payload?.kind !== "knowledge_validation" ||
    payload.reviewed !== true ||
    payload.safetyReviewed !== true ||
    payload.redacted !== true ||
    payload.holdoutPassed !== true ||
    typeof receipt?.signature !== "string" ||
    !/^[a-f0-9]{64}$/.test(receipt.signature)
  ) {
    throw new Error("knowledge-worker production activation refused: invalid ceremony receipt");
  }
  // Full HMAC verification remains private Knowledge Worker authority. The public
  // host enforces the v1 structural ceremony before exposing its durable UI/API axis.
  return receipt as KnowledgeValidationReceipt;
};
type StorageRecord = {
  readonly id: string;
  readonly category: string;
  readonly tier: string;
  readonly scope: string;
  readonly bytes: number;
  readonly count: number;
  readonly holds?: number;
  readonly leases?: number;
  readonly conflicts?: readonly string[];
};

function normalizeStorageRetentionContract(value: unknown): Record<string, unknown> {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const logicalClasses = Array.isArray(raw.logicalClasses)
    ? raw.logicalClasses
    : Array.isArray(raw.categories)
      ? raw.categories
      : [];
  const inventory =
    raw.storageInventory && typeof raw.storageInventory === "object"
      ? (raw.storageInventory as Record<string, unknown>)
      : undefined;
  const physicalResources = Array.isArray(raw.physicalResources)
    ? raw.physicalResources
    : Array.isArray(inventory?.entries)
      ? inventory.entries
      : [];
  return {
    ...raw,
    logicalClasses,
    categories: logicalClasses,
    physicalResources,
    ...(inventory
      ? {
          storageInventory: {
            ...inventory,
            complete: inventory.complete === true,
            entries: physicalResources,
          },
        }
      : {}),
  };
}
type RetentionPlan = {
  readonly schemaVersion: "role-model.retention-dry-run.v1";
  readonly channel: string;
  readonly affectedCount: number;
  readonly estimatedBytes: number;
  readonly conflicts: readonly { readonly id: string; readonly reason: string }[];
  readonly lostCapabilities: readonly string[];
  readonly retainedCapabilities: readonly string[];
  readonly blocks: readonly string[];
  readonly manifestHash: string;
  readonly rollbackAvailable: boolean;
  readonly sourceRevision: number;
};
type BridgeState = {
  readonly schemaVersion: "role-model.track-b-production-bridge.v1";
  readonly protocolVersion: "1.0";
  readonly revision: number;
  readonly generatedAt: string;
  readonly extensions: readonly LifecycleRecord[];
  readonly storageServices: readonly StorageRecord[];
  readonly retention: {
    readonly managedPolicy: boolean;
    readonly policies?: readonly RetentionPolicy[];
    readonly receipts: readonly unknown[];
    readonly activeJob: RetentionJob | null;
    readonly currentPlan?: RetentionPlan | null;
  };
  readonly contribution?: ContributionState;
  readonly recommendations?: readonly RecommendationRecord[];
  readonly recommendationRevision?: number;
  readonly extensionMutationReceipts?: readonly ExtensionMutationReceipt[];
  readonly activePack?: {
    readonly id: string;
    readonly version: string;
    readonly appliedAt: string;
    readonly endpointId?: string;
    readonly modelId?: string;
    readonly reasoningEffort?: string | null;
    readonly effortSource?: RecommendationEffortSource;
  } | null;
};
type RetentionPolicy = {
  readonly policyId: string;
  readonly scope: string;
  readonly maxBytes: number;
  readonly maxAgeDays: number;
};
type RetentionJob = {
  readonly id: string;
  readonly status: "running" | "cancelled" | "completed";
  readonly progress: number;
  readonly manifestHash: string;
  readonly scope: string;
};
type ContributionState = {
  readonly mode: "disabled" | "consumer" | "contributor";
  readonly contributionTier: "none" | "basic" | "standard" | "advanced";
  readonly recommendationTier: "none" | "basic" | "standard" | "advanced";
  readonly recommendationAccess: "disabled" | "download_only" | "preview_and_apply";
  readonly allowCloudUpload: boolean;
  readonly authorizationState:
    | "none"
    | "pending_disclosure"
    | "active"
    | "revoked"
    | "managed_blocked";
  readonly revocationEpoch: number;
  readonly queuedCount: number;
  readonly managed: boolean;
  readonly disclosureId?: string | null;
};
type RecommendationRecord = {
  readonly id: string;
  readonly version: string;
  readonly status: "downloaded" | "validated" | "applied" | "rejected" | "dismissed";
  readonly signatureValid: boolean;
  readonly policyAllowed: boolean;
  readonly provenance: string;
  readonly endpointId?: string;
  readonly modelId?: string;
  readonly reasoningEffort?: string | null;
  readonly effortSource?: RecommendationEffortSource;
  readonly preferredFor?: readonly string[];
  readonly action?: string;
  readonly confidence?: number;
};
type RecommendationEffortSource = "none" | "client" | "variant" | "variant_coerced";
type RecommendationIdentityFields = Pick<
  RecommendationRecord,
  "endpointId" | "modelId" | "reasoningEffort" | "effortSource"
>;
const RECOMMENDATION_EFFORT_SOURCES = new Set<RecommendationEffortSource>([
  "none",
  "client",
  "variant",
  "variant_coerced",
]);
const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);
const readRecommendationIdentity = (
  value: Record<string, unknown>,
  context: string,
): RecommendationIdentityFields => {
  const endpointPresent = hasOwn(value, "endpointId");
  const modelPresent = hasOwn(value, "modelId");
  const effortPresent = hasOwn(value, "reasoningEffort");
  const sourcePresent = hasOwn(value, "effortSource");
  const endpointId = endpointPresent ? value.endpointId : undefined;
  const modelId = modelPresent ? value.modelId : undefined;
  if (
    (endpointPresent && (typeof endpointId !== "string" || !endpointId.trim())) ||
    (modelPresent && (typeof modelId !== "string" || !modelId.trim()))
  )
    throw new Error(`recommendation endpoint/model identity invalid at ${context}`);
  if (effortPresent !== sourcePresent)
    throw new Error(`recommendation effort identity incomplete at ${context}`);
  if (!effortPresent) {
    return {
      ...(endpointPresent ? { endpointId: endpointId as string } : {}),
      ...(modelPresent ? { modelId: modelId as string } : {}),
    };
  }
  const reasoningEffort = value.reasoningEffort;
  const effortSource = value.effortSource;
  if (
    reasoningEffort !== null &&
    (typeof reasoningEffort !== "string" || !reasoningEffort.trim() || reasoningEffort.length > 128)
  )
    throw new Error(`recommendation reasoning effort invalid at ${context}`);
  if (
    typeof effortSource !== "string" ||
    !RECOMMENDATION_EFFORT_SOURCES.has(effortSource as RecommendationEffortSource)
  )
    throw new Error(`recommendation effort source invalid at ${context}`);
  if (
    (effortSource === "none" && reasoningEffort !== null) ||
    (effortSource !== "none" && typeof reasoningEffort !== "string")
  )
    throw new Error(`recommendation effort identity inconsistent at ${context}`);
  if (!endpointId || !modelId)
    throw new Error(`recommendation endpoint/model identity incomplete at ${context}`);
  return {
    endpointId: endpointId as string,
    modelId: modelId as string,
    reasoningEffort: reasoningEffort as string | null,
    effortSource: effortSource as RecommendationEffortSource,
  };
};
type ArtifactBundleImport = {
  readonly manifest: Record<string, unknown>;
  readonly manifestText: string;
  readonly expectedManifestSha256?: string;
  readonly recordsByPath: Readonly<Record<string, string>>;
  readonly signature: Record<string, unknown>;
};
const EMPTY_CONTRIBUTION: ContributionState = {
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
};
const EMPTY_STATE: BridgeState = {
  schemaVersion: "role-model.track-b-production-bridge.v1",
  protocolVersion: "1.0",
  revision: 0,
  generatedAt: "1970-01-01T00:00:00.000Z",
  extensions: [],
  storageServices: [],
  retention: {
    managedPolicy: false,
    policies: [],
    receipts: [],
    activeJob: null,
    currentPlan: null,
  },
  contribution: EMPTY_CONTRIBUTION,
  recommendations: [],
  recommendationRevision: 0,
  extensionMutationReceipts: [],
  activePack: null,
};
const validate = (value: BridgeState): BridgeState => {
  if (
    value?.schemaVersion !== EMPTY_STATE.schemaVersion ||
    value.protocolVersion !== "1.0" ||
    !Number.isInteger(value.revision) ||
    value.revision < 0 ||
    !Array.isArray(value.extensions) ||
    !Array.isArray(value.storageServices) ||
    !value.retention
  )
    throw new Error("invalid Track B production bridge state");
  const ids = new Set<string>();
  for (const row of value.extensions) {
    if (
      !row.id ||
      ids.has(row.id) ||
      !["ready", "degraded", "stopped"].includes(row.lifecycle) ||
      row.health?.available !== (row.lifecycle === "ready")
    )
      throw new Error("invalid or duplicate extension lifecycle record");
    ids.add(row.id);
  }
  for (const row of value.storageServices)
    if (
      !row.id ||
      !row.category ||
      !Number.isFinite(row.bytes) ||
      row.bytes < 0 ||
      !Number.isInteger(row.count) ||
      row.count < 0
    )
      throw new Error("invalid storage service record");
  const plan = value.retention.currentPlan;
  if (
    plan &&
    (plan.schemaVersion !== "role-model.retention-dry-run.v1" ||
      !Number.isInteger(plan.affectedCount) ||
      plan.affectedCount < 0 ||
      !Number.isFinite(plan.estimatedBytes) ||
      plan.estimatedBytes < 0 ||
      !Array.isArray(plan.conflicts) ||
      !Array.isArray(plan.blocks) ||
      !/^[a-f0-9]{64}$/.test(plan.manifestHash) ||
      typeof plan.rollbackAvailable !== "boolean" ||
      !Number.isInteger(plan.sourceRevision))
  )
    throw new Error("invalid retention plan");
  return {
    ...value,
    retention: { ...value.retention, policies: value.retention.policies ?? [] },
    contribution: value.contribution ?? EMPTY_CONTRIBUTION,
    recommendations: value.recommendations ?? [],
    recommendationRevision: value.recommendationRevision ?? 0,
    activePack: value.activePack ?? null,
  };
};
const readState = async (statePath: string): Promise<BridgeState> => {
  try {
    return validate(JSON.parse(await readFile(statePath, "utf8")) as BridgeState);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return EMPTY_STATE;
    throw error;
  }
};
const writeState = async (statePath: string, state: BridgeState) => {
  await mkdir(path.dirname(statePath), { recursive: true });
  const temporary = `${statePath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temporary, statePath);
};

/** Seed local Track B bridge state so Extension boundary reflects registered packages. */
export async function seedTrackBExtensionBridgeState(options: {
  readonly statePath: string;
  readonly catalog: readonly Record<string, unknown>[];
  readonly channel?: string;
  readonly scope?: string;
  readonly authorizationEpoch?: number;
}): Promise<BridgeState> {
  const channel = options.channel ?? "production";
  const scope = options.scope ?? "global";
  const authorizationEpoch = options.authorizationEpoch ?? 1;
  const previous = await readState(options.statePath);
  const byId = new Map(previous.extensions.map((row) => [row.id, row]));
  const extensions: LifecycleRecord[] = options.catalog.map((entry) => {
    const id = String(entry.id ?? "");
    const existing = byId.get(id);
    if (existing) return existing;
    return {
      id,
      lifecycle: "ready",
      enabled: true,
      enabledMode: id === "knowledge-worker" ? "shadow" : "active",
      channel,
      scope,
      authorizationEpoch,
      ...(id === "knowledge-worker" ? { productionActivation: false } : {}),
      health: {
        available: true,
        routingDependency: Boolean(entry.routingDependency),
        reason: "local_bridge_seed",
        ...(id === "knowledge-worker" ? { productionActivation: false } : {}),
      },
    };
  });
  const next: BridgeState = {
    ...previous,
    schemaVersion: EMPTY_STATE.schemaVersion,
    protocolVersion: "1.0",
    revision: Math.max(1, previous.revision + 1),
    generatedAt: new Date().toISOString(),
    extensions,
  };
  await writeState(options.statePath, validate(next));
  return next;
}

const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const publicKeyFromTrust = (verificationKey: string) => {
  if (verificationKey.includes("BEGIN PUBLIC KEY")) return createPublicKey(verificationKey);
  return createPublicKey({
    key: Buffer.from(verificationKey, "base64"),
    format: "der",
    type: "spki",
  });
};
const importArtifactBundleRecords = (
  bundle: ArtifactBundleImport,
  verificationKey: string,
  state: BridgeState,
): RecommendationRecord[] => {
  const manifestSha256 = sha256(bundle.manifestText);
  if (bundle.expectedManifestSha256 && bundle.expectedManifestSha256 !== manifestSha256)
    throw new Error("recommendation manifest hash drift");
  if (
    bundle.manifest.artifactFormat !== "role-model.artifact-bundle.v1" ||
    bundle.manifest.contract !== "ServerReturnBundleManifestV1" ||
    bundle.manifest.lifecycleState !== "sealed" ||
    bundle.manifest.channel !== (process.env.ROLE_MODEL_RECOMMENDATION_CHANNEL ?? "production")
  )
    throw new Error("invalid recommendation Artifact Bundle manifest");
  const channelSequence = Number(bundle.manifest.channelSequence);
  if (
    !Number.isSafeInteger(channelSequence) ||
    channelSequence <= (state.recommendationRevision ?? 0)
  )
    throw new Error("stale recommendation Artifact Bundle");
  if (
    bundle.signature.algorithm !== "ed25519" ||
    bundle.signature.keyId !== bundle.manifest.signingKeyId ||
    bundle.signature.manifestSha256 !== manifestSha256 ||
    typeof bundle.signature.value !== "string"
  )
    throw new Error("invalid recommendation signature envelope");
  const signatureBytes = Buffer.from(bundle.signature.value, "base64");
  if (
    !verify(
      null,
      Buffer.from(bundle.manifestText),
      publicKeyFromTrust(verificationKey),
      signatureBytes,
    )
  )
    throw new Error("recommendation signature validation failed");
  const contents = bundle.manifest.contents;
  if (!Array.isArray(contents) || contents.length < 1 || contents.length > 16)
    throw new Error("recommendation Artifact Bundle content manifest is invalid");
  const policyAllowed =
    (state.contribution ?? EMPTY_CONTRIBUTION).recommendationAccess !== "disabled";
  const rows: RecommendationRecord[] = [];
  for (const [index, content] of contents.entries()) {
    if (!content || typeof content !== "object")
      throw new Error(`recommendation content entry invalid at ${index}`);
    const entry = content as Record<string, unknown>;
    const recordPath = String(entry.path ?? "");
    const bytes = bundle.recordsByPath[recordPath];
    if (!recordPath || typeof bytes !== "string")
      throw new Error(`recommendation record missing ${recordPath}`);
    if (
      entry.sha256 !== sha256(bytes) ||
      entry.byteLength !== Buffer.byteLength(bytes) ||
      !Number.isSafeInteger(entry.recordCount) ||
      Number(entry.recordCount) < 1
    )
      throw new Error(`recommendation record hash or count drift ${recordPath}`);
    const parsed = bytes
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    if (parsed.length !== entry.recordCount)
      throw new Error(`recommendation record count drift ${recordPath}`);
    for (const [recordIndex, record] of parsed.entries()) {
      const envelope = record.envelope as Record<string, unknown> | undefined;
      if (
        !envelope?.artifactId ||
        (envelope.privacy &&
          ((envelope.privacy as Record<string, unknown>).rawContentIncluded !== false ||
            (envelope.privacy as Record<string, unknown>).redactionApplied !== true))
      )
        throw new Error("recommendation record privacy/provenance is incomplete");
      const identity = readRecommendationIdentity(record, `${recordPath}:${recordIndex}`);
      rows.push({
        id: String(envelope.artifactId),
        version: String(record.channelSequence ?? channelSequence),
        provenance: `cloud:${manifestSha256}`,
        status: "validated",
        signatureValid: true,
        policyAllowed,
        ...identity,
        ...(Array.isArray(record.preferredFor) &&
        record.preferredFor.every((value) => typeof value === "string")
          ? { preferredFor: record.preferredFor }
          : {}),
        ...(typeof record.action === "string" ? { action: record.action } : {}),
        ...(typeof record.confidence === "number" ? { confidence: record.confidence } : {}),
      });
    }
  }
  if (!rows.length || rows.length > 1000)
    throw new Error("recommendation record cardinality invalid");
  return rows;
};
const runtimePlan = (state: BridgeState, sourceRevision: number): RetentionPlan => {
  const eligible = state.storageServices.filter(
    (row) => !(row.holds ?? 0) && !(row.leases ?? 0) && !(row.conflicts?.length ?? 0),
  );
  const conflicts = state.storageServices.flatMap((row) => [
    ...((row.holds ?? 0) ? [{ id: row.id, reason: "legal_hold" }] : []),
    ...((row.leases ?? 0) ? [{ id: row.id, reason: "active_lease" }] : []),
    ...(row.conflicts ?? []).map((reason) => ({ id: row.id, reason })),
  ]);
  const basis = {
    sourceRevision,
    policies: state.retention.policies ?? [],
    inventory: state.storageServices.map(({ id, category, tier, scope, bytes, count }) => ({
      id,
      category,
      tier,
      scope,
      bytes,
      count,
    })),
  };
  return {
    schemaVersion: "role-model.retention-dry-run.v1",
    channel: "production",
    affectedCount: eligible.reduce((sum, row) => sum + row.count, 0),
    estimatedBytes: eligible.reduce((sum, row) => sum + row.bytes, 0),
    conflicts,
    lostCapabilities: [...new Set(eligible.map((row) => row.category))].sort(),
    retainedCapabilities: [
      ...new Set(
        state.storageServices.filter((row) => !eligible.includes(row)).map((row) => row.category),
      ),
    ].sort(),
    blocks: state.retention.managedPolicy ? ["managed_policy"] : [],
    manifestHash: createHash("sha256").update(JSON.stringify(basis)).digest("hex"),
    rollbackAvailable: false,
    sourceRevision,
  };
};

const privateRetentionRequest = async (
  endpoint: string | undefined,
  token: string | undefined,
  route: string,
  init: { readonly method?: string; readonly body?: Record<string, unknown> } = {},
): Promise<unknown | null> => {
  if (!endpoint) return null;
  if (!token || token.trim().length < 24) {
    throw new Error(
      "Track B private operations boundary requires a launcher-issued authentication token",
    );
  }
  const response = await fetch(new URL(route, endpoint.endsWith("/") ? endpoint : `${endpoint}/`), {
    method: init.method ?? "GET",
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      authorization: `Bearer ${token}`,
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const result = (await response.json().catch(() => ({}))) as { readonly error?: unknown };
  if (!response.ok)
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : `private Track B operation failed with ${response.status}`,
    );
  return result;
};

function boundedIdentity(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 1024)
    throw new Error(`${label} is required`);
  return value;
}

function recordValue(value: unknown): Readonly<Record<string, unknown>> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : {};
}

function finiteNonNegative(value: unknown, label: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label} must be finite and non-negative`);
  return number;
}

export function buildProviderEvidenceFromObservation(
  observation: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const requestId = boundedIdentity(observation.requestId, "provider evidence request id");
  const endpointId = boundedIdentity(observation.endpointId, "provider evidence endpoint id");
  const modelId = boundedIdentity(
    recordValue(observation.usageEvent).model_id ?? observation.modelId,
    "provider evidence model id",
  );
  const semantics = recordValue(observation.executionSemantics);
  const failedAttempts = Array.isArray(semantics.failedAttempts) ? semantics.failedAttempts : [];
  const failedAttemptIds = failedAttempts.map((attempt, index) =>
    boundedIdentity(
      recordValue(attempt).attemptId ?? recordValue(attempt).routedAttemptId,
      `provider failed attempt ${index + 1}`,
    ),
  );
  const failed = observation.statusFamily === "failure" || Boolean(observation.failure);
  const attemptIds = failed
    ? failedAttemptIds.length > 0
      ? failedAttemptIds
      : [`${requestId}:attempt:1`]
    : [...failedAttemptIds, `${requestId}:attempt:${failedAttemptIds.length + 1}`];
  return Object.freeze({ endpointId, modelId, status: failed ? "error" : "ok", attemptIds });
}

export function buildGraphEvidenceFromCapture(
  capture: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const messages = Array.isArray(capture.messages) ? capture.messages : [];
  const tools = Array.isArray(capture.tools) ? capture.tools : [];
  const toolRows = tools.map((tool) => recordValue(tool));
  const rawCaptureMetrics = recordValue(capture.captureMetrics);
  const captureMetrics = Object.keys(rawCaptureMetrics).length > 0
    ? Object.freeze({
        captureCpuMs: finiteNonNegative(rawCaptureMetrics.captureCpuMs, "capture CPU"),
        captureWallMs: finiteNonNegative(rawCaptureMetrics.captureWallMs, "capture wall time"),
        sqliteLockWaitMs: finiteNonNegative(rawCaptureMetrics.sqliteLockWaitMs, "SQLite lock wait"),
        queueDepthBefore: finiteNonNegative(rawCaptureMetrics.queueDepthBefore, "capture queue depth before"),
        queueDepthAfter: finiteNonNegative(rawCaptureMetrics.queueDepthAfter, "capture queue depth"),
        filesystemBytesBefore: finiteNonNegative(rawCaptureMetrics.filesystemBytesBefore, "filesystem bytes before"),
        filesystemBytesAfter: finiteNonNegative(rawCaptureMetrics.filesystemBytesAfter, "filesystem bytes after"),
        casBytesBefore: finiteNonNegative(rawCaptureMetrics.casBytesBefore, "CAS bytes before"),
        casBytesAfter: finiteNonNegative(rawCaptureMetrics.casBytesAfter, "CAS bytes after"),
        normalizedStateBytesBefore: finiteNonNegative(rawCaptureMetrics.normalizedStateBytesBefore, "normalized state bytes before"),
        normalizedStateBytesAfter: finiteNonNegative(rawCaptureMetrics.normalizedStateBytesAfter, "normalized state bytes after"),
        archiveManifestInlineContentBytes: finiteNonNegative(rawCaptureMetrics.archiveManifestInlineContentBytes, "archive manifest inline content bytes"),
      })
    : null;
  const response = recordValue(capture.response);
  const edgeCount = Number(capture.edgeCount);
  if (messages.length < 1 || !Number.isSafeInteger(edgeCount) || edgeCount < 1)
    throw new Error("exact live graph is incomplete");
  return Object.freeze({
    rootArtifactId: boundedIdentity(capture.rootArtifactId, "graph root artifact id"),
    messageNodeIds: messages.map((message, index) =>
      boundedIdentity(recordValue(message).nodeId, `graph message node ${index + 1}`),
    ),
    responseNodeId: boundedIdentity(response.nodeId, "graph response node id"),
    toolExecutionNodeIds: toolRows
      .filter((tool) => tool.kind === undefined || tool.kind === "tool_execution")
      .map((tool, index) =>
        boundedIdentity(tool.nodeId, `graph tool execution node ${index + 1}`),
      ),
    toolCallNodeIds: toolRows
      .filter((tool) => tool.kind === "tool_call")
      .map((tool, index) => boundedIdentity(tool.nodeId, `graph tool call node ${index + 1}`)),
    toolResultNodeIds: toolRows
      .filter((tool) => tool.kind === "tool_result")
      .map((tool, index) => boundedIdentity(tool.nodeId, `graph tool result node ${index + 1}`)),
    ...(captureMetrics ? { captureMetrics } : {}),
    edgeCount,
  });
}

export function buildVerifiersLiveExport(input: {
  readonly channel: "development" | "stage";
  readonly request: Readonly<Record<string, unknown>>;
  readonly observation: Readonly<Record<string, unknown>>;
  readonly capture: Readonly<Record<string, unknown>>;
}): Readonly<Record<string, unknown>> {
  const requestId = boundedIdentity(input.request.requestId, "Verifiers export request id");
  const correlationId = boundedIdentity(
    input.request.correlationId,
    "Verifiers export correlation id",
  );
  const graphRootArtifactId = boundedIdentity(
    input.request.graphRootArtifactId,
    "Verifiers export graph root artifact id",
  );
  if (input.request.readiness !== "semantic")
    throw new Error(
      "only semantic live Verifiers export is available without token-exact evidence",
    );
  const observationCorrelation = boundedIdentity(
    input.observation.correlationId ??
      recordValue(input.observation.run88Correlation).correlationId,
    "observation correlation id",
  );
  if (
    input.capture.schemaVersion !== "role-model.route-capture-read.v1" ||
    input.observation.requestId !== requestId ||
    input.capture.requestId !== requestId ||
    input.capture.routingDecisionId !== input.observation.routingDecisionId ||
    observationCorrelation !== correlationId ||
    input.capture.rootArtifactId !== graphRootArtifactId
  )
    throw new Error("Verifiers export does not reference the exact live graph and router decision");
  const messages = Array.isArray(input.capture.messages) ? input.capture.messages : [];
  const response = recordValue(input.capture.response);
  const taskPromptMessage =
    messages.find((value) => recordValue(value).role === "user") ?? messages[0];
  const taskPromptContent = recordValue(taskPromptMessage).content;
  if (taskPromptContent === undefined)
    throw new Error("Verifiers TraceTask prompt content is required");
  const taskPrompt =
    typeof taskPromptContent === "string"
      ? taskPromptContent
      : JSON.stringify(taskPromptContent);
  const semanticMessages = [...messages, response].map((value, index) => {
    const message = recordValue(value);
    const role = boundedIdentity(message.role, `Verifiers node ${index + 1} role`);
    if (!("content" in message)) throw new Error(`Verifiers node ${index + 1} content is required`);
    const toolCalls = Array.isArray(message.toolCalls) ? message.toolCalls : null;
    const toolCallId = typeof message.toolCallId === "string" ? message.toolCallId : null;
    return {
      parent: index === 0 ? null : index - 1,
      message: {
        role,
        content: message.content,
        ...(toolCalls ? { tool_calls: toolCalls } : {}),
        ...(toolCallId ? { tool_call_id: toolCallId } : {}),
        ...(typeof message.name === "string" ? { name: message.name } : {}),
      },
      sampled: index === messages.length,
      token_ids: [],
      mask: [],
      is_content: [],
      logprobs: [],
      ...(index === messages.length ? { finish_reason: "stop" } : {}),
    };
  });
  const routingDecisionId = boundedIdentity(
    input.observation.routingDecisionId,
    "Verifiers export route decision id",
  );
  const responseNodeId = boundedIdentity(response.nodeId, "Verifiers response node id");
  const traceId = `role-model-${createHash("sha256").update(`${input.channel}\0${requestId}\0${graphRootArtifactId}`).digest("hex")}`;
  return Object.freeze({
    schemaVersion: "role-model.verifiers-live-export.v1",
    channel: input.channel,
    requestId,
    correlationId,
    graphRootArtifactId,
    responseNodeIndex: messages.length,
    tokenExactDisposition: "refused_missing_evidence",
    trace: {
      id: traceId,
      task: { type: "RoleModelTraceTask", data: { idx: 0, prompt: taskPrompt } },
      nodes: semanticMessages,
      rewards: {},
      metrics: {},
      info: {
        limitations: ["semantic projection; provider-native tokens unavailable"],
        routeDecisionId: routingDecisionId,
        roleModelGraphRootArtifactId: graphRootArtifactId,
        roleModelResponseNodeId: responseNodeId,
        roleModelRequestId: requestId,
        roleModelCorrelationId: correlationId,
        roleModelToolNodeIds: (Array.isArray(input.capture.tools) ? input.capture.tools : []).map(
          (tool, index) =>
            boundedIdentity(recordValue(tool).nodeId, `graph tool node ${index + 1}`),
        ),
        roleModelToolCallNodeIds: (Array.isArray(input.capture.tools) ? input.capture.tools : [])
          .filter((tool) => recordValue(tool).kind === "tool_call")
          .map((tool, index) =>
            boundedIdentity(recordValue(tool).nodeId, `graph tool call node ${index + 1}`),
          ),
        roleModelToolResultNodeIds: (Array.isArray(input.capture.tools) ? input.capture.tools : [])
          .filter((tool) => recordValue(tool).kind === "tool_result")
          .map((tool, index) =>
            boundedIdentity(recordValue(tool).nodeId, `graph tool result node ${index + 1}`),
          ),
      },
      is_completed: true,
      stop_condition: "role_model_graph_complete",
      errors: [],
    },
  });
}

export function createTrackBOperations({
  statePath,
  catalog,
  runtimeChannel = "development",
  operationsEndpoint = process.env.ROLE_MODEL_TRACK_B_OPERATIONS_URL?.trim(),
  operationsToken = process.env.ROLE_MODEL_TRACK_B_OPERATIONS_TOKEN,
  extensionRuntime,
}: {
  readonly statePath: string;
  readonly catalog: readonly Record<string, unknown>[];
  readonly runtimeChannel?: "development" | "stage" | "production";
  readonly operationsEndpoint?: string;
  readonly operationsToken?: string;
  readonly extensionRuntime?: {
    listExtensions(): readonly unknown[] | Promise<readonly unknown[]>;
    mutateExtension(input: Record<string, unknown>): unknown | Promise<unknown>;
  };
}) {
  const requestPrivate = (
    route: string,
    init?: { readonly method?: string; readonly body?: Record<string, unknown> },
  ) => privateRetentionRequest(operationsEndpoint, operationsToken, route, init);
  return {
    async readGraphMigration(): Promise<unknown> {
      const remote = await requestPrivate("graph-migration");
      if (remote) return remote;
      throw new Error("private operations endpoint is required for graph migration status");
    },
    async advanceGraphMigration(input: Record<string, unknown>): Promise<unknown> {
      const remote = await requestPrivate("graph-migration/advance", {
        method: "POST",
        body: input,
      });
      if (remote) return remote;
      throw new Error("private operations endpoint is required for graph migration advance");
    },
    async rollbackGraphMigration(): Promise<unknown> {
      const remote = await requestPrivate("graph-migration/rollback", { method: "POST" });
      if (remote) return remote;
      throw new Error("private operations endpoint is required for graph migration rollback");
    },
    async listExtensions(): Promise<readonly unknown[]> {
      if (extensionRuntime) {
        const runtimeRows = (await extensionRuntime.listExtensions()) as Array<{
          readonly id: string;
          readonly desiredState: "enabled" | "disabled";
          readonly lifecycle: string;
          readonly pid?: number;
          readonly revision: number;
        }>;
        const runtimeById = new Map(runtimeRows.map((row) => [row.id, row]));
        return catalog.map((entry) => {
          const id = String(entry.id ?? "");
          const actual = runtimeById.get(id);
          if (!actual) {
            return {
              ...entry,
              installed: false,
              enabled: false,
              enabledMode: "disabled",
              lifecycle: "unavailable",
              revision: 0,
              health: {
                available: false,
                routingDependency: Boolean(entry.routingDependency),
                reason: "not_registered_with_private_supervisor",
              },
            };
          }
          const enabled = actual.desiredState === "enabled";
          return {
            ...entry,
            ...actual,
            installed: true,
            enabled,
            enabledMode: enabled ? (id === "knowledge-worker" ? "shadow" : "active") : "disabled",
            channel: runtimeChannel,
            scope: "global",
            authorizationEpoch: 1,
            health: {
              available: actual.lifecycle === "ready",
              routingDependency: Boolean(entry.routingDependency),
              ...(actual.lifecycle === "ready"
                ? {}
                : { reason: `private_supervisor_${actual.lifecycle}` }),
            },
          };
        });
      }
      const state = await readState(statePath);
      const byId = new Map(state.extensions.map((row) => [row.id, row]));
      return catalog.map((entry) => {
        const id = String(entry.id ?? "");
        const actual = byId.get(id);
        return actual
          ? {
              ...entry,
              ...actual,
              installed: true,
              enabledMode: actual.enabledMode ?? (actual.enabled ? "active" : "disabled"),
              ...(id === "knowledge-worker"
                ? {
                    productionActivation: actual.productionActivation ?? false,
                    health: {
                      ...actual.health,
                      productionActivation:
                        actual.health.productionActivation ?? actual.productionActivation ?? false,
                    },
                  }
                : {}),
            }
          : {
              ...entry,
              installed: false,
              enabled: false,
              enabledMode: "disabled",
              lifecycle: "unavailable",
              channel: "production",
              scope: "global",
              authorizationEpoch: 0,
              ...(id === "knowledge-worker" ? { productionActivation: false } : {}),
              health: {
                available: false,
                routingDependency: Boolean(entry.routingDependency),
                reason: "not_registered_with_private_supervisor",
                ...(id === "knowledge-worker" ? { productionActivation: false } : {}),
              },
            };
      });
    },
    async mutateExtension(input: Record<string, unknown>): Promise<unknown> {
      if (extensionRuntime) return extensionRuntime.mutateExtension(input);
      const id = String(input.id ?? "");
      const action = String(input.action ?? "");
      if (!id) throw new Error("extension id is required");
      if (
        id === "knowledge-worker" &&
        ["activate_production", "deactivate_production"].includes(action)
      ) {
        throw new Error(
          "production Knowledge Worker controls are prohibited by Direct Track B v1.1; shadow-only execution required",
        );
      }
      if (
        id === "knowledge-worker" &&
        ["enable", "set_mode"].includes(action) &&
        !["shadow", "disabled"].includes(
          String(input.mode ?? (action === "enable" ? "active" : "")),
        )
      ) {
        throw new Error(
          "Knowledge Worker is shadow-only under Direct Track B v1.1; active, advisory, and bounded modes are prohibited",
        );
      }
      if (
        ![
          "enable",
          "disable",
          "set_mode",
          "bootstrap_shadow_ready",
          "activate_production",
          "deactivate_production",
        ].includes(action)
      )
        throw new Error(
          "extension mutation action must be enable, disable, set_mode, bootstrap_shadow_ready, activate_production, or deactivate_production",
        );
      let state = await readState(statePath);
      const catalogEntry = catalog.find((entry) => String(entry.id ?? "") === id);
      let index = state.extensions.findIndex((row) => row.id === id);
      if (!catalogEntry) throw new Error(`extension not found: ${id}`);
      if (index < 0) {
        const seeded: LifecycleRecord = {
          id,
          lifecycle: "stopped",
          enabled: false,
          enabledMode: "disabled",
          channel: String(catalogEntry.channel ?? "production"),
          scope: String(catalogEntry.scope ?? "global"),
          authorizationEpoch: Number(catalogEntry.authorizationEpoch ?? 0) || 0,
          ...(id === "knowledge-worker" ? { productionActivation: false } : {}),
          health: {
            available: false,
            routingDependency: Boolean(catalogEntry.routingDependency),
            reason: "operator_unregistered_pending_mutation",
            ...(id === "knowledge-worker" ? { productionActivation: false } : {}),
          },
        };
        state = {
          ...state,
          extensions: [...state.extensions, seeded],
        };
        index = state.extensions.length - 1;
      }
      const current = state.extensions[index];
      if (!current) throw new Error(`extension state missing for ${id}`);
      let enabled = current.enabled;
      let enabledMode = asExtensionMode(
        current.enabledMode,
        current.enabled ? "active" : "disabled",
      );
      let productionActivation = current.productionActivation ?? false;
      let knowledgeWorkerBootstrap = current.health.knowledgeWorkerBootstrap;
      if (
        ["bootstrap_shadow_ready", "activate_production", "deactivate_production"].includes(
          action,
        ) &&
        id !== "knowledge-worker"
      ) {
        throw new Error(`${action} is supported only for knowledge-worker`);
      }
      if (action === "disable") {
        enabled = false;
        enabledMode = "disabled";
      } else if (action === "enable" || action === "set_mode") {
        const requested = asExtensionMode(input.mode, action === "enable" ? "active" : enabledMode);
        if (typeof input.mode === "string" && !EXTENSION_MODES.has(input.mode as ExtensionMode))
          throw new Error(`illegal extension mode: ${String(input.mode)}`);
        if (action === "set_mode" && input.mode == null)
          throw new Error("mode is required for set_mode");
        const dependsOn = Array.isArray(catalogEntry.dependsOn)
          ? catalogEntry.dependsOn.map((value) => String(value))
          : [];
        const modeDependsOn = Array.isArray(catalogEntry.modeDependsOn)
          ? catalogEntry.modeDependsOn
          : [];
        if (requested !== "disabled" && (dependsOn.length > 0 || modeDependsOn.length > 0)) {
          const byId = new Map(state.extensions.map((row) => [row.id, row]));
          const missingHard = dependsOn.filter((depId) => {
            const dep = byId.get(depId);
            return !dep || !dep.enabled || (dep.enabledMode ?? "disabled") === "disabled";
          });
          if (missingHard.length > 0)
            throw new Error(
              `extension dependency not enabled: ${missingHard.join(", ")} required by ${id}`,
            );
          const missingMode = modeDependsOn.flatMap((raw) => {
            if (!raw || typeof raw !== "object") return ["invalid-mode-dependency"];
            const depId = String((raw as { id?: unknown }).id ?? "");
            const allowed = Array.isArray((raw as { modes?: unknown }).modes)
              ? ((raw as { modes: unknown[] }).modes.map((value) =>
                  String(value),
                ) as ExtensionMode[])
              : (["active", "bounded", "advisory", "shadow"] as ExtensionMode[]);
            const dep = byId.get(depId);
            if (!dep || !dep.enabled || (dep.enabledMode ?? "disabled") === "disabled")
              return [depId || "unknown"];
            const mode = dep.enabledMode ?? "active";
            if (!allowed.includes(mode)) return [`${depId}:${mode}`];
            return [];
          });
          if (missingMode.length > 0)
            throw new Error(
              `extension mode dependency not satisfied: ${missingMode.join(", ")} required by ${id}`,
            );
        }
        enabled = requested !== "disabled";
        enabledMode = requested;
      } else if (action === "bootstrap_shadow_ready") {
        const receipt = asKnowledgeValidationReceipt(input.receipt);
        const groupDigest = String(input.groupDigest ?? "");
        if (!/^[a-f0-9]{64}$/.test(groupDigest))
          throw new Error(
            "knowledge-worker shadow-ready bootstrap refused: groupDigest must be 64-hex",
          );
        knowledgeWorkerBootstrap = { receipt, groupDigest };
      } else if (action === "activate_production") {
        if (
          input.activationPolicyVersion !== 1 ||
          input.operatorAttestation !== "activate-production"
        )
          throw new Error(
            "knowledge-worker production activation refused: v1 ceremony policy and operator attestation are required",
          );
        asKnowledgeValidationReceipt(input.receipt ?? knowledgeWorkerBootstrap?.receipt);
        const sessionId = String(input.sessionId ?? state.revision + 1);
        const worker = kwJoinWorkerFactory ? await kwJoinWorkerFactory(sessionId) : undefined;
        if (worker) {
          const joinSeed =
            (input.joinSeed as Record<string, unknown> | undefined) ??
            (input.value as Record<string, unknown> | undefined);
          if (joinSeed) {
            const seedable = worker as KwSessionWorker & {
              readonly bootstrapShadowReady?: (value: unknown) => unknown;
              readonly derive?: (value: unknown) => unknown;
            };
            try {
              if (typeof seedable.bootstrapShadowReady === "function") {
                seedable.bootstrapShadowReady(joinSeed);
              } else if (typeof seedable.derive === "function") {
                seedable.derive(joinSeed);
              }
            } catch {
              // Worker may already hold a matching shadow candidate.
            }
          }
          const join = await syncPrivateKnowledgeActivation({
            sessionId,
            action: "activate",
            policy: {
              activationPolicyVersion: 1,
              operatorAttestation: "activate-production",
              receipt: input.receipt ?? knowledgeWorkerBootstrap?.receipt,
            },
            worker,
          });
          if (!join.ok) {
            // Explicit join seed means the caller required private sync.
            if (joinSeed) {
              throw new Error(
                `knowledge-worker production activation refused: ${join.code ?? "kw_prompt_inject_join_unsatisfied"}`,
              );
            }
            // Without a seed, keep durable host ON; inject stays join_unsatisfied until synced.
          } else {
            registerKwPromptInjectSession(sessionId, worker);
          }
        }
        productionActivation = true;
      } else if (action === "deactivate_production") {
        const sessionId = String(input.sessionId ?? state.revision + 1);
        const registered = kwJoinWorkerFactory ? await kwJoinWorkerFactory(sessionId) : undefined;
        if (registered) {
          await syncPrivateKnowledgeActivation({
            sessionId,
            action: "deactivate",
            policy: {
              deactivationPolicyVersion: 1,
              operatorAttestation: "deactivate-production",
            },
            worker: registered,
          });
        }
        productionActivation = false;
      }
      const lifecycle: LifecycleRecord["lifecycle"] = enabled
        ? current.lifecycle === "stopped"
          ? "ready"
          : current.lifecycle
        : "stopped";
      const nextRow: LifecycleRecord = {
        ...current,
        enabled,
        enabledMode,
        lifecycle,
        ...(id === "knowledge-worker" ? { productionActivation } : {}),
        health: {
          ...current.health,
          available: enabled && (lifecycle === "ready" || current.health.available),
          reason: enabled
            ? current.health.reason === "operator_disabled"
              ? "operator_enabled"
              : (current.health.reason ?? "operator_enabled")
            : "operator_disabled",
          ...(id === "knowledge-worker"
            ? {
                productionActivation,
                ...(knowledgeWorkerBootstrap ? { knowledgeWorkerBootstrap } : {}),
              }
            : {}),
        },
      };
      const extensions = state.extensions.map((row, rowIndex) =>
        rowIndex === index ? nextRow : row,
      );
      // Fix health consistency for validate(): available must match lifecycle === ready
      const normalized: LifecycleRecord[] = extensions.map((row) => {
        if (!row.enabled) {
          return {
            ...row,
            enabled: false,
            enabledMode: "disabled" as const,
            lifecycle: "stopped" as const,
            health: {
              ...row.health,
              available: false,
              reason: row.health.reason ?? "operator_disabled",
            },
          };
        }
        const nextLifecycle = row.lifecycle === "stopped" ? ("ready" as const) : row.lifecycle;
        return {
          ...row,
          enabled: true,
          enabledMode: row.enabledMode ?? "active",
          lifecycle: nextLifecycle,
          health: {
            ...row.health,
            available: nextLifecycle === "ready",
            reason:
              row.health.reason === "operator_disabled"
                ? "operator_enabled"
                : (row.health.reason ?? "operator_enabled"),
          },
        };
      });
      const receipt: ExtensionMutationReceipt = {
        id: `ext-mut-${createHash("sha256")
          .update(JSON.stringify([id, action, enabledMode, state.revision + 1]))
          .digest("hex")
          .slice(0, 16)}`,
        at: new Date().toISOString(),
        who: "local-operator",
        extensionId: id,
        action: action as ExtensionMutationReceipt["action"],
        mode: enabledMode,
        result: "applied",
      };
      const receipts = [...(state.extensionMutationReceipts ?? []), receipt].slice(-100);
      const next: BridgeState = {
        ...state,
        revision: state.revision + 1,
        generatedAt: new Date().toISOString(),
        extensions: normalized,
        extensionMutationReceipts: receipts,
      };
      await writeState(statePath, validate(next));
      const byId = new Map(normalized.map((row) => [row.id, row]));
      const listed = catalog.map((entry) => {
        const entryId = String(entry.id ?? "");
        const actual = byId.get(entryId);
        return actual
          ? {
              ...entry,
              ...actual,
              installed: true,
              enabledMode: actual.enabledMode ?? (actual.enabled ? "active" : "disabled"),
              ...(entryId === "knowledge-worker"
                ? {
                    productionActivation: actual.productionActivation ?? false,
                    health: {
                      ...actual.health,
                      productionActivation:
                        actual.health.productionActivation ?? actual.productionActivation ?? false,
                    },
                  }
                : {}),
            }
          : {
              ...entry,
              installed: false,
              enabled: false,
              enabledMode: "disabled",
              lifecycle: "unavailable",
              channel: "production",
              scope: "global",
              authorizationEpoch: 0,
              ...(entryId === "knowledge-worker" ? { productionActivation: false } : {}),
              health: {
                available: false,
                routingDependency: Boolean(entry.routingDependency),
                reason: "not_registered_with_private_supervisor",
                ...(entryId === "knowledge-worker" ? { productionActivation: false } : {}),
              },
            };
      });
      return { extensions: listed, receipts };
    },
    async dismissRecommendation(input: Record<string, unknown>): Promise<unknown> {
      const state = await readState(statePath);
      const id = String(input.id ?? "");
      const rows = [...(state.recommendations ?? [])];
      const index = rows.findIndex((row) => row.id === id);
      if (index < 0) throw new Error("recommendation not found");
      const current = rows[index];
      if (!current) throw new Error("recommendation not found");
      if (current.status === "applied")
        throw new Error("applied recommendation cannot be dismissed");
      if (current.status === "dismissed")
        return { recommendations: rows, activePack: state.activePack ?? null };
      rows[index] = { ...current, status: "dismissed" };
      await writeState(statePath, {
        ...state,
        revision: state.revision + 1,
        generatedAt: new Date().toISOString(),
        recommendations: rows,
      });
      return { recommendations: rows, activePack: state.activePack ?? null };
    },
    async readStorageRetention(): Promise<unknown> {
      const remote = await requestPrivate("storage-retention");
      const storageAudit = await requestPrivate("storage-audit");
      if (remote)
        return {
          ...normalizeStorageRetentionContract(remote),
          storageAudit: storageAudit ?? null,
        };
      const state = await readState(statePath);
      const categories = state.storageServices.map((row) => ({
        id: row.category,
        tier: row.tier,
        scope: row.scope,
        bytes: row.bytes,
        count: row.count,
        serviceId: row.id,
      }));
      const physicalResources = state.storageServices.map((row) => ({
        id: row.id,
        owner: row.id,
        health: "unavailable",
        measurement: "unavailable" as const,
        physicalBytes: null,
        heldItems: row.holds ?? 0,
        retentionState: "not_configured",
      }));
      return {
        revision: state.revision,
        totalBytes: categories.reduce((sum, row) => sum + row.bytes, 0),
        categories,
        logicalClasses: categories,
        physicalResources,
        // Run 94 SP8: the local fallback never fabricates a physical inventory.
        // Physical bytes come exclusively from the read-only storage audit; without
        // a measurement every entry is honestly unavailable.
        storageAudit: storageAudit ?? null,
        storageInventory: {
          schemaVersion: "role-model.storage-registry.v1",
          complete: false,
          entries: physicalResources,
        },
        managedPolicy: state.retention.managedPolicy,
        conflicts: state.storageServices.flatMap((row) =>
          (row.conflicts ?? []).map((reason) => ({ serviceId: row.id, reason })),
        ),
        holds: state.storageServices.reduce((sum, row) => sum + (row.holds ?? 0), 0),
        leases: state.storageServices.reduce((sum, row) => sum + (row.leases ?? 0), 0),
        receipts: state.retention.receipts,
        activeJob: state.retention.activeJob,
        currentPlan: state.retention.currentPlan ?? null,
        policies: state.retention.policies ?? [],
      };
    },
    async dryRunStorageRetention(): Promise<unknown> {
      const remote = await requestPrivate("storage-retention/dry-run", { method: "POST" });
      if (remote) return remote;
      const state = await readState(statePath);
      if (state.retention.managedPolicy)
        throw new Error("storage retention is controlled by managed policy");
      const nextRevision = state.revision + 1;
      const plan =
        state.retention.currentPlan?.sourceRevision === state.revision
          ? { ...state.retention.currentPlan, sourceRevision: nextRevision }
          : runtimePlan(state, nextRevision);
      const receipt = {
        id: `dry-${createHash("sha256")
          .update(JSON.stringify([plan.manifestHash, state.revision]))
          .digest("hex")
          .slice(0, 16)}`,
        status: "preview",
        affectedCount: plan.affectedCount,
        estimatedBytes: plan.estimatedBytes,
        conflictCount: plan.conflicts.length,
        rollbackAvailable: plan.rollbackAvailable,
        manifestHash: plan.manifestHash,
        sourceRevision: state.revision,
      };
      const next: BridgeState = {
        ...state,
        revision: nextRevision,
        generatedAt: new Date().toISOString(),
        retention: {
          ...state.retention,
          currentPlan: plan,
          receipts: [...state.retention.receipts, receipt].slice(-100),
        },
      };
      await writeState(statePath, next);
      return this.readStorageRetention();
    },
    async updateStorageRetentionPolicy(input: Record<string, unknown>): Promise<unknown> {
      const remote = await requestPrivate("storage-retention/policy", {
        method: "PUT",
        body: input,
      });
      if (remote) return remote;
      const state = await readState(statePath);
      if (state.retention.managedPolicy)
        throw new Error("storage retention is controlled by managed policy");
      const policy: RetentionPolicy = {
        policyId: String(input.policyId ?? ""),
        scope: String(input.scope ?? ""),
        maxBytes: Number(input.maxBytes),
        maxAgeDays: Number(input.maxAgeDays),
      };
      if (
        !policy.policyId ||
        !policy.scope ||
        !Number.isFinite(policy.maxBytes) ||
        policy.maxBytes < 0 ||
        !Number.isInteger(policy.maxAgeDays) ||
        policy.maxAgeDays < 1
      )
        throw new Error("invalid retention policy");
      await writeState(statePath, {
        ...state,
        revision: state.revision + 1,
        generatedAt: new Date().toISOString(),
        retention: { ...state.retention, policies: [policy], currentPlan: null },
      });
      return this.readStorageRetention();
    },
    async executeStorageRetention(input: Record<string, unknown>): Promise<unknown> {
      const remote = await requestPrivate("storage-retention/execute", {
        method: "POST",
        body: input,
      });
      if (remote) return remote;
      const state = await readState(statePath);
      if (state.retention.managedPolicy)
        throw new Error("storage retention is controlled by managed policy");
      const plan = state.retention.currentPlan;
      if (
        !plan ||
        plan.sourceRevision !== state.revision ||
        input.manifestHash !== plan.manifestHash
      )
        throw new Error("matching hash-bound retention plan required");
      if (plan.blocks.length) throw new Error(`retention plan blocked: ${plan.blocks.join(", ")}`);
      if (!operationsEndpoint)
        throw new Error("private operations endpoint is required for retention execution");
      const job: RetentionJob = {
        id: `prune-${plan.manifestHash.slice(0, 12)}`,
        status: "running",
        progress: 0,
        manifestHash: plan.manifestHash,
        scope: String(input.scope ?? "global"),
      };
      const receipt = {
        id: job.id,
        status: "running",
        affectedCount: plan.affectedCount,
        estimatedBytes: plan.estimatedBytes,
        conflictCount: plan.conflicts.length,
        rollbackAvailable: plan.rollbackAvailable,
        manifestHash: plan.manifestHash,
      };
      await writeState(statePath, {
        ...state,
        revision: state.revision + 1,
        generatedAt: new Date().toISOString(),
        retention: {
          ...state.retention,
          activeJob: job,
          currentPlan: { ...plan, sourceRevision: state.revision + 1 },
          receipts: [...state.retention.receipts, receipt].slice(-100),
        },
      });
      return this.readStorageRetention();
    },
    async cancelStorageRetentionJob(): Promise<unknown> {
      const remote = await requestPrivate("storage-retention/cancel", { method: "POST" });
      if (remote) return remote;
      if (!operationsEndpoint)
        throw new Error("private operations endpoint is required for retention cancellation");
      const state = await readState(statePath);
      if (!state.retention.activeJob || state.retention.activeJob.status !== "running")
        throw new Error("no cancellable retention job");
      await writeState(statePath, {
        ...state,
        revision: state.revision + 1,
        generatedAt: new Date().toISOString(),
        retention: {
          ...state.retention,
          activeJob: { ...state.retention.activeJob, status: "cancelled" },
        },
      });
      return this.readStorageRetention();
    },
    async rollbackStorageRetention(input: Record<string, unknown>): Promise<unknown> {
      const remote = await requestPrivate("storage-retention/rollback", {
        method: "POST",
        body: input,
      });
      if (remote) return remote;
      if (!operationsEndpoint)
        throw new Error("private operations endpoint is required for retention rollback");
      const state = await readState(statePath);
      const source = state.retention.receipts.find(
        (item) => (item as { id?: unknown }).id === input.receiptId,
      ) as { id?: string; rollbackAvailable?: boolean; affectedCount?: number } | undefined;
      if (!source?.rollbackAvailable) throw new Error("rollback is unavailable for this receipt");
      const receipt = {
        id: `rollback-${source.id}`,
        status: "rolled_back",
        affectedCount: source.affectedCount ?? 0,
        rollbackAvailable: false,
      };
      await writeState(statePath, {
        ...state,
        revision: state.revision + 1,
        generatedAt: new Date().toISOString(),
        retention: {
          ...state.retention,
          receipts: [...state.retention.receipts, receipt].slice(-100),
        },
      });
      return this.readStorageRetention();
    },
    async readContributionState(): Promise<unknown> {
      const remote = await requestPrivate("contribution");
      if (remote) return remote;
      return (await readState(statePath)).contribution;
    },
    async updateContributionState(input: Record<string, unknown>): Promise<unknown> {
      const remote = await requestPrivate("contribution", {
        method: "PUT",
        body: input,
      });
      if (remote) return remote;
      const state = await readState(statePath);
      const current = state.contribution ?? EMPTY_CONTRIBUTION;
      const action = String(input.action ?? "");
      if (current.managed && action !== "complete_disclosure")
        throw new Error("contribution is controlled by managed policy");
      let next: ContributionState;
      if (action === "opt_out")
        next = {
          ...current,
          mode: "consumer",
          contributionTier: "none",
          allowCloudUpload: false,
          authorizationState: "revoked",
          revocationEpoch: current.revocationEpoch + 1,
          queuedCount: 0,
          disclosureId: null,
        };
      else if (action === "reenable")
        next = {
          ...current,
          mode: "contributor",
          contributionTier: "advanced",
          allowCloudUpload: true,
          authorizationState: "pending_disclosure",
          revocationEpoch: current.revocationEpoch + 1,
          queuedCount: 0,
          disclosureId: null,
        };
      else if (action === "complete_disclosure" && input.disclosureId)
        next = {
          ...current,
          authorizationState: "active",
          disclosureId: String(input.disclosureId),
        };
      else throw new Error("unsupported contribution transition");
      await writeState(statePath, {
        ...state,
        revision: state.revision + 1,
        generatedAt: new Date().toISOString(),
        contribution: next,
      });
      return next;
    },
    async recordContributionAggregate(input: Record<string, unknown>): Promise<unknown> {
      const remote = await requestPrivate("contribution/aggregate", {
        method: "POST",
        body: input,
      });
      return remote ?? { status: "operations_boundary_unconfigured" };
    },
    async recordLocalRouteCapture(input: Record<string, unknown>): Promise<unknown> {
      if (!operationsEndpoint) return { status: "operations_boundary_unconfigured" };
      const url = new URL(operationsEndpoint);
      if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname))
        throw new Error("local route capture requires a loopback operations boundary");
      return requestPrivate("capture/route", { method: "POST", body: input });
    },
    async measureNoRichCaptureBaseline(input: Record<string, unknown>): Promise<unknown> {
      if (!operationsEndpoint)
        throw new Error("private operations endpoint is required for no-rich capture baseline measurement");
      const url = new URL(operationsEndpoint);
      if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname))
        throw new Error("no-rich capture baseline requires a loopback operations boundary");
      return requestPrivate("capture/performance-baseline", { method: "POST", body: input });
    },
    async readLocalRouteCapture(input: Record<string, unknown>): Promise<unknown> {
      if (!operationsEndpoint)
        throw new Error("private operations endpoint is required for exact route capture readback");
      const url = new URL(operationsEndpoint);
      if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname))
        throw new Error("local route capture readback requires a loopback operations boundary");
      return requestPrivate("capture/read", { method: "POST", body: input });
    },
    async listRecommendations(): Promise<readonly RecommendationRecord[]> {
      return (await readState(statePath)).recommendations ?? [];
    },
    async importRecommendationBundle(
      bundle: Record<string, unknown>,
      verificationKey: string,
    ): Promise<readonly RecommendationRecord[]> {
      if (bundle.artifactFormat === "role-model.artifact-bundle.v1")
        throw new Error("Artifact Bundle imports require signature and record pages");
      const state = await readState(statePath);
      const revision = Number(bundle.revision);
      const sourceRows = bundle.recommendations;
      const provenance = bundle.provenance;
      const expectedChannel = process.env.ROLE_MODEL_RECOMMENDATION_CHANNEL ?? "production";
      if (
        bundle.channel !== expectedChannel ||
        !Number.isInteger(revision) ||
        revision <= (state.recommendationRevision ?? 0) ||
        !Array.isArray(sourceRows) ||
        sourceRows.length > 1000 ||
        !provenance ||
        typeof provenance !== "object"
      )
        throw new Error("invalid or stale recommendation bundle");
      const unsigned = {
        channel: bundle.channel,
        revision,
        recommendations: sourceRows,
        provenance,
      };
      const expected = createHmac("sha256", verificationKey)
        .update(JSON.stringify(unsigned))
        .digest();
      const supplied = Buffer.from(String(bundle.signature ?? ""), "hex");
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
        throw new Error("recommendation signature validation failed");
      const policyAllowed =
        (state.contribution ?? EMPTY_CONTRIBUTION).recommendationAccess !== "disabled";
      const rows = sourceRows.map((value, index) => {
        const row = value as Record<string, unknown>;
        if (!row.id || !row.version || !row.provenance)
          throw new Error(`recommendation provenance incomplete at ${index}`);
        const identity = readRecommendationIdentity(row, `recommendations:${index}`);
        return {
          id: String(row.id),
          version: String(row.version),
          provenance: String(row.provenance),
          status: "validated" as const,
          signatureValid: true,
          policyAllowed,
          ...identity,
        };
      });
      await writeState(statePath, {
        ...state,
        revision: state.revision + 1,
        generatedAt: new Date().toISOString(),
        recommendations: rows,
        recommendationRevision: revision,
      });
      return rows;
    },
    async importRecommendationArtifactBundle(
      bundle: ArtifactBundleImport,
      verificationKey: string,
    ): Promise<readonly RecommendationRecord[]> {
      const state = await readState(statePath);
      const rows = importArtifactBundleRecords(bundle, verificationKey, state);
      const channelSequence = Number(bundle.manifest.channelSequence);
      await writeState(statePath, {
        ...state,
        revision: state.revision + 1,
        generatedAt: new Date().toISOString(),
        recommendations: rows,
        recommendationRevision: channelSequence,
      });
      return rows;
    },
    async applyRecommendation(input: Record<string, unknown>): Promise<unknown> {
      const state = await readState(statePath);
      const id = String(input.id ?? "");
      const rows = [...(state.recommendations ?? [])];
      const index = rows.findIndex((row) => row.id === id);
      const row = rows[index];
      if (!row) throw new Error("recommendation not found");
      if (row.status === "dismissed") throw new Error("dismissed recommendation cannot be applied");
      if (row.status === "rejected") throw new Error("rejected recommendation cannot be applied");
      if (!row.signatureValid) throw new Error("recommendation signature validation failed");
      if (!row.policyAllowed) throw new Error("recommendation application blocked by local policy");
      if ((state.contribution ?? EMPTY_CONTRIBUTION).recommendationAccess !== "preview_and_apply")
        throw new Error("recommendation application is not authorized");
      rows[index] = { ...row, status: "applied" };
      const activePack = {
        id: row.id,
        version: row.version,
        appliedAt: new Date().toISOString(),
        ...readRecommendationIdentity(row as unknown as Record<string, unknown>, `apply:${row.id}`),
      };
      await writeState(statePath, {
        ...state,
        revision: state.revision + 1,
        generatedAt: new Date().toISOString(),
        recommendations: rows,
        activePack,
      });
      return { recommendations: rows, activePack };
    },
    async readActivePack(): Promise<unknown> {
      return (await readState(statePath)).activePack ?? null;
    },
  };
}
