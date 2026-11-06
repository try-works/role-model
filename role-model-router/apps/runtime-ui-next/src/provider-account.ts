import { Schema } from "effect";

/**
 * S396b (M8): provider account create/update-key/delete-model form.
 * Create payload mirrors apps/runtime-ui/app/routes/providers.tsx:988-1023 (buildProviderPayload);
 * update-key body mirrors the host updateProviderApiKey contract (providerAccountId + apiKey,
 * POST /accounts/repair/update-key, index.ts:19921+32363-32369); model removal mirrors the host
 * DELETE /accounts/{providerAccountId}/models/{modelId} route (index.ts:19844-19873).
 */

export const ProviderAccountFieldSchema = Schema.Literals([
  "apiKey",
  "authMode",
  "baseUrlOverride",
  "credentialRef",
  "modelInput",
  "oauthConnected",
  "providerAccountId",
  "providerId",
  "providerKind",
  "roleIdsInput",
  "variantId",
]);
export type ProviderAccountField = typeof ProviderAccountFieldSchema.Type;

export const ProviderAccountDraftSchema = Schema.Struct({
  apiKey: Schema.String,
  authMode: Schema.String,
  baseUrlOverride: Schema.String,
  credentialRef: Schema.String,
  existingHealthStatus: Schema.String,
  existingRotationState: Schema.String,
  existingStatus: Schema.String,
  oauthConnected: Schema.String,
  roleIdsInput: Schema.String,
  modelInput: Schema.String,
  providerAccountId: Schema.String,
  providerId: Schema.String,
  providerKind: Schema.String,
  selectedModelIds: Schema.Array(Schema.String),
  variantId: Schema.String,
});
export type ProviderAccountDraft = typeof ProviderAccountDraftSchema.Type;

export const ProviderAccountStateSchema = Schema.Struct({
  draft: ProviderAccountDraftSchema,
  error: Schema.optional(Schema.String),
  pendingAction: Schema.optional(Schema.Literals(["create", "delete-model", "update-key"])),
  notice: Schema.optional(Schema.String),
  status: Schema.Literals(["draft", "saving", "saved", "error"]),
  token: Schema.Number,
});
export type ProviderAccountState = typeof ProviderAccountStateSchema.Type;

export const initialProviderAccountState = (): ProviderAccountState => ({
  draft: {
    apiKey: "",
    authMode: "api-key-static",
    baseUrlOverride: "",
    credentialRef: "",
    existingHealthStatus: "",
    existingRotationState: "",
    existingStatus: "",
    oauthConnected: "false",
    roleIdsInput: "",
    modelInput: "",
    providerAccountId: "",
    providerId: "",
    providerKind: "",
    selectedModelIds: [],
    variantId: "",
  },
  status: "draft",
  token: 0,
});

export const providerAccountBusy = (state: ProviderAccountState): boolean =>
  state.status === "saving" || state.pendingAction !== undefined;

export const validateProviderAccountDraft = (state: ProviderAccountState): readonly string[] => {
  const errors: string[] = [];
  if (state.draft.providerId.trim().length === 0) errors.push("Select a provider.");
  if (state.draft.providerAccountId.trim().length === 0)
    errors.push("Enter a provider account id.");
  if (state.draft.authMode.startsWith("api-key") && state.draft.apiKey.trim().length === 0) {
    errors.push("Enter an API key.");
  }
  return errors;
};

export const modelRoleBindingsForModels = (modelIds: readonly string[], roleIdsInput: string) => {
  const roleIds = [
    ...new Set(
      roleIdsInput
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));
  return [...new Set(modelIds)].map((modelId) => ({
    disabledRoleIds: [] as string[],
    enabledRoleIds: [...roleIds],
    modelId,
    roleAssignmentMode: "include" as const,
    roleIds: [...roleIds],
  }));
};

export interface ProviderAccountCreatePayload {
  readonly accountScope: string;
  readonly allowedModels: readonly string[];
  readonly authMode: string;
  readonly baseUrlOverride: string;
  readonly budgetPolicyRef: string;
  readonly credentialRef: { readonly backend: "env" | "local-file"; readonly ref: string };
  readonly deniedModels: readonly string[];
  readonly entitlementTags: readonly string[];
  readonly healthStatus: string;
  readonly modelRoleBindings: ReturnType<typeof modelRoleBindingsForModels>;
  readonly orgScope: string;
  readonly providerAccountId: string;
  readonly providerId: string;
  readonly providerKind: string;
  readonly quotaPolicyRef: string;
  readonly regionPolicy: { readonly mode: "prefer"; readonly regions: readonly string[] };
  readonly rotationState: string;
  readonly status: string;
}

