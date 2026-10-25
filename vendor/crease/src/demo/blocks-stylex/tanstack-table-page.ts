import { reset } from '@/stylex/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { Effect, Schema as S, Stream } from 'effect'
import type { Update } from 'foldkit'
import { Command, Subscription } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import * as State from '@/lib/tanstack-table-state'
import * as VirtualDataTable from '@/stylex/virtual/data-table'
import { badge } from '@/stylex/badge'
import { button, buttonLink } from '@/stylex/button'
import { box, grid, inline, stack, text } from '@/stylex/composition'
import { className } from '@/stylex/style'
import {
  createTanStackTable,
  tanStackDataTable,
  type TanStackDataTableColumn,
  type TanStackDataTableProps,
} from '@/stylex/tanstack/data-table'
import { styles } from './tanstack-table-page.stylex'

const TableExample = S.Literals(['features', 'filters', 'details'])
type TableExample = typeof TableExample.Type
const FEATURE_STORAGE_KEY = 'playground-features'
export const Model = S.Struct({
  tanstack: State.Model,
  filters: State.Model,
  details: State.Model,
  virtual: VirtualDataTable.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotPlaygroundTanStackMessage: { table: TableExample, message: State.Message },
  GotPlaygroundVirtualTableMessage: { message: VirtualDataTable.Message },
  RestoredPlaygroundTableLayout: {
    columnOrder: S.Array(S.String),
    hiddenColumnIds: S.Array(S.String),
    pinnedColumnIds: S.Array(S.String),
    columnWidths: S.Array(State.ColumnWidth),
    layoutVersion: S.Number,
  },
  CompletedPersistPlaygroundTableLayout: {},
})
export type Message = typeof Message.Type
export const init = (): Model => ({
  tanstack: State.init({
    pinnedColumnIds: ['select', 'title'],
    layoutVersion: 2,
  }),
  filters: State.init({
    pageSize: 6,
    sorting: [],
    pinnedColumnIds: [],
    layoutVersion: 1,
  }),
  details: State.init({
    pageSize: 5,
    sorting: [],
    pinnedColumnIds: ['select'],
    layoutVersion: 1,
  }),
  virtual: VirtualDataTable.init('task-table-virtual-list'),
})
const PersistFeatureLayout = Command.define('PersistPlaygroundTableLayout', {
  args: { value: S.String },
  messages: [Message['CompletedPersistPlaygroundTableLayout']],
  execute: ({ value }) =>
    Effect.sync(() => {
      localStorage.setItem(FEATURE_STORAGE_KEY, value)
      return Message['CompletedPersistPlaygroundTableLayout']()
    }),
})
export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotPlaygroundTanStackMessage': {
      const key = message.table === 'features' ? 'tanstack' : message.table
      const next = State.update(model[key], message.message)
      const persistsLayout = [
        'EndedTanStackColumnResize',
        'ResizedTanStackColumn',
        'ResetTanStackColumnWidths',
        'ResetTanStackTableLayout',
        'ResetTanStackTableView',
        'ResetTanStackTable',
        'ToggledTanStackColumn',
        'MovedTanStackColumn',
        'ToggledTanStackColumnPin',
      ].includes(message.message._tag)
      return {
        model: { ...model, [key]: next },
        ...(message.table === 'features' && persistsLayout
          ? {
              commands: [
                PersistFeatureLayout({
                  value: JSON.stringify(State.layoutSnapshot(next)),
                }),
              ],
            }
          : {}),
      }
    }
    case 'GotPlaygroundVirtualTableMessage': {
      const { model: virtual, commands: virtualCommands__ } =
        VirtualDataTable.update(model.virtual, message.message)
      const commands = virtualCommands__ ?? []
      return {
        model: { ...model, virtual },
        commands: Command.mapMessages(commands, next =>
          Message['GotPlaygroundVirtualTableMessage']({ message: next }),
        ),
      }
    }
    case 'RestoredPlaygroundTableLayout':
      return {
        model: {
          ...model,
          tanstack: State.update(
            model.tanstack,
            State.Message.RestoredTanStackTableLayout({
              columnOrder: message.columnOrder,
              hiddenColumnIds: message.hiddenColumnIds,
              pinnedColumnIds: message.pinnedColumnIds,
              columnWidths: message.columnWidths,
              layoutVersion: message.layoutVersion,
            }),
          ),
        },
      }
    case 'CompletedPersistPlaygroundTableLayout':
      return { model: model }
  }
}
export const subscriptions = Subscription.lift(VirtualDataTable.subscriptions)<
  Model,
  Message
