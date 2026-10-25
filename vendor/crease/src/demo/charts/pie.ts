import { Match as M, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Chart from '@/lib/echarts'

import * as PieDonut from '@/demo/charts/cards/pie-donut'
import * as PieDonutActive from '@/demo/charts/cards/pie-donut-active'
import * as PieDonutText from '@/demo/charts/cards/pie-donut-text'
import * as PieInteractive from '@/demo/charts/cards/pie-interactive'
import * as PieLabel from '@/demo/charts/cards/pie-label'
import * as PieLabelCustom from '@/demo/charts/cards/pie-label-custom'
import * as PieLabelList from '@/demo/charts/cards/pie-label-list'
import * as PieLegend from '@/demo/charts/cards/pie-legend'
import * as PieSeparatorNone from '@/demo/charts/cards/pie-separator-none'
import * as PieSimple from '@/demo/charts/cards/pie-simple'
import * as PieStacked from '@/demo/charts/cards/pie-stacked'
import { chartsPageShell } from '@/demo/charts/shell'

/* /charts/pie — grid of pie chart variants. Chart mounts emit ChartMessage
   (mounted/synced) which this page absorbs; interactive variants add their own
   state here. Card modules live in src/demo/charts/cards/. */

// MODEL

export const Model = S.Struct({
  activeMonth: S.String,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  GotChartMessage: {
    message: Chart.ChartMessage,
  },
  SelectedMonth: { month: S.String },
})
export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({ activeMonth: 'january' })

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotChartMessage: () => ({ model: model }),
      SelectedMonth: ({ month }) => ({
        model: modifyFields(model, { activeMonth: () => month }),
        commands: [
          Command.mapMessage(
            Chart.SyncChart({
              hostId: PieInteractive.HOST_ID,
              variant: month,
            }),
            message => Message.GotChartMessage({ message }),
          ),
        ],
      }),
    }),
  )

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const toMessage = (message: Chart.ChartMessage): Message =>
    Message.GotChartMessage({ message })

  return chartsPageShell<Message>(
    'pie',
    [
      PieSimple.view(toMessage, h),
      PieSeparatorNone.view(toMessage, h),
      PieLabel.view(toMessage, h),
      PieLabelCustom.view(toMessage, h),
      PieLabelList.view(toMessage, h),
      PieLegend.view(toMessage, h),
      PieDonut.view(toMessage, h),
      PieDonutActive.view(toMessage, h),
      PieDonutText.view(toMessage, h),
      PieStacked.view(toMessage, h),
      PieInteractive.view(
        {
          activeMonth: model.activeMonth,
          onMonthChange: month => Message.SelectedMonth({ month }),
          toMessage,
        },
        h,
      ),
    ],
    h,
  )
}
