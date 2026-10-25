import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  typographyArticle,
  typographyArticleAr,
  typographyFixtures,
  type TypographyFixture,
} from '@/docs/components/pages/typography/shared'
import * as Typography from '@/ui/typography'

const InteractedWithTypographyPreview = defineMessageUnion({
  InteractedWithTypographyPreview: {},
})
type InteractedWithTypographyPreview =
  typeof InteractedWithTypographyPreview.Type
const TypographyPreviewModel = S.Struct({
  _docsPage: S.Literal('typography'),
})
type TypographyPreviewModel = typeof TypographyPreviewModel.Type

type Article = typeof typographyArticle

const FIRST_FIXTURE: TypographyFixture = { title: 'Basic', kind: 'article' }

const articleView = (
  a: Article,
  rtl: boolean,
  h: HtmlBuilder<InteractedWithTypographyPreview>,
): Html =>
  h.article(
    [h.Dir(rtl ? 'rtl' : 'ltr'), h.Class('w-full max-w-2xl')],
    [
      Typography.typographyH1({ children: [a.title] }, h),
      Typography.typographyLead({ children: [a.lead] }, h),
      Typography.typographyH2({ children: [a.kingsPlan] }, h),
      Typography.typographyP(
        {
          children: [
            a.kingThought,
            ' ',
            h.a(
              [
                h.Class(
                  'font-medium text-primary underline underline-offset-4',
                ),
                h.Href('#'),
              ],
              [a.brilliantPlan],
            ),
            a.taxJokes,
          ],
        },
        h,
      ),
      Typography.typographyBlockquote({ children: [a.blockquote] }, h),
      Typography.typographyH3({ children: [a.jokeTax] }, h),
      Typography.typographyP({ children: [a.subjectsNotAmused] }, h),
      h.ul(
        [h.Class('my-6 ms-6 list-disc [&>li]:mt-2')],
        a.list.map(item => h.li([], [item])),
      ),
      Typography.typographyP({ children: [a.stoppedTelling] }, h),
      Typography.typographyH3({ children: [a.jokestersRevolt] }, h),
      Typography.typographyP({ children: [a.sneaking] }, h),
      Typography.typographyP({ children: [a.discovered] }, h),
      Typography.typographyH3({ children: [a.peoplesRebellion] }, h),
      Typography.typographyP({ children: [a.uplifted] }, h),
      h.div(
        [h.Class('my-6 w-full overflow-y-auto')],
        [
          h.table(
            [h.Class('w-full')],
            [
              h.thead(
                [],
                [
                  h.tr(
                    [h.Class('m-0 border-t p-0 even:bg-muted')],
                    [
                      h.th(
                        [h.Class('border px-4 py-2 text-left font-bold')],
                        [a.treasury],
                      ),
                      h.th(
                        [h.Class('border px-4 py-2 text-left font-bold')],
                        [a.happiness],
                      ),
                    ],
                  ),
                ],
              ),
              h.tbody(
                [],
                a.rows.map(([left, right]) =>
                  h.tr(
                    [h.Class('m-0 border-t p-0 even:bg-muted')],
                    [
                      h.td([h.Class('border px-4 py-2 text-left')], [left]),
                      h.td([h.Class('border px-4 py-2 text-left')], [right]),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
      Typography.typographyP({ children: [a.realized] }, h),
      Typography.typographyP({ children: [a.moral] }, h),
    ],
  )

const fixtureView = (
  fixture: TypographyFixture,
  h: HtmlBuilder<InteractedWithTypographyPreview>,
): Html => {
  if (fixture.kind === 'article') {
    return articleView(
      fixture.rtl === true ? typographyArticleAr : typographyArticle,
      fixture.rtl === true,
      h,
    )
  }
  if (fixture.kind === 'table') {
    const a = typographyArticle
    return h.div(
      [h.Class('my-6 w-full overflow-y-auto')],
      [
        h.table(
          [h.Class('w-full')],
          [
            h.thead(
              [],
              [
                h.tr(
                  [h.Class('m-0 border-t p-0 even:bg-muted')],
                  [
                    h.th(
                      [h.Class('border px-4 py-2 text-left font-bold')],
                      [a.treasury],
                    ),
                    h.th(
                      [h.Class('border px-4 py-2 text-left font-bold')],
                      [a.happiness],
                    ),
                  ],
                ),
              ],
            ),
            h.tbody(
              [],
              a.rows.map(([left, right]) =>
                h.tr(
                  [h.Class('m-0 border-t p-0 even:bg-muted')],
                  [
                    h.td([h.Class('border px-4 py-2 text-left')], [left]),
                    h.td([h.Class('border px-4 py-2 text-left')], [right]),
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    )
  }
  if (fixture.kind === 'list') {
    return h.ul(
      [h.Class('my-6 ms-6 list-disc [&>li]:mt-2')],
      typographyArticle.list.map(item => h.li([], [item])),
    )
  }
  const children = fixture.children ?? ['']
  switch (fixture.component) {
    case 'typographyH1':
      return Typography.typographyH1({ children: [...children] }, h)
    case 'typographyH2':
      return Typography.typographyH2({ children: [...children] }, h)
    case 'typographyH3':
      return Typography.typographyH3({ children: [...children] }, h)
    case 'typographyH4':
      return Typography.typographyH4({ children: [...children] }, h)
    case 'typographyBlockquote':
      return Typography.typographyBlockquote({ children: [...children] }, h)
    case 'typographyInlineCode':
      return Typography.typographyInlineCode({ children: [...children] }, h)
    case 'typographyLead':
      return Typography.typographyLead({ children: [...children] }, h)
    case 'typographyLarge':
      return Typography.typographyLarge({ children: [...children] }, h)
    case 'typographySmall':
      return Typography.typographySmall({ children: [...children] }, h)
    case 'typographyMuted':
      return Typography.typographyMuted({ children: [...children] }, h)
    default:
      return Typography.typographyP({ children: [...children] }, h)
  }
}

export const typographyTailwindPreviewProgram = definePreviewProgram<
  TypographyPreviewModel,
  InteractedWithTypographyPreview
>({
  Model: TypographyPreviewModel,
  Message: InteractedWithTypographyPreview,
  init: () => ({ _docsPage: 'typography' }),
  update: model => ({ model: model }),
  view: (index, _model, h) =>
    fixtureView(typographyFixtures[index] ?? FIRST_FIXTURE, h),
})
