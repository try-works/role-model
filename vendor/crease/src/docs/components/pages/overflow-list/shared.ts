import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
const emitShellStyles =
  "import * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\n\nconst shellStyles = stylex.create({\n  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },\n})"

export type OverflowItemSpec =
  | Readonly<{
      kind: 'button'
      label: string
      /** astryx variant="primary" → crease 'default'; otherwise 'secondary'. */
      variant?: 'primary' | 'destructive'
    }>
  | Readonly<{
      kind: 'badge'
      label: string
      /** astryx badge tone — mapped to the nearest crease badge variant. */
      tone: 'info' | 'success' | 'warning' | 'neutral' | 'error'
    }>

export type OverflowContainerSpec =
  | Readonly<{ kind: 'frame'; maxWidth: number; dashed: boolean }>
  | Readonly<{
      kind: 'card'
      width: number
      minWidth?: number
      resizable: boolean
    }>
  | Readonly<{ kind: 'center'; width: number }>

export type OverflowIndicatorKind = 'moreButton' | 'moreMenu' | 'badge'

export type OverflowListFixture = Readonly<{
  title: string
  description: string
  items: ReadonlyArray<OverflowItemSpec>
  gap: 1 | 2
  maxVisibleItems?: number
  maxRows?: number
  collapseFrom?: 'start'
  container: OverflowContainerSpec
  indicator: OverflowIndicatorKind
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/OverflowList/*.tsx +
   *.doc.mjs — same demos, same copy. Resizable Card wrappers map to a div
   with inline resize; astryx badge tones map to crease badge variants
   (info→default, success→secondary, warning→outline, neutral→ghost,
   error→destructive). */
export const overflowListFixtures: Readonly<
  [OverflowListFixture, ...Array<OverflowListFixture>]
> = [
  {
    title: 'OverflowList',
    description:
      'A list of buttons that collapses overflowing items into a +N indicator.',
    gap: 2,
    container: { kind: 'frame', maxWidth: 400, dashed: true },
    indicator: 'moreButton',
    items: [
      { kind: 'button', label: 'Edit' },
      { kind: 'button', label: 'Duplicate' },
      { kind: 'button', label: 'Share' },
      { kind: 'button', label: 'Archive' },
      { kind: 'button', label: 'Delete' },
    ],
  },
  {
    title: 'OverflowList — Capped Toolbar',
    description:
      'maxVisibleItems caps the row at three actions even when more would fit; the rest move to a dropdown',
    gap: 2,
    maxVisibleItems: 3,
    container: { kind: 'center', width: 420 },
    indicator: 'moreMenu',
    items: [
      { kind: 'button', label: 'Save' },
      { kind: 'button', label: 'Edit' },
      { kind: 'button', label: 'Duplicate' },
      { kind: 'button', label: 'Share' },
      { kind: 'button', label: 'Archive' },
      { kind: 'button', label: 'Delete' },
    ],
  },
  {
    title: 'OverflowList — Collapse From Start',
    description:
      'Overflow list that hides items from the start, keeping the latest visible',
    gap: 2,
    collapseFrom: 'start',
    container: { kind: 'center', width: 300 },
    indicator: 'moreButton',
    items: [
      { kind: 'button', label: 'Step 1' },
      { kind: 'button', label: 'Step 2' },
      { kind: 'button', label: 'Step 3' },
      { kind: 'button', label: 'Step 4' },
      { kind: 'button', label: 'Step 5' },
    ],
  },
  {
    title: 'OverflowList — Multi-row Tags',
    description:
      'Tags wrap onto up to two rows with maxRows, then collapse the rest into a count badge',
    gap: 1,
    maxRows: 2,
    container: { kind: 'card', width: 260, minWidth: 120, resizable: true },
    indicator: 'badge',
    items: [
      { kind: 'badge', label: 'Foldkit', tone: 'info' },
      { kind: 'badge', label: 'TypeScript', tone: 'info' },
      { kind: 'badge', label: 'StyleX', tone: 'info' },
      { kind: 'badge', label: 'Storybook', tone: 'info' },
      { kind: 'badge', label: 'Vitest', tone: 'info' },
      { kind: 'badge', label: 'Playwright', tone: 'info' },
      { kind: 'badge', label: 'ESLint', tone: 'info' },
      { kind: 'badge', label: 'Prettier', tone: 'info' },
      { kind: 'badge', label: 'Vite', tone: 'info' },
      { kind: 'badge', label: 'pnpm', tone: 'info' },
    ],
  },
  {
    title: 'OverflowList — Badge Tags',
    description:
      'Resizable row of badges that collapses into a count badge on overflow',
    gap: 1,
    container: { kind: 'card', width: 300, minWidth: 80, resizable: true },
    indicator: 'badge',
    items: [
      { kind: 'badge', label: 'Foldkit', tone: 'info' },
      { kind: 'badge', label: 'TypeScript', tone: 'success' },
      { kind: 'badge', label: 'StyleX', tone: 'warning' },
      { kind: 'badge', label: 'Storybook', tone: 'neutral' },
      { kind: 'badge', label: 'Vitest', tone: 'error' },
    ],
  },
  {
    title: 'OverflowList — Dropdown Actions',
    description:
      'Action toolbar that collapses overflow buttons into a dropdown menu',
    gap: 2,
    container: { kind: 'card', width: 350, minWidth: 100, resizable: true },
    indicator: 'moreMenu',
    items: [
      { kind: 'button', label: 'Save', variant: 'primary' },
      { kind: 'button', label: 'Edit' },
      { kind: 'button', label: 'Duplicate' },
      { kind: 'button', label: 'Share' },
      { kind: 'button', label: 'Archive' },
      { kind: 'button', label: 'Delete', variant: 'destructive' },
    ],
  },
]

export const badgeToneVariant = (
  tone: 'info' | 'success' | 'warning' | 'neutral' | 'error',
): 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' => {
  switch (tone) {
    case 'info':
      return 'default'
    case 'success':
      return 'secondary'
    case 'warning':
      return 'outline'
    case 'neutral':
      return 'ghost'
    case 'error':
      return 'destructive'
  }
}

