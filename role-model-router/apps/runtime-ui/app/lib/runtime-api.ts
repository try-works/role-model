import type { RuntimeRevisionUpdate } from "./runtime-refresh-bus";

export type RuntimeFetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;
export type SessionBootstrapStatus = "pending" | "running" | "ready" | "degraded" | "blocked";

export type BootstrapStageStatus =
  | "pending"
  | "running"
  | "ready"
  | "degraded"
  | "failed"
  | "skipped";

export interface BootstrapStageReceipt {
  readonly stageId: string;
  readonly status: BootstrapStageStatus;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly message?: string;
  readonly details?: Record<string, unknown>;
}

export interface RuntimeCredentialLifecycleCounts {
  readonly executionReady: number;
  readonly connectedNoEndpoint: number;
  readonly pendingAuthorization: number;
  readonly expiredAuth: number;
  readonly credentialsMissing: number;
  readonly envUnresolved: number;
  readonly archivedStale: number;
}

export interface RuntimeCredentialLifecycleAccountRecord {
  readonly logicalAccountId: string;
  readonly providerAccountId: string;
  readonly providerId: string;
  readonly sourceProvenance: readonly string[];
  readonly authMode: string;
  readonly credentialStorageMode: string;
  readonly credentialBackendCanonical: string;
  readonly lifecycleState: string;
  readonly reasonCode: string;
  readonly blocking: boolean;
  readonly activeEndpointIds: readonly string[];
  readonly configuredModelIds: readonly string[];
  readonly availableActions: readonly string[];
}

export interface RuntimeCredentialLifecycleProviderRollup {
  readonly providerId: string;
  readonly accountIds: readonly string[];
  readonly countsByLifecycle: RuntimeCredentialLifecycleCounts;
  readonly readyAccountIds: readonly string[];
  readonly attentionAccountIds: readonly string[];
  readonly hasArchivedArtifacts: boolean;
}

export interface RuntimeCredentialLifecycleArchivedArtifact {
  readonly artifactId: string;
  readonly providerId: string | null;
  readonly providerAccountId: string | null;
  readonly artifactType: string;
  readonly reasonCode: string;
}

export interface RuntimeCredentialLifecycleSummary {
  readonly version: 1;
  readonly authority: {
    readonly state: "provisional" | "authoritative";
    readonly bootstrapStatus: SessionBootstrapStatus;
    readonly reason?: string;
  };
  readonly counts: RuntimeCredentialLifecycleCounts;
  readonly accounts: readonly RuntimeCredentialLifecycleAccountRecord[];
  readonly providerRollups: readonly RuntimeCredentialLifecycleProviderRollup[];
  readonly archivedArtifacts: readonly RuntimeCredentialLifecycleArchivedArtifact[];
}

export interface RuntimeSummary {
  readonly providerCount: number;
  readonly accountCount: number;
  readonly endpointCount: number;
  readonly scopeId?: string;
  readonly runtimeStateRoot?: string;
  readonly executionMode?: "decision_only" | "hybrid" | "local_only" | "remote_only";
  readonly unifiedConfig?: {
    readonly enabled: boolean;
    readonly path: string | null;
  };
  readonly readinessSummary?: {
    readonly pendingDeviceAuthorizationCount: number;
    readonly credentialsMissingAccountCount: number;
    readonly connectedWithoutEndpointCount: number;
    readonly readyAccountCount: number;
  };
  readonly credentialLifecycle?: RuntimeCredentialLifecycleSummary;
  readonly lifecycleSummary?: {
    readonly active: number;
    readonly degraded: number;
    readonly offline: number;
  };
  readonly sessionBootstrap?: {
    readonly status: SessionBootstrapStatus;
    readonly startedAt: string | null;
    readonly finishedAt: string | null;
    readonly stages: readonly BootstrapStageReceipt[];
  };
  readonly inventorySummary?: {
    readonly modelIdCount: number;
    readonly endpointIdCount: number;
    readonly localEndpointCount: number;
    readonly remoteEndpointCount: number;
    readonly emptyAliasIds: readonly string[];
  };
  readonly aliasDrift?: readonly {
    readonly aliasId: string;
    readonly hintModelId: string;
    readonly suggestedModelIds: readonly string[];
    readonly message: string;
  }[];
  readonly operatorIntent?: {
    readonly path: string;
    readonly status: "missing" | "ok" | "corrupt";
    readonly message?: string;
  };
  readonly configuredMembershipReconciliation?: {
    readonly reconciledAt: string;
    readonly authorityVersion: 1;
    readonly inspected: {
      readonly runtimeEndpoints: number;
      readonly remoteActivations: number;
    };
    readonly pruned: {
      readonly runtimeEndpoints: number;
      readonly remoteActivations: number;
      readonly modelRoleBindings: number;
    };
    readonly reasonCodes: readonly string[];
  } | null;
}

export interface RuntimeHealthStatus {
  readonly status: "healthy" | "degraded";
  readonly executionMode?: RuntimeSummary["executionMode"];
  readonly inactiveVendors?: readonly string[];
  readonly sessionBootstrap?: RuntimeSummary["sessionBootstrap"];
}

export interface RuntimeProcessConfig {
  readonly command: string | null;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
  readonly cwd: string | null;
  readonly startupTimeoutMs: number | null;
}

export interface RuntimeConfigModel {
  readonly modelId: string;
  readonly path: string;
  readonly contextWindow?: number | null;
  readonly command?: string | null;
  readonly proxyBaseUrl?: string | null;
  readonly checkEndpoint?: string | null;
  readonly useModelName?: string | null;
}

export interface RuntimeConfigProviderMapping {
  readonly modelId: string;
  readonly litellmModel?: string;
  readonly litellmParams?: Readonly<Record<string, unknown>>;
}

export interface RuntimeConfigProvider {
  readonly providerId: string;
  readonly apiKeyRef?: string | null;
  readonly modelNames?: readonly string[];
  readonly modelMappings: readonly RuntimeConfigProviderMapping[];
}

export interface RuntimeModelAlias {
  readonly aliasId: string;
  readonly modelIds: readonly string[];
  readonly mode?: string | null;
}

export interface RuntimeConfig {
  readonly version: string;
  readonly routingStrategy?: string | null;
  readonly executionMode?: "decision_only" | "hybrid" | "local_only" | "remote_only";
  readonly modelAliases?: readonly RuntimeModelAlias[];
  readonly model_aliases?: readonly RuntimeModelAlias[];
  readonly llamaSwap: {
    readonly enabled?: boolean;
    readonly models: readonly RuntimeConfigModel[];
    readonly process: RuntimeProcessConfig;
  };
  readonly liteLLM: {
    readonly enabled?: boolean;
    readonly providers: readonly RuntimeConfigProvider[];
    readonly process: RuntimeProcessConfig;
  };
}

export interface RuntimeConfigRecord {
  readonly applied: boolean;
  readonly path: string | null;
  readonly config: RuntimeConfig | null;
}

export interface ProviderVariant {
  readonly variantId: string;
  readonly label: string;
  readonly description?: string;
  readonly authMode: string;
  readonly availability: string;
  readonly baseUrl?: string;
  readonly modelIds?: readonly string[];
  readonly oauth?: {
    readonly clientId: string;
    readonly deviceAuthorizationEndpoint: string;
    readonly tokenEndpoint: string;
    readonly requiredHeaders: readonly string[];
    readonly scope?: string;
  };
}

export interface RuntimeProvider {
  readonly providerId: string;
  readonly displayName: string;
  readonly npmPackage?: string;
  readonly providerKind?: string;
  readonly authFamily?: string;
  readonly adapterFamily?: string;
  readonly apiBase?: string;
  readonly docsUrl?: string | null;
  readonly envVars?: readonly string[];
  readonly supportedAuthModes?: readonly string[];
  readonly controlPlaneRequirements?: readonly string[];
  readonly localOverrideApplied?: boolean;
  readonly modelIds?: readonly string[];
  readonly variants?: readonly ProviderVariant[];
}

export interface RuntimeAccount {
  readonly providerAccountId: string;
  readonly providerId: string;
  readonly providerKind?: string;
  readonly orgScope?: string;
  readonly accountScope?: string;
  readonly authMode?: string;
  readonly credentialRef?: {
    readonly backend: string;
    readonly ref: string;
  };
  readonly regionPolicy?: {
    readonly mode: string;
    readonly regions: readonly string[];
  };
  readonly baseUrlOverride?: string | null;
  readonly allowedModels?: readonly string[];
  readonly modelRoleBindings?: readonly {
    readonly modelId: string;
    readonly endpointId?: string;
    readonly roleIds: readonly string[];
    readonly roleAssignmentMode?: "all" | "include" | "exclude" | "custom";
    readonly enabledRoleIds?: readonly string[];
    readonly disabledRoleIds?: readonly string[];
  }[];
  readonly deniedModels?: readonly string[];
  readonly entitlementTags?: readonly string[];
  readonly budgetPolicyRef?: string;
  readonly quotaPolicyRef?: string;
  readonly status?: string;
  readonly healthStatus?: string;
  readonly rotationState?: string;
}

export interface RuntimeEndpoint {
  readonly endpointId: string;
  readonly modelId: string;
  /** Human-readable endpoint label supplied by the host discovery contract. */
  readonly displayName?: string | null;
  /** Upstream model identity when this endpoint is an effort-specific instance. */
  readonly upstreamModelId?: string | null;
  readonly upstream_model_id?: string | null;
  /** Provider-native reasoning token fixed by this endpoint instance, if any. */
  readonly reasoningEffort?: string | null;
  readonly reasoning_effort?: string | null;
  readonly fixedEffort?: string | null;
  readonly fixed_effort?: string | null;
  readonly effortSource?: "fixed" | "provider-default" | "unknown" | string | null;
  readonly effort_source?: "fixed" | "provider-default" | "unknown" | string | null;
  readonly reasoningEffortLevels?: readonly string[];
  readonly reasoning_effort_levels?: readonly string[];
  readonly providerId: string | null;
  readonly providerAccountId?: string;
  readonly localModelSource?: "llama-swap" | "peer-backed";
  readonly region?: string;
  readonly roleIds?: readonly string[];
  readonly status?: string;
  readonly endpointKind?: string;
  readonly servingSource?: string;
  readonly sourceType?: "local" | "remote";
  readonly healthStatus?: string;
  readonly routingEligible?: boolean;
  readonly benchmarkEligible?: boolean;
  readonly capabilities?: readonly string[];
  readonly toolCallingSupported?: boolean;
  readonly toolCallingStyle?: string;
  readonly executionCooldown?: {
    readonly schemaVersion?: 2;
    readonly endpointId: string;
    readonly active: boolean;
    readonly failureCount: number;
    readonly circuitState?: "probation" | "open" | "half_open" | "blocked_auth" | "blocked_quota";
    readonly failureCategory?:
      | "connection"
      | "timeout"
      | "provider_5xx"
      | "rate_limit"
      | "auth"
      | "quota";
    readonly lastErrorClass: string;
    readonly lastFailureAtMs?: number;
    readonly nextProbeAtMs?: number;
    readonly retryAfterMs?: number;
    readonly cooldownUntilMs?: number;
  };
  readonly webSearchSupport?: {
    readonly mode: "native" | "runtime-fallback" | "unsupported";
    readonly currentRuntimeContract?: string | null;
    readonly documentedProviderContract?: string | null;
  };
}

export interface RuntimeLocalModel {
  readonly modelId: string;
  readonly loadedAt: string;
  readonly engine: string;
  readonly localModelSource?: "llama-swap" | "peer-backed";
  readonly roleIds?: readonly string[];
  readonly contextWindow?: number | null;
  readonly proxyBaseUrl?: string | null;
  readonly checkEndpoint?: string | null;
  readonly useModelName?: string | null;
}

export interface RuntimeModelRoleAssignment {
  readonly roleAssignmentMode: "all" | "include" | "exclude" | "custom";
  readonly enabledRoleIds?: readonly string[];
  readonly disabledRoleIds?: readonly string[];
  readonly taskOverrides?: Readonly<Record<string, unknown>>;
  readonly capabilityOverrides?: Readonly<Record<string, readonly string[]>>;
  readonly modalityOverrides?: Readonly<Record<string, readonly string[]>>;
  readonly toolClassOverrides?: Readonly<Record<string, readonly string[]>>;
}

export function roleIdsToExplicitAssignment(
  roleIds: readonly string[] | undefined,
  defaultAllRoles = true,
): RuntimeModelRoleAssignment {
  if (!roleIds || (defaultAllRoles && roleIds.length === 0)) {
    return { roleAssignmentMode: "all", enabledRoleIds: [], disabledRoleIds: [] };
  }
  return {
    roleAssignmentMode: roleIds.length === 0 ? "include" : "include",
    enabledRoleIds: [...roleIds],
    disabledRoleIds: [],
  };
}

function roleIdsToAssignmentPayload(
  roleIds: readonly string[] | undefined,
  defaultAllRoles: boolean,
): Record<string, unknown> {
  const assignment = roleIdsToExplicitAssignment(roleIds, defaultAllRoles);
  return {
    roleIds:
      assignment.roleAssignmentMode === "include" ? [...(assignment.enabledRoleIds ?? [])] : [],
    roleAssignmentMode: assignment.roleAssignmentMode,
    enabledRoleIds: [...(assignment.enabledRoleIds ?? [])],
    disabledRoleIds: [...(assignment.disabledRoleIds ?? [])],
  };
}

