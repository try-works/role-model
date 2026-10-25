/* Model for the tablecn tasks table block (mirrors the nuqs URL state +
   tanstack table state from tablecn/src/app/components/tasks-table.tsx).
   Single open-popover id replaces React's per-component useState. */

import { Listbox } from '@foldkit/ui'
import { Effect, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import * as Calendar from 'foldkit/calendar'
import { defineMessageUnion } from 'foldkit/message'

import { dateToISO } from '@/lib/date-parse'
import * as DateRangeInput from '@/lib/date-range-input'
import * as MultiSlider from '@/lib/slider'

export const SortEntry = S.Struct({ id: S.String, desc: S.Boolean })

export type FilterVariant = 'options' | 'range' | 'date'

export interface DataTableColumn<Row> {
  readonly id: string
  readonly header: string
  readonly iconName?: string
  readonly filterVariant?: FilterVariant
  readonly options?: ReadonlyArray<
    Readonly<{ value: string; label: string; iconName?: string }>
  >
  readonly rangeMin?: number
  readonly rangeMax?: number
  readonly rangeStep?: number
  readonly get: (row: Row) => string
  readonly sortValue?: (row: Row) => string | number
  readonly getNumber?: (row: Row) => number
  readonly getDate?: (row: Row) => number
  readonly set?: (row: Row, value: string) => Row
}

export interface DataTableConfig<Row> {
  readonly columns: ReadonlyArray<DataTableColumn<Row>>
  readonly rowKey: (row: Row) => string
  /** column whose `get` the toolbar search box matches against; when omitted
      all columns are searched. */
  readonly searchColumnId?: string
  readonly defaultSort?: ReadonlyArray<SortEntry>
}

const columnById = <Row>(
  config: DataTableConfig<Row>,
  id: string,
): DataTableColumn<Row> | undefined =>
  config.columns.find(column => column.id === id)
export type SortEntry = typeof SortEntry.Type

export const OpenPanel = S.String
export type OpenPanel = typeof OpenPanel.Type

export const Model = S.Struct({
  sorting: S.Array(SortEntry),
  sortKey: S.String,
  sortDirection: S.Literals(['ascending', 'descending']),
  columnsMenuOpen: S.Boolean,
  filter: S.String,
  optionFilters: S.Record(S.String, S.Array(S.String)),
  rangeFilters: S.Record(
    S.String,
    S.Struct({ min: S.Number, max: S.Number, active: S.Boolean }),
  ),
  dateFilters: S.Record(S.String, S.Struct({ from: S.String, to: S.String })),
  page: S.Number,
  pageSize: S.Number,
  selectedRowKeys: S.Array(S.String),
  anchorKey: S.String,
  hiddenColumnKeys: S.Array(S.String),
  openPanel: OpenPanel,
  headerMenuKey: S.String,
  rowMenuKey: S.String,
  valueMenuKey: S.String,
  updateSheetKey: S.String,
  deleteDialogKeys: S.Array(S.String),
  direction: S.Literals(['ltr', 'rtl']),
  actionBarMenu: S.String,
  dateRanges: S.Record(S.String, S.Any),
  pageSizeSelect: Listbox.Model,
  sliders: S.Record(S.String, S.Any),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ChangedFilter: { value: S.String },
  ToggledFilterValue: { columnId: S.String, value: S.String },
  ChangedRangeBound: {
    columnId: S.String,
    bound: S.Literals(['min', 'max']),
    value: S.String,
  },
  ClearedRangeFilter: { columnId: S.String },
  ClearedDateFilter: { columnId: S.String },
  ChangedDateBound: {
    columnId: S.String,
    bound: S.Literals(['from', 'to']),
    value: S.String,
  },
  ClearedFilters: {},
  ToggledSort: { columnId: S.String, desc: S.Boolean },
  AddedSort: { columnId: S.String },
  RemovedSort: { index: S.Number },
  ChangedSortDirection: { index: S.Number, desc: S.Boolean },
  ChangedSortColumn: { index: S.Number, columnId: S.String },
  MovedSort: { from: S.Number, to: S.Number },
  ResetSorting: {},
  ToggledSortMenu: {},
  SetPanel: { panel: OpenPanel },
  SetHeaderMenu: { columnId: S.String },
  SetRowMenu: { rowKey: S.String },
  SetValueMenu: { rowKey: S.String },
  AppliedColumnValue: { rowKey: S.String, columnId: S.String, value: S.String },
  ToggledColumnHidden: { columnId: S.String },
  ToggledRowSelected: { id: S.String, keys: S.Array(S.String) },
  ToggledAllRows: { checked: S.Boolean, keys: S.Array(S.String) },
  SetPage: { index: S.Number },
  SetPageSize: { size: S.Number },
  OpenedUpdateSheet: { rowKey: S.String },
  ClosedUpdateSheet: {},
  OpenedDeleteDialog: { ids: S.Array(S.String) },
  ClosedDeleteDialog: {},
  ConfirmedDelete: {},
  SetDirection: { direction: S.Literals(['ltr', 'rtl']) },
  SetActionBarMenu: { menu: S.String },
  AppliedBulkValue: { columnId: S.String, value: S.String },
  ClosedActionBar: {},
  RequestedExport: {},
  CompletedExport: {},
  Filtered: { value: S.String },
  Sorted: { key: S.String },
  ChangedPage: { page: S.Number },
  ChangedPageSize: { pageSize: S.Number },
  ToggledRow: { key: S.String, isSelected: S.Boolean },
  ToggledRows: { keys: S.Array(S.String), isSelected: S.Boolean },
  ToggledColumn: { key: S.String, isVisible: S.Boolean },
  ClearedSelection: {},
  ToggledColumnsMenu: {},
  ClosedColumnsMenu: {},
  GotDateRangeMessage: { columnId: S.String, message: DateRangeInput.Message },
  GotPageSizeSelectMessage: { message: Listbox.Message },
  GotRangeSliderMessage: {
    columnId: S.String,
    message: MultiSlider.MultiMessage,
  },
})
export type Message = typeof Message.Type

const today = (): Calendar.CalendarDate =>
  Calendar.fromDateInZone(new Date(), 'UTC')

const boundsOf = <Row>(
  column: DataTableColumn<Row>,
  rows: ReadonlyArray<Row>,
): Readonly<{ min: number; max: number }> => {
  if (column.rangeMin !== undefined || column.rangeMax !== undefined)
    return { min: column.rangeMin ?? 0, max: column.rangeMax ?? 100 }
  if (column.getNumber === undefined) return { min: 0, max: 100 }
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const row of rows) {
    const value = column.getNumber(row)
    if (value < min) min = value
    if (value > max) max = value
  }
  return Number.isFinite(min) ? { min, max } : { min: 0, max: 100 }
}

