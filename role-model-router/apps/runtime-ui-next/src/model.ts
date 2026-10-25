import { Schema } from "effect";

import { DiagnosticsSnapshot } from "./diagnostics";
import { ObservabilityState } from "./observability";
import { ReadbacksState } from "./readback";
import { RuntimeRefreshState } from "./refresh";
import { AppRoute } from "./route";

const modelFields = {
  clicks: Schema.Number,
  diagnostics: DiagnosticsSnapshot,
  observability: ObservabilityState,
  readbacks: ReadbacksState,
  refresh: RuntimeRefreshState,
  route: AppRoute,
  theme: Schema.Literals(["light", "dark"]),
};

export const Model: Schema.Struct<typeof modelFields> = Schema.Struct(modelFields);
export type Model = typeof Model.Type;