export function explicitAssignmentToRoleIds(
  assignment: RuntimeModelRoleAssignment,
): readonly string[] {
  if (assignment.roleAssignmentMode === "all") {
    return [];
  }
  if (assignment.roleAssignmentMode === "exclude") {
    return [];
  }
  return assignment.enabledRoleIds ?? [];
}

export interface RuntimeRoleDefinition {
  readonly roleId: string;
  readonly label: string;
  readonly description?: string;
  readonly taskTypes?: readonly string[];
}

export interface RuntimeRolePolicyRole {
  readonly role_id: string;
  readonly name: string;
  readonly description: string;
  readonly primaryGroupId?: string;
  readonly secondaryGroupIds?: readonly string[];
  readonly riskLevel?: "standard" | "high" | string;
  readonly role_kind: string;
  readonly default_system_instructions: string;
  readonly task_types_supported: readonly string[];
  readonly required_capabilities: readonly string[];
  readonly preferred_capabilities: readonly string[];
  readonly forbidden_capabilities: readonly string[];
  readonly tool_policy: {
    readonly mode: string;
    readonly allowed_tools?: readonly string[];
  };
  readonly routing_policy_overrides: Record<string, unknown>;
  readonly output_contracts: readonly string[];
  readonly safety_policy_refs: readonly string[];
}

export interface RuntimeTaskDefinition {
  readonly task_type: string;
  readonly description: string;
  readonly required_inputs: readonly string[];
  readonly required_capabilities: readonly string[];
  readonly preferred_capabilities: readonly string[];
  readonly quality_metrics: readonly string[];
  readonly allowed_roles: readonly string[];
  readonly default_benchmark_suites: readonly string[];
}

export interface RuntimeRolePolicy {
  readonly roleDefinitions: readonly RuntimeRolePolicyRole[];
  readonly taskDefinitions: readonly RuntimeTaskDefinition[];
}

export interface RuntimeDeviceAuthorization {
  readonly authRequestId: string;
  readonly providerAccountId: string;
  readonly providerId?: string;
  readonly variantId?: string;
  readonly status: string;
  readonly userCode?: string;
  readonly verificationUri?: string;
  readonly verificationUriComplete?: string;
  readonly intervalSeconds?: number;
  readonly expiresAtMs?: number;
  readonly lastError?: string;
}

export interface RuntimeRequestListItem {
  readonly requestId: string;
  readonly endpointId?: string;
  readonly createdAtMs?: number;
}

export interface RuntimeTelemetrySourceSummary {
  readonly requestCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalTokens: number;
  readonly cachedRequestCount: number;
  readonly totalActualCostUsd: number;
  readonly totalEstimatedCostUsd: number;
  readonly averageLatencyMs: number | null;
  readonly p95LatencyMs: number | null;
  readonly lastSeenAtMs: number | null;
}

export interface RuntimeTelemetrySummary extends RuntimeTelemetrySourceSummary {
  readonly sourceBreakdown: {
    readonly local: RuntimeTelemetrySourceSummary;
    readonly remote: RuntimeTelemetrySourceSummary;
  };
  readonly totalEffectiveCostUsd: number;
  readonly window?: {
    readonly startAtMs: number;
    readonly endAtMs: number;
    readonly asOfMs: number;
  };
}

export interface RuntimeTelemetryComparisonRow extends RuntimeTelemetrySourceSummary {
  readonly endpointId: string;
  readonly modelId: string | null;
  readonly upstreamModelId?: string | null;
  readonly reasoningEffort?: string | null;
  readonly effortSource?: string | null;
  readonly providerKind?: string | null;
  readonly providerFamily?: string | null;
  readonly vendorId?: string | null;
  readonly promptCacheSupported?: boolean;
  readonly sourceType: "local" | "remote";
  readonly providerId?: string | null;
  readonly endpointKind?: string | null;
  readonly servingSource?: string | null;
  readonly healthStatus?: string;
  readonly status?: string;
  readonly roleIds?: readonly string[];
}

export interface RuntimeTelemetryRequestRecord {
  readonly requestId: string;
  readonly clientRequestId?: string | null;
  readonly routingDecisionId?: string;
  readonly endpointId: string;
  readonly upstreamModelId?: string | null;
  readonly reasoningEffort?: string | null;
  readonly effortSource?: string | null;
  readonly requestClass?: "benchmark" | "live_request" | "unknown";
  readonly conversationId?: string;
  readonly createdAtMs: number;
  readonly modelId?: string | null;
  readonly selectedModelId?: string | null;
  readonly providerKind?: string | null;
  readonly providerFamily?: string | null;
  readonly vendorId?: string | null;
  readonly sourceType: "local" | "remote";
  readonly providerId?: string | null;
  readonly executionFamily?: string | null;
  readonly adapterFamily?: string | null;
  readonly endpointKind?: string | null;
  readonly servingSource?: string | null;
  readonly healthStatus?: string;
  readonly status?: string;
  readonly roleIds?: readonly string[];
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
  readonly latencyMs?: number | null;
  readonly errorClass?: string | null;
  readonly statusCode?: number | null;
  readonly finishReason?: string | null;
  readonly promptCacheRequested?: boolean;
  readonly promptCacheSupported?: boolean;
  readonly promptCacheUsed?: boolean;
  readonly cacheReadTokens?: number;
  readonly cacheReadTokensSupported?: boolean;
  readonly cacheWriteTokens?: number;
  readonly cacheWriteTokensSupported?: boolean;
  readonly streamTextDeltaCount?: number;
  readonly streamTextSupported?: boolean;
  readonly streamToolCallDeltaCount?: number;
  readonly streamToolCallSupported?: boolean;
  readonly streamToolArgumentDeltaCount?: number;
  readonly streamToolArgumentSupported?: boolean;
  readonly toolCallCount?: number;
  readonly toolExecutionCount?: number;
  readonly costProvenance?: "actual" | "estimated" | "unavailable";
  readonly actualCostUsd?: number | null;
  readonly estimatedCostUsd?: number | null;
  readonly currency?: string | null;
  readonly taxonomyGroupId?: string | null;
  readonly taxonomyRoleId?: string | null;
  readonly taxonomyTaskType?: string | null;
  readonly taxonomyTaskVariant?: string | null;
  readonly taxonomyCapabilityIds?: readonly string[];
  readonly taxonomyModalityIds?: readonly string[];
  readonly taxonomyToolClassIds?: readonly string[];
  readonly dimensions?: Record<string, unknown> | null;
}

export interface RuntimeTelemetryDashboard {
  readonly summary: RuntimeTelemetrySummary;
  readonly rows: readonly RuntimeTelemetryComparisonRow[];
  readonly requests: readonly RuntimeTelemetryRequestRecord[];
}

export interface RuntimeTelemetryRequestPage {
  readonly items: readonly RuntimeTelemetryRequestRecord[];
  readonly totalMatching: number;
  readonly returned: number;
  readonly pageSize: number;
  readonly truncated: boolean;
  readonly nextCursor: string | null;
  readonly window: {
    readonly startAtMs: number;
    readonly endAtMs: number;
    readonly asOfMs: number;
  };
}

export interface RuntimeTelemetryStreamEvent {
  readonly eventName: "telemetry.update";
  readonly emittedAtMs: number;
  readonly summary?: RuntimeTelemetrySummary;
  readonly request: RuntimeTelemetryRequestRecord;
}

export interface RuntimeRevisionStreamEvent extends RuntimeRevisionUpdate {
  readonly eventName: "revision.update";
}

/** A canonical server-sent update that requires runtime-backed UI data to refresh. */
export type RuntimeRefreshStreamEvent = RuntimeTelemetryStreamEvent | RuntimeRevisionStreamEvent;

export type RuntimeTelemetryAnalyticsGranularity = "hour" | "day" | "week";

export type RuntimeTelemetryAnalyticsMetric =
  | "requestCount"
  | "successCount"
  | "failureCount"
  | "inputTokens"
  | "outputTokens"
  | "totalTokens"
  | "cacheHitTokens"
  | "cacheReadTokens"
  | "cacheBackedRequestRate"
  | "cacheHitTokenRate"
  | "actualCostUsd"
  | "estimatedCostUsd"
  | "effectiveCostUsd"
  | "selectedUncachedCostUsd"
  | "baselineMaxEligibleCostUsd"
  | "routingCostSavingsUsd"
  | "cacheCostSavingsUsd"
  | "totalAvoidedCostUsd"
  | "averageLatencyMs"
  | "p95LatencyMs";

export type RuntimeTelemetryAnalyticsDimension =
  | "sourceType"
  | "endpointId"
  | "modelId"
  | "reasoningEffort"
  | "effortSource"
  | "providerId"
  | "providerKind"
  | "providerFamily"
  | "providerAccountId"
  | "requestedRoleId"
  | "selectedStrategy"
  | "routingMode"
  | "difficultyBucket"
  | "statusFamily"
  | "requestOperation"
  | "taxonomyGroupId"
  | "taxonomyRoleId"
  | "taxonomyTaskType"
  | "taxonomyTaskVariant"
  | "taxonomyCapabilityId"
  | "taxonomyModalityId"
  | "taxonomyToolClassId";

export interface RuntimeTelemetryAnalyticsFilters {
  readonly sourceTypes?: readonly ("local" | "remote")[];
  readonly endpointIds?: readonly string[];
  readonly modelIds?: readonly string[];
  readonly reasoningEfforts?: readonly string[];
  readonly effortSources?: readonly string[];
  readonly providerIds?: readonly string[];
  readonly providerKinds?: readonly string[];
  readonly providerFamilies?: readonly string[];
  readonly providerAccountIds?: readonly string[];
  readonly requestedRoleIds?: readonly string[];
  readonly selectedStrategies?: readonly string[];
  readonly routingModes?: readonly ("baseline" | "difficulty" | "controller" | "hybrid")[];
  readonly difficultyBuckets?: readonly ("easy" | "medium" | "hard")[];
  readonly statusFamilies?: readonly ("success" | "failure" | "unknown")[];
  readonly requestOperations?: readonly string[];
  readonly taxonomyGroupIds?: readonly string[];
  readonly taxonomyRoleIds?: readonly string[];
  readonly taxonomyTaskTypes?: readonly string[];
  readonly taxonomyTaskVariants?: readonly string[];
  readonly taxonomyCapabilityIds?: readonly string[];
  readonly taxonomyModalityIds?: readonly string[];
  readonly taxonomyToolClassIds?: readonly string[];
}

export interface RuntimeTelemetryAnalyticsRanking {
  readonly dimension: RuntimeTelemetryAnalyticsDimension;
  readonly metric: RuntimeTelemetryAnalyticsMetric;
  readonly limit?: number;
}

export interface RuntimeTelemetryAnalyticsQuery {
  readonly startAtMs?: number;
  readonly endAtMs?: number;
  readonly windowMs?: number;
  readonly granularity: RuntimeTelemetryAnalyticsGranularity;
  readonly metrics: readonly RuntimeTelemetryAnalyticsMetric[];
  readonly breakdown?: RuntimeTelemetryAnalyticsDimension | null;
  readonly filters?: RuntimeTelemetryAnalyticsFilters;
  readonly ranking?: RuntimeTelemetryAnalyticsRanking | null;
}

export type RuntimeTelemetryAnalyticsSupportStatus = "supported" | "partial" | "unsupported";

export interface RuntimeTelemetryAnalyticsMetricSupport {
  readonly metric: RuntimeTelemetryAnalyticsMetric;
  readonly status: RuntimeTelemetryAnalyticsSupportStatus;
  readonly aggregation: string;
  readonly matchedRowCount: number;
  readonly supportedRowCount: number;
  readonly unsupportedRowCount: number;
  readonly nullValueCount: number;
  readonly reason: string | null;
}

export interface RuntimeTelemetryAnalyticsDimensionSupport {
  readonly dimension: RuntimeTelemetryAnalyticsDimension;
  readonly status: RuntimeTelemetryAnalyticsSupportStatus;
  readonly matchedRowCount: number;
  readonly populatedRowCount: number;
  readonly sparseRowCount: number;
  readonly reason: string | null;
}

export interface RuntimeTelemetryAnalyticsSeries {
  readonly key: string;
  readonly label: string;
  readonly metrics: Readonly<Record<string, number | null>>;
}

export interface RuntimeTelemetryAnalyticsBucket {
  readonly startAtMs: number;
  readonly endAtMs: number;
  readonly totals: Readonly<Record<string, number | null>>;
  readonly series: readonly RuntimeTelemetryAnalyticsSeries[];
}

export interface RuntimeTelemetryAnalyticsRankingRow {
  readonly key: string;
  readonly label: string;
  readonly value: number | null;
}

export interface RuntimeTelemetryAnalyticsIdentityProjection {
  readonly dimension: RuntimeTelemetryAnalyticsDimension;
  readonly key: string;
  readonly label: string;
  readonly aggregationScope:
    | "endpoint-instance"
    | "upstream-model"
    | "reasoning-effort"
    | "effort-source"
    | "dimension-value";
  readonly endpointId?: string | null;
  readonly modelId?: string | null;
  readonly reasoningEffort?: string | null;
  readonly effortSource?: string | null;
  readonly sourceType?: "local" | "remote" | null;
}

