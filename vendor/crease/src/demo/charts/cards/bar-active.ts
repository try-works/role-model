import type { HtmlBuilder } from 'foldkit/html'
import type { EChartsOption } from 'echarts/types/dist/shared'

import * as Chart from '@/lib/echarts'
import { barTooltip, standardBarCard } from '@/demo/charts/cards/bar-default'

const HOST_ID = 'chart-bar-active'
const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other']
const VALUES = [187, 200, 275, 173, 90]

Chart.registerChart(HOST_ID, (theme): EChartsOption => {
  const colors = [
    theme.chart1,
    theme.chart2,
    theme.chart3,
    theme.chart4,
    theme.chart5,
  ]
  return {
    grid: Chart.compactGrid(),
    xAxis: Chart.categoryAxis(theme, BROWSERS, { boundaryGap: true }),
    yAxis: Chart.valueAxis(theme),
    tooltip: barTooltip(theme, { hideLabel: true }),
    series: [
      {
        name: 'Visitors',
        type: 'bar',
        itemStyle: { borderRadius: 8 },
        data: VALUES.map((value, index) => ({
          value,
          itemStyle:
            index === 2
              ? {
                  color: Chart.colorWithOpacity(
                    colors[index] ?? theme.chart3,
                    0.8,
                  ),
                  borderColor: colors[index] ?? theme.chart3,
                  borderWidth: 2,
                  borderType: 'dashed',
                }
              : { color: colors[index] ?? theme.chart1 },
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
      title: 'Bar Chart - Active',
      ariaLabel:
        'Bar chart showing visitors by browser with Firefox highlighted',
      toMessage,
    },
    h,
  )
