/**
 * Run 101 / R3-R4 - the host's view of the queue policy.
 *
 * The operator API (private repository) owns the catalogue and the write path;
 * the host only ever *reads* the effective document, so the two repos cannot
 * disagree about a queue's behaviour. Precedence is the same as the activation
 * policy: the state-root document wins, the shipped document is the fallback,
 * and a missing or invalid document is a named error rather than a silent
 * default.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export const QUEUE_POLICY_SCHEMA_VERSION = "role-model.queue-policy.v1";
export const QUEUE_POLICY_STATE_RELATIVE_PATH = "queues/queue-policy.json";
export const QUEUE_POLICY_SHIPPED_RELATIVE_PATH = "shared/queue-policy.json";

export const QUEUE_MODES = ["legacy", "shadow", "queue"] as const;
export type QueueMode = (typeof QUEUE_MODES)[number];

export const QUEUE_NAMES = [
  "replay.dispatch",
  "evaluation.score",
  "learner.derive",
  "learner.promote",
] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

export interface QueueParameters {
  readonly mode: QueueMode;
  readonly concurrency: number;
  readonly attempts: number;
  readonly backoffBaseMs: number;
  readonly backoffCapMs: number;
  readonly lockRefreshMs: number;
  readonly lockExpirationMs: number;
  readonly retentionDays: number;
}

export interface QueuePolicyDocument {
  readonly schemaVersion: string;
  readonly policyVersion: number;
  readonly global: { readonly killSwitch: boolean };
  readonly queues: Record<string, QueueParameters>;
  readonly updatedAt: number | null;
  readonly receipts: readonly unknown[];
}

/**
 * Bounds mirror `shared/queues/queue-policy.mjs`. They are repeated here because
 * the host must fail closed on a hand-edited document even when the operator
 * API is not running; a private-side test asserts the two tables agree.
 */
export const QUEUE_PARAMETER_BOUNDS = Object.freeze({
  concurrency: { min: 1, max: 16 },
  attempts: { min: 1, max: 10 },
  backoffBaseMs: { min: 100, max: 60_000 },
  backoffCapMs: { min: 1_000, max: 900_000 },
  lockRefreshMs: { min: 1_000, max: 300_000 },
  lockExpirationMs: { min: 5_000, max: 3_600_000 },
  retentionDays: { min: 1, max: 730 },
} as const);

/** Declared as a function so TypeScript narrows after a failing check. */
function fail(message: string): never {
  throw new Error(`queue policy: ${message}`);
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Validates the whole document; every failure names the queue and the field. */
export function validateQueuePolicy(document: unknown): QueuePolicyDocument {
  if (!isPlainObject(document)) fail("document must be an object");
  const candidate = document as Record<string, unknown>;
  if (candidate.schemaVersion !== QUEUE_POLICY_SCHEMA_VERSION) {
    fail(`schemaVersion must be ${QUEUE_POLICY_SCHEMA_VERSION}`);
  }
  if (!Number.isSafeInteger(candidate.policyVersion) || (candidate.policyVersion as number) < 1) {
    fail("policyVersion must be a positive integer");
  }
  const global = candidate.global;
  if (!isPlainObject(global) || typeof global.killSwitch !== "boolean") {
    fail("global.killSwitch must be a boolean");
  }
  const queues = candidate.queues;
  if (!isPlainObject(queues)) fail("queues block is required");
  for (const [queueName, block] of Object.entries(queues)) {
    if (!(QUEUE_NAMES as readonly string[]).includes(queueName))
      fail(`unknown queue: ${queueName}`);
    if (!isPlainObject(block)) fail(`${queueName} block must be an object`);
    for (const [name, value] of Object.entries(block)) {
      if (name === "mode") {
        if (!(QUEUE_MODES as readonly string[]).includes(String(value))) {
          fail(`${queueName} mode must be one of ${QUEUE_MODES.join(" | ")}`);
        }
        continue;
      }
      const bounds = (QUEUE_PARAMETER_BOUNDS as Record<string, { min: number; max: number }>)[name];
      if (!bounds) fail(`unknown parameter for ${queueName}: ${name}`);
      if (
        !Number.isSafeInteger(value) ||
        (value as number) < bounds.min ||
        (value as number) > bounds.max
      ) {
        fail(`${queueName} ${name} must be an integer between ${bounds.min} and ${bounds.max}`);
      }
    }
    for (const name of [...Object.keys(QUEUE_PARAMETER_BOUNDS), "mode"]) {
      if (!(name in block)) fail(`${queueName} ${name} is required`);
    }
  }
  // Every field has been checked above; the cast records that the runtime shape
  // now matches the interface rather than re-deriving it structurally.
  return candidate as unknown as QueuePolicyDocument;
}

export interface QueuePolicyPaths {
  readonly stateRoot: string;
  readonly shippedRoot?: string;
}

export function resolveQueuePolicyPaths({ stateRoot, shippedRoot }: QueuePolicyPaths) {
  return {
    stateFilePath: path.join(stateRoot, ...QUEUE_POLICY_STATE_RELATIVE_PATH.split("/")),
    shippedFilePath: shippedRoot
      ? path.join(shippedRoot, ...QUEUE_POLICY_SHIPPED_RELATIVE_PATH.split("/"))
      : null,
  };
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

/**
 * Reads the effective policy. The state-root document wins; the shipped
 * document is the fallback; with neither present the caller gets a named error
 * instead of a guessed default.
 */
export function readQueuePolicy({ stateRoot, shippedRoot }: QueuePolicyPaths): QueuePolicyDocument {
  const { stateFilePath, shippedFilePath } = resolveQueuePolicyPaths({ stateRoot, shippedRoot });
  for (const candidate of [stateFilePath, shippedFilePath]) {
    if (!candidate) continue;
    try {
      return validateQueuePolicy(readJsonFile(candidate));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
  }
  return fail(`no queue policy found (looked for ${stateFilePath})`);
}

export interface ResolvedQueuePolicy extends QueueParameters {
  readonly queue: QueueName;
  readonly killSwitch: boolean;
  readonly policyVersion: number;
}

export function resolveQueuePolicy(
  document: QueuePolicyDocument,
  { queue }: { queue: QueueName },
): ResolvedQueuePolicy {
  validateQueuePolicy(document);
  const parameters = document.queues[queue];
  if (!parameters) fail(`unknown queue: ${queue}`);
  return Object.freeze({
    queue,
    ...parameters,
    killSwitch: document.global.killSwitch,
    policyVersion: document.policyVersion,
  });
}

/** True when the operator engaged the kill switch: no new claims, anywhere. */
export function killSwitchEngaged(document: QueuePolicyDocument): boolean {
  return validateQueuePolicy(document).global.killSwitch;
}
