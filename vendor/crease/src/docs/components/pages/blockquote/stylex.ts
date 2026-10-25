import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  blockquoteFixtures,
  QUOTE_1,
  QUOTE_2,
  QUOTE_3,
  type BlockquoteFixture,
} from '@/docs/components/pages/blockquote/shared'
import * as Blockquote from '@/stylex/blockquote'
import * as Card from '@/stylex/card'
import { className } from '@/stylex/style'

const styles = stylex.create({
  column: {
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '500px',
  },
  grid: {
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    maxWidth: '640px',
  },
  spanningCard: {
    gridColumnEnd: 'span 2',
    gridColumnStart: 'span 2',
  },
})

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
      return h.div([h.Class(className(styles.column))], quotePair(h))
    case 'testimonials':
      return h.div(
        [h.Class(className(styles.grid))],
        (
          [
            ['Sarah K.', QUOTE_1],
            ['Marcus T.', QUOTE_2],
            ['Priya L.', QUOTE_3],
          ] as const
        ).map(([cite, quote], index) =>
          Card.card(
            {
              ...(index === 2 ? { layoutStyle: styles.spanningCard } : {}),
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

export const blockquoteStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => renderFixture(blockquoteFixtures[exampleIndex] ?? blockquoteFixtures[0], h)
