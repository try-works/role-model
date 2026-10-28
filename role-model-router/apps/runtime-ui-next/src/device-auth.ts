import { Schema } from "effect";

/**
 * S396a (M8): provider device-authorization connect form. Pure schema/state/planning plus the
 * exact HTTP client the original React providers page used
 * (apps/runtime-ui/app/routes/providers.tsx:1091-1106; lib/runtime-api.ts start/poll/list/activate).
 */

export const DeviceAuthSessionSchema = Schema.Struct({
  authRequestId: Schema.String,
  intervalSeconds: Schema.optional(Schema.Number),
  providerAccountId: Schema.String,
  status: Schema.Literals(["pending", "connected", "error"]),
  userCode: Schema.optional(Schema.String),
  verificationUriComplete: Schema.optional(Schema.String),
});
export type DeviceAuthSession = typeof DeviceAuthSessionSchema.Type;
export const DeviceAuthSessionsSchema = Schema.Array(DeviceAuthSessionSchema);

export const DeviceAuthFieldSchema = Schema.Literals([
  "providerId",
  "providerKind",
  "variantId",
  "authMode",
  "region",
  "modelInput",
]);
export type DeviceAuthField = typeof DeviceAuthFieldSchema.Type;

export const DeviceAuthDraftSchema = Schema.Struct({
  authMode: Schema.String,
  modelInput: Schema.String,
  providerId: Schema.String,
  providerKind: Schema.String,
  region: Schema.String,
  selectedModelIds: Schema.Array(Schema.String),
  variantId: Schema.String,
});
export type DeviceAuthDraft = typeof DeviceAuthDraftSchema.Type;

export const DeviceAuthStatusSchema = Schema.Literals([
  "draft",
  "starting",
  "pending",
  "connected",
  "error",
]);

export const DeviceAuthStateSchema = Schema.Struct({
  draft: DeviceAuthDraftSchema,
  error: Schema.optional(Schema.String),
  inflight: Schema.optional(Schema.Boolean),
  session: Schema.optional(DeviceAuthSessionSchema),
  sessions: Schema.optional(Schema.Array(DeviceAuthSessionSchema)),
  status: DeviceAuthStatusSchema,
  token: Schema.Number,
});
export type DeviceAuthState = typeof DeviceAuthStateSchema.Type;

export const initialDeviceAuthState = (): DeviceAuthState => ({
  draft: {
    authMode: "oauth2-device-code",
    modelInput: "",
    providerId: "",
    providerKind: "",
    region: "global",
    selectedModelIds: [],
    variantId: "",
  },
  inflight: false,
  status: "draft",
  token: 0,
});

const slugAccountSegment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "default";

export const defaultProviderAccountId = (providerId: string, variantId: string): string =>
  providerId.trim() + ".personal." + slugAccountSegment(variantId);

export const validateDeviceAuthDraft = (draft: DeviceAuthDraft): readonly string[] => {
  const errors: string[] = [];
  if (draft.providerId.trim().length === 0) errors.push("Select a provider.");
  if (draft.variantId.trim().length === 0) errors.push("Select a provider variant.");
  if (draft.selectedModelIds.length === 0) errors.push("Select at least one model.");
  return errors;
};

export interface DeviceModelRoleBinding {
  readonly disabledRoleIds: readonly string[];
  readonly enabledRoleIds: readonly string[];
  readonly modelId: string;
  readonly roleAssignmentMode: "include" | "all";
  readonly roleIds: readonly string[];
}

export interface DeviceAuthStartPayload {
  readonly allowedModels: readonly string[];
  readonly budgetPolicyRef: string;
  readonly deniedModels: readonly string[];
  readonly entitlementTags: readonly string[];
  readonly modelRoleBindings: readonly DeviceModelRoleBinding[];
  readonly providerAccountId: string;
  readonly providerId: string;
  readonly providerKind: string;
  readonly quotaPolicyRef: string;
  readonly variantId: string;
}

export type DeviceAuthStartPlan =
  | { readonly kind: "invalid"; readonly errors: readonly string[] }
  | { readonly kind: "restore"; readonly session: DeviceAuthSession }
  | { readonly kind: "start"; readonly payload: DeviceAuthStartPayload };

