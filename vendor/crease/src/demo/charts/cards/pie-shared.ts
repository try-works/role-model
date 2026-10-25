import type { PieSeriesOption } from 'echarts/charts'
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

export const BROWSER_NAMES = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other']
export const BROWSER_VALUES = [275, 200, 187, 173, 90]
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May']
export const DESKTOP_VALUES = [186, 305, 237, 173, 209]
export const MOBILE_VALUES = [80, 200, 120, 190, 130]

const colors = (theme: Chart.ChartTheme): ReadonlyArray<string> => [
  theme.chart1,
  theme.chart2,
  theme.chart3,
  theme.chart4,
  theme.chart5,
]

export type PieConfig = Readonly<{
  names?: ReadonlyArray<string>
  values?: ReadonlyArray<number>
  donut?: boolean
  separator?: boolean
  label?: 'name' | 'value' | 'none'
  labelInside?: boolean
  legend?: boolean
  centerValue?: string
  centerLabel?: string
  activeIndex?: number
}>

export const pieOption = (
  theme: Chart.ChartTheme,
  config: PieConfig = {},
): EChartsOption => {
  const names = config.names ?? BROWSER_NAMES
  const values = config.values ?? BROWSER_VALUES
  const palette = colors(theme)
  const activeIndex = config.activeIndex
  const centerSeries: PieSeriesOption[] =
    config.centerValue === undefined
      ? []
      : [
          {
            name: 'Total',
            type: 'pie',
            radius: ['0%', '1%'],
            center: ['50%', '50%'],
            silent: true,
            tooltip: { show: false },
            labelLine: { show: false },
            label: {
              show: true,
              position: 'center',
              color: theme.foreground,
              fontSize: 28,
              fontWeight: 700,
              fontFamily: theme.fontFamily,
              lineHeight: 26,
              formatter: `${config.centerValue}\n{muted|${config.centerLabel ?? 'Visitors'}}`,
              rich: {
                muted: {
                  color: theme.mutedForeground,
                  fontSize: 12,
                  fontWeight: 400,
                  fontFamily: theme.fontFamily,
                  lineHeight: 24,
                },
              },
            },
            data: [
              {
                value: 1,
                itemStyle: { color: 'transparent' },
              },
            ],
          },
        ]

  return {
    tooltip: Chart.tooltipOptions(theme, { trigger: 'item' }),
    ...(config.legend === true
      ? {
          legend: {
            ...Chart.legendOptions(theme),
            data: [...names],
          },
        }
      : {}),
    series: [
      {
        name: 'Visitors',
        type: 'pie',
        radius: config.donut === true ? ['48%', '72%'] : ['0%', '72%'],
        center: ['50%', config.legend === true ? '43%' : '50%'],
        selectedMode: activeIndex === undefined ? false : 'single',
        selectedOffset: 10,
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor:
            config.separator === false ? 'transparent' : theme.background,
          borderWidth: config.separator === false ? 0 : 2,
        },
        label: {
          show: config.label !== undefined && config.label !== 'none',
          position: config.labelInside === true ? 'inside' : 'outside',
          color:
            config.labelInside === true ? theme.background : theme.foreground,
          fontSize: 12,
          fontFamily: theme.fontFamily,
          formatter: config.label === 'value' ? '{c}' : '{b}',
        },
        labelLine: { show: config.labelInside !== true },
        data: names.map((name, index) => ({
          name,
          value: values[index] ?? 0,
          selected: index === activeIndex,
          itemStyle: { color: palette[index] ?? theme.chart1 },
        })),
      },
      ...centerSeries,
    ],
  }
}

export const stackedPieOption = (theme: Chart.ChartTheme): EChartsOption => {
  const palette = colors(theme)
  const data = (names: ReadonlyArray<string>, values: ReadonlyArray<number>) =>
    names.map((name, index) => ({
      name,
      value: values[index] ?? 0,
      itemStyle: { color: palette[index] ?? theme.chart1 },
    }))

  return {
    tooltip: Chart.tooltipOptions(theme, { trigger: 'item' }),
    series: [
      {
        name: 'Desktop',
        type: 'pie',
        radius: ['0%', '48%'],
        itemStyle: { borderColor: theme.background, borderWidth: 2 },
        label: { show: false },
        data: data(MONTH_NAMES, DESKTOP_VALUES),
      },
      {
        name: 'Mobile',
        type: 'pie',
        radius: ['56%', '72%'],
        itemStyle: { borderColor: theme.background, borderWidth: 2 },
        label: { show: false },
        data: data(MONTH_NAMES, MOBILE_VALUES),
      },
    ],
  }
}

type PieCardProps<Msg> = Readonly<{
  hostId: string
  title: string
  toMessage: (message: Chart.ChartMessage) => Msg
  footer?: boolean
  legend?: boolean
  class?: string
}>

export const pieCard = <Msg>(
  props: PieCardProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return card(
    {
      class: props.class ?? 'flex flex-col',
      children: [
        cardHeader(
          {
            class: 'items-center pb-0',
            children: [
              cardTitle({ children: [props.title] }, h),
              cardDescription({ children: ['January - June 2024'] }, h),
            ],
          },
          h,
        ),
        cardContent(
          {
            class: 'flex-1 pb-0',
            children: [
              Chart.chart(
                {
                  hostId: props.hostId,
                  ariaLabel: `${props.title}, January through June 2024`,
                  toMessage: props.toMessage,
                  class: `mx-auto aspect-square max-h-[250px]${props.legend === true ? ' pb-8' : ''}`,
                },
                h,
              ),
            ],
          },
          h,
        ),
        ...((props.footer ?? true)
          ? [
              cardFooter(
                {
                  class: 'flex-col gap-2 text-sm',
                  children: [
                    h.div(
                      [
                        h.Class(
                          'flex items-center gap-2 leading-none font-medium',
                        ),
                      ],
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
            ]
          : []),
      ],
    },
    h,
  )
}
