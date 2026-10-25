import { Schema as S } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  circularProgressFixtures,
  type CircularProgressItem,
} from '@/docs/components/pages/circular-progress/shared'
import * as CircularProgress from '@/ui/circular-progress'

const InteractedWithCircularProgressPreview = defineMessageUnion({
  InteractedWithCircularProgressPreview: {},
})
type InteractedWithCircularProgressPreview =
  typeof InteractedWithCircularProgressPreview.Type
const CircularProgressPreviewModel = S.Struct({
  _docsPage: S.Literal('circular-progress'),
})
type CircularProgressPreviewModel = typeof CircularProgressPreviewModel.Type

const itemView = <Msg>(item: CircularProgressItem, h: HtmlBuilder<Msg>) =>
  CircularProgress.circularProgress(
    {
      label: item.label ?? 'Progress',
      isLabelHidden: item.isLabelHidden ?? true,
      ...(item.value === undefined ? {} : { value: item.value }),
      ...(item.max === undefined ? {} : { max: item.max }),
      ...(item.variant === undefined ? {} : { variant: item.variant }),
      ...(item.size === undefined ? {} : { size: item.size }),
      ...(item.hasValueLabel === undefined
        ? {}
        : { hasValueLabel: item.hasValueLabel }),
      ...(item.formatValueLabel === undefined
        ? {}
        : {
            formatValueLabel: (value: number, max: number) => `${value}/${max}`,
          }),
      ...(item.isDisabled === undefined ? {} : { isDisabled: item.isDisabled }),
      ...(item.isIndeterminate === undefined
        ? {}
        : { isIndeterminate: item.isIndeterminate }),
    },
    h,
  )

export const circularProgressTailwindPreviewProgram = definePreviewProgram<
  CircularProgressPreviewModel,
  InteractedWithCircularProgressPreview
>({
  Model: CircularProgressPreviewModel,
  Message: InteractedWithCircularProgressPreview,
  init: () => ({ _docsPage: 'circular-progress' }),
  update: model => ({ model: model }),
  view: (index, _model, h) => {
    const fixture =
      circularProgressFixtures[index] ?? circularProgressFixtures[0]
    return fixture.layout === 'row'
      ? h.div(
          [h.Class('flex flex-wrap items-center gap-6')],
          fixture.items.map(item => itemView(item, h)),
        )
      : h.div(
          [],
          fixture.items.map(item => itemView(item, h)),
        )
  },
})
