import { reset } from '@/pleat/reset'
import { className } from '@/pleat/style'
import { previewLayout } from '@/docs/components/preview-layout.pleat'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  logStreamFixtures,
  logStreamLiveScript,
  type LogFixtureEntry,
} from '@/docs/components/pages/log-stream/shared'
import * as Button from '@/pleat/button'
import * as LogStream from '@/pleat/log-stream'
import * as StatusDot from '@/pleat/status-dot'

interface PreviewShape {
  readonly stream: LogStream.Model
  readonly entries: ReadonlyArray<LogFixtureEntry>
}

const toEntries = (
  rows: ReadonlyArray<LogFixtureEntry>,
  h: HtmlBuilder<never>,
): ReadonlyArray<LogStream.LogEntry> =>
  rows.map(row => ({
    ...row,
    ...(row.detailText === undefined
      ? {}
      : {
          detail: h.pre(
            [h.Class(className(reset.text, previewLayout.log))],
            [row.detailText],
          ),
        }),
  }))

export const logStreamPleatPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const preview = model as PreviewShape
  const fixture = logStreamFixtures[index] ?? logStreamFixtures[0]
  const toStream = (message: LogStream.Message): Msg =>
    onMessageJson(JSON.stringify({ _tag: 'GotStreamMessage', message }))
  const stream = LogStream.logStream(
    {
      model: preview.stream,
      toParentMessage: toStream,
      entries: toEntries(preview.entries, h as never),
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
  const isFollowing = preview.stream.scroller.isFollowing
  const baseCount = fixture.entries.length
  return h.div(
    [h.Class(className(previewLayout.compactStack))],
    [
      h.div(
        [h.Class(className(previewLayout.row))],
        [
          StatusDot.statusDot(
            {
              variant: isFollowing ? 'success' : 'neutral',
              label: isFollowing ? 'Following latest' : 'Not following',
            },
            h,
          ),
          h.span(
            [h.Class(className(previewLayout.status))],
            [`${String(preview.entries.length)} rows`],
          ),
          Button.button(
            {
              variant: 'secondary',
              children: ['Append line'],
              isDisabled:
                preview.entries.length - baseCount >=
                logStreamLiveScript.length,
              onClick: onMessageJson(JSON.stringify({ _tag: 'ClickedAppend' })),
            },
            h,
          ),
          Button.button(
            {
              variant: 'ghost',
              children: ['Reset'],
              onClick: onMessageJson(JSON.stringify({ _tag: 'ClickedReset' })),
            },
            h,
          ),
        ],
      ),
      stream,
    ],
  )
}
