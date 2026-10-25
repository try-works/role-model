import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  headingFixtures,
  type HeadingFixture,
} from '@/docs/components/pages/heading/shared'
import * as Card from '@/stylex/card'
import * as Heading from '@/stylex/heading'
import { className } from '@/stylex/style'
import * as Text from '@/stylex/text'

const styles = stylex.create({
  column: {
    gap: '0.5rem',
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
  },
  cardColumn: {
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
  },
  demoColumn: {
    gap: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
  },
  box: {
    padding: '0.75rem',
    borderColor: 'var(--border)',
    borderStyle: 'solid',
    borderWidth: '1px',
    width: '300px',
  },
  pageColumn: {
    gap: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '400px',
    width: '100%',
  },
  card: {
    width: '300px',
  },
})

const renderFixture = <Msg>(
  fixture: HeadingFixture,
  h: HtmlBuilder<Msg>,
): Html => {
  switch (fixture.kind) {
    case 'showcase':
      return h.div(
        [h.Class(className(styles.column))],
        ([1, 2, 3, 4, 5, 6] as const).map(level =>
          Heading.heading({ level, children: [`Heading Level ${level}`] }, h),
        ),
      )
    case 'truncation':
      return h.div(
        [h.Class(className(styles.demoColumn))],
        [
          h.div(
            [h.Class(className(styles.box))],
            [
              Heading.heading(
                {
                  level: 2,
                  maxLines: 1,
                  children: [
                    'Very Long Heading That Will Be Truncated To One Line With Ellipsis',
                  ],
                },
                h,
              ),
            ],
          ),
          h.div(
            [h.Class(className(styles.box))],
            [
              Heading.heading(
                {
                  level: 2,
                  maxLines: 2,
                  children: [
                    'Very Long Heading That Will Be Truncated To Two Lines To Keep Card Layout Compact',
                  ],
                },
                h,
              ),
            ],
          ),
        ],
      )
    case 'pageHierarchy':
      return h.div(
        [h.Class(className(styles.pageColumn))],
        [
          h.div(
            [],
            [
              Heading.heading(
                { level: 1, children: ['Dashboard Overview'] },
                h,
              ),
              Text.text(
                {
                  type: 'supporting',
                  display: 'block',
                  children: ['Last updated 5 minutes ago'],
                },
                h,
              ),
            ],
          ),
          h.div(
            [],
            [
              Heading.heading({ level: 2, children: ['Recent Activity'] }, h),
              Text.text(
                {
                  type: 'body',
                  display: 'block',
                  children: ["Here's what's been happening in your workspace."],
                },
                h,
              ),
            ],
          ),
          h.div(
            [],
            [
              Heading.heading({ level: 3, children: ['Today'] }, h),
              Text.text(
                {
                  type: 'body',
                  display: 'block',
                  children: [
                    '• Project Alpha updated',
                    h.br([]),
                    '• 3 new comments',
                    h.br([]),
                    '• Task completed',
                  ],
                },
                h,
              ),
            ],
          ),
        ],
      )
    case 'cardGrid':
      return Card.card(
        {
          layoutStyle: styles.card,
          children: [
            Card.cardContent(
              {
                children: [
                  h.div(
                    [h.Class(className(styles.cardColumn))],
                    [
                      Heading.heading(
                        { level: 3, children: ['Card Title'] },
                        h,
                      ),
                      Text.text(
                        {
                          type: 'body',
                          maxLines: 2,
                          display: 'block',
                          children: [
                            'This is a card description that might be quite long and needs to be truncated after two lines to keep the card compact and uniform.',
                          ],
                        },
                        h,
                      ),
                      Text.text(
                        {
                          type: 'supporting',
                          display: 'block',
                          children: ['Updated 1 hour ago'],
                        },
                        h,
                      ),
                    ],
                  ),
                ],
              },
              h,
            ),
          ],
        },
        h,
      )
  }
}

export const headingStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => renderFixture(headingFixtures[exampleIndex] ?? headingFixtures[0], h)
