import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  foldkitApplication,
  staticComponentApplication,
} from '@/docs/components/pages/authored-page'

export const paginationFixtures = [
  {
    title: 'Addressable pages',
    description:
      'The router-owned page generates real URLs and a finite current neighborhood.',
    kind: 'link',
    page: 6,
    siblingCount: 1,
  },
  {
    title: 'In-place results',
    description:
      'A parent Message updates results without pretending the action is a link.',
    kind: 'action',
    page: 2,
    siblingCount: 1,
  },
  {
    title: 'Compact neighborhood',
    description:
      'Zero siblings preserves boundaries and the current page for narrow layouts.',
    kind: 'link',
    page: 6,
    siblingCount: 0,
  },
  {
    title: 'Disabled boundary',
    description:
      'At page one, Previous is disabled and removed from sequential keyboard focus.',
    kind: 'action',
    page: 1,
    siblingCount: 1,
  },
  { title: 'Simple', kind: 'simple' },
  { title: 'Icons Only', kind: 'icons' },
  { title: 'RTL', kind: 'rtl' },
] as const

const linkSource = (
  fixture: { title: string; siblingCount: number },
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  staticComponentApplication({
    componentName: 'Pagination',
    componentSlug: 'pagination',
    renderer,
    exampleName: fixture.title,
    viewBody: `Pagination.paginationPages({
  page: 6,
  totalPages: 12,
  siblingCount: ${fixture.siblingCount},
  boundaryCount: 1,
  navigation: { kind: 'link', href: page => \`/invoices?page=\${page}\` },
  ariaLabel: 'Invoice pages',
}, h)`,
  })
const actionSource = (
  fixture: { title: string; page: number },
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  foldkitApplication({
    title: `Pagination — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Pagination from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/pagination'`,
    model: `export const Model = S.Struct({ page: S.Number })
export type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ChangedPage: { page: S.Number },
});
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { page: ${fixture.page} } })`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedPage': return { model: { ...model, page: message.page } }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Pagination — ${fixture.title}',
  body: h.main([], [Pagination.paginationPages({
    page: model.page,
    totalPages: 5,
    navigation: { kind: 'action', onNavigate: page => Message.ChangedPage({ page }) },
    ariaLabel: 'Search result pages',
  }, h)]),
})`,
  })
const numberedItems = (
  pages: ReadonlyArray<number>,
  activePage: number,
): string =>
  pages
    .map(
      page => `    Pagination.paginationItem({ children: [
      Pagination.paginationLink({ href: '#'${page === activePage ? ', isActive: true' : ''}, children: ['${page}'] }, h),
    ] }, h)`,
    )
    .join(',\n')

const simpleSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  staticComponentApplication({
    componentName: 'Pagination',
    componentSlug: 'pagination',
    renderer,
    exampleName: 'Simple',
    viewBody: `Pagination.pagination({ ariaLabel: 'Pagination', children: [
  Pagination.paginationContent({ children: [
${numberedItems([1, 2, 3, 4, 5], 2)}
  ] }, h),
] }, h)`,
  })

const rtlSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  staticComponentApplication({
    componentName: 'Pagination',
    componentSlug: 'pagination',
    renderer,
    exampleName: 'RTL',
    viewBody: `Pagination.pagination({ ariaLabel: 'Pagination', direction: 'rtl', children: [
  Pagination.paginationContent({ children: [
    Pagination.paginationItem({ children: [
      Pagination.paginationPrevious({ href: '#', direction: 'rtl', label: 'السابق' }, h),
    ] }, h),
${numberedItems([1, 2, 3], 2)},
    Pagination.paginationItem({ children: [
      Pagination.paginationEllipsis({}, h),
    ] }, h),
    Pagination.paginationItem({ children: [
      Pagination.paginationNext({ href: '#', direction: 'rtl', label: 'التالي' }, h),
    ] }, h),
  ] }, h),
] }, h)`,
  })

const iconsOnlySource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  return foldkitApplication({
    title: 'Pagination — Icons Only',
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
${
  isStyleX
    ? `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'
`
    : ''
}import * as Field from '@/${isStyleX ? 'stylex' : 'ui'}/field'
import * as Pagination from '@/${isStyleX ? 'stylex' : 'ui'}/pagination'
import * as Select from '@/${isStyleX ? 'stylex' : 'ui'}/select'

const items = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
] as const
${
  isStyleX
    ? `
const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' },
  field: { width: 'fit-content' },
  trigger: { width: '5rem' },
  pagination: { marginInline: 0, width: 'auto' },
})
`
    : ''
}`,
    model: `const RowsSelect = Select.create<string>()
export const Model = S.Struct({
  select: Select.Model,
  rowsPerPage: S.Option(S.String),
})
export type Model = typeof Model.Type`,
    messages: `export const GotRowsSelectMessage = taggedStruct('GotRowsSelectMessage', {
  message: Select.Message,
})
export const Message = S.Union([GotRowsSelectMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    select: Select.init({ id: 'select-rows-per-page' }),
    rowsPerPage: Option.some('25'),
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotRowsSelectMessage': {
      const next = RowsSelect.update(model.select, message.message)
      const commands = next.commands ?? []
      return {
        model: {
          ...model,
          select: next.model,
          rowsPerPage: Option.match(Option.fromNullishOr(next.outMessage), {
            onNone: () => model.rowsPerPage,
            onSome: selection =>
              selection._tag === 'Selected'
                ? Option.some(selection.value)
                : Option.none(),
          }),
        },
        commands: Command.mapMessages(commands, next =>
          GotRowsSelectMessage({ message: next })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Pagination — Icons Only',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    h.div([h.Class(${isStyleX ? 'className(styles.row)' : "'flex items-center justify-between gap-4'"})], [
      Field.field({ orientation: 'horizontal', ${isStyleX ? 'layoutStyle: layoutStyle({ width: "fit-content" })' : "class: 'w-fit'"}, children: [
        Field.fieldLabel({ for: 'select-rows-per-page', children: ['Rows per page'] }, h),
        RowsSelect.select({
          model: model.select,
          maybeSelectedValue: model.rowsPerPage,
          toParentMessage: message => GotRowsSelectMessage({ message }),
          ariaLabel: 'Rows per page',
          items: items,
          itemToValue: item => item.value,
          itemToLabel: item => item.label,
          ${isStyleX ? 'triggerLayoutStyle: styles.trigger' : "triggerClass: 'w-20'"},
        }, h),
      ] }, h),
      Pagination.pagination({ ariaLabel: 'Pagination', ${isStyleX ? 'layoutStyle: layoutStyle({ marginInline: 0, width: "auto" })' : "class: 'mx-0 w-auto'"}, children: [
        Pagination.paginationContent({ children: [
          Pagination.paginationItem({ children: [
            Pagination.paginationPrevious({ href: '#' }, h),
          ] }, h),
          Pagination.paginationItem({ children: [
            Pagination.paginationNext({ href: '#' }, h),
          ] }, h),
        ] }, h),
      ] }, h),
    ]),
  ]),
})`,
  })
}

const paginationExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  paginationFixtures.map(fixture => ({
    title: fixture.title,
    ...('description' in fixture ? { description: fixture.description } : {}),
    code:
      fixture.kind === 'link'
        ? linkSource(fixture, renderer)
        : fixture.kind === 'action'
          ? actionSource(fixture, renderer)
          : fixture.kind === 'simple'
            ? simpleSource(renderer)
            : fixture.kind === 'icons'
              ? iconsOnlySource(renderer)
              : rtlSource(renderer),
  }))

export const paginationExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, paginationExamplesFor(renderer))
