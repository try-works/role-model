import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type ToolbarFixtureKind =
  | 'threeSlot'
  | 'cardHeader'
  | 'sizes'
  | 'tabs'
  | 'bulk'
  | 'filter'

export type ToolbarFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  kind: ToolbarFixtureKind
  width: number
}>

export const toolbarFixtures: Readonly<
  [ToolbarFixture, ...Array<ToolbarFixture>]
> = [
  {
    title: 'Toolbar — Three Slot',
    heroOnly: true,
    kind: 'threeSlot',
    width: 600,
  },
  {
    title: 'Toolbar — Card Header',
    description:
      'A toolbar as a card header with a left-aligned title and icon actions on the right. Use Toolbar instead of a bare header when your card header has interactive actions; Toolbar adds start/end slot layout and keyboard navigation.',
    kind: 'cardHeader',
    width: 500,
  },
  {
    title: 'Toolbar — Sizes',
    description:
      'Small, medium, and large CreaseUI toolbars side by side. Set the size on the toolbar once and size child controls to match.',
    kind: 'sizes',
    width: 500,
  },
  {
    title: 'Toolbar — Tab Navigation',
    description:
      'A toolbar with tabs in the start slot and an action button at the end. Use as a card or section header when content is split into tabs with a primary action alongside.',
    kind: 'tabs',
    width: 600,
  },
  {
    title: 'Toolbar — Bulk Actions',
    description:
      'A compact toolbar with the muted variant for showing bulk selection actions. Use when the user selects multiple items in a list or table and needs quick access to batch operations.',
    kind: 'bulk',
    width: 640,
  },
  {
    title: 'Toolbar — Table Filter',
    description:
      'A CreaseUI filter bar above a table: a search box leads the row, inline fields define filter clauses, and a live result count and clear-all action follow.',
    kind: 'filter',
    width: 760,
  },
]

export type FilterField = 'status' | 'priority' | 'customer'

export const FILTER_FIELDS: ReadonlyArray<
  Readonly<{
    key: FilterField
    label: string
    options: ReadonlyArray<string>
  }>
> = [
  {
    key: 'status',
    label: 'Status',
    options: ['Scheduled', 'In progress', 'On hold', 'Overdue', 'Completed'],
  },
  { key: 'priority', label: 'Priority', options: ['High', 'Normal', 'Low'] },
  {
    key: 'customer',
    label: 'Customer',
    options: [
      'Northgate Dental',
      'Riverside Club',
      'Summit Medical',
      'Harborview Hotel',
    ],
  },
]

export type Job = Readonly<{
  id: string
  job: string
  customer: string
  status: string
  priority: string
}>

export const JOBS: ReadonlyArray<Job> = [
  {
    id: 'SJ-2136',
    job: 'VAV zones not cooling',
    customer: 'Northgate Dental',
    status: 'In progress',
    priority: 'High',
  },
  {
    id: 'SJ-2135',
    job: 'Exhaust fan noise',
    customer: 'Riverside Club',
    status: 'On hold',
    priority: 'Normal',
  },
  {
    id: 'SJ-2134',
    job: 'Humidifier board fault',
    customer: 'Summit Medical',
    status: 'Overdue',
    priority: 'High',
  },
  {
    id: 'SJ-2133',
    job: 'Economizer stuck shut',
    customer: 'Northgate Dental',
    status: 'Scheduled',
    priority: 'Normal',
  },
  {
    id: 'SJ-2132',
    job: 'Contactor replacement',
    customer: 'Harborview Hotel',
    status: 'Completed',
    priority: 'Low',
  },
]

const SIMPLE_BODY: Readonly<
  Record<'threeSlot' | 'cardHeader' | 'sizes' | 'tabs' | 'bulk', string>
