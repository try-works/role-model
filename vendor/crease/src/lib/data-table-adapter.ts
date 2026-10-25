import {
  createTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
} from '@tanstack/table-core'

import type { Model } from '@/lib/data-table-state'

export type DataTableMechanicsColumn<Row> = Readonly<{
  key: string
  sortValue?: (row: Row) => string | number
}>

export type DataTableMode = 'client' | 'server'

export type DataTableProjection<Row> = Readonly<{
  filteredRowCount: number
  page: number
  pageCount: number
  rows: ReadonlyArray<Row>
  selectableRowKeys: ReadonlyArray<string>
  selectedRowCount: number
}>

/**
 * Adapts serializable Foldkit feature state to TanStack's deterministic row
 * mechanics. Server mode treats `rows` as an already queried page; the parent
 * remains responsible for fetching, filtering, sorting, and pagination policy.
 */
export const projectDataTable = <Row>(
  props: Readonly<{
    columns: ReadonlyArray<DataTableMechanicsColumn<Row>>
    filterText?: (row: Row) => string
    isRowSelectable?: (row: Row) => boolean
    mode?: DataTableMode
    model: Model
    rowCount?: number
    rowKey: (row: Row) => string
    rows: ReadonlyArray<Row>
  }>,
): DataTableProjection<Row> => {
  const isServer = props.mode === 'server'
  const columns: Array<ColumnDef<Row>> = props.columns.map(column => ({
    id: column.key,
    // TanStack skips global filtering for columns without an accessor. Search
    // must still work when every displayed column is deliberately unsortable.
    accessorFn: column.sortValue ?? (row => props.filterText?.(row) ?? ''),
    enableSorting: column.sortValue !== undefined,
  }))
  const table = createTable<Row>({
    columns,
    data: [...props.rows],
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: props.rowKey,
    globalFilterFn: (row, _columnId, value) =>
      props
        .filterText?.(row.original)
        .toLocaleLowerCase()
        .includes(String(value).trim().toLocaleLowerCase()) ?? true,
    manualFiltering: isServer,
    manualPagination: isServer,
    manualSorting: isServer,
    onStateChange: () => undefined,
    pageCount: -1,
    renderFallbackValue: '',
    state: {
      globalFilter: props.model.filter,
      pagination: {
        pageIndex: props.model.page,
        pageSize: props.model.pageSize,
      },
      rowSelection: Object.fromEntries(
        props.model.selectedRowKeys.map(key => [key, true]),
      ),
      sorting:
        props.model.sortKey === ''
          ? []
          : [
              {
                id: props.model.sortKey,
                desc: props.model.sortDirection === 'descending',
              },
            ],
    },
  })
  const filteredRowCount = isServer
    ? (props.rowCount ?? props.rows.length)
    : table.getFilteredRowModel().rows.length
  const pageCount = Math.max(
    1,
    Math.ceil(filteredRowCount / props.model.pageSize),
  )
  const page = Math.min(props.model.page, pageCount - 1)
  const rows = isServer
    ? table.getRowModel().rows.map(row => row.original)
    : table
        .getSortedRowModel()
        .rows.slice(
          page * props.model.pageSize,
          (page + 1) * props.model.pageSize,
        )
        .map(row => row.original)
  const selectableRowKeys = rows
    .filter(row => props.isRowSelectable?.(row) ?? true)
    .map(props.rowKey)

  return {
    filteredRowCount,
    page,
    pageCount,
    rows,
    selectableRowKeys,
    selectedRowCount: props.model.selectedRowKeys.length,
  }
}
