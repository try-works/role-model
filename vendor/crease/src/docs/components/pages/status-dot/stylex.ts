import * as stylex from '@stylexjs/stylex'
import type { HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  statusDotFixtures,
  type StatusDotItem,
} from '@/docs/components/pages/status-dot/shared'
import { className } from '@/stylex/style'
import * as StatusDot from '@/stylex/status-dot'

const styles = stylex.create({
  row: { gap: '0.5rem', alignItems: 'center', display: 'flex' },
  list: { gap: '0.5rem', display: 'flex', flexDirection: 'column' },
  label: { fontSize: '0.875rem', lineHeight: '1.25rem' },
})

const statusDotItem = <Msg>(item: StatusDotItem, h: HtmlBuilder<Msg>) =>
  StatusDot.statusDot(
    {
      variant: item.variant,
      label: item.label,
      ...(item.pulsing === undefined ? {} : { pulsing: item.pulsing }),
    },
    h,
  )

export const statusDotStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = statusDotFixtures[exampleIndex] ?? statusDotFixtures[0]
  return fixture.layout === 'list'
    ? h.div(
        [h.Class(className(styles.list))],
        fixture.items.map(item =>
          h.div(
            [h.Class(className(styles.row))],
            [
              statusDotItem(item, h),
              h.span([h.Class(className(styles.label))], [item.label]),
            ],
          ),
        ),
      )
    : h.div(
        [h.Class(className(styles.row))],
        fixture.items.map(item => statusDotItem(item, h)),
      )
}
