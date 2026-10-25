import type { HtmlBuilder } from 'foldkit/html'
import type { EChartsOption } from 'echarts/types/dist/shared'

import * as Chart from '@/lib/echarts'
import {
  DESKTOP,
  MONTHS,
  barTooltip,
  standardBarCard,
} from '@/demo/charts/cards/bar-default'

const HOST_ID = 'chart-bar-label-custom'

Chart.registerChart(HOST_ID, (theme): EChartsOption => ({
  grid: Chart.compactGrid({ left: 4, right: 36 }),
  xAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
    splitLine: { lineStyle: { color: theme.border, type: 'dashed' } },
  },
  yAxis: {
    type: 'category',
    data: [...MONTHS],
    inverse: true,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
  },
  tooltip: barTooltip(theme, { indicator: 'line' }),
  series: [
    {
      name: 'Desktop',
      type: 'bar',
      itemStyle: { color: theme.chart2, borderRadius: 4 },
      label: {
        show: true,
        position: 'insideLeft',
        distance: 8,
        fontSize: 12,
        color: theme.background,
        formatter: params => MONTHS[params.dataIndex] ?? '',
      },
      data: [...DESKTOP],
    },
    {
      name: 'Desktop values',
      type: 'bar',
      barGap: '-100%',
      itemStyle: { color: 'transparent' },
      label: {
        show: true,
        position: 'right',
        distance: 8,
        fontSize: 12,
        color: theme.foreground,
      },
      tooltip: { show: false },
      silent: true,
      data: [...DESKTOP],
    },
  ],
}))

export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  standardBarCard(
    {
      hostId: HOST_ID,
      title: 'Bar Chart - Custom Label',
      ariaLabel: 'Horizontal bar chart with custom month and visitor labels',
      toMessage,
    },
    h,
  )
