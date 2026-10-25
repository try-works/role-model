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

const HOST_ID = 'chart-area-icons'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June']
const DESKTOP = [186, 305, 237, 73, 209, 214]
const MOBILE = [80, 200, 120, 190, 130, 140]

Chart.registerChart(HOST_ID, (theme): EChartsOption => ({
  grid: Chart.compactGrid({ bottom: 44 }),
  xAxis: Chart.categoryAxis(
    theme,
    MONTHS.map(month => month.slice(0, 3)),
  ),
  yAxis: Chart.valueAxis(theme),
  tooltip: Chart.tooltipOptions(theme),
  legend: Chart.legendOptions(theme),
  series: [
    {
      name: 'Mobile',
      type: 'line',
      smooth: 0.4,
      stack: 'total',
      showSymbol: false,
      lineStyle: { width: 2, color: theme.chart2 },
      itemStyle: { color: theme.chart2 },
      areaStyle: { color: Chart.colorWithOpacity(theme.chart2, 0.4) },
      data: [...MOBILE],
    },
    {
      name: 'Desktop',
      type: 'line',
      smooth: 0.4,
      stack: 'total',
      showSymbol: false,
      lineStyle: { width: 2, color: theme.chart1 },
      itemStyle: { color: theme.chart1 },
      areaStyle: { color: Chart.colorWithOpacity(theme.chart1, 0.4) },
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
              cardTitle({ children: ['Area Chart - Icons'] }, h),
              cardDescription(
                {
                  children: ['Showing total visitors for the last 6 months'],
                },
                h,
              ),
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
                    'Area chart with a legend showing desktop and mobile visitors for the last 6 months',
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
                        ['January - June 2024'],
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

// PORT NOTE: ECharts' canvas legend cannot render the lucide TrendingDown and
// TrendingUp components used by shadcn, so it uses the matching color markers.
