import type { HtmlBuilder } from 'foldkit/html'
import type { EChartsOption } from 'echarts/types/dist/shared'

import * as Chart from '@/lib/echarts'
import {
  DESKTOP,
  MONTHS,
  barTooltip,
  standardBarCard,
} from '@/demo/charts/cards/bar-default'

const HOST_ID = 'chart-bar-label'

Chart.registerChart(HOST_ID, (theme): EChartsOption => ({
  grid: Chart.compactGrid({ top: 28 }),
  xAxis: Chart.categoryAxis(
    theme,
    MONTHS.map(month => month.slice(0, 3)),
    { boundaryGap: true },
  ),
  yAxis: Chart.valueAxis(theme),
  tooltip: barTooltip(theme, { hideLabel: true }),
  series: [
    {
      name: 'Desktop',
      type: 'bar',
      itemStyle: { color: theme.chart1, borderRadius: 8 },
      label: {
        show: true,
        position: 'top',
        distance: 12,
        fontSize: 12,
        color: theme.foreground,
      },
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
      title: 'Bar Chart - Label',
      ariaLabel: 'Bar chart with value labels for desktop visitors',
      toMessage,
    },
    h,
  )
