import type { HtmlBuilder } from 'foldkit/html'
import type { EChartsOption } from 'echarts/types/dist/shared'

import * as Chart from '@/lib/echarts'
import {
  DESKTOP,
  MONTHS,
  barTooltip,
  standardBarCard,
} from '@/demo/charts/cards/bar-default'

const HOST_ID = 'chart-bar-horizontal'

Chart.registerChart(HOST_ID, (theme): EChartsOption => ({
  grid: Chart.compactGrid({ left: 0 }),
  xAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
    splitLine: { show: false },
  },
  yAxis: {
    type: 'category',
    data: MONTHS.map(month => month.slice(0, 3)),
    inverse: true,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: theme.mutedForeground,
      fontSize: 12,
      fontFamily: theme.fontFamily,
      margin: 10,
    },
  },
  tooltip: barTooltip(theme, { hideLabel: true }),
  series: [
    {
      name: 'Desktop',
      type: 'bar',
      itemStyle: { color: theme.chart1, borderRadius: 5 },
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
      title: 'Bar Chart - Horizontal',
      ariaLabel:
        'Horizontal bar chart showing desktop visitors from January through June 2024',
      toMessage,
    },
    h,
  )
