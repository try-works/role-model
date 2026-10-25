import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { view as docsGuideView } from '@/docs/getting-started-content'
import { view as lintDocsView } from '@/docs/lint-content'
import { stylexLintKit } from '@/site/lint-kit.stylex'
import type * as CodeBlock from '@/ui/code-block'
import { reset } from '@/stylex/reset'
import { className } from '@/stylex/style'
import { tokens } from '@/stylex/tokens.stylex'

const styles = stylex.create({
  layout: {
    marginInline: 'auto',
    display: 'grid',
    width: '100%',
    maxWidth: '1500px',
    gridTemplateColumns: {
      default: 'minmax(0,1fr)',
      '@media (min-width: 1024px)': '220px minmax(0,1fr) 190px',
    },
  },
  mobile: {
    display: { default: 'block', '@media (min-width: 1024px)': 'none' },
    margin: '1.25rem 1.25rem 0',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: '.5rem',
    backgroundColor: tokens.background,
  },
  summary: {
    cursor: 'pointer',
    padding: '.75rem 1rem',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 600,
  },
  mobileNavOuter: {
    maxHeight: '55vh',
    overflowY: 'auto',
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    padding: '.5rem',
  },
  mobileNav: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(2,minmax(0,1fr))',
      '@media (min-width: 640px)': 'repeat(3,minmax(0,1fr))',
    },
    gap: '.125rem',
  },
  sidebar: {
    display: { default: 'none', '@media (min-width: 1024px)': 'block' },
    position: 'sticky',
    top: '3.5rem',
    height: 'calc(100vh - 3.5rem)',
    overflowY: 'auto',
    borderRightStyle: 'solid',
    borderRightWidth: 1,
    borderRightColor: tokens.border,
    padding: '2.5rem 1.25rem',
  },
  main: {
    minWidth: 0,
    paddingBlock: { default: '2.5rem', '@media (min-width: 1024px)': '3.5rem' },
    paddingInline: {
      default: '1.25rem',
      '@media (min-width: 640px)': '2rem',
      '@media (min-width: 1024px)': '3rem',
    },
  },
  content: {
    marginInline: 'auto',
    maxWidth: '56rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '3rem',
  },
  breadcrumb: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '.5rem',
    marginBottom: '1rem',
  },
  lead: {
    maxWidth: '70ch',
    marginTop: '1rem',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    scrollMarginTop: '6rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '.5rem',
    paddingLeft: '1.25rem',
    color: tokens.mutedForeground,
    fontSize: '.875rem',
    lineHeight: '1.75rem',
    listStyleType: 'disc',
  },
  link: {
    color: { default: tokens.foreground, ':hover': tokens.foreground },
    textDecorationLine: 'underline',
    textDecorationColor: {
      default: tokens.border,
      ':hover': tokens.foreground,
    },
    textUnderlineOffset: '4px',
  },
  navLink: {
    display: 'block',
    borderRadius: '.375rem',
    padding: '.375rem .5rem',
    color: { default: tokens.mutedForeground, ':hover': tokens.foreground },
    backgroundColor: {
      default: tokens.transparent,
      ':hover': 'color-mix(in oklab, var(--muted) 60%, transparent)',
    },
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    transitionProperty: 'color, background-color',
    transitionDuration: '.15s',
  },
  navActive: {
    color: tokens.foreground,
    backgroundColor: tokens.muted,
    fontWeight: 500,
  },
  navGroup: { marginBottom: '1.5rem' },
  navLabel: {
    marginBottom: '.75rem',
    paddingInline: '.5rem',
    color: tokens.foreground,
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 600,
  },
  navList: { display: 'grid', gap: '.125rem' },
  toc: {
    display: { default: 'none', '@media (min-width: 1024px)': 'block' },
    position: 'sticky',
    top: '3.5rem',
    height: 'calc(100vh - 3.5rem)',
    overflowY: 'auto',
    padding: '2.5rem 1.25rem',
  },
  tocLabel: {
    marginBottom: '.75rem',
    color: tokens.foreground,
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 600,
  },
  tocList: {
    display: 'grid',
    gap: '.5rem',
  },
  tokenTableWrapper: {
    borderColor: tokens.border,
    borderRadius: '.5rem',
    borderStyle: 'solid',
    borderWidth: 1,
    overflowX: 'auto',
  },
  tokenTable: {
    borderCollapse: 'collapse',
    minWidth: '34rem',
    width: '100%',
  },
  tokenHead: {
    backgroundColor: 'color-mix(in oklab, var(--muted) 40%, transparent)',
    borderBlockEndColor: tokens.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: 1,
    paddingBlock: '.5rem',
    paddingInline: '.75rem',
    textAlign: 'start',
  },
  tokenCell: {
    borderBlockEndColor: tokens.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: 1,
    paddingBlock: '.5rem',
    paddingInline: '.75rem',
    textAlign: 'left',
    verticalAlign: 'top',
  },
  tokenName: {
    whiteSpace: 'nowrap',
  },
})

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
): Html => lintDocsView(rule, h, classes, codeBlock, stylexLintKit)
