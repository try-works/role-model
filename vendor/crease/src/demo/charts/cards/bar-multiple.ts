import type { HtmlBuilder } from 'foldkit/html'
import type { EChartsOption } from 'echarts/types/dist/shared'

import * as Chart from '@/lib/echarts'
import {
  MONTHS,
  barTooltip,
  standardBarCard,
} from '@/demo/charts/cards/bar-default'

const HOST_ID = 'chart-bar-multiple'
const DESKTOP = [186, 305, 237, 73, 209, 214]
const MOBILE = [80, 200, 120, 190, 130, 140]

Chart.registerChart(HOST_ID, (theme): EChartsOption => ({
  grid: Chart.compactGrid(),
  xAxis: Chart.categoryAxis(
    theme,
    MONTHS.map(month => month.slice(0, 3)),
    { boundaryGap: true },
  ),
  yAxis: Chart.valueAxis(theme),
  tooltip: barTooltip(theme, { indicator: 'dashed' }),
  series: [
    {
      name: 'Desktop',
      type: 'bar',
      itemStyle: { color: theme.chart1, borderRadius: 4 },
      data: [...DESKTOP],
    },
    {
      name: 'Mobile',
      type: 'bar',
      itemStyle: { color: theme.chart2, borderRadius: 4 },
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
      title: 'Bar Chart - Multiple',
      ariaLabel: 'Grouped bar chart comparing desktop and mobile visitors',
      toMessage,
    },
    h,
  )
