import type {
  RuntimeAccount,
  RuntimeActivityLogEntry,
  RuntimeControllerAssignment,
  RuntimeDeviceAuthorization,
  RuntimeDownstreamOpenAIProviderConfig,
  RuntimeEndpoint,
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
  summary: Pick<RuntimeSummary, "readinessSummary">,
): Array<{
  key:
    | "pending-device-authorization"
    | "credentials-missing"
    | "connected-without-endpoint"
    | "ready";
  label: string;
  value: number;
  tone: "warning" | "success" | "neutral";
}> {
  const readiness = summary.readinessSummary;
  if (!readiness) {
    return [];
  }

  const rows: Array<{
    key:
      | "pending-device-authorization"
      | "credentials-missing"
      | "connected-without-endpoint"
      | "ready";
    label: string;
    value: number;
    tone: "warning" | "success" | "neutral";
  }> = [];

  if (readiness.pendingDeviceAuthorizationCount > 0) {
    rows.push({
      key: "pending-device-authorization",
      label: "Pending OAuth",
      value: readiness.pendingDeviceAuthorizationCount,
      tone: "warning",
    });
  }
  if (readiness.credentialsMissingAccountCount > 0) {
    rows.push({
      key: "credentials-missing",
      label: "Credentials missing",
      value: readiness.credentialsMissingAccountCount,
      tone: "warning",
    });
  }
  if (readiness.connectedWithoutEndpointCount > 0) {
    rows.push({
      key: "connected-without-endpoint",
      label: "Connected, no endpoint",
      value: readiness.connectedWithoutEndpointCount,
      tone: "warning",
    });
  }

  rows.push({
    key: "ready",
    label: "Execution-ready",
    value: readiness.readyAccountCount,
    tone: readiness.readyAccountCount > 0 ? "success" : "neutral",
  });

  return rows;
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

export function summarizeTelemetryStats(
  summary: RuntimeTelemetrySummary,
): Array<{ label: string; value: string; detail: string }> {
  return [
    {
      label: "Requests",
      value: String(summary.requestCount),
      detail: `${summary.sourceBreakdown.local.requestCount} local / ${summary.sourceBreakdown.remote.requestCount} remote in the current telemetry window`,
    },
    {
      label: "Failures",
      value: String(summary.failureCount),
      detail: `${summary.successCount} successful requests recorded`,
    },
    {
      label: "Latency",
      value: summary.p95LatencyMs !== null ? `${summary.p95LatencyMs} ms` : "n/a",
      detail:
        summary.averageLatencyMs !== null
          ? `${summary.averageLatencyMs} ms average latency across structured telemetry`
          : "Average latency not available yet",
    },
    {
      label: "Tokens",
      value: String(summary.totalTokens),
      detail: `${summary.cachedRequestCount} cached request${summary.cachedRequestCount === 1 ? "" : "s"} and ${formatCurrency(summary.totalActualCostUsd, "actual")} cost recorded`,
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
    providerLabel: row.providerFamily ?? row.providerKind ?? row.providerId ?? "unknown provider",
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
      routingDecisionLabel: row.routingDecisionId ?? "n/a",
      endpointId: row.endpointId,
      modelId: row.modelId,
      sourceLabel: formatSourceLabel(row.sourceType),
      statusLabel: `${row.statusCode ?? 0} ${row.errorClass ?? "ok"}`,
      providerFamilyLabel:
        row.providerFamily ?? row.providerKind ?? row.providerId ?? "unknown provider",
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
      providerLabel: endpoint.providerId ?? "local/runtime",
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
  credentialsMissingAccountCount: number;
  connectedWithoutEndpointCount: number;
  readyAccountCount: number;
}> {
  const providerIds = uniqueStrings([
    ...input.accounts.map((account) => account.providerId),
    ...(input.deviceAuthorizations ?? []).map((authorization) => authorization.providerId),
    ...input.endpoints.map((endpoint) => endpoint.providerId),
  ]).sort(sortLexical);

  return providerIds.map((providerId) => {
    const providerAccounts = input.accounts.filter((account) => account.providerId === providerId);
    const providerEndpoints = input.endpoints.filter(
      (endpoint) => endpoint.providerId === providerId,
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
    let credentialsMissingAccountCount = 0;
    let connectedWithoutEndpointCount = 0;
    let readyAccountCount = 0;

    for (const account of providerAccounts) {
      if (readyAccountIds.has(account.providerAccountId)) {
        readyAccountCount += 1;
        continue;
      }
      if (pendingDeviceAuthorizationAccountIds.has(account.providerAccountId)) {
        pendingDeviceAuthorizationCount += 1;
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

    return {
      providerId,
      accountIds: uniqueStrings(providerAccounts.map((account) => account.providerAccountId)).sort(
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

function summarizeModelStatus(statuses: readonly string[]): string {
  if (statuses.includes("active")) {
    return "active";
  }
  if (statuses.includes("degraded")) {
    return "degraded";
  }
  if (statuses.includes("offline")) {
    return "offline";
  }
  return statuses[0] ?? "unknown";
}

export function buildConfiguredModelCards(input: {
  readonly models: readonly RuntimeModelRecord[];
  readonly endpoints: readonly RuntimeEndpoint[];
  readonly accounts: readonly RuntimeAccount[];
  readonly requests: readonly RuntimeRequestListItem[];
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
  requestCount: number;
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
      const requestCount = input.requests.filter((request) =>
        endpointIds.includes(request.endpointId ?? ""),
      ).length;
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
        status: summarizeModelStatus(endpoints.map((endpoint) => endpoint.status ?? "unknown")),
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
  const outputText =
    typeof result.outputText === "string"
      ? result.outputText
      : Array.isArray(result.choices) &&
          result.choices[0] &&
          typeof result.choices[0] === "object" &&
          typeof (result.choices[0] as { message?: { content?: string } }).message?.content ===
            "string"
        ? (result.choices[0] as { message: { content: string } }).message.content
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
  const rows = [...entries]
    .sort((left, right) => right.id - left.id)
    .map((entry) => ({
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
        detail: `${outputTokens} output tokens recorded`,
      },
      {
        label: "Cached tokens",
        value: String(cacheTokens),
        detail: "Across the current in-memory metrics window",
      },
    ],
    rows,
  };
}