export const deviceAuthStartPlan = (
  state: DeviceAuthState,
  sessions: readonly DeviceAuthSession[],
): DeviceAuthStartPlan => {
  const errors = validateDeviceAuthDraft(state.draft);
  if (errors.length > 0) return { errors, kind: "invalid" };
  const providerAccountId = defaultProviderAccountId(state.draft.providerId, state.draft.variantId);
  const pending = sessions.find(
    (candidate) => candidate.providerAccountId === providerAccountId && candidate.status === "pending",
  );
  if (pending !== undefined) return { kind: "restore", session: pending };
  return {
    kind: "start",
    payload: {
      allowedModels: [...new Set(state.draft.selectedModelIds)],
      budgetPolicyRef: "budget.default",
      deniedModels: [],
      entitlementTags: ["chat"],
      modelRoleBindings: [...new Set(state.draft.selectedModelIds)].map((modelId) => ({
        disabledRoleIds: [],
        enabledRoleIds: [],
        modelId,
        roleAssignmentMode: "include" as const,
        roleIds: [],
      })),
      providerAccountId,
      providerId: state.draft.providerId.trim(),
      providerKind: state.draft.providerKind.trim(),
      quotaPolicyRef: "quota.default",
      variantId: state.draft.variantId.trim(),
    },
  };
};

export interface DeviceActivationPayload {
  readonly modelId: string;
  readonly providerAccountId: string;
  readonly region: string;
}

export const activationPlanForConnectedSession = (input: {
  readonly draft: DeviceAuthDraft;
  readonly session: DeviceAuthSession;
}): readonly DeviceActivationPayload[] => {
  const region = input.draft.region.trim() || "global";
  return [...new Set(input.draft.selectedModelIds)].map((modelId) => ({
    modelId,
    providerAccountId: input.session.providerAccountId,
    region,
  }));
};

export const deviceAuthPollDelayMs = (session: DeviceAuthSession): number =>
  Math.max(1_000, (session.intervalSeconds ?? 5) * 1_000);

interface DeviceAuthFetchOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly token?: string;
}

export interface DeviceAuthClient {
  readonly activate: (payload: DeviceActivationPayload) => Promise<unknown>;
  readonly list: () => Promise<readonly DeviceAuthSession[]>;
  readonly poll: (authRequestId: string) => Promise<DeviceAuthSession>;
  readonly start: (payload: DeviceAuthStartPayload) => Promise<DeviceAuthSession>;
}

const asRecord = (value: unknown): Readonly<Record<string, unknown>> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;

const parseSession = (value: unknown): DeviceAuthSession => {
  const record = asRecord(value) ?? {};
  const nested = asRecord(record.deviceAuthorization) ?? record;
  const status = nested.status;
  return {
    authRequestId: String(nested.authRequestId ?? ""),
    ...(typeof nested.intervalSeconds === "number" ? { intervalSeconds: nested.intervalSeconds } : {}),
    providerAccountId: String(nested.providerAccountId ?? ""),
    status: status === "connected" || status === "error" ? status : "pending",
    ...(typeof nested.userCode === "string" ? { userCode: nested.userCode } : {}),
    ...(typeof nested.verificationUriComplete === "string"
      ? { verificationUriComplete: nested.verificationUriComplete }
      : {}),
  };
};

const parseList = (value: unknown): readonly DeviceAuthSession[] => {
  const record = asRecord(value);
  const list = Array.isArray(value)
    ? value
    : Array.isArray(record?.authorizations)
      ? record.authorizations
      : Array.isArray(record?.deviceAuthorizations)
        ? record.deviceAuthorizations
        : Array.isArray(record?.sessions)
          ? record.sessions
          : [];
  return list.map(parseSession);
};

export const createDeviceAuthClient = (options: DeviceAuthFetchOptions = {}): DeviceAuthClient => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = options.baseUrl ?? "";
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
    ...(options.token === undefined ? {} : { authorization: "Bearer " + options.token }),
  };
  const request = async (path: string, method: "GET" | "POST", body?: unknown): Promise<unknown> => {
    const response = await fetchImpl(base + path, {
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers,
      method,
    });
    const parsed: unknown = await response.json();
    if (!response.ok) {
      const record = asRecord(parsed);
      throw new Error(String(record?.error ?? record?.message ?? "device authorization request failed"));
    }
    return parsed;
  };
  return {
    activate: async (payload) =>
      request("/api/role-model/endpoints", "POST", payload),
    list: async () => parseList(await request("/api/role-model/accounts/device", "GET")),
    poll: async (authRequestId) =>
      parseSession(await request("/api/role-model/accounts/device/poll", "POST", { authRequestId })),
    start: async (payload) =>
      parseSession(await request("/api/role-model/accounts/device/start", "POST", payload)),
  };
};
