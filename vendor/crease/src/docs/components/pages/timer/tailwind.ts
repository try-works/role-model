import { Schema as S } from 'effect'
import { Command, Subscription } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  timerFixtures,
  type TimerFixture,
} from '@/docs/components/pages/timer/shared'
import * as Timer from '@/ui/timer'

const Got = defineMessageUnion({
  GotTimerMessage: { message: Timer.Message },
  GotClockMessage: { message: Timer.Message },
})
type Got = typeof Got.Type
const Model = S.Struct({
  _docsPage: S.Literal('timer'),
  timer: Timer.Model,
  clock: Timer.Model,
})
type Model = typeof Model.Type

const supportingLabel = (text: string, h: HtmlBuilder<Got>): Html =>
  h.span([h.Class('text-xs leading-5 text-muted-foreground')], [text])

const emphasizedTimer = (
  model: Timer.Model,
  toParentMessage: (message: Timer.Message) => Got,
  h: HtmlBuilder<Got>,
): Html =>
  Timer.timer(
    {
      model,
      type: 'body',
      size: 'xl',
      color: 'primary',
      weight: 'semibold',
    },
    h,
  )

const timerView = (
  fixture: TimerFixture,
  model: Model,
  h: HtmlBuilder<Got>,
): Html => {
  const toTimer = (message: Timer.Message): Got =>
    Got.GotTimerMessage({ message })
  const toClock = (message: Timer.Message): Got =>
    Got.GotClockMessage({ message })
  switch (fixture.layout) {
    case 'showcase':
      return h.div(
        [h.Class('flex flex-col gap-4')],
        [
          h.span(
            [h.Class('text-[17px] leading-6 font-semibold')],
            ['Processing'],
          ),
          h.div(
            [h.Class('flex items-center gap-6')],
            [
              h.div(
                [h.Class('flex flex-col gap-1')],
                [
                  supportingLabel('Elapsed', h),
                  Timer.timer(
                    {
                      model: model.timer,
                      type: 'body',
                      size: 'xl',
                      color: 'primary',
                      weight: 'semibold',
                    },
                    h,
                  ),
                ],
              ),
              h.div(
                [h.Class('flex flex-col gap-1')],
                [
                  supportingLabel('Clock', h),
                  Timer.timer(
                    {
                      model: model.clock,
                      type: 'body',
                      size: 'xl',
                      color: 'primary',
                      weight: 'semibold',
                    },
                    h,
                  ),
                ],
              ),
            ],
          ),
        ],
      )
    case 'formats':
      return h.div(
        [h.Class('flex flex-col gap-3')],
        [
          h.div(
            [h.Class('flex items-center gap-3')],
            [
              supportingLabel('Elapsed', h),
              Timer.timer(
                { model: model.timer, type: 'body', color: 'primary' },
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex items-center gap-3')],
            [
              supportingLabel('Clock', h),
              Timer.timer(
                { model: model.clock, type: 'body', color: 'primary' },
                h,
              ),
            ],
          ),
        ],
      )
    case 'inline':
      return h.p(
        [h.Class('text-sm leading-5 text-foreground')],
        [
          'Processing for ',
          Timer.timer(
            { model: model.timer, type: 'inherit', color: 'inherit' },
            h,
          ),
        ],
      )
    case 'typography':
      return h.div(
        [h.Class('flex flex-col gap-3')],
        [
          supportingLabel('Default', h),
          Timer.timer({ model: model.timer }, h),
          supportingLabel('Emphasized', h),
          emphasizedTimer(model.timer, toTimer, h),
        ],
      )
  }
}

export const timerTailwindPreviewProgram = definePreviewProgram<Model, Got>({
  Model,
  Message: Got,
  init: index => {
    const fixture = timerFixtures[index] ?? timerFixtures[0]
    return {
      _docsPage: 'timer',
      timer: Timer.init({
        id: `docs-timer-${String(index)}`,
        startTimeMs: Date.now() - fixture.offsetMs,
      }),
      clock: Timer.init({
        id: `docs-clock-${String(index)}`,
        startTimeMs: Date.now() - fixture.offsetMs,
        format: 'clock',
      }),
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotTimerMessage': {
        const next = Timer.update(model.timer, message.message)
        return {
          model: { ...model, timer: next.model },
          commands: Command.mapMessages(next.commands ?? [], next =>
            Got.GotTimerMessage({ message: next }),
          ),
        }
      }
      case 'GotClockMessage': {
        const next = Timer.update(model.clock, message.message)
        return {
          model: { ...model, clock: next.model },
          commands: Command.mapMessages(next.commands ?? [], next =>
            Got.GotClockMessage({ message: next }),
          ),
        }
      }
    }
  },
  subscriptions: Subscription.aggregate<Model, Got>()({
    timerTick: Subscription.lift(Timer.subscriptions)<Model, Got>({
      toChildModel: model => model.timer,
      toParentMessage: message => Got.GotTimerMessage({ message }),
    }).tick,
    clockTick: Subscription.lift(Timer.subscriptions)<Model, Got>({
      toChildModel: model => model.clock,
      toParentMessage: message => Got.GotClockMessage({ message }),
    }).tick,
  }),
  view: (index, model, h) => {
    const fixture = timerFixtures[index] ?? timerFixtures[0]
    return timerView(fixture, model, h)
  },
})
