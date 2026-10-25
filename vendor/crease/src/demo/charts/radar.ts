import type { Update } from 'foldkit'
import { Match as M, Schema as S } from 'effect'
import type { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Chart from '@/lib/echarts'

import * as RadarDefault from '@/demo/charts/cards/radar-default'
import * as RadarDots from '@/demo/charts/cards/radar-dots'
import * as RadarGridCircle from '@/demo/charts/cards/radar-grid-circle'
import * as RadarGridCircleFill from '@/demo/charts/cards/radar-grid-circle-fill'
import * as RadarGridCircleNoLines from '@/demo/charts/cards/radar-grid-circle-no-lines'
import * as RadarGridCustom from '@/demo/charts/cards/radar-grid-custom'
import * as RadarGridFill from '@/demo/charts/cards/radar-grid-fill'
import * as RadarGridNone from '@/demo/charts/cards/radar-grid-none'
import * as RadarIcons from '@/demo/charts/cards/radar-icons'
import * as RadarLabelCustom from '@/demo/charts/cards/radar-label-custom'
import * as RadarLegend from '@/demo/charts/cards/radar-legend'
import * as RadarLinesOnly from '@/demo/charts/cards/radar-lines-only'
import * as RadarMultiple from '@/demo/charts/cards/radar-multiple'
import * as RadarRadius from '@/demo/charts/cards/radar-radius'
import { chartsPageShell } from '@/demo/charts/shell'

/* /charts/radar — grid of radar chart variants. Chart mounts emit ChartMessage
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
    'radar',
    [
      RadarDefault.view(toMessage, h),
      RadarMultiple.view(toMessage, h),
      RadarDots.view(toMessage, h),
      RadarLinesOnly.view(toMessage, h),
      RadarLabelCustom.view(toMessage, h),
      RadarRadius.view(toMessage, h),
      RadarGridCustom.view(toMessage, h),
      RadarGridNone.view(toMessage, h),
      RadarGridCircle.view(toMessage, h),
      RadarGridCircleNoLines.view(toMessage, h),
      RadarGridCircleFill.view(toMessage, h),
      RadarGridFill.view(toMessage, h),
      RadarLegend.view(toMessage, h),
      RadarIcons.view(toMessage, h),
    ],
    h,
  )
}
