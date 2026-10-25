import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type MultiSelectorFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  kind:
    | 'showcase'
    | 'searchable'
    | 'sectioned'
    | 'columns'
    | 'form'
    | 'ghostToolbar'
    | 'bottomSheet'
  /** Astrryx block id, kept for tracing against the source templates. */
  example: string
}>

export const multiSelectorFixtures: ReadonlyArray<MultiSelectorFixture> = [
  {
    title: 'Multi Selector',
    heroOnly: true,
    kind: 'showcase',
    example: 'MultiSelectorShowcase',
    description:
      'A bordered multi-select field with checkbox options in an anchored popover.',
  },
  {
    title: 'Searchable',
    kind: 'searchable',
    example: 'MultiSelectorSearchableMultiSelector',
    description: 'Multi-select with search filtering and select-all.',
  },
  {
    title: 'Sectioned',
    kind: 'sectioned',
    example: 'MultiSelectorSectionedMultiSelector',
    description: 'Multi-select with options grouped into labeled sections.',
  },
  {
    title: 'Column Visibility',
    kind: 'columns',
    example: 'MultiSelectorColumnVisibilitySelector',
    description:
      'Column visibility toggle with hidden label, search, select-all, and selection count.',
  },
  {
    title: 'Form Composition',
    kind: 'form',
    example: 'MultiSelectorForm',
    description: 'Two multi-selectors in a form with required/optional states.',
  },
  {
    title: 'Ghost Toolbar',
    kind: 'ghostToolbar',
    example: 'MultiSelectorGhostToolbar',
    description:
      'Borderless MultiSelector variant composed with ghost buttons in a toolbar.',
  },
  {
    title: 'Bottom Sheet',
    kind: 'bottomSheet',
    example: 'MultiSelectorBottomSheet',
    description:
      'Keeps a multi-selection list open in a bottom sheet while choices are toggled.',
  },
]

export const COLUMNS = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'role', label: 'Role' },
  { value: 'status', label: 'Status' },
  { value: 'created', label: 'Created' },
] as const

export const COUNTRIES = [
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
  { value: 'au', label: 'Australia' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'jp', label: 'Japan' },
  { value: 'br', label: 'Brazil' },
  { value: 'in', label: 'India' },
  { value: 'mx', label: 'Mexico' },
] as const

export const ALL_COLUMNS = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'role', label: 'Role' },
  { value: 'status', label: 'Status' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'actions', label: 'Actions' },
] as const

export const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'archived', label: 'Archived' },
] as const

export const PERMISSIONS = [
  {
    title: 'Read',
    options: [
      { value: 'read_posts', label: 'Read posts' },
      { value: 'read_comments', label: 'Read comments' },
      { value: 'read_users', label: 'Read users' },
    ],
  },
  {
    title: 'Write',
    options: [
      { value: 'write_posts', label: 'Write posts' },
      { value: 'write_comments', label: 'Write comments' },
    ],
  },
] as const

export const TEAMS = [
  { value: 'design', label: 'Design' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
] as const

const imports = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
  extra: string,
): string =>
  `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as MultiSelector from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/multi-selector'${extra}`

const stylexPreamble = `
import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'
import * as Button from '@/stylex/button'

const styles = stylex.create({
  shell: { alignItems: 'flex-start', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  stack: {
    display: 'grid',
    gap: '1rem',
    maxWidth: '18.75rem',
    minWidth: '15rem',
    width: '100%',
  },
  supporting: { color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: '1.25rem' },
  toolbar: { alignItems: 'center', display: 'flex', gap: '0.5rem' },
})`

const stackClass = (isStyleX: boolean): string =>
  isStyleX
    ? `h.Class(className(styles.stack))`
    : `h.Class('grid w-full max-w-[300px] min-w-[240px] gap-4')`

const toolbarClass = (isStyleX: boolean): string =>
  isStyleX
    ? `h.Class(className(styles.toolbar))`
    : `h.Class('flex items-center gap-2')`