export interface RuntimeTelemetryAnalyticsResponse {
  readonly startAtMs: number;
  readonly endAtMs: number;
  readonly appliedQuery?: RuntimeTelemetryAnalyticsQuery;
  readonly granularity: RuntimeTelemetryAnalyticsGranularity;
  readonly metrics: readonly RuntimeTelemetryAnalyticsMetric[];
  readonly breakdown: RuntimeTelemetryAnalyticsDimension | null;
  readonly buckets: readonly RuntimeTelemetryAnalyticsBucket[];
  readonly totals: Readonly<Record<string, number | null>>;
  readonly ranking: {
    readonly dimension: RuntimeTelemetryAnalyticsDimension;
    readonly metric: RuntimeTelemetryAnalyticsMetric;
    readonly rows: readonly RuntimeTelemetryAnalyticsRankingRow[];
  } | null;
  readonly labels: Partial<Record<RuntimeTelemetryAnalyticsDimension, Record<string, string>>>;
  readonly identities?: Partial<
    Record<
      RuntimeTelemetryAnalyticsDimension,
      Record<string, RuntimeTelemetryAnalyticsIdentityProjection>
    >
  >;
  readonly metadata?: {
    readonly scannedRowCount: number;
    readonly matchedRowCount: number;
    readonly aggregationRowCount: number;
    readonly truncated: boolean;
    readonly truncationReason: string | null;
    readonly generatedAtMs?: number;
    readonly taxonomyCoverage?: {
      readonly matchedRowCount: number;
      readonly richerTaxonomyRowCount: number;
      readonly legacyRowCount: number;
      readonly coverageRate: number;
      readonly backfillPerformed: false;
    };
  };
  readonly metricSupport?: Partial<
    Record<RuntimeTelemetryAnalyticsMetric, RuntimeTelemetryAnalyticsMetricSupport>
  >;
  readonly dimensionSupport?: Partial<
    Record<RuntimeTelemetryAnalyticsDimension, RuntimeTelemetryAnalyticsDimensionSupport>
  >;
}

export interface RuntimeEventSourceLike {
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  close(): void;
}

export type RuntimeEventSourceFactory = (url: string) => RuntimeEventSourceLike;

export interface RuntimeModelRecord {
  readonly id: string;
  readonly object?: string;
  readonly owned_by?: string;
  readonly type?: "model" | "alias" | "endpoint" | string;
  readonly providerId?: string;
  readonly displayName?: string;
  readonly endpoint_id?: string | null;
  readonly upstreamModelId?: string | null;
  readonly upstream_model_id?: string | null;
  readonly reasoningEffort?: string | null;
  readonly reasoning_effort?: string | null;
  readonly fixedEffort?: string | null;
  readonly fixed_effort?: string | null;
  readonly effortSource?: "fixed" | "provider-default" | "unknown" | string | null;
  readonly effort_source?: "fixed" | "provider-default" | "unknown" | string | null;
  readonly reasoningEffortLevels?: readonly string[];
  readonly reasoning_effort_levels?: readonly string[];
  readonly reasoning?: {
    readonly supported?: boolean;
    readonly effortControl?: boolean;
    readonly effortLevels?: readonly string[];
    readonly effort_levels?: readonly string[];
  } | null;
  readonly endpoint_ids?: readonly string[];
  readonly capabilities?: readonly string[];
  readonly modalities?: readonly string[];
  readonly contextWindow?: number | null;
  readonly maxOutputTokens?: number | null;
  readonly pricing?: {
    readonly inputPer1M: number;
    readonly outputPer1M: number;
    readonly currency: string;
  } | null;
  readonly peerID?: string;
}

export interface RuntimeControllerAssignment {
  readonly scope: string;
  readonly endpointId: string;
  readonly modelId: string;
  readonly displayName?: string | null;
  readonly upstreamModelId?: string | null;
  readonly reasoningEffort?: string | null;
  readonly sourceType: "local" | "remote";
  readonly status?: string;
  readonly updatedAtMs?: number;
}

export interface RuntimeDownstreamOpenAIProviderConfig {
  readonly kind: "openai-compatible";
  readonly providerId: string;
  readonly displayName: string;
  readonly baseUrl: string;
  readonly endpoints: {
    readonly health: string;
    readonly models: string;
    readonly chatCompletions: string;
  };
  readonly authentication: {
    readonly type: "bearer";
    readonly headerName: string;
    readonly required: boolean;
    readonly placeholderToken: string;
    readonly note: string;
  };
  readonly models: readonly RuntimeModelRecord[];
  readonly setup: {
    readonly recommendedModel: string | null;
    readonly notes: readonly string[];
  };
}

export interface RuntimeTokenMetrics {
  readonly cache_tokens: number;
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly prompt_per_second: number;
  readonly tokens_per_second: number;
}

export interface RuntimeActivityLogEntry {
  readonly id: number;
  /** Stable persisted identity; `id` remains for legacy clients. */
  readonly request_id?: string;
  readonly timestamp: string;
  /** Already effort-scoped when the host has endpoint identity metadata. */
  readonly model: string;
  readonly modelId?: string | null;
  readonly endpointId?: string | null;
  readonly upstreamModelId?: string | null;
  readonly reasoningEffort?: string | null;
  readonly req_path: string;
  readonly resp_content_type: string;
  readonly resp_status_code: number;
  readonly tokens: RuntimeTokenMetrics;
  readonly duration_ms: number;
  readonly has_capture: boolean;
}

export interface RuntimeActivityMetricsPage {
  readonly items: readonly RuntimeActivityLogEntry[];
  readonly totalMatching: number;
  readonly returned: number;
  readonly pageSize: number;
  readonly truncated: boolean;
  readonly nextCursor: string | null;
  readonly window: {
    readonly startAtMs: number;
    readonly endAtMs: number;
    readonly asOfMs: number;
  };
}

export interface RuntimeActivityCapture {
  readonly id: number;
  readonly request_id?: string;
  readonly req_path: string;
  readonly req_headers: Record<string, string>;
  readonly req_body: string;
  readonly resp_headers: Record<string, string>;
  readonly resp_body: string;
}

export interface RuntimeVersionInfo {
  readonly build_date: string;
  readonly commit: string;
  readonly release_version?: string;
  readonly version: string;
}

export interface RuntimeImageGenerationRequest {
  readonly model: string;
  readonly prompt: string;
  readonly n?: number;
  readonly size?: string;
}

export interface RuntimeImageGenerationResponse {
  readonly created: number;
  readonly data: ReadonlyArray<{
    readonly url?: string;
    readonly b64_json?: string;
  }>;
}

export interface RuntimeSdApiTxt2ImgRequest {
  readonly model?: string;
  readonly prompt: string;
  readonly negative_prompt?: string;
  readonly width?: number;
  readonly height?: number;
  readonly steps?: number;
  readonly cfg_scale?: number;
  readonly seed?: number;
  readonly batch_size?: number;
  readonly sampler_name?: string;
  readonly scheduler?: string;
}

export interface RuntimeSdApiResponse {
  readonly images: readonly string[];
  readonly parameters: Record<string, unknown>;
  readonly info: string;
}

export interface RuntimeAudioVoiceRecord {
  readonly id?: string;
  readonly voice?: string;
  readonly name?: string;
  readonly label?: string;
  readonly description?: string;
  readonly [key: string]: unknown;
}

export interface RuntimeSpeechGenerationRequest {
  readonly model: string;
  readonly input: string;
  readonly voice: string;
}

export interface RuntimeAudioTranscriptionResponse {
  readonly text: string;
}

export interface RuntimeRerankRequest {
  readonly model: string;
  readonly query: string;
  readonly documents: readonly string[];
}

export interface RuntimeRerankResponse {
  readonly results: ReadonlyArray<{
    readonly index: number;
    readonly relevance_score: number;
  }>;
  readonly usage?: Record<string, number>;
}

export interface RuntimeSnapshot {
  readonly summary: RuntimeSummary;
  readonly providers: readonly RuntimeProvider[];
  readonly accounts: readonly RuntimeAccount[];
  readonly deviceAuthorizations: readonly RuntimeDeviceAuthorization[];
  readonly endpoints: readonly RuntimeEndpoint[];
  readonly requests: readonly RuntimeRequestListItem[];
  readonly models: readonly RuntimeModelRecord[];
  readonly roles: readonly RuntimeRoleDefinition[];
}

export interface ProvidersSnapshot {
  readonly summary: RuntimeSummary;
  readonly providers: readonly RuntimeProvider[];
  readonly accounts: readonly RuntimeAccount[];
  readonly deviceAuthorizations: readonly RuntimeDeviceAuthorization[];
  readonly endpoints: readonly RuntimeEndpoint[];
  readonly models: readonly RuntimeModelRecord[];
  readonly roles: readonly RuntimeRoleDefinition[];
}

export interface RuntimeShellSnapshot {
  readonly summary: RuntimeSummary;
  readonly controller: RuntimeControllerAssignment | null;
  readonly configRecord: RuntimeConfigRecord;
  readonly version: RuntimeVersionInfo;
}

export interface RuntimeDashboardSnapshot {
  readonly endpoints: readonly RuntimeEndpoint[];
  readonly roles: readonly RuntimeRoleDefinition[];
}

export interface RuntimeRequestDetail {
  readonly requestId: string;
  readonly endpointId: string;
  readonly effectiveCostUsd?: number;
  readonly costCalculationBasis?:
    | "actual_vendor_cost"
    | "estimated_vendor_cost"
    | "no_execution_zero"
    | "unknown";
  readonly costCalculationVersion?: string;
  readonly selectedUncachedCostUsd?: number | null;
  readonly baselineMaxEligibleCostUsd?: number | null;
  readonly routingCostSavingsUsd?: number;
  readonly cacheCostSavingsUsd?: number;
  readonly totalAvoidedCostUsd?: number;
  readonly costBaselineSource?: string | null;
  readonly costSavingsSupport?: string | null;
  readonly [key: string]: unknown;
}

export interface RouterSummary {
  readonly strategy: string | null;
  readonly executionMode: "decision_only" | "hybrid" | "local_only" | "remote_only";
  readonly controller: RuntimeControllerAssignment | null;
  readonly configuredCandidateCount: number;
  readonly recentDecisionCount: number;
  readonly aliasInventory?: readonly {
    readonly aliasId: string;
    readonly mode: string;
    readonly configuredHintModelIds: readonly string[];
    readonly allowEndpointIds: readonly string[];
    readonly resolvedModelIds: readonly string[];
    readonly driftWarnings: readonly {
      readonly aliasId: string;
      readonly hintModelId: string;
      readonly suggestedModelIds: readonly string[];
      readonly message: string;
    }[];
    readonly localEndpointCount: number;
    readonly remoteEndpointCount: number;
    readonly activeEndpointCount: number;
    readonly healthyEndpointCount: number;
    readonly readiness: "ready" | "degraded" | "unavailable";
  }[];
  readonly guidance?: {
    readonly endpointId?: string | null;
    readonly preferredEndpointIds?: readonly string[];
    readonly ignoredEndpointIds?: readonly string[];
  };
}

export interface RouterConfig {
  readonly persisted: {
    readonly strategy: string | null;
    readonly executionMode: "decision_only" | "hybrid" | "local_only" | "remote_only";
  };
  readonly controller: RuntimeControllerAssignment | null;
  readonly guidance: {
    readonly endpointId?: string | null;
    readonly preferredEndpointIds: readonly string[];
    readonly ignoredEndpointIds: readonly string[];
  };
  readonly sources?: Record<string, unknown>;
  readonly policySources: {
    readonly roles: readonly Record<string, unknown>[];
    readonly tasks: readonly Record<string, unknown>[];
    readonly roleBindings?: readonly Record<string, unknown>[];
  };
}

export interface BenchmarkCapability {
  readonly evidenceSource?: "run-artifact" | "profile-derived";
  readonly overallScore: number | null;
  readonly scoresByBucket?: Partial<
    Record<"easy" | "medium" | "hard", { readonly score: number; readonly cases?: number }>
  >;
  readonly taskScores?: Record<string, number>;
  readonly roleScores?: Record<string, number>;
  readonly eligibleRoleScores?: Record<string, number>;
  readonly groupScores?: Record<string, number>;
  readonly taxonomyScores?: Partial<{
    readonly byRole: Record<string, number>;
    readonly byTask: Record<string, number>;
    readonly byVariant: Record<string, number>;
    readonly byCapability: Record<string, number>;
    readonly byModality: Record<string, number>;
    readonly byToolClass: Record<string, number>;
  }>;
  readonly coverage?: {
    readonly overallCases: number;
    readonly roleCases?: Record<string, number>;
    readonly groupCases?: Record<string, number>;
    readonly lowCoverageRoleIds?: readonly string[];
    readonly lowCoverageGroupIds?: readonly string[];
  };
  readonly benchmarkSamples: number;
  readonly sampleCount: number;
  readonly measuredAtMs: number | null;
  readonly freshnessScore: number | null;
  readonly lastRunId: string | null;
  readonly lastRunCompletedAtMs: number | null;
  readonly lastRunMode?: "quick" | "full" | null;
  readonly lastRunSuiteId?: string | null;
  readonly judgeEndpointId: string | null;
  readonly judgeModelId?: string | null;
}

