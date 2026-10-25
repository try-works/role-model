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

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June']
export const DESKTOP = [186, 305, 237, 73, 209, 214]
export const SINGLE = [186, 305, 237, 273, 209, 214]
export const MOBILE = [80, 200, 120, 190, 130, 140]

export type RadarConfig = Readonly<{
  desktop?: ReadonlyArray<number>
  mobile?: ReadonlyArray<number>
  dots?: boolean
  linesOnly?: boolean
  shape?: 'polygon' | 'circle'
  splitLine?: boolean
  splitArea?: boolean
  axisLine?: boolean
  singleGrid?: boolean
  radiusLabels?: boolean
  customLabels?: boolean
  legend?: boolean
}>

export const radarOption = (
  theme: Chart.ChartTheme,
  config: RadarConfig = {},
): EChartsOption => {
  const desktop = config.desktop ?? SINGLE
  const mobile = config.mobile
  const seriesData = [
    {
      name: 'Desktop',
      value: [...desktop],
      lineStyle: {
        color: theme.chart1,
        width: config.linesOnly === true ? 2 : 1,
      },
      itemStyle: { color: theme.chart1 },
      areaStyle: {
        color: Chart.colorWithOpacity(
          theme.chart1,
          config.linesOnly === true ? 0 : 0.6,
        ),
      },
      symbol: config.dots === true ? 'circle' : 'none',
      symbolSize: config.dots === true ? 8 : 0,
    },
    ...(mobile === undefined
      ? []
      : [
          {
            name: 'Mobile',
            value: [...mobile],
            lineStyle: {
              color: theme.chart2,
              width: config.linesOnly === true ? 2 : 1,
            },
            itemStyle: { color: theme.chart2 },
            areaStyle: {
              color: Chart.colorWithOpacity(
                theme.chart2,
                config.linesOnly === true ? 0 : 0.45,
              ),
            },
            symbol: 'none',
            symbolSize: 0,
          },
        ]),
  ]

  return {
    tooltip: Chart.tooltipOptions(theme, { trigger: 'item' }),
    ...(config.legend === true
      ? {
          legend: {
            ...Chart.legendOptions(theme),
            data: mobile === undefined ? ['Desktop'] : ['Desktop', 'Mobile'],
          },
        }
      : {}),
    radar: {
      center: ['50%', config.legend === true ? '44%' : '50%'],
      radius: config.legend === true ? '62%' : '68%',
      shape: config.shape ?? 'polygon',
      indicator: MONTHS.map((month, index) => ({
        name:
          config.customLabels === true
            ? `${desktop[index] ?? 0}/${mobile?.[index] ?? 0}\n${month}`
            : month,
        max: 350,
      })),
      axisName: {
        color: theme.mutedForeground,
        fontSize: config.customLabels === true ? 11 : 12,
        fontFamily: theme.fontFamily,
      },
      splitNumber: config.singleGrid === true ? 1 : 5,
      axisLine: {
        show: config.axisLine ?? true,
        lineStyle: { color: theme.border },
      },
      splitLine: {
        show: config.splitLine ?? true,
        lineStyle: { color: theme.border },
      },
      splitArea: {
        show: config.splitArea ?? false,
        areaStyle: {
          color: [Chart.colorWithOpacity(theme.chart1, 0.2), 'transparent'],
        },
      },
      axisNameGap: 8,
    },
    series: [{ type: 'radar', data: seriesData }],
  }
}

type RadarCardProps<Msg> = Readonly<{
  hostId: string
  title: string
  toMessage: (message: Chart.ChartMessage) => Msg
  legend?: boolean
}>

export const radarCard = <Msg>(
  props: RadarCardProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return card(
    {
      children: [
        cardHeader(
          {
            class: 'items-center pb-4',
            children: [
              cardTitle({ children: [props.title] }, h),
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
            class: 'pb-0',
            children: [
              Chart.chart(
                {
                  hostId: props.hostId,
                  ariaLabel: `${props.title} showing total visitors for the last 6 months`,
                  toMessage: props.toMessage,
                  class: `mx-auto aspect-square max-h-[250px]${props.legend === true ? ' pb-8' : ''}`,
                },
                h,
              ),
            ],
          },
          h,
        ),
        cardFooter(
          {
            class: `flex-col gap-2 text-sm${props.legend === true ? ' pt-4' : ''}`,
            children: [
              h.div(
                [h.Class('flex items-center gap-2 leading-none font-medium')],
                [
                  'Trending up by 5.2% this month',
                  Icon.icon<Msg>('trending-up', { class: 'h-4 w-4' }, h),
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
          },
          h,
        ),
      ],
    },
    h,
  )
}
