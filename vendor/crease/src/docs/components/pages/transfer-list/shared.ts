import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
import type { TransferListOption } from '@/ui/transfer-list'
const emitShellStyles =
  "import * as stylex from '@stylexjs/stylex'\nimport { className } from '@/stylex/style'\n\nconst shellStyles = stylex.create({\n  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },\n})"

export type TransferListFixture = Readonly<{
  title: string
  description: string
  /** The TransferList label prop (accessible group name). */
  label: string
  listDescription: string
  selectedLabel: string
  availableLabel: string
  initialValue: ReadonlyArray<string>
  options: 'basic' | 'locked' | 'large'
  hasSearch?: boolean
  searchLabel?: string
  searchPlaceholder?: string
  isReorderable?: boolean
  hasSelectAll?: boolean
  hasClear?: boolean
  selectedEmptyText?: string
  availableEmptyText?: string
  noResultsText?: string
  /** 'empty-pair' renders Empty + NoResults like the astryx Empty story. */
  layout: 'single' | 'empty-pair'
}>

/* astryx ships no example blocks for TransferList — these fixtures are
   derived from apps/storybook/stories/TransferList.stories.tsx (Default,
   Locked, Unordered, Searchable, Empty) and keep the stories' option data,
   props, and copy verbatim. */
export const basicOptions: ReadonlyArray<TransferListOption> = [
  {
    value: 'name',
    label: 'Name',
    description: 'Primary display name for the record',
  },
  {
    value: 'owner',
    label: 'Owner',
    description: 'Person responsible for the record',
  },
  { value: 'status', label: 'Status', description: 'Current workflow state' },
  { value: 'priority', label: 'Priority', description: 'Relative urgency' },
  { value: 'team', label: 'Team', description: 'Owning team' },
  {
    value: 'updated',
    label: 'Last updated',
    description: 'Most recent change time',
  },
  { value: 'created', label: 'Created', description: 'Original creation time' },
]

export const lockedOptions: ReadonlyArray<TransferListOption> = [
  {
    value: 'name',
    label: 'Name',
    description: 'Required identity field',
    group: 'Identity',
    isTransferDisabled: true,
    isReorderDisabled: true,
    disabledMessage: 'Name is required and fixed in position.',
  },
  {
    value: 'owner',
    label: 'Owner',
    description: 'Person responsible for the work',
    group: 'Identity',
    isTransferDisabled: true,
    disabledMessage: 'Owner must remain visible but can be reordered.',
  },
  {
    value: 'team',
    label: 'Team',
    description: 'Owning team',
    group: 'Identity',
  },
  {
    value: 'status',
    label: 'Status',
    description: 'Current workflow state',
    group: 'Planning',
    isReorderDisabled: true,
    disabledMessage:
      'Status can be hidden but its current position is fixed while selected.',
  },
  {
    value: 'priority',
    label: 'Priority',
    description: 'Relative urgency',
    group: 'Planning',
  },
  {
    value: 'updated',
    label: 'Last updated',
    description: 'Most recent change time',
    group: 'Activity',
  },
]

/** 200 generated fields in five groups, matching the Searchable story. */
export const largePoolOptions: ReadonlyArray<TransferListOption> = Array.from(
  { length: 200 },
  (_, index) => {
    const number = index + 1
    return {
      value: `field-${String(number)}`,
      label: `Field ${String(number).padStart(3, '0')}`,
      description: `Configurable field ${String(number)}`,
      group: `Group ${String(Math.floor(index / 40) + 1)}`,
    }
  },
)

export const optionsFor = (
  key: TransferListFixture['options'],
): ReadonlyArray<TransferListOption> =>
  key === 'locked'
    ? lockedOptions
    : key === 'large'
      ? largePoolOptions
      : basicOptions

export const transferListFixtures: Readonly<
  [TransferListFixture, ...Array<TransferListFixture>]
