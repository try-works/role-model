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

const HOST_ID = 'chart-radial-text'

Chart.registerChart(HOST_ID, (theme): EChartsOption => ({
  polar: {
    radius: ['64%', '76%'],
  },
  angleAxis: {
    type: 'value',
    min: 0,
    max: 200,
    startAngle: 0,
    endAngle: 250,
    show: false,
  },
  radiusAxis: {
    type: 'category',
    data: ['Safari'],
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
  },
  series: [
    {
      name: 'Visitors',
      type: 'bar',
      coordinateSystem: 'polar',
      roundCap: true,
      barWidth: '100%',
      showBackground: true,
      backgroundStyle: {
        color: Chart.colorWithOpacity(theme.mutedForeground, 0.14),
      },
      itemStyle: { color: theme.chart2 },
      data: [200],
    },
    {
      type: 'pie',
      radius: ['0%', '0%'],
      silent: true,
      tooltip: { show: false },
      labelLine: { show: false },
      label: {
        show: true,
        position: 'center',
        formatter: '{value|200}\n{label|Visitors}',
        rich: {
          value: {
            color: theme.foreground,
            fontFamily: theme.fontFamily,
            fontSize: 36,
            fontWeight: 'bold',
            lineHeight: 42,
          },
          label: {
            color: theme.mutedForeground,
            fontFamily: theme.fontFamily,
            fontSize: 14,
            lineHeight: 22,
          },
        },
      },
      data: [1],
    },
  ],
}))

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
              cardTitle({ children: ['Radial Chart - Text'] }, h),
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
                  ariaLabel: 'Radial chart showing 200 visitors',
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