export const itemLabels = (
  fixture: OverflowListFixture,
): ReadonlyArray<string> => fixture.items.map(item => item.label)

// ---------- generated example source ----------

const itemSource = (item: OverflowItemSpec): string => {
  if (item.kind === 'badge') {
    return `Badge.badge({ variant: '${badgeToneVariant(item.tone)}', children: ['${item.label}'] }, h)`
  }
  const variant =
    item.variant === 'primary'
      ? `'default'`
      : item.variant === 'destructive'
        ? `'destructive'`
        : `'secondary'`
  return `Button.button({ variant: ${variant}, size: 'sm', children: ['${item.label}'] }, h)`
}

const indicatorSource = (fixture: OverflowListFixture): string => {
  switch (fixture.indicator) {
    case 'moreButton':
      return `overflowRenderer: overflowItems => Button.button({ variant: 'ghost', size: 'sm', children: [\`+\${overflowItems.length} more\`] }, h)`
    case 'badge':
      return `overflowRenderer: overflowItems => Badge.badge({ variant: 'ghost', children: [\`+\${overflowItems.length}\`] }, h)`
    case 'moreMenu':
      return `overflowRenderer: overflowItems => MoreMenu.moreMenu({
      model: model.menu,
      toParentMessage: message => GotMenuMessage({ message }),
      icon: h.span([h.Class('text-sm font-medium')], [\`+\${overflowItems.length}\`]),
      items: overflowItems.map(({ index }) => ({ label: items[index] ?? '' })),
    }, h)`
  }
}

