import { Style } from '@pleat/core'
import type { HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  indicatorFixtures,
  type IndicatorItem,
} from '@/docs/components/pages/indicator/shared'
import { className } from '@/pleat/style'
import * as Indicator from '@/pleat/indicator'

const styles = {
  wrap: Style.make({
    gap: '1.5rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
  }),
  item: Style.make({ gap: '0.5rem', alignItems: 'center', display: 'flex' }),
  caption: Style.make({ fontSize: '0.875rem', lineHeight: '1.25rem' }),
}

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

export const indicatorPleatPreview: ExamplePreviewProvider = <Msg>(
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
