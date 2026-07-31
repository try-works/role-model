import * as React from "react";

import { useChartGridChrome } from "./chart-grid";
import { cn } from "./lib/utils";

export type ChartCardChrome = "standalone" | "cell";

export type ChartCardProps = React.ComponentProps<"div"> & {
  /**
   * `standalone` — rounded bordered card (default outside grids).
   * `cell` — no outer border/radius (inside `ChartGrid`).
   * Omit to inherit from surrounding `ChartGrid` context.
   */
  chrome?: ChartCardChrome;
};

/** Shared ChartCard shell — Header → plot → legend (RM3 rule #5). */
function ChartCard({ className, chrome, ...props }: ChartCardProps) {
  const gridChrome = useChartGridChrome();
  const resolved = chrome ?? gridChrome;

  return (
    <div
      data-slot="chart-card"
      data-chrome={resolved}
      className={cn(
        "flex h-auto w-full flex-col gap-3 bg-card p-4 text-card-foreground",
        resolved === "standalone" && "rounded-lg border border-border",
        className,
      )}
      {...props}
    />
  );
}

function ChartCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chart-card-header"
      className={cn(
        "-mx-4 flex flex-col gap-1 border-b border-border px-4 pb-3",
        className,
      )}
      {...props}
    />
  );
}

/** Sentence-case chart titles only (RM3 rule #1). */
function ChartCardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chart-card-title"
      className={cn("text-sm font-medium leading-5 tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

function ChartCardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chart-card-description"
      className={cn("text-xs leading-4 text-muted-foreground", className)}
      {...props}
    />
  );
}

/** Plot host: fills card width between optional Y gutters. */
function ChartCardPlot({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chart-card-plot"
      className={cn("relative w-full min-w-0", className)}
      {...props}
    />
  );
}

export type ChartLegendItem = {
  key: string;
  label: React.ReactNode;
  color: string;
};

/** Left-aligned with plot/X-axis (matches YAxis width={40}). RM3 rule #2. */
function ChartCardLegend({
  items,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  items: ChartLegendItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      data-slot="chart-card-legend"
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 pl-10", className)}
      {...props}
    >
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-1.5">
          <span
            className="size-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span className="font-mono text-[11px] leading-4 text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export {
  ChartCard,
  ChartCardHeader,
  ChartCardTitle,
  ChartCardDescription,
  ChartCardPlot,
  ChartCardLegend,
};
