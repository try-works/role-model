import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  logStreamFixtures,
  logStreamLiveScript,
  type LogFixtureEntry,
  type LogStreamFixture,
} from '@/docs/components/pages/log-stream/shared'
import * as Button from '@/ui/button'
import * as LogStream from '@/ui/log-stream'
import * as StatusDot from '@/ui/status-dot'

const FixtureRow = S.Struct({
  id: S.String,
  timestamp: S.String,
  level: S.Literals(['info', 'warn', 'error', 'debug']),
  source: S.optional(S.String),
  message: S.String,
  detailText: S.optional(S.String),
})

const Got = defineMessageUnion({
  GotStreamMessage: { message: LogStream.Message },
  ClickedAppend: {},
  ClickedReset: {},
})
type Got = typeof Got.Type
const Model = S.Struct({
  _docsPage: S.Literal('log-stream'),
  stream: LogStream.Model,
  entries: S.Array(FixtureRow),
})
type Model = typeof Model.Type

const toEntries = (
  rows: ReadonlyArray<typeof FixtureRow.Type>,
  h: HtmlBuilder<Got>,
): ReadonlyArray<LogStream.LogEntry> =>
  rows.map(row => ({
    id: row.id,
    timestamp: row.timestamp,
    level: row.level,
    message: row.message,
    ...(row.source === undefined ? {} : { source: row.source }),
    ...(row.detailText === undefined
      ? {}
      : {
          detail: h.pre(
            [
              h.Class(
                'm-0 whitespace-pre-wrap font-mono text-sm leading-[1.7]',
              ),
            ],
            [row.detailText],
          ),
        }),
  }))

const fixtureView = (
  fixture: LogStreamFixture,
  model: Model,
  h: HtmlBuilder<Got>,
): Html => {
  const stream = LogStream.logStream(
    {
      model: model.stream,
      toParentMessage: message => Got.GotStreamMessage({ message }),
      entries: toEntries(model.entries, h),
      variant: fixture.variant,
      maxHeight: fixture.maxHeight,
      label:
        fixture.layout === 'follow'
          ? 'Live log stream'
          : fixture.title === 'Build logs'
            ? 'Build logs'
            : 'Log results stream',
    },
    h,
  )
  if (fixture.layout !== 'follow') {
    return stream
  }
  const isFollowing = model.stream.scroller.isFollowing
  return h.div(
    [h.Class('flex flex-col gap-3')],
    [
      h.div(
        [h.Class('flex items-center gap-2')],
        [
          StatusDot.statusDot(
            {
              variant: isFollowing ? 'success' : 'neutral',
              label: isFollowing ? 'Following latest' : 'Not following',
            },
            h,
          ),
          h.span(
            [h.Class('flex-1 text-xs leading-5 text-muted-foreground')],
            [`${String(model.entries.length)} rows`],
          ),
          Button.button(
            {
              variant: 'secondary',
              children: ['Append line'],
              isDisabled:
                model.entries.length - fixture.entries.length >=
                logStreamLiveScript.length,
              onClick: Got.ClickedAppend(),
            },
            h,
          ),
          Button.button(
            {
              variant: 'ghost',
              children: ['Reset'],
              onClick: Got.ClickedReset(),
            },
            h,
          ),
        ],
      ),
      stream,
    ],
  )
}

export const logStreamTailwindPreviewProgram = definePreviewProgram<Model, Got>(
  {
    Model,
    Message: Got,
    init: index => {
      const fixture = logStreamFixtures[index] ?? logStreamFixtures[0]
      return {
        _docsPage: 'log-stream',
        stream: LogStream.init({
          id: `docs-log-stream-${String(index)}`,
          ...(fixture.layout === 'follow' ? { isFollowing: true } : {}),
        }),
        entries: [...fixture.entries],
      }
    },
    update: (model, message) => {
      switch (message._tag) {
        case 'GotStreamMessage': {
          const next = LogStream.update(model.stream, message.message)
          return {
            model: { ...model, stream: next.model },
            commands: Command.mapMessages(next.commands ?? [], next =>
              Got.GotStreamMessage({ message: next }),
            ),
          }
        }
        case 'ClickedAppend': {
          const fixture =
            logStreamFixtures.find(f => f.layout === 'follow') ??
            logStreamFixtures[0]
          const nextIndex = model.entries.length - fixture.entries.length
          const nextLine = logStreamLiveScript[nextIndex]
          if (nextLine === undefined) {
            return { model }
          }
          return {
            model: {
              ...model,
              entries: [
                ...model.entries,
                { ...nextLine, id: `live-${String(nextIndex)}` },
              ],
              stream: {
                ...model.stream,
                scroller: {
                  ...model.stream.scroller,
                  isFollowing: true,
                },
              },
            },
          }
        }
        case 'ClickedReset': {
          const fixture =
            logStreamFixtures.find(f => f.layout === 'follow') ??
            logStreamFixtures[0]
          return {
            model: {
              ...model,
              entries: [...fixture.entries],
              stream: {
                ...model.stream,
                scroller: {
                  ...model.stream.scroller,
                  isFollowing: true,
                },
              },
            },
          }
        }
      }
    },
    view: (index, model, h) => {
      const fixture = logStreamFixtures[index] ?? logStreamFixtures[0]
      return fixtureView(fixture, model, h)
    },
  },
)