const buttonClass = (isStyleX: boolean): string =>
  isStyleX
    ? `h.Class(className(...Button.buttonVisualStyles({ variant: 'ghost', size: 'sm' })))`
    : `h.Class('rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent')`

const messages = `import { taggedStruct } from 'foldkit/schema'
export const GotMultiSelectorMessage = taggedStruct('GotMultiSelectorMessage', { slot: S.Number, message: MultiSelector.Message });
export const Message = S.Union([GotMultiSelectorMessage])
export type Message = typeof Message.Type`

const update = `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotMultiSelectorMessage': {
      const target = model.selectors[message.slot]
      if (target === undefined) return { model }
      const next = MultiSelector.update(target, message.message)
      const selectors = model.selectors.map((entry, i) =>
        i === message.slot ? next.model : entry,
      )
      return {
        model: { ...model, selectors },
        commands: Command.mapMessages(next.commands ?? [], m => GotMultiSelectorMessage({ slot: message.slot, message: m })),
      }
    }
  }
}`

const DATA_SNIPPET = `const COLUMNS = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'role', label: 'Role' },
  { value: 'status', label: 'Status' },
  { value: 'created', label: 'Created' },
] as const

const COUNTRIES = [
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
  { value: 'au', label: 'Australia' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'jp', label: 'Japan' },
  { value: 'br', label: 'Brazil' },
  { value: 'in', label: 'India' },
  { value: 'mx', label: 'Mexico' },
] as const

const ALL_COLUMNS = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'role', label: 'Role' },
  { value: 'status', label: 'Status' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'actions', label: 'Actions' },
] as const

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'archived', label: 'Archived' },
] as const

const PERMISSIONS = [
  {
    title: 'Read',
    options: [
      { value: 'read_posts', label: 'Read posts' },
      { value: 'read_comments', label: 'Read comments' },
      { value: 'read_users', label: 'Read users' },
    ],
  },
  {
    title: 'Write',
    options: [
      { value: 'write_posts', label: 'Write posts' },
      { value: 'write_comments', label: 'Write comments' },
    ],
  },
] as const

const TEAMS = [
  { value: 'design', label: 'Design' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
] as const`

const modelDecl = `export const Model = S.Struct({
  selectors: S.Array(MultiSelector.Model),
})
export type Model = typeof Model.Type

${DATA_SNIPPET}`

const callFor = (fixture: MultiSelectorFixture, isStyleX: boolean): string => {
  const base = (slot: number) =>
    `model: model.selectors[${String(slot)}]!,
          toParentMessage: message => GotMultiSelectorMessage({ slot: ${String(slot)}, message }),`
  switch (fixture.kind) {
    case 'showcase':
      return `MultiSelector.multiSelector({
          ${base(0)}
          label: 'Columns',
          options: [...COLUMNS],
          placeholder: 'Select columns...',
        }, h)`
    case 'searchable':
      return `MultiSelector.multiSelector({
          ${base(0)}
          label: 'Countries',
          options: [...COUNTRIES],
          hasSearch: true,
          hasSelectAll: true,
          placeholder: 'Select countries...',
        }, h)`
    case 'sectioned':
      return `MultiSelector.multiSelector({
          ${base(0)}
          label: 'Permissions',
          options: [...PERMISSIONS],
          placeholder: 'Select permissions...',
        }, h)`
    case 'columns':
      return `MultiSelector.multiSelector({
          ${base(0)}
          label: 'Columns',
          isLabelHidden: true,
          options: [...ALL_COLUMNS],
          hasSelectAll: true,
          hasSearch: true,
          triggerDisplay: 'count',
          placeholder: 'Columns',
        }, h)`
    case 'bottomSheet':
      return `MultiSelector.multiSelector({
          ${base(0)}
          label: 'Teams',
          options: [...TEAMS],
          hasSelectAll: true,
          presentation: 'bottom-sheet',
          placeholder: 'Choose teams',
        }, h)`
    case 'form':
      return `MultiSelector.multiSelector({
          ${base(0)}
          label: 'Visible columns',
          description: 'Choose which columns to display in the table',
          options: [...ALL_COLUMNS.slice(0, 5)],
          hasSelectAll: true,
          isRequired: true,
          triggerDisplay: 'labels',
        }, h),
        MultiSelector.multiSelector({
          ${base(1)}
          label: 'Status filter',
          description: 'Filter by status',
          options: [...STATUSES],
          isOptional: true,
          triggerDisplay: 'badges',
          placeholder: 'All statuses',
        }, h)`
    case 'ghostToolbar':
      return `h.div([${toolbarClass(isStyleX)}], [
          h.button([${buttonClass(isStyleX)}, h.Type('button')], ['Refresh']),
          MultiSelector.multiSelector({
            model: model.selectors[0]!,
            toParentMessage: message => GotMultiSelectorMessage({ slot: 0, message }),
            label: 'Columns',
            isLabelHidden: true,
            variant: 'ghost',
            options: [...COLUMNS],
            triggerDisplay: 'labels',
            placeholder: 'Columns',
          }, h),
          MultiSelector.multiSelector({
            model: model.selectors[1]!,
            toParentMessage: message => GotMultiSelectorMessage({ slot: 1, message }),
            label: 'Status',
            isLabelHidden: true,
            variant: 'ghost',
            options: [...STATUSES],
            triggerDisplay: 'labels',
            placeholder: 'Status',
            status: { type: 'warning', message: 'Some filters hide archived rows' },
            statusVariant: 'tooltip',
          }, h),
          h.button([${buttonClass(isStyleX)}, h.Type('button')], ['Export']),
        ])`
  }
}

