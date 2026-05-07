import type { NormalizedCatalog } from "@role-model-router/catalog";

export const SUPPORTED_AUTH_MODES = [
  "api-key-static",
  "api-key-rotating-ref",
  "oauth2-client-credentials",
  "oauth2-device-code",
  "oauth2-user-grant",
  "azure-entra-client-credentials",
  "google-service-account",
  "google-workload-identity",
  "aws-sigv4",
  "brokered-session-exchange",
] as const;

const API_KEY_AUTH_MODES = new Set<AuthMode>(["api-key-static", "api-key-rotating-ref"]);
const CREDENTIAL_REFERENCE_BACKENDS = ["env", "local-keychain", "local-encrypted-file", "cloud-secret"] as const;
const ACCOUNT_STATUSES = ["active", "disabled", "revoked"] as const;
const HEALTH_STATUSES = [
  "healthy",
  "credentials-missing",
  "refresh-failing",
  "provider-auth-error",
  "quota-exhausted",
  "budget-exhausted",
  "regional-restriction",
  "entitlement-missing",
] as const;
const ROTATION_STATES = ["not-required", "stable", "due", "in-progress", "failed"] as const;
const REGION_POLICY_MODES = ["allow", "prefer", "deny"] as const;

export type AuthMode = (typeof SUPPORTED_AUTH_MODES)[number];
export type CredentialReferenceBackend = (typeof CREDENTIAL_REFERENCE_BACKENDS)[number];
export type ProviderAccountStatus = (typeof ACCOUNT_STATUSES)[number];
export type ProviderAccountHealthStatus = (typeof HEALTH_STATUSES)[number];
export type ProviderAccountRotationState = (typeof ROTATION_STATES)[number];
export type RegionPolicyMode = (typeof REGION_POLICY_MODES)[number];

export interface CredentialReference {
  readonly backend: CredentialReferenceBackend;
  readonly ref: string;
}

export interface RegionPolicy {
  readonly mode: RegionPolicyMode;
  readonly regions: readonly string[];
}

export interface ProviderAccountModelRoleBinding {
  readonly modelId: string;
  readonly roleIds: readonly string[];
}

export interface ProviderAccountRecord {
  readonly providerAccountId: string;
  readonly providerId: string;
  readonly providerKind: string;
  readonly orgScope: string;
  readonly accountScope: string;
  readonly credentialRef: CredentialReference;
  readonly authMode: AuthMode;
  readonly regionPolicy: RegionPolicy;
  readonly baseUrlOverride: string | null;
  readonly allowedModels: readonly string[];
  readonly modelRoleBindings?: readonly ProviderAccountModelRoleBinding[];
  readonly deniedModels: readonly string[];
  readonly entitlementTags: readonly string[];
  readonly budgetPolicyRef: string;
  readonly quotaPolicyRef: string;
  readonly status: ProviderAccountStatus;
  readonly healthStatus: ProviderAccountHealthStatus;
  readonly rotationState: ProviderAccountRotationState;
}

export interface ProviderAccountDiagnostic {
  readonly providerAccountId: string;
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
}

export interface ProviderAccountValidationInput {
  readonly catalog: NormalizedCatalog;
  readonly accounts: readonly unknown[];
  readonly allowedRoleIds?: readonly string[];
}

export interface ProviderAccountValidationResult {
  readonly accounts: readonly ProviderAccountRecord[];
  readonly diagnostics: readonly ProviderAccountDiagnostic[];
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label}.${key} must be a non-empty string`);
  }
  return value;
}

function readStringArray(record: Record<string, unknown>, key: string, label: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label}.${key} must be an array of strings`);
  }
  return [...value];
}

