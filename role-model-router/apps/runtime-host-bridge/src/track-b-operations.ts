import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

type LifecycleRecord = {
  readonly id: string;
  readonly lifecycle: "ready" | "degraded" | "stopped";
  readonly enabled: boolean;
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  readonly health: {
    readonly available: boolean;
    readonly routingDependency: boolean;
    readonly reason?: string;
  };
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
    readonly receipts: readonly unknown[];
    readonly activeJob: unknown;
    readonly currentPlan?: RetentionPlan | null;
  };
};
const EMPTY_STATE: BridgeState = {
  schemaVersion: "role-model.track-b-production-bridge.v1",
  protocolVersion: "1.0",
  revision: 0,
  generatedAt: "1970-01-01T00:00:00.000Z",
  extensions: [],
  storageServices: [],
  retention: { managedPolicy: false, receipts: [], activeJob: null, currentPlan: null },
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
  return value;
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

export function createTrackBOperations({
  statePath,
  catalog,
}: { readonly statePath: string; readonly catalog: readonly Record<string, unknown>[] }) {
  return {
    async listExtensions(): Promise<readonly unknown[]> {
      const state = await readState(statePath);
      const byId = new Map(state.extensions.map((row) => [row.id, row]));
      return catalog.map((entry) => {
        const id = String(entry.id ?? "");
        const actual = byId.get(id);
        return actual
          ? { ...entry, ...actual, installed: true }
          : {
              ...entry,
              installed: false,
              enabled: false,
              lifecycle: "unavailable",
              channel: "production",
              scope: "global",
              authorizationEpoch: 0,
              health: {
                available: false,
                routingDependency: Boolean(entry.routingDependency),
                reason: "not_registered_with_private_supervisor",
              },
            };
      });
    },
    async readStorageRetention(): Promise<unknown> {
      const state = await readState(statePath);
      const categories = state.storageServices.map((row) => ({
        id: row.category,
        tier: row.tier,
        scope: row.scope,
        bytes: row.bytes,
        count: row.count,
        serviceId: row.id,
      }));
      return {
        revision: state.revision,
        totalBytes: categories.reduce((sum, row) => sum + row.bytes, 0),
        categories,
        managedPolicy: state.retention.managedPolicy,
        conflicts: state.storageServices.flatMap((row) =>
          (row.conflicts ?? []).map((reason) => ({ serviceId: row.id, reason })),
        ),
        holds: state.storageServices.reduce((sum, row) => sum + (row.holds ?? 0), 0),
        leases: state.storageServices.reduce((sum, row) => sum + (row.leases ?? 0), 0),
        receipts: state.retention.receipts,
        activeJob: state.retention.activeJob,
        currentPlan: state.retention.currentPlan ?? null,
      };
    },
    async dryRunStorageRetention(): Promise<unknown> {
      const state = await readState(statePath);
      if (state.retention.managedPolicy)
        throw new Error("storage retention is controlled by managed policy");
      const plan = state.retention.currentPlan;
      if (!plan || plan.sourceRevision !== state.revision)
        throw new Error("current hash-bound retention plan required");
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
      const nextRevision = state.revision + 1;
      const next: BridgeState = {
        ...state,
        revision: nextRevision,
        generatedAt: new Date().toISOString(),
        retention: {
          ...state.retention,
          currentPlan: { ...plan, sourceRevision: nextRevision },
          receipts: [...state.retention.receipts, receipt].slice(-100),
        },
      };
      await writeState(statePath, next);
      return this.readStorageRetention();
    },
  };
}
