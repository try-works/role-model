/* Skin-neutral model for the data-grid component (mirrors tablecn's
   use-data-grid state: focused/editing cell, selected ranges, sorting,
   filtering, hidden columns, row height, search overlay, undo/redo).
   Row access is injected via DataGridConfig so the model stays serializable
   and renderer-agnostic. */

import { Calendar as CalendarPrimitive } from '@foldkit/ui'
import { Effect, Option, Queue, Schema as S, Stream } from 'effect'
import * as Calendar from 'foldkit/calendar'
import { defineMessageUnion } from 'foldkit/message'
import * as Mount from 'foldkit/mount'

import { dateFromISO, dateToISO } from '@/lib/date-parse'

export type CellVariant =
  | 'text'
  | 'number'
  | 'long-text'
  | 'select'
  | 'multi-select'
  | 'date'
  | 'file'
  | 'checkbox'
  | 'url'

export type FileCellData = Readonly<{
  id: string
  name: string
  size: number
  type: string
  url: string
}>

/* One column of the grid: presentation fields (header/iconName/width),
   the cell variant that picks the editor, variant options, and the row
   accessors the model needs. `get` is the cell's display/filter/sort text;
   `set` commits a text-style value ('' clears); boolean and file cells use
   getBoolean/getFiles + setFiles; multi-select reads getOptions and commits
   a ', '-joined set. */
export type DataGridColumn<Row> = Readonly<{
  id: string
  header: string
  iconName: string
  width: number
  variant: CellVariant
  options?: ReadonlyArray<string>
  numberMin?: number
  numberMax?: number
  numberStep?: number
  maxFiles?: number
  maxFileSize?: number
  get: (row: Row) => string
  set?: (row: Row, value: string) => Row
  getBoolean?: (row: Row) => boolean
  getOptions?: (row: Row) => ReadonlyArray<string>
  getFiles?: (row: Row) => ReadonlyArray<FileCellData>
  setFiles?: (row: Row, files: ReadonlyArray<FileCellData>) => Row
}>

export type DataGridConfig<Row> = Readonly<{
  columns: ReadonlyArray<DataGridColumn<Row>>
  rowKey: (row: Row) => string
  createRow: (key: string) => Row
}>

const columnById = <Row>(
  config: DataGridConfig<Row>,
  id: string,
): DataGridColumn<Row> | undefined => config.columns.find(c => c.id === id)

export const ROW_HEIGHTS = [
  { id: 'short', label: 'Short', height: 36 },
  { id: 'medium', label: 'Medium', height: 48 },
  { id: 'tall', label: 'Tall', height: 64 },
  { id: 'extra-tall', label: 'Extra tall', height: 80 },
] as const
export type RowHeightId = (typeof ROW_HEIGHTS)[number]['id']

export const CellAddress = S.Struct({ row: S.Number, column: S.String })
export type CellAddress = typeof CellAddress.Type

export const CellRange = S.Struct({
  start: CellAddress,
  end: CellAddress,
})
export type CellRange = typeof CellRange.Type

