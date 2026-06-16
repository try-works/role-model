import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export const OPERATOR_INTENT_SCHEMA_VERSION = 1 as const;

export interface OperatorIntentLocation {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}

export interface OperatorIntentRemoteActivation {
  readonly providerAccountId: string;
  readonly modelId: string;
  readonly region: string;
  readonly endpointId: string;
  readonly modelRoleBindings?: readonly {
    readonly modelId: string;
    readonly roleIds: readonly string[];
  }[];
}

export interface OperatorIntentPeerLoad {
  readonly peerId: string;
  readonly modelId: string;
  readonly roleIds: readonly string[];
  readonly autoReload: boolean;
}

export interface OperatorIntentLlamaSwapLoad {
  readonly modelId: string;
  readonly roleIds: readonly string[];
  readonly autoReload: boolean;
}

export interface OperatorIntentV1 {
  readonly schemaVersion: typeof OPERATOR_INTENT_SCHEMA_VERSION;
  readonly updatedAt: string;
  readonly remoteActivations: readonly OperatorIntentRemoteActivation[];
  readonly peerLoads: readonly OperatorIntentPeerLoad[];
  readonly llamaSwapLoads: readonly OperatorIntentLlamaSwapLoad[];
}

export type OperatorIntentDiagnostic =
  | { readonly status: "missing" }
  | { readonly status: "ok" }
  | { readonly status: "corrupt"; readonly message: string };

export interface OperatorIntentReadResult {
  readonly intent: OperatorIntentV1 | null;
  readonly diagnostic: OperatorIntentDiagnostic;
}

function ensureNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function readStringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
  return [...value];
}

function readModelRoleBindings(
  value: unknown,
): readonly { modelId: string; roleIds: readonly string[] }[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error("modelRoleBindings must be an array");
  }
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`modelRoleBindings[${index}] must be an object`);
    }
    const record = entry as Record<string, unknown>;
    return {
      modelId: ensureNonEmptyString(record.modelId, `modelRoleBindings[${index}].modelId`),
      roleIds: readStringArray(record.roleIds, `modelRoleBindings[${index}].roleIds`),
    };
  });
}

function readRemoteActivation(value: unknown, index: number): OperatorIntentRemoteActivation {
  if (!value || typeof value !== "object") {
    throw new Error(`remoteActivations[${index}] must be an object`);
  }
  const record = value as Record<string, unknown>;
  return {
    providerAccountId: ensureNonEmptyString(
      record.providerAccountId,
      `remoteActivations[${index}].providerAccountId`,
    ),
    modelId: ensureNonEmptyString(record.modelId, `remoteActivations[${index}].modelId`),
    region: ensureNonEmptyString(record.region, `remoteActivations[${index}].region`),
    endpointId: ensureNonEmptyString(record.endpointId, `remoteActivations[${index}].endpointId`),
    modelRoleBindings: readModelRoleBindings(record.modelRoleBindings),
  };
}

function readPeerLoad(value: unknown, index: number): OperatorIntentPeerLoad {
  if (!value || typeof value !== "object") {
    throw new Error(`peerLoads[${index}] must be an object`);
  }
  const record = value as Record<string, unknown>;
  return {
    peerId: ensureNonEmptyString(record.peerId, `peerLoads[${index}].peerId`),
    modelId: ensureNonEmptyString(record.modelId, `peerLoads[${index}].modelId`),
    roleIds: readStringArray(record.roleIds, `peerLoads[${index}].roleIds`),
    autoReload: record.autoReload === true,
  };
}

function readLlamaSwapLoad(value: unknown, index: number): OperatorIntentLlamaSwapLoad {
  if (!value || typeof value !== "object") {
    throw new Error(`llamaSwapLoads[${index}] must be an object`);
  }
  const record = value as Record<string, unknown>;
  return {
    modelId: ensureNonEmptyString(record.modelId, `llamaSwapLoads[${index}].modelId`),
    roleIds: readStringArray(record.roleIds, `llamaSwapLoads[${index}].roleIds`),
    autoReload: record.autoReload === true,
  };
}

export function resolveOperatorIntentPath(location: OperatorIntentLocation): string {
  const runtimeStateRoot = ensureNonEmptyString(location.runtimeStateRoot, "runtimeStateRoot");
  const scopeId = ensureNonEmptyString(location.scopeId, "scopeId");
  return path.join(runtimeStateRoot, scopeId, "operator-intent.json");
}

export function createEmptyOperatorIntent(now = new Date()): OperatorIntentV1 {
  return {
    schemaVersion: OPERATOR_INTENT_SCHEMA_VERSION,
    updatedAt: now.toISOString(),
    remoteActivations: [],
    peerLoads: [],
    llamaSwapLoads: [],
  };
}

