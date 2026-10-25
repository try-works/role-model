import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Sort = S.Struct({ id: S.String, desc: S.Boolean })
export type Sort = typeof Sort.Type

export const Density = S.Literals(['comfortable', 'compact'])
export type Density = typeof Density.Type

export const ColumnFilterKind = S.Literals([
  'text',
  'enum',
  'datetime',
  'number',
])
export type ColumnFilterKind = typeof ColumnFilterKind.Type
export const NumberFilterOperator = S.Literals(['eq', 'gte', 'lte', 'between'])
export type NumberFilterOperator = typeof NumberFilterOperator.Type
export const ColumnFilter = S.Struct({
  columnId: S.String,
  kind: ColumnFilterKind,
  value: S.String,
  secondaryValue: S.String,
  values: S.Array(S.String),
  operator: NumberFilterOperator,
})
export type ColumnFilter = typeof ColumnFilter.Type
export const ColumnWidth = S.Struct({ columnId: S.String, width: S.Number })
export type ColumnWidth = typeof ColumnWidth.Type

export const Model = S.Struct({
  globalFilter: S.String,
  statusFilter: S.String,
  sorting: S.Array(Sort),
  pageIndex: S.Number,
  pageSize: S.Number,
  selectedRowIds: S.Array(S.String),
  hiddenColumnIds: S.Array(S.String),
  columnOrder: S.Array(S.String),
  pinnedColumnIds: S.Array(S.String),
  pinnedRowIds: S.Array(S.String),
  grouping: S.Array(S.String),
  expandedRowIds: S.Array(S.String),
  titleWidth: S.Number,
  density: Density,
  columnFilters: S.Array(ColumnFilter),
  columnWidths: S.Array(ColumnWidth),
  layoutVersion: S.Number,
  openFilterColumnId: S.String,
  filterDraft: S.String,
  filterSecondaryDraft: S.String,
  filterOperator: NumberFilterOperator,
  dateCustomOpen: S.Boolean,
  calendarMonthOffset: S.Number,
  enumSearch: S.String,
  layoutMenuOpen: S.Boolean,
  activeFiltersMenuOpen: S.Boolean,
  pageSizeMenuOpen: S.Boolean,
  pageSizeDraft: S.String,
  resizingColumnId: S.String,
  resizeStartX: S.Number,
  resizeStartWidth: S.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ChangedTanStackGlobalFilter: { value: S.String },
  ChangedTanStackStatusFilter: { value: S.String },
  ChangedTanStackSorting: { sorting: S.Array(Sort) },
  ChangedTanStackPage: { pageIndex: S.Number },
  ChangedTanStackPageSize: { pageSize: S.Number },
  ToggledTanStackRow: { rowId: S.String, isSelected: S.Boolean },
  ToggledTanStackRows: { rowIds: S.Array(S.String), isSelected: S.Boolean },
  ToggledTanStackColumn: { columnId: S.String, isVisible: S.Boolean },
  MovedTanStackColumn: {
    columnId: S.String,
    direction: S.Literals(['left', 'right']),
  },
  ToggledTanStackColumnPin: { columnId: S.String },
  ToggledTanStackRowPin: { rowId: S.String },
  ToggledTanStackGrouping: { columnId: S.String },
  ToggledTanStackExpanded: { rowId: S.String },
  ChangedTanStackTitleWidth: { width: S.Number },
  ChangedTanStackDensity: { density: Density },
  ChangedTanStackColumnFilter: { filter: ColumnFilter },
  ClearedTanStackColumnFilter: { columnId: S.String },
  ClearedTanStackColumnFilters: {},
  ResizedTanStackColumn: { columnId: S.String, width: S.Number },
  ResetTanStackColumnWidths: {},
  ResetTanStackTableLayout: {
    columnOrder: S.Array(S.String),
    pinnedColumnIds: S.Array(S.String),
  },
  ToggledTanStackFilterPopover: {
    columnId: S.String,
    draft: S.String,
    secondaryDraft: S.String,
    operator: NumberFilterOperator,
  },
  ChangedTanStackFilterDraft: { value: S.String },
  ChangedTanStackFilterSecondaryDraft: { value: S.String },
  ChangedTanStackDateRangeDraft: { from: S.String, to: S.String },
  ChangedTanStackFilterOperator: { operator: NumberFilterOperator },
  ChangedTanStackDateCustomOpen: { isOpen: S.Boolean },
  ShiftedTanStackCalendarMonth: { delta: S.Number },
  ChangedTanStackEnumSearch: { value: S.String },
  AppliedTanStackTextFilter: { columnId: S.String },
  AppliedTanStackColumnFilter: { filter: ColumnFilter },
  ClearedTanStackFilterPopover: { columnId: S.String },
  ToggledTanStackLayoutMenu: {},
  ToggledTanStackActiveFiltersMenu: {},
  ToggledTanStackPageSizeMenu: {},
  ChangedTanStackPageSizeDraft: { value: S.String },
  CommittedTanStackPageSize: { pageSize: S.Number },
  StartedTanStackColumnResize: {
    columnId: S.String,
    screenX: S.Number,
    width: S.Number,
  },
  DraggedTanStackColumnResize: { screenX: S.Number },
  EndedTanStackColumnResize: {},
  ClosedTanStackTableOverlays: {},
  ResetTanStackTableView: {},
  RestoredTanStackTableLayout: {
    columnOrder: S.Array(S.String),
    hiddenColumnIds: S.Array(S.String),
    pinnedColumnIds: S.Array(S.String),
    columnWidths: S.Array(ColumnWidth),
    layoutVersion: S.Number,
  },
  ResetTanStackTable: {},
})
export type Message = typeof Message.Type