export const Model = S.Struct({
  viewportHeight: S.Number,
  rows: S.Array(S.Any),
  columnOrder: S.Array(S.String),
  hiddenColumnIds: S.Array(S.String),
  sorting: S.Array(S.Struct({ id: S.String, desc: S.Boolean })),
  filters: S.Array(S.Struct({ column: S.String, value: S.String })),
  rowHeight: S.String,
  focusedCell: S.Struct({ row: S.Number, column: S.String }),
  editingCell: S.Struct({ row: S.Number, column: S.String }),
  draftValue: S.String,
  selectionAnchor: S.Struct({ row: S.Number, column: S.String }),
  selectionEnd: S.Struct({ row: S.Number, column: S.String }),
  selectedRanges: S.Array(CellRange),
  selectedRowIndexes: S.Array(S.Number),
  lastSelectedRowIndex: S.Number,
  openPanel: S.String,
  contextMenu: S.Struct({
    open: S.Boolean,
    x: S.Number,
    y: S.Number,
    row: S.Number,
    column: S.String,
  }),
  searchOpen: S.Boolean,
  searchQuery: S.String,
  matchIndex: S.Number,
  pastStates: S.Array(S.Any),
  futureStates: S.Array(S.Any),
  direction: S.Literals(['ltr', 'rtl']),
  scrollTop: S.Number,
  cellCalendar: CalendarPrimitive.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  FocusedCell: { row: S.Number, column: S.String },
  StartedEditing: { row: S.Number, column: S.String, seed: S.String },
  ChangedDraft: { value: S.String },
  CommittedDraft: { move: S.String },
  CanceledEdit: {},
  CompletedEditorFocus: {},
  SetCellValue: { row: S.Number, column: S.String, value: S.String },
  ToggledCellBoolean: { row: S.Number, column: S.String },
  AppliedCellOption: { row: S.Number, column: S.String, value: S.String },
  ToggledCellOption: { row: S.Number, column: S.String, option: S.String },
  ClearedCellOptions: { row: S.Number, column: S.String },
  GotCellCalendarMessage: { message: S.Unknown },
  PickedCellFiles: {
    files: S.Array(
      S.Struct({
        name: S.String,
        size: S.Number,
        type: S.String,
        url: S.String,
      }),
    ),
  },
  RemovedCellFile: { row: S.Number, column: S.String, fileId: S.String },
  ClearedSelection: {},
  SelectedCell: { row: S.Number, column: S.String, additive: S.Boolean },
  SelectedRange: { row: S.Number, column: S.String, extend: S.Boolean },
  SelectedRowIndex: {
    index: S.Number,
    shiftKey: S.Boolean,
    additive: S.Boolean,
  },
  ToggledAllRows: { checked: S.Boolean },
  SetSorting: { column: S.String, desc: S.Boolean },
  RemovedSort: { column: S.String },
  HidColumn: { column: S.String },
  ToggledSort: { column: S.String },
  AddedFilter: { column: S.String, value: S.String },
  RemovedFilter: { column: S.String },
  ToggledColumnHidden: { column: S.String },
  SetRowHeight: { height: S.String },
  SetPanel: { panel: S.String },
  OpenedContextMenu: {
    x: S.Number,
    y: S.Number,
    row: S.Number,
    column: S.String,
  },
  ClosedContextMenu: {},
  AppliedContextAction: { action: S.String },
  AddedRow: {},
  AddedRowAt: { index: S.Number },
  DeletedRows: { indexes: S.Array(S.Number) },
  ToggledSearch: {},
  ChangedSearchQuery: { value: S.String },
  SetMatchIndex: { index: S.Number },
  NavigatedMatch: { direction: S.String },
  Undo: {},
  Redo: {},
  SetDirection: { direction: S.Literals(['ltr', 'rtl']) },
  SetViewportHeight: { height: S.Number },
  GridKey: {
    key: S.String,
    ctrl: S.Boolean,
    shift: S.Boolean,
    meta: S.Boolean,
  },
  Scrolled: { scrollTop: S.Number },
})
export type Message = typeof Message.Type

const today = (): Calendar.CalendarDate =>
  Calendar.fromDateInZone(new Date(), 'UTC')

export const init = <Row>(
  config: DataGridConfig<Row>,
  rows: ReadonlyArray<Row>,
): Model => ({
  rows,
  cellCalendar: CalendarPrimitive.init({
    id: 'data-grid-cell-calendar',
    today: today(),
  }),
  columnOrder: config.columns.map(column => column.id),
  hiddenColumnIds: [],
  sorting: [],
  filters: [],
  rowHeight: 'short',
  focusedCell: { row: -1, column: '' },
  editingCell: { row: -1, column: '' },
  draftValue: '',
  selectionAnchor: { row: -1, column: '' },
  selectionEnd: { row: -1, column: '' },
  selectedRanges: [],
  selectedRowIndexes: [],
  lastSelectedRowIndex: -1,
  openPanel: '',
  contextMenu: { open: false, x: 0, y: 0, row: -1, column: '' },
  searchOpen: false,
  searchQuery: '',
  matchIndex: 0,
  pastStates: [],
  futureStates: [],
  direction: 'ltr',
  scrollTop: 0,
  viewportHeight: 400,
})

export const rowHeightPx = (id: string): number =>
  ROW_HEIGHTS.find(entry => entry.id === id)?.height ?? 36

const rowsArray = <Row>(model: Model): Array<Row> => model.rows as Array<Row>

export const cellText = <Row>(
  row: Row,
  columnId: string,
  config: DataGridConfig<Row>,
): string => columnById(config, columnId)?.get(row) ?? ''

export const filteredRows = <Row>(
  model: Model,
  config: DataGridConfig<Row>,
): Array<Row> => {
  const active = model.filters.filter(filter => filter.value !== '')
  return rowsArray<Row>(model).filter(row =>
    active.every(filter =>
      cellText(row, filter.column, config)
        .toLowerCase()
        .includes(filter.value.toLowerCase()),
    ),
  )
}

/* variants whose editor edits the draftValue text field */
const draftEditedVariants: ReadonlySet<CellVariant> = new Set([
  'text',
  'number',
  'long-text',
  'url',
])

