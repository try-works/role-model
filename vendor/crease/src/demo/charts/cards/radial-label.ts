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

const HOST_ID = 'chart-radial-label'

Chart.registerChart(HOST_ID, (theme): EChartsOption => {
  const data = [
    { name: 'Chrome', value: 275, itemStyle: { color: theme.chart1 } },
    { name: 'Safari', value: 200, itemStyle: { color: theme.chart2 } },
    { name: 'Firefox', value: 187, itemStyle: { color: theme.chart3 } },
    { name: 'Edge', value: 173, itemStyle: { color: theme.chart4 } },
    { name: 'Other', value: 90, itemStyle: { color: theme.chart5 } },
  ]

  return {
    polar: { radius: ['25%', '92%'] },
    angleAxis: {
      type: 'value',
      min: 0,
      max: 300,
      startAngle: -90,
      endAngle: 270,
      show: false,
    },
    radiusAxis: {
      type: 'category',
      data: data.map(item => item.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
    },
    tooltip: Chart.tooltipOptions(theme, { trigger: 'item' }),
    series: [
      {
        name: 'Visitors',
        type: 'bar',
        coordinateSystem: 'polar',
        roundCap: true,
        barWidth: '65%',
        showBackground: true,
        backgroundStyle: {
          color: Chart.colorWithOpacity(theme.mutedForeground, 0.12),
        },
        label: {
          show: true,
          position: 'insideStart',
          distance: 8,
          rotate: 0,
          color: theme.background,
          fontSize: 11,
          fontFamily: theme.fontFamily,
          formatter: params => String(params.name).toLowerCase(),
        },
        data,
      },
    ],
  }
})

export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  return card(
    {
      class: 'flex flex-col',
      children: [
        cardHeader(
          {
            class: 'items-center pb-0',
            children: [
              cardTitle({ children: ['Radial Chart - Label'] }, h),
              cardDescription({ children: ['January - June 2024'] }, h),
            ],
          },
          h,
        ),
        cardContent(
          {
            class: 'flex-1 pb-0',
            children: [
              Chart.chart(
                {
                  hostId: HOST_ID,
                  ariaLabel: 'Radial chart with browser labels',
                  toMessage,
                  class: 'mx-auto aspect-square max-h-[250px]',
                },
                h,
              ),
            ],
          },
          h,
        ),
        cardFooter(
          {
            class: 'flex-col gap-2 text-sm',
            children: [
              h.div(
                [h.Class('flex items-center gap-2 leading-none font-medium')],
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
