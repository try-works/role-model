/* tablecn "tasks" data-table block — thin consumer of the creaseui data-table
   component (faceted variant). The page owns the task rows, the edit sheet,
   the action bar, and the LTR/RTL toggle; all table chrome (faceted filters,
   sort menu, view panel, header/row menus, pagination, delete dialog) comes
   from dataTable({ variant: 'faceted' }). Tailwind renderer. */

import type { Listbox } from '@foldkit/ui'
import { Listbox as ListboxLib } from '@foldkit/ui'
import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'

import {
  actionBar,
  actionBarClose,
  actionBarGroup,
  actionBarItem,
  actionBarSelection,
  actionBarSeparator,
} from '@/ui/action-bar'
import { button } from '@/ui/button'
import { dataTable, type DataTableColumn } from '@/ui/data-table'
import {
  type Model as TableModel,
  type Message as TableMessage,
  Message as TableMessages,
  init as tableInit,
  update as tableUpdate,
  applyBulkValue,
  applyColumnValue,
  downloadRowsCsv,
  filteredRows,
  pageRows,
  removeRowsByKeys,
} from '@/lib/data-table-state'
import * as Select from '@/ui/select'
import { icon } from '@/lib/icon'
import * as Grid from '@/lib/data-grid'
import type { Task } from '@/lib/tablecn-data'
import {
  generatePeople,
  generateTasks,
  personDataGridConfig,
  taskLabels,
  taskPriorities,
  taskStatuses,
  taskDataTableConfig,
} from '@/lib/tablecn-data'
import { gridView } from '@/demo/blocks/tablecn-grid-view'

export const ActiveView = S.Literals(['data-table', 'data-grid'])
export type ActiveView = typeof ActiveView.Type

export const Model = S.Struct({
  view: ActiveView,
  table: S.Any,
  grid: S.Any,
  tasks: S.Array(S.Any),
  draftTitle: S.String,
  draftLabel: S.String,
  draftStatus: S.String,
  draftPriority: S.String,
  draftHours: S.String,
  draftLabelSelect: S.Any,
  draftStatusSelect: S.Any,
  draftPrioritySelect: S.Any,
})
export interface Model {
  view: ActiveView
  table: TableModel
  grid: Grid.Model
  tasks: ReadonlyArray<Task>
  draftTitle: string
  draftLabel: string
  draftStatus: string
  draftPriority: string
  draftHours: string
  draftLabelSelect: Listbox.Model
  draftStatusSelect: Listbox.Model
  draftPrioritySelect: Listbox.Model
}

export const SwitchView = taggedStruct('TablecnSwitchView', {
  view: ActiveView,
})
export const GotTableMessage = taggedStruct('TablecnGotTableMessage', {
  message: S.Any,
})
export const GotActionBarMount = taggedStruct('TablecnActionBarMount', {
  message: S.Any,
})
export const GotToolbarMount = taggedStruct('TablecnToolbarMount', {
  message: S.Any,
})
export const GotSheetLabelSelect = taggedStruct('TablecnSheetLabelSelect', {
  message: S.Any,
})
export const GotSheetStatusSelect = taggedStruct('TablecnSheetStatusSelect', {
  message: S.Any,
})
export const GotSheetPrioritySelect = taggedStruct(
  'TablecnSheetPrioritySelect',
  { message: S.Any },
)
export const ChangedDraftField = taggedStruct('TablecnChangedDraftField', {
  field: S.String,
  value: S.String,
})
export const SavedTask = taggedStruct('TablecnSavedTask')

export const Message = S.Union([
  SwitchView,
  GotTableMessage,
  GotActionBarMount,
  GotToolbarMount,
  GotSheetLabelSelect,
  GotSheetStatusSelect,
  GotSheetPrioritySelect,
  ChangedDraftField,
  SavedTask,
  TableMessages,
  Grid.Message,
])
export type Message = typeof Message.Type

