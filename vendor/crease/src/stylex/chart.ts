import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as ECharts from '@/lib/echarts'
import * as EChartsView from './integrations/echarts'
import type { ComponentLayoutStyle } from './contracts'
import { complexTokens } from './complex-tokens.stylex'
import { className } from './style'
import { foundationTokens } from './foundations-tokens.stylex'
import { tokens } from './tokens.stylex'

export type EChartProps<Msg> = EChartsView.EChartProps<Msg> &
  Readonly<{ accessibleAlternative: Html }>
export type ChartMessage = ECharts.ChartMessage
export type ChartTheme = ECharts.ChartTheme
export type OptionBuilder = ECharts.OptionBuilder
export const ChartMessage = ECharts.ChartMessage
export const SyncChart = ECharts.SyncChart
export const areaGradient = ECharts.areaGradient
export const categoryAxis = ECharts.categoryAxis
export const colorWithOpacity = ECharts.colorWithOpacity
export const compactGrid = ECharts.compactGrid
export const registerChart = ECharts.registerChart
export const legendOptions = ECharts.legendOptions
export const tooltipOptions = ECharts.tooltipOptions
/** @deprecated Use legendOptions. */
export const shadcnLegend = ECharts.shadcnLegend
/** @deprecated Use tooltipOptions. */
export const shadcnTooltip = ECharts.shadcnTooltip
export const valueAxis = ECharts.valueAxis
export const eChart = <Msg>(
  props: EChartProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => EChartsView.eChart(props, h)

export type ChartSeriesConfig = Readonly<{
  label?: Html | string
  color?: string
  icon?: Html
}>
export type ChartConfig = Readonly<Record<string, ChartSeriesConfig>>
export type ChartContainerProps = Readonly<{
  config: ChartConfig
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle
  ariaLabel?: string
}>

const styles = stylex.create({
  chart: { height: 'auto', width: '100%' },
  interactiveChart: {
    display: 'block',
    height: 'auto',
    minHeight: '15rem',
    width: '100%',
  },
  container: {
    aspectRatio: '16 / 9',
    display: 'flex',
    fontSize: '0.75rem',
    justifyContent: 'center',
    lineHeight: '1rem',
  },
  donut: {
    marginInline: 'auto',
    aspectRatio: '1 / 1',
    height: 'auto',
    width: '100%',
  },
  donutCompact: { maxWidth: '18rem' },
  key: {
    borderRadius: complexTokens.smallRadius,
    flexShrink: 0,
    height: '0.5rem',
    width: '0.5rem',
  },
  legend: {
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendItem: { gap: '0.375rem', alignItems: 'center', display: 'flex' },
  muted: { color: tokens.mutedForeground },
  tooltip: {
    borderColor: tokens.border,
    borderRadius: tokens.radius,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.375rem',
    paddingBlock: '0.375rem',
    paddingInline: '0.625rem',
    backgroundColor: tokens.background,
    boxShadow: foundationTokens.shadowXl,
    display: 'grid',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    minWidth: '8rem',
  },
  tooltipItem: { gap: '0.5rem', alignItems: 'center', display: 'flex' },
  tooltipLabel: { fontWeight: 500 },
  tooltipValue: {
    color: tokens.foreground,
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 500,
    marginLeft: 'auto',
  },
})

export const chartContainer = <Msg>(
  props: ChartContainerProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const variables = Object.entries(props.config).reduce<Record<string, string>>(
    (result, [key, series]) =>
      series.color === undefined
        ? result
        : { ...result, [`--color-${key}`]: series.color },
    {},
  )
  return h.div(
    [
      h.DataAttribute('slot', 'chart'),
      h.Role('img'),
      h.AriaLabel(props.ariaLabel ?? 'Chart'),
      h.Class(className(styles.container, props.layoutStyle)),
      h.Style(variables),
    ],
    props.children,
  )
}

export type ChartLegendProps = Readonly<{
  config: ChartConfig
  series?: ReadonlyArray<string>
  layoutStyle?: ComponentLayoutStyle
}>
export const chartLegend = <Msg>(
  props: ChartLegendProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const variables = Object.entries(props.config).reduce<Record<string, string>>(
    (result, [key, series]) =>
      series.color === undefined
        ? result
        : { ...result, [`--color-${key}`]: series.color },
    {},
  )
  return h.div(
    [
      h.DataAttribute('slot', 'chart-legend'),
      h.Class(className(styles.legend, props.layoutStyle)),
      h.Style(variables),
    ],
    (props.series ?? Object.keys(props.config)).flatMap(key => {
      const series = props.config[key]
      return series === undefined
        ? []
        : [
            h.div(
              [h.Class(className(styles.legendItem))],
              [
                series.icon ??
                  h.span(
                    [
                      h.Class(className(styles.key)),
                      h.Style({ backgroundColor: `var(--color-${key})` }),
                    ],
                    [],
                  ),
                series.label ?? key,
              ],
            ),
          ]
    }),
  )
}

export type ChartTooltipItem = Readonly<{ key: string; value: Html | string }>
export const chartTooltipContent = <Msg>(
  props: Readonly<{
    config: ChartConfig
    label?: Html | string
    items: ReadonlyArray<ChartTooltipItem>
    layoutStyle?: ComponentLayoutStyle
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'chart-tooltip'),
      h.Class(className(styles.tooltip, props.layoutStyle)),
    ],
    [
      ...(props.label === undefined
        ? []
        : [h.div([h.Class(className(styles.tooltipLabel))], [props.label])]),
      ...props.items.map(item =>
        h.div(
          [h.Class(className(styles.tooltipItem))],
          [
            h.span(
              [
                h.Class(className(styles.key)),
                h.Style({ backgroundColor: `var(--color-${item.key})` }),
              ],
              [],
            ),
            h.span(
              [h.Class(className(styles.muted))],
              [props.config[item.key]?.label ?? item.key],
            ),
            h.span([h.Class(className(styles.tooltipValue))], [item.value]),
          ],
        ),
      ),
    ],
  )

const finite = (value: number): number => (Number.isFinite(value) ? value : 0)
export type BarChartDatum = Readonly<{ label: string; value: number }>
export type BarChartProps = Readonly<{
  data: ReadonlyArray<BarChartDatum>
  layoutStyle?: ComponentLayoutStyle
  showXAxisLabels?: boolean
  isCompact?: boolean
}>
export const barChart = <Msg>(
  props: BarChartProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const showXAxisLabels = props.showXAxisLabels ?? true
  const isCompact = props.isCompact ?? false
  const chartWidth = isCompact ? 320 : 100
  const chartHeight = isCompact ? 80 : 60
  const plotBottom = isCompact ? 58 : showXAxisLabels ? 48 : 56
  const plotHeight = isCompact ? 48 : plotBottom - 4
  const count = Math.max(props.data.length, 1)
  const slotWidth = chartWidth / count
  const barWidth = Math.max(
    0.5,
    Math.min(isCompact ? 16 : 10, slotWidth * 0.64),
  )
  const maximum = Math.max(0, ...props.data.map(item => finite(item.value)))
  return h.svg(
    [
      h.DataAttribute('slot', 'chart'),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.ViewBox(`0 0 ${String(chartWidth)} ${String(chartHeight)}`),
      h.Role('img'),
      h.AriaLabel('Bar chart'),
      h.Class(className(reset.svg, styles.chart, props.layoutStyle)),
    ],
    [
      ...props.data.map((item, index) => {
        const value = Math.max(0, finite(item.value))
        const height = maximum === 0 ? 0 : (value / maximum) * plotHeight
        const x = index * slotWidth + (slotWidth - barWidth) / 2
        return h.rect(
          [
            h.X(String(x)),
            h.Y(String(plotBottom - height)),
            h.Width(String(barWidth)),
            h.Height(String(height)),
            h.Rx('2'),
            h.Fill('var(--chart-2)'),
          ],
          [],
        )
      }),
      ...(showXAxisLabels
        ? props.data.map((item, index) =>
            h.text(
              [
                h.X(String(index * slotWidth + slotWidth / 2)),
                h.Y(isCompact ? '76' : '57'),
                h.TextAnchor('middle'),
                h.Fill('var(--muted-foreground)'),
                h.FontSize(isCompact ? '10' : '4'),
              ],
              [item.label],
            ),
          )
        : []),
    ],
  )
}

export type AreaChartProps = Readonly<{
  data: ReadonlyArray<number>
  layoutStyle?: ComponentLayoutStyle
}>
type Point = Readonly<{ x: number; y: number }>
const areaPoints = (data: ReadonlyArray<number>): ReadonlyArray<Point> => {
  const values = data.map(finite)
  if (values.length === 0) return []
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const range = maximum - minimum
  const denominator = Math.max(values.length - 1, 1)
  return values.map((value, index) => ({
    x: (index / denominator) * 100,
    y: range === 0 ? 25 : 15 + ((maximum - value) / range) * 20,
  }))
}
const smoothPath = (points: ReadonlyArray<Point>): string => {
  const first = points[0]
  if (first === undefined) return ''
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index] ?? first
    const midpoint = (previous.x + point.x) / 2
    return `${path} C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`
  }, `M ${first.x} ${first.y}`)
}
export const areaChart = <Msg>(
  props: AreaChartProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const points = areaPoints(props.data)
  const linePath = smoothPath(points)
  const first = points[0]
  const last = points[points.length - 1]
  const fillPath =
    first === undefined || last === undefined
      ? ''
      : `${linePath} L ${last.x} 50 L ${first.x} 50 Z`
  return h.svg(
    [
      h.DataAttribute('slot', 'chart'),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.ViewBox('0 0 100 50'),
      h.Role('img'),
      h.AriaLabel('Area chart'),
      h.Class(className(reset.svg, styles.chart, props.layoutStyle)),
    ],
    [
      h.defs(
        [],
        [
          h.linearGradient(
            [
              h.Id('foldkit-area-gradient'),
              h.X1('0'),
              h.Y1('0'),
              h.X2('0'),
              h.Y2('1'),
            ],
            [
              h.stop(
                [
                  h.Offset('0%'),
                  h.StopColor('var(--muted-foreground)'),
                  h.StopOpacity('0.16'),
                ],
                [],
              ),
              h.stop(
                [
                  h.Offset('100%'),
                  h.StopColor('var(--muted-foreground)'),
                  h.StopOpacity('0.02'),
                ],
                [],
              ),
            ],
          ),
        ],
      ),
      ...[14, 25, 36].map(y =>
        h.line(
          [
            h.X1('0'),
            h.Y1(String(y)),
            h.X2('100'),
            h.Y2(String(y)),
            h.Stroke('var(--border)'),
            h.StrokeDasharray('2 2'),
            h.StrokeWidth('0.5'),
          ],
          [],
        ),
      ),
      ...(fillPath === ''
        ? []
        : [
            h.path([h.D(fillPath), h.Fill('url(#foldkit-area-gradient)')], []),
            h.path(
              [
                h.D(linePath),
                h.Fill('none'),
                h.Stroke('var(--muted-foreground)'),
                h.StrokeWidth('1'),
                h.StrokeLinecap('round'),
                h.StrokeLinejoin('round'),
                h.VectorEffect('non-scaling-stroke'),
              ],
              [],
            ),
          ]),
    ],
  )
}

