import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
import type { TreeListVariant } from '@/lib/tree-list'

/** Renderer-neutral fixture item: icon/badge slots are decorated per renderer
    (startIcon/endIcon -> Icon.icon, endBadge -> Badge.badge). `onSelect`
    mirrors astryx's `onClick: noop` — activation reports the item id. */
export type TreeListFixtureItem = Readonly<{
  id: string
  label: string
  description?: string
  startIcon?: string
  endIcon?: string
  endBadge?: string
  href?: string
  onSelect?: boolean
  isSelected?: boolean
  isDisabled?: boolean
  isExpanded?: boolean
  children?: ReadonlyArray<TreeListFixtureItem>
}>

export type TreeListFixtureTree = Readonly<{
  variant: TreeListVariant
  caption?: string
}>

export type TreeListFixture = Readonly<{
  title: string
  description?: string
  trees: ReadonlyArray<TreeListFixtureTree>
  items: ReadonlyArray<TreeListFixtureItem>
}>

const showcaseItems: ReadonlyArray<TreeListFixtureItem> = [
  {
    id: 'src',
    label: 'src',
    isExpanded: true,
    children: [
      {
        id: 'components',
        label: 'components',
        children: [
          { id: 'button', label: 'Button.ts', onSelect: true },
          { id: 'card', label: 'Card.ts', onSelect: true },
          { id: 'list', label: 'List.ts', onSelect: true },
        ],
      },
      { id: 'app', label: 'App.ts', onSelect: true },
      { id: 'index', label: 'index.ts', onSelect: true },
    ],
  },
  {
    id: 'public',
    label: 'public',
    children: [
      { id: 'favicon', label: 'favicon.ico', onSelect: true },
      { id: 'index-html', label: 'index.html', onSelect: true },
    ],
  },
  { id: 'pkg', label: 'package.json', onSelect: true },
  { id: 'readme', label: 'README.md', onSelect: true },
]

export const treeListFixtures: Readonly<
  [TreeListFixture, ...Array<TreeListFixture>]
> = [
  {
    title: 'Tree List',
    trees: [{ variant: 'lineGuides' }],
    items: showcaseItems,
  },
  {
    title: 'TreeList — File Tree With Icons',
    description:
      'File browser tree with folder and document icons distinguishing directories from files.',
    trees: [{ variant: 'lineGuides' }],
    items: [
      {
        id: 'src',
        label: 'src',
        isExpanded: true,
        startIcon: 'folder',
        children: [
          {
            id: 'app',
            label: 'App.ts',
            onSelect: true,
            startIcon: 'file',
          },
          {
            id: 'index',
            label: 'index.ts',
            onSelect: true,
            startIcon: 'file',
          },
        ],
      },
      {
        id: 'pkg',
        label: 'package.json',
        onSelect: true,
        startIcon: 'file',
      },
    ],
  },
  {
    title: 'TreeList — Interactive Settings',
    description: 'Settings tree with clickable items and a documentation link.',
    trees: [{ variant: 'lineGuides' }],
    items: [
      {
        id: 'settings',
        label: 'Settings',
        isExpanded: true,
        startIcon: 'settings',
        children: [
          { id: 'general', label: 'General', onSelect: true },
          { id: 'advanced', label: 'Advanced', onSelect: true },
        ],
      },
      {
        id: 'docs',
        label: 'Documentation',
        href: '#',
        endIcon: 'chevron-right',
      },
    ],
  },
  {
    title: 'TreeList — Mailbox Tree',
    description: 'Email folder tree with unread badge counts.',
    trees: [{ variant: 'lineGuides' }],
    items: [
      {
        id: 'inbox',
        label: 'Inbox',
        isExpanded: true,
        endBadge: '3',
        children: [
          {
            id: 'unread',
            label: 'Unread',
            onSelect: true,
            endBadge: '3',
          },
          { id: 'starred', label: 'Starred', onSelect: true },
        ],
      },
      { id: 'sent', label: 'Sent', onSelect: true },
      { id: 'drafts', label: 'Drafts', onSelect: true, endBadge: '1' },
    ],
  },
  {
    title: 'TreeList — Navigation Tree',
    description: 'Navigation tree with a selected item for the current page.',
    trees: [{ variant: 'lineGuides' }],
    items: [
      {
        id: 'nav',
        label: 'Navigation',
        isExpanded: true,
        children: [
          { id: 'home', label: 'Home', onSelect: true },
          { id: 'about', label: 'About', onSelect: true, isSelected: true },
          { id: 'contact', label: 'Contact', onSelect: true },
        ],
      },
    ],
  },
  {
    title: 'Tree List — Variants',
    description:
      'The `variant` prop controls whether hierarchy guide lines are shown: `lineGuides` (default) draws connector lines between parent and child rows, while `noGuides` relies on indentation alone. It is orthogonal to `density`, which controls spacing.',
    trees: [
      { variant: 'lineGuides', caption: 'lineGuides (default)' },
      { variant: 'noGuides', caption: 'noGuides' },
    ],
    items: [
      {
        id: 'src',
        label: 'src',
        isExpanded: true,
        children: [
          {
            id: 'components',
            label: 'components',
            isExpanded: true,
            children: [
              { id: 'button', label: 'Button.ts', onSelect: true },
              { id: 'card', label: 'Card.ts', onSelect: true },
            ],
          },
          { id: 'app', label: 'App.ts', onSelect: true },
        ],
      },
      { id: 'readme', label: 'README.md', onSelect: true },
    ],
  },
]

