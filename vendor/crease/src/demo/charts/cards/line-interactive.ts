import type { EChartsOption } from 'echarts/types/dist/shared'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Chart from '@/lib/echarts'
import {
  card,
  cardContent,
  cardDescription,
  cardHeader,
  cardTitle,
} from '@/ui/card'

export const HOST_ID = 'chart-line-interactive'

export type ActiveChart = 'desktop' | 'mobile'

type ChartDatum = Readonly<{
  date: string
  desktop: number
  mobile: number
}>

const CHART_DATA: ReadonlyArray<ChartDatum> = [
  { date: '2024-04-01', desktop: 222, mobile: 150 },
  { date: '2024-04-02', desktop: 97, mobile: 180 },
  { date: '2024-04-03', desktop: 167, mobile: 120 },
  { date: '2024-04-04', desktop: 242, mobile: 260 },
  { date: '2024-04-05', desktop: 373, mobile: 290 },
  { date: '2024-04-06', desktop: 301, mobile: 340 },
  { date: '2024-04-07', desktop: 245, mobile: 180 },
  { date: '2024-04-08', desktop: 409, mobile: 320 },
  { date: '2024-04-09', desktop: 59, mobile: 110 },
  { date: '2024-04-10', desktop: 261, mobile: 190 },
  { date: '2024-04-11', desktop: 327, mobile: 350 },
  { date: '2024-04-12', desktop: 292, mobile: 210 },
  { date: '2024-04-13', desktop: 342, mobile: 380 },
  { date: '2024-04-14', desktop: 137, mobile: 220 },
  { date: '2024-04-15', desktop: 120, mobile: 170 },
  { date: '2024-04-16', desktop: 138, mobile: 190 },
  { date: '2024-04-17', desktop: 446, mobile: 360 },
  { date: '2024-04-18', desktop: 364, mobile: 410 },
  { date: '2024-04-19', desktop: 243, mobile: 180 },
  { date: '2024-04-20', desktop: 89, mobile: 150 },
  { date: '2024-04-21', desktop: 137, mobile: 200 },
  { date: '2024-04-22', desktop: 224, mobile: 170 },
  { date: '2024-04-23', desktop: 138, mobile: 230 },
  { date: '2024-04-24', desktop: 387, mobile: 290 },
  { date: '2024-04-25', desktop: 215, mobile: 250 },
  { date: '2024-04-26', desktop: 75, mobile: 130 },
  { date: '2024-04-27', desktop: 383, mobile: 420 },
  { date: '2024-04-28', desktop: 122, mobile: 180 },
  { date: '2024-04-29', desktop: 315, mobile: 240 },
  { date: '2024-04-30', desktop: 454, mobile: 380 },
  { date: '2024-05-01', desktop: 165, mobile: 220 },
  { date: '2024-05-02', desktop: 293, mobile: 310 },
  { date: '2024-05-03', desktop: 247, mobile: 190 },
  { date: '2024-05-04', desktop: 385, mobile: 420 },
  { date: '2024-05-05', desktop: 481, mobile: 390 },
  { date: '2024-05-06', desktop: 498, mobile: 520 },
  { date: '2024-05-07', desktop: 388, mobile: 300 },
  { date: '2024-05-08', desktop: 149, mobile: 210 },
  { date: '2024-05-09', desktop: 227, mobile: 180 },
  { date: '2024-05-10', desktop: 293, mobile: 330 },
  { date: '2024-05-11', desktop: 335, mobile: 270 },
  { date: '2024-05-12', desktop: 197, mobile: 240 },
  { date: '2024-05-13', desktop: 197, mobile: 160 },
  { date: '2024-05-14', desktop: 448, mobile: 490 },
  { date: '2024-05-15', desktop: 473, mobile: 380 },
  { date: '2024-05-16', desktop: 338, mobile: 400 },
  { date: '2024-05-17', desktop: 499, mobile: 420 },
  { date: '2024-05-18', desktop: 315, mobile: 350 },
  { date: '2024-05-19', desktop: 235, mobile: 180 },
  { date: '2024-05-20', desktop: 177, mobile: 230 },
  { date: '2024-05-21', desktop: 82, mobile: 140 },
  { date: '2024-05-22', desktop: 81, mobile: 120 },
  { date: '2024-05-23', desktop: 252, mobile: 290 },
  { date: '2024-05-24', desktop: 294, mobile: 220 },
  { date: '2024-05-25', desktop: 201, mobile: 250 },
  { date: '2024-05-26', desktop: 213, mobile: 170 },
  { date: '2024-05-27', desktop: 420, mobile: 460 },
  { date: '2024-05-28', desktop: 233, mobile: 190 },
  { date: '2024-05-29', desktop: 78, mobile: 130 },
  { date: '2024-05-30', desktop: 340, mobile: 280 },
  { date: '2024-05-31', desktop: 178, mobile: 230 },
  { date: '2024-06-01', desktop: 178, mobile: 200 },
  { date: '2024-06-02', desktop: 470, mobile: 410 },
  { date: '2024-06-03', desktop: 103, mobile: 160 },
  { date: '2024-06-04', desktop: 439, mobile: 380 },
  { date: '2024-06-05', desktop: 88, mobile: 140 },
  { date: '2024-06-06', desktop: 294, mobile: 250 },
  { date: '2024-06-07', desktop: 323, mobile: 370 },
  { date: '2024-06-08', desktop: 385, mobile: 320 },
  { date: '2024-06-09', desktop: 438, mobile: 480 },
  { date: '2024-06-10', desktop: 155, mobile: 200 },
  { date: '2024-06-11', desktop: 92, mobile: 150 },
  { date: '2024-06-12', desktop: 492, mobile: 420 },
  { date: '2024-06-13', desktop: 81, mobile: 130 },
  { date: '2024-06-14', desktop: 426, mobile: 380 },
  { date: '2024-06-15', desktop: 307, mobile: 350 },
  { date: '2024-06-16', desktop: 371, mobile: 310 },
  { date: '2024-06-17', desktop: 475, mobile: 520 },
  { date: '2024-06-18', desktop: 107, mobile: 170 },
  { date: '2024-06-19', desktop: 341, mobile: 290 },
  { date: '2024-06-20', desktop: 408, mobile: 450 },
  { date: '2024-06-21', desktop: 169, mobile: 210 },
  { date: '2024-06-22', desktop: 317, mobile: 270 },
  { date: '2024-06-23', desktop: 480, mobile: 530 },
  { date: '2024-06-24', desktop: 132, mobile: 180 },
  { date: '2024-06-25', desktop: 141, mobile: 190 },
  { date: '2024-06-26', desktop: 434, mobile: 380 },
  { date: '2024-06-27', desktop: 448, mobile: 490 },
  { date: '2024-06-28', desktop: 149, mobile: 200 },
  { date: '2024-06-29', desktop: 103, mobile: 160 },
  { date: '2024-06-30', desktop: 446, mobile: 400 },
]

