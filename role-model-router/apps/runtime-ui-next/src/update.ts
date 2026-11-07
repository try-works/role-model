import { Command, Navigation } from "@role-model-router/foldkit";
import type { Message as DialogMessage } from "@role-model-router/foldkit-ui/dialog";
import { UrlRequest } from "@role-model-router/foldkit/navigation";
import type { Return as UpdateReturn } from "@role-model-router/foldkit/update";
import { type Url, toString as urlToString } from "@role-model-router/foldkit/url";
import { Effect, Schema } from "effect";
import {
  deviceAuthCancelledState,
  deviceAuthFailedState,
  withDeviceAuthDialog,
} from "./features/device-auth/update";
import {
  endpointAdmissionCompletionState,
  endpointAdmissionFieldChangedState,
  endpointAdmissionModelAddedState,
  endpointAdmissionModelRemovedState,
  endpointAdmissionResetState,
} from "./features/endpoint-activation/update";
import { updateDeviceAuthDialog } from "./ui/dialog";
import {
  type RequestsMetricListboxModel,
  initRequestsMetricListbox,
  initRequestsTargetListbox,
  requestsMetricListbox,
} from "./ui/listbox";

import {
  blankRoleDraft,
  draftFromRole,
  draftToRolePayload,
  rolePolicyFromReadback,
} from "./features/models/role-policy";
import {
  buildRequestsChartQueries,
  requestsBreakdownDimension,
  requestsChartFilters,
} from "./features/observe/requests-charts";
import {
  buildRoutingChartQueries,
  routingBreakdownDimension,
  routingChartFilters,
} from "./features/observe/routing-charts";
import { windowForRange } from "./features/overview/chart-data";
import { writeStoredOperatorToken } from "./operator-token";
import { DEFAULT_OVERVIEW_FILTERS, type OverviewFilters, overviewQuery } from "./overview-filters";
import {
  parseRuntimeConfigRecord,
  parseRuntimeConfigText,
  runtimeConfigDiff,
  runtimeConfigText,
} from "./runtime-config";

import {
  chartInteractionForRoute,
  hideChartTooltip,
  showChartPoint,
  toggleChartSeries,
} from "./chart-interaction";
import {
  type DeviceAuthCommands,
  type DispatchControlCommand,
  type DispatchStudioCommand,
  type EndpointAdmissionCommands,
  type LearningRankingCommands,
  type LocalPeersCommands,
  type LocalPolicyCommands,
  type ModelsCommands,
  type OperatorLearningCommands,
  type ProviderAccountCommands,
  type ReadControlCommand,
  type ReadDiagnosticsCommand,
  type ReadObservabilityCommand,
  type ReadReadbackCommand,
  type RefreshSnapshotCommand,
  type ReplayAutoQueueCommands,
  type RequestsChartsCommands,
  type RequestsRankingCommands,
  type RouterConfigCommands,
  type RoutingChartsCommands,
  type SaveRuntimeConfigCommand,
  type StorageRetentionCommands,
  type SystemExtensionsCommands,
  type SystemOperatorCommands,
  defineDispatchControl,
  defineDispatchStudio,
  defineReadControl,
  defineReadObservability,
  defineReadReadback,
  defineRefreshSnapshot,
  localPolicyCommands,
  noopDeviceAuthCommands,
  noopEndpointAdmissionCommands,
  noopLearningRankingCommands,
  noopLocalPeersCommands,
  noopModelsCommands,
  noopOperatorLearningCommands,
  noopProviderAccountCommands,
  noopReplayAutoQueueCommands,
  noopRequestsChartsCommands,
  noopRequestsRankingCommands,
  noopRouterConfigCommands,
  noopRoutingChartsCommands,
  noopStorageRetentionCommands,
  noopSystemExtensionsCommands,
  noopSystemOperatorCommands,
} from "./commands";
import {
  CONTROL_SPECS,
  type ControlKey,
  controlKeyForRouteTag,
  emptyControls,
  failedControl,
  loadingControl,
} from "./control";
import {
  type DeviceAuthState,
  activationPlanForConnectedSession,
  deviceAuthPollDelayMs,
  deviceAuthStartPlan,
  initialDeviceAuthState,
  mergeDeviceAuthPoll,
} from "./device-auth";
import { failedDiagnostics, idleDiagnostics, loadingDiagnostics } from "./diagnostics";
import {
  beginEndpointActivationRun,
  endpointActivationNeedsReset,
  settleEndpointActivation,
} from "./endpoint-activation-tracker";
import {
  type EndpointAdmissionState,
  endpointActivationPayloads,
  endpointAdmissionBusy,
  endpointBatchPayload,
  initialEndpointAdmissionState,
  validateEndpointAdmissionDraft,
} from "./endpoint-admission";
import {
  mergeLearningLadderFailed,
  mergeLearningLadderUpdated,
  planLearningLadderToggle,
} from "./features/learning-ranking/update";
import {
  mergeRequestsRankingFailed,
  mergeRequestsRankingLoaded,
  planRequestsRankingFieldChange,
} from "./features/requests-ranking/update";
import { initialLearningRankingState } from "./learning-ranking";
import { canonicalHrefForUrl, replaceLegacyUrlCommand } from "./legacy-redirects";
import { Message } from "./message";
import type { Model } from "./model";
import { failedObservability, idleObservability, loadingObservability } from "./observability";
import {
  type ProviderAccountActivationBatch,
  type ProviderAccountState,
  createProviderAccountPayload,
  initialProviderAccountState,
  providerAccountBusy,
  updateProviderKeyPayload,
} from "./provider-account";
import {
  type LocalPolicyObject,
  READBACK_SPECS,
  type ReadbackKey,
  emptyReadbacks,
  failedReadback,
  loadingReadback,
  localPolicyDraftFromReadback,
  localPolicyFromReadback,
  localPolicyReadback,
  readbackKeyForRouteTag,
  withLocalPolicyDraft,
} from "./readback";
import {
  buildRequestsRankingQuery,
  initialRequestsRankingState,
  requestsRankingMetricOf,
  requestsRankingTargetOf,
} from "./requests-ranking";
import { type AppRoute, type ResolvedAppUrl, resolveAppUrl, sameRoute } from "./route";
import { type RouterPostureState, initialRouterPostureState } from "./router-posture";
import { applyThemeCommand, scrollShellToTopCommand } from "./shell-commands";
import { initialRetentionState } from "./storage-retention";
import { studioIdle, studioLoading, studioTabFromUrl } from "./studio";

/** In-app navigation is a Command, not a history call inside update. */
const pushInternal = Command.define("PushInternal", {
  args: { href: Schema.String },
  messages: [Message.NavigationCompleted],
  execute: ({ href }) =>
    Navigation.pushUrl(href).pipe(Effect.map(() => Message.NavigationCompleted())),
});

const noopRefreshSnapshot = defineRefreshSnapshot(async () => undefined);
const noopObservability = defineReadObservability(async () => ({
  body: { metrics: {} },
  status: 200,
}));
const emptyBody = {
  candidates: [],
  logs: "",
  queues: [],
  store: { receipts: [] },
  worker: { receipts: [] },
};
const noopControl = defineReadControl({
  dispatch: async () => ({ body: {}, status: 200 }),
  read: async () => ({ body: {}, status: 200 }),
});
const noopDispatchStudio = defineDispatchStudio(async () => ({
  contentType: "",
  status: 500,
  text: "",
}));
const noopDispatchControl = defineDispatchControl({
  dispatch: async () => ({ body: {}, status: 200 }),
  read: async () => ({ body: {}, status: 200 }),
});
const noopReadback = defineReadReadback({
  dashboard: async () => ({ body: emptyBody, status: 200 }),
  localLogs: async () => ({ body: emptyBody, status: 200 }),
  localSwap: async () => ({ body: emptyBody, status: 200 }),
  observeActivity: async () => ({ body: emptyBody, status: 200 }),
  observeLogs: async () => ({ body: emptyBody, status: 200 }),
  observeRouting: async () => ({ body: emptyBody, status: 200 }),
  router: async () => ({ body: emptyBody, status: 200 }),
  requestDetail: async () => ({ body: emptyBody, status: 200 }),
  routerDecisionDetail: async () => ({ body: emptyBody, status: 200 }),
  localPeers: async () => ({ body: emptyBody, status: 200 }),
  systemPeers: async () => ({ body: emptyBody, status: 200 }),
  localPeerModels: async () => ({ body: emptyBody, status: 200 }),
  queueConfig: async () => ({ body: emptyBody, status: 200 }),
  downstreamOpenAI: async () => ({ body: emptyBody, status: 200 }),
  integrationProviders: async () => ({ body: emptyBody, status: 200 }),
  providerCatalog: async () => ({ body: [], status: 200 }),
  providerAccounts: async () => ({ body: [], status: 200 }),
  roles: async () => ({ body: [], status: 200 }),
  rolePolicy: async () => ({ body: { roleDefinitions: [], taskDefinitions: [] }, status: 200 }),
  benchmarkSuite: async () => ({ body: emptyBody, status: 200 }),
  benchmarkSummary: async () => ({ body: {}, status: 200 }),
  benchmarkRuns: async () => ({ body: [], status: 200 }),
  benchmarkPreferences: async () => ({ body: {}, status: 200 }),
  benchmarkActiveRun: async () => ({ body: null, status: 200 }),
  storageRetention: async () => ({ body: emptyBody, status: 200 }),
  models: async () => ({ body: emptyBody, status: 200 }),
  runtimeSummary: async () => ({ body: emptyBody, status: 200 }),
  health: async () => ({ body: emptyBody, status: 200 }),
  overviewMetrics: async () => ({
    body: { items: [], window: { startAtMs: 0, endAtMs: 0, asOfMs: 0 } },
    status: 200,
  }),
  learning: async () => ({ body: { knowledge: {} }, status: 200 }),
  learningConfiguration: async () => ({ body: { items: [] }, status: 200 }),
  learningPacks: async () => ({ body: { items: [] }, status: 200 }),
  learningDecisions: async () => ({ body: { items: [] }, status: 200 }),
  learningEvidence: async () => ({ body: { items: [] }, status: 200 }),
  learningHistory: async () => ({ body: { items: [] }, status: 200 }),
  localLlamaSwapModels: async () => ({ body: { items: [] }, status: 200 }),
  localPolicy: async () => ({ body: {}, status: 200 }),
  operatorStatus: async () => ({ body: { items: [] }, status: 200 }),
  operatorTraceRoots: async () => ({ body: { items: [] }, status: 200 }),
  learningProfile: async () => ({ body: { items: [] }, status: 200 }),
  learningAdvisory: async () => ({ body: { items: [] }, status: 200 }),
  contribution: async () => ({ body: {}, status: 200 }),
  recommendations: async () => ({ body: [], status: 200 }),
  replayAutomation: async () => ({ body: {}, status: 200 }),
  extensions: async () => ({ body: { items: [] }, status: 200 }),
  configuredModels: async () => ({ body: [], status: 200 }),
  modelEndpoints: async () => ({ body: [], status: 200 }),
  runtimeConfig: async () => ({ body: { config: {} }, status: 200 }),
  routerConfig: async () => ({
    body: { persisted: { executionMode: "decision_only", strategy: null } },
    status: 200,
  }),
  replayJobs: async () => ({ body: [], status: 200 }),
  evaluationJobs: async () => ({ body: [], status: 200 }),
  queues: async () => ({ body: emptyBody, status: 200 }),
  requests: async () => ({ body: emptyBody, status: 200 }),
  routerCandidates: async () => ({ body: emptyBody, status: 200 }),
  routerDecisions: async () => ({ body: emptyBody, status: 200 }),
  runtime: async () => ({ body: emptyBody, status: 200 }),
  sessionReadiness: async () => ({ body: emptyBody, status: 200 }),
  storeReceipts: async () => ({ body: emptyBody, status: 200 }),
});

const runtimeConfigSnapshot = (
  model: Model,
): { config: Readonly<Record<string, unknown>>; text: string } => {
  const meta = model.readbacks.runtimeConfig.rows[0]?.meta;
  if (meta !== undefined) {
    try {
      const parsed = JSON.parse(meta) as { config?: unknown };
      const config = parsed.config;
      if (config !== null && typeof config === "object" && !Array.isArray(config))
        return {
          config: config as Readonly<Record<string, unknown>>,
          text: JSON.stringify(config, null, 2),
        };
    } catch {}
  }
  return { config: {}, text: "{}" };
};

/**
 * S272: the pending marker is the exact canonical href of the replace Command we just emitted.
 * Only the first URL change that matches it exactly is that Command's `foldkit:urlchange` echo.
 * There is no other source identity in `ChangedUrl`, so one identical URL change is consumed as
 * the echo; the real echo then becomes a genuine navigation, never a silent drop.
 */
const isPendingRedirectEcho = (
  model: Model,
  resolved: ResolvedAppUrl,
  incomingHref: string,
): boolean =>
  resolved.redirectHref === undefined &&
  model.pendingRedirectHref !== undefined &&
  model.pendingRedirectHref === incomingHref &&
  sameRoute(resolved.route, model.route);

const requestsQuery = (state: NonNullable<Model["requestsFilters"]>): string => {
  const params = new URLSearchParams({
    breakdown: state.breakdown,
    difficulty: state.difficulty,
    range: state.range,
    source: state.source,
    statusFamily: state.statusFamily,
  });
  return `?${params.toString()}`;
};
const observeQuery = (state: NonNullable<Model["observeRoutingFilters"]>): string => {
  const params = new URLSearchParams({
    breakdown: state.breakdown,
    difficulty: state.difficulty,
    range: state.range,
    source: state.source,
  });
  return `?${params.toString()}`;
};

type RoleDraftState = NonNullable<NonNullable<Model["modelsView"]>["roleDraft"]>;
type RoleActionKind = "create" | "edit" | "tasks";

const roleDraftFromState = (
  state: RoleDraftState | undefined,
): ReturnType<typeof blankRoleDraft> => ({
  ...blankRoleDraft(),
  ...(state ?? {}),
  defaultSystemInstructions: state?.defaultSystemInstructions ?? state?.instructions ?? "",
  roleKind: state?.roleKind ?? state?.kind ?? "assistant",
  toolPolicyMode: state?.toolPolicyMode ?? state?.toolPolicy ?? "allowed",
});

const roleDraftState = (draft: ReturnType<typeof blankRoleDraft>): RoleDraftState => ({
  ...draft,
  instructions: draft.defaultSystemInstructions,
  kind: draft.roleKind,
  toolPolicy: draft.toolPolicyMode,
});

const benchmarkEndpointIds = (model: Model): ReadonlyArray<string> =>
  model.readbacks.modelEndpoints.rows.flatMap((row) => {
    try {
      // SAFETY: modelEndpoints rows carry this JSON record in meta.
      const meta = JSON.parse(row.meta) as { readonly endpointId?: unknown };
      return typeof meta.endpointId === "string" && meta.endpointId.length > 0
        ? [meta.endpointId]
        : [];
    } catch {
      return [];
    }
  });

const roleAction = (
  kind: RoleActionKind,
  status: "idle" | "saving" | "saved" | "error",
  message?: string,
  token?: number,
) => ({
  kind,
  status,
  ...(message === undefined ? {} : { message }),
  ...(token === undefined ? {} : { token }),
});

const accountRoleIds = (
  binding: Record<string, unknown> | undefined,
  allRoleIds: readonly string[],
): string[] => {
  if (binding === undefined) return [...allRoleIds];
  const mode = binding.roleAssignmentMode;
  if (mode === "all" || mode === undefined) return [...allRoleIds];
  if (mode === "exclude") {
    const disabled = new Set(
      Array.isArray(binding.disabledRoleIds)
        ? binding.disabledRoleIds.filter((id): id is string => typeof id === "string")
        : [],
    );
    return allRoleIds.filter((id) => !disabled.has(id));
  }
  const enabled = Array.isArray(binding.enabledRoleIds)
    ? binding.enabledRoleIds.filter((id): id is string => typeof id === "string")
    : Array.isArray(binding.roleIds)
      ? binding.roleIds.filter((id): id is string => typeof id === "string")
      : [];
  return enabled;
};

const accountRoleMutation = (
  account: Record<string, unknown>,
  modelId: string,
  roleIds: readonly string[],
  allRoleIds: readonly string[],
  endpointId?: string,
): string => {
  const bindings = Array.isArray(account.modelRoleBindings) ? account.modelRoleBindings : [];
  const otherBindings = bindings.filter((entry) => {
    if (entry === null || typeof entry !== "object") return false;
    const binding = entry as Record<string, unknown>;
    return endpointId === undefined
      ? binding.modelId !== modelId
      : binding.endpointId !== endpointId;
  });
  const selected = new Set(roleIds);
  const known = allRoleIds.filter((roleId) => selected.has(roleId));
  const assignment =
    allRoleIds.length > 0 && known.length === allRoleIds.length
      ? {
          disabledRoleIds: [] as string[],
          enabledRoleIds: [] as string[],
          roleAssignmentMode: "all" as const,
        }
      : known.length === 0
        ? {
            disabledRoleIds: [] as string[],
            enabledRoleIds: [] as string[],
            roleAssignmentMode: "include" as const,
          }
        : {
            disabledRoleIds: allRoleIds.filter((roleId) => !selected.has(roleId)),
            enabledRoleIds: [] as string[],
            roleAssignmentMode: "exclude" as const,
          };
  const nextBinding = {
    modelId,
    ...(endpointId === undefined ? {} : { endpointId }),
    roleIds: assignment.roleAssignmentMode === "include" ? [...assignment.enabledRoleIds] : [],
    ...assignment,
  };
  return JSON.stringify({
    ...account,
    modelRoleBindings: [...otherBindings, nextBinding],
  });
};

const peerRows = (
  model: Model,
): ReadonlyArray<{ readonly authToken?: string; readonly id: string; readonly url: string }> =>
  model.readbacks.localPeers.rows.flatMap((row) => {
    try {
      // SAFETY: localPeers rows carry this JSON record in meta.
      const meta = JSON.parse(row.meta) as {
        readonly authToken?: string | null;
        readonly id: string;
        readonly url: string;
      };
      return [
        {
          id: meta.id,
          url: meta.url,
          ...(typeof meta.authToken === "string" ? { authToken: meta.authToken } : {}),
        },
      ];
    } catch {
      return [];
    }
  });