> = {
  threeSlot: `Toolbar.toolbar({
      label: 'Document toolbar',
      dividers: ['bottom'],
      toParentMessage: m => GotToolbarMessage({ message: m }),
      startContent: [
        Button.button({
          variant: 'ghost',
          size: 'icon-sm',
          ariaLabel: 'Back',
          leadingIcon: Icon.icon('arrow-left', {}, h),
          children: [],
        }, h),
      ],
      centerContent: h.h4([h.Class('text-base font-medium')], ['Title']),
      endContent: [
        Button.button({ variant: 'secondary', children: ['Discard'] }, h),
        Button.button({ variant: 'default', children: ['Save'] }, h),
      ],
    }, h)`,
  cardHeader: `Toolbar.toolbar({
      label: 'User list actions',
      size: 'sm',
      dividers: ['bottom'],
      toParentMessage: m => GotToolbarMessage({ message: m }),
      startContent: [h.h4([h.Class('text-base font-medium')], ['Card title'])],
      endContent: [
        Button.button({
          variant: 'ghost',
          size: 'icon-sm',
          ariaLabel: 'Filter',
          leadingIcon: Icon.icon('funnel', {}, h),
          children: [],
        }, h),
        Button.button({
          variant: 'default',
          size: 'icon-sm',
          ariaLabel: 'Add user',
          leadingIcon: Icon.icon('plus', {}, h),
          children: [],
        }, h),
      ],
    }, h)`,
  sizes: `...(['sm', 'md', 'lg'] as const).map(size =>
      h.div([h.Class('rounded-xl border')], [
        Toolbar.toolbar({
          label: \`\${size} toolbar\`,
          size,
          toParentMessage: m => GotToolbarMessage({ message: m }),
          startContent: [h.h4([h.Class('text-base font-medium')], [size])],
          endContent: [
            Button.button({
              variant: 'ghost',
              size: 'icon-sm',
              ariaLabel: 'Filter',
              leadingIcon: Icon.icon('funnel', {}, h),
              children: [],
            }, h),
            Button.button({
              variant: 'default',
              size: 'sm',
              leadingIcon: Icon.icon('plus', {}, h),
              children: ['Add'],
            }, h),
          ],
        }, h),
      ]))`,
  tabs: `Toolbar.toolbar({
      label: 'Section navigation',
      dividers: ['bottom'],
      toParentMessage: m => GotToolbarMessage({ message: m }),
      startContent: [
        Tabs.tabs({
          model: model.tabs,
          selectedValue: model.selectedTab,
          toParentMessage: m => GotTabsMessage({ message: m }),
          tabs: [
            { value: 'overview', label: 'Overview', content: '' },
            { value: 'analytics', label: 'Analytics', content: '' },
            { value: 'settings', label: 'Settings', content: '' },
          ],
        }, h),
      ],
      endContent: [
        Button.button({
          variant: 'default',
          size: 'icon-sm',
          ariaLabel: 'New item',
          leadingIcon: Icon.icon('plus', {}, h),
          children: [],
        }, h),
      ],
    }, h)`,
  bulk: `Toolbar.toolbar({
      label: 'Bulk actions',
      size: 'sm',
      variant: 'muted',
      dividers: ['bottom'],
      toParentMessage: m => GotToolbarMessage({ message: m }),
      startContent: [
        Badge.badge({ variant: 'secondary', children: [\`\${model.selectedRows.length} selected\`] }, h),
        Button.button({ variant: 'ghost', size: 'icon-sm', ariaLabel: 'Delete', leadingIcon: Icon.icon('trash-2', {}, h), children: [] }, h),
        Button.button({ variant: 'ghost', size: 'icon-sm', ariaLabel: 'Archive', leadingIcon: Icon.icon('archive', {}, h), children: [] }, h),
      ],
      endContent: [
        Button.button({ variant: 'ghost', size: 'sm', onClick: ClickedDeselectAll(), children: ['Deselect all'] }, h),
      ],
    }, h)`,
}

const filterBody = (isStyleX: boolean): string => `Toolbar.toolbar({
      label: 'Job filters',
      size: 'sm',
      dividers: ['bottom'],
      toParentMessage: m => GotToolbarMessage({ message: m }),
      startContent: [
        h.div([${isStyleX ? 'h.Class(className(styles.filterRow))' : "h.Class('flex w-full min-w-0 flex-wrap items-center gap-2')"}], [
          Input.input({ id: 'filter-search', ariaLabel: 'Search jobs', placeholder: 'Search', value: model.search, onInput: v => ChangedSearch({ value: v }),${isStyleX ? ' layoutStyle: layoutStyle({ width: "9rem" }),' : ` class: 'w-36',`} }, h),
          ...FILTER_FIELDS.map(field => FilterSelect.select({
            model: model.filterSelects[field.key],
            maybeSelectedValue: model[field.key] === '' ? Option.none() : Option.some(model[field.key]),
            ariaLabel: field.label,
            placeholder: field.label,
            size: 'sm',
            ${isStyleX ? 'triggerLayoutStyle: FILTER_LAYOUT[field.key]' : 'triggerClass: FILTER_WIDTH[field.key]'},
            items: ['', ...field.options],
            itemToValue: value => value,
            itemToLabel: value => value === '' ? field.label : value,
            toParentMessage: message => GotFilterSelectMessage({ field: field.key, message }),
          }, h)),
          h.div([${isStyleX ? 'h.Class(className(styles.filterActions))' : "h.Class('ms-auto flex shrink-0 items-center gap-2')"}], [
            h.span([${isStyleX ? 'h.Class(className(styles.readout))' : "h.Class('text-muted-foreground text-xs tabular-nums whitespace-nowrap')"}], [\`\${resultsFor(model).length} of \${JOBS.length}\`]),
            ...(model.search !== '' || FILTER_FIELDS.some(field => model[field.key] !== '')
              ? [Button.button({ variant: 'link', size: 'sm', onClick: ClickedClearFilters(), children: ['Clear all'] }, h)]
              : []),
            Button.button({ variant: 'ghost', size: 'icon-sm', ariaLabel: 'View options', leadingIcon: Icon.icon('columns-3-cog', {}, h), children: [] }, h),
          ]),
        ]),
      ],
    }, h)`

