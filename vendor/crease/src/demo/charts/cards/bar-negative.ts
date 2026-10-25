import type { HtmlBuilder } from 'foldkit/html'
import type { EChartsOption } from 'echarts/types/dist/shared'

import * as Chart from '@/lib/echarts'
import {
  MONTHS,
  barTooltip,
  standardBarCard,
} from '@/demo/charts/cards/bar-default'

const HOST_ID = 'chart-bar-negative'
const VISITORS = [186, 205, -207, 173, -209, 214]

Chart.registerChart(HOST_ID, (theme): EChartsOption => ({
  grid: Chart.compactGrid({ top: 32 }),
  xAxis: Chart.categoryAxis(
    theme,
    MONTHS.map(month => month.slice(0, 3)),
    { boundaryGap: true },
  ),
  yAxis: Chart.valueAxis(theme),
  tooltip: barTooltip(theme, { hideLabel: true, indicator: 'none' }),
  series: [
    {
      name: 'Visitors',
      type: 'bar',
      label: {
        show: true,
        position: 'top',
        color: theme.foreground,
        formatter: params => MONTHS[params.dataIndex] ?? '',
      },
      data: VISITORS.map(value => ({
        value,
        itemStyle: { color: value > 0 ? theme.chart1 : theme.chart2 },
      })),
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
      title: 'Bar Chart - Negative',
      ariaLabel: 'Bar chart showing positive and negative visitor values',
      toMessage,
    },
    h,
  )
