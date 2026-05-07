import type {
  RuntimeAccount,
  RuntimeActivityLogEntry,
  RuntimeControllerAssignment,
  RuntimeDownstreamOpenAIProviderConfig,
  RuntimeEndpoint,
  RuntimeModelRecord,
  RuntimeProvider,
  RuntimeRequestListItem,
  RuntimeSummary,
} from "./runtime-api";

function toTitleLabel(modelId: string): string {
  const raw = modelId.includes("/") ? modelId.split("/").at(-1) ?? modelId : modelId;
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

export function buildDownstreamProviderGuide(
  provider: RuntimeDownstreamOpenAIProviderConfig,
): {
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

  return {
    connectionRows: [
      { label: "Provider type", value: "OpenAI-compatible" },
      { label: "Base URL", value: provider.baseUrl },
      { label: "Models endpoint", value: provider.endpoints.models },
      { label: "Chat endpoint", value: provider.endpoints.chatCompletions },
      { label: "Auth header", value: `${provider.authentication.headerName}: Bearer ${placeholderToken}` },
    ],
    availableModels: provider.models.map((model) => model.id),
    opencodeSteps: [
      "Choose an OpenAI-compatible provider entry in the downstream client.",
      `Set the base URL to ${provider.baseUrl}.`,
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
  readonly controller?: Pick<RuntimeControllerAssignment, "endpointId" | "modelId"> & Partial<Pick<RuntimeControllerAssignment, "scope">> | null;
}): Array<{
  modelId: string;
  displayName: string;
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
      const endpointIds = [...new Set(endpoints.map((endpoint) => endpoint.endpointId))].sort((left, right) =>
        left.localeCompare(right, "en"),
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
          endpoints.map((endpoint) =>
            endpoint.sourceType ??
            (endpoint.servingSource?.toLowerCase().includes("local") ? "local" : "remote"),
          ),
        ),
      ].sort((left, right) => left.localeCompare(right, "en"));
      const requestCount = input.requests.filter((request) => endpointIds.includes(request.endpointId ?? "")).length;
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
        displayName: toTitleLabel(model.id),
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
      return controllerOrder(left) - controllerOrder(right) || left.displayName.localeCompare(right.displayName, "en");
    });
}

export function summarizeWorkbenchResult(result: Record<string, unknown>): {
  outputText: string;
  toolCalls: Array<{ id?: string; name: string; arguments: string }>;
  toolExecutions: Array<{ connectorId?: string; toolName?: string; status?: string; durationMs?: number }>;
  usageRows: Array<{ label: string; value: string }>;
  rawPayload: string;
} {
  const outputText =
    typeof result.outputText === "string"
      ? result.outputText
      : Array.isArray(result.choices) &&
          result.choices[0] &&
          typeof result.choices[0] === "object" &&
          typeof (result.choices[0] as { message?: { content?: string } }).message?.content === "string"
        ? (result.choices[0] as { message: { content: string } }).message.content
        : "";
  const toolCalls = Array.isArray(result.toolCalls)
    ? result.toolCalls
        .filter((entry): entry is { id?: string; function?: { name?: string; arguments?: string } } =>
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
        .filter((entry): entry is { connectorId?: string; toolName?: string; status?: string; durationMs?: number } =>
          typeof entry === "object" && entry !== null,
        )
        .map((entry) => ({
          connectorId: entry.connectorId,
          toolName: entry.toolName,
          status: entry.status,
          durationMs: entry.durationMs,
        }))
    : [];
  const usageRecord =
    typeof result.usage === "object" && result.usage !== null ? (result.usage as Record<string, unknown>) : {};
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

export function buildActivitySummary(
  entries: readonly RuntimeActivityLogEntry[],
): {
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
      { label: "Errors", value: String(errorCount), detail: `Most recent status: ${mostRecentStatus}` },
      { label: "Prompt tokens", value: String(inputTokens), detail: `${outputTokens} output tokens recorded` },
      { label: "Cached tokens", value: String(cacheTokens), detail: "Across the current in-memory metrics window" },
    ],
    rows,
  };
}
