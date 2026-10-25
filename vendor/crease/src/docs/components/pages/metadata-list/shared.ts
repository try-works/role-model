import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type MetadataListItemSpec = Readonly<{
  label: string
  /** Plain-text value. */
  value?: string
  /** Renders the value as a row of chip badges (astryx Token + HStack). */
  tokens?: ReadonlyArray<string>
}>

export type MetadataListFixture = Readonly<{
  title: string
  description: string
  columns?: 'multi'
  orientation?: 'horizontal'
  maxNumOfItems?: number
  items: ReadonlyArray<MetadataListItemSpec>
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/MetadataList/*.tsx +
   *.doc.mjs — same demos, same copy. astryx Token chips map to Badge. */
export const metadataListFixtures: Readonly<
  [MetadataListFixture, ...Array<MetadataListFixture>]
> = [
  {
    title: 'MetadataList',
    description: 'Single-column key-value metadata list.',
    items: [
      { label: 'Name', value: 'MetadataList' },
      { label: 'Status', value: 'Active' },
      { label: 'Owner', value: 'Joey' },
    ],
  },
  {
    title: 'MetadataList — Basic',
    description: 'Single-column key-value metadata list.',
    items: [
      { label: 'Name', value: 'MetadataList' },
      { label: 'Status', value: 'Active' },
      { label: 'Owner', value: 'Joey' },
    ],
  },
  {
    title: 'MetadataList — Collapsible',
    description:
      'Metadata list with a show-more toggle after a set number of items.',
    maxNumOfItems: 3,
    items: [
      { label: 'Name', value: 'MetadataList' },
      { label: 'Status', value: 'Active' },
      { label: 'Owner', value: 'Joey' },
      { label: 'Created', value: 'Jan 15, 2026' },
      { label: 'Updated', value: 'Mar 26, 2026' },
      { label: 'Priority', value: 'Tier 1' },
    ],
  },
  {
    title: 'MetadataList — Horizontal',
    description: 'Horizontal metadata items for compact inline display.',
    orientation: 'horizontal',
    items: [
      { label: 'Status', value: 'Active' },
      { label: 'Type', value: 'Premium' },
      { label: 'Owner', value: 'Joey' },
      { label: 'Created', value: 'Jan 15, 2026' },
    ],
  },
  {
    title: 'MetadataList — Multi-Column',
    description: 'Multi-column metadata grid with token tags.',
    columns: 'multi',
    items: [
      { label: 'Name', value: 'MetadataList' },
      { label: 'Status', value: 'Active' },
      { label: 'Owner', value: 'Joey' },
      { label: 'Created', value: 'Jan 15, 2026' },
      { label: 'Tags', tokens: ['component', 'xds'] },
      { label: 'Priority', value: 'Tier 1' },
    ],
  },
]

// ---------- generated example source ----------

const itemSource = (item: MetadataListItemSpec): string => {
  const children =
    item.tokens === undefined
      ? `'${item.value ?? ''}'`
      : `h.div([h.Class('flex items-center gap-1')], [
          ${item.tokens
            .map(
              token =>
                `Badge.badge({ variant: 'secondary', children: ['${token}'] }, h)`,
            )
            .join(',\n          ')},
        ])`
  return `MetadataList.metadataListItem({ label: '${item.label}', stacked: layout.isStacked, children: [
        ${children},
      ] }, h)`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = metadataListFixtures[index] ?? metadataListFixtures[0]
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const uiDir = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const usesBadge = fixture.items.some(item => item.tokens !== undefined)
  const listArgs = [
    'model: model.list',
    'toParentMessage: message => GotListMessage({ message })',
    `id: 'metadata-list-${tag.toLowerCase()}'`,
    ...(fixture.columns === undefined ? [] : [`columns: '${fixture.columns}'`]),
    ...(fixture.orientation === undefined
      ? []
      : [`orientation: '${fixture.orientation}'`]),
    ...(fixture.maxNumOfItems === undefined
      ? []
      : [`maxNumOfItems: ${String(fixture.maxNumOfItems)}`]),
  ].join(',\n      ')
  const layoutArgs = [
    ...(fixture.columns === undefined ? [] : [`columns: '${fixture.columns}'`]),
    ...(fixture.orientation === undefined
      ? []
      : [`orientation: '${fixture.orientation}'`]),
  ].join(', ')
  return foldkitApplication({
    title: `Metadata List — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

${usesBadge ? `import * as Badge from '@/${uiDir}/badge'\n` : ''}import * as MetadataList from '@/${uiDir}/metadata-list'${renderer !== 'tailwind' ? "\nimport { className } from '@/stylex/style'\nimport * as stylex from '@stylexjs/stylex'\n\nconst styles = stylex.create({ page: { marginInline: 'auto', width: '100%', maxWidth: '42rem', padding: '2rem' } })" : ''}`,
    model: `export const Model = S.Struct({
  list: MetadataList.Model,
})
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotListMessage = taggedStruct('GotMetadataListMessage${tag}', { message: MetadataList.Message });
export const Message = S.Union([GotListMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: { list: MetadataList.init() },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotMetadataListMessage${tag}': {
      const listOp__ = MetadataList.update(model.list, message.message);
      return { model: { ...model, list: listOp__.model } };
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const layout = MetadataList.resolveLayout({ ${layoutArgs} });
  return {
    title: 'Metadata List — ${fixture.title}',
    body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.page)' : "'mx-auto w-full max-w-2xl p-8'"})], [
      MetadataList.metadataList({
      ${listArgs},
        children: [
          ${fixture.items.map(itemSource).join(',\n          ')},
        ],
      }, h),
    ]),
  };
}`,
  })
}

const metadataListExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  metadataListFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const metadataListExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, metadataListExamplesFor(renderer))
