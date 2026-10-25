import type { HtmlBuilder } from 'foldkit/html'
import type { EChartsOption } from 'echarts/types/dist/shared'

import * as Chart from '@/lib/echarts'
import {
  MONTHS,
  barTooltip,
  standardBarCard,
} from '@/demo/charts/cards/bar-default'

const HOST_ID = 'chart-bar-stacked'
const DESKTOP = [186, 305, 237, 73, 209, 214]
const MOBILE = [80, 200, 120, 190, 130, 140]

Chart.registerChart(HOST_ID, (theme): EChartsOption => ({
  grid: Chart.compactGrid({ bottom: 42 }),
  xAxis: Chart.categoryAxis(
    theme,
    MONTHS.map(month => month.slice(0, 3)),
    { boundaryGap: true },
  ),
  yAxis: Chart.valueAxis(theme),
  tooltip: barTooltip(theme, { hideLabel: true }),
  legend: Chart.legendOptions(theme),
  series: [
    {
      name: 'Desktop',
      type: 'bar',
      stack: 'total',
      itemStyle: { color: theme.chart1, borderRadius: [0, 0, 4, 4] },
      data: [...DESKTOP],
    },
    {
      name: 'Mobile',
      type: 'bar',
      stack: 'total',
      itemStyle: { color: theme.chart2, borderRadius: [4, 4, 0, 0] },
      data: [...MOBILE],
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
      title: 'Bar Chart - Stacked + Legend',
      ariaLabel:
        'Stacked bar chart with legend comparing desktop and mobile visitors',
      toMessage,
    },
    h,
  )
