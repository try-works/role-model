import type { ChartState } from "@role-model/ui/foldkit-chart";
import { Schema } from "effect";

import type { ReadbackState } from "./readback";

/** S408: route-scoped chart interaction state for the Overview token card. */
export const ChartTooltipSchema = Schema.Struct({
  label: Schema.String,
  seriesId: Schema.String,
});
export type ChartTooltipState = typeof ChartTooltipSchema.Type;

export const ChartInteractionStateSchema = Schema.Struct({
  hiddenSeriesIds: Schema.Array(Schema.String),
  routeTag: Schema.String,
  token: Schema.Number,
  tooltip: Schema.NullOr(ChartTooltipSchema),
});
export type ChartInteractionState = typeof ChartInteractionStateSchema.Type;

export const emptyChartInteraction = (routeTag: string, token = 0): ChartInteractionState => ({
  hiddenSeriesIds: [],
  routeTag,
  token,
  tooltip: null,
});

/** Route changes bump the token and clear the tooltip, so a late message cannot repaint it. */
export const chartInteractionForRoute = (
  state: ChartInteractionState | undefined,
  routeTag: string,
): ChartInteractionState =>
  state !== undefined && state.routeTag === routeTag
    ? state
    : emptyChartInteraction(routeTag, (state?.token ?? 0) + 1);

export const showChartPoint = (
  state: ChartInteractionState,
  token: number,
  seriesId: string,
  label: string,
): ChartInteractionState =>
  token === state.token ? { ...state, tooltip: { label, seriesId } } : state;

export const hideChartTooltip = (
  state: ChartInteractionState,
  token: number,
): ChartInteractionState => (token === state.token ? { ...state, tooltip: null } : state);

export const toggleChartSeries = (
  state: ChartInteractionState,
  token: number,
  seriesId: string,
): ChartInteractionState => {
  if (token !== state.token) return state;
  const hidden = state.hiddenSeriesIds.includes(seriesId);
  return {
    ...state,
    hiddenSeriesIds: hidden
      ? state.hiddenSeriesIds.filter((id) => id !== seriesId)
      : [...state.hiddenSeriesIds, seriesId],
  };
};

/** Honest status for the token chart: the readback state decides the chart state. */
export const chartStateForReadback = (state: ReadbackState): ChartState => {
  if (state.status === "idle" || state.status === "loading") return { status: "loading" };
  if (state.status === "error") {
    return { reason: state.message ?? "Overview telemetry read failed.", status: "error" };
  }
  if (state.status === "empty") return { status: "empty" };
  return { status: "ready" };
};