export const init = (view: ActiveView = 'data-table'): Model => ({
  view,
  table: tableInit(taskDataTableConfig, generateTasks(80)),
  grid: Grid.init(personDataGridConfig, generatePeople(500)),
  tasks: generateTasks(80),
  draftTitle: '',
  draftLabel: 'bug',
  draftStatus: 'todo',
  draftPriority: 'low',
  draftHours: '',
  draftLabelSelect: ListboxLib.init({
    id: 'tablecn-draft-label',
    isAnimated: true,
  }) as Listbox.Model,
  draftStatusSelect: ListboxLib.init({
    id: 'tablecn-draft-status',
    isAnimated: true,
  }) as Listbox.Model,
  draftPrioritySelect: ListboxLib.init({
    id: 'tablecn-draft-priority',
    isAnimated: true,
  }) as Listbox.Model,
})

type UpdateReturn = Update.Return<Model, Message>

const liftTable = (
  model: Model,
  message: TableMessage,
  tasks: ReadonlyArray<Task> = model.tasks,
): UpdateReturn => {
  const next = tableUpdate(model.table, message)
  return {
    model: { ...model, table: next.model, tasks },
    commands: Command.mapMessages(next.commands ?? [], m =>
      GotTableMessage({ message: m as TableMessage }),
    ),
  }
}

const sheetListbox = ListboxLib.create<string, string>()

const sheetField = (
  model: Model,
  field: 'draftLabelSelect' | 'draftStatusSelect' | 'draftPrioritySelect',
  draft: 'draftLabel' | 'draftStatus' | 'draftPriority',
  message: Listbox.Message,
  tag: (message: Listbox.Message) => Message,
): UpdateReturn => {
  const next = sheetListbox.update(model[field], message)
  const selected = Option.match(Option.fromNullishOr(next.outMessage), {
    onNone: () => model[draft],
    onSome: out => (out._tag === 'Selected' ? out.value : model[draft]),
  })
  return {
    model: { ...model, [field]: next.model, [draft]: selected },
    commands: Command.mapMessages(next.commands ?? [], tag),
  }
}

