import { Navigation, Url } from "@role-model-router/foldkit";
import type { MessageUnion } from "@role-model-router/foldkit/message";
import { defineMessageUnion } from "@role-model-router/foldkit/message";
import { Schema } from "effect";

import { DiagnosticsSnapshot } from "./diagnostics";
import { ObservabilityState } from "./observability";
import { ReadbackKeySchema, ReadbackState } from "./readback";

type EmptyFields = Record<never, never>;

export const Message: MessageUnion<{
  readonly ChangedUrl: { readonly url: typeof Url.Url };
  readonly Clicked: EmptyFields;
  readonly ClickedLink: { readonly request: typeof Navigation.UrlRequest };
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
  readonly RuntimeRevisionReceived: { readonly revision: typeof Schema.Number };
  readonly ThemeApplied: EmptyFields;
  readonly ToggledTheme: EmptyFields;
}> = defineMessageUnion({
  ChangedUrl: { url: Url.Url },
  Clicked: {},
  ClickedLink: { request: Navigation.UrlRequest },
  DiagnosticsFailed: { id: Schema.String, message: Schema.String },
  DiagnosticsLoaded: { id: Schema.String, snapshot: DiagnosticsSnapshot },
  DiagnosticsRefreshRequested: {},
  NavigationCompleted: {},
  ObservabilityFailed: { message: Schema.String, token: Schema.Number },
  ObservabilityLoaded: { snapshot: ObservabilityState, token: Schema.Number },
  ReadbackFailed: { key: ReadbackKeySchema, message: Schema.String, token: Schema.Number },
  ReadbackLoaded: { key: ReadbackKeySchema, snapshot: ReadbackState, token: Schema.Number },
  RefreshResynced: { routeId: Schema.String, snapshot: DiagnosticsSnapshot, token: Schema.Number },
  RefreshResyncFailed: { message: Schema.String, routeId: Schema.String, token: Schema.Number },
  RuntimeRevisionReceived: { revision: Schema.Number },
  ThemeApplied: {},
  ToggledTheme: {},
});
export type Message = typeof Message.Type;
