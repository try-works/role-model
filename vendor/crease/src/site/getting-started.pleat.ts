import { Style, When } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { view as docsGuideView } from '@/docs/getting-started-content'
import { view as lintDocsView } from '@/docs/lint-content'
import { pleatLintKit } from '@/site/lint-kit.pleat'
import type * as CodeBlock from '@/ui/code-block'
import { reset } from '@/pleat/reset'
import { className } from '@/pleat/style'
import { tokens } from '@/pleat/tokens'

const styles = {
  layout: Style.make({
    marginInline: 'auto',
    display: 'grid',
    width: '100%',
    maxWidth: '1500px',
    gridTemplateColumns: 'minmax(0,1fr)',
  }).pipe(
    Style.when(When.minWidth('1024px'), {
      gridTemplateColumns: '220px minmax(0,1fr) 190px',
    }),
  ),
  mobile: Style.make({
    display: 'block',
    margin: '1.25rem 1.25rem 0',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: '.5rem',
    backgroundColor: tokens.background,
  }).pipe(Style.when(When.minWidth('1024px'), { display: 'none' })),
  summary: Style.make({
    cursor: 'pointer',
    padding: '.75rem 1rem',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 600,
  }),
  mobileNavOuter: Style.make({
    maxHeight: '55vh',
    overflowY: 'auto',
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    padding: '.5rem',
  }),
  mobileNav: Style.make({
    display: 'grid',
    gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
    gap: '.125rem',
  }).pipe(
    Style.when(When.minWidth('640px'), {
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
    }),
  ),
  sidebar: Style.make({
    display: 'none',
    position: 'sticky',
    top: '3.5rem',
    height: 'calc(100vh - 3.5rem)',
    overflowY: 'auto',
    borderRightStyle: 'solid',
    borderRightWidth: 1,
    borderRightColor: tokens.border,
    padding: '2.5rem 1.25rem',
  }).pipe(Style.when(When.minWidth('1024px'), { display: 'block' })),
  main: Style.make({
    minWidth: 0,
    paddingBlock: '2.5rem',
    paddingInline: '1.25rem',
  }).pipe(
    Style.when(When.minWidth('1024px'), {
      paddingBlock: '3.5rem',
      paddingInline: '3rem',
    }),
    Style.when(When.minWidth('640px'), { paddingInline: '2rem' }),
  ),
  content: Style.make({
    marginInline: 'auto',
    maxWidth: '56rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '3rem',
  }),
  breadcrumb: Style.make({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '.5rem',
    marginBottom: '1rem',
  }),
  lead: Style.make({ maxWidth: '70ch', marginTop: '1rem' }),
  section: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    scrollMarginTop: '6rem',
  }),
  list: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '.5rem',
    paddingLeft: '1.25rem',
    color: tokens.mutedForeground,
    fontSize: '.875rem',
    lineHeight: '1.75rem',
    listStyleType: 'disc',
  }),
  link: Style.make({
    color: tokens.foreground,
    textDecorationLine: 'underline',
    textDecorationColor: tokens.border,
    textUnderlineOffset: '4px',
  }).pipe(
    Style.when(When.hover, {
      color: tokens.foreground,
      textDecorationColor: tokens.foreground,
    }),
  ),
  navLink: Style.make({
    display: 'block',
    borderRadius: '.375rem',
    padding: '.375rem .5rem',
    color: tokens.mutedForeground,
    backgroundColor: tokens.transparent,
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    transitionProperty: 'color, background-color',
    transitionDuration: '.15s',
  }).pipe(
    Style.when(When.hover, {
      color: tokens.foreground,
      backgroundColor: 'color-mix(in oklab, var(--muted) 60%, transparent)',
    }),
  ),
  navActive: Style.make({
    color: tokens.foreground,
    backgroundColor: tokens.muted,
    fontWeight: 500,
  }),
  navGroup: Style.make({ marginBottom: '1.5rem' }),
  navLabel: Style.make({
    marginBottom: '.75rem',
    paddingInline: '.5rem',
    color: tokens.foreground,
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 600,
  }),
  navList: Style.make({ display: 'grid', gap: '.125rem' }),
  toc: Style.make({
    display: 'none',
    position: 'sticky',
    top: '3.5rem',
    height: 'calc(100vh - 3.5rem)',
    overflowY: 'auto',
    padding: '2.5rem 1.25rem',
  }).pipe(Style.when(When.minWidth('1024px'), { display: 'block' })),
  tocLabel: Style.make({
    marginBottom: '.75rem',
    color: tokens.foreground,
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 600,
  }),
  tocList: Style.make({ display: 'grid', gap: '.5rem' }),
  tokenTableWrapper: Style.make({
    borderColor: tokens.border,
    borderRadius: '.5rem',
    borderStyle: 'solid',
    borderWidth: 1,
    overflowX: 'auto',
  }),
  tokenTable: Style.make({
    borderCollapse: 'collapse',
    minWidth: '34rem',
    width: '100%',
  }),
  tokenHead: Style.make({
    backgroundColor: 'color-mix(in oklab, var(--muted) 40%, transparent)',
    borderBlockEndColor: tokens.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: 1,
    paddingBlock: '.5rem',
    paddingInline: '.75rem',
    textAlign: 'start',
  }),
  tokenCell: Style.make({
    borderBlockEndColor: tokens.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: 1,
    paddingBlock: '.5rem',
    paddingInline: '.75rem',
    textAlign: 'left',
    verticalAlign: 'top',
  }),
  tokenName: Style.make({ whiteSpace: 'nowrap' }),
}

const classes = {
  layout: className(styles.layout),
  mobile: className(styles.mobile),
  summary: className(styles.summary),
  mobileNavOuter: className(styles.mobileNavOuter),
  mobileNav: className(reset.list, styles.mobileNav),
  sidebar: className(styles.sidebar),
  main: className(styles.main),
  content: className(styles.content),
  breadcrumb: className(reset.text, styles.breadcrumb),
  lead: className(reset.text, styles.lead),
  section: className(styles.section),
  list: className(reset.list, styles.list),
  link: className(reset.link, styles.link),
  navLink: className(reset.link, styles.navLink),
  navActive: className(reset.link, styles.navLink, styles.navActive),
  navGroup: className(styles.navGroup),
  navLabel: className(reset.text, styles.navLabel),
  navList: className(reset.list, styles.navList),
  toc: className(styles.toc),
  tocLabel: className(reset.text, styles.tocLabel),
  tocList: className(reset.list, styles.tocList),
  tokenTableWrapper: className(styles.tokenTableWrapper),
  tokenTable: className(styles.tokenTable),
  tokenHead: className(reset.text, styles.tokenHead),
  tokenCell: className(reset.text, styles.tokenCell),
  tokenName: className(styles.tokenName),
} satisfies Readonly<Record<string, string>>

export type DocsGuideCodeProps<Msg> = Readonly<{
  model: CodeBlock.Model
  toParentMessage: (message: CodeBlock.Message) => Msg
  sidebarScrolled: Msg
}>

export const view = <Msg>(
  codeBlock: DocsGuideCodeProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => docsGuideView('getting-started', h, classes, codeBlock)

export const themingView = <Msg>(
  codeBlock: DocsGuideCodeProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => docsGuideView('theming', h, classes, codeBlock)

export const lintView = <Msg>(
  codeBlock: DocsGuideCodeProps<Msg>,
  rule: string,
  h: HtmlBuilder<Msg>,
): Html => lintDocsView(rule, h, classes, codeBlock, pleatLintKit)
