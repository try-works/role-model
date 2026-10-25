import type * as echarts from 'echarts/core'
import type {
  EChartsOption,
  GridOption,
  XAXisOption,
  YAXisOption,
} from 'echarts/types/dist/shared'
import { Effect, Option, Schema as S } from 'effect'
import { Command, Mount } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { cn } from '@/lib/utils'
import type * as EChartsCore from 'echarts/core'

/* ECharts embedded in foldkit. Where shadcn wraps recharts (React-only), we render the
   same visual language through Apache ECharts:

   - Each demo card module registers an OPTION BUILDER at module load time,
     keyed by its host id. Builders are (theme, variant) => EChartsOption, so
     views stay pure and Commands stay serializable (they carry only strings).
   - The Mount inits echarts on the host element, resolves the CSS design
     tokens from the element (so scoped overrides like .create-board-theme
     apply), applies the builder's option, and keeps the chart responsive via
     ResizeObserver. Canvas cannot resolve CSS variables, so series colors are
     resolved to concrete values here; the DOM-based tooltip CAN use CSS vars.
   - Chart modules load only when a chart mounts. Theme tokens are re-read when
     a class, style, or data-theme attribute changes on the host or an ancestor. */

let echartsPromise: Promise<typeof EChartsCore> | undefined

const loadECharts = (): Promise<typeof EChartsCore> => {
  if (echartsPromise === undefined) {
    echartsPromise = Promise.all([
      import('echarts/core'),
      import('echarts/charts'),
      import('echarts/components'),
      import('echarts/renderers'),
    ])
      .then(([echartsRuntime, charts, components, renderers]) => {
        echartsRuntime.use([
          charts.LineChart,
          charts.BarChart,
          charts.PieChart,
          charts.RadarChart,
          charts.ScatterChart,
          components.GridComponent,
          components.TooltipComponent,
          components.LegendComponent,
          components.PolarComponent,
          components.RadarComponent,
          components.DatasetComponent,
          renderers.CanvasRenderer,
        ])
        return echartsRuntime
      })
      .catch(error => {
        echartsPromise = undefined
        throw error
      })
  }
  return echartsPromise
}

// THEME — design tokens resolved from the mount element

export type ChartTheme = Readonly<{
  chart1: string
  chart2: string
  chart3: string
  chart4: string
  chart5: string
  border: string
  mutedForeground: string
  foreground: string
  background: string
  primary: string
  fontFamily: string
}>

/* Tokens are authored in oklch(). The browser paints those fine, but ECharts/
   zrender parse color strings THEMSELVES for hover emphasis, highlight lift,
   and gradient interpolation — and that parser only understands rgb/hex/hsl.
   Feeding it oklch() blanks the series whenever the pointer hovers the chart.

   getComputedStyle does NOT help here: CSS Color 4 keeps oklch()/lab()/color()
   in their own serialization instead of converting to rgb. The one conversion
   the platform guarantees is painting: fill a 1x1 canvas with the color and
   read the pixel back. */
let probeContext: CanvasRenderingContext2D | null = null

const resolveToRgb = (cssColor: string): string => {
  if (probeContext === null) {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    probeContext = canvas.getContext('2d', { willReadFrequently: true })
  }
  if (probeContext === null) {
    return cssColor
  }

  probeContext.clearRect(0, 0, 1, 1)
  probeContext.fillStyle = cssColor
  probeContext.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = probeContext.getImageData(0, 0, 1, 1).data

  return a === 255
    ? `rgb(${r}, ${g}, ${b})`
    : `rgba(${r}, ${g}, ${b}, ${((a ?? 0) / 255).toFixed(3)})`
}

export const resolveTheme = (element: HTMLElement): ChartTheme => {
  const style = getComputedStyle(element)
  const token = (name: string): string =>
    resolveToRgb(style.getPropertyValue(name).trim())

  return {
    chart1: token('--chart-1'),
    chart2: token('--chart-2'),
    chart3: token('--chart-3'),
    chart4: token('--chart-4'),
    chart5: token('--chart-5'),
    border: token('--border'),
    mutedForeground: token('--muted-foreground'),
    foreground: token('--foreground'),
    background: token('--background'),
    primary: token('--primary'),
    fontFamily: style.fontFamily,
  }
}

