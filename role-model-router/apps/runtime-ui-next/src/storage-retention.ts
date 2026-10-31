import { Schema } from "effect";

export const RetentionStateSchema = Schema.Struct({
  maxAgeDays: Schema.String,
  maxSizeGb: Schema.String,
  manifestHash: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
  status: Schema.Literals(["idle", "saving", "saved", "error"]),
  token: Schema.Number,
});
export type RetentionState = typeof RetentionStateSchema.Type;
export const initialRetentionState = (): RetentionState => ({
  maxAgeDays: "30",
  maxSizeGb: "1",
  status: "idle",
  token: 0,
});

export interface RetentionPolicyPayload {
  readonly maxAgeDays: number;
  readonly maxSizeGb: number;
}

export interface StorageRetentionClient {
  readonly dryRun: () => Promise<{ readonly manifestHash?: string }>;
  readonly execute: (manifestHash: string) => Promise<unknown>;
  readonly savePolicy: (payload: RetentionPolicyPayload) => Promise<unknown>;
}

interface StorageRetentionClientOptions {
  readonly fetchImpl?: typeof fetch;
  readonly token?: string;
}

const retentionErrorMessage = (body: unknown): string => {
  if (body !== null && typeof body === "object" && !Array.isArray(body)) {
    const record = body as Readonly<Record<string, unknown>>;
    if (typeof record.error === "string" && record.error.length > 0) return record.error;
    if (typeof record.message === "string" && record.message.length > 0) return record.message;
  }
  return "storage retention request failed";
};

export const createStorageRetentionClient = (
  options: StorageRetentionClientOptions = {},
): StorageRetentionClient => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const request = async (path: string, method: "PUT" | "POST", body?: unknown): Promise<unknown> => {
    const response = await fetchImpl(path, {
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(options.token === undefined ? {} : { authorization: "Bearer " + options.token }),
      },
      method,
    });
    const parsed: unknown = await response.json();
    if (!response.ok) throw new Error(retentionErrorMessage(parsed));
    return parsed;
  };
  const manifestHashOf = (body: unknown): string | undefined => {
    if (body === null || typeof body !== "object" || Array.isArray(body)) return undefined;
    const record = body as Readonly<Record<string, unknown>>;
    if (typeof record.manifestHash === "string") return record.manifestHash;
    const retention = record.retention;
    if (retention !== null && typeof retention === "object" && !Array.isArray(retention)) {
      const plan = (retention as Readonly<Record<string, unknown>>).currentPlan;
      if (plan !== null && typeof plan === "object" && !Array.isArray(plan)) {
        const hash = (plan as Readonly<Record<string, unknown>>).manifestHash;
        if (typeof hash === "string") return hash;
      }
    }
    return undefined;
  };
  return {
    dryRun: async () => {
      const body = await request("/api/role-model/storage-retention/dry-run", "POST", {});
      return { manifestHash: manifestHashOf(body) };
    },
    execute: async (manifestHash) => request("/api/role-model/storage-retention/execute", "POST", { manifestHash }),
    savePolicy: async (payload) =>
      request("/api/role-model/storage-retention/policy", "PUT", {
        maxAgeDays: payload.maxAgeDays,
        maxBytes: Math.max(0, Math.round(payload.maxSizeGb * 1024 * 1024 * 1024)),
        policyId: "ui-managed",
        scope: "all",
      }),
  };
};
