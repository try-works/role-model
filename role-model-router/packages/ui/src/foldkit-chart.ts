import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { ChartTooltip } from "./foldkit-chart-interaction.js";

/**
 * Run 115 S13b/S13c (R9/R10 partial): a React-free, renderer-agnostic chart primitive with an
 * explicit state model.
 *
 * Render policy (deterministic by construction): `view(config, h)` is a pure function of
 * `(series, state)`. It never reads a clock, never calls Math.random/crypto.randomUUID, never
 * allocates ids, and never mutates its config. Staleness is computed only from the caller-supplied
 * `ageMs`/`ruleMs`, and truncation is displayed from the caller-supplied `droppedPoints` count.
 * The same config therefore produces the same VNode tree on every call (the Scene test serializes
 * two renders and compares them, and asserts no id attribute appears).
 *
 * State distinction (each renders a different data-chart-status and different content):
 * - loading: live status message, aria-busy, no chart/table.
 * - error: role=alert with a bounded single-line reason, no chart/table.
 * - empty: explicit "No chart data available." (also produced by ready + no series).
 * - stale: chart stays, plus a visible notice carrying the caller's age and rule.
 * - truncated: chart stays, plus a visible notice carrying the shown-of-total and dropped counts;
 *   the accessible table caption also states the truncation, so points are never silently lost.
 * - ready: the chart and its SVG/table.
 *
 * Series alignment: the table rows and the SVG x-axis are built from an ordered union of every
 * series' labels (first appearance wins; series order, then point order). Each value is looked up by
 * its own series' label, so ragged series keep every point and equal-length series with different
 * labels cannot put one series' value under another series' label. A duplicate label inside one
 * series keeps its first value (it shares one union position; later duplicates are not tabulated).
 *
 * Documented empty-state collapse: usable points are points with points.length > 0; a ready render
 * whose series are all empty (or absent) normalizes to the empty state, drops the SVG, the notices
 * and the legend, and renders "No chart data available." This is intentional: an axis-less empty
 * chart is worse than an explicit empty state. It is frozen by the Scene test.
 *
 * It follows the vendored Crease pure-SVG helpers rather than its ECharts runtime: the SVG shape,
 * role=img and aria-label pattern (vendor/crease/src/ui/chart.ts:193-253) and the accessible HTML
 * alternative beside the renderer (vendor/crease/src/lib/echarts.ts:604-610).
 *
 * No React import, no ECharts import, no canvas, no Mount. The mount-based lazy renderer is R10.
 * Tokens: axes/grid --rm-border, labels --rm-secondary, series --color-chart-N (app.css aliases of
 * --rm-chart-*).
 */

export const CHART_WIDTH = 640;
export const CHART_HEIGHT = 220;
export const CHART_REASON_MAX_LENGTH = 160;
const CHART_LEFT = 56;
const CHART_RIGHT = 16;
const CHART_TOP = 16;
const CHART_BOTTOM = 36;
const MAX_X_LABELS = 8;

export const CHART_SERIES_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
  "var(--color-chart-7)",
  "var(--color-chart-8)",
] as const;

export const chartSeriesColor = (index: number): string =>
  CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length] ?? CHART_SERIES_COLORS[0];

export interface ChartPoint {
  readonly label: string;
  readonly value: number;
}

export interface ChartSeries {
  readonly id: string;
  readonly label: string;
  readonly points: ReadonlyArray<ChartPoint>;
  /** Optional CSS colour; defaults to the nth --color-chart-N token. */
  readonly color?: string;
}

export type ChartStatus = "ready" | "loading" | "empty" | "error" | "stale" | "truncated";

/**
 * The state around the series. Optional on the config (defaults to { status: "ready" }); callers
 * own the clock and the truncation accounting, the renderer only displays them.
 */
export type ChartState =
  | { readonly status: "ready" }
  | { readonly status: "loading" }
  | { readonly status: "empty" }
  | { readonly status: "error"; readonly reason: string }
  | { readonly status: "stale"; readonly ageMs: number; readonly ruleMs: number }
  | { readonly status: "truncated"; readonly droppedPoints: number };

export interface Rm3ChartInteraction<Message> {
  /** Series hidden through the legend. The chart and accessible table both omit them. */
  readonly hiddenSeriesIds?: ReadonlyArray<string>;
  /** The selected point; renders its exact value/unit tooltip. */
  readonly tooltip?: ChartTooltip | null;
  readonly onToggleSeries?: (seriesId: string) => Message;
  readonly onShowPoint?: (seriesId: string, label: string) => Message;
  readonly onHideTooltip?: Message;
}