export const filterCount = (model: Model): number =>
  (model.filter !== '' ? 1 : 0) +
  Object.values(model.optionFilters).filter(values => values.length > 0)
    .length +
  Object.values(model.rangeFilters).filter(range => range.active).length +
  Object.values(model.dateFilters).filter(
    range => range.from !== '' || range.to !== '',
  ).length

/* All filters + sorting + pagination applied to rows — the tanstack
   row-model equivalents, computed once for both renderers. */
export const filteredRows = <Row>(
  model: Model,
  config: DataTableConfig<Row>,
  rows: ReadonlyArray<Row>,
): Array<Row> => {
  const filter = model.filter.trim().toLowerCase()
  const searchColumns =
    config.searchColumnId === undefined
      ? config.columns
      : config.columns.filter(column => column.id === config.searchColumnId)
  return rows.filter(row => {
    if (
      filter !== '' &&
      !searchColumns.some(column =>
        column.get(row).toLowerCase().includes(filter),
      )
    )
      return false
    for (const [columnId, values] of Object.entries(model.optionFilters)) {
      if (values.length === 0) continue
      const column = columnById(config, columnId)
      if (column === undefined || !values.includes(column.get(row)))
        return false
    }
    for (const [columnId, range] of Object.entries(model.rangeFilters)) {
      if (!range.active) continue
      const column = columnById(config, columnId)
      if (column?.getNumber === undefined) continue
      const value = column.getNumber(row)
      if (value < range.min || (range.max > 0 && value > range.max))
        return false
    }
    for (const [columnId, dateRange] of Object.entries(model.dateFilters)) {
      if (dateRange.from === '' && dateRange.to === '') continue
      const column = columnById(config, columnId)
      if (column?.getDate === undefined) continue
      const day = new Date(column.getDate(row)).toISOString().slice(0, 10)
      if (dateRange.from !== '' && day < dateRange.from) return false
      if (dateRange.to !== '' && day > dateRange.to) return false
    }
    return true
  })
}

