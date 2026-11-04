import { Navigation, Url } from "@role-model-router/foldkit";
import type { MessageUnion } from "@role-model-router/foldkit/message";
import { defineMessageUnion } from "@role-model-router/foldkit/message";
import { Schema } from "effect";

import { ControlKeySchema, ControlState } from "./control";
import { DiagnosticsSnapshot } from "./diagnostics";
import { ObservabilityState } from "./observability";
import { ReadbackKeySchema, ReadbackState } from "./readback";
import { DeviceAuthFieldSchema, DeviceAuthSessionSchema, DeviceAuthSessionsSchema } from "./device-auth";
import { LearningRankingStateSchema } from "./learning-ranking";
import { RequestsRankingFieldSchema, RequestsRankingRowsSchema } from "./requests-ranking";
import { EndpointAdmissionFieldSchema } from "./endpoint-admission";
import { ProviderAccountFieldSchema } from "./provider-account";
import { StudioFieldSchema, StudioTabSchema } from "./studio";

type EmptyFields = Record<never, never>;

const RouterPostureFieldSchema = Schema.Literals(["mode", "scoringStrategy", "executionMode", "pinWeights", "weightQuality", "weightLatency", "weightThroughput", "weightCost", "weightReliability", "weightPreference"]);
const RouterEntryFieldSchema = Schema.Literals(["name", "role", "model", "description"]);
const RouterBlockSchema = Schema.Literals(["agent_strategies", "workloads"]);
const RoleActionKindSchema = Schema.Literals(["create", "edit", "tasks"] as const);
const RoleDraftFieldSchema = Schema.Literals(["roleId", "name", "description", "instructions", "kind", "toolPolicy", "allowedTools", "defaultSystemInstructions", "forbiddenCapabilities", "outputContracts", "preferredCapabilities", "requiredCapabilities", "roleKind", "routingOverridesText", "safetyPolicyRefs", "taskTypesSupported", "toolPolicyMode"]);
const RequestsFilterFieldSchema = Schema.Literals(["breakdown", "difficulty", "source", "statusFamily"]);
const ObserveFilterFieldSchema = Schema.Literals(["breakdown", "difficulty", "source"]);