export const sortedRows = <Row>(
  rows: ReadonlyArray<Row>,
  sorting: ReadonlyArray<{ id: string; desc: boolean }>,
  config: DataGridConfig<Row>,
): ReadonlyArray<Row> => {
  if (sorting.length === 0) return rows
  return [...rows].sort((a, b) => {
    for (const entry of sorting) {
      const av = cellText(a, entry.id, config)
      const bv = cellText(b, entry.id, config)
      let cmp: number
      if (columnById(config, entry.id)?.variant === 'number') {
        cmp = (Number(av) || 0) - (Number(bv) || 0)
      } else {
        cmp = av.localeCompare(bv)
      }
      if (cmp !== 0) return entry.desc ? -cmp : cmp
    }
    return 0
  })
}

export const visibleColumnDefs = <Row>(
  model: Model,
  config: DataGridConfig<Row>,
): Array<DataGridColumn<Row>> =>
  visibleColumns(model)
    .map(id => columnById(config, id))
    .filter((c): c is DataGridColumn<Row> => c !== undefined)

const commitCell = <Row>(
  model: Model,
  row: number,
  columnId: string,
  value: string,
  config: DataGridConfig<Row>,
): Model => {
  const column = columnById(config, columnId)
  const target = filteredRows(model, config)[row]
  if (column === undefined || target === undefined) return model
  const write = column.set ?? ((r: Row): Row => r)
  const snapshot = model.rows
  return {
    ...model,
    pastStates: [...model.pastStates, snapshot],
    futureStates: [],
    rows: rowsArray<Row>(model).map(r =>
      config.rowKey(r) === config.rowKey(target) ? write(r, value) : r,
    ),
  }
}

const commitFiles = <Row>(
  model: Model,
  row: number,
  columnId: string,
  files: ReadonlyArray<FileCellData>,
  config: DataGridConfig<Row>,
): Model => {
  const column = columnById(config, columnId)
  const target = filteredRows(model, config)[row]
  if (column?.setFiles === undefined || target === undefined) return model
  const writeFiles = column.setFiles
  const snapshot = model.rows
  return {
    ...model,
    pastStates: [...model.pastStates, snapshot],
    futureStates: [],
    rows: rowsArray<Row>(model).map(r =>
      config.rowKey(r) === config.rowKey(target) ? writeFiles(r, files) : r,
    ),
  }
}

const moveFocus = <Row>(
  model: Model,
  dRow: number,
  dColumn: number,
  config: DataGridConfig<Row>,
): Model => {
  const columns = visibleColumns(model)
  const columnIndex = columns.indexOf(model.focusedCell.column)
  const nextColumn = Math.min(
    Math.max(columnIndex + dColumn, 0),
    columns.length - 1,
  )
  const nextRow = Math.min(
    Math.max(model.focusedCell.row + dRow, 0),
    filteredRows(model, config).length - 1,
  )
  return {
    ...model,
    focusedCell: { row: nextRow, column: columns[nextColumn] ?? '' },
  }
}

export const visibleColumns = (model: Model): Array<string> =>
  model.columnOrder.filter(column => !model.hiddenColumnIds.includes(column))

const emptyCell = { row: -1, column: '' }

