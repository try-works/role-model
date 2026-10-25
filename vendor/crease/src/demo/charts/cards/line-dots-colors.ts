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

const HOST_ID = 'chart-line-dots-colors'

const BROWSERS = ['chrome', 'safari', 'firefox', 'edge', 'other']

Chart.registerChart(HOST_ID, (theme): EChartsOption => ({
  grid: Chart.compactGrid({ top: 24, left: 24, right: 24 }),
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
      symbolSize: 10,
      lineStyle: { width: 2, color: theme.chart2 },
      data: [
        { value: 275, itemStyle: { color: theme.chart1 } },
        { value: 200, itemStyle: { color: theme.chart2 } },
        { value: 187, itemStyle: { color: theme.chart3 } },
        { value: 173, itemStyle: { color: theme.chart4 } },
        { value: 90, itemStyle: { color: theme.chart5 } },
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
              cardTitle({ children: ['Line Chart - Dots Colors'] }, h),
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
                    'Line chart with colored dots showing visitors by browser',
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
