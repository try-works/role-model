import type { ChartSeries } from "./foldkit-chart.js";

/**
 * Run 115 S13e (R9): the pure interaction/range model beside the pure SVG chart.
 *
 * A chart instance owns this state. Range switching issues a monotonic token; a response whose
 * token is no longer current is ignored, so an old range resolved last can never overwrite the
 * new chart. No global ids or module state are used, so two charts on one page are independent.
 */

export interface ChartTooltip {
  readonly seriesId: string;
  readonly label: string;
}

export interface ChartInteractionState {
  /** The latest range request token; monotonic within this chart only. */
  readonly requestToken: number;
  readonly range: string;
  /** The rendered series; an obsolete response never replaces this. */
  readonly series: ReadonlyArray<ChartSeries>;
  readonly hiddenSeriesIds: ReadonlyArray<string>;
  readonly tooltip: ChartTooltip | null;
  readonly pendingRange: string | null;
}

export interface ChartRangeResult {
  readonly token: number;
  readonly range: string;
  readonly series: ReadonlyArray<ChartSeries>;
}

export interface ChartRangeCommand {
  readonly type: "LoadChartRange";
  readonly token: number;
  readonly range: string;
}

export type ChartInteractionMessage =
  | { readonly type: "ToggleSeries"; readonly seriesId: string }
  | { readonly type: "ShowPoint"; readonly seriesId: string; readonly label: string }
  | { readonly type: "HideTooltip" }
  | { readonly type: "SwitchRange"; readonly range: string }
  | ({ readonly type: "RangeLoaded" } & ChartRangeResult);

export interface ChartInteractionResult {
  readonly state: ChartInteractionState;
  readonly command?: ChartRangeCommand;
}

export function initialChartInteraction(input: {
  readonly range: string;
  readonly series: ReadonlyArray<ChartSeries>;
}): ChartInteractionState {
  return {
    hiddenSeriesIds: [],
    pendingRange: null,
    range: input.range,
    requestToken: 0,
    series: input.series,
    tooltip: null,
  };
}

export function updateChartInteraction(
  state: ChartInteractionState,
  message: ChartInteractionMessage,
): ChartInteractionResult {
  switch (message.type) {
    case "ToggleSeries": {
      const hidden = state.hiddenSeriesIds.includes(message.seriesId);
      return {
        state: {
          ...state,
          hiddenSeriesIds: hidden
            ? state.hiddenSeriesIds.filter((id) => id !== message.seriesId)
            : [...state.hiddenSeriesIds, message.seriesId],
        },
      };
    }
    case "ShowPoint":
      return { state: { ...state, tooltip: { label: message.label, seriesId: message.seriesId } } };
    case "HideTooltip":
      return { state: { ...state, tooltip: null } };
    case "SwitchRange": {
      const token = state.requestToken + 1;
      return {
        command: { range: message.range, token, type: "LoadChartRange" },
        state: { ...state, pendingRange: message.range, requestToken: token },
      };
    }
    case "RangeLoaded": {
      // Obsolete-work suppression: only the newest token may change the rendered series.
      if (message.token !== state.requestToken) {
        return { state };
      }
      return {
        state: {
          ...state,
          pendingRange: null,
          range: message.range,
          series: message.series,
        },
      };
    }
  }
}