>({
  toChildModel: model => model.virtual,
  toParentMessage: message =>
    Message['GotPlaygroundVirtualTableMessage']({ message }),
})

type Status = 'Backlog' | 'In progress' | 'Done'
type Priority = 'Low' | 'Medium' | 'High'
type Task = Readonly<{
  id: string
  title: string
  status: Status
  team: 'Core' | 'Growth' | 'Platform'
  priority: Priority
  points: number
  assignee: string
  due: string
}>

const TITLES = [
  'Refine audit log filters',
  'Ship keyboard shortcuts',
  'Reduce dashboard latency',
  'Document access policies',
  'Rebuild invoice export',
  'Add workspace templates',
  'Improve command palette',
  'Review token rotation',
  'Add usage anomaly alerts',
  'Tune search ranking',
  'Migrate webhook signing',
  'Polish empty states',
  'Fix timezone boundaries',
  'Add bulk editing',
  'Prototype saved views',
  'Improve CSV imports',
  'Add role presets',
  'Measure onboarding funnel',
  'Cache activity summaries',
  'Review mobile navigation',
  'Unify billing events',
  'Add incident timeline',
  'Improve focus management',
  'Audit localization gaps',
  'Add retention cohorts',
  'Rework retry policy',
  'Expose API rate limits',
  'Improve table density',
  'Add custom fields',
  'Validate data residency',
  'Build release checklist',
  'Stream export progress',
] as const
const STATUSES: ReadonlyArray<Status> = ['Backlog', 'In progress', 'Done']
const TEAMS: ReadonlyArray<Task['team']> = ['Core', 'Growth', 'Platform']
const PRIORITIES: ReadonlyArray<Priority> = ['Low', 'Medium', 'High']
const ASSIGNEES = [
  'Maya Chen',
  'Noah Williams',
  'Ava Patel',
  'Leo Martin',
  'Sofia Rossi',
  'Unassigned',
] as const

const TASKS: ReadonlyArray<Task> = Array.from(
  { length: 2_000 },
  (_, index) => ({
    id: `TSK-${String(index + 101).padStart(4, '0')}`,
    title: TITLES[index % TITLES.length] ?? 'Untitled task',
    status: STATUSES[index % STATUSES.length] ?? 'Backlog',
    team: TEAMS[(index * 2) % TEAMS.length] ?? 'Core',
    priority:
      PRIORITIES[(index + Math.floor(index / 4)) % PRIORITIES.length] ?? 'Low',
    points: [1, 2, 3, 5, 8][index % 5] ?? 1,
    assignee: ASSIGNEES[(index * 5) % ASSIGNEES.length] ?? 'Unassigned',
    due: `2026-${String(9 + (Math.floor(index / 14) % 4)).padStart(2, '0')}-${String(2 + ((index * 3) % 25)).padStart(2, '0')}`,
  }),
)

const statusBadge = (status: Status, h: HtmlBuilder<Message>): Html =>
  h.span(
    [
      h.Class(
        className(
          status === 'Done'
            ? styles.badgeDone
            : status === 'In progress'
              ? styles.badgeProgress
              : styles.badgeTodo,
        ),
      ),
    ],
    [status],
  )

