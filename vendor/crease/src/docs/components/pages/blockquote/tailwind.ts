import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  blockquoteFixtures,
  QUOTE_1,
  QUOTE_2,
  QUOTE_3,
  type BlockquoteFixture,
} from '@/docs/components/pages/blockquote/shared'
import * as Blockquote from '@/ui/blockquote'
import * as Card from '@/ui/card'

const InteractedWithBlockquotePreview = defineMessageUnion({
  InteractedWithBlockquotePreview: {},
})
type InteractedWithBlockquotePreview =
  typeof InteractedWithBlockquotePreview.Type
const BlockquotePreviewModel = S.Struct({ _docsPage: S.Literal('blockquote') })
type BlockquotePreviewModel = typeof BlockquotePreviewModel.Type

const quotePair = <Msg>(h: HtmlBuilder<Msg>): ReadonlyArray<Html> => [
  Blockquote.blockquote({ children: [QUOTE_1] }, h),
  Blockquote.blockquote({ cite: 'Steve Jobs', children: [QUOTE_2] }, h),
]

const renderFixture = <Msg>(
  fixture: BlockquoteFixture,
  h: HtmlBuilder<Msg>,
): Html => {
  switch (fixture.kind) {
    case 'showcase':
    case 'withCite':
      return h.div([h.Class('flex flex-col gap-4 max-w-125')], quotePair(h))
    case 'testimonials':
      return h.div(
        [h.Class('grid gap-4 sm:grid-cols-2 max-w-160')],
        (
          [
            ['Sarah K.', QUOTE_1],
            ['Marcus T.', QUOTE_2],
            ['Priya L.', QUOTE_3],
          ] as const
        ).map(([cite, quote], index) =>
          Card.card(
            {
              ...(index === 2 ? { class: 'sm:col-span-2' } : {}),
              children: [
                Card.cardContent(
                  {
                    children: [
                      Blockquote.blockquote({ cite, children: [quote] }, h),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ),
      )
  }
}

export const blockquoteTailwindPreviewProgram = definePreviewProgram<
  BlockquotePreviewModel,
  InteractedWithBlockquotePreview
>({
  Model: BlockquotePreviewModel,
  Message: InteractedWithBlockquotePreview,
  init: () => ({ _docsPage: 'blockquote' }),
  update: model => ({ model: model }),
  view: (index, _model, h) =>
    renderFixture(blockquoteFixtures[index] ?? blockquoteFixtures[0], h),
})