const emitSource = (fixture: ToolbarFixture, isStyleX: boolean): string => {
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const lib = isStyleX ? 'stylex' : 'ui'
  const hasTabs = fixture.kind === 'tabs'
  const hasBulk = fixture.kind === 'bulk'
  const hasFilter = fixture.kind === 'filter'
  const hasState = hasTabs || hasBulk || hasFilter

  const filterDecls = hasFilter
    ? `type Job = Readonly<{ id: string; job: string; customer: string; status: string; priority: string }>
type FilterField = 'status' | 'priority' | 'customer'

const JOBS: ReadonlyArray<Job> = ${JSON.stringify(JOBS, null, 2)}

const FILTER_FIELDS: ReadonlyArray<Readonly<{ key: FilterField; label: string; options: ReadonlyArray<string> }>> = ${JSON.stringify(FILTER_FIELDS, null, 2)}
const FilterSelect = Select.create<string>()
${isStyleX ? "const FILTER_LAYOUT = { status: layoutStyle({ width: '8rem' }), priority: layoutStyle({ width: '6rem' }), customer: layoutStyle({ width: '10rem' }) } as const\n" : "const FILTER_WIDTH = { status: 'w-32', priority: 'w-24', customer: 'w-40' } as const\n"}

`
    : ''

  const modelDecl = hasState
    ? `${filterDecls}export const Model = S.Struct({${
        hasTabs
          ? `
  tabs: Tabs.Model,
  selectedTab: S.String,`
          : ''
      }${
        hasBulk
          ? `
  selectedRows: S.Array(S.String),`
          : ''
      }${
        hasFilter
          ? `
  search: S.String,
  status: S.String,
  priority: S.String,
  customer: S.String,
  filterSelects: S.Struct({ status: Select.Model, priority: Select.Model, customer: Select.Model }),`
          : ''
      }
})
export type Model = typeof Model.Type`
    : `export const Model = S.Struct({})
export type Model = typeof Model.Type`

  const messageDecls = [
    `export const GotToolbarMessage = taggedStruct('GotToolbarMessage${tag}', {
  message: Toolbar.Message,
})`,
    ...(hasTabs
      ? [
          `export const GotTabsMessage = taggedStruct('GotTabsMessage${tag}', {
  message: Tabs.Message,
})`,
        ]
      : []),
    ...(hasBulk
      ? [
          `export const ClickedDeselectAll = taggedStruct('ClickedDeselectAll${tag}', {})`,
        ]
      : []),
    ...(hasFilter
      ? [
          `export const ChangedSearch = taggedStruct('ChangedSearch${tag}', { value: S.String })
export const GotFilterSelectMessage = taggedStruct('GotFilterSelectMessage${tag}', { field: S.Literals(['status', 'priority', 'customer']), message: Select.Message })
export const ClickedClearFilters = taggedStruct('ClickedClearFilters${tag}', {})`,
        ]
      : []),
  ]
  const unionVariants = [
    'GotToolbarMessage',
    ...(hasTabs ? ['GotTabsMessage'] : []),
    ...(hasBulk ? ['ClickedDeselectAll'] : []),
    ...(hasFilter
      ? ['ChangedSearch', 'GotFilterSelectMessage', 'ClickedClearFilters']
      : []),
  ]

  const initDecl = `export const init = (): Update.Return<Model, Message> => ({
  model: {${
    hasTabs
      ? `
    tabs: Tabs.init({ id: 'docs-toolbar-tabs' }),
    selectedTab: 'overview',`
      : ''
  }${
    hasBulk
      ? `
    selectedRows: ['1', '3', '5'],`
      : ''
  }${
    hasFilter
      ? `
    search: '',
    status: '',
    priority: '',
    customer: '',
    filterSelects: {
      status: Select.init({ id: 'toolbar-filter-status', isAnimated: true }),
      priority: Select.init({ id: 'toolbar-filter-priority', isAnimated: true }),
      customer: Select.init({ id: 'toolbar-filter-customer', isAnimated: true }),
    },`
      : ''
  }
  },
})`

  const updateCases = [
    `    case 'GotToolbarMessage${tag}':
      return { model }`,
    ...(hasTabs
      ? [
          `    case 'GotTabsMessage${tag}': {
      const next = Tabs.update(model.tabs, message.message)
      const selection = next.outMessage?._tag === 'Selected' ? next.outMessage.value : undefined
      return {
        model: {
          ...model,
          tabs: next.model,
          ...(selection === undefined ? {} : { selectedTab: selection }),
        },
        commands: Command.mapMessages(next.commands ?? [], m => GotTabsMessage({ message: m })),
      }
    }`,
        ]
      : []),
    ...(hasBulk
      ? [
          `    case 'ClickedDeselectAll${tag}':
      return { model: { ...model, selectedRows: [] } }`,
        ]
      : []),
    ...(hasFilter
      ? [
          `    case 'ChangedSearch${tag}':
      return { model: { ...model, search: message.value } }
    case 'GotFilterSelectMessage${tag}': {
      const next = Select.update(model.filterSelects[message.field], message.message)
      return {
        model: {
          ...model,
          filterSelects: { ...model.filterSelects, [message.field]: next.model },
          ...(next.outMessage?._tag === 'Selected' ? { [message.field]: next.outMessage.value } : {}),
        },
        commands: Command.mapMessages(next.commands ?? [], nextMessage => GotFilterSelectMessage({ field: message.field, message: nextMessage })),
      }
    }
    case 'ClickedClearFilters${tag}':
      return { model: { ...model, search: '', status: '', priority: '', customer: '' } }`,
        ]
      : []),
  ]

  const toolbarBody =
    fixture.kind === 'filter' ? filterBody(isStyleX) : SIMPLE_BODY[fixture.kind]

  const toolbarCalls: string = hasFilter
    ? `h.div([${isStyleX ? 'h.Class(className(styles.filterWidth))' : "h.Class('w-full max-w-190')"}], [\n${toolbarBody}\n    ])`
    : fixture.kind === 'sizes'
      ? `h.div([h.Class('flex w-[500px] flex-col gap-4')], [\n${SIMPLE_BODY.sizes}\n    ])`
      : `${fixture.kind === 'threeSlot' || fixture.kind === 'cardHeader' || fixture.kind === 'tabs' ? `h.div([h.Class('w-[${fixture.width}px]')], [\n` : ''}${toolbarBody}${fixture.kind === 'threeSlot' || fixture.kind === 'cardHeader' || fixture.kind === 'tabs' ? '\n    ])' : ''}`

  return foldkitApplication({
    title: fixture.title,
    imports: `import { ${hasFilter ? 'Option, ' : ''}Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
import * as Icon from '@/lib/icon'
import * as Toolbar from '@/${lib}/toolbar'
import * as Button from '@/${lib}/button'
${
  hasTabs
    ? `import * as Tabs from '@/${lib}/tabs'
`
    : ''
}${
      hasBulk
        ? `import * as Badge from '@/${lib}/badge'
`
        : ''
    }${
      hasFilter
        ? `import * as Input from '@/${lib}/input'
import * as Select from '@/${lib}/select'
`
        : ''
    }${
      hasFilter && isStyleX
        ? `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'
import { tokens } from '@/stylex/tokens.stylex'
const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  filterWidth: { maxWidth: '47.5rem', minWidth: 0, width: '100%' },
  searchInput: { width: '9rem' },
  filterRow: { display: 'flex', width: '100%', minWidth: 0, flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' },
  filterActions: { display: 'flex', flexShrink: 0, alignItems: 'center', gap: '0.5rem', marginInlineStart: 'auto' },
  readout: { color: tokens.mutedForeground, fontSize: '0.75rem', lineHeight: '1rem', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
})
`
        : ''
    }`,
    model: modelDecl,
    messages: `${messageDecls.join('\n')}
export const Message = S.Union([${unionVariants.join(', ')}])
export type Message = typeof Message.Type`,
    init: initDecl,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
${updateCases.join('\n')}
  }
}`,
    view: `${
      hasFilter
        ? `const resultsFor = (model: Model): ReadonlyArray<Job> =>
  JOBS.filter(
    job =>
      (model.search === '' ||
        \`\${job.job} \${job.customer} \${job.id}\`
          .toLowerCase()
          .includes(model.search.toLowerCase())) &&
      (model.status === '' || job.status === model.status) &&
      (model.priority === '' || job.priority === model.priority) &&
      (model.customer === '' || job.customer === model.customer),
  )

`
        : ''
    }export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: '${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    ${toolbarCalls},
  ]),
})`,
  })
}

const toolbarExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  toolbarFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitSource(fixture, renderer !== 'tailwind'),
  }))

export const toolbarExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, toolbarExamplesFor(renderer))
