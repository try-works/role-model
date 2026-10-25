import { Style, When } from '@pleat/core'
/* tablecn "tasks" data-table block — thin consumer of the creaseui data-table
   component (faceted variant). The page owns the task rows, the edit sheet,
   the action bar, and the LTR/RTL toggle; all table chrome (faceted filters,
   sort menu, view panel, header/row menus, pagination, delete dialog) comes
   from dataTable({ variant: 'faceted' }). StyleX renderer. */

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
} from '@/pleat/action-bar'
import { badge } from '@/pleat/badge'
import { button } from '@/pleat/button'
import { dataTable, type DataTableColumn } from '@/pleat/data-table'
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
import * as Select from '@/pleat/select'
import { icon } from '@/pleat/composition/icon'
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
import { className } from '@/pleat/style'
import { type ComponentLayoutStyle, layoutStyle } from '@/pleat/contracts'
import { tokens } from '@/pleat/tokens'
import { foundationTokens } from '@/pleat/foundations-tokens'
import { interactionTokens } from '@/pleat/interaction-tokens'
import { reset } from '@/pleat/reset'
import { gridView } from '@/demo/blocks-stylex/tablecn-grid-view'

const st = {
  badge0: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusFull,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.25rem',
    overflow: 'hidden',
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    color: tokens.foreground,
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1rem',
    transitionProperty: 'all',
    whiteSpace: 'nowrap',
    height: '1.25rem',
    width: 'fit-content',
  }),
  badge1: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusFull,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.25rem',
    overflow: 'hidden',
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    color: tokens.foreground,
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1rem',
    transitionProperty: 'all',
    whiteSpace: 'nowrap',
    height: '1.25rem',
    width: 'fit-content',
  }),
  c0: Style.make({
    padding: '0.25rem',
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor: foundationTokens.popover,
    boxShadow: foundationTokens.shadowMd,
    color: foundationTokens.popoverForeground,
    outlineStyle: 'none',
    position: 'absolute',
    zIndex: 50,
    marginTop: '0.25rem',
    top: '100%',
    width: '12rem',
  }),
  c1: Style.make({
    borderRadius: foundationTokens.radiusSm,
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    alignItems: 'center',
    backgroundColor: 'transparent',
    cursor: interactionTokens.cursorDefault,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    paddingInlineEnd: '0.5rem',
    paddingInlineStart: '2rem',
    position: 'relative',
    userSelect: 'none',
    width: '100%',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    }),
    Style.when(When.focus, {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    }),
  ),
  c2: Style.make({
    paddingBlock: '0.375rem',
    paddingInline: '0.5rem',
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
  }),
  c6: Style.make({ position: 'relative' }),
  c7: Style.make({
    inset: '0',
    backgroundColor: 'transparent',
    cursor: interactionTokens.cursorDefault,
    position: 'fixed',
    zIndex: 40,
  }),
  c15: Style.make({ paddingInlineStart: '2rem' }),
  c16: Style.make({
    color: tokens.mutedForeground,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  }),
  c17: Style.make({ gap: '0.5rem', alignItems: 'center', display: 'flex' }),
  c18: layoutStyle({ flexShrink: '0' }),
  c19: Style.make({
    overflow: 'hidden',
    fontWeight: 500,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: '0rem',
  }),
  c20: Style.make({
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
    width: '5rem',
  }),
  c21: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: '1.25rem',
  }),
  fullWidth: Style.make({ width: '100%' }),
  c44: Style.make({ color: tokens.mutedForeground }),
  c47: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.375rem',
    paddingInline: '0.625rem',
    alignItems: 'center',
    backgroundColor: 'transparent',
    boxShadow: foundationTokens.shadowXs,
    display: 'inline-flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, background-color, border-color, box-shadow',
    height: '2rem',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    }),
  ),
  c52: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  c62: Style.make({ gap: '0.375rem' }),
  c70: Style.make({ gap: '0.5rem', display: 'grid' }),
  c71: Style.make({ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1 }),
  c72: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    paddingInline: '0.625rem',
    backgroundColor: 'transparent',
    boxShadow: foundationTokens.shadowXs,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    height: '2rem',
    width: '100%',
  }).pipe(
    Style.when(When.focusVisible, {
      boxShadow: `inset 0 0 0 1px ${tokens.ring}`,
    }),
  ),
  c73: Style.make({
    inset: '0',
    backgroundColor: tokens.backdrop,
    position: 'fixed',
    zIndex: 50,
  }),
  c74: Style.make({
    padding: '1.5rem',
    gap: '1rem',
    backgroundColor: tokens.background,
    boxShadow: foundationTokens.shadowXl,
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    zIndex: 50,
    borderLeftColor: tokens.border,
    borderLeftStyle: 'solid',
    borderLeftWidth: '1px',
    bottom: '0',
    height: '100%',
    right: '0rem',
    top: '0',
    width: '75.0%',
  }).pipe(Style.when(When.minWidth('640px'), { maxWidth: '24rem' })),
  c75: Style.make({
    borderRadius: foundationTokens.radiusSm,
    opacity: '0.7',
    position: 'absolute',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'opacity',
    right: '1rem',
    top: '1rem',
  }).pipe(Style.when(When.focus, { boxShadow: `0 0 0 2px ${tokens.ring}` })),
  c76: Style.make({
    gap: '0.375rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  c77: Style.make({
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: '1.75rem',
  }),
  c78: Style.make({ gap: '1rem', paddingBlock: '1rem', display: 'grid' }),
  c79: Style.make({
    gap: '0.5rem',
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 'auto',
  }),
  c83: Style.make({
    insetInlineStart: '0rem',
    bottom: '100%',
    marginBottom: '0.25rem',
    top: 'auto',
    width: '9rem',
  }),
  c84: Style.make({ fontWeight: 500 }),
  icon4: Style.make({ display: 'inline-flex' }),
  icon5: Style.make({ display: 'inline-flex' }),
  icon9: Style.make({ display: 'inline-flex' }),
  icon22: Style.make({
    color: tokens.mutedForeground,
    display: 'inline-flex',
    fontSize: '1rem',
  }),
  icon27: Style.make({ display: 'inline-flex' }),
  icon28: Style.make({ display: 'inline-flex', fontSize: '1rem' }),
  icon29: Style.make({
    display: 'inline-flex',
    fontSize: '0.875rem',
    opacity: '0.6',
  }),
  icon30: Style.make({ display: 'inline-flex', fontSize: '1rem' }),
  icon31: Style.make({ display: 'inline-flex', fontSize: '1rem' }),
  icon32: Style.make({ display: 'inline-flex', fontSize: '1rem' }),
}
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

