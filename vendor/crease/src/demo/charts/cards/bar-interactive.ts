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

export const HOST_ID = 'chart-bar-interactive'
export type Series = 'desktop' | 'mobile'

const DESKTOP = [
  222, 97, 167, 242, 373, 301, 245, 409, 59, 261, 327, 292, 342, 137, 120, 138,
  446, 364, 243, 89, 137, 224, 138, 387, 215, 75, 383, 122, 315, 454, 165, 293,
  247, 385, 481, 498, 388, 149, 227, 293, 335, 197, 197, 448, 473, 338, 499,
  315, 235, 177, 82, 81, 252, 294, 201, 213, 420, 233, 78, 340, 178, 178, 470,
  103, 439, 88, 294, 323, 385, 438, 155, 92, 492, 81, 426, 307, 371, 475, 107,
  341, 408, 169, 317, 480, 132, 141, 434, 448, 149, 103, 446,
]
const MOBILE = [
  150, 180, 120, 260, 290, 340, 180, 320, 110, 190, 350, 210, 380, 220, 170,
  190, 360, 410, 180, 150, 200, 170, 230, 290, 250, 130, 420, 180, 240, 380,
  220, 310, 190, 420, 390, 520, 300, 210, 180, 330, 270, 240, 160, 490, 380,
  400, 420, 350, 180, 230, 140, 120, 290, 220, 250, 170, 460, 190, 130, 280,
  230, 200, 410, 160, 380, 140, 250, 370, 320, 480, 200, 150, 420, 130, 380,
  350, 310, 520, 170, 290, 450, 210, 270, 530, 180, 190, 380, 490, 200, 160,
  400,
]

const DATES = Array.from({ length: 91 }, (_, index) => {
  const date = new Date(Date.UTC(2024, 3, index + 1))
  return date.toISOString().slice(0, 10)
})

const shortDate = (value: string): string =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))

Chart.registerChart(HOST_ID, (theme, variant): EChartsOption => {
  const active: Series = variant === 'mobile' ? 'mobile' : 'desktop'
  return {
    ...Chart.updateAnimation(),
    grid: Chart.compactGrid({ left: 12, right: 12 }),
    xAxis: {
      type: 'category',
      data: [...DATES],
      boundaryGap: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: theme.mutedForeground,
        fontSize: 12,
        fontFamily: theme.fontFamily,
        margin: 8,
        formatter: value => shortDate(String(value)),
        hideOverlap: true,
      },
    },
    yAxis: Chart.valueAxis(theme),
    tooltip: Chart.tooltipOptions(theme),
    series: [
      {
        name: active === 'desktop' ? 'Desktop' : 'Mobile',
        type: 'bar',
        itemStyle: {
          color: active === 'desktop' ? theme.chart2 : theme.chart1,
        },
        data: [...(active === 'desktop' ? DESKTOP : MOBILE)],
      },
    ],
  }
})

const TOTALS: Readonly<Record<Series, number>> = {
  desktop: DESKTOP.reduce((total, value) => total + value, 0),
  mobile: MOBILE.reduce((total, value) => total + value, 0),
}
const SERIES: ReadonlyArray<Series> = ['desktop', 'mobile']

export const view = <Msg>(
  props: Readonly<{
    activeSeries: Series
    onSelect: (series: Series) => Msg
    toMessage: (message: Chart.ChartMessage) => Msg
  }>,
  h: HtmlBuilder<Msg>,
): Html => {
  return card(
    {
      class: 'py-0 md:col-span-2',
      children: [
        cardHeader(
          {
            class: 'flex flex-col items-stretch border-b p-0! sm:flex-row',
            children: [
              h.div(
                [
                  h.Class(
                    'flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-0!',
                  ),
                ],
                [
                  cardTitle({ children: ['Bar Chart - Interactive'] }, h),
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
                SERIES.map(series =>
                  h.button(
                    [
                      h.Type('button'),
                      h.OnClick(props.onSelect(series)),
                      h.DataAttribute(
                        'active',
                        props.activeSeries === series ? 'true' : 'false',
                      ),
                      h.Class(
                        'relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6',
                      ),
                    ],
                    [
                      h.span(
                        [h.Class('text-xs text-muted-foreground')],
                        [series === 'desktop' ? 'Desktop' : 'Mobile'],
                      ),
                      h.span(
                        [h.Class('text-lg leading-none font-bold sm:text-3xl')],
                        [TOTALS[series].toLocaleString('en-US')],
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
                  ariaLabel: `Interactive bar chart showing ${props.activeSeries} visitors over the last three months`,
                  variant: props.activeSeries,
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

/* Minimal wiring:
   Model includes activeSeries: Schema.Literal('desktop', 'mobile').
   A selection message updates activeSeries and returns
   Command.mapMessage(Chart.SyncChart({ hostId: HOST_ID, variant: activeSeries }),
   message => GotChartMessage({ message })). */
