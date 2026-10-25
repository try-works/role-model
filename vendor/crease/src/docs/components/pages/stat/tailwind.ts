import { Schema as S } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  statFixtures,
  type StatItem,
} from '@/docs/components/pages/stat/shared'
import * as Card from '@/ui/card'
import * as Stat from '@/ui/stat'

const InteractedWithStatPreview = defineMessageUnion({
  InteractedWithStatPreview: {},
})
type InteractedWithStatPreview = typeof InteractedWithStatPreview.Type
const StatPreviewModel = S.Struct({ _docsPage: S.Literal('stat') })
type StatPreviewModel = typeof StatPreviewModel.Type

const sparkline = <Msg>(h: HtmlBuilder<Msg>) =>
  h.svg(
    [
      h.ViewBox('0 0 160 36'),
      h.Role('img'),
      h.AriaLabel('Rising trend'),
      h.Class('h-9 w-full text-primary'),
      h.Style({ display: 'block' }),
    ],
    [
      h.polyline(
        [
          h.Points('0,28 24,26 48,30 72,18 96,20 120,10 160,8'),
          h.Fill('none'),
          h.Stroke('currentColor'),
          h.StrokeWidth('3'),
          h.StrokeLinecap('round'),
          h.StrokeLinejoin('round'),
        ],
        [],
      ),
    ],
  )

const statView = <Msg>(item: StatItem, h: HtmlBuilder<Msg>) =>
  Stat.stat(
    {
      label: item.label,
      value: item.value,
      ...(item.delta === undefined ? {} : { delta: item.delta }),
      ...(item.description === undefined
        ? {}
        : { description: item.description }),
      ...(item.size === undefined ? {} : { size: item.size }),
      ...(item.withMedia === true ? { media: [sparkline(h)] } : {}),
    },
    h,
  )

const inCard = <Msg>(item: StatItem, h: HtmlBuilder<Msg>) =>
  Card.card(
    { children: [Card.cardContent({ children: [statView(item, h)] }, h)] },
    h,
  )

export const statTailwindPreviewProgram = definePreviewProgram<
  StatPreviewModel,
  InteractedWithStatPreview
>({
  Model: StatPreviewModel,
  Message: InteractedWithStatPreview,
  init: () => ({ _docsPage: 'stat' }),
  update: model => ({ model: model }),
  view: (index, _model, h) => {
    const fixture = statFixtures[index] ?? statFixtures[0]
    return fixture.layout === 'cards'
      ? h.div(
          [h.Class('grid grid-cols-3 gap-4')],
          fixture.items.map(item => inCard(item, h)),
        )
      : fixture.layout === 'row'
        ? h.div(
            [h.Class('flex items-end gap-8')],
            fixture.items.map(item => statView(item, h)),
          )
        : inCard(fixture.items[0] ?? { label: '', value: '' }, h)
  },
})