// SHADCN LOOK HELPERS — shared bits builders compose into their options

export type CategoryAxisOptions = Extract<XAXisOption, { type?: 'category' }>
export type ValueAxisOptions = Extract<YAXisOption, { type?: 'value' }>

/** Muted 12px axis labels, no axis/tick lines — shadcn's XAxis look.
 *  Area/line charts render edge-to-edge (boundaryGap false, recharts-style);
 *  bar charts pass boundaryGap: true. */
export const categoryAxis = (
  theme: ChartTheme,
  data: ReadonlyArray<string>,
  config: Readonly<{
    boundaryGap?: boolean
    axisLabel?: CategoryAxisOptions['axisLabel']
  }> = {},
): CategoryAxisOptions => ({
  type: 'category',
  data: [...data],
  boundaryGap: config.boundaryGap ?? false,
  axisLine: { show: false },
  axisTick: { show: false },
  axisLabel: {
    color: theme.mutedForeground,
    fontSize: 12,
    fontFamily: theme.fontFamily,
    margin: 10,
    ...config.axisLabel,
  },
})

/** Hidden-by-default value axis with dashed splitlines — shadcn's grid look. */
export const valueAxis = (
  theme: ChartTheme,
  config: Readonly<{
    showLabels?: boolean
    axisLabel?: ValueAxisOptions['axisLabel']
  }> = {},
): ValueAxisOptions => ({
  type: 'value',
  axisLine: { show: false },
  axisTick: { show: false },
  axisLabel: {
    show: config.showLabels ?? false,
    color: theme.mutedForeground,
    fontSize: 12,
    fontFamily: theme.fontFamily,
    ...config.axisLabel,
  },
  splitLine: { lineStyle: { color: theme.border, type: 'dashed' } },
})

/** Compact plot area matching shadcn's tight ChartContainer margins. */
export const compactGrid = (
  config: Readonly<{
    left?: number
    right?: number
    top?: number
    bottom?: number
  }> = {},
): GridOption => ({
  left: config.left ?? 12,
  right: config.right ?? 12,
  top: config.top ?? 12,
  bottom: config.bottom ?? 24,
  outerBoundsMode: 'same',
  outerBoundsContain: 'axisLabel',
})

type TooltipRow = Readonly<{
  marker: string
  seriesName?: string
  name?: string
  value?: number | string | ReadonlyArray<number | string>
  color?: string
}>

const tooltipRowHtml = (
  row: TooltipRow,
  preferName: boolean,
  formatValue?: (value: number) => number | string,
): string => {
  // Item-triggered tooltips describe the datum (pie slice, radar series) —
  // seriesName is an auto-generated 'series0' when the series is unnamed.
  // Axis-triggered tooltips describe the series; the category name is the
  // heading.
  const label = preferName
    ? row.name || row.seriesName || ''
    : row.seriesName || row.name || ''
  const raw = Array.isArray(row.value) ? row.value[1] : row.value
  const value = formatValue && typeof raw === 'number' ? formatValue(raw) : raw

  return `<div style="display:flex;align-items:center;gap:6px;min-width:8rem">
    <span style="width:10px;height:10px;border-radius:2.5px;background:${row.color ?? 'transparent'};flex-shrink:0"></span>
    <span style="color:var(--muted-foreground)">${label}</span>
    <span style="margin-left:auto;font-variant-numeric:tabular-nums;font-weight:500;color:var(--foreground)">${value ?? ''}</span>
  </div>`
}

/** shadcn ChartTooltipContent look: rounded border bg-background text-xs with
 *  a rounded color chip, muted label, tabular-nums value. The tooltip is DOM,
 *  so CSS variables apply directly. `formatHeading` rewrites the axis heading —
 *  needed when the axis uses slot ids (see `slotIds`) instead of real labels. */
