import { Match as M, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Chart from '@/lib/echarts'
import * as BarActive from '@/demo/charts/cards/bar-active'
import * as BarDefault from '@/demo/charts/cards/bar-default'
import * as BarHorizontal from '@/demo/charts/cards/bar-horizontal'
import * as BarInteractive from '@/demo/charts/cards/bar-interactive'
import * as BarLabel from '@/demo/charts/cards/bar-label'
import * as BarLabelCustom from '@/demo/charts/cards/bar-label-custom'
import * as BarMixed from '@/demo/charts/cards/bar-mixed'
import * as BarMultiple from '@/demo/charts/cards/bar-multiple'
import * as BarNegative from '@/demo/charts/cards/bar-negative'
import * as BarStacked from '@/demo/charts/cards/bar-stacked'
import { modifyFields } from 'foldkit/struct'

import { chartsPageShell } from '@/demo/charts/shell'

/* /charts/bar — grid of bar chart variants. Chart mounts emit ChartMessage
   (mounted/synced) which this page absorbs; interactive variants add their own
   state here. Card modules live in src/demo/charts/cards/. */

// MODEL

export const Model = S.Struct({
  activeSeries: S.Union([S.Literal('desktop'), S.Literal('mobile')]),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  GotChartMessage: {
    message: Chart.ChartMessage,
  },
  SelectedSeries: {
    series: S.Union([S.Literal('desktop'), S.Literal('mobile')]),
  },
})
export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({ activeSeries: 'desktop' })

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotChartMessage: () => ({ model: model }),
      SelectedSeries: ({ series }) => ({
        model: modifyFields(model, { activeSeries: () => series }),
        commands: [
          Command.mapMessage(
            Chart.SyncChart({
              hostId: BarInteractive.HOST_ID,
              variant: series,
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
    'bar',
    [
      BarDefault.view(toMessage, h),
      BarHorizontal.view(toMessage, h),
      BarMultiple.view(toMessage, h),
      BarStacked.view(toMessage, h),
      BarLabel.view(toMessage, h),
      BarLabelCustom.view(toMessage, h),
      BarMixed.view(toMessage, h),
      BarActive.view(toMessage, h),
      BarNegative.view(toMessage, h),
      BarInteractive.view(
        {
          activeSeries: model.activeSeries,
          onSelect: series => Message.SelectedSeries({ series }),
          toMessage,
        },
        h,
      ),
    ],
    h,
  )
}
