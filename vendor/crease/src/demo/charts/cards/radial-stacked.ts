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

const HOST_ID = 'chart-radial-stacked'
const MOBILE = 570
const DESKTOP = 1260
const TOTAL = MOBILE + DESKTOP

Chart.registerChart(HOST_ID, (theme): EChartsOption => ({
  polar: {
    center: ['50%', '58%'],
    radius: ['64%', '88%'],
  },
  angleAxis: {
    type: 'value',
    min: 0,
    max: TOTAL,
    startAngle: 180,
    endAngle: 0,
    show: false,
  },
  radiusAxis: {
    type: 'category',
    data: ['January'],
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
  },
  tooltip: Chart.tooltipOptions(theme, { trigger: 'item' }),
  series: [
    {
      name: 'Mobile',
      type: 'bar',
      coordinateSystem: 'polar',
      stack: 'total',
      roundCap: true,
      barWidth: '100%',
      itemStyle: {
        color: theme.chart2,
        borderColor: theme.background,
        borderWidth: 2,
      },
      data: [MOBILE],
    },
    {
      name: 'Desktop',
      type: 'bar',
      coordinateSystem: 'polar',
      stack: 'total',
      roundCap: true,
      barWidth: '100%',
      itemStyle: {
        color: theme.chart1,
        borderColor: theme.background,
        borderWidth: 2,
      },
      data: [DESKTOP],
    },
    {
      type: 'pie',
      center: ['50%', '58%'],
      radius: ['0%', '0%'],
      silent: true,
      tooltip: { show: false },
      labelLine: { show: false },
      label: {
        show: true,
        position: 'center',
        formatter: `{value|${TOTAL.toLocaleString('en-US')}}\n{label|Visitors}`,
        rich: {
          value: {
            color: theme.foreground,
            fontFamily: theme.fontFamily,
            fontSize: 24,
            fontWeight: 'bold',
            lineHeight: 30,
          },
          label: {
            color: theme.mutedForeground,
            fontFamily: theme.fontFamily,
            fontSize: 14,
            lineHeight: 20,
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
              cardTitle({ children: ['Radial Chart - Stacked'] }, h),
              cardDescription({ children: ['January - June 2024'] }, h),
            ],
          },
          h,
        ),
        cardContent(
          {
            class: 'flex flex-1 items-center pb-0',
            children: [
              Chart.chart(
                {
                  hostId: HOST_ID,
                  ariaLabel:
                    'Stacked radial chart showing 570 mobile and 1,260 desktop visitors',
                  toMessage,
                  class: 'mx-auto aspect-square w-full max-w-[250px]',
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
