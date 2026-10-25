import { Schema } from "effect";

import { ControlsState } from "./control";
import { DiagnosticsSnapshot } from "./diagnostics";
import { ObservabilityState } from "./observability";
import { ReadbacksState } from "./readback";
import { RuntimeRefreshState } from "./refresh";
import { StudioState } from "./studio";
import { AppRoute } from "./route";

const modelFields = {
  clicks: Schema.Number,
  controls: ControlsState,
  diagnostics: DiagnosticsSnapshot,
  observability: ObservabilityState,
  overviewFilters: Schema.optional(Schema.Struct({ breakdown: Schema.Literals(["all", "endpoint", "model", "provider"]), breakdownValue: Schema.String, difficulty: Schema.Literals(["all", "easy", "medium", "hard"]), source: Schema.Literals(["all", "local", "remote"]), status: Schema.Literals(["all", "success", "failure", "unknown"]) })),
  runtimeConfigEditor: Schema.optional(Schema.Struct({ diff: Schema.Array(Schema.String), message: Schema.optional(Schema.String), notice: Schema.optional(Schema.String), originalText: Schema.String, status: Schema.Literals(["not-loaded", "loading", "editing", "confirming", "invalid", "pending", "saved", "error"]), text: Schema.String, token: Schema.Number })),
  overviewWindowMs: Schema.optional(Schema.Number),
  readbacks: ReadbacksState,
  refresh: RuntimeRefreshState,
  route: AppRoute,
  studio: Schema.optional(StudioState),
  theme: Schema.Literals(["light", "dark"]),
};

export const Model: Schema.Struct<typeof modelFields> = Schema.Struct(modelFields);
export type Model = typeof Model.Type;
