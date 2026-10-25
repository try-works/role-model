import { Schema as S } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  indicatorFixtures,
  type IndicatorItem,
} from '@/docs/components/pages/indicator/shared'
import * as Indicator from '@/ui/indicator'

const InteractedWithIndicatorPreview = defineMessageUnion({
  InteractedWithIndicatorPreview: {},
})
type InteractedWithIndicatorPreview = typeof InteractedWithIndicatorPreview.Type
const IndicatorPreviewModel = S.Struct({ _docsPage: S.Literal('indicator') })
type IndicatorPreviewModel = typeof IndicatorPreviewModel.Type

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

export const indicatorTailwindPreviewProgram = definePreviewProgram<
  IndicatorPreviewModel,
  InteractedWithIndicatorPreview
>({
  Model: IndicatorPreviewModel,
  Message: InteractedWithIndicatorPreview,
  init: () => ({ _docsPage: 'indicator' }),
  update: model => ({ model: model }),
  view: (index, _model, h) => {
    const fixture = indicatorFixtures[index] ?? indicatorFixtures[0]
    return h.div(
      [h.Class('flex flex-wrap items-center gap-6 group/indicator')],
      fixture.items.map(item =>
        h.div(
          [h.Class('flex items-center gap-2')],
          [
            indicatorItem(item, h),
            h.span([h.Class('text-sm')], [item.caption]),
          ],
        ),
      ),
    )
  },
})
