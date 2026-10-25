import type { Html, HtmlBuilder } from 'foldkit/html'

import { view as docsGuideView } from '@/docs/getting-started-content'
import { view as lintDocsView } from '@/docs/lint-content'
import { tailwindLintKit } from '@/docs/lint/kit.tailwind'
import type * as CodeBlock from '@/ui/code-block'

const styles = {
  layout:
    'mx-auto grid w-full max-w-[1500px] lg:grid-cols-[220px_minmax(0,1fr)_190px]',
  mobile: 'mx-5 mt-5 rounded-lg border bg-background lg:hidden',
  summary: 'cursor-pointer px-4 py-3 text-sm font-semibold',
  mobileNavOuter: 'max-h-[55vh] overflow-y-auto border-t p-2',
  mobileNav: 'grid grid-cols-2 gap-0.5 sm:grid-cols-3',
  sidebar:
    'hidden border-r px-5 py-10 lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto',
  main: 'min-w-0 px-5 py-10 sm:px-8 lg:px-12 lg:py-14',
  content: 'mx-auto flex max-w-4xl flex-col gap-12',
  breadcrumb: 'mb-4 flex flex-wrap items-center gap-2',
  lead: 'mt-4 max-w-[70ch]',
  section: 'flex scroll-mt-24 flex-col gap-4',
  list: 'space-y-2 pl-5 text-sm leading-7 text-muted-foreground [&>li]:list-disc',
  link: 'text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground',
  navLink:
    'block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground',
  navActive:
    'block rounded-md bg-muted px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted',
  navGroup: 'mb-6',
  navLabel: 'mb-3 px-2 text-sm font-semibold',
  navList: 'space-y-0.5',
  toc: 'hidden px-5 py-10 lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto',
  tocLabel: 'mb-3 text-sm font-semibold',
  tocList: 'space-y-2',
  tokenTableWrapper: 'overflow-x-auto rounded-lg border',
  tokenTable: 'w-full min-w-[34rem] border-collapse',
  tokenHead: 'border-b bg-muted/40 px-3 py-2 text-left',
  tokenCell: 'border-b px-3 py-2 text-left align-top last:border-b-0',
  tokenName: 'whitespace-nowrap',
} as const

export type DocsGuideCodeProps<Msg> = Readonly<{
  model: CodeBlock.Model
  toParentMessage: (message: CodeBlock.Message) => Msg
  sidebarScrolled: Msg
}>

export const view = <Msg>(
  codeBlock: DocsGuideCodeProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => docsGuideView('getting-started', h, styles, codeBlock)

export const themingView = <Msg>(
  codeBlock: DocsGuideCodeProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => docsGuideView('theming', h, styles, codeBlock)

export const lintView = <Msg>(
  codeBlock: DocsGuideCodeProps<Msg>,
  rule: string,
  h: HtmlBuilder<Msg>,
): Html => lintDocsView(rule, h, styles, codeBlock, tailwindLintKit)