export const shadcnTooltip = (
  theme: ChartTheme,
  config: Readonly<{
    trigger?: 'axis' | 'item'
    formatHeading?: (name: string, dataIndex: number) => string
    /** Resampled slots interpolate between real points — round the leak. */
    formatValue?: (value: number) => number | string
  }> = {},
): NonNullable<EChartsOption['tooltip']> => ({
  trigger: config.trigger ?? 'axis',
  confine: true,
  backgroundColor: 'var(--background)',
  borderColor: 'var(--border)',
  borderWidth: 1,
  padding: [6, 10],
  extraCssText:
    'border-radius:8px;box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);',
  textStyle: {
    color: theme.foreground,
    fontSize: 12,
    fontFamily: theme.fontFamily,
  },
  axisPointer: { type: 'none' },
  formatter: params => {
    const rows: ReadonlyArray<TooltipRow> = Array.isArray(params)
      ? (params as ReadonlyArray<TooltipRow>)
      : [params as TooltipRow]
    const first = Array.isArray(params)
      ? (params[0] as { name?: string; dataIndex?: number })
      : undefined
    const rawHeading = first?.name ?? ''
    const heading =
      config.formatHeading && first
        ? config.formatHeading(rawHeading, first.dataIndex ?? 0)
        : rawHeading
    const headingHtml = heading
      ? `<div style="font-weight:500;margin-bottom:4px;color:var(--foreground)">${heading}</div>`
      : ''

    const itemTooltip = config.trigger === 'item'
    return `${headingHtml}${rows
      .map(row => tooltipRowHtml(row, itemTooltip, config.formatValue))
      .join('')}`
  },
})

/** Bottom legend with muted text and small rounded markers. */
export const shadcnLegend = (
  theme: ChartTheme,
): NonNullable<EChartsOption['legend']> => ({
  bottom: 0,
  icon: 'roundRect',
  itemWidth: 10,
  itemHeight: 10,
  itemGap: 16,
  textStyle: {
    color: theme.mutedForeground,
    fontSize: 12,
    fontFamily: theme.fontFamily,
  },
})

/** CreaseUI tooltip and legend presets for chart examples. */
export const tooltipOptions = shadcnTooltip
export const legendOptions = shadcnLegend

/** Spread into the option of any chart that switches variants — a 1500ms
 *  cubicInOut morph, matching recharts' default data tween (duration 1500,
 *  easing 'ease'). */
export const updateAnimation = (): Pick<
  EChartsOption,
  'animationDurationUpdate' | 'animationEasingUpdate'
> => ({
  animationDurationUpdate: 1500,
  animationEasingUpdate: 'cubicInOut',
})

/** Stable category names for a fixed slot count. ECharts diffs category-axis
 *  data by name: when a range switch emits differently-named categories only
 *  the overlapping names morph and the rest re-enter (the chart "flows in").
 *  Feeding the same slot names across variants pairs every point 1:1, so the
 *  whole shape morphs in place — the recharts look. Pair with `resample` when
 *  the variant's point count differs from the slot count. */
export const slotIds = (count: number): ReadonlyArray<string> =>
  Array.from({ length: count }, (_, index) => `s${index}`)

/** Evenly resample a numeric series onto a fixed slot count so merge-mode
 *  morphs keep a point for every slot — endpoints stay exact. */
export const resample = (
  values: ReadonlyArray<number>,
  slots: number,
): Array<number> => {
  if (values.length === slots) return [...values]
  if (values.length === 0) return Array.from({ length: slots }, () => 0)
  const last = values.length - 1
  return Array.from({ length: slots }, (_, index) => {
    const position = (index * last) / (slots - 1)
    const lo = Math.floor(position)
    const hi = Math.min(lo + 1, last)
    return (
      (values[lo] ?? 0) +
      ((values[hi] ?? 0) - (values[lo] ?? 0)) * (position - lo)
    )
  })
}

/** Vertical fade used by shadcn's gradient area charts. */
export const areaGradient = (
  color: string,
  config: Readonly<{ from?: number; to?: number }> = {},
): NonNullable<object> => ({
  type: 'linear',
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: colorWithOpacity(color, config.from ?? 0.8) },
    { offset: 1, color: colorWithOpacity(color, config.to ?? 0.1) },
  ],
})