const labels: Readonly<Record<ActiveChart, string>> = {
  desktop: 'Desktop',
  mobile: 'Mobile',
}

const ACTIVE_CHARTS: ReadonlyArray<ActiveChart> = ['desktop', 'mobile']

const totals: Readonly<Record<ActiveChart, number>> = {
  desktop: CHART_DATA.reduce((total, datum) => total + datum.desktop, 0),
  mobile: CHART_DATA.reduce((total, datum) => total + datum.mobile, 0),
}

const formatDate = (
  value: string,
  options: Intl.DateTimeFormatOptions,
): string =>
  new Date(value).toLocaleDateString('en-US', {
    ...options,
    timeZone: 'UTC',
  })

const fullDates = CHART_DATA.map(datum =>
  formatDate(datum.date, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }),
)

Chart.registerChart(HOST_ID, (theme, variant): EChartsOption => {
  const activeChart: ActiveChart = variant === 'mobile' ? 'mobile' : 'desktop'
  const color = activeChart === 'desktop' ? theme.chart1 : theme.chart2

  return {
    ...Chart.updateAnimation(),
    grid: Chart.compactGrid(),
    xAxis: {
      type: 'category',
      data: [...fullDates],
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: theme.mutedForeground,
        fontSize: 12,
        fontFamily: theme.fontFamily,
        margin: 10,
        hideOverlap: true,
        formatter: value => value.replace(/, \d{4}$/, ''),
      },
    },
    yAxis: Chart.valueAxis(theme),
    tooltip: Chart.tooltipOptions(theme),
    series: [
      {
        name: 'Page Views',
        type: 'line',
        smooth: 0.4,
        showSymbol: false,
        lineStyle: { width: 2, color },
        itemStyle: { color },
        data: CHART_DATA.map(datum => datum[activeChart]),
      },
    ],
  }
})

export type ViewProps<Msg> = Readonly<{
  activeChart: ActiveChart
  onSelect: (activeChart: ActiveChart) => Msg
  toMessage: (message: Chart.ChartMessage) => Msg
}>

export const view = <Msg>(props: ViewProps<Msg>, h: HtmlBuilder<Msg>): Html => {
  return card(
    {
      class: 'py-4 sm:py-0',
      children: [
        cardHeader(
          {
            class: 'flex flex-col items-stretch border-b p-0! sm:flex-row',
            children: [
              h.div(
                [
                  h.Class(
                    'flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0',
                  ),
                ],
                [
                  cardTitle({ children: ['Line Chart - Interactive'] }, h),
                  cardDescription(
                    {
                      children: [
                        'Showing total visitors for the last 3 months',
                      ],
                    },
                    h,
                  ),
                ],
              ),
              h.div(
                [h.Class('flex')],
                ACTIVE_CHARTS.map(activeChart =>
                  h.button(
                    [
                      h.Type('button'),
                      h.DataAttribute(
                        'active',
                        String(props.activeChart === activeChart),
                      ),
                      h.OnClick(props.onSelect(activeChart)),
                      h.Class(
                        'flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6',
                      ),
                    ],
                    [
                      h.span(
                        [h.Class('text-xs text-muted-foreground')],
                        [labels[activeChart]],
                      ),
                      h.span(
                        [h.Class('text-lg leading-none font-bold sm:text-3xl')],
                        [totals[activeChart].toLocaleString('en-US')],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          },
          h,
        ),
        cardContent(
          {
            class: 'px-2 sm:p-6',
            children: [
              Chart.chart(
                {
                  hostId: HOST_ID,
                  ariaLabel: `Interactive line chart showing ${labels[props.activeChart].toLowerCase()} visitors for the last 3 months`,
                  variant: props.activeChart,
                  class: 'aspect-auto h-[250px] w-full',
                  toMessage: props.toMessage,
                },
                h,
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

/* Usage:
   - Store `activeChart: "desktop" | "mobile"` in the parent Model.
   - On selection, update that field and return
     Chart.SyncChart({ hostId: HOST_ID, variant: activeChart }), lifted through
     the parent's GotChartMessage constructor.
   - Render `view({ activeChart, onSelect, toMessage })`. */
