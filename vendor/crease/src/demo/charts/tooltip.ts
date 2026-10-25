import type { Update } from 'foldkit'
import { Match as M, Schema as S } from 'effect'
import type { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Chart from '@/lib/echarts'
import * as TooltipAdvanced from '@/demo/charts/cards/tooltip-advanced'
import * as TooltipDefault from '@/demo/charts/cards/tooltip-default'
import * as TooltipFormatter from '@/demo/charts/cards/tooltip-formatter'
import * as TooltipIcons from '@/demo/charts/cards/tooltip-icons'
import * as TooltipIndicatorLine from '@/demo/charts/cards/tooltip-indicator-line'
import * as TooltipIndicatorNone from '@/demo/charts/cards/tooltip-indicator-none'
import * as TooltipLabelCustom from '@/demo/charts/cards/tooltip-label-custom'
import * as TooltipLabelFormatter from '@/demo/charts/cards/tooltip-label-formatter'
import * as TooltipLabelNone from '@/demo/charts/cards/tooltip-label-none'

import { chartsPageShell } from '@/demo/charts/shell'

/* /charts/tooltip — grid of tooltip chart variants. Chart mounts emit ChartMessage
   (mounted/synced) which this page absorbs; interactive variants add their own
   state here. Card modules live in src/demo/charts/cards/. */

// MODEL

export const Model = S.Struct({})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  GotChartMessage: {
    message: Chart.ChartMessage,
  },
})
export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotChartMessage: () => ({ model: model }),
    }),
  )

// VIEW

export const view = (_model: Model, h: HtmlBuilder<Message>): Html => {
  const toMessage = (message: Chart.ChartMessage): Message =>
    Message.GotChartMessage({ message })

  return chartsPageShell<Message>(
    'tooltip',
    [
      TooltipDefault.view(toMessage, h),
      TooltipLabelCustom.view(toMessage, h),
      TooltipLabelFormatter.view(toMessage, h),
      TooltipLabelNone.view(toMessage, h),
      TooltipFormatter.view(toMessage, h),
      TooltipIcons.view(toMessage, h),
      TooltipIndicatorLine.view(toMessage, h),
      TooltipIndicatorNone.view(toMessage, h),
      TooltipAdvanced.view(toMessage, h),
    ],
    h,
  )
}
