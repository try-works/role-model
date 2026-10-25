import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  TIME_RANGES,
  interactiveAreaOption,
  type TimeRange,
} from '@/demo/charts/interactive-area'
import * as Chart from '@/lib/echarts'
import * as Select from '@/ui/select'
import {
  card,
  cardContent,
  cardDescription,
  cardHeader,
  cardTitle,
} from '@/ui/card'

export const HOST_ID = 'chart-area-interactive'

export type { TimeRange }

/* The option builder + dataset live in ../interactive-area so the
   StyleX/Pleat galleries render the same chart with real range filtering. */

Chart.registerChart(HOST_ID, interactiveAreaOption)

export type ViewProps<Msg> = Readonly<{
  timeRange: TimeRange
  selectedTimeRange: TimeRange
  selectModel: Select.Model
  toChartMessage: (message: Chart.ChartMessage) => Msg
  toSelectMessage: (message: Select.Message) => Msg
}>

export const view = <Msg>(props: ViewProps<Msg>, h: HtmlBuilder<Msg>): Html => {
  return card(
    {
      class: 'pt-0',
      children: [
        cardHeader(
          {
            class:
              'flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row',
            children: [
              h.div(
                [h.Class('grid flex-1 gap-1')],
                [
                  cardTitle({ children: ['Area Chart - Interactive'] }, h),
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
              Select.select(
                {
                  model: props.selectModel,
                  maybeSelectedValue: Option.some(props.selectedTimeRange),
                  toParentMessage: props.toSelectMessage,
                  items: TIME_RANGES,
                  itemToValue: range => range.value,
                  itemToLabel: range => range.label,
                  triggerClass:
                    'hidden w-[160px] rounded-lg sm:ml-auto sm:flex',
                  ariaLabel: 'Select a value',
                },
                h,
              ),
            ],
          },
          h,
        ),
        cardContent(
          {
            class: 'px-2 pt-4 sm:px-6 sm:pt-6',
            children: [
              Chart.chart(
                {
                  hostId: HOST_ID,
                  variant: props.timeRange,
                  ariaLabel:
                    'Interactive area chart showing desktop and mobile visitors for the selected time range',
                  toMessage: props.toChartMessage,
                  class: 'aspect-auto h-[250px] w-full',
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
  Minimal wiring:
  - Model: { timeRange: '90d', timeRangeSelect: Select.init({ id,
    '90d', isAnimated: true }) }.
  - Delegate Select.Message through Select.update; when its Selected OutMessage
    arrives, update timeRange and return Chart.SyncChart({ hostId: HOST_ID,
    variant: timeRange }) mapped into the page's ChartMessage arm.
  - Render view({ timeRange, selectModel, toChartMessage, toSelectMessage }).
*/
