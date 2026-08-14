import { ChartCard, ChartCardDescription, ChartCardHeader, ChartCardTitle } from "@role-model/ui";

import { chartEmptyStateClassName, chartErrorStateClassName } from "../lib/design-system";

export type ChartKitBlockStatus =
  | "loading"
  | "empty"
  | "unsupported"
  | "error"
  | "partial"
  | "truncated"
  | "populated";

/**
 * Shared RM3 chart empty / unsupported / error body for overview + Observe.
 * Empty and unsupported use dashed muted panels — never warning amber.
 */
export function ChartKitStatePanel({
  title,
  description,
  status,
  statusMessage,
}: {
  readonly title: string;
  readonly description?: string;
  readonly status: ChartKitBlockStatus;
  readonly statusMessage?: string;
}) {
  const message =
    statusMessage ??
    (status === "loading"
      ? "Loading chart data."
      : status === "empty" || status === "unsupported"
        ? "No telemetry rows match the current filters."
        : "Telemetry analytics could not be loaded.");

  const toneClass = status === "error" ? chartErrorStateClassName : chartEmptyStateClassName;

  return (
    <ChartCard chrome="cell">
      <ChartCardHeader>
        <ChartCardTitle>{title}</ChartCardTitle>
        {description ? <ChartCardDescription>{description}</ChartCardDescription> : null}
      </ChartCardHeader>
      <div className={toneClass}>{message}</div>
    </ChartCard>
  );
}
