import type {
  NormalizedCatalog,
  NormalizedCatalogModel,
  RequestShapeHints,
} from "@role-model-router/catalog";
import type { ProviderAccountRecord } from "@role-model-router/provider-account";

export type RegistryEndpointKind =
  | "local_engine"
  | "remote_api"
  | "browser_engine"
  | "dispatch_adapter";
export type RegistryProviderKind =
  | "acp"
  | "mcp"
  | "cli"
  | "remote_openai_compat"
  | "onnx"
  | "mlx"
  | "litertlm"
  | "gguf"
  | "webllm"
  | "mediapipe_genai"
  | "mediapipe_text";

export interface EndpointCandidate {
  readonly identity: {
    readonly endpoint_id: string;
    readonly endpoint_kind: RegistryEndpointKind;
    readonly provider_kind: RegistryProviderKind;
    readonly serving_source: string;
    readonly model_id: string;
    readonly package_id?: string;
    readonly variant_id?: string;
    readonly runtime_version: string;
    readonly quantization?: string;
    readonly precision?: string;
    readonly host_class?: string;
    readonly device_class?: string;
    readonly region?: string;
    readonly org_scope?: string;
  };
  readonly declared: {
    readonly endpoint_id: string;
    readonly capabilities: [string, ...string[]];
    readonly modalities: [string, ...string[]];
    readonly max_context_tokens: number;
    readonly tool_calling: {
      readonly supported: boolean;
      readonly style: "openai" | "json" | "none";
    };
    readonly supports_embeddings: boolean;
    readonly platform_constraints?: string[];
  };
  readonly status: string;
  readonly deniedByPolicy?: boolean;
  readonly runtimeEligibility?: RuntimeEligibility;
}

export interface RuntimeEligibility {
  readonly accountDisabled?: boolean;
  readonly authUnavailable?: boolean;
  readonly quotaExhausted?: boolean;
  readonly budgetExceeded?: boolean;
  readonly regionDisallowed?: boolean;
  readonly entitlementMissing?: boolean;
  readonly providerUnavailable?: boolean;
  readonly deploymentClassMismatch?: boolean;
}

export interface CloudRegistrySource {
  readonly endpointId: string;
  readonly providerAccountId: string;
  readonly modelId: string;
  readonly region: string;
  readonly endpointKind: string;
  readonly servingSource: string;
  readonly lifecycleState: EndpointCandidate["status"];
  readonly healthStatus: string;
  readonly requestShapeHints?: RequestShapeHints | null;
}

export interface LocalRegistrySource {
  readonly endpointId: string;
  readonly providerKind: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly localModelSource?: "llama-swap" | "peer-backed";
  readonly capabilities: readonly string[];
  readonly modalities: readonly string[];
  readonly endpointKind: string;
  readonly servingSource: string;
  readonly lifecycleState: EndpointCandidate["status"];
  readonly hostClass: string;
  readonly deviceClass: string;
  readonly region: string;
  readonly orgScope: string;
  readonly contextWindow?: number | null;
  readonly proxyBaseUrl?: string | null;
  readonly checkEndpoint?: string | null;
  readonly useModelName?: string | null;
}

export interface RegistrySources {
  readonly cloud: readonly CloudRegistrySource[];
  readonly local: readonly LocalRegistrySource[];
}

export interface EndpointRegistryDiagnostic {
  readonly endpointId: string;
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
}

export interface EndpointRegistryResult {
  readonly endpoints: readonly EndpointCandidate[];
  readonly diagnostics: readonly EndpointRegistryDiagnostic[];
  readonly lifecycleSummary: {
    readonly active: number;
    readonly degraded: number;
    readonly offline: number;
  };
}

export interface BuildEndpointRegistryInput {
  readonly catalog: NormalizedCatalog;
  readonly accounts: readonly ProviderAccountRecord[];
  readonly sources: RegistrySources;
}

