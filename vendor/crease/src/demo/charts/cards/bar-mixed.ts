import type { HtmlBuilder } from 'foldkit/html'
import type { EChartsOption } from 'echarts/types/dist/shared'

import * as Chart from '@/lib/echarts'
import { barTooltip, standardBarCard } from '@/demo/charts/cards/bar-default'

const HOST_ID = 'chart-bar-mixed'
const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other']
const VALUES = [275, 200, 187, 173, 90]

Chart.registerChart(HOST_ID, (theme): EChartsOption => {
  const colors = [
    theme.chart1,
    theme.chart2,
    theme.chart3,
    theme.chart4,
    theme.chart5,
  ]
  return {
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
      data: [...BROWSERS],
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
        name: 'Visitors',
        type: 'bar',
        itemStyle: { borderRadius: 5 },
        data: VALUES.map((value, index) => ({
          value,
          itemStyle: { color: colors[index] ?? theme.chart1 },
        })),
      },
    ],
  }
})

export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  standardBarCard(
    {
      hostId: HOST_ID,
      title: 'Bar Chart - Mixed',
      ariaLabel: 'Horizontal bar chart showing visitors by browser',
      toMessage,
    },
    h,
  )
