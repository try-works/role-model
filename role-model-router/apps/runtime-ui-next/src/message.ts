import { Navigation, Url } from "@role-model-router/foldkit";
import type { MessageUnion } from "@role-model-router/foldkit/message";
import { defineMessageUnion } from "@role-model-router/foldkit/message";
import { Schema } from "effect";

import { ControlKeySchema, ControlState } from "./control";
import { DiagnosticsSnapshot } from "./diagnostics";
import { ObservabilityState } from "./observability";
import { ReadbackKeySchema, ReadbackState } from "./readback";
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
  DiagnosticsFailed: { id: Schema.String, message: Schema.String },
  DiagnosticsLoaded: { id: Schema.String, snapshot: DiagnosticsSnapshot },
  DiagnosticsRefreshRequested: {},
  NavigationCompleted: {},
  ObservabilityFailed: { message: Schema.String, token: Schema.Number },
  ObservabilityLoaded: { snapshot: ObservabilityState, token: Schema.Number },
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
  ThemeApplied: {},
  ToggledTheme: {},
});
export type Message = typeof Message.Type;
