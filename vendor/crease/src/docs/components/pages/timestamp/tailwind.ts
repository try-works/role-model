import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  timestampFixtures,
  type TimestampFixture,
  type TimestampStampSpec,
} from '@/docs/components/pages/timestamp/shared'
import * as Timestamp from '@/ui/timestamp'

const Got = defineMessageUnion({
  GotTimestampMessage: { index: S.Number, message: Timestamp.Message },
})
type Got = typeof Got.Type
const Model = S.Struct({
  _docsPage: S.Literal('timestamp'),
  stamps: S.Array(Timestamp.Model),
})
type Model = typeof Model.Type

const stampValue = (spec: TimestampStampSpec['value']): string | number =>
  typeof spec === 'string' ? spec : Date.now() - spec.secondsAgo * 1000

const initStamps = (
  fixture: TimestampFixture,
  fixtureIndex: number,
): ReadonlyArray<Timestamp.Model> => {
  let stampIndex = 0
  return fixture.sections.flatMap(section =>
    section.stamps.map(stamp => {
      const index = stampIndex
      stampIndex += 1
      return Timestamp.init({
        id: `docs-timestamp-${String(fixtureIndex)}-${String(index)}`,
        value: stampValue(stamp.value),
        ...(stamp.format === undefined ? {} : { format: stamp.format }),
      })
    }),
  )
}

const stampView = (
  stamp: TimestampStampSpec,
  model: Timestamp.Model,
  index: number,
  h: HtmlBuilder<Got>,
): Html =>
  Timestamp.timestamp(
    {
      model,
      toParentMessage: message => Got.GotTimestampMessage({ index, message }),
      ...(stamp.type === undefined ? {} : { type: stamp.type }),
      ...(stamp.color === undefined ? {} : { color: stamp.color }),
      ...(stamp.isTimezoneShown === true ? { isTimezoneShown: true } : {}),
      ...(stamp.tooltipEntries === undefined
        ? {}
        : { tooltipEntries: stamp.tooltipEntries }),
    },
    h,
  )

const timestampView = (
  fixture: TimestampFixture,
  model: Model,
  h: HtmlBuilder<Got>,
): Html => {
  let stampIndex = 0
  const sections = fixture.sections.map(section => {
    const stamps = section.stamps.map(stamp => {
      const stampModel = model.stamps[stampIndex]
      const index = stampIndex
      stampIndex += 1
      return stampModel === undefined
        ? h.empty
        : stampView(stamp, stampModel, index, h)
    })
    const group = h.div(
      [
        h.Class(
          section.direction === 'horizontal'
            ? 'flex items-center gap-4'
            : 'flex flex-col gap-2',
        ),
      ],
      stamps,
    )
    return section.label === undefined
      ? group
      : h.div(
          [h.Class('flex flex-col gap-1')],
          [
            h.span(
              [h.Class('text-xs leading-5 text-muted-foreground')],
              [section.label],
            ),
            group,
          ],
        )
  })
  return h.div([h.Class('flex flex-col gap-4')], sections)
}

export const timestampTailwindPreviewProgram = definePreviewProgram<Model, Got>(
  {
    Model,
    Message: Got,
    init: index => ({
      _docsPage: 'timestamp',
      stamps: initStamps(
        timestampFixtures[index] ?? timestampFixtures[0],
        index,
      ),
    }),
    update: (model, message) => {
      switch (message._tag) {
        case 'GotTimestampMessage': {
          const stamp = model.stamps[message.index]
          if (stamp === undefined) {
            return { model }
          }
          const next = Timestamp.update(stamp, message.message)
          return {
            model: {
              ...model,
              stamps: model.stamps.map((current, index) =>
                index === message.index ? next.model : current,
              ),
            },
            commands: Command.mapMessages(next.commands ?? [], inner =>
              Got.GotTimestampMessage({
                index: message.index,
                message: inner,
              }),
            ),
          }
        }
      }
    },
    view: (index, model, h) =>
      timestampView(timestampFixtures[index] ?? timestampFixtures[0], model, h),
  },
)