/** Applies opacity to a theme color. Theme colors arrive as resolved rgb()/
 *  rgba() strings (see resolveTheme), so this emits plain rgba() — the only
 *  alpha form zrender's own color parser accepts. Falls back to color-mix for
 *  non-rgb inputs (DOM-rendered contexts only, never canvas). */
export const colorWithOpacity = (color: string, opacity: number): string => {
  const match = color.match(
    /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+[\d.]+)?\s*\)$/,
  )

  return match
    ? `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`
    : `color-mix(in oklab, ${color} ${Math.round(opacity * 100)}%, transparent)`
}

// OPTION BUILDER REGISTRY — cards register at module load, the Mount applies

export type OptionBuilder = (
  theme: ChartTheme,
  variant: string,
) => EChartsOption

const buildersByHostId = new Map<string, OptionBuilder>()

export const registerChart = (hostId: string, builder: OptionBuilder): void => {
  buildersByHostId.set(hostId, builder)
}

// HOST BRIDGE — live chart instances keyed by host id (sanctioned escape hatch)

const chartsByHostId = new Map<string, echarts.EChartsType>()

// Dev-only escape hatch for debugging chart instances from the console/tests.
if (import.meta.env?.DEV === true && typeof window !== 'undefined') {
  Object.assign(window, { __charts: chartsByHostId })
}

const applyOption = (
  hostId: string,
  chart: echarts.EChartsType,
  variant: string,
): void => {
  const builder = buildersByHostId.get(hostId)
  if (builder) {
    const element = chart.getDom()
    /* Merge mode (notMerge omitted): ECharts diffs the option and runs its
       update animation — points/bars morph to the new data the way recharts
       tweens on a data prop swap. notMerge:true rebuilt every component and
       replayed the entrance animation on each SyncChart, which read as the
       chart "dropping in" on every timeframe change. Builders must emit a
       stable component shape across variants (hide a series with data:[],
       don't remove its entry). */
    chart.setOption(builder(resolveTheme(element), variant))
  }
}

const observeTheme = (
  element: HTMLElement,
  onChange: () => void,
): MutationObserver => {
  const observer = new MutationObserver(onChange)
  let ancestor: HTMLElement | null = element
  while (ancestor !== null) {
    observer.observe(ancestor, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    })
    if (ancestor === document.documentElement) break
    ancestor = ancestor.parentElement
  }
  return observer
}

// MESSAGES

export const ChartMessage = defineMessageUnion({
  ChartMounted: { hostId: S.String },
  ChartMountFailed: { reason: S.String },
  CompletedSyncChart: {},
})
export type ChartMessage = typeof ChartMessage.Type

// COMMANDS + MOUNT

/** Re-applies the registered builder with a new variant key (e.g. the
 *  interactive charts' time-range selection). */
export const SyncChart = Command.define('SyncChart', {
  args: { hostId: S.String, variant: S.String },
  messages: [ChartMessage.CompletedSyncChart],
  execute: ({ hostId, variant }) =>
    Effect.sync(() => {
      const chart = chartsByHostId.get(hostId)
      if (chart) {
        applyOption(hostId, chart, variant)
      }
      return ChartMessage.CompletedSyncChart()
    }),
})

