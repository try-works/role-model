import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import { Mount } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as ECharts from '@/lib/echarts'

import type { ComponentLayoutStyle } from '../contracts'
import { className } from '../style'
import { tokens } from '../tokens.stylex'

export type ChartMessage = ECharts.ChartMessage
export const ChartMessage = ECharts.ChartMessage
export type ChartTheme = ECharts.ChartTheme
export type OptionBuilder = ECharts.OptionBuilder

export const areaGradient = ECharts.areaGradient
export const categoryAxis = ECharts.categoryAxis
export const colorWithOpacity = ECharts.colorWithOpacity
export const compactGrid = ECharts.compactGrid
export const registerChart = ECharts.registerChart
export const legendOptions = ECharts.legendOptions
export const tooltipOptions = ECharts.tooltipOptions
export const updateAnimation = ECharts.updateAnimation
/** @deprecated Use legendOptions. */
export const shadcnLegend = ECharts.shadcnLegend
/** @deprecated Use tooltipOptions. */
export const shadcnTooltip = ECharts.shadcnTooltip
export const SyncChart = ECharts.SyncChart
export const valueAxis = ECharts.valueAxis

export type EChartSize =
  | 'default'
  | 'compact'
  | 'dashboard'
  | 'spark'
  | 'square'
  | 'wide'

export type EChartProps<Message> = Readonly<{
  ariaLabel: string
  accessibleAlternative: Html
  hostId: string
  layoutStyle?: ComponentLayoutStyle
  size?: EChartSize
  toMessage: (message: ChartMessage) => Message
  variant?: string
  state?: 'ready' | 'loading' | 'empty' | 'error'
  statusText?: string
}>

const styles = stylex.create({
  dashboard: { height: '16rem' },
  compact: {
    aspectRatio: '16 / 7',
    minHeight: '12rem',
  },
  default: {
    aspectRatio: '16 / 9',
    minHeight: '14rem',
  },
  host: {
    display: 'block',
    width: '100%',
  },
  alternative: { marginTop: '0.75rem' },
  alternativeHidden: {
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
  status: {
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    fontSize: '0.875rem',
    justifyContent: 'center',
    lineHeight: '1.25rem',
  },
  spark: {
    height: '3.5rem',
  },
  square: {
    marginInline: 'auto',
    aspectRatio: '1 / 1',
    maxHeight: '18rem',
  },
  wide: {
    aspectRatio: '2 / 1',
    minHeight: '16rem',
  },
})

const sizeStyles = {
  dashboard: styles.dashboard,
  compact: styles.compact,
  default: styles.default,
  spark: styles.spark,
  square: styles.square,
  wide: styles.wide,
} as const

export const eChart = <Message>(
  props: EChartProps<Message>,
  h: HtmlBuilder<Message>,
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
    [h.DataAttribute('slot', 'echart-region')],
    [
      ...(state === 'ready'
        ? [
            h.div(
              [
                h.DataAttribute('slot', 'echart'),
                h.DataAttribute('size', props.size ?? 'default'),
                h.Role('img'),
                h.AriaLabel(props.ariaLabel),
                h.Class(
                  className(
                    styles.host,
                    sizeStyles[props.size ?? 'default'],
                    props.layoutStyle,
                  ),
                ),
                h.OnMount(
                  Mount.mapMessage(
                    ECharts.MountChart({
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
                  className(
                    reset.text,
                    styles.host,
                    styles.status,
                    sizeStyles[props.size ?? 'default'],
                  ),
                ),
              ],
              [statusText],
            ),
          ]),
      h.div(
        [
          h.DataAttribute('slot', 'echart-accessible-alternative'),
          h.Class(
            className(
              state === 'ready' ? styles.alternativeHidden : styles.alternative,
            ),
          ),
        ],
        [props.accessibleAlternative],
      ),
    ],
  )
}
