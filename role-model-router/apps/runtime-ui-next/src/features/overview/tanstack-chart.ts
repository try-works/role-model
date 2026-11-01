import { barY, defineChart, lineY, createChartScene, renderChartSvg } from "@tanstack/charts";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scalePoint } from "@tanstack/charts/scales/point";

import type { ChartSeries } from "@role-model/ui/foldkit-chart";

/**
 * R9/R10: TanStack Charts is the chart engine. The Foldkit view still owns the Html surface
 * (card shell, data attributes, accessible table); this adapter only renders the responsive
 * static SVG that the surface embeds, so the page can be server-rendered without a client mount.
 */
export type TanstackChartKind = "area" | "bar" | "line";
export interface TanstackChartOptions {
  readonly ariaLabel: string;
  readonly height: number;
  readonly kind?: TanstackChartKind;
  readonly width: number;
}

interface TanstackRow {
  readonly label: string;
  readonly series: string;
  readonly value: number | null;
}

export const tanstackChartSvg = (
  series: ReadonlyArray<ChartSeries>,
  options: TanstackChartOptions,
): string => {
  const rows: TanstackRow[] = series.flatMap((entry) =>
    entry.points.map((point) => ({ label: point.label, series: entry.id, value: point.value })),
  );
  const hasPoints = rows.some((row) => row.value !== null);
  const svg = (() => {
    if (!hasPoints) {
      return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' +
        options.ariaLabel.replaceAll('"', "&quot;") +
        '" viewBox="0 0 ' +
        String(options.width) +
        " " +
        String(options.height) +
        '" data-chart-part="chart" data-chart-series-count="0"></svg>';
    }
    const kind = options.kind ?? "line";
    const definition = defineChart({
      ariaLabel: options.ariaLabel,
      marks: [
        kind === "bar"
          ? barY(rows, { x: "label", y: "value", z: "series" })
          : lineY(rows, {
              strokeWidth: 2,
              x: "label",
              y: "value",
              z: "series",
            }),
      ],
      scales: {
        x: { scale: () => scalePoint() },
        y: { grid: true, nice: true, scale: scaleLinear },
      },
    });
    const scene = createChartScene(definition, { height: options.height, width: options.width });
    return renderChartSvg(scene, { ariaLabel: options.ariaLabel });
  })();
  // One a11y model: a non-interactive img plus the visible numeric table. TanStack marks the root
  // tabindex=0 for its interaction runtime, which this static server-rendered surface does not own.
  const withoutTabindex = svg.replace(' tabindex="0"', "");
  return withoutTabindex.replace(
    "<svg ",
    '<svg data-chart-part="chart" data-chart-series-count="' +
      String(series.length) +
      '" ',
  );
};
