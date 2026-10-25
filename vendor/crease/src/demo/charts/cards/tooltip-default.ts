import type { EChartsOption } from 'echarts/types/dist/shared'
import type { TooltipComponentFormatterCallbackParams } from 'echarts/types/src/export/option.js'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Chart from '@/lib/echarts'
import {
  card,
  cardContent,
  cardDescription,
  cardHeader,
  cardTitle,
} from '@/ui/card'

const HOST_ID = 'chart-tooltip-default'
const DATES = [
  '2024-07-15',
  '2024-07-16',
  '2024-07-17',
  '2024-07-18',
  '2024-07-19',
  '2024-07-20',
]
const RUNNING = [450, 380, 520, 140, 600, 480]
const SWIMMING = [300, 420, 120, 550, 350, 400]

export type TooltipMode =
  | 'default'
  | 'label-custom'
  | 'label-formatter'
  | 'label-none'
  | 'formatter'
  | 'icons'
  | 'line'
  | 'none'
  | 'advanced'

const weekday = (date: string): string =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))

const longDate = (date: string): string =>
  new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))

const rowsFrom = (params: TooltipComponentFormatterCallbackParams) =>
  Array.isArray(params) ? params : [params]

const valueText = (value: unknown): string =>
  typeof value === 'number' || typeof value === 'string' ? String(value) : ''

const tooltip = (
  theme: Chart.ChartTheme,
  mode: TooltipMode,
): NonNullable<EChartsOption['tooltip']> => ({
  ...Chart.tooltipOptions(theme),
  formatter: params => {
    const rows = rowsFrom(params)
    const date = rows[0]?.name ?? ''
    const heading =
      mode === 'label-none' ||
      mode === 'formatter' ||
      mode === 'icons' ||
      mode === 'advanced'
        ? ''
        : mode === 'label-custom'
          ? 'Activities'
          : mode === 'label-formatter'
            ? longDate(date)
            : date
    const headingHtml = heading
      ? `<div style="font-weight:500;margin-bottom:4px;color:var(--foreground)">${heading}</div>`
      : ''

    const rowHtml = rows
      .map((row, index) => {
        const label = row.seriesName ?? row.name
        const value = valueText(row.value)
        const color = label === 'Running' ? theme.chart1 : theme.chart2
        const indicator =
          mode === 'none' || mode === 'label-none' || mode === 'formatter'
            ? ''
            : mode === 'line' || mode === 'label-custom'
              ? `<span style="width:3px;height:18px;border-radius:2px;background:${color};flex-shrink:0"></span>`
              : mode === 'icons'
                ? ''
                : `<span style="width:10px;height:10px;border-radius:2.5px;background:${color};flex-shrink:0"></span>`
        const unit =
          mode === 'formatter' || mode === 'advanced'
            ? '<span style="font-weight:400;color:var(--muted-foreground)">kcal</span>'
            : ''
        const rowContent = `<div style="display:flex;align-items:center;gap:6px;min-width:${mode === 'advanced' ? '160px' : '130px'};color:var(--muted-foreground)">
          ${indicator}<span>${label}</span>
          <span style="margin-left:auto;display:flex;align-items:baseline;gap:2px;font-family:monospace;font-variant-numeric:tabular-nums;font-weight:500;color:var(--foreground)">${value}${unit}</span>
        </div>`
        if (mode !== 'advanced' || index !== rows.length - 1) {
          return rowContent
        }
        const total = rows.reduce((sum, item) => {
          const itemValue = item.value
          return sum + (typeof itemValue === 'number' ? itemValue : 0)
        }, 0)
        return `${rowContent}<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);display:flex;align-items:center;font-weight:500;color:var(--foreground)">
          <span>Total</span><span style="margin-left:auto;font-family:monospace;font-variant-numeric:tabular-nums">${total} <span style="font-weight:400;color:var(--muted-foreground)">kcal</span></span>
        </div>`
      })
      .join('')

    return `${headingHtml}${rowHtml}`
  },
})

export const registerTooltipCard = (hostId: string, mode: TooltipMode): void =>
  Chart.registerChart(hostId, (theme): EChartsOption => ({
    grid: Chart.compactGrid(),
    xAxis: {
      type: 'category',
      data: [...DATES],
      boundaryGap: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: theme.mutedForeground,
        fontSize: 12,
        fontFamily: theme.fontFamily,
        margin: 10,
        formatter: value => weekday(String(value)),
      },
    },
    yAxis: Chart.valueAxis(theme),
    tooltip: tooltip(theme, mode),
    series: [
      {
        name: 'Running',
        type: 'bar',
        stack: 'activities',
        itemStyle: { color: theme.chart1, borderRadius: [0, 0, 4, 4] },
        data: [...RUNNING],
      },
      {
        name: 'Swimming',
        type: 'bar',
        stack: 'activities',
        itemStyle: { color: theme.chart2, borderRadius: [4, 4, 0, 0] },
        data: [...SWIMMING],
      },
    ],
  }))

registerTooltipCard(HOST_ID, 'default')

// PORT NOTE: Recharts' defaultIndex opens a tooltip immediately. ECharts can
// only do that through an imperative showTip action after mount, which the
// option-builder bridge does not expose; hover/focus tooltip content is exact.

export const tooltipCardView = <Msg>(
  props: Readonly<{
    hostId: string
    title: string
    description: string
    toMessage: (message: Chart.ChartMessage) => Msg
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  card(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: [props.title] }, h),
              cardDescription({ children: [props.description] }, h),
            ],
          },
          h,
        ),
        cardContent(
          {
            children: [
              Chart.chart(
                {
                  hostId: props.hostId,
                  ariaLabel: `${props.title}. ${props.description}`,
                  toMessage: props.toMessage,
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )

export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  tooltipCardView(
    {
      hostId: HOST_ID,
      title: 'Tooltip - Default',
      description: 'Default tooltip with ChartTooltipContent.',
      toMessage,
    },
    h,
  )