export const createProviderAccountPayload = (
  state: ProviderAccountState,
): ProviderAccountCreatePayload => {
  const draft = state.draft;
  const providerAccountId = draft.providerAccountId.trim();
  const apiKeyMode = draft.authMode === "api-key-static";
  const preserveExisting = draft.existingStatus.trim().length > 0;
  const keepExistingActive =
    draft.existingStatus === "active" && draft.existingHealthStatus === "healthy";
  const lifecycle = keepExistingActive
    ? {
        healthStatus: "healthy",
        rotationState: draft.existingRotationState || "stable",
        status: "active",
      }
    : apiKeyMode
      ? preserveExisting &&
        draft.existingStatus === "disabled" &&
        draft.existingHealthStatus === "credentials-missing"
        ? {
            healthStatus: draft.existingHealthStatus,
            rotationState: draft.existingRotationState || "not-required",
            status: draft.existingStatus,
          }
        : { healthStatus: "healthy", rotationState: "stable", status: "active" }
      : draft.oauthConnected === "true"
        ? { healthStatus: "healthy", rotationState: "stable", status: "active" }
        : preserveExisting &&
            draft.existingStatus === "active" &&
            draft.existingHealthStatus === "healthy"
          ? {
              healthStatus: draft.existingHealthStatus,
              rotationState: draft.existingRotationState || "stable",
              status: draft.existingStatus,
            }
          : {
              healthStatus: "credentials-missing",
              rotationState: "in-progress",
              status: "disabled",
            };
  const chosenModels =
    draft.selectedModelIds.length > 0
      ? draft.selectedModelIds
      : draft.modelInput.trim().length > 0
        ? [draft.modelInput.trim()]
        : [];
  return {
    accountScope: "workspace-default",
    allowedModels: [...new Set(chosenModels)],
    authMode: draft.authMode,
    baseUrlOverride: draft.baseUrlOverride.trim(),
    budgetPolicyRef: "budget.default",
    credentialRef: apiKeyMode
      ? { backend: "env", ref: draft.credentialRef }
      : {
          backend: "local-file",
          ref: `oauth/${draft.providerId.trim()}/${providerAccountId}`,
        },
    deniedModels: [],
    entitlementTags: ["chat"],
    ...lifecycle,
    modelRoleBindings: modelRoleBindingsForModels(draft.selectedModelIds, draft.roleIdsInput),
    orgScope: "personal",
    providerAccountId,
    providerId: draft.providerId.trim(),
    providerKind: draft.providerKind.trim(),
    quotaPolicyRef: "quota.default",
    regionPolicy: { mode: "prefer", regions: ["global"] },
  };
};

export const updateProviderKeyPayload = (
  draft: ProviderAccountDraft,
): { readonly apiKey: string; readonly providerAccountId: string } => ({
  apiKey: draft.apiKey,
  providerAccountId: draft.providerAccountId.trim(),
});

export interface ProviderAccountActivationBatch {
  readonly activationBatchId: string;
  readonly activations: ReadonlyArray<{
    readonly providerAccountId: string;
    readonly modelId: string;
    readonly region: string;
    readonly reasoningEffort?: string;
  }>;
}

export interface ProviderAccountClient {
  readonly activate: (payload: ProviderAccountActivationBatch) => Promise<unknown>;
  readonly create: (payload: ProviderAccountCreatePayload) => Promise<unknown>;
  readonly deleteModel: (providerAccountId: string, modelId: string) => Promise<unknown>;
  readonly updateKey: (payload: {
    readonly apiKey: string;
    readonly providerAccountId: string;
  }) => Promise<unknown>;
}

interface ProviderAccountClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly token?: string;
}

export const createProviderAccountClient = (
  options: ProviderAccountClientOptions = {},
): ProviderAccountClient => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = options.baseUrl ?? "";
  const request = async (
    path: string,
    method: "DELETE" | "POST",
    body?: unknown,
  ): Promise<unknown> => {
    const response = await fetchImpl(base + path, {
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(options.token === undefined ? {} : { authorization: `Bearer ${options.token}` }),
      },
      method,
    });
    const parsed: unknown = await response.json();
    if (!response.ok) {
      const record =
        parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Readonly<Record<string, unknown>>)
          : undefined;
      throw new Error(
        String(record?.error ?? record?.message ?? "provider account request failed"),
      );
    }
    return parsed;
  };
  return {
    activate: async (payload) => request("/api/role-model/endpoints/batch", "POST", payload),
    create: async (payload) => request("/api/role-model/accounts", "POST", payload),
    deleteModel: async (providerAccountId, modelId) =>
      request(
        `/api/role-model/accounts/${encodeURIComponent(providerAccountId)}/models/${encodeURIComponent(modelId)}`,
        "DELETE",
      ),
    updateKey: async (payload) =>
      request("/api/role-model/accounts/repair/update-key", "POST", payload),
  };
};