export const MountChart = Mount.define('MountChart', {
  args: { hostId: S.String, variant: S.String },
  messages: [ChartMessage.ChartMounted, ChartMessage.ChartMountFailed],
  execute: ({ element, hostId, variant }) =>
    Effect.gen(function* () {
      if (!(element instanceof HTMLElement)) {
        return ChartMessage.ChartMountFailed({
          reason: 'Chart host is not an HTMLElement.',
        })
      }

      /* Canvas text metrics must be measured after webfonts resolve —
         mounting earlier races Inter's load and leaves axis/legend labels
         laid out with the metric-fallback font (shifted ~1px). */
      yield* Effect.promise(() => document.fonts.ready)

      return yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: async () => {
            const echartsRuntime = await loadECharts()
            const chart = echartsRuntime.init(element, undefined, {
              renderer: 'canvas',
            })
            let resizeFrame = 0
            let themeFrame = 0
            const resizeObserver = new ResizeObserver(() => {
              cancelAnimationFrame(resizeFrame)
              resizeFrame = requestAnimationFrame(() => chart.resize())
            })
            let lastTheme = JSON.stringify(resolveTheme(element))
            const themeObserver = observeTheme(element, () => {
              cancelAnimationFrame(themeFrame)
              themeFrame = requestAnimationFrame(() => {
                const theme = resolveTheme(element)
                const nextTheme = JSON.stringify(theme)
                if (nextTheme !== lastTheme) {
                  lastTheme = nextTheme
                  const builder = buildersByHostId.get(hostId)
                  if (builder) chart.setOption(builder(theme, variant))
                }
              })
            })
            resizeObserver.observe(element)
            chartsByHostId.set(hostId, chart)
            applyOption(hostId, chart, variant)
            return {
              chart,
              resizeFrame: () => resizeFrame,
              themeFrame: () => themeFrame,
              resizeObserver,
              themeObserver,
            }
          },
          catch: error =>
            error instanceof Error
              ? error
              : new Error(`Chart mount failed: ${error}`),
        }),
        ({ chart, resizeFrame, themeFrame, resizeObserver, themeObserver }) =>
          Effect.sync(() => {
            cancelAnimationFrame(resizeFrame())
            cancelAnimationFrame(themeFrame())
            resizeObserver.disconnect()
            themeObserver.disconnect()
            chart.dispose()
            chartsByHostId.delete(hostId)
          }),
      ).pipe(
        Effect.map(() => ChartMessage.ChartMounted({ hostId })),
        Effect.catch(error =>
          Effect.succeed(
            ChartMessage.ChartMountFailed({ reason: error.message }),
          ),
        ),
      )
    }),
})

// VIEW

export type ChartProps<Msg> = Readonly<{
  hostId: string
  ariaLabel: string
  accessibleAlternative?: Html
  toMessage: (message: ChartMessage) => Msg
  variant?: string
  state?: 'ready' | 'loading' | 'empty' | 'error'
  statusText?: string
  class?: string
  dataSize?: string
}>

export const chart = <Msg>(
  props: ChartProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const state = props.state ?? 'ready'
  const statusText =
    props.statusText ??
    (state === 'loading'
      ? 'Loading chart…'
      : state === 'empty'
        ? 'No chart data available.'
        : state === 'error'
          ? 'Chart could not be loaded.'
          : '')
  return h.div(
    [
      h.DataAttribute('slot', 'echart-region'),
      h.Class(cn('w-full', props.class)),
    ],
    [
      ...(state === 'ready'
        ? [
            h.div(
              [
                h.DataAttribute('slot', 'echart'),
                ...(props.dataSize === undefined
                  ? []
                  : [h.DataAttribute('size', props.dataSize)]),
                h.Class('aspect-video w-full'),
                h.Role('img'),
                h.AriaLabel(props.ariaLabel),
                h.OnMount(
                  Mount.mapMessage(
                    MountChart({
                      hostId: props.hostId,
                      variant: props.variant ?? '',
                    }),
                    props.toMessage,
                  ),
                ),
              ],
              [],
            ),
          ]
        : [
            h.p(
              [
                h.DataAttribute('slot', `echart-${state}`),
                h.Role(state === 'error' ? 'alert' : 'status'),
                ...(state === 'loading' ? [h.AriaBusy(true)] : []),
                h.Class(
                  'flex aspect-video w-full items-center justify-center text-sm text-muted-foreground',
                ),
              ],
              [statusText],
            ),
          ]),
      h.div(
        [
          h.DataAttribute('slot', 'echart-accessible-alternative'),
          h.Class(state === 'ready' ? 'sr-only' : 'mt-3'),
        ],
        [props.accessibleAlternative ?? h.p([], [props.ariaLabel])],
      ),
    ],
  )
}