export interface RouterCandidate {
  readonly endpointId: string;
  readonly modelId: string;
  readonly displayName?: string | null;
  readonly upstreamModelId?: string | null;
  readonly reasoningEffort?: string | null;
  readonly effortSource?: string | null;
  readonly providerId: string | null;
  readonly sourceType: "local" | "remote";
  readonly endpointKind?: string;
  readonly servingSource?: string;
  readonly healthStatus?: string;
  readonly status?: string;
  readonly controllerEligible?: boolean;
  readonly executionModeEligible?: boolean;
  readonly routingEligible?: boolean;
  readonly benchmarkEligible?: boolean;
  readonly preferred?: boolean;
  readonly ignored?: boolean;
  readonly roleBindings?: readonly string[];
  readonly capabilities?: readonly string[];
  readonly toolCallingSupported?: boolean;
  readonly toolCallingStyle?: string;
  readonly latestProfile?: Record<string, unknown> | null;
  readonly operationalProfile?: Record<string, unknown> | null;
  readonly profileSemantics?: {
    readonly version: string;
    readonly operational: "live-request-only";
    readonly benchmark: "run-artifact-only";
    readonly legacyLatestProfile: "alias-of-operational-profile";
  };
  readonly pricing?: Record<string, unknown> | null;
  readonly telemetryScores?: {
    readonly taskSuccessRates?: Record<string, number>;
    readonly taskRollups?: Record<
      string,
      {
        readonly successRate: number;
        readonly successCount: number;
        readonly failureCount: number;
        readonly sampleCount: number;
        readonly minimumSampleCount: number;
        readonly windowStartMs: number;
        readonly windowEndMs: number;
        readonly measuredAtMs: number;
      }
    >;
  };
  readonly recentSamples?: readonly unknown[];
  readonly difficultyProfiles?: Record<string, unknown>;
  readonly advisoryMaxDifficultyRecommendation?: Record<string, unknown> | null;
  readonly benchmarkCapability?: BenchmarkCapability | null;
  readonly routingBenchmarkQuality?: {
    readonly hardBlend?: {
      readonly full: number;
      readonly quick: number;
      readonly blended: number;
    };
    readonly quality_score?: number;
    readonly judge_score?: number;
  } | null;
  readonly routingQualityScore?: number | null;
}

export interface BenchmarkCaseComparison {
  readonly caseId: string;
  readonly relativeRanking: readonly string[];
  readonly rationale: string;
  readonly compareFallback?: boolean;
  readonly compareError?: string | null;
}

export interface BenchmarkCaseAuditEntry {
  readonly caseId: string;
  readonly endpointId: string;
  readonly latencyMs?: number;
  readonly parseSuccess?: boolean;
  readonly judgeError?: string | null;
  readonly judgeUnavailable?: boolean;
  readonly cappedByValidator?: boolean;
  readonly gradingMethod?: string;
}

export interface BenchmarkSummariesByMode {
  readonly full: BenchmarkSummary;
  readonly quick: BenchmarkSummary;
}

export interface BenchmarkRunListEntry {
  readonly runId: string;
  readonly mode: "quick" | "full";
  readonly completedAtMs: number;
  readonly suiteId: string;
  readonly caseCount: number;
  readonly endpointIds: readonly string[];
}

export interface BenchmarkClearAllResult {
  readonly clearedSampleCount: number;
  readonly affectedEndpointCount: number;
  readonly clearedRunCount: number;
}

export interface BenchmarkSummarySubject {
  readonly endpointId: string;
  readonly modelId: string;
  readonly sourceType?: string | null;
  readonly reasoningEffort?: string | null;
  readonly displayName?: string | null;
  readonly upstreamModelId?: string | null;
  readonly overallScore: number;
  readonly scoresByBucket: Record<
    "easy" | "medium" | "hard",
    { readonly score: number; readonly cases: number }
  >;
  readonly passingCaseIds: readonly string[];
  readonly caseCount: number;
  readonly taxonomyScores?: {
    readonly byRole?: Record<string, number>;
    readonly byTask?: Record<string, number>;
    readonly byVariant?: Record<string, number>;
    readonly byCapability?: Record<string, number>;
    readonly byModality?: Record<string, number>;
    readonly byToolClass?: Record<string, number>;
  };
  readonly taxonomyCoverage?: {
    readonly byRole?: Record<string, number>;
    readonly byTask?: Record<string, number>;
    readonly byVariant?: Record<string, number>;
    readonly byCapability?: Record<string, number>;
    readonly byModality?: Record<string, number>;
    readonly byToolClass?: Record<string, number>;
  };
}

export interface BenchmarkPortfolioEntry extends BenchmarkSummarySubject {
  readonly runId: string;
  readonly completedAtMs: number;
  readonly mode: "quick" | "full";
  readonly suiteId: string;
  readonly judgeEndpointId: string | null;
  readonly judgeModelId: string | null;
}

export interface BenchmarkPortfolio {
  readonly scoreSemantics: {
    readonly storageScale: "normalized-fraction-0-to-1";
    readonly displayScale: "percentage-0-to-100";
    readonly overallAggregation: "unweighted-arithmetic-mean-of-executed-case-scores";
    readonly currentEvidencePolicy: "latest-completed-run-per-endpoint";
    readonly replacementScope: "endpoint-only";
    readonly zeroScoreMeaning: "executed-zero-credit";
    readonly absentScoreMeaning: "no-evidence";
  };
  readonly entries: readonly BenchmarkPortfolioEntry[];
}

export interface BenchmarkSummary {
  readonly runId: string | null;
  readonly completedAtMs: number | null;
  readonly mode: "quick" | "full" | null;
  readonly suiteId: string | null;
  readonly suiteVersion: string | null;
  readonly judgeEndpointId: string | null;
  readonly judgeModelId: string | null;
  readonly artifactRoot: string | null;
  readonly subjects: readonly BenchmarkSummarySubject[];
  readonly caseComparisons: readonly BenchmarkCaseComparison[];
  readonly caseAudits: readonly BenchmarkCaseAuditEntry[];
  readonly manifest: {
    readonly executionCompletedAtMs: number;
    readonly gradingCompletedAtMs: number;
    readonly judgeArtifactCount: number;
    readonly compareArtifactCount: number;
  } | null;
}

export interface BenchmarkPreferences {
  readonly judgeEndpointId?: string;
}

export interface RouterDecisionListItem {
  readonly requestId: string;
  readonly routingDecisionId: string | null;
  readonly selectedEndpointId: string;
  readonly selectedModelId: string | null;
  readonly displayName?: string | null;
  readonly upstreamModelId?: string | null;
  readonly reasoningEffort?: string | null;
  readonly effortSource?: string | null;
  readonly strategyLabel: string | null;
  readonly decidedAtMs?: number;
  readonly sourceType?: "local" | "remote";
  readonly providerId?: string | null;
  readonly finishReason?: string | null;
  readonly membershipRevision?: string | null;
  readonly profileRevision?: string | null;
}

export interface RouterDecisionPage {
  readonly items: readonly RouterDecisionListItem[];
  readonly totalMatching: number;
  readonly returned: number;
  readonly pageSize: number;
  readonly truncated: boolean;
  readonly nextCursor: string | null;
  readonly window: {
    readonly startAtMs: number;
    readonly endAtMs: number;
    readonly asOfMs: number;
  };
}

export interface RouterDecisionDetail {
  readonly requestId: string;
  readonly routingDecisionId: string | null;
  readonly selectedEndpointId: string;
  readonly selectedModelId: string | null;
  readonly displayName?: string | null;
  readonly upstreamModelId?: string | null;
  readonly reasoningEffort?: string | null;
  readonly effortSource?: string | null;
  readonly fallbackEndpointIds: readonly string[];
  readonly strategyLabel: string | null;
  readonly decision?: Record<string, unknown> | null;
  readonly benchmarkEvidence?: {
    readonly endpointId: string;
    readonly effectiveQualityScore: number;
    readonly overallScore: number;
    readonly taskScore: number | null;
    readonly roleScore: number | null;
    readonly groupScore: number | null;
    readonly reason: string | null;
    readonly source: string;
    readonly evidenceSource: string;
    readonly runId: string | null;
    readonly runCompletedAtMs: number | null;
    readonly runMode: string | null;
    readonly suiteId: string | null;
    readonly judgeEndpointId: string | null;
    readonly judgeModelId: string | null;
    readonly freshnessWeight: number | null;
  } | null;
  readonly telemetryEvidence?: {
    readonly endpointId: string;
    readonly modelId: string | null;
    readonly reasoningEffort: string | null;
    readonly effortSource: string | null;
    readonly operationalProfile: {
      readonly scope: string;
      readonly semanticsVersion: string | null;
      readonly sampleCount: number | null;
      readonly windowStartMs: number | null;
      readonly windowEndMs: number | null;
      readonly measuredAtMs: number | null;
      readonly freshnessScore: number | null;
      readonly confidenceScore: number | null;
      readonly latencyP50Ms: number | null;
      readonly latencyP95Ms: number | null;
      readonly failureRate: number | null;
      readonly tokensPerSec: number | null;
      readonly observedCostPer1kTokens: number | null;
    } | null;
    readonly taskTelemetry: {
      readonly available: boolean;
      readonly eligible: boolean;
      readonly applied: boolean;
      readonly withheldReason: string | null;
      readonly successRate: number | null;
      readonly successCount: number | null;
      readonly failureCount: number | null;
      readonly sampleCount: number | null;
      readonly minimumSampleCount: number | null;
      readonly windowStartMs: number | null;
      readonly windowEndMs: number | null;
      readonly measuredAtMs: number | null;
    };
  } | null;
  readonly routingDiagnostics?: Record<string, unknown> | null;
  readonly retrievalReceipt?: Record<string, unknown> | null;
  readonly contextEnvelope?: Record<string, unknown> | null;
  readonly request: RuntimeRequestDetail;
  readonly endpointProfile: RuntimeEndpointProfile | null;
  readonly observeRequestPath: string;
}
export interface RuntimeEndpointProfile {
  readonly endpointId: string;
  readonly latestProfile: Record<string, unknown> | null;
  readonly operationalProfile?: Record<string, unknown> | null;
  readonly profileSemantics?: Record<string, unknown>;
  readonly recentSamples: readonly unknown[];
  readonly recentSamplesBySource?: {
    readonly liveRequest: readonly unknown[];
    readonly benchmark: readonly unknown[];
  };
}

export interface WorkbenchChatInput {
  readonly model: string;
  readonly messages: readonly {
    readonly role: string;
    readonly content: string;
  }[];
  readonly endpointId?: string;
  readonly routingModeOverride?: "baseline" | "difficulty" | "controller" | "hybrid";
}

async function extractErrorMessage(response: Response, path: string): Promise<string> {
  const status = response.status;
  try {
    const body = await response.json();
    const detail =
      typeof body.error === "string"
        ? body.error
        : typeof body.error?.message === "string"
          ? body.error.message
          : JSON.stringify(body);
    const structuredDetail =
      typeof body.code === "string"
        ? `${body.code}${
            Array.isArray(body.references)
              ? `: ${body.references
                  .map((reference: unknown) =>
                    reference &&
                    typeof reference === "object" &&
                    typeof (reference as { path?: unknown }).path === "string"
                      ? (reference as { path: string }).path
                      : null,
                  )
                  .filter(Boolean)
                  .join(", ")}`
              : ""
          } — ${detail}`
        : detail;
    return `Request to ${path} failed with ${status}: ${structuredDetail}`;
  } catch {
    try {
      const text = await response.text();
      return `Request to ${path} failed with ${status}: ${text || "No details"}`;
    } catch {
      return `Request to ${path} failed with ${status}`;
    }
  }
}

async function fetchJson<TValue>(
  path: string,
  fetcher: RuntimeFetcher,
  init?: RequestInit,
): Promise<TValue> {
  const response = await fetcher(path, init);
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response.clone(), path));
  }
  const responseClone = response.clone();
  try {
    return (await response.json()) as TValue;
  } catch {
    const responseText = await responseClone.text().catch(() => "");
    const normalizedText = responseText.trimStart();
    if (normalizedText.startsWith("<!DOCTYPE html") || normalizedText.startsWith("<html")) {
      throw new Error(`Request to ${path} returned HTML instead of JSON.`);
    }
    throw new Error(`Request to ${path} returned an invalid JSON response.`);
  }
}

const RUNTIME_SUMMARY_RETRY_DELAYS_MS = [150, 300] as const;
const RUNTIME_INITIALIZING_RETRY_DELAYS_MS = [200, 500, 1000, 2000] as const;

async function sleep(delayMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function isRuntimeInitializingError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("runtime_initializing");
}

async function withRuntimeInitializingRetry<TValue>(
  operation: () => Promise<TValue>,
): Promise<TValue> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RUNTIME_INITIALIZING_RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) {
      await sleep(RUNTIME_INITIALIZING_RETRY_DELAYS_MS[attempt - 1]);
    }
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRuntimeInitializingError(error)) {
        throw error;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Runtime API is still initializing.");
}