const initFor = (fixture: MultiSelectorFixture): string => {
  const initCall = (id: string, values: string, optionValues: string): string =>
    `MultiSelector.init({ id: '${id}', values: ${values}, optionValues: ${optionValues} })`
  switch (fixture.kind) {
    case 'columns':
      return initCall(
        'docs-multi-selector-0',
        `['name', 'email', 'role', 'status']`,
        `ALL_COLUMNS.map(o => o.value)`,
      )
    case 'form':
      return `${initCall('docs-multi-selector-0', `['name', 'email']`, `ALL_COLUMNS.slice(0, 5).map(o => o.value)`)}, ${initCall('docs-multi-selector-1', `[]`, `STATUSES.map(o => o.value)`)}`
    case 'ghostToolbar':
      return `${initCall('docs-multi-selector-0', `['name', 'email']`, `COLUMNS.map(o => o.value)`)}, ${initCall('docs-multi-selector-1', `['active']`, `STATUSES.map(o => o.value)`)}`
    case 'searchable':
      return initCall(
        'docs-multi-selector-0',
        `[]`,
        `COUNTRIES.map(o => o.value)`,
      )
    case 'sectioned':
      return initCall(
        'docs-multi-selector-0',
        `[]`,
        `PERMISSIONS.flatMap(s => s.options.map(o => o.value))`,
      )
    case 'bottomSheet':
      return initCall('docs-multi-selector-0', `[]`, `TEAMS.map(o => o.value)`)
    default:
      return initCall(
        'docs-multi-selector-0',
        `[]`,
        `COLUMNS.map(o => o.value)`,
      )
  }
}

const multiSelectorSource = (
  fixture: MultiSelectorFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  return foldkitApplication({
    title: `MultiSelector — ${fixture.title}`,
    imports: imports(renderer, isStyleX ? stylexPreamble : ''),
    model: modelDecl,
    messages,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    selectors: [${initFor(fixture)}],
  },
})`,
    update,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'MultiSelector — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-start justify-center p-8'"})], [
    h.div([${stackClass(isStyleX)}], [
      ${callFor(fixture, isStyleX)},
    ]),
  ]),
})`,
  })
}

const multiSelectorExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  multiSelectorFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: multiSelectorSource(fixture, renderer),
  }))

export const multiSelectorExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, multiSelectorExamplesFor(renderer))