export const DEFAULT_COLUMN_ORDER = [
  'select',
  'title',
  'status',
  'team',
  'priority',
  'points',
  'assignee',
  'due',
] as const

export type InitOptions = Readonly<{
  columnOrder?: ReadonlyArray<string>
  pageSize?: number
  pinnedColumnIds?: ReadonlyArray<string>
  sorting?: ReadonlyArray<Sort>
  layoutVersion?: number
}>

export const init = (options: InitOptions = {}): Model => ({
  globalFilter: '',
  statusFilter: '',
  sorting: options.sorting ?? [{ id: 'due', desc: false }],
  pageIndex: 0,
  pageSize: options.pageSize ?? 8,
  selectedRowIds: [],
  hiddenColumnIds: [],
  columnOrder: [...(options.columnOrder ?? DEFAULT_COLUMN_ORDER)],
  pinnedColumnIds: [...(options.pinnedColumnIds ?? ['select'])],
  pinnedRowIds: [],
  grouping: [],
  expandedRowIds: [],
  titleWidth: 280,
  density: 'comfortable',
  columnFilters: [],
  columnWidths: [],
  layoutVersion: options.layoutVersion ?? 1,
  openFilterColumnId: '',
  filterDraft: '',
  filterSecondaryDraft: '',
  filterOperator: 'eq',
  dateCustomOpen: false,
  calendarMonthOffset: 0,
  enumSearch: '',
  layoutMenuOpen: false,
  activeFiltersMenuOpen: false,
  pageSizeMenuOpen: false,
  pageSizeDraft: String(options.pageSize ?? 8),
  resizingColumnId: '',
  resizeStartX: 0,
  resizeStartWidth: 0,
})

const membership = (
  values: ReadonlyArray<string>,
  value: string,
  included: boolean,
): ReadonlyArray<string> =>
  included
    ? [...new Set([...values, value])]
    : values.filter(candidate => candidate !== value)

const move = (
  values: ReadonlyArray<string>,
  value: string,
  direction: 'left' | 'right',
): ReadonlyArray<string> => {
  const index = values.indexOf(value)
  const target = direction === 'left' ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= values.length) return values
  const next = [...values]
  ;[next[index], next[target]] = [next[target] ?? value, next[index] ?? value]
  return next
}

