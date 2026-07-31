import * as React from "react";

import { cn } from "./lib/utils";

const ChartGridChromeContext = React.createContext<"standalone" | "cell">("standalone");

/** Charts inside `ChartGrid` default to cell chrome (no per-card border/radius). */
function useChartGridChrome(): "standalone" | "cell" {
  return React.useContext(ChartGridChromeContext);
}

/**
 * Shared-border page chart stack — outer shell + 1px hairlines between cells.
 * Prefer this over gapped standalone ChartCards on overview / Observe chart pages.
 */
function ChartGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <ChartGridChromeContext.Provider value="cell">
      <div
        data-slot="chart-grid"
        className={cn(
          "grid w-full grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2",
          className,
        )}
        {...props}
      />
    </ChartGridChromeContext.Provider>
  );
}

export type ChartGridCellProps = React.ComponentProps<"div"> & {
  /** 12-col span: full row (12) or half (6). */
  span?: 6 | 12;
};

function ChartGridCell({ span = 12, className, ...props }: ChartGridCellProps) {
  return (
    <div
      data-slot="chart-grid-cell"
      data-span={span}
      className={cn(
        "min-w-0 bg-card",
        span === 12 ? "col-span-1 md:col-span-2" : "col-span-1",
        className,
      )}
      {...props}
    />
  );
}

export { ChartGrid, ChartGridCell, useChartGridChrome, ChartGridChromeContext };