export const rangeBounds = <Row>(
  config: DataTableConfig<Row>,
  rows: ReadonlyArray<Row>,
  columnId: string,
): Readonly<{ min: number; max: number }> => {
  const column = columnById(config, columnId)
  if (column === undefined) return { min: 0, max: 100 }
  return boundsOf(column, rows)
}

export function init(pageSize?: number): Model
export function init<Row>(
  config: DataTableConfig<Row>,
  rows: ReadonlyArray<Row>,
): Model
export function init<Row>(
  first?: number | DataTableConfig<Row>,
  rows?: ReadonlyArray<Row>,
): Model {
  const config =
    typeof first === 'number' || first === undefined ? undefined : first
  const dateRanges: Record<string, unknown> = {}
  const sliders: Record<string, unknown> = {}
  const sorting = [...(config?.defaultSort ?? [])]
  if (config !== undefined)
    for (const column of config.columns) {
      if (column.filterVariant === 'date')
        dateRanges[column.id] = DateRangeInput.init({
          id: `data-table-date-${column.id}`,
          today: today(),
        })
      if (column.filterVariant === 'range') {
        const bounds = boundsOf(column, rows ?? [])
        sliders[column.id] = MultiSlider.initMulti({
          id: `data-table-slider-${column.id}`,
          thumbs: 2,
          min: bounds.min,
          max: bounds.max,
          step: column.rangeStep ?? 1,
        })
      }
    }
  return {
    sorting,
    sortKey: sorting[0]?.id ?? '',
    sortDirection: sorting[0]?.desc ? 'descending' : 'ascending',
    columnsMenuOpen: false,
    filter: '',
    optionFilters: {},
    rangeFilters: {},
    dateFilters: {},
    page: 0,
    pageSize: Math.max(1, typeof first === 'number' ? first : 10),
    selectedRowKeys: [],
    anchorKey: '',
    hiddenColumnKeys: [],
    openPanel: 'none',
    headerMenuKey: '',
    rowMenuKey: '',
    valueMenuKey: '',
    updateSheetKey: '',
    deleteDialogKeys: [],
    direction: 'ltr',
    actionBarMenu: '',
    dateRanges,
    pageSizeSelect: Listbox.init({
      id: 'data-table-page-size',
      isAnimated: true,
    }),
    sliders,
  }
}

const sortValueFor = <Row>(
  row: Row,
  column: DataTableColumn<Row> | undefined,
): string | number => {
  if (column?.sortValue !== undefined) return column.sortValue(row)
  if (column !== undefined) return column.get(row)
  return ''
}

export const sortedRows = <Row>(
  rows: ReadonlyArray<Row>,
  sorting: ReadonlyArray<SortEntry>,
  config: DataTableConfig<Row>,
): ReadonlyArray<Row> => {
  if (sorting.length === 0) return rows
  return [...rows].sort((a, b) => {
    for (const entry of sorting) {
      const column = columnById(config, entry.id)
      const av = sortValueFor(a, column)
      const bv = sortValueFor(b, column)
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv))
      if (cmp !== 0) return entry.desc ? -cmp : cmp
    }
    return 0
  })
}

export const pageRows = <Row>(
  model: Model,
  config: DataTableConfig<Row>,
  rows: ReadonlyArray<Row>,
): Readonly<{
  rows: ReadonlyArray<Row>
  filtered: ReadonlyArray<Row>
  pageCount: number
}> => {
  const filtered = sortedRows(
    filteredRows(model, config, rows),
    model.sorting,
    config,
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / model.pageSize))
  const index = Math.min(model.page, pageCount - 1)
  return {
    rows: filtered.slice(index * model.pageSize, (index + 1) * model.pageSize),
    filtered,
    pageCount,
  }
}

/* visible = rows rendered on the current page (tablecn checks
   getSelectedRowModel + pagination). */
export const visibleSelectedCount = <Row>(
  model: Model,
  config: DataTableConfig<Row>,
  rows: ReadonlyArray<Row>,
): number => {
  const ids = new Set(model.selectedRowKeys)
  return pageRows(model, config, rows).rows.filter(row =>
    ids.has(config.rowKey(row)),
  ).length
}

const closePanels = (model: Model): Model => ({
  ...model,
  openPanel: 'none',
  headerMenuKey: '',
  rowMenuKey: '',
  valueMenuKey: '',
  actionBarMenu: '',
})

const resetPage = (model: Model): Model => ({ ...model, page: 0 })