export function validateOperatorIntent(value: unknown): OperatorIntentV1 {
  if (!value || typeof value !== "object") {
    throw new Error("operator intent must be an object");
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== OPERATOR_INTENT_SCHEMA_VERSION) {
    throw new Error(`operator intent schemaVersion must be ${OPERATOR_INTENT_SCHEMA_VERSION}`);
  }
  if (!Array.isArray(record.remoteActivations)) {
    throw new Error("remoteActivations must be an array");
  }
  if (!Array.isArray(record.peerLoads)) {
    throw new Error("peerLoads must be an array");
  }
  if (!Array.isArray(record.llamaSwapLoads)) {
    throw new Error("llamaSwapLoads must be an array");
  }

  return {
    schemaVersion: OPERATOR_INTENT_SCHEMA_VERSION,
    updatedAt: ensureNonEmptyString(record.updatedAt, "updatedAt"),
    remoteActivations: record.remoteActivations.map(readRemoteActivation),
    peerLoads: record.peerLoads.map(readPeerLoad),
    llamaSwapLoads: record.llamaSwapLoads.map(readLlamaSwapLoad),
  };
}

export function readOperatorIntentResult(
  location: OperatorIntentLocation,
): OperatorIntentReadResult {
  const intentPath = resolveOperatorIntentPath(location);
  if (!existsSync(intentPath)) {
    return { intent: null, diagnostic: { status: "missing" } };
  }
  try {
    const intent = validateOperatorIntent(JSON.parse(readFileSync(intentPath, "utf8")) as unknown);
    return { intent, diagnostic: { status: "ok" } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "operator intent is invalid";
    return { intent: null, diagnostic: { status: "corrupt", message } };
  }
}

export function readOperatorIntent(location: OperatorIntentLocation): OperatorIntentV1 | null {
  return readOperatorIntentResult(location).intent;
}

export function writeOperatorIntent(
  location: OperatorIntentLocation,
  intent: OperatorIntentV1,
): void {
  const validated = validateOperatorIntent(intent);
  const intentPath = resolveOperatorIntentPath(location);
  mkdirSync(path.dirname(intentPath), { recursive: true });
  const tempPath = `${intentPath}.${process.pid}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  try {
    renameSync(tempPath, intentPath);
  } catch (error) {
    try {
      unlinkSync(tempPath);
    } catch {
      // Ignore cleanup failure.
    }
    throw error;
  }
}

export function upsertRemoteActivation(
  intent: OperatorIntentV1,
  activation: OperatorIntentRemoteActivation,
): OperatorIntentV1 {
  const nextActivation = {
    providerAccountId: activation.providerAccountId,
    modelId: activation.modelId,
    region: activation.region,
    endpointId: activation.endpointId,
    ...(activation.modelRoleBindings !== undefined
      ? { modelRoleBindings: activation.modelRoleBindings }
      : {}),
  };
  const withoutExisting = intent.remoteActivations.filter(
    (entry) => entry.endpointId !== activation.endpointId,
  );
  return {
    ...intent,
    remoteActivations: [...withoutExisting, nextActivation],
  };
}

export function removeRemoteActivation(
  intent: OperatorIntentV1,
  endpointId: string,
): OperatorIntentV1 {
  return {
    ...intent,
    remoteActivations: intent.remoteActivations.filter((entry) => entry.endpointId !== endpointId),
  };
}

export function upsertPeerLoad(
  intent: OperatorIntentV1,
  peerLoad: OperatorIntentPeerLoad,
): OperatorIntentV1 {
  const withoutExisting = intent.peerLoads.filter(
    (entry) => !(entry.peerId === peerLoad.peerId && entry.modelId === peerLoad.modelId),
  );
  return {
    ...intent,
    peerLoads: [...withoutExisting, peerLoad],
  };
}

export function removePeerLoad(
  intent: OperatorIntentV1,
  peerId: string,
  modelId: string,
): OperatorIntentV1 {
  return {
    ...intent,
    peerLoads: intent.peerLoads.filter(
      (entry) => !(entry.peerId === peerId && entry.modelId === modelId),
    ),
  };
}

export function upsertLlamaSwapLoad(
  intent: OperatorIntentV1,
  load: OperatorIntentLlamaSwapLoad,
): OperatorIntentV1 {
  const withoutExisting = intent.llamaSwapLoads.filter((entry) => entry.modelId !== load.modelId);
  return {
    ...intent,
    llamaSwapLoads: [...withoutExisting, load],
  };
}

export function removeLlamaSwapLoad(intent: OperatorIntentV1, modelId: string): OperatorIntentV1 {
  return {
    ...intent,
    llamaSwapLoads: intent.llamaSwapLoads.filter((entry) => entry.modelId !== modelId),
  };
}

export function clearRemoteActivations(intent: OperatorIntentV1): OperatorIntentV1 {
  return {
    ...intent,
    remoteActivations: [],
  };
}

export function persistOperatorIntent(
  location: OperatorIntentLocation,
  updater: (current: OperatorIntentV1) => OperatorIntentV1,
): OperatorIntentV1 {
  const readResult = readOperatorIntentResult(location);
  if (readResult.diagnostic.status === "corrupt") {
    throw new Error(`operator intent manifest is corrupt: ${readResult.diagnostic.message}`);
  }
  const current = readResult.intent ?? createEmptyOperatorIntent();
  const next = updater(current);
  const stamped: OperatorIntentV1 = {
    ...next,
    schemaVersion: OPERATOR_INTENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  writeOperatorIntent(location, stamped);
  return stamped;
}
