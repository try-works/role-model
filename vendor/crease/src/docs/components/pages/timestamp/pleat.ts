import { Style } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import type { ComponentLayoutStyle } from '@/pleat/contracts'
import {
  timestampFixtures,
  type TimestampFixture,
  type TimestampStampSpec,
} from '@/docs/components/pages/timestamp/shared'
import { className } from '@/pleat/style'
import * as Timestamp from '@/pleat/timestamp'

const styles = {
  page: Style.make({ gap: '1rem', display: 'flex', flexDirection: 'column' }),
  section: Style.make({
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  row: Style.make({ gap: '1rem', alignItems: 'center', display: 'flex' }),
  column: Style.make({
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  supporting: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
  }),
  disabledInk: Style.make({
    color: 'color-mix(in oklab, var(--muted-foreground) 60%, transparent)',
    opacity: 1,
  }),
}

interface PreviewShape {
  readonly stamps: ReadonlyArray<Timestamp.Model>
}

const stampView = <Msg>(
  stamp: TimestampStampSpec,
  model: Timestamp.Model,
  index: number,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  Timestamp.timestamp(
    {
      model,
      toParentMessage: message =>
        onMessageJson(
          JSON.stringify({
            _tag: 'GotTimestampMessage',
            index,
            message,
          }),
        ),
      ...(stamp.type === undefined ? {} : { type: stamp.type }),
      ...(stamp.color === undefined ? {} : { color: stamp.color }),
      ...(stamp.color === 'disabled'
        ? { layoutStyle: styles.disabledInk as ComponentLayoutStyle }
        : {}),
      ...(stamp.isTimezoneShown === true ? { isTimezoneShown: true } : {}),
      ...(stamp.tooltipEntries === undefined
        ? {}
        : { tooltipEntries: stamp.tooltipEntries }),
    },
    h,
  )

const timestampView = <Msg>(
  fixture: TimestampFixture,
  model: PreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  let stampIndex = 0
  const sections = fixture.sections.map(section => {
    const stamps = section.stamps.map(stamp => {
      const stampModel = model.stamps[stampIndex]
      const index = stampIndex
      stampIndex += 1
      return stampModel === undefined
        ? h.empty
        : stampView(stamp, stampModel, index, onMessageJson, h)
    })
    const group = h.div(
      [
        h.Class(
          className(
            section.direction === 'horizontal' ? styles.row : styles.column,
          ),
        ),
      ],
      stamps,
    )
    return section.label === undefined
      ? group
      : h.div(
          [h.Class(className(styles.section))],
          [
            h.span([h.Class(className(styles.supporting))], [section.label]),
            group,
          ],
        )
  })
  return h.div([h.Class(className(styles.page))], sections)
}

export const timestampPleatPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const preview = model as PreviewShape
  const fixture = timestampFixtures[index] ?? timestampFixtures[0]
  return timestampView(fixture, preview, onMessageJson, h)
}