export type InteractiveAreaChartDatum = Readonly<{
  label: string
  desktop: number
  mobile: number
}>

export type InteractiveAreaChartProps = Readonly<{
  data: ReadonlyArray<InteractiveAreaChartDatum>
  ariaLabel?: string
  layoutStyle?: ComponentLayoutStyle
}>

const interactivePoints = (
  values: ReadonlyArray<number>,
  maximum: number,
): ReadonlyArray<Point> => {
  const denominator = Math.max(values.length - 1, 1)
  return values.map((value, index) => ({
    x: 48 + (index / denominator) * 648,
    y: 18 + ((maximum - Math.max(0, finite(value))) / maximum) * 202,
  }))
}

const areaFillPath = (points: ReadonlyArray<Point>): string => {
  const first = points[0]
  const last = points[points.length - 1]
  return first === undefined || last === undefined
    ? ''
    : `${smoothPath(points)} L ${last.x} 220 L ${first.x} 220 Z`
}

export const interactiveAreaChart = <Msg>(
  props: InteractiveAreaChartProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const values = props.data.flatMap(datum => [
    finite(datum.desktop),
    finite(datum.mobile),
  ])
  const rawMaximum = Math.max(1, ...values)
  const maximum = Math.ceil(rawMaximum / 100) * 100
  const desktopPoints = interactivePoints(
    props.data.map(datum => datum.desktop),
    maximum,
  )
  const mobilePoints = interactivePoints(
    props.data.map(datum => datum.mobile),
    maximum,
  )
  const desktopLine = smoothPath(desktopPoints)
  const mobileLine = smoothPath(mobilePoints)
  const labelStep = Math.max(1, Math.ceil(props.data.length / 6))

  return h.svg(
    [
      h.DataAttribute('slot', 'interactive-area-chart'),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.ViewBox('0 0 720 260'),
      h.Role('img'),
      h.AriaLabel(props.ariaLabel ?? 'Desktop and mobile visitors over time'),
      h.Class(className(reset.svg, styles.interactiveChart, props.layoutStyle)),
    ],
    [
      h.defs(
        [],
        [
          h.linearGradient(
            [
              h.Id('foldkit-desktop-gradient'),
              h.X1('0'),
              h.Y1('0'),
              h.X2('0'),
              h.Y2('1'),
            ],
            [
              h.stop(
                [
                  h.Offset('0%'),
                  h.StopColor('var(--chart-1)'),
                  h.StopOpacity('0.32'),
                ],
                [],
              ),
              h.stop(
                [
                  h.Offset('100%'),
                  h.StopColor('var(--chart-1)'),
                  h.StopOpacity('0.02'),
                ],
                [],
              ),
            ],
          ),
          h.linearGradient(
            [
              h.Id('foldkit-mobile-gradient'),
              h.X1('0'),
              h.Y1('0'),
              h.X2('0'),
              h.Y2('1'),
            ],
            [
              h.stop(
                [
                  h.Offset('0%'),
                  h.StopColor('var(--chart-2)'),
                  h.StopOpacity('0.26'),
                ],
                [],
              ),
              h.stop(
                [
                  h.Offset('100%'),
                  h.StopColor('var(--chart-2)'),
                  h.StopOpacity('0.02'),
                ],
                [],
              ),
            ],
          ),
        ],
      ),
      ...[0, 0.25, 0.5, 0.75, 1].flatMap(ratio => {
        const y = 18 + ratio * 202
        const label = Math.round(maximum * (1 - ratio))
        return [
          h.line(
            [
              h.X1('48'),
              h.Y1(String(y)),
              h.X2('696'),
              h.Y2(String(y)),
              h.Stroke('var(--border)'),
              h.StrokeDasharray('3 4'),
              h.StrokeWidth('1'),
            ],
            [],
          ),
          h.text(
            [
              h.X('38'),
              h.Y(String(y + 4)),
              h.TextAnchor('end'),
              h.Fill('var(--muted-foreground)'),
              h.FontSize('10'),
            ],
            [String(label)],
          ),
        ]
      }),
      ...props.data.flatMap((datum, index) =>
        index % labelStep === 0 || index === props.data.length - 1
          ? [
              h.text(
                [
                  h.X(String(desktopPoints[index]?.x ?? 48)),
                  h.Y('248'),
                  h.TextAnchor('middle'),
                  h.Fill('var(--muted-foreground)'),
                  h.FontSize('10'),
                ],
                [datum.label],
              ),
            ]
          : [],
      ),
      ...(desktopLine === ''
        ? []
        : [
            h.path(
              [
                h.D(areaFillPath(desktopPoints)),
                h.Fill('url(#foldkit-desktop-gradient)'),
              ],
              [],
            ),
            h.path(
              [
                h.D(areaFillPath(mobilePoints)),
                h.Fill('url(#foldkit-mobile-gradient)'),
              ],
              [],
            ),
            h.path(
              [
                h.D(desktopLine),
                h.Fill('none'),
                h.Stroke('var(--chart-1)'),
                h.StrokeWidth('2.5'),
                h.StrokeLinecap('round'),
                h.StrokeLinejoin('round'),
                h.VectorEffect('non-scaling-stroke'),
              ],
              [],
            ),
            h.path(
              [
                h.D(mobileLine),
                h.Fill('none'),
                h.Stroke('var(--chart-2)'),
                h.StrokeWidth('2.5'),
                h.StrokeLinecap('round'),
                h.StrokeLinejoin('round'),
                h.VectorEffect('non-scaling-stroke'),
              ],
              [],
            ),
          ]),
    ],
  )
}

