import { Schema as S } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  statusDotFixtures,
  type StatusDotItem,
} from '@/docs/components/pages/status-dot/shared'
import * as StatusDot from '@/ui/status-dot'

const InteractedWithStatusDotPreview = defineMessageUnion({
  InteractedWithStatusDotPreview: {},
})
type InteractedWithStatusDotPreview = typeof InteractedWithStatusDotPreview.Type
const StatusDotPreviewModel = S.Struct({ _docsPage: S.Literal('status-dot') })
type StatusDotPreviewModel = typeof StatusDotPreviewModel.Type

const statusDotItem = <Msg>(item: StatusDotItem, h: HtmlBuilder<Msg>) =>
  StatusDot.statusDot(
    {
      variant: item.variant,
      label: item.label,
      ...(item.pulsing === undefined ? {} : { pulsing: item.pulsing }),
    },
    h,
  )

export const statusDotTailwindPreviewProgram = definePreviewProgram<
  StatusDotPreviewModel,
  InteractedWithStatusDotPreview
>({
  Model: StatusDotPreviewModel,
  Message: InteractedWithStatusDotPreview,
  init: () => ({ _docsPage: 'status-dot' }),
  update: model => ({ model: model }),
  view: (index, _model, h) => {
    const fixture = statusDotFixtures[index] ?? statusDotFixtures[0]
    return fixture.layout === 'list'
      ? h.div(
          [h.Class('flex flex-col gap-2')],
          fixture.items.map(item =>
            h.div(
              [h.Class('flex items-center gap-2')],
              [
                statusDotItem(item, h),
                h.span([h.Class('text-sm')], [item.label]),
              ],
            ),
          ),
        )
      : h.div(
          [h.Class('flex items-center gap-2')],
          fixture.items.map(item => statusDotItem(item, h)),
        )
  },
})