export const update = <Row>(
  model: Model,
  message: Message,
  config: DataGridConfig<Row>,
): Model => {
  switch (message._tag) {
    case 'FocusedCell':
      return {
        ...model,
        focusedCell: { row: message.row, column: message.column },
        selectionAnchor: { row: message.row, column: message.column },
        selectionEnd: { row: message.row, column: message.column },
      }
    case 'StartedEditing': {
      const rows = filteredRows(model, config)
      const column = columnById(config, message.column)
      /* boolean cells toggle immediately — tablecn's checkbox cell is the
         editor itself, there is no separate edit mode for it */
      if (column?.variant === 'checkbox') {
        const target = rows[message.row]
        if (target === undefined) return model
        const checked = column.getBoolean?.(target) ?? false
        return commitCell(
          model,
          message.row,
          message.column,
          checked ? 'false' : 'true',
          config,
        )
      }
      /* date cells: reopen the cell calendar on the value's month — like
         tablecn's DateCell which seeds react-day-picker with the cell date */
      const target = rows[message.row]
      const viewDate =
        target === undefined
          ? Option.none()
          : dateFromISO(cellText(target, message.column, config))
      const cellCalendar =
        column?.variant === 'date'
          ? CalendarPrimitive.init({
              id: 'data-grid-cell-calendar',
              today: today(),
              ...(Option.isSome(viewDate)
                ? { initialViewDate: viewDate.value }
                : {}),
            })
          : model.cellCalendar
      return {
        ...model,
        cellCalendar,
        editingCell: { row: message.row, column: message.column },
        draftValue: message.seed,
      }
    }
    case 'ChangedDraft':
      return { ...model, draftValue: message.value }
    case 'CommittedDraft': {
      /* draftValue only backs the text-style editors (text, number, url,
         long-text); option/date/file editors commit through their own
         messages, so committing the draft would overwrite with '' */
      const committed = draftEditedVariants.has(
        columnById(config, model.editingCell.column)?.variant ?? 'text',
      )
        ? commitCell(
            model,
            model.editingCell.row,
            model.editingCell.column,
            model.draftValue,
            config,
          )
        : model
      const moved =
        message.move === 'down'
          ? moveFocus(committed, 1, 0, config)
          : message.move === 'right'
            ? moveFocus(committed, 0, 1, config)
            : committed
      return { ...moved, editingCell: emptyCell }
    }
    case 'CanceledEdit':
      return { ...model, editingCell: emptyCell, draftValue: '' }
    case 'CompletedEditorFocus':
      return model
    case 'SetCellValue':
      return commitCell(
        model,
        message.row,
        message.column,
        message.value,
        config,
      )
    case 'ToggledCellBoolean': {
      const column = columnById(config, message.column)
      const target = filteredRows(model, config)[message.row]
      if (column === undefined || target === undefined) return model
      const checked = column.getBoolean?.(target) ?? false
      return commitCell(
        model,
        message.row,
        message.column,
        checked ? 'false' : 'true',
        config,
      )
    }
    case 'AppliedCellOption': {
      const committed = commitCell(
        model,
        message.row,
        message.column,
        message.value,
        config,
      )
      return { ...committed, editingCell: emptyCell, draftValue: '' }
    }
    case 'ToggledCellOption': {
      const column = columnById(config, message.column)
      const target = filteredRows(model, config)[message.row]
      if (column === undefined || target === undefined) return model
      const current = column.getOptions?.(target) ?? []
      const next = current.includes(message.option)
        ? current.filter(option => option !== message.option)
        : [...current, message.option]
      return commitCell(
        model,
        message.row,
        message.column,
        next.join(', '),
        config,
      )
    }
    case 'ClearedCellOptions':
      return commitCell(model, message.row, message.column, '', config)
    case 'GotCellCalendarMessage': {
      const next = CalendarPrimitive.update(
        model.cellCalendar,
        message.message as CalendarPrimitive.Message,
      )
      if (next.outMessage !== undefined) {
        switch (next.outMessage._tag) {
          case 'SelectedDate': {
            const committed = commitCell(
              model,
              model.editingCell.row,
              model.editingCell.column,
              dateToISO(next.outMessage.date),
              config,
            )
            return {
              ...committed,
              cellCalendar: next.model,
              editingCell: emptyCell,
              draftValue: '',
            }
          }
          default:
            break
        }
      }
      return { ...model, cellCalendar: next.model }
    }
    case 'PickedCellFiles': {
      if (model.editingCell.row === -1) return model
      const column = columnById(config, model.editingCell.column)
      const target = filteredRows(model, config)[model.editingCell.row]
      if (column === undefined || target === undefined) return model
      const next: Array<FileCellData> = message.files.map((file, index) => ({
        id: `${config.rowKey(target)}-upload-${String(Date.now())}-${String(index)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
      }))
      return commitFiles(
        model,
        model.editingCell.row,
        model.editingCell.column,
        [...(column.getFiles?.(target) ?? []), ...next],
        config,
      )
    }
    case 'RemovedCellFile': {
      const column = columnById(config, message.column)
      const target = filteredRows(model, config)[message.row]
      if (column === undefined || target === undefined) return model
      return commitFiles(
        model,
        message.row,
        message.column,
        (column.getFiles?.(target) ?? []).filter(
          file => file.id !== message.fileId,
        ),
        config,
      )
    }
    case 'ClearedSelection':
      return {
        ...model,
        selectedRanges: [],
        selectedRowIndexes: [],
        selectionAnchor: emptyCell,
        selectionEnd: emptyCell,
      }
    case 'SelectedCell':
      return {
        ...model,
        focusedCell: { row: message.row, column: message.column },
        selectionAnchor: { row: message.row, column: message.column },
        selectionEnd: { row: message.row, column: message.column },
      }
    case 'SelectedRange': {
      const end = { row: message.row, column: message.column }
      const anchor = message.extend ? model.selectionAnchor : end
      return {
        ...model,
        focusedCell: end,
        selectionAnchor: anchor.row === -1 ? end : anchor,
        selectionEnd: end,
      }
    }
    case 'SelectedRowIndex': {
      const index = message.index
      if (message.shiftKey && model.lastSelectedRowIndex !== -1) {
        const [lo, hi] = [
          Math.min(model.lastSelectedRowIndex, index),
          Math.max(model.lastSelectedRowIndex, index),
        ]
        const range = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
        const selected = new Set(model.selectedRowIndexes)
        for (const i of range) selected.add(i)
        return {
          ...model,
          selectedRowIndexes: [...selected],
          lastSelectedRowIndex: index,
        }
      }
      const isSelected = model.selectedRowIndexes.includes(index)
      return {
        ...model,
        lastSelectedRowIndex: index,
        selectedRowIndexes: isSelected
          ? model.selectedRowIndexes.filter(i => i !== index)
          : [...model.selectedRowIndexes, index],
      }
    }
    case 'ToggledAllRows': {
      if (!message.checked) return { ...model, selectedRowIndexes: [] }
      return {
        ...model,
        selectedRowIndexes: filteredRows(model, config).map((_, i) => i),
      }
    }
    case 'SetSorting':
      return {
        ...model,
        sorting:
          message.column === ''
            ? []
            : [{ id: message.column, desc: message.desc }],
        openPanel: '',
      }
    case 'RemovedSort':
      return {
        ...model,
        sorting: model.sorting.filter(s => s.id !== message.column),
        openPanel: '',
      }
    case 'HidColumn':
      return {
        ...model,
        hiddenColumnIds: model.hiddenColumnIds.includes(message.column)
          ? model.hiddenColumnIds
          : [...model.hiddenColumnIds, message.column],
        openPanel: '',
      }
    case 'ToggledSort': {
      const existing = model.sorting.find(e => e.id === message.column)
      if (existing === undefined)
        return { ...model, sorting: [{ id: message.column, desc: false }] }
      if (!existing.desc)
        return {
          ...model,
          sorting: [{ id: message.column, desc: true }],
        }
      return { ...model, sorting: [] }
    }
    case 'AddedFilter':
      return {
        ...model,
        filters: [
          ...model.filters.filter(f => f.column !== message.column),
          { column: message.column, value: message.value },
        ],
      }
    case 'RemovedFilter':
      return {
        ...model,
        filters: model.filters.filter(f => f.column !== message.column),
      }
    case 'ToggledColumnHidden':
      return {
        ...model,
        hiddenColumnIds: model.hiddenColumnIds.includes(message.column)
          ? model.hiddenColumnIds.filter(c => c !== message.column)
          : [...model.hiddenColumnIds, message.column],
      }
    case 'SetRowHeight':
      return { ...model, rowHeight: message.height, openPanel: '' }
    case 'SetPanel':
      return {
        ...model,
        openPanel: model.openPanel === message.panel ? '' : message.panel,
      }
    case 'OpenedContextMenu':
      return {
        ...model,
        contextMenu: {
          open: true,
          x: message.x,
          y: message.y,
          row: message.row,
          column: message.column,
        },
        focusedCell: { row: message.row, column: message.column },
      }
    case 'ClosedContextMenu':
      return { ...model, contextMenu: { ...model.contextMenu, open: false } }
    case 'AppliedContextAction': {
      const menu = model.contextMenu
      const closed = {
        ...model,
        contextMenu: { ...menu, open: false },
      }
      switch (message.action) {
        case 'clear-cell':
          return commitCell(closed, menu.row, menu.column, '', config)
        case 'add-row-above':
          return insertRow(closed, menu.row, config)
        case 'add-row-below':
          return insertRow(closed, menu.row + 1, config)
        case 'delete-row':
          return deleteRow(closed, menu.row, config)
        default:
          return closed
      }
    }
    case 'AddedRow':
      return insertRow(model, filteredRows(model, config).length, config)
    case 'AddedRowAt':
      return insertRow(model, message.index, config)
    case 'DeletedRows': {
      const rows = filteredRows(model, config)
      const keys = new Set(
        message.indexes
          .map(index => rows[index])
          .filter((row): row is Row => row !== undefined)
          .map(row => config.rowKey(row)),
      )
      return {
        ...model,
        pastStates: [...model.pastStates, model.rows],
        futureStates: [],
        rows: rowsArray<Row>(model).filter(
          row => !keys.has(config.rowKey(row)),
        ),
        selectedRowIndexes: [],
      }
    }
    case 'ToggledSearch':
      return {
        ...model,
        searchOpen: !model.searchOpen,
        searchQuery: model.searchOpen ? model.searchQuery : '',
        matchIndex: 0,
      }
    case 'ChangedSearchQuery':
      return { ...model, searchQuery: message.value, matchIndex: 0 }
    case 'SetMatchIndex':
      return { ...model, matchIndex: message.index }
    case 'NavigatedMatch': {
      const matches = searchMatches(model, config)
      if (matches.length === 0) return model
      const delta = message.direction === 'prev' ? -1 : 1
      return {
        ...model,
        matchIndex:
          (model.matchIndex + delta + matches.length) % matches.length,
      }
    }
    case 'Undo': {
      const previous = model.pastStates[model.pastStates.length - 1]
      if (previous === undefined) return model
      return {
        ...model,
        pastStates: model.pastStates.slice(0, -1),
        futureStates: [model.rows, ...model.futureStates],
        rows: previous,
      }
    }
    case 'Redo': {
      const next = model.futureStates[0]
      if (next === undefined) return model
      return {
        ...model,
        futureStates: model.futureStates.slice(1),
        pastStates: [...model.pastStates, model.rows],
        rows: next,
      }
    }
    case 'SetDirection':
      return { ...model, direction: message.direction }
    case 'GridKey':
      return onGridKey(
        model,
        message.key,
        message.ctrl || message.meta,
        message.shift,
        config,
      )
    case 'Scrolled':
      return { ...model, scrollTop: message.scrollTop }
    case 'SetViewportHeight':
      return { ...model, viewportHeight: message.height }
  }
}

const onGridKey = <Row>(
  model: Model,
  key: string,
  ctrl: boolean,
  shift: boolean,
  config: DataGridConfig<Row>,
): Model => {
  const isEditing = model.editingCell.row !== -1
  if (ctrl) {
    switch (key.toLowerCase()) {
      case 'f':
        return update(model, Message.ToggledSearch({}), config)
      case 'z':
        return shift
          ? update(model, Message.Redo({}), config)
          : update(model, Message.Undo({}), config)
      case 'y':
        return update(model, Message.Redo({}), config)
      case 'a': {
        if (isEditing) return model
        return update(model, Message.ToggledAllRows({ checked: true }), config)
      }
      default:
        return model
    }
  }
  if (isEditing) {
    switch (key) {
      case 'Escape':
        return update(model, Message.CanceledEdit({}), config)
      case 'Enter':
        return update(model, Message.CommittedDraft({ move: 'down' }), config)
      case 'Tab':
        return update(model, Message.CommittedDraft({ move: 'right' }), config)
      default:
        return model
    }
  }
  switch (key) {
    case 'Escape':
      if (model.searchOpen)
        return update(model, Message.ToggledSearch({}), config)
      if (model.contextMenu.open)
        return update(model, Message.ClosedContextMenu({}), config)
      return update(model, Message.ClearedSelection({}), config)
    case 'ArrowUp':
      return moveFocus(model, -1, 0, config)
    case 'ArrowDown':
      return moveFocus(model, 1, 0, config)
    case 'ArrowLeft':
      return moveFocus(model, 0, -1, config)
    case 'ArrowRight':
      return moveFocus(model, 0, 1, config)
    case 'Tab':
      return moveFocus(model, 0, shift ? -1 : 1, config)
    case 'Enter':
    case 'F2':
      if (model.focusedCell.row === -1) return model
      return update(
        model,
        Message.StartedEditing({
          row: model.focusedCell.row,
          column: model.focusedCell.column,
          seed: '',
        }),
        config,
      )
    case 'Delete':
    case 'Backspace': {
      if (model.focusedCell.row === -1) return model
      const rows = [...model.selectedRowIndexes]
      if (rows.length > 1)
        return update(model, Message.DeletedRows({ indexes: rows }), config)
      return commitCell(
        model,
        model.focusedCell.row,
        model.focusedCell.column,
        '',
        config,
      )
    }
    default:
      /* type-over: printable char opens editor seeded with the key */
      if (key.length === 1 && model.focusedCell.row !== -1) {
        return update(
          model,
          Message.StartedEditing({
            row: model.focusedCell.row,
            column: model.focusedCell.column,
            seed: key,
          }),
          config,
        )
      }
      return model
  }
}

const MountMessage = defineMessageUnion({
  GridKeydown: {
    key: S.String,
    ctrl: S.Boolean,
    shift: S.Boolean,
    meta: S.Boolean,
  },
  GridContextMenu: {
    x: S.Number,
    y: S.Number,
    row: S.Number,
    column: S.String,
  },
  GridScrolled: {
    scrollTop: S.Number,
  },
  GridViewportHeight: { height: S.Number },
})

const EditorMountMessage = defineMessageUnion({
  GridEditorFocused: {},
})
export type MountMessage = typeof MountMessage.Type

export const GridKeys = Mount.defineStream('TablecnGridKeys', {
  args: {},
  messages: [
    MountMessage.GridKeydown,
    MountMessage.GridContextMenu,
    MountMessage.GridScrolled,
    MountMessage.GridViewportHeight,
  ],
  execute: ({ element }) =>
    Stream.callback<MountMessage>(queue =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            if (!(element instanceof HTMLElement)) return undefined
            const onKeyDown = (event: KeyboardEvent): void => {
              const target = event.target as HTMLElement | null
              const inEditor =
                target !== null &&
                (target.tagName === 'INPUT' ||
                  target.tagName === 'TEXTAREA' ||
                  target.isContentEditable)
              const printable = event.key.length === 1
              /* while an input/editor owns the event only Enter/Escape/Tab
                 belong to the grid — printable keys and ctrl/meta text
                 combos (select-all, undo, find) stay with the input */
              if (inEditor && !['Enter', 'Escape', 'Tab'].includes(event.key))
                return
              const handled =
                event.ctrlKey ||
                event.metaKey ||
                [
                  'ArrowUp',
                  'ArrowDown',
                  'ArrowLeft',
                  'ArrowRight',
                  'Tab',
                  'Enter',
                  'Escape',
                  'Delete',
                  'Backspace',
                  'F2',
                ].includes(event.key) ||
                printable
              if (!handled) return
              if (
                !event.ctrlKey &&
                !event.metaKey &&
                (event.key.startsWith('Arrow') ||
                  event.key === 'Tab' ||
                  event.key === 'Delete' ||
                  event.key === 'Backspace' ||
                  event.key === 'F2')
              )
                event.preventDefault()
              Queue.offerUnsafe(
                queue,
                MountMessage.GridKeydown({
                  key: event.key,
                  ctrl: event.ctrlKey,
                  shift: event.shiftKey,
                  meta: event.metaKey,
                }),
              )
            }
            const onContextMenu = (event: MouseEvent): void => {
              const target = (event.target as HTMLElement).closest(
                '[data-row-index][data-column-id]',
              ) as HTMLElement | null
              if (target === null) return
              event.preventDefault()
              Queue.offerUnsafe(
                queue,
                MountMessage.GridContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  row: Number(target.dataset['rowIndex'] ?? -1),
                  column: target.dataset['columnId'] ?? '',
                }),
              )
            }
            const onScroll = (): void => {
              Queue.offerUnsafe(
                queue,
                MountMessage.GridScrolled({ scrollTop: element.scrollTop }),
              )
            }
            const onResize = (): void => {
              Queue.offerUnsafe(
                queue,
                MountMessage.GridViewportHeight({
                  height: window.innerHeight,
                }),
              )
            }
            Queue.offerUnsafe(
              queue,
              MountMessage.GridViewportHeight({ height: window.innerHeight }),
            )
            element.addEventListener('keydown', onKeyDown)
            element.addEventListener('contextmenu', onContextMenu)
            element.addEventListener('scroll', onScroll, { passive: true })
            window.addEventListener('resize', onResize)
            return { onKeyDown, onContextMenu, onScroll, onResize }
          }),
          resource =>
            Effect.sync(() => {
              if (resource === undefined || !(element instanceof HTMLElement))
                return
              element.removeEventListener('keydown', resource.onKeyDown)
              element.removeEventListener('contextmenu', resource.onContextMenu)
              element.removeEventListener('scroll', resource.onScroll)
              window.removeEventListener('resize', resource.onResize)
            }),
        )
        return yield* Effect.never
      }),
    ),
})

export const gridKeysMount = <Msg>(
  toParentMessage: (message: MountMessage) => Msg,
) => Mount.mapMessage(GridKeys({}), toParentMessage)

/* autofocus only applies on initial page load; a one-shot mount focuses the
   editor element when the cell editor enters the DOM */
export const FocusCellEditor = Mount.define('FocusCellEditor', {
  args: {},
  messages: [EditorMountMessage.GridEditorFocused],
  execute: ({ element }) =>
    Effect.sync(() => {
      if (element instanceof HTMLElement) element.focus()
      return EditorMountMessage.GridEditorFocused({})
    }),
})

export const gridEditorFocusMount = <Msg>(toParentMessage: () => Msg) =>
  Mount.mapMessage(
    FocusCellEditor({}),
    toParentMessage as (message: typeof EditorMountMessage.Type) => Msg,
  )

/* Radix-style collision fit for editor popups: if the popup would render
   off the viewport edge, re-anchor it to the cell's other inline edge or
   flip it above the cell. Pure DOM adjustment — no model state. */
const EditorPopupFit = Mount.define('EditorPopupFit', {
  args: {},
  messages: [EditorMountMessage.GridEditorFocused],
  execute: ({ element }) =>
    Effect.sync(() => {
      if (element instanceof HTMLElement) {
        const rect = element.getBoundingClientRect()
        const vw = document.documentElement.clientWidth
        const vh = document.documentElement.clientHeight
        if (rect.right > vw - 4) {
          element.style.insetInlineStart = 'auto'
          element.style.insetInlineEnd = '0'
        } else if (rect.left < 4) {
          element.style.insetInlineEnd = 'auto'
          element.style.insetInlineStart = '0'
        }
        if (rect.bottom > vh - 4) {
          element.style.top = 'auto'
          element.style.bottom = '100%'
          element.style.marginTop = '0'
          element.style.marginBottom = '0.125rem'
        }
      }
      return EditorMountMessage.GridEditorFocused({})
    }),
})

export const cellEditorPopupFitMount = <Msg>(toParentMessage: () => Msg) =>
  Mount.mapMessage(
    EditorPopupFit({}),
    toParentMessage as (message: typeof EditorMountMessage.Type) => Msg,
  )

const FilePickerMessage = defineMessageUnion({
  FilesPicked: {
    files: S.Array(
      S.Struct({
        name: S.String,
        size: S.Number,
        type: S.String,
        url: S.String,
      }),
    ),
  },
})

/* native <input type=file> change → picked File objects become plain
   FileCellData-shaped payloads the update can store on the row */
export const CellFilePicker = Mount.defineStream('TablecnGridFilePicker', {
  args: {},
  messages: [FilePickerMessage.FilesPicked],
  execute: ({ element }) =>
    Stream.callback<typeof FilePickerMessage.Type>(queue =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            if (!(element instanceof HTMLInputElement)) return undefined
            const onChange = (): void => {
              const picked = Array.from(element.files ?? []).map(file => ({
                name: file.name,
                size: file.size,
                type: file.type,
                url: URL.createObjectURL(file),
              }))
              if (picked.length > 0)
                Queue.offerUnsafe(
                  queue,
                  FilePickerMessage.FilesPicked({ files: picked }),
                )
              element.value = ''
            }
            element.addEventListener('change', onChange)
            return () => {
              element.removeEventListener('change', onChange)
            }
          }),
          cleanup =>
            Effect.sync(() => {
              cleanup?.()
            }),
        )
        return Effect.void
      }),
    ),
})

export const cellFilePickerMount = <Msg>(
  toParentMessage: (message: typeof FilePickerMessage.Type) => Msg,
) => Mount.mapMessage(CellFilePicker({}), toParentMessage)

const insertRow = <Row>(
  model: Model,
  index: number,
  config: DataGridConfig<Row>,
): Model => {
  const rows = filteredRows(model, config)
  const key = `row_new_${String(Date.now())}`
  if (index >= rows.length || rows[index] === undefined) {
    /* append at end of the underlying array */
    return {
      ...model,
      pastStates: [...model.pastStates, model.rows],
      futureStates: [],
      rows: [...model.rows, config.createRow(key)],
    }
  }
  const targetKey = config.rowKey(rows[index]!)
  const rawIndex = rowsArray<Row>(model).findIndex(
    r => config.rowKey(r) === targetKey,
  )
  const nextRows = [...model.rows]
  nextRows.splice(
    rawIndex === -1 ? nextRows.length : rawIndex,
    0,
    config.createRow(key),
  )
  return {
    ...model,
    pastStates: [...model.pastStates, model.rows],
    futureStates: [],
    rows: nextRows,
  }
}

const deleteRow = <Row>(
  model: Model,
  index: number,
  config: DataGridConfig<Row>,
): Model => {
  const target = filteredRows(model, config)[index]
  if (target === undefined) return model
  const targetKey = config.rowKey(target)
  return {
    ...model,
    pastStates: [...model.pastStates, model.rows],
    futureStates: [],
    rows: rowsArray<Row>(model).filter(r => config.rowKey(r) !== targetKey),
  }
}

export interface GridMatch {
  row: number
  column: string
}

export const searchMatches = <Row>(
  model: Model,
  config: DataGridConfig<Row>,
): Array<GridMatch> => {
  const query = model.searchQuery.trim().toLowerCase()
  if (query === '') return []
  const columns = visibleColumns(model)
  const matches: Array<GridMatch> = []
  filteredRows(model, config).forEach((row, rowIndex) => {
    for (const column of columns) {
      if (cellText(row, column, config).toLowerCase().includes(query)) {
        matches.push({ row: rowIndex, column })
      }
    }
  })
  return matches
}