export interface Rm3ChartConfig<Message = never> {
  readonly title: string;
  readonly description?: string;
  readonly ariaLabel?: string;
  readonly series: ReadonlyArray<ChartSeries>;
  readonly yUnit?: string;
  readonly height?: number;
  readonly state?: ChartState;
  /** Theme-dependent class only; series identity and point count do not change. */
  readonly theme?: "light" | "dark";
  readonly interaction?: Rm3ChartInteraction<Message>;
}

const finite = (value: number): number => (Number.isFinite(value) ? value : 0);

const formatValue = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
};

/** Single line, bounded, and empty-safe. The renderer never interpolates an unbounded reason. */
export const boundedChartReason = (reason: string): string => {
  const withoutControls = Array.from(reason)
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 32 || code === 127 ? " " : character;
    })
    .join("");
  const cleaned = withoutControls.replace(/\s+/gu, " ").trim();
  if (cleaned.length === 0) {
    return "unknown error";
  }
  return cleaned.length > CHART_REASON_MAX_LENGTH
    ? `${cleaned.slice(0, CHART_REASON_MAX_LENGTH - 1)}…`
    : cleaned;
};

/** Pure formatter: no clock is read; the caller supplies the already-computed milliseconds. */
const formatAge = (milliseconds: number): string => {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return "unknown age";
  }
  if (milliseconds < 60_000) {
    return `${String(Math.round(milliseconds / 1_000))}s`;
  }
  if (milliseconds < 3_600_000) {
    return `${String(Math.round(milliseconds / 60_000))}m`;
  }
  return `${(milliseconds / 3_600_000).toFixed(1)}h`;
};

/**
 * Ordered union of every series' labels (first appearance wins). This is the shared x domain and the
 * table's row order, so a value is always associated with its own label, never with another series'
 * positional index.
 */
const orderedLabels = (series: ReadonlyArray<ChartSeries>): ReadonlyArray<string> => {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const item of series) {
    for (const point of item.points) {
      if (!seen.has(point.label)) {
        seen.add(point.label);
        labels.push(point.label);
      }
    }
  }
  return labels;
};

/** Per-series label -> value lookup; a duplicate label inside one series keeps its first value. */
const seriesValueLookup = (
  series: ReadonlyArray<ChartSeries>,
): ReadonlyArray<ReadonlyMap<string, number>> =>
  series.map((item) => {
    const lookup = new Map<string, number>();
    for (const point of item.points) {
      if (!lookup.has(point.label)) {
        lookup.set(point.label, finite(point.value));
      }
    }
    return lookup;
  });

const colorClass = (prefix: string, color: string): string =>
  color.startsWith("var(") ? `${prefix}-[${color}]` : "";