const toggleInList = (
  list: ReadonlyArray<string>,
  value: string,
): Array<string> =>
  list.includes(value) ? list.filter(v => v !== value) : [...list, value]

/* shift-range selection on the *filtered+sorted* row order, like
   tanstack's getToggleSelectedHandler with enableRowRangeSelection. */
export const rangeKeys = <Row>(
  model: Model,
  config: DataTableConfig<Row>,
  rows: ReadonlyArray<Row>,
  id: string,
): Array<string> => {
  rows = pageRows(model, config, rows).rows
  const anchor = model.anchorKey
  const aIndex = rows.findIndex(row => config.rowKey(row) === anchor)
  const bIndex = rows.findIndex(row => config.rowKey(row) === id)
  if (aIndex === -1 || bIndex === -1) return [id]
  const [lo, hi] = aIndex < bIndex ? [aIndex, bIndex] : [bIndex, aIndex]
  return rows.slice(lo, hi + 1).map(row => config.rowKey(row))
}

const syncLegacySort = (model: Model): Model => ({
  ...model,
  sortKey: model.sorting[0]?.id ?? '',
  sortDirection: model.sorting[0]?.desc ? 'descending' : 'ascending',
})

const updateModel = (model: Model, message: Message): Model => {
  switch (message._tag) {
    case 'ChangedFilter':
      return resetPage({ ...model, filter: message.value })
    case 'ToggledFilterValue': {
      const current = model.optionFilters[message.columnId] ?? []
      return resetPage({
        ...model,
        optionFilters: {
          ...model.optionFilters,
          [message.columnId]: toggleInList(current, message.value),
        },
      })
    }
    case 'ChangedRangeBound': {
      const value = Number(message.value)
      const current = model.rangeFilters[message.columnId] ?? {
        min: 0,
        max: 0,
        active: false,
      }
      return resetPage({
        ...model,
        rangeFilters: {
          ...model.rangeFilters,
          [message.columnId]: {
            ...current,
            active: true,
            [message.bound]: Number.isNaN(value) ? 0 : value,
          },
        },
      })
    }
    case 'ClearedRangeFilter': {
      const current = model.rangeFilters[message.columnId]
      if (current === undefined) return model
      return resetPage({
        ...model,
        rangeFilters: {
          ...model.rangeFilters,
          [message.columnId]: { ...current, active: false, min: 0, max: 0 },
        },
      })
    }
    case 'ClearedDateFilter': {
      const current = model.dateFilters[message.columnId]
      if (current === undefined) return model
      const cleared: Record<string, unknown> = { ...model.dateRanges }
      cleared[message.columnId] = {
        ...((model.dateRanges[message.columnId] as
          | Record<string, unknown>
          | undefined) ?? {}),
        value: Option.none(),
        pendingStart: Option.none(),
      }
      return resetPage({
        ...model,
        dateFilters: {
          ...model.dateFilters,
          [message.columnId]: { from: '', to: '' },
        },
        dateRanges: cleared as Model['dateRanges'],
      })
    }
    case 'ChangedDateBound': {
      const current = model.dateFilters[message.columnId] ?? {
        from: '',
        to: '',
      }
      return resetPage({
        ...model,
        dateFilters: {
          ...model.dateFilters,
          [message.columnId]: { ...current, [message.bound]: message.value },
        },
      })
    }
    case 'ClearedFilters': {
      const dateRanges: Record<string, unknown> = {}
      for (const [columnId, rangeModel] of Object.entries(model.dateRanges)) {
        dateRanges[columnId] = {
          ...(rangeModel as Record<string, unknown>),
          value: Option.none(),
        }
      }
      const rangeFilters = Object.fromEntries(
        Object.entries(model.rangeFilters).map(([columnId, range]) => [
          columnId,
          { ...range, active: false, min: 0, max: 0 },
        ]),
      )
      return resetPage({
        ...model,
        filter: '',
        optionFilters: {},
        rangeFilters,
        dateFilters: {},
        dateRanges: dateRanges as Model['dateRanges'],
      })
    }
    case 'ToggledSort': {
      const existing = model.sorting.find(
        entry => entry.id === message.columnId,
      )
      const isOnly = existing !== undefined && model.sorting.length === 1
      /* tablecn header menu: clicking active direction removes the sort;
         clicking inactive direction sets it as the only sort. */
      if (existing !== undefined && existing.desc === message.desc && isOnly)
        return resetPage({ ...model, sorting: [] })
      if (existing !== undefined && existing.desc === message.desc)
        return resetPage({
          ...model,
          sorting: model.sorting.filter(entry => entry.id !== message.columnId),
        })
      return resetPage({
        ...model,
        sorting: [
          { id: message.columnId, desc: message.desc },
          ...model.sorting.filter(entry => entry.id !== message.columnId),
        ],
      })
    }
    case 'AddedSort':
      return resetPage({
        ...model,
        sorting: [
          ...model.sorting,
          { id: message.columnId, desc: false },
        ].filter(
          (entry, index, list) =>
            list.findIndex(other => other.id === entry.id) === index,
        ),
      })
    case 'RemovedSort':
      return resetPage({
        ...model,
        sorting: model.sorting.filter((_, i) => i !== message.index),
      })
    case 'ChangedSortDirection':
      return resetPage({
        ...model,
        sorting: model.sorting.map((entry, i) =>
          i === message.index ? { ...entry, desc: message.desc } : entry,
        ),
      })
    case 'ChangedSortColumn':
      return resetPage({
        ...model,
        sorting: model.sorting.map((entry, i) =>
          i === message.index ? { ...entry, id: message.columnId } : entry,
        ),
      })
    case 'MovedSort': {
      const list = [...model.sorting]
      const [moved] = list.splice(message.from, 1)
      if (moved === undefined) return model
      list.splice(message.to, 0, moved)
      return { ...model, sorting: list }
    }
    case 'ResetSorting':
      return resetPage({ ...model, sorting: [] })
    case 'ToggledSortMenu':
      return {
        ...model,
        openPanel: model.openPanel === 'sort-menu' ? 'none' : 'sort-menu',
      }
    case 'SetPanel':
      return {
        ...model,
        openPanel: model.openPanel === message.panel ? 'none' : message.panel,
        headerMenuKey: '',
        rowMenuKey: '',
        valueMenuKey: '',
        actionBarMenu: '',
      }
    case 'SetHeaderMenu':
      return {
        ...model,
        headerMenuKey:
          model.headerMenuKey === message.columnId ? '' : message.columnId,
        openPanel: 'none',
        rowMenuKey: '',
        valueMenuKey: '',
        actionBarMenu: '',
      }
    case 'SetRowMenu':
      return {
        ...model,
        rowMenuKey: model.rowMenuKey === message.rowKey ? '' : message.rowKey,
        valueMenuKey: '',
        openPanel: 'none',
        headerMenuKey: '',
        actionBarMenu: '',
      }
    case 'SetValueMenu':
      return {
        ...model,
        valueMenuKey:
          model.valueMenuKey === message.rowKey ? '' : message.rowKey,
      }
    case 'AppliedColumnValue':
      return { ...model, rowMenuKey: '', valueMenuKey: '' }
    case 'ToggledColumnHidden':
      return {
        ...model,
        hiddenColumnKeys: toggleInList(
          model.hiddenColumnKeys,
          message.columnId,
        ),
      }
    case 'ToggledRowSelected': {
      const id = message.id
      const isSelected = model.selectedRowKeys.includes(id)
      if (message.keys.length > 0) {
        const selected = new Set(model.selectedRowKeys)
        for (const key of message.keys) selected.add(key)
        return { ...model, selectedRowKeys: [...selected], anchorKey: id }
      }
      return {
        ...model,
        anchorKey: id,
        selectedRowKeys: isSelected
          ? model.selectedRowKeys.filter(selectedId => selectedId !== id)
          : [...model.selectedRowKeys, id],
      }
    }
    case 'ToggledAllRows': {
      if (!message.checked) {
        const page = new Set(message.keys)
        return {
          ...model,
          selectedRowKeys: model.selectedRowKeys.filter(id => !page.has(id)),
        }
      }
      const selected = new Set(model.selectedRowKeys)
      for (const id of message.keys) selected.add(id)
      return { ...model, selectedRowKeys: [...selected] }
    }
    case 'SetPage':
      return { ...model, page: Math.max(0, message.index) }
    case 'SetPageSize':
      return { ...model, pageSize: message.size, page: 0 }
    case 'OpenedUpdateSheet':
      return { ...closePanels(model), updateSheetKey: message.rowKey }
    case 'ClosedUpdateSheet':
      return { ...model, updateSheetKey: '' }
    case 'OpenedDeleteDialog':
      return {
        ...closePanels(model),
        deleteDialogKeys: message.ids,
      }
    case 'ClosedDeleteDialog':
      return { ...model, deleteDialogKeys: [] }
    case 'ConfirmedDelete': {
      const ids = new Set(model.deleteDialogKeys)
      return {
        ...resetPage(model),
        deleteDialogKeys: [],
        selectedRowKeys: model.selectedRowKeys.filter(id => !ids.has(id)),
      }
    }
    case 'SetDirection':
      return {
        ...model,
        direction: message.direction,
        sliders: Object.fromEntries(
          Object.entries(model.sliders).map(([columnId, slider]) => [
            columnId,
            {
              ...(slider as { mirrored: boolean }),
              mirrored: message.direction === 'rtl',
            },
          ]),
        ),
      }
    case 'SetActionBarMenu':
      return {
        ...model,
        actionBarMenu: model.actionBarMenu === message.menu ? '' : message.menu,
      }
    case 'AppliedBulkValue':
      return { ...model, actionBarMenu: '' }
    case 'ClosedActionBar':
      return { ...model, selectedRowKeys: [], anchorKey: '', actionBarMenu: '' }
    case 'Filtered':
      return { ...model, filter: message.value, page: 0 }
    case 'Sorted': {
      const desc =
        model.sortKey === message.key
          ? model.sortDirection === 'ascending'
          : false
      return resetPage({
        ...model,
        sorting: [{ id: message.key, desc }],
      })
    }
    case 'ChangedPage':
      return { ...model, page: Math.max(0, message.page) }
    case 'ChangedPageSize':
      return { ...model, page: 0, pageSize: Math.max(1, message.pageSize) }
    case 'ToggledRow':
      return {
        ...model,
        selectedRowKeys: message.isSelected
          ? [...new Set([...model.selectedRowKeys, message.key])]
          : model.selectedRowKeys.filter(key => key !== message.key),
      }
    case 'ToggledRows':
      return {
        ...model,
        selectedRowKeys: message.isSelected
          ? [...new Set([...model.selectedRowKeys, ...message.keys])]
          : model.selectedRowKeys.filter(key => !message.keys.includes(key)),
      }
    case 'ToggledColumn':
      return {
        ...model,
        hiddenColumnKeys: message.isVisible
          ? model.hiddenColumnKeys.filter(key => key !== message.key)
          : [...new Set([...model.hiddenColumnKeys, message.key])],
      }
    case 'ClearedSelection':
      return { ...model, selectedRowKeys: [] }
    case 'ToggledColumnsMenu':
      return { ...model, columnsMenuOpen: !model.columnsMenuOpen }
    case 'ClosedColumnsMenu':
      return { ...model, columnsMenuOpen: false }
    default:
      return model
  }
}