export const update = (model: Model, message: Message): UpdateReturn => {
  if (message._tag === 'TablecnSwitchView')
    return { model: { ...model, view: message.view } }
  if (message._tag === 'TablecnActionBarMount') {
    const inner = message.message as { _tag: string }
    return inner._tag === 'RequestedClose'
      ? liftTable(model, TableMessages.ClosedActionBar({}))
      : { model }
  }
  if (message._tag === 'TablecnToolbarMount') return { model }
  if (message._tag === 'TablecnGotTableMessage')
    return liftTable(model, message.message as TableMessage)
  if (message._tag === 'TablecnSheetLabelSelect')
    return sheetField(
      model,
      'draftLabelSelect',
      'draftLabel',
      message.message as Listbox.Message,
      m => GotSheetLabelSelect({ message: m }),
    )
  if (message._tag === 'TablecnSheetStatusSelect')
    return sheetField(
      model,
      'draftStatusSelect',
      'draftStatus',
      message.message as Listbox.Message,
      m => GotSheetStatusSelect({ message: m }),
    )
  if (message._tag === 'TablecnSheetPrioritySelect')
    return sheetField(
      model,
      'draftPrioritySelect',
      'draftPriority',
      message.message as Listbox.Message,
      m => GotSheetPrioritySelect({ message: m }),
    )
  if (message._tag === 'TablecnChangedDraftField') {
    const field = message.field as
      | 'title'
      | 'label'
      | 'status'
      | 'priority'
      | 'estimatedHours'
    switch (field) {
      case 'title':
        return { model: { ...model, draftTitle: message.value } }
      case 'estimatedHours':
        return { model: { ...model, draftHours: message.value } }
      case 'label':
        return { model: { ...model, draftLabel: message.value } }
      case 'status':
        return { model: { ...model, draftStatus: message.value } }
      default:
        return { model: { ...model, draftPriority: message.value } }
    }
  }
  if (message._tag === 'TablecnSavedTask') {
    const key = model.table.updateSheetKey
    const hours = Number(model.draftHours)
    const tasks =
      key === ''
        ? model.tasks
        : model.tasks.map(task =>
            task.id === key
              ? {
                  ...task,
                  title:
                    model.draftTitle === '' ? task.title : model.draftTitle,
                  label: model.draftLabel as Task['label'],
                  status: model.draftStatus as Task['status'],
                  priority: model.draftPriority as Task['priority'],
                  estimatedHours: Number.isNaN(hours)
                    ? task.estimatedHours
                    : hours,
                }
              : task,
          )
    const next = tableUpdate(model.table, TableMessages.ClosedUpdateSheet({}))
    return {
      model: { ...model, tasks, table: next.model },
      commands: next.commands ?? [],
    }
  }
  // Grid and TableState share message tags; route by active view.
  if (model.view === 'data-grid') {
    if (message._tag in Grid.Message)
      return {
        model: {
          ...model,
          grid: Grid.update(
            model.grid,
            message as Grid.Message,
            personDataGridConfig,
          ),
        },
      }
    return { model }
  }
  if (message._tag in TableMessages) {
    const m = message as TableMessage
    switch (m._tag) {
      case 'AppliedColumnValue':
        return liftTable(
          model,
          m,
          applyColumnValue(
            model.tasks,
            taskDataTableConfig,
            m.rowKey,
            m.columnId,
            m.value,
          ),
        )
      case 'AppliedBulkValue':
        return liftTable(
          model,
          m,
          applyBulkValue(
            model.tasks,
            taskDataTableConfig,
            model.table.selectedRowKeys,
            m.columnId,
            m.value,
          ),
        )
      case 'ConfirmedDelete':
        return liftTable(
          model,
          m,
          removeRowsByKeys(
            model.tasks,
            taskDataTableConfig,
            model.table.deleteDialogKeys,
          ),
        )
      case 'OpenedUpdateSheet': {
        const task = model.tasks.find(t => t.id === m.rowKey)
        if (task === undefined) return liftTable(model, m)
        const next = tableUpdate(model.table, m)
        return {
          model: {
            ...model,
            table: next.model,
            draftTitle: task.title,
            draftLabel: task.label,
            draftStatus: task.status,
            draftPriority: task.priority,
            draftHours: String(task.estimatedHours),
          },
          commands: next.commands ?? [],
        }
      }
      case 'RequestedExport': {
        const next = tableUpdate(model.table, m)
        return {
          model: { ...model, table: next.model },
          commands: [
            downloadRowsCsv(
              filteredRows(model.table, taskDataTableConfig, model.tasks),
              taskDataTableConfig,
              'tasks.csv',
            ),
            ...(next.commands ?? []),
          ],
        }
      }
      default:
        return liftTable(model, m)
    }
  }
  return { model }
}

/* ---------- helpers ---------- */

const capitalize = (s: string): string =>
  s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)

const STATUS_ICONS: Record<string, string> = {
  todo: 'circle',
  'in-progress': 'loader-circle',
  done: 'circle-check',
  canceled: 'circle-x',
}
const PRIORITY_ICONS: Record<string, string> = {
  low: 'arrow-down',
  medium: 'arrow-right',
  high: 'arrow-up',
}
const LABEL_ICONS: Record<string, string> = {
  bug: 'bug',
  feature: 'sparkles',
  enhancement: 'circle-arrow-up',
  documentation: 'book',
}

const statusBadge = (status: string, h: HtmlBuilder<Message>): Html =>
  h.span(
    [
      h.Class(
        'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium transition-all text-foreground py-1 capitalize [&>svg]:size-3.5',
      ),
    ],
    [
      icon(STATUS_ICONS[status] ?? 'circle', {}, h),
      status === 'in-progress' ? 'In-Progress' : status,
    ],
  )

const priorityBadge = (priority: string, h: HtmlBuilder<Message>): Html =>
  h.span(
    [
      h.Class(
        'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium transition-all text-foreground py-1 capitalize [&>svg]:size-3.5',
      ),
    ],
    [icon(PRIORITY_ICONS[priority] ?? 'minus', {}, h), priority],
  )

const formatDate = (date: Date | string): string =>
  (date instanceof Date ? date : new Date(Date.parse(date))).toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  )

/* ---------- columns ---------- */