> = [
  {
    title: 'Visible fields',
    description:
      'The primitive rendered inline: move fields between panels where the selected order is the display order.',
    label: 'Visible fields',
    listDescription:
      'Move fields between the panels. The selected order is the display order.',
    selectedLabel: 'Visible fields',
    availableLabel: 'Available fields',
    initialValue: ['name', 'owner', 'status'],
    options: 'basic',
    hasSelectAll: true,
    hasClear: true,
    layout: 'single',
  },
  {
    title: 'Locked fields',
    description:
      'Transfer and reorder are constrained per option, so a field can be pinned to its panel or to its position.',
    label: 'Record fields',
    listDescription:
      'Transfer and reorder are constrained per option, so a field can be locked in place without being locked in the list.',
    selectedLabel: 'Shown',
    availableLabel: 'Hidden',
    initialValue: ['name', 'owner', 'status', 'updated'],
    options: 'locked',
    hasSelectAll: true,
    hasClear: true,
    layout: 'single',
  },
  {
    title: 'Unordered',
    description:
      'Reordering off removes the drag handles and keyboard reorder for selections where order carries no meaning.',
    label: 'Included filters',
    listDescription:
      'With reordering off the selected panel loses its drag handles and keyboard reorder.',
    selectedLabel: 'Included',
    availableLabel: 'Not included',
    initialValue: ['status', 'priority', 'team'],
    options: 'basic',
    isReorderable: false,
    hasSelectAll: true,
    hasClear: true,
    layout: 'single',
  },
  {
    title: 'Searchable',
    description:
      'One search field filters both panels across a pool of 200 grouped options.',
    label: 'Report fields',
    listDescription:
      'One search field filters both panels across a pool of 200 grouped options.',
    selectedLabel: 'In report',
    availableLabel: 'Available',
    initialValue: Array.from(
      { length: 12 },
      (_, index) => `field-${String(index + 1)}`,
    ),
    options: 'large',
    hasSearch: true,
    searchPlaceholder: 'Search 200 fields',
    hasSelectAll: true,
    hasClear: true,
    layout: 'single',
  },
  {
    title: 'Empty states',
    description:
      'Distinct empty surfaces: an empty selection, an exhausted pool, and a search that matches nothing.',
    label: 'Visible fields',
    listDescription:
      'Nothing is selected yet, so the selected panel carries its own empty copy.',
    selectedLabel: 'Visible fields',
    availableLabel: 'Available fields',
    initialValue: [],
    options: 'basic',
    selectedEmptyText: 'No fields are visible yet. Add one from the right.',
    availableEmptyText: 'Every field is already visible.',
    hasSelectAll: true,
    hasClear: true,
    layout: 'empty-pair',
  },
]

const OPTIONS_LITERALS: Record<TransferListFixture['options'], string> = {
  basic: `const BASIC_OPTIONS: ReadonlyArray<TransferList.TransferListOption> = [
  { value: 'name', label: 'Name', description: 'Primary display name for the record' },
  { value: 'owner', label: 'Owner', description: 'Person responsible for the record' },
  { value: 'status', label: 'Status', description: 'Current workflow state' },
  { value: 'priority', label: 'Priority', description: 'Relative urgency' },
  { value: 'team', label: 'Team', description: 'Owning team' },
  { value: 'updated', label: 'Last updated', description: 'Most recent change time' },
  { value: 'created', label: 'Created', description: 'Original creation time' },
]`,
  locked: `const LOCKED_OPTIONS: ReadonlyArray<TransferList.TransferListOption> = [
  { value: 'name', label: 'Name', description: 'Required identity field', group: 'Identity', isTransferDisabled: true, isReorderDisabled: true, disabledMessage: 'Name is required and fixed in position.' },
  { value: 'owner', label: 'Owner', description: 'Person responsible for the work', group: 'Identity', isTransferDisabled: true, disabledMessage: 'Owner must remain visible but can be reordered.' },
  { value: 'team', label: 'Team', description: 'Owning team', group: 'Identity' },
  { value: 'status', label: 'Status', description: 'Current workflow state', group: 'Planning', isReorderDisabled: true, disabledMessage: 'Status can be hidden but its current position is fixed while selected.' },
  { value: 'priority', label: 'Priority', description: 'Relative urgency', group: 'Planning' },
  { value: 'updated', label: 'Last updated', description: 'Most recent change time', group: 'Activity' },
]`,
  large: `const LARGE_POOL_OPTIONS: ReadonlyArray<TransferList.TransferListOption> =
  Array.from({ length: 200 }, (_, index) => {
    const number = index + 1
    return {
      value: \`field-\${String(number)}\`,
      label: \`Field \${String(number).padStart(3, '0')}\`,
      description: \`Configurable field \${String(number)}\`,
      group: \`Group \${String(Math.floor(index / 40) + 1)}\`,
    }
  })`,
}

const OPTIONS_NAME: Record<TransferListFixture['options'], string> = {
  basic: 'BASIC_OPTIONS',
  locked: 'LOCKED_OPTIONS',
  large: 'LARGE_POOL_OPTIONS',
}

const listCall = (fixture: TransferListFixture, suffix: '' | '2'): string => {
  const props: ReadonlyArray<string> = [
    `model: model.list${suffix},`,
    'toParentMessage: message => GotListMessage({ message }),',
    `label: '${fixture.label}',`,
    `description: '${fixture.listDescription}',`,
    `options: ${OPTIONS_NAME[fixture.options]},`,
    `selectedLabel: '${fixture.selectedLabel}',`,
    `availableLabel: '${fixture.availableLabel}',`,
    ...(fixture.hasSearch === true ? ['hasSearch: true,'] : []),
    ...(fixture.searchLabel === undefined
      ? []
      : [`searchLabel: '${fixture.searchLabel}',`]),
    ...(fixture.searchPlaceholder === undefined
      ? []
      : [`searchPlaceholder: '${fixture.searchPlaceholder}',`]),
    ...(fixture.isReorderable === false ? ['isReorderable: false,'] : []),
    ...(fixture.hasSelectAll === true ? ['hasSelectAll: true,'] : []),
    ...(fixture.hasClear === true ? ['hasClear: true,'] : []),
    ...(fixture.selectedEmptyText === undefined
      ? []
      : [`selectedEmptyText: '${fixture.selectedEmptyText}',`]),
    ...(fixture.availableEmptyText === undefined
      ? []
      : [`availableEmptyText: '${fixture.availableEmptyText}',`]),
    ...(fixture.noResultsText === undefined
      ? []
      : [`noResultsText: '${fixture.noResultsText}',`]),
  ]
  return `TransferList.transferList(
        {
          ${props.join('\n          ')}
        },
        h,
      )`
}

