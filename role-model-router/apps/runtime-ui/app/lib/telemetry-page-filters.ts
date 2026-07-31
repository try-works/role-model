import { telemetryTimeRangeOptions } from "./telemetry-chart-config";
import type { TelemetryTimeRangeValue } from "./telemetry-route-models";

/** Kit PageFilters uses `90d`; telemetry APIs use `quarter`. */
export type PageTimeRangeValue = "day" | "week" | "month" | "90d";

export const observePageTimeRangeOptions = telemetryTimeRangeOptions.map((option) => ({
  label: option.label,
  value: (option.value === "quarter" ? "90d" : option.value) as PageTimeRangeValue,
}));

export function toPageTimeRange(value: TelemetryTimeRangeValue): PageTimeRangeValue {
  return value === "quarter" ? "90d" : value;
}

export function fromPageTimeRange(value: string): TelemetryTimeRangeValue {
  return value === "90d" ? "quarter" : (value as TelemetryTimeRangeValue);
}