const csvCell = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value

export const rowsToCsv = <Row>(
  rows: ReadonlyArray<Row>,
  config: DataTableConfig<Row>,
): string =>
  [
    config.columns.map(column => csvCell(column.header)).join(','),
    ...rows.map(row =>
      config.columns.map(column => csvCell(column.get(row))).join(','),
    ),
  ].join('\n')

export const applyColumnValue = <Row>(
  rows: ReadonlyArray<Row>,
  config: DataTableConfig<Row>,
  rowKey: string,
  columnId: string,
  value: string,
): ReadonlyArray<Row> => {
  const column = columnById(config, columnId)
  if (column?.set === undefined) return rows
  return rows.map(row =>
    config.rowKey(row) === rowKey ? column.set!(row, value) : row,
  )
}

export const applyBulkValue = <Row>(
  rows: ReadonlyArray<Row>,
  config: DataTableConfig<Row>,
  selectedKeys: ReadonlyArray<string>,
  columnId: string,
  value: string,
): ReadonlyArray<Row> => {
  const column = columnById(config, columnId)
  if (column?.set === undefined) return rows
  const selected = new Set(selectedKeys)
  return rows.map(row =>
    selected.has(config.rowKey(row)) ? column.set!(row, value) : row,
  )
}

export const removeRowsByKeys = <Row>(
  rows: ReadonlyArray<Row>,
  config: DataTableConfig<Row>,
  keys: ReadonlyArray<string>,
): ReadonlyArray<Row> => {
  const ids = new Set(keys)
  return rows.filter(row => !ids.has(config.rowKey(row)))
}