function readNullableString(record: Record<string, unknown>, key: string, label: string): string | null {
  const value = record[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${label}.${key} must be a string or null`);
  }
  return value;
}

function readModelRoleBindings(record: Record<string, unknown>, label: string): ProviderAccountModelRoleBinding[] {
  const value = record.modelRoleBindings;
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`${label}.modelRoleBindings must be an array`);
  }

  return value.map((entry, index) => {
    const binding = asRecord(entry, `${label}.modelRoleBindings[${index}]`);
    const roleIds = readStringArray(binding, "roleIds", `${label}.modelRoleBindings[${index}]`);
    return {
      modelId: readString(binding, "modelId", `${label}.modelRoleBindings[${index}]`),
      roleIds,
    };
  });
}

function assertEnumValue<TValue extends string>(
  value: string,
  allowedValues: readonly TValue[],
  label: string,
): TValue {
  if (!allowedValues.includes(value as TValue)) {
    throw new Error(`${label} must be one of: ${allowedValues.join(", ")}`);
  }
  return value as TValue;
}

function parseCredentialReference(value: unknown, label: string): CredentialReference {
  const record = asRecord(value, `${label}.credentialRef`);
  const backend = assertEnumValue(
    readString(record, "backend", `${label}.credentialRef`),
    CREDENTIAL_REFERENCE_BACKENDS,
    `${label}.credentialRef.backend`,
  );
  return {
    backend,
    ref: readString(record, "ref", `${label}.credentialRef`),
  };
}

function parseRegionPolicy(value: unknown, label: string): RegionPolicy {
  const record = asRecord(value, `${label}.regionPolicy`);
  const mode = assertEnumValue(
    readString(record, "mode", `${label}.regionPolicy`),
    REGION_POLICY_MODES,
    `${label}.regionPolicy.mode`,
  );

  return {
    mode,
    regions: readStringArray(record, "regions", `${label}.regionPolicy`),
  };
}

function parseProviderAccount(value: unknown, index: number): ProviderAccountRecord {
  const record = asRecord(value, `accounts[${index}]`);
  const authMode = assertEnumValue(
    readString(record, "authMode", `accounts[${index}]`),
    SUPPORTED_AUTH_MODES,
    `accounts[${index}].authMode`,
  );

  return {
    providerAccountId: readString(record, "providerAccountId", `accounts[${index}]`),
    providerId: readString(record, "providerId", `accounts[${index}]`),
    providerKind: readString(record, "providerKind", `accounts[${index}]`),
    orgScope: readString(record, "orgScope", `accounts[${index}]`),
    accountScope: readString(record, "accountScope", `accounts[${index}]`),
    credentialRef: parseCredentialReference(record.credentialRef, `accounts[${index}]`),
    authMode,
    regionPolicy: parseRegionPolicy(record.regionPolicy, `accounts[${index}]`),
    baseUrlOverride: readNullableString(record, "baseUrlOverride", `accounts[${index}]`),
    allowedModels: readStringArray(record, "allowedModels", `accounts[${index}]`),
    modelRoleBindings: readModelRoleBindings(record, `accounts[${index}]`),
    deniedModels: readStringArray(record, "deniedModels", `accounts[${index}]`),
    entitlementTags: readStringArray(record, "entitlementTags", `accounts[${index}]`),
    budgetPolicyRef: readString(record, "budgetPolicyRef", `accounts[${index}]`),
    quotaPolicyRef: readString(record, "quotaPolicyRef", `accounts[${index}]`),
    status: assertEnumValue(
      readString(record, "status", `accounts[${index}]`),
      ACCOUNT_STATUSES,
      `accounts[${index}].status`,
    ),
    healthStatus: assertEnumValue(
      readString(record, "healthStatus", `accounts[${index}]`),
      HEALTH_STATUSES,
      `accounts[${index}].healthStatus`,
    ),
    rotationState: assertEnumValue(
      readString(record, "rotationState", `accounts[${index}]`),
      ROTATION_STATES,
      `accounts[${index}].rotationState`,
    ),
  };
}

function hasOverlap(left: readonly string[], right: readonly string[]): boolean {
  const rightValues = new Set(right);
  return left.some((value) => rightValues.has(value));
}

function isAuthModeCompatible(
  provider: NormalizedCatalog["providers"][number],
  authMode: AuthMode,
): boolean {
  if ((provider.supportedAuthModes?.length ?? 0) > 0) {
    return provider.supportedAuthModes.includes(authMode);
  }

  if (provider.authFamily === "api-key") {
    return API_KEY_AUTH_MODES.has(authMode);
  }

  return true;
}

export function validateProviderAccounts(
  input: ProviderAccountValidationInput,
): ProviderAccountValidationResult {
  const providersById = new Map(input.catalog.providers.map((provider) => [provider.providerId, provider]));
  const diagnostics: ProviderAccountDiagnostic[] = [];
  const accounts: ProviderAccountRecord[] = [];

  input.accounts.forEach((accountValue, index) => {
    const account = parseProviderAccount(accountValue, index);
    const provider = providersById.get(account.providerId);

    if (!provider) {
      diagnostics.push({
        providerAccountId: account.providerAccountId,
        severity: "error",
        code: "PROVIDER_NOT_FOUND",
        message: `Provider ${account.providerId} is not present in the normalized catalog.`,
      });
      return;
    }

    if (provider.providerKind !== account.providerKind) {
      diagnostics.push({
        providerAccountId: account.providerAccountId,
        severity: "error",
        code: "PROVIDER_KIND_MISMATCH",
        message: `Provider kind ${account.providerKind} does not match catalog provider kind ${provider.providerKind}.`,
      });
      return;
    }

    if (!isAuthModeCompatible(provider, account.authMode)) {
      diagnostics.push({
        providerAccountId: account.providerAccountId,
        severity: "error",
        code: "AUTH_MODE_INCOMPATIBLE",
        message: `Auth mode ${account.authMode} is incompatible with catalog auth family ${provider.authFamily}.`,
      });
      return;
    }

    if (hasOverlap(account.allowedModels, account.deniedModels)) {
      diagnostics.push({
        providerAccountId: account.providerAccountId,
        severity: "error",
        code: "MODEL_POLICY_OVERLAP",
        message: "Allowed and denied model lists must not overlap.",
      });
      return;
    }

    const allowedModelSet = new Set(account.allowedModels);
    const modelRoleBindings = account.modelRoleBindings ?? [];
    const seenModelRoleBindings = new Set<string>();
    const allowedRoleIds = input.allowedRoleIds ? new Set(input.allowedRoleIds) : null;

    for (const binding of modelRoleBindings) {
      if (!allowedModelSet.has(binding.modelId)) {
        diagnostics.push({
          providerAccountId: account.providerAccountId,
          severity: "error",
          code: "MODEL_ROLE_MODEL_NOT_ALLOWED",
          message: `Model role binding ${binding.modelId} is not present in the account allowed model list.`,
        });
        return;
      }

      if (seenModelRoleBindings.has(binding.modelId)) {
        diagnostics.push({
          providerAccountId: account.providerAccountId,
          severity: "error",
          code: "MODEL_ROLE_MODEL_DUPLICATE",
          message: `Model role bindings must not repeat the same model id (${binding.modelId}).`,
        });
        return;
      }
      seenModelRoleBindings.add(binding.modelId);

      if (binding.roleIds.length === 0) {
        diagnostics.push({
          providerAccountId: account.providerAccountId,
          severity: "error",
          code: "MODEL_ROLE_EMPTY",
          message: `Model role binding ${binding.modelId} must include at least one role id.`,
        });
        return;
      }

      if (new Set(binding.roleIds).size !== binding.roleIds.length) {
        diagnostics.push({
          providerAccountId: account.providerAccountId,
          severity: "error",
          code: "MODEL_ROLE_DUPLICATE",
          message: `Model role binding ${binding.modelId} must not repeat role ids.`,
        });
        return;
      }

      if (allowedRoleIds && binding.roleIds.some((roleId) => !allowedRoleIds.has(roleId))) {
        diagnostics.push({
          providerAccountId: account.providerAccountId,
          severity: "error",
          code: "MODEL_ROLE_UNKNOWN",
          message: `Model role binding ${binding.modelId} includes a role id that is not available in the runtime role catalog.`,
        });
        return;
      }
    }

    accounts.push(account);
  });

  return {
    accounts,
    diagnostics,
  };
}