const pinFirst = (
  columnOrder: ReadonlyArray<string>,
  pinnedColumnIds: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const pinned = new Set(pinnedColumnIds)
  return [
    ...columnOrder.filter(id => pinned.has(id)),
    ...columnOrder.filter(id => !pinned.has(id)),
  ]
}

export const update = (model: Model, message: Message): Model => {
  switch (message._tag) {
    case 'ChangedTanStackGlobalFilter':
      return { ...model, globalFilter: message.value, pageIndex: 0 }
    case 'ChangedTanStackStatusFilter':
      return { ...model, statusFilter: message.value, pageIndex: 0 }
    case 'ChangedTanStackSorting':
      return { ...model, sorting: message.sorting, pageIndex: 0 }
    case 'ChangedTanStackPage':
      return { ...model, pageIndex: Math.max(0, message.pageIndex) }
    case 'ChangedTanStackPageSize':
      return { ...model, pageIndex: 0, pageSize: Math.max(1, message.pageSize) }
    case 'ToggledTanStackRow':
      return {
        ...model,
        selectedRowIds: membership(
          model.selectedRowIds,
          message.rowId,
          message.isSelected,
        ),
      }
    case 'ToggledTanStackRows':
      return {
        ...model,
        selectedRowIds: message.rowIds.reduce(
          (ids, id) => membership(ids, id, message.isSelected),
          model.selectedRowIds,
        ),
      }
    case 'ToggledTanStackColumn':
      return {
        ...model,
        hiddenColumnIds: membership(
          model.hiddenColumnIds,
          message.columnId,
          !message.isVisible,
        ),
        pinnedColumnIds: message.isVisible
          ? model.pinnedColumnIds
          : model.pinnedColumnIds.filter(id => id !== message.columnId),
      }
    case 'MovedTanStackColumn':
      return {
        ...model,
        columnOrder: move(
          model.columnOrder,
          message.columnId,
          message.direction,
        ),
      }
    case 'ToggledTanStackColumnPin': {
      const pinnedColumnIds = membership(
        model.pinnedColumnIds,
        message.columnId,
        !model.pinnedColumnIds.includes(message.columnId),
      )
      return {
        ...model,
        pinnedColumnIds,
        columnOrder: pinFirst(model.columnOrder, pinnedColumnIds),
      }
    }
    case 'ToggledTanStackRowPin':
      return {
        ...model,
        pinnedRowIds: membership(
          model.pinnedRowIds,
          message.rowId,
          !model.pinnedRowIds.includes(message.rowId),
        ),
      }
    case 'ToggledTanStackGrouping':
      return {
        ...model,
        expandedRowIds: [],
        grouping: membership(
          model.grouping,
          message.columnId,
          !model.grouping.includes(message.columnId),
        ),
      }
    case 'ToggledTanStackExpanded':
      return {
        ...model,
        expandedRowIds: membership(
          model.expandedRowIds,
          message.rowId,
          !model.expandedRowIds.includes(message.rowId),
        ),
      }
    case 'ChangedTanStackTitleWidth':
      return {
        ...model,
        titleWidth: Math.min(440, Math.max(200, message.width)),
      }
    case 'ChangedTanStackDensity':
      return { ...model, density: message.density }
    case 'ChangedTanStackColumnFilter':
      return {
        ...model,
        pageIndex: 0,
        columnFilters: [
          ...model.columnFilters.filter(
            filter => filter.columnId !== message.filter.columnId,
          ),
          message.filter,
        ],
      }
    case 'ClearedTanStackColumnFilter':
      return {
        ...model,
        pageIndex: 0,
        columnFilters: model.columnFilters.filter(
          filter => filter.columnId !== message.columnId,
        ),
      }
    case 'ClearedTanStackColumnFilters':
      return { ...model, pageIndex: 0, columnFilters: [] }
    case 'ResizedTanStackColumn':
      return {
        ...model,
        titleWidth:
          message.columnId === 'title' ? message.width : model.titleWidth,
        columnWidths: [
          ...model.columnWidths.filter(
            entry => entry.columnId !== message.columnId,
          ),
          {
            columnId: message.columnId,
            width: Math.min(960, Math.max(60, message.width)),
          },
        ],
      }
    case 'ResetTanStackColumnWidths':
      return { ...model, titleWidth: 280, columnWidths: [] }
    case 'ResetTanStackTableLayout':
      return {
        ...model,
        hiddenColumnIds: [],
        columnOrder: message.columnOrder,
        pinnedColumnIds: message.pinnedColumnIds,
        columnWidths: [],
        titleWidth: 280,
      }
    case 'ToggledTanStackFilterPopover':
      return {
        ...model,
        openFilterColumnId:
          model.openFilterColumnId === message.columnId ? '' : message.columnId,
        filterDraft: message.draft,
        filterSecondaryDraft: message.secondaryDraft,
        filterOperator: message.operator,
        dateCustomOpen: false,
        enumSearch: '',
        layoutMenuOpen: false,
        activeFiltersMenuOpen: false,
        pageSizeMenuOpen: false,
      }
    case 'ChangedTanStackFilterDraft':
      return { ...model, filterDraft: message.value }
    case 'ChangedTanStackFilterSecondaryDraft':
      return { ...model, filterSecondaryDraft: message.value }
    case 'ChangedTanStackDateRangeDraft':
      return {
        ...model,
        filterDraft: message.from,
        filterSecondaryDraft: message.to,
      }
    case 'ChangedTanStackFilterOperator':
      return { ...model, filterOperator: message.operator }
    case 'ChangedTanStackDateCustomOpen':
      return {
        ...model,
        dateCustomOpen: message.isOpen,
        calendarMonthOffset: message.isOpen ? 0 : model.calendarMonthOffset,
      }
    case 'ShiftedTanStackCalendarMonth':
      return {
        ...model,
        calendarMonthOffset: Math.min(
          0,
          model.calendarMonthOffset + message.delta,
        ),
      }
    case 'ChangedTanStackEnumSearch':
      return { ...model, enumSearch: message.value }
    case 'AppliedTanStackTextFilter':
      return {
        ...model,
        pageIndex: 0,
        openFilterColumnId: '',
        columnFilters:
          model.filterDraft === ''
            ? model.columnFilters.filter(
                filter => filter.columnId !== message.columnId,
              )
            : [
                ...model.columnFilters.filter(
                  filter => filter.columnId !== message.columnId,
                ),
                columnFilter(message.columnId, 'text', {
                  value: model.filterDraft,
                }),
              ],
      }
    case 'AppliedTanStackColumnFilter':
      return {
        ...model,
        pageIndex: 0,
        openFilterColumnId: '',
        columnFilters: [
          ...model.columnFilters.filter(
            filter => filter.columnId !== message.filter.columnId,
          ),
          message.filter,
        ],
      }
    case 'ClearedTanStackFilterPopover':
      return {
        ...model,
        pageIndex: 0,
        openFilterColumnId: '',
        columnFilters: model.columnFilters.filter(
          filter => filter.columnId !== message.columnId,
        ),
      }
    case 'ToggledTanStackLayoutMenu':
      return {
        ...model,
        layoutMenuOpen: !model.layoutMenuOpen,
        openFilterColumnId: '',
        activeFiltersMenuOpen: false,
        pageSizeMenuOpen: false,
      }
    case 'ToggledTanStackActiveFiltersMenu':
      return {
        ...model,
        activeFiltersMenuOpen: !model.activeFiltersMenuOpen,
        openFilterColumnId: '',
        layoutMenuOpen: false,
        pageSizeMenuOpen: false,
      }
    case 'ToggledTanStackPageSizeMenu':
      return {
        ...model,
        pageSizeMenuOpen: !model.pageSizeMenuOpen,
        pageSizeDraft: String(model.pageSize),
        openFilterColumnId: '',
        layoutMenuOpen: false,
        activeFiltersMenuOpen: false,
      }
    case 'ChangedTanStackPageSizeDraft':
      return { ...model, pageSizeDraft: message.value }
    case 'CommittedTanStackPageSize':
      return {
        ...model,
        pageIndex: 0,
        pageSize: Math.max(1, message.pageSize),
        pageSizeDraft: String(Math.max(1, message.pageSize)),
        pageSizeMenuOpen: false,
      }
    case 'StartedTanStackColumnResize':
      return {
        ...model,
        resizingColumnId: message.columnId,
        resizeStartX: message.screenX,
        resizeStartWidth: message.width,
      }
    case 'DraggedTanStackColumnResize': {
      if (model.resizingColumnId === '') return model
      const width = Math.min(
        960,
        Math.max(
          60,
          model.resizeStartWidth + message.screenX - model.resizeStartX,
        ),
      )
      return {
        ...model,
        titleWidth:
          model.resizingColumnId === 'title' ? width : model.titleWidth,
        columnWidths: [
          ...model.columnWidths.filter(
            entry => entry.columnId !== model.resizingColumnId,
          ),
          { columnId: model.resizingColumnId, width },
        ],
      }
    }
    case 'EndedTanStackColumnResize':
      return {
        ...model,
        resizingColumnId: '',
        resizeStartX: 0,
        resizeStartWidth: 0,
      }
    case 'ClosedTanStackTableOverlays':
      return {
        ...model,
        openFilterColumnId: '',
        dateCustomOpen: false,
        layoutMenuOpen: false,
        activeFiltersMenuOpen: false,
        pageSizeMenuOpen: false,
      }
    case 'ResetTanStackTableView':
      return {
        ...model,
        sorting: [],
        pageIndex: 0,
        columnFilters: [],
        columnWidths: [],
        titleWidth: 280,
        openFilterColumnId: '',
        activeFiltersMenuOpen: false,
      }
    case 'RestoredTanStackTableLayout':
      return message.layoutVersion !== model.layoutVersion
        ? model
        : {
            ...model,
            columnOrder: message.columnOrder,
            hiddenColumnIds: message.hiddenColumnIds,
            pinnedColumnIds: message.pinnedColumnIds,
            columnWidths: message.columnWidths,
            titleWidth:
              message.columnWidths.find(entry => entry.columnId === 'title')
                ?.width ?? model.titleWidth,
          }
    case 'ResetTanStackTable':
      return { ...init(), layoutVersion: model.layoutVersion }
  }
}

export const columnFilter = (
  columnId: string,
  kind: ColumnFilterKind,
  options: Partial<
    Pick<ColumnFilter, 'value' | 'secondaryValue' | 'values' | 'operator'>
  > = {},
): ColumnFilter => ({
  columnId,
  kind,
  value: options.value ?? '',
  secondaryValue: options.secondaryValue ?? '',
  values: options.values ?? [],
  operator: options.operator ?? 'eq',
})

export const layoutSnapshot = (model: Model) => ({
  columnOrder: model.columnOrder,
  hiddenColumnIds: model.hiddenColumnIds,
  pinnedColumnIds: model.pinnedColumnIds,
  columnWidths: model.columnWidths,
  layoutVersion: model.layoutVersion,
})

export const nextSorting = (
  sorting: ReadonlyArray<Sort>,
  columnId: string,
): ReadonlyArray<Sort> => {
  const current = sorting.find(sort => sort.id === columnId)
  if (current === undefined) return [...sorting, { id: columnId, desc: false }]
  if (!current.desc)
    return sorting.map(sort =>
      sort.id === columnId ? { ...sort, desc: true } : sort,
    )
  return sorting.filter(sort => sort.id !== columnId)
}