async function fetchRuntimeSummaryWithRetry(fetcher: RuntimeFetcher): Promise<RuntimeSummary> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RUNTIME_SUMMARY_RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) {
      await sleep(RUNTIME_SUMMARY_RETRY_DELAYS_MS[attempt - 1]);
    }
    try {
      return await fetchJson<RuntimeSummary>("/api/role-model/runtime/summary", fetcher);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Request to /api/role-model/runtime/summary failed.");
}

async function fetchText(
  path: string,
  fetcher: RuntimeFetcher,
  init?: RequestInit,
): Promise<string> {
  const response = await fetcher(path, init);
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response.clone(), path));
  }
  return response.text();
}

async function fetchBlob(path: string, fetcher: RuntimeFetcher, init?: RequestInit): Promise<Blob> {
  const response = await fetcher(path, init);
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response.clone(), path));
  }
  return response.blob();
}

async function postJson<TValue>(
  path: string,
  payload: unknown,
  fetcher: RuntimeFetcher,
): Promise<TValue> {
  return fetchJson<TValue>(path, fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

async function putJson<TValue>(
  path: string,
  payload: unknown,
  fetcher: RuntimeFetcher,
): Promise<TValue> {
  return fetchJson<TValue>(path, fetcher, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function fetchRuntimeProviders(
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeProvider[]> {
  return fetchJson<RuntimeProvider[]>("/api/role-model/providers", fetcher);
}

export async function fetchRuntimeAccounts(
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeAccount[]> {
  return fetchJson<RuntimeAccount[]>("/api/role-model/accounts", fetcher);
}

export async function fetchRuntimeDeviceAuthorizations(
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeDeviceAuthorization[]> {
  return fetchJson<RuntimeDeviceAuthorization[]>("/api/role-model/accounts/device", fetcher);
}

export async function fetchRuntimeEndpoints(
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeEndpoint[]> {
  return withRuntimeInitializingRetry(() =>
    fetchJson<RuntimeEndpoint[]>("/api/role-model/endpoints", fetcher),
  );
}

export async function fetchRuntimeRoles(
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeRoleDefinition[]> {
  return withRuntimeInitializingRetry(() =>
    fetchJson<RuntimeRoleDefinition[]>("/api/role-model/roles", fetcher),
  );
}

export async function fetchRuntimeRequests(
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeRequestListItem[]> {
  return fetchJson<RuntimeRequestListItem[]>("/api/role-model/requests", fetcher);
}

export async function fetchRuntimeModels(
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeModelRecord[]> {
  // The configured pool is the authority for the Models page. Do not silently fall
  // back to the OpenAI-compat /v1/models catalog, which is a different (base-family
  // keyed) projection and would mask a configured-pool outage as a "healthy" list.
  return fetchJson<RuntimeModelRecord[]>("/api/role-model/models", fetcher);
}

export async function fetchRuntimeCatalogModels(
  providerId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeModelRecord[]> {
  const normalizedProviderId = providerId.trim();
  if (!normalizedProviderId) {
    throw new Error("A provider id is required to load catalog models.");
  }
  return fetchJson<RuntimeModelRecord[]>(
    `/api/role-model/models?providerId=${encodeURIComponent(normalizedProviderId)}`,
    fetcher,
  );
}

export interface RuntimeExtensionStatus {
  readonly id: string;
  readonly packageClass: "canonical_extension" | "fixture_worker" | "interop_adapter";
  readonly lifecycle:
    | "installed_disabled"
    | "installed_active_pending_disclosure"
    | "starting"
    | "ready"
    | "degraded"
    | "stopping"
    | "stopped";
  readonly installed: boolean;
  readonly enabled: boolean;
  readonly enabledMode?: "disabled" | "shadow" | "advisory" | "bounded" | "active";
  readonly channel: string;
  readonly scope: string;
  readonly authorizationEpoch: number;
  readonly health: {
    readonly available: boolean;
    readonly routingDependency: boolean;
    readonly probe?: string;
    readonly summary?: string;
    readonly reason?: string;
    readonly knowledgeWorkerBootstrap?: {
      readonly receipt: KnowledgeValidationReceipt;
      readonly groupDigest: string;
    };
  };
  readonly permissions: readonly string[];
  readonly dataClasses: readonly string[];
  readonly retention: string;
  readonly degradation: string;
  readonly compatibility: readonly string[];
}

export async function fetchExtensions(
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeExtensionStatus[]> {
  return fetchJson<RuntimeExtensionStatus[]>("/api/role-model/extensions", fetcher);
}

export type RuntimeExtensionMode = "disabled" | "shadow" | "advisory" | "bounded" | "active";
export interface KnowledgeValidationReceipt {
  readonly payload: {
    readonly kind: "knowledge_validation";
    readonly reviewed: true;
    readonly safetyReviewed: true;
    readonly redacted: true;
    readonly holdoutPassed: true;
    readonly [key: string]: unknown;
  };
  readonly signature: string;
  readonly [key: string]: unknown;
}

export async function mutateExtension(
  input: {
    readonly id: string;
    readonly action: "enable" | "disable" | "set_mode" | "bootstrap_shadow_ready";
    readonly mode?: RuntimeExtensionMode;
    readonly receipt?: KnowledgeValidationReceipt;
    readonly groupDigest?: string;
  },
  fetcher: RuntimeFetcher = fetch,
): Promise<{
  readonly extensions: readonly RuntimeExtensionStatus[];
  readonly extension?: RuntimeExtensionStatus;
  readonly receipts?: readonly unknown[];
}> {
  return fetchJson("/api/role-model/extensions/mutate", fetcher, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

type ExtensionMutationResult = Awaited<ReturnType<typeof mutateExtension>>;

export async function prepareKnowledgeWorkerShadowReady(
  bootstrap: {
    readonly receipt: KnowledgeValidationReceipt;
    readonly groupDigest: string;
  },
  fetcher: RuntimeFetcher = fetch,
): Promise<ExtensionMutationResult> {
  return mutateExtension(
    {
      id: "knowledge-worker",
      action: "bootstrap_shadow_ready",
      receipt: bootstrap.receipt,
      groupDigest: bootstrap.groupDigest,
    },
    fetcher,
  );
}

export interface RuntimeStorageRetentionSummary {
  readonly revision: number;
  readonly totalBytes: number;
  readonly logicalClasses: readonly {
    readonly id: string;
    readonly tier?: string;
    readonly scope?: string;
    readonly bytes?: number;
    readonly count?: number;
    readonly owner?: string;
    readonly physicalResourceId?: string | null;
    readonly observationState?: string;
    readonly measurementSource?: string;
    readonly observedAt?: string;
    readonly retentionState?: string;
  }[];
  /** Backward-compatible alias for callers that still use the pre-SP8 name. */
  readonly categories: RuntimeStorageRetentionSummary["logicalClasses"];
  readonly physicalResources: readonly {
    readonly id: string;
    readonly owner: string;
    readonly health: string;
    readonly measurement: "measured" | "remote_observed" | "unavailable";
    readonly physicalBytes: number | null;
    readonly heldItems: number;
    readonly retentionState: string;
    readonly observationState?: string;
    readonly measurementSource?: string;
    readonly observedAt?: string;
  }[];
  readonly managedPolicy: boolean;
  readonly conflicts: readonly {
    readonly serviceId?: string;
    readonly reason: string;
    readonly count?: number;
  }[];
  readonly policies: readonly {
    readonly policyId: string;
    readonly scope: string;
    readonly maxBytes: number;
    readonly maxAgeDays: number;
  }[];
  readonly receipts: readonly {
    readonly id: string;
    readonly status: string;
    readonly affectedCount: number;
    readonly rollbackAvailable: boolean;
    readonly manifestHash?: string;
  }[];
  readonly activeJob: {
    readonly id: string;
    readonly status: string;
    readonly progress: number;
    readonly manifestHash: string;
    readonly scope: string;
  } | null;
  readonly currentPlan: {
    readonly manifestHash: string;
    readonly affectedCount: number;
    readonly estimatedBytes: number;
    readonly rollbackAvailable: boolean;
    readonly lostCapabilities: readonly string[];
    readonly retainedCapabilities: readonly string[];
    readonly blocks: readonly string[];
  } | null;
  readonly storageInventory?: {
    readonly schemaVersion: "role-model.storage-registry.v1" | "role-model.storage-registry.v2";
    readonly complete: boolean;
    readonly entries: readonly {
      readonly id: string;
      readonly owner: string;
      readonly health: string;
      readonly measurement: "measured" | "remote_observed" | "unavailable";
      readonly physicalBytes: number | null;
      readonly heldItems: number;
      readonly retentionState: string;
    }[];
    /** v2 keeps the measured physical inventory separate from logical accounting. */
    readonly physicalResources?: RuntimeStorageRetentionSummary["physicalResources"];
    readonly logicalClasses?: RuntimeStorageRetentionSummary["logicalClasses"];
  };
  // Run 94 SP8: measured physical accounting from the read-only storage audit plus
  // the measured policy state; absent until a real measurement exists.
  readonly storageAudit?: {
    readonly schemaVersion: "role-model.storage-audit.v1";
    readonly available?: boolean;
    readonly reason?: string;
    readonly allocatedBytes?: number;
    readonly logicalBytes?: number;
    readonly reclaimableBytes?: number;
    readonly heldBytes?: number | null;
    /** Physical allocation not attributable to logical rows; never a store health state. */
    readonly unattributedPhysicalBytes?: number;
    /** @deprecated Use unattributedPhysicalBytes. */
    readonly unavailableBytes?: number;
    readonly observationRows?: number;
    readonly graphEdges?: number;
    readonly measuredAt?: string;
  } | null;
  readonly policyState?: {
    readonly channel: string;
    readonly state: string;
    readonly policyId?: string;
    readonly scopedBytes?: number;
    readonly maxBytes?: number;
    readonly policyCount?: number;
    readonly error?: string;
  };
}

export async function fetchStorageRetention(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeStorageRetentionSummary> {
  return normalizeStorageRetentionSummary(
    await fetchJson<RuntimeStorageRetentionSummary>("/api/role-model/storage-retention", fetcher),
  );
}

function normalizeStorageRetentionSummary(
  value: RuntimeStorageRetentionSummary,
): RuntimeStorageRetentionSummary {
  const raw = value as RuntimeStorageRetentionSummary & {
    readonly logicalClasses?: RuntimeStorageRetentionSummary["logicalClasses"];
    readonly physicalResources?: RuntimeStorageRetentionSummary["physicalResources"];
  };
  const logicalClasses =
    raw.logicalClasses ?? raw.storageInventory?.logicalClasses ?? raw.categories ?? [];
  const physicalResources =
    raw.physicalResources ??
    raw.storageInventory?.physicalResources ??
    raw.storageInventory?.entries ??
    [];
  return {
    ...raw,
    logicalClasses,
    categories: raw.categories ?? logicalClasses,
    physicalResources,
    storageInventory: raw.storageInventory
      ? {
          ...raw.storageInventory,
          entries: physicalResources,
          physicalResources,
          logicalClasses,
        }
      : undefined,
  };
}

export async function requestRetentionDryRun(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeStorageRetentionSummary> {
  return normalizeStorageRetentionSummary(
    await fetchJson<RuntimeStorageRetentionSummary>(
      "/api/role-model/storage-retention/dry-run",
      fetcher,
      { method: "POST" },
    ),
  );
}

export async function updateRetentionPolicy(
  policy: {
    readonly policyId: string;
    readonly scope: string;
    readonly maxBytes: number;
    readonly maxAgeDays: number;
  },
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeStorageRetentionSummary> {
  return normalizeStorageRetentionSummary(
    await fetchJson<RuntimeStorageRetentionSummary>(
      "/api/role-model/storage-retention/policy",
      fetcher,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(policy),
      },
    ),
  );
}
export async function executeRetentionPlan(
  manifestHash: string,
  scope: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeStorageRetentionSummary> {
  return normalizeStorageRetentionSummary(
    await fetchJson<RuntimeStorageRetentionSummary>(
      "/api/role-model/storage-retention/execute",
      fetcher,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ manifestHash, scope }),
      },
    ),
  );
}
export async function cancelRetentionJob(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeStorageRetentionSummary> {
  return normalizeStorageRetentionSummary(
    await fetchJson<RuntimeStorageRetentionSummary>(
      "/api/role-model/storage-retention/cancel",
      fetcher,
      { method: "POST" },
    ),
  );
}
export async function rollbackRetentionReceipt(
  receiptId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeStorageRetentionSummary> {
  return normalizeStorageRetentionSummary(
    await fetchJson<RuntimeStorageRetentionSummary>(
      "/api/role-model/storage-retention/rollback",
      fetcher,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ receiptId }),
      },
    ),
  );
}
export interface RuntimeContributionState {
  readonly mode: "disabled" | "consumer" | "contributor";
  readonly contributionTier: string;
  readonly recommendationTier: string;
  readonly recommendationAccess: string;
  readonly allowCloudUpload: boolean;
  readonly authorizationState: string;
  readonly revocationEpoch: number;
  readonly queuedCount: number;
  readonly managed: boolean;
}
export async function fetchContributionState(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeContributionState> {
  return fetchJson<RuntimeContributionState>("/api/role-model/contribution", fetcher);
}
export async function updateContributionState(
  action: "opt_out" | "reenable" | "complete_disclosure",
  disclosureId?: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeContributionState> {
  return fetchJson<RuntimeContributionState>("/api/role-model/contribution", fetcher, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, disclosureId }),
  });
}
export interface RuntimeRecommendation {
  readonly id: string;
  readonly version: string;
  readonly status: string;
  readonly signatureValid: boolean;
  readonly policyAllowed: boolean;
  readonly provenance: string;
  readonly endpointId?: string;
  readonly modelId?: string;
  readonly preferredFor?: readonly string[];
  readonly action?: string;
  readonly confidence?: number;
}
export interface RuntimeActivePack {
  readonly id: string;
  readonly version: string;
  readonly appliedAt: string;
}
export async function fetchRecommendations(
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeRecommendation[]> {
  return fetchJson<RuntimeRecommendation[]>("/api/role-model/recommendations", fetcher);
}
export async function downloadRecommendations(
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeRecommendation[]> {
  return fetchJson<RuntimeRecommendation[]>("/api/role-model/recommendations/download", fetcher, {
    method: "POST",
  });
}
export async function applyRecommendation(
  id: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<{
  readonly recommendations: readonly RuntimeRecommendation[];
  readonly activePack: RuntimeActivePack;
}> {
  return fetchJson("/api/role-model/recommendations/apply", fetcher, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
}
export async function dismissRecommendation(
  id: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<{
  readonly recommendations: readonly RuntimeRecommendation[];
  readonly activePack: RuntimeActivePack | null;
}> {
  return fetchJson("/api/role-model/recommendations/dismiss", fetcher, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
}
export async function fetchActivePack(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeActivePack | null> {
  return fetchJson<RuntimeActivePack | null>(
    "/api/role-model/recommendations/active-pack",
    fetcher,
  );
}

export async function fetchRuntimeSnapshot(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeSnapshot> {
  const [summary, providers, accounts, deviceAuthorizations, endpoints, roles, requests, models] =
    await Promise.all([
      fetchRuntimeSummaryWithRetry(fetcher),
      fetchRuntimeProviders(fetcher),
      fetchRuntimeAccounts(fetcher),
      fetchRuntimeDeviceAuthorizations(fetcher),
      fetchRuntimeEndpoints(fetcher),
      fetchRuntimeRoles(fetcher),
      fetchRuntimeRequests(fetcher),
      fetchRuntimeModels(fetcher),
    ]);

  return {
    summary,
    providers,
    accounts,
    deviceAuthorizations,
    endpoints,
    roles,
    requests,
    models,
  };
}

export async function fetchProvidersSnapshot(
  fetcher: RuntimeFetcher = fetch,
): Promise<ProvidersSnapshot> {
  const [summary, providers, accounts, deviceAuthorizations, endpoints, roles, models] =
    await Promise.all([
      fetchRuntimeSummaryWithRetry(fetcher),
      fetchRuntimeProviders(fetcher),
      fetchRuntimeAccounts(fetcher),
      fetchRuntimeDeviceAuthorizations(fetcher),
      fetchRuntimeEndpoints(fetcher),
      fetchRuntimeRoles(fetcher),
      fetchRuntimeModels(fetcher),
    ]);

  return {
    summary,
    providers,
    accounts,
    deviceAuthorizations,
    endpoints,
    roles,
    models,
  };
}

export async function fetchRuntimeShellSnapshot(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeShellSnapshot> {
  const [summary, controller, configRecord, version] = await Promise.all([
    fetchRuntimeSummaryWithRetry(fetcher),
    fetchControllerAssignment(fetcher),
    fetchRuntimeConfig(fetcher),
    fetchVersionInfo(fetcher),
  ]);

  return {
    summary,
    controller,
    configRecord,
    version,
  };
}

export async function fetchRuntimeDashboardSnapshot(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeDashboardSnapshot> {
  const [endpoints, roles] = await Promise.all([
    fetchRuntimeEndpoints(fetcher),
    fetchRuntimeRoles(fetcher),
  ]);

  return {
    endpoints,
    roles,
  };
}

export async function fetchRecentRequestIds(
  limit = 10,
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly string[]> {
  return fetchJson<readonly string[]>(
    `/api/role-model/requests/latest-ids?limit=${limit}`,
    fetcher,
  );
}

function buildTelemetryQueryString(input?: {
  readonly limit?: number;
  readonly windowMs?: number;
  readonly endAtMs?: number;
  readonly startAtMs?: number;
  readonly asOfMs?: number;
  readonly cursor?: string;
  readonly filters?: RuntimeTelemetryAnalyticsFilters;
}): string {
  const params = new URLSearchParams();
  if (typeof input?.limit === "number") {
    params.set("limit", String(input.limit));
  }
  if (typeof input?.windowMs === "number") {
    params.set("windowMs", String(input.windowMs));
  }
  if (typeof input?.endAtMs === "number") {
    params.set("endAtMs", String(input.endAtMs));
  }
  if (typeof input?.startAtMs === "number") {
    params.set("startAtMs", String(input.startAtMs));
  }
  if (typeof input?.asOfMs === "number") {
    params.set("asOfMs", String(input.asOfMs));
  }
  if (input?.cursor) {
    params.set("cursor", input.cursor);
  }
  const appendFilterValues = (key: string, values?: readonly string[]) => {
    if (values && values.length > 0) {
      params.set(key, values.join(","));
    }
  };
  appendFilterValues("sourceTypes", input?.filters?.sourceTypes);
  appendFilterValues("endpointIds", input?.filters?.endpointIds);
  appendFilterValues("modelIds", input?.filters?.modelIds);
  appendFilterValues("providerIds", input?.filters?.providerIds);
  appendFilterValues("providerKinds", input?.filters?.providerKinds);
  appendFilterValues("providerFamilies", input?.filters?.providerFamilies);
  appendFilterValues("providerAccountIds", input?.filters?.providerAccountIds);
  appendFilterValues("requestedRoleIds", input?.filters?.requestedRoleIds);
  appendFilterValues("selectedStrategies", input?.filters?.selectedStrategies);
  appendFilterValues("routingModes", input?.filters?.routingModes);
  appendFilterValues("difficultyBuckets", input?.filters?.difficultyBuckets);
  appendFilterValues("statusFamilies", input?.filters?.statusFamilies);
  appendFilterValues("requestOperations", input?.filters?.requestOperations);
  appendFilterValues("taxonomyGroupIds", input?.filters?.taxonomyGroupIds);
  appendFilterValues("taxonomyRoleIds", input?.filters?.taxonomyRoleIds);
  appendFilterValues("taxonomyTaskTypes", input?.filters?.taxonomyTaskTypes);
  appendFilterValues("taxonomyTaskVariants", input?.filters?.taxonomyTaskVariants);
  appendFilterValues("taxonomyCapabilityIds", input?.filters?.taxonomyCapabilityIds);
  appendFilterValues("taxonomyModalityIds", input?.filters?.taxonomyModalityIds);
  appendFilterValues("taxonomyToolClassIds", input?.filters?.taxonomyToolClassIds);
  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}

export async function fetchTelemetryDashboard(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeTelemetryDashboard> {
  const asOfMs = Date.now();
  const query = buildTelemetryQueryString({ asOfMs });
  const [summary, rows, requests] = await Promise.all([
    fetchJson<RuntimeTelemetrySummary>(`/api/role-model/telemetry/summary${query}`, fetcher),
    fetchJson<RuntimeTelemetryComparisonRow[]>(`/api/role-model/telemetry/rows${query}`, fetcher),
    fetchJson<RuntimeTelemetryRequestRecord[]>(
      `/api/role-model/telemetry/requests${query}`,
      fetcher,
    ),
  ]);

  return {
    summary,
    rows,
    requests,
  };
}

export async function fetchTelemetryRequests(
  input: {
    readonly limit?: number;
    readonly windowMs?: number;
    readonly endAtMs?: number;
    readonly startAtMs?: number;
    readonly asOfMs?: number;
    readonly cursor?: string;
    readonly filters?: RuntimeTelemetryAnalyticsFilters;
  } = {},
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeTelemetryRequestRecord[]> {
  return fetchJson<RuntimeTelemetryRequestRecord[]>(
    `/api/role-model/telemetry/requests${buildTelemetryQueryString(input)}`,
    fetcher,
  );
}

export async function fetchTelemetryRequestsPage(
  input: {
    readonly limit?: number;
    readonly windowMs?: number;
    readonly endAtMs?: number;
    readonly startAtMs?: number;
    readonly asOfMs?: number;
    readonly cursor?: string;
    readonly filters?: RuntimeTelemetryAnalyticsFilters;
  } = {},
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeTelemetryRequestPage> {
  return fetchJson<RuntimeTelemetryRequestPage>(
    `/api/role-model/telemetry/requests/page${buildTelemetryQueryString(input)}`,
    fetcher,
  );
}

export async function fetchTelemetryAnalytics(
  payload: RuntimeTelemetryAnalyticsQuery,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeTelemetryAnalyticsResponse> {
  return postJson<RuntimeTelemetryAnalyticsResponse>(
    "/api/role-model/telemetry/query",
    payload,
    fetcher,
  );
}

export function subscribeTelemetryStream(
  onEvent: (event: RuntimeTelemetryStreamEvent) => void,
  createSource: RuntimeEventSourceFactory = (url) => new EventSource(url),
): () => void {
  const source = createSource("/api/role-model/telemetry/stream");
  source.addEventListener("telemetry.update", (event) => {
    onEvent(JSON.parse(event.data) as RuntimeTelemetryStreamEvent);
  });
  return () => {
    source.close();
  };
}

export function subscribeRevisionStream(
  onRevision: (event: RuntimeRevisionUpdate) => void,
  createSource: RuntimeEventSourceFactory = (url) => new EventSource(url),
): () => void {
  const source = createSource("/api/role-model/telemetry/stream");
  source.addEventListener("revision.update", (event) => {
    onRevision(JSON.parse(event.data) as RuntimeRevisionUpdate);
  });
  return () => {
    source.close();
  };
}

/**
 * Subscribes to every runtime mutation signal on the shared SSE transport.
 *
 * Telemetry pages already use this transport for newly persisted requests.
 * Including `revision.update` makes configuration admission, health transitions,
 * membership changes, and completed benchmark profiles refresh those pages too.
 */
export function subscribeRuntimeRefreshStream(
  onEvent: (event: RuntimeRefreshStreamEvent) => void,
  createSource: RuntimeEventSourceFactory = (url) => new EventSource(url),
): () => void {
  const source = createSource("/api/role-model/telemetry/stream");
  source.addEventListener("telemetry.update", (event) => {
    onEvent(JSON.parse(event.data) as RuntimeTelemetryStreamEvent);
  });
  source.addEventListener("revision.update", (event) => {
    onEvent(JSON.parse(event.data) as RuntimeRevisionStreamEvent);
  });
  return () => {
    source.close();
  };
}
export async function fetchDownstreamOpenAIProviderConfig(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeDownstreamOpenAIProviderConfig> {
  return fetchJson<RuntimeDownstreamOpenAIProviderConfig>(
    "/api/role-model/downstream/openai",
    fetcher,
  );
}

export async function fetchControllerAssignment(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeControllerAssignment | null> {
  return fetchJson<RuntimeControllerAssignment | null>("/api/role-model/controller", fetcher);
}

export async function fetchRuntimeConfig(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeConfigRecord> {
  return fetchJson<RuntimeConfigRecord>("/api/role-model/runtime/config", fetcher);
}

export async function updateRuntimeConfig(
  payload: RuntimeConfig,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeConfigRecord> {
  return putJson<RuntimeConfigRecord>("/api/role-model/runtime/config", payload, fetcher);
}

export async function fetchRolePolicy(fetcher: RuntimeFetcher = fetch): Promise<RuntimeRolePolicy> {
  return fetchJson<RuntimeRolePolicy>("/api/role-model/role-policy", fetcher);
}

export async function createRolePolicyRole(
  payload: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeRolePolicyRole> {
  return postJson<RuntimeRolePolicyRole>("/api/role-model/roles", payload, fetcher);
}

export async function updateRolePolicyRole(
  roleId: string,
  payload: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeRolePolicyRole> {
  return putJson<RuntimeRolePolicyRole>(
    `/api/role-model/roles/${encodeURIComponent(roleId)}`,
    payload,
    fetcher,
  );
}

export async function updateTaskDefinitions(
  payload: readonly Record<string, unknown>[],
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeTaskDefinition[]> {
  return putJson<readonly RuntimeTaskDefinition[]>("/api/role-model/tasks", payload, fetcher);
}

export async function updateControllerAssignment(
  payload: {
    readonly endpointId: string;
  },
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeControllerAssignment> {
  return fetchJson<RuntimeControllerAssignment>("/api/role-model/controller", fetcher, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function fetchRequestDetail(
  requestId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<{
  request: RuntimeRequestDetail;
  endpointProfile: RuntimeEndpointProfile | null;
}> {
  const request = await fetchJson<RuntimeRequestDetail>(
    `/api/role-model/requests/${requestId}`,
    fetcher,
  );

  const endpointProfile =
    typeof request.endpointId === "string" && request.endpointId.length > 0
      ? await fetchJson<RuntimeEndpointProfile>(
          `/api/role-model/endpoints/${encodeURIComponent(request.endpointId)}/profile`,
          fetcher,
        )
      : null;

  return {
    request,
    endpointProfile,
  };
}

export async function fetchRouterSummary(fetcher: RuntimeFetcher = fetch): Promise<RouterSummary> {
  return fetchJson<RouterSummary>("/api/role-model/router/summary", fetcher);
}

export async function fetchRouterConfig(fetcher: RuntimeFetcher = fetch): Promise<RouterConfig> {
  return fetchJson<RouterConfig>("/api/role-model/router/config", fetcher);
}

export async function fetchRouterCandidates(
  fetcher: RuntimeFetcher = fetch,
): Promise<RouterCandidate[]> {
  return fetchJson<RouterCandidate[]>("/api/role-model/router/candidates", fetcher);
}

export interface BenchmarkSuiteCase {
  readonly case_id: string;
  readonly category: string;
  readonly difficulty_bucket: "easy" | "medium" | "hard";
  readonly benchmark_eligible: boolean;
  readonly capability_targets: readonly string[];
  readonly expected_response: string;
  readonly grading_criteria: string;
  readonly quick_benchmark?: boolean;
  readonly required_tool_call?: boolean;
  readonly expected_tool_names?: readonly string[];
}

export interface BenchmarkSuite {
  readonly suite_id: string;
  readonly suite_version: string;
  readonly description: string;
  readonly task_type: string;
  readonly capability_targets: readonly string[];
  readonly cases: readonly BenchmarkSuiteCase[];
}

export interface BenchmarkCaseResult {
  readonly caseId: string;
  readonly difficultyBucket: "easy" | "medium" | "hard";
  readonly score: number;
  readonly rationale: string;
  readonly gradingMethod: string;
  readonly latencyMs: number;
  readonly actualPreview: string;
  readonly parseSuccess?: boolean;
  readonly judgeError?: string | null;
  readonly judgeUnavailable?: boolean;
  readonly cappedByValidator?: boolean;
}

export interface BenchmarkEndpointGrade {
  readonly endpointId: string;
  readonly modelId: string;
  readonly sourceType: string | null;
  readonly overallScore: number;
  readonly byDifficulty: Record<
    "easy" | "medium" | "hard",
    { readonly score: number; readonly cases: number }
  >;
  readonly caseResults: readonly BenchmarkCaseResult[];
}

export interface BenchmarkRunResult {
  readonly runId: string;
  readonly suiteId: string;
  readonly mode: "quick" | "full";
  readonly judgeEndpointId: string | null;
  readonly startedAtMs: number;
  readonly completedAtMs: number;
  readonly artifactRoot?: string;
  readonly endpointGrades: readonly BenchmarkEndpointGrade[];
}

export interface BenchmarkRunStart {
  readonly runId: string;
  readonly status: "running";
  readonly warnings?: readonly string[];
}

export type BenchmarkRunProgressStatus = "running" | "completed" | "failed";

export interface BenchmarkRunProgress {
  readonly runId: string;
  readonly status: BenchmarkRunProgressStatus;
  readonly mode: "quick" | "full";
  readonly startedAtMs: number;
  readonly updatedAtMs: number;
  readonly totalSteps: number;
  readonly completedSteps: number;
  readonly endpointIndex: number;
  readonly endpointCount: number;
  readonly currentEndpointId: string | null;
  readonly currentEndpointModelId: string | null;
  readonly caseIndex: number;
  readonly caseCount: number;
  readonly currentCaseId: string | null;
  readonly currentPhase: "execute" | "judge" | "compare" | null;
  readonly runPhase: "execution" | "grading" | "compare" | "complete";
  readonly judgeEndpointId: string | null;
  readonly activeJudgeEndpointId: string | null;
  readonly artifactRoot: string | null;
  readonly errorCode?: "benchmark_initialization_failed" | "benchmark_execution_failed";
  readonly errorMessage?: string;
  readonly result?: BenchmarkRunResult;
}

export async function fetchBenchmarkSuite(
  fetcher: RuntimeFetcher = fetch,
): Promise<BenchmarkSuite> {
  return fetchJson<BenchmarkSuite>("/api/role-model/benchmark/suite", fetcher);
}

export async function startCapabilityBenchmark(
  body: {
    readonly endpointIds?: readonly string[];
    readonly judgeEndpointId?: string;
    readonly mode?: "quick" | "full";
    readonly caseIds?: readonly string[];
    readonly useJudge?: boolean;
  },
  fetcher: RuntimeFetcher = fetch,
): Promise<BenchmarkRunStart> {
  return postJson<BenchmarkRunStart>("/api/role-model/benchmark/runs", body, fetcher);
}

export async function fetchBenchmarkRunProgress(
  runId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<BenchmarkRunProgress> {
  return fetchJson<BenchmarkRunProgress>(
    `/api/role-model/benchmark/runs/${encodeURIComponent(runId)}`,
    fetcher,
  );
}

export async function fetchActiveBenchmarkRun(
  fetcher: RuntimeFetcher = fetch,
): Promise<BenchmarkRunProgress | null> {
  const progress = await fetchJson<BenchmarkRunProgress | null>(
    "/api/role-model/benchmark/runs/active",
    fetcher,
  );
  return progress?.status === "running" ? progress : null;
}

export async function clearBenchmarkEndpointData(
  endpointId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<{ endpointId: string; clearedSampleCount: number }> {
  return fetchJson<{ endpointId: string; clearedSampleCount: number }>(
    `/api/role-model/benchmark/endpoints/${encodeURIComponent(endpointId)}/data`,
    fetcher,
    { method: "DELETE" },
  );
}

export async function fetchBenchmarkSummary(
  fetcher: RuntimeFetcher = fetch,
): Promise<BenchmarkSummary> {
  return fetchJson<BenchmarkSummary>("/api/role-model/benchmark/summary", fetcher);
}

export async function fetchBenchmarkPortfolio(
  fetcher: typeof fetch = fetch,
): Promise<BenchmarkPortfolio> {
  return fetchJson<BenchmarkPortfolio>("/api/role-model/benchmark/portfolio", fetcher);
}

export async function fetchBenchmarkSummariesByMode(
  fetcher: RuntimeFetcher = fetch,
): Promise<BenchmarkSummariesByMode> {
  return fetchJson<BenchmarkSummariesByMode>(
    "/api/role-model/benchmark/summaries/by-mode",
    fetcher,
  );
}

export async function fetchBenchmarkRuns(
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly BenchmarkRunListEntry[]> {
  return fetchJson<readonly BenchmarkRunListEntry[]>("/api/role-model/benchmark/runs", fetcher);
}

export async function clearAllBenchmarkData(
  fetcher: RuntimeFetcher = fetch,
): Promise<BenchmarkClearAllResult> {
  return fetchJson<BenchmarkClearAllResult>("/api/role-model/benchmark/data", fetcher, {
    method: "DELETE",
  });
}

export async function fetchRuntimeSummary(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeSummary> {
  return fetchRuntimeSummaryWithRetry(fetcher);
}

export async function fetchHealthStatus(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeHealthStatus> {
  return fetchJson<RuntimeHealthStatus>("/healthz", fetcher);
}

export async function fetchBenchmarkPreferences(
  fetcher: RuntimeFetcher = fetch,
): Promise<BenchmarkPreferences> {
  return fetchJson<BenchmarkPreferences>("/api/role-model/benchmark/preferences", fetcher);
}

export async function updateBenchmarkPreferences(
  body: BenchmarkPreferences,
  fetcher: RuntimeFetcher = fetch,
): Promise<BenchmarkPreferences> {
  return fetchJson<BenchmarkPreferences>("/api/role-model/benchmark/preferences", fetcher, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function fetchRouterDecisions(
  fetcher: RuntimeFetcher = fetch,
): Promise<RouterDecisionListItem[]> {
  return fetchJson<RouterDecisionListItem[]>("/api/role-model/router/decisions", fetcher);
}

export async function fetchRouterDecisionPage(
  input: {
    readonly limit?: number;
    readonly windowMs?: number;
    readonly endAtMs?: number;
    readonly startAtMs?: number;
    readonly asOfMs?: number;
    readonly cursor?: string;
  } = {},
  fetcher: RuntimeFetcher = fetch,
): Promise<RouterDecisionPage> {
  return fetchJson<RouterDecisionPage>(
    `/api/role-model/router/decisions/page${buildTelemetryQueryString(input)}`,
    fetcher,
  );
}

export async function fetchRouterDecisionDetail(
  requestId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<RouterDecisionDetail> {
  return fetchJson<RouterDecisionDetail>(
    `/api/role-model/router/decisions/${encodeURIComponent(requestId)}`,
    fetcher,
  );
}
export async function fetchActivityMetrics(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeActivityLogEntry[]> {
  return fetchJson<RuntimeActivityLogEntry[]>("/api/metrics", fetcher);
}

export async function fetchActivityMetricsPage(
  input: {
    readonly limit?: number;
    readonly windowMs?: number;
    readonly endAtMs?: number;
    readonly startAtMs?: number;
    readonly asOfMs?: number;
    readonly cursor?: string;
  } = {},
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeActivityMetricsPage> {
  return fetchJson<RuntimeActivityMetricsPage>(
    `/api/metrics/page${buildTelemetryQueryString(input)}`,
    fetcher,
  );
}

/** Aggregate totals are fetched separately from the intentionally bounded activity page. */
export async function fetchTelemetrySummary(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeTelemetrySummary> {
  return fetchJson<RuntimeTelemetrySummary>("/api/role-model/telemetry/summary", fetcher);
}

export async function fetchActivityCapture(
  id: number | string,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeActivityCapture | null> {
  const capturePath = `/api/captures/${encodeURIComponent(String(id))}`;
  const response = await fetcher(capturePath);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response.clone(), capturePath));
  }
  return (await response.json()) as RuntimeActivityCapture;
}

export async function fetchTextLogs(
  path: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<string> {
  return fetchText(path, fetcher);
}

export async function fetchVersionInfo(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeVersionInfo> {
  return fetchJson<RuntimeVersionInfo>("/api/version", fetcher);
}

export async function upsertRuntimeAccount(
  payload: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeAccount> {
  return fetchJson<RuntimeAccount>("/api/role-model/accounts", fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function removeRuntimeAccountModel(
  providerAccountId: string,
  modelId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<{
  success: boolean;
  removedAccount: boolean;
  alreadyAbsent?: boolean;
  authority?: "account-managed" | "runtime-config-managed" | "absent";
  pruned?: {
    modelRoleBindings: number;
    runtimeEndpoints: number;
    remoteActivations: number;
    generatedAliases: number;
  };
}> {
  return fetchJson<{
    success: boolean;
    removedAccount: boolean;
    alreadyAbsent?: boolean;
    authority?: "account-managed" | "runtime-config-managed" | "absent";
    pruned?: {
      modelRoleBindings: number;
      runtimeEndpoints: number;
      remoteActivations: number;
      generatedAliases: number;
    };
  }>(
    `/api/role-model/accounts/${encodeURIComponent(providerAccountId)}/models/${encodeURIComponent(modelId)}`,
    fetcher,
    {
      method: "DELETE",
    },
  );
}

export async function startRuntimeDeviceAuthorization(
  payload: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeDeviceAuthorization> {
  return fetchJson<RuntimeDeviceAuthorization>("/api/role-model/accounts/device/start", fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function reconnectRuntimeAccount(
  payload: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeDeviceAuthorization> {
  return fetchJson<RuntimeDeviceAuthorization>(
    "/api/role-model/accounts/repair/reconnect",
    fetcher,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

export async function pollRuntimeDeviceAuthorization(
  authRequestId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeDeviceAuthorization> {
  return fetchJson<RuntimeDeviceAuthorization>("/api/role-model/accounts/device/poll", fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ authRequestId }),
  });
}

export async function updateRuntimeAccountApiKey(
  payload: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeAccount> {
  return fetchJson<RuntimeAccount>("/api/role-model/accounts/repair/update-key", fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function openRuntimeExternalUrl(
  url: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<{ opened: true; url: string }> {
  return fetchJson<{ opened: true; url: string }>("/api/role-model/system/open-url", fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ url }),
  });
}

export async function activateRuntimeEndpoint(
  payload: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeEndpoint> {
  return fetchJson<RuntimeEndpoint>("/api/role-model/endpoints", fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export interface RuntimeEndpointActivationBatchInput {
  readonly activationBatchId: string;
  readonly activations: readonly Record<string, unknown>[];
}

export interface RuntimeEndpointActivationBatchResult {
  readonly activationBatchId: string;
  readonly status: "committed";
  readonly endpoints: readonly RuntimeEndpoint[];
}

export async function activateRuntimeEndpointBatch(
  payload: RuntimeEndpointActivationBatchInput,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeEndpointActivationBatchResult> {
  return fetchJson<RuntimeEndpointActivationBatchResult>(
    "/api/role-model/endpoints/batch",
    fetcher,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

export async function removeRuntimeEndpoint(
  endpointId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<{ readonly endpointId: string; readonly status: "removed" | "absent" }> {
  return fetchJson<{ endpointId: string; status: "removed" | "absent" }>(
    `/api/role-model/endpoints/${encodeURIComponent(endpointId)}`,
    fetcher,
    { method: "DELETE" },
  );
}

export async function submitWorkbenchChat(
  payload: WorkbenchChatInput,
  fetcher: RuntimeFetcher = fetch,
): Promise<Record<string, unknown>> {
  const { routingModeOverride, endpointId, ...body } = payload;
  return fetchJson<Record<string, unknown>>("/v1/chat/completions", fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(endpointId ? { "x-role-model-endpoint-id": endpointId } : {}),
      ...(routingModeOverride ? { "x-role-model-routing-mode": routingModeOverride } : {}),
    },
    body: JSON.stringify(body),
  });
}

export async function submitImageGeneration(
  payload: RuntimeImageGenerationRequest,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeImageGenerationResponse> {
  return postJson<RuntimeImageGenerationResponse>("/v1/images/generations", payload, fetcher);
}

export async function submitSdApiTxt2Img(
  payload: RuntimeSdApiTxt2ImgRequest,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeSdApiResponse> {
  return postJson<RuntimeSdApiResponse>("/sdapi/v1/txt2img", payload, fetcher);
}

export async function fetchAudioVoices(
  model: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeAudioVoiceRecord[]> {
  return fetchJson<readonly RuntimeAudioVoiceRecord[]>(
    `/v1/audio/voices?model=${encodeURIComponent(model)}`,
    fetcher,
  );
}

export async function submitSpeechGeneration(
  payload: RuntimeSpeechGenerationRequest,
  fetcher: RuntimeFetcher = fetch,
): Promise<Blob> {
  return fetchBlob("/v1/audio/speech", fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function submitAudioTranscription(
  payload: {
    readonly file: File;
    readonly model: string;
  },
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeAudioTranscriptionResponse> {
  const formData = new FormData();
  formData.set("file", payload.file);
  formData.set("model", payload.model);
  return fetchJson<RuntimeAudioTranscriptionResponse>("/v1/audio/transcriptions", fetcher, {
    method: "POST",
    body: formData,
  });
}

export async function submitRerankRequest(
  payload: RuntimeRerankRequest,
  path: "/v1/rerank" | "/v1/reranking" = "/v1/rerank",
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeRerankResponse> {
  return postJson<RuntimeRerankResponse>(path, payload, fetcher);
}

export async function submitAdvancedRequest(
  path:
    | "/v1/responses"
    | "/v1/messages"
    | "/v1/messages/count_tokens"
    | "/v1/embeddings"
    | "/completion"
    | "/infill",
  payload: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
): Promise<Record<string, unknown>> {
  return postJson<Record<string, unknown>>(path, payload, fetcher);
}

// ─── Local Runtime APIs ──────────────────────────────────────────────

export async function fetchLocalModels(
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeLocalModel[]> {
  return fetchJson<readonly RuntimeLocalModel[]>("/api/role-model/local/models", fetcher);
}

export async function fetchPeerLocalModels(
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeLocalModel[]> {
  return fetchJson<readonly RuntimeLocalModel[]>("/api/role-model/local/peer/models", fetcher);
}

export async function fetchLlamaSwapLocalModels(
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeLocalModel[]> {
  return fetchJson<readonly RuntimeLocalModel[]>(
    "/api/role-model/local/llama-swap/models",
    fetcher,
  );
}

export async function loadLocalModel(
  modelId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(
    `/api/role-model/local/models/${encodeURIComponent(modelId)}/load`,
    {},
    fetcher,
  );
}

export async function loadPeerModel(
  modelId: string,
  roleIds?: readonly string[],
  fetcher: RuntimeFetcher = fetch,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(
    `/api/role-model/local/peer/models/${encodeURIComponent(modelId)}/load`,
    // Empty roleIds must stay explicit none — not default-all.
    roleIds !== undefined ? roleIdsToAssignmentPayload(roleIds, false) : {},
    fetcher,
  );
}

export async function loadLlamaSwapModel(
  modelId: string,
  roleIds?: readonly string[],
  fetcher: RuntimeFetcher = fetch,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(
    `/api/role-model/local/llama-swap/models/${encodeURIComponent(modelId)}/load`,
    roleIds !== undefined ? roleIdsToAssignmentPayload(roleIds, false) : {},
    fetcher,
  );
}

export async function setPeerModelRoles(
  modelId: string,
  roleIds: readonly string[],
  fetcher: RuntimeFetcher = fetch,
): Promise<{ success: boolean }> {
  return putJson<{ success: boolean }>(
    `/api/role-model/local/peer/models/${encodeURIComponent(modelId)}/roles`,
    roleIdsToAssignmentPayload(roleIds, false),
    fetcher,
  );
}

export async function setLlamaSwapModelRoles(
  modelId: string,
  roleIds: readonly string[],
  fetcher: RuntimeFetcher = fetch,
): Promise<{ success: boolean }> {
  return putJson<{ success: boolean }>(
    `/api/role-model/local/llama-swap/models/${encodeURIComponent(modelId)}/roles`,
    roleIdsToAssignmentPayload(roleIds, false),
    fetcher,
  );
}

export async function unloadPeerModel(
  modelId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(
    `/api/role-model/local/peer/models/${encodeURIComponent(modelId)}/unload`,
    {},
    fetcher,
  );
}

export async function unloadLocalModel(
  modelId?: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<{ success: boolean }> {
  if (modelId) {
    return postJson<{ success: boolean }>(
      `/api/role-model/local/models/${encodeURIComponent(modelId)}/unload`,
      {},
      fetcher,
    );
  }
  return postJson<{ success: boolean }>("/api/role-model/local/models/unload", {}, fetcher);
}

export async function fetchLocalPolicy(
  fetcher: RuntimeFetcher = fetch,
): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>("/api/role-model/local/policy", fetcher);
}

export async function updateLocalPolicy(
  body: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
): Promise<Record<string, unknown>> {
  return putJson<Record<string, unknown>>("/api/role-model/local/policy", body, fetcher);
}

export async function fetchSwapHistory(
  fetcher: RuntimeFetcher = fetch,
): Promise<
  readonly { timestamp: string; oldModel: string | null; newModel: string; reason: string }[]
> {
  return fetchJson<
    readonly { timestamp: string; oldModel: string | null; newModel: string; reason: string }[]
  >("/api/role-model/local/swap", fetcher);
}

export async function fetchLocalLogs(fetcher: RuntimeFetcher = fetch): Promise<{ logs: string }> {
  return fetchJson<{ logs: string }>("/api/role-model/local/logs", fetcher);
}

export interface ModelOverride {
  ttl?: number;
  contextWindow?: number;
  concurrencyLimit?: number;
  roleIds?: readonly string[];
}

export async function fetchModelOverrides(
  fetcher: typeof fetch = fetch,
): Promise<Record<string, ModelOverride>> {
  return fetchJson<Record<string, ModelOverride>>("/api/role-model/local/overrides", fetcher);
}

export async function updateModelOverrides(
  body: Record<string, ModelOverride>,
  fetcher: typeof fetch = fetch,
): Promise<Record<string, ModelOverride>> {
  return putJson<Record<string, ModelOverride>>("/api/role-model/local/overrides", body, fetcher);
}

export interface PeerConfig {
  id: string;
  url: string;
  authToken?: string;
}

export async function fetchPeers(fetcher: typeof fetch = fetch): Promise<readonly PeerConfig[]> {
  return fetchJson<readonly PeerConfig[]>("/api/role-model/local/peers", fetcher);
}

export async function updatePeers(
  body: readonly PeerConfig[],
  fetcher: typeof fetch = fetch,
): Promise<readonly PeerConfig[]> {
  return putJson<readonly PeerConfig[]>(
    "/api/role-model/local/peers",
    body as unknown as Record<string, unknown>,
    fetcher,
  );
}

export async function checkPeerHealth(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<{ healthy: boolean }> {
  return fetchJson<{ healthy: boolean }>(
    `/api/role-model/local/peers/health?url=${encodeURIComponent(url)}`,
    fetcher,
  );
}

export interface ModelTelemetryRollup {
  readonly groups: readonly {
    groupId: string;
    requestCount: number;
  }[];
  readonly roles: readonly {
    roleId: string;
    requestCount: number;
  }[];
  readonly capabilities: readonly {
    capabilityId: string;
    requestCount: number;
  }[];
  readonly tasks: readonly {
    taskType: string;
    requestCount: number;
    successRate: number;
    avgLatencyMs: number | null;
  }[];
  readonly strengths: readonly string[];
  readonly warnings: readonly string[];
  readonly totalRequests: number;
  readonly windowDays: number;
}

export async function fetchModelTelemetryRollup(
  identity: {
    readonly modelId: string;
    readonly endpointId: string;
  },
  fetcher: RuntimeFetcher = fetch,
): Promise<ModelTelemetryRollup> {
  const windowDays = 7;
  const windowMs = windowDays * 24 * 3600 * 1000;
  const baseFilters = {
    modelIds: [identity.modelId],
    endpointIds: [identity.endpointId],
  } as const;
  const [taskResponse, groupResponse, roleResponse, capabilityResponse] = await Promise.all([
    fetchTelemetryAnalytics(
      {
        granularity: "day",
        metrics: ["requestCount", "successCount", "averageLatencyMs"],
        breakdown: "taxonomyTaskType",
        filters: baseFilters,
        windowMs,
      },
      fetcher,
    ),
    fetchTelemetryAnalytics(
      {
        granularity: "day",
        metrics: ["requestCount"],
        filters: baseFilters,
        ranking: {
          dimension: "taxonomyGroupId",
          metric: "requestCount",
          limit: 5,
        },
        windowMs,
      },
      fetcher,
    ),
    fetchTelemetryAnalytics(
      {
        granularity: "day",
        metrics: ["requestCount"],
        filters: baseFilters,
        ranking: {
          dimension: "taxonomyRoleId",
          metric: "requestCount",
          limit: 5,
        },
        windowMs,
      },
      fetcher,
    ),
    fetchTelemetryAnalytics(
      {
        granularity: "day",
        metrics: ["requestCount"],
        filters: baseFilters,
        ranking: {
          dimension: "taxonomyCapabilityId",
          metric: "requestCount",
          limit: 5,
        },
        windowMs,
      },
      fetcher,
    ),
  ]);

  const taskMap = new Map<
    string,
    {
      requestCount: number;
      successCount: number;
      latencyWeightedTotal: number;
      latencyWeightedCount: number;
    }
  >();
  for (const bucket of taskResponse.buckets ?? []) {
    for (const series of bucket.series ?? []) {
      const count = (series.metrics?.requestCount as number) ?? 0;
      if (count <= 0 || !series.key) {
        continue;
      }
      const success = (series.metrics?.successCount as number) ?? 0;
      const latency = series.metrics?.averageLatencyMs as number | null | undefined;
      const existing = taskMap.get(series.key) ?? {
        requestCount: 0,
        successCount: 0,
        latencyWeightedTotal: 0,
        latencyWeightedCount: 0,
      };
      existing.requestCount += count;
      existing.successCount += success;
      if (typeof latency === "number" && Number.isFinite(latency)) {
        existing.latencyWeightedTotal += latency * count;
        existing.latencyWeightedCount += count;
      }
      taskMap.set(series.key, existing);
    }
  }

  const tasks = [...taskMap.entries()]
    .map(([taskType, aggregate]) => ({
      taskType,
      requestCount: aggregate.requestCount,
      successRate: aggregate.requestCount > 0 ? aggregate.successCount / aggregate.requestCount : 0,
      avgLatencyMs:
        aggregate.latencyWeightedCount > 0
          ? Math.round(aggregate.latencyWeightedTotal / aggregate.latencyWeightedCount)
          : null,
    }))
    .sort(
      (left, right) =>
        right.requestCount - left.requestCount ||
        right.successRate - left.successRate ||
        left.taskType.localeCompare(right.taskType, "en"),
    );

  const groups = (groupResponse.ranking?.rows ?? [])
    .filter((row) => typeof row.value === "number" && row.value > 0)
    .map((row) => ({
      groupId: row.key,
      requestCount: row.value as number,
    }));

  const roles = (roleResponse.ranking?.rows ?? [])
    .filter((row) => typeof row.value === "number" && row.value > 0)
    .map((row) => ({
      roleId: row.key,
      requestCount: row.value as number,
    }));

  const capabilities = (capabilityResponse.ranking?.rows ?? [])
    .filter((row) => typeof row.value === "number" && row.value > 0)
    .map((row) => ({
      capabilityId: row.key,
      requestCount: row.value as number,
    }));

  const strengths = tasks
    .filter((task) => task.requestCount > 0 && task.successRate >= 0.95)
    .slice(0, 2)
    .map(
      (task) =>
        `Strong recent success for ${task.taskType} (${task.requestCount} req, ${Math.round(
          task.successRate * 100,
        )}% success).`,
    );

  const warnings = [...tasks]
    .sort(
      (left, right) =>
        left.successRate - right.successRate || right.requestCount - left.requestCount,
    )
    .filter((task) => task.requestCount > 0 && task.successRate < 0.8)
    .slice(0, 2)
    .map(
      (task) =>
        `Watch ${task.taskType} (${task.requestCount} req, ${Math.round(
          task.successRate * 100,
        )}% success).`,
    );

  const totalRequests =
    (taskResponse.totals.requestCount as number | null | undefined) ??
    tasks.reduce((total, task) => total + task.requestCount, 0);

  return {
    groups,
    roles,
    capabilities,
    tasks,
    strengths,
    warnings,
    totalRequests,
    windowDays,
  };
}
