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

const HOST_ID = 'chart-line-dots-custom'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June']
const DESKTOP = [186, 305, 237, 73, 209, 214]

Chart.registerChart(HOST_ID, (theme): EChartsOption => ({
  grid: Chart.compactGrid(),
  xAxis: Chart.categoryAxis(
    theme,
    MONTHS.map(month => month.slice(0, 3)),
  ),
  yAxis: Chart.valueAxis(theme),
  tooltip: Chart.tooltipOptions(theme),
  series: [
    {
      name: 'Desktop',
      type: 'line',
      smooth: 0.4,
      showSymbol: true,
      // PORT NOTE: ECharts cannot render a foldkit/Lucide Html node as a
      // point, so GitCommitVertical is approximated with an equivalent
      // compact vertical-commit vector path.
      symbol:
        'path://M10 0h4v7.1a5 5 0 1 1-4 0V0zm2 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-2 8h4v7h-4z',
      symbolSize: 24,
      lineStyle: { width: 2, color: theme.chart1 },
      itemStyle: { color: theme.chart1 },
      data: [...DESKTOP],
    },
  ],
}))

export const view = <Msg>(
  toMessage: (message: Chart.ChartMessage) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Line Chart - Custom Dots'] }, h),
              cardDescription({ children: ['January - June 2024'] }, h),
            ],
          },
          h,
        ),
        cardContent(
          {
            children: [
              Chart.chart(
                {
                  hostId: HOST_ID,
                  ariaLabel:
                    'Line chart with custom dots showing desktop visitors from January to June 2024',
                  toMessage,
                },
                h,
              ),
            ],
          },
          h,
        ),
        cardFooter(
          {
            class: 'flex-col items-start gap-2 text-sm',
            children: [
              h.div(
                [h.Class('flex gap-2 leading-none font-medium')],
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