const COLUMNS = (
  h: HtmlBuilder<Message>,
): ReadonlyArray<DataTableColumn<Task>> => [
  {
    key: 'code',
    header: 'Task',
    sortable: true,
    isHideable: false,
    get: task => task.code,
    cell: task =>
      h.span([h.Class('font-mono text-xs text-muted-foreground')], [task.code]),
  },
  {
    key: 'title',
    header: 'Title',
    sortable: true,
    get: task => task.title,
    cell: task =>
      h.div(
        [h.Class('flex items-center gap-2')],
        [
          h.span(
            [
              h.Class(
                'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium transition-all text-foreground capitalize shrink-0',
              ),
            ],
            [icon(LABEL_ICONS[task.label] ?? 'tag', {}, h), task.label],
          ),
          h.span([h.Class('min-w-0 truncate font-medium')], [task.title]),
        ],
      ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    filterVariant: 'options',
    get: task => task.status,
    options: taskStatuses.map(value => ({
      value,
      label: value === 'in-progress' ? 'In-Progress' : capitalize(value),
      iconName: STATUS_ICONS[value] ?? 'circle',
    })),
    cell: task => statusBadge(task.status, h),
  },
  {
    key: 'priority',
    header: 'Priority',
    sortable: true,
    filterVariant: 'options',
    get: task => task.priority,
    options: taskPriorities.map(value => ({
      value,
      label: capitalize(value),
      iconName: PRIORITY_ICONS[value] ?? 'minus',
    })),
    cell: task => priorityBadge(task.priority, h),
  },
  {
    key: 'estimatedHours',
    header: 'Est. Hours',
    sortable: true,
    filterVariant: 'range',
    get: task => String(task.estimatedHours),
    getNumber: task => task.estimatedHours,
    rangeStep: 1,
    cell: task =>
      h.div(
        [h.Class('w-20 text-right tabular-nums')],
        [String(task.estimatedHours)],
      ),
  },
  {
    key: 'createdAt',
    header: 'Created At',
    sortable: true,
    filterVariant: 'date',
    get: task =>
      task.createdAt instanceof Date
        ? task.createdAt.toISOString().slice(0, 10)
        : String(task.createdAt),
    getDate: task =>
      task.createdAt instanceof Date
        ? task.createdAt.getTime()
        : Date.parse(String(task.createdAt)),
    cell: task =>
      h.span(
        [h.Class('text-muted-foreground text-sm tabular-nums')],
        [formatDate(task.createdAt)],
      ),
  },
]

/* ---------- dir toggle ---------- */

const dirToggle = (model: TableModel, h: HtmlBuilder<Message>): Html =>
  h.button(
    [
      h.Type('button'),
      h.AriaLabel(
        `Switch to ${model.direction === 'ltr' ? 'RTL' : 'LTR'} layout`,
      ),
      h.OnClick(
        TableMessages.SetDirection({
          direction: model.direction === 'ltr' ? 'rtl' : 'ltr',
        }),
      ),
      h.Class(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8',
      ),
    ],
    [icon('languages', { class: 'size-4' }, h)],
  )

/* ---------- update sheet ---------- */

const updateSheet = (model: Model, h: HtmlBuilder<Message>): Html => {
  const table = model.table
  if (table.updateSheetKey === '') return h.empty
  const field = (
    label: string,
    selectModel: Listbox.Model,
    selected: string,
    options: ReadonlyArray<string>,
    toParentMessage: (message: Listbox.Message) => Message,
  ): Html =>
    h.div(
      [h.Class('grid gap-2')],
      [
        h.label([h.Class('text-sm font-medium leading-none')], [label]),
        Select.select(
          {
            model: selectModel,
            maybeSelectedValue: Option.some(selected),
            toParentMessage,
            items: options,
            itemToValue: option => option,
            itemToLabel: option => capitalize(option),
            triggerClass: 'w-full capitalize',
            direction: table.direction,
          },
          h,
        ),
      ],
    )
  return h.div(
    [],
    [
      h.div([
        h.Class('fixed inset-0 z-50 bg-black/50'),
        h.OnClick(
          GotTableMessage({ message: TableMessages.ClosedUpdateSheet({}) }),
        ),
      ]),
      h.div(
        [
          h.Role('dialog'),
          h.AriaModal(true),
          h.DataAttribute('slot', 'sheet-content'),
          h.Class(
            'bg-background fixed inset-y-0 right-0 z-50 flex h-full w-3/4 flex-col gap-4 border-l p-6 shadow-lg sm:max-w-sm',
          ),
        ],
        [
          h.button(
            [
              h.Type('button'),
              h.AriaLabel('Close'),
              h.OnClick(
                GotTableMessage({
                  message: TableMessages.ClosedUpdateSheet({}),
                }),
              ),
              h.Class(
                'ring-offset-background absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:size-4',
              ),
            ],
            [icon('x', {}, h)],
          ),
          h.div(
            [h.Class('flex flex-col gap-1.5')],
            [
              h.h2([h.Class('text-lg font-semibold')], ['Update task']),
              h.p(
                [h.Class('text-muted-foreground text-sm')],
                ['Update the task details and save the changes'],
              ),
            ],
          ),
          h.div(
            [h.Class('grid gap-4 py-4')],
            [
              h.div(
                [h.Class('grid gap-2')],
                [
                  h.label(
                    [h.Class('text-sm font-medium leading-none')],
                    ['Title'],
                  ),
                  h.input([
                    h.Class(
                      'border-input flex h-8 w-full rounded-md border bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    ),
                    h.Value(model.draftTitle),
                    h.OnInput(value =>
                      ChangedDraftField({ field: 'title', value }),
                    ),
                  ]),
                ],
              ),
              field(
                'Label',
                model.draftLabelSelect,
                model.draftLabel,
                taskLabels,
                message => GotSheetLabelSelect({ message }),
              ),
              field(
                'Status',
                model.draftStatusSelect,
                model.draftStatus,
                taskStatuses,
                message => GotSheetStatusSelect({ message }),
              ),
              field(
                'Priority',
                model.draftPrioritySelect,
                model.draftPriority,
                taskPriorities,
                message => GotSheetPrioritySelect({ message }),
              ),
              h.div(
                [h.Class('grid gap-2')],
                [
                  h.label(
                    [h.Class('text-sm font-medium leading-none')],
                    ['Estimated Hours'],
                  ),
                  h.input([
                    h.Type('number'),
                    h.Class(
                      'border-input flex h-8 w-full rounded-md border bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    ),
                    h.Value(model.draftHours),
                    h.OnInput(value =>
                      ChangedDraftField({
                        field: 'estimatedHours',
                        value,
                      }),
                    ),
                  ]),
                ],
              ),
            ],
          ),
          h.div(
            [h.Class('mt-auto flex justify-end gap-2')],
            [
              button(
                {
                  variant: 'outline',
                  size: 'sm',
                  children: ['Cancel'],
                  onClick: GotTableMessage({
                    message: TableMessages.ClosedUpdateSheet({}),
                  }),
                },
                h,
              ),
              button(
                {
                  variant: 'default',
                  size: 'sm',
                  children: ['Save'],
                  onClick: SavedTask({}),
                },
                h,
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

/* ---------- action bar (diceui ActionBar port) ---------- */

const tasksActionBar = (model: Model, h: HtmlBuilder<Message>): Html => {
  const { rows } = pageRows(model.table, taskDataTableConfig, model.tasks)
  const selected = new Set(model.table.selectedRowKeys)
  const visible = rows.filter(row => selected.has(row.id))
  const open = visible.length > 0
  const menuItem = (label: string, onSelect: Message): Html =>
    h.button(
      [
        h.Type('button'),
        h.Role('menuitem'),
        h.OnClick(onSelect),
        h.Class(
          'focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0',
        ),
      ],
      [label],
    )
  const enumMenu = (
    menuId: string,
    label: string,
    iconName: string,
    options: ReadonlyArray<string>,
    apply: (value: string) => Message,
  ): Html => {
    const isOpen = model.table.actionBarMenu === menuId
    return h.div(
      [h.Class('relative')],
      [
        actionBarItem(
          {
            onSelect: GotTableMessage({
              message: TableMessages.SetActionBarMenu({ menu: menuId }),
            }),
            class: 'gap-1.5',
            children: [
              icon(iconName, { class: 'size-4' }, h),
              label,
              icon('chevron-down', { class: 'size-3 opacity-50' }, h),
            ],
          },
          h,
        ),
        ...(isOpen
          ? [
              h.button([
                h.Type('button'),
                h.AriaHidden(true),
                h.Tabindex(-1),
                h.Class('fixed inset-0 z-40'),
                h.OnClick(
                  GotTableMessage({
                    message: TableMessages.SetActionBarMenu({ menu: '' }),
                  }),
                ),
              ]),
              h.div(
                [
                  h.Role('menu'),
                  h.DataAttribute('slot', 'dropdown-menu-content'),
                  h.Class(
                    'bg-popover text-popover-foreground absolute bottom-full z-50 mb-2 w-36 rounded-md border p-1 shadow-md outline-none',
                  ),
                ],
                [
                  h.div(
                    [
                      h.Class(
                        'text-muted-foreground px-2 py-1.5 text-xs font-medium',
                      ),
                    ],
                    [label],
                  ),
                  ...options.map(option =>
                    menuItem(capitalize(option), apply(option)),
                  ),
                ],
              ),
            ]
          : []),
      ],
    )
  }
  return actionBar(
    {
      open,
      toParentMessage: message =>
        message._tag === 'RequestedClose'
          ? GotActionBarMount({ message })
          : GotToolbarMount({ message }),
      children: [
        actionBarSelection(
          {
            children: [
              h.span(
                [h.Class('font-medium tabular-nums')],
                [String(visible.length)],
              ),
              h.span([h.Class('text-muted-foreground')], ['selected']),
              actionBarSeparator({}, h),
              actionBarClose(
                {
                  onClose: GotTableMessage({
                    message: TableMessages.ClosedActionBar({}),
                  }),
                  ariaLabel: 'Clear selection',
                  children: [icon('x', { class: 'size-4' }, h)],
                },
                h,
              ),
            ],
          },
          h,
        ),
        actionBarGroup(
          {
            children: [
              enumMenu(
                'status',
                'Status',
                'circle-check',
                [...taskStatuses],
                status =>
                  GotTableMessage({
                    message: TableMessages.AppliedBulkValue({
                      columnId: 'status',
                      value: status,
                    }),
                  }),
              ),
              enumMenu(
                'priority',
                'Priority',
                'arrow-up',
                [...taskPriorities],
                priority =>
                  GotTableMessage({
                    message: TableMessages.AppliedBulkValue({
                      columnId: 'priority',
                      value: priority,
                    }),
                  }),
              ),
              actionBarItem(
                {
                  onSelect: GotTableMessage({
                    message: TableMessages.RequestedExport({}),
                  }),
                  class: 'gap-1.5',
                  children: [
                    icon('download', { class: 'size-4' }, h),
                    'Export',
                  ],
                },
                h,
              ),
              actionBarItem(
                {
                  variant: 'destructive',
                  onSelect: GotTableMessage({
                    message: TableMessages.OpenedDeleteDialog({
                      ids: [...selected],
                    }),
                  }),
                  class: 'gap-1.5',
                  children: [icon('trash-2', { class: 'size-4' }, h), 'Delete'],
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

/* ---------- view ---------- */

const tasksTable = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('contents')],
    [
      dataTable<Task, Message>(
        {
          model: model.table,
          toParentMessage: message => GotTableMessage({ message }),
          rows: model.tasks,
          columns: COLUMNS(h),
          rowKey: task => task.id,
          variant: 'faceted',
          searchPlaceholder: 'Search titles...',
          searchAriaLabel: 'Search titles',
          searchColumnKey: 'title',
          valueMenu: {
            key: 'label',
            header: 'Labels',
            options: taskLabels.map(value => ({
              value,
              label: capitalize(value),
            })),
            get: task => task.label,
          },
          actionBar: [tasksActionBar(model, h)],
          toolbarContent: [dirToggle(model.table, h)],
          deleteItemLabel: 'task',
          ariaLabel: 'Tasks',
        },
        h,
      ),
      updateSheet(model, h),
    ],
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const hg = h as HtmlBuilder<Grid.Message>
  return model.view === 'data-table'
    ? tasksTable(model, h)
    : gridView(model.grid, hg)
}