export const createUpdate = (
  readDiagnostics: ReadDiagnosticsCommand,
  refreshSnapshot: RefreshSnapshotCommand = noopRefreshSnapshot,
  readObservability: ReadObservabilityCommand = noopObservability,
  readReadback: ReadReadbackCommand = noopReadback,
  readControl: ReadControlCommand = noopControl,
  dispatchControl: DispatchControlCommand = noopDispatchControl,
  dispatchStudio: DispatchStudioCommand = noopDispatchStudio,
  saveRuntimeConfig: SaveRuntimeConfigCommand | undefined = undefined,
  deviceAuthCommands: DeviceAuthCommands = noopDeviceAuthCommands,
  providerAccountCommands: ProviderAccountCommands = noopProviderAccountCommands,
  endpointAdmissionCommands: EndpointAdmissionCommands = noopEndpointAdmissionCommands,
  learningRankingCommands: LearningRankingCommands = noopLearningRankingCommands,
  requestsRankingCommands: RequestsRankingCommands = noopRequestsRankingCommands,
  routerConfigCommands: RouterConfigCommands = noopRouterConfigCommands,
  localPolicyCommandsArg: LocalPolicyCommands = localPolicyCommands,
  storageRetentionCommands: StorageRetentionCommands = noopStorageRetentionCommands,
  operatorLearningCommands: OperatorLearningCommands = noopOperatorLearningCommands,
  replayAutoQueueCommands: ReplayAutoQueueCommands = noopReplayAutoQueueCommands,
  modelsCommands: ModelsCommands = noopModelsCommands,
  localPeersCommands: LocalPeersCommands = noopLocalPeersCommands,
  routingChartsCommands: RoutingChartsCommands = noopRoutingChartsCommands,
  requestsChartsCommands: RequestsChartsCommands = noopRequestsChartsCommands,
  systemOperatorCommands: SystemOperatorCommands = noopSystemOperatorCommands,
  systemExtensionsCommands: SystemExtensionsCommands = noopSystemExtensionsCommands,
) => {
  const routingChartsToken = (model: Model): number => (model.routingCharts?.token ?? 0) + 1;
  const routingChartsLoading = (model: Model): NonNullable<Model["routingCharts"]> => ({
    entries: [],
    status: "loading",
    token: routingChartsToken(model),
  });
  const loadRoutingChartsCommand = (model: Model, windowMs: number) => {
    const filters = model.observeRoutingFilters;
    return routingChartsCommands.load({
      queriesJson: JSON.stringify(
        buildRoutingChartQueries(
          windowMs,
          routingBreakdownDimension(filters?.breakdown),
          routingChartFilters(filters),
        ),
      ),
      token: routingChartsToken(model),
    });
  };

  const requestsChartsToken = (model: Model): number => (model.requestsCharts?.token ?? 0) + 1;
  const requestsChartsLoading = (model: Model): NonNullable<Model["requestsCharts"]> => ({
    entries: [],
    status: "loading",
    token: requestsChartsToken(model),
  });
  const loadRequestsChartsCommand = (model: Model, windowMs: number) => {
    const filters = model.requestsFilters;
    const ranking = model.requestsRanking ?? initialRequestsRankingState();
    return requestsChartsCommands.load({
      queriesJson: JSON.stringify(
        buildRequestsChartQueries(windowMs, {
          breakdown: requestsBreakdownDimension(filters?.breakdown),
          filters: requestsChartFilters(filters),
          rankingDimension: ranking.rankingTarget,
          rankingMetric: ranking.metric,
        }),
      ),
      token: requestsChartsToken(model),
    });
  };

  type BenchmarkProgress = NonNullable<NonNullable<Model["modelsView"]>["benchmarkProgress"]>;

  /**
   * S638: keeps the whole host progress snapshot (phase, endpoint/case context, terminal error and the completed
   * run result) instead of only N/M steps, so the benchmark panel can show phase wording and surface per-case
   * failures. Accepts the raw JSON readback row meta or the polled progress body.
   */
  const benchmarkProgressFrom = (raw: unknown): BenchmarkProgress | undefined => {
    const record = (raw ?? {}) as Record<string, unknown>;
    const runId = typeof record.runId === "string" ? record.runId : "";
    if (runId.length === 0) return undefined;
    const status =
      record.status === "completed"
        ? "completed"
        : record.status === "failed"
          ? "failed"
          : "running";
    const numberField = (key: string): number | undefined =>
      typeof record[key] === "number" ? (record[key] as number) : undefined;
    const stringField = (key: string): string | undefined =>
      typeof record[key] === "string" ? (record[key] as string) : undefined;
    const phase = record.currentPhase;
    const runPhase = record.runPhase;
    const result = record.result;
    const rawCounts = record.caseCounts;
    const caseCounts =
      rawCounts !== null &&
      typeof rawCounts === "object" &&
      typeof (rawCounts as { readonly total?: unknown }).total === "number" &&
      typeof (rawCounts as { readonly passed?: unknown }).passed === "number" &&
      typeof (rawCounts as { readonly failed?: unknown }).failed === "number"
        ? {
            failed: (rawCounts as { readonly failed: number }).failed,
            passed: (rawCounts as { readonly passed: number }).passed,
            total: (rawCounts as { readonly total: number }).total,
          }
        : undefined;
    const outcome =
      record.outcome === "passed" || record.outcome === "partial" || record.outcome === "failed"
        ? record.outcome
        : undefined;
    const requestedEndpointCount =
      typeof record.requestedEndpointCount === "number" ? record.requestedEndpointCount : undefined;
    const executedEndpointCount =
      typeof record.executedEndpointCount === "number" ? record.executedEndpointCount : undefined;
    const skippedEndpoints = Array.isArray(record.skippedEndpoints)
      ? record.skippedEndpoints.filter((value): value is string => typeof value === "string")
      : undefined;
    return {
      runId,
      status,
      ...(caseCounts === undefined ? {} : { caseCounts }),
      ...(outcome === undefined ? {} : { outcome }),
      ...(requestedEndpointCount === undefined ? {} : { requestedEndpointCount }),
      ...(executedEndpointCount === undefined ? {} : { executedEndpointCount }),
      ...(skippedEndpoints === undefined ? {} : { skippedEndpoints }),
      ...(numberField("caseCount") === undefined ? {} : { caseCount: numberField("caseCount") }),
      ...(numberField("caseIndex") === undefined ? {} : { caseIndex: numberField("caseIndex") }),
      ...(numberField("completedSteps") === undefined
        ? {}
        : { completedSteps: numberField("completedSteps") }),
      ...(stringField("currentCaseId") === undefined
        ? {}
        : { currentCaseId: stringField("currentCaseId") }),
      ...(stringField("currentEndpointModelId") === undefined
        ? {}
        : { currentEndpointModelId: stringField("currentEndpointModelId") }),
      ...(phase === "execute" || phase === "judge" || phase === "compare"
        ? { currentPhase: phase }
        : {}),
      ...(numberField("endpointCount") === undefined
        ? {}
        : { endpointCount: numberField("endpointCount") }),
      ...(numberField("endpointIndex") === undefined
        ? {}
        : { endpointIndex: numberField("endpointIndex") }),
      ...(stringField("errorCode") === undefined ? {} : { errorCode: stringField("errorCode") }),
      ...(stringField("errorMessage") === undefined
        ? {}
        : { errorMessage: stringField("errorMessage") }),
      ...(runPhase === "execution" ||
      runPhase === "grading" ||
      runPhase === "compare" ||
      runPhase === "complete"
        ? { runPhase }
        : {}),
      ...(numberField("totalSteps") === undefined ? {} : { totalSteps: numberField("totalSteps") }),
      ...(numberField("updatedAtMs") === undefined
        ? {}
        : { updatedAtMs: numberField("updatedAtMs") }),
      ...(result === undefined || result === null ? {} : { resultJson: JSON.stringify(result) }),
    };
  };

  const updateRequestsRankingField = (
    model: Model,
    field: "metric" | "rankingTarget",
    value: string,
  ): UpdateReturn<Model, Message> => {
    const state = model.requestsRanking ?? initialRequestsRankingState();
    const plan = planRequestsRankingFieldChange(state, field, value);
    if (plan.kind === "error") {
      return { model: { ...model, requestsRanking: plan.state } };
    }
    const nextModel: Model = { ...model, requestsRanking: plan.state };
    return {
      commands: [
        requestsRankingCommands.query({
          payload: JSON.stringify(plan.payload),
          token: plan.state.token,
        }),
        loadRequestsChartsCommand(nextModel, windowForRange(model.requestsFilters?.range)),
      ],
      model: { ...nextModel, requestsCharts: requestsChartsLoading(model) },
    };
  };

  const updateRequestsMetricListbox = (
    model: Model,
    message: Parameters<typeof requestsMetricListbox.update>[1],
  ): UpdateReturn<Model, Message> => {
    const child = requestsMetricListbox.update(
      model.requestsRankingMetricListbox ?? initRequestsMetricListbox(),
      message,
    );
    const nextModel: Model = {
      ...model,
      // SAFETY: the child model comes from this single-select Listbox's own update, whose Model schema is the bound child type.
      requestsRankingMetricListbox: child.model as RequestsMetricListboxModel,
    };
    if (child.outMessage !== undefined) {
      return updateRequestsRankingField(nextModel, "metric", child.outMessage.value);
    }
    return {
      commands: Command.mapMessages(child.commands ?? [], (childMessage) =>
        Message.GotRequestsRankingMetricListboxMessage({ message: childMessage }),
      ),
      model: nextModel,
    };
  };

  const updateRequestsTargetListbox = (
    model: Model,
    message: Parameters<typeof requestsMetricListbox.update>[1],
  ): UpdateReturn<Model, Message> => {
    const child = requestsMetricListbox.update(
      model.requestsRankingTargetListbox ?? initRequestsTargetListbox(),
      message,
    );
    const nextModel: Model = {
      ...model,
      // SAFETY: the child model comes from this single-select Listbox's own update, whose Model schema is the bound child type.
      requestsRankingTargetListbox: child.model as RequestsMetricListboxModel,
    };
    if (child.outMessage !== undefined) {
      return updateRequestsRankingField(nextModel, "rankingTarget", child.outMessage.value);
    }
    return {
      commands: Command.mapMessages(child.commands ?? [], (childMessage) =>
        Message.GotRequestsRankingTargetListboxMessage({ message: childMessage }),
      ),
      model: nextModel,
    };
  };

  const endpointAdmissionCompletion = (
    model: Model,
    state: EndpointAdmissionState,
    run: EndpointAdmissionState["run"],
  ): UpdateReturn<Model, Message> => {
    return {
      model: { ...model, endpointAdmission: endpointAdmissionCompletionState(state, run) },
    };
  };

  const navigateToRoute = (
    model: Model,
    route: AppRoute,
    canonicalUrl: Url,
  ): UpdateReturn<Model, Message> => {
    // S409: a real navigation resets the route-scoped chart interaction (tooltip cleared, token bumped).
    const chartInteraction = chartInteractionForRoute(model.chartInteraction, route._tag);
    if (route._tag === "Diagnostics") {
      return {
        commands: [readDiagnostics({ id: route.id }), scrollShellToTopCommand()],
        model: {
          ...model,
          diagnostics: loadingDiagnostics(route.id),
          observability: idleObservability(),
          readbacks: emptyReadbacks(),
          refresh: {
            ...model.refresh,
            message: undefined,
            resyncToken: model.refresh.resyncToken + 1,
            status: "idle",
          },
          route,
          chartInteraction,
        },
      };
    }
    if (route._tag === "Observability") {
      const token = model.observability.token + 1;
      return {
        commands: [readObservability({ token }), scrollShellToTopCommand()],
        model: {
          ...model,
          diagnostics: idleDiagnostics(),
          observability: loadingObservability(token),
          readbacks: emptyReadbacks(),
          refresh: {
            ...model.refresh,
            message: undefined,
            resyncToken: model.refresh.resyncToken + 1,
            status: "idle",
          },
          route,
          chartInteraction,
        },
      };
    }
    if (route._tag === "Studio") {
      const token = model.readbacks.configuredModels.token + 1;
      return {
        commands: [readReadback({ key: "configuredModels", token }), scrollShellToTopCommand()],
        model: {
          ...model,
          diagnostics: idleDiagnostics(),
          observability: idleObservability(),
          readbacks: { ...emptyReadbacks(), configuredModels: loadingReadback(token) },
          refresh: {
            ...model.refresh,
            message: undefined,
            resyncToken: model.refresh.resyncToken + 1,
            status: "idle",
          },
          route,
          chartInteraction,
          studio: studioIdle(studioTabFromUrl(canonicalUrl) ?? "chat"),
        },
      };
    }
    if (route._tag === "Endpoints" || route._tag === "Providers") {
      const keys: ReadonlyArray<ReadbackKey> =
        route._tag === "Endpoints"
          ? [
              "modelEndpoints",
              "configuredModels",
              "integrationProviders",
              "providerCatalog",
              "providerAccounts",
              "roles",
            ]
          : [
              "integrationProviders",
              "configuredModels",
              "modelEndpoints",
              "providerCatalog",
              "providerAccounts",
              "roles",
            ];
      const readbacks = { ...emptyReadbacks() };
      const controlKey = route._tag === "Endpoints" ? "endpoints" : "providers";
      const controlToken = model.controls[controlKey].token + 1;
      const commands = keys.map((key) => {
        const token = model.readbacks[key].token + 1;
        readbacks[key] = loadingReadback(token);
        return readReadback({ key, token });
      });
      return {
        commands: [
          ...commands,
          readControl({ key: controlKey, token: controlToken }),
          scrollShellToTopCommand(),
        ],
        model: {
          ...model,
          controls: { ...emptyControls(), [controlKey]: loadingControl(controlToken) },
          diagnostics: idleDiagnostics(),
          observability: idleObservability(),
          readbacks,
          refresh: {
            ...model.refresh,
            message: undefined,
            resyncToken: model.refresh.resyncToken + 1,
            status: "idle",
          },
          route,
          chartInteraction,
        },
      };
    }
    const routerKeys: ReadonlyArray<ReadbackKey> | null =
      route._tag === "Router"
        ? ["router", "routerConfig", "routerCandidates", "runtimeConfig", "health"]
        : route._tag === "RouterStrategy" ||
            route._tag === "RouterWorkloads" ||
            route._tag === "RouterConfig" ||
            route._tag === "RouterAgentStrategy"
          ? ["routerConfig", "runtimeConfig"]
          : null;
    if (routerKeys !== null) {
      const readbacks = { ...model.readbacks };
      const commands = routerKeys.map((key) => {
        const token = readbacks[key].token + 1;
        readbacks[key] = loadingReadback(token);
        return readReadback({ key, token });
      });
      return {
        commands: [...commands, scrollShellToTopCommand()],
        model: {
          ...model,
          diagnostics: idleDiagnostics(),
          observability: idleObservability(),
          readbacks,
          refresh: {
            ...model.refresh,
            message: undefined,
            resyncToken: model.refresh.resyncToken + 1,
            status: "idle",
          },
          route,
          chartInteraction,
        },
      };
    }
    const controlKey = controlKeyForRouteTag(route._tag);
    if (controlKey !== null) {
      const token = model.controls[controlKey].token + 1;
      return {
        commands: [readControl({ key: controlKey, token }), scrollShellToTopCommand()],
        model: {
          ...model,
          controls: { ...model.controls, [controlKey]: loadingControl(token) },
          diagnostics: idleDiagnostics(),
          observability: idleObservability(),
          readbacks: emptyReadbacks(),
          refresh: {
            ...model.refresh,
            message: undefined,
            resyncToken: model.refresh.resyncToken + 1,
            status: "idle",
          },
          route,
          chartInteraction,
        },
      };
    }
    const readbackKey = readbackKeyForRouteTag(route._tag);
    if (readbackKey !== null) {
      const learningPacks = route._tag === "Learning";
      const benchmark = route._tag === "Benchmark";
      // The Requests and Observe-routing volume charts read the same metrics page as the overview.
      const observeVolume = route._tag === "Requests" || route._tag === "ObserveRouting";
      const routingCharts = route._tag === "ObserveRouting";
      const requestsCharts = route._tag === "Requests";
      const observeRange =
        route._tag === "Requests"
          ? model.requestsFilters?.range
          : model.observeRoutingFilters?.range;
      const token = model.readbacks[readbackKey].token + 1;
      const readbacks = { ...model.readbacks, [readbackKey]: loadingReadback(token) };
      const withVolume = observeVolume
        ? {
            ...readbacks,
            overviewMetrics: loadingReadback(model.readbacks.overviewMetrics.token + 1),
          }
        : readbacks;
      return {
        commands: [
          readReadback({
            id:
              route._tag === "RequestDetail" || route._tag === "RouterDecisionDetail"
                ? route.requestId
                : undefined,
            key: readbackKey,
            token,
          }),
          ...(learningPacks ? [readReadback({ key: "learningPacks", token })] : []),
          ...(benchmark
            ? [
                readReadback({ key: "benchmarkSummary" as const, token }),
                readReadback({ key: "benchmarkRuns" as const, token }),
                readReadback({ key: "benchmarkPreferences" as const, token }),
                readReadback({ key: "benchmarkActiveRun" as const, token }),
              ]
            : []),
          ...(observeVolume
            ? [
                readReadback({
                  key: "overviewMetrics",
                  query: overviewQuery(DEFAULT_OVERVIEW_FILTERS, windowForRange(observeRange)),
                  token: model.readbacks.overviewMetrics.token + 1,
                }),
              ]
            : []),
          ...(routingCharts ? [loadRoutingChartsCommand(model, windowForRange(observeRange))] : []),
          ...(requestsCharts
            ? [loadRequestsChartsCommand(model, windowForRange(observeRange))]
            : []),
          scrollShellToTopCommand(),
        ],
        model: {
          ...model,
          diagnostics: idleDiagnostics(),
          observability: idleObservability(),
          readbacks: learningPacks
            ? { ...withVolume, learningPacks: loadingReadback(token) }
            : benchmark
              ? {
                  ...withVolume,
                  benchmarkRuns: loadingReadback(token),
                  benchmarkSummary: loadingReadback(token),
                  benchmarkPreferences: loadingReadback(token),
                  benchmarkActiveRun: loadingReadback(token),
                }
              : withVolume,
          routingCharts: routingCharts ? routingChartsLoading(model) : model.routingCharts,
          requestsCharts: requestsCharts ? requestsChartsLoading(model) : model.requestsCharts,
          refresh: {
            ...model.refresh,
            message: undefined,
            resyncToken: model.refresh.resyncToken + 1,
            status: "idle",
          },
          route,
          chartInteraction,
        },
      };
    }
    return {
      commands: [scrollShellToTopCommand()],
      model: {
        ...model,
        controls: emptyControls(),
        diagnostics: idleDiagnostics(),
        observability: idleObservability(),
        readbacks: emptyReadbacks(),
        refresh: {
          ...model.refresh,
          message: undefined,
          resyncToken: model.refresh.resyncToken + 1,
          status: "idle",
        },
        route,
        chartInteraction,
      },
    };
  };

  // S278 (R12): a telemetry invalidation re-reads only the current route, through the same real
  // commands a contiguous revision uses. It writes nothing to `refresh`: the telemetry payload
  // carries no revision, so this transition must never advance the watermark, bump the
  // gap/resync token, or claim the topology moved. Routes without a readback or observability
  // reader (control, learning) have no telemetry invalidation yet; that is explicit remaining
  // coverage, not a fabricated refresh.
  /**
   * S392a (R12): the typed read plan for the current route. EVERY real source of the route is
   * listed with its per-key token owner; multi-source pages (ModelsRoles, SystemOperator) return
   * two entries so one telemetry event invalidates all of them, never only the first.
   */
  const updateLocalPolicyDraft = (
    model: Model,
    change: Partial<LocalPolicyObject>,
  ): UpdateReturn<Model, Message> => {
    const state = model.readbacks.localPolicy;
    const draft = localPolicyDraftFromReadback(state);
    if (draft === undefined || state.status !== "ok") return { model };
    return {
      model: {
        ...model,
        readbacks: {
          ...model.readbacks,
          localPolicy: withLocalPolicyDraft(
            { ...state, message: undefined },
            { ...draft, ...change },
          ),
        },
      },
    };
  };

  const activationPayloadDigest = (
    activations: ReadonlyArray<{
      readonly modelId: string;
      readonly providerAccountId: string;
      readonly region: string;
    }>,
  ): string => {
    let hash = 2166136261;
    const text = JSON.stringify(activations);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  };

  const activationBatchIdFor = (
    token: number,
    activations: ReadonlyArray<{
      readonly modelId: string;
      readonly providerAccountId: string;
      readonly region: string;
    }>,
  ): string => `activation-${String(token)}-${activationPayloadDigest(activations)}`;

  const RAIL_KEYS = [
    "models",
    "runtimeSummary",
    "health",
    "dashboard",
    "router",
    "overviewMetrics",
    "routerCandidates",
  ] as const;
  const refreshRailReadbacks = (
    model: Model,
  ): {
    readonly commands: ReadonlyArray<ReturnType<typeof readReadback>>;
    readonly readbacks: Model["readbacks"];
  } => {
    const readbacks = { ...model.readbacks };
    const commands: Array<ReturnType<typeof readReadback>> = [];
    for (const key of RAIL_KEYS) {
      const token = readbacks[key].token + 1;
      readbacks[key] = loadingReadback(token);
      const id = key === "dashboard" || key === "overviewMetrics" ? "86400000" : undefined;
      commands.push(readReadback({ ...(id === undefined ? {} : { id }), key, token }));
    }
    return { commands, readbacks };
  };

  const readPlanForRoute = (
    model: Model,
  ): ReadonlyArray<{
    readonly key: ReadbackKey;
    readonly id?: string;
    readonly query?: string;
  }> => {
    if (model.route._tag === "Learning") return [{ key: "learning" }, { key: "learningPacks" }];
    if (model.route._tag === "ModelsRoles")
      return [{ key: "configuredModels" }, { key: "modelEndpoints" }, { key: "rolePolicy" }];
    if (model.route._tag === "Providers")
      return [
        { key: "integrationProviders" },
        { key: "configuredModels" },
        { key: "modelEndpoints" },
      ];
    if (model.route._tag === "Endpoints")
      return [
        { key: "modelEndpoints" },
        { key: "configuredModels" },
        { key: "integrationProviders" },
      ];
    if (model.route._tag === "IntegrationsDownstream")
      return [{ key: "downstreamOpenAI" }, { key: "configuredModels" }];
    if (model.route._tag === "IntegrationsUpstream")
      return [{ key: "integrationProviders" }, { key: "configuredModels" }];
    if (model.route._tag === "SystemOperator")
      return [
        { key: "operatorStatus" },
        { key: "operatorTraceRoots" },
        { key: "replayJobs" },
        { key: "evaluationJobs" },
        { key: "learningProfile" },
        { key: "learningAdvisory" },
      ];
    if (model.route._tag === "SystemExtensions")
      return [
        { key: "extensions" },
        { key: "contribution" },
        { key: "recommendations" },
        { key: "replayAutomation" },
      ];
    if (model.route._tag === "RuntimeConfig") return [{ key: "runtimeConfig" }];
    if (model.route._tag === "Benchmark")
      return [
        { key: "benchmarkSuite" },
        { key: "benchmarkSummary" },
        { key: "benchmarkRuns" },
        { key: "benchmarkPreferences" },
        { key: "benchmarkActiveRun" },
        { key: "modelEndpoints" },
      ];
    if (model.route._tag === "Requests")
      return [
        { key: "requests" },
        {
          key: "overviewMetrics",
          query: overviewQuery(
            DEFAULT_OVERVIEW_FILTERS,
            windowForRange(model.requestsFilters?.range),
          ),
        },
      ];
    if (model.route._tag === "ObserveRouting")
      return [
        { key: "observeRouting" },
        {
          key: "overviewMetrics",
          query: overviewQuery(
            DEFAULT_OVERVIEW_FILTERS,
            windowForRange(model.observeRoutingFilters?.range),
          ),
        },
      ];
    if (model.route._tag === "Router")
      return [
        { key: "router" },
        { key: "routerConfig" },
        { key: "routerCandidates" },
        { key: "runtimeConfig" },
        { key: "health" },
      ];
    if (
      model.route._tag === "RouterStrategy" ||
      model.route._tag === "RouterWorkloads" ||
      model.route._tag === "RouterConfig" ||
      model.route._tag === "RouterAgentStrategy"
    )
      return [{ key: "routerConfig" }, { key: "runtimeConfig" }];
    const readbackKey = readbackKeyForRouteTag(model.route._tag);
    if (readbackKey === null) return [];
    const detailId =
      model.route._tag === "RequestDetail" || model.route._tag === "RouterDecisionDetail"
        ? model.route.requestId
        : undefined;
    const windowMs = model.overviewWindowMs ?? 86_400_000;
    const id = readbackKey === "dashboard" ? String(windowMs) : detailId;
    const query =
      readbackKey === "overviewMetrics"
        ? overviewQuery(model.overviewFilters ?? DEFAULT_OVERVIEW_FILTERS, windowMs)
        : undefined;
    return [{ id, key: readbackKey, query }];
  };

  const invalidateCurrentRoute = (model: Model): UpdateReturn<Model, Message> => {
    const plan = readPlanForRoute(model);
    if (plan.length > 0) {
      const readbacks = { ...model.readbacks };
      const commands = plan.map((entry) => {
        const token = readbacks[entry.key].token + 1;
        readbacks[entry.key] =
          entry.key === "localPolicy"
            ? { ...readbacks.localPolicy, message: undefined, status: "loading", token }
            : loadingReadback(token);
        // The command's id/query args are typed optional, so undefined forwards as "absent".
        return readReadback({ id: entry.id, key: entry.key, query: entry.query, token });
      });
      const learningRanking =
        model.route._tag === "Learning"
          ? { nextToken: model.learningRanking?.nextToken, phases: {} }
          : model.learningRanking;
      return { commands, model: { ...model, learningRanking, readbacks } };
    }
    if (model.route._tag === "Observability") {
      const token = model.observability.token + 1;
      return {
        commands: [readObservability({ token })],
        model: { ...model, observability: loadingObservability(token) },
      };
    }
    const controlKey = controlKeyForRouteTag(model.route._tag);
    if (controlKey !== null) {
      const token = model.controls[controlKey].token + 1;
      return {
        commands: [readControl({ key: controlKey, token })],
        model: { ...model, controls: { ...model.controls, [controlKey]: loadingControl(token) } },
      };
    }
    return { model };
  };

  return (model: Model, message: Message): UpdateReturn<Model, Message> => {
    const shellHandlers = {
      ChangedUrl: ({
        url,
      }: Extract<Message, { readonly _tag: "ChangedUrl" }>): UpdateReturn<Model, Message> => {
        const resolved = resolveAppUrl(url);
        const incomingHref = canonicalHrefForUrl(url);
        // S272: consume exactly the pending replace echo of our own Navigation.replaceUrl
        // Command. The marker is keyed to the exact canonical href, so a genuine same-route
        // navigation (the same URL after the echo, a changed query, another detail ID, or an
        // interleaved route) runs the baseline read/reset/resync/scroll instead of being dropped.
        if (isPendingRedirectEcho(model, resolved, incomingHref)) {
          return { model: { ...model, pendingRedirectHref: undefined } };
        }
        const result = navigateToRoute(model, resolved.route, resolved.canonicalUrl);
        if (resolved.redirectHref === undefined) {
          return { ...result, model: { ...result.model, pendingRedirectHref: undefined } };
        }
        return {
          ...result,
          commands: [
            ...(result.commands ?? []),
            replaceLegacyUrlCommand({ href: resolved.redirectHref }),
          ],
          model: { ...result.model, pendingRedirectHref: resolved.redirectHref },
        };
      },
      Clicked: (): UpdateReturn<Model, Message> => ({
        model: { ...model, clicks: model.clicks + 1 },
      }),
      ClickedLink: ({
        request,
      }: Extract<Message, { readonly _tag: "ClickedLink" }>): UpdateReturn<Model, Message> =>
        UrlRequest.match<UpdateReturn<Model, Message>>(request, {
          External: () => ({ model }),
          Internal: ({ url }) => ({
            commands: [pushInternal({ href: urlToString(url) })],
            model,
          }),
        }),
      NavigationCompleted: (): UpdateReturn<Model, Message> => ({ model }),
      SelectedOverviewWindow: ({
        windowMs,
      }: Extract<Message, { readonly _tag: "SelectedOverviewWindow" }>): UpdateReturn<
        Model,
        Message
      > => {
        const current = model.readbacks.overviewMetrics;
        const token = current.token + 1;
        const filters = model.overviewFilters ?? DEFAULT_OVERVIEW_FILTERS;
        return {
          commands: [
            readReadback({
              key: "overviewMetrics",
              query: overviewQuery(filters, windowMs),
              token,
            }),
          ],
          model: {
            ...model,
            overviewWindowMs: windowMs,
            readbacks: { ...model.readbacks, overviewMetrics: loadingReadback(token) },
          },
        };
      },
      OverviewFilterChanged: ({
        filter,
        value,
      }: Extract<Message, { readonly _tag: "OverviewFilterChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const current = model.readbacks.overviewMetrics;
        const token = current.token + 1;
        const previous = model.overviewFilters ?? DEFAULT_OVERVIEW_FILTERS;
        const filters: OverviewFilters = { ...previous, [filter]: value } as OverviewFilters;
        return {
          commands: [
            readReadback({
              key: "overviewMetrics",
              query: overviewQuery(filters, model.overviewWindowMs ?? 86400000),
              token,
            }),
          ],
          model: {
            ...model,
            overviewFilters: filters,
            readbacks: { ...model.readbacks, overviewMetrics: loadingReadback(token) },
          },
        };
      },
      RefreshResyncFailed: ({
        message,
        routeId,
        token,
      }: Extract<Message, { readonly _tag: "RefreshResyncFailed" }>): UpdateReturn<
        Model,
        Message
      > =>
        token === model.refresh.resyncToken &&
        model.route._tag === "Diagnostics" &&
        model.route.id === routeId
          ? {
              model: {
                ...model,
                refresh: {
                  ...model.refresh,
                  message,
                  status: "stale",
                },
              },
            }
          : { model },
      RuntimeRevisionReceived: ({
        revision,
      }: Extract<Message, { readonly _tag: "RuntimeRevisionReceived" }>): UpdateReturn<
        Model,
        Message
      > => {
        const current = model.refresh;
        if (revision <= current.lastAppliedRevision) {
          // An older revision arriving after a newer one must not be applied.
          return { model };
        }
        const gap = current.lastAppliedRevision > 0 && revision > current.lastAppliedRevision + 1;
        if (!gap) {
          if (model.route._tag === "Learning") {
            const learningToken = model.readbacks.learning.token + 1;
            const packsToken = model.readbacks.learningPacks.token + 1;
            return {
              commands: [
                readReadback({ key: "learning", token: learningToken }),
                readReadback({ key: "learningPacks", token: packsToken }),
              ],
              model: {
                ...model,
                learningRanking: { nextToken: model.learningRanking?.nextToken, phases: {} },
                readbacks: {
                  ...model.readbacks,
                  learning: loadingReadback(learningToken),
                  learningPacks: loadingReadback(packsToken),
                },
                refresh: {
                  ...current,
                  lastAppliedRevision: revision,
                  message: current.status === "stale" ? current.message : undefined,
                  status: current.status === "stale" ? "stale" : "live",
                },
              },
            };
          }
          const readbackKey = readbackKeyForRouteTag(model.route._tag);
          if (readbackKey !== null) {
            const token = model.readbacks[readbackKey].token + 1;
            const nextReadback =
              readbackKey === "localPolicy"
                ? {
                    ...model.readbacks.localPolicy,
                    message: undefined,
                    status: "loading" as const,
                    token,
                  }
                : loadingReadback(token);
            return {
              commands: [
                readReadback({
                  id:
                    model.route._tag === "RequestDetail" ||
                    model.route._tag === "RouterDecisionDetail"
                      ? model.route.requestId
                      : undefined,
                  key: readbackKey,
                  token,
                }),
              ],
              model: {
                ...model,
                readbacks: { ...model.readbacks, [readbackKey]: nextReadback },
                refresh: {
                  ...current,
                  lastAppliedRevision: revision,
                  message: current.status === "stale" ? current.message : undefined,
                  status: current.status === "stale" ? "stale" : "live",
                },
              },
            };
          }
          if (model.route._tag === "Observability") {
            const token = model.observability.token + 1;
            return {
              commands: [readObservability({ token })],
              model: {
                ...model,
                observability: loadingObservability(token),
                refresh: {
                  ...current,
                  lastAppliedRevision: revision,
                  message: current.status === "stale" ? current.message : undefined,
                  status: current.status === "stale" ? "stale" : "live",
                },
              },
            };
          }
          return {
            model: {
              ...model,
              refresh: {
                ...current,
                lastAppliedRevision: revision,
                // A failed resync is sticky: contiguous progress must not clear it.
                message: current.status === "stale" ? current.message : undefined,
                status: current.status === "stale" ? "stale" : "live",
              },
            },
          };
        }
        const readbackKey = readbackKeyForRouteTag(model.route._tag);
        if (readbackKey !== null) {
          const token = model.readbacks[readbackKey].token + 1;
          return {
            commands: [
              readReadback({
                id:
                  model.route._tag === "RequestDetail" ||
                  model.route._tag === "RouterDecisionDetail"
                    ? model.route.requestId
                    : undefined,
                key: readbackKey,
                token,
              }),
            ],
            model: {
              ...model,
              readbacks: { ...model.readbacks, [readbackKey]: loadingReadback(token) },
              refresh: {
                ...current,
                lastAppliedRevision: revision,
                message: "resyncing after a revision gap",
                resyncToken: current.resyncToken + 1,
                status: "stale",
              },
            },
          };
        }
        if (model.route._tag === "Observability") {
          const token = model.observability.token + 1;
          return {
            commands: [readObservability({ token })],
            model: {
              ...model,
              observability: loadingObservability(token),
              refresh: {
                ...current,
                lastAppliedRevision: revision,
                message: "resyncing after a revision gap",
                resyncToken: current.resyncToken + 1,
                status: "stale",
              },
            },
          };
        }
        const token = current.resyncToken + 1;
        return {
          commands: [
            refreshSnapshot({
              routeId: model.route._tag === "Diagnostics" ? model.route.id : "",
              token,
            }),
          ],
          model: {
            ...model,
            refresh: {
              ...current,
              lastAppliedRevision: revision,
              message: "resyncing after a revision gap",
              resyncToken: token,
              status: "stale",
            },
          },
        };
      },
      RuntimeTelemetryReceived: (): UpdateReturn<Model, Message> => invalidateCurrentRoute(model),
      // S290: a persisted pageshow restore is a real page-lifecycle fact, not telemetry or a revision:
      // re-read the current route with the same query-preserving invalidator and leave the watermark.
      RuntimePageRestored: (): UpdateReturn<Model, Message> => invalidateCurrentRoute(model),
      ThemeApplied: (): UpdateReturn<Model, Message> => ({ model }),
      LearningModeSelectChanged: ({
        mode,
      }: Extract<Message, { readonly _tag: "LearningModeSelectChanged" }>): UpdateReturn<
        Model,
        Message
      > => ({
        model: { ...model, operatorLearningMode: mode },
      }),
      LearningModeUpdateRequested: ({
        mode,
      }: Extract<Message, { readonly _tag: "LearningModeUpdateRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const token = model.readbacks.learning.token + 1;
        return {
          commands: [operatorLearningCommands.updateMode({ mode, token })],
          model: { ...model, readbacks: { ...model.readbacks, learning: loadingReadback(token) } },
        };
      },
      LearningRollbackRequested: (): UpdateReturn<Model, Message> => {
        const token = model.readbacks.learning.token + 1;
        return {
          commands: [operatorLearningCommands.rollback({ token })],
          model: { ...model, readbacks: { ...model.readbacks, learning: loadingReadback(token) } },
        };
      },
      LearningModeSucceeded: ({
        token,
      }: Extract<Message, { readonly _tag: "LearningModeSucceeded" }>): UpdateReturn<
        Model,
        Message
      > => {
        if (token !== model.readbacks.learning.token) return { model };
        const nextToken = token + 1;
        return {
          commands: [readReadback({ key: "learning", token: nextToken })],
          model: {
            ...model,
            readbacks: {
              ...model.readbacks,
              learning: { ...loadingReadback(nextToken), message: "Learning action completed." },
            },
          },
        };
      },
      LearningModeFailed: ({
        message,
        token,
      }: Extract<Message, { readonly _tag: "LearningModeFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        if (token !== model.readbacks.learning.token) return { model };
        return {
          model: {
            ...model,
            readbacks: {
              ...model.readbacks,
              learning: { ...model.readbacks.learning, message, status: "error" },
            },
          },
        };
      },
      LearningOperatorTokenChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "LearningOperatorTokenChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        writeStoredOperatorToken(value);
        return { model: { ...model, learningOperatorToken: value } };
      },
      LearningDecisionFilterChanged: ({
        filter,
        value,
      }: Extract<Message, { readonly _tag: "LearningDecisionFilterChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const filters = model.learningDecisionFilters ?? {};
        return { model: { ...model, learningDecisionFilters: { ...filters, [filter]: value } } };
      },
      LearningPackRollbackRequested: (): UpdateReturn<Model, Message> => {
        const token = model.readbacks.learningPacks.token + 1;
        const scopeId = model.readbacks.learningPacks.scopeId ?? "standalone-runtime-dev";
        return {
          commands: [operatorLearningCommands.rollbackPack({ scopeId, token })],
          model: {
            ...model,
            learningPackAction: { status: "saving", token },
            readbacks: { ...model.readbacks, learningPacks: loadingReadback(token) },
          },
        };
      },
      LearningPackRollbackSucceeded: ({
        token,
      }: Extract<Message, { readonly _tag: "LearningPackRollbackSucceeded" }>): UpdateReturn<
        Model,
        Message
      > => {
        if (token !== model.learningPackAction?.token) return { model };
        const nextToken = token + 1;
        return {
          commands: [readReadback({ key: "learningPacks", token: nextToken })],
          model: {
            ...model,
            learningPackAction: { message: "Pack rollback completed.", status: "saved", token },
            readbacks: { ...model.readbacks, learningPacks: loadingReadback(nextToken) },
          },
        };
      },
      LearningPackRollbackFailed: ({
        message,
        token,
      }: Extract<Message, { readonly _tag: "LearningPackRollbackFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        if (token !== model.learningPackAction?.token) return { model };
        return { model: { ...model, learningPackAction: { message, status: "error", token } } };
      },
      LearningKillSwitchRequested: ({
        engaged,
      }: Extract<Message, { readonly _tag: "LearningKillSwitchRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const token = model.readbacks.learningPacks.token + 1;
        const scopeId = model.readbacks.learningPacks.scopeId ?? "standalone-runtime-dev";
        return {
          commands: [operatorLearningCommands.killSwitch({ engaged, scopeId, token })],
          model: {
            ...model,
            learningPackAction: { status: "saving", token },
            readbacks: { ...model.readbacks, learningPacks: loadingReadback(token) },
          },
        };
      },
      LearningKillSwitchSucceeded: ({
        token,
      }: Extract<Message, { readonly _tag: "LearningKillSwitchSucceeded" }>): UpdateReturn<
        Model,
        Message
      > => {
        if (token !== model.learningPackAction?.token) return { model };
        const nextToken = token + 1;
        return {
          commands: [readReadback({ key: "learningPacks", token: nextToken })],
          model: {
            ...model,
            learningPackAction: {
              message: "Learning kill switch updated.",
              status: "saved",
              token,
            },
            readbacks: { ...model.readbacks, learningPacks: loadingReadback(nextToken) },
          },
        };
      },
      LearningKillSwitchFailed: ({
        message,
        token,
      }: Extract<Message, { readonly _tag: "LearningKillSwitchFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        if (token !== model.learningPackAction?.token) return { model };
        return { model: { ...model, learningPackAction: { message, status: "error", token } } };
      },
      ReplayAutoQueueToggleChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "ReplayAutoQueueToggleChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.learningReplayAutoQueue ?? {
          dailyCap: "100",
          enabled: "on",
          status: "idle" as const,
        };
        return {
          model: {
            ...model,
            learningReplayAutoQueue: {
              ...state,
              enabled: value === "on" ? "on" : "off",
              status: "idle",
            },
          },
        };
      },
      ReplayAutoQueueCapChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "ReplayAutoQueueCapChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.learningReplayAutoQueue ?? {
          dailyCap: "100",
          enabled: "on",
          status: "idle" as const,
        };
        return {
          model: {
            ...model,
            learningReplayAutoQueue: { ...state, dailyCap: value, status: "idle" },
          },
        };
      },
      ReplayAutoQueueSaveRequested: (): UpdateReturn<Model, Message> => {
        const state = model.learningReplayAutoQueue ?? {
          dailyCap: "100",
          enabled: "on",
          status: "idle" as const,
        };
        const parsed = Number(state.dailyCap);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1_000_000) {
          return {
            model: {
              ...model,
              learningReplayAutoQueue: {
                ...state,
                message: "Daily cap must be a whole number from 1 to 1,000,000.",
                status: "error",
              },
            },
          };
        }
        const token = model.readbacks.runtimeConfig.token + 1;
        return {
          commands: [
            replayAutoQueueCommands.save({
              dailyCap: parsed,
              enabled: state.enabled === "on",
              token,
            }),
          ],
          model: {
            ...model,
            learningReplayAutoQueue: { ...state, message: undefined, status: "saving", token },
          },
        };
      },
      ReplayAutoQueueSaved: ({
        token,
      }: Extract<Message, { readonly _tag: "ReplayAutoQueueSaved" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.learningReplayAutoQueue ?? {
          dailyCap: "100",
          enabled: "on",
          status: "idle" as const,
        };
        if (state.token !== undefined && token !== state.token) return { model };
        return {
          commands: [
            readReadback({ key: "runtimeConfig", token: model.readbacks.runtimeConfig.token + 1 }),
          ],
          model: {
            ...model,
            learningReplayAutoQueue: {
              ...state,
              message: "Replay auto-queue updated.",
              status: "saved",
              token,
            },
          },
        };
      },
      ReplayAutoQueueSaveFailed: ({
        message,
        token,
      }: Extract<Message, { readonly _tag: "ReplayAutoQueueSaveFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.learningReplayAutoQueue ?? {
          dailyCap: "100",
          enabled: "on",
          status: "idle" as const,
        };
        if (state.token !== undefined && token !== state.token) return { model };
        return {
          model: {
            ...model,
            learningReplayAutoQueue: { ...state, message, status: "error", token },
          },
        };
      },
      ModelCardSelected: ({
        modelId,
      }: Extract<Message, { readonly _tag: "ModelCardSelected" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        return { model: { ...model, modelsView: { ...state, selectedModelId: modelId } } };
      },
      ModelsRoleToggled: ({
        enabled,
        modelId,
        roleId,
      }: Extract<Message, { readonly _tag: "ModelsRoleToggled" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        const overrides = (state.roleOverrides ?? []).filter(
          (entry) => !(entry.modelId === modelId && entry.roleId === roleId),
        );
        overrides.push({ enabled, modelId, roleId });
        const baseline = new Set<string>();
        for (const row of model.readbacks.modelEndpoints.rows) {
          try {
            // SAFETY: modelEndpoints rows carry this JSON record in meta.
            const meta = JSON.parse(row.meta) as {
              readonly modelId?: string;
              readonly roleIds?: readonly string[];
            };
            if (meta.modelId === modelId) for (const id of meta.roleIds ?? []) baseline.add(id);
          } catch {
            // Unparseable rows contribute no roles.
          }
        }
        for (const entry of overrides) {
          if (entry.modelId !== modelId) continue;
          if (entry.enabled) baseline.add(entry.roleId);
          else baseline.delete(entry.roleId);
        }
        const rolePolicy = rolePolicyFromReadback(model.readbacks.rolePolicy);
        const allRoleIds = rolePolicy?.roleDefinitions.map((role) => role.role_id) ?? [];
        let remote:
          | { readonly endpointId?: string; readonly providerAccountId: string }
          | undefined;
        for (const row of model.readbacks.modelEndpoints.rows) {
          try {
            // SAFETY: modelEndpoints rows carry this JSON record in meta.
            const meta = JSON.parse(row.meta) as {
              readonly endpointId?: string;
              readonly modelId?: string;
              readonly providerAccountId?: string;
              readonly sourceType?: string;
            };
            if (
              meta.modelId !== modelId ||
              meta.sourceType === "local" ||
              typeof meta.providerAccountId !== "string"
            )
              continue;
            remote = {
              ...(typeof meta.endpointId === "string" ? { endpointId: meta.endpointId } : {}),
              providerAccountId: meta.providerAccountId,
            };
            break;
          } catch {
            // Unparseable rows cannot identify an account binding.
          }
        }
        if (remote !== undefined) {
          const account = model.readbacks.providerAccounts.rows.flatMap((row) => {
            try {
              // SAFETY: providerAccounts rows carry the full account JSON in meta.
              const meta = JSON.parse(row.meta) as Record<string, unknown>;
              return meta.providerAccountId === remote?.providerAccountId ? [meta] : [];
            } catch {
              return [];
            }
          })[0];
          if (account !== undefined) {
            const bindings = Array.isArray(account.modelRoleBindings)
              ? account.modelRoleBindings
              : [];
            const binding =
              bindings.find(
                (entry) =>
                  entry !== null &&
                  typeof entry === "object" &&
                  remote?.endpointId !== undefined &&
                  (entry as Record<string, unknown>).endpointId === remote?.endpointId,
              ) ??
              bindings.find(
                (entry) =>
                  entry !== null &&
                  typeof entry === "object" &&
                  (entry as Record<string, unknown>).endpointId === undefined &&
                  (entry as Record<string, unknown>).modelId === modelId,
              );
            const selected = new Set(
              accountRoleIds(
                binding === null || binding === undefined
                  ? undefined
                  : (binding as Record<string, unknown>),
                allRoleIds,
              ),
            );
            for (const entry of overrides) {
              if (entry.modelId !== modelId) continue;
              if (entry.enabled) selected.add(entry.roleId);
              else selected.delete(entry.roleId);
            }
            return {
              commands: [
                modelsCommands.upsertAccount({
                  accountJson: accountRoleMutation(
                    account,
                    modelId,
                    [...selected].sort(),
                    allRoleIds,
                    remote.endpointId,
                  ),
                  token: model.readbacks.providerAccounts.token + 1,
                }),
              ],
              model: { ...model, modelsView: { ...state, roleOverrides: overrides } },
            };
          }
          return {
            model: {
              ...model,
              modelsView: {
                ...state,
                actionMessage: `Provider account ${remote.providerAccountId} was not found in the account readback; role eligibility was not saved.`,
                roleOverrides: overrides,
              },
            },
          };
        }
        let kind: "llama-swap" | "peer" = "peer";
        for (const row of model.readbacks.modelEndpoints.rows) {
          try {
            // SAFETY: modelEndpoints rows carry this JSON record in meta.
            const meta = JSON.parse(row.meta) as {
              readonly endpointId?: string;
              readonly modelId?: string;
              readonly providerId?: string;
            };
            if (meta.modelId !== modelId) continue;
            if ((meta.providerId ?? meta.endpointId ?? "").toLowerCase().includes("llama"))
              kind = "llama-swap";
          } catch {
            // Unparseable rows leave the default peer kind.
          }
        }
        const token = model.readbacks.modelEndpoints.token + 1;
        return {
          commands: [
            modelsCommands.setRoles({
              kind,
              modelId,
              roleIdsJson: JSON.stringify([...baseline].sort()),
              token,
            }),
          ],
          model: { ...model, modelsView: { ...state, roleOverrides: overrides } },
        };
      },
      RoleDraftChanged: ({
        field,
        value,
      }: Extract<Message, { readonly _tag: "RoleDraftChanged" }>): UpdateReturn<Model, Message> => {
        const state = model.modelsView ?? {};
        const draft = roleDraftFromState(state.roleDraft);
        return {
          model: {
            ...model,
            modelsView: { ...state, roleDraft: roleDraftState({ ...draft, [field]: value }) },
          },
        };
      },
      RoleDraftReset: (): UpdateReturn<Model, Message> => {
        const state = model.modelsView ?? {};
        return { model: { ...model, modelsView: { ...state, roleDraft: undefined } } };
      },
      RoleAdvancedPolicyToggled: (): UpdateReturn<Model, Message> => {
        const state = model.modelsView ?? {};
        return {
          model: {
            ...model,
            modelsView: { ...state, advancedPolicy: state.advancedPolicy !== true },
          },
        };
      },
      RoleEditDraftChanged: ({
        field,
        value,
      }: Extract<Message, { readonly _tag: "RoleEditDraftChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        const policy = rolePolicyFromReadback(model.readbacks.rolePolicy);
        const selected =
          policy?.roleDefinitions.find((role) => role.role_id === state.selectedRoleId) ??
          policy?.roleDefinitions[0];
        const draft =
          state.roleEditDraft === undefined && selected !== undefined
            ? draftFromRole(selected)
            : roleDraftFromState(state.roleEditDraft);
        return {
          model: {
            ...model,
            modelsView: { ...state, roleEditDraft: roleDraftState({ ...draft, [field]: value }) },
          },
        };
      },
      RoleSelected: ({
        roleId,
      }: Extract<Message, { readonly _tag: "RoleSelected" }>): UpdateReturn<Model, Message> => {
        const state = model.modelsView ?? {};
        return {
          model: {
            ...model,
            modelsView: { ...state, selectedRoleId: roleId, roleEditDraft: undefined },
          },
        };
      },
      RoleTaskDetailToggled: ({
        roleId,
      }: Extract<Message, { readonly _tag: "RoleTaskDetailToggled" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        return {
          model: {
            ...model,
            modelsView: {
              ...state,
              expandedRoleId: state.expandedRoleId === roleId ? undefined : roleId,
            },
          },
        };
      },
      RoleEditReset: (): UpdateReturn<Model, Message> => {
        const state = model.modelsView ?? {};
        return { model: { ...model, modelsView: { ...state, roleEditDraft: undefined } } };
      },
      RoleTaskRoleToggled: ({
        roleId,
        taskType,
      }: Extract<Message, { readonly _tag: "RoleTaskRoleToggled" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        const policy = rolePolicyFromReadback(model.readbacks.rolePolicy);
        if (policy === null) return { model };
        const selections =
          state.roleTaskSelections ??
          policy.taskDefinitions.map((task) => ({
            roleIds: [...task.allowed_roles],
            taskType: task.task_type,
          }));
        const updated = selections.map((entry) => {
          if (entry.taskType !== taskType) return entry;
          const roleIds = new Set(entry.roleIds);
          if (roleIds.has(roleId)) roleIds.delete(roleId);
          else roleIds.add(roleId);
          return {
            roleIds: [...roleIds].sort((left, right) => left.localeCompare(right, "en")),
            taskType: entry.taskType,
          };
        });
        return { model: { ...model, modelsView: { ...state, roleTaskSelections: updated } } };
      },
      RoleCreateRequested: (): UpdateReturn<Model, Message> => {
        const state = model.modelsView ?? {};
        const draft = roleDraftFromState(state.roleDraft);
        if (draft.roleId.trim().length === 0 || draft.name.trim().length === 0) {
          return {
            model: {
              ...model,
              modelsView: {
                ...state,
                roleAction: roleAction("create", "error", "Role id and name are required."),
              },
            },
          };
        }
        let payload: Record<string, unknown>;
        try {
          payload = draftToRolePayload(draft);
        } catch {
          return {
            model: {
              ...model,
              modelsView: {
                ...state,
                roleAction: roleAction("create", "error", "Routing overrides must be valid JSON."),
              },
            },
          };
        }
        const token = model.readbacks.rolePolicy.token + 1;
        return {
          commands: [modelsCommands.createRole({ draftJson: JSON.stringify(payload), token })],
          model: {
            ...model,
            modelsView: { ...state, roleAction: roleAction("create", "saving", undefined, token) },
          },
        };
      },
      RoleEditSaveRequested: (): UpdateReturn<Model, Message> => {
        const state = model.modelsView ?? {};
        const policy = rolePolicyFromReadback(model.readbacks.rolePolicy);
        const selected =
          policy?.roleDefinitions.find((role) => role.role_id === state.selectedRoleId) ??
          policy?.roleDefinitions[0];
        if (selected === undefined) {
          return {
            model: {
              ...model,
              modelsView: {
                ...state,
                roleAction: roleAction("edit", "error", "Select a role before saving."),
              },
            },
          };
        }
        const draft =
          state.roleEditDraft === undefined
            ? draftFromRole(selected)
            : roleDraftFromState(state.roleEditDraft);
        let payload: Record<string, unknown>;
        try {
          payload = draftToRolePayload(draft);
        } catch {
          return {
            model: {
              ...model,
              modelsView: {
                ...state,
                roleAction: roleAction("edit", "error", "Routing overrides must be valid JSON."),
              },
            },
          };
        }
        const token = model.readbacks.rolePolicy.token + 1;
        return {
          commands: [
            modelsCommands.updateRole({
              draftJson: JSON.stringify(payload),
              roleId: selected.role_id,
              token,
            }),
          ],
          model: {
            ...model,
            modelsView: { ...state, roleAction: roleAction("edit", "saving", undefined, token) },
          },
        };
      },
      RoleTaskAllowlistsSaveRequested: (): UpdateReturn<Model, Message> => {
        const state = model.modelsView ?? {};
        const policy = rolePolicyFromReadback(model.readbacks.rolePolicy);
        if (policy === null) {
          return {
            model: {
              ...model,
              modelsView: {
                ...state,
                roleAction: roleAction("tasks", "error", "Role policy is not loaded."),
              },
            },
          };
        }
        const selections =
          state.roleTaskSelections ??
          policy.taskDefinitions.map((task) => ({
            roleIds: [...task.allowed_roles],
            taskType: task.task_type,
          }));
        const tasks = policy.taskDefinitions.map((task) => ({
          ...task,
          allowed_roles:
            selections.find((entry) => entry.taskType === task.task_type)?.roleIds ??
            task.allowed_roles,
        }));
        const token = model.readbacks.rolePolicy.token + 1;
        return {
          commands: [modelsCommands.updateTasks({ tasksJson: JSON.stringify(tasks), token })],
          model: {
            ...model,
            modelsView: { ...state, roleAction: roleAction("tasks", "saving", undefined, token) },
          },
        };
      },
      RolePolicyWriteSucceeded: ({
        kind,
        message,
        token,
      }: Extract<Message, { readonly _tag: "RolePolicyWriteSucceeded" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        if (token !== state.roleAction?.token) return { model };
        const nextToken = token + 1;
        return {
          commands: [readReadback({ key: "rolePolicy", token: nextToken })],
          model: {
            ...model,
            readbacks: { ...model.readbacks, rolePolicy: loadingReadback(nextToken) },
            modelsView: {
              ...state,
              roleAction: roleAction(kind, "saved", message),
              ...(kind === "create" ? { roleDraft: undefined } : {}),
              ...(kind === "edit" ? { roleEditDraft: undefined } : {}),
            },
          },
        };
      },
      RolePolicyWriteFailed: ({
        kind,
        message,
        token,
      }: Extract<Message, { readonly _tag: "RolePolicyWriteFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        if (token !== state.roleAction?.token) return { model };
        return {
          model: {
            ...model,
            modelsView: { ...state, roleAction: roleAction(kind, "error", message, token) },
          },
        };
      },
      BenchmarkModeChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "BenchmarkModeChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        return { model: { ...model, modelsView: { ...state, benchmarkMode: value } } };
      },
      BenchmarkJudgeChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "BenchmarkJudgeChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        return {
          commands: [
            modelsCommands.savePreferences({
              judgeEndpointId: value,
              token: model.readbacks.benchmarkPreferences.token + 1,
            }),
          ],
          model: {
            ...model,
            modelsView: { ...state, benchmarkAction: { status: "saving" }, benchmarkJudge: value },
          },
        };
      },
      BenchmarkPreferencesSaved: ({
        judgeEndpointId,
        token,
      }: Extract<Message, { readonly _tag: "BenchmarkPreferencesSaved" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        if (token !== model.readbacks.benchmarkPreferences.token + 1) return { model };
        return {
          model: {
            ...model,
            modelsView: {
              ...state,
              benchmarkAction: { message: "Judge preference saved.", status: "saved" },
              benchmarkJudge: judgeEndpointId,
            },
          },
        };
      },
      BenchmarkPreferencesSaveFailed: ({
        message,
      }: Extract<Message, { readonly _tag: "BenchmarkPreferencesSaveFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        return {
          model: {
            ...model,
            modelsView: { ...state, benchmarkAction: { message, status: "error" } },
          },
        };
      },
      BenchmarkPreferencesSaveRequested: ({
        judgeEndpointId,
      }: Extract<Message, { readonly _tag: "BenchmarkPreferencesSaveRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        return {
          commands: [
            modelsCommands.savePreferences({
              judgeEndpointId,
              token: model.readbacks.benchmarkPreferences.token + 1,
            }),
          ],
          model: {
            ...model,
            modelsView: {
              ...state,
              benchmarkAction: { status: "saving" },
              benchmarkJudge: judgeEndpointId,
            },
          },
        };
      },
      BenchmarkRunPollRequested: ({
        runId,
        token,
      }: Extract<Message, { readonly _tag: "BenchmarkRunPollRequested" }>): UpdateReturn<
        Model,
        Message
      > => ({
        commands: [modelsCommands.pollBenchmarkRun({ runId, token })],
        model,
      }),
      BenchmarkEndpointSelected: ({
        endpointId,
        selected,
      }: Extract<Message, { readonly _tag: "BenchmarkEndpointSelected" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        const current = new Set(state.benchmarkSelectedEndpointIds ?? benchmarkEndpointIds(model));
        if (selected) current.add(endpointId);
        else current.delete(endpointId);
        return {
          model: {
            ...model,
            modelsView: { ...state, benchmarkSelectedEndpointIds: [...current].sort() },
          },
        };
      },
      BenchmarkEndpointClearRequested: ({
        endpointId,
      }: Extract<Message, { readonly _tag: "BenchmarkEndpointClearRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        return {
          model: { ...model, modelsView: { ...state, benchmarkClearEndpointId: endpointId } },
        };
      },
      BenchmarkEndpointClearCancelled: (): UpdateReturn<Model, Message> => {
        const state = model.modelsView ?? {};
        return {
          model: { ...model, modelsView: { ...state, benchmarkClearEndpointId: undefined } },
        };
      },
      BenchmarkEndpointClearConfirmed: ({
        endpointId,
      }: Extract<Message, { readonly _tag: "BenchmarkEndpointClearConfirmed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        return {
          commands: [
            modelsCommands.clearEndpointData({
              endpointId,
              token: model.readbacks.benchmarkSummary.token + 1,
            }),
          ],
          model: {
            ...model,
            modelsView: {
              ...state,
              benchmarkAction: { status: "saving" },
              benchmarkClearEndpointId: undefined,
            },
          },
        };
      },
      BenchmarkEndpointCleared: ({
        endpointId,
        token,
      }: Extract<Message, { readonly _tag: "BenchmarkEndpointCleared" }>): UpdateReturn<
        Model,
        Message
      > => {
        if (token !== model.readbacks.benchmarkSummary.token + 1) return { model };
        const state = model.modelsView ?? {};
        return {
          commands: [readReadback({ key: "benchmarkSummary", token: token + 1 })],
          model: {
            ...model,
            readbacks: { ...model.readbacks, benchmarkSummary: loadingReadback(token + 1) },
            modelsView: {
              ...state,
              benchmarkAction: {
                message: `Cleared benchmark data for ${endpointId}.`,
                status: "saved",
              },
            },
          },
        };
      },
      BenchmarkEndpointClearFailed: ({
        message,
      }: Extract<Message, { readonly _tag: "BenchmarkEndpointClearFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        return {
          model: {
            ...model,
            modelsView: { ...state, benchmarkAction: { message, status: "error" } },
          },
        };
      },
      BenchmarkTaxonomyFilterChanged: ({
        filter,
        value,
      }: Extract<Message, { readonly _tag: "BenchmarkTaxonomyFilterChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        // The reference dimension filters are mutually exclusive: choosing one clears the other two.
        const current = state.benchmarkTaxonomyFilters ?? {};
        const next =
          value.length === 0
            ? { ...current, [filter]: value }
            : {
                role: filter === "role" ? value : "",
                task: filter === "task" ? value : "",
                capability: filter === "capability" ? value : "",
              };
        return { model: { ...model, modelsView: { ...state, benchmarkTaxonomyFilters: next } } };
      },
      BenchmarkRunRequested: (): UpdateReturn<Model, Message> => {
        const state = model.modelsView ?? {};
        const selected = state.benchmarkSelectedEndpointIds ?? benchmarkEndpointIds(model);
        const judge = state.benchmarkJudge ?? "";
        if (selected.length < 2 || judge.length === 0) {
          return {
            model: {
              ...model,
              modelsView: {
                ...state,
                benchmarkAction: {
                  message: "Select at least two subjects and a judge.",
                  status: "error",
                },
              },
            },
          };
        }
        const rawMode = (state.benchmarkMode ?? "quick").toLowerCase().includes("full")
          ? "full"
          : "quick";
        return {
          commands: [
            modelsCommands.runBenchmark({
              endpointIdsJson: JSON.stringify(selected),
              judgeEndpointId: judge,
              mode: rawMode,
              token: model.readbacks.benchmarkSummary.token + 1,
            }),
          ],
          model: {
            ...model,
            modelsView: {
              ...state,
              benchmarkAction: { status: "saving" },
              benchmarkRunRequestedEndpointIds: [...selected],
            },
          },
        };
      },
      BenchmarkRunStarted: ({
        runId,
        token,
      }: Extract<Message, { readonly _tag: "BenchmarkRunStarted" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        if (token !== model.readbacks.benchmarkSummary.token + 1) return { model };
        return {
          commands: [modelsCommands.pollBenchmarkRun({ runId, token: token + 1 })],
          model: {
            ...model,
            modelsView: {
              ...state,
              benchmarkAction: { message: "Benchmark running…", status: "saving" },
              benchmarkProgress: { runId, status: "running" },
            },
          },
        };
      },
      BenchmarkRunStartFailed: ({
        message,
      }: Extract<Message, { readonly _tag: "BenchmarkRunStartFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        return {
          model: {
            ...model,
            modelsView: {
              ...state,
              benchmarkAction: { message, status: "error" },
              benchmarkProgress: undefined,
            },
          },
        };
      },
      BenchmarkRunPolled: ({
        progressJson,
        token,
      }: Extract<Message, { readonly _tag: "BenchmarkRunPolled" }>): UpdateReturn<
        Model,
        Message
      > => {
        let raw: unknown;
        try {
          raw = JSON.parse(progressJson);
        } catch {
          raw = {};
        }
        const progress = benchmarkProgressFrom(raw);
        const state = model.modelsView ?? {};
        if (progress === undefined) return { model };
        const runId = progress.runId;
        const status = progress.status;
        // A snapshot from another run (or from before the client started this run) must never replace the panel:
        // keep the run this client started and re-poll that id instead of following the stale record.
        const expectedRunId =
          state.benchmarkProgress?.status === "running" ? state.benchmarkProgress.runId : undefined;
        if (expectedRunId !== undefined && runId !== expectedRunId) {
          return {
            commands: [modelsCommands.pollBenchmarkRun({ runId: expectedRunId, token: token + 1 })],
            model,
          };
        }
        if (status === "running") {
          return {
            commands: [modelsCommands.pollBenchmarkRun({ runId, token: token + 1 })],
            model: {
              ...model,
              modelsView: {
                ...state,
                benchmarkAction: { message: "Benchmark running…", status: "saving" },
                benchmarkProgress: progress,
              },
            },
          };
        }
        return {
          commands: [
            readReadback({
              key: "benchmarkSummary",
              token: model.readbacks.benchmarkSummary.token + 1,
            }),
            readReadback({ key: "benchmarkRuns", token: model.readbacks.benchmarkRuns.token + 1 }),
            readReadback({
              key: "benchmarkActiveRun",
              token: model.readbacks.benchmarkActiveRun.token + 1,
            }),
          ],
          model: {
            ...model,
            readbacks: {
              ...model.readbacks,
              benchmarkSummary: loadingReadback(model.readbacks.benchmarkSummary.token + 1),
              benchmarkRuns: loadingReadback(model.readbacks.benchmarkRuns.token + 1),
              benchmarkActiveRun: loadingReadback(model.readbacks.benchmarkActiveRun.token + 1),
            },
            modelsView: {
              ...state,
              benchmarkAction:
                status === "completed"
                  ? { message: "Benchmark completed.", status: "saved" }
                  : { message: progress.errorMessage ?? "Benchmark failed.", status: "error" },
              benchmarkProgress: progress,
            },
          },
        };
      },
      BenchmarkRunPollFailed: ({
        message,
      }: Extract<Message, { readonly _tag: "BenchmarkRunPollFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        const progress = state.benchmarkProgress;
        // S668: a failed poll must stop the "running" panel (a runtime restart mid-run used to leave
        // it spinning at the last step forever) and carry the real reason.
        const nextProgress =
          progress !== undefined && progress.status === "running"
            ? { ...progress, message, status: "failed" as const }
            : progress;
        return {
          model: {
            ...model,
            modelsView: {
              ...state,
              benchmarkAction: { message, status: "error" },
              ...(nextProgress === undefined ? {} : { benchmarkProgress: nextProgress }),
            },
          },
        };
      },
      BenchmarkRunDetailRequested: ({
        runId,
      }: Extract<Message, { readonly _tag: "BenchmarkRunDetailRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        const token = (state.benchmarkRunDetail?.token ?? 0) + 1;
        return {
          commands: [modelsCommands.benchmarkRunDetail({ runId, token })],
          model: {
            ...model,
            modelsView: { ...state, benchmarkRunDetail: { runId, status: "loading", token } },
          },
        };
      },
      BenchmarkRunDetailLoaded: ({
        json,
        runId,
        token,
      }: Extract<Message, { readonly _tag: "BenchmarkRunDetailLoaded" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        if (state.benchmarkRunDetail?.token !== token || state.benchmarkRunDetail?.runId !== runId)
          return { model };
        return {
          model: {
            ...model,
            modelsView: { ...state, benchmarkRunDetail: { json, runId, status: "loaded", token } },
          },
        };
      },
      BenchmarkRunDetailFailed: ({
        message,
        runId,
        token,
      }: Extract<Message, { readonly _tag: "BenchmarkRunDetailFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        if (state.benchmarkRunDetail?.token !== token || state.benchmarkRunDetail?.runId !== runId)
          return { model };
        return {
          model: {
            ...model,
            modelsView: {
              ...state,
              benchmarkRunDetail: { message, runId, status: "error", token },
            },
          },
        };
      },
      BenchmarkClearRequested: (): UpdateReturn<Model, Message> => {
        const state = model.modelsView ?? {};
        // :3456 guards the destructive clear behind window.confirm; the Foldkit equivalent is an explicit
        // armed state: the first click only opens the confirmation, never dispatching DELETE by itself.
        return { model: { ...model, modelsView: { ...state, benchmarkClearPending: true } } };
      },
      BenchmarkClearConfirmed: (): UpdateReturn<Model, Message> => {
        const state = model.modelsView ?? {};
        return {
          commands: [
            modelsCommands.clearBenchmark({ token: model.readbacks.modelEndpoints.token + 1 }),
          ],
          model: { ...model, modelsView: { ...state, benchmarkClearPending: false } },
        };
      },
      BenchmarkClearCancelled: (): UpdateReturn<Model, Message> => {
        const state = model.modelsView ?? {};
        return { model: { ...model, modelsView: { ...state, benchmarkClearPending: false } } };
      },
      ModelsRemoveRequested: ({
        modelId,
      }: Extract<Message, { readonly _tag: "ModelsRemoveRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        if (state.removeConfirmation !== modelId) {
          return {
            model: {
              ...model,
              modelsView: { ...state, removeConfirmation: modelId, selectedModelId: modelId },
            },
          };
        }
        const endpoints = model.readbacks.modelEndpoints.rows.flatMap((row) => {
          try {
            // SAFETY: modelEndpoints rows carry this JSON record in meta.
            const meta = JSON.parse(row.meta) as {
              readonly endpointId?: string;
              readonly modelId?: string;
              readonly providerAccountId?: string;
              readonly providerId?: string;
              readonly sourceType?: string;
            };
            return meta.modelId === modelId ? [meta] : [];
          } catch {
            return [];
          }
        });
        const first = endpoints[0];
        const providerText = `${first?.providerId ?? ""} ${modelId}`;
        const kind: "account-model" | "endpoint" | "llama-swap" | "peer" = endpoints.some(
          (entry) => entry.sourceType === "local",
        )
          ? providerText.toLowerCase().includes("llama")
            ? "llama-swap"
            : "peer"
          : first?.endpointId === undefined
            ? "account-model"
            : "endpoint";
        const token = model.readbacks.modelEndpoints.token + 1;
        return {
          commands: [
            modelsCommands.removeModel({
              accountId: first?.providerAccountId ?? "",
              endpointId: first?.endpointId ?? "",
              kind,
              modelId,
              token,
            }),
          ],
          model: { ...model, modelsView: { ...state, removeConfirmation: undefined } },
        };
      },
      ModelsControllerSetRequested: ({
        modelId,
      }: Extract<Message, { readonly _tag: "ModelsControllerSetRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const endpoint = model.readbacks.modelEndpoints.rows.flatMap((row) => {
          try {
            // SAFETY: modelEndpoints rows carry this JSON record in meta.
            const meta = JSON.parse(row.meta) as {
              readonly endpointId?: string;
              readonly modelId?: string;
            };
            return meta.modelId === modelId && meta.endpointId !== undefined
              ? [meta.endpointId]
              : [];
          } catch {
            return [];
          }
        })[0];
        return endpoint === undefined
          ? { model }
          : {
              commands: [
                modelsCommands.setController({
                  endpointId: endpoint,
                  token: model.readbacks.modelEndpoints.token + 1,
                }),
              ],
              model,
            };
      },
      ModelsControllerEjectRequested: (): UpdateReturn<Model, Message> => ({
        commands: [
          modelsCommands.setController({
            endpointId: null,
            token: model.readbacks.modelEndpoints.token + 1,
          }),
        ],
        model,
      }),
      ModelsActionSucceeded: ({
        message,
      }: Extract<Message, { readonly _tag: "ModelsActionSucceeded" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        const rail = refreshRailReadbacks(model);
        return {
          commands: [...rail.commands],
          model: {
            ...model,
            modelsView: { ...state, actionMessage: message },
            readbacks: rail.readbacks,
          },
        };
      },
      ModelsActionFailed: ({
        message,
      }: Extract<Message, { readonly _tag: "ModelsActionFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.modelsView ?? {};
        return { model: { ...model, modelsView: { ...state, actionMessage: message } } };
      },
      RequestsRangeChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "RequestsRangeChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.requestsFilters ?? {
          breakdown: "Total",
          difficulty: "All buckets",
          expanded: false,
          range: "Day",
          source: "All sources",
          statusFamily: "All statuses",
        };
        const next = { ...state, range: value };
        const token = model.readbacks.requests.token + 1;
        const metricsToken = model.readbacks.overviewMetrics.token + 1;
        const nextModel: Model = {
          ...model,
          readbacks: {
            ...model.readbacks,
            requests: loadingReadback(token),
            overviewMetrics: loadingReadback(metricsToken),
          },
          requestsFilters: next,
        };
        return {
          commands: [
            readReadback({ key: "requests", query: requestsQuery(next), token }),
            readReadback({
              key: "overviewMetrics",
              query: overviewQuery(DEFAULT_OVERVIEW_FILTERS, windowForRange(value)),
              token: metricsToken,
            }),
            loadRequestsChartsCommand(nextModel, windowForRange(value)),
          ],
          model: { ...nextModel, requestsCharts: requestsChartsLoading(model) },
        };
      },
      RequestsFilterChanged: ({
        field,
        value,
      }: Extract<Message, { readonly _tag: "RequestsFilterChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.requestsFilters ?? {
          breakdown: "Total",
          difficulty: "All buckets",
          expanded: false,
          range: "Day",
          source: "All sources",
          statusFamily: "All statuses",
        };
        const next = { ...state, [field]: value };
        const token = model.readbacks.requests.token + 1;
        const nextModel: Model = {
          ...model,
          readbacks: { ...model.readbacks, requests: loadingReadback(token) },
          requestsFilters: next,
        };
        return {
          commands: [
            readReadback({ key: "requests", query: requestsQuery(next), token }),
            loadRequestsChartsCommand(nextModel, windowForRange(next.range)),
          ],
          model: { ...nextModel, requestsCharts: requestsChartsLoading(model) },
        };
      },
      RequestsAdvancedToggled: (): UpdateReturn<Model, Message> => {
        const state = model.requestsFilters ?? {
          breakdown: "Total",
          difficulty: "All buckets",
          expanded: false,
          range: "Day",
          source: "All sources",
          statusFamily: "All statuses",
        };
        return { model: { ...model, requestsFilters: { ...state, expanded: !state.expanded } } };
      },
      ObserveRangeChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "ObserveRangeChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.observeRoutingFilters ?? {
          breakdown: "Total",
          difficulty: "All buckets",
          expanded: false,
          range: "Day",
          source: "All sources",
        };
        const next = { ...state, range: value };
        const token = model.readbacks.observeRouting.token + 1;
        const metricsToken = model.readbacks.overviewMetrics.token + 1;
        return {
          commands: [
            readReadback({ key: "observeRouting", query: observeQuery(next), token }),
            readReadback({
              key: "overviewMetrics",
              query: overviewQuery(DEFAULT_OVERVIEW_FILTERS, windowForRange(value)),
              token: metricsToken,
            }),
            loadRoutingChartsCommand(model, windowForRange(value)),
          ],
          model: {
            ...model,
            readbacks: {
              ...model.readbacks,
              observeRouting: loadingReadback(token),
              overviewMetrics: loadingReadback(metricsToken),
            },
            observeRoutingFilters: next,
            routingCharts: routingChartsLoading(model),
          },
        };
      },
      ObserveFilterChanged: ({
        field,
        value,
      }: Extract<Message, { readonly _tag: "ObserveFilterChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.observeRoutingFilters ?? {
          breakdown: "Total",
          difficulty: "All buckets",
          expanded: false,
          range: "Day",
          source: "All sources",
        };
        const next = { ...state, [field]: value };
        const token = model.readbacks.observeRouting.token + 1;
        const nextModel: Model = {
          ...model,
          readbacks: { ...model.readbacks, observeRouting: loadingReadback(token) },
          observeRoutingFilters: next,
        };
        return {
          commands: [
            readReadback({ key: "observeRouting", query: observeQuery(next), token }),
            loadRoutingChartsCommand(nextModel, windowForRange(next.range)),
          ],
          model: { ...nextModel, routingCharts: routingChartsLoading(model) },
        };
      },
      ObserveAdvancedToggled: (): UpdateReturn<Model, Message> => {
        const state = model.observeRoutingFilters ?? {
          breakdown: "Total",
          difficulty: "All buckets",
          expanded: false,
          range: "Day",
          source: "All sources",
        };
        return {
          model: { ...model, observeRoutingFilters: { ...state, expanded: !state.expanded } },
        };
      },
      LocalPeerUrlChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "LocalPeerUrlChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const draft = model.localPeersDraft ?? { token: "", url: "" };
        return { model: { ...model, localPeersDraft: { ...draft, url: value } } };
      },
      LocalPeerTokenChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "LocalPeerTokenChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const draft = model.localPeersDraft ?? { token: "", url: "" };
        return { model: { ...model, localPeersDraft: { ...draft, token: value } } };
      },
      SystemExtensionsPauseRequested: ({
        extensionId,
      }: Extract<Message, { readonly _tag: "SystemExtensionsPauseRequested" }>): UpdateReturn<
        Model,
        Message
      > => ({
        commands: [
          systemExtensionsCommands.pause({
            id: extensionId,
            token: model.readbacks.extensions.token + 1,
          }),
        ],
        model: { ...model, systemExtensionsMessage: undefined },
      }),
      SystemExtensionsDownloadRequested: (): UpdateReturn<Model, Message> => ({
        commands: [
          systemExtensionsCommands.download({ token: model.readbacks.extensions.token + 1 }),
        ],
        model: { ...model, systemExtensionsMessage: undefined },
      }),
      SystemExtensionsRecommendationApplyRequested: ({
        recommendationId,
      }: Extract<
        Message,
        { readonly _tag: "SystemExtensionsRecommendationApplyRequested" }
      >): UpdateReturn<Model, Message> => ({
        commands: [
          systemExtensionsCommands.applyRecommendation({
            id: recommendationId,
            token: model.readbacks.recommendations.token + 1,
          }),
        ],
        model: { ...model, systemExtensionsMessage: undefined },
      }),
      SystemExtensionsRecommendationDismissRequested: ({
        recommendationId,
      }: Extract<
        Message,
        { readonly _tag: "SystemExtensionsRecommendationDismissRequested" }
      >): UpdateReturn<Model, Message> => ({
        commands: [
          systemExtensionsCommands.dismissRecommendation({
            id: recommendationId,
            token: model.readbacks.recommendations.token + 1,
          }),
        ],
        model: { ...model, systemExtensionsMessage: undefined },
      }),
      SystemReplayAutomationControlRequested: ({
        action,
      }: Extract<
        Message,
        { readonly _tag: "SystemReplayAutomationControlRequested" }
      >): UpdateReturn<Model, Message> => ({
        commands: [
          systemExtensionsCommands.replayControl({
            action,
            token: model.readbacks.replayAutomation.token + 1,
          }),
        ],
        model: { ...model, systemExtensionsMessage: undefined },
      }),
      SystemExtensionsActionSucceeded: ({
        message,
      }: Extract<Message, { readonly _tag: "SystemExtensionsActionSucceeded" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, systemExtensionsMessage: message } }),
      SystemExtensionsActionFailed: ({
        message,
      }: Extract<Message, { readonly _tag: "SystemExtensionsActionFailed" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, systemExtensionsMessage: message } }),
      SystemOperatorTraceRootChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "SystemOperatorTraceRootChanged" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, systemOperatorTraceRoot: value } }),
      SystemOperatorReplayCountChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "SystemOperatorReplayCountChanged" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, systemOperatorReplayCount: value } }),
      SystemOperatorLoadRequested: (): UpdateReturn<Model, Message> => {
        const token = model.learningOperatorToken ?? "";
        return token.length === 0
          ? { model: { ...model, systemOperatorMessage: "Operator access token is required." } }
          : {
              commands: [systemOperatorCommands.loadState({ token, tokenId: 1 })],
              model: { ...model, systemOperatorMessage: undefined },
            };
      },
      SystemOperatorReplayCancelRequested: ({
        jobId,
      }: Extract<Message, { readonly _tag: "SystemOperatorReplayCancelRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const token = model.learningOperatorToken ?? "";
        return token.length === 0
          ? { model: { ...model, systemOperatorMessage: "Operator access token is required." } }
          : {
              commands: [systemOperatorCommands.cancelReplay({ jobId, token, tokenId: 1 })],
              model: { ...model, systemOperatorMessage: undefined },
            };
      },
      SystemOperatorEvaluationCancelRequested: ({
        jobId,
      }: Extract<
        Message,
        { readonly _tag: "SystemOperatorEvaluationCancelRequested" }
      >): UpdateReturn<Model, Message> => {
        const token = model.learningOperatorToken ?? "";
        return token.length === 0
          ? { model: { ...model, systemOperatorMessage: "Operator access token is required." } }
          : {
              commands: [systemOperatorCommands.cancelEvaluation({ jobId, token, tokenId: 1 })],
              model: { ...model, systemOperatorMessage: undefined },
            };
      },
      SystemOperatorEvaluationRetryRequested: ({
        jobId,
      }: Extract<
        Message,
        { readonly _tag: "SystemOperatorEvaluationRetryRequested" }
      >): UpdateReturn<Model, Message> => {
        const token = model.learningOperatorToken ?? "";
        return token.length === 0
          ? { model: { ...model, systemOperatorMessage: "Operator access token is required." } }
          : {
              commands: [systemOperatorCommands.retryEvaluation({ jobId, token, tokenId: 1 })],
              model: { ...model, systemOperatorMessage: undefined },
            };
      },
      SystemOperatorCreateReplayRequested: (): UpdateReturn<Model, Message> => {
        const token = model.learningOperatorToken ?? "";
        const traceRootId = (model.systemOperatorTraceRoot ?? "").trim();
        const maxRequests = Math.max(1, Number(model.systemOperatorReplayCount ?? "25") || 25);
        return token.length === 0 || traceRootId.length === 0
          ? { model: { ...model, systemOperatorMessage: "Token and trace root are required." } }
          : {
              commands: [
                systemOperatorCommands.createReplay({
                  maxRequests,
                  token,
                  tokenId: 1,
                  traceRootId,
                }),
              ],
              model: { ...model, systemOperatorMessage: undefined },
            };
      },
      SystemOperatorActionSucceeded: ({
        message,
      }: Extract<Message, { readonly _tag: "SystemOperatorActionSucceeded" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, systemOperatorMessage: message } }),
      SystemOperatorActionFailed: ({
        message,
      }: Extract<Message, { readonly _tag: "SystemOperatorActionFailed" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, systemOperatorMessage: message } }),
      LocalLlamaSwapModelIdChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "LocalLlamaSwapModelIdChanged" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, localLlamaSwapModelId: value } }),
      LocalLlamaSwapModelLoadRequested: (): UpdateReturn<Model, Message> => {
        const modelId = (model.localLlamaSwapModelId ?? "").trim();
        return modelId.length === 0
          ? { model: { ...model, localLlamaSwapMessage: "Model id is required." } }
          : {
              commands: [
                localPeersCommands.loadLlamaSwapModel({
                  allRoles: false,
                  modelId,
                  token: model.readbacks.localLlamaSwapModels.token + 1,
                }),
              ],
              model: { ...model, localLlamaSwapMessage: undefined },
            };
      },
      LocalLlamaSwapAllRolesRequested: (): UpdateReturn<Model, Message> => {
        const modelId = (model.localLlamaSwapModelId ?? "").trim();
        return modelId.length === 0
          ? { model: { ...model, localLlamaSwapMessage: "Model id is required." } }
          : {
              commands: [
                localPeersCommands.loadLlamaSwapModel({
                  allRoles: true,
                  modelId,
                  token: model.readbacks.localLlamaSwapModels.token + 1,
                }),
              ],
              model: { ...model, localLlamaSwapMessage: undefined },
            };
      },
      LocalLlamaSwapActionSucceeded: ({
        message,
      }: Extract<Message, { readonly _tag: "LocalLlamaSwapActionSucceeded" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, localLlamaSwapMessage: message } }),
      LocalLlamaSwapActionFailed: ({
        message,
      }: Extract<Message, { readonly _tag: "LocalLlamaSwapActionFailed" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, localLlamaSwapMessage: message } }),
      LocalPeerModelIdChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "LocalPeerModelIdChanged" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, localPeerModelId: value } }),
      LocalPeerModelLoadRequested: (): UpdateReturn<Model, Message> => {
        const modelId = (model.localPeerModelId ?? "").trim();
        return modelId.length === 0
          ? { model: { ...model, localPeerModelMessage: "Model id is required." } }
          : {
              commands: [
                localPeersCommands.loadPeerModel({
                  modelId,
                  token: model.readbacks.localPeerModels.token + 1,
                }),
              ],
              model: { ...model, localPeerModelMessage: undefined },
            };
      },
      LocalPeerModelActionSucceeded: ({
        message,
      }: Extract<Message, { readonly _tag: "LocalPeerModelActionSucceeded" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, localPeerModelMessage: message } }),
      LocalPeerModelActionFailed: ({
        message,
      }: Extract<Message, { readonly _tag: "LocalPeerModelActionFailed" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, localPeerModelMessage: message } }),
      LocalPeerAddRequested: (): UpdateReturn<Model, Message> => {
        const draft = model.localPeersDraft ?? { token: "", url: "" };
        const existing = peerRows(model);
        if (draft.url.trim().length === 0)
          return { model: { ...model, localPeersMessage: "Endpoint URL is required." } };
        const next = [
          ...existing,
          {
            id: draft.url.trim(),
            url: draft.url.trim(),
            ...(draft.token.length === 0 ? {} : { authToken: draft.token }),
          },
        ];
        return {
          commands: [
            localPeersCommands.save({
              peersJson: JSON.stringify(next),
              token: model.readbacks.localPeers.token + 1,
            }),
          ],
          model: { ...model, localPeersMessage: undefined },
        };
      },
      LocalPeerRemoveRequested: ({
        peerId,
      }: Extract<Message, { readonly _tag: "LocalPeerRemoveRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const next = peerRows(model).filter((peer) => peer.id !== peerId);
        return {
          commands: [
            localPeersCommands.save({
              peersJson: JSON.stringify(next),
              token: model.readbacks.localPeers.token + 1,
            }),
          ],
          model,
        };
      },
      LocalPeerHealthRequested: ({
        peerId,
      }: Extract<Message, { readonly _tag: "LocalPeerHealthRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const peer = peerRows(model).find((entry) => entry.id === peerId);
        return peer === undefined
          ? { model }
          : {
              commands: [
                localPeersCommands.health({
                  token: model.readbacks.localPeers.token + 1,
                  url: peer.url,
                }),
              ],
              model,
            };
      },
      LocalPeersActionSucceeded: ({
        message,
      }: Extract<Message, { readonly _tag: "LocalPeersActionSucceeded" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, localPeersMessage: message } }),
      LocalPeersActionFailed: ({
        message,
      }: Extract<Message, { readonly _tag: "LocalPeersActionFailed" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, localPeersMessage: message } }),
      LocalLogsAutoRefreshToggled: ({
        value,
      }: Extract<Message, { readonly _tag: "LocalLogsAutoRefreshToggled" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, localLogsAutoRefresh: value } }),
      ObserveLogsSourceChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "ObserveLogsSourceChanged" }>): UpdateReturn<
        Model,
        Message
      > => ({ model: { ...model, observeLogsSource: value } }),
      ObservabilityRefreshRequested: (): UpdateReturn<Model, Message> => {
        const token = model.observability.token + 1;
        return {
          commands: [readObservability({ token })],
          model: { ...model, observability: { ...model.observability, status: "loading", token } },
        };
      },
      StoreReceiptsRefreshRequested: (): UpdateReturn<Model, Message> => {
        const token = model.readbacks.storeReceipts.token + 1;
        return {
          commands: [readReadback({ key: "storeReceipts", token })],
          model: {
            ...model,
            readbacks: { ...model.readbacks, storeReceipts: loadingReadback(token) },
          },
        };
      },
      RetentionSizeChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "RetentionSizeChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.retention ?? initialRetentionState();
        return { model: { ...model, retention: { ...state, maxSizeGb: value } } };
      },
      RetentionAgeChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "RetentionAgeChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.retention ?? initialRetentionState();
        return { model: { ...model, retention: { ...state, maxAgeDays: value } } };
      },
      RetentionPolicySaveRequested: ({
        maxAgeDays,
        maxSizeGb,
      }: Extract<Message, { readonly _tag: "RetentionPolicySaveRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.retention ?? initialRetentionState();
        if (state.status === "saving") return { model };
        const token = state.token + 1;
        return {
          commands: [
            storageRetentionCommands.savePolicy({
              payload: JSON.stringify({ maxAgeDays, maxSizeGb }),
              token,
            }),
          ],
          model: { ...model, retention: { ...state, message: undefined, status: "saving", token } },
        };
      },
      RetentionDryRunRequested: (): UpdateReturn<Model, Message> => {
        const state = model.retention ?? initialRetentionState();
        if (state.status === "saving") return { model };
        const token = state.token + 1;
        return {
          commands: [storageRetentionCommands.dryRun({ token })],
          model: { ...model, retention: { ...state, message: undefined, status: "saving", token } },
        };
      },
      RetentionExecuteRequested: (): UpdateReturn<Model, Message> => {
        const state = model.retention ?? initialRetentionState();
        if (state.status === "saving") return { model };
        if (state.manifestHash === undefined || state.manifestHash.length === 0) {
          return {
            model: {
              ...model,
              retention: {
                ...state,
                message: "Run a dry-run first: the host executes only the exact hash-bound plan.",
                status: "error",
              },
            },
          };
        }
        const token = state.token + 1;
        return {
          commands: [storageRetentionCommands.execute({ manifestHash: state.manifestHash, token })],
          model: { ...model, retention: { ...state, message: undefined, status: "saving", token } },
        };
      },
      RetentionSucceeded: ({
        manifestHash,
        token,
      }: Extract<Message, { readonly _tag: "RetentionSucceeded" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.retention ?? initialRetentionState();
        if (token !== state.token) return { model };
        const readbackToken = model.readbacks.storageRetention.token + 1;
        return {
          commands: [readReadback({ key: "storageRetention", token: readbackToken })],
          model: {
            ...model,
            readbacks: { ...model.readbacks, storageRetention: loadingReadback(readbackToken) },
            retention: {
              ...state,
              ...(manifestHash === undefined ? {} : { manifestHash }),
              message: "Storage retention action completed.",
              status: "saved",
            },
          },
        };
      },
      RetentionFailed: ({
        message,
        token,
      }: Extract<Message, { readonly _tag: "RetentionFailed" }>): UpdateReturn<Model, Message> => {
        const state = model.retention ?? initialRetentionState();
        if (token !== state.token) return { model };
        return { model: { ...model, retention: { ...state, message, status: "error" } } };
      },
      LocalLogsRefreshRequested: (): UpdateReturn<Model, Message> => {
        const token = model.readbacks.localLogs.token + 1;
        return {
          commands: [readReadback({ key: "localLogs", token })],
          model: { ...model, readbacks: { ...model.readbacks, localLogs: loadingReadback(token) } },
        };
      },
      RouterPostureFieldChanged: ({
        field,
        value,
      }: Extract<Message, { readonly _tag: "RouterPostureFieldChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.routerPosture ?? initialRouterPostureState();
        return { model: { ...model, routerPosture: { ...state, [field]: value } } };
      },
      RouterEntryFieldChanged: ({
        field,
        value,
      }: Extract<Message, { readonly _tag: "RouterEntryFieldChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.routerPosture ?? initialRouterPostureState();
        const key =
          field === "name"
            ? "entryName"
            : field === "role"
              ? "entryRole"
              : field === "model"
                ? "entryModel"
                : "entryDescription";
        return { model: { ...model, routerPosture: { ...state, [key]: value } } };
      },
      RouterBlockChanged: ({
        block,
        value,
      }: Extract<Message, { readonly _tag: "RouterBlockChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.routerPosture ?? initialRouterPostureState();
        return {
          model: {
            ...model,
            routerPosture: {
              ...state,
              [block === "agent_strategies" ? "agentJson" : "workloadsJson"]: value,
            },
          },
        };
      },
      RouterPostureSaveRequested: (): UpdateReturn<Model, Message> => {
        const state = model.routerPosture ?? initialRouterPostureState();
        if (state.status === "saving") return { model };
        const token = state.token + 1;
        const persistedRow = (id: string): string | undefined => {
          const value = model.readbacks.routerConfig.rows.find((entry) => entry.id === id)?.value;
          return value === undefined || value === "" || value === "null" || value === "undefined"
            ? undefined
            : value;
        };
        const persisted = persistedRow("strategy");
        const persistedMode = persistedRow("routing.mode");
        const persistedScoring = persistedRow("routing.scoringStrategy");
        const persistedExecution = persistedRow("executionMode");
        const mode =
          state.mode.length > 0 ? state.mode : (persistedMode ?? persisted ?? "baseline");
        const scoringStrategy =
          state.scoringStrategy.length > 0
            ? state.scoringStrategy
            : (persistedScoring ?? "balanced");
        const executionMode =
          state.executionMode.length > 0
            ? state.executionMode
            : (persistedExecution ?? "decision_only");
        const weightsMetaRow = model.readbacks.routerConfig.rows.find(
          (entry) => entry.id === "routing.weights",
        );
        let hostWeights: Record<string, number> = {};
        try {
          hostWeights =
            weightsMetaRow === undefined
              ? {}
              : (JSON.parse(weightsMetaRow.meta) as Record<string, number>);
        } catch {
          hostWeights = {};
        }
        const weightOf = (
          draft: string,
          key: "quality" | "latency" | "throughput" | "cost" | "reliability" | "preference",
          fallback: number,
        ): number =>
          draft.length > 0
            ? Number(draft)
            : typeof hostWeights[key] === "number"
              ? hostWeights[key]
              : fallback;
        const customWeights = {
          cost: weightOf(state.weightCost, "cost", 0.5),
          latency: weightOf(state.weightLatency, "latency", 0.1),
          preference: weightOf(state.weightPreference, "preference", 0.05),
          quality: weightOf(state.weightQuality, "quality", 0.15),
          reliability: weightOf(state.weightReliability, "reliability", 0.15),
          throughput: weightOf(state.weightThroughput, "throughput", 0.05),
        };
        const payload = JSON.stringify({
          executionMode,
          mode,
          pinWeights: state.pinWeights === "on",
          scoringStrategy,
          ...(scoringStrategy === "custom" ? { weights: customWeights } : {}),
        });
        return {
          commands: [routerConfigCommands.savePosture({ payload, token })],
          model: {
            ...model,
            routerPosture: { ...state, message: undefined, status: "saving", token },
          },
        };
      },
      RouterBlockSaveRequested: ({
        block,
      }: Extract<Message, { readonly _tag: "RouterBlockSaveRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.routerPosture ?? initialRouterPostureState();
        if (state.status === "saving") return { model };
        const token = state.token + 1;
        const json = block === "agent_strategies" ? state.agentJson : state.workloadsJson;
        return {
          commands: [
            routerConfigCommands.saveBlock({ payload: JSON.stringify({ block, json }), token }),
          ],
          model: {
            ...model,
            routerPosture: { ...state, message: undefined, status: "saving", token },
          },
        };
      },
      RouterPostureSaved: ({
        token,
      }: Extract<Message, { readonly _tag: "RouterPostureSaved" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.routerPosture ?? initialRouterPostureState();
        if (token !== state.token) return { model };
        const configToken = model.readbacks.routerConfig.token + 1;
        const runtimeConfigToken = model.readbacks.runtimeConfig.token + 1;
        const routerToken = model.readbacks.router.token + 1;
        return {
          commands: [
            readReadback({ key: "routerConfig", token: configToken }),
            readReadback({ key: "runtimeConfig", token: runtimeConfigToken }),
            readReadback({ key: "router", token: routerToken }),
          ],
          model: {
            ...model,
            readbacks: {
              ...model.readbacks,
              routerConfig: loadingReadback(configToken),
              runtimeConfig: loadingReadback(runtimeConfigToken),
              router: loadingReadback(routerToken),
            },
            routerPosture: { ...state, message: "Routing posture saved.", status: "saved" },
          },
        };
      },
      RouterPostureFailed: ({
        message,
        token,
      }: Extract<Message, { readonly _tag: "RouterPostureFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.routerPosture ?? initialRouterPostureState();
        if (token !== state.token) return { model };
        return { model: { ...model, routerPosture: { ...state, message, status: "error" } } };
      },
      RouterPostureResetRequested: (): UpdateReturn<Model, Message> => {
        const state = model.routerPosture ?? initialRouterPostureState();
        const configToken = model.readbacks.routerConfig.token + 1;
        const runtimeConfigToken = model.readbacks.runtimeConfig.token + 1;
        return {
          commands: [
            readReadback({ key: "routerConfig", token: configToken }),
            readReadback({ key: "runtimeConfig", token: runtimeConfigToken }),
          ],
          model: {
            ...model,
            readbacks: {
              ...model.readbacks,
              routerConfig: loadingReadback(configToken),
              runtimeConfig: loadingReadback(runtimeConfigToken),
            },
            routerPosture: { ...initialRouterPostureState(), token: state.token },
          },
        };
      },
      ToggledTheme: (): UpdateReturn<Model, Message> => {
        const theme = model.theme === "light" ? "dark" : "light";
        return {
          commands: [applyThemeCommand({ theme })],
          model: { ...model, theme },
        };
      },
    };
    const remainingHandlers = {
      ControllerEndpointSelected: ({
        endpointId,
      }: Extract<Message, { readonly _tag: "ControllerEndpointSelected" }>): UpdateReturn<
        Model,
        Message
      > => {
        const current = model.controls.controlController;
        return {
          model: {
            ...model,
            controls: {
              ...model.controls,
              controlController: { ...current, selectedEndpointId: endpointId },
            },
          },
        };
      },
      ControllerSaveRequested: ({
        endpointId,
      }: Extract<Message, { readonly _tag: "ControllerSaveRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const current = model.controls.controlController;
        if (current.actionStatus === "pending") return { model };
        const token = current.token + 1;
        return {
          commands: [dispatchControl({ endpointId, key: "controlController", token })],
          model: {
            ...model,
            controls: {
              ...model.controls,
              controlController: {
                ...current,
                actionMessage: undefined,
                actionStatus: "pending",
                notice: undefined,
                selectedEndpointId: endpointId,
                token,
              },
            },
          },
        };
      },
      ControlActionCompleted: ({
        key,
        message,
        serverEndpointId,
        token,
      }: Extract<Message, { readonly _tag: "ControlActionCompleted" }>): UpdateReturn<
        Model,
        Message
      > => {
        const current = model.controls[key];
        if (token !== current.token) return { model };
        return {
          commands: key === "controlController" ? [readControl({ key, token })] : [],
          model: {
            ...model,
            controls: {
              ...model.controls,
              [key]: {
                ...current,
                actionMessage: message,
                actionStatus: "ok",
                notice:
                  key === "controlController" && serverEndpointId !== undefined
                    ? `Server assigned ${serverEndpointId}`
                    : current.notice,
                selectedEndpointId:
                  key === "controlController" && serverEndpointId !== undefined
                    ? serverEndpointId
                    : current.selectedEndpointId,
              },
            },
          },
        };
      },
      ControlActionFailed: ({
        key,
        message,
        token,
      }: Extract<Message, { readonly _tag: "ControlActionFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const current = model.controls[key];
        if (token !== current.token) return { model };
        return {
          model: {
            ...model,
            controls: {
              ...model.controls,
              [key]: { ...current, actionMessage: message, actionStatus: "error" },
            },
          },
        };
      },
      ControlActionRequested: ({
        key,
        targetId,
      }: Extract<Message, { readonly _tag: "ControlActionRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const current = model.controls[key];
        if (current.actionStatus === "pending") return { model };
        const token = current.token + 1;
        return {
          commands: [dispatchControl({ endpointId: targetId, key, token })],
          model: {
            ...model,
            controls: {
              ...model.controls,
              [key]: { ...current, actionMessage: undefined, actionStatus: "pending", token },
            },
          },
        };
      },
      ControlFailed: ({
        key,
        message,
        token,
      }: Extract<Message, { readonly _tag: "ControlFailed" }>): UpdateReturn<Model, Message> => {
        if (token !== model.controls[key].token) return { model };
        return {
          model: {
            ...model,
            controls: { ...model.controls, [key]: failedControl(message, token) },
          },
        };
      },
      ControlLoaded: ({
        key,
        snapshot,
        token,
      }: Extract<Message, { readonly _tag: "ControlLoaded" }>): UpdateReturn<Model, Message> => {
        if (token !== model.controls[key].token) return { model };
        const previous = model.controls[key];
        return {
          model: {
            ...model,
            controls: {
              ...model.controls,
              [key]: {
                ...snapshot,
                notice: previous.notice,
                selectedEndpointId: previous.selectedEndpointId ?? snapshot.selectedEndpointId,
                token,
              },
            },
          },
        };
      },
      DiagnosticsFailed: ({
        id,
        message,
      }: Extract<Message, { readonly _tag: "DiagnosticsFailed" }>): UpdateReturn<Model, Message> =>
        model.route._tag === "Diagnostics" && model.route.id === id
          ? { model: { ...model, diagnostics: failedDiagnostics(id, message) } }
          : { model },
      DiagnosticsLoaded: ({
        id,
        snapshot,
      }: Extract<Message, { readonly _tag: "DiagnosticsLoaded" }>): UpdateReturn<Model, Message> =>
        model.route._tag === "Diagnostics" && model.route.id === id
          ? { model: { ...model, diagnostics: snapshot } }
          : { model },
      DiagnosticsRefreshRequested: (): UpdateReturn<Model, Message> =>
        model.route._tag === "Diagnostics"
          ? {
              commands: [readDiagnostics({ id: model.route.id })],
              model: {
                ...model,
                diagnostics: loadingDiagnostics(model.route.id),
              },
            }
          : { model },
      ObservabilityFailed: ({
        message,
        token,
      }: Extract<Message, { readonly _tag: "ObservabilityFailed" }>): UpdateReturn<
        Model,
        Message
      > =>
        model.route._tag === "Observability" && token === model.observability.token
          ? { model: { ...model, observability: failedObservability(message, token) } }
          : { model },
      ObservabilityLoaded: ({
        snapshot,
        token,
      }: Extract<Message, { readonly _tag: "ObservabilityLoaded" }>): UpdateReturn<
        Model,
        Message
      > =>
        model.route._tag === "Observability" && token === model.observability.token
          ? {
              model: {
                ...model,
                observability: { ...snapshot, token },
                refresh:
                  snapshot.status === "error"
                    ? model.refresh
                    : { ...model.refresh, message: undefined, status: "live" },
              },
            }
          : { model },
      ReadbackFailed: ({
        key,
        message,
        token,
      }: Extract<Message, { readonly _tag: "ReadbackFailed" }>): UpdateReturn<Model, Message> => {
        const routeKey = readbackKeyForRouteTag(model.route._tag);
        if ((key !== "learningPacks" && routeKey !== key) || token !== model.readbacks[key].token)
          return { model };
        const learningRanking =
          key === "learningPacks"
            ? {
                nextToken: model.learningRanking?.nextToken,
                phases: Object.fromEntries(
                  Object.entries(model.learningRanking?.phases ?? {}).filter(
                    ([, entry]) => entry.scopeId === undefined,
                  ),
                ),
              }
            : model.learningRanking;
        const previous = model.readbacks.localPolicy;
        const nextReadback =
          key === "localPolicy" && previous.rows.length > 0
            ? { ...previous, message, status: "ok" as const, token }
            : failedReadback(message, token);
        return {
          model: {
            ...model,
            learningRanking,
            readbacks: { ...model.readbacks, [key]: nextReadback },
          },
        };
      },
      ReadbackLoaded: ({
        key,
        snapshot,
        token,
      }: Extract<Message, { readonly _tag: "ReadbackLoaded" }>): UpdateReturn<Model, Message> => {
        if (token !== model.readbacks[key].token) return { model };
        if (key === "learningPacks") {
          if (snapshot.token !== model.readbacks[key].token) return { model };
          const fresh = snapshot.status === "ok" || snapshot.status === "empty";
          const nextScope = fresh ? snapshot.scopeId : undefined;
          const currentScope = model.learningRanking?.scopeId;
          const scopeChanged = fresh && nextScope !== currentScope;
          const phases = !fresh
            ? Object.fromEntries(
                Object.entries(model.learningRanking?.phases ?? {}).filter(
                  ([, entry]) => entry.scopeId === undefined,
                ),
              )
            : scopeChanged
              ? Object.fromEntries(
                  Object.entries(model.learningRanking?.phases ?? {}).filter(
                    ([, entry]) => entry.scopeId === nextScope,
                  ),
                )
              : (model.learningRanking?.phases ?? {});
          const nextRanking =
            nextScope === undefined
              ? { nextToken: model.learningRanking?.nextToken, phases }
              : { nextToken: model.learningRanking?.nextToken, phases, scopeId: nextScope };
          return {
            model: {
              ...model,
              learningRanking: nextRanking,
              readbacks: { ...model.readbacks, [key]: { ...snapshot, token } },
              refresh:
                snapshot.status === "error"
                  ? model.refresh
                  : { ...model.refresh, message: undefined, status: "live" },
            },
          };
        }
        if (key === "providerCatalog" && snapshot.status === "ok") {
          const state = model.providerAccount ?? initialProviderAccountState();
          const account = state.draft;
          if (account.providerId.length === 0) {
            const first = snapshot.rows
              .flatMap((entry) => {
                try {
                  // SAFETY: providerCatalog rows carry the provider JSON record in meta.
                  return [
                    JSON.parse(entry.meta) as {
                      readonly apiBase?: string;
                      readonly providerId?: string;
                      readonly providerKind?: string;
                      readonly envVars?: ReadonlyArray<string>;
                      readonly variants?: ReadonlyArray<{
                        readonly authMode?: string;
                        readonly baseUrl?: string;
                        readonly variantId?: string;
                      }>;
                    },
                  ];
                } catch {
                  return [];
                }
              })
              .find(
                (entry) => entry.providerId !== undefined && entry.providerKind !== "local-engine",
              );
            const variant = first?.variants?.[0];
            if (first?.providerId !== undefined) {
              return {
                model: {
                  ...model,
                  readbacks: { ...model.readbacks, [key]: { ...snapshot, token } },
                  providerAccount: {
                    ...state,
                    draft: {
                      ...account,
                      authMode: variant?.authMode ?? account.authMode,
                      baseUrlOverride: variant?.baseUrl ?? first.apiBase ?? account.baseUrlOverride,
                      credentialRef: first.envVars?.[0] ?? account.credentialRef,
                      providerAccountId: `${first.providerId}.personal.${variant?.variantId ?? ""}`,
                      providerId: first.providerId,
                      providerKind: first.providerKind ?? account.providerKind,
                      variantId: variant?.variantId ?? "",
                    },
                  },
                },
              };
            }
          }
        }
        if (key === "benchmarkPreferences") {
          const state = model.modelsView ?? {};
          let judge: string | undefined;
          try {
            const meta = snapshot.rows.find((entry) => entry.id === "preferences")?.meta;
            const parsed =
              meta === undefined
                ? undefined
                : (JSON.parse(meta) as { readonly judgeEndpointId?: unknown });
            judge =
              typeof parsed?.judgeEndpointId === "string" && parsed.judgeEndpointId.length > 0
                ? parsed.judgeEndpointId
                : undefined;
          } catch {
            judge = undefined;
          }
          return {
            model: {
              ...model,
              readbacks: { ...model.readbacks, [key]: { ...snapshot, token } },
              modelsView: judge === undefined ? state : { ...state, benchmarkJudge: judge },
            },
          };
        }
        if (key === "benchmarkActiveRun" && snapshot.status === "ok") {
          let active: unknown;
          try {
            const meta = snapshot.rows.find((entry) => entry.id === "active-run")?.meta;
            active = meta === undefined ? undefined : JSON.parse(meta);
          } catch {
            active = undefined;
          }
          const progress = benchmarkProgressFrom(active);
          if (progress !== undefined) {
            const state = model.modelsView ?? {};
            const running = progress.status === "running";
            return {
              commands: running
                ? [modelsCommands.pollBenchmarkRun({ runId: progress.runId, token: token + 1 })]
                : [],
              model: {
                ...model,
                readbacks: { ...model.readbacks, [key]: { ...snapshot, token } },
                modelsView: {
                  ...state,
                  ...(running
                    ? {
                        benchmarkAction: {
                          message: "Benchmark running…",
                          status: "saving" as const,
                        },
                      }
                    : {}),
                  benchmarkProgress: progress,
                },
              },
            };
          }
        }
        if (key === "routerConfig") {
          const rowValue = (id: string): string | undefined => {
            const value = snapshot.rows.find((entry) => entry.id === id)?.value;
            return value === undefined || value === "" || value === "null" || value === "undefined"
              ? undefined
              : value;
          };
          const strategy = rowValue("routing.mode") ?? rowValue("strategy") ?? "baseline";
          const scoring = rowValue("routing.scoringStrategy") ?? "balanced";
          const execution = rowValue("executionMode") ?? "decision_only";
          const pin = rowValue("routing.pinWeights");
          let weights: Record<string, number> = {};
          try {
            const meta = snapshot.rows.find((entry) => entry.id === "routing.weights")?.meta;
            weights = meta === undefined ? {} : (JSON.parse(meta) as Record<string, number>);
          } catch {
            weights = {};
          }
          const current = model.routerPosture ?? initialRouterPostureState();
          const hydrated = {
            ...current,
            executionMode: current.executionMode.length > 0 ? current.executionMode : execution,
            mode: current.mode.length > 0 ? current.mode : strategy,
            pinWeights: current.pinWeights === "off" && pin === "true" ? "on" : current.pinWeights,
            scoringStrategy: current.scoringStrategy.length > 0 ? current.scoringStrategy : scoring,
            weightCost:
              current.weightCost.length > 0
                ? current.weightCost
                : typeof weights.cost === "number"
                  ? String(weights.cost)
                  : current.weightCost,
            weightLatency:
              current.weightLatency.length > 0
                ? current.weightLatency
                : typeof weights.latency === "number"
                  ? String(weights.latency)
                  : current.weightLatency,
            weightPreference:
              current.weightPreference.length > 0
                ? current.weightPreference
                : typeof weights.preference === "number"
                  ? String(weights.preference)
                  : current.weightPreference,
            weightQuality:
              current.weightQuality.length > 0
                ? current.weightQuality
                : typeof weights.quality === "number"
                  ? String(weights.quality)
                  : current.weightQuality,
            weightReliability:
              current.weightReliability.length > 0
                ? current.weightReliability
                : typeof weights.reliability === "number"
                  ? String(weights.reliability)
                  : current.weightReliability,
            weightThroughput:
              current.weightThroughput.length > 0
                ? current.weightThroughput
                : typeof weights.throughput === "number"
                  ? String(weights.throughput)
                  : current.weightThroughput,
          };
          return {
            model: {
              ...model,
              readbacks: { ...model.readbacks, [key]: { ...snapshot, token } },
              routerPosture: hydrated,
            },
          };
        }
        if (key === "runtimeConfig") {
          let text = "{}";
          let originalText = "{}";
          try {
            const meta = snapshot.rows[0]?.meta;
            const parsed =
              meta === undefined ? undefined : (JSON.parse(meta) as { config?: unknown });
            if (parsed?.config !== undefined) {
              text = JSON.stringify(parsed.config, null, 2);
              originalText = text;
            }
          } catch {}
          let hydrated: NonNullable<Model["learningReplayAutoQueue"]> | undefined;
          if (snapshot.status === "ok") {
            const persisted = snapshot.rows.find((entry) => entry.id === "replay.autoQueue");
            try {
              const meta: unknown =
                persisted === undefined ? undefined : JSON.parse(persisted.meta);
              // SAFETY: the replay.autoQueue row is written by parseRuntimeConfig with this exact meta shape.
              const record = meta as
                | { readonly enabled?: unknown; readonly dailyCap?: unknown }
                | undefined;
              if (
                record !== undefined &&
                record !== null &&
                Object(record) === record &&
                "enabled" in record &&
                "dailyCap" in record
              ) {
                const enabled = record.enabled === true;
                const numericCap = Number(record.dailyCap);
                const dailyCap =
                  Number.isInteger(numericCap) && numericCap >= 1 && numericCap <= 1_000_000
                    ? String(numericCap)
                    : "100";
                const current = model.learningReplayAutoQueue;
                const status =
                  current?.status === "saving"
                    ? "saving"
                    : current?.status === "saved"
                      ? "saved"
                      : current?.status === "error"
                        ? "error"
                        : "idle";
                hydrated = {
                  dailyCap,
                  enabled: enabled ? "on" : "off",
                  message: current?.message,
                  status,
                  token: current?.token,
                } satisfies {
                  dailyCap: string;
                  enabled: "off" | "on";
                  message?: string;
                  status: "error" | "idle" | "saved" | "saving";
                  token?: number;
                };
              }
            } catch {
              // A malformed replay row leaves the current auto-queue state untouched; it never fabricates values.
            }
          }
          const nextModel = {
            ...model,
            readbacks: { ...model.readbacks, runtimeConfig: { ...snapshot, token } },
            runtimeConfigEditor: {
              diff: [],
              originalText,
              status: "editing" as const,
              text,
              token,
            },
          };
          if (hydrated !== undefined) nextModel.learningReplayAutoQueue = hydrated;
          return { model: nextModel };
        }
        return {
          model: {
            ...model,
            readbacks: { ...model.readbacks, [key]: { ...snapshot, token } },
            refresh:
              snapshot.status === "error"
                ? model.refresh
                : { ...model.refresh, message: undefined, status: "live" },
          },
        };
      },
      RuntimeConfigLoadRequested: (): UpdateReturn<Model, Message> => {
        const token = model.readbacks.runtimeConfig.token + 1;
        const previous = model.runtimeConfigEditor;
        return {
          commands: [readReadback({ key: "runtimeConfig", token })],
          model: {
            ...model,
            ...(previous === undefined
              ? {}
              : { runtimeConfigEditor: { ...previous, status: "loading" } }),
            readbacks: { ...model.readbacks, runtimeConfig: loadingReadback(token) },
          },
        };
      },
      RuntimeConfigTextChanged: ({
        text,
      }: Extract<Message, { readonly _tag: "RuntimeConfigTextChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const snapshot = runtimeConfigSnapshot(model);
        const current = model.runtimeConfigEditor ?? {
          diff: [],
          originalText: snapshot.text,
          status: "editing" as const,
          text: snapshot.text,
          token: 0,
        };
        return {
          model: {
            ...model,
            runtimeConfigEditor: {
              ...current,
              diff: [],
              message: undefined,
              notice: undefined,
              status: "editing",
              text,
            },
          },
        };
      },
      RuntimeConfigSaveRequested: (): UpdateReturn<Model, Message> => {
        const snapshot = runtimeConfigSnapshot(model);
        const current = model.runtimeConfigEditor ?? {
          diff: [],
          originalText: snapshot.text,
          status: "editing" as const,
          text: snapshot.text,
          token: 0,
        };
        const parsed = parseRuntimeConfigText(current.text);
        if ("error" in parsed)
          return {
            model: {
              ...model,
              runtimeConfigEditor: { ...current, message: parsed.error, status: "invalid" },
            },
          };
        const diff = runtimeConfigDiff(snapshot.config, parsed.config);
        if (diff.length === 0)
          return {
            model: {
              ...model,
              runtimeConfigEditor: {
                ...current,
                diff,
                message: "No top-level changes.",
                status: "editing",
              },
            },
          };
        return {
          model: {
            ...model,
            runtimeConfigEditor: {
              ...current,
              diff,
              message: undefined,
              notice: undefined,
              status: "confirming",
            },
          },
        };
      },
      RuntimeConfigConfirmRequested: ({
        token,
      }: Extract<Message, { readonly _tag: "RuntimeConfigConfirmRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const current = model.runtimeConfigEditor;
        if (
          current === undefined ||
          current.status !== "confirming" ||
          saveRuntimeConfig === undefined
        )
          return { model };
        return {
          commands: [
            saveRuntimeConfig({
              configText: current.text,
              originalText: current.originalText,
              token,
            }),
          ],
          model: {
            ...model,
            runtimeConfigEditor: { ...current, message: undefined, status: "pending", token },
          },
        };
      },
      RuntimeConfigSaved: ({
        recordJson,
        token,
      }: Extract<Message, { readonly _tag: "RuntimeConfigSaved" }>): UpdateReturn<
        Model,
        Message
      > => {
        const current = model.runtimeConfigEditor;
        if (current === undefined || token !== current.token) return { model };
        let parsedRecord: unknown;
        try {
          parsedRecord = JSON.parse(recordJson);
        } catch {
          parsedRecord = undefined;
        }
        const record = parseRuntimeConfigRecord(parsedRecord);
        if (record === undefined)
          return {
            model: {
              ...model,
              runtimeConfigEditor: {
                ...current,
                message: "Runtime config read failed: invalid response",
                status: "error",
              },
            },
          };
        const text = runtimeConfigText(record);
        return {
          model: {
            ...model,
            runtimeConfigEditor: {
              ...current,
              diff: [],
              notice: "Applied snapshot from server",
              originalText: text,
              status: "saved",
              text,
            },
          },
        };
      },
      RuntimeConfigSaveFailed: ({
        message,
        token,
      }: Extract<Message, { readonly _tag: "RuntimeConfigSaveFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const current = model.runtimeConfigEditor;
        if (current === undefined || token !== current.token) return { model };
        return {
          model: { ...model, runtimeConfigEditor: { ...current, message, status: "error" } },
        };
      },
      StudioTabSelected: ({
        tab,
      }: Extract<Message, { readonly _tag: "StudioTabSelected" }>): UpdateReturn<
        Model,
        Message
      > => {
        const current = model.studio ?? studioIdle();
        return { model: { ...model, studio: studioIdle(tab) } };
      },
      StudioTabKey: ({
        key,
      }: Extract<Message, { readonly _tag: "StudioTabKey" }>): UpdateReturn<Model, Message> => {
        const current = model.studio ?? studioIdle();
        const tabs = ["chat", "images", "audio", "rerank", "advanced"] as const;
        const index = tabs.indexOf(current.tab);
        const next =
          key === "Home"
            ? 0
            : key === "End"
              ? tabs.length - 1
              : key === "ArrowRight"
                ? (index + 1) % tabs.length
                : key === "ArrowLeft"
                  ? (index - 1 + tabs.length) % tabs.length
                  : index;
        return { model: { ...model, studio: studioIdle(tabs[next] ?? current.tab) } };
      },
      StudioFieldChanged: ({
        field,
        value,
      }: Extract<Message, { readonly _tag: "StudioFieldChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const current = model.studio ?? studioIdle();
        return { model: { ...model, studio: { ...current, [field]: value } } };
      },
      StudioRunRequested: ({
        token,
      }: Extract<Message, { readonly _tag: "StudioRunRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const current = model.studio ?? studioIdle();
        if (current.status === "loading") return { model };
        // S207: send a model this host serves. The Studio default is a fixed id; when the catalogue does
        // not contain it the request fails with no_eligible_target.
        const catalogueState = model.readbacks.configuredModels;
        const catalogue =
          catalogueState.status === "ok"
            ? catalogueState.rows.map((entry) => entry.id).filter((id) => id.length > 0)
            : [];
        const firstAvailable = catalogue[0];
        const modelForRequest =
          firstAvailable !== undefined && !catalogue.includes(current.model)
            ? firstAvailable
            : current.model;
        const next = {
          ...studioLoading(token),
          ...current,
          model: modelForRequest,
          message: undefined,
          responseText: "Waiting for the runtime…",
          status: "loading" as const,
          statusCode: 0,
          token,
        };
        return {
          commands: [dispatchStudio({ state: next, token })],
          model: { ...model, studio: next },
        };
      },
      StudioLoaded: ({
        responseText,
        statusCode,
        tab,
        token,
      }: Extract<Message, { readonly _tag: "StudioLoaded" }>): UpdateReturn<Model, Message> => {
        const current = model.studio;
        if (current === undefined || token !== current.token) return { model };
        return {
          model: {
            ...model,
            studio:
              statusCode >= 400
                ? {
                    ...current,
                    message: `HTTP ${String(statusCode)}`,
                    responseText,
                    status: "error",
                    statusCode,
                    tab,
                  }
                : {
                    ...current,
                    message: undefined,
                    responseText,
                    status: "success",
                    statusCode,
                    tab,
                  },
          },
        };
      },
      StudioFailed: ({
        message,
        responseText,
        statusCode,
        token,
      }: Extract<Message, { readonly _tag: "StudioFailed" }>): UpdateReturn<Model, Message> => {
        const current = model.studio;
        if (current === undefined || token !== current.token) return { model };
        return {
          model: {
            ...model,
            studio: { ...current, message, responseText, status: "error", statusCode },
          },
        };
      },
      RefreshResynced: ({
        routeId,
        snapshot,
        token,
      }: Extract<Message, { readonly _tag: "RefreshResynced" }>): UpdateReturn<Model, Message> => {
        if (token !== model.refresh.resyncToken) {
          // An older resync resolving last must not win.
          return { model };
        }
        if (model.route._tag !== "Diagnostics" || model.route.id !== routeId) {
          // Navigation invalidated this resync. Do not let an older route's payload touch the new
          // route's fresh data or stale state.
          return { model };
        }
        return {
          model: {
            ...model,
            diagnostics: snapshot,
            refresh: {
              ...model.refresh,
              message: undefined,
              status: "live",
            },
          },
        };
      },
      ProviderAccountFieldChanged: ({
        field,
        value,
      }: Extract<Message, { readonly _tag: "ProviderAccountFieldChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.providerAccount ?? initialProviderAccountState();
        return {
          model: {
            ...model,
            providerAccount: {
              ...state,
              draft: { ...state.draft, [field]: value },
              error: undefined,
            },
          },
        };
      },
      ProviderAccountModelAdded: (): UpdateReturn<Model, Message> => {
        const state = model.providerAccount ?? initialProviderAccountState();
        const modelId = state.draft.modelInput.trim();
        if (modelId.length === 0) return { model };
        return {
          model: {
            ...model,
            providerAccount: {
              ...state,
              draft: {
                ...state.draft,
                modelInput: "",
                selectedModelIds: [...new Set([...state.draft.selectedModelIds, modelId])],
              },
            },
          },
        };
      },
      ProviderAccountModelRemoved: ({
        modelId,
      }: Extract<Message, { readonly _tag: "ProviderAccountModelRemoved" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.providerAccount ?? initialProviderAccountState();
        return {
          model: {
            ...model,
            providerAccount: {
              ...state,
              draft: {
                ...state.draft,
                selectedModelIds: state.draft.selectedModelIds.filter((id) => id !== modelId),
              },
            },
          },
        };
      },
      ProviderAccountSelectionChanged: ({
        providerId,
        variantId,
      }: Extract<Message, { readonly _tag: "ProviderAccountSelectionChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.providerAccount ?? initialProviderAccountState();
        const provider = model.readbacks.providerCatalog.rows
          .flatMap((entry) => {
            try {
              // SAFETY: providerCatalog rows carry the provider JSON record in meta.
              return [
                JSON.parse(entry.meta) as {
                  readonly apiBase?: string;
                  readonly providerId?: string;
                  readonly providerKind?: string;
                  readonly envVars?: ReadonlyArray<string>;
                  readonly variants?: ReadonlyArray<{
                    readonly authMode?: string;
                    readonly baseUrl?: string;
                    readonly variantId?: string;
                  }>;
                },
              ];
            } catch {
              return [];
            }
          })
          .find((entry) => entry.providerId === providerId);
        const variant =
          provider?.variants?.find((entry) => entry.variantId === variantId) ??
          provider?.variants?.[0];
        const resolvedVariantId = variant?.variantId ?? variantId;
        const accountId = `${providerId}.personal.${resolvedVariantId}`;
        const existing = model.readbacks.providerAccounts.rows
          .flatMap((entry) => {
            try {
              // SAFETY: providerAccounts rows carry the account JSON record in meta.
              return [
                JSON.parse(entry.meta) as {
                  readonly authMode?: string;
                  readonly baseUrlOverride?: string;
                  readonly credentialRef?: { readonly ref?: string };
                  readonly healthStatus?: string;
                  readonly providerAccountId?: string;
                  readonly rotationState?: string;
                  readonly status?: string;
                },
              ];
            } catch {
              return [];
            }
          })
          .find((entry) => entry.providerAccountId === accountId);
        return {
          model: {
            ...model,
            providerAccount: {
              ...state,
              notice: undefined,
              draft: {
                ...state.draft,
                authMode: existing?.authMode ?? variant?.authMode ?? state.draft.authMode,
                baseUrlOverride:
                  existing?.baseUrlOverride ??
                  variant?.baseUrl ??
                  provider?.apiBase ??
                  state.draft.baseUrlOverride,
                credentialRef:
                  existing?.credentialRef?.ref ??
                  provider?.envVars?.[0] ??
                  state.draft.credentialRef,
                existingHealthStatus: existing?.healthStatus ?? "",
                existingRotationState: existing?.rotationState ?? "",
                existingStatus: existing?.status ?? "",
                providerAccountId: accountId,
                providerId,
                providerKind: provider?.providerKind ?? state.draft.providerKind,
                variantId: resolvedVariantId,
              },
            },
          },
        };
      },
      ProviderAccountModelChosen: ({
        modelId,
      }: Extract<Message, { readonly _tag: "ProviderAccountModelChosen" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.providerAccount ?? initialProviderAccountState();
        return {
          model: {
            ...model,
            providerAccount: {
              ...state,
              draft: { ...state.draft, modelInput: modelId, selectedModelIds: [modelId] },
            },
          },
        };
      },
      ProviderAccountDeviceAuthRequested: (): UpdateReturn<Model, Message> => {
        // S664: the connect card drives the OAuth2 device-code flow for variants that declare
        // authMode=oauth2-device-code (Moonshot/Kimi Code). Seed the device-auth draft from the
        // provider-account draft, then start the same read->start->poll sequence the device form uses.
        const state = model.providerAccount ?? initialProviderAccountState();
        const deviceState = model.deviceAuth ?? initialDeviceAuthState();
        if (
          deviceState.inflight === true ||
          deviceState.status === "starting" ||
          deviceState.status === "pending"
        ) {
          return { model };
        }
        const modelId =
          state.draft.modelInput.trim().length > 0
            ? state.draft.modelInput.trim()
            : (state.draft.selectedModelIds[0] ?? "");
        const token = deviceState.token + 1;
        return {
          commands: [deviceAuthCommands.read({ token })],
          model: {
            ...model,
            deviceAuth: {
              ...deviceState,
              draft: {
                ...deviceState.draft,
                authMode: "oauth2-device-code",
                modelInput: modelId,
                providerId: state.draft.providerId,
                providerKind: state.draft.providerKind,
                selectedModelIds: modelId.length > 0 ? [modelId] : [],
                variantId: state.draft.variantId,
              },
              error: undefined,
              session: undefined,
              status: "starting",
              token,
            },
          },
        };
      },
      ProviderAccountCreateRequested: (): UpdateReturn<Model, Message> => {
        const state = model.providerAccount ?? initialProviderAccountState();
        if (providerAccountBusy(state)) return { model };
        const token = state.token + 1;
        const roleIdsFallback = model.readbacks.roles.rows
          .map((entry) => entry.value)
          .filter((value) => value.length > 0)
          .join(",");
        const payloadState =
          roleIdsFallback.length > 0 && state.draft.roleIdsInput.trim().length === 0
            ? { ...state, draft: { ...state.draft, roleIdsInput: roleIdsFallback } }
            : state;
        return {
          commands: [
            providerAccountCommands.create({
              payload: JSON.stringify(createProviderAccountPayload(payloadState)),
              token,
            }),
          ],
          model: {
            ...model,
            providerAccount: {
              ...state,
              error: undefined,
              notice: undefined,
              pendingAction: "create",
              status: "saving",
              token,
            },
          },
        };
      },
      ProviderAccountCreateSucceeded: ({
        token,
      }: Extract<Message, { readonly _tag: "ProviderAccountCreateSucceeded" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.providerAccount ?? initialProviderAccountState();
        if (token !== state.token) return { model };
        if (state.draft.apiKey.trim().length > 0) {
          const keyToken = state.token + 1;
          return {
            commands: [
              providerAccountCommands.updateKey({
                payload: JSON.stringify(updateProviderKeyPayload(state.draft)),
                token: keyToken,
              }),
            ],
            model: {
              ...model,
              providerAccount: {
                ...state,
                error: undefined,
                pendingAction: "create",
                status: "saving",
                token: keyToken,
              },
            },
          };
        }
        const chosenModels =
          state.draft.selectedModelIds.length > 0
            ? state.draft.selectedModelIds
            : state.draft.modelInput.trim().length > 0
              ? [state.draft.modelInput.trim()]
              : [];
        if (chosenModels.length > 0) {
          const activationToken = state.token + 1;
          const activations = chosenModels.map((modelId) => ({
            providerAccountId: state.draft.providerAccountId.trim(),
            modelId,
            region: "global",
          }));
          const batch: ProviderAccountActivationBatch = {
            activationBatchId: activationBatchIdFor(activationToken, activations),
            activations,
          };
          return {
            commands: [
              providerAccountCommands.activate({
                payload: JSON.stringify(batch),
                token: activationToken,
              }),
            ],
            model: {
              ...model,
              providerAccount: {
                ...state,
                error: undefined,
                pendingAction: "create",
                status: "saving",
                token: activationToken,
              },
            },
          };
        }
        const catalogToken = model.readbacks.providerCatalog.token + 1;
        const providersToken = model.readbacks.integrationProviders.token + 1;
        const modelsToken = model.readbacks.configuredModels.token + 1;
        const accountsToken = model.readbacks.providerAccounts.token + 1;
        const controlProvidersToken = model.controls.providers.token + 1;
        return {
          commands: [
            readReadback({ key: "providerCatalog", token: catalogToken }),
            readReadback({ key: "integrationProviders", token: providersToken }),
            readReadback({ key: "configuredModels", token: modelsToken }),
            readReadback({ key: "providerAccounts", token: accountsToken }),
            readControl({ key: "providers", token: controlProvidersToken }),
          ],
          model: {
            ...model,
            providerAccount: {
              ...state,
              error: undefined,
              pendingAction: undefined,
              status: "saved",
            },
            readbacks: {
              ...model.readbacks,
              providerCatalog: loadingReadback(catalogToken),
              integrationProviders: loadingReadback(providersToken),
              configuredModels: loadingReadback(modelsToken),
              providerAccounts: loadingReadback(accountsToken),
            },
            controls: { ...model.controls, providers: loadingControl(controlProvidersToken) },
          },
        };
      },
      ProviderAccountUpdateKeyRequested: (): UpdateReturn<Model, Message> => {
        const state = model.providerAccount ?? initialProviderAccountState();
        if (providerAccountBusy(state)) return { model };
        const token = state.token + 1;
        return {
          commands: [
            providerAccountCommands.updateKey({
              payload: JSON.stringify(updateProviderKeyPayload(state.draft)),
              token,
            }),
          ],
          model: {
            ...model,
            providerAccount: {
              ...state,
              error: undefined,
              pendingAction: "update-key",
              status: "saving",
              token,
            },
          },
        };
      },
      ProviderAccountEndpointsActivated: ({
        token,
      }: Extract<Message, { readonly _tag: "ProviderAccountEndpointsActivated" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.providerAccount ?? initialProviderAccountState();
        // The activation command is the last step of a save; accept its result even if a later save changed the token.
        const catalogToken = model.readbacks.providerCatalog.token + 1;
        const providersToken = model.readbacks.integrationProviders.token + 1;
        const modelsToken = model.readbacks.configuredModels.token + 1;
        const endpointsToken = model.readbacks.modelEndpoints.token + 1;
        const accountsToken = model.readbacks.providerAccounts.token + 1;
        const controlProvidersToken = model.controls.providers.token + 1;
        return {
          commands: [
            readReadback({ key: "providerCatalog", token: catalogToken }),
            readReadback({ key: "integrationProviders", token: providersToken }),
            readReadback({ key: "configuredModels", token: modelsToken }),
            readReadback({ key: "modelEndpoints", token: endpointsToken }),
            readReadback({ key: "providerAccounts", token: accountsToken }),
            readControl({ key: "providers", token: controlProvidersToken }),
          ],
          model: {
            ...model,
            providerAccount: {
              ...state,
              error: undefined,
              notice: undefined,
              pendingAction: undefined,
              status: "saved",
            },
            readbacks: {
              ...model.readbacks,
              providerCatalog: loadingReadback(catalogToken),
              integrationProviders: loadingReadback(providersToken),
              configuredModels: loadingReadback(modelsToken),
              modelEndpoints: loadingReadback(endpointsToken),
              providerAccounts: loadingReadback(accountsToken),
            },
            controls: { ...model.controls, providers: loadingControl(controlProvidersToken) },
          },
        };
      },
      ProviderAccountKeyUpdated: ({
        token,
      }: Extract<Message, { readonly _tag: "ProviderAccountKeyUpdated" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.providerAccount ?? initialProviderAccountState();
        if (token !== state.token) return { model };
        const chosenModels =
          state.draft.selectedModelIds.length > 0
            ? state.draft.selectedModelIds
            : state.draft.modelInput.trim().length > 0
              ? [state.draft.modelInput.trim()]
              : [];
        if (state.pendingAction === "create" && chosenModels.length > 0) {
          const activationToken = state.token + 1;
          const activations = chosenModels.map((modelId) => ({
            providerAccountId: state.draft.providerAccountId.trim(),
            modelId,
            region: "global",
          }));
          const batch: ProviderAccountActivationBatch = {
            activationBatchId: activationBatchIdFor(activationToken, activations),
            activations,
          };
          return {
            commands: [
              providerAccountCommands.activate({
                payload: JSON.stringify(batch),
                token: activationToken,
              }),
            ],
            model: {
              ...model,
              providerAccount: {
                ...state,
                error: undefined,
                pendingAction: "create",
                status: "saving",
                token: activationToken,
              },
            },
          };
        }
        return {
          model: {
            ...model,
            providerAccount: {
              ...state,
              error: undefined,
              pendingAction: undefined,
              status: "saved",
            },
          },
        };
      },
      ProviderAccountModelDeleteRequested: ({
        modelId,
      }: Extract<Message, { readonly _tag: "ProviderAccountModelDeleteRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.providerAccount ?? initialProviderAccountState();
        if (providerAccountBusy(state)) return { model };
        const token = state.token + 1;
        return {
          commands: [
            providerAccountCommands.deleteModel({
              modelId,
              providerAccountId: state.draft.providerAccountId.trim(),
              token,
            }),
          ],
          model: {
            ...model,
            providerAccount: {
              ...state,
              error: undefined,
              pendingAction: "delete-model",
              status: "saving",
              token,
            },
          },
        };
      },
      ProviderAccountModelDeleted: ({
        modelId,
        token,
      }: Extract<Message, { readonly _tag: "ProviderAccountModelDeleted" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.providerAccount ?? initialProviderAccountState();
        if (token !== state.token) return { model };
        return {
          model: {
            ...model,
            providerAccount: {
              ...state,
              draft: {
                ...state.draft,
                selectedModelIds: state.draft.selectedModelIds.filter((id) => id !== modelId),
              },
              error: undefined,
              pendingAction: undefined,
              status: "saved",
            },
          },
        };
      },
      ProviderAccountFailed: ({
        message,
        token,
      }: Extract<Message, { readonly _tag: "ProviderAccountFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const failedState = model.providerAccount ?? initialProviderAccountState();
        if (
          failedState.pendingAction === "create" &&
          message.includes("not ready for endpoint activation")
        ) {
          return {
            model: {
              ...model,
              providerAccount: {
                ...failedState,
                error: undefined,
                notice: `Provider account saved, but its endpoint was not activated: ${message}. Add the provider credential, then press Save configuration again.`,
                pendingAction: undefined,
                status: "saved",
              },
            },
          };
        }
        const state = model.providerAccount ?? initialProviderAccountState();
        if (token !== state.token) return { model };
        return {
          model: {
            ...model,
            providerAccount: {
              ...state,
              error: message,
              pendingAction: undefined,
              status: "error",
            },
          },
        };
      },
      LocalPolicyTtlChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "LocalPolicyTtlChanged" }>): UpdateReturn<
        Model,
        Message
      > => updateLocalPolicyDraft(model, { ttl: Math.max(0, Math.trunc(value)) }),
      LocalPolicyMaxConcurrencyChanged: ({
        value,
      }: Extract<Message, { readonly _tag: "LocalPolicyMaxConcurrencyChanged" }>): UpdateReturn<
        Model,
        Message
      > => updateLocalPolicyDraft(model, { maxConcurrency: Math.max(1, Math.trunc(value)) }),
      LocalPolicyAutoUnloadToggled: (): UpdateReturn<Model, Message> => {
        const draft = localPolicyDraftFromReadback(model.readbacks.localPolicy);
        return draft === undefined
          ? { model }
          : updateLocalPolicyDraft(model, { autoUnload: draft.autoUnload !== true });
      },
      LocalPolicyResetRequested: (): UpdateReturn<Model, Message> => {
        const state = model.readbacks.localPolicy;
        const saved = localPolicyFromReadback(state);
        return saved === undefined || state.status !== "ok"
          ? { model }
          : {
              model: {
                ...model,
                readbacks: {
                  ...model.readbacks,
                  localPolicy: withLocalPolicyDraft({ ...state, message: undefined }, saved),
                },
              },
            };
      },
      LocalPolicySaveRequested: (): UpdateReturn<Model, Message> => {
        const state = model.readbacks.localPolicy;
        const draft = localPolicyDraftFromReadback(state);
        if (draft === undefined || state.status !== "ok") return { model };
        const token = state.token + 1;
        return {
          commands: [localPolicyCommandsArg.save({ payload: JSON.stringify(draft), token })],
          model: {
            ...model,
            readbacks: {
              ...model.readbacks,
              localPolicy: { ...state, message: undefined, status: "loading", token },
            },
          },
        };
      },
      LocalPolicySaved: ({
        policy,
        token,
      }: Extract<Message, { readonly _tag: "LocalPolicySaved" }>): UpdateReturn<Model, Message> => {
        const state = model.readbacks.localPolicy;
        if (token !== state.token || state.status !== "loading") return { model };
        // SAFETY: the command serialized the PUT response body; the parser validates the record shape.
        const merged = JSON.parse(policy) as LocalPolicyObject;
        return {
          model: {
            ...model,
            readbacks: { ...model.readbacks, localPolicy: localPolicyReadback(merged, token) },
          },
        };
      },
      LocalPolicySaveFailed: ({
        message,
        token,
      }: Extract<Message, { readonly _tag: "LocalPolicySaveFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.readbacks.localPolicy;
        if (token !== state.token) return { model };
        return {
          model: {
            ...model,
            readbacks: {
              ...model.readbacks,
              localPolicy: { ...state, message, status: state.rows.length > 0 ? "ok" : "error" },
            },
          },
        };
      },
      ChartPointShown: ({
        label,
        seriesId,
        token,
      }: Extract<Message, { readonly _tag: "ChartPointShown" }>): UpdateReturn<Model, Message> => {
        const state = chartInteractionForRoute(model.chartInteraction, model.route._tag);
        return {
          model: { ...model, chartInteraction: showChartPoint(state, token, seriesId, label) },
        };
      },
      ChartTooltipDismissed: ({
        token,
      }: Extract<Message, { readonly _tag: "ChartTooltipDismissed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = chartInteractionForRoute(model.chartInteraction, model.route._tag);
        return { model: { ...model, chartInteraction: hideChartTooltip(state, token) } };
      },
      ChartSeriesToggled: ({
        seriesId,
        token,
      }: Extract<Message, { readonly _tag: "ChartSeriesToggled" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = chartInteractionForRoute(model.chartInteraction, model.route._tag);
        return { model: { ...model, chartInteraction: toggleChartSeries(state, token, seriesId) } };
      },
    };
    const deviceAuthHandlers = {
      DeviceAuthFieldChanged: ({
        field,
        value,
      }: Extract<Message, { readonly _tag: "DeviceAuthFieldChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.deviceAuth ?? initialDeviceAuthState();
        return {
          model: {
            ...model,
            deviceAuth: { ...state, draft: { ...state.draft, [field]: value }, error: undefined },
          },
        };
      },
      DeviceAuthModelAdded: (): UpdateReturn<Model, Message> => {
        const state = model.deviceAuth ?? initialDeviceAuthState();
        const modelId = state.draft.modelInput.trim();
        if (modelId.length === 0) return { model };
        return {
          model: {
            ...model,
            deviceAuth: {
              ...state,
              draft: {
                ...state.draft,
                modelInput: "",
                selectedModelIds: [...new Set([...state.draft.selectedModelIds, modelId])],
              },
            },
          },
        };
      },
      DeviceAuthModelRemoved: ({
        modelId,
      }: Extract<Message, { readonly _tag: "DeviceAuthModelRemoved" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.deviceAuth ?? initialDeviceAuthState();
        return {
          model: {
            ...model,
            deviceAuth: {
              ...state,
              draft: {
                ...state.draft,
                selectedModelIds: state.draft.selectedModelIds.filter((id) => id !== modelId),
              },
            },
          },
        };
      },
      DeviceAuthStartRequested: (): UpdateReturn<Model, Message> => {
        const state = model.deviceAuth ?? initialDeviceAuthState();
        // S399: a click while a poll is pending or a start is in flight must not issue
        // another start/read; the token fence alone would only hide the second response.
        if (state.inflight === true || state.status === "starting" || state.status === "pending")
          return { model };
        const token = state.token + 1;
        return {
          commands: [deviceAuthCommands.read({ token })],
          model: {
            ...model,
            deviceAuth: {
              ...state,
              error: undefined,
              session: undefined,
              status: "starting",
              token,
            },
          },
        };
      },
      DeviceAuthSessionsLoaded: ({
        sessions,
        token,
      }: Extract<Message, { readonly _tag: "DeviceAuthSessionsLoaded" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.deviceAuth ?? initialDeviceAuthState();
        if (token !== state.token) return { model };
        const plan = deviceAuthStartPlan(
          state,
          sessions,
          model.readbacks.roles.rows.map((row) => row.value),
        );
        if (plan.kind === "invalid") {
          return {
            model: {
              ...model,
              deviceAuth: { ...state, error: plan.errors.join(" "), sessions, status: "error" },
            },
          };
        }
        const nextToken = state.token + 1;
        if (plan.kind === "restore") {
          const delayMs = deviceAuthPollDelayMs(plan.session);
          return {
            commands: [
              deviceAuthCommands.poll({
                authRequestId: plan.session.authRequestId,
                delayMs,
                intervalMs: delayMs,
                token: nextToken,
              }),
            ],
            model: withDeviceAuthDialog(
              {
                ...model,
                deviceAuth: {
                  ...state,
                  error: undefined,
                  inflight: true,
                  session: plan.session,
                  sessions,
                  status: "pending",
                  token: nextToken,
                },
              },
              plan.session,
            ),
          };
        }
        return {
          commands: [
            deviceAuthCommands.start({ payload: JSON.stringify(plan.payload), token: nextToken }),
          ],
          model: {
            ...model,
            deviceAuth: {
              ...state,
              error: undefined,
              sessions,
              status: "starting",
              token: nextToken,
            },
          },
        };
      },
      DeviceAuthStarted: ({
        session,
        token,
      }: Extract<Message, { readonly _tag: "DeviceAuthStarted" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.deviceAuth ?? initialDeviceAuthState();
        if (token !== state.token) return { model };
        const nextToken = state.token + 1;
        const delayMs = deviceAuthPollDelayMs(session);
        return {
          commands: [
            deviceAuthCommands.poll({
              authRequestId: session.authRequestId,
              delayMs,
              intervalMs: delayMs,
              token: nextToken,
            }),
          ],
          model: withDeviceAuthDialog(
            {
              ...model,
              deviceAuth: {
                ...state,
                error: undefined,
                inflight: true,
                session,
                status: "pending",
                token: nextToken,
              },
            },
            session,
          ),
        };
      },
      DeviceAuthPolled: ({
        session,
        token,
      }: Extract<Message, { readonly _tag: "DeviceAuthPolled" }>): UpdateReturn<Model, Message> => {
        const state = model.deviceAuth ?? initialDeviceAuthState();
        if (token !== state.token) return { model };
        // S432: the real pending poll body has no userCode/verification URL; keep the restored
        // challenge for the same authorization so the code/link survive the first poll.
        const nextSession = mergeDeviceAuthPoll(state.session, session);
        if (nextSession.status === "connected") {
          const nextToken = state.token + 1;
          const activations = activationPlanForConnectedSession({
            draft: state.draft,
            session: nextSession,
          });
          return {
            commands: activations.map((payload) =>
              deviceAuthCommands.activate({ payload: JSON.stringify(payload), token: nextToken }),
            ),
            model: {
              ...model,
              deviceAuth: {
                ...state,
                error: undefined,
                inflight: false,
                session: nextSession,
                status: "connected",
                token: nextToken,
              },
            },
          };
        }
        if (nextSession.status === "pending") {
          const nextToken = state.token + 1;
          const delayMs = deviceAuthPollDelayMs(nextSession);
          return {
            commands: [
              deviceAuthCommands.poll({
                authRequestId: nextSession.authRequestId,
                delayMs,
                intervalMs: delayMs,
                token: nextToken,
              }),
            ],
            model: withDeviceAuthDialog(
              {
                ...model,
                deviceAuth: {
                  ...state,
                  error: undefined,
                  inflight: true,
                  session: nextSession,
                  status: "pending",
                  token: nextToken,
                },
              },
              nextSession,
            ),
          };
        }
        // S425: "expired"/"failed" are terminal host statuses. Surface the host reason instead of a
        // generic message; returning no poll command stops the loop, and inflight is cleared.
        const reason =
          nextSession.lastError ??
          (nextSession.status === "expired"
            ? "Device authorization expired."
            : "Device authorization failed.");
        return {
          model: {
            ...model,
            deviceAuth: {
              ...state,
              error: reason,
              inflight: false,
              session: nextSession,
              status: "error",
              token,
            },
          },
        };
      },
      DeviceAuthFailed: ({
        message,
        token,
      }: Extract<Message, { readonly _tag: "DeviceAuthFailed" }>): UpdateReturn<Model, Message> => {
        const state = model.deviceAuth ?? initialDeviceAuthState();
        if (token !== state.token) return { model };
        return { model: { ...model, deviceAuth: deviceAuthFailedState(state, message) } };
      },
      DeviceAuthRetryRequested: (): UpdateReturn<Model, Message> => {
        const state = model.deviceAuth ?? initialDeviceAuthState();
        if (state.inflight === true) return { model };
        const nextToken = state.token + 1;
        if (state.session === undefined) {
          return {
            commands: [deviceAuthCommands.read({ token: nextToken })],
            model: {
              ...model,
              deviceAuth: {
                ...state,
                error: undefined,
                inflight: false,
                status: "starting",
                token: nextToken,
              },
            },
          };
        }
        return {
          commands: [
            deviceAuthCommands.poll({
              authRequestId: state.session.authRequestId,
              delayMs: 0,
              intervalMs: deviceAuthPollDelayMs(state.session),
              token: nextToken,
            }),
          ],
          model: {
            ...model,
            deviceAuth: {
              ...state,
              error: undefined,
              inflight: true,
              status: "pending",
              token: nextToken,
            },
          },
        };
      },
      GotDeviceAuthDialogMessage: ({
        message,
      }: Extract<Message, { readonly _tag: "GotDeviceAuthDialogMessage" }>): UpdateReturn<
        Model,
        Message
      > => {
        const result = updateDeviceAuthDialog(
          model.deviceAuthDialog,
          // SAFETY: this tag is only produced by the dialog submodel view/commands.
          message as DialogMessage,
        );
        return {
          commands: Command.mapMessages(result.commands, (childMessage) =>
            Message.GotDeviceAuthDialogMessage({ message: childMessage }),
          ),
          model: { ...model, deviceAuthDialog: result.model },
        };
      },
      DeviceAuthCancelled: (): UpdateReturn<Model, Message> => {
        const state = model.deviceAuth ?? initialDeviceAuthState();
        // S425: clear the in-flight marker or DeviceAuthStartRequested refuses every later start.
        // S459: interrupt the scheduled poll so cancel ends the sleep/request lifetime; the advanced
        // token stays the fence for any result already in flight when the interrupt landed.
        const authRequestId = state.session?.authRequestId;
        return {
          commands:
            authRequestId === undefined
              ? undefined
              : [
                  deviceAuthCommands.poll.Interrupt({ authRequestId }, () =>
                    Message.DeviceAuthPollCancelCompleted({}),
                  ),
                ],
          model: { ...model, deviceAuth: deviceAuthCancelledState(state) },
        };
      },
      DeviceAuthPollCancelCompleted: (): UpdateReturn<Model, Message> => ({ model }),
      DeviceAuthActivated: ({
        token,
      }: Extract<Message, { readonly _tag: "DeviceAuthActivated" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.deviceAuth ?? initialDeviceAuthState();
        if (token !== state.token) return { model };
        // S666: a completed device authorization creates the endpoint; re-read the provider
        // readbacks so the connection card shows the new model without a manual reload.
        const accountsToken = model.readbacks.providerAccounts.token + 1;
        const endpointsToken = model.readbacks.modelEndpoints.token + 1;
        const modelsToken = model.readbacks.configuredModels.token + 1;
        const controlProvidersToken = model.controls.providers.token + 1;
        return {
          commands: [
            readReadback({ key: "providerAccounts", token: accountsToken }),
            readReadback({ key: "modelEndpoints", token: endpointsToken }),
            readReadback({ key: "configuredModels", token: modelsToken }),
            readControl({ key: "providers", token: controlProvidersToken }),
          ],
          model: {
            ...model,
            deviceAuth: { ...state, error: undefined },
            readbacks: {
              ...model.readbacks,
              configuredModels: loadingReadback(modelsToken),
              modelEndpoints: loadingReadback(endpointsToken),
              providerAccounts: loadingReadback(accountsToken),
            },
            controls: { ...model.controls, providers: loadingControl(controlProvidersToken) },
          },
        };
      },
    };
    const requestsRankingHandlers = {
      GotRequestsRankingMetricListboxMessage: ({
        message,
      }: Extract<
        Message,
        { readonly _tag: "GotRequestsRankingMetricListboxMessage" }
      >): UpdateReturn<Model, Message> =>
        // SAFETY: this tag is only produced by the Listbox submodel view/commands, so the carried value is its Message.
        updateRequestsMetricListbox(
          model,
          message as Parameters<typeof requestsMetricListbox.update>[1],
        ),
      GotRequestsRankingTargetListboxMessage: ({
        message,
      }: Extract<
        Message,
        { readonly _tag: "GotRequestsRankingTargetListboxMessage" }
      >): UpdateReturn<Model, Message> =>
        // SAFETY: this tag is only produced by the Listbox submodel view/commands, so the carried value is its Message.
        updateRequestsTargetListbox(
          model,
          message as Parameters<typeof requestsMetricListbox.update>[1],
        ),
      RequestsRankingFieldChanged: ({
        field,
        value,
      }: Extract<Message, { readonly _tag: "RequestsRankingFieldChanged" }>): UpdateReturn<
        Model,
        Message
      > => updateRequestsRankingField(model, field, value),
      RequestsRankingSubmitRequested: (): UpdateReturn<Model, Message> => {
        const state = model.requestsRanking ?? initialRequestsRankingState();
        if (state.status === "loading") return { model };
        const metric = requestsRankingMetricOf(state.metric);
        const rankingTarget = requestsRankingTargetOf(state.rankingTarget);
        if (metric === undefined || rankingTarget === undefined) {
          const token = state.token + 1;
          return {
            model: {
              ...model,
              requestsRanking: {
                ...state,
                message: "Select a supported metric and ranking target.",
                status: "error",
                token,
              },
            },
          };
        }
        const token = state.token + 1;
        const payload = buildRequestsRankingQuery({ metric, rankingTarget });
        return {
          commands: [requestsRankingCommands.query({ payload: JSON.stringify(payload), token })],
          model: {
            ...model,
            requestsRanking: { ...state, message: undefined, status: "loading", token },
          },
        };
      },
      RequestsRankingLoaded: ({
        rows,
        token,
      }: Extract<Message, { readonly _tag: "RequestsRankingLoaded" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.requestsRanking ?? initialRequestsRankingState();
        const next = mergeRequestsRankingLoaded(state, rows, token);
        return next === undefined ? { model } : { model: { ...model, requestsRanking: next } };
      },
      RequestsRankingFailed: ({
        message,
        token,
      }: Extract<Message, { readonly _tag: "RequestsRankingFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.requestsRanking ?? initialRequestsRankingState();
        const next = mergeRequestsRankingFailed(state, message, token);
        return next === undefined ? { model } : { model: { ...model, requestsRanking: next } };
      },
      RoutingChartsLoaded: ({
        entriesJson,
        token,
      }: Extract<Message, { readonly _tag: "RoutingChartsLoaded" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.routingCharts;
        if (state !== undefined && token !== state.token) return { model };
        try {
          const entries = JSON.parse(entriesJson) as ReadonlyArray<{
            readonly body: unknown;
            readonly id: string;
          }>;
          return {
            model: {
              ...model,
              routingCharts: {
                entries: entries.map((entry) => ({
                  id: entry.id,
                  json: JSON.stringify(entry.body),
                })),
                status: "ok",
                token,
              },
            },
          };
        } catch {
          return { model };
        }
      },
      RoutingChartsFailed: ({
        message,
        token,
      }: Extract<Message, { readonly _tag: "RoutingChartsFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.routingCharts;
        if (state !== undefined && token !== state.token) return { model };
        return {
          model: { ...model, routingCharts: { entries: [], message, status: "error", token } },
        };
      },
      RequestsChartsLoaded: ({
        entriesJson,
        token,
      }: Extract<Message, { readonly _tag: "RequestsChartsLoaded" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.requestsCharts;
        if (state !== undefined && token !== state.token) return { model };
        try {
          const entries = JSON.parse(entriesJson) as ReadonlyArray<{
            readonly body: unknown;
            readonly id: string;
          }>;
          return {
            model: {
              ...model,
              requestsCharts: {
                entries: entries.map((entry) => ({
                  id: entry.id,
                  json: JSON.stringify(entry.body),
                })),
                status: "ok",
                token,
              },
            },
          };
        } catch {
          return { model };
        }
      },
      RequestsChartsFailed: ({
        message,
        token,
      }: Extract<Message, { readonly _tag: "RequestsChartsFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.requestsCharts;
        if (state !== undefined && token !== state.token) return { model };
        return {
          model: { ...model, requestsCharts: { entries: [], message, status: "error", token } },
        };
      },
    };
    const learningRankingHandlers = {
      LearningLadderToggleRequested: ({
        rolledBack,
        roleId,
        taskTypeId,
      }: Extract<Message, { readonly _tag: "LearningLadderToggleRequested" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.learningRanking ?? initialLearningRankingState();
        const packs = model.readbacks.learningPacks;
        const scopeId =
          packs.status === "ok" || packs.status === "empty" ? packs.scopeId?.trim() : undefined;
        const plan = planLearningLadderToggle(state, { roleId, rolledBack, scopeId, taskTypeId });
        if (plan.kind === "noop") return { model };
        if (plan.kind !== "rollback") return { model: { ...model, learningRanking: plan.state } };
        return {
          commands: [
            learningRankingCommands.rollbackLadder({
              payload: JSON.stringify(plan.payload),
              roleId,
              scopeId: plan.state.scopeId ?? "",
              taskTypeId,
              token: plan.token,
            }),
          ],
          model: { ...model, learningRanking: plan.state },
        };
      },
      LearningLadderUpdated: ({
        rolledBack,
        roleId,
        scopeId,
        taskTypeId,
        token,
      }: Extract<Message, { readonly _tag: "LearningLadderUpdated" }>): UpdateReturn<
        Model,
        Message
      > => {
        void rolledBack;
        const state = model.learningRanking ?? initialLearningRankingState();
        const packs = model.readbacks.learningPacks;
        const freshScope =
          packs.status === "ok" || packs.status === "empty" ? packs.scopeId : undefined;
        const next = mergeLearningLadderUpdated(state, {
          freshScope,
          roleId,
          scopeId,
          taskTypeId,
          token,
        });
        if (next === undefined) return { model };
        const readbackToken = model.readbacks.learning.token + 1;
        return {
          commands: [readReadback({ key: "learning", token: readbackToken })],
          model: {
            ...model,
            learningRanking: next,
            readbacks: { ...model.readbacks, learning: loadingReadback(readbackToken) },
          },
        };
      },
      LearningLadderFailed: ({
        message,
        roleId,
        scopeId,
        taskTypeId,
        token,
      }: Extract<Message, { readonly _tag: "LearningLadderFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.learningRanking ?? initialLearningRankingState();
        const packs = model.readbacks.learningPacks;
        const freshScope =
          packs.status === "ok" || packs.status === "empty" ? packs.scopeId : undefined;
        const next = mergeLearningLadderFailed(state, {
          freshScope,
          message,
          roleId,
          scopeId,
          taskTypeId,
          token,
        });
        return next === undefined ? { model } : { model: { ...model, learningRanking: next } };
      },
    };
    const endpointActivationHandlers = {
      EndpointAdmissionFieldChanged: ({
        field,
        value,
      }: Extract<Message, { readonly _tag: "EndpointAdmissionFieldChanged" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.endpointAdmission ?? initialEndpointAdmissionState();
        const next = endpointAdmissionFieldChangedState(state, field, value);
        return next === undefined ? { model } : { model: { ...model, endpointAdmission: next } };
      },
      EndpointAdmissionModelAdded: (): UpdateReturn<Model, Message> => {
        const state = model.endpointAdmission ?? initialEndpointAdmissionState();
        const next = endpointAdmissionModelAddedState(state);
        return next === undefined ? { model } : { model: { ...model, endpointAdmission: next } };
      },
      EndpointAdmissionModelRemoved: ({
        modelId,
      }: Extract<Message, { readonly _tag: "EndpointAdmissionModelRemoved" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.endpointAdmission ?? initialEndpointAdmissionState();
        const next = endpointAdmissionModelRemovedState(state, modelId);
        return next === undefined ? { model } : { model: { ...model, endpointAdmission: next } };
      },
      EndpointAdmissionSubmitRequested: (): UpdateReturn<Model, Message> => {
        const state = model.endpointAdmission ?? initialEndpointAdmissionState();
        if (endpointAdmissionBusy(state)) return { model };
        const errors = validateEndpointAdmissionDraft(state);
        if (errors.length > 0)
          return {
            model: {
              ...model,
              endpointAdmission: { ...state, error: errors.join(" "), status: "error" },
            },
          };
        if (endpointActivationNeedsReset(state.run)) return { model };
        const batch = state.draft.batchMode === "true";
        const planned = batch
          ? [
              {
                activationId: `batch:${state.draft.activationBatchId.trim()}`,
                payload: endpointBatchPayload(state.draft),
              },
            ]
          : endpointActivationPayloads(state.draft).map((payload) => ({
              activationId: `model:${encodeURIComponent(payload.modelId)}`,
              payload,
            }));
        const started = beginEndpointActivationRun(state.run, {
          activationIds: planned.map((entry) => entry.activationId),
          mode: batch ? "batch" : "single",
        });
        if (started.kind === "busy") return { model };
        if (started.kind === "invalid") {
          return {
            model: {
              ...model,
              endpointAdmission: { ...state, error: "Select at least one model.", status: "error" },
            },
          };
        }
        const commands = planned.map((entry) =>
          batch
            ? endpointAdmissionCommands.activateBatch({
                activationId: entry.activationId,
                generation: started.generation,
                payload: JSON.stringify(entry.payload),
              })
            : endpointAdmissionCommands.activate({
                activationId: entry.activationId,
                generation: started.generation,
                payload: JSON.stringify(entry.payload),
              }),
        );
        return {
          commands,
          model: {
            ...model,
            endpointAdmission: {
              ...state,
              error: undefined,
              pendingAction: batch ? "batch" : "activate",
              run: started.run,
              status: "saving",
            },
          },
        };
      },
      EndpointAdmissionResetRequested: (): UpdateReturn<Model, Message> => {
        const state = model.endpointAdmission ?? initialEndpointAdmissionState();
        const next = endpointAdmissionResetState(state);
        return next === undefined ? { model } : { model: { ...model, endpointAdmission: next } };
      },
      EndpointAdmissionSucceeded: ({
        activationId,
        generation,
      }: Extract<Message, { readonly _tag: "EndpointAdmissionSucceeded" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.endpointAdmission ?? initialEndpointAdmissionState();
        const result = settleEndpointActivation(state.run, {
          activationId,
          generation,
          outcome: "succeeded",
        });
        if (result.kind !== "updated") return { model };
        const completed = endpointAdmissionCompletion(model, state, result.run);
        const rail = refreshRailReadbacks(completed.model);
        return {
          ...completed,
          commands: [...(completed.commands ?? []), ...rail.commands],
          model: { ...completed.model, readbacks: rail.readbacks },
        };
      },
      EndpointAdmissionFailed: ({
        activationId,
        generation,
        message,
      }: Extract<Message, { readonly _tag: "EndpointAdmissionFailed" }>): UpdateReturn<
        Model,
        Message
      > => {
        const state = model.endpointAdmission ?? initialEndpointAdmissionState();
        const result = settleEndpointActivation(state.run, {
          activationId,
          generation,
          outcome: "failed",
          message,
        });
        if (result.kind !== "updated") return { model };
        return endpointAdmissionCompletion(model, state, result.run);
      },
    };
    const handlers = {
      ...shellHandlers,
      ...remainingHandlers,
      ...deviceAuthHandlers,
      ...requestsRankingHandlers,
      ...learningRankingHandlers,
      ...endpointActivationHandlers,
    };
    return Message.match<UpdateReturn<Model, Message>>(message, handlers);
  };
};
