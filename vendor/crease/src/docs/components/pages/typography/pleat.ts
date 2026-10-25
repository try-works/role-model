import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  typographyArticle,
  typographyArticleAr,
  typographyFixtures,
  type TypographyFixture,
} from '@/docs/components/pages/typography/shared'
import { className } from '@/pleat/style'
import * as Typography from '@/pleat/typography'

const styles = {
  article: Style.make({ maxWidth: '42rem', width: '100%' }),
  tableWrap: Style.make({
    marginBlock: '1.5rem',
    overflowY: 'auto',
    width: '100%',
  }),
  table: Style.make({ width: '100%' }),
  tr: Style.make({
    margin: '0',
    padding: '0',
    backgroundColor: 'transparent',
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
  }).pipe(Style.when(When.even, { backgroundColor: 'var(--muted)' })),
  th: Style.make({
    borderStyle: 'solid',
    borderWidth: '1px',
    paddingBlock: '0.5rem',
    paddingInline: '1rem',
    fontWeight: 700,
    textAlign: 'start',
  }),
  td: Style.make({
    borderStyle: 'solid',
    borderWidth: '1px',
    paddingBlock: '0.5rem',
    paddingInline: '1rem',
    textAlign: 'start',
  }),
  list: Style.make({
    marginBlock: '1.5rem',
    listStyleType: 'disc',
    marginInlineStart: '1.5rem',
  }),
  listItem: Style.make({ marginTop: '0.5rem' }),
  link: Style.make({
    color: 'var(--primary)',
    fontWeight: 500,
    textDecorationLine: 'underline',
    textUnderlineOffset: '4px',
  }),
}

type Article = typeof typographyArticle

const FIRST_FIXTURE: TypographyFixture = { title: 'Basic', kind: 'article' }

const tableView = <Msg>(a: Article, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class(className(styles.tableWrap))],
    [
      h.table(
        [h.Class(className(reset.table, styles.table))],
        [
          h.thead(
            [],
            [
              h.tr(
                [h.Class(className(styles.tr))],
                [
                  h.th(
                    [h.Class(className(reset.tableHeading, styles.th))],
                    [a.treasury],
                  ),
                  h.th(
                    [h.Class(className(reset.tableHeading, styles.th))],
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
                [h.Class(className(styles.tr))],
                [
                  h.td([h.Class(className(styles.td))], [left]),
                  h.td([h.Class(className(styles.td))], [right]),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  )

const articleView = <Msg>(
  a: Article,
  rtl: boolean,
  h: HtmlBuilder<Msg>,
): Html =>
  h.article(
    [h.Dir(rtl ? 'rtl' : 'ltr'), h.Class(className(styles.article))],
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
              [h.Class(className(reset.link, styles.link)), h.Href('#')],
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
        [h.Class(className(reset.list, styles.list))],
        a.list.map(item => h.li([h.Class(className(styles.listItem))], [item])),
      ),
      Typography.typographyP({ children: [a.stoppedTelling] }, h),
      Typography.typographyH3({ children: [a.jokestersRevolt] }, h),
      Typography.typographyP({ children: [a.sneaking] }, h),
      Typography.typographyP({ children: [a.discovered] }, h),
      Typography.typographyH3({ children: [a.peoplesRebellion] }, h),
      Typography.typographyP({ children: [a.uplifted] }, h),
      tableView(a, h),
      Typography.typographyP({ children: [a.realized] }, h),
      Typography.typographyP({ children: [a.moral] }, h),
    ],
  )

const fixtureView = <Msg>(
  fixture: TypographyFixture,
  h: HtmlBuilder<Msg>,
): Html => {
  if (fixture.kind === 'article') {
    return articleView(
      fixture.rtl === true ? typographyArticleAr : typographyArticle,
      fixture.rtl === true,
      h,
    )
  }
  if (fixture.kind === 'table') {
    return tableView(typographyArticle, h)
  }
  if (fixture.kind === 'list') {
    return h.ul(
      [h.Class(className(reset.list, styles.list))],
      typographyArticle.list.map(item =>
        h.li([h.Class(className(styles.listItem))], [item]),
      ),
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

export const typographyPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => fixtureView(typographyFixtures[exampleIndex] ?? FIRST_FIXTURE, h)