export type DonutChartProps = Readonly<{
  value: number
  max: number
  label?: string
  size?: 'default' | 'compact'
  sublabel?: string
  layoutStyle?: ComponentLayoutStyle
}>
export const donutChart = <Msg>(
  props: DonutChartProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const maximum = finite(props.max)
  const ratio =
    maximum <= 0 ? 0 : Math.min(1, Math.max(0, finite(props.value) / maximum))
  const circumference = 2 * Math.PI * 42
  const dash = ratio * circumference
  return h.svg(
    [
      h.DataAttribute('slot', 'chart'),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.ViewBox('0 0 120 120'),
      h.Role('img'),
      h.AriaLabel(
        props.label ??
          `${Math.round(ratio * 100)}% of ${String(Math.max(0, maximum))}`,
      ),
      h.Class(
        className(
          reset.svg,
          styles.donut,
          props.size === 'compact' && styles.donutCompact,
          props.layoutStyle,
        ),
      ),
    ],
    [
      h.circle(
        [
          h.Cx('60'),
          h.Cy('60'),
          h.R('42'),
          h.Fill('none'),
          h.Stroke('var(--chart-1)'),
          h.StrokeWidth('16'),
        ],
        [],
      ),
      h.circle(
        [
          h.Cx('60'),
          h.Cy('60'),
          h.R('42'),
          h.Fill('none'),
          h.Stroke('var(--chart-2)'),
          h.StrokeWidth('16'),
          h.StrokeDasharray(`${dash} ${circumference - dash}`),
          h.StrokeLinecap('butt'),
          h.Transform('rotate(-90 60 60)'),
        ],
        [],
      ),
      ...(props.label === undefined
        ? []
        : [
            h.text(
              [
                h.X('60'),
                h.Y(props.sublabel === undefined ? '60' : '54'),
                h.TextAnchor('middle'),
                h.DominantBaseline('middle'),
                h.Fill('var(--foreground)'),
                h.FontSize('14'),
                h.FontWeight('700'),
              ],
              [props.label],
            ),
          ]),
      ...(props.sublabel === undefined
        ? []
        : [
            h.text(
              [
                h.X('60'),
                h.Y('70'),
                h.TextAnchor('middle'),
                h.DominantBaseline('middle'),
                h.Fill('var(--muted-foreground)'),
                h.FontSize('6'),
              ],
              [props.sublabel],
            ),
          ]),
    ],
  )
}
