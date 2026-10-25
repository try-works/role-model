import * as stylex from '@stylexjs/stylex'
import type { HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  indicatorFixtures,
  type IndicatorItem,
} from '@/docs/components/pages/indicator/shared'
import { className } from '@/stylex/style'
import * as Indicator from '@/stylex/indicator'

const styles = stylex.create({
  wrap: {
    gap: '1.5rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
  },
  item: { gap: '0.5rem', alignItems: 'center', display: 'flex' },
  caption: { fontSize: '0.875rem', lineHeight: '1.25rem' },
})

const indicatorItem = <Msg>(item: IndicatorItem, h: HtmlBuilder<Msg>) => {
  const base = {
    state: item.state,
    ...(item.size === undefined ? {} : { size: item.size }),
    ...(item.isDisabled === undefined ? {} : { isDisabled: item.isDisabled }),
  }
  return item.kind === 'check'
    ? Indicator.checkIndicator(
        {
          state: item.state === 'checked' ? 'checked' : 'unchecked',
          ...(item.isDisabled === undefined
            ? {}
            : { isDisabled: item.isDisabled }),
        },
        h,
      )
    : item.kind === 'checkbox'
      ? Indicator.checkboxIndicator(base, h)
      : Indicator.radioIndicator(base, h)
}

export const indicatorStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = indicatorFixtures[exampleIndex] ?? indicatorFixtures[0]
  return h.div(
    [h.Class(className(styles.wrap))],
    fixture.items.map(item =>
      h.div(
        [h.Class(className(styles.item))],
        [
          indicatorItem(item, h),
          h.span([h.Class(className(styles.caption))], [item.caption]),
        ],
      ),
    ),
  )
}
