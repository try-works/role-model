import type { EChartsOption } from 'echarts/types/dist/shared'
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

const HOST_ID = 'chart-line-label-custom'

const BROWSERS = ['chrome', 'safari', 'firefox', 'edge', 'other']

Chart.registerChart(HOST_ID, (theme): EChartsOption => ({
  grid: Chart.compactGrid({ top: 36, left: 24, right: 24 }),
  xAxis: {
    type: 'category',
    data: [...BROWSERS],
    boundaryGap: false,
    show: false,
  },
  yAxis: Chart.valueAxis(theme),
  tooltip: Chart.tooltipOptions(theme),
  series: [
    {
      name: 'Visitors',
      type: 'line',
      smooth: 0.4,
      showSymbol: true,
      symbolSize: 8,
      emphasis: { scale: 1.5 },
      lineStyle: { width: 2, color: theme.chart2 },
      itemStyle: { color: theme.chart2 },
      label: {
        show: true,
        position: 'top',
        distance: 12,
        fontSize: 12,
        color: theme.foreground,
      },
      data: [
        { value: 275, label: { formatter: 'Chrome' } },
        { value: 200, label: { formatter: 'Safari' } },
        { value: 187, label: { formatter: 'Firefox' } },
        { value: 173, label: { formatter: 'Edge' } },
        { value: 90, label: { formatter: 'Other' } },
      ],
    },
  ],
}))

export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Line Chart - Custom Label'] }, h),
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
                  hostId: HOST_ID,
                  ariaLabel:
                    'Line chart with custom browser labels showing visitors',
                  toMessage,
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