const usesIcons = (items: ReadonlyArray<TreeListFixtureItem>): boolean =>
  items.some(
    item =>
      item.startIcon !== undefined ||
      item.endIcon !== undefined ||
      usesIcons(item.children ?? []),
  )

const usesBadge = (items: ReadonlyArray<TreeListFixtureItem>): boolean =>
  items.some(
    item => item.endBadge !== undefined || usesBadge(item.children ?? []),
  )

// ---------------------------------------------------------------------------
// Generated example source
// ---------------------------------------------------------------------------

const iconCall = (
  name: string,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  renderer !== 'tailwind'
    ? `Icon.icon('${name}', { class: stylex.props(styles.itemIcon).className ?? '' }, h)`
    : `Icon.icon('${name}', { class: 'size-4' }, h)`

const itemSource = (
  item: TreeListFixtureItem,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fields: Array<string> = [`id: '${item.id}'`, `label: '${item.label}'`]
  if (item.isExpanded === true) {
    fields.push('isExpanded: true')
  }
  if (item.isSelected === true) {
    fields.push('isSelected: true')
  }
  if (item.isDisabled === true) {
    fields.push('isDisabled: true')
  }
  if (item.href !== undefined) {
    fields.push(`href: '${item.href}'`)
  }
  if (item.onSelect === true) {
    fields.push('onSelect: true')
  }
  if (item.startIcon !== undefined) {
    fields.push(`startContent: ${iconCall(item.startIcon, renderer)}`)
  }
  if (item.endIcon !== undefined) {
    fields.push(`endContent: ${iconCall(item.endIcon, renderer)}`)
  }
  if (item.endBadge !== undefined) {
    fields.push(
      `endContent: Badge.badge({ children: ['${item.endBadge}'] }, h)`,
    )
  }
  if (item.children !== undefined) {
    fields.push(
      `children: [${item.children
        .map(child => itemSource(child, renderer))
        .join(', ')}]`,
    )
  }
  return `{ ${fields.join(', ')} }`
}

const submodelSource = (
  modelField: string,
  messageTag: string,
  tree: TreeListFixtureTree,
): string => `h.submodel({
        slotId: '${modelField}',
        model: model.${modelField},
        view: TreeList.view,
        viewInputs: { items: items(h), variant: '${tree.variant}' },
        toParentMessage: message => Message['${messageTag}']({ message }),
      })`

const applySource = (
  modelField: string,
  messageTag: string,
): string => `const apply${modelField[0]!.toUpperCase()}${modelField.slice(1)} = (model: Model, result: ReturnType<typeof TreeList.update>): Update.Return<Model, Message> => {
  const commands = Command.mapMessages(result.commands ?? [], message => Message['${messageTag}']({ message }));
  const maybeSelectedId = result.outMessage?._tag === 'SelectedTreeListItem'
    ? Option.some(result.outMessage.id)
    : model.maybeSelectedId;
  return { model: { ...model, ${modelField}: result.model, maybeSelectedId }, commands };
};`

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = treeListFixtures[index] ?? treeListFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  const ui = isStyleX ? 'stylex' : 'ui'
  const multi = fixture.trees.length > 1
  const fields = multi ? ['treeLineGuides', 'treeNoGuides'] : ['tree']
  const tags = multi
    ? ['GotTreeListLineGuidesMessage', 'GotTreeListNoGuidesMessage']
    : ['GotTreeListMessage']
  const needsIcon = usesIcons(fixture.items)
  const needsBadge = usesBadge(fixture.items)

  const modelFields = fields.map(field => `${field}: TreeList.Model`).join(', ')
  const initFields = fixture.trees
    .map(
      (_tree, i) =>
        `${fields[i]!}: TreeList.init({ id: 'docs-tree-list-${String(i)}' })`,
    )
    .join(', ')

  const itemsCode = `const items = (h: HtmlBuilder<Message>): ReadonlyArray<TreeList.TreeListItemData> => [
    ${fixture.items.map(item => itemSource(item, renderer)).join(',\n    ')},
  ];`

  const treesSource = fixture.trees
    .map((tree, i) => {
      const treeCode = submodelSource(fields[i]!, tags[i]!, tree)
      return tree.caption === undefined
        ? treeCode
        : `h.div([h.Class(${isStyleX ? "stylex.props(styles.column).className ?? ''" : "'flex flex-col gap-2'"})], [
        h.div([h.Class(${isStyleX ? "stylex.props(styles.caption).className ?? ''" : "'text-xs font-semibold text-muted-foreground'"})], ['${tree.caption}']),
        ${treeCode},
      ])`
    })
    .join(',\n    ')

  const stylexStyles = isStyleX
    ? `import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({${needsIcon ? `\n  itemIcon: { height: '1rem', width: '1rem' },` : ''}${
        multi
          ? `\n  wrap: { display: 'flex', alignItems: 'flex-start', gap: '1.5rem' },
  column: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  caption: { color: 'var(--muted-foreground)', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 600 },`
          : ''
      }
})`
    : ''

  return foldkitApplication({
    title: `TreeList — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
${stylexStyles === '' ? '' : `${stylexStyles}\n`}
import * as TreeList from '@/${ui}/tree-list'${needsIcon ? `\nimport * as Icon from '@/lib/icon'` : ''}${needsBadge ? `\nimport * as Badge from '@/${ui}/badge'` : ''}`,
    model: `export const Model = S.Struct({ ${modelFields}, maybeSelectedId: S.Option(S.String) })
export type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
${tags.map(tag => `  ${tag}: { message: TreeList.Message },`).join('\n')}
});
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: { ${initFields}, maybeSelectedId: Option.none() } })`,
    update: `${fields
      .map((field, i) => applySource(field, tags[i]!))
      .join('\n\n')}

export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
${tags
  .map(
    (tag, i) =>
      `    case '${tag}': return apply${fields[i]![0]!.toUpperCase()}${fields[i]!.slice(1)}(model, TreeList.update(model.${fields[i]!}, message.message))`,
  )
  .join('\n')}
  }
}`,
    view: `${itemsCode}

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'TreeList — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'mx-auto flex min-h-screen w-full max-w-xl p-8'"})], [
    ${
      multi
        ? `h.div([h.Class(${isStyleX ? "stylex.props(styles.wrap).className ?? ''" : "'flex items-start gap-6'"})], [
      ${treesSource},
    ])`
        : treesSource
    },
  ]),
})`,
  })
}

const treeListExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  treeListFixtures.map((fixture, index) => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    code: source(index, renderer),
  }))

export const treeListExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, treeListExamplesFor(renderer))
