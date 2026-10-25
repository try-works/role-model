import type { EChartsOption } from 'echarts/types/dist/shared'
import type { TooltipComponentFormatterCallbackParams } from 'echarts/types/src/export/option.js'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Chart from '@/lib/echarts'
import * as Icon from '@/lib/icon'
import {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/ui/card'

const HOST_ID = 'chart-bar-default'

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June']
export const DESKTOP = [186, 305, 237, 73, 209, 214]

export const barTooltip = (
  theme: Chart.ChartTheme,
  config: Readonly<{
    hideLabel?: boolean
    indicator?: 'square' | 'line' | 'dashed' | 'none'
  }> = {},
): NonNullable<EChartsOption['tooltip']> => ({
  ...Chart.tooltipOptions(theme),
  formatter: (params: TooltipComponentFormatterCallbackParams) => {
    const rows = Array.isArray(params) ? params : [params]
    const heading = config.hideLabel ? '' : (rows[0]?.name ?? '')
    const headingHtml = heading
      ? `<div style="font-weight:500;margin-bottom:4px;color:var(--foreground)">${heading}</div>`
      : ''
    const body = rows
      .map(row => {
        const color = typeof row.color === 'string' ? row.color : theme.chart1
        const indicator =
          config.indicator === 'none'
            ? ''
            : config.indicator === 'line'
              ? `<span style="width:3px;height:18px;border-radius:2px;background:${color};flex-shrink:0"></span>`
              : config.indicator === 'dashed'
                ? `<span style="width:10px;height:0;border-top:2px dashed ${color};flex-shrink:0"></span>`
                : `<span style="width:10px;height:10px;border-radius:2.5px;background:${color};flex-shrink:0"></span>`
        return `<div style="display:flex;align-items:center;gap:6px;min-width:8rem">
          ${indicator}<span style="color:var(--muted-foreground)">${row.seriesName ?? row.name}</span>
          <span style="margin-left:auto;font-variant-numeric:tabular-nums;font-weight:500;color:var(--foreground)">${typeof row.value === 'number' || typeof row.value === 'string' ? row.value : ''}</span>
        </div>`
      })
      .join('')
    return `${headingHtml}${body}`
  },
})

Chart.registerChart(HOST_ID, (theme): EChartsOption => ({
  grid: Chart.compactGrid(),
  xAxis: Chart.categoryAxis(
    theme,
    MONTHS.map(month => month.slice(0, 3)),
    { boundaryGap: true },
  ),
  yAxis: Chart.valueAxis(theme),
  tooltip: barTooltip(theme, { hideLabel: true }),
  series: [
    {
      name: 'Desktop',
      type: 'bar',
      itemStyle: { color: theme.chart1, borderRadius: 8 },
      data: [...DESKTOP],
    },
  ],
}))

export const standardBarCard = <Msg>(
  props: Readonly<{
    hostId: string
    title: string
    ariaLabel: string
    toMessage: (message: Chart.ChartMessage) => Msg
  }>,
  h: HtmlBuilder<Msg>,
): Html => {
  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: [props.title] }, h),
              cardDescription({ children: ['January - June 2024'] }, h),
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
                  ariaLabel: props.ariaLabel,
                  toMessage: props.toMessage,
                },
                h,
              ),
            ],
          },
          h,
        ),
        cardFooter(
          {
            class: 'flex-col items-start gap-2 text-sm',
            children: [
              h.div(
                [h.Class('flex gap-2 leading-none font-medium')],
                [
                  'Trending up by 5.2% this month',
                  Icon.icon<Msg>('trending-up', { class: 'h-4 w-4' }, h),
                ],
              ),
              h.div(
                [h.Class('leading-none text-muted-foreground')],
                ['Showing total visitors for the last 6 months'],
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}

export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  standardBarCard(
    {
      hostId: HOST_ID,
      title: 'Bar Chart',
      ariaLabel:
        'Bar chart showing desktop visitors from January through June 2024',
      toMessage,
    },
    h,
  )
