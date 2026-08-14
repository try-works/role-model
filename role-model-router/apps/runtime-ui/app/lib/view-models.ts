import type {
  RuntimeAccount,
  RuntimeActivityLogEntry,
  RuntimeControllerAssignment,
  RuntimeCredentialLifecycleProviderRollup,
  RuntimeDeviceAuthorization,
  RuntimeDownstreamOpenAIProviderConfig,
  RuntimeEndpoint,
  RuntimeModelAlias,
  RuntimeModelRecord,
  RuntimeProvider,
  RuntimeRequestListItem,
  RuntimeSummary,
  RuntimeTelemetryComparisonRow,
  RuntimeTelemetryRequestRecord,
  RuntimeTelemetrySummary,
} from "./runtime-api";

function toTitleLabel(modelId: string): string {
  const raw = modelId.includes("/") ? (modelId.split("/").at(-1) ?? modelId) : modelId;
  return raw
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part.toLowerCase() === "gpt") {
        return "GPT";
      }
      if (/^k\d/i.test(part)) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function uniqueStrings(values: readonly (string | null | undefined)[]): string[] {
  return [
    ...new Set(
      values.filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  ];
}

function sortLexical(left: string, right: string): number {
  return left.localeCompare(right, "en");
}

function formatTokenCount(value: number | null | undefined): string {
  return typeof value === "number" && value > 0
    ? `${value.toLocaleString("en-US")} tokens`
    : "Unknown";
}

function formatPricingValue(value: RuntimeModelRecord["pricing"]): string {
  if (!value) {
    return "Unknown";
  }
  return `$${value.inputPer1M} / 1M input • $${value.outputPer1M} / 1M output`;
}

function formatEffectiveCurrency(value: number): string {
  return `${formatCurrency(value, "estimate").replace(" est.", "")} effective`;
}

export function buildProviderCards(
  providers: readonly RuntimeProvider[],
  accounts: readonly RuntimeAccount[],
): Array<{
  providerId: string;
  title: string;
  accountCount: number;
  variants: Array<{
    variantId: string;
    label: string;
    authMode: string;
    availability: string;
  }>;
}> {
  return providers.map((provider) => ({
    providerId: provider.providerId,
    title: provider.displayName,
    accountCount: accounts.filter((account) => account.providerId === provider.providerId).length,
    variants: (provider.variants ?? []).map((variant) => ({
      variantId: variant.variantId,
      label: variant.label,
      authMode: variant.authMode,
      availability: variant.availability,
    })),
  }));
}

export function summarizeRuntimeStats(
  summary: Pick<RuntimeSummary, "providerCount" | "accountCount" | "endpointCount">,
): Array<{ label: string; value: string }> {
  return [
    { label: "Providers", value: String(summary.providerCount) },
    { label: "Accounts", value: String(summary.accountCount) },
    { label: "Endpoints", value: String(summary.endpointCount) },
  ];
}

export function buildCredentialReadinessRows(
  summary: Pick<RuntimeSummary, "readinessSummary" | "credentialLifecycle">,
): Array<{
  key:
    | "pending-device-authorization"
    | "env-unresolved"
    | "credentials-missing"
    | "expired-auth"
    | "connected-without-endpoint"
    | "ready";
  label: string;
  value: number;
  tone: "warning" | "success" | "neutral";
}> {
  const counts = summary.credentialLifecycle?.counts
    ? {
        pendingAuthorization: summary.credentialLifecycle.counts.pendingAuthorization,
        envUnresolved: summary.credentialLifecycle.counts.envUnresolved,
        credentialsMissing: summary.credentialLifecycle.counts.credentialsMissing,
        expiredAuth: summary.credentialLifecycle.counts.expiredAuth,
        connectedNoEndpoint: summary.credentialLifecycle.counts.connectedNoEndpoint,
        executionReady: summary.credentialLifecycle.counts.executionReady,
      }
    : summary.readinessSummary
      ? {
          pendingAuthorization: summary.readinessSummary.pendingDeviceAuthorizationCount,
          envUnresolved: 0,
          credentialsMissing: summary.readinessSummary.credentialsMissingAccountCount,
          expiredAuth: 0,
          connectedNoEndpoint: summary.readinessSummary.connectedWithoutEndpointCount,
          executionReady: summary.readinessSummary.readyAccountCount,
        }
      : null;
  if (!counts) {
    return [];
  }

  const rows: Array<{
    key:
      | "pending-device-authorization"
      | "env-unresolved"
      | "credentials-missing"
      | "expired-auth"
      | "connected-without-endpoint"
      | "ready";
    label: string;
    value: number;
    tone: "warning" | "success" | "neutral";
  }> = [];

  if (counts.pendingAuthorization > 0) {
    rows.push({
      key: "pending-device-authorization",
      label: "Pending OAuth",
      value: counts.pendingAuthorization,
      tone: "warning",
    });
  }
  if (counts.envUnresolved > 0) {
    rows.push({
      key: "env-unresolved",
      label: "Env unresolved",
      value: counts.envUnresolved,
      tone: "warning",
    });
  }
  if (counts.credentialsMissing > 0) {
    rows.push({
      key: "credentials-missing",
      label: "Credentials missing",
      value: counts.credentialsMissing,
      tone: "warning",
    });
  }
  if (counts.expiredAuth > 0) {
    rows.push({
      key: "expired-auth",
      label: "Reconnect required",
      value: counts.expiredAuth,
      tone: "warning",
    });
  }
  if (counts.connectedNoEndpoint > 0) {
    rows.push({
      key: "connected-without-endpoint",
      label: "Connected, no endpoint",
      value: counts.connectedNoEndpoint,
      tone: "warning",
    });
  }

  rows.push({
    key: "ready",
    label: "Execution-ready",
    value: counts.executionReady,
    tone: counts.executionReady > 0 ? "success" : "neutral",
  });

  return rows;
}

const LIFECYCLE_STATE_LABELS: Record<string, string> = {
  "execution-ready": "Execution-ready",
  "connected-no-endpoint": "Connected, no endpoint",
  "pending-authorization": "Pending OAuth",
  "expired-auth": "Reconnect required",
  "credentials-missing": "Credentials missing",
  "env-unresolved": "Env unresolved",
  "archived-stale": "Archived stale",
};

const LIFECYCLE_REASON_LABELS: Record<string, string> = {
  "active-endpoint-present": "Active endpoint is available",
  "active-without-endpoint": "Credential is usable but no endpoint is active",
  "pending-device-authorization": "Device authorization is still pending",
  "oauth-refresh-failed": "Stored OAuth token failed refresh",
  "credential-material-missing": "Credential material is missing",
  "env-var-missing": "Referenced environment variable is missing",
};

const LIFECYCLE_ACTION_LABELS: Record<string, string> = {
  reconnect: "Reconnect",
  "update-api-key": "Update API key",
  "activate-endpoint": "Activate endpoint",
  "set-env": "Set env",
};

function lifecycleStateLabel(lifecycleState: string): string {
  return LIFECYCLE_STATE_LABELS[lifecycleState] ?? lifecycleState;
}

function lifecycleReasonLabel(reasonCode: string): string {
  return LIFECYCLE_REASON_LABELS[reasonCode] ?? reasonCode;
}

function lifecycleTone(
  lifecycleState: string,
  blocking: boolean,
): "success" | "warning" | "neutral" {
  if (lifecycleState === "execution-ready") {
    return "success";
  }
  return blocking ? "warning" : "neutral";
}

function lifecycleActionsLabel(actions: readonly string[]): string {
  return actions.length > 0
    ? actions.map((action) => LIFECYCLE_ACTION_LABELS[action] ?? action).join(" • ")
    : "None";
}

function buildCredentialStoragePosture(input: {
  readonly authMode?: string;
  readonly credentialRef?: RuntimeAccount["credentialRef"];
  readonly credentialStorageMode?: string;
  readonly credentialBackendCanonical?: string;
}): {
  label: string;
  detail: string;
} {
  switch (input.credentialStorageMode) {
    case "persisted-local":
      return {
        label: "Persisted local credential",
        detail: `Canonical backend: ${input.credentialBackendCanonical ?? "local-file"}`,
      };
    case "oauth-local":
      return {
        label: "Runtime-managed OAuth token",
        detail: `Canonical backend: ${input.credentialBackendCanonical ?? "local-file"}`,
      };
    case "env-ref":
      return {
        label: "Environment reference",
        detail: input.credentialRef?.ref
          ? `Variable: ${input.credentialRef.ref}`
          : "Variable required",
      };
    default:
      if (input.authMode === "oauth2-device-code") {
        return {
          label: "Runtime-managed OAuth token",
          detail: `Canonical backend: ${input.credentialBackendCanonical ?? "local-file"}`,
        };
      }
      if (input.credentialRef?.backend === "env") {
        return {
          label: "Environment reference",
          detail: input.credentialRef.ref
            ? `Variable: ${input.credentialRef.ref}`
            : "Variable required",
        };
      }
      return {
        label: "Persisted local credential",
        detail: `Canonical backend: ${input.credentialBackendCanonical ?? "local-file"}`,
      };
  }
}

export function buildCredentialLifecycleBanner(
  summary: Pick<RuntimeSummary, "readinessSummary" | "credentialLifecycle">,
): {
  authorityLabel: string;
  authorityTone: "success" | "warning" | "neutral" | "accent";
  detail: string;
  archivedStaleCount: number;
  blockingRows: Array<{
    key:
      | "pending-device-authorization"
      | "env-unresolved"
      | "credentials-missing"
      | "expired-auth"
      | "connected-without-endpoint";
    label: string;
    value: number;
    tone: "warning";
  }>;
} | null {
  const readinessRows = buildCredentialReadinessRows(summary).filter(
    (
      row,
    ): row is typeof row & {
      key:
        | "pending-device-authorization"
        | "env-unresolved"
        | "credentials-missing"
        | "expired-auth"
        | "connected-without-endpoint";
      tone: "warning";
    } => row.key !== "ready" && row.value > 0,
  );
  const lifecycle = summary.credentialLifecycle;
  if (!lifecycle) {
    if (!summary.readinessSummary) {
      return null;
    }
    return {
      authorityLabel: "compatibility",
      authorityTone: "neutral",
      detail:
        "Blocking counts are coming from the legacy readiness alias until the canonical lifecycle payload is available.",
      archivedStaleCount: 0,
      blockingRows: readinessRows,
    };
  }

  if (lifecycle.authority.state === "provisional") {
    return {
      authorityLabel: "provisional",
      authorityTone: "accent",
      detail: "Bootstrap is still reconciling credentials, activations, and archived stale state.",
      archivedStaleCount: lifecycle.counts.archivedStale,
      blockingRows: readinessRows,
    };
  }

  return {
    authorityLabel: "authoritative",
    authorityTone: readinessRows.length > 0 ? "warning" : "success",
    detail:
      readinessRows.length > 0
        ? "Canonical lifecycle data is authoritative; remaining blockers are ready for repair."
        : "Canonical lifecycle data is authoritative and no credential blockers remain.",
    archivedStaleCount: lifecycle.counts.archivedStale,
    blockingRows: readinessRows,
  };
}

export function buildCredentialLifecycleAccountRows(
  summary: Pick<RuntimeSummary, "credentialLifecycle">,
): Array<{
  key: string;
  providerAccountId: string;
  providerId: string;
  lifecycleState: string;
  lifecycleLabel: string;
  reasonLabel: string;
  blocking: boolean;
  tone: "success" | "warning" | "neutral";
  availableActionsLabel: string;
  activeEndpointCount: number;
}> {
  const accounts = [...(summary.credentialLifecycle?.accounts ?? [])];
  return accounts
    .sort((left, right) => {
      if (left.blocking !== right.blocking) {
        return left.blocking ? -1 : 1;
      }
      return sortLexical(left.providerAccountId, right.providerAccountId);
    })
    .map((account) => ({
      key: account.providerAccountId,
      providerAccountId: account.providerAccountId,
      providerId: account.providerId,
      lifecycleState: account.lifecycleState,
      lifecycleLabel: lifecycleStateLabel(account.lifecycleState),
      reasonLabel: lifecycleReasonLabel(account.reasonCode),
      blocking: account.blocking,
      tone: lifecycleTone(account.lifecycleState, account.blocking),
      availableActionsLabel: lifecycleActionsLabel(account.availableActions),
      activeEndpointCount: account.activeEndpointIds.length,
    }));
}

export function buildProviderMaintenanceRows(input: {
  readonly accounts: readonly RuntimeAccount[];
  readonly summary: Pick<RuntimeSummary, "credentialLifecycle">;
}): Array<{
  key: string;
  account: RuntimeAccount | null;
  providerAccountId: string;
  providerId: string;
  authMode: string;
  lifecycleLabel: string;
  lifecycleTone: "success" | "warning" | "neutral";
  reasonLabel: string;
  storageLabel: string;
  storageDetail: string;
  sourceProvenanceLabel: string;
  availableActions: readonly string[];
  availableActionsLabel: string;
  activeEndpointCount: number;
  baseUrlOverride: string | null;
  allowedModels: readonly string[];
  modelRoleBindings: NonNullable<RuntimeAccount["modelRoleBindings"]>;
}> {
  const lifecycleAccounts = input.summary.credentialLifecycle?.accounts ?? [];
  const lifecycleAccountsById = new Map(
    lifecycleAccounts.map((account) => [account.providerAccountId, account]),
  );
  const accountsById = new Map(
    input.accounts.map((account) => [account.providerAccountId, account]),
  );
  const allAccountIds = uniqueStrings([
    ...lifecycleAccounts.map((account) => account.providerAccountId),
    ...input.accounts.map((account) => account.providerAccountId),
  ]);

  return allAccountIds
    .sort((left, right) => {
      const leftLifecycle = lifecycleAccountsById.get(left);
      const rightLifecycle = lifecycleAccountsById.get(right);
      if ((leftLifecycle?.blocking ?? false) !== (rightLifecycle?.blocking ?? false)) {
        return leftLifecycle?.blocking ? -1 : 1;
      }
      return sortLexical(left, right);
    })
    .map((providerAccountId) => {
      const lifecycleAccount = lifecycleAccountsById.get(providerAccountId);
      const account = accountsById.get(providerAccountId) ?? null;
      const authMode = lifecycleAccount?.authMode ?? account?.authMode ?? "unknown";
      const storagePosture = buildCredentialStoragePosture({
        authMode,
        credentialRef: account?.credentialRef,
        credentialStorageMode: lifecycleAccount?.credentialStorageMode,
        credentialBackendCanonical: lifecycleAccount?.credentialBackendCanonical,
      });
      const availableActions =
        lifecycleAccount?.availableActions ??
        (authMode === "oauth2-device-code"
          ? ["reconnect"]
          : authMode === "api-key-static"
            ? ["update-api-key"]
            : []);

      return {
        key: providerAccountId,
        account,
        providerAccountId,
        providerId: lifecycleAccount?.providerId ?? account?.providerId ?? "unknown-provider",
        authMode,
        lifecycleLabel: lifecycleAccount
          ? lifecycleStateLabel(lifecycleAccount.lifecycleState)
          : account?.healthStatus === "healthy"
            ? "Execution-ready"
            : "Legacy account snapshot",
        lifecycleTone: lifecycleAccount
          ? lifecycleTone(lifecycleAccount.lifecycleState, lifecycleAccount.blocking)
          : account?.healthStatus === "healthy"
            ? "success"
            : "warning",
        reasonLabel: lifecycleAccount
          ? lifecycleReasonLabel(lifecycleAccount.reasonCode)
          : (account?.healthStatus ?? account?.status ?? "Lifecycle details unavailable"),
        storageLabel: storagePosture.label,
        storageDetail: storagePosture.detail,
        sourceProvenanceLabel:
          lifecycleAccount?.sourceProvenance.length && lifecycleAccount.sourceProvenance.length > 0
            ? [...lifecycleAccount.sourceProvenance].sort(sortLexical).join(" • ")
            : "legacy account snapshot",
        availableActions,
        availableActionsLabel: lifecycleActionsLabel(availableActions),
        activeEndpointCount: lifecycleAccount?.activeEndpointIds.length ?? 0,
        baseUrlOverride: account?.baseUrlOverride ?? null,
        allowedModels: account?.allowedModels ?? lifecycleAccount?.configuredModelIds ?? [],
        modelRoleBindings: account?.modelRoleBindings ?? [],
      };
    });
}

export function buildConfiguredRemoteConnectionRows(input: {
  readonly accounts: readonly RuntimeAccount[];
  readonly endpoints: readonly RuntimeEndpoint[];
  readonly models: readonly RuntimeModelRecord[];
}): Array<{
  key: string;
  account: RuntimeAccount | null;
  providerAccountId: string;
  providerId: string;
  authMode: string;
  baseUrlOverride: string | null;
  endpointCount: number;
  endpoints: Array<{
    endpointId: string;
    modelId: string;
    displayName: string;
    healthStatus: string;
    routingEligible: boolean;
    benchmarkEligible: boolean;
    roleIds: readonly string[];
  }>;
}> {
  const accountsById = new Map(
    input.accounts.map((account) => [account.providerAccountId, account] as const),
  );
  const modelDisplayNameById = new Map(
    input.models.map((model) => [model.id, model.displayName ?? toTitleLabel(model.id)] as const),
  );
  const remoteEndpoints = input.endpoints.filter(
    (endpoint) =>
      endpoint.sourceType === "remote" &&
      typeof endpoint.providerAccountId === "string" &&
      endpoint.providerAccountId.length > 0 &&
      endpoint.status !== "inactive",
  );
  const providerAccountIds = uniqueStrings(
    remoteEndpoints.map((endpoint) => endpoint.providerAccountId),
  ).sort(sortLexical);

  return providerAccountIds.map((providerAccountId) => {
    const account = accountsById.get(providerAccountId) ?? null;
    const endpoints = remoteEndpoints
      .filter((endpoint) => endpoint.providerAccountId === providerAccountId)
      .sort(
        (left, right) =>
          sortLexical(left.modelId, right.modelId) ||
          sortLexical(left.endpointId, right.endpointId),
      )
      .map((endpoint) => ({
        endpointId: endpoint.endpointId,
        modelId: endpoint.modelId,
        displayName: modelDisplayNameById.get(endpoint.modelId) ?? toTitleLabel(endpoint.modelId),
        healthStatus: resolveEndpointReadinessStatus(endpoint),
        routingEligible: endpoint.routingEligible !== false,
        benchmarkEligible: endpoint.benchmarkEligible !== false,
        roleIds: endpoint.roleIds ?? [],
      }));

    return {
      key: providerAccountId,
      account,
      providerAccountId,
      providerId: account?.providerId ?? endpoints[0]?.modelId.split("/")[0] ?? "unknown-provider",
      authMode: account?.authMode ?? "unknown",
      baseUrlOverride: account?.baseUrlOverride ?? null,
      endpointCount: endpoints.length,
      endpoints,
    };
  });
}

export function buildArchivedArtifactRows(
  summary: Pick<RuntimeSummary, "credentialLifecycle">,
): Array<{
  key: string;
  providerAccountId: string;
  providerId: string;
  label: string;
  detail: string;
}> {
  return [...(summary.credentialLifecycle?.archivedArtifacts ?? [])]
    .sort((left, right) => {
      const accountCompare = sortLexical(
        left.providerAccountId ?? "",
        right.providerAccountId ?? "",
      );
      if (accountCompare !== 0) {
        return accountCompare;
      }
      return sortLexical(left.artifactId, right.artifactId);
    })
    .map((artifact) => ({
      key: artifact.artifactId,
      providerAccountId: artifact.providerAccountId ?? "unknown-account",
      providerId: artifact.providerId ?? "unknown-provider",
      label:
        artifact.reasonCode === "expired-pending-authorization"
          ? "Expired pending authorization archived"
          : "Archived stale artifact",
      detail: `${artifact.artifactType} • ${artifact.reasonCode}`,
    }));
}

const BOOTSTRAP_STAGE_LABELS: Record<string, string> = {
  credentials: "Credentials",
  endpoints: "Endpoints",
  peers: "Peers",
  vendors: "Vendors",
  "local-reload": "Local reload",
  "remote-health": "Remote health",
  inventory: "Inventory",
};

function bootstrapStageTone(status: string): "success" | "warning" | "neutral" | "accent" {
  switch (status) {
    case "ready":
      return "success";
    case "degraded":
    case "failed":
      return "warning";
    case "running":
      return "accent";
    default:
      return "neutral";
  }
}

export function buildSessionBootstrapRows(
  summary: Pick<RuntimeSummary, "sessionBootstrap">,
): Array<{
  stageId: string;
  label: string;
  status: string;
  message: string | null;
  tone: "success" | "warning" | "neutral" | "accent";
}> {
  const bootstrap = summary.sessionBootstrap;
  if (!bootstrap) {
    return [];
  }

  return bootstrap.stages.map((stage) => ({
    stageId: stage.stageId,
    label: BOOTSTRAP_STAGE_LABELS[stage.stageId] ?? stage.stageId,
    status: stage.status,
    message: stage.message ?? null,
    tone: bootstrapStageTone(stage.status),
  }));
}

export function summarizeSessionBootstrapStatus(
  summary: Pick<RuntimeSummary, "sessionBootstrap">,
): { label: string; tone: "success" | "warning" | "neutral" | "accent" } | null {
  const status = summary.sessionBootstrap?.status;
  if (!status) {
    return null;
  }

  switch (status) {
    case "ready":
      return { label: "complete", tone: "success" };
    case "running":
      return { label: "running", tone: "accent" };
    case "degraded":
      return { label: "degraded", tone: "warning" };
    case "blocked":
      return { label: "blocked", tone: "warning" };
    default:
      return { label: "pending", tone: "neutral" };
  }
}

export function buildInventorySummaryStats(
  summary: Pick<RuntimeSummary, "inventorySummary">,
): Array<{ label: string; value: string }> {
  const inventory = summary.inventorySummary;
  if (!inventory) {
    return [];
  }

  return [
    { label: "Endpoints", value: String(inventory.endpointIdCount) },
    { label: "Models", value: String(inventory.modelIdCount) },
    {
      label: "Empty aliases",
      value: String(inventory.emptyAliasIds.length),
    },
  ];
}

export function buildAliasDriftRows(summary: Pick<RuntimeSummary, "aliasDrift">): Array<{
  aliasId: string;
  hintModelId: string;
  suggestedModelIds: readonly string[];
  message: string;
}> {
  return [...(summary.aliasDrift ?? [])];
}

export function buildOperatorIntentSummary(summary: Pick<RuntimeSummary, "operatorIntent">): {
  label: string;
  detail: string;
  tone: "success" | "warning" | "neutral";
} | null {
  const operatorIntent = summary.operatorIntent;
  if (!operatorIntent) {
    return null;
  }

  if (operatorIntent.status === "corrupt") {
    return {
      label: "Corrupt operator-intent manifest",
      detail: operatorIntent.message ?? "operator-intent.json failed validation.",
      tone: "warning",
    };
  }

  if (operatorIntent.status === "missing") {
    return {
      label: "Operator-intent manifest",
      detail: "No operator-intent.json persisted yet for this scope.",
      tone: "neutral",
    };
  }

  return {
    label: "Operator-intent manifest",
    detail: "operator-intent.json is readable and schema-valid.",
    tone: "success",
  };
}

function formatCurrency(value: number | null | undefined, mode: "actual" | "estimate"): string {
  if (typeof value !== "number" || value <= 0) {
    return mode === "actual" ? "$0.0000 actual" : "$0.0000 est.";
  }
  return `$${value.toFixed(4)} ${mode === "actual" ? "actual" : "est."}`;
}

function formatSourceLabel(sourceType: "local" | "remote"): string {
  return sourceType === "local" ? "Local" : "Remote";
}

function formatCountLabel(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function summarizeCachePosture(input: {
  readonly promptCacheSupported?: boolean;
  readonly promptCacheRequested?: boolean;
  readonly promptCacheUsed?: boolean;
  readonly cachedRequestCount?: number;
}): string {
  if (!input.promptCacheSupported) {
    return "Caching unavailable";
  }
  if (typeof input.cachedRequestCount === "number") {
    return input.cachedRequestCount > 0
      ? `Cache hit on ${formatCountLabel(input.cachedRequestCount, "request")}`
      : "Cache ready, no hits";
  }
  if (input.promptCacheUsed) {
    return "Cache hit";
  }
  if (input.promptCacheRequested) {
    return "Cache miss";
  }
  return "Cache ready";
}

function summarizeStreamLabel(
  row: Pick<
    RuntimeTelemetryRequestRecord,
    | "streamTextDeltaCount"
    | "streamTextSupported"
    | "streamToolCallDeltaCount"
    | "streamToolCallSupported"
    | "streamToolArgumentDeltaCount"
    | "streamToolArgumentSupported"
  >,
): string {
  const parts: string[] = [];
  if (row.streamTextSupported && (row.streamTextDeltaCount ?? 0) > 0) {
    parts.push(
      `${row.streamTextDeltaCount} text${row.streamTextDeltaCount === 1 ? " delta" : " deltas"}`,
    );
  }
  if (row.streamToolCallSupported && (row.streamToolCallDeltaCount ?? 0) > 0) {
    parts.push(`${row.streamToolCallDeltaCount} tool`);
  }
  if (row.streamToolArgumentSupported && (row.streamToolArgumentDeltaCount ?? 0) > 0) {
    parts.push(`${row.streamToolArgumentDeltaCount} args`);
  }
  if (parts.length > 0) {
    return parts.join(" / ");
  }
  if (row.streamTextSupported || row.streamToolCallSupported || row.streamToolArgumentSupported) {
    return "No stream deltas";
  }
  return "Streaming unavailable";
}

function readFailureMessageFromDimensions(
  dimensions: Record<string, unknown> | null | undefined,
): string | null {
  if (!dimensions || typeof dimensions !== "object") {
    return null;
  }
  const errorContext = dimensions.errorContext;
  if (!errorContext || typeof errorContext !== "object") {
    return null;
  }
  const message = (errorContext as Record<string, unknown>).message;
  return typeof message === "string" && message.trim().length > 0 ? message.trim() : null;
}

function humanizeTelemetryErrorClass(errorClass: string | null | undefined): string {
  if (typeof errorClass !== "string" || errorClass.trim().length === 0) {
    return "ok";
  }
  const normalized = errorClass.replace(/[_-]+/g, " ").trim();
  return normalized.length > 0 ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "ok";
}

function buildTelemetryStatusLabel(
  row: Pick<RuntimeTelemetryRequestRecord, "statusCode" | "errorClass" | "dimensions">,
): string {
  if (!row.errorClass) {
    return `${row.statusCode ?? 0} ok`;
  }
  return `${row.statusCode ?? 0} ${readFailureMessageFromDimensions(row.dimensions) ?? humanizeTelemetryErrorClass(row.errorClass)}`;
}

export function summarizeTelemetryStats(
  summary: RuntimeTelemetrySummary,
): Array<{ label: string; value: string; detail: string }> {
  return [
    {
      label: "Requests",
      value: String(summary.requestCount),
      detail: `${summary.sourceBreakdown.local.requestCount} local · ${summary.sourceBreakdown.remote.requestCount} remote`,
    },
    {
      label: "Failures",
      value: String(summary.failureCount),
      detail: `${summary.successCount} successful requests`,
    },
    {
      label: "Latency",
      value: summary.averageLatencyMs !== null ? `${summary.averageLatencyMs} ms avg` : "n/a",
      detail:
        summary.p95LatencyMs !== null && summary.averageLatencyMs !== null
          ? `${summary.p95LatencyMs} ms p95 · ${summary.averageLatencyMs} ms avg`
          : summary.p95LatencyMs !== null
            ? `${summary.p95LatencyMs} ms p95 — average not available`
            : summary.averageLatencyMs !== null
              ? `${summary.averageLatencyMs} ms avg — p95 not available`
              : "Latency data not available yet",
    },
    {
      label: "Tokens",
      value: String(summary.totalTokens),
      detail: `${summary.cachedRequestCount} cached · ${formatEffectiveCurrency(summary.totalEffectiveCostUsd)}`,
    },
  ];
}

export function buildTelemetryComparisonCards(
  rows: readonly RuntimeTelemetryComparisonRow[],
): Array<{
  endpointId: string;
  modelId: string | null;
  sourceLabel: string;
  providerLabel: string;
  cacheLabel: string;
  reliabilityLabel: string;
  requestCountLabel: string;
  latencyLabel: string;
  tokenLabel: string;
  costLabel: string;
  roleSummary: string;
  statusLabel: string;
}> {
  return rows.map((row) => ({
    endpointId: row.endpointId,
    modelId: row.modelId,
    sourceLabel: formatSourceLabel(row.sourceType),
    providerLabel: row.providerId ?? row.providerFamily ?? row.providerKind ?? "unknown provider",
    cacheLabel: summarizeCachePosture({
      promptCacheSupported: row.promptCacheSupported,
      cachedRequestCount: row.cachedRequestCount,
    }),
    reliabilityLabel: `${row.failureCount} failures / ${row.successCount} success${row.successCount === 1 ? "" : "es"}`,
    requestCountLabel: `${row.requestCount} request${row.requestCount === 1 ? "" : "s"}`,
    latencyLabel: `${row.p95LatencyMs ?? 0} ms p95 / ${row.averageLatencyMs ?? 0} ms avg`,
    tokenLabel: `${row.totalTokens} tokens`,
    costLabel:
      row.totalActualCostUsd > 0
        ? formatCurrency(row.totalActualCostUsd, "actual")
        : formatCurrency(row.totalEstimatedCostUsd, "estimate"),
    roleSummary: row.roleIds && row.roleIds.length > 0 ? row.roleIds.join(", ") : "No roles bound",
    statusLabel: row.healthStatus ?? row.status ?? "unknown",
  }));
}

export function buildTelemetryRequestRows(
  rows: ReadonlyArray<
    Pick<
      RuntimeTelemetryRequestRecord,
      | "requestId"
      | "clientRequestId"
      | "routingDecisionId"
      | "endpointId"
      | "modelId"
      | "sourceType"
      | "createdAtMs"
      | "latencyMs"
      | "totalTokens"
      | "actualCostUsd"
      | "estimatedCostUsd"
      | "errorClass"
      | "statusCode"
      | "dimensions"
      | "providerFamily"
      | "providerKind"
      | "providerId"
      | "finishReason"
      | "promptCacheSupported"
      | "promptCacheRequested"
      | "promptCacheUsed"
      | "streamTextDeltaCount"
      | "streamTextSupported"
      | "streamToolCallDeltaCount"
      | "streamToolCallSupported"
      | "streamToolArgumentDeltaCount"
      | "streamToolArgumentSupported"
    >
  >,
): Array<{
  requestId: string;
  clientRequestId: string | null;
  routingDecisionLabel: string;
  endpointId: string;
  modelId: string | null | undefined;
  sourceLabel: string;
  statusLabel: string;
  providerFamilyLabel: string;
  finishReasonLabel: string;
  cacheLabel: string;
  streamLabel: string;
  latencyLabel: string;
  tokenLabel: string;
  costLabel: string;
  createdAtLabel: string;
}> {
  return [...rows]
    .sort((left, right) => right.createdAtMs - left.createdAtMs)
    .map((row) => ({
      requestId: row.requestId,
      clientRequestId: row.clientRequestId ?? null,
      routingDecisionLabel: row.routingDecisionId ?? "n/a",
      endpointId: row.endpointId,
      modelId: row.modelId,
      sourceLabel: formatSourceLabel(row.sourceType),
      statusLabel: buildTelemetryStatusLabel(row),
      providerFamilyLabel:
        row.providerId ?? row.providerFamily ?? row.providerKind ?? "unknown provider",
      finishReasonLabel: row.finishReason ?? "unknown",
      cacheLabel: summarizeCachePosture({
        promptCacheSupported: row.promptCacheSupported,
        promptCacheRequested: row.promptCacheRequested,
        promptCacheUsed: row.promptCacheUsed,
      }),
      streamLabel: summarizeStreamLabel(row),
      latencyLabel:
        row.latencyMs !== null && row.latencyMs !== undefined ? `${row.latencyMs} ms` : "n/a",
      tokenLabel: `${row.totalTokens ?? 0} tokens`,
      costLabel:
        typeof row.actualCostUsd === "number" && row.actualCostUsd > 0
          ? formatCurrency(row.actualCostUsd, "actual")
          : formatCurrency(row.estimatedCostUsd, "estimate"),
      createdAtLabel: new Date(row.createdAtMs).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
}

export function buildDashboardLatestRequestRows(
  rows: ReadonlyArray<
    Pick<
      RuntimeTelemetryRequestRecord,
      | "requestId"
      | "clientRequestId"
      | "routingDecisionId"
      | "endpointId"
      | "requestClass"
      | "modelId"
      | "sourceType"
      | "createdAtMs"
      | "latencyMs"
      | "totalTokens"
      | "actualCostUsd"
      | "estimatedCostUsd"
      | "errorClass"
      | "statusCode"
      | "dimensions"
      | "providerFamily"
      | "providerKind"
      | "providerId"
      | "finishReason"
      | "promptCacheSupported"
      | "promptCacheRequested"
      | "promptCacheUsed"
      | "streamTextDeltaCount"
      | "streamTextSupported"
      | "streamToolCallDeltaCount"
      | "streamToolCallSupported"
      | "streamToolArgumentDeltaCount"
      | "streamToolArgumentSupported"
    >
  >,
  limit = 3,
): Array<
  ReturnType<typeof buildTelemetryRequestRows>[number] & {
    primaryLabel: string;
    secondaryLabel: string | null;
    endpointLabel: string;
    interactionCount: number;
  }
> {
  const liveRows = rows.filter((row) => row.requestClass !== "benchmark");
  const selectedRows = liveRows.length > 0 ? liveRows : rows;
  const sortedRows = [...selectedRows].sort((left, right) => right.createdAtMs - left.createdAtMs);
  const rowsByInteraction = new Map<string, typeof sortedRows>();

  for (const row of sortedRows) {
    const interactionKey =
      typeof row.clientRequestId === "string" && row.clientRequestId.length > 0
        ? row.clientRequestId
        : row.requestId;
    const currentRows = rowsByInteraction.get(interactionKey) ?? [];
    currentRows.push(row);
    rowsByInteraction.set(interactionKey, currentRows);
  }

  return [...rowsByInteraction.values()].slice(0, limit).map((interactionRows) => {
    const latestRow = interactionRows[0];
    if (!latestRow) {
      throw new Error("Expected at least one telemetry row per grouped interaction.");
    }
    const renderedRow = buildTelemetryRequestRows([latestRow])[0];
    if (!renderedRow) {
      throw new Error("Expected a rendered telemetry row for the latest interaction row.");
    }
    const endpointIds = uniqueStrings(interactionRows.map((row) => row.endpointId));
    const primaryLabel =
      typeof latestRow.clientRequestId === "string" && latestRow.clientRequestId.length > 0
        ? latestRow.clientRequestId
        : latestRow.requestId;
    const secondaryLabel =
      interactionRows.length > 1
        ? `${interactionRows.length} routed executions`
        : latestRow.clientRequestId && latestRow.clientRequestId !== latestRow.requestId
          ? latestRow.requestId
          : null;

    return {
      ...renderedRow,
      primaryLabel,
      secondaryLabel,
      endpointLabel:
        endpointIds.length === 1 && endpointIds[0] !== undefined
          ? endpointIds[0]
          : `${endpointIds.length} endpoints`,
      interactionCount: interactionRows.length,
    };
  });
}

export function buildWorkbenchModelOptions(
  models: ReadonlyArray<
    Pick<RuntimeModelRecord, "id"> & Partial<Pick<RuntimeModelRecord, "endpoint_ids">>
  >,
): Array<{ label: string; value: string }> {
  return [...new Set(models.map((model) => model.id))]
    .sort((left, right) => left.localeCompare(right))
    .map((modelId) => ({
      label: toTitleLabel(modelId),
      value: modelId,
    }));
}

export function buildWorkbenchEndpointOptions(input: {
  readonly modelId: string;
  readonly models: ReadonlyArray<
    Pick<RuntimeModelRecord, "id"> & Partial<Pick<RuntimeModelRecord, "endpoint_ids">>
  >;
  readonly endpoints: ReadonlyArray<
    Pick<
      RuntimeEndpoint,
      | "endpointId"
      | "modelId"
      | "providerId"
      | "providerAccountId"
      | "status"
      | "healthStatus"
      | "sourceType"
    >
  >;
  readonly accounts: ReadonlyArray<
    Pick<RuntimeAccount, "providerAccountId" | "providerId"> &
      Partial<Pick<RuntimeAccount, "credentialRef">>
  >;
}): Array<{ label: string; value: string }> {
  const model = input.models.find((entry) => entry.id === input.modelId);
  const fallbackEndpointIds = input.endpoints
    .filter((endpoint) => endpoint.modelId === input.modelId)
    .map((endpoint) => endpoint.endpointId);
  const endpointIds = uniqueStrings(
    model?.endpoint_ids?.length ? model.endpoint_ids : fallbackEndpointIds,
  );
  const endpointsById = new Map(input.endpoints.map((endpoint) => [endpoint.endpointId, endpoint]));
  const accountsById = new Map(
    input.accounts.map((account) => [account.providerAccountId, account]),
  );
  const toCredentialPriority = (endpointId: string): number => {
    const accountId = endpointsById.get(endpointId)?.providerAccountId;
    const backend = accountId ? accountsById.get(accountId)?.credentialRef?.backend : undefined;
    if (backend === "local-file" || backend === "local-encrypted-file") {
      return 0;
    }
    if (backend === "env") {
      return 1;
    }
    return 2;
  };
  const toHealthPriority = (endpointId: string): number => {
    const endpoint = endpointsById.get(endpointId);
    if (endpoint?.healthStatus === "healthy") {
      return 0;
    }
    if (endpoint?.status === "active") {
      return 1;
    }
    return 2;
  };

  return endpointIds
    .sort((left, right) => {
      const credentialPriority = toCredentialPriority(left) - toCredentialPriority(right);
      if (credentialPriority !== 0) {
        return credentialPriority;
      }
      const healthPriority = toHealthPriority(left) - toHealthPriority(right);
      if (healthPriority !== 0) {
        return healthPriority;
      }
      return sortLexical(left, right);
    })
    .map((endpointId) => ({
      label: endpointId,
      value: endpointId,
    }));
}

export function buildModelCatalogRows(
  models: ReadonlyArray<
    Pick<RuntimeModelRecord, "id"> & Partial<Pick<RuntimeModelRecord, "endpoint_ids">>
  >,
): Array<{
  modelId: string;
  displayName: string;
  endpointCount: number;
  endpointIds: string[];
}> {
  return models
    .map((model) => {
      const endpointIds = uniqueStrings(model.endpoint_ids ?? []).sort(sortLexical);
      return {
        modelId: model.id,
        displayName: toTitleLabel(model.id),
        endpointCount: endpointIds.length,
        endpointIds,
      };
    })
    .sort((left, right) => sortLexical(left.modelId, right.modelId));
}

export function buildEndpointCatalogRows(endpoints: readonly RuntimeEndpoint[]): Array<{
  endpointId: string;
  modelId: string;
  providerLabel: string;
  sourceLabel: string;
  servingSource: string;
  endpointKind: string;
  status: string;
  healthStatus: string;
}> {
  return [...endpoints]
    .map((endpoint) => ({
      endpointId: endpoint.endpointId,
      modelId: endpoint.modelId,
      providerLabel:
        endpoint.providerId ??
        (endpoint.localModelSource === "llama-swap"
          ? "llama-swap"
          : endpoint.localModelSource === "peer-backed"
            ? "local-openai-compatible"
            : "local/runtime"),
      sourceLabel: formatSourceLabel(
        endpoint.sourceType ??
          (endpoint.servingSource?.toLowerCase().includes("local") ? "local" : "remote"),
      ),
      servingSource: endpoint.servingSource ?? "unknown",
      endpointKind: endpoint.endpointKind ?? "unknown",
      status: endpoint.status ?? "unknown",
      healthStatus: endpoint.healthStatus ?? "unknown",
    }))
    .sort((left, right) => sortLexical(left.endpointId, right.endpointId));
}

export function countActiveEndpointModels(endpoints: readonly RuntimeEndpoint[]): {
  readonly localModelCount: number;
  readonly remoteModelCount: number;
  readonly localEndpointCount: number;
  readonly remoteEndpointCount: number;
} {
  const localModelIds = new Set<string>();
  const remoteModelIds = new Set<string>();
  let localEndpointCount = 0;
  let remoteEndpointCount = 0;

  for (const endpoint of endpoints) {
    if (endpoint.status && endpoint.status !== "active") {
      continue;
    }
    if (endpoint.sourceType === "local") {
      localEndpointCount += 1;
      localModelIds.add(endpoint.modelId);
      continue;
    }
    if (endpoint.sourceType === "remote") {
      remoteEndpointCount += 1;
      remoteModelIds.add(endpoint.modelId);
    }
  }

  return {
    localModelCount: localModelIds.size,
    remoteModelCount: remoteModelIds.size,
    localEndpointCount,
    remoteEndpointCount,
  };
}

export function buildAliasReadinessRows(
  aliases: readonly RuntimeModelAlias[],
  endpoints: readonly RuntimeEndpoint[],
): Array<{
  aliasId: string;
  modeLabel: string;
  modelIds: string[];
  endpointCount: number;
  localEndpointCount: number;
  remoteEndpointCount: number;
  activeEndpointCount: number;
  healthyEndpointCount: number;
  readinessLabel: "ready" | "degraded" | "unavailable";
  sourceSummary: string;
}> {
  return [...aliases]
    .map((alias) => {
      const modelIds = uniqueStrings(alias.modelIds).sort(sortLexical);
      const matchingEndpoints = endpoints.filter((endpoint) => modelIds.includes(endpoint.modelId));
      const localEndpointCount = matchingEndpoints.filter(
        (endpoint) => endpoint.sourceType === "local",
      ).length;
      const remoteEndpointCount = matchingEndpoints.filter(
        (endpoint) => endpoint.sourceType === "remote",
      ).length;
      const activeEndpointCount = matchingEndpoints.filter(
        (endpoint) => endpoint.status === "active",
      ).length;
      const healthyEndpointCount = matchingEndpoints.filter(
        (endpoint) => endpoint.healthStatus === "healthy",
      ).length;

      const readinessLabel: "ready" | "degraded" | "unavailable" =
        matchingEndpoints.length === 0 || activeEndpointCount === 0
          ? "unavailable"
          : activeEndpointCount === matchingEndpoints.length &&
              healthyEndpointCount === matchingEndpoints.length
            ? "ready"
            : "degraded";

      return {
        aliasId: alias.aliasId,
        modeLabel: alias.mode ?? "basic",
        modelIds,
        endpointCount: matchingEndpoints.length,
        localEndpointCount,
        remoteEndpointCount,
        activeEndpointCount,
        healthyEndpointCount,
        readinessLabel,
        sourceSummary: `${localEndpointCount} local / ${remoteEndpointCount} remote`,
      };
    })
    .sort((left, right) => sortLexical(left.aliasId, right.aliasId));
}

export function buildStructuredLogRows(
  logText: string,
  fallbackSourceClass: string,
): Array<{
  key: string;
  timestamp: string | null;
  sourceClass: string;
  severity: "debug" | "info" | "warn" | "error" | null;
  requestId: string | null;
  message: string;
  rawLine: string;
}> {
  const lineCounts = new Map<string, number>();

  return logText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const occurrence = (lineCounts.get(line) ?? 0) + 1;
      lineCounts.set(line, occurrence);

      const structuredMatch = line.match(
        /^(\S+)\s+(DEBUG|INFO|WARN|ERROR)\s+([^\s]+)(?:\s+(req-[^\s]+))?\s+(.+)$/i,
      );
      const packagedMatch = line.match(/^\[([^\]]+)\]\s+(req-[^\s]+)\s+(.+)$/i);
      const timestamp = structuredMatch?.[1] ?? packagedMatch?.[1] ?? null;
      const severity = structuredMatch?.[2]?.toLowerCase() as
        | "debug"
        | "info"
        | "warn"
        | "error"
        | undefined;
      const sourceClass = structuredMatch?.[3] ?? fallbackSourceClass;
      const requestId = structuredMatch?.[4] ?? packagedMatch?.[2] ?? null;
      const message = structuredMatch?.[5] ?? packagedMatch?.[3] ?? line;

      return {
        key: `${line}-${occurrence}`,
        timestamp,
        sourceClass,
        severity: severity ?? null,
        requestId,
        message,
        rawLine: line,
      };
    });
}

export function buildAccountModelCatalogIds(input: {
  readonly account: Pick<RuntimeAccount, "providerId" | "allowedModels"> | null | undefined;
  readonly providers: readonly RuntimeProvider[];
  readonly models: ReadonlyArray<Pick<RuntimeModelRecord, "id">>;
}): string[] {
  const account = input.account;
  if (!account) {
    return [];
  }

  const providerCatalogIds = uniqueStrings(
    input.providers.find((provider) => provider.providerId === account.providerId)?.modelIds ?? [],
  );
  const modelCatalogIds = uniqueStrings(input.models.map((model) => model.id));
  const providerScopedCatalogIds =
    providerCatalogIds.length > 0
      ? providerCatalogIds
      : modelCatalogIds.filter((modelId) => modelId.startsWith(`${account.providerId}/`));

  if (account.allowedModels && account.allowedModels.length > 0) {
    const allowedIds = uniqueStrings(account.allowedModels);
    return [
      ...providerScopedCatalogIds.filter((modelId) => allowedIds.includes(modelId)),
      ...allowedIds.filter((modelId) => !providerScopedCatalogIds.includes(modelId)),
    ];
  }

  return providerScopedCatalogIds;
}

export function buildConfiguredProviderRows(input: {
  readonly accounts: readonly RuntimeAccount[];
  readonly deviceAuthorizations?: readonly RuntimeDeviceAuthorization[];
  readonly endpoints: readonly RuntimeEndpoint[];
  readonly providerRollups?: readonly RuntimeCredentialLifecycleProviderRollup[];
}): Array<{
  providerId: string;
  accountIds: string[];
  authModes: string[];
  configuredModels: string[];
  endpointModels: string[];
  endpointCount: number;
  activeEndpointCount: number;
  healthStatuses: string[];
  pendingDeviceAuthorizationCount: number;
  envUnresolvedAccountCount: number;
  expiredAuthAccountCount: number;
  credentialsMissingAccountCount: number;
  connectedWithoutEndpointCount: number;
  readyAccountCount: number;
}> {
  const providerIds = uniqueStrings([
    ...input.accounts.map((account) => account.providerId),
    ...(input.deviceAuthorizations ?? []).map((authorization) => authorization.providerId),
    ...input.endpoints.map((endpoint) => endpoint.providerId),
    ...(input.providerRollups ?? []).map((rollup) => rollup.providerId),
  ]).sort(sortLexical);

  return providerIds.map((providerId) => {
    const providerAccounts = input.accounts.filter((account) => account.providerId === providerId);
    const providerEndpoints = input.endpoints.filter(
      (endpoint) => endpoint.providerId === providerId,
    );
    const providerRollup = input.providerRollups?.find(
      (rollup) => rollup.providerId === providerId,
    );
    const pendingDeviceAuthorizationAccountIds = new Set(
      (input.deviceAuthorizations ?? [])
        .filter(
          (authorization) =>
            authorization.providerId === providerId && authorization.status === "pending",
        )
        .map((authorization) => authorization.providerAccountId),
    );
    const readyAccountIds = new Set(
      providerEndpoints
        .filter(
          (endpoint) =>
            endpoint.status === "active" && typeof endpoint.providerAccountId === "string",
        )
        .map((endpoint) => endpoint.providerAccountId as string),
    );
    let pendingDeviceAuthorizationCount = 0;
    let envUnresolvedAccountCount = 0;
    let expiredAuthAccountCount = 0;
    let credentialsMissingAccountCount = 0;
    let connectedWithoutEndpointCount = 0;
    let readyAccountCount = 0;

    if (providerRollup) {
      pendingDeviceAuthorizationCount = providerRollup.countsByLifecycle.pendingAuthorization;
      envUnresolvedAccountCount = providerRollup.countsByLifecycle.envUnresolved;
      expiredAuthAccountCount = providerRollup.countsByLifecycle.expiredAuth;
      credentialsMissingAccountCount = providerRollup.countsByLifecycle.credentialsMissing;
      connectedWithoutEndpointCount = providerRollup.countsByLifecycle.connectedNoEndpoint;
      readyAccountCount = providerRollup.countsByLifecycle.executionReady;
    } else {
      for (const account of providerAccounts) {
        if (readyAccountIds.has(account.providerAccountId)) {
          readyAccountCount += 1;
          continue;
        }
        if (pendingDeviceAuthorizationAccountIds.has(account.providerAccountId)) {
          pendingDeviceAuthorizationCount += 1;
          continue;
        }
        if (account.healthStatus === "env-unresolved") {
          envUnresolvedAccountCount += 1;
          continue;
        }
        if (account.healthStatus === "expired-auth") {
          expiredAuthAccountCount += 1;
          continue;
        }
        if (account.healthStatus === "credentials-missing") {
          credentialsMissingAccountCount += 1;
          continue;
        }
        if (account.status === "active" && account.healthStatus === "healthy") {
          connectedWithoutEndpointCount += 1;
        }
      }
    }

    return {
      providerId,
      accountIds:
        providerRollup && providerRollup.accountIds.length > 0
          ? [...providerRollup.accountIds].sort(sortLexical)
          : uniqueStrings(providerAccounts.map((account) => account.providerAccountId)).sort(
              sortLexical,
            ),
      authModes: uniqueStrings(providerAccounts.map((account) => account.authMode)).sort(
        sortLexical,
      ),
      configuredModels: uniqueStrings(
        providerAccounts.flatMap((account) => account.allowedModels ?? []),
      ).sort(sortLexical),
      endpointModels: uniqueStrings(providerEndpoints.map((endpoint) => endpoint.modelId)).sort(
        sortLexical,
      ),
      endpointCount: providerEndpoints.length,
      activeEndpointCount: providerEndpoints.filter((endpoint) => endpoint.status === "active")
        .length,
      healthStatuses: uniqueStrings(providerAccounts.map((account) => account.healthStatus)).sort(
        sortLexical,
      ),
      pendingDeviceAuthorizationCount,
      envUnresolvedAccountCount,
      expiredAuthAccountCount,
      credentialsMissingAccountCount,
      connectedWithoutEndpointCount,
      readyAccountCount,
    };
  });
}

export function buildDownstreamProviderGuide(provider: RuntimeDownstreamOpenAIProviderConfig): {
  connectionRows: Array<{ label: string; value: string }>;
  availableModels: string[];
  opencodeSteps: string[];
  examples: {
    modelsCurl: string;
    chatCurl: string;
  };
} {
  const recommendedModel = provider.setup.recommendedModel ?? provider.models[0]?.id ?? "model-id";
  const placeholderToken = provider.authentication.placeholderToken;

  const baseUrlWithV1 = provider.baseUrl.endsWith("/v1")
    ? provider.baseUrl
    : `${provider.baseUrl}/v1`;
  const baseUrlWithoutV1 = provider.baseUrl.endsWith("/v1")
    ? provider.baseUrl.slice(0, -3)
    : provider.baseUrl;

  return {
    connectionRows: [
      { label: "Provider type", value: "OpenAI-compatible" },
      { label: "Base URL (standard)", value: baseUrlWithoutV1 },
      { label: "Base URL (/v1 suffix)", value: baseUrlWithV1 },
      { label: "Models endpoint", value: provider.endpoints.models },
      { label: "Chat endpoint", value: provider.endpoints.chatCompletions },
      {
        label: "Auth header",
        value: `${provider.authentication.headerName}: Bearer ${placeholderToken}`,
      },
    ],
    availableModels: provider.models.map((model) => model.id),
    opencodeSteps: [
      "Choose an OpenAI-compatible provider entry in the downstream client.",
      `Set the base URL to ${baseUrlWithoutV1} (most clients) or ${baseUrlWithV1} (clients that expect /v1 in the base URL).`,
      `If the client requires an API key, use ${placeholderToken} as the bearer token.`,
      `Select a model returned by ${provider.endpoints.models}.`,
    ],
    examples: {
      modelsCurl: `curl ${provider.endpoints.models}`,
      chatCurl: `curl ${provider.endpoints.chatCompletions} -H "content-type: application/json" -H "${provider.authentication.headerName}: Bearer ${placeholderToken}" -d '{"model":"${recommendedModel}","messages":[{"role":"user","content":"Reply with ok."}]}'`,
    },
  };
}

function summarizeSourceTypes(sourceTypes: readonly string[]): string {
  if (sourceTypes.includes("local") && sourceTypes.includes("remote")) {
    return "local + remote";
  }
  return sourceTypes[0] ?? "unknown";
}

function resolveEndpointReadinessStatus(
  endpoint: Pick<RuntimeEndpoint, "healthStatus" | "status">,
): string {
  if (endpoint.healthStatus && endpoint.healthStatus.length > 0) {
    return endpoint.healthStatus;
  }
  if (endpoint.status === "active") {
    return "healthy";
  }
  return endpoint.status ?? "unknown";
}

function summarizeModelStatus(
  endpoints: readonly Pick<RuntimeEndpoint, "healthStatus" | "status">[],
): string {
  const statuses = endpoints.map(resolveEndpointReadinessStatus);
  if (statuses.length === 0) {
    return "inactive";
  }
  if (statuses.every((status) => status === "healthy")) {
    return "healthy";
  }
  if (statuses.every((status) => status === "offline")) {
    return "offline";
  }
  if (statuses.some((status) => status === "healthy")) {
    return "degraded";
  }
  if (statuses.includes("degraded")) {
    return "degraded";
  }
  if (statuses.includes("provider-unavailable")) {
    return "provider-unavailable";
  }
  if (statuses.includes("policy-blocked")) {
    return "policy-blocked";
  }
  return statuses[0] ?? "unknown";
}

export function buildConfiguredModelCards(input: {
  readonly models: readonly RuntimeModelRecord[];
  readonly endpoints: readonly RuntimeEndpoint[];
  readonly accounts: readonly RuntimeAccount[];
  readonly requests?: readonly RuntimeRequestListItem[] | null;
  readonly controller?:
    | (Pick<RuntimeControllerAssignment, "endpointId" | "modelId"> &
        Partial<Pick<RuntimeControllerAssignment, "scope">>)
    | null;
}): Array<{
  modelId: string;
  displayName: string;
  capabilities: readonly string[];
  modalities: readonly string[];
  contextWindow: number | null;
  maxOutputTokens: number | null;
  pricing?: RuntimeModelRecord["pricing"];
  sourceSummary: string;
  endpointCount: number;
  endpointIds: string[];
  requestCount: number | null;
  status: string;
  roleIds: string[];
  toolCallingSupported: boolean;
  controllerState: "active" | "eligible" | "inactive";
}> {
  return input.models
    .map((model) => {
      const endpoints = input.endpoints.filter((endpoint) => endpoint.modelId === model.id);
      const endpointIds = [...new Set(endpoints.map((endpoint) => endpoint.endpointId))].sort(
        (left, right) => left.localeCompare(right, "en"),
      );
      const roleIds = [
        ...new Set(
          [
            ...endpoints.flatMap((endpoint) => endpoint.roleIds ?? []),
            ...input.accounts.flatMap((account) =>
              (account.modelRoleBindings ?? [])
                .filter((binding) => binding.modelId === model.id)
                .flatMap((binding) => binding.roleIds),
            ),
          ].sort((left, right) => left.localeCompare(right, "en")),
        ),
      ];
      const sourceTypes = [
        ...new Set(
          endpoints.map(
            (endpoint) =>
              endpoint.sourceType ??
              (endpoint.servingSource?.toLowerCase().includes("local") ? "local" : "remote"),
          ),
        ),
      ].sort((left, right) => left.localeCompare(right, "en"));
      const requestCount = Array.isArray(input.requests)
        ? input.requests.filter((request) => endpointIds.includes(request.endpointId ?? "")).length
        : null;
      const controllerState: "active" | "eligible" | "inactive" =
        input.controller &&
        input.controller.modelId === model.id &&
        endpointIds.includes(input.controller.endpointId)
          ? "active"
          : endpointIds.length > 0
            ? "eligible"
            : "inactive";

      return {
        modelId: model.id,
        displayName: model.displayName ?? toTitleLabel(model.id),
        capabilities: [...(model.capabilities ?? [])],
        modalities: [...(model.modalities ?? [])],
        contextWindow: model.contextWindow ?? null,
        maxOutputTokens: model.maxOutputTokens ?? null,
        pricing: model.pricing,
        sourceSummary: summarizeSourceTypes(sourceTypes),
        endpointCount: endpointIds.length,
        endpointIds,
        requestCount,
        status: summarizeModelStatus(endpoints),
        roleIds,
        toolCallingSupported: endpoints.some((endpoint) => endpoint.toolCallingSupported === true),
        controllerState,
      };
    })
    .sort((left, right) => {
      const controllerOrder = (value: typeof left) =>
        value.controllerState === "active" ? 0 : value.controllerState === "eligible" ? 1 : 2;
      return (
        controllerOrder(left) - controllerOrder(right) ||
        left.displayName.localeCompare(right.displayName, "en")
      );
    });
}

export function buildConfiguredModelMetadataRows(model: {
  readonly modalities?: readonly string[];
  readonly contextWindow?: number | null;
  readonly maxOutputTokens?: number | null;
  readonly pricing?: RuntimeModelRecord["pricing"];
}): Array<{ label: string; value: string }> {
  return [
    {
      label: "Modalities",
      value:
        model.modalities && model.modalities.length > 0 ? model.modalities.join(", ") : "Unknown",
    },
    {
      label: "Context window",
      value: formatTokenCount(model.contextWindow),
    },
    {
      label: "Max output",
      value: formatTokenCount(model.maxOutputTokens),
    },
    {
      label: "Pricing",
      value: formatPricingValue(model.pricing),
    },
  ];
}

function formatCompactTokenCount(value: number | null | undefined): string {
  if (typeof value !== "number" || value <= 0) {
    return "Unknown";
  }
  if (value >= 1000) {
    const compact = value / 1000;
    const rounded = Number.isInteger(compact)
      ? String(compact)
      : compact.toFixed(1).replace(/\.0$/, "");
    return `${rounded}k tokens`;
  }
  return `${value} tokens`;
}

function formatUnitPrice(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "Unknown";
  }
  return `$${value.toFixed(2)} / 1M`;
}

function formatLatencyMs(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "—";
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2).replace(/\.?0+$/, "")} s`;
  }
  return `${Math.round(value)} ms`;
}

function titleCaseSource(sourceSummary: string): string {
  if (sourceSummary === "local + remote") {
    return "Local + remote";
  }
  if (sourceSummary.length === 0) {
    return "Unknown";
  }
  return `${sourceSummary.charAt(0).toUpperCase()}${sourceSummary.slice(1)}`;
}

export function buildSelectedModelMetaPanel(input: {
  readonly modelId: string;
  readonly sourceSummary: string;
  readonly status: string;
  readonly controllerState: "active" | "eligible" | "inactive";
  readonly endpointCount: number;
  readonly healthyEndpointCount: number;
  readonly toolCallingSupported: boolean;
  readonly toolStyles?: readonly string[];
  readonly contextWindow?: number | null;
  readonly modalities?: readonly string[];
  readonly pricing?: RuntimeModelRecord["pricing"];
  readonly overallScore?: number | null;
  readonly latencyP50Ms?: number | null;
  readonly latencyP95Ms?: number | null;
  readonly meanLatencyMs?: number | null;
  readonly difficultyMix?: string | null;
  readonly routingHint?: string | null;
}): {
  title: string;
  facts: Array<{ label: string; value: string }>;
  cost: Array<{ label: string; value: string }>;
  benchmark: Array<{ label: string; value: string }>;
} {
  const toolStyles = (input.toolStyles ?? []).filter((style) => style.trim().length > 0);
  const toolUse = input.toolCallingSupported
    ? toolStyles.length > 0
      ? `Enabled · ${toolStyles.join(" · ")}`
      : "Enabled"
    : "Unavailable";
  const mode =
    input.modalities && input.modalities.length > 0 ? input.modalities.join(", ") : "Unknown";
  const endpointValue =
    input.endpointCount === 0
      ? "None"
      : `${input.healthyEndpointCount} healthy${
          input.healthyEndpointCount === input.endpointCount ? "" : ` / ${input.endpointCount}`
        }`;
  // Always show Cost — models.dev prices when present, otherwise explicit Unknown.
  const cost =
    input.pricing != null
      ? [
          { label: "Input", value: formatUnitPrice(input.pricing.inputPer1M) },
          { label: "Output", value: formatUnitPrice(input.pricing.outputPer1M) },
        ]
      : [
          { label: "Input", value: "Unknown" },
          { label: "Output", value: "Unknown" },
        ];
  const overall =
    typeof input.overallScore === "number" ? input.overallScore.toFixed(2) : "No evidence yet";
  return {
    title: `Runtime · ${input.modelId}`,
    facts: [
      { label: "Source", value: titleCaseSource(input.sourceSummary) },
      {
        label: "Status",
        value:
          input.controllerState === "active"
            ? `${titleCaseSource(input.status)} · controller`
            : `${titleCaseSource(input.status)} · not controller`,
      },
      { label: "Endpoints", value: endpointValue },
      { label: "Tool use", value: toolUse },
      { label: "Context", value: formatCompactTokenCount(input.contextWindow) },
      { label: "Mode", value: mode },
    ],
    cost,
    benchmark: [
      { label: "Overall", value: overall },
      { label: "Latency p50", value: formatLatencyMs(input.latencyP50Ms) },
      { label: "Latency p95", value: formatLatencyMs(input.latencyP95Ms) },
      { label: "Mean latency", value: formatLatencyMs(input.meanLatencyMs) },
      {
        label: "Difficulty mix",
        value: input.difficultyMix?.trim() || "No difficulty mix yet",
      },
      {
        label: "Routing",
        value: input.routingHint?.trim() || "No routing evidence yet",
      },
    ],
  };
}

export function summarizeWorkbenchResult(result: Record<string, unknown>): {
  outputText: string;
  toolCalls: Array<{ id?: string; name: string; arguments: string }>;
  toolExecutions: Array<{
    connectorId?: string;
    toolName?: string;
    status?: string;
    durationMs?: number;
  }>;
  usageRows: Array<{ label: string; value: string }>;
  rawPayload: string;
} {
  const choiceMessage =
    Array.isArray(result.choices) && result.choices[0] && typeof result.choices[0] === "object"
      ? (
          result.choices[0] as {
            message?: { content?: string; reasoning_content?: string };
          }
        ).message
      : undefined;
  const outputText =
    typeof result.outputText === "string"
      ? result.outputText
      : typeof choiceMessage?.content === "string" && choiceMessage.content.length > 0
        ? choiceMessage.content
        : typeof choiceMessage?.reasoning_content === "string"
          ? choiceMessage.reasoning_content
          : "";
  const toolCalls = Array.isArray(result.toolCalls)
    ? result.toolCalls
        .filter(
          (entry): entry is { id?: string; function?: { name?: string; arguments?: string } } =>
            typeof entry === "object" && entry !== null,
        )
        .map((entry) => ({
          id: entry.id,
          name: entry.function?.name ?? "unknown",
          arguments: entry.function?.arguments ?? "{}",
        }))
    : [];
  const toolExecutions = Array.isArray(result.toolExecutions)
    ? result.toolExecutions
        .filter(
          (
            entry,
          ): entry is {
            connectorId?: string;
            toolName?: string;
            status?: string;
            durationMs?: number;
          } => typeof entry === "object" && entry !== null,
        )
        .map((entry) => ({
          connectorId: entry.connectorId,
          toolName: entry.toolName,
          status: entry.status,
          durationMs: entry.durationMs,
        }))
    : [];
  const usageRecord =
    typeof result.usage === "object" && result.usage !== null
      ? (result.usage as Record<string, unknown>)
      : {};
  const usageRows = [
    { label: "Input tokens", value: String(usageRecord.inputTokens ?? 0) },
    { label: "Output tokens", value: String(usageRecord.outputTokens ?? 0) },
  ];

  return {
    outputText,
    toolCalls,
    toolExecutions,
    usageRows,
    rawPayload: JSON.stringify(result, null, 2),
  };
}

export function buildActivitySummary(entries: readonly RuntimeActivityLogEntry[]): {
  facts: Array<{ label: string; value: string; detail: string }>;
  rows: Array<{
    id: number;
    timestamp: string;
    model: string;
    path: string;
    status: string;
    durationLabel: string;
    captureLabel: string;
    hasCapture: boolean;
    inputTokens: string;
    outputTokens: string;
    cacheTokens: string;
  }>;
} {
  const rows = entries.map((entry) => ({
    id: entry.id,
    timestamp: entry.timestamp,
    model: entry.model,
    path: entry.req_path,
    status: String(entry.resp_status_code),
    durationLabel: `${entry.duration_ms} ms`,
    captureLabel: entry.has_capture ? "Capture available" : "No capture",
    hasCapture: entry.has_capture,
    inputTokens: String(entry.tokens.input_tokens),
    outputTokens: String(entry.tokens.output_tokens),
    cacheTokens: String(entry.tokens.cache_tokens),
  }));

  const captureCount = entries.filter((entry) => entry.has_capture).length;
  const errorCount = entries.filter((entry) => entry.resp_status_code >= 400).length;
  const inputTokens = entries.reduce((total, entry) => total + entry.tokens.input_tokens, 0);
  const outputTokens = entries.reduce((total, entry) => total + entry.tokens.output_tokens, 0);
  const cacheTokens = entries.reduce((total, entry) => total + entry.tokens.cache_tokens, 0);
  const mostRecentStatus = rows[0]?.status ?? "n/a";

  return {
    facts: [
      { label: "Entries", value: String(entries.length), detail: `${captureCount} with captures` },
      {
        label: "Errors",
        value: String(errorCount),
        detail: `Most recent status: ${mostRecentStatus}`,
      },
      {
        label: "Prompt tokens",
        value: String(inputTokens),
        detail: `${cacheTokens} cached tokens recorded`,
      },
      {
        label: "Completion tokens",
        value: String(outputTokens),
        detail: "Across the current in-memory metrics window",
      },
    ],
    rows,
  };
}
