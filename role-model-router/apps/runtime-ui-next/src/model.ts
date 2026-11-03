/**
 * W1c (S514/S512 design): feature field groups. The runtime Model remains the same
 * flat object; the explicit modelFields composition preserves historical key order
 * so hydration/serialization is byte-compatible.
 */
import { Schema } from "effect";

import { ControlsState } from "./control";
import { ChartInteractionStateSchema } from "./chart-interaction";
import { LearningRankingStateSchema } from "./learning-ranking";
import { RequestsRankingStateSchema } from "./requests-ranking";
import { DeviceAuthStateSchema } from "./device-auth";
import { EndpointAdmissionStateSchema } from "./endpoint-admission";
import { ProviderAccountStateSchema } from "./provider-account";
import { RouterPostureStateSchema } from "./router-posture";
import { RetentionStateSchema } from "./storage-retention";
import { DiagnosticsSnapshot } from "./diagnostics";
import { ObservabilityState } from "./observability";
import { ReadbacksState } from "./readback";
import { RuntimeRefreshState } from "./refresh";
import { StudioState } from "./studio";
import { AppRoute } from "./route";

const shellFields = {
  clicks: Schema.Number,
  controls: ControlsState,
  chartInteraction: Schema.optional(ChartInteractionStateSchema),
  diagnostics: DiagnosticsSnapshot,
  observability: ObservabilityState,
  overviewFilters: Schema.optional(Schema.Struct({ breakdown: Schema.Literals(["all", "endpoint", "model", "provider"]), breakdownValue: Schema.String, difficulty: Schema.Literals(["all", "easy", "medium", "hard"]), source: Schema.Literals(["all", "local", "remote"]), status: Schema.Literals(["all", "success", "failure", "unknown"]) })),
  runtimeConfigEditor: Schema.optional(Schema.Struct({ diff: Schema.Array(Schema.String), message: Schema.optional(Schema.String), notice: Schema.optional(Schema.String), originalText: Schema.String, status: Schema.Literals(["not-loaded", "loading", "editing", "confirming", "invalid", "pending", "saved", "error"]), text: Schema.String, token: Schema.Number })),
  overviewWindowMs: Schema.optional(Schema.Number),
  pendingRedirectHref: Schema.optional(Schema.String),
  readbacks: ReadbacksState,
  refresh: RuntimeRefreshState,
  route: AppRoute,
  theme: Schema.Literals(["light", "dark"]),
};
const runtimeFields = {
  runtimeConfigEditor: shellFields.runtimeConfigEditor,
  overviewWindowMs: shellFields.overviewWindowMs,
  pendingRedirectHref: shellFields.pendingRedirectHref,
};

