import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Chart from '@/lib/echarts'
import {
  card,
  cardContent,
  cardDescription,
  cardHeader,
  cardTitle,
} from '@/ui/card'
import { nativeSelect } from '@/ui/native-select'

import { DESKTOP_VALUES, MONTH_NAMES, pieOption } from './pie-shared'

export const HOST_ID = 'chart-pie-interactive'
export const MONTHS = MONTH_NAMES.map(month => ({
  value: month.toLowerCase(),
  label: month,
}))

Chart.registerChart(HOST_ID, (theme, variant) => {
  const activeIndex = Math.max(
    0,
    MONTHS.findIndex(month => month.value === variant),
  )

  return {
    ...Chart.updateAnimation(),
    ...pieOption(theme, {
      names: MONTH_NAMES,
      values: DESKTOP_VALUES,
      donut: true,
      activeIndex,
      centerValue: (
        DESKTOP_VALUES[activeIndex] ??
        DESKTOP_VALUES[0] ??
        0
      ).toLocaleString(),
      centerLabel: 'Visitors',
    }),
  }
})

type Props<Msg> = Readonly<{
  activeMonth: string
  onMonthChange: (month: string) => Msg
  toMessage: (message: Chart.ChartMessage) => Msg
}>

export const view = <Msg>(props: Props<Msg>, h: HtmlBuilder<Msg>): Html => {
  return card(
    {
      class: 'flex flex-col',
      children: [
        cardHeader(
          {
            class: 'flex-row items-start space-y-0 pb-0',
            children: [
              h.div(
                [h.Class('grid gap-1')],
                [
                  cardTitle({ children: ['Pie Chart - Interactive'] }, h),
                  cardDescription({ children: ['January - June 2024'] }, h),
                ],
              ),
              nativeSelect(
                {
                  id: 'pie-interactive-month',
                  value: props.activeMonth,
                  onChange: props.onMonthChange,
                  options: MONTHS,
                  class: 'ml-auto h-7 w-[130px] rounded-lg pl-2.5',
                },
                h,
              ),
            ],
          },
          h,
        ),
        cardContent(
          {
            class: 'flex flex-1 justify-center pb-0',
            children: [
              Chart.chart(
                {
                  hostId: HOST_ID,
                  ariaLabel: `Interactive pie chart for ${props.activeMonth}`,
                  variant: props.activeMonth,
                  toMessage: props.toMessage,
                  class: 'mx-auto aspect-square w-full max-w-[300px]',
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

/*
  Page wiring: store activeMonth in the page Model; on selection update the
  field and issue Chart.SyncChart({ hostId: HOST_ID, variant: activeMonth }).
*/
