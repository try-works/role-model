import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
export type SeparatorKind = 'demo' | 'vertical' | 'menu' | 'list' | 'rtl'

export interface SeparatorFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: SeparatorKind
}

export const separatorFixtures: Readonly<
  [SeparatorFixture, ...Array<SeparatorFixture>]
> = [
  { title: 'Basic', heroOnly: true, kind: 'demo' },
  {
    title: 'Vertical',
    description: 'Use orientation="vertical" for a vertical separator.',
    kind: 'vertical',
  },
  {
    title: 'Menu',
    description: 'Vertical separators between menu items with descriptions.',
    kind: 'menu',
  },
  {
    title: 'List',
    description: 'Horizontal separators between list items.',
    kind: 'list',
  },
  {
    title: 'RTL',
    description: 'The separator renders mirrored in right-to-left contexts.',
    kind: 'rtl',
  },
]

export interface SeparatorCopy {
  readonly title: string
  readonly subtitle: string
  readonly description: string
}

export const separatorCopy = (kind: SeparatorKind): SeparatorCopy =>
  kind === 'rtl'
    ? {
        title: 'CreaseUI',
        subtitle: 'الأساس لنظام التصميم الخاص بك',
        description:
          'مجموعة من المكونات المصممة بشكل جميل يمكنك تخصيصها وتوسيعها والبناء عليها.',
      }
    : {
        title: 'CreaseUI',
        subtitle: 'The Foundation for your Design System',
        description:
          'A set of beautifully designed components that you can customize, extend, and build on.',
      }

export const menuItems = (
  kind: SeparatorKind,
): ReadonlyArray<{ readonly heading: string; readonly note: string }> =>
  kind === 'menu'
    ? [
        { heading: 'Settings', note: 'Manage preferences' },
        { heading: 'Account', note: 'Profile & security' },
        { heading: 'Help', note: 'Support & docs' },
      ]
    : []

export const listItems = (
  kind: SeparatorKind,
): ReadonlyArray<{ readonly item: string; readonly value: string }> =>
  kind === 'list'
    ? [
        { item: 'Item 1', value: 'Value 1' },
        { item: 'Item 2', value: 'Value 2' },
        { item: 'Item 3', value: 'Value 3' },
      ]
    : []

const sq = (value: string): string => value.replaceAll("'", "\\'")

const cardMarkup = (kind: SeparatorKind, isStyleX: boolean): string => {
  const copy = separatorCopy(kind)
  const attrs = kind === 'rtl' ? `, h.Dir('rtl')` : ''
  const outer = isStyleX
    ? `h.Class(className(styles.card))`
    : `h.Class('flex max-w-sm flex-col gap-4 text-sm')`
  const inner = isStyleX
    ? `h.Class(className(styles.header))`
    : `h.Class('flex flex-col gap-1.5')`
  const title = isStyleX
    ? `h.Class(className(styles.title))`
    : `h.Class('leading-none font-medium')`
  const subtitle = isStyleX
    ? `h.Class(className(styles.muted))`
    : `h.Class('text-muted-foreground')`
  return `    h.div([${outer}${attrs}], [
      h.div([${inner}], [
        h.div([${title}], ['${sq(copy.title)}']),
        h.div([${subtitle}], ['${sq(copy.subtitle)}']),
      ]),
      Separator.separator({}, h),
      h.div([], ['${sq(copy.description)}']),
    ])`
}