function supportsToolCalling(capabilities: readonly string[]): boolean {
  return capabilities.includes("tools.function_calling");
}

function toNonEmptyList(values: readonly string[], label: string): [string, ...string[]] {
  if (values.length === 0) {
    throw new Error(`${label} must contain at least one value`);
  }
  return [values[0], ...values.slice(1)];
}

function normalizeEndpointKind(value: string): RegistryEndpointKind {
  if (value.startsWith("remote-")) {
    return "remote_api";
  }
  if (value === "cli-agent") {
    return "local_engine";
  }
  return "local_engine";
}

function normalizeProviderKind(value: string): RegistryProviderKind {
  if (value.includes("cli")) {
    return "cli";
  }
  return "remote_openai_compat";
}

function isRegionAllowed(account: ProviderAccountRecord, region: string): boolean {
  switch (account.regionPolicy.mode) {
    case "allow":
      return account.regionPolicy.regions.includes(region);
    case "deny":
      return !account.regionPolicy.regions.includes(region);
    case "prefer":
      return true;
  }
}

function isModelAllowed(account: ProviderAccountRecord, modelId: string): boolean {
  const comparableIds = new Set([modelId, `${account.providerId}/${modelId}`]);
  if (account.deniedModels.some((candidate) => comparableIds.has(candidate))) {
    return false;
  }
  if (account.allowedModels.length === 0) {
    return true;
  }
  return account.allowedModels.some((candidate) => comparableIds.has(candidate));
}

function toRuntimeEligibility(
  account: ProviderAccountRecord,
  source: CloudRegistrySource,
): RuntimeEligibility | undefined {
  const runtimeEligibility: Partial<Record<keyof RuntimeEligibility, boolean>> = {};

  if (account.status === "disabled") {
    runtimeEligibility.accountDisabled = true;
  }
  if (
    account.healthStatus === "credentials-missing" ||
    account.healthStatus === "refresh-failing" ||
    account.healthStatus === "provider-auth-error"
  ) {
    runtimeEligibility.authUnavailable = true;
  }
  if (account.healthStatus === "quota-exhausted") {
    runtimeEligibility.quotaExhausted = true;
  }
  if (account.healthStatus === "budget-exhausted") {
    runtimeEligibility.budgetExceeded = true;
  }
  if (account.healthStatus === "regional-restriction" || !isRegionAllowed(account, source.region)) {
    runtimeEligibility.regionDisallowed = true;
  }
  if (account.healthStatus === "entitlement-missing") {
    runtimeEligibility.entitlementMissing = true;
  }
  if (source.healthStatus === "provider-unavailable" || source.healthStatus === "provider-outage") {
    runtimeEligibility.providerUnavailable = true;
  }

  return Object.keys(runtimeEligibility).length > 0 ? runtimeEligibility : undefined;
}

function createCloudEndpoint(
  model: NormalizedCatalogModel,
  account: ProviderAccountRecord,
  source: CloudRegistrySource,
): EndpointCandidate {
  return {
    identity: {
      endpoint_id: source.endpointId,
      endpoint_kind: normalizeEndpointKind(source.endpointKind),
      provider_kind: normalizeProviderKind(account.providerKind),
      serving_source: source.servingSource,
      model_id: source.modelId,
      package_id: account.providerKind,
      variant_id: account.baseUrlOverride ? "custom-base-url" : "default",
      runtime_version: "run07-registry-v1",
      quantization: "none",
      precision: "fp16",
      host_class: "server",
      device_class: "server",
      region: source.region,
      org_scope: account.orgScope,
    },
    declared: {
      endpoint_id: source.endpointId,
      capabilities: toNonEmptyList(
        model.capabilities,
        `Catalog model ${model.modelId} capabilities`,
      ),
      modalities: toNonEmptyList(model.modalities, `Catalog model ${model.modelId} modalities`),
      max_context_tokens: model.contextWindow,
      tool_calling: {
        supported: supportsToolCalling(model.capabilities),
        style: model.requestShapeHints ? "openai" : "none",
      },
      supports_embeddings: model.capabilities.includes("embeddings.text"),
      platform_constraints: [],
    },
    status: account.status === "revoked" ? "revoked" : source.lifecycleState,
    runtimeEligibility: toRuntimeEligibility(account, source),
  };
}