const transferListSource = (
  fixture: TransferListFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const ns = 'TransferList'
  const isPair = fixture.layout === 'empty-pair'
  /* The astryx Empty story pairs an empty-selection list with a search that
     matches nothing — the second list keeps ['name'] selected. */
  const secondProps = isPair
    ? `TransferList.transferList(
          {
            model: model.list2,
            toParentMessage: message => GotList2Message({ message }),
            label: 'Report fields',
            description:
              'A query that matches nothing replaces both panels with the no-results copy.',
            options: ${OPTIONS_NAME[fixture.options]},
            selectedLabel: 'In report',
            availableLabel: 'Available',
            hasSearch: true,
            searchLabel: 'Search report fields',
            searchPlaceholder: 'Try a term that matches nothing',
            noResultsText: 'No field matches that search.',
          },
          h,
        )`
    : ''

  return foldkitApplication({
    title: `Transfer List — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'
import * as ${ns} from '@/${isStyleX ? 'stylex' : 'ui'}/transfer-list'`,
    model: `export const Model = S.Struct({
  list: ${ns}.Model,${
    isPair
      ? `
  list2: ${ns}.Model,`
      : ''
  }
})
export type Model = typeof Model.Type`,
    messages: `export const GotListMessage = taggedStruct('GotListMessage', {
  message: ${ns}.Message,
})${
      isPair
        ? `
export const GotList2Message = taggedStruct('GotList2Message', {
  message: ${ns}.Message,
})`
        : ''
    }
export const Message = S.Union([GotListMessage${isPair ? ', GotList2Message' : ''}])
export type Message = typeof Message.Type`,
    init: `${OPTIONS_LITERALS[fixture.options]}

export const init = (): Update.Return<Model, Message> => ({
  model: {
    list: ${ns}.init({
      id: 'transfer-list',
      value: ${JSON.stringify(fixture.initialValue)},
    }),${
      isPair
        ? `
    list2: ${ns}.init({
      id: 'transfer-list-2',
      value: ['name'],
    }),`
        : ''
    }
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotListMessage': {
      const next = ${ns}.update(
        model.list,
        message.message,
        ${OPTIONS_NAME[fixture.options]},
      )
      return {
        model: { ...model, list: next.model },
        commands: Command.mapMessages(next.commands ?? [], inner =>
          GotListMessage({ message: inner })),
      }
    }${
      isPair
        ? `
    case 'GotList2Message': {
      const next = ${ns}.update(
        model.list2,
        message.message,
        ${OPTIONS_NAME[fixture.options]},
      )
      return {
        model: { ...model, list2: next.model },
        commands: Command.mapMessages(next.commands ?? [], inner =>
          GotList2Message({ message: inner })),
      }
    }`
        : ''
    }
  }
}`,
    subscriptions: `export const subscriptions = Subscription.aggregate<Model, Message>()(
  Subscription.lift({
    pointer: ${ns}.subscriptions.documentPointer,
    escape: ${ns}.subscriptions.documentEscape,
    keyboard: ${ns}.subscriptions.documentKeyboard,
    scroll: ${ns}.subscriptions.autoScroll,
  })<Model, Message>({
    toChildModel: model => model.list.dnd,
    toParentMessage: message =>
      GotListMessage({
        message: ${ns}.Message.GotDndMessage({ message }),
      }),
  }),${
    isPair
      ? `
  Subscription.lift({
    list2Pointer: ${ns}.subscriptions.documentPointer,
    list2Escape: ${ns}.subscriptions.documentEscape,
    list2Keyboard: ${ns}.subscriptions.documentKeyboard,
    list2AutoScroll: ${ns}.subscriptions.autoScroll,
  })<Model, Message>({
    toChildModel: model => model.list2.dnd,
    toParentMessage: message =>
      GotList2Message({
        message: ${ns}.Message.GotDndMessage({ message }),
      }),
  }),`
      : ''
  }
)`,
    view: `${isStyleX ? emitShellStyles + '\n\n' : ''}export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: '${fixture.title}',
  body: h.main(
    [h.Class(${renderer !== 'tailwind' ? 'className(shellStyles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})],
    [
      h.div(
        [h.Class('flex w-full max-w-3xl flex-col gap-6')],
        [
          ${listCall(fixture, '')},${
            isPair
              ? `
          h.hr([h.Class('border-border')]),`
              : ''
          }${
            isPair
              ? `
          ${secondProps},`
              : ''
          }
        ],
      ),
    ],
  ),
})`,
  })
}

const transferListExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  transferListFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    code: transferListSource(fixture, renderer),
    /* The transfer-list root is an @container: inside the centered preview
       it shrink-to-fits to ~one word. Stretch keeps it full width. */
    previewClass: 'justify-stretch',
  }))

export const transferListExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, transferListExamplesFor(renderer))