export const Message: MessageUnion<{
  readonly ChangedUrl: { readonly url: typeof Url.Url };
  readonly Clicked: EmptyFields;
  readonly ClickedLink: { readonly request: typeof Navigation.UrlRequest };
  readonly ControllerEndpointSelected: { readonly endpointId: typeof Schema.String };
  readonly ControllerSaveRequested: { readonly endpointId: typeof Schema.String };
  readonly ControlActionCompleted: {
    readonly key: typeof ControlKeySchema;
    readonly message: typeof Schema.String;
    readonly token: typeof Schema.Number;
    readonly serverEndpointId: Schema.optional<typeof Schema.String>;
  };
  readonly ControlActionFailed: {
    readonly key: typeof ControlKeySchema;
    readonly message: typeof Schema.String;
    readonly token: typeof Schema.Number;
  };
  readonly ControlActionRequested: {
    readonly key: typeof ControlKeySchema;
    readonly targetId: Schema.optional<typeof Schema.String>;
    readonly token: typeof Schema.Number;
  };
  readonly ControlFailed: {
    readonly key: typeof ControlKeySchema;
    readonly message: typeof Schema.String;
    readonly token: typeof Schema.Number;
  };
  readonly ControlLoaded: {
    readonly key: typeof ControlKeySchema;
    readonly snapshot: typeof ControlState;
    readonly token: typeof Schema.Number;
  };
  readonly DeviceAuthFieldChanged: { readonly field: typeof DeviceAuthFieldSchema; readonly value: typeof Schema.String };
  readonly GotDeviceAuthDialogMessage: { readonly message: typeof Schema.Unknown };
  readonly DeviceAuthModelAdded: EmptyFields;
  readonly DeviceAuthModelRemoved: { readonly modelId: typeof Schema.String };
  readonly DeviceAuthStartRequested: EmptyFields;
  readonly DeviceAuthSessionsLoaded: { readonly sessions: typeof DeviceAuthSessionsSchema; readonly token: typeof Schema.Number };
  readonly DeviceAuthStarted: { readonly session: typeof DeviceAuthSessionSchema; readonly token: typeof Schema.Number };
  readonly DeviceAuthPolled: { readonly session: typeof DeviceAuthSessionSchema; readonly token: typeof Schema.Number };
  readonly DeviceAuthFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly DeviceAuthRetryRequested: EmptyFields;
  readonly DeviceAuthCancelled: EmptyFields;
  readonly DeviceAuthPollCancelCompleted: EmptyFields;
  readonly DeviceAuthActivated: { readonly token: typeof Schema.Number };
  readonly DiagnosticsFailed: {
    readonly id: typeof Schema.String;
    readonly message: typeof Schema.String;
  };
  readonly DiagnosticsLoaded: {
    readonly id: typeof Schema.String;
    readonly snapshot: typeof DiagnosticsSnapshot;
  };
  readonly DiagnosticsRefreshRequested: EmptyFields;
  readonly NavigationCompleted: EmptyFields;
  readonly ObservabilityFailed: {
    readonly message: typeof Schema.String;
    readonly token: typeof Schema.Number;
  };
  readonly ObservabilityLoaded: {
    readonly snapshot: typeof ObservabilityState;
    readonly token: typeof Schema.Number;
  };
  readonly GotRequestsRankingMetricListboxMessage: { readonly message: typeof Schema.Unknown };
  readonly GotRequestsRankingTargetListboxMessage: { readonly message: typeof Schema.Unknown };
  readonly RequestsRankingFieldChanged: { readonly field: typeof RequestsRankingFieldSchema; readonly value: typeof Schema.String };
  readonly RequestsRankingSubmitRequested: EmptyFields;
  readonly RequestsRankingLoaded: { readonly rows: typeof RequestsRankingRowsSchema; readonly token: typeof Schema.Number };
  readonly RequestsRankingFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly RoutingChartsLoaded: { readonly entriesJson: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly RoutingChartsFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly ReplayAutoQueueToggleChanged: { readonly value: typeof Schema.String };
  readonly ReplayAutoQueueCapChanged: { readonly value: typeof Schema.String };
  readonly ReplayAutoQueueSaveRequested: EmptyFields;
  readonly ReplayAutoQueueSaved: { readonly token: typeof Schema.Number };
  readonly ReplayAutoQueueSaveFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly ModelCardSelected: { readonly modelId: typeof Schema.String };
  readonly ModelsRoleToggled: { readonly enabled: typeof Schema.Boolean; readonly modelId: typeof Schema.String; readonly roleId: typeof Schema.String };
  readonly RoleDraftChanged: { readonly field: typeof RoleDraftFieldSchema; readonly value: typeof Schema.String };
  readonly RoleDraftReset: EmptyFields;
  readonly RoleCreateRequested: EmptyFields;
  readonly RoleAdvancedPolicyToggled: EmptyFields;
  readonly RoleEditDraftChanged: { readonly field: typeof RoleDraftFieldSchema; readonly value: typeof Schema.String };
  readonly RoleSelected: { readonly roleId: typeof Schema.String };
  readonly RoleTaskDetailToggled: { readonly roleId: typeof Schema.String };
  readonly RoleTaskRoleToggled: { readonly roleId: typeof Schema.String; readonly taskType: typeof Schema.String };
  readonly RoleTaskAllowlistsSaveRequested: EmptyFields;
  readonly RoleEditReset: EmptyFields;
  readonly RoleEditSaveRequested: EmptyFields;
  readonly RolePolicyWriteSucceeded: { readonly kind: typeof RoleActionKindSchema; readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly RolePolicyWriteFailed: { readonly kind: typeof RoleActionKindSchema; readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly BenchmarkModeChanged: { readonly value: typeof Schema.String };
  readonly BenchmarkJudgeChanged: { readonly value: typeof Schema.String };
  readonly BenchmarkRunRequested: EmptyFields;
  readonly BenchmarkClearRequested: EmptyFields;
  readonly BenchmarkClearConfirmed: EmptyFields;
  readonly BenchmarkClearCancelled: EmptyFields;
  readonly BenchmarkEndpointSelected: { readonly endpointId: typeof Schema.String; readonly selected: typeof Schema.Boolean };
  readonly BenchmarkEndpointClearRequested: { readonly endpointId: typeof Schema.String };
  readonly BenchmarkEndpointClearConfirmed: { readonly endpointId: typeof Schema.String };
  readonly BenchmarkEndpointClearCancelled: EmptyFields;
  readonly BenchmarkEndpointCleared: { readonly endpointId: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly BenchmarkEndpointClearFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly BenchmarkPreferencesSaveRequested: { readonly judgeEndpointId: typeof Schema.String };
  readonly BenchmarkPreferencesSaved: { readonly judgeEndpointId: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly BenchmarkPreferencesSaveFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly BenchmarkRunStarted: { readonly runId: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly BenchmarkRunStartFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly BenchmarkRunPollRequested: { readonly runId: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly BenchmarkRunPolled: { readonly progressJson: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly BenchmarkRunPollFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly BenchmarkTaxonomyFilterChanged: { readonly filter: typeof Schema.String; readonly value: typeof Schema.String };
  readonly ModelsRemoveRequested: { readonly modelId: typeof Schema.String };
  readonly ModelsControllerSetRequested: { readonly modelId: typeof Schema.String };
  readonly ModelsControllerEjectRequested: { readonly modelId: typeof Schema.String };
  readonly ModelsActionSucceeded: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly RequestsRangeChanged: { readonly value: typeof Schema.String };
  readonly RequestsFilterChanged: { readonly field: typeof RequestsFilterFieldSchema; readonly value: typeof Schema.String };
  readonly RequestsAdvancedToggled: EmptyFields;
  readonly ObserveRangeChanged: { readonly value: typeof Schema.String };
  readonly ObserveFilterChanged: { readonly field: typeof ObserveFilterFieldSchema; readonly value: typeof Schema.String };
  readonly ObserveAdvancedToggled: EmptyFields;
  readonly LocalPeerUrlChanged: { readonly value: typeof Schema.String };
  readonly LocalPeerTokenChanged: { readonly value: typeof Schema.String };
  readonly LocalPeerAddRequested: EmptyFields;
  readonly LocalPeerHealthRequested: { readonly peerId: typeof Schema.String };
  readonly LocalPeerRemoveRequested: { readonly peerId: typeof Schema.String };
  readonly SystemExtensionsPauseRequested: { readonly extensionId: typeof Schema.String };
  readonly SystemExtensionsDownloadRequested: EmptyFields;
  readonly SystemExtensionsActionSucceeded: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly SystemExtensionsActionFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly SystemOperatorTraceRootChanged: { readonly value: typeof Schema.String };
  readonly SystemOperatorReplayCountChanged: { readonly value: typeof Schema.String };
  readonly SystemOperatorLoadRequested: EmptyFields;
  readonly SystemOperatorCreateReplayRequested: EmptyFields;
  readonly SystemOperatorActionSucceeded: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly SystemOperatorActionFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LocalLlamaSwapModelIdChanged: { readonly value: typeof Schema.String };
  readonly LocalLlamaSwapModelLoadRequested: EmptyFields;
  readonly LocalLlamaSwapAllRolesRequested: EmptyFields;
  readonly LocalLlamaSwapActionSucceeded: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LocalLlamaSwapActionFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LocalPeerModelIdChanged: { readonly value: typeof Schema.String };
  readonly LocalPeerModelLoadRequested: EmptyFields;
  readonly LocalPeerModelActionSucceeded: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LocalPeerModelActionFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LocalPeersActionSucceeded: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LocalPeersActionFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LocalLogsAutoRefreshToggled: { readonly value: typeof Schema.Boolean };
  readonly ObserveLogsSourceChanged: { readonly value: typeof Schema.String };
  readonly ObservabilityRefreshRequested: EmptyFields;
  readonly StoreReceiptsRefreshRequested: EmptyFields;
  readonly ModelsActionFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LearningLadderToggleRequested: { readonly rolledBack: typeof Schema.Boolean; readonly roleId: typeof Schema.String; readonly taskTypeId: typeof Schema.String };
  readonly LearningLadderUpdated: { readonly rolledBack: typeof Schema.Boolean; readonly roleId: typeof Schema.String; readonly scopeId: typeof Schema.String; readonly taskTypeId: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LearningLadderFailed: { readonly message: typeof Schema.String; readonly roleId: typeof Schema.String; readonly scopeId: typeof Schema.String; readonly taskTypeId: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LearningOperatorTokenChanged: { readonly value: typeof Schema.String };
  readonly LearningDecisionFilterChanged: { readonly filter: typeof Schema.String; readonly value: typeof Schema.String };
  readonly LearningPackRollbackRequested: EmptyFields;
  readonly LearningPackRollbackSucceeded: { readonly token: typeof Schema.Number };
  readonly LearningPackRollbackFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LearningKillSwitchRequested: { readonly engaged: typeof Schema.Boolean };
  readonly LearningKillSwitchSucceeded: { readonly token: typeof Schema.Number };
  readonly LearningKillSwitchFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LocalPolicyAutoUnloadToggled: EmptyFields;
  readonly LocalPolicyMaxConcurrencyChanged: { readonly value: typeof Schema.Number };
  readonly LocalPolicyResetRequested: EmptyFields;
  readonly LocalPolicySaveFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LocalPolicySaveRequested: EmptyFields;
  readonly LocalPolicySaved: { readonly policy: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LocalPolicyTtlChanged: { readonly value: typeof Schema.Number };
  readonly ChartPointShown: { readonly label: typeof Schema.String; readonly seriesId: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly ChartTooltipDismissed: { readonly token: typeof Schema.Number };
  readonly ChartSeriesToggled: { readonly seriesId: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly EndpointAdmissionFieldChanged: { readonly field: typeof EndpointAdmissionFieldSchema; readonly value: typeof Schema.String };
  readonly EndpointAdmissionModelAdded: EmptyFields;
  readonly EndpointAdmissionModelRemoved: { readonly modelId: typeof Schema.String };
  readonly EndpointAdmissionSubmitRequested: EmptyFields;
  readonly EndpointAdmissionResetRequested: EmptyFields;
  readonly EndpointAdmissionSucceeded: { readonly activationId: typeof Schema.String; readonly generation: typeof Schema.Number };
  readonly EndpointAdmissionFailed: { readonly activationId: typeof Schema.String; readonly generation: typeof Schema.Number; readonly message: typeof Schema.String };
  readonly RetentionSizeChanged: { readonly value: typeof Schema.String };
  readonly RetentionAgeChanged: { readonly value: typeof Schema.String };
  readonly LearningModeSelectChanged: { readonly mode: typeof Schema.String };
  readonly LearningModeUpdateRequested: { readonly mode: typeof Schema.String };
  readonly LearningRollbackRequested: EmptyFields;
  readonly LearningModeSucceeded: { readonly token: typeof Schema.Number };
  readonly LearningModeFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly RetentionPolicySaveRequested: { readonly maxAgeDays: typeof Schema.Number; readonly maxSizeGb: typeof Schema.Number };
  readonly RetentionDryRunRequested: EmptyFields;
  readonly RetentionExecuteRequested: EmptyFields;
  readonly RetentionSucceeded: { readonly manifestHash: Schema.optional<typeof Schema.String>; readonly token: typeof Schema.Number };
  readonly RetentionFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LocalLogsRefreshRequested: EmptyFields;
  readonly RouterPostureFieldChanged: { readonly field: typeof RouterPostureFieldSchema; readonly value: typeof Schema.String };
  readonly RouterBlockChanged: { readonly block: typeof RouterBlockSchema; readonly value: typeof Schema.String };
  readonly RouterEntryFieldChanged: { readonly field: typeof RouterEntryFieldSchema; readonly value: typeof Schema.String };
  readonly RouterPostureSaveRequested: EmptyFields;
  readonly RouterBlockSaveRequested: { readonly block: typeof RouterBlockSchema };
  readonly RouterPostureSaved: { readonly token: typeof Schema.Number };
  readonly RouterPostureFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly RouterPostureResetRequested: EmptyFields;
  readonly ProviderAccountFieldChanged: { readonly field: typeof ProviderAccountFieldSchema; readonly value: typeof Schema.String };
  readonly ProviderAccountSelectionChanged: { readonly providerId: typeof Schema.String; readonly variantId: typeof Schema.String };
  readonly ProviderAccountModelChosen: { readonly modelId: typeof Schema.String };
  readonly ProviderAccountModelAdded: EmptyFields;
  readonly ProviderAccountModelRemoved: { readonly modelId: typeof Schema.String };
  readonly ProviderAccountCreateRequested: EmptyFields;
  readonly ProviderAccountCreateSucceeded: { readonly token: typeof Schema.Number };
  readonly ProviderAccountEndpointsActivated: { readonly token: typeof Schema.Number };
  readonly ProviderAccountUpdateKeyRequested: EmptyFields;
  readonly ProviderAccountKeyUpdated: { readonly token: typeof Schema.Number };
  readonly ProviderAccountModelDeleteRequested: { readonly modelId: typeof Schema.String };
  readonly ProviderAccountModelDeleted: { readonly modelId: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly ProviderAccountFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly ReadbackFailed: {
    readonly key: typeof ReadbackKeySchema;
    readonly message: typeof Schema.String;
    readonly token: typeof Schema.Number;
  };
  readonly ReadbackLoaded: {
    readonly key: typeof ReadbackKeySchema;
    readonly snapshot: typeof ReadbackState;
    readonly token: typeof Schema.Number;
  };
  readonly StudioTabSelected: { readonly tab: typeof StudioTabSchema; };
  readonly StudioTabKey: { readonly key: typeof Schema.String };
  readonly StudioFieldChanged: { readonly field: typeof StudioFieldSchema; readonly value: typeof Schema.String; };
  readonly StudioLoaded: {
    readonly responseText: typeof Schema.String;
    readonly statusCode: typeof Schema.Number;
    readonly tab: typeof StudioTabSchema;
    readonly token: typeof Schema.Number;
  };
  readonly StudioFailed: { readonly message: typeof Schema.String; readonly statusCode: typeof Schema.Number; readonly responseText: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly StudioRunRequested: { readonly token: typeof Schema.Number };
  readonly SelectedOverviewWindow: {
    readonly windowMs: typeof Schema.Number;
  };
  readonly OverviewFilterChanged: {
    readonly filter: typeof Schema.String;
    readonly value: typeof Schema.String;
  };
  readonly RefreshResynced: {
    readonly routeId: typeof Schema.String;
    readonly snapshot: typeof DiagnosticsSnapshot;
    readonly token: typeof Schema.Number;
  };
  readonly RefreshResyncFailed: {
    readonly message: typeof Schema.String;
    readonly routeId: typeof Schema.String;
    readonly token: typeof Schema.Number;
  };
  readonly RuntimeConfigLoadRequested: EmptyFields;
  readonly RuntimeConfigTextChanged: { readonly text: typeof Schema.String };
  readonly RuntimeConfigSaveRequested: EmptyFields;
  readonly RuntimeConfigConfirmRequested: { readonly token: typeof Schema.Number };
  readonly RuntimeConfigSaved: { readonly recordJson: typeof Schema.String; readonly status: typeof Schema.Number; readonly token: typeof Schema.Number };
  readonly RuntimeConfigSaveFailed: { readonly message: typeof Schema.String; readonly status: typeof Schema.Number; readonly token: typeof Schema.Number };
  readonly RuntimeRevisionReceived: { readonly revision: typeof Schema.Number };
  readonly RuntimeTelemetryReceived: {
    readonly emittedAtMs: typeof Schema.Number;
    readonly requestId: typeof Schema.String;
  };
  readonly RuntimePageRestored: EmptyFields;
  readonly ThemeApplied: EmptyFields;
  readonly ToggledTheme: EmptyFields;
}> = defineMessageUnion({
  ChangedUrl: { url: Url.Url },
  Clicked: {},
  ClickedLink: { request: Navigation.UrlRequest },
  ControllerEndpointSelected: { endpointId: Schema.String },
  ControllerSaveRequested: { endpointId: Schema.String },
  ControlActionCompleted: { key: ControlKeySchema, message: Schema.String, token: Schema.Number, serverEndpointId: Schema.optional(Schema.String) },
  ControlActionFailed: { key: ControlKeySchema, message: Schema.String, token: Schema.Number },
  ControlActionRequested: { key: ControlKeySchema, targetId: Schema.optional(Schema.String), token: Schema.Number },
  ControlFailed: { key: ControlKeySchema, message: Schema.String, token: Schema.Number },
  ControlLoaded: { key: ControlKeySchema, snapshot: ControlState, token: Schema.Number },
  DeviceAuthFieldChanged: { field: DeviceAuthFieldSchema, value: Schema.String },
GotDeviceAuthDialogMessage: { message: Schema.Unknown },
  DeviceAuthModelAdded: {},
  DeviceAuthModelRemoved: { modelId: Schema.String },
  DeviceAuthStartRequested: {},
  DeviceAuthSessionsLoaded: { sessions: DeviceAuthSessionsSchema, token: Schema.Number },
  DeviceAuthStarted: { session: DeviceAuthSessionSchema, token: Schema.Number },
  DeviceAuthPolled: { session: DeviceAuthSessionSchema, token: Schema.Number },
  DeviceAuthFailed: { message: Schema.String, token: Schema.Number },
  DeviceAuthRetryRequested: {},
  DeviceAuthCancelled: {},
  DeviceAuthPollCancelCompleted: {},
  DeviceAuthActivated: { token: Schema.Number },
  DiagnosticsFailed: { id: Schema.String, message: Schema.String },
  DiagnosticsLoaded: { id: Schema.String, snapshot: DiagnosticsSnapshot },
  DiagnosticsRefreshRequested: {},
  NavigationCompleted: {},
  ObservabilityFailed: { message: Schema.String, token: Schema.Number },
  ObservabilityLoaded: { snapshot: ObservabilityState, token: Schema.Number },
  GotRequestsRankingMetricListboxMessage: { message: Schema.Unknown },
GotRequestsRankingTargetListboxMessage: { message: Schema.Unknown },
RequestsRankingFieldChanged: { field: Schema.Literals(["metric", "rankingTarget"]), value: Schema.String },
  RequestsRankingSubmitRequested: {},
  RequestsRankingLoaded: { rows: RequestsRankingRowsSchema, token: Schema.Number },
  RequestsRankingFailed: { message: Schema.String, token: Schema.Number },
  RoutingChartsLoaded: { entriesJson: Schema.String, token: Schema.Number },
  RoutingChartsFailed: { message: Schema.String, token: Schema.Number },
  ReplayAutoQueueToggleChanged: { value: Schema.String },
  ReplayAutoQueueCapChanged: { value: Schema.String },
  ReplayAutoQueueSaveRequested: {},
  ReplayAutoQueueSaved: { token: Schema.Number },
  ReplayAutoQueueSaveFailed: { message: Schema.String, token: Schema.Number },
  ModelCardSelected: { modelId: Schema.String },
  ModelsRoleToggled: { enabled: Schema.Boolean, modelId: Schema.String, roleId: Schema.String },
  RoleDraftChanged: { field: RoleDraftFieldSchema, value: Schema.String },
  RoleDraftReset: {},
  RoleCreateRequested: {},
  RoleAdvancedPolicyToggled: {},
  RoleEditDraftChanged: { field: RoleDraftFieldSchema, value: Schema.String },
  RoleSelected: { roleId: Schema.String },
  RoleTaskDetailToggled: { roleId: Schema.String },
  RoleTaskRoleToggled: { roleId: Schema.String, taskType: Schema.String },
  RoleTaskAllowlistsSaveRequested: {},
  RoleEditReset: {},
  RoleEditSaveRequested: {},
  RolePolicyWriteSucceeded: { kind: RoleActionKindSchema, message: Schema.String, token: Schema.Number },
  RolePolicyWriteFailed: { kind: RoleActionKindSchema, message: Schema.String, token: Schema.Number },
  BenchmarkModeChanged: { value: Schema.String },
  BenchmarkJudgeChanged: { value: Schema.String },
  BenchmarkRunRequested: {},
  BenchmarkClearRequested: {},
  BenchmarkClearConfirmed: {},
  BenchmarkClearCancelled: {},
  BenchmarkEndpointSelected: { endpointId: Schema.String, selected: Schema.Boolean },
  BenchmarkEndpointClearRequested: { endpointId: Schema.String },
  BenchmarkEndpointClearConfirmed: { endpointId: Schema.String },
  BenchmarkEndpointClearCancelled: {},
  BenchmarkEndpointCleared: { endpointId: Schema.String, token: Schema.Number },
  BenchmarkEndpointClearFailed: { message: Schema.String, token: Schema.Number },
  BenchmarkPreferencesSaveRequested: { judgeEndpointId: Schema.String },
  BenchmarkPreferencesSaved: { judgeEndpointId: Schema.String, token: Schema.Number },
  BenchmarkPreferencesSaveFailed: { message: Schema.String, token: Schema.Number },
  BenchmarkRunStarted: { runId: Schema.String, token: Schema.Number },
  BenchmarkRunStartFailed: { message: Schema.String, token: Schema.Number },
  BenchmarkRunPollRequested: { runId: Schema.String, token: Schema.Number },
  BenchmarkRunPolled: { progressJson: Schema.String, token: Schema.Number },
  BenchmarkRunPollFailed: { message: Schema.String, token: Schema.Number },
  BenchmarkTaxonomyFilterChanged: { filter: Schema.String, value: Schema.String },
  ModelsRemoveRequested: { modelId: Schema.String },
  ModelsControllerSetRequested: { modelId: Schema.String },
  ModelsControllerEjectRequested: { modelId: Schema.String },
  ModelsActionSucceeded: { message: Schema.String, token: Schema.Number },
  ModelsActionFailed: { message: Schema.String, token: Schema.Number },
  RequestsRangeChanged: { value: Schema.String },
  RequestsFilterChanged: { field: RequestsFilterFieldSchema, value: Schema.String },
  RequestsAdvancedToggled: {},
  ObserveRangeChanged: { value: Schema.String },
  ObserveFilterChanged: { field: ObserveFilterFieldSchema, value: Schema.String },
  ObserveAdvancedToggled: {},
  LocalPeerUrlChanged: { value: Schema.String },
  LocalPeerTokenChanged: { value: Schema.String },
  LocalPeerAddRequested: {},
  LocalPeerHealthRequested: { peerId: Schema.String },
  LocalPeerRemoveRequested: { peerId: Schema.String },
  SystemExtensionsPauseRequested: { extensionId: Schema.String },
  SystemExtensionsDownloadRequested: {},
  SystemExtensionsActionSucceeded: { message: Schema.String, token: Schema.Number },
  SystemExtensionsActionFailed: { message: Schema.String, token: Schema.Number },
  SystemOperatorTraceRootChanged: { value: Schema.String },
  SystemOperatorReplayCountChanged: { value: Schema.String },
  SystemOperatorLoadRequested: {},
  SystemOperatorCreateReplayRequested: {},
  SystemOperatorActionSucceeded: { message: Schema.String, token: Schema.Number },
  SystemOperatorActionFailed: { message: Schema.String, token: Schema.Number },
  LocalLlamaSwapModelIdChanged: { value: Schema.String },
  LocalLlamaSwapModelLoadRequested: {},
  LocalLlamaSwapAllRolesRequested: {},
  LocalLlamaSwapActionSucceeded: { message: Schema.String, token: Schema.Number },
  LocalLlamaSwapActionFailed: { message: Schema.String, token: Schema.Number },
  LocalPeerModelIdChanged: { value: Schema.String },
  LocalPeerModelLoadRequested: {},
  LocalPeerModelActionSucceeded: { message: Schema.String, token: Schema.Number },
  LocalPeerModelActionFailed: { message: Schema.String, token: Schema.Number },
  LocalPeersActionSucceeded: { message: Schema.String, token: Schema.Number },
  LocalPeersActionFailed: { message: Schema.String, token: Schema.Number },
  LocalLogsAutoRefreshToggled: { value: Schema.Boolean },
  ObserveLogsSourceChanged: { value: Schema.String },
  ObservabilityRefreshRequested: {},
  StoreReceiptsRefreshRequested: {},
  LearningLadderToggleRequested: { rolledBack: Schema.Boolean, roleId: Schema.String, taskTypeId: Schema.String },
  LearningLadderUpdated: { rolledBack: Schema.Boolean, roleId: Schema.String, scopeId: Schema.String, taskTypeId: Schema.String, token: Schema.Number },
  LearningLadderFailed: { message: Schema.String, roleId: Schema.String, scopeId: Schema.String, taskTypeId: Schema.String, token: Schema.Number },
  LearningOperatorTokenChanged: { value: Schema.String },
  LearningDecisionFilterChanged: { filter: Schema.String, value: Schema.String },
  LearningPackRollbackRequested: {},
  LearningPackRollbackSucceeded: { token: Schema.Number },
  LearningPackRollbackFailed: { message: Schema.String, token: Schema.Number },
  LearningKillSwitchRequested: { engaged: Schema.Boolean },
  LearningKillSwitchSucceeded: { token: Schema.Number },
  LearningKillSwitchFailed: { message: Schema.String, token: Schema.Number },
  LocalPolicyAutoUnloadToggled: {},
  LocalPolicyMaxConcurrencyChanged: { value: Schema.Number },
  LocalPolicyResetRequested: {},
  LocalPolicySaveFailed: { message: Schema.String, token: Schema.Number },
  LocalPolicySaveRequested: {},
  LocalPolicySaved: { policy: Schema.String, token: Schema.Number },
  LocalPolicyTtlChanged: { value: Schema.Number },
  ChartPointShown: { label: Schema.String, seriesId: Schema.String, token: Schema.Number },
  ChartTooltipDismissed: { token: Schema.Number },
  ChartSeriesToggled: { seriesId: Schema.String, token: Schema.Number },
  EndpointAdmissionFieldChanged: { field: EndpointAdmissionFieldSchema, value: Schema.String },
  EndpointAdmissionModelAdded: {},
  EndpointAdmissionModelRemoved: { modelId: Schema.String },
  EndpointAdmissionSubmitRequested: {},
  EndpointAdmissionResetRequested: {},
  EndpointAdmissionSucceeded: { activationId: Schema.String, generation: Schema.Number },
  EndpointAdmissionFailed: { activationId: Schema.String, generation: Schema.Number, message: Schema.String },
  RetentionSizeChanged: { value: Schema.String },
  RetentionAgeChanged: { value: Schema.String },
  LearningModeSelectChanged: { mode: Schema.String },
  LearningModeUpdateRequested: { mode: Schema.String },
  LearningRollbackRequested: {},
  LearningModeSucceeded: { token: Schema.Number },
  LearningModeFailed: { message: Schema.String, token: Schema.Number },
  RetentionPolicySaveRequested: { maxAgeDays: Schema.Number, maxSizeGb: Schema.Number },
  RetentionDryRunRequested: {},
  RetentionExecuteRequested: {},
  RetentionSucceeded: { manifestHash: Schema.optional(Schema.String), token: Schema.Number },
  RetentionFailed: { message: Schema.String, token: Schema.Number },
  LocalLogsRefreshRequested: {},
  RouterPostureFieldChanged: { field: RouterPostureFieldSchema, value: Schema.String },
  RouterBlockChanged: { block: RouterBlockSchema, value: Schema.String },
  RouterEntryFieldChanged: { field: RouterEntryFieldSchema, value: Schema.String },
  RouterPostureSaveRequested: {},
  RouterBlockSaveRequested: { block: Schema.Literals(["agent_strategies", "workloads"]) },
  RouterPostureSaved: { token: Schema.Number },
  RouterPostureFailed: { message: Schema.String, token: Schema.Number },
  RouterPostureResetRequested: {},
  ProviderAccountFieldChanged: { field: ProviderAccountFieldSchema, value: Schema.String },
  ProviderAccountSelectionChanged: { providerId: Schema.String, variantId: Schema.String },
  ProviderAccountModelChosen: { modelId: Schema.String },
  ProviderAccountModelAdded: {},
  ProviderAccountModelRemoved: { modelId: Schema.String },
  ProviderAccountCreateRequested: {},
  ProviderAccountCreateSucceeded: { token: Schema.Number },
  ProviderAccountEndpointsActivated: { token: Schema.Number },
  ProviderAccountUpdateKeyRequested: {},
  ProviderAccountKeyUpdated: { token: Schema.Number },
  ProviderAccountModelDeleteRequested: { modelId: Schema.String },
  ProviderAccountModelDeleted: { modelId: Schema.String, token: Schema.Number },
  ProviderAccountFailed: { message: Schema.String, token: Schema.Number },
  ReadbackFailed: { key: ReadbackKeySchema, message: Schema.String, token: Schema.Number },
  ReadbackLoaded: { key: ReadbackKeySchema, snapshot: ReadbackState, token: Schema.Number },
  StudioTabSelected: { tab: StudioTabSchema },
  StudioTabKey: { key: Schema.String },
  StudioFieldChanged: { field: StudioFieldSchema, value: Schema.String },
  StudioLoaded: { responseText: Schema.String, statusCode: Schema.Number, tab: StudioTabSchema, token: Schema.Number },
  StudioFailed: { message: Schema.String, statusCode: Schema.Number, responseText: Schema.String, token: Schema.Number },
  StudioRunRequested: { token: Schema.Number },
  SelectedOverviewWindow: { windowMs: Schema.Number },
  OverviewFilterChanged: { filter: Schema.String, value: Schema.String },
  RefreshResynced: { routeId: Schema.String, snapshot: DiagnosticsSnapshot, token: Schema.Number },
  RefreshResyncFailed: { message: Schema.String, routeId: Schema.String, token: Schema.Number },
  RuntimeConfigLoadRequested: {},
  RuntimeConfigTextChanged: { text: Schema.String },
  RuntimeConfigSaveRequested: {},
  RuntimeConfigConfirmRequested: { token: Schema.Number },
  RuntimeConfigSaved: { recordJson: Schema.String, status: Schema.Number, token: Schema.Number },
  RuntimeConfigSaveFailed: { message: Schema.String, status: Schema.Number, token: Schema.Number },
  RuntimeRevisionReceived: { revision: Schema.Number },
  RuntimeTelemetryReceived: { emittedAtMs: Schema.Number, requestId: Schema.String },
  RuntimePageRestored: {},
  ThemeApplied: {},
  ToggledTheme: {},
});
export type Message = typeof Message.Type;