const figureHeader = <Message>(
  config: Rm3ChartConfig<Message>,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => [
  h.figcaption(
    [h.Class("rm3-chart-title text-[14px] font-semibold leading-[21px] text-[var(--rm-fg)]")],
    [config.title],
  ),
  ...(config.description === undefined
    ? []
    : [
        h.p(
          [h.Class("rm3-chart-description text-[12px] leading-4 text-[var(--rm-secondary)]")],
          [config.description],
        ),
      ]),
];

const chartTable = <Message>(
  config: Rm3ChartConfig<Message>,
  series: ReadonlyArray<ChartSeries>,
  labels: ReadonlyArray<string>,
  lookups: ReadonlyArray<ReadonlyMap<string, number>>,
  captionSuffix: string,
  h: HtmlBuilder<Message>,
): Html => {
  const unit = config.yUnit === undefined ? "" : ` (${config.yUnit})`;
  return h.table(
    [h.Class("sr-only"), h.DataAttribute("chart-part", "table")],
    [
      h.caption([], [`${config.title} data${captionSuffix}`]),
      h.thead(
        [],
        [
          h.tr(
            [],
            [
              h.th([h.Scope("col")], ["Label"]),
              ...series.map((item) => h.th([h.Scope("col")], [`${item.label}${unit}`])),
            ],
          ),
        ],
      ),
      h.tbody(
        [],
        labels.map((label, index) =>
          h.tr(
            [],
            [
              h.th([h.Scope("row")], [label]),
              ...series.map((item, seriesIndex) => {
                const value = lookups[seriesIndex]?.get(label);
                return h.td([], [value === undefined ? "—" : formatValue(value)]);
              }),
            ],
          ),
        ),
      ),
    ],
  );
};

const stateNotice = <Message>(
  state: ChartState,
  visiblePoints: number,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => {
  if (state.status === "stale") {
    return [
      h.p(
        [
          h.Role("status"),
          h.AriaLive("polite"),
          h.DataAttribute("chart-notice", "stale"),
          h.Class("text-[12px] leading-4 text-[var(--rm-secondary)]"),
        ],
        [`Stale: data is ${formatAge(state.ageMs)} old (rule ${formatAge(state.ruleMs)}).`],
      ),
    ];
  }
  if (state.status === "truncated") {
    const dropped = Number.isFinite(state.droppedPoints)
      ? Math.max(0, Math.trunc(state.droppedPoints))
      : 0;
    return [
      h.p(
        [
          h.Role("status"),
          h.AriaLive("polite"),
          h.DataAttribute("chart-notice", "truncated"),
          h.Class("text-[12px] leading-4 text-[var(--rm-secondary)]"),
        ],
        [
          `Truncated: showing ${String(visiblePoints)} of ${String(visiblePoints + dropped)} points (${String(dropped)} dropped).`,
        ],
      ),
    ];
  }
  return [];
};

export const view = <Message>(config: Rm3ChartConfig<Message>, h: HtmlBuilder<Message>): Html => {
  const requested = config.state ?? { status: "ready" };
  const usableSeries = config.series.filter((item) => item.points.length > 0);
  const hiddenSeriesIds = new Set(config.interaction?.hiddenSeriesIds ?? []);
  const series = usableSeries.filter((item) => !hiddenSeriesIds.has(item.id));
  const visiblePoints = series.reduce((total, item) => total + item.points.length, 0);
  const status: ChartStatus =
    requested.status === "ready" && usableSeries.length === 0 ? "empty" : requested.status;
  const wrapperClass = [
    "rm3-chart flex w-full flex-col gap-2",
    config.theme === undefined ? "" : `rm3-chart-theme-${config.theme}`,
  ]
    .filter(Boolean)
    .join(" ");
  const wrapper = [h.Class(wrapperClass), h.DataAttribute("chart-status", status)];
  const header = figureHeader(config, h);

  if (status === "loading") {
    return h.figure(wrapper, [
      ...header,
      h.p(
        [
          h.Role("status"),
          h.AriaLive("polite"),
          h.AriaBusy(true),
          h.DataAttribute("chart-loading", ""),
          h.Class("text-[13px] leading-[18px] text-[var(--rm-secondary)]"),
        ],
        ["Loading chart data…"],
      ),
    ]);
  }

  if (status === "error" && requested.status === "error") {
    return h.figure(wrapper, [
      ...header,
      h.p(
        [
          h.Role("alert"),
          h.DataAttribute("chart-error", ""),
          h.Class("text-[13px] leading-[18px] text-[var(--rm-danger)]"),
        ],
        [`Chart unavailable: ${boundedChartReason(requested.reason)}`],
      ),
    ]);
  }

  if (usableSeries.length === 0) {
    const notices = stateNotice(requested, visiblePoints, h);
    return h.figure(wrapper, [
      ...header,
      ...notices,
      h.p(
        [
          h.Role("status"),
          h.AriaLive("polite"),
          h.DataAttribute("chart-empty", ""),
          h.Class("text-[13px] leading-[18px] text-[var(--rm-secondary)]"),
        ],
        ["No chart data available."],
      ),
    ]);
  }

  const height = config.height ?? CHART_HEIGHT;
  const plotWidth = CHART_WIDTH - CHART_LEFT - CHART_RIGHT;
  const plotHeight = Math.max(1, height - CHART_TOP - CHART_BOTTOM);
  const values = series.flatMap((item) => item.points.map((point) => finite(point.value)));
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(...values, minimum + 1);
  const range = Math.max(1, maximum - minimum);

  const yFor = (value: number): number => CHART_TOP + ((maximum - value) / range) * plotHeight;
  const xFor = (index: number, count: number): number =>
    count <= 1 ? CHART_LEFT + plotWidth / 2 : CHART_LEFT + (index / (count - 1)) * plotWidth;

  const yTicks = [maximum, (maximum + minimum) / 2, minimum];
  const labels = orderedLabels(series);
  const lookups = seriesValueLookup(series);
  const labelIndex = new Map(labels.map((label, index) => [label, index] as const));
  const labelStep = Math.max(1, Math.ceil(labels.length / MAX_X_LABELS));
  const visibleLabelIndexes = labels
    .map((_label, index) => index)
    .filter(
      (index) =>
        index % labelStep === 0 ||
        index === labels.length - 1 ||
        index === Math.floor(labels.length / 2),
    );

  const grid = yTicks.flatMap((tick) => {
    const y = yFor(tick);
    return [
      h.line(
        [
          h.X1(String(CHART_LEFT)),
          h.Y1(String(y)),
          h.X2(String(CHART_WIDTH - CHART_RIGHT)),
          h.Y2(String(y)),
          h.Stroke("var(--rm-border)"),
          h.StrokeWidth("1"),
          h.StrokeDasharray("2 2"),
          h.Class("rm3-chart-grid stroke-[var(--rm-border)]"),
        ],
        [],
      ),
      h.text(
        [
          h.X(String(CHART_LEFT - 6)),
          h.Y(String(y + 3)),
          h.TextAnchor("end"),
          h.Fill("var(--rm-secondary)"),
          h.FontSize("10"),
          h.Class("rm3-chart-axis-label fill-[var(--rm-secondary)]"),
        ],
        [`${formatValue(tick)}${config.yUnit === undefined ? "" : ` ${config.yUnit}`}`],
      ),
    ];
  });

  const xAxis = h.line(
    [
      h.X1(String(CHART_LEFT)),
      h.Y1(String(CHART_TOP + plotHeight)),
      h.X2(String(CHART_WIDTH - CHART_RIGHT)),
      h.Y2(String(CHART_TOP + plotHeight)),
      h.Stroke("var(--rm-border)"),
      h.StrokeWidth("1"),
      h.Class("rm3-chart-axis stroke-[var(--rm-border)]"),
    ],
    [],
  );

  const xLabels = visibleLabelIndexes.map((index) => {
    const label = labels[index] ?? "";
    const pointCount = labels.length;
    return h.text(
      [
        h.X(String(xFor(index, pointCount))),
        h.Y(String(CHART_TOP + plotHeight + 18)),
        h.TextAnchor("middle"),
        h.Fill("var(--rm-secondary)"),
        h.FontSize("10"),
        h.Class("rm3-chart-axis-label fill-[var(--rm-secondary)]"),
      ],
      [label],
    );
  });

  const seriesIndexById = new Map(usableSeries.map((item, index) => [item.id, index] as const));
  const unit = config.yUnit === undefined ? "" : ` ${config.yUnit}`;
  const pointValueText = (seriesLabel: string, point: ChartPoint): string =>
    `${seriesLabel}: ${point.label} = ${formatValue(finite(point.value))}${unit}`;
  const seriesNodes = series.flatMap((item) => {
    const color = item.color ?? chartSeriesColor(seriesIndexById.get(item.id) ?? 0);
    const path = item.points
      .map((point, index) => {
        const unionIndex = labelIndex.get(point.label) ?? 0;
        const x = xFor(unionIndex, labels.length);
        const y = yFor(finite(point.value));
        return `${index === 0 ? "M" : "L"} ${formatValue(x)} ${formatValue(y)}`;
      })
      .join(" ");
    const lineClass = ["rm3-chart-series", colorClass("stroke", color)]
      .filter((value) => value.length > 0)
      .join(" ");
    const pointClass = ["rm3-chart-point", colorClass("fill", color)]
      .filter((value) => value.length > 0)
      .join(" ");
    return [
      h.path(
        [
          h.D(path),
          h.Fill("none"),
          h.Stroke(color),
          h.StrokeWidth("2"),
          h.StrokeLinecap("round"),
          h.StrokeLinejoin("round"),
          h.VectorEffect("non-scaling-stroke"),
          h.Class(lineClass),
        ],
        [],
      ),
      ...item.points.map((point) => {
        const showPoint = config.interaction?.onShowPoint;
        return h.circle(
          [
            h.Cx(String(xFor(labelIndex.get(point.label) ?? 0, labels.length))),
            h.Cy(String(yFor(finite(point.value)))),
            h.R("2.5"),
            h.Fill(color),
            h.Class(pointClass),
            h.DataAttribute("chart-series-id", item.id),
            h.DataAttribute("chart-point-label", point.label),
            h.AriaLabel(pointValueText(item.label, point)),
            h.Tabindex(0),
            ...(showPoint === undefined
              ? []
              : [
                  h.OnClick(showPoint(item.id, point.label)),
                  h.OnMouseEnter(showPoint(item.id, point.label)),
                ]),
          ],
          [h.title([], [pointValueText(item.label, point)])],
        );
      }),
    ];
  });

  const tooltip = config.interaction?.tooltip ?? null;
  const tooltipSeries =
    tooltip === null ? undefined : series.find((item) => item.id === tooltip.seriesId);
  const tooltipPoint =
    tooltip === null || tooltipSeries === undefined
      ? undefined
      : tooltipSeries.points.find((point) => point.label === tooltip.label);
  const tooltipNode =
    tooltipSeries === undefined || tooltipPoint === undefined
      ? null
      : (() => {
          const cx = xFor(labelIndex.get(tooltipPoint.label) ?? 0, labels.length);
          const cy = yFor(finite(tooltipPoint.value));
          const text = pointValueText(tooltipSeries.label, tooltipPoint);
          return h.g(
            [
              h.Role("status"),
              h.AriaLive("polite"),
              h.DataAttribute("chart-tooltip", ""),
              h.DataAttribute("chart-series-id", tooltipSeries.id),
            ],
            [
              h.rect(
                [
                  h.X(String(Math.max(CHART_LEFT, cx - 84))),
                  h.Y(String(Math.max(0, cy - 30))),
                  h.Width("168"),
                  h.Height("22"),
                  h.Rx("3"),
                  h.Fill("var(--rm-surface)"),
                  h.Stroke("var(--rm-border)"),
                  h.StrokeWidth("1"),
                ],
                [],
              ),
              h.text(
                [
                  h.X(String(Math.max(CHART_LEFT + 6, cx - 78))),
                  h.Y(String(Math.max(12, cy - 15))),
                  h.Fill("var(--rm-fg)"),
                  h.FontSize("11"),
                  h.Class("rm3-chart-tooltip-value"),
                ],
                [text],
              ),
            ],
          );
        })();

  const legend = h.ul(
    [h.Class("rm3-chart-legend flex flex-wrap items-center gap-3")],
    usableSeries.map((item) => {
      const color = item.color ?? chartSeriesColor(seriesIndexById.get(item.id) ?? 0);
      const hidden = hiddenSeriesIds.has(item.id);
      const toggle = config.interaction?.onToggleSeries;
      const swatch = h.span(
        [
          h.Class("size-2 shrink-0 rounded-[2px]"),
          h.Style({ backgroundColor: color }),
          h.AriaHidden(true),
        ],
        [],
      );
      return h.li(
        [h.Class("flex items-center gap-1.5 text-[12px] leading-4 text-[var(--rm-secondary)]")],
        [
          toggle === undefined
            ? h.span(
                [
                  h.Class(hidden ? "line-through opacity-60" : ""),
                  h.DataAttribute("chart-series-id", item.id),
                ],
                [swatch, item.label],
              )
            : h.button(
                [
                  h.Type("button"),
                  h.DataAttribute("chart-series-id", item.id),
                  h.AriaPressed(hidden ? "false" : "true"),
                  h.OnClick(toggle(item.id)),
                  h.Class(
                    [
                      "rm3-chart-legend-toggle inline-flex items-center gap-1.5 rounded-[var(--rm-radius-field)] px-1 py-0.5",
                      hidden ? "line-through opacity-60" : "",
                    ]
                      .filter(Boolean)
                      .join(" "),
                  ),
                ],
                [swatch, item.label],
              ),
        ],
      );
    }),
  );

  const notices = stateNotice(requested, visiblePoints, h);
  const captionSuffix =
    requested.status === "truncated"
      ? ` (showing ${String(visiblePoints)} of ${String(visiblePoints + Math.max(0, Math.trunc(requested.droppedPoints)))} points; ${String(Math.max(0, Math.trunc(requested.droppedPoints)))} dropped)`
      : requested.status === "stale"
        ? ` (stale: ${formatAge(requested.ageMs)} old, rule ${formatAge(requested.ruleMs)})`
        : "";

  return h.figure(wrapper, [
    ...header,
    h.svg(
      [
        h.Xmlns("http://www.w3.org/2000/svg"),
        h.ViewBox(`0 0 ${String(CHART_WIDTH)} ${String(height)}`),
        h.Role("img"),
        h.AriaLabel(config.ariaLabel ?? `${config.title} chart`),
        h.Class("rm3-chart-svg h-auto w-full"),
      ],
      [...grid, xAxis, ...xLabels, ...seriesNodes, ...(tooltipNode === null ? [] : [tooltipNode])],
    ),
    ...notices,
    legend,
    chartTable(config, series, labels, lookups, captionSuffix, h),
  ]);
};
