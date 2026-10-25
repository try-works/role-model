import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  timerFixtures,
  type TimerFixture,
} from '@/docs/components/pages/timer/shared'
import { className } from '@/pleat/style'
import * as Timer from '@/pleat/timer'

const styles = {
  page: Style.make({ gap: '1rem', display: 'flex', flexDirection: 'column' }),
  pageTight: Style.make({
    gap: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  row: Style.make({ gap: '1.5rem', alignItems: 'center', display: 'flex' }),
  labelRow: Style.make({
    gap: '0.75rem',
    alignItems: 'center',
    display: 'flex',
  }),
  column: Style.make({
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  supporting: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
  }),
  large: Style.make({
    fontSize: '1.0625rem',
    fontWeight: 600,
    lineHeight: '1.5rem',
  }),
  body: Style.make({
    color: 'var(--foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
}

interface PreviewShape {
  readonly timer: Timer.Model
  readonly clock: Timer.Model
}

const supportingLabel = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  h.span([h.Class(className(styles.supporting))], [text])

const timerView = <Msg>(
  fixture: TimerFixture,
  model: PreviewShape,
  h: HtmlBuilder<Msg>,
): Html => {
  const emphasized = (field: Timer.Model): Html =>
    Timer.timer(
      {
        model: field,
        type: 'body',
        size: 'xl',
        color: 'primary',
        weight: 'semibold',
      },
      h,
    )
  switch (fixture.layout) {
    case 'showcase':
      return h.div(
        [h.Class(className(styles.page))],
        [
          h.span([h.Class(className(styles.large))], ['Processing']),
          h.div(
            [h.Class(className(styles.row))],
            [
              h.div(
                [h.Class(className(styles.column))],
                [supportingLabel('Elapsed', h), emphasized(model.timer)],
              ),
              h.div(
                [h.Class(className(styles.column))],
                [supportingLabel('Clock', h), emphasized(model.clock)],
              ),
            ],
          ),
        ],
      )
    case 'formats':
      return h.div(
        [h.Class(className(styles.pageTight))],
        [
          h.div(
            [h.Class(className(styles.labelRow))],
            [
              supportingLabel('Elapsed', h),
              Timer.timer(
                { model: model.timer, type: 'body', color: 'primary' },
                h,
              ),
            ],
          ),
          h.div(
            [h.Class(className(styles.labelRow))],
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
        [h.Class(className(reset.text, styles.body))],
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
        [h.Class(className(styles.pageTight))],
        [
          supportingLabel('Default', h),
          Timer.timer({ model: model.timer }, h),
          supportingLabel('Emphasized', h),
          emphasized(model.timer),
        ],
      )
  }
}

export const timerPleatPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const preview = model as PreviewShape
  const fixture = timerFixtures[index] ?? timerFixtures[0]
  return timerView(fixture, preview, h)
}
