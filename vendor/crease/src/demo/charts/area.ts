import { Match as M, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Chart from '@/lib/echarts'
import * as AreaAxes from '@/demo/charts/cards/area-axes'
import * as AreaDefault from '@/demo/charts/cards/area-default'
import * as AreaGradient from '@/demo/charts/cards/area-gradient'
import * as AreaIcons from '@/demo/charts/cards/area-icons'
import * as AreaInteractive from '@/demo/charts/cards/area-interactive'
import * as AreaLegend from '@/demo/charts/cards/area-legend'
import * as AreaLinear from '@/demo/charts/cards/area-linear'
import * as AreaStacked from '@/demo/charts/cards/area-stacked'
import * as AreaStackedExpand from '@/demo/charts/cards/area-stacked-expand'
import * as AreaStep from '@/demo/charts/cards/area-step'
import { chartsPageShell } from '@/demo/charts/shell'
import * as Select from '@/ui/select'

/* /charts/area — grid of area chart variants. Chart mounts emit ChartMessage
   (mounted/synced) which this page absorbs; interactive variants add their own
   state here. Card modules live in src/demo/charts/cards/. */

// MODEL

export const Model = S.Struct({
  timeRange: S.Union([S.Literal('90d'), S.Literal('30d'), S.Literal('7d')]),
  timeRangeSelect: Select.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  GotChartMessage: {
    message: Chart.ChartMessage,
  },
  GotTimeRangeSelectMessage: {
    message: Select.Message,
  },
})
export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({
  timeRange: '90d',
  timeRangeSelect: Select.init({
    id: 'chart-area-interactive-range',
    isAnimated: true,
  }),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotChartMessage: () => ({ model: model }),
      GotTimeRangeSelectMessage: ({ message: childMessage }) => {
        const {
          model: timeRangeSelect,
          commands: timeRangeSelectCommands__,
          outMessage: timeRangeSelectOut__,
        } = Select.update(model.timeRangeSelect, childMessage)
        const selectCommands = timeRangeSelectCommands__ ?? []
        const maybeOutMessage = Option.fromNullishOr(timeRangeSelectOut__)
        const timeRange = Option.match(maybeOutMessage, {
          onNone: () => model.timeRange,
          onSome: selection =>
            selection._tag === 'Selected'
              ? selection.value === '30d' || selection.value === '7d'
                ? selection.value
                : '90d'
              : model.timeRange,
        })
        const chartCommands = Option.isSome(maybeOutMessage)
          ? [
              Command.mapMessage(
                Chart.SyncChart({
                  hostId: AreaInteractive.HOST_ID,
                  variant: timeRange,
                }),
                message => Message.GotChartMessage({ message }),
              ),
            ]
          : []

        return {
          model: modifyFields(model, {
            timeRange: () => timeRange,
            timeRangeSelect: () => timeRangeSelect,
          }),
          commands: [
            ...Command.mapMessages(selectCommands, message =>
              Message.GotTimeRangeSelectMessage({ message }),
            ),
            ...chartCommands,
          ],
        }
      },
    }),
  )

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const toMessage = (message: Chart.ChartMessage): Message =>
    Message.GotChartMessage({ message })

  return chartsPageShell<Message>(
    'area',
    [
      AreaDefault.view(toMessage, h),
      AreaLinear.view(toMessage, h),
      AreaStep.view(toMessage, h),
      AreaStacked.view(toMessage, h),
      AreaStackedExpand.view(toMessage, h),
      AreaLegend.view(toMessage, h),
      AreaGradient.view(toMessage, h),
      AreaAxes.view(toMessage, h),
      AreaIcons.view(toMessage, h),
      AreaInteractive.view(
        {
          timeRange: model.timeRange,
          selectedTimeRange: model.timeRange,
          selectModel: model.timeRangeSelect,
          toChartMessage: toMessage,
          toSelectMessage: message =>
            Message.GotTimeRangeSelectMessage({ message }),
        },
        h,
      ),
    ],
    h,
  )
}