const containerSource = (
  fixture: OverflowListFixture,
  inner: string,
): string => {
  switch (fixture.container.kind) {
    case 'frame':
      return `h.div([h.Class('rounded-md border border-dashed border-border p-2'), h.Style({ maxWidth: '${String(fixture.container.maxWidth)}px' })], [
      ${inner},
    ])`
    case 'center':
      return `h.div([h.Class('mx-auto flex justify-center'), h.Style({ width: '${String(fixture.container.width)}px' })], [
      h.div([h.Class('w-full rounded-lg border bg-card p-2')], [
        ${inner},
      ]),
    ])`
    case 'card':
      return `h.div([
      h.Class('rounded-lg border bg-card p-2'),
      h.Style({
        resize: 'horizontal',
        overflow: 'hidden',
        width: '${String(fixture.container.width)}px',
        minWidth: '${String(fixture.container.minWidth ?? 80)}px',
        maxWidth: '100%',
      }),
    ], [
      ${inner},
    ])`
  }
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = overflowListFixtures[index] ?? overflowListFixtures[0]
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const uiDir = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const usesBadge =
    fixture.items.some(item => item.kind === 'badge') ||
    fixture.indicator === 'badge'
  const usesMenu = fixture.indicator === 'moreMenu'
  const listArgs = [
    'model: model.list',
    'toParentMessage: message => GotListMessage({ message })',
    `gap: ${String(fixture.gap)}`,
    ...(fixture.maxVisibleItems === undefined
      ? []
      : [`maxVisibleItems: ${String(fixture.maxVisibleItems)}`]),
    ...(fixture.maxRows === undefined
      ? []
      : [`maxRows: ${String(fixture.maxRows)}`]),
    ...(fixture.collapseFrom === undefined
      ? []
      : [`collapseFrom: '${fixture.collapseFrom}'`]),
    ...(fixture.container.kind === 'card' ? [`behavior: 'observeParent'`] : []),
    indicatorSource(fixture),
    `children: [\n        ${fixture.items.map(itemSource).join(',\n        ')},\n      ]`,
  ].join(',\n      ')
  return foldkitApplication({
    title: `Overflow List — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

${usesBadge ? `import * as Badge from '@/${uiDir}/badge'\n` : ''}import * as Button from '@/${uiDir}/button'${usesMenu ? `\nimport * as MoreMenu from '@/${uiDir}/more-menu'` : ''}
import * as OverflowList from '@/${uiDir}/overflow-list'`,
    model: `export const Model = S.Struct({
  list: OverflowList.Model,${usesMenu ? '\n  menu: MoreMenu.Model,' : ''}
  hiddenCount: S.Number,
})
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotListMessage = taggedStruct('GotOverflowListMessage${tag}', { message: OverflowList.Message });${
      usesMenu
        ? `\nexport const GotMenuMessage = taggedStruct('GotOverflowMenuMessage${tag}', { message: MoreMenu.Message });`
        : ''
    }
export const Message = S.Union([GotListMessage${usesMenu ? ', GotMenuMessage' : ''}])
export type Message = typeof Message.Type`,
    init: `const items = ${JSON.stringify(itemLabels(fixture))} as ReadonlyArray<string>

export const init = (): Update.Return<Model, Message> => ({
  model: {
    list: OverflowList.init({ itemCount: items.length${fixture.collapseFrom === undefined ? '' : `, collapseFrom: '${fixture.collapseFrom}'`} }),${
      usesMenu
        ? `\n    menu: MoreMenu.init({ id: 'overflow-menu-${tag.toLowerCase()}', isAnimated: true }),`
        : ''
    }
    hiddenCount: 0,
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotOverflowListMessage${tag}': {
      const listOp__ = OverflowList.update(model.list, message.message);
      const maybeHidden = Option.fromNullishOr(listOp__.outMessage);
      return {
        model: {
          ...model,
          list: listOp__.model,
          hiddenCount: Option.match(maybeHidden, {
            onNone: () => model.hiddenCount,
            onSome: changed => changed.hiddenIndices.length,
          }),
        },
      };
    }${
      usesMenu
        ? `
    case 'GotOverflowMenuMessage${tag}': {
      const menuOp__ = MoreMenu.update(model.menu, message.message);
      return { model: { ...model, menu: menuOp__.model } };
    }`
        : ''
    }
  }
}`,
    view: `${renderer !== 'tailwind' ? emitShellStyles + '\n\n' : ''}export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Overflow List — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(shellStyles.shell)' : "'flex min-h-screen flex-col items-center justify-center gap-4 p-8'"})], [
    ${containerSource(
      fixture,
      `OverflowList.overflowList({
      ${listArgs},
    }, h)`,
    )},
  ]),
})`,
  })
}

const overflowListExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  overflowListFixtures.map((fixture, index) => ({
    title: fixture.title,
    keepIdsCanonical: index === 0,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const overflowListExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, overflowListExamplesFor(renderer))
