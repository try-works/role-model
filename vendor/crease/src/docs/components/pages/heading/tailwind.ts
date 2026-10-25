import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  headingFixtures,
  type HeadingFixture,
} from '@/docs/components/pages/heading/shared'
import * as Card from '@/ui/card'
import * as Heading from '@/ui/heading'
import * as Text from '@/ui/text'

const InteractedWithHeadingPreview = defineMessageUnion({
  InteractedWithHeadingPreview: {},
})
type InteractedWithHeadingPreview = typeof InteractedWithHeadingPreview.Type
const HeadingPreviewModel = S.Struct({ _docsPage: S.Literal('heading') })
type HeadingPreviewModel = typeof HeadingPreviewModel.Type

const renderFixture = <Msg>(
  fixture: HeadingFixture,
  h: HtmlBuilder<Msg>,
): Html => {
  switch (fixture.kind) {
    case 'showcase':
      return h.div(
        [h.Class('flex flex-col gap-2 items-start')],
        ([1, 2, 3, 4, 5, 6] as const).map(level =>
          Heading.heading({ level, children: [`Heading Level ${level}`] }, h),
        ),
      )
    case 'truncation':
      return h.div(
        [h.Class('flex flex-col gap-6')],
        [
          h.div(
            [h.Class('w-75 border p-3')],
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
            [h.Class('w-75 border p-3')],
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
        [h.Class('flex flex-col gap-6 w-full max-w-100')],
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
          class: 'w-75',
          children: [
            Card.cardContent(
              {
                children: [
                  h.div(
                    [h.Class('flex flex-col gap-2')],
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

export const headingTailwindPreviewProgram = definePreviewProgram<
  HeadingPreviewModel,
  InteractedWithHeadingPreview
>({
  Model: HeadingPreviewModel,
  Message: InteractedWithHeadingPreview,
  init: () => ({ _docsPage: 'heading' }),
  update: model => ({ model: model }),
  view: (index, _model, h) =>
    renderFixture(headingFixtures[index] ?? headingFixtures[0], h),
})
