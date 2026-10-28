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
import { EndpointAdmissionFieldSchema } from "./endpoint-admission";
import { ProviderAccountFieldSchema } from "./provider-account";
import { StudioFieldSchema, StudioTabSchema } from "./studio";

type EmptyFields = Record<never, never>;

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
  readonly DeviceAuthModelAdded: EmptyFields;
  readonly DeviceAuthModelRemoved: { readonly modelId: typeof Schema.String };
  readonly DeviceAuthStartRequested: EmptyFields;
  readonly DeviceAuthSessionsLoaded: { readonly sessions: typeof DeviceAuthSessionsSchema; readonly token: typeof Schema.Number };
  readonly DeviceAuthStarted: { readonly session: typeof DeviceAuthSessionSchema; readonly token: typeof Schema.Number };
  readonly DeviceAuthPolled: { readonly session: typeof DeviceAuthSessionSchema; readonly token: typeof Schema.Number };
  readonly DeviceAuthFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly DeviceAuthRetryRequested: EmptyFields;
  readonly DeviceAuthCancelled: EmptyFields;
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
  readonly LearningLadderToggleRequested: { readonly rolledBack: typeof Schema.Boolean; readonly roleId: typeof Schema.String; readonly taskTypeId: typeof Schema.String };
  readonly LearningLadderUpdated: { readonly rolledBack: typeof Schema.Boolean; readonly roleId: typeof Schema.String; readonly taskTypeId: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly LearningLadderFailed: { readonly message: typeof Schema.String; readonly roleId: typeof Schema.String; readonly taskTypeId: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly ChartPointShown: { readonly label: typeof Schema.String; readonly seriesId: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly ChartTooltipDismissed: { readonly token: typeof Schema.Number };
  readonly ChartSeriesToggled: { readonly seriesId: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly EndpointAdmissionFieldChanged: { readonly field: typeof EndpointAdmissionFieldSchema; readonly value: typeof Schema.String };
  readonly EndpointAdmissionModelAdded: EmptyFields;
  readonly EndpointAdmissionModelRemoved: { readonly modelId: typeof Schema.String };
  readonly EndpointAdmissionSubmitRequested: EmptyFields;
  readonly EndpointAdmissionSucceeded: { readonly token: typeof Schema.Number };
  readonly EndpointAdmissionFailed: { readonly message: typeof Schema.String; readonly token: typeof Schema.Number };
  readonly ProviderAccountFieldChanged: { readonly field: typeof ProviderAccountFieldSchema; readonly value: typeof Schema.String };
  readonly ProviderAccountModelAdded: EmptyFields;
  readonly ProviderAccountModelRemoved: { readonly modelId: typeof Schema.String };
  readonly ProviderAccountCreateRequested: EmptyFields;
  readonly ProviderAccountCreateSucceeded: { readonly token: typeof Schema.Number };
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
  DeviceAuthModelAdded: {},
  DeviceAuthModelRemoved: { modelId: Schema.String },
  DeviceAuthStartRequested: {},
  DeviceAuthSessionsLoaded: { sessions: DeviceAuthSessionsSchema, token: Schema.Number },
  DeviceAuthStarted: { session: DeviceAuthSessionSchema, token: Schema.Number },
  DeviceAuthPolled: { session: DeviceAuthSessionSchema, token: Schema.Number },
  DeviceAuthFailed: { message: Schema.String, token: Schema.Number },
  DeviceAuthRetryRequested: {},
  DeviceAuthCancelled: {},
  DeviceAuthActivated: { token: Schema.Number },
  DiagnosticsFailed: { id: Schema.String, message: Schema.String },
  DiagnosticsLoaded: { id: Schema.String, snapshot: DiagnosticsSnapshot },
  DiagnosticsRefreshRequested: {},
  NavigationCompleted: {},
  ObservabilityFailed: { message: Schema.String, token: Schema.Number },
  ObservabilityLoaded: { snapshot: ObservabilityState, token: Schema.Number },
  LearningLadderToggleRequested: { rolledBack: Schema.Boolean, roleId: Schema.String, taskTypeId: Schema.String },
  LearningLadderUpdated: { rolledBack: Schema.Boolean, roleId: Schema.String, taskTypeId: Schema.String, token: Schema.Number },
  LearningLadderFailed: { message: Schema.String, roleId: Schema.String, taskTypeId: Schema.String, token: Schema.Number },
  ChartPointShown: { label: Schema.String, seriesId: Schema.String, token: Schema.Number },
  ChartTooltipDismissed: { token: Schema.Number },
  ChartSeriesToggled: { seriesId: Schema.String, token: Schema.Number },
  EndpointAdmissionFieldChanged: { field: EndpointAdmissionFieldSchema, value: Schema.String },
  EndpointAdmissionModelAdded: {},
  EndpointAdmissionModelRemoved: { modelId: Schema.String },
  EndpointAdmissionSubmitRequested: {},
  EndpointAdmissionSucceeded: { token: Schema.Number },
  EndpointAdmissionFailed: { message: Schema.String, token: Schema.Number },
  ProviderAccountFieldChanged: { field: ProviderAccountFieldSchema, value: Schema.String },
  ProviderAccountModelAdded: {},
  ProviderAccountModelRemoved: { modelId: Schema.String },
  ProviderAccountCreateRequested: {},
  ProviderAccountCreateSucceeded: { token: Schema.Number },
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