function createLocalEndpoint(source: LocalRegistrySource): EndpointCandidate {
  return {
    identity: {
      endpoint_id: source.endpointId,
      endpoint_kind: normalizeEndpointKind(source.endpointKind),
      provider_kind: normalizeProviderKind(source.providerKind),
      serving_source: source.servingSource,
      model_id: source.modelId,
      package_id: source.providerKind,
      variant_id: "default",
      runtime_version: "run07-registry-v1",
      quantization: "none",
      precision: "fp16",
      host_class: source.hostClass,
      device_class: source.deviceClass,
      region: source.region,
      org_scope: source.orgScope,
    },
    declared: {
      endpoint_id: source.endpointId,
      capabilities: toNonEmptyList(
        source.capabilities,
        `Endpoint ${source.endpointId} capabilities`,
      ),
      modalities: toNonEmptyList(source.modalities, `Endpoint ${source.endpointId} modalities`),
      max_context_tokens: source.contextWindow ?? 32768,
      tool_calling: {
        supported: supportsToolCalling(source.capabilities),
        style: "openai",
      },
      supports_embeddings: source.capabilities.includes("embeddings.text"),
      platform_constraints: [],
    },
    status: source.lifecycleState,
  };
}

export function buildEndpointRegistry(input: BuildEndpointRegistryInput): EndpointRegistryResult {
  const modelsById = new Map(input.catalog.models.map((model) => [model.modelId, model]));
  const accountsById = new Map(
    input.accounts.map((account) => [account.providerAccountId, account]),
  );
  const diagnostics: EndpointRegistryDiagnostic[] = [];
  const endpoints: EndpointCandidate[] = [];

  for (const source of input.sources.cloud) {
    const account = accountsById.get(source.providerAccountId);
    if (!account) {
      diagnostics.push({
        endpointId: source.endpointId,
        severity: "error",
        code: "PROVIDER_ACCOUNT_NOT_FOUND",
        message: `Provider account ${source.providerAccountId} is not present in the runtime account set.`,
      });
      continue;
    }

    const model = modelsById.get(source.modelId);
    if (!model) {
      diagnostics.push({
        endpointId: source.endpointId,
        severity: "error",
        code: "MODEL_NOT_FOUND",
        message: `Model ${source.modelId} is not present in the normalized catalog.`,
      });
      continue;
    }

    if (!isRegionAllowed(account, source.region)) {
      diagnostics.push({
        endpointId: source.endpointId,
        severity: "error",
        code: "REGION_NOT_ALLOWED",
        message: `Region ${source.region} is not allowed by provider account ${account.providerAccountId}.`,
      });
    }

    if (!isModelAllowed(account, source.modelId)) {
      diagnostics.push({
        endpointId: source.endpointId,
        severity: "error",
        code: "MODEL_NOT_ALLOWED",
        message: `Model ${source.modelId} is not allowed by provider account ${account.providerAccountId}.`,
      });
      continue;
    }

    endpoints.push(createCloudEndpoint(model, account, source));
  }

  for (const source of input.sources.local) {
    endpoints.push(createLocalEndpoint(source));
  }

  const lifecycleSummary = endpoints.reduce(
    (summary, endpoint) => {
      if (endpoint.status === "active") {
        summary.active += 1;
      } else if (endpoint.status === "degraded") {
        summary.degraded += 1;
      } else if (endpoint.status === "offline") {
        summary.offline += 1;
      }
      return summary;
    },
    { active: 0, degraded: 0, offline: 0 },
  );

  return {
    endpoints,
    diagnostics,
    lifecycleSummary,
  };
}