const COLUMNS: ReadonlyArray<TanStackDataTableColumn<Task, Message>> = [
  {
    id: 'title',
    header: 'Task',
    headerTooltip: 'A concise description of the work item.',
    value: row => row.title,
    cell: (row, h) =>
      h.div(
        [h.Title(row.title), h.Class(className(styles.titleCell))],
        [row.title],
      ),
    canGroup: false,
    minSize: 200,
    defaultSize: 280,
    sticky: true,
    filter: { type: 'text' },
  },
  {
    id: 'status',
    header: 'Status',
    value: row => row.status,
    cell: (row, h) => statusBadge(row.status, h),
    filter: {
      type: 'enum',
      options: STATUSES.map(status => ({
        value: status,
        label: status,
        count: TASKS.slice(0, 32).filter(row => row.status === status).length,
      })),
    },
  },
  {
    id: 'team',
    header: 'Team',
    value: row => row.team,
    filter: {
      type: 'enum',
      options: TEAMS.map(team => ({ value: team, label: team })),
    },
  },
  {
    id: 'priority',
    header: 'Priority',
    value: row => row.priority,
    cell: (row, h) =>
      h.span(
        [h.Class(className(row.priority === 'High' && styles.priorityHigh))],
        [row.priority],
      ),
    filter: {
      type: 'enum',
      options: PRIORITIES.map(priority => ({
        value: priority,
        label: priority,
      })),
    },
  },
  {
    id: 'points',
    header: 'Points',
    headerTooltip: 'Estimated delivery effort.',
    value: row => row.points,
    cell: row => `${row.points} pts`,
    aggregate: value => `${String(value)} pts`,
    filter: { type: 'number', unit: 'pts', step: 1 },
  },
  {
    id: 'assignee',
    header: 'Assignee',
    value: row => row.assignee,
    canGroup: false,
    filter: { type: 'text' },
  },
  {
    id: 'due',
    header: 'Due',
    value: row => row.due,
    cell: row =>
      new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
        new Date(`${row.due}T00:00:00`),
      ),
    canGroup: false,
    filter: { type: 'datetime' },
  },
]

const VIRTUAL_COLUMNS: ReadonlyArray<
  VirtualDataTable.VirtualDataTableColumn<Task, Message>
> = [
  {
    id: 'title',
    header: 'Task',
    value: row => row.title,
    cell: (row, h) =>
      h.div(
        [h.Title(row.title), h.Class(className(styles.titleCell))],
        [row.title],
      ),
  },
  {
    id: 'status',
    header: 'Status',
    value: row => row.status,
    cell: (row, h) => statusBadge(row.status, h),
  },
  { id: 'team', header: 'Team', value: row => row.team },
  {
    id: 'priority',
    header: 'Priority',
    value: row => row.priority,
    cell: (row, h) =>
      h.span(
        [h.Class(className(row.priority === 'High' && styles.priorityHigh))],
        [row.priority],
      ),
  },
  {
    id: 'points',
    header: 'Points',
    value: row => row.points,
    cell: row => `${row.points} pts`,
    numeric: true,
  },
  { id: 'assignee', header: 'Assignee', value: row => row.assignee },
  {
    id: 'due',
    header: 'Due',
    value: row => row.due,
    cell: row =>
      new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
        new Date(`${row.due}T00:00:00`),
      ),
  },
]

const tableProps = (
  model: State.Model,
  table: TableExample = 'features',
): TanStackDataTableProps<Task, Message> => ({
  ariaLabel: 'TanStack task feature showcase',
  columns: COLUMNS,
  enableColumnOrder: true,
  enableColumnVisibility: true,
  enableDensity: true,
  enableRowPinning: true,
  enableRowSelection: true,
  facet: { columnId: 'status', label: 'Status facet', options: STATUSES },
  filterPlaceholder: 'Search tasks, teams, people…',
  grouping: { columnId: 'team', label: 'teams' },
  model,
  pageSizeOptions: [5, 8, 12, 20],
  pagination: { totalCount: 32 },
  pinnedColumn: { columnId: 'title', label: 'task' },
  rowKey: row => row.id,
  rows: TASKS.slice(0, 32),
  sizing: {
    columnId: 'title',
    label: 'Task column',
    min: 200,
    max: 440,
    step: 20,
  },
  allSelectableRowIds: TASKS.slice(0, 32).map(row => row.id),
  stretchColumns: true,
  storageKey: `playground-${table}`,
  toParentMessage: message =>
    Message['GotPlaygroundTanStackMessage']({ table, message }),
})