const requestsFields = {
  requestsRanking: Schema.optional(RequestsRankingStateSchema),
  requestsRankingMetricListbox: Schema.optional(Schema.Any),
  requestsRankingTargetListbox: Schema.optional(Schema.Any),
};
const learningFields = {
  learningDecisionFilters: Schema.optional(Schema.Struct({
    advisoryState: Schema.optional(Schema.String),
    origin: Schema.optional(Schema.String),
    outcome: Schema.optional(Schema.String),
    role: Schema.optional(Schema.String),
    task: Schema.optional(Schema.String),
  })),
  learningOperatorToken: Schema.optional(Schema.String),
  learningPackAction: Schema.optional(Schema.Struct({
    message: Schema.optional(Schema.String),
    status: Schema.Literals(["idle", "saving", "saved", "error"]),
    token: Schema.optional(Schema.Number),
  })),
  learningRanking: Schema.optional(LearningRankingStateSchema),
  learningReplayAutoQueue: Schema.optional(Schema.Struct({
    dailyCap: Schema.String,
    enabled: Schema.String,
    message: Schema.optional(Schema.String),
    status: Schema.Literals(["idle", "saving", "saved", "error"]),
    token: Schema.optional(Schema.Number),
  })),
};
const requestsFieldsExtra = {
  requestsFilters: Schema.optional(Schema.Struct({
    breakdown: Schema.String,
    difficulty: Schema.String,
    expanded: Schema.Boolean,
    range: Schema.String,
    source: Schema.String,
    statusFamily: Schema.String,
  })),
};
const observeFields = {
  observeRoutingFilters: Schema.optional(Schema.Struct({
    breakdown: Schema.String,
    difficulty: Schema.String,
    expanded: Schema.Boolean,
    range: Schema.String,
    source: Schema.String,
  })),
};
const RoleDraftStateSchema = Schema.Struct({
  allowedTools: Schema.optional(Schema.String),
  defaultSystemInstructions: Schema.optional(Schema.String),
  description: Schema.String,
  forbiddenCapabilities: Schema.optional(Schema.String),
  instructions: Schema.String,
  kind: Schema.String,
  name: Schema.String,
  outputContracts: Schema.optional(Schema.String),
  preferredCapabilities: Schema.optional(Schema.String),
  requiredCapabilities: Schema.optional(Schema.String),
  roleId: Schema.String,
  roleKind: Schema.optional(Schema.String),
  routingOverridesText: Schema.optional(Schema.String),
  safetyPolicyRefs: Schema.optional(Schema.String),
  taskTypesSupported: Schema.optional(Schema.String),
  toolPolicy: Schema.String,
  toolPolicyMode: Schema.optional(Schema.String),
});

const modelsFields = {
  modelsView: Schema.optional(Schema.Struct({
    actionMessage: Schema.optional(Schema.String),
    advancedPolicy: Schema.optional(Schema.Boolean),
    benchmarkClearPending: Schema.optional(Schema.Boolean),
    benchmarkJudge: Schema.optional(Schema.String),
    benchmarkMode: Schema.optional(Schema.String),
    expandedRoleId: Schema.optional(Schema.String),
    roleAction: Schema.optional(Schema.Struct({
      kind: Schema.Literals(["create", "edit", "tasks"]),
      message: Schema.optional(Schema.String),
      status: Schema.Literals(["idle", "saving", "saved", "error"]),
      token: Schema.optional(Schema.Number),
    })),
    roleDraft: Schema.optional(RoleDraftStateSchema),
    roleEditDraft: Schema.optional(RoleDraftStateSchema),
    removeConfirmation: Schema.optional(Schema.String),
    roleOverrides: Schema.optional(Schema.Array(Schema.Struct({ enabled: Schema.Boolean, modelId: Schema.String, roleId: Schema.String }))),
    roleTaskSelections: Schema.optional(Schema.Array(Schema.Struct({ roleIds: Schema.Array(Schema.String), taskType: Schema.String }))),
    selectedModelId: Schema.optional(Schema.String),
    selectedRoleId: Schema.optional(Schema.String),
  })),
};
const deviceAuthFields = {
  deviceAuth: Schema.optional(DeviceAuthStateSchema),
  deviceAuthDialog: Schema.optional(Schema.Any),
  deviceAuthModalKey: Schema.optional(Schema.String),
};
const providersFields = { providerAccount: Schema.optional(ProviderAccountStateSchema) };
const endpointsFields = { endpointAdmission: Schema.optional(EndpointAdmissionStateSchema) };
const studioFields = { studio: Schema.optional(StudioState) };
const modelFields = {
  clicks: shellFields.clicks,
  controls: shellFields.controls,
  deviceAuth: deviceAuthFields.deviceAuth,
  modelsView: modelsFields.modelsView,
  requestsFilters: requestsFieldsExtra.requestsFilters,
  observeRoutingFilters: observeFields.observeRoutingFilters,
  observeLogsSource: Schema.optional(Schema.String),
  localLogsAutoRefresh: Schema.optional(Schema.Boolean),
  localPeerModelId: Schema.optional(Schema.String),
  localPeerModelMessage: Schema.optional(Schema.String),
  localPeersDraft: Schema.optional(Schema.Struct({ token: Schema.String, url: Schema.String })),
  localPeersMessage: Schema.optional(Schema.String),
  deviceAuthDialog: deviceAuthFields.deviceAuthDialog,
  deviceAuthModalKey: deviceAuthFields.deviceAuthModalKey,
  chartInteraction: shellFields.chartInteraction,
  diagnostics: shellFields.diagnostics,
  requestsRanking: requestsFields.requestsRanking,
  requestsRankingMetricListbox: requestsFields.requestsRankingMetricListbox,
  requestsRankingTargetListbox: requestsFields.requestsRankingTargetListbox,
  learningDecisionFilters: learningFields.learningDecisionFilters,
  learningOperatorToken: learningFields.learningOperatorToken,
  learningPackAction: learningFields.learningPackAction,
  learningRanking: learningFields.learningRanking,
  learningReplayAutoQueue: learningFields.learningReplayAutoQueue,
  endpointAdmission: endpointsFields.endpointAdmission,
  providerAccount: providersFields.providerAccount,
  routerPosture: Schema.optional(RouterPostureStateSchema),
  retention: Schema.optional(RetentionStateSchema),
  operatorLearningMode: Schema.optional(Schema.String),
  observability: shellFields.observability,
  overviewFilters: shellFields.overviewFilters,
  runtimeConfigEditor: runtimeFields.runtimeConfigEditor,
  overviewWindowMs: runtimeFields.overviewWindowMs,
  pendingRedirectHref: runtimeFields.pendingRedirectHref,
  readbacks: shellFields.readbacks,
  refresh: shellFields.refresh,
  route: shellFields.route,
  studio: studioFields.studio,
  theme: shellFields.theme,
};

