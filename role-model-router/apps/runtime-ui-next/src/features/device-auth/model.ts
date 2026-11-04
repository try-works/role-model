import { Option, Schema } from "effect";

/**
 * S396a (M8): provider device-authorization connect form. Pure schema/state/planning plus the
 * exact HTTP client the original React providers page used
 * (apps/runtime-ui/app/routes/providers.tsx:1091-1106; lib/runtime-api.ts start/poll/list/activate).
 */

/**
 * S425: the host publishes the lifecycle as "pending" | "connected" | "expired" | "failed" plus an
 * optional retry interval and reason (runtime-host-bridge/src/index.ts:7603-7623). "expired"/"failed"
 * are terminal and must never be reported as pending; lastError/retryAfterSeconds are preserved so the
 * caller can surface the real reason and keep the host's retry interval.
 */
export const DeviceAuthSessionSchema = Schema.Struct({
  authRequestId: Schema.String,
  intervalSeconds: Schema.optional(Schema.Number),
  lastError: Schema.optional(Schema.String),
  providerAccountId: Schema.String,
  retryAfterSeconds: Schema.optional(Schema.Number),
  status: Schema.Literals(["pending", "connected", "expired", "failed"]),
  userCode: Schema.optional(Schema.String),
  verificationUri: Schema.optional(Schema.String),
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

/**
 * A host retry hint must be finite and positive; a zero/negative/NaN hint would otherwise poll on a
 * busy loop, so it is ignored and the readback interval/default applies.
 */
const positiveSeconds = (value: number | null | undefined): number | undefined =>
  value !== null && value !== undefined && Number.isFinite(value) && value > 0 ? value : undefined;

/**
 * S425: a poll result carries retryAfterSeconds (runtime-host-bridge/src/index.ts:3275-3280) while a
 * readback entry carries intervalSeconds, so the host's real retry interval wins over the default.
 */
export const deviceAuthPollDelayMs = (session: DeviceAuthSession): number => {
  const seconds = positiveSeconds(session.retryAfterSeconds) ?? positiveSeconds(session.intervalSeconds) ?? 5;
  return Math.max(1_000, Math.round(seconds * 1_000));
};

/**
 * S432: a real pending poll answer carries only status/retryAfterSeconds/lastError — the operator's
 * challenge (userCode + verification URL) came from start/readback. Keep the challenge only when the
 * poll belongs to the SAME authorization and is still pending; a foreign authorization or a terminal
 * answer keeps the poll's own fields so no stale challenge/metadata is resurrected. Parser optionals
 * are explicit `undefined`, so the challenge is preserved with nullish coalescing, not a raw spread.
 */
export const mergeDeviceAuthPoll = (
  current: DeviceAuthSession | undefined,
  polled: DeviceAuthSession,
): DeviceAuthSession => {
  if (
    current === undefined ||
    current.authRequestId !== polled.authRequestId ||
    polled.status !== "pending"
  ) {
    return polled;
  }
  return {
    ...polled,
    intervalSeconds: polled.intervalSeconds ?? current.intervalSeconds,
    userCode: polled.userCode ?? current.userCode,
    verificationUri: polled.verificationUri ?? current.verificationUri,
    verificationUriComplete: polled.verificationUriComplete ?? current.verificationUriComplete,
  };
};

const SAFE_VERIFICATION_PROTOCOLS = new Set(["https:"]);
const SAFE_VERIFICATION_URL_MAX_LENGTH = 2_048;

/**
 * S425: a provider-supplied verification URL is linked only when it parses as an https URL.
 * javascript:/data:/file: and oversized values are refused instead of rendered as a link.
 */
export const deviceAuthVerificationUrl = (session: DeviceAuthSession): string | undefined => {
  const candidate = session.verificationUriComplete ?? session.verificationUri;
  if (
    candidate === undefined ||
    candidate.length === 0 ||
    candidate.length > SAFE_VERIFICATION_URL_MAX_LENGTH
  ) {
    return undefined;
  }
  try {
    const url = new URL(candidate);
    return SAFE_VERIFICATION_PROTOCOLS.has(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

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

/**
 * S425: the host session fields are an external boundary, so they are decoded once through a Schema
 * (excess host keys are ignored; null/missing optional fields stay optional) instead of ad-hoc
 * runtime typeof narrowing. The session domain type keeps only the fields the UI consumes.
 */
const HostDeviceAuthFieldsSchema = Schema.Struct({
  authRequestId: Schema.optional(Schema.NullOr(Schema.String)),
  intervalSeconds: Schema.optional(Schema.NullOr(Schema.Number)),
  lastError: Schema.optional(Schema.NullOr(Schema.String)),
  providerAccountId: Schema.optional(Schema.NullOr(Schema.String)),
  retryAfterSeconds: Schema.optional(Schema.NullOr(Schema.Number)),
  status: Schema.optional(Schema.NullOr(Schema.String)),
  userCode: Schema.optional(Schema.NullOr(Schema.String)),
  verificationUri: Schema.optional(Schema.NullOr(Schema.String)),
  verificationUriComplete: Schema.optional(Schema.NullOr(Schema.String)),
});
type HostDeviceAuthFields = typeof HostDeviceAuthFieldsSchema.Type;

const parseStatus = (value: string | null | undefined): DeviceAuthSession["status"] => {
  if (value === "connected" || value === "pending" || value === "expired") return value;
  // S425: "failed" — and any missing/unrecognized status — is terminal, never pending.
  return "failed";
};

const parseSession = (value: unknown): DeviceAuthSession => {
  const record = asRecord(value) ?? {};
  const candidate = asRecord(record.deviceAuthorization) ?? record;
  const decoded = Schema.decodeOption(HostDeviceAuthFieldsSchema)(candidate);
  const fields: Partial<HostDeviceAuthFields> = Option.isNone(decoded) ? {} : decoded.value;
  return {
    authRequestId: fields.authRequestId ?? "",
    intervalSeconds: positiveSeconds(fields.intervalSeconds),
    lastError: fields.lastError ?? undefined,
    providerAccountId: fields.providerAccountId ?? "",
    retryAfterSeconds: positiveSeconds(fields.retryAfterSeconds),
    status: parseStatus(fields.status),
    userCode: fields.userCode ?? undefined,
    verificationUri: fields.verificationUri ?? undefined,
    verificationUriComplete: fields.verificationUriComplete ?? undefined,
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
