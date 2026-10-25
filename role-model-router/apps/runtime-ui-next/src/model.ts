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
  overviewWindowMs: Schema.optional(Schema.Number),
  readbacks: ReadbacksState,
  refresh: RuntimeRefreshState,
  route: AppRoute,
  studio: Schema.optional(StudioState),
  theme: Schema.Literals(["light", "dark"]),
};

export const Model: Schema.Struct<typeof modelFields> = Schema.Struct(modelFields);
export type Model = typeof Model.Type;
