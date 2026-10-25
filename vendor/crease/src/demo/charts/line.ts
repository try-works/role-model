import { Match as M, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as LineDefault from '@/demo/charts/cards/line-default'
import * as LineDots from '@/demo/charts/cards/line-dots'
import * as LineDotsColors from '@/demo/charts/cards/line-dots-colors'
import * as LineDotsCustom from '@/demo/charts/cards/line-dots-custom'
import * as LineInteractive from '@/demo/charts/cards/line-interactive'
import * as LineLabel from '@/demo/charts/cards/line-label'
import * as LineLabelCustom from '@/demo/charts/cards/line-label-custom'
import * as LineLinear from '@/demo/charts/cards/line-linear'
import * as LineMultiple from '@/demo/charts/cards/line-multiple'
import * as LineStep from '@/demo/charts/cards/line-step'
import * as Chart from '@/lib/echarts'

import { chartsPageShell } from '@/demo/charts/shell'

/* /charts/line — grid of line chart variants. Chart mounts emit ChartMessage
   (mounted/synced) which this page absorbs; interactive variants add their own
   state here. Card modules live in src/demo/charts/cards/. */

// MODEL

const ActiveChart = S.Literals(['desktop', 'mobile'])

export const Model = S.Struct({
  activeChart: ActiveChart,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  GotChartMessage: {
    message: Chart.ChartMessage,
  },
  SelectedActiveChart: {
    activeChart: ActiveChart,
  },
})
export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({ activeChart: 'desktop' })

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotChartMessage: () => ({ model: model }),
      SelectedActiveChart: ({ activeChart }) => ({
        model: modifyFields(model, { activeChart: () => activeChart }),
        commands: [
          Command.mapMessage(
            Chart.SyncChart({
              hostId: LineInteractive.HOST_ID,
              variant: activeChart,
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
    'line',
    [
      LineDefault.view(toMessage, h),
      LineLinear.view(toMessage, h),
      LineStep.view(toMessage, h),
      LineMultiple.view(toMessage, h),
      LineDots.view(toMessage, h),
      LineDotsCustom.view(toMessage, h),
      LineDotsColors.view(toMessage, h),
      LineLabel.view(toMessage, h),
      LineLabelCustom.view(toMessage, h),
      LineInteractive.view(
        {
          activeChart: model.activeChart,
          onSelect: activeChart => Message.SelectedActiveChart({ activeChart }),
          toMessage,
        },
        h,
      ),
    ],
    h,
  )
}