export const Model: Schema.Struct<typeof modelFields> = Schema.Struct(modelFields);
export type Model = typeof Model.Type;
export type ShellModelSlice = Pick<Model, keyof typeof shellFields>;
export type RequestsModelSlice = Pick<Model, keyof typeof requestsFields>;
export const withShellSlice = (model: Model, slice: ShellModelSlice): Model => ({ ...model, ...slice });
export const withRequestsSlice = (model: Model, slice: RequestsModelSlice): Model => ({ ...model, ...slice });
export type LearningModelSlice = Pick<Model, keyof typeof learningFields>;
export type DeviceAuthModelSlice = Pick<Model, keyof typeof deviceAuthFields>;
export type ProvidersModelSlice = Pick<Model, keyof typeof providersFields>;
export type EndpointsModelSlice = Pick<Model, keyof typeof endpointsFields>;
export type StudioModelSlice = Pick<Model, keyof typeof studioFields>;
export type ModelsModelSlice = Pick<Model, keyof typeof modelsFields>;
export type RequestsFiltersSlice = Pick<Model, keyof typeof requestsFieldsExtra>;
export type ObserveFiltersSlice = Pick<Model, keyof typeof observeFields>;
export type RuntimeModelSlice = Pick<Model, keyof typeof runtimeFields>;

export const withLearningSlice = (model: Model, slice: LearningModelSlice): Model => ({ ...model, ...slice });
export const withDeviceAuthSlice = (model: Model, slice: DeviceAuthModelSlice): Model => ({ ...model, ...slice });
export const withProvidersSlice = (model: Model, slice: ProvidersModelSlice): Model => ({ ...model, ...slice });
export const withEndpointsSlice = (model: Model, slice: EndpointsModelSlice): Model => ({ ...model, ...slice });
export const withModelsSlice = (model: Model, slice: ModelsModelSlice): Model => ({ ...model, ...slice });
export const withStudioSlice = (model: Model, slice: StudioModelSlice): Model => ({ ...model, ...slice });
export const withRuntimeSlice = (model: Model, slice: RuntimeModelSlice): Model => ({ ...model, ...slice });