const featureCard = (
  title: string,
  description: string,
  features: ReadonlyArray<string>,
  h: HtmlBuilder<Message>,
): Html =>
  box(
    {
      surface: 'card',
      radius: 'lg',
      padding: 'md',
      children: [
        stack(
          {
            gap: 'sm',
            children: [
              text({ as: 'h2', children: [title], variant: 'headingSm' }, h),
              text(
                {
                  as: 'p',
                  children: [description],
                  tone: 'secondary',
                  variant: 'caption',
                },
                h,
              ),
              inline(
                {
                  gap: 'sm',
                  wrap: true,
                  children: features.map(feature =>
                    badge({ children: [feature], variant: 'outline' }, h),
                  ),
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const props = tableProps(model.tanstack)
  const {
    grouping: _filterGrouping,
    pinnedColumn: _filterPinnedColumn,
    sizing: _filterSizing,
    ...filterBase
  } = tableProps(model.filters, 'filters')
  const filterProps: TanStackDataTableProps<Task, Message> = {
    ...filterBase,
    ariaLabel: 'Column filter examples',
    enableDensity: false,
    enableRowPinning: false,
  }
  const {
    facet: _detailFacet,
    grouping: _detailGrouping,
    pinnedColumn: _detailPinnedColumn,
    sizing: _detailSizing,
    ...detailBase
  } = tableProps(model.details, 'details')
  const detailProps: TanStackDataTableProps<Task, Message> = {
    ...detailBase,
    ariaLabel: 'Expandable task rows',
    enableColumnOrder: false,
    enableColumnVisibility: false,
    enableDensity: false,
    enableExpandableRows: true,
    enableRowPinning: false,
    expandedContent: (row, builder) =>
      grid(
        {
          columns: 'two',
          gap: 'md',
          children: [
            stack(
              {
                gap: 'sm',
                children: [
                  text(
                    { as: 'h3', children: [row.title], variant: 'headingSm' },
                    builder,
                  ),
                  text(
                    {
                      as: 'p',
                      children: [`${row.team} team · ${row.assignee}`],
                      tone: 'secondary',
                      variant: 'body',
                    },
                    builder,
                  ),
                ],
              },
              builder,
            ),
            stack(
              {
                gap: 'sm',
                children: [
                  text({ children: ['Delivery'], variant: 'label' }, builder),
                  text(
                    {
                      children: [`${row.points} points · due ${row.due}`],
                      tone: 'secondary',
                      variant: 'body',
                    },
                    builder,
                  ),
                ],
              },
              builder,
            ),
          ],
        },
        builder,
      ),
  }
  const table = createTanStackTable(props)
  const stateSnapshot = {
    foldkitModel: model,
    tanstackDerived: {
      coreRows: table.getCoreRowModel().rows.length,
      filteredRows: table.getFilteredRowModel().rows.length,
      groupedRows: table.getGroupedRowModel().rows.length,
      pageRows: table.getRowModel().rows.length,
      pageCount: table.getPageCount(),
    },
  }
  return box(
    {
      as: 'main',
      surface: 'page',
      minHeight: 'createPage',
      padding: 'xl',
      children: [
        h.div(
          [
            h.Class(className(styles.persistenceMount)),
            h.OnMount({
              name: 'table-playground-layout',
              f: () => {
                try {
                  const raw =
                    localStorage.getItem(FEATURE_STORAGE_KEY) ??
                    localStorage.getItem('crease-table-playground-layout')
                  if (raw === null) return Stream.empty
                  const parsed = JSON.parse(raw) as ReturnType<
                    typeof State.layoutSnapshot
                  >
                  return Stream.succeed(
                    Message['RestoredPlaygroundTableLayout'](parsed),
                  )
                } catch {
                  return Stream.empty
                }
              },
            }),
          ],
          [],
        ),
        stack(
          {
            gap: 'xl',
            width: 'full',
            children: [
              stack(
                {
                  gap: 'md',
                  children: [
                    inline(
                      {
                        align: 'center',
                        justify: 'between',
                        gap: 'md',
                        wrap: true,
                        children: [
                          buttonLink(
                            {
                              href: '/blocks-stylex',
                              children: ['← Featured blocks'],
                              variant: 'outline',
                            },
                            h,
                          ),
                          badge(
                            {
                              children: [
                                'Table playground · 2 implementations',
                              ],
                              variant: 'secondary',
                            },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                    text(
                      {
                        as: 'h1',
                        children: ['Data tables × Foldkit'],
                        variant: 'display',
                      },
                      h,
                    ),
                    text(
                      {
                        as: 'p',
                        children: [
                          'Compare the full TanStack row-model pipeline with a lightweight custom grid powered by Foldkit VirtualList. Both keep their interaction state in the Foldkit model.',
                        ],
                        tone: 'secondary',
                        variant: 'body',
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
              h.div(
                [h.Class(className(styles.featureGrid))],
                [
                  featureCard(
                    'Table behavior',
                    'The complete interaction set is available directly in the grid.',
                    ['Sort', 'Filter', 'Select', 'Expand', 'Paginate'],
                    h,
                  ),
                  featureCard(
                    'Column settings',
                    'Layouts can be resized, reordered, hidden, pinned, reset, and restored.',
                    ['Visibility', 'Order', 'Pinning', 'Sizing', 'Persistence'],
                    h,
                  ),
                  featureCard(
                    'Foldkit integration',
                    'Every interaction returns a typed message and the rendered output is styled with StyleX.',
                    ['Serializable model', 'Pure reducer', 'StyleX output'],
                    h,
                  ),
                ],
              ),
              stack(
                {
                  gap: 'md',
                  children: [
                    text(
                      {
                        as: 'h2',
                        children: ['Complete data table'],
                        variant: 'headingMd',
                      },
                      h,
                    ),
                    text(
                      {
                        as: 'p',
                        children: [
                          'Sorting, selection, sticky columns, direct resizing, persisted column settings, and pagination across 32 rows.',
                        ],
                        tone: 'secondary',
                        variant: 'body',
                      },
                      h,
                    ),
                    box(
                      {
                        surface: 'card',
                        radius: 'lg',
                        padding: 'md',
                        children: [tanStackDataTable(props, h)],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
              stack(
                {
                  gap: 'md',
                  children: [
                    text(
                      {
                        as: 'h2',
                        children: ['Column filter types'],
                        variant: 'headingMd',
                      },
                      h,
                    ),
                    text(
                      {
                        as: 'p',
                        children: [
                          'Each header exposes its matching control: free text, multi-select enums, numeric operators, and preset or custom date ranges. Active filters remain available from the table-side filter menu.',
                        ],
                        tone: 'secondary',
                        variant: 'body',
                      },
                      h,
                    ),
                    box(
                      {
                        surface: 'card',
                        radius: 'lg',
                        padding: 'md',
                        children: [tanStackDataTable(filterProps, h)],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
              stack(
                {
                  gap: 'md',
                  children: [
                    text(
                      {
                        as: 'h2',
                        children: ['Expandable rows'],
                        variant: 'headingMd',
                      },
                      h,
                    ),
                    text(
                      {
                        as: 'p',
                        children: [
                          'Click a row to reveal a full-width detail panel while selection and pagination stay controlled independently.',
                        ],
                        tone: 'secondary',
                        variant: 'body',
                      },
                      h,
                    ),
                    box(
                      {
                        surface: 'card',
                        radius: 'lg',
                        padding: 'md',
                        children: [tanStackDataTable(detailProps, h)],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
              stack(
                {
                  gap: 'md',
                  children: [
                    text(
                      {
                        as: 'h2',
                        children: ['Loading and empty states'],
                        variant: 'headingMd',
                      },
                      h,
                    ),
                    grid(
                      {
                        columns: 'two',
                        gap: 'md',
                        children: [
                          box(
                            {
                              surface: 'card',
                              radius: 'lg',
                              padding: 'md',
                              children: [
                                tanStackDataTable(
                                  {
                                    ...detailProps,
                                    ariaLabel: 'Loading task table',
                                    isLoading: true,
                                    loadingText: 'Loading task data…',
                                  },
                                  h,
                                ),
                              ],
                            },
                            h,
                          ),
                          box(
                            {
                              surface: 'card',
                              radius: 'lg',
                              padding: 'md',
                              children: [
                                tanStackDataTable(
                                  {
                                    ...detailProps,
                                    ariaLabel: 'Empty task table',
                                    pagination: { totalCount: 0 },
                                    rows: [],
                                    emptyText: 'No tasks match this view.',
                                  },
                                  h,
                                ),
                              ],
                            },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
              stack(
                {
                  gap: 'md',
                  children: [
                    inline(
                      {
                        align: 'center',
                        justify: 'between',
                        gap: 'md',
                        wrap: true,
                        children: [
                          stack(
                            {
                              gap: 'sm',
                              children: [
                                text(
                                  {
                                    as: 'h2',
                                    children: ['VirtualList table'],
                                    variant: 'headingMd',
                                  },
                                  h,
                                ),
                                text(
                                  {
                                    as: 'p',
                                    children: [
                                      'A custom CSS-grid table for 2,000 rows. Only the visible window and a small overscan buffer are mounted.',
                                    ],
                                    tone: 'secondary',
                                    variant: 'body',
                                  },
                                  h,
                                ),
                              ],
                            },
                            h,
                          ),
                          badge(
                            {
                              children: ['@foldkit/ui VirtualList'],
                              variant: 'outline',
                            },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                    box(
                      {
                        surface: 'card',
                        radius: 'lg',
                        padding: 'md',
                        children: [
                          VirtualDataTable.virtualDataTable(
                            {
                              ariaLabel: 'Virtualized task table',
                              columns: VIRTUAL_COLUMNS,
                              filterPlaceholder: 'Search 2,000 tasks…',
                              filterText: row =>
                                `${row.id} ${row.title} ${row.status} ${row.team} ${row.priority} ${row.assignee}`,
                              gridTemplateColumns:
                                '3rem minmax(16rem,2fr) repeat(3,minmax(7rem,0.8fr)) minmax(6rem,0.6fr) minmax(10rem,1fr) minmax(7rem,0.7fr)',
                              model: model.virtual,
                              rowKey: row => row.id,
                              rows: TASKS,
                              toParentMessage: message =>
                                Message['GotPlaygroundVirtualTableMessage']({
                                  message,
                                }),
                            },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
              grid(
                {
                  columns: 'two',
                  gap: 'md',
                  children: [
                    box(
                      {
                        surface: 'card',
                        radius: 'lg',
                        padding: 'md',
                        children: [
                          stack(
                            {
                              gap: 'md',
                              children: [
                                text(
                                  {
                                    as: 'h2',
                                    children: ['Controlled state'],
                                    variant: 'headingSm',
                                  },
                                  h,
                                ),
                                text(
                                  {
                                    as: 'p',
                                    children: [
                                      'This is the serializable Foldkit model plus counts produced by TanStack’s row-model pipeline.',
                                    ],
                                    tone: 'secondary',
                                    variant: 'caption',
                                  },
                                  h,
                                ),
                                h.pre(
                                  [h.Class(className(reset.text, styles.code))],
                                  [JSON.stringify(stateSnapshot, null, 2)],
                                ),
                              ],
                            },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                    box(
                      {
                        surface: 'card',
                        radius: 'lg',
                        padding: 'md',
                        children: [
                          stack(
                            {
                              gap: 'md',
                              children: [
                                text(
                                  {
                                    as: 'h2',
                                    children: ['Feature controls'],
                                    variant: 'headingSm',
                                  },
                                  h,
                                ),
                                text(
                                  {
                                    as: 'p',
                                    children: [
                                      'Reset returns the TanStack baseline. The virtual table keeps a deliberately smaller API focused on fast filtering, sorting, and selection.',
                                    ],
                                    tone: 'secondary',
                                    variant: 'body',
                                  },
                                  h,
                                ),
                                button(
                                  {
                                    children: ['Reset TanStack table state'],
                                    variant: 'outline',
                                    onClick: Message[
                                      'GotPlaygroundTanStackMessage'
                                    ]({
                                      table: 'features',
                                      message:
                                        State.Message.ResetTanStackTable(),
                                    }),
                                  },
                                  h,
                                ),
                              ],
                            },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}