/* ---------- shared chrome ---------- */

const PANEL_CLASS = st.c0

const MENU_ITEM_CLASS = st.c1

const MENU_LABEL_CLASS = st.c2

const capitalize = (value: string): string =>
  value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1)

const STATUS_ICONS: Record<string, string> = {
  todo: 'circle',
  'in-progress': 'timer',
  done: 'circle-check-big',
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
    [h.Class(className(st.badge0))],
    [
      h.span(
        [h.Class(className(st.icon4))],
        [icon({ name: STATUS_ICONS[status] ?? 'circle', size: 'sm' }, h)],
      ),
      status === 'in-progress' ? 'In-Progress' : status,
    ],
  )

const priorityBadge = (priority: string, h: HtmlBuilder<Message>): Html =>
  h.span(
    [h.Class(className(st.badge1))],
    [
      h.span(
        [h.Class(className(st.icon5))],
        [icon({ name: PRIORITY_ICONS[priority] ?? 'minus', size: 'sm' }, h)],
      ),
      priority,
    ],
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

/* column defs used by toolbar + header + view menu */
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
    cell: task => h.span([h.Class(className(st.c16))], [task.code]),
  },
  {
    key: 'title',
    header: 'Title',
    sortable: true,
    get: task => task.title,
    cell: task =>
      h.div(
        [h.Class(className(st.c17))],
        [
          badge(
            {
              variant: 'outline',
              layoutStyle: st.c18,
              children: [
                h.span(
                  [h.Class(className(st.icon9))],
                  [
                    icon(
                      { name: LABEL_ICONS[task.label] ?? 'tag', size: 'sm' },
                      h,
                    ),
                  ],
                ),
                task.label,
              ],
            },
            h,
          ),
          h.span([h.Class(className(st.c19))], [task.title]),
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
      h.div([h.Class(className(st.c20))], [String(task.estimatedHours)]),
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
      h.span([h.Class(className(st.c21))], [formatDate(task.createdAt)]),
  },
]

/* ---------- dir toggle ---------- */

const dirToggle = (model: TableModel, h: HtmlBuilder<Message>): Html =>
  h.button(
    [
      h.Type('button'),
      h.AriaLabel('Toggle direction'),
      h.OnClick(
        TableMessages.SetDirection({
          direction: model.direction === 'ltr' ? 'rtl' : 'ltr',
        }),
      ),
      h.Class(className(reset.button, st.c47)),
    ],
    [
      h.span(
        [h.Class(className(st.icon22))],
        [icon({ name: 'languages', size: 'sm' }, h)],
      ),
      model.direction === 'ltr' ? 'LTR' : 'RTL',
    ],
  )

/* ---------- update sheet ---------- */

const updateSheet = (model: Model, h: HtmlBuilder<Message>): Html => {
  if (model.table.updateSheetKey === '') return h.empty
  const field = (
    label: string,
    selectModel: Listbox.Model,
    selected: string,
    options: ReadonlyArray<string>,
    toParentMessage: (message: Listbox.Message) => Message,
  ): Html =>
    h.div(
      [h.Class(className(st.c70))],
      [
        h.label([h.Class(className(st.c71))], [label]),
        Select.select(
          {
            model: selectModel,
            maybeSelectedValue: Option.some(selected),
            toParentMessage,
            items: options,
            itemToValue: option => option,
            itemToLabel: option => capitalize(option),
            triggerLayoutStyle: st.fullWidth as ComponentLayoutStyle,
            direction: model.table.direction,
          },
          h,
        ),
      ],
    )
  return h.div(
    [],
    [
      h.div([
        h.Class(className(st.c73)),
        h.OnClick(
          GotTableMessage({ message: TableMessages.ClosedUpdateSheet({}) }),
        ),
      ]),
      h.div(
        [
          h.Role('dialog'),
          h.AriaModal(true),
          h.DataAttribute('slot', 'sheet-content'),
          h.Class(className(st.c74)),
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
              h.Class(className(reset.button, st.c75)),
            ],
            [
              h.span(
                [h.Class(className(st.icon27))],
                [icon({ name: 'x', size: 'sm' }, h)],
              ),
            ],
          ),
          h.div(
            [h.Class(className(st.c76))],
            [
              h.h2([h.Class(className(st.c77))], ['Update task']),
              h.p(
                [h.Class(className(st.c52))],
                ['Update the task details and save the changes'],
              ),
            ],
          ),
          h.div(
            [h.Class(className(st.c78))],
            [
              h.div(
                [h.Class(className(st.c70))],
                [
                  h.label([h.Class(className(st.c71))], ['Title']),
                  h.input([
                    h.Class(className(reset.input, st.c72)),
                    h.Value(model.draftTitle),
                    h.OnInput(value =>
                      ChangedDraftField({
                        field: 'title',
                        value,
                      }),
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
                [h.Class(className(st.c70))],
                [
                  h.label([h.Class(className(st.c71))], ['Estimated Hours']),
                  h.input([
                    h.Type('number'),
                    h.Class(className(reset.input, st.c72)),
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
            [h.Class(className(st.c79))],
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

/* ---------- action bar ---------- */

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
        h.Class(className(reset.button, MENU_ITEM_CLASS, st.c15)),
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
      [h.Class(className(st.c6))],
      [
        actionBarItem(
          {
            onSelect: GotTableMessage({
              message: TableMessages.SetActionBarMenu({ menu: menuId }),
            }),
            extraStyle: st.c62,
            children: [
              h.span(
                [h.Class(className(st.icon28))],
                [icon({ name: iconName, size: 'sm' }, h)],
              ),
              label,
              h.span(
                [h.Class(className(st.icon29))],
                [icon({ name: 'chevron-down', size: 'sm' }, h)],
              ),
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
                h.Class(className(reset.button, st.c7)),
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
                  h.Class(className(PANEL_CLASS, st.c83)),
                ],
                [
                  h.div([h.Class(className(MENU_LABEL_CLASS))], [label]),
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
              h.span([h.Class(className(st.c84))], [String(visible.length)]),
              h.span([h.Class(className(st.c44))], ['selected']),
              actionBarSeparator({}, h),
              actionBarClose(
                {
                  onClose: GotTableMessage({
                    message: TableMessages.ClosedActionBar({}),
                  }),
                  ariaLabel: 'Clear selection',
                  children: [
                    h.span(
                      [h.Class(className(st.icon30))],
                      [icon({ name: 'x', size: 'sm' }, h)],
                    ),
                  ],
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
                  extraStyle: st.c62,
                  children: [
                    h.span(
                      [h.Class(className(st.icon31))],
                      [icon({ name: 'download', size: 'sm' }, h)],
                    ),
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
                  extraStyle: st.c62,
                  children: [
                    h.span(
                      [h.Class(className(st.icon32))],
                      [icon({ name: 'trash-2', size: 'sm' }, h)],
                    ),
                    'Delete',
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

/* ---------- the data table ---------- */

const tasksTable = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
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

/* ---------- page ---------- */

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const hg = h as HtmlBuilder<Grid.Message>
  return model.view === 'data-table'
    ? tasksTable(model, h)
    : gridView(model.grid, hg)
}
