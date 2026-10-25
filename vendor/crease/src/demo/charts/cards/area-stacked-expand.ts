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

const HOST_ID = 'chart-area-stacked-expand'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June']
const RAW = [
  { desktop: 186, mobile: 80, other: 45 },
  { desktop: 305, mobile: 200, other: 100 },
  { desktop: 237, mobile: 120, other: 150 },
  { desktop: 73, mobile: 190, other: 50 },
  { desktop: 209, mobile: 130, other: 100 },
  { desktop: 214, mobile: 140, other: 160 },
] as const

const share = (
  row: (typeof RAW)[number],
  key: 'desktop' | 'mobile' | 'other',
): number => row[key] / (row.desktop + row.mobile + row.other)

Chart.registerChart(HOST_ID, (theme): EChartsOption => ({
  grid: Chart.compactGrid({ top: 12 }),
  xAxis: Chart.categoryAxis(
    theme,
    MONTHS.map(month => month.slice(0, 3)),
  ),
  yAxis: {
    type: 'value',
    max: 1,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      show: false,
      formatter: (value: number) => `${Math.round(value * 100)}%`,
    },
    splitLine: { lineStyle: { color: theme.border, type: 'dashed' } },
  },
  tooltip: {
    ...Chart.tooltipOptions(theme),
    valueFormatter: value => `${Math.round(Number(value) * 100)}%`,
  },
  series: [
    {
      name: 'Other',
      type: 'line',
      smooth: 0.4,
      stack: 'total',
      showSymbol: false,
      lineStyle: { width: 2, color: theme.chart3 },
      itemStyle: { color: theme.chart3 },
      areaStyle: { color: Chart.colorWithOpacity(theme.chart3, 0.1) },
      data: RAW.map(row => share(row, 'other')),
    },
    {
      name: 'Mobile',
      type: 'line',
      smooth: 0.4,
      stack: 'total',
      showSymbol: false,
      lineStyle: { width: 2, color: theme.chart2 },
      itemStyle: { color: theme.chart2 },
      areaStyle: { color: Chart.colorWithOpacity(theme.chart2, 0.4) },
      data: RAW.map(row => share(row, 'mobile')),
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
      data: RAW.map(row => share(row, 'desktop')),
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
              cardTitle({ children: ['Area Chart - Stacked Expanded'] }, h),
              cardDescription(
                {
                  children: ['Showing total visitors for the last 6months'],
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
                    'Expanded stacked area chart showing visitor shares for the last 6 months',
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