const emitBody = (fixture: SeparatorFixture, isStyleX: boolean): string => {
  switch (fixture.kind) {
    case 'demo':
    case 'rtl':
      return cardMarkup(fixture.kind, isStyleX)
    case 'vertical': {
      const outer = isStyleX
        ? `h.Class(className(styles.verticalRow))`
        : `h.Class('flex h-5 items-center gap-4 text-sm')`
      return `    h.div([${outer}], [
      h.div([], ['Blog']),
      Separator.separator({ orientation: 'vertical' }, h),
      h.div([], ['Docs']),
      Separator.separator({ orientation: 'vertical' }, h),
      h.div([], ['Source']),
    ])`
    }
    case 'menu': {
      const outer = isStyleX
        ? `h.Class(className(styles.menuRow))`
        : `h.Class('flex items-center gap-2 text-sm md:gap-4')`
      const item = isStyleX
        ? `h.Class(className(styles.header))`
        : `h.Class('flex flex-col gap-1')`
      const itemHidden = isStyleX
        ? `h.Class(className(styles.header, styles.hiddenBelowMd))`
        : `h.Class('hidden flex-col gap-1 md:flex')`
      const heading = isStyleX
        ? `h.Class(className(styles.title))`
        : `h.Class('font-medium')`
      const note = isStyleX
        ? `h.Class(className(styles.note))`
        : `h.Class('text-xs text-muted-foreground')`
      const separatorClass = isStyleX
        ? `Separator.separator({ orientation: 'vertical' }, h)`
        : `Separator.separator({ orientation: 'vertical', class: 'self-stretch' }, h)`
      const separatorHidden = isStyleX
        ? `h.div([h.Class(className(styles.hiddenBelowMdBlock))], [\n        Separator.separator({ orientation: 'vertical', layoutStyle: layoutStyle({ height: "100%" }) }, h),\n      ])`
        : `Separator.separator({ orientation: 'vertical', class: 'hidden self-stretch md:block' }, h)`
      return `    h.div([${outer}], [
      h.div([${item}], [
        h.span([${heading}], ['Settings']),
        h.span([${note}], ['Manage preferences']),
      ]),
      ${separatorClass},
      h.div([${item}], [
        h.span([${heading}], ['Account']),
        h.span([${note}], ['Profile & security']),
      ]),
      ${separatorHidden},
      h.div([${itemHidden}], [
        h.span([${heading}], ['Help']),
        h.span([${note}], ['Support & docs']),
      ]),
    ])`
    }
    case 'list': {
      const outer = isStyleX
        ? `h.Class(className(styles.listStack))`
        : `h.Class('flex w-full max-w-sm flex-col gap-2 text-sm')`
      const row = isStyleX
        ? `h.Class(className(styles.listRow))`
        : `h.Class('flex items-center justify-between')`
      const value = isStyleX
        ? `h.Class(className(styles.muted))`
        : `h.Class('text-muted-foreground')`
      const rows = listItems('list')
        .map(
          (
            entry,
            index,
          ) => `      ${index === 0 ? '' : 'Separator.separator({}, h),\n      '}h.dl([${row}], [
        h.dt([], ['${entry.item}']),
        h.dd([${value}], ['${entry.value}']),
      ])`,
        )
        .join(',\n')
      return `    h.div([${outer}], [\n${rows}\n    ])`
    }
  }
}

const emitStyles = (fixture: SeparatorFixture): string => {
  switch (fixture.kind) {
    case 'demo':
    case 'rtl':
      return `  card: { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '24rem', fontSize: '0.875rem', lineHeight: '1.25rem' },
  header: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  title: { lineHeight: '1', fontWeight: '500' },
  muted: { color: tokens.mutedForeground },`
    case 'vertical':
      return `  verticalRow: { display: 'flex', alignItems: 'center', gap: '1rem', height: '1.25rem', fontSize: '0.875rem', lineHeight: '1.25rem' },`
    case 'menu':
      return `  menuRow: { display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', lineHeight: '1.25rem' },
  header: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  title: { fontWeight: '500' },
  note: { fontSize: '0.75rem', lineHeight: '1rem', color: tokens.mutedForeground },
  hiddenBelowMd: { display: { default: 'none', '@media (min-width: 768px)': 'flex' }, flexDirection: 'column', gap: '0.25rem' },
  hiddenBelowMdBlock: { display: { default: 'none', '@media (min-width: 768px)': 'block' } },
  separatorFill: { height: '100%' },`
    case 'list':
      return `  listStack: { display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: '24rem', fontSize: '0.875rem', lineHeight: '1.25rem' },
  listRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  muted: { color: tokens.mutedForeground },`
  }
}

const emitApplication = (
  fixture: SeparatorFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const stylexStylesBlock = isStyleX
    ? `\n\nconst styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
${emitStyles(fixture)}
})`
    : ''
  const sep = isStyleX ? 'stylex' : 'ui'
  const classNameImport = isStyleX
    ? `\nimport { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'`
    : ''
  return foldkitApplication({
    title: `Separator — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
${isStyleX ? `import * as stylex from '@stylexjs/stylex'` : ''}
import * as Separator from '@/${sep}/separator'${isStyleX ? `\nimport { tokens } from '@/stylex/tokens.stylex'` : ''}${classNameImport}${stylexStylesBlock}`,
    model: `export const Model = S.Struct({})
export type Model = typeof Model.Type`,
    messages: `export const NoOp = taggedStruct('NoOp')
export const Message = S.Union([NoOp])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: {} })`,
    update: `export const update = (model: Model, _message: Message): Update.Return<Model, Message> => ({ model })`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Separator — ${sq(fixture.title)}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
${emitBody(fixture, isStyleX)}
  ]),
})`,
  })
}

const separatorExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  separatorFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitApplication(fixture, renderer),
  }))

export const separatorExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, separatorExamplesFor(renderer))