export const downloadRowsCsv = <Row>(
  rows: ReadonlyArray<Row>,
  config: DataTableConfig<Row>,
  filename = 'rows.csv',
) => ExportRowsCsv({ csv: rowsToCsv(rows, config), filename })

const ExportRowsCsv = Command.define('ExportDataTableRowsCsv', {
  args: { csv: S.String, filename: S.String },
  messages: [Message.CompletedExport],
  execute: ({ csv, filename }) =>
    Effect.sync(() => {
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
    }).pipe(Effect.as(Message.CompletedExport({}))),
})

type UpdateReturn = Update.Return<Model, Message>

const pageSizeListbox = Listbox.create<string, string>()

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'RequestedExport':
      return { model }
    case 'GotDateRangeMessage': {
      const current = model.dateRanges[message.columnId]
      if (current === undefined) return { model }
      const next = DateRangeInput.update(
        current as DateRangeInput.Model,
        message.message,
      )
      const currentFilter = model.dateFilters[message.columnId] ?? {
        from: '',
        to: '',
      }
      const rangePatch = Option.match(Option.fromNullishOr(next.outMessage), {
        onNone: () => currentFilter,
        onSome: out =>
          out._tag === 'ChangedValue'
            ? Option.match(out.value, {
                onNone: () => ({ from: '', to: '' }),
                onSome: range => ({
                  from: dateToISO(range.start),
                  to: dateToISO(range.end),
                }),
              })
            : currentFilter,
      })
      return {
        model: resetPage({
          ...model,
          dateRanges: {
            ...model.dateRanges,
            [message.columnId]: next.model,
          },
          dateFilters: {
            ...model.dateFilters,
            [message.columnId]: rangePatch,
          },
        }),
        commands: Command.mapMessages(next.commands ?? [], nested =>
          Message.GotDateRangeMessage({
            columnId: message.columnId,
            message: nested,
          }),
        ),
      }
    }
    case 'GotRangeSliderMessage': {
      const current = model.sliders[message.columnId]
      if (current === undefined) return { model }
      const next = MultiSlider.updateMulti(
        current as MultiSlider.MultiModel,
        message.message,
      )
      const currentFilter = model.rangeFilters[message.columnId] ?? {
        min: 0,
        max: 0,
        active: false,
      }
      const thumbPatch = Option.match(Option.fromNullishOr(next.outMessage), {
        onNone: () => currentFilter,
        onSome: changed =>
          changed._tag === 'ChangedThumbValue'
            ? {
                ...currentFilter,
                active: true,
                [changed.index === 0 ? 'min' : 'max']: changed.value,
              }
            : currentFilter,
      })
      return {
        model: resetPage({
          ...model,
          sliders: { ...model.sliders, [message.columnId]: next.model },
          rangeFilters: {
            ...model.rangeFilters,
            [message.columnId]: thumbPatch,
          },
        }),
        commands: Command.mapMessages(next.commands ?? [], nested =>
          Message.GotRangeSliderMessage({
            columnId: message.columnId,
            message: nested,
          }),
        ),
      }
    }
    case 'GotPageSizeSelectMessage': {
      const next = pageSizeListbox.update(model.pageSizeSelect, message.message)
      const selectedValue = Option.match(
        Option.fromNullishOr(next.outMessage),
        {
          onNone: () => model.pageSize,
          onSome: out =>
            out._tag === 'Selected' ? Number(out.value) : model.pageSize,
        },
      )
      return {
        model: resetPage({
          ...model,
          pageSizeSelect: next.model,
          pageSize: Number.isNaN(selectedValue)
            ? model.pageSize
            : selectedValue,
        }),
        commands: Command.mapMessages(next.commands ?? [], nested =>
          Message.GotPageSizeSelectMessage({ message: nested }),
        ),
      }
    }
    default:
      return { model: syncLegacySort(updateModel(model, message)) }
  }
}

/* Thumb drag subscriptions for the Est. Hours range slider — lifted through
   the block pages into the root aggregate in main.ts. The `id` prefixes the
   record's entry names: each mounted copy (tailwind/stylex × table/grid)
   needs a unique one so aggregate keys don't collide. */
export const sliderSubscriptions = (columnId: string, id: string) =>
  MultiSlider.multiThumbSubscriptions<Model, Message>({
    id,
    thumbCount: 2,
    toChildModel: model => model.sliders[columnId] as MultiSlider.MultiModel,
    toParentMessage: message =>
      Message.GotRangeSliderMessage({ columnId, message }),
  })
