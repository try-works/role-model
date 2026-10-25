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

const HOST_ID = 'chart-line-multiple'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June']
const DESKTOP = [186, 305, 237, 73, 209, 214]
const MOBILE = [80, 200, 120, 190, 130, 140]

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
      showSymbol: false,
      lineStyle: { width: 2, color: theme.chart1 },
      itemStyle: { color: theme.chart1 },
      data: [...DESKTOP],
    },
    {
      name: 'Mobile',
      type: 'line',
      smooth: 0.4,
      showSymbol: false,
      lineStyle: { width: 2, color: theme.chart2 },
      itemStyle: { color: theme.chart2 },
      data: [...MOBILE],
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
              cardTitle({ children: ['Line Chart - Multiple'] }, h),
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
                    'Multiple line chart showing desktop and mobile visitors from January to June 2024',
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
            children: [
              h.div(
                [h.Class('flex w-full items-start gap-2 text-sm')],
                [
                  h.div(
                    [h.Class('grid gap-2')],
                    [
                      h.div(
                        [
                          h.Class(
                            'flex items-center gap-2 leading-none font-medium',
                          ),
                        ],
                        [
                          'Trending up by 5.2% this month',
                          Icon.icon<Msg>(
                            'trending-up',
                            { class: 'h-4 w-4' },
                            h,
                          ),
                        ],
                      ),
                      h.div(
                        [
                          h.Class(
                            'flex items-center gap-2 leading-none text-muted-foreground',
                          ),
                        ],
                        ['Showing total visitors for the last 6 months'],
                      ),
                    ],
                  ),
                ],
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
